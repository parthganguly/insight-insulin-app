use serde::{Deserialize, Serialize};

use crate::domain::{
    AcuteScore, EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
    CURRENT_FORMULA_VERSION,
};

pub const REFERENCE_MEAL_INSULIN_LOAD: f64 = 30.0;

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

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DirectFiiMealItem {
    kcal_per_unit: Kcal,
    quantity: f64,
    fii: FiiValue,
}

impl DirectFiiMealItem {
    pub fn new(
        kcal_per_unit: Kcal,
        quantity: f64,
        fii: FiiValue,
    ) -> Result<Self, ValueValidationError> {
        validate_quantity(quantity)?;
        Ok(Self {
            kcal_per_unit,
            quantity,
            fii,
        })
    }

    pub const fn kcal_per_unit(self) -> Kcal {
        self.kcal_per_unit
    }

    pub const fn quantity(self) -> f64 {
        self.quantity
    }

    pub const fn fii(self) -> FiiValue {
        self.fii
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DirectFiiMealEstimate {
    meal_kcal_total: Kcal,
    meal_insulin_load_total: InsulinLoad,
    source: EstimateSource,
    formula_version: FormulaVersion,
}

impl DirectFiiMealEstimate {
    pub const fn meal_kcal_total(self) -> Kcal {
        self.meal_kcal_total
    }

    pub const fn meal_insulin_load_total(self) -> InsulinLoad {
        self.meal_insulin_load_total
    }

    pub const fn source(self) -> EstimateSource {
        self.source
    }

    pub const fn formula_version(self) -> FormulaVersion {
        self.formula_version
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DirectFiiAcuteEstimate {
    meal_kcal_total: Kcal,
    meal_insulin_load_total: InsulinLoad,
    acute_score: AcuteScore,
    source: EstimateSource,
    formula_version: FormulaVersion,
}

impl DirectFiiAcuteEstimate {
    pub const fn meal_kcal_total(self) -> Kcal {
        self.meal_kcal_total
    }

    pub const fn meal_insulin_load_total(self) -> InsulinLoad {
        self.meal_insulin_load_total
    }

    pub const fn acute_score(self) -> AcuteScore {
        self.acute_score
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

pub fn calculate_direct_fii_meal_totals(
    items: &[DirectFiiMealItem],
) -> Result<DirectFiiMealEstimate, ValueValidationError> {
    let mut meal_kcal_total = 0.0;
    let mut meal_insulin_load_total = 0.0;

    for item in items {
        let item_estimate =
            calculate_direct_fii_item_load(item.kcal_per_unit, item.quantity, item.fii)?;
        meal_kcal_total += item_estimate.item_kcal().value();
        meal_insulin_load_total += item_estimate.item_insulin_load().value();
    }

    Ok(DirectFiiMealEstimate {
        meal_kcal_total: Kcal::new(meal_kcal_total)?,
        meal_insulin_load_total: InsulinLoad::new(meal_insulin_load_total)?,
        source: EstimateSource::UserConfirmed,
        formula_version: CURRENT_FORMULA_VERSION,
    })
}

pub fn calculate_direct_fii_acute_score(
    items: &[DirectFiiMealItem],
) -> Result<DirectFiiAcuteEstimate, ValueValidationError> {
    let meal_estimate = calculate_direct_fii_meal_totals(items)?;
    let acute_score = AcuteScore::new(
        (meal_estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD) * 100.0,
    )?;

    Ok(DirectFiiAcuteEstimate {
        meal_kcal_total: meal_estimate.meal_kcal_total(),
        meal_insulin_load_total: meal_estimate.meal_insulin_load_total(),
        acute_score,
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

    #[test]
    fn aggregates_multi_item_direct_fii_meal() {
        let items = [
            DirectFiiMealItem::new(Kcal::new(100.0).unwrap(), 2.0, FiiValue::new(50.0).unwrap())
                .unwrap(),
            DirectFiiMealItem::new(Kcal::new(150.0).unwrap(), 1.5, FiiValue::new(80.0).unwrap())
                .unwrap(),
        ];

        let estimate = calculate_direct_fii_meal_totals(&items).unwrap();

        assert_approx_eq(estimate.meal_kcal_total().value(), 425.0);
        assert_approx_eq(estimate.meal_insulin_load_total().value(), 280.0);
        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn calculates_direct_fii_acute_score_from_meal_aggregation() {
        let items = [DirectFiiMealItem::new(
            Kcal::new(450.0).unwrap(),
            1.0,
            FiiValue::new(110.0).unwrap(),
        )
        .unwrap()];

        let estimate = calculate_direct_fii_acute_score(&items).unwrap();

        assert_approx_eq(REFERENCE_MEAL_INSULIN_LOAD, 30.0);
        assert_approx_eq(estimate.meal_kcal_total().value(), 450.0);
        assert_approx_eq(estimate.meal_insulin_load_total().value(), 495.0);
        assert_approx_eq(estimate.acute_score().value(), 1650.0);
        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn calculates_multi_item_direct_fii_acute_score() {
        let items = [
            DirectFiiMealItem::new(Kcal::new(100.0).unwrap(), 2.0, FiiValue::new(50.0).unwrap())
                .unwrap(),
            DirectFiiMealItem::new(Kcal::new(150.0).unwrap(), 1.5, FiiValue::new(80.0).unwrap())
                .unwrap(),
        ];

        let estimate = calculate_direct_fii_acute_score(&items).unwrap();

        assert_approx_eq(estimate.meal_kcal_total().value(), 425.0);
        assert_approx_eq(estimate.meal_insulin_load_total().value(), 280.0);
        assert_approx_eq(estimate.acute_score().value(), 933.3333333333334);
    }

    #[test]
    fn rejects_invalid_meal_item_quantity() {
        let err = DirectFiiMealItem::new(
            Kcal::new(100.0).unwrap(),
            f64::NAN,
            FiiValue::new(50.0).unwrap(),
        )
        .unwrap_err();

        assert!(matches!(err, ValueValidationError::NonFinite { .. }));
    }
}
