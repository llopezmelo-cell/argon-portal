'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Client, Risk } from '@/lib/types'

type DocType = 'poliza' | 'circulacion' | 'mercosur' | 'cuota' | 'cedula' | 'otro'

const DOC_TYPES: { value: DocType; label: string; icon: string }[] = [
  { value: 'poliza',     label: 'Póliza',         icon: '📋' },
  { value: 'circulacion',label: 'Circulación',    icon: '🚗' },
  { value: 'mercosur',   label: 'Mercosur',       icon: '🌎' },
  { value: 'cuota',      label: 'Cuota/Recibo',   icon: '💰' },
  { value: 'cedula',     label: 'Cédula verde',   icon: '📇' },
  { value: 'otro',       label: 'Otro',           icon: '📄' },
]

export default function SubirDocumentoPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientes, setClientes] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [riesgos, setRiesgos] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [riesgoId, setRiesgoId] = useState('')
  const [docType, setDocType] = useState<DocType>('poliza')
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Cargar clientes de la compañía del agente
  useEffect(() => {
    async function loadClientes() {
      const { data: authUser } = await supabase.auth.getUser()
      if (!authUser.user) return

      const { data: userData } = await supabase
        .from('users').select('company_id, role').eq('id', authUser.user.id).single()

      let query = supabase.from('clients').select('id, full_name, dni').order('full_name')

      // Admin/coordinador ven todos; agente solo los de su compañía
      if (userData?.role === 'agente' && userData.company_id) {
        const { data: riskClients } = await supabase
          .from('risks').select('client_id').eq('company_id', userData.company_id)
        const ids = [...new Set((riskClients || []).map((r: any) => r.client_id))]
        if (ids.length > 0) query = query.in('id', ids)
      }

      const { data } = await query
      setClientes(data || [])
    }
    loadClientes()
  }, [])

  // Cargar riesgos del cliente seleccionado
  useEffect(() => {
    if (!clienteId) { setRiesgos([]); setRiesgoId(''); return }
    async function loadRiesgos() {
      const { data } = await supabase
        .from('risks')
        .select('id, display_name, category, policy_number, companies(name)')
        .eq('client_id', clienteId)
        .order('display_name')
      setRiesgos(data || [])
      setRiesgoId('')
    }
    loadRiesgos()
  }, [clienteId])

  // Auto-generar nombre del documento
  useEffect(() => {
    if (!riesgoId || !docType) return
    const riesgo = riesgos.find(r => r.id === riesgoId)
    if (!riesgo) return
    const mes = periodo.split('-')[1]
    const anio = periodo.split('-')[0].slice(-2)
    const tipoLabel = DOC_TYPES.find(d => d.value === docType)?.label || docType
    setDisplayName(`${tipoLabel} ${riesgo.display_name} ${mes}-${anio}`)
  }, [riesgoId, docType, periodo])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !riesgoId || !clienteId) return
    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const riesgo = riesgos.find(r => r.id === riesgoId) as any
      const year = parseInt(periodo.split('-')[0])
      const ext = file.name.split('.').pop()
      const path = `${clienteId}/${riesgoId}/${year}/${docType}_${Date.now()}.${ext}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Obtener URL pública (privada con signed URL)
      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 año

      // Guardar metadata en DB
      const { data: authUser } = await supabase.auth.getUser()
      const { error: dbError } = await supabase.from('documents').insert({
        risk_id: riesgoId,
        client_id: clienteId,
        company_id: riesgo?.companies?.id || riesgo?.company_id,
        type: docType,
        display_name: displayName,
        period: periodo,
        year,
        file_url: signedData?.signedUrl || '',
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: authUser.user?.id,
      })

      if (dbError) throw dbError

      // Crear alerta para el asegurado
      const { data: clientUser } = await supabase
        .from('users').select('id').eq('client_id', clienteId).single()

      if (clientUser) {
        await supabase.from('alerts').insert({
          user_id: clientUser.id,
          type: 'documento_nuevo',
          title: '📄 Nuevo documento disponible',
          body: `Tu ${DOC_TYPES.find(d => d.value === docType)?.label} de ${riesgo?.display_name} ya está disponible.`,
          ref_id: riesgoId,
        })
      }

      setSuccess(`✅ "${displayName}" subido correctamente`)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Subir documento</h1>

      <form onSubmit={handleUpload} className="space-y-4">

        {/* Cliente */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
            Cliente *
          </label>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border text-base outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">Seleccioná un cliente...</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        {/* Riesgo */}
        {clienteId && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
              Riesgo / Póliza *
            </label>
            {riesgos.length === 0 ? (
              <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                No hay riesgos para este cliente.
                <a href="/agente/clientes" className="ml-1 font-semibold" style={{ color: 'var(--accent)' }}>Crear uno →</a>
              </div>
            ) : (
              <select
                value={riesgoId}
                onChange={e => setRiesgoId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-base outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">Seleccioná un riesgo...</option>
                {riesgos.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name} · {r.companies?.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Tipo de documento */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
            Tipo de documento *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(dt => (
              <button
                key={dt.value}
                type="button"
                onClick={() => setDocType(dt.value)}
                className="p-3 rounded-xl text-center transition-all"
                style={{
                  background: docType === dt.value ? 'var(--primary)' : 'var(--surface)',
                  color: docType === dt.value ? 'white' : 'var(--text)',
                  border: `2px solid ${docType === dt.value ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <div className="text-xl">{dt.icon}</div>
                <div className="text-xs font-medium mt-1">{dt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Período */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
            Período (mes-año) *
          </label>
          <input
            type="month"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border text-base outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>

        {/* Nombre del documento */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
            Nombre del documento
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Ej: Póliza Etios 6-26"
            className="w-full px-4 py-3 rounded-xl border text-base outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Se genera automáticamente, podés editarlo</p>
        </div>

        {/* Archivo */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
            Archivo PDF *
          </label>
          <div
            className="w-full p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all"
            style={{
              borderColor: file ? 'var(--success)' : 'var(--border)',
              background: file ? 'rgba(31,159,92,0.05)' : 'var(--bg)',
            }}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div>
                <p className="text-2xl">✅</p>
                <p className="text-sm font-medium mt-1" style={{ color: 'var(--success)' }}>{file.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-3xl">📎</p>
                <p className="text-sm font-medium mt-2" style={{ color: 'var(--text)' }}>Tocá para seleccionar</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>PDF, JPG o PNG · máx 20MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        {error && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(214,58,47,0.1)', color: 'var(--danger)' }}>{error}</p>}
        {success && <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(31,159,92,0.1)', color: 'var(--success)' }}>{success}</p>}

        <button
          type="submit"
          disabled={uploading || !file || !riesgoId}
          className="w-full py-4 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-40"
          style={{ background: 'var(--primary)' }}
        >
          {uploading ? '⬆️ Subiendo...' : '📤 Subir documento'}
        </button>
      </form>
    </div>
  )
}
