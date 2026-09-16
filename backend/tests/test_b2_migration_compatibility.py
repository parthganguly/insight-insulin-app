"""B2-1 upgrade compatibility for a synthetic pre-B2 SQLite database.

The fixture reproduces the exact pre-B2 schema with synthetic rows, copies it,
and exercises the real startup migration. No private database is read.
"""

import asyncio
import importlib
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import inspect


BACKEND_DIR = Path(__file__).resolve().parents[1]
DB_BOUND_MODULES = ["main", "api.meals", "api", "db", "db_models"]
LEGACY_MEAL_ID = "11111111-1111-4111-8111-111111111111"
LEGACY_ITEMS = [
    ("22222222-2222-4222-8222-222222222222", "synthetic legacy C"),
    ("22222222-2222-4222-8222-222222222223", "synthetic legacy A"),
    ("22222222-2222-4222-8222-222222222224", "synthetic legacy B"),
]


PRE_B2_SCHEMA = """
CREATE TABLE meals (
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    meal_name VARCHAR(255) NOT NULL,
    total_kcal FLOAT,
    total_carb FLOAT,
    total_protein FLOAT,
    total_fat FLOAT,
    total_sat_fat FLOAT,
    insulin_load_total FLOAT,
    acute_score FLOAT NOT NULL,
    chronic_score FLOAT,
    estimate_quality VARCHAR(32),
    main_insulin_drivers TEXT,
    PRIMARY KEY (id)
);
CREATE TABLE meal_items (
    id VARCHAR(36) NOT NULL,
    meal_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity FLOAT NOT NULL,
    unit VARCHAR(32) NOT NULL,
    kcal_per_unit FLOAT NOT NULL,
    carb_g FLOAT NOT NULL,
    protein_g FLOAT,
    fat_g FLOAT,
    gi INTEGER NOT NULL,
    sat_fat_g FLOAT NOT NULL,
    fii INTEGER NOT NULL,
    kcal_item FLOAT,
    insulin_load FLOAT,
    confidence FLOAT,
    fii_source VARCHAR(64),
    why VARCHAR(255),
    PRIMARY KEY (id),
    FOREIGN KEY(meal_id) REFERENCES meals (id)
);
CREATE INDEX ix_meals_id ON meals (id);
CREATE INDEX ix_meals_created_at ON meals (created_at);
CREATE INDEX ix_meal_items_id ON meal_items (id);
CREATE INDEX ix_meal_items_meal_id ON meal_items (meal_id);
"""

SYNTHETIC_ITEM = {
    "name": "synthetic migration food",
    "quantity": 1.0,
    "unit": "serving",
    "kcalPerUnit": 180.0,
    "carb_g": 16.0,
    "protein_g": 8.0,
    "fat_g": 4.0,
    "satFat_g": 2.0,
    "gi": 35,
}


