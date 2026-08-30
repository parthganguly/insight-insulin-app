import math
from collections.abc import Iterable
from typing import Literal


EstimateStatus = Literal["estimated", "insufficient_data"]

ENERGY_SCALED_FII_SOURCES = frozenset(
    {"exact_fii", "mapped_fii", "user_confirmed"}
)


def is_incomplete_fii_item(
    *, quantity: float, fii_source: str, kcal_per_unit: float | None
) -> bool:
    """Return whether a positive-portion FII path lacks usable energy input."""
    if quantity <= 0 or fii_source not in ENERGY_SCALED_FII_SOURCES:
        return False
    if kcal_per_unit is None:
        return True
    return not math.isfinite(kcal_per_unit) or kcal_per_unit <= 0


def resolve_estimate_status(
    items: Iterable[tuple[float, str, float | None]],
) -> EstimateStatus:
    """Derive meal completeness without inspecting scores, quality, or names."""
    if any(
        is_incomplete_fii_item(
            quantity=quantity,
            fii_source=fii_source,
            kcal_per_unit=kcal_per_unit,
        )
        for quantity, fii_source, kcal_per_unit in items
    ):
        return "insufficient_data"
    return "estimated"
