"""Independent Decimal oracle: no application calculation or catalog imports."""

import json
from decimal import Decimal
from pathlib import Path

GOLDENS = json.loads(Path(__file__).with_name("reference_result_v1_goldens.json").read_text())


def expected(case):
    loads = []
    consumed = 0
    for row in case["items"]:
        quantity = Decimal(str(row["quantity"]))
        energy = row["kcal_per_unit"]
        if quantity == 0:
            loads.append(0)
            continue
        consumed += 1
        if energy is None or Decimal(str(energy)) == 0 or row.get("source_record_id", "selected") is None:
            loads.append(None)
        else:
            loads.append(float(Decimal(str(case["synthetic_fii"])) * quantity * Decimal(str(energy)) / Decimal(100)))
    complete = consumed > 0 and None not in loads
    return {"status": "experimental" if complete else "unavailable",
            "total": sum(loads) if complete else None, "loads": loads}


if __name__ == "__main__":
    for case in GOLDENS["cases"]:
        assert expected(case) == case["expected"], case["id"]
    print(f"PASS: {len(GOLDENS['cases'])} independent Decimal synthetic reference goldens")
