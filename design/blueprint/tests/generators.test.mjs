// B57 — Assisted procedural generators: domain (seeds, FG/Kobold+ counts, Kobold+ 2024
// generation and 5e.tools adjust, donjon/Watabou dungeon, Forecast wall detection, donjon
// inns/settlements/names through the B25 tables engine, World entries) and the UI handlers
// (entry points, drafts, hand-offs to B19, Preparation's editor and the campaign World).
// Real store and registry with the areas it cooperates with. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import {
  validateSceneDraft,
  saveSceneDraft,
  renderPreparation,
  resetPreparationDraft,
  hasPreparationDraft,
  openSceneDraft,
  currentSceneDraft,
} from "../preparation.mjs";
import { validateSceneGeometry, isSegmentBlocked } from "../spatial.mjs";
import * as srd from "../srd-sample.mjs";
import * as tokenMenu from "../token-menu.mjs";
import * as loot from "../loot.mjs";
import * as compendium from "../compendium.mjs";
import * as EB from "../encounter-builder-domain.mjs";
import * as ebUI from "../encounter-builder.mjs";
import * as rt from "../random-tables.mjs";
import * as content from "../campaign-content.mjs";
import * as G from "../generators-domain.mjs";
import * as UI from "../generators.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
/** A die that returns the given faces in order (then 1). */
const faces = (...values) => {
  const queue = [...values];
  return (sides) => Math.min(sides, queue.shift() ?? 1);
};

function harness({ role = "dm", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
    registry.use("token-menu", tokenMenu.register);
    registry.use("loot", loot.register);
    registry.use("compendium", compendium.register);
    registry.use("encounter-builder", ebUI.register);
    registry.use("random-tables", rt.register);
    const row = registry.use("generators", UI.register);
    assert.equal(row.status, "built", row.error ?? "");
    const store = createStore({ storage });
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [];
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    rollDie: null,
    view: { page: "preparation", tab: "", id: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options, open: true }),
    closeDialog() {
      const last = dialogs.at(-1);
      if (last) last.open = false;
    },
    render() {},
    navigate(page, params = {}) {
      ctx.view = { id: "", tab: "", ...params, page };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach(ctx);
  UI.resetUi();
  resetPreparationDraft();
  return {
    ctx,
    toasts,
    dialogs,
    get store() {
      return store;
    },
    reload() {
      ({ registry, store } = boot());
      registry.attach(ctx);
    },
  };
}

// ---------------------------------------------------------------- seeds and counts

test("seeds are visible words, normalized, and reproduce the same stream", () => {
  assert.equal(G.normalizeSeed(" nebbia  4821! "), "NEBBIA-4821");
  assert.equal(G.normalizeSeed("Città-è"), "CITTA-E");
  assert.throws(
    () => G.requireSeed("  !! "),
    (e) => e.it.startsWith("Scrivi un seme"),
  );
  assert.equal(G.newSeed(faces(4, 5, 9, 3, 2)), "NEBBIA-4821");
  const a = G.randomFor("NEBBIA-4821", "x");
  const b = G.randomFor("nebbia 4821", "x");
  const c = G.randomFor("NEBBIA-4821", "y");
  const first = [a(), a(), a()];
  assert.deepEqual([b(), b(), b()], first);
  assert.notDeepEqual([c(), c(), c()], first);
});

test("FG N*$PC and Kobold+ ranges become dice for the party size", () => {
  const pc = 3;
  const form = (text) => G.countDice(G.parseCount(text), pc);
  assert.deepEqual(form("3"), { dice: [], constant: 3 });
  assert.deepEqual(form("2*$PC"), { dice: [], constant: 6 });
  assert.deepEqual(form("$PC*2+1"), { dice: [], constant: 7 });
  assert.deepEqual(form("1d4+1"), { dice: [4], constant: 1 });
  assert.deepEqual(form("2d6"), { dice: [6, 6], constant: 0 });
  // Kobold+ "players-players*2" with 3 characters: 3–6 = 1d4+2.
  assert.deepEqual(form("$PC..2*$PC"), { dice: [4], constant: 2 });
  assert.equal(G.diceText(form("$PC..2*$PC")), "1d4+2");
  assert.deepEqual(form("5..2"), { dice: [4], constant: 1 });
  for (const bad of ["", "d", "1d1", "-1d4", "1d4..3", "3..$PC..4", "x", "2**$PC"])
    assert.throws(
      () => G.parseCount(bad),
      (e) => e.it.startsWith("Quantità non valida"),
      bad,
    );
  const f = form("1d4+2");
  assert.deepEqual(G.countFromFaces(f, [3]), { count: 5, raw: 5, clamped: false });
  assert.throws(
    () => G.countFromFaces(f, [5]),
    (e) => e.en === "The d4 goes from 1 to 4.",
  );
  assert.throws(
    () => G.countFromFaces(f, []),
    (e) => e.en.startsWith("Enter one face"),
  );
  assert.deepEqual(G.countFromFaces(form("5*$PC+10"), []), { count: 20, raw: 25, clamped: true });
});

// ---------------------------------------------------------------- encounters (Kobold+)

test("Kobold+ Generate on the 2024 budget is reproducible from the seed and respects filters", () => {
  const input = {
    seed: "BRUMA-0001",
    levels: [3, 3, 3],
    difficulty: "moderate",
    type: "boss-minions",
  };
  const draft = G.generateEncounter(input);
  assert.deepEqual(G.generateEncounter(input), draft, "same seed and options, same draft");
  assert.deepEqual(draft.budget, srd.encounterBudget([3, 3, 3]));
  assert.equal(draft.target, Math.round(675 * G.KOBOLD_FUDGE));
  assert.equal(draft.pc, 3);
  const keys = draft.rows.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length, "no monster twice (Kobold+ monsterFilter)");
  const leader = draft.rows.find((r) => r.leader);
  assert.ok(leader && leader.count === 1);
  const minions = draft.rows.find((r) => r.expr === "$PC..2*$PC");
  assert.ok(minions.count >= 3 && minions.count <= 6, "minions between $PC and 2×$PC");
  assert.equal(
    draft.xp,
    draft.rows.reduce((s, r) => s + r.xp * r.count, 0),
  );
  assert.equal(draft.band, EB.bandFor(draft.xp, draft.budget));
  for (const [i, row] of draft.rows.entries())
    if (i) assert.ok(draft.rows[i - 1].crValue >= row.crValue, "sorted by CR");
  const undead = G.generateEncounter({ ...input, type: "trio", filters: { type: "undead" } });
  assert.ok(undead.rows.every((r) => srd.getById(r.ref.creatureId).type === "undead"));
  assert.throws(
    () => G.generateEncounter({ ...input, filters: { type: "dragon", crMax: "1" } }),
    (e) => e.it.startsWith("Nessuna creatura adatta"),
  );
  assert.throws(
    () => G.generateEncounter({ ...input, levels: [] }),
    (e) => e.en.includes("character"),
  );
  const other = G.generateEncounter({ ...input, seed: "BRUMA-0002", type: "horde" });
  assert.notDeepEqual(other.rows, draft.rows);
});

