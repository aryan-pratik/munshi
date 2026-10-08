import type { Levers, World } from "@/types";
import { BASE_LEVERS, LEVER_RANGES, optimize } from "@/engine";

// What if helpers that are not engine: presets, the `?preset=` mapping and the strategy sentence.
// Every number here is a lever the engine will run; nothing is an outcome.

export const FOLLOW_UP_STEPS = LEVER_RANGES.followUpHours; // [4, 12, 24, 48]

export type PresetId = "best" | "raise-prices" | "push-marketing" | "hire";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "raise-prices", label: "Raise prices" },
  { id: "push-marketing", label: "Push marketing" },
  { id: "hire", label: "Hire" },
];

/** The levers a preset sets; `best` is the optimizer's top strategy on this world. */
export function presetLevers(world: World, id: string | null): Levers | null {
  switch (id) {
    case "best":
      return optimize(world).top3[0]?.levers ?? null;
    case "raise-prices":
      return { ...BASE_LEVERS, pricePct: 10 };
    case "push-marketing":
      return { ...BASE_LEVERS, marketingPct: 50 };
    case "hire":
      return { ...BASE_LEVERS, hires: 1 };
    default:
      return null;
  }
}

export function sameLevers(a: Levers, b: Levers): boolean {
  return a.pricePct === b.pricePct && a.marketingPct === b.marketingPct && a.hires === b.hires && a.inventoryPct === b.inventoryPct && a.followUpHours === b.followUpHours;
}

export const isBase = (l: Levers) => sameLevers(l, BASE_LEVERS);

const signed = (n: number) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%");

/** "Price +5%, ad spend +75%, hire 1, stock +20%, reply within 12 hours"; "No change" at base. */
export function strategySentence(l: Levers): string {
  const parts: string[] = [];
  if (l.pricePct !== 0) parts.push(`Price ${signed(l.pricePct)}`);
  if (l.marketingPct !== 0) parts.push(`ad spend ${signed(l.marketingPct)}`);
  if (l.hires !== 0) parts.push(`hire ${l.hires}`);
  if (l.inventoryPct !== 0) parts.push(`stock ${signed(l.inventoryPct)}`);
  if (l.followUpHours !== 48) parts.push(`reply within ${l.followUpHours} hours`);
  if (!parts.length) return "No change";
  const s = parts.join(", ");
  return s[0].toUpperCase() + s.slice(1);
}

/** Readouts for the five sliders. */
export const readout = {
  pct: signed,
  hires: (n: number) => (n === 0 ? "None" : String(n)),
  hours: (h: number) => `${h} hours`,
};

export const speak = {
  pct: (n: number) => (n > 0 ? `plus ${n} percent` : n < 0 ? `minus ${Math.abs(n)} percent` : "no change"),
};
