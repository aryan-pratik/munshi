"use client";

import { useEffect, useRef, useState } from "react";
import type { Horizon } from "@/engine/horizon";
import { areaBelow, lineBelow, linePath, makeScales } from "@/components/chain/axis";
import { Switch } from "@/components/ui/switch";
import { inr, inrCompact, shortDate } from "@/lib/format";
import { usePhone, useReducedMotion, useWidth } from "@/lib/hooks";

// The runway chart (DESIGN.md, Horizon): a 1.5px ink line of projected cash over 30 days, the
// buffer as a dashed rule-strong threshold labelled with its amount, the below-buffer stretch in
// debit-soft with the dipping stretch of the line in debit, a haldi tick on the crossing day, the largest outflows pinned as 6px ink dots with
// a leader and label. The switch adds Munshi's scenario as a neel line: it morphs from the ink
// line in 400ms --ease-in-out and the debit-soft tint swaps in 200ms (DESIGN.md, Functional motion).

const H = 240;
const PAD_X = 8;
const ROW_H = 15; // one label row per pinned outflow, stacked above the plot
const AXIS_H = 20;
const MORPH_MS = 400;

type Props = { horizon: Horizon; collected: boolean; onCollectedChange: (on: boolean) => void };

export function RunwayCurve({ horizon: h, collected, onCollectedChange }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const phone = usePhone();
  const reduced = useReducedMotion();
  const W = Math.max(280, Math.round(width));
  const balances = h.points.map((p) => p.balance);
  const withCollection = h.points.map((p) => p.withCollection);
  const scenario = useMorph(collected ? withCollection : balances, reduced ? 0 : MORPH_MS);
  const pins = pinnedOutflows(h, phone ? 2 : 4);
  const labelsH = pins.length * ROW_H + 10;
  // The axis helper's scales, with the top padding widened for the label rows.
  const base = makeScales(balances, W, H, { padX: PAD_X, padY: 6, include: [h.buffer, ...withCollection] });
  const s = { ...base, y: (v: number) => labelsH + ((base.y(v) - 6) * (H - 6 - labelsH)) / (H - 12) };
  const cross = h.points.findIndex((p) => p.balance < h.buffer);
  const ticks = [0, 10, 20, 30].filter((d) => d < h.points.length);
  // The buffer label sits at whichever end the line is further from the buffer, so neither crosses it.
  const gap = (vals: number[], i: number) => Math.abs(s.y(vals[i]) - s.y(h.buffer));
  const last = balances.length - 1;
  const labelLeft = Math.min(gap(balances, 0), gap(withCollection, 0)) > Math.min(gap(balances, last), gap(withCollection, last));
  const fade = (on: boolean) => ({ opacity: on ? 1 : 0, transition: reduced ? "none" : "opacity 200ms ease" });
  return (
    <figure>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="t-label text-ink-2">Cash, next 30 days</p>
        <Switch checked={collected} onCheckedChange={onCollectedChange} label="Assume overdue invoices are collected" />
      </div>
      <div ref={ref} className="mt-4 w-full">
        {width > 0 ? (
          <svg viewBox={`0 0 ${W} ${H + AXIS_H}`} width={W} height={H + AXIS_H} className="block text-ink" role="img" aria-label={ariaLabel(h, collected)}>
            {/* below-buffer tint: the base projection, then the scenario's, cross-faded */}
            <path d={areaBelow(balances, h.buffer, s)} fill="var(--debit-soft)" style={fade(!collected)} />
            <path d={areaBelow(withCollection, h.buffer, s)} fill="var(--debit-soft)" style={fade(collected)} />
            {/* buffer */}
            <line x1={PAD_X} x2={W - PAD_X} y1={s.y(h.buffer)} y2={s.y(h.buffer)} stroke="var(--rule-strong)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={labelLeft ? PAD_X : W - PAD_X} y={s.y(h.buffer) - 5} fontSize={11} fill="var(--ink-3)" textAnchor={labelLeft ? "start" : "end"} paintOrder="stroke" stroke="var(--surface)" strokeWidth={3}>
              {inrCompact(h.buffer)} buffer
            </text>
            {/* crossing day */}
            {cross >= 0 ? <line x1={s.x(cross)} x2={s.x(cross)} y1={labelsH - 6} y2={H} stroke="var(--haldi)" strokeWidth={2} /> : null}
            {/* the projection and the scenario */}
            <path d={linePath(balances, s)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
            {/* the dipping stretch, in debit, so the dip reads at a distance */}
            <path d={lineBelow(balances, h.buffer, s)} fill="none" stroke="var(--debit)" strokeWidth={1.5} strokeLinejoin="round" style={fade(!collected)} />
            <path d={lineBelow(withCollection, h.buffer, s)} fill="none" stroke="var(--debit)" strokeWidth={1.5} strokeLinejoin="round" style={fade(collected)} />
            <path d={linePath(scenario, s)} fill="none" stroke="var(--neel)" strokeWidth={1.5} strokeLinejoin="round" style={{ opacity: collected ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ease ${collected ? "0ms" : `${MORPH_MS}ms`}` }} />
            {/* pinned outflows: every leader first, then every label, so a leader never crosses a label */}
            {pins.map((p, i) => {
              const x = s.x(p.day);
              const y = s.y(balances[p.day]);
              return (
                <g key={`${p.ref.kind}:${p.ref.id}`}>
                  {p.day === cross ? null : <line x1={x} x2={x} y1={y - 3} y2={pinRow(pins.length, i) + 3} stroke="var(--rule-strong)" strokeWidth={1} />}
                  <circle cx={x} cy={y} r={3} fill="currentColor" />
                </g>
              );
            })}
            {pins.map((p, i) => {
              const x = s.x(p.day);
              const text = `${phone ? clip(p.label, 18) : p.label}, ${shortDate(p.date)}, ${inr(-p.amount)}`;
              // Start beside the leader; flip to the left when it would run off the right; otherwise slide it in.
              const est = text.length * 6;
              const fits = x + 4 + est <= W - PAD_X;
              const flip = !fits && x - 4 - est >= PAD_X;
              const tx = fits ? x + 4 : flip ? x - 4 : Math.max(PAD_X, W - PAD_X - est);
              return (
                <text key={`${p.ref.kind}:${p.ref.id}`} x={tx} y={pinRow(pins.length, i)} fontSize={11} fill="var(--ink-2)" textAnchor={flip ? "end" : "start"} paintOrder="stroke" stroke="var(--surface)" strokeWidth={3}>
                  {text}
                </text>
              );
            })}
            {/* date axis */}
            {ticks.map((d) => (
              <text key={d} x={s.x(d)} y={H + 14} fontSize={11} fill="var(--ink-3)" textAnchor={d === 0 ? "start" : d === 30 ? "end" : "middle"}>
                {d === 0 ? "Today" : shortDate(h.points[d].date)}
              </text>
            ))}
          </svg>
        ) : (
          <div style={{ height: H + AXIS_H }} />
        )}
      </div>
      <figcaption className="mt-2 t-caption text-ink-2">
        The ink line is cash as it stands. {collected ? "The blue line assumes the overdue invoices are collected a week from now." : "Turn the switch on to see the overdue invoices collected a week from now."}
      </figcaption>
      <table className="sr-only">
        <caption>Projected cash balance by day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Balance</th>
            <th scope="col">If overdue invoices are collected</th>
          </tr>
        </thead>
        <tbody>
          {h.points
            .filter((_, i) => i % 5 === 0 || i === h.points.length - 1)
            .map((p) => (
              <tr key={p.day}>
                <td>{shortDate(p.date)}</td>
                <td>{inr(p.balance)}</td>
                <td>{inr(p.withCollection)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </figure>
  );
}

function ariaLabel(h: Horizon, collected: boolean): string {
  const base = h.dip ? `Cash dips ${inr(h.dip.shortfall)} under the ${inrCompact(h.buffer)} buffer on ${shortDate(h.dip.date)}.` : `Cash stays above the ${inrCompact(h.buffer)} buffer for 30 days.`;
  const alt = h.dipWithCollection ? `still dips ${inr(h.dipWithCollection.shortfall)} on ${shortDate(h.dipWithCollection.date)}` : "stays above the buffer";
  return `${base}${collected ? ` With the overdue invoices collected it ${alt}.` : ""}`;
}

/** The earliest outflow takes the lowest label row, so no leader passes through another label. */
function pinRow(n: number, i: number): number {
  return ROW_H * (n - 1 - i) + 11;
}

/** Shortens a label at a word boundary, so it never ends mid-word. */
function clip(text: string, n: number): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > n / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The largest known outflows, one per day, for the pins. */
function pinnedOutflows(h: Horizon, n: number) {
  const seen = new Set<number>();
  return h.upcoming
    .filter((u) => u.amount < 0 && u.certainty === "known")
    .sort((a, b) => a.amount - b.amount)
    .filter((u) => (seen.has(u.day) ? false : (seen.add(u.day), true)))
    .slice(0, n)
    .sort((a, b) => a.day - b.day);
}

/** Interpolates from the current values to `target` over `ms` with the in-out ease; instant when ms is 0. */
function useMorph(target: number[], ms: number): number[] {
  const [values, setValues] = useState(target);
  const from = useRef(target);
  const key = target.join(",");
  useEffect(() => {
    const start = from.current;
    if (!ms || start.length !== target.length) {
      from.current = target;
      setValues(target);
      return;
    }
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      t0 ??= t;
      const k = easeInOut(Math.min(1, (t - t0) / ms));
      const next = target.map((v, i) => start[i] + (v - start[i]) * k);
      from.current = next;
      setValues(next);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);
  return values;
}

/** cubic-bezier(0.77, 0, 0.175, 1), the --ease-in-out token, as a close polynomial. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
