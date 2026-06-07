/* ─── GitHub Git Data API · Music Storage ───────────── */
const GH_REPO_OWNER = 'O9DDDD';
const GH_REPO_NAME = 'N1tyN1ne';
const GH_MUSIC_PATH = 'public/music';   // folder in repo for music files
const GH_COVER_PATH = 'public/covers';   // folder for cover images

/* Load/save PAT from localStorage (admin only, minimal scope) */
function getGitHubPAT() {
  try {
    return localStorage.getItem('gh_pat') || '';
  } catch(e) { return ''; }
}

function setGitHubPAT(token) {
  try {
    localStorage.setItem('gh_pat', token);
  } catch(e) {}
}

function hasGitHubStorage() {
  return !!getGitHubPAT();
}

/* ─── Low-level helpers ─────────────────────────────── */

async function ghApi(path, opts) {
  var pat = getGitHubPAT();
  if (!pat) throw new Error('未配置 GitHub Token');
  var url = 'https://api.github.com' + path;
  var headers = {
    'Authorization': 'Bearer ' + pat,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (opts.body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  var r = await fetch(url, { method: opts.method || 'GET', headers: headers, body: opts.body });
  if (r.status >= 400) {
    var d;
    try { d = await r.json(); } catch(e) { d = {}; }
    var msg = d.message || ('HTTP ' + r.status);
    if (r.status === 401) msg = 'GitHub Token 无效或已过期，请重新设置。';
    if (r.status === 403 && msg.includes('rate limit')) msg = 'GitHub API 限流，请稍后再试。';
    if (r.status === 422 && msg.includes('larger')) msg = '文件过大（GitHub 上限 100MB），请压缩后重试。';
    throw new Error(msg);
  }
  if (r.status === 204 || r.status === 200 && r.headers.get('content-length') === '0') return null;
  return r.json();
}

/* Convert File/Blob to base64 string (chunked for memory) */
function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      // Remove data:...;base64, prefix
      var b64 = reader.result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Core upload ───────────────────────────────────── */

/**
 * Upload a file to GitHub repo at public/music/filename
 * Returns jsDelivr CDN URL
 */
async function githubUploadFile(file, folder, filename, onProgress) {
  folder = folder || GH_MUSIC_PATH;
  var path = folder + '/' + filename;

  // 1. Encode file as base64
  if (onProgress) onProgress(5);
  var b64 = await fileToBase64(file);
  if (onProgress) onProgress(25);

  // 2. Create blob
  var blobResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/blobs', {
    method: 'POST',
    body: { content: b64, encoding: 'base64' }
  });
  if (onProgress) onProgress(50);

  // 3. Get latest commit (the parent)
  var refResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs/heads/main');
  var parentSha = refResp.object.sha;
  var commitResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/commits/' + parentSha);
  var baseTreeSha = commitResp.tree.sha;
  if (onProgress) onProgress(65);

  // 4. Create new tree that adds our file
  var treeResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/trees', {
    method: 'POST',
    body: {
      base_tree: baseTreeSha,
      tree: [{ path: path, mode: '100644', type: 'blob', sha: blobResp.sha }]
    }
  });
  if (onProgress) onProgress(80);

  // 5. Create commit
  var newCommitResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/commits', {
    method: 'POST',
    body: {
      message: 'upload: ' + filename,
      tree: treeResp.sha,
      parents: [parentSha]
    }
  });
  if (onProgress) onProgress(90);

  // 6. Update ref
  await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs/heads/main', {
    method: 'PATCH',
    body: { sha: newCommitResp.sha, force: false }
  });
  if (onProgress) onProgress(100);

  // Return jsDelivr CDN URL (may take a few seconds to cache)
  return 'https://cdn.jsdelivr.net/gh/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '@main/' + path;
}

/**
 * Batch upload multiple files. Files uploaded sequentially to avoid merge conflicts.
 */
async function githubUploadAll(entries, onEntryProgress) {
  var results = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var url = await githubUploadFile(e.file, e.folder, e.filename, function(pct) {
      if (onEntryProgress) onEntryProgress(i, pct);
    });
    results.push(url);
  }
  return results;
}
