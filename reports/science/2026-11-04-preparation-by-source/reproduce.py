"""Offline replay of published cohort facts. Requires Python 3.10 or newer."""
from pathlib import Path
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parent

def read(p):
    return json.loads(p.read_text(encoding="utf-8-sig"))

def same(a,b,at="root"):
    if isinstance(b,dict):
        assert a.keys()==b.keys(),at
        for k in b:same(a[k],b[k],at+"/"+k)
    elif isinstance(b,list):
        assert len(a)==len(b),at
        for n,(x,y) in enumerate(zip(a,b)):same(x,y,f"{at}/{n}")
    elif type(b) in (int,float):
        assert type(a) in (int,float) and math.isclose(a,b,rel_tol=2e-10,abs_tol=1e-10),at
    else:assert a==b,at

def run(script):
    return subprocess.check_output([sys.executable,"-B","-X","utf8",str(script)],cwd=script.parent,encoding="utf8")

def replay():
    for plan,record in [("PLAN","FREEZE"),("BARLEY_PLAN","BARLEY_FREEZE"),("BORNET_PLAN","BORNET_FREEZE")]:
        assert hashlib.sha256((ROOT/(plan+".md")).read_bytes()).hexdigest()==read(ROOT/(record+".json"))["sha256"]
    print("PASS three plan hashes")
    for name in ["barley","bornet","sensitivity","coverage"]:
        same(json.loads(run(ROOT/(name+".py"))),read(ROOT/(name+"_results.json")),name)
    print("PASS source-specific comparisons, uncertainty and coverage")
    with tempfile.TemporaryDirectory() as tmp:
        d=Path(tmp)
        shutil.copytree(ROOT/"sol",d/"sol")
        shutil.copyfile(ROOT/"bornet_results.json",d/"bornet_results.json")
        for script,result in [("verify_barley.py","verified_results.json"),("Bornet_verify.py","Bornet_results.json")]:
            run(d/"sol"/script)
            same(read(ROOT/"sol"/result),read(d/"sol"/result),script)
    sol=read(ROOT/"sol/verified_results.json")
    main=read(ROOT/"barley_results.json")
    names={"mean_120":"native_iAUC120","mean_90":"native_iAUC90","II_120":"II120_ratio"}
    for a,b in zip(main["milling"],sol["barley_milling"]):
        same(a["matched_nine"],b["matched9_bounds120"])
        same(a["rounded_matched_nine"],b["rounding_matched9_bounds120"])
        for i,j in names.items():same(a["observed"][i],b["observed"][j])
        for i,j in [("release","direct_HI180"),("power","power_HI180"),("affine","affine_HI180"),("grain_reference","Heaton_median")]:
            assert math.isclose(a["predicted"][i],b["predictions"][j],rel_tol=1e-8)
    sol2=read(ROOT/"sol/Bornet_results.json")
    actual=read(ROOT/"bornet_results.json")
    for g,v in actual["groups"].items():
        checks=sol2["groups"][g]["comparisons"]
        for c,other in zip(v["contrasts"],["cassava/wheat","legume/wheat","legume/cassava"]):
            same(c["observed"]["area180"],checks[other]["targets"]["tabulated_auc180"])
        for operator,target in [("area180","tabulated_auc180"),("signed120","reconstructed_signed_auc120")]:
            table=v["mean_error_on_two_wheat_referenced_contrasts"][operator]
            verifier=sol2["groups"][g]["primary_mean_absolute_log_error"][target]
            models={"H30_release":"direct_H30","H30_power":"power_H30","H30_affine":"affine_H30","equal":"equal_starch_form","amylopectin":"amylopectin_dose"}
            winner=min(models,key=table.get)
            assert models[winner]==min(verifier,key=verifier.get),(g,operator)
    s=read(ROOT/"sensitivity_results.json")["uncertainty_180"]
    si=sol2["native180_additive_interaction"]
    same(s["possible_SE_difference_in_differences"],si["difference_in_differences_se_envelope"])
    same(s["log_double_ratio_delta_SE_range"],si["delta_log_interaction_se_envelope"])
    print("PASS two independent implementations, alternate readings and matched-subset bounds")
if __name__=="__main__":replay()
