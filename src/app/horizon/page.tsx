import { EmptyState } from "@/components/primitives";

export default function Page() {
  return (
    <>
      <h1 className="t-page-title text-ink">Horizon</h1>
      <EmptyState className="mt-6" title="The next 30 days of cash, with every outflow on the line." detail="This screen arrives in a later phase of the build." />
    </>
  );
}
