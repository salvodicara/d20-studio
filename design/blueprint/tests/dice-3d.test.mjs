// B56 animated dice: geometry (every die lands on the recorded face), presentation domain
// (who sees what, DC and verdict read from the accepted record, physical never animated),
// the demo's records (validation, reasoned correction/withdrawal, reuse after withdrawal)
// and the Table drawer handlers through a small fake DOM with the real store and the real
// registry. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as geo from "../dice-3d-geometry.mjs";
import * as domain from "../dice-3d-domain.mjs";
import * as dice from "../dice-3d.mjs";
import * as B22 from "../preferences.mjs";

afterEach(() => {
  dice.clearDice();
  dice.resetDiceUI();
  B22.resetPreferencesView?.();
  focused = null;
});
// The control the drawer last focused (fake DOM below).
let focused = null;

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};

// ---------------------------------------------------------------- geometry

const KINDS = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

test("every die is a real convex polyhedron with planar faces and real numbering", () => {
  for (const [kind, sides] of Object.entries(KINDS)) {
    const mesh = geo.getMesh(kind);
    assert.equal(mesh.faces.length, kind === "d4" ? 4 : sides, kind);
    for (const face of mesh.faces) {
      for (const i of face.indices)
        assert.ok(
          Math.abs(geo.dot(geo.sub(mesh.vertices[i], face.center), face.normal)) < 1e-9,
          `${kind} face not planar`,
        );
      // Outward normal and convexity: every vertex lies behind every face plane.
      assert.ok(geo.dot(face.normal, face.center) > 0, `${kind} normal points inward`);
      for (const v of mesh.vertices)
        assert.ok(geo.dot(geo.sub(v, face.center), face.normal) < 1e-9, `${kind} not convex`);
    }
    if (kind === "d4") {
      assert.deepEqual([...mesh.vertexValues].sort(), [1, 2, 3, 4]);
      continue;
    }
    const values = mesh.faces.map((f) => f.value).sort((a, b) => a - b);
    const expected =
      kind === "d10"
        ? Array.from({ length: 10 }, (_, i) => i)
        : Array.from({ length: sides }, (_, i) => i + 1);
    assert.deepEqual(values, expected, `${kind} numbering`);
    // Opposite faces sum to n + 1 (d10 digits to 9), as on physical dice.
    for (const face of mesh.faces) {
      const opposite = mesh.faces.find((f) => geo.dot(f.normal, face.normal) < -0.999);
      assert.equal(face.value + opposite.value, kind === "d10" ? 9 : sides + 1, kind);
    }
  }
});

test("a die at rest shows exactly the recorded face, whatever the yaw", () => {
  for (const [kind] of Object.entries(KINDS)) {
    const mesh = geo.getMesh(kind);
    const faces = kind === "d4" ? mesh.vertexValues : mesh.faces.map((f) => f.value);
    for (const face of faces)
      for (const yaw of [0, 0.4, -0.45]) {
        const matrix = geo.restingMatrix(mesh, face, yaw);
        assert.equal(geo.upValue(mesh, matrix), face, `${kind} ${face} yaw ${yaw}`);
      }
  }
});

test("the percentile die is two d10s and reads back every value 1–100", () => {
  for (let value = 1; value <= 100; value++) {
    const bodies = geo.physicalDice(100, value);
    assert.equal(bodies.length, 2);
    assert.deepEqual(
      bodies.map((b) => b.labels),
      ["tens", "units"],
    );
    for (const body of bodies) {
      const mesh = geo.getMesh(body.kind);
      assert.equal(geo.upValue(mesh, geo.restingMatrix(mesh, body.face, 0.3)), body.face);
    }
    assert.equal(
      geo.readPhysical(
        100,
        bodies.map((b) => b.face),
      ),
      value,
    );
  }
  assert.deepEqual(
    geo.physicalDice(100, 100).map((b) => geo.faceLabel(b.face, b.labels)),
    ["00", "0"],
  );
  assert.deepEqual(
    geo.physicalDice(100, 57).map((b) => geo.faceLabel(b.face, b.labels)),
    ["50", "7"],
  );
  assert.equal(geo.faceLabel(geo.physicalDice(10, 10)[0].face, "d10"), "10");
  assert.equal(geo.readPhysical(10, [0]), 10);
  assert.deepEqual(geo.physicalDice(3, 2), [], "no invented 3D shape for a d3");
  assert.deepEqual(geo.physicalDice(20, 21), [], "an impossible face is not drawn");
});

test("the tumble path ends exactly in the resting orientation, and moves before", () => {
  const mesh = geo.getMesh("d20");
  const final = geo.restingMatrix(mesh, 17, 0.2);
  const path = geo.tumblePath({ from: [0, 900], to: [400, 300], final, turns: 3, lift: 90 });
  const end = path(1);
  assert.deepEqual(end.matrix, final);
  assert.equal(end.height, 0);
  assert.deepEqual([end.x, end.y], [400, 300]);
  assert.ok(end.done);
  const middle = path(0.3);
  assert.notDeepEqual(middle.matrix, final);
  assert.ok(middle.height > 0 && !middle.done);
  assert.equal(geo.upValue(mesh, path(1).matrix), 17);
});

