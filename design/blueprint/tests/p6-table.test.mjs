// P6 — the Table around the map: health badges follow the campaign's enemy-health policy
// (TV-25), the hotbar shows HP and spell slots (PG-46), the status line teaches pan, zoom and
// the Alt labels (TV-05, TV-11), a path warns where it provokes (TV-77), «Cadere» works from
// the ground (TV-71), and the guide lists Alt labels and the last move. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { renderTable, resetTableView, tokenStatus, hotbarVitals, idleHint } from "../table.mjs";
import { opportunityWarnings } from "../table-spatial.mjs";
import { esc, icon } from "../ui.mjs";
import * as SM from "../special-moves-domain.mjs";
import * as SMUI from "../special-moves.mjs";

const context = (state, role = "player", lang = "it") => ({
  state,
  role,
  lang,
  canControl: (a) => role === "dm" || a?.owner === role,
  t: (it, en) => (lang === "it" ? it : en),
  label: (v) => (typeof v === "object" ? v?.[lang] : v),
  esc,
  icon,
});
const hideEnemyHealth = (state) => {
  state.ext = {
    ...(state.ext ?? {}),
    "campaign-settings": {
      campaigns: { [state.campaign.id]: { policy: { enemyHp: "hidden" } } },
    },
  };
};

test("TV-25: with enemy health hidden, a player sees no health badge on an enemy token", () => {
  const state = createInitialState();
  const goblin = state.actors["goblin-1"];
  goblin.hp = 0;
  goblin.dead = true;
  // Words (the default): the dead enemy shows its badge to the player.
  assert.equal(tokenStatus(context(state), goblin).vital, "dead");
  hideEnemyHealth(state);
  const hidden = tokenStatus(context(state), goblin);
  assert.equal(hidden.vital, "");
  assert.equal(hidden.text, "");
  resetTableView();
  const html = renderTable(context(state));
  const token = html.slice(html.indexOf('data-actor="goblin-1"'));
  assert.ok(!token.slice(0, token.indexOf("</g></g>")).includes("data-token-status"));
  // The DM always reads it; conditions stay public.
  assert.equal(tokenStatus(context(state, "dm"), goblin).vital, "dead");
  goblin.dead = false;
  goblin.hp = 7;
  goblin.conditions = [{ id: "prone" }];
  assert.equal(tokenStatus(context(state), goblin).vital, "conditions");
  // A player's own character is never an enemy: its state stays in view.
  state.actors.livia.hp = 0;
  state.actors.livia.dead = true;
  assert.equal(tokenStatus(context(state), state.actors.livia).vital, "dead");
});

test("PG-46: the hotbar shows HP (bar, numbers, a button to the HP widget), temporary HP and slots", () => {
  const state = createInitialState();
  const livia = state.actors.livia;
  livia.hp = 9;
  livia.maxHp = 22;
  livia.tempHp = 4;
  livia.spellSlots = { 1: { max: 4, used: 1 }, 2: { max: 2, used: 2 } };
  const it = hotbarVitals(context(state), livia);
  assert.match(it.hp, /data-table="hp"/);
  assert.match(it.hp, /PF <\/span>9\/22 \+4/);
  assert.match(it.hp, /is-low/);
  assert.match(it.slots, /livello 1 3\/4, livello 2 0\/2/);
  assert.equal((it.slots.match(/is-full/g) ?? []).length, 3);
  const en = hotbarVitals(context(state, "player", "en"), livia);
  assert.match(en.hp, /HP <\/span>9\/22 \+4/);
  resetTableView();
  const html = renderTable(context(state));
  assert.match(html, /class="hotbar-hp is-low"/);
  // An observed creature the viewer does not control has no hotbar HP.
  assert.deepEqual(hotbarVitals(context(state), null), { hp: "", slots: "" });
});

