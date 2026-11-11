"""Independent coarse visual trace, stdlib; not inferred participant iAUC."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def area(t,v):
    return sum((t[i+1]-t[i])*((v[i]+v[i+1])/2-v[0]) for i in range(len(t)-1))
def errors(obs,pred):return {k:abs(math.log(v/obs)) for k,v in pred.items()}
ct=[0,15,30,60,90,120]
cv={'P':[13,24,61,58,27,23],'PF':[13,24,50,49,25,26],'L':[9,14,22,32,28,22],'LF':[13,20,24,24,22,19]}
ca={k:area(ct,v) for k,v in cv.items()}
mp=math.sqrt((12.8/19.9)*(12.3/19.9))
cp={'fixed':mp,'full_scaled':mp**2,'equality':1}
cr={'no_fat':ca['L']/ca['P'],'butter':ca['LF']/ca['PF']}
out={'collier':{'t':ct,'coarse_visual_means':cv,'signed_area120':ca,'ratios':cr,'predictions':cp,'geometric_midpoint_fixed_scaled':mp**1.5,'absolute_log_errors':{k:errors(v,cp) for k,v in cr.items()}}}
# +/-1.5 assay units at every marker, including separate arm baseline.
# Signed area perturbation bound=sum(abs(linear quadrature coefficients))*delta.
bound=2*(120-7.5)*1.5
out['collier']['reading_sensitivity']={'marker_delta':1.5,'area_bound':bound,'ratio_intervals':{label:[max(0,ca[a]-bound)/(ca[b]+bound),(ca[a]+bound)/(ca[b]-bound)] for label,a,b in [('no_fat','L','P'),('butter','LF','PF')]},'is_sampling_CI':False}
out['collier']['pooled_MALE']={k:sum(errors(v,cp)[k] for v in cr.values())/2 for k in cp}
out['collier']['astra_finer_read_ratios_comparison']={'no_fat':.542,'butter':.408,'note':'Seen after own trace; compatible with coarse reading bounds; not independent exact digitization.'}
tt=[0,15,30,45,60,90,120,150,180]
tv={'L':[18,22,30,27,29,29,22,22,20],'LS':[17,25,29,33,24,27,25,25,18],'B':[22,33,73,62,53,43,28,20,17],'BS':[18,41,80,78,71,39,25,18,15]}
ta={k:area(tt[:7],v[:7]) for k,v in tv.items()}
t180={k:area(tt,v) for k,v in tv.items()}
printed={'L':1695,'LS':1883,'B':3395,'BS':4716}
printed_sem={'L':322,'LS':422,'B':352,'BS':644}
wheat_fixed=math.sqrt((15.1/18.2)*(15.7/18.2))
pooled=math.sqrt(mp*math.sqrt((9.7/10.9)*(10/10.9)))
tp={'wheat_fixed':wheat_fixed,'wheat_scaled':wheat_fixed**(44.8/25),'pooled_fixed':pooled,'pooled_scaled':pooled**2,'equality':1}
tr={'unsalted':ta['L']/ta['B'],'salted':ta['LS']/ta['BS']}
out['thorburn']={'t':tt,'coarse_visual_means':tv,'signed_area120':ta,'signed_area180_coarse_check':t180,'printed180':printed,'printed180_SEM':printed_sem,'ratio120':tr,'printed180_ratios':{'unsalted':1695/3395,'salted':1883/4716},'predictions':tp,'absolute_log_errors120':{k:errors(v,tp) for k,v in tr.items()},'n_per_food':6,'n_shared':5,'common_added_milk_ml':80,'milk_AC':'unknown; not included in stated50g foodCHO','reading_sensitivity120':{'marker_delta':1.5,'area_bound':bound,'ratio_intervals':{label:[max(0,ta[a]-bound)/(ta[b]+bound),(ta[a]+bound)/(ta[b]-bound)] for label,a,b in [('unsalted','L','B'),('salted','LS','BS')]},'is_sampling_CI':False},'note':'Graph signed0–180 and printed180 summaries disagree beyond simple rounding; retain as distinct operators/uncertain extraction, no forced rescaling.'}
(ROOT/'curve_verification.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
