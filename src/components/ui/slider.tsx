"use client";

import * as React from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

// Slider per DESIGN.md (Inputs, Slider): 4px rule-strong track, neel fill, 16px surface thumb with
// a 2px neel border. The base value is a 2px ink-3 notch under the track captioned "Now".
// Values update instantly as the thumb moves; only the thumb's hover and drag feedback (colour and a
// soft ring, 120ms) animates. The thumb has a 44px hit area around its 16px.

type Props = {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Where the notch sits, in the slider's own units. */
  base?: number;
  onChange: (value: number) => void;
  /** The value as it reads on screen and to assistive tech: "+15%". */
  format: (value: number) => string;
  /** Spoken form, when the formatted one would not read well: "plus 15 percent". */
  speak?: (value: number) => string;
  className?: string;
};

export function Slider({ id, label, value, min, max, step = 1, base, onChange, format, speak, className }: Props) {
  const labelId = React.useId();
  const notch = base === undefined ? null : ((base - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="t-label text-ink-2">
          {label}
        </span>
        <output htmlFor={id} className="t-ui font-medium text-ink tabular-nums" aria-hidden>
          {format(value)}
        </output>
      </div>
      <BaseSlider.Root id={id} value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(v)} aria-labelledby={labelId}>
        <BaseSlider.Control className="relative flex h-6 w-full touch-none items-center select-none">
          <BaseSlider.Track className="relative h-1 w-full rounded-full bg-rule-strong">
            <BaseSlider.Indicator className="rounded-full bg-neel" />
            <BaseSlider.Thumb
              className="relative size-4 rounded-full border-2 border-neel bg-surface transition-[border-color,box-shadow] duration-[120ms] ease-[ease] before:absolute before:-inset-3.5 before:content-[''] fine:hover:border-neel-hover data-dragging:shadow-[0_0_0_4px_var(--neel-soft)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neel"
              getAriaLabel={() => label}
              getAriaValueText={(_, v) => (speak ?? format)(v)}
            />
          </BaseSlider.Track>
          {notch !== null ? (
            <span className="pointer-events-none absolute top-full flex -translate-x-1/2 flex-col items-center" style={{ left: `${notch}%` }} aria-hidden>
              <span className="block h-1.5 w-0.5 bg-ink-3" />
              <span className="t-caption text-ink-3">Now</span>
            </span>
          ) : null}
        </BaseSlider.Control>
      </BaseSlider.Root>
      {/* room for the notch caption */}
      <span className="block h-4" aria-hidden />
    </div>
  );
}
