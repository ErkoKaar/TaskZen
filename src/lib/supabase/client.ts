import { createBrowserClient } from "@supabase/ssr";
import { IS_DEMO } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Kasutatakse "use client" komponentides (brauseris töötav kood)
export function createClient(): ReturnType<typeof createSupabaseClient> {
  if (IS_DEMO) {
    // Covers every call the stores make; see src/lib/demo/client.ts.
    return createDemoClient() as unknown as ReturnType<typeof createSupabaseClient>;
  }
  return createSupabaseClient();
}
