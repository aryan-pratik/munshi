# Engine

Pure TypeScript in `src/engine`. No I/O, no LLM, no `Date.now()`, no `process.env`.
Time comes only from `windows.now(world)`, which is `parseISO(meta.day0) + (meta.days - 1)`, that is
day0 + 89 on the 90-day seed. It never reads the clock or the environment. `MUNSHI_DEMO_NOW` is read
only by `pnpm seed`, which sets `meta.day0 = date - 89`; to move the demo date run
`MUNSHI_DEMO_NOW=<date> pnpm seed` and commit `world.json`. The demo date is Thursday 8 October 2026,
so day0 = 11 July 2026 and day d = 11 Jul + d (day 77 = 26 Sep, day 79 = 28 Sep).
Everything here is unit-tested against the committed seed.

## 1. Metrics (`engine/metrics.ts`)

Daily series derived from records, memoised per `World`. `METRICS` is exported from
`engine/metrics.ts` as `Record<MetricId, MetricMeta>`:

```ts
type MetricMeta = { id: MetricId; label: string; unit: 'inr' | 'count' | 'pct' | 'days'; goodWhen: 'up' | 'down' };
```

The UI reads `label` (the strip name) and `goodWhen` (Delta colour) from it and never keeps its own
list. Only `deliveryDelayAvg`, `complaints`, `receivablesOverdue` and `subscriptionSpend` are
`goodWhen: 'down'`; more ad spend is not bad, so `adSpend` is `'up'`.

| MetricId | Label | goodWhen | Derived from | Unit |
|---|---|---|---|---|
| `adSpend` | Ad spend | up | `AdDay.spend` | inr |
| `sessions` | Sessions | up | `AdDay.sessions` + `TrafficDay.organic` | count |
| `d2cCvr` | Site conversion | up | `orders(d2c) / sessions`, site-wide | pct |
| `landingCvr` | Landing conversion | up | D2C orders that entered on a campaign or collection landing page / sessions that entered there (`Order.viaLanding`, `TrafficDay.landingSessions`) | pct |
| `leadsNew` | New leads | up | `Lead.createdAt` (wholesale) | count |
| `leadsContacted` | Leads contacted | up | `Lead.lastContactedAt` | count |
| `leadCvr` | Lead conversion | up | quoted leads won within 14 days / quoted leads (seed 0.60) | pct |
| `ordersD2C` | D2C orders | up | `Order` | count |
| `ordersWholesale` | Wholesale orders | up | `Order` | count |
| `revenue` | Revenue | up | `Order.total` | inr |
| `revenueD2C` | D2C revenue | up | `Order.total` | inr |
| `revenueWholesale` | Wholesale revenue | up | `Order.total` | inr |
| `aov` | Order value | up | revenue / orders | inr |
| `deliveryDelayAvg` | Delivery delay | down | `Shipment.deliveredAt - promisedAt`, indexed by dispatch date so the series breaks on the day a courier changes | days |
| `complaints` | Delivery complaints | down | `Ticket.category='delivery'` | count |
| `repeatRate` | Repeat rate | up | second order within 60d | pct |
| `cashBalance` | Cash | up | `BankTxn` cumulative | inr |
| `receivablesOverdue` | Overdue invoices | down | `Invoice` past due, unpaid | inr |
| `subscriptionSpend` | Subscriptions | down | `Subscription.monthlyINR` | inr |

`compareWindows(world, metric, { current, previous })` returns `{ current, previous, delta, deltaPct }`.
Default windows: 14 days vs the preceding 14 (current = days 76 to 89, previous = days 62 to 75).

Every series is full length (all 90 days), not just the two windows. Onset detection (section 3)
needs the days before the windows as its baseline, and `stripSeries(world, metric, window)` returns
the 28 points (previous 14, then current 14) that the UI draws.

## 2. Detectors (`engine/detectors/*`)

Signature: `(world: World, ctx: DetectorCtx) => Finding[]`. Each file exports one detector plus its
thresholds from `data/rules/thresholds.ts`.

### 2.1 The finding model

- `Finding.id = ${detector}:${primaryRef.source}:${primaryRef.kind}:${primaryRef.id}`, where
  `primaryRef = evidence[0]`. Aggregate detectors (`staleHighValueLeads`, `overdueInvoices`,
  `zombieSubscription`, `renewalDue`) use the literal `all` as the ref id and take source and kind
  from `evidence[0]`. Ids are deterministic: the same world gives the same ids.
