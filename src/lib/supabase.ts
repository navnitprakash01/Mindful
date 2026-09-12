import { createClient } from "@supabase/supabase-js";

// Resilient env variable accessor supporting both Vite (import.meta.env) and Node.js test runner (process.env)
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return "";
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== "test") {
    console.error("Missing Supabase environment variables. Check your .env.local file.");
  }
}

// Fallback client for test environments or missing keys
export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);