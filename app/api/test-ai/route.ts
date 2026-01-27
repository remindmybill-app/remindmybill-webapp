import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai-client";

export async function GET() {
    console.log('[TestAI] Initiating connection test via OpenRouter...');
    try {
        const text = await generateText("Hello, respond with 'OpenRouter Connection Successful' if you can read this.");

        if (!text) {
            return NextResponse.json({
                success: false,
                error: "AI service returned null. Check your OpenRouter quota and API key."
            }, { status: 503 });
        }

        console.log('[TestAI] Success:', text);
        return NextResponse.json({
            success: true,
            message: text
        });
    } catch (error: any) {
        console.error('FULL AI ERROR (Test Route):', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
