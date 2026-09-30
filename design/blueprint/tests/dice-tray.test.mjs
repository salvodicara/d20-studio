// B34 dice tray: the pure domain (formula, roll modes, evaluation, physical faces, sheet
// modifiers, audiences and reveal, records, withdrawal/correction, Heroic Inspiration,
// modifier stack, connected dice, roll event) and the Table tab's handlers through a small
// fake DOM with the real store and the real registry (B56 registered beside it).
// Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import * as dice3d from "../dice-3d.mjs";
import * as describe from "../dice-3d-domain.mjs";
import { renderTextWithEmbeds } from "../text-embeds.mjs";

afterEach(() => {
  tray.resetTrayUI();
  dice3d.clearDice();
  dice3d.resetDiceUI();
});

const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.match(error.it ?? error.message, pattern);
    assert.ok(error.en, "a refusal carries English too");
    return true;
  });

// ---------------------------------------------------------------- formula

test("formulas parse to canonical text and wrong ones are explained with a position", () => {
  assert.equal(domain.parseFormula("2d6+1d4+3").text, "2d6+1d4+3");
  assert.equal(domain.parseFormula(" 1d20 + 1d4 − 2 ").text, "1d20+1d4-2");
  assert.equal(domain.parseFormula("d%").text, "1d100");
  assert.equal(domain.parseFormula("4d6k3").text, "4d6kh3");
  assert.equal(domain.parseFormula("2d6xo").text, "2d6xo");
  assert.equal(domain.parseFormula("10d6cs>=5").text, "10d6cs>=5");
  refusal(() => domain.parseFormula("2d6+"), /Manca un dado o un numero dopo «\+» \(posizione 4\)/);
  refusal(() => domain.parseFormula("3d7"), /d7 non è un dado standard/);
  refusal(() => domain.parseFormula("2d6kh3"), /Non puoi tenere 3 dadi su 2/);
  refusal(() => domain.parseFormula("2d6dl2"), /Non puoi scartare 2 dadi su 2/);
  refusal(() => domain.parseFormula("abc"), /Carattere non valido «a» in posizione 1/);
  refusal(() => domain.parseFormula("2d6*2"), /separa i termini con \+ o −/);
  refusal(() => domain.parseFormula(""), /Scrivi una formula/);
  refusal(() => domain.parseFormula("21d6"), /Da 1 a 20 dadi per termine/);
  refusal(() => domain.parseFormula("20d6+20d6+2d6"), /Al massimo 40 dadi/);
  assert.equal(domain.prettyFormula("2d6+1d4-3"), "2d6 + 1d4 − 3");
});

test("advantage keeps the higher of two d20s, critical doubles damage dice only (SRD 2024)", () => {
  const adv = domain.applyRollMode(domain.parseFormula("1d20+5"), "advantage");
  assert.equal(adv.text, "2d20kh1+5");
  assert.equal(
    domain.applyRollMode(domain.parseFormula("1d20+1d4"), "disadvantage").text,
    "2d20kl1+1d4",
  );
  assert.equal(
    domain.applyRollMode(domain.parseFormula("2d6+1d8+3"), "critical").text,
    "4d6+2d8+3",
  );
  refusal(
    () => domain.applyRollMode(domain.parseFormula("2d6"), "advantage"),
    /valgono per un solo d20/,
  );
  refusal(() => domain.applyRollMode(domain.parseFormula("1d20+2"), "critical"), /non il d20/);
  const r = domain.evaluate(adv, scripted(7, 15));
  assert.deepEqual(
    r.groups[0].faces.map((f) => [f.value, f.kept]),
    [
      [7, false],
      [15, true],
    ],
  );
  assert.equal(r.total, 20);
  const dis = domain.evaluate(
    domain.applyRollMode(domain.parseFormula("1d20"), "disadvantage"),
    scripted(7, 15),
  );
  assert.equal(dis.total, 7);
});

test("keep/drop, exploding dice and success counts follow the written rule", () => {
  const kh = domain.evaluate(domain.parseFormula("4d6kh3"), scripted(1, 6, 3, 4));
  assert.equal(kh.total, 13);
  assert.deepEqual(
    kh.groups[0].faces.map((f) => f.kept),
    [false, true, true, true],
  );
  const dl = domain.evaluate(domain.parseFormula("4d6dl1"), scripted(1, 6, 3, 4));
  assert.equal(dl.total, 13);
  const x = domain.evaluate(domain.parseFormula("2d6x+1"), scripted(6, 6, 2, 3));
  assert.deepEqual(x.values, [6, 6, 2, 3]);
  assert.equal(x.total, 18);
  assert.deepEqual(
    x.groups[0].faces.map((f) => [f.exploded, f.extra]),
    [
      [true, false],
      [true, true],
      [false, true],
      [false, false],
    ],
  );
  const xo = domain.evaluate(domain.parseFormula("1d6xo"), scripted(6, 6));
  assert.deepEqual(xo.values, [6, 6], "explode once stops after one extra die");
  const cs = domain.evaluate(domain.parseFormula("5d6cs>=5+1"), scripted(5, 6, 1, 4, 5));
  assert.equal(cs.groups[0].successes, 3);
  assert.equal(cs.total, 4);
});

