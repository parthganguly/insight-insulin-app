"""Two-substitution discrimination test on van Can 2012 (../PLAN.md), version 2. Python stdlib only, no network.

  python -I -X utf8 pair.py import-lab              copy the lab's figure readings (../figure.json, ../matched/coordinates.csv)
                                                    into inputs.json with their SHA-256, so later replays need no lab files
  python -I -X utf8 pair.py run                     write RESULTS.json and append the run to EXECUTION.json
  python -I -X utf8 pair.py --check                 READ-ONLY standalone replay: pair.py, inputs.json, RESULTS.json,
                                                    ../PLAN.md, ../FREEZE.json
  python -I -X utf8 pair.py --check --lab           also confirm the copied readings still match the lab files and that the
                                                    recomputed areas reproduce ../results.json and ../matched/areas.csv
  python -I -X utf8 pair.py --check --sources DIR   also audit original table/figure images in DIR by SHA-256 (missing = FAIL)
  add --record to append a check verdict to EXECUTION.json

Notation. T/G = trehalose/glucose and I/S = isomaltulose/sucrose insulin-area ratios.
D = (T/G)/(I/S); any common fractional reduction predicts D = 1.
Errors are |ln(pred/obs)|. Nothing is fitted to the target.

PRIMARY (plan): signed group-curve area 0-120 min. ARCHIVE: the author-reported 3 h iAUC analysis of version 1, kept with its
failures. SECONDARY (chosen after inspecting released curves, so not prespecified): mean |log error| on D over the 60, 120 and
180 min cumulative windows within each protocol.
"""
from pathlib import Path
from datetime import datetime, timezone
import csv, hashlib, json, math, platform, sys

HERE = Path(__file__).resolve().parent
PUB = HERE.parent
PLAN, FREEZE = PUB / 'PLAN.md', PUB / 'FREEZE.json'
MEALS = ('fasting', 'lunch')
ARMS = ('T', 'G', 'I', 'S')
WINDOWS = (60, 120, 180)
SAMPLE_TIMES = [-5, 30, 60, 90, 120, 150, 180]
NOMINAL_TIMES = [0, 30, 60, 90, 120, 150, 180]          # pre-dose (-5 min) value placed at time zero
OPERATORS = ('nominal', 'minus5_to_end', 'interpolate_zero')
READING_ERRORS_PT = (0.25, 0.5, 1.0)                    # independent per-point reading error, PDF points


def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def strict(x): return json.loads(json.dumps(x, allow_nan=False))
def now(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def ale(pred, obs): return abs(math.log(pred / obs))
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def dump(name, x): (HERE / name).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


# ============================================================================ Student t (stdlib), used only for the archive heuristic
def _betacf(a, b, x):
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


def t_for_p(p, df):
    lo, hi = 0.0, 1000.0
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if betainc(df / 2, 0.5, df / (df + mid * mid)) > p else (lo, mid)
    return (lo + hi) / 2


# ============================================================================ integrity helpers
def plan_freeze():
    raw, want = PLAN.read_bytes(), load(FREEZE)['sha256']
    if hashlib.sha256(raw).hexdigest() == want: return True, 'raw bytes'
    if hashlib.sha256(raw.replace(b'\r\n', b'\n')).hexdigest() == want: return True, 'LF-normalised bytes'
    return False, 'mismatch'


def same(a, b, path='$'):
    if isinstance(a, bool) or isinstance(b, bool): return [] if a is b else [path]
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return [] if math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9) else [path]
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
    names = dict(I['target']['assets'])
    for d in ('trehalose', 'isomaltulose'): names.update(I['donors_2009'][d]['asset'])
    out = {}
    for name, want in names.items():
        p = Path(directory) / name
        out[name] = 'MISSING' if not p.is_file() else ('MATCH' if sha(p) == want else 'HASH MISMATCH')
    return out


