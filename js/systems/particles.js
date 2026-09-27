class ParticleSystem {
  constructor() {
    this.particles = [];
  }
  spawn(x, y, type) {
    const configs = {
      crystal: { count: 10, colors: ['#E6B84A','#D9A344','#F6C28B','#FFF1D6'], speed: 180, life: 0.8 },
      explosion: { count: 16, colors: ['#D6483A','#E8776A','#F0A090','#FFF1D6'], speed: 250, life: 0.6 },
      checkpoint: { count: 20, colors: ['#E6B84A','#F6D776','#FDF0D0','#FFF1D6'], speed: 200, life: 1.0 },
      dust: { count: 6, colors: ['#C9B49A','#F6C28B','#FFF1D6'], speed: 80, life: 0.4 },
      damage: { count: 12, colors: ['#D6483A','#A83226','#E8776A'], speed: 150, life: 0.5 },
      shield: { count: 14, colors: ['#7D9A72','#8D8B55','#A8C29A','#FFF1D6'], speed: 160, life: 0.7 },
      land: { count: 5, colors: ['#C9B49A','#A98F76'], speed: 60, life: 0.3 }
    };
    const config = configs[type] || configs.dust;
    for (let i = 0; i < config.count; i++) {
      const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.5;
      const speed = config.speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'dust' || type === 'land' ? 20 : 40),
        life: config.life,
        maxLife: config.life,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        size: 2 + Math.random() * 4,
        type
      });
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
