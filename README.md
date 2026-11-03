# Fat Pepper

A Katamari-style browser game about Pepper, a black-and-white border collie who starts as a tiny puppy and eats her way up to building size.

## Play

Once GitHub Pages is turned on (Settings → Pages → Source: **GitHub Actions**), every push to `main` publishes the game at
`https://gnomiostasis.github.io/Fat-Pepper/`.

**Controls:** arrow keys or WASD, or hold the mouse or your finger where Pepper should go.

## How a run works

1. **Indoors.** Pepper starts as a 12 cm puppy in her bed in the living room of her real house (traced from a floor plan of it). She can eat anything up to about her own size, and every bite makes her bigger and rounder. Grow to 56 cm, then head through the pantry into the garage and jump out the dog door.
2. **Outdoors.** Out the dog door is the neighborhood: streets, yards, houses and a lot more to eat. At 80 cm the dog catcher spots Pepper and gives chase with his net. Keep eating and keep moving; if he catches her, it is off to the pound.
3. **Turning the tables.** At 2.88 m Pepper is bigger than the dog catcher. He runs, and she can eat him.

**Powerups.** At each size milestone (18 cm, 26 cm, 36 cm and on up to 2.6 m) the game pauses and Pepper picks 1 of 3 random powerups: click or tap a card, or press 1, 2 or 3. Picks stack for the rest of the run, so every run builds differently:

| Powerup | What it does (per pick) |
| --- | --- |
| 💨 Zoomies | 15% faster |
| 🧲 Snack Magnet | Nearby snacks slide toward Pepper; bigger range each pick |
| 🦷 Big Jaws | Eat things about 11% bigger, which also means eating the dog catcher sooner |
| 🍖 Bottomless Belly | 15% more growth from every bite |
| 👅 Long Tongue | Slurp up loose food from further away |
| 🔥 Munch Streak | Quick bites in a row build a streak worth up to 40% extra growth |
| 🍬 Sugar Rush | A one-second speed burst after every bite |
| 🛡️ Slippery Fur | The dog catcher's net slips off once (stacks into extra saves) |
| 🐾 Sneaky Paws | The dog catcher chases 10% slower |
| 🦴 Treat Rain | Snacks sized for Pepper rain down around her right away |

The real neighborhood map, eating whole buildings, sound and a title screen are on the way.

## Develop

```sh
npm install
npm run dev      # local server with hot reload
npm run build    # type-check and build to dist/
```

The code is TypeScript. The house is drawn in 3D with [three.js](https://threejs.org) in a "garden pastel" style (flat pastel colours, no outlines, soft shadows, a cozy English-village feel), and [Phaser 3](https://phaser.io) runs the game rules and the HUD on top. All art is built in code at start-up (no image or model files):

- `src/art/items.ts` lists every item and piece of furniture with its 3D model, built from simple shapes.
- `src/world3d/` draws the house, Pepper and the camera: `toon.ts` has the soft flat shading and model builder.
- `src/game/powerups.ts` lists the powerups, how strong each pick is, and the sizes where picks happen.
- `src/game/tuning.ts` holds the feel numbers: growth rate, what Pepper can eat, speed, how far back the camera sits.
- `src/game/house.ts` is Pepper's house, traced from a hand-drawn floor plan: walls, floors, furniture, and how many of each item get scattered.
- `src/game/neighborhood.ts` is Phase 2: the streets, yards and houses outside, laid out fresh each run.
- `src/scenes/` has the game itself and the HUD.
