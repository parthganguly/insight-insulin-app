# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, the narrow direct user-provided FII item-load calculation, direct-FII-only meal aggregation, direct-FII-only acute score calculation, exact FII lookup and scoring, exact-FII-only meal aggregation, and the backend's conservative token-subset mapped FII item path for non-mixed foods. It does not port mapped-FII meal aggregation, broader or AI fuzzy matching, mixed-meal decomposition, fallback scoring, acute scoring for looked-up FII, TDEE personalization, thresholds, confidence aggregation, estimate-quality aggregation, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
