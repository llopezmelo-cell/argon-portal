/**
 * Manejo de PIN de 6 dígitos
 * El PIN se hashea antes de guardarse — nunca en texto plano
 */

const MAX_ATTEMPTS = 5

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashPin(pin)
  return pinHash === hash
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

export { MAX_ATTEMPTS }
