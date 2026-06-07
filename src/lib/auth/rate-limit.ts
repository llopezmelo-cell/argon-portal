/**
 * Rate limiting simple en memoria
 * Para producción usar Redis o Upstash
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export async function rateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `${action}:${identifier}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return false // no limitado
  }

  entry.count++
  if (entry.count > maxRequests) return true // limitado

  return false
}

export function resetRateLimit(identifier: string, action: string): void {
  store.delete(`${action}:${identifier}`)
}
