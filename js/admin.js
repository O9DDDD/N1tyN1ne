/* ─── Admin Panel ───────────────────────────────────── */
let editingPostId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  if (!window._currentUser || window._currentProfile?.role !== 'admin') {
    document.getElementById('adminLoading').innerHTML = '<p style="color:#ff4444">无管理员权限，正在跳转...</p>';
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }
  document.getElementById('adminApp').style.display = 'grid';
  document.getElementById('adminLoading').style.display = 'none';
  document.getElementById('adminAuthUI').innerHTML =
    '<span class="user-badge"><span>' + window._currentProfile.username + '</span><button class="logout-btn" onclick="logoutUser()">退出</button></span>';

  // Init floating player
  if (typeof Player !== 'undefined') { Player.init(); Player.load(); }
  updateGHTokenStatus();

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
      '<tr><td style="font-weight:500;color:var(--text-bright)">' + p.title + '</td>' +
      '<td><span style="padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:600;background:' + (p.published ? 'var(--grn-dark)' : 'var(--blk-mid)') + ';color:#fff">' + (p.published ? '已发布' : '草稿') + '</span></td>' +
      '<td>' + (p.created_at ? new Date(p.created_at).toLocaleDateString('zh-CN') : '') + '</td>' +
      '<td><button class="btn btn-ghost btn-sm" onclick="editPost(\'' + p.id + '\')">编辑</button> ' +
      '<button class="btn btn-danger btn-sm" onclick="deletePost(\'' + p.id + '\')">删除</button></td></tr>'
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
  const payload = { title, content, excerpt, tags, author_id: window._currentUser.id, published: true };
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

/* ─── Music List ──────────────────────────────────── */
let editingMusicId = null;

function coverThumb(url) {
  if (!url) return '<div style="width:36px;height:36px;border-radius:4px;background:var(--blk-mid);display:flex;align-items:center;justify-content:center"><i class="fas fa-music" style="color:var(--text-dim);font-size:.75rem"></i></div>';
  return '<img src="' + https(url) + '" style="width:36px;height:36px;border-radius:4px;object-fit:cover">';
}

async function loadAdminMusic() {
  try {
    var data = await dbSelect('music', { order: { col: 'created_at', dir: 'desc' } });
    document.getElementById('dashMusic').textContent = (data || []).length;
    var tbody = document.getElementById('musicBody');
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">暂无音乐</div></td></tr>'; return; }
    tbody.innerHTML = data.map(function(m) {
      if (editingMusicId === m.id) {
        return '<tr>' +
          '<td>' + coverThumb(m.cover_url) + '</td>' +
          '<td><input id="emTitle" value="' + escHtml(m.title) + '" style="width:100%;padding:4px 6px;background:var(--blk-mid);border:1px solid var(--border);color:var(--text-bright);font-size:.82rem;border-radius:4px"></td>' +
          '<td><input id="emArtist" value="' + escHtml(m.artist || '') + '" style="width:100%;padding:4px 6px;background:var(--blk-mid);border:1px solid var(--border);color:var(--text-bright);font-size:.82rem;border-radius:4px"></td>' +
          '<td>' + (m.created_at ? new Date(m.created_at).toLocaleDateString('zh-CN') : '') + '</td>' +
          '<td><button class="btn btn-primary btn-sm" onclick="saveMusicEdit(\'' + m.id + '\')" style="background:var(--grn-dark);color:#fff">保存</button> ' +
          '<button class="btn btn-ghost btn-sm" onclick="cancelMusicEdit()">取消</button><br>' +
          '<input type="file" id="emCover" accept="image/*" style="margin-top:4px;font-size:.72rem;color:var(--text-dim)"></td></tr>';
      }
      return '<tr>' +
        '<td>' + coverThumb(m.cover_url) + '</td>' +
        '<td style="color:var(--text-bright)">' + m.title + '</td><td>' + (m.artist || '—') + '</td>' +
        '<td>' + (m.created_at ? new Date(m.created_at).toLocaleDateString('zh-CN') : '') + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="editMusic(\'' + m.id + '\')">编辑</button> ' +
        '<button class="btn btn-danger btn-sm" onclick="deleteMusic(\'' + m.id + '\')">删除</button></td></tr>';
    }).join('');
  } catch {}
}

