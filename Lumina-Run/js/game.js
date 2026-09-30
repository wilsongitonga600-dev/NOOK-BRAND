// Persistence: prefer the real Node/SQLite backend (the Termux dev server)
// when it answers; fall back to localStorage automatically when there's no
// server to reach it — e.g. a static GitHub Pages deployment. This means
// the same client code works unmodified in both environments, rather than
// needing to hand-patch save/load/reset every time this gets exported to
// a static host.
const Persistence = {
  key: 'nook-lumina-run-save',
  async load() {
    try {
      const res = await fetch('/api/save');
      if (!res.ok) throw new Error('no server');
      const rows = await res.json();
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        level: r.level,
        unlockedLevels: r.unlocked_levels || r.level || 1,
        checkpoint: r.checkpoint,
        score: r.score,
        crystals: r.crystals,
        health: r.health
      };
    } catch (e) {
      try {
        const saved = localStorage.getItem(this.key);
        return saved ? JSON.parse(saved) : null;
      } catch (e2) {
        return null;
      }
    }
  },
  async save(data) {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('no server');
    } catch (e) {
      try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e2) {}
    }
  },
  async reset() {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('no server');
    } catch (e) {
      try { localStorage.removeItem(this.key); } catch (e2) {}
    }
  }
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'MENU';
    this.lastTime = 0;

    this.audio = new AudioSystem();
    this.currentLevelNum = 1;
    this.unlockedLevels = 1;

    this.level = new Level(1);
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    this.camera = new Camera(canvas.width, canvas.height);
    this.particles = new ParticleSystem();
    this.hud = new HUD();
    this.menu = new Menu(this);

    this.score = 0;
    this.crystals = 0;
    this.health = 3;
    this.maxHealth = 3;
    this.currentCheckpoint = 0;

    this.keys = {};
    this.touch = { left: false, right: false, jump: false };

    this.transitionAlpha = 0;
    this.transitioning = false;
    this.transitionCallback = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Some Android browsers report stale window dimensions for a moment
    // right after rotation, before the layout has actually settled — a
    // second resize shortly after the event fires catches that case.
    window.addEventListener('orientationchange', () => {
      this.resize();
      setTimeout(() => this.resize(), 150);
    });
    // Belt-and-suspenders: watch the canvas's own laid-out size directly.
    // This fires on layout changes that don't reliably send a window
    // "resize" event on every browser (e.g. toggling "Request Desktop
    // Site"), since it observes the actual element rather than the window.
    if (window.ResizeObserver) {
      new ResizeObserver(() => this.resize()).observe(canvas);
    }
    this.setupInputs();
  }

  resize() {
    // Measure the canvas element's own laid-out box size, not the window or
    // visualViewport — those can diverge from how the canvas is actually
    // drawn on screen under things like Chrome's "Request Desktop Site"
    // mode (which fakes a ~980px viewport and zooms the page to fit), which
    // previously left a blank strip where the canvas thought it was shorter
    // than it was actually rendered. getBoundingClientRect() always
    // reflects reality regardless of what zoom/emulation is happening above it.
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w <= 0 || h <= 0) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyP') this.togglePause();
    });
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    const setTouch = (id, key) => {
      const btn = document.getElementById(id);
      btn.addEventListener('touchstart', e => { e.preventDefault(); this.touch[key] = true; });
      btn.addEventListener('touchend', e => { e.preventDefault(); this.touch[key] = false; });
      btn.addEventListener('mousedown', e => { this.touch[key] = true; });
      btn.addEventListener('mouseup', e => { this.touch[key] = false; });
      btn.addEventListener('mouseleave', e => { this.touch[key] = false; });
    };
    setTouch('btn-left', 'left');
    setTouch('btn-right', 'right');
    setTouch('btn-jump', 'jump');
  }

  async init() {
    await this.loadProgress();
    this.loop(0);
  }

  async loadProgress() {
    try {
      const p = await Persistence.load();
      if (p) {
        this.currentLevelNum = Math.min(Math.max(p.level || 1, 1), 3);
        this.unlockedLevels = Math.max(this.unlockedLevels, p.unlockedLevels || this.currentLevelNum);
        this.currentCheckpoint = p.checkpoint || 0;
        this.score = p.score || 0;
        this.crystals = p.crystals || 0;
        this.health = p.health || 3;
        this.loadLevel(this.currentLevelNum, false, true);
      } else {
        this.loadLevel(1, false);
      }
      this.menu.updateLevelSelect(this.unlockedLevels);
    } catch (e) {
      console.log('No save found or error:', e);
      this.loadLevel(1, false);
      this.menu.updateLevelSelect(1);
    }
  }

  loadLevel(num, doTransition = true, resume = false) {
    this.currentLevelNum = num;
    this.level = new Level(num);

    // Only resume at a saved checkpoint when explicitly continuing a save.
    // Every other entry point (level select, next level, restart, reset)
    // always starts the player at the level's spawn point — otherwise a
    // checkpoint id left over from a *different* level (which reuses ids
    // 1/2/3) would place the player at an unrelated, possibly unsafe
    // location in the new level.
    let spawnPoint = this.level.spawn;
    let spawnOffset = 0;
    if (resume && this.currentCheckpoint > 0) {
      const cp = this.level.checkpoints.find(c => c.id === this.currentCheckpoint);
      if (cp) {
        spawnPoint = cp;
        spawnOffset = 40;
      } else {
        this.currentCheckpoint = 0;
      }
    } else {
      this.currentCheckpoint = 0;
    }

    this.player = new Player(spawnPoint.x, spawnPoint.y - spawnOffset);
    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.camera.setPosition(this.player.x, this.player.y, this.level.width, this.level.height);
    this.particles = new ParticleSystem();

    if (!resume) {
      this.score = 0;
      this.crystals = 0;
      this.health = 3;
    }

    if (doTransition) {
      this.startTransition(() => {});
    }
  }

  start() {
    this.state = 'PLAYING';
    this.menu.hideAll();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('pause-menu').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('pause-menu').classList.add('hidden');
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.menu.showGameOver(this.score, this.crystals);
  }

  win() {
    this.state = 'WIN';
    this.score += 500;
    this.audio.play('win');
    this.particles.spawn(this.player.x, this.player.y, 'checkpoint');
    const hasNext = this.currentLevelNum < 3;
    if (hasNext) {
      this.unlockedLevels = Math.max(this.unlockedLevels, this.currentLevelNum + 1);
    }
    this.menu.showWin(this.score, this.crystals, hasNext);
    this.saveProgress();
  }

  nextLevel() {
    if (this.currentLevelNum < 3) {
      this.loadLevel(this.currentLevelNum + 1);
      this.menu.hideAll();
      this.start();
    }
  }

  restartLevel() {
    this.loadLevel(this.currentLevelNum, false);
    this.health = this.maxHealth;
    this.menu.hideAll();
    this.state = 'PLAYING';
  }

  // Used after Game Over ("Try Again"): keep the level as-is — checkpoints
  // already reached, crystals already collected, current score — and just
  // put the player back at the last checkpoint touched (or the level spawn
  // if none was reached yet), with health restored. This is distinct from
  // restartLevel(), which fully resets the level back to its start.
  retryFromCheckpoint() {
    this.health = this.maxHealth;
    this.menu.hideAll();
    this.respawn();
  }

  respawn() {
    const cp = this.level.checkpoints.find(c => c.id === this.currentCheckpoint);
    const point = cp || this.level.spawn;
    const offset = cp ? 40 : 0;
    this.player.x = point.x;
    this.player.y = point.y - offset;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invincible = 60;
    this.camera.setPosition(this.player.x, this.player.y, this.level.width, this.level.height);
    this.state = 'PLAYING';
  }

  resetProgress() {
    Persistence.reset().then(() => {
      this.unlockedLevels = 1;
      this.currentLevelNum = 1;
      this.currentCheckpoint = 0;
      this.loadLevel(1, false);
      this.state = 'MENU';
      this.menu.showMain();
      this.menu.updateLevelSelect(1);
      document.getElementById('btn-continue').style.opacity = '0.4';
      document.getElementById('btn-continue').style.pointerEvents = 'none';
    });
  }

  startTransition(callback) {
    this.transitioning = true;
    this.transitionAlpha = 0;
    this.transitionCallback = callback;
  }

  updateTransition(dt) {
    if (!this.transitioning) return;
    if (this.transitioning === true) {
      this.transitionAlpha += dt * 3;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        if (this.transitionCallback) this.transitionCallback();
        this.transitionCallback = null;
        this.transitioning = 'out';
      }
    } else if (this.transitioning === 'out') {
      this.transitionAlpha -= dt * 3;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitioning = false;
      }
    }
  }

  update(dt) {
    this.updateTransition(dt);
    if (this.state !== 'PLAYING') return;

    const left = this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touch.left;
    const right = this.keys['ArrowRight'] || this.keys['KeyD'] || this.touch.right;
    const jump = this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.touch.jump;

    this.player.update(dt, left, right, jump, this.level);
    this.camera.follow(this.player, this.level.width, this.level.height);
    this.particles.update(dt);
    this.level.update(dt, this.player);

    // Crystals
    for (const c of this.level.crystals) {
      if (!c.collected && this.player.collidesWithCrystal(c)) {
        c.collected = true;
        this.crystals++;
        this.score += 50;
        this.particles.spawn(c.x, c.y, 'crystal');
        this.audio.play('collect');
      }
    }

    // Powerups
    for (const pu of this.level.powerups) {
      if (!pu.collected && this.player.collidesWithPowerup(pu)) {
        pu.collected = true;
        this.player.activateShield();
        this.particles.spawn(pu.x, pu.y, 'shield');
        this.audio.play('shield');
      }
    }

    // Enemies
    for (const e of this.level.enemies) {
      if (e.dead) continue;
      if (this.player.collidesWithEnemy(e)) {
        if (this.player.canStompEnemy(e)) {
          e.dead = true;
          this.player.vy = -350;
          this.score += 100;
          this.particles.spawn(e.x, e.y, 'explosion');
          this.audio.play('stomp');
          this.camera.shake(5, 0.15);
        } else if (this.player.invincible <= 0) {
          if (this.player.takeDamage()) {
            this.health--;
            this.particles.spawn(this.player.x, this.player.y, 'damage');
            this.audio.play('damage');
            this.camera.shake(10, 0.2);
            if (this.health <= 0) this.gameOver();
          }
        }
      }
    }

    // Checkpoints
    for (const cp of this.level.checkpoints) {
      if (!cp.reached && this.player.collidesWithCheckpoint(cp)) {
        cp.reached = true;
        this.currentCheckpoint = cp.id;
        this.score += 200;
        this.particles.spawn(cp.x, cp.y, 'checkpoint');
        this.hud.showCheckpoint(cp.id);
        this.audio.play('checkpoint');
        this.saveProgress();
      }
    }

    // Goal
    const g = this.level.goal;
    if (!g.reached) {
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < g.radius + this.player.width / 2) {
        g.reached = true;
        this.win();
      }
    }

    // Fall off world
    if (this.player.y > this.level.height + 200) {
      this.health--;
      this.particles.spawn(this.player.x, this.player.y, 'damage');
      this.audio.play('damage');
      if (this.health <= 0) this.gameOver();
      else this.respawn();
    }
  }

  saveProgress() {
    const data = {
      level: this.currentLevelNum,
      unlockedLevels: this.unlockedLevels,
      checkpoint: this.currentCheckpoint,
      score: this.score,
      crystals: this.crystals,
      health: this.health
    };
    Persistence.save(data);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#2B1B14';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'MENU') {
      this.drawMenuBackground(ctx);
      return;
    }

    // Parallax layers
    ctx.save();
    ctx.translate(-this.camera.offsetX * 0.05, -this.camera.offsetY * 0.05);
    this.drawSky(ctx);
    ctx.restore();

    ctx.save();
    ctx.translate(-this.camera.offsetX * 0.2, -this.camera.offsetY * 0.2);
    this.drawMountains(ctx);
    ctx.restore();

    ctx.save();
    ctx.translate(-this.camera.offsetX * 0.4, -this.camera.offsetY * 0.4);
    this.drawScenery(ctx);
    ctx.restore();

    // Game world
    ctx.save();
    ctx.translate(-this.camera.offsetX, -this.camera.offsetY);
    this.level.draw(ctx);
    this.player.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    // HUD
    this.hud.draw(ctx, this.health, this.maxHealth, this.crystals, this.score, this.currentCheckpoint, this.currentLevelNum, this.player.shieldTime, this.canvas.width);

    // Transition overlay
    if (this.transitioning) {
      ctx.fillStyle = `rgba(43, 27, 20, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Screen overlays
    if (this.state === 'PAUSED') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
    }
    if (this.state === 'GAMEOVER' || this.state === 'WIN') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawMenuBackground(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#F6C28B');
    grad.addColorStop(0.5, '#D66A45');
    grad.addColorStop(1, '#62483A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const time = Date.now() * 0.001;
    ctx.fillStyle = '#FFF1D6';
    for (let i = 0; i < 40; i++) {
      const x = (i * 137 + time * 8) % w;
      const y = (i * 93 + Math.sin(time + i) * 40) % h;
      ctx.globalAlpha = 0.15 + Math.sin(time + i * 0.5) * 0.1;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawSky(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 900);
    grad.addColorStop(0, '#F6C28B');
    grad.addColorStop(0.5, '#D66A45');
    grad.addColorStop(1, '#62483A');
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.offsetX * 0.05 - 100, -100, this.level.width + 200, 1100);
    const time = Date.now() * 0.001;
    ctx.fillStyle = '#FFF1D6';
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5) % (this.level.width + 200);
      const y = (i * 71.3) % 700;
      const size = 1 + (i % 3);
      const twinkle = 0.2 + Math.sin(time + i * 0.7) * 0.15;
      ctx.globalAlpha = Math.max(0.05, twinkle);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 241, 214, 0.12)';
    for (let i = 0; i < 6; i++) {
      const x = i * 500 + Math.sin(time * 0.3 + i) * 40;
      const y = 80 + Math.sin(i * 1.5) * 50;
      ctx.beginPath();
      ctx.arc(x, y, 55, 0, Math.PI * 2);
      ctx.arc(x + 35, y - 8, 45, 0, Math.PI * 2);
      ctx.arc(x + 70, y, 50, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMountains(ctx) {
    ctx.fillStyle = '#8D6E52';
    ctx.beginPath();
    ctx.moveTo(-100, 900);
    for (let i = 0; i <= this.level.width + 200; i += 50) {
      const h = 150 + Math.sin(i * 0.008) * 60 + Math.sin(i * 0.02) * 30;
      ctx.lineTo(i, 580 - h);
    }
    ctx.lineTo(this.level.width + 100, 900);
    ctx.closePath();
    ctx.fill();
  }

  drawScenery(ctx) {
    ctx.fillStyle = '#5C4433';
    ctx.beginPath();
    ctx.moveTo(-100, 900);
    for (let i = 0; i <= this.level.width + 200; i += 40) {
      const h = 80 + Math.sin(i * 0.015 + 2) * 40;
      ctx.lineTo(i, 580 - h);
    }
    ctx.lineTo(this.level.width + 100, 900);
    ctx.closePath();
    ctx.fill();
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  }
}
