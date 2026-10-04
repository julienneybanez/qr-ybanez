import 'expo-sqlite/localStorage/install';

import {
  createClient,
} from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        /*
         * Expo's SQLite-backed localStorage is the officially
         * supported Expo persistence approach for Supabase.
         */
        storage:
          localStorage,

        autoRefreshToken:
          true,

        persistSession:
          true,

        detectSessionInUrl:
          false,
      },
    }
  );
