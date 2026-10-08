import type { Finding, World } from "@/types";
import { briefTotal } from "@/engine";
import { now } from "@/engine/windows";
import { briefDate, inrCompact } from "@/lib/format";

/** "Thursday, 8 October. 11 things found overnight, worth about ₹4 lakh." */
export function Brief({ world, findings }: { world: World; findings: Finding[] }) {
  const total = briefTotal(findings);
  const n = findings.length;
  const things = n === 0 ? "Nothing new overnight." : `${n} ${n === 1 ? "thing" : "things"} found overnight, worth about ${roughLakh(total)}.`;
  return (
    <p className="t-body text-ink-2">
      {briefDate(now(world))}. {things}
    </p>
  );
}

/** "₹4 lakh" for the brief: a round figure, the exact one sits in the table. */
function roughLakh(value: number): string {
  if (value >= 1_00_000) {
    const lakh = value / 1_00_000;
    return `₹${lakh >= 10 ? Math.round(lakh) : Math.round(lakh * 2) / 2} lakh`;
  }
  return inrCompact(Math.round(value / 1000) * 1000);
}
