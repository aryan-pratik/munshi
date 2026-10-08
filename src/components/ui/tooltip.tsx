"use client";

import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

// Tooltip per DESIGN.md: ink ground, chalk text, caption role, 400ms first delay,
// instant for neighbours while one is open (Base UI's provider handles the grouping).

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <BaseTooltip.Provider delay={400}>{children}</BaseTooltip.Provider>;
}

export const Tooltip = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Popup> & {
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
}) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} sideOffset={sideOffset} className="z-50">
        <BaseTooltip.Popup
          className={cn("popup-float t-caption rounded-[8px] bg-ink px-2 py-1 text-chalk", className)}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
