import { z } from "zod";
import { Chain } from "@/types";
import { answerSchema } from "./agents/investigator";
import whyRevenueFell from "@/data/scripts/why-revenue-fell.json";
import whyComplaintsUp from "@/data/scripts/why-complaints-up.json";
import whichCustomersAtRisk from "@/data/scripts/which-customers-at-risk.json";
import whatShouldIDoToday from "@/data/scripts/what-should-i-do-today.json";

// Recorded answers for scripted mode (docs/ARCHITECTURE.md, section 5). Tool inputs and outputs
// in these files were produced by running the engine (scripts/record-scripts.ts); only the
// narrative sentences are written by hand.

export const ScriptPart = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string(), delayMs: z.number().optional() }),
  z.object({ type: z.literal("tool"), tool: z.string(), input: z.unknown(), output: z.unknown(), delayMs: z.number().optional() }),
  z.object({ type: z.literal("data-chain"), data: Chain, delayMs: z.number().optional() }),
  z.object({ type: z.literal("data-answer"), data: answerSchema, delayMs: z.number().optional() }),
]);
export type ScriptPart = z.infer<typeof ScriptPart>;

export const Script = z.object({ id: z.string(), question: z.string(), match: z.array(z.string()), parts: z.array(ScriptPart) });
export type Script = z.infer<typeof Script>;

const RAW = [whyRevenueFell, whyComplaintsUp, whichCustomersAtRisk, whatShouldIDoToday];
let cache: Script[] | null = null;

export function scripts(): Script[] {
  if (!cache) cache = RAW.map((s) => Script.parse(s));
  return cache;
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** By id first; else the script whose match phrases best cover the text, or null. */
export function matchScript(questionId: string | undefined, text: string | undefined): Script | null {
  const all = scripts();
  if (questionId) {
    const byId = all.find((s) => s.id === questionId);
    if (byId) return byId;
  }
  if (!text) return null;
  const words = new Set(normalise(text));
  if (!words.size) return null;
  let best: { script: Script; score: number } | null = null;
  for (const script of all) {
    for (const phrase of [script.question, ...script.match]) {
      const p = normalise(phrase);
      if (!p.length) continue;
      const hit = p.filter((w) => words.has(w)).length / p.length;
      if (hit >= 0.6 && (!best || hit > best.score)) best = { script, score: hit };
    }
  }
  return best?.script ?? null;
}
