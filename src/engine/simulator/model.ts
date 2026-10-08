import type { Levers, Outcome, Scenario, World } from "@/types";
import { inr } from "@/lib/format";
import { addDays, dayIndex, daysBetween, now } from "../windows";
import { series, windowValue } from "../metrics";
import { leadWinRate } from "../detectors/leads";

// A monthly steady-state model calibrated from the last 30 days of the world
// (docs/ENGINE.md, section 4). Levers are percent points; converted once here.

export const BASE_LEVERS: Levers = { pricePct: 0, marketingPct: 0, hires: 0, inventoryPct: 0, followUpHours: 48 };

export const LEVER_RANGES = {
  pricePct: { min: -20, max: 30, step: 1 },
  marketingPct: { min: -50, max: 100, step: 5 },
  hires: { min: 0, max: 4, step: 1 },
  inventoryPct: { min: -30, max: 50, step: 5 },
  followUpHours: [4, 12, 24, 48] as const,
};

const BOOST: Record<Levers["followUpHours"], number> = { 48: 1, 24: 1.15, 12: 1.28, 4: 1.35 };
const FOLLOW_UP_COST: Record<Levers["followUpHours"], number> = { 48: 0, 24: 9_000, 12: 21_000, 4: 45_000 };
const E_D2C = 1.3;
const E_WS = 0.6;
const MARKETING_EXP = 0.75;
const ACCOUNT_LOSS = 0.8;
const COMPLAINT_MULT = 8;
const BASE_CHURN = 0.06;

export type BaseInputs = {
  P0: number; O0: number; ordersD0: number; c0: number; aovD: number; aovW: number;
  R0: number; L0: number; w0: number; ordersW0: number; cogsD: number; cogsW: number; shipping: number;
  M0: number; payroll0: number; salary: number; fixed: number; inventoryValue: number;
  staff0: number; ordersPerPersonPerMonth: number; cr0: number; r0: number; stockHeadroom: number;
  cash0: number; A0: number; festiveLift: number;
};

const baseCache = new WeakMap<World, BaseInputs>();

