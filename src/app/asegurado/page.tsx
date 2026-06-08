'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────
interface Document {
  id: string; type: string; display_name: string
  period: string; year: number; file_url: string
}
interface Risk {
  id: string; display_name: string; category: string
  policy_number: string; coverage: string; expires_at: string
  status: string; plate?: string; brand?: string; model?: string
  company: { name: string; brand_color: string; assistance_phone?: string }
  documents: Document[]
  isExpanded: boolean; activeSection: string | null
}

// ── Rubro config ───────────────────────────────────────────────
const RUBROS: Record<string, { label: string; plural: string; tone: string; icon: React.ReactNode; protege: string }> = {
  auto: {
    label: 'Vehículos', plural: 'Mis vehículos', tone: '#1E88E5',
    protege: 'Protege tu vehículo ante choque, incendio o robo, y te respalda si generás daños a terceros.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 14h14M6 14l1.5-5a2 2 0 012-1.5h5a2 2 0 012 1.5L18 14"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7.5" cy="17.5" r="1" fill="currentColor"/><circle cx="16.5" cy="17.5" r="1" fill="currentColor"/></svg>,
  },
  hogar: {
    label: 'Hogar', plural: 'Mi hogar', tone: '#7E57C2',
    protege: 'Cubre tu casa y todo lo que hay adentro ante incendio, robo, daños por agua y roturas.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"/></svg>,
  },
  vida: {
    label: 'Vida', plural: 'Vida', tone: '#E53935',
    protege: 'Le da un respaldo económico a tu familia si te pasa algo.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  },
  ahorro: {
    label: 'Ahorro', plural: 'Ahorro e Inversión', tone: '#43A047',
    protege: 'Hacés crecer tu dinero mes a mes y construís tu jubilación privada.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16V11M12 16V8M16 16v-6"/></svg>,
  },
  art: {
    label: 'ART', plural: 'ART', tone: '#00897B',
    protege: 'Cubre a tus empleados ante accidentes de trabajo y enfermedades profesionales.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/></svg>,
  },
  comercio: {
    label: 'Comercio', plural: 'Comercios e Industria', tone: '#FB8C00',
    protege: 'Protege tu local, mercadería y maquinaria, y tu responsabilidad ante clientes.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21v-6h6v6"/></svg>,
  },
}
const RUBRO_ORDER = ['auto', 'hogar', 'vida', 'ahorro', 'art', 'comercio']

function chevRight(size = 16) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
}
function iconDoc(size = 18) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5M9 13h8M9 17h6"/></svg>
}
function iconPhone(size = 17) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
}
function iconWA(size = 17) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
}

