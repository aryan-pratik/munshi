import { tool } from "ai";
import { z } from "zod";
import type { World } from "@/types";
import { analyze, briefTotal } from "@/engine";
import { worldContext } from "./context";

export const getFindingsInput = z.object({});

/** What the detectors found this morning, ranked, as the Today brief shows it. */
export function getFindings(world: World) {
  const findings = analyze(world);
  return {
    total: briefTotal(findings),
    findings: findings.map((f) => ({
      id: f.id,
      detector: f.detector,
      severity: f.severity,
      group: f.group,
      title: f.title,
      impactINR: f.impactINR,
      exposureINR: f.exposureINR ?? null,
      onset: f.onset,
      explain: f.explain,
      playbooks: f.playbooks,
      evidence: f.evidence.slice(0, 5),
    })),
  };
}

export const getFindingsTool = tool({
  description: "The ranked findings the detectors produced for today, each with its rupee impact, onset date, explanation and evidence refs.",
  inputSchema: getFindingsInput,
  contextSchema: worldContext,
  execute: async (_input, { context }) => getFindings(context.world),
});