test("physical faces: one per base die, then the extra dice an explosion asks for", () => {
  const parsed = domain.parseFormula("2d6x+1d4");
  assert.deepEqual(domain.baseSides(parsed), [6, 6, 4]);
  refusal(() => domain.physicalFaces(parsed, [6, 3]), /Inserisci la faccia di ogni dado/);
  assert.throws(
    () => domain.physicalFaces(parsed, [6, 3, 2]),
    (error) => error.code === "explosion-faces" && error.needs.join() === "6",
  );
  const r = domain.physicalFaces(parsed, [6, 3, 2, 5]);
  assert.deepEqual(r.values, [6, 5, 3, 2]);
  assert.equal(r.total, 16);
  refusal(() => domain.physicalFaces(parsed, [7, 3, 2]), /Faccia 1 non valida/);
  refusal(() => domain.physicalFaces(parsed, [1, 3, 2, 4]), /più facce dei dadi/);
});

// ---------------------------------------------------------------- sheet numbers

test("sheet modifiers: recorded save, ability and skill proficiency, with their sources", () => {
  const s = createInitialState();
  // PG-23: the tray reads the sheet's one engine, so the parts are the sheet's own.
  assert.deepEqual(domain.testModifier(s, "mira", { kind: "save", ability: "wis" }), {
    modifier: 5,
    ability: "wis",
    sources: [
      { label: { it: "Saggezza", en: "Wisdom" }, value: 3 },
      { label: { it: "Competenza (Druido)", en: "Proficiency (Druid)" }, value: 2 },
    ],
  });
  assert.equal(domain.testModifier(s, "mira", { kind: "skill", skill: "perception" }).modifier, 5);
  assert.equal(domain.testModifier(s, "mira", { kind: "skill", skill: "stealth" }).modifier, 2);
  assert.equal(domain.testModifier(s, "livia", { kind: "check", ability: "int" }).modifier, 3);
  assert.equal(domain.testModifier(s, "livia", { kind: "save", ability: "dex" }).modifier, 2);
  delete s.actors.livia.abilities.cha;
  refusal(
    () => domain.testModifier(s, "livia", { kind: "check", ability: "cha" }),
    /Manca il punteggio di Carisma/,
  );
  assert.deepEqual(domain.testTitle({ kind: "skill", skill: "athletics" }), {
    it: "Prova di Forza (Atletica)",
    en: "Strength (Athletics) check",
  });
});

// ---------------------------------------------------------------- audiences

