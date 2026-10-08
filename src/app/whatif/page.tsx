import { EmptyState } from "@/components/primitives";

export default function Page() {
  return (
    <>
      <h1 className="t-page-title text-ink">What if</h1>
      <EmptyState className="mt-6" title="Move a lever and the model recomputes the month." detail="This screen arrives in a later phase of the build." />
    </>
  );
}
