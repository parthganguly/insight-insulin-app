use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::direct_fii::calculate_direct_fii_item_load;
use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
};
use crate::exact_fii::{calculate_exact_fii_item_load, ExactFiiItemLoadError};
use crate::macro_fallback::{
    calculate_macro_fallback_item_load, MacroFallbackItemLoadError, MacroFallbackKind,
    MacroFallbackNutrients,
};
use crate::mapped_fii::{calculate_mapped_fii_item_load, MappedFiiItemLoadError};

#[derive(Debug)]
pub enum UnifiedFiiScoringError {
    ExactItem(ExactFiiItemLoadError),
    MappedItem(MappedFiiItemLoadError),
    MacroItem(MacroFallbackItemLoadError),
    InvalidValue(ValueValidationError),
}

impl fmt::Display for UnifiedFiiScoringError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExactItem(err) => write!(formatter, "exact-FII item failed: {err}"),
            Self::MappedItem(err) => write!(formatter, "mapped-FII item failed: {err}"),
            Self::MacroItem(err) => write!(formatter, "macro-fallback item failed: {err}"),
            Self::InvalidValue(err) => write!(formatter, "invalid unified-FII input: {err}"),
        }
    }
}

impl Error for UnifiedFiiScoringError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::ExactItem(err) => Some(err),
            Self::MappedItem(err) => Some(err),
            Self::MacroItem(err) => Some(err),
            Self::InvalidValue(err) => Some(err),
        }
    }
}

impl From<ExactFiiItemLoadError> for UnifiedFiiScoringError {
    fn from(err: ExactFiiItemLoadError) -> Self {
        Self::ExactItem(err)
    }
}

impl From<MappedFiiItemLoadError> for UnifiedFiiScoringError {
    fn from(err: MappedFiiItemLoadError) -> Self {
        Self::MappedItem(err)
    }
}

impl From<MacroFallbackItemLoadError> for UnifiedFiiScoringError {
    fn from(err: MacroFallbackItemLoadError) -> Self {
        Self::MacroItem(err)
    }
}

impl From<ValueValidationError> for UnifiedFiiScoringError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidValue(err)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct UnifiedFiiItem {
    food_name: String,
    kcal_per_unit: Kcal,
    quantity: f64,
    provided_fii: Option<FiiValue>,
    macro_nutrients: MacroFallbackNutrients,
}

impl UnifiedFiiItem {
    pub fn new(
        food_name: impl Into<String>,
        kcal_per_unit: Kcal,
        quantity: f64,
        provided_fii: Option<FiiValue>,
    ) -> Result<Self, ValueValidationError> {
        validate_quantity(quantity)?;
        Ok(Self {
            food_name: food_name.into(),
            kcal_per_unit,
            quantity,
            provided_fii,
            macro_nutrients: MacroFallbackNutrients::default(),
        })
    }

