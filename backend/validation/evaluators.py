from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from chronic_service import build_chronic_series_from_daily_maps
from estimate_quality import resolve_estimate_quality
from scoring_service import compute_acute_score, compute_insulin_load_item
from validation.schemas import ValidationCase, ValidationMeal, ValidationResult


@dataclass
class MealComputation:
    meal_id: str
    meal_name: str
    insulin_load_total: float
    acute_score: float
    estimate_quality: str
    source_labels: list[str]
    item_confidences: list[float]
    total_kcal: float

    @property
    def mean_confidence(self) -> float:
        if not self.item_confidences:
            return 0.0
        return sum(self.item_confidences) / len(self.item_confidences)


QUALITY_ORDER = {"unknown": 0, "low": 1, "medium": 2, "high": 3}


def compute_meal(meal: ValidationMeal) -> MealComputation:
    insulin_load_total = 0.0
    source_labels: list[str] = []
    item_confidences: list[float] = []
    total_kcal = 0.0

    for item in meal.items:
        insulin_load_item, confidence, source_label = compute_insulin_load_item(
            food_name=item.name,
            quantity=item.quantity,
            kcal_per_unit=item.kcal_per_unit,
            fii=item.fii,
            gi=item.gi,
            carb_g=item.carb_g,
            protein_g=item.protein_g,
            fat_g=item.fat_g,
            sat_fat_g=item.sat_fat_g,
        )
        insulin_load_total += insulin_load_item
        source_labels.append(source_label)
        item_confidences.append(confidence)
        total_kcal += float(item.kcal_per_unit or 0.0) * float(item.quantity)

    acute_score, _acute_confidence = compute_acute_score(insulin_load_total=insulin_load_total, tdee=None)
    estimate_quality = resolve_estimate_quality(source_labels)
    return MealComputation(
        meal_id=meal.meal_id,
        meal_name=meal.meal_name,
        insulin_load_total=insulin_load_total,
        acute_score=acute_score,
        estimate_quality=estimate_quality,
        source_labels=source_labels,
        item_confidences=item_confidences,
        total_kcal=total_kcal,
    )


def evaluate_case(case: ValidationCase) -> ValidationResult:
    if case.kind == "ranking":
        return _evaluate_ranking(case)
    if case.kind == "source_quality":
        return _evaluate_source_quality(case)
    if case.kind == "monotonicity":
        return _evaluate_monotonicity(case)
    if case.kind == "chronic_trend":
        return _evaluate_chronic_trend(case)
    if case.kind == "uncertainty":
        return _evaluate_uncertainty(case)
    return ValidationResult(
        test_id=case.case_id,
        kind=case.kind,
        pass_fail=False,
        actual_scores={},
        source_labels=[],
        estimate_quality="unknown",
        failure_reason=f"Unsupported case kind: {case.kind}",
    )


def _evaluate_ranking(case: ValidationCase) -> ValidationResult:
    meals: list[ValidationMeal] = case.payload["meals"]
    expected_order_ids: list[str] = case.payload["expected_order_ids"]
    outcomes = [compute_meal(meal) for meal in meals]
    actual_order_ids = [row.meal_id for row in sorted(outcomes, key=lambda row: row.acute_score)]

    passed = actual_order_ids == expected_order_ids
    failure_reason = None
    if not passed:
        failure_reason = f"Expected order {expected_order_ids}, got {actual_order_ids}"

    return ValidationResult(
        test_id=case.case_id,
        kind=case.kind,
        pass_fail=passed,
        actual_scores={
            row.meal_id: {
                "meal_name": row.meal_name,
                "insulin_load_total": round(row.insulin_load_total, 4),
                "acute_score": round(row.acute_score, 4),
            }
            for row in outcomes
        },
        source_labels=[source for row in outcomes for source in row.source_labels],
        estimate_quality="composite",
        failure_reason=failure_reason,
        details={"actual_order_ids": actual_order_ids, "expected_order_ids": expected_order_ids},
    )


