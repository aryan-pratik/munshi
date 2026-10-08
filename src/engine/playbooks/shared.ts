import type { Draft, Effect, Finding, PlaybookId, DetectorId, RecordRef, Step, World } from "@/types";
import { addDays, now, nowAt, weekday } from "../windows";

export type Labels = { review: string; approve: string; working: string; done: string };

export type Playbook = {
  id: PlaybookId;
  appliesTo: DetectorId[];
  plan(world: World, finding: Finding): Step[];
  drafts(world: World, finding: Finding): Draft[];
  apply(world: World, finding: Finding, approved: Draft[]): Effect[];
  expectedImpact(world: World, finding: Finding): { inr: number; horizonDays: number; basis: string };
  labels(n: number): Labels;
};

export const step = (id: string, kind: Step["kind"], label: string): Step => ({ id, kind, label });

/** The coming Friday (today if today is Friday) as an ISO date: when Munshi checks back. */
export function nextFriday(world: World): string {
  const today = now(world);
  const wd = weekday(today); // 0 = Sunday
  const ahead = (5 - wd + 7) % 7;
  return addDays(today, ahead);
}

export function taskRecord(world: World, id: string, title: string, dueDate: string, refs: RecordRef[], source: RecordRef["source"] = "calendar") {
  return { id, source, createdAt: nowAt(world), title, dueDate, status: "open" as const, refs };
}

export function refsOf(finding: Finding, kind: RecordRef["kind"]): RecordRef[] {
  return finding.evidence.filter((e) => e.kind === kind);
}

export const first = (name: string) => name.split(" ")[0];

/** Indian grouping without the rupee sign, for inside a sentence that already carries ₹. */
export const num = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

export const dmy = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
};

/** Shared singular and plural for a count, "7 drafts" / "1 draft". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
