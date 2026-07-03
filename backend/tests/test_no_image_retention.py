import asyncio
import importlib
import os
import sys
import tempfile
import unittest
from unittest.mock import patch


class NoImageRetentionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        sys.modules.pop("services", None)
        sys.modules.pop("main", None)
        with patch("dotenv.load_dotenv"):
            cls.main = importlib.import_module("main")
            cls.services = importlib.import_module("services")

    def build_extracted_meal(self):
        item = self.services.AiExtractedMealItem(
            name="plain yogurt",
            quantity=1.0,
            unit="serving",
            kcalPerUnit=180.0,
            carb_g=16.0,
            protein_g=8.0,
            fat_g=4.0,
            gi=35,
            satFat_g=2.0,
        )
        return self.services.AiExtractedMeal(name="synthetic meal", items=[item], estimate=None)

    def test_ai_meal_extract_writes_no_files(self) -> None:
        request = self.main.AiMealExtractRequest(
            images=["data:image/jpeg;base64,c3ludGhldGljLWltYWdl"],
            textualData="synthetic description",
        )

        original_cwd = os.getcwd()
        with tempfile.TemporaryDirectory() as tmp_dir:
            os.chdir(tmp_dir)
            try:
                with patch.object(self.main, "ai_meal_extract_gpt", return_value=self.build_extracted_meal()) as mock_extract:
                    response = asyncio.run(self.main.extract_meal(request))
            finally:
                os.chdir(original_cwd)

            mock_extract.assert_called_once_with(request.images, request.textualData)
            self.assertFalse(os.path.exists(os.path.join(tmp_dir, "images")))
            self.assertEqual(os.listdir(tmp_dir), [])

        self.assertTrue(response.success)
        meal = response.data["meal"]
        self.assertEqual(meal["name"], "synthetic meal")
        self.assertEqual(len(meal["items"]), 1)
        self.assertEqual(meal["items"][0]["name"], "plain yogurt")
        self.assertNotIn("estimate", meal)

    def test_main_no_longer_uses_the_image_saving_utility(self) -> None:
        self.assertFalse(hasattr(self.main, "save_base64_images"))


if __name__ == "__main__":
    unittest.main()
