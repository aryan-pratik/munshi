import { World } from "@/types";
import raw from "./world.json";

let cached: World | null = null;

/** The committed seed, parsed once. Callers never mutate it; the engine replays actions over it. */
export function seedWorld(): World {
  if (!cached) cached = World.parse(raw);
  return cached;
}
