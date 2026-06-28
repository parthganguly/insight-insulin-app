use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, ValueValidationError, CURRENT_FORMULA_VERSION,
};

const FII_FOODS_CSV: &str = include_str!("../../../backend/fii_foods.csv");
const DEFAULT_CONFIDENCE: f64 = 0.5;
const MIXED_MEAL_WORD_MARKERS: &[&str] = &[
    "bowl", "combo", "plate", "biryani", "curry", "sandwich", "burger", "meal",
];
const MAJOR_FOOD_TOKENS: &[&str] = &[
    "rice", "potato", "chicken", "beef", "fish", "egg", "eggs", "toast", "bread", "oats", "milk",
    "yogurt", "lentils", "dal", "beans", "noodles", "pasta",
];

#[derive(Debug)]
pub enum FiiLookupError {
    Csv(csv::Error),
    InvalidFiiValue(ValueValidationError),
}

impl fmt::Display for FiiLookupError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Csv(err) => write!(formatter, "failed to parse embedded FII CSV: {err}"),
            Self::InvalidFiiValue(err) => write!(formatter, "invalid FII value in CSV: {err}"),
        }
    }
}

impl Error for FiiLookupError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Csv(err) => Some(err),
            Self::InvalidFiiValue(err) => Some(err),
        }
    }
}

impl From<csv::Error> for FiiLookupError {
    fn from(err: csv::Error) -> Self {
        Self::Csv(err)
    }
}

