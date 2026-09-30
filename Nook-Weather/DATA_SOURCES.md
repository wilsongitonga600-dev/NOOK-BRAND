# Data Sources — Nook Weather

This file documents every external data provider Nook Weather depends on,
per the project's data-source documentation convention (see Earth View's
CLAUDE.md). Update this file whenever a new provider is added or an
existing one's terms change.

---

## Open-Meteo — Forecast API

- **Purpose:** Current weather conditions and 7-day daily forecast
  (temperature, apparent temperature, humidity, wind, weather code,
  precipitation probability).
- **Endpoint used:** `https://api.open-meteo.com/v1/forecast`
- **Authentication:** None. No API key required for non-commercial use.
- **Attribution:** Required. Displayed in the app footer with a link to
  https://open-meteo.com/
- **License / terms:** CC BY 4.0 for weather data. Free for
  non-commercial use up to 10,000 API calls/day; commercial use requires
  a paid plan. See https://open-meteo.com/en/terms
- **Usage restrictions:** Stay within the free-tier rate limit; no
  redistribution of raw data as a competing weather API.
- **Update frequency:** Forecast data refreshes hourly on Open-Meteo's
  side; the app fetches fresh data on each location lookup (no local
  caching yet).

## Open-Meteo — Geocoding API

- **Purpose:** Convert a place name typed by the user (e.g. "Mombasa")
  into coordinates and a normalized location (name, admin1, country).
- **Endpoint used:** `https://geocoding-api.open-meteo.com/v1/search`
- **Authentication:** None.
- **Attribution:** Covered by the same Open-Meteo attribution as above.
- **License / terms:** Same as the Forecast API (CC BY 4.0 data, free
  non-commercial tier). See https://open-meteo.com/en/terms
- **Usage restrictions:** Same free-tier limits as the Forecast API.
- **Update frequency:** Static reference dataset; not time-sensitive.

## BigDataCloud — Client-Side Reverse Geocoding

- **Purpose:** Convert the device's GPS coordinates (from the browser's
  Geolocation API) into a human-readable place name for the "use my
  location" feature.
- **Endpoint used:** `https://api.bigdatacloud.net/data/reverse-geocode-client`
- **Authentication:** None for the free client-side endpoint.
- **Attribution:** Not strictly required for the free client-side
  endpoint, but credited here for transparency. See
  https://www.bigdatacloud.com/
- **License / terms:** Free tier intended for client-side, low-volume
  use. Review current terms before any high-traffic or commercial
  deployment: https://www.bigdatacloud.com/pricing
- **Usage restrictions:** Free tier is rate-limited; not guaranteed for
  production-scale traffic without a paid plan.
- **Update frequency:** Called once per "use my location" action, not
  polled.

## Google Fonts — Space Grotesk, IBM Plex Sans, IBM Plex Mono

- **Purpose:** Typography (display, body, and data/label typefaces).
- **Loaded via:** `fonts.googleapis.com` `<link>` tags in `index.html`.
- **Authentication:** None.
- **License / terms:** All three are open-source (SIL Open Font
  License). Free for any use, including commercial, with attribution
  not required beyond the license file included by the foundry.
- **Usage restrictions:** None beyond the OFL terms.
- **Update frequency:** N/A (static assets, versioned by Google Fonts).

## Browser Geolocation API

- **Purpose:** Retrieve the device's current GPS coordinates for the
  "use my location" feature.
- **Provider:** Native browser API (`navigator.geolocation`), not a
  third-party service — no network request to Nook Weather's own
  infrastructure or a data vendor.
- **Authentication:** None; requires user permission prompt in-browser.
- **License / terms:** N/A — standard Web API.
- **Usage restrictions:** Requires HTTPS (or localhost) in most modern
  browsers; will not work over plain HTTP on a remote host.

---

## Notes

- No API keys are required anywhere in this app. If a future feature
  needs a paid or key-gated provider, add it here with the same fields
  before wiring it in, and confirm it degrades gracefully if the key is
  missing (per the "one failed provider shouldn't break the app" rule).
- If usage grows enough to approach Open-Meteo's free-tier request
  limits, add response caching in `weatherService.js` before reaching
  for a paid plan.
