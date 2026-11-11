"""Whey vs free-amino-acid form challenge (Gunnerud 2012). Standard library only.

python -I -X utf8 analysis.py freeze    write PREDICTIONS.json once (food inputs only; no outcome read)
python -I -X utf8 analysis.py score     read outcomes.json, write RESULTS.json
python -I -X utf8 analysis.py --check   recompute both and compare with the saved files
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
SUBSET = ['Ile', 'Leu', 'Lys', 'Thr', 'Val']
RULES = ['no_change', 'printed_energy', 'total_protein', 'leucine_whey_equivalent', 'matched_subset_whey_equivalent', 'intact_protein_only']
CONTRASTS = [('W+5AA', 'W'), ('S+5AA', 'S'), ('W+6AA', 'W+5AA'), ('S+6AA', 'S+5AA'), ('S', 'W'), ('S+5AA', 'W+5AA')]


def load(name): return json.loads((ROOT / name).read_text(encoding='utf-8'))


def lan(g, curve):
    x, y = curve['added_g'], curve['ratio']
    if not 0 <= g <= x[-1]: raise ValueError('outside Lan interpolation domain')
    for i in range(len(x) - 1):
        if g <= x[i + 1]: return y[i] + (y[i + 1] - y[i]) * (g - x[i]) / (x[i + 1] - x[i])


def aa_grams(arm, aa, prof):
    """Grams of one amino acid in the drink; None if the intact-protein profile value is missing."""
    total = arm['free_aa_g'].get(aa, 0.0)
    for src in ['whey', 'soy']:
        g = arm[src + '_g']
        if g:
            v = prof[src][aa]
            if v is None: return None
            total += g * v / 100
    return total


def predictions(inp):
    ref, curve, prof = inp['reference_meal'], inp['lan_whey_marginal_development_curve'], inp['aa_per_100g_protein']
    leu_scale = 100 / prof['whey']['Leu']
    sub_scale = 100 / sum(prof['whey'][a] for a in SUBSET)
    out = {r: {} for r in RULES}
    for name, a in inp['arms'].items():
        added = a['total_protein_g'] - ref['protein_g']
        out['no_change'][name] = 1.0
        out['printed_energy'][name] = a['energy_kcal'] / ref['energy_kcal']
        out['total_protein'][name] = lan(added, curve)
        out['leucine_whey_equivalent'][name] = lan(aa_grams(a, 'Leu', prof) * leu_scale, curve)
        parts = [aa_grams(a, x, prof) for x in SUBSET]
        out['matched_subset_whey_equivalent'][name] = None if None in parts else lan(sum(parts) * sub_scale, curve)
        out['intact_protein_only'][name] = lan(a['whey_g'] + a['soy_g'], curve)
    descriptors = {name: dict(added_protein_g=a['total_protein_g'] - ref['protein_g'], leucine_g=aa_grams(a, 'Leu', prof),
                              leucine_whey_equivalent_g=aa_grams(a, 'Leu', prof) * leu_scale, intact_protein_g=a['whey_g'] + a['soy_g'])
                   for name, a in inp['arms'].items()}
    return dict(status='Frozen food-input forecasts; no Gunnerud insulin read', predictions=out, descriptors=descriptors,
                unavailable={'matched_subset_whey_equivalent': 'soy isoleucine not printed (Table 2)'})


def score(pred, obs):
    res = {}
    for ep, cells in obs['endpoints'].items():
        o = {k: cells['arms'][k] / cells['reference'] for k in cells['arms']}
        per = {}
        for r in RULES:
            p = pred['predictions'][r]
            err = {k: (abs(math.log(p[k] / o[k])) if p[k] is not None else None) for k in o}
            cov = [k for k in o if err[k] is not None]
            whey = [k for k in cov if k.startswith('W')]
            per[r] = dict(abs_log_error=err, coverage=len(cov),
                          mean_all_arms=(sum(err[k] for k in cov) / len(cov)) if len(cov) == len(o) else None,
                          mean_whey_arms=sum(err[k] for k in whey) / len(whey))
        con = {}
        for a, b in CONTRASTS:
            oc = cells['arms'][a] / cells['arms'][b]
            pc = {r: (pred['predictions'][r][a] / pred['predictions'][r][b]) if None not in (pred['predictions'][r][a], pred['predictions'][r][b]) else None for r in RULES}
            con[f'{a}/{b}'] = dict(observed=oc, predicted=pc,
                                   abs_log_error={r: abs(math.log(v / oc)) if v is not None else None for r, v in pc.items()},
                                   source_letters=[cells['letters'].get(a), cells['letters'].get(b)])
        res[ep] = dict(definition=cells['definition'], locator=cells['locator'], observed_ratio_to_reference=o,
                       source_letters=cells['letters'], rules=per, contrasts=con)
    key = {}
    for ep in res:
        for c in ['W+5AA/W', 'S+5AA/S']:
            ob = res[ep]['contrasts'][c]['observed']
            key[f'{ep}:{c}'] = dict(observed=ob, observed_sign=(ob > 1) - (ob < 1),
                                    predicted_sign={r: (v > 1 + 1e-12) - (v < 1 - 1e-12) for r, v in res[ep]['contrasts'][c]['predicted'].items() if v is not None})
    return dict(status='Scored after freeze; outcome-exposed design (see PLAN.md); point comparisons only, no paired CI',
                endpoints=res, key_form_sign_discriminator=key)


def dump(p, x): (ROOT / p).write_text(json.dumps(x, indent=2) + '\n', encoding='utf-8', newline='\n')


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    cmd = sys.argv[1]
    pred = json.loads(json.dumps(predictions(load('inputs.json'))))
    if cmd == 'freeze':
        if (ROOT / 'PREDICTIONS.json').exists(): sys.exit('PREDICTIONS.json already frozen')
        dump('PREDICTIONS.json', pred); print(json.dumps(pred['predictions'], indent=1))
    elif cmd == 'score':
        assert same(pred, load('PREDICTIONS.json')), 'predictions differ from frozen file'
        res = json.loads(json.dumps(score(pred, load('outcomes.json')))); dump('RESULTS.json', res)
        for ep, v in res['endpoints'].items():
            print(ep, {r: (round(x['mean_all_arms'], 4) if x['mean_all_arms'] is not None else None, round(x['mean_whey_arms'], 4)) for r, x in v['rules'].items()})
            for c, d in v['contrasts'].items(): print('  ', c, round(d['observed'], 4), {r: (round(p, 4) if p else None) for r, p in d['predicted'].items()})
    elif cmd == '--check':
        assert same(pred, load('PREDICTIONS.json'))
        assert same(json.loads(json.dumps(score(pred, load('outcomes.json')))), load('RESULTS.json'))
        print('PASS check')
