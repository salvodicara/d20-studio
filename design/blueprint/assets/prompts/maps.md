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
