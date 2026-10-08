import { EmptyState } from "@/components/primitives";

export default function Page() {
  return (
    <>
      <h1 className="t-page-title text-ink">Vault</h1>
      <EmptyState className="mt-6" title="Every source and every record behind a claim." detail="This screen arrives in a later phase of the build." />
    </>
  );
}
