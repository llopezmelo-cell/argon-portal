'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(data)
      setLoading(false)

      // Redirigir según rol
      if (data?.role === 'admin') router.replace('/admin')
      else if (data?.role === 'agente' || data?.role === 'coordinador') router.replace('/agente')
      else if (data?.role === 'asegurado') router.replace('/asegurado')
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
             style={{ background: 'var(--primary)' }}>
          <span className="text-white font-black text-lg">AR</span>
        </div>
        <p style={{ color: 'var(--muted)' }}>Cargando...</p>
      </div>
    </div>
  )

  return null
}
