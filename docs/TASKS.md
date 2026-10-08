# Build plan

Ordered so the demo is *always* in a showable state after each phase. Each phase ends with a
`pnpm check` (typecheck + tests + build) and a commit. Tick boxes as you go.

Time budget assumes ~2 focused days. Phases 0–5 are the demo; 6–8 are what make it win.

Read first, in this order: `PRODUCT.md` and `DESIGN.md` (repo root), then
`docs/ARCHITECTURE.md`, `docs/ENGINE.md`, `docs/DATA-MODEL.md`, `docs/AI_SDK_NOTES.md`.

## Design skills (used in every UI phase)

Four design skills are vendored in `.agents/skills/` and symlinked from `.claude/skills/`:
`impeccable`, `frontend-design`, `emil-design-eng`, `design-taste-frontend`. `DESIGN.md` is the
contract; the skills are how you check your work against it.

- **Before building a screen:** load `impeccable` (Operate mode, read its
  `reference/craft-floor.md`) and `emil-design-eng`.
- **After building it:** run `impeccable critique` on the screen, then `impeccable polish`. One
  bounded round: inspect once, fix everything it shows in one batch, confirm once, stop.
- The direction is already decided. Use `impeccable` only through `critique`, `polish` and
  `audit` against the existing `PRODUCT.md` and `DESIGN.md`. Skip its init / new-work interview
  and its image-comp rounds. If its launcher cannot run in your sandbox, read the two files
  directly and carry on (the skill allows this).
- `design-taste-frontend` is written for landing pages. Use it only as a cross-check of banned
  defaults, never to drive a product screen. `DESIGN.md` wins any disagreement between skills.

---

## Phase 0 — Bootstrap (30 min)

- [x] `bash scripts/bootstrap.sh` (scaffolds Next.js + shadcn + deps into this repo without touching the docs; see README)
- [x] `ls -la .claude/skills` — the four design skills resolve to `.agents/skills/`
- [x] Model-ID smoke test from `docs/AI_SDK_NOTES.md` (needs a key; skip it if you have none, scripted mode needs no key)
- [x] Read "What the scaffold actually produces" in `docs/ARCHITECTURE.md` and clear its list: wire `--font-sans` (shadcn leaves it self-referential), mount `TooltipProvider` in the root layout, `pnpm add -D @types/node@^22`
- [x] `pnpm pkg set scripts.check="pnpm typecheck && pnpm test && pnpm build"`
- [x] Add `pnpm seed` → `tsx scripts/generate-seed.ts` (install `tsx` as dev dep)
- [x] Fonts in `app/layout.tsx`: load the single family named in `DESIGN.md` (Typography) with `next/font` and run its tabular-figure check
- [x] `globals.css` tokens from `DESIGN.md`; wire shadcn theme vars to them
- [x] Delete scaffold boilerplate page; `/` renders the product name styled per `DESIGN.md`
- [x] Commit: `chore: bootstrap`

## Phase 1 — Types + seed world (3 h)

- [ ] Check the Decision log in `PRODUCT.md` before generating a persona's worth of data
- [ ] `src/types/*.ts` — all record types (including `Event`), `World`, `RecordRef`, `Finding` (with `onset`, `series`), `ChainNode`, `Chain`, `Levers`, `Scenario`, `Action`, `Effect` (zod schemas + inferred types in one place; shapes in `docs/ARCHITECTURE.md`, Key types)
- [ ] `scripts/generate-seed.ts` — mulberry32 PRNG, baseline generation per `docs/DATA-MODEL.md` (Generator), including the purchase lag and quiet-noise rules in Onset anchors
- [ ] `src/data/seed/stories.ts` — S1–S12 with `apply()` and `expect`; S2, S3, S5, S7 each write their `Event`
- [ ] `pnpm seed` writes `src/data/seed/world.json` ≤ 1.5 MB and prints the detectability report
- [ ] `src/engine/windows.ts` — `now()`, window helpers, `MUNSHI_DEMO_NOW`
- [ ] `src/lib/format.ts` — `inr()`, `inrCompact()`, `pct()`, `relDate()` + tests
- [ ] `tests/engine/seed.test.ts` passes
- [ ] Commit: `feat: seed world with planted stories`

## Phase 2 — Engine (4 h)

