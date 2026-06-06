/* ─── Public Site App ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  AudioPlayer.init();
  await initAuth();
  await loadPosts();
  await loadMusic();
});

/* ─── Blog ──────────────────────────────────────────── */
async function loadPosts() {
  const grid = document.getElementById('blogGrid');
  try {
    let data = await dbSelect('posts', { eq: { col: 'published', val: 'true' }, order: { col: 'created_at', dir: 'desc' } });
    if (!data || !data.length) {
      grid.innerHTML =
        '<div class="empty-state"><div class="empty-icon"><i class="fas fa-pen-to-square"></i></div><p>还没有文章</p><p class="empty-sub">登录后开始写作吧</p></div>';
      return;
    }
    renderPosts(data);
  } catch (e) {
    grid.innerHTML =
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-pen-to-square"></i></div><p>还没有文章</p><p class="empty-sub">登录后开始写作吧</p></div>';
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = '';
  posts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'blog-card';
    const tags = (p.tags || []).map(t => '<span class="tag">' + t + '</span>').join('');
    card.innerHTML =
      '<div class="meta"><span>' + (p.created_at ? new Date(p.created_at).toLocaleDateString('zh-CN') : '') + '</span>' + tags + '</div>' +
      '<h3>' + p.title + '</h3>' +
      '<p>' + (p.excerpt || '') + '</p>' +
      '<span class="read-link">阅读全文 →</span>';
    card.onclick = () => Blog.open(p);
    grid.appendChild(card);
  });
}

/* ─── Comments ──────────────────────────────────────── */
async function loadComments(postId) {
  const area = document.getElementById('commentInputArea');
  const list = document.getElementById('commentList');
  if (window._currentUser) {
    area.innerHTML =
      '<div class="comment-input"><textarea id="commentText" placeholder="写下你的留言..."></textarea><button class="btn" onclick="Blog.submitComment()">发送</button></div>';
  } else {
    area.innerHTML = '<div class="login-hint">要留言？<span onclick="Auth.open()">登录</span></div>';
  }
  try {
    let data = await dbSelect('comments', { eq: { col: 'post_id', val: postId }, order: { col: 'created_at', dir: 'asc' } });
    if (!data || !data.length) { list.innerHTML = '<p style="font-size:.82rem;color:var(--text-dim);text-align:center;padding:20px">暂无留言</p>'; return; }
    let html = '';
    for (const c of data) {
      let username = '匿名';
      try {
        const profile = await dbSelect('profiles', { eq: { col: 'id', val: c.user_id }, single: true });
        if (profile) username = profile.username;
      } catch {}
      html += '<div class="comment-item"><span class="ci-user">' + username + '</span><span class="ci-time">' + new Date(c.created_at).toLocaleString('zh-CN') + '</span><div class="ci-text">' + c.content + '</div></div>';
    }
    list.innerHTML = html;
  } catch { list.innerHTML = ''; }
}

/* ─── Music ─────────────────────────────────────────── */
async function loadMusic() {
  try {
    let data = await dbSelect('music', { order: { col: 'created_at', dir: 'desc' } });
    const tracks = (data || []).reverse();
    if (tracks.length) { AudioPlayer.load(tracks); }
  } catch {}
}
