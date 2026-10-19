import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
      message: 'Supabase credentials are not configured. The application is running in local offline / demo mode.',
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
