"""Quek all six comparable prepared meal contrasts. Strict coverage and two conditional proxies."""
import argparse
import itertools
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def run():
    data=json.loads((ROOT/"FACTS.json").read_text(encoding="utf-8-sig"))
    rows=data["rows"]
    rice=rows["rice"]
    additions={name:r for name,r in rows.items() if name!="rice"}
    assert all(r[0]-rice[0]==25 and r[1]==rice[1] for r in additions.values())
    scale=data["figure_ticks"]["area_span"]/data["figure_ticks"]["height_pt"]
    native={name:r[-1]*scale for name,r in rows.items()}
    strict={name:None for name in rows}
    doses={
        "source_AA_share":{k:(r[0]-rice[0])*r[4]/r[5] for k,r in additions.items()},
        "whole_meal_mass_difference":{k:(r[3]-rice[3])*r[4]/100000 for k,r in additions.items()}}
    out={}
    for proxy,d in doses.items():
        pairs=[]
        for a,b in itertools.combinations(additions,2):
            observed=native[a]/native[b]
            pred={"matched_tie":1.0}
            for model,slope in data["slopes_per_g_leucine"].items():
                pred[model]=math.exp(slope*(d[a]-d[b]))
            pairs.append(dict(a=a,b=b,observed=observed,predictions=pred,
                              errors={k:abs(math.log(v/observed)) for k,v in pred.items()}))
        out[proxy]=dict(conditional_added_leucine_g=d,pairs=pairs,
                        mean_abs_log_error={k:sum(p["errors"][k] for p in pairs)/6 for k in pairs[0]["errors"]})
    return dict(strict_served_leucine_g=strict,vector_read_areas=native,
                figure_ratios_vs_rice={k:v/native["rice"] for k,v in native.items()},scenarios=out)

def check(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for k in a:check(a[k],b[k])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):check(x,y)
    elif isinstance(a,(str,type(None))):assert a==b
    else:assert math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-12)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    result=run()
    if parser.parse_args().check:
        check(result,json.loads((ROOT/"RESULTS.json").read_text(encoding="utf-8-sig")))
        print("PASS all six pairs in both conditional scenarios; strict servings unavailable")
    else:print(json.dumps(result,indent=2))
