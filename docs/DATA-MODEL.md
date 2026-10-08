# Data model & the seed world

The whole product stands on one deeply seeded business. If the seed is shallow, the demo is
shallow. Spend real effort here.

## 1. `World`

```ts
type World = {
  meta: { business: Business; generatedAt: string; day0: string; days: number; seed: number };
  sources: Source[];            // what's "connected" — shown in Vault
  customers: Customer[];        // D2C buyers + wholesale accounts (type: 'd2c' | 'wholesale')
  products: Product[];          // ~24 SKUs across ceramics / linen / lighting, with unitCost, price, onHand, leadTimeDays
  orders: Order[];              // ~1,900 D2C + ~140 wholesale over 90 days; D2C orders carry viaLanding: boolean
  shipments: Shipment[];        // one per D2C order; courier, promisedAt, deliveredAt
  leads: Lead[];                // wholesale pipeline: stage, estValueINR, createdAt, lastContactedAt, thread: RecordRef[] (refs to messages)
  messages: Message[];          // WhatsApp/email threads (leads, suppliers, couriers)
  invoices: Invoice[];          // wholesale, 30-day terms; some overdue
  bills: Bill[];                // vendor bills: internet, electricity, packaging, rent
  subscriptions: Subscription[];// SaaS: Shopify, Zoho, Canva, Notion, Figma(!), Zapier, …
  adDays: AdDay[];              // per day per campaign: spend, impressions, clicks, sessions
  trafficDays: TrafficDay[];    // per day: organic sessions, and landingSessions (entered on a campaign or collection landing page)
  tickets: Ticket[];            // support: category (delivery/quality/other), sentiment, orderRef
  bankTxns: BankTxn[];          // derived from the above + payroll + rent; gives cashBalance
  obligations: Obligation[];    // GST filing, shop insurance, domain, lease renewal, loan EMI
  events: Event[];              // things that happened on a known day: campaign_paused, theme_updated, courier_changed, plan_upgraded, price_changed
  tasks: Task[];                // created by playbooks
  purchaseOrders: PurchaseOrder[]; // created by reorderStock; starts empty
};
```

`PurchaseOrder = { id; supplier; lines: { sku; qty }[]; createdAt; status: 'draft' | 'sent' }`
(see `docs/ARCHITECTURE.md`, Key types).

**Dates are stored as ISO strings but generated as day offsets from `meta.day0`.**
`meta.day0` is set at generation time by `pnpm seed` to `MUNSHI_DEMO_NOW − 89`. The env var is
read only by `pnpm seed`, never by the running app. The app's `now(world)` is
`parseISO(meta.day0) + (meta.days − 1)`, which is day0 + 89, so the world always ends "today".
The demo date is Thursday 8 October 2026, so day0 is Saturday 11 July 2026 and day d is
11 July + d (day 77 is 26 Sep, day 79 is 28 Sep, day 74 is 23 Sep, day 60 is 9 Sep). To change
the demo date: `MUNSHI_DEMO_NOW=<date> pnpm seed`, then commit `world.json`.

### Business totals (90 days, targets)

- Revenue ₹54 lakh (₹54,00,000).
- D2C: 44% of revenue, ₹23.75 lakh, about 1,900 orders at an order value of ₹1,250.
- Wholesale: ₹30.25 lakh, about 140 orders. Saffron Stories accounts for about 30 of them
  (31% of revenue, S6).

### Seed base fields the simulator reads

The simulator derives its base from the last 30 days of the seed (`base.*`); these are the values
on the committed seed. If a result drifts, adjust these seed fields, never the coefficients.

- `meta.business.staffOps = 4` (packers) and `ordersPerPersonPerMonth = 177`, so base
  utilisation is 96% today.
- `meta.business.festiveLift = 1.06`: the next 30 days include pre-Diwali demand. It applies to
  every scenario including Base, so next month's base utilisation is 96% × 1.06 = 102%.
