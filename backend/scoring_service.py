from typing import Optional, Tuple

from food_normalizer import decompose_food_name_weighted
from fii_lookup import is_likely_mixed_meal, lookup_fii


DEFAULT_TDEE = 2000.0
K_EST = 0.6
# TODO: Calibrate this baseline against real meal history once representative data is available.
REFERENCE_MEAL_INSULIN_LOAD = 30.0


def compute_weighted_decomposed_insulin_load(food_name: str, kcal_item: float) -> tuple[float, int, float, float]:
    components = decompose_food_name_weighted(food_name)
    if not components:
        return 0.0, 0, 0.0, 0.0

    effective_components: list[tuple[str, float]] = []
    for component in components:
        component_food = str(component.get("food", ""))
        component_weight = float(component.get("weight", 0.0))
        if not component_food or component_weight <= 0.0:
            continue

        if component_weight > 0.0:
            effective_components.append((component_food, component_weight))

    if not effective_components:
        return 0.0, 0, 0.0, 0.0

    total_effective_weight = sum(weight for _, weight in effective_components)
    if total_effective_weight <= 0.0:
        return 0.0, 0, 0.0, 0.0

    insulin_load = 0.0
    matched_component_count = 0
    matched_weight_share = 0.0
    weighted_component_confidence_sum = 0.0
    for component_food, effective_weight in effective_components:
        component_fii, _component_source, component_confidence = lookup_fii(component_food)
        if component_fii is None:
            continue

        normalized_effective_weight = effective_weight / total_effective_weight
        component_kcal = kcal_item * normalized_effective_weight
        component_il = (float(component_fii) / 100.0) * component_kcal
        insulin_load += component_il
        matched_component_count += 1
        matched_weight_share += normalized_effective_weight
        weighted_component_confidence_sum += normalized_effective_weight * float(component_confidence or 0.5)

    if matched_weight_share > 0.0:
        component_confidence = weighted_component_confidence_sum / matched_weight_share
    else:
        component_confidence = 0.0

    return insulin_load, matched_component_count, matched_weight_share, component_confidence


def compute_kcal_item(quantity: float, kcal_per_unit: Optional[float]) -> float:
    if kcal_per_unit is None:
        return 0.0
    return max(0.0, float(quantity) * float(kcal_per_unit))


def resolve_fii_source(fii: Optional[int]) -> Optional[str]:
    if fii is None:
        return None
    return "user_confirmed"


def standardize_fii_source(fii_source: Optional[str]) -> str:
    if fii_source in {"exact_fii", "mapped_fii", "macro_fallback", "user_confirmed", "unknown"}:
        return fii_source
    if fii_source in {"provided"}:
        return "user_confirmed"
    if fii_source in {"fii_lookup", "weighted_decomposed_fii_lookup"}:
        return "mapped_fii"
    if fii_source in {"gi_carb_protein_fallback", "gi_carb_fallback", "macro_fallback"}:
        return "macro_fallback"
    return "unknown"


def build_source_explanation(fii_source: str) -> str:
    if fii_source == "exact_fii":
        return "Used a direct Food Insulin Index match and scaled it by eaten energy."
    if fii_source == "mapped_fii":
        return "Used a normalized or nearest measured Food Insulin Index match and scaled it by eaten energy."
    if fii_source == "user_confirmed":
        return "Used the provided Food Insulin Index value and scaled it by eaten energy."
    if fii_source == "macro_fallback":
        return "Used a lower-confidence fallback from available nutrition data because direct Food Insulin Index data was unavailable."
    return "Used an unknown-source estimate because direct Food Insulin Index data was unavailable."


