"""Inactive, offline source catalog. Never imported by application startup/scoring."""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from types import MappingProxyType
from typing import Mapping

SCHEMA_VERSION = "insight_reference_catalog_v1"
ELIGIBILITY_VERSION = "experimental_fii_input_v1"
SELECTION_VERSION = "explicit_source_id_v1"
NUMERIC_FIELDS = (
    "test_year", "weight_g_per_MJ", "protein_g_per_MJ", "fat_g_per_MJ",
    "avcho_g_per_MJ", "sugar_g_per_MJ", "fibre_g_per_MJ", "GI_pct",
    "GL_g_per_MJ", "GS_pct", "GS_sem", "FII_pct", "FII_sem",
    "composition_basis_kJ", "actual_test_energy_kJ", "source_row",
)
TEXT_FIELDS = (
    "canonical_id", "dataset_component", "food_category", "food_name_source",
    "food_name_clean", "response_reference", "harmonization_note", "source_study",
    "source_table", "source_doi", "source_footnote",
)
USES = ("experimental_fii_input", "composition_energy", "gi_gl_calculation", "fibre_context")
STUDY_TEXT_FIELDS = (
    "doi", "population", "row_sample_size_limitation", "evidence_access",
    "methods_location", "source_file", "source_sha256", "lineage",
)


class CatalogError(ValueError):
    """Malformed or unsupported catalog; no snapshot was published."""


class SelectionStatus(str, Enum):
    SELECTED = "selected"
    VERSION_MISMATCH = "version_mismatch"
    UNKNOWN_ID = "unknown_id"
    REFERENCE_ONLY = "reference_only"
    REQUIRES_REVIEW = "requires_review"


