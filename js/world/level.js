class Level {
  constructor(levelNum) {
    this.levelNum = levelNum || 1;
    this.loadLevel(this.levelNum);
  }

  loadLevel(n) {
    const levels = {
      1: {
        width: 3400, height: 900, groundY: 600,
        platforms: [
          { x: 0, y: 580, w: 520, h: 40 },
          { x: 620, y: 520, w: 220, h: 32 },
          { x: 920, y: 460, w: 160, h: 32 },
          { x: 1180, y: 400, w: 220, h: 32 },
          { x: 1520, y: 480, w: 120, h: 32 },
          { x: 1720, y: 420, w: 160, h: 32 },
          { x: 2020, y: 360, w: 220, h: 32 },
          { x: 2320, y: 430, w: 140, h: 28 },
          { x: 2420, y: 500, w: 780, h: 40 }
        ],
        crystals: [
          { x: 720, y: 480, collected: false, rot: 0 },
          { x: 770, y: 480, collected: false, rot: 0 },
          { x: 1000, y: 420, collected: false, rot: 0 },
          { x: 1290, y: 360, collected: false, rot: 0 },
          { x: 1580, y: 440, collected: false, rot: 0 },
          { x: 1800, y: 380, collected: false, rot: 0 },
          { x: 2120, y: 320, collected: false, rot: 0 },
          { x: 2180, y: 320, collected: false, rot: 0 },
          { x: 2380, y: 390, collected: false, rot: 0 }
        ],
        enemies: [
          { x: 1020, y: 428, w: 36, h: 32, type: 'ground', patrolStart: 920, patrolEnd: 1080, speed: 90, dir: 1, dead: false },
          { x: 1820, y: 388, w: 36, h: 32, type: 'ground', patrolStart: 1720, patrolEnd: 1880, speed: 110, dir: 1, dead: false },
          { x: 2700, y: 468, w: 36, h: 32, type: 'ground', patrolStart: 2500, patrolEnd: 3150, speed: 80, dir: 1, dead: false }
        ],
        checkpoints: [
          { x: 450, y: 550, id: 1, reached: false, radius: 24 },
          { x: 1290, y: 370, id: 2, reached: false, radius: 24 },
          { x: 2800, y: 470, id: 3, reached: false, radius: 24 }
        ],
        powerups: [],
        goal: { x: 3150, y: 460, radius: 30, reached: false },
        spawn: { x: 120, y: 530 }
      },
      2: {
        width: 3800, height: 900, groundY: 600,
        platforms: [
          { x: 0, y: 580, w: 400, h: 40 },
          { x: 500, y: 520, w: 120, h: 28 },
          { x: 720, y: 460, w: 100, h: 28 },
          { x: 920, y: 400, w: 140, h: 28 },
          { x: 1180, y: 340, w: 100, h: 28 },
          { x: 1400, y: 420, w: 200, h: 32 },
          { x: 1750, y: 360, w: 100, h: 28 },
          { x: 1980, y: 300, w: 120, h: 28 },
          { x: 2250, y: 380, w: 160, h: 32 },
          { x: 2550, y: 460, w: 100, h: 28 },
          { x: 2780, y: 520, w: 140, h: 28 },
          { x: 3050, y: 480, w: 750, h: 40 }
        ],
        crystals: [
          { x: 560, y: 480, collected: false, rot: 0 },
          { x: 760, y: 420, collected: false, rot: 0 },
          { x: 980, y: 360, collected: false, rot: 0 },
          { x: 1220, y: 300, collected: false, rot: 0 },
          { x: 1500, y: 380, collected: false, rot: 0 },
          { x: 1800, y: 320, collected: false, rot: 0 },
          { x: 2040, y: 260, collected: false, rot: 0 },
          { x: 2320, y: 340, collected: false, rot: 0 },
          { x: 2600, y: 420, collected: false, rot: 0 },
          { x: 2850, y: 480, collected: false, rot: 0 }
        ],
        enemies: [
          { x: 1100, y: 372, w: 36, h: 32, type: 'ground', patrolStart: 920, patrolEnd: 1060, speed: 100, dir: 1, dead: false },
          { x: 1600, y: 392, w: 36, h: 32, type: 'ground', patrolStart: 1400, patrolEnd: 1600, speed: 120, dir: 1, dead: false },
          { x: 2100, y: 250, w: 30, h: 24, type: 'fly', patrolStart: 2000, patrolEnd: 2200, speed: 80, dir: 1, dead: false, baseY: 250, amp: 40 },
          { x: 3300, y: 442, w: 36, h: 32, type: 'ground', patrolStart: 3100, patrolEnd: 3700, speed: 90, dir: 1, dead: false }
        ],
        checkpoints: [
          { x: 350, y: 550, id: 1, reached: false, radius: 24 },
          { x: 1480, y: 390, id: 2, reached: false, radius: 24 },
          { x: 3200, y: 450, id: 3, reached: false, radius: 24 }
        ],
        powerups: [
          { x: 1220, y: 280, type: 'shield', radius: 16, collected: false, rot: 0 }
        ],
        goal: { x: 3550, y: 440, radius: 30, reached: false },
        spawn: { x: 120, y: 530 }
      },
      3: {
        width: 4200, height: 900, groundY: 600,
        platforms: [
          { x: 0, y: 580, w: 350, h: 40 },
          { x: 450, y: 500, w: 100, h: 28 },
          { x: 650, y: 440, w: 80, h: 28 },
          { x: 820, y: 380, w: 100, h: 28 },
          { x: 1050, y: 320, w: 80, h: 28 },
          { x: 1250, y: 400, w: 180, h: 32 },
          { x: 1550, y: 340, w: 80, h: 28 },
          { x: 1750, y: 280, w: 100, h: 28 },
          { x: 2000, y: 360, w: 140, h: 32 },
          { x: 2300, y: 300, w: 80, h: 28 },
          { x: 2500, y: 240, w: 100, h: 28 },
          { x: 2750, y: 320, w: 160, h: 32 },
          { x: 3050, y: 400, w: 100, h: 28 },
          { x: 3300, y: 460, w: 140, h: 28 },
          { x: 3550, y: 520, w: 650, h: 40 }
        ],
        crystals: [
          { x: 490, y: 460, collected: false, rot: 0 },
          { x: 680, y: 400, collected: false, rot: 0 },
          { x: 860, y: 340, collected: false, rot: 0 },
          { x: 1080, y: 280, collected: false, rot: 0 },
          { x: 1320, y: 360, collected: false, rot: 0 },
          { x: 1580, y: 300, collected: false, rot: 0 },
          { x: 1800, y: 240, collected: false, rot: 0 },
          { x: 2070, y: 320, collected: false, rot: 0 },
          { x: 2340, y: 260, collected: false, rot: 0 },
          { x: 2540, y: 200, collected: false, rot: 0 },
          { x: 2820, y: 280, collected: false, rot: 0 },
          { x: 3100, y: 360, collected: false, rot: 0 }
        ],
        enemies: [
          { x: 900, y: 348, w: 36, h: 32, type: 'ground', patrolStart: 820, patrolEnd: 920, speed: 100, dir: 1, dead: false },
          { x: 1400, y: 368, w: 36, h: 32, type: 'ground', patrolStart: 1250, patrolEnd: 1430, speed: 130, dir: 1, dead: false },
          { x: 1850, y: 240, w: 30, h: 24, type: 'fly', patrolStart: 1750, patrolEnd: 1950, speed: 100, dir: 1, dead: false, baseY: 240, amp: 50 },
          { x: 2600, y: 200, w: 30, h: 24, type: 'fly', patrolStart: 2500, patrolEnd: 2700, speed: 90, dir: 1, dead: false, baseY: 200, amp: 60 },
          { x: 3750, y: 488, w: 36, h: 32, type: 'ground', patrolStart: 3600, patrolEnd: 4100, speed: 110, dir: 1, dead: false }
        ],
        checkpoints: [
          { x: 300, y: 550, id: 1, reached: false, radius: 24 },
          { x: 1320, y: 370, id: 2, reached: false, radius: 24 },
          { x: 2800, y: 290, id: 3, reached: false, radius: 24 }
        ],
        powerups: [
          { x: 1080, y: 270, type: 'shield', radius: 16, collected: false, rot: 0 },
          { x: 2540, y: 190, type: 'shield', radius: 16, collected: false, rot: 0 }
        ],
        goal: { x: 3950, y: 480, radius: 30, reached: false },
        spawn: { x: 120, y: 530 }
      }
    };

    const L = levels[n] || levels[1];
    this.width = L.width;
    this.height = L.height;
    this.groundY = L.groundY;
    this.platforms = L.platforms;
    this.crystals = L.crystals;
    this.enemies = L.enemies;
    this.checkpoints = L.checkpoints;
    this.powerups = L.powerups;
    this.goal = L.goal;
    this.spawn = L.spawn;
  }

  update(dt, player) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.type === 'fly') {
        e.x += e.speed * e.dir * dt;
        e.y = e.baseY + Math.sin(Date.now() * 0.003 + e.patrolStart) * e.amp;
        if (e.x > e.patrolEnd) { e.x = e.patrolEnd; e.dir = -1; }
        if (e.x < e.patrolStart) { e.x = e.patrolStart; e.dir = 1; }
      } else {
        e.x += e.speed * e.dir * dt;
        if (e.x > e.patrolEnd) { e.x = e.patrolEnd; e.dir = -1; }
        if (e.x < e.patrolStart) { e.x = e.patrolStart; e.dir = 1; }
      }
    }
    for (const c of this.crystals) c.rot += dt * 2.5;
    for (const p of this.powerups) p.rot += dt * 2;
  }

  draw(ctx) {
    for (const p of this.platforms) this.drawPlatform(ctx, p);
    for (const c of this.crystals) { if (!c.collected) this.drawCrystal(ctx, c); }
    for (const e of this.enemies) { if (!e.dead) this.drawEnemy(ctx, e); }
    for (const pu of this.powerups) { if (!pu.collected) this.drawPowerup(ctx, pu); }
    for (const cp of this.checkpoints) this.drawCheckpoint(ctx, cp);
    this.drawGoal(ctx);
  }

  drawPlatform(ctx, p) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this.roundRectPath(ctx, p.x + 3, p.y + 4, p.w, p.h, 10);
    ctx.fill();
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    grad.addColorStop(0, '#D9A66C');
    grad.addColorStop(0.7, '#8D8B55');
    grad.addColorStop(1, '#62483A');
    ctx.fillStyle = grad;
    this.roundRectPath(ctx, p.x, p.y, p.w, p.h, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    this.roundRectPath(ctx, p.x + 2, p.y + 2, p.w - 4, 5, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.roundRectPath(ctx, p.x + 2, p.y + 8, 4, p.h - 12, 2);
    ctx.fill();
  }

  drawCrystal(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y + Math.sin(c.rot) * 4);
    ctx.rotate(c.rot * 0.4);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    glow.addColorStop(0, 'rgba(230,184,74,0.9)');
    glow.addColorStop(0.5, 'rgba(230,184,74,0.3)');
    glow.addColorStop(1, 'rgba(230,184,74,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6B84A';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F6C28B';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5, -5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.type === 'fly') {
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
      glow.addColorStop(0, 'rgba(139, 90, 60, 0.5)');
      glow.addColorStop(1, 'rgba(139, 90, 60, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8B5A3C';
      ctx.beginPath();
      ctx.ellipse(-12, 0, 14, 8, 0.3, 0, Math.PI * 2);
      ctx.ellipse(12, 0, 14, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5C3A24';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-3, -3, 3, 0, Math.PI * 2);
      ctx.arc(3, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-3, -3, 1.5, 0, Math.PI * 2);
      ctx.arc(3, -3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 28);
      glow.addColorStop(0, 'rgba(214, 72, 58, 0.5)');
      glow.addColorStop(1, 'rgba(214, 72, 58, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D6483A';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const r = i % 2 === 0 ? 20 : 13;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#A83226';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      const eyeOffset = e.dir * 3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6 + eyeOffset, -4, 5, 0, Math.PI * 2);
      ctx.arc(6 + eyeOffset, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-6 + eyeOffset * 1.5, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(6 + eyeOffset * 1.5, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(-2, -7);
      ctx.moveTo(10, -10);
      ctx.lineTo(2, -7);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPowerup(ctx, pu) {
    ctx.save();
    ctx.translate(pu.x, pu.y + Math.sin(pu.rot) * 3);
    if (pu.type === 'shield') {
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
      glow.addColorStop(0, 'rgba(125, 154, 114, 0.6)');
      glow.addColorStop(1, 'rgba(125, 154, 114, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7D9A72';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#7D9A72';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', 0, 1);
    }
    ctx.restore();
  }

  drawCheckpoint(ctx, cp) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.fillStyle = '#6B5847';
    ctx.fillRect(-2, -32, 4, 64);
    ctx.fillStyle = '#A98F76';
    ctx.beginPath();
    ctx.arc(0, -32, 4, 0, Math.PI * 2);
    ctx.fill();
    const flagColor = cp.reached ? '#E6B84A' : '#6B5847';
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(2, -32);
    ctx.lineTo(26, -22);
    ctx.lineTo(2, -12);
    ctx.closePath();
    ctx.fill();
    if (cp.reached) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(2, -32);
      ctx.lineTo(14, -27);
      ctx.lineTo(2, -22);
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(0, -22, 5, 0, -22, 40);
      glow.addColorStop(0, 'rgba(230, 184, 74, 0.4)');
      glow.addColorStop(1, 'rgba(230, 184, 74, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -22, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 32, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGoal(ctx) {
    const g = this.goal;
    ctx.save();
    ctx.translate(g.x, g.y);
    const time = Date.now() * 0.003;
    const pulse = 1 + Math.sin(time) * 0.15;
    ctx.strokeStyle = 'rgba(230, 184, 74, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, g.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, g.radius);
    glow.addColorStop(0, 'rgba(230, 184, 74, 0.8)');
    glow.addColorStop(0.5, 'rgba(230, 184, 74, 0.3)');
    glow.addColorStop(1, 'rgba(230, 184, 74, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E6B84A';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const offset = time + i * 2.1;
      ctx.arc(0, 0, 12 + i * 6, offset, offset + 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#E6B84A';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', 0, -g.radius - 10);
    ctx.restore();
  }

  roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
