"""DELETE /meals/{id} persistence contract (issue #78).

Deleting a saved meal must remove the meal row and its item rows so the
meal never resurrects through GET /meals hydration. Unknown ids return
404. Synthetic data only.
"""

import asyncio
import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Modules that bind (directly or transitively) to the SQLite engine created at
# import time from the relative ./app.db path. Popped and re-imported inside a
# temp working directory so the test never touches the developer's real app.db.
DB_BOUND_MODULES = ["api.meals", "api", "db", "db_models"]

SIMPLE_ITEMS = [
    {"name": "plain yogurt", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 180.0, "carb_g": 16.0, "protein_g": 8.0, "fat_g": 4.0, "satFat_g": 2.0, "gi": 35},
    {"name": "rolled oats", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 250.0, "carb_g": 40.0, "protein_g": 8.0, "fat_g": 5.0, "satFat_g": 1.0, "gi": 55},
]


class MealDeleteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-meal-delete-test-")
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

    def create_meal(self, name: str):
        from models import MealCreate

        meal = MealCreate.model_validate({"meal_name": name, "items": SIMPLE_ITEMS})
        return asyncio.run(self.meals_api.create_meal(meal, self.session))

    def list_meal_ids(self) -> list[str]:
        return [meal.id for meal in asyncio.run(self.meals_api.list_meals(self.session))]

    def test_delete_removes_meal_from_listing(self) -> None:
        kept = self.create_meal("kept meal")
        deleted = self.create_meal("deleted meal")
        self.assertIn(deleted.id, self.list_meal_ids())

        asyncio.run(self.meals_api.delete_meal(deleted.id, self.session))

        remaining_ids = self.list_meal_ids()
        self.assertNotIn(deleted.id, remaining_ids)
        self.assertIn(kept.id, remaining_ids)

    def test_delete_removes_associated_item_rows(self) -> None:
        from db_models import MealDB, MealItemDB

        response = self.create_meal("meal with items")
        self.assertEqual(self.session.query(MealItemDB).filter(MealItemDB.meal_id == response.id).count(), len(SIMPLE_ITEMS))

        asyncio.run(self.meals_api.delete_meal(response.id, self.session))

        self.assertIsNone(self.session.get(MealDB, response.id))
        self.assertEqual(self.session.query(MealItemDB).filter(MealItemDB.meal_id == response.id).count(), 0)

    def test_delete_unknown_id_returns_404(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.meals_api.delete_meal("no-such-meal-id", self.session))

        self.assertEqual(ctx.exception.status_code, 404)

    def test_delete_is_scoped_to_one_meal(self) -> None:
        from db_models import MealItemDB

        kept = self.create_meal("scoped kept meal")
        deleted = self.create_meal("scoped deleted meal")

        asyncio.run(self.meals_api.delete_meal(deleted.id, self.session))

        self.assertEqual(self.session.query(MealItemDB).filter(MealItemDB.meal_id == kept.id).count(), len(SIMPLE_ITEMS))


if __name__ == "__main__":
    unittest.main()
