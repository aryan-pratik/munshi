import { cn } from "@/lib/utils";

/** "Confidence 90%" in the caption role: the detector's own number, never a bar. */
export function Confidence({ value, className }: { value: number; className?: string }) {
  return <span className={cn("t-caption text-ink-3 tabular-nums", className)}>Confidence {Math.round(value * 100)}%</span>;
}
