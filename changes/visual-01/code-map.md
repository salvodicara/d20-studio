# visual-01 · Code map for the direction skins (brief for the builders)

- **Date:** 30/09/2026.
- **Worktree:** `~/Workspace/Codex/d20-studio-visual-01`, branch `codex/visual-01` at `ec0f078`.
  `design/` is identical to the tag `blueprint-functional-v1`.
- **App:** served at <http://127.0.0.1:8881/>. It serves `design/blueprint/` at the root with no
  cache (`changes/visual-01/serve.py`). **Never use 8879.**
- **How it was checked:**
  - read the code;
  - ran probes in a named playwright-cli session (Chromium) on 8881: the DOM, measurements, and a
    specificity test with a temporary injected style. It was removed afterwards.
- **Evidence:** screenshots of the current look are in
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/code-map/`
  (`table-1440-default.png`, `table-1440-combat-dm.png`).

**Goal.** Build three switchable direction skins, for example `bg3`, `ddb` and `vtt`.

- **Surfaces:** Home, Scheda and Tavolo, at 1440 and 390 px wide.
- **Theme:** dark first.
- **Must not change:** functions, routes, permissions, data, accessible names, ids, classes,
  `data-*` hooks or markup.
- **Default look:** with no direction selected, it stays byte-for-byte the same as today.

---

## 0. Ground rules for builders

1. **Where you may write:**
   - `design/blueprint/directions/**`;
   - `design/blueprint/assets/**` (licensed files only, each with a provenance row);
   - the three insertion points in `app.mjs` for the «Direzione» selector (§a).

   Everything else is read-only. One exception: a small icon hook in `ui.mjs` (§d), but only if the
   coordinator first reserves `ui.mjs`.

2. **Never edit an existing `.css` file.** About 15 Node tests read their source text (§f1). All skin
   rules go in `directions/<id>/direction.css`.
3. **Skins are CSS only, plus one dev-only loader module.** Rules:
   - No markup changes.
   - No `display:none` on text or controls that carry an accessible name. Use the existing
     visually-hidden pattern instead (absolute position, 1 px box, `overflow: hidden`,
     `clip-path: inset(50%)`, `white-space: nowrap`). Examples: styles.css:3914-3921, 4259-4266.
   - No `content:` text. Decorative pseudo-content uses `content: "" ` or `content: url(x) / ""`.
   - No `!important`.
4. **Keep what the app already guarantees:**
   - 40 px targets (DEVELOPMENT.md: «All controls minimum 40px»; map tools, rail tabs and hotbar
     buttons are 40×40 today; `.icon-button` is 42×42);
   - visible focus: styles.css:286-316, with a 3 px `var(--focus)` outline;
   - never colour alone;
   - no text-transform. The top-level CSS rule is enforced by tests/final-fixes.test.mjs:951-957.
     Use `font-variant-caps: all-small-caps` as DESIGN §2 does.
5. **Leave the brand alone:** the `logo()` d20 (ui.mjs:94-107), the favicon and `theme-color`
   (index.html:10, :13) and the manifest colours all wait for Phase D.
6. **Commits and third-party files:**
   - Never commit or push.
   - No third-party pixels, fonts, textures or logos in the repository.
   - Reference images stay in `~/Workspace/Codex/d20-studio-visual-assets/references/`.

---

## (a) The demo bar («Visita come», «Ripristina esempio») and the «Direzione» selector

### Where it lives today

| What      | Where                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markup    | app.mjs:755, inside `render()` (app.mjs:698). It is the first child of `#app` and is rewritten on **every** render (`#app.innerHTML = …`, app.mjs:754).                                                                                                                                                                                                                                     |
| Structure | `aside.demo-strip[aria-label="Controlli della dimostrazione"]` › `span` («Blueprint in costruzione · dati di esempio») + `div.demo-controls` › `label` «Visita come» `select#demo-role` (values `player`, `dm`) · `span#ext-notice` · `button[data-service="scope"]` «Cosa è pronto» · `button[data-service="reset"]` «Ripristina esempio».                                                 |
| Binding   | `bindShell()` (app.mjs:873) runs after each render (app.mjs:766). `[data-service]` buttons → `service(name)` (app.mjs:945-947, `service` at app.mjs:1107). The `#demo-role` change handler is at app.mjs:948-985. It checks for unsaved drafts, then changes `role`, emits `role-changed`, resets the area views, and then navigates or calls `render()`.                                   |
| Reset     | `service("reset")` (app.mjs:1153-1180) opens a confirm dialog, then runs `store.reset()` (state.mjs:959), `registry.initState`, `emit("reset")`, the area resets and `render()`. It only rewrites the simulation key `d20-studio-blueprint-v1` (state.mjs:14). Other localStorage keys, including a future `d20-dev-direction`, are untouched. No code enumerates localStorage keys.        |
| Notice    | `#ext-notice` is filled by `refreshExtensionNotice()` (app.mjs:796).                                                                                                                                                                                                                                                                                                                        |
| State     | `role` and `lang` are **in-memory module variables** (app.mjs:96-97). `role` starts from `window.name` (pop-out panels, app.mjs:95) or the sandbox (app.mjs:81), otherwise `"player"`. Neither is persisted: UI preferences, demo role, language and route are not simulation data (DEVELOPMENT.md, state shape). Device settings persist as `d20-studio-setting:<key>` (registry.mjs:299). |
| CSS       | styles.css:591-630 (`.demo-strip` 43 px tall at 1440; `.demo-controls select` min-height 28 px); phone styles.css:1781-1795 (the strip wraps and `.demo-controls` fills the width with `space-between`); registry.css:54; preferences.css:573-587 (wrap under enlarged UI).                                                                                                                 |
| Hidden in | the Table pop-out window (styles.css:1640), the spectator display (session-view.css:813), and print pages (character-library.css:566, compendium.css:1266).                                                                                                                                                                                                                                 |

### Who reads it (checked 30/09)

| Reader                                                  | What it uses                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Journeys (`changes/interview-01/blueprint-checks/*.js`) | `#demo-role` 319 times. Many also use `getByRole("combobox", { name: "Visita come", exact: true })` (e.g. area-journey.js:19, builder-journey.js:157). Also `#ext-notice` (b11b-inc10-fixes-journey.js:95-157, loot-review-journey.js:420, w1b/w2a1/w2a2/w2b1/w2b2 shell journeys: «Strip reports area warnings»).                                                                   |
| Visibility                                              | session-view-journey.js:455 asserts the strip is hidden for the spectator.                                                                                                                                                                                                                                                                                                           |
| Not read                                                | No journey selects `.demo-controls select`, counts page `<select>`s outside dialogs, or uses the word «Direzione». No Node test reads the demo strip. The word «Direzione» exists elsewhere only as a field label: lighting-editor.mjs:374/584 «Direzione (°)» and the inventory-plus.mjs:1566 legend. Keep the label exactly «Direzione» / «Direction» and the id `demo-direction`. |

### Measured constraint: the selector must be gated

I injected a labelled `select` into `.demo-controls` as a temporary probe and measured it.

| Width | Result                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------- |
| 1440  | The strip stays 43 px tall. No problem.                                                                 |
| 390   | The page overflows sideways: `scrollWidth` becomes **472 > 390**, and the strip grows from 80 to 98 px. |

Dozens of journeys assert «no horizontal overflow» at 390, and home-journey.js:1160 asserts
«Enter table» sits in the first 844 px. So an always-on selector breaks them.

With `flex-wrap: wrap` on `.demo-controls`, the page does not overflow at 390, and the strip becomes
96 px tall.

**Therefore the selector renders only in direction mode.** Direction mode means a loopback host
**and** a `d20-dev-direction` key present. This keeps the default DOM and look identical, and all
189 journeys (fresh contexts, no key) unaffected.

### How to add it

**Module.** Create `design/blueprint/directions/index.mjs`. It is dev only. It must never throw at
import time, and it wraps every storage and DOM access in `try`.

```js
export const DIRECTIONS = [
  // label = numbered option shown to the owner (I-248)
  { id: "bg3", label: "1 · BG3 / Solasta" },
  { id: "ddb", label: "2 · D&D Beyond" },
  { id: "vtt", label: "3 · Foundry / Owlbear" },
];
const KEY = "d20-dev-direction"; // values: "current" (Attuale) or a direction id
const LOOPBACK = ["127.0.0.1", "localhost", "[::1]"].includes(globalThis.location?.hostname); // as app.mjs:61
// read()/write(): try { localStorage… } catch {}   — sandboxStorage (state.mjs:720) is NOT used
export const directionMode = () => LOOPBACK && read() !== null;
export const activeDirection = () => (DIRECTIONS.some((d) => d.id === read()) ? read() : null);
export async function startDirection() {
  // once, after loadExtensions (see below)
  if (!LOOPBACK) return;
  const q = new URLSearchParams(location.search).get("direction"); // like ?fixture= (app.mjs:61-66)
  if (q !== null) write(q === "off" ? null : DIRECTIONS.some((d) => d.id === q) ? q : "current");
  await applyDirection(activeDirection());
}
export async function applyDirection(id) {
  // 1. root attribute: id ? root.dataset.direction = id : delete root.dataset.direction
  // 2. <link id="dev-direction-css" rel="stylesheet" href="directions/<id>/direction.css"> appended
  //    LAST in <head>; on switch add the new link, await load/error (≤3 s), then remove the old one;
  //    no link at all when id is null
  // 3. <link id="dev-direction-ui" href="directions/dev.css"> while directionMode() (strip wrap only)
  // 4. hidden defs sprite for SVG pattern fills (§e), outside #app so renders never remove it
}
export function directionControl(t) {
  // "" unless directionMode()
  // `<label class="demo-direction">${t("Direzione","Direction")} <select id="demo-direction">
  //   <option value="current">${t("Attuale","Current")}</option>…DIRECTIONS…</select></label>`
  // with `selected` on the active value (the strip is re-rendered on every render)
}
export function bindDirection(render) {
  // idempotent, like #demo-role's .onchange
  const select = document.querySelector("#demo-direction");
  if (select)
    select.onchange = async () => {
      write(select.value);
      await applyDirection(activeDirection());
      render();
    };
}
```

**Three insertion points in `app.mjs`** (this is the reserved «selettore di sviluppo»):

1. **Import.** Add one static import at the top of `app.mjs`, taking `startDirection`,
   `directionControl` and `bindDirection` from `./directions/index.mjs`.
2. **Boot.** Add `await startDirection();` right after `await loadExtensions(…)` (app.mjs:67-79).
   Area stylesheets are injected during `loadExtensions` (registry.mjs:1032-1041, 1293), so the
   direction `<link>` lands after all 59 of them. Awaiting its load before the first `render()`
   (app.mjs:1421) lets `fitHud` measure the skinned HUD. `app.mjs` already uses top-level `await`.
3. **Template and binding.**
   - Template: in app.mjs:755, insert `${directionControl(t)}` right after `</select></label>` of
     «Visita come».
   - Binding: in `bindShell()` next to `#demo-role` (app.mjs:948), add `bindDirection(render);`.

**Behaviour of a direction change.** It does not call `commit`, `persist`, `navigate` or
`registry.emit`, and it never touches `role`, `lang` or the store.

- **Why it calls `render()`.** `render()` with an unchanged view emits nothing (the `navigate` event
  fires only when the view object changes, app.mjs:705-709). It rebuilds `#app`, so the strip shows
  the new `selected`, and `table.mjs` re-runs `fitHud` against the new geometry.
- **Why the render is required.** The HUD fitter runs only on render and on the map's
  ResizeObserver (table.mjs:1203-1270, 1311). A CSS change alone never re-fits the scene plate, the
  tool column, the turn order or the party column.

**`directions/dev.css`.** It holds only rules keyed on the new element, so it is inert when the
element is absent:

```css
@media (max-width: 720px) {
  .demo-controls:has(#demo-direction) {
    flex-wrap: wrap;
    row-gap: 4px;
  }
}
```

**How to use it:**

- Open `http://127.0.0.1:8881/?direction=bg3#table`. The value persists in localStorage. `?direction=current`
  shows the selector with «Attuale»; `?direction=off` removes the key, and with it the selector.
- Take every numbered screenshot in direction mode, «Attuale» included, so all options share the
  same 96 px phone strip.

---

## (b) CSS architecture

### Load order

**In `index.html` (static links):**

- `styles.css`
- `combat.css`
- `characters.css`
- `character-builder.css`
- `library.css`
- `campaign.css`
- `rest-ui.css`
- `forms-ui.css`
- `conditions-ui.css`
- `preparation.css`
- `registry.css`

**Appended at runtime** by `registry.injectStyles` (registry.mjs:1032-1041), in registration order.
This is the list observed at runtime:

`token-menu`, `campaign-members`, `session-view`, `handouts`, `compendium`, `chat`, `annotations`,
`encounter-builder`, `campaign-settings`, `character-library`, **`preferences`** (22nd), `command-palette`,
`notifications`, `tables-decks`, `loot`, `safety`, `media`, `account`, **`home`** (30th),
`combat-tracker`, `damage`, `dice`, `fog-vision`, `inventory-plus`, **`sheet-plus`** (36th),
`spells-plus`, `builder-plus`, `special-moves`, `regions`, `world`, `journal-plus`, `party`,
`exploration`, `knowledge`, `scene-assets`, `homebrew-editor`, `adventures`, `campaign-data`,
`sessions-plus`, `offline`, `quickbar`, `projects`, `integrations`, `dice-3d`, `generators`,
`relations-graph`, `community`, `assistant`.

That makes 59 stylesheets.

**Later style elements:**

- `body > style.media-paint`: portrait paint rules (media.mjs:398-432).
- `<style>` elements **inside the map SVG**, for the media art layer (media-table.mjs:71-127) and
  the token-menu marks.

**Resulting rule.** A link appended last to `<head>` wins every tie with the files. It still loses to
`body` styles on ties, but it wins on specificity (§c).

**No CSP and no cache:**

- There is no CSP meta in `index.html` and no CSP header from `serve.py`.
- `sw.js` never caches (sw.js:5-7; the test in P1-shell.test.mjs:64-76 asserts no `caches.`).
- It is registered from offline.mjs:1453.

### Tokens and root attributes

| Where                                         | What                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| styles.css:9-150 `:root`                      | **Base palette.** The first twelve are overridden by light and high contrast: `--bg --surface --raised --canvas --text --muted --line --accent --accent-ink --danger --positive --focus`.                                                         |
|                                               | **Chrome:** `--surface-2 --sunken --header-bg --sidebar-bg --rail-bg --hotbar-bg --float-bg --float-border --scrim`.                                                                                                                              |
|                                               | **Trims:** `--line-strong --frame --frame-soft --placeholder`.                                                                                                                                                                                    |
|                                               | **Semantic:** `--accent-strong/-soft/-line`, `--danger-*`, `--positive-*`, `--warning*`, `--info*`, `--toast-*`.                                                                                                                                  |
|                                               | **HP:** `--hp-full/mid/low/down/temp/track`.                                                                                                                                                                                                      |
|                                               | **Turn resources:** `--res-action/bonus/reaction/move/slot/pact/spent`.                                                                                                                                                                           |
|                                               | **Turn order:** `--turn-current/ally/enemy/done`, `--endturn-bg`.                                                                                                                                                                                 |
|                                               | **Tokens and doors:** `--token-ally-fill/-ring`, `--token-hostile-fill/-ring`, `--token-initial`, `--token-label`, `--token-label-halo`, `--door-*`.                                                                                              |
|                                               | **Status:** `--status-*`.                                                                                                                                                                                                                         |
|                                               | **Visibility:** `--vis-*`.                                                                                                                                                                                                                        |
|                                               | **Shadows and keyline:** `--shadow-1/2/3`, `--keyline-dark`.                                                                                                                                                                                      |
|                                               | **Radii:** `--radius-xs 4`, `-sm 6`, `-md 12`, `-lg 16`, `-pill`, `--radius`.                                                                                                                                                                     |
|                                               | **Spacing:** `--space-1…8`.                                                                                                                                                                                                                       |
|                                               | **Fonts:** `--font-display`, `--font-ui`, `--font-label` (system stacks; no font file).                                                                                                                                                           |
|                                               | **Type scale:** `--text-2xs…3xl`, `--label-tracking`.                                                                                                                                                                                             |
|                                               | **Motion:** `--dur-fast/base/slow`, `--ease-out`.                                                                                                                                                                                                 |
|                                               | **Logo:** `--logo-edge`.                                                                                                                                                                                                                          |
|                                               | **Base styles on `:root`:** `font-family`, `font-size`, `background`, `color`.                                                                                                                                                                    |
| styles.css:153-205                            | `:root[data-pref-theme="light"]`: the light values of the non-base tokens.                                                                                                                                                                        |
| styles.css:207-218                            | High-contrast trims: `--line-strong --frame --frame-soft --placeholder`, dark and light.                                                                                                                                                          |
| styles.css:222-233                            | `--dur-*` = 0 under `prefers-reduced-motion` and `:root[data-motion="reduced"]`.                                                                                                                                                                  |
| preferences.css:21-31                         | **`:root:root`** (specificity 0,2,0) redefines `--text-*` as `calc(Npx * var(--pref-text-scale,1) * var(--pref-ui-scale,1))`. Any override must keep this form, or the text-size preference stops working.                                        |
| preferences.css:34-48, 54-63                  | Light base palette, plus light fixes for `.portrait`, `.combat-action` and `.combat-reasons`.                                                                                                                                                     |
| preferences.css:67-87                         | High contrast: `--text --muted --line --focus`; the focus outline is 4 px `!important`; buttons and fields get 2 px borders.                                                                                                                      |
| preferences.css:88-94                         | `data-pref-font="legible"` puts Verdana on `body *` with `!important`. It beats any direction font, and that is intended.                                                                                                                         |
| preferences.css:96-160                        | Hostile dashed ring and colour-vision palettes. Values are **inline custom properties on `<html>`**: `--pref-*`, `--danger`, `--positive` (preferences.mjs:139-141, preferences-domain.mjs:512-529). They beat any stylesheet, which is intended. |
| preferences.css:191-196                       | `data-motion="reduced"` sets `animation`, `transition` and `scroll-behavior` to none with `!important`.                                                                                                                                           |
| preferences.css:206-260, styles.css:4020-4045 | `data-pref-canvas="off"` (sheet-only Table).                                                                                                                                                                                                      |
| combat.css:6-21                               | **Map palette**, theme-invariant: `--map-gold`, `-gold-bright`, `-ink`, `-halo`, `-chip`, `-muted`, `-info`, `-danger(-strong)`, `-positive`, `-arcane`, `-illusion`, `-fog`, `-ground`. The HUD over the map reads these.                        |
| Area-local tokens                             | inventory-plus.css:8-17 (rarity); preparation.css:152-156 (`--spatial-*`: walls and doors); dice.css:848-877 (`--dtray-fx-*`); media.css:476, 878-879.                                                                                            |

**Root attributes on a running default page** (observed, set by preferences.mjs:119-147):

```
lang="it" data-pref-theme="dark" data-pref-font="standard" data-pref-contrast="standard"
data-pref-vision="standard" data-pref-names="outline" data-pref-units="metric" data-pref-canvas="on"
style="--pref-text-scale: 1; --pref-ui-scale: 1; --pref-panel-opacity: 1;"
```

These also appear conditionally: `data-motion="reduced"`, `data-pref-scaled="on"`,
`data-pref-fade="on"`, `data-pref-photosensitive="on"` and `data-pref-map-words="on"`.

`data-direction` is used nowhere today.

**Other things that override a direction:**

- A character's colour theme in the media «Aspetto» writes `#content{--accent:…;--focus:…}` on
  that sheet. That is an ID rule (media.mjs:402-404, asserted by media-journey.js:218-228). Do not
  force `--accent` on `#content`.
- Interface or text scale ≠ 100 % rewrites every same-origin stylesheet's px values (preferences.mjs:150-200,
  `scaleStyleSheets`). A direction sheet that loads later is scaled on the next `applyPreferences`
  (on navigate or visibilitychange, preferences.mjs:1666-1669, 1730). Judge Round-1 directions at
  100 %.

### Selectors per surface

All paths are under `design/blueprint/`.

**Shared chrome (all three surfaces):**

| Element    | Where                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header     | `.app-header` styles.css:631 (the Table uses `.table-header`); `.brand` 641; `.nav-link` 671-696 (phone 1743); `.service-nav` 697; `.icon-button` 453-470.                                                                   |
| Controls   | `.button` (and `.primary`, `.quiet`, `.danger`, `.active`) 393-452; `.text-button` 470; `.toolbar` 484; `.field` 490-520; `.badge` 377; `.tabs` 863-898; `.panel` 852.                                                       |
| Headings   | `.page-heading` 824; `.section-heading` 838; `h1`–`h3` 337-376.                                                                                                                                                              |
| Stat boxes | `.stats` and `.stat` 927-960.                                                                                                                                                                                                |
| Dialogs    | the native `<dialog id="dialog">` (index.html:30): `dialog`, `::backdrop`, `.dialog-heading`, `.dialog-body`, `dialog footer`, styles.css:1533-1580. There are more in token-menu.css, forms-ui.css and preferences.css:327. |
| Toast      | `#toast` styles.css:1676-1703.                                                                                                                                                                                               |
| Focus      | styles.css:286-316.                                                                                                                                                                                                          |

**Home (Inizio).** Route `route:home`, rendered by home.mjs:92 as `div.home-dashboard[data-home-art?]`
around the markup of home-ui.mjs.

| Element              | Where                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Layout               | `.home-page`, `.home-layout`, `.home-main` home.css:6-48; grid ≥1101 px 49-110; ≤1100/900/720: 939-980.                    |
| «Continua a giocare» | `.resume-scene` styles.css:1022-1052 and home.css:112-135; `.scene-emblem` styles.css:1041-1052 and home.css:116-126.      |
| Next session         | `.campaign-entry.home-appointment` styles.css:1117 and home.css:329-380.                                                   |
| Your character       | `.home-bottom` styles.css:1053 and home.css:137-158; `.character-resume` + `.portrait` + `.hp-small` styles.css:1064-1115. |
| Area widgets         | `.cm-home` campaign-members.css:671-690; `.chat-home` chat.css:1111-1130; `.community-home` community.css:500-510.         |
| Onboarding           | `.home-start` fold and `.home-paths` home.css:173-275.                                                                     |
| Right panel          | `.home-aside`, `.home-tabs`, `.home-panel`, `.home-news` home.css:417-600.                                                 |

**Scheda.** Route `route:characters` (`#characters?id=livia`).

| Element       | Where                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sheet page    | `div.character-sheet[data-character-page][data-character-category]` › `.character-layout`; characters.css:68 onward, 926-940.                                                                                                                     |
| Breadcrumb    | `.character-breadcrumb` characters.css:52; `.clib-sheet-bar` character-library.css.                                                                                                                                                               |
| Heading       | `header.page-heading.character-heading` characters.css:44-51, 742; portrait `.character-portrait(.small)(-button)` characters.css:25-43, 783-815.                                                                                                 |
| Band          | `.character-band` characters.css:72-130.                                                                                                                                                                                                          |
| Band contents | ability boxes `.shp-abilities`/`.shp-ability-box` sheet-plus.css:993-1020; `.shp-stat`/`.shp-pill` sheet-plus.css:89-175; `.character-vitals`, `.character-hp`, `.character-inspiration` characters.css:81-130; `.character-stat-button` 853-860. |
| Body          | `.character-body`, `.character-side`, `.character-main` characters.css:315-336, 895-905; `.character-summary` 337-345.                                                                                                                            |
| Left column   | `.shp-derived` and `.shp-grid` sheet-plus.css:380-390.                                                                                                                                                                                            |
| Tab strip     | `.character-tabs-bar` and `nav.tabs.character-tabs` characters.css:482-561.                                                                                                                                                                       |
| Tab content   | `.character-tab-content` 580.                                                                                                                                                                                                                     |
| Actions tab   | `.character-turn` and `.character-resource` characters.css:427-470 (own SVG shapes, characters.mjs:1161); `.shp-actions` sheet-plus.css:591.                                                                                                      |
| Phone         | characters.css:1160 onward; sheet-plus.css:939, 1214.                                                                                                                                                                                             |
| Hidden hooks  | Some elements are **hidden hooks** (for example the AC button, 0×0 in the band, tests/visual2-sheet.test.mjs:60). Never unhide them.                                                                                                              |

**Tavolo.** Route `#table`. Its markup is table.mjs:840-1000. Its CSS is the B61 structure
(styles.css:2163-3207), the P6 fixes (3208-3374) and the Visual pass 2 HUD (3375-4315). The last
has a desktop block `@media (min-width: 721px)` at 3593-4058 and a phone block
`@media screen and (max-width: 720px)` at 4114-4315.

| Part                         | Markup                                                                                                                                                                                                                                                                                                                                                                                                                              | CSS                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----- | ---------------------------- |
| Page shell                   | `#app:has(> .workspace.is-table)` flex, 100dvh                                                                                                                                                                                                                                                                                                                                                                                      | styles.css:3595-3620                                                                                          |
| Grid                         | `.table-layout` (panel width 380/420/340/300, rail 56)                                                                                                                                                                                                                                                                                                                                                                              | styles.css:2173-2200, 4060-4066; desktop rows 3622-3673                                                       |
| Scene plate                  | `.table-topline` (h1 scene name, span state, `.toolbar` for DM commands)                                                                                                                                                                                                                                                                                                                                                            | 1152-1168; desktop plate 3678-3722; phone 4115                                                                |
| Map                          | `.table-stage` › `.map-container` › `svg#battle-map[data-mode]`                                                                                                                                                                                                                                                                                                                                                                     | 1236-1300, 3220; map box margin 3650-3654                                                                     |
| Tool column                  | `#map-toolbar.map-toolbar` › `.map-tool-cluster` › `.map-tool.map-tool-group[data-tool-group]` + `.map-subtools` › `.map-tool[data-tool]`                                                                                                                                                                                                                                                                                           | 1245-1290, 2466-2500; desktop top 3723                                                                        |
| Zoom                         | `.map-zoom` › `.map-tool[data-table=find-token                                                                                                                                                                                                                                                                                                                                                                                      | zoom-in                                                                                                       | zoom-out                              | fit]` | 2510-2527; desktop 3819-3826 |
| Map status line              | `.map-caption` › `#map-message`                                                                                                                                                                                                                                                                                                                                                                                                     | 1361; desktop 3794-3818; phone 2944-2970                                                                      |
| Party portraits (BG3)        | `nav.table-party` › `button.table-party-member[data-party-select][.is-selected]` › `.table-party-portrait`, `.table-party-hp(.is-low/.is-down)`, `.table-party-name`, `.table-party-status[data-party-status]`                                                                                                                                                                                                                      | 3388-3530; phone 4202-4232                                                                                    |
| Turn portraits (combat only) | `.initiative` › `button.initiative-token[data-select][.current]` › `span.token-dot(.hostile)` + name/`small`                                                                                                                                                                                                                                                                                                                        | 1169-1233; desktop 3729-3792; phone 4132-4192                                                                 |
| Sidebar panel                | `#table-sidebar-panel.table-sidebar-panel[data-table-panel][data-table-section]` › `.table-subtabs` › `.table-subtab`; `.table-inspector` › `.inspector-person` (`.portrait`, h2, `.inspector-ac`)                                                                                                                                                                                                                                  | 2226-2260, 2360-2410, 1378-1430, 3531-3575; phone sheet 4297-4315                                             |
| Sidebar rail                 | `.table-sidebar-rail` › `.table-sidebar-toggle`, `.table-map-link`, `.table-panels-all`, `.table-tabs` › `button.table-tab[role=tab]data-table-section                                                                                                                                                                                                                                                                              | data-table-drawer][.active]`(first tab glyph is`.table-tab-portrait`)                                         | 2262-2360; phone bottom bar 3052-3090 |
| Hotbar (BG3)                 | `div.action-dock.table-hotbar` › `.hotbar-identity` (`.hotbar-portrait`, `.hotbar-name`, `.hotbar-hp[data-table=hp]`) · `.hotbar-center` › `.hotbar-resources` (`.resources` › `span(.available)(.movement)` › `.resource-word`; `.hotbar-slots`) · `.hotbar-pages` › `.hotbar-page-tab` · `.hotbar-page` › `section.combat-bar` (combat.css) or `section.qb` (quickbar.css) · `.toolbar` (turn commands + `[data-table=end-turn]`) | 1441-1530, 2528-2660, 3240-3320; desktop 3828-4019; phone 4233-4296; combat.css:22-300; quickbar.css:4 onward |
| End turn                     | `button.button.primary[data-table="end-turn"]` («Termina turno»): a 96 px circle on desktop, a pill on the phone                                                                                                                                                                                                                                                                                                                    | 2747-2790, 3988-4010, 4293                                                                                    |
| Resource symbols             | `::before` shapes: circle, triangle (clip-path) and star                                                                                                                                                                                                                                                                                                                                                                            | 1449-1492                                                                                                     |
| Tokens                       | `g.map-token[data-actor](.hostile)(.selected)(.is-dead)` › `circle.token-hit` + `g.token-display` › `circle` (fill), `circle.selection-ring`, `text` (initial), `text.token-name`, HP `rect`s, `g.token-status`                                                                                                                                                                                                                     | markup table.mjs:909; CSS 1309-1360                                                                           |
| Doors                        | `g.door-controls` › `.door-display`                                                                                                                                                                                                                                                                                                                                                                                                 | 2104-2120                                                                                                     |
| Session HUD (top right)      | `foreignObject.session-view-hud-fo` › `.session-view-hud-bar` › `.session-view-hud-button`                                                                                                                                                                                                                                                                                                                                          | session-view.css:14-60                                                                                        |
| Other map layers             | the `g[data-ext-slot^="map-layer:"]` groups (43 at runtime)                                                                                                                                                                                                                                                                                                                                                                         | their area CSS                                                                                                |

**Measured at 1440×900** (player, exploration and combat):

| Element                                      | Size                                  |
| -------------------------------------------- | ------------------------------------- |
| Strip                                        | 43 px                                 |
| Table header                                 | 63 px                                 |
| Hotbar                                       | **118 px** (the journeys allow ≤ 120) |
| Map tools, rail tabs, hotbar command buttons | 40×40                                 |
| Party member                                 | 64×89                                 |
| Initiative token                             | 76×75 (current turn 86×96)            |
| End turn                                     | 96×96                                 |
| Sidebar                                      | 340 px wide (1280–1599)               |

At 390×844 the strip is 80 px.

### Values that do NOT follow token overrides (need direction-scoped rules)

1. **Colours in CSS.**
   - All 143 hex/rgb literals in `styles.css` sit in the token blocks (lines 1-233).
   - The surface CSS files have no colour literal outside their own token blocks:
     `characters.css`, `sheet-plus.css`, `home.css`, `quickbar.css`, `session-view.css`,
     `conditions-ui.css`, `damage.css` and `token-menu.css`.
   - The exceptions to override if needed: dice fx (dice.css:803-877), `special-moves.css:358-364`
     (marker swatches), media missing-art (media.css:878-879), rarity (inventory-plus.css:8-17) and
     spatial walls and doors (preparation.css:152-156).
2. **Fonts.** Every `font-family`/`font:` in the surface CSS uses `var(--font-*)`. The exception is
   preferences.css:93 (legible, intended). **Literal px font sizes do not follow `--text-*`.** The
   ones on the surfaces:
   - token initial `21px` (styles.css:1325) and token name `600 13px` (1329);
   - `.portrait` 34 px (1072) and `.inspector-person .portrait` 27/23 px;
   - `.initiative-token small` 10 px (1216);
   - `.table-party-portrait` 24 px (3422);
   - `.hotbar-portrait` 22 px (2589);
   - `.demo-strip` 12 px;
   - `.table-log p` 12 px (1504);
   - `.action-dock` 15/11 px (1523-1532).
3. **Radii (literal).**

   | Surface               | Literal radii                                                                                                                                                                                                                                                                                  |
   | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | styles.css, controls  | `.icon-button` 10 px (459); `.map-toolbar` 14 (1257); `.map-tool` 10 (1267); `.map-subtools`/`.map-zoom` 14 (2494, 2522); `.table-panels-all` 10 (2303); `.table-subtab` 999 (2382); `#toast` 10 (1686)                                                                                        |
   | styles.css, portraits | `.portrait` 30 30 8 8 (1068); `.table-tab-portrait` 50 % (2339); `.token-dot` 50 % (1222); `.hotbar-portrait` 21 21 6 6 (2590); `.table-party-portrait` 22 22 6 6 (3419); compact 18 18 5 5 (3512); phone 16 16 5 5 (4214); `.table-party-status` 10 (3484)                                    |
   | styles.css, HUD       | `.inspector-ac` 8 8 50 % 50 % (3554); `.table-topline` plate 14 (3688); `.map-caption` 10 (3809, 2965); `.hotbar-center` 0 md md 0 (3878); End turn 50 % (3997); collapsed-sidebar toolbar 14 (4017); `.hotbar-hp-bar` 4 (3263); `.hotbar-slot-level > i` 2 (3310); `.table-party-hp` 3 (3443) |
   | characters.css        | `.character-portrait` 40 % 40 % md md (31); `.character-portrait-edit` 50 % (812)                                                                                                                                                                                                              |
   | sheet-plus.css        | `.shp-icon-btn` 10 (519); dots and knobs 50 % (151, 264, 467, 671)                                                                                                                                                                                                                             |
   | session-view.css      | HUD buttons and chips 10 (44, 213, 236, 279, 312, 1006)                                                                                                                                                                                                                                        |
   | token-menu.css        | `.token-menu-portrait` 50 % (56); close button 10 (98)                                                                                                                                                                                                                                         |
   | combat.css            | `.combat-cost-action` and `.active-effect-icon` 50 % (483, 579)                                                                                                                                                                                                                                |
   | conditions-ui.css     | pips and chips (95, 156, 160, 758)                                                                                                                                                                                                                                                             |

4. **SVG presentation attributes written by JS.** Any CSS rule overrides them (they have zero
   specificity). Chromium probe: `#map-grid path{stroke}` took effect.
   - table.mjs:891: grid `stroke="#d9c79c" stroke-opacity=".15"`.
   - table.mjs:909: token HP bar `rect`s (`#111b25` track, `#8fb48a` fill), status badge
     (`#142733`/`#5b1f22` fill, `#e2c17b` stroke, `#f4e4bf` text) and status label.
   - table.mjs:1657, 2168: `#e2c17b` strokes.
   - preparation.mjs:459-468 (`renderSceneBase`): scene ground `#34413b`, courtyard and camp
     structures (`#555c55 #b0aa8b #344c50 #a4a58b #7a948b`, camp `#8d734c #d2b982 …`).
   - preparation.mjs:480: preview grid `#ece7d0`.
   - path-ui.mjs:35-61 (path markers), combat-ui.mjs:626-634 (area templates), token-menu.mjs:432,
     516, combat-tracker.mjs:1843.
   - session-view.mjs:1859-1866: spectator map.
   - media-table.mjs:60-66: form emblem; media-ui.mjs:212.
   - Leave the brand alone: ui.mjs:101 (logo `#f7e6bd`/`#2a2116`).
5. **Inline styles set by JS.** Never fight them with `!important`:
   - the party HP width (table.mjs:871);
   - `fitHud` (table.mjs:1203-1270): `.map-toolbar` `top`/`max-height`, `.initiative` `margin-top`,
     `.table-topline` `max-width`, `.map-caption` `bottom`, `.table-party` `max-height`, and the
     classes `is-tight`, `is-compact`, `is-scrolling`, `is-hidden`;
   - `--map-message-bottom` (table.mjs:1297);
   - the preferences custom properties on `<html>`.
6. **Fixed geometry the HUD depends on:**
   - map box `margin: 0 76px 152px 88px` (styles.css:3650-3654; pinned by
     tests/visual2-table.test.mjs:181-186);
   - `.map-caption` bottom 164 px, `.map-zoom` bottom 176 px;
   - tools and turn order at top 66 px (desktop, before `fitHud`) and 118 px (721-1279);
   - hotbar columns (3830-3833), End turn 96 px;
   - phone map `height: calc(100dvh - var(--table-rail-height,64px) - 220px)` (4194-4201).

   **If a skin changes the tool column width, the hotbar height or the party column, adjust these in
   the same direction file.** Otherwise «fit» puts the scene under the controls.

---

## (c) Recommended mechanism

### Files

```
design/blueprint/directions/
  index.mjs              dev loader + DIRECTIONS + strip control (§a); only file app.mjs imports
  dev.css                strip wrap in direction mode (§a); nothing else
  bg3/direction.css      :root[data-direction="bg3"] tokens + Home/Scheda/Tavolo skins
  ddb/direction.css
  vtt/direction.css
design/blueprint/assets/ (licensed only, with PROVENANCE / ATTRIBUTION rows per phase-c-plan §2-3)
  fonts/<family>/*.woff2 + OFL.txt   icons/game|ui/*.svg   portraits/<dir>/*.webp   maps/<dir>/old-watch.webp
```

At the top of each `direction.css`, put a comment table «elemento → prodotto → fonte» for every rule
group. The I-248 comparison page reuses it.

### Scoping and specificity (verified in Chromium on 8881)

**Prefixes to use:**

- **Colour tokens and any rule that paints colours or textures:**
  `:root[data-direction="<id>"]:not([data-pref-theme="light"])`. Dark first; light keeps today's
  palette untouched.
- **The eight contrast-sensitive tokens** (`--text`, `--muted`, `--line`, `--focus`,
  `--line-strong`, `--frame`, `--frame-soft`, `--placeholder`): also add
  `:not([data-pref-contrast="high"])`, otherwise the direction (0,3,0 or more, loaded last) beats
  high contrast (0,2,0).
- **Fonts, radii and spacing:** `:root[data-direction="<id>"]`.
- **Motion:** never redefine `--dur-*`. If you must, do it only inside
  `@media (prefers-reduced-motion: no-preference)` and with `:not([data-motion="reduced"])`.

**Why a prefixed rule wins:**

- The prefix adds (0,2,0) or (0,3,0) to the base selector, and the link is last.
- Copy the **full** existing selector after the prefix.

Probe results:

| Rule                                                                                                                  | Result                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `:root[data-direction] .table-layout > .action-dock.table-hotbar > .toolbar > .button.primary[data-table="end-turn"]` | beat styles.css:3988 (the radius became 8 px)                 |
| `:root[data-direction] #battle-map .map-token[data-actor="goblin-1"] .token-display > circle:first-child`             | beat the media layer's in-SVG `fill:url(#media-art-goblin-1)` |
| `:root[data-direction]` `--text-md`                                                                                   | beat `:root:root` (preferences.css:21) by order               |
| `…:not([data-pref-theme="light"]) { --bg }`                                                                           | switched off correctly under light                            |
| everything                                                                                                            | restored exactly once the attribute and the link were removed |

**Accessibility preferences stay stronger by design:**

- colour-vision inline variables on `<html>`;
- the legible font (`!important`);
- the high-contrast focus width (`!important`);
- reduced motion (`!important`).

**Media art:** the media art for Doran and goblin-1, and the character colour theme `#content{--accent}`,
are user data. A skin may override the sample art only while a direction is active, for the
comparison (§e). It must not restyle the token-menu ring colours a user chose; the
`map-layer:token-menu-marks` style is empty in the sample.

**Nesting:** CSS nesting works in Chromium and WebKit, but keep flat selectors. That is the house
style, and `scaleRules` (preferences.mjs:181-190) handles flat rules predictably.

### Fonts

| Point        | Detail                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Files        | `design/blueprint/assets/fonts/<family>/` with its `OFL.txt` (phase-c-plan §2).                                                                                                                                                                                                            |
| `@font-face` | Declare it **inside the direction's `direction.css`**, so a font is fetched only when that direction is active. Use `url("../../assets/fonts/<family>/<file>.woff2") format("woff2")`, `font-display: swap`, a Latin + Latin-ext `unicode-range`, and keep the system stacks as fallbacks. |
| Wiring       | Override `--font-display`, `--font-ui` and `--font-label` only. All surface CSS reads them.                                                                                                                                                                                                |
| Loading      | No CSP and no service-worker cache (sw.js:5-7 just `fetch`es), so no precache list is needed. `serve.py` (Python 3.9 `mimetypes`) serves `.woff2` as `font/woff2`; checked. The web manifest is irrelevant.                                                                                |
| Scaling      | `scaledValue` skips any value containing `url(` (preferences.mjs:170).                                                                                                                                                                                                                     |
| Budget       | About 300 KB in total. Never Quadraat or any proprietary face.                                                                                                                                                                                                                             |

### Zero effect when no direction is selected

1. With no key, or on a non-loopback host:
   - no `data-direction`;
   - no direction or dev `<link>`;
   - no defs sprite;
   - `directionControl()` returns `""`, so the strip markup is identical;
   - `startDirection()` returns at once off loopback, and on loopback `applyDirection(null)` adds
     nothing;
   - the only difference is one extra same-origin GET for the `directions/index.mjs` module.
2. Every style rule in `directions/*/direction.css` begins with the `:root[data-direction="<id>"]`
   prefix, including those inside `@media` blocks. The exception is `@font-face`, which is inert
   until a prefixed rule uses the family, and the file only loads when its direction is active
   anyway. A `grep` check in review is enough. `dev.css` only matches `#demo-direction`.
