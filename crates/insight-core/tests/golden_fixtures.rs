use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::PathBuf;

use insight_core::{
    calculate_decomposed_fii_item_load, calculate_direct_fii_acute_score,
    calculate_direct_fii_item_load, calculate_direct_fii_meal_totals,
    calculate_exact_fii_item_load, calculate_exact_fii_meal_totals,
    calculate_exact_or_mapped_fii_meal_totals, calculate_macro_fallback_item_load,
    calculate_mapped_fii_item_load, calculate_unified_fii_item_load,
    calculate_unified_fii_meal_totals, lookup_exact_fii, DirectFiiMealItem, EstimateQuality,
    EstimateSource, ExactFiiMealItem, ExactOrMappedFiiMealItem, FiiValue, FormulaVersion, Grams,
    Kcal, MacroFallbackKind, MacroFallbackNutrients, UnifiedFiiItem, REFERENCE_MEAL_INSULIN_LOAD,
};
use serde::Deserialize;
use serde_json::Value;

const EXPECTED_SCHEMA_VERSION: u64 = 1;
const EXPECTED_FORMULA_VERSION: &str = "current_backend_v1";
const EXPECTED_GENERATOR: &str = "python -m validation.export_golden_fixtures";
const EXPECTED_WARNING: &str =
    "Implementation parity fixtures only; passing parity is not scientific validation.";
const KNOWN_SOURCE_LABELS: &[&str] = &[
    "exact_fii",
    "mapped_fii",
    "macro_fallback",
    "user_confirmed",
    "unknown",
];

#[derive(Debug)]
struct DirectFiiSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const DIRECT_FII_SKIP_REASONS: &[DirectFiiSkipReason] = &[
    DirectFiiSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals excluding ranking_cake_icecream",
        reason: "items have no explicit fii and require GI/protein fallback, FII lookup, or mixed-meal decomposition",
    },
    DirectFiiSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants[*]",
        reason: "items have no explicit fii and intentionally exercise exact lookup, mapped lookup, and macro fallback source hierarchy",
    },
    DirectFiiSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "chicken biryani items have no explicit fii and require mixed-meal decomposition or mapped FII",
    },
    DirectFiiSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.low_day_meal and expected rolling chronic outputs",
        reason: "low day requires macro fallback and rolling outputs require chronic DIL/DII behavior",
    },
    DirectFiiSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.mixed_meal and input.payload.control_meal",
        reason: "case requires exact lookup, mapped FII, macro fallback, unknown fallback, confidence degradation, and estimate-quality aggregation",
    },
];

#[derive(Debug)]
struct DirectFiiAcuteSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const DIRECT_FII_ACUTE_SKIP_REASONS: &[DirectFiiAcuteSkipReason] = &[
    DirectFiiAcuteSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals excluding ranking_cake_icecream",
        reason: "items have no explicit fii and require GI/protein fallback, FII lookup, mapped FII, or mixed-meal decomposition",
    },
    DirectFiiAcuteSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants[*]",
        reason: "items have no explicit fii and intentionally exercise exact lookup, mapped lookup, and macro fallback source hierarchy",
    },
    DirectFiiAcuteSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "chicken biryani items have no explicit fii and require mixed-meal decomposition or mapped FII",
    },
    DirectFiiAcuteSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal, input.payload.low_day_meal, and expected rolling chronic outputs",
        reason: "high_day_meal lacks an explicit expected acute_score, low_day_meal requires macro fallback, and rolling outputs require chronic DIL/DII behavior",
    },
    DirectFiiAcuteSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.mixed_meal and input.payload.control_meal",
        reason: "case requires exact lookup, mapped FII, macro fallback, unknown fallback, confidence degradation, and estimate-quality aggregation",
    },
];

#[derive(Debug)]
struct ExactFiiLookupSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const EXACT_FII_LOOKUP_SUPPORTED_PATHS: &[&str] = &["cases/source_quality_hierarchy_01.json"];

const EXACT_FII_LOOKUP_SKIP_REASONS: &[ExactFiiLookupSkipReason] = &[
    ExactFiiLookupSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals[*]",
        reason: "ranking_cake_icecream uses direct provided FII, while the remaining meals require mapped FII, mixed-meal decomposition, or fallback scoring",
    },
    ExactFiiLookupSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants excluding source_exact_fii",
        reason: "source_mapped_fii requires mapped or fuzzy lookup and source_macro_fallback requires macro fallback",
    },
    ExactFiiLookupSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "chicken biryani requires mixed-meal decomposition or mapped FII",
    },
    ExactFiiLookupSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal, input.payload.low_day_meal, and expected rolling chronic outputs",
        reason: "high_day_meal uses direct provided FII, low_day_meal requires fallback scoring, and rolling outputs require chronic DIL/DII behavior",
    },
    ExactFiiLookupSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.control_meal and input.payload.mixed_meal",
        reason: "the fixture combines exact lookup with mapped FII, fallback, unknown, confidence degradation, and estimate-quality aggregation",
    },
];

#[derive(Debug)]
struct ExactFiiItemLoadSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const EXACT_FII_ITEM_LOAD_SUPPORTED_PATHS: &[&str] = &["cases/source_quality_hierarchy_01.json"];

const EXACT_FII_ITEM_LOAD_SKIP_REASONS: &[ExactFiiItemLoadSkipReason] = &[
    ExactFiiItemLoadSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals[*]",
        reason: "ranking_cake_icecream uses direct provided FII, while the remaining items require mapped FII, mixed-meal decomposition, or fallback scoring",
    },
    ExactFiiItemLoadSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants excluding source_exact_fii",
        reason: "source_mapped_fii requires mapped or fuzzy lookup and source_macro_fallback requires macro fallback",
    },
    ExactFiiItemLoadSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "chicken biryani requires mixed-meal decomposition or mapped FII",
    },
    ExactFiiItemLoadSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal, input.payload.low_day_meal, and expected rolling chronic outputs",
        reason: "high_day_meal uses direct provided FII, low_day_meal requires fallback scoring, and rolling outputs require chronic DIL/DII behavior",
    },
    ExactFiiItemLoadSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.control_meal and input.payload.mixed_meal",
        reason: "the fixture combines exact lookup with mapped FII, fallback, unknown, confidence degradation, and estimate-quality aggregation without an isolated exact-FII item-load expectation",
    },
];

#[derive(Debug)]
struct ExactFiiMealSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const EXACT_FII_MEAL_SUPPORTED_PATHS: &[&str] = &[
    "cases/source_quality_hierarchy_01.json",
    "cases/uncertainty_degradation_01.json",
];

const EXACT_FII_MEAL_SKIP_REASONS: &[ExactFiiMealSkipReason] = &[
    ExactFiiMealSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals[*]",
        reason: "ranking_cake_icecream uses direct provided FII, while the remaining meals require mapped FII, mixed-meal decomposition, or fallback scoring",
    },
    ExactFiiMealSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants excluding source_exact_fii",
        reason: "source_mapped_fii requires mapped or fuzzy lookup and source_macro_fallback requires macro fallback",
    },
    ExactFiiMealSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "chicken biryani requires mixed-meal decomposition or mapped FII",
    },
    ExactFiiMealSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal, input.payload.low_day_meal, and expected rolling chronic outputs",
        reason: "high_day_meal uses direct provided FII, low_day_meal requires fallback scoring, and rolling outputs require chronic DIL/DII behavior",
    },
    ExactFiiMealSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.mixed_meal",
        reason: "mixed_meal combines exact lookup with mapped FII, macro fallback, unknown fallback, confidence degradation, and estimate-quality aggregation",
    },
];

#[derive(Debug)]
struct MappedFiiItemSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const MAPPED_FII_ITEM_SKIP_REASONS: &[MappedFiiItemSkipReason] = &[
    MappedFiiItemSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals[*]",
        reason: "mapped ranking items require mixed-meal decomposition; the remaining items use macro fallback or direct provided FII",
    },
    MappedFiiItemSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants[*]",
        reason: "source_mapped_fii uses the explicit greek-yogurt-bowl decomposition rule, while the other variants use exact lookup or macro fallback",
    },
    MappedFiiItemSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "all chicken biryani items require mixed-meal decomposition",
    },
    MappedFiiItemSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal, input.payload.low_day_meal, and expected rolling chronic outputs",
        reason: "the meals use direct provided FII or macro fallback, and the expected outputs require chronic DIL/DII behavior",
    },
    MappedFiiItemSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.control_meal and input.payload.mixed_meal",
        reason: "the control uses exact lookup and the mapped mixed-meal item requires decomposition alongside fallback and unknown paths",
    },
];

