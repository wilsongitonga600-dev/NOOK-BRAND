// icons.js
// Small hand-drawn line-art icon set, keyed by weather group. Kept as inline
// SVG strings so the app has zero icon-library dependency.

const STROKE = 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';

const ICONS = {
  clear: (isDay) => isDay
    ? `<circle cx="24" cy="24" r="8" ${STROKE}/>
       <g ${STROKE}>
         <line x1="24" y1="4" x2="24" y2="10"/>
         <line x1="24" y1="38" x2="24" y2="44"/>
         <line x1="4" y1="24" x2="10" y2="24"/>
         <line x1="38" y1="24" x2="44" y2="24"/>
         <line x1="9.5" y1="9.5" x2="13.8" y2="13.8"/>
         <line x1="34.2" y1="34.2" x2="38.5" y2="38.5"/>
         <line x1="9.5" y1="38.5" x2="13.8" y2="34.2"/>
         <line x1="34.2" y1="13.8" x2="38.5" y2="9.5"/>
       </g>`
    : `<path d="M32 10a14 14 0 1 0 6 26 12 12 0 0 1-6-26z" ${STROKE}/>`,

  'partly-cloudy': (isDay) => `
    <circle cx="18" cy="18" r="6" ${STROKE} opacity="${isDay ? 1 : 0.5}"/>
    <path d="M14 34h20a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" ${STROKE}/>`,

  cloudy: () => `
    <path d="M12 32h22a7.5 7.5 0 0 0 0-15 10 10 0 0 0-19-2 6.5 6.5 0 0 0-3 17z" ${STROKE}/>
    <path d="M10 38h20" ${STROKE} opacity="0.5"/>`,

  fog: () => `
    <path d="M14 20h20a6 6 0 1 0-4.8-9.6" ${STROKE}/>
    <line x1="8" y1="28" x2="40" y2="28" ${STROKE}/>
    <line x1="12" y1="34" x2="36" y2="34" ${STROKE}/>
    <line x1="8" y1="40" x2="40" y2="40" ${STROKE}/>`,

  drizzle: () => `
    <path d="M12 24h22a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" ${STROKE}/>
    <line x1="16" y1="32" x2="14" y2="38" ${STROKE}/>
    <line x1="24" y1="32" x2="22" y2="38" ${STROKE}/>
    <line x1="32" y1="32" x2="30" y2="38" ${STROKE}/>`,

  rain: () => `
    <path d="M12 22h22a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" ${STROKE}/>
    <line x1="15" y1="30" x2="12" y2="40" ${STROKE}/>
    <line x1="24" y1="30" x2="21" y2="40" ${STROKE}/>
    <line x1="33" y1="30" x2="30" y2="40" ${STROKE}/>`,

  snow: () => `
    <path d="M12 20h22a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" ${STROKE}/>
    <g ${STROKE}>
      <line x1="16" y1="30" x2="16" y2="40"/>
      <line x1="11.5" y1="35" x2="20.5" y2="35"/>
      <line x1="24" y1="30" x2="24" y2="40"/>
      <line x1="19.5" y1="35" x2="28.5" y2="35"/>
      <line x1="32" y1="30" x2="32" y2="40"/>
      <line x1="27.5" y1="35" x2="36.5" y2="35"/>
    </g>`,

  thunder: () => `
    <path d="M12 20h22a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" ${STROKE}/>
    <path d="M25 26l-7 11h6l-3 9 11-13h-6l4-7z" ${STROKE} fill="currentColor" opacity="0.9"/>`,
};

export function iconMarkup(group, isDay = true) {
  const fn = ICONS[group] || ICONS.cloudy;
  return `<svg viewBox="0 0 48 48" width="1em" height="1em" aria-hidden="true">${fn(isDay)}</svg>`;
}