def _evaluate_source_quality(case: ValidationCase) -> ValidationResult:
    variants: list[ValidationMeal] = case.payload["variants"]
    expected_sources: list[str] = case.payload["expected_sources"]
    outcomes = [compute_meal(meal) for meal in variants]

    actual_sources = [row.source_labels[0] if row.source_labels else "unknown" for row in outcomes]
    actual_qualities = [row.estimate_quality for row in outcomes]

    expected_qualities = ["high", "medium", "low"]
    source_ok = actual_sources == expected_sources
    quality_ok = actual_qualities == expected_qualities

    passed = source_ok and quality_ok
    failure_reasons: list[str] = []
    if not source_ok:
        failure_reasons.append(f"sources mismatch: expected {expected_sources}, got {actual_sources}")
    if not quality_ok:
        failure_reasons.append(f"quality mismatch: expected {expected_qualities}, got {actual_qualities}")

    return ValidationResult(
        test_id=case.case_id,
        kind=case.kind,
        pass_fail=passed,
        actual_scores={
            row.meal_id: {
                "acute_score": round(row.acute_score, 4),
                "mean_confidence": round(row.mean_confidence, 4),
                "estimate_quality": row.estimate_quality,
            }
            for row in outcomes
        },
        source_labels=actual_sources,
        estimate_quality="composite",
        failure_reason="; ".join(failure_reasons) if failure_reasons else None,
        details={
            "expected_sources": expected_sources,
            "actual_sources": actual_sources,
            "expected_qualities": expected_qualities,
            "actual_qualities": actual_qualities,
        },
    )


def _evaluate_monotonicity(case: ValidationCase) -> ValidationResult:
    meals: list[ValidationMeal] = case.payload["meals"]
    outcomes = [compute_meal(meal) for meal in meals]
    acute_scores = [row.acute_score for row in outcomes]
    insulin_loads = [row.insulin_load_total for row in outcomes]

    is_acute_increasing = acute_scores[0] < acute_scores[1] < acute_scores[2]
    is_load_increasing = insulin_loads[0] < insulin_loads[1] < insulin_loads[2]
    passed = is_acute_increasing and is_load_increasing

    failure_reason = None
    if not passed:
        failure_reason = (
            f"Expected strict increase, got acute={acute_scores} and insulin_load={insulin_loads}"
        )

    return ValidationResult(
        test_id=case.case_id,
        kind=case.kind,
        pass_fail=passed,
        actual_scores={
            row.meal_id: {
                "acute_score": round(row.acute_score, 4),
                "insulin_load_total": round(row.insulin_load_total, 4),
            }
            for row in outcomes
        },
        source_labels=[source for row in outcomes for source in row.source_labels],
        estimate_quality="composite",
        failure_reason=failure_reason,
        details={"acute_scores": acute_scores, "insulin_loads": insulin_loads},
    )


