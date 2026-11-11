"""Replay the numeric summaries from public factual inputs. All generated files stay in a temporary folder."""
import csv
import hashlib
import json
import math
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def same(actual,expected,loc):
    if isinstance(expected,dict):
        assert actual.keys()==expected.keys(),loc
        for k in expected:same(actual[k],expected[k],loc+'/'+k)
    elif isinstance(expected,(list,tuple)):
        assert len(actual)==len(expected),loc
        for i,(a,b) in enumerate(zip(actual,expected)):same(a,b,f'{loc}/{i}')
    elif type(expected) in (int,float):
        assert type(actual) in (int,float) and math.isclose(actual,expected,rel_tol=2e-10,abs_tol=1e-10),loc
    else:
        assert actual==expected,loc

def calc(file,func):
    return runpy.run_path(str(ROOT/file))[func]()

def main():
    for plan,receipt in [('PLAN','FREEZE'),('EXTERNAL_PLAN','EXTERNAL_FREEZE'),('TRANSFER_PANEL','PANEL_FREEZE'),('MIXTURE_PLAN','MIXTURE_FREEZE'),('LABEL_PLAN','LABEL_FREEZE')]:
        assert hashlib.sha256((ROOT/(plan+'.md')).read_bytes()).hexdigest()==read(ROOT/(receipt+'.json'))['sha256']
    original=read(ROOT/'original_implementation_receipt.json')
    params=read(ROOT/'parameter_freeze.json')
    assert hashlib.sha256((ROOT/'wb_portions.json').read_bytes()).hexdigest()==params['wb_portions.json_sha256']
    assert hashlib.sha256((ROOT/'wb_parameters.json').read_bytes()).hexdigest()==params['PARAMS.json_sha256']
    print('PASS protocol chronology and original WB parameter freeze')
    donor=calc('graded.py','run')
    panels=calc('panels.py','compute')
    labels=calc('labels.py','compute')
    for value,name in [(donor,'graded_results'),(panels,'panels_results'),(labels,'label_results')]:
        same(value,read(ROOT/(name+'.json')),name)
    print('PASS nominal and hydrolysis forecasts, held portions and levels, separate external panels and label bounds')
    seq={'glucose':'G','fructose':'F','sucrose':'S','free_mixture':'M'}
    model_names={'composition':'composition','reference_dose_only':'mass','glucose_moiety_only':'glucose_only','equality':'equality'}
    other=read(ROOT/'sol/independent-results.json')
    for test in donor['tests']:
        sol=next(x for x in other['results'] if math.isclose(x['a'],test['a']) and
                 x['model']==model_names[test['model']] and (x['hydrolysis']==test['hydrolysis'] or x['model']=='equality'))
        for cells,refs in [(test['formulation'],sol['formulation']),([v for group in test['portion'].values() for v in group],sol['portion'])]:
            for actual in cells:
                (n,d),(b,e)=actual['numerator'],actual['denominator']
                key=f'{seq[n]}{d}/{seq[b]}{e}'
                ref=next(x for x in refs if x['comparison']==key)
                same(actual['predicted'],ref['predicted'],key)
                same(actual['observed'],ref['observed'],key)
                same(actual['absolute_log_error'],ref['ALE'],key)
        for cell in test['native_levels']:
            name,d=cell['arm'];ref=next(x for x in sol['levels'] if x['cell']==f'{seq[name]}{d}')
            same(cell['forecast'],ref['predicted'],'same-cohort native')
        # These fields were computed by the original Claude Code program on ingested grams.
        if not test['hydrolysis']:
            raw=original['nominal_program_output']['a_unity' if test['a']==1 else 'a_learned']
            same(test['formulation_error']['full_mean'],raw['formulation_objective'][test['model']],'original formulation')
            same(test['portion_error']['full_mean'],raw['portion_objective'][test['model']],'original portion')
    ref_labels=read(ROOT/'sol/label-results.json')['label_intervals']
    for name,case in labels.items():
        source={'muffin_fructose':'muffin_F/S','muffin_sucralose':'muffin_U/S'}.get(name,name)
        for a,by_r in ref_labels[source].items():
            shape='linear' if float(a)==1 else 'WB_exponent'
            for k,g in [('fixed_R','frozen'),('common_R_0_to_1','all_0_to_1')]:
                same(case['bounds'][shape+'_'+g]['min_max'],by_r[k],name)
    h=donor['independent_30g']
    assert all(x['absolute_log_error']['hydro_constituents']>x['absolute_log_error']['equality'] for x in h.values())
    assert original['original_hydrolysis_external_abs_log_error'] < h['1.0']['absolute_log_error']['equality']
    print('PASS independent graded predictions at both exponents, hydration correction, historical nominal objectives and input envelopes')
    with tempfile.TemporaryDirectory() as tmp:
        wd=Path(tmp);shutil.copytree(ROOT/'sol',wd/'sol');shutil.copyfile(ROOT/'wb_portions.json',wd/'wb_portions.json')
        for script,out in [('verify','independent-results'),('label_verify','label-results')]:
            subprocess.run([sys.executable,'-B','-I','-X','utf8',str(wd/'sol'/(script+'.py'))],stdout=subprocess.DEVNULL,check=True)
            same(read(wd/'sol'/(out+'.json')),read(ROOT/'sol'/(out+'.json')),script)
        shutil.copyfile(ROOT/'support/extract_mixture.py',wd/'extract_mixture.py')
        subprocess.run([sys.executable,'-B','-I','-X','utf8',str(wd/'extract_mixture.py')],cwd=wd,stdout=subprocess.DEVNULL,check=True)
        def rows(p):
            with p.open(encoding='utf8',newline='') as f:return list(csv.DictReader(f))
        for a,b in zip(rows(wd/'mixture_area.csv'),rows(ROOT/'mixture_area.csv'),strict=True):
            assert a['arm']==b['arm']
            for k in set(a)-{'arm'}:same(float(a[k]),float(b[k]),'digitization/'+k)
    print('PASS standalone independent scripts and free-mixture source-coordinate reconstruction')
if __name__=='__main__':main()
