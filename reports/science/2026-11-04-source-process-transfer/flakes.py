"""Compare matched rolling thickness to transfers from earlier milling data."""
import json,math
from statistics import median
from model import read,error

def calculate():
    target=read("flake_inputs.json")["data"];prior=read("training.json")
    oat=prior['Heaton']['oats'][0]/prior['Heaton']['oats'][1]
    barley=prior['barley']
    bg=[barley[k+"_kernel"]["mean_120"]/barley[k+"_flour"]["mean_120"] for k in ['normal','high']]
    geo=math.sqrt(bg[0]*bg[1])
    common=median(pair[0]/pair[1] for pair in prior['Heaton'].values())
    pairs={'oat':(target['4']['Roasted 1.0 mm'],target['4']['Roasted 0.5 mm']),
           'barley':(target['6']['Steamed 1.0 mm'],target['6']['Steamed2 0.5 mm'])}
    measurements={}
    for ep in ['area120','area90','II120','II90']:
        diffs={g:a[ep][0]/b[ep][0] for g,(a,b) in pairs.items()}
        cross=diffs['oat']/diffs['barley']
        m={'equality':[1,1],'inverse_thickness':[.5,.5],'common_grain':[common,common],
           'grain_specific':[oat,geo],'grain_specific_normal':[oat,bg[0]],'grain_specific_high':[oat,bg[1]]}
        measurements[ep]={'observed':diffs,'oat_over_barley':cross,'forecasts':{k:{'oat_barley':vals,'oat_over_barley':vals[0]/vals[1],
          'mean_abs_log_error':(error(vals[0],diffs['oat'])+error(vals[1],diffs['barley']))/2,'cross_error':error(vals[0]/vals[1],cross)} for k,vals in m.items()}}
    # Thick normalized ratios occur in different source/conditioning pairs; pairwise covariance unavailable.
    grain_bound={}
    for k in ['normal','high']:
        x,y=barley[k+'_kernel'],barley[k+'_flour']
        lo=max(0,x['mean_120']-.05-x['sem_120']-.5)/(y['mean_120']+.05)
        hi=min(x['mean_120']+.05+x['sem_120']+.5,(x['mean_120']+.05)*10/9)/(y['mean_120']-.05)
        grain_bound[k]=[lo,hi]
    return {'data':measurements,'donors':{'oat':oat,'barley_normal_high':bg,'barley_geomean':geo,'Heaton_median':common},
            'barley_matched9_with_printed_rounding':grain_bound,
            'oat_lower_bound_printed_rounding':(1111-.5)/(1323+.5),
            'invariant':'If the same positive exponent k transports both log ratios, the forecast oat/barley double ratio is always greater than one. Exponent zero predicts one. Same ordering for a shared strictly increasing map.'}
if __name__=='__main__':print(json.dumps(calculate(),indent=2,allow_nan=False))