- `Finding.window: Window`, `Finding.series`, `Finding.onset` (section 2.3).
- `impactINR >= 0`: rupees at stake that acting can recover or avoid, as a 30-day run-rate unless the
  detector says otherwise. It is the Worth column, the ranking key and what the brief sums.
- `exposureINR?`: structural exposure. Shown in the expanded row and, when `impactINR` is 0, in the
  Worth cell in ink-2 as "Exposure ₹16,74,000". Never ranked, never summed. There is no
  `valueAtStakeINR` and no `severityRank`.
- `analyze(world)` runs all detectors and sorts by `impactINR` desc, then severity (critical, high,
  medium, info), then id. It de-duplicates by `(detector, primaryRef)`.
- `deliverySLA` does not emit a Today finding when a `complaintSpike` exists for the same courier;
  its evidence is folded into the `complaintSpike` finding.
- `Finding.group: 'needs-you' | 'worth-knowing'`: needs-you when severity is critical or high, else
  worth-knowing. The lead item is the first needs-you finding in sort order, which is the one with the
  highest `impactINR`.
- "Handled" is not produced by `analyze()`. `handledFindings(seed, actions): { finding: Finding; action: Action }[]`
  (in `engine/index.ts`) takes, for each action `a` at index `i`, the finding with id `a.findingId`
  from `analyze(replay(seed, actions.slice(0, i)))` (the pre-action snapshot) and uses `a.approvedAt`
  as the handled time. The store's `applyAction` appends to `actions[]`; Today is `analyze(current world)`
  merged with `handledFindings`.
- Brief total = sum of `impactINR` over open findings in needs-you and worth-knowing, excluding
  `cashCrunch`. Its shortfall is a consequence of overdue invoices and is shown on Horizon; summing
  it would count the same rupees twice.

### 2.2 The detectors

| Detector | Fires when | impactINR |
|---|---|---|
| `staleHighValueLeads` | wholesale lead, est. value ≥ ₹10k, no contact ≥ 48h, not lost | Σ est. value × `leadCvr` quoted-to-won rate 0.60 (seed: 7 leads, ₹1,84,000 × 0.60 = ₹1,10,400) |
| `overdueInvoices` | invoice unpaid > dueDate | Σ outstanding (seed: 3 invoices, ₹82,400) |
| `conversionDrop` | `landingCvr` or `leadCvr` Δ ≤ −15% vs previous window | lost orders per day × 30 × aov (seed: 2.21 × 30 × ₹1,250 ≈ ₹83,000) |
| `complaintSpike` | `complaints` Δ ≥ +25% and at least 5 more than the previous window | affected customers (NCR shipments the new courier has carried since the change) × `repeatRate` × aov (seed: 55 × 0.22 × ₹1,250 ≈ ₹15,100) |
| `costCreep` | recurring `Bill` from same vendor ↑ ≥ 10% vs 3-month median | Δ × 12 (seed: ₹400 × 12 = ₹4,800) |
| `zombieSubscription` | `Subscription` active, `lastUsedAt` ≥ 60d ago | Σ monthly × 12, one aggregated finding (seed: (2,100 + 1,650) × 12 = ₹45,000 for Figma and Zapier) |
| `customerConcentration` | one customer ≥ 25% of 90-day revenue | `impactINR` 0; `exposureINR` = that customer's 90-day revenue (seed: Saffron Stories, 31% of ₹54,00,000 = ₹16,74,000). Not annualised. |
| `cashCrunch` | projected `cashBalance` < buffer within 30d (uses Horizon projection) | shortfall under the ₹2,00,000 buffer (seed: ₹61,000). Not in the brief total. |
| `stockoutRisk` | SKU `onHand / dailyVelocity` < lead time | stockout days × sets per day × price (seed: 7 × 3 × ₹1,450 = ₹30,500) |
| `adEfficiency` | CAC Δ ≥ +20% | 30-day spend × (1 − 1/1.2) (seed: ₹90,000 → ₹15,000) |
| `renewalDue` | `Obligation` (insurance, GST, domain, lease) due ≤ 21d | Σ `Obligation.penaltyINR`, one aggregated finding (seed: GST 10,000 + insurance 4,000 + domain 1,200 = ₹15,200) |
| `deliverySLA` | `deliveryDelayAvg` > 1.5d for a courier | complaint-linked churn estimate; folded into `complaintSpike` when one exists for the same courier |

