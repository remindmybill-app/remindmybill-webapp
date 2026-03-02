
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
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

            // Use an internal Node.js API route to check admin status.
            // We cannot use createClient from @supabase/supabase-js here
            // because middleware runs on the Edge Runtime which does not
            // support the Node.js APIs that package depends on.
            try {
                const checkUrl = new URL("/api/admin/check-role", request.url)
                checkUrl.searchParams.set("userId", user.id)

                const adminCheckResponse = await fetch(checkUrl.toString(), {
                    headers: {
                        "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
                    },
                })

                if (adminCheckResponse.ok) {
                    const { isAdmin } = await adminCheckResponse.json()
                    if (!isAdmin) {
                        return NextResponse.redirect(new URL("/dashboard", request.url))
                    }
                } else {
                    // If the check fails, deny access to admin routes
                    return NextResponse.redirect(new URL("/dashboard", request.url))
                }
            } catch (err) {
                console.error("[Middleware] Admin check failed:", err)
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
        "/((?!_next/static|_next/image|favicon.ico|api/cron|api/admin/check-role|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
