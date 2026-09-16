"""Compare actual base/new code using ONLY a newly created temporary SQLite DB.

Run: python reports/r2-reference-integration/capture_comparison.py BASE_WORKTREE
The base checkout must be unmodified at the pinned revision.
"""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BASE = "cb6083f8386bb0464b1f94ca0a2f7d49c3e55c16"
WORKER = r'''
import json, sqlite3, sys, uuid
sys.path.insert(0, sys.argv[1])
from fastapi import FastAPI
from fastapi.testclient import TestClient
import db
from api.meals import router
db.create_tables()
app = FastAPI()
app.include_router(router)
mode = sys.argv[2]
if mode == "new":
    from experimental_reference.router import router as reference_router
    from experimental_reference.contract import CATALOG_VERSION
    app.include_router(reference_router)
client = TestClient(app)  # No production main/startup/provider invocation.
out = {"legacy_previews": []}
for name in ["rice", "synthetic reviewed food", "rice and dal"]:
    body = {"meal_name": "Synthetic comparison", "items": [{"name": name, "quantity": 1, "unit": "serving", "kcalPerUnit": 200}]}
    response = client.post("/meals/preview", json=body)
    assert response.status_code == 200, response.text
    out["legacy_previews"].append({"input": body, "output": response.json()})
if mode == "base":
    out["old_saved"] = client.post("/meals", json=body).json()
elif mode == "new":
    out["old_saved_after_upgrade"] = client.get("/meals").json()[0]
    out["old_assessment"] = client.get("/reference-meals/" + out["old_saved_after_upgrade"]["id"]).json()
    out["new_results"] = []
    for selection in ["BAO2011-002", None]:
        request = {"meal_name": "Synthetic reference comparison", "expected_catalog_version": CATALOG_VERSION,
                   "client_request_id": str(uuid.uuid4()), "created_at": "2026-09-16T12:00:00Z",
                   "items": [{"name": "rice", "quantity": 1, "unit": "serving", "kcal_per_unit": 200,
                              "kcal_per_unit_unit": "serving", "source_record_id": selection}]}
        response = client.post("/reference-meals", json=request)
        assert response.status_code == 200, response.text
        out["new_results"].append({"input": request, "output": response.json()})
elif mode == "old_again":
    with sqlite3.connect("app.db") as conn:
        before = conn.execute("SELECT id, reference_result_json FROM meals ORDER BY id").fetchall()
    out["legacy_reads_after_new_save"] = client.get("/meals").json()
    extra = client.post("/meals", json={"meal_name": "Synthetic old writer", "items": []}).json()
    assert client.delete("/meals/" + extra["id"]).status_code == 204
    with sqlite3.connect("app.db") as conn:
        after = conn.execute("SELECT id, reference_result_json FROM meals ORDER BY id").fetchall()
    assert before == after
    out["old_writer_create_read_delete_preserved_all_assessments"] = True
client.close()
db.engine.dispose()
print(json.dumps(out, allow_nan=False))
'''


def run(base):
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=base, text=True).strip() == BASE
    assert not subprocess.check_output(["git", "status", "--porcelain"], cwd=base, text=True).strip()
    env = dict(os.environ, PYTHON_DOTENV_DISABLED="1")
    with tempfile.TemporaryDirectory(prefix="insight-base-comparison-synthetic-") as tmp:
        def worker(checkout, mode):
            process = subprocess.run([sys.executable, "-c", WORKER, str(checkout / "backend"), mode],
                                     cwd=tmp, env=env, capture_output=True, text=True)
            assert process.returncode == 0, process.stderr
            return json.loads(process.stdout)
        before = worker(base, "base")
        after = worker(ROOT, "new")
        coexistence = worker(base, "old_again")
    assert before["legacy_previews"] == after["legacy_previews"] == coexistence["legacy_previews"]
    assert before["old_saved"] == after["old_saved_after_upgrade"]
    assert after["old_assessment"]["assessment_state"] == "not_evaluated"
    by_id = {row["id"]: row for row in coexistence["legacy_reads_after_new_save"]}
    for row in after["new_results"]:
        legacy = row["output"]["legacy_compatibility"]
        assert by_id[legacy["id"]] == legacy
    report = {"base": BASE, "synthetic_only": True, "legacy_preview_and_saved_response_match": True,
              "before": before, "after": after, "actual_base_code_coexistence": coexistence}
    destination = Path(__file__).with_name("before-after.json")
    destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("PASS: three exact legacy preview comparisons, old saved response, real base-code read/create/delete after upgrade; evidence: before-after.json")


if __name__ == "__main__":
    run(Path(sys.argv[1]).resolve())
