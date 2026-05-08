# Shih Tzu City Adventure

A 2D browser platformer built with Phaser 3. Guide your shih tzu through 12 city levels, dodging birds and enemy dogs while collecting Pedigree bags for bonus points.

## Running

The browser blocks `file://` image loads, so serve the game over HTTP:

```
python -m http.server 8000
```

Then open `http://localhost:8000`. No build step, no package manager.

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move   | Arrow keys or A/D | Left / Right buttons |
| Jump   | Up, Space, or W | Jump button |
| Roar   | R | Roar button |

The roar knocks out nearby birds. On touch devices, tap the fullscreen button (top-right) to go fullscreen; hold the device in landscape.

## Gameplay

- Survive 12 levels, each with a unique city background
- Birds spawn off-screen and fly left — jump over them or roar to blast them
- Enemy dogs charge from ahead — jump over or roar them away
- Collect Pedigree bags for bonus points
- 3 lives carry across levels; reaching the goal flag advances to the next level
- Bird spawn rate increases as you approach the end of each level
- Difficulty cycles every 4 levels (levels 5–8 and 9–12 reuse the same speed tiers as 1–4)

## Files

```
index.html       — page shell, virtual gamepad, touch/fullscreen handling
game.js          — all game logic (single Phaser scene)
assets/          — background PNGs (×12), sprite sheets, bag image
```

## Tech

- [Phaser 3.80.1](https://phaser.io/) via jsDelivr CDN
- Arcade physics, no external dependencies
