"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { InvestigatorUIMessage } from "@/lib/ai/agents/investigator";
import { SUGGESTED_QUESTIONS } from "@/data/questions";
import { useActions, useWorld } from "@/lib/store/world";
import { AskComposer } from "./AskComposer";
import { Investigation } from "./Investigation";
import { SuggestedQuestions } from "./SuggestedQuestions";

// The Why screen (DESIGN.md, Why): leads with the question. `?q=<questionId>` or `?q=<text>` asks
// on arrival; the server replays the client's actions log over the seed before answering.

export function AskScreen() {
  const world = useWorld();
  const actions = useActions();
  const params = useSearchParams();
  const q = params.get("q");
  const nonce = params.get("n");
  const [transport] = useState(() => new DefaultChatTransport<InvestigatorUIMessage>({ api: "/api/ask" }));
  const { messages, sendMessage, status, error, regenerate, clearError } = useChat<InvestigatorUIMessage>({ id: "ask", transport });
  const busy = status === "submitted" || status === "streaming";
  const asked = useRef<string | null>(null);

  const ask = (text: string, questionId?: string) => {
    clearError();
    void sendMessage({ text }, { body: { questionId, actions } });
  };

  useEffect(() => {
    const key = `${q}#${nonce ?? ""}`;
    if (!q || asked.current === key) return;
    // Deferred a tick so a development double-mount cannot fire the ask on an instance that is about to unmount.
    const t = setTimeout(() => {
      asked.current = key;
      const suggested = SUGGESTED_QUESTIONS.find((s) => s.id === q);
      ask(suggested ? suggested.text : q, suggested?.id);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, nonce]);

  const last = messages[messages.length - 1];
  const lastQuestion = [...messages].reverse().find((m) => m.role === "user");
  const lastText = lastQuestion?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  const lastId = SUGGESTED_QUESTIONS.find((s) => s.text === lastText)?.id ?? null;
  const answered = last?.role === "assistant" && last.parts.some((p) => p.type === "data-answer");
  const placeholder = `${(SUGGESTED_QUESTIONS.find((s) => s.id !== lastId) ?? SUGGESTED_QUESTIONS[0]).text.replace(/\?$/, "")}…`;
  const mode = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i].parts.find((p) => p.type === "data-mode");
      if (m) return m.data.mode;
    }
    return null;
  })();

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <h1 className="sr-only">Why</h1>
      <AskComposer onAsk={(t) => ask(t)} busy={busy} mode={mode} placeholder={placeholder} />
      {messages.length === 0 ? <SuggestedQuestions heading="Try one of these" onPick={(id, text) => ask(text, id)} /> : null}
      {messages.map((m, i) =>
        m.role === "user" ? (
          <h2 key={m.id} className="t-page-title text-ink">
            {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
          </h2>
        ) : (
          <Investigation
            key={m.id}
            world={world}
            message={m}
            streaming={busy && m === last}
            error={m === last && status === "error" ? (error?.message ?? "The model failed.") : null}
            onRetry={() => {
              clearError();
              void regenerate({ body: { actions } });
            }}
            after={m === last ? <SuggestedQuestions heading={answered ? "Ask another" : "Try one of these"} className="pt-2" exclude={lastId} onPick={(id, text) => ask(text, id)} /> : null}
          />
        ),
      )}
      {status === "error" && last?.role === "user" ? (
        <div className="rounded-[12px] border border-rule bg-surface p-4">
          <p className="t-ui text-debit">{error?.message ?? "The request failed."}</p>
          <button
            type="button"
            onClick={() => {
              clearError();
              void regenerate({ body: { actions } });
            }}
            className="mt-2 t-ui font-medium text-neel hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
