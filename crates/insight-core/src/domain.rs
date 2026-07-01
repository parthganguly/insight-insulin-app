use std::error::Error;
use std::fmt;

use serde::de::{self, Visitor};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Debug, Clone, PartialEq)]
pub enum ValueValidationError {
    Negative { type_name: &'static str, value: f64 },
    NonFinite { type_name: &'static str },
}

impl fmt::Display for ValueValidationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Negative { type_name, value } => {
                write!(formatter, "{type_name} must be non-negative, got {value}")
            }
            Self::NonFinite { type_name } => write!(formatter, "{type_name} must be finite"),
        }
    }
}

impl Error for ValueValidationError {}

macro_rules! non_negative_value_type {
    ($name:ident) => {
        #[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
        pub struct $name(f64);

        impl $name {
            pub fn new(value: f64) -> Result<Self, ValueValidationError> {
                if !value.is_finite() {
                    return Err(ValueValidationError::NonFinite {
                        type_name: stringify!($name),
                    });
                }
                if value < 0.0 {
                    return Err(ValueValidationError::Negative {
                        type_name: stringify!($name),
                        value,
                    });
                }
                Ok(Self(value))
            }

            pub fn value(self) -> f64 {
                self.0
            }
        }

        impl TryFrom<f64> for $name {
            type Error = ValueValidationError;

            fn try_from(value: f64) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        impl From<$name> for f64 {
            fn from(value: $name) -> Self {
                value.0
            }
        }

        impl Serialize for $name {
            fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: Serializer,
            {
                serializer.serialize_f64(self.0)
            }
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: Deserializer<'de>,
            {
                struct NonNegativeVisitor;

                impl Visitor<'_> for NonNegativeVisitor {
                    type Value = $name;

                    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                        write!(formatter, "a finite non-negative number")
                    }

                    fn visit_f64<E>(self, value: f64) -> Result<Self::Value, E>
                    where
                        E: de::Error,
                    {
                        $name::new(value).map_err(E::custom)
                    }

                    fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
                    where
                        E: de::Error,
                    {
                        self.visit_f64(value as f64)
                    }

                    fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
                    where
                        E: de::Error,
                    {
                        self.visit_f64(value as f64)
                    }
                }

                deserializer.deserialize_any(NonNegativeVisitor)
            }
        }
    };
}

non_negative_value_type!(Kcal);
non_negative_value_type!(Grams);
non_negative_value_type!(FiiValue);
non_negative_value_type!(InsulinLoad);
non_negative_value_type!(AcuteScore);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EstimateSource {
    ExactFii,
    MappedFii,
    MacroFallback,
    UserConfirmed,
    Unknown,
}

impl EstimateSource {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ExactFii => "exact_fii",
            Self::MappedFii => "mapped_fii",
            Self::MacroFallback => "macro_fallback",
            Self::UserConfirmed => "user_confirmed",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EstimateQuality {
    High,
    Medium,
    Low,
    Unknown,
}

impl EstimateQuality {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FormulaVersion {
    CurrentBackendV1,
}

impl FormulaVersion {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::CurrentBackendV1 => "current_backend_v1",
        }
    }
}

pub const CURRENT_FORMULA_VERSION: FormulaVersion = FormulaVersion::CurrentBackendV1;

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! numeric_value_tests {
        ($module_name:ident, $type_name:ident) => {
            mod $module_name {
                use super::*;

                #[test]
                fn accepts_zero_and_positive_values() {
                    assert_eq!($type_name::new(0.0).unwrap().value(), 0.0);
                    assert_eq!($type_name::new(42.5).unwrap().value(), 42.5);
                }

                #[test]
                fn rejects_negative_values() {
                    let err = $type_name::new(-0.1).unwrap_err();
                    assert!(matches!(err, ValueValidationError::Negative { .. }));
                }

                #[test]
                fn rejects_non_finite_values() {
                    for value in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
                        let err = $type_name::new(value).unwrap_err();
                        assert!(matches!(err, ValueValidationError::NonFinite { .. }));
                    }
                }

                #[test]
                fn serializes_as_a_number() {
                    let value = $type_name::new(12.25).unwrap();
                    assert_eq!(serde_json::to_string(&value).unwrap(), "12.25");
                }

                #[test]
                fn deserializes_valid_number() {
                    let value: $type_name = serde_json::from_str("12.25").unwrap();
                    assert_eq!(value.value(), 12.25);
                }

                #[test]
                fn rejects_invalid_deserialized_number() {
                    let err = serde_json::from_str::<$type_name>("-1").unwrap_err();
                    assert!(err.to_string().contains("must be non-negative"));
                }
            }
        };
    }

    numeric_value_tests!(kcal_tests, Kcal);
    numeric_value_tests!(grams_tests, Grams);
    numeric_value_tests!(fii_value_tests, FiiValue);
    numeric_value_tests!(insulin_load_tests, InsulinLoad);
    numeric_value_tests!(acute_score_tests, AcuteScore);

    #[test]
    fn estimate_source_uses_current_backend_labels() {
        let cases = [
            (EstimateSource::ExactFii, "\"exact_fii\""),
            (EstimateSource::MappedFii, "\"mapped_fii\""),
            (EstimateSource::MacroFallback, "\"macro_fallback\""),
            (EstimateSource::UserConfirmed, "\"user_confirmed\""),
            (EstimateSource::Unknown, "\"unknown\""),
        ];

        for (source, expected_json) in cases {
            assert_eq!(source.as_str(), expected_json.trim_matches('"'));
            assert_eq!(serde_json::to_string(&source).unwrap(), expected_json);
            assert_eq!(
                serde_json::from_str::<EstimateSource>(expected_json).unwrap(),
                source
            );
        }
    }

    #[test]
    fn estimate_quality_uses_backend_product_labels_only() {
        let cases = [
            (EstimateQuality::High, "\"high\""),
            (EstimateQuality::Medium, "\"medium\""),
            (EstimateQuality::Low, "\"low\""),
            (EstimateQuality::Unknown, "\"unknown\""),
        ];

        for (quality, expected_json) in cases {
            assert_eq!(quality.as_str(), expected_json.trim_matches('"'));
            assert_eq!(serde_json::to_string(&quality).unwrap(), expected_json);
            assert_eq!(
                serde_json::from_str::<EstimateQuality>(expected_json).unwrap(),
                quality
            );
        }

        assert!(serde_json::from_str::<EstimateQuality>("\"composite\"").is_err());
    }

    #[test]
    fn formula_version_serializes_without_claiming_validation() {
        assert_eq!(CURRENT_FORMULA_VERSION, FormulaVersion::CurrentBackendV1);
        assert_eq!(CURRENT_FORMULA_VERSION.as_str(), "current_backend_v1");
        assert_eq!(
            serde_json::to_string(&CURRENT_FORMULA_VERSION).unwrap(),
            "\"current_backend_v1\""
        );
    }
}
