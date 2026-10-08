import { describe, expect, it } from "vitest";
import { BASE_LEVERS, baseInputs, optimize, simulate, simulateBase } from "@/engine";
import { run } from "@/engine/simulator/model";
import { seed } from "./helpers";

// docs/ENGINE.md, 4.6: the verified results hold on the committed seed within a few percent.
describe("simulator", () => {
  const world = seed();
  const base = simulateBase(world);

  it("computes base inputs from the last 30 days", () => {
    const b = baseInputs(world);
    expect(b.staff0).toBe(4);
    expect(b.ordersPerPersonPerMonth).toBe(177);
    expect(b.festiveLift).toBe(1.06);
    expect(b.cash0).toBe(6_40_000);
    expect(b.A0).toBe(40);
    expect(Math.abs(b.ordersD0 - 633) / 633).toBeLessThan(0.03);
    expect(Math.abs(b.aovW - 21_600) / 21_600).toBeLessThan(0.03);
    expect(Math.abs(b.ordersW0 - 46.7) / 46.7).toBeLessThan(0.03);
  });

  it("reproduces the verified base", () => {
    expect(Math.abs(base.outcome.profit - 1_60_259) / 1_60_259).toBeLessThan(0.03);
    expect(Math.abs(base.outcome.revenue - 18_70_462) / 18_70_462).toBeLessThan(0.03);
    expect(base.risk).toBe("low");
    expect(base.notes.join(" ")).toMatch(/102% of capacity/);
  });

  it("makes a 15% price rise worse: less profit, a fifth fewer customers, medium risk", () => {
    const p15 = simulate(world, { ...BASE_LEVERS, pricePct: 15 });
    expect(p15.outcome.profit).toBeLessThan(base.outcome.profit);
    expect(p15.outcome.customers / base.outcome.customers).toBeLessThan(0.8);
    expect(p15.risk).toBe("medium");
    expect(p15.outcome.churnPct).toBeGreaterThan(15);
  });

  it("scans 1,800 scenarios and finds a top strategy with one hire, no overload, about 43% more profit", () => {
    const o = optimize(world);
    expect(o.scanned).toBe(1800);
    expect(o.all).toHaveLength(1800);
    expect(o.top3).toHaveLength(3);
    const top = o.top3[0];
    expect(top.profit).toBeGreaterThan(base.outcome.profit);
    expect(top.levers).toEqual({ pricePct: 5, marketingPct: 75, hires: 1, inventoryPct: 20, followUpHours: 12 });
    expect(run(baseInputs(world), top.levers).overload).toBe(0);
    const lift = top.profit / base.outcome.profit - 1;
    expect(lift).toBeGreaterThan(0.38);
    expect(lift).toBeLessThan(0.5);
    expect(top.reason).toMatch(/1 hire/);
    for (const t of o.top3) expect(["low", "medium"]).toContain(simulate(world, t.levers).risk);
  });

  it("is deterministic", () => {
    const a = optimize(world).top3.map((t) => t.profit);
    const b = optimize(world).top3.map((t) => t.profit);
    expect(a).toEqual(b);
  });
});
