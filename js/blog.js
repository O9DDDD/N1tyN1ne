/* ─── Blog ──────────────────────────────────────────── */
async function loadBlog() {
  try {
    const res = await fetch('data/posts.json');
    const posts = await res.json();
    document.getElementById('statPosts').textContent = posts.length;
    renderPosts(posts);
  } catch {
    document.getElementById('blogGrid').innerHTML = '<p style="color:var(--text-dim)">暂无文章</p>';
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('blogGrid');
  grid.innerHTML = '';
  posts.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'blog-card';
    const tagsHtml = (post.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    card.innerHTML = `
      <div class="meta">
        <span>${post.date || ''}</span>
        ${tagsHtml}
      </div>
      <h3>${post.title}</h3>
      <p>${post.excerpt || ''}</p>
      <span class="read-more">阅读全文 →</span>
    `;
    card.onclick = () => openPost(post);
    grid.appendChild(card);
  });
}

function openPost(post) {
  document.getElementById('modalTitle').textContent = post.title;
  document.getElementById('modalMeta').textContent = post.date || '';
  const html = marked.parse(post.content || '');
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('postModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('postModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('postModal').onclick = (e) => {
  if (e.target === e.currentTarget) closeModal();
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
