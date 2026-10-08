import type { Finding, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { inrCompact } from "@/lib/format";
import { dayIndex, dayOf, hoursBetween, nowAt } from "../windows";
import { series } from "../metrics";
import { finding, recordSeries, ref, type DetectorCtx } from "./shared";

/** Wholesale leads worth ₹10k or more, quoted, with no contact for 48 hours and not lost. */
export function staleHighValueLeads(world: World, ctx: DetectorCtx): Finding[] {
  const at = nowAt(world);
  const stale = world.leads
    .filter((l) => l.stage === "quoted" && l.estValueINR >= THRESHOLDS.leadMinValueINR && hoursBetween(l.lastContactedAt, at) >= THRESHOLDS.leadStaleHours)
    .sort((a, b) => b.estValueINR - a.estValueINR);
  if (!stale.length) return [];
  const quoted = stale.reduce((s, l) => s + l.estValueINR, 0);
  const winRate = leadWinRate(world);
  const impact = quoted * winRate;
  // Since when: the day the first of them crossed 48 hours without a reply.
  const crossedDay = (l: (typeof stale)[number]) => dayIndex(world, l.lastContactedAt) + 2;
  const onsetDay = Math.min(...stale.map(crossedDay));
  const onset = dayOf(world, Math.min(onsetDay, dayIndex(world, ctx.now)));
  const seriesPts = recordSeries(world, ctx.now, onset, (d) => stale.filter((l) => crossedDay(l) <= d).length);
  const oldestHours = Math.max(...stale.map((l) => hoursBetween(l.lastContactedAt, at)));
  const evidence = [
    ...stale.map((l) => ref(l.source, "lead", l.id)),
    ...stale.map((l) => l.thread[l.thread.length - 1]),
  ];
  return [
    finding({
      detector: "staleHighValueLeads",
      aggregate: true,
      severity: "high",
      title: `${stale.length} wholesale leads worth ${inrCompact(quoted)} have gone quiet`,
      impactINR: impact,
      confidence: 0.9,
      window: { from: dayOf(world, Math.max(0, dayIndex(world, ctx.now) - 27)), to: ctx.now },
      onset,
      series: seriesPts,
      evidence,
      explain: `${stale.length} quoted leads totalling ${inrCompact(quoted)} have had no reply for ${Math.round(Math.min(...stale.map((l) => hoursBetween(l.lastContactedAt, at))))} to ${Math.round(oldestHours)} hours, and each thread ends with the buyer asking a question. About ${Math.round(winRate * 100)}% of quotes like these are won, so about ${inrCompact(impact)} is at stake.`,
      playbooks: ["followUpLeads"],
    }),
  ];
}

/** Share of quoted leads that close, from the world's own decided leads; the rule's fallback when too few. */
export function leadWinRate(world: World): number {
  const decided = world.leads.filter((l) => l.quotedAt && (l.stage === "won" || l.stage === "lost"));
  if (decided.length < 10) return THRESHOLDS.leadWinRateFallback;
  const won = decided.filter((l) => l.stage === "won").length;
  return Math.round((won / decided.length) * 100) / 100;
}

export { series };