test("drawing prints the recorded numeral upright on the top face (not mirrored)", () => {
  const calls = [];
  const g = {
    save() {},
    restore() {},
    setTransform(...m) {
      this.m = m;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillRect() {},
    ellipse() {},
    measureText: (t) => ({ width: t.length * 10 }),
    fillText(text) {
      calls.push({ text, m: this.m });
    },
  };
  const mesh = geo.getMesh("d20");
  geo.drawDie(g, mesh, {
    matrix: geo.restingMatrix(mesh, 20, 0),
    x: 200,
    y: 200,
    size: 80,
    colors: { body: "#c9a14f", ink: "#241a08" },
  });
  const top = projectedTop(mesh, geo.restingMatrix(mesh, 20, 0));
  const label = calls.find((c) => c.text === "20");
  assert.ok(label, "the result numeral is drawn");
  const [a, b, c, d] = label.m;
  assert.ok(a * d - b * c > 0, "numeral transform keeps handedness (no mirror)");
  assert.ok(Math.abs(b) < 1e-6 && d > 0, "upright: text down is screen down");
  assert.equal(top, 20);
});
function projectedTop(mesh, matrix) {
  const { faces } = geo.projectDie(mesh, { matrix, x: 0, y: 0, size: 50 });
  return faces.at(-1).face.value;
}

// ---------------------------------------------------------------- presentation domain

function baseState() {
  const store = createStore({ storage: { getItem: () => null, setItem() {} } });
  return structuredClone(store.state);
}
const attackRoll = (extra = {}) => ({
  id: "c1:0",
  source: "combat",
  kind: "attack",
  attemptId: "att-1",
  requestId: "att-1-attack-livia-0",
  actionName: { it: "Dardo di fuoco", en: "Fire Bolt" },
  actorId: "livia",
  actorName: "Livia",
  controller: "player",
  owner: "player",
  visibility: "shared",
  mode: "digital",
  dice: [{ count: 1, sides: 20 }],
  values: [14],
  modifier: 5,
  natural: 14,
  total: 19,
  rollMode: "normal",
  ...extra,
});
function withAttempt(state, attempt) {
  state.combatAttempts = [
    {
      id: "att-1",
      actorId: "livia",
      actorName: "Livia",
      actionId: "fire-bolt",
      actionName: { it: "Dardo di fuoco", en: "Fire Bolt" },
      mode: "digital",
      status: "resolved",
      requests: [],
      outcomes: [],
      targets: [],
      selection: { targetIds: [], allocations: [] },
      cost: {},
      geometry: null,
      source: null,
      ...attempt,
    },
  ];
  return state;
}

test("a digital attack tumbles, lands on its face and reads hit/miss from the record", () => {
  const state = withAttempt(baseState(), {
    targets: [{ actorId: "goblin-1", knownToPlayer: true, targetAC: 13 }],
    outcomes: [{ actorId: "goblin-1", hit: true, critical: false, status: "applied" }],
  });
  const view = domain.describeRoll(state, attackRoll(), "player");
  assert.equal(view.layout, "tumble");
  assert.equal(view.animate, true);
  assert.deepEqual(
    view.dice.map((d) => [d.sides, d.value]),
    [[20, 14]],
  );
  assert.equal(view.total, 19);
  assert.deepEqual(view.outcome, { it: "Colpito", en: "Hit" });
  assert.equal(view.title.it, "Attacco · Dardo di fuoco");
  const scene = dice.buildScene(ctxStub(state, "player"), [view]);
  assert.deepEqual(
    scene.dice.map((d) => [d.kind, d.face]),
    [["d20", 14]],
  );
});

test("advantage keeps the recorded d20 and dims the other one", () => {
  const view = domain.describeRoll(
    baseState(),
    attackRoll({
      dice: [{ count: 2, sides: 20 }],
      values: [6, 17],
      natural: 17,
      total: 22,
      rollMode: "advantage",
    }),
    "player",
  );
  assert.deepEqual(
    view.dice.map((d) => d.kept),
    [false, true],
  );
  assert.match(view.lines[0].it, /Vantaggio/);
});

test("a save with a DC shows DC and the recorded outcome, never a new rule", () => {
  const state = withAttempt(baseState(), {
    actorId: "livia",
    actionId: "burning-hands",
    actionName: { it: "Mani brucianti", en: "Burning Hands" },
    targets: [{ actorId: "goblin-1", knownToPlayer: true, saveDC: 13, saveModifier: 2 }],
    outcomes: [{ actorId: "goblin-1", saveSuccess: false, status: "applied" }],
  });
  const roll = {
    id: "c2:0",
    source: "combat",
    kind: "save",
    attemptId: "att-1",
    requestId: "att-1-save-goblin-1-1",
    actorId: "goblin-1",
    actorName: "Sentinella",
    controller: "dm",
    owner: "dm",
    visibility: "private",
    mode: "digital",
    dice: [{ count: 1, sides: 20 }],
    values: [2],
    modifier: 2,
    natural: 2,
    total: 4,
    rollMode: "normal",
  };
  const view = domain.describeRoll(state, roll, "dm");
  // A creature's save rolls on the table (the BG3 screen is for heroes, see below).
  assert.equal(view.layout, "tumble");
  assert.equal(view.dc, 13);
  assert.equal(view.success, false);
  assert.deepEqual(view.verdict, { it: "Fallimento", en: "Failure" });
  assert.equal(view.title.it, "Tiro salvezza su Destrezza · Mani brucianti");
  // The DM's hidden roll never reaches the player's screen.
  assert.equal(domain.describeRoll(state, roll, "player"), null);
  // Without a recorded outcome the SRD comparison (total ≥ DC) is the fallback.
  state.combatAttempts[0].outcomes = [];
  const fallback = domain.describeRoll(state, { ...roll, values: [13], total: 15 }, "dm");
  assert.equal(fallback.success, true);
});

test("concentration and death saves read DC and result from the accepted request", () => {
  const state = withAttempt(baseState(), {
    requests: [
      {
        id: "att-1-concentration-livia-2",
        kind: "concentration",
        actorId: "livia",
        dc: 10,
        success: true,
        damage: 5,
        concentrationName: { it: "Benedizione", en: "Bless" },
      },
    ],
  });
  const conc = domain.describeRoll(
    state,
    attackRoll({
      kind: "concentration",
      requestId: "att-1-concentration-livia-2",
      values: [9],
      natural: 9,
      modifier: 2,
      total: 11,
    }),
    "player",
  );
  // B61: a save resolved in combat tumbles on the table (never a modal screen), with its
  // DC and result in the summary.
  assert.equal(conc.layout, "tumble");
  assert.equal(conc.dc, 10);
  assert.equal(conc.success, true);
  assert.ok(conc.lines.some((l) => l.it.includes("Benedizione")));
  assert.ok(conc.lines.some((l) => l.it.includes("metà dei 5 danni")));

  const death = (natural, result, success) => {
    const s = withAttempt(baseState(), {
      kind: "vitality",
      actorId: "livia",
      outcomes: [
        {
          actorId: "livia",
          status: "applied",
          vitality: { kind: "death-save", dc: 10, natural, success, result },
        },
      ],
    });
    return domain.describeRoll(
      s,
      attackRoll({ kind: "death-save", values: [natural], natural, modifier: 0, total: natural }),
      "player",
    );
  };
  assert.deepEqual(death(20, "regain-hp", true).verdict.en, "Natural 20: regain 1 HP");
  assert.deepEqual(death(1, "two-failures", false).verdict.en, "Natural 1: two failures");
  assert.equal(death(12, "success", true).tone, "success");
});

test("physical, reused and corrected faces are shown as recorded, never animated", () => {
  const state = baseState();
  const physical = domain.describeRoll(state, attackRoll({ mode: "physical" }), "player");
  assert.equal(physical.animate, false);
  assert.equal(dice.buildScene(ctxStub(state, "player"), [physical]).dice.length, 0);
  assert.equal(
    domain.describeRoll(state, attackRoll({ status: "reused" }), "player").animate,
    false,
  );
  assert.equal(
    domain.describeRoll(state, attackRoll({ correctionReason: "typo" }), "player").animate,
    false,
  );
  assert.equal(
    domain.describeRoll(state, attackRoll({ faceModes: ["physical"] }), "player").animate,
    false,
  );
  assert.equal(domain.describeRoll(state, attackRoll({ status: "superseded" }), "player"), null);
});

test("hit dice, initiative, 4d6 build rolls and compendium rolls get their own titles", () => {
  const state = baseState();
  const build = domain.describeRoll(
    state,
    {
      id: "b:0",
      source: "character-build",
      kind: "abilities",
      controller: "player",
      owner: "player",
      visibility: "private",
      mode: "digital",
      dice: [{ count: 4, sides: 6 }],
      values: [5, 2, 6, 2],
      discarded: 2,
      total: 13,
    },
    "player",
  );
  assert.deepEqual(
    build.dice.map((d) => d.kept),
    [true, false, true, true],
  );
  assert.match(build.title.en, /drop the lowest/);
  const d20 = domain.compendiumRollEvent({
    id: "cr1",
    by: "dm",
    visibility: "private",
    kind: "d20",
    faces: [11],
    natural: 11,
    total: 14,
    mode: "digital",
    advantage: "normal",
    formula: "1d20 + 3",
    label: { it: "Goblin: TS Destrezza", en: "Goblin: Dexterity save" },
  });
  assert.deepEqual(d20.dice, [{ count: 1, sides: 20 }]);
  assert.equal(d20.modifier, 3);
  assert.equal(domain.describeRoll(state, d20, "player"), null, "DM-only compendium roll");
  assert.equal(domain.describeRoll(state, d20, "dm").title.it, "Goblin: TS Destrezza");
  const mixed = domain.compendiumRollEvent({
    id: "cr2",
    by: "dm",
    visibility: "shared",
    kind: "damage",
    faces: [3, 2],
    total: 5,
    mode: "digital",
    formula: "1d6 + 1d4",
    label: "x",
  });
  assert.equal(mixed.dice, null, "sides not guessed when the formula is ambiguous");
  const view = domain.describeRoll(state, mixed, "player");
  assert.deepEqual(
    dice.buildScene(ctxStub(state, "player"), [view]).dice,
    [],
    "unknown sides are shown flat, not as an invented die",
  );
});

// ---------------------------------------------------------------- demo records

test("demo rolls validate the form and take digital faces from the dice service", () => {
  const state = baseState();
  const slice = domain.seedSlice();
  const bad = (input, pattern) =>
    assert.throws(
      () => domain.recordDemoRoll(slice, state, input, "player", scripted()),
      (e) => pattern.test(e.en),
    );
  bad({ pool: [] }, /at least one die/);
  bad({ pool: Array(11).fill(6) }, /at most 10/);
  bad({ pool: [7] }, /Choose dice/);
  bad({ pool: [20, 6], dc: 12 }, /single d20/);
  bad({ pool: [20], modifier: 31 }, /modifier/);
  bad({ pool: [20], dc: 0 }, /DC is a whole number/);
  bad({ pool: [6, 6], mode: "physical", faces: [3] }, /physical die face/);
  bad({ pool: [20], actorId: "goblin-1" }, /cannot roll for this creature/);
  const record = domain.recordDemoRoll(
    slice,
    state,
    { pool: [20], modifier: "2", dc: "12", actorId: "livia", ability: "con" },
    "player",
    scripted(11),
  );
  assert.deepEqual(record.values, [11]);
  assert.equal(record.total, 13);
  assert.equal(record.success, true);
  assert.equal(record.natural, 11);
  const all = domain.recordDemoRoll(
    slice,
    state,
    { pool: [...domain.DEMO_SIDES] },
    "player",
    scripted(1, 2, 3, 4, 5, 6, 77),
  );
  assert.deepEqual(all.dice.at(-1), { count: 1, sides: 100 });
  assert.equal(all.total, 98);
  const view = domain.describeRoll(state, domain.demoRollEvent(record), "player");
  assert.equal(view.layout, "check");
  assert.equal(view.title.it, "Tiro salvezza su Costituzione");
});

test("withdrawal and correction need a reason; digital faces are never edited", () => {
  const state = baseState();
  const slice = domain.seedSlice();
  const digital = domain.recordDemoRoll(slice, state, { pool: [8] }, "player", scripted(3));
  assert.throws(
    () => domain.correctDemoRoll(slice, digital.id, [5], "oops", "player"),
    /Digital faces/,
  );
  assert.throws(() => domain.withdrawDemoRoll(slice, digital.id, " ", "player"), /reason/);
  assert.throws(() => domain.withdrawDemoRoll(slice, digital.id, "x", "dm"), /Only the roller/);
  domain.withdrawDemoRoll(slice, digital.id, "Tiro partito per sbaglio", "player");
  assert.equal(slice.rolls[0].status, "withdrawn");
  assert.deepEqual(slice.rolls[0].values, [3], "withdrawn faces stay on record");
  // An identical retry reuses the withdrawn digital faces once (I-229), then rolls anew.
  const retry = domain.recordDemoRoll(slice, state, { pool: [8] }, "player", scripted());
  assert.equal(retry.status, "reused");
  assert.deepEqual(retry.values, [3]);
  assert.equal(retry.reusedFrom, digital.id);
  const third = domain.recordDemoRoll(slice, state, { pool: [8] }, "player", scripted(6));
  assert.deepEqual(third.values, [6]);
  assert.equal(third.status, "accepted");

  const physical = domain.recordDemoRoll(
    slice,
    state,
    { pool: [20], dc: 15, mode: "physical", faces: [12], modifier: 2 },
    "player",
    scripted(),
  );
  assert.equal(physical.success, false);
  assert.throws(() => domain.correctDemoRoll(slice, physical.id, [12], "same", "player"), /match/);
  assert.throws(() => domain.correctDemoRoll(slice, physical.id, [21], "bad", "player"), /face/);
  domain.correctDemoRoll(slice, physical.id, [18], "Letto male il dado", "player");
  const corrected = slice.rolls.find((r) => r.id === physical.id);
  assert.deepEqual(corrected.values, [18]);
  assert.equal(corrected.success, true);
  assert.deepEqual(corrected.corrections[0].values, [12]);
  assert.equal(corrected.corrections[0].reason, "Letto male il dado");
  const event = domain.demoRollEvent(corrected);
  assert.equal(event.correctionReason, "Letto male il dado");
  assert.equal(domain.describeRoll(state, event, "player").animate, false);
});

test("recent rolls join log, demo and compendium, projected for each identity", () => {
  const state = baseState();
  state.log.push({
    id: "L1",
    time: "2026-09-24T10:00:00.000Z",
    rolls: [
      attackRoll({ id: "L1:0" }),
      attackRoll({ id: "L1:1", status: "superseded" }),
      attackRoll({ id: "L1:2", controller: "dm", owner: "dm", visibility: "private" }),
    ],
  });
  state.ext = {
    "dice-3d": domain.seedSlice(),
    "compendium-rolls": {
      rolls: [
        {
          id: "cr",
          at: "2026-09-24T10:05:00.000Z",
          by: "dm",
          visibility: "private",
          kind: "d20",
          faces: [4],
          natural: 4,
          total: 7,
          mode: "digital",
          formula: "1d20 + 3",
          label: { it: "Goblin", en: "Goblin" },
        },
      ],
    },
  };
  const slice = state.ext["dice-3d"];
  domain.recordDemoRoll(
    slice,
    state,
    { pool: [6], visibility: "private" },
    "player",
    scripted(5),
    "2026-09-24T10:10:00.000Z",
  );
  const player = domain.recentRolls(state, "player").map((i) => i.key);
  const dm = domain.recentRolls(state, "dm").map((i) => i.key);
  assert.equal(player.length, 2);
  assert.equal(player[1], "L1:0");
  assert.ok(!player.includes("L1:2") && !player.includes("cr"), "DM-only rolls hidden");
  assert.ok(dm.includes("L1:2") && dm.includes("cr"));
  assert.ok(!dm.includes(slice.rolls[0].id), "the player's personal roll is hidden from the DM");
  assert.ok(!dm.includes("L1:1") && !player.includes("L1:1"), "superseded faces are not rolls");
});

// ---------------------------------------------------------------- drawer and overlay

function ctxStub(state, role, lang = "it") {
  return {
    state,
    role,
    lang,
    esc,
    t: (it, en) => (lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? v[lang] : String(v ?? "")),
    icon: () => "",
  };
}
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function fakeRoot(html) {
  // Controls (with their inner text) plus the opening tag of the form they sit in.
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
    ...[...html.matchAll(/<(form)\b([^>]*)>/g)].map((m) => [m[0], m[1], m[2], ""]),
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
      focus() {
        focused = this;
      },
    };
  });
  return {
    html,
    nodes,
    querySelectorAll(selector) {
      const m = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\](?:\[value="([^"]*)"\])?$/);
      return m
        ? nodes.filter(
            (n) =>
              m[1] in n.attrs &&
              (m[2] === undefined || n.attrs[m[1]] === m[2]) &&
              (m[3] === undefined || n.attrs.value === m[3]),
          )
        : [];
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
}
const click = (root, selector) => {
  const node = root.querySelector(selector);
  assert.ok(node, `No ${selector}`);
  (node.onclick ?? node.events.click)({ target: node });
};
const change = (root, selector, value, attribute = "value") => {
  const node = root.querySelector(selector);
  assert.ok(node, `No ${selector}`);
  node[attribute] = value;
  node.events.change({ target: node });
};
const form = (values) => ({ get: (k) => values[k] ?? null });

