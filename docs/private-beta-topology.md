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

The frontend persists two zustand stores in browser/WebView localStorage
(storage inventory rechecked 2026-09-08 at `1b7f64b`):

- `insight-meals` — saved meals shown in "Recents"; `persistentMealStore.ts`
  limits persisted `meal.image` values to 24,000 characters and retries quota
  failures without those images.
- `app-settings` — `settingsStore.ts` version 1 persists the `darkMode` preference.

Neither store is the camera recovery store described below.

The frontend persists this browser/WebView localStorage state separately from
the backend database. Some flows copy backend responses into localStorage for
local UI state — saving a meal posts it to the backend and then stores the
canonical backend response in `insight-meals` for "Recents" — but this is not
account-scoped sync and does not make localStorage and the backend database a
unified privacy/security model. They have different lifetimes, devices, and
deletion paths.

### Temporary camera recovery storage

Current Ionic/Capacitor implementation, audited at `1b7f64b` on 2026-09-08:
before a native camera or photo-picker launch, `cameraRecovery.ts` writes one
IndexedDB record (`insight-camera-recovery`, version 1, object store `pending`,
key `active`). It can include the full meal draft, existing full-size images,
Smart Camera note/error state, routes and discard baseline. The localStorage
key `insight-camera-pending` contains only a 36-character UUID nonce, not the
recovery draft or images. This device-local recovery mechanism is not an account
or cloud backup and does not itself upload anything to an AI provider.

Normal completion/failure, explicit cancellation/discard/flow exit, the live
expiry timer, and startup consumption attempt cleanup. Startup also attempts
to remove invalid, stale or orphaned records. `CAMERA_RECOVERY_MAX_AGE_MS`
is 900,000 ms: startup rejects an envelope whose age is at least 15 minutes
when parsed. This is recovery eligibility, not a guaranteed storage lifetime.
Suspension, a stopped app or storage errors can delay application-level cleanup;
browser/OS reclamation of deleted bytes may happen later. No exact physical or
forensic erasure time is promised.

The newly returned camera image is applied in memory, not written back to this
envelope; it can become a prior image in a subsequent camera-launch snapshot.
The separate estimate store remains foreground-only. See the
[source audit and claim/evidence matrix](../reports/ux/premium-redesign/j9-camera-process-death-recovery.md#recovery-storage-privacy-alignment-2026-09-08).
Provider/upload disclosure remains separate below.

### Split dashboard storage paths

The Dashboard's **7-Day Logged Meal Trend** (formerly "Chronic Score") is computed by the backend from matching rows
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


## Reference private preview (R3B) — configured test status, default OFF

This is not an activated feature. The backend router is mounted only when
`INSIGHT_REFERENCE_PREVIEW=1` exactly, and the frontend branch exists only in a
build made with `VITE_REFERENCE_PREVIEW=1`. Both default to OFF, there is no
runtime toggle, and no normal installation is activated.

What changes when it is enabled, and what does not:

- **Reads and writes stay on the same origin** as the legacy client. No new
  host, no new service and no public exposure is introduced.
- **History reads** are routed to `/reference-meals` instead of `/meals`. The
  rows are the same rows in the same table.
- **Deletion** uses the reference DELETE and is blocked while any unresolved
  retry record exists on the device, because deleting the row also removes the
  record the server uses to replay a repeated save safely.
- **The legacy chronic endpoint is not called at all** in this mode, and no
  replacement trend is introduced.
- **One additional local store** appears: the per-request retry journal
  described in the decision record. It is purpose-limited to making one
  unresolved save safe to repeat and is never uploaded on its own.
- **Nothing new is sent to the backend.** The reference request carries the
  reviewed portions, nutrition and explicitly selected source IDs the user
  entered — no photo, no telemetry, and no published FII in a legacy field.

Supported scope for this preview is **one client context against one stable
local backend**. It is not exactly-once protection across explicit
abandonment, external deletion, backend replacement or concurrent independent
clients, and it is not device acceptance — that remains R4.

## What this beta is not intended for

- sensitive medical records
- regulated clinical use
- untrusted multi-user deployment
- public internet exposure

Production authentication, account isolation, multi-tenant data separation, and
CORS hardening are future engineering work, tracked as explicit issues — not
assumptions to be made about the current beta.
