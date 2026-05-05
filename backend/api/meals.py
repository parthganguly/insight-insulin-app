import json
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from db_models import MealDB, MealItemDB
from estimate_quality import resolve_estimate_quality
from models import MealCreate, MealItemResponse, MealResponse
from scoring_service import (
    build_source_explanation,
    compute_acute_score,
    compute_insulin_load_item,
    standardize_fii_source,
)

router = APIRouter()

ALLOWED_ESTIMATE_QUALITY = {"high", "medium", "low", "unknown"}


def map_meal_db_to_schema(meal_db: MealDB) -> MealResponse:
    drivers_raw = meal_db.main_insulin_drivers or "[]"
    try:
        main_insulin_drivers = json.loads(drivers_raw)
    except json.JSONDecodeError:
        main_insulin_drivers = []

    estimate_quality = meal_db.estimate_quality or "unknown"
    if estimate_quality not in ALLOWED_ESTIMATE_QUALITY:
        estimate_quality = "unknown"

    items = [
        MealItemResponse(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            kcalPerUnit=item.kcal_per_unit,
            carb_g=item.carb_g,
            protein_g=item.protein_g,
            fat_g=item.fat_g,
            satFat_g=item.sat_fat_g,
            gi=item.gi,
            fii_value=item.fii if item.fii > 0 else None,
            fii=item.fii if item.fii > 0 else None,
            kcal_item=item.kcal_item or 0.0,
            insulin_load=item.insulin_load or 0.0,
            confidence=item.confidence if item.confidence is not None else 0.5,
            fii_source=standardize_fii_source(item.fii_source),
            why=item.why or build_source_explanation(standardize_fii_source(item.fii_source)),
        )
        for item in meal_db.items
    ]

    insulin_load_total = meal_db.insulin_load_total
    if insulin_load_total is None:
        insulin_load_total = sum(item.insulin_load for item in items)

    return MealResponse(
        id=meal_db.id,
        created_at=meal_db.created_at,
        meal_name=meal_db.meal_name,
        acute_score=meal_db.acute_score,
        insulin_load_total=insulin_load_total,
        kcal_total=meal_db.total_kcal or 0.0,
        carbs_total=meal_db.total_carb or 0.0,
        protein_total=meal_db.total_protein or 0.0,
        fat_total=meal_db.total_fat or 0.0,
        estimate_quality=estimate_quality,
        main_insulin_drivers=main_insulin_drivers if isinstance(main_insulin_drivers, list) else [],
        items=items,
    )


def resolve_main_insulin_drivers(item_rows: list[MealItemDB]) -> list[str]:
    ranked_names: list[str] = []
    for item in sorted(item_rows, key=lambda row: row.insulin_load or 0.0, reverse=True):
        normalized_name = item.name.strip()
        if not normalized_name or normalized_name in ranked_names:
            continue
        ranked_names.append(normalized_name)
        if len(ranked_names) == 3:
            break
    return ranked_names


@router.post("/meals", response_model=MealResponse)
async def create_meal(meal: MealCreate, db: Session = Depends(get_db)):
    meal_id = str(uuid.uuid4())
    created_at = meal.created_at or datetime.utcnow()
    total_kcal = 0.0
    total_carb = 0.0
    total_protein = 0.0
    total_fat = 0.0
    total_sat_fat = 0.0
    insulin_load_total = 0.0
    item_rows: list[MealItemDB] = []
    item_sources: list[str] = []

    for item in meal.items:
        fii_value = item.fii_value if item.fii_value is not None else item.fii
        insulin_load_item, confidence, fii_source = compute_insulin_load_item(
            food_name=item.name,
            quantity=item.quantity,
            kcal_per_unit=item.kcalPerUnit,
            fii=fii_value,
            gi=item.gi,
            carb_g=item.carb_g,
            protein_g=item.protein_g,
            fat_g=item.fat_g,
            sat_fat_g=item.satFat_g,
        )
        why = build_source_explanation(fii_source)
        kcal_item = (item.kcalPerUnit or 0.0) * item.quantity
        carb_item = (item.carb_g or 0.0) * item.quantity
        protein_item = (item.protein_g or 0.0) * item.quantity
        fat_item = (item.fat_g or 0.0) * item.quantity
        sat_fat_item = (item.satFat_g or 0.0) * item.quantity

        total_kcal += kcal_item
        total_carb += carb_item
        total_protein += protein_item
        total_fat += fat_item
        total_sat_fat += sat_fat_item
        insulin_load_total += insulin_load_item
        item_sources.append(fii_source)

        item_rows.append(
            MealItemDB(
                id=str(uuid.uuid4()),
                meal_id=meal_id,
                name=item.name,
                quantity=item.quantity,
                unit=item.unit.value,
                kcal_per_unit=item.kcalPerUnit or 0.0,
                carb_g=item.carb_g or 0.0,
                protein_g=item.protein_g,
                fat_g=item.fat_g,
                gi=item.gi or 0,
                sat_fat_g=item.satFat_g or 0.0,
                fii=fii_value or 0,
                kcal_item=kcal_item,
                insulin_load=insulin_load_item,
                confidence=confidence,
                fii_source=fii_source,
                why=why,
            )
        )

    acute_score, _acute_confidence = compute_acute_score(insulin_load_total, tdee=None)
    main_insulin_drivers = resolve_main_insulin_drivers(item_rows)

    meal_db = MealDB(
        id=meal_id,
        created_at=created_at,
        meal_name=meal.meal_name,
        total_kcal=total_kcal,
        total_carb=total_carb,
        total_protein=total_protein,
        total_fat=total_fat,
        total_sat_fat=total_sat_fat,
        insulin_load_total=insulin_load_total,
        acute_score=acute_score,
        chronic_score=None,
        estimate_quality=resolve_estimate_quality(item_sources),
        main_insulin_drivers=json.dumps(main_insulin_drivers),
    )

    meal_db.items = item_rows

    db.add(meal_db)
    db.commit()
    db.refresh(meal_db)

    return map_meal_db_to_schema(meal_db)


@router.get("/meals", response_model=list[MealResponse])
async def list_meals(db: Session = Depends(get_db)):
    meals = db.query(MealDB).order_by(MealDB.created_at.desc()).all()
    return [map_meal_db_to_schema(meal_db) for meal_db in meals]
