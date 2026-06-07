import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { logAudit } from '@/lib/auth/audit'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email, full_name, role, company_id, client_id, invited_by } = await req.json()
  if (!email || !full_name || !role) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()

  // Verificar que no existe ya
  const { data: existing } = await supabase.from('users').select('id').eq('email', normalizedEmail).single()
  if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: { full_name, role },
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

  // Enviar email de invitación con Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const loginUrl = `${appUrl}/login`

  await resend.emails.send({
    from: 'ARGon Broker <noreply@argonbroker.com.ar>',
    to: normalizedEmail,
    subject: 'Tu acceso a ARGon Broker',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 64px; height: 64px; background: #003D5C; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="color: white; font-weight: bold; font-size: 18px;">AR<span style="color: #2BA8C4">Gon</span></span>
          </div>
          <h1 style="color: #003D5C; margin: 0;">ARGon Broker</h1>
          <p style="color: #666; margin: 4px 0 0;">Portal de gestión</p>
        </div>

        <p style="color: #333;">Hola <strong>${full_name}</strong>,</p>
        <p style="color: #333;">Te invitamos a acceder al portal de ARGon Broker donde podés ver todas tus pólizas y documentos.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}"
             style="background: #003D5C; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Ingresar al portal
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">O copiá este link: <a href="${loginUrl}" style="color: #2BA8C4;">${loginUrl}</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">ARGon Broker de Seguros · Todos los accesos quedan registrados</p>
      </div>
    `,
  })

  await logAudit(supabase, {
    user_id: invited_by || null,
    action: 'admin.user.invite',
    metadata: { invited_email: normalizedEmail, role },
  })

  return NextResponse.json({ ok: true, email: normalizedEmail })
}
