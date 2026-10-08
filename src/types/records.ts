import { z } from "zod";
import { EventKind, MetricId, RecordKind, SourceId } from "./ids";

// Record types of the World (docs/DATA-MODEL.md, section 1). Dates are ISO strings: `YYYY-MM-DD`
// for day-granular records and `YYYY-MM-DDTHH:mm:ss+05:30` where the hour matters. The engine
// buckets by the first ten characters, so no timezone maths is ever needed.

export const RecordRef = z.object({ source: SourceId, kind: RecordKind, id: z.string() });
export type RecordRef = z.infer<typeof RecordRef>;

const base = { id: z.string(), source: SourceId, createdAt: z.string() };

export const Business = z.object({
  name: z.string(),
  owner: z.string(),
  city: z.string(),
  gstin: z.string(),
  staffTotal: z.number().int(),
  staffOps: z.number().int(), // packers; the simulator's staff0
  ordersPerPersonPerMonth: z.number(),
  festiveLift: z.number(),
  salaryPerHireINR: z.number(),
  cashBufferINR: z.number(),
});
export type Business = z.infer<typeof Business>;

export const Source = z.object({
  id: SourceId,
  name: z.string(),
  type: z.enum(["commerce", "payments", "marketing", "logistics", "messaging", "finance", "bank", "support", "personal"]),
  provides: z.array(z.string()),
  status: z.enum(["connected", "syncing", "error"]),
  lastSyncAt: z.string(),
  recordCount: z.number().int(),
});
export type Source = z.infer<typeof Source>;

export const Customer = z.object({
  ...base,
  name: z.string(),
  type: z.enum(["d2c", "wholesale"]),
  city: z.string(),
  region: z.string(), // courier zone, e.g. "NCR", "West", "South"
  phone: z.string().optional(),
  email: z.string().optional(),
  shop: z.string().optional(), // wholesale: the store name
  contact: z.string().optional(), // wholesale: person
});
export type Customer = z.infer<typeof Customer>;

export const Product = z.object({
  ...base,
  sku: z.string(),
  name: z.string(),
  category: z.enum(["ceramics", "linen", "lighting"]),
  unitCost: z.number(),
  price: z.number(), // D2C price
  wholesalePrice: z.number(),
  onHand: z.number().int(),
  leadTimeDays: z.number().int(),
  supplier: z.string(),
});
export type Product = z.infer<typeof Product>;

export const OrderLine = z.object({ sku: z.string(), qty: z.number().int(), price: z.number() });
export type OrderLine = z.infer<typeof OrderLine>;

export const Order = z.object({
  ...base,
  customerId: z.string(),
  channel: z.enum(["d2c", "wholesale"]),
  lines: z.array(OrderLine),
  total: z.number(),
  viaLanding: z.boolean().optional(), // D2C: entered on a campaign or collection landing page
  region: z.string(),
  status: z.enum(["paid", "fulfilled", "invoiced"]),
});
export type Order = z.infer<typeof Order>;

export const Shipment = z.object({
  ...base,
  orderId: z.string(),
  courier: z.string(), // the id is the AWB

  region: z.string(),
  dispatchedAt: z.string(),
  promisedAt: z.string(),
  deliveredAt: z.string().nullable(),
  status: z.enum(["in_transit", "delivered"]),
});
export type Shipment = z.infer<typeof Shipment>;

export const Lead = z.object({
  ...base,
  customerId: z.string().optional(), // set once won
  shop: z.string(),
  contact: z.string(),
  city: z.string(),
  channel: z.enum(["whatsapp", "email"]),
  stage: z.enum(["new", "contacted", "quoted", "won", "lost"]),
  estValueINR: z.number(),
  lastContactedAt: z.string(),
  lastInboundAt: z.string().nullable(),
  quotedAt: z.string().nullable(),
  wonAt: z.string().nullable(),
  thread: z.array(RecordRef),
  summary: z.string(), // what they asked for, the quantity, the open question
});
export type Lead = z.infer<typeof Lead>;

export const Message = z.object({
  ...base,
  threadId: z.string(),
  channel: z.enum(["whatsapp", "email"]),
  direction: z.enum(["in", "out"]),
  from: z.string(),
  to: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  at: z.string(),
  leadId: z.string().optional(),
  invoiceId: z.string().optional(),
});
export type Message = z.infer<typeof Message>;

