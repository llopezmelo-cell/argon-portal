'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── SVG Icons inline (matching prototype) ──────────────────
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/>
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l10 18H2L12 3z"/>
      <path d="M12 10v4M12 17.5v.5"/>
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/asegurado',            label: 'Pólizas',    Icon: IconShield,  exact: true },
  { href: '/asegurado/emergencia', label: 'Emergencia', Icon: IconAlert,   danger: true },
  { href: '/asegurado/compartir',  label: 'Compartir',  Icon: IconShare },
  { href: '/asegurado/yo',         label: 'Yo',         Icon: IconUser },
]

export default function AseguradoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null)

  useEffect(() => {
    async function check() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('full_name, role').eq('id', authUser.id).single()
      if (!data || data.role !== 'asegurado') { router.replace('/dashboard'); return }
      setUser(data)
    }
    check()
  }, [])

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Cargando...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 480, margin: '0 auto' }}>
      <main style={{ paddingBottom: 80 }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'stretch', height: 64,
        zIndex: 40,
      }}>
        {NAV_ITEMS.map(({ href, label, Icon, danger, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          const color = danger
            ? (active ? 'var(--danger)' : 'var(--muted)')
            : (active ? 'var(--primary)' : 'var(--muted)')
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, color, textDecoration: 'none',
              transition: 'color .15s ease',
              position: 'relative',
            }}>
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '25%', right: '25%',
                  height: 2, borderRadius: '0 0 2px 2px',
                  background: danger ? 'var(--danger)' : 'var(--primary)',
                }} />
              )}
              <Icon />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