/** Real store + real registry with the area registered, as app.mjs wires them. */
function harness({ role = "player", lang = "it", die = null, prefs = false, setup = null } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  if (setup) setup(store.state);
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  // B22 Preferences (real area) when a test needs its reduced-motion choice.
  if (prefs) assert.equal(registry.use("preferences", B22.register).status, "built");
  const row = registry.use("dice-3d", dice.register);
  assert.equal(row.status, "built", row.error ?? "");
  registry.initState(store.state);
  const emitted = [];
  const errors = [];
  const toasts = [];
  registry.on?.("roll-accepted", (payload) => emitted.push(payload));
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
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), {
          it,
          en: "You are offline: this shared change cannot be applied.",
        });
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
      this.html = dice.renderDrawer(this, { selectedActorId: this.selected ?? "livia" });
      this.root = fakeRoot(this.html);
      dice.bindDrawer(this.root, this);
    },
  };
  registry.attach(ctx);
  ctx.render();
  return { ctx, store, registry, emitted, errors, toasts, slice: () => store.state.ext["dice-3d"] };
}
const lastScene = () => dice.diceStatus().history.at(-1) ?? null;

test("the area registers a preserved slice, personal and device settings and a Table drawer", () => {
  const { ctx, registry, store } = harness();
  assert.deepEqual(store.state.ext["dice-3d"], { rolls: [] });
  // B61: a tab of the Table's right sidebar (the old "drawer" placement).
  assert.equal(registry.get("table-panel", "dice-3d", ctx).placement, "sidebar-tab");
  // One personal section; reduced motion is B22's single choice, never a second one.
  const scopes = registry.list("settings", ctx).map((s) => [s.id, s.scope]);
  assert.deepEqual(scopes, [["dice-3d", "personal"]]);
  ctx.role = "dm";
  assert.ok(registry.get("table-panel", "dice-3d", ctx), "the DM has the drawer too");
});

