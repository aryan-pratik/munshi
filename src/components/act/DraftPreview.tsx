"use client";

import { useId, useRef } from "react";
import { Check, CircleAlert, ListChecks, Mail, MessageCircle, type LucideIcon } from "lucide-react";
import type { Draft, World } from "@/types";
import { Button } from "@/components/ui/button";
import { initialsOf, recipientOf } from "@/lib/act";
import { cn } from "@/lib/utils";

const CHANNEL: Record<Draft["channel"], { icon: LucideIcon; label: string }> = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  email: { icon: Mail, label: "Email" },
  task: { icon: ListChecks, label: "Task" },
};

type Props = {
  world: World;
  draft: Draft;
  body: string;
  kept: boolean;
  /** After approval: went out, or the channel refused it and "Try again" in the bar resends it. */
  state?: "sent" | "failed";
  disabled?: boolean;
  onChange: (body: string) => void;
  onKeep: (kept: boolean) => void;
  /** Present in live mode only; a rewrite needs the model. */
  onRewrite?: () => void;
  rewriting?: boolean;
  /** Present once the channel refused this draft. */
  onRetry?: () => void;
};

/** One editable block per recipient: initials, channel, the message in the body role, Rewrite and Drop. */
export function DraftPreview({ world, draft, body, kept, state, disabled, onChange, onKeep, onRewrite, rewriting, onRetry }: Props) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const who = recipientOf(world, draft);
  const ch = CHANNEL[draft.channel];
  const Icon = ch.icon;
  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <article className={cn("rounded-[12px] border bg-surface p-4", state === "failed" ? "border-debit" : "border-rule", !kept && "opacity-60")} aria-label={`Draft to ${who.name}`}>
      {state === "failed" ? (
        <p className="mb-3 flex items-center gap-2 t-caption text-debit" role="status">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden strokeWidth={1.5} />
          <span className="min-w-0 flex-1">
            Not sent to {who.name}. {ch.label} did not respond.
          </span>
          {onRetry ? (
            <Button size="sm" variant="ghost" onClick={onRetry} disabled={disabled} className="-my-1">
              Try again
            </Button>
          ) : null}
        </p>
      ) : state === "sent" ? (
        <p className="mb-3 flex items-center gap-2 t-caption text-ink-2" role="status">
          <Check className="size-3.5 shrink-0 text-credit" aria-hidden strokeWidth={2} />
          Sent
        </p>
      ) : null}
      <header className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-wash t-caption font-medium text-ink-2" aria-hidden>
          {initialsOf(who.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-ui font-medium text-ink">{who.name}</p>
          <p className="flex items-center gap-1 t-caption text-ink-2">
            <Icon className="size-3.5 shrink-0" aria-hidden strokeWidth={1.5} />
            <span className="sr-only">{ch.label}, </span>
            <span className="truncate">{draft.subject ?? who.detail}</span>
          </p>
        </div>
        {state === "sent" ? null : (
          <Button size="sm" variant="ghost" onClick={() => onKeep(!kept)} disabled={disabled}>
            {kept ? "Drop" : "Keep"}
          </Button>
        )}
      </header>
      <label htmlFor={id} className="sr-only">
        Message to {who.name}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={body}
        disabled={disabled || !kept}
        onChange={(e) => {
          onChange(e.target.value);
          grow();
        }}
        onFocus={grow}
        rows={Math.max(2, body.split("\n").length)}
        className="mt-3 block w-[calc(100%+16px)] resize-none rounded-[8px] border border-transparent bg-transparent px-2 py-1 -mx-2 t-body text-ink hover:border-rule focus:border-neel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel disabled:text-ink-2 field-sizing-content"
      />
      {onRewrite ? (
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onRewrite} disabled={disabled || !kept || rewriting} loading={rewriting}>
            Rewrite
          </Button>
        </div>
      ) : null}
    </article>
  );
}
