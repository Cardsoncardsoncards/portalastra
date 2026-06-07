const BASE = 'https://api.nasa.gov'

function apiKey(): string {
  return process.env.NASA_API_KEY || 'DEMO_KEY'
}

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

  const res = await fetch(url.toString(), { next: { revalidate } })
  if (!res.ok) {
    throw new Error(`NASA ${path} responded ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
