use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::domain::{
    EstimateSource, FormulaVersion, Grams, InsulinLoad, Kcal, ValueValidationError,
    CURRENT_FORMULA_VERSION,
};
use crate::fii_lookup::is_likely_mixed_meal;

pub const K_EST: f64 = 0.6;

#[derive(Debug)]
pub enum MacroFallbackItemLoadError {
    InvalidValue(ValueValidationError),
}

impl fmt::Display for MacroFallbackItemLoadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidValue(err) => write!(formatter, "invalid macro-fallback input: {err}"),
        }
    }
}

impl Error for MacroFallbackItemLoadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::InvalidValue(err) => Some(err),
        }
    }
}

impl From<ValueValidationError> for MacroFallbackItemLoadError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidValue(err)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct MacroFallbackNutrients {
    gi: Option<f64>,
    carb_g: Option<Grams>,
    protein_g: Option<Grams>,
    fat_g: Option<Grams>,
    sat_fat_g: Option<Grams>,
}

impl MacroFallbackNutrients {
    pub fn new(
        gi: Option<f64>,
        carb_g: Option<Grams>,
        protein_g: Option<Grams>,
        fat_g: Option<Grams>,
        sat_fat_g: Option<Grams>,
    ) -> Result<Self, ValueValidationError> {
        if let Some(gi) = gi {
            validate_non_negative(gi, "GlycemicIndex")?;
        }

        Ok(Self {
            gi,
            carb_g,
            protein_g,
            fat_g,
            sat_fat_g,
        })
    }

    pub const fn gi(self) -> Option<f64> {
        self.gi
    }

    pub const fn carb_g(self) -> Option<Grams> {
        self.carb_g
    }

    pub const fn protein_g(self) -> Option<Grams> {
        self.protein_g
    }

    pub const fn fat_g(self) -> Option<Grams> {
        self.fat_g
    }

