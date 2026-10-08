import { tool } from "ai";
import { z } from "zod";
import { RecordKind, type RecordRef, type World } from "@/types";
import { COLLECTION_OF } from "@/lib/records";
import { daysBetween, now } from "@/engine/windows";
import { worldContext } from "./context";

export const listRecordsInput = z.object({
  kind: RecordKind,
  where: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Field equality filters, e.g. { category: 'delivery' }"),
  sinceDays: z.number().int().min(1).max(90).optional().describe("Only records created in the last N days"),
  limit: z.number().int().min(1).max(50).default(10),
});

/** Records of one kind, filtered by field equality, newest first. */
export function listRecords(world: World, input: z.infer<typeof listRecordsInput>) {
  const today = now(world);
  const rows = (world[COLLECTION_OF[input.kind]] as Array<Record<string, unknown> & { id: string; createdAt?: string; source?: string }>).filter((r) => {
    if (input.where && Object.entries(input.where).some(([k, v]) => r[k] !== v)) return false;
    if (input.sinceDays && typeof r.createdAt === "string" && daysBetween(r.createdAt, today) >= input.sinceDays) return false;
    return true;
  });
  const sorted = [...rows].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const records = sorted.slice(0, input.limit);
  const refs: RecordRef[] = records.map((r) => ({ source: (r.source ?? "zoho-books") as RecordRef["source"], kind: input.kind, id: r.id }));
  return { kind: input.kind, count: rows.length, records, refs };
}

export const listRecordsTool = tool({
  description: "List source records of one kind (orders, tickets, invoices, leads, ...) with simple field filters. Returns the records and their refs to cite.",
  inputSchema: listRecordsInput,
  contextSchema: worldContext,
  execute: async (input, { context }) => listRecords(context.world, input),
});
