"use client";

import { useSearchParams } from "next/navigation";
import { useWorld } from "@/lib/store/world";
import { GraphExplorer } from "./GraphExplorer";
import { RecordTable } from "./RecordTable";
import { SourceGrid } from "./SourceGrid";

/** The Vault (DESIGN.md, Vault): sources, then every record, then the metric graph. `?record=` lands on one record, scrolled into view. */
export function VaultScreen() {
  const world = useWorld();
  const params = useSearchParams();
  const record = params.get("record");
  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Vault</h1>
      <p className="max-w-[65ch] t-body text-ink-2">Every claim in Munshi points at a record here. Nothing on this page is a summary; each line is the record as the source holds it.</p>
      <SourceGrid world={world} />
      <RecordTable world={world} record={record} />
      <GraphExplorer world={world} />
    </div>
  );
}