test("draft rows take manual, digital, physical and expression corrections, and 5e.tools adjust", () => {
  const draft = G.generateEncounter({
    seed: "GUADO-7777",
    levels: [3, 3, 3],
    type: "boss-minions",
  });
  const minions = draft.rows.find((r) => r.expr === "$PC..2*$PC");
  const manual = G.editEncounterRow(draft, minions.id, { mode: "manual", value: 2 });
  assert.equal(manual.rows.find((r) => r.id === minions.id).count, 2);
  assert.equal(manual.rows.find((r) => r.id === minions.id).source, "manual");
  assert.equal(draft.rows.find((r) => r.id === minions.id).count, minions.count, "immutable");
  assert.throws(() => G.editEncounterRow(draft, minions.id, { mode: "manual", value: 21 }));
  const digital = G.editEncounterRow(draft, minions.id, { mode: "digital" }, faces(4));
  assert.equal(digital.rows.find((r) => r.id === minions.id).count, 6);
  assert.equal(digital.rows.find((r) => r.id === minions.id).source, "digital");
  const physical = G.editEncounterRow(draft, minions.id, { mode: "physical", faces: [1] });
  assert.deepEqual(
    [
      physical.rows.find((r) => r.id === minions.id).count,
      physical.rows.find((r) => r.id === minions.id).source,
    ],
    [3, "physical"],
  );
  assert.throws(() => G.editEncounterRow(draft, minions.id, { mode: "physical", faces: [9] }));
  const expr = G.editEncounterRow(draft, minions.id, { mode: "expr", expr: "2*$PC" });
  assert.equal(expr.rows.find((r) => r.id === minions.id).count, 6);
  const leader = draft.rows.find((r) => r.leader);
  assert.throws(
    () => G.editEncounterRow(draft, leader.id, { mode: "digital" }),
    (e) => e.en.includes("no dice"),
  );
  const fewer = G.removeEncounterRow(draft, leader.id);
  assert.equal(fewer.rows.length, draft.rows.length - 1);
  assert.ok(fewer.xp < draft.xp);
  // A draft far under the band reaches it by adding copies (5e.tools Adjust to <Difficulty>).
  const low = G.editEncounterRow(fewer, minions.id, { mode: "manual", value: 1 });
  assert.notEqual(low.band, "moderate");
  const adjusted = G.adjustEncounterDraft(low);
  assert.equal(adjusted.band, "moderate");
  assert.ok(adjusted.rows.some((r) => r.source === "adjusted"));
  const [start, end] = G.bandWindow(adjusted.budget, "moderate");
  assert.ok(adjusted.xp >= start && adjusted.xp < end);
});

test("saving hands the draft to B19: new encounter with counts, party, summary; or rows appended", () => {
  const h = harness();
  const draft = G.generateEncounter({
    seed: "CORVO-1234",
    levels: [5, 5, 5, 5],
    party: { mode: "custom" },
    type: "duo",
  });
  let id;
  h.ctx.commit("save", (state) => {
    id = G.saveEncounterDraft(state.ext[EB.ID], draft, "dm", { name: "Agguato al guado" });
  });
  const saved = h.store.state.ext[EB.ID].encounters.find((e) => e.id === id);
  assert.equal(saved.name, "Agguato al guado");
  assert.deepEqual(saved.party, { mode: "custom", levels: [5, 5, 5, 5] });
  assert.match(saved.notes.summary, /seme CORVO-1234/);
  assert.deepEqual(
    saved.rows.map((r) => [r.creatureId, r.count]),
    draft.rows.map((r) => [r.ref.creatureId, r.count]),
  );
  const rating = EB.rateEncounter(h.store.state, h.store.state.ext[EB.ID], saved);
  assert.equal(rating.xp, draft.xp, "same XP in the builder");
  h.ctx.commit("append", (state) => {
    G.saveEncounterDraft(state.ext[EB.ID], draft, "dm", { into: "enc-lantern" });
  });
  const lantern = h.store.state.ext[EB.ID].encounters.find((e) => e.id === "enc-lantern");
  assert.ok(
    draft.rows.every((r) => lantern.rows.some((row) => row.creatureId === r.ref.creatureId)),
  );
  assert.throws(() => G.saveEncounterDraft(h.store.state.ext[EB.ID], draft, "player"));
  assert.throws(() => G.saveEncounterDraft(h.store.state.ext[EB.ID], { ...draft, rows: [] }, "dm"));
});

test("custom stat blocks of the builder join the Kobold+ pool", () => {
  const slice = {
    blocks: [
      {
        ...structuredClone(srd.getById("srd2024:creature:ghoul")),
        id: "block-mud",
        name: { it: "Ghoul del fango", en: "Mud ghoul" },
        custom: true,
      },
    ],
  };
  const pool = G.encounterPool(slice, { type: "undead", crMin: "1", crMax: "1" });
  assert.ok(pool.some((m) => m.ref.blockId === "block-mud"));
  assert.ok(pool.every((m) => m.block.type === "undead"));
});

// ---------------------------------------------------------------- dungeons