#[derive(Debug)]
struct ExactOrMappedFiiMealSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const EXACT_OR_MAPPED_FII_MEAL_SUPPORTED_PATHS: &[&str] = &[
    "cases/source_quality_hierarchy_01.json",
    "cases/uncertainty_degradation_01.json",
];

const EXACT_OR_MAPPED_FII_MEAL_SKIP_REASONS: &[ExactOrMappedFiiMealSkipReason] = &[
    ExactOrMappedFiiMealSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals[*]",
        reason: "ranking_cake_icecream uses direct provided FII, while the remaining meals require mixed-meal decomposition or fallback scoring",
    },
    ExactOrMappedFiiMealSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants excluding source_exact_fii",
        reason: "source_mapped_fii requires the explicit greek-yogurt-bowl decomposition rule and source_macro_fallback requires macro fallback",
    },
    ExactOrMappedFiiMealSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "all chicken biryani items require mixed-meal decomposition",
    },
    ExactOrMappedFiiMealSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal, input.payload.low_day_meal, and expected rolling chronic outputs",
        reason: "the meals use direct provided FII or macro fallback, and the expected outputs require chronic DIL/DII behavior",
    },
    ExactOrMappedFiiMealSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.mixed_meal",
        reason: "mixed_meal requires decomposition, macro fallback, unknown fallback, confidence degradation, and estimate-quality aggregation",
    },
];

#[derive(Debug)]
struct UnifiedFiiSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const UNIFIED_FII_SUPPORTED_PATHS: &[&str] = &[
    "cases/ranking_relative_01.json",
    "cases/source_quality_hierarchy_01.json",
    "cases/monotonicity_biryani_portion_01.json",
    "cases/chronic_low_then_high_01.json",
    "cases/uncertainty_degradation_01.json",
];

const UNIFIED_FII_SKIP_REASONS: &[UnifiedFiiSkipReason] = &[UnifiedFiiSkipReason {
    fixture_path: "cases/chronic_low_then_high_01.json",
    input_path: "expected rolling chronic outputs",
    reason: "rolling outputs require chronic DIL/DII behavior",
}];

#[derive(Debug)]
struct EstimateQualitySkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const ESTIMATE_QUALITY_SUPPORTED_PATHS: &[&str] = &[
    "cases/source_quality_hierarchy_01.json",
    "cases/uncertainty_degradation_01.json",
];

const ESTIMATE_QUALITY_SKIP_REASONS: &[EstimateQualitySkipReason] = &[
    EstimateQualitySkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "expected.estimate_quality",
        reason: "top-level composite is multi-meal validation metadata, not a product meal estimate-quality category",
    },
    EstimateQualitySkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "expected.estimate_quality",
        reason: "top-level composite is multi-meal validation metadata, not a product meal estimate-quality category",
    },
    EstimateQualitySkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "expected.estimate_quality and expected rolling chronic outputs",
        reason: "top-level composite is validation metadata and rolling outputs require unported chronic DIL/DII behavior",
    },
];

#[derive(Debug)]
struct ValidationMeanConfidenceSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const VALIDATION_MEAN_CONFIDENCE_SUPPORTED_PATHS: &[&str] = &[
    "cases/source_quality_hierarchy_01.json",
    "cases/uncertainty_degradation_01.json",
];

const VALIDATION_MEAN_CONFIDENCE_SKIP_REASONS: &[ValidationMeanConfidenceSkipReason] = &[
    ValidationMeanConfidenceSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "expected.actual_scores",
        reason: "the fixture exports ranking scores but no mean_confidence expectation",
    },
    ValidationMeanConfidenceSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "expected.actual_scores",
        reason: "the fixture exports monotonicity scores but no mean_confidence expectation",
    },
    ValidationMeanConfidenceSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "expected.actual_scores and expected rolling chronic outputs",
        reason: "the fixture exports no mean_confidence expectation and chronic DIL/DII remains unported",
    },
];

#[derive(Debug)]
struct DecompositionSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const DECOMPOSITION_SUPPORTED_PATHS: &[&str] = &[
    "cases/ranking_relative_01.json",
    "cases/source_quality_hierarchy_01.json",
    "cases/monotonicity_biryani_portion_01.json",
    "cases/uncertainty_degradation_01.json",
];

const DECOMPOSITION_SKIP_REASONS: &[DecompositionSkipReason] = &[
    DecompositionSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals.ranking_salad and ranking_cake_icecream",
        reason: "these meals use macro fallback and provided FII rather than decomposition",
    },
    DecompositionSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants excluding source_mapped_fii",
        reason: "the remaining variants use exact lookup or macro fallback",
    },
    DecompositionSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload and expected rolling chronic outputs",
        reason: "the fixture has no decomposition item and its rolling outputs require chronic DIL/DII",
    },
    DecompositionSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.mixed_meal excluding chicken biryani and all complete-meal outputs",
        reason: "the remaining items use exact lookup, macro fallback, or unported unknown fallback; complete outputs also aggregate confidence and estimate quality",
    },
];

#[derive(Debug)]
struct MacroFallbackSkipReason {
    fixture_path: &'static str,
    input_path: &'static str,
    reason: &'static str,
}

const MACRO_FALLBACK_SUPPORTED_PATHS: &[&str] = &[
    "cases/ranking_relative_01.json",
    "cases/source_quality_hierarchy_01.json",
    "cases/chronic_low_then_high_01.json",
];

const MACRO_FALLBACK_SKIP_REASONS: &[MacroFallbackSkipReason] = &[
    MacroFallbackSkipReason {
        fixture_path: "cases/ranking_relative_01.json",
        input_path: "input.payload.meals excluding ranking_salad",
        reason: "the remaining meals use mixed-dish decomposition or provided FII",
    },
    MacroFallbackSkipReason {
        fixture_path: "cases/source_quality_hierarchy_01.json",
        input_path: "input.payload.variants excluding source_macro_fallback",
        reason: "the remaining variants use exact lookup or mixed-dish decomposition",
    },
    MacroFallbackSkipReason {
        fixture_path: "cases/monotonicity_biryani_portion_01.json",
        input_path: "input.payload.meals[*]",
        reason: "all chicken biryani meals require mixed-dish decomposition",
    },
    MacroFallbackSkipReason {
        fixture_path: "cases/chronic_low_then_high_01.json",
        input_path: "input.payload.high_day_meal and expected rolling chronic outputs",
        reason: "high_day_meal uses provided FII and rolling outputs require chronic DIL/DII behavior",
    },
    MacroFallbackSkipReason {
        fixture_path: "cases/uncertainty_degradation_01.json",
        input_path: "input.payload.mixed_meal",
        reason: "the isolated macro API remains non-mixed; unified fallback after a decomposition miss is covered separately, while the full meal still requires unknown and aggregate-quality behavior",
    },
];

#[derive(Debug, Deserialize)]
struct GoldenIndex {
    cases: Vec<GoldenIndexCase>,
    formula_version: String,
    generated_by: String,
    schema_version: u64,
    warning: String,
}

#[derive(Debug, Deserialize)]
struct GoldenIndexCase {
    case_id: String,
    description: String,
    kind: String,
    path: String,
}

#[derive(Debug, Deserialize)]
struct GoldenFixture {
    case_id: String,
    description: String,
    expected: GoldenExpected,
    formula_version: String,
    generated_by: String,
    input: serde_json::Value,
    kind: String,
    schema_version: u64,
    warning: String,
}

#[derive(Debug, Deserialize)]
struct GoldenExpected {
    actual_scores: serde_json::Value,
    details: serde_json::Value,
    estimate_quality: String,
    failure_reason: Option<String>,
    kind: String,
    pass: bool,
    source_labels: Vec<String>,
    test_id: String,
}

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/golden")
}

fn read_golden_index() -> GoldenIndex {
    let index_path = fixtures_dir().join("index.json");
    let index_text = fs::read_to_string(&index_path).expect("index fixture should be readable");
    serde_json::from_str(&index_text).expect("index fixture should deserialize")
}

