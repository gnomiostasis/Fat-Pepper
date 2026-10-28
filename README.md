# Fat Pepper

A Katamari-style browser game about Pepper, a black-and-white border collie who starts as a tiny puppy and eats her way up to building size.

## Play

Once GitHub Pages is turned on (Settings → Pages → Source: **GitHub Actions**), every push to `main` publishes the game at
`https://gnomiostasis.github.io/Fat-Pepper/`.

**Controls:** arrow keys or WASD, or hold the mouse or your finger where Pepper should go.

## How a run works

1. **Indoors.** Pepper starts as a 12 cm puppy in the house. She can eat anything up to about her own size, and every bite makes her bigger and rounder. Grow to 56 cm and jump out the dog door.
2. **Outdoors** *(coming next)*. The dog catcher shows up and Pepper has to dodge him while she keeps growing.
3. **Turn the tables** *(coming later)*. Pepper gets big enough to chase down the dog catcher and eat him.

Powerups at size milestones, a generated house and neighbourhood, sound and a title screen are on the way.

## Develop

```sh
npm install
npm run dev      # local server with hot reload
npm run build    # type-check and build to dist/
```

The code is TypeScript with [Phaser 3](https://phaser.io). All art is drawn in code at start-up (no image files), in a 60s cartoon style:

- `src/art/` draws Pepper, items and furniture onto canvases that become Phaser textures.
- `src/game/tuning.ts` holds the feel numbers: growth rate, what Pepper can eat, speed, camera zoom.
- `src/game/house.ts` lays out the house and how many of each item get scattered.
- `src/scenes/` has the game itself and the HUD.
