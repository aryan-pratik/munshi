"use client";

import { useState } from "react";
import Link from "next/link";
import type { Horizon } from "@/engine/horizon";
import { Chip } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { inr, relDate, shortDate } from "@/lib/format";
import { vaultHref } from "@/lib/records";
import { cn } from "@/lib/utils";

// Upcoming, as a table grouped by week with source chips (DESIGN.md, Horizon). Under 720px the
// rows stack: the label on the first line, the date and chip left and the amount right beneath.

const CELL = "px-4 py-4 align-middle";
const STACK = "max-phone:grid max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:items-center max-phone:gap-x-3 max-phone:px-4 max-phone:py-3";

export function UpcomingList({ horizon: h, today, className }: { horizon: Horizon; today: string; className?: string }) {
  const groups = groupByWeek(h.upcoming);
  // Two weeks open by default; the rest sits behind one button so the page stays readable.
  const [all, setAll] = useState(false);
  const shown = all ? groups : groups.slice(0, 2);
  const hidden = groups.slice(2).reduce((n, g) => n + g.rows.length, 0);
  if (!h.upcoming.length) return null;
  return (
    <section aria-labelledby="upcoming-h" className={className}>
      <h2 id="upcoming-h" className="t-section text-ink">
        Upcoming
      </h2>
      <div className="mt-3 overflow-hidden rounded-[12px] border border-rule bg-surface">
        <table className="w-full border-collapse max-phone:block [&_tbody]:max-phone:block">
          <thead className="max-phone:hidden">
            <tr className="h-9 border-b border-rule">
              <th scope="col" className="px-4 text-left t-label text-ink-2">What</th>
              <th scope="col" className="px-4 text-left t-label text-ink-2">When</th>
              <th scope="col" className="px-4 text-left t-label text-ink-2">Source</th>
              <th scope="col" className="px-4 text-right t-label text-ink-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((g) => (
              <Week key={g.label} label={g.label} total={g.total}>
                {g.rows.map((u) => (
                  <tr key={`${u.ref.kind}:${u.ref.id}:${u.day}`} className={cn("border-b border-rule last:border-b-0 fine:hover:bg-wash", STACK)}>
                    <td className={cn(CELL, "max-phone:col-span-2 max-phone:p-0 max-phone:pb-1")}>
                      <Link href={vaultHref(u.ref)} className="t-ui text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel rounded-[2px]">
                        {u.label}
                      </Link>
                      {u.certainty === "expected" ? <span className="ml-2 t-caption text-ink-3">expected</span> : null}
                    </td>
                    <td className={cn(CELL, "whitespace-nowrap t-ui text-ink-2 max-phone:flex max-phone:items-center max-phone:gap-2 max-phone:p-0 max-phone:t-caption")}>
                      <span>
                        {shortDate(u.date)}
                        <span className="text-ink-3">, {relDate(u.date, today)}</span>
                      </span>
                      <Chip source={u.ref.source} className="hidden max-phone:inline-flex">
                        {kindLabel(u.kind)}
                      </Chip>
                    </td>
                    <td className={cn(CELL, "max-phone:hidden")}>
                      <Chip source={u.ref.source}>{kindLabel(u.kind)}</Chip>
                    </td>
                    <td className={cn(CELL, "text-right whitespace-nowrap t-ui tabular-nums max-phone:p-0", u.amount > 0 ? "text-credit" : "text-ink")}>
                      {u.amount > 0 ? "+" : "−"}
                      {inr(Math.abs(u.amount))}
                    </td>
                  </tr>
                ))}
              </Week>
            ))}
          </tbody>
        </table>
        {!all && hidden > 0 ? (
          <div className="border-t border-rule px-4 py-3">
            <Button size="sm" onClick={() => setAll(true)}>
              Show the rest, {hidden} more
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function kindLabel(kind: Horizon["upcoming"][number]["kind"]): string {
  return kind === "payroll" ? "Payroll" : kind === "invoice" ? "Invoice" : kind === "subscription" ? "Subscription" : kind === "obligation" ? "Due" : "Bill";
}

function Week({ label, total, children }: { label: string; total: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-b border-rule bg-chalk max-phone:block">
        <th scope="colgroup" colSpan={4} className="h-11 px-4 text-left align-middle max-phone:block max-phone:py-3">
          <span className="t-ui font-semibold text-ink">{label}</span>
          <span className={cn("ml-3 t-caption tabular-nums", total >= 0 ? "text-credit" : "text-ink-2")}>
            net {total >= 0 ? "+" : "−"}
            {inr(Math.abs(total))}
          </span>
        </th>
      </tr>
      {children}
    </>
  );
}

const WEEKS = ["This week", "Next week", "In two weeks", "In three weeks", "In four weeks"];

function groupByWeek(rows: Horizon["upcoming"]) {
  const out: { label: string; rows: Horizon["upcoming"]; total: number }[] = [];
  for (const u of rows) {
    const label = WEEKS[Math.min(WEEKS.length - 1, Math.floor((u.day - 1) / 7))];
    let g = out.find((x) => x.label === label);
    if (!g) {
      g = { label, rows: [], total: 0 };
      out.push(g);
    }
    g.rows.push(u);
    g.total += u.amount;
  }
  return out;
}
