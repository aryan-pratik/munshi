import type { Finding, World } from "@/types";
import { THRESHOLDS } from "@/data/rules/thresholds";
import { days as fmtDays, inrCompact } from "@/lib/format";
import { hoursBetween, inWindow } from "../windows";
import { compareWindows, stripSeries, windowValue } from "../metrics";
import { metricOnset } from "../graph/onset";
import { d2cOrderValue } from "./conversion";
import { finding, ref, type DetectorCtx } from "./shared";

type CourierStat = { courier: string; region: string; delay: number; shipments: number; late: number; since: string | null };

/** Average days past promise per courier over the current window. */
export function courierStats(world: World, ctx: DetectorCtx): CourierStat[] {
  const { current } = ctx.windows;
  const groups = new Map<string, { region: string; delays: number[]; late: number; first: string }>();
  for (const s of world.shipments) {
    if (!s.deliveredAt || !inWindow(s.dispatchedAt, current)) continue;
    const delay = hoursBetween(s.promisedAt, s.deliveredAt) / 24;
    const g = groups.get(s.courier) ?? { region: s.region, delays: [], late: 0, first: s.dispatchedAt };
    g.delays.push(delay);
    if (delay > THRESHOLDS.lateDeliveryDays) g.late++;
    groups.set(s.courier, g);
  }
  return [...groups.entries()].map(([courier, g]) => {
    const firstEver = world.shipments.filter((s) => s.courier === courier).map((s) => s.dispatchedAt).sort()[0] ?? null;
    return { courier, region: g.region, delay: g.delays.reduce((a, b) => a + b, 0) / g.delays.length, shipments: g.delays.length, late: g.late, since: firstEver };
  });
}

/** Delivery complaints up a quarter and at least five against the previous window. */
export function complaintSpike(world: World, ctx: DetectorCtx): Finding[] {
  const { current, previous } = ctx.windows;
  const c = compareWindows(world, "complaints", ctx.windows);
  if (c.current < THRESHOLDS.complaintMinAbsRise || c.delta < THRESHOLDS.complaintMinAbsRise || c.deltaPct < THRESHOLDS.complaintRisePct) return [];
  const { onset, onsetEvidence } = metricOnset(world, "complaints", current);
  const slaCourier = courierStats(world, ctx).filter((s) => s.delay > THRESHOLDS.slaDelayDays).sort((a, b) => b.delay - a.delay)[0];
  const courierEvent = world.events.find((e) => e.kind === "courier_changed");
  // Affected customers: every shipment the slow courier has carried since it took over; failing
  // that, the customers who wrote in.
  const carried = slaCourier ? world.shipments.filter((s) => s.courier === slaCourier.courier && (!courierEvent || s.dispatchedAt >= courierEvent.at)) : [];
  const tickets = world.tickets.filter((t) => t.category === "delivery" && inWindow(t.createdAt, current));
  const affected = carried.length || tickets.length;
  const repeatRate = windowValue(world, "repeatRate", { from: ctx.windows.previous.from, to: current.to }) / 100 || 0.22;
  const aov = d2cOrderValue(world, { from: previous.from, to: current.to }) || 1250;
  const impact = affected * repeatRate * aov;
  const escalated = tickets.length > 0 && tickets.every((t) => t.status === "escalated");
  const evidence = [
    ...tickets.map((t) => ref(t.source, "ticket", t.id)),
    ...(courierEvent ? [ref(courierEvent.source, "event", courierEvent.id)] : []),
    ...carried.filter((s) => s.deliveredAt && hoursBetween(s.promisedAt, s.deliveredAt) / 24 > THRESHOLDS.lateDeliveryDays).slice(0, 6).map((s) => ref(s.source, "shipment", s.id)),
  ];
  return [
    finding({
      detector: "complaintSpike",
      severity: escalated ? "info" : "medium",
      title: escalated
        ? `Delivery complaints up from ${c.previous} to ${c.current}: courier escalated`
        : `Delivery complaints up from ${c.previous} to ${c.current}${slaCourier ? ` since the ${slaCourier.region} courier change` : " in two weeks"}`,
      impactINR: impact,
      confidence: slaCourier ? 0.85 : 0.6,
      window: current,
      onset,
      series: stripSeries(world, "complaints", current),
      evidence,
      explain: `${c.current} delivery complaints in the last 14 days against ${c.previous} before.${slaCourier ? ` ${slaCourier.courier} is averaging ${fmtDays(slaCourier.delay)} past promise on ${slaCourier.region} deliveries and has carried ${carried.length} shipments since taking over.` : ""} At a ${Math.round(repeatRate * 100)}% repeat rate and ${inrCompact(aov)} an order, about ${inrCompact(impact)} of repeat business is at risk.`,
      playbooks: ["escalateCourier"],
    }),
  ];
}

/** A courier averaging more than 1.5 days past promise. Folded into complaintSpike when one exists for the same courier. */
export function deliverySLA(world: World, ctx: DetectorCtx): Finding[] {
  const { current } = ctx.windows;
  const out: Finding[] = [];
  const repeatRate = windowValue(world, "repeatRate", { from: ctx.windows.previous.from, to: current.to }) / 100 || 0.22;
  const aov = d2cOrderValue(world, current) || 1250;
  for (const s of courierStats(world, ctx).filter((x) => x.delay > THRESHOLDS.slaDelayDays)) {
    const { onset, onsetEvidence } = metricOnset(world, "deliveryDelayAvg", current);
    const late = world.shipments.filter((x) => x.courier === s.courier && inWindow(x.dispatchedAt, current) && x.deliveredAt && hoursBetween(x.promisedAt, x.deliveredAt) / 24 > THRESHOLDS.lateDeliveryDays);
    if (!late.length) continue;
    out.push(
      finding({
        detector: "deliverySLA",
        severity: "medium",
        title: `${s.courier} is ${fmtDays(s.delay)} past promise on ${s.region} deliveries`,
        impactINR: late.length * repeatRate * aov,
        confidence: 0.8,
        window: current,
        onset,
        series: stripSeries(world, "deliveryDelayAvg", current),
        evidence: [...late.slice(0, 6).map((x) => ref(x.source, "shipment", x.id)), ...onsetEvidence],
        explain: `${s.courier} delivered ${late.length} of ${s.shipments} ${s.region} shipments in the last 14 days more than ${THRESHOLDS.lateDeliveryDays} days late, averaging ${fmtDays(s.delay)} past the promised date.`,
        playbooks: ["escalateCourier"],
      }),
    );
  }
  return out;
}