test("the drawer builds a pool and the save preset rolls through the dice service", async () => {
  const h = harness({ die: scripted(4, 2, 16) });
  const { ctx } = h;
  assert.match(h.ctx.html, /Tiro salvezza su Costituzione · Livia · CD 12/);
  assert.equal(h.ctx.root.querySelectorAll("[data-dice3d-add]").length, 7);
  click(ctx.root, '[data-dice3d-add="6"]');
  click(ctx.root, '[data-dice3d-add="100"]');
  assert.match(ctx.html, /1d20 \+ 1d6 \+ 1d100/);
  click(ctx.root, '[data-dice3d-remove="0"]');
  assert.match(ctx.html, /1d6 \+ 1d100/);
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  const free = h.slice().rolls.at(-1);
  assert.deepEqual(free.values, [4, 2]);
  assert.equal(h.emitted.at(-1).roll.demoRollId, free.id);
  await tick();
  assert.deepEqual(lastScene().dice, [
    ["d6", 4, "plain"],
    ["d10", 0, "tens"],
    ["d10", 2, "units"],
  ]);
  // Preset: Livia's Constitution save (+2 from CON 14, no recorded save), DC 12.
  click(ctx.root, '[data-dice3d-preset="save"]');
  assert.equal(ctx.root.querySelector('[data-dice3d-field="modifier"]').value, "2");
  assert.equal(ctx.root.querySelector('[data-dice3d-field="dc"]').value, "12");
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  const check = h.slice().rolls.at(-1);
  assert.deepEqual([check.values[0], check.total, check.dc, check.success], [16, 18, 12, true]);
  assert.match(h.store.state.log.at(-1).label, /Livia · Tiro salvezza su Costituzione/);
  assert.match(h.store.state.log.at(-1).label, /CD 12: successo · dado digitale/);
  await tick();
  const scene = lastScene();
  assert.equal(scene.layout, "check");
  assert.deepEqual(scene.views[0].faces, [16]);
  assert.equal(scene.views[0].success, true);
  assert.deepEqual(scene.dice, [["d20", 16, "plain"]]);
  assert.match(ctx.html, /Tiri recenti/);
  assert.ok(ctx.root.querySelector(`[data-dice3d-replay="${check.id}"]`));
});

test("a hidden DM roll is never presented or listed for the player", async () => {
  const h = harness({ role: "dm", die: scripted(9) });
  const { ctx } = h;
  change(ctx.root, '[data-dice3d-visibility][value="private"]', "private");
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  const record = h.slice().rolls.at(-1);
  assert.equal(record.visibility, "private");
  assert.equal(h.store.state.log.at(-1).visibility, "private");
  await tick();
  assert.equal(lastScene().role, "dm");
  const before = dice.diceStatus().history.length;
  // The same announcement reaching the player's screen shows nothing.
  ctx.role = "player";
  h.registry.emit("roll-accepted", { logId: null, roll: domain.demoRollEvent(record) });
  await tick();
  assert.equal(dice.diceStatus().history.length, before);
  ctx.render();
  assert.ok(!ctx.html.includes(record.id), "not in the player's recent rolls");
  assert.equal(dice.replayRoll(ctx, record.id), false);
  assert.equal(h.errors.at(-1), "Questo tiro non è disponibile.");
});

