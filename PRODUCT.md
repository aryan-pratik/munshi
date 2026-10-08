# Product

<!-- impeccable:product-schema 1 -->

> *munshi* (मुंशी): the clerk who ran a merchant's affairs. He kept the ledger, knew every
> customer, and noticed what the owner missed.

**One line:** Munshi is an AI chief of staff for a small business. It does not show charts. It
says what is wrong, proves it with the source records, prices it in rupees, and fixes it once the
owner approves.

This file is product truth only. Everything visual lives in `DESIGN.md`. How it is built lives in
`docs/ARCHITECTURE.md`.

## Platform

web

## Stack

Delegated: the user gave full freedom, so the assistant chose. Next.js (App Router, `src/`),
TypeScript strict, Tailwind v4, shadcn/ui, zustand for client state, Vercel AI SDK (v7 at bootstrap) through
Vercel AI Gateway, zod, vitest, pnpm, deployed on Vercel. Chosen because it scaffolds in minutes,
deploys with no configuration, and one language covers the engine, the API routes and the UI.
No database and no auth in the hackathon build. Details: `docs/ARCHITECTURE.md`.

## Users

**Primary: the owner of an Indian small business** (roughly 5 to 50 staff, ₹5L to ₹1Cr a month)
whose data is already spread across SaaS tools. Most are proprietors, so the GST deadline, the
shop insurance and the loan EMI are business events too. The owner opens Munshi in the morning,
not to check metrics, but to find out what to do before lunch and why.

**Demo persona: Kaveri Home**, a Jaipur D2C home-decor brand (ceramics, linen, lighting). Founder
**Meera Rathore**, 14 staff, about ₹18L a month, two channels:

- **D2C** through Shopify and Instagram/Meta ads, paid through Razorpay, shipped through Shiprocket.
- **Wholesale** to about 40 boutique retailers across India. Leads arrive on WhatsApp and email
  and are invoiced through Zoho Books on 30-day terms.

Why this business: it exercises every detector naturally. Leads go cold, B2B invoices run
overdue, deliveries draw complaints, ad spend moves traffic and sales, one retailer has quietly
become 31% of revenue, nobody uses two paid subscriptions, and a GST payment is coming. It also has
a believable catalogue, so the records read like a real company and not a spreadsheet.

**Secondary audience: hackathon judges** watching a three-minute demo. They have seen many
"LLM reads your dashboard" projects and will probe whether the numbers are made up.

## Product Purpose

Munshi connects to the tools a business already uses, keeps a single model of the business, and
every morning produces a ranked list of findings. Each finding states what is happening, what it
is worth in rupees, the records that prove it, and an action Munshi can take once approved.

On top of that list it answers two questions a dashboard cannot:

- **Why** did something happen. It traces a metric back through its causes and shows that each
  cause moved before its effect.
- **What if** the owner changes something. It simulates the change with a model of the business
  and can search for the best combination of changes.

Success in the hackathon: the three-minute script in `docs/DEMO.md` runs end to end, with no
network, the same way every time, and a judge who asks "is that number real?" can click it and
see the records it came from.

Success as a product: the owner acts on at least one finding a day, and the rupees recovered are
visible in the product itself.

## Positioning

- **Category:** AI operations layer for small businesses, an "AI chief of staff".
- **Wedge:** decision intelligence (why, and what if), not reporting.
- **What a neighbouring product could not truthfully copy:**
  1. **Computed, not generated.** Detectors, the causal walk, the simulator and the optimizer are
     deterministic, tested TypeScript. The model narrates, drafts and chooses between
     engine-produced candidates. It never emits a number the engine did not compute.
  2. **Evidence on every claim.** Every finding, every step of a causal explanation and every
     draft links to the exact records it came from. A claim without evidence is shown as
     unverified, never as fact.
  3. **Approval before action.** Nothing is sent or changed without an explicit approval, and
     every action records its expected effect before and its actual effect after.
