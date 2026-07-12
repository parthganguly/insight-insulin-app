"""Daily DIL/DII aggregation and the 7-day logged-meal rolling trend.

Trend semantics (issue #93): a day counts toward the rolling trend only when
it has at least one logged meal. Days without logs are *missing data*, not
zero-insulin days — zero-filling them made identical eating look
substantially "better" when logged less often, which is a logging-adherence
artifact, not a dietary signal. The rolling values are therefore descriptive
means over the logged days inside the trailing window, with explicit
coverage metadata, and are None when the window contains no logged days.

Known remaining limitation (documented, not solved here): meals that were
eaten but not logged on an otherwise-logged day are still invisible, so a
partially logged day still under-represents that day's true intake. Daily
DIL and DII definitions for logged data are unchanged.
"""

ROLLING_WINDOW_DAYS = 7


def build_chronic_series_from_daily_maps(
    daily_totals: dict[str, float],
    daily_energy: dict[str, float],
    logged_days: set[str],
) -> list[dict[str, float | int | bool | str | None]]:
    ordered_days = sorted(daily_totals.keys())
    chronic_series: list[dict[str, float | int | bool | str | None]] = []
    # Trailing window rows: (is_logged, daily_dil, daily_dii).
    window_rows: list[tuple[bool, float, float]] = []

    for day_key in ordered_days:
        is_logged = day_key in logged_days
        daily_dil = float(daily_totals.get(day_key, 0.0) or 0.0)
        total_daily_energy = float(daily_energy.get(day_key, 0.0) or 0.0)
        # Unchanged logged-day definition: a logged day with zero or malformed
        # energy has daily_dii 0.0 rather than a division error.
        daily_dii = (daily_dil / total_daily_energy) if total_daily_energy > 0 else 0.0

        window_rows.append((is_logged, daily_dil, daily_dii))
        if len(window_rows) > ROLLING_WINDOW_DAYS:
            window_rows.pop(0)

        logged_window_rows = [row for row in window_rows if row[0]]
        logged_days_in_window = len(logged_window_rows)
        if logged_days_in_window > 0:
            rolling_7d_dil: float | None = sum(row[1] for row in logged_window_rows) / logged_days_in_window
            rolling_7d_dii: float | None = sum(row[2] for row in logged_window_rows) / logged_days_in_window
        else:
            rolling_7d_dil = None
            rolling_7d_dii = None

        chronic_series.append(
            {
                "date": day_key,
                "logged": is_logged,
                "daily_dil": daily_dil if is_logged else None,
                "total_daily_energy": total_daily_energy if is_logged else None,
                "daily_dii": daily_dii if is_logged else None,
                "rolling_7d_dil": rolling_7d_dil,
                "rolling_7d_dii": rolling_7d_dii,
                "logged_days_in_window": logged_days_in_window,
            }
        )

    return chronic_series