function editMusic(id) {
  editingMusicId = id;
  loadAdminMusic();
}

function cancelMusicEdit() {
  editingMusicId = null;
  loadAdminMusic();
}

async function saveMusicEdit(id) {
  var title = document.getElementById('emTitle').value.trim();
  var artist = document.getElementById('emArtist').value.trim();
  if (!title) { alert('歌名不能为空'); return; }
  try {
    var coverFile = document.getElementById('emCover').files[0];
    var coverUrl = '';
    if (coverFile) {
      var ts = Date.now();
      var safeId = id.replace(/-/g, '').slice(0, 8);
      coverUrl = await uploadFile('covers', ts + '_edit_' + safeId + '.jpg', coverFile);
    }
    var payload = { title: title, artist: artist };
    if (coverUrl) payload.cover_url = coverUrl;
    await dbUpdate('music', payload, 'id', id);
    editingMusicId = null;
    await loadAdminMusic();
  } catch(e) { alert('保存失败: ' + e.message); }
}

async function deleteMusic(id) {
  if (!confirm('确定删除？')) return;
  await dbDelete('music', 'id', id);
  await loadAdminMusic();
}

/* ─── GitHub Token Management ─────────────────────── */
function saveGHToken() {
  var input = document.getElementById('ghTokenInput');
  var token = (input.value || '').trim();
  if (!token) { alert('请粘贴 GitHub Token'); return; }
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    alert('Token 格式不正确，应以 ghp_ 或 github_pat_ 开头');
    return;
  }
  setGitHubPAT(token);
  input.value = '';
  updateGHTokenStatus();
  alert('GitHub Token 已保存！大于 10MB 的音乐文件将自动上传到 GitHub。');
}

function clearGHToken() {
  if (!confirm('确定清除 GitHub Token？大文件上传将回退到 Supabase。')) return;
  setGitHubPAT('');
  updateGHTokenStatus();
}

function updateGHTokenStatus() {
  var el = document.getElementById('ghTokenStatus');
  var input = document.getElementById('ghTokenInput');
  if (!el) return;
  if (hasGitHubStorage()) {
    el.innerHTML = '<span style="color:var(--accent)"><i class="fas fa-check-circle"></i> GitHub Token 已配置 · 大文件将走 GitHub 存储（上限 100MB）</span>';
    if (input) input.placeholder = '已配置，输入新 Token 可替换';
  } else {
    el.innerHTML = '<span style="color:var(--text-dim)"><i class="fas fa-info-circle"></i> 未配置 · 使用 Supabase 存储（免费套餐上限约 50MB）</span>';
    if (input) input.placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
  }
}

/* ─── Batch Music Upload ──────────────────────────── */
let uploadQueue = [];

function showMusicUpload() {
  document.getElementById('musicUploader').style.display = 'block';
  uploadQueue = [];
  renderQueue();
  setupDropZone();
}

let _dropSetup = false;
function setupDropZone() {
  if (_dropSetup) return;
  _dropSetup = true;
  const zone = document.getElementById('dropZone');
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--grn)';
    zone.style.background = 'rgba(90,124,62,0.06)';
  });
  zone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--border)';
    zone.style.background = '';
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--border)';
    zone.style.background = '';
    addFiles(e.dataTransfer.files);
  });
}

function cancelMusicUpload() {
  document.getElementById('musicUploader').style.display = 'none';
  uploadQueue.forEach(function(e) { if (e.coverUrl) URL.revokeObjectURL(e.coverUrl); });
  uploadQueue = [];
  renderQueue();
}

