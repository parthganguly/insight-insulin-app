"""Wei J, Fan Z, Deng Y, Pan K, Shi R, et al. Nutrients 2026;18:973 (doi 10.3390/nu18060973): rice -> potato partial
substitution with hard- vs soft-cooked potato. Reconciled v2 development analysis (outcomes known; no fitted coefficients).
The v1 run (misattributed to "Wang") is preserved in _v1_execution/.

python -I -X utf8 wei.py                         write RESULTS.json (offline; no source file needed)
python -I -X utf8 wei.py --check                 recompute and compare
python -I -X utf8 wei.py verify PATH/cooking.xml optional volatile audit of every input literal against the source XML
"""
from pathlib import Path
import itertools, json, math, re, sys

ROOT = Path(__file__).resolve().parent
FACTS = dict(
    citation='Wei J (first author), Fan Z, Deng Y, Pan K, Shi R, et al. Nutrients 2026;18:973. doi 10.3390/nu18060973',
    design='randomized crossover; 20 healthy female students; lunch test meal after standard breakfast (Sec 2.4.1, 3.4)',
    insulin_sampling='capillary plasma, ELISA; 0,15,30,45,60,90,120 min (Sec 2.4.3)',
    endpoint='iAUC above baseline by trapezoid (Sec 2.5); HOMA-PP uses iAUCins0-120; Table 9 means +/- SEM (arithmetic)',
    preparation='HP: pressure cooker to rated pressure + 30 s hold; SP: 20 min hold; core temperatures 57.6 C (HP) vs 77.4 C (SP) (Sec 2.1/2.2)',
    table9={'RC': (23224, 2456), 'HP+R': (14517, 801), 'SP+R': (21635, 1829)},
    table3={'RC': dict(rice_cho=69.5, potato_cho=0.0, other_cho=10.0, total=79.5, energy=558.3),
            'P': dict(rice_cho=46.3, potato_cho=23.2, other_cho=10.0, total=79.5, energy=562.9)},
    table1={'potato': dict(available_cho=17.87, starch=10.0), 'rice': dict(available_cho=77.2, starch=77.2)},
    portions_raw_g={'rice_RC': 90, 'rice_P': 60, 'potato_P': 130},
    table5={'R': dict(RDS=(36.8, 3.5), SDS=(53.8, 5.3)), 'HP': dict(RDS=(9.4, 0.8), SDS=(3.4, 1.2)), 'SP': dict(RDS=(68.1, 4.6), SDS=(12.5, 3.0)),
            'HP+R_printed': dict(RDS=30.8, SDS=42.8), 'SP+R_printed': dict(RDS=43.7, SDS=44.7)},
    donor_moravek_control_GM={'rice': 10.9, 'potato': 19.9})
ASSUMPTIONS = [
    'Table 9 iAUCins window = 0-120 (inferred from insulin sampling ending at 120 and the HOMA-PP definition; table itself unlabelled)',
    'Table 5 fractions apply to the cooked starch actually eaten (1 g samples; raw vs cooked basis of percentages not detailed)',
    'Potato by-difference available CHO minus measured starch (10.2 g/serving) has unknown glycaemic/insulinaemic activity a_ns in [0,1]',
    'Common non-staple 10 g CHO (other foods, identical in all meals) has unknown activity a_bg in [0,1]; it enters numerator and denominator equally',
    'Donor-derived rules use Moravek geometric means (different operator, instant potato) and geometric interpolation x in exchange share',
    'Lentil-chain P/R = rR/rP (fixed) or (rR/rP)^2 (scaled) is a necessary consequence only if a shared lentil arm cancels across donor meals']
LITERALS = ['23,224 ± 2456', '14,517 ± 801', '21,635 ± 1829', '69.5', '46.3', '23.2', '79.5', '558.3', '562.9', '17.87', '36.8 ± 3.5', '53.8 ± 5.3',
            '9.4 ± 0.8', '3.4 ± 1.2', '68.1 ± 4.6', '12.5 ± 3.0', '30.8', '42.8', '43.7', '44.7',
            'at baseline (0 min) before each lunch and at 15, 30, 45, 60, 90, and 120 min', 'iAUC ins0–120', 'Twenty participants completed the trial',
            '30 s pressure hold', 'maintained for 20 min', '57.6 °C (HP) and 77.4 °C (SP)']


def frozen_donor():
    F = json.loads((ROOT.parent / 'model' / 'FORECASTS.json').read_text(encoding='utf-8'))['donor']
    return F['ratios_starch']['rice'], F['ratios_starch']['potato']


def starch_g():
    t1, p = FACTS['table1'], FACTS['portions_raw_g']
    return dict(rice_RC=t1['rice']['starch'] * p['rice_RC'] / 100, rice_P=t1['rice']['starch'] * p['rice_P'] / 100,
                potato=t1['potato']['starch'] * p['potato_P'] / 100, potato_if_AC_is_starch=t1['potato']['available_cho'] * p['potato_P'] / 100)


