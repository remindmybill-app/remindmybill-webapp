import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

console.log('--- AI CONFIGURATION ---');
console.log('API Key Status:', apiKey ? 'Present' : 'MISSING');
if (apiKey) {
    console.log('Key Prefix:', apiKey.substring(0, 4) + '...');
}
console.log('------------------------');

if (!apiKey) {
    console.warn('[Gemini] GOOGLE_GENERATIVE_AI_API_KEY is not defined in environment variables.');
}

export const genAI = new GoogleGenerativeAI(apiKey || "");
// Confirmed available via diagnostics
export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Safe wrapper for Gemini content generation.
 * Handles 429 (Quota Exceeded) by returning null instead of throwing.
 */
export async function generateSafeContent(prompt: string): Promise<string | null> {
    try {
        const result = await geminiFlash.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error: any) {
        // Handle 429 Quota Exceeded error
        if (error?.status === 429 || error?.message?.includes('429')) {
            console.warn('[Gemini] Quota exhausted (429), pausing AI features.');
            return null;
        }

        // Rethrow other errors to be caught by the action's specific catch block
        throw error;
    }
}
