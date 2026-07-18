# Campaign B Architecture — Consequential Correction and Calculate-Before-Save

**Status:** Sealed implementation contract (v1.0, approved 2026-07-18). The idempotency
schema change is design-approved (§7) but its implementation must still pass the
persistence high-risk process (plan mode, tests, independent review). The only open
decision is the issue #97 outcome (§13). Approval record: §14.
**Product authority:** `docs/product/ux/insight-ux-campaign-b.md`.
**Baseline read:** `backend/api/meals.py`, `backend/scoring_service.py`,
`backend/estimate_quality.py`, `frontend/src/api/api.ts`,
`frontend/src/utils/fiiTrustBoundary.ts`, `frontend/src/pages/meal/PreviewMeal.tsx`,
`frontend/src/stores/{currentMealStore,persistentMealStore}.ts` at `main` @ `19a690e`.

---

## 1. Current contract (facts this design builds on)

- `POST /meals` is the **only** canonical scoring path and it persists: it computes
  per-item insulin load (`compute_insulin_load_item`), totals, `acute_score`,
  `estimate_quality` (from item `fii_source`s only), writes `MealDB` + `MealItemDB`,
  and returns `MealResponse`. The server generates the meal id. There is no update
  endpoint, no preview, and no idempotency mechanism.
- `MealCreate` carries no image and no client id. `POST /ai-meal-extract` is stateless
  and keeps images in memory only.
- The frontend draft lives in `currentMealStore` (in-memory zustand). Saved meals live
  in `persistentMealStore` (localStorage, backend-canonical hydration, backend-first
  delete). `buildDraftFromSavedMeal` strips `fii`/`source`/`why` on reuse. AI-proposed
  FII is dropped at `normalizeAiExtractedItem` and never sent unless the user typed an
  explicit FII (`normalizeExplicitFii`).
- `MealItem.source` is **overloaded**: `"ai"` on AI-draft items, backend `fii_source`
  on canonical items. Draft-side provenance and canonical evidence share one field.
- Chronic metrics aggregate over persisted meals only.

## 2. Why the current contract cannot support the target behaviour

- **Preview:** a canonical estimate is only obtainable by persisting. Any UI that shows
  "calculate, then decide" on top of `POST /meals` either lies (client-computed numbers
  that may diverge from the canonical core — forbidden) or silently saves (meal enters
  History/Recents/chronic trend before the user decided; "discard" becomes a
  network-dependent destructive delete, and a failed delete leaves phantom history).
- **Duplicates:** save retries (timeouts, double taps) create duplicate rows today;
  nothing in the contract lets the server recognise a retry.
- **Correction:** invalidation-on-rename is a pure frontend-state concern, but the
  overloaded `source` field can't represent "AI-proposed and since reviewed" without
  colliding with canonical `fii_source` values.

## 3. Evaluated options for calculate-before-save

| Option | Verdict | Reasoning against the criteria |
|---|---|---|
| **A. Stateless preview endpoint** (`POST /meals/preview`, shared scoring code, no write) | **Chosen** | Scientific parity by construction (same function as save). Zero accidental persistence; nothing to retain, expire, or audit server-side. No image involvement (payload has none). Offline behaves like save (fails soft, draft intact). Naturally idempotent (pure). Cheap: one route + one refactor. Future Rust core replaces the single shared function; preview and save cannot diverge. Multi-user later: preview stays stateless/authless-compatible. |
| B. Server-side temporary draft | Rejected | Introduces retention, expiry, cleanup, and audit questions for unsaved health-adjacent data; a second identity space (draft ids); migration burden; offline worse (draft lives remotely). No benefit over A for a single canonical result. |
| C. Client-side estimate via the canonical core | Rejected (now) | The deterministic core is Python today; the Rust/UniFFI core does not exist in the client. A JS re-implementation is unaudited Python/JS divergence — explicitly forbidden. Revisit only when the Rust core ships on-device; the seam in §4 is where it would plug in. |
| D. Calculate-and-save + delete on discard | Rejected | False semantics: persistence before decision, trend/Recents contamination, discard requires connectivity and can fail, delete-storms in logs; violates "nothing is kept until the user keeps it". |
| E. Other existing repo mechanism | None exists | `/ai-meal-extract` is recognition, not scoring; no other scoring surface exists. |

## 4. Chosen backend architecture

### 4.1 Shared modelling core (refactor, no behaviour change)

Extract from `create_meal` a pure function in `backend/api/meals.py` (or a sibling
module):

