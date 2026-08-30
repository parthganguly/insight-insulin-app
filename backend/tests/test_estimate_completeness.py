import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from api.meals import model_meal  # noqa: E402
from estimate_completeness import (  # noqa: E402
    is_incomplete_fii_item,
    resolve_estimate_status,
)
from models import MealPreviewRequest  # noqa: E402


BASE_ITEM = {
    "quantity": 1.0,
    "unit": "serving",
    "kcalPerUnit": 200.0,
    "carb_g": None,
    "protein_g": None,
    "fat_g": None,
    "satFat_g": None,
    "gi": None,
}


def model(items: list[dict]):
    request = MealPreviewRequest.model_validate(
        {"meal_name": "Synthetic completeness meal", "items": items}
    )
    return model_meal(request)


class EstimateCompletenessPredicateTests(unittest.TestCase):
    def test_fii_scaled_positive_portion_requires_finite_positive_kcal(self) -> None:
        for kcal_per_unit in [None, 0.0, -1.0, float("nan"), float("inf"), float("-inf")]:
            with self.subTest(kcal_per_unit=kcal_per_unit):
                self.assertTrue(
                    is_incomplete_fii_item(
                        quantity=1.0,
                        fii_source="exact_fii",
                        kcal_per_unit=kcal_per_unit,
                    )
                )

        self.assertFalse(
            is_incomplete_fii_item(
                quantity=1.0,
                fii_source="exact_fii",
                kcal_per_unit=0.01,
            )
        )

    def test_all_energy_scaled_fii_sources_are_covered(self) -> None:
        for source in ["exact_fii", "mapped_fii", "user_confirmed"]:
            with self.subTest(source=source):
                self.assertTrue(
                    is_incomplete_fii_item(
                        quantity=1.0, fii_source=source, kcal_per_unit=0.0
                    )
                )

    def test_fallback_unknown_and_non_positive_portions_do_not_trigger(self) -> None:
        for source in ["macro_fallback", "unknown"]:
            self.assertFalse(
                is_incomplete_fii_item(
                    quantity=1.0, fii_source=source, kcal_per_unit=0.0
                )
            )
        for quantity in [0.0, -1.0]:
            self.assertFalse(
                is_incomplete_fii_item(
                    quantity=quantity,
                    fii_source="exact_fii",
                    kcal_per_unit=0.0,
                )
            )

    def test_empty_collection_is_estimated(self) -> None:
        self.assertEqual(resolve_estimate_status([]), "estimated")


class MealEstimateStatusTests(unittest.TestCase):
    def test_complete_exact_fii_item_is_estimated(self) -> None:
        result = model([BASE_ITEM | {"name": "white bread"}])
        self.assertEqual(result.estimate_status, "estimated")
        self.assertEqual(result.estimate_quality, "high")

    def test_exact_mapped_and_user_confirmed_missing_energy_are_insufficient(self) -> None:
        cases = [
            BASE_ITEM | {"name": "white bread", "kcalPerUnit": None},
            BASE_ITEM | {"name": "chicken biryani", "kcalPerUnit": None},
            BASE_ITEM
            | {
                "name": "synthetic entered food",
                "kcalPerUnit": None,
                "fii": 42,
            },
        ]
        for item in cases:
            with self.subTest(item=item["name"]):
                self.assertEqual(model([item]).estimate_status, "insufficient_data")

    def test_exact_mapped_and_user_confirmed_zero_energy_are_insufficient(self) -> None:
        cases = [
            BASE_ITEM | {"name": "white bread", "kcalPerUnit": 0.0},
            BASE_ITEM | {"name": "chicken biryani", "kcalPerUnit": 0.0},
            BASE_ITEM
            | {
                "name": "synthetic entered food",
                "kcalPerUnit": 0.0,
                "fii": 42,
            },
        ]
        for item in cases:
            with self.subTest(item=item["name"]):
                self.assertEqual(model([item]).estimate_status, "insufficient_data")

    def test_any_incomplete_fii_item_makes_whole_meal_insufficient(self) -> None:
        result = model(
            [
                BASE_ITEM | {"name": "white bread"},
                BASE_ITEM | {"name": "plain yogurt", "kcalPerUnit": 0.0},
            ]
        )
        self.assertEqual(result.estimate_status, "insufficient_data")
        self.assertEqual(result.estimate_quality, "high")

    def test_macro_fallback_zero_energy_does_not_newly_trigger_status(self) -> None:
        result = model(
            [
                BASE_ITEM
                | {
                    "name": "synthetic fallback food",
                    "kcalPerUnit": 0.0,
                    "carb_g": 30.0,
                    "protein_g": 20.0,
                    "gi": 60,
                }
            ]
        )
        self.assertEqual(result.items[0].fii_source, "macro_fallback")
        self.assertEqual(result.estimate_status, "estimated")
        self.assertEqual(result.estimate_quality, "low")

    def test_unknown_and_empty_paths_keep_existing_quality_control(self) -> None:
        unknown = model([BASE_ITEM | {"name": "synthetic unknown food", "kcalPerUnit": 0.0}])
        empty = model([])

        self.assertEqual(unknown.estimate_status, "estimated")
        self.assertEqual(unknown.estimate_quality, "unknown")
        self.assertEqual(empty.estimate_status, "estimated")
        self.assertEqual(empty.estimate_quality, "unknown")

    def test_zero_quantity_exact_fii_item_does_not_trigger(self) -> None:
        result = model(
            [BASE_ITEM | {"name": "white bread", "quantity": 0.0, "kcalPerUnit": 0.0}]
        )
        self.assertEqual(result.items[0].fii_source, "exact_fii")
        self.assertEqual(result.estimate_status, "estimated")


if __name__ == "__main__":
    unittest.main()