# ============================================================================ lab import (one-time) and curves
def import_lab():
    """Copy aggregate figure readings from the lab into inputs.json, recording the files' hashes."""
    I = load(HERE / 'inputs.json')
    fig = load(PUB / 'figure.json')
    with (PUB / 'matched' / 'coordinates.csv').open(encoding='utf-8', newline='') as f:
        coords = [{k: (v if k in ('arm', 'period') else float(v)) for k, v in row.items()} for row in csv.DictReader(f)]
    I['lab_readings'] = {
        'note': 'Investigator figure readings (not participant data) copied from the lab so the default replay is standalone.',
        'target_figure': {'file': '../figure.json', 'sha256': sha(PUB / 'figure.json'), 'content': fig},
        'donor_coordinates': {'file': '../matched/coordinates.csv', 'sha256': sha(PUB / 'matched' / 'coordinates.csv'), 'rows': coords},
        'imported_utc': now()}
    dump('inputs.json', I)
    return I['lab_readings']['target_figure']['sha256'], I['lab_readings']['donor_coordinates']['sha256']


def target_curves(I):
    """Target van Can 2012 Fig. 1c,d: pixel rows -> uU/ml. Returns curves and value-per-PDF-point per panel."""
    F = I['lab_readings']['target_figure']['content']
    y0, y1, H = F['image_pdf_box'][1], F['image_pdf_box'][3], F['height']
    pt_per_px = (y1 - y0) / H
    curves, per_pt = {m: {} for m in MEALS}, {}
    for meal, arm, panel, _xs, ys, _caps in F['series']:
        P = F['panels'][panel]
        scale = P['top_value'] / (P['bottom'] - P['top'])          # uU/ml per PDF point
        meal = 'fasting' if meal == 'fast' else meal
        curves[meal][arm] = [scale * (P['bottom'] - (y0 + px * pt_per_px)) for px in ys]
        per_pt[(meal, arm)] = scale
    return curves, per_pt


DONOR_ARM = {'trehalose': 'T', 'glucose': 'G', 'isomaltulose': 'I', 'sucrose': 'S'}


def donor_curves(I):
    """Donor van Can 2009 figures (vector coordinates in PDF points) -> uU/ml, plus clock times for the fasting panels."""
    curves, per_pt, clocks = {m: {} for m in MEALS}, {}, {m: {} for m in MEALS}
    rows = sorted(I['lab_readings']['donor_coordinates']['rows'], key=lambda r: (r['period'], r['arm'], r['sample_min']))
    for r in rows:
        meal, arm = r['period'], DONOR_ARM[r['arm']]
        scale = r['top_uU_per_mL'] / (r['tick_zero_y_pt'] - r['tick_top_y_pt'])
        curves[meal].setdefault(arm, []).append(scale * (r['tick_zero_y_pt'] - r['y_pt']))
        clocks[meal].setdefault(arm, []).append(round(540 + (r['x_pt'] - r['tick_0900_x_pt']) * 420 / (r['tick_1600_x_pt'] - r['tick_0900_x_pt'])))
        per_pt[(meal, arm)] = scale
    return curves, per_pt, clocks


def integrate(times, values, start, end):
    """Signed trapezoid of the group-mean curve above its first value, clipped to [start, end], no extrapolation."""
    base, area = values[0], 0.0
    for t0, t1, v0, v1 in zip(times, times[1:], values, values[1:]):
        lo, hi = max(t0, start), min(t1, end)
        if lo < hi:
            s = (v1 - v0) / (t1 - t0)
            area += (hi - lo) * ((v0 + s * (lo - t0) - base) + (v0 + s * (hi - t0) - base)) / 2
    return area


def operator_area(op, values, end, clock=None):
    if op == 'nominal': return integrate(NOMINAL_TIMES, values, 0, end)
    if op == 'minus5_to_end': return integrate(SAMPLE_TIMES, values, -5, end)
    if op == 'interpolate_zero': return integrate(SAMPLE_TIMES, values, 0, end)
    if op == 'clock_0840': return integrate(clock, values, 520, 520 + end)
    raise ValueError(op)


def abs_weight_sum(op, end, clock=None):
    """Area is linear in the 7 values; the sum of |coefficients| bounds the area change per unit reading error."""
    total = 0.0
    for k in range(7):
        e = [1.0 if j == k else 0.0 for j in range(7)]
        total += abs(operator_area(op, e, end, clock))
    return total


