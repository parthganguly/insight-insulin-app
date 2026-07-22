#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
stamp="$(date +%Y%m%d-%H%M%S)"
output_dir="$repo_root/.pi/runs/$stamp"
output_file="$output_dir/evidence.md"
mkdir -p "$output_dir"
cd "$repo_root"

{
  printf '# Agent evidence snapshot\n\n'
  printf -- '- Created: %s\n' "$(date -Iseconds)"
  printf -- '- Repository: %s\n' "$repo_root"
  printf -- '- Branch: %s\n' "$(git branch --show-current)"
  printf -- '- HEAD: %s\n\n' "$(git rev-parse HEAD)"

  printf '## Remote\n\n```text\n'
  git remote -v
  printf '```\n\n'

  printf '## Status\n\n```text\n'
  git status --short
  printf '```\n\n'

  printf '## Changed files\n\n```text\n'
  git diff --name-only
  printf '```\n\n'

  printf '## Diff stat\n\n```text\n'
  git diff --stat
  printf '```\n\n'

  printf '## Diff check\n\n```text\n'
  git diff --check || true
  printf '```\n'
} > "$output_file"

printf '%s\n' "$output_file"
