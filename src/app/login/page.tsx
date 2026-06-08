'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isBiometricAvailable, authenticateWithBiometric } from '@/lib/auth/biometric'
import { isValidPin } from '@/lib/auth/pin'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'biometric' | 'pin' | 'setup_pin'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [shakePin, setShakePin] = useState(false)
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable)
    // Verificar si ya hay sesión activa y válida
    supabase.auth.getUser().then(({ data, error }) => {
      if (data.user && !error) router.replace('/dashboard')
    })
  }, [])

  // ── Email → siguiente paso ──────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Verificar que el usuario existe e invitación válida
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Usuario no encontrado'); return }

      if (data.hasPin) {
        // Usuario configurado — ir a biometría o PIN
        setStep(bioAvailable && data.hasBio ? 'biometric' : 'pin')
      } else {
        // Primera vez — configurar PIN
        setStep('setup_pin')
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Biometría ──────────────────────────────────────────
  async function handleBiometric() {
    setError('')
    setLoading(true)
    try {
      const challengeRes = await fetch('/api/auth/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const { challenge } = await challengeRes.json()
      const challengeBuffer = Uint8Array.from(atob(challenge), c => c.charCodeAt(0)).buffer

      const credential = await authenticateWithBiometric({ challenge: challengeBuffer })
      if (!credential) { setStep('pin'); return }

      const res = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credentialId: credential.id, response: credential.response }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
      router.replace('/dashboard')
    } catch {
      setError('Biometría fallida. Usá tu PIN.')
      setStep('pin')
    } finally {
      setLoading(false)
    }
  }

  // ── PIN ────────────────────────────────────────────────
  function handlePinChange(index: number, value: string, pinArray: string[], setPinArray: (v: string[]) => void) {
    if (!/^\d?$/.test(value)) return
    const next = [...pinArray]
    next[index] = value
    setPinArray(next)
    if (value && index < 5) pinRefs.current[index + 1]?.focus()
  }

  function handlePinKeyDown(e: React.KeyboardEvent, index: number, pinArray: string[], setPinArray: (v: string[]) => void) {
    if (e.key === 'Backspace' && !pinArray[index] && index > 0) {
      const next = [...pinArray]
      next[index - 1] = ''
      setPinArray(next)
      pinRefs.current[index - 1]?.focus()
    }
  }

  async function handlePinSubmit() {
    const pinStr = pin.join('')
    if (!isValidPin(pinStr)) { triggerShake(); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin: pinStr }),
      })
      const data = await res.json()
      if (!res.ok) {
        const remaining = data.remainingAttempts
        setAttempts(5 - remaining)
        triggerShake()
        setPin(['', '', '', '', '', ''])
        pinRefs.current[0]?.focus()
        if (data.locked) {
          setError('Cuenta bloqueada. Contactá al administrador.')
        } else {
          setError(`PIN incorrecto. ${remaining} intentos restantes.`)
        }
        return
      }
      await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
      router.replace('/dashboard')
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetupPin() {
    const pinStr = pin.join('')
    const confirmStr = confirmPin.join('')
    if (!isValidPin(pinStr)) { setError('El PIN debe tener 6 dígitos.'); return }
    if (pinStr !== confirmStr) { setError('Los PINs no coinciden.'); triggerShake(); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/pin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin: pinStr }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
      router.replace('/dashboard')
    } catch {
      setError('Error al configurar PIN.')
    } finally {
      setLoading(false)
    }
  }

  function triggerShake() {
    setShakePin(true)
    setTimeout(() => setShakePin(false), 500)
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
         style={{ background: 'var(--bg)' }}>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center"
             style={{ background: 'var(--primary)' }}>
          <span className="text-white font-black text-2xl tracking-tight">
            AR<span style={{ color: 'var(--accent)' }}>Gon</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>ARGon Broker</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Portal de gestión</p>
      </div>

      {/* Card principal */}
      <div className="w-full max-w-sm card">

        {/* PASO: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Ingresá tu email</h2>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border text-base outline-none transition-all"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        )}

        {/* PASO: Biometría */}
        {step === 'biometric' && (
          <div className="text-center space-y-5">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Verificá tu identidad
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Usá Face ID o huella digital para acceder
            </p>
            <button
              onClick={handleBiometric}
              disabled={loading}
              className="mx-auto w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl bio-pulse transition-transform active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? '⏳' : '👤'}
            </button>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              onClick={() => setStep('pin')}
              className="text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Usar PIN en su lugar
            </button>
          </div>
        )}

        {/* PASO: PIN */}
        {(step === 'pin') && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Ingresá tu PIN
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {email}
              </p>
            </div>
            <div className={`flex gap-2 justify-center ${shakePin ? 'animate-shake' : ''}`}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePinChange(i, e.target.value, pin, setPin)}
                  onKeyDown={e => handlePinKeyDown(e, i, pin, setPin)}
                  className={`pin-digit ${digit ? 'filled' : ''} ${shakePin ? 'error' : ''}`}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {attempts > 0 && (
              <p className="text-xs text-center" style={{ color: 'var(--alert)' }}>
                ⚠️ {5 - attempts} intentos restantes
              </p>
            )}
            {error && <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              onClick={handlePinSubmit}
              disabled={loading || pin.some(d => !d)}
              className="w-full py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
            {bioAvailable && (
              <button
                onClick={() => setStep('biometric')}
                className="w-full text-sm font-medium text-center"
                style={{ color: 'var(--accent)' }}
              >
                👤 Usar biometría
              </button>
            )}
          </div>
        )}

        {/* PASO: Configurar PIN por primera vez */}
        {step === 'setup_pin' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Creá tu PIN de acceso
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                6 dígitos — usalo cada vez que ingreses
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-2 block"
                     style={{ color: 'var(--muted)' }}>PIN</label>
              <div className="flex gap-2 justify-center">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { pinRefs.current[i] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value, pin, setPin)}
                    onKeyDown={e => handlePinKeyDown(e, i, pin, setPin)}
                    className={`pin-digit ${digit ? 'filled' : ''}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-2 block"
                     style={{ color: 'var(--muted)' }}>Confirmá el PIN</label>
              <div className={`flex gap-2 justify-center ${shakePin ? 'animate-shake' : ''}`}>
                {confirmPin.map((digit, i) => (
                  <input
                    key={i}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value, confirmPin, setConfirmPin)}
                    onKeyDown={e => handlePinKeyDown(e, i, confirmPin, setConfirmPin)}
                    className={`pin-digit ${digit ? 'filled' : ''} ${shakePin ? 'error' : ''}`}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              onClick={handleSetupPin}
              disabled={loading || pin.some(d => !d) || confirmPin.some(d => !d)}
              className="w-full py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {loading ? 'Guardando...' : 'Confirmar PIN'}
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-center" style={{ color: 'var(--muted)' }}>
        ARGon Broker de Seguros · Acceso protegido<br />
        Todos los accesos quedan registrados
      </p>
    </div>
  )
}
