use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::direct_fii::calculate_direct_fii_item_load;
use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
};
use crate::fii_lookup::{lookup_exact_fii, FiiLookupError};

#[derive(Debug)]
pub enum ExactFiiItemLoadError {
    Lookup(FiiLookupError),
    InvalidValue(ValueValidationError),
}

impl fmt::Display for ExactFiiItemLoadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Lookup(err) => write!(formatter, "exact FII lookup failed: {err}"),
            Self::InvalidValue(err) => write!(formatter, "invalid item-load input: {err}"),
        }
    }
}

impl Error for ExactFiiItemLoadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Lookup(err) => Some(err),
            Self::InvalidValue(err) => Some(err),
        }
    }
}

impl From<FiiLookupError> for ExactFiiItemLoadError {
    fn from(err: FiiLookupError) -> Self {
        Self::Lookup(err)
    }
}

impl From<ValueValidationError> for ExactFiiItemLoadError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidValue(err)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ExactFiiItemEstimate {
    item_kcal: Kcal,
    item_insulin_load: InsulinLoad,
    looked_up_fii: FiiValue,
    source: EstimateSource,
    confidence: f64,
    formula_version: FormulaVersion,
}

impl ExactFiiItemEstimate {
    pub const fn item_kcal(self) -> Kcal {
        self.item_kcal
    }

    pub const fn item_insulin_load(self) -> InsulinLoad {
        self.item_insulin_load
    }

    pub const fn looked_up_fii(self) -> FiiValue {
        self.looked_up_fii
    }

    pub const fn source(self) -> EstimateSource {
        self.source
    }

    pub const fn confidence(self) -> f64 {
        self.confidence
    }

