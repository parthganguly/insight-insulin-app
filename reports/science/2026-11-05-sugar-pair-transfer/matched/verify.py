"""Cross-check the public group summaries and coordinates with independent arithmetic."""
import csv
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def rows(name):
    with (ROOT/name).open(newline="",encoding="utf-8") as stream:
        return list(csv.DictReader(stream))


def main():
    curve = rows("curve.csv")
    assert len(curve) == 56
    arms = {row["arm"] for row in curve}
    for row in rows("areas.csv"):
        if row["operator"] != "signed_nominal":
            continue
        observed = [float(v["mean_uU_per_mL"]) for v in curve if v["arm"]==row["arm"] and v["period"]==row["period"]]
        end = int(row["end_min"])
        m = end//30
        # Closed form for trapezoids at equally spaced times.
        expected = 30*(sum(observed[1:m]) + (observed[0]+observed[m])/2) - end*observed[0]
        assert math.isclose(expected,float(row["area_nominal_uU_min_per_mL"]),abs_tol=1e-8)
    assert len(arms)==4
    breaches = {(r["cohort"],r["period"],r["arm"]) for r in rows("raw_ceiling.csv") if float(r["reported_minus_raw"])>0}
    assert breaches == {("donor","lunch","sucrose"),("donor","lunch","isomaltulose")}
    comparison = rows("comparison.csv")
    for r in comparison:
        d = float(r["forecast_D"])
        obs = float(r["observed_D"])
        expected = abs(math.log(d/obs))
        assert math.isclose(expected,float(r["absolute_log_error_D"]),abs_tol=1e-12)
    for r in rows("sources.csv"):
        assert None not in r and r["url"].startswith("https://")
    print(f"Checked {len(curve)} donor curve observations, nominal areas, two ceiling breaches, and {len(comparison)} forecast rows.")


if __name__ == "__main__":
    main()
