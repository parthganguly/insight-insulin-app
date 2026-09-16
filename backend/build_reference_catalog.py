"""Deterministically build R2's inactive catalog; stdlib only, no app imports."""

import argparse
import csv
import hashlib
import io
from pathlib import Path

from reference_catalog import (
    CatalogError, ReferenceCatalog, SCHEMA_VERSION, canonical_bytes, map_records, parse_json,
)

DATA_DIR = Path(__file__).resolve().parent / "reference_data" / "r2"
SOURCE_HASHES = {
    "inputs/INSIGHT_FII_147_metadata_v1_1.csv": "2a8f9e612e493f7e93e363126f286807a72517cb994a6c90dc450c4d43aec4c9",
    "inputs/INSIGHT_FII_147_metadata_v1_1.json": "3ebb953a3eec8510de588d06a03bfdef1bcdc5ec6915444ba36c8b5283ffa7a8",
    "historical/SOURCE_ISSUES_20260913.csv": "5d9f21b4826576cb2538ee54d1dac6e69f1bba6d461400c76c0801af1869271e",
    "historical/METADATA_CORRECTION_RECEIPT.json": "9801aa7b042b50cf50cee75e69c7cb8e385e5a7c4c9a1cf5150efe31331ffa08",
    "INPUT_RECEIPT.json": "98281f371b618e6c7e05aa55a3c90b6db600229789b75c229657d65808c578e2",
}


def build(data_dir: Path = DATA_DIR) -> bytes:
    source = {}
    for name, expected in SOURCE_HASHES.items():
        source[name] = (data_dir / name).read_bytes()
        if hashlib.sha256(source[name]).hexdigest() != expected:
            raise CatalogError(f"Input hash mismatch: {name}")
    raw = parse_json(source["inputs/INSIGHT_FII_147_metadata_v1_1.json"])
    if len(raw) != 147 or len({row["canonical_id"] for row in raw}) != 147:
        raise CatalogError("Expected exactly 147 unique records")
    csv_rows = list(csv.DictReader(io.StringIO(
        source["inputs/INSIGHT_FII_147_metadata_v1_1.csv"].decode("utf-8-sig"), newline=""
    )))
    if len(csv_rows) != len(raw):
        raise CatalogError("CSV/JSON row count differs")
    for csv_row, json_row in zip(csv_rows, raw):
        if set(csv_row) != set(json_row):
            raise CatalogError("CSV/JSON fields differ")
        for key, value in json_row.items():
            cell = csv_row[key]
            if value is None:
                equal = cell == ""
            elif type(value) in (float, int):
                equal = float(cell) == value
            else:
                equal = cell == value
            if not equal:
                raise CatalogError(f"CSV/JSON value differs: {json_row['canonical_id']}/{key}")
    issues = list(csv.DictReader(io.StringIO(
        source["historical/SOURCE_ISSUES_20260913.csv"].decode("utf-8-sig"), newline=""
    )))
    policy = parse_json((data_dir / "eligibility_policy.json").read_bytes())
    studies = parse_json((data_dir / "study_metadata.json").read_bytes())
    records = map_records(raw, policy, studies, issues)
    artifact = canonical_bytes({
        "schema_version": SCHEMA_VERSION, "input_hashes": SOURCE_HASHES,
        "studies": studies, "source_issues": issues, "policy": policy, "records": records,
    })
    ReferenceCatalog.from_bytes(artifact)
    return artifact


def eligibility_csv(artifact: bytes) -> bytes:
    catalog = ReferenceCatalog.from_bytes(artifact)
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(["catalog_version", "source_record_id", "use", "status", "reasons"])
    for source_id, record in catalog.records.items():
        for use, decision in record["eligibility"].items():
            writer.writerow([catalog.version, source_id, use, decision["status"],
                             " | ".join(decision["reasons"])])
    return output.getvalue().encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail on generated-file drift; write nothing")
    parser.add_argument("--out-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()
    artifact = build()
    outputs = {"candidate_catalog.json": artifact, "eligibility.csv": eligibility_csv(artifact)}
    for name, data in outputs.items():
        path = args.out_dir / name
        if args.check:
            if not path.exists() or path.read_bytes() != data:
                raise CatalogError(f"Generated file differs: {name}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    catalog = ReferenceCatalog.from_bytes(artifact)
    print(catalog.version)
    from collections import Counter
    print(dict(Counter(r["eligibility"]["experimental_fii_input"]["status"]
                       for r in catalog.records.values())))
    print("147 source records preserved; CSV/JSON equality and input hashes verified")


if __name__ == "__main__":
    main()
