# Prompts · battle maps (sample content)

- **Date:** 30/09/2026 (visual-01, Phase C, round 1 «Scelta 1 — Direzione»).
- **Generator:** Codex built-in image generation on the owner's ChatGPT plan (`codex exec`,
  `image_generation` feature). Never the paid API: `OPENAI_API_KEY` stays unset.
- **Reference image:** only our own layout guide, drawn from the scene data. Never a product's
  pixels.
- **Rules (phase-c-plan §3.4):** no text, no logos, no watermark; describe qualities, never name a
  game, a studio or a living artist; fictitious subject only.

## MAP_01 · `old-watch` · «Il cortile dell'osservatorio»

**Why.** All four copied table products show a painted map under the grid; ours is a vector
template. This painting is sample content under every round-1 direction
(`assets/maps/sample/old-watch.webp`). Walls, doors and measurements stay live in the app, so the
painting must sit exactly on the scene geometry.

**Binding geometry** (scene 1000×650 units, grid 50, 20×13 cells, 1.5 m per cell):

| Element                   | Scene units                                                               | Source in `design/blueprint/`                    |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| Curtain wall (inner face) | rectangle (99,79)–(901,571); the painted band runs outward about 20 units | special-moves-domain.mjs `COURTYARD_WALLS`       |
| North-west room           | wall y=200 from x 99→340; wall x=340 from y 79→200                        | same                                             |
| North-west room door      | x=340, y 110–170 (closed in the seed)                                     | special-moves-domain.mjs `COURTYARD_DOORS`       |
| South-east room           | wall y=450 from x 660→901; wall x=660 from y 450→571                      | same                                             |
| South-east room door      | x=660, y 490–550 (open in the seed)                                       | same                                             |
| Well basin                | centre (500,325); stone rim r 66–78; water r ≈ 60                         | preparation.mjs `renderSceneBase`, `sm-fountain` |
| Rubble (difficult)        | (690,470) 190×90                                                          | special-moves-domain.mjs `RUBBLE`                |
| Embers (hazard)           | (200,480) 100×80                                                          | regions-domain.mjs `region-embers`               |
| Outside the curtain wall  | open ground                                                               | scene margins                                    |

**Guide.** `make-guide.mjs` draws the plan from these numbers: black walls, brown door leaves in the
gaps, a blue basin in a black ring, hatched rubble (brown) and embers (orange), light grey outside.
The generator gets the 3:2 variant (1536×1024: the same plan with 8.33 units of outside ground
added above and below), so the model traces it 1:1. Guide, overlay and script:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/map-art/`.

### Prompt (attempt 1)

Paste as one block, with the guide attached.

```text
Generate exactly one image with your image generation tool, then stop. Do not write or modify files, do not run shell commands, do not ask questions.

The attached image is a binding floor plan. Paint the map over it: every shape stays exactly where it is, at the same size.