const cellsOf = (d) => d.region.flatMap((row, y) => row.map((v, x) => ({ x, y, v })));
test("donjon/Watabou dungeon: seed reproduces it; walls and doors are a valid scene", () => {
  const d = G.generateDungeon({ seed: "NEBBIA-4821" });
  assert.deepEqual(G.generateDungeon({ seed: "nebbia 4821" }), d);
  assert.notDeepEqual(G.generateDungeon({ seed: "NEBBIA-4822" }).region, d.region);
  assert.equal(d.width, 32 * 50);
  assert.ok(d.rooms.length >= 2);
  assert.equal(d.rooms[0].content, "entrance");
  const scene = G.dungeonScene(d, { id: "gen-test", lang: "it" });
  assert.deepEqual(validateSceneDraft(scene), []);
  assert.deepEqual(validateSceneGeometry(scene), []);
  assert.ok(scene.walls.filter((w) => w.kind === "door").every((w) => w.doorState === "closed"));
  assert.ok(scene.walls.every((w) => w.source.kind === "authored-demo"));
  assert.match(scene.description, /seme NEBBIA-4821/);
  assert.match(scene.description, /^1\. Ingresso/m);
  // Every room is reachable from room 1 through open floor and doors, never through walls.
  const open = new Set(
    cellsOf(d)
      .filter((c) => c.v !== 0)
      .map((c) => `${c.x},${c.y}`),
  );
  const blocked = (a, b) =>
    isSegmentBlocked(
      { ...scene, walls: scene.walls.filter((w) => w.kind === "wall") },
      { x: a.x * 50 + 25, y: a.y * 50 + 25 },
      { x: b.x * 50 + 25, y: b.y * 50 + 25 },
    );
  const start = { x: d.rooms[0].x, y: d.rooms[0].y };
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length) {
    const c = queue.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = `${n.x},${n.y}`;
      if (!open.has(k) || seen.has(k) || blocked(c, n)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  for (const room of d.rooms)
    assert.ok(seen.has(`${room.x},${room.y}`), `room ${room.id} reachable`);
  // Closed doors do block (the scene model), so the doors are real.
  const door = scene.walls.find((w) => w.kind === "door");
  const mid = { x: (door.a.x + door.b.x) / 2, y: (door.a.y + door.b.y) / 2 };
  const across =
    door.a.y === door.b.y
      ? [
          { x: mid.x, y: mid.y - 25 },
          { x: mid.x, y: mid.y + 25 },
        ]
      : [
          { x: mid.x - 25, y: mid.y },
          { x: mid.x + 25, y: mid.y },
        ];
  assert.equal(isSegmentBlocked(scene, ...across), true);
});

test("dungeon options: arches, locked and secret doors, sizes, and a refusal when rooms do not fit", () => {
  const arches = G.generateDungeon({ seed: "FARO-1", doors: "none" });
  assert.equal(arches.doors.length, 0);
  assert.ok(arches.arches.length > 0);
  let locked = 0,
    secret = 0;
  for (let i = 0; i < 12; i++) {
    const d = G.generateDungeon({
      seed: `FARO-${i}`,
      doors: "secure",
      secret: true,
      size: "large",
    });
    locked += G.dungeonStats(d).locked;
    secret += G.dungeonStats(d).secret;
    assert.ok(
      d.doors.filter((x) => x.secret).every((x) => !x.rooms.includes(1)),
      "entrance never secret",
    );
  }
  assert.ok(locked > 0 && secret > 0);
  const small = G.generateDungeon({ seed: "FARO-2", size: "small", rooms: "few" });
  assert.equal(small.width, 24 * 50);
  assert.throws(
    () => G.generateDungeon({ seed: "X", size: "huge" }),
    (e) => e.en.includes("options"),
  );
  const secretScene = G.dungeonScene(
    G.generateDungeon({ seed: "FARO-3", secret: true, size: "large" }),
    {},
  );
  assert.deepEqual(validateSceneGeometry(secretScene), []);
});

// ---------------------------------------------------------------- wall detection (Forecast)

/** Luminance blocks of a rendered dungeon: floor light, rock dark (half-cell blocks). */
function dungeonGrid(d, block = 25) {
  const per = d.cell / block;
  const cols = d.cols * per,
    rows = d.rows * per;
  const values = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      values[y * cols + x] = d.region[Math.floor(y / per)][Math.floor(x / per)] ? 196 : 34;
  return { cols, rows, block, values };
}
test("Forecast-like detection proposes walls on floor/rock boundaries, stable ids, per-wall confirmation", () => {
  const d = G.generateDungeon({ seed: "TORRE-5150", doors: "none" });
  const grid = dungeonGrid(d);
  const threshold = G.otsuThreshold(grid.values);
  assert.ok(threshold > 34 && threshold < 196);
  const fresh = G.detectWalls(grid, { minBlocks: 2 });
  assert.ok(fresh.length > 0);
  assert.ok(fresh.every((p) => !p.existing && p.length >= 50));
  assert.deepEqual(
    G.detectWalls(grid, { minBlocks: 2 }).map((p) => p.id),
    fresh.map((p) => p.id),
    "stable ids",
  );
  // Against the generator's own walls every floor/rock proposal is already present.
  const known = G.detectWalls(grid, { minBlocks: 2, existing: d.walls });
  assert.ok(known.every((p) => p.existing));
  // Only accepted proposals become walls, in the scene model with an authored source.
  const decisions = { [fresh[0].id]: "accepted", [fresh[1].id]: "rejected" };
  const walls = G.proposalsToWalls(fresh, decisions, "old-watch");
  assert.equal(walls.length, 1);
  assert.deepEqual(walls[0].a, fresh[0].a);
  assert.deepEqual(
    validateSceneGeometry({
      width: d.width,
      height: d.height,
      gridSize: 50,
      metersPerCell: 1.5,
      walls,
    }),
    [],
  );
  // A low-contrast image yields fewer proposals with a stricter minimum length.
  assert.ok(G.detectWalls(grid, { minBlocks: 8 }).length < fresh.length);
});

test("luminance blocks and Otsu threshold from raw RGBA pixels", () => {
  const width = 20,
    height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = x < 10 ? 20 : 220;
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  const grid = G.lumaBlocks(data, width, height, 5);
  assert.equal(grid.cols, 4);
  assert.equal(grid.rows, 2);
  const proposals = G.detectWalls(grid, { minBlocks: 2 });
  assert.equal(proposals.length, 1);
  assert.deepEqual(
    [proposals[0].a, proposals[0].b],
    [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
  );
});

// ---------------------------------------------------------------- inns, settlements, names

test("inns and settlements are drawn through the B25 tables engine, with the live rumour table", () => {
  const h = harness();
  const rtSlice = h.store.state.ext["random-tables"];
  const inn = G.generateSettlement("inn", { seed: "CANNETO-42", rtSlice });
  assert.deepEqual(G.generateSettlement("inn", { seed: "canneto 42", rtSlice }), inn);
  const rumour = inn.fields.find((f) => f.id === "rumour");
  assert.equal(rumour.steps[0].tableId, G.RUMOUR_TABLE);
  assert.ok(
    rtSlice.tables
      .find((t) => t.id === G.RUMOUR_TABLE)
      .results.some((r) => r.text.it === rumour.value.it),
    "the rumour is a row of B25 «Voci alla Lanterna»",
  );
  const name = inn.fields[0];
  assert.match(G.fieldText(name, "it"), / e /);
  assert.match(G.fieldText(name, "en"), / and /);
  assert.ok(inn.fields.every((f) => f.steps.every((s) => s.mode === "seed" && s.face >= 1)));
  const town = G.generateSettlement("town", { seed: "CANNETO-42", rtSlice });
  const size = town.fields.find((f) => f.id === "size");
  assert.match(G.fieldText(size, "it"), /abitanti/);
  const noRumour = G.generateSettlement("inn", { seed: "CANNETO-42", rtSlice: { tables: [] } });
  assert.ok(noRumour.fields.find((f) => f.id === "rumour").missing);
  assert.throws(() => G.generateSettlement("castle", { seed: "X" }));
});

test("settlement corrections: physical face, digital reroll, DM text; names are chosen", () => {
  const inn = G.generateSettlement("inn", { seed: "AIRONE-9" });
  const physical = G.editSettlementField(inn, null, "special", {
    mode: "physical",
    step: 0,
    face: 1,
  });
  const special = physical.fields.find((f) => f.id === "special");
  assert.deepEqual([special.steps[0].face, special.steps[0].mode], [1, "physical"]);
  assert.equal(special.value.it, "zuppa d’anguilla");
  assert.throws(
    () => G.editSettlementField(inn, null, "special", { mode: "physical", step: 0, face: 9 }),
    (e) => e.en.includes("from 1 to 8"),
  );
  const digital = G.editSettlementField(inn, null, "quirk", { mode: "digital", step: 0 }, faces(6));
  assert.deepEqual(
    [
      digital.fields.find((f) => f.id === "quirk").steps[0].face,
      digital.fields.find((f) => f.id === "quirk").steps[0].mode,
    ],
    [6, "digital"],
  );
  const text = G.editSettlementField(inn, null, "name", {
    mode: "text",
    text: "La Lanterna Rotta",
  });
  assert.equal(G.fieldText(text.fields[0], "en"), "La Lanterna Rotta");
  const names = G.generateSettlement("names", { seed: "AIRONE-9" });
  assert.equal(names.fields.length, G.NAME_COUNT);
  const two = G.toggleName(G.toggleName(names, "name-1", false), "name-2", false);
  assert.equal(G.settlementEntries(two, "it").length, G.NAME_COUNT - 2);
  assert.ok(G.settlementEntries(two).every((e) => e.worldType === "person"));
  const [entry] = G.settlementEntries(text, "it");
  assert.equal(entry.title, "La Lanterna Rotta");
  assert.equal(entry.worldType, "place");
  assert.match(entry.body, /seme AIRONE-9/);
});

test("saved places reach the campaign World with the chosen audience (DM vs player)", () => {
  const h = harness();
  const inn = G.generateSettlement("inn", {
    seed: "LANTERNA-3",
    rtSlice: h.store.state.ext["random-tables"],
  });
  const [entry] = G.settlementEntries(inn, "it");
  let result;
  h.ctx.commit("dms", (state) => {
    result = G.saveWorldEntries(state, [entry], "dms", "dm", { prefix: "gen-a" });
  });
  const hidden = result.ids[0];
  assert.equal(content.getCampaignEntry(h.store.state, hidden, "dm").data.worldType, "place");
  assert.throws(() => content.getCampaignEntry(h.store.state, hidden, "player"));
  h.ctx.commit("campaign", (state) => {
    result = G.saveWorldEntries(state, [entry], "campaign", "dm", { prefix: "gen-b" });
  });
  assert.equal(
    content.getCampaignEntry(h.store.state, result.ids[0], "player").data.title,
    entry.title,
  );
  assert.equal(result.commit.local, false);
  assert.throws(() => G.saveWorldEntries(h.store.state, [entry], "dms", "player"));
  assert.throws(() => G.saveWorldEntries(h.store.state, [], "dms", "dm"));
});

test("generator tables can be copied into B25 and the DM's edits drive the next draw", () => {
  const h = harness();
  h.ctx.commit("install", (state) => G.installGeneratorTables(state.ext["random-tables"], "dm"));
  const slice = h.store.state.ext["random-tables"];
  assert.deepEqual(G.installedTables(slice).length, G.GENERATOR_TABLES.length);
  h.ctx.commit("edit", (state) => {
    for (const r of state.ext["random-tables"].tables.find((t) => t.id === "gen-inn-special")
      .results)
      r.text = { it: "polenta e anguilla", en: "polenta and eel" };
  });
  const inn = G.generateSettlement("inn", {
    seed: "X-1",
    rtSlice: h.store.state.ext["random-tables"],
  });
  assert.equal(inn.fields.find((f) => f.id === "special").value.it, "polenta e anguilla");
  assert.equal(G.installGeneratorTables(h.store.state.ext["random-tables"], "dm"), 0);
  assert.throws(() => G.installGeneratorTables(slice, "player"));
});

// ---------------------------------------------------------------- UI handlers

test("entry points: «Genera…» beside «Nuova scena», «Genera incontro…» in the builder, DM only", () => {
  const h = harness();
  const on = (view) => {
    h.ctx.view = view;
    return h.ctx.registry
      .list("command", h.ctx)
      .filter((c) => c.context === "preparation" && c.group === "preparation-create")
      .map((c) => c.id);
  };
  assert.deepEqual(on({ page: "preparation", tab: "", id: "" }), ["generators.open"]);
  assert.deepEqual(on({ page: "preparation", tab: "encounter-builder", id: "" }), [
    "generators.encounter",
  ]);
  assert.deepEqual(on({ page: "preparation", tab: "random-tables", id: "" }), []);
  h.ctx.view = { page: "preparation", tab: "", id: "" };
  const html = renderPreparation(h.ctx);
  assert.match(
    html,
    /data-prep-command="generators.open"[^>]*>Genera…<\/button><button class="button primary" data-prep-new>/,
  );
  h.ctx.view = { page: "preparation", tab: "encounter-builder", id: "" };
  assert.match(renderPreparation(h.ctx), /data-prep-command="generators.encounter"/);
  assert.equal(h.ctx.registry.commandForKey("Mod+G", h.ctx)?.id, "generators.encounter");
  const player = harness({ role: "player" });
  player.ctx.view = { page: "preparation", tab: "", id: "" };
  assert.deepEqual(
    player.ctx.registry.list("command", player.ctx).filter((c) => c.id.startsWith("generators")),
    [],
  );
  assert.equal(UI.openGenerator(player.ctx), false);
  assert.ok(player.toasts.at(-1).error);
});

test("the panel shows the seed; Rigenera and the previous draft; options keep the seed", () => {
  const h = harness();
  h.ctx.rollDie = faces(1, 1, 2, 3, 4);
  assert.equal(UI.openGenerator(h.ctx, "dungeon"), true);
  assert.equal(h.dialogs.at(-1).options.cancelLabel, "Chiudi");
  const s = UI.uiState(h.ctx);
  const first = s.drafts.dungeon;
  assert.match(UI.panelHTML(h.ctx), new RegExp(`value="${first.seed}"`));
  assert.match(UI.panelHTML(h.ctx), /Bozza · non ancora in gioco/);
  h.ctx.rollDie = faces(2, 9, 9, 9, 9);
  UI.regenerate(h.ctx);
  assert.equal(s.seeds.dungeon, "LANTERNA-8888");
  assert.notDeepEqual(s.drafts.dungeon.region, first.region);
  assert.match(UI.panelHTML(h.ctx), /Bozza precedente/);
  assert.equal(UI.previousDraft(h.ctx), true);
  assert.deepEqual(s.drafts.dungeon, first);
  UI.regenerate(h.ctx, { seed: "own seed" });
  assert.equal(s.drafts.dungeon.seed, "OWN-SEED");
  assert.throws(() => UI.regenerate(h.ctx, { seed: "!!" }));
  // The panel's view state survives a reload of the tab (sessionStorage-like memory).
  const saved = { ...s.drafts };
  UI.resetUi();
  assert.equal(UI.uiState(h.ctx).drafts.dungeon, undefined, "no sessionStorage in Node");
  assert.ok(saved.dungeon);
});

test("encounter panel: campaign party, save to B19 opens it there; Undo removes it", () => {
  const h = harness();
  h.ctx.view = { page: "preparation", tab: "encounter-builder", id: "" };
  UI.openGenerator(h.ctx, "encounter", { encounterId: null });
  const s = UI.uiState(h.ctx);
  const party = UI.partyFor(h.ctx);
  assert.deepEqual(
    party.members.map((m) => m.name),
    EB.campaignParty(h.store.state).map((m) => m.name),
  );
  assert.deepEqual(s.drafts.encounter.levels, party.levels);
  const html = UI.panelHTML(h.ctx);
  assert.match(html, /Budget 2024 per 3 personaggi/);
  assert.match(html, /Salva come nuovo incontro/);
  assert.doesNotMatch(html, /Aggiungi a «/);
  const before = h.store.state.ext[EB.ID].encounters.length;
  const id = UI.saveEncounter(h.ctx);
  assert.ok(id);
  assert.equal(h.store.state.ext[EB.ID].encounters.length, before + 1);
  assert.equal(ebUI.uiState(h.ctx).openId, id);
  assert.deepEqual(h.ctx.view, { id: "", tab: "encounter-builder", page: "preparation" });
  assert.equal(h.dialogs.at(-1).open, false);
  assert.equal(h.store.state.log.at(-1).visibility, "private", "prep label stays private");
  h.ctx.undo();
  assert.equal(h.store.state.ext[EB.ID].encounters.length, before);
});

test("encounter panel inside an open encounter uses its party and can append to it", () => {
  const h = harness();
  h.ctx.view = { page: "preparation", tab: "encounter-builder", id: "" };
  ebUI.uiState(h.ctx).openId = "enc-lantern";
  h.ctx.registry.run(h.ctx.registry.get("command", "generators.encounter", h.ctx), h.ctx);
  const s = UI.uiState(h.ctx);
  assert.equal(s.into, "enc-lantern");
  assert.equal(s.options.encounter.party, "encounter");
  assert.match(UI.panelHTML(h.ctx), /Aggiungi a «Chi ha riacceso la lanterna»/);
  const rows = h.store.state.ext[EB.ID].encounters.find((e) => e.id === "enc-lantern").rows.length;
  UI.saveEncounter(h.ctx, { into: true });
  const after = h.store.state.ext[EB.ID].encounters.find((e) => e.id === "enc-lantern").rows.length;
  assert.equal(after, rows + s.drafts.encounter.rows.length);
});

test("dungeon hand-off opens an unsaved scene draft in Preparation's editor; Save creates the scene", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "dungeon");
  UI.regenerate(h.ctx, { seed: "CORVO-2468" });
  const draft = UI.uiState(h.ctx).drafts.dungeon;
  const id = UI.openDungeonDraft(h.ctx);
  assert.ok(id.startsWith("gen-dungeon-corvo-2468-"));
  assert.deepEqual(h.ctx.view, { id, tab: "edit", page: "preparation" });
  assert.equal(hasPreparationDraft(), true);
  assert.equal(
    h.store.state.scenes.some((s) => s.id === id),
    false,
    "nothing saved yet",
  );
  const editor = renderPreparation(h.ctx);
  assert.match(editor, /Nuova bozza riservata/);
  assert.match(editor, new RegExp(draft.name.it));
  assert.match(editor, /Modifiche non salvate/);
  // The editor's save path (the same function its button calls) creates the scene.
  const scene = G.dungeonScene(draft, { id: "gen-dungeon-saved", lang: "it" });
  h.ctx.commit("save", (state) => saveSceneDraft(state, scene, "dm", null));
  const saved = h.store.state.scenes.find((s) => s.id === "gen-dungeon-saved");
  assert.equal(saved.walls.length, draft.walls.length + draft.doors.length);
  assert.equal(saved.revealed, false, "private until the DM reveals it");
  h.ctx.undo();
  assert.equal(
    h.store.state.scenes.some((s) => s.id === "gen-dungeon-saved"),
    false,
  );
});