def areas_for(curves, ops, clocks=None):
    out = {}
    for meal in MEALS:
        for op in ops:
            if op == 'clock_0840' and meal != 'fasting': continue
            for end in WINDOWS:
                out.setdefault(meal, {}).setdefault(op, {})[str(end)] = {
                    a: operator_area(op, curves[meal][a], end, (clocks or {}).get(meal, {}).get(a)) for a in ARMS}
    return out


def D_of(a): return (a['T'] / a['G']) / (a['I'] / a['S'])


def reading_bounds(curves, per_pt, meal, op, end, clocks=None):
    """Worst-case D under independent reading errors of +/- delta PDF points on every plotted mean."""
    base = {a: operator_area(op, curves[meal][a], end, (clocks or {}).get(meal, {}).get(a)) for a in ARMS}
    out = {}
    for delta in READING_ERRORS_PT:
        dev = {a: delta * per_pt[(meal, a)] * abs_weight_sum(op, end, (clocks or {}).get(meal, {}).get(a)) for a in ARMS}
        lo = {a: base[a] - dev[a] for a in ARMS}; hi = {a: base[a] + dev[a] for a in ARMS}
        if min(lo.values()) <= 0: out[str(delta)] = None; continue
        out[str(delta)] = [lo['T'] * lo['S'] / (hi['G'] * hi['I']), hi['T'] * hi['S'] / (lo['G'] * lo['I'])]
    return out


# ============================================================================ scoring blocks
def score_meal(obs_tg, obs_is, comparators):
    obs_D = obs_tg / obs_is
    out = {}
    for name, (tg, is_) in comparators.items():
        e_tg, e_is = ale(tg, obs_tg), ale(is_, obs_is)
        out[name] = {'forecast_TG': tg, 'forecast_IS': is_, 'forecast_D': tg / is_, 'abs_log_error_D': ale(tg / is_, obs_D),
                     'abs_log_error_TG': e_tg, 'abs_log_error_IS': e_is, 'magnitude_mean': (e_tg + e_is) / 2}
    return {'observed': {'TG': obs_tg, 'IS': obs_is, 'D': obs_D}, 'comparators': out,
            'order_on_D': sorted(out, key=lambda k: out[k]['abs_log_error_D']),
            'order_on_magnitude': sorted(out, key=lambda k: out[k]['magnitude_mean'])}


def pair_vs_common(pair_D, obs_D):
    mid = math.sqrt(pair_D)
    return {'pair_forecast_D': pair_D, 'geometric_midpoint': mid, 'observed_D': obs_D,
            'pair_beats_common': (obs_D < mid) if pair_D < 1 else (obs_D > mid),
            'log_distance_obs_to_midpoint': abs(math.log(obs_D / mid)),
            'observed_direction_matches_pair': (obs_D < 1) == (pair_D < 1)}


def magnitude_identity(block, a, b):
    o, ca, cb = block['observed'], block['comparators'][a], block['comparators'][b]
    below = all(f < o['TG'] for f in (ca['forecast_TG'], cb['forecast_TG'])) and all(f < o['IS'] for f in (ca['forecast_IS'], cb['forecast_IS']))
    above = all(f > o['TG'] for f in (ca['forecast_TG'], cb['forecast_TG'])) and all(f > o['IS'] for f in (ca['forecast_IS'], cb['forecast_IS']))
    return {'all_forecasts_on_one_side_of_both_observations': below or above,
            'magnitude_difference': ca['magnitude_mean'] - cb['magnitude_mean'],
            'reading': 'If every forecast of both rules lies on the same side of both observations, the two rules (which share a '
                       'forecast-log sum) have identical magnitude error by construction; only D can separate them.'}


def frozen_comparators(F, donor=None):
    tg, is_ = F['TG_yoshizane_positive120']['num'] / F['TG_yoshizane_positive120']['den'], F['IS_holub_signed120']
    geo = math.sqrt(tg * is_)
    comp = {'frozen_pair': (tg, is_), 'frozen_common_geomean': (geo, geo)}
    comp.update({k: (v, v) for k, v in F['common_factors'].items()})
    if donor:
        dtg, dis = donor['T'] / donor['G'], donor['I'] / donor['S']
        comp['matched_donor_pair'] = (dtg, dis)
        g = math.sqrt(dtg * dis); comp['matched_donor_common_geomean'] = (g, g)
    return comp, tg / is_


