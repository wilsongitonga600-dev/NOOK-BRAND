class HUD {
  constructor() {
    this.checkpointMsg = '';
    this.checkpointTimer = 0;
  }
  showCheckpoint(id) {
    this.checkpointMsg = `CHECKPOINT ${id}`;
    this.checkpointTimer = 2.5;
  }
  drawRoundRect(ctx, x, y, w, h, r) {
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
  draw(ctx, health, maxHealth, crystals, score, checkpoint, levelNum, shieldTime, canvasWidth) {
    const padding = 16;
    // Scale with the actual screen width instead of a fixed pixel value, so
    // the bar neither overflows a narrow phone nor looks tiny on a large
    // tablet screen. 280 is the smallest width that still fits every label
    // inside without overlap (verified against the fixed text offsets below).
    const barW = Math.max(280, Math.min(340, (canvasWidth || 400) * 0.75));
    const barH = 52;
    ctx.save();
    ctx.fillStyle = 'rgba(43, 27, 20, 0.6)';
    this.drawRoundRect(ctx, padding, padding, barW, barH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 184, 74, 0.1)';
    ctx.lineWidth = 1;
    this.drawRoundRect(ctx, padding, padding, barW, barH, 14);
    ctx.stroke();
    for (let i = 0; i < maxHealth; i++) {
      const hx = padding + 18 + i * 26;
      const hy = padding + barH / 2;
      if (i < health) {
        ctx.fillStyle = '#D6483A';
        ctx.shadowColor = 'rgba(214, 72, 58, 0.5)';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.moveTo(hx, hy - 6);
      ctx.bezierCurveTo(hx - 7, hy - 14, hx - 14, hy - 7, hx, hy + 4);
      ctx.bezierCurveTo(hx + 14, hy - 7, hx + 7, hy - 14, hx, hy - 6);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    const cx = padding + 110;
    const cy = padding + barH / 2;
    ctx.fillStyle = '#E6B84A';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx, cy + 7);
    ctx.lineTo(cx - 7, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(crystals, cx + 14, cy + 1);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`⭐ ${score}`, cx + 60, cy + 1);
    ctx.fillStyle = '#F6C28B';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LV.${levelNum}`, padding + barW - 12, cy + 1);
    if (shieldTime > 0) {
      const barY = padding + barH + 8;
      const barMaxW = 120;
      const barFillW = barMaxW * (shieldTime / 5);
      ctx.fillStyle = 'rgba(43, 27, 20, 0.6)';
      this.drawRoundRect(ctx, padding, barY, barMaxW, 8, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(125, 154, 114, 0.8)';
      this.drawRoundRect(ctx, padding, barY, barFillW, 8, 4);
      ctx.fill();
    }
    if (this.checkpointTimer > 0) {
      this.checkpointTimer -= 0.016;
      const alpha = Math.min(1, this.checkpointTimer);
      const scale = 1 + Math.sin(this.checkpointTimer * 6) * 0.05;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
      ctx.shadowBlur = 20;
      const cx2 = ctx.canvas.width / 2;
      const cy2 = ctx.canvas.height / 2 - 60;
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.scale(scale, scale);
      ctx.fillText(this.checkpointMsg, 0, 0);
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
