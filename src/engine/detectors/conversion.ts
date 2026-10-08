import type { Finding, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { inrCompact, pct, shortDate } from "@/lib/format";
import { addDays, dayIndex, inWindow } from "../windows";
import { compareWindows, metricSeries, stripSeries, windowPerDay, windowValue } from "../metrics";
import { metricOnset } from "../graph/onset";
import { finding, ref, type DetectorCtx } from "./shared";

/** Landing conversion (or lead conversion) down 15% or more against the previous window. */
export function conversionDrop(world: World, ctx: DetectorCtx): Finding[] {
  const out: Finding[] = [];
  const { current, previous } = ctx.windows;

  const landing = compareWindows(world, "landingCvr", ctx.windows);
  if (landing.previous > 0 && landing.deltaPct <= THRESHOLDS.conversionDropPct) {
    const { onset, onsetEvidence } = metricOnset(world, "landingCvr", current);
    // Lost orders per day at the level since the change (the window mean still carries the days before it).
    const since = onset ? { from: onset, to: current.to } : current;
    const cvrSince = windowValue(world, "landingCvr", since) / 100;
    const landingSessionsPerDay = windowPerDay(world, "sessions", current) * landingShare(world, current);
    const lostPerDay = Math.max(0, landing.previous / 100 - cvrSince) * landingSessionsPerDay;
    const aov = windowValue(world, "aov", current) || 1250;
    const d2cAov = d2cOrderValue(world, current) || aov;
    const impact = lostPerDay * 30 * d2cAov;
    const event = onsetEvidence[0] ? world.events.find((e) => e.id === onsetEvidence[0].id) : undefined;
    const evidence = [
      ...onsetEvidence,
      ...world.trafficDays.filter((t) => inWindow(t.date, current)).slice(-3).map((t) => ref(t.source, "trafficDay", t.id)),
      ...world.orders.filter((o) => o.channel === "d2c" && o.viaLanding && inWindow(o.createdAt, current)).slice(-3).map((o) => ref(o.source, "order", o.id)),
    ];
    out.push(
      finding({
        detector: "conversionDrop",
        severity: "high",
        title: `Landing-page conversion fell from ${landing.previous.toFixed(1)}% to ${(cvrSince * 100).toFixed(1)}%${event ? " after the theme update" : ""}`,
        impactINR: impact,
        confidence: onset ? 0.8 : 0.6,
        window: current,
        onset,
        series: stripSeries(world, "landingCvr", current),
        evidence,
        explain: `Sessions that enter on a campaign or collection page convert at ${(cvrSince * 100).toFixed(1)}% now against ${landing.previous.toFixed(1)}% in the previous 14 days (${pct(landing.deltaPct)}).${event ? ` The change began on ${shortDate(event.at)}, the day of the event "${event.label}".` : ""} At about ${Math.round(landingSessionsPerDay)} such sessions a day that is roughly ${lostPerDay.toFixed(1)} orders a day, ${inrCompact(impact)} a month.`,
        playbooks: [],
      }),
    );
  }

  const lead = compareWindows(world, "leadCvr", ctx.windows);
  const decided = (w: typeof current) => {
    const s = metricSeries(world, "leadCvr");
    if (s.kind !== "ratio") return 0;
    const from = dayIndex(world, w.from);
    const to = dayIndex(world, w.to);
    return s.den.slice(Math.max(0, from), to + 1).reduce((a, b) => a + b, 0);
  };
  if (decided(current) >= THRESHOLDS.leadCvrMinDecided && decided(previous) >= THRESHOLDS.leadCvrMinDecided && lead.deltaPct <= THRESHOLDS.conversionDropPct) {
    const { onset, onsetEvidence } = metricOnset(world, "leadCvr", current);
    const quotesPerMonth = (decided(current) / 14) * 30;
    const lostWins = ((lead.previous - lead.current) / 100) * quotesPerMonth;
    const wsAov = wholesaleOrderValue(world, current) || 21600;
    const impact = lostWins * wsAov;
    out.push(
      finding({
        detector: "conversionDrop",
        severity: "high",
        title: `Lead conversion fell from ${lead.previous.toFixed(0)}% to ${lead.current.toFixed(0)}%`,
        impactINR: impact,
        confidence: 0.6,
        window: current,
        onset,
        series: stripSeries(world, "leadCvr", current),
        evidence: [...onsetEvidence, ...world.leads.filter((l) => l.stage === "lost" && inWindow(l.lastInboundAt ?? l.createdAt, current)).slice(0, 5).map((l) => ref(l.source, "lead", l.id))],
        explain: `Of quoted wholesale leads decided in the last 14 days, ${lead.current.toFixed(0)}% were won against ${lead.previous.toFixed(0)}% before. At about ${quotesPerMonth.toFixed(0)} quotes a month that is ${lostWins.toFixed(1)} fewer orders, ${inrCompact(impact)}.`,
        playbooks: ["followUpLeads"],
      }),
    );
  }
  return out;
}

export function landingShare(world: World, w: { from: string; to: string }): number {
  const t = world.trafficDays.filter((x) => inWindow(x.date, w));
  const landing = t.reduce((s, x) => s + x.landingSessions, 0);
  const sessions = windowValue(world, "sessions", w);
  return sessions > 0 ? landing / sessions : 0;
}

export function d2cOrderValue(world: World, w: { from: string; to: string }): number {
  const o = world.orders.filter((x) => x.channel === "d2c" && inWindow(x.createdAt, w));
  return o.length ? o.reduce((s, x) => s + x.total, 0) / o.length : 0;
}

export function wholesaleOrderValue(world: World, w: { from: string; to: string }): number {
  const o = world.orders.filter((x) => x.channel === "wholesale" && inWindow(x.createdAt, w));
  return o.length ? o.reduce((s, x) => s + x.total, 0) / o.length : 0;
}

export { addDays };
