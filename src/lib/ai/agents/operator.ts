import { generateText, Output } from "ai";
import { z } from "zod";
import type { Draft, Finding, World } from "@/types";
import { TONE } from "@/data/rules/tone";
import { findRecord } from "@/lib/records";
import { MODELS } from "@/lib/ai/models";

// The operator (docs/ARCHITECTURE.md, section 5; docs/AI_SDK_NOTES.md, section 5): rewrites the
// engine's template drafts in tone, per recipient, using that recipient's thread. It never changes
// a figure, a date, a name or a product: those came from the engine. Scripted mode never calls it.

const rewriteSchema = z.object({
  drafts: z.array(z.object({ id: z.string(), body: z.string() })),
});

const RULES = `You are rewriting follow-up drafts that Munshi already prepared. For each draft, return the same id with a body rewritten in the voice above.
Keep every number, rupee figure, date, quantity, product and name exactly as given. Do not add facts or offers.
Keep the channel's shape: WhatsApp drafts stay two or three short lines with no sign-off block; email drafts keep "Dear <first name>" and the signature block as given.
Return every draft, in the same order, and nothing else.`;

/** Rewrites each draft in tone. Throws when the model fails; the caller falls back to the templates. */
export async function rewriteDrafts(world: World, finding: Finding, drafts: Draft[], abortSignal?: AbortSignal): Promise<Draft[]> {
  const context = drafts.map((d) => ({ id: d.id, channel: d.channel, subject: d.subject, body: d.body, thread: threadOf(world, d) }));
  const result = await generateText({
    model: MODELS.fast,
    system: `${TONE}\n\n${RULES}`,
    prompt: `Finding: ${finding.title}\n\nDrafts with the last messages of each thread:\n${JSON.stringify(context, null, 2)}`,
    output: Output.object({ schema: rewriteSchema }),
    maxOutputTokens: 2500,
    abortSignal,
  });
  const byId = new Map(result.output.drafts.map((d) => [d.id, d.body]));
  return drafts.map((d) => {
    const body = byId.get(d.id)?.trim();
    return body ? { ...d, body } : d;
  });
}

/** The last inbound lines of the recipient's thread, so the rewrite answers what was asked. */
function threadOf(world: World, draft: Draft): string[] {
  return draft.refs
    .filter((r) => r.kind === "message")
    .map((r) => findRecord(world, { ...r, kind: "message" }))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .slice(-3)
    .map((m) => `${m.direction === "in" ? m.from : "Meera"}: ${m.body}`);
}
