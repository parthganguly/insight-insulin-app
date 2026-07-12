# Decision record — Scientific validation is the current project gate

**Date:** 2026-07-13
**Context:** issue #93, following the certified comprehensive audit
(`reports/project-audit/2026-07-12-insight-comprehensive-audit.md`).
**Status:** Current phase. **Reversible** — this is a sequencing decision, not
an irreversible architecture decision.

---

## Decision

**Scientific validation is the gate for this project.** Until the scoring
model has a provenanced dataset and a documented calibration/validation
result, work that *depends on the model being worth shipping* is paused, and
work that *makes the product truthful about not being validated* is
prioritized.

Concretely, as of this record:

1. **Further Rust/native expansion is paused.** No UniFFI bindings, no Kotlin
   or Swift client, no new parity slices, no FFI seam work.
2. **The existing Rust crate remains maintained and tested.** It stays
   compiling, `cargo fmt`/`clippy`/`test` clean, and in CI. When the backend's
   documented parity contract changes, the crate follows (as it did for the
   logged-days-only trend in #93). It is not abandoned and it is not deleted.
3. **The pause is not a judgement on the Rust work.** The parity core is
   high-quality, well-tested engineering (204+ tests, zero `unwrap`/`panic` in
   non-test code, validated newtypes). The problem is *sequencing*: it hardens
   a formula set whose inputs are ten placeholder values and whose reference
   constant is flagged `TODO: calibrate` in the source. Any scientific
   correction invalidates parity work and forces dual-language edits plus
   fixture regeneration. That is a reason to wait, not a reason to regret.

## Why now

The audit established, and #93 re-verified in code, that:

- the acute score's internal reference (`REFERENCE_MEAL_INSULIN_LOAD = 30.0`)
  is uncalibrated and flagged as such in the source;
- the live FII table is **ten `starter_placeholder` rows**, none traceable to
  a measurement;
- the green/amber/red presentation bands had no empirical basis;
- the 7-day trend zero-filled unlogged days, rewarding under-logging;
- the Rust core, after ~21 parity PRs, has **no consumer** — no FFI, no native
  client, no backend call path.

Investing further in shared-core/native infrastructure ahead of any evidence
that the scoring outputs are meaningful compounds the rework risk. #93 fixed
the truth-in-presentation and safety defects; it deliberately did **not**
calibrate anything, because calibration without a real dataset would be
inventing numbers.

## What resumption requires

Rust/native expansion resumes only when **all four** hold:

1. **A real, provenanced dataset** — measured FII values with source, portion
   protocol, population, sample size, and uncertainty; no `starter_placeholder`
   row on any live path. (Plan:
   `reports/science/2026-07-12-fii-dataset-and-validation-workplan.md`.)
2. **An agreed acute calibration method** — a documented, reviewed method for
   setting the reference constant against real meal distributions, so that the
   score and any bands mean something. Not a guessed constant.
3. **Resolved chronic/trend semantics** — the logged-days-only trend (#93) is
   descriptive, and the partial-logging-within-a-logged-day limitation is
   still open. A validated chronic claim needs that resolved, not just
   disclosed.
4. **Evidence a native consumer is actually needed** — a concrete, approved
   product milestone that requires the native client, rather than migration
   momentum.

## What this does not do

- It does **not** delete, deprecate, or freeze the Rust crate.
- It does **not** reopen the approved target architecture
  (`docs/target-architecture.md` still governs the technical direction when
  work resumes).
- It does **not** authorize a dataset change, a formula change, a threshold
  change, or a stronger product claim. Each remains a separately approved,
  independently reviewed change.
- It does **not** claim the model is invalid — only that it is **unvalidated**,
  which is a different and honest statement.

## Review

Revisit this record when the four resumption conditions are met, or when a
product decision (e.g. discontinuing the insulin-demand framing per the
workplan's stop criteria) makes it moot.
