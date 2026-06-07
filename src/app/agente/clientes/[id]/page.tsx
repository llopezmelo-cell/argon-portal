'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AgenteClienteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [cliente, setCliente] = useState<any>(null)
  const [riesgos, setRiesgos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('risks').select('*, companies(name, brand_color), documents(id, type, display_name, period, file_url)').eq('client_id', id).order('display_name'),
      ])
      setCliente(c); setRiesgos(r || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>
  if (!cliente) return <div className="card text-center py-10"><p style={{ color: 'var(--muted)' }}>No encontrado</p></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} style={{ color: 'var(--muted)' }}>←</button>
        <h1 className="text-xl font-bold flex-1" style={{ color: 'var(--primary)' }}>{cliente.full_name}</h1>
      </div>

      <div className="card grid grid-cols-2 gap-3">
        {[['DNI', cliente.dni], ['Teléfono', cliente.phone], ['Email', cliente.email]].map(([l, v]) => (
          <div key={l} className={l === 'Email' ? 'col-span-2' : ''}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{l}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{v || '-'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/agente/subir?cliente=${id}`}
              className="py-3 rounded-xl text-sm font-semibold text-white text-center"
              style={{ background: 'var(--primary)' }}>📤 Subir doc</Link>
        {cliente.phone && (
          <a href={`https://wa.me/${cliente.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${cliente.full_name.split(' ')[0]}, te contactamos desde ARGon Broker.`)}`}
             target="_blank" rel="noopener noreferrer"
             className="py-3 rounded-xl text-sm font-semibold text-white text-center"
             style={{ background: '#25D366' }}>💬 WhatsApp</a>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Pólizas ({riesgos.length})</h2>
        {riesgos.map((r: any) => (
          <div key={r.id} className="card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                   style={{ background: r.companies?.brand_color || 'var(--primary)' }}>🛡️</div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.display_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.companies?.name} · {r.policy_number}</p>
              </div>
            </div>
            {r.documents?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                {r.documents.slice(0, 3).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <p className="text-xs truncate flex-1" style={{ color: 'var(--muted)' }}>📄 {d.display_name}</p>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--accent)' }}>Ver</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
