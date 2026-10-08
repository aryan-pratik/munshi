import { Output, ToolLoopAgent, isStepCount, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { Action, type Chain } from "@/types";
import { replay } from "@/engine";
import { seedWorld } from "@/data/seed";
import { TONE } from "@/data/rules/tone";
import { MODELS } from "../models";
import { contextFor, investigatorTools } from "../tools";

// The investigator answers one "why" question with the tools (docs/AI_SDK_NOTES.md, section 4).
// Its final output is structured; the route writes it to the client as the `data-answer` part.

export const answerSchema = z.object({
  chainId: z.string().nullable().describe("The id of the Chain from walkCausalGraph the answer rests on, or null"),
  narrative: z.string().describe("The answer: the conclusion first, then supporting paragraphs separated by blank lines"),
  citations: z.array(z.string()).describe("Record refs as source:kind:id for every figure quoted"),
});
export type Answer = z.infer<typeof answerSchema>;

export type AiMode = "live" | "scripted";

export type InvestigatorUIMessage = UIMessage<
  never,
  { mode: { mode: AiMode }; chain: Chain; answer: Answer },
  InferUITools<typeof investigatorTools>
>;

const INSTRUCTIONS = `${TONE}

You answer one question about the business using the tools. Rules:
- Every number you state must come from a tool result in this conversation. Never estimate.
- For a "why" question: compareWindows on the metric, then walkCausalGraph on the metric that moved, then explain the chain in onset order. Say "likely" and "began the day of", never "caused".
- Cite the record refs (source:kind:id) behind each figure in citations.
- Write the narrative as the conclusion in one or two sentences, then two or three short paragraphs. Plain sentences, no headings, no bullet points, no markdown.`;

export const investigator = new ToolLoopAgent({
  model: MODELS.agent,
  instructions: INSTRUCTIONS,
  tools: investigatorTools,
  stopWhen: isStepCount(10),
  maxOutputTokens: 1500,
  output: Output.object({ schema: answerSchema }),
  callOptionsSchema: z.object({ actions: z.array(Action) }),
  toolsContext: contextFor(seedWorld()),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    toolsContext: contextFor(replay(seedWorld(), options.actions)),
  }),
});
