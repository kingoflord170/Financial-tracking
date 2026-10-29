import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://pkklhcjfeczqnnpuoglf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBra2xoY2pmZWN6cW5ucHVvZ2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzg0ODAsImV4cCI6MjA5ODE1NDQ4MH0.o8Yr9TlVMKfCDaVQUSq4rIMS6zewM00z--OjCrcl3kY';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Check if credentials are valid, non-empty, and not default placeholders
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-publishable-key') &&
  supabaseUrl.startsWith('https://')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Checks whether the Supabase connection is currently reachable and authenticated.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      connected: false,
      message: 'Supabase credentials are not configured.',
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is empty results, which is fine
      return {
        connected: false,
        message: `Connected to Supabase endpoint, but table query returned error: ${error.message}`,
      };
    }
    return {
      connected: true,
      message: 'Successfully connected to Supabase PostgreSQL database with Row Level Security active.',
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `Failed to connect to Supabase: ${errMessage}`,
    };
  }
}