fn read_golden_fixture(relative_path: &str) -> GoldenFixture {
    let fixture_path = fixtures_dir().join(relative_path);
    let fixture_text = fs::read_to_string(&fixture_path).expect("case fixture should be readable");
    serde_json::from_str(&fixture_text).expect("case fixture should deserialize")
}

#[test]
fn golden_fixtures_deserialize_and_match_index() {
    let fixtures_dir = fixtures_dir();
    let index = read_golden_index();

    assert_eq!(index.schema_version, EXPECTED_SCHEMA_VERSION);
    assert_eq!(index.formula_version, EXPECTED_FORMULA_VERSION);
    assert_eq!(index.generated_by, EXPECTED_GENERATOR);
    assert_eq!(index.warning, EXPECTED_WARNING);
    assert_eq!(index.cases.len(), 5);

    let known_source_labels: BTreeSet<&str> = KNOWN_SOURCE_LABELS.iter().copied().collect();
    let mut seen_case_ids = BTreeSet::new();
    let mut indexed_paths = BTreeSet::new();

    for index_case in &index.cases {
        assert!(!index_case.case_id.is_empty());
        assert!(!index_case.description.is_empty());
        assert!(!index_case.kind.is_empty());
        assert!(seen_case_ids.insert(index_case.case_id.clone()));
        assert!(indexed_paths.insert(index_case.path.clone()));

        let fixture = read_golden_fixture(&index_case.path);

        assert_eq!(fixture.schema_version, EXPECTED_SCHEMA_VERSION);
        assert_eq!(fixture.formula_version, EXPECTED_FORMULA_VERSION);
        assert_eq!(fixture.generated_by, EXPECTED_GENERATOR);
        assert_eq!(fixture.warning, EXPECTED_WARNING);
        assert_eq!(fixture.case_id, index_case.case_id);
        assert_eq!(fixture.kind, index_case.kind);
        assert_eq!(fixture.description, index_case.description);
        assert_eq!(fixture.expected.test_id, fixture.case_id);
        assert_eq!(fixture.expected.kind, fixture.kind);
        assert!(fixture.expected.pass);
        assert!(fixture.input.is_object());
        assert!(fixture.expected.actual_scores.is_object());
        assert!(fixture.expected.details.is_object());
        assert!(!fixture.expected.estimate_quality.is_empty());
        assert!(fixture.expected.failure_reason.is_none());

        for source_label in &fixture.expected.source_labels {
            assert!(
                known_source_labels.contains(source_label.as_str()),
                "unknown source label {source_label:?} in {}",
                fixture.case_id
            );
        }
    }

    let case_dir = fixtures_dir.join("cases");
    let actual_paths: BTreeSet<String> = fs::read_dir(&case_dir)
        .expect("case fixture directory should be readable")
        .map(|entry| {
            let entry = entry.expect("case fixture entry should be readable");
            format!("cases/{}", entry.file_name().to_string_lossy())
        })
        .collect();

    let indexed_paths_by_case: BTreeMap<&str, &str> = index
        .cases
        .iter()
        .map(|case| (case.case_id.as_str(), case.path.as_str()))
        .collect();
    assert!(indexed_paths_by_case.contains_key("ranking_relative_01"));
    assert!(indexed_paths_by_case.contains_key("source_quality_hierarchy_01"));
    assert!(indexed_paths_by_case.contains_key("monotonicity_biryani_portion_01"));
    assert!(indexed_paths_by_case.contains_key("chronic_low_then_high_01"));
    assert!(indexed_paths_by_case.contains_key("uncertainty_degradation_01"));
    assert_eq!(actual_paths, indexed_paths);
}

#[test]
fn direct_fii_item_load_matches_supported_golden_fixture_items() {
    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    let ranking_item = find_array_meal_item(
        &ranking_fixture.input,
        "meals",
        "ranking_cake_icecream",
        "cake and ice cream",
    );
    assert_direct_fii_fixture_item_matches_expected_total(
        &ranking_fixture,
        ranking_item,
        expected_nested_score(
            &ranking_fixture.expected.actual_scores,
            "ranking_cake_icecream",
            "insulin_load_total",
        ),
    );

    let chronic_fixture = read_golden_fixture("cases/chronic_low_then_high_01.json");
    let chronic_payload = payload_object(&chronic_fixture.input);
    let chronic_high_day_meal = chronic_payload
        .get("high_day_meal")
        .expect("chronic fixture should include high_day_meal");
    let chronic_item = find_meal_item(chronic_high_day_meal, "cake and ice cream");
    assert_direct_fii_fixture_item_matches_expected_total(
        &chronic_fixture,
        chronic_item,
        expected_score(
            &chronic_fixture.expected.actual_scores,
            "high_day_insulin_load_total",
        ),
    );
}

#[test]
fn direct_fii_meal_aggregation_matches_supported_golden_fixture_meals() {
    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    let ranking_meal = find_array_meal(&ranking_fixture.input, "meals", "ranking_cake_icecream");
    assert_direct_fii_fixture_meal_matches_expected_total(
        &ranking_fixture,
        ranking_meal,
        expected_nested_score(
            &ranking_fixture.expected.actual_scores,
            "ranking_cake_icecream",
            "insulin_load_total",
        ),
    );

    let chronic_fixture = read_golden_fixture("cases/chronic_low_then_high_01.json");
    let chronic_payload = payload_object(&chronic_fixture.input);
    let chronic_high_day_meal = chronic_payload
        .get("high_day_meal")
        .expect("chronic fixture should include high_day_meal");
    assert_direct_fii_fixture_meal_matches_expected_total(
        &chronic_fixture,
        chronic_high_day_meal,
        expected_score(
            &chronic_fixture.expected.actual_scores,
            "high_day_insulin_load_total",
        ),
    );
}

#[test]
fn direct_fii_acute_score_matches_supported_golden_fixture_meal() {
    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    let ranking_meal = find_array_meal(&ranking_fixture.input, "meals", "ranking_cake_icecream");
    assert_direct_fii_fixture_meal_matches_expected_acute_score(
        &ranking_fixture,
        ranking_meal,
        expected_nested_score(
            &ranking_fixture.expected.actual_scores,
            "ranking_cake_icecream",
            "acute_score",
        ),
    );
}

#[test]
fn exact_fii_lookup_matches_supported_golden_fixture_item() {
    let fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let exact_variant = find_array_meal(&fixture.input, "variants", "source_exact_fii");
    let item = find_meal_item(exact_variant, "plain yogurt");

    assert!(item.get("fii").is_some_and(Value::is_null));

    let result = lookup_exact_fii(string_field(item, "name"))
        .unwrap()
        .expect("plain yogurt should be an exact alias lookup fixture item");

    assert_eq!(result.source(), EstimateSource::ExactFii);
    assert_eq!(result.source().as_str(), "exact_fii");
    assert_eq!(result.formula_version(), FormulaVersion::CurrentBackendV1);
    assert_approx_eq(result.fii().value(), 60.0);
    assert_approx_eq(
        result.confidence(),
        expected_nested_score(
            &fixture.expected.actual_scores,
            "source_exact_fii",
            "mean_confidence",
        ),
    );
    assert!(
        fixture
            .expected
            .source_labels
            .iter()
            .any(|source| source == result.source().as_str()),
        "{} should include exact FII source label {:?}",
        fixture.case_id,
        result.source().as_str()
    );
}

#[test]
fn exact_fii_item_load_matches_supported_golden_fixture_item() {
    let fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let exact_variant = find_array_meal(&fixture.input, "variants", "source_exact_fii");
    let item = find_meal_item(exact_variant, "plain yogurt");

    assert!(item.get("fii").is_some_and(Value::is_null));

    let estimate = calculate_exact_fii_item_load(
        string_field(item, "name"),
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
    )
    .unwrap()
    .expect("plain yogurt should use the exact-FII item-load path");

    let expected_insulin_load = expected_nested_score(
        &fixture.expected.actual_scores,
        "source_exact_fii",
        "acute_score",
    ) * REFERENCE_MEAL_INSULIN_LOAD
        / 100.0;

    assert_approx_eq(estimate.item_kcal().value(), 180.0);
    assert_approx_eq(estimate.looked_up_fii().value(), 60.0);
    assert_approx_eq(estimate.item_insulin_load().value(), expected_insulin_load);
    assert_eq!(estimate.source(), EstimateSource::ExactFii);
    assert_eq!(estimate.source().as_str(), "exact_fii");
    assert_approx_eq(
        estimate.confidence(),
        expected_nested_score(
            &fixture.expected.actual_scores,
            "source_exact_fii",
            "mean_confidence",
        ),
    );
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(
        fixture
            .expected
            .source_labels
            .iter()
            .any(|source| source == estimate.source().as_str()),
        "{} should include exact FII source label {:?}",
        fixture.case_id,
        estimate.source().as_str()
    );
}

