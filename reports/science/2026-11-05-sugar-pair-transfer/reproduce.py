"""Offline, non-mutating replay. Run with Python 3.10+; no third-party packages."""
import csv,hashlib,json,math,shutil,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
import transfer,timecourse,external

def equal(x,y,where=''):
    if isinstance(x,dict) and isinstance(y,dict):
        assert x.keys()==y.keys(),(where,x.keys()^y.keys())
        return sum(equal(x[k],y[k],where+'/'+str(k)) for k in x)
    if isinstance(x,(list,tuple)) and isinstance(y,(list,tuple)):
        assert len(x)==len(y),where
        return sum(equal(a,b,where+'/'+str(i)) for i,(a,b) in enumerate(zip(x,y)))
    if isinstance(x,(int,float)) and not isinstance(x,bool):
        assert isinstance(y,(int,float)) and math.isclose(x,y,rel_tol=2e-10,abs_tol=2e-9),(where,x,y)
        return 1
    assert x==y,(where,x,y)
    return 0
def read(p):return json.loads(p.read_text(encoding='utf8'))
def run(cwd,file,*args):
    p=subprocess.run([sys.executable,'-B','-X','utf8',str(cwd/file),*map(str,args)],cwd=cwd,capture_output=True,encoding='utf8',errors='replace')
    if p.returncode:raise RuntimeError((file,p.stdout[-1600:],p.stderr[-1600:]))
def rows(p):
    def val(s):
        try:return float(s)
        except ValueError:return s
    with p.open(newline='',encoding='utf-8-sig') as f:return [[val(x) for x in r] for r in csv.reader(f)]
def compare_file(a,b):
    if a.suffix=='.json':
        x,y=read(a),read(b)
        if a.parent.name=='sol' and a.name=='results.json':
            # The source/download inventory varies by directory. The source edition is checked separately.
            x.pop('hashes');y.pop('hashes')
        return equal(x,y,a.name)
    return equal(rows(a),rows(b),a.name)

def main():
    for a,b in [('PLAN.md','FREEZE.json'),('SHAPE_PLAN.md','SHAPE_FREEZE.json'),('SHAPE_COMPARATORS.md','SHAPE_COMPARATORS_FREEZE.json')]:
        assert hashlib.sha256((ROOT/a).read_bytes()).hexdigest()==read(ROOT/b)['sha256']
    print('PASS three selection and comparator fingerprints')
    n=0
    for func,name in [(transfer.compute,'results.json'),(timecourse.results,'time_results.json'),(external.result,'external_results.json')]:
        n+=equal(json.loads(json.dumps(func(),allow_nan=False)),read(ROOT/name),name)
    print(f'PASS {n} coordinator numerical entries: formulation, native levels, time, bounds and external forecasts')
    with tempfile.TemporaryDirectory() as td:
        cp=Path(td)/'study'
        shutil.copytree(ROOT,cp,ignore=shutil.ignore_patterns('__pycache__'))
        jobs=[
          ('matched',[('analyse.py',),('compare.py','--target-figure',cp/'figure.json'),('verify.py',)],['areas.csv','forecasts.csv','curve.csv','raw_ceiling.csv','comparison.csv','absolute_transfer.csv','protocol_change.csv','target_aggregate.csv','cumulative_profile.csv']),
          ('sol',[('calculate.py',),('direct.py',),('trajectory.py',),('test_arithmetic.py',)],['results.json','direct_results.json','trajectory_results.json']),
          ('bounds_sol',[('envelope.py',)],['envelope.json','digitization.csv']),
          ('kawai',[('kawai.py',)],['results.json','areas.csv','curve.csv']),
          ('bounds_sol/kawai',[('holdout.py',)],['results.json','digitization.csv'])]
        for folder,commands,outputs in jobs:
            dr=cp/folder
            for command in commands:run(dr,*command)
            k=sum(compare_file(dr/f,ROOT/folder/f) for f in outputs)
            print(f'PASS {folder}: {len(commands)} programs and {k} reconstructed numerical entries')
        run(cp/'opus_pair','pair.py','--check','--lab')
        run(cp/'opus_pair','portable_test.py')
        print('PASS corrected Claude Code implementation, lab comparison and isolated LF/CRLF replay')
        run(cp/'bounds_sol/kawai','holub_comparison.py')
        compare_file(cp/'bounds_sol/kawai/holub_results.json',ROOT/'bounds_sol/kawai/holub_results.json')
        print('PASS independent Holub transfer check')
if __name__=='__main__':main()
