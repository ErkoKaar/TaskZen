// Set NEXT_PUBLIC_DEMO_MODE=1 to build the public demo: no auth, no Supabase,
// sample data stored in the visitor's browser (see src/lib/demo/client.ts).
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1"
