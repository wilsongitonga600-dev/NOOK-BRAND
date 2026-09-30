class Menu {
  constructor(game) {
    this.game = game;
    this.setupButtons();
  }

  setupButtons() {
    document.getElementById('btn-play').addEventListener('click', () => {
      this.game.audio.init();
      this.showLevelSelect();
    });

    document.getElementById('btn-continue').addEventListener('click', () => {
      this.game.audio.init();
      this.hideAll();
      this.game.start();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      document.getElementById('settings-screen').classList.remove('hidden');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      document.getElementById('settings-screen').classList.add('hidden');
    });

    document.getElementById('btn-reset-progress').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        this.game.resetProgress();
      }
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.game.togglePause();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.game.restartLevel();
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
      this.game.state = 'MENU';
      this.showMain();
    });

    document.getElementById('btn-try-again').addEventListener('click', () => {
      this.game.retryFromCheckpoint();
    });

    document.getElementById('btn-main-menu').addEventListener('click', () => {
      this.game.state = 'MENU';
      this.showMain();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.game.restartLevel();
      this.hideAll();
      this.game.start();
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.game.nextLevel();
    });

    document.getElementById('btn-win-menu').addEventListener('click', () => {
      this.game.state = 'MENU';
      this.showMain();
    });

    document.getElementById('btn-back-from-levels').addEventListener('click', () => {
      this.showMain();
    });

    document.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('locked')) return;
        const level = parseInt(card.dataset.level);
        this.game.audio.init();
        this.game.loadLevel(level);
        this.hideAll();
        this.game.start();
      });
    });

    document.getElementById('toggle-sound').addEventListener('change', e => {
      if (this.game.audio) this.game.audio.toggleSound(e.target.checked);
    });
    document.getElementById('toggle-music').addEventListener('change', e => {
      if (this.game.audio) this.game.audio.toggleMusic(e.target.checked);
    });
  }

  updateLevelSelect(unlockedLevels) {
    for (let i = 1; i <= 3; i++) {
      const card = document.getElementById(`level-${i}-card`);
      const status = document.getElementById(`level-${i}-status`);
      if (i <= unlockedLevels) {
        card.classList.remove('locked');
        status.textContent = i === 1 ? 'PLAY' : 'UNLOCKED';
      } else {
        card.classList.add('locked');
        status.textContent = 'LOCKED';
      }
    }
  }

  showMain() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
  }

  showLevelSelect() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('level-select').classList.remove('hidden');
  }

  hideAll() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
  }

  showGameOver(score, crystals) {
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-crystals').textContent = crystals;
  }

  showWin(score, crystals, hasNext) {
    document.getElementById('win-screen').classList.remove('hidden');
    document.getElementById('win-score').textContent = score;
    document.getElementById('win-crystals').textContent = crystals;
    const nextBtn = document.getElementById('btn-next-level');
    nextBtn.style.display = hasNext ? '' : 'none';
  }
}
