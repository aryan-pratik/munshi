"use client";

import { CircleAlert } from "lucide-react";
import { useWorld } from "@/lib/store/world";
import { hoursBetween, nowAt } from "@/engine/windows";
import { cn } from "@/lib/utils";

/** A plain sentence at the foot of the rail: "Synced 4 minutes ago", "Freshdesk is still syncing". */
export function SourceStatus({ className }: { className?: string }) {
  const world = useWorld();
  const at = nowAt(world);
  const error = world.sources.find((s) => s.status === "error");
  const syncing = world.sources.find((s) => s.status === "syncing");
  const latest = world.sources.filter((s) => s.status === "connected").map((s) => s.lastSyncAt).sort().pop();
  const minutes = latest ? Math.max(1, Math.round(hoursBetween(latest, at) * 60)) : null;
  let text: string;
  if (error) text = `${error.name} needs reconnecting`;
  else if (syncing) text = `${syncing.name} is still syncing`;
  else if (minutes !== null) text = minutes < 60 ? `Synced ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago` : `Synced ${Math.round(minutes / 60)} hours ago`;
  else text = "Not synced yet";
  return (
    <p className={cn("flex items-center gap-1.5 t-caption text-rail-text-2", className)}>
      {error ? <CircleAlert className="size-3.5 text-debit" aria-hidden strokeWidth={1.75} /> : null}
      {text}
    </p>
  );
}
