import type { Draft, Effect, Finding, World } from "@/types";
import { TEMPLATES, fill } from "@/data/rules/playbooks";
import { SIGNATURE } from "@/data/rules/tone";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { days as fmtDays, inrCompact } from "@/lib/format";
import { addDays, hoursBetween, now, nowAt } from "../windows";
import { courierStats } from "../detectors/delivery";
import { ctxFor } from "../detectors/shared";
import { dmy, plural, refsOf, step, type Playbook } from "./shared";

function situation(world: World, finding: Finding) {
  const ctx = ctxFor(world);
  const stats = courierStats(world, ctx).filter((s) => s.delay > THRESHOLDS.slaDelayDays).sort((a, b) => b.delay - a.delay);
  const courier = stats[0];
  const event = world.events.find((e) => e.kind === "courier_changed");
  const since = event ? event.at.slice(0, 10) : courier?.since ?? now(world);
  const carried = courier ? world.shipments.filter((s) => s.courier === courier.courier && s.dispatchedAt >= since) : [];
  const late = carried.filter((s) => s.deliveredAt && hoursBetween(s.promisedAt, s.deliveredAt) / 24 > THRESHOLDS.lateDeliveryDays);
  const ticketIds = new Set(refsOf(finding, "ticket").map((r) => r.id));
  const tickets = world.tickets.filter((t) => ticketIds.has(t.id));
  const previous = event?.detail?.match(/from (\w+)/)?.[1] ?? "the previous courier";
  return { courier, since, carried, late, tickets, previous };
}

export const escalateCourier: Playbook = {
  id: "escalateCourier",
  appliesTo: ["complaintSpike", "deliverySLA"],
  plan(world, finding) {
    const s = situation(world, finding);
    return [
      step("read", "read", `List the ${plural(s.late.length, "late AWB")} ${s.courier?.courier ?? "the courier"} has carried since ${dmy(s.since)}`),
      step("draft", "draft", "Draft the escalation to the courier's account manager with the AWBs and a 3-day SLA"),
      step("approve", "approve", "You approve or edit it"),
      step("send", "send", "Email the account manager"),
      step("update", "update", `Mark the ${plural(s.tickets.length, "complaint")} escalated in Freshdesk and log the message`),
    ];
  },
  drafts(world, finding) {
    const s = situation(world, finding);
    if (!s.courier) return [];
    const awbs = s.late.slice(0, 12).map((x) => `${x.id} promised ${dmy(x.promisedAt)}, delivered ${dmy(x.deliveredAt!)}`).join("\n") + (s.late.length > 12 ? `\nand ${s.late.length - 12} more` : "");
    const body = fill(TEMPLATES.escalateCourier.email, {
      manager: `${s.courier.courier} account manager`,
      since: dmy(s.since),
      courier: s.courier.courier,
      carried: s.carried.length,
      region: s.courier.region,
      late: s.late.length,
      lateDays: THRESHOLDS.lateDeliveryDays,
      avgDelay: fmtDays(s.courier.delay),
      tickets: s.tickets.length,
      awbs,
      replyBy: dmy(addDays(now(world), 2)),
      previous: s.previous,
      signature: SIGNATURE.email,
    });
    return [
      {
        id: `draft:${finding.id}`,
        to: s.late[0] ? { source: s.late[0].source, kind: "shipment" as const, id: s.late[0].id } : { source: "shiprocket" as const, kind: "shipment" as const, id: s.carried[0]?.id ?? "" },
        channel: "email" as const,
        subject: `${s.courier.region} deliveries ${fmtDays(s.courier.delay)} late since ${dmy(s.since)}: ${plural(s.late.length, "AWB")}`,
        body,
        refs: [...s.late.slice(0, 6).map((x) => ({ source: x.source, kind: "shipment" as const, id: x.id })), ...s.tickets.slice(0, 3).map((t) => ({ source: t.source, kind: "ticket" as const, id: t.id }))],
      },
    ] satisfies Draft[];
  },
  apply(world, finding, approved) {
    if (!approved.length) return [];
    const at = nowAt(world);
    const s = situation(world, finding);
    const draft = approved[0];
    const effects: Effect[] = [
      {
        op: "create",
        collection: "messages",
        record: { id: `msg:${finding.id}`, source: "gmail", createdAt: at, threadId: `courier:${s.courier?.courier ?? "escalation"}`, channel: "email", direction: "out", from: SIGNATURE.ownerFull, to: `${s.courier?.courier ?? "Courier"} account manager`, subject: draft.subject, body: draft.body, at },
      },
      ...s.tickets.map((t): Effect => ({ op: "set", collection: "tickets", id: t.id, patch: { status: "escalated" } })),
    ];
    return effects;
  },
  expectedImpact(world, finding) {
    const s = situation(world, finding);
    return { inr: finding.impactINR, horizonDays: 30, basis: `${plural(s.carried.length, "customer")} on the slow lane, at the repeat rate and order value the complaint finding uses (${inrCompact(finding.impactINR)})` };
  },
  labels(n) {
    void n; // one escalation whatever the AWB count
    return { review: "Review the escalation", approve: "Approve and send", working: "Sending…", done: "Courier escalated" };
  },
};
