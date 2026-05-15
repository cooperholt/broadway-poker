import { createClient } from "@supabase/supabase-js";

// Hardcoded defaults so prod works without Vercel env vars. The anon /
// publishable key is designed to be public — RLS policies protect the data.
const DEFAULT_URL = "https://tsiduteugfmbxwborujc.supabase.co";
const DEFAULT_ANON_KEY = "sb_publishable_j0r4zGGBb5N2IYzyX7wTrQ_0QGsQJ07";

export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
