---
description: Review a diff or task without silently rewriting it
argument-hint: "<issue, PR, commit, or review focus>"
---

Perform a read-only review of:

$ARGUMENTS

Verify the repository, branch, HEAD and status first. Read the governing contract and inspect the actual diff.

Return only:

1. verdict: APPROVE, APPROVE WITH NITS, or BLOCK;
2. up to five findings ordered by severity;
3. exact file/line or command evidence;
4. the smallest correction needed for each blocker;
5. checks that still need to run.

Do not edit, commit, push, expand scope, or produce a long provenance report. Do not invent findings merely to appear thorough.
