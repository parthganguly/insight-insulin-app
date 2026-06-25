# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types, source/version labels, the narrow direct user-provided FII item-load calculation, direct-FII-only meal aggregation, and direct-FII-only acute score calculation. It does not port mixed-meal decomposition, FII mappings, fallback scoring, TDEE personalization, thresholds, confidence semantics, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
