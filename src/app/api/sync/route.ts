import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Sync diaria: actualiza estados de pagos y pólizas, genera alertas de vencimientos
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const en7dias = new Date(); en7dias.setDate(en7dias.getDate() + 7)
  const en30dias = new Date(); en30dias.setDate(en30dias.getDate() + 30)

  // 1. Marcar pagos vencidos
  await supabase.from('payments')
    .update({ status: 'vencido' })
    .eq('status', 'pendiente')
    .lt('due_date', today)

  // 2. Marcar pólizas vencidas
  await supabase.from('risks')
    .update({ status: 'vencido' })
    .eq('status', 'activo')
    .lt('expires_at', today)

  // 3. Alertas de vencimiento próximo (30 días)
  const { data: polizasProximas } = await supabase
    .from('risks')
    .select('id, display_name, expires_at, client_id, clients(email)')
    .eq('status', 'activo')
    .gte('expires_at', today)
    .lte('expires_at', en30dias.toISOString().slice(0, 10))

  for (const poliza of polizasProximas || []) {
    const { data: clientUser } = await supabase
      .from('users').select('id').eq('client_id', poliza.client_id).single()

    if (clientUser) {
      const dias = Math.ceil((new Date(poliza.expires_at).getTime() - Date.now()) / 86400000)
      // Solo si no existe ya una alerta de este tipo hoy
      const { data: existing } = await supabase
        .from('alerts').select('id').eq('user_id', clientUser.id)
        .eq('type', 'vencimiento').eq('ref_id', poliza.id)
        .gte('created_at', new Date().toISOString().slice(0, 10))

      if (!existing || existing.length === 0) {
        await supabase.from('alerts').insert({
          user_id: clientUser.id,
          type: 'vencimiento',
          title: `⏰ Póliza próxima a vencer`,
          body: `Tu ${poliza.display_name} vence en ${dias} día${dias !== 1 ? 's' : ''}.`,
          ref_id: poliza.id,
        })
      }
    }
  }

  // 4. Alertas de pagos vencidos para asegurados
  const { data: pagosVencidos } = await supabase
    .from('payments').select('id, client_id, amount_cents, risks(display_name)')
    .eq('status', 'vencido')
    .gte('updated_at', new Date(Date.now() - 86400000).toISOString()) // Solo los marcados hoy

  for (const pago of pagosVencidos || []) {
    const { data: clientUser } = await supabase
      .from('users').select('id').eq('client_id', pago.client_id).single()

    if (clientUser) {
      await supabase.from('alerts').insert({
        user_id: clientUser.id,
        type: 'pago_vencido',
        title: '🔴 Pago vencido',
        body: `Tu cuota de ${(pago as any).risks?.display_name} está vencida.`,
        ref_id: pago.id,
      })
    }
  }

  return NextResponse.json({ ok: true, synced_at: new Date().toISOString() })
}
