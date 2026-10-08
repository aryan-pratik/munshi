import { cn } from "@/lib/utils";
import { linePath, makeScales } from "./axis";

type Props = {
  /** Daily values ending at `end` (or, for a projection, starting today). */
  series: number[];
  /** Index of the onset within `series`, or null when there is none (forward-looking findings). */
  onsetIndex: number | null;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * A 1px ink line of a real series with a 2px haldi tick at the onset (DESIGN.md, Echoes). The
 * SVG is decorative to assistive technology; the text beside it carries the date.
 */
export function OnsetStrip({ series, onsetIndex, width = 96, height = 20, className }: Props) {
  if (series.length < 2) return null;
  const s = makeScales(series, width, height);
  const tick = onsetIndex !== null ? Math.min(series.length - 1, Math.max(0, onsetIndex)) : null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("block shrink-0 overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      <path d={linePath(series, s)} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {tick !== null ? <line x1={s.x(tick)} x2={s.x(tick)} y1={0} y2={height} stroke="var(--haldi)" strokeWidth={2} /> : null}
    </svg>
  );
}
