# Decision — reference private preview (R3B)

Date: 2026-09-19
Status: implemented locally, default OFF, external review pending.

## Scope and precedence

This record governs the bounded reference private-preview slice only. Within
that slice the order of precedence is:

1. `R3B_ARCHITECTURE_FREEZE.md` (the approved implementation contract) plus
   clarifications C1–C3 from the 2026-09-19 adjudication.
2. `docs/r2-reference-integration.md` (the R2 reference result contract).
3. `docs/r3a-presentation.md` (the R3A presentation components).

Where this record and an older document disagree **about the preview only**,
this record governs. Every other document keeps its meaning for legacy
behaviour, and nothing here lifts the July native/FFI validation gate
(`docs/decisions/2026-07-13-validation-gate.md`).

This is a **compatibility/migration component**. The current Ionic
React/Capacitor client and FastAPI backend remain the current implementation;
Rust/native remains target/deferred.

## What changed

Nothing scientific. No formula, catalog byte, eligibility rule, coefficient,
threshold, dataset version, fingerprint or stored-evidence envelope was
touched. Golden fixtures were run and were not regenerated.

What changed is the **connected client flow** around the already-implemented
R2 evaluator:

- a nullable reference draft variant in the existing current-meal store, so
  missing, explicit zero, invalid and unknown stay four different things;
- reviewed per-unit nutrition conversion applied exactly once
  (150 g eaten at 200 kcal per 100 g is 300 kcal, not 30,000);
- strict runtime decoding of every HTTP, cache and journal payload;
- coordinated preview and save state with material/edit revisions;
- a checked, purpose-limited local retry journal;
- one canonical saved-meal cache with per-entry validation and read/write
  race guards;
- fail-closed presentation: no legacy acute score, verdict, partial model
  output, quality verdict or chronic trend in preview mode;
- default-off flags on both sides.

## Design-constitution resolution for preview mode

The constitution's legacy verdict and score-slot instructions are resolved for
preview mode as follows: the existing result area is occupied by the R3A
experimental / unavailable / read-state copy instead of the legacy acute
score and verdict. Paper/ink tokens, accessibility rules, navigation
semantics and the scientific non-claims remain binding and unchanged.

## Status update to the "dormant" wording

R2 and R3A described this work as dormant and unmounted. That is now stated
precisely:

- the backend router is mounted **only** when `INSIGHT_REFERENCE_PREVIEW=1`
  exactly; absent, `0`, `true`, `yes` or any other value leaves it unmounted
  and leaves the module unimported;
- the frontend branch is built **only** when `VITE_REFERENCE_PREVIEW=1` at
  build time; there is no runtime toggle and no settings switch;
- both default to off, and neither is activated on any normal installation.

This is a **configured test status**, not a release, not an activation, and
not a claim of scientific validation.

## Clarifications as implemented

**C1 — historical read and exact retry are not gated by today's pin.**
`buildReferencePreviewRequest` refuses to build a *new* evaluation unless the
draft's reviewed catalog version is the pinned R2 identity. A decoded
historical result, a restored journal request and an exact replay only need a
well-formed catalog identity, supported schema/formula/policy identities and
appropriate request/endpoint correspondence. An exact retry is therefore still
possible while the current catalog is unavailable or has a different pin. If
the server holds no matching record it may reject the old request as stale,
and the client then follows the explicit stale transition instead of mutating
its journal.

**C2 — correspondence respects the wire contract.**
New reference requests are constructed with every optional value written
explicitly, including real nulls and the declared nutrition origin. A sparse
supported request (for example one written by an older build) is compared
under the documented optional-request defaults only; its bytes are never
rewritten to make a comparison succeed. Missing *required* result, version or
source identities are still failures. Safe-integer limits apply to discrete
integer fields (GI, positions, source-row indices); reference loads and other
floating-point fields keep their finite-number contract, so a large finite
load stays displayable.

**C3 — absence is established by the reference protocol.**
Only HTTP 404 whose body is `{"detail": {"code": "meal_not_found"}}` from the
reference route establishes that one requested record is absent. A generic
FastAPI `{"detail": "Not Found"}`, an HTML 404, a malformed body or an absent
router is a route/protocol/configuration problem and never removes a cache
entry. After an ambiguous DELETE or a DELETE 404, reconciliation goes through
the protocol-specific detail check.

## Two review semantics, stated precisely

The transition table distinguishes two different reviews. Implementation made
the distinction explicit, because conflating them produced prompts a user
could not answer:

