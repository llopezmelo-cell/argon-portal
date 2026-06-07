'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function InvitarUsuarioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [companies, setCompanies] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', full_name: '', role: searchParams.get('rol') || 'asegurado',
    company_id: '', client_id: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('clients').select('id, full_name').order('full_name'),
    ]).then(([{ data: cos }, { data: cls }]) => {
      setCompanies(cos || [])
      setClients(cls || [])
    })
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.full_name || !form.role) { setError('Completá todos los campos'); return }
    setSending(true); setError('')
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al enviar invitación'); setSending(false); return }
    setSuccess(`✅ Invitación enviada a ${form.email}`)
    setSending(false)
    setTimeout(() => router.back(), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} style={{ color: 'var(--muted)' }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Invitar usuario</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Nombre completo *</label>
          <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required autoFocus
                 placeholder="García Juan"
                 className="w-full px-4 py-3 rounded-xl border text-base outline-none"
                 style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                 placeholder="usuario@email.com"
                 className="w-full px-4 py-3 rounded-xl border text-base outline-none"
                 style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Rol *</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'agente', label: '🏢 Agente', desc: 'Sube documentos y gestiona su compañía' },
              { value: 'coordinador', label: '👔 Coordinador', desc: 'Supervisa todos los agentes' },
              { value: 'asegurado', label: '🛡️ Asegurado', desc: 'Ve sus propias pólizas' },
              { value: 'admin', label: '⚙️ Admin', desc: 'Acceso total al sistema' },
            ].map(r => (
              <button key={r.value} type="button" onClick={() => set('role', r.value)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: form.role === r.value ? 'var(--primary)' : 'var(--surface)',
                        color: form.role === r.value ? 'white' : 'var(--text)',
                        border: `2px solid ${form.role === r.value ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {form.role === 'agente' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Compañía asignada</label>
            <select value={form.company_id} onChange={e => set('company_id', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="">Sin asignar</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {form.role === 'asegurado' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Cliente vinculado</label>
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="">Seleccioná el cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
        )}

        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(43,168,196,0.08)', color: 'var(--text)' }}>
          <p className="font-semibold mb-1">📧 ¿Qué recibe el usuario?</p>
          <p style={{ color: 'var(--muted)' }}>
            Un email con un link de acceso único. Al ingresar por primera vez, configurará su PIN de 6 dígitos y podrá activar biometría.
          </p>
        </div>

        {error && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(214,58,47,0.1)', color: 'var(--danger)' }}>{error}</p>}
        {success && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(31,159,92,0.1)', color: 'var(--success)' }}>{success}</p>}

        <button type="submit" disabled={sending}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40"
                style={{ background: 'var(--primary)' }}>
          {sending ? 'Enviando...' : '✉️ Enviar invitación'}
        </button>
      </form>
    </div>
  )
}
