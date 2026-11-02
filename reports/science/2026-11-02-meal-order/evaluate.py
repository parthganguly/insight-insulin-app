"""Recompute the four declared external comparisons and the implied mixed/first diagnostic."""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOCKS = {
    "PLAN.md": "8b2cabd609ac71e31402a19566cf794f425b42df00f4fc94320d23a54043bc70",
    "ADDENDUM.md": "71ab215e0c64f293028dadb21c5fcd35e3c7a1caee5b9e3efbf702a1846f7a3a",
}

def compute():
    for name, sha in LOCKS.items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == sha
    facts = json.loads((ROOT / "facts.json").read_text(encoding="utf-8-sig"))
    def ratio(study, numerator, denominator):
        means = facts[study]["means"]
        return means[numerator] / means[denominator]
    origin = ratio("healthy2024", "last", "mixed")
    reverse = ratio("shukla2015", "last", "first")
    specs = [
        ("original_120", "shukla2015", "last", "first", origin),
        ("secondary_180_mixed", "shukla2017", "last", "mixed", origin),
        ("secondary_180_first", "shukla2017", "last", "first", origin),
        ("implied_180_comparator", "shukla2017", "mixed", "first", 1.0),
        ("additional_120_matched_pace", "imai2023", "last", "first", reverse),
    ]
    rows = []
    for label, study, numerator, denominator, prediction in specs:
        observed = ratio(study, numerator, denominator)
        error = abs(math.log(prediction / observed))
        tie_error = abs(math.log(1 / observed))
        rows.append(dict(panel=label, study=study, window_min=facts[study]["window"],
                         numerator=numerator, denominator=denominator, prediction=prediction,
                         composition_prediction=1.0, observed=observed,
                         absolute_log_error=error, no_change_error=tie_error,
                         difference_vs_no_change=error-tie_error))
    return rows

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = compute()
    if args.check:
        expected = json.loads((ROOT / "RESULTS.json").read_text(encoding="utf-8"))
        assert len(expected) == len(result)
        for left, right in zip(expected, result):
            assert left.keys() == right.keys()
            for key, value in left.items():
                if isinstance(value, float):
                    assert math.isclose(value, right[key], rel_tol=1e-12, abs_tol=1e-12), key
                else:
                    assert value == right[key], key
        print("PASS 5 separate comparisons and both locked protocols")
    else:
        print(json.dumps(result, indent=2))
