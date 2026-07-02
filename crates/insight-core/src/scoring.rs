use std::cmp::Ordering;

use serde::{Deserialize, Serialize};

use crate::direct_fii::REFERENCE_MEAL_INSULIN_LOAD;
use crate::domain::AcuteScore;
use crate::unified_fii::{
    calculate_unified_fii_meal_totals, UnifiedFiiItem, UnifiedFiiItemEstimate,
    UnifiedFiiMealEstimate, UnifiedFiiScoringError,
};

const MAX_MAIN_INSULIN_DRIVERS: usize = 3;

/// Backend-parity product meal result: the complete unified meal estimate plus
/// the unrounded acute score and ranked main insulin drivers.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScoredMeal {
    unified_meal_estimate: UnifiedFiiMealEstimate,
    acute_score: AcuteScore,
    main_insulin_drivers: Vec<String>,
}

impl ScoredMeal {
    pub const fn unified_meal_estimate(&self) -> &UnifiedFiiMealEstimate {
        &self.unified_meal_estimate
    }

    pub const fn acute_score(&self) -> AcuteScore {
        self.acute_score
    }

    pub fn main_insulin_drivers(&self) -> &[String] {
        &self.main_insulin_drivers
    }
}

/// Scores a meal with backend parity: unified per-item resolution, the fixed
/// reference-meal acute score, and top-three insulin-load driver names.
/// An empty meal returns `Ok(None)` like the unified meal calculation.
pub fn score_meal(items: &[UnifiedFiiItem]) -> Result<Option<ScoredMeal>, UnifiedFiiScoringError> {
    let Some(unified_meal_estimate) = calculate_unified_fii_meal_totals(items)? else {
        return Ok(None);
    };

    let acute_score = AcuteScore::new(
        (unified_meal_estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD)
            * 100.0,
    )?;
    let main_insulin_drivers =
        resolve_main_insulin_drivers(items, unified_meal_estimate.item_estimates());

    Ok(Some(ScoredMeal {
        unified_meal_estimate,
        acute_score,
        main_insulin_drivers,
    }))
}

