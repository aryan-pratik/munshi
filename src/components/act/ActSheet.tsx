"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Check, CircleAlert } from "lucide-react";
import type { Action, Draft, Effect } from "@/types";
import type { ActUIMessage } from "@/app/api/act/route";
import { analyze, nextFriday, playbook } from "@/engine";
import { Button } from "@/components/ui/button";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { MUNSHI } from "@/data/rules/tone";
import { draftsSentence, effectLines } from "@/lib/act";
import { primaryAction } from "@/lib/findings";
import { inrCompact, shortDate } from "@/lib/format";
import { useActions, useWorld, useWorldStore } from "@/lib/store/world";
import { cn } from "@/lib/utils";
import { DraftPreview } from "./DraftPreview";

// The Act sheet (DESIGN.md, Act): plan, drafts, the approval bar, then the Done state inside the
// same sheet. Nothing leaves until "Approve and send" is pressed; the effects are the playbook's,
// applied to the client-held world, and the toast fires on completion.

type Phase = "loading" | "review" | "sending" | "done";
const SEND_MS = 900;

/**
 * Which of a batch the channel refused. The demo has no channels, so nothing is refused; the
 * Failed state (DESIGN.md, Agent and data states) is forced by returning ids from here.
 */
function refusedBy(drafts: Draft[]): string[] {
  void drafts;
  return [];
}

export function ActSheet() {
  const req = useWorldStore((s) => s.act);
  const closeAct = useWorldStore((s) => s.closeAct);
  // While a send is executing the sheet stays put: Esc, the scrim and Close all wait for it.
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={!!req}
      onOpenChange={(open) => {
        if (!open && !busy) closeAct();
      }}
    >
      {req ? <ActBody key={`${req.findingId}:${req.playbook}`} findingId={req.findingId} playbookId={req.playbook} onBusy={setBusy} /> : null}
    </Dialog>
  );
}