def nonstarch_g():
    return (FACTS['table1']['potato']['available_cho'] - FACTS['table1']['potato']['starch']) * FACTS['portions_raw_g']['potato_P'] / 100


def digest(frac, a_ns=0.0, a_bg=0.0, shift=None, potato_key='potato'):
    s, t5 = starch_g(), FACTS['table5']
    def fr(food):
        v = t5[food]['RDS'][0] + (shift[(food, 'RDS')] * t5[food]['RDS'][1] if shift else 0)
        if frac == 'RDS+SDS': v += t5[food]['SDS'][0] + (shift[(food, 'SDS')] * t5[food]['SDS'][1] if shift else 0)
        return v / 100
    bg = a_bg * FACTS['table3']['RC']['other_cho']; ns = a_ns * nonstarch_g()
    rc = s['rice_RC'] * fr('R') + bg
    hp = s['rice_P'] * fr('R') + s[potato_key] * fr('HP') + ns + bg
    sp = s['rice_P'] * fr('R') + s[potato_key] * fr('SP') + ns + bg
    return {'HP+R': hp / rc, 'SP+R': sp / rc}


def forecasts():
    rR, rP = frozen_donor()
    xs = FACTS['table3']['P']['potato_cho'] / FACTS['table3']['RC']['rice_cho']
    xw = FACTS['table3']['P']['potato_cho'] / FACTS['table3']['RC']['total']
    PR = FACTS['donor_moravek_control_GM']['potato'] / FACTS['donor_moravek_control_GM']['rice']
    same = lambda v: {'HP+R': v, 'SP+R': v}
    s = starch_g()
    F = {'no_change': same(1.0), 'proportional_carbohydrate': same(1.0 * FACTS['table3']['P']['total'] / FACTS['table3']['RC']['total']),
         'proportional_energy': same(FACTS['table3']['P']['energy'] / FACTS['table3']['RC']['energy']),
         'total_starch_grams': same((s['rice_P'] + s['potato']) / s['rice_RC'])}
    for k, x in (('staple', xs), ('whole_meal', xw)):
        F[f'direct_source_PR^x_{k}'] = same(PR ** x)
        F[f'lentil_chain_fixed^x_{k}'] = same((rR / rP) ** x)
        F[f'lentil_chain_scaled^x_{k}'] = same((rR / rP) ** (2 * x))
    for frac in ('RDS', 'RDS+SDS'):
        for a_ns, a_bg in itertools.product((0.0, 0.5, 1.0), repeat=2):
            F[f'digestible_{frac}_ans{a_ns}_abg{a_bg}'] = digest(frac, a_ns, a_bg)
        F[f'digestible_{frac}_potatoAC_as_starch'] = digest(frac, potato_key='potato_if_AC_is_starch')
    F['posthoc_limit_HP0_SPlikeRice_staple_AC'] = {'HP+R': FACTS['table3']['P']['rice_cho'] / FACTS['table3']['RC']['rice_cho'], 'SP+R': 1.0}
    return F, dict(x_staple=xs, x_whole_meal=xw, PR_source=PR, lentil_PR_fixed=rR / rP, lentil_PR_scaled=(rR / rP) ** 2, starch_g=s, potato_nonstarch_g=nonstarch_g())


def paired_se_range(cv_a, cv_b):
    """delta-method SE of ln(a/b) for correlation rho in [-1,1]: sqrt(ca^2+cb^2-2 rho ca cb) -> [|ca-cb|, ca+cb]; rho=0 shown for reference."""
    return dict(rho_plus1=abs(cv_a - cv_b), rho_0=math.hypot(cv_a, cv_b), rho_minus1=cv_a + cv_b)


def additive_bound(obs):
    """Response = B + beta*rice_g + P with B, beta, P >= 0 (rice scaled linearly 90 g -> 60 g): any potato meal / rice meal >= 60/90."""
    lb = FACTS['portions_raw_g']['rice_P'] / FACTS['portions_raw_g']['rice_RC']
    t9 = FACTS['table9']; out = {}
    for m in ('HP+R', 'SP+R'):
        se = paired_se_range(t9[m][1] / t9[m][0], t9['RC'][1] / t9['RC'][0])
        gap = math.log(lb) - math.log(obs[m])
        out[m] = dict(lower_bound=lb, observed=obs[m], central_violation=obs[m] < lb, log_gap_below_bound=gap,
                      gap_in_SE_units={k: gap / v for k, v in se.items()} if gap > 0 else None, paired_se_range=se)
    out['note'] = ('Central-estimate restriction only: the gap is not statistically distinguished from zero under the stated normal-theory covariance sensitivity for any correlation in [-1,1]. Response maps that are '
                   'nonlinear in rice grams, allow potato to suppress the rice response, or are not additive avoid the restriction.')
    return out


