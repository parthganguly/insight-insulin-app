"""PLAN panel B completion: all six undirected pairs among protein drinks 5,6,7,8 (read-only on frozen files).

python -I -X utf8 pairs.py           write PAIRS.json
python -I -X utf8 pairs.py --check   recompute and compare
"""
from pathlib import Path
import itertools, json, math, sys

ROOT = Path(__file__).resolve().parent
P = ['5', '6', '7', '8']
NAME = {'5': 'whey hydrolysate', '6': 'pea hydrolysate', '7': 'wheat hydrolysate', '8': 'intact casein'}
RULES = ['tie', 'F2_lan_mass', 'F2b_lan_reported_aa_sum', 'F3_lan_leucine_whey_eq_capped', 'F4_substitution_slope']


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def rule_values(fc):
    # F4 was frozen relative to drink 7 (=1 by definition); exp(slope*dLeu) is multiplicative, so any pair is F4[a]/F4[b].
    f4 = dict(fc['substitution_slope_vs_drink7'], **{'7': 1.0})
    return {'tie': {d: 1.0 for d in P}, 'F2_lan_mass': fc['lan_mass'], 'F2b_lan_reported_aa_sum': fc['lan_aa_sum'],
            'F3_lan_leucine_whey_eq_capped': fc['lan_leucine_whey_eq'], 'F4_substitution_slope': f4}


def run():
    pred, obs, inp = load('PREDICTIONS.json'), load('outcomes.json')['endpoints'], load('inputs.json')
    pairs = list(itertools.combinations(P, 2))
    out = {}
    for ep, cell in obs.items():
        R = cell['means']
        for basis, f in pred['forecasts'].items():
            v = rule_values(f['ratio_vs_drink1'])
            rows = {}
            for a, b in pairs:
                o = R[a] / R[b]
                pr = {r: v[r][a] / v[r][b] for r in RULES}
                rows[f'{a}/{b}'] = dict(numerator=f'drink {a} {NAME[a]}', denominator=f'drink {b} {NAME[b]}', observed=o,
                                        predicted=pr, abs_log_error={r: abs(math.log(p / o)) for r, p in pr.items()})
            out[f'{ep}:{basis}'] = dict(pairs=rows, mae_6_pairs={r: sum(x['abs_log_error'][r] for x in rows.values()) / 6 for r in RULES})
    order, pct = inp['aa_pct_by_wt']['_order'], inp['aa_pct_by_wt']
    sums = {s: dict(reported_sum_pct=sum(x for x in pct[s] if x is not None),
                    not_reported=[k for k, x in zip(order, pct[s]) if x is None])
            for s in ['whey_hydrolysate', 'pea_hydrolysate', 'wheat_hydrolysate', 'casein']}
    mass = {d: pred['forecasts']['per_50g_carbohydrate']['grams'][d]['nitrogen_source_g'] for d in P}
    return dict(status='Post-result completion of PLAN panel B; frozen predictions/readings unchanged; point errors, no CI',
                note='Undirected pair a/b with a<b. F4 pair ratio derived from frozen vs-drink-7 values (drink 7 = 1).',
                mass_rounding=dict(nitrogen_source_g_per_50g_carb=mass, exact_tie_among_5_8=len(set(mass.values())) == 1,
                                   comment='All four protein drinks list 57.1 g/L, so F2 equals the tie exactly here; ingredient rounding matters only for free-AA drinks 3, 4, 9.'),
                table2_reported_sums=sums,
                table2_interpretation='Reported-profile proxy only. Sums differ from 100% for unexplained reasons (unreported residues, non-amino-acid mass, analytic/hydration conventions); no chemical cause is established.',
                results=out)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, load('PAIRS.json')); print('PASS check'); sys.exit()
    (ROOT / 'PAIRS.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(r['mass_rounding']['exact_tie_among_5_8'], {k: round(v['reported_sum_pct'], 1) for k, v in r['table2_reported_sums'].items()})
    for k, v in r['results'].items():
        print(k, {x: round(y, 4) for x, y in v['mae_6_pairs'].items()})
        for p, row in v['pairs'].items():
            print('  ', p, round(row['observed'], 3), {x: round(y, 3) for x, y in row['predicted'].items()})
