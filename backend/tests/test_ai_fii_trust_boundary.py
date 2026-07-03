import asyncio
import importlib
import sys
import unittest
from unittest.mock import patch

from api.meals import create_meal
from estimate_quality import resolve_estimate_quality
from models import MealCreate
from scoring_service import compute_insulin_load_item


class FakeDb:
    def __init__(self) -> None:
        self.meal = None

    def add(self, meal: object) -> None:
        self.meal = meal

    def commit(self) -> None:
        pass

    def refresh(self, meal: object) -> None:
        self.meal = meal


class AiFiiTrustBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        sys.modules.pop("services", None)
        with patch("dotenv.load_dotenv"):
            cls.services = importlib.import_module("services")

    def test_prompt_and_schema_do_not_request_fii(self) -> None:
        prompt = self.services.AI_MEAL_EXTRACTION_PROMPT.lower()
        self.assertNotIn("food insulin index", prompt)
        self.assertNotIn("fii", prompt)
        self.assertNotIn("fii", self.services.AiExtractedMealItem.model_fields)

    def test_parsed_ai_item_omits_missing_and_legacy_fii(self) -> None:
        item_data = {
            "name": "plain yogurt",
            "quantity": 1.0,
            "unit": "serving",
            "kcalPerUnit": 180.0,
            "carb_g": 16.0,
            "protein_g": 8.0,
            "fat_g": 4.0,
            "gi": 35,
            "satFat_g": 2.0,
            "fii": 0,
        }

        parsed = self.services.AiExtractedMealItem.model_validate(item_data)

        self.assertNotIn("fii", parsed.model_dump())

    def test_ai_item_uses_deterministic_lookup_and_quality(self) -> None:
        insulin_load, confidence, source = compute_insulin_load_item(
            food_name="plain yogurt",
            quantity=1.0,
            kcal_per_unit=180.0,
            fii=None,
            gi=35,
            carb_g=16.0,
            protein_g=8.0,
            fat_g=4.0,
            sat_fat_g=2.0,
        )

        self.assertGreater(insulin_load, 0.0)
        self.assertEqual(source, "exact_fii")
        self.assertNotEqual(confidence, 1.0)
        self.assertEqual(resolve_estimate_quality([source]), "high")

    def post_item(self, *, name: str, fii_marker: object = ...):
        item = {
            "name": name,
            "quantity": 1.0,
            "unit": "serving",
            "kcalPerUnit": 220.0,
            "gi": 55,
            "carb_g": 30.0,
            "protein_g": 10.0,
            "fat_g": 5.0,
            "satFat_g": 1.5,
        }
        if fii_marker is not ...:
            item["fii"] = fii_marker

        request = MealCreate.model_validate({"meal_name": "synthetic trust-boundary meal", "items": [item]})
        return asyncio.run(create_meal(request, FakeDb()))

    def test_stale_client_zero_is_neutralized_at_post_boundary(self) -> None:
        response = self.post_item(name="fallback carb bowl", fii_marker=0)
        item = response.items[0]

        self.assertGreater(item.insulin_load, 0.0)
        self.assertEqual(item.confidence, 0.8)
        self.assertEqual(item.fii_source, "macro_fallback")
        self.assertNotEqual(item.fii_source, "user_confirmed")
        self.assertNotEqual(item.confidence, 1.0)
        self.assertEqual(response.estimate_quality, "low")
        self.assertIsNone(item.fii)
        self.assertIsNone(item.fii_value)

    def test_blank_and_negative_fii_are_neutralized_at_post_boundary(self) -> None:
        for invalid_fii in ("", "   ", "0", -1):
            with self.subTest(fii=invalid_fii):
                response = self.post_item(name="fallback carb bowl", fii_marker=invalid_fii)
                item = response.items[0]

                self.assertEqual(item.fii_source, "macro_fallback")
                self.assertEqual(item.confidence, 0.8)
                self.assertEqual(response.estimate_quality, "low")
                self.assertIsNone(item.fii)

    def test_missing_and_null_fii_use_deterministic_lookup(self) -> None:
        for fii_marker in (..., None):
            with self.subTest(fii=fii_marker):
                response = self.post_item(name="plain yogurt", fii_marker=fii_marker)
                item = response.items[0]

                self.assertGreater(item.insulin_load, 0.0)
                self.assertEqual(item.fii_source, "exact_fii")
                self.assertEqual(item.confidence, 0.7)
                self.assertIsNone(item.fii)

    def test_explicit_user_fii_still_uses_user_confirmed_path(self) -> None:
        response = self.post_item(name="manual item", fii_marker=50)
        item = response.items[0]

        self.assertEqual(item.insulin_load, 110.0)
        self.assertEqual(item.confidence, 1.0)
        self.assertEqual(item.fii_source, "user_confirmed")
        self.assertEqual(item.fii, 50)


if __name__ == "__main__":
    unittest.main()
