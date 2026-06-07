/* ─── Auth ──────────────────────────────────────────── */
window._currentUser = null;
window._currentProfile = null;

async function initAuth() {
  await initSession();
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
  // 1. 创建用户
  const data = await signUp(email, password);
  if (!data.id && !data.user) throw new Error('注册失败');
  const userId = data.user?.id || data.id;
  // 2. 自动登录获取有效 session
  const session = await signIn(email, password);
  window._currentUser = session.user;
  // 3. 用有效 token 写入 profile（保留原始大小写）
  await dbInsert('profiles', { id: userId, username, role: 'user' });
  window._currentProfile = { id: userId, username, role: 'user' };
  renderAuthUI();
  return session;
}

async function loginUser(email, password) {
  const data = await signIn(email, password);
  window._currentUser = data.user;
  await loadProfile();
  renderAuthUI();
  // Refresh posts after login
  if (typeof loadPosts === 'function') await loadPosts();
  if (typeof Player !== 'undefined') await Player.load();
  return data;
}

async function logoutUser() {
  await signOut();
  window._currentUser = null;
  window._currentProfile = null;
  renderAuthUI();
  if (typeof Blog !== 'undefined') Blog.close();
  if (typeof loadPosts === 'function') loadPosts();
}

function renderAuthUI() {
  const el = document.getElementById('authUI');
  if (!el) return;
  if (window._currentUser && window._currentProfile) {
    const isAdmin = window._currentProfile.role === 'admin';
    el.innerHTML =
      '<span class="user-badge">' +
      '<span class="uname" onclick="editUsername()" title="点击修改用户名" style="cursor:pointer">' + window._currentProfile.username + '</span>' +
      (isAdmin ? '<a href="admin.html" style="font-size:.72rem;color:var(--grn)">[管理]</a>' : '') +
      '<button class="logout-btn" onclick="logoutUser()">退出</button>' +
      '</span>';
  } else {
    el.innerHTML = '<button class="nav-btn" onclick="Auth.open()">登录</button>';
  }
}

async function editUsername() {
  const p = window._currentProfile;
  if (!p) return;
  const name = prompt('修改用户名（当前：' + p.username + '）', p.username);
  if (!name || name === p.username) return;
  try {
    await dbUpdate('profiles', { username: name }, 'id', p.id);
    window._currentProfile.username = name;
    renderAuthUI();
    UI.toast('用户名已更新');
  } catch (e) { UI.toast('修改失败: ' + e.message, 'error'); }
}
