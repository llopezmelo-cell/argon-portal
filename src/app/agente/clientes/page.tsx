'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AgenteClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()

      let clientIds: string[] = []
      if (userData?.role === 'agente' && userData.company_id) {
        const { data: riskRows } = await supabase
          .from('risks').select('client_id').eq('company_id', userData.company_id)
        clientIds = [...new Set((riskRows || []).map((r: any) => r.client_id))]
      }

      let query = supabase.from('clients').select('id, full_name, dni, phone, email, birth_date').order('full_name')
      if (userData?.role === 'agente' && clientIds.length > 0) query = query.in('id', clientIds)
      else if (userData?.role === 'agente' && clientIds.length === 0) { setClientes([]); setLoading(false); return }

      const { data } = await query
      setClientes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtrados = clientes.filter(c =>
    c.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.dni?.includes(busqueda) || c.phone?.includes(busqueda)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Mis clientes ({clientes.length})</h1>
      </div>
      <input type="search" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
             className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
             style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>
      ) : filtrados.map(c => (
        <Link key={c.id} href={`/agente/clientes/${c.id}`} className="card flex items-center gap-3 hover:shadow-lg transition-shadow">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
               style={{ background: 'var(--primary)' }}>{c.full_name?.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{c.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>DNI {c.dni} {c.phone && `· ${c.phone}`}</p>
          </div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </Link>
      ))}
    </div>
  )
}
