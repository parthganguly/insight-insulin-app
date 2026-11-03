"""Post hoc sampling-grid sensitivity, kept separate from the registered analysis."""
import json
from evaluate import ROOT, TABLE, net

def sensitivity(data):
    t = data["minutes"]
    curves = {k: s["means"] for panel in data["panels"].values()
              for k,s in panel["series"].items()}
    results = {}
    for end in (120,150):
        rows = {}
        for a,b in (("soy","cho"),("cho","soy")):
            first,second = curves[a],curves[b]
            delayed = [0 if m <= 30 else second[t.index(m-30)] - second[0] for m in t]
            second_area = net(t, delayed, end)
            graph_first = net(t, first, end)
            arm = f"{a}_then_{b}"
            rows[arm] = {}
            for label,first_auc,obs in [
                ("all_graph",graph_first,net(t,curves[arm],end)),
                ("primary_source",TABLE[a] if end == 150 else graph_first,
                 TABLE[arm] if end == 150 else net(t,curves[arm],end))]:
                pred = first_auc + second_area
                rows[arm][label] = {"observed":obs,"predicted":pred,"error":pred-obs,
                    "change_from_native_grid":second_area-net(t,second,end-30)}
        results[end] = rows
        for label in ("all_graph","primary_source"):
            rows[f"contrast_{label}"] = {field:rows["cho_then_soy"][label][field] -
                                          rows["soy_then_cho"][label][field]
                                          for field in ("observed","predicted","error")}
    return results

if __name__ == "__main__":
    print(json.dumps(sensitivity(json.loads((ROOT/"graph-input.json").read_text())),indent=2))
