"""Independent aggregate-only calculation. Python standard library only.
Figure readings are manually transcribed pixel centers from target_fig1g.gif,
crop origin (0,730). Readings are approximate, not underlying participant data.
Integrate the actual -5,30,...180 schedule with linear interpolation at t=0;
subtract each arm's own -5 baseline. No clipping and no extrapolation.
"""
from pathlib import Path
import math,json,hashlib,itertools
ROOT=Path(__file__).resolve().parent
TIMES=[-5,30,60,90,120,150,180]
# Coordinates refer to insulin-panels.png; y scale comes from labelled ticks.
PIXELS={
"fasting":{"T":[595,480,430,406,420,479,545],"G":[599,392,310,289,319,438,555],
           "I":[587,499,470,451,468,502,537],"S":[581,372,343,388,519,565,587]},
"mixed":{"T":[585,240,257,298,356,406,410],"G":[578,233,186,205,255,313,410],
         "I":[577,297,289,374,389,437,443],"S":[597,195,205,215,354,356,417]}}
SCALE={"T":557/220,"G":557/220,"I":546/180,"S":546/180}
TABLE={"fasting":{"T":9425,"G":15216,"I":5779,"S":7326},
       "mixed":{"T":17934,"G":20875,"I":11726,"S":17658}}
def trapezoid(y,end,baseline_at_zero=False):
    t=[0]+TIMES[1:] if baseline_at_zero else TIMES
    base=y[0]; a=0
    for t0,t1,y0,y1 in zip(t,t[1:],y,y[1:]):
        lo,hi=max(0,t0),min(end,t1)
        if lo>=hi: continue
        l=y0+(y1-y0)*(lo-t0)/(t1-t0)-base
        h=y0+(y1-y0)*(hi-t0)/(t1-t0)-base
        a+=(hi-lo)*(l+h)/2
    return a
def ratios(levels):
    a,b=levels["T"]/levels["G"],levels["I"]/levels["S"]
    return {"T/G":a,"I/S":b,"D":a/b}
frozen={"T/G":590/1709,"I/S":0.654771347866157}
frozen["D"]=frozen["T/G"]/frozen["I/S"]
common=[1,0.420,0.520757979630314,0.654771347866157,
        math.sqrt(frozen["T/G"]*frozen["I/S"])]
def errors(pred,obs):
    e={k:abs(math.log(pred[k]/obs[k])) for k in ["T/G","I/S","D"]}
    return {**e,"mean_pair_ALE":(e["T/G"]+e["I/S"])/2}
def evaluate(obs):
    return {"pair_specific":errors(frozen,obs),
       **{f"common_{c:.15g}":errors({"T/G":c,"I/S":c,"D":1},obs) for c in common}}
out={"frozen":frozen,"midpoint":math.sqrt(frozen["D"]),"table_3h":{},
     "figure_signed":{},"figure_timing_sensitivity":{}}
for context,pixels in PIXELS.items():
    out["table_3h"][context]={"levels":TABLE[context],"ratios":ratios(TABLE[context]),
                            "errors":evaluate(ratios(TABLE[context]))}
    # Absolute y-zero irrelevant after baseline subtraction.
    y={arm:[(641-v)/SCALE[arm] for v in vals] for arm,vals in pixels.items()}
    out["figure_signed"][context]={}
    out["figure_timing_sensitivity"][context]={}
    for end in (60,120,180):
        levels={k:trapezoid(v,end) for k,v in y.items()}
        obs=ratios(levels)
        # Worst-case independent +/-2 px errors at baseline and each center.
        bounds={}
        for arm,vals in y.items():
            candidates=[trapezoid([v+z*2/SCALE[arm] for v,z in zip(vals,signs)],end)
                        for signs in itertools.product((-1,1),repeat=7)]
            bounds[arm]=[min(candidates),max(candidates)]
        def divbound(a,b):
            return [a[0]/b[1],a[1]/b[0]]
        tg=divbound(bounds["T"],bounds["G"]); is_=divbound(bounds["I"],bounds["S"])
        out["figure_signed"][context][str(end)]={
             "levels":levels,"ratios":obs,"errors":evaluate(obs),"reading_2px_levels":bounds,
             "reading_2px_D_bounds":divbound(tg,is_)}
        alt={k:trapezoid(v,end,True) for k,v in y.items()}
        out["figure_timing_sensitivity"][context][str(end)]={"baseline_relocated_to_zero":ratios(alt)}
out["protocol_change_table"]=out["table_3h"]["mixed"]["ratios"]["D"]/out["table_3h"]["fasting"]["ratios"]["D"]
out["hashes"]={x.name:hashlib.sha256(x.read_bytes()).hexdigest()
               for x in ROOT.iterdir() if x.suffix in (".pdf",".gif",".html",".md") and x.name!="report.md"}
(ROOT/"results.json").write_text(json.dumps(out,indent=2))
if __name__ == "__main__":
    print(json.dumps(out,indent=2))
