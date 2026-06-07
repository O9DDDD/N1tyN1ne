/* Theme manager — shared across all pages */
var Theme = {
  init: function() {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme:dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    this._updateIcon();
    this._listenSystem();
  },
  toggle: function() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    this._updateIcon();
  },
  _updateIcon: function() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = 'fas fa-' + (isDark ? 'sun' : 'moon');
  },
  _listenSystem: function() {
    var self = this;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : '');
        self._updateIcon();
      }
    });
  }
};
Theme.init();

function toggleNav() { document.getElementById('navLinks').classList.toggle('open'); }
function closeNav() { document.getElementById('navLinks').classList.remove('open'); }
