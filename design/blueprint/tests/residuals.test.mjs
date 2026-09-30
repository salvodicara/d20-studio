// Residuals of re-audit 3 (29/09/2026), closed by one writer: PG-53 (D&D Beyond source
// toggles: a 2014-only view), BI-24 (a forged weapon attacks with the Proficiency Bonus),
// TV-59 (Mob Attack Tool: the group turn applies at once when turned on during the leader's
// turn), TV-52 (Improved Initiative / DDB: one roll or separate rolls for identical placed
// creatures). The real store, registry and areas; synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { AMBUSH_SCENE_ID, AMBUSH_GOBLINS } from "../state.mjs";
import { listActions } from "../combat.mjs";
import * as hb from "../homebrew.mjs";
import * as HD from "../homebrew-editor-domain.mjs";
import * as SP from "../spells-plus.mjs";
import * as L from "../character-library.mjs";
import * as IP from "../inventory-plus.mjs";
import * as loot from "../loot.mjs";
import * as tracker from "../combat-tracker.mjs";
import * as TD from "../combat-tracker-domain.mjs";
import { initiativeKeyOf } from "../encounter-builder-domain.mjs";
import { harness, memory } from "./p4-harness.mjs";
import { harness as hbHarness } from "./p8-harness.mjs";

// ---------------------------------------------------------------- PG-53

test("PG-53: with «SRD 2024» off and «Legacy 2014» on, the 2014 rows stand on their own", () => {
  const h = harness({
    role: "player",
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
    ],
    view: { page: "characters", id: "livia", tab: "spells" },
  });
  const panel = SP.spellsPanel(h.ctx, "livia");
  panel.manage = true;
  panel.tab = "class";
  panel.mSources = ["srd", "homebrew", "legacy"];
  SP.handleSpellsAction(h.ctx, "livia", "source", { source: "srd" });
  const page = SP.renderClassList(h.ctx, "livia", { allowed: true, reason: null });
  assert.doesNotMatch(page, /Nessuna magia con questi filtri/);
  assert.doesNotMatch(page, /data-spl-class-row=/, "no 2024 row");
  const at = page.indexOf('data-spl-legacy-row="fire-bolt"');
  assert.ok(at >= 0, "Fire Bolt 2014 is listed");
  const row = page.slice(at, page.indexOf("</li>", at));
  assert.match(row, /Legacy 2014/);
  assert.match(row, /Preferisci la 2014/);
  // The 2014-only view still lets the spell be learned or prepared (DDB «Prepare»).
  assert.match(row, /data-spl="(learn|toggle|add-book|transcribe)"|Conosciuto|Sempre preparata/);
  assert.match(page, /data-spl-legacy-attribution/);
  // Both chips off: the honest empty line.
  SP.handleSpellsAction(h.ctx, "livia", "source", { source: "legacy" });
  assert.match(
    SP.renderClassList(h.ctx, "livia", { allowed: true, reason: null }),
    /Nessuna magia con questi filtri/,
  );
});

// ---------------------------------------------------------------- BI-24

test("BI-24: a forged Longsword +1 equipped by Doran (Fighter 3, STR 10) attacks at +3", () => {
  const h = hbHarness();
  h.as("dm");
  const forged = HD.forgeItem("srd2024:item:longsword", ["weapon-plus-1"]);
  let ref;
  h.store.commit(
    "fixture: forged longsword",
    (state) => {
      hb.createHomebrewDraft(state, { id: "forged-ls", kind: "create", type: forged.type }, "dm");
      hb.saveHomebrewDraft(state, "forged-ls", { data: forged.data }, "dm");
      ref = HD.saveContent(state, "forged-ls", "dm").ref;
    },
    "dm",
  );
  const row = hb.materializeHomebrewCopy(h.store.state, ref, "dm", { id: "ls-row" }).row;
  h.store.commit(
    "fixture: Doran equips it",
    (state) => {
      const doran = state.actors.doran;
      for (const item of doran.inventory ?? []) item.equipped = false;
      doran.inventory = [...(doran.inventory ?? []), { ...row, quantity: 1, equipped: true }];
    },
    "dm",
  );
  const attack = listActions(h.store.state, "doran").find((a) => a.itemId === "ls-row");
  assert.ok(attack, "the forged sword is an attack");
  const bonus = (attack.itemBonuses ?? [])
    .filter((b) => b.target === "attack")
    .reduce((sum, b) => sum + b.value, 0);
  assert.equal(attack.attackModifier, 2, "Strength +0 and Proficiency +2 (SRD 5.2.1)");
  assert.equal(attack.attackModifier + bonus, 3, "+3 with the weapon's +1");
  assert.ok(attack.attackParts.some((p) => p.value === 2 && /Competenza/.test(p.label.it)));
  assert.equal(attack.damageModifier, 0, "damage: Strength only, the +1 travels as a bonus");
});