```
model_meal(meal: MealCreate) -> ModeledMeal
  # per-item: compute_insulin_load_item + why + kcal/macros scaling (existing code, moved)
  # totals, acute_score, main_insulin_drivers, estimate_quality (existing code, moved)
```

`ModeledMeal` holds item rows + aggregates without ids/timestamps. **The move must be
verbatim** — no formula, coefficient, rounding, or ordering change; golden tests pin
outputs before and after the refactor.

### 4.2 Endpoints

- `POST /meals/preview` — request **`MealPreviewRequest { meal_name: str, items:
  list[MealItemCreate] }`**: no `created_at`, no client id, no image field — the
  request type cannot express persistence, identity, or retention. Response
  **`MealPreviewResponse`**, a standalone model (not `MealResponse` with optional
  fields): `meal_name`, `items: list[MealItemResponse]`, `insulin_load_total`,
  `acute_score`, `kcal_total`, `carbs_total`, `protein_total`, `fat_total`,
  `estimate_quality`, `main_insulin_drivers`, and literal `persisted: false`. It has
  **no `id` and no `created_at`** — an unsaved estimate is a value, and the type
  system must make it impossible to confuse with a saved record. Runs `model_meal`;
  performs no database writes; stateless.
- `POST /meals` (save) — unchanged computation; gains optional idempotency (§7).
- **No new item-count limit.** The current contract has no documented meal-item bound
  (only the AI endpoint's image bounds exist), and Campaign B must not introduce an
  arbitrary one. Request-size/rate limiting is outside this campaign — recorded as a
  pre-existing observation, not a requirement.

### 4.3 Identity model

| Thing | Identity | Owner |
|---|---|---|
| Draft | client UUID (`currentMealStore.meal.id`), never sent to backend | frontend |
| Preview result | **none** — a value, not an entity; frontend pairs it with an input fingerprint (§6) | frontend |
| Saved meal | server-generated UUID (unchanged) | backend |
| Save request | `client_request_id` UUID minted **once per intended save** (a new preview mints a new id; every retry of that save reuses it verbatim; preview requests never carry it) (§7) | frontend mints, backend enforces |

Persistence timing: exactly one moment — a successful `POST /meals`.

## 5. Frontend state ownership

- `currentMealStore` (draft) gains nothing persistence-related; it remains the single
  owner of draft inputs.
- New estimate state (either in `currentMealStore` or a small `estimateStore`):
  `{ previewResult, previewedPayload, previewedFingerprint, saveRequestId, status }`.
  - `previewedPayload` is the **frozen** `CreateMealPayload` that produced the result;
    Save submits this object, not a re-serialization of the live draft.
  - `previewedFingerprint` = stable hash/JSON of the payload; recomputed on draft change;
    mismatch ⇒ result stale, Save disabled.
  - Preview results are **never** written to `persistentMealStore` and never given a
    route under `/meals/saved/`. The unsaved-result screen renders from this state at
    the approved route **`/meals/estimate`**; reusing the saved-detail layout is a
    component concern, not a store concern.
- Item type change (B1): add a draft-side provenance field (e.g.
  `draftProvenance?: "ai_proposed" | "user_reviewed" | "user_entered"`) and stop
  overloading `source` for `"ai"`. Canonical `source` (backend `fii_source`) semantics
  untouched. `mapDraftMealItemToCreatePayload` must not transmit provenance.
- **`/meals/estimate` route behaviour (approved):** Back / "Adjust meal" returns to the
  confirm screen with draft and estimate state intact (the estimate stays reusable
  until the fingerprint changes). Discard (after confirmation) clears the estimate
  state and the draft and navigates to Log Meal; entering the route without estimate
  state (deep link, resume after discard) redirects to `/log-meal`. Save success
  **replaces** the route with `/meals/saved/:id`, so back navigation cannot revisit a
  stale unsaved copy. Save failure stays on `/meals/estimate` with the result retained
  and a Retry action re-sending the identical frozen payload and `client_request_id`.

## 6. Invalidation rules (normative)

1. Component **name** change ⇒ on that item: clear `fii`, `source`, `why`; set
   `needsReview` with the prior name recorded for the flag copy; carried numeric values
   remain visible but unconfirmed. Never auto-zero; never silently keep as confirmed.
2. Calculation is blocked while any item `needsReview` (resolved by user edit of that
   item's values or explicit confirmation). **Representation & enforcement:** the
   needs-review state lives on the draft item in `currentMealStore` (e.g.
   `needsReview?: { previousName: string }`), is enforced by the same frontend
   validation layer that already gates save (`mealDraftUx` helpers used by
   `PreviewMeal`), and is **never transmitted to the backend** — draft state is a
   frontend concern and the backend gains no field for it.
3. Any change to name/amount/unit/nutrition/GI/FII of any item, or item add/remove ⇒
   fingerprint mismatch ⇒ existing preview stale ⇒ Save disabled, Recalculate offered.
4. Meal-name change ⇒ **no** invalidation (descriptive), except: the meal name is part
   of the save payload (`meal_name`), so it is included in the frozen payload; renaming
   after preview updates only `meal_name` in the frozen payload without staleness
   (documented single exception — it feeds no modelling input; item names do).
5. Reuse drafts (`buildDraftFromSavedMeal`): already stripped of `fii/source/why`;
   stamped `user_entered`; no `needsReview` on creation.

## 7. Idempotency and failure handling

- **Approved schema change (design):** two additive nullable columns on `meals` —
  `client_request_id TEXT NULL` with a **unique index**, and
  `client_request_fingerprint TEXT NULL` (SHA-256 hex of the canonical JSON of the
  validated `items` payload — the modelling inputs). SQLite unique indexes treat NULLs
  as distinct, so every legacy row and every non-B2 client remains valid and can never
  conflict. Invariants: old rows untouched; uniqueness applies only to non-null ids.
- Frontend mints **one id per intended save**: a successful preview mints a new
  `saveRequestId`; every retry of that save reuses it verbatim; a recalculation (new
  preview) mints a new id. Preview requests never carry the id — preview cannot
  consume it.
- Backend save with `client_request_id`: no existing row ⇒ insert with id +
  fingerprint. Existing row, same id, **matching fingerprint** ⇒ return the stored
  canonical meal (200, same body) — covers lost responses and double-taps; a
  meal_name-only difference is not material (the name is descriptive; the stored name
  wins). Existing row, same id, **different fingerprint** ⇒ **409 Conflict**: the id
  is being reused for materially different modelling inputs, and silently returning
  unrelated data is forbidden. Unique-constraint race ⇒ re-read, compare fingerprint,
  apply the same rule. No id supplied ⇒ exactly today's behaviour.
- Idempotency is a persistence concern only: it sits **outside the Rust modelling
  core's parity surface** (golden fixtures cover `model_meal` inputs/outputs, not
  request identity).
- Preview failure ⇒ curated error, draft intact, no state consumed.
- Save failure ⇒ preview state retained; Retry re-sends the same frozen payload + id.
- Discard ⇒ pure client-state drop (confirm dialog); nothing to tell the server.
- Auditability: a saved meal is the only durable artifact; its stored inputs/outputs
  fully reproduce the estimate. Previews are intentionally unlogged as product data
  (operational request logs unaffected).

## 8. Provenance and protected boundaries

- The AI FII trust boundary is untouched: AI-proposed FII is dropped at normalization,
  explicit user FII remains the only `user_confirmed` path, and the backend continues
  deriving `fii_source` itself. Preview must not introduce any new way for client-sent
  trust to reach scoring.
- `resolve_estimate_quality`, all scoring functions, `fii_foods.csv`, confidence values,
  and all user-facing scientific copy are out of scope. The #97 fix (estimate
  completeness) is a separate, scientifically approved change that lands **before B2**;
  whatever it defines flows through `model_meal` identically for preview and save.

