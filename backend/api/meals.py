import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

import scoring_service
from fii_lookup import get_dataset_version
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import get_db
from db_models import MealDB, MealItemDB
from estimate_completeness import EstimateStatus, resolve_estimate_status
from estimate_quality import resolve_estimate_quality
from models import (
    MealCreate,
    MealItemCreate,
    MealItemResponse,
    MealPreviewRequest,
    MealPreviewResponse,
    MealResponse,
)
from scoring_service import (
    build_source_explanation,
    compute_acute_score,
    compute_insulin_load_item,
    standardize_fii_source,
)

router = APIRouter()

ALLOWED_ESTIMATE_QUALITY = {"high", "medium", "low", "unknown"}


@dataclass(frozen=True)
class ModeledMealItem:
    name: str
    quantity: float
    unit: str
    kcal_per_unit: float
    carb_g: float
    protein_g: float | None
    fat_g: float | None
    sat_fat_g: float
    gi: int
    fii: int
    kcal_item: float
    insulin_load: float
    confidence: float
    fii_source: str
    why: str


@dataclass(frozen=True)
class ModeledMeal:
    formula_version: str
    dataset_version: str
    meal_name: str
    items: list[ModeledMealItem]
    total_kcal: float
    total_carb: float
    total_protein: float
    total_fat: float
    total_sat_fat: float
    insulin_load_total: float
    acute_score: float
    estimate_quality: str
    estimate_status: EstimateStatus
    main_insulin_drivers: list[str]


# Timestamp contract (issue #77): meal times are UTC end to end. The SQLite
# column is a naive DateTime, and all existing rows hold naive UTC values, so
# the database keeps storing naive UTC (no migration, chronic day bucketing in
# /metrics/chronic reads the same values as before). Timezone awareness is
# attached only at the API boundary, so every serialized created_at carries an
# explicit UTC offset instead of an ambiguous naive string.


