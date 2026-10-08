"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Levers as LeversT } from "@/types";
import { BASE_LEVERS, simulate, simulateBase } from "@/engine";
import { usePhone } from "@/lib/hooks";
import { useWorld } from "@/lib/store/world";
import { presetLevers } from "@/lib/whatif";
import { Levers } from "./Levers";
import { OutcomeTable } from "./OutcomeTable";
import { StrategyScan } from "./StrategyScan";

/** The What if screen (DESIGN.md, What if): levers left, the outcome table right, the scan below. */
export function WhatIfScreen() {
  const world = useWorld();
  const params = useSearchParams();
  const preset = params.get("preset");
  const [levers, setLevers] = useState<LeversT>(() => presetLevers(world, preset) ?? BASE_LEVERS);
  const base = simulateBase(world);
  const scenario = useMemo(() => simulate(world, levers), [world, levers]);
  const phone = usePhone();
  const outcomeRef = useRef<HTMLElement>(null);
  // On a phone the outcome table sits a screen above the strategies, so Apply brings it back.
  const apply = (l: LeversT) => {
    setLevers(l);
    if (phone) outcomeRef.current?.scrollIntoView({ block: "start" });
  };
  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">What if</h1>
      <p className="t-body text-ink-2">Move a lever and the model recomputes the month. Nothing here is sent or changed.</p>
      <div className="grid grid-cols-1 gap-8 stack:grid-cols-[360px_minmax(0,1fr)]">
        <Levers levers={levers} onChange={setLevers} />
        <div className="flex min-w-0 flex-col gap-8">
          <OutcomeTable ref={outcomeRef} base={base} scenario={scenario} />
          <StrategyScan world={world} levers={levers} onApply={apply} />
        </div>
      </div>
    </div>
  );
}
