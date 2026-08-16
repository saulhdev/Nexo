export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
export const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim() ?? ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
