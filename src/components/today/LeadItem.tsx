"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Finding, PlaybookId, World } from "@/types";
import { Button } from "@/components/ui/button";
import { EvidenceList } from "@/components/finding/EvidenceList";
import { inrCompact } from "@/lib/format";
import { primaryAction } from "@/lib/findings";
import { findRecord } from "@/lib/records";
import { useWorldStore } from "@/lib/store/world";
import { MUNSHI } from "@/data/rules/tone";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { cn } from "@/lib/utils";

// Munshi's lead item (DESIGN.md, Today): two or three sentences in the briefing role, first
// person, with figures at 600 as links to their evidence. "See the threads" expands the evidence
// in place; nothing opens a drawer. The expand does not animate: it is a disclosure, not a moment.

export function LeadItem({ world, finding }: { world: World; finding: Finding }) {
  const [open, setOpen] = useState(false);
  const openAct = useWorldStore((s) => s.openAct);
  const action = primaryAction(world, finding);
  const panelId = "lead-evidence";
  const toggle = () => setOpen((o) => !o);
  const figure = (text: string) => (
    <button type="button" onClick={toggle} aria-expanded={open} aria-controls={panelId} className="font-semibold text-neel hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel rounded-[2px]">
      {text}
    </button>
  );
  const secondary = finding.detector === "staleHighValueLeads" || finding.detector === "overdueInvoices" ? "See the threads" : "See the evidence";
  return (
    <section aria-label="Lead item">
      <p className="t-briefing text-ink">{leadCopy(world, finding, figure, action?.n ?? 0)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {action ? (
          <Button variant="primary" onClick={() => openAct({ findingId: finding.id, playbook: action.playbook })}>
            {action.label}
          </Button>
        ) : null}
        <Button variant={action ? "secondary" : "primary"} onClick={toggle} aria-expanded={open} aria-controls={panelId}>
          {open ? `Hide ${secondary.replace("See ", "")}` : secondary}
          <ChevronDown className={cn("size-4", open && "rotate-180")} aria-hidden strokeWidth={1.5} />
        </Button>
      </div>
      {open ? (
        <div id={panelId} className="mt-5 rounded-[12px] border border-rule bg-surface p-4 md:p-6">
          <LeadEvidence world={world} finding={finding} />
        </div>
      ) : null}
    </section>
  );
}

/** For the leads story, the seven threads grouped by lead; otherwise the finding's evidence as it comes. */
function LeadEvidence({ world, finding }: { world: World; finding: Finding }) {
  if (finding.detector !== "staleHighValueLeads") return <EvidenceList world={world} refs={finding.evidence} limit={8} />;
  const leads = finding.evidence.filter((e) => e.kind === "lead").map((e) => findRecord(world, { ...e, kind: "lead" })).filter((l): l is NonNullable<typeof l> => !!l);
  const quoted = leads.reduce((s, l) => s + l.estValueINR, 0);
  return (
    <div>
      <p className="t-ui text-ink-2">
        {leads.length} quotes totalling {inrCompact(quoted)}. Each thread ends with the buyer asking a question.
      </p>
      <div className="mt-4 flex flex-col divide-y divide-rule">
        {leads.map((l) => (
          <div key={l.id} className="py-4 first:pt-0 last:pb-0">
            <EvidenceList world={world} refs={[{ source: l.source, kind: "lead", id: l.id }]} />
            <div className="mt-2 flex flex-col gap-3 pl-0 phone:pl-6">
              <EvidenceList world={world} refs={l.thread.slice(-2)} bare />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Figure = (text: string) => React.ReactNode;

const FIRST_PERSON: Record<PlaybookId, (n: number) => string> = {
  followUpLeads: (n) => MUNSHI.drafted(n),
  collectOverdue: (n) => (n === 1 ? "I drafted the reminder." : `I drafted reminders for all ${n}.`),
  cancelSubscription: () => "I prepared the cancellation.",
  escalateCourier: () => "I drafted the escalation.",
  reorderStock: () => "I drafted the purchase order.",
  scheduleRenewal: (n) => (n === 1 ? "I drafted the reminder." : `I drafted ${n} reminders.`),
};

function leadCopy(world: World, f: Finding, figure: Figure, n: number): React.ReactNode {
  if (f.detector === "staleHighValueLeads") {
    const leads = f.evidence.filter((e) => e.kind === "lead").map((e) => findRecord(world, { ...e, kind: "lead" })).filter((l): l is NonNullable<typeof l> => !!l);
    const quoted = leads.reduce((s, l) => s + l.estValueINR, 0);
    const winPct = quoted ? Math.round((f.impactINR / quoted) * 100) : 0;
    const days = Math.round(THRESHOLDS.leadStaleHours / 24);
    return (
      <>
        About {figure(inrCompact(f.impactINR))} is sitting in {figure(`${leads.length} wholesale leads`)} nobody has replied to in {days} days. Each thread ends with the buyer asking a question, and about {winPct}% of quotes like these are won. {FIRST_PERSON.followUpLeads(n)}
      </>
    );
  }
  const tail = f.playbooks[0] ? ` ${FIRST_PERSON[f.playbooks[0]](n)}` : "";
  return (
    <>
      {withFigures(f.explain, figure)}
      {tail}
    </>
  );
}

/** Wraps the rupee and percent figures the engine wrote into the explanation as evidence links. */
function withFigures(text: string, figure: Figure): React.ReactNode {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?(?: lakh| crore)?|\d+(?:\.\d+)?%)/g);
  return parts.map((p, i) => (i % 2 === 1 ? <Fragment key={i}>{figure(p)}</Fragment> : <Fragment key={i}>{p}</Fragment>));
}
