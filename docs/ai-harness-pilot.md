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

## Requirements

- Node.js 22 or newer in the shell that runs Pi;
- Git;
- a local checkout or worktree of this repository.

The setup installs the pinned package:

```text
@earendil-works/pi-coding-agent@0.80.10
```

No setup path stores provider credentials.

## Preferred Windows setup: MSYS2 UCRT64

Use the **MSYS2 UCRT64** environment on an ordinary x86-64 Windows PC. Do not
use CLANGARM64 unless the Windows machine itself is ARM64.

MSYS2 supports full-system upgrades only. In the UCRT64 terminal:

```bash
pacman -Syu
```

When a core update closes the terminal, reopen **MSYS2 UCRT64** and run the same
command again:

```bash
pacman -Syu
```

Install the UCRT64 Node package:

```bash
pacman -S --needed mingw-w64-ucrt-x86_64-nodejs
```

Verify that UCRT64, not an older Windows installation, owns the active command:

```bash
which node
node -v
npm -v
```

From the repository root:

```bash
./scripts/setup-pi-msys2.sh
```

The script:

- requires the `UCRT64` environment;
- verifies Node 22+;
- installs the pinned Pi package;
- records the current MSYS2 Bash executable as Pi's shell while preserving
  unrelated global Pi settings;
- resolves the correct Git exclude path for both ordinary clones and linked
  worktrees;
- locally excludes `.pi/runs/`;
- stores no provider credential.

Start Pi from the same UCRT64 repository shell:

```bash
pi
```

## Alternative Windows setup: PowerShell

PowerShell requires a Windows Node.js 22+ installation and Git Bash:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-pi-windows.ps1
```

The PowerShell installer also resolves the real worktree Git path rather than
assuming `.git` is a directory.

## First launch

Inspect the project-local files and approve project trust only for the correct
INSIGHT checkout. Then use:

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

```text
/review PR #123 against its governing issue. Do not edit.
```

For a stronger read-only process boundary:

```bash
pi --tools read,grep,find,ls
```

### `/rescue`

Diagnoses whether a failed task is a product-contract, implementation,
test-environment, harness/context, or transient CI/provider failure before
editing.

## Verification scripts

### MSYS2 UCRT64 / Bash

```bash
./scripts/ai/check.sh frontend
./scripts/ai/check.sh frontend --full
./scripts/ai/check.sh backend
./scripts/ai/check.sh rust
./scripts/ai/check.sh all --full
```

### PowerShell

```powershell
.\scripts\ai\check.ps1 -Scope frontend
.\scripts\ai\check.ps1 -Scope frontend -Full
.\scripts\ai\check.ps1 -Scope backend
.\scripts\ai\check.ps1 -Scope rust
.\scripts\ai\check.ps1 -Scope all -Full
```

The scripts fail on the first failed command and finish with
`git diff --check`.

## Evidence snapshot

MSYS2 UCRT64 / Bash:

```bash
./scripts/ai/snapshot.sh
```

PowerShell:

```powershell
.\scripts\ai\snapshot.ps1
```

This writes a timestamped local report below `.pi/runs/` containing repository,
remote, branch, HEAD, status, changed filenames, diff statistics and the
whitespace-check result. Evidence remains local unless a specific issue
authorizes curated evidence.

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

Do not build a router until at least six real tasks have been recorded. For
every task record:

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