def canonical_bytes(value: object) -> bytes:
    """UTF-8, sorted keys, compact separators, literal Unicode, no NaN, final LF."""
    try:
        return (json.dumps(value, ensure_ascii=False, sort_keys=True,
                           separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise CatalogError("Not finite JSON content") from exc


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise CatalogError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def parse_json(data: bytes):
    try:
        value = json.loads(data, object_pairs_hook=_unique_object)
        canonical_bytes(value)  # Also rejects NaN/Infinity and overflowed floats.
        return value
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise CatalogError("Invalid JSON") from exc


def _freeze(value):
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    return value


def _decision(status, *reasons):
    return {"status": status, "reasons": list(reasons)}


def _validate_studies(studies):
    if not isinstance(studies, dict) or set(studies) != {"bao2011", "bell2016"}:
        raise CatalogError("Missing study metadata")
    for study_id, study in studies.items():
        required = set(STUDY_TEXT_FIELDS) | {"row_sample_size", "sample_information"}
        if study_id == "bell2016":
            required.add("supplement")
        if not isinstance(study, dict) or set(study) != required:
            raise CatalogError("Invalid study fields")
        if any(not isinstance(study[f], str) or not study[f].strip() for f in STUDY_TEXT_FIELDS):
            raise CatalogError("Missing study context")
        if study["row_sample_size"] is not None:
            raise CatalogError("Per-row sample size is not established by these inputs")
        if not re.fullmatch(r"[0-9a-f]{64}", study["source_sha256"]):
            raise CatalogError("Invalid study source hash")
        sample = study["sample_information"]
        sample_keys = ({"subjects_section_group_range", "study_1_stated_subjects_per_food"}
                       if study_id == "bao2011" else {
                           "method_stated_average_subjects_per_food", "new_food_individual_observations", "new_food_count"
                       })
        if (not isinstance(sample, dict) or set(sample) != sample_keys | {"scope"}
                or not isinstance(sample["scope"], str) or not sample["scope"].strip()):
            raise CatalogError("Missing study sample scope")
        for key in sample_keys:
            value = sample[key]
            values = value if key == "subjects_section_group_range" else [value]
            if (not isinstance(values, list) or not values
                    or any(type(n) is not int or n < 1 for n in values)):
                raise CatalogError("Invalid study sample metadata")
            if key == "subjects_section_group_range" and (len(values) != 2 or values[0] > values[1]):
                raise CatalogError("Invalid study sample range")
        if study_id == "bell2016":
            supplement = study["supplement"]
            if (not isinstance(supplement, dict) or set(supplement) != {"source_file", "sha256", "location"}
                    or any(not isinstance(v, str) or not v.strip() for v in supplement.values())
                    or not re.fullmatch(r"[0-9a-f]{64}", supplement["sha256"])):
                raise CatalogError("Invalid supplement source metadata")


def map_records(raw_records: list, policy: dict, studies: dict, issues: list) -> list:
    """Map source fields without scaling or imputation; evaluate only declared uses."""
    if not isinstance(raw_records, list) or not raw_records:
        raise CatalogError("Expected nonempty source-record list")
    if not isinstance(policy, dict) or set(policy) != {
        "eligibility_version", "selection_version", "uses", "issue_rules", "limitations"
    }:
        raise CatalogError("Invalid policy fields")
    if (not isinstance(policy["uses"], dict)
            or policy["eligibility_version"] != ELIGIBILITY_VERSION
            or policy["selection_version"] != SELECTION_VERSION
            or set(policy["uses"]) != set(USES)):
        raise CatalogError("Unsupported policy version or uses")
    if (not isinstance(policy["issue_rules"], list)
            or not isinstance(policy["limitations"], list) or not policy["limitations"]
            or any(not isinstance(v, str) or not v.strip()
                   for v in [*policy["uses"].values(), *policy["limitations"]])):
        raise CatalogError("Invalid policy context")
    _validate_studies(studies)
    if not isinstance(issues, list) or not issues:
        raise CatalogError("Missing issue metadata")
    for issue in issues:
        if (not isinstance(issue, dict)
                or set(issue) != {"id", "kind", "source", "row", "finding", "action", "status"}
                or any(not isinstance(v, str) or not v.strip() for v in issue.values())):
            raise CatalogError("Invalid issue metadata")
    issue_ids = {issue["id"] for issue in issues}
    if len(issue_ids) != len(issues):
        raise CatalogError("Duplicate issue ID")
    for rule in policy["issue_rules"]:
        if (not isinstance(rule, dict) or set(rule) != {"issue_id", "record_ids", "uses", "reason"}
                or rule["issue_id"] not in issue_ids
                or not isinstance(rule["record_ids"], list) or not rule["record_ids"]
                or any(not isinstance(v, str) for v in rule["record_ids"])
                or not isinstance(rule["reason"], str) or not rule["reason"]
                or not isinstance(rule["uses"], dict) or not rule["uses"]):
            raise CatalogError("Invalid issue rule")
        for use, status in rule["uses"].items():
            if use not in USES or status not in {"reference_only", "requires_review"}:
                raise CatalogError("Invalid issue use/status")
    mapped, seen = [], set()
    for raw in raw_records:
        if not isinstance(raw, dict) or set(raw) != set(NUMERIC_FIELDS + TEXT_FIELDS) | {"source_printed_page"}:
            raise CatalogError("Unexpected source fields")
        for field in TEXT_FIELDS:
            if not isinstance(raw[field], str):
                raise CatalogError(f"Invalid text: {field}")
        source_id = raw["canonical_id"]
        if not re.fullmatch(r"(?:BAO2011-|BELL2016-S1-)\d{3}", source_id) or source_id in seen:
            raise CatalogError(f"Invalid or duplicate source ID: {source_id}")
        seen.add(source_id)
        for field in NUMERIC_FIELDS:
            value = raw[field]
            try:
                valid = value is None or (type(value) in (int, float) and math.isfinite(value) and value >= 0)
            except OverflowError:
                valid = False
            if not valid:
                raise CatalogError(f"Invalid numeric field: {source_id}/{field}")
        if type(raw["source_row"]) is not int or raw["source_row"] < 1:
            raise CatalogError("Invalid source row")
        if source_id.rsplit("-", 1)[1] != f"{raw['source_row']:03d}":
            raise CatalogError("Source ID/row mismatch")
        if type(raw["source_printed_page"]) not in (int, str):
            raise CatalogError("Invalid source page")
        study_id = "bao2011" if source_id.startswith("BAO") else "bell2016"
        study = studies.get(study_id)
        if not isinstance(study, dict) or raw["source_doi"] != study.get("doi"):
            raise CatalogError("Source identity/study mismatch")
        decisions = {use: _decision("candidate", "source_field_present") for use in USES}
        reasons = []
        if raw["FII_pct"] is None:
            reasons.append("missing_fii")
        if raw["response_reference"] not in ("glucose=100", "glucose=100 (Bao 2011 harmonized)"):
            reasons.append("incompatible_or_unknown_reference")
        if not all(raw[f] for f in ("food_name_source", "source_doi", "source_study", "source_table", "source_printed_page")):
            reasons.append("incomplete_source_attribution")
        dose = raw["actual_test_energy_kJ"]
        if dose == 300:
            decisions["experimental_fii_input"] = _decision("reference_only", "reduced_test_dose_300_kj")
        elif dose != 1000:
            reasons.append("unsupported_or_unknown_test_dose")
        if reasons:
            decisions["experimental_fii_input"] = _decision("requires_review", *reasons)
        elif dose == 1000:
            decisions["experimental_fii_input"] = _decision("candidate", "attributed_glucose_reference_1000_kj")
        if raw["composition_basis_kJ"] != 1000 or any(raw[f] is None for f in (
            "weight_g_per_MJ", "protein_g_per_MJ", "fat_g_per_MJ", "avcho_g_per_MJ"
        )):
            decisions["composition_energy"] = _decision("requires_review", "incomplete_or_unsupported_composition")
        if raw["GI_pct"] is None or raw["GL_g_per_MJ"] is None:
            decisions["gi_gl_calculation"] = _decision("reference_only", "missing_gi_or_gl")
        if raw["fibre_g_per_MJ"] is None:
            decisions["fibre_context"] = _decision("reference_only", "missing_fibre")
        attached = []
        for rule in policy["issue_rules"]:
            if source_id not in rule["record_ids"]:
                continue
            attached.append(rule["issue_id"])
            for use, status in rule["uses"].items():
                current = decisions[use]
                if current["status"] == "candidate":
                    current["reasons"] = []
                # Review takes precedence over reference-only; retain every reason.
                if current["status"] != "requires_review":
                    current["status"] = status
                current["reasons"].append(f"{rule['issue_id']}: {rule['reason']}")
        mapped.append({
            "source_record_id": source_id, "study_id": study_id,
            "original_food_wording": raw["food_name_source"],
            "fii_mean": raw["FII_pct"], "fii_uncertainty": {"type": "SEM", "value": raw["FII_sem"]},
            "reference_scale": "glucose=100" if raw["response_reference"] in (
                "glucose=100", "glucose=100 (Bao 2011 harmonized)"
            ) else None,
            "actual_test_energy_kJ": dose, "composition_basis_kJ": raw["composition_basis_kJ"],
            "record_sample_size": None,
            "record_sample_size_status": "not_reported_per_row; see linked study methods",
            "issue_ids": attached, "eligibility": decisions, "raw": raw,
        })
    if any(set(rule["record_ids"]) - seen for rule in policy["issue_rules"]):
        raise CatalogError("Policy refers to absent record")
    return mapped


@dataclass(frozen=True)
class Selection:
    status: SelectionStatus
    catalog_version: str
    source_record_id: str
    reasons: tuple[str, ...]
    record: Mapping | None = None


@dataclass(frozen=True, init=False)
class ReferenceCatalog:
    version: str
    content: Mapping
    records: Mapping

    @classmethod
    def load(cls, path: str | Path) -> ReferenceCatalog:
        return cls.from_bytes(Path(path).read_bytes())

    @classmethod
    def from_bytes(cls, data: bytes) -> ReferenceCatalog:
        content = parse_json(data)
        try:
            if set(content) != {"schema_version", "policy", "studies", "source_issues", "input_hashes", "records"}:
                raise CatalogError("Invalid catalog fields")
            if content["schema_version"] != SCHEMA_VERSION:
                raise CatalogError("Unsupported schema")
            if not content["input_hashes"] or any(
                not re.fullmatch(r"[0-9a-f]{64}", value) for value in content["input_hashes"].values()
            ):
                raise CatalogError("Invalid input hashes")
            expected = map_records([record["raw"] for record in content["records"]],
                                   content["policy"], content["studies"], content["source_issues"])
            if canonical_bytes(expected) != canonical_bytes(content["records"]):
                raise CatalogError("Mapped fields or eligibility differ from source/policy")
        except (KeyError, TypeError, AttributeError) as exc:
            raise CatalogError("Malformed catalog") from exc
        snapshot = _freeze(content)
        result = object.__new__(cls)
        object.__setattr__(result, "version", "r2_sha256_" + hashlib.sha256(canonical_bytes(content)).hexdigest())
        object.__setattr__(result, "content", snapshot)
        object.__setattr__(result, "records", MappingProxyType({
            row["source_record_id"]: row for row in snapshot["records"]
        }))
        return result

    def select(self, source_record_id: str, *, expected_catalog_version: str) -> Selection:
        if expected_catalog_version != self.version:
            return Selection(SelectionStatus.VERSION_MISMATCH, self.version, source_record_id,
                             ("expected_catalog_version_does_not_match",))
        record = self.records.get(source_record_id)
        if record is None:
            return Selection(SelectionStatus.UNKNOWN_ID, self.version, source_record_id,
                             ("exact_source_id_required; no_name_matching",))
        decision = record["eligibility"]["experimental_fii_input"]
        status = (SelectionStatus.SELECTED if decision["status"] == "candidate"
                  else SelectionStatus(decision["status"]))
        return Selection(status, self.version, source_record_id, decision["reasons"],
                         record if status == SelectionStatus.SELECTED else None)
