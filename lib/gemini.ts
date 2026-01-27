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
export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
