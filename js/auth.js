/* ─── Auth ──────────────────────────────────────────── */
window._currentUser = null;
window._currentProfile = null;

async function initAuth() {
  const sess = getSession();
  if (sess && sess.user) {
    window._currentUser = sess.user;
    await loadProfile();
  }
  renderAuthUI();
}

async function loadProfile() {
  if (!window._currentUser) return;
  try {
    window._currentProfile = await dbSelect('profiles', { eq: { col: 'id', val: window._currentUser.id }, single: true });
    if (!window._currentProfile) {
      const username = window._currentUser.email?.split('@')[0] || 'user_' + window._currentUser.id.slice(0, 6);
      await dbInsert('profiles', { id: window._currentUser.id, username, role: 'user' });
      window._currentProfile = await dbSelect('profiles', { eq: { col: 'id', val: window._currentUser.id }, single: true });
    }
  } catch { /* retry on next action */ }
}

async function register(email, password, username) {
  const data = await signUp(email, password);
  if (data.id) {
    try { await dbInsert('profiles', { id: data.id, username, role: 'user' }); } catch {}
  }
  return data;
}

async function loginUser(email, password) {
  const data = await signIn(email, password);
  window._currentUser = data.user;
  await loadProfile();
  renderAuthUI();
  // Refresh posts after login
  if (typeof loadPosts === 'function') await loadPosts();
  if (typeof loadMusic === 'function') await loadMusic();
  return data;
}

async function logoutUser() {
  await signOut();
  window._currentUser = null;
  window._currentProfile = null;
  renderAuthUI();
  Blog.close();
  if (typeof loadPosts === 'function') loadPosts();
}

function renderAuthUI() {
  const el = document.getElementById('authUI');
  if (!el) return;
  if (window._currentUser && window._currentProfile) {
    const isAdmin = window._currentProfile.role === 'admin';
    el.innerHTML =
      '<span class="user-badge">' +
      '<span>' + window._currentProfile.username + '</span>' +
      (isAdmin ? '<a href="admin.html" style="font-size:.72rem;color:var(--grn)">[管理]</a>' : '') +
      '<button class="logout-btn" onclick="logoutUser()">退出</button>' +
      '</span>';
  } else {
    el.innerHTML = '<button class="nav-btn" onclick="Auth.open()">登录</button>';
  }
}
