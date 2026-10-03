# Icon axis of the bg3 direction (round 2) · credits and licences

Records for `directions/bg3/variants/i1.*`, `i2.*`, `i3.*` and `assets/i-*` (03/10/2026). They
stay here, not in `assets/ATTRIBUTION.md`: the coordinator merges them once the owner chooses.
No file here is a pixel, texture, font or logo of Baldur's Gate 3 or of another product; the
BG3 references stay outside the repository
(`~/Workspace/Codex/d20-studio-visual-assets/references/bg3-solasta/`).

## i1 · Glifi dorati (`i1.icons.mjs`, `i1.css`) and i3's glyphs (`i3.icons.mjs`)

- **Glyphs:** the direction's own, unchanged in shape: game-icons.net, **CC BY 3.0**, icons by
  Lorc, Delapouite, sbed, Skoll and Faithtoken, plus `search` and `help` drawn for this project
  (01/10/2026). Authors, pages and sha256 per glyph: `directions/bg3/SOURCES.md`, «Icone
  (game-icons.net, CC BY 3.0)».
- **Modification (CC BY 3.0 asks to say so):** each glyph is drawn twice from the same path, a
  dark foot shadow and a gilt gradient fill (`i1.icons.mjs`). The small line pictograms (arrow,
  play, plus, undo, close, menu, panel, grid) are the app's own `ui.mjs` paths with the same
  gilt.

## i2 · Contorni incisi (`i2.icons.mjs`, `i2.css`)

- **Set:** **Lucide 1.49.0** (<https://lucide.dev>, <https://github.com/lucide-icons/lucide>),
  read from the `lucide-static` 1.49.0 package already on disk for the alchemy probe:
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/pkgs/lucide-static-1.49.0.tgz`
  (sha256 `c8c9d5dcbc50f388afea623ce2bcbef5788eb0b2d084081aa52d6adaae4ebba3`), files
  `package/icons/<name>.svg`, element markup copied unchanged. Generator kept with the evidence:
  `…/visual-01/round2/variants-i/work/gen-i2.mjs`.
- **Licence:** ISC, «Copyright (c) 2026 Lucide Icons and Contributors». The Feather-derived icons
  used here (`arrow-left`, `check`, `search`, `x`, `plus`) are also **MIT**, «Copyright (c)
  2013-present Cole Bemis». Both notices: the package's `LICENSE` (to be copied next to the files
  if this option ships, as `directions/owlbear/` does for its set).
- **Modification:** stroke 1.4 instead of 2; each glyph drawn twice (a darker groove raised by
  0.6 px under a pale-gold line). `dice` keeps the app's own line d20 (`ui.mjs`); the Scene tab
  mask is Lucide `image`, the connection cloud masks are Lucide `cloud-check`, `cloud-off`,
  `cloud-sync` and `cloud-alert` (`i2.css`).
- **App name → Lucide name:** home → house, person → user-round, campaign → castle, book →
  book-marked, search → search, note → scroll-text, bell → bell, settings → cog, arrow →
  arrow-left, play → play, plus → plus, undo → undo-2, map → map, move → footprints, sword →
  sword, check → check, close → x, menu → menu, eye → eye, bag → backpack, flag → flag, clock →
  hourglass, help → circle-question-mark, pen → pencil, shape → triangle-right, ruler → ruler,
  shield → shield, panel → panel-right, chat → messages-square, scroll → scroll, cards →
  playing-cards, swords → swords, coins → coins, image → image, grid → layout-grid, fog →
  cloud-fog, light → flame, wall → brick-wall; dice → the app's d20.

### Why Lucide and not Tabler

BG3's thin UI glyphs (the gold-line lock, + and − beside the hotbar, the camp and journal
pictograms; facts A3 «Iconography (UI chrome)», `bg3-table-crop-hotbar-4k.png`) are one even
hairline with round ends and soft, curved joins. Lucide draws exactly that (round caps and joins,
curves kept organic); Tabler, also one even line on 24 px, builds its shapes from straighter,
boxier segments. Lucide also has the fantasy vocabulary the app needs without stand-ins
(`swords`, `scroll-text`, `castle`, `footprints`, `hourglass`, `backpack`, `flame`). And it is
already on disk at a pinned version with its licence (same package as the alchemy probe), so no
new download was needed; Tabler was not fetched. Lucide is also the set of the round-1 D&D Beyond
direction (`directions/ddb/`, 2 px white): i2 differs by weight (1.4), colour (pale gold) and the
engraved groove.

## i3 · Dipinti (`i3.css`, `assets/i-painted-*.webp`) · SAMPLE ART

Four 128×128 WebP previews (quality 84, flattened on `#120e0b`, ImageMagick Lanczos) of the
round-2 painted-icon probe, **style A «Dipinto»** (the probe's recommended style). Made by the
owner with the image generation built into the Codex app (`codex exec`, `image_generation`, on
the owner's ChatGPT plan, 02/10/2026); prompts and recipe: `design/blueprint/assets/prompts/icons.md`.
Owner-generated original art of generic SRD subjects; no game, studio or artist named in the
prompts. **Sample art, not approved for production** (the probe is a style test, 6 subjects).

| File                          | Master (REF-ONLY, outside the repo)                                                              | Master sha256                                                      | File sha256                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `i-painted-firebolt.webp`     | `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/icons-probe/A-03-firebolt.png`     | `e4782ad45180ed4de31b5adfb4d6242f79a41a014648fdf51f8669c6738fcc86` | `47c697a52d0d21600041119cdb2a401f94f8132bb92681a8823b0a2ecd004657` |
| `i-painted-magicmissile.webp` | `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/icons-probe/A-04-magicmissile.png` | `efb2a1d8614d9564277fd4af4c80602b583c01eec058a1fc34d6fb75ed4968a8` | `306b6fac6df4fafb0a8eb9b9684d48dacd80b8949e52f068f23f650227c71f5f` |
| `i-painted-longsword.webp`    | `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/icons-probe/A-01-longsword.png`    | `2ae496373bae9ff79d862a018ec6756cf8372e7ad8490d576cefd8c1f3ed792f` | `598484ff7a7958ff5de96db63fe3c74a9136cb381a11b0eb9f15163f72c7aec1` |
| `i-painted-longbow.webp`      | `~/Workspace/Codex/d20-studio-visual-assets/masters/generated/icons-probe/A-02-longbow.png`      | `d518f19425170d7b129b02f8a456c4d784203a502353f4bcf71f75d74a2732a8` | `31c6f9fa8c4b025902f21bd1b9cd29e2cb2bb9872a9bbccd069cd065e93f8edc` |

The probe's potion and round shield were not copied: no action in the example uses them (the
«Shield» spell is not a wooden shield), and a picture of another subject would mislabel a slot.
