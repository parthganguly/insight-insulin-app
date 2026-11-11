"""Rebuild the scientific outputs in a disposable directory. Standard library only."""
import csv
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

BASE=Path(__file__).resolve().parent

def invalid(x):
    raise ValueError(f"nonfinite published value: {x}")

def read(file):
    return json.loads(file.read_text(encoding="utf-8-sig"),parse_constant=invalid)

def match(a,b,k="root"):
    if isinstance(b,dict):
        assert a.keys()==b.keys(),k
        for name in b:match(a[name],b[name],k+"/"+name)
    elif isinstance(b,list):
        assert len(a)==len(b),k
        for i,(x,y) in enumerate(zip(a,b)):match(x,y,k+"/"+str(i))
    elif type(b) in (int,float):
        assert type(a) in (int,float) and math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-8),k
    else:assert a==b,k

def run(path,*args):
    return subprocess.check_output([sys.executable,"-B","-X","utf8",str(path),*args],
                                   cwd=path.parent,encoding="utf-8")

def replay():
    with TemporaryDirectory() as tmp:
        w=Path(tmp)
        for d in ["astra","public","mixed","sol"]:shutil.copytree(BASE/d,w/d)
        for csvfile in (w/"astra").glob("*.csv"):csvfile.unlink()
        run(w/"astra/extract.py")
        for name in ["bars.csv","target-course.csv","target-windows.csv","pixel-bounds.csv"]:
            def rows(p):
                with p.open(encoding="utf-8-sig",newline="") as f:return list(csv.reader(f))
            match(rows(w/"astra"/name),rows(BASE/"astra"/name),name)
            match(rows(w/"astra"/name),rows(BASE/"public/figure_facts"/name),name)
        print("PASS independent digitization inputs and four rebuilt curve/bar summaries")
        for script,out in [("transfer","result"),("omission","omission"),("leucine","leucine"),
                           ("positive","positive"),("fixed_enrichment","fixed_enrichment"),("slope_range","slope_range"),
                           ("anchor_sensitivity","anchor_sensitivity")]:
            actual=json.loads(run(w/"mixed"/(script+".py")),parse_constant=invalid)
            match(actual,read(w/"mixed"/(out+".json")),script)
            print("PASS",script)
        print(run(w/"public/transfer/reproduce_v2.py").strip())
        for script,out in [("check","RECEIPT"),("check_forecasts","FORECAST_RECEIPT"),("check_positive","POSITIVE_RECEIPT")]:
            dst=w/"sol"/(out+".json")
            dst.unlink()
            run(w/"sol"/(script+".py"))
            match(read(dst),read(BASE/"sol"/(out+".json")),script)
            print("PASS Sol",script)
        # Optional independent scripts bundled with this version are dispatched only when listed in FINAL_CHECKS.
        for entry in read(BASE/"FINAL_CHECKS.json"):
            dst=w/"sol"/entry["receipt"]
            dst.unlink()
            run(w/"sol"/entry["script"])
            match(read(dst),read(BASE/"sol"/entry["receipt"]),entry["script"])
            print("PASS Sol",entry["script"])
    print("PASS complete offline replay")

if __name__=="__main__":replay()
