/*
 * BreathingLoader — web port of the SwiftUI BreathingLoader.
 * A transparent particle sphere that breathes, drifts and rotates in 3D.
 *
 * Usage:
 *   const loader = BreathingLoader.mount(container, { sphereSize: 60 });
 *   loader.destroy();   // stop the animation and remove the canvas
 */
(function (global) {
  'use strict';

  var PARTICLE_COUNT = 170;

  function bounded(value, min, max, fallback) {
    return isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
  }

  // Fibonacci-sphere distribution with a hash-based phase, same as the Swift makeCloud().
  function makeCloud(count) {
    var n = Math.max(2, count);
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));
    var particles = [];
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = goldenAngle * i;
      var h = (i + 1) >>> 0;
      h ^= h >>> 16;
      h = Math.imul(h, 0x7FEB352D) >>> 0;
      h ^= h >>> 15;
      h = Math.imul(h, 0x846CA68B) >>> 0;
      h ^= h >>> 16;
      particles.push({
        id: i,
        base: { x: Math.cos(theta) * r, y: y, z: Math.sin(theta) * r },
        phase: (h / 4294967295) * 10,
        colorIndex: i % 2
      });
    }
    return particles;
  }

  var CLOUD = makeCloud(PARTICLE_COUNT);

  function rotate(v, angle, axis) {
    var c = Math.cos(angle), s = Math.sin(angle);
    if (axis === 'x') return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
    if (axis === 'y') return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
  }

  function mount(container, options) {
    options = options || {};
    var sphereSize = bounded(options.sphereSize, 30, 200, 60);
    var breathingSpeed = bounded(options.breathingSpeed, 0.5, 2.5, 1.25);
    var rotationSpeed = bounded(options.rotationSpeed, 0, 1, 0.25);
    var dotSize = bounded(options.dotSize, 1.5, 14, 2.5);
    var primary = options.primaryColor || '#C9F24B';   // NTM lime
    var secondary = options.secondaryColor || '#F0B43C'; // NTM amber
    var sizeCss = options.size || sphereSize * 2.6;     // canvas box in CSS px

    var dpr = global.devicePixelRatio || 1;
    var canvas = document.createElement('canvas');
    canvas.className = 'breathing-loader';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;margin:0 auto;width:' + sizeCss + 'px;height:' + sizeCss + 'px;';
    canvas.width = Math.round(sizeCss * dpr);
    canvas.height = Math.round(sizeCss * dpr);
    container.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = null;
    var startedAt = null;
    var accumulated = 0;
    var destroyed = false;

    function elapsed(now) {
      return accumulated + (startedAt === null ? 0 : Math.max(0, (now - startedAt) / 1000));
    }

    function draw(t) {
      var breath = (Math.sin(t * breathingSpeed) + 1) / 2;
      var radius = sphereSize * (80 / 140 + (60 / 140) * breath);
      var turbulence = 30 * breath;
      var focal = 400;
      var expansion = 4 * breath;
      var fitScale = Math.min(1, sizeCss / ((sphereSize + 30 + dotSize) * 2));
      var cx = sizeCss / 2, cy = sizeCss / 2;

      var frame = CLOUD.map(function (p) {
        var pos = {
          x: p.base.x * radius + Math.sin(t * 3 + p.phase) * turbulence,
          y: p.base.y * radius + Math.cos(t * 4 + p.phase) * turbulence,
          z: p.base.z * radius + Math.sin(t * 5 + p.phase) * turbulence
        };
        pos = rotate(pos, t * rotationSpeed, 'y');
        pos = rotate(pos, t * 0.2, 'x');
        var depth = focal / Math.max(focal + pos.z, 1);
        var rear = 0.5 + 0.5 * ((pos.z + sphereSize) / (sphereSize * 2));
        return {
          x: pos.x * depth,
          y: pos.y * depth,
          z: pos.z,
          size: (dotSize + expansion) * depth,
          opacity: pos.z < 0 ? Math.min(Math.max(rear, 0), 1) : 1,
          colorIndex: p.colorIndex,
          id: p.id
        };
      });

      frame.sort(function (a, b) { return a.z === b.z ? a.id - b.id : a.z - b.z; });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, sizeCss, sizeCss);
      frame.forEach(function (p) {
        var s = p.size * fitScale;
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.colorIndex === 0 ? primary : secondary;
        ctx.beginPath();
        ctx.arc(cx + p.x * fitScale, cy + p.y * fitScale, Math.max(0.5, s / 2), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      if (destroyed) return;
      if (!container.isConnected) { destroy(); return; }
      var t = elapsed(now);
      draw(reduceMotion ? 0 : t);
      if (!reduceMotion) raf = global.requestAnimationFrame(loop);
    }

    function start() {
      if (reduceMotion || destroyed || raf !== null || document.hidden) return;
      startedAt = performance.now();
      raf = global.requestAnimationFrame(loop);
    }

    function stop() {
      if (raf !== null) { global.cancelAnimationFrame(raf); raf = null; }
      if (startedAt !== null) {
        accumulated += Math.max(0, (performance.now() - startedAt) / 1000);
        startedAt = null;
      }
    }

    function onVisibility() { document.hidden ? stop() : start(); }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    document.addEventListener('visibilitychange', onVisibility);
    draw(0);
    start();

    return { destroy: destroy, element: canvas };
  }

  global.BreathingLoader = { mount: mount };
})(window);
