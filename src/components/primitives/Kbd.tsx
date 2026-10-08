import { cn } from "@/lib/utils";

/** A key cap in the caption role. Pairs such as "Cmd K" keep a non-breaking space. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 items-center font-sans rounded-[4px] border border-rule bg-wash px-1.5 t-caption font-medium text-ink-2 whitespace-nowrap", className)}>
      {children}
    </kbd>
  );
}
