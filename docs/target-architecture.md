INSIGHT Target Architecture

## Status

This document records an approved architecture decision.

Coding agents may analyse, implement, review, and test this architecture.
They may not independently replace it with another framework or stack.

This document describes the target architecture.

The repository's current Ionic React, Capacitor, TypeScript, FastAPI,
Python, and SQLite implementation remains the behavioural reference
during migration. It is not evidence that the current implementation
is the permanent architecture.

---

## Product posture

INSIGHT is currently a population-level, physiology-informed estimator
of meal insulin demand.

It is not:

- a direct measurement of insulin
- a glucose predictor
- an insulin-dose calculator
- a diagnosis system
- a replacement for clinical testing

The application may also support separately consented research and
model-improvement activities.

The consumer product and research system must remain logically and
operationally separate.

---

## Architectural principles

1. Scientific scoring must have one authoritative implementation.
2. AI proposes meal structure; AI does not authoritatively calculate scores.
3. The user reviews or confirms the meal before authoritative scoring.
4. Local operation must remain possible.
5. Cloud AI and cloud sync must remain optional.
6. Sensitive data collection must be purpose-limited.
7. Research participation must be explicit, granular, and revocable.
8. Migration must be incremental and reversible.
9. Existing working behaviour must be preserved until native replacements
   pass agreed parity tests.
10. Technology choices must support long-term maintenance without depending
    on one AI vendor.

---

## Target mobile clients

### Android

Use:

- Kotlin
- Jetpack Compose
- Android platform APIs directly
- Android Keystore for cryptographic key protection
- Health Connect only when a defined product feature requires it

Android is the first native client to be implemented.

### iOS

Use:

- Swift
- SwiftUI
- Apple platform APIs directly
- Apple Keychain and platform data-protection facilities
- HealthKit only when a defined product feature requires it

The iOS client is deferred until supported Apple development hardware
is available.

### Excluded mobile frameworks

The target application does not use:

- React Native
- Flutter
- Kotlin Multiplatform UI
- Rust UI frameworks
- a permanent WebView-first architecture

The existing Ionic/Capacitor application remains a behavioural and UX
reference during migration.

---

## Shared scientific and domain core

Use Rust for the shared deterministic core.

The Rust core will eventually own:

- units and quantities
- validated food and meal domain types
- FII value representation
- FII resolution results
- item insulin-load calculations
- meal aggregation
- acute score calculation
- daily DIL calculation
- daily DII calculation
- rolling chronic trends
- estimate-quality rules
- scientific provenance
- formula versions
- dataset versions
- deterministic serialization
- input validation
- export-safe domain representations

Rust is selected for:

- one implementation shared across platforms
- strong type safety
- reproducibility
- auditability
- deterministic behaviour
- prevention of frontend/backend scoring divergence

Rust does not make incorrect scientific assumptions correct.

Scientific accuracy remains dependent on:

- evidence quality
- FII dataset quality
- food identification
- portion estimation
- nutrition estimation
- calibration
- validation

---

## Foreign-function interface

Use UniFFI to expose the Rust core to:

- Kotlin
- Swift
- Python where useful

The FFI boundary should use stable domain-transfer objects rather than
exposing internal Rust implementation details.

The initial FFI surface should remain small.

Candidate initial operations:

- validate a meal draft
- resolve scoring inputs
- calculate an item insulin load
- calculate a meal score
- calculate daily DIL and DII
- calculate rolling trends
- return provenance and estimate-quality information

---

## Local persistence

Use:

- SQLite as the local database
- SQLCipher or an equivalent audited encrypted SQLite implementation
- Android Keystore-backed or wrapped key material
- Apple Keychain-backed or wrapped key material

Do not invent custom cryptographic algorithms.

Whole-database encryption is the default baseline.

Selective field-level encryption may be added only for data classes
that require stronger separation, such as:

- free-text health notes
- research identity links
- highly sensitive symptoms
- end-to-end encrypted sync payloads

---

## Data classes

At minimum, the architecture must distinguish:

1. Product account data
2. Meal records
3. Raw meal photographs
4. Corrected food annotations
5. Body measurements
6. Mood, focus, cravings, and symptom data
7. CGM or medical data
8. Operational telemetry
9. Product-improvement analytics
10. Research contributions
11. Consent records
12. Model, formula, and dataset provenance

These classes must not automatically share the same retention,
encryption, consent, or export behaviour.

---

## Image handling

Raw meal images are temporary by default.

Normal flow:

1. User captures or selects an image.
2. Local preprocessing removes unnecessary metadata where possible.
3. The image may be sent to an approved recognition provider when the
   user has selected cloud-assisted recognition.
4. The provider returns a structured MealDraft.
5. The user reviews or corrects the draft.
6. The confirmed structured meal is scored by the Rust core.
7. The raw image is deleted unless the user has separately consented to
   retention or research contribution.

Image retention and research use require separate consent.

---

## AI provider layer

Meal recognition must be provider-neutral.

Define an abstraction equivalent to:

