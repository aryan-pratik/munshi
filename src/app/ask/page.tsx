import { EmptyState } from "@/components/primitives";

export default function Page() {
  return (
    <>
      <h1 className="t-page-title text-ink">Why</h1>
      <EmptyState className="mt-6" title="Ask why a number moved. The answer comes with the records behind it." detail="This screen arrives in a later phase of the build." />
    </>
  );
}
