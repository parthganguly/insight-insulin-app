"""Wheat RS4 bar (Al-Tamimi 2010) -> potato RS4 bars (Gourineni 2020) transfer per ../PLAN.md. Standard library only.

python -I -X utf8 rs_transfer.py freeze   write FORECASTS.json from inputs.json only (refuses overwrite)
python -I -X utf8 rs_transfer.py score    + outcomes.json -> RESULTS.json
python -I -X utf8 rs_transfer.py --check  recompute both and compare
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def forecasts():
    I = load('inputs.json'); d, t = I['donor'], I['target']
    da, ta = d['arms'], t['arms']
    D0, D1 = da['PWB']['available_cho_g'], da['RS4XL']['available_cho_g']
    (m0, s0), (m1, s1) = d['insulin_iAUC']['PWB'], d['insulin_iAUC']['RS4XL']
    donor_ratio = m1 / m0
    raw_ref = donor_ratio / (D1 / D0)                       # donor formulation factor beyond available-CHO dose
    dens_d = da['RS4XL']['tdf_g'] / D1 - da['PWB']['tdf_g'] / D0
    k = math.log(raw_ref) / dens_d
    cv0, cv1 = s0 / m0, s1 / m1
    donor_log_se = {'rho_plus1': abs(cv1 - cv0), 'rho_0': math.hypot(cv1, cv0), 'rho_minus1': cv1 + cv0}
    c = ta['control']; out = {}; support = {}
    for arm in ('medium', 'high'):
        a = ta[arm]; Dr = a['available_cho_g'] / c['available_cho_g']
        dens = a['dietary_fiber_RS_g'] / a['available_cho_g'] - c['dietary_fiber_RS_g'] / c['available_cho_g']
        out[arm] = {'equality': 1.0, 'available_cho': Dr, 'generic_enriched': Dr * raw_ref, 'graded_fiber_density': Dr * math.exp(k * dens)}
        # donor-uncertainty propagation (scenario band on ln raw_ref at +/-1.96 SE, rho = 0; graded scales log by dens/dens_d)
        se = donor_log_se['rho_0']
        out[arm]['generic_enriched_band_rho0'] = [Dr * raw_ref * math.exp(-1.96 * se), Dr * raw_ref * math.exp(1.96 * se)]
        out[arm]['graded_band_rho0'] = sorted([Dr * math.exp((math.log(raw_ref) + z * 1.96 * se) * dens / dens_d) for z in (-1, 1)])
        support[arm] = dict(fiber_density_difference=dens, donor_difference=dens_d, multiple_of_donor=dens / dens_d, extrapolated=dens > dens_d)
    hm = {m: out['high'][m] / out['medium'][m] for m in ('equality', 'available_cho', 'generic_enriched', 'graded_fiber_density')}
    return dict(status='Frozen before target Table 4 insulin numbers; exposure in inputs.json', donor_ratio=donor_ratio, donor_available_ratio=D1 / D0,
                raw_donor_reference=raw_ref, k_per_fiber_density=k, donor_log_se_ratio=donor_log_se, forecasts=out, high_over_medium=hm,
                support=support, notes=['generic factor cancels in high/medium; graded model extrapolates beyond donor fibre-density gap',
                                        'fibre is TDF (donor measured) vs labeling-software dietary fibre (target calculated); not verified RS chemistry',
                                        'no pure RS effect is claimed or extrapolated; forecasts are relative'])


def score(F):
    O = load('outcomes.json'); res = {}
    for ep, cell in O['endpoints'].items():
        v = cell['arms']; obs = {a: v[a][0] / v['control'][0] for a in ('medium', 'high')}; obs['high_over_medium'] = v['high'][0] / v['medium'][0]
        cv = {a: v[a][1] / v[a][0] for a in v}
        se = {k: {'rho_plus1': abs(cv[a] - cv[b]), 'rho_0': math.hypot(cv[a], cv[b]), 'rho_minus1': cv[a] + cv[b]}
              for k, (a, b) in {'medium': ('medium', 'control'), 'high': ('high', 'control'), 'high_over_medium': ('high', 'medium')}.items()}
        models = ('equality', 'available_cho', 'generic_enriched', 'graded_fiber_density')
        err = {m: {a: abs(math.log(F['forecasts'][a][m] / obs[a])) for a in ('medium', 'high')} for m in models}
        res[ep] = dict(definition=cell['definition'], locator=cell['locator'], n=cell.get('n'), observed_ratio=obs,
                       marginal_log_se_scenarios=se, abs_log_error=err,
                       primary_mean=({m: (err[m]['medium'] + err[m]['high']) / 2 for m in models} if cell.get('primary') else None),
                       high_over_medium_abs_log_error={m: abs(math.log(F['high_over_medium'][m] / obs['high_over_medium'])) for m in models},
                       inside_donor_band_rho0={a: {k: F['forecasts'][a][k][0] <= obs[a] <= F['forecasts'][a][k][1]
                                                   for k in ('generic_enriched_band_rho0', 'graded_band_rho0')} for a in ('medium', 'high')},
                       paired_evidence=cell.get('paired_evidence'))
    return dict(status='Scored after freeze; relative forecasts only; paired covariance not reconstructed', endpoints=res)


def dump(n, x): (ROOT / n).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    cmd = sys.argv[1]; F = json.loads(json.dumps(forecasts(), allow_nan=False))
    if cmd == 'freeze':
        if (ROOT / 'FORECASTS.json').exists(): sys.exit('already frozen')
        dump('FORECASTS.json', F); print(json.dumps({k: F[k] for k in ('raw_donor_reference', 'k_per_fiber_density', 'forecasts', 'high_over_medium', 'support')}, indent=1))
    elif cmd == 'score':
        assert F == load('FORECASTS.json'); R = json.loads(json.dumps(score(F), allow_nan=False)); dump('RESULTS.json', R); print(json.dumps(R, indent=1))
    elif cmd == '--check':
        assert F == load('FORECASTS.json'); assert json.loads(json.dumps(score(F), allow_nan=False)) == load('RESULTS.json'); print('PASS check')
