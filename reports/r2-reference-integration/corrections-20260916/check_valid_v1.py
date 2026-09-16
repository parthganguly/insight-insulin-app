"""Run with PYTHONPATH=backend; uses synthetic captured envelopes, never a DB."""

import hashlib
import json
from pathlib import Path

from experimental_reference.contract import (
    CATALOG_VERSION, ReferencePreview, deserialize_assessment, serialize_assessment,
)
from experimental_reference.service import evaluate

directory = Path(__file__).resolve().parent
checks = []
for row in json.loads((directory / "valid-v1-before.json").read_text()):
    raw = row["serialized_v1"]
    assert hashlib.sha256(raw.encode()).hexdigest() == row["sha256"]
    reread = serialize_assessment(deserialize_assessment(raw))
    request = ReferencePreview.model_validate({
        "meal_name": "Synthetic preservation", "expected_catalog_version": CATALOG_VERSION,
        "items": [{"name": "Synthetic preservation", "quantity": 1, "unit": "serving",
                   "kcal_per_unit": 200, "kcal_per_unit_unit": "serving",
                   "source_record_id": row["source_record_id"]}],
    })
    assert raw == reread == serialize_assessment(evaluate(request))
    checks.append({"source_record_id": row["source_record_id"], "before_sha256": row["sha256"],
                   "after_sha256": hashlib.sha256(reread.encode()).hexdigest(),
                   "exact_serialization_and_identity_match": True})
(directory / "valid-v1-preservation.json").write_text(
    json.dumps({"checked": len(checks), "all_exact": True, "checks": checks}, indent=2) + "\n")
print(f"PASS: {len(checks)} valid v1 envelopes retain exact bytes and identities; new construction unchanged")
