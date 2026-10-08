import Link from "next/link";
import { Flag } from "lucide-react";
import type { RecordRef, World } from "@/types";
import { Chip } from "@/components/primitives";
import { dateTime, inr, shortDate, timeOf } from "@/lib/format";
import { customerName, findRecord, productName, vaultHref } from "@/lib/records";
import { daysBetween, now } from "@/engine/windows";
import { cn } from "@/lib/utils";

// Evidence renders as the record itself (DESIGN.md, Evidence records): a message is a bubble, an
// invoice, order or bill is one row with a status chip, an event is a flag and a sentence. Every
// record ends with "Open in Vault".

export function VaultLink({ refx, className }: { refx: RecordRef; className?: string }) {
  return (
    <Link href={vaultHref(refx)} className={cn("t-caption text-neel whitespace-nowrap hover:underline", className)}>
      Open in Vault
    </Link>
  );
}

export function MessageBubble({ world, refx, bare }: { world: World; refx: RecordRef; bare?: boolean }) {
  const m = findRecord(world, { ...refx, kind: "message" });
  if (!m) return <Missing refx={refx} />;
  const inbound = m.direction === "in";
  return (
    <div className={cn("flex max-w-[34rem] flex-col gap-1", inbound ? "items-start" : "items-end self-end")}>
      <p className="t-caption text-ink-3">
        {m.from}, {dateTime(m.at)}
      </p>
      <div className={cn("rounded-[12px] px-3 py-2 t-ui whitespace-pre-line text-ink", inbound ? "bg-wash" : "bg-neel-soft")}>
        {m.subject ? <p className="mb-1 font-medium">{m.subject}</p> : null}
        {m.body}
      </div>
      {bare ? null : <VaultLink refx={refx} />}
    </div>
  );
}

export function EventLine({ world, refx }: { world: World; refx: RecordRef }) {
  const e = findRecord(world, { ...refx, kind: "event" });
  if (!e) return <Missing refx={refx} />;
  return (
    <div className="flex min-w-0 items-start gap-2 py-2">
      <Flag className="mt-0.5 size-4 shrink-0 text-haldi" aria-hidden strokeWidth={1.5} />
      <p className="min-w-0 flex-1 t-ui text-ink">
        {e.label}
        {e.detail ? <span className="text-ink-2">. {e.detail}</span> : null}
      </p>
      <span className="t-caption whitespace-nowrap text-ink-3 tabular-nums">{dateTime(e.at)}</span>
      <VaultLink refx={refx} />
    </div>
  );
}

type Row = { number: string; party: string; date: string; amount: number | null; status?: { label: string; variant?: "default" | "critical" | "warn" | "good" } };

/** One table-like row for an invoice, order, bill or any other record with a number and a party. */
export function RecordRow({ world, refx }: { world: World; refx: RecordRef }) {
  const row = rowOf(world, refx);
  if (!row) return <Missing refx={refx} />;
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2 phone:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto]">
      <span className="min-w-0 truncate t-ui font-medium text-ink">{row.number}</span>
      <span className="phone:hidden row-start-2 min-w-0 truncate t-caption text-ink-2">{row.party}</span>
      <span className="hidden phone:block min-w-0 line-clamp-2 t-ui text-ink-2">{row.party}</span>
      <span className="phone:hidden row-start-2 col-start-2 justify-self-end t-caption text-ink-3 tabular-nums">{row.date}</span>
      <span className="hidden phone:block t-ui text-ink-3 tabular-nums">{row.date}</span>
      <span className="justify-self-end t-ui text-ink tabular-nums">{row.amount !== null ? inr(row.amount) : ""}</span>
      <span className="phone:hidden row-start-3 col-span-2 flex items-center justify-between pt-1">
        {row.status ? <Chip variant={row.status.variant}>{row.status.label}</Chip> : <span />}
        <VaultLink refx={refx} />
      </span>
      <span className="hidden phone:flex items-center gap-3 justify-self-end">
        {row.status ? <Chip variant={row.status.variant}>{row.status.label}</Chip> : null}
        <VaultLink refx={refx} />
      </span>
    </div>
  );
}

