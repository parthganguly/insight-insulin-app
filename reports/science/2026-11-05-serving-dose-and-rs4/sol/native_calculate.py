import json,math
from pathlib import Path
p=Path(__file__).parent
sources={'cookie':{'Y':229*60.,'D':36.28,'P':5.36,'fat':3.99,'kcal':214.7},'bar':{'Y':11871.6,'D':35.6,'P':6.16,'fat':2.18,'kcal':None}}
targets=[{'Y':19229.,'D':38.8,'P':7.1,'fat':16.,'kcal':328.},{'Y':12592.,'D':28.9,'P':6.1,'fat':14.4,'kcal':270.}]
score={'constant':lambda x:1.,'D':lambda x:x['D'],'D+P':lambda x:x['D']+x['P'],'macro':lambda x:4*x['D']+4*x['P']+9*x['fat'],'kcal':lambda x:x['kcal']}
out={'observed':{'levels':[x['Y'] for x in targets],'decrement':6637.,'ratio':12592/19229},'anchors':{}}
for a,s in sources.items():
 out['anchors'][a]={}
 for m,f in score.items():
  if m=='kcal' and s['kcal'] is None:continue
  vals=[s['Y']*f(x)/f(s) for x in targets];ratio=vals[1]/vals[0]
  out['anchors'][a][m]={'levels':vals,'decrement':vals[0]-vals[1],'ratio':ratio,'MAE':sum(abs(vals[i]-targets[i]['Y']) for i in range(2))/2,'ratio_abs_log_error':abs(math.log(ratio/(12592/19229)))}
(p/'native_results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
