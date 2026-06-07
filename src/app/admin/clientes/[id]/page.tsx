'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const CATEGORY_ICONS: Record<string, string> = {
  auto: '🚗', hogar: '🏠', vida: '❤️', ahorro: '📈', art: '🦺', comercio: '🏪'
}

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [cliente, setCliente] = useState<any>(null)
  const [riesgos, setRiesgos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'polizas' | 'pagos' | 'docs'>('polizas')
  const [pagos, setPagos] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: r }, { data: p }, { data: d }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('risks').select('*, companies(name, brand_color, assistance_phone)').eq('client_id', id).order('display_name'),
        supabase.from('payments').select('*, risks(display_name)').eq('client_id', id).order('due_date', { ascending: false }).limit(20),
        supabase.from('documents').select('*, companies(name)').eq('client_id', id).order('created_at', { ascending: false }).limit(30),
      ])
      setCliente(c); setForm(c || {})
      setRiesgos(r || []); setPagos(p || []); setDocs(d || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    await supabase.from('clients').update({
      full_name: form.full_name, dni: form.dni, birth_date: form.birth_date || null,
      phone: form.phone, email: form.email, address: form.address, notes: form.notes,
    }).eq('id', id)
    setCliente({ ...cliente, ...form })
    setEditando(false); setSaving(false)
  }

  async function invitarAsegurado() {
    if (!cliente?.email) { alert('El cliente no tiene email registrado'); return }
    await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cliente.email, full_name: cliente.full_name, role: 'asegurado', client_id: id }),
    })
    alert(`✅ Invitación enviada a ${cliente.email}`)
  }

  const formatARS = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(c / 100)

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}</div>
  if (!cliente) return <div className="card text-center py-10"><p style={{ color: 'var(--muted)' }}>Cliente no encontrado</p></div>

  const edad = cliente.birth_date ? new Date().getFullYear() - new Date(cliente.birth_date).getFullYear() : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-lg" style={{ color: 'var(--muted)' }}>←</button>
        <h1 className="text-xl font-bold flex-1" style={{ color: 'var(--primary)' }}>{cliente.full_name}</h1>
        <button onClick={() => setEditando(!editando)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--accent)', background: 'rgba(43,168,196,0.1)' }}>
          {editando ? 'Cancelar' : '✏️ Editar'}
        </button>
      </div>

      {/* Datos del cliente */}
      <div className="card space-y-3">
        {editando ? (
          <div className="space-y-3">
            {[
              { label: 'Nombre completo', key: 'full_name' },
              { label: 'DNI / CUIT', key: 'dni' },
              { label: 'Fecha nac.', key: 'birth_date', type: 'date' },
              { label: 'Teléfono', key: 'phone', type: 'tel' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Dirección', key: 'address' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--muted)' }}>{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key] || ''}
                       onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                       className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                       style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
              </div>
            ))}
            <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Notas internas" rows={2}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
            <button onClick={handleSave} disabled={saving}
                    className="w-full py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
                    style={{ background: 'var(--primary)' }}>
              {saving ? 'Guardando...' : '✅ Guardar cambios'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'DNI / CUIT', value: cliente.dni },
              { label: 'Teléfono', value: cliente.phone },
              { label: 'Email', value: cliente.email },
              { label: 'Fecha nac.', value: cliente.birth_date ? `${new Date(cliente.birth_date).toLocaleDateString('es-AR')}${edad ? ` (${edad} años)` : ''}` : '-' },
              { label: 'Dirección', value: cliente.address || '-' },
            ].map(f => (
              <div key={f.label} className={f.label === 'Dirección' || f.label === 'Email' ? 'col-span-2' : ''}>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{f.label}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{f.value || '-'}</p>
              </div>
            ))}
            {cliente.notes && (
              <div className="col-span-2">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Notas</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text)' }}>{cliente.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={invitarAsegurado}
                className="py-3 rounded-xl text-xs font-semibold text-white text-center"
                style={{ background: 'var(--accent)' }}>
          ✉️ Invitar app
        </button>
        {cliente.phone && (
          <a href={`https://wa.me/${cliente.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${cliente.full_name.split(' ')[0]}, te contactamos desde ARGon Broker.`)}`}
             target="_blank" rel="noopener noreferrer"
             className="py-3 rounded-xl text-xs font-semibold text-white text-center"
             style={{ background: '#25D366' }}>
            💬 WhatsApp
          </a>
        )}
        <Link href={`/admin/clientes/${id}/nuevo-riesgo`}
              className="py-3 rounded-xl text-xs font-semibold text-white text-center"
              style={{ background: 'var(--primary)' }}>
          + Póliza
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'polizas', label: `Pólizas (${riesgos.length})` },
          { id: 'pagos',   label: `Pagos (${pagos.length})` },
          { id: 'docs',    label: `Docs (${docs.length})` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
                    color: tab === t.id ? 'white' : 'var(--muted)',
                    border: `1px solid ${tab === t.id ? 'var(--primary)' : 'var(--border)'}`,
                  }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pólizas */}
      {tab === 'polizas' && (
        <div className="space-y-3">
          {riesgos.length === 0 ? (
            <div className="card text-center py-8">
              <p style={{ color: 'var(--muted)' }}>Sin pólizas. <Link href={`/admin/clientes/${id}/nuevo-riesgo`} style={{ color: 'var(--accent)' }}>Agregar →</Link></p>
            </div>
          ) : riesgos.map((r: any) => {
            const dias = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86400000)
            return (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                       style={{ background: r.companies?.brand_color || 'var(--primary)' }}>
                    {CATEGORY_ICONS[r.category] || '🛡️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.display_name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.companies?.name} · {r.policy_number}</p>
                    {r.plate && <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--accent)' }}>{r.plate} · {r.brand} {r.model} {r.year_vehicle}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`badge ${dias > 30 ? 'badge-success' : dias > 0 ? 'badge-alert' : 'badge-danger'}`}>
                        {dias > 0 ? `Vence en ${dias}d` : 'Vencida'}
                      </span>
                      {r.premium_cents > 0 && (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatARS(r.premium_cents)}/mes</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/admin/clientes/${id}/riesgos/${r.id}`} style={{ color: 'var(--muted)' }}>›</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagos */}
      {tab === 'pagos' && (
        <div className="space-y-2">
          {pagos.length === 0 ? (
            <div className="card text-center py-8"><p style={{ color: 'var(--muted)' }}>Sin pagos registrados</p></div>
          ) : pagos.map((p: any) => (
            <div key={p.id} className="card flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.risks?.display_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{p.period} · {new Date(p.due_date).toLocaleDateString('es-AR')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{formatARS(p.amount_cents)}</p>
                <span className={`badge ${p.status === 'pagado' ? 'badge-success' : p.status === 'vencido' ? 'badge-danger' : 'badge-alert'}`}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentos */}
      {tab === 'docs' && (
        <div className="space-y-2">
          {docs.length === 0 ? (
            <div className="card text-center py-8"><p style={{ color: 'var(--muted)' }}>Sin documentos</p></div>
          ) : docs.map((d: any) => (
            <div key={d.id} className="card flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{d.display_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.period} · {d.companies?.name}</p>
              </div>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                 className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                 style={{ background: 'var(--primary)' }}>Ver</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
