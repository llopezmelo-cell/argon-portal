'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  full_name: string
  email: string
  phone?: string
}

export default function YoPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [lastSync, setLastSync] = useState('—')

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data } = await supabase.from('users').select('full_name').eq('id', authUser.id).single()
      setUser({ full_name: data?.full_name || authUser.user_metadata?.full_name || 'Usuario', email: authUser.email || '' })
      setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = user?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'YO'

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>{user?.full_name || '...'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      {/* ARGon info */}
      <div style={{ margin: '16px 16px 0', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 28 }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>ARGon Broker de seguros</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Tu productor · San Luis</div>
        </div>
      </div>

      {/* Offline highlight */}
      <div className="sec-h"><div className="ttl">Sincronización</div></div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a15 15 0 015.5-3.6M15 5a15 15 0 016 4M8 12a10 10 0 016-2M3 3l18 18"/><circle cx="12" cy="19" r="0.7" fill="currentColor"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Todo disponible sin conexión</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.45 }}>
              Tus pólizas y certificados quedan en el dispositivo. Se actualizan cuando tenés conexión.
            </div>
          </div>
        </div>
        <div className="card">
          <div className="kv-row"><div className="k">Estado</div><div className="v" style={{ color: 'var(--success)' }}>✓ Al día</div></div>
          <div className="kv-row"><div className="k">Última sincronización</div><div className="v">Hoy, {lastSync}</div></div>
          <div className="kv-row"><div className="k">Actualización automática</div><div className="v">Diaria</div></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a15 15 0 0118 0M6 12.5a10 10 0 0112 0M9 16a5 5 0 016 0"/><circle cx="12" cy="19" r="0.7" fill="currentColor"/></svg>
            Sincronizar ahora
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="sec-h"><div className="ttl">Cuenta</div></div>
      <div style={{ padding: '0 16px' }}>
        <div className="card">
          {[
            { icon: '🔔', label: 'Notificaciones' },
            { icon: '🔒', label: 'Seguridad y biometría' },
            { icon: '👤', label: 'Datos personales' },
            { icon: '🛡️', label: 'Privacidad' },
          ].map(item => (
            <div key={item.label} className="kv-row" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{item.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{item.label}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Contactar ARGon */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--accent)))', borderRadius: 18, padding: '16px 16px 18px', color: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>Tu productor</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>ARGon Broker</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>Hablanos por WhatsApp para asesoramiento, consultas o denuncias.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            <a href="https://wa.me/5492664627261" target="_blank" rel="noopener noreferrer"
               style={{ padding: '11px', borderRadius: 11, background: '#25D366', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
              WhatsApp
            </a>
            <a href="tel:+5492664627261"
               style={{ padding: '11px', borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h3l2 5-3 2c1.5 3 4 5.5 7 7l2-3 5 2v3a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z"/></svg>
              Llamar
            </a>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: '16px 16px 30px' }}>
        <button onClick={signOut} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
