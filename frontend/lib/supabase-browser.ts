import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient (not the plain supabase-js createClient) mirrors the
// session into cookies as well as localStorage, so Server Components and
// Route Handlers can read the same session — see lib/supabase-server.ts.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};
