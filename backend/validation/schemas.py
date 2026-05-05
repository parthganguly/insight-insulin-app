from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional


ValidationKind = Literal["ranking", "source_quality", "monotonicity", "chronic_trend", "uncertainty"]


@dataclass(frozen=True)
class ValidationMealItem:
    name: str
    quantity: float
    kcal_per_unit: Optional[float]
    fii: Optional[int] = None
    gi: Optional[int] = None
    carb_g: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    sat_fat_g: Optional[float] = None


@dataclass(frozen=True)
class ValidationMeal:
    meal_id: str
    meal_name: str
    items: list[ValidationMealItem]


@dataclass(frozen=True)
class ValidationCase:
    case_id: str
    kind: ValidationKind
    description: str
    payload: dict


@dataclass
class ValidationResult:
    test_id: str
    pass_fail: bool
    kind: ValidationKind
    actual_scores: dict
    source_labels: list[str]
    estimate_quality: str
    failure_reason: Optional[str] = None
    details: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "test_id": self.test_id,
            "kind": self.kind,
            "pass": self.pass_fail,
            "actual_scores": self.actual_scores,
            "source_labels": self.source_labels,
            "estimate_quality": self.estimate_quality,
            "failure_reason": self.failure_reason,
            "details": self.details,
        }
