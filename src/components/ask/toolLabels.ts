import { getToolName, isToolUIPart } from "ai";
import type { InvestigatorUIMessage } from "@/lib/ai/agents/investigator";
import { inr, midSentence, pct } from "@/lib/format";
import { METRICS } from "@/engine";

// Plain sentences for each tool call, for the activity line while it runs and the
// "What I checked" list afterwards. Every figure is read from the tool's own output.

type Part = InvestigatorUIMessage["parts"][number];

const metricName = (id: unknown) => (typeof id === "string" && id in METRICS ? midSentence(METRICS[id as keyof typeof METRICS].label) : "the metric");

const money = (unit: string, v: number) => (unit === "inr" ? inr(v) : unit === "pct" ? `${v.toFixed(1)}%` : unit === "days" ? `${v.toFixed(1)} days` : String(Math.round(v)));

export function toolRunningLabel(part: Part): string | null {
  if (!isToolUIPart(part)) return null;
  const name = getToolName(part);
  const input = part.state === "input-streaming" ? undefined : (part.input as Record<string, unknown> | undefined);
  switch (name) {
    case "compareWindows":
      return `Comparing ${metricName(input?.metric)} across the last two 14-day windows…`;
    case "walkCausalGraph":
      return `Walking the causal graph upstream of ${metricName(input?.target)}…`;
    case "getMetricSeries":
      return `Reading ${metricName(input?.metric)} day by day…`;
    case "listRecords":
      return `Reading ${String(input?.kind ?? "")} records…`;
    case "getRecord":
      return "Opening a record…";
    case "runSimulation":
      return "Running the simulator…";
    case "getFindings":
      return "Reading this morning's findings…";
    default:
      return "Working…";
  }
}

/** What a finished tool call established, as one sentence. */
export function toolDoneLabel(part: Part): string | null {
  if (!isToolUIPart(part) || part.state !== "output-available") return null;
  const name = getToolName(part);
  const out = part.output as Record<string, unknown>;
  switch (name) {
    case "compareWindows": {
      const o = out as { label: string; unit: string; current: number; previous: number; deltaPct: number };
      return `Compared ${o.label.toLowerCase()}: ${money(o.unit, o.current)} in the last 14 days against ${money(o.unit, o.previous)} before (${pct(o.deltaPct)}).`;
    }
    case "walkCausalGraph": {
      const o = out as { target: string; nodes: { onset: string | null }[]; branches: unknown[] };
      const dated = o.nodes.filter((n) => n.onset).length;
      return `Walked the causal graph upstream of ${metricName(o.target)}: ${o.nodes.length} metrics moved together, ${dated} with a dated onset${o.branches.length ? `, and ${o.branches.length} contributing branch` : ""}.`;
    }
    case "getMetricSeries": {
      const o = out as { label: string; series: number[]; onset: string | null };
      return `Read ${o.label.toLowerCase()} for ${o.series.length} days${o.onset ? `, change dated ${o.onset}` : ""}.`;
    }
    case "listRecords": {
      const o = out as { kind: string; count: number; records: unknown[] };
      return `Read ${o.records.length} of ${o.count} ${o.kind} records.`;
    }
    case "getRecord": {
      const o = out as { ref: { kind: string; id: string }; record: unknown };
      return o.record ? `Opened ${o.ref.kind} ${o.ref.id}.` : `Looked for ${o.ref.kind} ${o.ref.id}; not in the synced data.`;
    }
    case "runSimulation": {
      const o = out as { scenario: { outcome: { profit: number } }; base: { outcome: { profit: number } } };
      return `Ran the simulator: profit ${inr(o.scenario.outcome.profit)} against ${inr(o.base.outcome.profit)} base.`;
    }
    case "getFindings": {
      const o = out as { findings: unknown[]; total: number };
      return `Ran the detectors: ${o.findings.length} findings worth ${inr(o.total)}.`;
    }
    default:
      return `Ran ${name}.`;
  }
}
