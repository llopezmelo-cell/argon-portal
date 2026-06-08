'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin',          label: 'Panel',     emoji: '📊', exact: true },
  { href: '/admin/clientes', label: 'Clientes',  emoji: '👥', exact: false },
  { href: '/admin/agentes',  label: 'Agentes',   emoji: '🏢', exact: false },
  { href: '/admin/usuarios', label: 'Usuarios',  emoji: '🔐', exact: false },
  { href: '/admin/reportes', label: 'Reportes',  emoji: '📈', exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser]       = useState<{ full_name: string; role: string } | null>(null)
  const [sideOpen, setSideOpen] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('full_name, role').eq('id', authUser.id).single()
      const role = data?.role ?? authUser.user_metadata?.role
      if (!role || role !== 'admin') { router.replace('/dashboard'); return }
      setUser({ full_name: data?.full_name ?? authUser.user_metadata?.full_name ?? 'Admin', role: 'admin' })
    }
    check()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
             style={{ background: 'var(--primary)' }}>
          <span className="text-white font-black text-base">AR</span>
        </div>
        <p style={{ color: 'var(--muted)' }}>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Overlay móvil ── */}
      {sideOpen && (
        <div
          onClick={() => setSideOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 40, display: 'block',
          }}
          className="lg:hidden"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220,
        background: 'var(--primary)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 50,
        transform: sideOpen ? 'translateX(0)' : undefined,
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
      }}
      className={`hidden lg:flex ${sideOpen ? '!flex' : ''}`}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 13, color: 'var(--primary)', flexShrink: 0,
            }}>AR</div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>ARGon</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 500 }}>BROKER · ADMIN</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSideOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10,
                  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.72)',
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  borderLeft: active ? '3px solid white' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Usuario + salir */}
        <div style={{ padding: '16px 16px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.full_name}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 12 }}>Administrador</div>
          <button
            onClick={signOut}
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 220 }}
           className="lg:ml-[220px] ml-0">

        {/* Topbar móvil */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'var(--primary)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        className="lg:hidden">
          <button
            onClick={() => setSideOpen(true)}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 4 }}
          >☰</button>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>
            AR<span style={{ color: '#4BBFD6' }}>Gon</span> Admin
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>
            Salir
          </button>
        </header>

        <main style={{ flex: 1, padding: '24px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
