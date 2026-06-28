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
}
