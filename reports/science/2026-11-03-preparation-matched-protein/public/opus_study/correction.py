"""O2 estimand correction. Reuses the unchanged v1 bridge.py predict() (read-only via runpy) and readings.json.

python -I -X utf8 correction.py           write corrected.json
python -I -X utf8 correction.py --check   recompute and compare; also verify v1 files against EXECUTION.json hashes
"""
from pathlib import Path
import hashlib, json, math, runpy, sys

ROOT = Path(__file__).resolve().parent
V1 = runpy.run_path(str(ROOT / 'bridge.py'))  # __main__ guard: nothing executes
predict, RULES, S, DOSES = V1['predict'], V1['RULES'], V1['S'], V1['DOSES']
OTHER_S = V1['OTHER_S']

# Measured cells each rule uses for a target (s, f, d) with anchor d0; 'opp' = opposite form, same cohort.
USES = {'bridge_same_source': ['target@d0', 'opp@d0', 'opp@d'], 'no_change': ['target@d0'], 'proportional_dose': ['target@d0'],
        'no_form_adjustment': ['opp@d'], 'bridge_cross_source': ['target@d0', 'other_cohort_same_form@d0', 'other_cohort_same_form@d']}


def err(p, o): return abs(math.log(p / o))


def run():
    rd = json.loads((ROOT / 'readings.json').read_text(encoding='utf-8'))
    R = rd['total_insulin_AUC']
    out = {}
    for anchor, d0 in [('primary_calibrate_0.3', '0.3'), ('S1_calibrate_0.6', '0.6')]:
        cells, acc = {}, {m: {r: [] for r in RULES} for m in ['reciprocal', 'anchored_pred_intact_vs_measured_hydro', 'anchored_measured_intact_vs_pred_hydro']}
        for s in S:
            for d in [x for x in DOSES if x != d0]:
                RI, RH = R[s]['intact'][d], R[s]['hydro'][d]
                obs = RI / RH
                pI, pH = predict(R, s, 'intact', d, d0), predict(R, s, 'hydro', d, d0)
                row = {}
                for r in RULES:
                    rec = pI[r] / pH[r]; a1 = pI[r] / RH; a2 = RI / pH[r]
                    row[r] = dict(pred_intact=pI[r], pred_hydro=pH[r], measured_cells_used=USES[r],
                                  uses_measured_opposite_form_at_target_dose='opp@d' in USES[r],
                                  reciprocal_ratio=rec, reciprocal_error=err(rec, obs),
                                  anchored_pred_intact_over_measured_hydro=a1, anchored_A_error=err(a1, obs),
                                  anchored_measured_intact_over_pred_hydro=a2, anchored_B_error=err(a2, obs))
                    acc['reciprocal'][r].append(err(rec, obs)); acc['anchored_pred_intact_vs_measured_hydro'][r].append(err(a1, obs))
                    acc['anchored_measured_intact_vs_pred_hydro'][r].append(err(a2, obs))
                cells[f'{s}_{d}'] = dict(observed_intact=RI, observed_hydro=RH, observed_ratio_intact_over_hydro=obs,
                                         observed_ratio_hydro_over_intact=1 / obs, models=row)
        out[anchor] = dict(cells=cells, mean_abs_log_error={m: {r: sum(v) / len(v) for r, v in x.items()} for m, x in acc.items()})
    v1 = json.loads((ROOT / 'RESULTS.json').read_text(encoding='utf-8'))
    return dict(
        status='O2 correction; O1 unchanged (copied below from v1 RESULTS.json for reference); graph-reading point values, no CI',
        provenance=dict(levels='readings.json: vector digitization of thesis Figure 3.1A/B (digitize.py)', units=rd['units'],
                        note='Native figure units as printed; no conversion and no claim that the label denotes a clean minute scale.'),
        v1_O2_estimand_audit={'bridge_same_source': 'anchored (equals R_I(d0)/R_H(d0) in either anchored direction)',
                              'proportional_dose': 'reciprocal (both forms predicted) -- inconsistent with the other v1 entries',
                              'no_change': 'anchored A (pred intact over measured hydro)', 'no_form_adjustment': 'anchored (=1)',
                              'bridge_cross_source': 'absent in v1 O2'},
        error_orientation='|ln(pred/obs)| is identical for intact/hydro and hydro/intact orientation.',
        corrected=out, v1_O1_mean={k: v['O1_mean'] for k, v in v1['results'].items()})


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, json.loads((ROOT / 'corrected.json').read_text(encoding='utf-8')))
        ex = json.loads((ROOT / 'EXECUTION.json').read_text(encoding='utf-8'))['sha256']
        assert all(hashlib.sha256((ROOT / f).read_bytes()).hexdigest() == h for f, h in ex.items()), 'v1 file changed'
        print('PASS check (corrected.json reproduced; all v1 files match EXECUTION.json hashes)'); sys.exit()
    (ROOT / 'corrected.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    for a, v in r['corrected'].items():
        print('==', a)
        for m, x in v['mean_abs_log_error'].items(): print('  ', m, {k: round(y, 4) for k, y in x.items()})
        for c, w in v['cells'].items():
            print('   ', c, 'obs', round(w['observed_ratio_intact_over_hydro'], 4),
                  {k: (round(z['reciprocal_ratio'], 3), round(z['anchored_pred_intact_over_measured_hydro'], 3), round(z['anchored_measured_intact_over_pred_hydro'], 3)) for k, z in w['models'].items()})
