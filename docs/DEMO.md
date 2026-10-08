# Demo script (3 minutes)

**Setup:** Hard-refresh before starting. A hard refresh reloads the seed and is the demo reset; the
store is in memory only, so there is no reset URL. The Today page must open on the lead item about
the seven leads. Browser at 1440×900, 110% zoom, light mode, sidebar open. Keep the suggested
questions in your head: you will pick from the list, not type.

**AI mode.** `MUNSHI_AI_MODE=scripted` never calls the model, even when a key exists. `auto` (the
default) is live when a key or OIDC token is present and scripted otherwise; if the model fails
before the first streamed byte, that request falls back to the matching script and the label
reads "Demo answers". `live` always uses the model and shows errors. Unless the venue network is
verified, use `scripted`.

**Dates and figures.** Dates in the seed are fixed when `pnpm seed` runs, from `MUNSHI_DEMO_NOW`.
The app never reads that variable at runtime. This script uses 26 Sep (campaign paused) and 28 Sep
(theme updated) as examples. Before you present, replace them, and every spoken number, with what
the screen shows. To change the demo date, run `MUNSHI_DEMO_NOW=<date> pnpm seed` and commit
`world.json`.

Say less than you think. Let the screen talk.

---

### Beat 0: Frame (15 s)

> "Every small business owner opens five dashboards and still doesn't know what to do before
> lunch. Munshi is the chief of staff who already read everything. This is Kaveri Home, a
> Jaipur décor brand, ₹18 lakh a month, D2C and wholesale."

### Beat 1: Today, money first (30 s)

