import { createHash, randomBytes } from 'crypto'
import { getSupabase } from '@/lib/supabase'

// Single-use, expiring magic-link tokens, stored in Supabase.
//
// Only the SHA-256 hash of the token is stored. A leaked database dump
// therefore does not hand anyone a working login link, in the same way a
// password table stores hashes rather than passwords. The token itself exists
// only in the email.

const TABLE = 'portal_astra_magic_links'

/** 20 minutes. Long enough to walk to another device, short enough to matter. */
export const MAGIC_LINK_TTL_MS = 20 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Mint and store a token for `email`. Returns the raw token, which is the only
 * time it exists in plaintext anywhere outside the email itself.
 */
export async function createMagicLink(email: string): Promise<string> {
  // 32 bytes = 256 bits of entropy. Not guessable within the 20-minute window
  // or any other window.
  const token = randomBytes(32).toString('base64url')

  const { error } = await getSupabase()
    .from(TABLE)
    .insert({
      token_hash: hashToken(token),
      email: email.toLowerCase(),
      expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString(),
    })

  if (error) throw new Error(`magic link insert failed: ${error.message}`)

  return token
}

export type ConsumeResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'unavailable' }

/**
 * Validate and burn a token.
 *
 * The "mark used" write is conditional on the row still being unused
 * (`.is('used_at', null)`), so two concurrent clicks on the same link cannot
 * both succeed: the second one updates zero rows and is rejected.
 */
export async function consumeMagicLink(token: string): Promise<ConsumeResult> {
  if (!token) return { ok: false, reason: 'not_found' }

  const supabase = getSupabase()
  const tokenHash = hashToken(token)

  const { data: row, error } = await supabase
    .from(TABLE)
    .select('email, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    console.error('[magic-link] lookup failed:', error.message)
    return { ok: false, reason: 'unavailable' }
  }
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.used_at) return { ok: false, reason: 'already_used' }
  if (new Date(row.expires_at).getTime() <= Date.now()) return { ok: false, reason: 'expired' }

  const { data: burned, error: burnError } = await supabase
    .from(TABLE)
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .select('email')

  if (burnError) {
    console.error('[magic-link] burn failed:', burnError.message)
    return { ok: false, reason: 'unavailable' }
  }
  // Zero rows updated means another request burned it between the read and the
  // write.
  if (!burned || burned.length === 0) return { ok: false, reason: 'already_used' }

  return { ok: true, email: row.email }
}

/**
 * Best-effort cleanup of tokens that expired more than a day ago. Called
 * opportunistically on link creation; a failure here is not worth failing the
 * request over.
 */
export async function pruneExpiredLinks(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await getSupabase().from(TABLE).delete().lt('expires_at', cutoff)
  } catch (err) {
    console.error('[magic-link] prune failed:', err instanceof Error ? err.message : 'unknown')
  }
}
