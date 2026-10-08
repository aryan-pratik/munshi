import { cn } from "@/lib/utils";

/** One sentence on what is true, one on what to do, and a button. No illustration (DESIGN.md, states). */
export function EmptyState({ title, detail, action, className }: { title: string; detail?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[12px] border border-rule bg-surface p-6", className)}>
      <p className="t-body text-ink">{title}</p>
      {detail ? <p className="t-ui mt-1 text-ink-2">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
