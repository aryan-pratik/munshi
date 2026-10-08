import type { DetectorId, Finding, PlaybookId, RecordRef, Severity, Window, World } from "@/types";
import { inr } from "@/lib/format";
import { defaultWindows, dayIndex, dayOf, now, windowEnding } from "../windows";

export type DetectorCtx = {
  now: string;
  windows: { current: Window; previous: Window };
};

export type Detector = (world: World, ctx: DetectorCtx) => Finding[];

export function ctxFor(world: World): DetectorCtx {
  return { now: now(world), windows: defaultWindows(world) };
}

export function groupOf(severity: Severity): Finding["group"] {
  return severity === "critical" || severity === "high" ? "needs-you" : "worth-knowing";
}

export const ref = (source: RecordRef["source"], kind: RecordRef["kind"], id: string): RecordRef => ({ source, kind, id });

/** `${detector}:${evidence[0].source}:${evidence[0].kind}:${id}`; aggregate detectors pass `all`. */
export function findingId(detector: DetectorId, primary: RecordRef, aggregate = false): string {
  return `${detector}:${primary.source}:${primary.kind}:${aggregate ? "all" : primary.id}`;
}

type Build = {
  detector: DetectorId;
  severity: Severity;
  title: string;
  impactINR: number;
  exposureINR?: number;
  confidence: number;
  window: Window;
  onset: string | null;
  series: number[];
  evidence: RecordRef[];
  explain: string;
  playbooks: PlaybookId[];
  aggregate?: boolean;
};

export function finding(b: Build): Finding {
  if (!b.evidence.length) throw new Error(`${b.detector}: a finding needs evidence`);
  return {
    id: findingId(b.detector, b.evidence[0], b.aggregate),
    detector: b.detector,
    severity: b.severity,
    group: groupOf(b.severity),
    title: b.title,
    impactINR: Math.max(0, Math.round(b.impactINR)),
    ...(b.exposureINR !== undefined ? { exposureINR: Math.round(b.exposureINR) } : {}),
    confidence: Math.round(b.confidence * 100) / 100,
    window: b.window,
    onset: b.onset,
    series: b.series.map((x) => Math.round(x * 1000) / 1000),
    evidence: b.evidence,
    explain: b.explain,
    playbooks: b.playbooks,
  };
}

/**
 * A record-driven daily series ending at `to`: `valueOn(day)` for the last 28 days, extended back
 * (to at most 90 points) so that `onset` sits inside it.
 */
export function recordSeries(world: World, to: string, onset: string | null, valueOn: (day: number) => number): number[] {
  const end = dayIndex(world, to);
  let start = end - 27;
  if (onset) start = Math.min(start, dayIndex(world, onset) - 3);
  start = Math.max(0, start, end - 89);
  const out: number[] = [];
  for (let d = start; d <= end; d++) out.push(valueOn(d));
  return out;
}

/** A forward-looking series: `valueOn(k)` for k = 0..points-1 days from today. */
export function projectionSeries(points: number, valueOn: (k: number) => number): number[] {
  return Array.from({ length: points }, (_, k) => valueOn(k));
}

export function windowTo(world: World, daysAhead: number): Window {
  const from = now(world);
  return { from, to: dayOf(world, dayIndex(world, from) + daysAhead) };
}

export { inr, windowEnding };
