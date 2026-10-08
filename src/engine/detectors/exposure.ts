import type { Finding, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { inr, inrCompact } from "@/lib/format";
import { addDays, dayIndex, daysBetween } from "../windows";
import { horizon } from "../horizon";
import { finding, projectionSeries, recordSeries, ref, type DetectorCtx } from "./shared";

/** One customer at or above a quarter of 90-day revenue. Impact 0; exposure is their revenue. */
export function customerConcentration(world: World, ctx: DetectorCtx): Finding[] {
  const total = world.orders.reduce((s, o) => s + o.total, 0);
  if (!total) return [];
  const byCustomer = new Map<string, number>();
  for (const o of world.orders) byCustomer.set(o.customerId, (byCustomer.get(o.customerId) ?? 0) + o.total);
  const [topId, topRevenue] = [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = topRevenue / total;
  if (share < THRESHOLDS.concentrationShare) return [];
  const customer = world.customers.find((c) => c.id === topId)!;
  const orders = world.orders.filter((o) => o.customerId === topId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Cumulative share by day; onset is the first day it reached the threshold.
  const n = world.meta.days;
  const cumAll = Array<number>(n).fill(0);
  const cumTop = Array<number>(n).fill(0);
  for (const o of world.orders) {
    const d = dayIndex(world, o.createdAt);
    if (d < 0 || d >= n) continue;
    cumAll[d] += o.total;
    if (o.customerId === topId) cumTop[d] += o.total;
  }
  let a = 0;
  let t = 0;
  const shareOn: number[] = [];
  for (let d = 0; d < n; d++) {
    a += cumAll[d];
    t += cumTop[d];
    shareOn.push(a ? (t / a) * 100 : 0);
  }
  const onsetDay = shareOn.findIndex((s, d) => d >= 7 && s >= THRESHOLDS.concentrationShare * 100);
  const onset = onsetDay >= 0 ? addDays(world.meta.day0, onsetDay) : null;
  const overdue = world.invoices.filter((i) => i.customerId === topId && i.status === "unpaid" && i.dueDate < ctx.now);
  return [
    finding({
      detector: "customerConcentration",
      severity: "medium",
      title: `${customer.name} is ${Math.round(share * 100)}% of revenue, ${inrCompact(topRevenue)} exposed`,
      impactINR: 0,
      exposureINR: topRevenue,
      confidence: 1,
      window: { from: addDays(ctx.now, -27), to: ctx.now },
      onset,
      series: recordSeries(world, ctx.now, onset, (d) => shareOn[d] ?? 0),
      evidence: [ref(customer.source, "customer", customer.id), ...orders.slice(-4).map((o) => ref(o.source, "order", o.id)), ...overdue.map((i) => ref(i.source, "invoice", i.id))],
      explain: `${customer.name}, ${customer.city} placed ${orders.length} orders worth ${inr(topRevenue)} in 90 days, ${Math.round(share * 100)}% of all revenue.${overdue.length ? ` They are also ${daysBetween(overdue[0].dueDate, ctx.now)} days late on ${inr(overdue.reduce((s, i) => s + i.amount, 0))}.` : ""} Losing them would take ${inrCompact(topRevenue / 3)} a month with it.`,
      playbooks: [],
    }),
  ];
}

/** Projected cash under the buffer within 30 days. Forward-looking: onset null, window.to is the dip. */
export function cashCrunch(world: World, ctx: DetectorCtx): Finding[] {
  const h = horizon(world);
  if (!h.dip) return [];
  const dipDay = h.dip.day;
  const beforeDip = h.upcoming.filter((u) => u.day <= dipDay && u.amount < 0).sort((a, b) => a.amount - b.amount);
  const biggest = beforeDip[0];
  const overdue = world.invoices.filter((i) => i.status === "unpaid" && i.dueDate < ctx.now);
  const recovers = !h.dipWithCollection;
  return [
    finding({
      detector: "cashCrunch",
      severity: "high",
      title: `Cash dips ${inr(h.dip.shortfall)} under the ${inrCompact(h.buffer)} buffer in ${dipDay} days`,
      impactINR: h.dip.shortfall,
      confidence: 0.75,
      window: { from: ctx.now, to: h.dip.date },
      onset: null,
      series: projectionSeries(Math.min(28, h.points.length), (k) => h.points[k].balance),
      evidence: [
        ...(biggest ? [biggest.ref] : []),
        ...beforeDip.slice(1, 4).map((u) => u.ref),
        ...overdue.map((i) => ref(i.source, "invoice", i.id)),
      ],
      explain: `From ${inrCompact(h.cashToday)} today, known outflows${biggest ? ` (${biggest.label.toLowerCase()} ${inr(-biggest.amount)} on day ${biggest.day})` : ""} take cash to ${inr(h.dip.balance)} on ${h.dip.date.slice(8)}/${h.dip.date.slice(5, 7)}, ${inr(h.dip.shortfall)} under the buffer.${recovers && h.overdueINR ? ` Collecting the ${inr(h.overdueINR)} of overdue invoices keeps it above the buffer.` : ""}`,
      playbooks: ["collectOverdue"],
    }),
  ];
}

/** Obligations (insurance, GST, domain, lease) due within 21 days, not yet handled. One aggregated finding. */
export function renewalDue(world: World, ctx: DetectorCtx): Finding[] {
  const due = world.obligations
    .filter((o) => !o.handledAt && ["insurance", "gst", "domain", "lease"].includes(o.kind) && daysBetween(ctx.now, o.dueDate) >= 0 && daysBetween(ctx.now, o.dueDate) <= THRESHOLDS.renewalWithinDays)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!due.length) return [];
  const penalties = due.reduce((s, o) => s + o.penaltyINR, 0);
  const amounts = due.reduce((s, o) => s + o.amountINR, 0);
  const first = due[0];
  const list = due.map((o) => `${o.label.split(",")[0]} in ${daysBetween(ctx.now, o.dueDate)} days`).join(", ");
  return [
    finding({
      detector: "renewalDue",
      aggregate: true,
      severity: "medium",
      title: `${due.length} renewals and filings due within 3 weeks, ${inr(penalties)} in penalties if missed`,
      impactINR: penalties,
      confidence: 1,
      window: { from: ctx.now, to: first.dueDate },
      onset: null,
      series: projectionSeries(28, (k) => due.filter((o) => daysBetween(ctx.now, o.dueDate) <= k).reduce((s, o) => s + o.amountINR, 0)),
      evidence: due.map((o) => ref(o.source, "obligation", o.id)),
      explain: `${list}. Together ${inr(amounts)} to pay, and ${inr(penalties)} in late fees and lapses if any is missed.`,
      playbooks: ["scheduleRenewal"],
    }),
  ];
}