Land on `/`. The page opens with a dated sentence ("Thursday, 8 October. 11 things found
overnight, worth about ₹4 lakh.") and, under it, Munshi's lead item written out in two or three
sentences. Pause there.

> "It doesn't show me revenue. It shows me that ₹1.1 lakh is sitting in seven wholesale leads
> nobody has replied to in two days."

Click **See the threads**. The lead item expands in place (no drawer) to the seven leads: quotes
totalling ₹1.8 lakh, and WhatsApp and email threads ending in a question from the customer. The ₹1.1 lakh
is the part Munshi expects to win, about 60% of quoted leads like these.

> "Every number is a receipt. Nothing here is a summary. It's the actual thread."

Collapse it. Scroll the findings table once: overdue invoices, the cash dip in 23 days, complaints
up, two subscriptions nobody uses. Each row has a small strip in its Since column showing when it
began, and the forward-looking rows say "in 23 days" instead.

### Beat 2: Why, the onset trail (50 s)

`⌘K`, then pick **Why did revenue fall last week?** from the suggestion list under the ask field.

Let the trail draw. Don't talk over the animation. The narrative lands under the trail once the
draw has finished; its first line says total revenue is down about 6%, and all of it is D2C, which
is down 13%. Wholesale held flat. Five strips in three groups appear top to bottom on one shared
28-day axis:

1. Ad spend, sessions.
2. Under the heading **Also contributing**: landing conversion.
3. D2C orders, D2C revenue (the metric you asked about, last).

As each strip draws, its onset mark lands, and the marks step to the right within the first group:
the campaign-paused flag on 26 Sep, sessions falling the same day, orders two days later. The cause
visibly moves first. The landing conversion mark sits later (28 Sep), after the first group, which
is why it is its own group.

> "Ad spend dropped 8% when the Diwali campaign was paused, sessions down 5%, orders down 13%.
> Obvious answer: turn the ads back on."

Then point at the **Also contributing** group: landing conversion holds level for two more days,
then breaks at the theme-update flag on 28 Sep.

> "But Munshi found a second cause: landing-page conversion fell from 4.8 to 3.2% after the
> theme update on 28 Sep. Spending more on ads would be pouring water into a cracked bucket."

Click the Landing conversion strip. A popover opens on the theme-update event (a bottom sheet on a
phone).

### Beat 3: What if, the simulator argues back (45 s)

Click the link at the end of the answer (**Try this in What if**) or go to `/whatif`.

Drag **Price** to +15%. The comparison table (Base, Scenario, Change) updates as you drag: profit
falls from ₹1.61 lakh to ₹1.52 lakh, customers fall 21%, risk reads Medium.

> "Raising prices 15% makes profit worse: we'd lose about a fifth of customers."

Click **Find best strategy**. Let the counter race to "1,800 scenarios checked". The top three
strategies appear.

> "1,800 scenarios. The best isn't just more ads. It's a small price rise, ad spend up 75%, one
> more packer, 20% more stock and replies within 12 hours. Profit up about 45% at low risk. We're
> at 96% of packing capacity today, and next month's festive demand pushes it past 100%: more
> orders without a packer means delays, complaints, then churn. The model computed that; the AI
> just explained it."

### Beat 4: Act, with a leash (40 s)

Back to `/`. Click **Review 7 drafts** on the lead item.

Sheet opens: plan, then drafts. Point at the first draft, to Priya at Tulsi Living.

> "It read each thread. This one asked whether 60 mug sets instead of 40 would work across two
> colourways. The draft answers that, in Meera's tone, on WhatsApp."

Click **Approve and send 7**. The button shows "Sending 7..." while it works. Then the sheet shows
its Done state: the effects list with check icons, "Expected about ₹1.1 lakh over 14 days" and
"I'll check back on Friday." The toast "7 follow-ups sent" fires on completion. Close the sheet
(Close or Esc). Behind it Today has already re-ranked and the lead item has changed to the next
thing.

> "Seven messages out, CRM updated, expected ₹1.1 lakh in 14 days. And the brief already moved
> on to the next thing."

### Beat 5: Close (10 s)

Flash `/horizon` for two seconds: the runway curve with the dip, and the **Assume overdue
invoices are collected** switch.

> "Not a dashboard. A decision engine with receipts. That's Munshi."

---

## If something breaks

| Symptom | Do |
|---|---|
| Live model slow or fails | In `auto` the request falls back to the matching script and the label reads "Demo answers"; say nothing. If you are in `live`, there is no fallback: set `MUNSHI_AI_MODE=scripted`, restart, hard refresh. If no script matches the question, the answer says "I could not reach the model and have no recorded answer for this question." In `scripted`, an unknown question gets "I only know these questions in demo mode." plus the suggestion chips: pick one. |
| Trail doesn't animate | Reduced-motion is on at OS level. The trail still renders, fully drawn. Continue, and point at the onset marks yourself. |
| A strip says "unverified" | The engine found no evidence for it and is saying so (a strip with evidence but no clear onset just has no onset mark). Don't hide it; it is the honest answer to the next question below. |
| State looks wrong (findings already handled) | Hard refresh resets the world to the seed; the store is in memory only. |
| Projector washes out | Zoom to 125%; light mode was chosen for this. |

## Questions judges ask (and the honest answers)

- **"Is the data real?"** It's a generated digital twin of a realistic business with planted,
  intersecting stories. Integrations are adapters to the same record types, and the demo doesn't
  depend on anyone's OAuth. See `docs/DATA-MODEL.md`.
- **"Does the AI make up the numbers?"** No. Detectors, the causal walk, the simulator and the
  optimizer are deterministic TypeScript with tests. The model narrates and drafts; it never emits
  a number the engine didn't compute. See `docs/ENGINE.md`.
- **"How do you know that is the cause?"** We don't claim proof of causation. The engine shows
  three things: the metrics moved together along a known business graph, the cause's change began
  on or before the effect's (that is what the stepping onset marks are), and there is a dated
  event record you can open (the campaign was paused, the theme was updated). That makes it the
  likely cause, and the answer says "likely". Anything without evidence is
  labelled unverified on screen, and a metric with no clear onset carries no onset mark. See `docs/ENGINE.md`, section 3.
- **"What stops it from sending something wrong?"** Nothing sends without an approval card, and
  every draft is editable. Actions are logged with expected vs actual impact.
- **"Why would an SMB pay?"** The ₹ at stake is on the screen every morning. The product prices
  its own ROI.
