"use client";

import { useId, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { onAsk: (text: string) => void; busy: boolean; initial?: string; mode?: "live" | "scripted" | null; placeholder?: string; className?: string };

/** A labelled, auto-growing field with an icon button labelled "Ask" (DESIGN.md, Why). */
export function AskComposer({ onAsk, busy, initial = "", mode, placeholder = "Why did revenue fall last week…", className }: Props) {
  const [text, setText] = useState(initial);
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onAsk(t);
    setText("");
    if (ref.current) ref.current.style.height = "";
  };
  return (
    <form
      className={cn("flex flex-col gap-1", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="t-label text-ink-2">
        Ask Munshi
      </label>
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          name="question"
          autoComplete="off"
          rows={1}
          value={text}
          disabled={busy}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "";
            e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="block min-h-9 w-full resize-none rounded-[8px] border border-rule-strong bg-surface py-[7px] pr-12 pl-3 t-ui text-ink placeholder:text-ink-3 focus:border-neel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel disabled:bg-wash disabled:text-ink-3"
        />
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Ask" disabled={busy || !text.trim()} className="absolute right-1 bottom-1">
          <CornerDownLeft aria-hidden strokeWidth={1.5} />
        </Button>
      </div>
      <p className="t-caption min-h-4 text-ink-3" aria-live="polite">
        {mode === "scripted" ? "Demo answers" : mode === "live" ? "Live answers" : ""}
      </p>
    </form>
  );
}
