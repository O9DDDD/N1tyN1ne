/* ─── Unified Music Player ───────────────────────────── */
const Player = {
  audio: new Audio(),
  _nextAudio: null,
  tracks: [],
  idx: -1,
  playing: false,
  shuffle: false,
  repeat: false,
  lyrics: [],
  lyricTimer: null,
  _listeners: {},
  _preloadedIdx: -1,
  _preloadedLyrics: null,
  _restored: false,
  _transitioning: false,
  _transitionDir: 0,

  /* ─── Init ────────────────────────────────────────── */
  init() {
    this.audio.volume = 0.7;
    this._bindAudio(this.audio);
    this._restoreState();
    this._renderFloat();
    this._tryQuickResume();
  },

  _bindAudio(el) {
    this._unbindAudio(el);
    el._ph = {
      tick: () => this._tick(),
      meta: () => this._emit('durupdate'),
      ended: () => this._onEnded(),
      play: () => this._onPlay(),
      pause: () => this._onPause(),
      error: () => {
        this._errorCount = (this._errorCount || 0) + 1;
        if (this._errorCount > 3) return; // prevent infinite error loop
        if (this.tracks.length) this.next();
      }
    };
    el.addEventListener('timeupdate', el._ph.tick);
    el.addEventListener('loadedmetadata', el._ph.meta);
    el.addEventListener('ended', el._ph.ended);
    el.addEventListener('play', el._ph.play);
    el.addEventListener('pause', el._ph.pause);
    el.addEventListener('error', el._ph.error);
  },

  _unbindAudio(el) {
    if (el._ph) {
      el.removeEventListener('timeupdate', el._ph.tick);
      el.removeEventListener('loadedmetadata', el._ph.meta);
      el.removeEventListener('ended', el._ph.ended);
      el.removeEventListener('play', el._ph.play);
      el.removeEventListener('pause', el._ph.pause);
      el.removeEventListener('error', el._ph.error);
      el._ph = null;
    }
  },

  _tryQuickResume() {
    try {
      var raw = sessionStorage.getItem('player_quick');
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || !s.url || !s.playing) return;
      this.audio.src = https(s.url);
      this.audio.currentTime = s.pos || 0;
      this.audio.play().catch(function(){});
      if (s.title) {
        var t = { title: s.title, artist: s.artist || '', cover_url: s.cover || '', lyrics: s.lyrics || '' };
        this.tracks = [t];
        this.idx = 0;
        this._emit('track', t);
        this.parseLyrics(s.lyrics || '');
      }
      this._restored = true;
    } catch(e) {}
  },

  /* ─── Event system ────────────────────────────────── */
  on(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
  _emit(ev, data) { (this._listeners[ev] || []).forEach(function(fn) { fn(data); }); },

  /* ─── Load tracks ─────────────────────────────────── */
  async load() {
    try {
      var data = await dbSelect('music', { order: { col: 'created_at', dir: 'desc' } });
      this.tracks = (data || []).reverse();
      this._renderFloat();
      this._emit('playlist');
      if (this._restored && this.tracks.length) {
        var st = this._getState();
        if (st && st.idx >= 0 && st.idx < this.tracks.length) {
          this.idx = st.idx;
          this._updateInfo();
          this._emit('playlist');
          var t = this.tracks[this.idx];
          if (t && this.audio.src.indexOf(t.audio_url) === -1) {
            this.audio.src = https(t.audio_url);
          }
          this.parseLyrics(t ? (t.lyrics || '') : '');
        }
        this._restored = false;
      } else {
        var st2 = this._getState();
        if (st2 && st2.playing && st2.idx >= 0 && st2.idx < this.tracks.length) {
          this.idx = st2.idx;
          this.audio.src = https(this.tracks[st2.idx]?.audio_url || '');
          if (st2.pos > 0) { this.audio.currentTime = st2.pos; }
          this.audio.play().catch(function(){});
          this._updateInfo();
          this.parseLyrics(this.tracks[st2.idx]?.lyrics || '');
        } else {
          if (this.tracks.length) {
            var el = document.getElementById('noLyrics');
            if (el) el.textContent = '选择一首歌开始';
          }
        }
      }
    } catch(e) {
      var el2 = document.getElementById('noLyrics');
      if (el2) el2.textContent = '加载失败，请刷新重试';
    }
  },

  /* ─── Playback ────────────────────────────────────── */
  play(i) {
    if (!this.tracks.length) return;
    var oldIdx = this.idx;
    // Determine transition direction
    if (oldIdx >= 0 && i !== oldIdx) {
      this._transitionDir = i > oldIdx ? 1 : -1;
      this._transitioning = true;
      this._emit('transitionstart', { from: oldIdx, to: i, dir: this._transitionDir });
    }
    this.idx = i;
    var t = this.tracks[i];
    if (!t || !t.audio_url) return;
    this.audio.src = https(t.audio_url);
    this.audio.load();
    this.audio.play().catch(function(){});
    this._updateInfo();
    this.parseLyrics(t.lyrics || '');
    this._saveState();
    this._emit('playlist');
    this._renderFloat();
    this._preloadedIdx = -1;
    this._preloadedLyrics = null;
    this._errorCount = 0;
    // Abort stale preload to prevent _onEnded swaping wrong track
    if (this._nextAudio) {
      try { this._nextAudio.src = ''; this._nextAudio.load(); } catch(e) {}
    }
    // End transition after a short delay
    var self = this;
    if (this._transitioning) {
      setTimeout(function() {
        self._transitioning = false;
        self._emit('transitionend');
      }, 400);
    }
  },

  toggle() {
    if (!this.tracks.length) return;
    if (this.idx < 0) { this.play(0); return; }
    this.audio.paused ? this.audio.play().catch(function(){}) : this.audio.pause();
  },

  prev() {
    if (!this.tracks.length) return;
    var i = this.idx - 1;
    if (i < 0) i = this.tracks.length - 1;
    this.play(i);
  },

  next() {
    if (!this.tracks.length) return;
    if (this.repeat && this.idx >= 0) { this.play(this.idx); return; }
    var i;
    if (this.shuffle) {
      do { i = Math.floor(Math.random() * this.tracks.length); }
      while (i === this.idx && this.tracks.length > 1);
    } else {
      i = this.idx + 1;
      if (i >= this.tracks.length) i = 0;
    }
    this.play(i);
  },

  _onEnded() {
    if (this._nextAudio && this._preloadedIdx >= 0 && this._preloadedIdx < this.tracks.length) {
      var nextIdx = this._preloadedIdx;
      var nextLyrics = this._preloadedLyrics;
      var oldAudio = this.audio;
      this._unbindAudio(oldAudio);
      this.audio = this._nextAudio;
      this._bindAudio(this.audio);
      this._nextAudio = oldAudio;
      try { this._nextAudio.pause(); this._nextAudio.currentTime = 0; } catch(e) {}
      this._preloadedIdx = -1;
      this._preloadedLyrics = null;
      this.idx = nextIdx;
      this.playing = true;
      this._lastLyricTime = 0;
      this._updateInfo();
      var t = this.tracks[this.idx];
      if (t) {
        if (nextLyrics && nextLyrics.length) {
          this.lyrics = nextLyrics;
          this._emit('lyrics', this.lyrics);
        } else {
          this.parseLyrics(t.lyrics || '');
        }
      }
      this.audio.play().catch(function(){});
      this._saveState();
      this._emit('play');
      this._emit('playlist');
      this._syncLyrics();
      this._renderFloat();
      this._errorCount = 0;
      this._preloadNext();
    } else {
      this.next();
    }
  },

  /* ─── Gapless preload ─────────────────────────────── */
  _preloadNext() {
    if (!this.tracks.length) return;
    var nextIdx;
    if (this.repeat) {
      nextIdx = this.idx;
    } else if (this.shuffle) {
      do { nextIdx = Math.floor(Math.random() * this.tracks.length); }
      while (nextIdx === this.idx && this.tracks.length > 1);
    } else {
      nextIdx = this.idx + 1;
      if (nextIdx >= this.tracks.length) nextIdx = 0;
    }
    if (nextIdx === this._preloadedIdx) return;
    var t = this.tracks[nextIdx];
    if (!t || !t.audio_url) return;
    if (!this._nextAudio) {
      this._nextAudio = new Audio();
      this._nextAudio.volume = this.audio.volume;
    }
    this._nextAudio.src = https(t.audio_url);
    this._nextAudio.load();
    this._preloadedIdx = nextIdx;
    // Also preload lyrics for next track to avoid flicker
    if (t.lyrics && t.lyrics.trim()) {
      this._preloadedLyrics = this._parseLyricsText(t.lyrics);
    } else {
      this._preloadedLyrics = [];
    }
  },

  seek(e) {
    var bar = e.currentTarget;
    var rect = bar.getBoundingClientRect();
    var frac = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = frac * (this.audio.duration || 0);
  },

  setVolume(v) {
    this.audio.volume = parseFloat(v);
    if (this._nextAudio) this._nextAudio.volume = parseFloat(v);
    this._saveState();
  },

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
    this._lastLyricTime = 0;
    this._renderFloat();
  },
  _onPause() {
    this.playing = false;
    this._saveState();
    this._emit('pause');
    this._renderFloat();
  },

  _tick() {
    var ct = this.audio.currentTime, dur = this.audio.duration || 0;
    var pct = dur ? (ct / dur) * 100 : 0;
    this._emit('tick', { ct: ct, dur: dur, pct: pct });

    // Throttle UI updates to every 350ms (was every timeupdate event ~4-20/s)
    var now = Date.now();
    if (!this._lastFloatTime || now - this._lastFloatTime >= 350) {
      this._renderFloat();
      this._lastFloatTime = now;
    }
    // Throttle state saves to every 5s (was every tick)
    if (!this._lastSaveTime || now - this._lastSaveTime >= 5000) {
      this._saveState();
      this._lastSaveTime = now;
    }
    // Lyrics sync integrated into tick, throttled to 350ms
    if (this.lyrics.length && (!this._lastLyricTime || now - this._lastLyricTime >= 350)) {
      this._lastLyricTime = now;
      var activeIdx = -1;
      for (var i = this.lyrics.length - 1; i >= 0; i--) {
        if (ct >= this.lyrics[i].time) { activeIdx = i; break; }
      }
      this._emit('lyricsync', activeIdx);
    }
    // Preload next track only when within 30s of end AND at least 80% through
    // Using AND prevents bandwidth competition from prolonged dual-download
    if (dur > 0 && (dur - ct) < 30 && (dur - ct) / dur < 0.2) {
      this._preloadNext();
    }
  },

  _updateInfo() {
    var t = this.tracks[this.idx];
    if (!t) return;
    this._emit('track', t);
  },

  /* ─── State persistence ───────────────────────────── */
  _saveState() {
    try {
      var t = this.tracks[this.idx];
      sessionStorage.setItem('player_state', JSON.stringify({
        idx: this.idx,
        pos: this.audio.currentTime || 0,
        playing: this.playing,
        shuffle: this.shuffle,
        repeat: this.repeat,
        vol: this.audio.volume
      }));
      if (t && this.playing) {
        sessionStorage.setItem('player_quick', JSON.stringify({
          url: t.audio_url,
          pos: this.audio.currentTime || 0,
          playing: true,
          title: t.title,
          artist: t.artist,
          cover: t.cover_url,
          lyrics: t.lyrics,
          idx: this.idx
        }));
      }
    } catch(e) {}
  },
  _getState() {
    try { return JSON.parse(sessionStorage.getItem('player_state')); } catch(e) { return null; }
  },
  _restoreState() {
    var st = this._getState();
    if (st) {
      this.shuffle = st.shuffle || false;
      this.repeat = st.repeat || false;
      this.audio.volume = st.vol || 0.7;
    }
  },

  /* ─── LRC Lyrics Parser ───────────────────────────── */
  parseLyrics(lrcText) {
    this.lyrics = this._parseLyricsText(lrcText);
    this._emit('lyrics', this.lyrics);
  },

  _parseLyricsText(lrcText) {
    var result = [];
    if (!lrcText || !lrcText.trim()) return result;
    var normalized = lrcText.normalize('NFKC');
    var lines = normalized.split('\n');
    var timeRe = /\[(\d{1,3}):(\d{2})(?:\.(\d{2,3}))?\]/;
    lines.forEach(function(line) {
      var match = line.match(timeRe);
      if (!match) return;
      var min = parseInt(match[1]), sec = parseInt(match[2]);
      var ms = parseInt(match[3] || '0');
      var time = min * 60 + sec + ms / (match[3] && match[3].length === 3 ? 1000 : 100);
      var text = line.replace(timeRe, '').trim();
      if (text) result.push({ time: time, text: text });
    });
    result.sort(function(a, b) { return a.time - b.time; });
    return result;
  },

  getCurrentLyric() {
    var ct = this.audio.currentTime;
    var active = null;
    for (var i = 0; i < this.lyrics.length; i++) {
      if (ct >= this.lyrics[i].time) active = this.lyrics[i];
    }
    return active;
  },

  _syncLyrics() {
    // Lyrics sync is now integrated into _tick() (throttled at 350ms).
    // Reset the timer so the first tick on a new track picks up lyrics immediately.
    this._lastLyricTime = 0;
  },

  /* ─── Formatting ──────────────────────────────────── */
  fmt(s) {
    if (isNaN(s)) return '0:00';
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  },

  /* ─── Floating Mini Player ────────────────────────── */
  _renderFloat() {
    var el = document.getElementById('floatPlayer');
    if (!el) return;
    var hasTracks = this.tracks.length > 0;
    var hasActive = this.idx >= 0 && this.tracks[this.idx];
    var playerOpen = document.getElementById('playerView') && document.getElementById('playerView').classList.contains('open');
    if (!hasTracks || playerOpen) { el.classList.remove('show'); return; }
    el.classList.add('show');

    var t = hasActive ? this.tracks[this.idx] : null;

    // Cache DOM refs on first call to avoid querySelector on every tick
    if (!this._floatEls) {
      this._floatEls = {
        cover: el.querySelector('.fp-cover'),
        title: el.querySelector('.fp-title'),
        lyric: el.querySelector('.fp-lyric'),
        bar: el.querySelector('.fp-bar'),
        playIcon: el.querySelector('#fpPlayIcon')
      };
    }
    var fe = this._floatEls;

    if (fe.cover) {
      fe.cover.src = t?.cover_url ? https(t.cover_url) : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><rect fill="%23f3f0eb" width="52" height="52"/><text x="26" y="34" text-anchor="middle" font-size="24" fill="%236b8e5a">♪</text></svg>';
      fe.cover.classList.toggle('playing', this.playing);
    }
    if (fe.title) fe.title.textContent = t?.title || '未选择';
    if (fe.lyric) {
      var cl = this.getCurrentLyric();
      fe.lyric.textContent = cl ? cl.text : (t?.artist || '');
    }
    if (fe.bar) {
      var dur = this.audio.duration || 0;
      fe.bar.style.width = (dur ? (this.audio.currentTime / dur) * 100 : 0) + '%';
    }
    if (fe.playIcon) {
      fe.playIcon.className = 'fas fa-' + (this.playing ? 'pause' : 'play');
    }
  },

  /* ─── 3D Tilt for cover card ──────────────────────── */
  initTilt(el) {
    if (!el) return;
    var _tiltRaf = null;
    el.addEventListener('mousemove', function(e) {
      if (_tiltRaf) return; // throttle to rAF
      _tiltRaf = requestAnimationFrame(function() {
        _tiltRaf = null;
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2, cy = rect.height / 2;
        var rx = ((y - cy) / cy) * -12;
        var ry = ((x - cx) / cx) * 12;
        el.style.transform = 'perspective(600px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale3d(1.02,1.02,1.02)';
        var gloss = el.querySelector('.tilt-gloss');
        if (gloss) {
          gloss.style.background = 'radial-gradient(circle at ' + (x/rect.width)*100 + '% ' + (y/rect.height)*100 + '%, rgba(255,255,255,.4) 0%, transparent 60%)';
        }
      });
    });
    el.addEventListener('mouseleave', function() {
      el.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      var gloss = el.querySelector('.tilt-gloss');
      if (gloss) gloss.style.background = 'transparent';
    });
  }
};

/* Backwards-compat aliases */
const AudioPlayer = {
  init: function() { Player.init(); },
  load: function(tracks) { Player.tracks = tracks || []; Player._emit('playlist'); Player._renderFloat(); },
  play: function(i) { Player.play(i); },
  toggle: function() { Player.toggle(); },
  prev: function() { Player.prev(); },
  next: function() { Player.next(); },
  seek: function(e) { Player.seek(e); },
  setVolume: function(v) { Player.setVolume(v); },
  toggleShuffle: function() { Player.toggleShuffle(); },
  toggleRepeat: function() { Player.toggleRepeat(); },
  parseLyrics: function(lrc) { Player.parseLyrics(lrc); },
  get audio() { return Player.audio; },
  get playlist() { return Player.tracks; },
  get currentIndex() { return Player.idx; },
  get isPlaying() { return Player.playing; },
  get shuffle() { return Player.shuffle; },
  get repeat() { return Player.repeat; },
  get lyrics() { return Player.lyrics; },
  set shuffle(v) { Player.shuffle = v; },
  set repeat(v) { Player.repeat = v; }
};
