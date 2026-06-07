'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ContactoPersonal {
  label: string
  phone: string
}

export default function EmergenciaPage() {
  const supabase = createClient()
  const [contactos, setContactos] = useState<ContactoPersonal[]>([
    { label: '', phone: '' },
    { label: '', phone: '' },
    { label: '', phone: '' },
    { label: '', phone: '' },
  ])
  const [asistencias, setAsistencias] = useState<{ company: string; phone: string; display_name: string }[]>([])
  const [editando, setEditando] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Cargar contactos guardados localmente
    try {
      const saved = localStorage.getItem('argon.emergency_contacts')
      if (saved) setContactos(JSON.parse(saved))
    } catch {}

    // Cargar teléfonos de asistencia de las pólizas activas
    async function loadAsistencias() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('client_id').eq('id', user.id).single()
      if (!userData?.client_id) return

      const { data } = await supabase
        .from('risks')
        .select('display_name, companies(name, assistance_phone)')
        .eq('client_id', userData.client_id)
        .eq('status', 'activo')

      const phones = (data || [])
        .filter((r: any) => r.companies?.assistance_phone)
        .map((r: any) => ({
          company: r.companies.name,
          phone: r.companies.assistance_phone,
          display_name: r.display_name,
        }))

      setAsistencias(phones)
    }
    loadAsistencias()
  }, [])

  function saveContacto(index: number) {
    const updated = [...contactos]
    const newContacts = updated
    localStorage.setItem('argon.emergency_contacts', JSON.stringify(newContacts))
    setContactos(newContacts)
    setEditando(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--danger)' }}>🆘 Emergencias</h1>

      {/* 911 */}
      <a href="tel:911" className="flex items-center gap-4 p-5 rounded-2xl text-white active:scale-95 transition-transform"
         style={{ background: 'var(--danger)' }}>
        <span className="text-4xl">🚨</span>
        <div>
          <p className="text-2xl font-black">911</p>
          <p className="text-sm opacity-80">Emergencias — Llamar ahora</p>
        </div>
      </a>

      {/* Asistencias por compañía */}
      {asistencias.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
            Asistencia por compañía
          </h2>
          <div className="space-y-2">
            {asistencias.map((a, i) => (
              <a key={i} href={`tel:${a.phone}`}
                 className="flex items-center gap-3 card active:scale-98 transition-transform">
                <span className="text-2xl">🔧</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{a.company}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.display_name} · {a.phone}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--bg)', color: 'var(--accent)' }}>Llamar</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Contactos personales */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Mis contactos de emergencia
          </h2>
          {saved && <span className="text-xs" style={{ color: 'var(--success)' }}>✅ Guardado</span>}
        </div>
        <div className="space-y-2">
          {contactos.map((c, i) => (
            <div key={i}>
              {editando === i ? (
                <div className="card space-y-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej: Mamá, Jefe)"
                    value={c.label}
                    onChange={e => {
                      const updated = [...contactos]
                      updated[i] = { ...c, label: e.target.value }
                      setContactos(updated)
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={c.phone}
                    onChange={e => {
                      const updated = [...contactos]
                      updated[i] = { ...c, phone: e.target.value }
                      setContactos(updated)
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveContacto(i)}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                            style={{ background: 'var(--success)' }}>Guardar</button>
                    <button onClick={() => setEditando(null)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold"
                            style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>Cancelar</button>
                  </div>
                </div>
              ) : c.phone ? (
                <a href={`tel:${c.phone}`}
                   className="flex items-center gap-3 card active:scale-98 transition-transform">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                       style={{ background: 'var(--accent)' }}>
                    {c.label?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{c.label || 'Contacto'}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.phone}</p>
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); setEditando(i) }}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ color: 'var(--muted)', background: 'var(--bg)' }}
                  >✏️</button>
                </a>
              ) : (
                <button onClick={() => setEditando(i)}
                        className="w-full flex items-center gap-3 card border-dashed"
                        style={{ border: '2px dashed var(--border)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                       style={{ background: 'var(--bg)' }}>➕</div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Agregar contacto {i + 1}</p>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ARGon Broker */}
      <div className="card" style={{ background: 'var(--primary)' }}>
        <p className="text-white font-semibold">Contactar ARGon Broker</p>
        <div className="flex gap-3 mt-3">
          <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer"
             className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold"
             style={{ background: '#25D366', color: 'white' }}>💬 WhatsApp</a>
          <a href="tel:+5491100000000"
             className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold"
             style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>📞 Llamar</a>
        </div>
      </div>
    </div>
  )
}
