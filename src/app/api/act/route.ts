import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { Action, PlaybookId, type Draft, type Step } from "@/types";
import { seedWorld } from "@/data/seed";
import { replay } from "@/engine";
import type { AiMode } from "@/lib/ai/agents/investigator";
import { rewriteDrafts } from "@/lib/ai/agents/operator";
import { resolveMode } from "@/lib/ai/mode";
import { actPlan } from "@/lib/act";

// POST /api/act { findingId, playbook?, actions } (docs/ARCHITECTURE.md, section 5). The reply is a
// UI message stream: `data-mode`, then `data-plan` { steps, drafts }. Scripted streams the engine's
// template drafts; live asks the operator to rewrite them in tone and falls back to the templates
// when the model fails (auto mode). Nothing here sends anything: approval happens on the client.

export const maxDuration = 60;

export type ActUIMessage = UIMessage<never, { mode: { mode: AiMode }; plan: { steps: Step[]; drafts: Draft[] } }>;

const Body = z.object({
  findingId: z.string(),
  playbook: PlaybookId.optional(),
  actions: z.array(Action).default([]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { findingId, playbook, actions } = parsed.data;
  const world = replay(seedWorld(), actions);
  const found = actPlan(world, findingId, playbook);
  if (!found) return Response.json({ error: "No open finding with that id" }, { status: 404 });

  const resolved = resolveMode(req);
  if (resolved.mode === "error") return Response.json({ error: resolved.message }, { status: 503 });

  let mode: AiMode = resolved.mode;
  let drafts = found.plan.drafts;
  if (resolved.mode === "live") {
    try {
      drafts = await rewriteDrafts(world, found.finding, drafts, req.signal);
    } catch (e) {
      if (!resolved.fallback) return Response.json({ error: e instanceof Error ? e.message : "The model failed." }, { status: 502 });
      mode = "scripted";
      drafts = found.plan.drafts;
    }
  }

  const stream = createUIMessageStream<ActUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "data-mode", id: "mode", data: { mode } });
      writer.write({ type: "data-plan", id: "plan", data: { steps: found.plan.steps, drafts } });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream, headers: { "x-munshi-mode": mode } });
}
