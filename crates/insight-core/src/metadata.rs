use serde::{Deserialize, Serialize};

use crate::domain::{FormulaVersion, CURRENT_FORMULA_VERSION};
use crate::fii_lookup::FII_FOODS_CSV;

const DATASET_VERSION_PREFIX: &str = "fii_foods_csv_fnv1a64_";

/// Deterministic core identification for consumers of the scoring contract.
///
/// `dataset_version` identifies the embedded FII CSV snapshot only; it is a
/// content fingerprint, not an integrity guarantee and not a claim of
/// scientific validation. Decomposition rules, weights, and macro
/// coefficients are compiled into this crate and are identified by
/// `core_version` together with `formula_version`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CoreMetadata {
    formula_version: FormulaVersion,
    dataset_version: String,
    core_version: String,
}

impl CoreMetadata {
    pub const fn formula_version(&self) -> FormulaVersion {
        self.formula_version
    }

    pub fn dataset_version(&self) -> &str {
        &self.dataset_version
    }

    pub fn core_version(&self) -> &str {
        &self.core_version
    }
}

/// Reports the current formula, dataset-snapshot, and crate versions without
/// reading any file at runtime.
pub fn core_metadata() -> CoreMetadata {
    CoreMetadata {
        formula_version: CURRENT_FORMULA_VERSION,
        dataset_version: format!(
            "{DATASET_VERSION_PREFIX}{:016x}",
            fnv1a64_of_normalized_lines(FII_FOODS_CSV)
        ),
        core_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

/// FNV-1a 64-bit fingerprint over lines joined with `\n`, so CRLF and LF
/// checkouts of the embedded CSV produce the same snapshot identifier. This
/// is a non-cryptographic identifier, not a security or integrity mechanism.
fn fnv1a64_of_normalized_lines(text: &str) -> u64 {
    const FNV_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
    const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

    let mut hash = FNV_OFFSET_BASIS;
    let mut absorb = |byte: u8| {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(FNV_PRIME);
    };
    for line in text.lines() {
        line.bytes().for_each(&mut absorb);
        absorb(b'\n');
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_existing_backend_formula_version() {
        let metadata = core_metadata();

        assert_eq!(metadata.formula_version(), FormulaVersion::CurrentBackendV1);
        assert_eq!(metadata.formula_version().as_str(), "current_backend_v1");
    }

    #[test]
    fn reports_crate_version_from_cargo_metadata() {
        let metadata = core_metadata();

        assert_eq!(metadata.core_version(), env!("CARGO_PKG_VERSION"));
        assert_eq!(metadata.core_version(), "0.1.0");
    }

    #[test]
    fn dataset_version_is_deterministic_and_well_formed() {
        let first = core_metadata();
        let second = core_metadata();

        assert_eq!(first, second);
        assert!(!first.dataset_version().is_empty());

        let fingerprint = first
            .dataset_version()
            .strip_prefix(DATASET_VERSION_PREFIX)
            .expect("dataset_version should carry the snapshot prefix");
        assert_eq!(fingerprint.len(), 16);
        assert!(fingerprint.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn dataset_version_identifies_current_unchanged_csv_snapshot() {
        // Pinned fingerprint of the current backend/fii_foods.csv snapshot.
        // This test fails loudly if the embedded dataset changes, which is
        // forbidden during migration without an approved scientific issue.
        assert_eq!(
            core_metadata().dataset_version(),
            "fii_foods_csv_fnv1a64_250e9dfc91988b6b"
        );
    }

    #[test]
    fn dataset_fingerprint_is_line_ending_neutral() {
        assert_eq!(
            fnv1a64_of_normalized_lines("a,b\nc,d\n"),
            fnv1a64_of_normalized_lines("a,b\r\nc,d\r\n")
        );
        assert_ne!(
            fnv1a64_of_normalized_lines("a,b\nc,d\n"),
            fnv1a64_of_normalized_lines("a,b\nc,e\n")
        );
    }

    #[test]
    fn metadata_serializes_and_round_trips() {
        let metadata = core_metadata();
        let json = serde_json::to_value(&metadata).unwrap();

        assert_eq!(json["formula_version"], "current_backend_v1");
        assert_eq!(json["core_version"], "0.1.0");
        assert_eq!(
            json["dataset_version"].as_str().unwrap(),
            metadata.dataset_version()
        );

        let round_trip: CoreMetadata = serde_json::from_value(json).unwrap();
        assert_eq!(round_trip, metadata);
    }
}
