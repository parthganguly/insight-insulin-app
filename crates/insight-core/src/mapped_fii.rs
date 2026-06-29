use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::direct_fii::calculate_direct_fii_item_load;
use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
};
use crate::exact_fii::{
    calculate_exact_fii_item_load, ExactFiiItemEstimate, ExactFiiItemLoadError,
};
use crate::fii_lookup::{lookup_mapped_fii, FiiLookupError};

#[derive(Debug)]
pub enum MappedFiiItemLoadError {
    Lookup(FiiLookupError),
    InvalidValue(ValueValidationError),
}

impl fmt::Display for MappedFiiItemLoadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Lookup(err) => write!(formatter, "mapped FII lookup failed: {err}"),
            Self::InvalidValue(err) => write!(formatter, "invalid item-load input: {err}"),
        }
    }
}

impl Error for MappedFiiItemLoadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Lookup(err) => Some(err),
            Self::InvalidValue(err) => Some(err),
        }
    }
}

impl From<FiiLookupError> for MappedFiiItemLoadError {
    fn from(err: FiiLookupError) -> Self {
        Self::Lookup(err)
    }
}

impl From<ValueValidationError> for MappedFiiItemLoadError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidValue(err)
    }
}

#[derive(Debug)]
pub enum ExactOrMappedFiiMealError {
    ExactItem(ExactFiiItemLoadError),
    MappedItem(MappedFiiItemLoadError),
    InvalidValue(ValueValidationError),
}

impl fmt::Display for ExactOrMappedFiiMealError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExactItem(err) => write!(formatter, "exact-FII meal item failed: {err}"),
            Self::MappedItem(err) => write!(formatter, "mapped-FII meal item failed: {err}"),
            Self::InvalidValue(err) => write!(formatter, "invalid meal input: {err}"),
        }
    }
}

impl Error for ExactOrMappedFiiMealError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::ExactItem(err) => Some(err),
            Self::MappedItem(err) => Some(err),
            Self::InvalidValue(err) => Some(err),
        }
    }
}

impl From<ExactFiiItemLoadError> for ExactOrMappedFiiMealError {
    fn from(err: ExactFiiItemLoadError) -> Self {
        Self::ExactItem(err)
    }
}

impl From<MappedFiiItemLoadError> for ExactOrMappedFiiMealError {
    fn from(err: MappedFiiItemLoadError) -> Self {
        Self::MappedItem(err)
    }
}

impl From<ValueValidationError> for ExactOrMappedFiiMealError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidValue(err)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct MappedFiiItemEstimate {
    item_kcal: Kcal,
    item_insulin_load: InsulinLoad,
    looked_up_fii: FiiValue,
    source: EstimateSource,
    confidence: f64,
    formula_version: FormulaVersion,
}

impl MappedFiiItemEstimate {
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

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum ExactOrMappedFiiItemEstimate {
    Exact(ExactFiiItemEstimate),
    Mapped(MappedFiiItemEstimate),
}

impl ExactOrMappedFiiItemEstimate {
    pub const fn item_kcal(self) -> Kcal {
        match self {
            Self::Exact(estimate) => estimate.item_kcal(),
            Self::Mapped(estimate) => estimate.item_kcal(),
        }
    }

    pub const fn item_insulin_load(self) -> InsulinLoad {
        match self {
            Self::Exact(estimate) => estimate.item_insulin_load(),
            Self::Mapped(estimate) => estimate.item_insulin_load(),
        }
    }

    pub const fn looked_up_fii(self) -> FiiValue {
        match self {
            Self::Exact(estimate) => estimate.looked_up_fii(),
            Self::Mapped(estimate) => estimate.looked_up_fii(),
        }
    }

    pub const fn source(self) -> EstimateSource {
        match self {
            Self::Exact(estimate) => estimate.source(),
            Self::Mapped(estimate) => estimate.source(),
        }
    }

    pub const fn confidence(self) -> f64 {
        match self {
            Self::Exact(estimate) => estimate.confidence(),
            Self::Mapped(estimate) => estimate.confidence(),
        }
    }

