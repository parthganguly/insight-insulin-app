"""Publication-grouped prediction from the extracted dose, protein source and response ratios."""
import argparse
import csv
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from statistics import fmean

ROOT = Path(__file__).resolve().parent
MODELS = ("no_change", "mean", "dose", "dose_source")


def load_rows():
    with (ROOT / "comparisons.csv").open(encoding="utf-8", newline="") as file:
        return [{**r, "dose": float(r["dose"]), "y": math.log(float(r["rr"]))}
                for r in csv.DictReader(file)]


def fit(train):
    counts = Counter(r["author"] for r in train)
    weights = [1 / (len(counts) * counts[r["author"]]) for r in train]
    xbar = sum(w * r["dose"] for w, r in zip(weights, train))
    ybar = sum(w * r["y"] for w, r in zip(weights, train))
    variance = sum(w * (r["dose"] - xbar)**2 for w, r in zip(weights, train))
    covariance = sum(w * (r["dose"] - xbar) * (r["y"] - ybar) for w, r in zip(weights, train))
    slope = covariance / variance if len({r["dose"] for r in train}) > 1 else 0.0
    intercept = ybar - slope * xbar
    residuals = defaultdict(lambda: defaultdict(list))
    for r in train:
        residuals[r["source"].casefold()][r["author"]].append(r["y"] - intercept - slope * r["dose"])
    offsets = {label: sum(fmean(x) for x in authors.values()) / (1 + len(authors))
               for label, authors in residuals.items()}
    return ybar, intercept, slope, offsets


def summarize(rows, supported_only=False):
    by_author = defaultdict(list)
    for r in rows:
        if not supported_only or r["source_changed_forecast"]:
            by_author[r["author"]].append(r)
    return {m: fmean(fmean(r["abs_log_error"][m] for r in group) for group in by_author.values())
            for m in MODELS} if by_author else None


def panel(rows):
    authors = sorted({r["author"] for r in rows})
    if len(authors) < 3:
        return {"available": False, "n_authors": len(authors)}
    predictions = []
    for author in authors:
        train = [r for r in rows if r["author"] != author]
        mean, intercept, slope, offsets = fit(train)
        lo, hi = min(r["dose"] for r in train), max(r["dose"] for r in train)
        for r in (r for r in rows if r["author"] == author):
            label = r["source"].casefold()
            dose_log = intercept + slope * r["dose"]
            values = [0.0, mean, dose_log, dose_log + offsets.get(label, 0.0)]
            predictions.append(dict(row=int(r["row"]), author=author, label=r["source"],
                rr=float(r["rr"]), dose=r["dose"], source_seen=label in offsets,
                source_changed_forecast=values[2] != values[3], outside_dose_range=not lo <= r["dose"] <= hi,
                forecast=dict(zip(MODELS, map(math.exp, values))),
                abs_log_error={k:abs(v-r["y"]) for k,v in zip(MODELS, values)}))
    by_author = {}
    for a in authors:
        score = summarize([r for r in predictions if r["author"] == a])
        by_author[a] = score["dose_source"] - score["dose"]
    effects = list(by_author.values())
    losses = summarize(predictions)
    return dict(n_authors=len(authors), n_rows=len(rows), losses=losses,
                criterion=all(losses["dose_source"] < losses[m] for m in MODELS[:-1]),
                label_available_rows=sum(r["source_seen"] for r in predictions),
                changed_rows=sum(r["source_changed_forecast"] for r in predictions),
                dose_extrapolated_rows=sum(r["outside_dose_range"] for r in predictions),
                changes_in_author_loss=by_author, changed_rows_loss=summarize(predictions, True),
                author_wins=sum(v<0 for v in effects), author_ties=effects.count(0),
                author_losses=sum(v>0 for v in effects),
                omit_author_delta={a:fmean(v for b,v in by_author.items() if b!=a) for a in authors},
                forecasts=sorted(predictions, key=lambda r:r["row"]))


def close(a,b):
    if isinstance(a,dict):
        return a.keys()==b.keys() and all(close(a[k],b[k]) for k in a)
    if isinstance(a,list):
        return len(a)==len(b) and all(close(x,y) for x,y in zip(a,b))
    if isinstance(a,float):
        return math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-12)
    return a==b


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args=parser.parse_args()
    rows=load_rows()
    result={method:panel([r for r in rows if r["method"]==method]) for method in ("Reported","Calculated")}
    if args.check:
        assert close(result,json.loads((ROOT/"RESULTS.json").read_text(encoding="utf-8")))
        print("PASS all held-author forecasts and scores in both extraction panels")
    else:
        print(json.dumps(result,indent=2,allow_nan=False))