The seed Today has exactly 11 findings (the full table with severities and groups lives in
`docs/DATA-MODEL.md`). The impact figures are generator targets, jitter of ±10% is allowed, but
`analyze()[0]` must be `staleHighValueLeads` and the count must be 11. The brief total on the seed is
₹4,01,400, read as "about ₹4 lakh".

Rules for new detectors: title contains the number; `explain` is writable without an LLM;
`evidence` is non-empty; a test asserts it fires on the seed and doesn't on a neutral world.

### 2.3 Every finding says since when

Each detector already knows which metric or records it is looking at, so it also fills `onset` and
`series` (the Today row draws them as its "Since" strip):

| Kind | Detectors | `series` | `onset` |
|---|---|---|---|
| Metric-driven | `conversionDrop`, `complaintSpike`, `adEfficiency`, `deliverySLA` | the metric's 28 strip points | `detectOnset` on that metric (section 3.1) |
| Record-driven | `staleHighValueLeads`, `overdueInvoices`, `costCreep`, `zombieSubscription`, `customerConcentration` | a daily series built from the records: leads waiting past 48h, overdue ₹, the vendor's bill amount as a step, days since last use, the top customer's revenue share | the record that started it: first lead to cross 48h, earliest missed due date, first bill at the higher amount (snapped to its `plan_upgraded` event), `lastUsedAt`, first day the share reached 25% |
| Forward-looking | `cashCrunch`, `stockoutRisk`, `renewalDue` | the projection: cash balance, days of cover, days to the due date | `null`. Nothing has begun yet; `window.to` is the due date and the row reads "in 12 days" instead of a date, drawn with no tick |

`series` ends at `window.to` and has 28 daily points. When the onset is older than that (the
internet bill changed on day 60), the detector extends the series back, to at most 90 points, so the
onset is always inside the strip. A finding with no usable series shows text only ("Unused for 84 days"
as the fallback form). A strip never decorates: it always has a real series. An aggregated zombie
finding uses the earliest onset: Figma `lastUsedAt` is day 5 (unused 84 days), Zapier day 18 (71 days).

## 3. Causal graph (`engine/graph/*`)

A hand-authored DAG whose nodes are all `MetricId`s (`graph/dag.ts`). Edges carry a `sign` (+1 or −1)
and a prior `weight`; unless noted, weight is 1.0 and sign is +1.

```
adSpend ─► sessions ─► ordersD2C ─► revenueD2C ─► revenue ─► cashBalance
                          ▲   ▲                     ▲
          landingCvr ─────┘   │ (+1, weight 0.3)    │
          repeatRate ─────────┘ (+1, weight 0.5)    │
leadsNew ─► leadsContacted ─► leadCvr ─► ordersWholesale ─► revenueWholesale
deliveryDelayAvg ─► complaints ─(sign −1)─► repeatRate
```

`landingCvr → ordersD2C` has weight 0.3, `repeatRate → ordersD2C` weight 0.5, and
`complaints → repeatRate` has sign −1 (more complaints, lower repeat rate). `revenueD2C` and
`revenueWholesale` both feed `revenue`. There are no `organic`, `invoicesPaid` or `stockouts` nodes,
and `aov` is not a node.

### 3.1 Onset detection (`graph/onset.ts`)

The answer to "why did X change?" is drawn as an OnsetTrail: metric strips stacked on one shared
axis, each with the day its change began marked, so the reader sees the cause move first and the
effect follow. That only works if the engine can say when each metric's change began.

`detectOnset(series, window, { stripDays = 28 }): string | null`

- `series` is the metric's full daily series. `end = window.to`.
- The **strip** is the last `stripDays` days ending at `end`. The **baseline** is the 28 days before
  the strip. The baseline sits before the strip, not in the previous window, because a change that
  began 15 days ago is already inside the previous window.
- Remove the weekday pattern: `r[d] = value[d] / mean(baseline values on the same weekday) − 1`,
  winsorised to ±3 sigma, where sigma is the SD of the baseline `r`, floored at 1.5%.
- `direction = sign(mean(last 14 days of the strip) − mean(first 14 days of the strip))`.
- For each candidate day `d` in the strip with at least 3 days before it and at least 5 days after it
  (`n1` days before, `n2` days from `d` to `end`):
  `delta = mean(r[d..end]) − mean(r[strip start..d−1])` and
  `z = direction × delta / (max(sigma, 1.5%) × sqrt(1/n1 + 1/n2))`. Keep the `d` with the largest `z`.