#[test]
fn exact_fii_meal_aggregation_matches_supported_golden_fixture_meals() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let source_exact_meal = find_array_meal(&source_fixture.input, "variants", "source_exact_fii");
    assert_exact_fii_fixture_meal_matches_expected(
        &source_fixture,
        source_exact_meal,
        "source_exact_fii",
    );

    let uncertainty_fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let uncertainty_payload = payload_object(&uncertainty_fixture.input);
    let exact_control_meal = uncertainty_payload
        .get("control_meal")
        .expect("uncertainty fixture should include control_meal");
    assert_exact_fii_fixture_meal_matches_expected(
        &uncertainty_fixture,
        exact_control_meal,
        "control_meal",
    );
}

#[test]
fn exact_or_mapped_fii_meal_aggregation_matches_supported_golden_fixture_meals() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let source_exact_meal = find_array_meal(&source_fixture.input, "variants", "source_exact_fii");
    assert_exact_or_mapped_fii_fixture_meal_matches_expected(
        &source_fixture,
        source_exact_meal,
        "source_exact_fii",
    );

    let uncertainty_fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let uncertainty_payload = payload_object(&uncertainty_fixture.input);
    let exact_control_meal = uncertainty_payload
        .get("control_meal")
        .expect("uncertainty fixture should include control_meal");
    assert_exact_or_mapped_fii_fixture_meal_matches_expected(
        &uncertainty_fixture,
        exact_control_meal,
        "control_meal",
    );
}

#[test]
fn unified_fii_provided_paths_match_supported_golden_fixtures() {
    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    let ranking_meal = find_array_meal(&ranking_fixture.input, "meals", "ranking_cake_icecream");
    let ranking_item = find_meal_item(ranking_meal, "cake and ice cream");
    let item = unified_fii_item(ranking_item);
    let item_estimate = calculate_unified_fii_item_load(&item)
        .unwrap()
        .expect("ranking cake item should use provided FII");
    let ranking_expected_load = expected_nested_score(
        &ranking_fixture.expected.actual_scores,
        "ranking_cake_icecream",
        "insulin_load_total",
    );

    assert_approx_eq(item_estimate.item_kcal().value(), 450.0);
    assert_approx_eq(item_estimate.resolved_fii().unwrap().value(), 110.0);
    assert_approx_eq(
        item_estimate.item_insulin_load().value(),
        ranking_expected_load,
    );
    assert_eq!(item_estimate.source(), EstimateSource::UserConfirmed);
    assert_approx_eq(item_estimate.confidence(), 1.0);
    assert_eq!(
        item_estimate.formula_version(),
        FormulaVersion::CurrentBackendV1
    );

    let ranking_estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(ranking_meal))
        .unwrap()
        .expect("ranking cake meal should use provided FII");
    assert_approx_eq(
        ranking_estimate.meal_insulin_load_total().value(),
        ranking_expected_load,
    );
    assert_approx_eq(
        ranking_estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD * 100.0,
        expected_nested_score(
            &ranking_fixture.expected.actual_scores,
            "ranking_cake_icecream",
            "acute_score",
        ),
    );

    let chronic_fixture = read_golden_fixture("cases/chronic_low_then_high_01.json");
    let chronic_payload = payload_object(&chronic_fixture.input);
    let high_day_meal = chronic_payload
        .get("high_day_meal")
        .expect("chronic fixture should include high_day_meal");
    let high_day_estimate =
        calculate_unified_fii_meal_totals(&unified_fii_meal_items(high_day_meal))
            .unwrap()
            .expect("chronic high day should use provided FII");

    assert_approx_eq(
        high_day_estimate.meal_insulin_load_total().value(),
        expected_score(
            &chronic_fixture.expected.actual_scores,
            "high_day_insulin_load_total",
        ),
    );
    assert!(high_day_estimate
        .item_estimates()
        .iter()
        .all(|item| item.source() == EstimateSource::UserConfirmed && item.confidence() == 1.0));
}

#[test]
fn unified_fii_lookup_paths_match_supported_golden_fixtures() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let source_exact_meal = find_array_meal(&source_fixture.input, "variants", "source_exact_fii");
    assert_unified_fii_fixture_meal_matches_expected(
        &source_fixture,
        source_exact_meal,
        "source_exact_fii",
    );

    let uncertainty_fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let uncertainty_payload = payload_object(&uncertainty_fixture.input);
    let exact_control_meal = uncertainty_payload
        .get("control_meal")
        .expect("uncertainty fixture should include control_meal");
    assert_unified_fii_fixture_meal_matches_expected(
        &uncertainty_fixture,
        exact_control_meal,
        "control_meal",
    );
}

#[test]
fn isolated_macro_fallback_matches_supported_golden_fixture_items() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let source_meal = find_array_meal(&source_fixture.input, "variants", "source_macro_fallback");
    let source_item = find_meal_item(source_meal, "cultured dairy cup");
    assert_macro_fallback_fixture_item_matches_expected(
        source_item,
        expected_nested_score(
            &source_fixture.expected.actual_scores,
            "source_macro_fallback",
            "acute_score",
        ) / 100.0
            * REFERENCE_MEAL_INSULIN_LOAD,
        expected_nested_score(
            &source_fixture.expected.actual_scores,
            "source_macro_fallback",
            "mean_confidence",
        ),
    );

    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    let ranking_meal = find_array_meal(&ranking_fixture.input, "meals", "ranking_salad");
    assert_macro_fallback_fixture_item_matches_expected(
        find_meal_item(ranking_meal, "garden salad"),
        expected_nested_score(
            &ranking_fixture.expected.actual_scores,
            "ranking_salad",
            "insulin_load_total",
        ),
        0.8,
    );

    let chronic_fixture = read_golden_fixture("cases/chronic_low_then_high_01.json");
    let low_day_meal = payload_object(&chronic_fixture.input)
        .get("low_day_meal")
        .expect("chronic fixture should include low_day_meal");
    assert_macro_fallback_fixture_item_matches_expected(
        find_meal_item(low_day_meal, "garden salad"),
        expected_score(
            &chronic_fixture.expected.actual_scores,
            "low_day_insulin_load_total",
        ),
        0.8,
    );
}

#[test]
fn unified_fii_macro_paths_match_supported_golden_fixtures() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let source_meal = find_array_meal(&source_fixture.input, "variants", "source_macro_fallback");
    assert_unified_fii_fixture_meal_matches_expected(
        &source_fixture,
        source_meal,
        "source_macro_fallback",
    );

    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    let ranking_meal = find_array_meal(&ranking_fixture.input, "meals", "ranking_salad");
    assert_unified_fii_fixture_meal_matches_expected(
        &ranking_fixture,
        ranking_meal,
        "ranking_salad",
    );

    let chronic_fixture = read_golden_fixture("cases/chronic_low_then_high_01.json");
    let low_day_meal = payload_object(&chronic_fixture.input)
        .get("low_day_meal")
        .expect("chronic fixture should include low_day_meal");
    let estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(low_day_meal))
        .unwrap()
        .expect("chronic low day should resolve through macro fallback");

    assert_eq!(estimate.item_estimates().len(), 1);
    assert_eq!(
        estimate.item_estimates()[0].source(),
        EstimateSource::MacroFallback
    );
    assert_eq!(estimate.item_estimates()[0].resolved_fii(), None);
    assert_eq!(
        estimate.item_estimates()[0].macro_fallback_kind(),
        Some(MacroFallbackKind::GiCarbProtein)
    );
    assert_approx_eq(
        estimate.meal_insulin_load_total().value(),
        expected_score(
            &chronic_fixture.expected.actual_scores,
            "low_day_insulin_load_total",
        ),
    );
}

