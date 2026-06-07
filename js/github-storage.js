/* ─── GitHub Git Data API · Music Storage ───────────── */
const GH_REPO_OWNER = 'O9DDDD';
const GH_REPO_NAME = 'N1tyN1ne';
const GH_MUSIC_PATH = 'public/music';   // folder in repo for music files
const GH_COVER_PATH = 'public/covers';   // folder for cover images
const GH_MV_PATH = 'public/mv';         // folder for MV video files

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
  opts = opts || {};
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

/* ─── GitHub Releases · Large File Upload (up to 2GB) ── */
var _mvReleaseId = null;
var _mvReleaseTag = 'mv-storage';

/**
 * Get or create the MV storage release.
 * A hidden (draft) release acts as a file bucket for large MV files.
 */
async function getOrCreateMVRelease() {
  if (_mvReleaseId) return _mvReleaseId;

  var pat = getGitHubPAT();
  if (!pat) throw new Error('未配置 GitHub Token');

  // Try to find existing release by tag
  try {
    var existing = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/releases/tags/' + _mvReleaseTag);
    if (existing && existing.id) {
      _mvReleaseId = existing.id;
      return _mvReleaseId;
    }
  } catch(e) {
    // Not found — create one
  }

  // Create a new draft release (hidden, not shown on repo page)
  var release = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/releases', {
    method: 'POST',
    body: {
      tag_name: _mvReleaseTag,
      name: 'MV Storage',
      body: 'Auto-managed MV file storage. Do not delete this release.',
      draft: true,
      prerelease: false
    }
  });
  _mvReleaseId = release.id;

  // Also create the lightweight tag if it doesn't exist
  try {
    await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs/tags/' + _mvReleaseTag);
  } catch(e) {
    // Tag doesn't exist yet — create it pointing to main
    try {
      var mainRef = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs/heads/main');
      await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs', {
        method: 'POST',
        body: { ref: 'refs/tags/' + _mvReleaseTag, sha: mainRef.object.sha }
      });
    } catch(e2) {
      // Tag already exists or other error — release creation succeeded anyway
    }
  }

  return _mvReleaseId;
}

/**
 * Upload a file as a GitHub Release asset (up to 2GB).
 * Pre-checks connectivity to uploads.github.com; falls back to Git API for ≤100MB files.
 * Returns the direct download URL.
 */
async function githubUploadReleaseAsset(file, filename, onProgress) {
  var pat = getGitHubPAT();
  if (!pat) throw new Error('未配置 GitHub Token');

  // Quick token check first
  try {
    await ghApi('/user');
  } catch(e) {
    throw new Error('GitHub Token 无效或已过期，请重新设置。');
  }

  var releaseId = await getOrCreateMVRelease();
  var fileSizeMB = file.size / 1024 / 1024;

  // Test connectivity to uploads subdomain
  var canReachUploads = await _testUploadsConnectivity();

  if (canReachUploads) {
    // Try Release Asset upload with progress
    try {
      var assetUrl = await _xhrUploadAsset(releaseId, file, filename, pat, onProgress);
      return assetUrl;
    } catch(xhrErr) {
      console.warn('Release asset XHR failed:', xhrErr.message);
    }
  } else {
    console.warn('uploads.github.com unreachable, skipping Release API');
  }

  // Fallback for files ≤100MB: Git Blob API (api.github.com)
  if (fileSizeMB <= 100) {
    if (onProgress) onProgress(5);
    try {
      var cdnUrl = await githubUploadFile(file, 'public/mv', filename, function(pct) {
        if (onProgress) onProgress(5 + Math.floor(pct * 0.95));
      });
      return cdnUrl;
    } catch(blobErr) {
      console.warn('Git Blob fallback failed:', blobErr.message);
      throw new Error('GitHub 上传失败：' + (blobErr.message || '未知错误'));
    }
  }

  // >100MB and uploads subdomain unreachable → chunked upload
  if (onProgress) onProgress(0);
  try {
    var manifestUrl = await githubUploadChunked(file, filename, function(pct) {
      if (onProgress) onProgress(pct);
    });
    return manifestUrl;
  } catch(chunkErr) {
    console.warn('Chunked upload failed:', chunkErr.message);
    throw new Error(
      '分片上传失败（' + fileSizeMB.toFixed(0) + 'MB）：' + (chunkErr.message || '未知错误') + '\n\n' +
      '建议：将 MV 压缩到 100MB 以下'
    );
  }
}

/** Quick connectivity test: can we reach uploads.github.com? */
async function _testUploadsConnectivity() {
  try {
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 3000);
    await fetch('https://uploads.github.com/', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(timeout);
    return true;
  } catch(e) {
    return false;
  }
}

