import { tool } from "ai";
import { z } from "zod";
import { MetricId, type Chain, type World } from "@/types";
import { walkCausalGraph as walk } from "@/engine";
import { worldContext } from "./context";

export const walkCausalGraphInput = z.object({ target: MetricId.describe("The metric whose change to explain") });

/** The likely causal chain behind a metric's change, ordered by onset, with evidence on every node. */
export function walkCausalGraph(world: World, input: z.infer<typeof walkCausalGraphInput>): Chain {
  return walk(world, input.target);
}

export const walkCausalGraphTool = tool({
  description: "Walk the business causal graph upstream from a metric: which metrics moved with it, in what order (onset dates), and the event records behind each. Returns a Chain with an id to cite.",
  inputSchema: walkCausalGraphInput,
  contextSchema: worldContext,
  execute: async (input, { context }) => walkCausalGraph(context.world, input),
});