test("who reads a roll: public, me and the DM, DM only (blind), only me, and reveals", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  const roll = (role, audience, extra = {}) =>
    domain.recordRoll(slice, s, { formula: "1d20", audience, ...extra }, role, {
      draw: scripted(11),
      announce: true,
      online: true,
    });
  const pub = roll("player", "public");
  const gm = roll("player", "gm");
  const blind = roll("player", "blind");
  const self = roll("player", "self");
  const dmHidden = roll("dm", "self");
  const can = (r, role) => domain.canSeeResult(r, role, s);
  assert.deepEqual(
    [can(pub, "dm"), can(gm, "dm"), can(blind, "dm"), can(self, "dm")],
    [true, true, true, false],
  );
  assert.deepEqual(
    [can(blind, "player"), can(dmHidden, "player"), can(dmHidden, "dm")],
    [false, false, true],
  );
  assert.deepEqual(domain.audiencesFor("dm"), ["public", "self"]);
  assert.match(domain.announcementFor(blind, "player", s).it, /Tiro inviato al DM/);
  assert.equal(
    domain.announcementFor(dmHidden, "player", s).it,
    "Il DM ha fatto un tiro nascosto.",
  );
  assert.equal(self.announced, true, "a player's hidden roll is announced to the others (Bones!)");
  const quiet = domain.recordRoll(slice, s, { formula: "1d20", audience: "self" }, "dm", {
    draw: scripted(4),
    announce: false,
    online: true,
  });
  assert.equal(
    domain.announcementFor(quiet, "player", s),
    null,
    "no announcement: no trace (Roll20 /ssr)",
  );
  const offline = domain.recordRoll(slice, s, { formula: "1d20", audience: "self" }, "dm", {
    draw: scripted(4),
    announce: true,
    online: false,
  });
  assert.equal(offline.announced, false, "offline hidden rolls are not announced");
  // Reveal to one character a player plays (review P1-2: Doran is the DM's own character,
  // so a reveal to him would reach nobody and is refused), then to everyone.
  refusal(
    () => domain.revealRoll(slice, s, dmHidden.id, "doran", "dm", "t1"),
    /personaggio di un giocatore/,
  );
  assert.equal(can(dmHidden, "player"), false, "not revealed yet");
  domain.revealRoll(slice, s, dmHidden.id, "livia", "dm", "t2");
  assert.equal(can(dmHidden, "player"), true, "revealed to Livia's player");
  domain.revealRoll(slice, s, self.id, "dm", "player", "t3");
  assert.equal(can(self, "dm"), true, "the roller revealed a self roll to the DM");
  refusal(
    () => domain.revealRoll(slice, s, blind.id, "all", "player", "t"),
    /Può rivelarlo il DM o chi ha tirato/,
  );
  refusal(
    () => domain.revealRoll(slice, s, self.id, "livia", "player", "t"),
    /Rivela a un solo personaggio il DM/,
  );
  domain.revealRoll(slice, s, blind.id, "all", "dm", "t4");
  assert.equal(can(blind, "player"), true);
  refusal(() => domain.revealRoll(slice, s, pub.id, "all", "dm", "t"), /già visibile a tutti/);
  // Projections for lists.
  const list = domain.recentRolls(slice, s, "player");
  assert.ok(
    list.every((v) => v.readable || v.announcement),
    "only readable rolls or announcements",
  );
  assert.ok(!list.some((v) => v.id === quiet.id));
});

test("a personal sheet never rolls for the table (same rule as the core and B56)", () => {
  const s = createInitialState();
  s.actors.iria = {
    ...structuredClone(s.actors.livia),
    id: "iria",
    name: "Iria",
    visibility: "private",
    owner: "player",
  };
  const slice = domain.seedSlice();
  const r = domain.recordRoll(
    slice,
    s,
    { formula: "1d20", actorId: "iria", audience: "public" },
    "player",
    {
      draw: scripted(9),
    },
  );
  assert.equal(r.audience, "self");
  assert.equal(r.forced, true);
  refusal(
    () =>
      domain.recordRoll(slice, s, { formula: "1d20", actorId: "iria" }, "dm", {
        draw: scripted(9),
      }),
    /Non puoi tirare per questa creatura/,
  );
});

// ---------------------------------------------------------------- records

test("a roll records the service's faces, the stack once, DC success and the roll event", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  domain.pushStack(slice, "player", { presetId: "half-cover" });
  const r = domain.recordRoll(
    slice,
    s,
    { kind: "save", ability: "dex", actorId: "livia", dc: 13, rollMode: "advantage" },
    "player",
    { draw: scripted(4, 9) },
  );
  assert.equal(r.expression, "2d20kh1+2");
  assert.equal(r.natural, 9);
  assert.equal(r.total, 9 + 2 + 2);
  assert.equal(r.success, true);
  assert.deepEqual(
    r.stack.map((m) => [m.presetId, m.value]),
    [["half-cover", 2]],
  );
  assert.deepEqual(slice.stacks.player, [], "the stack empties after the roll");
  assert.equal(
    domain.breakdown({ ...r, readable: true }, "it"),
    "[~4~, 9] + 2 (Destrezza) + 2 (Mezza copertura) = 13",
  );
  const event = domain.rollEvent(r);
  assert.deepEqual(
    [event.source, event.kind, event.visibility, event.rollMode],
    ["dice-tray", "save", "shared", "advantage"],
  );
  assert.deepEqual(event.kept, [false, true]);
  assert.equal(event.modifier, 4);
  // B56 presents it with its title, DC and verdict (additive branch in dice-3d-domain).
  const view = describe.describeRoll(s, event, "dm");
  assert.equal(view.title.it, "Tiro salvezza su Destrezza");
  assert.equal(view.dc, 13);
  assert.equal(view.verdict.it, "Successo");
  assert.deepEqual(
    view.dice.map((d) => d.kept),
    [false, true],
  );
  const blind = domain.rollEvent({ ...r, audience: "blind" });
  assert.deepEqual([blind.owner, blind.visibility], ["dm", "private"]);
  assert.equal(
    describe.describeRoll(s, blind, "player"),
    null,
    "the roller never sees a blind roll's dice",
  );
  refusal(
    () =>
      domain.recordRoll(slice, s, { formula: "2d6", dc: 12 }, "player", { draw: scripted(1, 1) }),
    /La CD vale per una prova con d20/,
  );
});

