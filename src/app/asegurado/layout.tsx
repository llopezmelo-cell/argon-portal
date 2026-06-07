'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TopBar, BottomNav } from '@/components/argon/NavBar'

const NAV_ITEMS = [
  { href: '/asegurado',            label: 'Mis pólizas', icon: '🛡️' },
  { href: '/asegurado/alertas',    label: 'Alertas',     icon: '🔔' },
  { href: '/asegurado/emergencia', label: 'Emergencia',  icon: '🆘', danger: true },
]

export default function AseguradoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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
      <main className="pb-24 max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
