"""Portable replay v2: original reproduce.py (frozen hashes, predictions, Opus-reading scores) + reconciled-reading checks.
python -I -X utf8 reproduce_v2.py
"""
from pathlib import Path
import subprocess, sys

ROOT = Path(__file__).resolve().parent
for s in ['reproduce.py', 'reconcile.py']:
    subprocess.run([sys.executable, '-I', '-X', 'utf8', str(ROOT / s)] + (['--check'] if s == 'reconcile.py' else []), check=True)
print('PASS reproduce_v2')
