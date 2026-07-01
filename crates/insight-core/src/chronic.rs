use std::collections::VecDeque;

use serde::{Deserialize, Serialize};

use crate::domain::{InsulinLoad, Kcal, ValueValidationError};
use crate::unified_fii::UnifiedFiiMealEstimate;

const ROLLING_WINDOW_DAYS: usize = 7;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChronicDayInput {
    date: String,
    meals: Vec<UnifiedFiiMealEstimate>,
}

impl ChronicDayInput {
    pub fn new(date: impl Into<String>, meals: Vec<UnifiedFiiMealEstimate>) -> Self {
        Self {
            date: date.into(),
            meals,
        }
    }

    pub fn date(&self) -> &str {
        &self.date
    }

    pub fn meals(&self) -> &[UnifiedFiiMealEstimate] {
        &self.meals
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChronicMetricPoint {
    date: String,
    daily_dil: InsulinLoad,
    total_daily_energy: Kcal,
    daily_dii: f64,
    rolling_7d_dil: InsulinLoad,
    rolling_7d_dii: f64,
}

impl ChronicMetricPoint {
    pub fn date(&self) -> &str {
        &self.date
    }

    pub const fn daily_dil(&self) -> InsulinLoad {
        self.daily_dil
    }

    pub const fn total_daily_energy(&self) -> Kcal {
        self.total_daily_energy
    }

    pub const fn daily_dii(&self) -> f64 {
        self.daily_dii
    }

    pub const fn rolling_7d_dil(&self) -> InsulinLoad {
        self.rolling_7d_dil
    }

    pub const fn rolling_7d_dii(&self) -> f64 {
        self.rolling_7d_dii
    }
}

/// Reproduces the current backend's ordered daily DIL/DII and seven-row rolling behavior.
///
/// Product-parity callers provide one explicit row per ISO calendar date. An empty meal list is
/// the zero-filled representation of a missing day; this function does not infer dates or
/// timezone boundaries.
pub fn compute_chronic_series(
    days: &[ChronicDayInput],
) -> Result<Vec<ChronicMetricPoint>, ValueValidationError> {
    let mut ordered_days: Vec<&ChronicDayInput> = days.iter().collect();
    ordered_days.sort_by(|left, right| left.date().cmp(right.date()));

    let mut series = Vec::with_capacity(ordered_days.len());
    let mut rolling_dil_values = VecDeque::with_capacity(ROLLING_WINDOW_DAYS);
    let mut rolling_dii_values = VecDeque::with_capacity(ROLLING_WINDOW_DAYS);

    for day in ordered_days {
        let daily_dil = InsulinLoad::new(
            day.meals()
                .iter()
                .map(|meal| meal.meal_insulin_load_total().value())
                .sum(),
        )?;
        let total_daily_energy = Kcal::new(
            day.meals()
                .iter()
                .map(|meal| meal.meal_kcal_total().value())
                .sum(),
        )?;
        let daily_dii = if total_daily_energy.value() > 0.0 {
            daily_dil.value() / total_daily_energy.value()
        } else {
            0.0
        };
        let daily_dii = validate_non_negative_finite(daily_dii, "DailyDii")?;

        rolling_dil_values.push_back(daily_dil.value());
        rolling_dii_values.push_back(daily_dii);
        if rolling_dil_values.len() > ROLLING_WINDOW_DAYS {
            rolling_dil_values.pop_front();
            rolling_dii_values.pop_front();
        }

        let window_len = rolling_dil_values.len() as f64;
        let rolling_7d_dil = InsulinLoad::new(rolling_dil_values.iter().sum::<f64>() / window_len)?;
        let rolling_7d_dii = validate_non_negative_finite(
            rolling_dii_values.iter().sum::<f64>() / window_len,
            "Rolling7dDii",
        )?;

        series.push(ChronicMetricPoint {
            date: day.date().to_owned(),
            daily_dil,
            total_daily_energy,
            daily_dii,
            rolling_7d_dil,
            rolling_7d_dii,
        });
    }

    Ok(series)
}

fn validate_non_negative_finite(
    value: f64,
    type_name: &'static str,
) -> Result<f64, ValueValidationError> {
    if !value.is_finite() {
        return Err(ValueValidationError::NonFinite { type_name });
    }
    if value < 0.0 {
        return Err(ValueValidationError::Negative { type_name, value });
    }
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{EstimateSource, FiiValue, Grams};
    use crate::macro_fallback::MacroFallbackNutrients;
    use crate::unified_fii::{calculate_unified_fii_meal_totals, UnifiedFiiItem};

    fn assert_approx_eq(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() < 1e-9,
            "expected {expected}, got {actual}"
        );
    }

    fn resolved_meal(items: Vec<UnifiedFiiItem>) -> UnifiedFiiMealEstimate {
        calculate_unified_fii_meal_totals(&items)
            .unwrap()
            .expect("synthetic meal should resolve")
    }

    fn provided_meal(kcal: f64, fii: f64) -> UnifiedFiiMealEstimate {
        resolved_meal(vec![UnifiedFiiItem::new(
            "provided item",
            Kcal::new(kcal).unwrap(),
            1.0,
            Some(FiiValue::new(fii).unwrap()),
        )
        .unwrap()])
    }

    fn day(date: &str, meals: Vec<UnifiedFiiMealEstimate>) -> ChronicDayInput {
        ChronicDayInput::new(date, meals)
    }

    #[test]
    fn one_meal_produces_daily_dil_energy_dii_and_initial_rolling_values() {
        let series =
            compute_chronic_series(&[day("2026-01-01", vec![provided_meal(200.0, 50.0)])]).unwrap();

        assert_eq!(series.len(), 1);
        assert_approx_eq(series[0].daily_dil().value(), 100.0);
        assert_approx_eq(series[0].total_daily_energy().value(), 200.0);
        assert_approx_eq(series[0].daily_dii(), 0.5);
        assert_approx_eq(series[0].rolling_7d_dil().value(), 100.0);
        assert_approx_eq(series[0].rolling_7d_dii(), 0.5);
    }

    #[test]
    fn multiple_meals_are_summed_before_daily_dii() {
        let provided = provided_meal(100.0, 50.0);
        let exact = resolved_meal(vec![UnifiedFiiItem::new(
            "plain yogurt",
            Kcal::new(100.0).unwrap(),
            1.0,
            None,
        )
        .unwrap()]);

        let series = compute_chronic_series(&[day("2026-01-01", vec![provided, exact])]).unwrap();

        assert_approx_eq(series[0].daily_dil().value(), 110.0);
        assert_approx_eq(series[0].total_daily_energy().value(), 200.0);
        assert_approx_eq(series[0].daily_dii(), 0.55);
    }

    #[test]
    fn empty_input_and_explicit_empty_range_preserve_backend_zero_behavior() {
        assert!(compute_chronic_series(&[]).unwrap().is_empty());

        let series = compute_chronic_series(&[
            day("2026-01-01", vec![]),
            day("2026-01-02", vec![]),
            day("2026-01-03", vec![]),
        ])
        .unwrap();

        assert_eq!(series.len(), 3);
        for point in series {
            assert_approx_eq(point.daily_dil().value(), 0.0);
            assert_approx_eq(point.total_daily_energy().value(), 0.0);
            assert_approx_eq(point.daily_dii(), 0.0);
            assert_approx_eq(point.rolling_7d_dil().value(), 0.0);
            assert_approx_eq(point.rolling_7d_dii(), 0.0);
        }
    }

    #[test]
    fn explicit_missing_days_participate_in_rolling_means() {
        let series = compute_chronic_series(&[
            day("2026-01-01", vec![provided_meal(200.0, 50.0)]),
            day("2026-01-02", vec![]),
            day("2026-01-03", vec![provided_meal(100.0, 60.0)]),
        ])
        .unwrap();

        assert_approx_eq(series[1].daily_dil().value(), 0.0);
        assert_approx_eq(series[1].daily_dii(), 0.0);
        assert_approx_eq(
            series[2].rolling_7d_dil().value(),
            (100.0 + 0.0 + 60.0) / 3.0,
        );
        assert_approx_eq(series[2].rolling_7d_dii(), (0.5 + 0.0 + 0.6) / 3.0);
    }

    #[test]
    fn rolling_windows_expand_through_six_rows_then_trail_seven_rows() {
        let days: Vec<ChronicDayInput> = (1..=8)
            .map(|day_number| {
                day(
                    &format!("2026-01-{day_number:02}"),
                    vec![provided_meal(day_number as f64, 100.0)],
                )
            })
            .collect();
        let series = compute_chronic_series(&days).unwrap();

        for (index, point) in series.iter().take(7).enumerate() {
            let rows_seen = (index + 1) as f64;
            assert_approx_eq(point.rolling_7d_dil().value(), (1.0 + rows_seen) / 2.0);
            assert_approx_eq(point.rolling_7d_dii(), 1.0);
        }
        assert_approx_eq(series[7].rolling_7d_dil().value(), 5.0);
        assert_approx_eq(series[7].rolling_7d_dii(), 1.0);
    }

    #[test]
    fn rolling_dii_is_mean_of_daily_ratios_not_ratio_of_window_sums() {
        let series = compute_chronic_series(&[
            day("2026-01-01", vec![provided_meal(100.0, 10.0)]),
            day("2026-01-02", vec![provided_meal(400.0, 5.0)]),
        ])
        .unwrap();

        assert_approx_eq(series[1].rolling_7d_dii(), (0.1 + 0.05) / 2.0);
        assert_ne!(series[1].rolling_7d_dii(), (10.0 + 20.0) / (100.0 + 400.0));
    }

    #[test]
    fn high_then_low_transition_falls_gradually_across_trailing_window() {
        let days: Vec<ChronicDayInput> = (1..=14)
            .map(|day_number| {
                let fii = if day_number <= 7 { 100.0 } else { 10.0 };
                day(
                    &format!("2026-01-{day_number:02}"),
                    vec![provided_meal(100.0, fii)],
                )
            })
            .collect();
        let series = compute_chronic_series(&days).unwrap();

        assert_approx_eq(series[6].rolling_7d_dil().value(), 100.0);
        assert!(series[7].rolling_7d_dil().value() < series[6].rolling_7d_dil().value());
        assert!(
            series[7..]
                .windows(2)
                .all(|window| window[1].rolling_7d_dil().value()
                    <= window[0].rolling_7d_dil().value())
        );
        assert_approx_eq(series[13].rolling_7d_dil().value(), 10.0);
    }

    #[test]
    fn resolved_source_paths_contribute_only_their_existing_load_and_energy() {
        let provided = provided_meal(100.0, 50.0);
        let exact = resolved_meal(vec![UnifiedFiiItem::new(
            "plain yogurt",
            Kcal::new(100.0).unwrap(),
            1.0,
            None,
        )
        .unwrap()]);
        let mapped = resolved_meal(vec![UnifiedFiiItem::new(
            "fresh white bread",
            Kcal::new(100.0).unwrap(),
            1.0,
            None,
        )
        .unwrap()]);
        let decomposed = resolved_meal(vec![UnifiedFiiItem::new(
            "Greek yogurt bowl",
            Kcal::new(100.0).unwrap(),
            1.0,
            None,
        )
        .unwrap()]);
        let macro_fallback = resolved_meal(vec![UnifiedFiiItem::new(
            "cultured dairy cup",
            Kcal::new(180.0).unwrap(),
            1.0,
            None,
        )
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
        )]);
        let unknown = resolved_meal(vec![UnifiedFiiItem::new(
            "mystery mineral water",
            Kcal::new(80.0).unwrap(),
            1.0,
            None,
        )
        .unwrap()]);

        let meals = vec![provided, exact, mapped, decomposed, macro_fallback, unknown];
        let sources: Vec<EstimateSource> = meals
            .iter()
            .map(|meal| meal.item_estimates()[0].source())
            .collect();
        assert_eq!(
            sources,
            vec![
                EstimateSource::UserConfirmed,
                EstimateSource::ExactFii,
                EstimateSource::MappedFii,
                EstimateSource::MappedFii,
                EstimateSource::MacroFallback,
                EstimateSource::Unknown,
            ]
        );
        assert_approx_eq(meals[5].meal_kcal_total().value(), 80.0);
        assert_approx_eq(meals[5].meal_insulin_load_total().value(), 0.0);

        let expected_dil: f64 = meals
            .iter()
            .map(|meal| meal.meal_insulin_load_total().value())
            .sum();
        let expected_energy: f64 = meals
            .iter()
            .map(|meal| meal.meal_kcal_total().value())
            .sum();
        let series = compute_chronic_series(&[day("2026-01-01", meals)]).unwrap();

        assert_approx_eq(series[0].daily_dil().value(), expected_dil);
        assert_approx_eq(series[0].total_daily_energy().value(), expected_energy);
        assert_approx_eq(series[0].daily_dii(), expected_dil / expected_energy);
    }

    #[test]
    fn iso_dates_are_sorted_and_runtime_values_are_not_rounded() {
        let precise_kcal = 1.0 / 3.0;
        let series = compute_chronic_series(&[
            day("2026-01-03", vec![provided_meal(1.0, 100.0)]),
            day("2026-01-01", vec![provided_meal(precise_kcal, 100.0)]),
            day("2026-01-02", vec![]),
        ])
        .unwrap();

        assert_eq!(
            series
                .iter()
                .map(ChronicMetricPoint::date)
                .collect::<Vec<_>>(),
            vec!["2026-01-01", "2026-01-02", "2026-01-03"]
        );
        assert_approx_eq(series[0].daily_dil().value(), precise_kcal);
        assert_ne!(series[0].daily_dil().value(), 0.3333);
    }

    #[test]
    fn existing_validated_constructors_still_reject_invalid_values() {
        assert!(Kcal::new(-1.0).is_err());
        assert!(Kcal::new(f64::NAN).is_err());
        assert!(
            UnifiedFiiItem::new("invalid quantity", Kcal::new(100.0).unwrap(), -1.0, None,)
                .is_err()
        );
    }
}