- Paid sessions 11,400 (sum of `AdDay.sessions`), organic sessions 12,600 (sum of
  `TrafficDay.organic`), 633 D2C orders, site conversion 2.64%, D2C order value ₹1,250,
  wholesale order value ₹21,600.
- 30 recurring wholesale orders a month from existing accounts, 27.8 new leads a month, lead
  conversion 0.60, 40 wholesale accounts.
- Unit cost to price: 0.40 D2C, 0.50 wholesale (from `products`); shipping ₹90 per D2C order.
- Marketing ₹90,000 a month (₹3,000 a day of `AdDay.spend`); payroll ₹4,10,000 (includes the 4
  packers); salary per hire ₹18,000; fixed costs ₹2,80,000 (from `bills`, `subscriptions`,
  `bankTxns`); inventory value ₹9,00,000; stock headroom 1.12.
- Complaint rate 1.25% of orders; repeat rate 0.22; cash today ₹6,40,000 (`bankTxns` balance).

Every record has `id`, `source: SourceId`, and `createdAt`. `RecordRef = { source, kind, id }`.

`Event = { id, source, kind, at, label, anchors }`. `at` is the day it happened. `label` is the
plain sentence the UI shows on the flag ("Diwali Early campaign paused"). `anchors` is the metric
the event acts on directly, or `{ vendor }` for a bill. Events are how the engine ties the start
of a change to something a person can check (see `docs/ENGINE.md`, Onset detection).

## 2. Sources (what the Vault shows as "connected")

| SourceId | Type | Provides |
|---|---|---|
| `shopify` | commerce | products, D2C orders, customers, traffic |
| `razorpay` | payments | payment status, payouts → bankTxns |
| `meta-ads` | marketing | adDays |
| `shiprocket` | logistics | shipments |
| `whatsapp` | messaging | lead threads, courier threads |
| `gmail` | messaging | wholesale email threads, vendor bills, renewal notices |
| `zoho-books` | finance | invoices, bills, subscriptions |
| `hdfc` | bank | bankTxns |
| `freshdesk` | support | tickets |
| `calendar` | personal | obligations, meetings |

Each `Source` has `status: 'connected' | 'syncing' | 'error'`, `lastSyncAt`, `recordCount` — for the
Vault UI and the top-bar status. One source (`freshdesk`) should be `syncing` for realism.

## 3. The planted stories

The generator produces a plausible baseline, then **injects these stories**. Each is a
`Story` in `src/data/seed/stories.ts` with `apply(world, rng)` and an `expect` so tests can prove
it is detectable. `expect` is a union:

- `{ detector: DetectorId; minImpact: number }` for S1, S3 to S10 and S12;
- `{ chain: { target: MetricId; nodes: MetricId[]; branch: MetricId } }` for S2;
- `{ simulator: { hires: number } }` for S11 (the top strategy has `hires = 1`).

Numbers below are targets; the generator may jitter ±10%, but `analyze()[0]` must be S1 and the
Today list must hold exactly 11 findings. The "Checked by" column names the test that proves
each story. In Phase 1 the `pnpm seed` story report and `seed.test.ts` check each story from
records only (counts, dates, sums). The detector, chain and simulator checks, and the report's
detector, chain, simulator and planted-vs-detected onset columns, arrive in Phase 2
(`tests/engine/stories.test.ts`, `onset.test.ts`).

