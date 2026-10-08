"use client";

import type { RecordRef, World } from "@/types";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { EvidenceList } from "@/components/finding/EvidenceList";
import { usePhone } from "@/lib/hooks";

type Props = {
  world: World;
  title: string;
  refs: RecordRef[];
  anchor: Element | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Up to five records anchored to a strip; a bottom sheet on a phone (DESIGN.md, OnsetTrail). */
export function EvidencePopover({ world, title, refs, anchor, open, onOpenChange }: Props) {
  const phone = usePhone();
  if (phone) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Sheet side="bottom" title={title}>
          <div className="px-4 py-3">
            <EvidenceList world={world} refs={refs} limit={5} />
          </div>
        </Sheet>
      </Dialog>
    );
  }
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent anchor={anchor} side="bottom" align="start" className="p-3">
        <h3 className="t-label px-1 text-ink-2">{title}</h3>
        <EvidenceList world={world} refs={refs} limit={5} className="mt-1 px-1" />
      </PopoverContent>
    </Popover>
  );
}
