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

## Supported Windows architecture

For this repository, the long-term Windows layout is:

```text
PowerShell / Windows Terminal
  -> native Windows Node.js 22+
  -> native Windows Pi CLI
  -> Pi bash tool uses MSYS2 or Git Bash through shellPath
```

This matches Pi's documented Windows model: Pi itself is installed with npm,
while a Bash executable is configured or discovered for shell commands.

Running the entire Pi process inside MSYS2 UCRT64 is a valid smoke-test and
recovery path, but it is not the preferred long-term host for INSIGHT because it
creates a second Node/npm/Git/home-directory environment and adds path friction
for Android, PowerShell, Gradle, ADB and other Windows-native tooling.

## Requirements

- native Windows Node.js 22 or newer in the PowerShell session that launches Pi;
- Windows Git available to the repository;
- MSYS2 Bash or Git Bash;
- a local checkout or worktree of this repository.

The setup installs the pinned package:

```text
@earendil-works/pi-coding-agent@0.80.10
```

No setup path stores provider credentials.

## Preferred setup: native Windows Pi with MSYS2 Bash

Install the current Windows x64 LTS release from the official Node.js download
page. Close PowerShell completely after installation, open a new PowerShell
window, and verify:

```powershell
node -v
npm -v
where.exe node
```

Node must be version 22 or newer. A Node binary under `C:\Program Files\nodejs`
or another deliberate native Windows installation is expected. The Node binary
inside `/ucrt64/bin` is not the host used by this path.

From the repository root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-pi-windows.ps1
```

The script:

- verifies native Windows Node 22+;
- installs the pinned Pi package with native Windows npm;
- prefers `C:\msys64\usr\bin\bash.exe` when MSYS2 is installed;
- otherwise accepts Git Bash;
- records the selected Bash executable in Pi's global `shellPath` setting;
- preserves unrelated global Pi settings;
- resolves the correct Git exclude path for clones and linked worktrees;
- locally excludes `.pi/runs/`;
- stores no provider credential.

Start Pi from PowerShell or Windows Terminal in the repository worktree:

```powershell
pi
```

## Optional MSYS2-hosted smoke path

The existing UCRT64 installer remains available for diagnosis or a temporary
smoke test:

```bash
bash scripts/setup-pi-msys2.sh
```

This installs a separate Pi instance into the UCRT64 npm environment. Do not
keep both installations as interchangeable daily entrypoints: their global npm
packages, `HOME`, credentials and session directories can differ.

After the native Windows installation is verified, remove the temporary UCRT64
Pi from an MSYS2 UCRT64 terminal:

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

The UCRT64 Node and Git packages may remain installed because MSYS2 is still the
Bash/tooling backend.

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

```text
/implement Issue #123. Change only the two files authorized by the issue. Do not commit.
```

### `/review`

Read-only review with a fixed verdict and at most five findings.

```text
/review PR #123 against its governing issue. Do not edit.
```

For a stronger read-only process boundary:

```powershell
pi --tools read,grep,find,ls
```

### `/rescue`

Diagnoses whether a failed task is a product-contract, implementation,
test-environment, harness/context, or transient CI/provider failure before
editing.

## Verification scripts

### PowerShell

```powershell
.\scripts\ai\check.ps1 -Scope frontend
.\scripts\ai\check.ps1 -Scope frontend -Full
.\scripts\ai\check.ps1 -Scope backend
.\scripts\ai\check.ps1 -Scope rust
.\scripts\ai\check.ps1 -Scope all -Full
```

### Bash

```bash
bash scripts/ai/check.sh frontend
bash scripts/ai/check.sh frontend --full
bash scripts/ai/check.sh backend
bash scripts/ai/check.sh rust
bash scripts/ai/check.sh all --full
```

The scripts fail on the first failed command and finish with
`git diff --check`.

## Evidence snapshot

PowerShell:

```powershell
.\scripts\ai\snapshot.ps1
```

Bash:

```bash
bash scripts/ai/snapshot.sh
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
