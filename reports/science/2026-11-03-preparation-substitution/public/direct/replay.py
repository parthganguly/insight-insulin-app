"""Offline replay (stdlib): frozen evaluator on both Collier panels + v1/v2 supplementary checks. python -I -X utf8 replay.py"""
from pathlib import Path
import subprocess, sys
R = Path(__file__).resolve().parent
run = lambda *a: subprocess.run([sys.executable, '-I', '-X', 'utf8', *map(str, a)], check=True)
for t, s in (('targets_collier.json', 'SCORES_collier.json'), ('targets_collier_approx.json', 'SCORES_collier_approx.json')):
    run(R.parent / 'model' / 'evaluate.py', 'check', R / t, R / s)
run(R / 'collier.py', '--check'); run(R / 'collier_v2.py', '--check')
print('PASS direct replay')
