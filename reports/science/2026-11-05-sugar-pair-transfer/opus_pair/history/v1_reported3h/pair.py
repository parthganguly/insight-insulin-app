"""Two-substitution discrimination test on van Can 2012 (../PLAN.md). Python standard library only, no network.

  python -I -X utf8 pair.py run                     write RESULTS.json and append the run to EXECUTION.json
  python -I -X utf8 pair.py --check                 READ-ONLY replay from pair.py, inputs.json, RESULTS.json, ../PLAN.md, ../FREEZE.json
  python -I -X utf8 pair.py --check --sources DIR   also audit original table/figure images in DIR by SHA-256 (missing = FAIL)
  add --record to append a check verdict to EXECUTION.json

Notation. T/G = trehalose/glucose and I/S = isomaltulose/sucrose insulin-area ratios.
D = (T/G)/(I/S). Any common fractional reduction predicts D = 1.
Errors are |ln(pred/obs)|. Nothing is fitted to the target.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, math, platform, sys

HERE = Path(__file__).resolve().parent
PLAN, FREEZE = HERE.parent / 'PLAN.md', HERE.parent / 'FREEZE.json'
MEALS = ('fasting', 'lunch')


def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def strict(x): return json.loads(json.dumps(x, allow_nan=False))
def now(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def ale(pred, obs): return abs(math.log(pred / obs))
def dump(name, x): (HERE / name).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


# ============================================================================ Student t (stdlib)
def _betacf(a, b, x):
    """Continued fraction for the regularized incomplete beta (modified Lentz)."""
    tiny, qab, qap, qam = 1e-300, a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > tiny else tiny); h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c; c = c if abs(c) > tiny else tiny; h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c; c = c if abs(c) > tiny else tiny
        delta = d * c; h *= delta
        if abs(delta - 1) < 1e-15: break
    return h


def betainc(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    front = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x))
    return front * _betacf(a, b, x) / a if x < (a + 1) / (a + b + 2) else 1 - front * _betacf(b, a, 1 - x) / b


def two_sided_p(t, df): return betainc(df / 2, 0.5, df / (df + t * t))


def t_for_p(p, df):
    """|t| giving a two-sided p with df degrees of freedom (bisection)."""
    lo, hi = 0.0, 1000.0
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if two_sided_p(mid, df) > p else (lo, mid)
    return (lo + hi) / 2


# ============================================================================ helpers
def plan_freeze():
    raw, want = PLAN.read_bytes(), load(FREEZE)['sha256']
    if hashlib.sha256(raw).hexdigest() == want: return True, 'raw bytes'
    if hashlib.sha256(raw.replace(b'\r\n', b'\n')).hexdigest() == want: return True, 'LF-normalised bytes'
    return False, 'mismatch'


def same(a, b, path='$'):
    """Numbers within tight tolerance, strings modulo CRLF, exact structure."""
    if isinstance(a, bool) or isinstance(b, bool): return [] if a is b else [path]
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


def all_assets(I):
    out = dict(I['target']['assets'])
    for d in ('trehalose', 'isomaltulose'): out.update(I['donors_2009'][d]['asset'])
    return out


def audit_sources(directory, I):
    res = {}
    for name, want in all_assets(I).items():
        p = Path(directory) / name
        res[name] = 'MISSING' if not p.is_file() else ('MATCH' if hashlib.sha256(p.read_bytes()).hexdigest() == want else 'HASH MISMATCH')
    return res


# ============================================================================ scoring blocks
def score_meal(obs_tg, obs_is, comparators):
    """comparators: name -> (T/G forecast, I/S forecast). Returns D and magnitude errors per comparator."""
    obs_D = obs_tg / obs_is
    out = {}
    for name, (tg, is_) in comparators.items():
        D = tg / is_
        e_tg, e_is = ale(tg, obs_tg), ale(is_, obs_is)
        out[name] = {'forecast_TG': tg, 'forecast_IS': is_, 'forecast_D': D,
                     'abs_log_error_D': ale(D, obs_D),
                     'abs_log_error_TG': e_tg, 'abs_log_error_IS': e_is, 'magnitude_mean': (e_tg + e_is) / 2}
    return {'observed': {'TG': obs_tg, 'IS': obs_is, 'D': obs_D}, 'comparators': out,
            'order_on_D': sorted(out, key=lambda k: out[k]['abs_log_error_D']),
            'order_on_magnitude': sorted(out, key=lambda k: out[k]['magnitude_mean'])}


def pair_vs_common(pair_D, obs_D):
    """Pair-specific D beats every common factor (D = 1) exactly when obs falls on its side of sqrt(pair_D)."""
    mid = math.sqrt(pair_D)
    pair_side = (obs_D < mid) if pair_D < 1 else (obs_D > mid)
    return {'pair_forecast_D': pair_D, 'geometric_midpoint': mid, 'observed_D': obs_D,
            'pair_beats_common': pair_side,
            'log_distance_obs_to_midpoint': abs(math.log(obs_D) - math.log(mid)),
            'observed_direction_matches_pair': (obs_D < 1) == (pair_D < 1)}


def magnitude_identity(block, a='pair', b='common_geomean'):
    """When both observed ratios exceed every forecast of both rules, the mean magnitude errors coincide."""
    o, ca, cb = block['observed'], block['comparators'][a], block['comparators'][b]
    below = all(f < o['TG'] for f in (ca['forecast_TG'], cb['forecast_TG'])) and all(f < o['IS'] for f in (ca['forecast_IS'], cb['forecast_IS']))
    return {'all_forecasts_below_observed': below, 'magnitude_difference': ca['magnitude_mean'] - cb['magnitude_mean'],
            'reading': 'With every forecast below both observations, the sum of log errors equals (sum of observed logs) - '
                       '(sum of forecast logs), and the geometric-mean rule has the same forecast-log sum as the pair rule. '
                       'Magnitude then cannot separate them; only D can.'}


def se_bounds(diff, test, df=9):
    """Bounds on the SE of a paired mean difference implied by the reported p (n = 10, df = 9)."""
    d = abs(diff)
    if 'p_exact' in test:
        s = d / t_for_p(test['p_exact'], df); return [s, s]
    if 'p_range' in test:
        lo_p, hi_p = test['p_range']
        return [d / t_for_p(lo_p, df), d / t_for_p(hi_p, df)]
    if 'p_at_least' in test:
        return [d / t_for_p(test['p_at_least'], df), None]
    if 'p_below' in test:
        return [0.0, d / t_for_p(test['p_below'], df)]
    return [None, None]


def log_se_from_diff(se_d, numerator):
    """Approximate SE of ln(ratio) from the paired difference only, treating the control mean as fixed."""
    return [None if s is None else s / numerator for s in se_d]


def lnD_se_range(a, b):
    """SE range of ln D = ln(T/G) - ln(I/S) over an unknown cross-pair correlation in [-1, 1]."""
    a_lo, a_hi = a; b_lo, b_hi = b
    lo = max(0.0, a_lo - (b_hi if b_hi is not None else math.inf), b_lo - (a_hi if a_hi is not None else math.inf))
    hi = None if (a_hi is None or b_hi is None) else a_hi + b_hi
    return [lo, hi]


def uncertainty(I, meal):
    t = I['target']['insulin_iAUC_0_180'][meal]; tests = I['target']['paired_tests']
    se_tg = se_bounds(t['GLUC'] - t['TRE'], tests[f'{meal}_TRE_v_GLUC'])
    se_is = se_bounds(t['SUC'] - t['IMU'], tests[f'{meal}_IMU_v_SUC'])
    a, b = log_se_from_diff(se_tg, t['TRE']), log_se_from_diff(se_is, t['IMU'])
    return {'SE_paired_difference_bounds': {'TG': se_tg, 'IS': se_is},
            'approx_SE_ln_ratio_bounds': {'TG': a, 'IS': b},
            'approx_SE_lnD_range_over_cross_pair_correlation': lnD_se_range(a, b),
            'conditions': 'Derived from reported p-values of paired t-tests (n = 10). Ignores uncertainty in the control means and '
                          'the unknown correlation between the two pairs, so it UNDERSTATES uncertainty; None means unbounded. '
                          'No participant data or covariance is inferred.'}


# ============================================================================ main computation
def compute():
    I = load(HERE / 'inputs.json')
    F, T, D9 = I['frozen_forecasts'], I['target']['insulin_iAUC_0_180'], I['donors_2009']
    obs = {m: (T[m]['TRE'] / T[m]['GLUC'], T[m]['IMU'] / T[m]['SUC']) for m in MEALS}

    # ---- A. frozen primary forecasts (Yoshizane T/G, Holub I/S)
    tg, is_ = F['TG_yoshizane_positive120']['num'] / F['TG_yoshizane_positive120']['den'], F['IS_holub_signed120']
    geo = math.sqrt(tg * is_)
    comp_A = {'pair': (tg, is_), 'common_geomean': (geo, geo)}
    comp_A.update({k: (v, v) for k, v in F['common_factors'].items()})
    A = {m: score_meal(*obs[m], comp_A) for m in obs}
    for m in A:
        A[m]['pair_vs_common'] = pair_vs_common(tg / is_, A[m]['observed']['D'])
        A[m]['magnitude_identity'] = magnitude_identity(A[m])
        A[m]['uncertainty'] = uncertainty(I, m)
        u = A[m]['uncertainty']['approx_SE_lnD_range_over_cross_pair_correlation']
        dist = A[m]['pair_vs_common']['log_distance_obs_to_midpoint']
        A[m]['pair_vs_common']['distance_in_approx_SE_units'] = [None if u[1] is None else dist / u[1],
                                                                 None if u[0] == 0 else dist / u[0]]

    # ---- B. matched-protocol donor route (van Can 2009, same lab, 75 g, 3 h)
    tre, iso = D9['trehalose']['insulin_dAUC_0_180'], D9['isomaltulose']['insulin_dAUC_0_180']
    d_tg_f, d_is_f = tre['morning']['TRE'] / tre['morning']['GLUC'], iso['morning']['IMU'] / iso['morning']['SUC']
    d_tg_l, d_is_l = tre['afternoon']['TRE'] / tre['afternoon']['GLUC'], iso['afternoon']['IMU'] / iso['afternoon']['SUC']
    dgeo = math.sqrt(d_tg_f * d_is_f)
    B_fast = score_meal(*obs['fasting'], {'donor_pair_fasting': (d_tg_f, d_is_f), 'donor_common_geomean': (dgeo, dgeo), 'equality': (1.0, 1.0)})
    B_fast['pair_vs_common'] = pair_vs_common(d_tg_f / d_is_f, B_fast['observed']['D'])
    B_fast['magnitude_identity'] = magnitude_identity(B_fast, 'donor_pair_fasting', 'donor_common_geomean')
    u = A['fasting']['uncertainty']['approx_SE_lnD_range_over_cross_pair_correlation']
    dist = B_fast['pair_vs_common']['log_distance_obs_to_midpoint']
    B_fast['pair_vs_common']['distance_in_approx_SE_units'] = [None if u[1] is None else dist / u[1], None if u[0] == 0 else dist / u[0]]

    lunch_obs_D = obs['lunch'][0] / obs['lunch'][1]
    duplicated = tre['afternoon']['TRE'] == iso['afternoon']['IMU'] and tre['afternoon']['GLUC'] == iso['afternoon']['SUC']
    B_lunch = {
        'observed_D': lunch_obs_D,
        'donor_afternoon_face_value': {'TG': d_tg_l, 'IS': d_is_l, 'D': d_tg_l / d_is_l,
                                       'abs_log_error_D': ale(d_tg_l / d_is_l, lunch_obs_D),
                                       'abs_log_error_TG': ale(d_tg_l, obs['lunch'][0]), 'abs_log_error_IS': ale(d_is_l, obs['lunch'][1]),
                                       'admissible': not duplicated,
                                       'status': 'INADMISSIBLE: both donor papers print identical afternoon insulin means for different sugar pairs'
                                                 if duplicated else 'admissible'},
        'fasting_donor_for_both_meals': {'D': d_tg_f / d_is_f, 'abs_log_error_D': ale(d_tg_f / d_is_f, lunch_obs_D)},
        'protocol_change_reference_D_lunch_equals_observed_D_fasting': {'D': B_fast['observed']['D'],
                                                                         'abs_log_error_D': ale(B_fast['observed']['D'], lunch_obs_D),
                                                                         'note': 'uses the target fasting outcome; a reference, not a forecast'},
        'common_D1': {'D': 1.0, 'abs_log_error_D': ale(1.0, lunch_obs_D)},
        'confounding': 'Each lunch follows the same sugar at breakfast on the same day, and the lunch beverage dose is described as '
                       '25 En% of an individualised meal; lunch contrasts mix current composition with prior feeding and matrix.'}

    # ---- C. native levels (same units, same protocol) and conditional Yoshizane transfer
    tf = T['fasting']
    donor_levels = {'TRE': tre['morning']['TRE'], 'GLUC': tre['morning']['GLUC'], 'IMU': iso['morning']['IMU'], 'SUC': iso['morning']['SUC']}
    C = {'fasting_levels_uU_ml_3h': {
        'observed': tf,
        'donor_as_given': {k: {'pred': v, 'signed_log_error': math.log(v / tf[k])} for k, v in donor_levels.items()},
        'measured_control_calibration': {'TRE': {'pred': d_tg_f * tf['GLUC'], 'signed_log_error': math.log(d_tg_f * tf['GLUC'] / tf['TRE'])},
                                         'IMU': {'pred': d_is_f * tf['SUC'], 'signed_log_error': math.log(d_is_f * tf['SUC'] / tf['IMU'])},
                                         'note': 'separate benchmark: uses the measured target control arm'},
        'equality_within_pair': {'TRE': {'pred': tf['GLUC'], 'signed_log_error': math.log(tf['GLUC'] / tf['TRE'])},
                                 'IMU': {'pred': tf['SUC'], 'signed_log_error': math.log(tf['SUC'] / tf['IMU'])}},
        'no_dose_change': 'donor and target both 75 g CHO equivalents, so no dose adjustment applies',
        'population': 'donors healthy overweight (fasting insulin 14 uU/ml); target IGT (fasting insulin 18 uU/ml)'}}
    Y, a = I['yoshizane_levels_conditional'], F['frozen_dose_exponent']
    scale = {'proportional': 75 / Y['dose_g'], 'frozen_exponent': (75 / Y['dose_g']) ** a}
    C['yoshizane_conditional_level_transfer'] = {
        k: {arm: {'pred': Y[arm] * s, 'signed_log_error': math.log(Y[arm] * s / tf[arm])} for arm in ('GLUC', 'TRE')}
        for k, s in scale.items()}
    C['yoshizane_conditional_level_transfer']['limits'] = ('CONDITIONAL and not comparable: 0-120 vs 0-180 window, serum CLEIA vs plasma '
                                                           'RIA, lean healthy vs overweight IGT, and a minute-unit reading that is not printed. '
                                                           'Reported to expose level-transport failure, not as a forecast test.')

    # ---- D. source integrity and development diagnostics
    integrity = {
        'donor_afternoon_insulin_identical_across_papers': duplicated,
        'values': {'trehalose_paper': tre['afternoon'], 'isomaltulose_paper': iso['afternoon']},
        'donor_subject_descriptions_identical': D9['trehalose']['subjects'] == D9['isomaltulose']['subjects'],
        'reading': ('Two papers on different sugar pairs print the same afternoon insulin means (and significance marks) while their '
                    'morning means differ. At most one afternoon row can describe its stated pair unless the agreement is coincidental. '
                    'The subject descriptions are also identical, suggesting the same participants. This is an unresolved source '
                    'inconsistency, not an allegation; the afternoon donor route is excluded from scoring until it is resolved.')}
    diagnostics = {
        'label': 'DEVELOPMENT DIAGNOSTICS only (within-target cross-pair quantities the authors did not test)',
        'sucrose_over_glucose_control': {m: T[m]['SUC'] / T[m]['GLUC'] for m in MEALS},
        'absolute_reduction_uU_ml_3h': {m: {'GLUC_minus_TRE': T[m]['GLUC'] - T[m]['TRE'], 'SUC_minus_IMU': T[m]['SUC'] - T[m]['IMU']} for m in MEALS},
        'reading': 'The two control arms differ by about twofold at fasting, so D compares fractional reductions on very different '
                   'baselines; a ratio-of-ratios can favour one pair while the absolute reductions rank differently.'}

    ok, _ = plan_freeze()
    return strict({
        'plan': '../PLAN.md', 'plan_matches_freeze': ok, 'fitted_parameters': None,
        'exposure': ('Target Tables 2-3 were read before the 2009 donor tables. The donor route was nominated in the frozen plan, and its '
                     'ratios are read mechanically from the donor tables; no choice depended on the target values.'),
        'endpoint_admitted': 'author-reported insulin iAUC over 0-180 min (trapezoid; below-baseline handling unstated), plasma RIA, '
                             'means only. The plan target is a participant-positive 0-120 area; that endpoint is not reported, and the '
                             'signed 0-120 group-curve route was not executed because the figure axes are not legible in the accessible image.',
        'A_frozen_primary_yoshizane_holub': A,
        'B_matched_protocol_donor_route': {'fasting': B_fast, 'lunch': B_lunch},
        'C_native_levels': C,
        'D_source_integrity': integrity,
        'E_development_diagnostics': diagnostics,
        't_quantiles_check': {'t_0.05_df9': t_for_p(0.05, 9), 't_0.01_df9': t_for_p(0.01, 9), 't_0.009_df9': t_for_p(0.009, 9),
                              't_0.001_df9': t_for_p(0.001, 9)},
    })


def main(argv):
    cmd = argv[1] if len(argv) > 1 else '--check'
    src = None
    if '--sources' in argv:
        i = argv.index('--sources')
        if i + 1 >= len(argv): sys.exit('--sources requires a DIRECTORY')
        src = argv[i + 1]
    R = compute(); ok, how = plan_freeze()
    if cmd == 'run':
        dump('RESULTS.json', R)
        log = HERE / 'EXECUTION.json'; E = load(log) if log.exists() else {'runs': [], 'checks': []}
        E['runs'].append({'utc': now(), 'command': 'python -I -X utf8 pair.py run', 'python': platform.python_version(),
                          'platform': platform.platform(), 'plan_freeze': how})
        dump('EXECUTION.json', E); print('wrote RESULTS.json; plan freeze via', how); return 0
    if cmd != '--check': sys.exit(__doc__)
    problems = [] if ok else ['plan does not match FREEZE.json']
    diffs = same(R, load(HERE / 'RESULTS.json'))
    if diffs: problems.append('results differ at ' + ', '.join(diffs[:5]))
    audit = audit_sources(src, load(HERE / 'inputs.json')) if src is not None else None
    if audit and any(v != 'MATCH' for v in audit.values()): problems.append('source audit: ' + json.dumps(audit))
    verdict = 'PASS' if not problems else 'FAIL'
    print(f'{verdict} check (plan freeze via {how})' + (f'; source audit {json.dumps(audit)}' if audit else '; source audit not requested'))
    for p in problems: print('  -', p)
    if '--record' in argv:
        E = load(HERE / 'EXECUTION.json')
        E['checks'].append({'utc': now(), 'command': ' '.join(['python -I -X utf8 pair.py'] + argv[1:]), 'result': verdict,
                            'plan_freeze': how, 'source_audit': audit, 'problems': problems})
        dump('EXECUTION.json', E)
    return 0 if verdict == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