def compute_insulin_load_item(
    *,
    food_name: Optional[str],
    quantity: float,
    kcal_per_unit: Optional[float],
    fii: Optional[int],
    gi: Optional[int],
    carb_g: Optional[float],
    protein_g: Optional[float],
    fat_g: Optional[float],
    sat_fat_g: Optional[float],
) -> Tuple[float, float, str]:
    kcal_item = compute_kcal_item(quantity, kcal_per_unit)
    fii_source = resolve_fii_source(fii)

    # Highest confidence path: explicit FII provided by client/extractor.
    if fii is not None:
        insulin_load = (float(fii) / 100.0) * kcal_item
        return insulin_load, 1.0, standardize_fii_source(fii_source)

    is_mixed_meal = bool(food_name and is_likely_mixed_meal(food_name))

    # Mixed meals: decomposition first, then direct lookup fallback if decomposition misses.
    if food_name and is_mixed_meal:
        insulin_load, matched_component_count, matched_share, component_confidence = compute_weighted_decomposed_insulin_load(
            food_name, kcal_item
        )
        if matched_component_count > 0:
            confidence = 0.2 + (0.6 * matched_share) + (0.2 * component_confidence)
            confidence = max(0.25, min(0.90, confidence))
            return insulin_load, confidence, "mapped_fii"

    # Next best path for single foods (or mixed meals where decomposition missed):
    # direct FII lookup from local table.
    if food_name:
        looked_up_fii, looked_up_source, looked_up_confidence = lookup_fii(food_name)
        if looked_up_fii is not None:
            insulin_load = (float(looked_up_fii) / 100.0) * kcal_item
            return insulin_load, float(looked_up_confidence or 0.5), standardize_fii_source(looked_up_source)

    # Last decomposition attempt for non-mixed foods that could still match phrase rules.
    if food_name:
        insulin_load, matched_component_count, matched_share, component_confidence = compute_weighted_decomposed_insulin_load(
            food_name, kcal_item
        )
        if matched_component_count > 0:
            confidence = 0.2 + (0.6 * matched_share) + (0.2 * component_confidence)
            confidence = max(0.25, min(0.90, confidence))
            return insulin_load, confidence, "mapped_fii"

    # Mid confidence fallback: GI + carbs (+ optional protein) estimate.
    if gi is not None and carb_g is not None:
        gl = float(carb_g) * float(gi) / 100.0
        protein_component = float(protein_g) * 0.5 if protein_g is not None else 0.0
        insulin_load_est = (gl * 1.0) + protein_component
        insulin_load = insulin_load_est * K_EST
        if protein_g is not None:
            return insulin_load, 0.8, "macro_fallback"
        return insulin_load, 0.7, "macro_fallback"

    # Lower confidence fallback: rough macro-based estimate.
    carb = float(carb_g or 0.0)
    protein = float(protein_g or 0.0)
    fat = float(fat_g or 0.0)
    sat_fat = float(sat_fat_g or 0.0)
    has_any_macro = any(value > 0.0 for value in (carb, protein, fat, sat_fat))
    if has_any_macro:
        unsat_fat = max(0.0, fat - sat_fat)
        insulin_load_est = (carb * 1.0) + (protein * 0.5) + (sat_fat * 0.1) + (unsat_fat * 0.05)
        insulin_load = insulin_load_est * K_EST
        return insulin_load, 0.5, "macro_fallback"

    return 0.0, 0.2, "unknown"


def compute_acute_score(
    insulin_load_total: float,
    tdee: Optional[float] = None,
) -> Tuple[float, float]:
    acute_score = (float(insulin_load_total) / REFERENCE_MEAL_INSULIN_LOAD) * 100.0
    confidence = 1.0 if tdee is not None else 0.8
    return acute_score, confidence