- **Pricing (claimed, not built):** ₹2,000 to ₹20,000 a month by business size. The rupees at
  stake shown in the product each morning make the return-on-cost argument.
- **Why now:** tool-calling models can investigate across sources instead of summarising one, and
  small-business data already sits in SaaS tools with APIs.

## Operating Context

- **When and where:** first thing in the morning, on a laptop, sometimes on a phone. A few
  minutes, in daylight, usually before the working day starts.
- **Tools the business already runs on** (the sources Munshi models): Shopify (products, D2C
  orders, customers, traffic), Razorpay (payments, payouts), Meta Ads (spend, clicks, sessions),
  Shiprocket (shipments), WhatsApp (lead and courier threads), Gmail (wholesale threads, vendor
  bills, renewal notices), Zoho Books (invoices, bills, subscriptions), HDFC (bank transactions),
  Freshdesk (support tickets), calendar (obligations, meetings).
- **Money:** always rupees, Indian digit grouping, lakh and crore.
- **Language and register:** Indian English. WhatsApp messages are short and warm ("Hi Meera ji").
  Emails are formal.
- **Demo context:** a projector at a hackathon venue, three minutes, a network that cannot be
  trusted. The demo is clicked, not typed.

## Capabilities and Constraints

### Surfaces

| Surface | Route | Question it answers | What the user gets |
|---|---|---|---|
| **Today** | `/` | What needs me, and what is it worth? | A written briefing on the top finding, then every finding ranked by rupee impact, each with its evidence and a one-click action. |
| **Why** | `/ask` | Why did revenue fall last week? | The **OnsetTrail**: each cause shown preceding its effect on one shared time axis, with a second "but also" cause when there is one, then a short narrative and the evidence. |
| **What if** | `/whatif` | What happens if I raise prices 15%? Find the best strategy. | Levers and computed outcomes. "Find best strategy" scans about 1,800 scenarios and returns the best few with reasons. |
| **Horizon** | `/horizon` | What is coming in the next 30 days? | Projected cash with upcoming outflows placed on it: payroll, GST, renewals, and the invoice that may not arrive. |
| **Vault** | `/vault` | Where did this come from? | Connected sources, raw records and the metric graph. Every evidence link on the other surfaces lands here. |

**Act** is a flow, not a page. From any finding, its action button (for example "Review 7 drafts") opens a plan, then
personalised drafts, then an approval, then execution, then a logged action with expected and
actual impact. In the hackathon build the senders are mocked and the state change is real: the
finding resolves and Today re-ranks.

### Terminology (use these words everywhere)

- **Finding:** one thing Munshi noticed, with impact in rupees, confidence and evidence.
- **Evidence / receipt:** a reference to a source record (`RecordRef`).
- **Onset:** the day a metric started to change.
- **Playbook:** a named action plan for a kind of finding.
- **Approval:** the explicit step before anything is sent or changed.
- **World:** the single in-memory model of the business.
- **Live / scripted:** the two AI modes. Scripted streams recorded responses and needs no key.

### Constraints

- The demo must run with no API key and no network. Every AI surface has a scripted mode.
- Scripted does not mean fake: tool outputs in scripts are produced by running the engine on the
  seed, not typed by hand.
- The model never produces a figure. Figures come from the engine.
- One business, no login, no multi-tenancy.
- State lives in the browser. A refresh resets the world, which is useful on stage.
- Responsive web. Demoed on a laptop. Phone width must not break.

### Not building (hackathon scope)

- Real OAuth integrations (Gmail, WhatsApp, Shopify). Adapters are a documented interface. The
  demo runs on the seeded twin.
- Multi-tenant auth, billing, onboarding.
- A general chatbot. `/ask` is an investigation surface whose output is structured.
- A native mobile app.
- Persistence beyond the session.

### Undecided

- **Consumer or business.** See the Decision log. Open, to be confirmed with the user.
- **The name.** "Munshi" is the assistant's working name. Not confirmed.
- Whether one real read-only adapter (Gmail) is worth building after the demo is solid.

