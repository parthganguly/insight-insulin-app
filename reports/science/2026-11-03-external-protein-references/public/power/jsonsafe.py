"""Strict-JSON corrected snapshot of VERIFIED_v2 plus a non-finite scan of every JSON file in this folder.

VERIFIED_v2.json (historical, preserved) contains [Infinity, -Infinity] for ranges of rules unavailable at the
admitted dose. This script recomputes verify_v2.run() (read-only import), replaces every non-finite range with
null, keeps all finite values, and writes VERIFIED_v2_corrected.json with allow_nan=False.

python -I -X utf8 jsonsafe.py           write VERIFIED_v2_corrected.json and JSON_SCAN.json
python -I -X utf8 jsonsafe.py --check   strict re-parse + recompute + compare
"""
from pathlib import Path
import json, math, runpy, sys

ROOT = Path(__file__).resolve().parent


def strict_load(p):
    def bad(tok): raise ValueError(f'non-finite token {tok} in {p.name}')
    return json.loads(p.read_text(encoding='utf-8'), parse_constant=bad)


def clean(x):
    if isinstance(x, dict): return {k: clean(v) for k, v in x.items()}
    if isinstance(x, list):
        if x and all(isinstance(v, float) and not math.isfinite(v) for v in x): return None  # unavailable range
        return [clean(v) for v in x]
    if isinstance(x, float) and not math.isfinite(x): return None
    return x


def corrected():
    r = clean(runpy.run_path(str(ROOT / 'verify_v2.py'))['run']())
    r['jsonsafe_note'] = 'null = range unavailable (rule abstains at this dose, e.g. R2x_boundary_hold inside the training range)'
    return r


def scan():
    out = {}
    for p in sorted(ROOT.glob('*.json')):
        try: strict_load(p); out[p.name] = 'strict-JSON OK'
        except ValueError as e: out[p.name] = f'NON-FINITE: {e}'
    return out


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = corrected()
    if '--check' in sys.argv:
        assert same(r, strict_load(ROOT / 'VERIFIED_v2_corrected.json'))
        hist = json.loads((ROOT / 'VERIFIED_v2.json').read_text(encoding='utf-8'))  # permissive parse of historical file
        assert same(clean(hist), {k: v for k, v in r.items() if k != 'jsonsafe_note'}), 'finite content differs from historical'
        print('PASS check'); sys.exit()
    (ROOT / 'VERIFIED_v2_corrected.json').write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    s = scan()
    (ROOT / 'JSON_SCAN.json').write_text(json.dumps(s, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(s, indent=1))
