pub mod decomposition;
pub mod direct_fii;
pub mod domain;
pub mod exact_fii;
pub mod fii_lookup;
pub mod macro_fallback;
pub mod mapped_fii;
pub mod unified_fii;

pub use decomposition::{
    calculate_decomposed_fii_item_load, decompose_food_name_weighted, DecomposedComponentEstimate,
    DecomposedFiiItemEstimate, DecompositionError, DecompositionPlan, DecompositionProvenance,
    DecompositionRuleKind, WeightedDecompositionComponent,
};
pub use direct_fii::{
    calculate_direct_fii_acute_score, calculate_direct_fii_item_load,
    calculate_direct_fii_meal_totals, DirectFiiAcuteEstimate, DirectFiiItemEstimate,
    DirectFiiMealEstimate, DirectFiiMealItem, REFERENCE_MEAL_INSULIN_LOAD,
};
pub use domain::{
    AcuteScore, EstimateSource, FiiValue, FormulaVersion, Grams, InsulinLoad, Kcal,
    ValueValidationError,
};
pub use exact_fii::{
    calculate_exact_fii_item_load, calculate_exact_fii_meal_totals, ExactFiiItemEstimate,
    ExactFiiItemLoadError, ExactFiiMealEstimate, ExactFiiMealItem,
};
pub use fii_lookup::{
    lookup_exact_fii, lookup_mapped_fii, normalize_food_name, FiiLookupError, FiiLookupResult,
};
pub use macro_fallback::{
    calculate_macro_fallback_item_load, MacroFallbackItemEstimate, MacroFallbackItemLoadError,
    MacroFallbackKind, MacroFallbackNutrients, K_EST,
};
pub use mapped_fii::{
    calculate_exact_or_mapped_fii_meal_totals, calculate_mapped_fii_item_load,
    ExactOrMappedFiiItemEstimate, ExactOrMappedFiiMealError, ExactOrMappedFiiMealEstimate,
    ExactOrMappedFiiMealItem, MappedFiiItemEstimate, MappedFiiItemLoadError,
};
pub use unified_fii::{
    calculate_unified_fii_item_load, calculate_unified_fii_meal_totals, UnifiedFiiItem,
    UnifiedFiiItemEstimate, UnifiedFiiMealEstimate, UnifiedFiiScoringError,
};
