"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { RecordKind, World } from "@/types";
import { Chip, SOURCE_NAME } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { count, inr } from "@/lib/format";
import { parseRefKey, refKey } from "@/lib/records";
import { fieldsOf, indexRecords, KIND_LABEL, matches, type IndexedRecord } from "@/lib/vault";
import { cn } from "@/lib/utils";

// The records table (DESIGN.md, Vault): a kind filter and a search, then the records newest
// first, 50 a page. A row expands in place to the record's fields. `?record=` lands on the exact
// record: its kind selected, its page open, the row expanded and scrolled into view.

const PAGE = 50;
const CELL = "px-4 py-3 align-middle";
const STACK = "max-phone:grid max-phone:grid-cols-[auto_minmax(0,1fr)_auto] max-phone:items-center max-phone:gap-x-3 max-phone:px-3 max-phone:py-3";

export function RecordTable({ world, record, className }: { world: World; record: string | null; className?: string }) {
  const all = useMemo(() => indexRecords(world), [world]);
  const target = record ? parseRefKey(record) : null;
  const targetKey = target ? refKey(target) : null;
  const [kind, setKind] = useState<RecordKind | "all">(target?.kind ?? "all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(targetKey);
  const searchId = "vault-search";

  const counts = useMemo(() => {
    const c = new Map<RecordKind, number>();
    for (const r of all) c.set(r.kind, (c.get(r.kind) ?? 0) + 1);
    return c;
  }, [all]);
  const kinds = (Object.keys(KIND_LABEL) as RecordKind[]).filter((k) => counts.get(k));
  const rows = useMemo(() => all.filter((r) => (kind === "all" || r.kind === kind) && matches(r, query.trim())), [all, kind, query]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);

  // The deep link: land on the record's page once, then let the user roam.
  const landed = useRef<string | null>(null);
  useEffect(() => {
    if (!targetKey || landed.current === targetKey) return;
    landed.current = targetKey;
    const i = all.filter((r) => r.kind === target!.kind).findIndex((r) => r.key === targetKey);
    if (i < 0) return;
    setKind(target!.kind);
    setQuery("");
    setPage(Math.floor(i / PAGE));
    setExpanded(targetKey);
  }, [targetKey, target, all]);
  const rowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (targetKey && expanded === targetKey) rowRef.current?.scrollIntoView({ block: "center" });
  }, [targetKey, expanded, current]);

  const clear = () => {
    setQuery("");
    setPage(0);
  };
  return (
    <section aria-labelledby="records-h" className={className}>
      <h2 id="records-h" className="t-section text-ink">
        Records
      </h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="t-label text-ink-2">Kind</span>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as RecordKind | "all");
              setPage(0);
            }}
            className="h-9 rounded-[8px] border border-rule-strong bg-surface pr-8 pl-3 t-ui text-ink focus:border-neel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel"
          >
            <option value="all">All kinds, {count(all.length)}</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}, {count(counts.get(k) ?? 0)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 max-phone:basis-full phone:max-w-[360px]">
          <span className="t-label text-ink-2" id={`${searchId}-label`}>
            Search
          </span>
          <span className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-ink-3" aria-hidden strokeWidth={1.5} />
            <input
              id={searchId}
              type="search"
              name="q"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="A name, a number, a shop…"
              className="h-9 w-full rounded-[8px] border border-rule-strong bg-surface pr-3 pl-9 t-ui text-ink placeholder:text-ink-3 focus:border-neel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel"
            />
          </span>
        </label>
      </div>
      <div className="mt-3 overflow-hidden rounded-[12px] border border-rule bg-surface">
        {rows.length === 0 ? (
          <div className="p-6">
            <p className="t-body text-ink">No records match “{query.trim()}”.</p>
            <p className="mt-1 t-ui text-ink-2">Try a shop, a person, an invoice number or a product.</p>
            <Button className="mt-4" onClick={clear}>
              Clear search
            </Button>
          </div>
        ) : (
          <table className="w-full border-collapse max-phone:block [&_tbody]:max-phone:block">
            <caption className="sr-only">Records, newest first</caption>
            <thead className="max-phone:hidden">
              <tr className="h-9 border-b border-rule">
                <th scope="col" className="w-8 px-2">
                  <span className="sr-only">Expand</span>
                </th>
                <th scope="col" className="px-4 text-left t-label text-ink-2">Record</th>
                <th scope="col" className="px-4 text-left t-label text-ink-2">Kind</th>
                <th scope="col" className="px-4 text-left t-label text-ink-2">Source</th>
                <th scope="col" className="px-4 text-left t-label text-ink-2">Date</th>
                <th scope="col" className="px-4 text-right t-label text-ink-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <Row key={r.key} world={world} r={r} expanded={expanded === r.key} onToggle={() => setExpanded((e) => (e === r.key ? null : r.key))} ref={r.key === targetKey ? rowRef : undefined} />
              ))}
            </tbody>
          </table>
        )}
        {rows.length > PAGE ? (
          <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3">
            <p className="t-caption text-ink-2 tabular-nums">
              {count(current * PAGE + 1)} to {count(Math.min(rows.length, (current + 1) * PAGE))} of {count(rows.length)}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPage(current - 1)} disabled={current === 0}>
                Previous
              </Button>
              <Button size="sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Row({ world, r, expanded, onToggle, ref }: { world: World; r: IndexedRecord; expanded: boolean; onToggle: () => void; ref?: React.Ref<HTMLTableRowElement> }) {
  const panelId = `rec-${r.key.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <>
      <tr ref={ref} className={cn("group border-b border-rule scroll-mt-20", expanded ? "bg-neel-soft" : "fine:hover:bg-wash", STACK)}>
        <td className={cn("w-8 px-2 py-3 align-middle max-phone:p-0")}>
          <span className="flex size-6 items-center justify-center text-ink-3" aria-hidden>
            <ChevronRight className={cn("size-4", expanded && "rotate-90")} strokeWidth={1.5} />
          </span>
        </td>
        <td className={cn(CELL, "max-phone:p-0")}>
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel rounded-[2px]">
            <span className="block t-ui text-ink">{r.title}</span>
            {r.detail || r.status ? (
              <span className="block t-caption text-ink-2">
                {r.detail}
                {r.status ? <span className={cn(r.detail && "ml-2", r.status.variant === "critical" ? "text-debit" : r.status.variant === "warn" ? "text-haldi-ink" : r.status.variant === "good" ? "text-credit" : "text-ink-3")}>{r.status.label}</span> : null}
              </span>
            ) : null}
            <span className="hidden t-caption text-ink-3 max-phone:block">
              {KIND_LABEL[r.kind]}, {r.date}
            </span>
          </button>
        </td>
        <td className={cn(CELL, "whitespace-nowrap t-ui text-ink-2 max-phone:hidden")}>{KIND_LABEL[r.kind]}</td>
        <td className={cn(CELL, "max-phone:hidden")}>
          <Chip source={r.source}>{SOURCE_NAME[r.source]}</Chip>
        </td>
        <td className={cn(CELL, "whitespace-nowrap t-ui text-ink-2 tabular-nums max-phone:hidden")}>{r.date}</td>
        <td className={cn(CELL, "text-right whitespace-nowrap t-ui text-ink tabular-nums max-phone:p-0")}>{r.amount !== null ? inr(r.amount) : ""}</td>
      </tr>
      {expanded ? (
        <tr id={panelId} className="border-b border-rule bg-neel-soft max-phone:block">
          <td colSpan={6} className="px-4 pt-0 pb-4 max-phone:block">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 pl-6 max-phone:pl-0">
              {fieldsOf(world, r.ref).map((f) => (
                <div key={f.label} className="contents">
                  <dt className="t-caption text-ink-2">{f.label}</dt>
                  <dd className="min-w-0 break-words t-caption text-ink tabular-nums">{f.value}</dd>
                </div>
              ))}
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
