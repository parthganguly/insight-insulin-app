"""van Loon 2000 common-control mixture test (protocol PLAN.md). Standard library only.

python -I -X utf8 analysis.py freeze    write PREDICTIONS.json (food inputs only) once
python -I -X utf8 analysis.py score     needs outcomes.json; writes RESULTS.json
python -I -X utf8 analysis.py --check   recompute and compare saved files
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
DRINKS = [str(i) for i in range(2, 11)]
FOOD = ['no_change', 'energy', 'lan_mass', 'lan_aa_sum', 'lan_leucine_whey_eq']


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def lan(g, c, tail=False):
    x, y = c['added_g'], c['ratio']
    if g > x[-1]:
        return y[-1] + (y[-1] - y[-2]) * (g - x[-1]) / (x[-1] - x[-2]) if tail else y[-1]
    for i in range(len(x) - 1):
        if g <= x[i + 1]: return y[i] + (y[i + 1] - y[i]) * (g - x[i]) / (x[i + 1] - x[i])


def composition(inp, d):
    """Per-drink grams per L: nitrogen-source mass, leucine, reported AA sum (lower bound flag)."""
    order, pct = inp['aa_pct_by_wt']['_order'], inp['aa_pct_by_wt']
    dr = inp['drinks_g_per_L'][d]
    mass = sum(dr['free'].values()) + sum(dr['protein'].values())
    leu = dr['free'].get('Leu', 0.0); aa = sum(dr['free'].values()); missing = []
    for src, g in dr['protein'].items():
        row = dict(zip(order, pct[src]))
        leu += g * row['Leu'] / 100
        aa += g * sum(v for v in row.values() if v is not None) / 100
        missing += [f'{src}:{k}' for k, v in row.items() if v is None]
    return dict(carb=dr['carb'], mass=mass, leucine=leu, aa_sum=aa, aa_sum_missing=missing)


def predictions(inp):
    c = inp['lan_whey_curve']; slope = inp['substitution_slope_log_per_g_leucine']['value']
    whey_leu = dict(zip(inp['aa_pct_by_wt']['_order'], inp['aa_pct_by_wt']['whey_hydrolysate']))['Leu'] / 100
    bw = inp['protocol']['body_mass_kg_mean']
    bases = {'per_50g_carbohydrate': lambda comp, g: g * 50 / comp['carb'],
             'per_bolus_absolute': lambda comp, g: g * inp['protocol']['bolus_mL_per_kg'] * bw / 1000}
    out = {}
    for bname, conv in bases.items():
        comps = {d: composition(inp, d) for d in DRINKS}
        p = {r: {} for r in FOOD + ['lan_leucine_whey_eq_linear_tail', 'substitution_slope_vs_drink7']}
        grams = {}
        for d, comp in comps.items():
            mass, aa, leu = conv(comp, comp['mass']), conv(comp, comp['aa_sum']), conv(comp, comp['leucine'])
            grams[d] = dict(nitrogen_source_g=mass, aa_sum_g=aa, leucine_g=leu, leucine_whey_eq_g=leu / whey_leu,
                            aa_sum_lower_bound=bool(comp['aa_sum_missing']))
            p['no_change'][d] = 1.0
            p['energy'][d] = (comp['carb'] + comp['mass']) / comp['carb']
            p['lan_mass'][d] = lan(mass, c)
            p['lan_aa_sum'][d] = lan(aa, c)
            p['lan_leucine_whey_eq'][d] = lan(leu / whey_leu, c)
            p['lan_leucine_whey_eq_linear_tail'][d] = lan(leu / whey_leu, c, tail=True)
        for d in ['5', '6', '8']:
            p['substitution_slope_vs_drink7'][d] = math.exp(slope * (grams[d]['leucine_g'] - grams['7']['leucine_g']))
        out[bname] = dict(grams=grams, ratio_vs_drink1=p)
    return dict(status='Frozen food-input forecasts; no van Loon insulin read', primary_basis='per_50g_carbohydrate',
                note='substitution_slope_vs_drink7 is a within-protein contrast vs drink 7 (not vs drink 1); other drinks abstain',
                forecasts=out, measured_benchmarks_defined=['blend_linear: R10=0.5*R3+0.5*R7', 'blend_log: R10=sqrt(R3*R7)'])


def err(p, o): return abs(math.log(p / o))


def score(pred, obs):
    res = {}
    for ep, cell in obs['endpoints'].items():
        R = cell['means']; o = {d: R[d] / R['1'] for d in DRINKS}
        fc = pred['forecasts'][pred['primary_basis']]['ratio_vs_drink1']
        A = {}
        for r in FOOD + ['lan_leucine_whey_eq_linear_tail']:
            e = {d: err(fc[r][d], o[d]) for d in DRINKS}
            A[r] = dict(abs_log_error=e, mean_9=sum(e.values()) / 9,
                        mean_7_unexposed=sum(v for d, v in e.items() if d not in ('3', '9')) / 7)
        # Panel B: within-protein contrasts vs drink 7
        B = {}
        for d in ['5', '6', '8']:
            ob = R[d] / R['7']
            rules = {r: fc[r][d] / fc[r]['7'] for r in ['lan_mass', 'lan_aa_sum', 'lan_leucine_whey_eq']}
            rules['substitution_slope'] = fc['substitution_slope_vs_drink7'][d]
            B[f'{d}/7'] = dict(observed=ob, predicted=rules, abs_log_error={k: err(v, ob) for k, v in rules.items()})
        Bmean = {k: sum(B[x]['abs_log_error'][k] for x in B) / 3 for k in B['5/7']['predicted']}
        # Panel C: blend
        lin, lg = 0.5 * R['3'] + 0.5 * R['7'], math.sqrt(R['3'] * R['7'])
        C = dict(observed_level=R['10'], observed_ratio=o['10'],
                 measured_benchmarks={'blend_linear': dict(level=lin, abs_log_error=err(lin, R['10'])),
                                      'blend_log': dict(level=lg, abs_log_error=err(lg, R['10']))},
                 food_rules={r: dict(ratio=fc[r]['10'], abs_log_error=err(fc[r]['10'], o['10'])) for r in FOOD},
                 observed_minus_linear_fraction_of_half_gap=(R['10'] - lin) / (0.5 * abs(R['3'] - R['7'])) if R['3'] != R['7'] else None)
        # Panel D: free-AA drinks ordering vs leucine rule
        D = {d: dict(observed_ratio=o[d], leucine_rule=fc['lan_leucine_whey_eq'][d]) for d in ['2', '3', '4', '9', '10']}
        res[ep] = dict(definition=cell['definition'], locator=cell['locator'], observed_ratio_vs_drink1=o,
                       dispersion=cell.get('dispersion'), letters=cell.get('letters'),
                       A_levels=A, B_protein_substitution=dict(contrasts=B, mean_abs_log_error=Bmean), C_blend=C, D_free_aa=D)
    return dict(status='Scored after freeze; drinks 3 and 9 abstract-exposed; point comparisons, no paired CI', endpoints=res)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


def dump(n, x): (ROOT / n).write_text(json.dumps(x, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    cmd = sys.argv[1]
    pred = json.loads(json.dumps(predictions(load('inputs.json'))))
    if cmd == 'freeze':
        if (ROOT / 'PREDICTIONS.json').exists(): sys.exit('already frozen')
        dump('PREDICTIONS.json', pred)
        for b, v in pred['forecasts'].items():
            print(b); [print(' ', r, {d: round(x, 4) for d, x in p.items()}) for r, p in v['ratio_vs_drink1'].items()]
    elif cmd == 'score':
        assert same(pred, load('PREDICTIONS.json'))
        res = json.loads(json.dumps(score(pred, load('outcomes.json')))); dump('RESULTS.json', res)
        print(json.dumps(res, indent=1)[:6000])
    elif cmd == '--check':
        assert same(pred, load('PREDICTIONS.json'))
        assert same(json.loads(json.dumps(score(pred, load('outcomes.json')))), load('RESULTS.json')); print('PASS check')