// ---------------------------------------------------------------- TV-59 and TV-52

const setup = (role = "dm") =>
  harness({
    role,
    areas: [
      ["loot", loot.register],
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
      ["combat-tracker", tracker.register],
    ],
  });
function startAmbush(h, naturals = {}) {
  h.ctx.role = "dm";
  h.ctx.commit("setup", (s) => {
    const rows = TD.startCandidates(s, AMBUSH_SCENE_ID);
    const natural = {
      "goblin-warrior-a": 18,
      "goblin-warrior-b": 18,
      livia: 5,
      doran: 4,
      mira: 3,
      ...naturals,
    };
    for (const row of rows) {
      row.included = true;
      row.natural = natural[row.actorId];
      row.bonus = 0;
    }
    TD.startFromTable(s, AMBUSH_SCENE_ID, rows, "dm");
  });
}
const currentId = (h) => h.store.state.combat.order[h.store.state.combat.turn];

test("TV-59: the group turn turned on during goblin A's turn applies at once (Mob Attack Tool)", () => {
  const h = setup();
  startAmbush(h);
  assert.equal(currentId(h), AMBUSH_GOBLINS[0]);
  h.ctx.commit("Regola della casa", (s) =>
    TD.setGroupTurns(
      s,
      TD.sliceOf(s),
      true,
      { title: "Turno di gruppo", text: "I goblin uguali agiscono insieme." },
      "dm",
    ),
  );
  const s = h.store.state;
  assert.deepEqual(TD.sliceOf(s).combat.groupTurn?.memberIds, AMBUSH_GOBLINS);
  assert.equal(TD.sharesGroupTurn(s, AMBUSH_GOBLINS[1]), true, "B acts in this turn");
  const { attackers } = TD.mobCandidates(s, TD.sliceOf(s), "dm");
  assert.deepEqual(
    attackers.map((a) => a.actorId),
    AMBUSH_GOBLINS,
  );
  // The dialog no longer says the house rule is needed.
  tracker.openMobAttack?.(h.ctx);
  const body = h.dialogs.at(-1)?.body ?? "";
  if (body) assert.doesNotMatch(body, /serve la regola della casa/);
});

test("TV-59: turned on during another creature's turn, the group starts at the leader's next turn", () => {
  const h = setup();
  startAmbush(h, { "goblin-warrior-a": 2, "goblin-warrior-b": 2, livia: 19 });
  assert.equal(currentId(h), "livia");
  h.ctx.commit("Regola della casa", (s) =>
    TD.setGroupTurns(s, TD.sliceOf(s), true, { title: "Turno di gruppo", text: "x" }, "dm"),
  );
  assert.equal(TD.sliceOf(h.store.state).combat.groupTurn ?? null, null);
});

