#!/usr/bin/env bash
set -euo pipefail

scope="${1:-frontend}"
full="${2:-}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run() {
  local dir="$1"
  shift
  printf '\n[%s] %q' "$dir" "$1"
  shift || true
  printf ' %q' "$@"
  printf '\n'
  (cd "$dir" && "$@")
}

case "$scope" in
  frontend|backend|rust|all) ;;
  *) echo "Usage: $0 {frontend|backend|rust|all} [--full]" >&2; exit 2 ;;
esac

if [[ "$scope" == "frontend" || "$scope" == "all" ]]; then
  run "$repo_root/frontend" npm run lint
  run "$repo_root/frontend" npx tsc --noEmit
  run "$repo_root/frontend" npm run test.unit -- --run
  run "$repo_root/frontend" npm run build
  if [[ "$full" == "--full" ]]; then
    run "$repo_root/frontend" npx cypress run
  fi
fi

if [[ "$scope" == "backend" || "$scope" == "all" ]]; then
  run "$repo_root/backend" python -m unittest discover -s tests -v
  run "$repo_root/backend" python -m validation.run_validation
  run "$repo_root/backend" python -m validation.export_golden_fixtures --check
fi

if [[ "$scope" == "rust" || "$scope" == "all" ]]; then
  run "$repo_root" cargo fmt --all -- --check
  run "$repo_root" cargo clippy --workspace --all-targets -- -D warnings
  run "$repo_root" cargo test --workspace
fi

run "$repo_root" git diff --check
printf '\nChecks passed for scope: %s\n' "$scope"
