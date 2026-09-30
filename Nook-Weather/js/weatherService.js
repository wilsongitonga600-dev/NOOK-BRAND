// weatherService.js
// Responsible for talking to external APIs and normalizing their responses.
// Nothing in this file knows about the DOM. Nothing in the UI knows about
// Open-Meteo. That separation is what lets either side change independently.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

// WMO weather codes -> a small set of groups the UI cares about.
// Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
const CODE_GROUPS = {
  0: 'clear', 1: 'clear', 2: 'partly-cloudy', 3: 'cloudy',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
  80: 'rain', 81: 'rain', 82: 'rain',
  85: 'snow', 86: 'snow',
  95: 'thunder', 96: 'thunder', 99: 'thunder',
};

const CODE_LABELS = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Thunderstorm, heavy hail',
};

export function weatherGroup(code) {
  return CODE_GROUPS[code] || 'cloudy';
}

export function weatherLabel(code) {
  return CODE_LABELS[code] || 'Unknown';
}

/**
 * Search for a place by name. Returns a normalized array, newest-friendly
 * fields only — the raw Open-Meteo geocoding shape never leaks past here.
 */
export async function searchLocations(query) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`);
  const data = await res.json();
  if (!data.results) return [];
  return data.results.map((r) => ({
    name: r.name,
    admin1: r.admin1 || '',
    country: r.country || '',
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/**
 * Best-effort label for a raw lat/lon (used for "my location"). Never throws:
 * a failed reverse-geocode just falls back to a generic label so the rest of
 * the app keeps working, matching the "one provider failing shouldn't break
 * the app" rule.
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `${REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    const name = data.city || data.locality || data.principalSubdivision;
    return {
      name: name || 'Current location',
      admin1: data.principalSubdivision || '',
      country: data.countryName || '',
      latitude: lat,
      longitude: lon,
    };
  } catch (err) {
    console.warn('reverseGeocode fallback:', err);
    return { name: 'Current location', admin1: '', country: '', latitude: lat, longitude: lon };
  }
}

/**
 * Fetch current conditions + a 7-day daily forecast for a coordinate pair,
 * normalized into a shape the UI layer can render without knowing anything
 * about Open-Meteo's field names.
 */
export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: 7,
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const raw = await res.json();
  return normalizeWeather(raw);
}

function normalizeWeather(raw) {
  const c = raw.current || {};
  const d = raw.daily || {};

  const current = {
    temperature: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    windDirection: c.wind_direction_10m,
    isDay: c.is_day === 1,
    code: c.weather_code,
    group: weatherGroup(c.weather_code),
    label: weatherLabel(c.weather_code),
  };

  const daily = (d.time || []).map((date, i) => ({
    date,
    code: d.weather_code[i],
    group: weatherGroup(d.weather_code[i]),
    label: weatherLabel(d.weather_code[i]),
    tempMax: Math.round(d.temperature_2m_max[i]),
    tempMin: Math.round(d.temperature_2m_min[i]),
    precipProbability: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
  }));

  return { current, daily, timezone: raw.timezone, utcOffsetSeconds: raw.utc_offset_seconds };
}