test("walls panel: proposals confirmed one by one go into the scene draft, not the scene", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "walls");
  const scene = h.store.state.scenes.find((s) => s.id === "old-watch");
  UI.uiState(h.ctx).options.walls.sceneId = scene.id;
  // A synthetic analysis of the courtyard: a light rectangle on dark ground.
  const block = 25,
    cols = scene.width / block,
    rows = Math.floor(scene.height / block);
  const values = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      values[y * cols + x] = x >= 4 && x < 36 && y >= 3 && y < 23 ? 150 : 60;
  const analysis = UI.analyseGrid(h.ctx, scene, { cols, rows, block, values });
  assert.equal(analysis.proposals.length, 4, "the four sides of the courtyard");
  UI.uiState(h.ctx).analysis = analysis;
  const [a, b, c] = analysis.proposals;
  UI.decideProposal(h.ctx, a.id, "accepted");
  UI.decideProposal(h.ctx, b.id, "accepted");
  UI.decideProposal(h.ctx, c.id, "rejected");
  UI.decideProposal(h.ctx, b.id, "accepted"); // pressing again returns it to "to decide"
  const html = UI.panelHTML(h.ctx);
  assert.match(html, /4 proposte · 1 confermate · 1 scartate · 2 da decidere/);
  assert.match(html, /Aggiungi 1 muro confermato alla bozza/);
  assert.equal(UI.openWallsDraft(h.ctx), 1);
  assert.deepEqual(h.ctx.view, { id: "old-watch", tab: "edit", page: "preparation" });
  assert.equal(hasPreparationDraft(), true);
  assert.equal(
    h.store.state.scenes.find((s) => s.id === "old-watch").walls.length,
    0,
    "scene unchanged until saved",
  );
  assert.match(renderPreparation(h.ctx), /Modifiche non salvate/);
});

