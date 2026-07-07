"""Meal created_at timezone contract (issue #77).

The database stores naive UTC (unchanged, no migration); the API boundary
must always serialize created_at with an explicit UTC marker so clients
never interpret meal times as local wall-clock. Synthetic data only.
"""

import asyncio
import importlib
import json
import os
import sys
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Modules that bind (directly or transitively) to the SQLite engine created at
# import time from the relative ./app.db path. Popped and re-imported inside a
# temp working directory so the test never touches the developer's real app.db.
DB_BOUND_MODULES = ["api.meals", "api", "db", "db_models"]

IST = timezone(timedelta(hours=5, minutes=30))

SIMPLE_ITEMS = [
    {"name": "plain yogurt", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 180.0, "carb_g": 16.0, "protein_g": 8.0, "fat_g": 4.0, "satFat_g": 2.0, "gi": 35}
]


class MealTimestampTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-meal-timestamp-test-")
        os.chdir(cls.tmp_dir)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)
        cls.db = importlib.import_module("db")
        cls.db.create_tables()
        cls.meals_api = importlib.import_module("api.meals")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db.engine.dispose()
        os.chdir(cls.original_cwd)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)

    def setUp(self) -> None:
        self.session = self.db.SessionLocal()
        self.addCleanup(self.session.close)

    def create_meal(self, name: str, created_at: datetime | None = None):
        from models import MealCreate

        payload = {"meal_name": name, "items": SIMPLE_ITEMS}
        if created_at is not None:
            payload["created_at"] = created_at
        meal = MealCreate.model_validate(payload)
        return asyncio.run(self.meals_api.create_meal(meal, self.session))

    def assert_serialized_utc(self, response) -> None:
        serialized = json.loads(response.model_dump_json())["created_at"]
        self.assertTrue(
            serialized.endswith("Z") or serialized.endswith("+00:00"),
            f"created_at must carry an explicit UTC marker, got {serialized!r}",
        )

    def test_new_meal_created_at_is_timezone_aware_utc(self) -> None:
        response = self.create_meal("timestamped meal")

        self.assertIsNotNone(response.created_at.tzinfo)
        self.assertEqual(response.created_at.utcoffset(), timedelta(0))
        self.assertLess(abs(datetime.now(timezone.utc) - response.created_at), timedelta(minutes=1))
        self.assert_serialized_utc(response)

    def test_stored_row_stays_naive_utc_no_schema_change(self) -> None:
        from db_models import MealDB

        response = self.create_meal("storage-form meal")
        row = self.session.query(MealDB).filter(MealDB.id == response.id).one()

        # Storage contract: naive UTC, identical in form to pre-fix rows.
        self.assertIsNone(row.created_at.tzinfo)
        self.assertEqual(row.created_at.replace(tzinfo=timezone.utc), response.created_at)

    def test_provided_offset_created_at_is_normalized_to_utc(self) -> None:
        provided = datetime(2026, 7, 7, 8, 53, 12, tzinfo=IST)

        response = self.create_meal("ist meal", created_at=provided)

        self.assertEqual(response.created_at, provided)
        self.assertEqual(response.created_at.utcoffset(), timedelta(0))
        self.assertEqual(response.created_at.replace(tzinfo=None), datetime(2026, 7, 7, 3, 23, 12))
        self.assert_serialized_utc(response)

    def test_legacy_naive_row_serializes_as_utc(self) -> None:
        from db_models import MealDB

        legacy = MealDB(
            id=str(uuid.uuid4()),
            created_at=datetime(2026, 7, 7, 3, 23, 12, 977801),  # naive pre-fix row
            meal_name="legacy naive meal",
            acute_score=42.0,
            insulin_load_total=12.0,
        )
        self.session.add(legacy)
        self.session.commit()

        listed = asyncio.run(self.meals_api.list_meals(self.session))
        legacy_response = next(meal for meal in listed if meal.id == legacy.id)

        self.assertEqual(legacy_response.created_at, datetime(2026, 7, 7, 3, 23, 12, 977801, tzinfo=timezone.utc))
        self.assert_serialized_utc(legacy_response)

    def test_list_meals_stays_most_recent_first(self) -> None:
        base = datetime(2026, 7, 6, 12, 0, 0, tzinfo=timezone.utc)
        oldest = self.create_meal("sort oldest", created_at=base - timedelta(hours=2))
        newest = self.create_meal("sort newest", created_at=base)
        middle = self.create_meal("sort middle", created_at=base - timedelta(hours=1))

        listed = asyncio.run(self.meals_api.list_meals(self.session))
        listed_ids = [meal.id for meal in listed]

        positions = {meal_id: listed_ids.index(meal_id) for meal_id in (newest.id, middle.id, oldest.id)}
        self.assertLess(positions[newest.id], positions[middle.id])
        self.assertLess(positions[middle.id], positions[oldest.id])
        self.assertEqual(listed, sorted(listed, key=lambda meal: meal.created_at, reverse=True))


if __name__ == "__main__":
    unittest.main()
