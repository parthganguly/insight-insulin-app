# INSIGHT Pi harness pilot

Status: experimental implementation-agent harness for issue #112.

This pilot is intentionally small. It is designed to improve task framing,
repository safety, repeatable verification, and evidence collection before the
project invests in automatic routing, subagents, or a larger orchestration
system.

## What this is

Pi is a programmable terminal coding harness. In this repository it loads:

- the existing root `AGENTS.md`;
- `.pi/APPEND_SYSTEM.md`;
- project-local prompt templates;
- the project-local safety extension.

The harness does not override INSIGHT's existing architecture, scientific,
privacy, review, or Git rules.

## What this is not

- not a replacement for native Codex;
- not a replacement for native Claude Code;
- not an automatic model router;
- not a security sandbox;
- not permission to change scientific or product semantics;
- not permission to commit, push, create PRs, or merge autonomously.

Pi extensions execute with the user's local permissions after project trust is
granted. Review `.pi/extensions/safety-gate.ts` before trusting the project.
The gate blocks common accidents; it does not provide OS-level isolation.

## Windows setup

Requirements:

- Node.js 22 or newer;
- Git for Windows, including Git Bash;
- a clean local checkout of this repository.

From the repository root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-pi-windows.ps1
```

The script installs the pinned package:

```text
@earendil-works/pi-coding-agent@0.80.10
```

It also:

- records Git Bash as Pi's shell in the user's global Pi settings;
- preserves unrelated global Pi settings;
- adds `.pi/runs/` to local `.git/info/exclude`;
- stores no provider credential.

Start Pi from the repository root:

```powershell
pi
```

On first launch, inspect the project-local files and approve project trust only
for the correct INSIGHT checkout. Then use:

```text
/login
/model
```

Never paste credentials into tracked files, task prompts, evidence reports, or
GitHub issues.

## Commands

### `/implement`

Bounded implementation loop:

- verifies repository, branch, HEAD, status, and task source;
- requires an explicit file boundary and checks;
- stops on product/scientific judgment or scope expansion;
- runs focused checks and then the shared check script;
- creates an untracked evidence snapshot.

Example:

```text
/implement Issue #123. Change only the two files authorized by the issue. Do not commit.
```

### `/review`

Read-only review with a fixed verdict and at most five findings.

Example:

```text
/review PR #123 against its governing issue. Do not edit.
```

For a stronger read-only process boundary, start Pi with only read tools:

```powershell
pi --tools read,grep,find,ls
```

### `/rescue`

Diagnoses whether a failed task is a product-contract, implementation,
test-environment, harness/context, or transient CI/provider failure before
editing.

## Verification scripts

Frontend:

```powershell
.\scripts\ai\check.ps1 -Scope frontend
```

Frontend including Cypress:

```powershell
.\scripts\ai\check.ps1 -Scope frontend -Full
```

Backend or Rust:

```powershell
.\scripts\ai\check.ps1 -Scope backend
.\scripts\ai\check.ps1 -Scope rust
```

All checks:

```powershell
.\scripts\ai\check.ps1 -Scope all -Full
```

The scripts fail immediately on the first failed command and finish with
`git diff --check`.

## Evidence snapshot

```powershell
.\scripts\ai\snapshot.ps1
```

This writes a timestamped local report below `.pi/runs/` containing:

- repository and remote;
- branch and HEAD;
- working-tree status;
- changed filenames;
- diff statistics;
- whitespace-check result.

The setup script excludes `.pi/runs/` locally. Evidence is not committed unless
a specific issue explicitly authorizes curated evidence.

## Initial routing law

Route manually before automating:

- Sol in native Codex: difficult architecture, broad debugging, rescue, and
  high-risk cross-file engineering;
- Claude models in native Claude Code: product/design judgment and native
  Anthropic comparison;
- Pi: OpenRouter/Kimi and other interchangeable implementation models, bounded
  low- or medium-risk work, and harness experiments.

Do not proxy a model through Pi merely to declare that Pi improved it. Compare
against the model's native harness when that comparison matters.

## When automatic routing may begin

Do not build a router until at least six real tasks have been recorded.
For every task record:

- task class;
- model and harness;
- pass/fail;
- time to green;
- human interventions;
- retries;
- cost where available;
- changed files;
- defects found during review.

Automatic routing without this evidence would encode preferences and marketing
claims rather than observed performance.

## Escalation

Escalate to a stronger model or human when:

- the same implementation fails twice;
- root cause remains unclear;
- the task crosses frontend/backend/Rust boundaries;
- persistence, migrations, scientific semantics, safety copy, privacy,
  security, release identity, or CI architecture are involved.

A stronger model does not compensate for the wrong repository, contaminated
context, unclear issue, missing acceptance criteria, or absent verification.

## First pilot task

Start with a read-only review or a small reversible implementation. Do not use:

- PR #106's merge gate;
- a scientific change;
- a database migration;
- a security or release-identity task;
- a broad repository audit.

Issue #112 tracks this harness pilot. Issue #111 remains the design/frontend
roadmap and is not modified by this experiment.
