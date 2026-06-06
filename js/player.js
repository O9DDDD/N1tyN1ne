/* ─── Music Player with LRC Lyrics ──────────────────── */
const player = {
  audio: new Audio(),
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  shuffle: false,
  repeat: false,
  lyrics: [],        // [{time: seconds, text: string}]
  lyricsTimer: null,

  init() {
    this.audio.volume = 0.7;
    this.audio.addEventListener('timeupdate', () => this.tick());
    this.audio.addEventListener('loadedmetadata', () => this.updateMeta());
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('play', () => this.onPlay());
    this.audio.addEventListener('pause', () => this.onPause());
    const vs = document.getElementById('volumeSlider');
    if (vs) vs.value = 0.7;
  },

  load(tracks) {
    this.playlist = tracks || [];
    this.renderPlaylist();
  },

  addTracks(tracks) {
    this.playlist.push(...(tracks || []));
    this.renderPlaylist();
  },

  play(idx) {
    if (idx === undefined) {
      if (!this.playlist.length) return;
      idx = this.currentIndex < 0 ? 0 : this.currentIndex;
    }
    this.currentIndex = idx;
    const t = this.playlist[idx];
    if (!t) return;
    this.audio.src = t.audio_url;
    this.audio.load();
    this.audio.play().catch(() => {});
    this.updateInfo(t);
    this.parseLyrics(t.lyrics || '');
    this.renderPlaylist();
  },

  toggle() {
    if (!this.playlist.length) return;
    if (this.currentIndex < 0) { this.play(0); return; }
    this.audio.paused ? this.audio.play().catch(() => {}) : this.audio.pause();
  },

  prev() {
    if (!this.playlist.length) return;
    let i = this.currentIndex - 1;
    if (i < 0) i = this.playlist.length - 1;
    this.play(i);
  },

  next() {
    if (!this.playlist.length) return;
    if (this.repeat && this.currentIndex >= 0) { this.play(this.currentIndex); return; }
    let i;
    if (this.shuffle) {
      do { i = Math.floor(Math.random() * this.playlist.length); }
      while (i === this.currentIndex && this.playlist.length > 1);
    } else {
      i = this.currentIndex + 1;
      if (i >= this.playlist.length) i = 0;
    }
    this.play(i);
  },

  seek(e) {
    const bar = document.getElementById('progressBar');
    const rect = bar.getBoundingClientRect();
    this.audio.currentTime = ((e.clientX - rect.left) / rect.width) * (this.audio.duration || 0);
  },

  setVolume(v) { this.audio.volume = parseFloat(v); },

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    const el = document.getElementById('shuffleBtn');
    if (el) el.style.color = this.shuffle ? 'var(--grn)' : '';
  },

  toggleRepeat() {
    this.repeat = !this.repeat;
    const el = document.getElementById('repeatBtn');
    if (el) el.style.color = this.repeat ? 'var(--grn)' : '';
  },

  onPlay() {
    this.isPlaying = true;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('playerCover')?.classList.add('playing');
    this.startLyrics();
  },

  onPause() {
    this.isPlaying = false;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('playerCover')?.classList.remove('playing');
    this.stopLyrics();
  },

  updateInfo(t) {
    document.getElementById('songTitle').textContent = t.title || '未选择';
    document.getElementById('songArtist').textContent = t.artist || '—';
    const img = document.getElementById('coverImg');
    if (t.cover_url) { img.src = t.cover_url; }
    else { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%231a1a1a" width="200" height="200"/><text x="100" y="115" text-anchor="middle" font-size="50" fill="%2300d95a">♪</text></svg>'; }
  },

  tick() {
    const ct = this.audio.currentTime, dur = this.audio.duration || 0;
    const pct = dur ? (ct / dur) * 100 : 0;
    const pf = document.getElementById('progressFill');
    const pt = document.getElementById('progressThumb');
    if (pf) pf.style.width = pct + '%';
    if (pt) pt.style.left = pct + '%';
    document.getElementById('currentTime').textContent = this.fmt(ct);
  },

  updateMeta() {
    document.getElementById('totalTime').textContent = this.fmt(this.audio.duration);
  },

  fmt(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  },

  /* ─── LRC Parser ──────────────────────────────────── */
  parseLyrics(lrcText) {
    this.lyrics = [];
    if (!lrcText || !lrcText.trim()) {
      this.lyrics = [];
      this.renderLyrics();
      return;
    }
    const lines = lrcText.split('\n');
    const timeRe = /\[(\d{1,3}):(\d{2})(?:\.(\d{2,3}))?\]/;
    for (const line of lines) {
      const match = line.match(timeRe);
      if (!match) continue;
      const min = parseInt(match[1]), sec = parseInt(match[2]);
      const ms = parseInt(match[3] || '0');
      const time = min * 60 + sec + ms / (match[3] && match[3].length === 3 ? 1000 : 100);
      const text = line.replace(timeRe, '').trim();
      if (text) this.lyrics.push({ time, text });
    }
    this.lyrics.sort((a, b) => a.time - b.time);
    this.renderLyrics();
  },

  renderLyrics() {
    const el = document.getElementById('lyricsContainer');
    if (!el) return;
    if (!this.lyrics.length) {
      el.innerHTML = '<div class="no-lyrics">暂无歌词</div>';
      return;
    }
    el.innerHTML = this.lyrics.map((l, i) =>
      `<div class="lyric-line" data-idx="${i}">${l.text}</div>`
    ).join('');
  },

  startLyrics() {
    this.stopLyrics();
    if (!this.lyrics.length) return;
    this.lyricsTimer = setInterval(() => this.syncLyrics(), 100);
  },

  stopLyrics() {
    if (this.lyricsTimer) { clearInterval(this.lyricsTimer); this.lyricsTimer = null; }
  },

  syncLyrics() {
    const ct = this.audio.currentTime;
    let activeIdx = -1;
    for (let i = this.lyrics.length - 1; i >= 0; i--) {
      if (ct >= this.lyrics[i].time) { activeIdx = i; break; }
    }
    const el = document.getElementById('lyricsContainer');
    if (!el) return;
    const lines = el.querySelectorAll('.lyric-line');
    lines.forEach((l, i) => {
      l.className = 'lyric-line' +
        (i === activeIdx ? ' active' : '') +
        (i === activeIdx - 1 ? ' prev' : '') +
        (i === activeIdx + 1 ? ' prev' : '');
    });
    if (activeIdx >= 0) {
      const active = lines[activeIdx];
      if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  },

  /* ─── Playlist UI ─────────────────────────────────── */
  renderPlaylist() {
    const el = document.getElementById('playlistItems');
    if (!el) return;
    el.innerHTML = '';
    this.playlist.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'pl-item' + (i === this.currentIndex ? ' active' : '');
      div.innerHTML = `
        <div class="pl-idx">${i === this.currentIndex && this.isPlaying ? '<i class="fas fa-play" style="font-size:10px"></i>' : (i + 1)}</div>
        <div class="pl-i"><div class="pl-t">${t.title || '未知'}</div><div class="pl-a">${t.artist || '未知'}</div></div>
        <div class="pl-d">${t.duration || '--:--'}</div>
      `;
      div.onclick = () => this.play(i);
      el.appendChild(div);
    });
  }
};
