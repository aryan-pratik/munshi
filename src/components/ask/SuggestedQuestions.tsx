import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SUGGESTED_QUESTIONS } from "@/data/questions";
import { cn } from "@/lib/utils";

/** The suggested questions as ghost buttons; the same list the ask field shows. */
export function SuggestedQuestions({ heading = "Ask Munshi", className }: { heading?: string | null; className?: string }) {
  return (
    <section className={className} aria-label="Suggested questions">
      {heading ? <h2 className="t-label text-ink-2">{heading}</h2> : null}
      <ul className="mt-2 flex flex-col gap-0.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <li key={q.id}>
            <Link href={`/ask?q=${q.id}`} className={cn(buttonVariants({ variant: "ghost" }), "-mx-2 h-auto w-[calc(100%+16px)] justify-start px-2 py-2 text-left whitespace-normal")}>
              {q.text}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
