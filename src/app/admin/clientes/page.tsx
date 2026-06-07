'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ClienteRow {
  id: string
  full_name: string
  dni: string
  birth_date: string
  phone: string
  email: string
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, dni, birth_date, phone, email')
        .order('full_name')
      setClientes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtrados = clientes.filter(c =>
    c.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.dni?.includes(busqueda) ||
    c.phone?.includes(busqueda)
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Clientes ({clientes.length})</h1>
        <Link href="/admin/clientes/nuevo"
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'var(--primary)' }}>
          + Nuevo
        </Link>
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, DNI o teléfono..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
      />

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-10">
          <p style={{ color: 'var(--muted)' }}>{busqueda ? 'Sin resultados' : 'No hay clientes aún'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => (
            <Link key={c.id} href={`/admin/clientes/${c.id}`} className="card flex items-center gap-3 hover:shadow-lg transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                   style={{ background: 'var(--primary)' }}>
                {c.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{c.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  DNI {c.dni} {c.phone && `· ${c.phone}`}
                </p>
              </div>
              {c.birth_date && (() => {
                const hoy = new Date()
                const b = new Date(c.birth_date)
                const esCumple = b.getMonth() === hoy.getMonth() && b.getDate() === hoy.getDate()
                return esCumple ? <span title="¡Cumpleaños hoy!">🎂</span> : null
              })()}
              <span style={{ color: 'var(--muted)' }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