test("withdrawal keeps faces and an identical retry reuses them once; physical corrections keep a reason", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  const first = domain.recordRoll(slice, s, { formula: "2d6+1", actorId: "livia" }, "player", {
    draw: scripted(2, 3),
  });
  refusal(() => domain.withdrawRoll(slice, first.id, " ", "player", "t"), /Scrivi il motivo/);
  refusal(() => domain.withdrawRoll(slice, first.id, "x", "dm", "t"), /solo chi l'ha tirato/);
  domain.withdrawRoll(slice, first.id, "sbagliato", "player", "t");
  const retry = domain.recordRoll(slice, s, { formula: "2d6+1", actorId: "livia" }, "player", {
    draw: scripted(6, 6),
  });
  assert.deepEqual(retry.values, [2, 3], "the withdrawn faces come back once (I-229)");
  assert.equal(retry.status, "reused");
  const again = domain.recordRoll(slice, s, { formula: "2d6+1", actorId: "livia" }, "player", {
    draw: scripted(6, 5),
  });
  assert.deepEqual(again.values, [6, 5]);
  const physical = domain.recordRoll(slice, s, { formula: "1d6x", mode: "physical" }, "player", {
    faces: [6, 2],
  });
  assert.deepEqual(domain.inputOrder(physical), [6, 2]);
  refusal(() => domain.correctRoll(slice, s, again.id, [1, 1], "x", "player", "t"), /si ritira/);
  domain.correctRoll(slice, s, physical.id, [4], "letto male", "player", "t");
  assert.equal(physical.status, "corrected");
  assert.equal(physical.total, 4);
  assert.deepEqual(physical.corrections[0].values, [6, 2]);
});

test("Heroic Inspiration: toggled by the player or the DM, rerolls one die of the latest roll once", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  refusal(
    () => domain.setInspiration(slice, s, "goblin-1", true, "dm", "t"),
    /personaggi giocanti/,
  );
  refusal(
    () => domain.setInspiration(slice, s, "doran", true, "player", "t"),
    /chi gioca il personaggio o il DM/,
  );
  assert.deepEqual(domain.setInspiration(slice, s, "livia", true, "player", "t"), {
    changed: true,
  });
  assert.deepEqual(
    domain.setInspiration(slice, s, "livia", true, "dm", "t"),
    { changed: false },
    "only one at a time",
  );
  const old = domain.recordRoll(
    slice,
    s,
    { kind: "check", ability: "str", actorId: "livia", dc: 12 },
    "player",
    {
      draw: scripted(3),
    },
  );
  const latest = domain.recordRoll(
    slice,
    s,
    { kind: "save", ability: "dex", actorId: "livia", dc: 13, rollMode: "advantage" },
    "player",
    { draw: scripted(2, 5) },
  );
  refusal(
    () => domain.inspirationReroll(slice, s, old.id, 0, "player", { draw: scripted(20) }),
    /non è l'ultimo tiro/,
  );
  refusal(
    () => domain.inspirationReroll(slice, s, latest.id, 0, "dm", { draw: scripted(20) }),
    /chi ha tirato/,
  );
  domain.inspirationReroll(slice, s, latest.id, 0, "player", { draw: scripted(18), now: "t9" });
  assert.deepEqual(
    latest.values,
    [18, 5],
    "the chosen d20 only (SRD EN 8: one die with advantage)",
  );
  assert.equal(latest.natural, 18);
  assert.equal(latest.total, 20);
  assert.equal(latest.success, true);
  assert.deepEqual([latest.rerolls[0].from, latest.rerolls[0].to], [2, 18]);
  assert.equal(domain.hasInspiration(slice, "livia"), false, "inspiration spent");
  domain.setInspiration(slice, s, "livia", true, "dm", "t");
  refusal(
    () => domain.inspirationReroll(slice, s, latest.id, 1, "player", { draw: scripted(1) }),
    /una volta sola/,
  );
  const physical = domain.recordRoll(slice, s, { formula: "1d20+1", actorId: "livia" }, "player", {
    draw: scripted(2),
  });
  refusal(
    () => domain.inspirationReroll(slice, s, physical.id, 0, "player", { face: 21 }),
    /tra 1 e 20/,
  );
  domain.inspirationReroll(slice, s, physical.id, 0, "player", { face: "12" });
  assert.equal(physical.rerolls[0].mode, "physical");
  assert.equal(physical.total, 13);
});

