import type { DetectorId, Event, MetricId, World } from "@/types";
import { dayOf, daysBetween, defaultWindows, inWindow, now } from "@/engine/windows";
import type { Rng } from "./rng";

// The twelve planted stories (docs/DATA-MODEL.md, section 3). Each story has:
//   plant   constants the baseline generator reads so the curves step on the planted day
//   apply   additive records written after the baseline (events, leads, invoices, bills ...)
//   expect  what the Phase 2 engine tests must prove
//   report  record-only facts printed by `pnpm seed` and asserted by seed.test.ts
// The numbers here are targets; the generator may jitter them within ±10%.

export type StoryExpect =
  | { detector: DetectorId; minImpact: number }
  | { chain: { target: MetricId; nodes: MetricId[]; branch: MetricId } }
  | { simulator: { hires: number } };

export type ReportRow = { label: string; value: string | number; ok: boolean };

export type Story = {
  id: string;
  title: string;
  apply(world: World, rng: Rng): void;
  expect: StoryExpect;
  report(world: World): ReportRow[];
};

/** Constants the baseline generator reads. Days are offsets from meta.day0. */
export const PLANT = {
  s2: { campaign: "Diwali Early", startDay: 62, pauseDay: 77, spendPerDay: 235, sessionsPerDay: 52 },
  s3: { day: 79, cvrBefore: 0.048, cvrAfter: 0.031 },
  s5: { day: 74, region: "NCR", courierBefore: "Delhivery", courierAfter: "Xpressbees", delayBefore: 1.2, delayAfter: 3.4 },
  s7: { vendor: "Airtel", amounts: [1499, 1499, 1899] as const, days: [0, 30, 60] as const },
  s6: { customerId: "w01", shop: "Saffron Stories", city: "Bengaluru", share: 0.31 },
  s9: { sku: "CER-MUG4", onHand: 33, leadTimeDays: 18 },
  s11: { staffOps: 4, ordersPerPersonPerMonth: 177, festiveLift: 1.06 },
} as const;

function evt(world: World, e: Omit<Event, "source" | "createdAt"> & { source: Event["source"] }): Event {
  const full: Event = { ...e, createdAt: e.at };
  world.events.push(full);
  return full;
}

const row = (label: string, value: string | number, ok: boolean): ReportRow => ({ label, value, ok });
const within = (x: number, target: number, tol = 0.1) => Math.abs(x - target) <= Math.abs(target) * tol;

// ---------------------------------------------------------------------------------------------

export const S1: Story = {
  id: "S1",
  title: "7 hot wholesale leads gone cold",
  apply(world, rng) {
    // Leads, threads and messages are written by the generator's lead section using these specs.
    void world;
    void rng;
  },
  expect: { detector: "staleHighValueLeads", minImpact: 99_000 },
  report(world) {
    const today = now(world);
    const stale = world.leads.filter(
      (l) => l.stage === "quoted" && l.estValueINR >= 10_000 && hoursBetween(l.lastContactedAt, `${today}T18:00:00+05:30`) >= 48,
    );
    const sum = stale.reduce((s, l) => s + l.estValueINR, 0);
    const inboundLast = stale.every((l) => {
      const last = l.thread[l.thread.length - 1];
      const m = world.messages.find((x) => x.id === last.id);
      return m?.direction === "in";
    });
    return [
      row("stale quoted leads", stale.length, stale.length === 7),
      row("quoted value", sum, sum === 184_000),
      row("last message inbound", String(inboundLast), inboundLast),
      row("worth at 0.60", Math.round(sum * 0.6), Math.round(sum * 0.6) === 110_400),
    ];
  },
};

