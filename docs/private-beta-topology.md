# Private Beta Topology and Trust Model

Status: current implementation, verified against `main` on 2026-07-04 (issue #53).
This document describes what the private beta **is** so operators can audit their
own setup against it. It makes no production-readiness claims.

## Supported deployment

INSIGHT's current beta is intended for **local or tightly controlled single-user
testing** only: one trusted tester, one device, one locally running backend.
**Do not expose the beta backend as a public internet service.**

## Trust model (verified current behavior)

### No authentication

The backend has no authentication, authorization, sessions, tokens, or user
model. Every API endpoint (`/meals`, `/metrics/chronic`, `/ai-meal-extract`)
is open to any client that can reach the backend process.

### Permissive CORS

`backend/main.py` configures `CORSMiddleware` with `allow_origins=["*"]`,
`allow_credentials=True`, and wildcard methods/headers. This is a development
setting; it is not hardened for hostile networks.

### Shared local SQLite database

`backend/db.py` uses `sqlite:///./app.db` — one unencrypted SQLite file created
next to the backend process. There is no per-user scoping: every saved meal from
every client that reaches the backend lands in the same tables.

### Browser localStorage stores (separate from the backend database)

The frontend persists two zustand stores in browser/WebView localStorage:

- `insight-meals` — saved meals shown in "Recents", including full base64 meal
  photos
- `app-settings` — gender, age, weight, height, activity level

The frontend persists this browser/WebView localStorage state separately from
the backend database. Some flows copy backend responses into localStorage for
local UI state — saving a meal posts it to the backend and then stores the
canonical backend response in `insight-meals` for "Recents" — but this is not
account-scoped sync and does not make localStorage and the backend database a
unified privacy/security model. They have different lifetimes, devices, and
deletion paths.

### Split dashboard storage paths

The Dashboard's **Chronic Score** is computed by the backend from matching rows
in the shared backend database over the requested metrics window (30 days by
default). There is no per-user/account filter, so if more than one client posts
to the same backend, matching meals from all clients in that window can affect
the aggregate. The **Recents** list comes from the device's localStorage. With
multiple clients these views silently diverge — one more reason multi-user
deployment is unsupported.

### External AI service for meal extraction

AI meal extraction sends submitted meal images/descriptions to an external AI
service, as disclosed in-app and in the README (issues #50/#51).

### No backend image retention by default

Uploaded meal images are kept in memory only for the AI extraction call and are
not retained by the backend by default (issue #49, regression-tested).

### Localhost-only deployment story

`frontend/config.json` targets `http://127.0.0.1:8000` (overridable via
`VITE_BACKEND_API_URL`); the README instructs running uvicorn locally. There is
no hosting, TLS, or production deployment configuration.

## What this beta is not intended for

- sensitive medical records
- regulated clinical use
- untrusted multi-user deployment
- public internet exposure

Production authentication, account isolation, multi-tenant data separation, and
CORS hardening are future engineering work, tracked as explicit issues — not
assumptions to be made about the current beta.
