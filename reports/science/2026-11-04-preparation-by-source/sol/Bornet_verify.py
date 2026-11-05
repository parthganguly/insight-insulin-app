"""Independent visual-source transcription and frozen-rule calculations.
No target-fit model parameters; source SHA checked separately.
"""
import itertools,json,math
import hashlib,datetime
from pathlib import Path
R=.70627231
H0=.25748503
B=math.log(R)/math.log(H0)
# H30 graph percentages from Fig4 x-positions cross-checked Fig3 labels.
# reading ranges describe our image-reading allowance, not sample uncertainty.
DATA={
 'raw': {'wheat':(8.6,.4,11.,2.1,27),'cassava':(.7,.25,3.4,1.4,17),'legume':(7.3,.4,8.,1.2,35)},
 'gel': {'wheat':(32.9,.4,24.8,4.2,27),'cassava':(50.3,.4,29.2,4.8,17),'legume':(16.2,.4,19.1,4.1,35)},
 'industrial': {'wheat':(37.1,.4,22.5,3.7,27),'cassava':(40.2,.4,29.5,8.6,17),'legume':(12.2,.4,8.,1.3,32)},
}
# Figure2 crop pixel coordinates, curves explicitly identified from caption:
# wheat triangle, cassava open square, legume filled square. t30/60/90/120.
PIXELS={
 'raw': {'zero':(188,391.5),'slope':.0094,'scale':.77,
         'x':[279,367,456,544],
         'wheat':[330,320,333,349],'cassava':[374,373,373,381],'legume':[308,342,357,374]},
 'gel': {'zero':(181,842.5),'slope':.012,'scale':.769,
         'x':[275,363,451,538],
         'wheat':[635,630,721,778],'cassava':[570,594,727,774],'legume':[692,676,741,814]},
 'industrial': {'zero':(175,1289),'slope':.012,'scale':.775,
         'x':[269,356,445,535],
         'wheat':[1056,1066,1222,1269],'cassava':[1022,1047,1141,1205],'legume':[1196,1241,1250,1282]},
}

def transform(h):
 return {'direct_H30':h,'power_H30':h**B,'affine_H30':1-(1-R)*(1-h)/(1-H0)}

def auc_graph(g):
 p=PIXELS[g];a={}
 for k in ['wheat','cassava','legume']:
  ys=[0]+[(p['zero'][1]+p['slope']*(x-p['zero'][0])-y)/p['scale']
          for x,y in zip(p['x'],p[k])]
  area=sum(15*(v+w) for v,w in zip(ys,ys[1:]))/1000
  # Fixed coordinate allowance +/-3pixel marker +/-2pixel baseline;
  # slope variation +/-0.003 and scale +/-1%. Conservative per-arm bound.
  delta=sum(30 if i<3 else 15 for i in range(4))*6.5/p['scale']/1000+.01*area
  a[k]={'pmol_per_l_mean_curve':ys,'signed_auc120':area,'reading_interval':[area-delta,area+delta]}
 return a

