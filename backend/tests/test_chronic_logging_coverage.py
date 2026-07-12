"""Logged-days-only 7-day trend semantics (issue #93).

The historical defect: the chronic endpoint zero-filled unlogged days into
the rolling mean, so identical eating logged on 1 of 7 days scored ~1/7 of
the same eating logged daily — the metric rewarded under-logging. The
invariant under test: for identical fully logged days of food, the rolling
per-logged-day trend value is the same regardless of how many blank days
surround it; only the coverage metadata changes.

Synthetic data only. No real user or health data.
"""

import asyncio
import importlib
import math
import os
import sys
import tempfile
import unittest
import uuid
from datetime import datetime, time as dt_time, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Modules that bind (directly or transitively) to the SQLite engine created at
# import time from the relative ./app.db path. Popped and re-imported inside a
# temp working directory so the test never touches the developer's real app.db.
DB_BOUND_MODULES = ["main", "api.meals", "api", "db", "db_models"]

SIMPLE_ITEMS = [
    {"name": "plain yogurt", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 180.0, "carb_g": 16.0, "protein_g": 8.0, "fat_g": 4.0, "satFat_g": 2.0, "gi": 35}
]


class ChronicServiceLoggedDaysTests(unittest.TestCase):
    """Unit-level tests of the rolling aggregation itself."""

    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.chronic_service = importlib.import_module("chronic_service")

    def build_series(self, day_values: dict[str, tuple[float, float] | None]):
        """day_values maps ISO date -> (dil, energy) for logged days, None for unlogged."""
        daily_totals = {day: (values[0] if values else 0.0) for day, values in day_values.items()}
        daily_energy = {day: (values[1] if values else 0.0) for day, values in day_values.items()}
        logged_days = {day for day, values in day_values.items() if values is not None}
        return self.chronic_service.build_chronic_series_from_daily_maps(
            daily_totals=daily_totals, daily_energy=daily_energy, logged_days=logged_days
        )

    @staticmethod
    def window_of_days(pattern: list[tuple[float, float] | None], start: str = "2026-07-01"):
        start_date = datetime.fromisoformat(start).date()
        return {
            (start_date + timedelta(days=offset)).isoformat(): values
            for offset, values in enumerate(pattern)
        }

    LOGGED_DAY = (60.0, 400.0)  # daily_dil 60, energy 400 -> daily_dii 0.15

    def test_no_logged_days_yields_no_score_not_zero(self) -> None:
        series = self.build_series(self.window_of_days([None] * 7))

        latest = series[-1]
        self.assertEqual(latest["logged_days_in_window"], 0)
        self.assertIsNone(latest["rolling_7d_dil"])
        self.assertIsNone(latest["rolling_7d_dii"])
        self.assertIsNone(latest["daily_dil"])
        self.assertIsNone(latest["daily_dii"])
        self.assertFalse(latest["logged"])

    def test_identical_day_logged_1_4_and_7_of_7_keeps_the_same_trend_value(self) -> None:
        # KEY regression test: under the old zero-fill behavior these three
        # rolling values were ~8.57, ~34.29, and 60.0 (ratios 1/7 and 4/7);
        # under logged-days-only semantics all three must equal 60.0.
        one_of_seven = self.build_series(self.window_of_days([None, None, None, self.LOGGED_DAY, None, None, None]))
        four_of_seven = self.build_series(self.window_of_days([self.LOGGED_DAY, None, self.LOGGED_DAY, None, self.LOGGED_DAY, None, self.LOGGED_DAY]))
        seven_of_seven = self.build_series(self.window_of_days([self.LOGGED_DAY] * 7))

        for series, expected_coverage in ((one_of_seven, 1), (four_of_seven, 4), (seven_of_seven, 7)):
            latest = series[-1]
            self.assertEqual(latest["logged_days_in_window"], expected_coverage)
            self.assertAlmostEqual(float(latest["rolling_7d_dil"]), 60.0)
            self.assertAlmostEqual(float(latest["rolling_7d_dii"]), 0.15)

    def test_unlogged_days_do_not_dilute_differing_logged_days(self) -> None:
        series = self.build_series(
            self.window_of_days([(60.0, 400.0), None, (120.0, 400.0), None, None, None, None])
        )

        latest = series[-1]
        self.assertEqual(latest["logged_days_in_window"], 2)
        self.assertAlmostEqual(float(latest["rolling_7d_dil"]), 90.0)  # mean of 60 and 120 only
        self.assertAlmostEqual(float(latest["rolling_7d_dii"]), (0.15 + 0.30) / 2)

    def test_zero_energy_logged_day_counts_as_logged_with_zero_dii(self) -> None:
        series = self.build_series(self.window_of_days([(0.0, 0.0)]))

        latest = series[-1]
        self.assertTrue(latest["logged"])
        self.assertEqual(latest["logged_days_in_window"], 1)
        self.assertEqual(latest["daily_dii"], 0.0)
        self.assertEqual(latest["rolling_7d_dii"], 0.0)

    def test_window_slides_after_seven_rows(self) -> None:
        # 8 days: day 1 logged high, days 2-7 unlogged, day 8 logged low. At
        # day 8 the trailing window no longer contains day 1.
        pattern: list[tuple[float, float] | None] = [(700.0, 700.0), None, None, None, None, None, None, (70.0, 700.0)]
        series = self.build_series(self.window_of_days(pattern))

        self.assertEqual(series[6]["logged_days_in_window"], 1)
        self.assertAlmostEqual(float(series[6]["rolling_7d_dil"]), 700.0)
        self.assertEqual(series[7]["logged_days_in_window"], 1)
        self.assertAlmostEqual(float(series[7]["rolling_7d_dil"]), 70.0)


