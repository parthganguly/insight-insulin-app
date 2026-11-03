"""Run frozen preparation-matched forecasts; only public aggregate data are required."""
from itertools import product
import json
from math import exp, log
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def area(times, levels, stop):
    return sum((b-a)*((left+right)/2-levels[0])
               for a,b,left,right in zip(times,times[1:],levels,levels[1:]) if b<=stop)

def evaluate():
    facts = read(HERE/"facts.json")
    graph = read(ROOT/"curves/graph-input.json")
    times = graph["minutes"]
    curves = {name: s["means"] for panel in graph["panels"].values()
              for name,s in panel["series"].items()}
    fig = facts["concurrent_figure"]
    z, tick = fig["zero_y"], fig["tick_3500_y"]
    y = fig["top_y"]
    concurrent = {name:(z-y[name])*3500/(z-tick) for name in ("CHO","soy","pea")}
    net = {arm:vals[0] for arm,vals in facts["staggered_150_native"].items()}
    external_ratio = concurrent["pea"]/concurrent["soy"]
    possible = [(zz-pp)/(zz-ss) for zz,pp,ss in product(
        (z-1,z+1),(y["pea"]-1,y["pea"]+1),(y["soy"]-1,y["soy"]+1))]
    pea_profile = facts["old_projection"]["pea"]
    soy_profile = facts["old_projection"]["soy"]
    m = facts["g_per_kg"]*facts["mean_kg"]
    source_profiles = facts["concurrent_percent_dry_product"]
    target_profiles = facts["staggered_percent_dry_product"]
    differences = {p:[i-j for i,j in zip(source_profiles[p],target_profiles[p])]
                   for p in ("pea","soy")}
    leu = facts["named_coordinates"].index("Leu")
    # Product dry mass at the stated nominal hydrolysate load; mean-BW proxy.
    gram_difference = m*(target_profiles["pea"][leu]-target_profiles["soy"][leu])/100
    candidates = {"same_composition_reference":1.0,
                  "source_matched_response":external_ratio,
                  "three_reference_projection":pea_profile/soy_profile,
                  "substitution_slope_dry_product_mean_weight_scenario":
                      exp(facts["substitution_slope"]*gram_difference)}
    sections = {}
    for window,pea,soy in [
            ("published_150",net["pea_CHO"],net["soy_CHO"]),
            ("curve_net_120",area(times,curves["pea_then_cho"],120),
                            area(times,curves["soy_then_cho"],120))]:
        obs = pea/soy
        sections[window] = {"native_pea":pea,"native_soy_reference":soy,"observed_ratio":obs,
            "predictions":{name:{"ratio":r,"absolute_log_error":abs(log(r/obs)),
                      "conditional_native_pea_using_local_soy":r*soy}
                           for name,r in candidates.items()},
            "pea_net_minus_external_ratio_times_soy":pea-external_ratio*soy,
            "observed_native_difference":pea-soy}
    mix_control = {p:concurrent[p]/concurrent["CHO"] for p in ("soy","pea")}
    target_control = {p:net[p+"_CHO"]/net["CHO"] for p in ("soy","pea")}
    level_refs = {"external_concurrent_control_ratios":mix_control,
                  "equal_input_energy_vs_CHO":{"pea":2,"soy":2},
                  "unchanged_vs_CHO":{"pea":1,"soy":1},
                  "old_profile_ratios":facts["old_projection"]}
    level_errors = {}
    for n,ratios in level_refs.items():
        errors = {p:abs(log(ratios[p]/target_control[p])) for p in ("soy","pea")}
        level_errors[n] = {"predicted_ratios":ratios, "abs_log_error":errors,
                           "two_meal_mean_error":sum(errors.values())/len(errors)}
    increment_ratio=(concurrent["pea"]-concurrent["CHO"])/(concurrent["soy"]-concurrent["CHO"])
    # CHO alone at time zero differs from the delayed CHO condition; descriptive sensitivity.
    inc_target=(net["pea_CHO"]-net["CHO"])/(net["soy_CHO"]-net["CHO"])
    return {"matched_profile_differences_pp":differences,"external_concurrent_native":concurrent,
            "nominal_leucine_difference_g_scenario":gram_difference,
            "primary_table_and_secondary_curve":sections,
            "external_ratio_shared_reading_box":[min(possible),max(possible)],
            "source_referenced_level_test":{"target_reference_CHO":net["CHO"],
                    "target_ratios":target_control,"candidates":level_errors},
            "absolute_native_food_inputs_alone":{"predicted_arms":0,"eligible_arms":2},
            "common_CHO_subtraction_sensitivity":{
                "external_ratio_of_increments":increment_ratio,
                "target_ratio_of_increments":inc_target,
                "target_pea_conditional_on_measured_CHO_and_soy":
                    net["CHO"]+increment_ratio*(net["soy_CHO"]-net["CHO"]),
                "conditional_level_uses_two_local_measurements":True}}

if __name__ == "__main__":
    result=evaluate()
    if sys.argv[1:]==["--snapshot"]:
        (HERE/"comparison.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    elif sys.argv[1:]:
        raise SystemExit("usage: compare.py [--snapshot]")
    else:
        print(json.dumps(result,indent=2))
