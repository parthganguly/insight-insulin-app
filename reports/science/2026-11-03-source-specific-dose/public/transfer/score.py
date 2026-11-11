"""Portable scoring harness (PLAN.md). Reads frozen PREDICTIONS.json and a target data file; standard library only.

python -I -X utf8 score.py TARGET_JSON OUT_JSON            score
python -I -X utf8 score.py TARGET_JSON OUT_JSON --check    recompute and compare

TARGET_JSON schema (any part may be absent -> that window UNAVAILABLE):
{ "provenance": "...", "times_min": [0,30,60,90,120,150,180],
  "curves": {"1":[...], "2":[...], ...}            # group-mean insulin, one value per time, native units
  "curve_reading_half_width": h,                   # declared graph-reading half-width (same units)
  "published_auc": {"window": "...", "values": {"1":..,"2":..}, "half_width": h2},
  "source_statistics": {...} }
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
ARMS = ['1', '2', '3', '4', '5']
Q = ['L2', 'L3', 'L4', 'L5', 'C_low', 'C_high', 'Delta', 'D_wheat', 'D_mix']


def signed_area(times, y, t0, t1, shift=None):
    """Trapezoid of (y - y[0]) over [t0, t1] on the source grid; shift=(dy0, dy_rest) for reading bounds."""
    base = y[0] + (shift[0] if shift else 0)
    a = 0.0
    for i in range(len(times) - 1):
        if times[i] >= t0 and times[i + 1] <= t1:
            yi = y[i] + (shift[1] if shift and i > 0 else shift[0] if shift else 0) - base
            yj = y[i + 1] + (shift[1] if shift else 0) - base
            a += (yi + yj) / 2 * (times[i + 1] - times[i])
    return a


def quantities(A):
    L = {k: A[k] / A['1'] for k in ['2', '3', '4', '5']}
    return dict(L2=L['2'], L3=L['3'], L4=L['4'], L5=L['5'], C_low=L['4'] / L['2'], C_high=L['5'] / L['3'],
                Delta=(L['5'] / L['3']) / (L['4'] / L['2']), D_wheat=L['3'] / L['2'], D_mix=L['5'] / L['4'])


def interval_quantities(lo, hi):
    """Exact bounds for each quantity given independent positive arm-area intervals (each arm appears once per quantity)."""
    def ratio(num, den):  # product of numerator arms / product of denominator arms
        mn = math.prod(lo[a] for a in num) / math.prod(hi[a] for a in den)
        mx = math.prod(hi[a] for a in num) / math.prod(lo[a] for a in den)
        return [mn, mx]
    if min(lo.values()) <= 0: return None
    return dict(L2=ratio(['2'], ['1']), L3=ratio(['3'], ['1']), L4=ratio(['4'], ['1']), L5=ratio(['5'], ['1']),
                C_low=ratio(['4'], ['2']), C_high=ratio(['5'], ['3']), Delta=ratio(['5', '2'], ['3', '4']),
                D_wheat=ratio(['3'], ['2']), D_mix=ratio(['5'], ['4']))


def windows(tg):
    out = {}
    if 'curves' in tg:
        t, h = tg['times_min'], tg.get('curve_reading_half_width', 0.0)
        for name, (a, b) in {'W1_0_120_signed_group': (0, 120), 'W2_60_120_signed_group': (60, 120), 'W3c_0_180_signed_group': (0, 180)}.items():
            if t[-1] < b: continue
            A = {k: signed_area(t, tg['curves'][k], a, b) for k in ARMS}
            lo = {k: signed_area(t, tg['curves'][k], a, b, (h, -h)) for k in ARMS}   # baseline up, rest down
            hi = {k: signed_area(t, tg['curves'][k], a, b, (-h, h)) for k in ARMS}
            out[name] = dict(areas=A, observed=quantities(A) if min(A.values()) > 0 else None, reading_bounds=interval_quantities(lo, hi))
    if 'published_auc' in tg:
        v, h2 = tg['published_auc']['values'], tg['published_auc'].get('half_width', 0.0)
        out['W3_published'] = dict(window=tg['published_auc']['window'], areas=v, observed=quantities(v),
                                   reading_bounds=interval_quantities({k: v[k] - h2 for k in ARMS}, {k: v[k] + h2 for k in ARMS}))
    return out


PAIRING = {'W1_0_120_signed_group': ['primary_total_0_120_text', 'sensA_total_0_120_reading'],
           'W2_60_120_signed_group': ['sensB_second_hour_reading'],
           'W3c_0_180_signed_group': ['primary_total_0_120_text', 'sensA_total_0_120_reading'],
           'W3_published': ['primary_total_0_120_text', 'sensA_total_0_120_reading']}


def score(pred, tg):
    W = windows(tg); res = {}
    for w, d in W.items():
        if d['observed'] is None: res[w] = dict(d, status='UNAVAILABLE: nonpositive area'); continue
        o = d['observed']; sc = {}
        for ref in PAIRING[w]:
            f = pred['forecasts'][ref]
            for m in f['levels']:
                p = dict(L2=f['levels'][m]['2'], L3=f['levels'][m]['3'], L4=f['levels'][m]['4'], L5=f['levels'][m]['5'], **f['contrasts'][m])
                err = {q: abs(math.log(p[q] / o[q])) for q in Q}
                sign = {q: (math.copysign(1, math.log(p[q])) == math.copysign(1, math.log(o[q]))) if abs(math.log(p[q])) > 1e-9 else None
                        for q in ['C_low', 'C_high', 'Delta']}
                sc[f'{ref}:{m}'] = dict(pred=p, abs_log_error=err, mean_level_error=sum(err[q] for q in ['L2', 'L3', 'L4', 'L5']) / 4,
                                        mean_contrast_error=sum(err[q] for q in ['C_low', 'C_high', 'Delta']) / 3, sign_agreement=sign)
        res[w] = dict(d, scores=sc, window_transfer_note='W3 scored with 0-120 training references: window transfer, separate' if w.startswith('W3') else None)
    return dict(status='Scored with frozen PREDICTIONS.json; no target fit; graph-reading bounds only, no paired CI',
                target_provenance=tg.get('provenance'), source_statistics=tg.get('source_statistics'), windows=res)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    tgt, out = Path(sys.argv[1]), Path(sys.argv[2])
    pred = json.loads((ROOT / 'PREDICTIONS.json').read_text(encoding='utf-8'))
    r = json.loads(json.dumps(score(pred, json.loads(tgt.read_text(encoding='utf-8'))), allow_nan=False))
    if '--check' in sys.argv:
        assert same(r, json.loads(out.read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    out.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for w, d in r['windows'].items():
        if 'scores' not in d: print(w, d.get('status')); continue
        print('==', w, {q: round(v, 3) for q, v in d['observed'].items()})
        for k, s in d['scores'].items():
            print('  ', k, 'lvl', round(s['mean_level_error'], 3), 'con', round(s['mean_contrast_error'], 3),
                  {q: round(s['abs_log_error'][q], 3) for q in ['C_low', 'C_high', 'Delta']}, s['sign_agreement'])
