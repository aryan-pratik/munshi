import type { MetricId, RecordRef, Window, World } from "@/types";
import { addDays, dayIndex, daysBetween, weekday } from "../windows";
import { series } from "../metrics";
import { EVENT_ANCHORS } from "./dag";

// When did this series change? (docs/ENGINE.md, section 3.1). Deterministic, no statistics
// library. `null` is an answer: it is drawn as "timing unverified" and never back-filled.

export type OnsetOptions = { stripDays?: number; baselineDays?: number; minAgeDays?: number };

const MIN_SIGMA = 0.015;

/**
 * `series` is the metric's full daily series indexed by day; `window.to` is the last day. The
 * strip is the last `stripDays` days ending there; the baseline is the `baselineDays` before it.
 * Returns the ISO date the change began, or null.
 */
export function detectOnset(values: number[], window: Window & { day0: string }, opts: OnsetOptions = {}): string | null {
  const stripDays = Math.min(62, opts.stripDays ?? 28);
  const baselineDays = opts.baselineDays ?? 28;
  const minAge = opts.minAgeDays ?? 5;
  const end = daysBetween(window.day0, window.to);
  const stripStart = end - stripDays + 1;
  const baseStart = stripStart - baselineDays;
  if (baseStart < 0 || end >= values.length) return null;

  // Weekday pattern from the baseline. Sparse series (under two a day) use the overall mean
  // and an additive scale so that zero days do not blow up the ratio.
  const base = values.slice(baseStart, stripStart);
  const baseMean = mean(base);
  const sparse = baseMean < 2 && Number.isInteger(base[0]) && base.every(Number.isInteger);
  const byWeekday = new Map<number, number[]>();
  for (let d = baseStart; d < stripStart; d++) {
    const wd = weekday(addDays(window.day0, d));
    byWeekday.set(wd, [...(byWeekday.get(wd) ?? []), values[d]]);
  }
  const expected = (d: number) => {
    if (sparse) return baseMean;
    const wd = weekday(addDays(window.day0, d));
    const xs = byWeekday.get(wd);
    const m = xs && xs.length ? mean(xs) : baseMean;
    return m > 0 ? m : baseMean;
  };
  const rel = (d: number) => {
    const e = expected(d);
    if (sparse) return (values[d] - e) / Math.max(1, e);
    return e > 0 ? values[d] / e - 1 : 0;
  };
  const rBase: number[] = [];
  for (let d = baseStart; d < stripStart; d++) rBase.push(rel(d));
  const sigma = Math.max(MIN_SIGMA, sd(rBase));
  // Winsorise one-day spikes to ±3 sigma of the median of the surrounding strip days, so a
  // level shift (the thing we are looking for) is kept and a single outlier is not.
  const raw: number[] = [];
  for (let d = stripStart; d <= end; d++) raw.push(rel(d));
  const r = raw.map((x, i) => {
    const around = raw.filter((_, j) => j !== i && Math.abs(j - i) <= 3);
    const m = median(around);
    return Math.max(m - 3 * sigma, Math.min(m + 3 * sigma, x));
  });

  const half = Math.floor(stripDays / 2);
  const direction = Math.sign(mean(r.slice(stripDays - half)) - mean(r.slice(0, half))) || 1;
  let best: { d: number; z: number; delta: number } | null = null;
  for (let i = 3; i <= stripDays - 5; i++) {
    const before = r.slice(0, i);
    const after = r.slice(i);
    const delta = mean(after) - mean(before);
    const z = (direction * delta) / (sigma * Math.sqrt(1 / before.length + 1 / after.length));
    if (!best || z > best.z) best = { d: i, z, delta };
  }
  if (!best) return null;
  const need = Math.max(0.03, 1.5 * sigma);
  const before = r.slice(0, best.d);
  const after = r.slice(best.d);
  if (direction * best.delta < need) return null;
  if (direction * (median(after) - median(before)) < need) return null;
  if (best.z < 5) return null;
  const onsetDay = stripStart + best.d;
  if (end - onsetDay < minAge) return null;
  return addDays(window.day0, onsetDay);
}

export type Onset = { onset: string | null; onsetEvidence: RecordRef[] };

/** Onset of a metric with the event snap: an anchored event within 2 days pulls the date to itself. */
export function metricOnset(world: World, metric: MetricId, window: Window, opts: OnsetOptions = {}): Onset {
  const values = series(world, metric);
  const found = detectOnset(values, { ...window, day0: world.meta.day0 }, opts);
  return snapToEvent(world, metric, found);
}

export function snapToEvent(world: World, metric: MetricId, found: string | null): Onset {
  if (!found) return { onset: null, onsetEvidence: [] };
  const anchored = world.events.filter((e) => EVENT_ANCHORS[e.kind] === metric);
  let best: (typeof anchored)[number] | null = null;
  for (const e of anchored) {
    const gap = Math.abs(dayIndex(world, e.at) - dayIndex(world, found));
    if (gap <= 2 && (!best || gap < Math.abs(dayIndex(world, best.at) - dayIndex(world, found)))) best = e;
  }
  if (!best) return { onset: found, onsetEvidence: [] };
  return { onset: best.at, onsetEvidence: [{ source: best.source, kind: "event", id: best.id }] };
}

/** Onset of an arbitrary record-derived series, snapped to a vendor event (`plan_upgraded`). */
export function vendorOnset(world: World, vendor: string, found: string | null): Onset {
  if (!found) return { onset: null, onsetEvidence: [] };
  const e = world.events.find((x) => x.kind === "plan_upgraded" && "vendor" in x.anchors && x.anchors.vendor === vendor && Math.abs(dayIndex(world, x.at) - dayIndex(world, found)) <= 2);
  if (!e) return { onset: found, onsetEvidence: [] };
  return { onset: e.at, onsetEvidence: [{ source: e.source, kind: "event", id: e.id }] };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function sd(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