test("TV-52: placed identical goblins can roll separately; the choice is kept and reversible", () => {
  const h = setup();
  const s0 = h.store.state;
  const [a, b] = AMBUSH_GOBLINS;
  const rows = TD.startCandidates(s0, AMBUSH_SCENE_ID);
  const rowA = rows.find((r) => r.actorId === a);
  assert.ok(rowA.shareKey, "the pair has a shared-roll key it may give up");
  assert.equal(rowA.groupKey, rowA.shareKey);
  // The start dialog offers the switch on the merged row, with its source.
  tracker.openTableInitiative(h.ctx, AMBUSH_SCENE_ID);
  const body = h.dialogs.at(-1).body;
  assert.match(body, /data-ct-start-share="[^"]+"[^>]*checked/);
  assert.match(body, /Un solo tiro per il gruppo/);
  assert.match(body, /SRD 5\.2\.1/);
  // Separate rolls: recorded for the scene, each goblin its own key.
  h.ctx.commit("Tiri separati", (s) => TD.setShareInitiative(s, rowA.shareKey, false, "dm"));
  const s = h.store.state;
  assert.notEqual(initiativeKeyOf(s, a), initiativeKeyOf(s, b));
  const split = TD.startCandidates(s, AMBUSH_SCENE_ID);
  assert.ok(split.every((r) => !r.groupKey || r.groupKey.startsWith("actor:")));
  assert.equal(split.find((r) => r.actorId === b).shareKey, rowA.shareKey, "still re-joinable");
  tracker.openTableInitiative(h.ctx, AMBUSH_SCENE_ID);
  const again = h.dialogs.at(-1).body;
  assert.match(again, /data-ct-start-share="[^"]+" >/, "the switch stays, unticked");
  assert.doesNotMatch(again, /data-ct-start-share="[^"]+" checked/);
  assert.equal((again.match(/data-ct-start-row=/g) ?? []).length, 5, "two goblin rows");
  // Back to one roll.
  h.ctx.commit("Un solo tiro", (st) => TD.setShareInitiative(st, rowA.shareKey, true, "dm"));
  assert.equal(initiativeKeyOf(h.store.state, a), initiativeKeyOf(h.store.state, b));
  // Only the DM (or the session runner) decides.
  assert.throws(() =>
    h.ctx.commit("x", (st) => TD.setShareInitiative(st, rowA.shareKey, false, "player")),
  );
});

test("TV-52: the dialog's rows follow the switch; merging rows with different d20s asks one roll", () => {
  const rows = [
    { actorId: "a", groupKey: "k", shareKey: "k", included: true, natural: 12, bonus: 2 },
    { actorId: "b", groupKey: "k", shareKey: "k", included: true, natural: 12, bonus: 2 },
  ];
  TD.applyShareChoice(rows, "k", false);
  assert.deepEqual(
    rows.map((r) => r.groupKey),
    ["actor:a", "actor:b"],
  );
  assert.deepEqual(
    rows.map((r) => r.natural),
    [12, 12],
    "splitting keeps the rolls",
  );
  rows[1].natural = 7;
  TD.applyShareChoice(rows, "k", true);
  assert.deepEqual(
    rows.map((r) => r.groupKey),
    ["k", "k"],
  );
  assert.deepEqual(
    rows.map((r) => r.natural),
    [null, null],
    "two different d20s cannot be one roll: roll again",
  );
});

// ---------------------------------------------------------------- X-A1

function forgeFor(h, owner, id) {
  h.as(owner);
  const forged = HD.forgeItem("srd2024:item:longsword", ["weapon-plus-1"]);
  let ref;
  h.store.commit(
    "fixture: forged longsword",
    (state) => {
      hb.createHomebrewDraft(state, { id, kind: "create", type: forged.type }, owner);
      hb.saveHomebrewDraft(state, id, { data: forged.data }, owner);
      ref = HD.saveContent(state, id, owner).ref;
    },
    owner,
  );
  h.ctx.navigate("homebrew-editor", { id: ref.contentId, revision: ref.revisionId });
  return ref;
}
const optionOf = (body, name) =>
  (body.match(new RegExp(`<option value="[^"]*">${name} · [^<]*</option>`)) ?? [""])[0];