    pub const fn sat_fat_g(self) -> Option<Grams> {
        self.sat_fat_g
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MacroFallbackKind {
    GiCarbProtein,
    GiCarb,
    RoughMacro,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct MacroFallbackItemEstimate {
    item_kcal: Kcal,
    item_insulin_load: InsulinLoad,
    kind: MacroFallbackKind,
    source: EstimateSource,
    confidence: f64,
    formula_version: FormulaVersion,
}

impl MacroFallbackItemEstimate {
    pub const fn item_kcal(self) -> Kcal {
        self.item_kcal
    }

    pub const fn item_insulin_load(self) -> InsulinLoad {
        self.item_insulin_load
    }

    pub const fn kind(self) -> MacroFallbackKind {
        self.kind
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

/// Reproduces the backend's high-risk heuristic only for non-mixed items.
pub fn calculate_macro_fallback_item_load(
    food_name: &str,
    kcal_per_unit: Kcal,
    quantity: f64,
    nutrients: MacroFallbackNutrients,
) -> Result<Option<MacroFallbackItemEstimate>, MacroFallbackItemLoadError> {
    validate_non_negative(quantity, "Quantity")?;
    if is_likely_mixed_meal(food_name) {
        return Ok(None);
    }

    calculate_macro_fallback_after_validation(kcal_per_unit, quantity, nutrients)
}

pub(crate) fn calculate_macro_fallback_item_load_after_decomposition(
    kcal_per_unit: Kcal,
    quantity: f64,
    nutrients: MacroFallbackNutrients,
) -> Result<Option<MacroFallbackItemEstimate>, MacroFallbackItemLoadError> {
    validate_non_negative(quantity, "Quantity")?;
    calculate_macro_fallback_after_validation(kcal_per_unit, quantity, nutrients)
}

fn calculate_macro_fallback_after_validation(
    kcal_per_unit: Kcal,
    quantity: f64,
    nutrients: MacroFallbackNutrients,
) -> Result<Option<MacroFallbackItemEstimate>, MacroFallbackItemLoadError> {
    let item_kcal = Kcal::new(kcal_per_unit.value() * quantity)?;

    if let (Some(gi), Some(carb_g)) = (nutrients.gi(), nutrients.carb_g()) {
        let gl = carb_g.value() * gi / 100.0;
        let protein_component = nutrients
            .protein_g()
            .map_or(0.0, |protein_g| protein_g.value() * 0.5);
        let (kind, confidence) = if nutrients.protein_g().is_some() {
            (MacroFallbackKind::GiCarbProtein, 0.8)
        } else {
            (MacroFallbackKind::GiCarb, 0.7)
        };

        return Ok(Some(MacroFallbackItemEstimate {
            item_kcal,
            item_insulin_load: InsulinLoad::new((gl + protein_component) * K_EST)?,
            kind,
            source: EstimateSource::MacroFallback,
            confidence,
            formula_version: CURRENT_FORMULA_VERSION,
        }));
    }

    let carb = nutrients.carb_g().map_or(0.0, Grams::value);
    let protein = nutrients.protein_g().map_or(0.0, Grams::value);
    let fat = nutrients.fat_g().map_or(0.0, Grams::value);
    let sat_fat = nutrients.sat_fat_g().map_or(0.0, Grams::value);
    if ![carb, protein, fat, sat_fat]
        .iter()
        .any(|value| *value > 0.0)
    {
        return Ok(None);
    }

    let unsat_fat = (fat - sat_fat).max(0.0);
    let estimate = carb + (protein * 0.5) + (sat_fat * 0.1) + (unsat_fat * 0.05);

    Ok(Some(MacroFallbackItemEstimate {
        item_kcal,
        item_insulin_load: InsulinLoad::new(estimate * K_EST)?,
        kind: MacroFallbackKind::RoughMacro,
        source: EstimateSource::MacroFallback,
        confidence: 0.5,
        formula_version: CURRENT_FORMULA_VERSION,
    }))
}

fn validate_non_negative(value: f64, type_name: &'static str) -> Result<(), ValueValidationError> {
    if !value.is_finite() {
        return Err(ValueValidationError::NonFinite { type_name });
    }
    if value < 0.0 {
        return Err(ValueValidationError::Negative { type_name, value });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn grams(value: f64) -> Option<Grams> {
        Some(Grams::new(value).unwrap())
    }

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    #[test]
    fn matches_gi_carb_protein_backend_path() {
        assert_eq!(K_EST, 0.6);
        let nutrients = MacroFallbackNutrients::new(
            Some(60.0),
            grams(30.0),
            grams(20.0),
            grams(5.0),
            grams(2.0),
        )
        .unwrap();

        let estimate = calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(250.0).unwrap(),
            1.5,
            nutrients,
        )
        .unwrap()
        .unwrap();

        assert_approx_eq(estimate.item_kcal().value(), 375.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 16.8);
        assert_eq!(estimate.kind(), MacroFallbackKind::GiCarbProtein);
        assert_eq!(estimate.source(), EstimateSource::MacroFallback);
        assert_approx_eq(estimate.confidence(), 0.8);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn matches_gi_carb_only_backend_path() {
        let nutrients =
            MacroFallbackNutrients::new(Some(60.0), grams(30.0), None, None, None).unwrap();

        let estimate = calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(250.0).unwrap(),
            1.0,
            nutrients,
        )
        .unwrap()
        .unwrap();

        assert_approx_eq(estimate.item_insulin_load().value(), 10.8);
        assert_eq!(estimate.kind(), MacroFallbackKind::GiCarb);
        assert_approx_eq(estimate.confidence(), 0.7);
    }

    #[test]
    fn protein_presence_preserves_backend_confidence_even_at_zero() {
        let nutrients =
            MacroFallbackNutrients::new(Some(60.0), grams(30.0), grams(0.0), None, None).unwrap();

        let estimate = calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(250.0).unwrap(),
            1.0,
            nutrients,
        )
        .unwrap()
        .unwrap();

        assert_eq!(estimate.kind(), MacroFallbackKind::GiCarbProtein);
        assert_approx_eq(estimate.confidence(), 0.8);
    }

    #[test]
    fn matches_rough_macro_backend_path() {
        let nutrients =
            MacroFallbackNutrients::new(None, grams(20.0), grams(10.0), grams(8.0), grams(3.0))
                .unwrap();

        let estimate = calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(300.0).unwrap(),
            1.0,
            nutrients,
        )
        .unwrap()
        .unwrap();

        assert_approx_eq(estimate.item_insulin_load().value(), 15.33);
        assert_eq!(estimate.kind(), MacroFallbackKind::RoughMacro);
        assert_eq!(estimate.source(), EstimateSource::MacroFallback);
        assert_approx_eq(estimate.confidence(), 0.5);
    }

    #[test]
    fn rough_macro_clamps_unsaturated_fat_at_zero() {
        let nutrients =
            MacroFallbackNutrients::new(None, None, None, grams(2.0), grams(3.0)).unwrap();

        let estimate = calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(100.0).unwrap(),
            1.0,
            nutrients,
        )
        .unwrap()
        .unwrap();

        assert_approx_eq(estimate.item_insulin_load().value(), 0.18);
        assert_eq!(estimate.kind(), MacroFallbackKind::RoughMacro);
    }

    #[test]
    fn returns_no_estimate_without_usable_macro_values() {
        let zero_nutrients =
            MacroFallbackNutrients::new(None, grams(0.0), grams(0.0), grams(0.0), grams(0.0))
                .unwrap();

        assert!(calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(100.0).unwrap(),
            1.0,
            MacroFallbackNutrients::default(),
        )
        .unwrap()
        .is_none());
        assert!(calculate_macro_fallback_item_load(
            "fallback-only-food",
            Kcal::new(100.0).unwrap(),
            1.0,
            zero_nutrients,
        )
        .unwrap()
        .is_none());
    }

    #[test]
    fn rejects_mixed_dishes_instead_of_decomposing_them() {
        let nutrients =
            MacroFallbackNutrients::new(Some(55.0), grams(30.0), grams(10.0), None, None).unwrap();

        for food_name in ["fallback carb bowl", "bread with milk", "chicken biryani"] {
            assert!(calculate_macro_fallback_item_load(
                food_name,
                Kcal::new(220.0).unwrap(),
                1.0,
                nutrients,
            )
            .unwrap()
            .is_none());
        }
    }

    #[test]
    fn rejects_invalid_gi_and_quantity() {
        for gi in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err =
                MacroFallbackNutrients::new(Some(gi), grams(30.0), None, None, None).unwrap_err();
            assert!(matches!(
                err,
                ValueValidationError::Negative { .. } | ValueValidationError::NonFinite { .. }
            ));
        }

        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = calculate_macro_fallback_item_load(
                "fallback-only-food",
                Kcal::new(100.0).unwrap(),
                quantity,
                MacroFallbackNutrients::default(),
            )
            .unwrap_err();
            assert!(matches!(err, MacroFallbackItemLoadError::InvalidValue(_)));
        }

        for macro_value in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = Grams::new(macro_value).unwrap_err();
            assert!(matches!(
                err,
                ValueValidationError::Negative { .. } | ValueValidationError::NonFinite { .. }
            ));
        }
    }
}
