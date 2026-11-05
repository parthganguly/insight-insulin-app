"""Independent corrected O2 audit. Does not import author's calculation."""
import json, math
from pathlib import Path
P=Path(__file__).resolve().parent.parent
original=json.loads((P/'public/opus_study/RESULTS.json').read_text()); fixed=json.loads((P/'public/opus_study/corrected.json').read_text()); D=original['readings'];checks=[]
def ck(label,a,b): checks.append({'label':label,'independent':a,'reported':b,'status':'PASS' if math.isclose(a,b,rel_tol=1e-11,abs_tol=1e-11) else 'FAIL'})
for group,d0 in [('primary_calibrate_0.3','0.3'),('S1_calibrate_0.6','0.6')]:
 agg={k:{} for k in ['reciprocal','anchored_pred_intact_vs_measured_hydro','anchored_measured_intact_vs_pred_hydro']}
 for cell,data in fixed['corrected'][group]['cells'].items():
  s,d=cell.split('_'); os='whey' if s=='soy' else 'soy'
  I,H=D[s]['intact'][d],D[s]['hydro'][d]; O=I/H
  ck(group+' '+cell+' observed',O,data['observed_ratio_intact_over_hydro'])
  for model,record in data['models'].items():
   pred={}
   for f,opp in [('intact','hydro'),('hydro','intact')]:
    a=D[s][f][d0]
    pred[f]={'bridge_same_source':a*D[s][opp][d]/D[s][opp][d0],'no_change':a,'proportional_dose':a*float(d)/float(d0),'no_form_adjustment':D[s][opp][d],'bridge_cross_source':a*D[os][f][d]/D[os][f][d0]}[model]
   ck(group+' '+cell+' '+model+' intact',pred['intact'],record['pred_intact']);ck(group+' '+cell+' '+model+' hydro',pred['hydro'],record['pred_hydro'])
   ratios={'reciprocal':(pred['intact']/pred['hydro'],'reciprocal_ratio','reciprocal_error'),'anchored_pred_intact_vs_measured_hydro':(pred['intact']/H,'anchored_pred_intact_over_measured_hydro','anchored_A_error'),'anchored_measured_intact_vs_pred_hydro':(I/pred['hydro'],'anchored_measured_intact_over_pred_hydro','anchored_B_error')}
   for key,(ratio,rk,ek) in ratios.items():
    error=abs(math.log(ratio/O));ck(group+' '+cell+' '+model+' '+rk,ratio,record[rk]);ck(group+' '+cell+' '+model+' '+ek,error,record[ek]);agg[key].setdefault(model,[]).append(error)
   for f,ek in [('intact','anchored_A_error'),('hydro','anchored_B_error')]:
    ck(group+' '+cell+' '+model+' O1 identity '+f,record[ek],original['results'][group]['O1_cell_errors'][s+'_'+f+'_'+d][model])
 for key,models in agg.items():
  for model,values in models.items():ck(group+' mean '+key+' '+model,sum(values)/len(values),fixed['corrected'][group]['mean_abs_log_error'][key][model])
report={'all_pass':all(c['status']=='PASS' for c in checks),'checks':checks,'original_failure_preserved':'Original mixed-estimand O2 remains RED as historical output; correction independently verified, not retroactive validation.'}
(P/'sol'/'o2-correction-receipt.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS' if report['all_pass'] else 'FAIL',len(checks))
