import type { Draft, Effect, Finding, Subscription, World } from "@/types";
import { TEMPLATES, fill } from "@/data/rules/playbooks";
import { inr } from "@/lib/format";
import { daysBetween, now, nowAt } from "../windows";
import { dmy, num, plural, refsOf, step, type Playbook } from "./shared";

function subsOf(world: World, finding: Finding): Subscription[] {
  const ids = new Set(refsOf(finding, "subscription").map((r) => r.id));
  return world.subscriptions.filter((s) => ids.has(s.id));
}

export const cancelSubscription: Playbook = {
  id: "cancelSubscription",
  appliesTo: ["zombieSubscription", "costCreep"],
  plan(world, finding) {
    const subs = subsOf(world, finding);
    return [
      step("read", "read", `Check the last sign-in on ${plural(subs.length, "subscription")}`),
      step("approve", "approve", "You confirm nobody on the team still needs them"),
      step("update", "update", `Cancel ${subs.length} in Zoho Books before the next renewal`),
      step("remind", "remind", `Note the saving, ${inr(subs.reduce((s, x) => s + x.monthlyINR, 0) * 12)} a year`),
    ];
  },
  drafts(world, finding) {
    const today = now(world);
    return subsOf(world, finding).map((s) => ({
      id: `draft:${s.id}`,
      to: { source: s.source, kind: "subscription" as const, id: s.id },
      channel: "task" as const,
      body: fill(TEMPLATES.cancelSubscription.task, { vendor: s.vendor, plan: s.plan, monthly: num(s.monthlyINR), daysIdle: daysBetween(s.lastUsedAt, today), renews: dmy(s.renewsOn) }),
      refs: [{ source: s.source, kind: "subscription" as const, id: s.id }],
    })) satisfies Draft[];
  },
  apply(world, finding, approved) {
    const at = nowAt(world);
    const effects: Effect[] = [];
    for (const s of subsOf(world, finding).filter((x) => approved.some((d) => d.to.id === x.id))) {
      effects.push({ op: "set", collection: "subscriptions", id: s.id, patch: { status: "cancelled" } });
      effects.push({ op: "create", collection: "tasks", record: { id: `task:${finding.id}:${s.id}`, source: "zoho-books", createdAt: at, title: `${s.vendor} ${s.plan} cancelled, ${inr(s.monthlyINR * 12)} a year saved`, dueDate: now(world), status: "done", refs: [{ source: s.source, kind: "subscription", id: s.id }] } });
    }
    return effects;
  },
  expectedImpact(world, finding) {
    const subs = subsOf(world, finding);
    const monthly = subs.reduce((s, x) => s + x.monthlyINR, 0);
    return { inr: monthly * 12, horizonDays: 365, basis: `${inr(monthly)} a month across ${plural(subs.length, "subscription")} that stops renewing` };
  },
  labels(n) {
    return { review: `Review ${plural(n, "cancellation")}`, approve: `Cancel ${plural(n, "subscription")}`, working: `Cancelling ${n}…`, done: `${plural(n, "subscription")} cancelled` };
  },
};
