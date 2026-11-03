"""Independent posthoc external-process check; stdlib, no raw redistribution."""
import json,math,itertools
from pathlib import Path
ROOT=Path(__file__).resolve().parent
obs={'hard':14517/23224,'soft':21635/23224}
def score(p):
    return {'ratios':p,'mean_abs_log_vs_rice':sum(abs(math.log(p[k]/obs[k])) for k in obs)/2,'pred_hard_soft':p['hard']/p['soft'],'observed_hard_soft':obs['hard']/obs['soft'],'abs_log_hard_soft':abs(math.log((p['hard']/p['soft'])/(obs['hard']/obs['soft'])))}
# Fig1 baseliney341; own approximate topy2min288/278/124,6min194/284/213.
heights={'hard':[53,63,217],'soft':[147,57,128]}
fractions={k:[v/sum(a) for v in a] for k,a in heights.items()}
local={'hard':[.094,.034,.872],'soft':[.681,.125,.194]}
out={'status':'posthoc process transfer, NOT fresh validation','source':'10.3390/nu12092759 Fig1, Table2; local originalXML+JPG inspected','own_pixel_heights_RDS_SDS_RS':heights,'normalized_external_fractions':fractions,'approx_SDI_right_axis_percent':{'hard':16,'soft':44.5},'observed_Wei_insulin_ratios':obs,'methods':{}}
for label,fs in [('external_Zhao',fractions),('local_Wei',local)]:
    for dig in [1,2]:
        # dig1 RDS only;dig2 RDS+SDS. Hold current Wei rice fractions fixed.
        rf=.368 if dig==1 else .906
        for bg in [0,10]:
            p={k:(46.32*rf+13*sum(v[:dig])+bg)/(69.48*rf+bg) for k,v in fs.items()}
            out['methods'][f'{label}_{"RDS" if dig==1 else "RDSplusSDS"}_background{bg}']=score(p)
out['methods']['total_starch']=score({'hard':59.32/69.48,'soft':59.32/69.48})
out['methods']['equality']=score({'hard':1,'soft':1})
out['methods']['posthoc_process_limit']=score({'hard':2/3,'soft':1})
z={'hard':213.5/230.4,'soft':229.3/230.4}
out['Zhao_concurrent_glucose_ratios']=z
for label,f in [('no_scaling',.3),('Wei_whole_meal_fraction',23.2/79.5),('Wei_staple_fraction',1/3)]:
    out['methods']['Zhao_glucose_log_transfer_'+label]=score({k:v**(f/.3) for k,v in z.items()})
    out['methods']['Zhao_glucose_additive_transfer_'+label]=score({k:1+(v-1)*(f/.3) for k,v in z.items()})
gi_ratio=56.2/82.9
out['standalone_GI']={'MP':56.2,'HP':82.9,'MP_HP':gi_ratio,'observed_Wei_insulin_hard_soft':obs['hard']/obs['soft'],'contrast_abs_log_error':abs(math.log(gi_ratio/(obs['hard']/obs['soft']))),'caution':'25gAC standalone glucose-relativeGI; no same-dose riceGI supplied here; cannot useGI/100 as potato/riceinsulin ratio'}
sens=[]
for ds in itertools.product([-2,2],repeat=6):
    fs={k:[(h+ds[j*3+i])/sum(a[x]+ds[j*3+x] for x in range(3)) for i,h in enumerate(a)] for j,(k,a) in enumerate(heights.items())}
    p={k:(46.32*.368+13*v[0])/(69.48*.368) for k,v in fs.items()}
    sens.append(score(p))
out['external_RDS_reading_sensitivity']={'barheight_delta_px':2,'MALE_min':min(s['mean_abs_log_vs_rice'] for s in sens),'MALE_max':max(s['mean_abs_log_vs_rice'] for s in sens),'contrast_error_min':min(s['abs_log_hard_soft'] for s in sens),'contrast_error_max':max(s['abs_log_hard_soft'] for s in sens),'note':'rectangular barheight corner check; NOT samplingCI; axiszero and scaling assumed fixed'}
out['cautions']=['duration2min mapped hard,6min soft on physical direction; article Results reverses HP/MP order in one sentence','Zhao microwave1cmcubes+30gwater versusWei pressurecooker.75cmslices30seconds vs20min; process mismatch','leftFig1axis label g/100gstarch inconsistent with bars summingabout16.2; normalize eachtriplet; SDI independently consistent','external potato fraction transfer retains currentWei rice assay; not entirely historicalmeasurementfree','+10g background assumption not assay of digestibility','glucoseiAUC to insulin endpoint transfer posthoc, not insulinvalidation','Table2 concurrent0–120n17 ratios; excludepreload/HG arms','ZhaoHPandMPconcurrentTable2samelettera: no significantdifference established','GIstudy25gACreferences, mixedstudy50gACreference; keepdistinct']
(ROOT/'zhao_verification.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
