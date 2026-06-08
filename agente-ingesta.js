/**
 * AGENTE DE INGESTA — ARGon Broker
 * Lee la carpeta OneDrive CLIENTES y carga todo en Supabase:
 * - Crea clientes, riesgos y documentos
 * - Sube PDFs al bucket 'documents' de Supabase Storage
 * - Idempotente: correr N veces no duplica nada
 *
 * Uso:
 *   node agente-ingesta.js              → todos los clientes
 *   node agente-ingesta.js "LUIS"       → solo la carpeta LUIS
 *   node agente-ingesta.js "LUIS" --dry → dry-run (no escribe nada)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// ─── Config ─────────────────────────────────────────────────────────────────

const CLIENTES_DIR = 'C:\\Users\\Luis\\OneDrive\\Favoritos\\CLIENTES'
const SUPABASE_URL = 'https://mveivwlzzmtclgfcwtxr.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWl2d2x6em10Y2xnZmN3dHhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc3ODUyMywiZXhwIjoyMDk2MzU0NTIzfQ.pNB4Tf9bv_4u_589Xrx-v-fKei2M5F6izsoSFryzcOc'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Argumento CLI: filtro de cliente y dry-run
const filtroCliente = process.argv[2]?.replace(/^--.*/, '') || null
const DRY_RUN = process.argv.includes('--dry')

if (DRY_RUN) console.log('🔍 DRY-RUN — no se escribirá nada en Supabase\n')
if (filtroCliente) console.log(`👤 Filtrando solo: "${filtroCliente}"\n`)

// ─── Compañías predeterminadas ───────────────────────────────────────────────

const COMPANIAS = {
  'fedpat':    { name: 'Federación Patronal', slug: 'fedpat',    color: '#1B4F8A', phone: '0810-555-3337' },
  'provincia': { name: 'Provincia Seguros',   slug: 'provincia', color: '#003082', phone: '0800-222-6262' },
  'sancor':    { name: 'Sancor Seguros',      slug: 'sancor',    color: '#E30613', phone: '0800-333-7262' },
  'allianz':   { name: 'Allianz Argentina',   slug: 'allianz',   color: '#003781', phone: '0800-122-5544' },
  'zurich':    { name: 'Zurich Argentina',    slug: 'zurich',    color: '#1B92D0', phone: '0800-333-9874' },
  'smg':       { name: 'SMG Seguros',         slug: 'smg',       color: '#FF6600', phone: '0810-333-0764' },
  'hdi':       { name: 'HDI Seguros',         slug: 'hdi',       color: '#007FC1', phone: '0800-555-0434' },
  'lacaja':    { name: 'La Caja Seguros',     slug: 'lacaja',    color: '#E30613', phone: '0800-777-5252' },
  'rivadavia': { name: 'Rivadavia Seguros',   slug: 'rivadavia', color: '#004A99', phone: '0800-999-7482' },
  'galicia':   { name: 'Galicia Seguros',     slug: 'galicia',   color: '#E30613', phone: '0800-777-5252' },
  'generic':   { name: 'ARGon Broker',        slug: 'generic',   color: '#003D5C', phone: '' },
}

// ─── Clasificación de archivos ───────────────────────────────────────────────

const ANIOS_VIGENTES = [2025, 2026]
const ANIO_RANGE = { min: 2015, max: 2030 }

function esAnio(nombre) {
  const n = parseInt(nombre)
  return !isNaN(n) && n >= ANIO_RANGE.min && n <= ANIO_RANGE.max
}

