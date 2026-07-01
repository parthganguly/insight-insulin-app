# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, provided-FII item and meal calculations, exact FII lookup and scoring, conservative token-subset mapped FII scoring for non-mixed foods, backend-parity mixed-dish decomposition, macro fallback, and terminal unknown fallback. Unified dispatch preserves the backend's two decomposition positions: provided FII, likely-mixed decomposition, exact/mapped lookup, post-lookup decomposition retry, macro fallback, then unknown fallback. Meal aggregation retains unknown items and includes their explicit `0.0` placeholders in the total; empty meals still return no estimate. Unified item results retain source, confidence, formula version, optional resolved FII, decomposition provenance, and the macro branch when applicable; meal results do not assign one aggregate source or confidence. The backend-compatible `user_confirmed` source means that a value was provided, not that the value was scientifically verified.

Mixed-dish decomposition and macro fallback are high-risk heuristic ports for implementation parity. A decomposition is not the real recipe, and its hardcoded weights are priors rather than measured ingredients. Decomposed `mapped_fii` is not exact FII. Its confidence and macro confidence values reproduce backend behavior and are not calibrated probabilities. The terminal `unknown` load of `0.0` is a product placeholder, not a claim of zero insulin demand; confidence `0.2` is not a calibrated probability, and `unknown` does not mean physiologically safe, measured FII, or personal physiology. These paths do not model validated personal physiology, and passing parity tests is not scientific validation.

Golden integration tests privately reproduce the backend validator's unweighted arithmetic mean of resolved item confidences. That helper has no core export, product API, persistence, frontend, UniFFI, or mobile surface. Its aggregate is not a calibrated probability or physiological certainty, and it does not validate unknown placeholders, fallback/decomposition heuristics, provided values, or exact/mapped FII. The crate does not expose aggregate confidence and does not port broader or AI fuzzy recipe inference, a unified acute-score API, TDEE personalization, thresholds, estimate-quality aggregation, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
