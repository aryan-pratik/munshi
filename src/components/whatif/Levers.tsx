"use client";

import type { Levers as LeversT } from "@/types";
import { BASE_LEVERS, LEVER_RANGES } from "@/engine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FOLLOW_UP_STEPS, isBase, PRESETS, presetLevers, readout, sameLevers, speak, type PresetId } from "@/lib/whatif";
import { useWorld } from "@/lib/store/world";

type Props = { levers: LeversT; onChange: (levers: LeversT) => void };

/** Five sliders with the base value marked, the three presets and Reset (DESIGN.md, What if). */
export function Levers({ levers, onChange }: Props) {
  const world = useWorld();
  const set = <K extends keyof LeversT>(key: K, value: LeversT[K]) => onChange({ ...levers, [key]: value });
  const pick = (id: PresetId) => {
    const l = presetLevers(world, id);
    if (l) onChange(l);
  };
  const r = LEVER_RANGES;
  const hoursIndex = Math.max(0, FOLLOW_UP_STEPS.indexOf(levers.followUpHours));
  return (
    <section aria-label="Levers" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const target = presetLevers(world, p.id);
          const on = !!target && sameLevers(levers, target);
          return (
            <Button key={p.id} size="sm" onClick={() => pick(p.id)} aria-pressed={on} className="aria-pressed:border-neel aria-pressed:bg-neel-soft aria-pressed:text-neel">
              {p.label}
            </Button>
          );
        })}
        <Button size="sm" variant="ghost" onClick={() => onChange(BASE_LEVERS)} disabled={isBase(levers)} className="ml-auto">
          Reset
        </Button>
      </div>
      <Slider label="Price" value={levers.pricePct} min={r.pricePct.min} max={r.pricePct.max} step={r.pricePct.step} base={0} onChange={(v) => set("pricePct", v)} format={readout.pct} speak={speak.pct} />
      <Slider label="Ad spend" value={levers.marketingPct} min={r.marketingPct.min} max={r.marketingPct.max} step={r.marketingPct.step} base={0} onChange={(v) => set("marketingPct", v)} format={readout.pct} speak={speak.pct} />
      <Slider label="New hires" value={levers.hires} min={r.hires.min} max={r.hires.max} step={r.hires.step} base={0} onChange={(v) => set("hires", v)} format={readout.hires} />
      <Slider label="Stock" value={levers.inventoryPct} min={r.inventoryPct.min} max={r.inventoryPct.max} step={r.inventoryPct.step} base={0} onChange={(v) => set("inventoryPct", v)} format={readout.pct} speak={speak.pct} />
      <Slider
        label="Reply to leads within"
        value={hoursIndex}
        min={0}
        max={FOLLOW_UP_STEPS.length - 1}
        step={1}
        base={FOLLOW_UP_STEPS.indexOf(48)}
        onChange={(i) => set("followUpHours", FOLLOW_UP_STEPS[i] ?? 48)}
        format={(i) => readout.hours(FOLLOW_UP_STEPS[i] ?? 48)}
      />
    </section>
  );
}
