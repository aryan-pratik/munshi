# Engine

Pure TypeScript in `src/engine`. No I/O, no LLM, no `Date.now()` (use `windows.now()`).
Everything here is unit-tested against the committed seed.

## 1. Metrics (`engine/metrics.ts`)

Daily series derived from records, memoised per `World`:

| MetricId | Derived from | Unit |
|---|---|---|
| `adSpend` | `AdDay.spend` | ₹ |
| `sessions` | `AdDay.sessions` + `TrafficDay.organic` | count |
| `d2cCvr` | `orders(d2c) / sessions`, site-wide | % |
| `landingCvr` | D2C orders that entered on a campaign or collection landing page / sessions that entered there (`Order.viaLanding`, `TrafficDay.landingSessions`) | % |
| `leadsNew` | `Lead.createdAt` (wholesale) | count |
| `leadsContacted` | `Lead.lastContactedAt` | count |
| `leadCvr` | `leads → won` within 14d | % |
| `ordersD2C`, `ordersWholesale` | `Order` | count |
| `revenue`, `revenueD2C`, `revenueWholesale` | `Order.total` | ₹ |
| `aov` | revenue / orders | ₹ |
| `deliveryDelayAvg` | `Shipment.deliveredAt - promisedAt`, indexed by dispatch date so the series breaks on the day a courier changes | days |
| `complaints` | `Ticket.category='delivery'` | count |
| `repeatRate` | second order within 60d | % |
| `cashBalance` | `BankTxn` cumulative | ₹ |
| `receivablesOverdue` | `Invoice` past due, unpaid | ₹ |
| `subscriptionSpend` | `Subscription.monthlyINR` | ₹ |

`compareWindows(world, metric, { current, previous })` → `{ current, previous, delta, deltaPct }`.
Default windows: 14 days vs the preceding 14.

Every series is full length (all 90 days), not just the two windows. Onset detection (section 3)
needs the days before the windows as its baseline, and `stripSeries(world, metric, window)` returns
the 28 points (previous 14, then current 14) that the UI draws.

## 2. Detectors (`engine/detectors/*`)

Signature: `(world: World, ctx: DetectorCtx) => Finding[]`. Each file exports one detector plus its
thresholds from `data/rules/thresholds.ts`. `analyze(world)` runs all, sorts by
`severityRank × |impactINR|`, and de-duplicates by `(detector, primaryRef)`.

| Detector | Fires when | impactINR |
|---|---|---|
| `staleHighValueLeads` | wholesale lead, est. value ≥ ₹10k, no contact ≥ 48h, not lost | Σ est. value × historical `leadCvr` |
| `overdueInvoices` | invoice unpaid > dueDate | Σ outstanding (negative sign = cash at risk) |
| `conversionDrop` | `landingCvr` or `leadCvr` Δ ≤ −15% vs previous window | lost orders × aov |
| `complaintSpike` | `complaints` Δ ≥ +25% and ≥ 5 abs | at-risk repeat revenue (affected customers × repeat value) |
| `costCreep` | recurring `Bill` from same vendor ↑ ≥ 10% vs 3-month median | Δ × 12 |
| `zombieSubscription` | `Subscription` active, `lastUsedAt` ≥ 60d ago | monthly × 12 |
| `customerConcentration` | one customer ≥ 25% of 90-day revenue | that customer's annualised revenue (exposure) |
| `cashCrunch` | projected `cashBalance` < buffer within 30d (uses Horizon projection) | shortfall |
| `stockoutRisk` | SKU `onHand / dailyVelocity` < lead time | lost sales during stockout |
| `adEfficiency` | CAC Δ ≥ +20% | excess spend |
| `renewalDue` | `Obligation` (insurance, GST, domain, lease) due ≤ 21d | penalty/exposure from `Obligation.penaltyINR` |
| `deliverySLA` | `deliveryDelayAvg` > 1.5d for a courier | complaint-linked churn estimate |

Rules for new detectors: title contains the number; `explain` is writable without an LLM;
`evidence` is non-empty; a test asserts it fires on the seed and doesn't on a neutral world.

**Every finding says since when.** Each detector already knows which metric or records it is
looking at, so it also fills `onset` and `series` (the Today row draws them as its "Since" strip):

