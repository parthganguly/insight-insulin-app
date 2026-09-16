"""Server-owned experimental calculation and atomic attached evidence storage."""

import hashlib
import uuid
from dataclasses import asdict
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from api import meals as legacy
from db_models import MealDB
from models import MealCreate, MealItemCreate
from reference_catalog import CatalogError, ReferenceCatalog, canonical_bytes
from experimental_reference.contract import (
    CATALOG_VERSION, Eligibility, ItemResult, Reason, ReferencePreview,
    ReferenceResult, ReferenceSave, SourceEvidence, deserialize_assessment,
    finite_number, serialize_assessment,
)

CATALOG_PATH = Path(__file__).resolve().parents[1] / "reference_data/r2/candidate_catalog.json"
FINGERPRINT_DOMAIN = "reference_meal_request_v1"


def load_pinned_catalog() -> ReferenceCatalog:
    """Only server-configured reviewed bytes; never called at module import/replay."""
    catalog = ReferenceCatalog.load(CATALOG_PATH)
    if catalog.version != CATALOG_VERSION:
        raise CatalogError("Unreviewed catalog identity")
    return catalog


def reason(code, detail):
    return Reason(code=code, detail=detail)


def source_evidence(record, catalog):
    raw = record["raw"]
    return SourceEvidence(
        source_record_id=record["source_record_id"], source_food_wording=record["original_food_wording"],
        fii_mean=record["fii_mean"], uncertainty_type="SEM", uncertainty_value=record["fii_uncertainty"]["value"],
        uncertainty_meaning="published_food_mean_not_personal_interval", reference_scale=record["reference_scale"],
        actual_test_energy_kJ=record["actual_test_energy_kJ"], composition_basis_kJ=record["composition_basis_kJ"],
        population=catalog.content["studies"][record["study_id"]]["population"],
        record_sample_size_status=record["record_sample_size_status"], issue_ids=record["issue_ids"],
        eligibility=tuple(Eligibility(use=use, **dict(value)) for use, value in record["eligibility"].items()),
        **{field: raw[field] for field in (
            "source_study", "source_doi", "source_table", "source_printed_page", "source_row",
            "source_footnote", "test_year",
        )},
    )


def evaluate(draft: ReferencePreview) -> ReferenceResult:
    try:
        catalog = load_pinned_catalog()
    except (OSError, ValueError) as exc:
        raise HTTPException(503, detail={"code": "catalog_unavailable"}) from exc
    if draft.expected_catalog_version != catalog.version:
        raise HTTPException(409, detail={"code": "stale_catalog_version", "catalog_version": catalog.version})
    items = []
    try:
        for position, item in enumerate(draft.items):
            energy = finite_number(item.quantity * item.kcal_per_unit) if item.kcal_per_unit is not None else None
            issues = []
            source = None
            if item.source_record_id is None:
                issues.append(reason("no_reference_selected", "No explicit source record selected"))
            else:
                selected = catalog.select(item.source_record_id, expected_catalog_version=catalog.version)
                record = catalog.records.get(item.source_record_id)
                if record is not None:
                    source = source_evidence(record, catalog)
                if selected.status != "selected":
                    issues.extend(reason(selected.status.value, detail) for detail in selected.reasons)
            if item.quantity == 0:
                status, load = "not_consumed", 0.0
                issues.append(reason("zero_quantity", "Explicitly not consumed; no physiological inference"))
            else:
                if energy is None:
                    issues.append(reason("missing_energy", "Reviewed per-unit energy is missing"))
                elif energy == 0:
                    issues.append(reason("zero_energy", "Positive quantity requires positive eaten energy"))
                status = "unavailable" if issues else "calculated"
                load = None if issues else finite_number((source.fii_mean / 100) * energy)
            items.append(ItemResult(
                position=position, inputs=item,
                selection_label="explicit_source_reference_not_verified_food_equivalence",
                status=status, eaten_kcal=energy, reference_load=load, source=source, reasons=tuple(issues),
            ))
        consumed = [item for item in items if item.status != "not_consumed"]
        complete = bool(consumed) and all(item.status == "calculated" for item in consumed)
        total = finite_number(sum(item.reference_load for item in consumed)) if complete else None
        reasons = (() if complete else (reason(
            "incomplete_consumed_items" if consumed else "no_consumed_items",
            "See ordered item reasons" if consumed else "No positive-quantity items",
        ),))
        return ReferenceResult(
            catalog_version=catalog.version, catalog_schema_version=catalog.content["schema_version"],
            eligibility_policy_version=catalog.content["policy"]["eligibility_version"],
            selection_policy_version=catalog.content["policy"]["selection_version"],
            status="experimental" if complete else "unavailable", reference_load_total=total,
            items=tuple(items), reasons=reasons,
        )
    except (ValueError, OverflowError) as exc:
        raise HTTPException(422, detail={"code": "unsupported_numeric_result"}) from exc