    pub const fn formula_version(self) -> FormulaVersion {
        match self {
            Self::Exact(estimate) => estimate.formula_version(),
            Self::Mapped(estimate) => estimate.formula_version(),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExactOrMappedFiiMealItem {
    food_name: String,
    kcal_per_unit: Kcal,
    quantity: f64,
}

impl ExactOrMappedFiiMealItem {
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
pub struct ExactOrMappedFiiMealEstimate {
    item_estimates: Vec<ExactOrMappedFiiItemEstimate>,
    meal_kcal_total: Kcal,
    meal_insulin_load_total: InsulinLoad,
    formula_version: FormulaVersion,
}

impl ExactOrMappedFiiMealEstimate {
    pub fn item_estimates(&self) -> &[ExactOrMappedFiiItemEstimate] {
        &self.item_estimates
    }

    pub const fn meal_kcal_total(&self) -> Kcal {
        self.meal_kcal_total
    }

    pub const fn meal_insulin_load_total(&self) -> InsulinLoad {
        self.meal_insulin_load_total
    }

    pub const fn formula_version(&self) -> FormulaVersion {
        self.formula_version
    }
}

/// Scores only the backend's conservative token-subset mapped FII item path.
pub fn calculate_mapped_fii_item_load(
    food_name: &str,
    kcal_per_unit: Kcal,
    quantity: f64,
) -> Result<Option<MappedFiiItemEstimate>, MappedFiiItemLoadError> {
    let Some(lookup_result) = lookup_mapped_fii(food_name)? else {
        return Ok(None);
    };

    let load_estimate =
        calculate_direct_fii_item_load(kcal_per_unit, quantity, lookup_result.fii())?;

    Ok(Some(MappedFiiItemEstimate {
        item_kcal: load_estimate.item_kcal(),
        item_insulin_load: load_estimate.item_insulin_load(),
        looked_up_fii: lookup_result.fii(),
        source: lookup_result.source(),
        confidence: lookup_result.confidence(),
        formula_version: lookup_result.formula_version(),
    }))
}

/// Aggregates a non-empty meal only when every item resolves through exact or mapped FII.
pub fn calculate_exact_or_mapped_fii_meal_totals(
    items: &[ExactOrMappedFiiMealItem],
) -> Result<Option<ExactOrMappedFiiMealEstimate>, ExactOrMappedFiiMealError> {
    if items.is_empty() {
        return Ok(None);
    }

    let mut item_estimates = Vec::with_capacity(items.len());
    let mut meal_kcal_total = 0.0;
    let mut meal_insulin_load_total = 0.0;

    for item in items {
        let item_estimate = if let Some(estimate) =
            calculate_exact_fii_item_load(item.food_name(), item.kcal_per_unit(), item.quantity())?
        {
            ExactOrMappedFiiItemEstimate::Exact(estimate)
        } else if let Some(estimate) =
            calculate_mapped_fii_item_load(item.food_name(), item.kcal_per_unit(), item.quantity())?
        {
            ExactOrMappedFiiItemEstimate::Mapped(estimate)
        } else {
            return Ok(None);
        };

        meal_kcal_total += item_estimate.item_kcal().value();
        meal_insulin_load_total += item_estimate.item_insulin_load().value();
        item_estimates.push(item_estimate);
    }

    let formula_version = item_estimates[0].formula_version();
    debug_assert!(item_estimates
        .iter()
        .all(|item| item.formula_version() == formula_version));

    Ok(Some(ExactOrMappedFiiMealEstimate {
        item_estimates,
        meal_kcal_total: Kcal::new(meal_kcal_total)?,
        meal_insulin_load_total: InsulinLoad::new(meal_insulin_load_total)?,
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
    fn matches_backend_mapped_item_load_behavior() {
        let estimate =
            calculate_mapped_fii_item_load("fresh white bread", Kcal::new(120.0).unwrap(), 1.5)
                .unwrap()
                .unwrap();

        assert_approx_eq(estimate.item_kcal().value(), 180.0);
        assert_approx_eq(estimate.looked_up_fii().value(), 100.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 180.0);
        assert_eq!(estimate.source(), EstimateSource::MappedFii);
        assert_eq!(estimate.source().as_str(), "mapped_fii");
        assert_approx_eq(estimate.confidence(), 0.7);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn preserves_exact_lookup_precedence() {
        assert!(
            calculate_mapped_fii_item_load("white bread", Kcal::new(120.0).unwrap(), 1.0,)
                .unwrap()
                .is_none()
        );
        assert!(
            calculate_mapped_fii_item_load("basmati rice", Kcal::new(180.0).unwrap(), 1.0,)
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn does_not_score_broad_or_mixed_mapped_names() {
        for food_name in ["bread", "greek yogurt bowl", "white bread with milk"] {
            assert!(
                calculate_mapped_fii_item_load(food_name, Kcal::new(180.0).unwrap(), 1.0,)
                    .unwrap()
                    .is_none()
            );
        }
    }

    #[test]
    fn rejects_invalid_quantity_after_mapped_lookup() {
        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = calculate_mapped_fii_item_load(
                "fresh white bread",
                Kcal::new(120.0).unwrap(),
                quantity,
            )
            .unwrap_err();

            assert!(matches!(err, MappedFiiItemLoadError::InvalidValue(_)));
        }
    }

    #[test]
    fn aggregates_exact_and_mapped_items_without_hiding_provenance() {
        let items = [
            ExactOrMappedFiiMealItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0).unwrap(),
            ExactOrMappedFiiMealItem::new("fresh white bread", Kcal::new(120.0).unwrap(), 1.5)
                .unwrap(),
        ];

        let estimate = calculate_exact_or_mapped_fii_meal_totals(&items)
            .unwrap()
            .unwrap();

        assert_approx_eq(estimate.meal_kcal_total().value(), 360.0);
        assert_approx_eq(estimate.meal_insulin_load_total().value(), 288.0);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
        assert_eq!(estimate.item_estimates().len(), 2);
        assert_eq!(
            estimate.item_estimates()[0].source(),
            EstimateSource::ExactFii
        );
        assert_eq!(
            estimate.item_estimates()[1].source(),
            EstimateSource::MappedFii
        );
        assert_approx_eq(estimate.item_estimates()[0].confidence(), 0.7);
        assert_approx_eq(estimate.item_estimates()[1].confidence(), 0.7);
        assert_approx_eq(
            estimate.meal_insulin_load_total().value()
                / crate::direct_fii::REFERENCE_MEAL_INSULIN_LOAD
                * 100.0,
            960.0,
        );
    }

    #[test]
    fn preserves_exact_precedence_inside_meal_aggregation() {
        let items = [
            ExactOrMappedFiiMealItem::new("white bread", Kcal::new(120.0).unwrap(), 1.0).unwrap(),
        ];

        let estimate = calculate_exact_or_mapped_fii_meal_totals(&items)
            .unwrap()
            .unwrap();

        assert_eq!(
            estimate.item_estimates()[0].source(),
            EstimateSource::ExactFii
        );
    }

    #[test]
    fn rejects_whole_meal_when_any_item_is_unsupported() {
        let items = [
            ExactOrMappedFiiMealItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0).unwrap(),
            ExactOrMappedFiiMealItem::new("mystery mineral water", Kcal::new(0.0).unwrap(), 1.0)
                .unwrap(),
        ];

        assert!(calculate_exact_or_mapped_fii_meal_totals(&items)
            .unwrap()
            .is_none());
    }

    #[test]
    fn rejects_empty_meal_without_assigning_provenance() {
        assert!(calculate_exact_or_mapped_fii_meal_totals(&[])
            .unwrap()
            .is_none());
    }

    #[test]
    fn exact_or_mapped_meal_item_rejects_invalid_quantity() {
        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = ExactOrMappedFiiMealItem::new(
                "fresh white bread",
                Kcal::new(120.0).unwrap(),
                quantity,
            )
            .unwrap_err();

            assert!(matches!(
                err,
                ValueValidationError::Negative { .. } | ValueValidationError::NonFinite { .. }
            ));
        }
    }
}