| Kind | Detectors | `series` | `onset` |
|---|---|---|---|
| Metric-driven | `conversionDrop`, `complaintSpike`, `adEfficiency`, `deliverySLA` | the metric's 28 strip points | `detectOnset` on that metric (section 3) |
| Record-driven | `staleHighValueLeads`, `overdueInvoices`, `costCreep`, `zombieSubscription`, `customerConcentration` | a daily series built from the records: leads waiting past 48h, overdue ₹, the vendor's bill amount as a step, days since last use, the top customer's revenue share | the record that started it: first lead to cross 48h, earliest missed due date, first bill at the higher amount (snapped to its `plan_upgraded` event), `lastUsedAt`, first day the share reached 25% |
| Forward-looking | `cashCrunch`, `stockoutRisk`, `renewalDue` | the projection: cash balance, days of cover, days to the due date | `null`. Nothing has begun yet; `window.to` is the due date and the row reads "in 12 days" instead of "since" |

`series` ends at `window.to` and has 28 daily points. When the onset is older than that (the
internet bill changed on day 60), the detector extends the series back, to at most 90 points, so
the onset is always inside the strip.

## 3. Causal graph (`engine/graph/*`)

A hand-authored DAG of metrics for this business type (`graph/dag.ts`):

```
adSpend ─► sessions ─► ordersD2C ─► revenueD2C ─┐
             ▲   └─► landingCvr ─┘               ├─► revenue ─► cashBalance
      organic┘                                   │        ▲
leadsNew ─► leadsContacted ─► leadCvr ─► ordersWholesale ─► revenueWholesale   │
                                                          invoicesPaid ────────┘
deliveryDelayAvg ─► complaints ─► repeatRate ─► ordersD2C
stockouts ─► ordersD2C
```

### 3.1 Onset detection (`graph/onset.ts`)

The answer to "why did X change?" is drawn as an OnsetTrail: metric strips stacked on one shared
28-day axis, each with the day its change began marked, so the reader sees the cause move first
and the effect follow. That only works if the engine can say when each metric's change began.

`detectOnset(series, window): string | null`

- `series` is the metric's full daily series. `window` is the current 14-day window.
- The **strip** is the 28 days ending at `window.to` (previous 14, then current 14). The
  **baseline** is the 28 days before the strip. The baseline sits before the strip, not in the
  previous window, because a change that began 15 days ago is already inside the previous window.
- Remove the weekday pattern: `r[d] = value[d] / mean(baseline values on the same weekday) − 1`.
- Threshold `t = max(8%, 1 standard deviation of the baseline's own r)`.
- Direction is the sign of the window delta (current vs previous).
- The onset is the first day in the strip that starts a run of at least 3 consecutive days with
  `r` beyond `t` in that direction. No such run returns `null`.

Deterministic, about 30 lines, no statistics library.

**Event snap.** `EVENT_ANCHORS` in `graph/dag.ts` names the one metric each event kind acts on
directly:

| `Event.kind` | Anchors |
|---|---|
| `campaign_paused` | `adSpend` |
| `theme_updated` | `landingCvr` |
| `courier_changed` | `deliveryDelayAvg` |
| `price_changed` | `aov` |
| `plan_upgraded` | that vendor's `Bill` series (used by `costCreep`) |

When an anchored `Event` falls within 2 days of the detected onset, the onset snaps to the event's
date and the event's `RecordRef` becomes `onsetEvidence` (the UI draws it as a flag on the axis).
Only the anchored metric snaps. Downstream metrics keep the day the detector found, which is what
lets the trail show sessions falling the same day and orders a day later.

**Null is an answer.** Real data is noisier than the seed and the run test will fail more often.
A null onset stays null and is drawn as "timing unverified". It is never back-filled from an event
or guessed from a neighbour.

### 3.2 The walk (`graph/walk.ts`)

`walkCausalGraph(world, target, window)`:

1. Compute Δ% and `onset` (with event snap) for `target` and every ancestor, current window vs previous.
2. Score each edge `from→to` by **co-movement**: `sign(Δfrom)==sign(Δto)` × `min(|Δfrom|,|Δto|)/|Δto|` × edge prior weight.
3. Apply **temporal precedence**, the cheap honesty check. A cause that started after its effect
   cannot have started it. An edge may carry the primary path only if
   `onset(from) ≤ onset(to) + 1 day`. An ancestor that fails this is rejected from the primary walk
   and kept only as a branch candidate. An ancestor with a null onset has its edge score halved.
