"""Evaluate fixed windows from portable mean-marker data (standard library only)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TABLE = {"soy": 1257.0, "cho": 1412.8, "soy_then_cho": 2654.0,
         "cho_then_soy": 3062.4, "pea_then_cho": 3534.6}


def net(times, values, end):
    stop = times.index(end)
    return sum((times[i + 1] - times[i]) *
               ((values[i] - values[0]) + (values[i + 1] - values[0])) / 2
               for i in range(stop))


def evaluate(data):
    t = data["minutes"]
    result = {"curve_areas": {}, "graph_minus_table_at_150": {}, "orders": {}}
    areas = result["curve_areas"]
    for p in data["panels"].values():
        for arm, curve in p["series"].items():
            areas[arm] = {end: net(t, curve["means"], end) for end in (90, 120, 150)}
            result["graph_minus_table_at_150"][arm] = areas[arm][150] - TABLE[arm]
    for end in (120, 150):
        first = TABLE if end == 150 else {arm: a[end] for arm, a in areas.items()}
        forecasts = {}
        for a,b in (("soy","cho"),("cho","soy")):
            arm = f"{a}_then_{b}"
            obs = first[arm]
            models = {"scheduled":first[a] + areas[b][end-30], "full_sum": first[a]+first[b],
                      "first_only":first[a]}
            forecasts[arm] = {"observed":obs, "predictions":models,
                              "signed_errors":{k:v-obs for k,v in models.items()}}
        s,c = forecasts.values()
        contrast = c["observed"]-s["observed"]
        forecasts["cho_first_minus_soy_first"] = {"observed":contrast,
            "signed_errors":{k:c["predictions"][k]-s["predictions"][k]-contrast
                             for k in s["predictions"]}}
        result["orders"][end] = forecasts
    result["pea_soy_graph_ratio"] = {end:areas["pea_then_cho"][end] /
                                     areas["soy_then_cho"][end] for end in (120,150)}
    return result


if __name__ == "__main__":
    print(json.dumps(evaluate(json.loads((ROOT / "graph-input.json").read_text())), indent=2))
