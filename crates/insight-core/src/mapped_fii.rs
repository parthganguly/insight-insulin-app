use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::direct_fii::calculate_direct_fii_item_load;
use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
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
}
