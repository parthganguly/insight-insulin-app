import json,math,itertools,pathlib
p=pathlib.Path(__file__).resolve().parent;out={};obs=[533,525,680]
for actual in [False,True]:
 v=[23*192,19*153,42*202]
 if actual:v=[a*b/80 for a,b in zip(v,[77,74.7,77.9])]
 e=[abs(math.log(v[a]/v[b])-math.log(obs[a]/obs[b])) for a,b in itertools.combinations(range(3),2)]
 out['arm_mean_mass' if actual else '80kg']={'input_proxy':v,'pair_errors':e,'MALE':sum(e)/3,'equality_MALE':sum(abs(math.log(obs[a]/obs[b])) for a,b in itertools.combinations(range(3),2))/3}
(p/'optional_fii_stress.json').write_text(json.dumps(out,indent=2))
