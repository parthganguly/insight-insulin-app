"""Digitize panel B and independently verify both panels at displaced pixel columns."""
import json
import numpy as np
import extract_aggregate as src

ticks = src.lines(1242)
assert len(ticks) == 5
slope, intercept = np.polyfit([row.mean() for row in ticks], [1200,800,400,0,-400], 1)
late = []
for i, (x, start, cap_idx, bar_idx) in enumerate([
    (1320,475,0,1), (1435,440,0,1), (1553,620,1,0), (1670,569,1,0),
    (1785,260,0,1), (1900,389,0,1)]):
    def mark(col):
        rows = [r for r in src.lines(col) if start <= r[0]]
        edge = float(rows[bar_idx][0] if i == 0 else rows[bar_idx].mean())
        cap = float(rows[cap_idx].mean())
        return edge,cap
    edge, cap = mark(x)
    assert np.allclose(mark(x-2), (edge,cap), atol=1)
    late.append(dict(arm=src.arms[i]['arm'],mean=round(slope*edge+intercept),
                     sem=round(abs(slope*(edge-cap))), column=x, mean_y=edge, cap_y=cap))
for i,arm in enumerate(src.arms):
    cap, bar, *_ = src.lines(arm['column']+2)
    edge = bar.min() if i == 0 else bar.mean()
    assert abs(edge-arm['mean_y'])<=1 and abs(cap.mean()-arm['cap_y'])<=1
out=dict(endpoint='120-300 min serum insulin iAUC, supplementary Figure 2b',units='mIU/L * min',
         late_omnibus_p=.005,pixel_slope=slope,pixel_intercept=intercept, arms=late,
         verification='Both panels checked at displaced columns; same-source geometry verification.')
(src.base/'late_aggregate.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
