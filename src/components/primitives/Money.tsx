import { inr, inrCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  /** "₹1.1 lakh" instead of "₹1,10,400". Prose uses compact; tables and records use full. */
  compact?: boolean;
  /** Colour by sign: negative in debit, positive in credit. Off by default (plain facts are ink). */
  signed?: boolean;
  className?: string;
};

/** Rupees, tabular, through lib/format only. */
export function Money({ value, compact, signed, className }: Props) {
  const text = compact ? inrCompact(value) : inr(value);
  return (
    <span className={cn("tabular-nums", signed && value < 0 && "text-debit", signed && value > 0 && "text-credit", className)}>
      {text}
    </span>
  );
}
