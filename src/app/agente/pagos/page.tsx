'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PagoItem {
  id: string
  client_name: string
  client_phone: string
  display_name: string
  company_name: string
  amount_cents: number
  currency: string
  due_date: string
  paid_at: string | null
  status: 'pendiente' | 'pagado' | 'vencido'
  period: string
}

type Filtro = 'todos' | 'pendiente' | 'vencido' | 'pagado'

export default function PagosPage() {
  const supabase = createClient()
  const [pagos, setPagos] = useState<PagoItem[]>([])
  const [filtro, setFiltro] = useState<Filtro>('pendiente')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function loadPagos() {
    const { data: authUser } = await supabase.auth.getUser()
    if (!authUser.user) return

    const { data: userData } = await supabase.from('users').select('company_id, role').eq('id', authUser.user.id).single()

    let query = supabase
      .from('payments')
      .select(`
        id, amount_cents, currency, due_date, paid_at, status, period,
        risks(display_name, clients(full_name, phone), companies(name))
      `)
      .order('due_date')

    if (filtro !== 'todos') query = query.eq('status', filtro)
    if (userData?.role === 'agente' && userData.company_id) {
      query = query.eq('company_id', userData.company_id)
    }

    const { data } = await query
    const formatted: PagoItem[] = (data || []).map((p: any) => ({
      id: p.id,
      client_name: p.risks?.clients?.full_name || '-',
      client_phone: p.risks?.clients?.phone || '',
      display_name: p.risks?.display_name || '-',
      company_name: p.risks?.companies?.name || '-',
      amount_cents: p.amount_cents,
      currency: p.currency,
      due_date: p.due_date,
      paid_at: p.paid_at,
      status: p.status,
      period: p.period,
    }))

    setPagos(formatted)
    setLoading(false)
  }

  useEffect(() => { loadPagos() }, [filtro])

  async function marcarPagado(pagoId: string, clientPhone: string, clientName: string, amount: number) {
    setUpdating(pagoId)
    await supabase.from('payments').update({
      status: 'pagado',
      paid_at: new Date().toISOString(),
    }).eq('id', pagoId)
    await loadPagos()
    setUpdating(null)
  }

  async function enviarAlerta(pagoId: string, clientName: string, clientPhone: string, amount: number, displayName: string) {
    // Crear alerta en app
    const { data: authUser } = await supabase.auth.getUser()
    const { data: clientUser } = await supabase.from('users').select('id').eq('client_id',
      (await supabase.from('payments').select('client_id').eq('id', pagoId).single()).data?.client_id
    ).single()

    if (clientUser) {
      await supabase.from('alerts').insert({
        user_id: clientUser.id,
        type: 'pago_pendiente',
        title: '💳 Pago pendiente',
        body: `Tu cuota de ${displayName} de ${formatARS(amount)} vence próximamente.`,
      })
    }

    // Abrir WhatsApp
    if (clientPhone) {
      window.open(`https://wa.me/${clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(
        `Hola ${clientName.split(' ')[0]}, te recordamos que tenés un pago pendiente de ${formatARS(amount)} correspondiente a ${displayName}. Por favor coordiná el pago con tu agente ARGon Broker. ¡Gracias!`
      )}`, '_blank')
    }
  }

  const formatARS = (cents: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100)

  const statusColors: Record<string, string> = {
    pendiente: 'badge-alert',
    vencido: 'badge-danger',
    pagado: 'badge-success',
  }

  const totalPendiente = pagos.filter(p => p.status !== 'pagado').reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Seguimiento de pagos</h1>
      </div>

      {/* Resumen */}
      {filtro !== 'pagado' && totalPendiente > 0 && (
        <div className="card" style={{ background: 'var(--primary)' }}>
          <p className="text-white text-xs opacity-70">Total pendiente</p>
          <p className="text-white text-2xl font-black">{formatARS(totalPendiente)}</p>
          <p className="text-white text-xs opacity-70 mt-1">{pagos.filter(p => p.status !== 'pagado').length} pagos</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto">
        {(['pendiente', 'vencido', 'pagado', 'todos'] as Filtro[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="px-3 py-1.5 rounded-full text-sm font-medium capitalize flex-shrink-0 transition-all"
            style={{
              background: filtro === f ? 'var(--primary)' : 'var(--surface)',
              color: filtro === f ? 'white' : 'var(--muted)',
              border: `1px solid ${filtro === f ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>
      ) : pagos.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">✅</p>
          <p style={{ color: 'var(--muted)' }}>No hay pagos en esta categoría</p>
        </div>
      ) : pagos.map(p => (
        <div key={p.id} className="card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{p.client_name}</p>
                <span className={`badge ${statusColors[p.status]}`}>{p.status}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{p.display_name} · {p.company_name}</p>
              <p className="text-lg font-black mt-1" style={{ color: p.status === 'vencido' ? 'var(--danger)' : 'var(--text)' }}>
                {formatARS(p.amount_cents)}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {p.status === 'pagado'
                  ? `Pagado el ${new Date(p.paid_at!).toLocaleDateString('es-AR')}`
                  : `Vence: ${new Date(p.due_date).toLocaleDateString('es-AR')}`
                }
              </p>
            </div>
          </div>

          {p.status !== 'pagado' && (
            <div className="flex gap-2">
              <button
                onClick={() => marcarPagado(p.id, p.client_phone, p.client_name, p.amount_cents)}
                disabled={updating === p.id}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--success)' }}
              >
                {updating === p.id ? '...' : '✅ Marcar pagado'}
              </button>
              <button
                onClick={() => enviarAlerta(p.id, p.client_name, p.client_phone, p.amount_cents, p.display_name)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#25D366', color: 'white' }}
              >
                💬
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
