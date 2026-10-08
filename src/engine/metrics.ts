import type { MetricId, MetricMeta, Window, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { dayIndex, daysBetween, defaultWindows, hoursBetween, now, windowLength } from "./windows";

// Daily series derived from records (docs/ENGINE.md, section 1). Every series is full length
// (all 90 days) and memoised per World. Ratio metrics keep numerator and denominator so window
// comparisons use sums, not means of daily ratios.

export const METRICS: Record<MetricId, MetricMeta> = {
  adSpend: { id: "adSpend", label: "Ad spend", unit: "inr", goodWhen: "up" },
  sessions: { id: "sessions", label: "Sessions", unit: "count", goodWhen: "up" },
  d2cCvr: { id: "d2cCvr", label: "Site conversion", unit: "pct", goodWhen: "up" },
  landingCvr: { id: "landingCvr", label: "Landing conversion", unit: "pct", goodWhen: "up" },
  leadsNew: { id: "leadsNew", label: "New leads", unit: "count", goodWhen: "up" },
  leadsContacted: { id: "leadsContacted", label: "Leads contacted", unit: "count", goodWhen: "up" },
  leadCvr: { id: "leadCvr", label: "Lead conversion", unit: "pct", goodWhen: "up" },
  ordersD2C: { id: "ordersD2C", label: "D2C orders", unit: "count", goodWhen: "up" },
  ordersWholesale: { id: "ordersWholesale", label: "Wholesale orders", unit: "count", goodWhen: "up" },
  revenue: { id: "revenue", label: "Revenue", unit: "inr", goodWhen: "up" },
  revenueD2C: { id: "revenueD2C", label: "D2C revenue", unit: "inr", goodWhen: "up" },
  revenueWholesale: { id: "revenueWholesale", label: "Wholesale revenue", unit: "inr", goodWhen: "up" },
  aov: { id: "aov", label: "Order value", unit: "inr", goodWhen: "up" },
  deliveryDelayAvg: { id: "deliveryDelayAvg", label: "Delivery delay", unit: "days", goodWhen: "down" },
  complaints: { id: "complaints", label: "Delivery complaints", unit: "count", goodWhen: "down" },
  repeatRate: { id: "repeatRate", label: "Repeat rate", unit: "pct", goodWhen: "up" },
  cashBalance: { id: "cashBalance", label: "Cash", unit: "inr", goodWhen: "up" },
  receivablesOverdue: { id: "receivablesOverdue", label: "Overdue invoices", unit: "inr", goodWhen: "down" },
  subscriptionSpend: { id: "subscriptionSpend", label: "Subscriptions", unit: "inr", goodWhen: "down" },
};

export type MetricSeries =
  | { kind: "sum"; values: number[] }
  | { kind: "ratio"; num: number[]; den: number[]; scale: number }
  | { kind: "level"; values: number[] };

type Cache = Map<MetricId, MetricSeries>;
const cache = new WeakMap<World, Cache>();

function zeros(n: number): number[] {
  return Array<number>(n).fill(0);
}

export function metricSeries(world: World, metric: MetricId): MetricSeries {
  let c = cache.get(world);
  if (!c) {
    c = new Map();
    cache.set(world, c);
  }
  const hit = c.get(metric);
  if (hit) return hit;
  const s = build(world, metric);
  c.set(metric, s);
  return s;
}

function build(world: World, metric: MetricId): MetricSeries {
  const n = world.meta.days;
  const idx = (iso: string) => dayIndex(world, iso);
  const inRange = (d: number) => d >= 0 && d < n;
  const sumBy = <T>(xs: T[], day: (x: T) => number, val: (x: T) => number) => {
    const out = zeros(n);
    for (const x of xs) {
      const d = day(x);
      if (inRange(d)) out[d] += val(x);
    }
    return out;
  };
  const d2c = world.orders.filter((o) => o.channel === "d2c");
  const wholesale = world.orders.filter((o) => o.channel === "wholesale");
  switch (metric) {
    case "adSpend":
      return { kind: "sum", values: sumBy(world.adDays, (a) => idx(a.date), (a) => a.spend) };
    case "sessions": {
      const paid = sumBy(world.adDays, (a) => idx(a.date), (a) => a.sessions);
      const organic = sumBy(world.trafficDays, (t) => idx(t.date), (t) => t.organic);
      return { kind: "sum", values: paid.map((v, i) => v + organic[i]) };
    }
    case "d2cCvr": {
      const sessions = metricSeries(world, "sessions") as { values: number[] };
      return { kind: "ratio", num: sumBy(d2c, (o) => idx(o.createdAt), () => 1), den: sessions.values, scale: 100 };
    }
    case "landingCvr":
      return {
        kind: "ratio",
        num: sumBy(d2c.filter((o) => o.viaLanding), (o) => idx(o.createdAt), () => 1),
        den: sumBy(world.trafficDays, (t) => idx(t.date), (t) => t.landingSessions),
        scale: 100,
      };
    case "leadsNew":
      return { kind: "sum", values: sumBy(world.leads, (l) => idx(l.createdAt), () => 1) };
    case "leadsContacted":
      return { kind: "sum", values: sumBy(world.leads, (l) => idx(l.lastContactedAt), () => 1) };
    case "leadCvr": {
      // Share of quoted leads that were won within 14 days of the quote, indexed by the day the
      // lead was decided (won, lost, or quoted 14 days ago and still silent). A lead quoted less
      // than 14 days ago and still undecided is pending and counts in neither term.
      const today = now(world);
      const num = zeros(n);
      const den = zeros(n);
      for (const l of world.leads) {
        if (!l.quotedAt) continue;
        const decidedAt = l.stage === "won" ? l.wonAt : l.stage === "lost" ? l.lastInboundAt : null;
        let d: number;
        if (decidedAt) d = idx(decidedAt);
        else if (daysBetween(l.quotedAt, today) >= 14) d = idx(l.quotedAt) + 14;
        else continue;
        if (!inRange(d)) continue;
        den[d] += 1;
        if (l.stage === "won" && l.wonAt && daysBetween(l.quotedAt, l.wonAt) <= 14) num[d] += 1;
      }
      return { kind: "ratio", num, den, scale: 100 };
    }
    case "ordersD2C":
      return { kind: "sum", values: sumBy(d2c, (o) => idx(o.createdAt), () => 1) };
    case "ordersWholesale":
      return { kind: "sum", values: sumBy(wholesale, (o) => idx(o.createdAt), () => 1) };
    case "revenue":
      return { kind: "sum", values: sumBy(world.orders, (o) => idx(o.createdAt), (o) => o.total) };
    case "revenueD2C":
      return { kind: "sum", values: sumBy(d2c, (o) => idx(o.createdAt), (o) => o.total) };
    case "revenueWholesale":
      return { kind: "sum", values: sumBy(wholesale, (o) => idx(o.createdAt), (o) => o.total) };
    case "aov":
      return { kind: "ratio", num: sumBy(world.orders, (o) => idx(o.createdAt), (o) => o.total), den: sumBy(world.orders, (o) => idx(o.createdAt), () => 1), scale: 1 };
    case "deliveryDelayAvg": {
      // Days past the promised time, indexed by dispatch date, delivered shipments only. The last
      // five dispatch days are still in flight (only the quick ones have landed), so they carry
      // the last complete day's value instead of a flattering partial average.
      const delivered = world.shipments.filter((s) => s.deliveredAt);
      const num = sumBy(delivered, (s) => idx(s.dispatchedAt), (s) => hoursBetween(s.promisedAt, s.deliveredAt!) / 24);
      const den = sumBy(delivered, (s) => idx(s.dispatchedAt), () => 1);
      for (let d = Math.max(0, n - 5); d < n; d++) {
        num[d] = 0;
        den[d] = 0;
      }
      return { kind: "ratio", num, den, scale: 1 };
    }
    case "complaints":
      return { kind: "sum", values: sumBy(world.tickets.filter((t) => t.category === "delivery"), (t) => idx(t.createdAt), () => 1) };
    case "repeatRate": {
      // Share of D2C orders placed by a customer who ordered in the previous 60 days.
      const sorted = [...d2c].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      const last = new Map<string, number>();
      const num = zeros(n);
      const den = zeros(n);
      for (const o of sorted) {
        const d = idx(o.createdAt);
        const prev = last.get(o.customerId);
        if (inRange(d)) {
          den[d] += 1;
          if (prev !== undefined && d - prev <= 60) num[d] += 1;
        }
        last.set(o.customerId, d);
      }
      return { kind: "ratio", num, den, scale: 100 };
    }
    case "cashBalance": {
      const daily = sumBy(world.bankTxns, (t) => idx(t.date), (t) => t.amount);
      let run = 0;
      return { kind: "level", values: daily.map((v) => (run += v)) };
    }
    case "receivablesOverdue": {
      const values = zeros(n);
      for (const inv of world.invoices) {
        const due = idx(inv.dueDate);
        const paid = inv.paidAt ? idx(inv.paidAt) : n;
        for (let d = Math.max(0, due + 1); d < Math.min(n, paid); d++) values[d] += inv.amount;
      }
      return { kind: "level", values };
    }
    case "subscriptionSpend": {
      const values = zeros(n);
      for (const s of world.subscriptions) {
        if (s.status !== "active") continue;
        for (let d = Math.max(0, idx(s.createdAt)); d < n; d++) values[d] += s.monthlyINR;
      }
      return { kind: "level", values };
    }
  }
}

/** The daily values of a metric, full length. Ratio days with no denominator carry the previous value. */
export function series(world: World, metric: MetricId): number[] {
  const s = metricSeries(world, metric);
  if (s.kind !== "ratio") return s.values;
  const out: number[] = [];
  let prev = 0;
  for (let i = 0; i < s.num.length; i++) {
    if (s.den[i] > 0) prev = (s.num[i] / s.den[i]) * s.scale;
    out.push(prev);
  }
  return out;
}

/** Value of a metric over a window: a sum, a ratio of sums, or the mean level. */
export function windowValue(world: World, metric: MetricId, w: Window): number {
  const s = metricSeries(world, metric);
  const from = dayIndex(world, w.from);
  const to = dayIndex(world, w.to);
  const slice = (xs: number[]) => xs.slice(Math.max(0, from), Math.min(xs.length, to + 1));
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  if (s.kind === "sum") return sum(slice(s.values));
  if (s.kind === "level") {
    const v = slice(s.values);
    return v.length ? sum(v) / v.length : 0;
  }
  const den = sum(slice(s.den));
  return den > 0 ? (sum(slice(s.num)) / den) * s.scale : 0;
}

/** Per-day value of a metric over a window (sums are divided by the window length). */
export function windowPerDay(world: World, metric: MetricId, w: Window): number {
  const s = metricSeries(world, metric);
  const v = windowValue(world, metric, w);
  return s.kind === "sum" ? v / windowLength(w) : v;
}

export function compareWindows(world: World, metric: MetricId, windows = defaultWindows(world)) {
  const current = windowValue(world, metric, windows.current);
  const previous = windowValue(world, metric, windows.previous);
  const delta = current - previous;
  const deltaPct = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
  return { current, previous, delta, deltaPct, windows };
}

/** The 28 points the UI draws: previous 14 days, then the current 14, ending at `window.to`. */
export function stripSeries(world: World, metric: MetricId, window: Window, points = 28): number[] {
  const all = series(world, metric);
  const to = dayIndex(world, window.to);
  const from = Math.max(0, to - points + 1);
  return all.slice(from, to + 1);
}

export { THRESHOLDS };
