import Link from "next/link";
import type { World } from "@/types";
import { horizon } from "@/engine";
import { areaBelow, linePath, makeScales } from "@/components/chain/axis";
import { inr, inrCompact, shortDate } from "@/lib/format";

const W = 320;
const H = 96;

/** The 30-day cash line, 320 by 96, in the Horizon grammar: buffer as a dashed rule, crossing tick in haldi. */
export function CashLine({ world }: { world: World }) {
  const h = horizon(world);
  const balances = h.points.map((p) => p.balance);
  const s = makeScales(balances, W, H, {
    padX: 1,
    padY: 6,
    include: [h.buffer],
  });
  const cross = h.points.findIndex((p) => p.balance < h.buffer);
  const caption = h.dip
    ? `Dips ${inr(h.dip.shortfall)} under the ${inrCompact(h.buffer)} buffer on ${shortDate(h.dip.date)}.`
    : `Stays above the ${inrCompact(h.buffer)} buffer for the next 30 days.`;
  return (
    <div>
      <Link
        href="/horizon"
        className="pressable-row block rounded-[12px] border border-rule bg-surface p-4 transition-colors duration-[120ms] ease-[ease] fine:hover:border-rule-strong fine:hover:bg-wash md:p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="t-label text-ink-2">Cash, next 30 days</h2>
          <span className="t-ui text-ink tabular-nums">
            {inrCompact(h.cashToday)} today
          </span>
        </div>
        <figure className="mt-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full max-w-[320px] text-ink"
            aria-hidden
            focusable="false"
          >
            <path
              d={areaBelow(balances, h.buffer, s)}
              fill="var(--debit-soft)"
            />
            <line
              x1={0}
              x2={W}
              y1={s.y(h.buffer)}
              y2={s.y(h.buffer)}
              stroke="var(--rule-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <path
              d={linePath(balances, s)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {cross >= 0 ? (
              <line
                x1={s.x(cross)}
                x2={s.x(cross)}
                y1={0}
                y2={H}
                stroke="var(--haldi)"
                strokeWidth={2}
              />
            ) : null}
          </svg>
          <figcaption className="mt-2 t-caption text-ink-2">
            {caption}
          </figcaption>
        </figure>
      </Link>
      <table className="sr-only">
        <caption>Projected cash balance by day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Balance</th>
          </tr>
        </thead>
        <tbody>
          {h.points
            .filter((_, i) => i % 5 === 0 || i === h.points.length - 1)
            .map((p) => (
              <tr key={p.day}>
                <td>{shortDate(p.date)}</td>
                <td>{inr(p.balance)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
