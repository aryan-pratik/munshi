import { describe, expect, it } from "vitest";
import { analyze, briefTotal, dayIndex, horizon } from "@/engine";
import { seed } from "./helpers";

describe("analyze on the seed", () => {
  const world = seed();
  const findings = analyze(world);

  it("finds eleven things, the stale leads first, worth about four lakh", () => {
    expect(findings).toHaveLength(11);
    expect(findings[0].detector).toBe("staleHighValueLeads");
    expect(findings[0].impactINR).toBe(110_400);
    const total = briefTotal(findings);
    expect(total).toBeGreaterThan(3_80_000);
    expect(total).toBeLessThan(4_25_000);
    expect(findings.map((f) => f.detector)).not.toContain("deliverySLA"); // folded into complaintSpike
  });

  it("ranks by impact, then severity, with deterministic unique ids", () => {
    for (let i = 1; i < findings.length; i++) expect(findings[i - 1].impactINR).toBeGreaterThanOrEqual(findings[i].impactINR);
    const ids = findings.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of findings) expect(f.id).toBe(`${f.detector}:${f.evidence[0].source}:${f.evidence[0].kind}:${["staleHighValueLeads", "overdueInvoices", "zombieSubscription", "renewalDue"].includes(f.detector) ? "all" : f.evidence[0].id}`);
    expect(analyze(seed()).map((f) => f.id)).toEqual(ids);
  });

  it("gives every finding evidence, a series, a window and a bounded confidence", () => {
    for (const f of findings) {
      expect(f.evidence.length, f.id).toBeGreaterThan(0);
      expect(f.series.length, f.id).toBeGreaterThanOrEqual(2);
      expect(f.impactINR).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
      expect(f.window.from <= f.window.to, f.id).toBe(true);
      expect(f.explain.length).toBeGreaterThan(40);
      expect(f.title).not.toMatch(/[—–!]/);
      expect(f.explain).not.toMatch(/[—–!]/);
    }
  });

  it("marks forward-looking findings with a null onset and dates the rest", () => {
    const forward = new Set(["cashCrunch", "stockoutRisk", "renewalDue"]);
    for (const f of findings) {
      if (forward.has(f.detector)) expect(f.onset, f.id).toBeNull();
      else if (f.onset) expect(dayIndex(world, f.onset)).toBeLessThanOrEqual(dayIndex(world, f.window.to));
    }
    const byDetector = Object.fromEntries(findings.map((f) => [f.detector, f]));
    expect(dayIndex(world, byDetector.conversionDrop.onset!)).toBe(79);
    expect(dayIndex(world, byDetector.costCreep.onset!)).toBe(60);
    expect(byDetector.customerConcentration.impactINR).toBe(0);
    expect(byDetector.customerConcentration.exposureINR).toBeGreaterThan(16_00_000);
    expect(byDetector.complaintSpike.evidence.some((e) => e.kind === "shipment")).toBe(true);
    expect(byDetector.complaintSpike.evidence.some((e) => e.kind === "event")).toBe(true);
  });

  it("projects the cash dip under the buffer on day 23, recovered by collecting the overdue invoices", () => {
    const h = horizon(world);
    expect(h.points).toHaveLength(31);
    expect(h.dip?.day).toBe(23);
    expect(h.dip!.shortfall).toBeGreaterThan(50_000);
    expect(h.dip!.shortfall).toBeLessThan(75_000);
    expect(h.dipWithCollection).toBeNull();
    expect(h.overdueINR).toBe(82_400);
    const cash = findings.find((f) => f.detector === "cashCrunch")!;
    expect(cash.impactINR).toBe(h.dip!.shortfall);
    expect(briefTotal(findings)).toBe(findings.filter((f) => f.detector !== "cashCrunch").reduce((s, f) => s + f.impactINR, 0));
  });

  it("matches the committed snapshot", () => {
    expect(findings.map((f) => ({ id: f.id, severity: f.severity, group: f.group, title: f.title, impactINR: f.impactINR, onset: f.onset, playbooks: f.playbooks }))).toMatchSnapshot();
  });
});
