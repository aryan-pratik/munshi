"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "lucide-react";
import type { Chain, World } from "@/types";
import { METRICS } from "@/engine";
import { addDays, daysBetween } from "@/engine/windows";
import { Chip, Delta } from "@/components/primitives";
import { longDate, midSentence, pct, shortDate } from "@/lib/format";
import { findRecord } from "@/lib/records";
import { usePhone, useReducedMotion, useWidth } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { linePath, makeScales } from "./axis";
import { EvidencePopover } from "./EvidencePopover";
import { CAPTION_H, connectors, drawEnd, flagRows, flagsOf, GAP, HEADER_H, LANE_H, PLOT_H, POINTS, rowTops, STRIP_H, STRIP_H_PHONE, stripsOf, totalHeight, type Strip } from "./trail";

// The signature component (DESIGN.md, OnsetTrail): metric strips stacked on one shared 28-day
// axis, each with the day its change began marked, so the reader sees cause move before effect.
// The draw is the product's one authored moment; a past investigation opens already drawn.

const NAME_W = 168;
const CHANGE_W = 80;
const COL_GAP = 12;

type Props = { world: World; chain: Chain; animate?: boolean; className?: string };

export function OnsetTrail({ world, chain, animate = false, className }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const reduced = useReducedMotion();
  const phoneViewport = usePhone();
  const phone = width > 0 && (phoneViewport || width < 520);
  const { strips, rows } = useMemo(() => stripsOf(chain), [chain]);
  const stripH = phone ? STRIP_H_PHONE : STRIP_H;
  const plotLeft = phone ? 0 : NAME_W + COL_GAP;
  const plotW = Math.max(phone ? width : 280, width - (phone ? 0 : NAME_W + CHANGE_W + 2 * COL_GAP));
  const x = (k: number) => (k / (POINTS - 1)) * (plotW - 2) + 1;
  const to = chain.window.to;
  const flags = useMemo(() => flagsOf(strips), [strips]);
  const placed = useMemo(() => {
    const items = flags
      .map((f) => {
        const ev = findRecord(world, { ...f.ref, kind: "event" });
        const k = ev ? POINTS - 1 - daysBetween(ev.at, to) : -1;
        return ev && k >= 0 && k <= POINTS - 1 ? { flag: f, ev, k } : null;
      })
      .filter((v): v is NonNullable<typeof v> => !!v)
      .sort((a, b) => a.k - b.k);
    const widths = items.map((it) => Math.min(phone ? 150 : 260, it.ev.label.length * 6.6 + 30));
    const rowsOf = flagRows(items.map((it, i) => ({ x: x(it.k), width: widths[i] })));
    return items.map((it, i) => ({ ...it, width: widths[i], row: rowsOf[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, world, to, plotW, phone]);
  const laneRows = Math.max(1, ...placed.map((p) => p.row + 1));
  const laneH = LANE_H * laneRows;
  const tops = useMemo(() => rowTops(rows, stripH, laneH), [rows, stripH, laneH]);
  const height = totalHeight(rows, stripH, laneH);
  const plotTop = (i: number) => (phone ? tops[i] + (STRIP_H_PHONE - PLOT_H) : tops[i] + (STRIP_H - PLOT_H) / 2);
  const stripRow = (s: number) => rows.findIndex((r) => r.kind === "strip" && r.index === s);

  // The draw: one frame after mount so the transitions run from their start values.
  const [drawn, setDrawn] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const [selected, setSelected] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const from = addDays(to, -(POINTS - 1));
  const boundary = x(13.5);
  const ticks = [0, 7, 14, 21, 27];
  const links = useMemo(() => connectors(strips), [strips]);
  const target = METRICS[chain.target];
  const caption = describe(strips, to);

  return (
    <figure ref={ref} className={cn("trail relative rounded-[12px] border border-rule bg-surface p-4 md:p-6", drawn && "is-drawn", (!animate || reduced) && "no-anim", className)} style={{ minHeight: height + 56 }}>
      <div className="relative" style={{ height }}>
        {/* Axis captions in the events lane */}
        <div className="pointer-events-none absolute top-0 t-caption text-ink-3" style={{ left: plotLeft, width: plotW, height: CAPTION_H }} aria-hidden>
          <span className="absolute left-0">Previous 14 days</span>
          <span className="absolute" style={{ left: boundary + 6 }}>
            Last 14 days
          </span>
        </div>
        {/* Rows: the strip buttons and the group header */}
        {rows.map((row, r) =>
          row.kind === "header" ? (
            <div key="header" className="absolute left-0 flex items-end t-label text-ink-2" style={{ top: tops[r], height: HEADER_H }}>
              {row.label}
            </div>
          ) : (
            <StripButton
              key={row.strip.node.metric}
              ref={(el) => {
                buttons.current[row.index] = el;
              }}
              strip={row.strip}
              top={tops[r]}
              height={stripH}
              phone={phone}
              selected={selected === row.index}
              onSelect={() => setSelected((s) => (s === row.index ? null : row.index))}
              windowTo={to}
            />
          ),
        )}
        {/* The plots, ticks, connectors and axis, one SVG over the plot column */}
        <svg className="pointer-events-none absolute top-0 overflow-visible" style={{ left: plotLeft }} width={plotW} height={height} aria-hidden focusable="false">
          <line x1={boundary} x2={boundary} y1={CAPTION_H} y2={height} stroke="var(--rule)" strokeWidth={1} />
          {strips.map((s, i) => {
            const r = stripRow(i);
            const top = plotTop(r);
            const sc = makeScales(s.node.series, plotW, PLOT_H, { padX: 1, padY: PLOT_H * 0.1 });
            const prev = s.node.series.slice(0, 14);
            const cur = s.node.series.slice(13);
            const mean = prev.reduce((a, b) => a + b, 0) / Math.max(1, prev.length);
            const curShift = { ...sc, x: (k: number) => sc.x(k + 13) };
            const style = { "--d": `${s.delay}ms` } as React.CSSProperties;
            const dash = s.unverified ? "4 3" : undefined;
            return (
              <g key={s.node.metric} transform={`translate(0 ${top})`} style={style}>
                <line x1={0} x2={plotW} y1={sc.y(mean)} y2={sc.y(mean)} stroke="var(--rule-strong)" strokeWidth={1} strokeDasharray="1 3" />
                <g className="trail-line">
                  <path d={linePath(prev, sc)} fill="none" stroke="var(--ink-3)" strokeWidth={1} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />
                  <path d={linePath(cur, curShift)} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />
                </g>
                {s.onsetIndex !== null ? (
                  s.unverified ? (
                    <rect className="trail-tick" x={x(s.onsetIndex) - 1} y={0} width={2} height={PLOT_H} fill="none" stroke="var(--haldi)" strokeWidth={1} strokeDasharray="2 2" />
                  ) : (
                    <line className="trail-tick" x1={x(s.onsetIndex)} x2={x(s.onsetIndex)} y1={0} y2={PLOT_H} stroke="var(--haldi)" strokeWidth={2} />
                  )
                ) : null}
                {s.onsetIndex !== null && s.node.onset ? (
                  <text
                    className="trail-date"
                    x={x(s.onsetIndex) + (plotW - x(s.onsetIndex) < 48 ? -4 : 4)}
                    y={phone ? 11 : -3}
                    textAnchor={plotW - x(s.onsetIndex) < 48 ? "end" : "start"}
                    fontSize={12}
                    fill="var(--haldi-ink)"
                    paintOrder="stroke"
                    stroke="var(--surface)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                  >
                    {shortDate(s.node.onset)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {links.map(([a, b]) => {
            const sa = strips[a];
            const sb = strips[b];
            const xa = x(sa.onsetIndex!);
            const xb = x(sb.onsetIndex!);
            const ya = plotTop(stripRow(a)) + PLOT_H;
            const yb = plotTop(stripRow(b));
            // Leaves after the source tick has landed and arrives as the effect strip begins to draw.
            const style = { "--d": `${Math.max(sa.delay, sb.delay - 420)}ms` } as React.CSSProperties;
            return <path key={`${a}-${b}`} className="trail-link" d={elbow(xa, ya, xb, yb)} fill="none" stroke="var(--neel)" strokeWidth={1} pathLength={1} style={style} />;
          })}
          {placed.map((p) => {
            const r = stripRow(p.flag.stripIndex);
            return <line key={p.flag.ref.id} x1={x(p.k)} x2={x(p.k)} y1={CAPTION_H + LANE_H * p.row + 20} y2={plotTop(r)} stroke="var(--ink-3)" strokeWidth={1} strokeOpacity={0.6} />;
          })}
          {ticks.map((k) => (
            <text key={k} x={x(k)} y={height + 14} fontSize={12} fill="var(--ink-3)" textAnchor={k === 0 ? "start" : k === 27 ? "end" : "middle"}>
              {shortDate(addDays(from, k))}
            </text>
          ))}
        </svg>
        {/* Event flags in the lane, as chips so they can carry text */}
        {placed.map((p) => {
          const px = plotLeft + x(p.k);
          const flip = width - px < p.width;
          return (
            <span key={p.flag.ref.id} className="absolute flex" style={{ top: CAPTION_H + LANE_H * p.row, left: flip ? undefined : px - 1, right: flip ? width - px - 1 : undefined, height: LANE_H, maxWidth: p.width }} aria-hidden>
              <Chip className="h-5 max-w-full self-start bg-surface text-ink-2 ring-1 ring-rule [&>span]:truncate">
                <Flag className="size-3 shrink-0 text-haldi" aria-hidden strokeWidth={1.75} />
                <span className="min-w-0 truncate">{p.ev.label}</span>
              </Chip>
            </span>
          );
        })}
      </div>
      <div style={{ height: 20 }} aria-hidden />
      <figcaption className="trail-after mt-2 t-caption text-ink-2" style={{ "--d": `${drawEnd(strips)}ms` } as React.CSSProperties}>
        {caption}
      </figcaption>
      <table className="sr-only">
        <caption>Metrics in the trail, with the day each changed</caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Changed on</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {strips.map((s) => (
            <tr key={s.node.metric}>
              <td>{METRICS[s.node.metric].label}</td>
              <td>{s.node.onset ? longDate(s.node.onset) : "no clear onset"}</td>
              <td>{pct(s.node.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {placed.length ? (
        <ul className="sr-only">
          {placed.map((p) => (
            <li key={p.flag.ref.id}>
              Event: {p.ev.label}, on {longDate(p.ev.at)}, flagged on {METRICS[p.flag.metric].label}.
            </li>
          ))}
        </ul>
      ) : null}
      {selected !== null ? (
        <EvidencePopover
          world={world}
          title={`${METRICS[strips[selected].node.metric].label}, ${strips[selected].node.onset ? `changed ${shortDate(strips[selected].node.onset)}` : "no clear onset"}`}
          refs={[...strips[selected].node.onsetEvidence, ...strips[selected].node.evidence]}
          anchor={buttons.current[selected]}
          open
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
        />
      ) : null}
      <span className="sr-only">{`Trail for ${target.label}.`}</span>
    </figure>
  );
}

type StripButtonProps = {
  strip: Strip;
  top: number;
  height: number;
  phone: boolean;
  selected: boolean;
  onSelect: () => void;
  windowTo: string;
  ref: React.Ref<HTMLButtonElement>;
};

function StripButton({ strip, top, height, phone, selected, onSelect, windowTo, ref }: StripButtonProps) {
  const meta = METRICS[strip.node.metric];
  const d = strip.node.delta;
  const label = `${meta.label}, ${d < 0 ? "down" : "up"} ${Math.abs(Math.round(d))} percent${strip.node.onset ? `, changed on ${longDate(strip.node.onset).replace(/ \d{4}$/, "")}` : ", no clear onset"}. Show evidence.`;
  void windowTo;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-expanded={selected}
      className={cn(
        "absolute inset-x-0 -mx-2 flex flex-col justify-start rounded-[8px] px-2 text-left transition-colors duration-[120ms] ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel",
        selected ? "bg-neel-soft" : "fine:hover:bg-wash active:bg-neel-soft",
      )}
      style={{ top, height, width: "calc(100% + 16px)", "--d": `${strip.delay}ms` } as React.CSSProperties}
    >
      <span className={cn("flex items-center", phone ? "h-7 justify-between gap-3" : "h-full gap-3")}>
        <span className={cn("t-ui text-ink truncate", strip.target ? "font-semibold" : "", phone ? "" : "shrink-0")} style={phone ? undefined : { width: NAME_W }}>
          {meta.label}
        </span>
        {phone ? null : <span className="min-w-0 flex-1" style={{ width: 280 }} />}
        <span className="trail-after flex shrink-0 flex-col items-end gap-0.5" style={phone ? undefined : { width: CHANGE_W }}>
          <Delta value={d} goodWhen={meta.goodWhen} className="t-ui" />
          {strip.unverified ? <Chip variant="unverified">Unverified</Chip> : null}
          {!strip.unverified && !strip.node.onset ? <span className="t-caption text-ink-3">No clear onset</span> : null}
        </span>
      </span>
    </button>
  );
}

/**
 * A connector with 4px corners from the bottom of one tick to the top of the next. The horizontal
 * run sits just above the destination strip, so a connector that crosses another group's strip
 * passes through it as one vertical line and does not read as joining that strip's tick.
 */
function elbow(x1: number, y1: number, x2: number, y2: number): string {
  const ym = y2 - y1 >= 20 ? y2 - 10 : (y1 + y2) / 2;
  if (Math.abs(x2 - x1) < 8) return `M${x1} ${y1} V${y2}`;
  const s = x2 > x1 ? 1 : -1;
  return `M${x1} ${y1} V${ym - 4} Q${x1} ${ym} ${x1 + 4 * s} ${ym} H${x2 - 4 * s} Q${x2} ${ym} ${x2} ${ym + 4} V${y2}`;
}

/** One sentence for the figcaption: what moved first and what followed. */
function describe(strips: Strip[], to: string): string {
  const dated = strips.filter((s) => s.node.onset);
  if (!dated.length) return `Nothing in this trail has a dated onset in the 28 days to ${shortDate(to)}.`;
  const first = dated[0];
  const last = strips[strips.length - 1];
  const fm = METRICS[first.node.metric].label;
  const lm = midSentence(METRICS[last.node.metric].label);
  const dir = (n: number) => (n < 0 ? "fell" : "rose");
  if (first === last) return `${fm} ${dir(first.node.delta)} ${Math.abs(Math.round(first.node.delta))}% from ${shortDate(first.node.onset!)}.`;
  return `${fm} ${dir(first.node.delta)} ${Math.abs(Math.round(first.node.delta))}% from ${shortDate(first.node.onset!)}, and ${lm} ${dir(last.node.delta)} ${Math.abs(Math.round(last.node.delta))}% over the last 14 days.`;
}

export { GAP, STRIP_H };