export const Invoice = z.object({
  ...base,
  number: z.string(),
  customerId: z.string(),
  orderId: z.string(),
  amount: z.number(),
  issuedAt: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  status: z.enum(["paid", "unpaid"]),
  remindersSent: z.number().int(),
  reminderSentAt: z.string().nullable(),
});
export type Invoice = z.infer<typeof Invoice>;

export const Bill = z.object({
  ...base,
  vendor: z.string(),
  category: z.enum(["internet", "electricity", "packaging", "rent", "courier", "supplier", "services", "other"]),
  amount: z.number(),
  billDate: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  recurring: z.boolean(),
});
export type Bill = z.infer<typeof Bill>;

export const Subscription = z.object({
  ...base,
  vendor: z.string(),
  plan: z.string(),
  monthlyINR: z.number(),
  status: z.enum(["active", "cancelled"]),
  lastUsedAt: z.string(),
  renewsOn: z.string(),
  seats: z.number().int(),
});
export type Subscription = z.infer<typeof Subscription>;

export const AdDay = z.object({
  ...base,
  date: z.string(),
  campaign: z.string(),
  status: z.enum(["active", "paused"]),
  spend: z.number(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  sessions: z.number().int(),
});
export type AdDay = z.infer<typeof AdDay>;

export const TrafficDay = z.object({
  ...base,
  date: z.string(),
  organic: z.number().int(),
  landingSessions: z.number().int(), // entered on a campaign or collection landing page (paid or organic)
});
export type TrafficDay = z.infer<typeof TrafficDay>;

export const Ticket = z.object({
  ...base,
  customerId: z.string(),
  orderId: z.string(),
  category: z.enum(["delivery", "quality", "other"]),
  sentiment: z.enum(["negative", "neutral"]),
  subject: z.string(),
  status: z.enum(["open", "resolved", "escalated"]),
  region: z.string(),
});
export type Ticket = z.infer<typeof Ticket>;

export const BankTxn = z.object({
  ...base,
  date: z.string(),
  amount: z.number(), // signed: credit positive, debit negative
  narration: z.string(),
  category: z.enum(["opening", "payout", "invoice", "payroll", "rent", "bill", "subscription", "ads", "supplier", "tax", "other"]),
  ref: RecordRef.optional(),
});
export type BankTxn = z.infer<typeof BankTxn>;

export const Obligation = z.object({
  ...base,
  kind: z.enum(["gst", "insurance", "domain", "lease", "payroll", "loan"]),
  label: z.string(),
  amountINR: z.number(),
  dueDate: z.string(),
  penaltyINR: z.number(),
  handledAt: z.string().nullable(),
});
export type Obligation = z.infer<typeof Obligation>;

export const Event = z.object({
  ...base,
  kind: EventKind,
  at: z.string(),
  label: z.string(),
  anchors: z.union([z.object({ metric: MetricId }), z.object({ vendor: z.string() })]),
  detail: z.string().optional(),
});
export type Event = z.infer<typeof Event>;

export const Task = z.object({
  ...base,
  title: z.string(),
  dueDate: z.string(),
  status: z.enum(["open", "done"]),
  refs: z.array(RecordRef),
});
export type Task = z.infer<typeof Task>;

export const PurchaseOrder = z.object({
  id: z.string(),
  supplier: z.string(),
  lines: z.array(z.object({ sku: z.string(), qty: z.number().int() })),
  createdAt: z.string(),
  status: z.enum(["draft", "sent"]),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrder>;

export const World = z.object({
  meta: z.object({
    business: Business,
    generatedAt: z.string(),
    day0: z.string(),
    days: z.number().int(),
    seed: z.number().int(),
  }),
  sources: z.array(Source),
  customers: z.array(Customer),
  products: z.array(Product),
  orders: z.array(Order),
  shipments: z.array(Shipment),
  leads: z.array(Lead),
  messages: z.array(Message),
  invoices: z.array(Invoice),
  bills: z.array(Bill),
  subscriptions: z.array(Subscription),
  adDays: z.array(AdDay),
  trafficDays: z.array(TrafficDay),
  tickets: z.array(Ticket),
  bankTxns: z.array(BankTxn),
  obligations: z.array(Obligation),
  events: z.array(Event),
  tasks: z.array(Task),
  purchaseOrders: z.array(PurchaseOrder),
});
export type World = z.infer<typeof World>;

/** The World array keys, the only collections an Effect may touch. */
export type CollectionKey = Exclude<keyof World, "meta">;