def run_self_check() -> None:
    # Example A: explicit FII path.
    il_fii, conf_fii, src_fii = compute_insulin_load_item(
        food_name="white bread",
        quantity=2.0,
        kcal_per_unit=100.0,
        fii=50,
        gi=None,
        carb_g=None,
        protein_g=None,
        fat_g=None,
        sat_fat_g=None,
    )
    assert round(il_fii, 6) == 100.0
    assert conf_fii == 1.0
    assert src_fii == "user_confirmed"

    # Example B: GI + carb + protein fallback path.
    il_fb, conf_fb, src_fb = compute_insulin_load_item(
        food_name="fallback-only-food",
        quantity=1.0,
        kcal_per_unit=250.0,
        fii=None,
        gi=60,
        carb_g=30.0,
        protein_g=20.0,
        fat_g=5.0,
        sat_fat_g=2.0,
    )
    # GL=18, protein term=10 => est=28, scaled by K_EST=0.6 => 16.8
    assert round(il_fb, 6) == 16.8
    assert conf_fb == 0.8
    assert src_fb == "macro_fallback"

    # Example C: local FII lookup path.
    il_lookup, conf_lookup, src_lookup = compute_insulin_load_item(
        food_name="plain yogurt",
        quantity=1.0,
        kcal_per_unit=150.0,
        fii=None,
        gi=None,
        carb_g=None,
        protein_g=None,
        fat_g=None,
        sat_fat_g=None,
    )
    assert round(il_lookup, 6) == 90.0
    assert conf_lookup == 0.7
    assert src_lookup in {"exact_fii", "mapped_fii"}

    # Example D: weighted mixed-meal decomposition path.
    il_decomp, conf_decomp, src_decomp = compute_insulin_load_item(
        food_name="biryani",
        quantity=1.0,
        kcal_per_unit=200.0,
        fii=None,
        gi=None,
        carb_g=None,
        protein_g=None,
        fat_g=None,
        sat_fat_g=None,
    )
    assert il_decomp > 0.0
    assert 0.25 <= conf_decomp <= 0.90
    assert src_decomp == "mapped_fii"

    def expected_weighted_decomposed_il(food_name: str, total_kcal: float) -> tuple[float, int]:
        components = decompose_food_name_weighted(food_name)
        effective_components: list[tuple[str, float]] = []
        for component in components:
            component_food = str(component.get("food", ""))
            component_weight = float(component.get("weight", 0.0))
            if not component_food or component_weight <= 0.0:
                continue
            effective_components.append((component_food, component_weight))

        effective_total = sum(weight for _, weight in effective_components)
        if effective_total <= 0.0:
            return 0.0, 0

        expected_il = 0.0
        expected_matched = 0
        for component_food, effective_weight in effective_components:
            component_fii, _source, _confidence = lookup_fii(component_food)
            if component_fii is None:
                continue
            normalized_weight = effective_weight / effective_total
            component_kcal = total_kcal * normalized_weight
            expected_il += (float(component_fii) / 100.0) * component_kcal
            expected_matched += 1
        return expected_il, expected_matched

    # Example E: weighted decomposition (chicken biryani profile).
    il_biryani_mix, matched_biryani, _share_biryani, _conf_biryani = compute_weighted_decomposed_insulin_load(
        "chicken biryani", 200.0
    )
    expected_biryani_il, expected_biryani_matched = expected_weighted_decomposed_il("chicken biryani", 200.0)
    assert matched_biryani == expected_biryani_matched
    assert round(il_biryani_mix, 6) == round(expected_biryani_il, 6)

    # Example F: weighted decomposition (steak and potatoes profile).
    il_steak_potato_mix, matched_steak_potato, _share_steak, _conf_steak = compute_weighted_decomposed_insulin_load(
        "steak and potatoes", 200.0
    )
    expected_steak_potato_il, expected_steak_potato_matched = expected_weighted_decomposed_il("steak and potatoes", 200.0)
    assert matched_steak_potato == expected_steak_potato_matched
    assert round(il_steak_potato_mix, 6) == round(expected_steak_potato_il, 6)

    # Example G: weighted decomposition (egg and toast profile).
    il_egg_toast_mix, matched_egg_toast, _share_egg, _conf_egg = compute_weighted_decomposed_insulin_load(
        "egg and toast", 200.0
    )
    expected_egg_toast_il, expected_egg_toast_matched = expected_weighted_decomposed_il("egg and toast", 200.0)
    assert matched_egg_toast == expected_egg_toast_matched
    assert round(il_egg_toast_mix, 6) == round(expected_egg_toast_il, 6)

    # Example H: source-precedence checks for mixed meals vs single foods.
    def assert_source(food: str, expected_source: str) -> None:
        _il, _conf, source = compute_insulin_load_item(
            food_name=food,
            quantity=1.0,
            kcal_per_unit=200.0,
            fii=None,
            gi=None,
            carb_g=None,
            protein_g=None,
            fat_g=None,
            sat_fat_g=None,
        )
        assert source == expected_source, f"{food!r}: expected {expected_source}, got {source}"

    assert_source("Rice", "exact_fii")
    assert_source("Greek yogurt", "exact_fii")
    assert_source("Steak and potatoes", "mapped_fii")
    assert_source("Egg and toast", "mapped_fii")
    assert_source("Chicken biryani", "mapped_fii")


if __name__ == "__main__":
    run_self_check()
    print("scoring_service self-check passed")
