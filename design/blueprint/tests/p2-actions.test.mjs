// P2 fix package — the sheet's Actions and Extra: weapon chips and attack parts (PG-37),
// custom actions in the list (PG-38), instant favourites (PG-39), limited-use boxes
// (PG-34), Wild Shape from «Usa» (PG-77) and companions on their chosen point (PG-78).
import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./p2-harness.mjs";
import { createInitialState } from "../state.mjs";
import * as D from "../sheet-plus-domain.mjs";
import * as area from "../sheet-plus.mjs";
import * as QB from "../quickbar-domain.mjs";
import * as quickbar from "../quickbar.mjs";
import { LABELS, MASTERY_RULES, WEAPON_PROPERTY_RULES, weaponDefinition } from "../srd-sample.mjs";
import { getEffectiveActor } from "../forms-companions.mjs";

const livia = (h) => getEffectiveActor(h.state.actors.livia);

test("PG-37: every weapon property and mastery has its rule text; rows show the chips", () => {
  assert.deepEqual(
    Object.keys(WEAPON_PROPERTY_RULES).sort(),
    Object.keys(LABELS.weaponProperty).sort(),
  );
  assert.deepEqual(Object.keys(MASTERY_RULES).sort(), Object.keys(LABELS.mastery).sort());
  const staff = weaponDefinition(null, "quarterstaff");
  assert.deepEqual(
    [staff.weapon.properties, staff.weapon.versatile, staff.weapon.mastery],
    [["versatile"], "1d8", "topple"],
  );
  const h = harness();
  const html = area._test.renderActions(h.ctx, livia(h));
  assert.match(html, /data-rule="property:versatile"[^>]*>Versatile 1d8</);
  assert.match(html, /data-rule="mastery:topple"[^>]*>Padronanza: Rovesciamento</);
  h.ctx.lang = "en";
  assert.match(area._test.renderActions(h.ctx, livia(h)), />Mastery: Topple</);
});

test("PG-37: a configured attack names its parts (ability, Proficiency, other bonus)", () => {
  const h = harness({
    setup: (state) => {
      state.actors.doran.abilities.str = 16;
      state.actors.doran.combatProfile = {
        proficiencyBonus: 2,
        meleeAttack: {
          name: { it: "Spada lunga", en: "Longsword" },
          attackBonus: 5,
          damageDice: [{ count: 1, sides: 8 }],
          damageType: "slashing",
          reachMeters: 1.5,
          source: { kind: "authored-demo", revision: "demo" },
        },
      };
    },
  });
  const attack = D.sheetAttacks(h.state, "doran").find((row) => row.id === "melee-attack");
  assert.deepEqual(
    attack.parts.map((part) => [part.label.it, part.value]),
    [
      ["Forza", 3],
      ["Competenza", 2],
    ],
  );
  assert.ok(!attack.parts.some((part) => /Profilo configurato/.test(part.label.it)));
});

test("PG-38: custom actions are in the Actions list, its filters and roll from the sheet", () => {
  const h = harness({
    areas: [
      ["sheet-plus", area.register],
      ["quickbar", quickbar.register],
    ],
  });
  const before = D.actionList(h.state, "livia").length;
  h.ctx.commit("custom", (draft) =>
    QB.saveCustomAction(draft, draft.ext[QB.ID], "player", "livia", {
      name: "Morso del famiglio",
      activation: "bonus",
      attack: { ability: "dex", proficient: true, bonus: 0 },
      damage: { dice: "1d6", type: "piercing", ability: true, bonus: 0 },
      notes: "",
    }),
  );
  const html = area._test.renderActions(h.ctx, livia(h));
  assert.match(html, /data-shp-action="custom:[^"]+"/);
  assert.match(html, /Morso del famiglio/);
  assert.match(
    html,
    new RegExp(`data-filter="all" aria-pressed="true">Tutte <small>${before + 1}</small>`),
  );
  assert.match(html, /data-filter="bonus" aria-pressed="false">Azione bonus <small>2<\/small>/);
  assert.match(html, /data-shp="custom-roll"/, "a roll control on the row");
});

