# AI SDK notes

The facts a fresh machine needs to write correct Vercel AI SDK v6 code for this app. They were
copied from the Vercel plugin's `ai-sdk` and `ai-gateway` skills on 2026-10-08, because the next
machine may not have that plugin.

Nothing here was checked against an installed `ai` package: none was installed when this was
written. Treat every API name as a lead to confirm, and anything marked **verify** as unconfirmed.

## 1. First rule: installed docs beat memory

Model knowledge of the AI SDK is out of date. Before writing or fixing any AI code:

```bash
grep -r "ToolLoopAgent" node_modules/ai/docs node_modules/ai/src | head
ls node_modules/ai/docs
ls node_modules/@ai-sdk/react/docs 2>/dev/null     # provider and client packages ship docs too
```

- Docs: `node_modules/ai/docs/`. Source: `node_modules/ai/src/`.
- Provider packages: `node_modules/@ai-sdk/<provider>/docs/`.
- If a typecheck fails on an AI SDK property, look in the renames table below first, then grep.
- Be minimal: only pass options that differ from the defaults.
- If you cannot find documentation that supports what you are about to write, say so.

`scripts/bootstrap.sh` installs `ai`, `@ai-sdk/react` and `zod`.

## 2. Models and auth

**Model strings.** Pass a plain `"provider/model"` string as `model`. The AI SDK routes it through
Vercel AI Gateway with no wrapper and no provider package.

```ts
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  prompt: 'Hello',
});
```

Gateway slugs use **dots** for versions: `anthropic/claude-sonnet-5.5`, not `claude-sonnet-5-5`.
(The hyphenated form is the direct Anthropic API ID, which this app does not use.)

**IDs verified on 2026-10-08** from the gateway's model list:

| Role in this app | ID |
|---|---|
| Agents (investigator, operator) | `anthropic/claude-sonnet-5.5` |
| Cheap narration and classification | `anthropic/claude-haiku-5.5` |
| Fallback for the above | `anthropic/claude-haiku-4.5` |
| Available, not the default | `anthropic/claude-opus-5.5` |

All IDs live in one file, so a change is one edit:

```ts
// src/lib/ai/models.ts
export const MODELS = {
  agent: 'anthropic/claude-sonnet-5.5',
  fast: 'anthropic/claude-haiku-5.5',
  fastFallback: 'anthropic/claude-haiku-4.5',
} as const;
```

**Re-check before hardcoding.** The list changes.

```bash
curl -s https://ai-gateway.vercel.sh/v1/models \
  | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]'
```

The skill also mentions `gateway.getAvailableModels()` (`import { gateway } from 'ai'`) for the
same list from code. **Verify** it exists in the installed version before using it.

**Auth, in the order the gateway resolves it:**

1. `AI_GATEWAY_API_KEY` in the environment. This is the primary option for this repo because it
   works on any machine. Create one in the Vercel dashboard under AI Gateway, API Keys.
2. `VERCEL_OIDC_TOKEN`, written by `vercel link && vercel env pull .env.local`. Locally it expires
   in about 24 hours; re-run `vercel env pull .env.local --yes` to refresh. On Vercel deployments
   it is refreshed automatically.

No `ANTHROPIC_API_KEY` is needed. With neither of the above set, the app runs in scripted mode
(section 6).

**Phase 0 smoke test.** One tiny call per chosen ID, so a wrong ID or a missing key fails on day
one and not in front of judges. Skip it when no key is set.

```ts
// scripts/smoke-models.ts
import { generateText } from 'ai';
import { MODELS } from '../src/lib/ai/models';

for (const [role, model] of Object.entries(MODELS)) {
  const { text } = await generateText({
    model,
    prompt: 'Reply with the single word: ok',
    maxOutputTokens: 16,
  });
  console.log(role, model, '->', text.trim());
}
```

Run it with the env file loaded, for example
`node --env-file=.env.local --import tsx scripts/smoke-models.ts` (**verify** the exact invocation
for the installed `tsx` and Node versions).

**Failures.** The gateway skill documents `APICallError.isInstance(error)` with `error.statusCode`
(402 budget exhausted, 429 rate limited, 503 unavailable). In this app any live failure falls back
to the scripted stream when a script matches, and otherwise shows an inline error with a retry.

## 3. The renames

If you write the left column from memory, it is wrong in v6.