/// Ranks original input item names by resolved per-item insulin load only,
/// reproducing the backend's stable descending sort, trim, whitespace-only
/// skip, exact case-sensitive dedupe, and top-three cutoff.
fn resolve_main_insulin_drivers(
    items: &[UnifiedFiiItem],
    item_estimates: &[UnifiedFiiItemEstimate],
) -> Vec<String> {
    debug_assert_eq!(items.len(), item_estimates.len());

    let mut ranked_items: Vec<(&str, f64)> = items
        .iter()
        .zip(item_estimates)
        .map(|(item, estimate)| (item.food_name(), estimate.item_insulin_load().value()))
        .collect();
    // Stable sort with equal loads treated as ties preserves the backend's
    // Python `sorted(..., reverse=True)` input ordering for equal loads.
    ranked_items.sort_by(|left, right| right.1.partial_cmp(&left.1).unwrap_or(Ordering::Equal));

    let mut ranked_names: Vec<String> = Vec::new();
    for (name, _insulin_load) in ranked_items {
        let normalized_name = name.trim();
        if normalized_name.is_empty() || ranked_names.iter().any(|ranked| ranked == normalized_name)
        {
            continue;
        }
        ranked_names.push(normalized_name.to_string());
        if ranked_names.len() == MAX_MAIN_INSULIN_DRIVERS {
            break;
        }
    }
    ranked_names
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        EstimateQuality, EstimateSource, FiiValue, FormulaVersion, Grams, Kcal,
        ValueValidationError,
    };
    use crate::macro_fallback::MacroFallbackNutrients;

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    fn provided_item(name: &str, kcal_per_unit: f64, quantity: f64, fii: f64) -> UnifiedFiiItem {
        UnifiedFiiItem::new(
            name,
            Kcal::new(kcal_per_unit).unwrap(),
            quantity,
            Some(FiiValue::new(fii).unwrap()),
        )
        .unwrap()
    }

    fn unknown_item(name: &str, kcal_per_unit: f64) -> UnifiedFiiItem {
        UnifiedFiiItem::new(name, Kcal::new(kcal_per_unit).unwrap(), 1.0, None).unwrap()
    }

    fn macro_fallback_item() -> UnifiedFiiItem {
        UnifiedFiiItem::new("fallback carb bowl", Kcal::new(220.0).unwrap(), 1.0, None)
            .unwrap()
            .with_macro_nutrients(
                MacroFallbackNutrients::new(
                    Some(55.0),
                    Some(Grams::new(30.0).unwrap()),
                    Some(Grams::new(10.0).unwrap()),
                    None,
                    None,
                )
                .unwrap(),
            )
    }

    fn scored(items: &[UnifiedFiiItem]) -> ScoredMeal {
        score_meal(items).unwrap().unwrap()
    }

    fn driver_names(items: &[UnifiedFiiItem]) -> Vec<String> {
        scored(items).main_insulin_drivers().to_vec()
    }

    #[test]
    fn empty_meal_returns_none_like_unified_meal_totals() {
        assert!(score_meal(&[]).unwrap().is_none());
        assert!(calculate_unified_fii_meal_totals(&[]).unwrap().is_none());
    }

    #[test]
    fn provided_fii_meal_matches_backend_acute_score() {
        let items = [provided_item("plain yogurt", 100.0, 1.5, 50.0)];

        let scored = scored(&items);

        assert_approx_eq(
            scored
                .unified_meal_estimate()
                .meal_insulin_load_total()
                .value(),
            75.0,
        );
        assert_approx_eq(scored.acute_score().value(), 250.0);
        assert_eq!(
            scored.unified_meal_estimate().item_estimates()[0].source(),
            EstimateSource::UserConfirmed
        );
    }

    #[test]
    fn exact_only_meal_matches_backend_acute_score() {
        let items = [unknown_item("plain yogurt", 180.0)];

        let scored = scored(&items);

        assert_eq!(
            scored.unified_meal_estimate().item_estimates()[0].source(),
            EstimateSource::ExactFii
        );
        assert_approx_eq(
            scored
                .unified_meal_estimate()
                .meal_insulin_load_total()
                .value(),
            108.0,
        );
        assert_approx_eq(scored.acute_score().value(), 360.0);
    }

    #[test]
    fn mapped_meal_matches_backend_acute_score() {
        let items =
            [
                UnifiedFiiItem::new("fresh white bread", Kcal::new(120.0).unwrap(), 1.5, None)
                    .unwrap(),
            ];

        let scored = scored(&items);

        assert_eq!(
            scored.unified_meal_estimate().item_estimates()[0].source(),
            EstimateSource::MappedFii
        );
        assert_approx_eq(
            scored
                .unified_meal_estimate()
                .meal_insulin_load_total()
                .value(),
            180.0,
        );
        assert_approx_eq(scored.acute_score().value(), 600.0);
    }

    #[test]
    fn macro_fallback_meal_matches_backend_acute_score() {
        let items = [macro_fallback_item()];

        let scored = scored(&items);

        assert_eq!(
            scored.unified_meal_estimate().item_estimates()[0].source(),
            EstimateSource::MacroFallback
        );
        assert_approx_eq(
            scored
                .unified_meal_estimate()
                .meal_insulin_load_total()
                .value(),
            12.9,
        );
        assert_approx_eq(scored.acute_score().value(), 43.0);
    }

    #[test]
    fn decomposition_meal_matches_backend_acute_score() {
        let items = [unknown_item("chicken biryani", 520.0)];

        let scored = scored(&items);

        let item_estimate = &scored.unified_meal_estimate().item_estimates()[0];
        assert_eq!(item_estimate.source(), EstimateSource::MappedFii);
        assert!(item_estimate.decomposition().is_some());
        assert_approx_eq(
            scored
                .unified_meal_estimate()
                .meal_insulin_load_total()
                .value(),
            246.48,
        );
        assert_approx_eq(scored.acute_score().value(), 821.6);
    }

    #[test]
    fn unknown_only_meal_preserves_placeholder_and_zero_acute_score() {
        let items = [unknown_item("mystery mineral water", 0.0)];

        let scored = scored(&items);

        let item_estimate = &scored.unified_meal_estimate().item_estimates()[0];
        assert_eq!(item_estimate.source(), EstimateSource::Unknown);
        assert_approx_eq(item_estimate.item_insulin_load().value(), 0.0);
        assert_approx_eq(item_estimate.confidence(), 0.2);
        assert_eq!(
            scored.unified_meal_estimate().estimate_quality(),
            EstimateQuality::Unknown
        );
        assert_approx_eq(scored.acute_score().value(), 0.0);
        assert_eq!(
            scored.main_insulin_drivers(),
            ["mystery mineral water".to_string()]
        );
    }

    #[test]
    fn acute_score_is_unrounded_and_uses_reference_meal_constant() {
        let items = [
            provided_item("cake", 100.0, 2.0, 50.0),
            provided_item("ice cream", 150.0, 1.5, 80.0),
        ];

        let scored = scored(&items);
        let total = scored
            .unified_meal_estimate()
            .meal_insulin_load_total()
            .value();

        assert_approx_eq(total, 280.0);
        assert_approx_eq(REFERENCE_MEAL_INSULIN_LOAD, 30.0);
        // Bitwise equality: runtime output is the raw formula result, unrounded.
        assert_eq!(
            scored.acute_score().value(),
            (total / REFERENCE_MEAL_INSULIN_LOAD) * 100.0
        );
        assert_approx_eq(scored.acute_score().value(), 933.3333333333334);
        assert_ne!(scored.acute_score().value(), 933.3333);
    }

    #[test]
    fn scored_meal_wraps_complete_unified_meal_estimate() {
        let items = [
            provided_item("plain yogurt", 100.0, 1.0, 50.0),
            unknown_item("mystery mineral water", 0.0),
        ];

        let scored = scored(&items);
        let unified = calculate_unified_fii_meal_totals(&items).unwrap().unwrap();

        assert_eq!(scored.unified_meal_estimate(), &unified);
        assert_eq!(
            scored.unified_meal_estimate().formula_version(),
            FormulaVersion::CurrentBackendV1
        );
    }

    #[test]
    fn drivers_rank_top_three_by_descending_item_insulin_load() {
        let items = [
            provided_item("toast", 100.0, 1.0, 10.0),  // load 10
            provided_item("cake", 100.0, 1.0, 90.0),   // load 90
            provided_item("rice", 100.0, 1.0, 40.0),   // load 40
            provided_item("butter", 100.0, 1.0, 20.0), // load 20
        ];

        assert_eq!(driver_names(&items), ["cake", "rice", "butter"]);
    }

    #[test]
    fn drivers_use_original_input_names_not_resolved_or_decomposed_names() {
        let items = [
            unknown_item("chicken biryani", 520.0),
            UnifiedFiiItem::new("fresh white bread", Kcal::new(120.0).unwrap(), 1.0, None).unwrap(),
        ];

        let scored = scored(&items);

        assert_eq!(
            scored.unified_meal_estimate().item_estimates()[0].source(),
            EstimateSource::MappedFii
        );
        assert!(scored.unified_meal_estimate().item_estimates()[0]
            .decomposition()
            .is_some());
        assert_eq!(
            scored.main_insulin_drivers(),
            [
                "chicken biryani".to_string(),
                "fresh white bread".to_string()
            ]
        );
    }

    #[test]
    fn drivers_trim_names_and_skip_blank_names() {
        let items = [
            provided_item("  cake  ", 100.0, 1.0, 90.0),
            provided_item("   ", 100.0, 1.0, 80.0),
            provided_item("", 100.0, 1.0, 70.0),
            provided_item("rice", 100.0, 1.0, 10.0),
        ];

        assert_eq!(driver_names(&items), ["cake", "rice"]);
    }

    #[test]
    fn drivers_dedupe_exact_trimmed_names_keeping_highest_load_occurrence() {
        let items = [
            provided_item("cake", 100.0, 1.0, 10.0),
            provided_item(" cake ", 100.0, 1.0, 90.0),
            provided_item("rice", 100.0, 1.0, 40.0),
            provided_item("cake", 100.0, 1.0, 50.0),
        ];

        assert_eq!(driver_names(&items), ["cake", "rice"]);
    }

    #[test]
    fn driver_dedupe_is_case_sensitive() {
        let items = [
            provided_item("Cake", 100.0, 1.0, 90.0),
            provided_item("cake", 100.0, 1.0, 80.0),
        ];

        assert_eq!(driver_names(&items), ["Cake", "cake"]);
    }

    #[test]
    fn equal_load_ties_preserve_input_order() {
        let items = [
            provided_item("first", 100.0, 1.0, 50.0),
            provided_item("second", 100.0, 1.0, 50.0),
            provided_item("third", 100.0, 1.0, 50.0),
            provided_item("fourth", 100.0, 1.0, 50.0),
        ];

        assert_eq!(driver_names(&items), ["first", "second", "third"]);
    }

    #[test]
    fn fewer_than_three_nonblank_names_return_fewer_drivers() {
        let items = [
            provided_item("cake", 100.0, 1.0, 50.0),
            provided_item("  ", 100.0, 1.0, 90.0),
        ];

        assert_eq!(driver_names(&items), ["cake"]);
    }

    #[test]
    fn zero_load_and_unknown_items_are_retained_when_they_rank_into_top_three() {
        let items = [
            provided_item("cake", 100.0, 1.0, 50.0),
            provided_item("zero fii tea", 100.0, 1.0, 0.0),
            unknown_item("mystery snack", 120.0),
        ];

        let scored = scored(&items);

        assert_eq!(
            scored.unified_meal_estimate().item_estimates()[2].source(),
            EstimateSource::Unknown
        );
        assert_approx_eq(
            scored.unified_meal_estimate().item_estimates()[2]
                .item_kcal()
                .value(),
            120.0,
        );
        assert_eq!(
            scored.main_insulin_drivers(),
            ["cake", "zero fii tea", "mystery snack"]
        );
    }

    #[test]
    fn driver_ranking_ignores_kcal_fii_source_confidence_and_estimate_quality() {
        // Highest kcal, highest FII, highest confidence (user_confirmed) item
        // has the lowest load; a mapped low-kcal item has the highest load.
        let items = [
            provided_item("huge low-load plate", 1000.0, 1.0, 1.0), // load 10, conf 1.0
            UnifiedFiiItem::new("fresh white bread", Kcal::new(30.0).unwrap(), 1.0, None).unwrap(), // mapped, load 30, conf 0.7
            provided_item("small mid plate", 40.0, 1.0, 50.0), // load 20
        ];

        let scored = scored(&items);
        let estimates = scored.unified_meal_estimate().item_estimates();

        assert!(estimates[0].item_kcal().value() > estimates[1].item_kcal().value());
        assert!(estimates[0].confidence() > estimates[1].confidence());
        assert_eq!(
            scored.main_insulin_drivers(),
            [
                "fresh white bread",
                "small mid plate",
                "huge low-load plate"
            ]
        );
    }

    #[test]
    fn adversarial_driver_list_matches_backend_oracle() {
        // Independently hand-simulated against the backend algorithm:
        // stable descending loads: "   "(999) skipped blank, Rice(80),
        // rice(80) case-distinct, pasta(50) wins over later pasta(10),
        // then the top-three cutoff stops before the zero-load items.
        let items = [
            provided_item("  pasta  ", 100.0, 1.0, 50.0),
            provided_item("Rice", 100.0, 1.0, 80.0),
            provided_item("rice", 100.0, 1.0, 80.0),
            provided_item("   ", 100.0, 1.0, 999.0),
            provided_item("pasta", 100.0, 1.0, 10.0),
            unknown_item("mystery water", 0.0),
            provided_item("tea", 100.0, 1.0, 0.0),
        ];

        assert_eq!(driver_names(&items), ["Rice", "rice", "pasta"]);
    }

    #[test]
    fn scored_meal_serializes_and_round_trips() {
        let items = [provided_item("plain yogurt", 100.0, 1.0, 50.0)];
        let scored = scored(&items);

        let json = serde_json::to_value(&scored).unwrap();
        assert_eq!(
            json["acute_score"],
            serde_json::json!((50.0 / 30.0) * 100.0)
        );
        assert_eq!(
            json["main_insulin_drivers"],
            serde_json::json!(["plain yogurt"])
        );
        assert_eq!(
            json["unified_meal_estimate"]["formula_version"],
            serde_json::json!("current_backend_v1")
        );

        let round_trip: ScoredMeal = serde_json::from_value(json).unwrap();
        assert_eq!(round_trip, scored);
    }

    #[test]
    fn score_meal_rejects_invalid_quantity_like_unified_path() {
        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = UnifiedFiiItem::new(
                "plain yogurt",
                Kcal::new(100.0).unwrap(),
                quantity,
                Some(FiiValue::new(50.0).unwrap()),
            )
            .unwrap_err();

            assert!(matches!(
                err,
                ValueValidationError::Negative { .. } | ValueValidationError::NonFinite { .. }
            ));
        }
    }
}
