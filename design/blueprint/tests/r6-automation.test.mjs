// R6 C11 (after R1 BI-18 and BI-24): the homebrew editor declares what the roll engine now
// applies — a homebrew Advantage/Disadvantage without a written condition and a forged
// weapon's attack and damage bonus — as automated, instead of manual lines.
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../homebrew-editor-domain.mjs";
import { homebrewRollModes } from "../sheet-plus-domain.mjs";
import { activeItemModifiers } from "../srd-sample.mjs";

test("C11: a forged weapon's bonus and an unconditional roll mode are «Automazione completa»", () => {
  assert.equal(typeof homebrewRollModes, "function", "R1's roll modes are in the engine");
  assert.equal(typeof activeItemModifiers, "function", "R1's item modifiers are in the engine");
  const weapon = D.emptyStructured("weapon");
  weapon.item.weapon.attackBonus = 1;
  weapon.item.weapon.damageBonus = 1;
  const forged = D.automationOf("weapon", weapon);
  assert.ok(
    forged.automated.some((a) =>
      /Bonus dell’arma aggiunto al tiro per colpire e ai danni/.test(a.it),
    ),
  );
  assert.ok(!forged.manual.some((m) => /Bonus dell’arma/.test(m.it)));
  assert.equal(forged.level, "full");
  const feat = {
    ...D.emptyStructured("feat"),
    modifiers: [D.newModifier("save:dex", "advantage", 1)],
  };
  const modes = D.automationOf("feat", feat);
  assert.equal(modes.level, "full");
  assert.match(
    modes.automated.map((a) => a.en).join(" "),
    /Advantage or Disadvantage applied to the roll/,
  );
});