def _evaluate_chronic_trend(case: ValidationCase) -> ValidationResult:
    low_day_meal: ValidationMeal = case.payload["low_day_meal"]
    high_day_meal: ValidationMeal = case.payload["high_day_meal"]
    low_days = int(case.payload["low_days"])
    high_days = int(case.payload["high_days"])

    low_outcome = compute_meal(low_day_meal)
    high_outcome = compute_meal(high_day_meal)

    start_date = date(2026, 1, 1)
    total_days = low_days + high_days
    daily_totals: dict[str, float] = {}
    daily_energy: dict[str, float] = {}

    for offset in range(total_days):
        day_key = (start_date + timedelta(days=offset)).isoformat()
        if offset < low_days:
            daily_totals[day_key] = low_outcome.insulin_load_total
            daily_energy[day_key] = low_outcome.total_kcal
        else:
            daily_totals[day_key] = high_outcome.insulin_load_total
            daily_energy[day_key] = high_outcome.total_kcal

    chronic_series = build_chronic_series_from_daily_maps(daily_totals=daily_totals, daily_energy=daily_energy)
    rolling_7d_dil = [float(day["rolling_7d_dil"]) for day in chronic_series]

    transition_index = low_days - 1
    transition_next = transition_index + 1
    is_rising_after_shift = rolling_7d_dil[transition_next] > rolling_7d_dil[transition_index]
    high_phase_values = rolling_7d_dil[transition_next:]
    is_gradual_non_decreasing = all(
        high_phase_values[idx] >= high_phase_values[idx - 1] for idx in range(1, len(high_phase_values))
    )
    is_end_higher = rolling_7d_dil[-1] > rolling_7d_dil[transition_index]

    passed = is_rising_after_shift and is_gradual_non_decreasing and is_end_higher
    failure_reasons: list[str] = []
    if not is_rising_after_shift:
        failure_reasons.append("rolling_7d_dil did not rise immediately after low->high shift")
    if not is_gradual_non_decreasing:
        failure_reasons.append("rolling_7d_dil is not gradual/non-decreasing during high-load phase")
    if not is_end_higher:
        failure_reasons.append("final rolling_7d_dil is not above low-load plateau")

    return ValidationResult(
        test_id=case.case_id,
        kind=case.kind,
        pass_fail=passed,
        actual_scores={
            "low_day_insulin_load_total": round(low_outcome.insulin_load_total, 4),
            "high_day_insulin_load_total": round(high_outcome.insulin_load_total, 4),
            "rolling_7d_dil": [round(value, 4) for value in rolling_7d_dil],
        },
        source_labels=[*low_outcome.source_labels, *high_outcome.source_labels],
        estimate_quality="composite",
        failure_reason="; ".join(failure_reasons) if failure_reasons else None,
        details={
            "transition_index": transition_index,
            "transition_value": rolling_7d_dil[transition_index],
            "first_high_value": rolling_7d_dil[transition_next],
            "last_value": rolling_7d_dil[-1],
        },
    )


def _evaluate_uncertainty(case: ValidationCase) -> ValidationResult:
    mixed_meal: ValidationMeal = case.payload["mixed_meal"]
    control_meal: ValidationMeal = case.payload["control_meal"]
    mixed_outcome = compute_meal(mixed_meal)
    control_outcome = compute_meal(control_meal)

    required_sources = {"exact_fii", "mapped_fii", "macro_fallback", "unknown"}
    mixed_source_set = set(mixed_outcome.source_labels)
    contains_required_sources = required_sources.issubset(mixed_source_set)
    quality_degrades = QUALITY_ORDER[mixed_outcome.estimate_quality] < QUALITY_ORDER[control_outcome.estimate_quality]
    confidence_degrades = mixed_outcome.mean_confidence < control_outcome.mean_confidence

    passed = contains_required_sources and quality_degrades and confidence_degrades
    failure_reasons: list[str] = []
    if not contains_required_sources:
        failure_reasons.append(
            f"mixed meal sources missing required set: expected {sorted(required_sources)}, got {sorted(mixed_source_set)}"
        )
    if not quality_degrades:
        failure_reasons.append(
            f"estimate quality did not degrade: mixed={mixed_outcome.estimate_quality}, control={control_outcome.estimate_quality}"
        )
    if not confidence_degrades:
        failure_reasons.append(
            f"confidence did not degrade: mixed={mixed_outcome.mean_confidence:.4f}, control={control_outcome.mean_confidence:.4f}"
        )

    return ValidationResult(
        test_id=case.case_id,
        kind=case.kind,
        pass_fail=passed,
        actual_scores={
            "mixed_meal": {
                "acute_score": round(mixed_outcome.acute_score, 4),
                "mean_confidence": round(mixed_outcome.mean_confidence, 4),
            },
            "control_meal": {
                "acute_score": round(control_outcome.acute_score, 4),
                "mean_confidence": round(control_outcome.mean_confidence, 4),
            },
        },
        source_labels=mixed_outcome.source_labels,
        estimate_quality=mixed_outcome.estimate_quality,
        failure_reason="; ".join(failure_reasons) if failure_reasons else None,
        details={
            "control_estimate_quality": control_outcome.estimate_quality,
            "mixed_sources": mixed_outcome.source_labels,
            "control_sources": control_outcome.source_labels,
        },
    )
