"""Offline replay of both co-lead implementations and independent computations. Python 3.9+."""
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

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def same(actual, expected, name):
    if isinstance(expected, dict):
        assert actual.keys() == expected.keys(), name
        for key in expected:
            same(actual[key], expected[key], f'{name}/{key}')
    elif isinstance(expected, list):
        assert len(actual) == len(expected), name
        for i, (a, b) in enumerate(zip(actual, expected)):
            same(a, b, f'{name}/{i}')
    elif type(expected) in (float, int):
        assert type(actual) in (float, int) and math.isclose(actual, expected, rel_tol=2e-11, abs_tol=1e-10), name
    else:
        assert actual == expected, name

def main():
    for plan, receipt in [('PLAN','FREEZE'),('EXTENSION_PLAN','EXTENSION_FREEZE'),('NATIVE_PLAN','NATIVE_FREEZE')]:
        assert digest(ROOT/(plan+'.md')) == read(ROOT/(receipt+'.json'))['sha256']
    frozen = read(ROOT/'opus/FREEZE_RECEIPT.json')
    for name in ('inputs.json','rs_transfer.py','FORECASTS.json','../PLAN.md'):
        assert digest(ROOT/'opus'/name) == frozen[name]
    assert digest(ROOT/'extension/PARAMS.json') == read(ROOT/'extension/FREEZE_RECEIPT.json')['PARAMS.json_sha256']
    print('PASS three coordinator protocols and both Opus freezes')
    first = runpy.run_path(str(ROOT/'opus/rs_transfer.py'))
    forecasts = first['forecasts']()
    same(forecasts, read(ROOT/'opus/FORECASTS.json'), 'wheat forecasts')
    primary = first['score'](forecasts)
    same(primary, read(ROOT/'opus/RESULTS.json'), 'primary and secondary potato results')
    ext = runpy.run_path(str(ROOT/'extension/extension.py'))['compute']()
    same(ext, read(ROOT/'extension/RESULTS.json'), 'separate transfer and native-area predictions')
    print('PASS co-lead predictions, input hashes, native units, errors and coverage')
    observed = read(ROOT/'source_facts.json')
    facts = read(ROOT/'extension/facts.json')
    for study in ('cookie','scone'):
        inputs = facts[study]['table1_per_serving_as_eaten']
        for field, item in [('available','available_cho_g'),('protein','protein_g'),('fat','fat_g'),('fibre','fiber_g'),('label_kcal','kcal')]:
            same([inputs[arm][item] for arm in ('control','fiber')], observed[study][field], f'{study}/{field}')
        for i, field in [(0,'insulin_mean'),(1,'insulin_dispersion')]:
            same([facts[study]['insulin_iAUC_0_120'][arm][i] for arm in ('control','fiber')],observed[study][field],study+'/'+field)
    sol = read(ROOT/'sol/independent_results.json')
    for study, block in [('wheat',sol['donor']),('potato',sol['target'])]:
        for field, item in [('available','D'),('fibre','F'),('insulin_mean','Y')]:
            same(observed[study][field],block[item],f'{study}/{field}')
    nested = runpy.run_path(str(ROOT/'nested.py'))['main']()
    same(nested,read(ROOT/'nested_results.json'),'nested density intervals and 256 rounding corners')
    same(runpy.run_path(str(ROOT/'figure_scale.py'))['result'](),read(ROOT/'figure_scale_results.json'),'native unit check')
    print('PASS source-linked values, figure scale and cross-study portion restriction')
    scripts = [('calculate','independent_results'),('cookie_calculate','cookie_results'),
               ('native_calculate','native_results'),('class_audit','class_results'),('curve_scale','cookie_curve_scale')]
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        shutil.copytree(ROOT/'sol',tmp/'sol')
        shutil.copyfile(ROOT/'wb_portions.json',tmp/'wb_portions.json')
        for script, snap in scripts:
            subprocess.run([sys.executable,'-I','-B','-X','utf8',str(tmp/'sol'/(script+'.py'))],check=True,stdout=subprocess.DEVNULL)
            same(read(tmp/'sol'/(snap+'.json')),read(ROOT/'sol'/(snap+'.json')),script)
    labels = {'available':'available_cho','generic':'generic_enriched','density':'graded_fiber_density','equality':'equality'}
    ep = primary['endpoints']['venous_insulin_iAUC_0_120']
    for key, label in labels.items():
        same(ep['primary_mean'][label],sol['MALE'][key],key)
        same(forecasts['high_over_medium'][label],sol['secondary']['predictions'][key],label)
    cookie = read(ROOT/'sol/cookie_results.json')['predictions']
    for key in ('potato','wheat'):
        for left, right in [('generic','generic'),('graded','density')]:
            same(ext['extension']['stewart_cookie']['predicted_ratio'][key+'_'+left],cookie[key+'_'+right],key)
    native = read(ROOT/'sol/native_results.json')['anchors']
    for key,target in [('cookie','primary_cookie_anchor'),('bar','stress_gourineni_anchor')]:
        for short, long in [('constant','constant'),('D','D'),('D+P','D_plus_P'),('macro','energy_proxy_4D_4P_9fat'),('kcal','printed_kcal')]:
            if short not in native[key]:
                assert key=='bar' and short=='kcal' and 'MAE_two_arm_primary' not in ext['native'][target]['models'][long]
                continue
            a=native[key][short]
            b=ext['native'][target]['models'][long]
            same([b['predicted_pmol_min_L'][arm] for arm in ('control','fiber')],a['levels'],target)
            same(b['predicted_decrement'],a['decrement'],target)
            same(b['MAE_two_arm_primary'],a['MAE'],target)
    independent_class=read(ROOT/'sol/class_results.json')
    same(independent_class['sharp_upper_a'],nested['necessary_exponent_ceiling'],'ceiling')
    same(independent_class['doubling_cap'],nested['upper_for_doubling'],'doubling')
    print('PASS five independent scripts and cross-implementation comparisons')
if __name__=='__main__':main()
