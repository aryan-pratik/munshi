import type { Outcome, Scenario } from "@/types";
import { Delta } from "@/components/primitives";
import { count, days, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RiskScale } from "./RiskScale";

type RowSpec = { key: keyof Outcome; label: string; goodWhen: "up" | "down"; format: (v: number) => string; change: "pct" | "pts" };

const ROWS: RowSpec[] = [
  { key: "revenue", label: "Revenue", goodWhen: "up", format: inr, change: "pct" },
  { key: "customers", label: "Customers", goodWhen: "up", format: count, change: "pct" },
  { key: "churnPct", label: "Churn", goodWhen: "down", format: (v) => `${v.toFixed(1)}%`, change: "pts" },
  { key: "profit", label: "Profit", goodWhen: "up", format: inr, change: "pct" },
  { key: "cashRunwayDays", label: "Cash runway", goodWhen: "up", format: days, change: "pct" },
];

type Props = { base: Scenario; scenario: Scenario; className?: string; ref?: React.Ref<HTMLElement> };

/** Base, Scenario, Change per month, then the engine's notes and the risk scale (DESIGN.md, What if). */
export function OutcomeTable({ base, scenario, className, ref }: Props) {
  return (
    <section ref={ref} aria-label="Outcome" className={cn("flex scroll-mt-20 flex-col gap-6", className)}>
      <table className="w-full border-collapse">
        <caption className="sr-only">Outcome per month: base, scenario and change</caption>
        <thead>
          <tr className="t-label text-ink-2">
            <th scope="col" className="h-9 border-b border-rule text-left font-medium">
              Per month
            </th>
            <th scope="col" className="h-9 border-b border-rule text-right font-medium">
              Base
            </th>
            <th scope="col" className="h-9 border-b border-rule text-right font-medium">
              Scenario
            </th>
            <th scope="col" className="h-9 border-b border-rule text-right font-medium">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const b = base.outcome[r.key];
            const s = scenario.outcome[r.key];
            const change = r.change === "pts" ? s - b : b ? ((s - b) / Math.abs(b)) * 100 : 0;
            return (
              <tr key={r.key} className="border-b border-rule">
                <th scope="row" className="h-13 py-3 pr-4 text-left t-ui font-normal text-ink">
                  {r.label}
                </th>
                <td className="h-13 py-3 pl-4 text-right t-ui text-ink-2 tabular-nums">{r.format(b)}</td>
                <td className="h-13 py-3 pl-4 text-right t-ui font-medium text-ink tabular-nums">{r.format(s)}</td>
                <td className="h-13 py-3 pl-4 text-right t-ui tabular-nums">
                  <Delta value={change} goodWhen={r.goodWhen} decimals={r.change === "pts" ? 1 : 0} suffix={r.change === "pts" ? " pts" : "%"} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div>
        <h2 className="t-label text-ink-2">What the model noticed</h2>
        <ul className="mt-2 flex flex-col gap-1 t-ui text-ink">
          {scenario.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      <RiskScale risk={scenario.risk} />
    </section>
  );
}
