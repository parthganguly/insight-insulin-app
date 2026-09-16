"""Strict input and immutable, independently versioned reference evidence."""

import hashlib
import math
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator

from models import Unit
from reference_catalog import canonical_bytes, parse_json

CATALOG_VERSION = "r2_sha256_6db5357ae368981b1e2781a2a2402d60d63850e7b59c63e757b654a39bdc51d9"
FORMULA_VERSION = "experimental_reference_load_v1"
RESULT_VERSION = "reference_meal_result_v1"


def finite_number(value):
    if type(value) not in (int, float):
        raise ValueError("Expected a finite nonnegative number")
    try:
        number = float(value)
    except OverflowError as exc:
        raise ValueError("Number exceeds supported range") from exc
    if not math.isfinite(number) or number < 0:
        raise ValueError("Expected a finite nonnegative number")
    return number


Number = Annotated[float, BeforeValidator(finite_number)]
SourceID = Annotated[str, Field(pattern=r"^(BAO2011-|BELL2016-S1-)\d{3}$")]
CatalogID = Annotated[str, Field(pattern=r"^r2_sha256_[0-9a-f]{64}$")]


class FrozenModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, validate_default=True)


class ReferenceItem(FrozenModel):
    name: str = Field(min_length=1, max_length=255)
    quantity: Number
    unit: Unit
    kcal_per_unit: Number | None = None
    kcal_per_unit_unit: Unit | None = None
    nutrition_origin: Literal["manual", "label", "ai_reviewed", "other"] = "manual"
    carb_g: Number | None = None
    protein_g: Number | None = None
    fat_g: Number | None = None
    sat_fat_g: Number | None = None
    # Storage capacity, not a scientific upper bound on GI.
    gi: Annotated[int, Field(strict=True, ge=0, le=2**63 - 1)] | None = None
    source_record_id: SourceID | None = None

    @field_validator("gi", mode="before")
    @classmethod
    def validate_gi(cls, value):
        if value is not None:
            if type(value) is not int:
                raise ValueError("GI must be an integer")
            finite_number(value)
        return value

    @model_validator(mode="after")
    def validate_energy(self):
        if self.kcal_per_unit is not None and self.kcal_per_unit_unit != self.unit:
            raise ValueError("kcal_per_unit_unit must match the quantity unit")
        if self.kcal_per_unit_unit is not None and self.kcal_per_unit_unit != self.unit:
            raise ValueError("Mismatched energy unit")
        for field in ("kcal_per_unit", "carb_g", "protein_g", "fat_g", "sat_fat_g", "gi"):
            value = getattr(self, field)
            if value is not None:
                finite_number(value * self.quantity)
        return self


class ReferencePreview(FrozenModel):
    meal_name: str = Field(min_length=1, max_length=255)
    expected_catalog_version: CatalogID
    items: tuple[ReferenceItem, ...]


class ReferenceSave(ReferencePreview):
    created_at: datetime | None = None
    client_request_id: UUID


class Reason(FrozenModel):
    code: str
    detail: str


class Eligibility(FrozenModel):
    use: str
    status: Literal["candidate", "reference_only", "requires_review"]
    reasons: tuple[str, ...]


class SourceEvidence(FrozenModel):
    source_record_id: SourceID
    source_food_wording: str
    fii_mean: Number | None
    uncertainty_type: Literal["SEM"]
    uncertainty_value: Number | None
    uncertainty_meaning: Literal["published_food_mean_not_personal_interval"]
    reference_scale: Literal["glucose=100"]
    actual_test_energy_kJ: Number
    composition_basis_kJ: Number
    source_study: str
    source_doi: str
    source_table: str
    source_printed_page: int | str
    source_row: Annotated[int, Field(strict=True, ge=1)]
    source_footnote: str
    test_year: Number | None
    population: str
    record_sample_size: None = None
    record_sample_size_status: str
    issue_ids: tuple[str, ...]
    eligibility: tuple[Eligibility, ...]


