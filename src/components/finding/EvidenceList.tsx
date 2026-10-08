import Link from "next/link";
import type { RecordRef, World } from "@/types";
import { uniqueRefs } from "@/lib/records";
import { cn } from "@/lib/utils";
import { EventLine, MessageBubble, RecordRow } from "./RecordView";

type Props = {
  world: World;
  refs: RecordRef[];
  /** Show at most this many records, then a link to the rest in the Vault. */
  limit?: number;
  /** Drop the per-record "Open in Vault" link (the containing group carries one). */
  bare?: boolean;
  className?: string;
};

/** Any RecordRef[] as readable records, in the order the detector gave them. */
export function EvidenceList({ world, refs, limit, bare, className }: Props) {
  const all = uniqueRefs(refs);
  const shown = limit ? all.slice(0, limit) : all;
  const rest = all.length - shown.length;
  return (
    <div className={cn("flex flex-col", className)}>
      {shown.map((r) => (
        <div key={`${r.kind}:${r.id}`} className={cn("border-b border-rule last:border-b-0", r.kind === "message" ? "flex flex-col py-3" : "")}>
          {r.kind === "message" ? <MessageBubble world={world} refx={r} bare={bare} /> : r.kind === "event" ? <EventLine world={world} refx={r} /> : <RecordRow world={world} refx={r} />}
        </div>
      ))}
      {rest > 0 ? (
        <Link href="/vault" className="pt-3 t-caption text-neel hover:underline">
          {rest} more {rest === 1 ? "record" : "records"} in the Vault
        </Link>
      ) : null}
    </div>
  );
}