test("X-A1: «Applica a una scheda…» names each campaign sheet's missing steps (D&D Beyond campaign homebrew)", () => {
  const h = hbHarness();
  const ref = forgeFor(h, "dm", "forged-xa1");
  assert.deepEqual(
    hb.homebrewUseSteps(h.store.state, ref, { actorId: "doran" }, "dm").map((s) => s.code),
    ["enable", "share"],
  );
  h.run("apply-sheet");
  let body = h.dialogs.at(-1).body;
  const doran = optionOf(body, "Doran");
  assert.doesNotMatch(doran, /prerequisiti soddisfatti/, "never offered as ready");
  assert.match(doran, /prima: «Abilita in campagna» · «Condividi in lettura con i giocatori»/);
  assert.match(body, /Le schede della campagna usano solo contenuti abilitati dal DM/);
  // Refused with the steps, in one language, nothing applied.
  assert.throws(
    () => h.submit({ actorId: "doran" }),
    (error) =>
      /Prima di applicarla a Doran: «Abilita in campagna» · «Condividi in lettura con i giocatori»/.test(
        error.it,
      ) &&
      /Before applying it to Doran/.test(error.en) &&
      !/ \/ /.test(error.it),
  );
  assert.ok(
    !h.store.state.actors.doran.inventory?.some((r) => r.baseRef?.contentId === ref.contentId),
  );
  // After both steps the sheet is ready.
  h.run("enable", { enabled: "true" });
  assert.deepEqual(
    hb.homebrewUseSteps(h.store.state, ref, { actorId: "doran" }, "dm").map((s) => s.code),
    ["share"],
  );
  h.run("share", { shared: "true" });
  h.run("apply-sheet");
  body = h.dialogs.at(-1).body;
  assert.match(optionOf(body, "Doran"), /prerequisiti soddisfatti/);
  h.submit({ actorId: "doran" });
  assert.ok(
    h.store.state.actors.doran.inventory.some((r) => /Spada lunga/.test(r.name?.it ?? r.name)),
  );
});

test("X-A1: the player's own content on a campaign sheet names the DM's step; errors are one language", () => {
  const h = hbHarness();
  const ref = forgeFor(h, "player", "forged-xa1p");
  const steps = hb.homebrewUseSteps(h.store.state, ref, { actorId: "livia" }, "player");
  assert.deepEqual(
    steps.map((s) => s.code),
    ["enable", "share"],
  );
  assert.match(steps[0].it, /il DM la abilita in campagna/);
  assert.match(steps[1].it, /Condividi in lettura con il DM/);
  // A plain domain refusal carries both languages for the shell to choose one.
  try {
    hb.materializeHomebrewCopy(h.store.state, ref, "player", { id: "x", actorId: "livia" });
    assert.fail("should refuse");
  } catch (error) {
    assert.equal(typeof error.it, "string");
    assert.equal(typeof error.en, "string");
    assert.doesNotMatch(error.it, / \/ Content/);
  }
  h.ctx.lang = "en";
  h.run("apply-sheet");
  assert.match(
    optionOf(h.dialogs.at(-1).body, "Livia"),
    /first: “the DM enables it in the campaign” · “Share read access with the DM”/,
  );
});

// ---------------------------------------------------------------- X-A3

test("X-A3: an SRD class structure starts with the class table's feature names and saves at once", () => {
  const data = HD.buildFromTemplate("class", "class-levels:wizard");
  const s = data.structured;
  assert.deepEqual(
    HD.validateStructured("class", s).filter((issue) => issue.path?.startsWith?.("advancement")),
    [],
    "no empty grant blocks the first «Salva»",
  );
  const first = s.advancement.find((a) => a.type === "grant" && a.level === 1);
  assert.deepEqual(
    first.features.map((f) => f.name.it),
    ["Incantesimi", "Adepto dei rituali", "Recupero arcano"],
  );
  assert.deepEqual(
    first.features.map((f) => f.name.en),
    ["Spellcasting", "Ritual Adept", "Arcane Recovery"],
  );
  assert.ok(
    first.features.every((f) => !f.description?.it && !f.description?.en),
    "names only: the author writes the text, SRD prose is never copied",
  );
  const levels = s.advancement.filter((a) => a.type === "grant").map((a) => a.level);
  assert.ok(levels.includes(2) && levels.includes(18), "the whole class table, level by level");
  assert.ok(s.advancement.some((a) => a.type === "asi" && a.level === 4));
});