class ItemResult(FrozenModel):
    position: Annotated[int, Field(strict=True, ge=0)]
    inputs: ReferenceItem
    selection_label: Literal["explicit_source_reference_not_verified_food_equivalence"]
    status: Literal["calculated", "unavailable", "not_consumed"]
    eaten_kcal: Number | None
    reference_load: Number | None
    source: SourceEvidence | None
    reasons: tuple[Reason, ...]

    @model_validator(mode="after")
    def validate_result(self):
        expected_energy = (self.inputs.quantity * self.inputs.kcal_per_unit
                           if self.inputs.kcal_per_unit is not None else None)
        if self.eaten_kcal != expected_energy:
            raise ValueError("Consumed energy differs from inputs")
        if self.source is not None and self.source.source_record_id != self.inputs.source_record_id:
            raise ValueError("Source identity differs from selection")
        if self.inputs.quantity == 0:
            if self.status != "not_consumed" or self.reference_load != 0:
                raise ValueError("Invalid nonconsumption result")
        elif self.status == "calculated":
            source = self.source
            if (source is None or source.fii_mean is None or not self.eaten_kcal
                    or source.actual_test_energy_kJ != 1000 or self.reasons
                    or not any(e.use == "experimental_fii_input" and e.status == "candidate"
                               for e in source.eligibility)):
                raise ValueError("Missing eligible source/energy")
            expected = finite_number((source.fii_mean / 100) * self.eaten_kcal)
            if self.reference_load != expected:
                raise ValueError("Contribution differs from evidence")
        elif self.status != "unavailable" or self.reference_load is not None or not self.reasons:
            raise ValueError("Invalid unavailable contribution")
        return self


class ReferenceResult(FrozenModel):
    result_schema_version: Literal["reference_meal_result_v1"] = RESULT_VERSION
    formula_version: Literal["experimental_reference_load_v1"] = FORMULA_VERSION
    catalog_version: CatalogID
    catalog_schema_version: Literal["insight_reference_catalog_v1"]
    eligibility_policy_version: Literal["experimental_fii_input_v1"]
    selection_policy_version: Literal["explicit_source_id_v1"]
    status: Literal["experimental", "unavailable"]
    reference_load_total: Number | None
    items: tuple[ItemResult, ...]
    reasons: tuple[Reason, ...]

    @model_validator(mode="after")
    def validate_total(self):
        if [row.position for row in self.items] != list(range(len(self.items))):
            raise ValueError("Invalid item ordering")
        consumed = [row for row in self.items if row.status != "not_consumed"]
        complete = bool(consumed) and all(row.status == "calculated" for row in consumed)
        if complete:
            total = finite_number(sum(row.reference_load for row in consumed))
            if self.status != "experimental" or self.reference_load_total != total or self.reasons:
                raise ValueError("Invalid complete meal total")
        elif self.status != "unavailable" or self.reference_load_total is not None or not self.reasons:
            raise ValueError("Invalid unavailable meal total")
        return self


class StoredAssessment(FrozenModel):
    envelope_version: Literal["reference_assessment_envelope_v1"] = "reference_assessment_envelope_v1"
    sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
    assessment: ReferenceResult

    @model_validator(mode="after")
    def validate_hash(self):
        if self.sha256 != hashlib.sha256(canonical_bytes(self.assessment.model_dump(mode="json"))).hexdigest():
            raise ValueError("Assessment content hash mismatch")
        return self


def serialize_assessment(result: ReferenceResult) -> str:
    payload = result.model_dump(mode="json")
    envelope = StoredAssessment(sha256=hashlib.sha256(canonical_bytes(payload)).hexdigest(), assessment=result)
    return canonical_bytes(envelope.model_dump(mode="json")).decode("utf-8")


def deserialize_assessment(stored: str) -> ReferenceResult:
    if not isinstance(stored, str):
        raise ValueError("Stored assessment must be text")
    envelope = parse_json(stored.encode("utf-8"))
    if not isinstance(envelope, dict) or envelope.get("envelope_version") != "reference_assessment_envelope_v1":
        raise ValueError("Missing or unsupported persisted envelope identity")
    payload = envelope.get("assessment")
    if (not isinstance(payload, dict) or payload.get("result_schema_version") != RESULT_VERSION
            or payload.get("formula_version") != FORMULA_VERSION):
        raise ValueError("Missing or unsupported persisted result identity")
    # Check actual parsed evidence before model defaults/coercion can change it.
    if envelope.get("sha256") != hashlib.sha256(canonical_bytes(payload)).hexdigest():
        raise ValueError("Assessment content hash mismatch")
    return StoredAssessment.model_validate(envelope).assessment
