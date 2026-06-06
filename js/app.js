/* ─── Particle Canvas ───────────────────────────────── */
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: 0, y: 0 };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.hue = Math.random() * 60 + 100; // green range
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    // mouse interaction
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      const force = (120 - dist) / 120 * 0.5;
      this.x -= dx * force * 0.01;
      this.y -= dy * force * 0.01;
    }
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 60%, 70%, ${this.opacity})`;
    ctx.fill();
  }
}

for (let i = 0; i < 120; i++) particles.push(new Particle());

let rafId;

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.update();
    p.draw();
  }
  // draw connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `hsla(130, 40%, 50%, ${(1 - dist / 150) * 0.12})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
  rafId = requestAnimationFrame(animateParticles);
}
animateParticles();

canvas.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
canvas.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

/* ─── Theme Toggle ──────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  html.setAttribute('data-theme', isLight ? '' : 'light');
  localStorage.setItem('theme', isLight ? 'dark' : 'light');
}

/* ─── Nav scroll effect ─────────────────────────────── */
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

/* ─── File Upload ───────────────────────────────────── */
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--accent)';
  uploadArea.style.background = 'rgba(34,197,94,.06)';
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = '';
  uploadArea.style.background = '';
});
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  uploadArea.style.background = '';
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

function handleFiles(files) {
  const tracks = [];
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, '');
    // try to parse "artist - title" pattern
    const parts = name.split(' - ');
    const track = {
      src: url,
      title: parts.length > 1 ? parts[1] : name,
      artist: parts.length > 1 ? parts[0] : '本地文件',
      duration: '--:--',
      cover: ''
    };
    tracks.push(track);
  }
  if (tracks.length === 0) return;
  player.addTracks(tracks);
  if (player.currentIndex === -1) player.play(0);
}

/* ─── Restore theme ─────────────────────────────────── */
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
}

/* ─── Initialize ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  player.init();
  loadBlog();

  // Load default playlist
  fetch('data/playlist.json')
    .then(r => r.json())
    .then(tracks => player.load(tracks))
    .catch(() => {});
});