impl From<ValueValidationError> for FiiLookupError {
    fn from(err: ValueValidationError) -> Self {
        Self::InvalidFiiValue(err)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FiiLookupResult {
    fii: FiiValue,
    source: EstimateSource,
    confidence: f64,
    formula_version: FormulaVersion,
}

impl FiiLookupResult {
    pub const fn fii(self) -> FiiValue {
        self.fii
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

#[derive(Debug)]
struct FiiData {
    rows: Vec<FiiRow>,
    primary_index: BTreeMap<String, usize>,
    alias_index: BTreeMap<String, usize>,
}

#[derive(Debug)]
struct FiiRow {
    food_name: String,
    aliases: Vec<String>,
    fii: FiiValue,
    confidence: f64,
}

impl FiiRow {
    const fn to_lookup_result(&self, source: EstimateSource) -> FiiLookupResult {
        FiiLookupResult {
            fii: self.fii,
            source,
            confidence: self.confidence,
            formula_version: CURRENT_FORMULA_VERSION,
        }
    }
}

#[derive(Debug, Deserialize)]
struct RawFiiRow {
    #[serde(default)]
    food_name: String,
    #[serde(default)]
    fii: String,
    #[serde(default)]
    aliases: String,
    #[serde(default)]
    confidence: String,
}

pub fn lookup_exact_fii(food_name: &str) -> Result<Option<FiiLookupResult>, FiiLookupError> {
    let normalized = normalize_food_name(food_name);
    if normalized.is_empty() {
        return Ok(None);
    }

    let data = parse_fii_data()?;

    if let Some(row) = data
        .primary_index
        .get(&normalized)
        .and_then(|row_index| data.rows.get(*row_index))
    {
        return Ok(Some(row.to_lookup_result(EstimateSource::ExactFii)));
    }

    if let Some(row) = data
        .alias_index
        .get(&normalized)
        .and_then(|row_index| data.rows.get(*row_index))
    {
        return Ok(Some(row.to_lookup_result(EstimateSource::ExactFii)));
    }

    Ok(None)
}

pub fn lookup_mapped_fii(food_name: &str) -> Result<Option<FiiLookupResult>, FiiLookupError> {
    let normalized = normalize_food_name(food_name);
    if normalized.is_empty() {
        return Ok(None);
    }

    let data = parse_fii_data()?;
    if data.primary_index.contains_key(&normalized) || data.alias_index.contains_key(&normalized) {
        return Ok(None);
    }
    if is_likely_mixed_meal(food_name) {
        return Ok(None);
    }

    let query_tokens = tokenize(&normalized);
    for row in &data.rows {
        if is_token_subset_phrase(&query_tokens, &tokenize(&row.food_name)) {
            return Ok(Some(row.to_lookup_result(EstimateSource::MappedFii)));
        }
        for alias in &row.aliases {
            if is_token_subset_phrase(&query_tokens, &tokenize(alias)) {
                return Ok(Some(row.to_lookup_result(EstimateSource::MappedFii)));
            }
        }
    }

    Ok(None)
}

pub fn normalize_food_name(name: &str) -> String {
    let mut replaced = String::with_capacity(name.len());

    for character in name.to_lowercase().chars() {
        if character.is_ascii_lowercase() || character.is_ascii_digit() || character.is_whitespace()
        {
            replaced.push(character);
        } else {
            replaced.push(' ');
        }
    }

    replaced.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn parse_fii_data() -> Result<FiiData, FiiLookupError> {
    let mut reader = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(FII_FOODS_CSV.as_bytes());
    let mut rows = Vec::new();
    let mut primary_index = BTreeMap::new();
    let mut alias_index = BTreeMap::new();

    for raw in reader.deserialize() {
        let raw: RawFiiRow = raw?;
        let food_name = normalize_food_name(&raw.food_name);
        if food_name.is_empty() {
            continue;
        }

        let Ok(fii_value) = raw.fii.parse::<f64>() else {
            continue;
        };
        let fii = FiiValue::new(fii_value)?;
        let confidence = raw.confidence.parse::<f64>().unwrap_or(DEFAULT_CONFIDENCE);
        let aliases = parse_aliases(&raw.aliases);
        let row_index = rows.len();

        primary_index.insert(food_name.clone(), row_index);
        for alias in &aliases {
            alias_index.entry(alias.clone()).or_insert(row_index);
        }

        rows.push(FiiRow {
            food_name,
            aliases,
            fii,
            confidence,
        });
    }

    Ok(FiiData {
        rows,
        primary_index,
        alias_index,
    })
}

fn tokenize(name: &str) -> Vec<String> {
    normalize_food_name(name)
        .split_whitespace()
        .map(str::to_owned)
        .collect()
}

fn is_token_subset_phrase(query_tokens: &[String], candidate_tokens: &[String]) -> bool {
    if query_tokens.is_empty() || candidate_tokens.is_empty() {
        return false;
    }
    if query_tokens.len() == 1 || candidate_tokens.len() == 1 {
        return false;
    }

    let query_set: BTreeSet<&str> = query_tokens.iter().map(String::as_str).collect();
    let candidate_set: BTreeSet<&str> = candidate_tokens.iter().map(String::as_str).collect();
    if query_set.intersection(&candidate_set).count() < 2 {
        return false;
    }

    query_set.is_subset(&candidate_set) || candidate_set.is_subset(&query_set)
}

fn is_likely_mixed_meal(food_name: &str) -> bool {
    let raw = food_name.to_lowercase();
    let normalized = normalize_food_name(food_name);
    if normalized.is_empty() {
        return false;
    }
    if normalized.contains(" and ") || normalized.contains(" with ") || raw.contains('+') {
        return true;
    }

    let tokens: Vec<&str> = normalized.split_whitespace().collect();
    if tokens
        .iter()
        .any(|token| MIXED_MEAL_WORD_MARKERS.contains(token))
    {
        return true;
    }

    tokens
        .iter()
        .filter(|token| MAJOR_FOOD_TOKENS.contains(token))
        .collect::<BTreeSet<_>>()
        .len()
        >= 2
}

fn parse_aliases(aliases_raw: &str) -> Vec<String> {
    aliases_raw
        .split(',')
        .map(normalize_food_name)
        .filter(|alias| !alias.is_empty())
        .collect()
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
    fn normalizes_food_names_like_backend_exact_lookup() {
        assert_eq!(
            normalize_food_name("  Plain-YOGURT!!\nCup  "),
            "plain yogurt cup"
        );
        assert_eq!(normalize_food_name("Cafe-au-lait"), "cafe au lait");
        assert_eq!(normalize_food_name("rice + chicken"), "rice chicken");
    }

    #[test]
    fn loads_embedded_backend_fii_csv() {
        let data = parse_fii_data().unwrap();

        assert_eq!(data.rows.len(), 10);
        assert!(data.primary_index.contains_key("rice"));
        assert!(data.alias_index.contains_key("plain yogurt"));
    }

    #[test]
    fn looks_up_exact_primary_food_name() {
        let result = lookup_exact_fii("Rice").unwrap().unwrap();

        assert_approx_eq(result.fii().value(), 79.0);
        assert_eq!(result.source(), EstimateSource::ExactFii);
        assert_approx_eq(result.confidence(), 0.7);
        assert_eq!(result.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn looks_up_exact_alias() {
        let result = lookup_exact_fii("plain yogurt").unwrap().unwrap();

        assert_approx_eq(result.fii().value(), 60.0);
        assert_eq!(result.source(), EstimateSource::ExactFii);
        assert_approx_eq(result.confidence(), 0.7);
        assert_eq!(result.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn applies_normalization_before_exact_alias_lookup() {
        let result = lookup_exact_fii("  WHITE--RICE!! ").unwrap().unwrap();

        assert_approx_eq(result.fii().value(), 79.0);
        assert_eq!(result.source().as_str(), "exact_fii");
    }

    #[test]
    fn does_not_perform_mapped_or_fuzzy_lookup() {
        assert!(lookup_exact_fii("greek yogurt bowl").unwrap().is_none());
        assert!(lookup_exact_fii("chicken biryani").unwrap().is_none());
    }

    #[test]
    fn empty_food_name_has_no_lookup_result() {
        assert!(lookup_exact_fii(" ").unwrap().is_none());
    }

    #[test]
    fn looks_up_backend_mapped_primary_phrase() {
        let result = lookup_mapped_fii("fresh white bread").unwrap().unwrap();

        assert_approx_eq(result.fii().value(), 100.0);
        assert_eq!(result.source(), EstimateSource::MappedFii);
        assert_approx_eq(result.confidence(), 0.7);
        assert_eq!(result.formula_version(), FormulaVersion::CurrentBackendV1);
    }

    #[test]
    fn looks_up_backend_mapped_alias_phrase() {
        let result = lookup_mapped_fii("fresh basmati rice").unwrap().unwrap();

        assert_approx_eq(result.fii().value(), 79.0);
        assert_eq!(result.source().as_str(), "mapped_fii");
        assert_approx_eq(result.confidence(), 0.7);
    }

    #[test]
    fn exact_matches_do_not_enter_mapped_lookup() {
        assert!(lookup_mapped_fii("white bread").unwrap().is_none());
        assert!(lookup_mapped_fii("basmati rice").unwrap().is_none());
    }

    #[test]
    fn mapped_lookup_rejects_broad_and_mixed_names() {
        assert!(lookup_mapped_fii("bread").unwrap().is_none());
        assert!(lookup_mapped_fii("greek yogurt bowl").unwrap().is_none());
        assert!(lookup_mapped_fii("white bread with milk")
            .unwrap()
            .is_none());
    }
}
