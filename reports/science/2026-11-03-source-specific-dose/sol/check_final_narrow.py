"""Final narrow independent verification; no previous receipts are overwritten."""
from pathlib import Path
import json,math,csv,itertools
R=Path(__file__).resolve().parent.parent
L=lambda p:json.loads((R/p).read_text(encoding='utf-8-sig'))
def ck(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for k in a:ck(a[k],b[k])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):ck(x,y)
    elif isinstance(a,(int,float)) and not isinstance(a,bool):assert math.isclose(a,b,rel_tol=1e-9,abs_tol=1e-9),(a,b)
    else:assert a==b,(a,b)
def quantities(a):
    return {**{'L'+k:a[k]/a['1'] for k in ['2','3','4','5']},'C_low':a['4']/a['2'],'C_high':a['5']/a['3'],'Delta':a['5']*a['2']/(a['3']*a['4']),'D_wheat':a['3']/a['2'],'D_mix':a['5']/a['4']}
s=L('public/transfer/SCORES_reconciled.json');p=L('public/transfer/PREDICTIONS.json')
for win,row in s['windows'].items():
    obs=quantities(row['areas']);ck(obs,row['observed'])
    for key,score in row['scores'].items():
        ref,m=key.split(':');v={**{'L'+k:v for k,v in p['forecasts'][ref]['levels'][m].items()},**p['forecasts'][ref]['contrasts'][m]};ck(v,score['pred']);e={k:abs(math.log(x/obs[k])) for k,x in v.items()};ck(e,score['abs_log_error']);ck(sum(e['L'+k] for k in ['2','3','4','5'])/4,score['mean_level_error']);ck(sum(e[k] for k in ['C_low','C_high','Delta'])/3,score['mean_contrast_error'])
# Verify canonical group areas against Astra's independent time courses.
rows=list(csv.DictReader((R/'astra/target-course.csv').open(encoding='utf-8-sig')))
for w,a,b in [('W1_0_120_signed_group',0,120),('W2_60_120_signed_group',60,120),('W3c_0_180_signed_group',0,180)]:
    if w not in s['windows']:continue
    for k,arm in zip(['1','2','3','4','5'],['control','wheat_low','wheat_high','blend_low','blend_high']):
        z=[(int(x['minute']),float(x['plasma_insulin_pmol_per_L_approx'])) for x in rows if x['arm']==arm];base=z[0][1];area=sum((t2-t1)*(x+y-2*base)/2 for (t1,x),(t2,y) in zip(z,z[1:]) if t1>=a and t2<=b);ck(area,s['windows'][w]['areas'][k])
result=L('mixed/result.json');pred=result['predictions']['relative'];actual=result['target_native'];anchor=3369.6;se=1516.5/math.sqrt(31);low,high=anchor-se,anchor+se
sens={}
for alt in ['reference_fit','source_line','ref_dose','paired_source_blind','energy']:
    points={low,high,anchor}
    for arm,row in pred.items():
        for m in ['source_curve',alt]:
            v=actual[arm]/row[m]
            if low<=v<=high:points.add(v)
    def mae(m,z):return sum(abs(z*row[m]-actual[k]) for k,row in pred.items())/4
    d=[mae('source_curve',z)-mae(alt,z) for z in points];sens[alt]=[min(d),max(d)]
ck({'scale_range_one_donor_SE':[low,high],'native_MAE_curve_minus_comparator_range':sens},L('mixed/anchor_sensitivity.json'))
leu=L('mixed/leucine.json');loc=leu['predictions']['per_bolus_substitution']['ratios'];truth=leu['observed'];positive=L('mixed/positive.json')['6']['ratios'];keys=['low_blend_over_wheat','high_blend_over_wheat'];constant=math.sqrt(loc[keys[0]]*loc[keys[1]]);al=lambda x,y:abs(math.log(x/y))
box=[]
for k in keys:
    a,b=positive[k];box.append([a,b]+[v for v in [loc[k],constant] if a<v<b])
d=[sum(al(loc[k],y)-al(constant,y) for k,y in zip(keys,ys))/2 for ys in itertools.product(*box)]
ck({'constant':constant,'signed_area_comparison':{'mean_two_errors_per_bolus':sum(al(loc[k],truth[k]) for k in keys)/2,'mean_two_errors_constant':sum(al(constant,truth[k]) for k in keys)/2,'change_error_per_bolus':al(loc['high_over_low_contrast'],truth['high_over_low_contrast']),'change_error_constant':al(1,truth['high_over_low_contrast'])},'positive_area_stressed_mean_error_per_bolus_minus_constant_outer':[min(d),max(d)]},L('mixed/fixed_enrichment.json'))
g=leu['g_leucine_per_bolus_at_group_mean_mass'];slopes={}
for dose in ['low','high']:
    lower=positive[dose+'_blend_over_wheat'][0];delta=g['blend_'+dose]-g['wheat_'+dose];slopes[dose]={'lower_positive_ratio':lower,'delta_leucine_g':delta,'exclusive_upper_slope':2*math.log(lower)/delta}
ck(slopes,L('mixed/slope_range.json'))
receipt={'status':'PASS','checks':['canonical reconciled source curves and all scored point quantities/errors for all candidates and available windows','anchor one-SE native-MAE exact piecewise-linear extrema','fixed enrichment constant and positive-area stress extrema','exclusive slope ranges'],'limitations':['No sampling inference.','Unusual native Fig3 label retained verbatim without conversion.']}
(R/'sol/FINAL_NARROW_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