- Accept only if all hold, otherwise return `null`:
  `direction × delta >= max(3%, 1.5 sigma)`,
  `direction × (median after − median before) >= max(3%, 1.5 sigma)`, and `z >= 5`.
- A change newer than 5 days is too fresh to date and returns `null`.
- Stories whose onset is older than 28 days (S7, day 60) use `stripDays` up to 58 (strip days 32 to 89,
  baseline days 4 to 31). The strip never exceeds 62 days, so a 28-day baseline fits in 90 days.

Deterministic, no statistics library.

**Recovery on simulated data.** Verified on 500 simulated seeds with daily multiplicative noise
N(0, 2.5%) on sessions and orders, 2% on spend, per-shipment delay SD 0.4 days, and integer counts
rounded with a carried remainder. Real data is noisier and returns `null` more often.

| Story | Series, planted day | Within 1 day of planted |
|---|---|---|
| S2 | `adSpend`, day 77 | 92.8% (97% exact with event snap) |
| S2 | `sessions`, day 77 | 96.4% (0.6% null) |
| S2 | `ordersD2C`, day 78 | 98.6% |
| S3 | `landingCvr`, day 79 | 99.8% (100% with snap) |
| S5 | `deliveryDelayAvg`, day 74 (previous window) | 95.2% (98% exact with snap) |
| S7 | bill step, day 60, extended strip | 100% |

Flat noise gives a false onset in 5 of 500 seeds (any of sessions, orders, landingCvr); a one-day +60%
spike in 7 of 500. The tests assert on the committed seed (exact within 1 day) and add a statistical
test over 200 seeds expecting at least 90% within 1 day.

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
lets the trail show sessions falling the same day (day 77) and orders a day later (day 78, purchase lag).

**Null is an answer.** A null onset stays null and is drawn as "timing unverified". It is never
back-filled from an event or guessed from a neighbour. `complaints` is a small count (under one a day),
so its onset may be null on real data; the seed S5 test covers `deliveryDelayAvg` only.

### 3.2 The walk (`graph/walk.ts`)

`walkCausalGraph(world, target, window)`:

1. Compute Δ% and `onset` (with event snap) for `target` and every ancestor, current window vs previous.
2. Score each edge `from→to` by **co-movement**:
   `score = [sign(Δfrom) × sign(Δto) == edge.sign ? 1 : 0] × min(|Δfrom|, |Δto|) / |Δto| × edge.weight`.
   On the seed, for `ordersD2C` (Δ −14%): `sessions` scores 0.46 (primary); `landingCvr` scores
   min(27.7, 14)/14 = 1.0 × 0.3 = 0.30 (loses, becomes the branch). Ties go to the earlier onset, then
   graph order.
3. Apply **temporal precedence**, the cheap honesty check. A cause that started after its effect
   cannot have started it. An edge may carry the primary path only if
   `onset(from) ≤ onset(to) + 1 day`. An ancestor that fails this is rejected from the primary walk
   and kept only as a branch candidate. An ancestor with a null onset has its edge score halved.
4. Greedy-walk the strongest admissible ancestor path from `target` until Δ < 3% or a root is
   reached. That is the **primary chain**. Order its nodes by onset (ties keep graph order): earliest
   cause first, `target` last.
5. **Branch rule.** An ancestor becomes a branch only if it is a direct parent of a node on the
   primary path, its edge sign is satisfied, |Δ| ≥ 10%, and its onset is inside the strip. There is at
   most one branch per walk (the strongest edge score). A branch is a second driver that joined
   later, so its onset may come after the target's. It is returned as its own `Chain` in `branches`,
   whose last edge `to` is the **rejoin node**, a node of the primary chain. Deeper ancestors
   (`deliveryDelayAvg`, `complaints`, `repeatRate`) are not branches of a `revenueD2C` walk; the S5
   trail is its own walk with target `repeatRate` (or `complaints`).
6. Attach evidence: for each node, the top records driving the delta (the ad campaign paused, the
   theme update event, the courier with the delays), plus `onsetEvidence` from the snap.

Output is a `Chain` (types in `docs/ARCHITECTURE.md`). `Chain.id = ${target}:${window.to}`;
`Chain.edges` is `{ from; to; sign: 1 | -1; strength: number }[]`. Each node carries `delta`, the
`series`, `onset`, `onsetEvidence` and `evidence`. The model's job in live mode is to *choose*
between chains when scores are close and write the narrative; its final output refers to `Chain.id`
and it does not alter deltas or onsets. In scripted mode the chain is precomputed by running this function.