- [ ] `engine/metrics.ts` — all series in `docs/ENGINE.md` (Metrics), full length and memoised; `stripSeries()`
- [ ] `engine/graph/onset.ts` — `detectOnset(series, window)` plus the event snap (`EVENT_ANCHORS` in `dag.ts`)
- [ ] `engine/detectors/*` — all 12; each fills `onset` and `series`; `analyze(world)` ranks + dedupes
- [ ] `engine/graph/dag.ts` + `walk.ts` — `walkCausalGraph` with temporal precedence; produces the S2 chain ordered by onset, with S3 as a branch that has its own onset
- [ ] `engine/simulator/model.ts` + `optimize.ts` — calibrate so S11 ("hire 1") is the optimizer's answer
- [ ] `engine/horizon.ts` — runway dips below buffer at ~day +23 without S4 collection
- [ ] `engine/playbooks/*` — all 6; `apply()` returns effects; `labels(n)`; `followUpLeads` drafts from threads
- [ ] `pnpm seed` report now shows planted day vs detected onset for S2, S3, S5, S7, all within 1 day (tune the generator if not)
- [ ] `tests/engine/*.test.ts` — all green, including `onset.test.ts`; detector snapshot committed
- [ ] Commit: `feat: engine`

## Phase 3 — Shell + Today (4 h)

Today is a briefing with a findings table under it, not a metric with cards. Layout, type, colour
and states per `DESIGN.md`.

