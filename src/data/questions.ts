// The suggested questions. Each id names a recorded script in src/data/scripts (Phase 4), so the
// Cmd+K list, the Today right column and /ask share one list.
export const SUGGESTED_QUESTIONS = [
  { id: "why-revenue-fell", text: "Why did revenue fall last week?" },
  { id: "why-complaints-up", text: "Why are delivery complaints up?" },
  { id: "which-customers-at-risk", text: "Which customers are at risk?" },
  { id: "what-should-i-do-today", text: "What should I do today?" },
] as const;

export type QuestionId = (typeof SUGGESTED_QUESTIONS)[number]["id"];
