"""Offline R2 contract checks; public aggregate references and synthetic mutations."""

import ast
import copy
import hashlib
import json
import tempfile
import unittest
from dataclasses import FrozenInstanceError
from pathlib import Path

from build_reference_catalog import DATA_DIR, SOURCE_HASHES, build, eligibility_csv
from reference_catalog import (
    CatalogError, ReferenceCatalog, SelectionStatus, canonical_bytes, map_records,
)


def _is_reference_preview_guard(node) -> bool:
    return (isinstance(node, ast.If) and isinstance(node.test, ast.Call)
            and isinstance(node.test.func, ast.Name) and node.test.func.id == "reference_preview_enabled")


class ReferenceCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.artifact = build()
        cls.content = json.loads(cls.artifact)
        cls.catalog = ReferenceCatalog.from_bytes(cls.artifact)

    def select(self, source_id, catalog=None):
        catalog = catalog or self.catalog
        return catalog.select(source_id, expected_catalog_version=catalog.version)

    def changed(self, mutate):
        content = copy.deepcopy(self.content)
        mutate(content)
        content["records"] = map_records(
            [r["raw"] for r in content["records"]], content["policy"],
            content["studies"], content["source_issues"],
        )
        return ReferenceCatalog.from_bytes(canonical_bytes(content))

    def test_deterministic_artifacts_and_all_raw_fields_unchanged(self):
        self.assertEqual(self.artifact, build())
        self.assertEqual(self.artifact, (DATA_DIR / "candidate_catalog.json").read_bytes())
        self.assertEqual(eligibility_csv(self.artifact), (DATA_DIR / "eligibility.csv").read_bytes())
        raw = json.loads((DATA_DIR / "inputs/INSIGHT_FII_147_metadata_v1_1.json").read_bytes())
        self.assertEqual(len(raw), 147)
        self.assertEqual([r["raw"] for r in self.content["records"]], raw)
        self.assertEqual(list(self.catalog.records), [r["canonical_id"] for r in raw])
        for name, expected in SOURCE_HASHES.items():
            self.assertEqual(hashlib.sha256((DATA_DIR / name).read_bytes()).hexdigest(), expected)

    def test_builder_rejects_modified_source_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in SOURCE_HASHES:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((DATA_DIR / name).read_bytes() + b" ")
            with self.assertRaisesRegex(CatalogError, "hash mismatch"):
                build(root)

    def test_exact_mapping_and_unknown_sample_sizes(self):
        for row in self.catalog.records.values():
            raw = row["raw"]
            self.assertEqual(row["fii_mean"], raw["FII_pct"])
            self.assertEqual(row["fii_uncertainty"], {"type": "SEM", "value": raw["FII_sem"]})
            self.assertEqual(row["original_food_wording"], raw["food_name_source"])
            self.assertEqual(row["reference_scale"], "glucose=100")
            self.assertEqual(row["actual_test_energy_kJ"], raw["actual_test_energy_kJ"])
            self.assertIsNone(row["record_sample_size"])
            self.assertEqual(self.catalog.content["studies"][row["study_id"]]["doi"], raw["source_doi"])
        self.assertEqual(self.catalog.content["studies"]["bao2011"]["sample_information"]["subjects_section_group_range"], (10, 13))
        self.assertEqual(self.catalog.content["studies"]["bell2016"]["sample_information"]["new_food_individual_observations"], 254)

    def test_dose_and_named_issues_are_use_specific(self):
        for n in range(1, 7):
            source_id = f"BELL2016-S1-{n:03d}"
            row = self.catalog.records[source_id]
            self.assertEqual(row["actual_test_energy_kJ"], 300)
            self.assertEqual(row["composition_basis_kJ"], 1000)
            self.assertEqual(self.select(source_id).status, SelectionStatus.REFERENCE_ONLY)
            self.assertIn("P04", row["issue_ids"])
        carrot = self.catalog.records["BELL2016-S1-002"]
        self.assertEqual(carrot["raw"]["GL_g_per_MJ"], 14)
        self.assertEqual(carrot["eligibility"]["gi_gl_calculation"]["status"], "requires_review")
        self.assertEqual(carrot["eligibility"]["composition_energy"]["status"], "candidate")
        for source_id in ["BELL2016-S1-014", "BELL2016-S1-024"]:
            row = self.catalog.records[source_id]
            self.assertEqual(self.select(source_id).status, SelectionStatus.REQUIRES_REVIEW)
            self.assertIn("P06", row["issue_ids"])
            self.assertEqual(row["eligibility"]["composition_energy"]["status"], "candidate")
        sausage = self.catalog.records["BELL2016-S1-017"]
        self.assertEqual(sausage["raw"]["avcho_g_per_MJ"], 35)
        self.assertEqual(sausage["fii_mean"], 7)
        self.assertEqual(self.select("BELL2016-S1-017").status, SelectionStatus.REQUIRES_REVIEW)
        self.assertEqual(sausage["eligibility"]["composition_energy"]["status"], "requires_review")
        self.assertEqual(sausage["eligibility"]["fibre_context"]["status"], "candidate")
        self.assertEqual({i["id"] for i in self.catalog.content["source_issues"]}, {f"P{n:02d}" for n in range(1, 11)})

    def test_missing_gi_and_fibre_do_not_block_fii_or_turn_into_zero(self):
        for source_id, field, use in [
            ("BELL2016-S1-011", "GI_pct", "gi_gl_calculation"),
            ("BELL2016-S1-018", "fibre_g_per_MJ", "fibre_context"),
        ]:
            row = self.catalog.records[source_id]
            self.assertIsNone(row["raw"][field])
            self.assertEqual(self.select(source_id).status, SelectionStatus.SELECTED)
            self.assertEqual(row["eligibility"][use]["status"], "reference_only")

    def test_zero_missing_and_above_100_are_distinct(self):
        for value, status in [(0, SelectionStatus.SELECTED), (None, SelectionStatus.REQUIRES_REVIEW), (150, SelectionStatus.SELECTED)]:
            with self.subTest(value=value):
                catalog = self.changed(lambda d: d["records"][0]["raw"].update(FII_pct=value))
                source_id = next(iter(catalog.records))
                result = self.select(source_id, catalog)
                self.assertEqual(catalog.records[source_id]["fii_mean"], value)
                self.assertEqual(result.status, status)
                self.assertEqual(result.record is None, value is None)
        real_high = [r for r in self.catalog.records.values() if r["fii_mean"] > 100]
        self.assertTrue(real_high)

    def test_wrong_version_unknown_ids_and_names_fail_explicitly(self):
        source_id = next(iter(self.catalog.records))
        self.assertEqual(self.catalog.select(source_id, expected_catalog_version="old").status,
                         SelectionStatus.VERSION_MISMATCH)
        for name in ["rice", "yogurt", "dal", "biryani", "BAO2011-999",
                     self.catalog.records[source_id]["original_food_wording"]]:
            result = self.select(name)
            self.assertEqual(result.status, SelectionStatus.UNKNOWN_ID)
            self.assertIsNone(result.record)

    def test_no_override_and_required_version(self):
        source_id = next(iter(self.catalog.records))
        with self.assertRaises(TypeError):
            self.catalog.select(source_id)
        with self.assertRaises(TypeError):
            self.catalog.select(source_id, expected_catalog_version=self.catalog.version, fii=999)

    def test_deep_immutable_snapshot_and_selection(self):
        source_id = next(iter(self.catalog.records))
        selection = self.select(source_id)
        with self.assertRaises(TypeError):
            selection.record["raw"]["FII_pct"] = 999
        with self.assertRaises(TypeError):
            self.catalog.content["policy"]["issue_rules"][0]["uses"]["experimental_fii_input"] = "candidate"
        with self.assertRaises(FrozenInstanceError):
            self.catalog.version = "fake"
        with self.assertRaises(FrozenInstanceError):
            selection.catalog_version = "fake"

    def test_new_file_and_policy_identity_cannot_relabel_loaded_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "catalog.json"
            path.write_bytes(self.artifact)
            old = ReferenceCatalog.load(path)
            selected = self.select(next(iter(old.records)), old)
            changed = copy.deepcopy(self.content)
            changed["policy"]["issue_rules"][0]["reason"] += "; synthetic policy review note"
            changed["records"] = map_records([r["raw"] for r in changed["records"]],
                                             changed["policy"], changed["studies"], changed["source_issues"])
            path.write_bytes(canonical_bytes(changed))
            new = ReferenceCatalog.load(path)
            self.assertNotEqual(old.version, new.version)
            self.assertEqual(selected.catalog_version, old.version)
            self.assertEqual(self.select(selected.source_record_id, old), selected)
            self.assertEqual(new.select(selected.source_record_id, expected_catalog_version=old.version).status,
                             SelectionStatus.VERSION_MISMATCH)
        self.assertEqual(self.select(selected.source_record_id, old), selected)

    def test_serialization_identity_is_semantic_and_sha256(self):
        reordered = json.dumps(self.content, indent=3).encode()
        self.assertEqual(ReferenceCatalog.from_bytes(reordered).version, self.catalog.version)
        self.assertEqual(self.catalog.version, "r2_sha256_" + hashlib.sha256(self.artifact).hexdigest())

    def test_corrupt_nonfinite_negative_boolean_and_duplicate_rejected(self):
        for value in [float("nan"), float("inf"), -1, True, "69", 10**400]:
            with self.subTest(value=value), self.assertRaises(CatalogError):
                self.changed(lambda d: d["records"][0]["raw"].update(FII_pct=value))
        for data in [b"{", b'{"x":1,"x":2}', b'{"x":1e999}', b"null", b"[]"]:
            with self.subTest(data=data), self.assertRaises(CatalogError):
                ReferenceCatalog.from_bytes(data)
        with self.assertRaises(CatalogError):
            self.changed(lambda d: d["records"].append(copy.deepcopy(d["records"][0])))

    def test_duplicate_food_names_do_not_create_ambiguous_auto_selection(self):
        def duplicate_name(content):
            content["records"][1]["raw"]["food_name_source"] = content["records"][0]["raw"]["food_name_source"]
        catalog = self.changed(duplicate_name)
        for source_id in list(catalog.records)[:2]:
            self.assertEqual(self.select(source_id, catalog).source_record_id, source_id)
        self.assertEqual(self.select(next(iter(catalog.records.values()))["original_food_wording"], catalog).status,
                         SelectionStatus.UNKNOWN_ID)

    def test_reference_conflict_missing_dose_and_attribution_require_review(self):
        for change in [{"response_reference": "white_bread=100"}, {"actual_test_energy_kJ": None},
                       {"source_table": ""}]:
            catalog = self.changed(lambda d: d["records"][0]["raw"].update(change))
            self.assertEqual(self.select(next(iter(catalog.records)), catalog).status, SelectionStatus.REQUIRES_REVIEW)

    def test_unsupported_versions_forged_mapping_and_eligibility_rejected(self):
        for mutate in [
            lambda d: d.update(schema_version="future"),
            lambda d: d["policy"].update(eligibility_version="future"),
            lambda d: d["policy"].update(selection_version="future"),
            lambda d: d["records"][0].update(fii_mean=999),
            lambda d: d["records"][-3]["eligibility"]["experimental_fii_input"].update(status="candidate"),
            lambda d: d["records"][0]["raw"].update(source_row=999),
            lambda d: d["records"][0]["raw"].update(source_doi="unknown"),
        ]:
            content = copy.deepcopy(self.content)
            mutate(content)
            with self.assertRaises(CatalogError):
                ReferenceCatalog.from_bytes(canonical_bytes(content))

    def test_stripped_or_malformed_study_context_is_rejected(self):
        mutations = [
            lambda d: d["studies"].update({key: {"doi": value["doi"]} for key, value in d["studies"].items()}),
            lambda d: d["studies"]["bao2011"].update(population=""),
            lambda d: d["studies"]["bao2011"].update(row_sample_size=10),
            lambda d: d["studies"]["bao2011"]["sample_information"].update(subjects_section_group_range=[13, 10]),
            lambda d: d["studies"]["bell2016"].update(supplement={}),
            lambda d: d["source_issues"][0].pop("finding"),
            lambda d: d["policy"].update(uses=list(d["policy"]["uses"])),
            lambda d: d["policy"].update(issue_rules={}),
        ]
        for mutate in mutations:
            content = copy.deepcopy(self.content)
            mutate(content)
            with self.assertRaises(CatalogError):
                ReferenceCatalog.from_bytes(canonical_bytes(content))

    def test_active_runtime_contract_and_no_production_imports(self):
        from fii_lookup import get_dataset_version, lookup_fii
        from scoring_service import FORMULA_VERSION
        self.assertEqual(get_dataset_version(), "fii_foods_csv_fnv1a64_250e9dfc91988b6b")
        self.assertEqual(FORMULA_VERSION, "current_backend_v2")
        self.assertEqual(lookup_fii("rice")[0], 79)
        backend = Path(__file__).resolve().parents[1]
        # Follow every local import reachable from production main, including dormant
        # branches. Offline modules may import the catalog; production must not reach them.
        pending, visited = [backend / "main.py"], set()
        while pending:
            path = pending.pop()
            if path in visited:
                continue
            visited.add(path)
            tree = ast.parse(path.read_text(encoding="utf-8-sig"))
            # R3B (2026-09-19): main.py may reach the reference module, but only
            # inside `if reference_preview_enabled():`, which requires an exact
            # INSIGHT_REFERENCE_PREVIEW=1. Every unguarded path must still be
            # unable to reach it, so the guarded branch is excised before the
            # walk. test_reference_integration additionally proves at runtime
            # that a default import pulls in neither module.
            tree.body = [node for node in tree.body if not _is_reference_preview_guard(node)]
            for node in ast.walk(tree):
                imports = ([node.module or ""] if isinstance(node, ast.ImportFrom)
                           else [a.name for a in node.names] if isinstance(node, ast.Import) else [])
                if isinstance(node, ast.ImportFrom):
                    imports += [(node.module + "." if node.module else "") + a.name for a in node.names]
                self.assertFalse(any("reference_catalog" in name or "experimental_reference" in name
                                     for name in imports), str(path))
                for name in imports:
                    local = backend.joinpath(*name.split("."))
                    for candidate in (local.with_suffix(".py"), local / "__init__.py"):
                        if candidate.is_file():
                            pending.append(candidate)


if __name__ == "__main__":
    unittest.main()
