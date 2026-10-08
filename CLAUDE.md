# Munshi

Munshi is an AI chief of staff for an Indian small business: it finds what is wrong, proves it
with source records, prices it in rupees, and acts once the owner approves. It is a hackathon
build whose demo runs on a seeded digital twin of one business, with no network and no API key.

## Current state

Phase 0 is done: Next.js scaffold, tokens, fonts, root layout, `pnpm check`. See `docs/TASKS.md`
for where the build is.

- `scripts/bootstrap.sh` is only for a repo with no `package.json`. It stops at `shadcn init` when
  `ui.shadcn.com` is unreachable (it was, from the build environment). **UI components are
  therefore hand-written** in `src/components/ui`, in the shadcn style, on `@base-ui/react`, themed
  through the `DESIGN.md` tokens. Do not run the shadcn CLI over them; add new ones the same way.
- The product decision is made: build the business version (Kaveri Home) as `PRODUCT.md`
  documents. The owner's cloud goal states it is confirmed; do not stop to ask. The Decision log
  at the end of `PRODUCT.md` records it and what switching to the consumer "Life OS" would cost.

## Read these, in this order, before writing code

1. `PRODUCT.md`: what it is, who it is for, scope, the product decision
2. `DESIGN.md`: the design contract
3. `docs/ARCHITECTURE.md`: stack, folder map, data flow, the two AI modes, key types
4. `docs/ENGINE.md`: metrics, detectors, causal walk, simulator, playbooks, tests
5. `docs/DATA-MODEL.md`: the `World`, sources, the planted stories
6. `docs/AI_SDK_NOTES.md`: AI SDK API names checked against the installed version, model IDs, auth, scripted mode
7. `docs/TASKS.md`: the build plan
8. `docs/DEMO.md`: the three-minute script the build must serve

Then work `docs/TASKS.md` top-down. Tick the boxes as you go. Commit once per phase. After
bootstrap, the rest of Phase 0 in `docs/TASKS.md` is mandatory before Phase 1.

## Commands

```bash
pnpm dev          # run the app
pnpm typecheck    # next typegen && tsc --noEmit
pnpm test         # vitest (tests/engine)
pnpm build
pnpm check        # typecheck + test + build; added in Phase 0
pnpm seed         # regenerate src/data/seed/world.json; added in Phase 1
```

## Non-negotiables

- **The engine computes, the model explains.** The model never emits a number the engine did not
  compute. Figures come from `src/engine`, which is pure TypeScript with tests.
- **Every claim carries evidence refs** (`RecordRef[]`). A claim without evidence renders as
  unverified, never as fact.
- **Every AI surface works with no key**, in scripted mode. Scripted tool outputs are generated
  by running the engine on the seed. Never type them by hand.
- **Nothing sends or changes without an approval.**
- **Keep the demo green on `main`.** `pnpm dev` in scripted mode must always be able to run
  `docs/DEMO.md`.
- **Engine changes ship with a test** in the same commit.
- **Check phone width before committing UI.**

## Design

`DESIGN.md` is the contract. If the browser proves it wrong, change the file and the code
together. Do not restate tokens or font names elsewhere; refer to `DESIGN.md`.

Four skills are vendored in `.agents/skills/` (symlinked from `.claude/skills/`). Load the
relevant one before UI work.

| When | Skill | How |
|---|---|---|
| Any app screen | `impeccable` (pbakaus/impeccable) | Operate mode. Read `reference/craft-floor.md` right before editing UI. Run its `critique`, `polish`, `audit` per screen. Do **not** run its init or new-work interview or its image-comp flow; `PRODUCT.md` and `DESIGN.md` already exist. |
| Design process, UX copy | `frontend-design` (anthropics/skills) | Plan, review against the brief, build, critique. Copy rules. |
| Motion, interaction detail | `emil-design-eng` (emilkowalski/skills) | Decide whether it animates at all, easing, duration, its review checklist. |
| Landing or pitch page only | `design-taste-frontend` (leonxlnx/taste-skill) | It says itself it is not for dashboards. Otherwise use it only to cross-check banned defaults. |
| Finish gate (Phase 8) | Vercel Web Interface Guidelines | Fetch https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md and review against it. |

Precedence when they disagree: `DESIGN.md`, then impeccable Operate mode and its craft floor,
then frontend-design, then emil-design-eng for motion, then the rest.

Settled conflicts, do not reopen: **lucide** icons (one family, it ships with shadcn),
**sentence case** everywhere, **no em dashes in UI strings**.

## AI SDK

Do not trust memory for the Vercel AI SDK. Before writing or fixing AI code:

1. Read `docs/AI_SDK_NOTES.md`.
2. `grep -r "<term>" node_modules/ai/docs node_modules/ai/src`
3. Re-check model IDs before hardcoding. All IDs live in `src/lib/ai/models.ts`.

```bash
curl -s https://ai-gateway.vercel.sh/v1/models \
  | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]'
```

Env is in `.env.example`: `AI_GATEWAY_API_KEY` (primary, optional), `MUNSHI_AI_MODE`
(`auto` | `live` | `scripted`), `MUNSHI_DEMO_NOW` (read only by `pnpm seed`; the app never reads it
at runtime). Never commit `.env.local`.

## Conventions

- TypeScript strict. pnpm. Node 22 or newer.
- Next.js App Router under `src/`. No edge runtime.
- `src/engine` is pure functions: no I/O, no model calls, no `Date.now()` (use `windows.now()`).
- zod at every boundary: tool `inputSchema`, structured model output, the seed schema, API bodies.
- One `World` object, client-held. The server is stateless and replays the client's `actions[]`
  log over the committed seed.
- No charting library; charts are hand-written SVG with d3-scale and d3-shape.
- No database, no auth.
- shadcn components live in `src/components/ui`; theme them through tokens, do not hand-edit.
- Money is rupees with Indian grouping, formatted through `src/lib/format.ts` only.

<!-- Next.js agent guidance generated by create-next-app during bootstrap. A missing import is harmless before bootstrap. -->
@AGENTS.md