test("offline: a table roll is refused with a message, a personal roll is kept", () => {
  const h = harness({ die: scripted(3) });
  h.ctx.offline = true;
  h.ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  assert.equal(h.slice().rolls.length, 0);
  assert.match(h.ctx.html, /Sei senza rete: un tiro per tutto il tavolo/);
  change(h.ctx.root, '[data-dice3d-visibility][value="private"]', "private");
  h.ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  assert.equal(h.slice().rolls.length, 1);
  assert.equal(h.slice().rolls[0].visibility, "private");
});

test("colour is per identity and seen by others; off and reduced motion are honoured", async () => {
  const h = harness({ die: scripted(5, 5, 7), prefs: true });
  const { ctx, registry } = h;
  change(ctx.root, '[data-dice3d-color][value="ruby"]', "ruby");
  assert.equal(registry.getSetting(ctx, "dice-3d.color"), "ruby");
  assert.equal(dice.diceColor(ctx).value, "ruby");
  assert.equal(dice.diceColor({ state: ctx.state, role: "dm" }).value, "gold", "DM unchanged");
  // The DM sees the player's roll in the player's colour (Dice So Nice).
  const view = domain.describeRoll(ctx.state, attackRoll(), "dm");
  const scene = dice.buildScene({ ...ctxStub(ctx.state, "dm") }, [view]);
  assert.equal(scene.dice[0].color.value, "ruby");
  // Reduced motion from the drawer writes B22's own choice: the result is shown at once.
  change(ctx.root, "[data-dice3d-motion]", "reduced");
  assert.equal(registry.getSetting(ctx, "preferences-motion.reduced-motion"), "reduced");
  assert.equal(dice.reducedMotion(ctx), true);
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  await tick();
  assert.equal(lastScene().animate, false);
  assert.deepEqual(lastScene().views[0].faces, [5]);
  // Turned off: the roll is still recorded, nothing is presented.
  change(ctx.root, "[data-dice3d-enabled]", false, "checked");
  assert.equal(dice.diceEnabled(ctx), false);
  const before = dice.diceStatus().history.length;
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  await tick();
  assert.equal(h.slice().rolls.length, 2);
  assert.equal(dice.diceStatus().history.length, before);
  // An explicit replay still works and shows the same recorded faces.
  assert.equal(dice.replayRoll(ctx, h.slice().rolls[1].id), true);
  assert.deepEqual(lastScene().views[0].faces, [5]);
  assert.equal(lastScene().replay, true);
});

test("corrections and withdrawals go through reasoned dialogs; Undo keeps the evidence", async () => {
  const h = harness({ die: scripted(6) });
  const { ctx } = h;
  change(ctx.root, '[data-dice3d-mode][value="physical"]', "physical");
  const face = ctx.root.querySelector('[data-dice3d-face="0"]');
  face.value = "7";
  face.events.input({ target: face });
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  const physical = h.slice().rolls.at(-1);
  assert.deepEqual([physical.mode, physical.values[0]], ["physical", 7]);
  await tick();
  assert.equal(lastScene().animate, false, "physical faces are never animated");
  assert.deepEqual(lastScene().dice, []);
  click(ctx.root, `[data-dice3d-correct="${physical.id}"]`);
  assert.throws(
    () => ctx.dialogState.options.onSubmit(form({ "face-0": "9", reason: "" })),
    /reason|motivo/i,
  );
  ctx.dialogState.options.onSubmit(form({ "face-0": "9", reason: "Letto 7 invece di 9" }));
  assert.deepEqual(h.slice().rolls.at(-1).values, [9]);
  assert.equal(h.emitted.at(-1).roll.correctionReason, "Letto 7 invece di 9");
  await tick();
  assert.equal(lastScene().animate, false);
  assert.match(ctx.html, /Corretto: Letto 7 invece di 9 \(prima 7\)/);
  // A digital roll offers no correction, only a reasoned withdrawal.
  change(ctx.root, '[data-dice3d-mode][value="digital"]', "digital");
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });
  const digital = h.slice().rolls.at(-1);
  assert.equal(ctx.root.querySelector(`[data-dice3d-correct="${digital.id}"]`), null);
  click(ctx.root, `[data-dice3d-withdraw="${digital.id}"]`);
  ctx.dialogState.options.onSubmit(form({ reason: "Tiro di prova sbagliato" }));
  assert.equal(h.slice().rolls.at(-1).status, "withdrawn");
  assert.match(ctx.html, /Ritirato: Tiro di prova sbagliato/);
  assert.equal(ctx.root.querySelector(`[data-dice3d-replay="${digital.id}"]`), null);
  // Gameplay Undo does not erase accepted faces (preserved slice, undoable:false).
  assert.equal(h.store.history.length, 0);
  assert.equal(h.slice().rolls.length, 2);
});

test("log rolls from the rules engine are presented once; an Undo correction is not a roll", async () => {
  const h = harness({ role: "player" });
  const before = dice.diceStatus().history.length;
  h.registry.emit("roll-accepted", {
    logId: "x",
    roll: attackRoll({ id: "x:0" }),
    correction: true,
  });
  await tick();
  assert.equal(dice.diceStatus().history.length, before);
  // Two rolls of one commit (attack + damage) become one scene with both dice.
  h.registry.emit("roll-accepted", { logId: "y", roll: attackRoll({ id: "y:0" }) });
  h.registry.emit("roll-accepted", {
    logId: "y",
    roll: attackRoll({
      id: "y:1",
      kind: "damage",
      dice: [{ count: 1, sides: 10 }],
      values: [7],
      modifier: 0,
      natural: null,
      total: 7,
    }),
  });
  await tick();
  const scene = lastScene();
  assert.equal(scene.layout, "tumble");
  assert.deepEqual(scene.dice, [
    ["d20", 14, "plain"],
    ["d10", 7, "d10"],
  ]);
  // Switching identity clears whatever was on screen.
  h.registry.emit("role-changed", { role: "dm" });
  assert.equal(dice.diceStatus().current, null);
  assert.equal(dice.diceStatus().queued, 0);
});

test("English labels and the compendium event are presented in the viewer's language", async () => {
  const h = harness({ role: "dm", lang: "en" });
  assert.match(h.ctx.html, /Try|Roll the dice/);
  assert.match(h.ctx.html, /Only me \(hidden DM roll\)/);
  h.store.state.ext["compendium-rolls"] = {
    rolls: [
      {
        id: "cr-en",
        at: new Date().toISOString(),
        by: "dm",
        visibility: "shared",
        kind: "d20",
        faces: [19],
        natural: 19,
        total: 21,
        mode: "digital",
        formula: "1d20 + 2",
        label: { it: "Goblin: prova", en: "Goblin: check" },
      },
    ],
  };
  h.registry.emit("compendium:roll", { rollId: "cr-en", visibility: "shared", by: "dm" });
  await tick();
  assert.deepEqual(lastScene().dice, [["d20", 19, "plain"]]);
});

// ---------------------------------------------------------------- review fixes (B56 review)

