const BASE = 'https://api.nasa.gov'

function apiKey(): string {
  return process.env.NASA_API_KEY || 'DEMO_KEY'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Backoff before the 2nd and 3rd attempts. NASA's APOD/DONKI endpoints return
// transient 5xx/429s fairly often, so we retry those (and network failures)
// up to 3 times total before giving up. Non-retryable client errors fail fast.
const RETRY_DELAYS = [300, 800]

export async function nasaFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3600,
): Promise<T> {
  const url = new URL(path, BASE)
  url.searchParams.set('api_key', apiKey())
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response
    try {
      res = await fetch(url.toString(), { next: { revalidate } })
    } catch (err) {
      // Network-level failure — retryable
      lastErr = err
      if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt])
      continue
    }

    if (res.ok) return res.json() as Promise<T>

    // Retry transient upstream errors; fail fast on everything else (4xx).
    if (res.status >= 500 || res.status === 429) {
      lastErr = new Error(`NASA ${path} responded ${res.status}`)
      if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt])
      continue
    }
    throw new Error(`NASA ${path} responded ${res.status}`)
  }

  throw lastErr instanceof Error ? lastErr : new Error(`NASA ${path} request failed`)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
