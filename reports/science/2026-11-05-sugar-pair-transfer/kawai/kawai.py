"""Reproduce the held Kawai healthy human insulin curve check. Python stdlib only.

coordinates.csv records native image pixels from J-STAGE PDF, Fig. 1 lower
panel. Source PDF, downloaded scan and third-party libraries are unnecessary.
"""
import csv
import itertools
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
Y0, Y50 = 5150., 3991.
SCALE = 50/(Y0-Y50)
TIMES = (0, 15, 30, 60, 90, 120)
DONOR = {60: 0.41470337160713994, 120: 0.5799043269598717, 180: 0.6887563107610193}
HOLUB = 0.654771347866157


def write(name, cols, rows):
    with (ROOT / name).open("w",newline="",encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(cols)
        writer.writerows(rows)


def profile(v, times=TIMES):
    return [sum((b-a)*(v[j]+v[j+1]-2*v[0])/2 for j,(a,b) in enumerate(zip(times,times[1:])) if b<=end) for end in (60,120)]


def assess(i,s):
    obs = [a/b for a,b in zip(i,s)]
    oracle = math.sqrt(obs[0]*obs[1])
    models = {"donor_varying":[DONOR[60],DONOR[120]], "donor_fixed120":[DONOR[120]]*2,
              "holub_fixed":[HOLUB]*2, "equality":[1.,1.],"target_oracle_fixed":[oracle]*2}
    results = {}
    for name,pred in models.items():
        errors=[math.log(p/o) for p,o in zip(pred,obs)]
        results[name]={"predictions":pred,"signed_log_errors":errors,"mean_abs_log_error":sum(map(abs,errors))/2}
    fold=obs[1]/obs[0]
    donor_fold=DONOR[120]/DONOR[60]
    return {"observed":obs,"fold_120_over_60":fold,"oracle_fixed_interval":sorted(obs),
            "models":results,"shape_donor_abs_log_error":abs(math.log(donor_fold/fold)),
            "shape_flat_abs_log_error":abs(math.log(fold)),
            "target60_anchored_pred120":obs[0]*donor_fold,"flat_anchored_pred120":obs[0]}


def sensitivity(values,radius):
    # Enumerate all 12 vertex choices. Retain shared baseline and shared
    # early timepoints when evaluating the 120/60 fold for each arm.
    def possibilities(arm):
        return [profile([v + sign*radius*SCALE for v,sign in zip(values[arm],signs)])
                for signs in itertools.product((-1,1),repeat=len(TIMES))]
    ip,sp=possibilities("I"),possibilities("S")
    bounds={}
    for i,s in itertools.product(ip,sp):
        assert min(i+s)>0
        data=assess(i,s)
        ratios=data["observed"]
        models=data["models"]
        x={"R60":ratios[0],"R120":ratios[1],"fold":data["fold_120_over_60"],
            "varying_minus_fixed120_error":models["donor_varying"]["mean_abs_log_error"]-models["donor_fixed120"]["mean_abs_log_error"],
            "varying_minus_oracle_error":models["donor_varying"]["mean_abs_log_error"]-models["target_oracle_fixed"]["mean_abs_log_error"],
            "shape_minus_flat_error":data["shape_donor_abs_log_error"]-data["shape_flat_abs_log_error"]}
        for key,value in x.items():
            lo,hi=bounds.get(key,(value,value))
            bounds[key]=[min(lo,value),max(hi,value)]
    return bounds


def main():
    with (ROOT/"coordinates.csv").open(newline="",encoding="utf-8-sig") as stream:
        rows=list(csv.DictReader(stream))
    values,local={"I":[],"S":[]},{"I":[],"S":[]}
    curve=[]
    for r in rows:
        arm,t=r["arm"],int(r["t_min"])
        y=int(r["center_y_px"])
        value=(Y0-y)*SCALE
        values[arm].append(value)
        local[arm].append((int(r["local_zero_y_px"])-y)*SCALE)
        curve.append((arm,t,value,abs(y-int(r["sem_outer_y_px"]))*SCALE))
    assert [int(r["t_min"]) for r in rows if r["arm"]=="I"]==list(TIMES)
    assert [int(r["t_min"]) for r in rows if r["arm"]=="S"]==list(TIMES)
    ans=assess(profile(values["I"]),profile(values["S"]))
    areas={a:profile(v) for a,v in values.items()}
    write("curve.csv",["arm","t_min","mean_uU_per_mL","reading_SEM_uU_per_mL"],curve)
    write("areas.csv",["end_min","I_signed","S_signed","I_over_S"],[(t,*[areas[a][j] for a in "IS"],ans["observed"][j]) for j,t in enumerate((60,120))])
    anchored={a:v.copy() for a,v in values.items()}
    anchored["I"][0]=11.5
    anchored["S"][3]=43.8
    diagnostics={
        "using_local_axis_zero":assess(profile(local["I"]),profile(local["S"])),
        "using_printed_I0_and_S60":assess(profile(anchored["I"]),profile(anchored["S"])),
        "drop_observed_15_to_match_donor_schedule":assess(*[profile(v[:1]+v[2:],TIMES[:1]+TIMES[2:]) for v in values.values()]),
        "unweighted_sum_of_increments":{a:sum(v[1:])-(len(v)-1)*v[0] for a,v in values.items()},
        "published_sum_of_increments":{"I_mean":56.5,"I_sem":4.7,"S_mean":118.7,"S_sem":20.3}}
    out={"healthy_1985":ans,"donor_shape_120_over_60":DONOR[120]/DONOR[60],"available_windows_min":[60,120],
         "reading_sensitivity_vertex_ranges":{str(n):sensitivity(values,n) for n in (2,4,8)},
         "diagnostics":diagnostics}
    (ROOT/"results.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8")
    assert abs(areas["I"][1]-areas["I"][0])>100
    print(json.dumps({"areas":areas,"main":ans,"sensitivity_4px":out["reading_sensitivity_vertex_ranges"]["4"],"alternatives":{k:v["fold_120_over_60"] for k,v in diagnostics.items() if "fold_120_over_60" in v}},indent=2))


if __name__=="__main__":
    main()
