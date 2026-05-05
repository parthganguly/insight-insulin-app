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
