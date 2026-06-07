export type UserRole = 'admin' | 'coordinador' | 'agente' | 'asegurado'

export type UserStatus = 'activo' | 'bloqueado' | 'pendiente' | 'suspendido'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus
  company_id?: string       // para agentes — compañía asignada
  client_id?: string        // para asegurados — cliente vinculado
  avatar_url?: string
  phone?: string
  failed_attempts: number
  locked_at?: string
  last_login_at?: string
  created_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  logo_url?: string
  brand_color: string
  assistance_phone?: string
  website?: string
  agent_user_id?: string    // agente asignado
  created_at: string
}

export interface Client {
  id: string
  full_name: string
  dni: string
  birth_date: string        // para cumpleaños
  phone: string
  email: string
  address?: string
  created_at: string
}

export interface Risk {
  id: string
  client_id: string
  company_id: string
  display_name: string      // "Etios", "Casa Olivos", etc.
  category: 'auto' | 'hogar' | 'vida' | 'ahorro' | 'art' | 'comercio'
  policy_number: string
  coverage: string
  premium_cents: number
  currency: 'ARS' | 'USD'
  starts_at: string
  expires_at: string
  status: 'activo' | 'vencido' | 'cancelado'
  // Para vehículos
  plate?: string
  brand?: string
  model?: string
  year?: number
  vin?: string
  created_at: string
}

export interface Document {
  id: string
  risk_id: string
  client_id: string
  company_id: string
  type: 'poliza' | 'circulacion' | 'mercosur' | 'cuota' | 'cedula' | 'otro'
  display_name: string      // "Póliza Etios 6-26"
  period: string            // "2026-06"
  year: number
  file_url: string          // URL en Supabase Storage
  onedrive_url?: string     // URL en OneDrive (link anónimo)
  onedrive_path?: string    // ruta en OneDrive
  file_size?: number
  mime_type: string
  uploaded_by: string       // user_id del agente
  created_at: string
}

export interface Payment {
  id: string
  risk_id: string
  client_id: string
  company_id: string
  period: string            // "2026-06"
  amount_cents: number
  currency: 'ARS' | 'USD'
  due_date: string
  paid_at?: string
  status: 'pendiente' | 'pagado' | 'vencido'
  method?: string
  notes?: string
  created_at: string
}

export interface Alert {
  id: string
  user_id: string
  type: 'vencimiento' | 'pago_pendiente' | 'pago_vencido' | 'documento_nuevo' | 'cumpleanos' | 'sistema'
  title: string
  body: string
  ref_id?: string
  read_at?: string
  sent_push: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string            // 'auth.login', 'doc.upload', 'user.unlock', etc.
  ip?: string
  user_agent?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface BiometricCredential {
  id: string
  user_id: string
  credential_id: string     // WebAuthn credential ID
  public_key: string
  device_name?: string
  created_at: string
}
