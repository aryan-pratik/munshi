"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { Finding, World } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Confidence, Money, SeverityLabel } from "@/components/primitives";
import { OnsetStrip } from "@/components/chain/OnsetStrip";
import { askHref, primaryAction, sinceOf } from "@/lib/findings";
import { useWorldStore } from "@/lib/store/world";
import { cn } from "@/lib/utils";
import { EvidenceList } from "./EvidenceList";

// One row of the findings table (DESIGN.md, Today and Tables). Rows expand in place to the
// explanation and evidence; nothing opens a drawer. Under 720px the row stacks: finding on the
// first line, since left and worth right on the second, the action on its own line.

export const ROW_CELL = "px-4 py-3 align-middle";
const STACK_ROW = "max-phone:grid max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:items-center max-phone:gap-x-3 max-phone:px-4 max-phone:py-3";

type Props = {
  world: World;
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  handled?: { label: string };
};

export function FindingRow({ world, finding, expanded, onToggle, handled }: Props) {
  const openAct = useWorldStore((s) => s.openAct);
  const since = sinceOf(world, finding);
  const action = handled ? null : primaryAction(world, finding);
  const panelId = `finding-${finding.id.replace(/[^a-z0-9]/gi, "-")}`;
  const exposure = finding.impactINR === 0 && finding.exposureINR ? finding.exposureINR : null;
  const actionNode = handled
    ? null
    : action
      ? (cls: string) => (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openAct({ findingId: finding.id, playbook: action.playbook });
            }}
            className={cls}
          >
            {action.label}
          </Button>
        )
      : (cls: string) => (
          <Link href={askHref(finding)} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), cls)}>
            Ask why
          </Link>
        );
  return (
    <>
      <tr
        className={cn("group border-b border-rule", STACK_ROW, expanded ? "bg-neel-soft" : "fine:hover:bg-wash", handled && "text-ink-2")}
        data-expanded={expanded || undefined}
        data-flip={handled ? `handled:${finding.id}` : finding.id}
      >
        <td className={cn(ROW_CELL, "max-phone:col-span-2 max-phone:p-0 max-phone:pb-1")}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="flex w-full items-start gap-2 rounded-[4px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neel"
          >
            <ChevronRight className={cn("mt-1 size-3.5 shrink-0 text-ink-3", expanded && "rotate-90")} aria-hidden strokeWidth={1.75} />
            <span className="flex min-w-0 flex-col gap-0.5">
              {handled ? (
                <span className="inline-flex items-center gap-1 t-label text-credit">
                  <Check className="size-3.5" aria-hidden strokeWidth={2} />
                  Handled
                </span>
              ) : (
                <SeverityLabel severity={finding.severity} />
              )}
              <span className={cn("t-ui", handled ? "text-ink-2" : "text-ink")}>{finding.title}</span>
            </span>
          </button>
          {actionNode ? <div className="mt-2 pl-[22px] rail:hidden">{actionNode(cn("fine:opacity-0 fine:group-hover:opacity-100 fine:group-focus-within:opacity-100", expanded && "fine:opacity-100"))}</div> : null}
        </td>
        <td className={cn(ROW_CELL, "whitespace-nowrap max-phone:p-0 max-phone:pl-[22px]")}>
          {handled ? (
            <span className="t-caption text-ink-3">{handled.label}</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-ink">
              <OnsetStrip series={finding.series} onsetIndex={since.onsetIndex} className="max-phone:w-16" />
              <span className="t-caption text-ink-2 tabular-nums">{since.text}</span>
            </span>
          )}
        </td>
        <td className={cn(ROW_CELL, "text-right whitespace-nowrap max-phone:p-0")}>
          {exposure ? (
            <span className="inline-flex flex-col items-end">
              <Money value={exposure} className={cn("t-ui", handled ? "text-ink-2" : "text-ink")} />
              <span className="t-caption text-ink-3">exposed</span>
            </span>
          ) : (
            <Money value={finding.impactINR} className={cn("t-ui", handled ? "text-ink-2" : "text-ink")} />
          )}
        </td>
        <td className={cn(ROW_CELL, "w-0 text-right whitespace-nowrap max-rail:hidden")}>
          {actionNode ? actionNode(cn("fine:opacity-0 fine:group-hover:opacity-100 fine:group-focus-within:opacity-100", expanded && "fine:opacity-100")) : null}
        </td>
      </tr>
      {expanded ? (
        <tr id={panelId} className="border-b border-rule bg-neel-soft max-phone:block">
          <td colSpan={4} className="px-4 pt-0 pb-5 max-phone:block">
            <div className="pl-[22px]">
              <p className="t-body max-w-[65ch] text-ink">{finding.explain}</p>
              <p className="mt-1">
                <Confidence value={finding.confidence} />
              </p>
              <h3 className="mt-5 t-label text-ink-2">Evidence ({finding.evidence.length})</h3>
              <EvidenceList world={world} refs={finding.evidence} limit={5} className="mt-1" />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
