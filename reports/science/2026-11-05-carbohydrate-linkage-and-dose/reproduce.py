"""Replay the published numerical work, using temporary directories for writers."""
import csv
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent


def compare(actual, expected, path='root'):
    if isinstance(expected,dict):
        assert actual.keys()==expected.keys(), path
        return sum(compare(actual[k],expected[k],path+'/'+k) for k in expected)
    if isinstance(expected,list):
        assert len(actual)==len(expected),path
        return sum(compare(a,b,path+'[]') for a,b in zip(actual,expected))
    if isinstance(expected,(float,int)) and not isinstance(expected,bool):
        assert math.isclose(actual,expected,rel_tol=2e-10,abs_tol=2e-10),(path,actual,expected)
        return 1
    assert actual==expected,(path,actual,expected)
    return 0


def run_python(path, *args):
    subprocess.run([sys.executable,'-B','-I','-X','utf8',str(path),*args],
                   stdout=subprocess.DEVNULL,check=True)


def load(path):
    return json.loads(path.read_text(encoding='utf8'))


def main():
    sys.path.insert(0,str(ROOT))
    from experiment import build
    from native import native_results
    for prefix in ['','MATRIX_','GRADED_','TREHALOSE_']:
        receipt=load(ROOT/'receipts'/(prefix+'FREEZE.json'))
        assert hashlib.sha256((ROOT/(prefix+'PLAN.md')).read_bytes()).hexdigest()==receipt['sha256']
    print('PASS: four plan fingerprints')
    with tempfile.TemporaryDirectory() as tmp:
        scratch=Path(tmp)
        data=scratch/'data'
        data.mkdir()
        shutil.copyfile(ROOT/'data/read_johansen.py',data/'read_johansen.py')
        run_python(data/'read_johansen.py')
        for fname in ['arm_trajectory.csv','window_summary.csv']:
            def parsed(p):
                with p.open(newline='') as stream:return list(csv.reader(stream))
            assert parsed(data/fname)==parsed(ROOT/'data'/fname)
        print('PASS: published Johansen labels and eight curve reconstructions replayed')
        primary=build()
        n=compare(json.loads(json.dumps(primary)),load(ROOT/'results.json'))
        native=native_results()
        total=compare(json.loads(json.dumps(native)),load(ROOT/'native_results.json'))
        print(f'PASS: {n} clock, recipe and polymer numerical values; {total} uncertainty and level values')
        shutil.copyfile(ROOT/'data/vancan.csv',data/'vancan.csv')
        independent=scratch/'independent'
        independent.mkdir()
        outputs={}
        for name in ['clock','graded','mixed','trehalose']:
            script=independent/(name+'.py')
            shutil.copyfile(ROOT/'independent'/(name+'.py'),script)
            run_python(script)
            checked=load(independent/'results.json')
            count=compare(checked,load(ROOT/'independent'/(name+'_expected.json')))
            outputs[name]=checked
            print(f'PASS: independent {name} reconstruction ({count} numerical values)')
        sol=outputs['trehalose']
        assert math.isclose(sol['native_insulin']['ratio_of_means'],native['ratio_of_means'])
        assert all(abs(x-y)<1e-7 for x,y in zip(sol['conservative_paired_t_ratio_interval']['interval'],
                                                    native['unknown_covariance_t_interval']))
        poly=primary['polymer']['same_arm_measured_33_to_50']
        for arm,closer in [('MD','WB'),('OM','linear')]:
            errors=poly[arm]['portion']['absolute_log_errors']
            assert min(errors,key=errors.get)==closer
            for reading in outputs['mixed']['portion_readings'].values():
                errors=reading[arm]['log_errors']
                assert min(errors,key=errors.get)==closer
        for s,m in primary['recipe']['signed_mixed'].items():
            e=m['absolute_log_errors']
            assert e['carbohydrate_dilution']<e['combined'],s
        assert primary['clock']['studies']['Keesing']['intervals']['0-120']['forecasts']['empirical120']['absolute_log_ratio_error'] is None
    run_python(ROOT/'opus_trehalose/trehalose.py','--check')
    print('PASS: corrected Claude Code implementation, frozen comparisons and independent decision checks')


if __name__=='__main__':
    sys.dont_write_bytecode=True
    main()
