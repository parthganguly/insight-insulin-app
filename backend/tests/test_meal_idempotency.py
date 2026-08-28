"""B2-1 idempotent save and material-fingerprint contract tests.

Synthetic data only. The unique SQLite index is the concurrency backstop;
lookup-first behavior is only an optimization.
"""

import asyncio
import hashlib
import importlib
import json
import os
import sys
import tempfile
import threading
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError


BACKEND_DIR = Path(__file__).resolve().parents[1]
DB_BOUND_MODULES = ["api.meals", "api", "db", "db_models"]

BASE_ITEM = {
    "name": "synthetic idempotent food",
    "quantity": 1.0,
    "unit": "serving",
    "kcalPerUnit": 100.0,
    "carb_g": None,
    "protein_g": None,
    "fat_g": None,
    "satFat_g": None,
    "gi": None,
}


class MealIdempotencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-meal-idempotency-test-")
        os.chdir(cls.tmp_dir)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)
        cls.db = importlib.import_module("db")
        cls.db.create_tables()
        cls.meals_api = importlib.import_module("api.meals")
        cls.models = importlib.import_module("models")
        cls.db_models = importlib.import_module("db_models")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db.engine.dispose()
        os.chdir(cls.original_cwd)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)

    def setUp(self) -> None:
        self.session = self.db.SessionLocal()
        self.addCleanup(self.session.close)
        self.clear_database()

    def clear_database(self) -> None:
        self.session.query(self.db_models.MealItemDB).delete()
        self.session.query(self.db_models.MealDB).delete()
        self.session.commit()

    def request(
        self,
        *,
        meal_name: str = "Synthetic idempotent meal",
        items: list[dict] | None = None,
        client_request_id: str | None = None,
        created_at: str = "2026-07-18T12:00:00Z",
    ):
        payload = {
            "meal_name": meal_name,
            "created_at": created_at,
            "items": items if items is not None else [BASE_ITEM],
        }
        if client_request_id is not None:
            payload["client_request_id"] = client_request_id
        return self.models.MealCreate.model_validate(payload)

    def save(self, **kwargs):
        return asyncio.run(self.meals_api.create_meal(self.request(**kwargs), self.session))

    def assert_conflict(self, **kwargs) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.save(**kwargs)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_no_client_request_id_preserves_legacy_duplicate_save_behavior(self) -> None:
        first = self.save()
        second = self.save()

        self.assertNotEqual(first.id, second.id)
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 2)
        rows = self.session.query(self.db_models.MealDB).all()
        self.assertTrue(all(row.client_request_id is None for row in rows))
        self.assertTrue(all(row.client_request_fingerprint is None for row in rows))

    def test_first_idempotent_save_stores_canonical_request_identity(self) -> None:
        request_id = str(uuid.uuid4())
        saved = self.save(client_request_id=request_id)
        row = self.session.get(self.db_models.MealDB, saved.id)

        self.assertEqual(row.client_request_id, request_id)
        self.assertEqual(len(row.client_request_fingerprint), 64)
        self.assertEqual(
            row.client_request_fingerprint,
            self.meals_api.compute_client_request_fingerprint(self.request().items),
        )

    def test_same_id_and_material_payload_returns_same_canonical_response(self) -> None:
        request_id = str(uuid.uuid4())
        first = self.save(client_request_id=request_id)
        second = self.save(client_request_id=request_id)

        self.assertEqual(second.model_dump(mode="json"), first.model_dump(mode="json"))
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)
        self.assertEqual(self.session.query(self.db_models.MealItemDB).count(), 1)

    def test_meal_name_and_created_at_are_non_material_and_original_stored_values_win(self) -> None:
        request_id = str(uuid.uuid4())
        first = self.save(
            client_request_id=request_id,
            meal_name="Original stored name",
            created_at="2026-07-18T12:00:00Z",
        )
        replay = self.save(
            client_request_id=request_id,
            meal_name="Changed descriptive name",
            created_at="2026-07-19T15:30:00Z",
        )

        self.assertEqual(replay.model_dump(mode="json"), first.model_dump(mode="json"))
        self.assertEqual(replay.meal_name, "Original stored name")
        self.assertEqual(replay.created_at, first.created_at)
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)

    def test_same_id_with_changed_material_item_returns_409_without_second_row(self) -> None:
        request_id = str(uuid.uuid4())
        first = self.save(client_request_id=request_id)
        self.assert_conflict(
            client_request_id=request_id,
            items=[BASE_ITEM | {"quantity": 2.0}],
        )

        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)
        self.assertEqual(self.session.query(self.db_models.MealItemDB).count(), 1)
        self.assertIsNotNone(self.session.get(self.db_models.MealDB, first.id))

    def test_different_ids_with_same_payload_create_two_legitimate_meals(self) -> None:
        first = self.save(client_request_id=str(uuid.uuid4()))
        second = self.save(client_request_id=str(uuid.uuid4()))

        self.assertNotEqual(first.id, second.id)
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 2)

    def test_every_material_fingerprint_field_changes_identity(self) -> None:
        mutations = {
            "name": BASE_ITEM | {"name": "different synthetic food"},
            "quantity": BASE_ITEM | {"quantity": 2.0},
            "unit": BASE_ITEM | {"unit": "cup"},
            "kcalPerUnit": BASE_ITEM | {"kcalPerUnit": 101.0},
            "carb_g": BASE_ITEM | {"carb_g": 0.0},
            "protein_g": BASE_ITEM | {"protein_g": 0.0},
            "fat_g": BASE_ITEM | {"fat_g": 0.0},
            "satFat_g": BASE_ITEM | {"satFat_g": 0.0},
            "gi": BASE_ITEM | {"gi": 0},
            "effective_fii": BASE_ITEM | {"fii": 42},
        }

        for field_name, changed_item in mutations.items():
            with self.subTest(field=field_name):
                self.clear_database()
                request_id = str(uuid.uuid4())
                self.save(client_request_id=request_id)
                self.assert_conflict(
                    client_request_id=request_id,
                    items=[changed_item],
                )
                self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)

    def test_none_and_zero_are_distinct_material_inputs(self) -> None:
        request_id = str(uuid.uuid4())
        self.save(client_request_id=request_id)

        self.assert_conflict(
            client_request_id=request_id,
            items=[BASE_ITEM | {"carb_g": 0.0, "gi": 0}],
        )

    def test_item_order_is_material(self) -> None:
        request_id = str(uuid.uuid4())
        first_item = BASE_ITEM | {"name": "synthetic first"}
        second_item = BASE_ITEM | {"name": "synthetic second"}
        self.save(client_request_id=request_id, items=[first_item, second_item])

        self.assert_conflict(
            client_request_id=request_id,
            items=[second_item, first_item],
        )

    def test_fii_alias_spelling_collapses_to_same_effective_value(self) -> None:
        request_id = str(uuid.uuid4())
        first = self.save(
            client_request_id=request_id,
            items=[BASE_ITEM | {"fii": 42}],
        )
        replay = self.save(
            client_request_id=request_id,
            items=[BASE_ITEM | {"fii_value": 42}],
        )

        self.assertEqual(replay.model_dump(mode="json"), first.model_dump(mode="json"))
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)

    def test_malformed_request_id_fails_validation(self) -> None:
        with self.assertRaises(ValidationError):
            self.request(client_request_id="not-a-uuid")

    def test_canonical_material_structure_and_hash_are_exact(self) -> None:
        request = self.request(
            meal_name="Excluded name",
            created_at="2030-01-01T01:02:03Z",
            items=[
                BASE_ITEM
                | {
                    "name": "Café synthetic food",
                    "quantity": 1.5,
                    "unit": "cup",
                    "kcalPerUnit": None,
                    "carb_g": 0.0,
                    "protein_g": 2.0,
                    "fat_g": 3.0,
                    "satFat_g": 1.0,
                    "gi": 0,
                    "fii_value": 42,
                    "fii": 99,
                }
            ],
        )
        expected_material = [
            {
                "name": "Café synthetic food",
                "quantity": 1.5,
                "unit": "cup",
                "kcalPerUnit": None,
                "carb_g": 0.0,
                "protein_g": 2.0,
                "fat_g": 3.0,
                "satFat_g": 1.0,
                "gi": 0,
                "fii": 42,
            }
        ]
        canonical_json = json.dumps(
            expected_material,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        )

        self.assertEqual(self.meals_api.canonical_material_items(request.items), expected_material)
        self.assertEqual(
            self.meals_api.compute_client_request_fingerprint(request.items),
            hashlib.sha256(canonical_json.encode("utf-8")).hexdigest(),
        )
        self.assertNotIn("Excluded name", canonical_json)
        self.assertNotIn("2030-01-01", canonical_json)

    def run_concurrent_saves(self, items_by_worker: list[list[dict]]):
        request_id = str(uuid.uuid4())
        barrier = threading.Barrier(len(items_by_worker))
        original_model_meal = self.meals_api.model_meal

        def synchronized_model_meal(meal):
            barrier.wait(timeout=10)
            return original_model_meal(meal)

        def worker(items: list[dict]):
            session = self.db.SessionLocal()
            try:
                request = self.request(
                    client_request_id=request_id,
                    items=items,
                )
                try:
                    response = asyncio.run(self.meals_api.create_meal(request, session))
                    return "saved", response.model_dump(mode="json")
                except HTTPException as exc:
                    return "http_error", exc.status_code
            finally:
                session.close()

        self.meals_api.model_meal = synchronized_model_meal
        try:
            with ThreadPoolExecutor(max_workers=len(items_by_worker)) as executor:
                return list(executor.map(worker, items_by_worker))
        finally:
            self.meals_api.model_meal = original_model_meal

    def test_unique_index_race_rolls_back_rereads_and_returns_one_durable_meal(self) -> None:
        results = self.run_concurrent_saves([[BASE_ITEM], [BASE_ITEM]])

        self.session.expire_all()
        self.assertEqual([result[0] for result in results], ["saved", "saved"])
        self.assertEqual(results[0][1], results[1][1])
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)
        self.assertEqual(self.session.query(self.db_models.MealItemDB).count(), 1)

    def test_unique_index_race_with_different_inputs_returns_one_409(self) -> None:
        results = self.run_concurrent_saves(
            [[BASE_ITEM], [BASE_ITEM | {"quantity": 2.0}]]
        )

        self.session.expire_all()
        statuses = sorted(result[0] for result in results)
        self.assertEqual(statuses, ["http_error", "saved"])
        error = next(result for result in results if result[0] == "http_error")
        self.assertEqual(error[1], 409)
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)
        self.assertEqual(self.session.query(self.db_models.MealItemDB).count(), 1)


if __name__ == "__main__":
    unittest.main()