export const S2: Story = {
  id: "S2",
  title: "D2C revenue down 14% since the Diwali Early campaign was paused",
  apply(world) {
    evt(world, {
      id: "ev-campaign-paused",
      source: "meta-ads",
      kind: "campaign_paused",
      at: dayOf(world, PLANT.s2.pauseDay),
      label: "Diwali Early campaign paused",
      anchors: { metric: "adSpend" },
      detail: "Campaign \"Diwali Early\" set to paused in Meta Ads Manager. Daily budget was ₹235.",
    });
  },
  expect: { chain: { target: "revenueD2C", nodes: ["adSpend", "sessions", "ordersD2C", "revenueD2C"], branch: "landingCvr" } },
  report(world) {
    const { current, previous } = defaultWindows(world);
    const spend = (w: typeof current) => world.adDays.filter((a) => inWindow(a.date, w)).reduce((s, a) => s + a.spend, 0);
    const sessions = (w: typeof current) =>
      world.adDays.filter((a) => inWindow(a.date, w)).reduce((s, a) => s + a.sessions, 0) +
      world.trafficDays.filter((t) => inWindow(t.date, w)).reduce((s, t) => s + t.organic, 0);
    const orders = (w: typeof current) => world.orders.filter((o) => o.channel === "d2c" && inWindow(o.createdAt, w)).length;
    const rev = (w: typeof current, ch?: "d2c" | "wholesale") =>
      world.orders.filter((o) => (!ch || o.channel === ch) && inWindow(o.createdAt, w)).reduce((s, o) => s + o.total, 0);
    const d = (f: (w: typeof current) => number) => (f(current) / f(previous) - 1) * 100;
    const paused = world.adDays.filter((a) => a.campaign === PLANT.s2.campaign && a.status === "paused");
    const ev = world.events.find((e) => e.kind === "campaign_paused");
    return [
      row("event day", ev ? daysBetween(world.meta.day0, ev.at) : -1, ev?.at === dayOf(world, 77)),
      row("paused ad days from", paused[0]?.date ?? "none", paused[0]?.date === dayOf(world, 77)),
      row("ad spend delta %", d(spend).toFixed(1), within(d(spend), -7, 0.35)),
      row("sessions delta %", d(sessions).toFixed(1), within(d(sessions), -6, 0.35)),
      row("D2C orders delta %", d(orders).toFixed(1), within(d(orders), -14, 0.25)),
      row("D2C revenue delta %", d((w) => rev(w, "d2c")).toFixed(1), within(d((w) => rev(w, "d2c")), -14, 0.25)),
      row("wholesale revenue delta %", d((w) => rev(w, "wholesale")).toFixed(1), Math.abs(d((w) => rev(w, "wholesale"))) <= 2),
      row("total revenue delta %", d((w) => rev(w)).toFixed(1), within(d((w) => rev(w)), -6, 0.35)),
    ];
  },
};

export const S3: Story = {
  id: "S3",
  title: "Landing conversion fell after the theme update",
  apply(world) {
    evt(world, {
      id: "ev-theme-updated",
      source: "shopify",
      kind: "theme_updated",
      at: dayOf(world, PLANT.s3.day),
      label: "Shopify theme updated",
      anchors: { metric: "landingCvr" },
      detail: "Theme \"Kaveri 2.0\" published. Collection landing pages now open on a full-screen hero image.",
    });
  },
  expect: { detector: "conversionDrop", minImpact: 70_000 },
  report(world) {
    const { current, previous } = defaultWindows(world);
    const cvr = (w: typeof current) => {
      const orders = world.orders.filter((o) => o.channel === "d2c" && o.viaLanding && inWindow(o.createdAt, w)).length;
      const sessions = world.trafficDays.filter((t) => inWindow(t.date, w)).reduce((s, t) => s + t.landingSessions, 0);
      return (orders / sessions) * 100;
    };
    const ev = world.events.find((e) => e.kind === "theme_updated");
    const landingShare =
      world.orders.filter((o) => o.channel === "d2c" && o.viaLanding && inWindow(o.createdAt, previous)).length /
      world.orders.filter((o) => o.channel === "d2c" && inWindow(o.createdAt, previous)).length;
    return [
      row("event day", ev ? daysBetween(world.meta.day0, ev.at) : -1, ev?.at === dayOf(world, 79)),
      row("landing cvr previous %", cvr(previous).toFixed(2), within(cvr(previous), 4.9, 0.1)),
      row("landing cvr current %", cvr(current).toFixed(2), within(cvr(current), 3.5, 0.12)),
      row("landing share of D2C orders", landingShare.toFixed(2), within(landingShare, 0.3, 0.25)),
    ];
  },
};

