#!/usr/bin/env bash
set -euo pipefail

PI_VERSION="0.80.10"
MIN_NODE_MAJOR=22

if [[ "${MSYSTEM:-}" != "UCRT64" ]]; then
  echo "Run this script from the MSYS2 UCRT64 terminal, not PowerShell, MSYS, MINGW64, CLANG64, or CLANGARM64." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Git is not installed in this MSYS2 UCRT64 environment.

Install the native UCRT64 Git package:
  pacman -S --needed mingw-w64-ucrt-x86_64-git

Verify:
  which git
  git --version

Then return to the INSIGHT worktree, pull the latest harness branch, and rerun:
  bash scripts/setup-pi-msys2.sh
EOF
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Run this script from a Git checkout of INSIGHT." >&2
  exit 1
fi
cd "$repo_root"

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
fi

if (( node_major < MIN_NODE_MAJOR )); then
  cat >&2 <<'EOF'
Pi needs Node.js 22 or newer inside MSYS2 UCRT64.

Update MSYS2 first:
  pacman -Syu

If MSYS2 closes the terminal, reopen "MSYS2 UCRT64" and run:
  pacman -Syu

Then install the UCRT64 Node package:
  pacman -S --needed mingw-w64-ucrt-x86_64-nodejs

Verify:
  which node
  node -v
  npm -v

Then rerun:
  bash scripts/setup-pi-msys2.sh
EOF
  exit 1
fi

printf 'Installing @earendil-works/pi-coding-agent@%s...\n' "$PI_VERSION"
npm install -g --ignore-scripts "@earendil-works/pi-coding-agent@$PI_VERSION"

config_dir="$HOME/.pi/agent"
settings_path="$config_dir/settings.json"
mkdir -p "$config_dir"

bash_windows="$(cygpath -w "$(command -v bash)")"
node - "$settings_path" "$bash_windows" <<'NODE'
const fs = require('node:fs');
const [settingsPath, shellPath] = process.argv.slice(2);
let settings = {};
try {
  if (fs.existsSync(settingsPath)) {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) settings = parsed;
  }
} catch (error) {
  console.error(`Could not parse existing Pi settings at ${settingsPath}: ${error.message}`);
  process.exit(1);
}
settings.shellPath = shellPath;
fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
NODE

exclude_path="$(git rev-parse --git-path info/exclude)"
mkdir -p "$(dirname "$exclude_path")"
touch "$exclude_path"
if ! grep -qxF '.pi/runs/' "$exclude_path"; then
  printf '\n.pi/runs/\n' >> "$exclude_path"
fi

printf '\nPi installed: '
pi --version
printf 'Node: '
node -v
printf 'Git: '
git --version
printf 'Git Bash: %s\n' "$bash_windows"
printf 'Repository: %s\n\n' "$repo_root"
printf 'Next:\n  pi\n  /login\n\n'
printf 'Approve project trust only for this repository. Never store API keys in the repository.\n'
