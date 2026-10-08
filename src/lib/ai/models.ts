// Every model ID lives here (docs/AI_SDK_NOTES.md, section 2). Gateway slugs use dots.
export const MODELS = {
  agent: "anthropic/claude-sonnet-5.5",
  fast: "anthropic/claude-haiku-5.5",
  fastFallback: "anthropic/claude-haiku-4.5",
} as const;
