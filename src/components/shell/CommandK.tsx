"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Kbd } from "@/components/primitives";
import { SUGGESTED_QUESTIONS } from "@/data/questions";
import { cn } from "@/lib/utils";

// The global ask field (DESIGN.md, Navigation): Cmd+K focuses it instantly, no animation. Focused
// and empty, it lists the suggested questions; one opens Why with its id, free text opens Why with
// the text. Nothing here animates: it is a keyboard surface used many times a day.

export function CommandK({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showList = open && text.trim() === "";

  const go = (q: string) => {
    setOpen(false);
    setText("");
    inputRef.current?.blur();
    router.push(`/ask?q=${encodeURIComponent(q)}&n=${Date.now().toString(36)}`);
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden strokeWidth={1.5} />
      <input
        ref={inputRef}
        type="text"
        name="ask"
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-label="Ask Munshi"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Ask why revenue fell, or what to do today…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setText("");
            setOpen(false);
            inputRef.current?.blur();
          } else if (e.key === "ArrowDown" && showList) {
            e.preventDefault();
            setActive((a) => (a + 1) % SUGGESTED_QUESTIONS.length);
          } else if (e.key === "ArrowUp" && showList) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? SUGGESTED_QUESTIONS.length - 1 : a - 1));
          } else if (e.key === "Enter") {
            if (showList && active >= 0) go(SUGGESTED_QUESTIONS[active].id);
            else if (text.trim()) go(text.trim());
          }
        }}
        className="h-9 w-full truncate rounded-[8px] border border-rule-strong bg-surface pr-16 pl-9 t-ui text-ink placeholder:text-ink-3 focus:border-neel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neel"
      />
      <span className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 phone:inline-flex">
        <Kbd>{isMac ? "Cmd K" : "Ctrl K"}</Kbd>
      </span>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggested questions"
          className="absolute inset-x-0 top-full z-40 mt-1 rounded-[12px] bg-surface p-1 shadow-(--shadow-float) dark:bg-wash"
        >
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <li
              key={q.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => {
                e.preventDefault();
                go(q.id);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex h-8 cursor-pointer items-center rounded-[8px] px-2 t-ui text-ink", active === i && "bg-wash")}
            >
              {q.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
