import asyncio
import importlib
import os
import sys
import tempfile
import unittest
from datetime import timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Modules that bind (directly or transitively) to the SQLite engine created at
# import time from the relative ./app.db path. Popped and re-imported inside a
# temp working directory so the test never touches the developer's real app.db.
DB_BOUND_MODULES = ["scripts.seed_demo_data", "scripts", "api.meals", "api", "db", "db_models"]


class DemoSeedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-demo-seed-test-")
        os.chdir(cls.tmp_dir)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)
        cls.db = importlib.import_module("db")
        cls.db.create_tables()
        cls.seeder = importlib.import_module("scripts.seed_demo_data")
        cls.chronic = importlib.import_module("chronic_service")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db.engine.dispose()
        os.chdir(cls.original_cwd)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)

    def test_seed_and_reset_lifecycle(self) -> None:
        from db_models import MealDB, MealItemDB
        from models import MealCreate
        from api.meals import create_meal

        session = self.db.SessionLocal()
        self.addCleanup(session.close)

        # The test database is the temp one, not the repo's.
        self.assertTrue(Path(self.tmp_dir, "app.db").exists())
        self.assertEqual(session.query(MealDB).count(), 0)

        # 1. Seeding inserts the expected number of prefixed, scored rows.
        summary = self.seeder.seed_demo_meals(session, days=12)
        self.assertEqual(summary["inserted"], 36)
        self.assertEqual(summary["days"], 12)

        meals = session.query(MealDB).all()
        self.assertEqual(len(meals), 36)
        # Stored values are naive UTC (issue #77); seeding targets local
        # wall-clock days, so count distinct days in local time.
        local_dates = {meal.created_at.replace(tzinfo=timezone.utc).astimezone().date() for meal in meals}
        self.assertEqual(len(local_dates), 12)
        for meal in meals:
            self.assertTrue(meal.meal_name.startswith(self.seeder.DEMO_PREFIX))
            self.assertIsNotNone(meal.acute_score)
            self.assertGreater(meal.insulin_load_total, 0.0)

        # Items went through the real scoring path: sources and loads set.
        items = session.query(MealItemDB).all()
        self.assertGreater(len(items), 0)
        for item in items:
            self.assertIn(item.fii_source, {"exact_fii", "mapped_fii", "macro_fallback", "unknown"})
            self.assertNotEqual(item.fii_source, "user_confirmed")

        # 2. No image/base64/photo data anywhere.
        self.assertFalse(hasattr(MealDB, "image"))
        self.assertFalse(hasattr(MealItemDB, "image"))
        for meal in meals:
            self.assertNotIn("data:image", meal.meal_name)
            self.assertNotIn("base64", meal.meal_name)
        for item in items:
            self.assertNotIn("data:image", item.name)
            self.assertNotIn("base64", item.name)

        # 3. Re-seeding without reset is a no-op.
        again = self.seeder.seed_demo_meals(session, days=12)
        self.assertEqual(again["inserted"], 0)
        self.assertEqual(again["existing"], 36)
        self.assertEqual(session.query(MealDB).count(), 36)

        # 4. Chronic metrics can read the seeded rows. Chronic bucketing uses
        # UTC dates (unchanged by #77); 12 seeded local days cover 12 or 13
        # UTC dates depending on the machine timezone, so derive the window
        # from the seeded rows instead of hardcoding 30 days back from now.
        utc_dates = sorted({meal.created_at.date() for meal in meals})
        start = utc_dates[0]
        span = (utc_dates[-1] - start).days + 1
        daily_totals = {(start + timedelta(days=i)).isoformat(): 0.0 for i in range(span)}
        daily_energy = dict(daily_totals)
        for meal in meals:
            key = meal.created_at.date().isoformat()
            daily_totals[key] += meal.insulin_load_total or 0.0
            daily_energy[key] += meal.total_kcal or 0.0
        series = self.chronic.build_chronic_series_from_daily_maps(daily_totals=daily_totals, daily_energy=daily_energy)
        seeded_days = [point for point in series if point["daily_dil"] > 0.0]
        self.assertEqual(len(seeded_days), len(utc_dates))
        self.assertGreaterEqual(len(utc_dates), 12)
        self.assertGreater(series[-1]["rolling_7d_dii"], 0.0)
        # Day archetypes cycle, so the trend is not flat.
        self.assertGreater(len({round(point["daily_dil"], 3) for point in seeded_days}), 1)

        # 5. Reset removes exactly the demo rows and nothing else.
        keeper = MealCreate.model_validate(
            {
                "meal_name": "keep me - not a demo meal",
                "items": [
                    {"name": "plain yogurt", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 180.0, "carb_g": 16.0, "protein_g": 8.0, "fat_g": 4.0, "satFat_g": 2.0, "gi": 35}
                ],
            }
        )
        asyncio.run(create_meal(keeper, session))
        self.assertEqual(session.query(MealDB).count(), 37)

        removed = self.seeder.reset_demo_meals(session)
        self.assertEqual(removed, 36)
        remaining = session.query(MealDB).all()
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0].meal_name, "keep me - not a demo meal")
        self.assertEqual(
            session.query(MealItemDB).filter(MealItemDB.meal_id != remaining[0].id).count(),
            0,
        )

        # 6. Reset when nothing is seeded removes nothing.
        self.assertEqual(self.seeder.reset_demo_meals(session), 0)
        self.assertEqual(session.query(MealDB).count(), 1)


if __name__ == "__main__":
    unittest.main()
