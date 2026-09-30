const PHYSICS = {
  GRAVITY: 1300,
  TERMINAL_VELOCITY: 700,
  PLAYER_SPEED: 220,
  JUMP_FORCE: -480,
  AIR_FRICTION: 0.92,
  GROUND_FRICTION: 0.75,
  COYOTE_TIME: 0.08
};

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolvePlatformX(entity, platform) {
  const ex = entity.x - entity.width / 2;
  const ey = entity.y - entity.height / 2;
  const ew = entity.width;
  const eh = entity.height;
  if (aabbOverlap(ex, ey, ew, eh, platform.x, platform.y, platform.w, platform.h)) {
    const centerEx = ex + ew / 2;
    const centerPx = platform.x + platform.w / 2;
    if (centerEx < centerPx) entity.x = platform.x - ew / 2;
    else entity.x = platform.x + platform.w + ew / 2;
    entity.vx = 0;
    return true;
  }
  return false;
}

function resolvePlatformY(entity, platform) {
  const ex = entity.x - entity.width / 2;
  const ey = entity.y - entity.height / 2;
  const ew = entity.width;
  const eh = entity.height;
  if (aabbOverlap(ex, ey, ew, eh, platform.x, platform.y, platform.w, platform.h)) {
    const centerEy = ey + eh / 2;
    const centerPy = platform.y + platform.h / 2;
    if (centerEy < centerPy) {
      entity.y = platform.y - eh / 2;
      entity.vy = 0;
      return 'top';
    } else {
      entity.y = platform.y + platform.h + eh / 2;
      entity.vy = 0;
      return 'bottom';
    }
  }
  return null;
}