def fingerprint(draft: ReferenceSave) -> str:
    # Title/time remain non-material, like legacy: accepted first values win.
    material = {"domain": FINGERPRINT_DOMAIN, "expected_catalog_version": draft.expected_catalog_version,
                "items": [item.model_dump(mode="json") for item in draft.items]}
    return hashlib.sha256(canonical_bytes(material)).hexdigest()


def compatibility_request(draft: ReferenceSave) -> MealCreate:
    return MealCreate(
        meal_name=draft.meal_name, created_at=draft.created_at,
        items=[MealItemCreate(
            name=item.name, quantity=item.quantity, unit=item.unit, kcalPerUnit=item.kcal_per_unit,
            carb_g=item.carb_g, protein_g=item.protein_g, fat_g=item.fat_g,
            satFat_g=item.sat_fat_g, gi=item.gi,
        ) for item in draft.items],
    )


def stored_response(row: MealDB) -> dict:
    state, result = "not_evaluated", None
    reasons = []
    if row.reference_result_json is not None:
        try:
            result = deserialize_assessment(row.reference_result_json).model_dump(mode="json")
            state = "evaluated"
        except (ValueError, TypeError, OverflowError, RecursionError):
            state = "evidence_error"
            reasons = [{"code": "invalid_stored_assessment", "detail": "Stored evidence is corrupt or unsupported"}]
    return {"legacy_compatibility": legacy.map_meal_db_to_schema(row).model_dump(mode="json"),
            "assessment_state": state, "assessment": result, "reasons": reasons}


def existing_request(db, key):
    return db.query(MealDB).filter(MealDB.client_request_id == key).one_or_none()


def replay(row, request_fingerprint):
    if row.client_request_fingerprint != request_fingerprint:
        raise HTTPException(409, detail={"code": "request_id_conflict"})
    return stored_response(row)


def save(draft: ReferenceSave, db: Session) -> dict:
    key, request_fingerprint = str(draft.client_request_id), fingerprint(draft)
    existing = existing_request(db, key)
    if existing is not None:
        return replay(existing, request_fingerprint)
    assessment = evaluate(draft)
    try:
        modeled = legacy.model_meal(compatibility_request(draft))
        # Legacy math is intentionally unchanged; reject overflow before any write.
        canonical_bytes(asdict(modeled))
    except (ValueError, OverflowError) as exc:
        raise HTTPException(422, detail={"code": "unsupported_compatibility_result"}) from exc
    row = legacy.build_meal_db(
        modeled, str(uuid.uuid4()), legacy.coerce_created_at_to_naive_utc(draft.created_at),
        client_request_id=key, client_request_fingerprint=request_fingerprint,
    )
    row.reference_result_json = serialize_assessment(assessment)
    try:
        db.add(row)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        existing = existing_request(db, key)
        if existing is not None:
            return replay(existing, request_fingerprint)
        raise HTTPException(500, detail={"code": "save_failed"}) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(500, detail={"code": "save_failed"}) from exc
    db.refresh(row)
    return stored_response(row)
