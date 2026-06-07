'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NuevoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', dni: '', birth_date: '', phone: '', email: '', address: '', notes: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.dni) { setError('Nombre y DNI son obligatorios'); return }
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('clients').insert({
      full_name: form.full_name.trim(),
      dni: form.dni.trim(),
      birth_date: form.birth_date || null,
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    }).select('id').single()
    if (err) { setError(err.message); setSaving(false); return }
    router.replace(`/admin/clientes/${data.id}`)
  }

  const field = (label: string, key: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
      <input
        value={form[key as keyof typeof form]}
        onChange={e => set(key, e.target.value)}
        className="w-full px-4 py-3 rounded-xl border text-base outline-none"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        {...props}
      />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-lg" style={{ color: 'var(--muted)' }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Nuevo cliente</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('Nombre completo *', 'full_name', { placeholder: 'García Juan', autoFocus: true })}
        {field('DNI / CUIT *', 'dni', { placeholder: '20123456789', inputMode: 'numeric' })}
        {field('Fecha de nacimiento', 'birth_date', { type: 'date' })}
        {field('Teléfono', 'phone', { placeholder: '011 15-1234-5678', type: 'tel' })}
        {field('Email', 'email', { placeholder: 'juan@email.com', type: 'email' })}
        {field('Dirección', 'address', { placeholder: 'Av. Corrientes 1234, CABA' })}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Notas internas</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Observaciones del cliente..."
            className="w-full px-4 py-3 rounded-xl border text-base outline-none resize-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>
        {error && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(214,58,47,0.1)', color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" disabled={saving}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40"
                style={{ background: 'var(--primary)' }}>
          {saving ? 'Guardando...' : '✅ Crear cliente'}
        </button>
      </form>
    </div>
  )
}
