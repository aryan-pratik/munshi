import type { Finding, World } from "@/types";
import { inr } from "@/lib/format";
import { addDays, dayIndex, daysBetween } from "../windows";
import { series } from "../metrics";
import { finding, recordSeries, ref, type DetectorCtx } from "./shared";

/** Invoices unpaid past their due date. One aggregated finding. */
export function overdueInvoices(world: World, ctx: DetectorCtx): Finding[] {
  const overdue = world.invoices
    .filter((i) => i.status === "unpaid" && i.dueDate < ctx.now)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!overdue.length) return [];
  const total = overdue.reduce((s, i) => s + i.amount, 0);
  const oldest = overdue[0];
  const oldestCustomer = world.customers.find((c) => c.id === oldest.customerId);
  const daysLate = daysBetween(oldest.dueDate, ctx.now);
  const onset = addDays(oldest.dueDate, 1);
  const overdueSeries = series(world, "receivablesOverdue");
  const seriesPts = recordSeries(world, ctx.now, onset, (d) => overdueSeries[d] ?? 0);
  const remindedToday = overdue.every((i) => i.reminderSentAt === ctx.now);
  const reminders = world.messages.filter((m) => m.invoiceId && overdue.some((i) => i.id === m.invoiceId));
  const evidence = [...overdue.map((i) => ref(i.source, "invoice", i.id)), ...reminders.map((m) => ref(m.source, "message", m.id))];
  return [
    finding({
      detector: "overdueInvoices",
      aggregate: true,
      severity: remindedToday ? "medium" : "critical",
      title: remindedToday
        ? `${overdue.length} overdue invoices, ${inr(total)}: reminders sent today`
        : `${overdue.length} wholesale invoices overdue, ${inr(total)}`,
      impactINR: total,
      confidence: 1,
      window: { from: addDays(ctx.now, -27), to: ctx.now },
      onset,
      series: seriesPts,
      evidence,
      explain: `${overdue.length} wholesale invoices totalling ${inr(total)} are past due. The oldest, ${inr(oldest.amount)} from ${oldestCustomer?.name ?? "a wholesale account"}, is ${daysLate} days late${oldest.remindersSent ? ` after ${oldest.remindersSent} reminder${oldest.remindersSent > 1 ? "s" : ""}` : ""}.`,
      playbooks: ["collectOverdue"],
    }),
  ];
}

export { dayIndex };