| Wrong (old) | Right (v6) |
|---|---|
| `maxTokens` | `maxOutputTokens` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| tool `parameters: z.object(...)` | tool `inputSchema: z.object(...)` |
| `generateObject({ schema })` | `generateText({ output: Output.object({ schema }) })`, read `result.output` |
| `JSON.parse(result.text)` | the same `Output.object`; never parse model text by hand |
| `result.toDataStreamResponse()` | `result.toUIMessageStreamResponse()` when the client is `useChat` |
| `useChat({ api })` with `input`, `handleInputChange`, `handleSubmit` | own the input with `useState`; `sendMessage({ text })`; `transport: new DefaultChatTransport({ api })` |
| `part.type === 'tool-invocation'` | typed parts: `part.type === 'tool-<toolName>'` |
| `part.toolInvocation.args` / `.result` / `.toolCallId` | `part.input` / `part.output` / `part.toolCallId` |
| states `partial-call` / `call` / `result` | `input-streaming` / `input-available` / `output-available` |
| `addToolResult({ toolCallId, result })` | `addToolOutput({ tool, toolCallId, output })` |
| `createAgentUIStreamResponse({ agent, messages })` | `createAgentUIStreamResponse({ agent, uiMessages: messages })` |

Minimal correct snippets:

```ts
// Limits, steps, tools
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const compareWindows = tool({
  description: 'Compare a metric across two windows',
  inputSchema: z.object({ metric: z.string() }),
  execute: async ({ metric }) => ({ metric, deltaPct: -14 }),
});

const result = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  tools: { compareWindows },
  stopWhen: stepCountIs(5),
  maxOutputTokens: 512,
  prompt: 'Why did revenue fall?',
});
```

```ts
// Structured output
import { generateText, Output } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: 'anthropic/claude-haiku-5.5',
  output: Output.object({
    schema: z.object({ narrative: z.string(), citations: z.array(z.string()) }),
  }),
  prompt: '...',
});
result.output; // typed

// Also: Output.array({ element: schema }), Output.choice({ options: [...] as const }), Output.json()
```

```ts
// Streaming to useChat
import { streamText } from 'ai';

const result = streamText({ model: 'anthropic/claude-sonnet-5.5', prompt });
return result.toUIMessageStreamResponse();
```

```tsx
// Client: input state is yours
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export function AskComposer() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ask' }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage({ text: input });
        setInput('');
      }}
    >
      <input value={input} onChange={(e) => setInput(e.target.value)} />
    </form>
  );
}
```

```tsx
// Rendering parts: check state before reading input or output
import { isToolUIPart } from 'ai';

message.parts.map((part) => {
  if (part.type === 'text') return part.text;

  if (part.type === 'tool-compareWindows') {
    if (part.state === 'output-available') return <Result input={part.input} output={part.output} />;
    if (part.state === 'input-available') return <Running input={part.input} />;
    return <Pending />; // input-streaming: part.input may be undefined
  }

  if (isToolUIPart(part)) return <GenericTool key={part.toolCallId} state={part.state} />; // catch-all
  return null;
});
```

`part.input` is only safe in `input-available` and `output-available`. `part.output` is only safe
in `output-available`. TypeScript enforces this (TS18048) when the message type is inferred from
the agent (section 4).

## 4. Agents

Use `ToolLoopAgent`. One file per agent, one file per tool.

```
src/lib/ai/
  models.ts
  mode.ts                 live | scripted resolution, scripted stream helper
  agents/investigator.ts  /api/ask
  agents/operator.ts      /api/act
  tools/*.ts              each wraps one engine function
```

```ts
// src/lib/ai/tools/compare-windows.ts
import { tool, type UIToolInvocation } from 'ai';
import { z } from 'zod';

export const compareWindowsTool = tool({
  description: 'Compare a metric across the current and previous window',
  inputSchema: z.object({ metric: z.string().describe('MetricId') }),
  execute: async ({ metric }) => {
    /* call the engine */
  },
});

// Export the invocation type so a UI component can import only the type
export type CompareWindowsInvocation = UIToolInvocation<typeof compareWindowsTool>;
```

```ts
// src/lib/ai/agents/investigator.ts
import { ToolLoopAgent, type InferAgentUIMessage } from 'ai';
import { MODELS } from '../models';
import { compareWindowsTool } from '../tools/compare-windows';

export const investigator = new ToolLoopAgent({
  model: MODELS.agent,
  instructions: 'You investigate one business question using the tools. Never state a number a tool did not return.',
  tools: { compareWindows: compareWindowsTool },
});

export type InvestigatorUIMessage = InferAgentUIMessage<typeof investigator>;
```

```tsx
// Client: the agent's message type is the useChat generic
const { messages } = useChat<InvestigatorUIMessage>({
  transport: new DefaultChatTransport({ api: '/api/ask' }),
});
// part.type is now 'text' | 'tool-compareWindows' | ..., with typed input and output
```

```ts
// src/app/api/ask/route.ts
import { createAgentUIStreamResponse } from 'ai'; // verify the export name and module
import { investigator } from '@/lib/ai/agents/investigator';

export async function POST(req: Request) {
  const { messages } = await req.json();
  return createAgentUIStreamResponse({ agent: investigator, uiMessages: messages });
}
```