**Demo target.** The asked-about metric is `revenueD2C` (label "D2C revenue"). Total revenue fell only
about 6% because wholesale held flat (wholesale revenue in the two windows within ±2%), so the
answer first calls `compareWindows(revenue)` and `compareWindows(revenueD2C)` (down 14%), then
`walkCausalGraph(target: 'revenueD2C')`.

**OnsetTrail groups derived from the Chain.** Three groups, top to bottom:

1. Primary path: the primary `nodes` before the rejoin node, in onset order.
2. "Also contributing" (drawn only when `branches` is non-empty): the nodes of each branch in branch
   order, each ordered by onset.
3. Shared effect: the rejoin node and all primary nodes after it, `target` last.

Group order wins over strict onset order: the branch onset (day 79) is after `ordersD2C` (day 78),
but the draw order is group order. On the seed the trail is five strips: `adSpend` (Ad spend),
`sessions` (Sessions); `landingCvr` (Landing conversion); `ordersD2C` (D2C orders), `revenueD2C`
(D2C revenue). Window deltas (mean over 300 simulated seeds, days 76 to 89 vs 62 to 75): `adSpend`
−7%, `sessions` −6%, `ordersD2C` −14%, `revenueD2C` −14%, `landingCvr` 4.9% to 3.5% (planted 4.8% to
3.1%; window means include the 4 pre-change days), total revenue about −6% (D2C is 44% of revenue).
Landing-entry orders are about 30% of D2C orders, so sessions −6% and landing conversion −28% on 30%
of orders give orders about −14%.

**What this shows and what it doesn't.** Co-movement along a hand-authored business graph, the
cause's onset on or before the effect's, and a linked event record. That is evidence for a likely
cause. It is not proof of causation, and the product never says it is: narratives say "likely",
and any node missing evidence or an onset is labelled unverified.

## 4. Simulator (`engine/simulator/*`)

A monthly steady-state model calibrated from the last 30 days of the world. Deliberately
non-linear so "find best" has something to find.

### 4.1 Levers and units

`Levers` are stored in percent points (`pricePct` 5 means +5%). `model.ts` converts once:
`p = pricePct/100`, `m = marketingPct/100`, `i = inventoryPct/100`, `p⁺ = max(0, p)`.

- UI slider ranges: `pricePct ∈ [−20, 30]`, `marketingPct ∈ [−50, 100]`, `hires ∈ [0, 4]`,
  `inventoryPct ∈ [−30, 50]`, `followUpHours ∈ {4, 12, 24, 48}`.
- `BASE_LEVERS = { pricePct: 0, marketingPct: 0, hires: 0, inventoryPct: 0, followUpHours: 48 }`.

### 4.2 Base inputs

`base.*` is computed from the last 30 days of the seed. The values below are the targets the generator is calibrated to; the committed seed lands within 3% of each (`pnpm seed` prints the simulator row, and `tests/engine/simulator.test.ts` asserts the tolerance).

| Symbol | Meaning | Value | From |
|---|---|---|---|
| `P0` | paid sessions | 11,400 | Σ `AdDay.sessions` |
| `O0` | organic sessions | 12,600 | Σ `TrafficDay.organic` |
| `ordersD0` | D2C orders, 30d | 633 | `Order` |
| `c0` | D2C conversion | 2.64% | `ordersD0 / (P0 + O0)` |
| `aovD`, `aovW` | order value, D2C and wholesale | ₹1,250, ₹21,600 | `Order` |
| `R0` | wholesale orders per month from existing accounts | 30 | `Order` |
| `L0` | new wholesale leads per month | 27.8 | `Lead` |
| `w0` | lead win rate | 0.60 | `leadCvr` |
| `ordersW0` | `R0 + L0 × w0 × boost(48)` | 46.7 | derived |
| `cogsD`, `cogsW` | unit cost / price | 0.40, 0.50 | `products` |
| shipping | per D2C order | ₹90 | `Shipment` / bills |
| `M0` | marketing per month | ₹90,000 | Σ `AdDay.spend` (₹3,000 a day) |
| `payroll0` | payroll, includes the 4 packers | ₹4,10,000 | `Bill` / `BankTxn` |
| salary per hire | | ₹18,000 | seed |
| `fixed` | rent, software, couriers' fixed fees, other bills | ₹2,80,000 | `Bill`, `Subscription`, `BankTxn` |
| `inventoryValue` | | ₹9,00,000 | `products` |
| `staff0` | `meta.business.staffOps` | 4 | seed meta |
| `ordersPerPersonPerMonth` | `(ordersD0 + ordersW0) / (staffOps × 0.96)` | 177.0 | derived; base utilisation today is 96% |
| `cr0` | complaint rate: tickets the business itself caused (`quality`, `other`), not the courier's `delivery` tickets | 1.25% of orders | `Ticket` |
| `r0` | repeat rate | 0.22 | `repeatRate` |
| `stockHeadroom` | on-hand covers 12% more than a month of velocity | 1.12 | `products` |
| `cash0` | bank balance today | ₹6,40,000 | `BankTxn` |
| `A0` | wholesale accounts | 40 | `Customer` |
| `festiveLift` | `meta.business.festiveLift`; next 30 days include pre-Diwali demand | 1.06 | seed meta |

