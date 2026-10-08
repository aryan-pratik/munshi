import type { Draft, Effect, Finding, Invoice, World } from "@/types";
import { TEMPLATES, fill } from "@/data/rules/playbooks";
import { SIGNATURE } from "@/data/rules/tone";
import { inr } from "@/lib/format";
import { addDays, daysBetween, now, nowAt } from "../windows";
import { dmy, first, num, plural, refsOf, step, taskRecord, type Playbook } from "./shared";

function invoicesOf(world: World, finding: Finding): Invoice[] {
  const ids = new Set(refsOf(finding, "invoice").map((r) => r.id));
  return world.invoices.filter((i) => ids.has(i.id)).sort((a, b) => b.amount - a.amount);
}

export const collectOverdue: Playbook = {
  id: "collectOverdue",
  appliesTo: ["overdueInvoices", "cashCrunch"],
  plan(world, finding) {
    const inv = invoicesOf(world, finding);
    return [
      step("read", "read", `Read the ${plural(inv.length, "invoice")} and the reminders already sent`),
      step("draft", "draft", "Draft a reminder per invoice: friendly under two weeks late, firm after"),
      step("approve", "approve", "You approve, edit or drop each reminder"),
      step("send", "send", `Email ${inv.length} on the invoice threads`),
      step("remind", "remind", `Add a call for the ${Math.min(2, inv.length) === 1 ? "largest" : "two largest"} for tomorrow`),
      step("update", "update", "Log the reminder on each invoice in Zoho Books"),
    ];
  },
  drafts(world, finding) {
    const today = now(world);
    return invoicesOf(world, finding).map((i) => {
      const c = world.customers.find((x) => x.id === i.customerId);
      const daysLate = daysBetween(i.dueDate, today);
      const firm = daysLate > 14 || i.remindersSent > 0;
      const body = fill(TEMPLATES.collectOverdue[firm ? "firm" : "friendly"], {
        first: first(c?.contact ?? c?.name ?? "Sir or Madam"),
        number: i.number,
        amount: num(i.amount),
        due: dmy(i.dueDate),
        daysLate,
        reminders: i.remindersSent ? `, after ${plural(i.remindersSent, "reminder")}` : "",
        shop: c?.shop ?? c?.name ?? "your store",
        signature: SIGNATURE.email,
      });
      return {
        id: `draft:${i.id}`,
        to: { source: i.source, kind: "invoice" as const, id: i.id },
        channel: "email" as const,
        subject: `${firm ? "Payment overdue" : "Payment reminder"}: ${i.number}, ${inr(i.amount)}`,
        body,
        refs: [{ source: i.source, kind: "invoice" as const, id: i.id }, ...(c ? [{ source: c.source, kind: "customer" as const, id: c.id }] : [])],
      } satisfies Draft;
    });
  },
  apply(world, finding, approved) {
    const at = nowAt(world);
    const today = now(world);
    const inv = invoicesOf(world, finding).filter((i) => approved.some((d) => d.to.id === i.id));
    const effects: Effect[] = [];
    for (const i of inv) {
      const draft = approved.find((d) => d.to.id === i.id)!;
      const c = world.customers.find((x) => x.id === i.customerId);
      effects.push({
        op: "create",
        collection: "messages",
        record: { id: `msg:${finding.id}:${i.id}`, source: "gmail", createdAt: at, threadId: `inv:${i.id}`, channel: "email", direction: "out", from: SIGNATURE.ownerFull, to: c?.contact ?? c?.name ?? "", subject: draft.subject, body: draft.body, at, invoiceId: i.id },
      });
      effects.push({ op: "set", collection: "invoices", id: i.id, patch: { reminderSentAt: today, remindersSent: i.remindersSent + 1 } });
    }
    for (const i of inv.slice(0, 2)) {
      const c = world.customers.find((x) => x.id === i.customerId);
      const title = fill(TEMPLATES.collectOverdue.call, { contact: c?.contact ?? c?.name ?? "the buyer", shop: c?.shop ?? c?.name ?? "the account", number: i.number, amount: num(i.amount), daysLate: daysBetween(i.dueDate, today) });
      effects.push({ op: "create", collection: "tasks", record: taskRecord(world, `task:${finding.id}:${i.id}`, title, addDays(today, 1), [{ source: i.source, kind: "invoice", id: i.id }]) });
    }
    return effects;
  },
  expectedImpact(world, finding) {
    const inv = invoicesOf(world, finding);
    const total = inv.reduce((s, i) => s + i.amount, 0);
    return { inr: total, horizonDays: 14, basis: `${inr(total)} outstanding on ${plural(inv.length, "invoice")}; the two largest get a call tomorrow` };
  },
  labels(n) {
    return { review: `Review ${plural(n, "reminder")}`, approve: `Approve and send ${n}`, working: `Sending ${n}…`, done: `${plural(n, "reminder")} sent` };
  },
};
