# Fat Pepper

A Katamari-style browser game about Pepper, a black-and-white border collie who starts as a tiny puppy and eats her way up from crumbs to houses, neighborhoods and whole towns.

## Play

Once GitHub Pages is turned on (Settings → Pages → Source: **GitHub Actions**), every push to `main` publishes the game at
`https://gnomiostasis.github.io/Fat-Pepper/`.

**Controls:** arrow keys or WASD, or hold the mouse where Pepper should go. On phones and tablets, put a thumb down anywhere and drag: a thumbstick appears under it and stays there, and dragging further from it runs faster.

## How a run works

1. **Indoors.** Pepper starts as a 12 cm puppy in her bed in the living room of her real house (traced from a floor plan of it). She can eat anything up to about her own size, and every bite makes her bigger and rounder. Grow to 56 cm, then head through the pantry into the garage and jump out the dog door.
2. **Outdoors.** Out the dog door is the neighborhood: streets, yards, houses and a lot more to eat. At 80 cm the dog catcher spots Pepper and gives chase with his net. Keep eating and keep moving; if he catches her, it is off to the pound.
3. **Turning the tables.** At 2.88 m Pepper is bigger than the dog catcher. He runs, and she can eat him.
4. **Eating the neighborhood.** With the dog catcher gone, Pepper keeps growing on cars and trees. At about 7.2 m she can eat the smallest houses (smaller houses go first; Big Jaws helps), and every house is a huge bite. From then on everything on the map is edible, yard fences included.
5. **Into town.** At 14 m Pepper has outgrown the neighborhood: an arrow points to the nearest edge, and walking off it takes her into town. The town is a winding English market town, laid out fresh each run: a high street curving through the market square and town hall, a ring road, side streets and lanes ending in cul-de-sacs, shops, cafés, offices and churches in the middle and houses further out. A river runs through it (small Pepper has to paddle, except on the bridges), there's a railway with its station and trains, a park with a pond, a fairground with a Ferris wheel and circus tent, and woods out in the country. Out on the edge of town are whole neighborhoods, each a hedged patch of little houses. Once she's 22 m across she's too wide for the streets and steps over anything she can't eat yet, so nothing can box her in. At about 90 m she can eat a neighborhood in one gulp.
6. **The countryside.** At 140 m Pepper has outgrown the town, and walking off any edge takes her out into the countryside: 8 km of patchwork fields, rivers and lakes, a motorway and country lanes, with barns, silos, windmills and wind turbines to snack on, then farms, forests and castles. Villages and whole towns are dotted about, kept far enough apart that they can't trap her. At about 416 m she can gulp down a whole town, and from 300 m she strides over anything she can't eat yet. Reach 800 m and she has eaten the countryside: that's the win.

**Powerups.** Pepper picks 1 of 3 random powerups at the start of the run, then again at 48 cm and 1.64 m, twice more in town at 28 m and 64 m, and twice in the countryside at 280 m and 600 m. The game pauses for each pick: click or tap a card, or press 1, 2 or 3. Picks stack for the rest of the run, so every run builds differently:

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

The real neighborhood map, sound and a title screen are on the way.

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
- `src/game/country.ts` is the countryside and `src/art/countryItems.ts` its farms, forests, castles, villages and towns.
- `src/game/town.ts` is the town, laid out fresh each run, and `src/art/townItems.ts` has its buildings, vehicles and whole neighborhoods.
- `src/game/grid.ts` is a spatial grid, so the game only checks the things near Pepper each frame. On big maps `World3D` also draws things in chunks, skipping chunks that are off screen and things too small to see.
- `src/scenes/` has the game itself and the HUD.
