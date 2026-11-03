"""Pixel digitization of J Nutr 2000 Fig. 2 (insulin curves) and Fig. 3 (3-h insulin AUC bars) from the PDF's embedded
1-bit scans (extract with pypdf; images are not redistributed). Requires Pillow.

python -I -X utf8 digitize_target.py FIG2.png FIG3.png --explore      print calibration / components
python -I -X utf8 digitize_target.py FIG2.png FIG3.png OUT.json       write readings (after manual-assisted marker map)
"""
import json, sys
from collections import deque
from PIL import Image


def load(p):
    im = Image.open(p).convert('L'); w, h = im.size; px = im.load()
    return w, h, (lambda x, y: px[x, y] < 128)


def axis_x(w, h, dark, x_max):
    return max(range(x_max), key=lambda x: sum(dark(x, y) for y in range(h)))


def axis_y(w, h, dark, y_min):
    return max(range(y_min, h), key=lambda y: sum(dark(x, y) for x in range(w)))


def ticks_left(h, dark, ax, top, bottom):
    rows = [y for y in range(top, bottom + 1) if all(dark(x, y) for x in range(ax - 9, ax - 2))]
    groups = []
    for y in rows:
        if groups and y - groups[-1][-1] <= 1: groups[-1].append(y)
        else: groups.append([y])
    return [sum(g) / len(g) for g in groups]


def ticks_bottom(w, dark, ay, left, right):
    cols = [x for x in range(left, right + 1) if all(dark(x, y) for y in range(ay + 2, ay + 9))]
    groups = []
    for x in cols:
        if groups and x - groups[-1][-1] <= 1: groups[-1].append(x)
        else: groups.append([x])
    return [sum(g) / len(g) for g in groups]


def components(dark, x0, x1, y0, y1):
    seen, comps = set(), []
    for x in range(x0, x1):
        for y in range(y0, y1):
            if (x, y) in seen or not dark(x, y): continue
            q, pts = deque([(x, y)]), []
            seen.add((x, y))
            while q:
                a, b = q.popleft(); pts.append((a, b))
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    c, d = a + da, b + db
                    if x0 <= c < x1 and y0 <= d < y1 and (c, d) not in seen and dark(c, d):
                        seen.add((c, d)); q.append((c, d))
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            comps.append(dict(n=len(pts), x=(min(xs), max(xs)), y=(min(ys), max(ys)), cx=sum(xs) / len(xs), cy=sum(ys) / len(ys)))
    return comps


def solid_blocks(dark, x, half=22, r=3, y0=10, y1=745):
    """Centres of clusters of fully dark (2r+1)^2 blocks near column x: candidate filled markers."""
    hits = [(cx, cy) for cx in range(x - half, x + half + 1) for cy in range(y0, y1)
            if all(dark(cx + i, cy + j) for i in range(-r, r + 1) for j in range(-r, r + 1))]
    cl = []
    for cx, cy in hits:
        for c in cl:
            if abs(c[-1][0] - cx) <= 6 and abs(c[-1][1] - cy) <= 6: c.append((cx, cy)); break
        else: cl.append([(cx, cy)])
    return [dict(cx=sum(p[0] for p in c) / len(c), cy=sum(p[1] for p in c) / len(c), n=len(c),
                 bbox=(min(p[0] for p in c), max(p[0] for p in c), min(p[1] for p in c), max(p[1] for p in c))) for c in cl]


def bar_tops(w, h, dark, ax, ay, min_run=50):
    """Top outline row of each bar: rows with a dark horizontal run >= min_run right of the y-axis."""
    tops = []
    for y in range(5, ay - 2):
        x = ax + 3
        while x < w:
            if dark(x, y):
                s = x
                while x < w and dark(x, y): x += 1
                if x - s >= min_run: tops.append((s, x - 1, y))
            x += 1
    bars = []
    for s, e, y in tops:
        for b in bars:
            if abs(b['s'] - s) < 8 and abs(b['e'] - e) < 8: break
        else: bars.append(dict(s=s, e=e, top=y))
    return sorted(bars, key=lambda b: b['s'])


def fit(pix, vals):
    n = len(pix); mp, mv = sum(pix) / n, sum(vals) / n
    k = sum((p - mp) * (v - mv) for p, v in zip(pix, vals)) / sum((p - mp) ** 2 for p in pix)
    return k, mv - k * mp, max(abs(k * p + mv - k * mp - v) for p, v in zip(pix, vals))


