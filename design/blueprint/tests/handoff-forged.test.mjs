// Hand-off of audit round 2 (R1 → R6, BI-24): a forged weapon copy carries its weapon (base
// slug, SRD base weapon with the forge's damage, properties and mastery), as a catalogue row
// does (party-stash itemFromCatalog), so the Inventory area (B36) and the Table's thrown and
// mastery rules (B40) list a forged bow with its ammunition and a forged dagger as thrown.
// FG Forge, dnd5e Enchant. It never takes the base's srdId, so it never stacks with a plain
// copy. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as hb from "../homebrew.mjs";
import * as D from "../homebrew-editor-domain.mjs";
import { rowWeapon } from "../srd-sample.mjs";
import { catalogWeapon } from "../special-moves-domain.mjs";
import { harness } from "./p8-harness.mjs";

function forge(h, baseId, id) {
  const forged = D.forgeItem(baseId, ["weapon-plus-1"]);
  let ref;
  h.store.commit(
    "fixture: forged weapon",
    (state) => {
      hb.createHomebrewDraft(state, { id, kind: "create", type: forged.type }, "dm");
      hb.saveHomebrewDraft(state, id, { data: forged.data }, "dm");
      ref = D.saveContent(state, id, "dm").ref;
    },
    "dm",
  );
  return hb.materializeHomebrewCopy(h.store.state, ref, "dm", { id: id + "-row" }).row;
}

test("BI-24: a forged shortbow +1 is a ranged weapon with its ammunition; a forged dagger is thrown", () => {
  const h = harness();
  h.as("dm");
  const bow = forge(h, "srd2024:item:shortbow", "forged-bow");
  assert.equal(bow.weaponType, "shortbow");
  assert.equal(bow.weapon.type, "ranged");
  assert.equal(bow.weapon.ammunition, "arrow");
  assert.equal(bow.weapon.damage.dice, "1d6");
  assert.equal(bow.srdId ?? null, null, "never the base's srdId (no stacking with a plain bow)");
  assert.equal(catalogWeapon(bow).type, "ranged");
  assert.equal(rowWeapon(bow, h.store.state.library).weapon.type, "ranged");
  const dagger = forge(h, "srd2024:item:dagger", "forged-dagger");
  assert.ok(catalogWeapon(dagger).properties.includes("thrown"), "thrown, as the SRD dagger");
  assert.deepEqual(dagger.weapon.range, { normal: 20, long: 60 });
});
