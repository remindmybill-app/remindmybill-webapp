import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Validate environment variables exist
    if (!url || !key) {
      throw new Error("Supabase credentials missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")
    }

    // Validate URL format to catch DNS issues early
    try {
      new URL(url)
    } catch {
      throw new Error(`Invalid Supabase URL format: ${url}`)
    }

    // Create client
    supabaseClient = createBrowserClient(url, key)

    console.log("[Supabase Client] Initialized successfully")
    return supabaseClient
  } catch (error) {
    console.error("[Supabase Client] Initialization error:", error instanceof Error ? error.message : error)

    // Re-throw to let calling code handle it gracefully
    throw error
  }
}
