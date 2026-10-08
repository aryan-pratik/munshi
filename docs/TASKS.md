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

- [x] Check the Decision log in `PRODUCT.md` before generating a persona's worth of data
- [x] `src/types/*.ts` — all record types (including `Event` and `PurchaseOrder`), `World`, `RecordRef`, `Window`, `MetricMeta`, `Outcome`, `Step`, `Draft`, `Effect`, `Finding` (with `id`, `group`, `impactINR`, `exposureINR`, `onset`, `series`), `ChainNode`, `Chain` (with `id`), `Levers`, `Scenario` (with `riskScore`), `Action` (zod schemas + inferred types in one place; shapes in `docs/ARCHITECTURE.md`, Key types)
- [x] `scripts/generate-seed.ts` — mulberry32 PRNG, baseline generation per `docs/DATA-MODEL.md` (Generator), including the purchase lag and quiet-noise rules in Onset anchors
- [x] `src/data/seed/stories.ts` — S1–S12 with `apply()` and `expect`; S2, S3, S5, S7 each write their `Event`
- [x] `pnpm seed` writes `src/data/seed/world.json` ≤ 1.5 MB and prints a story report computed from records only (per story: planted records and figures; no detectors needed). `MUNSHI_DEMO_NOW` is read only here and sets `meta.day0 = date - 89`
- [x] `src/engine/windows.ts` — `now(world)` = `day0 + 89` (`parseISO(meta.day0) + (meta.days - 1)`), window helpers. It never reads the environment
- [x] `src/lib/format.ts` — `inr()`, `inrCompact()`, `pct()`, `relDate()` + tests
- [x] `tests/engine/seed.test.ts` passes: schema validity, determinism, size ≤ 1.5 MB, per-story record facts (counts, dates, sums from records). No detector, chain or simulator checks here
- [x] Commit: `feat: seed world with planted stories`

## Phase 2 — Engine (4 h)

- [x] `engine/metrics.ts` — all series in `docs/ENGINE.md` (Metrics), full length and memoised; `stripSeries()`
- [x] `engine/graph/onset.ts` — `detectOnset(series, window)` plus the event snap (`EVENT_ANCHORS` in `dag.ts`)
- [x] `engine/detectors/*` — all 12; each fills `onset` and `series`; `analyze(world)` ranks + dedupes
- [x] `engine/graph/dag.ts` + `walk.ts` — `walkCausalGraph` with temporal precedence; produces the S2 chain ordered by onset, with S3 as a branch that has its own onset
- [x] `engine/simulator/model.ts` + `optimize.ts` — calibrate per `docs/ENGINE.md` by adjusting seed fields (never the coefficients); the test asserts the top strategy has `hires = 1` and overload 0
- [x] `engine/horizon.ts` — runway dips below buffer at ~day +23 without S4 collection (built here; the Today cash line in Phase 3 and the Horizon page in Phase 7 both use it)
- [x] `engine/playbooks/*` — all 6; `apply()` returns effects; `labels(n)`; `followUpLeads` drafts from threads
- [x] `tests/engine/stories.test.ts` — checks each story's `expect` (detector, chain or simulator form)
- [x] `pnpm seed` report gains detector, chain and simulator columns and shows planted vs detected onset for S2, S3, S5, S7, all within 1 day (tune the generator if not)
- [x] `tests/engine/*.test.ts` — all green, including `onset.test.ts`; detector snapshot committed
- [x] Commit: `feat: engine`

## Phase 3 — Shell + Today (4 h)

Today is a briefing with a findings table under it, not a metric with cards. Layout, type, colour
and states per `DESIGN.md`.