async function addFiles(files) {
  var MAX_SIZE = 500 * 1024 * 1024; // 500MB
  var audioFiles = [];
  var lrcFiles = [];
  var oversized = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (f.name.match(/\.lrc$/i)) {
      lrcFiles.push(f);
    } else if (f.type.startsWith('audio/') || f.name.match(/\.(mp3|flac|wav|ogg|m4a|aac)$/i)) {
      if (f.size > MAX_SIZE) {
        oversized.push(f.name + ' (' + (f.size / 1024 / 1024).toFixed(1) + ' MB)');
      } else {
        audioFiles.push(f);
      }
    }
  }
  if (oversized.length) {
    alert('以下文件超过 500MB 限制，已跳过：\n\n' + oversized.join('\n') + '\n\n提示：免费套餐单文件上限为 50MB，Pro 套餐为 5GB。');
  }
  // Read all LRC contents upfront
  var lrcMap = {};
  for (var j = 0; j < lrcFiles.length; j++) {
    var lf = lrcFiles[j];
    try {
      var text = await lf.text();
      var base = lf.name.replace(/\.lrc$/i, '');
      lrcMap[base] = text.trim();
    } catch(e) {}
  }

  for (var k = 0; k < audioFiles.length; k++) {
    var file = audioFiles[k];
    var entry = {
      file: file,
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: '未知',
      coverBlob: null,
      coverUrl: '',
      lyrics: '',
      lyricsSource: 'none',
      status: 'pending'
    };
    uploadQueue.push(entry);
    renderQueue();
    entry.status = 'extracting';
    renderQueue();
    await extractMetadata(entry);

    // Auto-match LRC by basename (strip both audio and .lrc extension)
    if (entry.lyricsSource === 'none') {
      var audioBase = file.name.replace(/\.[^.]+$/, '');
      if (lrcMap[audioBase]) {
        entry.lyrics = lrcMap[audioBase];
        entry.lyricsSource = 'lrcfile';
      }
    }
    entry.status = 'ready';
    renderQueue();
  }
}

