"""EXTENSION_PLAN.md + NATIVE_PLAN.md implementation. Python standard library only; no network.

python -I -X utf8 extension.py freeze   potato-trained parameters from Gourineni only -> PARAMS.json + FREEZE_RECEIPT.json (refuses overwrite)
python -I -X utf8 extension.py run      cookie extension + native scone test -> RESULTS.json, EXECUTION.json
python -I -X utf8 extension.py --check  recompute everything, compare with stored files, append the check to EXECUTION.json

Inputs: facts.json (this folder); ../opus/inputs.json, outcomes.json, FORECASTS.json (frozen primary files, read only, hashed).
Scoring: |ln(pred/obs)| for ratios; absolute error in pmol*min/L for native levels. Nothing is pooled across studies.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, math, platform, sys

HERE = Path(__file__).resolve().parent
OPUS = HERE.parent / 'opus'
FROZEN_OPUS = ('inputs.json', 'outcomes.json', 'FORECASTS.json', 'FREEZE_RECEIPT.json', 'RESULTS.json', 'RESULT.md', 'rs_transfer.py')


def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def strict(x): return json.loads(json.dumps(x, allow_nan=False))
def dump(name, x): (HERE / name).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
def ale(pred, obs): return abs(math.log(pred / obs))
def now(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log_se_scenarios(cv_a, cv_b):
    """Marginal SE of ln(mean_a/mean_b) from two CVs of the means, over the unknown correlation rho."""
    return {'rho_plus1': abs(cv_a - cv_b), 'rho_0': math.hypot(cv_a, cv_b), 'rho_minus1': cv_a + cv_b}


# ---------------------------------------------------------------- freeze: potato-trained parameters (Gourineni only)
def potato_params():
    I, O = load(OPUS / 'inputs.json'), load(OPUS / 'outcomes.json')
    arms = I['target']['arms']; c = arms['control']; ins = O['endpoints']['venous_insulin_iAUC_0_120']['arms']
    resid, dens = {}, {}
    for a in ('medium', 'high'):
        obs = ins[a][0] / ins['control'][0]
        Dr = arms[a]['available_cho_g'] / c['available_cho_g']
        resid[a] = math.log(obs / Dr)                                    # log residual after the available-CHO ratio
        dens[a] = arms[a]['dietary_fiber_RS_g'] / arms[a]['available_cho_g'] - c['dietary_fiber_RS_g'] / c['available_cho_g']
    log_generic = (resid['medium'] + resid['high']) / 2                   # equal weight
    slope = sum(resid[a] * dens[a] for a in resid) / sum(dens[a] ** 2 for a in dens)   # LS through zero
    return {'training': 'Gourineni 2020 Table 1 + Table 4 venous insulin iAUC 0-120 (two control contrasts, equal weight)',
            'status': 'outcome-informed model development (target outcomes were used); not validated',
            'log_residuals': resid, 'fiber_density_differences': dens,
            'log_generic': log_generic, 'generic_factor': math.exp(log_generic), 'density_slope': slope,
            'training_fit_residuals': {a: resid[a] - slope * dens[a] for a in resid},
            'training_density_support_max': max(dens.values())}


def wheat_params():
    F = load(OPUS / 'FORECASTS.json')
    return {'source': '../opus/FORECASTS.json (frozen 2026-11-05T04:14:06Z)', 'generic_factor': F['raw_donor_reference'],
            'density_slope': F['k_per_fiber_density'], 'training_density_support_max': F['support']['medium']['donor_difference'],
            'donor_log_se_ratio': F['donor_log_se_ratio']}


# ---------------------------------------------------------------- extension: Stewart 2017 cookie (and Du, unavailable)
def extension(P, W, facts):
    ck = facts['cookie']; t1 = ck['table1_per_serving_as_eaten']; c, f = t1['control'], t1['fiber']; ins = ck['insulin_iAUC_0_120']
    Dr = f['available_cho_g'] / c['available_cho_g']
    dens = f['fiber_g'] / f['available_cho_g'] - c['fiber_g'] / c['available_cho_g']
    pred = {'equality': 1.0, 'available_cho': Dr,
            'wheat_generic': Dr * W['generic_factor'], 'potato_generic': Dr * P['generic_factor'],
            'wheat_graded': Dr * math.exp(W['density_slope'] * dens), 'potato_graded': Dr * math.exp(P['density_slope'] * dens)}
    obs = ins['fiber'][0] / ins['control'][0]
    cv = {a: ins[a][1] / math.sqrt(ins['n'][a]) / ins[a][0] for a in ('control', 'fiber')}   # SD -> SE of mean, unequal n
    se = log_se_scenarios(cv['fiber'], cv['control'])
    err = {m: ale(p, obs) for m, p in pred.items()}
    order = sorted(err, key=err.get)
    # challenge: any attenuating multiplier f <= 1 on the D ratio
    needed = obs / Dr
    challenge = {
        'D_ratio': Dr, 'observed_ratio': obs, 'multiplier_needed_on_D_ratio': needed,
        'statement': 'pred = D_ratio * m with m <= 1 gives pred <= D_ratio < observed, so its error is at least that of D alone; '
                     'every fibre-attenuation model (generic or graded, wheat or potato) is therefore structurally worse than D on this cookie',
        'min_error_any_attenuating_model': ale(Dr, obs),
        'observed_ratio_scenario_95pct_marginal': {k: [obs * math.exp(-1.96 * s), obs * math.exp(1.96 * s)] for k, s in se.items()},
        'D_ratio_below_lower_scenario_limit': {k: Dr < obs * math.exp(-1.96 * s) for k, s in se.items()},
        'exposed_development_comparators_not_scored_as_validation': {
            'printed_kcal_ratio': f['kcal'] / c['kcal'],
            'energy_proxy_ratio_4D_4P_9fat': energy(f) / energy(c),
            'D_plus_P_ratio': (f['available_cho_g'] + f['protein_g']) / (c['available_cho_g'] + c['protein_g'])},
    }
    challenge['exposed_development_comparator_abs_log_error'] = {k: ale(v, obs) for k, v in challenge['exposed_development_comparators_not_scored_as_validation'].items()}
    return {
        'du_baked_bars': {'status': 'UNAVAILABLE', 'reason': facts['du']['reason'], 'verdict': None},
        'stewart_cookie': {
            'exposure': 'Table 3 numbers were read (by the coordinator and by this implementation) before this run; the cookie is exposed, not untouched validation',
            'serving_dose_fibre_ingredient_kept_separate': {
                'serving_g': [c['weight_g'], f['weight_g']], 'reported_dietary_fiber_g': [c['fiber_g'], f['fiber_g']],
                'ingredient_VERSAFIBE1490_g': [0, 25], 'ingredient_nominal_TDF_g_at_90pct': [0, 22.5],
                'available_cho_g': [c['available_cho_g'], f['available_cho_g']], 'total_cho_g': [c['total_cho_g'], f['total_cho_g']]},
            'fiber_density_difference': dens,
            'support': {'potato_training_max': P['training_density_support_max'], 'multiple_of_potato': dens / P['training_density_support_max'],
                        'wheat_donor': W['training_density_support_max'], 'multiple_of_wheat': dens / W['training_density_support_max'],
                        'extrapolated': True},
            'predicted_ratio': pred, 'observed_ratio': obs,
            'observed': {'operator': ins['operator'], 'matrix': ins['matrix_assay'], 'stat': ins['stat'], 'n': ins['n'],
                         'cv_of_mean': cv, 'marginal_log_se_ratio_scenarios': se,
                         'caution': 'unequal n (27/25) with crossover attrition; paired covariance and the paired subset are not reported; '
                                    'SD suggests skew (analysis was on square-root scale); arithmetic means used'},
            'abs_log_error_primary': err, 'central_order_best_to_worst': order,
            'tie_observed_ratio_vs_available_cho': {m: math.sqrt(pred['available_cho'] * p) for m, p in pred.items() if m != 'available_cho'},
            'tie_note': 'observed ratio at which a model and available_cho would have equal abs log error (geometric mean of the two forecasts); '
                        'compare with the observed-ratio scenarios, not as an interval on error differences',
            'secondary_high_over_low': None,
            'attenuation_challenge': challenge}}


# ---------------------------------------------------------------- native: cookie-anchored scone forecasts
def energy(a): return 4 * a['available_cho_g'] + 4 * a['protein_g'] + 9 * a['fat_g']


SCORES = {'constant': lambda a: 1.0,
          'D': lambda a: a['available_cho_g'],
          'D_plus_P': lambda a: a['available_cho_g'] + a['protein_g'],
          'energy_proxy_4D_4P_9fat': energy,
          'printed_kcal': lambda a: a.get('kcal')}


def native(facts, anchor_name, anchor_comp, anchor_area_min, anchor_cv, unit_basis):
    sc = facts['scone']; t1 = sc['table1_per_serving_as_eaten']; ins = sc['insulin_iAUC_0_120']
    obs = {a: ins[a][0] for a in ('control', 'fiber')}
    obs_ratio = obs['fiber'] / obs['control']; obs_dec = obs['control'] - obs['fiber']
    out = {}
    for m, s in SCORES.items():
        s0 = s(anchor_comp)
        if s0 is None or s(t1['control']) is None:
            out[m] = {'status': 'UNAVAILABLE', 'reason': 'anchor food has no printed kcal' if s0 is None else 'target has no printed kcal'}
            continue
        pr = {a: anchor_area_min * s(t1[a]) / s0 for a in ('control', 'fiber')}
        e = {a: abs(pr[a] - obs[a]) for a in pr}
        band = [math.exp(-1.96 * anchor_cv), math.exp(1.96 * anchor_cv)]
        out[m] = {'anchor_score': s0, 'target_scores': {a: s(t1[a]) for a in pr},
                  'predicted_pmol_min_L': pr, 'abs_error': e, 'MAE_two_arm_primary': (e['control'] + e['fiber']) / 2,
                  'signed_error': {a: pr[a] - obs[a] for a in pr},
                  'predicted_decrement': pr['control'] - pr['fiber'], 'decrement_error': (pr['control'] - pr['fiber']) - obs_dec,
                  'predicted_ratio': pr['fiber'] / pr['control'], 'ratio_abs_log_error_comparative': ale(pr['fiber'] / pr['control'], obs_ratio),
                  'anchor_mean_scale_band_95pct_marginal': {a: [pr[a] * band[0], pr[a] * band[1]] for a in pr}}
    avail = [m for m in out if 'MAE_two_arm_primary' in out[m]]
    best_ratio = min(avail, key=lambda m: out[m]['ratio_abs_log_error_comparative'])
    for m in avail:
        if m != best_ratio:
            out[m]['tie_observed_ratio_vs_best_ratio_model'] = math.sqrt(out[m]['predicted_ratio'] * out[best_ratio]['predicted_ratio'])
    return {'anchor': anchor_name, 'anchor_area_pmol_min_L': anchor_area_min, 'anchor_cv_of_mean': anchor_cv, 'unit_basis': unit_basis,
            'observed': {'pmol_min_L': obs, 'sem': {a: ins[a][1] for a in obs}, 'ratio': obs_ratio, 'decrement': obs_dec,
                         'ratio_marginal_log_se_scenarios': log_se_scenarios(ins['fiber'][1] / obs['fiber'], ins['control'][1] / obs['control'])},
            'models': out,
            'central_order_primary_MAE': sorted(avail, key=lambda m: out[m]['MAE_two_arm_primary']),
            'central_order_comparative_ratio': sorted(avail, key=lambda m: out[m]['ratio_abs_log_error_comparative'])}


def label_accounting(facts):
    rows = {}
    for food in ('cookie', 'scone'):
        for arm, a in facts[food]['table1_per_serving_as_eaten'].items():
            rows[f'{food}_{arm}'] = {'printed_kcal': a['kcal'], 'proxy_4D_4P_9fat': energy(a), 'printed_minus_proxy': a['kcal'] - energy(a),
                                     'fiber_g': a['fiber_g']}
    return {'rows': rows,
            'cookie_control_printed_over_proxy': facts['cookie']['table1_per_serving_as_eaten']['control']['kcal'] / energy(facts['cookie']['table1_per_serving_as_eaten']['control']),
            'note': 'scone kcal are Atwater values from the same label inputs (printed = proxy to rounding); cookie kcal method is not stated and exceeds the proxy, '
                    'so the same scone score yields native levels differing by the cookie control printed/proxy factor'}


def unit_check(facts):
    ins = facts['cookie']['insulin_iAUC_0_120']; a = ins['control'][0]; cmax = ins['Cmax_0_120']['control'][0]
    return {'printed_label': ins['unit_printed'],
            'if_pmol_h_L_mean_increment_pmol_L': a * 60 / 120, 'if_pmol_min_L_mean_increment_pmol_L': a / 120, 'control_Cmax_pmol_L': cmax,
            'reading': 'conversion x60 follows the printed time unit h; it is conditional because the same table prints Cmax with *h. '
                       'Under a minute reading the 0-120 mean increment would be about 1.9 pmol/L despite a 280 pmol/L mean Cmax and significant '
                       'arm differences at 45-120 min, so that reading is implausible but not excluded by source text'}


# ---------------------------------------------------------------- orchestration
def compute():
    facts = load(HERE / 'facts.json'); P = strict(potato_params()); W = strict(wheat_params())
    ck = facts['cookie']; ck_ins = ck['insulin_iAUC_0_120']; ck_c = ck['table1_per_serving_as_eaten']['control']
    I, O = load(OPUS / 'inputs.json'), load(OPUS / 'outcomes.json')
    g_c = dict(I['target']['arms']['control']); g_c['kcal'] = facts['gourineni_anchor_notes']['printed_kcal']
    g_area, g_sem = O['endpoints']['venous_insulin_iAUC_0_120']['arms']['control']
    cookie_anchor = native(facts, 'Stewart 2017 control cookie (development scale; sole primary anchor)', ck_c, ck_ins['control'][0] * 60,
                           ck_ins['control'][1] / math.sqrt(ck_ins['n']['control']) / ck_ins['control'][0],
                           'CONDITIONAL: printed pmol/L*h x 60 -> pmol*min/L')
    gour_anchor = native(facts, 'Gourineni 2020 control cold-pressed bar (cross-recipe stress, not primary)', g_c, g_area, g_sem / g_area,
                         'source-based: printed min*pmol/L')
    return strict({
        'plans': ['../EXTENSION_PLAN.md', '../NATIVE_PLAN.md'],
        'frozen_primary_files_sha256': {n: sha(OPUS / n) for n in FROZEN_OPUS},
        'facts_sha256': sha(HERE / 'facts.json'),
        'params': {'potato_trained': P, 'wheat_trained': W},
        'extension': extension(P, W, facts),
        'native': {'primary_cookie_anchor': cookie_anchor, 'stress_gourineni_anchor': gour_anchor,
                   'cookie_unit_check': unit_check(facts), 'label_accounting': label_accounting(facts),
                   'scone_0_180': {'status': 'reported only; different operator window; not predicted', 'values': facts['scone']['insulin_iAUC_0_120']['iAUC_0_180_separate_operator']},
                   'claim': 'No new validated native claim follows from one favourable meal ratio; scone is one sequential exposed-development test'}})


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else '--check'
    if cmd == 'freeze':
        if (HERE / 'PARAMS.json').exists(): sys.exit('already frozen')
        P = strict(potato_params()); dump('PARAMS.json', P)
        dump('FREEZE_RECEIPT.json', {'frozen_utc': now(), 'PARAMS.json_sha256': sha(HERE / 'PARAMS.json'),
                                     'exposure': 'Gourineni outcomes used for training (outcome-informed). Stewart 2017 cookie Table 1/3 and '
                                                 'Stewart 2018 scone Table 1/3 were already read by this implementer before freezing; Du numeric data unavailable.'})
        print(json.dumps(P, indent=1))
    elif cmd == 'run':
        R = compute(); assert R['params']['potato_trained'] == load(HERE / 'PARAMS.json'), 'params differ from freeze'
        dump('RESULTS.json', R)
        E = load(HERE / 'EXECUTION.json') if (HERE / 'EXECUTION.json').exists() else {'freeze': load(HERE / 'FREEZE_RECEIPT.json'), 'runs': [], 'checks': []}
        E['runs'].append({'utc': now(), 'command': 'python -I -X utf8 extension.py run', 'python': platform.python_version(),
                          'platform': platform.platform(), 'RESULTS.json_sha256': sha(HERE / 'RESULTS.json'), 'PARAMS.json_sha256': sha(HERE / 'PARAMS.json')})
        dump('EXECUTION.json', E)
        print('wrote RESULTS.json')
    elif cmd == '--check':
        R = compute()
        assert R['params']['potato_trained'] == load(HERE / 'PARAMS.json'), 'params differ'
        assert load(HERE / 'FREEZE_RECEIPT.json')['PARAMS.json_sha256'] == sha(HERE / 'PARAMS.json'), 'freeze receipt hash differs'
        assert R == load(HERE / 'RESULTS.json'), 'results differ'
        E = load(HERE / 'EXECUTION.json')
        E['checks'].append({'utc': now(), 'command': 'python -I -X utf8 extension.py --check', 'python': platform.python_version(), 'result': 'PASS'})
        dump('EXECUTION.json', E); print('PASS check')
    else:
        sys.exit(__doc__)
