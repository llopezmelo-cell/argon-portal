'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CotizadorPage() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [quotes, setQuotes] = useState<any[]>([])
  const [form, setForm] = useState({
    client_name: '', client_phone: '', brand: '', model: '',
    year: new Date().getFullYear().toString(), plate: '',
    coverage: 'Todo riesgo', amount_cents: '', currency: 'ARS', notes: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      setCompanyId(userData?.company_id || '')
      const { data } = await supabase.from('quotes').select('*, companies(name)')
        .eq('company_id', userData?.company_id || '').order('created_at', { ascending: false }).limit(10)
      setQuotes(data || [])
    }
    load()
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('quotes').insert({
      company_id: companyId,
      created_by: user?.id,
      client_name: form.client_name,
      client_phone: form.client_phone,
      brand: form.brand, model: form.model,
      year: parseInt(form.year),
      plate: form.plate.toUpperCase(),
      coverage: form.coverage,
      amount_cents: form.amount_cents ? Math.round(parseFloat(form.amount_cents) * 100) : null,
      currency: form.currency,
      notes: form.notes,
      valid_until: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'borrador',
    })
    if (!error) {
      setSuccess('✅ Cotización guardada')
      setForm({ client_name: '', client_phone: '', brand: '', model: '', year: new Date().getFullYear().toString(), plate: '', coverage: 'Todo riesgo', amount_cents: '', currency: 'ARS', notes: '' })
      const { data } = await supabase.from('quotes').select('*, companies(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(10)
      setQuotes(data || [])
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  function enviarWhatsApp(q: any) {
    if (!q.client_phone) return
    const msg = `Hola ${q.client_name?.split(' ')[0]}, te enviamos la cotización de tu ${q.brand} ${q.model} ${q.year}:\n\n📋 Cobertura: ${q.coverage}\n💰 Premio: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format((q.amount_cents || 0) / 100)}/mes\n\n¿Seguimos con la contratación? — ARGon Broker`
    window.open(`https://wa.me/${q.client_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const formatARS = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(c / 100)

  const inp = (label: string, key: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
      <input value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)}
             className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
             style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }} {...props} />
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Cotizador de vehículos</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Datos del cliente</p>
        {inp('Nombre del cliente *', 'client_name', { placeholder: 'García Juan', required: true })}
        {inp('Teléfono', 'client_phone', { type: 'tel', placeholder: '011 15-1234-5678' })}

        <p className="text-sm font-semibold pt-2" style={{ color: 'var(--muted)' }}>Datos del vehículo</p>
        <div className="grid grid-cols-2 gap-3">
          {inp('Marca *', 'brand', { placeholder: 'Toyota', required: true })}
          {inp('Modelo *', 'model', { placeholder: 'Etios', required: true })}
          {inp('Año *', 'year', { type: 'number', placeholder: '2022', required: true })}
          {inp('Patente', 'plate', { placeholder: 'AB123CD' })}
        </div>

        <p className="text-sm font-semibold pt-2" style={{ color: 'var(--muted)' }}>Cobertura y precio</p>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Cobertura</label>
          <select value={form.coverage} onChange={e => set('coverage', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
            {['Responsabilidad Civil', 'Terceros Completo', 'Terceros Completo + Granizo', 'Todo riesgo sin franquicia', 'Todo riesgo c/franquicia'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {inp('Premio mensual', 'amount_cents', { type: 'number', placeholder: '15000', step: '0.01', inputMode: 'decimal' })}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Moneda</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Notas</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                    placeholder="Observaciones, condiciones especiales..."
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>

        {success && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(31,159,92,0.1)', color: 'var(--success)' }}>{success}</p>}

        <button type="submit" disabled={saving}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40"
                style={{ background: 'var(--primary)' }}>
          {saving ? 'Guardando...' : '💾 Guardar cotización'}
        </button>
      </form>

      {quotes.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--primary)' }}>Cotizaciones recientes</h2>
          <div className="space-y-3">
            {quotes.map(q => (
              <div key={q.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{q.client_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{q.brand} {q.model} {q.year} {q.plate && `· ${q.plate}`}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{q.coverage}</p>
                    {q.amount_cents > 0 && <p className="font-bold text-sm mt-1" style={{ color: 'var(--primary)' }}>{formatARS(q.amount_cents)}/mes</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <span className={`badge ${q.status === 'aceptada' ? 'badge-success' : q.status === 'rechazada' ? 'badge-danger' : 'badge-muted'}`}>{q.status}</span>
                    {q.client_phone && (
                      <button onClick={() => enviarWhatsApp(q)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                              style={{ background: '#25D366' }}>💬</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