3. **Proof before handing off:**
   - Capture Home (`#home`), Scheda (`#characters?id=livia`) and Tavolo (`#table`; and DM in combat,
     §e) at 1440×900 and 390×844, dark, IT. Do it on 8881 **before** the `app.mjs` edit and
     **after** it with the key absent, in the same session and the same minute.
   - Sample dates (sample-clock) and relative times change with the day.
   - Compare with `magick compare -metric AE a.png b.png null:` (must be 0), and compare hashes of
     `document.querySelector("#app").outerHTML`.
   - Then run `node --test design/blueprint/tests/*.test.mjs` from the worktree root.

---

## (d) Icons

**How `icon(name)` works** (ui.mjs:149-156):

- It returns an inline string:

  ```html
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="…" />
  </svg>
  ```

- It is a single stroke path from the private `paths` map (ui.mjs:11-59, 39 names). Unknown names
  fall back to `book`.
- It has **no name attribute**, so CSS cannot select an icon by name.
- `iconPath(name)` (ui.mjs:148) exposes the raw path. Only token-menu.mjs:156 uses it, for its menu
  rows (`MENU_ICONS`, token-menu.mjs:109 onward).
- Size: `.icon` is 21×21 (styles.css:331).
- `ctx.icon` is the same function (app.mjs:501). 43 modules call `ctx.icon`; five import `icon`
  directly. combat-tracker.mjs:119 and journal-plus.mjs:3172 wrap `ctx.icon`.

