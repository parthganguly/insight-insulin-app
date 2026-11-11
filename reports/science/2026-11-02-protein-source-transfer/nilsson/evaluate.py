"""Verify the frozen food forecasts and score ratios of native group means."""
import hashlib
import itertools
import json
import math
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parent

def lan(g):
    knots = [1, 1.1666666666666667, 1.5518518518518518]
    assert 0 <= g <= 30
    if g <= 5:
        return 1+(knots[1]-1)*g/5
    return knots[1]+(knots[2]-knots[1])*(g-5)/25

def compute():
    facts=json.loads((ROOT/"FACTS.json").read_text(encoding="utf-8-sig"))
    inputs=facts["inputs"]
    file=ROOT/"FROZEN.json"
    assert hashlib.sha256(file.read_bytes()).hexdigest()=="a9ec75b95b4ded70a41e25504e0cdbea871851677de03ff7eee5cd8a20236ea4"
    pred=json.loads(file.read_text())
    observed=facts["mean_SEM_Tukey"]
    fractions=[v/1000 for v in inputs["whey_table2_mg_per_g_whey"]]
    for arm,d in inputs["total_protein_or_free_AA_g"].items():
        aa=[d*v for v in fractions] if arm=="whey" else inputs["free_AA_g_order_Leu_Ile_Val_Lys_Thr"][arm]
        check=dict(no_change=1,energy_macro=1+d/25,AA_or_protein_grams=lan(d),
                   conditional_leucine=lan(aa[0]/fractions[0]),conditional_five_AA=lan(sum(aa)/sum(fractions)))
        for key in check:assert math.isclose(check[key],pred[arm][key],rel_tol=1e-12)
    rows={}
    for a,b in itertools.combinations(["whey","AA2","AA3","AA5","glucose"],2):
        o=observed[a][0]/observed[b][0]
        forecast={k:pred[a][k]/pred[b][k] for k in pred[a]}
        rows[a+"/"+b]=dict(observed=o,prediction=forecast,
                            errors={k:abs(math.log(v/o)) for k,v in forecast.items()},
                            source_Tukey_distinguished=set(observed[a][2]).isdisjoint(observed[b][2]))
    mae={k:sum(row["errors"][k] for pair,row in rows.items() if pair.endswith("/glucose"))/4
         for k in pred["whey"]}
    means={k:v[0] for k,v in observed.items()}
    mix={"AA3_plus_AA2_minus_G":means["AA3"]+means["AA2"]-means["glucose"],
         "AA3_only":means["AA3"],"AA2_only":means["AA2"],"glucose_only":means["glucose"]}
    return dict(pairwise=rows,mean_absolute_log_error=mae,mixture_calibrated={
        k:dict(predicted=v,observed=means["AA5"],abs_error=abs(v-means["AA5"]),
               signed_observed_minus_predicted=means["AA5"]-v) for k,v in mix.items()})
def check(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for key in a:check(a[key],b[key])
    elif isinstance(a,bool):assert a is b
    else:assert math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-12)
if __name__=="__main__":
    result=compute()
    if "--check" in sys.argv:
        check(result,json.loads((ROOT/"RESULTS.json").read_text(encoding="utf-8-sig")))
        print("PASS all ten arm pairs, five rules, four component/calibration forecasts and source freeze")
    else:print(json.dumps(result,indent=2))
