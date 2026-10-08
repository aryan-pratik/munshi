import { Suspense } from "react";
import { VaultScreen } from "@/components/vault/VaultScreen";

export default function Page() {
  return (
    <Suspense>
      <VaultScreen />
    </Suspense>
  );
}