**Names in use** (observed on 8881, 30/09):

| Surface           | Icon names                                                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home              | `home`, `person`, `campaign`, `book` (nav and character card), `search`, `note`, `bell`, `settings`, `help`, `check` (offline), `play` (Entra al Tavolo), `map` (scene emblem), `clock` (integrations card) |
| Scheda            | the header set, plus `play`, `pen` (portrait edit), `plus`, `dice`. **Own SVG:** the turn-resource circle, triangle and star (characters.mjs:1161).                                                         |
| Tavolo, header    | `menu` (App), `arrow` (back), header services                                                                                                                                                               |
| Tavolo, map tools | `move` (select group and move), `note` (plan), `map` (pan), `check` (select several), `ruler` (measure group), `pen` (draw), `flag` (pointer), `eye` (fog group), `shield` (DM group)                       |
| Tavolo, rail      | `panel`, `grid`, `chat`, `swords` (combat), `map` (scene), `light` (exploration), `scroll` (journal), `cards` (tables), `book` (reference), `bag` (items)                                                   |
| Tavolo, inspector | `undo` (last move), `book` (sheet), `bag` (inventory), `light`, `plus`                                                                                                                                      |
| Tavolo, hotbar    | `move`, `sword` (actions), `dice`, `close` (cancel), `undo`; combat action chips use `sword`, `dice` and `book`                                                                                             |
| Tavolo, own SVG   | find-token and fit (table.mjs:1032, 1034); session HUD icons (session-view.mjs:70, 73, 2389); token-menu `MENU_ICONS`; the special-moves `sm-glyph`; combat-ui effect icons (combat-ui.mjs:532); the logo   |