test("modifier stack and campaign presets (Fantasy Grounds): DM presets, player visibility, limits", () => {
  const slice = domain.seedSlice();
  assert.deepEqual(
    slice.presets.map((p) => [p.id, p.value, p.source.pages ?? p.source.en.pages]),
    [
      ["half-cover", 2, [179]],
      ["three-quarters-cover", 5, [179]],
    ],
  );
  refusal(() => domain.addPreset(slice, "player", { label: "x", value: 1 }), /Solo il DM/);
  const slippery = domain.addPreset(slice, "dm", {
    label: "Terreno sdrucciolevole",
    value: -2,
    visible: false,
  });
  assert.deepEqual(
    domain.visiblePresets(slice, "player").map((p) => p.id),
    ["half-cover", "three-quarters-cover"],
  );
  refusal(() => domain.pushStack(slice, "player", { presetId: slippery.id }), /non disponibile/);
  domain.setPresetVisible(slice, "dm", slippery.id, true);
  domain.pushStack(slice, "player", { presetId: slippery.id });
  refusal(() => domain.pushStack(slice, "player", { value: 0 }), /diverso da 0/);
  domain.pushStack(slice, "player", { value: "3" });
  assert.equal(domain.stackTotal(slice.stacks.player), 1);
  domain.removeFromStack(slice, "player", slice.stacks.player[0].id);
  assert.equal(domain.stackTotal(slice.stacks.player), 3);
  assert.deepEqual(slice.stacks.dm, [], "each identity has its own stack");
  domain.removePreset(slice, "dm", slippery.id);
  assert.equal(slice.presets.length, 2);
});

test("connected dice (simulated): pair, rename, forget; the reported faces are physical, per die", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  // TV-95: a connected roll needs a paired die of a rolled type and its reported face.
  refusal(
    () =>
      domain.recordRoll(slice, s, { formula: "1d20", mode: "connected" }, "player", {
        faces: [4],
        faceModes: ["connected"],
      }),
    /Nessun dado connesso adatto/,
  );
  const d20 = domain.pairDevice(slice, "player", { sides: 20 });
  domain.renameDevice(slice, "player", d20.id, "Pixels di Livia");
  const r = domain.recordRoll(slice, s, { formula: "1d20+1d6", mode: "connected" }, "player", {
    faces: [17, 3],
    faceModes: ["connected", "digital"],
    devices: [{ it: "Pixels di Livia", en: "Pixels di Livia" }],
  });
  assert.deepEqual(r.faceModes, ["connected", "digital"]);
  assert.equal(r.mode, "physical", "a connected die lands as a physical die");
  assert.equal(r.devices[0].it, "Pixels di Livia");
  assert.equal(domain.rollEvent(r).mode, "physical", "a real die is never animated as digital");
  domain.forgetDevice(slice, "player", d20.id);
  assert.deepEqual(slice.devices.player, []);
});

test("the slice normalizes saved data and refuses a future version", () => {
  const normalized = domain.normalizeSlice(
    { rolls: "x", stacks: { player: [{ id: 1 }] }, closedRequests: [1, "g"] },
    1,
  );
  assert.deepEqual(normalized.rolls, []);
  assert.deepEqual(normalized.stacks, { player: [{ id: 1 }], dm: [] });
  assert.deepEqual(normalized.closedRequests, ["g"]);
  assert.equal(normalized.presets.length, 2);
  assert.throws(() => domain.normalizeSlice({}, 2), /future/);
});

// ---------------------------------------------------------------- Table tab (fake DOM)

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function fakeRoot(html) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
    ...[...html.matchAll(/<(form|p)\b([^>]*)>/g)].map((m) => [m[0], m[1], m[2], ""]),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      attrs,
      events,
      inner,
      tagName: tag.toUpperCase(),
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      addEventListener(type, fn) {
        events[type] = fn;
      },
      setAttribute(k, v) {
        attrs[k] = v;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
      closest: () => null,
      focus() {},
    };
  });
  return {
    html,
    nodes,
    // Attribute selectors only: "[a]", "[a="b"]" and several of them together.
    querySelectorAll(selector) {
      if (!/^(\[[^\]]+\])+$/.test(selector)) return [];
      const parts = [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].map((m) => [
        m[1],
        m[2],
      ]);
      return nodes.filter((n) =>
        parts.every(([k, v]) => k in n.attrs && (v === undefined || n.attrs[k] === v)),
      );
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
}
const node = (root, selector) => {
  const found = root.querySelector(selector);
  assert.ok(found, `No ${selector}`);
  return found;
};
const click = (root, selector) => {
  const n = node(root, selector);
  (n.onclick ?? n.events.click)({ target: n, preventDefault() {}, currentTarget: n });
};
const input = (root, selector, value, type = "input") => {
  const n = node(root, selector);
  n.value = value;
  if (n.attrs.type === "checkbox") n.checked = value;
  n.events[type]({ target: n });
};
const submit = (root, selector) => node(root, selector).onsubmit({ preventDefault() {} });

