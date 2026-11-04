"""How much can any common nonnegative offset change two food scores?"""
import json
from model import read

def run():
    inp=read('hoebler_inputs.json')['arms']
    # Astra's figure pixels: assay 0 at y570, 80% at y183; clinical axis 0 at 1080, 150 at 715.
    # A +/-2-pixel simultaneous shift of every post-baseline clinical reading is worst for the signed group trapezoid.
    percent_band=2*80/(570-183)
    area_band=2*150/(1080-715)*(120-15/2)
    rows={}
    for a,b in [('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]:
        x,y=inp[a],inp[b]
        h=x['total_starch']/y['total_starch']
        measured=[h*(x['pct30']-percent_band)/(y['pct30']+percent_band),
                  h*(x['pct30']+percent_band)/(y['pct30']-percent_band)]
        # (q+d_a)/(q+d_b) is a convex combination of 1 and d_a/d_b,
        # weights depending on d_b and q. q=0 gives direct release.
        all_q=[min(1,measured[0]),max(1,measured[1])]
        clinical=[(x['signed120']-area_band)/(y['signed120']+area_band),
                  (x['signed120']+area_band)/(y['signed120']-area_band)]
        rows[a+'/'+b]={'H30_marker_range':measured,'all_q_nonnegative_envelope':all_q,
                       'signed120_reading_range':clinical,'intervals_overlap':all_q[0]<=clinical[1] and clinical[0]<=all_q[1]}
    return {'conditional':'All nonnegative offsets, fixed food measurements, H30 and signed120; simultaneous +/-2-pixel reading bounds only. Any positive common change of mass scale still has this envelope. No population intervals.', 'pairs':rows}
if __name__=='__main__':print(json.dumps(run(),indent=2))