## Brand Commitments

Nothing has been made binding by the user. The following are the assistant's working choices and
can change:

- **Name:** Munshi. The pitch line it enables: every merchant once had a munshi who kept the
  accounts, remembered the dates and wrote the letters.
- **Voice:** warm, direct, specific. Always a number. No exclamation marks. Never "AI-powered".
  Munshi's briefings and drafts may speak in the first person ("I've drafted the follow-ups").
  Interface chrome (buttons, labels, errors, empty states) stays impersonal and names the action.
- **No assets exist:** no logo, no mark, no photography, no screenshots.

## Evidence on Hand

- **Exists:** the product, engine, data and demo specifications in this repo
  (`docs/ENGINE.md`, `docs/DATA-MODEL.md`, `docs/DEMO.md`), and the planted stories S1 to S12 in
  `docs/DATA-MODEL.md`.
- **Is a simulation, and must be described as one:** Kaveri Home, Meera Rathore, every customer,
  order, message and rupee figure. It is a generated digital twin with planted, intersecting
  stories. Say so when asked.
- **Does not exist, do not fabricate:** real customers, testimonials, usage numbers, revenue,
  press, case studies, partner logos, or any claim that the listed integrations are live.
- **Claimed but not built:** the pricing band above.
- **Verified on 2026-10-08:** the AI Gateway model IDs in `docs/AI_SDK_NOTES.md`.

## Product Principles

1. **Lead with money, not metrics.** The first thing on screen is what is at stake and what to do
   about it, in a sentence. Never a row of KPIs.
2. **The engine computes, the model explains.** If a number cannot be traced to engine code with a
   test, it does not appear.
3. **No claim without a receipt.** Any number can be clicked through to the records behind it.
4. **Act, with a leash.** Munshi prepares everything and waits. The owner approves, and can edit
   first.
5. **The demo never depends on anyone else.** No third-party login, no live network, no key
   required.

## Accessibility & Inclusion

No product-specific requirement was given by the user. The assistant's baseline, enforced in
`DESIGN.md`: WCAG 2.1 AA, full keyboard operation, meaning never carried by colour alone, reduced
motion respected, legible on a washed-out projector, and usable at phone width. Product-specific:
rupee amounts use Indian grouping and lakh/crore, because that is how the user reads money.

---

## The argument with the original idea

The starting brief was "AI Chief of Staff for SMBs": connect Gmail, WhatsApp, Sheets, Stripe,
analytics, CRM, calendar, tickets and invoices, have the AI say what needs attention, and let it
act. The instinct is right. This is where it breaks under hackathon conditions, and what we do
instead.

| Challenge | Why it is a real problem | Decision |
|---|---|---|
| **"Connect 9 integrations" is where hackathon demos die.** OAuth consent screens, empty accounts, rate limits, a judge's wifi. | The demo must work in three minutes, offline, every time. Nothing on stage may depend on a third party. | Build on a **digital twin**: one deeply seeded, internally consistent business (90 days of orders, leads, invoices, ads, tickets, bills, messages). Integrations become adapters that emit the same record types. That is a version-two problem, not a demo problem. |
| **"AI summarises your dashboard" is table stakes.** Every team will have a model read Stripe and say "revenue is up 12%". | Judges have seen it. It does not differentiate and it is not that useful. | Three things summarisers cannot do: (1) ranked findings priced in rupees, (2) causal investigation, *why* did X happen, as a traced chain, (3) counterfactual simulation, *what if* I do Y, with computed numbers. |
| **Model-invented numbers destroy trust.** "Expected profit +24%" from a prompt is a guess stated with confidence. | An owner acting on a made-up number is worse off than with no tool. Judges with a finance background will probe this. | **The engine computes, the model explains.** Detectors, causal walk, simulator and optimizer are deterministic TypeScript with tests. |
| **"AI did something" with no proof.** | Owners will not let software message their customers blind. | **Every claim has receipts** and **every action needs approval**, with expected effect shown before and actual effect after. |
| **Consumer "Life OS" versus business.** | Indian small-business owners are mostly proprietors: the GST deadline, the shop insurance and the personal loan EMI *are* business events. | The data model treats "personal" as another source. The seed carries a few personal-ish items (insurance renewal, GST filing, domain renewal) so Horizon shows the blend. See the Decision log. |
| **The simulator could be a toy.** | Linear sliders give obvious outputs. | The model has **non-linear mechanics** that produce surprising, defensible results: diminishing ad returns, a fulfilment capacity ceiling (over capacity leads to delays, complaints, churn), segment-specific price elasticity. "Hiring one person raises profit" becomes something the optimizer finds. |

