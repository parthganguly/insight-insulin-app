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
