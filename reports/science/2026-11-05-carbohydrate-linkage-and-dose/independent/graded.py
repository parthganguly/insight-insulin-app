import json,math
from pathlib import Path
q=.65477135;c=.526 # approximate parent scalar; independent first-stage scalar .5270513 retained separately
# Fig2 percentages represent mixed model adjusted differences / estimated control mean.
ratios={'HV50':.413,'PwO33':.420,'PwO50':.450,'T2D50':.522}
out={'reported120_ratios':ratios,'external_class_predictions':{'q':q,'own_manual_Holub_c':.5270512982102344,'equality':1},'log_errors':{}}
for n,r in ratios.items():out['log_errors'][n]={m:abs(math.log(v/r)) for m,v in out['external_class_predictions'].items()}
# Independent coarse Fig2 marker centres; raw y before own baseline subtraction.
t=[0,15,30,45,60,90,120,150,180]
curves={'HV50':{'scale':80/197,'MD':[244,172,102,107,143,178,208,237,249],'OM':[244,209,183,189,203,217,228,237,245]},'T2D50':{'scale':100/160,'MD':[515,506,483,465,456,455,473,489,500],'OM':[515,511,503,495,492,487,487,495,496]},'PwO33':{'scale':100/209,'MD':[230,164,86,89,134,193,223,232,236],'OM':[230,202,164,175,196,221,229,233,234]},'PwO50':{'scale':100/161,'MD':[527,478,418,376,406,480,498,516,520],'OM':[527,509,478,474,481,500,512,517,526]}}
def area(y,scale,end):return sum((t[j]-t[j-1])*((y[0]-y[j])+(y[0]-y[j-1]))*scale/2 for j in range(1,len(t)) if t[j]<=end)
out['signed_graph']={n:{arm:{str(e):area(a[arm],a['scale'],e) for e in [60,120,180]} for arm in ['MD','OM']} for n,a in curves.items()}
lo=out['signed_graph']['PwO33'];hi=out['signed_graph']['PwO50'];q33=lo['OM']['120']/lo['MD']['120'];out['signed_q33']=q33
out['portion']={}
for model,exp in [('linear',1),('WB',.7781175447184837),('no_change',0)]:
 f=(50/33)**exp
 out['portion'][model]={'factor':f,'low_control_anchored_MD50':lo['MD']['120']*f,'q33_control_anchored_OM50':lo['MD']['120']*f*q33,'dose_error_MD':abs(math.log(lo['MD']['120']*f/hi['MD']['120'])),'dose_error_OM':abs(math.log(lo['OM']['120']*f/hi['OM']['120']))}
out['native_q33_to50_logerr']=abs(math.log(.420/.450));out['manual_coordinates']=curves
Path(__file__).with_name('results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