Typed metadata on messages is available as a second type argument,
`InferAgentUIMessage<typeof agent, MyMetadata>`.

## 5. How this app uses it

| Route | Agent | What it does |
|---|---|---|
| `POST /api/ask` | investigator | Answers a "why" question. Tools wrap engine functions (`getMetricSeries`, `compareWindows`, `walkCausalGraph`, `listRecords`, `getRecord`, `runSimulation`). The final structured output cites evidence refs; the UI renders any uncited step as unverified. |
| `POST /api/act` | operator | Takes the engine-templated drafts for a playbook and rewrites them per recipient, in tone, using that recipient's thread. |
| `POST /api/explain` | none (one `generateText` on the fast model) | Short narrations: finding copy, chart captions. |

Rules that hold for all three:

- **The model never computes.** Every number in a response came out of a tool that called
  `src/engine`. Instructions say so, and the UI does not render figures from free text as facts.
- **The server is stateless.** The request body carries the client's `actions[]` log; the server
  replays it over the committed seed to rebuild the `World`, then runs the agent against it.
- **Tools need that per-request world.** The simplest shape is a factory,
  `createInvestigator(world)`, whose tools close over `world`, with the message type taken from
  `InferAgentUIMessage<ReturnType<typeof createInvestigator>>`. **Verify** first whether the
  installed SDK has a built-in way to pass per-call context to an agent or its tools (search the
  docs for `prepareCall`, `callOptionsSchema`, `experimental_context`); if it does, prefer it.
- **Sending `actions[]` from the client.** **Verify** the current way to add fields to the
  request body (search the docs for `prepareSendMessagesRequest` and for the options argument of
  `sendMessage`). Do not guess the shape.
- **Runtime.** Default Node.js runtime. Do not set `runtime = 'edge'`; streaming and
  server-sent events work on Node.

## 6. Scripted mode

Every AI surface must work with no key and no network. In scripted mode the route returns a
recorded response in the **same UI-message-stream wire format** as live mode, so the client code
path (`useChat`, typed parts, the trail renderer) is identical and there is one UI to test.

- Mode resolution lives in `src/lib/ai/mode.ts`: `MUNSHI_AI_MODE` is `auto` (live when a key or
  OIDC token is present, scripted otherwise), `live`, or `scripted`.
- Scripts live in `src/data/scripts/*.json`, one per demo question, as an ordered list of parts
  with timing hints. See `docs/ARCHITECTURE.md` for the file shape.
- **Scripted is not fake.** `scripts/record-scripts.ts` runs the real engine on the seed and writes
  the tool inputs and outputs into the script. Only the narrative sentences are written by hand.
- The UI shows which mode is active. Do not present a scripted answer as a live one.

**Confirm in `node_modules/ai/docs` before building this.** None of these names were verified
against an installed package today:

| Search for | Why |
|---|---|
| `createUIMessageStream` (confirm in node_modules/ai/docs) | Writing parts to a UI message stream by hand |
| `createUIMessageStreamResponse` (confirm in node_modules/ai/docs) | Turning that stream into a `Response` |
| `simulateReadableStream` (confirm in node_modules/ai/docs) | Emitting recorded chunks with delays |
| `MockLanguageModel` (confirm in node_modules/ai/docs; the class name carries a version suffix) | Alternative: a scripted *model* drives the real agent loop, so the real tools execute against the seed |
| custom data parts, `data-` (confirm in node_modules/ai/docs) | Sending the chain payload to the client as a typed part; confirm the naming rule and how the type is declared on the UI message |

Pick whichever is current. The two viable designs are (a) write the recorded parts straight into a
UI message stream, or (b) run the real agent with a mock model that replays recorded model turns.
Design (b) keeps tool execution real; design (a) is simpler. Either satisfies the contract above.

## 7. Approval

The Act flow's approval is a **UI state machine driven by playbook data**, not a chat tool call:
plan, drafts, approval card, apply effects, done. The operator agent only rewrites draft text.

If a tool-level approval is ever wanted (for example the investigator proposing an action from
inside `/ask`), search the installed docs for `needsApproval` before writing one by hand
(**verify** it exists and how the client answers it).

## 8. Checklist before committing AI code

- [ ] Grepped `node_modules/ai/docs` for every API used.
- [ ] No name from the left column of the renames table.
- [ ] Model IDs come from `src/lib/ai/models.ts`, and were re-checked with the curl.
- [ ] The surface works with `.env.local` absent.
- [ ] No number reaches the UI that a tool did not return.
- [ ] `pnpm typecheck` passes.
