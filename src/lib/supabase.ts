import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy Supabase client, matching the pattern the Stripe routes already use
// correctly.
//
// Constructing this at module scope with `process.env.SUPABASE_URL!` throws at
// import time when the env vars are runtime-only, which takes down the entire
// route (including the code paths that do not touch Supabase at all) rather
// than failing the one query that needed it.

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY is not set')
  }

  client = createClient(url, key)
  return client
}

/** True when Supabase is configured, so callers can degrade instead of throwing. */
export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
}