test("PG-39: a favourite rolls at once through the one engine; options stay one click away", () => {
  const h = harness();
  h.ctx.rollDie = () => 11;
  h.ctx.commit("fav", (d) =>
    D.toggleFavorite(d, "livia", { kind: "skill", id: "perception" }, "player"),
  );
  const bar = area._test.renderBar(h.ctx, livia(h));
  assert.match(bar, /data-kind="skill" data-id="perception" data-fav="1"/);
  assert.match(bar, /Clic: tira subito/);
  const record = area.quickRoll(h.ctx, "livia", "skill", "perception");
  assert.equal(record.values[0], 11);
  assert.equal(record.total, 11 + D.statValue(h.state, "livia", "skill:perception").total);
  assert.equal(D.visibleRolls(h.state, "livia", "player", 3)[0].id, record.id);
  assert.equal(h.dialogs.length, 0, "no dialog on a plain click");
});

test("PG-34: limited uses are boxes; spending and resetting stay within the maximum", () => {
  const actor = { features: [{ id: "f", name: "X", max: 2, used: 0 }] };
  area.setFeatureUsed(actor, "f", 2);
  assert.equal(actor.features[0].used, 2);
  assert.throws(() => area.setFeatureUsed(actor, "f", 3), /massimo|maximum/i);
  area.setFeatureUsed(actor, "f", 0);
  assert.equal(actor.features[0].used, 0);
  const ctx = harness().ctx;
  const pips = area.usePips(ctx, "f", { used: 1, max: 2 }, true, "X");
  assert.equal((pips.match(/data-shp="pip"/g) ?? []).length, 2);
  assert.match(pips, /class="shp-pip is-spent"[^>]*aria-pressed="true"/);
});

test("PG-77: «Usa» on Wild Shape opens the form picker; no Wild Shape for a wizard", async () => {
  const { renderFormsSummary } = await import("../forms-ui.mjs");
  const h = harness({ view: { page: "characters", id: "mira", tab: "actions" } });
  h.ctx.openForms = (id, tab) => (h.ctx.opened = { id, tab });
  const mira = getEffectiveActor(h.state.actors.mira);
  const html = area._test.renderActions(h.ctx, mira);
  assert.match(html, /data-shp="wild-shape"/, "Transform instead of a bare «Usa»");
  const livia = renderFormsSummary(h.ctx, "livia");
  assert.doesNotMatch(livia, /data-forms-tab="forms"/, "a wizard gets no Wild Shape block");
  assert.match(renderFormsSummary(h.ctx, "mira"), /data-forms-tab="forms"/);
  // The return names the form it leaves and the one it goes back to.
  const forms = await import("../forms-companions.mjs");
  const s = createInitialState();
  forms.initializeFormsCompanions(s);
  const mira2 = s.actors.mira;
  mira2.tempHp = 0;
  mira2.features.find((f) => f.id === mira2.formsProfile.wildShapeFeatureId).used = 0;
  const choice = {
    profileId: "srd2024:wolf",
    tempHpChoice: "replace",
    equipment: mira2.inventory
      .filter((i) => i.quantity > 0)
      .map((i) => ({ itemId: i.id, disposition: "merge" })),
  };
  const p = forms.previewWildShape(s, "mira", choice, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  forms.applyWildShape(s, "mira", choice, "player", {
    operationId: "pg77",
    reviewKey: p.reviewKey,
  });
  const back = forms.previewFormReturn(s, "mira", { mode: "normal" }, "player");
  const row = back.changes.find((c) => c.field === "form");
  assert.deepEqual([row.before.it, row.after.it], ["Lupo", "Mira, forma originale"]);
});

test("PG-78: a companion appears at once on the point chosen while creating it", async () => {
  const forms = await import("../forms-companions.mjs");
  const { placeAtChosenPoint } = await import("../companion-map.mjs");
  const s = createInitialState();
  const choice = { mode: "manual", name: "Gatto", profileId: "srd2024:cat" };
  const preview = forms.previewCompanionCreation(s, "livia", choice, "player");
  const { actorId } = forms.createCompanion(s, "livia", choice, "player", {
    operationId: "pg78-cat",
    reviewKey: preview.reviewKey,
  });
  const scene = s.scenes.find((row) => row.id === s.activeSceneId);
  const placed = placeAtChosenPoint(
    s,
    actorId,
    { kind: "map", sceneId: scene.id, point: { x: 300, y: 380 } },
    "player",
  );
  assert.equal(placed.actorId, actorId);
  const token = scene.tokens.find((row) => row.actorId === actorId);
  assert.deepEqual([token.x, token.y], [300, 380]);
  assert.equal(
    placeAtChosenPoint(
      s,
      actorId,
      { kind: "map", sceneId: scene.id, point: { x: 1, y: 1 } },
      "player",
    ),
    null,
    "never a second token",
  );
  assert.equal(
    placeAtChosenPoint(s, actorId, { kind: "attested", confirmed: true }, "player"),
    null,
  );
});
