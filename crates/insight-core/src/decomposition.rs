use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::direct_fii::calculate_direct_fii_item_load;
use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, InsulinLoad, Kcal, ValueValidationError,
    CURRENT_FORMULA_VERSION,
};
use crate::fii_lookup::{
    lookup_exact_fii, lookup_mapped_fii, normalize_food_name, FiiLookupError, FiiLookupResult,
};

const MIN_DECOMPOSITION_CONFIDENCE: f64 = 0.25;
const MAX_DECOMPOSITION_CONFIDENCE: f64 = 0.90;
const DEFAULT_COMPONENT_CONFIDENCE: f64 = 0.5;

#[derive(Debug, Clone, Copy)]
struct ComponentSpec {
    food_name: &'static str,
    weight: f64,
}

#[derive(Debug, Clone, Copy)]
struct PhraseRule {
    phrase: &'static str,
    components: &'static [ComponentSpec],
}

#[derive(Debug, Clone, Copy)]
struct KeywordRule {
    keywords: &'static [&'static str],
    components: &'static [ComponentSpec],
}

const CHICKEN_BIRYANI_COMPONENTS: &[ComponentSpec] = &[
    ComponentSpec {
        food_name: "rice",
        weight: 0.60,
    },
    ComponentSpec {
        food_name: "chicken",
        weight: 0.25,
    },
    ComponentSpec {
        food_name: "oil",
        weight: 0.15,
    },
];
const RICE_CHICKEN_COMPONENTS: &[ComponentSpec] = &[
    ComponentSpec {
        food_name: "rice",
        weight: 0.65,
    },
    ComponentSpec {
        food_name: "chicken",
        weight: 0.35,
    },
];
const YOGURT_COMPONENTS: &[ComponentSpec] = &[ComponentSpec {
    food_name: "yogurt",
    weight: 1.0,
}];
const STEAK_POTATO_COMPONENTS: &[ComponentSpec] = &[
    ComponentSpec {
        food_name: "beef",
        weight: 0.60,
    },
    ComponentSpec {
        food_name: "potato",
        weight: 0.40,
    },
];
const DAL_RICE_COMPONENTS: &[ComponentSpec] = &[
    ComponentSpec {
        food_name: "lentils",
        weight: 0.45,
    },
    ComponentSpec {
        food_name: "rice",
        weight: 0.55,
    },
];
const MILK_OATS_COMPONENTS: &[ComponentSpec] = &[
    ComponentSpec {
        food_name: "milk",
        weight: 0.40,
    },
    ComponentSpec {
        food_name: "oats",
        weight: 0.60,
    },
];
const EGG_TOAST_COMPONENTS: &[ComponentSpec] = &[
    ComponentSpec {
        food_name: "egg",
        weight: 0.40,
    },
    ComponentSpec {
        food_name: "white bread",
        weight: 0.60,
    },
];

const PHRASE_RULES: &[PhraseRule] = &[
    PhraseRule {
        phrase: "chicken biryani",
        components: CHICKEN_BIRYANI_COMPONENTS,
    },
    PhraseRule {
        phrase: "rice and chicken",
        components: RICE_CHICKEN_COMPONENTS,
    },
    PhraseRule {
        phrase: "greek yogurt bowl",
        components: YOGURT_COMPONENTS,
    },
    PhraseRule {
        phrase: "steak and potatoes",
        components: STEAK_POTATO_COMPONENTS,
    },
    PhraseRule {
        phrase: "dal rice",
        components: DAL_RICE_COMPONENTS,
    },
    PhraseRule {
        phrase: "milk and oats",
        components: MILK_OATS_COMPONENTS,
    },
    PhraseRule {
        phrase: "egg and toast",
        components: EGG_TOAST_COMPONENTS,
    },
];

const KEYWORD_RULES: &[KeywordRule] = &[
    KeywordRule {
        keywords: &["biryani"],
        components: CHICKEN_BIRYANI_COMPONENTS,
    },
    KeywordRule {
        keywords: &["greek yogurt"],
        components: YOGURT_COMPONENTS,
    },
    KeywordRule {
        keywords: &["yogurt bowl"],
        components: YOGURT_COMPONENTS,
    },
    KeywordRule {
        keywords: &["yoghurt"],
        components: YOGURT_COMPONENTS,
    },
    KeywordRule {
        keywords: &["steak", "potato"],
        components: STEAK_POTATO_COMPONENTS,
    },
    KeywordRule {
        keywords: &["dal", "rice"],
        components: DAL_RICE_COMPONENTS,
    },
    KeywordRule {
        keywords: &["milk", "oats"],
        components: MILK_OATS_COMPONENTS,
    },
    KeywordRule {
        keywords: &["egg", "toast"],
        components: EGG_TOAST_COMPONENTS,
    },
    KeywordRule {
        keywords: &["rice", "chicken"],
        components: RICE_CHICKEN_COMPONENTS,
    },
];

