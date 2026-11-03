"""Vector extraction of Katsanos 2006 Fig. 4 (arterial plasma insulin, uIU/ml) from the original APS reprint.
Requires PyMuPDF; the PDF is NOT redistributed. Writes fig4_vector.json (means and SE whiskers per group/time).

python -I -X utf8 digitize_fig4.py PATH/TO/katsanos.pdf fig4_vector.json
"""
import json, sys
import fitz

PAGE, CLIP = 3, (300, 460, 570, 715)
TIMES = [-30, 0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 210]


def on_segment(px, py, a, b, tol=0.6):
    if not (min(a.x, b.x) - tol <= px <= max(a.x, b.x) + tol): return False
    t = (px - a.x) / (b.x - a.x)
    return abs(a.y + t * (b.y - a.y) - py) < tol


def main(pdf, out):
    pg = fitz.open(pdf)[PAGE]; clip = fitz.Rect(*CLIP)
    dr = [x for x in pg.get_drawings() if fitz.Rect(x['rect']).intersects(clip)]
    axis = max((x for x in dr if x['type'] == 's'), key=lambda x: sum(1 for it in x['items'] if it[0] == 'l' and abs(it[1].x - 334.33) < 0.1))
    yt = sorted({round(it[1].y, 2) for it in axis['items'] if it[0] == 'l' and abs(it[1].x - 332.33) < 0.05 and abs(it[2].x - 334.33) < 0.05})
    xt = sorted({round(it[1].x, 2) for it in axis['items'] if it[0] == 'l' and abs(it[1].y - 686.46) < 0.05})
    assert len(yt) == 13 and len(xt) == 10, (len(yt), len(xt))
    y0, y24 = max(yt), min(yt); val = lambda y: (y0 - y) * 24 / (y0 - y24)
    xmin = {t: x for t, x in zip([-60, -30, 0, 30, 60, 90, 120, 150, 180, 210], xt)}
    for a, b, m in [(0, 30, 15), (30, 60, 45), (60, 90, 75)]: xmin[m] = (xmin[a] + xmin[b]) / 2
    # markers: diamonds are quads ('qu'), squares are rects ('re') of ~2.9 pt
    marks = []
    for x in dr:
        if x['type'] == 's' and len(x['items']) == 1 and 2.5 < x['rect'].width < 3.2 and 2.5 < x['rect'].height < 3.2:
            marks.append(dict(shape='diamond' if x['items'][0][0] == 'qu' else 'square', cx=(x['rect'].x0 + x['rect'].x1) / 2, cy=(x['rect'].y0 + x['rect'].y1) / 2))
    # solid connecting polylines (non-axis-parallel segments between adjacent time columns)
    segs = [(it[1], it[2]) for x in dr if x['type'] == 's' and x is not axis for it in x['items']
            if it[0] == 'l' and abs(it[1].x - it[2].x) > 5 and abs(it[1].y - it[2].y) > 0.05]
    solid_vertices = {(round(p.x, 1), round(p.y, 1)) for s in segs for p in s}
    # whiskers: vertical lines starting at a marker centre
    whisk = [(it[1], it[2]) for x in dr if x['type'] == 's' and x is not axis for it in x['items']
             if it[0] == 'l' and abs(it[1].x - it[2].x) < 0.01 and abs(it[1].y - it[2].y) > 0.3]
    # split solid segments into the two young polylines (chains of shared endpoints)
    chains = []
    for a, b in segs:
        for c in chains:
            if abs(c[-1][1].x - a.x) < 0.05 and abs(c[-1][1].y - a.y) < 0.05: c.append((a, b)); break
        else: chains.append([(a, b)])
    def poly_y(c, x):
        for a, b in c:
            if a.x - 0.05 <= x <= b.x + 0.05: return a.y + (x - a.x) / (b.x - a.x) * (b.y - a.y)
    data = {}
    shape_of_chain = {}
    for i, c in enumerate(chains):  # label chain by the marker shape it passes through most often
        votes = {'diamond': 0, 'square': 0}
        for m in marks:
            y = poly_y(c, m['cx'])
            if y is not None and abs(y - m['cy']) < 0.6: votes[m['shape']] += 1
        shape_of_chain[i] = max(votes, key=votes.get)
    assert sorted(shape_of_chain.values()) == ['diamond', 'square'], shape_of_chain
    for t, xt_ in xmin.items():
        if t == -60: continue
        col = [m for m in marks if abs(m['cx'] - xt_) < 1.0]
        assert len(col) == 4, (t, len(col))
        for shape in ('diamond', 'square'):
            pair = [m for m in col if m['shape'] == shape]; assert len(pair) == 2
            ci = next(i for i, s in shape_of_chain.items() if s == shape)
            yl = poly_y(chains[ci], xt_)
            pair.sort(key=lambda m: abs(m['cy'] - yl))
            pair[0]['grp'], pair[1]['grp'] = 'young', 'old'
            pair[0]['dist'], pair[1]['dist'] = abs(pair[0]['cy'] - yl), abs(pair[1]['cy'] - yl)
        for m in col:
            grp = m['grp'] + ('_low' if m['shape'] == 'diamond' else '_high')
            w = [abs(b.y - a.y) for a, b in whisk if abs(a.x - m['cx']) < 0.6 and abs(a.y - m['cy']) < 0.8]
            data.setdefault(grp, {})[str(t)] = dict(mean=val(m['cy']), se_whiskers=[v * 24 / (y0 - y24) for v in sorted(w)], px=[m['cx'], m['cy']],
                                                    dist_to_young_polyline_pt=m['dist'])
    for g, d in data.items(): assert len(d) == 12, (g, len(d))
    res = dict(source='Katsanos et al. 2006 Am J Physiol Endocrinol Metab 291:E381, Fig. 4 (page E384), vector paths',
               method='Marker centres (quad = diamond = 26% Leu; rect = square = 41% Leu); young = marker on a solid connecting polyline, '
                      'elderly = dashed; y scale from 13 axis ticks 0..24 uIU/ml; x from 10 ticks -60..210 min; whisker lengths from vertical '
                      'segments starting at marker centre (SE as plotted)',
               y_ticks_pt=yt, x_ticks_pt=xt, units='uIU/ml (as printed)', groups=data)
    with open(out, 'w', encoding='utf-8', newline='\n') as f: json.dump(res, f, indent=2, allow_nan=False); f.write('\n')
    for g in sorted(data): print(g, [round(data[g][str(t)]['mean'], 2) for t in TIMES])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
