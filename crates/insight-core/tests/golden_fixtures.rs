use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::PathBuf;

use serde::Deserialize;

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

#[test]
fn golden_fixtures_deserialize_and_match_index() {
    let fixtures_dir = fixtures_dir();
    let index_path = fixtures_dir.join("index.json");
    let index_text = fs::read_to_string(&index_path).expect("index fixture should be readable");
    let index: GoldenIndex =
        serde_json::from_str(&index_text).expect("index fixture should deserialize");

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

        let fixture_path = fixtures_dir.join(&index_case.path);
        let fixture_text =
            fs::read_to_string(&fixture_path).expect("case fixture should be readable");
        let fixture: GoldenFixture =
            serde_json::from_str(&fixture_text).expect("case fixture should deserialize");

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
