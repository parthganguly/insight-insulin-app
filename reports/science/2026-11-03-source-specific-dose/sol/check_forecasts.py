"""Independent arithmetic checker. Requires sibling public/transfer and mixed artifacts."""
import importlib.util,json,math,hashlib,sys
sys.dont_write_bytecode = True
from pathlib import Path
R=Path(__file__).resolve().parent.parent

def load(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def close(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for k in a: close(a[k],b[k])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b): close(x,y)
    elif isinstance(a,(float,int)) and not isinstance(a,bool): assert math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-10),(a,b)
    else: assert a==b,(a,b)
def module(path):
    s=importlib.util.spec_from_file_location(path.stem,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
p=load(R/'public/transfer/PREDICTIONS.json')
for ref,rs in p['references'].items():
    pooled=math.sqrt(rs['7']*rs['9'])
    for arm,src in [('2','7'),('3','7'),('4','9'),('5','9')]:
        n=p['doses']['target_n_per_bolus'][arm];s=n/p['doses']['train_n_per_bolus'];c=s*p['doses']['train_cho_per_bolus']/p['doses']['target_cho_per_bolus']
        expected=[1+s*(rs[src]-1),1+c*(rs[src]-1),rs[src],1+s*(pooled-1),1.,1+n/p['doses']['target_cho_per_bolus']]
        for name,value in zip(['M1_abs_dose_increment','M2_pc_increment','M3_dose_flat','M4_pooled_dose','M5_no_change','M6_energy'],expected):close(value,p['forecasts'][ref]['levels'][name][arm])
    for name,v in p['forecasts'][ref]['levels'].items():
        close({'C_low':v['4']/v['2'],'C_high':v['5']/v['3'],'Delta':v['5']*v['2']/(v['3']*v['4']),'D_wheat':v['3']/v['2'],'D_mix':v['5']/v['4']},p['forecasts'][ref]['contrasts'][name])
# Independent interpolation, independent donor and anchor arithmetic.
mx=module(R/'mixed/transfer.py');out=mx.evaluate();a=3369.6
pea={k:1+(4668.7/a-1)*x/25 for k,x in [('pea_low',10),('pea_high',20)]}
whey={'whey_low':(9.5+(8.8-9.5)*(8.1-4.5)/4.5)/7.3,'whey_high':(8.8+(12-8.8)*(16.2-9)/9)/7.3}
y={**pea,**whey}
for arm,value in y.items():
    close(value,out['predictions']['relative'][arm]['source_curve']);close(value*a,out['predictions']['native'][arm]['source_curve'])
actual=out['target_native'];observed=actual['whey_high']*actual['pea_low']/(actual['pea_high']*actual['whey_low']);pred=y['whey_high']*y['pea_low']/(y['pea_high']*y['whey_low'])
close(abs(math.log(pred/observed)),out['scores']['source_curve']['contrast_errors']['dose_change_in_source_contrast'])
for method,score in out['scores'].items():
    vals={arm:row[method] for arm,row in out['predictions']['relative'].items()}
    errors=[abs(math.log(v/(actual[k]/actual['glucose']))) for k,v in vals.items()]
    close(sum(errors)/4,score['ratio_level_mae'])
    close(sum(abs(v*a-actual[k]) for k,v in vals.items())/4,score['native_mae'])
    expected={'whey_pea_low':vals['whey_low']/vals['pea_low'],'whey_pea_high':vals['whey_high']/vals['pea_high'],'whey_dose':vals['whey_high']/vals['whey_low'],'pea_dose':vals['pea_high']/vals['pea_low'],'dose_change_in_source_contrast':vals['whey_high']*vals['pea_low']/(vals['pea_high']*vals['whey_low'])}
    close(expected,score['predicted_contrasts'])
    for k,v in expected.items():close(abs(math.log(v/out['target_contrasts'][k])),score['contrast_errors'][k])
# Independently verify omission diagnostics, retaining unsupported cells as null.
om=load(R/'mixed/omission.json');curves=out['predictions']['source_knots']
for row in om:
    forecast={}
    for arm,x in {'pea_low':10,'pea_high':20,'whey_low':8.1,'whey_high':16.2}.items():
        source=arm.split('_')[0];knots=[(d,v) for d,v in curves[source] if not(source==row['source'] and d==row['removed_knot'])]
        value=None
        for (d,v),(e,w) in zip(knots,knots[1:]):
            if d<=x<=e:value=v+(w-v)*(x-d)/(e-d);break
        forecast[arm]=value
    close(forecast,row['forecasts']);covered=[k for k,v in forecast.items() if v is not None];close(len(covered),row['coverage'])
    close(sum(abs(math.log(forecast[k]/(actual[k]/actual['glucose']))) for k in covered)/len(covered),row['mean_log_error_on_available'])
    change=None if len(covered)<4 else forecast['whey_high']*forecast['pea_low']/(forecast['pea_high']*forecast['whey_low'])
    close(change,row['change']);close(None if change is None else abs(math.log(change/observed)),row['change_error'])
leu=load(R/'mixed/leucine.json');g={a:0.245*c for a,c in {'wheat_low':28.6*.056,'wheat_high':57.1*.056,'blend_low':14.3*.056+7.1,'blend_high':28.6*.056+14.2}.items()};close(g,leu['g_leucine_per_bolus_at_group_mean_mass'])
for name,n in [('per_bolus_substitution',1),('cumulative_four_boluses',4)]:
    low=math.exp(n*.1022204575597254*(g['blend_low']-g['wheat_low']));high=math.exp(n*.1022204575597254*(g['blend_high']-g['wheat_high']))
    vals={'low_blend_over_wheat':low,'high_blend_over_wheat':high,'high_over_low_contrast':high/low};close(vals,leu['predictions'][name]['ratios'])
    close({k:abs(math.log(v/leu['observed'][k])) for k,v in vals.items()},leu['predictions'][name]['abs_log_error'])
# Independently verify every scored point prediction and error in both Opus reading tolerances.
for filename in ['SCORES_opus.json','SCORES_opus_h15.json']:
    scored=load(R/'public/transfer'/filename)
    for win,data in scored['windows'].items():
        a=data['areas'];obs={'L'+k:a[k]/a['1'] for k in ['2','3','4','5']};obs.update(C_low=a['4']/a['2'],C_high=a['5']/a['3'],Delta=a['5']*a['2']/(a['3']*a['4']),D_wheat=a['3']/a['2'],D_mix=a['5']/a['4']);close(obs,data['observed'])
        for key,row in data['scores'].items():
            ref,method=key.split(':');f=p['forecasts'][ref];vals={'L'+k:v for k,v in f['levels'][method].items()};vals.update(f['contrasts'][method]);close(vals,row['pred']);errs={k:abs(math.log(v/obs[k])) for k,v in vals.items()};close(errs,row['abs_log_error']);close(sum(errs['L'+k] for k in ['2','3','4','5'])/4,row['mean_level_error']);close(sum(errs[k] for k in ['C_low','C_high','Delta'])/3,row['mean_contrast_error'])
receipt={'status':'PASS','checks':['all frozen Dutch candidate levels and derived contrasts','all Oxford methods native and relative levels and loss','all Oxford source and dose contrasts and loss','all donor omission forecasts coverage and losses','both frozen leucine dose conventions','all Opus scored point predictions contrasts and losses in both tolerance files'],'limitations':['Point estimates and graph reading stress only; no paired inference.','Opus score bounds not independently checked here.']}
(R/'sol/FORECAST_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