Use case: sample background for the battle map of a tabletop role-playing web app. The app draws its own square grid, tokens, walls and doors on top, so the painted walls must sit exactly on the black bands of the plan.
Asset type: top-down orthographic battle map, landscape 3:2, 1536x1024 pixels, one single image.
Subject: the stone-flagged courtyard of a ruined observatory watch-tower. Black frame of the plan = a thick curtain wall of weathered grey stone blocks. White area = a courtyard paved with worn, irregular flagstones, weeds and moss in the joints, a few cracked slabs. Top-left black L = a small roofless stone room with a wooden plank door exactly in the brown gap of its east wall. Bottom-right black L = another small roofless stone room with a wooden plank door exactly in the brown gap of its west wall. Blue circle = a large round stone well at the centre: a thick rim of carved stone blocks exactly on the black ring, filled with dark still water. Brown hatched rectangle = a heap of fallen masonry and broken stones inside the south-east room. Orange hatched rectangle = a patch of smouldering embers: a scattered, burnt-out campfire with glowing coals and ash. Light grey margin = open rough ground outside the wall: packed earth, sparse dry grass, a few loose stones.
Style: hand-painted digital fantasy battle map, crisp and readable, soft painterly shading, rich stone and earth textures, the quality of a premium printed battle map.
Composition: strictly orthographic, seen from directly above; no perspective, no tilt, no horizon. Fill the frame edge to edge. Walls straight, parallel to the image edges, with the same position and thickness as the black bands; doors, well, rubble and embers at exactly the position and size of their shapes. Keep the courtyard mostly open floor so game tokens read clearly on it.
Lighting: dusk. Cool blue-violet ambient light, a warm orange glow from the embers, soft short shadows cast by the walls toward the bottom-right. No heavy vignette.
Palette: weathered grey and ochre stone, moss green, dusty earth brown, deep teal water, ember orange as the only saturated accent.
Constraints: no grid lines, no text, no letters, no numbers, no labels, no logos, no watermark, no signature, no frame or border, no compass rose, no characters, creatures, figures or tokens. Do not add, move or remove walls or doors.
Avoid: perspective or isometric view, 3D render look, photographic look, extra walls, doors or openings in the curtain wall, furniture blocking the courtyard, grid, text.
```

**Settings:** 1536×1024 (3:2 landscape), PNG, one image. `codex exec --skip-git-repo-check
--sandbox read-only -c model_reasoning_effort="low" -i guide-input-3x2.png "<prompt>"`, run from
`~/Workspace/Codex/d20-studio-visual-assets/masters/generated/`.

### Accept

- Walls, both doors and the well rim sit within 12 scene units (24 px at 2000×1300) of the guide
  in the red overlay (`overlay-v<n>.png`).
- The curtain wall is closed all round; each room has exactly one door, in its gap.
- Strictly top-down; the courtyard reads as open floor at token size (a 36-unit token stays legible).
- Rubble fills the south-east room's hatched area; embers glow in the south-west patch.
- No grid, text, letters, logo, watermark, signature, border, figures or tokens.

### Reject

- Any wall or door off by more than 12 units, a missing or extra door, an opening in the curtain
  wall, a wall where the plan has floor.
- Perspective, isometric or tilted view; a 3D-render or photographic look.
- Painted grid lines (the app draws the grid), any text or pseudo-script, any figure.
- Saturated colour everywhere (tokens and the HUD must stay the loudest things on the map).

### Delivery

- Master (PNG, C2PA kept): `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/old-watch-v<n>.png`.
- Web copy: `design/blueprint/assets/maps/sample/old-watch.webp`, exactly 2000×1300 (2 px per
  scene unit), ≤ 350 KB. The 1536×1024 output maps to the 3:2 guide, so the only edit is a
  uniform scale of 2000/1536 and dropping the 8.33-unit bands added above and below: geometry is
  not shifted.
- Record: `design/blueprint/assets/maps/sample/PROVENANCE.map.json`.

### Result (30/09/2026)

- **Attempt 1 accepted** (one generation; Codex session `01a0f43f-50a9-74b0-9eac-9c7978df1ff3`,
  low reasoning effort). No quota message. The prompt must reach `codex exec` on stdin: `-i`
  takes several files, so a prompt written after it is read as a second image path.
- **Alignment** (`overlay-v1.png`, luminance profiles on the 2000×1300 mapping):
  - curtain-wall inner faces 0–5 units from the data lines (the painted wall grows outward);
  - north-west room walls within 4 units; both door leaves and openings within 5 units;
  - well centre within 3 units, rim radius +4;
  - largest offset: the south-east room's north wall is painted at y 429–449, so the data line
    (450) sits on its south face and its courtyard face is 12.5 units north of the guide band.
- **Web copy:** blur 0×0.7, then `cwebp -q 80 -m 6` → 324 776 bytes (q 80 without the blur was
  466 KB).

## Raccolta di partenza · three starter maps (style probe, 02/10/2026)

**Why.** The owner asked how maps will look and work. Three starter maps in the same painted
top-down style as MAP_01 show the range a DM starts from: an interior, an outdoor road and a
dungeon. Probe only: nothing is wired into the app or published under `design/blueprint/assets/`.

**Method (same as MAP_01).** Each map starts from a precise layout guide drawn in code
(`make-guides.mjs`): 1 px per scene unit, grid 50 units = 1 cell = 1.5 m as in the app. Black =
walls / solid rock, white = floor, brown bars = door leaves, light blue = windows, blue = water,
grey = stone furniture, light brown = wood, orange = fire, pale striped = stairs, hatched =
difficult terrain, purple = secret door. The generator gets the guide padded to 3:2 (or 2:3) with
16.67 units of outside ground, and paints over it (`-i <id>-input.png`, prompt on stdin). The
1536×1024 (1024×1536) output maps back to the scene frame by a uniform ×1.30208 scale and dropping
the padding (`map.sh <id> <n>`); `<id>-overlay-v<n>.png` draws the guide's edges in red on top.
**The guides are the wall data** for these scenes later (walls, doors, windows, secret door).

| Map                                          | Scene (units / cells) | Plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAP_02 `tavern` «La locanda del Cinghiale»   | 2000×1300 / 40×26     | Building (200,150)–(1800,1150), outer walls 24 thick centred on the lines; partition x=1350 with open archways y 380–480 and 820–920; partition y=620 (x 1350–1800). Front door S x 650–750, back door E y 250–350 (the only two doors). Seven windows. Common room: hearth on the W wall (y 550–750), L bar (x 1130–1190, y 230–760, foot to x 1010), four barrels, four round tables r 50, long table with two benches. Kitchen (NE): cooking hearth, work table. Back hall (SE): stairs x 1620–1788, y 700–1100, crates. Yard around, cobbled street y ≥ 1165. |
| MAP_03 `forest` «La strada nel bosco»        | 2000×1300 / 40×26     | Road 180 wide (two cubic curves, W→E); stream 150 wide (N→S); plank bridge (900,585) 240×110 with railings (thin walls) at y 577 and 693; ruined drystone L wall at top-left (the only walls); five boulders; eleven tree canopies r 90–130; tilted cart (14°) on the road at (1460,690) with its broken wheel at (1590,800); fallen log.                                                                                                                                                                                                                         |
| MAP_04 `crypt` «La cripta sotto la cappella» | 1300×2000 / 26×40     | Everything solid except: vestibule (450,60) 400×290 with stairs up to the chapel; iron-bound door at y=350; corridor 100 wide to the burial hall (250,650) 800×600 with five sarcophagi and four pillars; secret door x 1050–1100, y 800–900 to a hidden vault with a chest; 1-cell passage W and S to the ossuary (75,1650) 375×250 with bone niches; corridor S to a collapsed chamber (500,1450) 650×450: rubble over its NE corner (850,1450) 300×280 and a choked passage E.                                                                                 |

**Prompts.** The MAP_01 field structure, one subject per map; the full text of each attempt is in
`prompt-<id>-v1.txt` beside the guides. Shared fields: hand-painted digital fantasy battle map,
premium printed quality; strictly orthographic; every shape at its position and size; floors kept
open for tokens; no grid, text, letters, numbers, labels, signs, logos, watermark, signature,
border, compass rose, characters, creatures or tokens; no game, studio or artist named. Lighting
per map: inn = evening firelight, warm inside and cool outside; road = late-afternoon dappled
sun; crypt = cold gloom with a few candles and pale light down the stairs, floors still readable.

**Settings:** as MAP_01 (`codex exec --skip-git-repo-check --sandbox read-only -c
model_reasoning_effort="low" -i <id>-input.png < prompt-<id>-v1.txt`), run from
`~/Workspace/Codex/d20-studio-visual-assets/masters/generated/maps-probe/`. Accept/reject as MAP_01.

### Result (02/10/2026)

- **Quota:** 3 generations, one per map, all accepted at attempt 1; no quota message. Codex
  sessions: tavern `01a0fd7b-b8f9-7640-a65a-6bc7496f3b9b`, forest
  `01a0fd7b-b907-7ff1-b2bb-0d5b0c4ae8b5`, crypt `01a0fd7b-b8f2-7741-89a0-b8278e4ea5d8`.
- **Inn:** walls, both doors, windows, both archways, hearths, bar, barrels, tables, stairs and
  crates sit on their shapes (visible offsets within about 5–10 units). Doors are painted as
  plank leaves between posts in the gaps; the archways are open.
- **Road:** road, stream banks, bridge deck and railings, wall, boulders, canopies, cart, wheel
  and log on their shapes (within about 10 units; canopies are painted bushier at the rim).
- **Crypt:** cut-stone wall bands are painted centred on the rock/floor lines (±12–16 units; the
  hall's west face measures rock to x 234, band 234–266, floor from 268), which is how the app
  draws a wall line. Consequence: the 1-cell passage reads about 30 units of visible floor — still
  passable, visibly tight. The secret door is painted as wall with a seam and a carved rosette.
- **Evidence:** guides, overlays, board and the 1440 crops (1000×645-unit windows at 0.88 px/unit,
  44 px per cell as in `map-art/in-app.png`) in
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round2/maps-probe/`; masters
  (PNG, C2PA kept) `masters/generated/maps-probe/<id>-v1.png`.