test("World save from the panel: navigates to the entry; offline refuses a shared save", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "inn");
  const s = UI.uiState(h.ctx);
  UI.regenerate(h.ctx, { seed: "PALUDE-11" });
  UI.settlementCommand(h.ctx, "name", { mode: "text", text: "Il Salice Stanco" });
  assert.match(UI.panelHTML(h.ctx), /modificato dal DM/);
  h.ctx.offline = true;
  s.options.world.access = "campaign";
  assert.equal(UI.saveWorld(h.ctx), null);
  assert.match(s.error, /richiede connessione/);
  h.ctx.offline = false;
  const ids = UI.saveWorld(h.ctx);
  assert.equal(ids.length, 1);
  assert.deepEqual(h.ctx.view, { id: ids[0], tab: "entry", page: "campaign" });
  const entry = content.getCampaignEntry(h.store.state, ids[0], "player");
  assert.equal(entry.data.title, "Il Salice Stanco");
  h.reload();
  assert.equal(
    content.getCampaignEntry(h.store.state, ids[0], "dm").data.title,
    "Il Salice Stanco",
  );
});

test("names panel saves only the chosen names; «Modifica le tabelle» copies them to B25", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "names");
  const s = UI.uiState(h.ctx);
  for (let i = 3; i <= G.NAME_COUNT; i++) UI.settlementCommand(h.ctx, `name-${i}`, { pick: false });
  assert.match(UI.panelHTML(h.ctx), /Salva 2 nomi come persone nel Mondo/);
  const ids = UI.saveWorld(h.ctx);
  assert.equal(ids.length, 2);
  assert.deepEqual(h.ctx.view, { id: "", tab: "world", page: "campaign" });
  UI.openGenerator(h.ctx, "inn");
  assert.equal(UI.editTables(h.ctx), true);
  assert.equal(
    G.installedTables(h.store.state.ext["random-tables"]).length,
    G.GENERATOR_TABLES.length,
  );
  assert.deepEqual(h.ctx.view, {
    id: "table:gen-inn-first",
    tab: "random-tables",
    page: "preparation",
  });
  assert.ok(s);
});

