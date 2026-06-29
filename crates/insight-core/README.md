# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, provided-FII item and meal calculations, exact FII lookup and scoring, conservative token-subset mapped FII scoring for non-mixed foods, and isolated non-mixed macro fallback. Unified dispatch is provided FII, exact FII, mapped FII, then macro fallback; meal aggregation remains all-or-nothing. Unified item results retain source, confidence, formula version, optional resolved FII, and the macro branch when applicable; meal results do not assign one aggregate source or confidence. The backend-compatible `user_confirmed` source means that a value was provided, not that the value was scientifically verified.

Macro fallback is a high-risk heuristic port for implementation parity. It is not measured FII, is not equivalent to provided, exact, or mapped FII, and does not model validated personal physiology. Its confidence values reproduce backend behavior and are not calibrated probabilities. Passing parity tests is not scientific validation. The crate does not port broader or AI fuzzy matching, mixed-meal decomposition, unknown fallback, a unified acute-score API, TDEE personalization, thresholds, confidence aggregation, estimate-quality aggregation, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