- [ ] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`
- [ ] `lib/store/world.ts` — zustand store: seed world, `actions[]`, `applyAction`, `replay`, persisted
- [ ] `components/primitives/*` — `Money`, `Delta`, `SeverityLabel` (text label plus icon), `ReceiptChip`, `Confidence`, `EmptyState`, `Kbd`
- [ ] `components/shell/*` — `Sidebar`, `TopBar`, `CommandK` ask field, `SourceStatus`; responsive per `DESIGN.md` (Layout)
- [ ] `components/chain/OnsetStrip.tsx` — one series over time with the onset marked; an event flag when `onsetEvidence` exists; "in 12 days" form when the onset is null
- [ ] `components/finding/*` — `FindingRow` (expands inline to `explain`, evidence and actions), `EvidenceDrawer` (renders any `RecordRef[]` as readable records: messages as bubbles, invoices as a mini-invoice, orders as a line, events as a dated line)
- [ ] `components/today/*` — `Brief` (the dated sentence: "Thursday, 8 October. 11 things found overnight, worth about ₹3.2 lakh."), `LeadItem` (Munshi's top item in two or three sentences, figures link to evidence; primary "Review 7 drafts", secondary "See the threads"), `FindingsTable` (columns Finding with severity label and icon, Since as an `OnsetStrip`, Worth, Action; sections "Needs you", "Worth knowing", "Handled")
- [ ] Today is demo-able end to end (no AI yet)
- [ ] After: `impeccable critique` then `impeccable polish` on Today and the shell, one bounded round
- [ ] Commit: `feat: today`

## Phase 4 — Why + onset trail (4 h)

- [ ] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`; read `docs/AI_SDK_NOTES.md`
- [ ] `components/chain/OnsetTrail.tsx` — SVG. Stacked `OnsetStrip`s on one shared 28-day axis (previous 14 days muted, current 14), earliest cause at the top, the asked-about metric at the bottom, onset marked on each, `EventFlag`s on the axis, the "but also" branch as a second group with its own onset. Strip click → `EvidenceDrawer`. The draw (top to bottom, onset marks stepping right) is the one authored animation in the product; with reduced motion it renders fully drawn. A strip with no onset or no evidence is labelled "unverified"
- [ ] `lib/ai/tools/*` — `getMetricSeries`, `compareWindows`, `walkCausalGraph`, `listRecords`, `getRecord`, `runSimulation` (all wrap engine; zod `inputSchema`)
- [ ] `lib/ai/agents/investigator.ts` — `ToolLoopAgent`, instructions from `data/rules/tone.ts`, final `Output.object` = `{ chainId, narrative, citations }`
- [ ] `lib/ai/mode.ts` — resolves mode; `scriptedStream(id)` emits parts with delays in UI-message-stream format
- [ ] `app/api/ask/route.ts` — live via `createAgentUIStreamResponse`, scripted via `mode.ts`; request carries `actions[]`
- [ ] `scripts/record-scripts.ts` — runs the engine for each demo question and writes `data/scripts/*.json`; narrative text hand-written in the script file (good copy matters)
- [ ] Scripts: `why-revenue-fell`, `why-complaints-up`, `which-customers-at-risk`, `what-should-i-do-today`
- [ ] `/ask` page (`AskComposer`, `Investigation`, `SuggestedQuestions`) + `⌘K` → `/ask?q=` navigation
- [ ] Verify: works with no `.env.local` (scripted), then with a key (live, same UI)
- [ ] After: `impeccable critique` then `impeccable polish` on Why, one bounded round. Watch the trail draw once in slow motion
- [ ] Commit: `feat: why`

## Phase 5 — What if (3 h)

- [ ] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`
- [ ] `components/whatif/Levers.tsx` — sliders with value readouts and the base value marked, presets, reset
- [ ] `OutcomeTable` — rows Revenue, Customers, Churn, Profit, Cash runway; columns Base, Scenario, Change. Values update instantly as a slider moves, with no count-up. `notes[]` under it, then `RiskScale` (Low, Medium, High as words)
- [ ] `StrategyScan` — the scan counter (the only animated number in the product) + scatter + `ParetoList` top 3 with "Apply"
- [ ] `/whatif` reads initial levers from `?preset=`; `/ask` answers can deep-link here
- [ ] After: `impeccable critique` then `impeccable polish` on What if, one bounded round
- [ ] Commit: `feat: what if`

## Phase 6 — Act (3 h)

- [ ] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`; read `docs/AI_SDK_NOTES.md` (search the installed SDK docs for built-in tool approval before writing your own)
- [ ] `components/act/*` — `ActSheet`, plan timeline, `DraftPreview` (editable), `ApprovalCard`, done state
- [ ] `lib/ai/agents/operator.ts` — rewrites engine drafts in tone, per recipient, using thread context; scripted fallback = engine templates
- [ ] `app/api/act/route.ts`
- [ ] One name per action, from the playbook's `labels(n)`: "Review 7 drafts" opens the sheet, "Approve and send 7" approves, the toast reads "7 follow-ups sent"
- [ ] Approve → `applyAction` → Today re-ranks with a layout animation; the finding moves to "Handled"; the lead item changes
- [ ] `ActionTimeline` on Today ("7 follow-ups sent 2 minutes ago. Expected ₹1.1 lakh in 14 days.")
- [ ] After: `impeccable critique` then `impeccable polish` on the Act sheet, one bounded round
- [ ] Commit: `feat: act`

## Phase 7 — Horizon + Vault (3 h)

- [ ] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`
- [ ] `RunwayCurve` with buffer band, pinned outflows, "If overdue invoices are collected" toggle (path morph)
- [ ] `UpcomingList`, `RiskStrip`
- [ ] Vault: `SourceGrid`, `RecordTable` (virtualised if > 500 rows — or just paginate), `GraphExplorer`
- [ ] Every `ReceiptChip` anywhere deep-links to the Vault record
- [ ] After: `impeccable critique` then `impeccable polish` on Horizon and Vault, one bounded round
- [ ] Commit: `feat: horizon + vault`

## Phase 8 — Finish gate (3 h)

Verification is bounded: inspect once, fix in one batch, confirm once. No open-ended polishing.

- [ ] Run the demo script in `docs/DEMO.md` three times end to end, scripted mode, no network
- [ ] Correct every spoken figure and date in `docs/DEMO.md` to what the recorded scripts and the screen actually show
- [ ] Render check at 1440 and 390 together (light and dark, and once with `prefers-reduced-motion`); fix everything in one batch; confirm once
- [ ] Vercel Web Interface Guidelines review: fetch `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` and run it over `src/app` and `src/components`. Where it conflicts with `DESIGN.md` (heading case, for one), `DESIGN.md` wins
- [ ] `emil-design-eng` review checklist over every animated or pressable component
- [ ] `impeccable audit` (accessibility, performance, responsive)
- [ ] The finish gate in `DESIGN.md`
- [ ] Keyboard pass: `⌘K`, `Esc`, tab order in sheet
- [ ] Copy pass: every finding title has a number; sentence case; no exclamation marks, em dashes or middle dots in UI strings; each action keeps one name through its flow; no "AI-powered" anywhere
- [ ] Motion pass: no page-enter fade, no stagger on lists; the only authored animation is the OnsetTrail draw; the rest is functional (press feedback, sheet, popover origin, Today re-rank, runway morph, scan counter)
- [ ] Empty/error/unverified states visibly implemented (temporarily force them)
- [ ] `pnpm check` green; Lighthouse ≥ 90 perf on `/`
- [ ] Commit: `polish: finish gate`

## Phase 9 — Ship (1 h)

- [ ] `vercel link` → set `AI_GATEWAY_API_KEY`, `MUNSHI_AI_MODE=auto`, `MUNSHI_DEMO_NOW=<demo date>`
- [ ] `vercel --prod`; smoke test the deployed URL in scripted *and* live mode
- [ ] README: add the live URL + a 20-second GIF of the "Why" beat
- [ ] Tag `v0.1-demo`

---

## Stretch (only after Phase 9)

- [ ] Morning WhatsApp brief via Chat SDK (`/api/cron/brief`)
- [ ] "Explain this" on any onset strip (`/api/explain`)
- [ ] One real adapter: Gmail read-only via Vercel Connect → `Message` records
- [ ] Ranking memory from clicks

## Working rules

- Keep the demo green: never leave `main` in a state where `pnpm dev` + scripted mode can't run the demo.
- Engine changes need a test in the same commit.
- UI changes get checked at phone width before commit.
- `DESIGN.md` answers design questions. If the browser proves it wrong, change `DESIGN.md` and the code in the same commit.
- If a phase runs > 1.5× its budget, cut scope inside the phase, not the next phase.
