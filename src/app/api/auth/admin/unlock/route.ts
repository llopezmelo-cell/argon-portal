import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verificar que quien llama es admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: adminUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminUser || adminUser.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { target_user_id, action } = await req.json()
  // action: 'unlock' | 'reset_pin' | 'suspend' | 'activate'

  if (!target_user_id || !action) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  switch (action) {
    case 'unlock':
      updates.status = 'activo'
      updates.failed_attempts = 0
      updates.locked_at = null
      break
    case 'reset_pin':
      updates.pin_hash = null
      updates.status = 'activo'
      updates.failed_attempts = 0
      updates.locked_at = null
      break
    case 'suspend':
      updates.status = 'suspendido'
      break
    case 'activate':
      updates.status = 'activo'
      updates.failed_attempts = 0
      break
    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', target_user_id)

  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })

  await logAudit(supabase, {
    user_id: user.id,
    action: `admin.user.${action}`,
    metadata: { target_user_id },
  })

  return NextResponse.json({ ok: true })
}