/** `base.*` from the last 30 days of the world. */
export function baseInputs(world: World): BaseInputs {
  const hit = baseCache.get(world);
  if (hit) return hit;
  const today = now(world);
  const w = { from: addDays(today, -29), to: today };
  const last30 = <T extends { createdAt: string }>(xs: T[]) => xs.filter((x) => daysBetween(x.createdAt, today) < 30);
  const d2c = last30(world.orders.filter((o) => o.channel === "d2c"));
  const ws = last30(world.orders.filter((o) => o.channel === "wholesale"));
  const sum = (xs: { total: number }[]) => xs.reduce((s, o) => s + o.total, 0);
  const P0 = world.adDays.filter((a) => daysBetween(a.date, today) < 30).reduce((s, a) => s + a.sessions, 0);
  const O0 = world.trafficDays.filter((t) => daysBetween(t.date, today) < 30).reduce((s, t) => s + t.organic, 0);
  const ordersD0 = d2c.length;
  const aovD = ordersD0 ? sum(d2c) / ordersD0 : 1250;
  const aovW = ws.length ? sum(ws) / ws.length : 21600;
  const existing = new Set(world.customers.filter((c) => c.type === "wholesale" && c.createdAt <= world.meta.day0).map((c) => c.id));
  const R0 = ws.filter((o) => existing.has(o.customerId)).length;
  const L0 = last30(world.leads).length;
  const w0 = leadWinRate(world);
  const ordersW0 = R0 + L0 * w0 * BOOST[48];
  const bySku = new Map(world.products.map((p) => [p.sku, p]));
  const cogsOf = (orders: typeof d2c) => {
    let cost = 0;
    let rev = 0;
    for (const o of orders) for (const l of o.lines) {
      cost += l.qty * (bySku.get(l.sku)?.unitCost ?? l.price * 0.4);
      rev += l.qty * l.price;
    }
    return rev ? cost / rev : 0.4;
  };
  const M0 = windowValue(world, "adSpend", w);
  const payroll0 = -world.bankTxns.filter((t) => t.category === "payroll").sort((a, b) => b.date.localeCompare(a.date))[0]?.amount || 4_10_000;
  const monthlyBills = (cats: string[]) => {
    const bills = world.bills.filter((b) => b.recurring && cats.includes(b.category));
    const months = Math.max(1, Math.round(world.meta.days / 30));
    return bills.reduce((s, b) => s + b.amount, 0) / months;
  };
  const subs = world.subscriptions.filter((s) => s.status === "active").reduce((s, x) => s + x.monthlyINR, 0);
  const loan = world.obligations.find((o) => o.kind === "loan")?.amountINR ?? 0;
  const fixed = monthlyBills(["rent", "electricity", "internet", "packaging", "services", "other"]) + courierFixed(world) + subs + loan;
  const inventoryValue = world.products.reduce((s, p) => s + p.onHand * p.unitCost, 0);
  const units30 = last30(world.orders).flatMap((o) => o.lines).reduce((s, l) => s + l.qty, 0);
  const onHand = world.products.reduce((s, p) => s + p.onHand, 0);
  const tickets = last30(world.tickets).filter((t) => t.category !== "delivery").length;
  const cr0 = ordersD0 + ws.length ? tickets / (ordersD0 + ws.length) : 0.0125;
  const r0 = windowValue(world, "repeatRate", { from: addDays(today, -59), to: today }) / 100 || 0.22;
  const base: BaseInputs = {
    P0, O0, ordersD0, c0: ordersD0 / (P0 + O0), aovD, aovW, R0, L0, w0, ordersW0,
    cogsD: cogsOf(d2c), cogsW: cogsOf(ws), shipping: 90, M0, payroll0,
    salary: world.meta.business.salaryPerHireINR, fixed, inventoryValue,
    staff0: world.meta.business.staffOps, ordersPerPersonPerMonth: world.meta.business.ordersPerPersonPerMonth,
    cr0, r0, stockHeadroom: units30 ? onHand / units30 : 1.12,
    cash0: world.bankTxns.reduce((s, t) => s + t.amount, 0), A0: existing.size,
    festiveLift: world.meta.business.festiveLift,
  };
  baseCache.set(world, base);
  return base;
}

function courierFixed(world: World): number {
  // Shiprocket's fixed platform fee: the bill less ₹90 a shipment for the month it covers.
  const bills = world.bills.filter((b) => b.category === "courier");
  if (!bills.length) return 0;
  const perMonth = bills.map((b) => {
    const to = dayIndex(world, b.billDate);
    const n = world.shipments.filter((s) => dayIndex(world, s.dispatchedAt) >= to - 31 && dayIndex(world, s.dispatchedAt) < to).length;
    return Math.max(0, b.amount - 90 * n);
  });
  return perMonth.reduce((a, b) => a + b, 0) / perMonth.length;
}

export type SimDetail = Outcome & { overload: number; demand: number; capacity: number; dChurn: number; ordersD: number; ordersW: number; accountsLost: number; fulfil: number };

