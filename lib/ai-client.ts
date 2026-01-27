/**
 * Universal AI Client using OpenRouter
 * Replaces direct Google Gemini SDK calls
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'RemindMyBill';

export async function generateText(prompt: string, model: string = "google/gemini-2.0-flash-001"): Promise<string | null> {
    if (!OPENROUTER_API_KEY) {
        console.warn('[AI-Client] OPENROUTER_API_KEY is missing');
        return null;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": model,
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[AI-Client] OpenRouter Error:', response.status, errorData);

            // Handle Quota/Rate Limits (429)
            if (response.status === 429) {
                console.warn('[AI-Client] Quota exhausted or rate limited.');
                return null;
            }

            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.warn('[AI-Client] Empty response from OpenRouter');
            return null;
        }

        return content.trim();
    } catch (error) {
        console.error('[AI-Client] Network/Internal Error:', error);
        return null;
    }
}
