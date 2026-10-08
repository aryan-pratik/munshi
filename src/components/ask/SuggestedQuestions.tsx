"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { QuestionId } from "@/data/questions";
import { SUGGESTED_QUESTIONS } from "@/data/questions";
import { cn } from "@/lib/utils";

/** The suggested questions as ghost buttons; the same list the ask field shows. */
type Props = {
  heading?: string | null;
  className?: string;
  /** The question just asked, left out of the list. */
  exclude?: QuestionId | null;
  /** On the Why screen the pick asks in place instead of navigating. */
  onPick?: (id: QuestionId, text: string) => void;
};

export function SuggestedQuestions({ heading = "Ask Munshi", className, exclude = null, onPick }: Props) {
  // Full-width rows step their ground and do not scale (DESIGN.md, Press).
  const cls = cn(buttonVariants({ variant: "ghost" }), "pressable-row -mx-2 h-auto w-[calc(100%+16px)] justify-start px-2 py-2 text-left whitespace-normal");
  return (
    <section className={className} aria-label="Suggested questions">
      {heading ? <h2 className="t-label text-ink-2">{heading}</h2> : null}
      <ul className="mt-2 flex flex-col gap-0.5">
        {SUGGESTED_QUESTIONS.filter((q) => q.id !== exclude).map((q) => (
          <li key={q.id}>
            {onPick ? (
              <Button variant="ghost" className={cls} onClick={() => onPick(q.id, q.text)}>
                {q.text}
              </Button>
            ) : (
              <Link href={`/ask?q=${q.id}`} className={cls}>
                {q.text}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