test("the scene list opened from the campaign sidebar (tab «preparation») shows «Genera…»", () => {
  const h = harness();
  h.ctx.view = { page: "preparation", tab: "preparation", id: "" };
  assert.match(renderPreparation(h.ctx), /data-prep-command="generators.open"/);
  h.ctx.view = { page: "preparation", tab: "edit", id: "old-watch" };
  const editor = renderPreparation(h.ctx);
  assert.doesNotMatch(editor, /data-prep-command="generators\.(open|encounter)"/);
  assert.equal(editor.match(/data-prep-command=/g).length, 1, "only «Rileva i muri…»");
});

// ---------------------------------------------------------------- review fixes (B57-rf)

test("a draft made for an open encounter's own party keeps that party when saved as a new encounter", () => {
  const h = harness();
  h.ctx.view = { page: "preparation", tab: "encounter-builder", id: "" };
  h.ctx.commit("prep", (state) => {
    const slice = state.ext[EB.ID];
    const encounter = EB.createEncounter(slice, "dm", {
      name: "Quattro al quinto",
      id: "enc-five",
    });
    EB.setParty(slice, "dm", encounter.id, { mode: "custom", levels: [5, 5, 5, 5] });
  });
  ebUI.uiState(h.ctx).openId = "enc-five";
  UI.openGenerator(h.ctx, "encounter", { encounterId: "enc-five" });
  const draft = UI.uiState(h.ctx).drafts.encounter;
  assert.deepEqual(draft.levels, [5, 5, 5, 5], "budget of the open encounter's party");
  const id = UI.saveEncounter(h.ctx);
  const slice = h.store.state.ext[EB.ID];
  const rating = EB.rateEncounter(h.store.state, slice, EB.encounterById(slice, id));
  assert.deepEqual(
    rating.party.members.map((m) => m.level),
    [5, 5, 5, 5],
    "the new encounter is rated for the same party",
  );
  assert.equal(rating.band, draft.band, "B19 shows the difficulty the generator showed");
  // A draft for the campaign party keeps B19's live campaign party (no frozen levels).
  UI.openGenerator(h.ctx, "encounter", { encounterId: null });
  const campaignId = UI.saveEncounter(h.ctx);
  assert.equal(EB.encounterById(h.store.state.ext[EB.ID], campaignId).party.mode, "campaign");
});