#[test]
fn decomposition_matches_supported_ranking_and_source_fixtures() {
    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    for meal_id in [
        "ranking_dal_meal",
        "ranking_rice_chicken",
        "ranking_chicken_biryani",
    ] {
        let meal = find_array_meal(&ranking_fixture.input, "meals", meal_id);
        assert_decomposition_fixture_meal_matches_expected(&ranking_fixture, meal, meal_id, None);
    }

    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let source_meal = find_array_meal(&source_fixture.input, "variants", "source_mapped_fii");
    assert_decomposition_fixture_meal_matches_expected(
        &source_fixture,
        source_meal,
        "source_mapped_fii",
        Some(expected_nested_score(
            &source_fixture.expected.actual_scores,
            "source_mapped_fii",
            "mean_confidence",
        )),
    );
}

#[test]
fn decomposition_matches_biryani_monotonicity_fixture() {
    let fixture = read_golden_fixture("cases/monotonicity_biryani_portion_01.json");
    for meal_id in ["mono_biryani_0_5x", "mono_biryani_1x", "mono_biryani_1_5x"] {
        let meal = find_array_meal(&fixture.input, "meals", meal_id);
        assert_decomposition_fixture_meal_matches_expected(&fixture, meal, meal_id, None);
    }
}

#[test]
fn decomposition_isolates_uncertainty_biryani_without_aggregate_behavior() {
    let uncertainty_fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let mixed_meal = payload_object(&uncertainty_fixture.input)
        .get("mixed_meal")
        .expect("uncertainty fixture should include mixed_meal");
    let biryani_item = find_meal_item(mixed_meal, "chicken biryani");
    let estimate = calculate_decomposed_fii_item_load(
        string_field(biryani_item, "name"),
        Kcal::new(number_field(biryani_item, "kcal_per_unit")).unwrap(),
        number_field(biryani_item, "quantity"),
    )
    .unwrap()
    .expect("uncertainty biryani should decompose in isolation");

    let ranking_fixture = read_golden_fixture("cases/ranking_relative_01.json");
    assert_approx_eq(
        estimate.item_insulin_load().value(),
        expected_nested_score(
            &ranking_fixture.expected.actual_scores,
            "ranking_chicken_biryani",
            "insulin_load_total",
        ),
    );
    assert_eq!(estimate.source(), EstimateSource::MappedFii);
    assert_ne!(estimate.source(), EstimateSource::ExactFii);
    assert_approx_eq(estimate.provenance().matched_share(), 0.6);
}

#[test]
fn mapped_fii_item_path_rejects_decomposition_only_golden_fixture_item() {
    let fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let mapped_variant = find_array_meal(&fixture.input, "variants", "source_mapped_fii");
    let item = find_meal_item(mapped_variant, "greek yogurt bowl");

    assert!(item.get("fii").is_some_and(Value::is_null));
    assert!(calculate_mapped_fii_item_load(
        string_field(item, "name"),
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
    )
    .unwrap()
    .is_none());
}

#[test]
fn exact_or_mapped_fii_meal_path_rejects_decomposition_only_golden_fixture() {
    let fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let mapped_variant = find_array_meal(&fixture.input, "variants", "source_mapped_fii");
    let items = exact_or_mapped_fii_meal_items(mapped_variant);

    assert!(calculate_exact_or_mapped_fii_meal_totals(&items)
        .unwrap()
        .is_none());
}

#[test]
fn unified_fii_path_supports_decomposition_golden_fixture() {
    let fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    let mapped_variant = find_array_meal(&fixture.input, "variants", "source_mapped_fii");

    let estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(mapped_variant))
        .unwrap()
        .expect("unified path should now support Greek yogurt bowl decomposition");

    assert_eq!(estimate.item_estimates().len(), 1);
    assert_eq!(
        estimate.item_estimates()[0].source(),
        EstimateSource::MappedFii
    );
    assert!(estimate.item_estimates()[0].decomposition().is_some());
    assert_eq!(estimate.item_estimates()[0].resolved_fii(), None);
}

#[test]
fn macro_fallback_rejects_mixed_uncertainty_fixture_item() {
    let fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let mixed_meal = payload_object(&fixture.input)
        .get("mixed_meal")
        .expect("uncertainty fixture should include mixed_meal");
    let item = find_meal_item(mixed_meal, "fallback carb bowl");

    assert!(calculate_macro_fallback_item_load(
        string_field(item, "name"),
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
        macro_fallback_nutrients(item),
    )
    .unwrap()
    .is_none());
    let unified = calculate_unified_fii_item_load(&unified_fii_item(item))
        .unwrap()
        .expect("unified path should reach macro fallback after decomposition misses");
    assert_eq!(unified.source(), EstimateSource::MacroFallback);
    assert_approx_eq(unified.item_insulin_load().value(), 12.9);
    assert!(unified.decomposition().is_none());
}

#[test]
fn unified_fii_unknown_fallback_matches_isolated_golden_fixture_item() {
    let fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let mixed_meal = payload_object(&fixture.input)
        .get("mixed_meal")
        .expect("uncertainty fixture should include mixed_meal");
    let item = find_meal_item(mixed_meal, "mystery mineral water");

    let estimate = calculate_unified_fii_item_load(&unified_fii_item(item))
        .unwrap()
        .expect("unresolved fixture item should use terminal unknown fallback");

    assert_approx_eq(estimate.item_kcal().value(), 0.0);
    assert_approx_eq(estimate.item_insulin_load().value(), 0.0);
    assert_eq!(estimate.source(), EstimateSource::Unknown);
    assert_approx_eq(estimate.confidence(), 0.2);
    assert_eq!(estimate.resolved_fii(), None);
    assert_eq!(estimate.macro_fallback_kind(), None);
    assert_eq!(estimate.decomposition(), None);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
}

#[test]
fn unified_fii_complete_uncertainty_meal_retains_unknown_with_low_estimate_quality() {
    let fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let mixed_meal = payload_object(&fixture.input)
        .get("mixed_meal")
        .expect("uncertainty fixture should include mixed_meal");

    let estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(mixed_meal))
        .unwrap()
        .expect("terminal unknown should keep the complete fixture meal resolvable");

    let sources: Vec<EstimateSource> = estimate
        .item_estimates()
        .iter()
        .map(|item| item.source())
        .collect();
    assert_eq!(
        sources,
        vec![
            EstimateSource::ExactFii,
            EstimateSource::MappedFii,
            EstimateSource::MacroFallback,
            EstimateSource::Unknown,
        ]
    );
    assert_eq!(estimate.item_estimates()[3].resolved_fii(), None);
    assert_approx_eq(
        estimate.item_estimates()[3].item_insulin_load().value(),
        0.0,
    );

    let acute_score =
        estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD * 100.0;
    assert_approx_eq(
        round_to_four_places(acute_score),
        expected_nested_score(&fixture.expected.actual_scores, "mixed_meal", "acute_score"),
    );
    assert_eq!(estimate.estimate_quality(), EstimateQuality::Low);
}

#[test]
fn validation_mean_confidence_preserves_empty_zero_and_full_precision_behavior() {
    assert_approx_eq(validation_mean_confidence([]), 0.0);
    assert_approx_eq(validation_mean_confidence([0.0]), 0.0);
    assert_approx_eq(validation_mean_confidence([0.0, 1.0]), 0.5);

    let full_precision = validation_mean_confidence([0.7, 0.8, 0.2]);
    assert_approx_eq(full_precision, (0.7 + 0.8 + 0.2) / 3.0);
    assert_ne!(full_precision, round_to_four_places(full_precision));

    assert!(calculate_unified_fii_meal_totals(&[]).unwrap().is_none());
}

#[test]
fn validation_mean_confidence_uses_resolved_items_for_every_source_path() {
    let cases = vec![
        (
            "provided FII",
            UnifiedFiiItem::new(
                "plain yogurt",
                Kcal::new(100.0).unwrap(),
                1.0,
                Some(FiiValue::new(50.0).unwrap()),
            )
            .unwrap(),
            EstimateSource::UserConfirmed,
            1.0,
            false,
        ),
        (
            "exact FII",
            UnifiedFiiItem::new("plain yogurt", Kcal::new(180.0).unwrap(), 1.0, None).unwrap(),
            EstimateSource::ExactFii,
            0.7,
            false,
        ),
        (
            "mapped FII",
            UnifiedFiiItem::new("fresh white bread", Kcal::new(180.0).unwrap(), 1.0, None).unwrap(),
            EstimateSource::MappedFii,
            0.7,
            false,
        ),
        (
            "decomposition",
            UnifiedFiiItem::new("Greek yogurt bowl", Kcal::new(180.0).unwrap(), 1.0, None).unwrap(),
            EstimateSource::MappedFii,
            0.9,
            true,
        ),
        (
            "macro fallback",
            synthetic_macro_fallback_item(),
            EstimateSource::MacroFallback,
            0.8,
            false,
        ),
        (
            "unknown fallback",
            UnifiedFiiItem::new("mystery mineral water", Kcal::new(0.0).unwrap(), 1.0, None)
                .unwrap(),
            EstimateSource::Unknown,
            0.2,
            false,
        ),
    ];

    for (label, item, expected_source, expected_confidence, expects_decomposition) in cases {
        let estimate = calculate_unified_fii_meal_totals(&[item]).unwrap().unwrap();
        let resolved_item = &estimate.item_estimates()[0];

        assert_eq!(resolved_item.source(), expected_source, "{label}");
        assert_eq!(
            resolved_item.decomposition().is_some(),
            expects_decomposition,
            "{label}"
        );
        assert_approx_eq(
            validation_mean_confidence(
                estimate
                    .item_estimates()
                    .iter()
                    .map(|item| item.confidence()),
            ),
            expected_confidence,
        );
    }
}

