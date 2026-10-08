# AI SDK notes

The facts a fresh machine needs to write correct Vercel AI SDK code for this app.

**Verified 2026-10-09** against the versions `scripts/bootstrap.sh` installs: `ai@7.0.131`,
`@ai-sdk/react@4.0.134`, `zod@4.6.5`, `next@16.4.0`. **The installed major is v7, not v6.** v6-era
guidance (including the Vercel plugin skills this file was first copied from) is wrong in the places
listed in section 3. AI SDK 7 is ESM-only and needs Node 22 or later
(`node_modules/ai/docs/08-migration-guides/23-migration-guide-7-0.mdx`).

How each item below was checked:

- **docs**: stated in the bundled docs; the path follows, relative to the repo root.
- **types**: a snippet using it passed `tsc --noEmit` against the installed `.d.ts`. Every
  TypeScript block in this file was type-checked this way, copied verbatim into a scaffold with
  stand-in `@/types` and `@/engine` modules (fragments inside a minimal wrapper).
- **run**: executed with no network, against `MockLanguageModelV4` or by reading a stream back
  through `readUIMessageStream`. The files of sections 4 and 6 were also built with `next build`
  with `cacheComponents` on, and a scripted POST route was served with `next start`.
- **unverified**: not found in the installed packages. What was searched is stated.

No call was made to a real model, so nothing here proves what a live gateway response looks like.

Where the bundled docs and the types disagree, the types win. Two doc errors found:
`03-agents/05-configuring-call-options.mdx` passes `messages` to `createAgentUIStreamResponse` (the
parameter is `uiMessages`), and `04-ai-sdk-ui/20-streaming-data.mdx` shows `useChat({ api })` (there
is no `api` option).

## 1. First rule: installed docs beat memory

Model knowledge of the AI SDK is out of date. Before writing or fixing any AI code:

```bash
ls node_modules/ai/docs
grep -rn "ToolLoopAgent" node_modules/ai/docs node_modules/ai/src | head
grep -n "isStepCount\|createAgentUIStreamResponse" node_modules/ai/dist/index.d.ts | head
ls node_modules/ai/../@ai-sdk/gateway/docs        # gateway docs: a transitive dependency
```

- Docs: `node_modules/ai/docs/`. Source: `node_modules/ai/src/`. Types: `node_modules/ai/dist/index.d.ts`.
- The v6 to v7 changes: `node_modules/ai/docs/08-migration-guides/23-migration-guide-7-0.mdx`.
- `@ai-sdk/react` ships no `docs/` folder (only `README.md`, `src/`, `dist/`). `useChat` is
  documented in `node_modules/ai/docs/04-ai-sdk-ui/` and `07-reference/02-ai-sdk-ui/01-use-chat.mdx`.
- `@ai-sdk/gateway` is not a direct dependency, so `node_modules/@ai-sdk/gateway` does not exist
  under pnpm. Its docs are at `node_modules/ai/../@ai-sdk/gateway/docs/00-ai-gateway.mdx`. Import
  `gateway` from `'ai'`, never from `'@ai-sdk/gateway'`.
- If a typecheck fails on an AI SDK property, look in the renames table below first, then grep.
- Be minimal: only pass options that differ from the defaults.
- If you cannot find documentation that supports what you are about to write, say so.

`scripts/bootstrap.sh` installs `ai`, `@ai-sdk/react` and `zod`.

## 2. Models and auth

**Model strings.** Pass a plain `"provider/model"` string as `model`. The AI Gateway is the default
global provider, so the string routes through it with no wrapper and no provider package.
(docs: `node_modules/ai/docs/02-getting-started/00-choosing-a-provider.mdx`,
`03-ai-sdk-core/45-provider-management.mdx`; types)

```ts
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  prompt: 'Hello',
});
```

Gateway slugs use **dots** for versions: `anthropic/claude-sonnet-5.5`, not `claude-sonnet-5-5`.
(The hyphenated form is the direct Anthropic API ID, which this app does not use.)

**IDs verified on 2026-10-08** from the gateway's model list. All four are also members of the
installed `GatewayModelId` type (`node_modules/ai/../@ai-sdk/gateway/src/gateway-language-model-settings.ts`).
That type also accepts any string, so a typo still compiles: the smoke test is the real check.

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

**Re-check before hardcoding.** The list changes. From code (docs:
`node_modules/ai/../@ai-sdk/gateway/docs/00-ai-gateway.mdx`, "Dynamic Model Discovery"; types):

```ts
import { gateway } from 'ai';

const { models } = await gateway.getAvailableModels();
console.log(models.filter((m) => m.id.startsWith('anthropic/')).map((m) => m.id));
```