// ---------------------------------------------------------------- BI-45

import * as A from "../adventures.mjs";
import * as TM from "../token-menu.mjs";
import * as compendium from "../compendium.mjs";
import * as CP from "../compat-packs.mjs";
import { isValidMeleeProfile } from "../combat.mjs";
import { getDraftCatalog, createCharacterDraft } from "../character-build.mjs";
import { renderLibrary, resetLibraryView } from "../library.mjs";

const packSetup = (role = "dm") =>
  harness({
    role,
    areas: [
      ["adventures", A.register],
      ["token-menu", TM.register],
      ["compendium", compendium.register],
    ],
    view: { page: "library", tab: "available" },
  });
const PACK = "esempio-valle-di-bruma";
function installSample(h, { enable = true } = {}) {
  h.ctx.role = "dm";
  h.ctx.commit("fixture: sample pack", (s) => {
    A.installPack(s, A.samplePack(), "dm");
    if (enable) A.enablePack(s, PACK, s.campaign.id, "dm");
  });
}

test("BI-45: an enabled pack's creatures reach the Table bestiary and land as NPCs with their attack", () => {
  const h = packSetup();
  installSample(h, { enable: false });
  const names = (q) => TM.creatureMatches(q, "it", 12, h.store.state).map((e) => e.name.it);
  assert.deepEqual(names("Lanterna vagante"), [], "installed but not enabled: not offered");
  h.ctx.commit("enable", (s) => A.enablePack(s, PACK, s.campaign.id, "dm"));
  assert.deepEqual(names("Lanterna vagante"), ["Lanterna vagante"]);
  assert.ok(names("custode").includes("Custode di nebbia"));
  assert.ok(names("goblin").length > 0, "the SRD creatures stay");
  const entry = CP.packCreature(h.store.state, `pack:${PACK}:creature:lanterna-vagante`);
  assert.equal(entry.pack.page, 42);
  const { actorId } = compendium.addCreatureToScene(h.ctx, entry, {
    sceneId: h.store.state.activeSceneId,
    name: "Lanterna vagante",
    team: "watch",
  });
  const npc = h.store.state.actors[actorId];
  assert.deepEqual([npc.hp, npc.maxHp, npc.ac], [22, 22, 13]);
  assert.equal(npc.speed, 9, "a flying-only creature keeps its fly speed");
  assert.equal(npc.abilities.dex, 16);
  assert.equal(npc.provenance.kind, "compat-pack");
  assert.deepEqual(npc.provenance.pages, [42]);
  assert.ok(isValidMeleeProfile(npc.combatProfile.meleeAttack), "its Flare is a Table attack");
  assert.equal(npc.combatProfile.meleeAttack.attackBonus, 5);
  assert.ok(listActions(h.store.state, actorId).some((a) => a.kind === "attack"));
  // Disabled again: no longer offered (the placed NPC stays).
  h.ctx.commit("disable", (s) => A.disablePack(s, PACK, s.campaign.id, "dm"));
  assert.deepEqual(names("Lanterna vagante"), []);
  assert.ok(h.store.state.actors[actorId]);
});

test("BI-45: an enabled pack's subclass joins its class in the builder, with its page", () => {
  const h = packSetup("player");
  installSample(h);
  h.ctx.role = "player";
  h.ctx.commit("draft", (s) => createCharacterDraft(s, { id: "d-pack" }, "player"), {
    local: true,
  });
  const wizard = getDraftCatalog(h.store.state, "d-pack", "player").classes.find(
    (c) => c.id === "wizard",
  );
  const keeper = wizard.subclasses.find((s) => s.pack);
  assert.ok(keeper, "Custode del faro is offered");
  assert.equal(keeper.name.it, "Custode del faro");
  assert.equal(keeper.source.kind, "compat-pack");
  assert.deepEqual(keeper.source.pages, [60]);
  assert.ok(
    wizard.subclasses.some((s) => s.id === "evoker"),
    "the SRD subclass stays",
  );
});