End turn is text, not an icon.

**What CSS alone can do today** (no JS):

- recolour through `color`;
- resize through `.icon` width and height;
- change the stroke **weight**, e.g. `:root[data-direction="vtt"] .icon { stroke-width: 2 }`,
  because `stroke-width` is a presentation attribute. styles.css:1047-1052 already does this for the
  scene emblem.
- Per control, swap the glyph with a mask. For example:
  `…[data-tool="move"] > .icon { background: currentColor; -webkit-mask: url(…/move.svg) center/contain no-repeat; mask: …; }`
  plus `…[data-tool="move"] > .icon > * { visibility: hidden }`.
  - This works for a handful of hotbar and tool controls.
  - It cannot follow an icon everywhere it appears.
  - It is the only route for the own-SVG icons listed above.

**A full icon-set swap needs JS in `ui.mjs`.** It is not a reserved file, so the coordinator must
reserve it first. It belongs to Choice 4 and is optional for Round 1.

```js
let iconOverride = null; // set only by directions/index.mjs
export function setIconOverride(fn) {
  iconOverride = typeof fn === "function" ? fn : null;
}
export function icon(name) {
  const alt = iconOverride?.(name); // full '<svg class="icon" … aria-hidden="true">…</svg>' or null
  if (alt) return alt;
  return /* unchanged original string */;
}
```

