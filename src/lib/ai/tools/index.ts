import { compareWindowsTool } from "./compare-windows";
import { getFindingsTool } from "./get-findings";
import { getMetricSeriesTool } from "./get-metric-series";
import { getRecordTool } from "./get-record";
import { listRecordsTool } from "./list-records";
import { runSimulationTool } from "./run-simulation";
import { walkCausalGraphTool } from "./walk-causal-graph";
import type { World } from "@/types";

// Every tool wraps one engine function (docs/ARCHITECTURE.md, section 5). The model never
// computes; it asks these.
export const investigatorTools = {
  getMetricSeries: getMetricSeriesTool,
  compareWindows: compareWindowsTool,
  walkCausalGraph: walkCausalGraphTool,
  listRecords: listRecordsTool,
  getRecord: getRecordTool,
  runSimulation: runSimulationTool,
  getFindings: getFindingsTool,
};

export type ToolName = keyof typeof investigatorTools;

export const contextFor = (world: World) => Object.fromEntries(Object.keys(investigatorTools).map((k) => [k, { world }])) as Record<ToolName, { world: World }>;

export { getMetricSeries } from "./get-metric-series";
export { compareWindows } from "./compare-windows";
export { walkCausalGraph } from "./walk-causal-graph";
export { listRecords } from "./list-records";
export { getRecord } from "./get-record";
export { runSimulation } from "./run-simulation";
export { getFindings } from "./get-findings";
