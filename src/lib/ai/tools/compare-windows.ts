import { tool } from "ai";
import { z } from "zod";
import { MetricId, type World } from "@/types";
import { METRICS, compareWindows as compare } from "@/engine";
import { worldContext } from "./context";

export const compareWindowsInput = z.object({ metric: MetricId });

/** One metric over the last 14 days against the 14 before. */
export function compareWindows(world: World, input: z.infer<typeof compareWindowsInput>) {
  const c = compare(world, input.metric);
  const meta = METRICS[input.metric];
  const r = (n: number) => Math.round(n * 100) / 100;
  return { metric: input.metric, label: meta.label, unit: meta.unit, goodWhen: meta.goodWhen, current: r(c.current), previous: r(c.previous), delta: r(c.delta), deltaPct: r(c.deltaPct), windows: c.windows };
}

export const compareWindowsTool = tool({
  description: "Compare one metric across the current 14-day window and the previous 14 days: totals, the change and the change in percent.",
  inputSchema: compareWindowsInput,
  contextSchema: worldContext,
  execute: async (input, { context }) => compareWindows(context.world, input),
});