/** A personal sheet outside the campaign, shaped like B21's Iria (synthetic). */
const personalSheet = (extra = {}) => ({
  id: "iria",
  name: "Iria",
  kind: "character",
  owner: "player",
  controllers: [],
  visibility: "private",
  campaignIds: [],
  hp: 27,
  maxHp: 27,
  ac: 12,
  abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
  savingThrows: { str: -1, dex: 2, con: 1, int: 7, wis: 4, cha: 0 },
  inventory: [],
  ...extra,
});
const submit = (ctx) =>
  ctx.root.querySelector("[data-dice3d-form]").onsubmit({ preventDefault() {} });

test("a practice roll for a personal sheet stays private even when the table is chosen", async () => {
  const h = harness({
    die: scripted(17),
    setup: (state) => (state.actors.iria = personalSheet()),
  });
  const { ctx } = h;
  change(ctx.root, "[data-dice3d-actor]", "iria");
  // The drawer says why and offers only "Solo io".
  assert.match(ctx.html, /Iria è una scheda personale: il tiro resta solo tuo/);
  assert.equal(ctx.root.querySelector('[data-dice3d-visibility][value="shared"]').disabled, true);
  assert.equal(ctx.root.querySelector('[data-dice3d-visibility][value="private"]').checked, true);
  click(ctx.root, '[data-dice3d-preset="save"]');
  assert.equal(ctx.root.querySelector('[data-dice3d-field="modifier"]').value, "1");
  submit(ctx);
  const record = h.slice().rolls.at(-1);
  assert.deepEqual([record.actorId, record.visibility], ["iria", "private"]);
  const entry = h.store.state.log.at(-1);
  assert.equal(entry.visibility, "private", "the log line stays with the player");
  assert.match(entry.label, /^Tiro di prova · Iria · /);
  assert.equal(h.emitted.at(-1).roll.visibility, "private");
  // The DM never lists, replays or is presented Iria's roll.
  const state = h.store.state;
  assert.ok(!domain.recentRolls(state, "dm", 60).some((i) => i.key === record.id));
  assert.equal(domain.describeRoll(state, domain.demoRollEvent(record), "dm"), null);
  // A record saved as "shared" before the audience rule still stays with its roller.
  h.slice().rolls.push({ ...structuredClone(record), id: "legacy-iria", visibility: "shared" });
  assert.ok(!domain.recentRolls(state, "dm", 60).some((i) => i.key === "legacy-iria"));
  assert.ok(domain.recentRolls(state, "player", 60).some((i) => i.key === "legacy-iria"));
  // Same rule in the domain for a hidden creature and a character outside the campaign.
  state.actors["goblin-1"].hidden = true;
  const input = { pool: [20], visibility: "shared" };
  assert.equal(
    domain.validateDemoInput(state, { ...input, actorId: "goblin-1" }, "dm").visibility,
    "private",
  );
  state.actors.iria = personalSheet({ visibility: "shared", campaignIds: ["elsewhere"] });
  assert.equal(
    domain.validateDemoInput(state, { ...input, actorId: "iria" }, "player").visibility,
    "private",
  );
  assert.equal(
    domain.validateDemoInput(state, { ...input, actorId: "livia" }, "player").visibility,
    "shared",
  );
});

test("keyboard focus stays on the roll button and on the changed setting after re-rendering", () => {
  const h = harness({ die: scripted(8) });
  const { ctx } = h;
  submit(ctx);
  assert.ok(
    ctx.root.querySelectorAll("[data-dice3d-roll]").includes(focused),
    "focus is not on the current Lancia i dadi button",
  );
  change(ctx.root, '[data-dice3d-color][value="emerald"]', "emerald");
  assert.ok(
    ctx.root.querySelectorAll('[data-dice3d-color][value="emerald"]').includes(focused),
    "focus left the colour radio group",
  );
  change(ctx.root, "[data-dice3d-enabled]", false, "checked");
  assert.ok(ctx.root.querySelectorAll("[data-dice3d-enabled]").includes(focused));
  // A refused roll keeps the typed faces and focus.
  change(ctx.root, '[data-dice3d-mode][value="physical"]', "physical");
  const face = ctx.root.querySelector('[data-dice3d-face="0"]');
  face.value = "25";
  face.events.input({ target: face });
  submit(ctx);
  assert.match(ctx.html, /Inserisci ogni faccia del dado fisico/);
  assert.equal(ctx.root.querySelector('[data-dice3d-face="0"]').value, "25");
  assert.ok(ctx.root.querySelectorAll("[data-dice3d-roll]").includes(focused));
});

test("practice rolls read as practice in the log and the list; the DM starts with no hero", () => {
  const h = harness({ die: scripted(3, 4) });
  submit(h.ctx);
  assert.match(h.store.state.log.at(-1).label, /^Tiro di prova · Livia: 1d20 → \[3\] = 3/);
  assert.match(h.ctx.html, /class="badge dice3d-badge">Tiro di prova</);
  // The DM's drawer never defaults to a player's character, even when it is selected.
  const dm = harness({ role: "dm", die: scripted(5) });
  assert.doesNotMatch(dm.ctx.html, /value="livia" selected/);
  submit(dm.ctx);
  assert.match(dm.store.state.log.at(-1).label, /^Tiro di prova: 1d20 → \[5\] = 5/);
  // The DM's own selected creature is the default.
  dice.resetDiceUI();
  dm.ctx.selected = "goblin-1";
  dm.ctx.render();
  assert.match(dm.ctx.html, /value="goblin-1" selected/);
});

test("a roll reverted by Undo stays listed as evidence, marked, and is never replayed", () => {
  const h = harness();
  const state = h.store.state;
  const roll = attackRoll({
    id: "L9:0",
    controller: "dm",
    owner: "dm",
    actorId: "goblin-2",
    actorName: "Esploratore",
  });
  state.log.push(
    {
      id: "L9",
      time: "2026-09-24T11:00:00.000Z",
      label: "x",
      controller: "dm",
      kind: "change",
      visibility: "shared",
      rolls: [roll],
    },
    {
      id: "L10",
      time: "2026-09-24T11:01:00.000Z",
      label: "x",
      controller: "dm",
      kind: "correction",
      revertsId: "L9",
      visibility: "shared",
      rolls: [],
    },
  );
  assert.equal(domain.recentRolls(state, "dm").find((i) => i.key === "L9:0").reverted, true);
  h.ctx.role = "dm";
  h.ctx.render();
  assert.match(h.ctx.html, /data-dice3d-row="L9:0" data-status="reverted"/);
  assert.match(h.ctx.html, /Annullato con «Annulla»: risultato conservato/);
  assert.equal(h.ctx.root.querySelector('[data-dice3d-replay="L9:0"]'), null);
  assert.equal(dice.replayRoll(h.ctx, "L9:0"), false);
});

