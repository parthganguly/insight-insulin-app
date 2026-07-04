"""Synthetic demo seed data for local private-beta demos (issue #55).

Inserts ~12 days of synthetic meals through the normal scoring path
(api.meals.create_meal), so seeded rows carry real insulin loads, acute
scores, source labels, and estimate quality. All meal names are prefixed
"Demo: " (the schema has no tags column, and adding one is out of scope),
and --reset-demo removes exactly those rows.

Operator-invoked only — never runs on app startup or in CI.
No images, no external AI calls, no API keys, no real data.

Usage, from backend/ with the virtual environment active:

    python scripts/seed_demo_data.py                 # seed (no-op if demo rows exist)
    python scripts/seed_demo_data.py --days 14       # seed a different span (10-14 typical)
    python scripts/seed_demo_data.py --reset-demo    # remove exactly the seeded demo meals
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime, time as dtime, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from api.meals import create_meal  # noqa: E402
from db_models import MealDB, MealItemDB  # noqa: E402
from models import MealCreate  # noqa: E402

DEMO_PREFIX = "Demo: "

# Synthetic meal templates only. Quantities/macros are plausible inventions;
# scoring is NOT hardcoded — every meal runs through create_meal.
LOW_MEALS = [
    ("Veggie Omelette", [
        {"name": "eggs", "quantity": 2.0, "unit": "pcs", "kcalPerUnit": 90.0, "carb_g": 1.0, "protein_g": 6.0, "fat_g": 7.0, "satFat_g": 2.0, "gi": 0},
        {"name": "spinach and pepper saute", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 80.0, "carb_g": 5.0, "protein_g": 2.0, "fat_g": 6.0, "satFat_g": 1.0, "gi": 15},
    ]),
    ("Grilled Chicken Salad", [
        {"name": "grilled chicken breast", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 220.0, "carb_g": 0.0, "protein_g": 35.0, "fat_g": 8.0, "satFat_g": 2.0, "gi": 0},
        {"name": "mixed salad with olive oil", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 120.0, "carb_g": 6.0, "protein_g": 2.0, "fat_g": 10.0, "satFat_g": 1.5, "gi": 15},
    ]),
]
MEDIUM_MEALS = [
    ("Yogurt Berry Bowl", [
        {"name": "plain yogurt", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 180.0, "carb_g": 16.0, "protein_g": 8.0, "fat_g": 4.0, "satFat_g": 2.0, "gi": 35},
        {"name": "mixed berries", "quantity": 1.0, "unit": "cup", "kcalPerUnit": 70.0, "carb_g": 17.0, "protein_g": 1.0, "fat_g": 0.5, "satFat_g": 0.0, "gi": 40},
    ]),
    ("Turkey Sandwich", [
        {"name": "whole wheat bread", "quantity": 2.0, "unit": "slice", "kcalPerUnit": 80.0, "carb_g": 14.0, "protein_g": 4.0, "fat_g": 1.0, "satFat_g": 0.2, "gi": 69},
        {"name": "turkey slices", "quantity": 1.0, "unit": "serving", "kcalPerUnit": 100.0, "carb_g": 1.0, "protein_g": 18.0, "fat_g": 2.0, "satFat_g": 0.5, "gi": 0},
    ]),
]
HIGH_MEALS = [
    ("Rice Plate with Sweet Drink", [
        {"name": "white rice", "quantity": 1.5, "unit": "cup", "kcalPerUnit": 200.0, "carb_g": 45.0, "protein_g": 4.0, "fat_g": 0.5, "satFat_g": 0.1, "gi": 73},
        {"name": "sweetened iced tea", "quantity": 1.0, "unit": "cup", "kcalPerUnit": 120.0, "carb_g": 30.0, "protein_g": 0.0, "fat_g": 0.0, "satFat_g": 0.0, "gi": 65},
    ]),
    ("Pasta with Cake Dessert", [
        {"name": "pasta with tomato sauce", "quantity": 1.5, "unit": "cup", "kcalPerUnit": 220.0, "carb_g": 40.0, "protein_g": 8.0, "fat_g": 3.0, "satFat_g": 0.8, "gi": 55},
        {"name": "cake", "quantity": 1.0, "unit": "slice", "kcalPerUnit": 260.0, "carb_g": 38.0, "protein_g": 3.0, "fat_g": 11.0, "satFat_g": 5.0, "gi": 67},
    ]),
]

# Day archetypes cycle so the DIL/DII trend shows visible variation.
DAY_ARCHETYPES = [
    (LOW_MEALS[0], MEDIUM_MEALS[0], LOW_MEALS[1]),
    (MEDIUM_MEALS[1], HIGH_MEALS[0], MEDIUM_MEALS[0]),
    (LOW_MEALS[1], MEDIUM_MEALS[1], HIGH_MEALS[1]),
]
MEAL_TIMES = (dtime(8, 30), dtime(13, 0), dtime(19, 30))


def count_demo_meals(session) -> int:
    return session.query(MealDB).filter(MealDB.meal_name.like(f"{DEMO_PREFIX}%")).count()


def seed_demo_meals(session, days: int = 12, now: datetime | None = None) -> dict:
    """Insert `days` of synthetic demo meals through the real scoring path.

    No-op (returns inserted=0) when demo rows already exist; run
    --reset-demo first to reseed.
    """
    existing = count_demo_meals(session)
    if existing:
        return {"inserted": 0, "existing": existing, "days": 0, "per_day": []}

    now = now or datetime.utcnow()
    per_day = []
    inserted = 0
    for offset in range(days - 1, -1, -1):
        day = (now - timedelta(days=offset)).date()
        archetype = DAY_ARCHETYPES[(days - 1 - offset) % len(DAY_ARCHETYPES)]
        day_names = []
        for (title, items), meal_time in zip(archetype, MEAL_TIMES):
            meal = MealCreate(
                meal_name=f"{DEMO_PREFIX}{title}",
                created_at=datetime.combine(day, meal_time),
                items=items,
            )
            response = asyncio.run(create_meal(meal, session))
            day_names.append((response.meal_name, round(response.insulin_load_total, 1)))
            inserted += 1
        per_day.append({"date": day.isoformat(), "meals": day_names})
    return {"inserted": inserted, "existing": 0, "days": days, "per_day": per_day}


def reset_demo_meals(session) -> int:
    """Delete exactly the seeded demo meals (and their items)."""
    demo_ids = [row.id for row in session.query(MealDB.id).filter(MealDB.meal_name.like(f"{DEMO_PREFIX}%")).all()]
    if not demo_ids:
        return 0
    session.query(MealItemDB).filter(MealItemDB.meal_id.in_(demo_ids)).delete(synchronize_session=False)
    removed = session.query(MealDB).filter(MealDB.id.in_(demo_ids)).delete(synchronize_session=False)
    session.commit()
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed or reset synthetic demo meals in the local backend app.db.")
    parser.add_argument("--days", type=int, default=12, help="days of history to seed (10-14 typical, default 12)")
    parser.add_argument("--reset-demo", action="store_true", help="remove exactly the seeded 'Demo: ' meals and exit")
    args = parser.parse_args()

    if not 1 <= args.days <= 30:
        parser.error("--days must be between 1 and 30")

    # Pin app.db to backend/ regardless of the operator's CWD (db.py uses a
    # relative sqlite path), then import db only after the chdir.
    os.chdir(BACKEND_DIR)
    from db import SessionLocal, create_tables

    create_tables()
    session = SessionLocal()
    try:
        if args.reset_demo:
            removed = reset_demo_meals(session)
            print(f"Removed {removed} demo meal(s) from {BACKEND_DIR / 'app.db'}.")
            return

        summary = seed_demo_meals(session, days=args.days)
        if summary["inserted"] == 0:
            print(f"{summary['existing']} demo meal(s) already present — nothing inserted. Run with --reset-demo first to reseed.")
            return

        print(f"Inserted {summary['inserted']} synthetic demo meals across {summary['days']} days into {BACKEND_DIR / 'app.db'}:")
        for day in summary["per_day"]:
            names = ", ".join(f"{name} (IL {il})" for name, il in day["meals"])
            print(f"  {day['date']}: {names}")
        print("All demo meals are prefixed 'Demo: '. Remove them with: python scripts/seed_demo_data.py --reset-demo")
    finally:
        session.close()


if __name__ == "__main__":
    main()
