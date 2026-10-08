"use client";

import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

// Switch per DESIGN.md (Inputs, Switch): 36 by 20px, rule-strong when off, neel when on. The thumb
// slides in 120ms; the colour changes with it. The label sits to its right in the UI role.

type Props = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: React.ReactNode;
  className?: string;
};

export function Switch({ id, checked, onCheckedChange, label, className }: Props) {
  const labelId = React.useId();
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3 select-none", className)}>
      <BaseSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c)}
        aria-labelledby={labelId}
        className="relative h-5 w-9 shrink-0 rounded-full bg-rule-strong transition-colors duration-[120ms] ease-[ease] outline-none data-checked:bg-neel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel"
      >
        <BaseSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface shadow-[0_1px_2px_rgb(21_26_45/0.2)] transition-transform duration-[120ms] ease-[ease] motion-reduce:transition-none data-checked:translate-x-[18px]" />
      </BaseSwitch.Root>
      <span id={labelId} className="t-ui text-ink">
        {label}
      </span>
    </label>
  );
}
