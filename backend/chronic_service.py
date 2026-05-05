def build_chronic_series_from_daily_maps(
    daily_totals: dict[str, float],
    daily_energy: dict[str, float],
) -> list[dict[str, float | str]]:
    ordered_days = sorted(daily_totals.keys())
    chronic_series: list[dict[str, float | str]] = []
    running_dil: list[float] = []
    running_dii: list[float] = []

    for day_key in ordered_days:
        daily_dil = float(daily_totals.get(day_key, 0.0) or 0.0)
        total_daily_energy = float(daily_energy.get(day_key, 0.0) or 0.0)
        daily_dii = (daily_dil / total_daily_energy) if total_daily_energy > 0 else 0.0

        running_dil.append(daily_dil)
        running_dii.append(daily_dii)

        rolling_dil_window = running_dil[-7:]
        rolling_dii_window = running_dii[-7:]
        rolling_7d_dil = sum(rolling_dil_window) / len(rolling_dil_window)
        rolling_7d_dii = sum(rolling_dii_window) / len(rolling_dii_window)

        chronic_series.append(
            {
                "date": day_key,
                "daily_dil": daily_dil,
                "total_daily_energy": total_daily_energy,
                "daily_dii": daily_dii,
                "rolling_7d_dil": rolling_7d_dil,
                "rolling_7d_dii": rolling_7d_dii,
            }
        )

    return chronic_series
