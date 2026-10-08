"use client";

import { useMemo } from "react";
import { create } from "zustand";
import type { Action, Finding, PlaybookId, World } from "@/types";
import { seedWorld } from "@/data/seed";
import { analyze, applyEffects, handledFindings } from "@/engine";

// One World, client-held, in memory only (docs/ARCHITECTURE.md, 4). A hard refresh reloads the
// seed and is the demo reset. The server never holds state; requests carry `actions[]`.

export type ActRequest = { findingId: string; playbook: PlaybookId };

type WorldStore = {
  seed: World;
  world: World;
  actions: Action[];
  /** The Act sheet's current request, or null when closed. */
  act: ActRequest | null;
  /** Wall-clock time (ms) each action was approved, by action id, for "Handled 2 minutes ago". */
  approvedAtMs: Record<string, number>;
  applyAction(action: Action): void;
  openAct(req: ActRequest): void;
  closeAct(): void;
  reset(): void;
};

export const useWorldStore = create<WorldStore>((set, get) => {
  const seed = seedWorld();
  return {
    seed,
    world: seed,
    actions: [],
    act: null,
    approvedAtMs: {},
    applyAction(action) {
      const { world, actions, approvedAtMs } = get();
      set({ world: applyEffects(world, action.effects), actions: [...actions, action], approvedAtMs: { ...approvedAtMs, [action.id]: Date.now() } });
    },
    openAct(req) {
      set({ act: req });
    },
    closeAct() {
      set({ act: null });
    },
    reset() {
      set({ world: seed, actions: [], act: null, approvedAtMs: {} });
    },
  };
});

export const useWorld = () => useWorldStore((s) => s.world);
export const useSeed = () => useWorldStore((s) => s.seed);
export const useActions = () => useWorldStore((s) => s.actions);

/** Open findings, ranked. analyze() is memoised per World object, so this is cheap to call. */
export function useFindings(): Finding[] {
  return useWorldStore((s) => analyze(s.world));
}

/** Findings an approved action handled, with the action, oldest first. */
export function useHandled(): { finding: Finding; action: Action }[] {
  const seed = useSeed();
  const actions = useActions();
  // Memoised on the actions array, which the store replaces only when an action is applied.
  return useMemo(() => handledFindings(seed, actions), [seed, actions]);
}
