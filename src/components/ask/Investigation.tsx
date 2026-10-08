"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { isToolUIPart } from "ai";
import type { Chain, RecordRef, World } from "@/types";
import type { InvestigatorUIMessage } from "@/lib/ai/agents/investigator";
import { OnsetTrail } from "@/components/chain/OnsetTrail";
import { chainRefs, drawEnd, stripsOf } from "@/components/chain/trail";
import { EvidenceList } from "@/components/finding/EvidenceList";
import { useReducedMotion } from "@/lib/hooks";
import { parseRefKey, uniqueRefs } from "@/lib/records";
import { cn } from "@/lib/utils";
import { toolDoneLabel, toolRunningLabel } from "./toolLabels";

type Props = {
  world: World;
  message: InvestigatorUIMessage;
  streaming: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Rendered once the answer has settled (the stream has ended and the trail has drawn). */
  after?: React.ReactNode;
};

// Chains drawn in this client session: a past investigation opens already drawn (DESIGN.md).
const drawn = new Set<string>();

const LEVER_TARGETS = new Set(["revenue", "revenueD2C", "ordersD2C", "sessions", "adSpend", "landingCvr", "revenueWholesale", "ordersWholesale"]);

/** One answer: the activity line while tools run, the trail, the narrative, then what was checked. */
export function Investigation({ world, message, streaming, error, onRetry, after }: Props) {
  const parts = message.parts;
  const chains = parts.filter((p) => p.type === "data-chain").map((p) => p.data as Chain);
  const answer = parts.find((p) => p.type === "data-answer")?.data;
  const tools = parts.filter((p) => isToolUIPart(p));
  const texts = parts.flatMap((p) => (p.type === "text" && !p.text.trimStart().startsWith("{") ? [p.text] : []));
  const running = streaming ? [...tools].reverse().find((p) => p.state !== "output-available") : undefined;
  const activity = streaming && chains.length === 0 && !answer ? (running ? toolRunningLabel(running) : "Thinking…") : null;
  const animateRef = useRef<Record<string, boolean>>({});
  for (const c of chains) {
    if (!(c.id in animateRef.current)) {
      animateRef.current[c.id] = !drawn.has(c.id);
      drawn.add(c.id);
    }
  }
  // While the trail draws, nothing else lands: the narrative waits for the draw to finish.
  const lastChain = chains[chains.length - 1];
  const reduced = useReducedMotion();
  const holdFor = lastChain && animateRef.current[lastChain.id] && !reduced ? drawEnd(stripsOf(lastChain).strips) : 0;
  const [heldId, setHeldId] = useState<string | null>(null);
  useEffect(() => {
    if (!lastChain || !holdFor) return;
    setHeldId(lastChain.id);
    const t = setTimeout(() => setHeldId(null), holdFor + 120);
    return () => clearTimeout(t);
  }, [lastChain, holdFor]);
  const held = heldId !== null && heldId === lastChain?.id;
  const settled = !streaming && !held;
  // Interim lines are working notes: shown until the trail (which restates them) or the answer arrives.
  const interim = !answer && chains.length === 0;
  const finalText = !streaming && !answer && !error;
  const paragraphs = answer?.narrative.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean) ?? [];
  const refs: RecordRef[] = uniqueRefs([
    ...chains.flatMap(chainRefs),
    ...(answer?.citations.map(parseRefKey).filter((r): r is RecordRef => !!r) ?? []),
  ]);
  const chainTarget = chains[chains.length - 1]?.target;
  const showWhatIf = !!answer && !!chainTarget && LEVER_TARGETS.has(chainTarget);

  return (
    <div className="flex flex-col gap-6">
      <p className={cn("flex items-center gap-2 t-ui text-ink-2", !activity && "sr-only")} aria-live="polite">
        {activity ? <Loader2 className="spin size-3.5 shrink-0" aria-hidden /> : null}
        {activity}
      </p>
      {interim && texts.length ? (
        <div className="flex flex-col gap-6" aria-live="polite">
          {texts.map((t, i) => (
            <p key={i} className={cn("max-w-[70ch]", finalText ? "t-body text-ink" : "t-ui text-ink-2")}>
              {t}
              {streaming && i === texts.length - 1 ? <span className="ml-1 inline-block size-1.5 rounded-full bg-neel align-middle" aria-hidden /> : null}
            </p>
          ))}
        </div>
      ) : null}
      {chains.map((c) => (
        <OnsetTrail key={c.id} world={world} chain={c} animate={animateRef.current[c.id]} />
      ))}
      {answer && !held ? (
        <div className="flex flex-col gap-4">
          {paragraphs.map((p, i) =>
            i === 0 ? (
              <p key={i} className="t-briefing max-w-[34rem] text-ink">
                {p}
              </p>
            ) : (
              <p key={i} className="t-body max-w-[70ch] text-ink">
                {p}
              </p>
            ),
          )}
          {showWhatIf ? (
            <p className="t-body">
              <Link href="/whatif?preset=best" className="prose-link">
                Try this in What if
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[12px] border border-rule bg-surface p-4">
          <p className="t-ui text-debit">{error}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="mt-2 t-ui font-medium text-neel hover:underline">
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
      {settled && tools.length ? (
        <details className={cn("group rounded-[12px] border border-rule bg-surface", refs.length && "rounded-b-none")}>
          <summary className="cursor-pointer list-none px-4 py-3 t-ui font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
            What I checked ({tools.length})
          </summary>
          <ol className="list-decimal border-t border-rule px-4 py-3 pl-9 t-ui text-ink-2 [&>li]:py-1">
            {tools.map((t) => (
              <li key={t.toolCallId}>{toolDoneLabel(t) ?? "A step that did not finish."}</li>
            ))}
          </ol>
        </details>
      ) : null}
      {settled && refs.length ? (
        <details className={cn("group rounded-[12px] border border-rule bg-surface", tools.length && "-mt-6 rounded-t-none border-t-0")}>
          <summary className="cursor-pointer list-none px-4 py-3 t-ui font-medium text-ink [&::-webkit-details-marker]:hidden">Evidence ({refs.length})</summary>
          <div className="border-t border-rule px-4 py-2">
            <EvidenceList world={world} refs={refs} />
          </div>
        </details>
      ) : null}
      {settled ? after : null}
    </div>
  );
}
