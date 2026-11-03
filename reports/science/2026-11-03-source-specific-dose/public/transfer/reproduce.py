"""Portable replay (standard library only): frozen forecasts + scoring on retained target snapshots.
Digitization (digitize_target.py) needs the locally extracted figure images and Pillow; it is not part of this replay.

python -I -X utf8 reproduce.py
"""
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parent
rec = json.loads((ROOT / 'FREEZE_RECEIPT.json').read_text(encoding='utf-8'))
for f in ['PLAN.md', 'predict.py', 'PREDICTIONS.json', 'score.py', '../training/outcomes.json']:
    assert hashlib.sha256((ROOT / f).read_bytes()).hexdigest() == rec[f], f'frozen file changed: {f}'
run = lambda *a: subprocess.run([sys.executable, '-I', '-X', 'utf8', *map(str, a)], check=True)
run(ROOT / 'predict.py', '--check')
for t, o in [('target_data_opus.json', 'SCORES_opus.json'), ('target_data_opus_h15.json', 'SCORES_opus_h15.json')]:
    run(ROOT / 'score.py', ROOT / t, ROOT / o, '--check')
print('PASS reproduce: frozen hashes, predictions and both score snapshots')