test("the Table's free roll is presented and listed from its log label; its Undo is not", async () => {
  const h = harness();
  const before = dice.diceStatus().history.length;
  h.ctx.commit("Livia · d20: 6 + 0 = 6 (digitale)", () => {});
  await tick();
  assert.equal(dice.diceStatus().history.length, before + 1);
  assert.deepEqual(lastScene().dice, [["d20", 6, "plain"]]);
  assert.equal(lastScene().animate, true);
  const digitalKey = `free:${h.store.state.log.at(-1).id}`;
  assert.ok(domain.recentRolls(h.store.state, "player").some((i) => i.key === digitalKey));
  assert.match(h.ctx.html, /Livia · Tiro libero/);
  // Physical faces are shown as entered, never animated.
  h.ctx.commit("Livia · d8: 5 − 1 = 4 (fisico)", () => {});
  await tick();
  assert.equal(lastScene().animate, false);
  assert.deepEqual([lastScene().views[0].faces, lastScene().views[0].total], [[5], 4]);
  // Undo repeats the label as a correction: not a new roll; the undone roll is marked.
  const physicalKey = `free:${h.store.state.log.at(-1).id}`;
  const count = dice.diceStatus().history.length;
  h.ctx.undo();
  await tick();
  assert.equal(dice.diceStatus().history.length, count);
  const listed = domain.recentRolls(h.store.state, "player");
  assert.equal(listed.find((i) => i.key === physicalKey).reverted, true);
  assert.ok(
    !listed.some((i) => i.key.startsWith("free:") && i.roll.logId === h.store.state.log.at(-1).id),
  );
  // Other commits are never read as dice.
  h.ctx.commit("Impostazione aggiornata: Colore", () => {});
  await tick();
  assert.equal(dice.diceStatus().history.length, count);
});

test("the dice colour is saved with the roll: a replay keeps it after the roller changes", () => {
  const h = harness({ die: scripted(4) });
  const { ctx } = h;
  change(ctx.root, '[data-dice3d-color][value="ruby"]', "ruby");
  submit(ctx);
  const record = h.slice().rolls.at(-1);
  assert.equal(record.color, "ruby");
  change(ctx.root, '[data-dice3d-color][value="sapphire"]', "sapphire");
  const view = domain.describeRoll(ctx.state, domain.demoRollEvent(record), "dm");
  assert.equal(dice.buildScene(ctxStub(ctx.state, "dm"), [view]).dice[0].color.value, "ruby");
  // Rolls from other areas carry no colour: the roller's current choice is used.
  const other = domain.describeRoll(ctx.state, attackRoll(), "dm");
  assert.equal(dice.buildScene(ctxStub(ctx.state, "dm"), [other]).dice[0].color.value, "sapphire");
});

test("combat saves roll on the table with DC and result; the BG3 screen is the roller's own check (B61)", () => {
  const state = withAttempt(baseState(), {
    targets: [
      { actorId: "goblin-1", saveDC: 13, saveModifier: 2 },
      { actorId: "doran", saveDC: 13, saveModifier: 1 },
    ],
    outcomes: [
      { actorId: "goblin-1", saveSuccess: false, status: "applied" },
      { actorId: "doran", saveSuccess: true, status: "applied" },
    ],
  });
  const save = (actorId, actorName, face) =>
    attackRoll({
      id: `s-${actorId}`,
      kind: "save",
      actorId,
      actorName,
      controller: "dm",
      owner: "dm",
      values: [face],
      natural: face,
      modifier: 1,
      total: face + 1,
    });
  const goblin = domain.describeRoll(state, save("goblin-1", "Sentinella", 4), "dm");
  assert.deepEqual([goblin.layout, goblin.dc, goblin.tone], ["tumble", 13, "failure"]);
  // B61: a hero's save resolved in combat tumbles too (combat actions never block clicks).
  const doran = domain.describeRoll(state, save("doran", "Doran", 15), "dm");
  assert.deepEqual([doran.layout, doran.dc, doran.tone], ["tumble", 13, "success"]);
  // The modal screen: a check or save with a DC started by this identity outside combat
  // actions (Prova i dadi, the practice roll); another identity sees it tumble.
  const slice = domain.seedSlice();
  const own = domain.recordDemoRoll(
    slice,
    state,
    { pool: [20], modifier: "2", dc: "12", actorId: "livia", ability: "con" },
    "player",
    scripted(15),
  );
  const event = domain.demoRollEvent(own);
  assert.equal(domain.describeRoll(state, event, "player").layout, "check");
  assert.equal(domain.describeRoll(state, event, "dm").layout, "tumble");
});

test("recent rolls fill the limit with presentable rolls only", () => {
  const state = baseState();
  state.log.push(
    { id: "old", time: "2026-09-24T09:00:00.000Z", rolls: [attackRoll({ id: "old:0" })] },
    {
      id: "bad",
      time: "2026-09-24T10:00:00.000Z",
      rolls: Array.from({ length: 9 }, (_, i) => attackRoll({ id: `bad:${i}`, values: [] })),
    },
  );
  assert.deepEqual(
    domain.recentRolls(state, "player", 8).map((i) => i.key),
    ["old:0"],
  );
});

// ---------------------------------------------------------------- review fixes, round 2

/**
 * Just enough document for the overlay: one layer, captured listeners, a page control and
 * open dialogs. Over a modal dialog the browser hit-tests the dialog, not the dice layer.
 */
