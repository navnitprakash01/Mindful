import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
  console.error("VITE_SUPABASE_ANON_KEY =", import.meta.env.VITE_SUPABASE_ANON_KEY);
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);