/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsForm } from '@/components/admin/settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('site_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  return (
    <div>
      <h1>全站自定义</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '.82rem', marginBottom: 20 }}>
        修改首页 Hero 标题和关于区域文字，对全站访问者生效。
      </p>
      <SettingsForm settings={data} />
    </div>
  )
}
