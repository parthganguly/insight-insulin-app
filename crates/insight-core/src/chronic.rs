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
    logged: bool,
    daily_dil: Option<InsulinLoad>,
    total_daily_energy: Option<Kcal>,
    daily_dii: Option<f64>,
    rolling_7d_dil: Option<InsulinLoad>,
    rolling_7d_dii: Option<f64>,
    logged_days_in_window: usize,
}

impl ChronicMetricPoint {
    pub fn date(&self) -> &str {
        &self.date
    }

    pub const fn logged(&self) -> bool {
        self.logged
    }

    pub const fn daily_dil(&self) -> Option<InsulinLoad> {
        self.daily_dil
    }

    pub const fn total_daily_energy(&self) -> Option<Kcal> {
        self.total_daily_energy
    }

    pub const fn daily_dii(&self) -> Option<f64> {
        self.daily_dii
    }

    pub const fn rolling_7d_dil(&self) -> Option<InsulinLoad> {
        self.rolling_7d_dil
    }

    pub const fn rolling_7d_dii(&self) -> Option<f64> {
        self.rolling_7d_dii
    }

    pub const fn logged_days_in_window(&self) -> usize {
        self.logged_days_in_window
    }
}

/// Reproduces the backend's logged-days-only daily DIL/DII and rolling trend
/// (issue #93).
///
/// Product-parity callers provide one explicit row per ISO calendar date. A
/// day with an empty meal list is an *unlogged* day: it carries no daily
/// values and is excluded from the rolling means, which are descriptive
/// averages over the logged days inside the trailing seven-row window and
/// `None` when that window contains no logged days. This function does not
/// infer dates or timezone boundaries, and it does not treat missing logs as
/// zero-insulin days.
pub fn compute_chronic_series(
    days: &[ChronicDayInput],
) -> Result<Vec<ChronicMetricPoint>, ValueValidationError> {
    let mut ordered_days: Vec<&ChronicDayInput> = days.iter().collect();
    ordered_days.sort_by(|left, right| left.date().cmp(right.date()));

    let mut series = Vec::with_capacity(ordered_days.len());
    // Trailing window rows: Some((dil, dii)) for logged days, None otherwise.
    let mut window_rows: VecDeque<Option<(f64, f64)>> =
        VecDeque::with_capacity(ROLLING_WINDOW_DAYS);

    for day in ordered_days {
        let logged = !day.meals().is_empty();
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
        // Unchanged logged-day definition: a logged day with zero energy has
        // daily_dii 0.0 rather than a division error.
        let daily_dii = if total_daily_energy.value() > 0.0 {
            daily_dil.value() / total_daily_energy.value()
        } else {
            0.0
        };
        let daily_dii = validate_non_negative_finite(daily_dii, "DailyDii")?;

        window_rows.push_back(if logged {
            Some((daily_dil.value(), daily_dii))
        } else {
            None
        });
        if window_rows.len() > ROLLING_WINDOW_DAYS {
            window_rows.pop_front();
        }

        let logged_rows: Vec<(f64, f64)> = window_rows.iter().flatten().copied().collect();
        let logged_days_in_window = logged_rows.len();
        let (rolling_7d_dil, rolling_7d_dii) = if logged_days_in_window > 0 {
            let count = logged_days_in_window as f64;
            let mean_dil = logged_rows.iter().map(|row| row.0).sum::<f64>() / count;
            let mean_dii = logged_rows.iter().map(|row| row.1).sum::<f64>() / count;
            (
                Some(InsulinLoad::new(mean_dil)?),
                Some(validate_non_negative_finite(mean_dii, "Rolling7dDii")?),
            )
        } else {
            (None, None)
        };

        series.push(ChronicMetricPoint {
            date: day.date().to_owned(),
            logged,
            daily_dil: logged.then_some(daily_dil),
            total_daily_energy: logged.then_some(total_daily_energy),
            daily_dii: logged.then_some(daily_dii),
            rolling_7d_dil,
            rolling_7d_dii,
            logged_days_in_window,
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
        assert!(series[0].logged());
        assert_eq!(series[0].logged_days_in_window(), 1);
        assert_approx_eq(series[0].daily_dil().unwrap().value(), 100.0);
        assert_approx_eq(series[0].total_daily_energy().unwrap().value(), 200.0);
        assert_approx_eq(series[0].daily_dii().unwrap(), 0.5);
        assert_approx_eq(series[0].rolling_7d_dil().unwrap().value(), 100.0);
        assert_approx_eq(series[0].rolling_7d_dii().unwrap(), 0.5);
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

        assert_approx_eq(series[0].daily_dil().unwrap().value(), 110.0);
        assert_approx_eq(series[0].total_daily_energy().unwrap().value(), 200.0);
        assert_approx_eq(series[0].daily_dii().unwrap(), 0.55);
    }

    #[test]
    fn unlogged_days_carry_no_values_and_no_rolling_score() {
        assert!(compute_chronic_series(&[]).unwrap().is_empty());

        let series = compute_chronic_series(&[
            day("2026-01-01", vec![]),
            day("2026-01-02", vec![]),
            day("2026-01-03", vec![]),
        ])
        .unwrap();

        assert_eq!(series.len(), 3);
        for point in series {
            assert!(!point.logged());
            assert_eq!(point.logged_days_in_window(), 0);
            assert_eq!(point.daily_dil(), None);
            assert_eq!(point.total_daily_energy(), None);
            assert_eq!(point.daily_dii(), None);
            assert_eq!(point.rolling_7d_dil(), None);
            assert_eq!(point.rolling_7d_dii(), None);
        }
    }

    #[test]
    fn unlogged_days_are_excluded_from_rolling_means_not_zero_filled() {
        let series = compute_chronic_series(&[
            day("2026-01-01", vec![provided_meal(200.0, 50.0)]),
            day("2026-01-02", vec![]),
            day("2026-01-03", vec![provided_meal(100.0, 60.0)]),
        ])
        .unwrap();

        assert!(!series[1].logged());
        assert_eq!(series[1].daily_dil(), None);
        assert_eq!(series[1].daily_dii(), None);
        // The unlogged middle day keeps its window's earlier logged value.
        assert_eq!(series[1].logged_days_in_window(), 1);
        assert_approx_eq(series[1].rolling_7d_dil().unwrap().value(), 100.0);
        // Rolling means average the two logged days only (no third zero row).
        assert_eq!(series[2].logged_days_in_window(), 2);
        assert_approx_eq(
            series[2].rolling_7d_dil().unwrap().value(),
            (100.0 + 60.0) / 2.0,
        );
        assert_approx_eq(series[2].rolling_7d_dii().unwrap(), (0.5 + 0.6) / 2.0);
    }

    #[test]
    fn identical_logged_day_keeps_the_same_trend_value_at_any_coverage() {
        // KEY parity regression (issue #93): identical logged days must give
        // the same rolling value whether logged 1, 4, or 7 of 7 days; only
        // logged_days_in_window changes. Zero-filling made the sporadic
        // pattern's value 1/7 of the daily one.
        let logged = || provided_meal(400.0, 15.0); // dil 60, dii 0.15

        let one_of_seven: Vec<ChronicDayInput> = (1..=7)
            .map(|day_number| {
                let meals = if day_number == 4 {
                    vec![logged()]
                } else {
                    vec![]
                };
                day(&format!("2026-01-{day_number:02}"), meals)
            })
            .collect();
        let four_of_seven: Vec<ChronicDayInput> = (1..=7)
            .map(|day_number| {
                let meals = if day_number % 2 == 1 {
                    vec![logged()]
                } else {
                    vec![]
                };
                day(&format!("2026-01-{day_number:02}"), meals)
            })
            .collect();
        let seven_of_seven: Vec<ChronicDayInput> = (1..=7)
            .map(|day_number| day(&format!("2026-01-{day_number:02}"), vec![logged()]))
            .collect();

        for (inputs, expected_coverage) in
            [(one_of_seven, 1), (four_of_seven, 4), (seven_of_seven, 7)]
        {
            let series = compute_chronic_series(&inputs).unwrap();
            let latest = series.last().unwrap();
            assert_eq!(latest.logged_days_in_window(), expected_coverage);
            assert_approx_eq(latest.rolling_7d_dil().unwrap().value(), 60.0);
            assert_approx_eq(latest.rolling_7d_dii().unwrap(), 0.15);
        }
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
            assert_eq!(point.logged_days_in_window(), index + 1);
            assert_approx_eq(
                point.rolling_7d_dil().unwrap().value(),
                (1.0 + rows_seen) / 2.0,
            );
            assert_approx_eq(point.rolling_7d_dii().unwrap(), 1.0);
        }
        assert_eq!(series[7].logged_days_in_window(), 7);
        assert_approx_eq(series[7].rolling_7d_dil().unwrap().value(), 5.0);
        assert_approx_eq(series[7].rolling_7d_dii().unwrap(), 1.0);
    }

    #[test]
    fn rolling_dii_is_mean_of_daily_ratios_not_ratio_of_window_sums() {
        let series = compute_chronic_series(&[
            day("2026-01-01", vec![provided_meal(100.0, 10.0)]),
            day("2026-01-02", vec![provided_meal(400.0, 5.0)]),
        ])
        .unwrap();

        assert_approx_eq(series[1].rolling_7d_dii().unwrap(), (0.1 + 0.05) / 2.0);
        assert_ne!(
            series[1].rolling_7d_dii().unwrap(),
            (10.0 + 20.0) / (100.0 + 400.0)
        );
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

        assert_approx_eq(series[6].rolling_7d_dil().unwrap().value(), 100.0);
        assert!(
            series[7].rolling_7d_dil().unwrap().value()
                < series[6].rolling_7d_dil().unwrap().value()
        );
        assert!(series[7..].windows(2).all(|window| {
            window[1].rolling_7d_dil().unwrap().value()
                <= window[0].rolling_7d_dil().unwrap().value()
        }));
        assert_approx_eq(series[13].rolling_7d_dil().unwrap().value(), 10.0);
    }

    #[test]
    fn logged_zero_energy_day_counts_as_logged_with_zero_dii() {
        let zero_energy = resolved_meal(vec![UnifiedFiiItem::new(
            "mystery mineral water",
            Kcal::new(0.0).unwrap(),
            1.0,
            None,
        )
        .unwrap()]);

        let series = compute_chronic_series(&[day("2026-01-01", vec![zero_energy])]).unwrap();

        assert!(series[0].logged());
        assert_eq!(series[0].logged_days_in_window(), 1);
        assert_approx_eq(series[0].daily_dii().unwrap(), 0.0);
        assert_approx_eq(series[0].rolling_7d_dii().unwrap(), 0.0);
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

        assert_approx_eq(series[0].daily_dil().unwrap().value(), expected_dil);
        assert_approx_eq(
            series[0].total_daily_energy().unwrap().value(),
            expected_energy,
        );
        assert_approx_eq(
            series[0].daily_dii().unwrap(),
            expected_dil / expected_energy,
        );
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
        assert_approx_eq(series[0].daily_dil().unwrap().value(), precise_kcal);
        assert_ne!(series[0].daily_dil().unwrap().value(), 0.3333);
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
