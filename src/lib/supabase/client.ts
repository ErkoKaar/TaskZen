import { createBrowserClient } from "@supabase/ssr";

// Kasutatakse "use client" komponentides (brauseris töötav kood)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
