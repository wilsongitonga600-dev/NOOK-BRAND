// app.js — wiring only. Talks to weatherService for data, ui.js for
// rendering. Keeps the same three-layer separation as the Earth View plan.

import { searchLocations, reverseGeocode, fetchWeather } from './weatherService.js';
import { renderCurrent, renderForecast, renderLocationResults, setStatus } from './ui.js';

const root = document;
const form = root.querySelector('.search-form');
const input = root.querySelector('.search-input');
const locateBtn = root.querySelector('.locate-btn');
const results = root.querySelector('.location-results');
const status = root.querySelector('.status');

async function loadFor(location) {
  setStatus(status, `Loading weather for ${location.name}…`, 'info');
  results.hidden = true;
  try {
    const weather = await fetchWeather(location.latitude, location.longitude);
    renderCurrent(root, location, weather.current);
    renderForecast(root, weather.daily);
    setStatus(status, '', 'info');
  } catch (err) {
    console.error('fetchWeather failed:', err);
    setStatus(status, 'Could not load weather right now. Check your connection and try again.', 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  setStatus(status, `Searching for "${query}"…`, 'info');
  try {
    const matches = await searchLocations(query);
    if (matches.length === 0) {
      setStatus(status, `No places found for "${query}".`, 'error');
      return;
    }
    if (matches.length === 1) {
      setStatus(status, '', 'info');
      loadFor(matches[0]);
      return;
    }
    setStatus(status, '', 'info');
    renderLocationResults(results, matches, (loc) => {
      input.value = loc.name;
      loadFor(loc);
    });
  } catch (err) {
    console.error('searchLocations failed:', err);
    setStatus(status, 'Search is unavailable right now. Try again in a moment.', 'error');
  }
});

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus(status, 'Your browser does not support location access.', 'error');
    return;
  }
  setStatus(status, 'Finding your location…', 'info');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const location = await reverseGeocode(latitude, longitude);
      input.value = '';
      loadFor(location);
    },
    (err) => {
      console.warn('geolocation failed:', err);
      setStatus(status, 'Location access was denied or unavailable.', 'error');
    },
    { timeout: 10000 }
  );
});

// Default view on load: a starting location so the app isn't blank.
// Nairobi, since that's a sensible default for this project.
loadFor({ name: 'Nairobi', admin1: '', country: 'Kenya', latitude: -1.2833, longitude: 36.8167 });
