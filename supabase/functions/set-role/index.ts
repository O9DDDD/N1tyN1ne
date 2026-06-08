// Supabase Edge Function: set-role
// 部署: supabase functions deploy set-role --project-ref fjybxoqfatxtgydltvuw
//
// 仅 admin 可调用。接收 { targetUserId, role } 更新用户角色。
// 更新 profiles.role → 触发 sync_role_to_app_metadata → JWT 即时生效。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  targetUserId: string
  role: 'admin' | 'user'
}

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 用调用者的 JWT 验证身份
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const callerRole = user.app_metadata?.role as string | undefined
    if (callerRole !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId, role }: RequestBody = await req.json()
    if (!targetUserId || !role) {
      return new Response(
        JSON.stringify({ error: 'targetUserId and role required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (!['admin', 'user'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 用 service_role 更新 profile + app_metadata
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. 更新 profiles.role（触发器自动同步 app_metadata）
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', targetUserId)

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. 显式调用 auth.admin 更新 app_metadata（确保 JWT 即时刷新）
    const { error: metaError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { app_metadata: { role } }
    )

    if (metaError) {
      return new Response(JSON.stringify({ error: metaError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
