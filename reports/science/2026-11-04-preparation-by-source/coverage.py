"""Supporting exposures and forecast coverage; no invented target for missing clinical areas."""
import json
import math
from models import read,load_donors,assay_maps,midpoint

def run():
    donor=load_donors();record=read("donors.json");cai=record["Cai"]
    fixed=(cai["D20_C_S"],50/80)
    incomplete={}
    for name,(numer,denom,doi) in {
            "whole_over_ground_lentils":(12.1,60.9,"10.1093/ajcn/38.3.382"),
            "brown_whole_over_ground_rice":(17.6,68.2,"10.1093/ajcn/34.10.1991"),
            "white_whole_over_ground_rice":(30.8,71.8,"10.1093/ajcn/34.10.1991")}.items():
        h=numer/denom
        incomplete[name]={"doi":doi,"H30_percent":[numer,denom],"predictions":{"equal":1,"grain":donor["grain_reference"],
                        "pulse":donor["hummus_response"],**assay_maps(h,donor)},"confirmed_numeric_insulin_area":None,"error":None}
    return {"previous_review_refinement":{"assay":fixed[0],"posthoc_duration":fixed[1],"geometric_midpoint":midpoint(*fixed),
             "clinical_interval":cai["fieller"],"uniformly_below_midpoint":cai["fieller"][1]<midpoint(*fixed),
             "log_loss_advantage_for_any_ratio_below_both_predictions":math.log(fixed[1]/fixed[0]),
             "scope":"Exact fixed forecasts and absolute log error only; input uncertainty can reverse their order."},
             "unscored":incomplete}
if __name__=="__main__":print(json.dumps(run(),indent=2,allow_nan=False))
