"use client";

import Link from "next/link";
import { Brief } from "@/components/today/Brief";
import { LeadItem } from "@/components/today/LeadItem";
import { FindingsTable } from "@/components/today/FindingsTable";
import { CashLine } from "@/components/today/CashLine";
import { UpcomingOutflows } from "@/components/today/UpcomingOutflows";
import { SuggestedQuestions } from "@/components/ask/SuggestedQuestions";
import { EmptyState } from "@/components/primitives";
import { buttonVariants } from "@/components/ui/button";
import { useFindings, useHandled, useWorld } from "@/lib/store/world";
import { timeOf } from "@/lib/format";
import { nowAt } from "@/engine/windows";

export default function TodayPage() {
  const world = useWorld();
  const findings = useFindings();
  const handled = useHandled();
  const lead = findings[0];
  return (
    <div className="grid grid-cols-1 gap-8 stack:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <h1 className="sr-only">Today</h1>
        <Brief world={world} findings={findings} />
        {lead ? (
          <div className="mt-3">
            <LeadItem key={lead.id} world={world} finding={lead} />
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            title="Nothing needs you today."
            detail={`I last checked at ${timeOf(nowAt(world))}.`}
            action={
              <Link href="/ask" className={buttonVariants({ variant: "primary" })}>
                Ask a question
              </Link>
            }
          />
        )}
        {findings.length || handled.length ? (
          <div className="mt-8">
            <FindingsTable world={world} findings={findings} handled={handled} />
          </div>
        ) : null}
      </div>
      <aside className="flex min-w-0 flex-col gap-4" aria-label="Cash and questions">
        <CashLine world={world} />
        <UpcomingOutflows world={world} />
        <SuggestedQuestions className="rounded-[12px] border border-rule bg-surface p-4 md:p-6" />
      </aside>
    </div>
  );
}
