import type { Window, World } from "@/types";

// Date maths for the engine. Time comes only from the seed: `now(world)` is day0 + (days - 1).
// Dates are compared by their `YYYY-MM-DD` prefix, so no timezone is ever involved.

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of an ISO string. */
export function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

function utc(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Add days to a `YYYY-MM-DD` date. */
export function addDays(day: string, n: number): string {
  return new Date(utc(isoDay(day)) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(isoDay(b)) - utc(isoDay(a))) / DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday, by the date part. */
export function weekday(day: string): number {
  return new Date(utc(isoDay(day))).getUTCDay();
}

/** The last day of the world: day0 + (days - 1), day 89 on the 90-day seed. */
export function now(world: World): string {
  return addDays(world.meta.day0, world.meta.days - 1);
}

/** Day offset of an ISO date from `meta.day0`. */
export function dayIndex(world: World, iso: string): number {
  return daysBetween(world.meta.day0, iso);
}

/** ISO date of day `d`. */
export function dayOf(world: World, d: number): string {
  return addDays(world.meta.day0, d);
}

/** Inclusive window of `days` days ending at `to`. */
export function windowEnding(to: string, days: number): Window {
  return { from: addDays(to, -(days - 1)), to: isoDay(to) };
}

/** The default comparison: last 14 days and the 14 before them. */
export function defaultWindows(world: World): { current: Window; previous: Window } {
  const current = windowEnding(now(world), 14);
  const previous = windowEnding(addDays(current.from, -1), 14);
  return { current, previous };
}

export function windowLength(w: Window): number {
  return daysBetween(w.from, w.to) + 1;
}

export function inWindow(iso: string, w: Window): boolean {
  const d = isoDay(iso);
  return d >= w.from && d <= w.to;
}

/** The engine's reference instant on the last day: 18:00 IST, when the owner opens Munshi's evening view. */
export function nowAt(world: World): string {
  return `${now(world)}T18:00:00+05:30`;
}

/** Hours from `a` to `b` for full ISO datetimes (dates count from 00:00 IST). */
export function hoursBetween(a: string, b: string): number {
  const t = (s: string) => Date.parse(s.length === 10 ? `${s}T00:00:00+05:30` : s);
  return (t(b) - t(a)) / 3_600_000;
}
