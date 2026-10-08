import { describe, expect, it } from "vitest";
import { STORIES } from "@/data/seed/stories";
import { analyze, optimize, walkCausalGraph } from "@/engine";
import { seed } from "./helpers";

// Every planted story's `expect`: a detector with at least the planted impact, the S2 chain, or
// the simulator's top strategy (docs/DATA-MODEL.md, section 3).
describe("planted stories", () => {
  const world = seed();
  const findings = analyze(world);
  for (const story of STORIES) {
    it(`${story.id}: ${story.title}`, () => {
      const e = story.expect;
      if ("detector" in e) {
        const f = findings.find((x) => x.detector === e.detector);
        expect(f, `${e.detector} fired`).toBeDefined();
        expect(f!.impactINR).toBeGreaterThanOrEqual(e.minImpact);
        expect(f!.evidence.length).toBeGreaterThan(0);
      } else if ("chain" in e) {
        const chain = walkCausalGraph(world, e.chain.target);
        expect(chain.nodes.map((n) => n.metric)).toEqual(e.chain.nodes);
        expect(chain.branches.map((b) => b.nodes[0].metric)).toContain(e.chain.branch);
      } else {
        const top = optimize(world).top3[0];
        expect(top.levers.hires).toBe(e.simulator.hires);
      }
    });
  }
});
