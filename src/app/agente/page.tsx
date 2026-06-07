'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AgenteHomePage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ clientes: 0, polizas: 0, pagosPendientes: 0, vencenMes: 0 })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: userData } = await supabase.from('users').select('*, companies(name, brand_color)').eq('id', authUser.id).single()
      setUser(userData)

      const companyId = userData?.company_id
      const today = new Date()
      const finMes = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      const [{ data: risks }, { count: pagosCount }] = await Promise.all([
        companyId
          ? supabase.from('risks').select('client_id, expires_at, status').eq('company_id', companyId)
          : supabase.from('risks').select('client_id, expires_at, status'),
        companyId
          ? supabase.from('payments').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'vencido')
          : supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'vencido'),
      ])

      const clientIds = [...new Set((risks || []).map((r: any) => r.client_id))]
      const vencenMes = (risks || []).filter((r: any) => {
        const exp = new Date(r.expires_at)
        return exp >= today && exp <= finMes
      }).length

      setStats({ clientes: clientIds.length, polizas: (risks || []).filter((r: any) => r.status === 'activo').length, pagosPendientes: pagosCount || 0, vencenMes })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>

  return (
    <div className="space-y-5">
      {/* Bienvenida */}
      <div className="card" style={{ background: 'var(--primary)' }}>
        <p className="text-white text-sm opacity-70">Buenos días,</p>
        <p className="text-white text-xl font-bold">{user?.full_name?.split(' ')[0]}</p>
        {user?.companies && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full" style={{ background: user.companies.brand_color || 'var(--accent)' }} />
            <p className="text-white text-sm opacity-80">{user.companies.name}</p>
          </div>
        )}
      </div>

      {/* Alertas */}
      {(stats.pagosPendientes > 0 || stats.vencenMes > 0) && (
        <div className="space-y-2">
          {stats.vencenMes > 0 && (
            <Link href="/agente/reportes?tab=vencimientos"
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(242,169,0,0.1)', border: '1px solid rgba(242,169,0,0.3)' }}>
              <span>⏰</span>
              <p className="text-sm font-medium flex-1" style={{ color: '#a16207' }}>
                {stats.vencenMes} póliza{stats.vencenMes > 1 ? 's' : ''} vence{stats.vencenMes === 1 ? '' : 'n'} este mes
              </p>
              <span className="text-xs font-semibold" style={{ color: '#a16207' }}>Ver →</span>
            </Link>
          )}
          {stats.pagosPendientes > 0 && (
            <Link href="/agente/pagos"
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(214,58,47,0.08)', border: '1px solid rgba(214,58,47,0.2)' }}>
              <span>💳</span>
              <p className="text-sm font-medium flex-1" style={{ color: 'var(--danger)' }}>
                {stats.pagosPendientes} pago{stats.pagosPendientes > 1 ? 's' : ''} vencido{stats.pagosPendientes > 1 ? 's' : ''}
              </p>
              <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>Ver →</span>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Mis clientes', value: stats.clientes, icon: '👥', href: '/agente/clientes' },
          { label: 'Pólizas activas', value: stats.polizas, icon: '📋', href: '/agente/clientes' },
          { label: 'Vencen este mes', value: stats.vencenMes, icon: '⏰', href: '/agente/reportes' },
          { label: 'Pagos vencidos', value: stats.pagosPendientes, icon: '💳', href: '/agente/pagos' },
        ].map(s => (
          <Link key={s.label} href={s.href} className="card flex flex-col gap-2 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xl">{s.icon}</span>
              <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{s.value}</span>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/agente/subir"
              className="py-4 rounded-2xl text-white font-semibold text-sm text-center"
              style={{ background: 'var(--primary)' }}>📤 Subir documento</Link>
        <Link href="/agente/pagos"
              className="py-4 rounded-2xl text-white font-semibold text-sm text-center"
              style={{ background: 'var(--accent)' }}>💳 Ver pagos</Link>
        <Link href="/agente/reportes"
              className="py-4 rounded-2xl text-white font-semibold text-sm text-center"
              style={{ background: 'var(--success)' }}>📈 Reportes</Link>
        <Link href="/agente/clientes"
              className="py-4 rounded-2xl font-semibold text-sm text-center"
              style={{ background: 'var(--surface)', color: 'var(--primary)', border: '2px solid var(--primary)' }}>
          👥 Clientes
        </Link>
      </div>
    </div>
  )
}
