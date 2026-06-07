/* ─── Public Site App ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  Player.init();
  applySiteSettings();
  await initAuth();
  await loadPosts();
  await loadFriends();
  await Player.load();
});

/* ─── Site Settings ──────────────────────────────────── */
function applySiteSettings() {
  try {
    var raw = localStorage.getItem('site_settings');
    if (!raw) return;
    var s = JSON.parse(raw);
    if (s.heroTitle) document.getElementById('heroTitle').textContent = s.heroTitle;
    if (s.heroDesc) document.getElementById('heroDesc').textContent = s.heroDesc;
    if (s.aboutIntro) document.getElementById('aboutIntro').textContent = s.aboutIntro;
    if (s.aboutTitle2) document.getElementById('aboutTitle2').textContent = s.aboutTitle2;
    if (s.aboutDesc2) document.getElementById('aboutDesc2').textContent = s.aboutDesc2;
    if (s.aboutTitle3) document.getElementById('aboutTitle3').textContent = s.aboutTitle3;
    if (s.aboutDesc3) document.getElementById('aboutDesc3').textContent = s.aboutDesc3;
  } catch(e) {}
}

/* ─── Blog ──────────────────────────────────────────── */
async function loadPosts() {
  const grid = document.getElementById('blogGrid');
  try {
    let data = await dbSelect('posts', { eq: { col: 'published', val: 'true' }, order: 'pinned.desc,created_at.desc' });
    if (!data || !data.length) {
      grid.innerHTML =
        '<div class="empty-state"><div class="empty-icon"><i class="fas fa-pen-to-square"></i></div><p>还没有文章</p><p class="empty-sub">登录后台开始写作吧</p></div>';
      hideTagFilter();
      return;
    }
    Blog._allPosts = data;
    buildTagFilter(data);
    renderPosts(data);
    document.querySelectorAll('.blog-card.reveal').forEach(el => {
      if (window._revealObs) window._revealObs.observe(el);
    });
  } catch (e) {
    grid.innerHTML =
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-pen-to-square"></i></div><p>还没有文章</p><p class="empty-sub">登录后台开始写作吧</p></div>';
    hideTagFilter();
  }
}

function buildTagFilter(posts) {
  const allTags = new Set();
  posts.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));
  if (allTags.size <= 1) { hideTagFilter(); return; }

  const filter = document.getElementById('tagFilter');
  filter.style.display = 'flex';
  filter.querySelectorAll('.tf-btn:not([data-tag="*"])').forEach(b => b.remove());

  [...allTags].sort().forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tf-btn';
    btn.dataset.tag = tag;
    btn.textContent = tag;
    btn.onclick = () => Blog.filterByTag(tag);
    filter.appendChild(btn);
  });

  filter.querySelector('.tf-btn[data-tag="*"]').classList.add('active');
}

function hideTagFilter() {
  const filter = document.getElementById('tagFilter');
  filter.style.display = 'none';
}

function renderPosts(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!posts.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>没有匹配的文章</p></div>';
    return;
  }
  posts.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'blog-card reveal' + (p.pinned ? ' pinned-card' : '');
    card.style.transitionDelay = (i * 0.04) + 's';
    card.dataset.tags = (p.tags || []).join(',');
    const tags = (p.tags || []).map(t => '<span class="tag">' + t + '</span>').join('');
    var pinnedBadge = p.pinned ? '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> 置顶</span>' : '';
    card.innerHTML =
      '<div class="meta"><span>' + (p.created_at ? new Date(p.created_at).toLocaleDateString('zh-CN') : '') + '</span>' + tags + pinnedBadge + '</div>' +
      '<h3>' + p.title + '</h3>' +
      '<p>' + (p.excerpt || '') + '</p>' +
      '<span class="read-link">阅读全文 →</span>';
    card.onclick = () => Blog.open(p);
    grid.appendChild(card);
  });
  document.querySelectorAll('.blog-card.reveal').forEach(el => {
    if (window._revealObs) window._revealObs.observe(el);
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
    if (!data || !data.length) {
      list.innerHTML = '<p style="font-size:.82rem;color:var(--text-dim);text-align:center;padding:20px">暂无留言，来说点什么吧</p>';
      return;
    }
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

/* ─── Friends ───────────────────────────────────────── */
const FRIENDS_TABLE = 'friends';

async function loadFriends() {
  const grid = document.getElementById('friendsGrid');
  if (!grid) return;
  try {
    let data = [];
    try {
      data = await dbSelect(FRIENDS_TABLE, { order: { col: 'created_at', dir: 'asc' } });
    } catch(e) {
      // Table might not exist yet, use localStorage fallback
      try {
        const local = localStorage.getItem('friends_cache');
        if (local) data = JSON.parse(local);
      } catch(_) {}
    }
    if (!data || !data.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><i class="fas fa-link"></i></div><p>还没有友链</p></div>';
      return;
    }
    localStorage.setItem('friends_cache', JSON.stringify(data));
    grid.innerHTML = data.map(f =>
      '<a href="' + escHtml(f.url || '#') + '" class="friend-card" target="_blank" rel="noopener">' +
      '<div class="fc-avatar">' + (f.avatar_url ? '<img src="' + escHtml(https(f.avatar_url)) + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : escHtml((f.name || '?').charAt(0).toUpperCase())) + '</div>' +
      '<div class="fc-info"><div class="fc-name">' + escHtml(f.name || '未命名') + '</div><div class="fc-desc">' + escHtml(f.description || '') + '</div></div>' +
      '</a>'
    ).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><i class="fas fa-link"></i></div><p>还没有友链</p></div>';
  }
}

function escHtml(str) {
  var d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
