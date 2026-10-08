"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { SourceStatus } from "./SourceStatus";

// The rail (DESIGN.md, Layout and Navigation): 232px in neel-deep, a 64px icon rail under
// 1100px with tooltips, and a 56px bottom tab bar under 720px.

const itemBase =
  "pressable flex h-9 items-center gap-3 rounded-[8px] px-3 t-ui font-medium text-rail-text-2 hover:bg-rail-active hover:text-rail-active-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sidebar-ring) aria-[current=page]:bg-rail-active aria-[current=page]:text-rail-active-text";

export function Sidebar() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <>
      <aside className="hidden phone:flex fixed inset-y-0 left-0 z-30 w-16 rail:w-[232px] flex-col bg-neel-deep p-3 text-rail-text-2">
        <Link href="/" className="pressable mb-4 flex h-9 items-center justify-center rail:justify-start rail:px-3 rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sidebar-ring)">
          <span className="grid size-6 place-items-center rounded-[6px] bg-rail-active t-label text-rail-active-text" aria-hidden>
            म
          </span>
          <span className="ml-3 hidden rail:inline t-ui font-semibold text-rail-active-text">Munshi</span>
          <span className="sr-only rail:hidden">Munshi, home</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, Icon }) => (
            <Tooltip key={href}>
              <TooltipTrigger
                render={
                  <Link href={href} aria-current={current(href) ? "page" : undefined} className={cn(itemBase, "justify-center rail:justify-start")}>
                    <Icon className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
                    <span className="max-rail:sr-only">{label}</span>
                  </Link>
                }
              />
              <TooltipContent side="right" className="rail:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <div className="mt-auto hidden rail:block px-3 pb-1">
          <SourceStatus />
        </div>
      </aside>
      <nav className="phone:hidden fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch bg-neel-deep pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        {NAV.map(({ href, label, Icon }) => {
          const active = current(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="pressable flex flex-1 flex-col items-center justify-center gap-0.5 text-rail-text-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--sidebar-ring) aria-[current=page]:text-rail-active-text"
            >
              <Icon className="size-4" aria-hidden strokeWidth={1.5} />
              <span className="t-caption font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
