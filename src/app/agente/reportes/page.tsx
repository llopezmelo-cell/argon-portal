'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AgenteReportesPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<any>(null)
  const [cumples, setCumples] = useState<any[]>([])
  const [vencimientos, setVencimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'general' | 'vencimientos' | 'cumpleanos'>('general')

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const mesActual = meses[new Date().getMonth()]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
      const companyId = userData?.company_id

      const today = new Date()
      const fin_mes = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const en30 = new Date(today); en30.setDate(en30.getDate() + 30)
      const mes = today.getMonth() + 1

      let rQuery = supabase.from('risks').select('id, client_id, premium_cents, expires_at, status')
      let pQuery = supabase.from('payments').select('id, status, amount_cents')
      let cQuery = supabase.from('risks').select('display_name, expires_at, clients(full_name, phone), companies(name)')
        .gte('expires_at', today.toISOString().slice(0,10))
        .lte('expires_at', en30.toISOString().slice(0,10))
        .eq('status', 'activo')

      if (companyId && userData?.role === 'agente') {
        rQuery = rQuery.eq('company_id', companyId)
        pQuery = pQuery.eq('company_id', companyId)
        cQuery = cQuery.eq('company_id', companyId)
      }

      const [{ data: risks }, { data: payments }, { data: venc }] = await Promise.all([rQuery, pQuery, cQuery])

      // Cumpleaños del mes (clientes de las pólizas de esta compañía)
      const clientIds = [...new Set((risks || []).map((r: any) => r.client_id))]
      const { data: clientsData } = clientIds.length > 0
        ? await supabase.from('clients').select('full_name, birth_date, phone').in('id', clientIds).not('birth_date', 'is', null)
        : { data: [] }

      const cumplesMes = (clientsData || [])
        .filter((c: any) => new Date(c.birth_date).getMonth() + 1 === mes)
        .sort((a: any, b: any) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate())

      const totalPolizas = risks?.length || 0
      const activas = risks?.filter((r: any) => r.status === 'activo').length || 0
      const facturacion = risks?.filter((r: any) => r.status === 'activo').reduce((s: number, r: any) => s + (r.premium_cents || 0), 0) || 0
      const vencenMes = risks?.filter((r: any) => {
        const exp = new Date(r.expires_at)
        return exp >= today && exp <= fin_mes
      }).length || 0
      const pagosVencidos = payments?.filter((p: any) => p.status === 'vencido').length || 0
      const cobrado = payments?.filter((p: any) => p.status === 'pagado').reduce((s: number, p: any) => s + (p.amount_cents || 0), 0) || 0

      setStats({ totalPolizas, activas, facturacion, vencenMes, pagosVencidos, cobrado })
      setCumples(cumplesMes)
      setVencimientos((venc || []).map((r: any) => ({
        client_name: r.clients?.full_name, display_name: r.display_name,
        company_name: r.companies?.name, expires_at: r.expires_at, phone: r.clients?.phone,
        dias: Math.ceil((new Date(r.expires_at).getTime() - today.getTime()) / 86400000),
      })))
      setLoading(false)
    }
    load()
  }, [])

  const formatARS = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(c / 100)

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Mis reportes</h1>

      <div className="flex gap-2">
        {[['general','📊 General'],['vencimientos',`⏰ Vencimientos (${vencimientos.length})`],['cumpleanos',`🎂 Cumpleaños (${cumples.length})`]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap transition-all"
                  style={{
                    background: tab === id ? 'var(--primary)' : 'var(--surface)',
                    color: tab === id ? 'white' : 'var(--muted)',
                    border: `1px solid ${tab === id ? 'var(--primary)' : 'var(--border)'}`,
                  }}>{lbl}</button>
        ))}
      </div>

      {tab === 'general' && stats && (
        <div className="space-y-4">
          <div className="card" style={{ background: 'var(--primary)' }}>
            <p className="text-white text-xs opacity-70">Facturación mensual total</p>
            <p className="text-white text-3xl font-black">{formatARS(stats.facturacion)}</p>
            <div className="flex gap-4 mt-2">
              <div><p className="text-white font-bold">{stats.activas}</p><p className="text-white text-xs opacity-70">Activas</p></div>
              <div><p className="text-white font-bold">{formatARS(stats.cobrado)}</p><p className="text-white text-xs opacity-70">Cobrado este mes</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total pólizas', value: stats.totalPolizas, color: 'var(--text)' },
              { label: 'Vencen este mes', value: stats.vencenMes, color: stats.vencenMes > 0 ? 'var(--alert)' : 'var(--text)' },
              { label: 'Pagos vencidos', value: stats.pagosVencidos, color: stats.pagosVencidos > 0 ? 'var(--danger)' : 'var(--text)' },
              { label: 'Cumpleaños del mes', value: cumples.length, color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} className="card">
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'vencimientos' && (
        <div className="space-y-2">
          {vencimientos.length === 0 ? (
            <div className="card text-center py-8"><p style={{ color: 'var(--muted)' }}>✅ Sin vencimientos próximos</p></div>
          ) : vencimientos.map((v, i) => (
            <div key={i} className="card flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{v.client_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{v.display_name} · {v.company_name}</p>
                <p className="text-xs mt-1" style={{ color: v.dias <= 7 ? 'var(--danger)' : 'var(--alert)' }}>
                  ⏰ {new Date(v.expires_at).toLocaleDateString('es-AR')} · {v.dias} días
                </p>
              </div>
              {v.phone && (
                <a href={`https://wa.me/${v.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${v.client_name?.split(' ')[0]}, tu póliza de ${v.display_name} vence el ${new Date(v.expires_at).toLocaleDateString('es-AR')}. ¿La renovamos?`)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: '#25D366' }}>
                  <span className="text-white text-sm">💬</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'cumpleanos' && (
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Cumpleaños de {mesActual}</p>
          {cumples.length === 0 ? (
            <div className="card text-center py-8"><p style={{ color: 'var(--muted)' }}>Sin cumpleaños este mes</p></div>
          ) : cumples.map((c: any, i) => {
            const fecha = new Date(c.birth_date)
            const hoy = new Date()
            const esHoy = fecha.getDate() === hoy.getDate()
            const edad = hoy.getFullYear() - fecha.getFullYear()
            return (
              <div key={i} className="card flex items-center gap-3"
                   style={esHoy ? { border: '2px solid var(--accent)' } : {}}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                     style={{ background: esHoy ? 'var(--accent)' : 'var(--primary)' }}>
                  {fecha.getDate()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{c.full_name} {esHoy && '🎉'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{edad} años · {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</p>
                </div>
                {c.phone && (
                  <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`¡Feliz cumpleaños ${c.full_name.split(' ')[0]}! 🎉 Te deseamos un excelente día. — ARGon Broker`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: '#25D366' }}>
                    <span className="text-white text-sm">💬</span>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
