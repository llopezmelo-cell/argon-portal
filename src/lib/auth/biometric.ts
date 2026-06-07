/**
 * WebAuthn — Face ID / Touch ID / Huella
 * Funciona en iOS Safari, Android Chrome, Windows Hello
 */

export function isBiometricSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  )
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isBiometricSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Registrar biometría por primera vez */
export async function registerBiometric(params: {
  userId: string
  userName: string
  userEmail: string
  challenge: ArrayBuffer
}): Promise<PublicKeyCredential | null> {
  if (!await isBiometricAvailable()) return null

  const rpId = window.location.hostname

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: params.challenge,
      rp: {
        name: 'ARGon Broker',
        id: rpId,
      },
      user: {
        id: new TextEncoder().encode(params.userId),
        name: params.userEmail,
        displayName: params.userName,
      },
      pubKeyCredParams: [
        { alg: -7,  type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // solo dispositivo (Face ID / huella)
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  }) as PublicKeyCredential | null

  return credential
}

/** Autenticar con biometría */
export async function authenticateWithBiometric(params: {
  challenge: ArrayBuffer
  credentialId?: string
}): Promise<PublicKeyCredential | null> {
  if (!await isBiometricAvailable()) return null

  const rpId = window.location.hostname

  const allowCredentials: PublicKeyCredentialDescriptor[] = params.credentialId
    ? [{
        id: base64ToArrayBuffer(params.credentialId),
        type: 'public-key',
        transports: ['internal'],
      }]
    : []

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: params.challenge,
        rpId,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null

    return credential
  } catch {
    return null
  }
}

// Helpers
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