From a shell, the curl this file used before. **Unverified**: the installed docs and source never
mention a `/v1/models` endpoint (searched `ai-gateway.vercel.sh` in `ai/docs`, gateway `docs` and
`src`; the SDK's own base URL is `https://ai-gateway.vercel.sh/v4/ai`).

```bash
curl -s https://ai-gateway.vercel.sh/v1/models \
  | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]'
```

**Auth, in the order the gateway resolves it** (docs: gateway doc, "Authentication"; source:
`getGatewayAuthToken` in `node_modules/ai/../@ai-sdk/gateway/src/gateway-provider.ts`):

1. `AI_GATEWAY_API_KEY` in the environment. This is the primary option for this repo because it
   works on any machine. Create one in the Vercel dashboard under AI Gateway, API Keys. If a key is
   present it is always used, even when it is invalid.
2. A Vercel OIDC token: the `x-vercel-oidc-token` request header on Vercel, else
   `process.env.VERCEL_OIDC_TOKEN` (source: `@vercel/oidc`). Locally, `vercel env pull` writes it
   and it **expires after 12 hours** (formerly noted here as about 24); pull again to refresh, or
   use `vercel dev`. On Vercel deployments it is handled automatically. The exact CLI flags
   (`vercel link`, `vercel env pull .env.local --yes`) are **unverified**: the installed docs only
   say "run `vercel env pull`".

No `ANTHROPIC_API_KEY` is needed. With neither of the above set, the app runs in scripted mode
(section 6). Because a deployment may get its OIDC token from the request header and not from the
environment, `MUNSHI_AI_MODE=auto` should not rely on `VERCEL_OIDC_TOKEN` alone there: set
`AI_GATEWAY_API_KEY` or `MUNSHI_AI_MODE=live` on Vercel.

**Phase 0 smoke test.** One tiny call per chosen ID, so a wrong ID or a missing key fails on day
one and not in front of judges. It skips itself when no key is set.

```ts
// scripts/smoke-models.ts
import { generateText } from 'ai';
import { MODELS } from '../src/lib/ai/models';

async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // no .env.local: fall through to the key check
  }
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    console.log('smoke-models: no key, skipping (scripted mode needs none)');
    return;
  }
  for (const [role, model] of Object.entries(MODELS)) {
    try {
      const { text } = await generateText({
        model,
        prompt: 'Reply with the single word: ok',
        maxOutputTokens: 16,
        maxRetries: 0,
      });
      console.log('ok  ', role, model, '->', text.trim());
    } catch (error) {
      process.exitCode = 1;
      const e = error as { name?: string; statusCode?: number; message?: string };
      console.error('FAIL', role, model, e.name, e.statusCode ?? '', e.message);
    }
  }
}

main();
```

Run it with `pnpm dlx tsx scripts/smoke-models.ts` (run, with no key: resolves `ai` and exits at
the skip). Two things that were tried and fail:

- Top-level `await` in a `.ts` script under `tsx`: `package.json` has no `"type": "module"`, so tsx
  compiles to CommonJS and throws a `TransformError`. Keep the `main()` wrapper.
- Plain `node scripts/smoke-models.ts` (Node strips types natively): it needs `'../src/lib/ai/models.ts'`
  with the extension, and then `pnpm typecheck` fails with TS5097. Use tsx.

**Failures.**

- The gateway provider converts a failed model call into a `GatewayError` subclass
  (`GatewayAuthenticationError`, `GatewayRateLimitError`, `GatewayModelNotFoundError`,
  `GatewayInternalServerError`, ...) with a numeric `statusCode`. These extend `Error`, not
  `APICallError`; the original `APICallError` is `error.cause` (source:
  `node_modules/ai/../@ai-sdk/gateway/src/errors/`, read, not triggered). `ai` does not re-export
  the classes, so read `statusCode` structurally as the smoke test does. Formerly noted here as
  `APICallError.isInstance(error)`. **Unverified**: what specific codes mean (402 budget, 503
  unavailable). Searched `402`, `insufficient`, `payment` in the gateway docs and source: no hits;
  only 429 appears, as the `GatewayRateLimitError` default.
- In a streamed response a model failure does **not** throw out of the route. The response is
  already a 200 and the failure arrives as an `error` chunk, so `useChat` ends with
  `status === 'error'` and `error` set. On the server, the `onError` option of
  `createAgentUIStreamResponse` / `toUIMessageStream` / `createUIMessageStream` receives the raw
  error and returns the string sent to the client (default `'An error occurred.'`). (docs:
  `node_modules/ai/docs/04-ai-sdk-ui/02-chatbot.mdx`, "Error Messages"; run with a mock model that
  throws: the chunks were `start`, then `error`.)
- `APICallError.isInstance(error)` is still right on the **client**, in `useChat({ onError })`, when
  the route itself returns a non-2xx (docs: `node_modules/ai/docs/04-ai-sdk-ui/21-error-handling.mdx`).
- In this app, with `MUNSHI_AI_MODE=auto`, a live failure before the first streamed byte falls back
  to the matching script (pattern in section 6), and otherwise shows a plain message with a retry
  (`regenerate({ body: { actions } })`). With `MUNSHI_AI_MODE=live` the error is shown and there is
  no fallback. The full table is in `docs/ARCHITECTURE.md`, section 5.

## 3. The renames

If you write the left column from memory, it is wrong in v7. The last column says where the right
column is confirmed; paths are under `node_modules/ai/docs/`, and "migration" means
`08-migration-guides/23-migration-guide-7-0.mdx`. Every right-hand form is also type-checked.

| Wrong (old) | Right (v7) | Confirmed in |
|---|---|---|
| `maxTokens` | `maxOutputTokens` | `03-ai-sdk-core/25-settings.mdx` |
| `maxSteps: 5` | `stopWhen: isStepCount(5)` (formerly `stepCountIs`, still exported, deprecated) | migration; `07-reference/01-ai-sdk-core/70-is-step-count.mdx` |
| `system: '...'` | `instructions: '...'` (`system` is a deprecated fallback; `role: 'system'` inside `messages` is rejected by default) | migration |
| tool `parameters: z.object(...)` | tool `inputSchema: z.object(...)` | `07-reference/01-ai-sdk-core/20-tool.mdx` |
| `generateObject({ schema })` | `generateText({ output: Output.object({ schema }) })`, read `result.output` (`generateObject` is `@deprecated`) | `03-ai-sdk-core/10-generating-structured-data.mdx` |
| `JSON.parse(result.text)` | the same `Output.object`; never parse model text by hand | same |
| `result.toDataStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` (formerly `result.toUIMessageStreamResponse()`, which still works but is deprecated and warns) | migration, "Stream Response Helpers" |
| `result.fullStream` | `result.stream` | migration |
| `onFinish`, `onStepFinish` on `generateText`, `streamText`, agents, UI streams | `onEnd`, `onStepEnd` | migration |
| `result.usage` = last step, `result.totalUsage` | `result.usage` = all steps; last step is `result.finalStep.usage`. `toolCalls`, `toolResults`, `content` also span all steps | migration |
| `experimental_context` in a tool's `execute` | `context`, declared by the tool's `contextSchema` and supplied through `toolsContext`. Shared loop state is `runtimeContext` | migration; `03-ai-sdk-core/17-runtime-and-tool-context.mdx` |
| tool `needsApproval` | `toolApproval` on the call or the agent (section 7) | migration; `03-agents/06-tool-approvals.mdx` |
| `useChat({ api })` with `input`, `handleInputChange`, `handleSubmit` | own the input with `useState`; `sendMessage({ text })`; `transport: new DefaultChatTransport({ api })` | `04-ai-sdk-ui/02-chatbot.mdx` |
| `useChat({ body })` | `sendMessage({ text }, { body })` per request | `09-troubleshooting/17-use-chat-stale-body-data.mdx` |
| `part.type === 'tool-invocation'` | typed parts: `part.type === 'tool-<toolName>'` | `04-ai-sdk-ui/03-chatbot-tool-usage.mdx` |
| `part.toolInvocation.args` / `.result` / `.toolCallId` | `part.input` / `part.output` / `part.toolCallId` | same |
| states `partial-call` / `call` / `result` | `input-streaming` / `input-available` / `output-available`, plus `output-error`, `approval-requested`, `approval-responded`, `output-denied` | same; `UIToolInvocation` in the types |
| `addToolResult({ toolCallId, result })` | `addToolOutput({ tool, toolCallId, output })` | same |
| `isToolOrDynamicToolUIPart(part)` | `isToolUIPart(part)` | migration |
| `createAgentUIStreamResponse({ agent, messages })` | `createAgentUIStreamResponse({ agent, uiMessages: messages })` | `07-reference/01-ai-sdk-core/18-create-agent-ui-stream-response.mdx` |

Deprecated names still compile, and several log an `AI SDK Warning` at runtime. A clean server log
is part of "done".

Minimal correct snippets:

```ts
// Limits, steps, tools
import { generateText, isStepCount, tool } from 'ai';
import { z } from 'zod';

const compareWindows = tool({
  description: 'Compare a metric across two windows',
  inputSchema: z.object({ metric: z.string() }),
  execute: async ({ metric }) => ({ metric, deltaPct: -14 }),
});

const result = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  instructions: 'Use the tools. Never state a number a tool did not return.',
  tools: { compareWindows },
  stopWhen: isStepCount(5),
  maxOutputTokens: 512,
  prompt: 'Why did revenue fall?',
});
```

Without `stopWhen`, `generateText` and `streamText` stop after one step (source: the default is
`isStepCount(1)` in `node_modules/ai/src/generate-text/generate-text.ts`); `ToolLoopAgent` defaults
to `isStepCount(20)`. Other stop conditions: `hasToolCall('name')`, `isLoopFinished()`, or an array.
(docs: `03-agents/04-loop-control.mdx`)

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

`as const` matters for `Output.choice`: without it `result.output` is `string` (types). With tools,
the structured output costs one extra step, so leave room in `stopWhen`.
(docs: `07-reference/01-ai-sdk-core/28-output.mdx`, `09-troubleshooting/14-tool-calling-with-structured-outputs.mdx`)

```ts
// Streaming to useChat, no agent
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    messages: await convertToModelMessages(messages),
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
```

```tsx
// Client: input state is yours; extra body fields go on each sendMessage
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import type { InvestigatorUIMessage } from '@/lib/ai/agents/investigator';
import type { Action } from '@/types';

export function AskComposer({ actions }: { actions: Action[] }) {
  const [input, setInput] = useState('');
  const { sendMessage, status } = useChat<InvestigatorUIMessage>({
    id: 'ask', // a stable id is required with cacheComponents: section 5
    transport: new DefaultChatTransport({ api: '/api/ask' }),
  });
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage({ text: input }, { body: { actions } });
        setInput('');
      }}
    >
      <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
    </form>
  );
}
```

`status` is `'submitted' | 'streaming' | 'ready' | 'error'`. `useChat` also returns `messages`,
`error`, `stop`, `regenerate`, `setMessages`, `clearError`, `addToolOutput`, `addToolApprovalResponse`.
(docs: `04-ai-sdk-ui/02-chatbot.mdx`, `07-reference/02-ai-sdk-ui/01-use-chat.mdx`; types)

```tsx
// Rendering parts: check state before reading input or output
import { getToolName, isToolUIPart } from 'ai';

message.parts.map((part, i) => {
  if (part.type === 'text') return <span key={i}>{part.text}</span>;
  if (part.type === 'data-chain') return <OnsetTrail key={part.id ?? i} chain={part.data} />;

  if (part.type === 'tool-compareWindows') {
    if (part.state === 'output-available') return <Result key={i} input={part.input} output={part.output} />;
    if (part.state === 'output-error') return <Failed key={i} message={part.errorText} />;
    if (part.state === 'input-available') return <Running key={i} input={part.input} />;
    return <Pending key={i} />; // input-streaming (part.input may be undefined) and the approval states
  }

  if (isToolUIPart(part)) return <GenericTool key={i} name={getToolName(part)} state={part.state} />;
  return null; // 'step-start' and anything not rendered
});
```

`part.input` is only safe once the state is past `input-streaming`. `part.output` is only safe in
`output-available`. TypeScript enforces this (TS18048) when `useChat` is given the app's message
type (section 4). Every assistant message also contains `step-start` parts; ignore them.

## 4. Agents

Use `ToolLoopAgent`. One file per agent, one file per tool.
(docs: `node_modules/ai/docs/03-agents/02-building-agents.mdx`,
`07-reference/01-ai-sdk-core/16-tool-loop-agent.mdx`; types; run against a mock model)

```
src/lib/ai/
  models.ts
  mode.ts                 live | scripted resolution, scripted stream helper
  agents/investigator.ts  /api/ask
  agents/operator.ts      /api/act
  tools/context.ts        the per-request context schema shared by the tools
  tools/*.ts              each wraps one engine function
```

Constructor fields used here: `model`, `instructions`, `tools`, `stopWhen`, `output`,
`maxOutputTokens`, `callOptionsSchema`, `prepareCall`, `toolsContext`, `toolApproval`. It accepts
the same settings as `generateText`. Methods: `agent.generate({ prompt | messages, options })` and
`agent.stream(...)` (returns a promise of a `streamText` result).

**Per-request context is built in.** A tool declares what it needs with `contextSchema` and reads it
as `context` in `execute`. The agent takes the request's input as typed, validated call options
(`callOptionsSchema`) and turns it into each tool's context in `prepareCall`.
(docs: `03-ai-sdk-core/17-runtime-and-tool-context.mdx`, `03-agents/05-configuring-call-options.mdx`; types; run)

```ts
// src/lib/ai/tools/context.ts
import { z } from 'zod';
import type { World } from '@/types';

// z.custom passes the object through by reference. A full z.object(World) schema here would
// re-validate and copy the whole world before every tool call.
export const worldContext = z.object({ world: z.custom<World>() });
```

```ts
// src/lib/ai/tools/compare-windows.ts
import { tool, type UIToolInvocation } from 'ai';
import { z } from 'zod';
import { compareWindows } from '@/engine';
import { worldContext } from './context';

export const compareWindowsTool = tool({
  description: 'Compare a metric across the current and previous window',
  inputSchema: z.object({ metric: z.string().describe('MetricId') }),
  contextSchema: worldContext,
  execute: async ({ metric }, { context }) => compareWindows(context.world, metric),
});

// Export the invocation type so a UI component can import only the type
export type CompareWindowsInvocation = UIToolInvocation<typeof compareWindowsTool>;
```

```ts
// src/lib/ai/agents/investigator.ts
import { Output, ToolLoopAgent, isStepCount, type InferUITools, type UIMessage } from 'ai';
import { z } from 'zod';
import { replay, seedWorld } from '@/engine';
import { actionSchema, type Chain, type World } from '@/types';
import { MODELS } from '../models';
import { compareWindowsTool } from '../tools/compare-windows';
import { walkCausalGraphTool } from '../tools/walk-causal-graph';

export const investigatorTools = {
  compareWindows: compareWindowsTool,
  walkCausalGraph: walkCausalGraphTool,
};

// docs/TASKS.md lists the final fields as { chainId, narrative, citations }
export const answerSchema = z.object({ narrative: z.string(), citations: z.array(z.string()) });
export type Answer = z.infer<typeof answerSchema>;

const contextFor = (world: World) => ({
  compareWindows: { world },
  walkCausalGraph: { world },
});

export const investigator = new ToolLoopAgent({
  model: MODELS.agent,
  instructions: 'You investigate one business question using the tools. Never state a number a tool did not return.',
  tools: investigatorTools,
  stopWhen: isStepCount(8), // the structured output is one of these steps
  output: Output.object({ schema: answerSchema }),
  callOptionsSchema: z.object({ actions: z.array(actionSchema) }),
  toolsContext: contextFor(seedWorld), // the types require a default once a tool has contextSchema
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    toolsContext: contextFor(replay(seedWorld, options.actions)),
  }),
});

export type InvestigatorUIMessage = UIMessage<
  never, // message metadata
  { chain: Chain; answer: Answer }, // data parts: 'data-chain', 'data-answer'
  InferUITools<typeof investigatorTools> // tool parts: 'tool-compareWindows', ...
>;
```

What was checked about that shape:

- With `callOptionsSchema` set, `options` becomes required on `generate` and `stream` (types) and
  is validated at runtime (source: `node_modules/ai/src/agent/tool-loop-agent.ts`). A malformed
  `actions[]` was rejected before any model call; in the `/api/ask` route below that surfaces as
  a 200 whose only chunk is `error` (run).
- Omitting the constructor's `toolsContext` is a type error as soon as one tool declares
  `contextSchema`. `prepareCall`'s result needs one too; spreading `settings` carries the default,
  and the explicit key replaces it (types).
- The tool's `context` goes through the schema before each execution
  (`node_modules/ai/src/generate-text/validate-tool-context.ts`). With `z.custom<World>()` the tool
  received the very object `prepareCall` built (run).
- A plain factory, `createInvestigator(world)`, whose tools close over `world`, also type-checks. It
  is the fallback if call options get in the way; it needs a factory per tool, and the tool types
  come from `ReturnType<typeof createInvestigator>`.

**Message types.** `InferAgentUIMessage<typeof agent>` and `InferAgentUIMessage<typeof agent, MyMetadata>`
exist and give typed tool parts (docs: `03-agents/02-building-agents.mdx`, "End-to-end Type
Safety"), but they fix the data-part slot to `never`, so `part.data` on a `data-*` part is `never`
(types). Use them for an agent with no custom data parts (the operator). For the investigator,
declare `UIMessage<Metadata, DataParts, InferUITools<typeof tools>>` as above.
(docs: `07-reference/01-ai-sdk-core/31-ui-message.mdx`, `07-reference/02-ai-sdk-ui/46-infer-ui-tools.mdx`)

```tsx
// Client: the message type is the useChat generic. Import it with `import type`.
const { messages } = useChat<InvestigatorUIMessage>({
  id: 'ask',
  transport: new DefaultChatTransport({ api: '/api/ask' }),
});
// part.type is now 'text' | 'tool-compareWindows' | 'data-chain' | ..., with typed input, output, data
```

**Route, simplest form.** For an agent with no custom data parts, one call. It validates the incoming
UI messages against the agent's tools, converts them, runs the agent and streams the result.
(docs: `07-reference/01-ai-sdk-core/18-create-agent-ui-stream-response.mdx`; types)

```ts
// src/app/api/act/route.ts
import { createAgentUIStreamResponse } from 'ai';
import { operator } from '@/lib/ai/agents/operator';

export async function POST(req: Request) {
  const { messages, actions } = await req.json();
  return createAgentUIStreamResponse({
    agent: operator,
    uiMessages: messages,
    options: { actions }, // the operator declares callOptionsSchema like the investigator
    abortSignal: req.signal,
  });
}
```

**Route with data parts.** `/api/ask` also streams the `Chain` for the chart and the typed final
answer, so it owns the stream. `docs/TASKS.md` names `createAgentUIStreamResponse` for this route;
that helper returns a finished `Response`, with no writer for data parts and no handle on
`result.output`. (types; run against a mock model: one tool step, one answer step)

```ts
// src/app/api/ask/route.ts
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from 'ai';
import { investigator, investigatorTools, type InvestigatorUIMessage } from '@/lib/ai/agents/investigator';
import type { Action } from '@/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, actions }: { messages: UIMessage[]; actions: Action[] } = await req.json();

  const stream = createUIMessageStream<InvestigatorUIMessage>({
    execute: async ({ writer }) => {
      const result = await investigator.stream({
        prompt: await convertToModelMessages(messages, { tools: investigatorTools }),
        options: { actions },
        abortSignal: req.signal,
        onStepEnd: ({ toolResults }) => {
          for (const r of toolResults) {
            if (!r.dynamic && r.toolName === 'walkCausalGraph') {
              writer.write({ type: 'data-chain', id: r.toolCallId, data: r.output });
            }
          }
        },
      });
      writer.merge(toUIMessageStream({ stream: result.stream, tools: investigatorTools, sendFinish: false }));
      writer.write({ type: 'data-answer', id: 'answer', data: await result.output });
      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

Chunk order observed from that route: `start`, `start-step`, `tool-input-available`,
`tool-output-available`, `data-chain`, `finish-step`, `start-step`, `text-start`, `text-delta`,
`text-end`, `finish-step`, `data-answer`, `finish`. A real model also sends `tool-input-start` and
`tool-input-delta` before `tool-input-available` (that is the `input-streaming` state).

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
- **Tools get that per-request world through the SDK**: `actions[]` is the agent's call option,
  `prepareCall` replays it, and each tool reads `context.world` (section 4).
- **Sending `actions[]` from the client.** Pass it as the second argument of every send:
  `sendMessage({ text }, { body: { actions } })`. The route reads `{ messages, actions }` from
  `req.json()`; the body also carries `id`, `trigger` and `messageId`
  (source: `node_modules/ai/src/ui/http-chat-transport.ts`). `regenerate({ body: { actions } })`
  and `addToolApprovalResponse({ id, approved, options: { body: { actions } } })` take the same
  options, and need them, because each re-sends the request (types). Do not put `actions` in the
  transport's `body`: the docs call that value stale after the first render; a transport-level
  `body: () => ref.current` function is the documented alternative.
  (docs: `09-troubleshooting/17-use-chat-stale-body-data.mdx`, `04-ai-sdk-ui/02-chatbot.mdx`
  "Request Configuration"). `prepareSendMessagesRequest` exists on the transport for reshaping the
  whole body; this app does not need it.
- **The structured answer reaches the client as a data part.** With `output` set on a streamed
  agent, the final step's `text` part is the raw JSON string, and the client gets no typed `output`
  (run). So the route awaits `result.output` (parsed and schema-checked) and writes it as
  `data-answer`. Two consequences to settle when building `/ask`: the JSON still streams as a `text`
  part before `data-answer` arrives, so the UI must not render the investigator's answer-step text;
  and scripts must record a `data-answer` part so both modes match (the script example in
  `docs/ARCHITECTURE.md` predates this: it ends with a plain `text` part). `result.partialOutputStream`
  exists for streaming the object as it forms (docs: `03-ai-sdk-core/10-generating-structured-data.mdx`;
  not tried here).
- **Custom data parts**, end to end: declare them in the `UIMessage` data slot (`{ chain: Chain }`
  gives the part type `'data-chain'`); write with `writer.write({ type: 'data-chain', id, data })`
  inside `createUIMessageStream`; read with `part.type === 'data-chain'` then `part.data`. Writing
  the same `id` again replaces the part. `transient: true` sends a part that never enters
  `message.parts` and is only seen by `useChat({ onData })`. Data parts in the history are ignored
  when messages are converted for the model, unless `convertDataPart` is passed.
  (docs: `04-ai-sdk-ui/20-streaming-data.mdx`; types; run)

**Next.js 16 with `cacheComponents: true`** (the scaffold's `next.config.ts` turns it on). The AI
SDK docs say nothing about it (searched `cacheComponents`, `use cache`, `Next.js 16` in `ai/docs`,
`ai/src`, `@ai-sdk/react` and the gateway docs: no hits). What matters comes from
`node_modules/next/dist/docs/01-app/` and from a build:

- **Give every `useChat` a stable `id`.** Without one, `useChat` generates a chat id with
  `Math.random()` during render and `next build` fails: `Next.js encountered the unstable value
  Math.random() in a Client Component` (run: the build failed without `id`, passed with `id: 'ask'`).
  Change the `id` (a counter in state, not a random value) to start a fresh conversation. Next's
  other suggested fix, a `<Suspense>` boundary around the component, was not tried.
- **Route handlers.** Only `GET` handlers join the prerender model; `POST` handlers always run per
  request (`01-getting-started/15-route-handlers.md`). Do not export `dynamic`, `revalidate`,
  `fetchCache` or `dynamicParams` from a route file: with Cache Components they fail the build
  (`02-guides/migrating-to-cache-components.md`; run: `export const dynamic = 'force-dynamic'`
  stopped the build with `Route segment config "dynamic" is not compatible with
  nextConfig.cacheComponents`). `export const maxDuration = 60` is still valid (run), and it is
  the only segment config the AI SDK's own route examples use.
- **Runtime.** Default Node.js runtime. Do not set `runtime = 'edge'`: it is deprecated and not
  supported with Cache Components (`03-api-reference/05-config/01-next-config-js/cacheComponents.md`).
  Streaming works on Node (run: a scripted POST route under `next start` delivered its chunks
  incrementally, with `content-type: text/event-stream`).
- `'use cache'` cannot be used in a route handler body, and none of the AI routes should be cached.

## 6. Scripted mode

Every AI surface must work with no key and no network. In scripted mode the route returns a
recorded response in the **same UI-message-stream wire format** as live mode, so the client code
path (`useChat`, typed parts, the trail renderer) is identical and there is one UI to test.

- Mode resolution lives in `src/lib/ai/mode.ts`, server side, per request: `MUNSHI_AI_MODE` is
  `auto` (live when a key or OIDC token is present, scripted otherwise; a live failure before the
  first byte falls back to the matching script), `live` (always the model, errors shown, no
  fallback), or `scripted` (the model is never called, even when a key exists). The table is in
  `docs/ARCHITECTURE.md`, section 5.
- Scripts live in `src/data/scripts/*.json`, one per demo question, as an ordered list of parts
  with timing hints. See `docs/ARCHITECTURE.md` for the file shape.
- **Scripted is not fake.** `scripts/record-scripts.ts` runs the real engine on the seed and writes
  the tool inputs and outputs into the script. Only the narrative sentences are written by hand.
- The UI shows which mode is active. Every `/api/ask` and `/api/act` response carries the header
  `x-munshi-mode: live | scripted` and a leading `data-mode` part with the same value; the client
  shows the label "Demo answers" when it is `scripted`. Do not present a scripted answer as a live one.
- `/api/act` in scripted mode does not read `src/data/scripts`: it runs `playbook.plan` and streams
  the engine's template drafts as a `data-plan` part. Scripts exist for `/api/ask` only.

**Recommended: write the recorded parts with `createUIMessageStream` and return them with
`createUIMessageStreamResponse`.** No model, no key, per-part delays, and the script file shape in
`docs/ARCHITECTURE.md` maps onto it one to one.
(docs: `node_modules/ai/docs/07-reference/02-ai-sdk-ui/40-create-ui-message-stream.mdx`,
`41-create-ui-message-stream-response.mdx`, `04-ai-sdk-ui/50-stream-protocol.mdx`; types; run)

```ts
// src/lib/ai/mode.ts (scripted half)
import { createUIMessageStream, type UIMessageStreamWriter } from 'ai';
import type { Answer, InvestigatorUIMessage } from '@/lib/ai/agents/investigator';
import type { Chain } from '@/types';

export type ScriptPart =
  | { type: 'text'; text: string; delayMs?: number }
  | { type: `tool-${string}`; input: unknown; output: unknown; delayMs?: number }
  | { type: 'data-chain'; data: Chain; delayMs?: number }
  | { type: 'data-answer'; data: Answer; delayMs?: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function writeScripted(
  writer: UIMessageStreamWriter<InvestigatorUIMessage>,
  parts: ScriptPart[],
  signal?: AbortSignal,
) {
  writer.write({ type: 'start' });
  writer.write({ type: 'start-step' });
  let n = 0;
  let afterTool = false;
  for (const part of parts) {
    if (signal?.aborted) return;
    const id = `s${n++}`;
    await sleep(part.type.startsWith('tool-') ? 0 : (part.delayMs ?? 0));
    if (part.type === 'text') {
      if (afterTool) {
        // a live agent starts a new step after tool results
        writer.write({ type: 'finish-step' });
        writer.write({ type: 'start-step' });
        afterTool = false;
      }
      writer.write({ type: 'text-start', id });
      for (const word of part.text.split(/(?<=\s)/)) {
        writer.write({ type: 'text-delta', id, delta: word });
        await sleep(20);
      }
      writer.write({ type: 'text-end', id });
    } else if (part.type === 'data-chain') {
      writer.write({ type: 'data-chain', id, data: part.data });
    } else if (part.type === 'data-answer') {
      writer.write({ type: 'data-answer', id: 'answer', data: part.data });
    } else {
      const toolName = part.type.slice('tool-'.length);
      writer.write({ type: 'tool-input-available', toolCallId: id, toolName, input: part.input });
      await sleep(part.delayMs ?? 0); // the tool "runs": the UI shows state 'input-available'
      writer.write({ type: 'tool-output-available', toolCallId: id, output: part.output });
      afterTool = true;
    }
  }
  writer.write({ type: 'finish-step' });
  writer.write({ type: 'finish', finishReason: 'stop' });
}

export const scriptedStream = (parts: ScriptPart[], signal?: AbortSignal) =>
  createUIMessageStream<InvestigatorUIMessage>({
    execute: ({ writer }) => writeScripted(writer, parts, signal),
  });
```

```ts
// in the route, before the live path
if (script) return createUIMessageStreamResponse({ stream: scriptedStream(script.parts, req.signal) });
```

What was observed:

- Read back through `readUIMessageStream` (it runs the same `processUIMessageStream` as `useChat`),
  a script of tool, data, text, answer produced the parts `step-start`, `tool-walkCausalGraph`
  (state `input-available`, then `output-available` with input and output), `data-chain`,
  `step-start`, `text`, `data-answer`: the same sequence as the live route in section 4 driven by a
  mock model.
- The response carries `content-type: text/event-stream` and `x-vercel-ai-ui-message-stream: v1`,
  each chunk is one `data: {json}` line, and the stream ends with `data: [DONE]`.
  `createUIMessageStream` adds a `messageId` to the `start` chunk.
- The data chunks are typed by the message type. The tool chunks are not: `toolName` is a string
  and `input` / `output` are `unknown`, so only the recorder keeps a script honest.
  `validateUIMessages({ messages, tools })` can check a recorded message against the real tool
  schemas (docs: `07-reference/01-ai-sdk-core/32-validate-ui-messages.mdx`; not run).

**Falling back to a script when live fails.** Because the failure arrives in-band (section 2), hold
back the lifecycle chunks until the first content chunk, and switch if an `error` comes first.
(types; run with a mock model that throws)

```ts
// inside execute({ writer }); `live` is toUIMessageStream(...) or await createAgentUIStream(...)
const reader = live.getReader(); // `for await` on a ReadableStream is a type error with the scaffold's `lib`
const held: InferUIMessageChunk<InvestigatorUIMessage>[] = [];
let committed = false;
for (;;) {
  const { done, value: chunk } = await reader.read();
  if (done) break;
  if (!committed && chunk.type === 'error' && script) return writeScripted(writer, script.parts, req.signal);
  if (!committed && (chunk.type === 'start' || chunk.type === 'start-step')) {
    held.push(chunk);
    continue;
  }
  if (!committed) {
    committed = true;
    for (const h of held) writer.write(h);
  }
  writer.write(chunk);
}
```

Alternatives that exist, and why they are not the default:

| API | Status | Use |
|---|---|---|
| `MockLanguageModelV4` from `'ai/test'` | docs: `03-ai-sdk-core/55-testing.mdx`; types; run | A scripted *model* drives the real agent: `doStream` takes an array, one entry per model turn, and the real tools execute against the seed. Best for a vitest of the live route. Not the default here because scripts would have to be model turns (`tool-call` chunks, usage objects), not the part list in `docs/ARCHITECTURE.md`. `MockLanguageModelV3` also exists; v7 models are V4. |
| `simulateReadableStream({ chunks, initialDelayInMs, chunkDelayInMs })` from `'ai'` | docs: `07-reference/01-ai-sdk-core/75-simulate-readable-stream.mdx`; types; run | Emits an array with one uniform delay. The docs use it to replay raw `data: {...}` lines as a `Response`. Not the default because a script needs a different delay per part. |
| `DirectChatTransport({ agent })` from `'ai'` | docs: `07-reference/02-ai-sdk-ui/50-direct-chat-transport.mdx`; types | Runs an agent in-process with no HTTP route. Not used: the agents are server-only. |

## 7. Approval

The Act flow's approval is a **UI state machine driven by playbook data**, not a chat tool call:
plan, drafts, approval card, apply effects, done. The operator agent only rewrites draft text.

If a tool-level approval is ever wanted (for example the investigator proposing an action from
inside `/ask`), it is built in. Formerly `needsApproval: true` on the tool, which is deprecated in
v7; set the policy on the agent or the call. (docs: `node_modules/ai/docs/03-agents/06-tool-approvals.mdx`; types)

```ts
// server: 'user-approval' | 'approved' | 'denied' | 'not-applicable', or a function of the input
new ToolLoopAgent({ model, tools: { proposeAction }, toolApproval: { proposeAction: 'user-approval' } });
```

```tsx
// client: the part arrives with state 'approval-requested'
const { addToolApprovalResponse } = useChat<InvestigatorUIMessage>({
  id: 'ask',
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses, // from 'ai'
});
addToolApprovalResponse({ id: part.approval.id, approved: true, options: { body: { actions } } });
```

The tool does not run until the approval response is sent back; the agent loop stops at the request
and resumes on the next call. Not run end to end here.

## 8. Checklist before committing AI code

- [ ] Grepped `node_modules/ai/docs` for every API used.
- [ ] No name from the left column of the renames table, and no `AI SDK Warning` in the server log.
- [ ] Model IDs come from `src/lib/ai/models.ts`, and were re-checked against the gateway's list.
- [ ] Every `useChat` has a stable `id`, and `actions` goes in the `body` of each `sendMessage`.
- [ ] No route file exports `dynamic`, `revalidate`, `fetchCache` or `runtime = 'edge'`.
- [ ] The surface works with `.env.local` absent.
- [ ] No number reaches the UI that a tool did not return.
- [ ] `pnpm typecheck` and `pnpm build` pass.