| # | Story | Mechanics in the seed | Surfaces in | Checked by |
|---|---|---|---|---|
| S1 | **7 hot wholesale leads gone cold.** Quotes total ₹1.84 lakh; worth about ₹1.1 lakh (₹1.84 lakh × 0.60, the share of quoted leads like these that are won). No reply in 48 to 120h. Threads end with the *lead* asking a question. | 7 leads, stage `quoted`, `estValueINR` 12k to 45k, `lastContactedAt` 2 to 5 days ago, last message inbound. | Today lead item · Act (`followUpLeads`) | `staleHighValueLeads`, impact about ₹1,10,400 |
| S2 | **Revenue ↓6% last 14 days, all of it D2C.** D2C revenue is down 14% because Meta campaign "Diwali Early" was paused on day 77 (spend ↓7%) → sessions ↓6% → D2C orders ↓14%. Wholesale is flat, so total revenue falls about 6%. | `Event` `campaign_paused` on day 77 (source `meta-ads`, anchors `adSpend`); `adDays` spend and sessions step down from day 77; orders follow on day 78. | Why (primary path of the trail) | chain: `adSpend, sessions, ordersD2C, revenueD2C`, one branch at `landingCvr` |
| S3 | **Also contributing: landing conversion fell** (planted 4.8% → 3.1%; the 14-day window means read 4.9% → 3.5% because they include the 4 days before the change) after a Shopify theme update on day 79. | `Event` `theme_updated` on day 79 (source `shopify`, anchors `landingCvr`); conversion of landing-page sessions steps down from day 79, independently of spend. Landing-entry orders are about 30% of D2C orders. | Why ("Also contributing" group) — the key moment | `conversionDrop`, impact about ₹83,000 |
| S4 | **3 wholesale invoices overdue, ₹82,400.** One is 41 days late from "Saffron Stories, Bengaluru". | `invoices` with `dueDate` < now, unpaid; 2 reminder emails already in `messages`. | Today · Act (`collectOverdue`) · Horizon | `overdueInvoices`, impact 82,400 |
| S5 | **Delivery complaints ↑31%.** Shiprocket switched Delhi-NCR to a new courier on day 74; delays 1.2 → 3.4 days there. | `Event` `courier_changed` on day 74 (source `shiprocket`, anchors `deliveryDelayAvg`); `shipments` dispatched to NCR from day 74 are delayed; `tickets` category delivery ↑ a few days later. Day 74 lies in the previous 14-day window (days 62 to 75), a deliberate case. | Today · Why (second trail: delays → complaints → repeatRate) · Act (`escalateCourier`) | `complaintSpike`, impact about ₹15,100; onset of `deliveryDelayAvg` |
| S6 | **Customer concentration: "Saffron Stories" is 31% of 90-day revenue** (₹54,00,000), so ₹16,74,000 is exposed — and they're the one paying late. | wholesale orders skewed to one account (about 30 of the ~140 wholesale orders). | Today (`customerConcentration`, impact 0, exposure ₹16,74,000) · What-if risk | `customerConcentration`, `exposureINR` 16,74,000 |
| S7 | **Internet bill ↑₹400/month** since day 60 (Airtel plan auto-upgraded). | `Event` `plan_upgraded` on day 60 (source `gmail`, anchors vendor Airtel); `bills` for Airtel dated days 0, 30, 60: 1,499, 1,499, 1,899. | Today (`costCreep`, ₹4,800 a year), info severity — shows the engine notices small things | `costCreep`, impact about ₹4,800 |
| S8 | **Zombie subscriptions:** Figma Pro (₹2,100/mo, unused 84 days, `lastUsedAt` day 5), Zapier Starter (₹1,650/mo, unused 71 days, `lastUsedAt` day 18). | `subscriptions` with old `lastUsedAt`. | Today (`zombieSubscription`, one aggregated finding, ₹45,000 a year) · Act (`cancelSubscription`) | `zombieSubscription`, impact about ₹45,000 |
| S9 | **Stockout risk:** "Indigo Stoneware Mug (set of 4)" — 11 days of cover, supplier lead time 18 days. | product `onHand` low vs velocity. | Today (`stockoutRisk`, 7 stockout days × 3 sets a day × ₹1,450 = ₹30,500) · Act (`reorderStock`) | `stockoutRisk`, impact about ₹30,500 |
| S10 | **Horizon squeeze:** GST payment ₹1,90,000 (day +12), shop insurance renewal ₹24,000 (day +18), payroll ₹4,10,000 (day +22), domain ₹1,200 (day +9). Cash dips under the ₹2,00,000 buffer on day +23 with a shortfall of ₹61,000, *unless* S4 is collected, which recovers it. | `obligations`; `bankTxns` balance calibrated so the dip is real. | Horizon · `cashCrunch` and `renewalDue` detectors · ties S4 → S10 (collect overdue → runway recovers) | `cashCrunch`, impact 61,000; `renewalDue`, impact about ₹15,200 |
| S11 | **Capacity ceiling:** ops staff (4 packers) run at 96% of fulfilment capacity today; with the festive lift (1.06) next month is 102%. | `meta.business.staffOps = 4`, `ordersPerPersonPerMonth = 177`, `festiveLift = 1.06`. | What-if — "hire 1" unlocks marketing growth | simulator: top strategy has `hires = 1` |
| S12 | **Marketing works, but with diminishing returns**; CAC up 20% over the last 30 days. | `adDays` calibrated. | Today (`adEfficiency`, medium, ₹15,000: 30-day spend ₹90,000 × (1 − 1/1.2)) · What-if | `adEfficiency`, impact about ₹15,000 |

