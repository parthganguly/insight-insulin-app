"""Public aggregate replay; requires only Python 3 standard library."""
from pathlib import Path
import hashlib,json,math,shutil,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parent
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
def same(a,b,at='root'):
    if isinstance(b,dict):
        assert a.keys()==b.keys(),at
        for k in b:same(a[k],b[k],at+'/'+k)
    elif isinstance(b,list):
        assert len(a)==len(b),at
        for i,(x,y) in enumerate(zip(a,b)):same(x,y,at+'/'+str(i))
    elif type(b) in (int,float):
        assert type(a) in (int,float) and math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-9),at
    else:assert a==b,at
def run(p,*args):
    return subprocess.check_output([sys.executable,'-B','-X','utf8',str(p),*map(str,args)],cwd=p.parent,encoding='utf8')
def replay():
    work=ROOT/'public/model'
    for k,v in read(work/'FREEZE_RECEIPT.json').items():
        if k not in ('utc','actor','state'):assert sha(work/k)==v,k
    print('PASS initial freeze')
    with tempfile.TemporaryDirectory() as t:
        d=Path(t)
        for name in ('public','sol','contrast','astra'):shutil.copytree(ROOT/name,d/name)
        shutil.copyfile(ROOT/'reproduce.py',d/'reproduce.py')
        work=d/'public/model'
        run(work/'evaluate.py','check',work/'targets_SELFTEST_synthetic.json',work/'SELFTEST_synthetic_scores.json')
        run(d/'public/direct/replay.py')
        run(d/'public/cooking/replay.py')
        run(d/'public/necessary/lan2011.py','--check')
        print('PASS Opus direct, cooking and shared-reference checks')
        same(json.loads(run(d/'contrast/score.py')),read(ROOT/'contrast/results.json'))
        for script,out in [('verify','verification'),('curve_verify','curve_verification'),('zhao_verify','zhao_verification')]:
            run(d/'sol'/(script+'.py'));same(read(d/'sol'/(out+'.json')),read(ROOT/'sol'/(out+'.json')),script)
        print('PASS coordinator and independent Sol calculations')
        q=read(d/'sol/verification.json')
        r=read(d/'contrast/results.json')['assay_transfer']
        same(r['observed'],list(q['wei2026']['observed_insulin_ratio'].values()),'study means')
        for code,key in [('hard','HP'),('soft','SP')]:
            i=['hard','soft'].index(code)
            same(r['scores']['meal_potato_RDS_background0']['predicted'][i],q['wei2026']['fractions'][key]['RDS_ratio'])
        print('PASS common portion calculations')
if __name__=='__main__':replay()
