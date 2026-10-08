import type { EventKind, MetricId } from "@/types";

// The hand-authored causal graph (docs/ENGINE.md, section 3). Edges carry a sign and a prior
// weight; unless noted, weight 1 and sign +1.

export type Edge = { from: MetricId; to: MetricId; sign: 1 | -1; weight: number };

export const EDGES: Edge[] = [
  { from: "adSpend", to: "sessions", sign: 1, weight: 1 },
  { from: "sessions", to: "ordersD2C", sign: 1, weight: 1 },
  { from: "landingCvr", to: "ordersD2C", sign: 1, weight: 0.3 },
  { from: "repeatRate", to: "ordersD2C", sign: 1, weight: 0.5 },
  { from: "ordersD2C", to: "revenueD2C", sign: 1, weight: 1 },
  { from: "revenueD2C", to: "revenue", sign: 1, weight: 1 },
  { from: "revenue", to: "cashBalance", sign: 1, weight: 1 },
  { from: "leadsNew", to: "leadsContacted", sign: 1, weight: 1 },
  { from: "leadsContacted", to: "leadCvr", sign: 1, weight: 1 },
  { from: "leadCvr", to: "ordersWholesale", sign: 1, weight: 1 },
  { from: "ordersWholesale", to: "revenueWholesale", sign: 1, weight: 1 },
  { from: "revenueWholesale", to: "revenue", sign: 1, weight: 1 },
  { from: "deliveryDelayAvg", to: "complaints", sign: 1, weight: 1 },
  { from: "complaints", to: "repeatRate", sign: -1, weight: 1 },
];

export function parentsOf(metric: MetricId): Edge[] {
  return EDGES.filter((e) => e.to === metric);
}

/** The one metric each event kind acts on directly. `plan_upgraded` anchors a vendor's bill series instead. */
export const EVENT_ANCHORS: Partial<Record<EventKind, MetricId>> = {
  campaign_paused: "adSpend",
  theme_updated: "landingCvr",
  courier_changed: "deliveryDelayAvg",
  price_changed: "aov",
};

/** Every ancestor of `metric`, nearest first, without duplicates. */
export function ancestorsOf(metric: MetricId): MetricId[] {
  const out: MetricId[] = [];
  const seen = new Set<MetricId>([metric]);
  const queue: MetricId[] = [metric];
  while (queue.length) {
    const m = queue.shift()!;
    for (const e of parentsOf(m)) {
      if (seen.has(e.from)) continue;
      seen.add(e.from);
      out.push(e.from);
      queue.push(e.from);
    }
  }
  return out;
}
