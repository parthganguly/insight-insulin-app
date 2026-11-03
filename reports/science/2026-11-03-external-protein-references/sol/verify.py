import json, math
from pathlib import Path
base=Path(__file__).resolve().parents[1]
prior=json.loads((base/'mixed/reading.json').read_text())
y=prior['top_y']; z=prior['zero_y']
refs={'whey/soy':(z-y['whey'])/(z-y['soy']),'whey/CHO':(z-y['whey'])/(z-y['CHO']),'soy/CHO':(z-y['soy'])/(z-y['CHO'])}
means={'2h':{'whey':37.5,'soy':24.9,'CHO':41.4,'glucose':24.3},'final':{'whey':48.8,'soy':35.9,'CHO':63.8,'glucose':26.0}}
report={'external_ratios':refs,'Acheson':{}}
for window,m in means.items():
 rows={}
 for pair,p in refs.items():
  a,b=pair.split('/'); obs=m[a]/m[b]
  rows[pair]={'external_predicted':p,'observed_ratio_of_means':obs,'external_abs_log_error':abs(math.log(p/obs)),'tie_energy_abs_log_error':abs(math.log(obs)), 'native_forecast_conditional_on_local_denominator':p*m[b]}
 report['Acheson'][window]=rows
energy=459/184
report['Acheson']['2h_matched_glucose_anchor']={}
for a in ['whey','soy']:
 pred=refs[a+'/CHO']; obs=means['2h'][a]/means['2h']['glucose']
 report['Acheson']['2h_matched_glucose_anchor'][a]={'external_prediction':pred,'observed_ratio_of_means':obs,'external_abs_log_error':abs(math.log(pred/obs)),'energy_prediction':energy,'energy_abs_log_error':abs(math.log(energy/obs)),'tie_abs_log_error':abs(math.log(obs))}
report['Acheson']['note']='Final glucose 270 min; other final arms330 min. Final ratios to glucose not scored. Primary2h matched-glucose anchor is separate from high-CHO sensitivity. Equal-energy arms459kcal; glucose184kcal.'
r=json.loads((base/'public/readings.json').read_text())['total_insulin_AUC']['whey']
ratios={float(k):r['hydro'][k]/r['intact'][k] for k in r['intact']}
x=45/79.7; lo=.4; hi=.6; t=(x-lo)/(hi-lo)
preds={'nearest_dose':ratios[.6],'log_interpolation':math.exp((1-t)*math.log(ratios[lo])+t*math.log(ratios[hi])),'flat':1,'log_mean_three':math.exp(sum(map(math.log,ratios.values()))/3)}
obs=10.8/7.6
report['Power']={'dose_g_per_kg':x,'training_ratios':ratios,'3h_observed_ratio':obs,'3h_errors':{k:abs(math.log(v/obs)) for k,v in preds.items()},'predictions':preds,'2h':'UNAVAILABLE pending original source geometry; no substitution of3h or peak','3h_p_value':.21,'peak_ratio':299/234}
(base/'sol/independent_results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