#[derive(Debug)]
pub enum DecompositionError {
    Lookup(FiiLookupError),
    InvalidValue(ValueValidationError),
}

impl fmt::Display for DecompositionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Lookup(err) => write!(formatter, "component FII lookup failed: {err}"),
            Self::InvalidValue(err) => write!(formatter, "invalid decomposition input: {err}"),
        }
    }
}

impl Error for DecompositionError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Lookup(err) => Some(err),
            Self::InvalidValue(err) => Some(err),
        }
    }
}

impl From<FiiLookupError> for DecompositionError {
    fn from(err: FiiLookupError) -> Self {
        Self::Lookup(err)
    }
}

impl From<ValueValidationError> for DecompositionError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidValue(err)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DecompositionRuleKind {
    Phrase,
    Keyword,
    GenericToken,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WeightedDecompositionComponent {
    food_name: String,
    weight: f64,
}

impl WeightedDecompositionComponent {
    fn new(food_name: impl Into<String>, weight: f64) -> Self {
        Self {
            food_name: food_name.into(),
            weight,
        }
    }

    pub fn food_name(&self) -> &str {
        &self.food_name
    }

    pub const fn weight(&self) -> f64 {
        self.weight
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DecompositionPlan {
    original_dish_name: String,
    normalized_dish_name: String,
    rule_kind: DecompositionRuleKind,
    rule_match: String,
    components: Vec<WeightedDecompositionComponent>,
}

impl DecompositionPlan {
    pub fn original_dish_name(&self) -> &str {
        &self.original_dish_name
    }

    pub fn normalized_dish_name(&self) -> &str {
        &self.normalized_dish_name
    }

    pub const fn rule_kind(&self) -> DecompositionRuleKind {
        self.rule_kind
    }

    pub fn rule_match(&self) -> &str {
        &self.rule_match
    }

    pub fn components(&self) -> &[WeightedDecompositionComponent] {
        &self.components
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DecomposedComponentEstimate {
    food_name: String,
    original_weight: f64,
    normalized_weight: f64,
    component_kcal: Kcal,
    matched: bool,
    fii: Option<FiiValue>,
    source: Option<EstimateSource>,
    confidence: Option<f64>,
    insulin_load: Option<InsulinLoad>,
    formula_version: Option<FormulaVersion>,
}

impl DecomposedComponentEstimate {
    pub fn food_name(&self) -> &str {
        &self.food_name
    }

    pub const fn original_weight(&self) -> f64 {
        self.original_weight
    }

    pub const fn normalized_weight(&self) -> f64 {
        self.normalized_weight
    }

    pub const fn component_kcal(&self) -> Kcal {
        self.component_kcal
    }

    pub const fn matched(&self) -> bool {
        self.matched
    }

    pub const fn fii(&self) -> Option<FiiValue> {
        self.fii
    }

    pub const fn source(&self) -> Option<EstimateSource> {
        self.source
    }

    pub const fn confidence(&self) -> Option<f64> {
        self.confidence
    }

    pub const fn insulin_load(&self) -> Option<InsulinLoad> {
        self.insulin_load
    }

    pub const fn formula_version(&self) -> Option<FormulaVersion> {
        self.formula_version
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DecompositionProvenance {
    original_dish_name: String,
    normalized_dish_name: String,
    rule_kind: DecompositionRuleKind,
    rule_match: String,
    components: Vec<DecomposedComponentEstimate>,
    matched_share: f64,
    component_confidence: f64,
}

impl DecompositionProvenance {
    pub fn original_dish_name(&self) -> &str {
        &self.original_dish_name
    }

    pub fn normalized_dish_name(&self) -> &str {
        &self.normalized_dish_name
    }

    pub const fn rule_kind(&self) -> DecompositionRuleKind {
        self.rule_kind
    }

    pub fn rule_match(&self) -> &str {
        &self.rule_match
    }

    pub fn components(&self) -> &[DecomposedComponentEstimate] {
        &self.components
    }

    pub const fn matched_share(&self) -> f64 {
        self.matched_share
    }

    pub const fn component_confidence(&self) -> f64 {
        self.component_confidence
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DecomposedFiiItemEstimate {
    item_kcal: Kcal,
    item_insulin_load: InsulinLoad,
    source: EstimateSource,
    confidence: f64,
    formula_version: FormulaVersion,
    provenance: DecompositionProvenance,
}

impl DecomposedFiiItemEstimate {
    pub const fn item_kcal(&self) -> Kcal {
        self.item_kcal
    }

    pub const fn item_insulin_load(&self) -> InsulinLoad {
        self.item_insulin_load
    }

    pub const fn source(&self) -> EstimateSource {
        self.source
    }

    pub const fn confidence(&self) -> f64 {
        self.confidence
    }

    pub const fn formula_version(&self) -> FormulaVersion {
        self.formula_version
    }

    pub const fn provenance(&self) -> &DecompositionProvenance {
        &self.provenance
    }
}

/// Reproduces the backend's ordered, hardcoded dish decomposition rules.
pub fn decompose_food_name_weighted(food_name: &str) -> Option<DecompositionPlan> {
    let normalized = normalize_food_name(food_name);
    if normalized.is_empty() {
        return None;
    }

    for rule in PHRASE_RULES {
        if normalized.contains(rule.phrase) {
            return Some(plan_from_specs(
                food_name,
                normalized,
                DecompositionRuleKind::Phrase,
                rule.phrase,
                rule.components,
            ));
        }
    }

    for rule in KEYWORD_RULES {
        if rule
            .keywords
            .iter()
            .all(|keyword| normalized.contains(keyword))
        {
            return Some(plan_from_specs(
                food_name,
                normalized,
                DecompositionRuleKind::Keyword,
                &rule.keywords.join(" + "),
                rule.components,
            ));
        }
    }

    let mut component_names: Vec<&str> = Vec::new();
    for token in normalized.split_whitespace() {
        let Some(component_name) = generic_component_for_token(token) else {
            continue;
        };
        if !component_names.contains(&component_name) {
            component_names.push(component_name);
        }
    }
    if component_names.is_empty() {
        return None;
    }

    let weight = 1.0 / component_names.len() as f64;
    Some(DecompositionPlan {
        original_dish_name: food_name.to_owned(),
        normalized_dish_name: normalized,
        rule_kind: DecompositionRuleKind::GenericToken,
        rule_match: "generic_token_component_map".to_owned(),
        components: component_names
            .into_iter()
            .map(|component_name| WeightedDecompositionComponent::new(component_name, weight))
            .collect(),
    })
}

/// Scores a decomposition only when at least one effective component resolves through FII lookup.
pub fn calculate_decomposed_fii_item_load(
    food_name: &str,
    kcal_per_unit: Kcal,
    quantity: f64,
) -> Result<Option<DecomposedFiiItemEstimate>, DecompositionError> {
    validate_quantity(quantity)?;
    let Some(plan) = decompose_food_name_weighted(food_name) else {
        return Ok(None);
    };
    let item_kcal = Kcal::new(kcal_per_unit.value() * quantity)?;

    score_decomposition_plan(plan, item_kcal)
}

fn plan_from_specs(
    original_dish_name: &str,
    normalized_dish_name: String,
    rule_kind: DecompositionRuleKind,
    rule_match: &str,
    components: &[ComponentSpec],
) -> DecompositionPlan {
    DecompositionPlan {
        original_dish_name: original_dish_name.to_owned(),
        normalized_dish_name,
        rule_kind,
        rule_match: rule_match.to_owned(),
        components: components
            .iter()
            .map(|component| {
                WeightedDecompositionComponent::new(component.food_name, component.weight)
            })
            .collect(),
    }
}

fn generic_component_for_token(token: &str) -> Option<&'static str> {
    match token {
        "rice" => Some("rice"),
        "potato" => Some("potato"),
        "egg" | "eggs" => Some("egg"),
        "oats" => Some("oats"),
        "milk" => Some("milk"),
        "yogurt" | "yoghurt" => Some("yogurt"),
        "dal" | "lentils" => Some("lentils"),
        "beans" => Some("beans"),
        "bread" | "toast" | "sandwich" | "burger" => Some("white bread"),
        "banana" => Some("banana"),
        "beef" => Some("beef"),
        "chicken" => Some("chicken"),
        "fish" => Some("fish"),
        _ => None,
    }
}

fn score_decomposition_plan(
    plan: DecompositionPlan,
    item_kcal: Kcal,
) -> Result<Option<DecomposedFiiItemEstimate>, DecompositionError> {
    let effective_components: Vec<_> = plan
        .components
        .iter()
        .filter(|component| !component.food_name().is_empty() && component.weight() > 0.0)
        .cloned()
        .collect();
    if effective_components.is_empty() {
        return Ok(None);
    }

    let total_effective_weight: f64 = effective_components
        .iter()
        .map(WeightedDecompositionComponent::weight)
        .sum();
    if total_effective_weight <= 0.0 {
        return Ok(None);
    }

    let mut component_estimates = Vec::with_capacity(effective_components.len());
    let mut insulin_load_total = 0.0;
    let mut matched_component_count = 0usize;
    let mut matched_share = 0.0;
    let mut weighted_component_confidence_sum = 0.0;

    for component in effective_components {
        let normalized_weight = component.weight() / total_effective_weight;
        let component_kcal = Kcal::new(item_kcal.value() * normalized_weight)?;
        let lookup_result = lookup_component_fii(component.food_name())?;

        if let Some(lookup_result) = lookup_result {
            let load = calculate_direct_fii_item_load(component_kcal, 1.0, lookup_result.fii())?;
            let component_confidence = if lookup_result.confidence() == 0.0 {
                DEFAULT_COMPONENT_CONFIDENCE
            } else {
                lookup_result.confidence()
            };

            insulin_load_total += load.item_insulin_load().value();
            matched_component_count += 1;
            matched_share += normalized_weight;
            weighted_component_confidence_sum += normalized_weight * component_confidence;
            component_estimates.push(DecomposedComponentEstimate {
                food_name: component.food_name().to_owned(),
                original_weight: component.weight(),
                normalized_weight,
                component_kcal,
                matched: true,
                fii: Some(lookup_result.fii()),
                source: Some(lookup_result.source()),
                confidence: Some(lookup_result.confidence()),
                insulin_load: Some(load.item_insulin_load()),
                formula_version: Some(lookup_result.formula_version()),
            });
        } else {
            component_estimates.push(DecomposedComponentEstimate {
                food_name: component.food_name().to_owned(),
                original_weight: component.weight(),
                normalized_weight,
                component_kcal,
                matched: false,
                fii: None,
                source: None,
                confidence: None,
                insulin_load: None,
                formula_version: None,
            });
        }
    }

    if matched_component_count == 0 {
        return Ok(None);
    }

    let component_confidence = if matched_share > 0.0 {
        weighted_component_confidence_sum / matched_share
    } else {
        0.0
    };
    let confidence = decomposition_confidence(matched_share, component_confidence);

    Ok(Some(DecomposedFiiItemEstimate {
        item_kcal,
        item_insulin_load: InsulinLoad::new(insulin_load_total)?,
        source: EstimateSource::MappedFii,
        confidence,
        formula_version: CURRENT_FORMULA_VERSION,
        provenance: DecompositionProvenance {
            original_dish_name: plan.original_dish_name,
            normalized_dish_name: plan.normalized_dish_name,
            rule_kind: plan.rule_kind,
            rule_match: plan.rule_match,
            components: component_estimates,
            matched_share,
            component_confidence,
        },
    }))
}

fn lookup_component_fii(food_name: &str) -> Result<Option<FiiLookupResult>, FiiLookupError> {
    if let Some(result) = lookup_exact_fii(food_name)? {
        return Ok(Some(result));
    }
    lookup_mapped_fii(food_name)
}

fn decomposition_confidence(matched_share: f64, component_confidence: f64) -> f64 {
    (0.2 + (0.6 * matched_share) + (0.2 * component_confidence))
        .clamp(MIN_DECOMPOSITION_CONFIDENCE, MAX_DECOMPOSITION_CONFIDENCE)
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

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    #[test]
    fn phrase_rules_win_in_backend_order() {
        let plan = decompose_food_name_weighted("Chicken biryani rice and chicken")
            .expect("phrase rule should match");

        assert_eq!(plan.rule_kind(), DecompositionRuleKind::Phrase);
        assert_eq!(plan.rule_match(), "chicken biryani");
        assert_eq!(plan.components().len(), 3);
        assert_eq!(plan.components()[0].food_name(), "rice");
        assert_approx_eq(plan.components()[0].weight(), 0.60);
        assert_eq!(plan.components()[1].food_name(), "chicken");
        assert_approx_eq(plan.components()[1].weight(), 0.25);
        assert_eq!(plan.components()[2].food_name(), "oil");
        assert_approx_eq(plan.components()[2].weight(), 0.15);
    }

    #[test]
    fn keyword_rules_match_after_phrase_rules() {
        let plan = decompose_food_name_weighted("spicy vegetable biryani")
            .expect("keyword rule should match");

        assert_eq!(plan.rule_kind(), DecompositionRuleKind::Keyword);
        assert_eq!(plan.rule_match(), "biryani");
        assert_eq!(plan.components().len(), 3);
    }

    #[test]
    fn generic_tokens_are_deduplicated_and_equally_weighted() {
        let plan = decompose_food_name_weighted("banana bread burger")
            .expect("generic token mapping should match");

        assert_eq!(plan.rule_kind(), DecompositionRuleKind::GenericToken);
        assert_eq!(plan.components().len(), 2);
        assert_eq!(plan.components()[0].food_name(), "banana");
        assert_eq!(plan.components()[1].food_name(), "white bread");
        assert_approx_eq(plan.components()[0].weight(), 0.5);
        assert_approx_eq(plan.components()[1].weight(), 0.5);
    }

    #[test]
    fn partial_match_preserves_unmatched_share_and_mapped_source() {
        let estimate =
            calculate_decomposed_fii_item_load("chicken biryani", Kcal::new(520.0).unwrap(), 1.0)
                .unwrap()
                .unwrap();

        assert_approx_eq(estimate.item_insulin_load().value(), 246.48);
        assert_eq!(estimate.source(), EstimateSource::MappedFii);
        assert_ne!(estimate.source(), EstimateSource::ExactFii);
        assert_approx_eq(estimate.confidence(), 0.7);
        assert_approx_eq(estimate.provenance().matched_share(), 0.6);
        assert_approx_eq(estimate.provenance().component_confidence(), 0.7);
        assert_eq!(estimate.provenance().components().len(), 3);
        assert!(estimate.provenance().components()[0].matched());
        assert_eq!(
            estimate.provenance().components()[0].source(),
            Some(EstimateSource::ExactFii)
        );
        assert!(!estimate.provenance().components()[1].matched());
        assert!(!estimate.provenance().components()[2].matched());
    }

    #[test]
    fn filters_invalid_components_before_normalizing_effective_weights() {
        let plan = DecompositionPlan {
            original_dish_name: "synthetic filtered dish".to_owned(),
            normalized_dish_name: "synthetic filtered dish".to_owned(),
            rule_kind: DecompositionRuleKind::GenericToken,
            rule_match: "synthetic_test".to_owned(),
            components: vec![
                WeightedDecompositionComponent::new("", 1.0),
                WeightedDecompositionComponent::new("rice", 0.0),
                WeightedDecompositionComponent::new("rice", -1.0),
                WeightedDecompositionComponent::new("rice", 2.0),
                WeightedDecompositionComponent::new("chicken", 2.0),
            ],
        };

        let estimate = score_decomposition_plan(plan, Kcal::new(200.0).unwrap())
            .unwrap()
            .unwrap();

        assert_eq!(estimate.provenance().components().len(), 2);
        assert_approx_eq(
            estimate.provenance().components()[0].normalized_weight(),
            0.5,
        );
        assert_approx_eq(estimate.provenance().matched_share(), 0.5);
        assert_approx_eq(estimate.item_insulin_load().value(), 79.0);
    }

    #[test]
    fn all_matched_components_use_weighted_confidence_and_upper_clamp() {
        let estimate =
            calculate_decomposed_fii_item_load("dal rice", Kcal::new(260.0).unwrap(), 1.0)
                .unwrap()
                .unwrap();

        assert_approx_eq(estimate.item_insulin_load().value(), 180.83);
        assert_approx_eq(estimate.provenance().matched_share(), 1.0);
        assert_approx_eq(estimate.provenance().component_confidence(), 0.6775);
        assert_approx_eq(estimate.confidence(), 0.90);
    }

    #[test]
    fn confidence_formula_clamps_both_bounds() {
        assert_approx_eq(decomposition_confidence(0.0, 0.0), 0.25);
        assert_approx_eq(decomposition_confidence(1.0, 1.0), 0.90);
        assert_approx_eq(decomposition_confidence(0.6, 0.7), 0.70);
    }

    #[test]
    fn rejects_no_component_and_no_match_paths() {
        assert!(decompose_food_name_weighted("mystery mineral water").is_none());
        assert!(
            calculate_decomposed_fii_item_load("beans", Kcal::new(100.0).unwrap(), 1.0,)
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn rejects_invalid_quantity() {
        for quantity in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let err = calculate_decomposed_fii_item_load(
                "chicken biryani",
                Kcal::new(520.0).unwrap(),
                quantity,
            )
            .unwrap_err();

            assert!(matches!(err, DecompositionError::InvalidValue(_)));
        }
    }
}