def primary_signed120(I, tgt, don):
    F = I['frozen_forecasts']; out = {}
    for meal in MEALS:
        t, d = tgt[meal]['nominal']['120'], don[meal]['nominal']['120']
        comp, frozen_D = frozen_comparators(F, d)
        blk = score_meal(t['T'] / t['G'], t['I'] / t['S'], comp)
        blk['observed_areas_uU_min_ml'] = t
        blk['frozen_pair_vs_common'] = pair_vs_common(frozen_D, blk['observed']['D'])
        blk['matched_donor_pair_vs_common'] = pair_vs_common(D_of(d), blk['observed']['D'])
        blk['magnitude_identity_frozen_pair_vs_geomean'] = magnitude_identity(blk, 'frozen_pair', 'frozen_common_geomean')
        blk['magnitude_identity_donor_pair_vs_geomean'] = magnitude_identity(blk, 'matched_donor_pair', 'matched_donor_common_geomean')
        out[meal] = blk
    out['lunch']['interpretation'] = ('CONDITIONAL: each lunch follows the same sugar at breakfast, and the lunch beverage dose is '
                                      'described as 25 En% of an individualised meal; lunch contrasts mix composition with prior '
                                      'feeding and matrix.')
    return out


def time_objective(tgt, don, frozen_D, t_op, d_op):
    """Secondary (post-inspection): mean |log error| on D over 60/120/180 within one protocol."""
    res = {}
    for meal in MEALS:
        if d_op not in don[meal] or t_op not in tgt[meal]: continue
        Dt = {w: D_of(tgt[meal][t_op][str(w)]) for w in WINDOWS}
        Dd = {w: D_of(don[meal][d_op][str(w)]) for w in WINDOWS}
        logs = sorted(math.log(v) for v in Dt.values())
        oracle_c = math.exp(logs[1])
        def mean_err(pred): return sum(ale(pred[w], Dt[w]) for w in WINDOWS) / 3
        rules = {'matched_donor_time_specific': mean_err(Dd),
                 'matched_donor_120_constant': mean_err({w: Dd[120] for w in WINDOWS}),
                 'frozen_pair_constant': mean_err({w: frozen_D for w in WINDOWS}),
                 'common_D1': mean_err({w: 1.0 for w in WINDOWS}),
                 'oracle_best_constant_uses_outcomes': mean_err({w: oracle_c for w in WINDOWS})}
        res[meal] = {'target_D': {str(w): Dt[w] for w in WINDOWS}, 'donor_D': {str(w): Dd[w] for w in WINDOWS},
                     'per_window_error_donor_time_specific': {str(w): ale(Dd[w], Dt[w]) for w in WINDOWS},
                     'mean_abs_log_error': rules, 'order': sorted(rules, key=rules.get),
                     'oracle_constant': oracle_c, 'oracle_min_error_formula': (logs[2] - logs[0]) / 3,
                     'donor_beats_oracle_constant': rules['matched_donor_time_specific'] < rules['oracle_best_constant_uses_outcomes']}
    return res


def time_objective_robustness(tgt_curves, tgt_pt, don, frozen_D):
    """Graph-reading check on the secondary objective (nominal operator): donor worst case vs oracle best case."""
    out = {}
    for meal in MEALS:
        Dd = {w: D_of(don[meal]['nominal'][str(w)]) for w in WINDOWS}
        per_delta = {}
        for delta in READING_ERRORS_PT:
            bounds = {w: reading_bounds(tgt_curves, tgt_pt, meal, 'nominal', w)[str(delta)] for w in WINDOWS}
            if any(b is None for b in bounds.values()): per_delta[str(delta)] = None; continue
            donor_worst = sum(max(ale(Dd[w], b) for b in bounds[w]) for w in WINDOWS) / 3
            lo_logs = [math.log(bounds[w][0]) for w in WINDOWS]; hi_logs = [math.log(bounds[w][1]) for w in WINDOWS]
            oracle_best = max(0.0, max(lo_logs) - min(hi_logs)) / 3
            d1_best = sum(0.0 if bounds[w][0] <= 1 <= bounds[w][1] else min(ale(1.0, b) for b in bounds[w]) for w in WINDOWS) / 3
            per_delta[str(delta)] = {'target_D_bounds': {str(w): bounds[w] for w in WINDOWS},
                                     'donor_time_specific_worst_case': donor_worst, 'oracle_constant_best_case': oracle_best,
                                     'common_D1_best_case': d1_best,
                                     'donor_still_beats_oracle': donor_worst < oracle_best,
                                     'donor_still_beats_D1': donor_worst < d1_best}
        out[meal] = per_delta
    out['note'] = ('Target readings only (donor readings held fixed); independent per-point errors of the stated size in PDF points. '
                   'A deterministic reading bound, not a sampling interval.')
    return out