function clasificarArchivo(nombre) {
  const n = nombre.toLowerCase()
  // Excluidos
  const excluidos = ['.lnk', 'dni ', 'domicilio', 'constancia afip', 'constancia suss',
    'poder ', 'denuncia', 'foto ', 'presupuesto', 'baja ', 'siniestro', 'informe']
  if (excluidos.some(x => n.includes(x))) return null

  const ext = path.extname(nombre).toLowerCase()
  if (!['.pdf', '.xlsx', '.docx', '.jpg', '.jpeg', '.png'].includes(ext)) return null

  // Tipo
  if (/p[oó]liza|pza\b|poliza/.test(n))       return 'poliza'
  if (/circulac/.test(n))                       return 'circulacion'
  if (/mercosur|conosur|cono\s*sur/.test(n))   return 'mercosur'
  if (/factura|fc\b|recibo|cuota|pago/.test(n)) return 'cuota'
  if (/cert\b|certif|credencial|cobertura/.test(n)) return 'poliza'
  if (/endoso/.test(n))                          return 'poliza'
  if (['.pdf', '.xlsx', '.docx'].includes(ext)) return 'otro'
  return null
}

function detectarCompania(nombre) {
  const n = nombre.toLowerCase()
  if (/fedpat|federac/.test(n))   return 'fedpat'
  if (/provincia/.test(n))        return 'provincia'
  if (/sancor/.test(n))           return 'sancor'
  if (/allianz/.test(n))          return 'allianz'
  if (/zurich/.test(n))           return 'zurich'
  if (/smg/.test(n))              return 'smg'
  if (/hdi/.test(n))              return 'hdi'
  if (/la.?caja/.test(n))         return 'lacaja'
  if (/rivadavia/.test(n))        return 'rivadavia'
  if (/galicia/.test(n))          return 'galicia'
  return 'generic'
}

function detectarCategoria(nombreRiesgo) {
  const n = nombreRiesgo.toLowerCase()
  if (/comb.?fam|hogar|casa|dpto|departamento|trole/.test(n)) return 'hogar'
  if (/rc.?prof|responsab/.test(n)) return 'comercio'
  if (/art\b/.test(n))               return 'art'
  if (/vida|retiro|ahorro/.test(n))  return 'vida'
  // Por defecto: auto
  return 'auto'
}

function extraerPeriodo(nombre) {
  // Busca patrón MM-YY o MM-YYYY en el nombre
  const match = nombre.match(/(\d{1,2})[.-](\d{2,4})/)
  if (match) {
    const mes = match[1].padStart(2, '0')
    const anio = match[2].length === 2 ? '20' + match[2] : match[2]
    return `${mes}-${anio}`
  }
  return null
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

let companiaCache = {}

async function upsertCompania(slug) {
  if (companiaCache[slug]) return companiaCache[slug]
  const c = COMPANIAS[slug] || COMPANIAS.generic

  if (!DRY_RUN) {
    const { data } = await supabase.from('companies')
      .upsert({ name: c.name, slug: c.slug, brand_color: c.color, assistance_phone: c.phone },
               { onConflict: 'slug' })
      .select('id').single()
    if (data) { companiaCache[slug] = data.id; return data.id }

    const { data: existing } = await supabase.from('companies').select('id').eq('slug', slug).single()
    companiaCache[slug] = existing?.id
    return existing?.id
  } else {
    return `dry-${slug}`
  }
}

async function upsertCliente(fullName) {
  if (DRY_RUN) return `dry-cliente-${fullName}`

  // Buscar por nombre exacto (DNI no disponible en carpetas)
  const { data: existing } = await supabase.from('clients')
    .select('id').ilike('full_name', fullName).maybeSingle()

  if (existing) return existing.id

  const { data } = await supabase.from('clients')
    .insert({ full_name: fullName, dni: `CARPETA_${fullName.replace(/\s+/g,'_')}` })
    .select('id').single()

  return data?.id
}

async function upsertRiesgo(clienteId, companiaId, displayName, categoria, year) {
  if (DRY_RUN) return `dry-riesgo-${displayName}`

  const { data: existing } = await supabase.from('risks')
    .select('id')
    .eq('client_id', clienteId)
    .eq('display_name', displayName)
    .maybeSingle()

  if (existing) return existing.id

  const { data } = await supabase.from('risks').insert({
    client_id:    clienteId,
    company_id:   companiaId,
    display_name: displayName,
    category:     categoria,
    policy_number: `ONEDRIVE_${clienteId}_${displayName.replace(/\s+/g,'_')}`,
    status:       ANIOS_VIGENTES.includes(year) ? 'activo' : 'vencido',
  }).select('id').single()

  return data?.id
}

function sanitizarPath(str) {
  // Reemplazar caracteres con tilde letra a letra (compatible con todos los entornos)
  const mapa = { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n',
                 'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U','Ñ':'N' }
  return str
    .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, c => mapa[c] || c)
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '')
}

