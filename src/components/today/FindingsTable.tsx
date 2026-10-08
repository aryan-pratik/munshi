"use client";

import { useEffect, useState } from "react";
import type { Action, Finding, World } from "@/types";
import { FindingRow } from "@/components/finding/FindingRow";
import { useWorldStore } from "@/lib/store/world";

type Props = {
  world: World;
  findings: Finding[];
  handled: { finding: Finding; action: Action }[];
};

/** The findings table with its three group header rows (DESIGN.md, Today). */
export function FindingsTable({ world, findings, handled }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const needs = findings.filter((f) => f.group === "needs-you");
  const worth = findings.filter((f) => f.group === "worth-knowing");
  const toggle = (id: string) => setExpanded((e) => (e === id ? null : id));
  return (
    <div className="overflow-hidden rounded-[12px] border border-rule bg-surface">
      <table className="w-full border-collapse max-phone:block [&_tbody]:max-phone:block">
        <thead className="max-phone:hidden">
          <tr className="h-9 border-b border-rule">
            <th scope="col" className="px-4 text-left t-label text-ink-2">Finding</th>
            <th scope="col" className="px-4 text-left t-label text-ink-2">Since</th>
            <th scope="col" className="px-4 text-right t-label text-ink-2">Worth</th>
            <th scope="col" className="px-4 text-right t-label text-ink-2"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          <Group label="Needs you" count={needs.length} />
          {needs.map((f) => (
            <FindingRow key={f.id} world={world} finding={f} expanded={expanded === f.id} onToggle={() => toggle(f.id)} />
          ))}
          <Group label="Worth knowing" count={worth.length} />
          {worth.map((f) => (
            <FindingRow key={f.id} world={world} finding={f} expanded={expanded === f.id} onToggle={() => toggle(f.id)} />
          ))}
          {handled.length ? <Group label="Handled" count={handled.length} /> : null}
          {[...handled].reverse().map(({ finding, action }) => (
            <HandledRow key={action.id} world={world} finding={finding} action={action} expanded={expanded === action.id} onToggle={() => toggle(action.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Group({ label, count }: { label: string; count: number }) {
  return (
    <tr className="border-b border-rule bg-chalk max-phone:block">
      <th scope="colgroup" colSpan={4} className="h-11 px-4 text-left align-middle max-phone:block max-phone:py-3">
        <span className="t-ui font-semibold text-ink">{label}</span>
        <span className="ml-2 t-ui text-ink-2 tabular-nums">{count}</span>
      </th>
    </tr>
  );
}

function HandledRow({ world, finding, action, expanded, onToggle }: { world: World; finding: Finding; action: Action; expanded: boolean; onToggle: () => void }) {
  const at = useWorldStore((s) => s.approvedAtMs[action.id]);
  const label = useAgo(at);
  return <FindingRow world={world} finding={finding} expanded={expanded} onToggle={onToggle} handled={{ label: `Handled ${label}` }} />;
}

/** "just now", "2 minutes ago", refreshed every half minute. */
function useAgo(ms: number | undefined): string {
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
