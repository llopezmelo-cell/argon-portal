'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Stats {
  totalClientes: number
  totalRiesgos: number
  polizasVencenMes: number
  pagosVencidos: number
  usuariosBloqueados: number
  documentosMes: number
}

interface BirthdayClient {
  id: string
  full_name: string
  birth_date: string
  phone: string
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [cumples, setCumples] = useState<BirthdayClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date()
      const mes = today.getMonth() + 1

      const [
        { count: totalClientes },
        { count: totalRiesgos },
        { count: polizasVencenMes },
        { count: pagosVencidos },
        { count: usuariosBloqueados },
        { count: documentosMes },
        { data: cumpleData },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('risks').select('*', { count: 'exact', head: true }).eq('status', 'activo'),
        supabase.from('risks').select('*', { count: 'exact', head: true })
          .gte('expires_at', today.toISOString().slice(0, 10))
          .lte('expires_at', new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'vencido'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'bloqueado'),
        supabase.from('documents').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString()),
        supabase.from('clients')
          .select('id, full_name, birth_date, phone')
          .not('birth_date', 'is', null)
          .order('birth_date'),
      ])

      // Filtrar cumpleaños del mes actual
      const cumplesMes = (cumpleData || []).filter(c => {
        if (!c.birth_date) return false
        return new Date(c.birth_date).getMonth() + 1 === mes
      }).sort((a, b) => {
        const dA = new Date(a.birth_date).getDate()
        const dB = new Date(b.birth_date).getDate()
        return dA - dB
      })

      setStats({
        totalClientes: totalClientes || 0,
        totalRiesgos: totalRiesgos || 0,
        polizasVencenMes: polizasVencenMes || 0,
        pagosVencidos: pagosVencidos || 0,
        usuariosBloqueados: usuariosBloqueados || 0,
        documentosMes: documentosMes || 0,
      })
      setCumples(cumplesMes)
      setLoading(false)
    }
    load()
  }, [])

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const mesActual = meses[new Date().getMonth()]

  if (loading) return <div className="space-y-4 animate-pulse">
    {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--border)' }} />)}
  </div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Panel de administración</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Alertas urgentes */}
      {(stats!.pagosVencidos > 0 || stats!.usuariosBloqueados > 0 || stats!.polizasVencenMes > 0) && (
        <div className="space-y-2">
          {stats!.polizasVencenMes > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: 'rgba(242,169,0,0.1)', border: '1px solid rgba(242,169,0,0.3)' }}>
              <span>⚠️</span>
              <p className="text-sm font-medium" style={{ color: '#a16207' }}>
                {stats!.polizasVencenMes} póliza{stats!.polizasVencenMes > 1 ? 's' : ''} vence{stats!.polizasVencenMes === 1 ? '' : 'n'} este mes
              </p>
              <Link href="/admin/reportes?filtro=vencimientos" className="ml-auto text-xs font-semibold" style={{ color: '#a16207' }}>Ver →</Link>
            </div>
          )}
          {stats!.pagosVencidos > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: 'rgba(214,58,47,0.08)', border: '1px solid rgba(214,58,47,0.2)' }}>
              <span>🔴</span>
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                {stats!.pagosVencidos} pago{stats!.pagosVencidos > 1 ? 's' : ''} vencido{stats!.pagosVencidos > 1 ? 's' : ''}
              </p>
              <Link href="/admin/reportes?filtro=pagos" className="ml-auto text-xs font-semibold" style={{ color: 'var(--danger)' }}>Ver →</Link>
            </div>
          )}
          {stats!.usuariosBloqueados > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: 'rgba(214,58,47,0.08)', border: '1px solid rgba(214,58,47,0.2)' }}>
              <span>🔒</span>
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                {stats!.usuariosBloqueados} usuario{stats!.usuariosBloqueados > 1 ? 's' : ''} bloqueado{stats!.usuariosBloqueados > 1 ? 's' : ''}
              </p>
              <Link href="/admin/usuarios?filtro=bloqueados" className="ml-auto text-xs font-semibold" style={{ color: 'var(--danger)' }}>Desbloquear →</Link>
            </div>
          )}
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Clientes totales',   value: stats!.totalClientes,   icon: '👥', href: '/admin/clientes',  color: 'var(--primary)' },
          { label: 'Pólizas activas',    value: stats!.totalRiesgos,    icon: '📋', href: '/admin/clientes',  color: 'var(--success)' },
          { label: 'Docs este mes',      value: stats!.documentosMes,   icon: '📄', href: '/admin/clientes',  color: 'var(--accent)' },
          { label: 'Vencen este mes',    value: stats!.polizasVencenMes,icon: '⏰', href: '/admin/reportes',  color: 'var(--alert)' },
          { label: 'Pagos vencidos',     value: stats!.pagosVencidos,   icon: '💸', href: '/admin/reportes',  color: 'var(--danger)' },
          { label: 'Cumples este mes',   value: cumples.length,         icon: '🎂', href: '#cumples',         color: 'var(--accent)' },
        ].map(stat => (
          <Link key={stat.label} href={stat.href}
                className="card flex flex-col gap-2 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Nuevo cliente',    href: '/admin/clientes/nuevo',  icon: '➕', bg: 'var(--primary)' },
            { label: 'Nuevo agente',     href: '/admin/agentes/nuevo',   icon: '🏢', bg: 'var(--accent)' },
            { label: 'Invitar usuario',  href: '/admin/usuarios/invitar',icon: '✉️', bg: 'var(--success)' },
            { label: 'Ver reportes',     href: '/admin/reportes',        icon: '📈', bg: 'var(--alert)' },
          ].map(a => (
            <Link key={a.label} href={a.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl text-white font-semibold text-sm transition-transform active:scale-95"
                  style={{ background: a.bg }}>
              <span className="text-2xl">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Cumpleaños del mes */}
      <div id="cumples">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            🎂 Cumpleaños de {mesActual}
          </h2>
          <span className="badge badge-accent">{cumples.length}</span>
        </div>
        {cumples.length === 0 ? (
          <div className="card text-center py-8">
            <p style={{ color: 'var(--muted)' }}>No hay cumpleaños este mes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cumples.map(c => {
              const fecha = new Date(c.birth_date)
              const hoy = new Date()
              const esHoy = fecha.getDate() === hoy.getDate()
              const edad = hoy.getFullYear() - fecha.getFullYear()
              return (
                <div key={c.id} className="card flex items-center gap-3"
                     style={esHoy ? { border: '2px solid var(--accent)' } : {}}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                       style={{ background: esHoy ? 'var(--accent)' : 'var(--primary)' }}>
                    {fecha.getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {c.full_name} {esHoy && '🎉'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {edad} años · {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  {c.phone && (
                    <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`¡Feliz cumpleaños ${c.full_name.split(' ')[0]}! 🎉 Desde ARGon Broker te deseamos un excelente día.`)}`}
                       target="_blank" rel="noopener noreferrer"
                       className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                       style={{ background: '#25D366' }}>
                      <span className="text-white text-base">💬</span>
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
