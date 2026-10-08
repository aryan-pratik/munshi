import type { Finding, World } from "@/types";
import { SeverityLabel } from "@/components/primitives";
import { inrCompact } from "@/lib/format";
import { sinceOf } from "@/lib/findings";
import { cn } from "@/lib/utils";

/** The forward-looking findings (stock, renewals, and cash when the lede does not already carry it) as rule-divided rows: severity, title, when and what it is worth. */
export function RiskStrip({ world, findings, className }: { world: World; findings: Finding[]; className?: string }) {
  const ahead = findings.filter((f) => sinceOf(world, f).forward);
  if (!ahead.length) return null;
  return (
    <section aria-labelledby="ahead-h" className={className}>
      <h2 id="ahead-h" className="t-section text-ink">
        Ahead
      </h2>
      <ul className="mt-3 overflow-hidden rounded-[12px] border border-rule bg-surface">
        {ahead.map((f) => (
          <li key={f.id} className={cn("flex items-baseline gap-x-4 gap-y-1 border-b border-rule px-4 py-3 last:border-b-0 max-phone:flex-col")}>
            <SeverityLabel severity={f.severity} className="w-16 shrink-0" />
            <p className="min-w-0 flex-1 t-ui text-ink">{f.title}</p>
            <p className="shrink-0 t-caption text-ink-2 tabular-nums">
              {upperFirst(sinceOf(world, f).text)}
              <span className="text-ink-3">, worth {inrCompact(f.impactINR)}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function upperFirst(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
