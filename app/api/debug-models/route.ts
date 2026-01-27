import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "MISSING_API_KEY",
            message: "GOOGLE_GENERATIVE_AI_API_KEY is not defined in environment variables."
        }, { status: 400 });
    }

    console.log('[DebugModels] Fetching available models from Google API...');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('[DebugModels] Google API Error:', response.status, errorBody);
            return NextResponse.json({
                success: false,
                status: response.status,
                statusText: response.statusText,
                googleError: errorBody
            }, { status: response.status });
        }

        const data = await response.json();

        console.log('[DebugModels] Successfully retrieved models:', data?.models?.length || 0);

        return NextResponse.json({
            success: true,
            apiKeyPrefix: apiKey.substring(0, 4) + '...',
            models: data.models || []
        });
    } catch (error: any) {
        console.error('[DebugModels] Network/Internal Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
