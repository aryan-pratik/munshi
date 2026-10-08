import { tool } from "ai";
import { z } from "zod";
import type { World } from "@/types";
import { BASE_LEVERS, simulate, simulateBase } from "@/engine";
import { worldContext } from "./context";

export const runSimulationInput = z.object({
  pricePct: z.number().min(-20).max(30).optional(),
  marketingPct: z.number().min(-50).max(100).optional(),
  hires: z.number().int().min(0).max(4).optional(),
  inventoryPct: z.number().min(-30).max(50).optional(),
  followUpHours: z.union([z.literal(4), z.literal(12), z.literal(24), z.literal(48)]).optional(),
});

/** The monthly model for one set of levers, beside the base case. */
export function runSimulation(world: World, input: z.infer<typeof runSimulationInput>) {
  const levers = { ...BASE_LEVERS, ...input };
  return { base: simulateBase(world), scenario: simulate(world, levers) };
}

export const runSimulationTool = tool({
  description: "Run the monthly simulator for a set of levers (price %, marketing %, hires, inventory %, follow-up hours) and compare it with the base case.",
  inputSchema: runSimulationInput,
  contextSchema: worldContext,
  execute: async (input, { context }) => runSimulation(context.world, input),
});
