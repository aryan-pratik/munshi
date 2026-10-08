#!/usr/bin/env bash
# Phase 0 bootstrap — turns this docs-and-skeleton repo into a running Next.js app.
#
# Why a script instead of running create-next-app in the repo root:
# create-next-app refuses a directory that already holds README.md / CLAUDE.md / src/.
# So we scaffold into a temp dir and merge it in, never overwriting a file that is already here.
#
# Usage:  bash scripts/bootstrap.sh
# Safe to re-run: it exits early once package.json exists.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
APP_NAME="munshi"

if [ -f package.json ]; then
  echo "package.json already exists — repo is bootstrapped. Run: pnpm install && pnpm dev"
  exit 0
fi

command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required: npm i -g pnpm"; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "rsync is required"; exit 1; }

TMP="$(mktemp -d)"
DONE=0
on_exit() {
  rm -rf "$TMP"
  # A failure after the merge leaves package.json behind, and the guard above would then skip a re-run.
  if [ "$DONE" != 1 ] && [ -f package.json ]; then
    echo >&2
    echo "Bootstrap stopped before finishing. package.json now exists, so re-running would exit early." >&2
    echo "Fix the error above, then restore the committed state and retry:" >&2
    echo "  git clean -fdx -e .env.local && bash scripts/bootstrap.sh" >&2
    echo "(git clean removes every untracked file — commit or stash your own work first.)" >&2
  fi
}
trap on_exit EXIT

echo "==> 1/5 Scaffolding Next.js (App Router, TypeScript, Tailwind, src/) into a temp dir"
pnpm dlx create-next-app@latest "$TMP/$APP_NAME" \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" \
  --use-pnpm --skip-install --disable-git --no-agent-feedback --yes

echo "==> 2/5 Merging scaffold into the repo (existing files win)"
rsync -a --ignore-existing --exclude ".git" --exclude "node_modules" "$TMP/$APP_NAME/" "$ROOT/"

echo "==> 3/5 Installing dependencies"
# pnpm 11 exits non-zero (ERR_PNPM_IGNORED_BUILDS) when a dependency ships an unapproved build script —
# on every later `pnpm install` / `pnpm run` too. Nothing below needs one today, but everything is
# @latest, so record "warn, don't fail" in pnpm-workspace.yaml. The scripts still do not run; the
# typecheck + build at the end are the gate.
pnpm config set --location project strictDepBuilds false
pnpm install

echo "==> 4/5 shadcn/ui + app dependencies"
pnpm dlx shadcn@latest init --defaults --yes
pnpm dlx shadcn@latest add --yes \
  button badge card dialog sheet tabs tooltip separator scroll-area \
  slider switch skeleton sonner command dropdown-menu

pnpm add ai @ai-sdk/react zod motion zustand d3-scale d3-shape date-fns
pnpm add -D vitest @types/d3-scale @types/d3-shape

# `next typegen` first: the scaffold's layout.tsx uses the global LayoutProps<"/"> type, which only
# exists once Next has generated .next/types — a bare `tsc --noEmit` fails on a fresh checkout.
pnpm pkg set scripts.typecheck="next typegen && tsc --noEmit"
pnpm pkg set scripts.test="vitest run --passWithNoTests"
pnpm pkg set engines.node=">=22"

echo "==> 5/5 Verifying"
pnpm typecheck
pnpm build
DONE=1

cat <<'EOF'

Bootstrap complete.

  cp .env.example .env.local     # add AI_GATEWAY_API_KEY (optional — app runs scripted without it)
  pnpm dev

Next: open docs/TASKS.md and start at Phase 1.
EOF
