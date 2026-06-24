from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from validation.evaluators import evaluate_case
from validation.fixtures import build_validation_cases


SCHEMA_VERSION = 1
FORMULA_VERSION = "current_backend_v1"
GENERATED_BY = "python -m validation.export_golden_fixtures"
WARNING = "Implementation parity fixtures only; passing parity is not scientific validation."
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[2] / "crates" / "insight-core" / "fixtures" / "golden"


def _json_text(payload: dict) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def _case_path(case_id: str) -> str:
    return f"cases/{case_id}.json"


def build_fixture_files() -> dict[str, str]:
    cases = build_validation_cases()
    files: dict[str, str] = {}
    index_cases: list[dict[str, str]] = []

    for case in cases:
        result = evaluate_case(case)
        relative_path = _case_path(case.case_id)
        index_cases.append(
            {
                "case_id": case.case_id,
                "description": case.description,
                "kind": case.kind,
                "path": relative_path,
            }
        )
        files[relative_path] = _json_text(
            {
                "case_id": case.case_id,
                "description": case.description,
                "expected": result.as_dict(),
                "formula_version": FORMULA_VERSION,
                "generated_by": GENERATED_BY,
                "input": asdict(case),
                "kind": case.kind,
                "schema_version": SCHEMA_VERSION,
                "warning": WARNING,
            }
        )

    files["index.json"] = _json_text(
        {
            "cases": index_cases,
            "formula_version": FORMULA_VERSION,
            "generated_by": GENERATED_BY,
            "schema_version": SCHEMA_VERSION,
            "warning": WARNING,
        }
    )
    return files


def write_fixture_files(output_dir: Path, files: dict[str, str]) -> None:
    for relative_path, content in files.items():
        target = output_dir / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content.encode("utf-8"))


def check_fixture_files(output_dir: Path, files: dict[str, str]) -> int:
    expected_paths = set(files)
    existing_paths = {
        path.relative_to(output_dir).as_posix()
        for path in output_dir.rglob("*.json")
        if path.is_file()
    } if output_dir.exists() else set()

    failures: list[str] = []
    for relative_path in sorted(expected_paths - existing_paths):
        failures.append(f"missing fixture: {relative_path}")
    for relative_path in sorted(existing_paths - expected_paths):
        failures.append(f"extra fixture: {relative_path}")
    for relative_path in sorted(expected_paths & existing_paths):
        actual = (output_dir / relative_path).read_bytes().decode("utf-8")
        expected = files[relative_path]
        if actual != expected:
            failures.append(f"stale fixture: {relative_path}")

    if failures:
        print("Golden fixture check failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"Golden fixtures are current in {output_dir}")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export synthetic Python golden fixtures for Rust parity work.")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Output directory for generated fixture JSON files.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if tracked fixtures differ from freshly generated content.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    output_dir = args.out.resolve()
    files = build_fixture_files()

    if args.check:
        return check_fixture_files(output_dir, files)

    write_fixture_files(output_dir, files)
    print(f"Wrote {len(files)} golden fixture files to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