def explore(f2, f3):
    for name, p, ylab in [('fig2', f2, [0, 200, 400, 600, 800, 1000]), ('fig3', f3, [0, 25, 50, 75, 100])]:
        w, h, dark = load(p)
        ax = axis_x(w, h, dark, w // 3); ay = axis_y(w, h, dark, h // 2)
        yt = ticks_left(h, dark, ax, 0, ay + 3); xt = ticks_bottom(w, dark, ay, ax - 3, w - 1)
        print(name, 'size', (w, h), 'axis_x', ax, 'axis_y', ay, 'yticks', [round(v, 1) for v in yt], 'xticks', [round(v, 1) for v in xt])
        if len(yt) == len(ylab): print('  y fit', fit(sorted(yt, reverse=True), ylab))


# Manual-assisted marker decode (Opus single reader), Fig. 2 pixel rows of marker CENTRES on the time-tick columns.
# Method: dark-run profile on each tick column + solid-block search + ASCII inspection. Filled circle = ~20 px solid run;
# open circle / open square = two 3-px edges; triangle = bounding-box centre (apex run .. base run); small filled square
# = solid 7-8 px block. Drink 3 at 60 and 150 min is hidden behind an opaque open marker: placed at the overlapping
# marker's centre / between overlapped markers (flagged). t=0: all five markers overlap; common centre row 734.5.
FIG2_ROWS = {  # time: {drink: (pixel_row, flag)}
    0:   {d: (734.5, 'overlap_all') for d in '12345'},
    30:  {'1': (630.0, ''), '2': (611.0, ''), '3': (622.2, ''), '4': (562.5, ''), '5': (585.5, '')},
    60:  {'1': (602.0, ''), '2': (576.5, ''), '3': (576.5, 'hidden_under_drink2'), '4': (536.5, ''), '5': (419.5, '')},
    90:  {'1': (550.0, 'cluster'), '2': (559.5, 'cluster'), '3': (546.6, ''), '4': (436.5, ''), '5': (361.5, '')},
    120: {'1': (507.5, 'cluster'), '2': (523.0, 'cluster'), '3': (536.8, ''), '4': (421.5, ''), '5': (315.5, '')},
    150: {'1': (453.0, 'cluster'), '2': (468.5, 'cluster'), '3': (459.0, 'hidden_between_1_and_2'), '4': (385.0, ''), '5': (210.0, '')},
    180: {'1': (450.0, 'cluster'), '2': (524.0, ''), '3': (461.0, ''), '4': (418.0, ''), '5': (241.5, '')},
}
FIG2_YTICKS = ([751, 606, 457, 311, 163, 17], [0, 200, 400, 600, 800, 1000])
FIG3_YTICKS = ([601.5, 457.5, 310, 165, 18], [0, 25, 50, 75, 100])


def build(f3):
    k2, b2, r2 = fit(*FIG2_YTICKS)
    times = sorted(FIG2_ROWS)
    curves = {d: [k2 * FIG2_ROWS[t][d][0] + b2 for t in times] for d in '12345'}
    flags = {d: {str(t): FIG2_ROWS[t][d][1] for t in times if FIG2_ROWS[t][d][1]} for d in '12345'}
    w, h, dark = load(f3)
    k3, b3, r3 = fit(*FIG3_YTICKS)
    bars = bar_tops(w, h, dark, 144, 600)
    auc = {str(i + 1): k3 * (bar['top'] + 1) + b3 for i, bar in enumerate(bars)}  # outline centre = top row + 1
    return {'provenance': 'van Loon et al. J Nutr 2000;130:2508-13 (PMID 11015482) Fig. 2 (plasma insulin, pmol/L) and Fig. 3 '
                          '(insulin response, axis printed "pmol L-1 3h"); Opus single-reader pixel digitization of embedded scans',
            'times_min': times, 'curves': curves, 'curve_flags': flags,
            'curve_reading_half_width': 10.0,
            'curve_reading_note': 'Declared before scoring: +/-10 pmol/L (~7 px) for all points; distinct drink 4/5 markers are '
                                  'tighter (~+/-5); hidden drink-3 points warrant +/-15 (run as separate sensitivity).',
            'fig2_calibration': dict(units_per_px=k2, intercept=b2, max_residual=r2),
            'published_auc': {'window': '0-180 min, area above t0 baseline (Fig. 3, axis as printed pmol L-1 3h)', 'values': auc,
                              'half_width': 0.5, 'fig3_calibration': dict(units_per_px=k3, intercept=b3, max_residual=r3)},
            'source_statistics': {
                'text_3h_vs_control': 'drink 4 +52 +/- 10%, drink 5 +107 +/- 17% (P<0.05); drink 5 vs 4 +36 +/- 6% (P<0.05); mean +/- SEM of '
                                      'percentages (likely mean of individual ratios; differs from ratio of means)',
                'fig3_letters': {'1': 'c', '2': 'c', '3': 'c', '4': 'b', '5': 'a'},
                'fig2': 'drink 5 higher than 1, 2, 3 at 60, 90, 120, 150 min',
                'n': 8, 'dispersion': 'SEM'}}


if __name__ == '__main__':
    if '--explore' in sys.argv: explore(sys.argv[1], sys.argv[2])
    else:
        out = build(sys.argv[2])
        with open(sys.argv[3], 'w', encoding='utf-8', newline='\n') as f: json.dump(out, f, indent=2, allow_nan=False); f.write('\n')
        print({d: [round(v, 1) for v in c] for d, c in out['curves'].items()}); print({k: round(v, 2) for k, v in out['published_auc']['values'].items()})
