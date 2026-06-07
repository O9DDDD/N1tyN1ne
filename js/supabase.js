/* ─── Supabase REST API Client (encrypted session + auto-refresh) ─── */
const SUPABASE_URL = 'https://fjybxoqfatxtgydltvuw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWJ4b3FmYXR4dGd5ZGx0dnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTU0OTUsImV4cCI6MjA5NjMzMTQ5NX0.RYrmm6wbfJASH8zMqOJgrZyVRSb_MT4b84pQtbDPLVo';

// ─── AES-GCM encrypted session storage ─────────────────
let _cachedSession = null;
let _cryptoKey = null;

async function getCryptoKey() {
  if (_cryptoKey) return _cryptoKey;
  var fp = [
    navigator.userAgent,
    screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    navigator.language,
    navigator.platform || ''
  ].join('|');
  var hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fp));
  _cryptoKey = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return _cryptoKey;
}

async function encryptData(plaintext) {
  var key = await getCryptoKey();
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plaintext));
  var combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  var binary = '';
  for (var i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
  return btoa(binary);
}

async function decryptData(encoded) {
  var key = await getCryptoKey();
  var binary = atob(encoded);
  var combined = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i);
  var iv = combined.slice(0, 12);
  var ct = combined.slice(12);
  var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
  return new TextDecoder().decode(dec);
}

// Decrypt and load session from localStorage (call once on init)
async function initSession() {
  try {
    var raw = localStorage.getItem('supabase_session');
    if (!raw) return null;
    // Detect if it's encrypted (starts with JSON) or old plaintext
    var decrypted;
    if (raw.charAt(0) === '{') {
      // Old plaintext — migrate to encrypted
      _cachedSession = JSON.parse(raw);
      await saveSession(_cachedSession);
      return _cachedSession;
    }
    decrypted = await decryptData(raw);
    _cachedSession = JSON.parse(decrypted);
    return _cachedSession;
  } catch (e) {
    localStorage.removeItem('supabase_session');
    _cachedSession = null;
    return null;
  }
}

async function saveSession(session) {
  _cachedSession = session || null;
  if (session) {
    var encrypted = await encryptData(JSON.stringify(session));
    localStorage.setItem('supabase_session', encrypted);
  } else {
    localStorage.removeItem('supabase_session');
  }
}

function getJWTExpiry(jwt) {
  try {
    var payload = JSON.parse(atob(jwt.split('.')[1]));
    return payload.exp * 1000;
  } catch (e) { return 0; }
}

async function refreshSession() {
  if (!_cachedSession || !_cachedSession.refresh_token) return;
  try {
    var r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _cachedSession.refresh_token })
    });
    if (r.status >= 400) throw new Error('refresh failed');
    var d = await r.json();
    // Preserve user if not returned
    if (!d.user && _cachedSession.user) d.user = _cachedSession.user;
    await saveSession(d);
  } catch (e) {
    // Refresh failed — clear session
    await saveSession(null);
    throw e;
  }
}

// ─── Public session getters ─────────────────────────
function getSession() {
  return _cachedSession;
}

function getUser() {
  return _cachedSession ? _cachedSession.user : null;
}

async function getJWT() {
  if (!_cachedSession) return null;
  // Refresh if expiring within 60 seconds
  var exp = getJWTExpiry(_cachedSession.access_token);
  if (exp && exp < Date.now() + 60000) {
    try { await refreshSession(); } catch (e) {}
  }
  return _cachedSession ? _cachedSession.access_token : null;
}

// ─── API headers (jwt now passed after await) ───────
function apiHeaders(jwt) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + (jwt || SUPABASE_ANON_KEY),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

// ─── Auth ────────────────────────────────────────────
async function signUp(email, password) {
  var r = await fetch(SUPABASE_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
  });
  var d = await r.json();
  if (r.status >= 400) throw new Error(d.msg || d.error_description || d.error || '注册失败');
  return d;
}

async function signIn(email, password) {
  var r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
  });
  var d = await r.json();
  if (r.status >= 400) throw new Error(d.msg || d.error_description || d.error || '登录失败');
  await saveSession(d);
  return d;
}

async function signOut() {
  var sess = _cachedSession;
  if (sess) {
    try {
      await fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + sess.access_token }
      });
    } catch (e) {}
  }
  await saveSession(null);
}

// ─── Database ─────────────────────────────────────────
async function dbSelect(table, opts) {
  opts = opts || {};
  var select = opts.select || '*';
  var url = SUPABASE_URL + '/rest/v1/' + table + '?select=' + encodeURIComponent(select);
  if (opts.eq) url += '&' + opts.eq.col + '=eq.' + encodeURIComponent(opts.eq.val);
  if (opts.order) {
    if (typeof opts.order === 'string') {
      url += '&order=' + opts.order;
    } else {
      url += '&order=' + opts.order.col + '.' + (opts.order.dir || 'desc');
    }
  }
  if (opts.limit != null) url += '&limit=' + opts.limit;
  if (opts.offset != null) url += '&offset=' + opts.offset;
  if (opts.single) url += '&limit=1';
  var r = await fetch(url, { headers: apiHeaders(await getJWT()) });
  var d = await r.json();
  if (r.status >= 400) throw new Error(d.message || '查询失败');
  return opts.single ? (d[0] || null) : d;
}

async function dbInsert(table, data) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: apiHeaders(await getJWT()),
    body: JSON.stringify(data)
  });
  var d = await r.json();
  if (r.status >= 400) throw new Error(d.message || '插入失败');
  return d;
}

async function dbUpdate(table, data, eqCol, eqVal) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + eqCol + '=eq.' + encodeURIComponent(eqVal), {
    method: 'PATCH',
    headers: apiHeaders(await getJWT()),
    body: JSON.stringify(data)
  });
  if (r.status >= 400) { var d = await r.json(); throw new Error(d.message || '更新失败'); }
}

async function dbDelete(table, eqCol, eqVal) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + eqCol + '=eq.' + encodeURIComponent(eqVal), {
    method: 'DELETE',
    headers: apiHeaders(await getJWT())
  });
  if (r.status >= 400) { var d = await r.json(); throw new Error(d.message || '删除失败'); }
}

// ─── Storage ──────────────────────────────────────────
async function uploadFile(bucket, path, file) {
  var r = await fetch(SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + await getJWT() },
    body: file
  });
  if (r.status >= 400) { var d = await r.json(); throw new Error(d.message || d.error || '上传失败'); }
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}

// Upload with progress callback: onProgress(percent 0-100)
async function uploadFileWithProgress(bucket, path, file, onProgress) {
  var jwt = await getJWT();
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + (jwt || SUPABASE_ANON_KEY));
    if (onProgress) {
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
      };
    }
    xhr.onload = function() {
      if (xhr.status >= 400) {
        var msg = '上传失败';
        try { var d = JSON.parse(xhr.responseText); msg = d.message || d.error || msg; } catch(e) {}
        reject(new Error(msg));
      } else {
        resolve(SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path);
      }
    };
    xhr.onerror = function() { reject(new Error('网络错误')); };
    xhr.send(file);
  });
}

function getFileUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}

// ─── Helpers ─────────────────────────────────────────
function https(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/^http:\/\//i, 'https://');
}
