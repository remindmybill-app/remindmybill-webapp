
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    try {
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        // Handle Supabase errors (database waking up, network issues, etc.)
        if (authError) {
            console.error("[Middleware] Supabase auth error:", authError.message)
            const protectedPaths = ["/dashboard", "/profile", "/settings", "/analytics", "/admin"]
            if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
                return NextResponse.redirect(new URL("/auth/login", request.url))
            }
            return supabaseResponse
        }

        // ─── Admin Route Protection ─────────────────────────────────
        if (request.nextUrl.pathname.startsWith("/admin")) {
            if (!user) {
                return NextResponse.redirect(new URL("/dashboard", request.url))
            }

            // Use service role client to bypass RLS for admin check
            const adminSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false,
                    },
                }
            )

            const { data: profile } = await adminSupabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .single()

            if (!profile?.is_admin) {
                return NextResponse.redirect(new URL("/dashboard", request.url))
            }

            return supabaseResponse
        }

        // ─── Protected Routes Logic ─────────────────────────────────
        const protectedPaths = ["/dashboard", "/profile", "/settings", "/analytics"]
        if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
            if (!user) {
                return NextResponse.redirect(new URL("/auth/login", request.url))
            }
        }

        if (request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname === "/") {
            // Optional: Redirect logged-in users away from login pages?
        }

        return supabaseResponse
    } catch (error) {
        console.error("[Middleware] Network error connecting to Supabase:", error instanceof Error ? error.message : error)

        const protectedPaths = ["/dashboard", "/profile", "/settings", "/analytics", "/admin"]
        if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
            console.log("[Middleware] Redirecting protected route to login due to database unavailability")
            return NextResponse.redirect(new URL("/auth/login", request.url))
        }

        return supabaseResponse
    }
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
