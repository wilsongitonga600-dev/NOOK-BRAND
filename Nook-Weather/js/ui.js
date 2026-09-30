// ui.js
// Pure(ish) rendering functions. These take already-normalized data and
// produce DOM — they never call fetch() themselves.

import { iconMarkup } from './icons.js';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Sky gradients per weather group, split by day/night. This is the one
// place the app's "signature" lives: the hero panel's background always
// reflects the real, current sky rather than a fixed color.
const SKY = {
  clear: {
    day: ['#3E6FB0', '#E8A94A'],
    night: ['#0B0F22', '#2B2F63'],
  },
  'partly-cloudy': {
    day: ['#4E7AAE', '#B9C4D6'],
    night: ['#12172B', '#3A3F66'],
  },
  cloudy: {
    day: ['#5B6B82', '#A6AEBD'],
    night: ['#14182A', '#333852'],
  },
  fog: {
    day: ['#7C8592', '#C7CCD3'],
    night: ['#1A1E2E', '#454A5E'],
  },
  drizzle: {
    day: ['#3F5A72', '#6FA8B8'],
    night: ['#0F1424', '#2C4658'],
  },
  rain: {
    day: ['#2E4A63', '#5A8AA0'],
    night: ['#0A0E1C', '#233A4C'],
  },
  snow: {
    day: ['#5D7690', '#DCE6EC'],
    night: ['#151A2C', '#495B6E'],
  },
  thunder: {
    day: ['#2A2540', '#8B7EC8'],
    night: ['#0A0813', '#2E2650'],
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
