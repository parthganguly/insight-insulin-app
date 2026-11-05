import json,math
from pathlib import Path
q=.65477135;w=(1+1.2/8.1)/2
# Aggregate numerical facts independently checked against source excerpts/XML.
SukS=[0,71.39714,78.38834,28.73971];SukI=[0,33.76056,59.81177,11.65279]
Zs=[70.4,313.4,432.4,467.1,319.3,178.5];Zi=[74.4,196.4,249.9,356,310.4,246.9]
def auc(t,y):return sum((t[j]-t[j-1])*(y[j]+y[j-1])/2 for j in range(1,len(t)))
obs={'Suklaew':auc([0,30,60,120],SukI)/auc([0,30,60,120],SukS),'Zhang':auc([0,15,30,60,90,120],[x-Zi[0] for x in Zi])/auc([0,15,30,60,90,120],[x-Zs[0] for x in Zs]),'vanCan_lunch':5635.3515/7069.575}
rows={}
for name,B,d in [('Suklaew',27,40),('Zhang',24,50),('vanCan_lunch',30,25)]:
 preds={'equality':1,'grams':1,'named_q1':1,'q_whole':q,'dilution_w1':(B+d*q)/(B+d),'combined':(B+d*q*w)/(B+d*w)}
 rows[name]={'B':B,'d':d,'observed_signed120':obs[name],'predicted_ratios':preds,'abs_log_errors':{k:abs(math.log(v/obs[name])) for k,v in preds.items()}}
# Independent readers' approximate 120-min PwO areas, product-specific.
readers={'Sol':{'MD33':4133.971291866029,'OM33':1571.7703349282297,'MD50':5715.83850931677,'OM50':2403.726708074534},'mixed_reader':{'MD33':4105.4,'OM33':1645.1,'MD50':5595.3,'OM50':2508.5}}
portion={}
for name,a in readers.items():
 portion[name]={}
 for product in ['MD','OM']:
  R=a[product+'50']/a[product+'33'];e=math.log(R)/math.log(50/33)
  portion[name][product]={'observed_50_over33':R,'implied_two_point_exponent':e,'log_errors':{m:abs(math.log((50/33)**b/R)) for m,b in [('linear',1),('WB',.7781175447184837),('no_change',0)]}}
out={'q':q,'w':w,'mixed':rows,'portion_readings':portion,'cautions':['vanCan B30 d25 are energy shares with common carbohydrate factor cancelled, not observed gram doses.','Native positive area endpoint unavailable for these graph comparisons.','Linear vs WB differences depend on product and graph readings.']}
Path(__file__).with_name('results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
