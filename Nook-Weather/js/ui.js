// ui.js
// Pure(ish) rendering functions. These take already-normalized data and
// produce DOM — they never call fetch() themselves.

import { iconMarkup } from './icons.js';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hero gradients per weather group, split by day/night. The hero panel still
// reflects the real, current sky, but as a restrained tint on charcoal
// (warm for clear/thunder, teal for rain/drizzle) to fit the workbench theme.
const SKY = {
  clear: {
    day: ['#262520', '#3d3522'],
    night: ['#141716', '#1a201f'],
  },
  'partly-cloudy': {
    day: ['#232725', '#343a37'],
    night: ['#141716', '#1c2220'],
  },
  cloudy: {
    day: ['#222625', '#303634'],
    night: ['#131615', '#1b201f'],
  },
  fog: {
    day: ['#262a28', '#3a403d'],
    night: ['#151918', '#212725'],
  },
  drizzle: {
    day: ['#1e2726', '#2a3d3a'],
    night: ['#121615', '#192421'],
  },
  rain: {
    day: ['#1b2524', '#25393a'],
    night: ['#111514', '#162120'],
  },
  snow: {
    day: ['#262b2b', '#3b4444'],
    night: ['#151919', '#202727'],
  },
  thunder: {
    day: ['#211f1c', '#3a3020'],
    night: ['#121211', '#221e16'],
  },
};

export function skyGradient(group, isDay) {
  const pair = (SKY[group] || SKY.cloudy)[isDay ? 'day' : 'night'];
  return `linear-gradient(180deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

export function setStatus(el, message, tone = 'info') {
  el.textContent = message;
  el.dataset.tone = tone;
  el.hidden = !message;
}

export function renderCurrent(root, location, current) {
  root.querySelector('.hero-sky').style.background = skyGradient(current.group, current.isDay);
  root.querySelector('.hero-icon').innerHTML = iconMarkup(current.group, current.isDay);
  root.querySelector('.hero-temp').textContent = `${current.temperature}°`;
  root.querySelector('.hero-label').textContent = current.label;
  root.querySelector('.hero-place').textContent = formatPlace(location);
  root.querySelector('[data-stat="feels"]').textContent = `${current.feelsLike}°`;
  root.querySelector('[data-stat="humidity"]').textContent = `${current.humidity}%`;
  root.querySelector('[data-stat="wind"]').textContent = `${current.windSpeed} km/h`;
  root.querySelector('.hero').hidden = false;
}

export function renderForecast(root, daily) {
  const track = root.querySelector('.forecast-track');
  track.innerHTML = '';
  daily.forEach((day, i) => {
    const card = document.createElement('article');
    card.className = 'forecast-card';
    const label = i === 0 ? 'Today' : DAY_ABBR[new Date(day.date).getUTCDay()];
    card.innerHTML = `
      <p class="forecast-day">${label}</p>
      <div class="forecast-icon">${iconMarkup(day.group, true)}</div>
      <p class="forecast-precip">${day.precipProbability != null ? day.precipProbability + '%' : ''}</p>
      <p class="forecast-range"><span>${day.tempMax}°</span><span class="dim">${day.tempMin}°</span></p>
    `;
    track.appendChild(card);
  });
  root.querySelector('.forecast').hidden = false;
}

export function renderLocationResults(container, results, onPick) {
  container.innerHTML = '';
  if (!results.length) {
    container.hidden = true;
    return;
  }
  results.forEach((loc) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'location-result';
    btn.textContent = formatPlace(loc);
    btn.addEventListener('click', () => onPick(loc));
    container.appendChild(btn);
  });
  container.hidden = false;
}

function formatPlace(loc) {
  return [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
}
