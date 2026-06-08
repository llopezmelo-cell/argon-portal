'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Risk { id: string; display_name: string; plate?: string; brand?: string; model?: string; category: string }
interface Delegation { id: string; name: string; email: string; rel: string; policies: string[]; initials: string; tone: string; status: 'active' | 'pending' }

const TONE_GRADIENTS: Record<string, string> = {
  pink:   'linear-gradient(135deg,#F06292,#EC407A)',
  blue:   'linear-gradient(135deg,#5C9EFF,#3F51B5)',
  orange: 'linear-gradient(135deg,#FFB74D,#FF7043)',
  green:  'linear-gradient(135deg,#66BB6A,#2E7D32)',
}
const TONES = ['pink', 'blue', 'orange', 'green']

function chevRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
}
function checkIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
}

export default function CompartirPage() {
  const supabase = createClient()
  const [risks, setRisks] = useState<Risk[]>([])
  const [dels, setDels] = useState<Delegation[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [managing, setManaging] = useState<Delegation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load saved delegations from localStorage (demo mode)
    try {
      const saved = JSON.parse(localStorage.getItem('argon.dels') || '[]')
      if (saved.length > 0) setDels(saved)
    } catch {}

    async function loadRisks() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('client_id').eq('id', user.id).single()
      if (!userData?.client_id) { setLoading(false); return }
      const { data } = await supabase
        .from('risks')
        .select('id, display_name, plate, brand, model, category')
        .eq('client_id', userData.client_id)
        .order('display_name')
      setRisks(data || [])
      setLoading(false)
    }
    loadRisks()
  }, [])

  function persist(next: Delegation[]) {
    setDels(next)
    localStorage.setItem('argon.dels', JSON.stringify(next))
  }

  function addDelegation(data: { name: string; email: string; rel: string; policies: string[] }) {
    const nd: Delegation = {
      id: 'd' + Date.now(),
      name: data.name, email: data.email, rel: data.rel, policies: data.policies,
      initials: data.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
      tone: TONES[Math.floor(Math.random() * TONES.length)],
      status: 'pending',
    }
    persist([...dels, nd])
    setInviteOpen(false)
  }

  function revoke(id: string) {
    persist(dels.filter(d => d.id !== id))
    setManaging(null)
  }

  function updatePolicies(id: string, policies: string[]) {
    persist(dels.map(d => d.id === id ? { ...d, policies } : d))
    setManaging(null)
  }

  const autoPolicies = risks.filter(r => r.category === 'auto')

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 6px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Compartir acceso</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
          Asigná certificados a un familiar o chofer. Lo ven offline y podés revocar cuando quieras.
        </div>
      </div>

      {/* Invite button */}
      <div style={{ padding: '12px 16px 0' }}>
        <div onClick={() => setInviteOpen(true)} style={{ border: '1.5px dashed var(--accent)', borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: 'var(--accent-soft)' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Invitar por email</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Le llega un mail para activar su acceso. Sin apps complicadas.</div>
          </div>
        </div>
      </div>

      {/* Active delegations */}
      {dels.length > 0 && (
        <>
          <div className="sec-h"><div className="ttl">Con acceso ahora</div></div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dels.map(d => {
              const vehicles = d.policies.map(id => risks.find(r => r.id === id)).filter(Boolean) as Risk[]
              return (
                <div key={d.id} className="card" style={{ padding: 14 }} onClick={() => setManaging(d)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: TONE_GRADIENTS[d.tone] || TONE_GRADIENTS.blue, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{d.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{d.name}</span>
                        {d.status === 'pending'
                          ? <span className="chip warn" style={{ fontSize: 9.5, padding: '1px 7px' }}>invitado</span>
                          : <span className="chip ok" style={{ fontSize: 9.5, padding: '1px 7px' }}>activo</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.email}</div>
                    </div>
                    {chevRight()}
                  </div>
                  {vehicles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      {vehicles.map(v => (
                        <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 9px', borderRadius: 8 }}>
                          🚗 {v.display_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {dels.length === 0 && !loading && (
        <div style={{ margin: '20px 16px', padding: '30px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Nadie con acceso todavía</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Invitá a un familiar o chofer para que vean sus certificados</div>
        </div>
      )}

      {/* Use cases */}
      <div className="sec-h"><div className="ttl">¿Para qué sirve?</div></div>
      <div style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: '🚗', t1: 'Flota de empresa', t2: 'Asignás cada vehículo al chofer que lo maneja. Cada uno ve sólo lo suyo.' },
          { icon: '👨‍👩‍👧', t1: 'Familia', t2: 'Compartís la cédula y los certificados con tus hijos cuando usan el auto.' },
          { icon: '🏠', t1: 'Inquilinos', t2: 'Pasás el certificado de cobertura del inmueble al inquilino.' },
        ].map(uc => (
          <div key={uc.t1} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 28 }}>{uc.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{uc.t1}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{uc.t2}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite sheet */}
      {inviteOpen && (
        <BottomSheet onClose={() => setInviteOpen(false)}>
          <InviteForm risks={autoPolicies} onInvite={addDelegation} onCancel={() => setInviteOpen(false)} />
        </BottomSheet>
      )}

      {/* Manage sheet */}
      {managing && (
        <BottomSheet onClose={() => setManaging(null)}>
          <ManageForm d={managing} risks={autoPolicies} onRevoke={revoke} onSave={updatePolicies} onCancel={() => setManaging(null)} />
        </BottomSheet>
      )}
    </div>
  )
}

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 80, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '24px 24px 0 0', padding: '10px 20px 30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  )
}

function InviteForm({ risks, onInvite, onCancel }: { risks: Risk[]; onInvite: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rel, setRel] = useState('Chofer flota')
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const valid = name.trim() && email.includes('@') && picked.length > 0

  const fs: React.CSSProperties = { width: '100%', border: '1px solid var(--border)', outline: 'none', background: 'var(--surface-2)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontWeight: 500, color: 'var(--text)', fontFamily: 'inherit' }

  return (
    <>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Invitar colaborador</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, marginBottom: 18, lineHeight: 1.45 }}>Le llega un email para activar su acceso. Va a ver sólo los vehículos que le asignés.</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Nombre y apellido</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Carlos Giménez" style={fs} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email</div>
        <input value={email} onChange={e => setEmail(e.target.value)} inputMode="email" placeholder="nombre@empresa.com" style={fs} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Relación</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Chofer flota', 'Familiar', 'Empleado', 'Inquilino'].map(r => (
            <button key={r} onClick={() => setRel(r)} style={{ padding: '8px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: rel === r ? 'var(--primary)' : 'var(--surface-2)', color: rel === r ? 'var(--primary-ink)' : 'var(--text)', border: `1px solid ${rel === r ? 'var(--primary)' : 'var(--border)'}` }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Vehículos a asignar ({picked.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {risks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No tenés vehículos cargados</p>
        ) : risks.map(v => {
          const on = picked.includes(v.id)
          return (
            <div key={v.id} onClick={() => toggle(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, cursor: 'pointer', background: on ? 'var(--accent-soft)' : 'var(--surface-2)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{v.display_name}</div>
                {v.plate && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{v.plate}</div>}
              </div>
              <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: on ? 'none' : '2px solid var(--border-strong)', background: on ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {on && checkIcon()}
              </div>
            </div>
          )
        })}
      </div>

      <button disabled={!valid} onClick={() => onInvite({ name, email, rel, policies: picked })}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: valid ? 'var(--primary)' : 'var(--border)', color: valid ? 'white' : 'var(--muted)', fontSize: 15, fontWeight: 700, cursor: valid ? 'pointer' : 'default', fontFamily: 'inherit' }}>
        Enviar invitación
      </button>
    </>
  )
}

function ManageForm({ d, risks, onRevoke, onSave, onCancel }: { d: Delegation; risks: Risk[]; onRevoke: (id: string) => void; onSave: (id: string, policies: string[]) => void; onCancel: () => void }) {
  const [picked, setPicked] = useState(d.policies)
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: TONE_GRADIENTS[d.tone] || TONE_GRADIENTS.blue, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{d.initials}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{d.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{d.email}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Vehículos asignados ({picked.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {risks.map(v => {
          const on = picked.includes(v.id)
          return (
            <div key={v.id} onClick={() => toggle(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, cursor: 'pointer', background: on ? 'var(--accent-soft)' : 'var(--surface-2)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>🚗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{v.display_name}</div>
                {v.plate && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.plate}</div>}
              </div>
              <div style={{ width: 24, height: 24, borderRadius: 7, border: on ? 'none' : '2px solid var(--border-strong)', background: on ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {on && checkIcon()}
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={() => onSave(d.id, picked)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
        Guardar cambios
      </button>
      <button onClick={() => onRevoke(d.id)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        🔒 Quitar todo el acceso
      </button>
    </>
  )
}
