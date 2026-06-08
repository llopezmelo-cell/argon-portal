'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PolicyInfo {
  id: string; display_name: string; category: string; plate?: string
  company: { name: string; assistance_phone?: string; brand_color?: string }
}
interface Contact { name: string; phone: string }

const ACCIDENT_STEPS = [
  { id: 's1', title: 'Pará en un lugar seguro y prendé las balizas', body: 'No movás el vehículo si hay heridos. Si no hay heridos y entorpece el tráfico, retiralo al costado.' },
  { id: 's2', title: 'Si hay heridos, llamá al 911 antes que nada', body: 'No los muevas a menos que corran peligro inmediato. Esperá ambulancia y policía.' },
  { id: 's3', title: 'Sacá fotos: vehículos, patentes, daños y escena', body: 'Capturá las 4 esquinas de tu auto y del otro, las patentes, la calle, semáforos y señales.' },
  { id: 's4', title: 'Pedí DNI, carnet y póliza del otro conductor', body: 'Sacá foto al DNI, carnet de conducir, cédula verde/azul y tarjeta de póliza. No firmes nada en el momento.' },
  { id: 's5', title: 'Llamá a tu compañía', body: 'Dale ubicación, breve descripción y datos del otro. La asistencia mecánica está incluida si tu cobertura la contempla.' },
  { id: 's6', title: 'Hacé la denuncia formal dentro de las 72 horas', body: 'Es obligatorio aunque vos no tengas la culpa. Necesitás las fotos y datos del otro conductor.' },
]

