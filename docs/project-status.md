# INSIGHT: where we are and what happens next

**Next engineering action:** reproduce the portion/unit inconsistency in
[issue #134](https://github.com/parthganguly/insight-insulin-app/issues/134)
on the exact current source, using synthetic inputs and no saved meals.
Confirm the behavior before proposing a protected scoring change.

**Checkpoint:** 2026-09-12. Remote source reviewed:
`56e218be6ef3386de473754e9f49ac4680ca7d45`.
This is a dated status/navigation document, not a new architecture decision,
scientific approval, release approval, or a claim that tests were rerun today.
The authorities in [AGENTS.md](../AGENTS.md) still govern.

## What has already been built

INSIGHT is more than its latest camera experiment. Its merged work includes
a mobile meal journal, capture/manual entry/reuse, user correction,
backend-owned estimates, optional saving, history, appearance and test coverage.

The consumer journey (Campaign A, #95) was followed by consequential correction
(B1, #100) and the Porcelain Journal programme. J1-J6 established the visual
system and main screens; J7 added evidence-safe result interpretation. B2
separated calculation from saving; J8 refined the unsaved result; B2-3 recorded
physical-device acceptance; #132 completed Settings identity and appearance.
These are merged milestones, not fresh certifications that every behavior is
defect-free.

Sources: [Campaign B contract](product/ux/insight-ux-campaign-b.md),
[design history](../reports/ux/premium-redesign/fable-discovery/final-direction.md),
[merged history at the checkpoint](https://github.com/parthganguly/insight-insulin-app/commits/56e218be6ef3386de473754e9f49ac4680ca7d45/).
Older comparative-scale and verdict-band proposals are not the implemented
J7 result contract. Historical documents must retain their dates and scope.

## Three different things must work

**The app** lets someone describe food, correct it, see an estimate and decide
whether to keep it. This has substantial implementation behind it.

**Recognition** proposes what is in the photo. Its output is editable input,
not scientific truth. The inspected remote implementation still uses
GPT-4.1 with the earlier extraction prompt.

**The calculation and evidence** turn confirmed inputs into a relative
insulin-demand estimate. The live food table still has ten
`starter_placeholder` rows, and the reference constant remains uncalibrated.
A better photograph interpretation does not validate that model.

Sources: [routes](../frontend/src/App.tsx),
[recognition](../backend/services.py),
[shared preview/save modeling](../backend/api/meals.py),
[food table](../backend/fii_foods.csv),
[scientific workplan](../reports/science/2026-07-12-fii-dataset-and-validation-workplan.md).

## Current implementation versus approved future

| Area | Status at the reviewed source |
|---|---|
| Mobile client | Ionic React / Capacitor is the working implementation. |
| Application scoring | Python / FastAPI calls `model_meal` and `scoring_service`. |
| Rust | A substantial compatibility/migration core exists. It has its own tests but is not the application's runtime scorer. |
| Native clients and encrypted local-first storage | Approved target, not a completed migration. Native/FFI expansion remains paused by the scientific-validation gate. |
| Deployment and research | Controlled single-user prototype; public multi-user deployment and separately consented research infrastructure are not established. |

Sources: [Rust core](../crates/insight-core/README.md),
[target architecture](target-architecture.md),
[13 July validation gate](decisions/2026-07-13-validation-gate.md),
[beta topology](private-beta-topology.md).

The Rust work is preserved, not discarded. Matching Python proves
implementation parity; it does not independently prove the science.

## Later local work: reported, not merged proof

Owner-supplied reports identify J9 branch `codex/j9-hardening-final` at
`f1db1b7798927bb75a5378f08543e23a4e34385a`, with device/lifecycle/accessibility
hardening. That commit could not be resolved through the GitHub connection
used for this checkpoint. Do not call it merged, missing, or release-ready
on that basis. Inspect/export its exact local source and evidence first.
Do not reset or overwrite that work to make it match remote main.

The owner also supplied external Fireworks/GLM reports: the baseline failed
the stated recognition floor (C/C/B/B/C), and one bounded development candidate
failed its improvement criteria (D/C/A/E/C). The provider/schema contract
worked in those runs. A narrow numeric screen detected a known contradiction
but did not repair recognition. These are reported results, not reruns or
integrations in this documentation change; raw packages remain outside this
repository. No replacement model is selected here. The five repeatedly used
photos are development cases, not untouched generalization evidence.

## What still needs proof

1. **Input consistency.** The macro-fallback expressions use nutrient fields
   without the quantity scaling used for meal totals. Equivalent-intake inputs
   imply different loads. #134 records the source-derived example and requires
   an isolated API reproduction; no fix is claimed.
2. **Scientific evidence.** Dataset provenance, partial decomposition coverage,
   calibration, fallback validity and incomplete logging remain separate
   questions. #97's missing-energy status did not resolve all of them.
3. **End-to-end usefulness.** Future evaluation must distinguish raw provider
   output, frontend normalization, user correction and final scoring inputs.
   Measure actual review burden and use independent evaluation data; valid
   JSON or internally coherent arithmetic is not sufficient.

## Proposed work order

**Now:** capture exact local/remote source identity and reproduce #134.

**Then:** agree and implement any necessary unit-contract correction under
normal review, and execute the existing provenanced-data workplan. Dataset
research can proceed independently of camera selection.

**Later:** resume a controlled recognition comparison and user-workflow testing
on stable input semantics. Native/FFI expansion and public release remain
subject to existing gates, not to a successful demonstration.

Do not change formulas, thresholds, mappings, historical results or protected
copy as documentation cleanup. A scoring correction needs reviewed scope,
before/after evidence and a versioning decision. Keep failed experiments and
old decisions; remove stale instructions from the active reading path rather
than deleting the record of why the project changed direction. This page
is not authorization for another provider experiment, deployment or migration.
