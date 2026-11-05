import math,json
from pathlib import Path
p=Path(__file__).parent
donor={'D':[51.,51.],'F':[5.,20.],'Y':[8758.,3659.]}
target={'D':[35.60,35.23,34.86],'F':[2.01,21.06,29.69],'Y':[11871.6,8096.3,7533.8]}
r=(donor['Y'][1]/donor['Y'][0])/(donor['D'][1]/donor['D'][0])
k=math.log(r)/(donor['F'][1]/donor['D'][1]-donor['F'][0]/donor['D'][0])
models={m:[] for m in ['equality','available','generic','density']}
rows=[]
for j in (1,2):
 d=target['D'][j]/target['D'][0]
 delta=target['F'][j]/target['D'][j]-target['F'][0]/target['D'][0]
 obs=target['Y'][j]/target['Y'][0]
 pred={'equality':1.,'available':d,'generic':d*r,'density':d*math.exp(k*delta)}
 for m,x in pred.items():models[m].append(abs(math.log(x/obs)))
 rows.append({'target_index':j,'D_ratio':d,'density_delta':delta,'observed_ratio':obs,'predictions':pred,'absolute_log_errors':{m:abs(math.log(x/obs)) for m,x in pred.items()}})
secondary={'observed':target['Y'][2]/target['Y'][1],'predictions':{m:rows[1]['predictions'][m]/rows[0]['predictions'][m] for m in models}}
secondary['absolute_log_errors']={m:abs(math.log(v/secondary['observed'])) for m,v in secondary['predictions'].items()}
out={'donor':donor,'target':target,'generic_factor':r,'k':k,'donor_density_delta':15/51,'primary':rows,'MALE':{m:sum(e)/len(e) for m,e in models.items()},'secondary':secondary,'note':'Ratios of marginal arithmetic means, not mean participant ratios. No paired uncertainty inferred. Donor positive-only iAUC operator not explicitly documented; transfer conditional.'}
(p/'independent_results.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