/** Real store + real registry with B56 and the tray registered, as app.mjs wires them. */
function harness({ role = "player", lang = "it", die = null } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  assert.equal(registry.use("dice-tray", tray.register).status, "built");
  assert.equal(registry.use("dice-3d", dice3d.register).status, "built");
  registry.initState(store.state);
  const emitted = [];
  const errors = [];
  const toasts = [];
  registry.on("roll-accepted", (payload) => emitted.push(payload));
  const panel = () => registry.get("table-panel", "dice-tray", ctx);
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    rollDie: die,
    toast(text, error) {
      (error ? errors : toasts).push(text);
    },
    dialog(title, body, options = {}) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {
      this.dialogState = null;
    },
    canControl: () => true,
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      this.render();
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      registry.emitStateEvents(current, store.state, { kind: "correction" });
      this.render();
    },
    render() {
      const scene = store.state.scenes.find((s) => s.id === store.state.activeSceneId);
      this.html = panel().render(this, { scene, selectedActorId: this.selected ?? "livia" });
      this.root = fakeRoot(this.html);
      panel().bind(this.root, this, {});
    },
  };
  registry.attach(ctx);
  ctx.render();
  return {
    ctx,
    store,
    registry,
    emitted,
    errors,
    toasts,
    slice: () => store.state.ext["dice-tray"],
  };
}

test("the area registers a preserved slice, settings, the Dice tab, the sheet section and absorbs B56's tab", () => {
  const { ctx, registry, store } = harness();
  assert.deepEqual(Object.keys(store.state.ext["dice-tray"]).sort(), [
    "closedRequests",
    "devices",
    "diceMethods",
    "inspiration",
    "policies",
    "presets",
    "requestRerolls",
    "rolls",
    "stacks",
  ]);
  const tab = registry.get("table-panel", "dice-tray", ctx);
  assert.deepEqual([tab.placement, tab.icon, tab.order], ["sidebar-tab", "dice", 90]);
  assert.equal(registry.get("table-panel", "dice-3d", ctx), null, "B56's own tab is absorbed");
  assert.deepEqual(
    registry.list("settings", ctx).map((s) => [s.id, s.scope]),
    [
      ["dice-tray", "personal"],
      ["dice-3d", "personal"],
    ],
  );
  ctx.role = "dm";
  assert.ok(
    registry
      .list("settings", ctx)
      .some((s) => s.id === "dice-tray-campaign" && s.scope === "campaign"),
  );
  const section = registry.get("sheet-section", "dice-tray-sheet");
  assert.equal(section.tab, "actions");
  assert.ok(registry.get("sheet-section", "dice-tray-sheet", ctx, store.state.actors.livia));
  assert.equal(
    registry.get("sheet-section", "dice-tray-sheet", ctx, store.state.actors["goblin-1"]),
    null,
  );
  assert.ok(registry.get("map-layer", "dice-tray-fx", ctx));
});

test("the form rolls 2d6+1d4+3 through the dice service, logs it and emits roll-accepted", () => {
  const h = harness({ die: scripted(4, 2, 3) });
  const { ctx } = h;
  assert.match(ctx.html, /data-dtray-section="roll"[^>]*aria-selected="true"/);
  input(ctx.root, "[data-dtray-formula]", "2d6+1d4+3");
  submit(ctx.root, "[data-dtray-form]");
  const r = h.slice().rolls.at(-1);
  assert.deepEqual([r.values, r.total, r.actorId, r.audience], [[4, 2, 3], 12, "livia", "public"]);
  assert.equal(
    h.store.state.log.at(-1).label,
    "Livia · 2d6 + 1d4 + 3: [4, 2] + [3] + 3 = 12 · dado digitale",
  );
  assert.equal(h.emitted.at(-1).roll.source, "dice-tray");
  assert.deepEqual(h.emitted.at(-1).roll.values, [4, 2, 3]);
  assert.match(ctx.html, /data-dtray-total>12</);
  assert.match(ctx.html, /data-dtray-recent="[^"]+" data-readable="true"/);
});

