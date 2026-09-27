document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('gameCanvas');

  document.body.addEventListener('touchmove', e => {
    if (e.target === canvas || e.target.closest('.mobile-controls')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.body.addEventListener('touchstart', e => {
    if (e.target === canvas) e.preventDefault();
  }, { passive: false });

  const saved = localStorage.getItem('nook-lumina-run-save');
  const btn = document.getElementById('btn-continue');
  if (!saved) {
    btn.style.opacity = '0.4';
    btn.style.pointerEvents = 'none';
  }

  window.game = new Game(canvas);
  await window.game.init();
});
