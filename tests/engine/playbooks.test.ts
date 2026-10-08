import { describe, expect, it } from "vitest";
import { analyze, applyEffects, handledFindings, nextFriday, playbook, replay } from "@/engine";
import type { Action, Finding } from "@/types";
import { Draft, Effect } from "@/types";
import { seed } from "./helpers";

const BAD = /[—–!]/;

describe("playbooks", () => {
  const world = seed();
  const findings = analyze(world);
  const byDetector = (d: Finding["detector"]) => findings.find((f) => f.detector === d)!;
  const act = (f: Finding, i: number): Action => {
    const pb = playbook(f.playbooks[0]);
    const drafts = pb.drafts(world, f);
    return { id: `a${i}`, playbook: pb.id, findingId: f.id, approvedAt: "2026-10-08T18:05:00+05:30", effects: pb.apply(world, f, drafts) };
  };

  it("followUpLeads drafts one reply per lead from its thread, with the agreed labels", () => {
    const f = byDetector("staleHighValueLeads");
    const pb = playbook("followUpLeads");
    const drafts = pb.drafts(world, f);
    expect(drafts).toHaveLength(7);
    for (const d of drafts) {
      Draft.parse(d);
      const lead = world.leads.find((l) => l.id === d.to.id)!;
      expect(d.channel).toBe(lead.channel);
      expect(d.body).toContain(lead.contact.split(" ")[0]);
      expect(d.body).not.toMatch(BAD);
      expect(d.refs.length).toBeGreaterThan(0);
    }
    expect(drafts[0].body).toMatch(/60 mug sets/);
    expect(pb.labels(7)).toEqual({ review: "Review 7 drafts", approve: "Approve and send 7", working: "Sending 7…", done: "7 follow-ups sent" });
    expect(pb.expectedImpact(world, f)).toMatchObject({ inr: f.impactINR, horizonDays: 14 });
    expect(pb.plan(world, f).map((s) => s.kind)).toEqual(["read", "draft", "approve", "send", "remind", "update"]);
    expect(nextFriday(world)).toBe("2026-10-09");
  });

  it("applies effects immutably and the stale leads resolve into Handled", () => {
    const before = JSON.stringify(world);
    const f = byDetector("staleHighValueLeads");
    const a = act(f, 1);
    for (const e of a.effects) Effect.parse(e);
    const after = applyEffects(world, a.effects);
    expect(JSON.stringify(world)).toBe(before);
    expect(after).not.toBe(world);
    expect(after.products).toBe(world.products); // untouched collections keep identity
    expect(after.tasks).toHaveLength(1);
    expect(after.messages.length).toBe(world.messages.length + 7);
    expect(analyze(after).find((x) => x.id === f.id)).toBeUndefined();
    const handled = handledFindings(world, [a]);
    expect(handled).toHaveLength(1);
    expect(handled[0].finding.id).toBe(f.id);
    expect(handled[0].action.approvedAt).toBe(a.approvedAt);
    expect(analyze(after)[0].detector).not.toBe("staleHighValueLeads");
  });

  it("every playbook resolves or downgrades its finding", () => {
    const expected: Record<string, "resolved" | "info" | "medium"> = {
      staleHighValueLeads: "resolved",
      overdueInvoices: "medium",
      zombieSubscription: "resolved",
      complaintSpike: "info",
      stockoutRisk: "resolved",
      renewalDue: "resolved",
    };
    let i = 0;
    for (const [detector, outcome] of Object.entries(expected)) {
      const f = byDetector(detector as Finding["detector"]);
      const pb = playbook(f.playbooks[0]);
      const drafts = pb.drafts(world, f);
      expect(drafts.length, detector).toBeGreaterThan(0);
      for (const d of drafts) expect(d.body, d.id).not.toMatch(BAD);
      const labels = pb.labels(drafts.length);
      for (const l of Object.values(labels)) expect(l).not.toMatch(BAD);
      const effects = pb.apply(world, f, drafts);
      expect(effects.length, detector).toBeGreaterThan(0);
      const after = analyze(applyEffects(world, effects)).find((x) => x.id === f.id);
      if (outcome === "resolved") expect(after, detector).toBeUndefined();
      else expect(after?.severity, detector).toBe(outcome);
      void i++;
    }
  });

  it("reorderStock creates a purchase order the stockout detector then honours", () => {
    const f = byDetector("stockoutRisk");
    const effects = playbook("reorderStock").apply(world, f, playbook("reorderStock").drafts(world, f));
    expect(effects[0]).toMatchObject({ op: "create", collection: "purchaseOrders" });
    const po = (effects[0] as Extract<Effect, { op: "create" }>).record as unknown as { supplier: string; lines: { sku: string; qty: number }[]; status: string };
    expect(po.lines[0].sku).toBe("CER-MUG4");
    expect(po.lines[0].qty).toBeGreaterThanOrEqual(96);
    expect(po.status).toBe("sent");
  });

  it("replay folds actions in order and skips nothing", () => {
    const a1 = act(byDetector("staleHighValueLeads"), 1);
    const w1 = applyEffects(world, a1.effects);
    const f2 = analyze(w1).find((f) => f.detector === "zombieSubscription")!;
    const pb = playbook("cancelSubscription");
    const a2: Action = { id: "a2", playbook: "cancelSubscription", findingId: f2.id, approvedAt: "2026-10-08T18:06:00+05:30", effects: pb.apply(w1, f2, pb.drafts(w1, f2)) };
    const replayed = replay(world, [a1, a2]);
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(applyEffects(w1, a2.effects)));
    expect(handledFindings(world, [a1, a2]).map((h) => h.finding.detector)).toEqual(["staleHighValueLeads", "zombieSubscription"]);
    expect(analyze(replayed)).toHaveLength(9);
  });
});
