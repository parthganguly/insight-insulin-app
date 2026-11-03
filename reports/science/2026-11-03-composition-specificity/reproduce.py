"""Run the current portable, public aggregate comparisons on an expendable copy."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib,json,math,shutil,subprocess,sys

ROOT=Path(__file__).resolve().parent

def bad(token):raise ValueError("Nonfinite current output "+token)
def read(path):return json.loads(path.read_text(encoding="utf-8-sig"),parse_constant=bad)
def same(x,y,path="root"):
    if isinstance(y,dict):
        assert x.keys()==y.keys(),path
        for k in y:same(x[k],y[k],path+"/"+k)
    elif isinstance(y,list):
        assert len(x)==len(y),path
        for i,(a,b) in enumerate(zip(x,y)):same(a,b,path+"/"+str(i))
    elif type(y) in (int,float):
        assert type(x) in (int,float) and math.isclose(x,y,rel_tol=1e-10,abs_tol=1e-9),path
    else:assert x==y,path
def run(file,*args):
    return subprocess.check_output([sys.executable,"-B","-X","utf8",str(file),*args],cwd=file.parent,encoding="utf-8")
def replay():
    with TemporaryDirectory() as td:
        w=Path(td)
        for d in ["public","panel","sol","astra"]:shutil.copytree(ROOT/d,w/d)
        power=w/"public/transfer"
        for receipt, hashes in [("FREEZE_RECEIPT.json", "freeze"), ("EXECUTION_v2.json", "execution")]:
            record = read(power / receipt)
            entries = record["sha256"] if hashes == "execution" else {k: v for k, v in record.items() if k not in {"state", "utc"}}
            for name, expected in entries.items():
                assert hashlib.sha256((power / name).read_bytes()).hexdigest() == expected, name
        print("PASS original freeze and execution hashes")
        print(run(power/"reproduce_v2.py").strip())
        print("Opus correction",run(power/"challenge_v3.py","--check").strip())
        for script,snapshot in [("form","form"),("early","early"),("area_read","area_read"),("witnesses","witnesses")]:
            same(json.loads(run(w/"panel"/(script+".py")),parse_constant=bad),read(w/"panel"/(snapshot+".json")),script)
            print("PASS",script)
        signed=read(w/"panel/area_read.json")["[-30, 0]/0"]["ratio_bounds"]
        official=read(power/"RESULTS_v2.json")["results"]["B_mean_of_minus30_and_0:0_120"]["ages"]
        for age,r in signed.items():
            same(r[0],official[age]["E2_signed"]["observed_ratio"],age)
        print("PASS independent signed curve agreement")
        run(w/"astra/replay.py")
        receipt=run(w/"sol/panel_independent_check.py")
        assert "PASS" in receipt and "FAIL" not in receipt
        print("PASS Sol reconstruction")
    print("PASS complete offline replay")
if __name__=="__main__":replay()
