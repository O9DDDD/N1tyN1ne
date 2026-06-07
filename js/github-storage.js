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

  // Quick token check
  try { await ghApi('/user'); } catch(e) {
    throw new Error('GitHub Token 无效或已过期，请重新设置。');
  }

  var releaseId = await getOrCreateMVRelease();
  var fileSizeMB = file.size / 1024 / 1024;

  // Strategy 1: Try api.github.com for release asset upload (supports CORS)
  if (onProgress) onProgress(1);
  var apiResult = await _tryApiUpload(releaseId, file, filename, pat, onProgress);
  if (apiResult) return apiResult;

  // Strategy 2: Chunked upload via Git Blob API (works for any size)
  if (onProgress) onProgress(0);
  return await githubUploadChunked(file, filename, onProgress);
}

/** Try uploading release asset via api.github.com (supports CORS, unlike uploads subdomain) */
async function _tryApiUpload(releaseId, file, filename, pat, onProgress) {
  try {
    var url = 'https://api.github.com/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/releases/' + releaseId + '/assets?name=' + encodeURIComponent(filename);

    return await new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', 'Bearer ' + pat);
      xhr.setRequestHeader('Accept', 'application/vnd.github+json');
      // Let browser set Content-Type automatically for the file

      if (onProgress) {
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            onProgress(Math.min(Math.round(e.loaded / e.total * 100), 99));
          }
        };
      }

      xhr.onload = function() {
        if (xhr.status === 201) {
          if (onProgress) onProgress(100);
          var asset = JSON.parse(xhr.responseText);
          resolve(asset.browser_download_url);
        } else if (xhr.status === 404 || xhr.status === 405) {
          // api.github.com doesn't support this endpoint — expected
          resolve(null);
        } else {
          var msg = null;
          try { var d = JSON.parse(xhr.responseText); msg = d.message; } catch(e) {}
          // 4xx/5xx that isn't 404/405 means the endpoint exists but rejected us
          if (xhr.status >= 400) {
            console.warn('api.github.com release upload returned ' + xhr.status + ': ' + (msg || ''));
          }
          resolve(null);
        }
      };
      xhr.onerror = function() { resolve(null); };
      xhr.ontimeout = function() { resolve(null); };
      xhr.timeout = 30000; // 30s quick timeout — if this endpoint works, it'll respond fast
      xhr.send(file);
    });
  } catch(e) {
    return null;
  }
}

/* ─── Chunked Upload ─────────────────────────────────── */
var CHUNK_SIZE = 15 * 1024 * 1024; // 15MB per chunk (base64 ~20MB, well under limits)

/**
 * Upload file in chunks via Contents API (PUT /repos/.../contents/...).
 * Each chunk is a separate file; a manifest.json ties them together.
 * This avoids the Git Blob JSON payload issue — Contents API is more robust.
 */
async function githubUploadChunked(file, filename, onProgress) {
  var pat = getGitHubPAT();
  if (!pat) throw new Error('未配置 GitHub Token');

  var ts = Date.now();
  var safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30);
  var dir = 'public/mv/' + ts + '_' + safeName;
  var totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  if (onProgress) onProgress(1);

  // Upload each chunk via Contents API (auto-handles blob+tree+commit+branch update)
  for (var i = 0; i < totalChunks; i++) {
    var start = i * CHUNK_SIZE;
    var end = Math.min(start + CHUNK_SIZE, file.size);
    var chunk = file.slice(start, end);
    var chunkName = 'chunk_' + String(i).padStart(4, '0');
    var path = dir + '/' + chunkName;

    var b64 = await fileToBase64(chunk);

    await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/contents/' + path, {
      method: 'PUT',
      body: {
        message: 'chunk ' + (i + 1) + '/' + totalChunks + ' of ' + filename,
        content: b64,
        branch: 'main'
      }
    });

    if (onProgress) onProgress(Math.round((i + 1) / (totalChunks + 1) * 95));
  }

  // Upload manifest file
  var manifest = JSON.stringify({
    v: 1,
    totalChunks: totalChunks,
    name: filename,
    size: file.size,
    type: file.type || 'video/mp4'
  });
  var manifestB64 = btoa(unescape(encodeURIComponent(manifest)));
  var manifestPath = dir + '.manifest.json';

  await ghApi('/repos/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '/contents/' + manifestPath, {
    method: 'PUT',
    body: {
      message: 'manifest for ' + filename,
      content: manifestB64,
      branch: 'main'
    }
  });

  if (onProgress) onProgress(100);

  return 'https://cdn.jsdelivr.net/gh/' + GH_REPO_OWNER + '/' + GH_REPO_NAME + '@main/' + manifestPath;
}
