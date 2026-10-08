import { CircleAlert } from "lucide-react";
import type { World } from "@/types";
import { Chip, SOURCE_ICON } from "@/components/primitives";
import { hoursBetween, nowAt } from "@/engine/windows";
import { count } from "@/lib/format";
import { cn } from "@/lib/utils";

// The sources table (DESIGN.md, Vault): name, what it provides, status, last sync, records. Under
// 720px each row stacks: the name and status on the first line, the sync and count beneath.

const CELL = "px-4 py-3 align-middle";
const STACK = "max-phone:grid max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:items-center max-phone:gap-x-3 max-phone:px-4 max-phone:py-3";

export function SourceGrid({ world, className }: { world: World; className?: string }) {
  const at = nowAt(world);
  return (
    <section aria-labelledby="sources-h" className={className}>
      <h2 id="sources-h" className="t-section text-ink">
        Sources
      </h2>
      <div className="mt-3 overflow-hidden rounded-[12px] border border-rule bg-surface">
        <table className="w-full border-collapse max-phone:block [&_tbody]:max-phone:block">
          <thead className="max-phone:hidden">
            <tr className="h-9 border-b border-rule">
              <th scope="col" className="px-4 text-left t-label text-ink-2">Source</th>
              <th scope="col" className="px-4 text-left t-label text-ink-2">Status</th>
              <th scope="col" className="px-4 text-left t-label text-ink-2">Last sync</th>
              <th scope="col" className="px-4 text-right t-label text-ink-2">Records</th>
            </tr>
          </thead>
          <tbody>
            {world.sources.map((s) => {
              const Icon = SOURCE_ICON[s.id];
              const mins = Math.max(1, Math.round(hoursBetween(s.lastSyncAt, at) * 60));
              const sync = mins < 60 ? `${mins} ${mins === 1 ? "minute" : "minutes"} ago` : `${Math.round(mins / 60)} hours ago`;
              return (
                <tr key={s.id} className={cn("border-b border-rule last:border-b-0", STACK)}>
                  <th scope="row" className={cn(CELL, "text-left font-normal max-phone:p-0")}>
                    <span className="flex items-center gap-2 t-ui text-ink">
                      <Icon className="size-4 shrink-0 text-ink-2" aria-hidden strokeWidth={1.5} />
                      {s.name}
                    </span>
                    <span className="mt-0.5 block pl-6 t-caption text-ink-3">{s.provides.join(", ")}</span>
                  </th>
                  <td className={cn(CELL, "max-phone:p-0")}>
                    {s.status === "error" ? (
                      <Chip variant="critical">
                        <CircleAlert className="size-3" aria-hidden strokeWidth={1.75} />
                        Needs reconnecting
                      </Chip>
                    ) : s.status === "syncing" ? (
                      <Chip variant="warn">Syncing</Chip>
                    ) : (
                      <Chip variant="good">Connected</Chip>
                    )}
                  </td>
                  <td className={cn(CELL, "whitespace-nowrap t-ui text-ink-2 max-phone:p-0 max-phone:pl-6 max-phone:pt-1 max-phone:t-caption")}>
                    {s.status === "syncing" ? "Syncing now" : `Synced ${sync}`}
                  </td>
                  <td className={cn(CELL, "text-right whitespace-nowrap t-ui text-ink tabular-nums max-phone:p-0 max-phone:pt-1 max-phone:t-caption max-phone:text-ink-2")}>
                    {count(s.recordCount)}
                    <span className="hidden max-phone:inline"> records</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
