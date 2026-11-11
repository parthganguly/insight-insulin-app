"""Replay the public scientific package offline. Input evidence is read-only."""
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copytree
import json
import math
import subprocess
import sys

BASE=Path(__file__).resolve().parent

def same(actual,expected,path="root"):
    if isinstance(expected,dict):
        assert isinstance(actual,dict) and actual.keys()==expected.keys(),path
        for k,v in expected.items():
            same(actual[k],v,f"{path}/{k}")
    elif isinstance(expected,list):
        assert isinstance(actual,list) and len(actual)==len(expected),path
        for i,(a,e) in enumerate(zip(actual,expected)):
            same(a,e,f"{path}/{i}")
    elif type(expected) in (int,float):
        assert type(actual) in (int,float) and math.isclose(actual,expected,rel_tol=1e-11,abs_tol=1e-9),path
    else:
        assert actual==expected,path

def read(p):
    return json.loads(p.read_text(encoding="utf-8-sig"))

def run(p,*args):
    return subprocess.check_output([sys.executable,"-B","-X","utf8",str(p),*args],cwd=p.parent,
                                   encoding="utf-8",errors="strict")

def replay():
    for program,expected in [
        ("experiment/compare.py","experiment/comparison.json"),
        ("experiment/positive.py","experiment/positive.json"),
        ("experiment/sem_convention.py","experiment/sem-convention.json"),
        ("curves/evaluate.py","curves/evaluation.json"),
        ("curves/sampling_grid.py","curves/sampling-grid.json"),
        ("sol/check_independent.py","sol/chapter3-arithmetic.json")]:
        same(json.loads(run(BASE/program)),read(BASE/expected),program)
        print("PASS",program,flush=True)
    for test in ("experiment/test_positive.py","curves/test_curves.py"):
        subprocess.run([sys.executable,"-B","-m","unittest","discover","-p",Path(test).name],
                       cwd=(BASE/test).parent,check=True)
        print("PASS",test,flush=True)
    for program in ("bridge.py","correction.py"):
        print(run(BASE/"public/opus_study"/program,"--check").strip(),program,flush=True)
    with TemporaryDirectory() as td:
        work=Path(td)
        for directory in ("curves","experiment","public","sol"):
            copytree(BASE/directory,work/directory)
        jobs=[("reconcile_actual.py",["reconciliation.json","curve-grid-positive.json"]),
              ("check_opus_actual.py",["opus-o1-reconciliation.json"]),
              ("finite_n_check.py",["finite-n-reconciliation.json"]),
              ("sem_bound_independent.py",["sem-bound-independent.json"]),
              ("check_o2_correction.py",["o2-correction-receipt.json"]),
              ("sem_convention_check.py",["sem-convention-receipt.json"])]
        for script,outputs in jobs:
            for out in outputs:
                (work/"sol"/out).unlink()
            run(work/"sol"/script)
            for out in outputs:
                fresh=read(work/"sol"/out)
                same(fresh,read(BASE/"sol"/out),out)
                rows=fresh if isinstance(fresh,list) else fresh.get("checks",[])
                for row in rows:
                    if isinstance(row,dict) and "status" in row:
                        assert row["status"]=="PASS",(out,row)
                if isinstance(fresh,dict) and "all_pass" in fresh:
                    assert fresh["all_pass"] is True,out
            print("PASS independent",script,flush=True)

if __name__=="__main__":
    replay()
