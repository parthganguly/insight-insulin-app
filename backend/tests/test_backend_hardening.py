"""Backend bounds and error sanitization (issue #93).

Covers the audit's cheap backend protections:
- /metrics/chronic?days= is bounded (1..365) instead of accepting an
  unauthenticated arbitrarily-large day loop;
- the generic /ai-meal-extract exception path returns a stable non-sensitive
  message instead of raw str(e);
- AI-extraction requests enforce the Smart Camera image count (5), a
  defensive per-image size ceiling, the base64 image data-URL shape, and
  base64 validity.

Synthetic data only. No real user or health data, no network calls.
"""

import asyncio
import base64
import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Modules that bind (directly or transitively) to the SQLite engine created at
# import time from the relative ./app.db path. Popped and re-imported inside a
# temp working directory so the test never touches the developer's real app.db.
DB_BOUND_MODULES = ["main", "api.meals", "api", "db", "db_models"]

VALID_IMAGE = "data:image/jpeg;base64," + base64.b64encode(b"synthetic-image-bytes").decode()


class HardeningTestBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        cls.original_cwd = os.getcwd()
        cls.tmp_dir = tempfile.mkdtemp(prefix="insight-hardening-test-")
        os.chdir(cls.tmp_dir)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)
        cls.db = importlib.import_module("db")
        cls.db.create_tables()
        cls.main = importlib.import_module("main")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db.engine.dispose()
        os.chdir(cls.original_cwd)
        for module in DB_BOUND_MODULES:
            sys.modules.pop(module, None)


class ChronicDaysBoundTests(HardeningTestBase):
    """HTTP-layer validation of the chronic query window."""

    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        from fastapi.testclient import TestClient

        cls.client = TestClient(cls.main.app)

    def get_days(self, days) -> int:
        response = self.client.get("/metrics/chronic", params={"days": days})
        return response.status_code

    def test_below_minimum_is_rejected(self) -> None:
        self.assertEqual(self.get_days(0), 422)
        self.assertEqual(self.get_days(-1), 422)

    def test_minimum_normal_and_maximum_are_accepted(self) -> None:
        self.assertEqual(self.get_days(1), 200)
        self.assertEqual(self.get_days(30), 200)
        self.assertEqual(self.get_days(self.main.MAX_CHRONIC_QUERY_DAYS), 200)

    def test_above_maximum_is_rejected(self) -> None:
        self.assertEqual(self.get_days(self.main.MAX_CHRONIC_QUERY_DAYS + 1), 422)
        self.assertEqual(self.get_days(10_000_000), 422)

    def test_invalid_type_is_rejected(self) -> None:
        self.assertEqual(self.get_days("not-a-number"), 422)

    def test_default_request_still_works(self) -> None:
        response = self.client.get("/metrics/chronic")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["days"], 30)
        self.assertIn("window_days", body)
        self.assertIn("logged_days_last_7", body)


class GenericExceptionSanitizationTests(HardeningTestBase):
    """The generic /ai-meal-extract failure path must not leak str(e)."""

    SECRET_MARKER = "SECRET-MARKER-sk-XYZ-/internal/path/to/creds"

    def build_request(self):
        return self.main.AiMealExtractRequest(images=[VALID_IMAGE], textualData="synthetic description")

    def test_unexpected_exception_detail_is_stable_and_secret_free(self) -> None:
        request = self.build_request()

        with patch.object(self.main, "ai_meal_extract_gpt", side_effect=RuntimeError(self.SECRET_MARKER)):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(self.main.extract_meal(request))

        self.assertEqual(raised.exception.status_code, 500)
        self.assertEqual(raised.exception.detail, "Internal server error")
        self.assertNotIn(self.SECRET_MARKER, str(raised.exception.detail))
        self.assertNotIn("SECRET-MARKER", str(raised.exception.detail))

    def test_known_http_exceptions_keep_their_safe_mappings(self) -> None:
        request = self.build_request()

        with patch.object(
            self.main,
            "ai_meal_extract_gpt",
            side_effect=HTTPException(status_code=429, detail="Rate limit exceeded"),
        ):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(self.main.extract_meal(request))

        self.assertEqual(raised.exception.status_code, 429)
        self.assertEqual(raised.exception.detail, "Rate limit exceeded")


class AiImagePayloadBoundTests(HardeningTestBase):
    """Request-model validation of the AI-extraction image payload."""

    def make_request(self, images):
        return self.main.AiMealExtractRequest(images=images, textualData="")

    def test_up_to_five_valid_images_are_accepted(self) -> None:
        for count in (0, 1, 5):
            request = self.make_request([VALID_IMAGE] * count)
            self.assertEqual(len(request.images), count)

    def test_more_than_five_images_are_rejected(self) -> None:
        with self.assertRaises(ValidationError) as raised:
            self.make_request([VALID_IMAGE] * 6)
        self.assertIn("maximum of 5 images", str(raised.exception))

    def test_oversized_image_is_rejected(self) -> None:
        from models import MAX_AI_IMAGE_CHARS

        oversized = "data:image/jpeg;base64," + "A" * MAX_AI_IMAGE_CHARS
        with self.assertRaises(ValidationError) as raised:
            self.make_request([oversized])
        self.assertIn("maximum supported size", str(raised.exception))

    def test_image_at_the_size_boundary_is_accepted(self) -> None:
        from models import MAX_AI_IMAGE_CHARS

        prefix = "data:image/jpeg;base64,"
        payload_len = MAX_AI_IMAGE_CHARS - len(prefix)
        payload_len -= payload_len % 4  # valid base64 length
        boundary_image = prefix + "A" * payload_len
        request = self.make_request([boundary_image])
        self.assertEqual(len(request.images), 1)

    def test_non_data_url_payloads_are_rejected(self) -> None:
        for malformed in [
            "https://example.com/meal.jpg",
            "data:text/plain;base64,c3ludGhldGlj",
            "data:image/jpeg,not-base64-marker",
            "raw-base64-without-prefix====",
        ]:
            with self.assertRaises(ValidationError, msg=malformed):
                self.make_request([malformed])

    def test_malformed_base64_is_rejected(self) -> None:
        with self.assertRaises(ValidationError) as raised:
            self.make_request(["data:image/jpeg;base64,!!!not-base64!!!"])
        self.assertIn("not valid base64", str(raised.exception))


class ProviderTimeoutTests(unittest.TestCase):
    def test_openai_client_is_constructed_with_the_documented_timeout(self) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        sys.modules.pop("services", None)
        with patch("dotenv.load_dotenv"):
            services = importlib.import_module("services")

        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-synthetic-test-key"}):
            client = services.get_openai_client()

        self.assertEqual(client.timeout, services.AI_PROVIDER_TIMEOUT_SECONDS)
        self.assertEqual(services.AI_PROVIDER_TIMEOUT_SECONDS, 120.0)


if __name__ == "__main__":
    unittest.main()
