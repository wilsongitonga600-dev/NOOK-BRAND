# Nook: Lumina Run — Phase 2

A colorful, offline-first 2D side-scrolling platformer, built to run entirely
inside Termux on Android with zero external dependencies. Part of the Nook
collection.

Guide a glowing runner across three hand-built levels, collecting crystals,
hitting checkpoints, dodging enemies, and grabbing a shield power-up, all the
way to a glowing goal portal at the end of each level.

---

## Tech Stack

**Runtime:** Node.js (built-in modules only — no `npm install` required)

| Layer | Technology | Notes |
|---|---|---|
| Server | Node `http` module | Hand-rolled static file server + tiny REST API, no Express |
| Database | SQLite via the system `sqlite3` CLI | Node shells out to `sqlite3 -json` rather than using a native driver, so there's nothing to compile on-device |
| Frontend rendering | HTML5 `<canvas>` (2D context) | Entire game world, player, and effects are drawn manually every frame — no rendering library |
| Frontend logic | Vanilla ES6+ JavaScript (classes, plain `<script>` tags) | No React/Vue, no bundler, no build step |
| Game loop | `requestAnimationFrame` | Update/draw loop driven from `game.js` |
| Audio | Web Audio API, synthesized in-browser | No `.mp3`/`.wav` files — every sound effect is generated from oscillators at runtime |
| Styling | Plain CSS3 (Flexbox, gradients, `backdrop-filter`) | No CSS framework |
| Persistence | SQLite row per save, fetched via `fetch()` to the local API | Progress (level, checkpoint, score, crystals, health) survives restarts |

**Why no dependencies?** The whole point of the Nook collection is that it
runs on a phone via Termux without needing `npm install` to succeed on
flaky mobile data, without native module compilation, and without a build
step. `package.json` has an empty dependency list on purpose.

---

## Project Structure

```
nook-lumina-run/
├── server.js                       # HTTP server: static files + /api/* routing
├── package.json
├── server/
│   ├── routes/save-routes.js       # Routes /api/save, /api/load, /api/reset
│   ├── controllers/save-controller.js  # Request handling for progress save/load
│   └── database/
│       ├── db.js                   # Shells out to the `sqlite3` CLI (-json mode)
│       ├── schema.sql              # game_progress table definition
│       └── game.db                 # Created automatically on first run
└── public/
    ├── index.html                  # All screens (menu, HUD, pause, win, game-over)
    ├── css/
    │   ├── main.css                 # Layout, menu screens, buttons, mobile controls
    │   ├── game-ui.css              # HUD (health, crystals, score, checkpoint pips)
    │   └── animations.css           # Transitions, pulses, particle-adjacent effects
    └── js/
        ├── main.js                  # Boot: creates Game, wires DOMContentLoaded
        ├── game.js                  # Core game state machine, loop, level lifecycle
        ├── player/player.js         # Player physics response, animation, drawing
        ├── world/level.js           # Level data (3 levels): platforms, enemies,
        │                             #   checkpoints, crystals, goal, power-ups
        ├── world/camera.js          # Camera follow + clamp to level bounds
        ├── systems/physics.js       # Gravity, collision resolution (AABB)
        ├── systems/particles.js     # Lightweight particle system (bursts, trails)
        ├── systems/audio.js         # Web Audio synth: jump/land/crystal/hit/etc.
        └── ui/
            ├── hud.js                # In-game HUD rendering (canvas-drawn)
            └── menu.js               # Menu screens, level select, pause/win/game-over
```

**~1,830 lines of hand-written JS** across the client and server, no
generated or vendored code.

---

## Architecture Notes

- **Single canvas, manual rendering.** There's one `<canvas>` element;
  everything you see in gameplay — background, platforms, player, enemies,
  particles, HUD — is drawn imperatively each frame in `game.js`'s `draw()`
  method. HTML/CSS is only used for the menu, pause, and end-of-level
  overlay screens, which sit on top of the canvas and are shown/hidden via
  a `.hidden` class.

- **State machine.** `Game.state` drives everything: `MENU` → `PLAYING` →
  `PAUSED` / `WIN` / `GAME_OVER`, plus `LEVEL_SELECT` and `SETTINGS`
  overlay states. `draw()` branches on this to decide what to render each
  frame.

- **Level data as plain objects.** Each of the 3 levels (`Level` class in
  `world/level.js`) is just arrays of platform rects, enemy spawn points,
  checkpoint positions, crystal positions, and a goal — no external level
  format or editor, easy to hand-tune by editing numbers.

- **Physics is simple AABB.** `systems/physics.js` applies gravity, then
  resolves collisions against platform rectangles axis-by-axis. No physics
  engine.

- **Audio is fully synthesized.** `systems/audio.js` builds each sound
  effect from Web Audio oscillators/envelopes on the fly — there are no
  audio asset files to ship or load.

- **Persistence via a tiny REST API.** The client calls `/api/save`,
  `/api/load`, and `/api/reset`. The server executes SQL through the
  `sqlite3` CLI binary via `child_process.spawn`, with `-json` for reads —
  no `sqlite3`/`better-sqlite3` npm package needed, just the system binary
  most Termux setups already have.

---

## Phase 2 Features

- 3 full levels (Crystal Caverns → Sky Ruins → Void Edge) with a level
  select screen and lock/unlock progression
- Checkpoints + persistent save/continue (level, checkpoint, score,
  crystals, health)
- Squash/stretch player animation, landing effects, screen shake
- Flying enemy type, shield power-up
- Web Audio–synthesized sound effects, no audio files
- Level-transition fades, glowing goal portal at the end of every level
- Deep teal/navy visual theme throughout
- Boot-time error overlay (catches both thrown errors and unhandled
  promise rejections) to make on-device debugging in a mobile browser
  possible without devtools

---

## Running It (Termux / Android)

```bash
cd nook-lumina-run
sqlite3 --version      # confirm sqlite3 CLI is available
node server.js
```

Then open `http://localhost:3000` in your phone's browser. The server also
prints a LAN address if you want to play from another device on the same
network.

No `npm install` step — `package.json` has no dependencies to fetch.

---

## Controls

- **On-screen buttons** (mobile): ◀ / ▶ to move, JUMP to jump
- **Keyboard** (desktop browsers): Arrow keys / A-D to move, Space or Up to
  jump

---

## Pushing to GitHub (from Termux)

```bash
cd nook-lumina-run
pkg install git          # if not already installed
git init
git add .
git commit -m "Nook Lumina Run v1.0.0"
```

Create an empty repo on GitHub (no README/license/gitignore — you already
have those), then:

```bash
git remote add origin https://github.com/<your-username>/nook-lumina-run.git
git branch -M main
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

`.gitignore` already excludes `server/database/game.db` (your local save
data) and `node_modules/`, so a fresh clone starts clean. Worth cloning it
into an empty folder yourself once and following the "Running It" steps
above, just to confirm it boots with nothing extra needed.