## 9. Rust parity implications

`model_meal` becomes the single choke point that the target-architecture Rust core will
replace (server-side first; on-device later would enable option C without divergence).
Requirements recorded now: preview and save must call the same core in every future
implementation; golden fixtures are expressed as input-payload → full response pairs so
they can validate Python and Rust implementations byte-for-byte (modulo float
formatting rules already used by existing fixtures).

## 10. Migration compatibility

- Existing saved meals: untouched; `client_request_id` and
  `client_request_fingerprint` are NULL for all prior rows;
  `MealResponse` shape unchanged, so hydration, History, Recents, trends, and the
  Android app's cached data keep working.
- Old clients (without preview) keep functioning: `POST /meals` without
  `client_request_id` behaves exactly as today.
- Migration test: apply migration to a copy of a pre-B2 database, verify row counts,
  reads, save, delete, and chronic metrics are unchanged.

## 11. Test strategy

- **Refactor pinning:** golden tests capture `POST /meals` responses for representative
  payloads (exact/mapped/user_confirmed/fallback/unknown items, mixed meals, zero-kcal
  #97 reproduction) before the refactor; identical after.
- **Parity:** for each golden payload, `preview(payload)` == `save(payload)` on every
  scoring field (ignoring `id`/`created_at`/`persisted`).
- **No-write proof:** preview requests leave `meals`/`meal_items` row counts unchanged.
- **Idempotency:** same `client_request_id` + same items twice ⇒ one row, equal
  responses; same id + materially different items ⇒ 409 and no new row; distinct ids ⇒
  two rows; NULL id ⇒ legacy behaviour.
- **Frontend:** invalidation unit tests (rename clears fii/source/why, sets needsReview;
  calculate gate; fingerprint staleness; frozen-payload save), trust-boundary regression
  (AI fii never in payload), store tests (preview never enters persistentMealStore).
- **Mutation challenges** (must fail if the guard is broken): see mission doc.

## 12. Resolved decisions (2026-07-18 approval)

1. **Idempotency design approved** — `client_request_id` + `client_request_fingerprint`
   under the §7 invariants; implementation still passes the persistence high-risk
   process (plan mode, migration tests, independent review) inside Slice B2-1.
2. **`MAX_MEAL_ITEMS` dropped** — the current contract has no documented item bound and
   Campaign B introduces no new arbitrary limits.
3. **No quick-rename or quick-add chips** anywhere in Campaign B; meal-level subtype
   chips are removed; explicit component editing is the only correction mechanism.
4. **Unsaved-result route approved:** `/meals/estimate` (behaviour in §5).
5. **Copy wording** is refinable by the implementer within the fixed meanings of the
   product doc §6 — not a blocking decision.

## 13. The one remaining gate — issue #97 decision brief

**Who decides:** scientific + product sign-off (human), independently reviewed.
**When:** before Slice B2-2 starts. B1 and B2-1 are unaffected and must not
pre-implement any part of it.

**What must be decided:** how the product responds when modelling inputs are
incomplete. Reproduced case (native QA, 2026-07-17): positive portion, exact-FII
source path, zero kcal/macros ⇒ score 0 with `estimate_quality: high` rendered as
"Data quality: High". Exactly one of issue #97's options must be approved:
(1) reject save as insufficient input; (2) return an insufficient-data result;
(3) degrade estimate quality; (4) split source-evidence quality from estimate
completeness.

**Fixed vocabulary (all Campaign B documents use these meanings):**

- *evidence/source match quality* — how each item's FII value was obtained
  (exact / mapped / user-confirmed / fallback / unknown); what
  `resolve_estimate_quality` measures today;
- *input completeness* — whether the inputs the chosen evidence path needs (eaten
  energy; macros for fallback paths) are present at all; currently unmeasured;
- *calculated-estimate status/confidence* — the per-item confidence numbers and any
  overall result status; unchanged by Campaign B.

**Constraints on the eventual #97 change:** after it lands, `estimate_quality` alone
must no longer imply a reliable estimate for a zero-nutrition meal; no coefficient or
threshold is chosen casually; the approved-scientific-change process applies (rationale,
version bump, golden-fixture updates, before/after report, independent review);
backend, frontend, Rust plans, fixtures, and copy stay consistent. Because the fix
flows through `model_meal`, preview and save render the approved outcome identically,
and B2-2 renders it as the "insufficient data" journey state.

## 14. Approval

- **Status:** Sealed implementation contract, v1.0, 2026-07-18.
- **Approved decisions:** option A (stateless `POST /meals/preview` with the §4.2
  standalone request/response types); shared `model_meal` verbatim refactor with golden
  pinning; identity model of §4.3; frontend state ownership and `/meals/estimate`
  behaviour of §5; invalidation rules of §6; idempotency design of §7; no new limits
  (§4.2); migration compatibility and test strategy of §10–§11.
- **Remaining hard gates:** (1) issue #97 outcome (§13) before B2-2; (2) persistence
  high-risk process for the §7 migration during B2-1 implementation.
- **Prohibited interpretations:** this document authorizes no change to
  `scoring_service.py`, `estimate_quality.py`, `fii_lookup.py`, `food_normalizer.py`,
  `fii_foods.csv`, `chronic_service.py`, confidence values, or scientific copy; the
  `model_meal` extraction must be verbatim; preview must never write; nothing here
  permits image transmission, retention, or client-side scoring. Ambiguity is a stop
  condition, not an implementation choice.
- **Version/date:** v1.0 — 2026-07-18.