async function subirPDF(filePath, clienteId, riesgoId, tipo, anio) {
  const fileName = path.basename(filePath)
  const fileNameSafe = sanitizarPath(fileName)
  const storagePath = `clientes/${clienteId}/${riesgoId}/${anio}/${fileNameSafe}`

  // Verificar si ya existe
  const { data: existing } = await supabase.from('documents')
    .select('id').eq('onedrive_path', filePath).maybeSingle()

  if (existing) return { id: existing.id, path: storagePath, nuevo: false }

  if (!DRY_RUN) {
    // Subir archivo
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(fileName).toLowerCase()
    const mime = ext === '.pdf' ? 'application/pdf'
      : ext === '.xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : `image/${ext.slice(1)}`

    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('documents').upload(storagePath, buffer, { contentType: mime, upsert: true })

    if (uploadError) {
      console.warn(`    ⚠️  Error subiendo ${fileName}: ${uploadError.message}`)
      return null
    }

    // Obtener URL pública (signed URL no disponible sin user session — usamos path)
    return { path: storagePath, nuevo: true }
  }

  return { path: storagePath, nuevo: true }
}

async function upsertDocumento(riesgoId, clienteId, companiaId, tipo, displayName, period, year, filePath, storagePath) {
  if (DRY_RUN) return

  const fileSize = fs.statSync(filePath).size
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.pdf' ? 'application/pdf' : ext === '.xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : `image/${ext.slice(1)}`

  // Verificar si ya existe antes de insertar (onedrive_path no tiene unique constraint en BD)
  const { data: docExist } = await supabase.from('documents')
    .select('id').eq('onedrive_path', filePath).maybeSingle()
  if (docExist) {
    await supabase.from('documents').update({ file_url: storagePath }).eq('id', docExist.id)
    return
  }
  await supabase.from('documents').insert({
    risk_id:      riesgoId,
    client_id:    clienteId,
    company_id:   companiaId,
    type:         tipo,
    display_name: displayName,
    period:       period || `${year}`,
    year:         year,
    file_url:     storagePath,
    onedrive_path: filePath,
    file_size:    fileSize,
    mime_type:    mime,
  })
}

// ─── Procesamiento de carpetas ───────────────────────────────────────────────

async function procesarArchivo(filePath, clienteId, riesgoId, companiaId, categoria, anio) {
  const nombre = path.basename(filePath)
  const tipo = clasificarArchivo(nombre)
  if (!tipo) return { skip: true }

  const period = extraerPeriodo(nombre) || `${anio}`
  const displayName = nombre.replace(/\.[^.]+$/, '') // sin extensión

  console.log(`    📄 ${nombre} → [${tipo}] ${period}`)

  const uploaded = await subirPDF(filePath, clienteId, riesgoId, tipo, anio)
  if (!uploaded) return { error: true }

  await upsertDocumento(riesgoId, clienteId, companiaId, tipo, displayName, period, anio, filePath, uploaded.path)

  return { ok: true, nuevo: uploaded.nuevo }
}

