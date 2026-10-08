import { tool } from "ai";
import { z } from "zod";
import { RecordRef, type World } from "@/types";
import { findRecord } from "@/lib/records";
import { worldContext } from "./context";

export const getRecordInput = RecordRef;

/** One record by ref, or null. */
export function getRecord(world: World, ref: RecordRef) {
  return { ref, record: findRecord(world, ref) ?? null };
}

export const getRecordTool = tool({
  description: "Open one source record by its ref (source, kind, id), for example a WhatsApp message or an invoice.",
  inputSchema: getRecordInput,
  contextSchema: worldContext,
  execute: async (input, { context }) => getRecord(context.world, input),
});
