/* ─── Public Site App ───────────────────────────────── */
let currentPost = null;
let isAuthLogin = true;

document.addEventListener('DOMContentLoaded', async () => {
  player.init();
  await initAuth();
  await loadPosts();
  await loadMusic();
});

/* ─── Auth UI ────────────────────────────────────────── */
function openAuth(mode) {
  isAuthLogin = mode !== 'register';
  document.getElementById('authTitle').textContent = isAuthLogin ? '登录' : '注册';
  document.getElementById('authSubmit').textContent = isAuthLogin ? '登录' : '注册';
  document.getElementById('authUsername').style.display = isAuthLogin ? 'none' : 'block';
  document.getElementById('authSwitchText').innerHTML = isAuthLogin
    ? '没有账号？<span onclick="switchAuth()">注册</span>'
    : '已有账号？<span onclick="switchAuth()">登录</span>';
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authModal').classList.add('open');
}

function closeAuth() { document.getElementById('authModal').classList.remove('open'); }

function switchAuth() { openAuth(isAuthLogin ? 'register' : 'login'); }

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const username = document.getElementById('authUsername').value.trim();
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';
  try {
    if (isAuthLogin) {
      await loginUser(email, password);
      closeAuth();
      await loadPosts();
      await loadMusic();
    } else {
      if (!username) { errEl.textContent = '请输入用户名'; errEl.style.display = 'block'; return; }
      await register(email, password, username);
      errEl.textContent = '注册成功！请直接登录';
      errEl.style.color = 'var(--grn)';
      errEl.style.display = 'block';
      isAuthLogin = true;
      document.getElementById('authTitle').textContent = '登录';
      document.getElementById('authSubmit').textContent = '登录';
      document.getElementById('authUsername').style.display = 'none';
      document.getElementById('authSwitchText').innerHTML = '没有账号？<span onclick="switchAuth()">注册</span>';
    }
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.color = '#ff4444';
    errEl.style.display = 'block';
  }
}

document.getElementById('authModal').onclick = (e) => { if (e.target === e.currentTarget) closeAuth(); };

/* ─── Blog ──────────────────────────────────────────── */
async function loadPosts() {
  try {
    let data = await dbSelect('posts', { eq: { col: 'published', val: 'true' }, order: { col: 'created_at', dir: 'desc' } });
    // Fetch profiles for each post if needed
    renderPosts(data || []);
  } catch (e) {
    const grid = document.getElementById('blogGrid');
    if (grid) grid.innerHTML = '<p style="color:var(--text-dim)">暂无文章</p>';
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!posts || !posts.length) { grid.innerHTML = '<p style="color:var(--text-dim)">暂无文章</p>'; return; }
  posts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'blog-card';
    const tags = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    card.innerHTML = `
      <div class="meta"><span>${p.created_at ? new Date(p.created_at).toLocaleDateString('zh-CN') : ''}</span>${tags}</div>
      <h3>${p.title}</h3>
      <p>${p.excerpt || ''}</p>
      <span class="read-link">阅读全文 →</span>
    `;
    card.onclick = () => openPost(p);
    grid.appendChild(card);
  });
}

async function openPost(post) {
  currentPost = post;
  document.getElementById('postList').classList.remove('open');
  document.getElementById('postDetail').classList.add('open');
  document.getElementById('pdTitle').textContent = post.title;
  document.getElementById('pdMeta').textContent = post.created_at ? new Date(post.created_at).toLocaleDateString('zh-CN') : '';
  document.getElementById('pdBody').innerHTML = marked.parse(post.content || '');
  document.getElementById('pdBody').querySelectorAll('a').forEach(a => a.setAttribute('target', '_blank'));
  document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
  loadComments(post.id);
}

function closePost() {
  currentPost = null;
  document.getElementById('postDetail').classList.remove('open');
  document.getElementById('postList').classList.add('open');
}

/* ─── Comments ──────────────────────────────────────── */
async function loadComments(postId) {
  const area = document.getElementById('commentInputArea');
  const list = document.getElementById('commentList');
  if (currentUser) {
    area.innerHTML = `<div class="comment-input"><textarea id="commentText" placeholder="写下你的留言..."></textarea><button class="btn" onclick="submitComment()">发送</button></div>`;
  } else {
    area.innerHTML = `<div class="login-hint">要留言？<span onclick="openAuth()">登录</span></div>`;
  }
  try {
    let data = await dbSelect('comments', { eq: { col: 'post_id', val: postId }, order: { col: 'created_at', dir: 'asc' } });
    if (!data || !data.length) { list.innerHTML = '<p style="font-size:.82rem;color:var(--text-dim)">暂无留言</p>'; return; }
    // For each comment, try to get the username from profiles if we can
    let html = '';
    for (const c of data) {
      let username = '匿名';
      try {
        const profile = await dbSelect('profiles', { eq: { col: 'id', val: c.user_id }, single: true });
        if (profile) username = profile.username;
      } catch {}
      html += `<div class="comment-item"><span class="ci-user">${username}</span><span class="ci-time">${new Date(c.created_at).toLocaleString('zh-CN')}</span><div class="ci-text">${c.content}</div></div>`;
    }
    list.innerHTML = html;
  } catch { list.innerHTML = ''; }
}

async function submitComment() {
  const text = document.getElementById('commentText')?.value.trim();
  if (!text || !currentPost || !currentUser) return;
  try {
    await dbInsert('comments', { post_id: currentPost.id, user_id: currentUser.id, content: text });
    document.getElementById('commentText').value = '';
    loadComments(currentPost.id);
  } catch (e) { console.error(e); }
}

/* ─── Music ─────────────────────────────────────────── */
async function loadMusic() {
  try {
    let data = await dbSelect('music', { order: { col: 'created_at', dir: 'desc' } });
    const tracks = (data || []).reverse();
    if (tracks.length) { player.load(tracks); }
  } catch {}
}

function onLogout() { closePost(); loadPosts(); }
