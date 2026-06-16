# INSIGHT Repository Agent Instructions

## Read first

Before planning, reviewing, or changing code, read:

1. `docs/target-architecture.md`
2. `docs/scientific-model.md`
3. `docs/engineering-model.md`
4. `docs/code-audit.md`
5. `docs/scientific-validation-plan.md`

When documents conflict:

- `docs/target-architecture.md` governs the approved technical direction.
- `docs/scientific-model.md` and `docs/engineering-model.md` govern scientific meaning.
- Existing code describes current behaviour, not necessarily desired behaviour.
- Do not silently choose one interpretation. Report the conflict.

---

## Architecture is already decided

The approved target architecture is:

- Android: Kotlin + Jetpack Compose
- iOS later: Swift + SwiftUI
- shared scientific and domain core: Rust
- language bindings: UniFFI
- local database: SQLite with SQLCipher or equivalent encryption
- key protection: Android Keystore and Apple Keychain
- backend retained initially: Python + FastAPI
- future server database when required: PostgreSQL
- AI recognition: provider-neutral
- scoring: deterministic Rust core
- product and research data flows: separate

Do not independently replace this with:

- React Native
- Flutter
- Kotlin Multiplatform UI
- a Rust UI framework
- Firebase
- Supabase
- a permanent WebView-first architecture
- a total backend rewrite

Alternative technologies may be discussed only when an explicit issue
asks for an architecture reconsideration.

---

## Current implementation versus target implementation

The current Ionic React/Capacitor client and FastAPI backend are the
behavioural reference during migration.

Do not:

- claim that the target native architecture already exists
- delete current code merely because it is not part of the target stack
- break the existing app while creating replacements
- remove compatibility paths before parity is proven
- interpret a migration plan as permission for a big-bang rewrite

Every architectural report must label components as one of:

- current implementation
- compatibility or migration component
- target component
- deferred component

---

## Scientific boundaries

INSIGHT currently estimates population-level meal insulin demand.

It does not:

- directly measure insulin
- predict an exact personal insulin response
- diagnose insulin resistance
- calculate insulin dosage
- replace clinical testing

Never introduce wording or code that implies otherwise.

---

## Protected scientific behaviour

Do not invent, alter, or reinterpret:

- FII formulas
- insulin-load formulas
- acute-score formulas
- DIL calculations
- DII calculations
- rolling-trend definitions
- FII mappings
- fallback rules
- confidence or estimate-quality semantics
- score thresholds
- scientific claims

unless the task contains an explicitly approved scientific change.

Every approved scientific change must include:

- rationale
- source or evidence
- formula version change
- dataset version change where relevant
- golden fixture updates
- before-and-after output report
- independent review

---

## AI boundary

AI may:

- propose a dish name
- propose meal components
- propose portions
- propose nutrition values
- identify possible uncertainty

AI may not authoritatively calculate the scientific score.

The authoritative pipeline is:

```text
AI or manual MealDraft
→ user review or confirmation
→ deterministic Rust scoring

Do not merge:

recognition confidence
nutrition confidence
FII source quality
insulin-impact quality

into one unexplained percentage.

User naming and correction

The user must be able to:

rename a meal
correct components
correct portions
correct nutrition information
reject AI output
use manual entry

Changing only the meal title must not silently modify scoring inputs.

Privacy rules

Never:

use real user health data in tests
put real photographs in fixtures without explicit permission
copy production records into prompts
print or expose .env contents
commit API keys
commit signing credentials
put meal names, symptoms, notes, or images into telemetry
retain images by default without a defined purpose
treat research consent as part of general product consent

Use synthetic data in development.

Data separation

Keep separate:

operational telemetry
product-improvement analytics
private product data
cloud synchronisation data
research contribution
model-training data
identity data
consent records

Do not reuse data for another purpose merely because the user consented
to one purpose.

Cryptography rules

Do not invent cryptographic algorithms.

Do not weaken encryption to make development easier.

The target baseline is:

encrypted SQLite
platform-protected key material
selective field encryption only when justified
end-to-end encryption only through an approved design

Security-sensitive changes require independent review.

High-risk files and changes

Treat these as high risk:

scientific scoring
FII resolution
Rust FFI
database migrations
SQLCipher
key management
authentication
account recovery
consent
research export
telemetry
raw image retention
Health Connect
HealthKit
account deletion
data export
provider routing

For high-risk changes:

Plan before editing.
Identify assumptions.
Add or update tests.
Run all relevant checks.
Produce a risk summary.
Require a different agent or human to review the actual diff.
Agent workflow

Before editing:

Read the relevant documentation.
Inspect the actual implementation.
Explain current behaviour.
State whether the task affects current, migration, target, or deferred code.
List assumptions.
List files expected to change.
List tests expected to change or be added.
Identify privacy, security, and scientific risks.

During editing:

keep patches small
avoid unrelated cleanup
preserve compatibility unless removal is explicitly approved
do not suppress failing tests
do not replace documented decisions with preferences
do not access secrets unnecessarily

After editing:

Run relevant formatters.
Run relevant linters.
Run relevant unit and integration tests.
Run scientific golden fixtures when scoring is touched.
Run migration tests when persistence is touched.
Show changed files.
Explain behaviour changes.
Report unresolved risks honestly.
Do not claim completion while required checks fail.
Git rules
Do not commit directly to main.
Use one task per branch or worktree.
Only one writing agent should edit a working tree at a time.
Other agents should review committed or staged diffs.
Do not force-push protected branches.
Do not delete history.
Do not merge while required CI checks fail.
Definition of done

A task is done only when:

implementation matches the approved specification
relevant tests pass
no scientific formula was silently changed
no privacy behaviour was silently changed
no secret was exposed
migrations and exports remain valid where relevant
error paths are handled
documentation is updated
unresolved uncertainty is reported