def crossings_and_peaks(curves, times):
    """DESCRIPTIVE ONLY: group-mean peak times and where the two curves of each pair cross (linear between samples)."""
    out = {}
    for meal in MEALS:
        c = curves[meal]; res = {'peak_time_min': {a: times[max(range(7), key=lambda k: c[a][k])] for a in ARMS}}
        for x, y in (('T', 'G'), ('I', 'S')):
            diff = [c[x][k] - c[y][k] for k in range(7)]
            cross = []
            for k in range(1, 6):
                if diff[k] == 0: cross.append(times[k])
                elif diff[k] * diff[k + 1] < 0:
                    cross.append(times[k] + (times[k + 1] - times[k]) * diff[k] / (diff[k] - diff[k + 1]))
            res[f'{x}_minus_{y}_crossings_after_dose_min'] = cross
        out[meal] = res
    out['caution'] = 'Group means only; not participant-positive crossings and no population inference.'
    return out


def direct_T_over_I(I, tgt, don, frozen_D):
    """Different question: T/I itself. Cheap constituent rule 1/w and donor G/S alone are strong alternatives."""
    R = I['constituent_weight']['R']; w = (1 + R) / 2
    out = {'w': w, 'one_over_w': 1 / w}
    for meal in MEALS:
        for end in WINDOWS:
            t, d = tgt[meal]['nominal'][str(end)], don[meal]['nominal'][str(end)]
            obs = t['T'] / t['I']
            preds = {'equality': 1.0, 'constituents_1_over_w': 1 / w, 'constituents_times_frozen_pair_D': frozen_D / w,
                     'donor_G_over_S_only': d['G'] / d['S'], 'donor_T_over_I_levels': d['T'] / d['I']}
            out[f'{meal}_{end}'] = {'observed_T_over_I': obs, 'observed_G_over_S': t['G'] / t['S'], 'predictions': preds,
                                    'abs_log_error': {k: ale(v, obs) for k, v in preds.items()},
                                    'order': sorted(preds, key=lambda k: ale(preds[k], obs))}
    out['note'] = ('T/I = D x (G/S), so this question rewards getting the control ratio G/S right, which D deliberately cancels. '
                   'Coordinator results already exposed these values; scored here only as a separate question.')
    return out


def native_signed120(tgt, don, I):
    out = {}
    for meal in MEALS:
        t, d = tgt[meal]['nominal']['120'], don[meal]['nominal']['120']
        out[meal] = {'observed': t,
                     'donor_levels_as_given': {a: {'pred': d[a], 'signed_log_error': math.log(d[a] / t[a])} for a in ARMS},
                     'donor_ratio_x_measured_target_control': {
                         'T': {'pred': d['T'] / d['G'] * t['G'], 'signed_log_error': math.log(d['T'] / d['G'] * t['G'] / t['T'])},
                         'I': {'pred': d['I'] / d['S'] * t['S'], 'signed_log_error': math.log(d['I'] / d['S'] * t['S'] / t['I'])},
                         'note': 'separate benchmark using the measured target control arm'}}
        out[meal]['donor_levels_mean_abs_log_error'] = sum(abs(v['signed_log_error']) for v in out[meal]['donor_levels_as_given'].values()) / 4
    Y, a = I['yoshizane_levels_conditional'], I['frozen_forecasts']['frozen_dose_exponent']
    t = tgt['fasting']['nominal']['120']
    out['yoshizane_25g_diagnostic_only'] = {
        k: {arm: {'pred': Y[key] * s, 'signed_log_error_vs_target_signed120': math.log(Y[key] * s / t[arm])}
            for arm, key in (('G', 'GLUC'), ('T', 'TRE'))}
        for k, s in (('proportional', 75 / Y['dose_g']), ('frozen_exponent', (75 / Y['dose_g']) ** a))}
    out['yoshizane_25g_diagnostic_only']['limits'] = ('DIAGNOSTIC ONLY: one fasting 25 g study scaled to 75 g; participant-positive '
                                                      'serum CLEIA in lean healthy adults vs signed group-curve plasma RIA in IGT. The '
                                                      'matched signed 2 h donor levels above are the stronger comparison.')
    return out


