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

| Folder                      | Family                                                                                    | Copyright                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `fonts/alegreya/`           | Alegreya (variable 400–900, normal and italic)                                            | Copyright 2011 The Alegreya Project Authors (https://github.com/huertatipografica/Alegreya)           |
| `fonts/alegreya-sc/`        | Alegreya SC (400, 700)                                                                    | Copyright 2011 The Alegreya Project Authors (https://github.com/huertatipografica/Alegreya)           |
| `fonts/alegreya-sans/`      | Alegreya Sans (400, 700)                                                                  | Copyright 2013 The Alegreya Sans Project Authors (https://github.com/huertatipografica/Alegreya-Sans) |
| `fonts/roboto/`             | Roboto (variable 100–900)                                                                 | Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)             |
| `fonts/roboto-condensed/`   | Roboto Condensed (variable 100–900)                                                       | Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)             |
| `fonts/signika/`            | Signika (variable 300–700)                                                                | Copyright 2018 The Signika Project Authors (https://github.com/googlefonts/Signika)                   |
| `fonts/noto-serif/`         | Noto Serif (variable wght 100–900, wdth 62.5–100; latin; used by direction 3)             | Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic)           |
| `fonts/barlow/`             | Barlow (600, 700; latin + latin-ext; used by direction 9)                                 | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)                             |
| `fonts/barlow-condensed/`   | Barlow Condensed (600, 700; latin + latin-ext; used by direction 9)                       | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)                             |
| `fonts/cinzel/`             | Cinzel (variable wght 400–900; latin + latin-ext; used by direction 9)                    | Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel)                       |
| `fonts/nunito/`             | Nunito (variable wght 200–1000; latin + latin-ext; used by direction 6)                   | Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)                     |
| `fonts/figtree/`            | Figtree (variable wght 300–900; latin + latin-ext; used by direction 6)                   | Copyright 2022 The Figtree Project Authors (https://github.com/erikdkennedy/figtree)                  |
| `fonts/roboto-mono/`        | Roboto Mono (variable wght 100–700; latin + latin-ext; used by direction 6)               | Copyright 2015 The Roboto Mono Project Authors (https://github.com/googlefonts/robotomono)            |
| `fonts/source-sans-3/`      | Source Sans 3 (variable wght 200–900; latin + latin-ext; used by direction 5)             | Copyright 2010-2020 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'                   |
| `fonts/crimson-pro/`        | Crimson Pro (variable wght 200–900, normal + italic; latin, ext; direction 5)             | Copyright 2018 The Crimson Pro Project Authors (https://github.com/Fonthausen/CrimsonPro)             |
| `fonts/lexend/`             | Lexend (variable wght 100–900; latin + latin-ext; used by direction 8)                    | Copyright 2018 The Lexend Project Authors (https://github.com/googlefonts/lexend)                     |
| `fonts/unbounded/`          | Unbounded (variable wght 200–900; latin + latin-ext; used by direction 8)                 | Copyright 2022 The Unbounded Project Authors (https://github.com/googlefonts/unbounded)               |
| `fonts/vollkorn/`           | Vollkorn (variable wght 400–900, normal + italic; latin + latin-ext; used by direction 7) | Copyright 2017 The Vollkorn Project Authors (https://github.com/FAlthausen/Vollkorn-Typeface)         |
| `fonts/im-fell-english-sc/` | IM FELL English SC (400; latin only, drop caps; used by direction 7)                      | Copyright (c) 2010, Igino Marini (mail@iginomarini.com)                                               |

## Direction-specific files and icons

Each round-1 direction keeps its own licensed files under `directions/<id>/assets/` and its icon
glyphs in `directions/<id>/icons.mjs`. Their credits, licences and changes are listed in the
«Licenze» section of `directions/<id>/SOURCES.md`:

| Direction | Icons (licence)                                 | Other files                                                                                                                         |
| --------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `bg3`     | game-icons.net (CC BY 3.0, credit per author)   | ornaments drawn for this project; owner-generated sample plates                                                                     |
| `ddb`     | Lucide 1.16.0 (ISC; Feather-derived glyphs MIT) | owner-generated sample plates                                                                                                       |
| `foundry` | Font Awesome Free (icons CC BY 4.0)             | owner-generated sample plates; Noto Serif above                                                                                     |
| `owlbear` | Google Material Symbols / Icons (Apache-2.0)    | owner-generated sample plate; mask glyphs in `assets/icons/`                                                                        |
| `roll20`  | Font Awesome Free 6.7.2 (CC BY 4.0); game-icons | owner-generated sample plate; Nunito/Figtree/Roboto Mono above                                                                      |
| `owlcat`  | game-icons.net (CC BY 3.0, credit per author)   | iron frame, drafting watermark and rule drawn for this project; owner-generated sample plate; Vollkorn and IM FELL English SC above |
| `alchemy` | Lucide 1.49.0 (ISC); Font Awesome Free 7.3.1    | owner Home plate `featured-hearth.webp`; FA mask glyphs in `assets/icons/`; Lexend and Unbounded above                              |

The final set chosen by the owner will move under `assets/` with one `PROVENANCE.json` row per file.
