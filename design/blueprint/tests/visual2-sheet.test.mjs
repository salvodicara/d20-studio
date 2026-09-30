// Visual pass 2 (30/09/2026), surface «sheet»: the character sheet laid out as D&D Beyond's
// desktop sheet (top band, left columns, strip over the tabs), its phone pages, and the
// «My Characters» card footer. Structure only; the look is checked in the browser.
import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./p2-harness.mjs";
import { renderCharacters } from "../characters.mjs";
import { applyVitalityEvent } from "../conditions.mjs";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as L from "../character-library.mjs";
import * as sheetPlus from "../sheet-plus.mjs";
import * as diceTray from "../dice-tray.mjs";
import { useSampleClock } from "../sample-clock.mjs";

useSampleClock(() => Date.parse("2026-09-21T12:00:00Z"));

const at = (html, needle) => {
  const index = html.indexOf(needle);
  assert.ok(index >= 0, `missing ${needle}`);
  return index;
};

test("the sheet reads band, left columns, strip, tabs, content in document order", () => {
  const h = harness({
    areas: [
      ["sheet-plus", sheetPlus.register],
      ["dice-tray", diceTray.register],
    ],
  });
  const html = renderCharacters(h.ctx);
  const band = at(html, 'class="character-band');
  const abilities = at(html, 'class="shp-abilities"');
  const pb = at(html, 'data-shp-stat="pb"');
  const speed = at(html, "data-character-speed");
  const inspiration = at(html, 'data-character-action="inspiration"');
  const hp = at(html, 'class="stat character-hp"');
  const side = at(html, 'class="character-side"');
  const initiative = at(html, 'data-shp-stat="initiative"');
  const ac = at(html, 'data-shp-stat="ac"');
  const defenses = at(html, 'data-shp-stat="defenses"');
  const conditions = at(html, "character-conditions");
  const tabs = at(html, "character-tabs-bar");
  const content = at(html, "character-tab-content");
  const order = [band, abilities, pb, speed, inspiration, hp, side, initiative, ac, defenses];
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
    "D&D Beyond's reading order (Initiative before Armor Class)",
  );
  assert.ok(defenses < conditions && conditions < tabs && tabs < content);
  // The saves, senses, training and skills sit in the left columns, not in the Actions tab.
  assert.ok(at(html, "data-shp-derived") < initiative);
  assert.match(html, /Competenze e addestramento/);
  assert.match(html, /<dt>Lingue<\/dt><dd>Comune, Elfico, Draconico<\/dd>/);
});

test("Armor Class, speed and the chosen sense show once; the duplicates stay hidden hooks", () => {
  const html = renderCharacters(harness().ctx);
  assert.match(
    html,
    /data-character-ac hidden|data-character-ac data-character-action="ac-detail"[^>]*hidden/,
  );
  assert.match(html, /data-shp-stat="speed" hidden/);
  assert.doesNotMatch(html, /data-shp-stat="passive"/, "Passive Perception lives in Senses");
  assert.match(html, /data-shp="stat" data-key="passive-perception"/);
  assert.doesNotMatch(html, /class="shp-defense-list"/, "Defenses live in the strip");
});

test("turn resources head the Actions tab only, as BG3's symbols with the state in words", () => {
  const h = harness();
  const actions = renderCharacters(h.ctx);
  assert.match(actions, /class="character-turn" role="group" aria-label="Risorse del turno"/);
  assert.match(
    actions,
    /character-resource is-action"><svg[^>]*>[\s\S]*?Azione<span class="visually-hidden">: disponibile/,
  );
  h.ctx.view = { page: "characters", id: "livia", tab: "spells" };
  assert.doesNotMatch(renderCharacters(h.ctx), /class="character-turn"/);
});

test("the Conditions box is in the strip; at 0 HP the death saves move into the HP box", () => {
  const h = harness();
  let html = renderCharacters(h.ctx);
  const box = html.slice(at(html, "character-conditions"), at(html, "character-tabs-bar"));
  assert.match(box, /data-conditions-entry="livia"/);
  assert.match(box, /data-conditions-exhaustion-level="1"/);
  h.ctx.commit("down", (d) =>
    applyVitalityEvent(d, {
      eventId: "v2-down",
      actorId: "livia",
      kind: "damage",
      amount: 30,
      source: { kind: "authored-demo", revision: "visual2" },
    }),
  );
  html = renderCharacters(h.ctx);
  assert.doesNotMatch(html, /character-conditions/);
  const hp = html.slice(at(html, 'class="stat character-hp"'), at(html, 'class="character-body'));
  assert.match(hp, /data-conditions-summary="livia"/);
  assert.equal([...html.matchAll(/data-conditions-entry="livia"/g)].length, 1);
});

test("phone pages: «Caratteristiche» and «Abilità» join the strip; the open page is marked alone", () => {
  const h = harness();
  let html = renderCharacters(h.ctx);
  assert.match(html, /data-character-page="tab"/);
  assert.match(html, /class="active" data-character-tab="actions" aria-current="page"/);
  h.ctx.view = { page: "characters", id: "livia", tab: "abilities" };
  html = renderCharacters(h.ctx);
  assert.match(html, /data-character-page="abilities"/);
  assert.match(
    html,
    /class="character-page-tab active" data-character-page-tab="abilities" aria-current="page">Caratteristiche/,
  );
  assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1);
  assert.match(html, /class="is-fallback" data-character-tab="actions"/);
  // The category strip itself keeps only the categories as [data-character-tab].
  const strip = html.slice(at(html, 'character-tabs"'), at(html, "character-tabs-all"));
  assert.doesNotMatch(strip, /data-character-tab="abilities"/);
});

function libraryContext(role = "player") {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  const registry = createRegistry({ logger: null, document: null, deviceStorage: storage });
  registry.use("character-library", L.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  return {
    role,
    lang: "it",
    view: { page: "characters", id: "", tab: "" },
    get state() {
      return store.state;
    },
    registry,
    esc,
    icon,
    t: (it, en) => it ?? en,
    label: (value) =>
      typeof value === "object" && value ? value.it || value.en || "" : String(value ?? ""),
    canControl: (actor) => canControlActor(actor, role, store.state),
  };
}

test("«My Characters» cards: footer text links in D&D Beyond's order, Delete in red, no gold button", () => {
  const html = L.renderLibraryPage(libraryContext());
  const card = html.slice(html.indexOf('data-clib-card="livia"'));
  const footer = card.slice(card.indexOf('class="clib-actions"'), card.indexOf("</article>"));
  assert.doesNotMatch(footer, /button primary/);
  const order = [
    'data-character-action="open"',
    'data-clib-act="manage"',
    'data-clib-act="copy"',
    'data-clib-act="delete"',
  ].map((n) => footer.indexOf(n));
  assert.ok(
    order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1])),
    JSON.stringify(order),
  );
  assert.match(footer, /class="text-button clib-link is-danger" data-clib-act="delete"/);
  assert.match(
    card,
    /<p class="clib-campaign">Campagna: <strong>Le lanterne di Bruma<\/strong><\/p>/,
  );
  L.resetLibraryView();
});
