"use client";

import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// Dialog surfaces per DESIGN.md (Sheet, popover, tooltip, toast): a scrim with no blur, a surface
// with the sheet shadow, focus trapped, Esc closes. `side` picks the sheet (right, 480px) or the
// phone bottom sheet; both are square against the viewport edge.

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

type SheetProps = React.ComponentProps<typeof BaseDialog.Popup> & {
  side?: "right" | "bottom";
  title: string;
  /** Replaces the visible title with a visually hidden one. */
  hideTitle?: boolean;
};

export function Sheet({ side = "right", title, hideTitle, className, children, ...props }: SheetProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="sheet-scrim fixed inset-0 z-40 bg-(--scrim)" />
      <BaseDialog.Popup
        className={cn(
          "sheet-popup fixed z-50 flex flex-col bg-surface outline-none",
          side === "bottom" ? "shadow-(--shadow-sheet-up)" : "shadow-(--shadow-sheet)",
          side === "right" ? "inset-y-0 right-0 w-full max-w-[480px]" : "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[12px] pb-[env(safe-area-inset-bottom)]",
          className,
        )}
        data-side={side}
        {...props}
      >
        <header className={cn("flex h-14 shrink-0 items-center justify-between gap-3 border-b border-rule px-4 md:px-6", hideTitle && "sr-only")}>
          <BaseDialog.Title className="t-section text-ink">{title}</BaseDialog.Title>
          <BaseDialog.Close render={<Button variant="ghost" size="icon" aria-label="Close" />}>
            <X aria-hidden strokeWidth={1.5} />
          </BaseDialog.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}