# ============================================================================ archive: version-1 reported 3 h analysis (kept with failures)
def se_bounds(diff, test, df=9):
    d = abs(diff)
    if 'p_exact' in test: s = d / t_for_p(test['p_exact'], df); return [s, s]
    if 'p_range' in test: lo, hi = test['p_range']; return [d / t_for_p(lo, df), d / t_for_p(hi, df)]
    if 'p_at_least' in test: return [d / t_for_p(test['p_at_least'], df), None]
    return [None, None]


def archive_reported_3h(I):
    F, T, D9 = I['frozen_forecasts'], I['target']['insulin_iAUC_0_180'], I['donors_2009']
    tre, iso = D9['trehalose']['insulin_dAUC_0_180'], D9['isomaltulose']['insulin_dAUC_0_180']
    out = {}
    for meal, dk in (('fasting', 'morning'), ('lunch', 'afternoon')):
        t = T[meal]
        donor = {'T': tre[dk]['TRE'], 'G': tre[dk]['GLUC'], 'I': iso[dk]['IMU'], 'S': iso[dk]['SUC']}
        comp, frozen_D = frozen_comparators(F, donor)
        blk = score_meal(t['TRE'] / t['GLUC'], t['IMU'] / t['SUC'], comp)
        blk['frozen_pair_vs_common'] = pair_vs_common(frozen_D, blk['observed']['D'])
        blk['matched_donor_pair_vs_common'] = pair_vs_common(D_of(donor), blk['observed']['D'])
        tests = I['target']['paired_tests']
        se_tg = se_bounds(t['GLUC'] - t['TRE'], tests[f'{meal}_TRE_v_GLUC'])
        se_is = se_bounds(t['SUC'] - t['IMU'], tests[f'{meal}_IMU_v_SUC'])
        blk['heuristic_paired_scale'] = {
            'SE_of_paired_difference_from_reported_p': {'TG': se_tg, 'IS': se_is},
            'status': ('HEURISTIC, not a confidence interval. A reported paired p fixes only the SE of each paired difference; the '
                       'arm-level variances, their covariance and the cross-pair correlation are unknown, so no exact interval for a '
                       'ratio or for D follows, and the direction of any approximation error is not determined. A p reported only as '
                       '"not significant" bounds the SE from below only.')}
        out[meal] = blk
    out['lunch']['donor_status'] = 'INADMISSIBLE at face value: duplicated afternoon table cells across the two 2009 papers'
    out['note'] = ('Version-1 analysis of the author-reported 3 h iAUC (target Tables 2-3; donor Tables 1). Kept unchanged in '
                   'substance, including its failures; it is not the plan primary.')
    return out