export default function EmergenciaPage() {
  const supabase = createClient()
  const [policies, setPolicies] = useState<PolicyInfo[]>([])
  const [contacts, setContacts] = useState<Contact[]>([
    { name: '', phone: '' }, { name: '', phone: '' }, { name: '', phone: '' }, { name: '', phone: '' }
  ])
  const [emergencyNum, setEmergencyNum] = useState('911')
  const [editEmg, setEditEmg] = useState(false)
  const [editContact, setEditContact] = useState<number | null>(null)
  const [openAssistAuto, setOpenAssistAuto] = useState(false)
  const [openAssistHogar, setOpenAssistHogar] = useState(false)
  const [showAccident, setShowAccident] = useState(false)
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('argon.contacts') || '[]')
      if (saved.length > 0) {
        const out = [...saved]
        while (out.length < 4) out.push({ name: '', phone: '' })
        setContacts(out.slice(0, 4))
      }
    } catch {}
    const num = localStorage.getItem('argon.emergency_num')
    if (num) setEmergencyNum(num)

    async function loadPolicies() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('client_id').eq('id', user.id).single()
      if (!userData?.client_id) return
      const { data } = await supabase
        .from('risks')
        .select('id, display_name, category, plate, companies(name, assistance_phone, brand_color)')
        .eq('client_id', userData.client_id)
      setPolicies((data || []).map((r: any) => ({ ...r, company: r.companies || {} })))
    }
    loadPolicies()
  }, [])

  const autoPolicies = policies.filter(p => p.category === 'auto')
  const hogarPolicies = policies.filter(p => ['hogar', 'comercio'].includes(p.category))

  function saveContact(i: number, data: Contact) {
    const next = contacts.map((c, idx) => idx === i ? data : c)
    setContacts(next)
    localStorage.setItem('argon.contacts', JSON.stringify(next))
    setEditContact(null)
  }

  const tones = ['#EC407A', '#43A047', '#5C9EFF', '#FB8C00']

  // ── Accident screen ──────────────────────────────────────────
  if (showAccident) {
    const doneCount = Object.values(doneSteps).filter(Boolean).length
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 8px' }}>
          <button onClick={() => setShowAccident(false)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 38, borderRadius: 12, padding: '0 14px 0 8px', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            Volver
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Ante un choque</div>
        </div>
        <div style={{ padding: '10px 20px 0' }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Mantené la calma.</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>6 pasos en orden. Tocá el círculo cuando completes uno.</div>
          <div style={{ marginTop: 14, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(doneCount / ACCIDENT_STEPS.length) * 100}%`, background: 'var(--success)', transition: 'width .3s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{doneCount} de {ACCIDENT_STEPS.length} completados</div>
        </div>
        <div style={{ padding: '18px 16px 8px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
            {ACCIDENT_STEPS.map((s, i) => {
              const done = !!doneSteps[s.id]
              return (
                <div key={s.id} className={`todo-step${done ? ' done' : ''}`}
                     onClick={() => setDoneSteps(d => ({ ...d, [s.id]: !d[s.id] }))}>
                  <div className="num">
                    {done
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      : i + 1}
                  </div>
                  <div className="body">
                    <div className="t1">{s.title}</div>
                    <div className="t2">{s.body}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ padding: '14px 20px 40px', display: 'flex', gap: 10 }}>
          {autoPolicies[0]?.company?.assistance_phone && (
            <a href={`tel:${autoPolicies[0].company.assistance_phone}`}
               style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--primary)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
              Llamar asistencia
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── Main emergency screen ────────────────────────────────────
  return (
    <div className="emg">
      <div>
        <div className="emg-h">Emergencia</div>
        <div className="emg-sub">Acción rápida cuando más lo necesitás.</div>
      </div>

      {/* 911 */}
      <div className="emg-big" onClick={() => { window.location.href = `tel:${emergencyNum}` }}>
        <div className="ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg>
        </div>
        <div className="text">
          <div className="t1">Llamar al {emergencyNum}</div>
          <div className="t2">Emergencias médicas, policía, bomberos</div>
        </div>
        <button onClick={e => { e.stopPropagation(); setEditEmg(true) }} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', width: 34, height: 34, borderRadius: 10, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z"/></svg>
        </button>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
      </div>

      {/* Asistencia mecánica */}
      <AsistCard tone="var(--alert)"
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 5.5a4 4 0 00-5 5l-6 6 3 3 6-6a4 4 0 005-5l-3 3-1.5-.5L13 9l3-3z"/></svg>}
        title="Asistencia mecánica"
        subtitle={autoPolicies.length === 0 ? 'Sin vehículos cargados' : autoPolicies.length === 1 ? `${autoPolicies[0].display_name} · ${autoPolicies[0].company.name}` : `${autoPolicies.length} vehículos · asistencia 24 hs`}
        policies={autoPolicies} open={openAssistAuto} onToggle={() => setOpenAssistAuto(o => !o)}
      />

      {/* Asistencia hogar */}
      {hogarPolicies.length > 0 && (
        <AsistCard tone="var(--accent)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"/></svg>}
          title="Asistencia hogar y comercio"
          subtitle={hogarPolicies.length === 1 ? `${hogarPolicies[0].display_name} · ${hogarPolicies[0].company.name}` : `${hogarPolicies.length} inmuebles · plomería, cerrajería, gas`}
          policies={hogarPolicies} open={openAssistHogar} onToggle={() => setOpenAssistHogar(o => !o)}
        />
      )}

      {/* ARGon */}
      <a href="https://wa.me/5492664627261?text=Hola%20ARGon%20Broker%2C%20necesito%20ayuda." target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--accent)))', borderRadius: 18, padding: '14px 16px', color: 'white', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🛡️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>Tu productor</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>ARGon Broker</div>
            <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 1 }}>Conectá por WhatsApp</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
            </div>
            <a href="tel:+5492664627261" onClick={e => e.stopPropagation()} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
            </a>
          </div>
        </div>
      </a>

      {/* Contactos personales */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 4px 8px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mis contactos · one touch</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Hasta 4 · editables</div>
        </div>
        <div className="emg-grid">
          {contacts.map((c, i) => (
            <ContactTile key={i} contact={c} tone={tones[i]}
              onCall={() => c.phone ? (window.location.href = `tel:${c.phone}`) : setEditContact(i)}
              onEdit={() => setEditContact(i)} />
          ))}
        </div>
      </div>

      {/* ¿Tuviste un choque? */}
      <div onClick={() => setShowAccident(true)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>¿Tuviste un choque?</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Te guiamos paso a paso · 6 cosas que hacer</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </div>

      {/* Sheets */}
      {editEmg && (
        <EditSheet onClose={() => setEditEmg(false)}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Número de emergencia</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, marginBottom: 18, lineHeight: 1.45 }}>Por defecto 911 en Argentina. Cambialo si viajás al exterior.</div>
          <EditNumField value={emergencyNum} onSave={v => { setEmergencyNum(v); localStorage.setItem('argon.emergency_num', v); setEditEmg(false) }} onCancel={() => setEditEmg(false)} />
        </EditSheet>
      )}
      {editContact !== null && (
        <EditSheet onClose={() => setEditContact(null)}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Contacto {editContact + 1}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, marginBottom: 18, lineHeight: 1.45 }}>Aparecerá como botón de llamada rápida en emergencias.</div>
          <EditContactFields initial={contacts[editContact]} onSave={data => saveContact(editContact, data)} onCancel={() => setEditContact(null)} />
        </EditSheet>
      )}
    </div>
  )
}

// ── Reusable components ────────────────────────────────────────
function AsistCard({ icon, tone, title, subtitle, policies, open, onToggle }: {
  icon: React.ReactNode; tone: string; title: string; subtitle: string
  policies: PolicyInfo[]; open: boolean; onToggle: () => void
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
        </div>
        {policies.length === 1 && policies[0].company.assistance_phone ? (
          <a href={`tel:${policies[0].company.assistance_phone}`} onClick={e => e.stopPropagation()}
             style={{ background: tone, color: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
            Llamar
          </a>
        ) : policies.length > 1 ? (
          <div style={{ color: 'var(--muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s ease' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </div>
        ) : null}
      </div>
      {open && policies.length > 1 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0 6px' }}>
          {policies.map((p, i) => (
            <div key={p.id} style={{ padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `color-mix(in srgb, ${p.company.brand_color || '#003D5C'} 14%, transparent)`, color: p.company.brand_color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 10 }}>
                {p.company.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{p.display_name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{p.company.name}{p.company.assistance_phone ? ` · ${p.company.assistance_phone}` : ''}</div>
              </div>
              {p.company.assistance_phone && (
                <a href={`tel:${p.company.assistance_phone}`} style={{ background: tone, color: 'white', border: 'none', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
                  Llamar
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactTile({ contact, tone, onCall, onEdit }: { contact: Contact; tone: string; onCall: () => void; onEdit: () => void }) {
  if (!contact.phone) return (
    <div onClick={onEdit} style={{ background: 'transparent', border: '1.5px dashed var(--border-strong)', borderRadius: 18, padding: '14px', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'var(--muted)' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'center' }}>Agregar<br />contacto</div>
    </div>
  )
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 14px 12px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, cursor: 'pointer' }} onClick={onCall}>
      <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z"/></svg>
      </button>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
        {(contact.name?.[0] || 'C').toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{contact.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{contact.phone}</div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: tone, marginTop: 'auto' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
        Llamar
      </div>
    </div>
  )
}

function EditSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 80, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '24px 24px 0 0', padding: '10px 20px 30px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  )
}

function EditNumField({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value)
  return (
    <>
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Número a llamar</div>
        <input value={v} onChange={e => setV(e.target.value)} inputMode="tel" placeholder="911"
               style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>Sugerencias: 911 (AR) · 112 (Europa) · 107 (SAME) · 100 (Bomberos AR)</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        <button onClick={() => onSave(v.trim() || '911')} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
      </div>
    </>
  )
}

function EditContactFields({ initial, onSave, onCancel }: { initial: Contact; onSave: (data: Contact) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial.name || '')
  const [phone, setPhone] = useState(initial.phone || '')
  const fs: React.CSSProperties = { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit' }
  const bs: React.CSSProperties = { background: 'var(--surface-2)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--border)', marginBottom: 10 }
  return (
    <>
      <div style={bs}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Nombre</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Mariana (esposa)" style={fs} />
      </div>
      <div style={{ ...bs, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Teléfono</div>
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="+54 9 266 …" style={fs} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        <button onClick={() => onSave({ name: name.trim() || 'Contacto', phone })} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
      </div>
    </>
  )
}
