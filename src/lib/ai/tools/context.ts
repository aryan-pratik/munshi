import { z } from "zod";
import type { World } from "@/types";

// The per-request context every tool reads (docs/AI_SDK_NOTES.md, section 4). z.custom passes the
// World through by reference; a full schema would re-validate and copy it before every call.
export const worldContext = z.object({ world: z.custom<World>((v) => typeof v === "object" && v !== null && "meta" in (v as object)) });
export type WorldContext = z.infer<typeof worldContext>;
