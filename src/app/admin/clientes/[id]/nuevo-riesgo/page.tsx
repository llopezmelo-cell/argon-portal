'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NuevoRiesgoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [companies, setCompanies] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    display_name: '', company_id: '', category: 'auto', policy_number: '',
    coverage: '', premium_cents: '', currency: 'ARS', starts_at: '', expires_at: '',
    plate: '', brand: '', model: '', year_vehicle: '', vin: '', engine_no: '',
    property_address: '',
  })

  useEffect(() => {
    supabase.from('companies').select('id, name, brand_color').order('name').then(({ data }) => setCompanies(data || []))
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name || !form.company_id || !form.policy_number) {
      setError('Nombre, compañía y número de póliza son obligatorios'); return
    }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('risks').insert({
      client_id: id,
      display_name: form.display_name.trim(),
      company_id: form.company_id,
      category: form.category,
      policy_number: form.policy_number.trim(),
      coverage: form.coverage.trim(),
      premium_cents: form.premium_cents ? Math.round(parseFloat(form.premium_cents) * 100) : 0,
      currency: form.currency,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      status: 'activo',
      plate: form.plate.trim().toUpperCase() || null,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      year_vehicle: form.year_vehicle ? parseInt(form.year_vehicle) : null,
      vin: form.vin.trim() || null,
      engine_no: form.engine_no.trim() || null,
      property_address: form.property_address.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.replace(`/admin/clientes/${id}`)
  }

  const inp = (label: string, key: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
      <input value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)}
             className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
             style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
             {...props} />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} style={{ color: 'var(--muted)' }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Nueva póliza</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {inp('Nombre del riesgo *', 'display_name', { placeholder: 'Etios, Casa Olivos, etc.' })}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Compañía *</label>
          <select value={form.company_id} onChange={e => set('company_id', e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="">Seleccioná...</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Categoría</label>
          <div className="grid grid-cols-3 gap-2">
            {[['auto','🚗','Auto'],['hogar','🏠','Hogar'],['vida','❤️','Vida'],['ahorro','📈','Ahorro'],['art','🦺','ART'],['comercio','🏪','Comercio']].map(([val, icon, lbl]) => (
              <button key={val} type="button" onClick={() => set('category', val)}
                      className="py-2.5 rounded-xl text-sm text-center transition-all"
                      style={{
                        background: form.category === val ? 'var(--primary)' : 'var(--surface)',
                        color: form.category === val ? 'white' : 'var(--text)',
                        border: `2px solid ${form.category === val ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                {icon} {lbl}
              </button>
            ))}
          </div>
        </div>

        {inp('Número de póliza *', 'policy_number', { placeholder: 'ej: 123456789' })}
        {inp('Cobertura', 'coverage', { placeholder: 'Todo riesgo c/franquicia' })}

        <div className="grid grid-cols-2 gap-3">
          {inp('Premio mensual (ARS)', 'premium_cents', { type: 'number', placeholder: '15000', step: '0.01', inputMode: 'decimal' })}
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

        <div className="grid grid-cols-2 gap-3">
          {inp('Inicio vigencia', 'starts_at', { type: 'date' })}
          {inp('Vencimiento', 'expires_at', { type: 'date' })}
        </div>

        {form.category === 'auto' && (
          <div className="card space-y-3" style={{ background: 'var(--bg)' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Datos del vehículo</p>
            <div className="grid grid-cols-2 gap-3">
              {inp('Patente', 'plate', { placeholder: 'AB123CD' })}
              {inp('Año', 'year_vehicle', { type: 'number', placeholder: '2020' })}
            </div>
            {inp('Marca', 'brand', { placeholder: 'Toyota' })}
            {inp('Modelo', 'model', { placeholder: 'Etios' })}
            {inp('Chasis / VIN', 'vin', { placeholder: '9BWZZZ377VT004251' })}
            {inp('N° de motor', 'engine_no', { placeholder: '1E7654321' })}
          </div>
        )}

        {(form.category === 'hogar' || form.category === 'comercio') && (
          inp('Dirección del inmueble', 'property_address', { placeholder: 'Av. Maipú 2440, Vicente López' })
        )}

        {error && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(214,58,47,0.1)', color: 'var(--danger)' }}>{error}</p>}

        <button type="submit" disabled={saving}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40"
                style={{ background: 'var(--primary)' }}>
          {saving ? 'Guardando...' : '✅ Crear póliza'}
        </button>
      </form>
    </div>
  )
}
