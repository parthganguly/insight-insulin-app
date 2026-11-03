"""v3 checks (stdlib): (A) independent re-implementation of the constructive two-point panels on Opus's own Fig. 4
reading; (B) Farup 2016 within-hydrolysate pairwise-loss identity and monotone-rule lower bound.

python -I -X utf8 challenge_v3.py           write CHALLENGE_v3.json
python -I -X utf8 challenge_v3.py --check
"""
from pathlib import Path
import itertools, json, math, sys

ROOT = Path(__file__).resolve().parent
TIMES = [-30, 0, 15, 30, 45, 60, 75, 90, 120]
N = {'young': 8, 'old': 10}
P3 = json.loads((ROOT / 'PREDICTIONS_v2.json').read_text(encoding='utf-8'))['predicted_ratio_high_over_low']['P3_quantitative_slope']


def panel(g, n, mode):
    """Two-point panel with the reading's per-time mean and SE (sample SD = SE*sqrt(n)). k = n/2 - 1 'up' people.
    aligned: same k people 'up' at every time; reassigned: pre-dose 'up' set {0..k-1}, post-dose 'up' set disjoint."""
    k = n // 2 - 1
    up = lambda mu, se: mu + se * math.sqrt((n - 1) * (n - k) / k)
    dn = lambda mu, se: mu - se * math.sqrt((n - 1) * k / (n - k))
    X = [[0.0] * len(TIMES) for _ in range(n)]
    for j, t in enumerate(TIMES):
        mu, se = g[str(t)]['mean'], max(g[str(t)]['se_whiskers'])
        ups = set(range(k)) if (t <= 0 or mode == 'aligned') else set(range(k, 2 * k))
        for i in range(n): X[i][j] = up(mu, se) if i in ups else dn(mu, se)
    return X


def pos_area(row):
    b = (row[0] + row[1]) / 2; s = 0.0
    for j in range(1, len(TIMES) - 1):
        a, c, dt = row[j] - b, row[j + 1] - b, TIMES[j + 1] - TIMES[j]
        if a >= 0 and c >= 0: s += (a + c) / 2 * dt
        elif a > 0 > c: s += a * a / (a - c) * dt / 2
        elif c > 0 > a: s += c * c / (c - a) * dt / 2
    return s


def check_panel(X, g):
    n = len(X); out = []
    for j, t in enumerate(TIMES):
        col = [r[j] for r in X]; m = sum(col) / n; sd = math.sqrt(sum((x - m) ** 2 for x in col) / (n - 1))
        out.append(abs(m - g[str(t)]['mean']) < 1e-9 and abs(sd / math.sqrt(n) - max(g[str(t)]['se_whiskers'])) < 1e-9 and min(col) >= 0)
    return all(out), min(min(r) for r in X)


def constructive():
    fig = json.loads((ROOT / 'fig4_vector.json').read_text(encoding='utf-8'))['groups']
    res = {}
    for age, n in N.items():
        areas, ok = {}, {}
        for arm in ('high', 'low'):
            g = fig[f'{age}_{arm}']
            for mode in ('aligned', 'reassigned'):
                X = panel(g, n, mode); ok[f'{arm}_{mode}'] = check_panel(X, g)
                areas[f'{arm}_{mode}'] = sum(pos_area(r) for r in X) / n
        ex = []
        for hm, lm in itertools.product(('aligned', 'reassigned'), repeat=2):
            r = areas[f'high_{hm}'] / areas[f'low_{lm}']
            ex.append(dict(high=hm, low=lm, ratio=r, slope_closer_than_tie=abs(math.log(P3 / r)) < abs(math.log(r))))
        res[age] = dict(mean_positive_areas=areas, moments_reproduced_and_nonnegative={k: v[0] for k, v in ok.items()},
                        min_value={k: v[1] for k, v in ok.items()}, examples=ex,
                        ratio_span=[min(e['ratio'] for e in ex), max(e['ratio'] for e in ex)])
    return res


def farup():
    obs = {'H': 210.6, 'M': 226.0, 'L': 217.1}; leu = {'H': 3.24, 'M': 1.60, 'L': 1.96}; dh = {'H': 48, 'M': 27, 'L': 23}
    lo = {k: math.log(v) for k, v in obs.items()}
    pairs = [('H', 'M'), ('H', 'L'), ('M', 'L')]

    def loss(lp):
        d = {k: lp[k] - lo[k] for k in obs}
        pw = [abs(d[a] - d[b]) for a, b in pairs]
        return sum(pw) / 3, (2 / 3) * (max(d.values()) - min(d.values())), {f'{a}/{b}': e for (a, b), e in zip(pairs, pw)}

    tie = loss({k: 0.0 for k in obs})
    rules = {'tie': {k: 0.0 for k in obs},
             'leucine_slope_P3': {k: P3_slope * leu[k] for k in obs},
             'DH_only_0.011713_per_pp': {k: 0.011713262894596291 * dh[k] for k in obs}}
    out = {}
    for name, lp in rules.items():
        m, r, pw = loss(lp)
        out[name] = dict(mean_pairwise_loss=m, two_thirds_range=r, identity_holds=math.isclose(m, r, rel_tol=1e-12), pairwise=pw,
                         monotone_lower_bound=tie[0] + (2 / 3) * (lp['H'] - lp['M']),
                         bound_respected=m >= tie[0] + (2 / 3) * (lp['H'] - lp['M']) - 1e-12 if lp['H'] >= lp['M'] else None,
                         ML_direction_correct=(lp['M'] - lp['L'] > 0) == (lo['M'] - lo['L'] > 0) if lp['M'] != lp['L'] else None)
    return dict(observed=obs, order_check={'H_is_min': obs['H'] == min(obs.values()), 'M_is_max': obs['M'] == max(obs.values())},
                inputs={'leucine_g': leu, 'DH_percent': dh}, tie_loss=tie[0], rules=out,
                note='Identity: |a-b|+|b-c|+|a-c| = 2(max-min). Any rule with pred_H >= pred_M has d_H - d_M >= ln(226/210.6) + ln(pred_H/pred_M), '
                     'so its mean pairwise loss >= tie loss + (2/3) ln(pred_H/pred_M). Reported AUC: 0-120 sampled, operator/units unclear, not participant-positive.')


P3_slope = 0.1022204575597254


def run():
    return dict(constructive=constructive(), farup=farup(),
                glynn_note='Glynn 30-min increments 59 vs 73 pmol/L are a single-time increment, not an area; scored separately (facts/early.json), not as AUC.')


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'CHALLENGE_v3.json'
    if '--check' in sys.argv:
        assert same(r, json.loads(p.read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for age, v in r['constructive'].items():
        print(age, v['moments_reproduced_and_nonnegative'], {k: round(x, 2) for k, x in v['min_value'].items()})
        print('  ', [(e['high'][0] + e['low'][0], round(e['ratio'], 4), e['slope_closer_than_tie']) for e in v['examples']])
    f = r['farup']; print('farup tie', round(f['tie_loss'], 4), f['order_check'])
    for k, v in f['rules'].items(): print('  ', k, round(v['mean_pairwise_loss'], 4), v['identity_holds'], round(v['monotone_lower_bound'], 4), v['bound_respected'], v['ML_direction_correct'])
