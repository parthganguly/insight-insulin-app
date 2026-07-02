# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, provided-FII item and meal calculations, exact FII lookup and scoring, conservative token-subset mapped FII scoring for non-mixed foods, backend-parity mixed-dish decomposition, macro fallback, terminal unknown fallback, and chronic DIL/DII aggregation over resolved meal outputs. Unified dispatch preserves the backend's two decomposition positions: provided FII, likely-mixed decomposition, exact/mapped lookup, post-lookup decomposition retry, macro fallback, then unknown fallback. Meal aggregation retains unknown items and includes their explicit `0.0` placeholders in the total; empty meals still return no estimate. Unified item results retain source, confidence, formula version, optional resolved FII, decomposition provenance, and the macro branch when applicable. Meal results retain every item source and derive `EstimateQuality` only from that source set using the backend's `high | medium | low | unknown` product rules; they do not assign one aggregate source or confidence. The validation-only `composite` label is not a meal estimate-quality value. The backend-compatible `user_confirmed` source means that a value was provided, not that the value was scientifically verified.

Mixed-dish decomposition and macro fallback are high-risk heuristic ports for implementation parity. A decomposition is not the real recipe, and its hardcoded weights are priors rather than measured ingredients. Decomposed `mapped_fii` is not exact FII. Its confidence and macro confidence values reproduce backend behavior and are not calibrated probabilities. The terminal `unknown` load of `0.0` is a product placeholder, not a claim of zero insulin demand; confidence `0.2` is not a calibrated probability, and `unknown` does not mean physiologically safe, measured FII, or personal physiology. These paths do not model validated personal physiology, and passing parity tests is not scientific validation.

Golden integration tests privately reproduce the backend validator's unweighted arithmetic mean of resolved item confidences. That helper has no core export, product API, persistence, frontend, UniFFI, or mobile surface. Its aggregate is not a calibrated probability or physiological certainty, and it does not validate unknown placeholders, fallback/decomposition heuristics, provided values, or exact/mapped FII. Estimate quality is likewise not calibrated uncertainty or physiological certainty. It does not validate the unknown zero placeholder, macro fallback, decomposition, or provided/exact/mapped FII; it reproduces product source-composition policy only. Implementation parity is not scientific validation.

Chronic inputs contain one explicit ISO-date row per product-parity calendar day and consume only already-resolved Rust meal load and kcal totals. Empty meal lists represent the backend's zero-filled missing days. Daily DIL sums meal insulin-load totals, daily energy sums meal kcal totals, and daily DII divides DIL by energy when energy is positive or returns `0.0` otherwise. Rolling 7-day DIL and DII are separate arithmetic means over the last `min(7, rows_seen)` rows, so the first six rows use expanding windows and missing zero rows participate. The Rust port preserves lexicographic ISO-date ordering and does not infer timezone boundaries, add 14/28-day outputs, reuse acute-score normalization, or reproduce the dashboard's `DII * 100` display transform.

DIL/DII are not diagnosis, personal insulin response, insulin-resistance measurement, glucose prediction, or insulin dosage. Chronic output does not validate macro fallback, decomposition, unknown zero placeholders, or provided/exact/mapped FII inputs. The crate does not expose aggregate confidence and does not port broader or AI fuzzy recipe inference, a unified acute-score API, TDEE personalization, thresholds, scientific claims, Python bindings, UniFFI, Android, or iOS work. Implementation parity is not scientific validation.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
