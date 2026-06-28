use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::PathBuf;

use insight_core::{
    calculate_direct_fii_acute_score, calculate_direct_fii_item_load,
    calculate_direct_fii_meal_totals, calculate_exact_fii_item_load,
    calculate_exact_fii_meal_totals, lookup_exact_fii, DirectFiiMealItem, EstimateSource,
    ExactFiiMealItem, FiiValue, FormulaVersion, Kcal, REFERENCE_MEAL_INSULIN_LOAD,
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

fn assert_approx_eq(actual: f64, expected: f64) {
    assert!(
        (actual - expected).abs() < 1e-9,
        "expected {expected}, got {actual}"
    );
}

fn round_to_four_places(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}
