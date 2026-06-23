# insight-core

Initial Rust domain skeleton for INSIGHT deterministic scoring work.

This crate currently defines validated value types and source/version labels only. It does not port scoring formulas, FII mappings, thresholds, confidence semantics, scientific claims, Python bindings, UniFFI, Android, or iOS work.

## Checks

Run from the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Tests use synthetic values only.
