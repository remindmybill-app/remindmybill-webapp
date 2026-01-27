import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Optimized text generation using GPT-4o-mini.
 * Focused on speed and cost-effectiveness.
 */
export async function generateText(prompt: string): Promise<string | null> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("[OpenAI] Missing OPENAI_API_KEY in environment.");
        return null;
    }

    try {
        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 500,
        });

        const content = res.choices[0]?.message?.content;
        return content ? content.trim() : null;
    } catch (err) {
        console.error("[OpenAI] Error:", err);
        return null; // fail gracefully
    }
}