### The seed Today list

The committed seed produces exactly 11 findings (targets, ±10% jitter allowed). The brief total
is the sum of `impactINR` over open findings, excluding `cashCrunch` (its shortfall is a
consequence of the overdue invoices and shows on Horizon, so summing it would count the same
rupees twice): ₹4,01,400, "about ₹4 lakh".

| # | Detector | Story | Severity | Group | impactINR |
|---|---|---|---|---|---|
| 1 | `staleHighValueLeads` | S1 | high | needs-you | 1,10,400 |
| 2 | `overdueInvoices` | S4 | critical | needs-you | 82,400 |
| 3 | `conversionDrop` | S3 | high | needs-you | 83,000 |
| 4 | `complaintSpike` | S5 | medium | worth-knowing | 15,100 |
| 5 | `costCreep` | S7 | info | worth-knowing | 4,800 |
| 6 | `zombieSubscription` | S8 | medium | worth-knowing | 45,000 |
| 7 | `customerConcentration` | S6 | medium | worth-knowing | 0 (exposure 16,74,000) |
| 8 | `cashCrunch` | S10 | high | needs-you | 61,000 (not in the total) |
| 9 | `stockoutRisk` | S9 | high | needs-you | 30,500 |
| 10 | `adEfficiency` | S12 | medium | worth-knowing | 15,000 |
| 11 | `renewalDue` | S10 | medium | worth-knowing | 15,200 |

The list is ranked by `impactINR` (see `docs/ENGINE.md`); the lead item (first needs-you in rank
order) must be S1.

Stories must *intersect* — S4 ↔ S6 ↔ S10, S2 ↔ S3, S5 ↔ repeat rate — because intersections are
what make the "Why" surface feel intelligent rather than templated.

### Onset anchors

The Why surface draws each cause on a shared time axis with the day its change began marked. Four
stories have such a day. Each writes exactly one `Event` on it, and the engine's onset detection
must land on it (tests assert within 1 day):

| Story | `Event.kind` | Day | `label` | Anchors |
|---|---|---|---|---|
| S2 | `campaign_paused` | 77 | "Diwali Early campaign paused" | `adSpend` |
| S3 | `theme_updated` | 79 | "Shopify theme updated" | `landingCvr` |
| S5 | `courier_changed` | 74 | "Delhi-NCR moved to a new courier" | `deliveryDelayAvg` |
| S7 | `plan_upgraded` | 60 | "Airtel plan auto-upgraded" | vendor Airtel (bill series) |

With now = day 89, the current 14-day window is days 76 to 89 and the previous one is days 62 to
75. The S5 onset (day 74) therefore lies in the previous window: on the trail its tick sits left
of the "Last 14 days" boundary. S7 (day 60) is older than the 28-day strip, so its onset needs the
extended strip (see `docs/ENGINE.md`, Onset detection).

Generator rules that make the trail readable:

- **Steps, not drifts.** A planted change is a level shift that starts on the event day.
- **Purchase lag.** About 60% of a day's D2C orders come from the previous day's sessions. When
  sessions step down on day 77, orders cross the detection threshold on day 78. That one-day stair
  is the picture the demo depends on.
