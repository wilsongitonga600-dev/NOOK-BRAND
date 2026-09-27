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

  const saved = await Persistence.load();
  const continueBtn = document.getElementById('btn-continue');
  if (!saved) {
    continueBtn.style.opacity = '0.4';
    continueBtn.style.pointerEvents = 'none';
  }

  window.game = new Game(canvas);
  await window.game.init();
});
