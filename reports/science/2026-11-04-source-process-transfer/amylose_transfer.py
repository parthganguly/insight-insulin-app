"""v2 outcome-exposed transfer audit: EMPIRICAL barley-trained amylose partial-contribution model (Granfeldt 1994 covered
barley pairs only) transported unchanged to Belobrajdic 2019 wheat breads; conditional native-area admissibility against
participant-positive outer bounds; Hoebler 1999 and Costabile 2023 coverage. No coefficient is chosen on any target.
Standard library only; deterministic. Independent of model.py (Bornet exponent recomputed from training.json and
cross-checked against model.py read-only).

python -I -X utf8 amylose_transfer.py           write amylose_transfer_results.json
python -I -X utf8 amylose_transfer.py --check
"""
from pathlib import Path
import csv, json, math, runpy, sys

ROOT = Path(__file__).resolve().parent
def read(n): return json.loads((ROOT / n).read_text(encoding='utf-8-sig'))
SOL_LOWER = {'HAW-R/LAW-R': 0.3736559, 'HAW-W/LAW-W': 0.3803384}   # supplied by coordinator: Sol's independent lower-bound readings
NEAR = 0.02  # declared qualification band (log units) for "near a boundary"; descriptive, not a tolerance for acceptance


def lin(A, t): return 1 - (1 - t) * A
def pw(A, b): return (1 - A) ** b


def bornet_heated_b(tr):
    pts = [(math.log1p(-r['amylose_pct'] / 100), math.log(r['area180'])) for r in tr['Bornet']['gel']]
    mx = sum(p[0] for p in pts) / 3; my = sum(p[1] for p in pts) / 3
    return sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x, _ in pts)


def barley(tr):
    b = tr['barley']; out = {}
    for f in ('kernel', 'flour'):
        h, n = b[f'high_{f}'], b[f'normal_{f}']
        out[f] = dict(ratio=h['mean_120'] / n['mean_120'], Ah=h['amylose_pct'] / 100, An=n['amylose_pct'] / 100, cvh=h['sem_120'] / h['mean_120'], cvn=n['sem_120'] / n['mean_120'])
    return out


def solve_theta(r, Ah, An): return 1 - (1 - r) / (Ah - r * An)


def fit_theta(P):
    loss = lambda t: sum((math.log(lin(p['Ah'], t) / lin(p['An'], t)) - math.log(p['ratio'])) ** 2 for p in P)
    lo, hi, g = 0.0, 1.0, (math.sqrt(5) - 1) / 2
    for _ in range(200):
        a, c = hi - g * (hi - lo), lo + g * (hi - lo)
        lo, hi = (lo, c) if loss(a) < loss(c) else (a, hi)
    return (lo + hi) / 2


def identification(P):
    out = {}
    for k, p in P.items():
        r0, rinf = lin(p['Ah'], 0) / lin(p['An'], 0), p['Ah'] / p['An']
        out[k] = {'ratio_at_theta0': r0, 'ratio_limit_theta_inf': rinf}
        for lab, s in (('rho_plus1', abs(p['cvh'] - p['cvn'])), ('rho_0', math.hypot(p['cvh'], p['cvn'])), ('rho_minus1', p['cvh'] + p['cvn'])):
            lo, hi = p['ratio'] * math.exp(-1.96 * s), p['ratio'] * math.exp(1.96 * s)
            out[k][lab] = dict(log_se=s, theta_band_sensitivity_range=[0.0 if lo <= r0 else solve_theta(lo, p['Ah'], p['An']),
                                                                         'unbounded' if hi >= rinf else solve_theta(hi, p['Ah'], p['An'])],
                               includes_0=lo <= r0 <= hi, includes_1=lo <= 1 <= hi)
    return out


