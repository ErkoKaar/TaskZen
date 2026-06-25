import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS. Server-only, never import from a
// "use client" file. Needed to resolve a username to an email at login
// (before the user is authenticated) and to create a profile row right
// after sign-up.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
