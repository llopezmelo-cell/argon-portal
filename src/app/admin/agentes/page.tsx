'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AgentesPage() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newCo, setNewCo] = useState({ name: '', slug: '', assistance_phone: '', website: '', brand_color: '#003D5C' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: cos }, { data: ags }] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('users').select('id, full_name, email, status, company_id').eq('role', 'agente').order('full_name'),
    ])
    setCompanies(cos || [])
    setAgents(ags || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const slug = newCo.slug || newCo.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    await supabase.from('companies').insert({ ...newCo, slug })
    setNewCo({ name: '', slug: '', assistance_phone: '', website: '', brand_color: '#003D5C' })
    setShowNewCompany(false); setSaving(false)
    load()
  }

  async function assignAgent(agentId: string, companyId: string) {
    await supabase.from('users').update({ company_id: companyId || null }).eq('id', agentId)
    load()
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>

  return (
    <div className="space-y-6">
      {/* Compañías */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--primary)' }}>Compañías ({companies.length})</h2>
          <button onClick={() => setShowNewCompany(!showNewCompany)}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--primary)' }}>
            + Nueva
          </button>
        </div>

        {showNewCompany && (
          <form onSubmit={saveCompany} className="card space-y-3 mb-4">
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Nueva compañía</p>
            {[
              { label: 'Nombre *', key: 'name', ph: 'Sancor Seguros' },
              { label: 'Slug (URL)', key: 'slug', ph: 'sancor' },
              { label: 'Tel. asistencia', key: 'assistance_phone', ph: '0800-444-7000' },
              { label: 'Website', key: 'website', ph: 'https://sancor.com.ar' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--muted)' }}>{f.label}</label>
                <input value={newCo[f.key as keyof typeof newCo]}
                       onChange={e => setNewCo(p => ({ ...p, [f.key]: e.target.value }))}
                       placeholder={f.ph}
                       className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                       style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--muted)' }}>Color de marca</label>
              <div className="flex items-center gap-3">
                <input type="color" value={newCo.brand_color}
                       onChange={e => setNewCo(p => ({ ...p, brand_color: e.target.value }))}
                       className="w-10 h-10 rounded-lg border cursor-pointer"
                       style={{ borderColor: 'var(--border)' }} />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{newCo.brand_color}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: 'var(--primary)' }}>
                {saving ? 'Guardando...' : '✅ Crear'}
              </button>
              <button type="button" onClick={() => setShowNewCompany(false)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {companies.map(co => {
            const agente = agents.find(a => a.company_id === co.id)
            return (
              <div key={co.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                     style={{ background: co.brand_color || 'var(--primary)' }}>
                  {co.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{co.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {co.assistance_phone || 'Sin tel.'} · {agente ? agente.full_name : 'Sin agente asignado'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Agentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--primary)' }}>Agentes ({agents.length})</h2>
          <Link href="/admin/usuarios/invitar?rol=agente"
                className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--accent)' }}>
            + Invitar agente
          </Link>
        </div>
        <div className="space-y-2">
          {agents.length === 0 ? (
            <div className="card text-center py-8">
              <p style={{ color: 'var(--muted)' }}>No hay agentes. <Link href="/admin/usuarios/invitar?rol=agente" style={{ color: 'var(--accent)' }}>Invitar uno →</Link></p>
            </div>
          ) : agents.map(ag => (
            <div key={ag.id} className="card space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                     style={{ background: 'var(--accent)' }}>
                  {ag.full_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{ag.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{ag.email}</p>
                </div>
                <span className={`badge ${ag.status === 'activo' ? 'badge-success' : 'badge-muted'}`}>{ag.status}</span>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--muted)' }}>Compañía asignada</label>
                <select
                  value={ag.company_id || ''}
                  onChange={e => assignAgent(ag.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                >
                  <option value="">Sin asignar</option>
                  {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
