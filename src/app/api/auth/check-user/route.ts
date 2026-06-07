import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/auth/rate-limit'

export async function POST(req: NextRequest) {
  // Rate limiting: 10 intentos por IP por minuto
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const limited = await rateLimit(ip, 'check-user', 10, 60)
  if (limited) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un minuto.' }, { status: 429 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const supabase = await createClient()

  // Buscar usuario en nuestra tabla
  const { data: user, error } = await supabase
    .from('users')
    .select('id, status, pin_hash, role')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) {
    // No revelar si el usuario existe o no (seguridad)
    return NextResponse.json({ error: 'Email no registrado en el sistema.' }, { status: 404 })
  }

  if (user.status === 'bloqueado') {
    return NextResponse.json({ error: 'Cuenta bloqueada. Contactá al administrador.' }, { status: 403 })
  }

  if (user.status === 'suspendido') {
    return NextResponse.json({ error: 'Cuenta suspendida.' }, { status: 403 })
  }

  // Verificar si tiene biometría registrada
  const { data: bioCreds } = await supabase
    .from('biometric_credentials')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  return NextResponse.json({
    hasPin: !!user.pin_hash,
    hasBio: !!(bioCreds && bioCreds.length > 0),
    status: user.status,
  })
}
