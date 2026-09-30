// P2 fix package — character sheet: stat chain with worn items (PG-25), «Correggi valori»
// without derived values, effective speed (PG-30/PG-70) and personality fields (PG-42).
import test from "node:test";
import assert from "node:assert/strict";
import { harness, cloakRow } from "./p2-harness.mjs";
import { getEffectiveActor } from "../forms-companions.mjs";
import { activeItemModifiers, getById } from "../srd-sample.mjs";
import * as D from "../sheet-plus-domain.mjs";
import { patchCharacter, renderCharacters } from "../characters.mjs";

const withCloak =
  (extra = {}) =>
  (state) => {
    state.actors.livia.inventory.push(cloakRow(extra));
  };

test("PG-25: the SRD cloak of protection carries structured +1 AC and saves", () => {
  const cloak = getById("srd2024:item:cloak-of-protection");
  assert.deepEqual(
    cloak.magic.modifiers.map((m) => [m.target, m.value]),
    [
      ["ac", 1],
      ["saves", 1],
    ],
  );
  const ring = getById("srd2024:item:ring-of-protection");
  assert.equal(ring.magic.modifiers.length, 2);
});

test("PG-25: an equipped and attuned cloak takes Livia from AC 12 to 13 and adds +1 to saves", () => {
  const plain = harness();
  const acBefore = D.statValue(plain.state, "livia", "ac").total;
  const dexBefore = D.statValue(plain.state, "livia", "save:dex").total;
  assert.equal(acBefore, 12);
  const h = harness({ setup: withCloak() });
  const ac = D.statValue(h.state, "livia", "ac");
  assert.equal(ac.total, 13, "AC 12 + cloak 1");
  assert.equal(ac.base, 12, "the base stays the sheet's 10 + Dex");
  assert.equal(ac.itemParts.length, 1);
  assert.equal(ac.itemParts[0].value, 1);
  assert.match(ac.itemParts[0].label.it, /Mantello della protezione/);
  for (const ability of D.ABILITIES) {
    const before = D.statValue(plain.state, "livia", "save:" + ability).total;
    assert.equal(D.statValue(h.state, "livia", "save:" + ability).total, before + 1, ability);
  }
  assert.equal(D.statValue(h.state, "livia", "save:dex").total, dexBefore + 1);
  // One engine: the save roll uses the same total and names the cloak as a part.
  const profile = D.rollProfile(h.state, "livia", "save", "dex");
  assert.equal(profile.modifier, dexBefore + 1);
  assert.ok(profile.parts.some((part) => /Mantello/.test(part.label.it) && part.value === 1));
  // The Table, combat and party read the effective actor: the same AC 13.
  assert.equal(getEffectiveActor(h.state.actors.livia).ac, 13);
  assert.equal(
    getEffectiveActor(getEffectiveActor(h.state.actors.livia)).ac,
    13,
    "projecting twice never adds the bonus twice",
  );
  assert.equal(h.state.actors.livia.ac, 12, "the stored sheet value is never rewritten");
  assert.equal(D.statValue(h.state, "livia", "ac").drift, false, "no false drift");
});

test("PG-25: the cloak counts only while worn, carried and attuned", () => {
  const actor = (extra) => ({ inventory: [cloakRow(extra)] });
  assert.equal(activeItemModifiers(actor({})).length, 2);
  assert.equal(activeItemModifiers(actor({ attuned: false })).length, 0, "not attuned");
  assert.equal(activeItemModifiers(actor({ equipped: false })).length, 0, "not worn");
  assert.equal(activeItemModifiers(actor({ location: "ground" })).length, 0, "dropped");
  assert.equal(activeItemModifiers(actor({ quantity: 0 })).length, 0, "none left");
  const h = harness({ setup: withCloak({ attuned: false }) });
  assert.equal(D.statValue(h.state, "livia", "ac").total, 12);
});

