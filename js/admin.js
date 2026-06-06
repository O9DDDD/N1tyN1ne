/* ─── Admin Panel ───────────────────────────────────── */
let editingPostId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  if (!currentUser || currentProfile?.role !== 'admin') {
    document.getElementById('adminLoading').innerHTML = '<p style="color:#ff4444">⚠ 无管理员权限</p>';
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }
  document.getElementById('adminApp').style.display = 'grid';
  document.getElementById('adminLoading').style.display = 'none';
  document.getElementById('adminAuthUI').innerHTML =
    `<span class="user-badge"><span>${currentProfile.username}</span><button class="logout-btn" onclick="logoutUser()">退出</button></span>`;

  document.querySelectorAll('.admin-sidebar a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.admin-sidebar a').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      const sec = document.getElementById('section-' + a.dataset.section);
      if (sec) sec.classList.add('active');
    });
  });
  await loadAll();
});

async function loadAll() {
  await Promise.all([loadAdminPosts(), loadAdminMusic(), loadAdminComments()]);
}

/* ─── Posts ─────────────────────────────────────────── */
async function loadAdminPosts() {
  try {
    const data = await dbSelect('posts', { order: { col: 'created_at', dir: 'desc' } });
    const tbody = document.getElementById('postsBody');
    document.getElementById('dashPosts').textContent = (data || []).length;
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">暂无文章</div></td></tr>'; return;
    }
    tbody.innerHTML = data.map(p =>
      `<tr><td style="font-weight:500;color:var(--text-bright)">${p.title}</td>
      <td><span style="padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:600;background:${p.published ? 'var(--grn-dark)' : 'var(--blk-mid)'};color:#fff">${p.published ? '已发布' : '草稿'}</span></td>
      <td>${p.created_at ? new Date(p.created_at).toLocaleDateString('zh-CN') : ''}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="editPost('${p.id}')">编辑</button>
      <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')">删除</button></td></tr>`
    ).join('');
  } catch {}
}

function showPostEditor() {
  editingPostId = null;
  ['postTitle','postExcerpt','postTags','postContent','editPostId'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('editorTitle').textContent = '新文章';
  document.getElementById('postEditor').style.display = 'block';
}

function cancelPostEditor() { document.getElementById('postEditor').style.display = 'none'; }

async function editPost(id) {
  try {
    const data = await dbSelect('posts', { eq: { col: 'id', val: id }, single: true });
    if (!data) return;
    editingPostId = id;
    document.getElementById('editorTitle').textContent = '编辑文章';
    document.getElementById('postTitle').value = data.title;
    document.getElementById('postExcerpt').value = data.excerpt || '';
    document.getElementById('postTags').value = (data.tags || []).join(', ');
    document.getElementById('postContent').value = data.content;
    document.getElementById('editPostId').value = id;
    document.getElementById('postEditor').style.display = 'block';
  } catch {}
}

async function savePost() {
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const excerpt = document.getElementById('postExcerpt').value.trim();
  const tags = document.getElementById('postTags').value.split(',').map(t => t.trim()).filter(Boolean);
  if (!title || !content) { alert('标题和内容不能为空'); return; }
  const payload = { title, content, excerpt, tags, author_id: currentUser.id, published: true };
  try {
    if (editingPostId) { await dbUpdate('posts', payload, 'id', editingPostId); }
    else { await dbInsert('posts', payload); }
    cancelPostEditor();
    await loadAdminPosts();
  } catch (e) { alert('保存失败: ' + e.message); }
}

async function deletePost(id) {
  if (!confirm('确定删除？')) return;
  await dbDelete('posts', 'id', id);
  await loadAdminPosts();
}

/* ─── Music ─────────────────────────────────────────── */
async function loadAdminMusic() {
  try {
    const data = await dbSelect('music', { order: { col: 'created_at', dir: 'desc' } });
    document.getElementById('dashMusic').textContent = (data || []).length;
    const tbody = document.getElementById('musicBody');
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">暂无音乐</div></td></tr>'; return; }
    tbody.innerHTML = data.map(m =>
      `<tr><td style="color:var(--text-bright)">${m.title}</td><td>${m.artist || '—'}</td>
      <td>${m.created_at ? new Date(m.created_at).toLocaleDateString('zh-CN') : ''}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteMusic('${m.id}')">删除</button></td></tr>`
    ).join('');
  } catch {}
}

function showMusicUpload() { document.getElementById('musicUploader').style.display = 'block'; }
function cancelMusicUpload() { document.getElementById('musicUploader').style.display = 'none'; }

async function uploadMusic() {
  const title = document.getElementById('muTitle').value.trim();
  const artist = document.getElementById('muArtist').value.trim();
  const duration = document.getElementById('muDuration').value.trim();
  const audioFile = document.getElementById('muAudio').files[0];
  const coverFile = document.getElementById('muCover').files[0];
  const lyricsFile = document.getElementById('muLyrics').files[0];
  const lyricsText = document.getElementById('muLyricsText').value.trim();
  if (!title || !audioFile) { alert('歌曲名和音频不能为空'); return; }
  const btn = document.getElementById('muSubmit');
  btn.disabled = true; btn.textContent = '上传中...';
  try {
    const ts = Date.now();
    const audioUrl = await uploadFile('music', `${ts}_${audioFile.name}`, audioFile);
    let coverUrl = '';
    if (coverFile) coverUrl = await uploadFile('covers', `${ts}_${coverFile.name}`, coverFile);
    let lyrics = lyricsText;
    if (!lyrics && lyricsFile) lyrics = await lyricsFile.text();
    await dbInsert('music', { title, artist: artist || '未知', duration, audio_url: audioUrl, cover_url: coverUrl, lyrics: lyrics || '', uploaded_by: currentUser.id });
    ['muTitle','muArtist','muDuration','muAudio','muCover','muLyrics','muLyricsText'].forEach(id => document.getElementById(id).value = '');
    cancelMusicUpload();
    await loadAdminMusic();
  } catch (e) { alert('上传失败: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = '上传'; }
}

async function deleteMusic(id) {
  if (!confirm('确定删除？')) return;
  await dbDelete('music', 'id', id);
  await loadAdminMusic();
}

/* ─── Comments ──────────────────────────────────────── */
async function loadAdminComments() {
  try {
    const data = await dbSelect('comments', { order: { col: 'created_at', dir: 'desc' } });
    document.getElementById('dashComments').textContent = (data || []).length;
    const tbody = document.getElementById('commentsBody');
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">暂无留言</div></td></tr>'; return; }
    let html = '';
    for (const c of data) {
      let username = '匿名', postTitle = '—';
      try {
        const p = await dbSelect('profiles', { eq: { col: 'id', val: c.user_id }, single: true });
        if (p) username = p.username;
      } catch {}
      html += `<tr><td style="color:var(--grn)">${username}</td>
        <td>${(c.content || '').slice(0, 60)}</td>
        <td style="color:var(--text-dim)">${postTitle}</td>
        <td>${c.created_at ? new Date(c.created_at).toLocaleDateString('zh-CN') : ''}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteComment('${c.id}')">删除</button></td></tr>`;
    }
    tbody.innerHTML = html;
  } catch {}
}

async function deleteComment(id) {
  if (!confirm('确定删除？')) return;
  await dbDelete('comments', 'id', id);
  await loadAdminComments();
}
