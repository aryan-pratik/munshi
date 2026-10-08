import type { Finding, PlaybookId, RecordRef, World } from "@/types";
import { horizon, playbook } from "@/engine";
import { daysBetween, now } from "@/engine/windows";
import { findRecord } from "@/lib/records";
import { shortDate } from "@/lib/format";
import { SUGGESTED_QUESTIONS, type QuestionId } from "@/data/questions";

// Small readings of a Finding for the Today table. Every value here is one the engine already
// computed (the finding's onset, its projection series, the horizon's dip); nothing is estimated.

export type Since = { text: string; onsetIndex: number | null; forward: boolean };

/** What the Since column says and where the tick goes. */
export function sinceOf(world: World, f: Finding): Since {
  const today = now(world);
  if (f.onset) {
    const idx = f.series.length - 1 - daysBetween(f.onset, f.window.to);
    return { text: shortDate(f.onset), onsetIndex: idx, forward: false };
  }
  switch (f.detector) {
    case "cashCrunch": {
      const dip = horizon(world).dip;
      return { text: dip ? `in ${dip.day} days` : "Within 30 days", onsetIndex: null, forward: true };
    }
    case "stockoutRisk": {
      const k = f.series.findIndex((v) => v <= 0);
      return { text: k > 0 ? `in ${k} days` : k === 0 ? "today" : "Within 30 days", onsetIndex: null, forward: true };
    }
    case "renewalDue": {
      const due = f.evidence
        .filter((e) => e.kind === "obligation")
        .map((e) => findRecord(world, e as RecordRef & { kind: "obligation" })?.dueDate)
        .filter((d): d is string => !!d)
        .sort()[0];
      const k = due ? daysBetween(today, due) : null;
      return { text: k === null ? "Within 3 weeks" : k <= 0 ? "today" : `in ${k} days`, onsetIndex: null, forward: true };
    }
    default: {
      const event = f.evidence.find((e) => e.kind === "event");
      const rec = event ? findRecord(world, event as RecordRef & { kind: "event" }) : undefined;
      return { text: rec ? shortDate(rec.at) : shortDate(f.window.from), onsetIndex: null, forward: false };
    }
  }
}

export type PrimaryAction = { playbook: PlaybookId; n: number; label: string };

/** The finding's first playbook with its review label ("Review 7 drafts"), or null. */
export function primaryAction(world: World, f: Finding): PrimaryAction | null {
  const id = f.playbooks[0];
  if (!id) return null;
  const p = playbook(id);
  const n = p.drafts(world, f).length;
  return { playbook: id, n, label: p.labels(n).review };
}

const ASK_FOR: Partial<Record<Finding["detector"], QuestionId>> = {
  conversionDrop: "why-revenue-fell",
  adEfficiency: "why-revenue-fell",
  complaintSpike: "why-complaints-up",
  customerConcentration: "which-customers-at-risk",
};

/** Where "Ask why" goes for a finding: a recorded question when one fits, else the title as text. */
export function askHref(f: Finding): string {
  const id = ASK_FOR[f.detector];
  const q = id ? SUGGESTED_QUESTIONS.find((s) => s.id === id)?.id ?? f.title : f.title;
  return `/ask?q=${encodeURIComponent(q)}`;
}
