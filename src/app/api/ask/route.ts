import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from "ai";
import { z } from "zod";
import { Action } from "@/types";
import { investigator, type InvestigatorUIMessage } from "@/lib/ai/agents/investigator";
import { investigatorTools } from "@/lib/ai/tools";
import { modePart, resolveMode, scriptedStream, UNREACHABLE, writePlain, writeScripted, type Chunk } from "@/lib/ai/mode";
import { matchScript } from "@/lib/ai/scripts";

// POST /api/ask { messages, questionId?, text?, actions } (docs/ARCHITECTURE.md, section 5).
// Scripted replays a recorded answer; live runs the investigator over the replayed world and falls
// back to the script when the model fails before its first byte (auto mode only).

export const maxDuration = 60;

const Body = z.object({
  messages: z.array(z.custom<UIMessage>()).default([]),
  questionId: z.string().optional(),
  text: z.string().optional(),
  actions: z.array(Action).default([]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { messages, questionId, actions } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = parsed.data.text ?? lastUser?.parts.filter((p) => p.type === "text").map((p) => p.text).join(" ");
  const script = matchScript(questionId, text);
  const resolved = resolveMode(req);

  if (resolved.mode === "error") return Response.json({ error: resolved.message }, { status: 503 });

  if (resolved.mode === "scripted") {
    return createUIMessageStreamResponse({
      stream: scriptedStream(script?.parts ?? null, { signal: req.signal }),
      headers: { "x-munshi-mode": "scripted" },
    });
  }

  const fallback = resolved.fallback ? script : null;
  let modeSent: "live" | "scripted" = "live";
  const stream = createUIMessageStream<InvestigatorUIMessage>({
    execute: async ({ writer }) => {
      let result;
      try {
        result = await investigator.stream({
          prompt: await convertToModelMessages(messages, { tools: investigatorTools }),
          options: { actions },
          abortSignal: req.signal,
          onStepEnd: ({ toolResults }) => {
            for (const r of toolResults) {
              if (!r.dynamic && r.toolName === "walkCausalGraph") writer.write({ type: "data-chain", id: r.toolCallId, data: r.output });
            }
          },
        });
      } catch {
        return afterFailure(writer);
      }
      const live = toUIMessageStream({ stream: result.stream, tools: investigatorTools, sendFinish: false }) as ReadableStream<Chunk>;
      const reader = live.getReader();
      const held: Chunk[] = [];
      let committed = false;
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        if (!committed && chunk.type === "error") return afterFailure(writer);
        if (!committed && (chunk.type === "start" || chunk.type === "start-step")) {
          held.push(chunk);
          continue;
        }
        if (!committed) {
          committed = true;
          writer.write(modePart("live"));
          for (const h of held) writer.write(h);
        }
        writer.write(chunk);
      }
      try {
        writer.write({ type: "data-answer", id: "answer", data: await result.output });
      } catch {
        // the model finished without a parseable answer; the text parts stand on their own
      }
      writer.write({ type: "finish" });
    },
    onError: (e) => (e instanceof Error ? e.message : "The model failed."),
  });

  async function afterFailure(writer: Parameters<Parameters<typeof createUIMessageStream<InvestigatorUIMessage>>[0]["execute"]>[0]["writer"]) {
    modeSent = "scripted";
    writer.write(modePart("scripted"));
    if (fallback) return writeScripted(writer, fallback.parts, { signal: req.signal });
    return writePlain(writer, UNREACHABLE);
  }

  return createUIMessageStreamResponse({ stream, headers: { "x-munshi-mode": modeSent } });
}
