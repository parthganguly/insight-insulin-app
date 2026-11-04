"""Aggregate-only verifier. Public source is streamed to BytesIO; no rows/IDs persisted."""
import csv,hashlib,io,json,math,statistics as st,urllib.request,zipfile,xml.etree.ElementTree as E
from pathlib import Path
URL='https://pmc-oa-opendata.s3.amazonaws.com/PMC12286859.1/42255_2025_1309_MOESM4_ESM.xlsx'
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def area(t,y,mode):
 out=0.
 for a,b,u,v in zip(t,t[1:],y,y[1:]):
  dt=b-a
  if mode=='signed':out+=dt*(u+v)/2
  elif mode=='positive_nodes':out+=dt*(max(u,0)+max(v,0))/2
  elif u>=0 and v>=0:out+=dt*(u+v)/2
  elif u<=0 and v<=0:pass
  elif u>0:out+=dt*u*u/(2*(u-v))
  else:out+=dt*v*v/(2*(v-u))
 return out

def main():
 data=urllib.request.urlopen(URL,timeout=60).read();digest=hashlib.sha256(data).hexdigest()
 assert digest=='00eb9d8e0337ef722010a699fecbd291e51ae35533589f25c561902dd030152c'
 z=zipfile.ZipFile(io.BytesIO(data));ss=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
 root=E.fromstring(z.read('xl/worksheets/sheet2.xml'));cells={}
 for c in root.findall('.//s:c',NS):
  v=c.find('s:v',NS)
  if v is not None:
   text=v.text
   if c.get('t')=='s':text=ss[int(text)]
   cells[c.get('r')]=text
 times=[float(cells[f'B{r}']) for r in range(3,12)]
 assert times==[0,15,30,45,60,90,120,150,180]
 groups={x:{} for x in ['Broken','Intact-S','Intact-C']}
 for addr,arm in list(cells.items()):
  if addr.endswith('1') and addr[:-1].isalpha() and arm in groups:
   col=addr[:-1];pid=cells[col+'2'];values=[float(cells[f'{col}{r}']) for r in range(3,12)]
   assert len(values)==9 and all(math.isfinite(x) for x in values)
   assert pid not in groups[arm]
   groups[arm][pid]=values
 sets=[set(x) for x in groups.values()];assert sets[0]==sets[1]==sets[2] and len(sets[0])==10
 ids=sorted(sets[0]);agg=list(csv.DictReader((Path(__file__).parent.parent/'astra/aggregate.csv').open()))
 def lookup(study,arm,measure,minute):
  return float(next(x['value'] for x in agg if x['study']==study and x['arm']==arm and x['measure']==measure and x['minutes']==format(minute,'g')))
 means={a:[st.mean([v[i] for v in records.values()]) for i in range(9)] for a,records in groups.items()}
 discrepancy=max(abs(means[a][i]-lookup('Cai2025',a,'insulin_uU_mL',t)) for a in groups for i,t in enumerate(times))
 assert discrepancy<.3,'Group figure mismatch exceeds tolerance'
 out={'source':URL,'source_sha256':digest,'operator':'participant positive above own t0; exact baseline-crossing split; 0-120min','complete_paired_n':10,'matching_subject_sets':True,'max_absolute_difference_from_digitized_group_means_uU_mL':discrepancy,'group_concentration_means':{a:dict(zip(times,v)) for a,v in means.items()},'endpoints':{}}
 endpoints={}
 for mode in ['exact_positive','signed','positive_nodes']:
  records={a:[area(times[:7],[x-v[0] for x in v[:7]],mode) for pid in ids for v in [d[pid]]] for a,d in groups.items()}
  endpoints[mode]=records
  out['endpoints'][mode]={a:{'n':len(v),'mean':st.mean(v),'SD':st.stdev(v),'SEM':st.stdev(v)/math.sqrt(len(v))} for a,v in records.items()}
 contrasts={};primary=endpoints['exact_positive']
 for label,a,b in [('C/B','Intact-C','Broken'),('S/B','Intact-S','Broken'),('C/S','Intact-C','Intact-S')]:
  x,y=primary[a],primary[b];mx,my=st.mean(x),st.mean(y);r=mx/my
  logsem=st.stdev([u/mx-v/my for u,v in zip(x,y)])/math.sqrt(10)
  contrasts[label]={'ratio_of_means':r,'delta_SEM_log_ratio':logsem,'delta_SEM_ratio':r*logsem,'paired_mean_difference':mx-my,'paired_difference_SEM':st.stdev([u-v for u,v in zip(x,y)])/math.sqrt(10),'sensitivity_ratios':{mode:st.mean(d[a])/st.mean(d[b]) for mode,d in endpoints.items()}}
 out['contrasts']=contrasts
 for a,v in means.items():
  signed_group=area(times[:7],[x-v[0] for x in v[:7]],'signed')
  assert math.isclose(signed_group,st.mean(endpoints['signed'][a]),abs_tol=1e-9)
 assert math.isclose(area([0,2],[2,-2],'exact_positive'),1)
 assert math.isclose(area([0,2],[-2,2],'exact_positive'),1)
 assert math.isclose(area([0,2],[2,-2],'positive_nodes'),2)
 out['integration_checks']={'crossing_triangles_verified':True,'linearity_signed_mean_curve_matches_mean_individual':True}
 htimes=[0,15,30,60,90,120]
 donor={a:area(htimes,[lookup('Alshaalan2024',a,'insulin_uU_mL',t)-lookup('Alshaalan2024',a,'insulin_uU_mL',0) for t in htimes],'signed') for a in ['ICC','RCC']}
 R=donor['ICC']/donor['RCC']
 hratio=lookup('Alshaalan2024','ICC','measured_amylo_g_serving',20)/lookup('Alshaalan2024','RCC','measured_amylo_g_serving',20)
 beta=math.log(R)/math.log(hratio)
 d20={a:lookup('Cai2025',a,'measured_amylo_g_serving',20) for a in groups}
 d={'C/B':d20['Intact-C']/d20['Broken'],'S/B':d20['Intact-S']/d20['Broken'],'C/S':d20['Intact-C']/d20['Intact-S']}
 forecasts={'tie':{'C/B':1,'S/B':1,'C/S':1},'categorical_hummus':{'C/B':R,'S/B':R,'C/S':1},'D20':d,'anchored_S':{'C/B':R*d['C/S'],'S/B':R,'C/S':d['C/S']},'external_power':{k:v**beta for k,v in d.items()},'external_assay120':{'C/B':21.7/63,'S/B':21.7/63,'C/S':1}}
 out['donor']={'signed_mean_curve_AUC0_120':donor,'R':R,'hummus_D20_ratio':hratio,'externally_fitted_beta':beta}
 out['forecast_comparison']={}
 for name,f in forecasts.items():
  errors={k:abs(math.log(v/contrasts[k]['ratio_of_means'])) for k,v in f.items()}
  out['forecast_comparison'][name]={'predicted_ratios':f,'absolute_log_ratio_errors':errors,'primary_mean_absolute_log_ratio_error':st.mean([errors['C/B'],errors['S/B']]),'secondary_C_S_absolute_log_ratio_error':errors['C/S']}
 out['qualifications']=['Ten complete crossover participants only; group means not individual predictive validation.','Delta SEM uses actual paired covariance, asymptotic approximation only; not a small-sample exact confidence interval.','Donor is graph-derived signed group-curve AUC, different operator from participant-positive target.','Assay D20 is independent graph reading in astra/aggregate.csv, not raw assay records.','One externally fitted exponent from one donor contrast is not an identified biological relation.','Only safe cohort aggregates serialized. Raw workbook, subject identifiers and individual records/results remain transient in memory.']
 dest=Path(__file__).with_name('cai-independent-aggregate.json');dest.write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(out,indent=2))
if __name__=='__main__':main()
