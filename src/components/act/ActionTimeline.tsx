"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Action, Finding } from "@/types";
import { playbook } from "@/engine";
import { doneCount } from "@/lib/act";
import { inrCompact } from "@/lib/format";
import { useWorld, useWorldStore } from "@/lib/store/world";

/** "7 follow-ups sent 2 minutes ago. Expected ₹1.1 lakh over 14 days." (docs/TASKS.md, Phase 6). */
export function ActionTimeline({ handled, className }: { handled: { finding: Finding; action: Action }[]; className?: string }) {
  if (!handled.length) return null;
  return (
    <section aria-label="Done today" className={className}>
      <ol className="flex flex-col gap-1">
        {[...handled].reverse().map(({ finding, action }) => (
          <Entry key={action.id} finding={finding} action={action} />
        ))}
      </ol>
    </section>
  );
}

function Entry({ finding, action }: { finding: Finding; action: Action }) {
  const world = useWorld();
  const at = useWorldStore((s) => s.approvedAtMs[action.id]);
  const ago = useAgo(at);
  const pb = playbook(action.playbook);
  const impact = pb.expectedImpact(world, finding);
  return (
    <li className="flex items-start gap-2 t-ui text-ink-2">
      <Check className="mt-0.5 size-4 shrink-0 text-credit" aria-hidden strokeWidth={2} />
      <span>
        <span className="text-ink">{pb.labels(doneCount(action)).done}</span> {ago}. Expected {inrCompact(impact.inr)} over {impact.horizonDays} days.
      </span>
    </li>
  );
}

/** "just now", "2 minutes ago", refreshed every half minute. */
export function useAgo(ms: number | undefined): string {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!ms) return "earlier today";
  const mins = Math.round((Date.now() - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  const h = Math.round(mins / 60);
  return `${h} ${h === 1 ? "hour" : "hours"} ago`;
}