test("TV-05/TV-11: the idle status line teaches drag, pan, zoom and the Alt labels (IT, EN)", () => {
  const state = createInitialState();
  assert.match(idleHint(context(state)), /trascina il vuoto per spostare la vista/);
  assert.match(idleHint(context(state)), /rotellina o \+ e − per lo zoom/);
  assert.match(idleHint(context(state)), /tieni premuto Alt per le etichette/);
  assert.match(idleHint(context(state, "player", "en")), /hold Alt for labels/);
  resetTableView();
  const html = renderTable(context(state));
  assert.match(html, /aria-label="Centra la scena"[^>]*><svg class="icon"[^>]*><circle/);
  assert.match(
    html,
    /data-table="find-token" data-find-actor="livia"[^>]*aria-label="Trova la mia pedina"/,
  );
  assert.match(html, /data-table="scenes"|Riposi/);
});

test("TV-77: in combat a path warns where it leaves the reach of an enemy that can react", () => {
  const state = createInitialState();
  state.combat.active = true;
  const scene = state.scenes[0];
  const token = (id) => scene.tokens.find((t) => t.actorId === id);
  // The Sentinel (DM) walks away from Livia, who holds a quarterstaff (1.5 m reach).
  Object.assign(token("livia"), { x: 500, y: 300 });
  Object.assign(token("goblin-1"), { x: 540, y: 300 });
  const away = [
    { x: 540, y: 300 },
    { x: 700, y: 300 },
  ];
  const marks = opportunityWarnings(state, "goblin-1", away);
  assert.equal(marks.length, 1);
  assert.equal(marks[0].actorId, "livia");
  assert.equal(Math.round(marks[0].x), 550);
  // No reaction left, Disengage, an unseen enemy, or out of combat: no warning.
  state.actors.livia.reaction = false;
  assert.equal(opportunityWarnings(state, "goblin-1", away).length, 0);
  state.actors.livia.reaction = true;
  assert.equal(opportunityWarnings(state, "goblin-1", away, () => false).length, 0);
  state.actors["goblin-1"].combatEffects = [{ type: "disengage" }];
  assert.equal(opportunityWarnings(state, "goblin-1", away).length, 0);
  state.actors["goblin-1"].combatEffects = [];
  state.combat.active = false;
  assert.equal(opportunityWarnings(state, "goblin-1", away).length, 0);
  // Moving around inside the reach does not provoke; an ally never does.
  state.combat.active = true;
  assert.equal(
    opportunityWarnings(state, "goblin-1", [
      { x: 540, y: 300 },
      { x: 520, y: 320 },
    ]).length,
    0,
  );
  Object.assign(token("doran"), { x: 540, y: 340 });
  assert.equal(
    opportunityWarnings(state, "doran", [
      { x: 540, y: 340 },
      { x: 700, y: 340 },
    ]).length,
    0,
  );
});

function areaHarness() {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  assert.equal(registry.use(SM.ID, SMUI.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  return { registry, state: store.state };
}

test("TV-71: «Cadere» is always in Mosse speciali; from the ground it asks the height (1d6 per 3 m, Prone)", () => {
  const { state } = areaHarness();
  const ctx = { ...context(state), registry: null };
  const status = SMUI.moveStatus(ctx, "fall", "livia");
  assert.notEqual(status.shown, false);
  assert.equal(SM.altitudeOf(state, "livia"), 0);
  const six = SM.previewFall(state, { actorId: "livia", meters: 6 }, "player");
  assert.deepEqual([six.available, six.dice, six.formula, six.prone], [true, 2, "2d6", true]);
  const low = SM.previewFall(state, { actorId: "livia", meters: 2 }, "player");
  assert.deepEqual([low.dice, low.prone], [0, false]);
  assert.equal(SM.previewFall(state, { actorId: "livia", meters: 90 }, "player").dice, 20);
});

test("TV-11/TV-08: the «?» guide lists the Alt labels and the last move, found by their words", () => {
  const { registry } = areaHarness();
  const commands = registry.list("command", { role: "player", lang: "it" });
  const labels = commands.find((c) => c.id === "special-moves.labels");
  assert.ok(labels, "a command for the Alt labels");
  assert.equal(labels.shortcut, "Alt+L");
  assert.match(labels.label.it, /tieni premuto Alt/);
  assert.match(labels.description.it, /etichette/);
  const last = commands.find((c) => c.id === "special-moves.last-move");
  assert.equal(last.shortcut, "Shift+X");
  assert.match(last.description.it, /Ultima mossa/);
});