function diasHasta(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ── Sub-accordion ──────────────────────────────────────────────
function SubAccordion({ tone, title, subtitle, badge, open, onToggle, children }: {
  tone: string; title: string; subtitle: string; badge?: string
  open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', background: 'var(--surface)' }}>
      <div onClick={onToggle} style={{ padding: '12px 13px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: `color-mix(in srgb, ${tone} 14%, transparent)`,
          color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {iconDoc()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
            {badge && (
              <span style={{
                background: tone, color: 'white', fontSize: 10, fontWeight: 700,
                minWidth: 18, height: 18, borderRadius: 9, padding: '0 6px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{badge}</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s ease', color: 'var(--muted)' }}>
          {chevRight(15)}
        </div>
      </div>
      {open && (
        <div style={{ padding: '2px 11px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Policy accordion ───────────────────────────────────────────
function PolicyAccordion({ risk, supabase }: { risk: Risk; supabase: any }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<string | null>(null)
  const dias = diasHasta(risk.expires_at)
  const vencido = dias <= 0
  const venceProx = !vencido && dias <= 30

  const co = risk.company
  const isAuto = risk.category === 'auto'
  const initials = co.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')

  async function openDoc(doc: Document) {
    let url = doc.file_url
    if (!url.startsWith('http')) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(url, 3600)
      url = data?.signedUrl || url
    }
    window.open(url, '_blank')
  }

  async function shareDoc(doc: Document) {
    let url = doc.file_url
    if (!url.startsWith('http')) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(url, 3600)
      url = data?.signedUrl || url
    }
    if (navigator.share) navigator.share({ title: doc.display_name, url })
    else navigator.clipboard.writeText(url)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ padding: 14, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: co.brand_color ? `${co.brand_color}22` : 'var(--surface-2)',
          color: co.brand_color || 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 11, letterSpacing: '0.06em',
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {risk.display_name}
            </span>
            {vencido && <span className="badge badge-danger">Vencida</span>}
            {venceProx && <span className="badge badge-alert">Vence en {dias}d</span>}
            {!vencido && !venceProx && <span className="badge badge-success">Vigente</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
            {co.name} · {risk.coverage}
          </div>
          {risk.plate && (
            <span style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              padding: '2px 8px', borderRadius: 6, letterSpacing: '0.06em', marginTop: 3,
            }}>{risk.plate}</span>
          )}
        </div>
        <div style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s ease', color: 'var(--muted)' }}>
          {chevRight(16)}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Certificados */}
          <SubAccordion
            tone="var(--accent)" title="Certificados"
            subtitle={isAuto ? 'Circulación · Mercosur' : 'Cobertura vigente'}
            badge={risk.documents.filter(d => d.type === 'certificado').length.toString() || undefined}
            open={section === 'certs'}
            onToggle={() => setSection(section === 'certs' ? null : 'certs')}
          >
            {risk.documents.filter(d => d.type === 'certificado').length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 2px' }}>Sin certificados cargados aún</p>
            ) : risk.documents.filter(d => d.type === 'certificado').map(doc => (
              <DocRow key={doc.id} doc={doc} tone="var(--accent)" onOpen={() => openDoc(doc)} onShare={() => shareDoc(doc)} />
            ))}
          </SubAccordion>

          {/* Póliza y documentos */}
          <SubAccordion
            tone="var(--primary)" title="Póliza y documentos"
            subtitle={`${risk.documents.filter(d => d.type !== 'certificado').length} archivo(s)`}
            badge={risk.documents.filter(d => d.type !== 'certificado').length > 0 ? risk.documents.filter(d => d.type !== 'certificado').length.toString() : undefined}
            open={section === 'poliza'}
            onToggle={() => setSection(section === 'poliza' ? null : 'poliza')}
          >
            {risk.documents.filter(d => d.type !== 'certificado').length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 2px' }}>Sin documentos cargados aún</p>
            ) : risk.documents.filter(d => d.type !== 'certificado').map(doc => (
              <DocRow key={doc.id} doc={doc} tone="var(--primary)" onOpen={() => openDoc(doc)} onShare={() => shareDoc(doc)} />
            ))}
          </SubAccordion>

          {/* Asistencia */}
          {co.assistance_phone && (
            <a href={`tel:${co.assistance_phone.replace(/[^0-9+]/g, '')}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, cursor: 'pointer',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: 'color-mix(in srgb, var(--alert) 16%, transparent)',
                  color: 'var(--alert)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{iconPhone(19)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Asistencia {co.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{co.assistance_phone} · 24 hs</div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--success)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{iconPhone(15)}</div>
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, tone, onOpen, onShare }: { doc: Document; tone: string; onOpen: () => void; onShare: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: 'var(--surface-2)', borderRadius: 11, border: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {iconDoc(18)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.display_name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{doc.period}{doc.year ? ` · ${doc.year}` : ''}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onOpen} style={{ padding: '7px 12px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Ver
        </button>
        <button onClick={onShare} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          📤
        </button>
      </div>
    </div>
  )
}

// ── Rubro section ──────────────────────────────────────────────
function RubroSection({ id, risks, supabase }: { id: string; risks: Risk[]; supabase: any }) {
  const rubro = RUBROS[id]
  if (!rubro || risks.length === 0) return null
  const [open, setOpen] = useState(false)
  const due = risks.find(r => {
    const d = diasHasta(r.expires_at); return d > 0 && d <= 30
  })

  return (
    <div>
      {/* Category card */}
      <div onClick={() => setOpen(o => !o)} style={{
        background: 'var(--surface)', border: `1px solid ${open ? rubro.tone : 'var(--border)'}`,
        borderRadius: 18, padding: 14, cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'border-color .15s ease',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: `color-mix(in srgb, ${rubro.tone} 14%, transparent)`,
          color: rubro.tone, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{rubro.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{rubro.plural}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: rubro.tone,
              background: `color-mix(in srgb, ${rubro.tone} 14%, transparent)`,
              borderRadius: 6, padding: '1px 7px',
            }}>{risks.length}</span>
            {due && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--alert)', flexShrink: 0 }} />
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {due ? `⚠ Vence en ${diasHasta(due.expires_at)}d` : 'Todo al día'}
          </div>
        </div>
        <div style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s ease', color: 'var(--muted)' }}>
          {chevRight(16)}
        </div>
      </div>

      {/* Policies list */}
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
          {/* Qué protege */}
          <div style={{
            background: `color-mix(in srgb, ${rubro.tone} 7%, var(--surface))`,
            border: `1px solid color-mix(in srgb, ${rubro.tone} 25%, transparent)`,
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{ fontSize: 20 }}>🛡️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: rubro.tone, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>¿Qué cubre?</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{rubro.protege}</div>
            </div>
          </div>
          {risks.map(r => <PolicyAccordion key={r.id} risk={r} supabase={supabase} />)}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function AseguradoHome() {
  const supabase = createClient()
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [offline, setOffline] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined') setOffline(!navigator.onLine)
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase.from('users')
      .select('full_name, client_id').eq('id', user.id).single()
    if (userData?.full_name) setUserName(userData.full_name.split(' ')[0])
    if (!userData?.client_id) { setLoading(false); return }

    const { data: risksData } = await supabase
      .from('risks')
      .select(`id, display_name, category, policy_number, coverage, expires_at, status, plate, brand, model,
               companies(name, brand_color, assistance_phone),
               documents(id, type, display_name, period, year, file_url)`)
      .eq('client_id', userData.client_id)
      .order('display_name')

    const formatted: Risk[] = (risksData || []).map((r: any) => ({
      ...r,
      company: r.companies || { name: '-', brand_color: '#003D5C' },
      documents: (r.documents || []).sort((a: any, b: any) => b.year - a.year || b.period?.localeCompare(a.period)),
      isExpanded: false, activeSection: null,
    }))

    setRisks(formatted)
    setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // Group by category
  const byCategory: Record<string, Risk[]> = {}
  for (const r of risks) {
    const cat = r.category?.toLowerCase() || 'otro'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(r)
  }

  const nextDue = risks.filter(r => {
    const d = diasHasta(r.expires_at); return d > 0 && d <= 30
  }).sort((a, b) => diasHasta(a.expires_at) - diasHasta(b.expires_at))[0]

  // Initials from name
  const initials = userName.slice(0, 2).toUpperCase() || 'YO'

  if (loading) return (
    <div style={{ padding: '16px 16px 20px' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 4px 20px' }}>
        <div>
          <div style={{ height: 14, width: 100, borderRadius: 7, background: 'var(--border)', marginBottom: 8 }} />
          <div style={{ height: 22, width: 160, borderRadius: 7, background: 'var(--border)' }} />
        </div>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--border)' }} />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ height: 72, borderRadius: 18, background: 'var(--border)', marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* ── Header ── */}
      <div style={{ padding: '18px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bienvenido
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 2 }}>
            {userName || 'Tu portal'}
          </div>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--primary))',
          color: 'white', fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>{initials}</div>
      </div>

      {/* ── Sync status ── */}
      <div style={{ padding: '0 20px 10px' }}>
        <div className={`sync-pill${offline ? ' offline' : ''}`}>
          <span className="dot" />
          {offline ? 'Sin conexión' : lastSync ? `Sincronizado · ${lastSync}` : 'Conectado'}
        </div>
      </div>

      {/* ── Alert strip ── */}
      {nextDue && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="alert-strip">
            <div className="ico">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg>
            </div>
            <div className="body">
              <div className="t1">Vence en {diasHasta(nextDue.expires_at)} días</div>
              <div className="t2">{nextDue.display_name} · {nextDue.company.name}</div>
            </div>
            <div className="cta">Ver</div>
          </div>
        </div>
      )}

      {/* ── Seguros section ── */}
      <div className="sec-h">
        <div className="ttl">Tus seguros</div>
        <button onClick={loadData} style={{
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          background: 'var(--accent-soft)', border: 'none',
          borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
        }}>🔄 Actualizar</button>
      </div>

      {risks.length === 0 ? (
        <div style={{ margin: '0 16px', padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No tenés pólizas cargadas</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Tu agente ARGon las agregará pronto</div>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RUBRO_ORDER.map(cat => (
            byCategory[cat] ? (
              <RubroSection key={cat} id={cat} risks={byCategory[cat]} supabase={supabase} />
            ) : null
          ))}
          {/* Categorías no reconocidas */}
          {Object.entries(byCategory)
            .filter(([cat]) => !RUBRO_ORDER.includes(cat))
            .map(([cat, items]) => (
              <RubroSection key={cat} id={cat} risks={items} supabase={supabase} />
            ))}
        </div>
      )}

      {/* ── ARGon Contact card ── */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--accent)))',
          borderRadius: 18, padding: '16px 16px 18px', color: 'white',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>
            Tu productor
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2, letterSpacing: '-0.01em' }}>ARGon Broker</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>
            Cuando más lo necesitás, hay alguien que te <strong>Asiste</strong>.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <a href="https://wa.me/5492664627261" target="_blank" rel="noopener noreferrer" style={{
              flex: 1, padding: '12px', borderRadius: 12, textAlign: 'center',
              background: '#25D366', color: 'white', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {iconWA(17)} WhatsApp
            </a>
            <a href="tel:+5492664627261" style={{
              flex: 1, padding: '12px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {iconPhone(17)} Llamar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
