# Fat Pepper

A Katamari-style browser game about Pepper, a black-and-white border collie who starts as a tiny puppy and eats her way up to building size.

## Play

Once GitHub Pages is turned on (Settings → Pages → Source: **GitHub Actions**), every push to `main` publishes the game at
`https://gnomiostasis.github.io/Fat-Pepper/`.

**Controls:** arrow keys or WASD, or hold the mouse or your finger where Pepper should go.

## How a run works

1. **Indoors.** Pepper starts as a 12 cm puppy in her bed in the living room of her real house (traced from a floor plan of it). She can eat anything up to about her own size, and every bite makes her bigger and rounder. Grow to 56 cm, then head through the pantry into the garage and jump out the dog door.
2. **Outdoors** *(coming next)*. The dog catcher shows up and Pepper has to dodge him while she keeps growing.
3. **Turn the tables** *(coming later)*. Pepper gets big enough to chase down the dog catcher and eat him.

Powerups at size milestones, a generated house and neighbourhood, sound and a title screen are on the way.

## Develop

```sh
npm install
npm run dev      # local server with hot reload
npm run build    # type-check and build to dist/
```

The code is TypeScript. The house is drawn in 3D with [three.js](https://threejs.org) in an "ink and paint" cartoon style (cel shading and ink outlines, 60s colours), and [Phaser 3](https://phaser.io) runs the game rules and the HUD on top. All art is built in code at start-up (no image or model files):

- `src/art/items.ts` lists every item and piece of furniture with its 3D model, built from simple shapes.
- `src/world3d/` draws the house, Pepper and the camera: `toon.ts` has the cel shading, ink outlines and model builder.
- `src/game/tuning.ts` holds the feel numbers: growth rate, what Pepper can eat, speed, how far back the camera sits.
- `src/game/house.ts` is Pepper's house, traced from a hand-drawn floor plan: walls, floors, furniture, and how many of each item get scattered.
- `src/scenes/` has the game itself and the HUD.
