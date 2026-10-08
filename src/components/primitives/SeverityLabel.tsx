import { CircleDot, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import type { Severity } from "@/types";
import { cn } from "@/lib/utils";

const SPEC: Record<Severity, { label: string; Icon: typeof Info; icon: string; text: string }> = {
  critical: { label: "Critical", Icon: OctagonAlert, icon: "text-debit", text: "text-debit" },
  high: { label: "High", Icon: TriangleAlert, icon: "text-haldi", text: "text-haldi-ink" },
  medium: { label: "Medium", Icon: CircleDot, icon: "text-ink-2", text: "text-ink-2" },
  info: { label: "Info", Icon: Info, icon: "text-ink-3", text: "text-ink-3" },
};

/** Text label plus icon, never colour alone (DESIGN.md, Severity). */
export function SeverityLabel({ severity, className }: { severity: Severity; className?: string }) {
  const s = SPEC[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 t-label", s.text, className)}>
      <s.Icon className={cn("size-3.5", s.icon)} aria-hidden strokeWidth={1.75} />
      {s.label}
    </span>
  );
}
