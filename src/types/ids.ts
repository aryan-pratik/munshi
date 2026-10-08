import { z } from "zod";

// Identifier unions. zod enums so every boundary (seed, tools, API bodies) can validate them.

export const SourceId = z.enum([
  "shopify",
  "razorpay",
  "meta-ads",
  "shiprocket",
  "whatsapp",
  "gmail",
  "zoho-books",
  "hdfc",
  "freshdesk",
  "calendar",
]);
export type SourceId = z.infer<typeof SourceId>;

export const RecordKind = z.enum([
  "customer",
  "product",
  "order",
  "shipment",
  "lead",
  "message",
  "invoice",
  "bill",
  "subscription",
  "adDay",
  "trafficDay",
  "ticket",
  "bankTxn",
  "obligation",
  "event",
  "task",
  "purchaseOrder",
]);
export type RecordKind = z.infer<typeof RecordKind>;

export const MetricId = z.enum([
  "adSpend",
  "sessions",
  "d2cCvr",
  "landingCvr",
  "leadsNew",
  "leadsContacted",
  "leadCvr",
  "ordersD2C",
  "ordersWholesale",
  "revenue",
  "revenueD2C",
  "revenueWholesale",
  "aov",
  "deliveryDelayAvg",
  "complaints",
  "repeatRate",
  "cashBalance",
  "receivablesOverdue",
  "subscriptionSpend",
]);
export type MetricId = z.infer<typeof MetricId>;

export const DetectorId = z.enum([
  "staleHighValueLeads",
  "overdueInvoices",
  "conversionDrop",
  "complaintSpike",
  "costCreep",
  "zombieSubscription",
  "customerConcentration",
  "cashCrunch",
  "stockoutRisk",
  "adEfficiency",
  "renewalDue",
  "deliverySLA",
]);
export type DetectorId = z.infer<typeof DetectorId>;

export const PlaybookId = z.enum([
  "followUpLeads",
  "collectOverdue",
  "cancelSubscription",
  "escalateCourier",
  "reorderStock",
  "scheduleRenewal",
]);
export type PlaybookId = z.infer<typeof PlaybookId>;

export const EventKind = z.enum([
  "campaign_paused",
  "theme_updated",
  "courier_changed",
  "plan_upgraded",
  "price_changed",
]);
export type EventKind = z.infer<typeof EventKind>;
