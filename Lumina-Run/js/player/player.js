class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.wasGrounded = false;
    this.invincible = 0;
    this.shieldTime = 0;
    this.animTimer = 0;
    this.trail = [];
    this.coyoteTimer = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.landTimer = 0;
  }

  update(dt, left, right, jump, level) {
    this.animTimer += dt;
    this.wasGrounded = this.grounded;

    if (this.grounded) {
      this.coyoteTimer = PHYSICS.COYOTE_TIME;
    } else {
      this.coyoteTimer -= dt;
    }

    if (left) {
      this.vx = -PHYSICS.PLAYER_SPEED;
      this.facing = -1;
    } else if (right) {
      this.vx = PHYSICS.PLAYER_SPEED;
      this.facing = 1;
    } else {
      this.vx *= this.grounded ? PHYSICS.GROUND_FRICTION : PHYSICS.AIR_FRICTION;
      if (Math.abs(this.vx) < 10) this.vx = 0;
    }

    if (jump && this.coyoteTimer > 0) {
      this.vy = PHYSICS.JUMP_FORCE;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.squashX = 0.7;
      this.squashY = 1.4;
      if (window.game) {
        window.game.particles.spawn(this.x, this.y + this.height / 2, 'dust');
        window.game.audio.play('jump');
      }
    }

    if (!jump && this.vy < PHYSICS.JUMP_FORCE * 0.4) {
      this.vy *= 0.85;
    }

    this.vy += PHYSICS.GRAVITY * dt;
    if (this.vy > PHYSICS.TERMINAL_VELOCITY) this.vy = PHYSICS.TERMINAL_VELOCITY;

    this.x += this.vx * dt;
    for (const p of level.platforms) resolvePlatformX(this, p);

    this.y += this.vy * dt;
    this.grounded = false;
    for (const p of level.platforms) {
      if (resolvePlatformY(this, p) === 'top') {
        this.grounded = true;
      }
    }

    if (this.grounded && !this.wasGrounded) {
      this.squashX = 1.3;
      this.squashY = 0.7;
      this.landTimer = 0.15;
      if (window.game) {
        window.game.particles.spawn(this.x, this.y + this.height / 2, 'land');
        if (Math.abs(this.vy) > 300) window.game.camera.shake(6, 0.15);
      }
    }

    this.squashX += (1 - this.squashX) * 8 * dt;
    this.squashY += (1 - this.squashY) * 8 * dt;
    if (this.landTimer > 0) this.landTimer -= dt;

    if (this.invincible > 0) this.invincible -= dt * 60;
    if (this.shieldTime > 0) this.shieldTime -= dt;

    this.trail.push({ x: this.x, y: this.y, life: 1 });
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt * 6;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }
  }

  takeDamage() {
    if (this.shieldTime > 0) return false;
    this.invincible = 90;
    this.vy = PHYSICS.JUMP_FORCE * 0.6;
    this.vx = this.facing * -180;
    this.squashX = 0.6;
    this.squashY = 1.3;
    return true;
  }

  activateShield() {
    this.shieldTime = 5;
  }

  collidesWithCrystal(crystal) {
    const dx = this.x - crystal.x;
    const dy = this.y - crystal.y;
    return Math.sqrt(dx * dx + dy * dy) < (this.width / 2 + 10 + 4);
  }

  collidesWithEnemy(enemy) {
    return (
      this.x - this.width / 2 < enemy.x + enemy.w / 2 + 4 &&
      this.x + this.width / 2 > enemy.x - enemy.w / 2 - 4 &&
      this.y - this.height / 2 < enemy.y + enemy.h / 2 + 4 &&
      this.y + this.height / 2 > enemy.y - enemy.h / 2 - 4
    );
  }

  collidesWithCheckpoint(cp) {
    const dx = this.x - cp.x;
    const dy = this.y - cp.y;
    return Math.sqrt(dx * dx + dy * dy) < (this.width / 2 + cp.radius);
  }

  collidesWithPowerup(pu) {
    const dx = this.x - pu.x;
    const dy = this.y - pu.y;
    return Math.sqrt(dx * dx + dy * dy) < (this.width / 2 + pu.radius + 4);
  }

  canStompEnemy(enemy) {
    return this.vy > 0 && (this.y + this.height / 2) < (enemy.y - enemy.h / 4);
  }

  draw(ctx) {
    for (const t of this.trail) {
      ctx.globalAlpha = t.life * 0.2;
      ctx.fillStyle = '#F6C28B';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squashX, this.squashY);

    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (this.shieldTime > 0) {
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.1;
      ctx.strokeStyle = 'rgba(125, 154, 114, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      const shieldGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, 24);
      shieldGlow.addColorStop(0, 'rgba(125, 154, 114, 0.15)');
      shieldGlow.addColorStop(1, 'rgba(125, 154, 114, 0)');
      ctx.fillStyle = shieldGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    const time = Date.now() * 0.003;
    const auraSize = 22 + Math.sin(time) * 3;
    const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, auraSize);
    aura.addColorStop(0, 'rgba(246, 194, 139, 0.6)');
    aura.addColorStop(0.5, 'rgba(230, 184, 74, 0.2)');
    aura.addColorStop(1, 'rgba(230, 184, 74, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF1D6';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8D5A2B';
    ctx.beginPath();
    ctx.arc(this.facing * 4, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
