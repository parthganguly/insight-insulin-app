# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, provided-FII item and meal calculations, exact FII lookup and scoring, conservative token-subset mapped FII scoring for non-mixed foods, backend-parity mixed-dish decomposition, and macro fallback. Unified dispatch preserves the backend's two decomposition positions: provided FII, likely-mixed decomposition, exact/mapped lookup, post-lookup decomposition retry, macro fallback, then no estimate. Meal aggregation remains all-or-nothing. Unified item results retain source, confidence, formula version, optional resolved FII, decomposition provenance, and the macro branch when applicable; meal results do not assign one aggregate source or confidence. The backend-compatible `user_confirmed` source means that a value was provided, not that the value was scientifically verified.

Mixed-dish decomposition and macro fallback are high-risk heuristic ports for implementation parity. A decomposition is not the real recipe, and its hardcoded weights are priors rather than measured ingredients. Decomposed `mapped_fii` is not exact FII. Its confidence and macro confidence values reproduce backend behavior and are not calibrated probabilities. These paths do not model validated personal physiology, and passing parity tests is not scientific validation. The crate does not port broader or AI fuzzy recipe inference, unknown fallback, a unified acute-score API, TDEE personalization, thresholds, confidence aggregation, estimate-quality aggregation, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
