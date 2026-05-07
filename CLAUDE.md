# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-scene Phaser 3 (loaded via CDN, no build step) 2D platformer. The shih tzu protagonist runs right through a tiled city background while avoiding birds that spawn off-screen and fly leftward at him.

## Running

The browser blocks `file://` image loads, so the game must be served over HTTP. From the project root:

```
python -m http.server 8000
```

Then open `http://localhost:8000`. There is no build, no test suite, no linter, and no package manager — editing `game.js` and refreshing the browser is the entire dev loop.

## Architecture

**Three files, no modules.** `index.html` loads Phaser from jsDelivr and then `game.js`. `game.js` defines one Phaser scene as bare `preload` / `create` / `update` functions and a few module-scoped `let` variables (`player`, `birds`, `cursors`, `lives`, `gameState`, …). State is reset at the top of `create()` so `this.scene.restart()` works cleanly.

**Sprite sheets are sliced by hand, not via `load.spritesheet`.** The two character PNGs are 6×3 grids whose dimensions don't divide evenly (e.g. 1672/6 = 278.67). To avoid the fractional-frame headache, `preload()` loads each sheet as a plain image, and `create()` registers named sub-frames via `textures.get(key).add(name, 0, x, y, w, h)` — see the `addFrame()` helper. `SHIH_W/H` and `BIRD_W/H` are the resulting integer frame sizes (`Math.floor` of the divisions).

**Tuning constants live at the top of `game.js`:**
- `WORLD_W` (5400) — world length; the goal flag sits near the right edge.
- `GROUND_Y` (470) — Y of the top of the invisible ground collider that runs the entire world. The visible "ground" is just the sidewalk strip in the tiled city background; raising/lowering `GROUND_Y` shifts the player, the goal flag, and the bird spawn band together but does **not** move the background — keep them visually aligned by eye.
- `VIEW_W/H` (960×540) — camera viewport.

**Hitboxes are deliberately tighter than the rendered sprites** because the source PNGs have wide transparent margins. `player.body.setSize(150, 200)` plus a `setOffset` are calibrated against the unscaled frame; if you change `setScale` or swap art, both need re-tuning. Same pattern for birds in `spawnBird()`.

**Bird difficulty ramps with progress.** In `update()` the spawn cadence is recomputed every spawn from `progress = player.x / WORLD_W`, shrinking both `minDelay` and `maxDelay`. Off-screen birds (more than `VIEW_W` behind the player) are destroyed each frame to keep the group bounded.

**Game state is a string** (`'playing' | 'won' | 'gameover'`) checked at the top of `update()`. `R` triggers `scene.restart()` only when not playing.