4. Greedy-walk the strongest admissible ancestor path from `target` until Δ < 3% or a root is
   reached → **primary chain**. Order its nodes by onset (ties keep graph order): earliest cause
   first, `target` last.
5. Any ancestor with |Δ| ≥ 10% that isn't on the primary path and has an onset inside the strip →
   **branch** ("but also"). A branch is a second driver that joined later, so its onset may come
   after the target's. It is returned as its own `Chain` and drawn as a second group with its own
   onset mark.
6. Attach evidence: for each node, the top records driving the delta (the ad campaign paused, the
   theme update event, the courier with the delays), plus `onsetEvidence` from the snap.

Output is a `Chain` (types in `docs/ARCHITECTURE.md`). Each node carries `delta`, the 28-point
`series`, `onset`, `onsetEvidence` and `evidence`. The model's job in live mode is to *choose*
between chains when scores are close and write the narrative; it does not alter deltas or onsets.
In scripted mode the chain is precomputed by running this function.

**What this shows and what it doesn't.** Co-movement along a hand-authored business graph, the
cause's onset on or before the effect's, and a linked event record. That is evidence for a likely
cause. It is not proof of causation, and the product never says it is: narratives say "likely",
and any node missing evidence or an onset is labelled unverified.

## 4. Simulator (`engine/simulator/*`)

A monthly steady-state model calibrated from the last 30 days of the world. Deliberately
non-linear so "find best" has something to find.

**Levers** (`Levers`): `pricePct ∈ [−20, +30]`, `marketingPct ∈ [−50, +100]`, `hires ∈ [0, 4]`,
`inventoryPct ∈ [−30, +50]`, `followUpHours ∈ {4, 12, 24, 48}`.

**Mechanics** (`simulator/model.ts`):

```
segments: d2c (ε = 1.3), wholesale (ε = 0.6)

traffic      = base.sessions × (1 + marketingPct)^0.7                 // diminishing returns
cvr          = base.d2cCvr × (1 − 0.35 × pricePct⁺)                    // price sensitivity on page
ordersD2C    = traffic × cvr × (1 + pricePct)^(−ε_d2c) adj.
leadWin      = base.leadCvr × followUpBoost(followUpHours)             // 48h→1.0, 24h→1.15, 12h→1.28, 4h→1.35
ordersWS     = base.leadsNew × leadWin × (1 + pricePct)^(−ε_ws)
demand       = ordersD2C + ordersWS
capacity     = (base.staffOps + hires) × ordersPerPersonPerMonth
fulfilled    = min(demand, capacity)
overload     = max(0, demand / capacity − 1)
delayDays    = base.delay + 2.5 × overload
complaintRt  = base.complaintRate × (1 + 3 × overload)
churnAdj     = base.churn + 0.4 × pricePct⁺ + 1.5 × (complaintRt − base.complaintRate)
repeatOrders = fulfilled × (base.repeatRate − churnAdj)
stockoutLoss = max(0, demand × (1 − (1 + inventoryPct) × base.coverage))

revenue      = (fulfilled + repeatOrders − stockoutLoss) × aov × (1 + pricePct)
cogs         = units × unitCost;  marketing = base.marketing × (1 + marketingPct)
payroll      = base.payroll + hires × salary;  inventoryCarry = 0.02 × inventoryValue
profit       = revenue − cogs − marketing − payroll − fixed − inventoryCarry
risk         = f(cashRunwayMonths, churnAdj, concentration, overload)  → low | medium | high
```

`simulate(world, levers) → Scenario` also returns `notes[]` — short engine-authored facts like
*"Fulfilment at 112% of capacity, so delays rise"* that the UI shows under the outcome and the
model can quote.

The What if screen shows a comparison table: Base, Scenario, Change. Base is
`simulate(world, BASE_LEVERS)`, memoised per world. `simulate` is a few dozen arithmetic
operations, so it runs on every slider input event and the table updates instantly, with no
count-up.

