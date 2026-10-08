import type { Chain, ChainEdge, ChainNode, MetricId, RecordRef, Window, World } from "@/types";
import { compareWindows, stripSeries } from "../metrics";
import { dayIndex, defaultWindows, inWindow } from "../windows";
import { ancestorsOf, parentsOf, type Edge } from "./dag";
import { metricOnset } from "./onset";

// The causal walk (docs/ENGINE.md, section 3.2): co-movement along the hand-authored graph,
// temporal precedence, one branch at most. Evidence for a likely cause, never proof.

type NodeInfo = { metric: MetricId; delta: number; onset: string | null; onsetEvidence: RecordRef[]; series: number[] };

export function walkCausalGraph(world: World, target: MetricId, window?: Window): Chain {
  const windows = window ? { current: window, previous: previousOf(world, window) } : defaultWindows(world);
  const current = windows.current;
  const metrics: MetricId[] = [target, ...ancestorsOf(target)];
  const info = new Map<MetricId, NodeInfo>();
  for (const m of metrics) {
    const cmp = compareWindows(world, m, windows);
    const { onset, onsetEvidence } = metricOnset(world, m, current);
    info.set(m, { metric: m, delta: cmp.deltaPct, onset, onsetEvidence, series: stripSeries(world, m, current) });
  }
  const day = (iso: string | null) => (iso ? dayIndex(world, iso) : null);

  const score = (e: Edge): number => {
    const from = info.get(e.from)!;
    const to = info.get(e.to)!;
    if (Math.sign(from.delta) * Math.sign(to.delta) !== e.sign) return 0;
    if (to.delta === 0) return 0;
    let s = (Math.min(Math.abs(from.delta), Math.abs(to.delta)) / Math.abs(to.delta)) * e.weight;
    if (from.onset === null) s *= 0.5;
    return s;
  };
  const precedes = (e: Edge): boolean => {
    const a = day(info.get(e.from)!.onset);
    const b = day(info.get(e.to)!.onset);
    if (a === null || b === null) return true; // nothing to check against
    return a <= b + 1;
  };

  // Greedy walk from the target to the strongest admissible ancestor.
  const primary: MetricId[] = [target];
  const edges: ChainEdge[] = [];
  let cursor = target;
  while (Math.abs(info.get(cursor)!.delta) >= 3) {
    const candidates = parentsOf(cursor)
      .map((e) => ({ e, s: score(e) }))
      .filter((c) => c.s > 0 && precedes(c.e) && !primary.includes(c.e.from))
      .sort((a, b) => b.s - a.s || (day(info.get(a.e.from)!.onset) ?? 999) - (day(info.get(b.e.from)!.onset) ?? 999));
    if (!candidates.length) break;
    const pick = candidates[0];
    edges.unshift({ from: pick.e.from, to: pick.e.to, sign: pick.e.sign, strength: round(pick.s) });
    primary.unshift(pick.e.from);
    cursor = pick.e.from;
  }

  // Branch: a direct parent of a primary node, sign satisfied, |Δ| ≥ 10%, onset inside the strip.
  let branch: { edge: Edge; s: number } | null = null;
  for (const node of primary) {
    for (const e of parentsOf(node)) {
      if (primary.includes(e.from)) continue;
      const from = info.get(e.from)!;
      const s = score(e);
      if (s <= 0 || Math.abs(from.delta) < 10 || !from.onset || !inWindow(from.onset, { from: stripStart(world, current), to: current.to })) continue;
      if (!branch || s > branch.s) branch = { edge: e, s };
    }
  }

  const toNode = (m: MetricId): ChainNode => {
    const i = info.get(m)!;
    return { metric: m, delta: round(i.delta), series: i.series, onset: i.onset, onsetEvidence: i.onsetEvidence, evidence: evidenceFor(world, m, current) };
  };
  const byOnset = (a: MetricId, b: MetricId) => {
    const da = day(info.get(a)!.onset);
    const db = day(info.get(b)!.onset);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  };
  const ordered = [...primary.filter((m) => m !== target)].sort(byOnset);
  ordered.push(target);

  const branches: Chain[] = branch
    ? [
        {
          id: `${branch.edge.from}:${current.to}`,
          target: branch.edge.to,
          window: current,
          nodes: [toNode(branch.edge.from)],
          edges: [{ from: branch.edge.from, to: branch.edge.to, sign: branch.edge.sign, strength: round(branch.s) }],
          branches: [],
        },
      ]
    : [];

  return { id: `${target}:${current.to}`, target, window: current, nodes: ordered.map(toNode), edges, branches };
}