- **Quiet noise.** Daily multiplicative noise on top of the weekday pattern: sigma 2.5% on counts
  and sessions, 2% on spend. Integer counts come from error-diffusion rounding (carry the
  remainder), not Poisson draws. Per-shipment delay noise has sd 0.4 days. The upward trend stays
  under 3% a month, and the Navratri bump sits before day 30, clear of the onset baseline (days
  34 to 61) and the strip (days 62 to 89). Real data is noisier; there the engine returns a null
  onset and the UI says the timing is unverified.
- **Wholesale held flat.** Wholesale revenue in the two 14-day windows must be within ±2% of
  each other, so the total revenue change is entirely D2C.
- **Calibrate S2 and S3 together.** D2C orders = sessions × conversion, so a site-wide conversion
  drop from 4.8% to 3.1% would take orders down about 40%, not 14%. `landingCvr` is therefore
  measured only on sessions that enter on a landing page (`TrafficDay.landingSessions`,
  `Order.viaLanding`): about 135 landing-entry sessions a day, roughly 30% of D2C orders (about
  6.5 landing orders a day). Its 28% drop on 30% of orders compounds with sessions ↓6% to about
  ↓14% D2C orders. Site-wide conversion is `d2cCvr`. The verified 14-day versus previous 14-day
  deltas (mean of 300 simulated seeds): spend −7%, sessions −6%, D2C orders −14%, D2C revenue
  −14%, `landingCvr` 4.9% → 3.5% (planted 4.8% → 3.1%), total revenue about −6% because D2C is
  44% of revenue and wholesale is flat.
- **The engine has the last word on figures.** After calibration, `scripts/record-scripts.ts`
  regenerates the scripted answers, and the spoken numbers in `docs/DEMO.md` are corrected to
  whatever the engine computes.

## 4. Generator (`scripts/generate-seed.ts`)

- Seeded PRNG (`seedrandom`-style, implement a tiny mulberry32 — no dependency).
- Order of operations: business + products → customers → baseline demand curve (weekly
  seasonality, slight upward trend, a Navratri bump) → ad days + traffic → orders → shipments →
  tickets → wholesale leads + messages + invoices → bills + subscriptions → bank txns →
  obligations → **apply stories** (S2, S3, S5 and S7 each write their `Event`, see Onset anchors)
  → validate with zod → write JSON.
- Realism checklist: Indian names (Hindi/Rajasthani/Tamil/Bengali spread), real city names, ₹ in
  realistic bands, GST-style invoice numbers (`KH/24-25/0142`), AWB-looking shipment ids, product
  names that sound like a Jaipur décor brand, WhatsApp-style message texts (short, "Hi Meera ji…").
- Message threads for S1 leads must be **good enough for the model to personalise from**: the
  lead's shop name, what they asked for, the quantity, the last unanswered question.
- Output budget: `world.json` ≤ 1.5 MB. If larger, reduce D2C order count, not stories.

Run: `pnpm seed` → `src/data/seed/world.json` (+ prints a story report built from records only:
per story, the planted records and figures). Once the engine exists (Phase 2) the report gains
detector, chain and simulator columns and prints planted day vs detected onset for S2, S3, S5
and S7. If any
is more than a day off, tune the generator, not the detector's thresholds.

## 5. Rules (`src/data/rules/`)

- `thresholds.ts` — every detector threshold in one place, with a comment on why.
- `playbooks.ts` — draft templates per playbook with `{{lead.shop}}`-style slots (engine-templated
  fallback when no model is available).
- `tone.ts` — the voice guide for model-written text: warm, direct, Indian-English register
  ("Meera ji" in WhatsApp, formal in email), never exclamation marks, always a number. It also
  carries the copy rules from `DESIGN.md` that apply to anything shown in the UI: sentence case,
  no em dashes or middle dots, "likely" rather than "caused" when describing a trail.