function rowOf(world: World, refx: RecordRef): Row | null {
  const today = now(world);
  switch (refx.kind) {
    case "invoice": {
      const r = findRecord(world, { ...refx, kind: "invoice" });
      if (!r) return null;
      const late = daysBetween(r.dueDate, today);
      const status = r.status === "paid" ? { label: "Paid", variant: "good" as const } : late > 0 ? { label: `Overdue ${late} days`, variant: "critical" as const } : { label: `Due ${shortDate(r.dueDate)}` };
      return { number: r.number, party: customerName(world, r.customerId), date: shortDate(r.issuedAt), amount: r.amount, status };
    }
    case "order": {
      const r = findRecord(world, { ...refx, kind: "order" });
      if (!r) return null;
      const items = r.lines.reduce((s, l) => s + l.qty, 0);
      return { number: `Order ${r.id}`, party: `${customerName(world, r.customerId)}, ${items} ${items === 1 ? "item" : "items"}`, date: shortDate(r.createdAt), amount: r.total, status: { label: r.status === "fulfilled" ? "Fulfilled" : r.status === "invoiced" ? "Invoiced" : "Paid", variant: r.status === "fulfilled" ? "good" : "default" } };
    }
    case "bill": {
      const r = findRecord(world, { ...refx, kind: "bill" });
      if (!r) return null;
      return { number: r.vendor, party: `${r.category} bill`, date: shortDate(r.billDate), amount: r.amount, status: r.paidAt ? { label: "Paid", variant: "good" } : { label: `Due ${shortDate(r.dueDate)}` } };
    }
    case "lead": {
      const r = findRecord(world, { ...refx, kind: "lead" });
      if (!r) return null;
      const stage = r.stage === "won" ? { label: "Won", variant: "good" as const } : r.stage === "lost" ? { label: "Lost", variant: "critical" as const } : r.stage === "quoted" ? { label: "Quoted" } : { label: r.stage === "new" ? "New" : "Contacted" };
      return { number: `${r.shop}, ${r.city}`, party: r.quotedAt ? `${r.contact}, quoted ${shortDate(r.quotedAt)}` : r.contact, date: `Last reply ${shortDate(r.lastContactedAt)}`, amount: r.estValueINR, status: stage };
    }
    case "subscription": {
      const r = findRecord(world, { ...refx, kind: "subscription" });
      if (!r) return null;
      const unused = daysBetween(r.lastUsedAt, today);
      return { number: `${r.vendor} ${r.plan}`, party: `${r.seats} ${r.seats === 1 ? "seat" : "seats"}, last used ${shortDate(r.lastUsedAt)}`, date: `Renews ${shortDate(r.renewsOn)}`, amount: r.monthlyINR, status: r.status === "cancelled" ? { label: "Cancelled", variant: "good" } : { label: `Unused ${unused} days`, variant: "warn" } };
    }
    case "obligation": {
      const r = findRecord(world, { ...refx, kind: "obligation" });
      if (!r) return null;
      return { number: r.label, party: `Penalty ${inr(r.penaltyINR)} if missed`, date: `Due ${shortDate(r.dueDate)}`, amount: r.amountINR, status: r.handledAt ? { label: "Scheduled", variant: "good" } : { label: "Due", variant: "warn" } };
    }
    case "ticket": {
      const r = findRecord(world, { ...refx, kind: "ticket" });
      if (!r) return null;
      return { number: r.subject, party: `${customerName(world, r.customerId)}, ${r.region}`, date: shortDate(r.createdAt), amount: null, status: r.status === "escalated" ? { label: "Escalated", variant: "warn" } : r.status === "resolved" ? { label: "Resolved", variant: "good" } : { label: "Open", variant: "critical" } };
    }
    case "shipment": {
      const r = findRecord(world, { ...refx, kind: "shipment" });
      if (!r) return null;
      const late = r.deliveredAt ? daysBetween(r.promisedAt, r.deliveredAt) : daysBetween(r.promisedAt, today);
      return { number: `AWB ${r.id}`, party: `${r.courier}, ${r.region}`, date: `Promised ${shortDate(r.promisedAt)}`, amount: null, status: late > 0 ? { label: `${late} days late`, variant: "critical" } : { label: r.status === "delivered" ? "Delivered" : "In transit", variant: r.status === "delivered" ? "good" : "default" } };
    }
    case "product": {
      const r = findRecord(world, { ...refx, kind: "product" });
      if (!r) return null;
      return { number: r.name, party: `${r.supplier}, ${r.leadTimeDays} days lead time`, date: `${r.onHand} on hand`, amount: r.wholesalePrice, status: undefined };
    }
    case "customer": {
      const r = findRecord(world, { ...refx, kind: "customer" });
      if (!r) return null;
      return { number: r.shop ?? r.name, party: `${r.contact ? `${r.contact}, ` : ""}${r.city}`, date: `Since ${shortDate(r.createdAt)}`, amount: null, status: { label: r.type === "wholesale" ? "Wholesale" : "D2C" } };
    }
    case "bankTxn": {
      const r = findRecord(world, { ...refx, kind: "bankTxn" });
      if (!r) return null;
      return { number: r.narration, party: r.category, date: shortDate(r.date), amount: r.amount };
    }
    case "adDay": {
      const r = findRecord(world, { ...refx, kind: "adDay" });
      if (!r) return null;
      return { number: r.campaign, party: `${r.sessions} sessions, ${r.clicks} clicks`, date: shortDate(r.date), amount: r.spend, status: { label: r.status === "paused" ? "Paused" : "Active", variant: r.status === "paused" ? "warn" : "good" } };
    }
    case "trafficDay": {
      const r = findRecord(world, { ...refx, kind: "trafficDay" });
      if (!r) return null;
      return { number: "Site traffic", party: `${r.organic} organic, ${r.landingSessions} on landing pages`, date: shortDate(r.date), amount: null };
    }
    case "task": {
      const r = findRecord(world, { ...refx, kind: "task" });
      if (!r) return null;
      return { number: r.title, party: "Task", date: `Due ${shortDate(r.dueDate)}`, amount: null, status: r.status === "done" ? { label: "Done", variant: "good" } : { label: "Open" } };
    }
    case "purchaseOrder": {
      const r = findRecord(world, { ...refx, kind: "purchaseOrder" });
      if (!r) return null;
      return { number: `Purchase order ${r.id}`, party: `${r.supplier}, ${r.lines.map((l) => `${l.qty} ${productName(world, l.sku)}`).join(", ")}`, date: shortDate(r.createdAt), amount: null, status: { label: r.status === "sent" ? "Sent" : "Draft" } };
    }
    default:
      return null;
  }
}

function Missing({ refx }: { refx: RecordRef }) {
  return (
    <p className="t-caption text-ink-3">
      Record {refx.id} is not in the synced data. <VaultLink refx={refx} />
    </p>
  );
}

export { timeOf };
