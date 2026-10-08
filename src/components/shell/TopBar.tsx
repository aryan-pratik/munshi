"use client";

import { useWorld } from "@/lib/store/world";
import { CommandK } from "./CommandK";

/** 56px: business name, the global ask field, avatar (DESIGN.md, Layout). */
export function TopBar() {
  const world = useWorld();
  const { name, owner } = world.meta.business;
  const initials = owner
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-rule bg-chalk px-4 md:px-8">
      <span className="hidden min-w-0 shrink-0 t-ui font-semibold text-ink sm:inline">{name}</span>
      <CommandK className="min-w-0 flex-1 md:mx-auto md:max-w-[520px]" />
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-neel-soft t-caption font-medium text-neel" title={owner}>
        <span aria-hidden>{initials}</span>
        <span className="sr-only">{owner}</span>
      </span>
    </header>
  );
}
