"use client";

import { useState, type ReactNode } from "react";
import { horizon } from "@/engine";
import { now } from "@/engine/windows";
import { inr, inrCompact, shortDate } from "@/lib/format";
import { useFindings, useWorld } from "@/lib/store/world";
import { RiskStrip } from "./RiskStrip";
import { RunwayCurve } from "./RunwayCurve";
import { UpcomingList } from "./UpcomingList";

/** The Horizon screen (DESIGN.md, Horizon): the runway sentence, the curve with its switch, what is ahead, then upcoming by week. */
export function HorizonScreen() {
  const world = useWorld();
  const findings = useFindings();
  const h = horizon(world);
  const [collected, setCollected] = useState(false);
  const today = now(world);
  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Horizon</h1>
      <p className="t-briefing text-ink">{lede(h, collected)}</p>
      <div className="rounded-[12px] border border-rule bg-surface p-4 md:p-6">
        <RunwayCurve horizon={h} collected={collected} onCollectedChange={setCollected} />
      </div>
      <RiskStrip world={world} findings={h.dip ? findings.filter((f) => f.detector !== "cashCrunch") : findings} />
      <UpcomingList horizon={h} today={today} />
    </div>
  );
}

/** The runway sentence, with its figures at 600 (DESIGN.md, Type roles: briefing). */
function lede(h: ReturnType<typeof horizon>, collected: boolean): ReactNode {
  const base = h.dip ? (
    <>
      Cash dips <strong>{inr(h.dip.shortfall)}</strong> under the {inrCompact(h.buffer)} buffer on <strong>{shortDate(h.dip.date)}</strong>, in {h.dip.day} days.
    </>
  ) : (
    <>Cash stays above the {inrCompact(h.buffer)} buffer for the next 30 days.</>
  );
  if (!collected) {
    return (
      <>
        {base}
        {h.overdueINR > 0 ? (
          <>
            {" "}
            <strong>{inrCompact(h.overdueINR)}</strong> in overdue invoices is not counted.
          </>
        ) : null}
      </>
    );
  }
  const alt = h.dipWithCollection ? (
    <>
      it still dips <strong>{inr(h.dipWithCollection.shortfall)}</strong> on <strong>{shortDate(h.dipWithCollection.date)}</strong>.
    </>
  ) : (
    <>it stays above the buffer for the next 30 days.</>
  );
  return (
    <>
      {base} With the <strong>{inrCompact(h.overdueINR)}</strong> of overdue invoices collected, {alt}
    </>
  );
}