// 从文件名猜测 "Artist - Title" 或 "Title"
function guessFromFilename(name) {
  var noExt = name.replace(/\.[^.]+$/, '');
  // "Artist - Title" 或 "Artist — Title"
  var m = noExt.match(/^(.+?)\s+[-—]\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  // "Title (feat. Artist)" or "Title feat Artist"
  m = noExt.match(/^(.+?)\s+\(feat\.?\s+(.+?)\)$/i);
  if (m) return { artist: m[2].trim(), title: m[1].trim() };
  // Just use the filename as title
  return { artist: '', title: noExt.trim() || name };
}

// 读取 WAV RIFF INFO 元数据
function readWavRiff(file) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function() {
      var view = new DataView(reader.result);
      var result = { title: '', artist: '' };
      try {
        if (view.byteLength < 44) { resolve(result); return; }
        if (view.getUint32(0, false) !== 0x52494646) { resolve(result); return; } // 'RIFF'
        var pos = 12;
        while (pos < view.byteLength - 8) {
          var id = String.fromCharCode(
            view.getUint8(pos), view.getUint8(pos+1),
            view.getUint8(pos+2), view.getUint8(pos+3)
          );
          var size = view.getUint32(pos+4, true);
          if (id === 'LIST' && pos + 12 <= view.byteLength) {
            var listHdr = String.fromCharCode(
              view.getUint8(pos+8), view.getUint8(pos+9),
              view.getUint8(pos+10), view.getUint8(pos+11)
            );
            if (listHdr === 'INFO') {
              var sub = pos + 12;
              var end = pos + 8 + size;
              while (sub + 8 <= end && sub + 8 <= view.byteLength) {
                var sId = String.fromCharCode(
                  view.getUint8(sub), view.getUint8(sub+1),
                  view.getUint8(sub+2), view.getUint8(sub+3)
                );
                var sSize = view.getUint32(sub+4, true);
                var sData = '';
                var dataStart = sub + 8;
                var dataEnd = Math.min(dataStart + sSize - 1, view.byteLength);
                if (dataEnd > dataStart) {
                  for (var j = dataStart; j < dataEnd; j++) {
                    var c = view.getUint8(j);
                    if (c === 0) break;
                    if (c < 128) sData += String.fromCharCode(c);
                  }
                }
                if (sId === 'INAM') result.title = sData.trim();
                if (sId === 'IART') result.artist = sData.trim();
                sub += 8 + (sSize % 2 === 1 ? sSize + 1 : sSize);
              }
            }
          }
          pos += 8 + (size % 2 === 1 ? size + 1 : size);
        }
      } catch(e) {}
      resolve(result);
    };
    reader.onerror = function() { resolve({ title: '', artist: '' }); };
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

function extractMetadata(entry) {
  return new Promise(function(resolve) {
    var tried = false;

    function done() {
      renderQueue();
      if (tried) return;
      tried = true;
      // 兜底：从文件名猜
      if (entry.artist === '未知' || !entry.artist) {
        var g = guessFromFilename(entry.file.name);
        if (g.artist) entry.artist = g.artist;
        if (g.title && entry.title === entry.file.name.replace(/\.[^.]+$/, '')) {
          entry.title = g.title;
        }
      }
      renderQueue();
      resolve();
    }

    // 1. 先试 jsmediatags（MP3/FLAC/M4A 等 ID3 标签）
    if (typeof jsmediatags !== 'undefined') {
      try {
        jsmediatags.read(entry.file, {
          onSuccess: function(tag) {
            var t = tag.tags;
            if (t.title && t.title.trim()) entry.title = t.title.trim();
            if (t.artist && t.artist.trim()) entry.artist = t.artist.trim();
            if (t.picture) {
              try {
                var bytes;
                if (t.picture.data instanceof Uint8Array) bytes = t.picture.data;
                else if (t.picture.data instanceof ArrayBuffer) bytes = new Uint8Array(t.picture.data);
                else bytes = new Uint8Array(t.picture.data);
                var blob = new Blob([bytes], { type: t.picture.format || 'image/jpeg' });
                entry.coverBlob = blob;
                entry.coverUrl = URL.createObjectURL(blob);
              } catch(e) {}
            }
            if (t.lyrics && t.lyrics.lyrics && t.lyrics.lyrics.trim()) {
              entry.lyrics = t.lyrics.lyrics.trim();
              entry.lyricsSource = 'id3';
            }
            done();
          },
          onError: function() { done(); }
        });
      } catch(e) { done(); }
    } else {
      // 2. jsmediatags 没加载 → WAV 文件试 RIFF INFO
      var ext = entry.file.name.split('.').pop().toLowerCase();
      if (ext === 'wav' || ext === 'wave') {
        readWavRiff(entry.file).then(function(info) {
          if (info.title) entry.title = info.title;
          if (info.artist) entry.artist = info.artist;
          done();
        });
      } else {
        done();
      }
    }
  });
}

function renderQueue() {
  var el = document.getElementById('uploadQueue');
  var actions = document.getElementById('muActions');
  if (!el) return;
  if (!uploadQueue.length) { el.innerHTML = ''; actions.style.display = 'none'; return; }
  var readyCount = uploadQueue.filter(function(e) { return e.status === 'ready'; }).length;
  actions.style.display = 'flex';
  document.getElementById('muUploadAll').textContent = '全部上传 (' + readyCount + ')';

  el.innerHTML = uploadQueue.map(function(entry, i) {
    var statusIcon = { pending: '<i class="fas fa-clock" style="color:var(--text-dim)"></i>', extracting: '<i class="fas fa-spinner fa-spin" style="color:var(--grn)"></i>', ready: '<i class="fas fa-check-circle" style="color:var(--grn)"></i>', uploading: '<i class="fas fa-spinner fa-spin" style="color:var(--grn)"></i>', done: '<i class="fas fa-check-circle" style="color:#4ade80"></i>', error: '<i class="fas fa-exclamation-circle" style="color:#ff4444"></i>' }[entry.status] || '';
    var lyricsBadge = { none: '<span style="font-size:.7rem;color:var(--text-dim)">暂无歌词</span>', id3: '<span style="font-size:.7rem;color:var(--grn)">歌词: ID3 内嵌</span>', lrcfile: '<span style="font-size:.7rem;color:var(--grn)">歌词: LRC 文件匹配</span>', manual: '<span style="font-size:.7rem;color:#facc15">歌词: 手动输入</span>' }[entry.lyricsSource] || '';
    var statusText = entry.status === 'extracting' ? '读取中...' : (entry.status === 'uploading' ? '上传中...' : (entry.status === 'error' ? (entry.errorMsg || '失败') : ''));
    var name = entry.file.name.length > 40 ? entry.file.name.slice(0, 37) + '...' : entry.file.name;
    return '<div class="queue-card" style="display:flex;gap:12px;padding:12px;background:var(--blk);border-radius:6px;border:1px solid var(--border);align-items:flex-start">' +
      '<div class="qc-cover" style="width:64px;height:64px;border-radius:4px;overflow:hidden;flex-shrink:0;background:var(--blk-mid);display:flex;align-items:center;justify-content:center">' +
        (entry.coverUrl ? '<img src="' + entry.coverUrl + '" style="width:100%;height:100%;object-fit:cover">' : '<i class="fas fa-music" style="color:var(--text-dim);font-size:1.5rem"></i>') +
      '</div>' +
      '<div class="qc-info" style="flex:1;min-width:0">' +
        '<div style="font-size:.7rem;color:var(--text-dim);margin-bottom:4px">' + escHtml(name) + '</div>' +
        '<input value="' + escHtml(entry.title) + '" onchange="uploadQueue[' + i + '].title=this.value" placeholder="歌曲名" style="width:100%;padding:6px 8px;background:var(--blk-mid);border:1px solid var(--border);border-radius:4px;color:var(--text-bright);font-size:.85rem;margin-bottom:6px">' +
        '<input value="' + escHtml(entry.artist) + '" onchange="uploadQueue[' + i + '].artist=this.value" placeholder="艺术家" style="width:100%;padding:6px 8px;background:var(--blk-mid);border:1px solid var(--border);border-radius:4px;color:var(--text-bright);font-size:.85rem;margin-bottom:6px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
          lyricsBadge +
          '<span style="font-size:.7rem;color:var(--text-dim)">' + statusIcon + ' ' + statusText + '</span>' +
        '</div>' +
        '<textarea onchange="uploadQueue[' + i + '].lyrics=this.value;if(this.value.trim())uploadQueue[' + i + '].lyricsSource=\'manual\'" placeholder="粘贴 LRC 歌词（可选）..." style="width:100%;padding:6px 8px;background:var(--blk-mid);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:.78rem;min-height:40px;resize:vertical;font-family:monospace">' + escHtml(entry.lyricsSource !== 'none' ? entry.lyrics : '') + '</textarea>' +
        (entry.status === 'uploading' ? '<div class="qc-progress-bar" style="height:6px;background:var(--blk-mid);border-radius:3px;margin-top:8px;overflow:hidden"><div style="height:100%;width:' + (entry.progress || 0) + '%;background:var(--grn);border-radius:3px;transition:width .3s"></div></div><div style="font-size:.68rem;color:var(--text-dim);text-align:right;margin-top:2px">' + (entry.progress || 0) + '%</div>' : '') +
      '</div>' +
      '<button onclick="removeFromQueue(' + i + ')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:4px;font-size:1rem;flex-shrink:0" title="移除"><i class="fas fa-times"></i></button>' +
    '</div>';
  }).join('');
}

var _escDiv;
function escHtml(str) {
  if (!_escDiv) _escDiv = document.createElement('div');
  _escDiv.textContent = str || '';
  return _escDiv.innerHTML;
}

function removeFromQueue(i) {
  var entry = uploadQueue[i];
  if (entry && entry.coverUrl) URL.revokeObjectURL(entry.coverUrl);
  uploadQueue.splice(i, 1);
  renderQueue();
}

async function uploadAll() {
  var ready = uploadQueue.filter(function(e) { return e.status === 'ready'; });
  if (!ready.length) return;

  // Check if GitHub storage is available for large files
  var useGitHub = typeof githubUploadFile === 'function' && hasGitHubStorage();

  for (var i = 0; i < ready.length; i++) {
    var entry = ready[i];
    entry.status = 'uploading';
    entry.progress = 0;
    renderQueue();
    try {
      var ts = Date.now();
      var ext = entry.file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!ext) ext = 'mp3';
      var safeName = (entry.title || 'audio').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeName) safeName = 'audio';
      var audioPath = ts + '_' + safeName + '.' + ext;

      // Upload audio: prefer GitHub for large files (>10MB), Supabase for small files
      var audioUrl;
      var fileSizeMB = entry.file.size / 1024 / 1024;
      if (useGitHub && fileSizeMB > 10) {
        // Use GitHub for large audio files (bypasses Supabase 50MB limit, GitHub allows up to 100MB)
        audioUrl = await githubUploadFile(entry.file, 'public/music', audioPath, function(pct) {
          entry.progress = Math.floor(pct * 0.8);
          renderQueue();
        });
      } else {
        audioUrl = await uploadFileWithProgress('music', audioPath, entry.file, function(pct) {
          entry.progress = Math.floor(pct * 0.8);
          renderQueue();
        });
      }

      // Upload cover (always Supabase — covers are small)
      var coverUrl = '';
      if (entry.coverBlob) {
        var coverExt = entry.coverBlob.type.split('/')[1] || 'jpg';
        var coverPath = ts + '_' + safeName + '_cover.' + coverExt;
        coverUrl = await uploadFileWithProgress('covers', coverPath, entry.coverBlob, function(pct) {
          entry.progress = 80 + Math.floor(pct * 0.15);
          renderQueue();
        });
      }

      entry.progress = 95;
      renderQueue();

      await dbInsert('music', {
        title: entry.title,
        artist: entry.artist,
        duration: '',
        audio_url: audioUrl,
        cover_url: coverUrl,
        lyrics: entry.lyrics,
        uploaded_by: window._currentUser.id
      });

      entry.progress = 100;
      entry.status = 'done';
      renderQueue();
    } catch(e) {
      entry.status = 'error';
      var msg = e.message || '上传失败';
      if (msg.includes('Payload') || msg.includes('413') || msg.includes('size') || msg.includes('exceed') || msg.includes('too large')) {
        msg = '文件过大：超出服务器限制。免费套餐单文件上限约 50MB，可配置 GitHub Token 上传大文件。(' + msg + ')';
      }
      if (msg.includes('Token') || msg.includes('unauthorized')) {
        msg = 'GitHub Token 无效。请在下方设置中重新输入。';
      }
      entry.errorMsg = msg;
      renderQueue();
    }
  }
  setTimeout(function() {
    uploadQueue = uploadQueue.filter(function(e) { return e.status !== 'done'; });
    renderQueue();
  }, 2500);
  await loadAdminMusic();
}

/* ─── Comments ──────────────────────────────────────── */
async function loadAdminComments() {
  try {
    const data = await dbSelect('comments', { order: { col: 'created_at', dir: 'desc' } });
    document.getElementById('dashComments').textContent = (data || []).length;
    const tbody = document.getElementById('commentsBody');
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">暂无留言</div></td></tr>'; return; }
    let html = '';
    for (const c of data) {
      let username = '匿名';
      try {
        const p = await dbSelect('profiles', { eq: { col: 'id', val: c.user_id }, single: true });
        if (p) username = p.username;
      } catch {}
      html += '<tr><td style="color:var(--grn)">' + username + '</td>' +
        '<td>' + (c.content || '').slice(0, 60) + '</td>' +
        '<td style="color:var(--text-dim)">—</td>' +
        '<td>' + (c.created_at ? new Date(c.created_at).toLocaleDateString('zh-CN') : '') + '</td>' +
        '<td><button class="btn btn-danger btn-sm" onclick="deleteComment(\'' + c.id + '\')">删除</button></td></tr>';
    }
    tbody.innerHTML = html;
  } catch {}
}

async function deleteComment(id) {
  if (!confirm('确定删除？')) return;
  await dbDelete('comments', 'id', id);
  await loadAdminComments();
}
