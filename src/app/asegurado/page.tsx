'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RiesgoConDocs {
  id: string
  display_name: string
  category: string
  policy_number: string
  coverage: string
  expires_at: string
  status: string
  plate?: string
  brand?: string
  model?: string
  company: { name: string; brand_color: string; assistance_phone?: string }
  documents: { id: string; type: string; display_name: string; period: string; year: number; file_url: string }[]
  isExpanded: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  auto: '🚗', hogar: '🏠', vida: '❤️', ahorro: '📈', art: '🦺', comercio: '🏪'
}

export default function AseguradoHome() {
  const supabase = createClient()
  const [clientId, setClientId] = useState<string | null>(null)
  const [riesgos, setRiesgos] = useState<RiesgoConDocs[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users').select('client_id').eq('id', user.id).single()

      if (!userData?.client_id) { setLoading(false); return }
      setClientId(userData.client_id)

      const { data: risksData } = await supabase
        .from('risks')
        .select(`
          id, display_name, category, policy_number, coverage,
          expires_at, status, plate, brand, model,
          companies(name, brand_color, assistance_phone),
          documents(id, type, display_name, period, year, file_url)
        `)
        .eq('client_id', userData.client_id)
        .order('display_name')

      const formatted: RiesgoConDocs[] = (risksData || []).map((r: any) => ({
        ...r,
        company: r.companies || { name: '-', brand_color: '#003D5C' },
        documents: (r.documents || []).sort((a: any, b: any) => b.year - a.year || b.period.localeCompare(a.period)),
        isExpanded: false,
      }))

      setRiesgos(formatted)
      setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
      setLoading(false)
    }
    load()
  }, [])

  function toggleRiesgo(id: string) {
    setRiesgos(prev => prev.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r))
  }

  function diasVencimiento(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  async function handleSync() {
    setLoading(true)
    // Forzar recarga desde server
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase.from('users').select('client_id').eq('id', user.id).single()
      if (userData?.client_id) {
        const { data } = await supabase
          .from('risks')
          .select(`id, display_name, category, policy_number, coverage, expires_at, status, plate, brand, model, companies(name, brand_color, assistance_phone), documents(id, type, display_name, period, year, file_url)`)
          .eq('client_id', userData.client_id).order('display_name')
        setRiesgos((data || []).map((r: any) => ({ ...r, company: r.companies || {}, documents: (r.documents || []).sort((a: any, b: any) => b.year - a.year), isExpanded: false })))
      }
    }
    setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Mis pólizas</h1>
        <button onClick={handleSync} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: 'var(--accent)', background: 'rgba(43,168,196,0.1)' }}>
          🔄 Actualizar
        </button>
      </div>

      {/* Estado de conexión */}
      <div className="flex items-center gap-2 text-xs" style={{ color: offline ? 'var(--alert)' : 'var(--success)' }}>
        <span>{offline ? '📵 Sin conexión' : '🟢 Conectado'}</span>
        {lastSync && <span style={{ color: 'var(--muted)' }}>· Actualizado a las {lastSync}</span>}
      </div>

      {riesgos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🛡️</p>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No tenés pólizas cargadas</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Tu agente ARGon los agregará pronto</p>
        </div>
      ) : riesgos.map(r => {
        const dias = diasVencimiento(r.expires_at)
        const venceProximo = dias <= 30 && dias > 0
        const vencido = dias <= 0

        return (
          <div key={r.id} className="card overflow-hidden p-0">
            {/* Header del riesgo */}
            <button
              className="w-full p-4 text-left flex items-center gap-3"
              onClick={() => toggleRiesgo(r.id)}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: r.company.brand_color || 'var(--primary)' }}>
                <span className="text-lg">{CATEGORY_ICONS[r.category] || '🛡️'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{r.display_name}</p>
                  {vencido && <span className="badge badge-danger">Vencida</span>}
                  {venceProximo && <span className="badge badge-alert">Vence en {dias}d</span>}
                  {!vencido && !venceProximo && <span className="badge badge-success">Vigente</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {r.company.name} · {r.coverage}
                </p>
                {r.plate && <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--accent)' }}>{r.plate}</p>}
              </div>
              <span className="text-lg transition-transform" style={{ transform: r.isExpanded ? 'rotate(180deg)' : 'none' }}>
                ⌄
              </span>
            </button>

            {/* Documentos expandidos */}
            {r.isExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
                  Documentos ({r.documents.length})
                </p>

                {r.documents.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay documentos disponibles aún</p>
                ) : r.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: 'var(--surface)' }}>
                    <span className="text-xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{doc.display_name}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{doc.period}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          // file_url puede ser ruta de storage o URL directa
                          let url = doc.file_url
                          if (!url.startsWith('http')) {
                            const { data } = await supabase.storage.from('documents').createSignedUrl(url, 3600)
                            url = data?.signedUrl || url
                          }
                          window.open(url, '_blank')
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ background: 'var(--primary)' }}
                      >
                        Ver
                      </button>
                      <button
                        onClick={async () => {
                          let url = doc.file_url
                          if (!url.startsWith('http')) {
                            const { data } = await supabase.storage.from('documents').createSignedUrl(url, 3600)
                            url = data?.signedUrl || url
                          }
                          if (navigator.share) {
                            navigator.share({ title: doc.display_name, url })
                          } else {
                            navigator.clipboard.writeText(url)
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                      >
                        📤
                      </button>
                    </div>
                  </div>
                ))}

                {/* Asistencia de la compañía */}
                {r.company.assistance_phone && (
                  <a
                    href={`tel:${r.company.assistance_phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl mt-2"
                    style={{ background: 'rgba(214,58,47,0.08)', border: '1px solid rgba(214,58,47,0.15)' }}
                  >
                    <span className="text-xl">🆘</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                        Asistencia {r.company.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.company.assistance_phone} · Llamar</p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Contacto ARGon */}
      <div className="card" style={{ background: 'var(--primary)' }}>
        <p className="text-white font-semibold text-sm">Tu productor ARGon Broker</p>
        <p className="text-white text-xs opacity-70 mt-0.5">Cuando más lo necesitás, hay alguien que te Asiste</p>
        <div className="flex gap-3 mt-3">
          <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer"
             className="flex-1 py-2 rounded-xl text-center text-sm font-semibold"
             style={{ background: '#25D366', color: 'white' }}>
            💬 WhatsApp
          </a>
          <a href="tel:+5491100000000"
             className="flex-1 py-2 rounded-xl text-center text-sm font-semibold"
             style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            📞 Llamar
          </a>
        </div>
      </div>
    </div>
  )
}