`festiveLift` applies to every scenario including Base, so Base utilisation next month is
96% × 1.06 = 102%.

Constants: `boost(followUpHours)` 48 → 1.00, 24 → 1.15, 12 → 1.28, 4 → 1.35; `followUpCost` per month
48 → ₹0, 24 → ₹9,000, 12 → ₹21,000, 4 → ₹45,000; elasticities `ε_d2c = 1.3`, `ε_ws = 0.6` (price
sensitivity is applied once, as the elasticity); marketing exponent 0.75; account loss 0.8 × `A0` × `p⁺`;
complaint multiplier 8 × overload; delay 2.5 days per 100% overload (note only).

### 4.3 Mechanics (`simulator/model.ts`)

```
traffic     = P0*(1+m)^0.75 + O0                      // diminishing returns on paid only
newD        = traffic * c0 * (1+p)^(-1.3) * festiveLift
accKeep     = 1 - 0.8*p+                               // share of wholesale accounts retained
newW        = accKeep * (R0 + L0*w0*boost(h_fu)) * (1+p)^(-0.6) * festiveLift
demand      = newD + newW
capacity    = (staff0 + hires) * ordersPerPersonPerMonth
overload    = max(0, demand/capacity - 1)
complaintRt = cr0 * (1 + 8*overload)
dChurn      = 0.7*p+ + 1.5*(complaintRt - cr0)         // change vs base churn, fraction
rho         = (1 + r0 - dChurn)/(1 + r0)               // retention multiplier, 1 at base
stockUnits  = (1+i) * (ordersD0 + ordersW0) * stockHeadroom
fulfil      = min(1, capacity/demand, stockUnits/(demand*rho))
ordersD     = newD*rho*fulfil ; ordersW = newW*rho*fulfil
revenue     = (ordersD*aovD + ordersW*aovW) * (1+p)
cogs        = ordersD*aovD*cogsD + ordersW*aovW*cogsW  // unit cost does not rise with price
profit      = revenue - cogs - M0*(1+m) - (payroll0 + hires*salary) - fixed
              - ordersD*shipping - 0.02*inventoryValue*(1+i) - followUpCost
outflow     = the same costs (cash costs)
cashRunwayDays = cash0 / (outflow/30)                  // days current cash covers this scenario's monthly costs with no sales
```

`cogs` uses the pre-price unit cost (order value times the cogs ratio), so a price rise lifts margin.

### 4.4 Outcome mapping

`Outcome = { revenue, customers, churnPct, profit, cashRunwayDays }` per month, engine computed; they
are the five OutcomeTable rows (Revenue, Customers, Churn, Profit, Cash runway in days).

- `revenue` and `profit` as above.
- `churnPct = (0.06 + dChurn) × 100` (6% base monthly churn).
- `customers = ordersD / 1.08 + A0 × (1 − 0.8 × p⁺)` (D2C buyers plus retained wholesale accounts).
- `cashRunwayDays` as above.

`simulate(world, levers) → Scenario = { levers, outcome: Outcome, risk: 'low' | 'medium' | 'high', riskScore: number, notes: string[] }`.
`notes[]` are short engine-authored facts the UI shows under the outcome and the model can quote, for
example "Fulfilment at 102% of capacity, so delays rise" or "About 5 wholesale accounts would likely
leave" (`A0 × 0.8 × p⁺`, which is 4.8 at +15%).

**Risk.** `riskScore = (runway < 10 days ? 1 : 0) + (dChurn×100 > 5 ? 2 : dChurn×100 > 2 ? 1 : 0) + (overload > 0.15 ? 2 : overload > 0.05 ? 1 : 0)`.
`risk`: low for 0 to 1, medium for 2, high for 3 or more.

