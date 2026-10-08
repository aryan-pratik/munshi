import type { DetectorId, Finding, World } from "@/types";
import { conversionDrop } from "./conversion";
import { costCreep, zombieSubscription } from "./costs";
import { complaintSpike, deliverySLA } from "./delivery";
import { cashCrunch, customerConcentration, renewalDue } from "./exposure";
import { adEfficiency, stockoutRisk } from "./growth";
import { overdueInvoices } from "./invoices";
import { staleHighValueLeads } from "./leads";
import { ctxFor, type Detector, type DetectorCtx } from "./shared";

export const DETECTORS: Record<DetectorId, Detector> = {
  staleHighValueLeads,
  overdueInvoices,
  conversionDrop,
  complaintSpike,
  costCreep,
  zombieSubscription,
  customerConcentration,
  cashCrunch,
  stockoutRisk,
  adEfficiency,
  renewalDue,
  deliverySLA,
};

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, info: 3 } as const;

const cache = new WeakMap<World, Finding[]>();

/** Every open finding, ranked by impact, then severity, then id; de-duplicated by (detector, primary ref). */
export function analyze(world: World): Finding[] {
  const hit = cache.get(world);
  if (hit) return hit;
  const ctx = ctxFor(world);
  let all: Finding[] = [];
  for (const d of Object.values(DETECTORS)) all.push(...d(world, ctx));
  all = foldSLA(all);
  const seen = new Set<string>();
  all = all.filter((f) => {
    const key = `${f.detector}:${f.evidence[0].source}:${f.evidence[0].kind}:${f.evidence[0].id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  all.sort((a, b) => b.impactINR - a.impactINR || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.id.localeCompare(b.id));
  cache.set(world, all);
  return all;
}

/** deliverySLA does not emit when a complaintSpike exists for the same courier; its evidence folds in. */
function foldSLA(findings: Finding[]): Finding[] {
  const spikes = findings.filter((f) => f.detector === "complaintSpike");
  if (!spikes.length) return findings;
  return findings.filter((f) => {
    if (f.detector !== "deliverySLA") return true;
    const shipments = f.evidence.filter((e) => e.kind === "shipment");
    const spike = spikes.find((s) => s.evidence.some((e) => e.kind === "shipment" && shipments.some((x) => x.id === e.id)) || s.evidence.some((e) => e.kind === "event"));
    if (!spike) return true;
    for (const e of f.evidence) if (!spike.evidence.some((x) => x.kind === e.kind && x.id === e.id)) spike.evidence.push(e);
    return false;
  });
}

/** Sum of impact over open findings, excluding cashCrunch (its shortfall is the overdue invoices counted again). */
export function briefTotal(findings: Finding[]): number {
  return findings.filter((f) => f.detector !== "cashCrunch").reduce((s, f) => s + f.impactINR, 0);
}

export { ctxFor };
export type { DetectorCtx };
