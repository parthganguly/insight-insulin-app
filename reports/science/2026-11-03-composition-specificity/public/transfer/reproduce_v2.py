"""Portable replay (stdlib): verify v1 receipts unchanged, v2 prediction receipt, then check v2 analysis and design power.
Fig. 4 extraction (digitize_fig4.py) needs PyMuPDF and the local reprint; fig4_vector.json is the retained snapshot.

python -I -X utf8 reproduce_v2.py
"""
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parent
h = lambda f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest()
for rec, files in [('FREEZE_RECEIPT.json', ['PLAN.md', 'katsanos.py']), ('PREDICTION_RECEIPT.json', ['inputs.json', 'PREDICTIONS.json']),
                   ('PREDICTION_RECEIPT_v2.json', ['inputs_v2.json', 'PREDICTIONS_v2.json', 'PREDICTIONS.json'])]:
    r = json.loads((ROOT / rec).read_text(encoding='utf-8'))
    for f in files: assert h(f) == r[f], f'{f} changed since {rec}'
for s in ['design_power.py', 'analysis_v2.py']:
    subprocess.run([sys.executable, '-I', '-X', 'utf8', str(ROOT / s), '--check'], check=True)
print('PASS reproduce_v2')
