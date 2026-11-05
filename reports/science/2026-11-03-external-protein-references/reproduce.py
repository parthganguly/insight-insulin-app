"""Offline replay on an expendable copy. The archived and shared files stay byte-identical."""
import ast, hashlib, json, math, re, shutil, subprocess, sys
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT=Path(__file__).resolve().parent

def load(p):
    return json.loads(p.read_text(encoding="utf-8-sig"),parse_constant=invalid)

def invalid(token):
    raise ValueError("Nonfinite token in current data: "+token)

def compare(actual,expected,path="root"):
    if isinstance(expected,dict):
        assert actual.keys()==expected.keys(),path
        for k,e in expected.items():compare(actual[k],e,path+"/"+k)
    elif isinstance(expected,list):
        assert len(actual)==len(expected),path
        for i,(a,e) in enumerate(zip(actual,expected)):compare(a,e,path+"/"+str(i))
    elif type(expected) in (int,float):
        assert math.isclose(actual,expected,abs_tol=1e-9,rel_tol=1e-11),path
    else:
        assert actual==expected,path

def call(file,*args):
    return subprocess.check_output([sys.executable,"-B","-X","utf8",str(file),*args],cwd=file.parent,encoding="utf-8")

def replay():
    with TemporaryDirectory() as temp:
        w=Path(temp)
        for d in ["mixed","public","sol","morifuji"]:shutil.copytree(ROOT/d,w/d)
        # Stage the superseded, permissive serialization only in the historical comparison workspace.
        power=w/"public/power"
        shutil.copyfile(power/"history/VERIFIED_v2.json.txt",power/"VERIFIED_v2.json")
        for script,snapshot in [("test_transfer","results"),("challenge","challenge"),("restriction","restriction"),("anchor","anchor")]:
            actual=json.loads(call(w/"mixed"/(script+".py")),parse_constant=invalid)
            compare(actual,load(w/"mixed"/(snapshot+".json")),script)
            print("PASS mixed",script)
        freeze=load(power/"FREEZE_RECEIPT.json")
        for name in ("SPEC.md","transfer.py","../readings.json"):
            assert hashlib.sha256((power/name).read_bytes()).hexdigest()==freeze[name],name
        for script in ["transfer","addendum","challenge","jsonsafe","bound"]:
            print("Power",script,call(power/(script+".py"),"--check").strip())
        moro=call(w/"morifuji/replay.py")
        limits=call(w/"morifuji/positive_bound.py")
        print("Moro signed and positive",moro.strip(),limits.strip(),sep="\n")
        for script,receipt in [("verify","independent_results"),("mixed_check","mixed_check"),("moro_check","moro_check")]:
            fresh=w/"sol"/(receipt+".json")
            fresh.unlink()
            call(w/"sol"/(script+".py"))
            compare(load(fresh),load(ROOT/"sol"/(receipt+".json")),script)
            print("PASS Sol",script)
        sol_bounds=call(w/"sol/positive_check.py")
        def values_after(line, token):
            return list(ast.literal_eval(line.split(token,1)[1].strip()))
        cap_free=[v for v in limits.splitlines() if "pixel pad 2 cap envelope False" in v]
        assert len(cap_free)==1
        compare(values_after(cap_free[0],"H/I"),values_after(sol_bounds.splitlines()[-1],"ratio"),"Moro stressed positive bounds")
        print("PASS independent positive-bound comparison")
        areas=load(w/"sol/moro_check.json")
        for horizon in ("120","180"):
            line=next(v for v in moro.splitlines() if v.startswith(horizon+" areas hydro/intact"))
            measured=float(re.search(r" ratio ([0-9.]+)",line).group(1))
            compare(measured,areas[horizon]["ratio"],"Moro signed ratio "+horizon)
    print("PASS complete offline replay")

if __name__=="__main__":
    replay()
