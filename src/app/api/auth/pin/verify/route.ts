import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPin } from '@/lib/auth/pin'
import { rateLimit } from '@/lib/auth/rate-limit'
import { logAudit } from '@/lib/auth/audit'

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const limited = await rateLimit(ip, 'pin-verify', 10, 60)
  if (limited) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un minuto.' }, { status: 429 })
  }

  const { email, pin } = await req.json()
  if (!email || !pin) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: 'PIN inválido' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: user } = await supabase
    .from('users')
    .select('id, pin_hash, failed_attempts, locked_at, status, role')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  if (user.status === 'bloqueado') {
    return NextResponse.json({ error: 'Cuenta bloqueada. Contactá al administrador.', locked: true }, { status: 403 })
  }

  // Verificar PIN
  const pinHash = await hashPin(pin)
  const isCorrect = pinHash === user.pin_hash

  if (!isCorrect) {
    const newAttempts = (user.failed_attempts || 0) + 1
    const shouldLock = newAttempts >= MAX_ATTEMPTS

    await supabase.from('users').update({
      failed_attempts: newAttempts,
      ...(shouldLock ? { status: 'bloqueado', locked_at: new Date().toISOString() } : {}),
    }).eq('id', user.id)

    await logAudit(supabase, {
      user_id: user.id,
      action: 'auth.pin.failed',
      ip,
      metadata: { attempts: newAttempts, locked: shouldLock },
    })

    if (shouldLock) {
      return NextResponse.json({
        error: 'Cuenta bloqueada por demasiados intentos fallidos.',
        locked: true,
        remainingAttempts: 0,
      }, { status: 403 })
    }

    return NextResponse.json({
      error: 'PIN incorrecto.',
      remainingAttempts: MAX_ATTEMPTS - newAttempts,
    }, { status: 401 })
  }

  // PIN correcto — resetear intentos y crear sesión
  await supabase.from('users').update({
    failed_attempts: 0,
    last_login_at: new Date().toISOString(),
  }).eq('id', user.id)

  // Crear sesión Supabase vía magic link
  const { data: authData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
  })

  await logAudit(supabase, {
    user_id: user.id,
    action: 'auth.pin.success',
    ip,
    metadata: { method: 'pin' },
  })

  // Las propiedades del link incluyen los tokens
  const props = authData?.properties as Record<string, string> | undefined

  return NextResponse.json({
    token_hash: props?.['hashed_token'],
    user: { id: user.id, role: user.role },
  })
}
