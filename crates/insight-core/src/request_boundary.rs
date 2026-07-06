//! Request-boundary normalization layer over the raw parity core.
//!
//! Two layers with different trust contracts:
//!
//! - **Raw core (parity layer):** `UnifiedFiiItem`, `score_meal`, and the
//!   other raw scoring functions reproduce current backend behaviour exactly.
//!   The raw core treats *any* `Some(FiiValue)` — including `0.0` — as a
//!   deliberately provided value and scores it as `user_confirmed` with
//!   confidence `1.0`. That is correct for parity, where the caller is the
//!   already-normalized backend pipeline.
//! - **Request boundary (this module):** the client/UniFFI-safe entry point.
//!   Future Kotlin/Swift/UniFFI callers hold raw client-style input where a
//!   provided FII may be absent, defaulted to zero, negative, or otherwise
//!   untrustworthy. This layer normalizes that raw input *before* any raw
//!   core type is constructed, mirroring the Python POST boundary
//!   (`resolve_positive_provided_fii` in `backend/api/meals.py`): only a
//!   positive finite raw FII becomes a provided FII, so only a positive
//!   finite raw FII can ever score as `user_confirmed`.
//!
//! Normalization contract for raw provided FII:
//!
//! - absent (`None`, the null/blank-equivalent for numeric input) → no
//!   provided FII
//! - zero → no provided FII
//! - negative finite → no provided FII
//! - non-finite (NaN or ±infinity) → rejected with
//!   [`ValueValidationError::NonFinite`], matching the crate's existing
//!   validation style (the Python boundary takes integers, so non-finite
//!   input cannot occur there; explicit rejection is the Rust contract)
//! - positive finite → provided FII
//!
//! This module is additive: it changes no raw parity semantics and generates
//! no UniFFI bindings.

use crate::domain::{FiiValue, Kcal, ValueValidationError};
use crate::macro_fallback::MacroFallbackNutrients;
use crate::scoring::{score_meal, ScoredMeal};
use crate::unified_fii::{
    calculate_unified_fii_item_load, calculate_unified_fii_meal_totals, UnifiedFiiItem,
    UnifiedFiiItemEstimate, UnifiedFiiMealEstimate, UnifiedFiiScoringError,
};

/// Normalizes a raw client-style provided FII before it may touch raw core
/// types. Mirrors the backend boundary rule: keep only positive values.
/// Non-finite input is rejected explicitly rather than silently neutralized
/// so a defective client cannot hide NaN/infinity behind a fallback path.
pub fn normalize_provided_fii(
    raw_provided_fii: Option<f64>,
) -> Result<Option<FiiValue>, ValueValidationError> {
    let Some(raw_value) = raw_provided_fii else {
        return Ok(None);
    };
    if !raw_value.is_finite() {
        return Err(ValueValidationError::NonFinite {
            type_name: "RawProvidedFii",
        });
    }
    if raw_value <= 0.0 {
        return Ok(None);
    }
    Ok(Some(FiiValue::new(raw_value)?))
}

/// Client/UniFFI-safe meal item: the only way to attach a provided FII is
/// through [`normalize_provided_fii`], so a non-positive/default/blank raw
/// FII can never reach the raw core as `Some(FiiValue)` and can therefore
/// never become `user_confirmed`.
#[derive(Debug, Clone, PartialEq)]
pub struct RequestBoundaryFiiItem {
    inner: UnifiedFiiItem,
}

impl RequestBoundaryFiiItem {
    pub fn new(
        food_name: impl Into<String>,
        kcal_per_unit: Kcal,
        quantity: f64,
        raw_provided_fii: Option<f64>,
    ) -> Result<Self, ValueValidationError> {
        let provided_fii = normalize_provided_fii(raw_provided_fii)?;
        Ok(Self {
            inner: UnifiedFiiItem::new(food_name, kcal_per_unit, quantity, provided_fii)?,
        })
    }

    pub fn with_macro_nutrients(mut self, macro_nutrients: MacroFallbackNutrients) -> Self {
        self.inner = self.inner.with_macro_nutrients(macro_nutrients);
        self
    }

    /// The normalized raw core item this boundary item wraps.
    pub const fn as_unified_item(&self) -> &UnifiedFiiItem {
        &self.inner
    }

    /// The provided FII after boundary normalization: `Some` only for a
    /// positive finite raw input.
    pub const fn provided_fii(&self) -> Option<FiiValue> {
        self.inner.provided_fii()
    }
}

/// Boundary wrapper over the raw [`calculate_unified_fii_item_load`].
pub fn calculate_boundary_fii_item_load(
    item: &RequestBoundaryFiiItem,
) -> Result<Option<UnifiedFiiItemEstimate>, UnifiedFiiScoringError> {
    calculate_unified_fii_item_load(item.as_unified_item())
}

/// Boundary wrapper over the raw [`calculate_unified_fii_meal_totals`].
pub fn calculate_boundary_fii_meal_totals(
    items: &[RequestBoundaryFiiItem],
) -> Result<Option<UnifiedFiiMealEstimate>, UnifiedFiiScoringError> {
    let unified_items: Vec<UnifiedFiiItem> = items
        .iter()
        .map(|item| item.as_unified_item().clone())
        .collect();
    calculate_unified_fii_meal_totals(&unified_items)
}

