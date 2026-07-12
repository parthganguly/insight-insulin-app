"""Guards against reintroducing the two removed re-wiring hazards (issue #93).

backend/utils.py carried save_base64_images (wrote uploaded meal images to
disk — the exact behaviour #49 removed from the product) and backend/test.py
was an ad hoc script whose prompt asked the AI for FII directly (the exact
behaviour the #42/#43 trust boundary forbids). Both were confirmed dead
(no imports anywhere) and deleted. These tests fail if either hazard file
or behaviour returns.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


class NoRewiringHazardsTests(unittest.TestCase):
    def test_the_image_saving_module_stays_deleted(self) -> None:
        self.assertFalse((BACKEND_DIR / "utils.py").exists(), "backend/utils.py (image writer) must stay deleted")

    def test_the_ad_hoc_ai_fii_script_stays_deleted(self) -> None:
        self.assertFalse(
            (BACKEND_DIR / "test.py").exists(),
            "backend/test.py (asked the AI for FII directly) must stay deleted",
        )

    def test_no_backend_module_defines_save_base64_images(self) -> None:
        for py_file in BACKEND_DIR.glob("*.py"):
            self.assertNotIn(
                "def save_base64_images",
                py_file.read_text(encoding="utf-8"),
                f"{py_file.name} reintroduces the image-saving helper",
            )

    def test_no_backend_utils_module_is_importable(self) -> None:
        if str(BACKEND_DIR) not in sys.path:
            sys.path.insert(0, str(BACKEND_DIR))
        self.assertIsNone(importlib.util.find_spec("utils"))


if __name__ == "__main__":
    unittest.main()