function _xhrUploadAsset(releaseId, file, filename, pat, onProgress) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    // Key: avoid CORS preflight by NOT sending custom headers.
    // Token passed as query param (deprecated but uploads.github.com still accepts it).
    // Content-Type forced to text/plain (a "simple" type per CORS spec).
    // This combination = simple request → no OPTIONS preflight → no CORS block.
    var url = 'https://uploads.github.com/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/releases/' + releaseId + '/assets?name=' + encodeURIComponent(filename) + '&access_token=' + encodeURIComponent(pat);

    xhr.open('POST', url);
    // Must be a simple Content-Type to avoid preflight
    xhr.setRequestHeader('Content-Type', 'text/plain');

    if (onProgress) {
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          var pct = Math.round(e.loaded / e.total * 100);
          onProgress(Math.min(pct, 99));
        }
      };
    }

    xhr.onload = function() {
      if (xhr.status === 201) {
        if (onProgress) onProgress(100);
        var asset = JSON.parse(xhr.responseText);
        resolve(asset.browser_download_url);
      } else if (xhr.status === 0) {
        reject(new Error('请求被阻止（CORS 或网络不通）'));
      } else {
        var msg = '上传失败 (HTTP ' + xhr.status + ')';
        try {
          var d = JSON.parse(xhr.responseText);
          msg = d.message || d.errors?.[0]?.message || msg;
          if (msg.includes('size')) msg = '文件过大：GitHub Release 单文件上限为 2GB。';
          if (msg.includes('rate')) msg = 'GitHub API 限流，请稍后再试。';
          if (msg.includes('401') || msg.includes('Bad credentials')) msg = 'GitHub Token 无效或已过期。';
        } catch(e) {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = function() { reject(new Error('网络不通：无法访问 uploads.github.com')); };
    xhr.ontimeout = function() { reject(new Error('上传超时，文件过大或网速太慢')); };
    xhr.timeout = 7200000;
    xhr.send(file);
  });
}

/* ─── Chunked Upload (for files >100MB when uploads.github.com is blocked) ── */
var CHUNK_SIZE = 45 * 1024 * 1024; // 45MB per chunk (safe under 100MB blob limit)

/**
 * Upload a large file in chunks via Git Blob API.
 * Creates a manifest JSON + all chunk blobs in a single commit.
 * Returns jsDelivr URL to the manifest file.
 * Player side: fetches manifest, downloads chunks, concatenates via MediaSource.
 */
async function githubUploadChunked(file, filename, onProgress) {
  var pat = getGitHubPAT();
  if (!pat) throw new Error('未配置 GitHub Token');

  var ts = Date.now();
  var safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);
  var totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  var chunkSHAs = [];
  var chunkPaths = [];

  if (onProgress) onProgress(0);

  // Phase 1: Upload all chunk blobs (0-80%)
  for (var i = 0; i < totalChunks; i++) {
    var start = i * CHUNK_SIZE;
    var end = Math.min(start + CHUNK_SIZE, file.size);
    var chunk = file.slice(start, end);

    // Convert chunk to base64
    var b64 = await fileToBase64(chunk);

    // Create blob
    var blobResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/blobs', {
      method: 'POST',
      body: { content: b64, encoding: 'base64' }
    });

    chunkSHAs.push(blobResp.sha);
    var chunkName = 'chunk_' + String(i).padStart(4, '0');
    chunkPaths.push('public/mv/' + ts + '_' + safeName + '/' + chunkName);

    if (onProgress) onProgress(Math.round((i + 1) / totalChunks * 80));
  }

  // Phase 2: Create manifest JSON (80-85%)
  var manifest = JSON.stringify({
    v: 1,
    chunks: chunkSHAs,
    name: filename,
    size: file.size,
    type: file.type || 'video/mp4'
  });
  var manifestB64 = btoa(unescape(encodeURIComponent(manifest)));
  var manifestBlob = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/blobs', {
    method: 'POST',
    body: { content: manifestB64, encoding: 'base64' }
  });
  if (onProgress) onProgress(83);

  // Phase 3: Create tree + commit with all chunks and manifest (85-100%)
  // Build tree entries
  var treeEntries = [];
  // Add folder for chunks
  for (var j = 0; j < chunkPaths.length; j++) {
    treeEntries.push({
      path: chunkPaths[j],
      mode: '100644',
      type: 'blob',
      sha: chunkSHAs[j]
    });
  }
  // Add manifest file
  var manifestPath = 'public/mv/' + ts + '_' + safeName + '.manifest.json';
  treeEntries.push({
    path: manifestPath,
    mode: '100644',
    type: 'blob',
    sha: manifestBlob.sha
  });

  var mainRef = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs/heads/main');
  var baseCommit = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/commits/' + mainRef.object.sha);

  if (onProgress) onProgress(88);

  var treeResp = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/trees', {
    method: 'POST',
    body: { base_tree: baseCommit.tree.sha, tree: treeEntries }
  });

  if (onProgress) onProgress(93);

  var newCommit = await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/commits', {
    method: 'POST',
    body: { message: 'upload(chunked): ' + filename, tree: treeResp.sha, parents: [mainRef.object.sha] }
  });

  await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/git/refs/heads/main', {
    method: 'PATCH',
    body: { sha: newCommit.sha, force: false }
  });

  if (onProgress) onProgress(100);

  // Return jsDelivr URL to manifest
  return 'https://cdn.jsdelivr.net/gh/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '@main/' + manifestPath;
}
