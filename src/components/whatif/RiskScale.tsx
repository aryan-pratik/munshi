import type { Scenario } from "@/types";
import { cn } from "@/lib/utils";

const STEPS: { key: Scenario["risk"]; label: string; fill: string }[] = [
  { key: "low", label: "Low", fill: "bg-credit" },
  { key: "medium", label: "Medium", fill: "bg-haldi" },
  { key: "high", label: "High", fill: "bg-debit" },
];

/** A labelled three-step scale with the current step filled and named in text (DESIGN.md, What if). */
export function RiskScale({ risk, className }: { risk: Scenario["risk"]; className?: string }) {
  const current = STEPS.find((s) => s.key === risk)!;
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <ol className="flex items-center gap-1" aria-hidden>
        {STEPS.map((s) => (
          <li key={s.key} className={cn("h-2 w-10 rounded-full", s.key === risk ? s.fill : "bg-rule")} />
        ))}
      </ol>
      <p className="t-ui text-ink">
        Risk <span className="font-medium">{current.label}</span>
      </p>
    </div>
  );
}
