# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, provided-FII item and meal calculations, exact FII lookup and scoring, conservative token-subset mapped FII scoring for non-mixed foods, and all-or-nothing unified meal aggregation with the dispatch order provided FII, exact FII, then mapped FII. Unified item results retain the resolved FII value, source, confidence, and formula version; meal results do not assign one aggregate source or confidence. The backend-compatible `user_confirmed` source means that a value was provided, not that the value was scientifically verified. The crate does not port broader or AI fuzzy matching, mixed-meal decomposition, macro or unknown fallback, a unified acute-score API, TDEE personalization, thresholds, confidence aggregation, estimate-quality aggregation, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