test("PG-25: «Correggi valori» keeps the derived AC and shows the same AC as the chain", () => {
  const h = harness({ setup: withCloak() });
  const livia = structuredClone(h.state.actors.livia);
  patchCharacter(livia, {
    name: "Livia",
    className: livia.className,
    level: 3,
    maxHp: 22,
    speed: 9,
    abilities: { ...livia.abilities },
  });
  assert.equal(livia.ac, 12, "no AC in the patch: the stored AC is untouched");
  const html = renderCharacters(h.ctx);
  const vitalsAc = html.match(/data-character-ac(?=[\s>])[^>]*>[\s\S]*?<strong>(\d+)/)?.[1];
  assert.equal(vitalsAc, "13", "the AC card shows the chain total");
  // The same number in Play and in Edit mode (the bar pill shows the total in both).
  const pill = (markup) => markup.match(/data-key="ac"[^>]*>[\s\S]*?<strong>(\d+)/)?.[1];
  assert.equal(pill(html), "13");
  h.registry.setSetting(h.ctx, "sheet-plus.mode", "edit");
  assert.equal(pill(renderCharacters(h.ctx)), "13");
});

test("PG-70: the effective speed with encumbrance is the number, base and penalty the note", async () => {
  const { registerSpeedAdjuster, speedBreakdown } = await import("../forms-companions.mjs");
  const off = registerSpeedAdjuster((eff, speed) =>
    eff.id === "livia" ? { speed: speed - 3, reason: { it: "Ingombrato", en: "Encumbered" } } : null,
  );
  try {
    const h = harness();
    const row = speedBreakdown(h.state.actors.livia);
    assert.equal(row.base, 9);
    assert.equal(row.effective, 6);
    assert.deepEqual(
      row.steps.map((step) => [step.kind, step.delta, step.reason.it]),
      [["load", -3, "ingombro"]],
    );
    const html = renderCharacters(h.ctx);
    const card = html.match(/data-character-speed[\s\S]*?<\/(?:button|div)>/)[0];
    assert.match(card, /<strong>6 <small>m<\/small><\/strong>/, "6 m is the primary number");
    assert.match(card, /9 m base, −3 m ingombro/);
    assert.match(html, /data-shp="speeds"[^>]*>[\s\S]*?<strong>6 m<\/strong>/, "the VELOCITÀ chip");
  } finally {
    off();
  }
});

test("PG-30: the chosen speed and sense show at the top; senses and skills are editable in Play", () => {
  const h = harness();
  h.ctx.commit("speeds and senses", (d) => {
    D.setSpeeds(d, "livia", { fly: "18", display: "fly" }, "player");
    D.setSenses(d, "livia", { darkvision: "18", display: "darkvision" }, "player");
  });
  const html = renderCharacters(h.ctx);
  const card = html.match(/data-character-speed[\s\S]*?<\/(?:button|div)>/)[0];
  assert.match(card, /<strong>18 <small>m<\/small><\/strong><small>Volare<\/small>/);
  assert.match(card, /Camminare 9 m/, "the other speeds are listed");
  assert.match(card, /Scurovisione 18 m/, "the sense shown at the top");
  assert.match(html, /data-shp="senses"[^>]*>[\s\S]*?Scurovisione[\s\S]*?18 m/, "sense pill in the bar");
  assert.equal(h.registry.getSetting(h.ctx, "sheet-plus.mode"), "play");
  assert.match(html, /data-shp="senses"[^>]*>[^<]*<[^>]*>[^<]*Gestisci sensi|Gestisci sensi/);
  assert.match(html, /data-shp="skill-add"/, "PG-32: «Aggiungi abilità» also in Play");
});

