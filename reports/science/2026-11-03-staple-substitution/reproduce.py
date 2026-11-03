"""Offline public-aggregate replay. All writes go to a scratch directory."""
from pathlib import Path
import hashlib,json,math,shutil,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def same(a,b,path='root'):
    if isinstance(b,dict):
        assert a.keys()==b.keys(),path
        for k in b:same(a[k],b[k],f'{path}/{k}')
    elif isinstance(b,list):
        assert len(a)==len(b),path
        for i,(x,y) in enumerate(zip(a,b)):same(x,y,f'{path}/{i}')
    elif type(b) in (float,int):
        assert type(a) in (int,float) and math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-9),path
    else:assert a==b,path
def run(file):return subprocess.check_output([sys.executable,'-B','-X','utf8',str(file)],cwd=file.parent,encoding='utf8')
def checksum(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def replay():
    for d in ['native','lentil']:
        for f,h in read(ROOT/d/'FREEZE.json')['sha256'].items():assert checksum(ROOT/d/f)==h,f
    assert checksum(ROOT/'lentil/BRIDGE.md')==read(ROOT/'lentil/BRIDGE_FREEZE.json')['sha256']
    print('PASS historical freezes')
    with tempfile.TemporaryDirectory() as t:
        p=Path(t)
        for name in ['native','lentil','family','astra','sol']:
            shutil.copytree(ROOT/name,p/name)
        for script,out in [('native/forecast.py','native/PREDICTIONS.json'),('native/evaluate.py','native/results.json'),('family/compare.py','family/result.json'),('lentil/evaluate.py','lentil/results.json')]:
            same(json.loads(run(p/script)),read(ROOT/out),script);print('PASS',script)
        run(p/'astra/moravek/extract.py')
        donor=read(p/'astra/moravek/aggregate.json');same(donor,read(ROOT/'astra/moravek/aggregate.json'))
        d=read(p/'lentil/donor.json')['geometric_areas']
        same(sum(d,[]),[x['gm'] for x in donor['arms']])
        print('PASS Moravek published table rows')
        for script,out in [('verify','verification_results.json'),('secondary_verify','secondary_risk_portable.json'),('lentil/verify','lentil/results.json'),('bridge/verify','bridge/results.json'),('bridge/optional_fii','bridge/optional_fii_stress.json')]:
            run(p/'sol/portable'/(script+'.py'));same(read(p/'sol/portable'/out),read(ROOT/'sol/portable'/out),script)
        panel=read(p/'lentil/results.json');other=read(p/'sol/portable/bridge/results.json')['methods']
        for name,v in panel['prior_to_later']['models'].items():
            key=name.replace('no_change','equality').replace('starch_and_color','matched').replace('_exchange_share','_fraction_scaled')
            same(v['substitution_MALE'],other[key]['all4_MALE'],name)
            same(v['ratios'],other[key]['predicted_ratios'],name)
        assert not panel['prior_to_later']['joint']
        assert not read(p/'native/results.json')['group_mean_mass_egg_0.05']['6']['joint_pass']
        print('PASS independent Sol executions and cross-implementation agreement')
if __name__=='__main__':replay()
