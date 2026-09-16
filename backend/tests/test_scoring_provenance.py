"""Synthetic loader checks; no application startup, providers, or owner database."""

import importlib.util
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import fii_lookup
from scoring_service import FORMULA_VERSION
from validation.export_golden_fixtures import FORMULA_VERSION as EXPORTED_FORMULA_VERSION


class DatasetProvenanceTests(unittest.TestCase):
    def test_existing_rust_dataset_and_formula_identity_are_reused(self) -> None:
        self.assertEqual(FORMULA_VERSION, "current_backend_v2")
        self.assertEqual(EXPORTED_FORMULA_VERSION, FORMULA_VERSION)
        self.assertEqual(
            fii_lookup.get_dataset_version(), "fii_foods_csv_fnv1a64_250e9dfc91988b6b"
        )

    def test_fingerprint_line_endings_and_all_csv_fields(self) -> None:
        text = "food_name,fii,aliases,source,confidence\nsynthetic,42,alias,starter_placeholder,0.5\n"
        fingerprint = fii_lookup.dataset_version_for_csv(text)
        self.assertEqual(fingerprint, fii_lookup.dataset_version_for_csv(text.replace("\n", "\r\n")))
        self.assertEqual(fingerprint, fii_lookup.dataset_version_for_csv(text.rstrip("\n")))
        for old, new in (("42", "43"), ("alias,", "other,"), ("0.5", "0.6"), ("starter_placeholder", "synthetic")):
            self.assertNotEqual(fingerprint, fii_lookup.dataset_version_for_csv(text.replace(old, new)))
        self.assertNotEqual(fingerprint, fii_lookup.dataset_version_for_csv(text + "\n"))

    def test_same_loaded_bytes_supply_lookup_and_identity_until_restart(self) -> None:
        # Load an isolated module so resetting its cache cannot affect other tests.
        spec = importlib.util.spec_from_file_location("synthetic_fii_lookup", fii_lookup.__file__)
        lookup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(lookup)
        with tempfile.TemporaryDirectory(prefix="insight-r1-dataset-") as directory:
            path = Path(directory) / "synthetic.csv"
            initial = b"food_name,fii,aliases,source,confidence\nsynthetic,42,,starter_placeholder,0.5\n"
            later = initial.replace(b",42,", b",84,")
            path.write_bytes(initial)
            lookup._FII_CSV_PATH = path
            with ThreadPoolExecutor(max_workers=4) as executor:
                identities = list(executor.map(lambda _: lookup.get_dataset_version(), range(8)))
            self.assertEqual(len(set(identities)), 1)
            self.assertEqual(identities[0], fii_lookup.dataset_version_for_csv(initial.decode()))
            self.assertEqual(lookup.lookup_fii("synthetic")[0], 42)
            path.write_bytes(later)
            self.assertEqual(lookup.lookup_fii("synthetic")[0], 42)
            self.assertEqual(lookup.get_dataset_version(), identities[0])
            # A fresh process/module loads the changed table; the old one never re-labels it.
            restarted = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(restarted)
            restarted._FII_CSV_PATH = path
            self.assertEqual(restarted.lookup_fii("synthetic")[0], 84)
            self.assertNotEqual(restarted.get_dataset_version(), identities[0])

    def test_failed_load_does_not_publish_identity(self) -> None:
        spec = importlib.util.spec_from_file_location("synthetic_fii_lookup", fii_lookup.__file__)
        lookup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(lookup)
        with patch.object(Path, "read_bytes", side_effect=OSError("synthetic read failure")):
            with self.assertRaises(OSError):
                lookup.get_dataset_version()
        self.assertFalse(lookup._FII_DATA_LOADED)
        self.assertEqual(lookup._DATASET_VERSION, "")


if __name__ == "__main__":
    unittest.main()
