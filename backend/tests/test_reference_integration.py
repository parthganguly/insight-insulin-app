"""Real dormant HTTP/service/persistence flow, using only synthetic SQLite meals."""

import copy
import hashlib
import importlib
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from experimental_reference.contract import (
    CATALOG_VERSION, ReferencePreview, ReferenceResult, ReferenceSave,
    deserialize_assessment, serialize_assessment,
)
from reference_catalog import ReferenceCatalog, canonical_bytes, map_records

BACKEND = Path(__file__).resolve().parents[1]
BOUND = ["experimental_reference.router", "experimental_reference.service", "api.meals", "api", "db", "db_models"]
ITEM = {"name": "synthetic reviewed food", "quantity": 1, "unit": "serving",
        "kcal_per_unit": 200, "kcal_per_unit_unit": "serving", "source_record_id": "BAO2011-002"}


class ReferenceIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for module in BOUND:
            sys.modules.pop(module, None)
        cls.db = importlib.import_module("db")
        cls.orm = importlib.import_module("db_models")
        cls.service = importlib.import_module("experimental_reference.service")
        cls.router = importlib.import_module("experimental_reference.router")
        cls.legacy = importlib.import_module("api.meals")
        cls.catalog_bytes = cls.service.CATALOG_PATH.read_bytes()

    @classmethod
    def tearDownClass(cls):
        cls.db.engine.dispose()
        for module in BOUND:
            sys.modules.pop(module, None)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="insight-reference-synthetic-")
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "synthetic.sqlite"
        self.engine = create_engine("sqlite:///" + self.path.as_posix(), connect_args={"check_same_thread": False})
        self.addCleanup(self.engine.dispose)
        self.sessions = sessionmaker(bind=self.engine)
        with patch.object(self.db, "engine", self.engine):
            self.db.create_tables()
        self.app = FastAPI()
        self.app.include_router(self.router.router)
        self.app.include_router(self.legacy.router)

        def sessions():
            with self.sessions() as session:
                yield session

        self.app.dependency_overrides[self.db.get_db] = sessions
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)

    def draft(self, items=None, **extra):
        return {"meal_name": "Synthetic reference meal", "expected_catalog_version": CATALOG_VERSION,
                "items": copy.deepcopy(items if items is not None else [ITEM]), **extra}

    def save_payload(self, items=None, **extra):
        return self.draft(items, client_request_id=str(uuid.uuid4()), created_at="2026-09-16T12:00:00Z", **extra)

    def preview(self, items=None, **extra):
        return self.client.post("/reference-meals/preview", json=self.draft(items, **extra))

    def count(self):
        with self.sessions() as session:
            return session.query(self.orm.MealDB).count(), session.query(self.orm.MealItemDB).count()

    def synthetic_catalog(self, value):
        data = json.loads(self.catalog_bytes)
        data["records"][0]["raw"]["FII_pct"] = value
        data["records"] = map_records([r["raw"] for r in data["records"]], data["policy"], data["studies"], data["source_issues"])
        return ReferenceCatalog.from_bytes(canonical_bytes(data))

    def test_preview_save_fresh_read_replay_and_legacy_separation(self):
        preview = self.preview().json()
        self.assertFalse(preview["persisted"])
        self.assertEqual(self.count(), (0, 0))
        payload = self.save_payload()
        saved = self.client.post("/reference-meals", json=payload)
        self.assertEqual(saved.status_code, 200, saved.text)
        saved = saved.json()
        assessment = saved["assessment"]
        self.assertEqual(assessment, preview["assessment"])
        self.assertEqual(assessment["reference_load_total"], 138)
        self.assertEqual(assessment["formula_version"], "experimental_reference_load_v1")
        self.assertEqual(saved["legacy_compatibility"]["formula_version"], "current_backend_v2")
        self.assertEqual(saved["legacy_compatibility"]["insulin_load_total"], 0)
        self.assertEqual(saved["legacy_compatibility"]["items"][0]["fii_source"], "unknown")
        meal_id = saved["legacy_compatibility"]["id"]
        with patch.object(self.service, "load_pinned_catalog", side_effect=AssertionError("late catalog access")), patch.object(self.legacy, "model_meal", side_effect=AssertionError("rescored")):
            self.assertEqual(self.client.get("/reference-meals/" + meal_id).json(), saved)
            self.assertEqual(self.client.get("/reference-meals").json(), [saved])
            self.assertEqual(self.client.post("/reference-meals", json=payload).json(), saved)
            payload.update(meal_name="Descriptive rename", created_at="2030-01-01T00:00:00Z")
            self.assertEqual(self.client.post("/reference-meals", json=payload).json(), saved)
        self.assertEqual(self.count(), (1, 1))
        legacy = self.client.get("/meals").json()[0]
        self.assertEqual(legacy, saved["legacy_compatibility"])
        self.assertNotIn("reference_result_json", legacy)

    def test_selection_unavailability_and_whole_meal_null(self):
        for selection, code in [(None, "no_reference_selected"), ("BAO2011-999", "unknown_id"),
                                ("BELL2016-S1-001", "reference_only"), ("BELL2016-S1-014", "requires_review"),
                                ("BELL2016-S1-017", "requires_review"), ("BELL2016-S1-024", "requires_review")]:
            with self.subTest(selection=selection):
                items = [ITEM, ITEM | {"source_record_id": selection, "carb_g": 12}]
                response = self.preview(items)
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()["assessment"]
                self.assertEqual(result["status"], "unavailable")
                self.assertIsNone(result["reference_load_total"])
                self.assertEqual(result["items"][0]["reference_load"], 138)
                self.assertIsNone(result["items"][1]["reference_load"])
                self.assertEqual(result["items"][1]["inputs"]["carb_g"], 12)
                self.assertIn(code, [r["code"] for r in result["items"][1]["reasons"]])
                self.assertNotIn("main_insulin_drivers", result)
                saved = self.client.post("/reference-meals", json=self.save_payload(items)).json()
                self.assertEqual(saved["assessment"], result)

    def test_catalog_browse_is_safe_read_only_and_preserves_eligibility(self):
        response = self.client.get("/reference-meals/catalog")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["catalog_version"], CATALOG_VERSION)
        self.assertEqual(len(body["records"]), 147)
        by_id = {record["source_record_id"]: record for record in body["records"]}
        for source_id, status in [("BAO2011-002", "candidate"),
                                  ("BELL2016-S1-001", "reference_only"),
                                  ("BELL2016-S1-017", "requires_review")]:
            self.assertEqual(by_id[source_id]["eligibility"]["status"], status)
        self.assertEqual(by_id["BAO2011-002"]["fii_mean"], 69)
        for record in body["records"]:
            self.assertEqual(set(record), {
                "source_record_id", "source_food_wording", "food_category", "fii_mean", "fii_sem",
                "source_study", "source_doi", "reference_scale", "actual_test_energy_kJ", "eligibility",
            })
        self.assertNotIn("source_file", response.text)
        self.assertNotIn("source_sha256", response.text)
        self.assertEqual(self.count(), (0, 0))
        with patch.object(self.service, "CATALOG_PATH", Path(self.tmp.name) / "missing.json"):
            error = self.client.get("/reference-meals/catalog")
        self.assertEqual(error.status_code, 503)
        self.assertEqual(error.json()["detail"], {"code": "catalog_unavailable"})

    def test_units_split_rows_duplicate_source_title_and_composites(self):
        variants = [[ITEM], [ITEM | {"quantity": 2, "kcal_per_unit": 100}],
                    [ITEM | {"quantity": 100, "unit": "g", "kcal_per_unit": 2, "kcal_per_unit_unit": "g"}],
                    [ITEM | {"quantity": 50, "unit": "ml", "kcal_per_unit": 4, "kcal_per_unit_unit": "ml"}],
                    [ITEM | {"quantity": .5}, ITEM | {"quantity": .5}]]
        for items in variants:
            result = self.preview(items, meal_name="Changed title").json()["assessment"]
            self.assertEqual(result["reference_load_total"], 138)
            self.assertEqual(len(result["items"]), len(items))
            self.assertEqual([r["position"] for r in result["items"]], list(range(len(items))))
        composite = self.preview([ITEM | {"name": "rice and dal", "source_record_id": "BELL2016-S1-020"}]).json()["assessment"]
        self.assertEqual(len(composite["items"]), 1)
        self.assertEqual(composite["reference_load_total"], 96)

    def test_missing_zero_energy_zero_quantity_and_empty_meals(self):
        for value in [None, 0]:
            result = self.preview([ITEM | {"kcal_per_unit": value}]).json()["assessment"]
            self.assertIsNone(result["reference_load_total"])
            self.assertEqual(result["items"][0]["eaten_kcal"], value)
        for items in [[], [ITEM | {"quantity": 0, "kcal_per_unit": None, "source_record_id": None}]]:
            result = self.preview(items).json()["assessment"]
            self.assertIsNone(result["reference_load_total"])
            self.assertEqual(result["reasons"][0]["code"], "no_consumed_items")
        result = self.preview([ITEM, ITEM | {"quantity": 0, "kcal_per_unit": None, "source_record_id": None}]).json()["assessment"]
        self.assertEqual(result["reference_load_total"], 138)
        self.assertEqual(result["items"][1]["status"], "not_consumed")
        self.assertEqual(result["items"][1]["reference_load"], 0)

    def test_synthetic_zero_and_above_100_fii(self):
        for value, expected in [(0, 0), (150, 300)]:
            catalog = self.synthetic_catalog(value)
            with patch.object(self.service, "load_pinned_catalog", return_value=catalog):
                result = self.preview(expected_catalog_version=catalog.version)
                self.assertEqual(result.status_code, 200, result.text)
                assessment = result.json()["assessment"]
                self.assertEqual(assessment["status"], "experimental")
                self.assertEqual(assessment["reference_load_total"], expected)
                self.assertEqual(assessment["items"][0]["source"]["fii_mean"], value)

    def test_strict_request_rejects_overrides_and_invalid_values_without_writes(self):
        bad_items = [ITEM | {field: value} for field in ["quantity", "kcal_per_unit", "carb_g", "protein_g", "fat_g", "sat_fat_g", "gi"]
                     for value in [-1, True, "5", float("nan"), float("inf"), 10**400]]
        bad_items += [ITEM | {"quantity": 1e308, "kcal_per_unit": 1e308},
                      ITEM | {"gi": 10**30},
                      ITEM | {"kcal_per_unit_unit": "ml"}, ITEM | {"source_record_id": "rice"}]
        bad_items += [ITEM | {field: value, "quantity": 0} for field, value in [
            ("fii", 0), ("fii_value", 42), ("source", {"fii_mean": 42}), ("eligibility", "candidate"),
            ("formula_version", "fake"), ("confidence", 1), ("children", [ITEM]), ("reference_load", 1)]]
        for item in bad_items:
            response = self.client.post("/reference-meals", content=json.dumps(self.save_payload([item])), headers={"Content-Type": "application/json"})
            self.assertEqual(response.status_code, 422, response.text)
        for extra in [{"assessment": {}}, {"catalog_path": "arbitrary"}, {"formula_version": "fake"}, {"client_request_id": "bad"}]:
            request = self.save_payload() | extra
            self.assertEqual(self.client.post("/reference-meals", json=request).status_code, 422)
        self.assertEqual(self.client.post("/reference-meals", json=self.draft()).status_code, 422)
        for endpoint, body in [("/reference-meals", self.save_payload()), ("/reference-meals/preview", self.draft())]:
            raw = json.dumps(body).replace('"quantity": 1', '"quantity": 1e999')
            response = self.client.post(endpoint, content=raw, headers={"Content-Type": "application/json"})
            self.assertEqual(response.status_code, 422)
            self.assertEqual(response.json()["detail"]["code"], "invalid_reference_request")
            self.assertEqual(self.client.post(endpoint, json=body | {"items": [ITEM | {"gi": 10**30}]}).status_code, 422)
        self.assertEqual(self.count(), (0, 0))

    def test_stale_version_and_unreviewed_server_catalog_fail_without_write(self):
        payload = self.save_payload() | {"expected_catalog_version": "r2_sha256_" + "0" * 64}
        self.assertEqual(self.client.post("/reference-meals", json=payload).json()["detail"]["code"], "stale_catalog_version")
        path = Path(self.tmp.name) / "catalog.json"
        path.write_bytes(canonical_bytes(json.loads(self.catalog_bytes) | {"schema_version": "wrong"}))
        with patch.object(self.service, "CATALOG_PATH", path):
            self.assertEqual(self.client.post("/reference-meals", json=self.save_payload()).status_code, 503)
        self.assertEqual(self.count(), (0, 0))

    def test_overflow_contribution_aggregation_and_compatibility(self):
        catalog = self.synthetic_catalog(150)
        for items in [[ITEM | {"kcal_per_unit": 1.7e308}], [ITEM | {"kcal_per_unit": 1e308}] * 2]:
            with patch.object(self.service, "load_pinned_catalog", return_value=catalog):
                response = self.preview(items, expected_catalog_version=catalog.version)
            self.assertEqual(response.status_code, 422)
        response = self.client.post("/reference-meals", json=self.save_payload([ITEM | {"name": "rice", "kcal_per_unit": 1e308}]))
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.count(), (0, 0))

    def test_immutable_inputs_results_and_no_late_catalog_io(self):
        payload = self.draft()
        request = ReferencePreview.model_validate(payload)
        payload["items"][0]["quantity"] = 999
        self.assertEqual(request.items[0].quantity, 1)
        result = self.service.evaluate(request)
        for target, name, value in [(request.items[0], "quantity", 2), (result, "reference_load_total", 999),
                                    (result.items[0].source, "fii_mean", 999)]:
            with self.assertRaises(ValidationError):
                setattr(target, name, value)
        encoded = serialize_assessment(result)
        self.assertEqual(serialize_assessment(deserialize_assessment(encoded)), encoded)
        loaded = ReferenceCatalog.from_bytes(self.catalog_bytes)
        with patch.object(self.service, "load_pinned_catalog", return_value=loaded) as loader, patch.object(ReferenceCatalog, "load", side_effect=AssertionError("late read")):
            saved = self.client.post("/reference-meals", json=self.save_payload()).json()
            self.assertEqual(saved["assessment"], result.model_dump(mode="json"))
            self.assertEqual(loader.call_count, 1)
        # Remove a copied file immediately after its one successful load, before save.
        path = Path(self.tmp.name) / "copied-catalog.json"
        path.write_bytes(self.catalog_bytes)
        def once():
            catalog = ReferenceCatalog.load(path)
            path.unlink()
            return catalog
        with patch.object(self.service, "load_pinned_catalog", side_effect=once):
            self.assertEqual(self.client.post("/reference-meals", json=self.save_payload()).status_code, 200)

    def test_material_changes_and_cross_contract_keys_conflict(self):
        payload = self.save_payload([ITEM, ITEM | {"name": "second"}])
        saved = self.client.post("/reference-meals", json=payload).json()
        variants = []
        for field, value in [("quantity", 2), ("source_record_id", None), ("nutrition_origin", "label"), ("carb_g", 0), ("name", "different")]:
            change = copy.deepcopy(payload)
            change["items"][0][field] = value
            variants.append(change)
        variants += [payload | {"items": list(reversed(payload["items"]))}, payload | {"expected_catalog_version": "r2_sha256_" + "0" * 64}]
        with patch.object(self.service, "load_pinned_catalog", side_effect=AssertionError("conflict touched catalog")):
            for change in variants:
                self.assertEqual(self.client.post("/reference-meals", json=change).status_code, 409)
        legacy_payload = {"meal_name": "legacy", "items": [{"name": "synthetic", "quantity": 1, "unit": "serving"}], "client_request_id": payload["client_request_id"]}
        self.assertEqual(self.client.post("/meals", json=legacy_payload).status_code, 409)
        legacy_payload["client_request_id"] = str(uuid.uuid4())
        self.assertEqual(self.client.post("/meals", json=legacy_payload).status_code, 200)
        self.assertEqual(self.client.post("/reference-meals", json=payload | {"client_request_id": legacy_payload["client_request_id"]}).status_code, 409)
        self.assertEqual(self.client.get("/reference-meals/" + saved["legacy_compatibility"]["id"]).json(), saved)

    def test_corrupt_unsupported_and_null_stored_evidence_fail_closed(self):
        payload = self.save_payload()
        saved = self.client.post("/reference-meals", json=payload).json()
        meal_id = saved["legacy_compatibility"]["id"]
        with self.sessions() as session:
            stored = session.get(self.orm.MealDB, meal_id).reference_result_json
        corruptions = ["{private-corrupt", "null", stored.replace('reference_meal_result_v1', 'future'), stored.replace('138.0', '139.0')]
        with patch.object(self.service, "load_pinned_catalog", side_effect=AssertionError("read resolved catalog")):
            for corrupted in corruptions + [None]:
                with self.sessions() as session:
                    session.get(self.orm.MealDB, meal_id).reference_result_json = corrupted
                    session.commit()
                response = self.client.get("/reference-meals/" + meal_id)
                self.assertEqual(response.status_code, 200)
                expected = "not_evaluated" if corrupted is None else "evidence_error"
                self.assertEqual(response.json()["assessment_state"], expected)
                self.assertIsNone(response.json()["assessment"])
                self.assertNotIn("private-corrupt", response.text)
                self.assertEqual(self.client.post("/reference-meals", json=payload).json(), response.json())
                with self.sessions() as session:
                    self.assertEqual(session.get(self.orm.MealDB, meal_id).reference_result_json, corrupted)

    def test_failed_flush_rolls_back_meal_items_and_assessment(self):
        def fail_after_flush(session, context):
            raise SQLAlchemyError("synthetic write fault")
        event.listen(self.sessions.class_, "after_flush", fail_after_flush)
        try:
            response = self.client.post("/reference-meals", json=self.save_payload())
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json()["detail"]["code"], "save_failed")
        finally:
            event.remove(self.sessions.class_, "after_flush", fail_after_flush)
        self.assertEqual(self.count(), (0, 0))

    def assert_stored_boundary(self, corrupted_values, expected_state="evidence_error"):
        payload = self.save_payload()
        saved = self.client.post("/reference-meals", json=payload).json()
        meal_id = saved["legacy_compatibility"]["id"]
        healthy = self.client.post("/reference-meals", json=self.save_payload()).json()
        healthy_id = healthy["legacy_compatibility"]["id"]
        with self.sessions() as session:
            original = session.get(self.orm.MealDB, meal_id).reference_result_json
        for corrupted in corrupted_values(original):
            with self.engine.begin() as connection:
                connection.execute(text("UPDATE meals SET reference_result_json=:value WHERE id=:id"),
                                   {"value": corrupted, "id": meal_id})
            with patch.object(self.service, "load_pinned_catalog", side_effect=AssertionError("catalog read")), \
                    patch.object(self.service, "evaluate", side_effect=AssertionError("recalculation")), \
                    patch.object(self.legacy, "model_meal", side_effect=AssertionError("legacy recalculation")):
                read = self.client.get("/reference-meals/" + meal_id)
                listed = self.client.get("/reference-meals")
                replayed = self.client.post("/reference-meals", json=payload)
                for response in (read, listed, replayed):
                    self.assertEqual(response.status_code, 200, response.text)
                rows = {r["legacy_compatibility"]["id"]: r for r in listed.json()}
                self.assertEqual(rows[healthy_id], healthy)
                self.assertEqual(self.client.get("/reference-meals/" + healthy_id).json(), healthy)
                for response in (read.json(), rows[meal_id], replayed.json()):
                    self.assertEqual(response["assessment_state"], expected_state)
                    self.assertIsNone(response["assessment"])
                    self.assertEqual(response["legacy_compatibility"], saved["legacy_compatibility"])
                    if expected_state == "evidence_error":
                        self.assertEqual(response["reasons"][0]["code"], "invalid_stored_assessment")
            with self.engine.connect() as connection:
                storage_type, stored = connection.execute(text(
                    "SELECT typeof(reference_result_json), reference_result_json FROM meals WHERE id=:id"),
                    {"id": meal_id}).one()
                self.assertEqual(stored, corrupted)
                self.assertEqual(storage_type, "blob" if isinstance(corrupted, bytes) else "null" if corrupted is None else "text")
            self.assertEqual(self.count(), (2, 2))

    def test_missing_persisted_identities_fail_read_list_replay(self):
        def damaged(original):
            for keys in [("formula_version",), ("result_schema_version",), ("envelope_version",),
                         ("formula_version", "result_schema_version", "envelope_version")]:
                envelope = json.loads(original)
                for key in keys:
                    (envelope if key == "envelope_version" else envelope["assessment"]).pop(key)
                yield json.dumps(envelope)  # Original digest must not authorize inserted defaults.
                envelope["sha256"] = hashlib.sha256(canonical_bytes(envelope["assessment"])).hexdigest()
                yield json.dumps(envelope)  # Even a matching raw digest cannot supply identity.
        self.assert_stored_boundary(damaged)

    def test_blob_stored_evidence_fails_read_list_replay_preserves_neighbors(self):
        self.assert_stored_boundary(lambda original: [b"\x80synthetic invalid binary", original.encode("utf-8")])

    def test_raw_digest_before_normalization_and_valid_v1_roundtrip(self):
        result = self.service.evaluate(ReferencePreview.model_validate(self.draft()))
        original = serialize_assessment(result)
        envelope = json.loads(original)
        self.assertEqual(serialize_assessment(deserialize_assessment(original)), original)
        reordered = json.dumps(dict(reversed(list(envelope.items()))), indent=4)
        self.assertEqual(deserialize_assessment(reordered), result)
        changed = copy.deepcopy(envelope)
        changed["assessment"]["items"][0]["inputs"].pop("gi")  # Optional default used to restore identical digest.
        with self.assertRaises(ValueError):
            deserialize_assessment(json.dumps(changed))
        for malformed in [original.replace('"envelope_version":', '"envelope_version":"duplicate","envelope_version":', 1),
                          original.replace('"reference_load_total":138.0', '"reference_load_total":NaN'),
                          "[]", "{}", 1, True, b"{}"]:
            with self.assertRaises(ValueError):
                deserialize_assessment(malformed)
        self.assert_stored_boundary(lambda original: [None], expected_state="not_evaluated")

    def test_concurrent_retries_return_complete_winner_and_conflicts(self):
        for different in [False, True]:
            payload = self.save_payload()
            payloads = [payload, copy.deepcopy(payload)]
            if different:
                payloads[1]["items"][0]["quantity"] = 2
            barrier = threading.Barrier(2)
            original = self.service.evaluate
            variants = iter(["1", "2"])
            def competing(draft):
                result = original(draft).model_dump(mode="json")
                variant = next(variants)
                result["catalog_version"] = "r2_sha256_" + variant * 64
                if variant == "2":
                    # Test-only different assessment, to detect any losing response fragment.
                    result["items"][0].update(status="unavailable", reference_load=None,
                                              reasons=[{"code": "synthetic_refusal", "detail": "race test"}])
                    result.update(status="unavailable", reference_load_total=None,
                                  reasons=[{"code": "incomplete_consumed_items", "detail": "race test"}])
                result = ReferenceResult.model_validate(result)
                barrier.wait(timeout=15)
                return result
            def worker(body):
                with TestClient(self.app) as client:
                    return client.post("/reference-meals", json=body)
            with patch.object(self.service, "evaluate", side_effect=competing):
                with ThreadPoolExecutor(max_workers=2) as pool:
                    results = list(pool.map(worker, payloads))
            self.assertEqual(sorted(r.status_code for r in results), [200, 409] if different else [200, 200])
            winner = next(r.json() for r in results if r.status_code == 200)
            if not different:
                self.assertEqual(results[0].json(), results[1].json())
            self.assertEqual(self.client.get("/reference-meals/" + winner["legacy_compatibility"]["id"]).json(), winner)

    def test_new_column_migration_coexistence_and_targeted_delete(self):
        with self.sessions() as session:
            column = inspect(self.engine).get_columns("meals")
            added = next(c for c in column if c["name"] == "reference_result_json")
            self.assertTrue(added["nullable"])
            self.assertIsNone(added["default"])
        old = self.client.post("/meals", json={"meal_name": "synthetic old", "items": []}).json()
        # Recreate an actual old schema by dropping only this empty new column in a synthetic DB.
        with self.engine.begin() as connection:
            connection.execute(text("ALTER TABLE meals DROP COLUMN reference_result_json"))
            before = connection.execute(text("SELECT * FROM meals")).fetchall()
            names = [c["name"] for c in inspect(connection).get_columns("meals")]
        with patch.object(self.db, "engine", self.engine):
            self.db.create_tables()
            self.db.create_tables()
        with self.engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT " + ",".join(names) + " FROM meals")).fetchall(), before)
        self.assertEqual(self.client.get("/meals").json(), [old])
        read = self.client.get("/reference-meals/" + old["id"]).json()
        self.assertEqual(read["assessment_state"], "not_evaluated")
        first = self.client.post("/reference-meals", json=self.save_payload()).json()
        second = self.client.post("/reference-meals", json=self.save_payload()).json()
        self.assertEqual(self.client.delete("/reference-meals/" + first["legacy_compatibility"]["id"]).status_code, 204)
        self.assertEqual(self.client.get("/reference-meals/" + first["legacy_compatibility"]["id"]).status_code, 404)
        self.assertEqual(self.client.get("/reference-meals/" + second["legacy_compatibility"]["id"]).json(), second)
        self.assertEqual(self.count(), (2, 1))

    def test_production_route_table_is_dormant_without_startup_or_catalog_read(self):
        script = '''
import sys
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
original = Path.read_bytes
def no_catalog(path):
    assert path.name != "candidate_catalog.json", "production import read catalog"
    return original(path)
with patch.object(Path, "read_bytes", no_catalog):
    import main
assert "experimental_reference.service" not in sys.modules
assert "reference_catalog" not in sys.modules
# No lifespan context: never execute production startup or connect its DB.
with patch.object(main, "create_tables", side_effect=AssertionError("startup")):
    client = TestClient(main.app)
    assert client.post("/reference-meals/preview", json={}).status_code == 404
    assert client.post("/reference-meals", json={}).status_code == 404
    assert client.get("/reference-meals").status_code == 404
    assert client.get("/reference-meals/catalog").status_code == 404
    client.close()
'''
        result = subprocess.run([sys.executable, "-c", script], cwd=BACKEND, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_independent_decimal_goldens_through_preview_save_read(self):
        from validation.reference_result_goldens import GOLDENS, expected
        for case in GOLDENS["cases"]:
            with self.subTest(case=case["id"]):
                catalog = self.synthetic_catalog(case["synthetic_fii"])
                items = [ITEM | values for values in case["items"]]
                with patch.object(self.service, "load_pinned_catalog", return_value=catalog):
                    preview = self.preview(items, expected_catalog_version=catalog.version).json()["assessment"]
                    saved = self.client.post("/reference-meals", json=self.save_payload(items) | {"expected_catalog_version": catalog.version}).json()
                self.assertEqual(preview, saved["assessment"])
                wanted = expected(case)
                self.assertEqual(preview["status"], wanted["status"])
                self.assertEqual(preview["reference_load_total"], wanted["total"])
                self.assertEqual([i["reference_load"] for i in preview["items"]], wanted["loads"])
                self.assertEqual(self.client.get("/reference-meals/" + saved["legacy_compatibility"]["id"]).json(), saved)


# R3B: the reference private preview is mounted only by an exact opt-in flag.
# These checks import the real production app in a subprocess, from a fresh
# temporary working directory so the relative app.db is isolated, with dotenv
# loading disabled so no owner .env is read.

PROBE = """
import json, os, sys
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
import dotenv
dotenv.load_dotenv = lambda *args, **kwargs: False
sys.path.insert(0, BACKEND)
import main
from fastapi.testclient import TestClient

# FastAPI resolves included routers lazily, so the production route table is
# read through real requests against the real app rather than app.routes.
with TestClient(main.app) as client:
    catalog = client.get("/reference-meals/catalog")
    listing = client.get("/reference-meals")
    legacy = client.get("/meals")
    detail = client.get("/reference-meals/11111111-2222-4333-8444-555555555555")
    print(json.dumps({
        "enabled": main.reference_preview_enabled(),
        "catalog_status": catalog.status_code,
        "list_status": listing.status_code,
        "legacy_status": legacy.status_code,
        "detail_status": detail.status_code,
        "detail_body": detail.json(),
        "reference_modules": sorted(name for name in sys.modules
                                    if "experimental_reference" in name or "reference_catalog" in name),
        "db_created_here": os.path.exists("app.db"),
    }))
"""


class ReferenceFlagRegistrationTests(unittest.TestCase):
    """Real import of production main under each flag value."""

    def probe(self, value):
        env = dict(os.environ)
        env.pop("INSIGHT_REFERENCE_PREVIEW", None)
        if value is not None:
            env["INSIGHT_REFERENCE_PREVIEW"] = value
        env["PYTHON_DOTENV_DISABLED"] = "1"
        with tempfile.TemporaryDirectory(prefix="insight-flag-probe-") as work:
            script = "BACKEND = %r\n" % str(BACKEND) + PROBE
            completed = subprocess.run(
                [sys.executable, "-c", script],
                cwd=work, env=env, capture_output=True, text=True, timeout=300,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            # A default import must not create a database in the repository.
            return json.loads(completed.stdout.strip().splitlines()[-1])

    def test_default_build_does_not_mount_or_import_the_reference_module(self):
        for value in (None, "0", "true", "yes", "TRUE", "2", ""):
            with self.subTest(flag=value):
                probe = self.probe(value)
                self.assertFalse(probe["enabled"])
                # Neither the router nor the catalog module is even imported.
                self.assertEqual(probe["reference_modules"], [])
                self.assertEqual(probe["catalog_status"], 404)
                self.assertEqual(probe["list_status"], 404)
                self.assertEqual(probe["detail_status"], 404)
                # An OFF backend answers with a generic 404, which the client
                # must never read as proof that one meal was deleted (C3).
                self.assertEqual(probe["detail_body"], {"detail": "Not Found"})
                # Legacy operation is untouched in OFF mode.
                self.assertEqual(probe["legacy_status"], 200)
                self.assertTrue(probe["db_created_here"])

    def test_exact_flag_mounts_the_existing_router(self):
        probe = self.probe("1")
        self.assertTrue(probe["enabled"])
        self.assertEqual(probe["catalog_status"], 200)
        self.assertEqual(probe["list_status"], 200)
        # Legacy endpoints keep working alongside it.
        self.assertEqual(probe["legacy_status"], 200)
        # An unknown ID answers with the protocol-specific absence code, which
        # is the only response that establishes deletion of that one record.
        self.assertEqual(probe["detail_status"], 404)
        self.assertEqual(probe["detail_body"], {"detail": {"code": "meal_not_found"}})


if __name__ == "__main__":
    unittest.main()
