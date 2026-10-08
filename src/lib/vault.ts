import type { RecordKind, RecordRef, SourceId, World } from "@/types";
import { rowOf } from "@/components/finding/RecordView";
import { COLLECTION_OF, refKey } from "@/lib/records";
import { dateTime, inr, shortDate } from "@/lib/format";

// The Vault's record index: every record in the World as one searchable line, memoised per World.
// Titles and details come from the same `rowOf` the evidence views use, so a record reads the
// same wherever it appears.

export type IndexedRecord = {
  key: string;
  ref: RecordRef;
  kind: RecordKind;
  source: SourceId;
  title: string;
  detail: string;
  date: string;
  /** The ISO instant the row sorts by. */
  at: string;
  amount: number | null;
  status?: { label: string; variant?: "default" | "critical" | "warn" | "good" };
};

export const KIND_LABEL: Record<RecordKind, string> = {
  customer: "Customer",
  product: "Product",
  order: "Order",
  shipment: "Shipment",
  lead: "Lead",
  message: "Message",
  invoice: "Invoice",
  bill: "Bill",
  subscription: "Subscription",
  adDay: "Ad day",
  trafficDay: "Traffic day",
  ticket: "Ticket",
  bankTxn: "Bank transaction",
  obligation: "Obligation",
  event: "Event",
  task: "Task",
  purchaseOrder: "Purchase order",
};

const cache = new WeakMap<World, IndexedRecord[]>();

/** Every record, newest first. */
export function indexRecords(world: World): IndexedRecord[] {
  const hit = cache.get(world);
  if (hit) return hit;
  const out: IndexedRecord[] = [];
  for (const kind of Object.keys(COLLECTION_OF) as RecordKind[]) {
    const records = world[COLLECTION_OF[kind]] as ({ id: string; source: SourceId; createdAt: string } & Record<string, unknown>)[];
    for (const rec of records) {
      const ref: RecordRef = { source: rec.source, kind, id: rec.id };
      const at = instantOf(kind, rec);
      if (kind === "message") {
        const m = rec as unknown as World["messages"][number];
        out.push({ key: refKey(ref), ref, kind, source: rec.source, title: m.subject ?? m.body.slice(0, 60), detail: `${m.direction === "in" ? "From" : "To"} ${m.direction === "in" ? m.from : m.to}, ${m.channel === "whatsapp" ? "WhatsApp" : "email"}`, date: dateTime(m.at), at, amount: null });
        continue;
      }
      if (kind === "event") {
        const e = rec as unknown as World["events"][number];
        out.push({ key: refKey(ref), ref, kind, source: rec.source, title: e.label, detail: e.detail ?? "", date: dateTime(e.at), at, amount: null });
        continue;
      }
      const row = rowOf(world, ref);
      out.push({ key: refKey(ref), ref, kind, source: rec.source, title: row?.number ?? rec.id, detail: row?.party ?? "", date: row?.date ?? shortDate(at), at, amount: row?.amount ?? null, status: row?.status });
    }
  }
  out.sort((a, b) => b.at.localeCompare(a.at));
  cache.set(world, out);
  return out;
}

function instantOf(kind: RecordKind, rec: { createdAt: string } & Record<string, unknown>): string {
  const pick = (k: string) => (typeof rec[k] === "string" ? (rec[k] as string) : null);
  switch (kind) {
    case "message":
    case "event":
      return pick("at") ?? rec.createdAt;
    case "adDay":
    case "trafficDay":
    case "bankTxn":
      return pick("date") ?? rec.createdAt;
    case "invoice":
      return pick("issuedAt") ?? rec.createdAt;
    case "bill":
      return pick("billDate") ?? rec.createdAt;
    default:
      return rec.createdAt;
  }
}

/** Case-insensitive match on the title, detail, id and kind. */
export function matches(r: IndexedRecord, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return r.title.toLowerCase().includes(needle) || r.detail.toLowerCase().includes(needle) || r.ref.id.toLowerCase().includes(needle) || KIND_LABEL[r.kind].toLowerCase().includes(needle);
}

/** The raw record behind an index line, as label and value pairs for the expanded row. */
export function fieldsOf(world: World, ref: RecordRef): { label: string; value: string }[] {
  const rec = (world[COLLECTION_OF[ref.kind]] as { id: string }[]).find((r) => r.id === ref.id) as Record<string, unknown> | undefined;
  if (!rec) return [];
  return Object.entries(rec)
    .filter(([k]) => k !== "source")
    .map(([k, v]) => ({ label: humanKey(k), value: formatValue(v, k) }));
}

function humanKey(k: string): string {
  const spaced = k.replace(/INR$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(v: unknown, key = ""): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && /INR$/.test(key)) return inr(Math.round(v));
  if (typeof v === "string" && key === "status") return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}T/.test(v) ? dateTime(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) ? shortDate(v, true) : v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" && x ? Object.values(x as Record<string, unknown>).join(" × ") : String(x))).join("; ");
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k} ${String(x)}`).join(", ");
  return String(v);
}
