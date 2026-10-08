import type { Draft, Effect, Finding, Product, World } from "@/types";
import { TEMPLATES, fill } from "@/data/rules/playbooks";
import { SIGNATURE } from "@/data/rules/tone";
import { inr } from "@/lib/format";
import { addDays, now, nowAt } from "../windows";
import { plural, refsOf, step, type Playbook } from "./shared";

function productsOf(world: World, finding: Finding): Product[] {
  const ids = new Set(refsOf(finding, "product").map((r) => r.id));
  return world.products.filter((p) => ids.has(p.id));
}

/** Units sold in the last 30 days, and the order quantity: a month plus the lead time, less what is on hand, in dozens. */
export function reorderQty(world: World, p: Product) {
  const since = addDays(now(world), -29);
  let units = 0;
  for (const o of world.orders) if (o.createdAt >= since) for (const l of o.lines) if (l.sku === p.sku) units += l.qty;
  const perDay = units / 30;
  const need = perDay * (30 + p.leadTimeDays) - p.onHand;
  const qty = Math.max(12, Math.ceil(need / 12) * 12);
  return { perDay, qty };
}

export const reorderStock: Playbook = {
  id: "reorderStock",
  appliesTo: ["stockoutRisk"],
  plan(world, finding) {
    const ps = productsOf(world, finding);
    return [
      step("read", "read", `Work out the quantity from 30-day velocity, lead time and stock on hand for ${plural(ps.length, "SKU")}`),
      step("draft", "draft", "Draft the purchase order to the supplier"),
      step("approve", "approve", "You approve or change the quantity"),
      step("send", "send", "Email the purchase order"),
      step("update", "update", "Record the open purchase order against the SKU"),
    ];
  },
  drafts(world, finding) {
    return productsOf(world, finding).map((p) => {
      const { perDay, qty } = reorderQty(world, p);
      return {
        id: `draft:${p.id}`,
        to: { source: p.source, kind: "product" as const, id: p.id },
        channel: "email" as const,
        subject: `Purchase order: ${qty} × ${p.name}`,
        body: fill(TEMPLATES.reorderStock.email, { supplier: p.supplier.split(",")[0], qty, product: p.name, sku: p.sku, onHand: p.onHand, perDay: Math.max(1, Math.round(perDay)), leadTime: p.leadTimeDays, signature: SIGNATURE.email }),
        refs: [{ source: p.source, kind: "product" as const, id: p.id }],
      } satisfies Draft;
    });
  },
  apply(world, finding, approved) {
    const at = nowAt(world);
    return productsOf(world, finding)
      .filter((p) => approved.some((d) => d.to.id === p.id))
      .map((p): Effect => ({
        op: "create",
        collection: "purchaseOrders",
        record: { id: `po:${finding.id}:${p.sku}`, supplier: p.supplier, lines: [{ sku: p.sku, qty: reorderQty(world, p).qty }], createdAt: at, status: "sent" },
      }));
  },
  expectedImpact(world, finding) {
    const ps = productsOf(world, finding);
    return { inr: finding.impactINR, horizonDays: ps[0]?.leadTimeDays ?? 30, basis: `${inr(finding.impactINR)} of sales that would be lost between the stockout and the next batch` };
  },
  labels(n) {
    return { review: n === 1 ? "Review the order" : `Review ${n} orders`, approve: n === 1 ? "Approve and send the order" : `Approve and send ${n} orders`, working: "Sending…", done: n === 1 ? "Purchase order sent" : `${n} purchase orders sent` };
  },
};
