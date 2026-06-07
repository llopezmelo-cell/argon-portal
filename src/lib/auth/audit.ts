import type { SupabaseClient } from '@supabase/supabase-js'

interface AuditParams {
  user_id?: string
  action: string
  ip?: string
  user_agent?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(supabase: SupabaseClient, params: AuditParams) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: params.user_id,
      action: params.action,
      ip: params.ip,
      user_agent: params.user_agent,
      metadata: params.metadata,
    })
  } catch {
    // No interrumpir el flujo si falla el log
    console.error('[audit] failed to log:', params.action)
  }
}
