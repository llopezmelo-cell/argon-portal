'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types'

type FilterType = 'todos' | 'bloqueados' | 'pendientes'

export default function UsuariosPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FilterType>(
    (searchParams.get('filtro') as FilterType) || 'todos'
  )
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function loadUsuarios() {
    let query = supabase.from('users').select('*').order('created_at', { ascending: false })
    if (filtro === 'bloqueados') query = query.eq('status', 'bloqueado')
    if (filtro === 'pendientes') query = query.eq('status', 'pendiente')
    const { data } = await query
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { loadUsuarios() }, [filtro])

  async function handleAction(userId: string, action: string) {
    setActionLoading(userId + action)
    const res = await fetch('/api/auth/admin/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: userId, action }),
    })
    if (res.ok) {
      setMsg(`✅ Acción completada`)
      await loadUsuarios()
    } else {
      setMsg('❌ Error al procesar')
    }
    setActionLoading(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function invitarUsuario() {
    window.location.href = '/admin/usuarios/invitar'
  }

  const roleColors: Record<string, string> = {
    admin: '#003D5C', coordinador: '#2BA8C4', agente: '#1F9F5C', asegurado: '#64748B'
  }
  const statusColors: Record<string, string> = {
    activo: 'badge-success', bloqueado: 'badge-danger', pendiente: 'badge-alert', suspendido: 'badge-muted'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Usuarios del sistema</h1>
        <button
          onClick={invitarUsuario}
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'var(--primary)' }}
        >
          + Invitar
        </button>
      </div>

      {msg && (
        <div className="p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(31,159,92,0.1)', color: 'var(--success)' }}>
          {msg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {(['todos', 'bloqueados', 'pendientes'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all"
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
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : usuarios.length === 0 ? (
        <div className="card text-center py-10">
          <p style={{ color: 'var(--muted)' }}>No hay usuarios en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map(u => (
            <div key={u.id} className="card">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                     style={{ background: roleColors[u.role] || 'var(--muted)' }}>
                  {u.full_name?.charAt(0) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{u.full_name}</p>
                    <span className={`badge ${statusColors[u.status] || 'badge-muted'}`}>{u.status}</span>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{u.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium capitalize" style={{ color: roleColors[u.role] }}>{u.role}</span>
                    {u.failed_attempts > 0 && (
                      <span className="text-xs" style={{ color: 'var(--alert)' }}>
                        ⚠️ {u.failed_attempts} intentos fallidos
                      </span>
                    )}
                    {u.last_login_at && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Último acceso: {new Date(u.last_login_at).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones de admin */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {u.status === 'bloqueado' && (
                  <button
                    onClick={() => handleAction(u.id, 'unlock')}
                    disabled={actionLoading === u.id + 'unlock'}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--success)' }}
                  >
                    🔓 Desbloquear
                  </button>
                )}
                {u.status === 'bloqueado' && (
                  <button
                    onClick={() => handleAction(u.id, 'reset_pin')}
                    disabled={actionLoading === u.id + 'reset_pin'}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                  >
                    🔄 Reset PIN
                  </button>
                )}
                {u.status === 'activo' && (
                  <button
                    onClick={() => handleAction(u.id, 'suspend')}
                    disabled={actionLoading === u.id + 'suspend'}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--bg)', color: 'var(--danger)', border: '1px solid var(--border)' }}
                  >
                    ⏸ Suspender
                  </button>
                )}
                {(u.status === 'suspendido' || u.status === 'pendiente') && (
                  <button
                    onClick={() => handleAction(u.id, 'activate')}
                    disabled={actionLoading === u.id + 'activate'}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--success)' }}
                  >
                    ✅ Activar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
