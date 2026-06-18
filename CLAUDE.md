@AGENTS.md

# Claude Code-Specific Instructions

## Authority

- `docs/migration-plan.md` is the authoritative current migration plan.
- `docs/claude-migration-review.md` is historical review evidence.
- Where the review and revised migration plan differ, the migration plan governs.
- Read only the scientific and architectural documents relevant to the current task.

## Cost discipline

- Default to one agent working on one narrowly scoped task.
- Do not use workflows, agent teams, subagents, parallel agents, or background agents unless the user explicitly approves them.
- Before proposing any multi-agent execution, state:
  - why one agent is insufficient
  - how many agents would run
  - which model each would use
  - what concrete improvement is expected
- Do not switch to Opus or another higher-cost model without explicit approval.
- Reuse existing repository audits and reviews. Do not repeat work already completed by Codex or documented in the repository.
- Avoid broad repository exploration when the relevant files are already identified.

## Execution discipline

- Do not run `/init`; this file is maintained manually.
- Do not install or execute skills, hooks, plugins, MCP servers, or external scripts without explicit approval and source review.
- Do not commit, push, open a pull request, merge, or change branches unless explicitly asked.
- Use plan mode before changes involving scientific scoring, privacy, encryption, consent, persistence, migrations, or FFI.
- Keep routine documentation and low-risk code tasks narrow.
- Before editing, list the exact files and checks involved.
- After editing, show:
  - changed files
  - `git status`
  - relevant diff
  - formatter, linter, build, and test results
  - unresolved risks

## Scientific and privacy boundary

- Never modify formulas, mappings, coefficients, thresholds, datasets, confidence semantics, or scientific claims as part of an architectural migration.
- Never equate implementation parity with scientific validation.
- Never use real user health data, meal photographs, production records, credentials, or secrets.
- Follow every protected-area and high-risk-change rule in `AGENTS.md`.