test("a wrong formula is explained and records nothing; an explosion asks for its extra face", () => {
  const h = harness();
  const { ctx } = h;
  input(ctx.root, "[data-dtray-formula]", "2d6+");
  submit(ctx.root, "[data-dtray-form]");
  assert.equal(h.slice().rolls.length, 0);
  assert.match(ctx.html, /data-dtray-error>Manca un dado o un numero dopo «\+»/);
  input(ctx.root, "[data-dtray-formula]", "1d6x");
  input(ctx.root, '[data-dtray-mode][value="physical"]', "physical", "change");
  input(ctx.root, '[data-dtray-face="0"]', "6");
  submit(ctx.root, "[data-dtray-form]");
  assert.equal(h.slice().rolls.length, 0);
  assert.match(ctx.html, /Un dado è esploso: inserisci la faccia del dado aggiuntivo \(d6\)/);
  assert.match(ctx.html, /Esplosione · d6<input[^>]*data-dtray-face="1"/);
  input(ctx.root, '[data-dtray-face="0"]', "6");
  input(ctx.root, '[data-dtray-face="1"]', "3");
  submit(ctx.root, "[data-dtray-form]");
  const r = h.slice().rolls.at(-1);
  assert.deepEqual([r.values, r.total, r.mode], [[6, 3], 9, "physical"]);
});

test("offline: a roll others see is refused before any face is drawn; «Solo io» stays local", () => {
  let draws = 0;
  const h = harness({ die: () => (draws++, 5) });
  const { ctx } = h;
  ctx.offline = true;
  submit(ctx.root, "[data-dtray-form]");
  assert.equal(draws, 0);
  assert.match(ctx.html, /Sei senza rete/);
  input(ctx.root, '[data-dtray-audience][value="self"]', "self", "change");
  submit(ctx.root, "[data-dtray-form]");
  const r = h.slice().rolls.at(-1);
  assert.deepEqual([r.audience, r.announced], ["self", false]);
  assert.equal(h.store.state.log.at(-1).visibility, "private");
});

