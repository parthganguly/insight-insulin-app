"""Test-only launcher for the R3B enabled synthetic acceptance run.

Runs the REAL production app (`main:app`) with the real reference router
mounted by the real `INSIGHT_REFERENCE_PREVIEW=1` flag, against a temporary
SQLite database in a fresh working directory. Nothing here ships in
`main.py`: the control surface lives in this wrapper and only exists while
this launcher is the process entry point.

Boundaries enforced here:

* dotenv loading is disabled and verified before the app is imported, so no
  owner `.env` is read;
* the working directory is a fresh temporary directory, so the app's relative
  `app.db` cannot touch an existing database;
* `/ai-meal-extract` and any barcode path are refused, so no provider request
  can leave this process;
* the controls are only reachable under `/__harness/`, which production
  `main.py` does not define.

Usage:
    python -m tests.r3b_harness --port 8099 [--work-dir DIR]
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------- faults

FAULTS: dict[str, object] = {
    # Drop the response of the next successful reference save AFTER it has
    # committed. Blocking the request before the server sees it would not
    # reproduce the case this exists to test.
    "drop_next_save_response": False,
    # Make catalog loading fail, so a new evaluation is impossible while an
    # exact replay of an already-committed request still has to work (C1).
    "catalog_unavailable": False,
}

REFUSED_PREFIXES = ("/ai-meal-extract", "/barcode", "/ai-barcode")


class HarnessError(RuntimeError):
    """Raised to close a connection after a committed write, on purpose."""


def _json_response(status: int, payload: object):
    body = json.dumps(payload).encode("utf-8")
    return (
        {"type": "http.response.start", "status": status,
         "headers": [(b"content-type", b"application/json"),
                     (b"access-control-allow-origin", b"*"),
                     (b"content-length", str(len(body)).encode("ascii"))]},
        {"type": "http.response.body", "body": body},
    )


def _db_path() -> Path:
    return Path.cwd() / "app.db"


def _connect() -> sqlite3.Connection:
    return sqlite3.connect(_db_path())


def _counts() -> dict:
    with _connect() as db:
        meals = db.execute("SELECT COUNT(*) FROM meals").fetchone()[0]
        items = db.execute("SELECT COUNT(*) FROM meal_items").fetchone()[0]
        evidence = db.execute("SELECT COUNT(*) FROM meals WHERE reference_result_json IS NOT NULL").fetchone()[0]
    return {"meals": meals, "meal_items": items, "with_reference_evidence": evidence}


def _rows() -> list[dict]:
    with _connect() as db:
        db.row_factory = sqlite3.Row
        rows = db.execute(
            "SELECT id, meal_name, client_request_id, client_request_fingerprint, "
            "typeof(reference_result_json) AS evidence_type, reference_result_json "
            "FROM meals ORDER BY created_at DESC"
        ).fetchall()
    return [
        {
            "id": row["id"],
            "meal_name": row["meal_name"],
            "client_request_id": row["client_request_id"],
            "client_request_fingerprint": row["client_request_fingerprint"],
            "evidence_type": row["evidence_type"],
            # Exact stored assessment bytes, for byte-level comparison across
            # a dropped response, a restart and an explicit retry.
            "reference_result_json": row["reference_result_json"],
        }
        for row in rows
    ]


def _reset() -> dict:
    with _connect() as db:
        db.execute("DELETE FROM meal_items")
        db.execute("DELETE FROM meals")
        db.commit()
    FAULTS["drop_next_save_response"] = False
    FAULTS["catalog_unavailable"] = False
    return _counts()


def _corrupt_evidence(meal_id: str, mode: str) -> dict:
    """Corrupt exactly one saved evidence field, leaving neighbours healthy."""
    with _connect() as db:
        if mode == "blob":
            db.execute("UPDATE meals SET reference_result_json = ? WHERE id = ?", (sqlite3.Binary(b"\x00\x01\x02"), meal_id))
        elif mode == "text":
            db.execute("UPDATE meals SET reference_result_json = ? WHERE id = ?", ("{not valid json", meal_id))
        elif mode == "tampered_hash":
            row = db.execute("SELECT reference_result_json FROM meals WHERE id = ?", (meal_id,)).fetchone()
            envelope = json.loads(row[0])
            envelope["sha256"] = "0" * 64
            db.execute("UPDATE meals SET reference_result_json = ? WHERE id = ?", (json.dumps(envelope), meal_id))
        elif mode == "legacy":
            # A genuine legacy row: saved before the preview existed, so the
            # server reports not_evaluated rather than a fabricated result.
            db.execute("UPDATE meals SET reference_result_json = NULL WHERE id = ?", (meal_id,))
        else:
            raise ValueError(f"unknown corruption mode {mode!r}")
        db.commit()
    return _counts()


def _handle_control(path: str, query: dict) -> tuple:
    if path == "/__harness/health":
        return _json_response(200, {"ok": True, "cwd": str(Path.cwd()), "db": str(_db_path())})
    if path == "/__harness/reset":
        return _json_response(200, _reset())
    if path == "/__harness/counts":
        return _json_response(200, _counts())
    if path == "/__harness/rows":
        return _json_response(200, _rows())
    if path == "/__harness/fault":
        name = query.get("name", "")
        if name not in FAULTS:
            return _json_response(400, {"error": "unknown_fault", "known": sorted(FAULTS)})
        FAULTS[name] = query.get("value", "1") == "1"
        return _json_response(200, dict(FAULTS))
    if path == "/__harness/corrupt":
        return _json_response(200, _corrupt_evidence(query["meal_id"], query.get("mode", "text")))
    return _json_response(404, {"error": "unknown_control"})


def _parse_query(raw: bytes) -> dict:
    from urllib.parse import parse_qs

    return {key: values[0] for key, values in parse_qs(raw.decode("utf-8")).items()}


def build_app():
    """Wrap the real app with the test-only control surface and faults."""
    import main
    from experimental_reference import service

    assert main.reference_preview_enabled(), "harness must run with INSIGHT_REFERENCE_PREVIEW=1"

    real_load_catalog = service.load_pinned_catalog

    def gated_load_catalog():
        if FAULTS["catalog_unavailable"]:
            raise OSError("synthetic catalog fault")
        return real_load_catalog()

    service.load_pinned_catalog = gated_load_catalog

    inner = main.app

    async def app(scope, receive, send):
        if scope["type"] != "http":
            await inner(scope, receive, send)
            return
        path = scope.get("path", "")

        if path.startswith("/__harness/"):
            for message in _handle_control(path, _parse_query(scope.get("query_string", b""))):
                await send(message)
            return

        if any(path.startswith(prefix) for prefix in REFUSED_PREFIXES):
            # No provider, recognition or barcode request may leave this run.
            for message in _json_response(403, {"detail": {"code": "provider_calls_refused_in_harness"}}):
                await send(message)
            return

        drop = (
            FAULTS["drop_next_save_response"]
            and scope.get("method") == "POST"
            and path.rstrip("/") == "/reference-meals"
        )
        if not drop:
            await inner(scope, receive, send)
            return

        # Let the real handler run to completion so the row is committed, then
        # drop the outbound response and close the connection.
        swallowed: list[dict] = []

        async def swallow(message):
            swallowed.append(message)

        await inner(scope, receive, swallow)
        FAULTS["drop_next_save_response"] = False
        status = next((m.get("status") for m in swallowed if m["type"] == "http.response.start"), None)
        print(f"[harness] dropped save response after commit (status {status})", flush=True)
        raise HarnessError("synthetic dropped response after commit")

    return app


def main_entry() -> int:
    parser = argparse.ArgumentParser(description="R3B enabled synthetic harness")
    parser.add_argument("--port", type=int, default=8099)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--work-dir", default=None, help="fresh working directory for the temporary app.db")
    args = parser.parse_args()

    # 1. Disable dotenv BEFORE importing the app, and verify it took effect.
    os.environ["PYTHON_DOTENV_DISABLED"] = "1"
    import dotenv

    # The installed implementation honours the flag, but the harness must not
    # assume every resolved version does, so the loader is patched outright.
    dotenv.load_dotenv = lambda *pos, **kw: False
    if hasattr(dotenv, "main"):
        dotenv.main.load_dotenv = dotenv.load_dotenv
    assert dotenv.load_dotenv() is False, "dotenv loading is not disabled"

    # 2. Exact opt-in flag for this process only.
    os.environ["INSIGHT_REFERENCE_PREVIEW"] = "1"

    # 3. Fresh temporary working directory so the relative app.db is isolated.
    work_dir = Path(args.work_dir) if args.work_dir else Path(tempfile.mkdtemp(prefix="insight-r3b-synthetic-"))
    work_dir.mkdir(parents=True, exist_ok=True)
    os.chdir(work_dir)
    sys.path.insert(0, str(BACKEND))

    import uvicorn

    app = build_app()
    versions = {
        "python": sys.version.split()[0],
        "work_dir": str(work_dir),
        "db": str(_db_path()),
    }
    for package in ("fastapi", "starlette", "pydantic", "sqlalchemy", "uvicorn", "httpx"):
        try:
            versions[package] = __import__(package).__version__
        except Exception:  # noqa: BLE001 - version reporting must never block the run
            versions[package] = "unknown"
    print("[harness] " + json.dumps(versions), flush=True)

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main_entry())
