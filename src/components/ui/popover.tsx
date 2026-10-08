"use client";

import * as React from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

// Popover per DESIGN.md: surface, 12px radius, 4px padding, float shadow, no border; opens from
// the trigger's side in 160ms (.popup-float). In dark it steps up to wash.

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;

type ContentProps = React.ComponentProps<typeof BasePopover.Popup> & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  anchor?: React.ComponentProps<typeof BasePopover.Positioner>["anchor"];
};

export function PopoverContent({ className, side = "bottom", align = "start", sideOffset = 6, anchor, children, ...props }: ContentProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} anchor={anchor} collisionPadding={16} className="z-50">
        <BasePopover.Popup
          className={cn("popup-float w-[min(32rem,calc(100vw-32px))] rounded-[12px] bg-surface p-1 shadow-(--shadow-float) outline-none dark:bg-wash", className)}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export const PopoverTitle = BasePopover.Title;
export const PopoverClose = BasePopover.Close;
