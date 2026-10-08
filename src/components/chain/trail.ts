import type { Chain, ChainNode, MetricId, RecordRef } from "@/types";
import { daysBetween } from "@/engine/windows";

// Pure layout for the OnsetTrail (docs/ARCHITECTURE.md, "OnsetTrail groups"; DESIGN.md,
// OnsetTrail). The client derives the three groups from the Chain alone.

export type Group = "primary" | "branch" | "shared";

export type Strip = {
  node: ChainNode;
  group: Group;
  /** Index of the onset within the 28-point series, or null. */
  onsetIndex: number | null;
  /** No evidence at all: drawn dashed and chipped "Unverified". */
  unverified: boolean;
  /** Whether this is the asked-about metric (drawn last, name at 600). */
  target: boolean;
  /** Draw delay in ms for the authored moment. */
  delay: number;
};

export type Row = { kind: "strip"; strip: Strip; index: number } | { kind: "header"; label: string };

export const POINTS = 28;
export const STRIP_H = 56;
export const STRIP_H_PHONE = 72;
export const PLOT_H = 36;
export const GAP = 8;
export const HEADER_H = 24;
export const LANE_H = 24;
export const CAPTION_H = 18;

export function groupsOf(chain: Chain): { primary: ChainNode[]; branch: ChainNode[]; shared: ChainNode[] } {
  const nodes = chain.nodes;
  const branch = chain.branches.flatMap((b) => b.nodes);
  if (!chain.branches.length) return { primary: nodes.slice(0, -1), branch: [], shared: nodes.slice(-1) };
  const rejoin = chain.branches[0].edges[chain.branches[0].edges.length - 1]?.to;
  const at = nodes.findIndex((n) => n.metric === rejoin);
  if (at < 0) return { primary: nodes.slice(0, -1), branch, shared: nodes.slice(-1) };
  return { primary: nodes.slice(0, at), branch, shared: nodes.slice(at) };
}

export function onsetIndexOf(node: ChainNode, windowTo: string): number | null {
  if (!node.onset) return null;
  const i = node.series.length - 1 - daysBetween(node.onset, windowTo);
  return i < 0 || i >= node.series.length ? null : i;
}

/** The strips in drawing order with their groups and draw delays. */
export function stripsOf(chain: Chain): { strips: Strip[]; rows: Row[]; stagger: number } {
  const g = groupsOf(chain);
  const count = g.primary.length + g.branch.length + g.shared.length;
  const stagger = Math.min(240, 1200 / Math.max(1, count));
  const strips: Strip[] = [];
  const rows: Row[] = [];
  let i = 0;
  const push = (node: ChainNode, group: Group, delay: number) => {
    const strip: Strip = {
      node,
      group,
      onsetIndex: onsetIndexOf(node, chain.window.to),
      unverified: node.evidence.length === 0 && node.onsetEvidence.length === 0,
      target: node.metric === chain.target,
      delay,
    };
    strips.push(strip);
    rows.push({ kind: "strip", strip, index: i++ });
  };
  g.primary.forEach((n, k) => push(n, "primary", k * stagger));
  // the branch starts once the primary path has finished its own draw
  const primaryEnd = g.primary.length ? (g.primary.length - 1) * stagger + 420 : 0;
  if (g.branch.length) rows.push({ kind: "header", label: "Also contributing" });
  g.branch.forEach((n, k) => push(n, "branch", primaryEnd + k * stagger));
  const branchEnd = g.branch.length ? primaryEnd + (g.branch.length - 1) * stagger + 420 : primaryEnd;
  g.shared.forEach((n, k) => push(n, "shared", branchEnd + k * stagger));
  return { strips, rows, stagger };
}

/** Pixel y of each row's top, given the row heights. */
export function rowTops(rows: Row[], stripH: number, laneH = LANE_H): number[] {
  const tops: number[] = [];
  let y = CAPTION_H + laneH;
  for (const r of rows) {
    tops.push(y);
    y += (r.kind === "header" ? HEADER_H : stripH) + GAP;
  }
  return tops;
}

export function totalHeight(rows: Row[], stripH: number, laneH = LANE_H): number {
  const tops = rowTops(rows, stripH, laneH);
  const last = rows[rows.length - 1];
  return (tops[tops.length - 1] ?? CAPTION_H + laneH) + (last ? (last.kind === "header" ? HEADER_H : stripH) : 0);
}

/** Lays flags out left to right; a flag that would overlap the previous one drops to the next row. */
export function flagRows(xs: { x: number; width: number }[]): number[] {
  const ends: number[] = [];
  return xs.map(({ x, width }) => {
    let row = ends.findIndex((end) => end + 8 <= x);
    if (row < 0) row = ends.length;
    ends[row] = x + width;
    return row;
  });
}

/** Connectors: within each group in order, and from the last of primary and of branch into the first shared strip. */
export function connectors(strips: Strip[]): [number, number][] {
  const idx = (g: Group) => strips.map((s, i) => (s.group === g ? i : -1)).filter((i) => i >= 0);
  const chainOf = (ids: number[]) => ids.slice(1).map((b, k) => [ids[k], b] as [number, number]);
  const p = idx("primary");
  const b = idx("branch");
  const s = idx("shared");
  const out: [number, number][] = [...chainOf(p), ...chainOf(b), ...chainOf(s)];
  if (s.length) {
    if (p.length) out.push([p[p.length - 1], s[0]]);
    if (b.length) out.push([b[b.length - 1], s[0]]);
  }
  // only between strips that both carry a tick
  return out.filter(([a, c]) => strips[a].onsetIndex !== null && strips[c].onsetIndex !== null);
}

/** When the draw has finished: the last strip's delay plus its line, tick and date. */
export function drawEnd(strips: Strip[]): number {
  return strips.reduce((m, s) => Math.max(m, s.delay), 0) + 420;
}

export type Flag = { ref: RecordRef; stripIndex: number; metric: MetricId };

/** The event flags: one per onset event, attached to the strip it explains. */
export function flagsOf(strips: Strip[]): Flag[] {
  return strips.flatMap((s, i) => s.node.onsetEvidence.filter((r) => r.kind === "event").map((ref) => ({ ref, stripIndex: i, metric: s.node.metric })));
}

/** All evidence refs behind a chain, for the "Evidence (n)" section. */
export function chainRefs(chain: Chain): RecordRef[] {
  return [...chain.nodes, ...chain.branches.flatMap((b) => b.nodes)].flatMap((n) => [...n.onsetEvidence, ...n.evidence]);
}
