"""Score foreseen donor and same-information common forecasts against public IGT summaries.

Use 'python compare.py' to replay. To regenerate target_aggregate.csv from the
coordinator's public Fig 1 baseline and center reads, pass --target-figure PATH.
"""
import argparse
import csv
import json
import math
from pathlib import Path

from analyse import ARMS, TIMES, integrate, read, write


def target_from_figure(path):
    fig = json.loads(path.read_text(encoding="utf-8-sig"))
    _, y_top, _, y_bottom = fig["image_pdf_box"]
    pt_per_px = (y_bottom-y_top) / fig["height"]
    by_initial = dict(zip("TGIS",ARMS))
    rows, curve_rows = [], []
    for context, symbol, panel, x, y, cap in fig["series"]:
        axis = fig["panels"][panel]
        scale = pt_per_px * axis["top_value"] / (axis["bottom"]-axis["top"])
        pixel_zero = (axis["bottom"]-y_top) / pt_per_px - 0.5
        means = [(pixel_zero-v)*scale for v in y]
        increments = [v-means[0] for v in means]
        period = "fasting" if context == "fast" else "lunch"
        for idx, t in enumerate(TIMES):
            curve_rows.append([by_initial[symbol],period,t,means[idx],(y[idx]-cap[idx])*scale])
        for end in (60,120,180):
            for method, t, start in [
                ("signed_nominal",[0] + TIMES[1:],0),
                ("signed_linearly_interpolate_zero",TIMES,0),
                ("signed_minus5_to_end",TIMES,-5),
            ]:
                rows.append([period,method,end,by_initial[symbol],integrate(t,increments,start,end,0)])
    for period,values in [("fasting",[9425,15216,5779,7326]),("lunch",[17934,20875,11726,17658])]:
        for arm,value in zip(ARMS,values):
            rows.append([period,"source_table_3h",180,arm,value])
    write("target_curve.csv",["arm","period","sample_min","mean_uU_per_mL","pointwise_SEM_uU_per_mL"],curve_rows)
    write("target_aggregate.csv",["period","operator","end_min","arm","area"],rows)


def group(rows,field):
    out = {}
    for row in rows:
        key = (row["period"],row["operator"],row["end_min"])
        out.setdefault(key,{})[row["arm"]]=float(row[field])
    return out


def pair(levels):
    return (levels["trehalose"]/levels["glucose"],levels["isomaltulose"]/levels["sucrose"])


def cumulative_profiles():
    """Exploratory crossing diagnostic on continuous interpolated mean curves."""
    table, crossing_table = [], []
    for cohort, name in [("donor","curve.csv"),("evaluation","target_curve.csv")]:
        curves = {}
        for row in read(name):
            key = (row["period"],row["arm"])
            curves.setdefault(key,[]).append(float(row["mean_uU_per_mL"]))
        for period in ("fasting","lunch"):
            def double_ratio(end):
                areas = {}
                for arm in ARMS:
                    values = curves[period,arm]
                    areas[arm] = integrate([0]+TIMES[1:],values,0,end,values[0])
                tg,ins = pair(areas)
                return tg/ins
            for end in TIMES[1:]:
                table.append([cohort,period,end,double_ratio(end)])
            roots = []
            # Bracket sign changes at one-minute spacing then bisect each bracket.
            for minute in range(1,180):
                lo,hi = minute,minute+1
                if (double_ratio(lo)-1)*(double_ratio(hi)-1) < 0:
                    for _ in range(45):
                        mid=(lo+hi)/2
                        if (double_ratio(lo)-1)*(double_ratio(mid)-1)<=0:
                            hi=mid
                        else:
                            lo=mid
                    roots.append((hi+lo)/2)
            crossing_table.append([cohort,period,len(roots),"|".join(str(r) for r in roots)])
    write("cumulative_profile.csv",["cohort","period","end_min","D"],table)
    write("crossing.csv",["cohort","period","one_minute_grid_crossings","approx_minutes"],crossing_table)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-figure",type=Path)
    args = parser.parse_args()
    if args.target_figure:
        target_from_figure(args.target_figure)
    cumulative_profiles()
    targets = group(read("target_aggregate.csv"),"area")
    donors = group(read("areas.csv"),"area_nominal_uU_min_per_mL")
    ceilings = []
    for cohort,curves,native in [("donor","curve.csv",donors),("evaluation","target_curve.csv",targets)]:
        data = read(curves)
        for period in ["fasting","lunch"]:
            for arm in ARMS:
                vals = [float(r["mean_uU_per_mL"]) for r in data if r["period"]==period and r["arm"]==arm]
                # For each person, [C(t)-B]+ <= C(t) if both absolute concentration and baseline are nonnegative.
                raw = integrate(TIMES,vals,-5,180,0)
                observed = native[period,"source_table_3h","180"][arm]
                ceilings.append([cohort,period,arm,raw,observed,observed-raw])
    write("raw_ceiling.csv",["cohort","period","arm","raw_area_minus5_to180","reported_3h_incremental_area","reported_minus_raw"],ceilings)
    results, level_rows, changes = [], [], []
    for key, target_arms in targets.items():
        period, operator, end = key
        observed_tg, observed_is = pair(target_arms)
        observed_d = observed_tg / observed_is
        matched, fasting = donors[key], donors["fasting",operator,end]
        tg, ins = pair(matched)
        common = math.sqrt(tg*ins)
        for model, (p_tg,p_is) in [
            ("protocol_matched",(tg,ins)),
            ("matched_common",(common,common)),
            ("fasting_reused",pair(fasting)),
        ]:
            e_tg = math.log(p_tg/observed_tg)
            e_is = math.log(p_is/observed_is)
            results.append([*key,model,observed_tg,observed_is,observed_d,p_tg,p_is,p_tg/p_is,
                e_tg,e_is,(abs(e_tg)+abs(e_is))/2,abs(e_tg-e_is)])
        for arm in ARMS:
            forecast,obs=matched[arm],target_arms[arm]
            level_rows.append([*key,arm,forecast,obs,forecast-obs,forecast/obs-1,math.log(forecast/obs)])
        if period=="lunch":
            ot,oi=pair(targets["fasting",operator,end])
            dt,di=pair(fasting)
            observed_change=observed_d/(ot/oi)
            forecast_change=(tg/ins)/(dt/di)
            changes.append([operator,end,observed_change,forecast_change,
                abs(math.log(forecast_change/observed_change)),abs(math.log(observed_change))])
    write("comparison.csv",["period","operator","end_min","model","observed_TG","observed_IS","observed_D","forecast_TG","forecast_IS","forecast_D","signed_log_error_TG","signed_log_error_IS","mean_absolute_log_error_pairs","absolute_log_error_D"],results)
    write("absolute_transfer.csv",["period","operator","end_min","arm","donor_as_forecast","target","forecast_minus_target","fractional_error","signed_log_error"],level_rows)
    write("protocol_change.csv",["operator","end_min","observed_D_lunch_over_fasting","forecast_change","change_abs_log_error","no_change_abs_log_error"],changes)


if __name__ == "__main__":
    main()