#[test]
fn validation_mean_confidence_is_unweighted_for_mixed_source_meal() {
    let items = vec![
        UnifiedFiiItem::new("plain yogurt", Kcal::new(1_000.0).unwrap(), 1.0, None).unwrap(),
        UnifiedFiiItem::new("chicken biryani", Kcal::new(520.0).unwrap(), 1.0, None).unwrap(),
        synthetic_macro_fallback_item(),
        UnifiedFiiItem::new("mystery mineral water", Kcal::new(0.0).unwrap(), 1.0, None).unwrap(),
    ];

    let estimate = calculate_unified_fii_meal_totals(&items).unwrap().unwrap();
    let sources: Vec<EstimateSource> = estimate
        .item_estimates()
        .iter()
        .map(|item| item.source())
        .collect();
    assert_eq!(
        sources,
        vec![
            EstimateSource::ExactFii,
            EstimateSource::MappedFii,
            EstimateSource::MacroFallback,
            EstimateSource::Unknown,
        ]
    );
    assert_approx_eq(
        validation_mean_confidence(
            estimate
                .item_estimates()
                .iter()
                .map(|item| item.confidence()),
        ),
        0.6,
    );
}

#[test]
fn validation_mean_confidence_matches_serialized_golden_outputs() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    for meal_id in [
        "source_exact_fii",
        "source_mapped_fii",
        "source_macro_fallback",
    ] {
        let meal = find_array_meal(&source_fixture.input, "variants", meal_id);
        assert_approx_eq(
            round_to_four_places(validation_mean_confidence_for_fixture_meal(meal)),
            expected_nested_score(
                &source_fixture.expected.actual_scores,
                meal_id,
                "mean_confidence",
            ),
        );
    }

    let uncertainty_fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let uncertainty_payload = payload_object(&uncertainty_fixture.input);
    for meal_id in ["control_meal", "mixed_meal"] {
        let meal = uncertainty_payload
            .get(meal_id)
            .expect("uncertainty fixture should include expected meal");
        assert_approx_eq(
            round_to_four_places(validation_mean_confidence_for_fixture_meal(meal)),
            expected_nested_score(
                &uncertainty_fixture.expected.actual_scores,
                meal_id,
                "mean_confidence",
            ),
        );
    }
}

#[test]
fn unified_meal_estimate_quality_matches_serialized_golden_outputs() {
    let source_fixture = read_golden_fixture("cases/source_quality_hierarchy_01.json");
    for (meal_id, expected_quality) in [
        ("source_exact_fii", EstimateQuality::High),
        ("source_mapped_fii", EstimateQuality::Medium),
        ("source_macro_fallback", EstimateQuality::Low),
    ] {
        let meal = find_array_meal(&source_fixture.input, "variants", meal_id);
        let estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(meal))
            .unwrap()
            .expect("source-quality fixture meal should resolve");

        assert_eq!(estimate.estimate_quality(), expected_quality);
        assert_eq!(
            estimate.estimate_quality().as_str(),
            expected_nested_quality(&source_fixture.expected.actual_scores, meal_id),
        );
    }

    let uncertainty_fixture = read_golden_fixture("cases/uncertainty_degradation_01.json");
    let uncertainty_payload = payload_object(&uncertainty_fixture.input);
    let control_meal = uncertainty_payload
        .get("control_meal")
        .expect("uncertainty fixture should include control_meal");
    let control_estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(control_meal))
        .unwrap()
        .expect("uncertainty control meal should resolve");
    assert_eq!(control_estimate.estimate_quality(), EstimateQuality::High);
    assert_eq!(
        control_estimate.estimate_quality().as_str(),
        string_field(
            &uncertainty_fixture.expected.details,
            "control_estimate_quality"
        ),
    );

    let mixed_meal = uncertainty_payload
        .get("mixed_meal")
        .expect("uncertainty fixture should include mixed_meal");
    let mixed_estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(mixed_meal))
        .unwrap()
        .expect("uncertainty mixed meal should resolve");
    assert_eq!(mixed_estimate.estimate_quality(), EstimateQuality::Low);
    assert_eq!(
        mixed_estimate.estimate_quality().as_str(),
        uncertainty_fixture.expected.estimate_quality,
    );
}

#[test]
fn direct_fii_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let skip_paths: BTreeSet<&str> = DIRECT_FII_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();

    assert_eq!(skip_paths, indexed_paths);
    for skip in DIRECT_FII_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn exact_fii_lookup_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> =
        EXACT_FII_LOOKUP_SUPPORTED_PATHS.iter().copied().collect();
    let skip_paths: BTreeSet<&str> = EXACT_FII_LOOKUP_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in EXACT_FII_LOOKUP_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in EXACT_FII_LOOKUP_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn exact_fii_item_load_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = EXACT_FII_ITEM_LOAD_SUPPORTED_PATHS
        .iter()
        .copied()
        .collect();
    let skip_paths: BTreeSet<&str> = EXACT_FII_ITEM_LOAD_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in EXACT_FII_ITEM_LOAD_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in EXACT_FII_ITEM_LOAD_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn exact_fii_meal_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = EXACT_FII_MEAL_SUPPORTED_PATHS.iter().copied().collect();
    let skip_paths: BTreeSet<&str> = EXACT_FII_MEAL_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in EXACT_FII_MEAL_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in EXACT_FII_MEAL_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn mapped_fii_item_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let skip_paths: BTreeSet<&str> = MAPPED_FII_ITEM_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();

    assert_eq!(skip_paths, indexed_paths);
    for skip in MAPPED_FII_ITEM_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn exact_or_mapped_fii_meal_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = EXACT_OR_MAPPED_FII_MEAL_SUPPORTED_PATHS
        .iter()
        .copied()
        .collect();
    let skip_paths: BTreeSet<&str> = EXACT_OR_MAPPED_FII_MEAL_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in EXACT_OR_MAPPED_FII_MEAL_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in EXACT_OR_MAPPED_FII_MEAL_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn unified_fii_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = UNIFIED_FII_SUPPORTED_PATHS.iter().copied().collect();
    let skip_paths: BTreeSet<&str> = UNIFIED_FII_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in UNIFIED_FII_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in UNIFIED_FII_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn estimate_quality_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> =
        ESTIMATE_QUALITY_SUPPORTED_PATHS.iter().copied().collect();
    let skip_paths: BTreeSet<&str> = ESTIMATE_QUALITY_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in ESTIMATE_QUALITY_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in ESTIMATE_QUALITY_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn validation_mean_confidence_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = VALIDATION_MEAN_CONFIDENCE_SUPPORTED_PATHS
        .iter()
        .copied()
        .collect();
    let skip_paths: BTreeSet<&str> = VALIDATION_MEAN_CONFIDENCE_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in VALIDATION_MEAN_CONFIDENCE_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in VALIDATION_MEAN_CONFIDENCE_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn decomposition_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = DECOMPOSITION_SUPPORTED_PATHS.iter().copied().collect();
    let skip_paths: BTreeSet<&str> = DECOMPOSITION_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in DECOMPOSITION_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in DECOMPOSITION_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn macro_fallback_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let supported_paths: BTreeSet<&str> = MACRO_FALLBACK_SUPPORTED_PATHS.iter().copied().collect();
    let skip_paths: BTreeSet<&str> = MACRO_FALLBACK_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();
    let covered_paths: BTreeSet<&str> = supported_paths.union(&skip_paths).copied().collect();

    assert_eq!(covered_paths, indexed_paths);
    for supported_path in MACRO_FALLBACK_SUPPORTED_PATHS {
        assert!(indexed_paths.contains(supported_path));
    }
    for skip in MACRO_FALLBACK_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