class ChronicEndpointCoverageTests(unittest.TestCase):
    """Endpoint-level tests through the real DB and /metrics/chronic handler."""

    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-chronic-coverage-test-")
        os.chdir(cls.tmp_dir)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)
        cls.db = importlib.import_module("db")
        cls.db.create_tables()
        cls.meals_api = importlib.import_module("api.meals")
        cls.main = importlib.import_module("main")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db.engine.dispose()
        os.chdir(cls.original_cwd)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)

    def setUp(self) -> None:
        self.session = self.db.SessionLocal()
        self.addCleanup(self.session.close)
        # Isolated table state per test.
        from db_models import MealDB, MealItemDB

        self.session.query(MealItemDB).delete()
        self.session.query(MealDB).delete()
        self.session.commit()

    def create_meal_on(self, days_ago: int, name: str) -> None:
        from models import MealCreate

        created_at = datetime.combine(
            datetime.now(timezone.utc).date() - timedelta(days=days_ago), dt_time(hour=12), tzinfo=timezone.utc
        )
        meal = MealCreate.model_validate({"meal_name": name, "created_at": created_at, "items": SIMPLE_ITEMS})
        asyncio.run(self.meals_api.create_meal(meal, self.session))

    def get_metrics(self, days: int = 30) -> dict:
        return asyncio.run(self.main.get_chronic_metrics(days=days, db=self.session))

    def test_empty_history_reports_no_data_and_no_score(self) -> None:
        metrics = self.get_metrics()

        self.assertEqual(metrics["window_days"], 7)
        self.assertEqual(metrics["logged_days_last_7"], 0)
        self.assertFalse(metrics["has_data"])
        self.assertIsNone(metrics["current_rolling_7d_dii"])
        self.assertIsNone(metrics["current_rolling_7d_dil"])
        self.assertIsNone(metrics["current_daily_dii"])

    def test_identical_meal_daily_vs_once_in_window_yields_same_trend_value(self) -> None:
        # Daily logging: same meal on each of the last 7 days.
        for days_ago in range(7):
            self.create_meal_on(days_ago, f"daily meal {days_ago}")
        daily_metrics = self.get_metrics()

        # Reset, then sporadic logging: the same meal once in the window.
        self.setUp()
        self.create_meal_on(3, "sporadic meal")
        sporadic_metrics = self.get_metrics()

        self.assertEqual(daily_metrics["logged_days_last_7"], 7)
        self.assertEqual(sporadic_metrics["logged_days_last_7"], 1)
        self.assertTrue(daily_metrics["has_data"])
        self.assertTrue(sporadic_metrics["has_data"])
        # The descriptive per-logged-day value must be identical: the old
        # zero-fill behavior made the sporadic value 1/7 of the daily one.
        self.assertAlmostEqual(
            float(daily_metrics["current_rolling_7d_dii"]),
            float(sporadic_metrics["current_rolling_7d_dii"]),
            places=9,
        )

    def test_multiple_meals_on_one_day_aggregate_into_that_day(self) -> None:
        self.create_meal_on(0, "breakfast")
        self.create_meal_on(0, "dinner")
        metrics = self.get_metrics()

        self.assertEqual(metrics["logged_days_last_7"], 1)
        # Two identical meals double dil and energy, so the day's DII is the
        # same as one meal's, and daily dil doubles.
        single = self.get_single_meal_reference()
        self.assertAlmostEqual(float(metrics["current_daily_dil"]), 2 * single["dil"], places=6)
        self.assertAlmostEqual(float(metrics["current_daily_dii"]), single["dii"], places=9)

    def get_single_meal_reference(self) -> dict:
        from db_models import MealDB

        meal_row = self.session.query(MealDB).first()
        dil = float(meal_row.insulin_load_total)
        energy = float(meal_row.total_kcal)
        return {"dil": dil, "dii": dil / energy}

    def test_malformed_non_finite_stored_row_does_not_poison_the_trend(self) -> None:
        from db_models import MealDB

        self.create_meal_on(0, "good meal")
        bad_row = MealDB(
            id=str(uuid.uuid4()),
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            meal_name="malformed meal",
            acute_score=0.0,
            insulin_load_total=math.nan,
            total_kcal=math.inf,
        )
        self.session.add(bad_row)
        self.session.commit()

        metrics = self.get_metrics()

        self.assertTrue(metrics["has_data"])
        self.assertTrue(math.isfinite(float(metrics["current_rolling_7d_dii"])))
        self.assertTrue(math.isfinite(float(metrics["current_daily_dil"])))

    def test_series_marks_unlogged_days_as_missing_not_zero(self) -> None:
        self.create_meal_on(2, "one meal")
        metrics = self.get_metrics(days=7)

        unlogged_points = [point for point in metrics["series"] if not point["logged"]]
        logged_points = [point for point in metrics["series"] if point["logged"]]
        self.assertEqual(len(logged_points), 1)
        self.assertEqual(len(unlogged_points), 6)
        for point in unlogged_points:
            self.assertIsNone(point["daily_dil"])
            self.assertIsNone(point["daily_dii"])
        self.assertIsNotNone(logged_points[0]["daily_dil"])


if __name__ == "__main__":
    unittest.main()