**Net:** this is not "AI analytics". It is a decision engine with a chief-of-staff interface.

## What makes it feel different (the demo beats)

1. **It leads with money, not metrics.** The first thing on screen is a sentence:
   "Seven wholesale leads have gone two days without a reply. They are worth about ₹1.84 lakh."
   Not a KPI row.
2. **Click any number, see the receipt.** The ₹1.84 lakh opens the seven leads, each with its
   last message thread and the quote that was sent.
3. **"Why did revenue fall?" shows cause before effect.** The campaign was paused, then sessions
   fell, then orders fell, each onset marked on the same time axis. Then: "Turning the ads back on
   is not the best fix. Landing conversion also fell from 4.8% to 3.1% after the theme update."
   That second cause is the moment.
4. **The simulator argues back.** Raise price 15%: profit rises but wholesale churn jumps.
   Price +8%, marketing +17%, hire one packer: profit rises 24% at low risk, because the business
   is capacity-constrained.
5. **It acts, with a leash.** Approve seven follow-ups. Each was drafted from that lead's own
   thread. They are sent, the CRM is updated, and Munshi reports the expected ₹1.1 lakh over
   14 days and says when it will check back.

Full click-by-click script: `docs/DEMO.md`.

## Stretch (in order, only after the demo is solid)

1. **Morning WhatsApp brief.** Today rendered as a message, sent to the founder at 8am.
2. **"Explain this chart."** Point at any series and Munshi narrates it.
3. **Memory.** "Meera always wants wholesale first": ranking weights learned from clicks.
4. **One real adapter.** Gmail read-only, mapped to `Message` records, to prove the adapter
   interface is real.
5. **Voice.** Ask Why by voice on the phone.

## Decision log

### 2026-10-08: business version built, consumer version not. Open: confirm with the user.

- **What the brief was.** Two pastes. The first, on its own, was a consumer "Life OS" (connect
  bank, calendar, email, subscriptions, bills, insurance; get a life dashboard and proactive
  notices). That is the user's own starting idea. The second was a list of eight ideas whose
  first is the SMB chief of staff. The user said the base was not final and gave full freedom.
- **What these docs build.** The SMB version.
- **Why.** The three strongest mechanics in the brief (the causal "why", the what-if simulation,
  and approve-then-act) were written for business data and demonstrate better on it: a revenue
  drop has a clearer causal chain than personal spending, and a simulator has real levers.
- **What was kept from the Life OS.** The items the user listed live inside the business version
  as detectors and Horizon entries: the internet bill that rose by ₹400, subscriptions that
  renewed without being used, the insurance renewal, and upcoming obligations.
- **Who decided.** The assistant. **The user has not confirmed it.**
- **Cost of switching to the consumer Life OS.** Rewrite `PRODUCT.md`, `docs/DATA-MODEL.md`
  (persona and planted stories) and `docs/DEMO.md`. The engine shape (detectors, causal walk,
  simulator, playbooks), the architecture, the design system and the task plan carry over.
- **Status:** open. Ask the user before Phase 1 (seed world) starts, because the seed is where
  the two versions diverge.
