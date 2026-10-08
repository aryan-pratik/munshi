import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateWorld } from "@/data/seed/generate";
import { STORIES } from "@/data/seed/stories";
import { dayOf, daysBetween, defaultWindows, now } from "@/engine/windows";
import { World } from "@/types";

const raw = readFileSync("src/data/seed/world.json", "utf8");
const world = World.parse(JSON.parse(raw));

describe("seed world", () => {
  it("is schema-valid, 90 days long and ends on the demo date", () => {
    expect(world.meta.days).toBe(90);
    expect(world.meta.day0).toBe("2026-07-11");
    expect(now(world)).toBe("2026-10-08");
    expect(defaultWindows(world)).toEqual({ current: { from: dayOf(world, 76), to: dayOf(world, 89) }, previous: { from: dayOf(world, 62), to: dayOf(world, 75) } });
  });

  it("is deterministic for the same seed and day0", () => {
    const again = generateWorld({ seed: world.meta.seed, day0: world.meta.day0, generatedAt: world.meta.generatedAt });
    expect(JSON.stringify(again)).toBe(raw);
  });

  it("stays under 1.5 MB", () => {
    expect(statSync("src/data/seed/world.json").size).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  });

  it("has every record carrying id, source and createdAt, with unique ids per collection", () => {
    for (const [key, value] of Object.entries(world)) {
      if (key === "meta" || !Array.isArray(value)) continue;
      const ids = new Set<string>();
      for (const r of value as { id: string; source?: string; createdAt?: string }[]) {
        expect(r.id).toBeTruthy();
        expect(ids.has(r.id), `${key} duplicate id ${r.id}`).toBe(false);
        ids.add(r.id);
        if (key !== "sources" && key !== "purchaseOrders") {
          expect(r.source, `${key} ${r.id} source`).toBeTruthy();
          expect(r.createdAt, `${key} ${r.id} createdAt`).toMatch(/^\d{4}-\d{2}-\d{2}/);
        }
      }
    }
  });

  it("keeps the business in the documented bands", () => {
    const today = now(world);
    const d2c = world.orders.filter((o) => o.channel === "d2c");
    const wholesale = world.orders.filter((o) => o.channel === "wholesale");
    const sum = (xs: { total: number }[]) => xs.reduce((s, o) => s + o.total, 0);
    expect(d2c.length).toBeGreaterThan(1600);
    expect(sum(d2c) / d2c.length).toBeGreaterThan(1180);
    expect(sum(d2c) / d2c.length).toBeLessThan(1320);
    expect(wholesale.length).toBeGreaterThan(125);
    expect(wholesale.length).toBeLessThan(155);
    const last30 = (o: { createdAt: string }) => daysBetween(o.createdAt, today) < 30;
    expect(d2c.filter(last30).length).toBeGreaterThan(600);
    expect(d2c.filter(last30).length).toBeLessThan(665);
    const paid = world.adDays.filter(last30).reduce((s, a) => s + a.sessions, 0);
    const organic = world.trafficDays.filter(last30).reduce((s, t) => s + t.organic, 0);
    expect(paid).toBeGreaterThan(10_800);
    expect(paid).toBeLessThan(12_000);
    expect(organic).toBeGreaterThan(12_000);
    expect(organic).toBeLessThan(13_200);
    expect(world.customers.filter((c) => c.type === "wholesale").length).toBeGreaterThanOrEqual(40);
    expect(world.shipments.length).toBe(d2c.length);
    expect(world.invoices.length).toBe(wholesale.length);
    expect(world.sources.find((s) => s.id === "freshdesk")?.status).toBe("syncing");
    expect(world.tasks).toEqual([]);
    expect(world.purchaseOrders).toEqual([]);
  });

  it("plants every story in the records", () => {
    for (const story of STORIES) {
      for (const r of story.report(world)) {
        expect(r.ok, `${story.id} ${r.label} = ${r.value}`).toBe(true);
      }
    }
  });

  it("writes exactly four events, one per onset anchor", () => {
    const byKind = Object.fromEntries(world.events.map((e) => [e.kind, daysBetween(world.meta.day0, e.at)]));
    expect(byKind).toEqual({ campaign_paused: 77, theme_updated: 79, courier_changed: 74, plan_upgraded: 60 });
    expect(world.events.map((e) => e.label).sort()).toEqual(
      ["Airtel plan auto-upgraded", "Delhi-NCR moved to a new courier", "Diwali Early campaign paused", "Shopify theme updated"].sort(),
    );
  });

  it("gives the seven stale leads threads a model can personalise from", () => {
    const stale = world.leads.filter((l) => l.stage === "quoted" && l.estValueINR >= 10_000 && daysBetween(l.lastContactedAt, now(world)) >= 2);
    expect(stale).toHaveLength(7);
    for (const l of stale) {
      expect(l.thread.length).toBeGreaterThanOrEqual(4);
      const last = world.messages.find((m) => m.id === l.thread[l.thread.length - 1].id)!;
      expect(last.direction).toBe("in");
      expect(last.body).toMatch(/\?/);
      expect(l.summary).toContain(l.shop);
    }
  });
});
