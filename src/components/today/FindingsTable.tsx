"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Action, Finding, World } from "@/types";
import { FindingRow } from "@/components/finding/FindingRow";
import { useWorldStore } from "@/lib/store/world";
import { useAgo } from "@/components/act/ActionTimeline";
import { useReducedMotion } from "@/lib/hooks";

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
  const ref = useRef<HTMLTableElement>(null);
  useRerank(ref, findings.map((f) => f.id).join("|") + "#" + handled.map((h) => h.action.id).join("|"));
  return (
    <div className="overflow-hidden rounded-[12px] border border-rule bg-surface">
      <h2 className="sr-only">Findings</h2>
      <table ref={ref} className="w-full border-collapse max-phone:block [&_tbody]:max-phone:block">
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

/**
 * The re-rank after an approval (DESIGN.md, Today re-rank): rows move to their new places in
 * 260ms ease-in-out, and a row that arrives (the handled one) crossfades in with a 2px blur.
 * A FLIP over the rows' `data-flip` keys, with the Web Animations API; nothing on first paint.
 */
function useRerank(ref: React.RefObject<HTMLTableElement | null>, order: string) {
  const prev = useRef<Map<string, number> | null>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const table = ref.current;
    if (!table) return;
    const rows = Array.from(table.querySelectorAll<HTMLElement>("[data-flip]"));
    const top = table.getBoundingClientRect().top;
    const next = new Map(rows.map((r) => [r.dataset.flip!, r.getBoundingClientRect().top - top]));
    const before = prev.current;
    prev.current = next;
    if (!before || reduced) return;
    for (const r of rows) {
      const key = r.dataset.flip!;
      const was = before.get(key);
      const now = next.get(key)!;
      if (was === undefined) {
        r.animate([{ opacity: 0.7, filter: "blur(2px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 260, easing: "cubic-bezier(0.77, 0, 0.175, 1)" });
      } else if (Math.abs(was - now) > 1) {
        r.animate([{ transform: `translateY(${was - now}px)` }, { transform: "translateY(0)" }], { duration: 260, easing: "cubic-bezier(0.77, 0, 0.175, 1)" });
      }
    }
  }, [ref, order, reduced]);
}