def run():
    tr, wi, wr, pos, hb = read('training.json'), read('wheat_inputs.json'), read('wheat_results.json'), read('positive_results.json'), read('hoebler_inputs.json')
    bb = bornet_heated_b(tr); bb_model = runpy.run_path(str(ROOT / 'model.py'))['coefficients']()['gel']['exponent']
    P = barley(tr)
    theta = {'joint': fit_theta(list(P.values())), 'kernel_donor': solve_theta(P['kernel']['ratio'], P['kernel']['Ah'], P['kernel']['An']),
             'flour_donor': solve_theta(P['flour']['ratio'], P['flour']['Ah'], P['flour']['An'])}
    xs = [math.log((1 - p['Ah']) / (1 - p['An'])) for p in P.values()]; ys = [math.log(p['ratio']) for p in P.values()]
    bpow = sum(a * c for a, c in zip(xs, ys)) / sum(a * a for a in xs)

    s = wi['serving_g'] / 100; A = {k: a['amylose_fraction'] for k, a in wi['arms'].items()}
    dose = {k: {'total': a['Starch'] * s, 'available': (a['Starch'] - a['Resistant starch']) * s} for k, a in wi['arms'].items()}
    def score(k, model):
        if model == 'equality': return 1.0
        if model in ('total', 'available'): return dose[k][model]
        if model == 'bornet_heated_exact_x_total': return dose[k]['total'] * pw(A[k], bb)
        kind, name, basis = model.split(':')
        f = lin(A[k], theta[name]) if kind == 'empirical_barley_theta' else pw(A[k], bpow)
        return dose[k][basis] * f
    models = ['equality', 'total', 'available', 'bornet_heated_exact_x_total'] + \
             [f'empirical_barley_theta:{n}:{b}' for n in theta for b in ('total', 'available')] + [f'empirical_barley_power:joint:{b}' for b in ('total', 'available')]
    area = wr['signed_arm_areas_pg_min_per_mL']; pairs = {}
    for name, (a, b) in {'HAW-R/LAW-R': ('HAW-R', 'LAW-R'), 'HAW-W/LAW-W': ('HAW-W', 'LAW-W')}.items():
        pred = {m: score(a, m) / score(b, m) for m in models}
        obs = {w: area[a][w] / area[b][w] for w in ('120', '180')}
        env = pos['ratio_bounds'][name]['ratio_envelope']; wrd = pos['ratio_bounds'][name]['with_reading']; sol = SOL_LOWER[name]
        adm = {}
        for m, v in pred.items():
            lows = {'envelope_no_reading': env[0], 'coordinator_with_reading': wrd[0], 'sol_lower_reading': sol}
            adm[m] = dict(pred=v, inside_envelope_no_reading=env[0] <= v <= env[1], inside_coordinator_with_reading=wrd[0] <= v <= wrd[1],
                          above_sol_lower=v >= sol, log_margin_to_lower={k: math.log(v / x) for k, x in lows.items()},
                          near_a_lower_boundary=any(abs(math.log(v / x)) < NEAR for x in lows.values()),
                          abs_log_error_signed={w: abs(math.log(v / o)) for w, o in obs.items()})
        diffs = {f: [wi['arms'][a][f], wi['arms'][b][f]] for f in ('amylose_fraction', 'Starch', 'Resistant starch', 'Fiber', 'Protein', 'Moisture', 'Sugars')}
        # target-implied theta, DIAGNOSTIC ONLY (exposed outcome; not population inference; not a coefficient)
        implied = {basis: {w: solve_theta(obs[w] / (dose[a][basis] / dose[b][basis]), A[a], A[b]) for w in obs} for basis in ('total', 'available')}
        def theta_min(basis, lower):  # forecast increases with theta; smallest theta in fit domain [0,1] whose forecast >= lower
            g = lambda t: dose[a][basis] / dose[b][basis] * lin(A[a], t) / lin(A[b], t)
            if g(0) >= lower: return 0.0
            if g(1) < lower: return None
            lo, hi = 0.0, 1.0
            for _ in range(100):
                mid = (lo + hi) / 2; lo, hi = (lo, mid) if g(mid) >= lower else (mid, hi)
            return hi
        pairs[name] = dict(input_differences=diffs, observed_signed_group=obs, graph_reading_bounds=wr['pairs'][name]['graph_reading_bounds'],
                           participant_positive_outer_bounds=dict(envelope_no_reading=env, coordinator_with_reading=wrd, sol_lower_reading=sol),
                           admissibility=adm, target_implied_theta_DIAGNOSTIC=implied,
                           theta_admissibility_threshold_in_fit_domain_DIAGNOSTIC={b: {k: theta_min(b, x) for k, x in
                               (('envelope_no_reading', env[0]), ('coordinator_with_reading', wrd[0]), ('sol_lower_reading', sol))} for b in ('total', 'available')})
    primary = {m: sum(pairs[n]['admissibility'][m]['abs_log_error_signed']['120'] for n in pairs) / 2 for m in models}
    tm = wi['table3_marginals']; mo = tm['HAW'][0] / tm['LAW'][0]
    marg = {m: (score('HAW-R', m) + score('HAW-W', m)) / (score('LAW-R', m) + score('LAW-W', m)) if m != 'equality' else 1.0 for m in models}

    H = hb['arms']; ho = {'HAWB/WWB': H['HAWB']['signed120'] / H['WWB']['signed120'], 'SP/WWB': H['SP']['signed120'] / H['WWB']['signed120'],
                          'HAWB/SP': H['HAWB']['signed120'] / H['SP']['signed120']}
    hd = {'total_starch': {'HAWB/WWB': H['HAWB']['total_starch'] / H['WWB']['total_starch'], 'SP/WWB': H['SP']['total_starch'] / H['WWB']['total_starch'],
                           'HAWB/SP': H['HAWB']['total_starch'] / H['SP']['total_starch']},
          'available_starch': {'HAWB/WWB': H['HAWB']['available'] / H['WWB']['available'], 'SP/WWB': H['SP']['available'] / H['WWB']['available'],
                               'HAWB/SP': H['HAWB']['available'] / H['SP']['available']}}
    hoebler = dict(observed_signed120_group=ho, dose_only=hd,
                   dose_only_abs_log_error={b: {k: abs(math.log(v / ho[k])) for k, v in d.items()} for b, d in hd.items()},
                   amylose_coverage={'HAWB/WWB': 'ABSTAIN: HAWB amylose fraction not established', 'HAWB/SP': 'ABSTAIN',
                                     'SP/WWB': ('strict amylose model UNAVAILABLE: WWB bread wheat vs spaghetti durum wheat, neither amylose fraction established; '
                                                'a cancelled factor is only a conditional equal-fraction sensitivity, identical to the dose rule')},
                   note='II normalized indices not used as native ratios; available > total for spaghetti (95 vs 91) retained as printed.')
    with (ROOT / 'independent_first_breakfast.csv').open(encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    costabile = dict(rows=rows, coverage=dict(dose_available_carbohydrate='AVAILABLE (meal available CHO ratio = 1 for all pairs)',
                                              starch_minus_RS='UNAVAILABLE (total starch per serving missing; resistant starch is reported)',
                                              amylose_adjustment='UNAVAILABLE (flour substitution %, molecular amylose not verified)'),
                     equal_CHO_abs_log_error_signed120={r['comparison']: abs(math.log(float(r['first_meal_signed_120_ratio']))) for r in rows},
                     note='Only the available-carbohydrate dose (=1) supplies predictions; the frozen starch-RS comparator and every amylose model abstain.')
    return dict(status='v2 outcome-exposed transfer audit; EMPIRICAL barley-trained amylose model; no target fit; bounds/implied theta are diagnostics only',
                training=dict(barley_pairs=P, theta=theta, theta_fit_domain=[0.0, 1.0], empirical_barley_power_b=bpow,
                              bornet_heated_b_exact=bb, bornet_b_matches_model_py=math.isclose(bb, bb_model, rel_tol=1e-12),
                              identification_sensitivity_range_theta_ge_0=identification(P),
                              dof='1 parameter from 2 within-form barley pairs (kernel n=10, flour n=9); amylose support 0.33-0.42'),
                accounting=('total basis: amylose fraction as the only accessibility descriptor (ignores measured RS). subtracted basis: the barley potentially available starch method '
                            'is not established as equivalent to wheat total starch less RS. Applying TOTAL-starch amylose fraction to this pool is not '
                            'established, and may count the RS/amylose accessibility difference twice. Neither basis is preferred.'),
                distinguishes=('High vs low pairs co-vary amylose (0.24 vs 0.743), total starch, RS, fibre, protein, moisture and sugars, with the same amylose '
                               'contrast in both milling strata: the trial cannot separate amylose from RS or dose. Milling pairs hold amylose fixed (amylose terms cancel).'),
                wheat=dict(dose=dose, pairs=pairs, primary_signed120_mean_high_low=primary,
                           table3_marginal=dict(observed=mo, pred=marg, abs_log_error={m: abs(math.log(v / mo)) for m, v in marg.items()})),
                hoebler=hoebler, costabile_2023_first_breakfast=costabile)


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'amylose_transfer_results.json'
    if '--check' in sys.argv:
        assert json.dumps(r, sort_keys=True) == json.dumps(json.loads(p.read_text(encoding='utf-8')), sort_keys=True); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, sort_keys=True, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    t = r['training']; print('theta', {k: round(v, 4) for k, v in t['theta'].items()}, 'pow', round(t['empirical_barley_power_b'], 4), 'bornet', t['bornet_heated_b_exact'], t['bornet_b_matches_model_py'])
    for n, v in r['wheat']['pairs'].items():
        print('==', n, 'obs', {w: round(x, 4) for w, x in v['observed_signed_group'].items()}, v['participant_positive_outer_bounds'])
        for m, a in v['admissibility'].items():
            print(f"  {m:42s} {a['pred']:.4f} env {a['inside_envelope_no_reading']!s:5} coordR {a['inside_coordinator_with_reading']!s:5} >sol {a['above_sol_lower']!s:5} near {a['near_a_lower_boundary']!s:5} "
                  f"margins {{{', '.join(f'{k[:5]}:{x:+.4f}' for k, x in a['log_margin_to_lower'].items())}}} err120 {a['abs_log_error_signed']['120']:.3f}")
        print('  implied', {b: {w: round(x, 3) for w, x in d.items()} for b, d in v['target_implied_theta_DIAGNOSTIC'].items()})
        print('  theta_min', v['theta_admissibility_threshold_in_fit_domain_DIAGNOSTIC'])
    print('primary', {m: round(e, 3) for m, e in sorted(r['wheat']['primary_signed120_mean_high_low'].items(), key=lambda kv: kv[1])})
    print('hoebler', {b: {k: round(x, 3) for k, x in d.items()} for b, d in r['hoebler']['dose_only_abs_log_error'].items()}, {k: round(x, 3) for k, x in r['hoebler']['observed_signed120_group'].items()})
    print('costabile', {k: round(x, 3) for k, x in r['costabile_2023_first_breakfast']['equal_CHO_abs_log_error_signed120'].items()})
