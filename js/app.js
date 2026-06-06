/* ─── App: Public Site ──────────────────────────────── */
let currentPost = null;
let isAuthLogin = true;

/* ─── Init ──────────────────────────────────────────── */
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

function closeAuth() {
  document.getElementById('authModal').classList.remove('open');
}

function switchAuth() {
  openAuth(isAuthLogin ? 'register' : 'login');
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const username = document.getElementById('authUsername').value.trim();
  const errEl = document.getElementById('authError');

  try {
    if (isAuthLogin) {
      await login(email, password);
    } else {
      if (!username) { errEl.textContent = '请输入用户名'; errEl.style.display = 'block'; return; }
      await register(email, password, username);
      errEl.textContent = '注册成功，请查看邮箱确认（或直接登录）';
      errEl.style.color = 'var(--grn)';
      errEl.style.display = 'block';
      return;
    }
    closeAuth();
    // Re-render
    await loadPosts();
    await loadMusic();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.color = '#ff4444';
    errEl.style.display = 'block';
  }
}

// Close auth modal on overlay click
document.getElementById('authModal').onclick = (e) => {
  if (e.target === e.currentTarget) closeAuth();
};

/* ─── Blog ──────────────────────────────────────────── */
async function loadPosts() {
  try {
    let { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username)')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    renderPosts(data || []);
    document.getElementById('statPosts').textContent = (data || []).length;
  } catch {
    document.getElementById('blogGrid').innerHTML = '<p style="color:var(--text-dim)">暂无文章</p>';
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!posts.length) {
    grid.innerHTML = '<p style="color:var(--text-dim)">暂无文章</p>';
    return;
  }
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
  loadComments(post.id);
  document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
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

  // Render comment input
  if (currentUser) {
    area.innerHTML = `
      <div class="comment-input">
        <textarea id="commentText" placeholder="写下你的留言..."></textarea>
        <button class="btn" onclick="submitComment()">发送</button>
      </div>
    `;
  } else {
    area.innerHTML = `<div class="login-hint">要留言？<span onclick="openAuth()">登录</span></div>`;
  }

  // Load comments
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!data || !data.length) {
      list.innerHTML = '<p style="font-size:.82rem;color:var(--text-dim)">暂无留言</p>';
      return;
    }
    list.innerHTML = data.map(c => `
      <div class="comment-item">
        <span class="ci-user">${c.profiles?.username || '匿名'}</span>
        <span class="ci-time">${new Date(c.created_at).toLocaleString('zh-CN')}</span>
        <div class="ci-text">${c.content}</div>
      </div>
    `).join('');
  } catch { list.innerHTML = ''; }
}

async function submitComment() {
  const text = document.getElementById('commentText')?.value.trim();
  if (!text || !currentPost || !currentUser) return;
  try {
    await supabase.from('comments').insert({
      post_id: currentPost.id,
      user_id: currentUser.id,
      content: text
    });
    document.getElementById('commentText').value = '';
    loadComments(currentPost.id);
  } catch (e) { console.error(e); }
}

/* ─── Music ─────────────────────────────────────────── */
async function loadMusic() {
  try {
    const { data, error } = await supabase
      .from('music')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Reverse to get chronological order
    const tracks = (data || []).reverse();
    if (tracks.length) {
      player.load(tracks);
      document.getElementById('statTracks').textContent = tracks.length;
    }
  } catch { /* no music yet */ }
}

/* ─── On logout ─────────────────────────────────────── */
// Called from auth.js after logout
function onLogout() {
  closePost();
  loadPosts();
}