/// Boundary wrapper over the raw product contract [`score_meal`].
pub fn score_boundary_meal(
    items: &[RequestBoundaryFiiItem],
) -> Result<Option<ScoredMeal>, UnifiedFiiScoringError> {
    let unified_items: Vec<UnifiedFiiItem> = items
        .iter()
        .map(|item| item.as_unified_item().clone())
        .collect();
    score_meal(&unified_items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::EstimateSource;

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    fn boundary_item(raw_provided_fii: Option<f64>) -> RequestBoundaryFiiItem {
        RequestBoundaryFiiItem::new(
            "plain yogurt",
            Kcal::new(100.0).unwrap(),
            1.5,
            raw_provided_fii,
        )
        .unwrap()
    }

    fn raw_item_without_provided_fii() -> UnifiedFiiItem {
        UnifiedFiiItem::new("plain yogurt", Kcal::new(100.0).unwrap(), 1.5, None).unwrap()
    }

    #[test]
    fn normalizes_positive_finite_raw_fii_to_provided_fii() {
        let provided = normalize_provided_fii(Some(50.0)).unwrap().unwrap();
        assert_approx_eq(provided.value(), 50.0);
    }

    #[test]
    fn normalizes_absent_zero_and_negative_raw_fii_to_none() {
        for raw in [None, Some(0.0), Some(-0.0), Some(-1.0), Some(-50.0)] {
            assert_eq!(normalize_provided_fii(raw).unwrap(), None);
        }
    }

    #[test]
    fn rejects_non_finite_raw_fii_explicitly() {
        for raw in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = normalize_provided_fii(Some(raw)).unwrap_err();
            assert!(matches!(err, ValueValidationError::NonFinite { .. }));
        }
    }

    #[test]
    fn positive_raw_fii_becomes_user_confirmed_through_boundary() {
        let item = boundary_item(Some(50.0));
        assert_approx_eq(item.provided_fii().unwrap().value(), 50.0);

        let estimate = calculate_boundary_fii_item_load(&item).unwrap().unwrap();

        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_approx_eq(estimate.confidence(), 1.0);
        assert_approx_eq(estimate.resolved_fii().unwrap().value(), 50.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 75.0);
    }

    #[test]
    fn zero_raw_fii_does_not_become_provided_or_user_confirmed() {
        let item = boundary_item(Some(0.0));
        assert_eq!(item.provided_fii(), None);

        let estimate = calculate_boundary_fii_item_load(&item).unwrap().unwrap();
        let baseline = calculate_unified_fii_item_load(&raw_item_without_provided_fii())
            .unwrap()
            .unwrap();

        assert_ne!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate, baseline);
    }

    #[test]
    fn negative_raw_fii_does_not_become_provided_or_user_confirmed() {
        let item = boundary_item(Some(-25.0));
        assert_eq!(item.provided_fii(), None);

        let estimate = calculate_boundary_fii_item_load(&item).unwrap().unwrap();
        let baseline = calculate_unified_fii_item_load(&raw_item_without_provided_fii())
            .unwrap()
            .unwrap();

        assert_ne!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate, baseline);
    }

    #[test]
    fn absent_raw_fii_behaves_like_no_provided_fii() {
        let item = boundary_item(None);
        assert_eq!(item.provided_fii(), None);
        assert_eq!(item.as_unified_item(), &raw_item_without_provided_fii());

        let estimate = calculate_boundary_fii_item_load(&item).unwrap().unwrap();
        let baseline = calculate_unified_fii_item_load(&raw_item_without_provided_fii())
            .unwrap()
            .unwrap();

        assert_eq!(estimate, baseline);
    }

    #[test]
    fn non_finite_raw_fii_is_rejected_at_item_construction() {
        for raw in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = RequestBoundaryFiiItem::new(
                "plain yogurt",
                Kcal::new(100.0).unwrap(),
                1.0,
                Some(raw),
            )
            .unwrap_err();
            assert!(matches!(err, ValueValidationError::NonFinite { .. }));
        }
    }

    #[test]
    fn zero_raw_fii_on_unknown_food_falls_through_to_unknown_not_user_confirmed() {
        let item = RequestBoundaryFiiItem::new(
            "mystery mineral water",
            Kcal::new(80.0).unwrap(),
            1.0,
            Some(0.0),
        )
        .unwrap();

        let estimate = calculate_boundary_fii_item_load(&item).unwrap().unwrap();

        assert_eq!(estimate.source(), EstimateSource::Unknown);
        assert_eq!(estimate.resolved_fii(), None);
        assert_approx_eq(estimate.item_insulin_load().value(), 0.0);
    }

    #[test]
    fn boundary_meal_never_marks_non_positive_raw_fii_as_user_confirmed() {
        let items = [
            boundary_item(Some(50.0)),
            boundary_item(Some(0.0)),
            boundary_item(Some(-10.0)),
            boundary_item(None),
        ];

        let estimate = calculate_boundary_fii_meal_totals(&items).unwrap().unwrap();

        let user_confirmed_count = estimate
            .item_estimates()
            .iter()
            .filter(|item| item.source() == EstimateSource::UserConfirmed)
            .count();
        assert_eq!(user_confirmed_count, 1);
        assert_eq!(
            estimate.item_estimates()[0].source(),
            EstimateSource::UserConfirmed
        );
    }

    #[test]
    fn score_boundary_meal_matches_raw_score_meal_on_normalized_items() {
        let boundary_items = [boundary_item(Some(50.0)), boundary_item(Some(0.0))];
        let raw_items = [
            UnifiedFiiItem::new(
                "plain yogurt",
                Kcal::new(100.0).unwrap(),
                1.5,
                Some(FiiValue::new(50.0).unwrap()),
            )
            .unwrap(),
            raw_item_without_provided_fii(),
        ];

        let boundary_scored = score_boundary_meal(&boundary_items).unwrap().unwrap();
        let raw_scored = score_meal(&raw_items).unwrap().unwrap();

        assert_eq!(boundary_scored, raw_scored);
    }

    #[test]
    fn score_boundary_meal_returns_none_for_empty_meal_like_raw_contract() {
        assert!(score_boundary_meal(&[]).unwrap().is_none());
    }
}
