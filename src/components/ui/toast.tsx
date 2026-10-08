"use client";

import * as React from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { Button } from "./button";

// Toast per DESIGN.md (Sheet, popover, tooltip, toast): bottom right, above the tab bar on a
// phone, surface with the float shadow, aria-live polite. It slides from the bottom right and
// leaves the same way in 240ms ease, as a CSS transition so stacked toasts retarget.

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseToast.Provider timeout={5000}>
      {children}
      <Viewport />
    </BaseToast.Provider>
  );
}

export const useToast = BaseToast.useToastManager;

function Viewport() {
  const { toasts } = BaseToast.useToastManager();
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="fixed right-4 bottom-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 max-phone:bottom-[calc(56px+16px+env(safe-area-inset-bottom))]">
        {toasts.map((t) => (
          <BaseToast.Root key={t.id} toast={t} className="toast flex items-start gap-3 rounded-[12px] bg-surface p-4 shadow-(--shadow-float) dark:bg-wash">
            <BaseToast.Content className="min-w-0 flex-1">
              <BaseToast.Title className="t-ui font-medium text-ink" />
              <BaseToast.Description className="mt-0.5 t-caption text-ink-2" />
            </BaseToast.Content>
            <BaseToast.Close render={<Button variant="ghost" size="icon-sm" aria-label="Close" className="-m-1.5" />}>
              <X aria-hidden strokeWidth={1.5} />
            </BaseToast.Close>
          </BaseToast.Root>
        ))}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}
