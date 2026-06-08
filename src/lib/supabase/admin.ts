import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// ⚠️ 仅 Route Handler 可 import — service_role key 绕过 RLS
// ESLint 规则 (no-restricted-imports) 阻止其他文件引用此模块
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
