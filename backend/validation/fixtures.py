from validation.schemas import ValidationCase, ValidationMeal, ValidationMealItem


def _meal_item(
    *,
    name: str,
    quantity: float,
    kcal_per_unit: float | None,
    fii: int | None = None,
    gi: int | None = None,
    carb_g: float | None = None,
    protein_g: float | None = None,
    fat_g: float | None = None,
    sat_fat_g: float | None = None,
) -> ValidationMealItem:
    return ValidationMealItem(
        name=name,
        quantity=quantity,
        kcal_per_unit=kcal_per_unit,
        fii=fii,
        gi=gi,
        carb_g=carb_g,
        protein_g=protein_g,
        fat_g=fat_g,
        sat_fat_g=sat_fat_g,
    )


def build_validation_cases() -> list[ValidationCase]:
    ranking_meals = [
        ValidationMeal(
            meal_id="ranking_salad",
            meal_name="salad",
            items=[
                _meal_item(
                    name="garden salad",
                    quantity=1.0,
                    kcal_per_unit=120.0,
                    gi=15,
                    carb_g=8.0,
                    protein_g=2.0,
                    fat_g=5.0,
                    sat_fat_g=1.0,
                )
            ],
        ),
        ValidationMeal(
            meal_id="ranking_dal_meal",
            meal_name="dal meal",
            items=[_meal_item(name="dal rice", quantity=1.0, kcal_per_unit=260.0)],
        ),
        ValidationMeal(
            meal_id="ranking_rice_chicken",
            meal_name="rice+chicken",
            items=[_meal_item(name="rice and chicken", quantity=1.0, kcal_per_unit=470.0)],
        ),
        ValidationMeal(
            meal_id="ranking_chicken_biryani",
            meal_name="chicken biryani",
            items=[_meal_item(name="chicken biryani", quantity=1.0, kcal_per_unit=520.0)],
        ),
        ValidationMeal(
            meal_id="ranking_cake_icecream",
            meal_name="cake+ice cream",
            items=[_meal_item(name="cake and ice cream", quantity=1.0, kcal_per_unit=450.0, fii=110)],
        ),
    ]

    source_quality_variants = [
        ValidationMeal(
            meal_id="source_exact_fii",
            meal_name="yogurt exact",
            items=[_meal_item(name="plain yogurt", quantity=1.0, kcal_per_unit=180.0)],
        ),
        ValidationMeal(
            meal_id="source_mapped_fii",
            meal_name="yogurt mapped",
            items=[_meal_item(name="greek yogurt bowl", quantity=1.0, kcal_per_unit=180.0)],
        ),
        ValidationMeal(
            meal_id="source_macro_fallback",
            meal_name="yogurt-like fallback",
            items=[
                _meal_item(
                    name="cultured dairy cup",
                    quantity=1.0,
                    kcal_per_unit=180.0,
                    gi=35,
                    carb_g=16.0,
                    protein_g=8.0,
                    fat_g=4.0,
                    sat_fat_g=2.0,
                )
            ],
        ),
    ]

    monotonicity_meals = [
        ValidationMeal(
            meal_id="mono_biryani_0_5x",
            meal_name="biryani 0.5x",
            items=[_meal_item(name="chicken biryani", quantity=0.5, kcal_per_unit=520.0)],
        ),
        ValidationMeal(
            meal_id="mono_biryani_1x",
            meal_name="biryani 1x",
            items=[_meal_item(name="chicken biryani", quantity=1.0, kcal_per_unit=520.0)],
        ),
        ValidationMeal(
            meal_id="mono_biryani_1_5x",
            meal_name="biryani 1.5x",
            items=[_meal_item(name="chicken biryani", quantity=1.5, kcal_per_unit=520.0)],
        ),
    ]

    low_load_day_meal = ValidationMeal(
        meal_id="chronic_low_day",
        meal_name="chronic low day meal",
        items=[
            _meal_item(
                name="garden salad",
                quantity=1.0,
                kcal_per_unit=120.0,
                gi=15,
                carb_g=8.0,
                protein_g=2.0,
                fat_g=5.0,
                sat_fat_g=1.0,
            )
        ],
    )
    high_load_day_meal = ValidationMeal(
        meal_id="chronic_high_day",
        meal_name="chronic high day meal",
        items=[_meal_item(name="cake and ice cream", quantity=1.0, kcal_per_unit=450.0, fii=110)],
    )

    uncertainty_mixed = ValidationMeal(
        meal_id="uncertainty_mixed_sources",
        meal_name="mixed source meal",
        items=[
            _meal_item(name="plain yogurt", quantity=1.0, kcal_per_unit=180.0),
            _meal_item(name="chicken biryani", quantity=1.0, kcal_per_unit=520.0),
            _meal_item(
                name="fallback carb bowl",
                quantity=1.0,
                kcal_per_unit=220.0,
                gi=55,
                carb_g=30.0,
                protein_g=10.0,
                fat_g=5.0,
                sat_fat_g=1.5,
            ),
            _meal_item(name="mystery mineral water", quantity=1.0, kcal_per_unit=0.0),
        ],
    )
    uncertainty_all_exact = ValidationMeal(
        meal_id="uncertainty_all_exact_control",
        meal_name="all exact control meal",
        items=[
            _meal_item(name="plain yogurt", quantity=1.0, kcal_per_unit=180.0),
            _meal_item(name="rice", quantity=1.0, kcal_per_unit=250.0),
        ],
    )

    return [
        ValidationCase(
            case_id="ranking_relative_01",
            kind="ranking",
            description="Relative ranking: salad < dal meal < rice+chicken < chicken biryani < cake+ice cream",
            payload={
                "meals": ranking_meals,
                "expected_order_ids": [meal.meal_id for meal in ranking_meals],
            },
        ),
        ValidationCase(
            case_id="source_quality_hierarchy_01",
            kind="source_quality",
            description="Yogurt-like variants should degrade from exact_fii -> mapped_fii -> macro_fallback",
            payload={
                "variants": source_quality_variants,
                "expected_sources": ["exact_fii", "mapped_fii", "macro_fallback"],
            },
        ),
        ValidationCase(
            case_id="monotonicity_biryani_portion_01",
            kind="monotonicity",
            description="Chicken biryani acute estimates should increase with 0.5x, 1x, 1.5x portions",
            payload={"meals": monotonicity_meals},
        ),
        ValidationCase(
            case_id="chronic_low_then_high_01",
            kind="chronic_trend",
            description="7 low-load days then 7 high-load days should show gradual rise in rolling chronic metrics",
            payload={
                "low_day_meal": low_load_day_meal,
                "high_day_meal": high_load_day_meal,
                "low_days": 7,
                "high_days": 7,
            },
        ),
        ValidationCase(
            case_id="uncertainty_degradation_01",
            kind="uncertainty",
            description="Mixed-source meal should have lower estimate quality and confidence than all-exact control",
            payload={"mixed_meal": uncertainty_mixed, "control_meal": uncertainty_all_exact},
        ),
    ]
