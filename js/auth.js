/* ─── Auth ──────────────────────────────────────────── */
let currentUser = null;
let currentProfile = null;

async function initAuth() {
  const sess = getSession();
  if (sess && sess.user) {
    currentUser = sess.user;
    await loadProfile();
  }
  renderAuthUI();
}

async function loadProfile() {
  if (!currentUser) return;
  try {
    currentProfile = await dbSelect('profiles', { eq: { col: 'id', val: currentUser.id }, single: true });
    if (!currentProfile) {
      const username = currentUser.email?.split('@')[0] || 'user_' + currentUser.id.slice(0, 6);
      await dbInsert('profiles', { id: currentUser.id, username, role: 'user' });
      currentProfile = await dbSelect('profiles', { eq: { col: 'id', val: currentUser.id }, single: true });
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
  currentUser = data.user;
  await loadProfile();
  renderAuthUI();
  return data;
}

async function logoutUser() {
  await signOut();
  currentUser = null;
  currentProfile = null;
  renderAuthUI();
  if (typeof onLogout === 'function') onLogout();
}

function renderAuthUI() {
  const el = document.getElementById('authUI');
  if (!el) return;
  if (currentUser && currentProfile) {
    const isAdmin = currentProfile.role === 'admin';
    el.innerHTML = `
      <span class="user-badge">
        <span>${currentProfile.username}</span>
        ${isAdmin ? '<a href="admin.html" style="font-size:.72rem;color:var(--grn)">[管理]</a>' : ''}
        <button class="logout-btn" onclick="logoutUser()">退出</button>
      </span>
    `;
  } else {
    el.innerHTML = `<button class="nav-btn" onclick="openAuth()">登录</button>`;
  }
}

let onLogout = null;
