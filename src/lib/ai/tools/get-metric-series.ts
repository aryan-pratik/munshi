import { tool } from "ai";
import { z } from "zod";
import { MetricId, type World } from "@/types";
import { METRICS, metricOnset, stripSeries } from "@/engine";
import { addDays, defaultWindows } from "@/engine/windows";
import { worldContext } from "./context";

export const getMetricSeriesInput = z.object({
  metric: MetricId,
  days: z.number().int().min(7).max(90).default(28).describe("How many daily points, ending today"),
});

/** The daily series of one metric, ending today, with the day its change began if one was found. */
export function getMetricSeries(world: World, input: z.infer<typeof getMetricSeriesInput>) {
  const { current } = defaultWindows(world);
  const series = stripSeries(world, input.metric, current, input.days);
  const { onset, onsetEvidence } = metricOnset(world, input.metric, current);
  const meta = METRICS[input.metric];
  return { metric: input.metric, label: meta.label, unit: meta.unit, goodWhen: meta.goodWhen, from: addDays(current.to, -(series.length - 1)), to: current.to, series, onset, onsetEvidence };
}

export const getMetricSeriesTool = tool({
  description: "Daily values of one business metric ending today, with the date its change began when the engine can date it.",
  inputSchema: getMetricSeriesInput,
  contextSchema: worldContext,
  execute: async (input, { context }) => getMetricSeries(context.world, input),
});