**How to use the hook:**

- The loader calls `setIconOverride(map)` or `setIconOverride(null)`, then `render()`.
- Game-icons glyphs are filled. The returned SVG must say `fill="currentColor" stroke="none"`,
  keep `class="icon"` and `aria-hidden="true"`, and keep a square `viewBox`.
- Node tests never set an override, so `html.includes(icon("ruler"))`
  (annotations.test.mjs:596, review-fixes-b11b-inc10.test.mjs:255, review-fixes-b61.test.mjs:84)
  still match.
- `iconPath` stays as it is: the token-menu rows keep their stroke paths.

---

## (e) Imagery hooks

**Actors.** They carry **no image field** in core state (DEVELOPMENT.md state shape). All art lives
in the media area slice `state.ext.media`:

- `assets[]` hold `dataUrl`s;
- `looks[actorId] = { portrait, token:{active, crop, variants[]}, theme? }`
  (media-domain.mjs:200-380);
- the synthetic seed art is in media-seed.mjs;
- uploads come from the Media library and the sheet's «Aspetto» picker (characters.mjs:713-731).

The art is painted **by CSS rules generated at runtime**:

- media.mjs:398-432 writes `body > style.media-paint`, with rules like
  `.character-resume[data-open-sheet="<id>"] .portrait{background:url(blob:…)…;color:transparent}`
  and, on that sheet, `.character-heading .character-portrait`;
