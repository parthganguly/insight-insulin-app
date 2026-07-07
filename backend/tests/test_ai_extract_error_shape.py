"""Missing-key error shape for /ai-meal-extract (issue #74).

The HTTP error detail reaches the client, so it must never name internal
configuration such as the OPENAI_API_KEY environment variable.
"""

import asyncio
import importlib
import os
import sys
import unittest
from unittest.mock import patch

from fastapi import HTTPException


class MissingKeyErrorShapeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        sys.modules.pop("services", None)
        sys.modules.pop("main", None)
        with patch("dotenv.load_dotenv"):
            cls.main = importlib.import_module("main")
            cls.services = importlib.import_module("services")

    def test_missing_key_detail_is_user_safe(self) -> None:
        request = self.main.AiMealExtractRequest(
            images=["data:image/jpeg;base64,c3ludGhldGljLWltYWdl"],
            textualData="synthetic description",
        )

        env_without_key = {k: v for k, v in os.environ.items() if k != "OPENAI_API_KEY"}
        with patch.dict(os.environ, env_without_key, clear=True):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(self.main.extract_meal(request))

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertNotIn("OPENAI_API_KEY", str(ctx.exception.detail))
        self.assertIn("not configured", str(ctx.exception.detail))


if __name__ == "__main__":
    unittest.main()
