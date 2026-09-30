// R3 (fix round 2) — SV-37 part (Roll20's errors name the cause and the fix): every disabled
// control in the package's files carries one sentence «cause: remedy» beside it, linked by
// aria-describedby. A source scan of the package's modules plus rendered states: the
// Transform dialog, the mount card, the planned path, the walls and the token art panel.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";
import { openTransform, resetTransformUI } from "../forms-ui.mjs";
import { renderPathControls } from "../path-ui.mjs";
import { renderTokenChoices } from "../media-ui.mjs";
import * as media from "../media.mjs";
import { harness } from "./r3-harness.mjs";

afterEach(() => {
  UI.resetSpecialMovesView();
  resetTransformUI();
});

const FILES = [
  "table.mjs",
  "table-spatial.mjs",
  "path-ui.mjs",
  "token-menu.mjs",
  "annotations.mjs",
  "special-moves.mjs",
  "forms-ui.mjs",
  "companion-map.mjs",
  "media.mjs",
  "media-ui.mjs",
  "media-table.mjs",
  "fog-vision.mjs",
  "spatial-editor.mjs",
  "lighting-editor.mjs",
];
// Where a module writes the attribute through its own helper, the reason travels with it.
const HELPERS = [
  /disabled = false,\s*(why|icon)/,
  /\$\{disabled \? ` disabled/,
  /disabled && why/,
  /disabled = false, focus, why/,
  /!disabled &&/,
  /disabled: [^,]+,\s*why:/,
  /disabled: [^,]+,\s*\n\s*why:/,
  // A native <option> states its own reason in its text («massimo due: rimuovine una»).
  /<option value=""\$\{full \? " disabled"/,
];

test("SV-37: no disabled attribute in the package's markup without its described reason", () => {
  const missing = [];
  for (const file of FILES) {
    const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    for (const match of source.matchAll(/disabled/g)) {
      const at = match.index;
      const around = source.slice(Math.max(0, at - 80), at + 160);
      const line = source.slice(source.lastIndexOf("\n", at) + 1, source.indexOf("\n", at));
      if (source[at - 1] === "." || source[at - 1] === "-") continue; // .disabled, aria-disabled
      if (/^\s*(\/\/|\*)/.test(line)) continue; // comments
      if (/:not\(\[disabled\]\)|getAttribute\("aria-disabled"\)/.test(around)) continue;
      if (HELPERS.some((re) => re.test(around))) continue;
      // The reason is linked from the same tag (before or after the attribute).
      const tag = source.slice(source.lastIndexOf("<", at), source.indexOf(">", at) + 1);
      if (/aria-describedby/.test(tag) || /aria-describedby/.test(source.slice(at, at + 160)))
        continue;
      missing.push(`${file}:${source.slice(0, at).split("\n").length}`);
    }
  }
  assert.deepEqual(missing, []);
});

/** Every disabled control in `html` names a reason element with text. */
function assertDescribed(html, where) {
  const tags =
    html.match(
      /<(button|input|select|textarea|fieldset)\b[^>]*\s(disabled|aria-disabled="true")[^>]*>/g,
    ) ?? [];
  for (const tag of tags) {
    const ids = tag.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(ids, `${where}: ${tag}`);
    for (const id of ids.split(/\s+/)) {
      const at = html.indexOf(`id="${id}"`);
      assert.ok(at >= 0, `${where}: no element #${id}`);
      const text = html
        .slice(html.indexOf(">", at) + 1, html.indexOf(">", at) + 400)
        .replace(/<[^>]+>/g, " ")
        .trim();
      assert.ok(text.length > 3, `${where}: empty reason #${id}`);
    }
  }
  return tags.length;
}

test("SV-37: the Transform dialog says why a beast or a preset is out", async () => {
  const h = harness({ role: "player", areas: [[D.ID, UI.register]] });
  await openTransform(h.ctx, { actorId: "livia", preset: "polymorph" });
  const html = h.dialogs.at(-1).body;
  // A player cannot use the DM's custom preset: it says so.
  assert.match(html, /La decide il DM: chiedi al DM o usa Metamorfosi\./);
  assert.ok(assertDescribed(html, "player transform") >= 1);
  const dm = harness({ role: "dm", areas: [[D.ID, UI.register]] });
  dm.cmd("cr", (d) => (d.actors["goblin-2"].cr = 0.25), "dm");
  await openTransform(dm.ctx, { actorId: "goblin-2", preset: "polymorph" });
  const out = dm.dialogs.at(-1).body;
  assert.match(out, /GS 1 oltre il limite di Esploratore/);
  assert.ok(assertDescribed(out, "DM transform") >= 3, "the beasts over CR 1/4 are described");
});

test("SV-37: the mount card says why «Controllata» is off for an untrained mount", () => {
  const h = harness({ role: "player", areas: [[D.ID, UI.register]] });
  const horse = h.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  h.cmd("untrained", (d) => delete d.actors[horse.id].mountTrained, "dm");
  UI.chooseMove(h.ctx, "mount", "livia");
  const html = UI.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.match(html, /Non è addestrata a portare un cavaliere: scegli Indipendente\./);
  assert.ok(assertDescribed(html, "mount card") >= 1);
  // Choosing «Controllata» anyway is refused with the SRD reason on Execute.
  UI.viewState().armed.controlled = true;
  const refused = UI.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.match(refused, /aria-disabled="true" aria-describedby="sm-reasons"/);
  assertDescribed(refused, "mount card, controlled");
});

test("SV-37: an empty planned path and a token image a viewer cannot change say why", () => {
  const h = harness({ role: "player", areas: [["media", media.register]] });
  const path = renderPathControls(h.ctx, "livia", true);
  assert.match(path, /Nessun punto ancora: clicca sulla mappa la destinazione, poi Esegui\./);
  assert.equal(assertDescribed(path, "path"), 1);
  const choices = renderTokenChoices(h.ctx, "goblin-1", { editable: false });
  assert.ok(assertDescribed(choices, "token images") >= 1);
});