- media-table.mjs:71-127 writes a `<style>` inside the map:
  `#battle-map .map-token[data-actor="<id>"] .token-display > circle:first-child{fill:url(#media-art-<id>)}`,
  hides the initial `text`, paints `.initiative-token[data-select="<id>"] .token-dot{background:…}`,
  and paints the inspector `.portrait` of the selected creature.

**Sample state:**

- Doran has a portrait. goblin-1 has token variants.
- Livia, Mira and goblin-2 show **initials**. The initial is the first letter, rendered as text.
- The sheet portrait renders an `<img>` when art exists (characters.mjs:721). Hide it with
  `img{opacity:0}`, or swap it with `img{content:url(…)}` (Chromium and WebKit), when you skin it.

**Actor hooks** (use them in CSS; never add markup):

| Surface | Element              | Hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home    | «Il tuo personaggio» | `button.character-resume[data-open-sheet="livia"] > .portrait` (home-ui.mjs:183)                                                                                                                                                                                                                                                                                                                                                                                            |
| Home    | recent chips         | `.home-chip[data-open-sheet] .portrait.small` (home-ui.mjs:464)                                                                                                                                                                                                                                                                                                                                                                                                             |
| Scheda  | heading portrait     | `.character-sheet:has([data-shp-band="livia"]) .character-heading .character-portrait` (also `[data-shp-derived]`, `[data-conditions-summary]`, and `[data-clib-act][data-actor]` in the breadcrumb)                                                                                                                                                                                                                                                                        |
| Tavolo  | party portraits      | `.table-party-member[data-party-select="<id>"] .table-party-portrait` (table.mjs:871)                                                                                                                                                                                                                                                                                                                                                                                       |
| Tavolo  | turn portraits       | `.initiative-token[data-select="<id>"] .token-dot` (table.mjs:883). `data-select` is unique to the turn order (visual2-table.test.mjs:43).                                                                                                                                                                                                                                                                                                                                  |
| Tavolo  | map tokens           | `#battle-map .map-token[data-actor="<id>"] .token-display > circle:first-child`, then hide `> text:first-of-type` (table.mjs:909)                                                                                                                                                                                                                                                                                                                                           |
| Tavolo  | selected creature    | `.hotbar-portrait` (table.mjs:842; visible only from 1500 px: hidden at 1280–1499 by styles.css:2820-2824, at 721–1279 by 4081-4083 and on the phone by 2853-2857), `.inspector-person .portrait` (table.mjs:755) and `.table-tab-portrait` (table.mjs:630) **carry no id**. Scope them with `.table-layout:has(.map-token.selected[data-actor="<id>"], .table-party-member.is-selected[data-party-select="<id>"], #table-sidebar-panel [data-conditions-summary="<id>"])`. |