- [x] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`
- [x] `lib/store/world.ts` — zustand store: seed world, `actions[]`, `applyAction`, `replay`. In memory only, no `persist`; a hard refresh reloads the seed and is the demo reset
- [x] `components/primitives/*` — `Money`, `Delta`, `SeverityLabel` (text label plus icon), `ReceiptChip`, `Confidence`, `EmptyState`, `Kbd`
- [x] `components/shell/*` — `Sidebar`, `TopBar`, `CommandK` ask field, `SourceStatus`; responsive per `DESIGN.md` (Layout)
- [x] `components/chain/OnsetStrip.tsx` — one series over time with the onset marked; an event flag when `onsetEvidence` exists; "in 12 days" form when the onset is null
- [x] `components/finding/*` — `FindingRow` (expands in place to `explain`, evidence and actions), `EvidenceList` (renders any `RecordRef[]` as readable records: messages as bubbles, invoices as a mini-invoice, orders as a line, events as a dated line). Containers: a strip click opens it in a popover (bottom sheet on phone); rows and "See the threads" expand in place. No drawer anywhere
- [x] `components/today/*` — `Brief` (the dated sentence: "Thursday, 8 October. 11 things found overnight, worth about ₹4 lakh."; the total sums `impactINR` of open findings except `cashCrunch`), `LeadItem` (Munshi's top item in two or three sentences, figures link to evidence; primary "Review 7 drafts", secondary "See the threads" expands the seven threads in place), `FindingsTable` (columns Finding with severity label and icon, Since as an `OnsetStrip`, Worth, Action; sections "Needs you" and "Worth knowing" from `Finding.group`, and "Handled" from `handledFindings(seed, actions)`)
- [x] `components/today/CashLine` (320x96, uses `engine/horizon.ts` and the shared `chain/` axis helper that Phase 7 `RunwayCurve` reuses), `UpcomingOutflows` (next three rows), and `components/ask/SuggestedQuestions` (the list, each item carries a `questionId`; created here, reused by `/ask` in Phase 4)
- [x] `CommandK`: the top-bar ask field, when focused and empty, opens a popover listing the suggested questions; selecting one navigates to `/ask?q=<questionId>`; free text plus Enter navigates with the text
- [x] Today is demo-able end to end (no AI yet)
- [x] After: `impeccable critique` then `impeccable polish` on Today and the shell, one bounded round
- [x] Commit: `feat: today`

## Phase 4 — Why + onset trail (4 h)

- [x] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`; read `docs/AI_SDK_NOTES.md`
- [x] `components/chain/OnsetTrail.tsx` — SVG. Stacked `OnsetStrip`s on one shared 28-day axis (previous 14 days muted, current 14), earliest cause at the top, the asked-about metric at the bottom, onset marked on each, `EventFlag`s on the axis. Three groups top to bottom, derived from `Chain` as in `docs/ARCHITECTURE.md`: the primary path, a group headed "Also contributing" (drawn only when `branches` is non-empty), then the shared effect with the asked-about metric last. Strip click → `EvidenceList` in a popover (bottom sheet on phone). The draw (in group order, onset marks stepping right within the primary path) is the one authored animation in the product; with reduced motion it renders fully drawn. A strip with no evidence is labelled "unverified" (dashed series, dashed tick outline, chip, as `DESIGN.md` specifies); a strip with evidence but a null onset draws with no onset mark and no connector
- [x] `lib/ai/tools/*` — `getMetricSeries`, `compareWindows`, `walkCausalGraph`, `listRecords`, `getRecord`, `runSimulation`, plus `getFindings` (the ranked findings, so "what should I do today" needs one call) (all wrap engine; zod `inputSchema`, `contextSchema` carries the replayed `World`)
- [x] `lib/ai/agents/investigator.ts` — `ToolLoopAgent`, instructions from `data/rules/tone.ts`, final `Output.object` = `{ chainId, narrative, citations }`
- [x] `lib/ai/mode.ts` — resolves mode per request from `MUNSHI_AI_MODE` and key or OIDC presence (`scripted` never calls the model; `auto` is live with a key and falls back to the matching script on a failure before the first byte; `live` shows errors; `live` with no key is the error "No AI key is configured."; table in `docs/ARCHITECTURE.md`). `scriptedStream(id)` emits parts with delays in UI-message-stream format. Scripted matching is by `questionId`, else fuzzy match of `text` against each script's `match` phrases
- [x] `app/api/ask/route.ts` — `POST { questionId?, text?, actions[] }`; live via `createUIMessageStream` over `investigator.stream` (not `createAgentUIStreamResponse`, which gives no writer for the `data-chain` and `data-answer` parts; see `docs/AI_SDK_NOTES.md`), scripted via `mode.ts`. The first stream part is `data-mode` `{ mode }` and the `x-munshi-mode` response header carries the same value; the client shows "Demo answers" when it is `scripted`
- [x] `scripts/record-scripts.ts` — runs the engine for each demo question and writes `data/scripts/*.json` (used by `/api/ask` only); narrative text hand-written in the script file (good copy matters)
- [x] Scripts: `why-revenue-fell`, `why-complaints-up`, `which-customers-at-risk`, `what-should-i-do-today`
- [x] `/ask` page (`AskComposer`, `Investigation`; `SuggestedQuestions` already exists from Phase 3) + `⌘K` → `/ask?q=<questionId>` navigation. The `why-revenue-fell` answer calls `compareWindows(revenue)`, `compareWindows(revenueD2C)`, then `walkCausalGraph(target: 'revenueD2C')`
- [x] Verify: works with no `.env.local` (scripted); live mode could not be verified from the build environment (no key and the gateway is blocked by its proxy): the live path is typechecked and falls back to the script in `auto`
- [x] After: `impeccable critique` then `impeccable polish` on Why, one bounded round. Watch the trail draw once in slow motion
- [x] Commit: `feat: why`

## Phase 5 — What if (3 h)

- [x] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`
- [x] `components/whatif/Levers.tsx` — sliders with value readouts and the base value marked, presets, reset
- [x] `OutcomeTable` — one row per `Outcome` field: Revenue, Customers, Churn, Profit, Cash runway; columns Base, Scenario, Change. Values update instantly as a slider moves, with no count-up. `notes[]` under it, then `RiskScale` (Low, Medium, High as words)
- [x] `StrategyScan` — the scan counter ("1,800 scenarios checked", the only animated number in the product) + scatter (x `riskScore`, y profit, from `optimize().all`) + `ParetoList` top 3 with "Apply"
- [x] `/whatif` reads initial levers from `?preset=`; `/ask` answers can deep-link here
- [x] After: `impeccable critique` then `impeccable polish` on What if, one bounded round
- [x] Commit: `feat: what if`

## Phase 6 — Act (3 h)

- [x] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`; read `docs/AI_SDK_NOTES.md` (search the installed SDK docs for built-in tool approval before writing your own)
- [x] `components/act/*` — `ActSheet`, plan timeline, `DraftPreview` (editable), `ApprovalCard`, done state
- [x] `lib/ai/agents/operator.ts` — rewrites engine drafts in tone, per recipient, using thread context; scripted fallback = engine templates
- [x] `app/api/act/route.ts` — `POST { findingId, actions[] }`; same `data-mode` part and `x-munshi-mode` header as `/api/ask`; final part is `data-plan` `{ steps, drafts }`. Scripted mode runs `playbook.plan` and streams the engine's template drafts (it does not read `data/scripts`)
- [x] One name per action, from the playbook's `labels(n)` = `{ review, approve, working, done }`: "Review 7 drafts" opens the sheet, "Approve and send 7" approves, the button then shows "Sending 7..." (loading), and "7 follow-ups sent" is the toast and the activity entry
- [x] Act flow: approve → button loading → the sheet shows the Done state (effects list with check icons, expected impact and basis, "I'll check back on Friday.") and the toast fires on completion → the presenter closes the sheet and Today has re-ranked behind it
- [x] Approve → `applyAction` → Today re-ranks with a layout animation; the finding moves to "Handled" (via `handledFindings`); the lead item changes
- [x] `ActionTimeline` on Today ("7 follow-ups sent 2 minutes ago. Expected ₹1.1 lakh over 14 days.")
- [x] After: `impeccable critique` then `impeccable polish` on the Act sheet, one bounded round
- [x] Commit: `feat: act`

## Phase 7 — Horizon + Vault (3 h)

- [x] Before: load `impeccable` (Operate mode, read `reference/craft-floor.md`) and `emil-design-eng`
- [x] `RunwayCurve` with buffer band, pinned outflows, "Assume overdue invoices are collected" switch (path morph); reuses the Phase 3 axis helper and `engine/horizon.ts`
- [x] `UpcomingList`, `RiskStrip`
- [x] Vault: `SourceGrid`, `RecordTable` (paginated, 50 a page), `GraphExplorer`
- [x] Every `ReceiptChip` anywhere deep-links to the Vault record
- [x] After: `impeccable critique` then `impeccable polish` on Horizon and Vault, one bounded round
- [x] Commit: `feat: horizon + vault`

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

- [ ] `vercel link` → set `AI_GATEWAY_API_KEY` and `MUNSHI_AI_MODE=auto`. Do not set `MUNSHI_DEMO_NOW` on Vercel (the app never reads it). To change the demo date run `MUNSHI_DEMO_NOW=<date> pnpm seed` and commit `world.json`
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