export const S4: Story = {
  id: "S4",
  title: "3 wholesale invoices overdue, ₹82,400",
  apply(world, rng) {
    void world;
    void rng; // written by the generator's invoice section (needs the wholesale orders)
  },
  expect: { detector: "overdueInvoices", minImpact: 74_000 },
  report(world) {
    const today = now(world);
    const overdue = world.invoices.filter((i) => i.status === "unpaid" && i.dueDate < today);
    const sum = overdue.reduce((s, i) => s + i.amount, 0);
    const oldest = Math.max(...overdue.map((i) => daysBetween(i.dueDate, today)));
    const saffron = overdue.find((i) => i.customerId === PLANT.s6.customerId);
    const reminders = world.messages.filter((m) => m.invoiceId && overdue.some((i) => i.id === m.invoiceId)).length;
    return [
      row("overdue invoices", overdue.length, overdue.length === 3),
      row("overdue total", sum, sum === 82_400),
      row("oldest days late", oldest, oldest === 41),
      row("Saffron Stories overdue", String(Boolean(saffron)), Boolean(saffron)),
      row("reminder emails sent", reminders, reminders >= 2),
    ];
  },
};

export const S5: Story = {
  id: "S5",
  title: "Delhi-NCR deliveries late since the courier change",
  apply(world) {
    evt(world, {
      id: "ev-courier-changed",
      source: "shiprocket",
      kind: "courier_changed",
      at: dayOf(world, PLANT.s5.day),
      label: "Delhi-NCR moved to a new courier",
      anchors: { metric: "deliveryDelayAvg" },
      detail: `Shiprocket courier priority for Delhi-NCR pincodes changed from ${PLANT.s5.courierBefore} to ${PLANT.s5.courierAfter}.`,
    });
    // Make the complaint step a fact of the records: the current window holds at least
    // max(2.2 × previous, previous + 6) delivery tickets, raised on late NCR deliveries.
    const { current, previous } = defaultWindows(world);
    const count = (w: typeof current) => world.tickets.filter((t) => t.category === "delivery" && inWindow(t.createdAt, w)).length;
    const target = Math.max(Math.ceil(count(previous) * 2.2), count(previous) + 6);
    const ticketed = new Set(world.tickets.map((t) => t.orderId));
    const late = world.shipments
      .filter((s) => s.region === PLANT.s5.region && s.courier === PLANT.s5.courierAfter && s.deliveredAt && inWindow(s.deliveredAt, current) && !ticketed.has(s.orderId))
      .sort((a, b) => a.deliveredAt!.localeCompare(b.deliveredAt!));
    let i = 0;
    while (count(current) < target && i < late.length) {
      const s = late[i++];
      const order = world.orders.find((o) => o.id === s.orderId)!;
      const deliveredDay = daysBetween(world.meta.day0, s.deliveredAt!);
      const ticketDay = Math.min(89, deliveredDay + (i % 2));
      world.tickets.push({
        id: `tk-${world.tickets.length + 1}`,
        source: "freshdesk",
        createdAt: dayOf(world, ticketDay),
        customerId: order.customerId,
        orderId: order.id,
        category: "delivery",
        sentiment: "negative",
        subject: `Order ${order.id} delivered ${Math.max(2, daysBetween(s.promisedAt, s.deliveredAt!))} days late`,
        status: ticketDay >= 86 ? "open" : "resolved",
        region: s.region,
      });
    }
    world.tickets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    world.tickets.forEach((t, k) => (t.id = `tk-${k + 1}`));
  },
  expect: { detector: "complaintSpike", minImpact: 13_000 },
  report(world) {
    const { current, previous } = defaultWindows(world);
    const delay = (s: World["shipments"][number]) => (s.deliveredAt ? hoursBetween(s.promisedAt, s.deliveredAt) / 24 : null);
    const ncr = (from: number, to: number) =>
      world.shipments.filter((s) => {
        const d = daysBetween(world.meta.day0, s.dispatchedAt);
        return s.region === "NCR" && d >= from && d <= to && s.deliveredAt;
      });
    const mean = (xs: (number | null)[]) => {
      const v = xs.filter((x): x is number => x !== null);
      return v.reduce((s, x) => s + x, 0) / v.length;
    };
    const before = mean(ncr(50, 73).map(delay));
    const after = mean(ncr(74, 85).map(delay));
    const complaints = (w: typeof current) => world.tickets.filter((t) => t.category === "delivery" && inWindow(t.createdAt, w)).length;
    // affected customers: every NCR shipment the new courier has carried since the change
    const affected = world.shipments.filter((s) => s.region === "NCR" && s.courier === PLANT.s5.courierAfter).length;
    const ev = world.events.find((e) => e.kind === "courier_changed");
    return [
      row("event day", ev ? daysBetween(world.meta.day0, ev.at) : -1, ev?.at === dayOf(world, 74)),
      row("NCR delay before (days)", before.toFixed(2), within(before, 1.2, 0.2)),
      row("NCR delay after (days)", after.toFixed(2), within(after, 3.4, 0.15)),
      row("delivery complaints previous", complaints(previous), true),
      row("delivery complaints current", complaints(current), complaints(current) >= 5 && complaints(current) / Math.max(1, complaints(previous)) >= 1.25),
      row("NCR shipments on the new courier since day 74", affected, within(affected, 55, 0.15)),
    ];
  },
};