Actor ids are `livia`, `doran`, `mira`, `goblin-1` (Sentinella) and `goblin-2` (Esploratore).
Hostiles use `.hostile` classes.

**HTML portraits** (spans): a skin sets a `background` of
`url("../../assets/portraits/<dir>/<id>.webp") center/cover` and `color: transparent`, exactly as
the media rules do. A prefixed selector outranks `style.media-paint`.

**SVG tokens and scene art.** CSS cannot point `fill` at an image file. The loader appends a hidden
sprite **outside `#app`**:

```html
<svg
  id="direction-defs"
  width="0"
  height="0"
  aria-hidden="true"
  focusable="false"
  style="position:absolute"
>
  <defs>
    <pattern id="dir-bg3-livia" patternContentUnits="objectBoundingBox" width="1" height="1">
      <image
        href="assets/portraits/bg3/livia.webp"
        width="1"
        height="1"
        preserveAspectRatio="xMidYMid slice"
      />
    </pattern>
    <pattern id="dir-bg3-scene" patternUnits="userSpaceOnUse" width="1000" height="650">
      <image
        href="assets/maps/bg3/old-watch.webp"
        width="1000"
        height="650"
        preserveAspectRatio="none"
      />
    </pattern>
  </defs>
</svg>
```

Then the CSS:

```css
:root[data-direction="bg3"]
  #battle-map
  .map-token[data-actor="livia"]
  .token-display
  > circle:first-child {
  fill: url(#dir-bg3-livia);
}
:root[data-direction="bg3"]
  #battle-map
  .map-token[data-actor="livia"]
  .token-display
  > text:first-of-type {
  display: none;
} /* initial only: the token's name is its aria-label */
```

The pattern reference from `#battle-map` into the separate sprite was verified: the token rendered
the pattern (pixel check, Chromium).

**Details to respect:**

- **URLs.** The `href` of an `<image>` inside the inline sprite resolves against the page. `url()`
  in CSS resolves against the CSS file.
- **Accessible names.** A token's accessible name is its `aria-label`
  (`aria-label="Livia, 18 punti ferita"`). Hiding the initial `text` removes nothing from
  accessibility; hiding `.token-name` would change the look but not the accessible name.

**Scene `old-watch`** (state.mjs:667-688):

- **Seed:** `background: null`, `template: "courtyard"`, 1000×650, `gridSize` 50 (20×13 cells,
  1.5 m/cell), `gridVisible: true`.
- **How it draws.** `renderSceneBase` (preparation.mjs:449-469) draws:
  1. `<rect fill="#34413b">` (the ground);
  2. then either an `<image>` (an uploaded **data-URL** background: PNG/JPEG/WebP ≤ 1 MB, or
     WebM/MP4 ≤ 2 MB drawn as `foreignObject.scene-video-fo`; preparation.mjs:37-52), or, with no
     background, a nested `<svg viewBox="0 0 1000 650" preserveAspectRatio="none">` holding the
     template structures;
  3. then table.mjs:891 draws the grid rect `fill="url(#map-grid)"`.
- **Walls and doors come from data** and draw in the spatial overlay (`g.spatial-overlay`) and
  `g.door-controls`:
  - outer curtain walls: rectangle (99,79)–(901,571);
  - north room: wall y=200 from x 99→340, and x=340 from 79→200 with a **door** at 340, y 110–170;
  - south-east room: wall y=450 from x 660→901, and x=660 from 450→571 with a **door** at 660,
    y 490–550;
  - difficult terrain: rubble (690,470, 190×90) and embers region (200,480, 100×80);
  - the well at (500,325), r≈72; its label «Pozzo del cortile» comes from scene-assets.
  - Tokens stand at Livia 250,380 · Doran 350,450 · Mira 150,450 · goblin-1 620,250 · goblin-2 740,340.

  **A painted sample map must match this geometry exactly**, because the walls, doors and
  measurements stay live.

- **How a skin shows sample map art without changing data:**

  ```css
  :root[data-direction="bg3"] #battle-map:not(:has(> image, > foreignObject)) > rect:first-of-type {
    fill: url(#dir-bg3-scene);
  }
  :root[data-direction="bg3"] #battle-map:not(:has(> image, > foreignObject)) > svg {
    display: none;
  } /* template structures, if the art paints them */
  :root[data-direction="bg3"] #map-grid path {
    stroke: …;
    stroke-opacity: …;
  }
  ```

  The `:not(:has(…))` guard keeps a real uploaded background visible. It also applies to any other
  template scene a DM creates, which is acceptable for the demo. With `userSpaceOnUse` the art pans
  and zooms with the scene.

- **Other maps are out of scope:** Preparation previews (`svg.prep-map`), the public-scene dialog
  and the spectator map reuse `renderSceneBase`. Keep skins to `#battle-map`.
- **Outside the map:** `.map-container` paints `var(--canvas)` (styles.css:1290-1296).

**Home campaign image.** home.mjs:77-93 reads the campaign profile's `image`:

- it lives in `ext["campaign-members"]`; the seed is `null` (campaign-members.mjs:137);
- it is uploaded in the campaign form, PNG/JPEG/WebP ≤ 1 MB (campaign-members.mjs:3150);
- it must be a data URL (the `IMAGE` regex, home.mjs:79).

When set, the wrapper renders `div.home-dashboard[data-home-art][style="--home-art:url(…)"]`, and
home.css:119-126 covers `.scene-emblem` and hides its `map` icon. Otherwise `.scene-emblem` shows a
gradient and the icon (home.css:116-118).

A skin shows a sample plate with:

```css
:root[data-direction="<id>"] .home-dashboard:not([data-home-art]) .scene-emblem {
  background:
    url("../../assets/scenes/<id>/lanterns.webp") center/cover no-repeat,
    var(--canvas);
}
:root[data-direction="<id>"] .home-dashboard:not([data-home-art]) .scene-emblem .icon {
  display: none;
} /* decorative, aria-hidden */
```

The `cm-home` rows use `cover()` (campaign-members.mjs:2200-2204): an `img` or
`.cm-cover.cm-monogram`.

**Getting the combat HUD on screen** (turn portraits and End turn):

1. Set «Visita come» to DM on `#table`.
2. Press «Avvia combattimento» (`.table-topline [data-table="combat"]`).
3. In the dialog, press «Tira tutti», then «Inizia combattimento».

This changes only that browser's simulation state; «Ripristina esempio» restores it.

---

## (f) Risks: tests and journeys a skin could break

All 189 journeys run in fresh contexts with no direction key, so a gated, prefixed skin cannot affect
them. The risk comes from two things:

- editing shared files;
- or a direction breaking the same guarantees when QA runs **with** a direction.

To check a direction, run a copy of a journey in the evidence folder, never in the repository:

- `sed 's#http://127.0.0.1:8879/#http://127.0.0.1:8881/?direction=bg3#'`;
- the journeys hardcode 8879: 141 plain base URLs, the rest with a hash route;
- journeys that call `localStorage.clear()` are fine, because `?direction=` re-sets the key on
  every load.

### f1. Node tests that read existing CSS source text

**Rule: never edit these files.**

