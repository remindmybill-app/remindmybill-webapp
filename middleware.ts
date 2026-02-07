
import { createServerClient } from "@supabase/ssr"
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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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
            // Treat as unauthenticated if Supabase fails
            // Protected routes redirect to login, public routes continue
            const protectedPaths = ["/dashboard", "/profile", "/settings", "/analytics"]
            if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
                return NextResponse.redirect(new URL("/auth/login", request.url))
            }
            return supabaseResponse
        }

        // Protected Routes Logic
        const protectedPaths = ["/dashboard", "/profile", "/settings", "/analytics"]
        if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
            if (!user) {
                return NextResponse.redirect(new URL("/auth/login", request.url))
            }
        }

        if (request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname === "/") {
            // Optional: Redirect logged-in users away from login pages?
            // For now, we only enforcing dashboard protection.
            // The landing page handles its own "Go to Dashboard" button logic.
        }

        return supabaseResponse
    } catch (error) {
        // Network error or Supabase completely unreachable
        console.error("[Middleware] Network error connecting to Supabase:", error instanceof Error ? error.message : error)

        // Graceful degradation: allow public pages, redirect protected pages to login
        const protectedPaths = ["/dashboard", "/profile", "/settings", "/analytics"]
        if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
            console.log("[Middleware] Redirecting protected route to login due to database unavailability")
            return NextResponse.redirect(new URL("/auth/login", request.url))
        }

        // Allow access to public pages even if Supabase is down
        return supabaseResponse
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
