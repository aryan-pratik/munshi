import { createUIMessageStream, type InferUIMessageChunk, type UIMessageStreamWriter } from "ai";
import type { AiMode, InvestigatorUIMessage } from "./agents/investigator";
import type { ScriptPart } from "./scripts";

// Mode resolution and the scripted stream (docs/ARCHITECTURE.md, section 5; docs/AI_SDK_NOTES.md,
// section 6). Scripted never calls the model. Both modes speak the same UI-message-stream format.

export type Resolved = { mode: "scripted" } | { mode: "live"; fallback: boolean } | { mode: "error"; message: string };

export function resolveMode(req: Request, env: Record<string, string | undefined> = process.env): Resolved {
  const setting = (env.MUNSHI_AI_MODE ?? "auto").toLowerCase();
  const hasKey = !!env.AI_GATEWAY_API_KEY || !!env.VERCEL_OIDC_TOKEN || !!req.headers.get("x-vercel-oidc-token");
  if (setting === "scripted") return { mode: "scripted" };
  if (setting === "live") return hasKey ? { mode: "live", fallback: false } : { mode: "error", message: "No AI key is configured." };
  return hasKey ? { mode: "live", fallback: true } : { mode: "scripted" };
}

export const UNKNOWN_IN_DEMO = "I only know these questions in demo mode.";
export const UNREACHABLE = "I could not reach the model and have no recorded answer for this question.";

export type Chunk = InferUIMessageChunk<InvestigatorUIMessage>;
export type Writer = UIMessageStreamWriter<InvestigatorUIMessage>;

const sleep = (ms: number, signal?: AbortSignal) =>
  ms > 0 && !signal?.aborted ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/** Writes a script as UI message chunks with its timing hints, in the shape a live agent produces. */
export async function writeScripted(writer: Writer, parts: ScriptPart[], opts: { signal?: AbortSignal; pace?: number } = {}) {
  const pace = opts.pace ?? 1;
  const { signal } = opts;
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });
  let n = 0;
  let afterTool = false;
  for (const part of parts) {
    if (signal?.aborted) return;
    const id = `s${n++}`;
    if (part.type !== "tool") await sleep((part.delayMs ?? 0) * pace, signal);
    if (part.type === "text") {
      if (afterTool) {
        writer.write({ type: "finish-step" });
        writer.write({ type: "start-step" });
        afterTool = false;
      }
      writer.write({ type: "text-start", id });
      for (const word of part.text.split(/(?<=\s)/)) {
        writer.write({ type: "text-delta", id, delta: word });
        await sleep(18 * pace, signal);
      }
      writer.write({ type: "text-end", id });
    } else if (part.type === "data-chain") {
      writer.write({ type: "data-chain", id, data: part.data });
    } else if (part.type === "data-answer") {
      writer.write({ type: "data-answer", id: "answer", data: part.data });
    } else {
      writer.write({ type: "tool-input-available", toolCallId: id, toolName: part.tool, input: part.input });
      await sleep((part.delayMs ?? 0) * pace, signal);
      writer.write({ type: "tool-output-available", toolCallId: id, output: part.output });
      afterTool = true;
    }
  }
  writer.write({ type: "finish-step" });
  writer.write({ type: "finish", finishReason: "stop" });
}

/** A one-sentence answer with no tools, for the unknown-question and unreachable cases. */
export async function writePlain(writer: Writer, text: string) {
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });
  writer.write({ type: "text-start", id: "plain" });
  writer.write({ type: "text-delta", id: "plain", delta: text });
  writer.write({ type: "text-end", id: "plain" });
  writer.write({ type: "finish-step" });
  writer.write({ type: "finish", finishReason: "stop" });
}

export const modePart = (mode: AiMode): Chunk => ({ type: "data-mode", id: "mode", data: { mode } });

/** The whole scripted response as a stream: the mode part, then the script. */
export function scriptedStream(parts: ScriptPart[] | null, opts: { signal?: AbortSignal; pace?: number } = {}) {
  return createUIMessageStream<InvestigatorUIMessage>({
    execute: async ({ writer }) => {
      writer.write(modePart("scripted"));
      if (parts) await writeScripted(writer, parts, opts);
      else await writePlain(writer, UNKNOWN_IN_DEMO);
    },
  });
}
