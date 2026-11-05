"""Inventory of dose gradients available before scoring the 2026 whey/pea application."""
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def inventory():
    groups = defaultdict(lambda: defaultdict(set))
    with (ROOT/"comparisons.csv").open(encoding="utf-8",newline="") as handle:
        for r in csv.DictReader(handle):
            if r["method"] == "Reported" and r["source"] in ("Whey","Pea"):
                groups[r["source"]][r["author"]].add(float(r["dose"]))
    return {s:{"author_doses":{a:sorted(d) for a,d in sorted(authors.items())},
               "multiple_doses_in_anchor_training":sorted(a for a,d in authors.items()
                                                         if a!="Thondre" and len(d)>1)}
            for s,authors in sorted(groups.items())}


if __name__ == "__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    result=inventory()
    if ap.parse_args().check:
        assert result==json.loads((ROOT/"SUPPORT.json").read_text(encoding="utf-8"))
        print("PASS within-author dose support by source")
    else:
        print(json.dumps(result,indent=2))
