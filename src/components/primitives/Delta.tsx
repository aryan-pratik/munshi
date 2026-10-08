import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Percent points: 12 means +12%. */
  value: number;
  goodWhen: "up" | "down";
  decimals?: number;
  className?: string;
};

/** Direction icon, sign and value, coloured by whether the move is good (DESIGN.md, Money and Delta). */
export function Delta({ value, goodWhen, decimals = 0, className }: Props) {
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return <span className={cn("tabular-nums text-ink-2", className)}>0%</span>;
  const up = rounded > 0;
  const good = goodWhen === "up" ? up : !up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const text = `${up ? "+" : "−"}${Math.abs(rounded).toFixed(decimals)}%`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 tabular-nums", good ? "text-credit" : "text-debit", className)}>
      <Icon className="size-3.5" aria-hidden strokeWidth={1.75} />
      <span>
        <span className="sr-only">{up ? "up" : "down"} </span>
        {text}
      </span>
    </span>
  );
}
