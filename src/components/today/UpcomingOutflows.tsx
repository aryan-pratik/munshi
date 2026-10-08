import Link from "next/link";
import type { World } from "@/types";
import { horizon } from "@/engine";
import { now } from "@/engine/windows";
import { inr, relDate, shortDate } from "@/lib/format";
import { vaultHref } from "@/lib/records";

/** The next three outflows from the horizon, as three rows. */
export function UpcomingOutflows({ world }: { world: World }) {
  const h = horizon(world);
  const today = now(world);
  const rows = h.upcoming.filter((u) => u.amount < 0).slice(0, 3);
  return (
    <section className="rounded-[12px] border border-rule bg-surface p-4 md:p-6" aria-labelledby="upcoming-h">
      <h2 id="upcoming-h" className="t-label text-ink-2">Upcoming outflows</h2>
      {rows.length === 0 ? (
        <p className="mt-2 t-ui text-ink-2">Nothing due in the next 30 days.</p>
      ) : (
        <ul className="mt-1 divide-y divide-rule">
          {rows.map((u) => (
            <li key={`${u.ref.kind}:${u.ref.id}`}>
              <Link href={vaultHref(u.ref)} className="fine:hover:bg-wash -mx-2 flex items-center gap-3 rounded-[8px] px-2 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-neel">
                <span className="min-w-0 flex-1">
                  <span className="block truncate t-ui text-ink">{u.label}</span>
                  <span className="block t-caption text-ink-3">
                    {shortDate(u.date)}, {relDate(u.date, today)}
                    {u.certainty === "expected" ? ", expected" : ""}
                  </span>
                </span>
                <span className="t-ui text-ink tabular-nums">{inr(u.amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
