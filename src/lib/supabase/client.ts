import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables are present
if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
    'Create a .env.local file with your Supabase project URL. ' +
    'See .env.example for the required format.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Create a .env.local file with your Supabase anon key. ' +
    'See .env.example for the required format.'
  )
}

/**
 * Supabase client for browser-side operations.
 *
 * This client uses the anon key and is safe to use in the browser.
 * Row Level Security (RLS) policies protect data access.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
