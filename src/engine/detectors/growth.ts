import type { Finding, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { inr, inrCompact } from "@/lib/format";
import { addDays, dayIndex, daysBetween } from "../windows";
import { series } from "../metrics";
import { detectOnset } from "../graph/onset";
import { finding, projectionSeries, ref, type DetectorCtx } from "./shared";

/** A SKU whose days of cover are fewer than its supplier lead time, with no purchase order on the way. */
export function stockoutRisk(world: World, ctx: DetectorCtx): Finding[] {
  const out: Finding[] = [];
  const since = addDays(ctx.now, -29);
  const units = new Map<string, number>();
  for (const o of world.orders) {
    if (o.createdAt < since) continue;
    for (const l of o.lines) units.set(l.sku, (units.get(l.sku) ?? 0) + l.qty);
  }
  for (const p of world.products) {
    const perDay = (units.get(p.sku) ?? 0) / 30;
    if (perDay <= 0) continue;
    const cover = p.onHand / perDay;
    if (cover >= p.leadTimeDays) continue;
    if (world.purchaseOrders.some((po) => po.lines.some((l) => l.sku === p.sku))) continue;
    const coverDays = Math.round(cover);
    const setsPerDay = Math.max(1, Math.round(perDay));
    const stockoutDays = p.leadTimeDays - coverDays;
    const impact = stockoutDays * setsPerDay * p.price;
    const recent = world.orders.filter((o) => o.createdAt >= since && o.lines.some((l) => l.sku === p.sku)).slice(-5);
    out.push(
      finding({
        detector: "stockoutRisk",
        severity: "high",
        title: `${p.name} runs out in ${coverDays} days; the next batch takes ${p.leadTimeDays}`,
        impactINR: impact,
        confidence: 0.85,
        window: { from: ctx.now, to: addDays(ctx.now, coverDays) },
        onset: null,
        series: projectionSeries(28, (k) => Math.max(0, p.onHand - perDay * k)),
        evidence: [ref(p.source, "product", p.id), ...recent.map((o) => ref(o.source, "order", o.id))],
        explain: `${p.onHand} on hand against about ${setsPerDay} a day sold in the last 30 days gives ${coverDays} days of cover. ${p.supplier.split(",")[0]} needs ${p.leadTimeDays} days, so about ${stockoutDays} days of sales, ${inr(impact)}, would be lost unless the order goes today.`,
        playbooks: ["reorderStock"],
      }),
    );
  }
  return out;
}

/** Customer acquisition cost up a fifth over the last 30 days against the 30 before. */
export function adEfficiency(world: World, ctx: DetectorCtx): Finding[] {
  const spend = series(world, "adSpend");
  const orders = series(world, "ordersD2C");
  const end = dayIndex(world, ctx.now);
  const block = (from: number, to: number) => {
    let s = 0;
    let o = 0;
    for (let d = Math.max(0, from); d <= to; d++) {
      s += spend[d];
      o += orders[d];
    }
    return { spend: s, orders: o, cac: o ? s / o : 0 };
  };
  const last = block(end - 29, end);
  const prev = block(end - 59, end - 30);
  if (!prev.cac || !last.cac) return [];
  const risePct = (last.cac / prev.cac - 1) * 100;
  if (risePct < THRESHOLDS.cacRisePct) return [];
  const impact = last.spend * (1 - 1 / (1 + THRESHOLDS.cacRisePct / 100));
  // A 7-day rolling CAC series for the strip, with its own onset
  const cac: number[] = [];
  for (let d = 0; d <= end; d++) {
    const b = block(d - 6, d);
    cac.push(b.cac || (cac.length ? cac[cac.length - 1] : 0));
  }
  const onset = detectOnset(cac, { from: addDays(ctx.now, -27), to: ctx.now, day0: world.meta.day0 });
  const strip = cac.slice(Math.max(0, end - 27), end + 1);
  const campaigns = [...new Set(world.adDays.filter((a) => daysBetween(a.date, ctx.now) < 30).map((a) => a.campaign))];
  const lastDays = world.adDays.filter((a) => daysBetween(a.date, ctx.now) < 7);
  return [
    finding({
      detector: "adEfficiency",
      severity: "medium",
      title: `Cost per order from ads up ${Math.round(risePct)}% this month, ${inr(last.cac)} against ${inr(prev.cac)}`,
      impactINR: impact,
      confidence: 0.7,
      window: { from: addDays(ctx.now, -29), to: ctx.now },
      onset,
      series: strip,
      evidence: lastDays.slice(-6).map((a) => ref(a.source, "adDay", a.id)),
      explain: `${inrCompact(last.spend)} of ad spend brought ${last.orders} D2C orders in the last 30 days, ${inr(last.cac)} each, against ${inr(prev.cac)} in the 30 days before (${campaigns.length} campaigns). Spend rose faster than orders; about ${inr(impact)} of this month's spend bought nothing the old rate would not have.`,
      playbooks: [],
    }),
  ];
}