async function procesarRiesgo(riesgoDir, clienteId, clienteNombre) {
  const nombreRiesgo = path.basename(riesgoDir)
  const categoria = detectarCategoria(nombreRiesgo)

  // Detectar compañía mirando los archivos
  const todosLosArchivos = obtenerArchivosPDF(riesgoDir)
  const slugCompania = todosLosArchivos.reduce((acc, f) => {
    const detected = detectarCompania(path.basename(f))
    return detected !== 'generic' ? detected : acc
  }, 'generic')

  const companiaId = await upsertCompania(slugCompania)

  console.log(`  📂 ${nombreRiesgo} [${categoria}] — ${COMPANIAS[slugCompania]?.name || 'ARGon'}`)

  let stats = { archivos: 0, nuevos: 0, skip: 0 }

  // Procesar por año (subcarpetas)
  const items = fs.readdirSync(riesgoDir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(riesgoDir, item.name)

    if (item.isDirectory() && esAnio(item.name)) {
      const anio = parseInt(item.name)
      const riesgoId = await upsertRiesgo(clienteId, companiaId, `${clienteNombre} — ${nombreRiesgo}`, categoria, anio)

      const archivosEnAnio = fs.readdirSync(fullPath)
        .filter(f => !fs.statSync(path.join(fullPath, f)).isDirectory())
        .map(f => path.join(fullPath, f))

      for (const archivo of archivosEnAnio) {
        const r = await procesarArchivo(archivo, clienteId, riesgoId, companiaId, categoria, anio)
        if (r.skip) stats.skip++
        else if (r.ok) { stats.archivos++; if (r.nuevo) stats.nuevos++ }
      }
    }
    // Archivos directamente en la carpeta del riesgo (sin subcarpeta de año)
    else if (item.isFile()) {
      const anioActual = new Date().getFullYear()
      const riesgoId = await upsertRiesgo(clienteId, companiaId, `${clienteNombre} — ${nombreRiesgo}`, categoria, anioActual)
      const r = await procesarArchivo(fullPath, clienteId, riesgoId, companiaId, categoria, anioActual)
      if (r.skip) stats.skip++
      else if (r.ok) { stats.archivos++; if (r.nuevo) stats.nuevos++ }
    }
  }

  return stats
}

function obtenerArchivosPDF(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(f => f.isFile())
    .map(f => path.join(dir, f.name))
}

async function procesarCliente(clienteDir) {
  const nombreCliente = path.basename(clienteDir)
  console.log(`\n👤 CLIENTE: ${nombreCliente}`)

  const clienteId = await upsertCliente(nombreCliente)

  const subcarpetas = fs.readdirSync(clienteDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !['SINIESTROS', 'FLOTA', 'Documentos', 'Siniestro', 'SINIESTRO'].includes(d.name))
    .map(d => path.join(clienteDir, d.name))

  let totalStats = { archivos: 0, nuevos: 0 }

  for (const riesgoDir of subcarpetas) {
    // Ignorar subcarpetas que no son riesgos (carpetas de año directas en raíz del cliente)
    if (esAnio(path.basename(riesgoDir))) continue

    const stats = await procesarRiesgo(riesgoDir, clienteId, nombreCliente)
    totalStats.archivos += stats.archivos
    totalStats.nuevos += stats.nuevos
  }

  console.log(`  ✅ ${totalStats.archivos} archivos procesados (${totalStats.nuevos} nuevos en Supabase)`)
  return totalStats
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 AGENTE DE INGESTA — ARGon Broker\n')
  console.log(`📁 Carpeta CLIENTES: ${CLIENTES_DIR}`)
  console.log(`🔗 Supabase: ${SUPABASE_URL}\n`)

  if (!fs.existsSync(CLIENTES_DIR)) {
    console.error(`❌ No se encontró la carpeta: ${CLIENTES_DIR}`)
    process.exit(1)
  }

  // Pre-cargar compañías
  for (const [slug] of Object.entries(COMPANIAS)) {
    await upsertCompania(slug)
  }

  const carpetasClientes = fs.readdirSync(CLIENTES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(CLIENTES_DIR, d.name))
    .filter(d => !filtroCliente || path.basename(d).toUpperCase() === filtroCliente.toUpperCase())

  console.log(`📊 ${carpetasClientes.length} cliente(s) a procesar\n`)

  let totalArchivos = 0
  let totalNuevos = 0

  for (const clienteDir of carpetasClientes) {
    const stats = await procesarCliente(clienteDir)
    totalArchivos += stats.archivos
    totalNuevos += stats.nuevos
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`✅ COMPLETADO`)
  console.log(`   Total archivos procesados: ${totalArchivos}`)
  console.log(`   Nuevos en Supabase:        ${totalNuevos}`)
  if (DRY_RUN) console.log('   (DRY-RUN — nada fue escrito)')
  console.log('═══════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})
