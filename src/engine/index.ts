// The engine's public surface. Pure functions over a World: no I/O, no model calls, no Date.now().
import type { Action, CollectionKey, Finding, World } from "@/types";
import { analyze } from "./detectors";

export { METRICS, metricSeries, series, windowValue, windowPerDay, compareWindows, stripSeries } from "./metrics";
export { analyze, briefTotal, DETECTORS, ctxFor } from "./detectors";
export { walkCausalGraph, evidenceFor } from "./graph/walk";
export { detectOnset, metricOnset } from "./graph/onset";
export { EDGES, EVENT_ANCHORS, ancestorsOf } from "./graph/dag";
export { horizon } from "./horizon";
export { simulate, simulateBase, baseInputs, BASE_LEVERS, LEVER_RANGES } from "./simulator/model";
export { optimize, GRID, type ScanPoint, type Strategy, type Optimization } from "./simulator/optimize";
export { PLAYBOOKS, playbook, playbooksFor, nextFriday } from "./playbooks";
export * from "./windows";

type Rec = { id: string } & Record<string, unknown>;

/** Replays effects immutably: untouched collections keep their identity, patched records are copies. */
export function applyEffects(world: World, effects: Action["effects"]): World {
  if (!effects.length) return world;
  const next: World = { ...world };
  const touched = new Set<CollectionKey>();
  const collection = (key: CollectionKey): Rec[] => {
    if (!touched.has(key)) {
      (next as unknown as Record<CollectionKey, Rec[]>)[key] = [...(world[key] as unknown as Rec[])];
      touched.add(key);
    }
    return (next as unknown as Record<CollectionKey, Rec[]>)[key];
  };
  for (const e of effects) {
    const rows = collection(e.collection);
    if (e.op === "set") {
      const i = rows.findIndex((r) => r.id === e.id);
      if (i < 0) throw new Error(`effect set: no ${e.collection} record ${e.id}`);
      rows[i] = { ...rows[i], ...e.patch };
    } else {
      if (rows.some((r) => r.id === e.record.id)) throw new Error(`effect create: ${e.collection} already has ${e.record.id}`);
      rows.push(e.record as Rec);
    }
  }
  return next;
}

/** The committed seed plus every approved action, in order. The server replays this per request. */
export function replay(seed: World, actions: Action[]): World {
  return actions.reduce((w, a) => applyEffects(w, a.effects), seed);
}

/** For each action, the finding it handled as it stood just before approval (docs/ENGINE.md, 2.1). */
export function handledFindings(seed: World, actions: Action[]): { finding: Finding; action: Action }[] {
  const out: { finding: Finding; action: Action }[] = [];
  let world = seed;
  for (const a of actions) {
    const before = analyze(world).find((f) => f.id === a.findingId);
    if (before) out.push({ finding: before, action: a });
    world = applyEffects(world, a.effects);
  }
  return out;
}