def calculate():
 groups={}
 for g,ds in DATA.items():
  curves=auc_graph(g); comparisons={}
  for num,den in [('cassava','wheat'),('legume','wheat'),('legume','cassava')]:
   x,y=ds[num],ds[den];h=x[0]/y[0]
   pred={'equal_starch_form':1,'amylopectin_dose':(100-x[4])/(100-y[4]),**transform(h)}
   targets={'tabulated_auc180':x[2]/y[2],
            'reconstructed_signed_auc120':curves[num]['signed_auc120']/curves[den]['signed_auc120']}
   comparisons[f'{num}/{den}']={'h':h,'h_reading_interval':[(x[0]-x[1])/(y[0]+y[1]),(x[0]+x[1])/(y[0]-y[1])],
      'predictions':pred,'targets':targets,
      'absolute_log_errors':{ep:{m:abs(math.log(p/t)) for m,p in pred.items()} for ep,t in targets.items()}}
  scores={ep:{m:sum(comparisons[c]['absolute_log_errors'][ep][m] for c in ['cassava/wheat','legume/wheat'])/2
              for m in pred} for ep in targets}
  # Coordinate reading corner bounds for primary mean error (not clinical SEM).
  error_ranges={m:[math.inf,-math.inf] for m in pred}
  for hs in itertools.product(*[(ds[k][0]-ds[k][1],ds[k][0]+ds[k][1]) for k in ['wheat','cassava','legume']]):
   for m in pred:
    pp=[({'equal_starch_form':1,'amylopectin_dose':(100-ds[k][4])/(100-ds['wheat'][4]),**transform(hs[i]/hs[0])})[m]
        for i,k in [(1,'cassava'),(2,'legume')]]
    error=sum(abs(math.log(p/comparisons[c]['targets']['tabulated_auc180'])) for p,c in zip(pp,['cassava/wheat','legume/wheat']))/2
    error_ranges[m][0]=min(error_ranges[m][0],error);error_ranges[m][1]=max(error_ranges[m][1],error)
  groups[g]={'source_values':ds,'curves':curves,'comparisons':comparisons,'primary_mean_absolute_log_error':scores,'H30_reading_corner_score_range_auc180':error_ranges}
 inter={}
 for ep in ['tabulated_auc180','reconstructed_signed_auc120']:
  obs=groups['gel']['comparisons']['cassava/wheat']['targets'][ep]/groups['raw']['comparisons']['cassava/wheat']['targets'][ep]
  pred={m:groups['gel']['comparisons']['cassava/wheat']['predictions'][m]/groups['raw']['comparisons']['cassava/wheat']['predictions'][m]
        for m in groups['raw']['comparisons']['cassava/wheat']['predictions']}
  inter[ep]={'observed_interaction':obs,'predictions':pred,'absolute_log_errors':{m:abs(math.log(p/obs)) for m,p in pred.items()}}
 out={'H30_reading_units':'percentage points, ranges are reading bounds not assay/statistical intervals',
      'power_b':B,'groups':groups,'cassava_wheat_raw_to_gel_interaction':inter,
      'source':'Bornet1989 DOI10.1093/ajcn/50.2.315; Table5 p320,Fig2 p319,Fig3 p320,Fig4 p321'}
 # Paired within-cohort correlations unknown; raw and gel cohorts independent.
 rawdiff=3.4-11.;geldiff=29.2-24.8
 out['native180_additive_interaction']={
  'raw_cassava_minus_wheat':rawdiff,'gel_cassava_minus_wheat':geldiff,
  'difference_in_differences':geldiff-rawdiff,
  'raw_difference_se_envelope':[abs(2.1-1.4),2.1+1.4],
  'gel_difference_se_envelope':[abs(4.8-4.2),4.8+4.2],
  'difference_in_differences_se_envelope':[
    math.hypot(2.1-1.4,4.8-4.2),math.hypot(2.1+1.4,4.8+4.2)],
  'log_interaction':math.log(inter['tabulated_auc180']['observed_interaction']),
  'delta_log_interaction_se_envelope':[
    math.hypot(4.8/29.2-4.2/24.8,1.4/3.4-2.1/11),
    math.hypot(4.8/29.2+4.2/24.8,1.4/3.4+2.1/11)],
  'warning':'SE dependence envelope only, no sampling CI; delta method approximate at noisy denominator.'}
 root=Path(__file__).parent.parent
 coordinator_path=root/'bornet_results.json'
 coordinator=json.loads(coordinator_path.read_text()) if coordinator_path.exists() else None
 remap={'raw':{'wheat':'wheat','cassava':'manihot','legume':'smooth_pea'},
        'gel':{'wheat':'wheat','cassava':'manihot','legume':'smooth_pea'},
        'industrial':{'wheat':'extruded_wheat','cassava':'tapioca','legume':'mung_noodle'}}
 out['independent_reading_comparison']={g:{k:{
      'H30_independent_minus_coordinator':ds[k][0]-coordinator['groups'][g]['arms'][v]['H']['30']['value'],
      'auc120_relative_difference':groups[g]['curves'][k]['signed_auc120']/coordinator['groups'][g]['arms'][v]['signed120']-1}
      for k,v in remap[g].items()} for g,ds in DATA.items()} if coordinator else 'Coordinator file not present; optional comparison skipped.'
 out['coarse_independent_H20_check']={
  'raw':{'wheat':{'range':[5.5,7.5],'approx':6.5},
         'cassava':{'range':[0,1.0],'approx':None,'reason':'Near zero, axis/marker unresolved; no quantitative center forecast.'},
         'legume':{'range':[4.5,6.5],'approx':5.5}},
  'gel':{'wheat':{'range':[24,29],'approx':None,'reason':'Gel wheat/extruded wheat markers overlap; nominal joint center26.5.'},
         'cassava':{'range':[40,44],'approx':42},
         'legume':{'range':[12,15],'approx':13.5}},
  'industrial':{'wheat':{'range':[24,29],'approx':None,'reason':'Extruded wheat/gel wheat markers overlap.'},
         'cassava':{'range':[29,33],'approx':31},
         'legume':{'range':[7,10],'approx':8.5}},
  'method':'Independent Figure3 t20 column x about148.5 in stored crop, using curve symbols/labels, not coordinator coordinates.',
  'uncertainty':'Coarse image-reading intervals, not sample or assay uncertainty. Not scored as nine resolved means.'}
 assert math.isclose(inter['tabulated_auc180']['observed_interaction'],3.8092979127134723,rel_tol=1e-12)
 assert math.isclose(out['native180_additive_interaction']['difference_in_differences'],12,abs_tol=1e-12)
 assert all(len(v['curves'][k]['pmol_per_l_mean_curve'])==5 for v in groups.values() for k in ['wheat','cassava','legume'])
 Path(__file__).with_name('Bornet_results.json').write_text(json.dumps(out,indent=2))
 artifacts={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),Path(__file__).with_name('Bornet_results.json')]}
 source_path=root/'sources/bornet.pdf'
 expected_sha='8801cf69c4aaeb7127c22e77776d6c9f5bfcbf1dace14fbd85dae2671bd39880'
 source_sha=hashlib.sha256(source_path.read_bytes()).hexdigest() if source_path.exists() else None
 if source_sha is not None: assert source_sha==expected_sha
 receipt={'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_sha256':source_sha,
          'expected_source_sha256':expected_sha,'source_check':'verified' if source_sha else 'Optional raw scan absent; numerical replay completed.',
          'artifacts_sha256':artifacts,'independent_numeric_H30':True,'H20_independently_secured':'Coarse intervals only; three individual centers unresolved.',
          'table5_visual_checked':True,'fig2_visual_checked':True,'table2_individual_records_used':False,
          'native180_clipping_convention':'not specified by source; retain tabulated incremental areas',
          'graph_auc120':'signed integration of group mean graph; not participant-positive iAUC'}
 Path(__file__).with_name('Bornet_verification_receipt.json').write_text(json.dumps(receipt,indent=2))
 print(json.dumps(out,indent=2))

if __name__=='__main__':calculate()