function ActBody({ findingId, playbookId, onBusy }: { findingId: string; playbookId: Action["playbook"]; onBusy: (busy: boolean) => void }) {
  const world = useWorld();
  const actions = useActions();
  const applyAction = useWorldStore((s) => s.applyAction);
  const toast = useToast();
  const [transport] = useState(() => new DefaultChatTransport<ActUIMessage>({ api: "/api/act" }));
  const { messages, sendMessage, status, error } = useChat<ActUIMessage>({ id: `act:${findingId}`, transport });

  // The finding as it stood when the sheet opened; after approval it leaves the open list.
  const openedWorld = useRef(world);
  const finding = useMemo(() => analyze(openedWorld.current).find((f) => f.id === findingId), [findingId]);
  const pb = playbook(playbookId);

  // One request per open. The timeout defers past the first render; the cleanup un-sets the
  // guard so a development double-mount still sends exactly once.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const t = setTimeout(() => void sendMessage({ text: findingId }, { body: { findingId, playbook: playbookId, actions } }), 0);
    return () => {
      clearTimeout(t);
      sent.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = messages[messages.length - 1];
  const plan = last?.role === "assistant" ? last.parts.find((p) => p.type === "data-plan")?.data : undefined;
  const mode = last?.role === "assistant" ? last.parts.find((p) => p.type === "data-mode")?.data.mode : undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [dropped, setDropped] = useState<Set<string>>(() => new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [effects, setEffects] = useState<Effect[]>([]);
  useEffect(() => {
    if (plan && phase === "loading") setPhase("review");
  }, [plan, phase]);
  useEffect(() => {
    onBusy(phase === "sending");
    return () => onBusy(false);
  }, [phase, onBusy]);
  // Focus moves to the Done section when the approval bar leaves, so a keyboard user is not dropped on the body.
  const doneRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (phase === "done") doneRef.current?.focus();
  }, [phase]);

  if (!finding) {
    return (
      <Sheet title="Nothing to review">
        <p className="p-4 t-body text-ink-2 md:p-6">This finding is no longer open. A hard refresh resets the demo.</p>
      </Sheet>
    );
  }

  const drafts: Draft[] = plan?.drafts ?? [];
  const kept = drafts.filter((d) => !dropped.has(d.id)).map((d) => ({ ...d, body: bodies[d.id] ?? d.body }));
  // What the next press sends: everything kept that has not gone out yet.
  const pending = kept.filter((d) => !sentIds.has(d.id));
  const retrying = failed.size > 0;
  const labels = pb.labels(pending.length);
  const impact = pb.expectedImpact(openedWorld.current, finding);
  // The title counts from the finding, so it reads "Review 7 drafts" before the plan arrives too.
  const title = pb.labels(drafts.length || primaryAction(openedWorld.current, finding)?.n || 1).review;
  const busy = phase === "sending";

  // Approval is the only thing that changes the world. Each press sends what is pending; a draft
  // the channel rejects stays in the list with "Try again" and the summary counts honestly.
  const approve = async () => {
    if (!pending.length || busy) return;
    setPhase("sending");
    await new Promise((r) => setTimeout(r, SEND_MS));
    const refused = new Set(refusedBy(pending));
    const went = pending.filter((d) => !refused.has(d.id));
    let all = effects;
    if (went.length) {
      // A retry sends the rest; it does not repeat a record the first batch already created.
      const done = new Set(effects.filter((e) => e.op === "create").map((e) => `${e.collection}:${e.record.id}`));
      const batch = pb.apply(world, finding, went).filter((e) => e.op !== "create" || !done.has(`${e.collection}:${e.record.id}`));
      const action: Action = { id: `act:${finding.id}:${Date.now().toString(36)}`, playbook: playbookId, findingId: finding.id, approvedAt: new Date().toISOString(), effects: batch };
      applyAction(action);
      all = [...effects, ...batch];
      setEffects(all);
      setSentIds((s) => new Set([...s, ...went.map((d) => d.id)]));
    }
    setFailed(refused);
    if (refused.size) {
      setPhase("review");
      return;
    }
    setPhase("done");
    toast.add({ title: pb.labels(kept.length).done, description: `Expected about ${inrCompact(impact.inr)} over ${impact.horizonDays} days.` });
  };

  return (
    <Sheet title={title} meta={mode === "scripted" ? "Demo answers" : undefined} closeDisabled={busy}>
      <div className="flex h-full flex-col">
        <div className="flex-1 px-4 py-5 md:px-6">
          {phase === "loading" ? (
            status === "error" ? (
              <div className="rounded-[12px] border border-rule bg-surface p-4">
                <p className="flex items-start gap-2 t-ui text-debit">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden strokeWidth={1.5} />
                  {error?.message ?? "Could not prepare the drafts."}
                </p>
                <Button className="mt-3" size="sm" onClick={() => void sendMessage({ text: findingId }, { body: { findingId, playbook: playbookId, actions } })}>
                  Try again
                </Button>
              </div>
            ) : (
              <Skeleton />
            )
          ) : phase === "done" ? (
            <Done ref={doneRef} lines={effectLines(world, effects)} impact={impact} checkBack={nextFriday(world)} />
          ) : (
            <>
              <section aria-label="Plan">
                <h3 className="t-label text-ink-2">Plan</h3>
                <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 t-ui text-ink marker:text-ink-3 marker:tabular-nums">
                  {plan?.steps.map((s) => (
                    <li key={s.id} className="pl-1">
                      {s.label}
                    </li>
                  ))}
                </ol>
              </section>
              <section aria-label="Drafts" className="mt-6">
                <h3 className="t-label text-ink-2">
                  Drafts <span className="ml-1 font-normal text-ink-3 tabular-nums">{drafts.length}</span>
                </h3>
                <p className="mt-1 t-caption text-ink-3">{MUNSHI.drafted(drafts.length)} Edit any of them before you approve.</p>
                <div className="mt-3 flex flex-col gap-3">
                  {drafts.map((d) => (
                    <DraftPreview
                      key={d.id}
                      world={world}
                      draft={d}
                      body={bodies[d.id] ?? d.body}
                      kept={!dropped.has(d.id)}
                      state={sentIds.has(d.id) ? "sent" : failed.has(d.id) ? "failed" : undefined}
                      disabled={busy || sentIds.has(d.id)}
                      onChange={(b) => setBodies((m) => ({ ...m, [d.id]: b }))}
                      onKeep={(k) => setDropped((s) => { const n = new Set(s); if (k) n.delete(d.id); else n.add(d.id); return n; })}
                      onRetry={failed.has(d.id) ? () => void approve() : undefined}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
        {phase === "review" || phase === "sending" ? (
          <div className="sticky bottom-0 shrink-0 border-t border-rule bg-surface px-4 py-4 md:px-6">
            <p className="t-ui text-ink">
              {retrying ? `${sentIds.size} of ${kept.length} sent. ${pending.length} ${pending.length === 1 ? "is" : "are"} still to go.` : draftsSentence(kept)} Expected about {inrCompact(impact.inr)} over {impact.horizonDays} days.
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={cn("t-caption", busy ? "text-ink-3" : retrying ? "text-debit" : "text-ink-2")} aria-live="polite">{busy ? "Sending…" : retrying ? `${pending.length} not sent` : "Not sent yet"}</span>
              <Button variant="primary" size="lg" onClick={() => void approve()} loading={busy} disabled={!pending.length}>
                {busy ? labels.working : retrying ? `Send ${pending.length} again` : labels.approve}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function Done({ ref, lines, impact, checkBack }: { ref: React.Ref<HTMLElement>; lines: string[]; impact: { inr: number; horizonDays: number; basis: string }; checkBack: string }) {
  return (
    <section ref={ref} aria-label="Done" tabIndex={-1} className="outline-none">
      <ul className="flex flex-col gap-2">
        {lines.map((l) => (
          <li key={l} className="flex items-start gap-2 t-ui text-ink">
            <Check className="mt-0.5 size-4 shrink-0 text-credit" aria-hidden strokeWidth={2} />
            {l}
          </li>
        ))}
      </ul>
      <p className="mt-5 t-body text-ink">
        Expected about <strong className="font-semibold">{inrCompact(impact.inr)}</strong> over {impact.horizonDays} days.
      </p>
      <p className="mt-1 t-caption text-ink-2">Basis: {impact.basis}.</p>
      <p className="mt-5 t-body text-ink">
        {MUNSHI.checkBack} <span className="text-ink-2">That is {shortDate(checkBack)}.</span>
      </p>
    </section>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Preparing the drafts" className="flex flex-col gap-3">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton mt-3 h-28 w-full" />
      <div className="skeleton h-28 w-full" />
    </div>
  );
}
