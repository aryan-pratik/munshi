# Munshi

An AI chief of staff for a small business. Munshi keeps one model of the business across the tools
it already uses (store, payments, ads, shipping, WhatsApp, email, books, bank, support), and each
morning says what is wrong, shows the records that prove it, prices it in rupees, and fixes it once
the owner approves. Numbers are computed by a tested engine. The model explains and drafts; it
never invents a figure.

Built for a hackathon. The demo runs on a seeded digital twin of one business (Kaveri Home, a
Jaipur home-decor brand), so nothing on stage depends on a third-party login or the venue network.

## Status

This commit is **docs, a folder skeleton and a bootstrap script. There is no app code yet.**
The build plan is `docs/TASKS.md`. One product decision is still open (consumer "Life OS" or the
business version documented here); see the Decision log at the end of `PRODUCT.md`.

Screenshots and live URL: to be added after Phase 9 of `docs/TASKS.md`.

## What it does

| Surface | Route | Question it answers |
|---|---|---|
| Today | `/` | What needs me, and what is it worth? A written briefing, then findings ranked by rupee impact, each with evidence and an action. |
| Why | `/ask` | Why did revenue fall last week? Causes shown preceding their effects on one time axis. |
| What if | `/whatif` | What happens if I raise prices 15%? Computed outcomes, and a search over about 1,800 scenarios for the best strategy. |
| Horizon | `/horizon` | What is coming in the next 30 days? Projected cash with upcoming outflows on it. |
| Vault | `/vault` | Where did this come from? Sources, raw records, the metric graph. |

From any finding, **Act** opens a plan and drafts, waits for approval, executes, and logs expected
against actual impact.

## Quick start

Requires Node 22 or newer, pnpm and rsync.

```bash
bash scripts/bootstrap.sh      # scaffolds Next.js into a temp dir and merges it in; safe to re-run
cp .env.example .env.local     # optional: add AI_GATEWAY_API_KEY
pnpm dev
```

The app runs with **no API key**. Without one, every AI surface streams scripted responses built
from the seeded data (`MUNSHI_AI_MODE=scripted`). Add `AI_GATEWAY_API_KEY` to `.env.local` and the
same surfaces call the live model. Options are documented in `.env.example`.

After bootstrap:

```bash
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest, engine only
pnpm build
```

`pnpm check` and `pnpm seed` are added in Phase 0 and Phase 1 of `docs/TASKS.md`.

## Read in this order

1. `PRODUCT.md`: what Munshi is, who it is for, what is in and out of scope, and the open decision.
2. `DESIGN.md`: the design contract. Tokens, type, layout per screen, states, motion, review gate.
3. `docs/ARCHITECTURE.md`: stack, folder map, data flow, the two AI modes, key types.
4. `docs/ENGINE.md`: metrics, detectors, the causal walk, the simulator, playbooks, tests.
5. `docs/DATA-MODEL.md`: the `World` type, sources, and the planted stories the demo depends on.
6. `docs/AI_SDK_NOTES.md`: AI SDK facts checked against the installed version, model IDs, auth, scripted mode.
7. `docs/TASKS.md`: the phased build plan with checkboxes. Work it top-down.
8. `docs/DEMO.md`: the three-minute script and what to do if something breaks.

`CLAUDE.md` is the entry point for a coding agent picking this repo up cold.

## Repo layout

```
PRODUCT.md            product record
DESIGN.md             design contract
CLAUDE.md             instructions for coding agents
README.md
.env.example          every variable is optional
.gitignore
skills-lock.json      versions of the vendored skills
docs/
  ARCHITECTURE.md  ENGINE.md  DATA-MODEL.md
  AI_SDK_NOTES.md  TASKS.md   DEMO.md
scripts/
  bootstrap.sh        Phase 0: scaffold and install
src/                  empty skeleton until bootstrap; the full map is in docs/ARCHITECTURE.md
  app/                routes and API handlers
  components/         ui (shadcn), primitives, shell, one folder per surface
  engine/             detectors, graph, simulator, playbooks (pure TypeScript)
  data/               seed world, rules, scripted AI streams
  lib/                ai (agents, tools, mode), store
  types/
tests/engine/         vitest
public/samples/
.agents/skills/       vendored design skills (see below)
.claude/skills/       symlinks to .agents/skills for Claude Code
```

## Vendored design skills

Four agent skills are committed under `.agents/skills/` so a fresh machine has them without
installing anything. `.claude/skills/` holds symlinks to them.

| Skill | Source | Used for |
|---|---|---|
| `impeccable` | pbakaus/impeccable | App screens (Operate mode) and its craft floor; `critique`, `polish`, `audit` per screen |
| `frontend-design` | anthropics/skills | Design process and UX copy |
| `emil-design-eng` | emilkowalski/skills | Motion and interaction detail |
| `design-taste-frontend` | leonxlnx/taste-skill | Landing or pitch page only, and as a cross-check of banned defaults |

The final review before shipping uses the
[Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
Precedence and settled conflicts are in `CLAUDE.md` and `DESIGN.md`.

## Demo

Three minutes, five beats, clicked not typed, in scripted mode: `docs/DEMO.md`.
