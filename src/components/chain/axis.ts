import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";

// The one axis grammar (DESIGN.md, OnsetTrail and its echoes): index along x, value along y,
// a straight line through daily points. OnsetStrip, CashLine and the Horizon runway share it.

export type Scales = { x: (i: number) => number; y: (v: number) => number; width: number; height: number };

export function makeScales(values: number[], width: number, height: number, opts: { padX?: number; padY?: number; include?: number[] } = {}): Scales {
  const { padX = 1, padY = 2, include = [] } = opts;
  const all = [...values, ...include].filter((v) => Number.isFinite(v));
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const x = scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([padX, width - padX]);
  const y = scaleLinear().domain([lo, hi]).range([height - padY, padY]);
  return { x: (i) => x(i), y: (v) => y(v), width, height };
}

export function linePath(values: number[], s: Scales): string {
  const gen = line<number>()
    .x((_, i) => s.x(i))
    .y((v) => s.y(v));
  return gen(values) ?? "";
}

/** The area between the line and a horizontal level, only where `below(v)` holds. */
/** The stretch of the line that sits below `level`, with the crossings interpolated so it starts and ends on the level. */
export function lineBelow(values: number[], level: number, s: Scales): string {
  const parts: string[] = [];
  let open = false;
  const pt = (x: number, y: number) => `${s.x(x).toFixed(1)} ${s.y(y).toFixed(1)}`;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const prev = i > 0 ? values[i - 1] : null;
    if (v < level) {
      if (!open) {
        if (prev !== null && prev >= level) parts.push(`M${pt(i - 1 + (prev - level) / (prev - v), level)}`);
        else parts.push(`M${pt(i, v)}`);
        open = true;
        if (prev !== null && prev >= level) parts.push(`L${pt(i, v)}`);
      } else parts.push(`L${pt(i, v)}`);
    } else if (open && prev !== null) {
      parts.push(`L${pt(i - 1 + (level - prev) / (v - prev), level)}`);
      open = false;
    }
  }
  return parts.join(" ");
}

export function areaBelow(values: number[], level: number, s: Scales): string {
  const gen = area<number>()
    .defined((v) => v < level)
    .x((_, i) => s.x(i))
    .y0(() => s.y(level))
    .y1((v) => s.y(v));
  return gen(values) ?? "";
}