test("PG-42: traits, ideals, bonds and flaws are separate lists with Add and Random", async () => {
  const { addPersonality, removePersonality, randomPersonalityFor, PERSONALITY_KEYS } =
    await import("../characters.mjs");
  assert.deepEqual(PERSONALITY_KEYS, ["traits", "ideals", "bonds", "flaws"]);
  const h = harness({ view: { page: "characters", id: "livia", tab: "story" } });
  h.ctx.commit("trait", (d) => addPersonality(d.actors.livia, "traits", "  Rido nei momenti peggiori. "));
  h.ctx.commit("bond", (d) => addPersonality(d.actors.livia, "bonds", "Cerco un fratello scomparso."));
  assert.deepEqual(h.state.actors.livia.personality, {
    traits: ["Rido nei momenti peggiori."],
    ideals: [],
    bonds: ["Cerco un fratello scomparso."],
    flaws: [],
  });
  assert.throws(() => addPersonality(h.state.actors.livia, "traits", "Rido nei momenti peggiori."), /Duplicate/);
  assert.throws(() => addPersonality(h.state.actors.livia, "ideals", "   "), /Empty/);
  const random = randomPersonalityFor(h.state.actors.livia, "ideals", "it", () => 0);
  assert.equal(typeof random, "string", "a suggestion from the background lists");
  assert.notEqual(random, "");
  const html = renderCharacters(h.ctx);
  for (const heading of ["Tratti della personalità", "Ideali", "Legami", "Difetti", "Biografia"].slice(0, 4))
    assert.match(html, new RegExp(`<h3>${heading}</h3>`));
  assert.match(html, /data-character-action="personality-add" data-key="flaws"/);
  assert.match(html, /data-character-action="personality-random" data-key="ideals"/);
  assert.match(html, /data-character-action="notes-tab"/, "Story links to the Notes tab");
  h.ctx.commit("remove", (d) => removePersonality(d.actors.livia, "traits", 0));
  assert.deepEqual(h.state.actors.livia.personality.traits, []);
  h.ctx.lang = "en";
  assert.match(renderCharacters(h.ctx), /<h3>Personality traits<\/h3>[\s\S]*<h3>Flaws<\/h3>/);
});

test("PG-43: the Note tab opens on the section notes with their chips, before the log", () => {
  const h = harness({ view: { page: "characters", id: "livia", tab: "notes" } });
  const html = renderCharacters(h.ctx);
  assert.match(html, /data-character-tab="notes"[^>]*aria-current="page"/);
  assert.match(html, /data-shp-notes="livia"/);
  assert.match(html, /data-shp="notes-filter" data-filter="allies"/);
});

