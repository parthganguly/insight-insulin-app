"""Frozen food-input/training-only forecasts (PLAN.md). Standard library only; no target data read.

python -I -X utf8 predict.py           write PREDICTIONS.json (refuses to overwrite)
python -I -X utf8 predict.py --check   recompute and compare
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
TRAIN = json.loads((ROOT.parent / 'training' / 'outcomes.json').read_text(encoding='utf-8'))['endpoints']

# Training per-bolus doses (AJCN Table 1, 3.5 mL/kg): carbohydrate 114.2 g/L -> 0.3997 g/kg; N-source 57.1 g/L -> 0.19985 g/kg
TRAIN_CHO, TRAIN_N = 114.2 * 3.5 / 1000, 57.1 * 3.5 / 1000
# Target per-bolus doses (J Nutr Beverages): carbohydrate 68.5+102.8 g/L; N-source per beverage (g/L)
TGT_CHO = (68.5 + 102.8) * 3.5 / 1000
TGT_N = {'2': 28.6, '3': 57.1, '4': 14.3 + 7.1 + 7.1, '5': 28.6 + 2 * 7.1 + 2 * 7.1}  # bev 5: wheat 28.6 + Leu 14.2 + Phe 14.2
TGT_N = {k: v * 3.5 / 1000 for k, v in TGT_N.items()}
SRC = {'2': '7', '3': '7', '4': '9', '5': '9'}  # wheat -> training drink 7; wheat+Leu+Phe -> training drink 9

REFS = {
    'primary_total_0_120_text': {'7': 1.54, '9': 1.42},
    'sensA_total_0_120_reading': {d: TRAIN['insulin_AUC_total_2h']['means'][d] / TRAIN['insulin_AUC_total_2h']['means']['1'] for d in ['7', '9']},
    'sensB_second_hour_reading': {d: TRAIN['insulin_AUC_second_hour']['means'][d] / TRAIN['insulin_AUC_second_hour']['means']['1'] for d in ['7', '9']},
}


def forecasts(R):
    out = {m: {} for m in ['M1_abs_dose_increment', 'M2_pc_increment', 'M3_dose_flat', 'M4_pooled_dose', 'M5_no_change', 'M6_energy']}
    pool = math.sqrt(R['7'] * R['9'])
    for k in ['2', '3', '4', '5']:
        r = R[SRC[k]]; s_abs = TGT_N[k] / TRAIN_N; s_pc = (TGT_N[k] / TGT_CHO) / (TRAIN_N / TRAIN_CHO)
        out['M1_abs_dose_increment'][k] = 1 + s_abs * (r - 1)
        out['M2_pc_increment'][k] = 1 + s_pc * (r - 1)
        out['M3_dose_flat'][k] = r
        out['M4_pooled_dose'][k] = 1 + s_abs * (pool - 1)
        out['M5_no_change'][k] = 1.0
        out['M6_energy'][k] = (TGT_CHO + TGT_N[k]) / TGT_CHO
    derived = {m: dict(C_low=v['4'] / v['2'], C_high=v['5'] / v['3'], Delta=(v['5'] / v['3']) / (v['4'] / v['2']),
                       D_wheat=v['3'] / v['2'], D_mix=v['5'] / v['4']) for m, v in out.items()}
    return dict(levels=out, contrasts=derived)


def run():
    return dict(status='Frozen before reading any target result; exposure in PLAN.md',
                doses=dict(train_cho_per_bolus=TRAIN_CHO, train_n_per_bolus=TRAIN_N, target_cho_per_bolus=TGT_CHO, target_n_per_bolus=TGT_N,
                           note='Beverage 5 N-source uses "twice" beverage 4 (28.6 + 14.2 + 14.2 g/L); training drink 9 is 28.6 + 14.3 + 14.3'),
                unavailable={'M7_calibrated_prior_common_source_gain': 'no beta value in supplied material'},
                references=REFS, forecasts={k: forecasts(v) for k, v in REFS.items()})


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False))
    if '--check' in sys.argv:
        assert same(r, json.loads((ROOT / 'PREDICTIONS.json').read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    if (ROOT / 'PREDICTIONS.json').exists(): sys.exit('already frozen')
    (ROOT / 'PREDICTIONS.json').write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for ref, f in r['forecasts'].items():
        print('==', ref, {k: round(v, 4) for k, v in r['references'][ref].items()})
        for m in f['levels']:
            print('  ', m, {k: round(v, 4) for k, v in f['levels'][m].items()}, {k: round(v, 4) for k, v in f['contrasts'][m].items()})