function fakeOverlayDocument() {
  const listeners = {};
  const node = (extra = {}) => ({
    dataset: {},
    style: {},
    textContent: "",
    innerHTML: "",
    ...extra,
  });
  const parts = {
    canvas: node({ getContext: () => null }),
    "[data-dice3d-content]": node(),
    "[data-dice3d-live]": node(),
  };
  const layer = node({
    hidden: true,
    isConnected: true,
    setAttribute() {},
    querySelector: (selector) => parts[selector] ?? null,
    contains: (target) => target === layer || Object.values(parts).includes(target),
  });
  const page = node({ isConnected: true, focus() {} });
  const dialogs = [];
  /** A control inside an open dialog (the dialog itself is what `closest` finds). */
  const inDialog = () => {
    const dialog = node();
    return node({ isConnected: true, dialog, closest: () => dialog });
  };
  const doc = {
    body: { append() {} },
    activeElement: page,
    createElement: () => layer,
    querySelectorAll: () => dialogs,
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  const fire = (type, props = {}) => {
    const event = {
      type,
      target: layer,
      defaultPrevented: false,
      stopped: false,
      ...props,
      preventDefault() {
        event.defaultPrevented = true;
      },
      stopImmediatePropagation() {
        event.stopped = true;
      },
    };
    listeners[type](event);
    return event;
  };
  return { doc, layer, page, dialogs, inDialog, content: parts["[data-dice3d-content]"], fire };
}

test("a check screen keeps the closing click, tap and keys; the table's dice let them through", async () => {
  // The area is built without a document (as in every other test); only the overlay sees one.
  const h = harness({ die: scripted(16, 16, 9, 9) });
  const fake = fakeOverlayDocument();
  const saved = ["document", "requestAnimationFrame", "cancelAnimationFrame"].map((k) => [
    k,
    globalThis[k],
  ]);
  Object.assign(globalThis, {
    document: fake.doc,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  });
  try {
    const phase = () => dice.diceStatus().current?.phase ?? "closed";
    const held = (event) => event.defaultPrevented && event.stopped;
    const onPage = { target: fake.page };
    // Keyboard: the focused "Lancia i dadi" under the BG3 screen never receives a key.
    click(h.ctx.root, '[data-dice3d-preset="save"]');
    submit(h.ctx);
    await tick();
    assert.equal(dice.diceStatus().current.layout, "check");
    assert.equal(phase(), "rolling");
    assert.match(fake.content.innerHTML, /Clic, Invio o Esc per saltare/);
    assert.ok(held(fake.fire("keydown", { key: "Enter", ...onPage })), "Enter reached the page");
    assert.equal(phase(), "landed", "Enter skips like a click");
    assert.ok(held(fake.fire("keydown", { key: "Tab", shiftKey: true, ...onPage })));
    assert.equal(phase(), "landed", "Tab only stays on the screen");
    assert.ok(held(fake.fire("keydown", { key: " ", ...onPage })), "Space reached the page");
    assert.equal(phase(), "closed", "Space closes the landed screen");
    assert.equal(h.slice().rolls.length, 1, "no second roll from a closing key");
    // Pointer: the skipping click and the closing click both end on the screen.
    submit(h.ctx);
    await tick();
    assert.equal(phase(), "rolling");
    assert.ok(held(fake.fire("pointerdown")), "the skipping press went through");
    assert.equal(phase(), "landed");
    assert.ok(held(fake.fire("click")), "the skipping click went through");
    assert.equal(phase(), "landed", "one click skips, it does not also close");
    assert.ok(held(fake.fire("pointerdown")), "the closing press went through");
    assert.equal(phase(), "landed", "closing waits for the click, so it never lands underneath");
    assert.ok(held(fake.fire("click", onPage)), "the closing click went through");
    assert.equal(phase(), "closed");
    assert.ok(!held(fake.fire("click", onPage)), "a later click on the page is still held");
    // A script's own click() on the page is never taken for the player's hand.
    submit(h.ctx);
    await tick();
    assert.ok(!held(fake.fire("click", { ...onPage, isTrusted: false })));
    fake.fire("keydown", { key: "Escape", ...onPage });
    fake.fire("keydown", { key: "Escape", ...onPage });
    assert.equal(phase(), "closed");
    assert.equal(h.slice().rolls.length, 3);
    // Over the requests dialog (open before the dice) the layer is inert: presses, clicks
    // and keys aimed at the dialog's controls still belong to the dice.
    const below = fake.inDialog();
    fake.dialogs.push(below.dialog);
    h.registry.emit("roll-accepted", {
      logId: "s",
      roll: domain.demoRollEvent(h.slice().rolls[0]),
    });
    await tick();
    assert.equal(phase(), "rolling");
    assert.ok(held(fake.fire("pointerdown", { target: below })), "press reached the dialog");
    assert.ok(held(fake.fire("click", { target: below })), "skip click reached the dialog");
    assert.ok(held(fake.fire("keydown", { key: "Enter", target: below })));
    assert.equal(
      phase(),
      "closed",
      "Enter on the landed screen closes it, not the dialog's button",
    );
    // A dialog opened after the dice sits above them: it keeps its own clicks and keys.
    fake.dialogs.length = 0;
    h.registry.emit("roll-accepted", {
      logId: "t",
      roll: domain.demoRollEvent(h.slice().rolls[0]),
    });
    await tick();
    const above = fake.inDialog();
    assert.ok(!held(fake.fire("keydown", { key: "Enter", target: above })));
    assert.ok(!held(fake.fire("pointerdown", { target: above })));
    assert.ok(!held(fake.fire("click", { target: above })));
    assert.equal(phase(), "landed", "a press in a dialog above skips the dice, nothing more");
    fake.fire("keydown", { key: "Escape", ...onPage });
    assert.equal(phase(), "closed");
    // Dice on the table stay pass-through at rest (Dice So Nice): keys and clicks go on.
    h.registry.emit("roll-accepted", { logId: "y", roll: attackRoll({ id: "y:0" }) });
    await tick();
    assert.equal(dice.diceStatus().current.layout, "tumble");
    // B61: rolling table dice never hold a press either: it reaches the page and the dice
    // land on their result (Dice So Nice, D&D Beyond).
    assert.equal(phase(), "rolling");
    assert.ok(!held(fake.fire("pointerdown", onPage)), "a press on rolling dice was held back");
    assert.ok(!held(fake.fire("click", onPage)), "the click on rolling dice was held back");
    assert.equal(phase(), "landed", "the press lands the rolling dice");
    fake.fire("keydown", { key: "Escape", ...onPage });
    assert.equal(phase(), "closed", "Esc still closes the landed dice");
    h.registry.emit("roll-accepted", { logId: "z", roll: attackRoll({ id: "z:0" }) });
    await tick();
    fake.fire("keydown", { key: "Escape", ...onPage });
    assert.equal(phase(), "landed", "Esc still skips");
    assert.ok(!held(fake.fire("keydown", { key: "Enter", ...onPage })), "Enter was held back");
    assert.ok(!held(fake.fire("pointerdown", onPage)), "a click on the page was held back");
    assert.equal(phase(), "closed", "a click on the page closes the summary");
    assert.ok(!held(fake.fire("click", onPage)));
  } finally {
    dice.clearDice();
    for (const [k, v] of saved) globalThis[k] = v;
  }
});

test("the drawer's reduced-motion choice is named apart from B22's own control", () => {
  for (const lang of ["it", "en"]) {
    const h = harness({ prefs: true, lang });
    const b22 = h.registry
      .list("settings", h.ctx)
      .find((s) => s.id === "preferences-motion")
      ?.fields.find((f) => f.id === "reduced-motion")?.label?.[lang];
    assert.ok(b22, "B22 registers its reduced-motion field");
    const mirror = h.ctx.html.match(/<label class="field">([^<]*)<select data-dice3d-motion>/)?.[1];
    assert.ok(mirror, "the drawer offers B22's choice");
    assert.notEqual(mirror.trim(), b22, "two controls with one accessible name");
    assert.ok(mirror.includes(b22), "the mirror still says which setting it changes");
  }
});

test("a compendium damage roll adds up: the flat bonus is shown in the breakdown", () => {
  const h = harness();
  const wolf = {
    id: "cr-wolf",
    at: new Date().toISOString(),
    by: "player",
    visibility: "shared",
    kind: "damage",
    faces: [2, 3],
    total: 7,
    mode: "digital",
    formula: "2d6 + 2 (critico)",
    critical: true,
    byGroup: [{ type: "piercing", total: 7 }],
    label: { it: "Lupo · Morso · danni", en: "Wolf · Bite · damage" },
  };
  assert.equal(domain.compendiumRollEvent(wolf).modifier, 2);
  const noBonus = { ...wolf, id: "cr-2", faces: [3, 2], total: 5, formula: "1d6 + 1d4" };
  assert.equal(domain.compendiumRollEvent(noBonus).modifier, 0);
  h.store.state.ext["compendium-rolls"] = { rolls: [wolf] };
  h.ctx.render();
  assert.match(
    h.ctx.html,
    /Lupo · Morso · danni<\/strong><span class="dice3d-row-math">\[2, 3\] \+ 2 = 7/,
  );
});