test("BI-45: the Library search and the palette find pack entries and open the pack", () => {
  const h = packSetup("player");
  installSample(h);
  h.ctx.role = "player";
  const found = CP.searchPackEntries(h.store.state, "player", "lanterna vagante");
  assert.equal(found.length, 1);
  assert.equal(found[0].page, 42);
  globalThis.sessionStorage ??= memory();
  sessionStorage.setItem(
    "d20-library-filters:player:available",
    JSON.stringify({ q: "Lanterna vagante", type: "", language: "", origin: "" }),
  );
  resetLibraryView();
  h.ctx.view = { page: "library", tab: "available", id: "", revision: "" };
  const page = renderLibrary(h.ctx);
  assert.match(page, /data-library-pack="[^"]*lanterna-vagante"/);
  assert.match(page, /Lanterna vagante/);
  assert.match(page, /Pacchetto «Valle di Bruma · esempio \(simulazione\)» · p\. 42/);
  const provider = h.registry.list("search", h.ctx, "").find((p) => p.id === A.PACKS);
  assert.ok(provider, "a palette source for the packs");
  const hits = provider.search(h.ctx, "custode del faro");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].params.revision, `pack:${PACK}`);
});

// ---------------------------------------------------------------- X-A2 and minor observations

import fs from "node:fs";
import * as CM from "../campaign-members.mjs";

const MODULES = fs
  .readdirSync(new URL("..", import.meta.url))
  .filter((name) => name.endsWith(".mjs"))
  .map((name) => [name, fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8")]);
// (it, en) string pairs as the modules pass them to t(), ctx.t(), L(), text() and button().
const PAIR =
  /(?:\b(?:t|L|text)\(|button\(ctx, [^,]+,)\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`),\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g;

test("X-A2: no English «preview» and no «Handout» on the Italian side of a string pair", () => {
  const leaks = [];
  for (const [name, src] of MODULES)
    for (const m of src.matchAll(PAIR)) {
      const it = m[1]
        .slice(1, -1)
        .replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, " ")
        .replace(/data-[a-z-]+/g, "");
      if (/\bpreview\b/i.test(it) || /^Handout$/.test(it))
        leaks.push(`${name}: ${it.slice(0, 80)}`);
    }
  assert.deepEqual(leaks, []);
});

test("X-A2: the Italian UI names SRD class features, ranges and forged provenance in Italian", () => {
  const forged = HD.forgeItem("srd2024:item:longsword", ["weapon-plus-1"], "it");
  assert.match(forged.data.source.reference, /Spada lunga \+ Arma \+1 \(IT p\.\d+/);
  assert.match(
    HD.forgeItem("srd2024:item:longsword", ["weapon-plus-1"]).data.source.reference,
    /Longsword \+ Weapon \+1 \(EN p\./,
  );
  // Weapon Mastery is «Padronanza» in the Italian SRD («Maestria» is Expertise).
  const combat = MODULES.find(([name]) => name === "combat-ui.mjs")[1];
  assert.doesNotMatch(combat, /\$\{a\.rangeMeters\} m/, "ranges use the reader's decimal comma");
});

test("CA-57 residual: the hand-off dialog names the member by their characters, not «Giocatore · Giocatore»", () => {
  const h = harness({ role: "dm", areas: [["campaign-members", CM.register]] });
  CM.handleAction(h.ctx, "handover", { id: h.store.state.campaign.id, target: "player" });
  const body = h.dialogs.at(-1).body;
  const option = body.match(/<option value="player"[^>]*>([^<]*)<\/option>/)?.[1] ?? "";
  assert.match(option, /Livia/);
  assert.doesNotMatch(option, /Giocatore · Giocatore/);
});
