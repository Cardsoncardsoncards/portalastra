import { getSupabase, hasSupabase } from '@/lib/supabase'

// Durable, keyed cache for generated text.
//
// Replaces the single-slot module-level caches in /api/ritual-prompt and
// /api/apod-simple. Those held exactly one entry per server instance, so on a
// serverless platform they were near-useless: every cold start re-paid for an
// Anthropic call, and the ritual-prompt slot thrashed between phases because
// one visitor on a Full Moon evicted the entry the next visitor needed.
//
// Keys carry the date (and the phase, for ritual prompts), so entries are
// naturally scoped and nothing goes stale silently.

const TABLE = 'portal_astra_text_cache'

// Small in-process cache in front of Supabase. Same request, same instance,
// no round trip. It is keyed, unlike the single slots it replaces.
const memory = new Map<string, string>()

export async function getCachedText(key: string): Promise<string | null> {
  const local = memory.get(key)
  if (local) return local

  if (!hasSupabase()) return null

  try {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select('value')
      .eq('cache_key', key)
      .maybeSingle()

    if (error || !data?.value) return null
    memory.set(key, data.value)
    return data.value
  } catch (err) {
    // A cache miss is always safe. Never let a cache failure fail the request.
    console.error('[textCache] read failed:', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

export async function setCachedText(key: string, value: string): Promise<void> {
  memory.set(key, value)

  if (!hasSupabase()) return

  try {
    await getSupabase()
      .from(TABLE)
      .upsert({ cache_key: key, value, created_at: new Date().toISOString() }, { onConflict: 'cache_key' })
  } catch (err) {
    console.error('[textCache] write failed:', err instanceof Error ? err.message : 'unknown')
  }
}

/** Test helper. Clears only the in-process layer. */
export function _clearMemoryCache(): void {
  memory.clear()
}
