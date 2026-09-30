# Assets · credits and licences

Files under `design/blueprint/assets/` (Phase C «Design visivo», visual-01, 30/09/2026). The
machine-readable record, with a sha256 per file, is [`PROVENANCE.json`](PROVENANCE.json). Nothing
here is a third-party product's pixel, texture, font or logo. Owner approval of every file: **not
yet** (round 1 sample).

## Sample art (every round-1 direction)

Painted only while a direction is active (`directions/sample.css` and the loader's sprite). With no
direction, and under «Attuale», the app shows its usual initials and vector scene.

| File                             | Shows                                                | Made by                                                                               | Licence                                                                          |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `portraits/sample/livia.webp`    | Livia (L1): evoker in deep-blue robes                | The owner, with Codex image generation (gpt-image; C2PA in the master)                | Owner-generated original art                                                     |
| `portraits/sample/doran.webp`    | Doran (D1): dwarf in dark scale armour               | The owner, with Codex image generation (gpt-image; C2PA in the master)                | Owner-generated original art                                                     |
| `portraits/sample/mira.webp`     | Mira: **provisional stand-in** (L3, an elf in green) | The owner, with Codex image generation (gpt-image; C2PA in the master)                | Owner-generated original art                                                     |
| `portraits/sample/goblin-1.webp` | goblin-1 «Sentinella» (Goblin Minion)                | The owner, with Codex image generation (gpt-image), for d20 Folio (commit `c5aaddb4`) | Owner-generated original art of an SRD 5.2.1 subject (the SRD text is CC-BY-4.0) |
| `portraits/sample/goblin-2.webp` | goblin-2 «Esploratore» (Goblin Warrior)              | The owner, with Codex image generation (gpt-image), for d20 Folio (commit `c5aaddb4`) | Owner-generated original art of an SRD 5.2.1 subject (the SRD text is CC-BY-4.0) |
| `maps/sample/old-watch.webp`     | The old-watch courtyard, painted on the scene plan   | The owner, with Codex image generation (record: `maps/sample/PROVENANCE.map.json`)    | Owner-generated original art                                                     |

## Fonts (SIL Open Font License 1.1)

Unmodified woff2 files from the Fontsource npm packages at **5.3.0** (latin and latin-ext
subsets of the Google Fonts release). Each folder holds its `OFL.txt`, taken from `google/fonts`
at commit `9710da1eacb3be272583c3224dcb70f9da6eadbb`. A direction declares its own `@font-face`
(see `directions/README.md`); no font loads without a direction.

| Folder                    | Family                                         | Copyright                                                                                             |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `fonts/alegreya/`         | Alegreya (variable 400–900, normal and italic) | Copyright 2011 The Alegreya Project Authors (https://github.com/huertatipografica/Alegreya)           |
| `fonts/alegreya-sc/`      | Alegreya SC (400, 700)                         | Copyright 2011 The Alegreya Project Authors (https://github.com/huertatipografica/Alegreya)           |
| `fonts/alegreya-sans/`    | Alegreya Sans (400, 700)                       | Copyright 2013 The Alegreya Sans Project Authors (https://github.com/huertatipografica/Alegreya-Sans) |
| `fonts/roboto/`           | Roboto (variable 100–900)                      | Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)             |
| `fonts/roboto-condensed/` | Roboto Condensed (variable 100–900)            | Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)             |
| `fonts/signika/`          | Signika (variable 300–700)                     | Copyright 2018 The Signika Project Authors (https://github.com/googlefonts/Signika)                   |