- **Carried-value review** (`needsReview`) means: *these nutrition values were
  entered for a different food; confirm they still fit.* It is raised only
  when nutrition actually carried over — by a food-identity change on an item
  that has values, or by reuse of evidence that has values. Naming a blank new
  item raises nothing, because there is nothing to confirm. "These still fit"
  resolves it, and never restores a cleared source selection.
- **Basis review** (`basisReviewed`) means: *the denominator or the unit
  changed; the per-unit meaning of these values is no longer confirmed.* It is
  raised only by a serving-size or unit change. A rename does not raise it,
  because a rename changes neither.

A food-identity change clears source approval in both cases. Neither review
ever re-matches a source implicitly.

## Local storage and retention

| Store | Key | Contents | Lifetime |
|---|---|---|---|
| Saved-meal cache | `insight-meals` | Server meal identity, title, time, and one validated reference attachment per entry. Photos only when tiny. | Until deleted or replaced by a validated server read. Schema version 2. |
| Retry journal | `insight-reference-pending:v1:<uuid>` | One unresolved save: meal name, reviewed portions/nutrition/source IDs, the request UUID, the frozen endpoint and the exact request bytes. | Until the save is reconciled or the user discards it explicitly. No age-based purge. |
| Camera recovery | `insight-camera-recovery` (IndexedDB) + a 36-character nonce in `localStorage` | Unchanged from J3. | Unchanged. |

A retry record contains **no** photo, no catalog copy, no source snapshot and
no credential. Nothing is uploaded on its own, and there is no background
retry, no startup POST and no retry timer.

## Rollback

Rollback is by configuration: unset `INSIGHT_REFERENCE_PREVIEW` and rebuild
the frontend without `VITE_REFERENCE_PREVIEW`. That restores legacy operation
immediately. Two limits are worth stating plainly:

- meals saved through the reference route remain in the same `meals` table and
  stay visible to the legacy client, which will render their compatibility
  fields; their reference evidence is simply not shown;
- `insight-meals` cache entries written at schema version 2 are not read by a
  version-1 build. A rolled-back client re-reads history from the server
  rather than losing it, but its local copy starts empty.

## Limits that are NOT solved here

- **Exactly-once is scoped.** The pending-save/delete guard covers one client
  context against one stable local backend. It is not permanent exactly-once
  protection after explicit abandonment, external deletion, backend
  replacement, or concurrent independent clients. The underlying cause is real
  and unchanged: `service.save` finds an existing request by its stored row, so
  deleting that row lets an old POST with the same key create a meal again. A
  server tombstone or correlation API would be needed to remove that limit;
  none is introduced here.
- **No forensic durability guarantee.** The journal is best-effort local
  storage. A cleared browser profile loses it.
- **Browser evidence is not device acceptance.** Samsung/TalkBack on-device
  acceptance remains R4.
- **No scientific validation.** Implementation parity is not validation.
  Subjective outcomes, diet-quality interpretation and CGM prediction are not
  acceptance endpoints or approved claims for this preview.

## Observed contract detail

The server returns `206.99999999999997` for the freeze's 207 example
(`(69/100) * 300` in IEEE-754 double arithmetic). The value is stored and
transmitted unrounded; the D1 display rule renders it as `207`. This is a
typography convention only — no payload, stored byte or checksum is rounded
anywhere in the client.


## Scoped correction behavior (2026-09-20)

The review/estimate route retains legitimate loading and failed recalculations;
Save requires the current material revision. A wrong detail ID is a protocol
read error, preserving valid cached evidence. Restored retry requests reject
unknown root/item keys, names beyond the existing 255-code-point limit and
non-finite consumed nutrition; supported sparse historical bytes remain intact.
Explicit cache replacement verifies readback and retains original bytes plus
read protection on failure. Replacement still may discard unreadable/local-only
history; a single refreshed detail is not reconstruction of the whole history.

The picker retains content until Ionic's dismissal completes and uses Ionic's
native focus restoration. There are no application focus timers or trigger
tabindex overrides. Browser acceptance uses native Chromium keyboard dispatch
and waits for did-present before interacting. Same-ID stale-read acceptance
coordinates two fetches in one application lifetime and releases the older
absence only after newer evidence is rendered. Browser cache is disabled only
for that race so identical HTTP requests can overlap.

The actual enabled-client/OFF-backend spec is excluded from legacy discovery
and run separately against the same enabled bundle. Synthetic browser checks
are not physical Samsung/TalkBack acceptance or scientific validation.
