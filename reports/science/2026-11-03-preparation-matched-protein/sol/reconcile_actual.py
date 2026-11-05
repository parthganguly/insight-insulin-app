"""Independent stdlib checker of actual lab artifacts, no production code imported."""
from pathlib import Path
import json, math
P=Path(__file__).resolve().parent.parent
read=lambda x:json.loads((P/x).read_text(encoding='utf-8-sig'))
f=read('experiment/facts.json'); g=read('curves/graph-input.json'); out=read('experiment/comparison.json')
checks=[]
def check(label,a,b,tol=1e-7):
 ok=math.isclose(a,b,rel_tol=tol,abs_tol=tol); checks.append({'label':label,'status':'PASS' if ok else 'FAIL','independent':a,'reported':b})
t=g['minutes']; series={k:v['means'] for panel in g['panels'].values() for k,v in panel['series'].items()}
def net(y,end):
 return sum((min(t[i+1],end)-t[i])*((y[i]-y[0])+(y[i+1]-y[0]))/2 for i in range(len(t)-1) if t[i+1]<=end)
ratio=93/71
for key,pea,soy in [('published_150',3534.6,2654.0),('curve_net_120',net(series['pea_then_cho'],120),net(series['soy_then_cho'],120))]:
 block=out['primary_table_and_secondary_curve'][key]
 check(key+' observed ratio',pea/soy,block['observed_ratio'])
 for name,pred in [('source_matched_response',ratio),('same_composition_reference',1),('three_reference_projection',1.1076716983751969/1.2057135768062388),('substitution_slope_dry_product_mean_weight_scenario',math.exp(.1022204575597254*(.073-.075)*.4*75.9))]:
  check(key+' '+name+' ratio',pred,block['predictions'][name]['ratio'])
  check(key+' '+name+' logerror',abs(math.log(pred/(pea/soy))),block['predictions'][name]['absolute_log_error'])
  check(key+' '+name+' conditional',soy*pred,block['predictions'][name]['conditional_native_pea_using_local_soy'])
 check(key+' native pea',pea,block['native_pea'])
 check(key+' native soy',soy,block['native_soy_reference'])
box=[(z-p)/(z-s) for z in [635,636,637] for p in [542,543,544] for s in [564,565,566]]
check('reading box lower',min(box),out['external_ratio_shared_reading_box'][0]); check('reading box upper',max(box),out['external_ratio_shared_reading_box'][1])
geometry=[]
for panel in g['panels'].values():
 x0,x80=panel['x_at_0_and_80_pt']; y0,y180=panel['y_at_0_and_180_min_pt']
 for name,s in panel['series'].items():
  for i,((x,y),mean) in enumerate(zip(s['xy_pt'],s['means'])):
   check(name+f' geometry mean {i}',(x-x0)/(x80-x0)*80,mean,2e-5)
# Arithmetic sensitivity values, not inferential tests.
sensitivity={}
for end,shift in [(150,120),(120,90)]:
 sy=net(series['soy'],end); ch=net(series['cho'],end)
 sensitivity[end]={'soy_then_CHO_shifted':sy+net(series['cho'],shift),'CHO_then_soy_shifted':ch+net(series['soy'],shift),'unshifted_sum':sy+ch,'soy_first_alone':sy,'CHO_first_alone':ch,'observed_soy_then_CHO':net(series['soy_then_cho'],end),'observed_CHO_then_soy':net(series['cho_then_soy'],end)}
report={'checks':checks,'all_pass':all(x['status']=='PASS' for x in checks),'time_shift_sensitivity':sensitivity}
(P/'sol'/'reconciliation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS' if report['all_pass'] else 'FAIL',len(checks));print(json.dumps(sensitivity,indent=2))


# Exact integration of positive/negative parts of the baseline-relative mean
# interpolant; clipped trapezoids without crossing correction overestimate.
def parts(y,end,grid=None):
 ix=[i for i,x in enumerate(t) if x<=end and (grid is None or x in grid)]
 pos=neg=0.
 for ia,ib in zip(ix,ix[1:]):
  a,b=y[ia]-y[0],y[ib]-y[0]; dt=t[ib]-t[ia]
  if a>=0 and b>=0: pos+=dt*(a+b)/2
  elif a<=0 and b<=0: neg-=dt*(a+b)/2
  else:
   positive=max(a,b); negative=-min(a,b)
   pos+=dt*positive*positive/(2*(positive+negative));neg+=dt*negative*negative/(2*(positive+negative))
 return dict(net=pos-neg,positive=pos,B_mean_curve=neg)
secondary={name:{'native_grid120':parts(y,120),'grid0_30_60_90_120':parts(y,120,[0,30,60,90,120])} for name,y in series.items()}
(P/'sol'/'curve-grid-positive.json').write_text(json.dumps(secondary,indent=2)+'\n')
