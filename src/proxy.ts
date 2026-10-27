import { NextResponse, type NextRequest } from "next/server"
import { IS_DEMO } from "@/lib/demo/mode"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  if (IS_DEMO) {
    // The demo has no accounts, so the login page has nothing to show.
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/tasks", request.url))
    }
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
