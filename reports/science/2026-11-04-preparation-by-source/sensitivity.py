"""Source uncertainty and restrictions on exact, fixed forecast maps."""
import json
import math
from bornet import calculate
from models import read

def run():
    data=calculate(); spec=read("bornet_inputs.json")
    total={}; add_se=[]; log_se=[]
    for g in ("raw","gel"):
        a,b=spec["groups"][g]["arms"][:2]
        x,y=b["printed_insulin_180"],a["printed_insulin_180"]
        sx,sy=b["printed_insulin_180_sem"],a["printed_insulin_180_sem"]
        total[g]=x-y
        add_se.append((abs(sx-sy),sx+sy))
        log_se.append((abs(sx/x-sy/y),sx/x+sy/y))
    def across(groups):
        return [math.hypot(*v) for v in zip(*groups)]
    uncertainty={"additive_change_by_group_cassava_minus_wheat":total,"difference_in_differences":total["gel"]-total["raw"],
                 "possible_SE_difference_in_differences":across(add_se),
                 "log_double_ratio_delta_SE_range":across(log_se),"assumptions":"Independent six-person treatment cohorts; within each, paired correlation unknown in [-1,1]. Delta ratio SE approximate; neither range is a confidence interval."}
    purity={"wheat":97.5,"manihot":99.7,"smooth_pea":95.3,"mung_noodle":97.6,
            "extruded_wheat":97.5,"tapioca":99.7}
    alt={}
    for g,group in data["groups"].items():
        alt[g]={}
        for c in group["contrasts"]:
            left,right=c["contrast"].split("/")
            factor=purity[left]/purity[right]
            alt[g][c["contrast"]]={"ratio_if_35g_unadjusted_dry_material":factor,"amylopectin_if_unadjusted":c["predicted"]["amylopectin"]*factor}
    return {"uncertainty_180":uncertainty,"dry_product_instead_of_equal_starch_sensitivity":alt,
            "note":"The article specifies 35g starch, dry basis. Alternative native purity scaling only; same cassava/wheat composition factor still cancels in the heat double ratio."}
if __name__=="__main__":print(json.dumps(run(),indent=2,allow_nan=False))
