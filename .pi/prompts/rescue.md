---
description: Diagnose and repair a stuck implementation
argument-hint: "<failure, command output, or broken task>"
---

Rescue this failed implementation:

$ARGUMENTS

First reproduce or verify the failure. Distinguish:

- product-contract failure;
- implementation bug;
- test-environment problem;
- tool or harness problem;
- wrong repository, worktree, branch, or context;
- transient provider or CI failure.

Identify the root cause before editing. Make the narrowest coherent repair, rerun the failing check, then run the relevant regression scope.

Do not redesign the feature, rewrite unrelated code, or commit/push unless explicitly authorized. Stop and escalate when the repair needs a product, scientific, dependency, or architecture decision.
