import type { Draft, Effect, Finding, Obligation, World } from "@/types";
import { TEMPLATES, fill } from "@/data/rules/playbooks";
import { SIGNATURE } from "@/data/rules/tone";
import { inr } from "@/lib/format";
import { addDays, nowAt } from "../windows";
import { dmy, num, plural, refsOf, step, taskRecord, type Playbook } from "./shared";

function obligationsOf(world: World, finding: Finding): Obligation[] {
  const ids = new Set(refsOf(finding, "obligation").map((r) => r.id));
  return world.obligations.filter((o) => ids.has(o.id)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const scheduleRenewal: Playbook = {
  id: "scheduleRenewal",
  appliesTo: ["renewalDue"],
  plan(world, finding) {
    const obs = obligationsOf(world, finding);
    const insurer = obs.find((o) => o.kind === "insurance");
    return [
      step("read", "read", `Read the ${plural(obs.length, "due date")} and the penalty on each`),
      step("draft", "draft", `Draft a task two days before each due date${insurer ? ", and the renewal request to the insurer" : ""}`),
      step("approve", "approve", "You approve the dates"),
      step("update", "update", "Put them on the calendar and mark each as handled"),
    ];
  },
  drafts(world, finding) {
    // One draft per obligation: a calendar task, or for the insurance a renewal request to the insurer.
    return obligationsOf(world, finding).map((o): Draft => {
      const ref = { source: o.source, kind: "obligation" as const, id: o.id };
      if (o.kind === "insurance") {
        const insurer = o.label.split(",").slice(1).join(",").trim() || "the insurer";
        return { id: `draft:${o.id}`, to: ref, channel: "email", subject: `Renewal: ${o.label}`, body: fill(TEMPLATES.scheduleRenewal.email, { insurer, due: dmy(o.dueDate), signature: SIGNATURE.email }), refs: [ref] };
      }
      return { id: `draft:${o.id}`, to: ref, channel: "task", body: fill(TEMPLATES.scheduleRenewal.task, { label: o.label, amount: num(o.amountINR), due: dmy(o.dueDate), penalty: o.penaltyINR ? `, ${inr(o.penaltyINR)} if missed` : "" }), refs: [ref] };
    });
  },
  apply(world, finding, approved) {
    const at = nowAt(world);
    const effects: Effect[] = [];
    for (const o of obligationsOf(world, finding).filter((x) => approved.some((d) => d.to.id === x.id))) {
      effects.push({ op: "create", collection: "tasks", record: taskRecord(world, `task:${finding.id}:${o.id}`, `${o.label}, ${inr(o.amountINR)}`, addDays(o.dueDate, -2), [{ source: o.source, kind: "obligation", id: o.id }]) });
      effects.push({ op: "set", collection: "obligations", id: o.id, patch: { handledAt: at } });
      const email = approved.find((d) => d.to.id === o.id && d.channel === "email");
      if (email) {
        effects.push({ op: "create", collection: "messages", record: { id: `msg:${finding.id}:${o.id}`, source: "gmail", createdAt: at, threadId: `renewal:${o.id}`, channel: "email", direction: "out", from: SIGNATURE.ownerFull, to: o.label.split(",").slice(1).join(",").trim() || "Insurer", subject: email.subject, body: email.body, at } });
      }
    }
    return effects;
  },
  expectedImpact(world, finding) {
    const obs = obligationsOf(world, finding);
    const penalties = obs.reduce((s, o) => s + o.penaltyINR, 0);
    return { inr: penalties, horizonDays: 21, basis: `${inr(penalties)} in late fees and lapses avoided across ${plural(obs.length, "renewal")}` };
  },
  labels(n) {
    return { review: `Review ${plural(n, "renewal")}`, approve: `Schedule ${n}`, working: `Scheduling ${n}…`, done: `${plural(n, "renewal")} scheduled` };
  },
};
