from __future__ import annotations

import json
import sys

from validation.evaluators import evaluate_case
from validation.fixtures import build_validation_cases


def run() -> int:
    cases = build_validation_cases()
    results = [evaluate_case(case) for case in cases]
    failed_results = [result for result in results if not result.pass_fail]

    report = {
        "summary": {
            "total": len(results),
            "passed": len(results) - len(failed_results),
            "failed": len(failed_results),
        },
        "results": [result.as_dict() for result in results],
    }
    print(json.dumps(report, indent=2))
    return 1 if failed_results else 0


if __name__ == "__main__":
    raise SystemExit(run())
