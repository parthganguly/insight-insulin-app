"""Independent stdlib-only checks. Run python verify.py; aggregate data only."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DONOR = ROOT.parent / 'public' / 'donor.json'
d = json.loads(DONOR.read_text(encoding='utf-8'))['geometric_areas']
mr = math.sqrt((d[0][2]/d[0][0])*(d[0][3]/d[0][0]))
mp = math.sqrt((d[1][2]/d[1][0])*(d[1][3]/d[1][0]))
pred = {'fixed':mp/mr,'scaled':(mp/mr)**2,'direct':d[0][0]/d[1][0],'equality':1.0}
out = {'rice_potato_predictions':pred}
lan = json.loads((ROOT/'lan2011.json').read_text())
out['lan2011']={}
for name, target in [('ratio_native_medians',9/20),('ratio_mean_individual_II',60/128)]:
    out['lan2011'][name]={'observed':target,'absolute_log_errors':{k:abs(math.log(v/target)) for k,v in pred.items()}}

rice_starch=90*.772
retained_rice_starch=60*.772
potato_starch=130*.1
rds_rice=.368
dig_rice=.368+.538
observed={'HP':14517/23224,'SP':21635/23224}
out['wei2026']={'observed_insulin_ratio':observed,'staple_exchange_fraction':23.2/69.5,'whole_meal_exchange_fraction':23.2/79.5,'untreated_total_starch_ratio':(retained_rice_starch+potato_starch)/rice_starch,'fractions':{}}
for name,rds,sds in [('HP',.094,.034),('SP',.681,.125)]:
    rdsg=retained_rice_starch*rds_rice+potato_starch*rds
    digg=retained_rice_starch*dig_rice+potato_starch*(rds+sds)
    out['wei2026']['fractions'][name]={'RDS_g':rdsg,'RDS_plus_SDS_g':digg,'RDS_ratio':rdsg/(rice_starch*rds_rice),'RDS_plus10g_ratio':(rdsg+10)/(rice_starch*rds_rice+10),'RDS_plus_SDS_ratio':digg/(rice_starch*dig_rice),'RDS_plus_SDS_plus10g_ratio':(digg+10)/(rice_starch*dig_rice+10),'table5_recomputed_percent':[100*rdsg/(retained_rice_starch+potato_starch),100*(digg-rdsg)/(retained_rice_starch+potato_starch)]}
gap=14517-(2/3)*23224
se_min=abs(801-(2/3)*2456)
se_max=801+(2/3)*2456
out['wei2026']['additive_floor']={'floor':2/3,'observed':observed['HP'],'ratio_gap':observed['HP']-2/3,'native_gap':gap,'gap_SEM_min':se_min,'gap_SEM_max':se_max,'max_abs_t19':abs(gap)/se_min,'min_abs_t19':abs(gap)/se_max,'two_sided_05_t19':2.093024054,'one_sided_05_t19':1.729132812,'any_admissible_correlation_reaches_one_sided_05':abs(gap)/se_min>=1.729132812}
out['wei2026']['posthoc_processing_bound']={'HP':2/3,'SP':1.0,'label':'assume hard-potato zero response, soft-potato like displaced rice, B=0; not fitted scientific law'}
out['wei2026']['unmodified_transport_to_mixture']={k:{'staple_one_third':2/3+1/(3*v),'whole_meal_fraction':1-(23.2/79.5)+(23.2/79.5)/v} for k,v in pred.items()}
out['wei2026']['unmodified_log_interpolation_to_mixture']={k:{'staple_one_third':v**(-1/3),'whole_meal_fraction':v**(-23.2/79.5)} for k,v in pred.items()}
out['wei2026']['RDS_RC_g']=rice_starch*rds_rice
out['wei2026']['RDS_plus_SDS_RC_g']=rice_starch*dig_rice

out['collier1984']={'printed_native_mean_areas':{'potato':3333,'potato_butter':3024,'lentil':1796,'lentil_butter':1324},'printed_SEM':{'potato':590,'potato_butter':452,'lentil':333,'lentil_butter':256},'lentil_over_potato':1796/3333,'lentil_butter_over_potato_butter':1324/3024,'ratio_of_ratios':(1324/3024)/(1796/3333),'n':7,'sampling_minutes':[0,15,30,60,90,120,180,240],'window_note':'Full experiment0–240; printed incremental areas not expressly window-qualified in results; do not label these2h.'}
assert out['wei2026']['additive_floor']['max_abs_t19'] < 1.729132812
assert abs(out['wei2026']['fractions']['HP']['table5_recomputed_percent'][0]-30.8)<.1
assert abs(out['wei2026']['fractions']['SP']['table5_recomputed_percent'][0]-43.7)<.1
(ROOT/'verification.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
