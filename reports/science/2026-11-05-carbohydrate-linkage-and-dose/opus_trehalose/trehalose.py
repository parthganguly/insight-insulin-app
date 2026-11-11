"""Trehalose/glucose two-hour insulin-area transfer test (../TREHALOSE_PLAN.md). Stdlib only, no network.

  python -I -X utf8 trehalose.py run                      write RESULTS.json; append the run to EXECUTION.json
  python -I -X utf8 trehalose.py --check                  READ-ONLY replay: needs only this script, inputs.json,
                                                          RESULTS.json, ../TREHALOSE_PLAN.md, ../receipts/TREHALOSE_FREEZE.json
  python -I -X utf8 trehalose.py --check --sources DIR    also audit the original source files in DIR against their
                                                          recorded SHA-256 (a missing file is a FAIL, never a skip)
  add --record to append the check verdict to EXECUTION.json (the only way --check writes anything)

No parameter is fitted. Every forecast is a frozen plan number or molar-mass arithmetic.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, math, platform, sys

HERE = Path(__file__).resolve().parent
PLAN = HERE.parent / 'TREHALOSE_PLAN.md'
RECEIPT = HERE.parent / 'receipts' / 'TREHALOSE_FREEZE.json'


def load(path): return json.loads(Path(path).read_text(encoding='utf-8'))
def strict(x): return json.loads(json.dumps(x, allow_nan=False))
def now(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def ale(pred, obs): return abs(math.log(pred / obs))
def dump(name, x): (HERE / name).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


# ----------------------------------------------------------------------------- integrity helpers
def plan_freeze_status():
    """Compare the plan with its freeze receipt. LF-normalised bytes are also accepted, so a CRLF checkout
    of the same text passes; any change of content fails."""
    raw = PLAN.read_bytes()
    want = load(RECEIPT)['sha256']
    if hashlib.sha256(raw).hexdigest() == want: return True, 'raw bytes'
    if hashlib.sha256(raw.replace(b'\r\n', b'\n')).hexdigest() == want: return True, 'LF-normalised bytes'
    return False, 'mismatch'


def same(a, b, path='$'):
    """Structural comparison: numbers within tight tolerance, strings modulo CRLF, exact keys and lengths."""
    if isinstance(a, bool) or isinstance(b, bool):
        return [] if a is b else [path]
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return [] if math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-12) else [path]
    if isinstance(a, str) and isinstance(b, str):
        return [] if a.replace('\r\n', '\n') == b.replace('\r\n', '\n') else [path]
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a) != set(b): return [path + ' (keys)']
        return [p for k in a for p in same(a[k], b[k], f'{path}.{k}')]
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): return [path + ' (length)']
        return [p for i, (x, y) in enumerate(zip(a, b)) for p in same(x, y, f'{path}[{i}]')]
    return [] if a == b else [path]


def audit_sources(directory, I):
    """Hash each recorded original asset in DIRECTORY. Missing or different files are failures."""
    expected = {k: v['sha256'] for k, v in I['source']['original_assets_kept_outside_public_replay'].items() if isinstance(v, dict)}
    out = {}
    for name, want in expected.items():
        p = Path(directory) / name
        if not p.is_file():
            out[name] = 'MISSING'
        else:
            out[name] = 'MATCH' if hashlib.sha256(p.read_bytes()).hexdigest() == want else 'HASH MISMATCH'
    return out


# ----------------------------------------------------------------------------- science
def positive_area(times, values, t_end):
    """Trapezoid area above the first (fasting) value, positive parts only, split at baseline crossings.
    Used on GROUP-MEAN curves, a different operator from the mean of individual areas."""
    base, area = values[0], 0.0
    pts = [(t, v - base) for t, v in zip(times, values) if t <= t_end]
    for (t0, y0), (t1, y1) in zip(pts, pts[1:]):
        if y0 >= 0 and y1 >= 0:
            area += (y0 + y1) / 2 * (t1 - t0)
        elif y0 > 0 > y1 or y1 > 0 > y0:
            tc = t0 + (t1 - t0) * y0 / (y0 - y1)
            area += (y0 * (tc - t0) if y0 > 0 else y1 * (t1 - tc)) / 2
    return area


def fieller(T, sT, G, sG, rho, t):
    """Fieller interval for T/G given SEs, an assumed correlation rho between the two means, and quantile t."""
    a = G * G - t * t * sG * sG
    b = -2 * (T * G - t * t * rho * sT * sG)
    c = T * T - t * t * sT * sT
    d = b * b - 4 * a * c
    if a <= 0 or d < 0: return None
    return [(-b - math.sqrt(d)) / (2 * a), (-b + math.sqrt(d)) / (2 * a)]


def forecasts(I):
    mm, C, P = I['molar_masses_g_per_mol'], I['frozen_comparators'], I['products']
    glucose_per_g_anhydrous = 2 * mm['glucose'] / mm['trehalose_anhydrous']
    F = {
        'equality_nominal_grams': C['equality_nominal_grams'],
        'complete_hydrolysis_stated_25g_anhydrous': glucose_per_g_anhydrous,
        'holub_whole_120_ratio': C['holub_whole_120_ratio'],
        'holub_whole_trajectory_scalar': C['holub_whole_trajectory_scalar'],
        'johansen_33g_polymer_reference': C['johansen_33g_polymer_reference'],
    }
    lo_f, hi_f = P['treha_dihydrate_fraction_range']
    anhydrous = [P['treha_served_g'] * f * mm['trehalose_anhydrous'] / mm['trehalose_dihydrate'] for f in (lo_f, hi_f)]
    glucose_yield = [x * glucose_per_g_anhydrous for x in anhydrous]
    serving = {
        'basis': '28 g TREHA served, of which 98-100% trehalose dihydrate; remainder unspecified and not counted',
        'anhydrous_trehalose_g_range': anhydrous,
        'conditional_glucose_yield_g_range_complete_hydrolysis': glucose_yield,
        'stated_25g_anhydrous_glucose_yield_g': 25 * glucose_per_g_anhydrous,
        'hydrolysis_ratio_range_vs_25g_glucose': [g / P['glucose_served_g'] for g in glucose_yield],
        'portion_scaling': 'proportional in glucose grams; the plan declares no exponent',
        'note': 'Sensitivity on the actual serving only. The forecast assumes complete hydrolysis and absorption, which the two '
                'withdrawn participants contradict for at least some people.'}
    return F, serving


def error_range(pred, interval):
    """Smallest and largest |ln(pred/obs)| for obs anywhere in [lo, hi]."""
    lo, hi = interval
    ends = [ale(pred, lo), ale(pred, hi)]
    return [0.0 if lo <= pred <= hi else min(ends), max(ends)]


def score_against(F, obs, extra=None):
    err = {k: ale(v, obs) for k, v in F.items()}
    out = {'observed': obs, 'abs_log_error': err, 'central_order_best_to_worst': sorted(err, key=err.get)}
    if extra: out.update(extra)
    return out


def primary(I):
    T = I['table1_insulin']; g, t = T['glucose']['IAUC_0_2h'], T['trehalose']['IAUC_0_2h']
    F, serving = forecasts(I)
    obs_mean = t[0] / g[0]
    D = I['discussion_insulin_individual_ratio']; obs_ind = D['value']
    rng = [0.355, 0.365]

    tq = I['t_quantile_0975_df19']
    fi = {name: fieller(t[0], t[1], g[0], g[1], r, tq) for name, r in (('rho_plus1', 1), ('rho_0', 0), ('rho_minus1', -1))}
    union = fi['rho_minus1']   # the variance term is largest at rho = -1 for a positive ratio, so this interval contains the others
    inside = {k: {m: iv[0] <= v <= iv[1] for m, v in F.items()} for k, iv in fi.items()}
    johansen, holub_s = F['johansen_33g_polymer_reference'], F['holub_whole_trajectory_scalar']
    tie_j_eq, tie_j_hs = math.sqrt(johansen * 1.0), math.sqrt(johansen * holub_s)
    t_needed = 2.8609346  # Student t quantile for two-sided p = 0.01 with 19 df
    se_diff_max = (g[0] - t[0]) / t_needed

    ratio_of_means = score_against(F, obs_mean, {
        'definition': 'ratio of arithmetic mean IAUC 0-2 h, Table 1 (590/1709)',
        'fieller_95_intervals_by_assumed_rho': fi,
        'interval_assumptions': 'Conditional on approximately normal paired data, SEs as printed SEMs of n = 20, and t(0.975, 19). '
                                'The paired covariance is not reported, so rho is unknown; the rho = -1 interval contains the others.',
        'forecast_inside_interval': inside,
        'decision_boundaries': {
            'johansen_vs_equality_tie': tie_j_eq,
            'johansen_closer_than_equality_across_rho_minus1_interval': union[1] < tie_j_eq,
            'johansen_vs_holub_scalar_tie': tie_j_hs,
            'that_tie_inside_interval': {k: iv[0] <= tie_j_hs <= iv[1] for k, iv in fi.items()},
            'reading': 'Johansen beats equality for every ratio in the widest interval. Johansen versus the Holub scalar is not '
                       'resolved: their midpoint lies inside the rho = 0 and rho = -1 intervals and only drops out if the arms are '
                       'strongly positively correlated; the paired correlation is unreported.'},
        'does_the_paired_test_constrain_rho': {
            'max_SE_of_difference_for_p_below_0_01': se_diff_max,
            'SE_of_difference_at_rho_minus1': g[1] + t[1],
            'constrains': (g[1] + t[1]) > se_diff_max,
            'reading': 'Even the largest possible SE of the paired difference (rho = -1) is small enough for p < 0.01, so the reported '
                       'test carries no information about the covariance.'}})
    individual = score_against(F, obs_ind, {
        'definition': 'mean of individual trehalose/glucose IAUC ratios, Discussion (36%)',
        'rounding_range': rng,
        'abs_log_error_range_over_rounding': {k: error_range(v, rng) for k, v in F.items()},
        'uncertainty': 'no dispersion reported; no interval can be formed',
        'relation_to_ratio_of_means': 'A different estimand from 590/1709. Both are reported and scored separately; neither replaces the other.'})
    return F, serving, ratio_of_means, individual, obs_mean


def secondary(I, obs_mean, F):
    T = I['table1_insulin']; g, t = T['glucose'], T['trehalose']
    fig = I['figure1_insulin_visual_reading']; times = fig['times_min']
    curve = {w: {a: positive_area(times, fig[a], w) for a in ('glucose', 'trehalose')} for w in (120, 180)}
    for w in curve: curve[w]['ratio'] = curve[w]['trehalose'] / curve[w]['glucose']
    conv = I['unit_conversion_conventions']['pmol_per_uIU_options']

    L = I['external_level_anchor']; lee_pmol = L['glucose_25g_mean_nmol_min_L'] * 1000
    lee = {}
    for c in conv:
        anchor_uIU = lee_pmol / c
        lvl = {m: v * anchor_uIU for m, v in F.items()}
        lee[str(c)] = {
            'lee_glucose_25g_in_uIU_min_per_mL': anchor_uIU,
            'glucose_level_signed_log_error': math.log(anchor_uIU / g['IAUC_0_2h'][0]),
            'trehalose_predicted_level': lvl,
            'trehalose_level_signed_log_error': {m: math.log(v / t['IAUC_0_2h'][0]) for m, v in lvl.items()},
            'decomposition_for_johansen': {
                'ratio_part': math.log(F['johansen_33g_polymer_reference'] / obs_mean),
                'anchor_part': math.log(anchor_uIU / g['IAUC_0_2h'][0]),
                'sum_equals_level_error': math.log(F['johansen_33g_polymer_reference'] * anchor_uIU / t['IAUC_0_2h'][0])}}
    return {
        'figure_vs_table_descriptive': {
            'status': 'APPROXIMATE visual reading; group-mean curve area, a different operator from the tabled mean of individual areas',
            'group_mean_curve_positive_area_0_120': curve[120],
            'abs_log_gap_figure_120_vs_table': ale(curve[120]['ratio'], obs_mean),
            'descriptive_sensitivity_0_180': curve[180],
            'reading': 'The plotted means reproduce the tabled 0-120 areas within reading error. The 0-180 group-curve figure is a '
                       'descriptive sensitivity only, not an alternative outcome.'},
        'unit_reading': {
            'printed': 'uIU/mL.2 h',
            'implied_mean_increment_if_minutes': g['IAUC_0_2h'][0] / 120,
            'implied_mean_increment_if_hours': g['IAUC_0_2h'][0] / 2,
            'glucose_Cmax_minus_fasting': g['Cmax'][0] - g['fasting'][0],
            'reading': 'A literal hour unit is incompatible with the peak (an 854 uIU/mL mean increment against a 34 uIU/mL peak '
                       'increment). The minute reading (uIU*min/mL) is therefore used for levels, CONDITIONALLY; it is not printed. '
                       'Ratios do not depend on it.'},
        'native_levels_conditional': {
            'uIU_min_per_mL_minute_reading': {'glucose': g['IAUC_0_2h'][0], 'trehalose': t['IAUC_0_2h'][0]},
            'pmol_min_per_L_by_convention': {str(c): {'glucose': g['IAUC_0_2h'][0] * c, 'trehalose': t['IAUC_0_2h'][0] * c} for c in conv}},
        'lee_cross_cohort_level_challenge': {
            'status': 'challenge only; conditional on the minute reading and on a uIU-to-pmol convention',
            'anchor': L, 'by_conversion_factor': lee,
            'reading': 'With factor 6.0, Lee glucose-25 becomes 1,350 against the observed 1,709 (-0.236 log), while the Johansen ratio '
                       'over-predicts (+0.196 log). Their sum gives a trehalose level of 567 against 590 (-0.040 log): a near-hit made of '
                       'two opposite misses. With factor 6.945 the anchor miss grows to -0.382, Johansen\'s level miss becomes -0.186 '
                       'and the Holub scalar instead lands closest (+0.029). Which forecast appears to hit the level is decided by an '
                       'unstated unit convention, so level agreement cannot discriminate between the hypotheses. No absolute-level '
                       'claim follows.'},
        'other_operators_not_scored': {
            'Cmax_ratio': t['Cmax'][0] / g['Cmax'][0],
            'incremental_Cmax_ratio': (t['Cmax'][0] - t['fasting'][0]) / (g['Cmax'][0] - g['fasting'][0]),
            'Tmax_min': {'glucose': g['Tmax'][0], 'trehalose': t['Tmax'][0]}},
        'unavailable': {
            'paired_covariance_or_ratio_CI': 'not reported',
            'dispersion_of_mean_individual_ratio': 'not reported',
            'excluded_participants_outcomes': 'not reported; direction of any effect on either ratio unknown',
            'tabled_insulin_IAUC_0_3h': 'not reported',
            'dose_series': 'single matched portion; no dose response inferred'},
        'insulin_index_comparison': (
            'Not an insulin index in the Holt sense (isoenergetic portions, reference food, mean of individual ratios). The Discussion '
            '36% is a mean of individual ratios at equal stated mass, the closest available analogue, but at 25 g rather than an '
            'isoenergetic portion.'),
    }


def compute():
    I = load(HERE / 'inputs.json')
    ok, how = plan_freeze_status()
    F, serving, rom, ind, obs_mean = primary(I)
    serving['abs_log_error_range'] = {
        'ratio_of_means': sorted(ale(r, obs_mean) for r in serving['hydrolysis_ratio_range_vs_25g_glucose']),
        'mean_individual_ratio': sorted(ale(r, ind['observed']) for r in serving['hydrolysis_ratio_range_vs_25g_glucose'])}
    return strict({
        'plan': '../TREHALOSE_PLAN.md', 'plan_matches_freeze_receipt': ok,
        'fitted_parameters': None,
        'exposure': ('The coordinator had seen design, exclusions and direction only. This implementer read Table 1, Fig. 1 and the '
                     'Discussion before writing code; no forecast depends on them.'),
        'forecasts': F,
        'serving_mass_sensitivity': serving,
        'primary_ratio_of_means': rom,
        'primary_mean_individual_ratio': ind,
        'secondary': secondary(I, obs_mean, F),
    }), how


def main(argv):
    cmd = argv[1] if len(argv) > 1 else '--check'
    record = '--record' in argv
    src = argv[argv.index('--sources') + 1] if '--sources' in argv and argv.index('--sources') + 1 < len(argv) else None
    if '--sources' in argv and src is None: sys.exit('--sources requires a DIRECTORY')
    R, how = compute()

    if cmd == 'run':
        dump('RESULTS.json', R)
        log = HERE / 'EXECUTION.json'; E = load(log) if log.exists() else {'runs': [], 'checks': []}
        E['runs'].append({'utc': now(), 'command': 'python -I -X utf8 trehalose.py run', 'python': platform.python_version(),
                          'platform': platform.platform(), 'plan_freeze': how})
        dump('EXECUTION.json', E); print('wrote RESULTS.json; plan freeze matched via', how)
        return 0

    if cmd != '--check': sys.exit(__doc__)
    problems = []
    if not R['plan_matches_freeze_receipt']: problems.append('plan does not match freeze receipt')
    diffs = same(R, load(HERE / 'RESULTS.json'))
    if diffs: problems.append('results differ at ' + ', '.join(diffs[:5]))
    audit = None
    if src is not None:
        audit = audit_sources(src, load(HERE / 'inputs.json'))
        bad = {k: v for k, v in audit.items() if v != 'MATCH'}
        if bad: problems.append('source audit: ' + json.dumps(bad))
    verdict = 'PASS' if not problems else 'FAIL'
    print(f'{verdict} check (plan freeze via {how})' + (f'; source audit {json.dumps(audit)}' if audit else '; source audit not requested'))
    for p in problems: print('  -', p)
    if record:
        log = HERE / 'EXECUTION.json'; E = load(log)
        E['checks'].append({'utc': now(), 'command': ' '.join(['python -I -X utf8 trehalose.py'] + argv[1:]),
                            'result': verdict, 'plan_freeze': how, 'source_audit': audit, 'problems': problems})
        dump('EXECUTION.json', E)
    return 0 if verdict == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
