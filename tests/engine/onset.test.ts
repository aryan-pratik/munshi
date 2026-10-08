import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/data/seed/rng";
import { analyze, dayIndex, detectOnset, metricOnset, walkCausalGraph } from "@/engine";
import { addDays, defaultWindows, weekday } from "@/engine/windows";
import { seed } from "./helpers";

const DAY0 = "2026-07-11";
const W = [1.1, 0.94, 0.96, 0.98, 1.0, 1.02, 1.1];
const window = { from: addDays(DAY0, 62), to: addDays(DAY0, 89), day0: DAY0 };

function synth(seedN: number, opts: { step?: number; at?: number; spike?: number; noise?: number } = {}): number[] {
  const rng = mulberry32(seedN);
  const out: number[] = [];
  for (let d = 0; d < 90; d++) {
    let v = 500 * W[weekday(addDays(DAY0, d))] * (1 + (rng.next() - 0.5) * 2 * (opts.noise ?? 0.03));
    if (opts.step !== undefined && opts.at !== undefined && d >= opts.at) v *= 1 + opts.step;
    if (opts.spike !== undefined && d === opts.spike) v *= 1.6;
    out.push(Math.round(v));
  }
  return out;
}

describe("detectOnset", () => {
  it("returns null on a flat series", () => {
    expect(detectOnset(synth(1), window)).toBeNull();
  });
  it("returns null on a single spike", () => {
    expect(detectOnset(synth(2, { spike: 80 }), window)).toBeNull();
  });
  it("returns null when the change is too fresh to confirm", () => {
    expect(detectOnset(synth(3, { step: -0.2, at: 88 }), window)).toBeNull();
  });
  it("dates a level shift to the day it began", () => {
    const found = detectOnset(synth(4, { step: -0.12, at: 77 }), window);
    expect(found).not.toBeNull();
    expect(Math.abs(dayIndex(seed(), found!) - 77)).toBeLessThanOrEqual(1);
  });
  it("is within a day on at least 90% of 200 random shifts", () => {
    let hits = 0;
    for (let s = 0; s < 200; s++) {
      const at = 68 + (s % 16);
      const found = detectOnset(synth(1000 + s, { step: -0.1, at, noise: 0.03 }), window);
      if (found && Math.abs(dayIndex(seed(), found) - at) <= 1) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(180);
  });
});

describe("onsets on the seed", () => {
  const world = seed();
  const { current } = defaultWindows(world);
  const day = (iso: string | null) => (iso ? dayIndex(world, iso) : null);

  it("dates the four planted changes within a day of the plant", () => {
    const chain = walkCausalGraph(world, "revenueD2C");
    const node = (m: string) => chain.nodes.find((n) => n.metric === m) ?? chain.branches.flatMap((b) => b.nodes).find((n) => n.metric === m);
    expect(Math.abs(day(node("adSpend")!.onset)! - 77)).toBeLessThanOrEqual(1); // S2
    expect(Math.abs(day(node("sessions")!.onset)! - 77)).toBeLessThanOrEqual(1);
    expect(Math.abs(day(node("landingCvr")!.onset)! - 79)).toBeLessThanOrEqual(1); // S3
    expect(Math.abs(day(metricOnset(world, "deliveryDelayAvg", current).onset)! - 74)).toBeLessThanOrEqual(1); // S5
    const creep = analyze(world).find((f) => f.detector === "costCreep")!;
    expect(day(creep.onset)).toBe(60); // S7
  });

  it("snaps an onset to the event on or just before it, and carries the event as evidence", () => {
    const ad = metricOnset(world, "adSpend", current);
    expect(ad.onsetEvidence.map((e) => e.kind)).toContain("event");
    const ev = world.events.find((e) => e.id === ad.onsetEvidence[0].id)!;
    expect(ev.kind).toBe("campaign_paused");
    expect(ad.onset).toBe(ev.at.slice(0, 10));
  });
});
