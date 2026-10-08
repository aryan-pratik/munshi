import { Suspense } from "react";
import { WhatIfScreen } from "@/components/whatif/WhatIfScreen";

export default function Page() {
  return (
    <Suspense>
      <WhatIfScreen />
    </Suspense>
  );
}