test("numbers roll in place; the «ask every time» policy asks before rolling", () => {
  const h = harness({ die: scripted(14, 8, 17) });
  const { ctx, registry } = h;
  click(ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  let r = h.slice().rolls.at(-1);
  assert.deepEqual([r.kind, r.ability, r.total, r.rollMode], ["save", "dex", 16, "normal"]);
  assert.match(h.toasts.at(-1), /Livia · Tiro salvezza su Destrezza: 16/);
  registry.setSetting(ctx, "dice-tray.advantage", "ask");
  const before = h.slice().rolls.length;
  click(ctx.root, '[data-dtray-roll][data-kind="skill"][data-skill="stealth"]');
  assert.equal(h.slice().rolls.length, before, "nothing rolled before the answer");
  assert.equal(ctx.dialogState.title, "Vantaggio o svantaggio?");
  assert.match(ctx.dialogState.body, /data-dtray-ask="advantage"/);
  // An explicit mode from the menu (or Shift+click) skips the question.
  tray.rollNumber(
    ctx,
    { kind: "skill", skill: "stealth", actorId: "livia" },
    { rollMode: "advantage" },
  );
  r = h.slice().rolls.at(-1);
  assert.deepEqual([r.rollMode, r.values, r.total], ["advantage", [8, 17], 19]);
});

test("the DM's hidden roll is announced to the player and revealed only to Livia, then to all", () => {
  const h = harness({ role: "dm", die: scripted(13) });
  const { ctx } = h;
  input(ctx.root, '[data-dtray-audience][value="self"]', "self", "change");
  submit(ctx.root, "[data-dtray-form]");
  const r = h.slice().rolls.at(-1);
  assert.deepEqual([r.by, r.audience, r.announced], ["dm", "self", true]);
  assert.equal(h.store.state.log.at(-1).label, "Il DM ha fatto un tiro nascosto");
  assert.equal(h.store.state.log.at(-1).visibility, "shared");
  ctx.role = "player";
  ctx.render();
  assert.match(ctx.html, new RegExp(`data-dtray-recent="${r.id}" data-readable="false"`));
  assert.match(ctx.html, /Il DM ha fatto un tiro nascosto\./);
  ctx.role = "dm";
  ctx.render();
  // Review P1-2: the list names only characters a player plays (Livia, Mira), never Doran.
  assert.doesNotMatch(
    node(ctx.root, `[data-dtray-reveal-target="${r.id}"]`).inner,
    /value="doran"/,
  );
  node(ctx.root, `[data-dtray-reveal-target="${r.id}"]`).value = "livia";
  click(ctx.root, `[data-dtray-reveal="${r.id}"]`);
  assert.deepEqual(h.slice().rolls.at(-1).reveal.actorIds, ["livia"]);
  assert.equal(
    h.store.state.log.at(-1).visibility,
    "private",
    "a reveal to one person stays private",
  );
  ctx.role = "player";
  ctx.render();
  assert.match(ctx.html, new RegExp(`data-dtray-recent="${r.id}" data-readable="true"`));
  ctx.role = "dm";
  ctx.render();
  node(ctx.root, `[data-dtray-reveal-target="${r.id}"]`).value = "all";
  click(ctx.root, `[data-dtray-reveal="${r.id}"]`);
  ctx.role = "player";
  ctx.render();
  assert.match(ctx.html, new RegExp(`data-dtray-recent="${r.id}" data-readable="true"`));
  assert.match(h.store.state.log.at(-1).label, /^Tiro rivelato a tutti: DM · 1d20: \[13\] = 13/);
});

test("stack chips, inspiration switch and 2D style from the tab's controls", () => {
  const h = harness({ die: scripted(10, 6, 5) });
  const { ctx, registry } = h;
  click(ctx.root, '[data-dtray-stack-preset="half-cover"]');
  assert.equal(h.slice().stacks.player.length, 1);
  assert.equal(h.store.state.log.at(-1).visibility, "private", "the stack is personal");
  click(ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.equal(h.slice().rolls.at(-1).total, 14);
  assert.deepEqual(h.slice().stacks.player, []);
  input(ctx.root, '[data-dtray-inspiration="livia"]', true, "change");
  assert.equal(h.slice().inspiration.livia.active, true);
  assert.match(ctx.html, /data-dtray-reroll="/, "the latest roll offers the reroll");
  // Doran is the DM's character: the player cannot switch his inspiration.
  ctx.selected = "doran";
  assert.equal(registry.getSetting(ctx, "dice-3d.enabled"), true);
  click(ctx.root, '[data-dtray-section="look"]');
  input(ctx.root, '[data-dtray-style][value="2d"]', "2d", "change");
  assert.equal(registry.getSetting(ctx, "dice-3d.enabled"), false);
  assert.equal(tray.diceStyle(ctx), "2d");
  click(ctx.root, '[data-dtray-section="roll"]');
  input(ctx.root, "[data-dtray-formula]", "2d6");
  submit(ctx.root, "[data-dtray-form]");
  assert.match(ctx.html, /data-dtray-2d data-animated="true"/);
  assert.equal((ctx.html.match(/dtray-die dtray-d6/g) ?? []).length, 2);
  ctx.role = "dm";
  ctx.render();
  assert.doesNotMatch(ctx.html, /data-dtray-2d/, "only the roller sees the 2D dice");
});

test("chat /r prefills the tray's formula; journal embeds render a roll card", () => {
  const h = harness();
  const { ctx, registry } = h;
  registry.emit("dice-tray:prefill", { formula: "1d20+5", actorId: "livia" });
  ctx.render();
  assert.match(ctx.html, /value="1d20\+5" data-dtray-formula/);
  const html = renderTextWithEmbeds(ctx, "Il ponte oscilla: @Embed[save:dex:13]");
  assert.match(html, /data-dtray-embed="save:dex:13"/);
  assert.match(html, /Tiro salvezza su Destrezza · CD 13/);
  assert.match(html, /data-dtray-embed-roll="livia"/);
  ctx.role = "dm";
  assert.match(
    renderTextWithEmbeds(ctx, "@Embed[check:athletics:15]"),
    /Prova di Forza \(Atletica\) · CD 15[\s\S]*data-dtray-embed-request/,
  );
  assert.equal(
    renderTextWithEmbeds(ctx, "@Embed[save:luck:13]"),
    "@Embed[save:luck:13]",
    "unknown refs stay text",
  );
});

test("spell effects follow a spell's accepted roll, not with the setting off", () => {
  const h = harness();
  const { ctx, registry } = h;
  const s = h.store.state;
  s.combatAttempts = [
    {
      id: "a1",
      actionId: "fire-bolt",
      actorId: "livia",
      selection: { targetIds: ["goblin-2"] },
      targets: [],
    },
  ];
  const layer = registry.get("map-layer", "dice-tray-fx", ctx);
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  registry.emit("roll-accepted", { roll: { source: "combat", attemptId: "a1" } });
  // TV-125: the effect takes the spell's damage type colour (Fire Bolt: fire).
  assert.match(layer.svg(ctx, { scene }), /class="dtray-fx-bolt dtray-fx-type-fire"/);
  registry.setSetting(ctx, "dice-tray.spell-fx", false);
  s.combatAttempts.push({ ...s.combatAttempts[0], id: "a2" });
  registry.emit("roll-accepted", { roll: { source: "combat", attemptId: "a2" } });
  const svg = layer.svg(ctx, { scene });
  assert.equal((svg.match(/dtray-fx-bolt/g) ?? []).length, 1, "no new effect with the setting off");
});
