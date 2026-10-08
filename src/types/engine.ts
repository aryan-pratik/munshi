import { z } from "zod";
import { DetectorId, MetricId, PlaybookId } from "./ids";
import { RecordRef, type CollectionKey } from "./records";

// Engine types (docs/ARCHITECTURE.md, Key types). The zod schemas exist for the boundaries that
// cross the network: tool outputs, the actions log in API bodies, structured model output.

export const Window = z.object({ from: z.string(), to: z.string() }); // ISO dates, inclusive
export type Window = z.infer<typeof Window>;

export type MetricMeta = { id: MetricId; label: string; unit: "inr" | "count" | "pct" | "days"; goodWhen: "up" | "down" };

export const Severity = z.enum(["critical", "high", "medium", "info"]);
export type Severity = z.infer<typeof Severity>;

export const Finding = z.object({
  id: z.string(),
  detector: DetectorId,
  severity: Severity,
  group: z.enum(["needs-you", "worth-knowing"]),
  title: z.string(),
  impactINR: z.number(),
  exposureINR: z.number().optional(),
  confidence: z.number(),
  window: Window,
  onset: z.string().nullable(),
  series: z.array(z.number()),
  evidence: z.array(RecordRef),
  explain: z.string(),
  playbooks: z.array(PlaybookId),
});
export type Finding = z.infer<typeof Finding>;

export const ChainNode = z.object({
  metric: MetricId,
  delta: z.number(),
  series: z.array(z.number()),
  onset: z.string().nullable(),
  onsetEvidence: z.array(RecordRef),
  evidence: z.array(RecordRef),
});
export type ChainNode = z.infer<typeof ChainNode>;

export const ChainEdge = z.object({ from: MetricId, to: MetricId, sign: z.union([z.literal(1), z.literal(-1)]), strength: z.number() });
export type ChainEdge = z.infer<typeof ChainEdge>;

export type Chain = {
  id: string;
  target: MetricId;
  window: Window;
  nodes: ChainNode[];
  edges: ChainEdge[];
  branches: Chain[];
  narrative?: string;
};
export const Chain: z.ZodType<Chain> = z.lazy(() =>
  z.object({
    id: z.string(),
    target: MetricId,
    window: Window,
    nodes: z.array(ChainNode),
    edges: z.array(ChainEdge),
    branches: z.array(Chain),
    narrative: z.string().optional(),
  }),
);

// Levers are percent points: pricePct 5 = +5%. simulator/model.ts converts once.
export const Levers = z.object({
  pricePct: z.number(),
  marketingPct: z.number(),
  hires: z.number().int(),
  inventoryPct: z.number(),
  followUpHours: z.union([z.literal(4), z.literal(12), z.literal(24), z.literal(48)]),
});
export type Levers = z.infer<typeof Levers>;

export const Outcome = z.object({
  revenue: z.number(),
  customers: z.number(),
  churnPct: z.number(),
  profit: z.number(),
  cashRunwayDays: z.number(),
});
export type Outcome = z.infer<typeof Outcome>;

export const Scenario = z.object({
  levers: Levers,
  outcome: Outcome,
  risk: z.enum(["low", "medium", "high"]),
  riskScore: z.number(),
  notes: z.array(z.string()),
});
export type Scenario = z.infer<typeof Scenario>;

export const Step = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["read", "draft", "approve", "send", "update", "remind"]),
});
export type Step = z.infer<typeof Step>;

export const Draft = z.object({
  id: z.string(),
  to: RecordRef,
  channel: z.enum(["whatsapp", "email", "task"]),
  subject: z.string().optional(),
  body: z.string(),
  refs: z.array(RecordRef),
});
export type Draft = z.infer<typeof Draft>;

const collectionKeys = [
  "sources", "customers", "products", "orders", "shipments", "leads", "messages", "invoices", "bills",
  "subscriptions", "adDays", "trafficDays", "tickets", "bankTxns", "obligations", "events", "tasks", "purchaseOrders",
] as const satisfies readonly CollectionKey[];
export const CollectionKeySchema = z.enum(collectionKeys);

export const Effect = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set"),
    collection: CollectionKeySchema,
    id: z.string(),
    patch: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  }),
  z.object({
    op: z.literal("create"),
    collection: CollectionKeySchema,
    record: z.looseObject({ id: z.string() }),
  }),
]);
export type Effect = z.infer<typeof Effect>;

export const Action = z.object({
  id: z.string(),
  playbook: PlaybookId,
  findingId: z.string(),
  approvedAt: z.string(),
  effects: z.array(Effect),
});
export type Action = z.infer<typeof Action>;
