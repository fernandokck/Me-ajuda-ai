/**
 * Supabase Client Configuration
 * Graceful initialization: works local-first when keys are not set,
 * and automatically activates cloud sync & Google OAuth when keys are filled.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://svosaldhnxcqpmbjycbe.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2b3NhbGRobnhjcXBtYmp5Y2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDUwNDIsImV4cCI6MjEwNjAyMTA0Mn0.FtR6-LV4SnK_51T9q3mX8zVc814bzHiFVTFrULYFFhs';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('seu-projeto.supabase.co') &&
  !supabaseAnonKey.includes('sua-chave')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;