#[test]
fn direct_fii_acute_skip_reasons_cover_unsupported_golden_fixture_paths() {
    let index = read_golden_index();
    let indexed_paths: BTreeSet<&str> = index.cases.iter().map(|case| case.path.as_str()).collect();
    let skip_paths: BTreeSet<&str> = DIRECT_FII_ACUTE_SKIP_REASONS
        .iter()
        .map(|skip| skip.fixture_path)
        .collect();

    assert_eq!(skip_paths, indexed_paths);
    for skip in DIRECT_FII_ACUTE_SKIP_REASONS {
        assert!(indexed_paths.contains(skip.fixture_path));
        assert!(!skip.input_path.is_empty());
        assert!(!skip.reason.is_empty());
    }
}

fn assert_direct_fii_fixture_item_matches_expected_total(
    fixture: &GoldenFixture,
    item: &Value,
    expected_insulin_load: f64,
) {
    let estimate = calculate_direct_fii_item_load(
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
        FiiValue::new(number_field(item, "fii")).unwrap(),
    )
    .unwrap();

    assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(
        fixture
            .expected
            .source_labels
            .iter()
            .any(|source| source == estimate.source().as_str()),
        "{} should include direct-FII source label {:?}",
        fixture.case_id,
        estimate.source().as_str()
    );
    assert_approx_eq(estimate.item_insulin_load().value(), expected_insulin_load);
}

fn assert_direct_fii_fixture_meal_matches_expected_total(
    fixture: &GoldenFixture,
    meal: &Value,
    expected_insulin_load: f64,
) {
    let items = direct_fii_meal_items(meal);
    let expected_kcal = direct_fii_meal_kcal_total(meal);
    let estimate = calculate_direct_fii_meal_totals(&items).unwrap();

    assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(
        fixture
            .expected
            .source_labels
            .iter()
            .any(|source| source == estimate.source().as_str()),
        "{} should include direct-FII source label {:?}",
        fixture.case_id,
        estimate.source().as_str()
    );
    assert_approx_eq(estimate.meal_kcal_total().value(), expected_kcal);
    assert_approx_eq(
        estimate.meal_insulin_load_total().value(),
        expected_insulin_load,
    );
}

fn assert_direct_fii_fixture_meal_matches_expected_acute_score(
    fixture: &GoldenFixture,
    meal: &Value,
    expected_acute_score: f64,
) {
    let items = direct_fii_meal_items(meal);
    let estimate = calculate_direct_fii_acute_score(&items).unwrap();

    assert_approx_eq(REFERENCE_MEAL_INSULIN_LOAD, 30.0);
    assert_eq!(estimate.source(), EstimateSource::UserConfirmed);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(
        fixture
            .expected
            .source_labels
            .iter()
            .any(|source| source == estimate.source().as_str()),
        "{} should include direct-FII source label {:?}",
        fixture.case_id,
        estimate.source().as_str()
    );
    assert_approx_eq(estimate.acute_score().value(), expected_acute_score);
}

fn assert_exact_fii_fixture_meal_matches_expected(
    fixture: &GoldenFixture,
    meal: &Value,
    expected_score_id: &str,
) {
    assert!(meal_items(meal)
        .iter()
        .all(|item| item.get("fii").is_some_and(Value::is_null)));

    let items = exact_fii_meal_items(meal);
    let estimate = calculate_exact_fii_meal_totals(&items)
        .unwrap()
        .expect("every fixture item should resolve through exact FII lookup");

    assert_eq!(estimate.item_estimates().len(), meal_items(meal).len());
    assert_eq!(estimate.source(), EstimateSource::ExactFii);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(estimate.item_estimates().iter().all(|item| {
        item.source() == EstimateSource::ExactFii
            && item.formula_version() == FormulaVersion::CurrentBackendV1
    }));
    assert_approx_eq(estimate.meal_kcal_total().value(), meal_kcal_total(meal));

    let acute_score =
        estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD * 100.0;
    assert_approx_eq(
        round_to_four_places(acute_score),
        expected_nested_score(
            &fixture.expected.actual_scores,
            expected_score_id,
            "acute_score",
        ),
    );

    let mean_confidence = estimate
        .item_estimates()
        .iter()
        .map(|item| item.confidence())
        .sum::<f64>()
        / estimate.item_estimates().len() as f64;
    assert_approx_eq(
        mean_confidence,
        expected_nested_score(
            &fixture.expected.actual_scores,
            expected_score_id,
            "mean_confidence",
        ),
    );
    assert!(fixture
        .expected
        .source_labels
        .iter()
        .any(|source| source == estimate.source().as_str()));
}

fn assert_exact_or_mapped_fii_fixture_meal_matches_expected(
    fixture: &GoldenFixture,
    meal: &Value,
    expected_score_id: &str,
) {
    assert!(meal_items(meal)
        .iter()
        .all(|item| item.get("fii").is_some_and(Value::is_null)));

    let items = exact_or_mapped_fii_meal_items(meal);
    let estimate = calculate_exact_or_mapped_fii_meal_totals(&items)
        .unwrap()
        .expect("every fixture item should resolve through exact or mapped FII lookup");

    assert_eq!(estimate.item_estimates().len(), meal_items(meal).len());
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(estimate.item_estimates().iter().all(|item| {
        item.formula_version() == FormulaVersion::CurrentBackendV1
            && fixture
                .expected
                .source_labels
                .iter()
                .any(|source| source == item.source().as_str())
    }));
    assert_approx_eq(estimate.meal_kcal_total().value(), meal_kcal_total(meal));

    let acute_score =
        estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD * 100.0;
    assert_approx_eq(
        round_to_four_places(acute_score),
        expected_nested_score(
            &fixture.expected.actual_scores,
            expected_score_id,
            "acute_score",
        ),
    );
}

fn assert_macro_fallback_fixture_item_matches_expected(
    item: &Value,
    expected_insulin_load: f64,
    expected_confidence: f64,
) {
    let estimate = calculate_macro_fallback_item_load(
        string_field(item, "name"),
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
        macro_fallback_nutrients(item),
    )
    .unwrap()
    .expect("fixture item should resolve through isolated macro fallback");

    assert_approx_eq(
        estimate.item_kcal().value(),
        number_field(item, "kcal_per_unit") * number_field(item, "quantity"),
    );
    assert_approx_eq(estimate.item_insulin_load().value(), expected_insulin_load);
    assert_eq!(estimate.kind(), MacroFallbackKind::GiCarbProtein);
    assert_eq!(estimate.source(), EstimateSource::MacroFallback);
    assert_approx_eq(estimate.confidence(), expected_confidence);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
}

fn assert_decomposition_fixture_meal_matches_expected(
    fixture: &GoldenFixture,
    meal: &Value,
    expected_score_id: &str,
    expected_confidence: Option<f64>,
) {
    let items = meal_items(meal);
    assert_eq!(
        items.len(),
        1,
        "decomposition fixture path should be isolated"
    );
    let item = &items[0];
    let estimate = calculate_decomposed_fii_item_load(
        string_field(item, "name"),
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
    )
    .unwrap()
    .expect("fixture item should resolve through decomposition");

    let expected_acute_score = expected_nested_score(
        &fixture.expected.actual_scores,
        expected_score_id,
        "acute_score",
    );
    let expected_insulin_load = fixture
        .expected
        .actual_scores
        .get(expected_score_id)
        .and_then(|score| score.get("insulin_load_total"))
        .and_then(Value::as_f64)
        .unwrap_or(expected_acute_score / 100.0 * REFERENCE_MEAL_INSULIN_LOAD);

    assert_approx_eq(estimate.item_kcal().value(), meal_kcal_total(meal));
    assert_approx_eq(estimate.item_insulin_load().value(), expected_insulin_load);
    assert_approx_eq(
        round_to_four_places(
            estimate.item_insulin_load().value() / REFERENCE_MEAL_INSULIN_LOAD * 100.0,
        ),
        expected_acute_score,
    );
    assert_eq!(estimate.source(), EstimateSource::MappedFii);
    assert_ne!(estimate.source(), EstimateSource::ExactFii);
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert_eq!(
        estimate.provenance().original_dish_name(),
        string_field(item, "name")
    );
    assert!(!estimate.provenance().components().is_empty());
    assert!(estimate
        .provenance()
        .components()
        .iter()
        .filter(|component| component.matched())
        .all(|component| component.source().is_some()));
    if let Some(expected_confidence) = expected_confidence {
        assert_approx_eq(estimate.confidence(), expected_confidence);
    }

    assert_unified_fii_fixture_meal_matches_expected(fixture, meal, expected_score_id);
    let unified = calculate_unified_fii_item_load(&unified_fii_item(item))
        .unwrap()
        .expect("unified fixture item should resolve");
    assert_eq!(unified.source(), EstimateSource::MappedFii);
    assert!(unified.resolved_fii().is_none());
    assert!(unified.decomposition().is_some());
}

