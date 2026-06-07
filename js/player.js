/* ─── Unified Music Player ───────────────────────────── */
const Player = {
  audio: new Audio(),
  tracks: [],
  idx: -1,
  playing: false,
  shuffle: false,
  repeat: false,
  lyrics: [],
  lyricTimer: null,
  _listeners: {},

  /* ─── Init ────────────────────────────────────────── */
  init() {
    this.audio.volume = 0.7;
    this.audio.addEventListener('timeupdate', () => this._tick());
    this.audio.addEventListener('loadedmetadata', () => this._emit('durupdate'));
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('play', () => this._onPlay());
    this.audio.addEventListener('pause', () => this._onPause());
    this.audio.addEventListener('error', () => { if (this.tracks.length) this.next(); });
    this._restoreState();
    this._renderFloat();
  },

  /* ─── Event system ────────────────────────────────── */
  on(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
  _emit(ev, data) { (this._listeners[ev] || []).forEach(fn => fn(data)); },

  /* ─── Load tracks ─────────────────────────────────── */
  async load() {
    try {
      const data = await dbSelect('music', { order: { col: 'created_at', dir: 'desc' } });
      this.tracks = (data || []).reverse();
      this._renderFloat();
      this._emit('playlist');
      // Restore playing if we had state
      const st = this._getState();
      if (st && st.playing && st.idx >= 0 && st.idx < this.tracks.length) {
        this.idx = st.idx;
        this.audio.src = https(this.tracks[st.idx]?.audio_url || '');
        if (st.pos > 0) { this.audio.currentTime = st.pos; }
        this.audio.play().catch(() => {});
        this._updateInfo();
        this.parseLyrics(this.tracks[st.idx]?.lyrics || '');
      } else {
        if (this.tracks.length) document.getElementById('noLyrics') && (document.getElementById('noLyrics').textContent = '选择一首歌开始');
      }
    } catch(e) {
      const el = document.getElementById('noLyrics');
      if (el) el.textContent = '加载失败，请刷新重试';
    }
  },

  /* ─── Playback ────────────────────────────────────── */
  play(i) {
    if (!this.tracks.length) return;
    this.idx = i;
    const t = this.tracks[i];
    if (!t) return;
    this.audio.src = https(t.audio_url);
    this.audio.load();
    this.audio.play().catch(() => {});
    this._updateInfo();
    this.parseLyrics(t.lyrics || '');
    this._saveState();
    this._emit('playlist');
    this._renderFloat();
  },

  toggle() {
    if (!this.tracks.length) return;
    if (this.idx < 0) { this.play(0); return; }
    this.audio.paused ? this.audio.play().catch(() => {}) : this.audio.pause();
  },

  prev() {
    if (!this.tracks.length) return;
    let i = this.idx - 1;
    if (i < 0) i = this.tracks.length - 1;
    this.play(i);
  },

  next() {
    if (!this.tracks.length) return;
    if (this.repeat && this.idx >= 0) { this.play(this.idx); return; }
    let i;
    if (this.shuffle) {
      do { i = Math.floor(Math.random() * this.tracks.length); }
      while (i === this.idx && this.tracks.length > 1);
    } else {
      i = this.idx + 1;
      if (i >= this.tracks.length) i = 0;
    }
    this.play(i);
  },

  seek(e) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = frac * (this.audio.duration || 0);
  },

  setVolume(v) { this.audio.volume = parseFloat(v); this._saveState(); },

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this._saveState();
    this._emit('playlist');
  },

  toggleRepeat() {
    this.repeat = !this.repeat;
    this._saveState();
    this._emit('playlist');
  },

  /* ─── Internal ────────────────────────────────────── */
  _onPlay() {
    this.playing = true;
    this._saveState();
    this._emit('play');
    this._syncLyrics();
    this._renderFloat();
  },
  _onPause() {
    this.playing = false;
    this._saveState();
    this._emit('pause');
    if (this.lyricTimer) { clearInterval(this.lyricTimer); this.lyricTimer = null; }
    this._renderFloat();
  },

  _tick() {
    const ct = this.audio.currentTime, dur = this.audio.duration || 0;
    const pct = dur ? (ct / dur) * 100 : 0;
    this._emit('tick', { ct, dur, pct });
    this._renderFloat();
    this._saveState();
  },

  _updateInfo() {
    const t = this.tracks[this.idx];
    if (!t) return;
    this._emit('track', t);
  },

  /* ─── State persistence ───────────────────────────── */
  _saveState() {
    try {
      sessionStorage.setItem('player_state', JSON.stringify({
        idx: this.idx,
        pos: this.audio.currentTime || 0,
        playing: this.playing,
        shuffle: this.shuffle,
        repeat: this.repeat,
        vol: this.audio.volume
      }));
    } catch(e) {}
  },
  _getState() {
    try { return JSON.parse(sessionStorage.getItem('player_state')); } catch(e) { return null; }
  },
  _restoreState() {
    const st = this._getState();
    if (st) {
      this.shuffle = st.shuffle || false;
      this.repeat = st.repeat || false;
      this.audio.volume = st.vol || 0.7;
    }
  },

  /* ─── LRC Lyrics Parser ───────────────────────────── */
  parseLyrics(lrcText) {
    this.lyrics = [];
    if (!lrcText || !lrcText.trim()) {
      this._emit('lyrics', []);
      return;
    }
    // NFKC normalize — fixes Kangxi radicals → standard CJK (e.g., ⼼→心, ⾥→里, ⿊→黑)
    const normalized = lrcText.normalize('NFKC');
    const lines = normalized.split('\n');
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
    this._emit('lyrics', this.lyrics);
  },

  getCurrentLyric() {
    const ct = this.audio.currentTime;
    let active = null;
    for (const l of this.lyrics) {
      if (ct >= l.time) active = l;
    }
    return active;
  },

  _syncLyrics() {
    if (this.lyricTimer) clearInterval(this.lyricTimer);
    if (!this.lyrics.length) return;
    this.lyricTimer = setInterval(() => {
      const ct = this.audio.currentTime;
      let activeIdx = -1;
      for (let i = this.lyrics.length - 1; i >= 0; i--) {
        if (ct >= this.lyrics[i].time) { activeIdx = i; break; }
      }
      this._emit('lyricsync', activeIdx);
    }, 200);
  },

  /* ─── Formatting ──────────────────────────────────── */
  fmt(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  },

  /* ─── Floating Mini Player ────────────────────────── */
  _renderFloat() {
    const el = document.getElementById('floatPlayer');
    if (!el) return;
    const hasTracks = this.tracks.length > 0;
    const hasActive = this.idx >= 0 && this.tracks[this.idx];
    if (!hasTracks) { el.classList.remove('show'); return; }
    el.classList.add('show');

    const t = hasActive ? this.tracks[this.idx] : null;
    const cover = el.querySelector('.fp-cover');
    const title = el.querySelector('.fp-title');
    const lyric = el.querySelector('.fp-lyric');
    const bar = el.querySelector('.fp-bar');
    const playIcon = el.querySelector('#fpPlayIcon');

    if (cover) {
      cover.src = t?.cover_url ? https(t.cover_url) : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23f3f0eb" width="40" height="40"/><text x="20" y="26" text-anchor="middle" font-size="16" fill="%236b8e5a">♪</text></svg>';
      cover.classList.toggle('playing', this.playing);
    }
    if (title) title.textContent = t?.title || '未选择';
    if (lyric) {
      const cl = this.getCurrentLyric();
      lyric.textContent = cl ? cl.text : (t?.artist || '');
    }
    if (bar) {
      const dur = this.audio.duration || 0;
      bar.style.width = (dur ? (this.audio.currentTime / dur) * 100 : 0) + '%';
    }
    if (playIcon) {
      playIcon.className = 'fas fa-' + (this.playing ? 'pause' : 'play');
    }
  },

  /* ─── 3D Tilt for cover card ──────────────────────── */
  initTilt(el) {
    if (!el) return;
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -12;
      const ry = ((x - cx) / cx) * 12;
      el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
      // Gloss follow
      const gloss = el.querySelector('.tilt-gloss');
      if (gloss) {
        gloss.style.background = `radial-gradient(circle at ${(x/rect.width)*100}% ${(y/rect.height)*100}%, rgba(255,255,255,.4) 0%, transparent 60%)`;
      }
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      const gloss = el.querySelector('.tilt-gloss');
      if (gloss) gloss.style.background = 'transparent';
    });
  }
};

/* Backwards-compat aliases */
const AudioPlayer = {
  init() { Player.init(); },
  load(tracks) { Player.tracks = tracks || []; Player._emit('playlist'); Player._renderFloat(); },
  play(i) { Player.play(i); },
  toggle() { Player.toggle(); },
  prev() { Player.prev(); },
  next() { Player.next(); },
  seek(e) { Player.seek(e); },
  setVolume(v) { Player.setVolume(v); },
  toggleShuffle() { Player.toggleShuffle(); },
  toggleRepeat() { Player.toggleRepeat(); },
  parseLyrics(lrc) { Player.parseLyrics(lrc); },
  get audio() { return Player.audio; },
  get playlist() { return Player.tracks; },
  get currentIndex() { return Player.idx; },
  get isPlaying() { return Player.playing; },
  get shuffle() { return Player.shuffle; },
  get repeat() { return Player.repeat; },
  get lyrics() { return Player.lyrics; },
  set shuffle(v) { Player.shuffle = v; },
  set repeat(v) { Player.repeat = v; },
};
