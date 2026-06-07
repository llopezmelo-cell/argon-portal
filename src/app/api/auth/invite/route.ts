import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verificar que quien invita es admin o coordinador
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!caller || !['admin', 'coordinador'].includes(caller.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { email, full_name, role, company_id, client_id } = await req.json()
  if (!email || !full_name || !role) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()

  // Verificar que no existe ya
  const { data: existing } = await supabase.from('users').select('id').eq('email', normalizedEmail).single()
  if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })

  // Crear usuario en Supabase Auth + enviar email de invitación
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Crear registro en nuestra tabla users
  const { error: dbError } = await supabase.from('users').insert({
    id: authData.user.id,
    email: normalizedEmail,
    full_name: full_name.trim(),
    role,
    status: 'pendiente',
    company_id: company_id || null,
    client_id: client_id || null,
  })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  await logAudit(supabase, {
    user_id: user.id,
    action: 'admin.user.invite',
    metadata: { invited_email: normalizedEmail, role },
  })

  return NextResponse.json({ ok: true, email: normalizedEmail })
}