def table5_check():
    s, t5 = starch_g(), FACTS['table5']; out = {}
    for food, key in (('HP', 'HP+R_printed'), ('SP', 'SP+R_printed')):
        for c in ('RDS', 'SDS'):
            v = (t5[food][c][0] * s['potato'] + t5['R'][c][0] * s['rice_P']) / (s['potato'] + s['rice_P'])
            out[f'{key}:{c}'] = dict(calculated=v, printed=t5[key][c], matches_to_0p05=abs(v - t5[key][c]) < 0.05)
    return out


def digest_ranges():
    keys = [(f, c) for f in ('R', 'HP', 'SP') for c in ('RDS', 'SDS')]; out = {}
    for frac in ('RDS', 'RDS+SDS'):
        vals = [digest(frac, shift=dict(zip(keys, sh))) for sh in itertools.product((-1, 1), repeat=6)]
        out[frac] = {m: [min(v[m] for v in vals), max(v[m] for v in vals)] for m in ('HP+R', 'SP+R')}
        out[frac]['HP_over_SP'] = [min(v['HP+R'] / v['SP+R'] for v in vals), max(v['HP+R'] / v['SP+R'] for v in vals)]
    return out


def run():
    F, derived = forecasts()
    t9 = FACTS['table9']; obs = {m: t9[m][0] / t9['RC'][0] for m in ('HP+R', 'SP+R')}; obs['HP/SP'] = t9['HP+R'][0] / t9['SP+R'][0]
    cv = {m: t9[m][1] / t9[m][0] for m in t9}
    se = {'HP+R': paired_se_range(cv['HP+R'], cv['RC']), 'SP+R': paired_se_range(cv['SP+R'], cv['RC']), 'HP/SP': paired_se_range(cv['HP+R'], cv['SP+R'])}
    scores = {}
    for k, p in F.items():
        e = {m: abs(math.log(p[m] / obs[m])) for m in ('HP+R', 'SP+R')}
        scores[k] = dict(pred=p, abs_log_error=e, mean_ratio_to_rice_error=sum(e.values()) / 2,
                         hard_soft_separation_error=abs(math.log(p['HP+R'] / p['SP+R']) - math.log(obs['HP/SP'])), predicted_HP_over_SP=p['HP+R'] / p['SP+R'],
                         label='post hoc limiting benchmark (one limit case; not a bound on all descriptors)' if k.startswith('posthoc') else 'development forecast')
    return dict(status='v2 reconciled development analysis; outcomes known; no fitted coefficients; not pooled', facts=FACTS, assumptions=ASSUMPTIONS,
                derived=derived, table5_reproduction=table5_check(), digestible_input_ranges=digest_ranges(), observed=obs,
                uncertainty=dict(paired_se_log_ratio_range=se, note='Paired (crossover) covariance not reported; extrema over rho in [-1,1] shown; rho=0 is one scenario.'),
                additive_nonnegative_bound=additive_bound(obs), source_tests={'iAUCins_letters': {'RC': 'a', 'HP+R': 'b', 'SP+R': 'a'}, 'test': "Friedman (Table 9)"},
                scores=scores)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, (list, tuple)): return isinstance(b, (list, tuple)) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'verify':
        x = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', Path(sys.argv[2]).read_text(encoding='utf-8')))
        miss = [l for l in LITERALS if l not in x] + ([] if re.search(r'<surname>Wei</surname>\s*<given-names[^>]*>Jinjie', Path(sys.argv[2]).read_text(encoding='utf-8')) else ['first author Wei Jinjie'])
        print('PASS verify' if not miss else f'MISSING {miss}'); sys.exit(0 if not miss else 1)
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'RESULTS.json'
    if '--check' in sys.argv:
        assert same(r, json.loads(p.read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    print('obs', {k: round(v, 4) for k, v in r['observed'].items()})
    print('pairedSE', {k: {a: round(b, 4) for a, b in v.items()} for k, v in r['uncertainty']['paired_se_log_ratio_range'].items()})
    print('additive', {k: (v if isinstance(v, str) else {a: (round(b, 4) if isinstance(b, float) else b) for a, b in v.items() if a != 'paired_se_range'}) for k, v in r['additive_nonnegative_bound'].items()})
    for k, v in sorted(r['scores'].items(), key=lambda kv: kv[1]['mean_ratio_to_rice_error']):
        print(f"{k:42s} HP {v['pred']['HP+R']:.3f} SP {v['pred']['SP+R']:.3f} mean {v['mean_ratio_to_rice_error']:.3f} sep {v['hard_soft_separation_error']:.3f}")
