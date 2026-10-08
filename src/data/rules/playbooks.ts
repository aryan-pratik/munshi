// Draft templates per playbook, with {{slot}} markers. The engine fills them (src/engine/playbooks);
// live mode may rewrite a filled draft in tone, never the facts in it.

export function fill(template: string, slots: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v = slots[k];
    if (v === undefined) throw new Error(`template slot {{${k}}} has no value`);
    return String(v);
  });
}

/** Answers to the question a buyer left open, chosen by what the question is about. */
export const LEAD_ANSWERS: { match: RegExp; whatsapp: string; email: string }[] = [
  {
    match: /instead of|two colourways|colourways\?/i,
    whatsapp: "Yes, {{askedQty}} across two colourways works, at the same price per set. I will send the revised total today, freight to {{city}} still included.",
    email: "Yes, we can supply {{askedQty}} across two colourways at the same price per set. I will send the revised quote today, with freight to {{city}} still included.",
  },
  {
    match: /GST|freight/i,
    whatsapp: "The ₹{{est}} is before GST at 12%, and freight to {{city}} is included. Nothing else on top.",
    email: "The quote of ₹{{est}} is exclusive of GST at 12%. Freight to {{city}} is included in it, with no other charges.",
  },
  {
    match: /sample/i,
    whatsapp: "Yes, two sample bowls can go out tomorrow by courier, at no charge against the order. Share the delivery address and I will dispatch.",
    email: "Yes, two samples can go out tomorrow by courier at no charge against the order. Please share the delivery address and I will dispatch them.",
  },
  {
    match: /colourway|lead time/i,
    whatsapp: "Yes, the mustard colourway is in stock. Dispatch within 7 working days of confirmation, so about 10 days to {{city}}.",
    email: "Yes, the runners are available in the mustard colourway. Dispatch is within 7 working days of confirmation, so about 10 days to {{city}} door to door.",
  },
  {
    match: /before the|reach/i,
    whatsapp: "If you confirm today it dispatches by Monday and reaches {{city}} in 4 to 5 days, so well before the 20th.",
    email: "If you confirm today the order dispatches by Monday and reaches {{city}} in 4 to 5 days, comfortably before the 20th.",
  },
  {
    match: /discount|go to/i,
    whatsapp: "Yes, at {{askedQty}} the price per set drops 5%, so ₹{{estAsked}} for {{askedQty}} against ₹{{est}} for {{qty}}.",
    email: "Yes, at {{askedQty}} the price per set comes down by 5%, so ₹{{estAsked}} for {{askedQty}} against ₹{{est}} for {{qty}}.",
  },
  {
    match: /flat-packed|hold till/i,
    whatsapp: "Yes, the shades ship flat-packed in sets of 6. The quote of ₹{{est}} holds till next Friday.",
    email: "Yes, the shades ship flat-packed in cartons of 6. The quote of ₹{{est}} holds till next Friday.",
  },
  {
    match: /.*/,
    whatsapp: "Yes, that works. The quote of ₹{{est}} plus GST stands, with freight to {{city}} included. Shall I confirm the order?",
    email: "Yes, that works. The quote of ₹{{est}} plus GST stands, with freight to {{city}} included. Please confirm and I will schedule dispatch.",
  },
];

export const TEMPLATES = {
  followUpLeads: {
    whatsapp: "Hi {{first}}, Meera here. Sorry for the slow reply on the {{ask}}. {{answer}}",
    email: "Dear {{first}},\n\nApologies for the delay in replying on the {{ask}}. {{answer}}\n\n{{signature}}",
    task: "Check back with {{shop}} on the ₹{{est}} quote",
  },
  collectOverdue: {
    friendly: "Dear {{first}},\n\nA gentle reminder that invoice {{number}} for ₹{{amount}}, due on {{due}}, is still open. Could you let me know when the payment will be released? Bank details are on the invoice.\n\n{{signature}}",
    firm: "Dear {{first}},\n\nInvoice {{number}} for ₹{{amount}} is now {{daysLate}} days past its due date of {{due}}{{reminders}}. We would like to settle this before the next dispatch to {{shop}}. Please release the payment this week or let me know what is holding it.\n\n{{signature}}",
    call: "Call {{contact}} at {{shop}} about invoice {{number}}, ₹{{amount}}, {{daysLate}} days late",
  },
  cancelSubscription: {
    task: "Cancel {{vendor}} {{plan}} (₹{{monthly}} a month, last used {{daysIdle}} days ago) before it renews on {{renews}}",
  },
  escalateCourier: {
    email: "Dear {{manager}},\n\nSince {{since}}, {{courier}} has carried {{carried}} of our {{region}} shipments and {{late}} of them were delivered more than {{lateDays}} days after the promised date, an average of {{avgDelay}} past promise. Our customers have raised {{tickets}} complaints in two weeks.\n\nThe late AWBs are:\n{{awbs}}\n\nPlease share what went wrong on these lanes and confirm by {{replyBy}} that {{region}} deliveries will meet a 3-day SLA. If not, we will move the {{region}} volume back to {{previous}} from next week.\n\n{{signature}}",
  },
  reorderStock: {
    email: "Dear {{supplier}},\n\nPlease treat this as our purchase order for {{qty}} × {{product}} ({{sku}}), to dispatch at the earliest. We have {{onHand}} left against about {{perDay}} a day sold, so we need the batch within your usual {{leadTime}} days.\n\nBilling and delivery as usual, Kaveri Home, MI Road, Jaipur.\n\n{{signature}}",
  },
  scheduleRenewal: {
    task: "{{label}}: ₹{{amount}} due {{due}}{{penalty}}",
    email: "Dear {{insurer}},\n\nOur shop insurance policy is due for renewal on {{due}}. Please send the renewal quote and the payment link this week so it is settled before the due date.\n\n{{signature}}",
  },
} as const;
