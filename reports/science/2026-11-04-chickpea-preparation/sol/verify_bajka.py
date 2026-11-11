"""Independent stdlib-only Bajka transfer arithmetic; run python verify_bajka.py."""
import json, math
from pathlib import Path
arms=['control','30%','60%']
wheat=[936.4/12,688.6/12,350.8/12]
starch=[45.3,44.9,42.5]
sugars=[2.76,3.45,5.67]
insulin=[4523,4189,2540]
sem=[1125,880.8,755.9]
# Visual estimates from individual marker groups, NOT exact source data.
# Enlarged figure retained; +-2 percentage points reasonable reading sensitivity.
observed={20:[38.5,31.5,24.5],120:[70.5,54.5,47.5]}
fit={t:[c*(1-math.exp(-k*t)) for c,k in [(68.3,.040),(51.4,.045),(44.9,.032)]] for t in [20,120]}
def ratios(v):return {'30/control':v[1]/v[0],'60/control':v[2]/v[0],'60/30':v[2]/v[1]}
result={'source':'https://pmc.ncbi.nlm.nih.gov/articles/PMC10131617/ supplemental table1; recipe and assay https://pmc.ncbi.nlm.nih.gov/articles/PMC7859705/ table1,table2,fig3A','target':{'operator':'arithmetic mean individual insulin incremental AUC0-120min','means':insulin,'SEM':sem,'ratios':ratios(insulin),'warning':'SEM is not paired-difference or ratio uncertainty; covariance unavailable'},'recipe_wheat_flour_g':wheat,'recipe_ratios':ratios(wheat),'assay':{}}
for kind,series in [('observed_visual_approximate',observed),('fit_model',fit)]:
 for t,h in series.items():
  grams=[s*x/100 for s,x in zip(starch,h)]
  result['assay'][f'{kind}_H{t}']={'hydrolysis_percent':h,'hydrolysed_starch_g':grams,'ratios':ratios(grams),'plus_bread_sugars_and_jam_0g_ratios':ratios([g+s for g,s in zip(grams,sugars)]),'plus_bread_sugars_and_jam_0_4g_ratios':ratios([g+s+.4 for g,s in zip(grams,sugars)])}
# Visual-reading worst-case endpoint intervals assume independent +-2pp.
for t,h in observed.items():
 lo=[s*(x-2)/100 for s,x in zip(starch,h)];hi=[s*(x+2)/100 for s,x in zip(starch,h)]
 result['assay'][f'observed_visual_approximate_H{t}']['reading_sensitivity_ratio_bounds']={key:[lo[a]/hi[b],hi[a]/lo[b]] for key,a,b in [('30/control',1,0),('60/control',2,0),('60/30',2,1)]}
if __name__=='__main__':
 out=Path(__file__).with_name('bajka-independent-results.json');out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))
