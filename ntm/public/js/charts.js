// Minimal, dependency-free SVG chart helpers. Each returns an SVG
// markup string sized to its viewBox, meant to be inserted with
// innerHTML and stretched to fit its container via CSS.

const Charts = (() => {
  function scale(values, height, pad = 4) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = (max - min) || 1;
    return (v) => height - pad - ((v - min) / range) * (height - pad * 2);
  }

  function sparkline(values, { width = 100, height = 34, color = 'var(--accent)' } = {}) {
    if (!values || values.length === 0 || values.every((v) => v === 0)) {
      return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
        <line x1="0" y1="${height - 6}" x2="${width}" y2="${height - 6}" stroke="var(--border)" stroke-width="2" stroke-dasharray="3 4"/>
      </svg>`;
    }
    const y = scale(values, height);
    const stepX = width / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => `${i * stepX},${y(v)}`).join(' ');
    const areaPoints = `0,${height} ${points} ${width},${height}`;
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">
      <polygon points="${areaPoints}" fill="${color}" opacity="0.12"></polygon>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
    </svg>`;
  }

  function niceHourMax(values) {
    const maxMinutes = Math.max(...values, 0);
    if (maxMinutes <= 0) return 60; // default to a 1-hour scale when there's no data
    const steps = [30, 60, 90, 120, 180, 240, 360, 480, 720, 960, 1200, 1440]; // minutes
    return steps.find((s) => s >= maxMinutes) || Math.ceil(maxMinutes / 60) * 60;
  }

  function formatHourLabel(minutes) {
    const h = minutes / 60;
    return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
  }

  // Bar chart with an hours y-axis (for minute-valued data like focus
  // time). One semantic color for the whole series — per NTM's chart
  // rules, a metric like Focus Time is one series with one meaning, not
  // a rainbow. The axis column stays fixed while the bars scroll
  // horizontally underneath it, so a month's worth of bars stays
  // legible instead of squeezing into one width.
  function barChart(values, labels, { height = 140, minBarWidth = 16, color = 'var(--chart-focus)', showYAxis = true } = {}) {
    const n = values.length;
    const barGap = 8;
    const barWidth = minBarWidth;
    const chartWidth = n * barWidth + (n - 1) * barGap;
    const bottom = height - 20;
    const topPad = 14;
    const plotHeight = bottom - topPad;
    const niceMax = niceHourMax(values);
    const labelStep = n > 12 ? Math.ceil(n / 10) : 1;

    // Isometric 3D box per bar — a diamond top cap plus shaded left/right
    // faces, adapted from a reference isometric bar chart design. Every
    // bar renders as a real box (minimum height = barWidth, so tiny
    // values still read as a recognizable cube rather than a sliver);
    // zero-value bars render as a faded minimum cube, matching the
    // faded-flat-bar treatment this chart used before.
    const bars = values.map((v, i) => {
      const dataHeight = (v / niceMax) * plotHeight;
      const h = Math.max(dataHeight, barWidth);
      const x = i * (barWidth + barGap);
      const top = bottom - h;
      const bw = barWidth;
      const cap = bw / 2.1;
      const flare = bw / 4;
      const peak = bw / 25;

      const pt = (lx, ly) => `${(x + lx).toFixed(1)},${(top + ly).toFixed(1)}`;
      const topFace = [pt(0, flare), pt(bw - cap, peak), pt(bw, flare), pt(cap, cap)].join(' ');
      const leftFace = [pt(0, flare), pt(cap, cap), pt(cap, h), pt(0, h - flare)].join(' ');
      const rightFace = [pt(cap, cap), pt(bw, flare), pt(bw, h - flare), pt(cap, h)].join(' ');

      const opacity = v > 0 ? 1 : 0.25;
      return `<g opacity="${opacity}">
        <polygon points="${leftFace}" fill="${color}" style="filter:brightness(0.88)"></polygon>
        <polygon points="${rightFace}" fill="${color}" style="filter:brightness(1.16)"></polygon>
        <polygon points="${topFace}" fill="${color}" style="filter:brightness(1.08)"></polygon>
      </g>`;
    }).join('');

    const labelEls = (labels || []).map((l, i) => {
      if (i % labelStep !== 0) return '';
      const x = i * (barWidth + barGap) + barWidth / 2;
      return `<text x="${x.toFixed(1)}" y="${height - 4}" dominant-baseline="central" font-size="9.5" fill="var(--text-muted)" text-anchor="middle">${l}</text>`;
    }).join('');

    const plotSvg = `<svg viewBox="0 0 ${chartWidth} ${height}" width="${chartWidth}" height="${height}" style="display:block;min-width:${chartWidth}px;">
      ${bars}${labelEls}
    </svg>`;

    if (!showYAxis) {
      return `<div style="overflow-x:${n > 10 ? 'auto' : 'visible'};-webkit-overflow-scrolling:touch;">${plotSvg}</div>`;
    }

    const axisWidth = 34;
    const ticks = [0, 0.5, 1].map((f) => {
      const val = niceMax * f;
      const y = bottom - f * plotHeight;
      return { y, label: formatHourLabel(val) };
    });
    // dominant-baseline="central" centers each label exactly on its
    // tick's y-coordinate regardless of font metrics — a fixed pixel
    // offset (the old approach) doesn't render consistently across
    // browsers/WebViews and can look like the labels collide.
    const axisSvg = `<svg viewBox="0 0 ${axisWidth} ${height}" width="${axisWidth}" height="${height}" style="display:block;flex-shrink:0;">
      ${ticks.map((t) => `<text x="${axisWidth - 6}" y="${t.y.toFixed(1)}" dominant-baseline="central" font-size="9.5" fill="var(--text-muted)" text-anchor="end">${t.label}</text>`).join('')}
    </svg>`;

    // Gridlines live inside the scrolling plot area (so they line up
    // with the bars) but are computed from the same tick set as the
    // fixed axis labels alongside them.
    const gridlines = ticks.map((t) => `<line x1="0" y1="${t.y.toFixed(1)}" x2="${chartWidth}" y2="${t.y.toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4"></line>`).join('');
    const plotSvgWithGrid = `<svg viewBox="0 0 ${chartWidth} ${height}" width="${chartWidth}" height="${height}" style="display:block;min-width:${chartWidth}px;">
      ${gridlines}${bars}${labelEls}
    </svg>`;

    return `<div style="display:flex;min-width:0;">
      ${axisSvg}
      <div style="overflow-x:${n > 10 ? 'auto' : 'visible'};-webkit-overflow-scrolling:touch;flex:1;min-width:0;">${plotSvgWithGrid}</div>
    </div>`;
  }

  function areaChart(values, { width = 320, height = 120, color = 'var(--accent)' } = {}) {
    if (!values || values.length === 0 || values.every((v) => v === 0)) {
      return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
        <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="var(--border)" stroke-width="2" stroke-dasharray="4 5"/>
      </svg>`;
    }
    const y = scale(values, height, 10);
    const stepX = width / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => [i * stepX, y(v)]);

    // Smooth-ish curve via simple quadratic midpoints.
    let path = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i += 1) {
      const [px, py] = points[i - 1];
      const [cx, cy] = points[i];
      const mx = (px + cx) / 2;
      path += ` Q ${px},${py} ${mx},${(py + cy) / 2} T ${cx},${cy}`;
    }
    const areaPath = `${path} L ${width},${height} L 0,${height} Z`;
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#areaFill)"></path>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"></path>
    </svg>`;
  }

  // Category palette — tonal variations within the olive/lime family
  // (varying lightness/saturation of one hue range), not an arbitrary
  // rainbow. Per NTM's color rules, category charts should still read
  // as "this app" at a glance, with individual categories told apart
  // by shade rather than by jumping to unrelated hues.
  const CATEGORY_PALETTE = [
    '#B7E83B', // full-brightness lime (brand accent)
    '#8FA83E', // deeper olive-lime
    '#D8E9A0', // pale lime tint
    '#5C6B3B', // deep moss
    '#A9BE6A', // soft sage-lime
    '#6E7A45', // muted olive
    '#C7D98A', // light sage
    '#4F5C31', // darkest olive
  ];

  // Status colors for the multi-ring breakdown's inner ring — each tied
  // to meaning, not picked for variety.
  const STATUS_COLORS = {
    completed: 'var(--chart-completed)', // lime
    in_progress: 'var(--orange)',        // active/execution
    paused: 'var(--text-muted)',         // muted neutral
    not_started: 'var(--surface-interactive)', // dim, barely-there
  };
  const STATUS_LABELS = { completed: 'Completed', in_progress: 'Active', paused: 'Paused', not_started: 'Not started' };

  // Priority colors for the middle ring — matches the same badge colors
  // used on task cards (critical=coral, high=amber, medium=muted lime,
  // low=muted neutral), so a color always means the same thing everywhere.
  const PRIORITY_COLORS = {
    critical: 'var(--critical)',
    high: 'var(--high)',
    medium: 'var(--medium)',
    low: 'var(--low)',
  };
  const PRIORITY_LABELS_CHART = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

  // Single-value progress ring, e.g. "Today's Progress: 62%". Pass
  // displayText to show something other than a percentage in the
  // center (e.g. a count or duration) while still using percent to
  // size the arc — or pass percent=100 for a purely decorative full
  // ring around a number that isn't a percentage at all.
  function donutRing(percent, { size = 128, stroke = 14, color = 'var(--accent)', trackColor = 'var(--surface-2)', label = '', displayText = null } = {}) {
    const r = (size - stroke) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, percent));
    const dash = (pct / 100) * c;
    const centerText = displayText !== null ? displayText : `${Math.round(pct)}%`;
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${stroke}"></circle>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"
        transform="rotate(-90 ${cx} ${cy})"></circle>
      <text x="${cx}" y="${cy}" dominant-baseline="central" text-anchor="middle" font-family="var(--font-display)" font-weight="700"
        font-size="${size * 0.2}" fill="var(--text-primary)">${centerText}</text>
      ${label ? `<text x="${cx}" y="${cy + size * 0.16}" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.075}" fill="var(--text-secondary)">${label}</text>` : ''}
    </svg>`;
  }

  // Multi-segment breakdown rendered as a ring of short radial ticks
  // (grouped by category, with a small gap between groups) rather than
  // smooth arcs — matches the segmented-dial reference style. Returns
  // { svg, legendItems } — legendItems carry the color already assigned
  // to each segment so the caller can render a matching legend.
  function donutBreakdown(segments, { size = 150, tickCount = 32 } = {}) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size / 2 - 4;
    const rInner = rOuter - size * 0.13;

    if (total <= 0) {
      const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${cx}" cy="${cy}" r="${(rOuter + rInner) / 2}" fill="none" stroke="var(--surface-2)" stroke-width="${rOuter - rInner}" stroke-dasharray="4 6"></circle>
      </svg>`;
      return { svg, legendItems: [] };
    }

    const active = segments.filter((s) => s.value > 0);
    const numGroups = active.length;
    // Reserve one gap slot after every group so categories read as
    // visually distinct clusters of ticks, not one continuous ring.
    const fillableSlots = Math.max(tickCount - numGroups, numGroups);

    // Largest-remainder rounding: give every active category at least
    // one tick, then distribute the rest proportional to its share.
    const raw = active.map((s) => (s.value / total) * fillableSlots);
    let allocated = raw.map((r) => Math.max(1, Math.floor(r)));
    let remaining = fillableSlots - allocated.reduce((a, b) => a + b, 0);
    const remainders = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
    let ri = 0;
    let guard = 0;
    while (remaining !== 0 && guard < tickCount * 2) {
      const idx = remainders[ri % remainders.length].i;
      if (remaining > 0) { allocated[idx] += 1; remaining -= 1; }
      else if (allocated[idx] > 1) { allocated[idx] -= 1; remaining += 1; }
      ri += 1; guard += 1;
    }

    const angleStep = 360 / tickCount;
    const legendItems = [];
    let slot = 0;
    const ticks = [];
    active.forEach((s, i) => {
      const color = s.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
      for (let j = 0; j < allocated[i]; j += 1) {
        const angleDeg = -90 + slot * angleStep;
        const rad = (angleDeg * Math.PI) / 180;
        const x1 = cx + rInner * Math.cos(rad);
        const y1 = cy + rInner * Math.sin(rad);
        const x2 = cx + rOuter * Math.cos(rad);
        const y2 = cy + rOuter * Math.sin(rad);
        ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${(size * 0.045).toFixed(1)}" stroke-linecap="round"></line>`);
        slot += 1;
      }
      slot += 1; // gap slot between category groups
      legendItems.push({ name: s.name, value: s.value, color });
    });

    const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      ${ticks.join('')}
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-family="var(--font-display)" font-weight="700"
        font-size="${size * 0.19}" fill="var(--text-primary)">${total}</text>
      <text x="${cx}" y="${cy + size * 0.14}" text-anchor="middle" font-size="${size * 0.075}" fill="var(--text-secondary)">total</text>
    </svg>`;
    return { svg, legendItems };
  }

  // Adaptive concentric multi-ring chart: takes up to 3 rings ordered
  // innermost-first (typically status, priority, category) and draws
  // only the ones that have real, non-zero data — per NTM's rule,
  // never a fake/empty ring just to look sophisticated. If only one
  // ring has data, this renders as a single donut; if two, two rings;
  // etc. Each ring's segments are smooth arcs with small gaps, which
  // stays legible with up to three concentric layers on a small phone
  // screen (the tick-dial style from donutBreakdown gets visually busy
  // stacked three deep at this size).
  function concentricRings(rings, { size = 180, centerText = '', centerLabel = '' } = {}) {
    const cx = size / 2;
    const cy = size / 2;
    const active = rings
      .map((r) => ({ ...r, total: r.segments.reduce((s, x) => s + x.value, 0) }))
      .filter((r) => r.total > 0);

    const innerHoleRadius = size * 0.24;
    const maxRadius = size / 2 - 3;

    if (active.length === 0) {
      const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${cx}" cy="${cy}" r="${(innerHoleRadius + maxRadius) / 2}" fill="none" stroke="var(--surface-2)" stroke-width="${maxRadius - innerHoleRadius}" stroke-dasharray="4 6"></circle>
      </svg>`;
      return { svg, rings: [] };
    }

    const ringGap = 3;
    const availableRadius = maxRadius - innerHoleRadius;
    const thickness = (availableRadius - ringGap * (active.length - 1)) / active.length;

    const ringMeta = [];
    const layers = active.map((ring, i) => {
      const radius = innerHoleRadius + thickness / 2 + i * (thickness + ringGap);
      const circumference = 2 * Math.PI * radius;
      let offset = 0;
      const segs = ring.segments.filter((s) => s.value > 0);
      const legendItems = [];
      const arcs = segs.map((s) => {
        const arcLen = (s.value / ring.total) * circumference;
        const gap = segs.length > 1 ? 3 : 0;
        const dash = Math.max(arcLen - gap, 0);
        const circle = `<circle cx="${cx}" cy="${cy}" r="${radius.toFixed(1)}" fill="none" stroke="${s.color}" stroke-width="${thickness.toFixed(1)}"
          stroke-dasharray="${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}"
          transform="rotate(-90 ${cx} ${cy})" data-ring="${i}" data-name="${s.name}" data-value="${s.value}" data-percent="${Math.round((s.value / ring.total) * 100)}"></circle>`;
        offset += arcLen;
        legendItems.push({ name: s.name, value: s.value, color: s.color, percent: Math.round((s.value / ring.total) * 100) });
        return circle;
      }).join('');
      ringMeta.push({ title: ring.title, legendItems });
      return arcs;
    }).join('');

    const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ring-chart">
      ${layers}
      <text x="${cx}" y="${cy - (centerLabel ? size * 0.03 : 0)}" dominant-baseline="central" text-anchor="middle" font-family="var(--font-display)" font-weight="700"
        font-size="${size * 0.16}" fill="var(--text-primary)">${centerText}</text>
      ${centerLabel ? `<text x="${cx}" y="${cy + size * 0.13}" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.06}" letter-spacing="0.05em" fill="var(--text-secondary)">${centerLabel}</text>` : ''}
    </svg>`;

    return { svg, rings: ringMeta };
  }

  return {
    sparkline, barChart, areaChart, donutRing, donutBreakdown, concentricRings,
    STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS_CHART, CATEGORY_PALETTE,
  };
})();
