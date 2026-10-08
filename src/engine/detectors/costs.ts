import type { Finding, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { inr } from "@/lib/format";
import { addDays, dayIndex, daysBetween } from "../windows";
import { vendorOnset } from "../graph/onset";
import { finding, recordSeries, ref, type DetectorCtx } from "./shared";

/** Bill categories that should be flat month to month; the rest move with volume. */
const FLAT_CATEGORIES = new Set(["internet", "rent", "services", "other"]);

/** A recurring bill from the same vendor up 10% or more against its earlier median. */
export function costCreep(world: World, ctx: DetectorCtx): Finding[] {
  const out: Finding[] = [];
  const byVendor = new Map<string, typeof world.bills>();
  for (const b of world.bills.filter((x) => x.recurring)) byVendor.set(b.vendor, [...(byVendor.get(b.vendor) ?? []), b]);
  for (const [vendor, bills] of byVendor) {
    if (bills.length < 3) continue;
    if (!FLAT_CATEGORIES.has(bills[0].category)) continue; // usage-billed vendors move with volume, not plans
    const sorted = [...bills].sort((a, b) => a.billDate.localeCompare(b.billDate));
    const latest = sorted[sorted.length - 1];
    const earlier = sorted.slice(0, -1).map((b) => b.amount).sort((a, b) => a - b);
    const med = earlier.length % 2 ? earlier[(earlier.length - 1) / 2] : (earlier[earlier.length / 2 - 1] + earlier[earlier.length / 2]) / 2;
    const risePct = ((latest.amount - med) / med) * 100;
    if (risePct < THRESHOLDS.costCreepPct) continue;
    const delta = latest.amount - med;
    const firstHigher = sorted.find((b) => b.amount >= latest.amount) ?? latest;
    const { onset, onsetEvidence } = vendorOnset(world, vendor, firstHigher.billDate);
    const amountOn = (d: number) => {
      const asOf = addDays(world.meta.day0, d);
      const b = [...sorted].reverse().find((x) => x.billDate <= asOf);
      return b ? b.amount : sorted[0].amount;
    };
    const seriesPts = recordSeries(world, ctx.now, onset, amountOn);
    const event = onsetEvidence[0] ? world.events.find((e) => e.id === onsetEvidence[0].id) : undefined;
    out.push(
      finding({
        detector: "costCreep",
        severity: "info",
        title: `${vendor} bill up ${inr(delta)} a month${event ? " since the plan upgrade" : ""}`,
        impactINR: delta * 12,
        confidence: 0.9,
        window: { from: addDays(ctx.now, -27), to: ctx.now },
        onset,
        series: seriesPts,
        evidence: [...sorted.map((b) => ref(b.source, "bill", b.id)), ...onsetEvidence],
        explain: `The ${vendor} bill was ${inr(latest.amount)} on ${latest.billDate.slice(8)}/${latest.billDate.slice(5, 7)} against ${inr(med)} before (${Math.round(risePct)}% more).${event ? ` ${event.detail ?? event.label}` : ""} That is ${inr(delta * 12)} a year.`,
        playbooks: [],
      }),
    );
  }
  return out;
}

/** Active subscriptions unused for 60 days or more. One aggregated finding. */
export function zombieSubscription(world: World, ctx: DetectorCtx): Finding[] {
  const zombies = world.subscriptions
    .filter((s) => s.status === "active" && daysBetween(s.lastUsedAt, ctx.now) >= THRESHOLDS.zombieDays)
    .sort((a, b) => a.lastUsedAt.localeCompare(b.lastUsedAt));
  if (!zombies.length) return [];
  const monthly = zombies.reduce((s, z) => s + z.monthlyINR, 0);
  const onset = zombies[0].lastUsedAt;
  const seriesPts = recordSeries(world, ctx.now, onset, (d) => Math.max(0, d - dayIndex(world, onset)));
  const names = zombies.map((z) => `${z.vendor} (${daysBetween(z.lastUsedAt, ctx.now)} days)`).join(", ");
  return [
    finding({
      detector: "zombieSubscription",
      aggregate: true,
      severity: "medium",
      title: `${zombies.length} subscription${zombies.length > 1 ? "s" : ""} nobody has used in two months, ${inr(monthly * 12)} a year`,
      impactINR: monthly * 12,
      confidence: 0.95,
      window: { from: addDays(ctx.now, -27), to: ctx.now },
      onset,
      series: seriesPts,
      evidence: zombies.map((z) => ref(z.source, "subscription", z.id)),
      explain: `${names}: ${inr(monthly)} a month still renewing, last used ${daysBetween(zombies[0].lastUsedAt, ctx.now)} days ago at the longest. Cancelling saves ${inr(monthly * 12)} a year.`,
      playbooks: ["cancelSubscription"],
    }),
  ];
}