/** A courtyard analysis (light rectangle on dark ground) with the first proposal accepted. */
function courtyardDecision(h) {
  const scene = h.store.state.scenes.find((s) => s.id === "old-watch");
  const block = 25,
    cols = scene.width / block,
    rows = Math.floor(scene.height / block);
  const values = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      values[y * cols + x] = x >= 4 && x < 36 && y >= 3 && y < 23 ? 150 : 60;
  const s = UI.uiState(h.ctx);
  s.options.walls.sceneId = scene.id;
  s.analysis = UI.analyseGrid(h.ctx, scene, { cols, rows, block, values });
  UI.decideProposal(h.ctx, s.analysis.proposals[0].id, "accepted");
  return { scene, s, proposal: s.analysis.proposals[0] };
}

test("walls go into the editor's unsaved draft of the same scene without discarding it", () => {
  const h = harness();
  const saved = h.store.state.scenes.find((s) => s.id === "old-watch");
  // The DM is editing the courtyard: an unsaved rename and a wall drawn by hand.
  const drawn = {
    id: "hand-drawn",
    kind: "wall",
    a: { x: 100, y: 100 },
    b: { x: 200, y: 100 },
    blocksMovement: true,
    blocksSight: true,
    blocksEffect: true,
    secret: false,
  };
  openSceneDraft(h.ctx, saved, { name: "Cortile rinominato", walls: [drawn] });
  assert.equal(hasPreparationDraft(), true);
  UI.openGenerator(h.ctx, "walls");
  const { s, proposal } = courtyardDecision(h);
  const dialogs = h.dialogs.length;
  assert.equal(UI.openWallsDraft(h.ctx), 1);
  assert.equal(h.dialogs.length, dialogs, "no «Discard changes?» for the same scene");
  const draft = currentSceneDraft();
  assert.equal(draft.name, "Cortile rinominato", "the DM's unsaved rename is kept");
  assert.deepEqual(
    draft.walls.map((w) => w.id),
    ["hand-drawn", `det-old-watch-${proposal.id}`],
  );
  assert.equal(s.decisions["old-watch"], undefined, "decisions cleared once handed over");
  // Handing the same confirmed walls over again does not duplicate them.
  courtyardDecision(h);
  UI.openWallsDraft(h.ctx);
  assert.equal(currentSceneDraft().walls.length, 2);
  assert.equal(h.store.state.scenes.find((x) => x.id === "old-watch").walls.length, 0);
});

test("walls for another scene wait for «Discard changes?»; cancelling keeps the confirmed proposals", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "dungeon");
  UI.regenerate(h.ctx, { seed: "CORVO-2468" });
  UI.openDungeonDraft(h.ctx); // an unsaved new scene in the editor
  const toasts = h.toasts.length;
  UI.openGenerator(h.ctx, "walls");
  const { s, proposal } = courtyardDecision(h);
  UI.openWallsDraft(h.ctx);
  const confirm = h.dialogs.at(-1);
  assert.equal(confirm.options.submitLabel, "Scarta modifiche");
  assert.equal(s.decisions["old-watch"][proposal.id], "accepted", "kept until the hand-off");
  assert.equal(h.toasts.length, toasts, "no «walls in the draft» toast before the hand-off");
  confirm.options.onSubmit();
  assert.deepEqual(
    currentSceneDraft().walls.map((w) => w.id),
    [`det-old-watch-${proposal.id}`],
  );
  assert.equal(s.decisions["old-watch"], undefined);
  assert.match(h.toasts.at(-1).text, /^1 muro nella bozza/);
});

