'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TopBar, BottomNav } from '@/components/argon/NavBar'

const NAV_ITEMS = [
  { href: '/admin',           label: 'Panel',     icon: '📊' },
  { href: '/admin/clientes',  label: 'Clientes',  icon: '👥' },
  { href: '/admin/agentes',   label: 'Agentes',   icon: '🏢' },
  { href: '/admin/usuarios',  label: 'Usuarios',  icon: '🔐' },
  { href: '/admin/reportes',  label: 'Reportes',  icon: '📈' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null)

  useEffect(() => {
    async function check() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('full_name, role').eq('id', authUser.id).single()
      if (!data || data.role !== 'admin') { router.replace('/dashboard'); return }
      setUser(data)
    }
    check()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--muted)' }}>Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar userName={user.full_name} role={user.role} onSignOut={signOut} />
      <main className="pb-24 max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
