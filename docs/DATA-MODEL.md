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
  leads: Lead[];                // wholesale pipeline: stage, estValueINR, createdAt, lastContactedAt, thread: MessageRef[]
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
};
```

**Dates are stored as ISO strings but generated as day offsets from `meta.day0`.**
`meta.day0` is set at generation time to `MUNSHI_DEMO_NOW ?? today − 89`. The app's `now()`
is `day0 + 89` so the world always ends "today". Regenerate before the demo if you want fresh dates.

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
`Story` in `src/data/seed/stories.ts` with `apply(world, rng)` and `expect: { detector, minImpact }`
so tests can prove it's detectable. Numbers below are targets; the generator may jitter ±10%.

| # | Story | Mechanics in the seed | Surfaces in |
|---|---|---|---|
| S1 | **7 hot wholesale leads gone cold.** ₹1.84L est. value, no reply in 48–120h. Threads end with the *lead* asking a question. | 7 leads, stage `quoted`, `estValueINR` 12k–45k, `lastContactedAt` 2–5 days ago, last message inbound. | Today lead item · Act (`followUpLeads`) |
| S2 | **Revenue ↓14% last 14 days.** Caused by: Meta campaign "Diwali Early" paused on day 72 (spend ↓8%) → sessions ↓11% → D2C orders ↓14%. | `Event` `campaign_paused` on day 72 (source `meta-ads`, anchors `adSpend`); `adDays` spend and sessions step down from day 72; orders follow on day 73. | Why (first group of the trail) |
| S3 | **…but also landing CVR fell 4.8% → 3.1%** after a Shopify theme update on day 74. | `Event` `theme_updated` on day 74 (source `shopify`, anchors `landingCvr`); conversion of landing-page sessions steps down from day 74, independently of spend. | Why (second group, "but also") — the key moment |
| S4 | **3 wholesale invoices overdue, ₹82,400.** One is 41 days late from "Saffron Stories, Bengaluru". | `invoices` with `dueDate` < now, unpaid; 2 reminder emails already in `messages`. | Today · Act (`collectOverdue`) · Horizon |
| S5 | **Delivery complaints ↑31%.** Shiprocket switched Delhi-NCR to a new courier on day 70; delays 1.2 → 3.4 days there. | `Event` `courier_changed` on day 70 (source `shiprocket`, anchors `deliveryDelayAvg`); `shipments` dispatched to NCR from day 70 are delayed; `tickets` category delivery ↑ a few days later. | Today · Why (second trail: delays → complaints → repeatRate) · Act (`escalateCourier`) |
| S6 | **Customer concentration: "Saffron Stories" is 31% of 90-day revenue** — and they're the one paying late. | wholesale orders skewed to one account. | Today (`customerConcentration`) · What-if risk |
| S7 | **Internet bill ↑₹400/month** since day 60 (Airtel plan auto-upgraded). | `Event` `plan_upgraded` on day 60 (source `gmail`, anchors vendor Airtel); `bills` for Airtel dated days 0, 30, 60: 1,499, 1,499, 1,899. | Today (`costCreep`), low severity — shows the engine notices small things |
| S8 | **Zombie subscriptions:** Figma Pro (₹2,100/mo, unused 94 days), Zapier Starter (₹1,650/mo, unused 71 days). | `subscriptions` with old `lastUsedAt`. | Today (`zombieSubscription`) · Act (`cancelSubscription`) |
| S9 | **Stockout risk:** "Indigo Stoneware Mug (set of 4)" — 11 days of cover, supplier lead time 18 days. | product `onHand` low vs velocity. | Today (`stockoutRisk`) · Act (`reorderStock`) |
| S10 | **Horizon squeeze:** GST payment (day +12, ₹1.9L), shop insurance renewal (day +18, ₹24k), payroll (day +22, ₹4.1L), domain (day +9, ₹1.2k). Cash dips under the ₹2L buffer on day +23 *if* S4 isn't collected. | `obligations`; `bankTxns` balance calibrated so the dip is real. | Horizon · `cashCrunch` detector · ties S4 → S10 (collect overdue → runway recovers) |
| S11 | **Capacity ceiling:** ops staff (4 packers) run at ~96% of fulfilment capacity. | `meta.business.staffOps = 4`, `ordersPerPersonPerMonth` calibrated. | What-if — "hire 1" unlocks marketing growth |
| S12 | **Marketing works, but with diminishing returns**; CAC up 20% over the last 30 days. | `adDays` calibrated. | Today (`adEfficiency`, medium) · What-if |

Stories must *intersect* — S4 ↔ S6 ↔ S10, S2 ↔ S3, S5 ↔ repeat rate — because intersections are
what make the "Why" surface feel intelligent rather than templated.

### Onset anchors

The Why surface draws each cause on a shared time axis with the day its change began marked. Four
stories have such a day. Each writes exactly one `Event` on it, and the engine's onset detection
must land on it (tests assert within 1 day):

| Story | `Event.kind` | Day | `label` | Anchors |
|---|---|---|---|---|
| S2 | `campaign_paused` | 72 | "Diwali Early campaign paused" | `adSpend` |
| S3 | `theme_updated` | 74 | "Shopify theme updated" | `landingCvr` |
| S5 | `courier_changed` | 70 | "Delhi-NCR moved to a new courier" | `deliveryDelayAvg` |
| S7 | `plan_upgraded` | 60 | "Airtel plan auto-upgraded" | vendor Airtel (bill series) |

Generator rules that make the trail readable:

- **Steps, not drifts.** A planted change is a level shift that starts on the event day.
- **Purchase lag.** About 60% of a day's D2C orders come from the previous day's sessions. When
  sessions step down on day 72, orders cross the detection threshold on day 73. That one-day stair
  is the picture the demo depends on.
- **Quiet noise.** Daily noise on story metrics stays within about ±5% on top of the weekday
  pattern, the upward trend stays under 3% a month, and the Navratri bump sits before day 30,
  clear of the onset baseline (days 34–61) and the strip (days 62–89). Real data is noisier; there
  the engine returns a null onset and the UI says the timing is unverified.
- **Calibrate S2 and S3 together.** D2C orders = sessions × conversion, so a site-wide conversion
  drop from 4.8% to 3.1% would take orders down about 40%, not 14%. `landingCvr` is therefore
  measured only on sessions that enter on a landing page (`TrafficDay.landingSessions`,
  `Order.viaLanding`): roughly a tenth of orders, so its 35% drop takes 3 to 4% off D2C orders,
  which compounds with sessions ↓11% to about ↓14%. Site-wide conversion is `d2cCvr`.
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

Run: `pnpm seed` → `src/data/seed/world.json` (+ prints a story-detectability report). Once the
engine exists the report also prints planted day vs detected onset for S2, S3, S5 and S7. If any
is more than a day off, tune the generator, not the detector's thresholds.

## 5. Rules (`src/data/rules/`)

- `thresholds.ts` — every detector threshold in one place, with a comment on why.
- `playbooks.ts` — draft templates per playbook with `{{lead.shop}}`-style slots (engine-templated
  fallback when no model is available).
- `tone.ts` — the voice guide for model-written text: warm, direct, Indian-English register
  ("Meera ji" in WhatsApp, formal in email), never exclamation marks, always a number. It also
  carries the copy rules from `DESIGN.md` that apply to anything shown in the UI: sentence case,
  no em dashes or middle dots, "likely" rather than "caused" when describing a trail.