fn assert_unified_fii_fixture_meal_matches_expected(
    fixture: &GoldenFixture,
    meal: &Value,
    expected_score_id: &str,
) {
    let estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(meal))
        .unwrap()
        .expect("every fixture item should resolve through an allowed unified FII path");

    assert_eq!(estimate.item_estimates().len(), meal_items(meal).len());
    assert_eq!(estimate.formula_version(), FormulaVersion::CurrentBackendV1);
    assert!(estimate.item_estimates().iter().all(|item| {
        item.formula_version() == FormulaVersion::CurrentBackendV1
            && fixture
                .expected
                .source_labels
                .iter()
                .any(|source| source == item.source().as_str())
    }));
    assert_approx_eq(estimate.meal_kcal_total().value(), meal_kcal_total(meal));

    let acute_score =
        estimate.meal_insulin_load_total().value() / REFERENCE_MEAL_INSULIN_LOAD * 100.0;
    assert_approx_eq(
        round_to_four_places(acute_score),
        expected_nested_score(
            &fixture.expected.actual_scores,
            expected_score_id,
            "acute_score",
        ),
    );
}

fn payload_object(input: &Value) -> &serde_json::Map<String, Value> {
    input
        .get("payload")
        .and_then(Value::as_object)
        .expect("fixture input should include payload object")
}

fn find_array_meal<'a>(input: &'a Value, collection_name: &str, meal_id: &str) -> &'a Value {
    let payload = payload_object(input);
    let meals = payload
        .get(collection_name)
        .and_then(Value::as_array)
        .expect("fixture payload collection should be an array");
    meals
        .iter()
        .find(|meal| meal.get("meal_id").and_then(Value::as_str) == Some(meal_id))
        .expect("fixture should include expected meal id")
}

fn find_array_meal_item<'a>(
    input: &'a Value,
    collection_name: &str,
    meal_id: &str,
    item_name: &str,
) -> &'a Value {
    let meal = find_array_meal(input, collection_name, meal_id);
    find_meal_item(meal, item_name)
}

fn find_meal_item<'a>(meal: &'a Value, item_name: &str) -> &'a Value {
    meal.get("items")
        .and_then(Value::as_array)
        .and_then(|items| {
            items
                .iter()
                .find(|item| item.get("name").and_then(Value::as_str) == Some(item_name))
        })
        .expect("fixture meal should include expected item")
}

fn direct_fii_meal_items(meal: &Value) -> Vec<DirectFiiMealItem> {
    meal_items(meal)
        .iter()
        .map(|item| {
            DirectFiiMealItem::new(
                Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
                number_field(item, "quantity"),
                FiiValue::new(number_field(item, "fii")).unwrap(),
            )
            .unwrap()
        })
        .collect()
}

fn direct_fii_meal_kcal_total(meal: &Value) -> f64 {
    meal_items(meal)
        .iter()
        .map(|item| number_field(item, "kcal_per_unit") * number_field(item, "quantity"))
        .sum()
}

fn exact_fii_meal_items(meal: &Value) -> Vec<ExactFiiMealItem> {
    meal_items(meal)
        .iter()
        .map(|item| {
            ExactFiiMealItem::new(
                string_field(item, "name"),
                Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
                number_field(item, "quantity"),
            )
            .unwrap()
        })
        .collect()
}

fn exact_or_mapped_fii_meal_items(meal: &Value) -> Vec<ExactOrMappedFiiMealItem> {
    meal_items(meal)
        .iter()
        .map(|item| {
            ExactOrMappedFiiMealItem::new(
                string_field(item, "name"),
                Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
                number_field(item, "quantity"),
            )
            .unwrap()
        })
        .collect()
}

fn unified_fii_item(item: &Value) -> UnifiedFiiItem {
    let provided_fii = item
        .get("fii")
        .and_then(Value::as_f64)
        .map(|value| FiiValue::new(value).unwrap());

    UnifiedFiiItem::new(
        string_field(item, "name"),
        Kcal::new(number_field(item, "kcal_per_unit")).unwrap(),
        number_field(item, "quantity"),
        provided_fii,
    )
    .unwrap()
    .with_macro_nutrients(macro_fallback_nutrients(item))
}

fn macro_fallback_nutrients(item: &Value) -> MacroFallbackNutrients {
    MacroFallbackNutrients::new(
        optional_number_field(item, "gi"),
        optional_grams_field(item, "carb_g"),
        optional_grams_field(item, "protein_g"),
        optional_grams_field(item, "fat_g"),
        optional_grams_field(item, "sat_fat_g"),
    )
    .unwrap()
}

fn unified_fii_meal_items(meal: &Value) -> Vec<UnifiedFiiItem> {
    meal_items(meal).iter().map(unified_fii_item).collect()
}

fn synthetic_macro_fallback_item() -> UnifiedFiiItem {
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
        )
}

fn validation_mean_confidence_for_fixture_meal(meal: &Value) -> f64 {
    let estimate = calculate_unified_fii_meal_totals(&unified_fii_meal_items(meal))
        .unwrap()
        .expect("validation confidence fixture meal should resolve");

    validation_mean_confidence(
        estimate
            .item_estimates()
            .iter()
            .map(|item| item.confidence()),
    )
}

// Mirrors backend/validation/evaluators.py only; this is not a product/core API.
fn validation_mean_confidence(confidences: impl IntoIterator<Item = f64>) -> f64 {
    let mut total = 0.0;
    let mut count = 0_usize;

    for confidence in confidences {
        total += confidence;
        count += 1;
    }

    if count == 0 {
        0.0
    } else {
        total / count as f64
    }
}

fn meal_kcal_total(meal: &Value) -> f64 {
    meal_items(meal)
        .iter()
        .map(|item| number_field(item, "kcal_per_unit") * number_field(item, "quantity"))
        .sum()
}

fn meal_items(meal: &Value) -> &[Value] {
    meal.get("items")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .expect("fixture meal should include items")
}

fn number_field(value: &Value, field: &str) -> f64 {
    value
        .get(field)
        .and_then(Value::as_f64)
        .expect("fixture field should be numeric")
}

fn optional_number_field(value: &Value, field: &str) -> Option<f64> {
    value.get(field).and_then(Value::as_f64)
}

fn optional_grams_field(value: &Value, field: &str) -> Option<Grams> {
    optional_number_field(value, field).map(|value| Grams::new(value).unwrap())
}

fn string_field<'a>(value: &'a Value, field: &str) -> &'a str {
    value
        .get(field)
        .and_then(Value::as_str)
        .expect("fixture field should be a string")
}

fn expected_score(actual_scores: &Value, field: &str) -> f64 {
    actual_scores
        .get(field)
        .and_then(Value::as_f64)
        .expect("expected score field should be numeric")
}

fn expected_nested_score(actual_scores: &Value, meal_id: &str, field: &str) -> f64 {
    actual_scores
        .get(meal_id)
        .and_then(|meal| meal.get(field))
        .and_then(Value::as_f64)
        .expect("expected nested score field should be numeric")
}

fn expected_nested_quality<'a>(actual_scores: &'a Value, meal_id: &str) -> &'a str {
    actual_scores
        .get(meal_id)
        .and_then(|meal| meal.get("estimate_quality"))
        .and_then(Value::as_str)
        .expect("expected nested estimate_quality field should be a string")
}

fn assert_approx_eq(actual: f64, expected: f64) {
    assert!(
        (actual - expected).abs() < 1e-9,
        "expected {expected}, got {actual}"
    );
}

fn round_to_four_places(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}