| Test                                           | What it pins                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tests/visual2-table.test.mjs:171-193           | styles.css Table HUD block: `#app:has(> .workspace.is-table)`, the grid rows, `#battle-map` margin `0 76px 152px 88px`, and phone blocks written as `@media screen and (max-width: 720px)`                                                                                                                                              |
| tests/review-fixes-b61.test.mjs:18-40, 120-130 | the **last** plain `@media (max-width: 720px)` block of styles.css; preferences.css `:root[data-pref-scaled] .table-stage > .map-toolbar`                                                                                                                                                                                               |
| tests/review-fixes-b62.test.mjs:105-150        | styles.css hotbar grid columns (combat-bar, combat-dock, combat-bar-heading, hotbar-portrait); special-moves.css; token-menu.css `.token-menu.sheet`                                                                                                                                                                                    |
| tests/final-fixes.test.mjs                     | 64 (token-menu.css), 80 (session-view.css), 495, 503, 521 (styles.css and chat.css), 648, 790-795 (characters.css `.character-sheet:not(…)`), 826-860 (styles.css phone note, `.table-tab-label`), **951-957 (no `text-transform: uppercase` in any top-level .css)**, 990 (home.css `.home-page .home-bottom` align-items start), 1005 |
| tests/close-fixes.test.mjs:808-820, 903-912    | styles.css caption opacity rule; characters.css header toolbar wrap; campaign sections                                                                                                                                                                                                                                                  |
| tests/phone-scale-fit.test.mjs:25-45           | characters.css `.character-tab-content`; sheet-plus.css `.shp-generic`, `.shp-note-head`                                                                                                                                                                                                                                                |
| tests/visual2-pages.test.mjs:155-169           | library.css, preferences.css, home.css `.home-layout > .home-main { display: contents`                                                                                                                                                                                                                                                  |
| Others                                         | tests/ia-consolidation.test.mjs:670-690; reconcile-ia.test.mjs:23, 129; media.test.mjs:1178; r4-phone-fit.test.mjs:10; w2b1-integration.test.mjs:171                                                                                                                                                                                    |

The `readdirSync` scans are top level only and not recursive: final-fixes.test.mjs:952 for `.css`
and residuals.test.mjs:459-463 for `.mjs` it/en string pairs. Files under `directions/` are not
scanned, but follow the same rules anyway: no «preview» on the Italian side, and no uppercase
transform.

### f2. Node tests that pin markup

Skins cannot touch markup, but the `ui.mjs` hook must keep its output identical.

- tests/visual2-table.test.mjs:31-91: party, hotbar, inspector structure and `data-select`
  uniqueness.
- tests/visual2-sheet.test.mjs:26-174: sheet order, hidden hooks, resource words, phone pages.
- tests/p6-table.test.mjs:91: `aria-label="Centra la scena"[^>]*><svg class="icon"[^>]*><circle`.
- tests/review-fixes-b61.test.mjs:82-101: `data-table="cancel">${icon("close")}` and the
  `table-panels-all` markup.
- annotations.test.mjs:596 and review-fixes-b11b-inc10.test.mjs:255: `html.includes(icon(…))`.

### f3. Journeys asserting geometry, computed styles or colours

These are what to re-run with a direction.

**Hotbar and Table layout:**

- b62-ia-journey.js:255-258: **hotbar height ≤ 120 px at 1440** (today it is 118: two extra pixels
  of padding or border break it).
- b62-ia-journey.js:409-413: hotbar bottom ≤ 768 at 1366×768.
- b62-ia-journey.js:462-484: at 390, map in view ≥ 60 %, no overflow, 8 phone tabs.
- b61-review-fixes-journey.js:645-660: End turn on screen at 1440×900; at 390, End turn, Undo and
  Cancel all visible.
- b61-table-structure-journey.js:
  - 71: targets ≥ 40;
  - 206: tab row scroll;
  - 388, 411: HUD `pointer-events`;
  - 500-530: at 390, header 1 row, top line ≤ 2 rows, rail pinned right under the action bar,
    `railBottom === innerHeight`;
  - 536: Chat tab ≥ 40.
- b62-review-fixes-journey.js:28-57 (clipping, targets ≥ 39.5), 185 (bar height), 285 (DM tools not
  under the pinned hotbar), 346 (focus ring `outlineStyle`).
- p6-phone-map-journey.js:110-118: the status line is never under the hotbar and stays on screen.

**Tokens and map:**

- visual-fixes-journey.js:29-35: phone token ≥ 44 px, and **token name font-size exactly 13 px**.
- media-journey.js:94 (token `fill` is the media pattern), 198 (portrait `backgroundImage`), 224
  (`--accent` of a character theme = `#8fc48a`), 241.
- media-review-journey.js:325-327 (a stroke of `rgb(99, 164, 224)`), 414.
- preferences-journey.js:385-400: colour-vision fills and strokes `rgb(122,74,0)`, `rgb(230,159,0)`
  and `rgb(29,79,122)` on tokens. A direction must not beat `:root[data-pref-vision]…` token rules
  with fills; guard with `:not([data-pref-vision]:not([data-pref-vision="standard"]))` if it colours
  tokens.
- conditions-badges-journey.js:70; token-menu-journey.js:349 (filter, opacity); safety-journey.js:696-700
  (`filter` on the map image and `#tokens`); fog-vision-journey.js:335; scene-assets-journey.js:565.

**Home and Scheda:**

- home-journey.js:1159-1160: **«Enter table» inside the first 844 px at 390**, so a taller hero or
  plate breaks it.
- home-journey.js:1195-1213: no overflow, targets ≥ 40 at 390.
- sheet-plus-journey.js:636-640, 886, 906: no overflow on desktop and phone, targets ≥ 40.

**Preferences and contrast:**

- preferences-journey.js:
  - 85: root custom-property values;
  - 267: nav-link font size grows with text size;
  - 308: `animationName` under reduced motion;
  - 956: map-toolbar opacity with panel fade;
  - 976: dock bottom;
  - 1002: `h1` font size.
- spells-plus-review-journey.js:405-448 and integrations-journey.js:1078-1090: they **compute
  contrast ratios** of text against the background. Check any direction palette against WCAG AA.
- registry-smoke-journey.js:122: dashed outline.

**Everywhere:** «no horizontal overflow at 390» and «targets ≥ 40 px» appear in about 130 journeys.
Examples: account-journey.js:926-954, annotations-journey.js:768-790, chat-journey.js:811,
campaign-\*-journey.js, combat-tracker-journey.js:974. Skins must not shrink controls or widen fixed
rows.

### f4. Other hazards

- **The HUD fitter.** A direction change without `render()` leaves `fitHud`'s inline tops, compact
  classes and caption lift from the old CSS (§a). A skin that changes the tool column width, the
  hotbar height or the party portrait sizes must also adjust the map box margin and the caption and
  zoom offsets (§b6).
- **Scaling timing.** Under interface or text scale ≠ 100 %, a direction sheet loaded later is
  scaled only on the next `applyPreferences` (§b).
- **Hidden hooks and fitter classes.** Hidden hooks (the AC button, `.table-panel-index`) and the
  compact classes set by the fitter must never be un-hidden or overridden.
- **Leaking into other routes.** The Scheda's `route:characters` also serves the character list, and
  `.portrait` is shared. Always scope with the surface ancestor: `.home-page`, `.character-sheet`,
  or `.workspace.is-table` / `.table-layout`. Otherwise Campaign, Library or dialog content picks up
  the skin.
- **Session HUD in a foreignObject.** It lives inside `#battle-map` (session-view.css). Its rules
  apply through the normal cascade.
- **Stale journey base.** The journeys target 8879 (frozen interview-01), so run copies against 8881
  (§f intro).
- **Other agents' sessions.** Keep your own `playwright-cli -s=<name>` session and close it. Other
  agents' sessions (`d20-final-*`) are open; leave them alone.

---

## Builder checklist

1. Add the three `app.mjs` insertion points and `directions/index.mjs` and `directions/dev.css`.
2. Run the zero-effect proof (§c).
3. Write one `direction.css` per direction with the prefixes in §c:
   - tokens first;
   - then Home, Scheda and Tavolo skins, scoped to the surface ancestor, copying the full existing
     selectors;
   - a comment table «elemento → prodotto → fonte» on top.
4. Put licensed assets under `assets/**` with provenance, and the portrait and scene patterns in the
   loader sprite (§e).
5. Check each direction at 1440×900 and 390×844 (dark, IT; then EN), player exploration and DM
   combat:
   - hotbar ≤ 120 px;
   - End turn, Undo and Cancel on screen;
   - no overflow;
   - targets ≥ 40;
   - Enter table in the first 844 px at 390;
   - focus visible;
   - AA contrast.

   Then re-run the §f3 journeys through an 8881 `?direction=` copy.

6. Take the numbered screenshots in direction mode, «Attuale» included, into
   `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`.
7. Run `node --test design/blueprint/tests/*.test.mjs`. Format new files with the repository's
   Prettier (`.prettierrc.json`, printWidth 100), so that `npm run check` stays green.
8. No commit, no push.
