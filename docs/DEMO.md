# Demo script (3 minutes)

**Setup:** `MUNSHI_AI_MODE=scripted` unless the venue network is verified. Hard-refresh before
starting (resets world state — the Today page must open on the lead item about the seven leads).
Browser at 1440×900, 110% zoom, light mode, sidebar open. Have `/ask` suggestion chips visible in
your head: you'll click, not type.

**Dates and figures.** Every date in the seed is an offset from `MUNSHI_DEMO_NOW`: the campaign
pause is always 17 days before the demo date and the theme update 15 days before. This script
says "the 24th" and "the 26th" as examples. Before you present, replace them, and every spoken
number, with what the screen shows.

Say less than you think. Let the screen talk.

---

### Beat 0 — Frame (15 s)

> "Every small business owner opens five dashboards and still doesn't know what to do before
> lunch. Munshi is the chief of staff who already read everything. This is Kaveri Home — a
> Jaipur décor brand, ₹18 lakh a month, D2C and wholesale."

### Beat 1 — Today: money first (30 s)

Land on `/`. The page opens with a dated sentence ("Thursday, 8 October. 11 things found
overnight, worth about ₹3.2 lakh.") and, under it, Munshi's lead item written out in two or three
sentences. Pause there.

> "It doesn't show me revenue. It shows me that ₹1.84 lakh is sitting in seven wholesale leads
> nobody has replied to in two days."

Click **See the threads** → evidence drawer: seven leads, WhatsApp threads ending in a question
from the customer.

> "Every number is a receipt. Nothing here is a summary — it's the actual thread."

Close. Scroll the findings table once: overdue invoices, complaints up 31%, Figma nobody uses, a
GST payment in 12 days. Each row has a small strip in its Since column showing when it began.

### Beat 2 — Why: the onset trail (50 s)

`⌘K` → click chip **"Why did revenue fall last week?"**

Let the trail draw. Don't talk over the animation. Four strips appear top to bottom on one shared
28-day axis: ad spend, sessions, orders, revenue. As each one draws, its onset mark lands, and the
marks step to the right: the campaign-paused flag on the 24th, sessions falling the same day,
orders a day later, revenue with them. The cause visibly moves first.

> "Ad spend dropped 8% when the Diwali campaign was paused → sessions down 11 → orders down 14.
> Obvious answer: turn the ads back on."

Then the second group draws under a "But also" heading: landing conversion holds level for two
more days, then breaks at the theme-update flag on the 26th. Point at that flag.

> "But Munshi found a second cause: landing-page conversion fell from 4.8 to 3.1% after the
> theme update on the 26th. Spending more on ads would be pouring water into a cracked bucket."

Click the landing conversion strip → the evidence drawer opens on the theme-update event.

### Beat 3 — What if: the simulator argues back (45 s)

Click the link at the end of the answer (**Try this in What if**) or go to `/whatif`.

Drag **Price** to +15%. The comparison table (Base, Scenario, Change) updates as you drag: profit
up, wholesale customers down, risk reads Medium.

> "Raise prices 15%? More profit, but we'd lose wholesale accounts."

Click **Find best strategy**. Let the counter race. The top three strategies appear.

> "1,842 scenarios. The best isn't a bigger ad budget — it's price +8, marketing +17, and hiring
> one packer. Because we're at 96% of fulfilment capacity: more orders without a packer means
> delays, which means complaints, which means churn. The model computed that; the AI just
> explained it."

### Beat 4 — Act: with a leash (40 s)

Back to `/`. Click **Review 7 drafts** on the lead item.

Sheet opens: plan → drafts. Open one draft.

> "It read each thread. This one asked about a 40-piece order of the stoneware mugs — the draft
> answers that, in Meera's tone, on WhatsApp."

Click **Approve and send 7**. The sheet closes, a toast reads "7 follow-ups sent", Today re-ranks,
and the lead item changes to the next thing.

> "Seven messages out, CRM updated, expected ₹1.1 lakh in 14 days. And the brief already moved
> on to the next thing."

### Beat 5 — Close (10 s)

Flash `/horizon` for two seconds — the runway curve with the dip, the "If overdue invoices are
collected" toggle.

> "Not a dashboard. A decision engine with receipts. That's Munshi."

---

## If something breaks

| Symptom | Do |
|---|---|
| Live model slow / fails | The surface auto-falls back to scripted. If it doesn't: set `MUNSHI_AI_MODE=scripted`, restart, hard refresh. Say nothing. |
| Trail doesn't animate | Reduced-motion is on at OS level. The trail still renders, fully drawn — continue, and point at the onset marks yourself. |
| A strip says "unverified" | The engine found no onset or no evidence for it and is saying so. Don't hide it; it is the honest answer to the next question below. |
| State looks wrong (findings already handled) | Hard refresh resets the world (store is `persist`ed — clear with `?reset=1`). |
| Projector washes out | Zoom to 125%; light mode was chosen for this. |

## Questions judges ask (and the honest answers)

- **"Is the data real?"** It's a generated digital twin of a realistic business with planted,
  intersecting stories. Integrations are adapters to the same record types — the demo doesn't
  depend on anyone's OAuth. See `docs/DATA-MODEL.md`.
- **"Does the AI make up the numbers?"** No. Detectors, the causal walk, the simulator and the
  optimizer are deterministic TypeScript with tests. The model narrates and drafts; it never emits
  a number the engine didn't compute. See `docs/ENGINE.md`.
- **"How do you know that is the cause?"** We don't claim proof of causation. The engine shows
  three things: the metrics moved together along a known business graph, the cause's change began
  on or before the effect's (that is what the stepping onset marks are), and there is a dated
  event record you can open (the campaign was paused, the theme was updated). That makes it the
  likely cause, and the answer says "likely". Anything without evidence or without an onset is
  labelled unverified on screen. See `docs/ENGINE.md`, section 3.
- **"What stops it from sending something wrong?"** Nothing sends without an approval card, and
  every draft is editable. Actions are logged with expected vs actual impact.
- **"Why would an SMB pay?"** The ₹ at stake is on the screen every morning — the product prices
  its own ROI.