    pub const fn formula_version(self) -> FormulaVersion {
        self.formula_version
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExactFiiMealItem {
    food_name: String,
    kcal_per_unit: Kcal,
    quantity: f64,
}

impl ExactFiiMealItem {
    pub fn new(
        food_name: impl Into<String>,
        kcal_per_unit: Kcal,
        quantity: f64,
    ) -> Result<Self, ValueValidationError> {
        validate_meal_item_quantity(quantity)?;
        Ok(Self {
            food_name: food_name.into(),
            kcal_per_unit,
            quantity,
        })
    }

    pub fn food_name(&self) -> &str {
        &self.food_name
    }

    pub const fn kcal_per_unit(&self) -> Kcal {
        self.kcal_per_unit
    }

    pub const fn quantity(&self) -> f64 {
        self.quantity
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExactFiiMealEstimate {
    item_estimates: Vec<ExactFiiItemEstimate>,
    meal_kcal_total: Kcal,
    meal_insulin_load_total: InsulinLoad,
    source: EstimateSource,
    formula_version: FormulaVersion,
}

impl ExactFiiMealEstimate {
    pub fn item_estimates(&self) -> &[ExactFiiItemEstimate] {
        &self.item_estimates
    }

    pub const fn meal_kcal_total(&self) -> Kcal {
        self.meal_kcal_total
    }

    pub const fn meal_insulin_load_total(&self) -> InsulinLoad {
        self.meal_insulin_load_total
    }

    pub const fn source(&self) -> EstimateSource {
        self.source
    }

    pub const fn formula_version(&self) -> FormulaVersion {
        self.formula_version
    }
}

/// Scores the item path where no explicit FII was provided and exact lookup succeeds.
pub fn calculate_exact_fii_item_load(
    food_name: &str,
    kcal_per_unit: Kcal,
    quantity: f64,
) -> Result<Option<ExactFiiItemEstimate>, ExactFiiItemLoadError> {
    let Some(lookup_result) = lookup_exact_fii(food_name)? else {
        return Ok(None);
    };

    let load_estimate =
        calculate_direct_fii_item_load(kcal_per_unit, quantity, lookup_result.fii())?;

    Ok(Some(ExactFiiItemEstimate {
        item_kcal: load_estimate.item_kcal(),
        item_insulin_load: load_estimate.item_insulin_load(),
        looked_up_fii: lookup_result.fii(),
        source: lookup_result.source(),
        confidence: lookup_result.confidence(),
        formula_version: lookup_result.formula_version(),
    }))
}

/// Aggregates a non-empty meal only when every item resolves through exact FII lookup.
pub fn calculate_exact_fii_meal_totals(
    items: &[ExactFiiMealItem],
) -> Result<Option<ExactFiiMealEstimate>, ExactFiiItemLoadError> {
    if items.is_empty() {
        return Ok(None);
    }

    let mut item_estimates = Vec::with_capacity(items.len());
    let mut meal_kcal_total = 0.0;
    let mut meal_insulin_load_total = 0.0;

    for item in items {
        let Some(item_estimate) =
            calculate_exact_fii_item_load(item.food_name(), item.kcal_per_unit(), item.quantity())?
        else {
            return Ok(None);
        };

        meal_kcal_total += item_estimate.item_kcal().value();
        meal_insulin_load_total += item_estimate.item_insulin_load().value();
        item_estimates.push(item_estimate);
    }

    let source = item_estimates[0].source();
    let formula_version = item_estimates[0].formula_version();

    debug_assert!(item_estimates.iter().all(|item| item.source() == source));
    debug_assert!(item_estimates
        .iter()
        .all(|item| item.formula_version() == formula_version));

    Ok(Some(ExactFiiMealEstimate {
        item_estimates,
        meal_kcal_total: Kcal::new(meal_kcal_total)?,
        meal_insulin_load_total: InsulinLoad::new(meal_insulin_load_total)?,
        source,
        formula_version,
    }))
}

fn validate_meal_item_quantity(quantity: f64) -> Result<(), ValueValidationError> {
    if !quantity.is_finite() {
        return Err(ValueValidationError::NonFinite {
            type_name: "Quantity",
        });
    }
    if quantity < 0.0 {
        return Err(ValueValidationError::Negative {
            type_name: "Quantity",
            value: quantity,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    #[test]
    fn scores_exact_primary_name_lookup() {
        let estimate = calculate_exact_fii_item_load("Rice", Kcal::new(200.0).unwrap(), 1.5)
            .unwrap()
            .unwrap();

        assert_approx_eq(estimate.item_kcal().value(), 300.0);
        assert_approx_eq(estimate.looked_up_fii().value(), 79.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 237.0);
        assert_eq!(estimate.source(), EstimateSource::ExactFii);
        assert_approx_eq(estimate.confidence(), 0.7);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn scores_exact_alias_lookup_and_preserves_lookup_metadata() {
        let estimate =
            calculate_exact_fii_item_load("plain yogurt", Kcal::new(180.0).unwrap(), 1.0)
                .unwrap()
                .unwrap();

        assert_approx_eq(estimate.item_kcal().value(), 180.0);
        assert_approx_eq(estimate.looked_up_fii().value(), 60.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 108.0);
        assert_eq!(estimate.source().as_str(), "exact_fii");
        assert_approx_eq(estimate.confidence(), 0.7);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn does_not_score_mapped_or_missing_lookup_paths() {
        assert!(
            calculate_exact_fii_item_load("greek yogurt bowl", Kcal::new(180.0).unwrap(), 1.0,)
                .unwrap()
                .is_none()
        );
        assert!(calculate_exact_fii_item_load(
            "cultured dairy cup",
            Kcal::new(180.0).unwrap(),
            1.0,
        )
        .unwrap()
        .is_none());
    }

    #[test]
    fn rejects_invalid_quantity_after_exact_lookup() {
        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err =
                calculate_exact_fii_item_load("plain yogurt", Kcal::new(180.0).unwrap(), quantity)
                    .unwrap_err();

            assert!(matches!(err, ExactFiiItemLoadError::InvalidValue(_)));
        }
    }

    #[test]
    fn aggregates_multi_item_exact_fii_meal() {
        let items = [
            ExactFiiMealItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0).unwrap(),
            ExactFiiMealItem::new("rice", Kcal::new(250.0).unwrap(), 1.0).unwrap(),
        ];

        let estimate = calculate_exact_fii_meal_totals(&items).unwrap().unwrap();

        assert_approx_eq(estimate.meal_kcal_total().value(), 430.0);
        assert_approx_eq(estimate.meal_insulin_load_total().value(), 305.5);
        assert_eq!(estimate.source(), EstimateSource::ExactFii);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
        assert_eq!(estimate.item_estimates().len(), 2);
        assert!(estimate
            .item_estimates()
            .iter()
            .all(|item| item.source() == EstimateSource::ExactFii));
        assert!(estimate
            .item_estimates()
            .iter()
            .all(|item| item.confidence() == 0.7));
    }

    #[test]
    fn does_not_return_partial_meal_when_any_item_misses_exact_lookup() {
        let items = [
            ExactFiiMealItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0).unwrap(),
            ExactFiiMealItem::new("greek yogurt bowl", Kcal::new(180.0).unwrap(), 1.0).unwrap(),
        ];

        assert!(calculate_exact_fii_meal_totals(&items).unwrap().is_none());
    }

    #[test]
    fn does_not_assign_exact_provenance_to_empty_meal() {
        assert!(calculate_exact_fii_meal_totals(&[]).unwrap().is_none());
    }

    #[test]
    fn exact_fii_meal_item_rejects_invalid_quantity() {
        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = ExactFiiMealItem::new("plain yogurt", Kcal::new(180.0).unwrap(), quantity)
                .unwrap_err();

            assert!(matches!(
                err,
                ValueValidationError::Negative { .. } | ValueValidationError::NonFinite { .. }
            ));
        }
    }
}
