"""Partial identification on the displayed insulin grid; no imputed participants or interpolation across extra visits."""
import json
from wheat import calculate,trap
from model import read,coefficients

def run():
    inputs=read('wheat_inputs.json');graph=inputs['figure2'];arms=inputs['arms']
    stop=120;m=graph['time'].index(stop)+1;t=graph['time'][:m]
    factor=1800/(graph['tick_0']-graph['tick_1800'])
    base_eps=graph['baseline_error_px'];mark_eps=graph['marker_error_px']
    b_weight=t[1]/2;later=stop-b_weight
    bands={}
    for k,arm in arms.items():
        v=[(graph['tick_0']-z)*factor for z in arm['y'][:m]]
        gross=trap(t,v);signed=gross-stop*v[0]
        # For each subject positive area >= signed area and <= gross concentration area.
        # Positivity of all means after baseline makes the Jensen bound equal to signed here.
        lo=max(0,signed);hi=gross
        rounded_lo=max(0,lo-factor*later*(base_eps+mark_eps))
        rounded_hi=hi+factor*(b_weight*base_eps+later*mark_eps)
        bands[k]={'signed_lower':lo,'gross_upper':hi,'with_marker_reading':[rounded_lo,rounded_hi]}
    pair={}
    preds=calculate()['pairs']
    for label in preds:
        a,b=label.split('/');x,y=bands[a],bands[b]
        intervals=[x['signed_lower']/y['gross_upper'],x['gross_upper']/y['signed_lower']]
        read_range=[x['with_marker_reading'][0]/y['with_marker_reading'][1],x['with_marker_reading'][1]/y['with_marker_reading'][0]]
        pair[label]={'ratio_envelope':intervals,'with_reading':read_range,'inside_outer_envelope':{k:read_range[0]<=v<=read_range[1] for k,v in preds[label]['pred'].items()}}
    return {'arm_area_units':'pg·min/mL, displayed 0–120 grid','arms':bands,'ratio_bounds':pair,
            'assumptions':'Each plotted time mean for an arm represents the same complete sample within that arm; fasting baseline, nonnegative concentrations, linear segments on the displayed grid. Only the graph conventions and coordinate errors specified here. Not population inference, sharpness, or equality with individual study AUC.'}
if __name__=='__main__':print(json.dumps(run(),indent=2))
