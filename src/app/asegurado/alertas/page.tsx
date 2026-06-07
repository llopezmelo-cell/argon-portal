'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ALERT_ICONS: Record<string, string> = {
  vencimiento: '⏰', pago_pendiente: '💳', pago_vencido: '🔴',
  documento_nuevo: '📄', cumpleanos: '🎂', sistema: '📢',
}

export default function AlertasPage() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('alerts').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(50)
    setAlerts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markRead(id: string) {
    await supabase.from('alerts').update({ read_at: new Date().toISOString() }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read_at: new Date().toISOString() } : a))
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('alerts').update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id).is('read_at', null)
    load()
  }

  const unreadCount = alerts.filter(a => !a.read_at).length

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
          Alertas {unreadCount > 0 && <span className="ml-2 badge badge-danger">{unreadCount}</span>}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            Marcar todas leídas
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🔔</p>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Sin alertas</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Acá aparecerán vencimientos, pagos y novedades</p>
        </div>
      ) : alerts.map(a => (
        <div key={a.id}
             className="card flex items-start gap-3 cursor-pointer"
             style={{ opacity: a.read_at ? 0.6 : 1, borderLeft: a.read_at ? undefined : `3px solid var(--accent)` }}
             onClick={() => !a.read_at && markRead(a.id)}>
          <span className="text-2xl flex-shrink-0">{ALERT_ICONS[a.type] || '📢'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{a.title}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{a.body}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {new Date(a.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {!a.read_at && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--accent)' }} />}
        </div>
      ))}
    </div>
  )
}
