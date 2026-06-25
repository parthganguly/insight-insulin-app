use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::domain::{
    EstimateSource, FiiValue, FormulaVersion, ValueValidationError, CURRENT_FORMULA_VERSION,
};

const FII_FOODS_CSV: &str = include_str!("../../../backend/fii_foods.csv");
const DEFAULT_CONFIDENCE: f64 = 0.5;

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
    fii: FiiValue,
    confidence: f64,
}

impl FiiRow {
    const fn to_lookup_result(&self) -> FiiLookupResult {
        FiiLookupResult {
            fii: self.fii,
            source: EstimateSource::ExactFii,
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
        return Ok(Some(row.to_lookup_result()));
    }

    if let Some(row) = data
        .alias_index
        .get(&normalized)
        .and_then(|row_index| data.rows.get(*row_index))
    {
        return Ok(Some(row.to_lookup_result()));
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

        rows.push(FiiRow { fii, confidence });
    }

    Ok(FiiData {
        rows,
        primary_index,
        alias_index,
    })
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
}