test("Forecast from the scene editor: «Rileva i muri…» beside the map tools analyses the draft shown", () => {
  const h = harness();
  const saved = h.store.state.scenes.find((s) => s.id === "old-watch");
  h.ctx.view = { page: "preparation", tab: "", id: "" };
  assert.doesNotMatch(renderPreparation(h.ctx), /generators\.walls-here/, "not on the list");
  h.ctx.view = { page: "preparation", tab: "edit", id: "old-watch" };
  const editor = renderPreparation(h.ctx);
  assert.match(
    editor,
    /class="spatial-toolbar"[\s\S]*data-prep-command="generators\.walls-here"[^>]*>Rileva i muri…</,
  );
  h.ctx.view = { page: "preparation", tab: "", id: "old-watch" };
  assert.match(renderPreparation(h.ctx), /generators\.walls-here/, "editor route without a tab");
  h.ctx.view = { page: "preparation", tab: "preview", id: "old-watch" };
  assert.doesNotMatch(renderPreparation(h.ctx), /generators\.walls-here/, "not in the preview");
  h.ctx.view = { page: "preparation", tab: "random-tables", id: "table:lantern-rumours" };
  assert.doesNotMatch(renderPreparation(h.ctx), /generators\.walls-here/, "not in a section");
  // The unsaved draft (another base drawing) is what gets analysed.
  h.ctx.view = { page: "preparation", tab: "edit", id: "old-watch" };
  openSceneDraft(h.ctx, saved, { template: "camp", name: "Cortile in bozza" });
  h.ctx.registry.run(h.ctx.registry.get("command", "generators.walls-here", h.ctx), h.ctx);
  const s = UI.uiState(h.ctx);
  assert.equal(s.kind, "walls");
  assert.equal(s.options.walls.sceneId, "old-watch");
  const scene = UI.wallsScene(h.ctx);
  assert.equal(scene.template, "camp", "the editor's unsaved map, not the saved one");
  assert.match(UI.panelHTML(h.ctx), /Cortile in bozza · bozza non salvata/);
  // The palette's «Genera: Muri da mappa» from the editor starts on the edited scene too.
  UI.uiState(h.ctx).options.walls.sceneId = "elsewhere";
  h.ctx.registry.run(h.ctx.registry.get("command", "generators.walls", h.ctx), h.ctx);
  assert.equal(UI.uiState(h.ctx).options.walls.sceneId, "old-watch");
  // A new unsaved scene (a generated dungeon draft) can be analysed from its editor too.
  UI.openGenerator(h.ctx, "dungeon");
  UI.regenerate(h.ctx, { seed: "CORVO-2468" });
  h.dialogs.at(-1).open = false;
  const id = UI.openDungeonDraft(h.ctx);
  const pending = h.dialogs.at(-1);
  if (pending.open && pending.options.onSubmit) pending.options.onSubmit();
  h.ctx.view = { page: "preparation", tab: "edit", id };
  h.ctx.registry.run(h.ctx.registry.get("command", "generators.walls-here", h.ctx), h.ctx);
  assert.equal(UI.wallsScene(h.ctx).id, id);
});

test("EN budget line uses English decimals and quotes; «Bozza precedente» restores the options", () => {
  const h = harness({ lang: "en" });
  UI.openGenerator(h.ctx, "encounter");
  const html = UI.panelHTML(h.ctx);
  assert.match(html, /× 1\.15 =/);
  assert.doesNotMatch(html, /1,15|«/);
  const it = harness();
  UI.openGenerator(it.ctx, "encounter");
  assert.match(UI.panelHTML(it.ctx), /× 1,15 =/);
  // Options change → same seed, new draft; «Bozza precedente» brings back its options too.
  UI.openGenerator(h.ctx, "dungeon");
  const s = UI.uiState(h.ctx);
  UI.regenerate(h.ctx, { seed: "FARO-7" });
  s.options.dungeon.doors = "secure";
  UI.regenerate(h.ctx, { seed: "FARO-7" });
  assert.equal(s.drafts.dungeon.options.doors, "secure");
  UI.previousDraft(h.ctx);
  assert.equal(s.drafts.dungeon.options.doors, "basic");
  assert.equal(s.options.dungeon.doors, "basic", "the options shown match the draft");
  assert.deepEqual(UI.regenerate(h.ctx, { seed: "FARO-7" }), s.drafts.dungeon);
  // Corrections keep at most ten previous drafts, like regenerations.
  UI.openGenerator(h.ctx, "encounter");
  const row = s.drafts.encounter.rows[0];
  for (let i = 0; i < 15; i++)
    UI.encounterRowCommand(h.ctx, row.id, { mode: "manual", value: (i % 3) + 1 });
  assert.ok(s.history.encounter.length <= 10);
  // Singular and plural in the sentences (walls, names).
  UI.openGenerator(h.ctx, "names");
  for (let i = 2; i <= G.NAME_COUNT; i++) UI.settlementCommand(h.ctx, `name-${i}`, { pick: false });
  assert.match(UI.panelHTML(h.ctx), /Save 1 name as a person in the World/);
});

test("drafts, seeds and names survive a reload of the browser tab (sessionStorage)", () => {
  const session = memory();
  globalThis.sessionStorage = session;
  try {
    const h = harness();
    UI.openGenerator(h.ctx, "inn");
    UI.regenerate(h.ctx, { seed: "CANNETO-42" });
    UI.settlementCommand(h.ctx, "name", { mode: "text", text: "Il Salice Stanco" });
    const before = UI.uiState(h.ctx).drafts.inn;
    UI.resetUi(); // a reload: module state gone, the tab's session remains
    const after = UI.uiState(h.ctx);
    assert.equal(after.kind, "inn");
    assert.equal(after.seeds.inn, "CANNETO-42");
    assert.deepEqual(after.drafts.inn, before);
    assert.equal(G.fieldText(after.drafts.inn.fields[0], "it"), "Il Salice Stanco");
    // Each role keeps its own view state.
    assert.equal(session.getItem("d20-generators:player"), null);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("a range whose die is not a standard one tells how to roll it physically", () => {
  assert.equal(G.physicalDieFor(4), null);
  assert.deepEqual(G.physicalDieFor(5), { die: 6, rerollAbove: 5 });
  assert.deepEqual(G.physicalDieFor(3), { die: 4, rerollAbove: 3 });
  assert.deepEqual(G.physicalDieFor(17), { die: 20, rerollAbove: 17 });
  const h = harness();
  const s = UI.uiState(h.ctx);
  Object.assign(s.options.encounter, { party: "custom", pcCount: 4, pcLevel: 3 });
  Object.assign(s.options.encounter, { type: "boss-minions" });
  UI.openGenerator(h.ctx, "encounter");
  UI.regenerate(h.ctx, { seed: "GUADO-1234" });
  const minions = s.drafts.encounter.rows.find((r) => r.expr === "$PC..2*$PC");
  assert.deepEqual(minions.form, { dice: [5], constant: 3 }, "4–8 with four characters");
  assert.match(UI.panelHTML(h.ctx), /d5 <span class="muted">\(con un d6: ritira oltre 5\)<\/span>/);
});
