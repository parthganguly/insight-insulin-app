"""v2 execution: E2 signed and E3 positive group-curve areas from the vector Fig. 4 reading, participant-positive bounds,
conservative illustrative uncertainty, and scoring of PREDICTIONS_v2.json. Standard library only.

python -I -X utf8 analysis_v2.py           write RESULTS_v2.json
python -I -X utf8 analysis_v2.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
TIMES = [-30, 0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 210]
WINDOWS = {'0_120': 120, '0_210': 210}
BASELINES = {'B_mean_of_minus30_and_0': (-30, 0), 'B_time0_only': (0,)}


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def series(g, key='mean'):
    return {int(t): (v['mean'] if key == 'mean' else max(v['se_whiskers'])) for t, v in g.items()}


def signed_area(m, base, tend):
    ts = [t for t in TIMES if 0 <= t <= tend]
    return sum((m[a] - base + m[b] - base) / 2 * (b - a) for a, b in zip(ts, ts[1:]))


def positive_area(m, base, tend):
    ts = [t for t in TIMES if 0 <= t <= tend]; s = 0.0
    for a, b in zip(ts, ts[1:]):
        ya, yb, dt = m[a] - base, m[b] - base, b - a
        if ya >= 0 and yb >= 0: s += (ya + yb) / 2 * dt
        elif ya > 0 > yb: s += ya * (ya / (ya - yb) * dt) / 2
        elif yb > 0 > ya: s += yb * (yb / (yb - ya) * dt) / 2
    return s


def participant_positive_upper(m, tend, bkey):
    """E(mean of individual positive areas) <= sum of chords with E[D(t)+] <= E X(t); at t=0 with the two-sample
    baseline D(0) = (X(0) - X(-30))/2 <= X(0)/2; with the time-0 baseline D(0) = 0."""
    ts = [t for t in TIMES if 0 <= t <= tend]
    u = {t: m[t] for t in ts}
    u[0] = m[0] / 2 if bkey == 'B_mean_of_minus30_and_0' else 0.0
    return sum((u[a] + u[b]) / 2 * (b - a) for a, b in zip(ts, ts[1:]))


def se_upper(se, tend, base_times):
    """Upper bound on SE of the signed area for ANY within-group correlation: SD(sum w X) <= sum |w| SD(X)."""
    ts = [t for t in TIMES if 0 <= t <= tend]
    w = {t: 0.0 for t in ts}
    for a, b in zip(ts, ts[1:]): w[a] += (b - a) / 2; w[b] += (b - a) / 2
    W = sum(w.values())
    wb = {t: W / len(base_times) for t in base_times}
    tot = {t: w.get(t, 0.0) for t in set(ts) | set(base_times)}
    for t in base_times: tot[t] -= wb[t]
    return sum(abs(c) * se[t] for t, c in tot.items())


def run():
    fig = load('fig4_vector.json')['groups']; pred = load('PREDICTIONS_v2.json'); P = pred['predicted_ratio_high_over_low']
    n = load('inputs_v2.json')['n']
    res = {}
    for bkey, bt in BASELINES.items():
        for wkey, tend in WINDOWS.items():
            arms = {}
            for g, d in fig.items():
                m, se = series(d), series(d, 'se')
                base = sum(m[t] for t in bt) / len(bt)
                arms[g] = dict(baseline=base, E2_signed=signed_area(m, base, tend), E3_positive_group=positive_area(m, base, tend),
                               participant_positive_lower=positive_area(m, base, tend), participant_positive_upper=participant_positive_upper(m, tend, bkey),
                               signed_area_se_upper_any_correlation=se_upper(se, tend, bt),
                               negative_tail_after_120={str(t): m[t] - base for t in TIMES if t > 120} if tend > 120 else None,
                               below_baseline_points={str(t): round(m[t] - base, 4) for t in TIMES if 0 < t <= tend and m[t] < base})
            ages = {}
            for age in ('young', 'old'):
                h, l = arms[f'{age}_high'], arms[f'{age}_low']
                out = {}
                for ep in ('E2_signed', 'E3_positive_group'):
                    if h[ep] <= 0 or l[ep] <= 0:
                        out[ep] = dict(status='UNAVAILABLE for log scoring (nonpositive area)', native_high=h[ep], native_low=l[ep], native_difference=h[ep] - l[ep]); continue
                    obs = h[ep] / l[ep]
                    out[ep] = dict(observed_ratio=obs, native_high=h[ep], native_low=l[ep], native_difference=h[ep] - l[ep],
                                   abs_log_error={k: abs(math.log(v / obs)) for k, v in P.items()},
                                   best_rule=min(('P0_equal_response', 'P2_fixed_enrichment_multiplier', 'P3_quantitative_slope'), key=lambda k: abs(math.log(P[k] / obs))))
                    if ep == 'E2_signed':
                        s = math.sqrt((h['signed_area_se_upper_any_correlation'] / h[ep]) ** 2 + (l['signed_area_se_upper_any_correlation'] / l[ep]) ** 2)
                        out[ep]['illustrative_log_se_upper'] = s
                        out[ep]['illustrative_95_interval_conservative'] = [obs * math.exp(-1.96 * s), obs * math.exp(1.96 * s)]
                        out[ep]['P2_vs_P3_separation'] = pred['thresholds']['separation_ln_P2_minus_ln_P3']
                lo, hi = h['participant_positive_lower'] / l['participant_positive_upper'], h['participant_positive_upper'] / l['participant_positive_lower']
                out['participant_positive_ratio_bounds'] = [lo, hi]
                out['participant_positive_rule_beats_tie_throughout'] = {k: lo > math.sqrt(v) if v > 1 else None for k, v in P.items()}
                ages[age] = out
            inter = {ep: (ages['old'][ep]['observed_ratio'] / ages['young'][ep]['observed_ratio'])
                     if 'observed_ratio' in ages['old'][ep] and 'observed_ratio' in ages['young'][ep] else None for ep in ('E2_signed', 'E3_positive_group')}
            res[f'{bkey}:{wkey}'] = dict(arms=arms, ages=ages, age_interaction_old_over_young=inter, n=n)
    return dict(status='v2 execution on Opus vector reading of Fig. 4; group-mean curve areas (not participant areas); no printed AUC or AUC SEM in source',
                coverage='Point scoring is unconditional on SEM. Source-derived uncertainty for areas is UNAVAILABLE (no printed AUC SEM); the interval shown '
                         'uses an upper bound on SE valid for any within-group time correlation (illustrative, conservative). SEM=0 is never assumed.',
                predictions_v2=P, results=res)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False))
    p = ROOT / 'RESULTS_v2.json'
    if '--check' in sys.argv:
        assert same(r, load('RESULTS_v2.json')); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for k, v in r['results'].items():
        print('==', k)
        for g, a in sorted(v['arms'].items()):
            print('  ', g, 'base', round(a['baseline'], 2), 'E2', round(a['E2_signed'], 1), 'E3', round(a['E3_positive_group'], 1),
                  'PPup', round(a['participant_positive_upper'], 1), 'SEup', round(a['signed_area_se_upper_any_correlation'], 1), 'below', a['below_baseline_points'])
        for age, o in v['ages'].items():
            for ep in ('E2_signed', 'E3_positive_group'):
                e = o[ep]
                print('   ', age, ep, {k: (round(x, 3) if isinstance(x, float) else x) for k, x in e.items() if k in ('observed_ratio', 'best_rule', 'status', 'native_difference')},
                      {k: round(x, 3) for k, x in e.get('abs_log_error', {}).items() if k in ('P0_equal_response', 'P2_fixed_enrichment_multiplier', 'P3_quantitative_slope')},
                      [round(x, 3) for x in e.get('illustrative_95_interval_conservative', [])])
            print('    ', age, 'PP bounds', [round(x, 3) for x in o['participant_positive_ratio_bounds']])
        print('   interaction', {k: (round(x, 3) if x else None) for k, x in v['age_interaction_old_over_young'].items()})
