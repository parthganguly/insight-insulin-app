"""Offline replay (stdlib): recompute Wei v2 RESULTS.json. Source XML audit is separate: wei.py verify PATH. python -I -X utf8 replay.py"""
from pathlib import Path
import subprocess, sys
R = Path(__file__).resolve().parent
subprocess.run([sys.executable, '-I', '-X', 'utf8', str(R / 'wei.py'), '--check'], check=True)
print('PASS cooking replay')
