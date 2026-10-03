# Prompts · painted icons (style probe)

- **Date:** 02/10/2026 (visual-01, Phase C, round 2, painted-icon style probe).
- **Generator:** the image generation built into the Codex app, on the owner's ChatGPT plan
  (`codex exec`, `image_generation` feature). Never the paid API: `OPENAI_API_KEY` stays unset.
- **Quota used:** 18 generations, one image per call, no grids, no retries.
- **House reference:** the painted monster portraits from d20 Folio
  (`~/Workspace/Codex/d20-studio-visual-assets/candidates/monsters/`). They are dark-fantasy oil
  painting with warm light. Only 10 portraits are on disk there, not 330.
- **Rules:** no text, letters, logos, watermark or signature. Prompts describe qualities and never
  name a game, a studio or a living artist. Subjects are generic SRD objects and spells.
- **Need:** more than 300 spells and about 560 items, all in one style, readable in a 40–57 px
  hotbar slot.

## Recipe

From `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/icons-probe/`:
`gen.sh <style>-<subject>` runs
`codex exec --skip-git-repo-check --sandbox read-only "<prompt>"` and reads the session id from
the log. It then copies the single PNG from `~/.codex/generated_images/<that session>/`.
`queue.sh` runs one style per queue, and three queues ran in parallel. Each call took about 2 min.
`mkprompts.sh` builds the 18 prompts in `prompts/` from the blocks below. `board.sh` and `mock.sh`
build the evidence.

Every prompt is built in this order: the preamble, the common block, one subject and one style.

```text
Generate exactly ONE image with your image generation tool, then stop. Do nothing else: do not write files, do not run commands, do not describe alternatives.

Use case: game UI icon for a tabletop role-playing companion app (an action hotbar slot).
Asset type: a single square 1:1 icon, 1024x1024.
Composition: one centred object filling about 80 percent of the square, with a clear, instantly readable silhouette even when shrunk to 40 pixels; nothing cropped at the edges; simple uncluttered background; no frame unless the style asks for one.
Constraints: no text, no letters, no numbers, no runes, no logos, no watermark, no signature; generic fantasy object, not tied to any brand or existing game.
Avoid: photorealism, 3D render look, multiple objects, hands or people, busy backgrounds, white or light backgrounds, grids or sheets of several icons.
```

### Subjects

1. `longsword`: a plain steel longsword with a cross-guard and leather-wrapped grip, shown
   diagonally from bottom-left (pommel) to top-right (tip).
2. `longbow`: a wooden longbow with a taut string, curved, shown diagonally, with a single arrow
   nocked.
3. `firebolt`: a spell of fire: a blazing bolt of flame streaking diagonally upward, a burning comet
   of fire with a bright core and trailing embers.
4. `magicmissile`: a spell of force: three glowing violet-blue darts of pure magical light flying in
   parallel diagonally upward, each leaving a short luminous trail.
5. `potion`: a round-bellied glass potion flask with a cork stopper, filled with glowing ruby-red
   healing liquid, a few small bubbles inside.
6. `shield`: a round wooden shield with an iron rim and a central iron boss, seen from the front,
   slightly tilted.

### Style A · «Dipinto»

```text
Style: richly painted digital oil painting, premium fantasy role-playing game ability icon; a single object rendered with painterly brushwork, believable materials and soft volumetric glow; dark smoky vignette background (near black with a faint warm umber haze); warm golden rim light outlining the silhouette; the same painterly realism as a dark-fantasy oil portrait.
Lighting: key light from the top-left, warm rim light on the right edge, deep shadows bottom-right.
Palette: deep umber and charcoal background, warm gold and amber highlights, one saturated accent colour per subject.
```

### Style B · «Miniatura dorata»

```text
Style: illuminated-manuscript miniature, as if painted on vellum in a medieval book of hours; flat jewel-toned colours (lapis blue, vermilion, malachite green) with fine dark ink outlines; burnished gold-leaf edges and highlights; the object sits on a dark aged parchment ground, slightly tooled, with a thin gold border frame inset from the edge.
Lighting: implied light from the top-left expressed by gold-leaf highlights; no photographic shading.
Palette: dark brown-black parchment ground, burnished gold, deep jewel colours.
```

### Style C · «Incisione e smalto»

```text
Style: engraved metal medallion emblem; the object is shown as a bold relief carved and engraved into a round dark bronze medallion, with fine line engraving and hatching, and vitreous champlevé enamel filling key areas with one or two saturated colours; crisp, high-contrast silhouette like a heraldic badge.
Lighting: polished metal catching light from the top-left, soft specular highlights on raised edges, darker lower-right.
Palette: dark bronze and blackened steel, warm brass highlights, enamel accents.
```

## Accept

- One object, centred, filling 70–85 % of the square, with nothing cropped.
- It is recognisable at **40 px** on the board's 40 px copy and in the hotbar mock-up, without its
  label.
- Key light comes from the top-left. The background is dark or transparent, never light.
- The icon belongs to its style: the same ground, frame or no frame, rim light and saturation as
  its five siblings.
- Spells stay distinguishable by shape as well as colour (bolt, three darts), never by colour alone.
- There is no text, pseudo-script, rune, logo, watermark, signature, hand or figure.

## Reject

- The icon is a grid or sheet, or shows several objects.
- A thin diagonal subject turns into a single line at 40 px. Fix: a larger head or guard and a
  thicker silhouette.
- The background is light or opaque white.
- A frame or medallion uses more than about 15 % of the slot. A frame inside the slot's own frame
  wastes pixels.
- The lighting direction differs from the rest of the set.
- The palette is so loud that it competes with the HUD state colours (green ready dot, red
  separators).

## Probe results (02/10/2026)

- **Alpha is inconsistent.** 11 of 18 masters came back as RGBA. In C the medallion is cut out with
  transparent corners. Some A and B icons have a semi-transparent background, and the hidden
  colours of the transparent pixels show up as red fringes when alpha is dropped. The production
  pipeline must flatten every icon onto the slot colour, or crop a clean disc for C. The board and
  mock-ups flatten onto `#120e0b` and `#0b1216`.
- **A · Dipinto:** best read at 40 px (fire, darts, potion and shield are strong). Closest to the
  monster portraits and to the reference product's painted ability icons. Sword and bow are thin
  at 40 px.
- **B · Miniatura dorata:** the most original look. Its inset gold frame costs about 10 % of the
  slot and doubles up with the hotbar frame. Sword and bow nearly vanish at 40 px.
- **C · Incisione e smalto:** the most coherent set, and the round shape signals the type. In a
  square slot, though, every icon reads as a "coin". The enamel ground lowers the contrast of
  sword and bow, so the subject shrinks to about 60 % of the slot.
- Recommendation for the owner's choice: **A**. For production, set a thicker silhouette and about
  85 % fill for thin weapons. B and C remain as alternatives (C for a possible "category" set).

## Delivery

- Masters (REF-ONLY, outside the repo):
  `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/icons-probe/<A|B|C>-<nn-subject>.png`
  (1254×1254), with `prompts/`, `logs/` and `quota.log`.
- Evidence: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round2/icons-probe/`
  `board.png` (styles × subjects with 64/40 px copies) and `hotbar-mock-<A|B|C>.png`. The mock-ups
  are the bg3 hotbar at 1440×900 at real size plus a 2× view. Six slots are refilled: sword, bow,
  magic missile, fire bolt, potion and shield.
- No icon has entered `design/blueprint/` yet: that waits for the owner's choice.