export const S6: Story = {
  id: "S6",
  title: "Saffron Stories is 31% of revenue",
  apply(world, rng) {
    void world;
    void rng; // the wholesale generator skews orders to w01 and calibrates the share
  },
  expect: { detector: "customerConcentration", minImpact: 0 },
  report(world) {
    const total = world.orders.reduce((s, o) => s + o.total, 0);
    const saffron = world.orders.filter((o) => o.customerId === PLANT.s6.customerId);
    const sum = saffron.reduce((s, o) => s + o.total, 0);
    return [
      row("90-day revenue", total, within(total, 54_00_000, 0.06)),
      row("Saffron orders", saffron.length, within(saffron.length, 30, 0.1)),
      row("Saffron share %", ((sum / total) * 100).toFixed(1), within(sum / total, 0.31, 0.03)),
      row("Saffron revenue (exposure)", sum, within(sum, 16_74_000, 0.08)),
    ];
  },
};

export const S7: Story = {
  id: "S7",
  title: "Airtel plan auto-upgraded, internet bill up ₹400 a month",
  apply(world) {
    const p = PLANT.s7;
    p.days.forEach((d, i) => {
      const date = dayOf(world, d);
      world.bills.push({
        id: `bill-airtel-${i + 1}`,
        source: "gmail",
        createdAt: date,
        vendor: p.vendor,
        category: "internet",
        amount: p.amounts[i],
        billDate: date,
        dueDate: dayOf(world, d + 15),
        paidAt: dayOf(world, d + 10),
        recurring: true,
      });
    });
    evt(world, {
      id: "ev-plan-upgraded",
      source: "gmail",
      kind: "plan_upgraded",
      at: dayOf(world, 60),
      label: "Airtel plan auto-upgraded",
      anchors: { vendor: p.vendor },
      detail: "Airtel Business: \"Your plan has been upgraded to Fibre 300 Mbps as per the renewal terms.\"",
    });
  },
  expect: { detector: "costCreep", minImpact: 4_300 },
  report(world) {
    const bills = world.bills.filter((b) => b.vendor === "Airtel").sort((a, b) => a.billDate.localeCompare(b.billDate));
    const amounts = bills.map((b) => b.amount).join(", ");
    const ev = world.events.find((e) => e.kind === "plan_upgraded");
    return [
      row("Airtel bills", amounts, amounts === "1499, 1499, 1899"),
      row("bill days", bills.map((b) => daysBetween(world.meta.day0, b.billDate)).join(", "), true),
      row("event day", ev ? daysBetween(world.meta.day0, ev.at) : -1, ev?.at === dayOf(world, 60)),
      row("yearly creep", 400 * 12, true),
    ];
  },
};