def coerce_created_at_to_naive_utc(value: datetime | None) -> datetime:
    """Normalize an incoming created_at to the naive-UTC storage form."""
    if value is None:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    if value.tzinfo is None:
        # Legacy naive inputs have always meant UTC; keep that meaning.
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def as_utc(value: datetime) -> datetime:
    """Attach UTC to a stored naive-UTC datetime for serialization."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def resolve_positive_provided_fii(fii_value: int | None, fii: int | None) -> int | None:
    for candidate in (fii_value, fii):
        if candidate is not None and candidate > 0:
            return candidate
    return None


def canonical_material_items(items: list[MealItemCreate]) -> list[dict]:
    return [
        {
            "name": item.name,
            "quantity": item.quantity,
            "unit": item.unit.value,
            "kcalPerUnit": item.kcalPerUnit,
            "carb_g": item.carb_g,
            "protein_g": item.protein_g,
            "fat_g": item.fat_g,
            "satFat_g": item.satFat_g,
            "gi": item.gi,
            "fii": resolve_positive_provided_fii(item.fii_value, item.fii),
        }
        for item in items
    ]


def compute_client_request_fingerprint(items: list[MealItemCreate]) -> str:
    canonical_json = json.dumps(
        canonical_material_items(items),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def map_meal_db_to_schema(
    meal_db: MealDB, *, estimate_status: EstimateStatus | None = None
) -> MealResponse:
    drivers_raw = meal_db.main_insulin_drivers or "[]"
    try:
        main_insulin_drivers = json.loads(drivers_raw)
    except json.JSONDecodeError:
        main_insulin_drivers = []

    estimate_quality = meal_db.estimate_quality or "unknown"
    if estimate_quality not in ALLOWED_ESTIMATE_QUALITY:
        estimate_quality = "unknown"

    loaded_items = list(meal_db.items)
    if all(item.item_position is not None for item in loaded_items):
        loaded_items.sort(key=lambda item: item.item_position)

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
        for item in loaded_items
    ]

    insulin_load_total = meal_db.insulin_load_total
    if insulin_load_total is None:
        insulin_load_total = sum(item.insulin_load for item in items)

    if estimate_status is None:
        estimate_status = resolve_estimate_status(
            (item.quantity, item.fii_source, item.kcalPerUnit) for item in items
        )

    return MealResponse(
        formula_version=meal_db.formula_version,
        dataset_version=meal_db.dataset_version,
        id=meal_db.id,
        created_at=as_utc(meal_db.created_at),
        meal_name=meal_db.meal_name,
        acute_score=meal_db.acute_score,
        insulin_load_total=insulin_load_total,
        kcal_total=meal_db.total_kcal or 0.0,
        carbs_total=meal_db.total_carb or 0.0,
        protein_total=meal_db.total_protein or 0.0,
        fat_total=meal_db.total_fat or 0.0,
        estimate_quality=estimate_quality,
        estimate_status=estimate_status,
        main_insulin_drivers=main_insulin_drivers if isinstance(main_insulin_drivers, list) else [],
        items=items,
    )


def map_modeled_item_to_schema(item: ModeledMealItem) -> MealItemResponse:
    return MealItemResponse(
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
        kcal_item=item.kcal_item,
        insulin_load=item.insulin_load,
        confidence=item.confidence,
        fii_source=standardize_fii_source(item.fii_source),
        why=item.why or build_source_explanation(standardize_fii_source(item.fii_source)),
    )


def resolve_main_insulin_drivers(item_rows: list[ModeledMealItem]) -> list[str]:
    ranked_names: list[str] = []
    for item in sorted(item_rows, key=lambda row: row.insulin_load or 0.0, reverse=True):
        normalized_name = item.name.strip()
        if not normalized_name or normalized_name in ranked_names:
            continue
        ranked_names.append(normalized_name)
        if len(ranked_names) == 3:
            break
    return ranked_names


def model_meal(meal: MealCreate | MealPreviewRequest) -> ModeledMeal:
    # Capture the process-loaded table identity before scoring, never at read/save time.
    formula_version = scoring_service.FORMULA_VERSION
    dataset_version = get_dataset_version()
    total_kcal = 0.0
    total_carb = 0.0
    total_protein = 0.0
    total_fat = 0.0
    total_sat_fat = 0.0
    insulin_load_total = 0.0
    item_rows: list[ModeledMealItem] = []
    item_sources: list[str] = []
    completeness_inputs: list[tuple[float, str, float | None]] = []

    for item in meal.items:
        fii_value = resolve_positive_provided_fii(item.fii_value, item.fii)
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
        completeness_inputs.append((item.quantity, fii_source, item.kcalPerUnit))

        item_rows.append(
            ModeledMealItem(
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

    return ModeledMeal(
        formula_version=formula_version,
        dataset_version=dataset_version,
        meal_name=meal.meal_name,
        items=item_rows,
        total_kcal=total_kcal,
        total_carb=total_carb,
        total_protein=total_protein,
        total_fat=total_fat,
        total_sat_fat=total_sat_fat,
        insulin_load_total=insulin_load_total,
        acute_score=acute_score,
        estimate_quality=resolve_estimate_quality(item_sources),
        estimate_status=resolve_estimate_status(completeness_inputs),
        main_insulin_drivers=main_insulin_drivers,
    )


def build_meal_db(
    modeled: ModeledMeal,
    meal_id: str,
    created_at: datetime,
    *,
    client_request_id: str | None = None,
    client_request_fingerprint: str | None = None,
) -> MealDB:
    item_rows = [
        MealItemDB(
            id=str(uuid.uuid4()),
            meal_id=meal_id,
            item_position=item_position,
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            kcal_per_unit=item.kcal_per_unit,
            carb_g=item.carb_g,
            protein_g=item.protein_g,
            fat_g=item.fat_g,
            gi=item.gi,
            sat_fat_g=item.sat_fat_g,
            fii=item.fii,
            kcal_item=item.kcal_item,
            insulin_load=item.insulin_load,
            confidence=item.confidence,
            fii_source=item.fii_source,
            why=item.why,
        )
        for item_position, item in enumerate(modeled.items)
    ]

    meal_db = MealDB(
        formula_version=modeled.formula_version,
        dataset_version=modeled.dataset_version,
        id=meal_id,
        created_at=created_at,
        meal_name=modeled.meal_name,
        total_kcal=modeled.total_kcal,
        total_carb=modeled.total_carb,
        total_protein=modeled.total_protein,
        total_fat=modeled.total_fat,
        total_sat_fat=modeled.total_sat_fat,
        insulin_load_total=modeled.insulin_load_total,
        acute_score=modeled.acute_score,
        chronic_score=None,
        estimate_quality=modeled.estimate_quality,
        main_insulin_drivers=json.dumps(modeled.main_insulin_drivers),
        client_request_id=client_request_id,
        client_request_fingerprint=client_request_fingerprint,
    )

    meal_db.items = item_rows
    return meal_db


@router.post("/meals/preview", response_model=MealPreviewResponse)
async def preview_meal(meal: MealPreviewRequest):
    modeled = model_meal(meal)
    return MealPreviewResponse(
        meal_name=modeled.meal_name,
        items=[map_modeled_item_to_schema(item) for item in modeled.items],
        insulin_load_total=modeled.insulin_load_total,
        acute_score=modeled.acute_score,
        kcal_total=modeled.total_kcal,
        carbs_total=modeled.total_carb,
        protein_total=modeled.total_protein,
        fat_total=modeled.total_fat,
        estimate_quality=modeled.estimate_quality,
        estimate_status=modeled.estimate_status,
        main_insulin_drivers=modeled.main_insulin_drivers,
        persisted=False,
    )


@router.post("/meals", response_model=MealResponse)
async def create_meal(meal: MealCreate, db: Session = Depends(get_db)):
    client_request_id = (
        str(meal.client_request_id) if meal.client_request_id is not None else None
    )
    client_request_fingerprint = None
    if client_request_id is not None:
        client_request_fingerprint = compute_client_request_fingerprint(meal.items)
        existing = (
            db.query(MealDB)
            .filter(MealDB.client_request_id == client_request_id)
            .one_or_none()
        )
        if existing is not None:
            if existing.client_request_fingerprint != client_request_fingerprint:
                raise HTTPException(
                    status_code=409,
                    detail="client_request_id was already used for different meal items",
                )
            return map_meal_db_to_schema(existing)

    meal_id = str(uuid.uuid4())
    created_at = coerce_created_at_to_naive_utc(meal.created_at)
    modeled = model_meal(meal)
    meal_db = build_meal_db(
        modeled,
        meal_id,
        created_at,
        client_request_id=client_request_id,
        client_request_fingerprint=client_request_fingerprint,
    )

    db.add(meal_db)
    try:
        db.commit()
    except IntegrityError:
        if client_request_id is None:
            raise
        db.rollback()
        existing = (
            db.query(MealDB)
            .filter(MealDB.client_request_id == client_request_id)
            .one_or_none()
        )
        if existing is None:
            raise
        if existing.client_request_fingerprint != client_request_fingerprint:
            raise HTTPException(
                status_code=409,
                detail="client_request_id was already used for different meal items",
            )
        return map_meal_db_to_schema(existing)
    db.refresh(meal_db)

    return map_meal_db_to_schema(meal_db, estimate_status=modeled.estimate_status)


@router.get("/meals", response_model=list[MealResponse])
async def list_meals(db: Session = Depends(get_db)):
    meals = db.query(MealDB).order_by(MealDB.created_at.desc()).all()
    return [map_meal_db_to_schema(meal_db) for meal_db in meals]


@router.delete("/meals/{meal_id}", status_code=204)
async def delete_meal(meal_id: str, db: Session = Depends(get_db)):
    meal_db = db.get(MealDB, meal_id)
    if meal_db is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    # MealDB.items carries cascade="all, delete-orphan", so the ORM delete
    # removes the meal's item rows in the same transaction.
    db.delete(meal_db)
    db.commit()
    return None
