pub mod direct_fii;
pub mod domain;
pub mod exact_fii;
pub mod fii_lookup;

pub use direct_fii::{
    calculate_direct_fii_acute_score, calculate_direct_fii_item_load,
    calculate_direct_fii_meal_totals, DirectFiiAcuteEstimate, DirectFiiItemEstimate,
    DirectFiiMealEstimate, DirectFiiMealItem, REFERENCE_MEAL_INSULIN_LOAD,
};
pub use domain::{
    AcuteScore, EstimateSource, FiiValue, FormulaVersion, Grams, InsulinLoad, Kcal,
    ValueValidationError,
};
pub use exact_fii::{calculate_exact_fii_item_load, ExactFiiItemEstimate, ExactFiiItemLoadError};
pub use fii_lookup::{lookup_exact_fii, normalize_food_name, FiiLookupError, FiiLookupResult};
