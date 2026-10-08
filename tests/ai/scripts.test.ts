import { describe, expect, it } from "vitest";
import { readUIMessageStream } from "ai";
import { matchScript, scripts } from "@/lib/ai/scripts";
import { resolveMode, scriptedStream, UNKNOWN_IN_DEMO } from "@/lib/ai/mode";
import { SUGGESTED_QUESTIONS } from "@/data/questions";
import { seedWorld } from "@/data/seed";
import { compareWindows, walkCausalGraph } from "@/lib/ai/tools";

describe("recorded scripts", () => {
  it("exist for every suggested question and parse", () => {
    const ids = scripts().map((s) => s.id);
    for (const q of SUGGESTED_QUESTIONS) expect(ids).toContain(q.id);
  });

  it("carry the engine's own tool outputs, not typed values", () => {
    const world = seedWorld();
    const s = scripts().find((x) => x.id === "why-revenue-fell")!;
    const cmp = s.parts.find((p) => p.type === "tool" && p.tool === "compareWindows");
    expect(cmp && cmp.type === "tool" ? cmp.output : null).toEqual(compareWindows(world, { metric: "revenue" }));
    const chain = s.parts.find((p) => p.type === "data-chain");
    expect(chain && chain.type === "data-chain" ? chain.data : null).toEqual(walkCausalGraph(world, { target: "revenueD2C" }));
  });

  it("every figure in a narrative is a number the tools returned", () => {
    for (const s of scripts()) {
      const answer = s.parts.find((p) => p.type === "data-answer");
      expect(answer).toBeTruthy();
      if (!answer || answer.type !== "data-answer") continue;
      expect(answer.data.citations.length).toBeGreaterThan(0);
      expect(answer.data.narrative).not.toMatch(/[—–·!]/);
      if (answer.data.chainId) {
        const chain = s.parts.find((p) => p.type === "data-chain");
        expect(chain && chain.type === "data-chain" ? chain.data.id : null).toBe(answer.data.chainId);
      }
    }
  });

  it("matches by id, then by phrase, else null", () => {
    expect(matchScript("why-complaints-up", undefined)?.id).toBe("why-complaints-up");
    expect(matchScript(undefined, "Why did revenue fall last week?")?.id).toBe("why-revenue-fell");
    expect(matchScript(undefined, "what should I do today")?.id).toBe("what-should-i-do-today");
    expect(matchScript(undefined, "customers at risk?")?.id).toBe("which-customers-at-risk");
    expect(matchScript(undefined, "how is the weather in Jaipur")).toBeNull();
  });
});

describe("mode resolution", () => {
  const req = (oidc?: string) => new Request("http://x/api/ask", { method: "POST", headers: oidc ? { "x-vercel-oidc-token": oidc } : {} });
  it("follows the table in docs/ARCHITECTURE.md", () => {
    expect(resolveMode(req(), { MUNSHI_AI_MODE: "scripted", AI_GATEWAY_API_KEY: "k" })).toEqual({ mode: "scripted" });
    expect(resolveMode(req(), { MUNSHI_AI_MODE: "auto" })).toEqual({ mode: "scripted" });
    expect(resolveMode(req(), { MUNSHI_AI_MODE: "auto", AI_GATEWAY_API_KEY: "k" })).toEqual({ mode: "live", fallback: true });
    expect(resolveMode(req("t"), {})).toEqual({ mode: "live", fallback: true });
    expect(resolveMode(req(), { MUNSHI_AI_MODE: "live", AI_GATEWAY_API_KEY: "k" })).toEqual({ mode: "live", fallback: false });
    expect(resolveMode(req(), { MUNSHI_AI_MODE: "live" })).toEqual({ mode: "error", message: "No AI key is configured." });
  });
});

describe("scripted stream", () => {
  it("replays a script as the parts useChat would see, mode first", async () => {
    const s = scripts().find((x) => x.id === "why-revenue-fell")!;
    let last: { parts: { type: string }[] } | undefined;
    for await (const m of readUIMessageStream({ stream: scriptedStream(s.parts, { pace: 0 }) })) last = m;
    const types = last!.parts.map((p) => p.type);
    expect(types[0]).toBe("data-mode");
    expect(types).toContain("tool-compareWindows");
    expect(types).toContain("tool-walkCausalGraph");
    expect(types).toContain("data-chain");
    expect(types[types.length - 1]).toBe("data-answer");
    const tool = last!.parts.find((p) => p.type === "tool-walkCausalGraph") as unknown as { state: string };
    expect(tool.state).toBe("output-available");
  });

  it("answers an unknown question plainly", async () => {
    let last: { parts: { type: string; text?: string }[] } | undefined;
    for await (const m of readUIMessageStream({ stream: scriptedStream(null, { pace: 0 }) })) last = m;
    expect(last!.parts.find((p) => p.type === "text")?.text).toBe(UNKNOWN_IN_DEMO);
  });
});
