/* ─── Music Player ───────────────────────────────────── */
const player = {
  audio: new Audio(),
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  shuffle: false,
  repeat: false,

  init() {
    this.audio.volume = 0.7;
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this.updateMeta());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('play', () => this.onPlay());
    this.audio.addEventListener('pause', () => this.onPause());

    document.getElementById('volumeSlider').value = 0.7;
  },

  load(tracks) {
    this.playlist = tracks;
    this.renderPlaylist();
    document.getElementById('statTracks').textContent = tracks.length;
  },

  addTracks(tracks) {
    this.playlist.push(...tracks);
    this.renderPlaylist();
    document.getElementById('statTracks').textContent = this.playlist.length;
  },

  play(index) {
    if (index === undefined) {
      if (this.playlist.length === 0) return;
      if (this.currentIndex === -1) index = 0;
      else index = this.currentIndex;
    }
    this.currentIndex = index;
    const track = this.playlist[index];
    if (!track) return;

    this.audio.src = track.src;
    this.audio.load();
    this.audio.play().catch(() => {});
    this.updateInfo(track);
    this.renderPlaylist();
  },

  togglePlay() {
    if (this.playlist.length === 0) return;
    if (this.currentIndex === -1) { this.play(0); return; }
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    } else {
      this.audio.pause();
    }
  },

  prev() {
    if (this.playlist.length === 0) return;
    let i = this.currentIndex - 1;
    if (i < 0) i = this.playlist.length - 1;
    this.play(i);
  },

  next() {
    if (this.playlist.length === 0) return;
    if (this.shuffle) {
      let i; do { i = Math.floor(Math.random() * this.playlist.length); }
      while (i === this.currentIndex && this.playlist.length > 1);
      this.play(i);
    } else {
      let i = this.currentIndex + 1;
      if (i >= this.playlist.length) i = 0;
      this.play(i);
    }
  },

  seek(e) {
    const bar = document.getElementById('progressBar');
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = pct * this.audio.duration;
  },

  setVolume(v) { this.audio.volume = parseFloat(v); },

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    document.getElementById('shuffleBtn').style.color = this.shuffle ? 'var(--accent)' : '';
  },

  toggleRepeat() {
    this.repeat = !this.repeat;
    document.getElementById('repeatBtn').style.color = this.repeat ? 'var(--accent)' : '';
  },

  onEnded() {
    if (this.repeat && this.currentIndex >= 0) {
      this.play(this.currentIndex);
    } else {
      this.next();
    }
  },

  onPlay() {
    this.isPlaying = true;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('playerCover').classList.add('playing');
    document.getElementById('waveBars').style.display = 'flex';
  },

  onPause() {
    this.isPlaying = false;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('playerCover').classList.remove('playing');
    document.getElementById('waveBars').style.display = 'none';
  },

  updateInfo(track) {
    document.getElementById('songTitle').textContent = track.title || '未知歌曲';
    document.getElementById('songArtist').textContent = track.artist || '—';
    if (track.cover) {
      document.getElementById('coverImg').src = track.cover;
    } else {
      document.getElementById('coverImg').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%231a1a2e" width="200" height="200"/><text x="100" y="115" text-anchor="middle" font-size="60">🎵</text></svg>';
    }
  },

  updateProgress() {
    const ct = this.audio.currentTime;
    const dur = this.audio.duration || 0;
    const pct = dur ? (ct / dur) * 100 : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressThumb').style.left = pct + '%';
    document.getElementById('currentTime').textContent = this.formatTime(ct);
  },

  updateMeta() {
    document.getElementById('totalTime').textContent = this.formatTime(this.audio.duration);
  },

  formatTime(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  },

  renderPlaylist() {
    const el = document.getElementById('playlistItems');
    el.innerHTML = '';
    this.playlist.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'playlist-item' + (i === this.currentIndex ? ' active' : '');
      div.innerHTML = `
        <div class="pl-idx">${i === this.currentIndex && this.isPlaying ? '<i class="fas fa-play" style="font-size:10px"></i>' : (i + 1)}</div>
        <div class="pl-info">
          <div class="pl-title">${t.title || '未知歌曲'}</div>
          <div class="pl-artist">${t.artist || '未知艺术家'}</div>
        </div>
        <div class="pl-duration">${t.duration || '--:--'}</div>
      `;
      div.onclick = () => this.play(i);
      el.appendChild(div);
    });
  }
};
