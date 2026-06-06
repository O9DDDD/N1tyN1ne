/* ─── Supabase REST API Client (no CDN dependency) ─── */
const SUPABASE_URL = 'https://fjybxoqfatxtgydltvuw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWJ4b3FmYXR4dGd5ZGx0dnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTU0OTUsImV4cCI6MjA5NjMzMTQ5NX0.RYrmm6wbfJASH8zMqOJgrZyVRSb_MT4b84pQtbDPLVo';

function apiHeaders(jwt) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${jwt || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

// ─── Auth ────────────────────────────────────────────
async function signUp(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const d = await r.json();
  if (r.status >= 400) throw new Error(d.msg || d.error_description || d.error || '注册失败');
  return d;
}

async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const d = await r.json();
  if (r.status >= 400) throw new Error(d.msg || d.error_description || d.error || '登录失败');
  // Store session
  localStorage.setItem('supabase_session', JSON.stringify(d));
  return d;
}

async function signOut() {
  const sess = getSession();
  if (sess) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${sess.access_token}` }
    });
  }
  localStorage.removeItem('supabase_session');
}

function getSession() {
  try { return JSON.parse(localStorage.getItem('supabase_session')); } catch { return null; }
}

function getUser() {
  const sess = getSession();
  return sess?.user || null;
}

function getJWT() {
  const sess = getSession();
  return sess?.access_token || null;
}

// ─── Database ─────────────────────────────────────────
async function dbSelect(table, opts = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  if (opts.eq) url += `&${opts.eq.col}=eq.${encodeURIComponent(opts.eq.val)}`;
  if (opts.order) url += `&order=${opts.order.col}.${opts.order.dir || 'desc'}`;
  if (opts.single) url += '&limit=1';
  const r = await fetch(url, { headers: apiHeaders(getJWT()) });
  const d = await r.json();
  if (r.status >= 400) throw new Error(d.message || '查询失败');
  return opts.single ? (d[0] || null) : d;
}

async function dbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: apiHeaders(getJWT()),
    body: JSON.stringify(data)
  });
  const d = await r.json();
  if (r.status >= 400) throw new Error(d.message || '插入失败');
  return d;
}

async function dbUpdate(table, data, eqCol, eqVal) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${eqCol}=eq.${encodeURIComponent(eqVal)}`, {
    method: 'PATCH',
    headers: apiHeaders(getJWT()),
    body: JSON.stringify(data)
  });
  if (r.status >= 400) { const d = await r.json(); throw new Error(d.message || '更新失败'); }
}

async function dbDelete(table, eqCol, eqVal) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${eqCol}=eq.${encodeURIComponent(eqVal)}`, {
    method: 'DELETE',
    headers: apiHeaders(getJWT())
  });
  if (r.status >= 400) { const d = await r.json(); throw new Error(d.message || '删除失败'); }
}

// ─── Storage ──────────────────────────────────────────
async function uploadFile(bucket, path, file) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${getJWT()}` },
    body: file
  });
  if (r.status >= 400) { const d = await r.json(); throw new Error(d.message || '上传失败'); }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function getFileUrl(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
