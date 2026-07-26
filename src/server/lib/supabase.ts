import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env.local file for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_* equivalents)."
  );
}
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY);

console.log(
  "Selected key:",
  supabaseServiceKey.substring(0, 20)
);

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});