// One tiny call per model ID so a wrong ID or missing key fails on day one (docs/AI_SDK_NOTES.md).
// Skips itself when no key is set: scripted mode needs none. Run: pnpm smoke
import { generateText } from "ai";
import { MODELS } from "../src/lib/ai/models";

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // no .env.local: fall through to the key check
  }
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    console.log("smoke-models: no key, skipping (scripted mode needs none)");
    return;
  }
  for (const [role, model] of Object.entries(MODELS)) {
    try {
      const { text } = await generateText({
        model,
        prompt: "Reply with the single word: ok",
        maxOutputTokens: 16,
        maxRetries: 0,
      });
      console.log("ok  ", role, model, "->", text.trim());
    } catch (error) {
      process.exitCode = 1;
      const e = error as { name?: string; statusCode?: number; message?: string };
      console.error("FAIL", role, model, e.name, e.statusCode ?? "", e.message);
    }
  }
}

main();
