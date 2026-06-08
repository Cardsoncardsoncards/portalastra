'use client'

import { useState } from 'react'
import styles from './page.module.css'

export default function WaitlistForm({
  buttonText = 'Join the waitlist',
  successText = "You're on the list! We'll notify you at launch.",
  source = 'premium-waitlist',
}: {
  buttonText?: string
  successText?: string
  source?: string
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; msg: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setNote(null)
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const d = await r.json()
      if (r.ok) {
        setNote({ ok: true, msg: successText })
        setEmail('')
      } else {
        setNote({ ok: false, msg: d.error || 'Something went wrong.' })
      }
    } catch {
      setNote({ ok: false, msg: 'Network error — try again.' })
    }
    setBusy(false)
  }

  return (
    <form className={styles.waitForm} onSubmit={submit}>
      <input
        type="email"
        className={styles.waitInput}
        placeholder="you@example.com"
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" className={styles.waitBtn} disabled={busy}>
        {busy ? 'Joining...' : buttonText}
      </button>
      {note && <p className={note.ok ? styles.waitOk : styles.waitErr}>{note.msg}</p>}
    </form>
  )
}
