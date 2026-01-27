import { generateText } from "./ai-client";

// Mapping legacy models to OpenRouter identifiers
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

/**
 * Safe wrapper for Gemini content generation via OpenRouter.
 * Handles errors and quota by returning null.
 */
export async function generateSafeContent(prompt: string): Promise<string | null> {
    console.log('[Gemini-Legacy-Helper] Routing request through OpenRouter');
    return generateText(prompt, DEFAULT_MODEL);
}
