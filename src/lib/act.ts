import type { Action, Draft, Effect, Finding, PlaybookId, Step, World } from "@/types";
import { analyze, playbook } from "@/engine";
import { inrCompact, midSentence, shortDate } from "@/lib/format";
import { customerName, findRecord, productName } from "@/lib/records";

// Act helpers shared by the route, the sheet and the timeline. None of these compute a figure:
// every number is read from the playbook, the finding or the effects.

export type Plan = { steps: Step[]; drafts: Draft[] };

/** The engine's plan and template drafts for a finding (scripted `/api/act` streams exactly this). */
export function actPlan(world: World, findingId: string, playbookId?: PlaybookId): { finding: Finding; playbookId: PlaybookId; plan: Plan } | null {
  const finding = analyze(world).find((f) => f.id === findingId);
  if (!finding) return null;
  const id = playbookId ?? finding.playbooks[0];
  if (!id) return null;
  const pb = playbook(id);
  return { finding, playbookId: id, plan: { steps: pb.plan(world, finding), drafts: pb.drafts(world, finding) } };
}

export type Recipient = { name: string; detail: string };

/** Who a draft goes to, from the record it is addressed to. */
export function recipientOf(world: World, draft: Draft): Recipient {
  const ref = draft.to;
  switch (ref.kind) {
    case "lead": {
      const l = findRecord(world, { ...ref, kind: "lead" });
      return l ? { name: l.contact, detail: `${l.shop}, ${l.city}` } : { name: "Lead", detail: ref.id };
    }
    case "invoice": {
      const i = findRecord(world, { ...ref, kind: "invoice" });
      const c = i ? world.customers.find((x) => x.id === i.customerId) : undefined;
      return { name: c?.contact ?? c?.name ?? "Customer", detail: i ? `${c?.name ?? ""}, invoice ${i.number}`.replace(/^, /, "") : ref.id };
    }
    case "subscription": {
      const s = findRecord(world, { ...ref, kind: "subscription" });
      return s ? { name: s.vendor, detail: `${s.plan}, ${inrCompact(s.monthlyINR)} a month` } : { name: "Vendor", detail: ref.id };
    }
    case "shipment": {
      const s = findRecord(world, { ...ref, kind: "shipment" });
      return { name: s ? `${s.courier} account manager` : "Courier account manager", detail: s ? `AWB ${s.id}` : "" };
    }
    case "product": {
      const p = findRecord(world, { ...ref, kind: "product" });
      return p ? { name: p.supplier, detail: productName(world, p.sku) } : { name: "Supplier", detail: ref.id };
    }
    case "obligation": {
      const o = findRecord(world, { ...ref, kind: "obligation" });
      return o ? { name: o.label, detail: `Due ${shortDate(o.dueDate)}` } : { name: "Renewal", detail: ref.id };
    }
    case "customer":
      return { name: customerName(world, ref.id), detail: "" };
    default:
      return { name: ref.kind, detail: ref.id };
  }
}

export function initialsOf(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

/** "7 messages on WhatsApp." / "5 on WhatsApp and 2 by email." / "1 task." for the approval bar. */
export function draftsSentence(drafts: Draft[]): string {
  const n = (c: Draft["channel"]) => drafts.filter((d) => d.channel === c).length;
  const wa = n("whatsapp");
  const em = n("email");
  const task = n("task");
  const parts: string[] = [];
  if (wa) parts.push(em ? `${wa} on WhatsApp` : `${wa} ${wa === 1 ? "message" : "messages"} on WhatsApp`);
  if (em) parts.push(wa ? `${em} by email` : `${em} ${em === 1 ? "email" : "emails"}`);
  if (task) parts.push(`${task} ${task === 1 ? "task" : "tasks"}`);
  if (!parts.length) return "Nothing selected.";
  return `${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]}.`;
}

/** The Done list: one line per kind of effect, in plain words, from the effects themselves. */
export function effectLines(world: World, effects: Effect[]): string[] {
  const lines: string[] = [];
  const created = (c: string) => effects.filter((e) => e.op === "create" && e.collection === c);
  const set = (c: string) => effects.filter((e) => e.op === "set" && e.collection === c);
  const msgs = created("messages");
  if (msgs.length) {
    const wa = msgs.filter((e) => e.op === "create" && e.record.channel === "whatsapp").length;
    const em = msgs.length - wa;
    const via = wa && em ? "on WhatsApp and email" : wa ? "on WhatsApp" : "by email";
    lines.push(`${msgs.length} ${msgs.length === 1 ? "message" : "messages"} sent ${via}`);
  }
  const leads = set("leads");
  if (leads.length) lines.push(`Last contact updated on ${leads.length} ${leads.length === 1 ? "lead" : "leads"} in the CRM`);
  const invoices = set("invoices");
  if (invoices.length) lines.push(`${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"} marked as reminded`);
  const subs = set("subscriptions");
  if (subs.length) lines.push(`${subs.length} ${subs.length === 1 ? "subscription" : "subscriptions"} cancelled`);
  const tickets = set("tickets");
  if (tickets.length) lines.push(`${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"} escalated`);
  const obligations = set("obligations");
  if (obligations.length) lines.push(`${obligations.length} ${obligations.length === 1 ? "renewal" : "renewals"} scheduled`);
  for (const e of created("purchaseOrders")) {
    if (e.op === "create") lines.push(`Purchase order ${String(e.record.id)} drafted to ${String(e.record.supplier ?? "the supplier")}`);
  }
  for (const e of created("tasks")) {
    if (e.op === "create") {
      const due = typeof e.record.dueDate === "string" ? ` for ${shortDate(e.record.dueDate)}` : "";
      lines.push(`Reminder set${due}: ${midSentence(String(e.record.title ?? ""))}`);
    }
  }
  void world;
  return lines;
}

/** How many things an action did, for `labels(n).done`: the count the playbook's own drafts carried. */
export function doneCount(action: Action): number {
  const by = (op: Effect["op"], c: string) => action.effects.filter((e) => e.op === op && e.collection === c).length;
  switch (action.playbook) {
    case "followUpLeads":
    case "collectOverdue":
      return by("create", "messages");
    case "cancelSubscription":
      return by("set", "subscriptions");
    case "reorderStock":
      return by("create", "purchaseOrders");
    case "scheduleRenewal":
      return by("set", "obligations");
    default:
      return 1;
  }
}