export const S8: Story = {
  id: "S8",
  title: "Two subscriptions nobody has used in months",
  apply(world) {
    const add = (id: string, vendor: string, plan: string, monthlyINR: number, lastUsedDay: number, renewsDay: number, seats: number) =>
      world.subscriptions.push({
        id,
        source: "zoho-books",
        createdAt: dayOf(world, 0),
        vendor,
        plan,
        monthlyINR,
        status: "active",
        lastUsedAt: dayOf(world, lastUsedDay),
        renewsOn: dayOf(world, renewsDay),
        seats,
      });
    add("sub-figma", "Figma", "Professional, 2 editors", 2100, 5, 95, 2);
    add("sub-zapier", "Zapier", "Starter", 1650, 18, 93, 1);
  },
  expect: { detector: "zombieSubscription", minImpact: 40_000 },
  report(world) {
    const today = now(world);
    const zombies = world.subscriptions.filter((s) => s.status === "active" && daysBetween(s.lastUsedAt, today) >= 60);
    const yearly = zombies.reduce((s, z) => s + z.monthlyINR * 12, 0);
    const unused = zombies.map((z) => `${z.vendor} ${daysBetween(z.lastUsedAt, today)}d`).join(", ");
    return [
      row("zombie subscriptions", zombies.length, zombies.length === 2),
      row("unused for", unused, unused === "Figma 84d, Zapier 71d"),
      row("yearly cost", yearly, yearly === 45_000),
    ];
  },
};

export const S9: Story = {
  id: "S9",
  title: "Indigo Stoneware Mug will run out before the next batch lands",
  apply(world) {
    const p = world.products.find((x) => x.sku === PLANT.s9.sku);
    if (!p) throw new Error("S9: mug SKU missing");
    p.onHand = PLANT.s9.onHand;
    p.leadTimeDays = PLANT.s9.leadTimeDays;
  },
  expect: { detector: "stockoutRisk", minImpact: 27_000 },
  report(world) {
    const p = world.products.find((x) => x.sku === PLANT.s9.sku)!;
    const today = now(world);
    const units = world.orders
      .filter((o) => daysBetween(o.createdAt, today) < 30)
      .flatMap((o) => o.lines)
      .filter((l) => l.sku === p.sku)
      .reduce((s, l) => s + l.qty, 0);
    const perDay = units / 30;
    const cover = p.onHand / perDay;
    const others = world.products
      .filter((x) => x.sku !== p.sku)
      .map((x) => {
        const u = world.orders
          .filter((o) => daysBetween(o.createdAt, today) < 30)
          .flatMap((o) => o.lines)
          .filter((l) => l.sku === x.sku)
          .reduce((s, l) => s + l.qty, 0);
        return x.onHand / (u / 30) - x.leadTimeDays;
      });
    return [
      row("mug sets a day (30d)", perDay.toFixed(2), within(perDay, 3, 0.15)),
      row("days of cover", cover.toFixed(1), within(cover, 11, 0.15)),
      row("lead time", p.leadTimeDays, p.leadTimeDays === 18),
      row("stockout value (7 x 3 x 1450)", 7 * 3 * p.price, p.price === 1450),
      row("other SKUs cover minus lead time, min days", Math.min(...others).toFixed(1), Math.min(...others) > 5),
    ];
  },
};

