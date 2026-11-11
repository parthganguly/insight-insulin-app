"""Carbohydrate-onset shift test, revised labels/semantics (v1 numbers preserved). Standard library only.

Run from any directory:
  python -I -X utf8 clock_shift.py          write RESULTS.json next to this script
  python -I -X utf8 clock_shift.py --check  recompute and compare with RESULTS.json
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
# Published group-level aggregate cells only.
SHUKLA2015 = dict(source='https://doi.org/10.2337/dc15-0429', location='Table 1',
                  first_arm_times_min=[0, 30, 60, 120], first_arm_insulin_uIU_mL=[18.8, 62.4, 125.4, 152.0],
                  iauc_120={'last': 5202.8, 'first': 10097.9}, sem={'last': 1061.6, 'first': 1646.9},
                  carb_onset_last_min=15, population='11 metformin-treated adults with T2D; visit order fixed')
IMAI2023 = dict(source='https://doi.org/10.3390/nu15051174', location='Table 2, insulin IAUC 0-120 min',
                iauc_120={'slow_last': 4222, 'slow_first': 5702, 'fast_last': 4113},
                sem={'slow_last': 458, 'slow_first': 486, 'fast_last': 402},
                rice_onset_min={'slow_first': 0, 'slow_last': 14, 'fast_last': 7},
                grid_min=[0, 30, 60, 120], population='18 healthy young women; randomized crossover; no fast carbohydrate-first arm')
WINDOW = 120
WHOLE_RATIO = SHUKLA2015['iauc_120']['last'] / SHUKLA2015['iauc_120']['first']
# v1 tolerances: arbitrary descriptive choices with no established clinical meaning.
V1_TOLERANCE_D2 = 0.10
ROUNDING_HALF_UNIT = 0.05


def profile():
    y = SHUKLA2015['first_arm_insulin_uIU_mL']
    return SHUKLA2015['first_arm_times_min'], [v - y[0] for v in y]


def f(u):
    """Baseline-subtracted piecewise-linear group-mean curve; assumed 0 before carbohydrate onset."""
    t, y = profile()
    if u <= 0: return 0.0
    assert u <= t[-1] + 1e-12, 'beyond source support'
    for (t0, y0), (t1, y1) in zip(zip(t, y), zip(t[1:], y[1:])):
        if u <= t1: return y0 + (y1 - y0) * (u - t0) / (t1 - t0)


def exact_area(s):
    """Operator A (integrate continuous shifted curve): integral_0^(120-s) f(u) du."""
    t, _ = profile(); top = WINDOW - s
    knots = sorted({0.0, top, *[k for k in t if 0 < k < top]})
    return sum((f(a) + f(c)) / 2 * (c - a) for a, c in zip(knots, knots[1:]))


def grid_area(s, grid):
    """Operator B (resample shifted curve on target grid, positive-clipped trapezoid)."""
    v = [max(0.0, f(g - s)) for g in grid]
    return sum((v[i] + v[i + 1]) / 2 * (grid[i + 1] - grid[i]) for i in range(len(grid) - 1))


def terminal_share(s, kind):
    """Share of the reference 0-120 area lying in the final s minutes (operator A)."""
    if kind == 'flat': return s / WINDOW
    if kind == 'linear_ramp': return (WINDOW ** 2 - (WINDOW - s) ** 2) / WINDOW ** 2
    if kind == 'shukla_first_arm': return 1 - exact_area(s) / exact_area(0)


def zero_correlation_log_sd(m, a, b):
    """One delta-method scenario assuming zero within-person correlation; NOT a CI or decision floor."""
    return math.sqrt((m['sem'][a] / m['iauc_120'][a]) ** 2 + (m['sem'][b] / m['iauc_120'][b]) ** 2)


def rounding_allowance(times):
    """Max change of the baseline-subtracted net trapezoid when each printed value moves by +/-0.05."""
    w = [0.0] * len(times)
    for i in range(len(times) - 1):
        h = (times[i + 1] - times[i]) / 2; w[i] += h; w[i + 1] += h
    w[0] -= times[-1] - times[0]
    return ROUNDING_HALF_UNIT * sum(abs(x) for x in w)


def run():
    I, S = IMAI2023, SHUKLA2015
    panels = {
        'P1_imai_slow_last_over_slow_first': dict(src=I, num='slow_last', den='slow_first', s=(14, 0), grid=I['grid_min'], order_differs=True,
            role='primary transfer; order changes at matched pace'),
        'P2_imai_fast_last_over_slow_first': dict(src=I, num='fast_last', den='slow_first', s=(7, 0), grid=I['grid_min'], order_differs=True,
            role='context; order, onset and pace change together'),
        'P3_imai_fast_last_over_slow_last': dict(src=I, num='fast_last', den='slow_last', s=(7, 14), grid=I['grid_min'], order_differs=False,
            role='onset-only check with order fixed; pace and rice duration also differ'),
        'P4_shukla_last_over_first_in_source': dict(src=S, num='last', den='first', s=(15, 0), grid=S['first_arm_times_min'], order_differs=True,
            role='in-source check; shape from same cohort; not validation'),
    }
    out = {}
    for name, p in panels.items():
        obs = p['src']['iauc_120'][p['num']] / p['src']['iauc_120'][p['den']]
        sn, sd = p['s']
        pred = {'no_change': 1.0, 'whole_ratio': WHOLE_RATIO if p['order_differs'] else 1.0,
                'flat_window': (WINDOW - sn) / (WINDOW - sd),
                'shift_exact_A': exact_area(sn) / exact_area(sd),
                'shift_grid_B': grid_area(sn, p['grid']) / grid_area(sd, p['grid'])}
        row = dict(role=p['role'], numerator=p['num'], denominator=p['den'], onset_shift_min=[sn, sd],
                   observed_ratio=obs, observed_ln=math.log(obs),
                   zero_correlation_log_sd_scenario=zero_correlation_log_sd(p['src'], p['num'], p['den']),
                   predicted=pred, abs_log_error={k: abs(math.log(v / obs)) for k, v in pred.items()},
                   predicted_direction_matches_observed_mean={k: (abs(math.log(v)) > 1e-12 and (v > 1) == (obs > 1)) for k, v in pred.items()})
        if name.startswith('P4'):
            row['whole_ratio_note'] = 'equals observed by construction in source; not scored'
            # Ratio of log ratios: descriptive reproduction share, NOT a causal proportion explained.
            row['reproduced_share_of_observed_log_ratio'] = {k: math.log(pred[k]) / math.log(obs) for k in ['flat_window', 'shift_exact_A', 'shift_grid_B']}
        out[name] = row
    p1, p3, p4 = (out[k] for k in ['P1_imai_slow_last_over_slow_first', 'P3_imai_fast_last_over_slow_last', 'P4_shukla_last_over_first_in_source'])
    p1['reproduced_share_of_observed_log_ratio'] = {k: math.log(p1['predicted'][k]) / p1['observed_ln'] for k in ['flat_window', 'shift_exact_A', 'shift_grid_B']}
    terminal = {}
    for key, row in [('P1', p1), ('P4', p4)]:
        s = row['onset_shift_min'][0]
        req = 1 - row['observed_ratio']
        terminal[key] = dict(onset_shift_min=s, terminal_share_required_for_continuous_translation=req,
                             terminal_share_flat=terminal_share(s, 'flat'), terminal_share_linear_ramp=terminal_share(s, 'linear_ramp'),
                             terminal_share_shukla_first_arm=terminal_share(s, 'shukla_first_arm'),
                             required_terminal_share_exceeds_linear_ramp_share=req > terminal_share(s, 'linear_ramp'),
                             note='Late-area share, not curvature: exceeding the ramp needs more late area than a ramp, e.g. a late step/plateau; it does not require acceleration throughout.')
    e1, e4 = p1['abs_log_error'], p4['abs_log_error']
    ops = ['shift_exact_A', 'shift_grid_B']
    decisions = {
        'D1_shift_lower_error_than_no_change_and_flat_on_P1_both_operators': all(e1[m] < e1['no_change'] and e1[m] < e1['flat_window'] for m in ops),
        'D1_shift_lower_error_than_whole_ratio_on_P1_both_operators': all(e1[m] < e1['whole_ratio'] for m in ops),
        'D2_v1_arbitrary_tolerance_log': V1_TOLERANCE_D2,
        'D2_P4_both_operators_within_v1_tolerance': all(e4[m] <= V1_TOLERANCE_D2 for m in ops),
        'D2_note': 'Within tolerance would not establish a complete explanation; outside it does not quantify a causal share.',
        'D3_observed_mean_fast_last_over_slow_last_gt_1': p3['observed_ratio'] > 1,
        'D3_onset_only_predicts_gt_1_both_operators': all(p3['predicted'][m] > 1 for m in ops),
        'D3_note': 'Descriptive mean-direction comparison; pace and rice duration confounded; not a rejection test.',
        'D4_required_terminal_share_exceeds_linear_ramp_share': {k: v['required_terminal_share_exceeds_linear_ramp_share'] for k, v in terminal.items()},
        'operator_gap_ln_A_over_B_P1': math.log(p1['predicted']['shift_exact_A'] / p1['predicted']['shift_grid_B']),
    }
    t, y = profile()
    operator_check = dict(
        note='Area of the rounded group-mean curve vs printed mean of participant areas; different operators.',
        shukla_first_arm_mean_curve_area=exact_area(0), shukla_first_arm_printed_mean_iauc=S['iauc_120']['first'],
        shukla_rounding_allowance=rounding_allowance(t),
        shukla_first_arm_difference_within_rounding=abs(exact_area(0) - S['iauc_120']['first']) <= rounding_allowance(t))
    return dict(status='Outcome-exposed development and structural test; not blind validation. v1 numbers preserved; labels corrected.',
                endpoint_note='Observed: ratios of printed mean participant 0-120 insulin areas. Predicted: area ratios of a transferred group-mean curve.',
                assumptions=['whole carbohydrate-first curve translated by carbohydrate onset', 'zero insulin from foods eaten before carbohydrate',
                             'T2D cohort shape transferred to healthy women', 'shape undefined beyond 120 min (not needed)'],
                inputs=dict(shukla2015=S, imai2023=I), operator_check=operator_check, panels=out, terminal_share=terminal, decisions=decisions)


def close(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(close(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    res = json.loads(json.dumps(run()))
    target = ROOT / 'RESULTS.json'
    if '--check' in sys.argv:
        assert close(res, json.loads(target.read_text(encoding='utf-8'))), 'RESULTS.json mismatch'
        print('PASS check'); sys.exit()
    target.write_text(json.dumps(res, indent=2) + '\n', encoding='utf-8', newline='\n')
    for k, v in res['panels'].items():
        print(k, 'obs=%.6f' % v['observed_ratio'], {m: '%.6f/%.6f' % (v['predicted'][m], v['abs_log_error'][m]) for m in v['predicted']})
    print(json.dumps(res['decisions'], indent=1))