def integrity(I, don):
    tre, iso = I['donors_2009']['trehalose']['insulin_dAUC_0_180'], I['donors_2009']['isomaltulose']['insulin_dAUC_0_180']
    table = {'fasting': {'T': tre['morning']['TRE'], 'G': tre['morning']['GLUC'], 'I': iso['morning']['IMU'], 'S': iso['morning']['SUC']},
             'lunch': {'T': tre['afternoon']['TRE'], 'G': tre['afternoon']['GLUC'], 'I': iso['afternoon']['IMU'], 'S': iso['afternoon']['SUC']}}
    fig = {m: don[m]['nominal']['180'] for m in MEALS}
    ratio = {m: {a: fig[m][a] / table[m][a] for a in ARMS} for m in MEALS}
    return {
        'duplicated_afternoon_table_cells': tre['afternoon']['TRE'] == iso['afternoon']['IMU'] and tre['afternoon']['GLUC'] == iso['afternoon']['SUC'],
        'figure_signed180_over_table_3h_by_arm': ratio,
        'figure_lunch_TG_vs_IS_signed180': {'TG': fig['lunch']['T'] / fig['lunch']['G'], 'IS': fig['lunch']['I'] / fig['lunch']['S']},
        'reading': ('The two donor papers print identical afternoon table cells for different pairs, yet their figure trajectories for '
                    'those arms are distinguishable. Figure/table area ratios are 0.95-0.98 for all fasting arms and the afternoon '
                    'trehalose and glucose arms, but about 0.70 and 0.62 for afternoon isomaltulose and sucrose. That pattern is '
                    'consistent with the shared cells belonging to the trehalose/glucose pair, but this is an inference from group-curve '
                    'areas and the table discrepancy remains UNRESOLVED.'),
        'shared_donor_cohort': ('Coordinator-supplied: the 2008 investigators\' joint meeting report (Int J Obes 2008 suppl., p. S134, '
                                'T3:PS.12) links both companion reports to one 10-person four-drink donor. Not independently verified here '
                                '(the PDF redirected to a publisher sign-in). Consistent with the identical subject descriptions.'),
        'overlap_with_2012_IGT_cohort': 'Open. The printed characteristics differ (age 31 vs 56; healthy vs IGT), but participant lists are not available.'}


# ============================================================================ main computation
def compute():
    I = load(HERE / 'inputs.json')
    tc, tpt = target_curves(I)
    dc, dpt, dclock = donor_curves(I)
    tgt = areas_for(tc, OPERATORS)
    don = areas_for(dc, OPERATORS + ('clock_0840',), dclock)
    frozen_D = frozen_comparators(I['frozen_forecasts'])[1]

    zero_time = {op: time_objective(tgt, don, frozen_D, op, op) for op in OPERATORS}
    zero_time['target_nominal_vs_donor_clock_0840'] = time_objective(tgt, don, frozen_D, 'nominal', 'clock_0840')
    primary_sensitivity = {op: {m: {'target_D': D_of(tgt[m][op]['120']), 'donor_D': D_of(don[m][op]['120'])} for m in MEALS}
                           for op in OPERATORS}
    primary_sensitivity['reading_bounds_target_D_120'] = {m: reading_bounds(tc, tpt, m, 'nominal', 120) for m in MEALS}
    primary_sensitivity['reading_bounds_donor_D_120'] = {m: reading_bounds(dc, dpt, m, 'nominal', 120) for m in MEALS}

    ok, _ = plan_freeze()
    return strict({
        'plan': '../PLAN.md', 'plan_matches_freeze': ok, 'fitted_parameters': None, 'version': 2,
        'endpoints': {
            'primary': 'signed group-mean curve area 0-120 min, nominal timing (pre-dose -5 min value at t = 0), uU*min/ml, from '
                       'investigator figure readings of target Fig. 1c,d and donor Fig. 1b',
            'archive': 'author-reported insulin iAUC over 3 h (tables); the version-1 analysis',
            'not_reported': 'the plan target, participant-positive 0-120 area, is not reported by either study'},
        'exposure': ('Target tables were read before donor tables (version 1). For version 2 the coordinator\'s figure readings and '
                     'results.json were inspected before this code was written; the secondary time-window objective was chosen after '
                     'inspecting released curves and is labelled post-hoc.'),
        'areas': {'target': tgt, 'donor': don},
        'primary_signed120': primary_signed120(I, tgt, don),
        'primary_sensitivity': primary_sensitivity,
        'secondary_time_windows_posthoc': {'by_zero_time_operator': zero_time,
                                           'graph_reading_robustness_nominal': time_objective_robustness(tc, tpt, don, frozen_D)},
        'descriptive_timing': {'target': crossings_and_peaks(tc, NOMINAL_TIMES), 'donor': crossings_and_peaks(dc, NOMINAL_TIMES)},
        'direct_T_over_I_separate_question': direct_T_over_I(I, tgt, don, frozen_D),
        'native_levels_signed120': native_signed120(tgt, don, I),
        'archive_reported_3h_v1': archive_reported_3h(I),
        'source_integrity': integrity(I, don),
    })