```text
MealRecognitionProvider
├── CloudProvider
├── SelfHostedProvider
├── OnDeviceProvider
├── BarcodeProvider
└── ManualEntryProvider

All recognition providers must return a versioned structured result.

Conceptual contract:

MealDraft
FoodCandidate[]
PortionEstimate
NutritionEstimate
RecognitionEvidence
Uncertainty
Provider
ModelVersion

Provider-specific data must not leak into the scientific scoring core.

The application may use whichever provider performs best on the
approved evaluation set, subject to user privacy choices.

Accuracy architecture

Accuracy must be evaluated separately for:

Dish identification
Component identification
Portion estimation
Nutrition estimation
FII mapping
Final downstream score error

One generic confidence percentage must not represent all six.

The user interface must keep separate:

dish-name or recognition uncertainty
nutrition-estimation uncertainty
FII/source quality
insulin-impact estimate quality

AI confidence is not equivalent to scientific confidence.

Human confirmation boundary

The authoritative pipeline is:

image or manual input
        ↓
AI-generated or manually created MealDraft
        ↓
user review and correction
        ↓
confirmed structured meal
        ↓
Rust scientific core
        ↓
versioned insulin-demand estimate

The meal name may be freely edited by the user.

A corrected name must not silently alter nutrition or scoring inputs
unless the user confirms the resulting component changes.

Backend during migration

Retain FastAPI and Python where they remain appropriate.

Python/FastAPI should initially continue to own:

AI-provider gateway
model experimentation
research pipelines
evaluation tooling
optional sync APIs
administrative data processes
current compatibility endpoints

Do not rewrite functioning Python services in Rust merely for language
uniformity.

Rust may later own domain validation or sync services when a concrete
benefit has been demonstrated.

Cloud persistence

Do not introduce cloud accounts or cloud sync until required by an
approved product milestone.

When cloud sync is introduced, PostgreSQL is the preferred primary
server database for:

accounts
devices
synchronisation state
consent records
provenance
optional encrypted user backups
research-participation metadata

Private product sync and research contribution must use distinct
logical data flows.

Research system

Research participation is optional and separate from ordinary product use.

Research architecture must support:

versioned consent
granular consent categories
pseudonymous participant identifiers
withdrawal
deletion where applicable
separation of direct identifiers
dataset provenance
model provenance
formula provenance
immutable experiment records
reproducible dataset snapshots

A user must be able to use the core product without contributing
research data.

Current implementation

The repository currently contains an Ionic React and Capacitor client
and a FastAPI/Python backend.

The current implementation provides valuable behavioural references,
including:

meal capture
meal recognition
meal review and correction
meal persistence
current FII resolution
acute scoring
chronic metrics
estimate-quality concepts
frontend presentation patterns

The current implementation must remain runnable while native
replacement work proceeds.

Migration strategy

Migration is incremental.

Phase 0 — Documentation and behavioural baseline
preserve current source
identify authoritative scientific documents
create locked scoring fixtures
create representative meal-recognition fixtures
record current API contracts
record expected UI behaviour
establish CI
Phase 1 — Rust scientific core
create a Rust workspace
implement domain value types
port deterministic scoring logic
add formula and dataset versioning
reproduce or deliberately correct existing fixtures
document every output difference
Phase 2 — Compatibility integration
expose the Rust core through Python or WebAssembly where useful
compare current backend results with Rust results
retain the current Ionic client
do not remove existing scoring until parity is proven
Phase 3 — Native Android client
create Kotlin/Compose application
integrate the Rust core through UniFFI
add encrypted local storage
implement meal logging and review
integrate Android camera APIs
preserve manual entry and correction
validate behaviour against the existing client
Phase 4 — Optional sync and cloud services
add accounts only when required
add PostgreSQL-backed sync
keep local-first operation
implement export and deletion
maintain separate research-consent flows
Phase 5 — Native iOS client
create SwiftUI application
integrate the same Rust core
use Keychain-backed key protection
validate parity with Android and locked scientific fixtures
Phase 6 — Retire legacy client

The Ionic/Capacitor client may be retired only after:

native feature parity
successful data migration
scoring parity
export validation
privacy validation
acceptance tests
documented rollback path
Non-goals for the first migration milestone

Do not initially:

rewrite the entire backend
add Kubernetes
create microservices
add cloud accounts
add provider-specific AI logic to the core
train a custom vision model
implement CGM personalisation
implement medical diagnosis
implement insulin dosing
delete the existing client
create an iOS application before Android foundations are stable
Definition of architectural success

The target architecture is successful when:

one versioned Rust implementation owns scientific scoring
Android and iOS consume the same scientific core
AI providers are replaceable
users can review AI output before scoring
local data is encrypted
cloud use remains optional
research contribution remains separately consented
every score can report its formula, dataset, and evidence provenance
the current consumer-wellness boundary remains explicit

This preserves the project’s scientifically defensible status as an estimator rather than an individual diagnostic system. :contentReference[oaicite:0]{index=0} It also records the full native + Rust + encrypted local-first architecture we settled on. :contentReference[oaicite:1]{index=1}