/** The top records behind a node's move in the window. */
export function evidenceFor(world: World, metric: MetricId, w: Window): RecordRef[] {
  const refs: RecordRef[] = [];
  const push = (source: RecordRef["source"], kind: RecordRef["kind"], id: string) => refs.push({ source, kind, id });
  switch (metric) {
    case "adSpend": {
      const paused = world.adDays.filter((a) => a.status === "paused" && inWindow(a.date, w));
      for (const a of paused.slice(0, 2)) push(a.source, "adDay", a.id);
      for (const e of world.events.filter((x) => x.kind === "campaign_paused")) push(e.source, "event", e.id);
      break;
    }
    case "sessions":
      for (const t of world.trafficDays.filter((x) => inWindow(x.date, w)).slice(-3)) push(t.source, "trafficDay", t.id);
      for (const a of world.adDays.filter((x) => inWindow(x.date, w) && x.status === "paused").slice(0, 1)) push(a.source, "adDay", a.id);
      break;
    case "landingCvr":
      for (const e of world.events.filter((x) => x.kind === "theme_updated")) push(e.source, "event", e.id);
      for (const t of world.trafficDays.filter((x) => inWindow(x.date, w)).slice(-2)) push(t.source, "trafficDay", t.id);
      break;
    case "ordersD2C":
    case "revenueD2C":
      for (const o of world.orders.filter((x) => x.channel === "d2c" && inWindow(x.createdAt, w)).slice(-3)) push(o.source, "order", o.id);
      break;
    case "revenue":
      for (const o of world.orders.filter((x) => inWindow(x.createdAt, w)).slice(-3)) push(o.source, "order", o.id);
      break;
    case "deliveryDelayAvg": {
      for (const e of world.events.filter((x) => x.kind === "courier_changed")) push(e.source, "event", e.id);
      const late = world.shipments.filter((s) => inWindow(s.dispatchedAt, w) && s.deliveredAt && s.deliveredAt > s.promisedAt).slice(0, 3);
      for (const s of late) push(s.source, "shipment", s.id);
      break;
    }
    case "complaints":
      for (const t of world.tickets.filter((x) => x.category === "delivery" && inWindow(x.createdAt, w)).slice(0, 4)) push(t.source, "ticket", t.id);
      break;
    case "repeatRate":
      for (const o of world.orders.filter((x) => x.channel === "d2c" && inWindow(x.createdAt, w)).slice(-2)) push(o.source, "order", o.id);
      break;
    case "leadsNew":
    case "leadsContacted":
    case "leadCvr":
      for (const l of world.leads.filter((x) => inWindow(x.createdAt, w)).slice(-3)) push(l.source, "lead", l.id);
      break;
    case "ordersWholesale":
    case "revenueWholesale":
      for (const o of world.orders.filter((x) => x.channel === "wholesale" && inWindow(x.createdAt, w)).slice(-3)) push(o.source, "order", o.id);
      break;
    case "receivablesOverdue":
      for (const i of world.invoices.filter((x) => x.status === "unpaid" && x.dueDate < w.to).slice(0, 3)) push(i.source, "invoice", i.id);
      break;
    case "subscriptionSpend":
      for (const s of world.subscriptions.filter((x) => x.status === "active").slice(0, 3)) push(s.source, "subscription", s.id);
      break;
    case "cashBalance":
      for (const t of world.bankTxns.filter((x) => inWindow(x.date, w)).slice(-3)) push(t.source, "bankTxn", t.id);
      break;
    default:
      break;
  }
  return refs;
}

function previousOf(world: World, w: Window): Window {
  const len = dayIndex(world, w.to) - dayIndex(world, w.from) + 1;
  const from = dayIndex(world, w.from) - len;
  return { from: dayISO(world, from), to: dayISO(world, from + len - 1) };
}
function dayISO(world: World, d: number): string {
  const [y, m, dd] = world.meta.day0.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + d)).toISOString().slice(0, 10);
}
function stripStart(world: World, w: Window): string {
  return dayISO(world, dayIndex(world, w.to) - 27);
}
function round(x: number): number {
  return Math.round(x * 100) / 100;
}
