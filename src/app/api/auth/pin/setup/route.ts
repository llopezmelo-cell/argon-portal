import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPin, isValidPin } from '@/lib/auth/pin'
import { logAudit } from '@/lib/auth/audit'

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()
  if (!email || !pin) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN debe tener 6 dígitos' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

  // Guardar rol en user_metadata para que el cliente lo lea sin consultar la tabla
  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { role: user.role },
  })

  // Crear sesión con magic link
  const { data: authData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
  })

  if (linkError) {
    console.error('generateLink error:', linkError)
    return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 })
  }

  await logAudit(supabase, {
    user_id: user.id,
    action: 'auth.pin.setup',
    ip,
    metadata: { first_time: true },
  })

  const props = authData?.properties as Record<string, string> | undefined
  const token_hash = props?.hashed_token
  if (!token_hash) {
    return NextResponse.json({ error: 'No se pudo generar el token de sesión' }, { status: 500 })
  }

  return NextResponse.json({
    token_hash,
    user: { id: user.id, role: user.role },
  })
}