def lab_crosscheck(R):
    """Optional: copied readings still match the lab files, and recomputed areas reproduce the lab's own outputs."""
    I = load(HERE / 'inputs.json'); probs = []
    for key, rel in (('target_figure', 'figure.json'), ('donor_coordinates', 'matched/coordinates.csv')):
        p = PUB / rel
        if not p.is_file(): probs.append(f'{rel} MISSING'); continue
        if sha(p) != I['lab_readings'][key]['sha256']: probs.append(f'{rel} changed since import')
    if (PUB / 'results.json').is_file():
        L = load(PUB / 'results.json')
        for meal, lk in (('fasting', 'fast'), ('lunch', 'lunch')):
            for end in WINDOWS:
                lab = L['study'][lk][f'signed{end}']['observed']
                mine = R['areas']['target'][meal]['nominal'][str(end)]
                if any(not math.isclose(lab[a], mine[a], rel_tol=1e-9) for a in ARMS): probs.append(f'target {meal} {end} differs from results.json')
    else: probs.append('results.json MISSING')
    if (PUB / 'matched' / 'areas.csv').is_file():
        names = {'trehalose': 'T', 'glucose': 'G', 'isomaltulose': 'I', 'sucrose': 'S'}
        opmap = {'signed_nominal': 'nominal', 'signed_minus5_to_end': 'minus5_to_end',
                 'signed_linearly_interpolate_zero': 'interpolate_zero', 'signed_stated_0840_clock': 'clock_0840'}
        with (PUB / 'matched' / 'areas.csv').open(encoding='utf-8', newline='') as f:
            for row in csv.DictReader(f):
                op = opmap.get(row['operator'])
                if op is None: continue
                mine = R['areas']['donor'][row['period']][op][row['end_min']][names[row['arm']]]
                if not math.isclose(mine, float(row['area_nominal_uU_min_per_mL']), rel_tol=1e-9):
                    probs.append(f"donor {row['period']} {op} {row['end_min']} {row['arm']} differs from areas.csv")
    else: probs.append('matched/areas.csv MISSING')
    return probs


def main(argv):
    cmd = argv[1] if len(argv) > 1 else '--check'
    if cmd == 'import-lab':
        h = import_lab(); print('imported lab readings; sha256', h); return 0
    src = None
    if '--sources' in argv:
        i = argv.index('--sources')
        if i + 1 >= len(argv): sys.exit('--sources requires a DIRECTORY')
        src = argv[i + 1]
    R = compute(); ok, how = plan_freeze()
    if cmd == 'run':
        dump('RESULTS.json', R)
        log = HERE / 'EXECUTION.json'; E = load(log)
        E['runs'].append({'utc': now(), 'command': 'python -I -X utf8 pair.py run', 'version': 2, 'python': platform.python_version(),
                          'platform': platform.platform(), 'plan_freeze': how})
        dump('EXECUTION.json', E); print('wrote RESULTS.json (v2); plan freeze via', how); return 0
    if cmd != '--check': sys.exit(__doc__)
    problems = [] if ok else ['plan does not match FREEZE.json']
    diffs = same(R, load(HERE / 'RESULTS.json'))
    if diffs: problems.append('results differ at ' + ', '.join(diffs[:5]))
    audit = audit_sources(src, load(HERE / 'inputs.json')) if src is not None else None
    if audit and any(v != 'MATCH' for v in audit.values()): problems.append('source audit: ' + json.dumps(audit))
    lab = lab_crosscheck(R) if '--lab' in argv else None
    if lab: problems.extend(lab)
    verdict = 'PASS' if not problems else 'FAIL'
    print(f'{verdict} check (plan freeze via {how})' + ('; lab cross-check ' + ('OK' if not lab else 'FAILED') if lab is not None else '; lab cross-check not requested')
          + (f'; source audit {json.dumps(audit)}' if audit else '; source audit not requested'))
    for p in problems: print('  -', p)
    if '--record' in argv:
        E = load(HERE / 'EXECUTION.json')
        E['checks'].append({'utc': now(), 'command': ' '.join(['python -I -X utf8 pair.py'] + argv[1:]), 'version': 2, 'result': verdict,
                            'plan_freeze': how, 'lab_crosscheck': None if lab is None else (lab or 'OK'), 'source_audit': audit,
                            'problems': problems})
        dump('EXECUTION.json', E)
    return 0 if verdict == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