**Optimizer** (`simulator/optimize.ts`): exhaustive grid over discrete lever values
(7 × 6 × 5 × 4 × 4 ≈ 3,360; trim to ~1,800 by pruning dominated `inventoryPct` values). Objective:
`profit − riskPenalty`. Returns the **Pareto front** (profit vs risk) and the top-3 with one-line
reasons. Runs in < 50 ms client-side; the UI animates the scan count anyway because watching the
number race to 1,842 *is* the demo. That counter is the only animated number in the product.

## 5. Playbooks (`engine/playbooks/*`)

```ts
interface Playbook {
  id: PlaybookId;
  appliesTo: DetectorId[];
  plan(world, finding): Step[];            // what will happen, in order
  drafts(world, finding): Draft[];         // engine-templated; live mode lets the model rewrite in tone
  apply(world, finding, approved: Draft[]): Effect[];   // pure mutation descriptors
  expectedImpact(world, finding): { inr: number; horizonDays: number; basis: string };
  labels(n: number): { review: string; approve: string; done: string };
}
```

`labels(n)` keeps an action's name constant from the first click to the confirmation. For
`followUpLeads` with 7 drafts: `review` "Review 7 drafts" (the button on the finding), `approve`
"Approve and send 7" (the button in the Act sheet), `done` "7 follow-ups sent" (the toast and the
activity entry). The UI never invents its own wording for these.

| Playbook | Steps | Effects |
|---|---|---|
| `followUpLeads` | read thread → draft per lead → approve → send (WhatsApp/email mock) → set reminder → update CRM | `Lead.lastContactedAt`, `Lead.stage`, `Task` created |
| `collectOverdue` | tiered reminders (friendly → firm → call task) | `Invoice.reminderSentAt`, `Task` for the two largest |
| `cancelSubscription` | confirm owner, cancel, note savings | `Subscription.status`, `Finding` resolves |
| `escalateCourier` | message courier account manager with affected AWBs, propose SLA | `Ticket.status`, `Message` logged |
| `reorderStock` | PO draft to supplier for at-risk SKUs | `PurchaseOrder` created |
| `scheduleRenewal` | create task + calendar block, draft renewal email | `Task`, `Obligation.handledAt` |

`applyAction(world, action)` in the store replays `effects` immutably. After apply, `analyze()`
re-runs and the finding either resolves or downgrades — the Today page visibly changes. That's the
closing beat of the demo.

## 6. Horizon projection (`engine/horizon.ts`)

30-day cash projection: `cashBalance[today]` + expected inflows (invoices by due date × historical
on-time rate, D2C revenue run-rate) − known outflows (`Obligation`s, payroll, recurring bills,
subscriptions). Emits `RunwayPoint[]` and `Upcoming[]` (each pinned to the curve with its ₹ and
source). The `cashCrunch` detector reads this.

## 7. Testing

- `tests/engine/seed.test.ts` — seed loads, schema-valid, every planted story is detectable.
- `tests/engine/detectors.test.ts` — one `it` per detector: fires on seed with expected magnitude band; silent on `neutralWorld()`.
- `tests/engine/onset.test.ts` — on the seed, the onset equals the planted event day within 1 day for S2 (`adSpend`, day 72), S3 (`landingCvr`, day 74), S5 (`deliveryDelayAvg`, day 70) and S7 (the Airtel bill series behind `costCreep`, day 60); each of those carries its `Event` as `onsetEvidence`; `ordersD2C` begins on or after `sessions`; a flat series returns null; a one-day spike returns null (the run is shorter than 3 days).
- `tests/engine/graph.test.ts` — walk from `revenue` on the seed yields the planted chain with nodes ordered by onset (`adSpend` first, `revenue` last) and `landingCvr` as a branch with its own onset; precedence rejection works: in a synthetic world where a parent's onset is 3 days after its child's, that parent is not on the primary path; a parent with a null onset loses to an equally strong parent that has one.
- `tests/engine/detectors.test.ts` also asserts every finding has a non-empty `series`, and an `onset` that is either inside that series or null for the three forward-looking detectors.
- `tests/engine/simulator.test.ts` — directional sanity (more marketing → more traffic), capacity ceiling kicks in, optimizer's best beats baseline, deterministic.
- `tests/engine/playbooks.test.ts` — apply → re-analyze → finding resolves.
