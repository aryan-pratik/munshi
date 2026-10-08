import type { Levers, World } from "@/types";
import { inr } from "@/lib/format";
import { baseInputs, riskOf, riskScoreOf, run, simulate } from "./model";

// Exhaustive grid of 1,800 scenarios (docs/ENGINE.md, section 4.5): objective profit minus a
// risk penalty. Runs in well under 50 ms; the UI animates the count anyway.

export const GRID = {
  pricePct: [-5, 0, 5, 10, 15],
  marketingPct: [-25, 0, 25, 50, 75, 100],
  hires: [0, 1, 2, 3, 4],
  inventoryPct: [0, 20, 40],
  followUpHours: [48, 24, 12, 4] as const,
};

const PENALTY = { low: 0, medium: 25_000, high: 60_000 } as const;

export type ScanPoint = { levers: Levers; profit: number; riskScore: number; revenue: number; objective: number };
export type Strategy = ScanPoint & { reason: string };
export type Optimization = { scanned: number; all: ScanPoint[]; pareto: ScanPoint[]; top3: Strategy[]; base: ScanPoint };

const cache = new WeakMap<World, Optimization>();

export function optimize(world: World): Optimization {
  const hit = cache.get(world);
  if (hit) return hit;
  const b = baseInputs(world);
  const all: ScanPoint[] = [];
  for (const pricePct of GRID.pricePct)
    for (const marketingPct of GRID.marketingPct)
      for (const hires of GRID.hires)
        for (const inventoryPct of GRID.inventoryPct)
          for (const followUpHours of GRID.followUpHours) {
            const levers: Levers = { pricePct, marketingPct, hires, inventoryPct, followUpHours };
            const d = run(b, levers);
            const riskScore = riskScoreOf(d);
            const objective = d.profit - PENALTY[riskOf(riskScore)];
            all.push({ levers, profit: Math.round(d.profit), riskScore, revenue: Math.round(d.revenue), objective: Math.round(objective) });
          }
  const base = all.find((p) => p.levers.pricePct === 0 && p.levers.marketingPct === 0 && p.levers.hires === 0 && p.levers.inventoryPct === 0 && p.levers.followUpHours === 48)!;
  const ranked = [...all].sort((a, c) => c.objective - a.objective || c.profit - a.profit);
  // Pareto front: no other point has both higher profit and lower or equal risk
  const pareto = all.filter((p) => !all.some((q) => q.profit > p.profit && q.riskScore <= p.riskScore)).sort((a, c) => a.riskScore - c.riskScore || c.profit - a.profit);
  const top3 = ranked.slice(0, 3).map((p) => ({ ...p, reason: reasonFor(world, p, base) }));
  const out = { scanned: all.length, all, pareto, top3, base };
  cache.set(world, out);
  return out;
}

function reasonFor(world: World, p: ScanPoint, base: ScanPoint): string {
  const s = simulate(world, p.levers);
  const lift = base.profit ? Math.round(((p.profit - base.profit) / base.profit) * 100) : 0;
  const parts: string[] = [];
  if (p.levers.hires > 0) parts.push(`${p.levers.hires} hire${p.levers.hires > 1 ? "s" : ""} lifts the capacity ceiling`);
  if (p.levers.marketingPct > 0) parts.push(`${p.levers.marketingPct}% more marketing fills it`);
  if (p.levers.pricePct > 0) parts.push(`+${p.levers.pricePct}% price holds margin`);
  if (p.levers.followUpHours < 48) parts.push(`${p.levers.followUpHours}h follow-up wins more wholesale`);
  if (p.levers.inventoryPct > 0) parts.push(`+${p.levers.inventoryPct}% stock keeps orders fulfilled`);
  return `${inr(p.profit)} a month (${lift >= 0 ? "+" : ""}${lift}%), ${s.risk} risk: ${parts.join(", ") || "no change"}.`;
}