export function run(b: BaseInputs, levers: Levers): SimDetail {
  const p = levers.pricePct / 100;
  const m = levers.marketingPct / 100;
  const i = levers.inventoryPct / 100;
  const pPlus = Math.max(0, p);
  const boost = BOOST[levers.followUpHours];
  const traffic = b.P0 * Math.pow(1 + m, MARKETING_EXP) + b.O0;
  const newD = traffic * b.c0 * Math.pow(1 + p, -E_D2C) * b.festiveLift;
  const accKeep = 1 - ACCOUNT_LOSS * pPlus;
  const newW = accKeep * (b.R0 + b.L0 * b.w0 * boost) * Math.pow(1 + p, -E_WS) * b.festiveLift;
  const demand = newD + newW;
  const capacity = (b.staff0 + levers.hires) * b.ordersPerPersonPerMonth;
  const overload = Math.max(0, demand / capacity - 1);
  const complaintRt = b.cr0 * (1 + COMPLAINT_MULT * overload);
  const dChurn = 0.7 * pPlus + 1.5 * (complaintRt - b.cr0);
  const rho = (1 + b.r0 - dChurn) / (1 + b.r0);
  const stockUnits = (1 + i) * (b.ordersD0 + b.ordersW0) * b.stockHeadroom;
  const fulfil = Math.min(1, capacity / demand, stockUnits / (demand * rho));
  const ordersD = newD * rho * fulfil;
  const ordersW = newW * rho * fulfil;
  const revenue = (ordersD * b.aovD + ordersW * b.aovW) * (1 + p);
  const cogs = ordersD * b.aovD * b.cogsD + ordersW * b.aovW * b.cogsW;
  const costs = b.M0 * (1 + m) + (b.payroll0 + levers.hires * b.salary) + b.fixed + ordersD * b.shipping + 0.02 * b.inventoryValue * (1 + i) + FOLLOW_UP_COST[levers.followUpHours];
  const profit = revenue - cogs - costs;
  const outflow = cogs + costs;
  const cashRunwayDays = b.cash0 / (outflow / 30);
  const customers = ordersD / 1.08 + b.A0 * (1 - ACCOUNT_LOSS * pPlus);
  return {
    revenue, customers, churnPct: (BASE_CHURN + dChurn) * 100, profit, cashRunwayDays,
    overload, demand, capacity, dChurn, ordersD, ordersW, accountsLost: b.A0 * ACCOUNT_LOSS * pPlus, fulfil,
  };
}

export function riskScoreOf(d: SimDetail): number {
  const churn = d.dChurn * 100;
  return (d.cashRunwayDays < 10 ? 1 : 0) + (churn > 5 ? 2 : churn > 2 ? 1 : 0) + (d.overload > 0.15 ? 2 : d.overload > 0.05 ? 1 : 0);
}

export function riskOf(score: number): Scenario["risk"] {
  return score <= 1 ? "low" : score === 2 ? "medium" : "high";
}

export function simulate(world: World, levers: Levers): Scenario {
  const b = baseInputs(world);
  const d = run(b, levers);
  const score = riskScoreOf(d);
  const notes: string[] = [];
  const util = Math.round((d.demand / d.capacity) * 100);
  if (d.overload > 0) notes.push(`Fulfilment at ${util}% of capacity, so delays rise`);
  else notes.push(`Fulfilment at ${util}% of capacity`);
  if (d.accountsLost >= 0.5) notes.push(`About ${Math.round(d.accountsLost)} wholesale account${Math.round(d.accountsLost) === 1 ? "" : "s"} would likely leave`);
  if (levers.followUpHours < 48) notes.push(`Faster follow-up lifts wholesale wins by ${Math.round((BOOST[levers.followUpHours] - 1) * 100)}%, at ${inr(FOLLOW_UP_COST[levers.followUpHours])} a month`);
  if (levers.marketingPct > 0) notes.push(`Paid traffic grows ${Math.round((Math.pow(1 + levers.marketingPct / 100, MARKETING_EXP) - 1) * 100)}% for ${levers.marketingPct}% more spend`);
  if (d.fulfil < 1 && d.fulfil * d.demand < d.capacity - 0.5) notes.push(`Stock, not staff, caps orders at ${Math.round(d.fulfil * 100)}% of demand`);
  if (d.cashRunwayDays < 10) notes.push(`Cash covers ${d.cashRunwayDays.toFixed(1)} days of costs with no sales`);
  return {
    levers,
    outcome: {
      revenue: Math.round(d.revenue),
      customers: Math.round(d.customers),
      churnPct: Math.round(d.churnPct * 10) / 10,
      profit: Math.round(d.profit),
      cashRunwayDays: Math.round(d.cashRunwayDays * 10) / 10,
    },
    risk: riskOf(score),
    riskScore: score,
    notes,
  };
}

const baseScenario = new WeakMap<World, Scenario>();
export function simulateBase(world: World): Scenario {
  const hit = baseScenario.get(world);
  if (hit) return hit;
  const s = simulate(world, BASE_LEVERS);
  baseScenario.set(world, s);
  return s;
}

export { series };
