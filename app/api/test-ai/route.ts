import { geminiFlash } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function GET() {
    console.log('[TestAI] Initiating connection test...');
    try {
        const result = await geminiFlash.generateContent("Hello, respond with 'SDK Connection Successful' if you can read this.");
        const text = result.response.text();

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
