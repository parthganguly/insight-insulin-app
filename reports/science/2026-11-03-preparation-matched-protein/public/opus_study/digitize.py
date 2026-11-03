"""Vector digitization of thesis Figure 3.1 A/B (total insulin AUC bars) from the PDF content stream.

Requires the locally obtained thesis PDF (not redistributed) and pypdf.
python -I -X utf8 digitize.py PATH/TO/Claessens-thesis.pdf --dump     exploration listing
python -I -X utf8 digitize.py PATH/TO/Claessens-thesis.pdf            write readings_vector.json
"""
from pathlib import Path
import json, re, sys
import pypdf

ROOT = Path(__file__).resolve().parent
PAGE_INDEX = 44  # PDF page 45 = thesis page 44, Figure 3.1
TOK = re.compile(r'\((?:\\.|[^\\)])*\)|<<|>>|\[|\]|/[^\s/\[\]()<>]+|[-+]?\d*\.\d+|[-+]?\d+|[A-Za-z\'"*]+')


def parse(content):
    """Return filled rects (with gray fill), gridline clip rects, stroked segments (with cm offset) and text (Tm x,y,string)."""
    st, fill, cm, cur = [], None, (0.0, 0.0), None
    rects, clips, segs, texts, pending = [], [], [], [], []
    for t in TOK.findall(content):
        if t in ('sc', 'g'):
            fill = st[-1] if st else fill; st = []
        elif t == 're':
            pending.append([float(x) for x in st[-4:]]); st = []
        elif t == 'f':
            rects += [(fill, r) for r in pending]; pending = []; st = []
        elif t == 'W':
            clips += [r for r in pending if abs(r[3] - 0.12) < 1e-6]; pending = []; st = []
        elif t == 'n':
            pending = []; st = []
        elif t == 'cm':
            cm = (float(st[-2]), float(st[-1])); st = []
        elif t == 'm':
            cur = (cm[0] + float(st[-2]), cm[1] + float(st[-1])); st = []
        elif t == 'l':
            nxt = (cm[0] + float(st[-2]), cm[1] + float(st[-1])); segs.append((cur, nxt)); cur = nxt; st = []
        elif t == 'Q':
            cm = (0.0, 0.0); st = []
        elif t == 'Tm':
            texts.append([float(st[-2]), float(st[-1]), None]); st = []
        elif t.startswith('(') and texts and texts[-1][2] is None:
            texts[-1][2] = t[1:-1]; st = []
        elif t in ('S', 'q', 'w', 'J', 'j', 'G', 'SC', 'BT', 'ET', 'Tf', 'TJ', 'Tj', 'Tc', 'Tw', 'Tr', 'gs', 'BDC', 'EMC', 'TD', 'Td', 'T*'):
            st = []
        else:
            st.append(t)
    return rects, clips, segs, texts


def panel(rects, clips, segs, texts, x_lo, x_hi):
    bars = sorted([(f, r) for f, r in rects if x_lo < r[0] < x_hi and r[1] > 700 and r[2] > 10 and f in ('0', '0.199', '0.754')
                   and r[3] > 1], key=lambda z: (z[1][0], z[0]))
    # de-duplicate overlapping clip+fill pairs (same x, same height)
    uniq = []
    for f, r in bars:
        if not any(abs(r[0] - u[1][0]) < 0.2 and abs(r[3] - u[1][3]) < 1e-6 for u in uniq): uniq.append((f, r))
    base = min(r[1] for _, r in uniq)
    grid = sorted({round(c[1] + 0.06, 3) for c in clips if x_lo < c[0] < x_hi and c[1] > 700})
    labels = sorted([(y, s) for x, y, s in texts if s and s.strip().isdigit() and x_lo - 40 < x < x_lo + 5 and y > 690], key=lambda z: z[0])
    return dict(baseline_y=base, gridlines_y=grid, tick_labels=labels,
                bars=[dict(gray=f, x=r[0], width=r[2], top_y=r[1] + r[3], height=r[3]) for f, r in uniq],
                error_segments=[s for s in segs if x_lo < s[0][0] < x_hi and s[0][1] > 700 and abs(s[0][0] - s[1][0]) < 1e-6])


def main():
    pdf = pypdf.PdfReader(sys.argv[1])
    content = pdf.pages[PAGE_INDEX].get_contents().get_data().decode('latin-1')
    rects, clips, segs, texts = parse(content)
    A, B = panel(rects, clips, segs, texts, 150, 290), panel(rects, clips, segs, texts, 330, 470)
    if '--dump' in sys.argv:
        print(json.dumps(dict(A=A, B=B), indent=1)); return
    out = {}
    for name, P, src in [('A', A, 'soy'), ('B', B, 'whey')]:
        # scale: printed ticks 0,200,...,2000 (11 labels); top gridline = 2000; each gridline is assigned the nearest
        # 200-multiple by position (a gridline may be absent from the stream), then least squares incl. (baseline, 0).
        assert len(P['tick_labels']) == 11 and P['tick_labels'][-1][1].startswith('2')
        top = max(P['gridlines_y']); span = top - P['baseline_y']
        ys = [P['baseline_y']] + P['gridlines_y']
        vs = [0.0] + [200.0 * round((y - P['baseline_y']) / span * 10) for y in P['gridlines_y']]
        assert len(set(vs)) == len(vs)
        lab = [y for y, _ in P['tick_labels']]
        label_units_per_pt = 2000.0 / (lab[-1] - lab[0])
        n = len(ys); my, mv = sum(ys) / n, sum(vs) / n
        k = sum((y - my) * (v - mv) for y, v in zip(ys, vs)) / sum((y - my) ** 2 for y in ys); b0 = mv - k * my
        resid = max(abs(k * y + b0 - v) for y, v in zip(ys, vs))
        bars = sorted(P['bars'], key=lambda z: z['x'])
        labels = [('intact', '0.3'), ('intact', '0.4'), ('intact', '0.6'), ('hydro', '0.3'), ('hydro', '0.4'), ('hydro', '0.6')]
        vals = {}
        for (f, d), bar in zip(labels, bars):
            mean = k * bar['top_y'] + b0
            cx = bar['x'] + bar['width'] / 2
            tips = [max(s[0][1], s[1][1]) for s in P['error_segments']
                    if abs(s[0][0] - cx) < 1.5 and abs(min(s[0][1], s[1][1]) - bar['top_y']) < 0.5]  # whisker starts at bar top
            sem = (k * max(tips) + b0 - mean) if tips else None
            vals.setdefault(f, {})[d] = dict(mean=mean, mean_from_height=k * bar['height'], sem_upper_bar=sem,
                                             gray=bar['gray'], top_y=bar['top_y'])
        out[src] = dict(panel=name, units_per_pt=k, intercept=b0, max_grid_residual=resid, n_gridlines=len(ys) - 1,
                        gridline_values=vs[1:], label_spacing_units_per_pt=label_units_per_pt, values=vals)
    (ROOT / 'readings_vector.json').write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({s: {f: {d: round(x['mean'], 1) for d, x in v.items()} for f, v in o['values'].items()} for s, o in out.items()}))
    print({s: (round(o['units_per_pt'], 4), round(o['max_grid_residual'], 2), o['n_gridlines']) for s, o in out.items()})


if __name__ == '__main__':
    main()
