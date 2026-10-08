import type { RecordRef, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { addDays, dayIndex, daysBetween, now } from "./windows";
import { series } from "./metrics";

// 30-day cash projection (docs/ENGINE.md, section 6): cash today + expected inflows (invoices by
// due date × historical on-time rate, D2C run-rate) − known outflows (obligations, payroll,
// recurring bills, unpaid bills, subscriptions, ad spend run-rate). The Horizon switch "Assume
// overdue invoices are collected" adds the overdue invoices as an inflow a week out.

export type RunwayPoint = { day: number; date: string; balance: number; withCollection: number };
export type Upcoming = {
  date: string;
  day: number;
  label: string;
  amount: number; // signed: inflow positive
  kind: "obligation" | "bill" | "subscription" | "invoice" | "payroll";
  ref: RecordRef;
  certainty: "known" | "expected";
};
export type Horizon = {
  cashToday: number;
  buffer: number;
  points: RunwayPoint[];
  upcoming: Upcoming[];
  dip: { day: number; date: string; balance: number; shortfall: number } | null;
  dipWithCollection: { day: number; date: string; balance: number; shortfall: number } | null;
  overdueINR: number;
  onTimeRate: number;
  d2cPerDay: number;
  adsPerDay: number;
};

const cache = new WeakMap<World, Horizon>();

export function horizon(world: World): Horizon {
  const hit = cache.get(world);
  if (hit) return hit;
  const h = build(world);
  cache.set(world, h);
  return h;
}

function build(world: World): Horizon {
  const today = now(world);
  const days = THRESHOLDS.horizonDays;
  const buffer = world.meta.business.cashBufferINR;
  const cashToday = world.bankTxns.reduce((s, t) => s + t.amount, 0);
  const idx = (iso: string) => daysBetween(today, iso); // 0 = today, 1 = tomorrow

  // Expected inflows
  const d2c = series(world, "revenueD2C");
  const d2cPerDay = (d2c.slice(-30).reduce((a, b) => a + b, 0) / 30) * 0.98;
  const paidInvoices = world.invoices.filter((i) => i.paidAt);
  const onTime = paidInvoices.filter((i) => daysBetween(i.dueDate, i.paidAt!) <= 2).length;
  const onTimeRate = paidInvoices.length ? onTime / paidInvoices.length : 0.8;
  const overdue = world.invoices.filter((i) => i.status === "unpaid" && i.dueDate < today);
  const overdueINR = overdue.reduce((s, i) => s + i.amount, 0);

  const inflow = Array<number>(days + 1).fill(0);
  const outflow = Array<number>(days + 1).fill(0);
  const upcoming: Upcoming[] = [];
  const add = (day: number, amount: number, u?: Omit<Upcoming, "day" | "date" | "amount">) => {
    if (day < 1 || day > days) return;
    amount = Math.round(amount);
    if (amount >= 0) inflow[day] += amount;
    else outflow[day] += -amount;
    if (u) upcoming.push({ ...u, day, date: addDays(today, day), amount });
  };
  for (let k = 1; k <= days; k++) inflow[k] += d2cPerDay;
  for (const i of world.invoices.filter((x) => x.status === "unpaid" && x.dueDate >= today)) {
    const c = world.customers.find((x) => x.id === i.customerId);
    add(Math.max(1, idx(i.dueDate)), i.amount * onTimeRate, { label: `${c?.name ?? "Invoice"} ${i.number}`, kind: "invoice", ref: { source: i.source, kind: "invoice", id: i.id }, certainty: "expected" });
  }

  // Known outflows
  for (const o of world.obligations.filter((x) => !x.handledAt && x.amountINR > 0)) {
    add(idx(o.dueDate), -o.amountINR, { label: o.label, kind: o.kind === "payroll" ? "payroll" : "obligation", ref: { source: o.source, kind: "obligation", id: o.id }, certainty: "known" });
  }
  for (const b of world.bills.filter((x) => !x.paidAt)) {
    add(Math.max(1, idx(b.dueDate)), -b.amount, { label: `${b.vendor} bill`, kind: "bill", ref: { source: b.source, kind: "bill", id: b.id }, certainty: "known" });
  }
  // Recurring bills: the next occurrence of each vendor's last recurring bill, a month on
  const byVendor = new Map<string, (typeof world.bills)[number]>();
  for (const b of world.bills.filter((x) => x.recurring).sort((a, b) => a.billDate.localeCompare(b.billDate))) byVendor.set(b.vendor, b);
  for (const b of byVendor.values()) {
    const next = daysBetween(today, addDays(b.billDate, 31)) + daysBetween(b.billDate, b.dueDate);
    if (next >= 1 && next <= days) add(next, -b.amount, { label: `${b.vendor} (expected)`, kind: "bill", ref: { source: b.source, kind: "bill", id: b.id }, certainty: "expected" });
  }
  for (const s of world.subscriptions.filter((x) => x.status === "active")) {
    let d = idx(s.renewsOn);
    while (d < 1) d += 30;
    add(d, -s.monthlyINR, { label: `${s.vendor} ${s.plan}`, kind: "subscription", ref: { source: s.source, kind: "subscription", id: s.id }, certainty: "known" });
  }
  const adSpend = series(world, "adSpend");
  const adsPerDay = adSpend.slice(-14).reduce((a, b) => a + b, 0) / 14;
  for (let k = 1; k <= days; k++) outflow[k] += adsPerDay;

  // Walk the days
  const points: RunwayPoint[] = [{ day: 0, date: today, balance: cashToday, withCollection: cashToday }];
  let bal = cashToday;
  let balC = cashToday;
  const collectDay = 7;
  for (let k = 1; k <= days; k++) {
    bal += inflow[k] - outflow[k];
    balC += inflow[k] - outflow[k] + (k === collectDay ? overdueINR : 0);
    points.push({ day: k, date: addDays(today, k), balance: Math.round(bal), withCollection: Math.round(balC) });
  }
  const dipOf = (key: "balance" | "withCollection") => {
    let min = points[0];
    for (const p of points) if (p[key] < min[key]) min = p;
    return min[key] < buffer ? { day: min.day, date: min.date, balance: min[key], shortfall: Math.round(buffer - min[key]) } : null;
  };
  upcoming.sort((a, b) => a.day - b.day || b.amount - a.amount);
  return {
    cashToday: Math.round(cashToday),
    buffer,
    points,
    upcoming,
    dip: dipOf("balance"),
    dipWithCollection: dipOf("withCollection"),
    overdueINR,
    onTimeRate: Math.round(onTimeRate * 100) / 100,
    d2cPerDay: Math.round(d2cPerDay),
    adsPerDay: Math.round(adsPerDay),
  };
}

export { dayIndex };