export const S10: Story = {
  id: "S10",
  title: "Cash dips under the buffer in three weeks",
  apply(world) {
    const add = (id: string, kind: World["obligations"][number]["kind"], label: string, amountINR: number, day: number, penaltyINR: number) =>
      world.obligations.push({
        id,
        source: "calendar",
        createdAt: dayOf(world, 0),
        kind,
        label,
        amountINR,
        dueDate: dayOf(world, 89 + day),
        penaltyINR,
        handledAt: null,
      });
    add("ob-domain", "domain", "kaverihome.in domain renewal", 1_200, 9, 1_200);
    add("ob-gst", "gst", "GSTR-3B payment for September", 1_90_000, 12, 10_000);
    add("ob-insurance", "insurance", "Shop insurance renewal, New India Assurance", 24_000, 18, 4_000);
    add("ob-payroll", "payroll", "October payroll", 4_10_000, 22, 0);
    add("ob-loan", "loan", "HDFC business loan EMI", 31_000, 28, 0);
    add("ob-lease", "lease", "Studio lease renewal, MI Road", 0, 43, 0);
  },
  expect: { detector: "cashCrunch", minImpact: 50_000 },
  report(world) {
    const today = now(world);
    const balance = world.bankTxns.reduce((s, t) => s + t.amount, 0);
    const due = world.obligations
      .filter((o) => daysBetween(today, o.dueDate) <= 21 && o.kind !== "payroll" && o.kind !== "loan")
      .map((o) => `${o.kind} +${daysBetween(today, o.dueDate)}d`)
      .join(", ");
    const penalties = world.obligations
      .filter((o) => daysBetween(today, o.dueDate) <= 21 && ["gst", "insurance", "domain", "lease"].includes(o.kind))
      .reduce((s, o) => s + o.penaltyINR, 0);
    return [
      row("cash today", Math.round(balance), Math.round(balance) === 6_40_000),
      row("obligations within 21 days", due, due === "domain +9d, gst +12d, insurance +18d"),
      row("penalties within 21 days", penalties, penalties === 15_200),
      row("payroll due", `+${daysBetween(today, world.obligations.find((o) => o.kind === "payroll")!.dueDate)}d`, true),
    ];
  },
};

export const S11: Story = {
  id: "S11",
  title: "Packing runs at 96% of capacity, 102% next month",
  apply(world) {
    world.meta.business.staffOps = PLANT.s11.staffOps;
    world.meta.business.ordersPerPersonPerMonth = PLANT.s11.ordersPerPersonPerMonth;
    world.meta.business.festiveLift = PLANT.s11.festiveLift;
  },
  expect: { simulator: { hires: 1 } },
  report(world) {
    const today = now(world);
    const orders30 = world.orders.filter((o) => daysBetween(o.createdAt, today) < 30).length;
    const util = orders30 / (world.meta.business.staffOps * world.meta.business.ordersPerPersonPerMonth);
    return [
      row("orders last 30 days", orders30, within(orders30, 680, 0.06)),
      row("utilisation %", (util * 100).toFixed(1), within(util, 0.96, 0.06)),
      row("next month with festive lift %", (util * world.meta.business.festiveLift * 100).toFixed(1), true),
    ];
  },
};

export const S12: Story = {
  id: "S12",
  title: "Marketing works, with diminishing returns",
  apply(world, rng) {
    void world;
    void rng; // the ad-day generator ramps spend; see PLANT.s2 and the generator's spend schedule
  },
  expect: { detector: "adEfficiency", minImpact: 13_000 },
  report(world) {
    const today = now(world);
    const block = (from: number, to: number) => {
      const spend = world.adDays.filter((a) => daysBetween(a.date, today) >= from && daysBetween(a.date, today) <= to).reduce((s, a) => s + a.spend, 0);
      const orders = world.orders.filter((o) => o.channel === "d2c" && daysBetween(o.createdAt, today) >= from && daysBetween(o.createdAt, today) <= to).length;
      return { spend, orders, cac: spend / orders };
    };
    const last = block(0, 29);
    const prev = block(30, 59);
    const d = (last.cac / prev.cac - 1) * 100;
    return [
      row("spend last 30 days", Math.round(last.spend), within(last.spend, 90_000, 0.04)),
      row("D2C orders last 30 days", last.orders, within(last.orders, 633, 0.05)),
      row("CAC delta % (30d vs prior 30d)", d.toFixed(1), d >= 20),
    ];
  },
};

export const STORIES: Story[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12];

function hoursBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 3_600_000;
}
