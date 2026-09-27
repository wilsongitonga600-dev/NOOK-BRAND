class Camera {
  constructor(viewW, viewH) {
    this.x = 0;
    this.y = 0;
    this.viewW = viewW;
    this.viewH = viewH;
    this.smoothness = 0.12;
    this.minY = -200;
    this.maxY = 400;
    this.shakeIntensity = 0;
    this.shakeTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize(w, h) {
    this.viewW = w;
    this.viewH = h;
  }

  setPosition(px, py, levelWidth, levelHeight) {
    this.x = px - this.viewW / 2;
    this.y = py - this.viewH / 2;
    this.clamp(levelWidth || this.viewW, levelHeight || this.viewH);
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  follow(target, levelWidth, levelHeight) {
    let targetX = target.x - this.viewW / 2;
    let targetY = target.y - this.viewH / 2;

    this.x += (targetX - this.x) * this.smoothness;
    this.y += (targetY - this.y) * this.smoothness;

    this.clamp(levelWidth, levelHeight);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= 0.016;
      const decay = Math.max(0, this.shakeTimer / 0.3);
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * decay;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * decay;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  clamp(levelWidth, levelHeight) {
    this.x = Math.max(0, Math.min(this.x, Math.max(0, levelWidth - this.viewW)));
    this.y = Math.max(this.minY, Math.min(this.y, Math.max(this.minY, levelHeight - this.viewH)));
  }

  get offsetX() { return this.x + this.shakeX; }
  get offsetY() { return this.y + this.shakeY; }
}
