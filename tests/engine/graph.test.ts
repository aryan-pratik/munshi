import { describe, expect, it } from "vitest";
import { EDGES, EVENT_ANCHORS, ancestorsOf, dayIndex, walkCausalGraph } from "@/engine";
import { seed } from "./helpers";

describe("causal graph", () => {
  const world = seed();

  it("knows the ancestors of D2C revenue", () => {
    const a = ancestorsOf("revenueD2C");
    expect(a).toContain("adSpend");
    expect(a).toContain("sessions");
    expect(a).toContain("landingCvr");
    expect(a).not.toContain("revenueWholesale");
    for (const e of EDGES) expect([1, -1]).toContain(e.sign);
    expect(Object.keys(EVENT_ANCHORS).length).toBeGreaterThan(0);
  });

  it("walks S2 in onset order with S3 as a branch that carries its own onset", () => {
    const chain = walkCausalGraph(world, "revenueD2C");
    expect(chain.target).toBe("revenueD2C");
    expect(chain.nodes.map((n) => n.metric)).toEqual(["adSpend", "sessions", "ordersD2C", "revenueD2C"]);
    const onsets = chain.nodes.map((n) => (n.onset ? dayIndex(world, n.onset) : null)).filter((x): x is number => x !== null);
    for (let i = 1; i < onsets.length; i++) expect(onsets[i]).toBeGreaterThanOrEqual(onsets[i - 1]);
    expect(chain.edges.length).toBe(chain.nodes.length - 1);
    expect(chain.branches).toHaveLength(1);
    const branch = chain.branches[0];
    expect(branch.nodes[0].metric).toBe("landingCvr");
    expect(branch.nodes[0].onset).not.toBeNull();
    expect(dayIndex(world, branch.nodes[0].onset!)).toBe(79);
    expect(branch.nodes[0].onsetEvidence.some((e) => e.kind === "event")).toBe(true);
    for (const n of [...chain.nodes, ...branch.nodes]) {
      expect(n.series.length).toBe(28);
      expect(n.evidence.length, n.metric).toBeGreaterThan(0);
    }
    // dated evidence sits around the onset, not at the end of the window
    const byId = new Map(world.trafficDays.map((t) => [t.id, t]));
    const traffic = branch.nodes[0].evidence.filter((r) => r.kind === "trafficDay").map((r) => byId.get(r.id)!);
    expect(traffic.length).toBeGreaterThan(0);
    for (const t of traffic) expect(Math.abs(dayIndex(world, t.date) - 79)).toBeLessThanOrEqual(2);
  });

  it("walks the courier change through complaints to repeat rate", () => {
    const chain = walkCausalGraph(world, "repeatRate");
    expect(chain.nodes.map((n) => n.metric)).toEqual(["deliveryDelayAvg", "complaints", "repeatRate"]);
    expect(dayIndex(world, chain.nodes[0].onset!)).toBe(74);
  });

  it("is deterministic and keeps the window it was asked for", () => {
    const a = walkCausalGraph(world, "revenue");
    const b = walkCausalGraph(world, "revenue");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.nodes[a.nodes.length - 1].metric).toBe("revenue");
    expect(a.window.to).toBe("2026-10-08");
  });
});
