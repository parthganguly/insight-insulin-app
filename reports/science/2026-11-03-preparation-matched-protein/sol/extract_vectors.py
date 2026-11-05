import json, pathlib
import pymupdf as f
ROOT=pathlib.Path(__file__).resolve().parent
import sys
SOURCE=pathlib.Path(sys.argv[1])
p=f.open(SOURCE)[44]
draw=p.get_drawings()
rows=[]
for cohort,xlo,xhi,zero,top in [('soy',95,190,135.239990234375,76.8599853515625),('whey',270,370,134.8800048828125,76.8599853515625)]:
    bars=sorted([a['rect'] for a in draw if a['fill'] is not None and 12<a['rect'].width<13 and 15<a['rect'].height<50 and xlo<a['rect'].x0<xhi and a['rect'].y0<125],key=lambda r:r.x0)
    assert len(bars)==6
    for i,r in enumerate(bars):
        stems=[a['rect'] for a in draw if a['fill'] is None and a['rect'].width<.001 and abs(a['rect'].y1-r.y0)<.002 and r.x0<a['rect'].x0<r.x1]
        assert len(stems)==1, (r,stems)
        stem=stems[0]; scale=2000/(zero-top)
        rows.append(dict(cohort=cohort,form='intact' if i<3 else 'hydrolysate',dose_g_kg=[.3,.4,.6][i%3],mean=(zero-r.y0)*scale,sem=stem.height*scale,bar_y=r.y0,zero_y=zero,axis_2000_y=top,sem_top_y=stem.y0,method='thesis vector geometry; approximate plotted means; not author numeric table',units='Native Figure 3.1 insulin area units; printed time/unit notation ambiguous, no conversion.',digitization_tolerance=15))
print(json.dumps(rows,indent=2))
