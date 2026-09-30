// W2b2 integration: the Preparation section strip gains "All sections" (D&D Beyond's quick-jump,
// DDB-060), the same control as the campaign strip, the character sheet and the Table's "All
// panels", because area sections (B40, B41, B47 after B15, B19, B25, B26, B49) no longer fit in
// the strip: at 1440 px "Movimento e griglia" and "Avventure" were off it, on a phone 8 of 11.
// Render-level checks; the browser journey w2b2-shell-journey.js exercises the click, the
// dialog and the navigation.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore, previewMovement } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { beginMovement } from "../combat.mjs";
import { renderPreparation } from "../preparation.mjs";
import * as sceneAssets from "../scene-assets.mjs";
import * as SA from "../scene-assets-domain.mjs";
import * as regions from "../regions.mjs";
import * as RD from "../regions-domain.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
function prep({ lang = "it", tab = "", areas = true } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  if (areas) {
    registry.use("scene-assets", sceneAssets.register);
    registry.use("regions", regions.register);
  }
  const state = createInitialState();
  registry.initState(state);
  const ctx = {
    state,
    registry,
    role: "dm",
    lang,
    view: { page: "preparation", id: "", tab },
    t: (it, en) => (lang === "en" ? en : it),
    label: (value) =>
      value && typeof value === "object" ? (value[lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    canControl: () => true,
    navigate: () => {},
    dialog: () => {},
    closeDialog: () => {},
    commit: () => ({ applied: true, persisted: true }),
  };
  registry.attach(ctx);
  return renderPreparation(ctx);
}

test("the Preparation strip ends with one 'All sections' quick-jump, outside the section list", () => {
  const html = prep();
  const bar = html.match(/<div class="prep-sections-bar">([\s\S]*?)<\/button><\/div>/);
  assert.ok(bar, "the strip and the quick-jump share one bar");
  const [nav, after] = bar[1].split("</nav>");
  assert.match(nav, /data-prep-section="scenes"/);
  assert.match(nav, /data-prep-section="regions"/, "area sections stay in the strip");
  // P7: «Scene avanzate» lives in the core scene list and editor, not as a section of its own.
  assert.doesNotMatch(nav, /data-prep-section="scene-assets"/);
  assert.doesNotMatch(nav, /data-prep-sections-all/);
  assert.match(after, /^<button type="button" class="prep-sections-all" data-prep-sections-all/);
  assert.match(after, /aria-haspopup="dialog" aria-label="Tutte le sezioni della preparazione"/);
  assert.match(after, />Tutte<\/span>$/);
  assert.doesNotMatch(after, /data-prep-section=/, "the quick-jump is not counted as a section");
  assert.equal(html.match(/data-prep-sections-all/g).length, 1);
});

test("the quick-jump is labelled in English and an area section keeps its strip", () => {
  const html = prep({ lang: "en", tab: "regions" });
  assert.match(html, /aria-label="All preparation sections"/);
  assert.match(html, />All<\/span><\/button><\/div>/);
  assert.match(html, /class="active" data-prep-section="regions" aria-current="page"/);
  assert.match(html, /data-ext-slot="preparation-section:regions"/);
});

test("without area sections the Preparation page has neither strip nor quick-jump", () => {
  const html = prep({ areas: false });
  assert.doesNotMatch(html, /prep-sections/);
  assert.doesNotMatch(html, /data-prep-sections-all/);
});

// B47 × B41: the DM archives the crypt (Roll20's scene archive) while the courtyard stairs
// (Foundry Stairways, Owlbear Portals) still lead there. Before the fix Livia was stopped on
// the stairs, asked «Prendi il passaggio», and taking it was refused with «La creatura non è
// più sulla scena» although she stood there.
function tableHarness() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("regions", regions.register);
  registry.use("scene-assets", sceneAssets.register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const commit = (role, fn) => store.commit("w2b2", fn, role, { shared: true });
  const move = (actorId, point) =>
    commit("player", (s) => {
      const preview = previewMovement(s, actorId, point, { role: "player" });
      beginMovement(
        s,
        { id: crypto.randomUUID(), actorId, point, geometryKey: preview.geometryKey },
        "player",
      );
    });
  const livia = (sceneId = "old-watch") =>
    store.state.scenes.find((s) => s.id === sceneId)?.tokens.find((t) => t.actorId === "livia");
  const events = () => RD.sliceOf(store.state).events;
  return { store, commit, move, livia, events };
}

test("a passage whose arrival scene is archived neither stops nor asks; Restore brings it back", () => {
  const h = tableHarness();
  h.commit("dm", (s) => SA.archiveScene(s, "dm", RD.CRYPT_SCENE_ID));
  h.move("livia", { x: 900, y: 560 });
  assert.equal(h.events().length, 0, "no passage question towards an archived scene");
  assert.equal(h.livia().x, 900, "Livia crosses the stairs to where she was going");
  h.commit("dm", (s) => SA.restoreScene(s, "dm", RD.CRYPT_SCENE_ID));
  h.move("livia", { x: 800, y: 560 });
  h.move("livia", { x: 900, y: 560 });
  const passage = h.events().at(-1);
  assert.equal(passage?.status, "awaiting-mover", "the restored crypt is reachable again");
  assert.equal(h.livia().x, 860, "stopped on the stairs");
  h.commit("player", (s) => RD.answerPassage(s, passage.id, true, "player"));
  assert.ok(h.livia(RD.CRYPT_SCENE_ID), "Livia is in the crypt");
});

test("a passage already waiting when its arrival scene is archived is refused with the reason", () => {
  const h = tableHarness();
  h.move("livia", { x: 900, y: 560 });
  const passage = h.events().at(-1);
  assert.equal(passage.status, "awaiting-mover");
  h.commit("dm", (s) => SA.archiveScene(s, "dm", RD.CRYPT_SCENE_ID));
  assert.throws(
    () => h.commit("player", (s) => RD.answerPassage(s, passage.id, true, "player")),
    (error) => /archiviata o eliminata/.test(error.it) && /archived or deleted/.test(error.en),
  );
  assert.ok(h.livia(), "nothing applied: Livia is still in the courtyard");
  h.commit("player", (s) => RD.answerPassage(s, passage.id, false, "player"));
  assert.equal(h.events().at(-1).status, "declined", "«Resta qui» still closes the question");
});
