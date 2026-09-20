# Insight Insulin App

Mobile AI meal-tracking app that estimates relative insulin demand using FII-based scoring, chronic DIL/DII trends, and uncertainty labels.

## Structure

- `frontend/` — Ionic React + Capacitor mobile app
- `backend/` — FastAPI scoring, persistence, FII lookup, chronic metrics, validation
- `docs/` — scientific model, engineering model, audits, validation plans

## Current Status

Model-alignment prototype:
- backend-owned insulin scoring
- acute meal insulin demand
- chronic DIL/DII trend
- uncertainty/source-quality labels
- AI-assisted meal extraction and review flow

## Private Beta Privacy Note

Private beta privacy note: meal data is stored for app functionality; AI meal extraction sends submitted meal images/descriptions to an external AI service. Uploaded images are not retained by the INSIGHT backend by default after extraction. This beta is not intended for sensitive medical records or regulated clinical use.

## Private Beta Topology Note

INSIGHT's current beta is intended for local or tightly controlled single-user testing. The backend does not yet provide production authentication, account isolation, or multi-tenant data separation. Do not expose the beta backend as a public internet service. Backend-saved meal data is stored in the app's local backend database, while some frontend state may be stored in the browser. AI meal extraction sends submitted meal images/descriptions to an external AI service as documented above. This beta is not intended for sensitive medical records, regulated clinical use, or untrusted multi-user deployment.

Full details of the current topology and trust model: [docs/private-beta-topology.md](docs/private-beta-topology.md).


## Reference Private Preview (R3B, default OFF)

The experimental reference-preview flow is **off by default on both sides**
and has no runtime or settings toggle. See
`docs/decisions/2026-09-19-reference-private-preview.md`.

| Side | Variable | Enabled by | Anything else |
|---|---|---|---|
| Backend | `INSIGHT_REFERENCE_PREVIEW` | exactly `1` | router unmounted, module not imported, `/reference-meals` does not exist |
| Frontend | `VITE_REFERENCE_PREVIEW` | exactly `1`, **at build time** | legacy flow built; changing the value after a build changes nothing |

Backend requests go to `VITE_BACKEND_API_URL` (or `config.json`) as before.

Local browser storage used by the preview:

| Key | Contents | Cleared when |
|---|---|---|
| `insight-meals` (schema v2) | Saved-meal cache: server meal identity, title, time and one validated reference attachment per entry | The meal is deleted, or a validated server read replaces it |
| `insight-reference-pending:v1:<uuid>` | One **unresolved** save: meal name, reviewed portions/nutrition/source IDs, request UUID, frozen endpoint, exact request bytes | The save is reconciled, or the user discards it explicitly. Never by age. |

A retry record holds no photo, no catalog copy and no credential. Nothing is
uploaded on its own: there is no background retry, no startup POST and no
retry timer.

### Enabled synthetic acceptance run

Real app, real reference router, temporary SQLite in a fresh working
directory, no owner `.env` and no provider request:

```bash
# terminal 1 — backend harness (test-only controls live here, not in main.py)
cd backend && python -m tests.r3b_harness --port 8099

# terminal 2 — production frontend build with the flag baked in
cd frontend
VITE_REFERENCE_PREVIEW=1 VITE_BACKEND_API_URL=http://127.0.0.1:8099 npm run build
npx vite preview --host 127.0.0.1 --port 5199

# terminal 3 — enabled acceptance suite (separate config from the legacy smoke suite)
cd frontend && npx cypress run --config-file cypress.config.r3b.ts
```

Rollback is by configuration: unset the flags and rebuild. Meals saved through
the reference route stay in the same `meals` table and remain visible to the
legacy client; a rolled-back client re-reads history from the server because it
does not read the v2 cache.

## Backend Setup

From the repo root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Create `backend/.env` with required local secrets, including:

```bash
OPENAI_API_KEY=your_api_key_here
```

## Run Backend

From `backend/` with the virtual environment active:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API root should respond at:

```text
http://127.0.0.1:8000/
```

## Frontend Setup

From the repo root:

```bash
cd frontend
npm ci
```

## Run Frontend

From `frontend/`:

```bash
npm run dev -- --host 127.0.0.1
```

The frontend reads `frontend/config.json`, which currently points API calls to:

```text
http://127.0.0.1:8000
```

Start the backend first so frontend API calls resolve locally.

## Validation

From `backend/` with the virtual environment active:

```bash
python -m validation.run_validation
```

Optional backend syntax/import sanity check:

```bash
python -m py_compile main.py models.py services.py api/meals.py chronic_service.py db.py db_models.py estimate_quality.py fii_lookup.py food_normalizer.py scoring_service.py validation/*.py
```

Optional frontend production build check:

```bash
cd frontend
npm run build
```

## Browser Smoke Tests (Cypress)

Deterministic browser tests using synthetic data; every backend call is
intercepted, so no backend, API key, or network access is needed. From
`frontend/`, serve the app on port 5173 and run the suite:

```bash
npm run dev -- --host 127.0.0.1 --port 5173   # or: npm run build && npx vite preview --host 127.0.0.1 --port 5173
npm run test.e2e
```

## Demo Seed Data (Local Only)

Optional, for local private-beta demos so the Dashboard's 7-Day Logged Meal Trend is not empty. Inserts ~12 days of synthetic meals (names prefixed `Demo: `) into the local `backend/app.db` through the normal scoring path. Operator-invoked only — never runs on app startup or in CI. No real data, photos, external AI calls, or API keys involved.

From `backend/` with the virtual environment active:

```bash
python scripts/seed_demo_data.py               # seed (no-op if demo rows already exist)
python scripts/seed_demo_data.py --reset-demo  # remove exactly the seeded demo meals
```
