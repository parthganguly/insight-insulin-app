use serde::{Deserialize, Serialize};

use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
    CURRENT_FORMULA_VERSION,
};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DirectFiiItemEstimate {
    item_kcal: Kcal,
    item_insulin_load: InsulinLoad,
    source: EstimateSource,
    formula_version: FormulaVersion,
}

impl DirectFiiItemEstimate {
    pub const fn item_kcal(self) -> Kcal {
        self.item_kcal
    }

    pub const fn item_insulin_load(self) -> InsulinLoad {
        self.item_insulin_load
    }

    pub const fn source(self) -> EstimateSource {
        self.source
    }

    pub const fn formula_version(self) -> FormulaVersion {
        self.formula_version
    }
}

pub fn calculate_direct_fii_item_load(
    kcal_per_unit: Kcal,
    quantity: f64,
    fii: FiiValue,
) -> Result<DirectFiiItemEstimate, ValueValidationError> {
    let quantity = validate_quantity(quantity)?;
    let item_kcal = Kcal::new(kcal_per_unit.value() * quantity)?;
    let item_insulin_load = InsulinLoad::new((fii.value() / 100.0) * item_kcal.value())?;

    Ok(DirectFiiItemEstimate {
        item_kcal,
        item_insulin_load,
        source: EstimateSource::UserConfirmed,
        formula_version: CURRENT_FORMULA_VERSION,
    })
}

fn validate_quantity(quantity: f64) -> Result<f64, ValueValidationError> {
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
    Ok(quantity)
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
    fn computes_direct_fii_item_kcal_and_load() {
        let estimate = calculate_direct_fii_item_load(
            Kcal::new(100.0).unwrap(),
            2.0,
            FiiValue::new(50.0).unwrap(),
        )
        .unwrap();

        assert_approx_eq(estimate.item_kcal().value(), 200.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 100.0);
    }

    #[test]
    fn uses_user_confirmed_source_and_current_formula_version() {
        let estimate = calculate_direct_fii_item_load(
            Kcal::new(450.0).unwrap(),
            1.0,
            FiiValue::new(110.0).unwrap(),
        )
        .unwrap();

        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate.source().as_str(), "user_confirmed");
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn rejects_negative_quantity() {
        let err = calculate_direct_fii_item_load(
            Kcal::new(100.0).unwrap(),
            -1.0,
            FiiValue::new(50.0).unwrap(),
        )
        .unwrap_err();

        assert!(matches!(err, ValueValidationError::Negative { .. }));
    }

    #[test]
    fn rejects_non_finite_quantity() {
        for quantity in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = calculate_direct_fii_item_load(
                Kcal::new(100.0).unwrap(),
                quantity,
                FiiValue::new(50.0).unwrap(),
            )
            .unwrap_err();

            assert!(matches!(err, ValueValidationError::NonFinite { .. }));
        }
    }
}
