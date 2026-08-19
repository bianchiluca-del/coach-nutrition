import { createClient } from '@supabase/supabase-js';

// Ces identifiants publics sont intégrés au client statique. La sécurité des
// données repose sur Supabase Auth et les politiques RLS, pas sur leur secret.
const PRODUCTION_SUPABASE_URL = "https://hkwmsndqojpeyqmtkblt.supabase.co";
const PRODUCTION_SUPABASE_ANON_KEY = "sb_publishable_XTU1ky96KO7Els1xD_DPXg_3wBpA9Ol";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PRODUCTION_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PRODUCTION_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
