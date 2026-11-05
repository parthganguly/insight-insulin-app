"""Independent arithmetic/interpretation review, public aggregates only.

Run: python -I -X utf8 verify_opus.py
Writes nothing; emits JSON to stdout. Does not execute/import Opus code.
"""
import csv
import hashlib
import itertools
import json
import math
from pathlib import Path
from statistics import NormalDist


PARENT = Path(__file__).resolve().parent.parent
ROOT = PARENT if (PARENT / "pilot/results.json").is_file() and (PARENT / "opus/DIAGNOSTIC.json").is_file() else PARENT / "public" / "correction"


def read(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main():
    a = read("pilot/aggregate.json")["windows"]["120"]
    pr = read("pilot/results.json")
    op = read("opus/DIAGNOSTIC.json")
    bread = read("bread/results.json")
    external = read("external/results.json")
    with (ROOT / "astra/aggregate.csv").open(encoding="utf-8", newline="") as f:
        facts = {(r["study"], r["arm"], r["measure"], r["minutes"]): float(r["value"])
                 for r in csv.DictReader(f)}
    checks = []

    def check(label, actual, expected, absolute_tolerance=1e-12):
        if isinstance(actual, (int, float)) and not isinstance(actual, bool):
            passed = math.isclose(actual, expected, rel_tol=1e-11, abs_tol=absolute_tolerance)
        else:
            passed = actual == expected
        checks.append({"check": label, "pass": passed})
        if not passed:
            checks[-1].update(actual=actual, expected=expected)

    names = a["covariance_order"]
    means = {name: a["positive"]["arms"][name]["mean"] for name in names}
    covariance = a["positive_covariance_of_means"]
    pairs = {"C_B": ("Intact-C", "Broken"), "S_B": ("Intact-S", "Broken"),
             "C_S": ("Intact-C", "Intact-S")}
    obs, se, ci, ci_z = {}, {}, {}, {}
    z95 = NormalDist().inv_cdf(0.975)
    # Independent df=9 Student CDF: t=3*tan(theta), integral of cos(theta)**8.
    def student9_cdf(value):
        theta = math.atan(value/3)
        integral = theta
        for power in (2, 4, 6, 8):
            integral = math.sin(theta)*math.cos(theta)**(power-1)/power + (power-1)*integral/power
        return .5 + math.gamma(5)/(math.sqrt(math.pi)*math.gamma(4.5))*integral
    low, high = 0., 10.
    for _ in range(80):
        middle = (low+high)/2
        if student9_cdf(middle) < .975:
            low = middle
        else:
            high = middle
    t95 = (low+high)/2

    def fieller(x, y, vx, vy, cov, critical):
        aa = y*y - critical*critical*vy
        bb = -2*x*y + 2*critical*critical*cov
        cc = x*x - critical*critical*vx
        return [(-bb-math.sqrt(bb*bb-4*aa*cc))/(2*aa),
                (-bb+math.sqrt(bb*bb-4*aa*cc))/(2*aa)]

    for q, (num, den) in pairs.items():
        i, j = names.index(num), names.index(den)
        x, y = means[num], means[den]
        vx, vy, cov = covariance[i][i], covariance[j][j], covariance[i][j]
        obs[q] = x / y
        se[q] = math.sqrt(vx/x**2 + vy/y**2 - 2*cov/(x*y))
        ci[q] = fieller(x, y, vx, vy, cov, t95)
        ci_z[q] = fieller(x, y, vx, vy, cov, z95)
        aggregate_pair = a["positive"]["pairs"][num + "/" + den]
        check(q+" observed ratio", obs[q], aggregate_pair["ratio"])
        check(q+" paired log SE", se[q], aggregate_pair["paired_delta_log_ratio_sem"])
        check(q+" paired difference SE", math.sqrt(vx+vy-2*cov), aggregate_pair["paired_difference_sem"])
        check(q+" Opus observed ratio", obs[q], op["target"]["observed"][q])
        check(q+" Opus log SE", se[q], op["target"]["observed_paired_delta_log_SE"][q])
        for k in (0, 1):
            # Independent exact-CDF inversion differs from the supplied rounded
            # numerical quantile by 5.6e-11; allow 1e-10 in derived endpoints.
            check(q+" Fieller endpoint "+str(k), ci[q][k], op["target"]["clinical_fieller_95_normal_theory"][q][k], 1e-10)
    for name in names:
        aa = a["positive"]["arms"][name]
        check(name+" SD/sqrt(n)", aa["sd"]/math.sqrt(aa["n"]), aa["sem"])
        check(name+" covariance diagonal", covariance[names.index(name)][names.index(name)], aa["sem"]**2)

    times = (20, 60, 90, 120)
    hydro = {n: [facts[("Cai2025", n, "measured_amylo_pct", str(t))] for t in times] for n in names}
    raw_ratios = {t: {q: hydro[num][i]/hydro[den][i] for q, (num, den) in pairs.items()}
                  for i, t in enumerate(times)}
    anchor = facts[("Alshaalan2024", "ICC", "net_AUC_uU_min_mL", "120")] / facts[("Alshaalan2024", "RCC", "net_AUC_uU_min_mL", "120")]
    hummus_h20 = facts[("Alshaalan2024", "ICC", "measured_amylo_pct", "20")] / facts[("Alshaalan2024", "RCC", "measured_amylo_pct", "20")]
    beta = math.log(anchor)/math.log(hummus_h20)

    def ratios(c, s):
        return {"C_B": c, "S_B": s, "C_S": c/s}

    models = {"same_starch": ratios(1, 1), "hummus_process": ratios(anchor, anchor),
              "prior_ingredient_H120": ratios(31/90, 31/90),
              "S_anchor_H20": ratios(anchor*raw_ratios[20]["C_S"], anchor),
              "external_beta_H20": ratios(raw_ratios[20]["C_B"]**beta, raw_ratios[20]["S_B"]**beta),
              "posthoc_S_anchor_time": ratios(anchor*50/80, anchor),
              "posthoc_time_only": ratios(50/28, 80/28)}
    models.update({"local_H"+str(t): raw_ratios[t] for t in times})
    compat = {}
    for name, predictions in models.items():
        compat[name] = {}
        for q, pred in predictions.items():
            check(name+" "+q+" reconstruction", pred, pr["models"][name][q])
            error = abs(math.log(pred/obs[q]))
            check(name+" "+q+" error", error, pr["models"][name][q+"_error"])
            record = {"pred": pred, "inside_clinical_95": ci[q][0] <= pred <= ci[q][1],
                      "z_vs_paired_SE": math.log(pred/obs[q])/se[q]}
            compat[name][q] = record
            for field, value in record.items():
                check(name+" "+q+" Opus "+field, value, op["rule_compatibility_with_clinical_interval"][name][q][field])
        check(name+" primary error", sum(abs(math.log(predictions[q]/obs[q])) for q in ("C_B", "S_B"))/2,
              pr["models"][name]["primary_error"])
    inside = [n for n, p in compat.items() if p["C_S"]["inside_clinical_95"]]
    check("no rule centrally inside C/S CI", inside, [])

    comparisons = {"D20_anchored_vs_posthoc_5080_anchored": ("S_anchor_H20", "posthoc_S_anchor_time"),
                   "D20_standalone_vs_D20_anchored": ("local_H20", "S_anchor_H20"),
                   "D20_standalone_vs_hummus_shared_factor": ("local_H20", "hummus_process"),
                   "D20_anchored_vs_hummus_shared_factor": ("S_anchor_H20", "hummus_process")}
    separation = {}
    for label, (first, second) in comparisons.items():
        separation[label] = {}
        for q in pairs:
            diff = abs(math.log(models[first][q]/models[second][q]))
            separation[label][q] = {"delta_log": diff, "in_observed_paired_SE_units": diff/se[q]}
            for field, value in separation[label][q].items():
                check(label+" "+q+" "+field, value, op["anchored_vs_standalone"]["pairs"][label][q][field])
        shared = [q for q in pairs if math.isclose(models[first][q], models[second][q], rel_tol=1e-12)]
        separation[label]["shared_inputs"] = shared
        check(label+" shared", shared, op["anchored_vs_standalone"]["pairs"][label]["identical_inputs"])
        for name in (first, second):
            check(label+" primary "+name, pr["models"][name]["primary_error"], op["anchored_vs_standalone"]["pairs"][label]["observed_primary_error"][name])

    declines = {n: [max(0., v[i]-v[i+1]) for i in range(3)] for n, v in hydro.items()}
    for n in names:
        for i, value in enumerate(hydro[n]):
            check(n+" hydro "+str(times[i]), value, op["assay"]["percent_hydrolysed"][n][i])
        for i, value in enumerate(declines[n]):
            check(n+" decline "+str(i), value, op["assay"]["observed_60_90_mean_decrements_pp"][n][i])
    dvalues = sorted({x for dd in declines.values() for x in dd if x > 0})
    envelopes = {}
    shared_min = abs(math.log(obs["C_S"]))/2
    check("best shared primary bound", shared_min, pr["minimum_error_for_any_shared_intact_factor"])

    def loss_extrema(d):
        bounds = {n: (math.log(hydro[n][0]-d), math.log(hydro[n][0]+d)) for n in names}
        def distance(x, interval):
            return max(interval[0]-x, 0., x-interval[1])
        # For fixed log B, optimize log C and log S separately by projection.
        # The remaining objective is piecewise linear with these four breakpoints.
        bbound = bounds["Broken"]
        ctarget = tuple(x-math.log(obs["C_B"]) for x in bounds["Intact-C"])
        starget = tuple(x-math.log(obs["S_B"]) for x in bounds["Intact-S"])
        candidates = [max(bbound[0], min(bbound[1], x)) for x in bbound+ctarget+starget]
        stand_min = min((distance(x, ctarget)+distance(x, starget))/2 for x in candidates)
        logcs = (bounds["Intact-C"][0]-bounds["Intact-S"][1], bounds["Intact-C"][1]-bounds["Intact-S"][0])
        anchored_min = (distance(math.log(obs["C_B"]/anchor), logcs)+abs(math.log(anchor/obs["S_B"])))/2
        cs_min = distance(math.log(obs["C_S"]), logcs)
        maxima = [0., 0., 0.]
        for b, s, c in itertools.product(*(bounds[n] for n in names)):
            losses = ((abs(c-b-math.log(obs["C_B"]))+abs(s-b-math.log(obs["S_B"])))/2,
                      (abs(math.log(anchor)+c-s-math.log(obs["C_B"]))+abs(math.log(anchor/obs["S_B"])))/2,
                      abs(c-s-math.log(obs["C_S"])))
            maxima = [max(old, new) for old, new in zip(maxima, losses)]
        return {key: [mn, mx] for key, mn, mx in zip(("primary_standalone", "primary_anchored", "C_S_error"), (stand_min, anchored_min, cs_min), maxima)}

    for label, d in zip(("delta_min_observed_decrement", "delta_max_observed_decrement"), (min(dvalues), max(dvalues))):
        ranges = {q: [(hydro[num][0]-d)/(hydro[den][0]+d), (hydro[num][0]+d)/(hydro[den][0]-d)] for q, (num, den) in pairs.items()}
        corners = []
        for shifts in itertools.product((-d, d), repeat=3):
            b, s, c = [hydro[n][0]+shift for n, shift in zip(names, shifts)]
            loss = (abs(math.log(c/b/obs["C_B"]))+abs(math.log(s/b/obs["S_B"])))/2
            corners.append({"shifts_B_S_C_pp": shifts, "primary_error": loss})
        worst = max(corners, key=lambda r: r["primary_error"])
        envelopes[label] = {"assumed_delta_pp": d, "ranges": ranges,
                            "worst_primary_error_continuous_box": worst,
                            "best_shared_factor_primary_error": shared_min,
                            "strictly_better_than_every_shared_factor_throughout_box": worst["primary_error"] < shared_min,
                            "proof": "Loss is convex in log B, log S, log C, so maximum over log rectangular box occurs at a vertex.",
                            "intersects_all_three_marginal_intervals": all(lo <= ci[q][1] and hi >= ci[q][0] for q, (lo, hi) in ranges.items())}
        expected = op["assay"]["perturbation_boxes"][f"pm_{d:.2f}_pp"]
        ex = loss_extrema(d)
        envelopes[label]["independent_exact_extrema"] = ex
        for metric, interval in ex.items():
            for i in (0, 1):
                check(label+" exact "+metric+" "+str(i), interval[i], expected["extrema"][metric][i])
        for metric, field in (("primary_standalone", "standalone_below_hummus_throughout"), ("primary_anchored", "anchored_below_hummus_throughout")):
            check(label+" "+field, ex[metric][1] < shared_min, expected[field])
        time_loss = pr["models"]["posthoc_S_anchor_time"]["primary_error"]
        envelopes[label]["anchored_minus_5080_primary"] = [x-time_loss for x in ex["primary_anchored"]]
        for i in (0, 1):
            check(label+" anchored minus 5080 "+str(i), ex["primary_anchored"][i]-time_loss, expected["anchored_minus_5080"][i])
        check(label+" delta", d, expected["half_width_pp"])
        for q, endpoints in ranges.items():
            for i in (0, 1):
                check(label+" "+q+" range "+str(i), endpoints[i], expected["D20_ratio_ranges"][q][i])
    needed = hydro["Intact-S"][0]*ci["C_S"][1]
    check("C shift needed", hydro["Intact-C"][0]-needed, op["assay"]["shift_to_reach_clinical_CS_upper_pp"], 1e-9)
    for t in times:
        check("C/S time "+str(t), raw_ratios[t]["C_S"], op["assay"]["assay_C_S_by_time"][str(t)])

    breakeven = {}
    for key, metric in (("standalone", "primary_standalone"), ("anchored", "primary_anchored")):
        low, high = 0., min(hydro[n][0] for n in names)-1e-6
        for _ in range(100):
            middle = (low+high)/2
            if loss_extrema(middle)[metric][1] < shared_min:
                low = middle
            else:
                high = middle
        breakeven[key] = high
        check(key+" exact primary breakeven", high, op["assay"]["breakeven_half_width_pp_where_box_max_primary_reaches_hummus"][key])
    for key, model, field in (("primary_standalone", "local_H20", "primary_error"), ("primary_anchored", "S_anchor_H20", "primary_error"), ("C_S_error", "local_H20", "C_S_error"), ("hummus_primary", "hummus_process", "primary_error"), ("posthoc_5080_anchored_primary", "posthoc_S_anchor_time", "primary_error")):
        check("central "+key, pr["models"][model][field], op["assay"]["central_observed"][key])

    # Recompute bread losses from published score inputs, not the reported losses.
    bread_values = {}
    areas = bread["native_areas"]
    targets = (areas[1]/areas[0], areas[2]/areas[0], areas[2]/areas[1])
    for name, reported in op["bread_assay_vs_label"]["bajka_rolls_development"].items():
        scores = bread["models"][name]["roll_scores"]
        pp = (scores[1]/scores[0], scores[2]/scores[0], scores[2]/scores[1])
        errors = [abs(math.log(p/o)) for p, o in zip(pp, targets)]
        bread_values[name] = {"mean_error_vs_control": sum(errors[:2])/2, "separation_error": errors[2]}
        for field, value in bread_values[name].items():
            check("bread "+name+" "+field, value, reported[field])
    kanata = {}
    kar = external["outcomes"]["120"]["areas_CFM_CLP"]
    ko = kar[1]/kar[0]
    for name, forecast in external["forecasts"].items():
        kanata[name] = abs(math.log(forecast/ko))
        check("Kanata "+name, kanata[name], op["bread_assay_vs_label"]["kanata_120_signed_group"][name])
    check("Kanata own assay coverage", external["own_bread_H20_coverage"], op["bread_assay_vs_label"]["kanata_bread_assay_coverage"])

    report = {
        "scope": "Fresh independent check of Opus diagnostic, using supplied public aggregates only; no source extraction or participant-record check, no app edits, no coefficients selected.",
        "arithmetic_status": "PASS" if all(r["pass"] for r in checks) else "FAIL",
        "arithmetic_checks": {"total": len(checks), "passed": sum(r["pass"] for r in checks), "failed": [r for r in checks if not r["pass"]]},
        "verified_artifacts_sha256": {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ("opus/diagnostic.py", "opus/DIAGNOSTIC.md", "opus/DIAGNOSTIC.json")},
        "endpoint": "ratio of arithmetic arm means of participant-positive insulin area, published time-zero through 120 min; first-bite offset unknown; ten complete crossover triplets",
        "observed": obs, "paired_delta_log_SE": se, "normal_theory_Fieller_95_t9": ci,
        "critical_value_t9_independent_CDF_inversion": t95,
        "normal_theory_Fieller_95_z_sensitivity_only": ci_z,
        "z_sensitivity_C_D20_shift_pp_to_upper_C_S": hydro["Intact-C"][0]-hydro["Intact-S"][0]*ci_z["C_S"][1],
        "SEM_interpretation": "SE of log ratio of correlated arm means, computed by paired delta method from covariance of means. Not SD/SEM of participant log ratios, and not assay-reading SEM. Intended Fieller intervals use Student t9 (approximately 2.2621571628); 'normal-theory' denotes normal paired variates with estimated variance. Normal-z intervals are supplied separately as a sensitivity, not a correction. Observed-SE distances are descriptive, not exact finite-sample tests.",
        "central_rules_inside_C_S_interval": inside,
        "comparison_distances": separation,
        "late_declines_pp": declines,
        "assumed_sensitivity_boxes": envelopes,
        "exact_primary_breakeven_half_width_pp": breakeven,
        "C_D20_shift_pp_to_upper_C_S_interval_holding_S_fixed": hydro["Intact-C"][0]-needed,
        "bread_recomputed": bread_values, "kanata_recomputed": kanata,
        "interpretation_status": "V2_SUBSTANTIVE_INTERPRETATION_SUPPORTED_WITH_SOURCE_LIMITS",
        "v1_corrections_resolved_by_v2": [
            "The nonzero D20-versus-50/80 difference is small relative to observed paired log SE, not a structural impossibility of discrimination. V2 corrects this.",
            "Standalone and anchored D20 differ on C/B and S/B; C/S is identical. V2 corrects this.",
            "A late nonmonotone hydrolysis reading diagnoses some combination of experimental variation, rounding/digitization, or protocol effects. It does not estimate a D20 per-point SD, SEM, error bar, or minimum empirical noise scale for every point. Even under monotonic truth and equal bounded measurement errors, a decrement d implies only that at least one of the two late errors has magnitude at least d/2; it supplies no lower bound on early-time error.",
            "The +/-1.337793 and +/-3.478261 pp boxes are assumed post-result sensitivity scenarios. Central D20 C/S=0.616438 lies above Fieller upper=0.572214. V2 correctly distinguishes illustrative sensitivity from measured assay precision.",
            "Retain the concrete descriptive comparison: frozen D20 primary mean absolute log error=0.233387 versus hummus=0.469843. It also has smaller C/S error (0.455888 versus 0.939685). Both observations are true, with neither proving prospective assay-specific value over a duration label.",
            "D20's primary-error advantage survives throughout both assumed boxes, even relative to the theoretical best possible shared-factor rule, conditional on fixed target means and this loss. This is conditional robustness, not population validation.",
        ],
        "remaining_source_and_inference_limits": [
            "Cai assay n=3, SEM bands, nonlinear fit, source-file availability, and the Bajka marker-extreme span 0.025-0.265 are source assertions not independently verifiable from the supplied aggregate inputs. Arithmetic review does not newly certify these source assertions.",
            "Marginal range intersections do not constitute a joint 95% compatibility test or whole-model acceptance.",
            "Bajka results are development comparisons with known outcomes. Kanata's nominal unmeasured served-bread transfers lose to equality at the central aggregate endpoint, so it does not directly test a measured served-bread D20 rule. Evidence does not establish assay coverage as the causal reason for between-study differences.",
            "The phrase 'survives only up to about +/-3.5 points' concerns a guarantee across every perturbation, not inevitable failure at larger perturbations. The central reading remains within every larger box.",
            "The markdown table header uses unescaped pipes in mean |log| and needs escaping to render correctly."
        ],
        "checks": checks,
    }
    print(json.dumps(report, indent=2, allow_nan=False))
    return 0 if report["arithmetic_status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
