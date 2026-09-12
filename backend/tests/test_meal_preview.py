"""B2-1 stateless preview contract and save-parity tests.

Synthetic data only. Preview must share the canonical modelling path without
creating or mutating persistence state.
"""

import asyncio
import importlib
import os
import sys
import tempfile
import unittest
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy import event, text


BACKEND_DIR = Path(__file__).resolve().parents[1]
DB_BOUND_MODULES = ["api.meals", "api", "db", "db_models"]

BASE_ITEM = {
    "quantity": 1.0,
    "unit": "serving",
    "kcalPerUnit": 200.0,
    "carb_g": None,
    "protein_g": None,
    "fat_g": None,
    "satFat_g": None,
    "gi": None,
}

CHARACTERIZATION_CASES = {
    "exact_fii": [BASE_ITEM | {"name": "white bread"}],
    "mapped_fii": [BASE_ITEM | {"name": "chicken biryani"}],
    "user_confirmed_fii": [BASE_ITEM | {"name": "synthetic explicit food", "fii": 42}],
    "macro_fallback": [
        BASE_ITEM
        | {
            "name": "synthetic fallback food",
            "carb_g": 30.0,
            "protein_g": 20.0,
            "fat_g": 5.0,
            "satFat_g": 2.0,
            "gi": 60,
        }
    ],
    "unknown": [BASE_ITEM | {"name": "synthetic unknown food"}],
    "mixed_sources": [
        BASE_ITEM | {"name": "white bread", "kcalPerUnit": 100.0},
        BASE_ITEM | {"name": "chicken biryani", "kcalPerUnit": 300.0},
        BASE_ITEM
        | {
            "name": "synthetic fallback food",
            "kcalPerUnit": 250.0,
            "carb_g": 30.0,
            "protein_g": 20.0,
            "fat_g": 5.0,
            "satFat_g": 2.0,
            "gi": 60,
        },
        BASE_ITEM | {"name": "synthetic unknown food", "kcalPerUnit": 50.0},
    ],
    "zero_kcal_issue_97": [
        BASE_ITEM
        | {
            "name": "rice",
            "kcalPerUnit": 0.0,
            "carb_g": 0.0,
            "protein_g": 0.0,
            "fat_g": 0.0,
            "satFat_g": 0.0,
            "gi": 0,
        }
    ],
}


class MealPreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-meal-preview-test-")
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
        self.session.query(self.db_models.MealItemDB).delete()
        self.session.query(self.db_models.MealDB).delete()
        self.session.commit()

    def save(self, meal_name: str, items: list[dict]):
        request = self.models.MealCreate.model_validate(
            {
                "meal_name": meal_name,
                "created_at": "2026-07-18T12:00:00Z",
                "items": items,
            }
        )
        return asyncio.run(self.meals_api.create_meal(request, self.session))

    def preview(self, meal_name: str, items: list[dict]):
        request = self.models.MealPreviewRequest.model_validate(
            {"meal_name": meal_name, "items": items}
        )
        return asyncio.run(self.meals_api.preview_meal(request))

    def test_preview_matches_save_for_all_characterization_payloads(self) -> None:
        for case_name, items in CHARACTERIZATION_CASES.items():
            with self.subTest(case=case_name):
                meal_name = f"Preview parity {case_name}"
                preview = self.preview(meal_name, items).model_dump(mode="json")
                saved = self.save(meal_name, items).model_dump(
                    mode="json", exclude={"id", "created_at"}
                )
                preview_without_persistence_marker = {
                    key: value for key, value in preview.items() if key != "persisted"
                }
                self.assertEqual(preview["persisted"], False)
                self.assertEqual(preview_without_persistence_marker, saved)

    def test_preview_contract_has_no_persistence_or_image_fields(self) -> None:
        self.assertEqual(
            set(self.models.MealPreviewRequest.model_fields),
            {"meal_name", "items"},
        )
        self.assertEqual(
            set(self.models.MealPreviewResponse.model_fields),
            {
                "meal_name",
                "items",
                "insulin_load_total",
                "acute_score",
                "kcal_total",
                "carbs_total",
                "protein_total",
                "fat_total",
                "estimate_quality",
                "estimate_status",
                "main_insulin_drivers",
                "persisted",
            },
        )
        self.assertNotIn("image", self.models.MealPreviewRequest.model_json_schema()["properties"])
        self.assertNotIn("image", self.models.MealPreviewResponse.model_json_schema()["properties"])

    def test_preview_preserves_rows_session_state_and_executes_no_dml(self) -> None:
        self.save("Existing saved meal", CHARACTERIZATION_CASES["exact_fii"])
        before_meals = self.session.query(self.db_models.MealDB).count()
        before_items = self.session.query(self.db_models.MealItemDB).count()
        self.assertFalse(self.session.new)
        self.assertFalse(self.session.dirty)
        self.assertFalse(self.session.deleted)

        observed_dml: list[str] = []

        def record_dml(_conn, _cursor, statement, _parameters, _context, _executemany):
            command = statement.lstrip().split(None, 1)[0].upper() if statement.strip() else ""
            if command in {"INSERT", "UPDATE", "DELETE"}:
                observed_dml.append(statement)

        event.listen(self.db.engine, "before_cursor_execute", record_dml)
        try:
            self.preview("Unsaved preview", CHARACTERIZATION_CASES["mixed_sources"])
        finally:
            event.remove(self.db.engine, "before_cursor_execute", record_dml)

        self.assertEqual(self.session.query(self.db_models.MealDB).count(), before_meals)
        self.assertEqual(self.session.query(self.db_models.MealItemDB).count(), before_items)
        self.assertFalse(self.session.new)
        self.assertFalse(self.session.dirty)
        self.assertFalse(self.session.deleted)
        self.assertEqual(observed_dml, [])

    def test_save_persists_positions_and_fresh_get_matches_preview_order(self) -> None:
        items = CHARACTERIZATION_CASES["mixed_sources"]
        preview = self.preview("Roundtrip synthetic meal", items)
        saved = self.save("Roundtrip synthetic meal", items)
        saved_dump = saved.model_dump(mode="json")

        stored_positions = self.session.execute(
            text(
                "SELECT name, item_position FROM meal_items "
                "WHERE meal_id = :meal_id ORDER BY item_position"
            ),
            {"meal_id": saved.id},
        ).all()
        self.assertEqual(
            stored_positions,
            [(item["name"], position) for position, item in enumerate(items)],
        )

        self.session.close()

        self.session = self.db.SessionLocal()
        hydrated = asyncio.run(self.meals_api.list_meals(self.session))

        self.assertEqual(len(hydrated), 1)
        self.assertEqual(hydrated[0].model_dump(mode="json"), saved_dump)
        self.assertEqual(
            [item.model_dump(mode="json") for item in hydrated[0].items],
            [item.model_dump(mode="json") for item in preview.items],
        )

    def test_zero_kcal_status_matches_preview_save_and_fresh_get(self) -> None:
        items = CHARACTERIZATION_CASES["zero_kcal_issue_97"]
        preview = self.preview("Issue 97 parity", items)
        saved = self.save("Issue 97 parity", items)

        self.assertEqual(preview.estimate_status, "insufficient_data")
        self.assertEqual(saved.estimate_status, "insufficient_data")

        self.session.close()
        self.session = self.db.SessionLocal()
        hydrated = asyncio.run(self.meals_api.list_meals(self.session))
        self.assertEqual(hydrated[0].estimate_status, "insufficient_data")

    def test_fresh_orm_hydration_sorts_positions_not_physical_order(self) -> None:
        meal_id = str(uuid.uuid4())
        meal = self.db_models.MealDB(
            id=meal_id,
            created_at=datetime(2026, 7, 18, 12, 0, 0),
            meal_name="Scrambled physical order",
            total_kcal=300.0,
            total_carb=0.0,
            total_protein=0.0,
            total_fat=0.0,
            total_sat_fat=0.0,
            insulin_load_total=0.0,
            acute_score=0.0,
            chronic_score=None,
            estimate_quality="unknown",
            main_insulin_drivers="[]",
        )
        meal.items = [
            self.db_models.MealItemDB(
                id=str(uuid.uuid4()),
                meal_id=meal_id,
                item_position=position,
                name=name,
                quantity=1.0,
                unit="serving",
                kcal_per_unit=100.0,
                carb_g=0.0,
                protein_g=0.0,
                fat_g=0.0,
                gi=0,
                sat_fat_g=0.0,
                fii=0,
                kcal_item=100.0,
                insulin_load=0.0,
                confidence=0.5,
                fii_source="unknown",
                why="Synthetic ordering proof.",
            )
            for name, position in [("C", 2), ("A", 0), ("B", 1)]
        ]
        self.session.add(meal)
        self.session.commit()
        self.session.close()

        self.session = self.db.SessionLocal()
        physical_rows = self.session.execute(
            text(
                "SELECT name, item_position FROM meal_items "
                "WHERE meal_id = :meal_id ORDER BY rowid"
            ),
            {"meal_id": meal_id},
        ).all()
        self.assertEqual(physical_rows, [("C", 2), ("A", 0), ("B", 1)])

        hydrated = asyncio.run(self.meals_api.list_meals(self.session))
        self.assertEqual(len(hydrated), 1)
        self.assertEqual([item.name for item in hydrated[0].items], ["A", "B", "C"])


    def http_client(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        app = FastAPI()
        app.include_router(self.meals_api.router)

        def isolated_db():
            yield self.session

        app.dependency_overrides[self.db.get_db] = isolated_db
        return TestClient(app)

    def test_fallback_quantity_invariants_and_http_save_parity(self) -> None:
        # All nutrition fields are per unit, including per g/ml for density units.
        base = {
            "name": "synthetic zqxv134",
            "quantity": 1.0,
            "unit": "serving",
            "kcalPerUnit": 200.0,
            "carb_g": 30.0,
            "protein_g": 10.0,
            "fat_g": 5.0,
            "satFat_g": 2.0,
        }
        density_fields = {"kcalPerUnit", "carb_g", "protein_g", "fat_g", "satFat_g"}
        branches = [
            (base, 21.21, 0.5),
            (base | {"gi": 60}, 13.8, 0.8),
            ({k: v for k, v in (base | {"gi": 60}).items() if k != "protein_g"}, 10.8, 0.7),
        ]
        with self.http_client() as client:
            for item, per_unit_load, confidence in branches:
                double = {k: v * 2 if k in density_fields else v for k, v in item.items()}
                per_hundred = {k: v / 100 if k in density_fields else v for k, v in item.items()}
                variants = {
                    "whole": [item],
                    "two": [item | {"quantity": 2}],
                    "double": [double],
                    "halves": [item | {"quantity": 0.5}, item | {"quantity": 0.5}],
                    "g": [per_hundred | {"quantity": 200, "unit": "g"}],
                    "ml": [per_hundred | {"quantity": 200, "unit": "ml"}],
                    "zero": [item | {"quantity": 0}],
                }
                results = {}
                for label, items in variants.items():
                    with self.subTest(gi=item.get("gi"), protein=item.get("protein_g"), variant=label):
                        payload = {"meal_name": "Synthetic quantity regression", "items": items}
                        preview_response = client.post("/meals/preview", json=payload)
                        self.assertEqual(preview_response.status_code, 200, preview_response.text)
                        preview = preview_response.json()
                        self.assertIs(preview["persisted"], False)
                        for row in preview["items"]:
                            self.assertEqual(row["fii_source"], "macro_fallback")
                            self.assertEqual(row["confidence"], confidence)
                        self.assertEqual(preview["estimate_quality"], "low")
                        self.assertEqual(preview["estimate_status"], "estimated")
                        saved_response = client.post("/meals", json=payload)
                        self.assertEqual(saved_response.status_code, 200, saved_response.text)
                        saved = saved_response.json()
                        self.assertEqual(
                            {k: v for k, v in preview.items() if k != "persisted"},
                            {k: v for k, v in saved.items() if k not in {"id", "created_at"}},
                        )
                        results[label] = preview
                self.assertAlmostEqual(results["whole"]["insulin_load_total"], per_unit_load)
                for left, right in [("two", "double"), ("whole", "halves"), ("two", "g"), ("two", "ml")]:
                    for field in ("insulin_load_total", "acute_score", "kcal_total", "carbs_total", "protein_total", "fat_total"):
                        self.assertAlmostEqual(results[left][field], results[right][field])
                self.assertAlmostEqual(results["two"]["insulin_load_total"], 2 * results["whole"]["insulin_load_total"])
                self.assertEqual(results["zero"]["insulin_load_total"], 0)
                self.assertEqual(results["zero"]["acute_score"], 0)

    def test_negative_quantity_rejected_by_http_and_raw_scorer(self) -> None:
        from scoring_service import compute_insulin_load_item
        from unittest.mock import patch

        items = [
            BASE_ITEM | {"name": "synthetic zqxv134", "carb_g": 30, "protein_g": 10},
            BASE_ITEM | {"name": "synthetic zqxv134", "carb_g": 30, "protein_g": 10, "gi": 60},
            BASE_ITEM | {"name": "synthetic zqxv134", "carb_g": 30, "gi": 60},
            BASE_ITEM | {"name": "synthetic zqxv134", "fii": 50},
            BASE_ITEM | {"name": "white bread"},
            BASE_ITEM | {"name": "chicken biryani"},
            BASE_ITEM | {"name": "synthetic zqxv134"},
        ]
        with self.http_client() as client:
            for item in items:
                item = item | {"quantity": -1}
                with self.subTest(item=item):
                    with patch.object(self.meals_api, "compute_insulin_load_item") as scorer:
                        for route in ("/meals/preview", "/meals"):
                            response = client.post(route, json={"meal_name": "Synthetic negative", "items": [item]})
                            self.assertEqual(response.status_code, 422)
                            self.assertEqual(response.json()["detail"][0]["loc"], ["body", "items", 0, "quantity"])
                        scorer.assert_not_called()
                    with self.assertRaisesRegex(ValueError, "Quantity must be non-negative"):
                        compute_insulin_load_item(
                            food_name=item["name"], quantity=-1, kcal_per_unit=item["kcalPerUnit"],
                            fii=item.get("fii"), gi=item.get("gi"), carb_g=item.get("carb_g"),
                            protein_g=item.get("protein_g"), fat_g=item.get("fat_g"),
                            sat_fat_g=item.get("satFat_g"),
                        )
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 0)

    def test_fii_controls_and_normalization_remain_unchanged(self) -> None:
        item = BASE_ITEM | {"name": "synthetic zqxv134", "quantity": 2}
        with self.http_client() as client:
            for control, source, load in [
                (item | {"fii": 50}, "user_confirmed", 200),
                (item | {"name": "white bread"}, "exact_fii", 400),
                (item | {"name": "chicken biryani"}, "mapped_fii", 189.6),
                (item, "unknown", 0),
            ]:
                with self.subTest(source=source):
                    response = client.post("/meals/preview", json={"meal_name": "Synthetic control", "items": [control]})
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json()["items"][0]["fii_source"], source)
                    self.assertAlmostEqual(response.json()["insulin_load_total"], load)
            for field in ("fii", "fii_value"):
                for value in (0, "0", -1, "", " ", None):
                    with self.subTest(field=field, value=value):
                        response = client.post("/meals/preview", json={
                            "meal_name": "Synthetic normalization",
                            "items": [item | {"carb_g": 30, "protein_g": 10, "gi": 60, field: value}],
                        })
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response.json()["items"][0]["fii_source"], "macro_fallback")
                        self.assertEqual(response.json()["items"][0]["confidence"], 0.8)
                        self.assertAlmostEqual(response.json()["insulin_load_total"], 27.6)

    def test_historical_negative_quantity_remains_readable_without_rescoring(self) -> None:
        saved = self.save("Synthetic legacy record", CHARACTERIZATION_CASES["macro_fallback"])
        stored_item = self.session.query(self.db_models.MealItemDB).one()
        stored_item.quantity = -1  # Synthetic pre-v2 record; never a new valid request.
        self.session.commit()
        with self.http_client() as client:
            response = client.get("/meals")
        self.assertEqual(response.status_code, 200)
        body = response.json()[0]
        self.assertEqual(body["items"][0]["quantity"], -1)
        self.assertEqual(body["insulin_load_total"], saved.insulin_load_total)
        self.assertEqual(body["acute_score"], saved.acute_score)


if __name__ == "__main__":
    unittest.main()
