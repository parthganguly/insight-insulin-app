"""B2-1 characterization fixtures for the canonical POST /meals model.

These fixtures intentionally pin current behavior before the shared-model
refactor. They are implementation-parity fixtures, not scientific validation.
Synthetic data only.
"""

import asyncio
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from api.meals import create_meal  # noqa: E402
from models import MealCreate  # noqa: E402


class FakeDb:
    def add(self, obj) -> None:
        self.obj = obj

    def commit(self) -> None:
        pass

    def refresh(self, obj) -> None:
        pass


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


def modeled_fields(response) -> dict:
    return response.model_dump(mode="json", exclude={"id", "created_at"})


class MealModelingGoldenTests(unittest.TestCase):
    maxDiff = None

    def save(self, meal_name: str, items: list[dict]):
        request = MealCreate.model_validate(
            {
                "meal_name": meal_name,
                "created_at": "2026-07-18T12:00:00Z",
                "items": items,
            }
        )
        return asyncio.run(create_meal(request, FakeDb()))

    def assert_single_item_case(
        self,
        *,
        meal_name: str,
        item: dict,
        expected_item: dict,
        expected_meal: dict,
    ) -> None:
        actual = modeled_fields(self.save(meal_name, [item]))
        expected = {
            "meal_name": meal_name,
            "items": [expected_item],
            **expected_meal,
        }
        self.assertEqual(actual, expected)

    def test_post_meals_exact_fii_golden(self) -> None:
        self.assert_single_item_case(
            meal_name="Golden exact",
            item=BASE_ITEM | {"name": "white bread"},
            expected_item={
                "name": "white bread",
                "quantity": 1.0,
                "unit": "serving",
                "kcalPerUnit": 200.0,
                "carb_g": 0.0,
                "protein_g": None,
                "fat_g": None,
                "satFat_g": 0.0,
                "gi": 0,
                "fii_value": None,
                "fii": None,
                "kcal_item": 200.0,
                "insulin_load": 200.0,
                "confidence": 0.7,
                "fii_source": "exact_fii",
                "why": "Used a direct Food Insulin Index match and scaled it by eaten energy.",
            },
            expected_meal={
                "insulin_load_total": 200.0,
                "acute_score": 666.6666666666667,
                "kcal_total": 200.0,
                "carbs_total": 0.0,
                "protein_total": 0.0,
                "fat_total": 0.0,
                "estimate_quality": "high",
                "estimate_status": "estimated",
                "main_insulin_drivers": ["white bread"],
            },
        )

    def test_post_meals_mapped_fii_golden(self) -> None:
        self.assert_single_item_case(
            meal_name="Golden mapped",
            item=BASE_ITEM | {"name": "chicken biryani"},
            expected_item={
                "name": "chicken biryani",
                "quantity": 1.0,
                "unit": "serving",
                "kcalPerUnit": 200.0,
                "carb_g": 0.0,
                "protein_g": None,
                "fat_g": None,
                "satFat_g": 0.0,
                "gi": 0,
                "fii_value": None,
                "fii": None,
                "kcal_item": 200.0,
                "insulin_load": 94.80000000000001,
                "confidence": 0.7000000000000001,
                "fii_source": "mapped_fii",
                "why": "Used a normalized or nearest measured Food Insulin Index match and scaled it by eaten energy.",
            },
            expected_meal={
                "insulin_load_total": 94.80000000000001,
                "acute_score": 316.00000000000006,
                "kcal_total": 200.0,
                "carbs_total": 0.0,
                "protein_total": 0.0,
                "fat_total": 0.0,
                "estimate_quality": "medium",
                "estimate_status": "estimated",
                "main_insulin_drivers": ["chicken biryani"],
            },
        )

    def test_post_meals_user_confirmed_fii_golden(self) -> None:
        self.assert_single_item_case(
            meal_name="Golden explicit",
            item=BASE_ITEM | {"name": "synthetic explicit food", "fii": 42},
            expected_item={
                "name": "synthetic explicit food",
                "quantity": 1.0,
                "unit": "serving",
                "kcalPerUnit": 200.0,
                "carb_g": 0.0,
                "protein_g": None,
                "fat_g": None,
                "satFat_g": 0.0,
                "gi": 0,
                "fii_value": 42,
                "fii": 42,
                "kcal_item": 200.0,
                "insulin_load": 84.0,
                "confidence": 1.0,
                "fii_source": "user_confirmed",
                "why": "Used the provided Food Insulin Index value and scaled it by eaten energy.",
            },
            expected_meal={
                "insulin_load_total": 84.0,
                "acute_score": 280.0,
                "kcal_total": 200.0,
                "carbs_total": 0.0,
                "protein_total": 0.0,
                "fat_total": 0.0,
                "estimate_quality": "high",
                "estimate_status": "estimated",
                "main_insulin_drivers": ["synthetic explicit food"],
            },
        )

    def test_post_meals_macro_fallback_golden(self) -> None:
        self.assert_single_item_case(
            meal_name="Golden fallback",
            item=BASE_ITEM
            | {
                "name": "synthetic fallback food",
                "carb_g": 30.0,
                "protein_g": 20.0,
                "fat_g": 5.0,
                "satFat_g": 2.0,
                "gi": 60,
            },
            expected_item={
                "name": "synthetic fallback food",
                "quantity": 1.0,
                "unit": "serving",
                "kcalPerUnit": 200.0,
                "carb_g": 30.0,
                "protein_g": 20.0,
                "fat_g": 5.0,
                "satFat_g": 2.0,
                "gi": 60,
                "fii_value": None,
                "fii": None,
                "kcal_item": 200.0,
                "insulin_load": 16.8,
                "confidence": 0.8,
                "fii_source": "macro_fallback",
                "why": "Used a lower-confidence fallback from available nutrition data because direct Food Insulin Index data was unavailable.",
            },
            expected_meal={
                "insulin_load_total": 16.8,
                "acute_score": 56.00000000000001,
                "kcal_total": 200.0,
                "carbs_total": 30.0,
                "protein_total": 20.0,
                "fat_total": 5.0,
                "estimate_quality": "low",
                "estimate_status": "estimated",
                "main_insulin_drivers": ["synthetic fallback food"],
            },
        )

    def test_post_meals_unknown_golden(self) -> None:
        self.assert_single_item_case(
            meal_name="Golden unknown",
            item=BASE_ITEM | {"name": "synthetic unknown food"},
            expected_item={
                "name": "synthetic unknown food",
                "quantity": 1.0,
                "unit": "serving",
                "kcalPerUnit": 200.0,
                "carb_g": 0.0,
                "protein_g": None,
                "fat_g": None,
                "satFat_g": 0.0,
                "gi": 0,
                "fii_value": None,
                "fii": None,
                "kcal_item": 200.0,
                "insulin_load": 0.0,
                "confidence": 0.2,
                "fii_source": "unknown",
                "why": "Used an unknown-source estimate because direct Food Insulin Index data was unavailable.",
            },
            expected_meal={
                "insulin_load_total": 0.0,
                "acute_score": 0.0,
                "kcal_total": 200.0,
                "carbs_total": 0.0,
                "protein_total": 0.0,
                "fat_total": 0.0,
                "estimate_quality": "unknown",
                "estimate_status": "estimated",
                "main_insulin_drivers": ["synthetic unknown food"],
            },
        )

    def test_post_meals_mixed_sources_golden(self) -> None:
        items = [
            BASE_ITEM | {"name": "white bread", "kcalPerUnit": 100.0},
            BASE_ITEM | {"name": "chicken biryani", "kcalPerUnit": 300.0},
            BASE_ITEM
            | {
                "name": "synthetic fallback food",
                "kcalPerUnit": 250.0,
                "carb_g": 30.0,
                "protein_g": 20.0,
                "fat_g": 5.0,
                "satFat_g": 2.0,
                "gi": 60,
            },
            BASE_ITEM | {"name": "synthetic unknown food", "kcalPerUnit": 50.0},
        ]
        actual = modeled_fields(self.save("Golden mixed", items))
        self.assertEqual(
            actual,
            {
                "meal_name": "Golden mixed",
                "items": [
                    {
                        "name": "white bread",
                        "quantity": 1.0,
                        "unit": "serving",
                        "kcalPerUnit": 100.0,
                        "carb_g": 0.0,
                        "protein_g": None,
                        "fat_g": None,
                        "satFat_g": 0.0,
                        "gi": 0,
                        "fii_value": None,
                        "fii": None,
                        "kcal_item": 100.0,
                        "insulin_load": 100.0,
                        "confidence": 0.7,
                        "fii_source": "exact_fii",
                        "why": "Used a direct Food Insulin Index match and scaled it by eaten energy.",
                    },
                    {
                        "name": "chicken biryani",
                        "quantity": 1.0,
                        "unit": "serving",
                        "kcalPerUnit": 300.0,
                        "carb_g": 0.0,
                        "protein_g": None,
                        "fat_g": None,
                        "satFat_g": 0.0,
                        "gi": 0,
                        "fii_value": None,
                        "fii": None,
                        "kcal_item": 300.0,
                        "insulin_load": 142.20000000000002,
                        "confidence": 0.7000000000000001,
                        "fii_source": "mapped_fii",
                        "why": "Used a normalized or nearest measured Food Insulin Index match and scaled it by eaten energy.",
                    },
                    {
                        "name": "synthetic fallback food",
                        "quantity": 1.0,
                        "unit": "serving",
                        "kcalPerUnit": 250.0,
                        "carb_g": 30.0,
                        "protein_g": 20.0,
                        "fat_g": 5.0,
                        "satFat_g": 2.0,
                        "gi": 60,
                        "fii_value": None,
                        "fii": None,
                        "kcal_item": 250.0,
                        "insulin_load": 16.8,
                        "confidence": 0.8,
                        "fii_source": "macro_fallback",
                        "why": "Used a lower-confidence fallback from available nutrition data because direct Food Insulin Index data was unavailable.",
                    },
                    {
                        "name": "synthetic unknown food",
                        "quantity": 1.0,
                        "unit": "serving",
                        "kcalPerUnit": 50.0,
                        "carb_g": 0.0,
                        "protein_g": None,
                        "fat_g": None,
                        "satFat_g": 0.0,
                        "gi": 0,
                        "fii_value": None,
                        "fii": None,
                        "kcal_item": 50.0,
                        "insulin_load": 0.0,
                        "confidence": 0.2,
                        "fii_source": "unknown",
                        "why": "Used an unknown-source estimate because direct Food Insulin Index data was unavailable.",
                    },
                ],
                "insulin_load_total": 259.0,
                "acute_score": 863.3333333333333,
                "kcal_total": 700.0,
                "carbs_total": 30.0,
                "protein_total": 20.0,
                "fat_total": 5.0,
                "estimate_quality": "low",
                "estimate_status": "estimated",
                "main_insulin_drivers": [
                    "chicken biryani",
                    "white bread",
                    "synthetic fallback food",
                ],
            },
        )

    def test_post_meals_zero_kcal_issue_97_golden(self) -> None:
        """Keep arithmetic and source quality while marking #97 incompleteness."""
        self.assert_single_item_case(
            meal_name="Golden zero kcal issue 97",
            item=BASE_ITEM
            | {
                "name": "rice",
                "kcalPerUnit": 0.0,
                "carb_g": 0.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "satFat_g": 0.0,
                "gi": 0,
            },
            expected_item={
                "name": "rice",
                "quantity": 1.0,
                "unit": "serving",
                "kcalPerUnit": 0.0,
                "carb_g": 0.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "satFat_g": 0.0,
                "gi": 0,
                "fii_value": None,
                "fii": None,
                "kcal_item": 0.0,
                "insulin_load": 0.0,
                "confidence": 0.7,
                "fii_source": "exact_fii",
                "why": "Used a direct Food Insulin Index match and scaled it by eaten energy.",
            },
            expected_meal={
                "insulin_load_total": 0.0,
                "acute_score": 0.0,
                "kcal_total": 0.0,
                "carbs_total": 0.0,
                "protein_total": 0.0,
                "fat_total": 0.0,
                "estimate_quality": "high",
                "estimate_status": "insufficient_data",
                "main_insulin_drivers": ["rice"],
            },
        )

    def test_none_versus_zero_optional_inputs_preserve_distinct_modeling_paths(self) -> None:
        none_item = BASE_ITEM | {"name": "synthetic optional boundary"}
        zero_item = BASE_ITEM | {
            "name": "synthetic optional boundary",
            "carb_g": 0.0,
            "gi": 0,
        }

        none_result = modeled_fields(self.save("None path", [none_item]))
        zero_result = modeled_fields(self.save("Zero path", [zero_item]))

        # Persistence maps both missing values to zero in the response, but the
        # request-time distinction changes the authoritative source path.
        self.assertEqual(none_result["items"][0]["carb_g"], 0.0)
        self.assertEqual(zero_result["items"][0]["carb_g"], 0.0)
        self.assertEqual(none_result["items"][0]["gi"], 0)
        self.assertEqual(zero_result["items"][0]["gi"], 0)
        self.assertEqual(none_result["items"][0]["fii_source"], "unknown")
        self.assertEqual(none_result["items"][0]["confidence"], 0.2)
        self.assertEqual(none_result["estimate_quality"], "unknown")
        self.assertEqual(zero_result["items"][0]["fii_source"], "macro_fallback")
        self.assertEqual(zero_result["items"][0]["confidence"], 0.7)
        self.assertEqual(zero_result["estimate_quality"], "low")


if __name__ == "__main__":
    unittest.main()
