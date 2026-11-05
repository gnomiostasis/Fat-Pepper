# Fat Pepper

A Katamari-style browser game about Pepper, a black-and-white border collie who starts as a tiny puppy and eats her way up from crumbs to houses, neighborhoods, whole towns, cities and islands, until her head pokes out of the sky into space.

## Play

Once GitHub Pages is turned on (Settings → Pages → Source: **GitHub Actions**), every push to `main` publishes the game at
`https://gnomiostasis.github.io/Fat-Pepper/`.

**Controls:** arrow keys or WASD, or hold the mouse where Pepper should go. On phones and tablets, put a thumb down anywhere and drag: a thumbstick appears under it and stays there, and dragging further from it runs faster.

## How a run works

The whole run is one world, with no loading in between: Pepper's house sits on its lot in the neighborhood, the neighborhood sits on the west edge of a market town (its main road carries on as the town's high street), the town sits in the middle of 8 km of countryside, on the motorway, the countryside sits in the middle of an island 64 km across, and the island sits in 480 km of open ocean. It's all there from the start, laid out fresh each run, and the camera just keeps pulling back as Pepper grows.

0. **Asleep.** Every run opens on Pepper fast asleep in her bed at night, dreaming of snacks in a thought bubble. Press start and the bubble pops, she wakes up, stands and turns round, and the lights come up on the living room.
1. **Indoors.** Pepper starts as a 12 cm puppy in her bed in the living room of her real house (traced from a floor plan of it). She can eat anything up to about her own size, and every bite makes her bigger and rounder. Grow to 56 cm, then head through the pantry into the garage and jump out the dog door. The flap swings shut behind her.
2. **The neighborhood.** A main road winds across it, a crescent loops round a little park with a pond, and side streets curve off to cul-de-sacs. Every house faces its street, with a front yard, a driveway and a fenced backyard that opens onto the green behind, and footpaths between the houses every few lots, so there's always a way round. Pepper's own house is one of them, roof off. At 80 cm the dog catcher spots Pepper and gives chase with his net, which grows with her so it can always bag her. Keep eating and keep moving; if he catches her, it is off to the pound.
3. **Turning the tables.** At 5 m Pepper can finally eat the dog catcher. He freezes and cowers where he stands, so she can go get him. If she gets to 14 m without catching him, he gives up.
4. **Eating the neighborhood.** Pepper keeps growing on cars and trees. At about 7.2 m she can eat the smallest houses (smaller houses go first; Big Jaws helps), and every house is a huge bite. From then on yard fences are food too, and so are the walls of her own house.
5. **The town.** Nothing stops Pepper wandering into town whenever she likes. It's a winding English market town: a high street curving through the market square and town hall, a ring road, side streets and lanes ending in cul-de-sacs, shops, cafés, offices and churches in the middle and houses further out. A river runs through it (small Pepper has to paddle, except on the bridges), there's a railway with its station and trains, a park with a pond, a fairground with a Ferris wheel and circus tent, and woods. Out on the edge of town are more neighborhoods, each a hedged patch of little houses. Once she's 22 m across she's too wide for the streets and steps over anything she can't eat yet, anywhere in the world, so nothing can box her in. At about 90 m she can eat a neighborhood in one gulp.
6. **The countryside.** All around the town: patchwork fields, rivers and lakes, the motorway and country lanes, with barns, silos, windmills and wind turbines to snack on, then farms, forests and castles. Villages and whole towns are dotted about. At about 416 m she can gulp down a whole town. By 800 m she has outgrown the countryside.
7. **The island.** All around the countryside, out to the sea: more farmland, villages and towns, hills, great forests and lakes, mountain ranges with rivers running down to the sea, airports, ports with their cranes and container ships, lighthouses on the headlands, and ships, ferries and oil rigs out at sea. The motorway carries on out to the cities. At about 3.2 km she can eat a whole city, and at 5.1 km the capital. At 6.4 km she has outgrown the island.
8. **The ocean, and up into space.** Out past the island's coast is the open ocean, with Pepper's head up among the clouds. Icebergs drift down from the north, naval fleets sail about, and atolls, clouds and storms are all snacks. At about 11 km she can eat whole islands, then volcanoes, hurricanes and big islands, and at 80 km whole stretches of the mainland. From 20 km across her head is above the clouds and the sky starts to go dark round the edges, with stars coming out. Reach 100 km, the edge of space, and she's made it: that's the win. And she's still hungry: she keeps on growing until she gulps down the whole Earth, and goes into orbit round the sun as a round ball of a dog. Then the orbit shrinks into a thought bubble over her head, and she's back asleep in her bed: it was all a dream. The ending stops on exactly the frame the game opened on, so press Play again and she wakes up and it all starts over.

**Powerups.** Pepper picks 1 of 3 random powerups at the start of the run, then again at 48 cm, 1.64 m, 28 m, 64 m, 280 m, 600 m, 1.4 km, 3 km, 12 km and 32 km. The game pauses for each pick: click or tap a card, or press 1, 2 or 3. Picks stack for the rest of the run, so every run builds differently:

| Powerup | What it does (per pick) |
| --- | --- |
| 💨 Zoomies | 15% faster |
| 🧲 Snack Magnet | Nearby snacks slide toward Pepper; bigger range each pick |
| 🦷 Big Jaws | Eat things about 11% bigger |
| 🍖 Bottomless Belly | 15% more growth from every bite |
| 👅 Long Tongue | Slurp up loose food from further away |
| 🔥 Munch Streak | Quick bites in a row build a streak worth up to 40% extra growth |
| 🍬 Sugar Rush | A one-second speed burst after every bite |
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
- `src/world3d/` draws the house, Pepper and the camera: `toon.ts` has the soft flat shading and model builder. `ending.ts` is the ending, where Pepper eats the Earth and goes into orbit.
- `src/game/powerups.ts` lists the powerups, how strong each pick is, and the sizes where picks happen.
- `src/game/tuning.ts` holds the feel numbers: growth rate, what Pepper can eat, speed, how far back the camera sits.
- `src/game/world.ts` fits the parts of the world together: the house on its lot, the neighborhood on the edge of town, the town in the countryside, the countryside on the island, the island in the ocean.
- `src/game/house.ts` is Pepper's house, traced from a hand-drawn floor plan: walls, floors, furniture, and how many of each item get scattered.
- `src/game/neighborhood.ts` is the winding streets, yards and houses outside, with an empty lot for Pepper's house.
- `src/game/country.ts` is the countryside and `src/art/countryItems.ts` its farms, forests, castles, villages and towns.
- `src/game/island.ts` is the island round the countryside and `src/art/islandItems.ts` its ships, lighthouses, hills, ports, airports, mountains and cities.
- `src/game/ocean.ts` is the open ocean round the island and `src/art/oceanItems.ts` its icebergs, fleets, clouds, atolls, islands, volcanoes, hurricanes and the mainland.
- `src/game/town.ts` is the town, laid out fresh each run, and `src/art/townItems.ts` has its buildings, vehicles and whole neighborhoods.
- `src/game/grid.ts` is a spatial grid, stacked by size, so the game only checks the things near Pepper each frame that are big enough to matter to her. `World3D` draws things in chunks sized to what's in them, skipping chunks that are off screen and things too small to see.
- `src/scenes/` has the game itself and the HUD.
