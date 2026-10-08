"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MetricId, World } from "@/types";
import { compareWindows, EDGES, METRICS, series } from "@/engine";
import { linePath, makeScales } from "@/components/chain/axis";
import { Delta } from "@/components/primitives";
import { count, days, inr, pct, shortDate } from "@/lib/format";
import { dayOf } from "@/engine/windows";
import { cn } from "@/lib/utils";

// The metric graph (DESIGN.md, Vault): the hand-authored causal graph as a static diagram, laid
// out left to right by distance from cash. Each node is a button that opens the metric's 90-day
// series under the diagram. Nothing here animates; it is a diagram, not a moment.

const NODE_W = 108;
const NODE_H = 36;
const COL_GAP = 32;
const ROW_GAP = 14;
const PAD = 4;

type Node = { id: MetricId; col: number; row: number; x: number; y: number };

export function GraphExplorer({ world, className }: { world: World; className?: string }) {
  const layout = useMemo(() => layoutGraph(), []);
  const [selected, setSelected] = useState<MetricId>("revenue");
  const at = (id: MetricId) => layout.nodes.find((n) => n.id === id)!;
  // On a narrow screen the diagram scrolls sideways; keep the picked node in view and say so.
  const scroller = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const wide = el.scrollWidth > el.clientWidth + 1;
    setOverflows(wide);
    if (!wide) return;
    const n = at(selected);
    el.scrollTo({ left: n.x + NODE_W / 2 - el.clientWidth / 2, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  return (
    <section aria-labelledby="graph-h" className={className}>
      <h2 id="graph-h" className="t-section text-ink">
        Metric graph
      </h2>
      <p className="mt-1 t-caption text-ink-2">The causes Munshi walks when it explains a change. An arrow reads “moves”; a dashed red one reads “moves the other way”. Pick a metric to see its last 90 days.</p>
      <div className="mt-3 rounded-[12px] border border-rule bg-surface p-4 md:p-6">
        <div ref={scroller} className="overflow-x-auto">
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden>
              <defs>
                <marker id="graph-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0 0.5 L7 4 L0 7.5" fill="none" stroke="context-stroke" strokeWidth={1} />
                </marker>
              </defs>
              {EDGES.map((e) => {
                const a = at(e.from);
                const b = at(e.to);
                const x1 = a.x + NODE_W;
                const y1 = a.y + NODE_H / 2;
                const x2 = b.x - 1;
                const y2 = b.y + NODE_H / 2;
                const c = (x2 - x1) / 2;
                return <path key={`${e.from}-${e.to}`} d={`M${x1} ${y1} C${x1 + c} ${y1} ${x2 - c} ${y2} ${x2} ${y2}`} fill="none" stroke={e.sign < 0 ? "var(--debit)" : "var(--rule-strong)"} strokeWidth={1} strokeDasharray={e.sign < 0 ? "3 3" : undefined} markerEnd="url(#graph-arrow)" />;
              })}
            </svg>
            {layout.nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelected(n.id)}
                aria-pressed={selected === n.id}
                className={cn(
                  "pressable absolute flex items-center justify-center rounded-[8px] border px-2 t-caption leading-tight font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel",
                  selected === n.id ? "border-neel bg-neel-soft text-neel" : "border-rule-strong bg-surface text-ink hover:bg-wash",
                )}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
              >
                {METRICS[n.id].label}
              </button>
            ))}
          </div>
        </div>
        {overflows ? <p className="mt-2 t-caption text-ink-3">Scroll sideways for the rest of the graph.</p> : null}
        <SeriesPanel world={world} metric={selected} />
      </div>
    </section>
  );
}

function SeriesPanel({ world, metric }: { world: World; metric: MetricId }) {
  const meta = METRICS[metric];
  const values = series(world, metric);
  const cmp = compareWindows(world, metric);
  const W = 640;
  const H = 72;
  const s = makeScales(values, W, H, { padX: 1, padY: 4 });
  const fmt = (v: number) => (meta.unit === "inr" ? inr(Math.round(v)) : meta.unit === "pct" ? pct(v, { signed: false, decimals: 1 }) : meta.unit === "days" ? days(v) : count(Math.round(v)));
  const first = dayOf(world, 0);
  const last = dayOf(world, values.length - 1);
  return (
    <figure className="mt-6 border-t border-rule pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <figcaption className="t-ui font-medium text-ink">
          {meta.label}
          <span className="ml-2 font-normal text-ink-2">last 90 days</span>
        </figcaption>
        <p className="t-ui text-ink tabular-nums">
          {fmt(cmp.current)} <span className="t-caption text-ink-2">in the last 14 days</span> <Delta value={cmp.deltaPct} goodWhen={meta.goodWhen} className="ml-1" />
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 block h-auto w-full text-ink" role="img" aria-label={`${meta.label}, daily, from ${shortDate(first)} to ${shortDate(last)}. ${fmt(cmp.current)} in the last 14 days against ${fmt(cmp.previous)} before.`}>
        <path d={linePath(values, s)} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between t-caption text-ink-3 tabular-nums">
        <span>{shortDate(first)}</span>
        <span>{shortDate(last)}</span>
      </div>
    </figure>
  );
}

/** Columns by longest path to the sink (cash), rows by the mean row of each node's parents. */
function layoutGraph(): { nodes: Node[]; width: number; height: number } {
  const ids = Array.from(new Set(EDGES.flatMap((e) => [e.from, e.to])));
  const depth = new Map<MetricId, number>();
  const toSink = (id: MetricId): number => {
    const hit = depth.get(id);
    if (hit !== undefined) return hit;
    const out = EDGES.filter((e) => e.from === id);
    const d = out.length ? 1 + Math.max(...out.map((e) => toSink(e.to))) : 0;
    depth.set(id, d);
    return d;
  };
  const maxDepth = Math.max(...ids.map(toSink));
  const cols: MetricId[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const id of ids) cols[maxDepth - toSink(id)].push(id);
  const row = new Map<MetricId, number>();
  cols.forEach((col, c) => {
    const key = (id: MetricId) => {
      const parents = EDGES.filter((e) => e.to === id && row.has(e.from)).map((e) => row.get(e.from)!);
      return parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : c === 0 ? ids.indexOf(id) : 99;
    };
    col.sort((a, b) => key(a) - key(b) || a.localeCompare(b));
    col.forEach((id, r) => row.set(id, r));
  });
  const tallest = Math.max(...cols.map((c) => c.length));
  const nodes: Node[] = cols.flatMap((col, c) =>
    col.map((id, r) => {
      // Centre short columns against the tallest one.
      const offset = ((tallest - col.length) * (NODE_H + ROW_GAP)) / 2;
      return { id, col: c, row: r, x: PAD + c * (NODE_W + COL_GAP), y: PAD + offset + r * (NODE_H + ROW_GAP) };
    }),
  );
  return { nodes, width: PAD * 2 + cols.length * NODE_W + (cols.length - 1) * COL_GAP, height: PAD * 2 + tallest * NODE_H + (tallest - 1) * ROW_GAP };
}
