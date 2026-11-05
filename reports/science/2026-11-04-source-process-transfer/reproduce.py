"""Offline study replay, Python standard library. All writes are in a temporary directory."""
from pathlib import Path
import csv,hashlib,json,math,shutil,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parent
def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))
def same(a,b,at="root"):
    if isinstance(b,dict):
        assert a.keys()==b.keys(),at
        for k in b:same(a[k],b[k],at+'/'+k)
    elif isinstance(b,list):
        assert len(a)==len(b),at
        for i,(u,v) in enumerate(zip(a,b)):same(u,v,f'{at}/{i}')
    elif type(b) in (int,float):
        assert type(a) in (int,float) and math.isclose(a,b,rel_tol=3e-10,abs_tol=1e-9),at
    else:
        assert a==b,at
def run(p):
    return subprocess.check_output([sys.executable,'-B','-X','utf8',str(p)],cwd=p.parent,encoding='utf8')
def csvrows(p):
    with p.open(newline='',encoding='utf8') as f:return list(csv.reader(f))
def equivalent_csv(p,q):
    a,b=csvrows(p),csvrows(q)
    assert len(a)==len(b),p.name
    for i,(left,right) in enumerate(zip(a,b)):
        assert len(left)==len(right),(p.name,i)
        for j,(a,b) in enumerate(zip(left,right)):
            if a!=b: same(float(a),float(b),f'{p.name}/{i}/{j}')
def main():
    for plan,freeze in [('PLAN.md','FREEZE.json'),('WHEAT_PLAN.md','WHEAT_FREEZE.json'),('ASSAY_PLAN.md','ASSAY_FREEZE.json'),('REPLICATION_PLAN.md','REPLICATION_FREEZE.json')]:
        assert hashlib.sha256((ROOT/plan).read_bytes()).hexdigest()==read(ROOT/freeze)['sha256'],plan
    print('PASS four research plan snapshots')
    for n in ['model','flakes','wheat','positive','extrapolation','assay','rice','rs_transfer','offset_bound','equal_carbohydrate']:
        same(json.loads(run(ROOT/(n+'.py'))),read(ROOT/(n+'_results.json')),n)
    print('PASS fixed fits, transfer predictions, uncertainty, positive-area and exposure bounds')
    with tempfile.TemporaryDirectory() as tmp:
        w=Path(tmp); shutil.copytree(ROOT/'support',w/'support'); shutil.copytree(ROOT/'sol',w/'sol')
        for sub,script,output in [('hoebler','sensitivity.py','summary.csv'),('breakfast','extract.py','comparisons.csv')]:
            run(w/'support'/sub/script)
            equivalent_csv(w/'support'/sub/output,ROOT/'support'/sub/output)
        for script,snap in [('transfer_calculations.py','transfer_calculations.json'),('contrast_sensitivity.py','contrast_sensitivity.json')]:
            run(w/'sol'/script);same(read(w/'sol'/snap),read(ROOT/'sol'/snap),script)
        run(w/'sol/wheat/portable_verify.py')
        portable=read(w/'sol/wheat/portable_results.json')
        same(portable,read(ROOT/'sol/wheat/portable_results.json'),'portable wheat')
        shutil.copyfile(ROOT/'extrapolation_results.json',w/'extrapolation_results.json')
        run(w/'sol/support/verify_support.py')
        same(read(w/'sol/support/support_results.json'),read(ROOT/'sol/support/support_results.json'),'Sol supporting studies')
        for name in ['amylose_transfer.py','training.json','wheat_inputs.json','wheat_results.json','hoebler_inputs.json','positive_results.json','extrapolation_results.json','independent_first_breakfast.csv','model.py','model_results.json']:
            shutil.copyfile(ROOT/name,w/name)
        run(w/'amylose_transfer.py')
        same(read(w/'amylose_transfer_results.json'),read(ROOT/'amylose_transfer_results.json'),'Opus transfer')
        run(w/'sol/support/verify_offset_family.py')
        same(read(w/'sol/support/offset_family_verification.json'),read(ROOT/'sol/support/offset_family_verification.json'),'Sol offset restriction')
        # Verify the exact committed transfer artifact as well as the recalculated numbers above.
        for name in ['AMYLOSE_MEMO.md','amylose_transfer_results.json']:
            shutil.copyfile(ROOT/name,w/name)
        subprocess.run([sys.executable,'-B','-X','utf8',str(w/'sol/opus/verify_transfer_v2.py'),'--study-dir',str(w)],capture_output=True,check=True)
        same(read(w/'sol/opus/transfer_v2_verification.json'),read(ROOT/'sol/opus/transfer_v2_verification.json'),'independent transfer')
        same(json.loads(run(ROOT/'check_transfer_bounds.py')),read(ROOT/'transfer_bounds_results.json'),'cohort envelopes')
    print('PASS source-coordinate replay and independent verifier checks')
    # Independent input reductions use distinct coordinates and intentionally retain different points.
    q=read(ROOT/'wheat_results.json');p=read(ROOT/'positive_results.json')
    assert q['heated_source_marginal_envelope_under_any_shared_positive_process_weight'][1]<q['printed_marginals']['source']['printed_ratio']
    for l in ['HAW-R/LAW-R','HAW-W/LAW-W']:
        assert not p['ratio_bounds'][l]['inside_outer_envelope']['heated']
        assert not p['ratio_bounds'][l]['inside_outer_envelope']['amylopectin_dose']
    z=read(ROOT/'assay_results.json')
    assert abs(z['panels']['30']['direct_minus_WWB_derived_HAWB_SP']['offset_score'])<1e-12
    assert abs(z['panels']['30']['direct_minus_WWB_derived_HAWB_SP']['oriented_affine'])>1e-3
    print('PASS reference consistency, native sample bounds and marginal restriction')
if __name__=='__main__':main()
