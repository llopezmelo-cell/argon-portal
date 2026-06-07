import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPin, isValidPin } from '@/lib/auth/pin'
import { logAudit } from '@/lib/auth/audit'

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()
  if (!email || !pin) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN debe tener 6 dígitos' }, { status: 400 })

  const supabase = await createClient()
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  const { data: user } = await supabase
    .from('users').select('id, status, role').eq('email', email.toLowerCase().trim()).single()

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (user.status === 'bloqueado') return NextResponse.json({ error: 'Cuenta bloqueada' }, { status: 403 })

  const pinHash = await hashPin(pin)

  await supabase.from('users').update({
    pin_hash: pinHash,
    status: 'activo',
    failed_attempts: 0,
    last_login_at: new Date().toISOString(),
  }).eq('id', user.id)

  // Crear sesión
  const { data: authData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
  })

  await logAudit(supabase, {
    user_id: user.id,
    action: 'auth.pin.setup',
    ip,
    metadata: { first_time: true },
  })

  const props = authData?.properties as Record<string, string> | undefined
  return NextResponse.json({
    access: props?.['access_token'],
    refresh: props?.['refresh_token'],
    user: { id: user.id, role: user.role },
  })
}
