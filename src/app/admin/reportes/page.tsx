'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReportData {
  company: string
  companyColor: string
  totalPolizas: number
  polizasActivas: number
  facturacionMensual: number
  pagosVencidos: number
  polizasVencenMes: number
}

interface VencimientoItem {
  client_name: string
  display_name: string
  company_name: string
  expires_at: string
  phone: string
  diasRestantes: number
}

interface PagoVencido {
  client_name: string
  display_name: string
  company_name: string
  amount_cents: number
  due_date: string
  phone: string
}

export default function ReportesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'general' | 'vencimientos' | 'pagos' | 'cumpleanos'>('general')
  const [reportes, setReportes] = useState<ReportData[]>([])
  const [vencimientos, setVencimientos] = useState<VencimientoItem[]>([])
  const [pagosVencidos, setPagosVencidos] = useState<PagoVencido[]>([])
  const [loading, setLoading] = useState(true)

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const mesActual = meses[new Date().getMonth()]

  useEffect(() => {
    async function load() {
      const today = new Date()
      const fin_mes = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      // Datos por compañía
      const { data: companies } = await supabase.from('companies').select('id, name, brand_color')
      const reportData: ReportData[] = []

      if (companies) {
        for (const co of companies) {
          const [
            { count: totalPolizas },
            { count: polizasActivas },
            { data: premiums },
            { count: pagosVenc },
            { count: polizasVencenMes },
          ] = await Promise.all([
            supabase.from('risks').select('*', { count: 'exact', head: true }).eq('company_id', co.id),
            supabase.from('risks').select('*', { count: 'exact', head: true }).eq('company_id', co.id).eq('status', 'activo'),
            supabase.from('risks').select('premium_cents').eq('company_id', co.id).eq('status', 'activo'),
            supabase.from('payments').select('*', { count: 'exact', head: true }).eq('company_id', co.id).eq('status', 'vencido'),
            supabase.from('risks').select('*', { count: 'exact', head: true })
              .eq('company_id', co.id)
              .gte('expires_at', today.toISOString().slice(0, 10))
              .lte('expires_at', fin_mes.toISOString().slice(0, 10)),
          ])

          const facturacion = (premiums || []).reduce((sum, r) => sum + (r.premium_cents || 0), 0)
          reportData.push({
            company: co.name,
            companyColor: co.brand_color || 'var(--primary)',
            totalPolizas: totalPolizas || 0,
            polizasActivas: polizasActivas || 0,
            facturacionMensual: facturacion,
            pagosVencidos: pagosVenc || 0,
            polizasVencenMes: polizasVencenMes || 0,
          })
        }
      }

      // Vencimientos próximos (30 días)
      const en30dias = new Date(today)
      en30dias.setDate(en30dias.getDate() + 30)

      const { data: vencData } = await supabase
        .from('risks')
        .select('display_name, expires_at, clients(full_name, phone), companies(name)')
        .gte('expires_at', today.toISOString().slice(0, 10))
        .lte('expires_at', en30dias.toISOString().slice(0, 10))
        .eq('status', 'activo')
        .order('expires_at')

      const vencItems: VencimientoItem[] = (vencData || []).map((r: any) => {
        const expires = new Date(r.expires_at)
        const diff = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          client_name: r.clients?.full_name || '-',
          display_name: r.display_name,
          company_name: r.companies?.name || '-',
          expires_at: r.expires_at,
          phone: r.clients?.phone || '',
          diasRestantes: diff,
        }
      })

      // Pagos vencidos
      const { data: pagosData } = await supabase
        .from('payments')
        .select('amount_cents, due_date, risks(display_name, clients(full_name, phone), companies(name))')
        .eq('status', 'vencido')
        .order('due_date')

      const pagosItems: PagoVencido[] = (pagosData || []).map((p: any) => ({
        client_name: p.risks?.clients?.full_name || '-',
        display_name: p.risks?.display_name || '-',
        company_name: p.risks?.companies?.name || '-',
        amount_cents: p.amount_cents,
        due_date: p.due_date,
        phone: p.risks?.clients?.phone || '',
      }))

      setReportes(reportData)
      setVencimientos(vencItems)
      setPagosVencidos(pagosItems)
      setLoading(false)
    }
    load()
  }, [])

  const formatARS = (cents: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100)

  const tabs = [
    { id: 'general',      label: 'Por compañía' },
    { id: 'vencimientos', label: `Vencimientos (${vencimientos.length})` },
    { id: 'pagos',        label: `Pagos venc. (${pagosVencidos.length})` },
  ]

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Reportes</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
              color: tab === t.id ? 'white' : 'var(--muted)',
              border: `1px solid ${tab === t.id ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Por compañía */}
      {tab === 'general' && (
        <div className="space-y-4">
          {/* Totales globales */}
          <div className="card" style={{ background: 'var(--primary)' }}>
            <p className="text-white text-sm font-medium opacity-80">Facturación total mensual</p>
            <p className="text-white text-3xl font-black mt-1">
              {formatARS(reportes.reduce((s, r) => s + r.facturacionMensual, 0))}
            </p>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-white text-lg font-bold">{reportes.reduce((s, r) => s + r.polizasActivas, 0)}</p>
                <p className="text-white text-xs opacity-70">Pólizas activas</p>
              </div>
              <div>
                <p className="text-white text-lg font-bold">{reportes.reduce((s, r) => s + r.pagosVencidos, 0)}</p>
                <p className="text-white text-xs opacity-70">Pagos vencidos</p>
              </div>
            </div>
          </div>

          {reportes.map(r => (
            <div key={r.company} className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-10 rounded-full" style={{ background: r.companyColor }} />
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>{r.company}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total pólizas',    value: r.totalPolizas,                      suffix: '' },
                  { label: 'Activas',          value: r.polizasActivas,                    suffix: '' },
                  { label: 'Facturación/mes',  value: formatARS(r.facturacionMensual),     suffix: '' },
                  { label: 'Vencen este mes',  value: r.polizasVencenMes,                  suffix: '', alert: r.polizasVencenMes > 0 },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: s.alert ? 'var(--alert)' : 'var(--text)' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vencimientos */}
      {tab === 'vencimientos' && (
        <div className="space-y-3">
          {vencimientos.length === 0 ? (
            <div className="card text-center py-10">
              <p style={{ color: 'var(--muted)' }}>✅ No hay vencimientos en los próximos 30 días</p>
            </div>
          ) : vencimientos.map((v, i) => (
            <div key={i} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{v.client_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{v.display_name} · {v.company_name}</p>
                  <p className="text-xs mt-1" style={{ color: v.diasRestantes <= 7 ? 'var(--danger)' : 'var(--alert)' }}>
                    ⏰ Vence {new Date(v.expires_at).toLocaleDateString('es-AR')} · {v.diasRestantes} día{v.diasRestantes !== 1 ? 's' : ''}
                  </p>
                </div>
                {v.phone && (
                  <a href={`https://wa.me/${v.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${v.client_name.split(' ')[0]}, te contactamos desde ARGon Broker. Tu póliza de ${v.display_name} vence el ${new Date(v.expires_at).toLocaleDateString('es-AR')}. ¿Querés renovarla?`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: '#25D366' }}>
                    <span className="text-white text-sm">💬</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagos vencidos */}
      {tab === 'pagos' && (
        <div className="space-y-3">
          {pagosVencidos.length === 0 ? (
            <div className="card text-center py-10">
              <p style={{ color: 'var(--muted)' }}>✅ No hay pagos vencidos</p>
            </div>
          ) : pagosVencidos.map((p, i) => (
            <div key={i} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{p.client_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{p.display_name} · {p.company_name}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--danger)' }}>{formatARS(p.amount_cents)}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Vencido el {new Date(p.due_date).toLocaleDateString('es-AR')}
                  </p>
                </div>
                {p.phone && (
                  <a href={`https://wa.me/${p.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${p.client_name.split(' ')[0]}, te contactamos desde ARGon Broker. Tenés un pago pendiente de ${formatARS(p.amount_cents)} correspondiente a ${p.display_name}. ¿Podemos coordinar el pago?`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: '#25D366' }}>
                    <span className="text-white text-sm">💬</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