The What if screen shows a comparison table: Base, Scenario, Change. Base is
`simulate(world, BASE_LEVERS)`, memoised per world. `simulate` is a few dozen arithmetic
operations, so it runs on every slider input event and the table updates instantly, with no
count-up.

### 4.5 Optimizer (`simulator/optimize.ts`)

Exhaustive grid, 1,800 = 5 × 6 × 5 × 3 × 4:

| Lever | Values |
|---|---|
| `pricePct` | −5, 0, 5, 10, 15 |
| `marketingPct` | −25, 0, 25, 50, 75, 100 |
| `hires` | 0, 1, 2, 3, 4 |
| `inventoryPct` | 0, 20, 40 |
| `followUpHours` | 48, 24, 12, 4 |

Objective: `profit − riskPenalty`, with penalty low 0, medium ₹25,000, high ₹60,000 per month.
`optimize(world)` returns `{ scanned: 1800, all: { levers; profit; riskScore }[], pareto, top3 }`
where `top3` carries a one-line reason each. The What if scatter plots `all` (x = `riskScore` 0 to 5,
y = profit). It runs in under 50 ms client-side; the UI animates the scan count anyway ("1,800
scenarios checked") because watching the number race is the demo. That counter is the only animated
number in the product.

### 4.6 Verified results

On the committed seed:

- **Base**: revenue ₹18,70,462, profit ₹1,60,259, customers 649, churn 6.3%, runway 11.2 days,
  utilisation 102% (overload 1.8%), risk low.
- **Top strategy**: price +5, marketing +75, hire 1, inventory +20, follow up within 12 hours.
  Revenue ₹21,19,620, profit ₹2,28,889 (+42.8%, "about 43%"), customers 745, churn 9.5%, runway
  10.2 days, risk low, overload 0.
- Best without a hire (price +5, marketing 0, no hire, 12h): profit ₹2,08,511.
- Removing each lever from the best costs profit: price −₹6,100; marketing −₹41,978; hires
  −₹1,78,759; inventory −₹68,122; follow-up −₹32,259 (every lever matters).
- Price +15 alone: revenue ₹16,44,071, profit ₹1,49,155 (−7%), customers 509 (−22%), churn 16.5%,
  risk medium.

These are the results on the calibration targets in 4.2 fed through 4.3 exactly. The committed seed
reproduces them within 3%: base profit ₹1,60,922, the same top strategy at ₹2,33,608 (+45%), price
+15 at ₹1,52,463. `pnpm seed` prints the current figures.

Robustness: the top strategy has `hires = 1` in 151 of 200 draws with ±10% jitter of marketing,
salary, fixed, aov, leads and orders, so the generator pins the seed and `simulator.test.ts` asserts
on the committed seed.

**Calibration rule.** `ordersPerPersonPerMonth`, `festiveLift` and the cost fields are set in the
seed so the results above hold. If they do not, adjust the seed fields, never the coefficients.

## 5. Playbooks (`engine/playbooks/*`)

```ts
interface Playbook {
  id: PlaybookId;
  appliesTo: DetectorId[];
  plan(world, finding): Step[];            // what will happen, in order
  drafts(world, finding): Draft[];         // engine-templated; live mode lets the model rewrite in tone
  apply(world, finding, approved: Draft[]): Effect[];   // pure mutation descriptors
  expectedImpact(world, finding): { inr: number; horizonDays: number; basis: string };
  labels(n: number): { review: string; approve: string; working: string; done: string };
}
```

`Effect` is the union defined in `docs/ARCHITECTURE.md`: `{ op: 'set'; collection; id; patch }` or
`{ op: 'create'; collection; record }`, where `collection` is a `World` array key.

`labels(n)` keeps an action's name constant from the first click to the confirmation. For
`followUpLeads` with 7 drafts: `review` "Review 7 drafts" (the button on the finding), `approve`
"Approve and send 7" (the button in the Act sheet), `working` "Sending 7…" (the loading state of
that button), `done` "7 follow-ups sent" (the Done state, the toast and the activity entry; the
ActionTimeline appends "2 minutes ago"). The UI never invents its own wording for these.
`followUpLeads.expectedImpact.inr` equals the finding's `impactINR` (₹1,10,400, 14 days).

| Playbook | Steps | Effects |
|---|---|---|
| `followUpLeads` | read thread → draft per lead → approve → send (WhatsApp/email mock) → set reminder → update CRM | `Lead.lastContactedAt`, `Lead.stage`, `Task` created |
| `collectOverdue` | tiered reminders (friendly → firm → call task) | `Invoice.reminderSentAt`, `Task` for the two largest |
| `cancelSubscription` | confirm owner, cancel, note savings | `Subscription.status`, `Finding` resolves |
| `escalateCourier` | message courier account manager with affected AWBs, propose SLA | `Ticket.status`, `Message` logged |
| `reorderStock` | PO draft to supplier for at-risk SKUs | `create` a `PurchaseOrder` in `World.purchaseOrders` (starts empty) |
| `scheduleRenewal` | create task + calendar block, draft renewal email | `Task`, `Obligation.handledAt` |

`applyAction(world, action)` in the store replays `effects` immutably, and `replay(seed, actions)`
does the same over the committed seed (the server is stateless and replays the client's `actions[]`).
After apply, `analyze()` re-runs and the finding either resolves or downgrades, so the Today page
visibly changes. Resolved findings appear under Handled via `handledFindings` (section 2.1). That is
the closing beat of the demo.

## 6. Horizon projection (`engine/horizon.ts`)

Built in Phase 2, because the `cashCrunch` detector and Today's `CashLine` both read it; the Horizon
page's `RunwayCurve` (Phase 7) reuses it.

30-day cash projection: `cashBalance[today]` + expected inflows (invoices by due date × historical
on-time rate, D2C revenue run-rate) − known outflows (`Obligation`s, payroll, recurring bills,
subscriptions). Emits `RunwayPoint[]` and `Upcoming[]` (each pinned to the curve with its ₹ and
source). The "Assume overdue invoices are collected" switch on the Horizon page adds the overdue
invoices as an inflow to produce the second series.

## 7. Testing

Phase 1 needs no Phase 2 code, so `seed.test.ts` checks only records. Detector, chain, simulator and
onset checks arrive in Phase 2.

- `tests/engine/seed.test.ts` (Phase 1): seed loads, schema-valid, deterministic, size ≤ 1.5 MB, and
  per-story record facts (counts, dates, sums computed from records).
- `tests/engine/stories.test.ts` (Phase 2): checks each story's `expect`. The union is
  `{ detector, minImpact }` (S1, S3 to S10, S12), `{ chain: { target, nodes, branch } }` (S2) and
  `{ simulator: { hires } }` (S11, top strategy has `hires = 1`).
- `tests/engine/detectors.test.ts`: one `it` per detector, fires on seed with expected magnitude band,
  silent on `neutralWorld()`. Also asserts `analyze()[0]` is `staleHighValueLeads`, the seed has exactly
  11 findings, the brief total is ₹4,01,400 (excluding `cashCrunch`), every finding has a non-empty
  `series`, and an `onset` that is either inside that series or null for the three forward-looking
  detectors; `deliverySLA` folds into `complaintSpike` for the same courier; ids are deterministic.
- `tests/engine/onset.test.ts`: on the seed, the onset equals the planted event day within 1 day for
  S2 (`adSpend` day 77, `sessions` day 77, `ordersD2C` day 78), S3 (`landingCvr`, day 79), S5
  (`deliveryDelayAvg`, day 74) and S7 (the Airtel bill series behind `costCreep`, day 60, extended
  strip); the anchored ones carry their `Event` as `onsetEvidence`; `ordersD2C` begins on or after
  `sessions`; a flat series returns null; a one-day spike returns null; a change newer than 5 days
  returns null; the 200-seed statistical test expects at least 90% within 1 day.
- `tests/engine/graph.test.ts`: walk from `revenueD2C` yields primary `adSpend, sessions, ordersD2C,
  revenueD2C` and exactly one branch rooted at `landingCvr` rejoining at `ordersD2C`; walk from
  `repeatRate` yields `deliveryDelayAvg, complaints, repeatRate` using the sign −1 edge; precedence
  rejection works (a parent whose onset is 3 days after its child's is not on the primary path); a
  parent with a null onset loses to an equally strong parent that has one.
- `tests/engine/simulator.test.ts`: directional sanity (more marketing, more traffic), capacity ceiling
  kicks in, the grid has 1,800 points, the optimizer's best beats base, the top strategy has
  `hires = 1` and overload 0, deterministic.
- `tests/engine/playbooks.test.ts`: apply → re-analyze → finding resolves and appears in
  `handledFindings`; `reorderStock` creates a `PurchaseOrder` in `World.purchaseOrders`; `labels(7)`
  returns the four strings above.
