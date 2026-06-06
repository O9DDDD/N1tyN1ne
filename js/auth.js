/* ─── Auth ──────────────────────────────────────────── */
let currentUser = null;
let currentProfile = null;

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
  }
  renderAuthUI();
}

async function loadProfile() {
  if (!currentUser) return;
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
  // If no profile yet, create one
  if (!data) {
    const username = currentUser.email?.split('@')[0] || 'user_' + currentUser.id.slice(0, 6);
    await supabase.from('profiles').insert({ id: currentUser.id, username, role: 'user' });
    const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = newProfile;
  }
}

async function register(email, password, username) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    await supabase.from('profiles').insert({ id: data.user.id, username, role: 'user' });
  }
  return data;
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
  await loadProfile();
  return data;
}

async function logout() {
  await supabase.auth.signOut();
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
        <button class="logout-btn" onclick="logout()">退出</button>
      </span>
    `;
  } else {
    el.innerHTML = `<button class="nav-btn" onclick="openAuth()">登录</button>`;
  }
}

// Callback for admin pages
let onLogout = null;
