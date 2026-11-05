import json,math
from pathlib import Path
p=Path(__file__).parent
old=json.loads((p/'independent_results.json').read_text())
t=old['target']; x=[row['density_delta'] for row in old['primary']]; z=[math.log(row['observed_ratio']/row['D_ratio']) for row in old['primary']]
a=sum(z)/2;b=sum(v*w for v,w in zip(x,z))/sum(v*v for v in x)
D=[36.28,12.71];F=[.55,24.13];Y=[229.,124.]
d=D[1]/D[0];dd=F[1]/D[1]-F[0]/D[0];obs=Y[1]/Y[0]
pred={'equality':1.,'D':d,'wheat_generic':d*old['generic_factor'],'wheat_density':d*math.exp(old['k']*dd),'potato_generic':d*math.exp(a),'potato_density':d*math.exp(b*dd),'label_energy':129.7/214.7,'macro_energy':(4*12.71+4*4.92+9*3.92)/(4*36.28+4*5.36+9*3.99)}
out={'potato_log_generic':a,'potato_density_slope':b,'cookie_D_ratio':d,'cookie_density_delta':dd,'cookie_observed':obs,'cookie_residual_factor':obs/d,'threshold_D_exponent':math.log(obs)/math.log(d),'predictions':pred,'absolute_log_errors':{k:abs(math.log(v/obs)) for k,v in pred.items()},'macro_energy_control':4*36.28+4*5.36+9*3.99,'macro_energy_fibre':4*12.71+4*4.92+9*3.92}
(p/'cookie_results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