class B2MigrationCompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = Path(tempfile.mkdtemp(prefix="insight-b2-migration-test-"))
        cls.source_db = cls.tmp_dir / "pre-b2-source.db"
        cls.active_db = cls.tmp_dir / "app.db"
        cls._build_pre_b2_database()
        os.chdir(cls.tmp_dir)

    @classmethod
    def tearDownClass(cls) -> None:
        os.chdir(cls.original_cwd)

    @classmethod
    def _build_pre_b2_database(cls) -> None:
        created_at = (
            datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)
        ).replace(hour=12, minute=0, second=0, microsecond=0)
        connection = sqlite3.connect(cls.source_db)
        try:
            connection.executescript(PRE_B2_SCHEMA)
            connection.execute(
                """
                INSERT INTO meals (
                    id, created_at, meal_name, total_kcal, total_carb,
                    total_protein, total_fat, total_sat_fat,
                    insulin_load_total, acute_score, chronic_score,
                    estimate_quality, main_insulin_drivers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    LEGACY_MEAL_ID,
                    created_at.isoformat(sep=" "),
                    "Synthetic pre-B2 meal",
                    400.0,
                    40.0,
                    20.0,
                    10.0,
                    2.0,
                    40.0,
                    133.33333333333334,
                    None,
                    "low",
                    json.dumps(["synthetic legacy item"]),
                ),
            )
            for item_id, item_name in LEGACY_ITEMS:
                connection.execute(
                    """
                    INSERT INTO meal_items (
                        id, meal_id, name, quantity, unit, kcal_per_unit, carb_g,
                        protein_g, fat_g, gi, sat_fat_g, fii, kcal_item,
                        insulin_load, confidence, fii_source, why
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item_id,
                        LEGACY_MEAL_ID,
                        item_name,
                        1.0,
                        "serving",
                        400.0,
                        40.0,
                        20.0,
                        10.0,
                        50,
                        2.0,
                        0,
                        400.0,
                        40.0,
                        0.8,
                        "macro_fallback",
                        "Synthetic legacy explanation.",
                    ),
                )
            connection.commit()
        finally:
            connection.close()

    def setUp(self) -> None:
        shutil.copy2(self.source_db, self.active_db)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)
        self.db = importlib.import_module("db")
        self.db.create_tables()
        self.meals_api = importlib.import_module("api.meals")
        self.models = importlib.import_module("models")
        self.db_models = importlib.import_module("db_models")
        self.main = importlib.import_module("main")
        self.session = self.db.SessionLocal()

    def tearDown(self) -> None:
        self.session.close()
        self.db.engine.dispose()
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)

    def save(self, *, name: str, request_id: str | None = None):
        payload = {"meal_name": name, "items": [SYNTHETIC_ITEM]}
        if request_id is not None:
            payload["client_request_id"] = request_id
        request = self.models.MealCreate.model_validate(payload)
        return asyncio.run(self.meals_api.create_meal(request, self.session))

    def test_pre_b2_database_upgrade_preserves_reads_delete_chronic_and_saves(self) -> None:
        # Running the real startup migration repeatedly is safe.
        self.db.create_tables()
        self.db.create_tables()

        db_inspector = inspect(self.db.engine)
        meal_columns = {column["name"] for column in db_inspector.get_columns("meals")}
        meal_item_columns = {
            column["name"]: column for column in db_inspector.get_columns("meal_items")
        }
        indexes = {index["name"]: index for index in db_inspector.get_indexes("meals")}
        self.assertIn("client_request_id", meal_columns)
        self.assertIn("client_request_fingerprint", meal_columns)
        self.assertIn("ux_meals_client_request_id", indexes)
        self.assertTrue(indexes["ux_meals_client_request_id"]["unique"])
        self.assertIn("item_position", meal_item_columns)
        self.assertTrue(meal_item_columns["item_position"]["nullable"])

        # Migration itself does not add, remove, or backfill legacy rows.
        self.assertEqual(self.session.query(self.db_models.MealDB).count(), 1)
        self.assertEqual(self.session.query(self.db_models.MealItemDB).count(), 3)
        legacy_row = self.session.get(self.db_models.MealDB, LEGACY_MEAL_ID)
        self.assertIsNone(legacy_row.client_request_id)
        self.assertIsNone(legacy_row.client_request_fingerprint)
        self.assertIsNone(legacy_row.formula_version)
        self.assertIsNone(legacy_row.dataset_version)
        for column in db_inspector.get_columns("meals"):
            if column["name"] in {"formula_version", "dataset_version"}:
                self.assertTrue(column["nullable"])
                self.assertIsNone(column["default"])
        self.assertTrue(all(item.item_position is None for item in legacy_row.items))

        legacy_columns = (
            "id, meal_id, name, quantity, unit, kcal_per_unit, carb_g, "
            "protein_g, fat_g, gi, sat_fat_g, fii, kcal_item, insulin_load, "
            "confidence, fii_source, why"
        )
        with sqlite3.connect(self.source_db) as source_connection:
            source_rows = source_connection.execute(
                f"SELECT {legacy_columns} FROM meal_items ORDER BY rowid"
            ).fetchall()
        with sqlite3.connect(self.active_db) as active_connection:
            migrated_rows = active_connection.execute(
                f"SELECT {legacy_columns} FROM meal_items ORDER BY rowid"
            ).fetchall()
        self.assertEqual(migrated_rows, source_rows)

        # Compare every original meal column as well as every original item column.
        with sqlite3.connect(self.source_db) as source_connection:
            names = [row[1] for row in source_connection.execute("PRAGMA table_info(meals)")]
            columns = ", ".join(names)
            original_meals = source_connection.execute(f"SELECT {columns} FROM meals").fetchall()
        with sqlite3.connect(self.active_db) as active_connection:
            migrated_meals = active_connection.execute(f"SELECT {columns} FROM meals").fetchall()
        self.assertEqual(migrated_meals, original_meals)

        loaded_legacy_order = [item.name for item in legacy_row.items]
        hydrated = asyncio.run(self.meals_api.list_meals(self.session))
        self.assertEqual(len(hydrated), 1)
        self.assertEqual(hydrated[0].id, LEGACY_MEAL_ID)
        self.assertEqual(hydrated[0].meal_name, "Synthetic pre-B2 meal")
        self.assertEqual(hydrated[0].insulin_load_total, 40.0)
        self.assertEqual(hydrated[0].estimate_status, "estimated")
        self.assertIsNone(hydrated[0].formula_version)
        self.assertIsNone(hydrated[0].dataset_version)
        self.assertEqual([item.name for item in hydrated[0].items], loaded_legacy_order)

        chronic = asyncio.run(self.main.get_chronic_metrics(days=3, db=self.session))
        self.assertEqual(chronic["logged_days_last_7"], 1)
        self.assertTrue(chronic["has_data"])
        self.assertEqual(chronic["current_rolling_7d_dil"], 40.0)
        self.assertEqual(chronic["current_rolling_7d_dii"], 0.1)
        self.assertIsNone(chronic["current_daily_dil"])
        self.assertIsNone(chronic["current_daily_dii"])

        # Multiple legacy/no-ID saves remain legal under SQLite NULL uniqueness.
        first_legacy_save = self.save(name="Legacy client one")
        second_legacy_save = self.save(name="Legacy client two")
        self.assertNotEqual(first_legacy_save.id, second_legacy_save.id)
        null_id_rows = (
            self.session.query(self.db_models.MealDB)
            .filter(self.db_models.MealDB.client_request_id.is_(None))
            .count()
        )
        self.assertEqual(null_id_rows, 3)

        request_id = str(uuid.uuid4())
        first_idempotent = self.save(name="New B2 save", request_id=request_id)
        replay = self.save(name="Renamed retry", request_id=request_id)
        self.assertEqual(replay.model_dump(mode="json"), first_idempotent.model_dump(mode="json"))
        history = asyncio.run(self.meals_api.list_meals(self.session))
        self.assertEqual(len(history), 4)
        self.assertEqual(sum(meal.formula_version is None for meal in history), 1)
        self.assertEqual(first_idempotent.formula_version, "current_backend_v2")
        self.assertTrue(first_idempotent.dataset_version.startswith("fii_foods_csv_fnv1a64_"))
        self.assertEqual(
            self.session.query(self.db_models.MealDB)
            .filter(self.db_models.MealDB.client_request_id == request_id)
            .count(),
            1,
        )

        asyncio.run(self.meals_api.delete_meal(LEGACY_MEAL_ID, self.session))
        self.assertIsNone(self.session.get(self.db_models.MealDB, LEGACY_MEAL_ID))
        self.assertEqual(
            self.session.query(self.db_models.MealItemDB)
            .filter(self.db_models.MealItemDB.meal_id == LEGACY_MEAL_ID)
            .count(),
            0,
        )

    def test_fresh_orm_metadata_declares_bounded_columns_and_unique_index(self) -> None:
        table = self.db_models.MealDB.__table__
        item_table = self.db_models.MealItemDB.__table__

        self.assertEqual(table.c.client_request_id.type.length, 36)
        self.assertTrue(table.c.client_request_id.nullable)
        self.assertEqual(table.c.client_request_fingerprint.type.length, 64)
        self.assertTrue(table.c.client_request_fingerprint.nullable)
        unique_indexes = {
            index.name for index in table.indexes if index.unique
        }
        self.assertIn("ux_meals_client_request_id", unique_indexes)
        self.assertTrue(item_table.c.item_position.nullable)
        self.assertIsInstance(item_table.c.item_position.type, self.db_models.Integer)

    def test_legacy_null_source_standardizes_to_unknown_without_inference(self) -> None:
        legacy_row = self.session.get(self.db_models.MealDB, LEGACY_MEAL_ID)
        legacy_row.estimate_quality = "low"
        for item in legacy_row.items:
            item.fii_source = None
            item.kcal_per_unit = 0.0
        self.session.commit()
        self.session.expire_all()

        hydrated = asyncio.run(self.meals_api.list_meals(self.session))[0]

        self.assertEqual(hydrated.estimate_quality, "low")
        self.assertEqual(hydrated.estimate_status, "estimated")
        self.assertTrue(all(item.fii_source == "unknown" for item in hydrated.items))


if __name__ == "__main__":
    unittest.main()