    pub fn with_macro_nutrients(mut self, macro_nutrients: MacroFallbackNutrients) -> Self {
        self.macro_nutrients = macro_nutrients;
        self
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

    pub const fn provided_fii(&self) -> Option<FiiValue> {
        self.provided_fii
    }

    pub const fn macro_nutrients(&self) -> MacroFallbackNutrients {
        self.macro_nutrients
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct UnifiedFiiItemEstimate {
    item_kcal: Kcal,
    item_insulin_load: InsulinLoad,
    resolved_fii: Option<FiiValue>,
    macro_fallback_kind: Option<MacroFallbackKind>,
    source: EstimateSource,
    confidence: f64,
    formula_version: FormulaVersion,
}

impl UnifiedFiiItemEstimate {
    pub const fn item_kcal(self) -> Kcal {
        self.item_kcal
    }

    pub const fn item_insulin_load(self) -> InsulinLoad {
        self.item_insulin_load
    }

    pub const fn resolved_fii(self) -> Option<FiiValue> {
        self.resolved_fii
    }

    pub const fn macro_fallback_kind(self) -> Option<MacroFallbackKind> {
        self.macro_fallback_kind
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UnifiedFiiMealEstimate {
    item_estimates: Vec<UnifiedFiiItemEstimate>,
    meal_kcal_total: Kcal,
    meal_insulin_load_total: InsulinLoad,
    formula_version: FormulaVersion,
}

impl UnifiedFiiMealEstimate {
    pub fn item_estimates(&self) -> &[UnifiedFiiItemEstimate] {
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

/// Scores provided, exact, mapped, then isolated non-mixed macro fallback paths.
pub fn calculate_unified_fii_item_load(
    item: &UnifiedFiiItem,
) -> Result<Option<UnifiedFiiItemEstimate>, UnifiedFiiScoringError> {
    if let Some(provided_fii) = item.provided_fii() {
        let estimate =
            calculate_direct_fii_item_load(item.kcal_per_unit(), item.quantity(), provided_fii)?;

        return Ok(Some(UnifiedFiiItemEstimate {
            item_kcal: estimate.item_kcal(),
            item_insulin_load: estimate.item_insulin_load(),
            resolved_fii: Some(provided_fii),
            macro_fallback_kind: None,
            source: estimate.source(),
            confidence: 1.0,
            formula_version: estimate.formula_version(),
        }));
    }

    if let Some(estimate) =
        calculate_exact_fii_item_load(item.food_name(), item.kcal_per_unit(), item.quantity())?
    {
        return Ok(Some(UnifiedFiiItemEstimate {
            item_kcal: estimate.item_kcal(),
            item_insulin_load: estimate.item_insulin_load(),
            resolved_fii: Some(estimate.looked_up_fii()),
            macro_fallback_kind: None,
            source: estimate.source(),
            confidence: estimate.confidence(),
            formula_version: estimate.formula_version(),
        }));
    }

    if let Some(estimate) =
        calculate_mapped_fii_item_load(item.food_name(), item.kcal_per_unit(), item.quantity())?
    {
        return Ok(Some(UnifiedFiiItemEstimate {
            item_kcal: estimate.item_kcal(),
            item_insulin_load: estimate.item_insulin_load(),
            resolved_fii: Some(estimate.looked_up_fii()),
            macro_fallback_kind: None,
            source: estimate.source(),
            confidence: estimate.confidence(),
            formula_version: estimate.formula_version(),
        }));
    }

    if let Some(estimate) = calculate_macro_fallback_item_load(
        item.food_name(),
        item.kcal_per_unit(),
        item.quantity(),
        item.macro_nutrients(),
    )? {
        return Ok(Some(UnifiedFiiItemEstimate {
            item_kcal: estimate.item_kcal(),
            item_insulin_load: estimate.item_insulin_load(),
            resolved_fii: None,
            macro_fallback_kind: Some(estimate.kind()),
            source: estimate.source(),
            confidence: estimate.confidence(),
            formula_version: estimate.formula_version(),
        }));
    }

    Ok(None)
}

/// Aggregates a non-empty meal only when every item resolves through an allowed path.
pub fn calculate_unified_fii_meal_totals(
    items: &[UnifiedFiiItem],
) -> Result<Option<UnifiedFiiMealEstimate>, UnifiedFiiScoringError> {
    if items.is_empty() {
        return Ok(None);
    }

    let mut item_estimates = Vec::with_capacity(items.len());
    let mut meal_kcal_total = 0.0;
    let mut meal_insulin_load_total = 0.0;

    for item in items {
        let Some(estimate) = calculate_unified_fii_item_load(item)? else {
            return Ok(None);
        };

        meal_kcal_total += estimate.item_kcal().value();
        meal_insulin_load_total += estimate.item_insulin_load().value();
        item_estimates.push(estimate);
    }

    let formula_version = item_estimates[0].formula_version();
    debug_assert!(item_estimates
        .iter()
        .all(|item| item.formula_version() == formula_version));

    Ok(Some(UnifiedFiiMealEstimate {
        item_estimates,
        meal_kcal_total: Kcal::new(meal_kcal_total)?,
        meal_insulin_load_total: InsulinLoad::new(meal_insulin_load_total)?,
        formula_version,
    }))
}

fn validate_quantity(quantity: f64) -> Result<(), ValueValidationError> {
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
    use crate::domain::Grams;

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    #[test]
    fn scores_provided_fii_with_backend_provenance() {
        let item = UnifiedFiiItem::new(
            "plain yogurt",
            Kcal::new(100.0).unwrap(),
            1.5,
            Some(FiiValue::new(50.0).unwrap()),
        )
        .unwrap();

        let estimate = calculate_unified_fii_item_load(&item).unwrap().unwrap();

        assert_approx_eq(estimate.item_kcal().value(), 150.0);
        assert_approx_eq(estimate.resolved_fii().unwrap().value(), 50.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 75.0);
        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate.macro_fallback_kind(), None);
        assert_approx_eq(estimate.confidence(), 1.0);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn provided_fii_takes_precedence_over_exact_lookup() {
        let item = UnifiedFiiItem::new(
            "plain yogurt",
            Kcal::new(100.0).unwrap(),
            1.0,
            Some(FiiValue::new(50.0).unwrap()),
        )
        .unwrap()
        .with_macro_nutrients(
            MacroFallbackNutrients::new(
                Some(60.0),
                Some(Grams::new(30.0).unwrap()),
                Some(Grams::new(20.0).unwrap()),
                None,
                None,
            )
            .unwrap(),
        );

        let estimate = calculate_unified_fii_item_load(&item).unwrap().unwrap();

        assert_approx_eq(estimate.resolved_fii().unwrap().value(), 50.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 50.0);
        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_eq!(estimate.macro_fallback_kind(), None);
    }

    #[test]
    fn zero_provided_fii_remains_user_confirmed() {
        let item = UnifiedFiiItem::new(
            "plain yogurt",
            Kcal::new(100.0).unwrap(),
            1.0,
            Some(FiiValue::new(0.0).unwrap()),
        )
        .unwrap();

        let estimate = calculate_unified_fii_item_load(&item).unwrap().unwrap();

        assert_approx_eq(estimate.resolved_fii().unwrap().value(), 0.0);
        assert_approx_eq(estimate.item_insulin_load().value(), 0.0);
        assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
        assert_approx_eq(estimate.confidence(), 1.0);
    }

    #[test]
    fn preserves_exact_and_mapped_precedence_over_macro_fallback() {
        let nutrients = MacroFallbackNutrients::new(
            Some(60.0),
            Some(Grams::new(30.0).unwrap()),
            Some(Grams::new(20.0).unwrap()),
            None,
            None,
        )
        .unwrap();
        let exact = UnifiedFiiItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0, None)
            .unwrap()
            .with_macro_nutrients(nutrients);
        let mapped = UnifiedFiiItem::new("fresh white bread", Kcal::new(120.0).unwrap(), 1.5, None)
            .unwrap()
            .with_macro_nutrients(nutrients);

        let exact_estimate = calculate_unified_fii_item_load(&exact).unwrap().unwrap();
        let mapped_estimate = calculate_unified_fii_item_load(&mapped).unwrap().unwrap();

        assert_eq!(exact_estimate.source(), EstimateSource::ExactFii);
        assert_eq!(mapped_estimate.source(), EstimateSource::MappedFii);
        assert_eq!(exact_estimate.macro_fallback_kind(), None);
        assert_eq!(mapped_estimate.macro_fallback_kind(), None);
    }

    #[test]
    fn aggregates_provided_exact_mapped_and_macro_items() {
        let items = vec![
            UnifiedFiiItem::new(
                "plain yogurt",
                Kcal::new(100.0).unwrap(),
                1.0,
                Some(FiiValue::new(50.0).unwrap()),
            )
            .unwrap(),
            UnifiedFiiItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0, None).unwrap(),
            UnifiedFiiItem::new("fresh white bread", Kcal::new(120.0).unwrap(), 1.5, None).unwrap(),
            UnifiedFiiItem::new("cultured dairy cup", Kcal::new(180.0).unwrap(), 1.0, None)
                .unwrap()
                .with_macro_nutrients(
                    MacroFallbackNutrients::new(
                        Some(35.0),
                        Some(Grams::new(16.0).unwrap()),
                        Some(Grams::new(8.0).unwrap()),
                        Some(Grams::new(4.0).unwrap()),
                        Some(Grams::new(2.0).unwrap()),
                    )
                    .unwrap(),
                ),
        ];

        let estimate = calculate_unified_fii_meal_totals(&items).unwrap().unwrap();

        assert_approx_eq(estimate.meal_kcal_total().value(), 640.0);
        assert_approx_eq(estimate.meal_insulin_load_total().value(), 343.76);
        assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
        assert_eq!(estimate.item_estimates().len(), 4);
        assert_eq!(
            estimate.item_estimates()[0].source(),
            EstimateSource::UserConfirmed
        );
        assert_eq!(
            estimate.item_estimates()[1].source(),
            EstimateSource::ExactFii
        );
        assert_eq!(
            estimate.item_estimates()[2].source(),
            EstimateSource::MappedFii
        );
        assert_eq!(
            estimate.item_estimates()[3].source(),
            EstimateSource::MacroFallback
        );
        assert_approx_eq(estimate.item_estimates()[0].confidence(), 1.0);
        assert_approx_eq(estimate.item_estimates()[1].confidence(), 0.7);
        assert_approx_eq(estimate.item_estimates()[2].confidence(), 0.7);
        assert_approx_eq(estimate.item_estimates()[3].confidence(), 0.8);
        assert_eq!(estimate.item_estimates()[3].resolved_fii(), None);
        assert_eq!(
            estimate.item_estimates()[3].macro_fallback_kind(),
            Some(MacroFallbackKind::GiCarbProtein)
        );
    }

    #[test]
    fn rejects_whole_meal_when_any_item_is_unsupported() {
        let items = [
            UnifiedFiiItem::new(
                "plain yogurt",
                Kcal::new(100.0).unwrap(),
                1.0,
                Some(FiiValue::new(50.0).unwrap()),
            )
            .unwrap(),
            UnifiedFiiItem::new("mystery mineral water", Kcal::new(0.0).unwrap(), 1.0, None)
                .unwrap(),
        ];

        assert!(calculate_unified_fii_meal_totals(&items).unwrap().is_none());
    }

    #[test]
    fn rejects_empty_meal() {
        assert!(calculate_unified_fii_meal_totals(&[]).unwrap().is_none());
    }

    #[test]
    fn rejects_invalid_quantity() {
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

    #[test]
    fn returns_no_estimate_for_unresolved_item() {
        let item = UnifiedFiiItem::new("mystery mineral water", Kcal::new(0.0).unwrap(), 1.0, None)
            .unwrap();

        assert!(calculate_unified_fii_item_load(&item).unwrap().is_none());
    }

    #[test]
    fn does_not_apply_macro_fallback_to_mixed_dishes() {
        let item = UnifiedFiiItem::new("fallback carb bowl", Kcal::new(220.0).unwrap(), 1.0, None)
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
            );

        assert!(calculate_unified_fii_item_load(&item).unwrap().is_none());
    }
}
