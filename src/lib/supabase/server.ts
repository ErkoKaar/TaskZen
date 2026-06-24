import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Kasutatakse serveris (Server Components, Route Handlers, Server Actions)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component'ist ei saa cookie'sid kirjutada;
            // see on OK, kui middleware uuendab sessiooni.
          }
        },
      },
    },
  );
}
