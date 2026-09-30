# Nook Weather

A small, keyless weather app — part of the **Nook** collection of
experimental interfaces. Search any place, or use your device location,
and see current conditions plus a 7-day forecast.

Built as a plain HTML/CSS/JS project: no framework, no build step, no
API keys required for any feature.

---

## Features

- Current conditions: temperature, feels-like, humidity, wind
- 7-day forecast with precipitation probability
- Search by place name, or "use my location" via the browser's
  Geolocation API
- A hero panel whose sky gradient changes based on the actual current
  condition and time of day (clear, cloudy, rain, snow, thunder — day
  or night), instead of a fixed color
- Graceful error states if a lookup or the network fails — the app
  never goes fully blank

---

## Tech stack

- HTML / CSS / vanilla JavaScript (ES modules)
- [Open-Meteo](https://open-meteo.com/) — weather + geocoding, no API key
- [BigDataCloud](https://www.bigdatacloud.com/) — reverse geocoding for
  "use my location," no API key
- Google Fonts: Space Grotesk, IBM Plex Sans, IBM Plex Mono

No build tool is required — this runs directly as static files.

---

## Architecture

The project follows a simple three-layer separation, so the UI never
talks to an external API directly and the data layer never touches the
DOM:

```
External APIs (Open-Meteo, BigDataCloud)
        │
        ▼
js/weatherService.js   — fetches raw data, normalizes it into a
                          consistent shape (temperature, group, label,
                          etc.), independent of any provider's field names
        │
        ▼
js/ui.js                — pure rendering functions: given normalized
                          data, produces DOM. Never calls fetch() itself
        │
        ▼
js/app.js                — wiring: DOM event listeners (search,
                          geolocation), calls weatherService, passes
                          results to ui.js, handles errors
```

```
js/icons.js — small hand-drawn line-art SVG icon set, keyed by weather
              group (clear, cloudy, rain, snow, thunder, etc.), with no
              external icon library dependency
```

This means the weather-fetching logic (`weatherService.js`) can be
reused as-is by another project — such as the Earth View weather layer
— without dragging along any of this app's UI code.

---

## Data sources

See [`DATA_SOURCES.md`](./DATA_SOURCES.md) for full attribution,
licensing, and rate-limit details for every provider this app calls.

Summary: everything is keyless. No `.env` file, no signup, no billing
risk from normal use.

---

## Setup

No installation step — this is static HTML/CSS/JS. Because the app
uses ES module `import`/`export`, it must be served over HTTP (not
opened directly as a `file://` URL, which browsers block for modules).

From the project folder:

```
python -m http.server 8080
```

Then open `http://localhost:8080` in a browser on the same device.

Any static file server works equally well (`npx serve`, `php -S`,
etc.) — Python's is just usually already available.

---

## Project structure

```
nook-weather/
├── index.html
├── DATA_SOURCES.md
├── README.md
├── css/
│   └── style.css
└── js/
    ├── app.js              # wiring / event handlers
    ├── ui.js                # rendering
    ├── weatherService.js    # fetch + normalize
    └── icons.js              # SVG icon set
```

---

## Known limitations

- No response caching yet — each search or location change re-fetches
  from Open-Meteo. Fine at current usage; worth adding if traffic ever
  approaches the free-tier rate limit (see `DATA_SOURCES.md`).
- Reverse geocoding (for "use my location") falls back to a generic
  "Current location" label if BigDataCloud is unreachable — weather
  data still loads correctly in that case.
- No offline support; requires a live network connection.
- No automated tests yet.

---

## License

Application code: [MIT](./LICENSE).

Weather and geocoding data: CC BY 4.0 via Open-Meteo. See
`DATA_SOURCES.md` for details on all third-party data terms.
