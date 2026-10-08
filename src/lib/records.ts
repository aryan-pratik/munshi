import type { CollectionKey, RecordKind, RecordRef, World } from "@/types";

// Resolving a RecordRef to the record it names. Evidence lists, popovers and the Vault all go
// through here, so "the record itself" is always the same object the engine saw.

export const COLLECTION_OF: Record<RecordKind, CollectionKey> = {
  customer: "customers",
  product: "products",
  order: "orders",
  shipment: "shipments",
  lead: "leads",
  message: "messages",
  invoice: "invoices",
  bill: "bills",
  subscription: "subscriptions",
  adDay: "adDays",
  trafficDay: "trafficDays",
  ticket: "tickets",
  bankTxn: "bankTxns",
  obligation: "obligations",
  event: "events",
  task: "tasks",
  purchaseOrder: "purchaseOrders",
};

export type RecordByKind = {
  customer: World["customers"][number];
  product: World["products"][number];
  order: World["orders"][number];
  shipment: World["shipments"][number];
  lead: World["leads"][number];
  message: World["messages"][number];
  invoice: World["invoices"][number];
  bill: World["bills"][number];
  subscription: World["subscriptions"][number];
  adDay: World["adDays"][number];
  trafficDay: World["trafficDays"][number];
  ticket: World["tickets"][number];
  bankTxn: World["bankTxns"][number];
  obligation: World["obligations"][number];
  event: World["events"][number];
  task: World["tasks"][number];
  purchaseOrder: World["purchaseOrders"][number];
};

export type AnyRecord = RecordByKind[RecordKind];

export function findRecord<K extends RecordKind>(world: World, ref: RecordRef & { kind: K }): RecordByKind[K] | undefined {
  const rows = world[COLLECTION_OF[ref.kind]] as { id: string }[];
  return rows.find((r) => r.id === ref.id) as RecordByKind[K] | undefined;
}

export const refKey = (ref: RecordRef) => `${ref.source}:${ref.kind}:${ref.id}`;

export function parseRefKey(key: string): RecordRef | null {
  const [source, kind, ...rest] = key.split(":");
  if (!source || !kind || !rest.length) return null;
  return { source, kind, id: rest.join(":") } as RecordRef;
}

/** Where "Open in Vault" goes. */
export const vaultHref = (ref: RecordRef) => `/vault?record=${encodeURIComponent(refKey(ref))}`;

export function customerName(world: World, id: string): string {
  const c = world.customers.find((x) => x.id === id);
  return c ? (c.shop ?? c.name) : id;
}

export function productName(world: World, sku: string): string {
  return world.products.find((p) => p.sku === sku)?.name ?? sku;
}

/** Refs in order, without duplicates. */
export function uniqueRefs(refs: RecordRef[]): RecordRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const k = refKey(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
