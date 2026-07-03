import importlib
import sys
import unittest
from unittest.mock import patch

from estimate_quality import resolve_estimate_quality
from scoring_service import compute_insulin_load_item


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

    def test_missing_ai_fii_does_not_enter_zero_value_provided_path(self) -> None:
        insulin_load, confidence, source = compute_insulin_load_item(
            food_name="mystery mineral water",
            quantity=1.0,
            kcal_per_unit=0.0,
            fii=None,
            gi=None,
            carb_g=None,
            protein_g=None,
            fat_g=None,
            sat_fat_g=None,
        )

        self.assertEqual(insulin_load, 0.0)
        self.assertEqual(confidence, 0.2)
        self.assertEqual(source, "unknown")
        self.assertEqual(resolve_estimate_quality([source]), "unknown")

    def test_explicit_user_fii_still_uses_user_confirmed_path(self) -> None:
        insulin_load, confidence, source = compute_insulin_load_item(
            food_name="manual item",
            quantity=1.0,
            kcal_per_unit=100.0,
            fii=50,
            gi=None,
            carb_g=None,
            protein_g=None,
            fat_g=None,
            sat_fat_g=None,
        )

        self.assertEqual(insulin_load, 50.0)
        self.assertEqual(confidence, 1.0)
        self.assertEqual(source, "user_confirmed")


if __name__ == "__main__":
    unittest.main()
