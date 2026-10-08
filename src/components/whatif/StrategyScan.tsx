"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { Levers, World } from "@/types";
import { optimize, type ScanPoint } from "@/engine";
import { Button } from "@/components/ui/button";
import { Delta } from "@/components/primitives";
import { count, inr, inrCompact } from "@/lib/format";
import { useReducedMotion } from "@/lib/hooks";
import { sameLevers, strategySentence } from "@/lib/whatif";
import { cn } from "@/lib/utils";

const W = 320;
const H = 200;
const PAD = { l: 58, r: 10, t: 12, b: 40 };
const TIERS: { at: number; label: string }[] = [
  { at: 0.5, label: "Low" },
  { at: 2, label: "Medium" },
  { at: 4, label: "High" },
];
const BATCHES = 12;
const COUNT_MS = 1200;
const RISK_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

type Props = { world: World; levers: Levers; onApply: (levers: Levers) => void };

/**
 * "Find best strategy" opens the scan in place: the counter (the only animated number in the
 * product), the scatter of every scenario with the Pareto front, then the top three with Apply.
 */
export function StrategyScan({ world, levers, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const result = useMemo(() => (open ? optimize(world) : null), [open, world]);
  const shown = useCount(result?.scanned ?? 0, open && !reduced ? COUNT_MS : 0);
  const [drawn, setDrawn] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    // The scan replaces the button in place; the section scrolls into view so the counter, the
    // scatter and the top three all land on screen together (a browser scroll, not an animation).
    sectionRef.current?.scrollIntoView({ block: "start" });
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) {
    return (
      <div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Find best strategy
        </Button>
      </div>
    );
  }
  if (!result) return null;
  const best = result.top3[0];
  return (
    <section ref={sectionRef} aria-label="Best strategies" className={cn("scan flex scroll-mt-20 flex-col gap-6", drawn && "is-drawn", reduced && "no-anim")}>
      <p className="t-section text-ink">
        <span className="tabular-nums" aria-hidden>
          {count(shown)}
        </span>
        <span className="sr-only" aria-live="polite">
          {shown === result.scanned ? count(result.scanned) : ""}
        </span>{" "}
        scenarios checked
      </p>
      <Scatter all={result.all} pareto={result.pareto} best={best} />
      <table className="w-full border-collapse">
        <caption className="sr-only">Top three strategies by profit after the risk penalty</caption>
        <thead>
          <tr className="t-label text-ink-2">
            <th scope="col" className="h-9 border-b border-rule text-left font-medium">
              Strategy
            </th>
            <th scope="col" className="h-9 border-b border-rule text-right font-medium">
              Profit
            </th>
            <th scope="col" className="h-9 border-b border-rule pl-3 text-left font-medium phone:table-cell hidden">
              Risk
            </th>
            <th scope="col" className="h-9 border-b border-rule">
              <span className="sr-only">Apply</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {result.top3.map((s, i) => {
            const applied = sameLevers(levers, s.levers);
            const risk = riskOf(s.riskScore);
            const lift = result.base.profit ? ((s.profit - result.base.profit) / Math.abs(result.base.profit)) * 100 : 0;
            return (
              <tr key={i} className="border-b border-rule align-top">
                <th scope="row" className="py-3 pr-4 text-left font-normal">
                  <span className="block t-ui text-ink">{strategySentence(s.levers)}</span>
                  <span className="mt-0.5 block t-caption text-ink-2">
                    {why(s.reason)}
                    <span className="phone:hidden"> Risk {RISK_LABEL[risk].toLowerCase()}.</span>
                  </span>
                </th>
                <td className="py-3 pl-4 text-right t-ui text-ink tabular-nums whitespace-nowrap">
                  {inr(s.profit)}
                  <Delta value={lift} goodWhen="up" className="ml-2" />
                </td>
                <td className="hidden py-3 pl-4 t-ui text-ink phone:table-cell">{RISK_LABEL[risk]}</td>
                <td className="py-2 pl-4 text-right" aria-live="polite">
                  {applied ? (
                    <span className="inline-flex h-7 items-center gap-1 t-caption font-medium text-ink-2">
                      <Check className="size-3.5 text-credit" aria-hidden strokeWidth={2} />
                      Applied
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => onApply(s.levers)}>
                      Apply
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** The engine's reason reads "₹2,33,608 a month (+45%), low risk: 1 hire lifts…"; the row already shows the figure and the risk, so the caption keeps the clause after the colon. */
function why(reason: string): string {
  const i = reason.indexOf(": ");
  const tail = i >= 0 ? reason.slice(i + 2) : reason;
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

function riskOf(score: number): "low" | "medium" | "high" {
  return score <= 1 ? "low" : score === 2 ? "medium" : "high";
}

/** Counts 0 to `target` at a constant rate over `ms`, linear (DESIGN.md, Scan counter). */
function useCount(target: number, ms: number): number {
  const [n, setN] = useState(ms ? 0 : target);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    if (!ms || !target) {
      setN(target);
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      start.current ??= t;
      const k = Math.min(1, (t - start.current) / ms);
      setN(Math.round(k * target));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

/** 320 by 200: every scenario as a 3px ink-3 dot, the Pareto front in neel, the best ringed in haldi. */
const Scatter = memo(function Scatter({ all, pareto, best }: { all: ScanPoint[]; pareto: ScanPoint[]; best: ScanPoint }) {
  const profits = all.map((p) => p.profit);
  const lo = Math.min(...profits);
  const hi = Math.max(...profits);
  // Half a step of room at each end keeps the jittered risk-0 column off the y axis.
  const x = scaleLinear().domain([-0.5, 5.5]).range([PAD.l, W - PAD.r]);
  const y = scaleLinear().domain([lo, hi]).nice().range([H - PAD.b, PAD.t]);
  const batches = useMemo(() => {
    // Contiguous slices, so the chart visibly accumulates over the count instead of reading complete at the first batch.
    const out: ScanPoint[][] = Array.from({ length: BATCHES }, () => []);
    all.forEach((p, i) => out[Math.min(BATCHES - 1, Math.floor((i * BATCHES) / all.length))].push(p));
    return out;
  }, [all]);
  const front = line<ScanPoint>()
    .x((p) => x(p.riskScore))
    .y((p) => y(p.profit))(pareto);
  const [y0, y1] = y.domain();
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full max-w-[320px]" role="img" aria-label={`${count(all.length)} scenarios by risk score and monthly profit; the best is ${inr(best.profit)} at risk score ${best.riskScore}.`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--rule)" strokeWidth={1} />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="var(--rule)" strokeWidth={1} />
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <text key={r} x={x(r)} y={H - PAD.b + 14} fontSize={11} fill="var(--ink-3)" textAnchor="middle">
            {r}
          </text>
        ))}
        {TIERS.map((t) => (
          <text key={t.label} x={x(t.at)} y={H - PAD.b + 28} fontSize={11} fill="var(--ink-3)" textAnchor="middle">
            {t.label}
          </text>
        ))}
        {[y0, y1].map((v) => (
          <text key={v} x={PAD.l - 6} y={y(v) + 4} fontSize={11} fill="var(--ink-3)" textAnchor="end">
            {inrCompact(v)}
          </text>
        ))}
        {batches.map((batch, b) => (
          <g key={b} className="scan-batch" style={{ "--d": `${(b * COUNT_MS) / BATCHES}ms` } as React.CSSProperties}>
            {batch.map((p, i) => (
              <circle key={i} cx={x(p.riskScore) + jitter(b, i)} cy={y(p.profit)} r={1.5} fill="var(--ink-3)" fillOpacity={0.6} />
            ))}
          </g>
        ))}
        <g className="scan-batch" style={{ "--d": `${COUNT_MS}ms` } as React.CSSProperties}>
          <path d={front ?? ""} fill="none" stroke="var(--neel)" strokeWidth={1} />
          {pareto.map((p, i) => (
            <circle key={i} cx={x(p.riskScore)} cy={y(p.profit)} r={2} fill="var(--neel)" />
          ))}
          <circle cx={x(best.riskScore)} cy={y(best.profit)} r={5} fill="none" stroke="var(--haldi)" strokeWidth={2} />
        </g>
      </svg>
      <figcaption className="mt-2 t-caption text-ink-2">Every scenario by risk score (0 to 5) and profit a month. The front in blue is where no safer scenario earns more; the ring marks the best.</figcaption>
    </figure>
  );
});

/** Spreads the dots of one risk score across its column so 1,800 points do not stack into six lines. */
function jitter(batch: number, i: number): number {
  const k = ((batch * 31 + i * 17) % 23) / 22; // deterministic, 0..1
  return (k - 0.5) * 22;
}