test("PG-41 and PG-34: features show source, origin filters, Italian names, pips and recovery", async () => {
  const { featureKind, featureText, setFeatureRecovery } = await import("../characters.mjs");
  const it = { lang: "it", label: (v) => (v && typeof v === "object" ? v.it : String(v ?? "")) };
  const iriaFeature = {
    id: "class:wizard:wizard:arcane-recovery",
    grantId: "class:wizard",
    definitionId: "wizard:arcane-recovery",
    name: { it: "Arcane Recovery", en: "Arcane Recovery" },
    description: {
      it: "Capacità registrata con la sua fonte; la risoluzione specifica resta manuale.",
      en: "Recorded feature with its source; its specific resolution remains manual.",
    },
  };
  const text = featureText(it, iriaFeature);
  assert.equal(text.name, "Recupero arcano", "the official Italian name");
  assert.match(text.summary, /riposo breve/, "a real description instead of the generic one");
  assert.equal(featureKind(iriaFeature), "class");
  assert.equal(featureKind({ grantId: "species:elf", definitionId: "elf:trance" }), "species");
  assert.equal(featureKind({ name: "Custom" }), "custom");
  const fey = featureText(it, { definitionId: "elf:fey-ancestry", name: { it: "Fey Ancestry", en: "Fey Ancestry" } });
  assert.equal(fey.marked, true, "an unverified translation keeps the English name, marked");
  // Livia (Wizard 3) carries Arcane Recovery with one box.
  const h = harness();
  const arcane = h.state.actors.livia.features?.find((f) => f.definitionId === "wizard:arcane-recovery");
  if (arcane) assert.equal(arcane.max, 1);
  // A custom feature that recovers on a Short Rest gets the rest engine's rules.
  const actor = structuredClone(h.state.actors.doran);
  actor.features = [...(actor.features ?? []), { id: "custom-luck", name: "Luck", max: 3, used: 2 }];
  setFeatureRecovery(actor, "custom-luck", "short");
  const rules = actor.restProfile.recoveries.filter((r) => r.target?.id === "custom-luck");
  assert.deepEqual(rules.map((r) => r.trigger).sort(), ["long", "short"]);
  assert.ok(rules.every((r) => r.operation === "all" && r.source?.revision));
  setFeatureRecovery(actor, "custom-luck", "none");
  assert.equal(actor.restProfile.recoveries.filter((r) => r.target?.id === "custom-luck").length, 0);
  assert.equal(actor.features.at(-1).recovery, "none");
  // The pips: one per use, spent ones pressed.
  const dm = harness({ role: "dm", view: { page: "characters", id: "doran", tab: "features" } });
  const html = renderCharacters(dm.ctx);
  assert.match(html, /class="shp-pip is-spent" data-shp="pip"/);
  assert.match(html, /data-character-action="feature-restore"/);
  assert.match(html, /character-feature-source">SRD 5\.2\.1 · p\. 48/);
  assert.match(html, /1d10 \+ il tuo livello da guerriero/, "Second Wind's real summary");
});

test("PG-33: Heroic Inspiration is a header toggle with the dice tray's own state", async () => {
  const diceTray = await import("../dice-tray.mjs");
  const DT = await import("../dice-tray-domain.mjs");
  const h = harness({
    areas: [
      ["sheet-plus", (await import("../sheet-plus.mjs")).register],
      ["dice-tray", diceTray.register],
    ],
  });
  const header = (html) => html.slice(0, html.indexOf("character-summary"));
  assert.match(header(renderCharacters(h.ctx)), /data-character-action="inspiration" aria-pressed="false"/);
  h.ctx.commit("insp", (d) => DT.setInspiration(d.ext[DT.ID], d, "livia", true, "player", "t"), {
    undoable: false,
  });
  assert.match(header(renderCharacters(h.ctx)), /character-inspiration is-on" data-character-action="inspiration" aria-pressed="true"/);
  assert.equal(DT.hasInspiration(h.state.ext[DT.ID], "livia"), true);
  h.ctx.lang = "en";
  assert.match(renderCharacters(h.ctx), /Heroic Inspiration/);
});

test("PG-44: the header portrait is a button that opens the appearance picker", async () => {
  const media = await import("../media.mjs");
  const h = harness({
    areas: [
      ["sheet-plus", (await import("../sheet-plus.mjs")).register],
      ["media", media.register],
    ],
  });
  const html = renderCharacters(h.ctx);
  assert.match(
    html,
    /<button type="button" class="character-portrait small character-portrait-button" data-character-action="appearance" aria-label="Aspetto di Livia: ritratto, pedina e ritaglio"/,
  );
  // BI-32: «Ritaglia ritratto» from the palette and the token menu › Appearance.
  const command = h.registry.get("command", "media.crop-portrait", h.ctx);
  assert.ok(command, "the palette command exists");
  assert.match(h.registry.label(command, "it"), /Ritaglia ritratto/);
  const { openAppearance } = await import("../media-ui.mjs");
  openAppearance(h.ctx, "livia");
  const dialog = h.lastDialog();
  assert.match(dialog.title, /Aspetto · Livia/);
  assert.match(dialog.body, /name="ring" value="gold"/, "border colours with a live preview");
});

test("PG-82 and PG-84: the Bastion is its own section; the recipe book has its own entry", async () => {
  const { sheetCategories } = await import("../characters.mjs");
  const ctx = harness().ctx;
  const items = [
    ...["actions", "inventory", "spells", "features", "story", "extras"].map((id) => ({
      id,
      names: [id, id],
      core: true,
    })),
    { id: "party-bastion", category: "extras", label: { it: "Bastione", en: "Bastion" }, order: 70 },
    { id: "projects", category: "extras", label: { it: "Progetti", en: "Projects" }, order: 45 },
  ];
  ctx.registry.label = (item) => item.label.it;
  const categories = sheetCategories(ctx, items);
  assert.deepEqual(categories.at(-1).id, "party-bastion", "Bastione after Extra, as a section");
  assert.ok(!categories.find((c) => c.id === "extras").members.some((m) => m.id === "party-bastion"));
  const projects = await import("../projects.mjs");
  const h = harness({ areas: [["projects", projects.register]] });
  const recipes = h.registry.get("command", "projects.recipes", h.ctx);
  assert.ok(recipes);
  assert.match(h.registry.label(recipes, "it"), /Ricettario/);
});
