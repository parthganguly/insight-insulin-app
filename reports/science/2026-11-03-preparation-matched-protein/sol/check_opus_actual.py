import pathlib,json,math
P=pathlib.Path(__file__).resolve().parent.parent
r=json.loads((P/'public/opus_study/RESULTS.json').read_text()); D=r['readings'];out=[]
for group,d0 in [('primary_calibrate_0.3','0.3'),('S1_calibrate_0.6','0.6')]:
 for s in ['soy','whey']:
  for f in ['intact','hydro']:
   other='hydro' if f=='intact' else 'intact'; other_s='whey' if s=='soy' else 'soy'
   for d in ['0.3','0.4','0.6']:
    if d==d0:continue
    a=D[s][f][d0]; obs=D[s][f][d]
    ps={'bridge_same_source':a*D[s][other][d]/D[s][other][d0],'no_change':a,'proportional_dose':a*float(d)/float(d0),'no_form_adjustment':D[s][other][d],'bridge_cross_source':a*D[other_s][f][d]/D[other_s][f][d0]}
    for model,p in ps.items():
     e=abs(math.log(p/obs));v=r['results'][group]['O1_cell_errors'][s+'_'+f+'_'+d][model]
     out.append({'label':group+' '+s+' '+f+' '+d+' '+model,'status':'PASS' if abs(e-v)<1e-12 else 'FAIL'})
(P/'sol'/'opus-o1-reconciliation.json').write_text(json.dumps(out,indent=2)+'\n');print('PASS' if all(x['status']=='PASS' for x in out) else 'FAIL',len(out))
