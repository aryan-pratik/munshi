import { Suspense } from "react";
import { AskScreen } from "@/components/ask/AskScreen";

export default function AskPage() {
  return (
    <Suspense fallback={<div className="skeleton h-9 w-full max-w-[880px]" aria-hidden />}>
      <AskScreen />
    </Suspense>
  );
}
