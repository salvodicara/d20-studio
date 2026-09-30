// B40 — Special movement and actions: domain rules with the real store, combat engine,
// conditions and registry, plus the interface handlers (render strings and commands).
// Synthetic data only: the lantern campaign, Livia, Doran, Mira and the two goblins.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, rollDie } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import {
  beginAttempt,
  resolveRoll,
  expireTurnEffects,
  advanceTurn,
  beginMovement,
  previewAction,
  listActions,
  applyReadyOutcome,
} from "../combat.mjs";
import { segmentMeters, geometryKey, tracePath } from "../spatial.mjs";
import { hasCondition, applyConditionEvent } from "../conditions.mjs";
import * as forms from "../forms-companions.mjs";
import { itemFromCatalog } from "../party-stash.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";

afterEach(() => UI.resetSpecialMovesView());

// ---------------------------------------------------------------- harness

function harness({ lang = "it", role = "player" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  assert.equal(registry.use(D.ID, UI.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  const toasts = [];
  const history = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    canControl(actor) {
      return (
        !!actor &&
        actor.visibility !== "private" &&
        (this.role === "dm" || actor.owner === this.role)
      );
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog() {},
    closeDialog() {},
    render() {},
    navigate(page) {
      this.view = { page, id: "", tab: "" };
    },
    openForms(actorId) {
      this.formsOpened = actorId;
    },
    undoLabel: () => (history.at(-1)?.controller === ctx.role ? history.at(-1).label : ""),
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "offline", en: "offline" });
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      history.push({ label, controller: this.role });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      history.pop();
      registry.afterUndo(current, store.state);
      store.persist();
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    get s() {
      return store.state;
    },
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    cmd(label, fn, as = ctx.role) {
      const previous = ctx.role;
      ctx.role = as;
      let out;
      try {
        ctx.commit(label, (draft) => {
          out = fn(draft);
        });
      } finally {
        ctx.role = previous;
      }
      return out;
    },
  };
}
const op = (id) => ({ operationId: id });
const token = (s, id) =>
  s.scenes.find((x) => x.id === s.activeSceneId).tokens.find((t) => t.actorId === id);
const place = (s, id, x, y) => Object.assign(token(s, id), { x, y });
// Combat with an explicit order and the first creature's turn started.
function startCombat(s, order = ["livia", "goblin-1", "doran", "goblin-2"]) {
  s.combat = { active: true, round: 1, turn: 0, order, encounterId: "enc-b40" };
  for (const id of order) {
    const a = s.actors[id];
    a.movement = a.speed;
    a.movementSpent = 0;
    a.dashCount = 0;
    a.action = true;
    a.bonus = true;
    a.reaction = true;
  }
  expireTurnEffects(s, order[0], "start");
}
function goTo(s, actorId) {
  let guard = 0;
  while (s.combat.order[s.combat.turn] !== actorId && guard++ < 12) advanceTurn(s);
}
function answer(s, attempt, faces, role) {
  const request = s.combatAttempts
    .find((a) => a.id === attempt.id)
    .requests.find((r) => r.status === "pending");
  return resolveRoll(s, attempt.id, request.id, faces, role);
}
function giveDoranSword(s) {
  const { lootId: _l, identified: _i, ...sword } = itemFromCatalog("srd2024:item:longsword");
  const { lootId: _l2, identified: _i2, ...shield } = itemFromCatalog("srd2024:item:shield");
  s.actors.doran.inventory.push({ ...sword, id: "doran-longsword", equipped: true });
  s.actors.doran.inventory.push({ ...shield, id: "doran-shield", equipped: true });
  s.actors.doran.weaponSets = { active: "melee", melee: "doran-longsword", ranged: null };
}

// ---------------------------------------------------------------- seed and rules

test("seed adds the courtyard features, rubble terrain, Doran's handaxes and Sap/Vex choices once", () => {
  const h = harness();
  const s = h.s;
  const slice = D.sliceOf(s);
  assert.deepEqual(
    D.featuresOf(s).map((f) => f.id),
    ["sm-fountain", "sm-west-wall", "sm-north-wall", "sm-lever", "sm-bell"],
  );
  assert.equal(s.scenes[0].terrain.filter((t) => t.id === "sm-rubble").length, 1);
  const axe = s.actors.doran.inventory.find((row) => row.id === "sm-doran-handaxe");
  assert.equal(axe.quantity, 2);
  assert.deepEqual(axe.weapon.range, { normal: 20, long: 60 });
  assert.deepEqual(slice.masteries.doran, ["longsword", "handaxe", "longbow"]);
  h.reload();
  assert.equal(h.s.scenes[0].terrain.filter((t) => t.id === "sm-rubble").length, 1);
  assert.equal(h.s.actors.doran.inventory.filter((r) => r.id === "sm-doran-handaxe").length, 1);
  assert.deepEqual(D.normalizeSlice(D.normalizeSlice(slice)), D.normalizeSlice(slice));
  assert.throws(() => D.normalizeSlice(slice, D.VERSION + 1), /newer/);
});

test("distance rules: SRD grid diagonal, variants and hexes change path cost; no rule keeps the old key", () => {
  const h = harness();
  const scene = h.s.scenes[0];
  const before = geometryKey(scene);
  const a = { x: 100, y: 100 },
    diag = { x: 200, y: 200 };
  // P6 TV-10: a scene without a rule follows the SRD 2024 grid (diagonal = 1 square).
  assert.equal(scene.distanceRule, undefined);
  assert.equal(D.ruleOf(scene), "grid-srd");
  assert.equal(segmentMeters(scene, a, diag), 3);
  for (const [rule, meters] of [
    ["euclidean", 4.24],
    ["grid-srd", 3],
    ["grid-alternate", 4.5],
    ["manhattan", 6],
  ]) {
    h.cmd("rule", (d) => D.commitSceneRule(d, { rule }, "dm"), "dm");
    assert.equal(Math.round(segmentMeters(h.s.scenes[0], a, diag) * 100) / 100, meters, rule);
  }
  // Two hexes to the right: 3 m; a pointy-top diagonal neighbour costs one hex.
  h.cmd("hex", (d) => D.commitSceneRule(d, { rule: "hex" }, "dm"), "dm");
  const hex = h.s.scenes[0];
  assert.equal(hex.gridShape, "hex");
  assert.equal(hex.gridVisible, false);
  assert.equal(Math.round(segmentMeters(hex, a, { x: 200, y: 100 }) * 100) / 100, 3);
  assert.equal(
    Math.round(segmentMeters(hex, a, { x: 125, y: 100 + (50 * Math.sqrt(3)) / 2 }) * 100) / 100,
    1.5,
  );
  assert.ok(D.hexGridPath(hex).startsWith("M"));
  // Movement cost follows the rule (tracePath → combat, Move, approach).
  assert.equal(Math.round(tracePath(hex, a, [{ x: 200, y: 100 }]).totalCost * 100) / 100, 3);
  // P6 TV-10: on hexes the path walks through the hex centres, one hex per step.
  const walked = tracePath(hex, a, [{ x: 200, y: 100 }]);
  assert.equal(walked.path.length, 3);
  assert.deepEqual(
    walked.path.map((p) => [Math.round(p.x), Math.round(p.y)]),
    [
      [100, 100],
      [150, 72],
      [200, 100],
    ],
  );
  h.cmd("back", (d) => D.commitSceneRule(d, { rule: "euclidean" }, "dm"), "dm");
  assert.equal(h.s.scenes[0].gridVisible, true);
  assert.equal(h.s.scenes[0].gridShape, undefined);
  assert.equal(h.s.scenes[0].distanceRule, "euclidean");
  // A scene without a rule keeps the key it had before rules existed.
  const { distanceRule: _rule, ...plain } = h.s.scenes[0];
  assert.equal(geometryKey(plain), before);
  assert.throws(
    () => h.cmd("x", (d) => D.commitSceneRule(d, { rule: "grid-srd" }, "player")),
    /DM/,
  );
});

// ---------------------------------------------------------------- jump and fall

test("long jump: 2024 distances, preview reasons, movement spent and a landing check in rubble", () => {
  const h = harness();
  const s = h.s;
  const standing = D.jumpProfile(s, "livia", { runUp: false });
  assert.deepEqual(
    [standing.long, standing.longFull, standing.high, standing.highFull],
    [1.5, 3, 0.45, 0.9],
  );
  // Too far standing, fine with a declared run-up out of combat.
  const far = D.previewJump(
    s,
    { actorId: "livia", kind: "long", point: { x: 350, y: 380 } },
    "player",
  );
  assert.equal(far.available, false);
  assert.match(far.reasons[0].it, /Troppo lontano: salto massimo 1,5 m da fermo/);
  // A pixel past the limit (touch on a zoomed map) lands exactly at the longest jump.
  const hair = D.previewJump(
    s,
    { actorId: "livia", kind: "long", point: { x: 351.5, y: 380 }, runUp: true },
    "player",
  );
  assert.deepEqual([hair.available, hair.distance, hair.landing.x], [true, 3, 350]);
  const ok = D.previewJump(
    s,
    { actorId: "livia", kind: "long", point: { x: 350, y: 380 }, runUp: true },
    "player",
  );
  assert.equal(ok.available, true, JSON.stringify(ok.reasons));
  assert.equal(ok.distance, 3);
  h.cmd("jump", (d) =>
    D.commitJump(
      d,
      { actorId: "livia", kind: "long", point: { x: 350, y: 380 }, runUp: true },
      "player",
      op("j1"),
    ),
  );
  assert.deepEqual([token(h.s, "livia").x, token(h.s, "livia").y], [350, 380]);
  assert.equal(D.lastMove(h.s, "livia").kind, "long-jump");
  // In combat: the run-up comes from a real 3 m move this turn, and the jump spends movement.
  h.cmd(
    "combat",
    (d) => {
      place(d, "livia", 560, 520);
      startCombat(d);
    },
    "dm",
  );
  const noRun = D.previewJump(
    h.s,
    { actorId: "livia", kind: "long", point: { x: 640, y: 520 } },
    "player",
  );
  assert.equal(noRun.profile.runUp, false);
  assert.equal(noRun.available, false);
  // A real 3 m move on foot right before the jump is the run-up (SRD EN 184 / IT 214).
  h.cmd("run", (d) =>
    beginMovement(d, { id: "run-up", actorId: "livia", point: { x: 660, y: 520 } }, "player"),
  );
  assert.equal(D.hasRunUp(h.s, "livia"), true);
  const into = D.previewJump(
    h.s,
    { actorId: "livia", kind: "long", point: { x: 740, y: 520 } },
    "player",
  );
  assert.equal(into.available, true, JSON.stringify(into.reasons));
  assert.deepEqual(into.landingCheck, { skill: "acrobatics", ability: "dex", dc: 10 });
  const left = h.s.actors.livia.movement;
  h.cmd("jump2", (d) =>
    D.commitJump(
      d,
      { actorId: "livia", kind: "long", point: { x: 740, y: 520 } },
      "player",
      op("j2"),
    ),
  );
  assert.equal(Math.round((left - h.s.actors.livia.movement) * 100) / 100, 2.4);
  const landing = h.s.combatAttempts.find((a) => a.id === "j2:landing");
  assert.equal(landing.requests[0].dc, 10);
  h.cmd("roll", (d) => answer(d, landing, [3], "player"));
  assert.equal(hasCondition(h.s.actors.livia, "prone"), true);
  assert.match(h.s.combatAttempts.find((a) => a.id === "j2:landing").outcomes[0].label.it, /Prono/);
});

test("a 6 m fall requests 2d6 from the creature's controller, lands Prone and resets the altitude", () => {
  const h = harness();
  h.cmd(
    "perch",
    (d) => {
      const t = token(d, "livia");
      D.sliceOf(d).altitudes[t.id] = 6;
    },
    "dm",
  );
  const p = D.previewFall(h.s, { actorId: "livia" }, "player");
  assert.deepEqual([p.meters, p.dice, p.formula, p.prone], [6, 2, "2d6", true]);
  assert.equal(D.previewFall(h.s, { actorId: "livia" }, "dm").available, true);
  const attempt = h.cmd("fall", (d) => D.commitFall(d, { actorId: "livia" }, "player", op("f1")));
  assert.equal(D.altitudeOf(h.s, "livia"), 0);
  const request = h.s.combatAttempts.find((a) => a.id === attempt.id).requests[0];
  assert.deepEqual(
    [request.kind, request.dice, request.actorId],
    ["damage", [{ count: 2, sides: 6 }], "livia"],
  );
  const hp = h.s.actors.livia.hp;
  h.cmd("roll", (d) => answer(d, attempt, [3, 4], "player"));
  assert.equal(h.s.actors.livia.hp, hp - 7);
  assert.equal(hasCondition(h.s.actors.livia, "prone"), true);
  // Under 3 m: no dice at all.
  h.cmd(
    "low",
    (d) => {
      D.sliceOf(d).altitudes[token(d, "doran").id] = 2;
    },
    "dm",
  );
  assert.equal(D.previewFall(h.s, { actorId: "doran" }, "dm").dice, 0);
  assert.equal(
    h.cmd("low-fall", (d) => D.commitFall(d, { actorId: "doran" }, "dm", op("f2")), "dm"),
    null,
  );
});

// ---------------------------------------------------------------- climb, swim, fly

test("climbing costs double (or a DC 15 check on the slippery wall); a cat's Climb Speed costs 1:1", () => {
  const h = harness();
  h.cmd("near", (d) => place(d, "livia", 130, 400), "dm");
  const near = D.climbableNear(h.s, "livia");
  assert.equal(near[0].feature.id, "sm-west-wall");
  const p = D.previewClimb(
    h.s,
    { actorId: "livia", featureId: "sm-west-wall", height: 3 },
    "player",
  );
  assert.deepEqual([p.available, p.cost, p.factor], [true, 6, 2]);
  h.cmd("climb", (d) =>
    D.commitClimb(
      d,
      { actorId: "livia", featureId: "sm-west-wall", height: 3 },
      "player",
      op("c1"),
    ),
  );
  assert.equal(D.altitudeOf(h.s, "livia"), 3);
  // Slippery north wall: the Athletics check decides; failure costs nothing.
  h.cmd("to-north", (d) => place(d, "doran", 200, 230), "dm");
  const attempt = h.cmd(
    "climb2",
    (d) =>
      D.commitClimb(d, { actorId: "doran", featureId: "sm-north-wall", height: 3 }, "dm", op("c2")),
    "dm",
  );
  assert.equal(attempt.requests[0].dc, 15);
  h.cmd("fail", (d) => answer(d, attempt, [2], "dm"), "dm");
  assert.equal(D.altitudeOf(h.s, "doran"), 0);
  // Mira in cat form (Inc. 9): Climb Speed, and Jumper uses Dexterity.
  h.cmd(
    "cat",
    (d) => {
      const a = d.actors.mira;
      const choice = {
        profileId: "srd2024:cat",
        tempHpChoice: "replace",
        equipment: a.inventory.map((i) => ({ itemId: i.id, disposition: "merge" })),
      };
      const pv = forms.previewWildShape(d, "mira", choice, "player");
      forms.applyWildShape(d, "mira", choice, "player", {
        operationId: "cat",
        reviewKey: pv.reviewKey,
      });
      place(d, "mira", 130, 520);
    },
    "player",
  );
  const cat = D.previewClimb(
    h.s,
    { actorId: "mira", featureId: "sm-west-wall", height: 3 },
    "player",
  );
  assert.deepEqual([cat.factor, cat.cost], [1, 3]);
  const jumper = D.jumpProfile(h.s, "mira", { runUp: true });
  assert.deepEqual([jumper.ability, jumper.long], ["dex", 4.5]);
});

test("swimming across the fountain costs double in the water, through the core movement; drained water is walked", () => {
  const h = harness();
  h.cmd(
    "combat",
    (d) => {
      place(d, "livia", 400, 325);
      startCombat(d);
    },
    "dm",
  );
  const p = D.previewSwim(h.s, { actorId: "livia", point: { x: 600, y: 325 } }, "player");
  assert.deepEqual([p.meters, p.water, p.cost], [6, 3.6, 9.6]);
  // 9.6 m exceeds Livia's 9 m: refused with the reason; closer is fine.
  assert.equal(p.available, false);
  assert.match(p.reasons[0].it, /Costa 9,6 m di movimento: te ne restano 9 m/);
  const short = D.previewSwim(h.s, { actorId: "livia", point: { x: 580, y: 325 } }, "player");
  // 5,4 m of path, 3,6 m of it in the water: 9 m, exactly Livia's Speed.
  assert.deepEqual([short.available, short.cost], [true, 9]);
  h.cmd("swim", (d) =>
    D.commitSwim(d, { actorId: "livia", point: { x: 580, y: 325 } }, "player", op("s1")),
  );
  assert.equal(token(h.s, "livia").x, 580);
  assert.equal(Math.round(h.s.actors.livia.movement * 10) / 10, 0);
  assert.equal(D.lastMove(h.s, "livia").kind, "swim");
  // The lever drains the fountain: no more water on that path.
  h.cmd(
    "drain",
    (d) => {
      D.featureById(d, "sm-fountain").drained = true;
    },
    "dm",
  );
  assert.equal(
    D.previewSwim(h.s, { actorId: "livia", point: { x: 420, y: 325 } }, "player").reasons.some(
      (r) => r.code === "no-water",
    ),
    true,
  );
});

test("flying needs a Fly Speed the DM records; altitude is visible and a Prone flyer falls", () => {
  const h = harness();
  const none = D.previewFly(h.s, { actorId: "livia", altitude: 6 }, "player");
  assert.equal(none.reasons[0].code, "no-fly-speed");
  assert.throws(
    () =>
      h.cmd("grant", (d) =>
        D.commitGrantFlight(d, { actorId: "livia", speed: 18, label: "Volare" }, "player"),
      ),
    /DM/,
  );
  h.cmd(
    "grant",
    (d) =>
      D.commitGrantFlight(d, { actorId: "livia", speed: 18, label: "Incantesimo Volare" }, "dm"),
    "dm",
  );
  const up = D.previewFly(
    h.s,
    { actorId: "livia", point: { x: 350, y: 380 }, altitude: 6 },
    "player",
  );
  assert.deepEqual([up.available, up.cost], [true, 9]);
  h.cmd("fly", (d) =>
    D.commitFly(
      d,
      { actorId: "livia", point: { x: 350, y: 380 }, altitude: 6 },
      "player",
      op("fly1"),
    ),
  );
  assert.equal(D.altitudeOf(h.s, "livia"), 6);
  assert.equal(D.fallingState(h.s, "livia"), null);
  h.cmd(
    "prone",
    (d) =>
      applyConditionEvent(d, {
        eventId: "test-prone",
        actorId: "livia",
        kind: "apply",
        conditionId: "prone",
        source: D.SOURCES.prone,
        term: { kind: "manual" },
      }),
    "dm",
  );
  const falling = D.fallingState(h.s, "livia");
  assert.equal(falling.altitude, 6);
  assert.equal(falling.cause.en, "Prone");
  const attempt = h.cmd(
    "drop",
    (d) => D.commitFall(d, { actorId: "livia" }, "dm", op("drop")),
    "dm",
  );
  assert.deepEqual(attempt.requests[0].dice, [{ count: 2, sides: 6 }]);
  assert.equal(D.fallingState(h.s, "livia"), null);
});

// ---------------------------------------------------------------- grapple, shove, drag

test("grapple via the 2024 Unarmed Strike: initiative, reach, the target's save, Grappled, drag, escape", () => {
  const h = harness();
  const out = D.previewGrapple(h.s, { actorId: "livia", targetId: "goblin-1" }, "player");
  assert.equal(out.reasons[0].code, "needs-initiative");
  h.cmd(
    "combat",
    (d) => {
      place(d, "livia", 570, 250);
      startCombat(d);
    },
    "dm",
  );
  const p = D.previewGrapple(h.s, { actorId: "livia", targetId: "goblin-1" }, "player");
  assert.equal(p.available, true, JSON.stringify(p.reasons));
  assert.deepEqual([p.dc, p.save.ability, p.save.bonus, p.chance], [10, "dex", 2, 0.35]);
  const attempt = h.cmd("grapple", (d) =>
    D.commitGrapple(d, { actorId: "livia", targetId: "goblin-1" }, "player", op("g1")),
  );
  assert.equal(h.s.actors.livia.action, false);
  const request = attempt.requests[0];
  assert.deepEqual(
    [request.kind, request.actorId, request.dc, request.modifier],
    ["save", "goblin-1", 10, 2],
  );
  // The goblin's controller may choose Strength instead (SRD: it chooses).
  h.cmd(
    "str",
    (d) => D.chooseSaveAbility(d, { attemptId: attempt.id, ability: "str" }, "dm"),
    "dm",
  );
  assert.equal(h.s.combatAttempts.find((a) => a.id === attempt.id).requests[0].modifier, 0);
  assert.throws(() =>
    h.cmd("x", (d) => D.chooseSaveAbility(d, { attemptId: attempt.id, ability: "dex" }, "player")),
  );
  h.cmd("save", (d) => answer(d, attempt, [5], "dm"), "dm");
  assert.equal(hasCondition(h.s.actors["goblin-1"], "grappled"), true);
  const grapple = D.grappleOf(h.s, "livia")[0];
  assert.deepEqual([grapple.grapplerId, grapple.targetId, grapple.dc], ["livia", "goblin-1", 10]);
  // Dragging costs double (Small is one size smaller, not two) and moves the goblin along.
  const drag = D.previewDrag(h.s, { actorId: "livia", point: { x: 520, y: 250 } }, "player");
  assert.deepEqual([drag.factor, drag.cost], [2, 3]);
  h.cmd("drag", (d) =>
    D.commitDrag(d, { actorId: "livia", point: { x: 520, y: 250 } }, "player", op("d1")),
  );
  // The grappler walks away and pulls the goblin along, right behind it.
  assert.equal(token(h.s, "livia").x, 520);
  assert.equal(token(h.s, "goblin-1").x, 570);
  assert.equal(Math.round(h.s.actors.livia.movement * 10) / 10, 6);
  assert.equal(D.movementHistory(h.s, "goblin-1", { scope: "all" }).at(-1).kind, "dragged");
  // The goblin's turn: escape with Athletics or Acrobatics against the escape DC.
  h.cmd("to-goblin", (d) => goTo(d, "goblin-1"), "dm");
  const esc = D.previewEscape(h.s, { actorId: "goblin-1" }, "dm");
  assert.deepEqual([esc.available, esc.dc, esc.skill], [true, 10, "acrobatics"]);
  const escape = h.cmd(
    "escape",
    (d) => D.commitEscape(d, { actorId: "goblin-1" }, "dm", op("e1")),
    "dm",
  );
  h.cmd("roll", (d) => answer(d, escape, [12], "dm"), "dm");
  assert.equal(hasCondition(h.s.actors["goblin-1"], "grappled"), false);
  assert.equal(D.grappleOf(h.s, "livia").length, 0);
});

test("grapple limits: a full pair of hands, targets two sizes larger, out of reach", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      giveDoranSword(d);
      place(d, "doran", 570, 250);
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const hands = D.previewGrapple(h.s, { actorId: "doran", targetId: "goblin-1" }, "dm");
  assert.equal(hands.reasons[0].code, "no-free-hand");
  const far = D.previewShove(h.s, { actorId: "doran", targetId: "goblin-2" }, "dm");
  assert.equal(
    far.reasons.some((r) => r.code === "out-of-reach"),
    true,
  );
  h.cmd(
    "huge",
    (d) => {
      d.actors["goblin-1"].size = "huge";
    },
    "dm",
  );
  assert.equal(
    D.previewShove(h.s, { actorId: "doran", targetId: "goblin-1" }, "dm").reasons.some(
      (r) => r.code === "too-large",
    ),
    true,
  );
});

test("shove: preview of the push trajectory, blocked by a creature behind, Prone instead; a ledge makes it fall", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      place(d, "doran", 570, 250);
      D.sliceOf(d).altitudes[token(d, "goblin-1").id] = 3;
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const p = D.previewShove(h.s, { actorId: "doran", targetId: "goblin-1", effect: "push" }, "dm");
  assert.equal(p.available, true, JSON.stringify(p.reasons));
  assert.deepEqual(p.push.landing, { x: 670, y: 250 });
  assert.deepEqual(p.push.fall, { meters: 3, dice: 1 });
  const attempt = h.cmd(
    "shove",
    (d) =>
      D.commitShove(d, { actorId: "doran", targetId: "goblin-1", effect: "push" }, "dm", op("sh1")),
    "dm",
  );
  h.cmd("save", (d) => answer(d, attempt, [1], "dm"), "dm");
  assert.deepEqual([token(h.s, "goblin-1").x, token(h.s, "goblin-1").y], [670, 250]);
  assert.equal(D.altitudeOf(h.s, "goblin-1"), 0);
  const fall = h.s.combatAttempts.find((a) => a.id === "sh1:ledge:fall");
  assert.deepEqual(fall.requests[0].dice, [{ count: 1, sides: 6 }]);
  assert.match(
    h.s.combatAttempts.find((a) => a.id === "sh1").outcomes[0].label.it,
    /giù dal bordo/,
  );
  // Blocked: a creature right behind the target.
  const h2 = harness();
  h2.cmd(
    "setup",
    (d) => {
      place(d, "doran", 570, 250);
      place(d, "goblin-2", 670, 250);
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const blocked = D.previewShove(
    h2.s,
    { actorId: "doran", targetId: "goblin-1", effect: "push" },
    "dm",
  );
  assert.equal(blocked.push.blocked, true);
  assert.match(blocked.reasons[0].it, /Spinta bloccata: lo spazio dietro è occupato/);
  const prone = D.previewShove(
    h2.s,
    { actorId: "doran", targetId: "goblin-1", effect: "prone" },
    "dm",
  );
  assert.equal(prone.available, true);
  const attempt2 = h2.cmd(
    "prone",
    (d) =>
      D.commitShove(
        d,
        { actorId: "doran", targetId: "goblin-1", effect: "prone" },
        "dm",
        op("sh2"),
      ),
    "dm",
  );
  h2.cmd("save", (d) => answer(d, attempt2, [2], "dm"), "dm");
  assert.equal(hasCondition(h2.s.actors["goblin-1"], "prone"), true);
});

// ---------------------------------------------------------------- throw and mastery

test("a thrown handaxe: normal and long range, Disadvantage beyond normal, stays on the ground until picked up", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      giveDoranSword(d);
      place(d, "doran", 350, 250);
      place(d, "goblin-1", 650, 250);
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const actions = listActions(h.s, "doran");
  const axe = actions.find((a) => a.id === "special-moves.throw.sm-doran-handaxe");
  assert.deepEqual(
    [axe.rangeMeters, axe.longRangeMeters, axe.attackModifier, axe.attackType],
    [6, 18, 2, "ranged"],
  );
  assert.ok(actions.find((a) => a.id === "special-moves.weapon.doran-longsword"));
  // 9 m: within long range, Disadvantage with the SRD reason.
  const long = previewAction(h.s, "doran", axe.id, { targetIds: ["goblin-1"] }, "dm");
  assert.equal(long.available, true, JSON.stringify(long.reasons));
  assert.equal(long.rollMode, "disadvantage");
  assert.ok(long.rollReasons.some((r) => r.code === "long-range"));
  // 21 m: beyond long range.
  h.cmd("far", (d) => place(d, "goblin-1", 1000 - 50, 250), "dm");
  h.cmd("far2", (d) => place(d, "doran", 250, 250), "dm");
  assert.ok(
    previewAction(h.s, "doran", axe.id, { targetIds: ["goblin-1"] }, "dm").reasons.some(
      (r) => r.code === "out-of-range",
    ),
  );
  h.cmd(
    "near",
    (d) => {
      place(d, "doran", 350, 250);
      place(d, "goblin-1", 500, 250);
    },
    "dm",
  );
  h.cmd(
    "throw",
    (d) =>
      beginAttempt(
        d,
        {
          id: "t1",
          actorId: "doran",
          actionId: axe.id,
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  const thrown = D.sliceOf(h.s).thrown[0];
  assert.deepEqual(
    [thrown.itemId, thrown.targetId, thrown.x],
    ["sm-doran-handaxe", "goblin-1", 516],
  );
  assert.equal(D.throwMenu(h.s, "doran").find((m) => m.itemId === "sm-doran-handaxe").inHand, 1);
  // Picking it up: 1.5 m from where it lies, the free object interaction.
  assert.equal(
    D.previewRecover(h.s, { actorId: "doran", thrownId: thrown.id }, "dm").reasons[0].code,
    "pending",
  );
});

test("Weapon Mastery: Sap and Vex apply to the next attack roll with their SRD reason, then expire", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      giveDoranSword(d);
      place(d, "doran", 570, 250);
      d.actors["goblin-1"].combatProfile = {
        team: "watch",
        meleeAttack: {
          name: { it: "Scimitarra", en: "Scimitar" },
          reachMeters: 1.5,
          attackBonus: 4,
          damageModifier: 2,
          damageDice: [{ count: 1, sides: 6 }],
          damageType: "slashing",
          source: { kind: "authored-demo", edition: "2024", revision: "test" },
        },
      };
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const sword = "special-moves.weapon.doran-longsword";
  const row = h.s.actors.doran.inventory.find((r) => r.id === "doran-longsword");
  assert.deepEqual(D.masteryOf(h.s, h.s.actors.doran, row).property, "sap");
  h.cmd(
    "hit",
    (d) =>
      beginAttempt(
        d,
        {
          id: "a1",
          actorId: "doran",
          actionId: sword,
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  const attempt = h.s.combatAttempts.find((a) => a.id === "a1");
  assert.deepEqual(attempt.mastery, { property: "sap", itemId: "doran-longsword" });
  h.cmd("attack", (d) => answer(d, attempt, [18], "dm"), "dm");
  h.cmd("damage", (d) => answer(d, attempt, [5], "dm"), "dm");
  // The goblin's next attack roll: Disadvantage from Sap.
  h.cmd("turn", (d) => goTo(d, "goblin-1"), "dm");
  const sapped = previewAction(h.s, "goblin-1", "melee-attack", { targetIds: ["doran"] }, "dm");
  assert.ok(sapped.rollReasons.some((r) => r.code === "mastery-sap" && r.mode === "disadvantage"));
  h.cmd(
    "goblin attacks",
    (d) =>
      beginAttempt(
        d,
        {
          id: "g-att",
          actorId: "goblin-1",
          actionId: "melee-attack",
          selection: { targetIds: ["doran"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  assert.equal(
    previewAction(h.s, "goblin-1", "melee-attack", { targetIds: ["doran"] }, "dm").rollReasons.some(
      (r) => r.code === "mastery-sap",
    ),
    false,
  );
  // Vex: a thrown handaxe that hits and damages gives Doran Advantage against that goblin.
  const h2 = harness();
  h2.cmd(
    "setup",
    (d) => {
      giveDoranSword(d);
      place(d, "doran", 450, 250);
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const axe = "special-moves.throw.sm-doran-handaxe";
  h2.cmd(
    "throw",
    (d) =>
      beginAttempt(
        d,
        {
          id: "v1",
          actorId: "doran",
          actionId: axe,
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  const v1 = h2.s.combatAttempts.find((a) => a.id === "v1");
  h2.cmd("attack", (d) => answer(d, v1, [17], "dm"), "dm");
  h2.cmd("damage", (d) => answer(d, v1, [4], "dm"), "dm");
  const ready = h2.s.combatAttempts.find((a) => a.id === "v1").outcomes[0];
  if (ready.status === "ready")
    h2.cmd("apply", (d) => applyReadyOutcome(d, "v1", "goblin-1", "dm"), "dm");
  h2.cmd(
    "next",
    (d) => {
      goTo(d, "goblin-1");
      goTo(d, "doran");
    },
    "dm",
  );
  const vexed = previewAction(
    h2.s,
    "doran",
    "special-moves.weapon.doran-longsword",
    { targetIds: ["goblin-1"] },
    "dm",
  );
  assert.ok(
    vexed.rollReasons.some((r) => r.code === "mastery-vex" && r.mode === "advantage"),
    JSON.stringify(vexed.rollReasons),
  );
  // After Doran's next turn ends the window is over.
  h2.cmd(
    "later",
    (d) => {
      goTo(d, "goblin-1");
      goTo(d, "doran");
    },
    "dm",
  );
  assert.equal(
    previewAction(
      h2.s,
      "doran",
      "special-moves.weapon.doran-longsword",
      { targetIds: ["goblin-1"] },
      "dm",
    ).rollReasons.some((r) => r.code === "mastery-vex"),
    false,
  );
  // DDB-041: without the Weapon Mastery feature the property shows but is not active.
  assert.equal(D.masteryOf(h2.s, h2.s.actors.livia, { weaponType: "longsword" }).active, false);
});

// ---------------------------------------------------------------- Help, Hide, Search, Study, Influence, Utilize

test("Help distracts an enemy: an ally's next attack against it has Advantage, once", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      giveDoranSword(d);
      place(d, "livia", 570, 250);
      place(d, "doran", 620, 300);
      startCombat(d, ["livia", "doran", "goblin-1", "goblin-2"]);
    },
    "dm",
  );
  h.cmd("help", (d) =>
    D.commitHelp(d, { actorId: "livia", mode: "attack", targetId: "goblin-1" }, "player", op("h1")),
  );
  h.cmd("to doran", (d) => goTo(d, "doran"), "dm");
  const sword = "special-moves.weapon.doran-longsword";
  const p = previewAction(h.s, "doran", sword, { targetIds: ["goblin-1"] }, "dm");
  assert.ok(p.rollReasons.some((r) => r.code === "help-attack"));
  assert.equal(p.rollMode, "advantage");
  h.cmd(
    "attack",
    (d) =>
      beginAttempt(
        d,
        {
          id: "da",
          actorId: "doran",
          actionId: sword,
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  assert.equal(
    previewAction(h.s, "doran", sword, { targetIds: ["goblin-1"] }, "dm").rollReasons.some(
      (r) => r.code === "help-attack",
    ),
    false,
  );
});

test("Hide: refused in sight with the watchers named; the DM confirms cover; Search finds the hidden creature", () => {
  const h = harness();
  const seen = D.previewHide(h.s, { actorId: "livia" }, "player");
  assert.equal(seen.available, false);
  assert.match(seen.reasons[0].it, /Sei in vista di: Sentinella, Esploratore/);
  const attempt = h.cmd(
    "hide",
    (d) => D.commitHide(d, { actorId: "livia", confirmed: true }, "dm", op("hd")),
    "dm",
  );
  assert.deepEqual([attempt.requests[0].actorId, attempt.requests[0].dc], ["livia", 15]);
  h.cmd("roll", (d) => answer(d, attempt, [16], "player"));
  assert.equal(hasCondition(h.s.actors.livia, "invisible"), true);
  assert.deepEqual(D.hiddenFor(h.s, "livia", "player"), { dc: 18 });
  assert.deepEqual(D.hiddenFor(h.s, "livia", "dm"), { dc: 18 });
  // The Sentinella searches (Perception) and meets the DC.
  const search = h.cmd(
    "search",
    (d) => D.commitSearch(d, { actorId: "goblin-1", skill: "perception" }, "dm", op("s1")),
    "dm",
  );
  h.cmd("roll", (d) => answer(d, search, [19], "dm"), "dm");
  assert.equal(hasCondition(h.s.actors.livia, "invisible"), false);
  assert.match(
    h.s.combatAttempts.find((a) => a.id === "s1").outcomes[0].label.it,
    /Trova: .*Livia/,
  );
});

test("Search reveals the lever, Utilize pulls it and drains the fountain; Study recalls lore on a success", () => {
  const h = harness();
  h.cmd("near", (d) => place(d, "livia", 560, 340), "dm");
  assert.equal(
    D.previewUtilize(h.s, { actorId: "livia", featureId: "sm-lever" }, "player").reasons[0].code,
    "choose-object",
  );
  const search = h.cmd("search", (d) =>
    D.commitSearch(d, { actorId: "livia", skill: "perception" }, "player", op("s2")),
  );
  h.cmd("roll", (d) => answer(d, search, [12], "player"));
  assert.equal(D.featureById(h.s, "sm-lever").revealed, true);
  assert.match(
    h.s.combatAttempts.find((a) => a.id === "s2").outcomes[0].label.it,
    /Leva di bronzo/,
  );
  const use = D.previewUtilize(h.s, { actorId: "livia", featureId: "sm-lever" }, "player");
  assert.equal(use.available, true, JSON.stringify(use.reasons));
  const record = h.cmd("pull", (d) =>
    D.commitUtilize(d, { actorId: "livia", featureId: "sm-lever" }, "player", op("u1")),
  );
  assert.match(record.outcome.it, /la vasca si svuota/);
  assert.equal(D.featureById(h.s, "sm-fountain").drained, true);
  const study = h.cmd("study", (d) =>
    D.commitStudy(
      d,
      { actorId: "livia", subject: { kind: "actor", id: "goblin-1" }, skill: "history" },
      "player",
      op("st1"),
    ),
  );
  h.cmd("roll", (d) => answer(d, study, [11], "player"));
  const learned = D.learnedFor(h.s, "player");
  assert.equal(learned[0].lore.id, "lore-sentinella");
  assert.equal(D.learnedFor(h.s, "dm").length, 1);
});

test("Influence: the DM judges willing, unwilling or hesitant; a hesitant check uses DC 15 and the attitude", () => {
  const h = harness();
  const missing = D.previewInfluence(
    h.s,
    { actorId: "livia", targetId: "goblin-2", skill: "persuasion", urge: "" },
    "player",
  );
  assert.equal(missing.reasons[0].code, "urge");
  const j = h.cmd("influence", (d) =>
    D.commitInfluence(
      d,
      { actorId: "livia", targetId: "goblin-2", skill: "persuasion", urge: "Abbassa la lancia" },
      "player",
      op("i1"),
    ),
  );
  // DC 15 or the creature's Intelligence, whichever is higher (the sample goblin has 16).
  assert.deepEqual([j.status, j.dc, j.attitude], ["awaiting-dm", 16, "hostile"]);
  assert.throws(() =>
    h.cmd("judge", (d) =>
      D.commitJudge(d, { judgementId: j.id, decision: "willing" }, "player", op("x")),
    ),
  );
  h.cmd(
    "judge",
    (d) => D.commitJudge(d, { judgementId: j.id, decision: "hesitant" }, "dm", op("i1-roll")),
    "dm",
  );
  const attempt = h.s.combatAttempts.find((a) => a.id === "i1-roll");
  assert.deepEqual([attempt.requests[0].rollMode, attempt.requests[0].dc], ["disadvantage", 16]);
  h.cmd("roll", (d) => answer(d, attempt, [18, 9], "player"));
  const after = D.sliceOf(h.s).judgements[0];
  assert.equal(after.status, "failed");
  assert.equal(
    D.previewInfluence(
      h.s,
      { actorId: "livia", targetId: "goblin-2", skill: "persuasion", urge: "Ancora" },
      "player",
    ).reasons.some((r) => r.code === "wait"),
    true,
  );
  const j2 = h.cmd("again", (d) =>
    D.commitInfluence(
      d,
      { actorId: "livia", targetId: "goblin-1", skill: "intimidation", urge: "Scappa" },
      "player",
      op("i2"),
    ),
  );
  h.cmd(
    "willing",
    (d) => D.commitJudge(d, { judgementId: j2.id, decision: "willing" }, "dm", op("x2")),
    "dm",
  );
  assert.equal(D.sliceOf(h.s).judgements[1].status, "succeeded");
});

// ---------------------------------------------------------------- approval, history, range

test("approval modes: a player's move becomes a proposal the DM approves or cancels; out of turn too", () => {
  const h = harness();
  assert.equal(D.approvalRequired(h.s, "livia", "player"), false);
  h.cmd("mode", (d) => D.commitApprovalMode(d, { mode: "all" }, "dm"), "dm");
  assert.equal(D.approvalRequired(h.s, "livia", "player"), true);
  assert.equal(D.approvalRequired(h.s, "livia", "dm"), false);
  const proposal = h.cmd("propose", (d) =>
    D.commitPropose(d, { actorId: "livia", point: { x: 330, y: 380 } }, "player", op("p1")),
  );
  assert.equal(token(h.s, "livia").x, 250);
  assert.deepEqual(
    D.pendingProposals(h.s).map((p) => p.id),
    [proposal.id],
  );
  assert.throws(() =>
    h.cmd("x", (d) =>
      D.commitDecide(d, { proposalId: proposal.id, decision: "approve" }, "player", op("x")),
    ),
  );
  h.cmd(
    "approve",
    (d) => D.commitDecide(d, { proposalId: proposal.id, decision: "approve" }, "dm", op("ok")),
    "dm",
  );
  assert.equal(token(h.s, "livia").x, 330);
  const second = h.cmd("again", (d) =>
    D.commitPropose(d, { actorId: "livia", point: { x: 330, y: 480 } }, "player", op("p2")),
  );
  h.cmd(
    "cancel",
    (d) => D.commitDecide(d, { proposalId: second.id, decision: "cancel" }, "dm", op("no")),
    "dm",
  );
  assert.equal(token(h.s, "livia").y, 380);
  // Not Your Turn: only out of turn; the DM places the token without spending movement.
  h.cmd(
    "nyt",
    (d) => {
      D.commitApprovalMode(d, { mode: "out-of-turn" }, "dm");
      startCombat(d, ["goblin-1", "livia", "doran", "goblin-2"]);
    },
    "dm",
  );
  assert.equal(D.approvalRequired(h.s, "livia", "player"), true);
  const third = h.cmd("propose3", (d) =>
    D.commitPropose(d, { actorId: "livia", point: { x: 380, y: 380 } }, "player", op("p3")),
  );
  h.cmd(
    "approve3",
    (d) => D.commitDecide(d, { proposalId: third.id, decision: "approve" }, "dm", op("ok3")),
    "dm",
  );
  assert.equal(token(h.s, "livia").x, 380);
  assert.equal(h.s.actors.livia.movement, 9);
  assert.equal(D.lastMove(h.s, "livia").kind, "approved");
});

test("movement history per turn (core moves and special moves), last move and the DM's clear", () => {
  const h = harness();
  h.cmd("combat", (d) => startCombat(d), "dm");
  h.cmd("move", (d) =>
    beginMovement(d, { id: "m1", actorId: "livia", point: { x: 300, y: 380 } }, "player"),
  );
  h.cmd("jump", (d) =>
    D.commitJump(
      d,
      { actorId: "livia", kind: "long", point: { x: 350, y: 380 } },
      "player",
      op("j1"),
    ),
  );
  const rows = D.movementHistory(h.s, "livia", { scope: "turn" });
  assert.deepEqual(
    rows.map((r) => r.kind),
    ["move", "long-jump"],
  );
  assert.equal(D.lastMove(h.s, "livia").kind, "long-jump");
  h.cmd("next", (d) => advanceTurn(d), "dm");
  assert.equal(D.movementHistory(h.s, "livia", { scope: "turn" }).length, 0);
  assert.equal(D.movementHistory(h.s, "livia", { scope: "all" }).length, 2);
  assert.throws(() => h.cmd("clear", (d) => D.clearHistories(d, "player")));
  h.cmd("clear", (d) => D.clearHistories(d, "dm"), "dm");
  assert.equal(D.movementHistory(h.s, "livia", { scope: "all" }).length, 0);
});

test("two-tier range: movement left and with a Dash, outlines follow the distance rule", () => {
  const h = harness();
  h.cmd("combat", (d) => startCombat(d), "dm");
  h.cmd("move", (d) =>
    beginMovement(d, { id: "m1", actorId: "livia", point: { x: 350, y: 380 } }, "player"),
  );
  const tiers = D.rangeTiers(h.s, "livia");
  assert.deepEqual([tiers.base, tiers.dash, tiers.dashAvailable], [6, 15, true]);
  assert.deepEqual(
    [D.tierOf(5, tiers), D.tierOf(12, tiers), D.tierOf(16, tiers)],
    ["normal", "dash", "beyond"],
  );
  // P6 TV-10: the default SRD grid reaches a square; the gridless rule a circle.
  const square = D.reachPolygon(h.s.scenes[0], { x: 500, y: 325 }, 3, { rays: 8 });
  assert.equal(Math.round(Math.hypot(square[1].x - 500, square[1].y - 325)), 141);
  h.cmd("line", (d) => D.commitSceneRule(d, { rule: "euclidean" }, "dm"), "dm");
  const circle = D.reachPolygon(h.s.scenes[0], { x: 500, y: 325 }, 3, { rays: 8 });
  assert.equal(Math.round(Math.hypot(circle[1].x - 500, circle[1].y - 325)), 100);
});

// ---------------------------------------------------------------- mounts and forms

test("mounts: the DM brings an SRD Riding Horse; mounting costs half Speed; riding uses the horse's Speed", () => {
  const h = harness();
  const horse = h.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  assert.deepEqual(
    [horse.size, horse.speed, horse.hp, horse.source.pages],
    ["large", 18, 13, [360]],
  );
  h.cmd(
    "combat",
    (d) => startCombat(d, ["livia", horse.id, "goblin-1", "doran", "goblin-2"]),
    "dm",
  );
  const p = D.previewMount(h.s, { actorId: "livia", mountId: horse.id }, "player");
  assert.deepEqual([p.available, p.cost], [true, 4.5], JSON.stringify(p.reasons));
  h.cmd("mount", (d) =>
    D.commitMount(d, { actorId: "livia", mountId: horse.id }, "player", op("mt")),
  );
  assert.equal(h.s.actors.livia.movement, 4.5);
  assert.equal(h.s.combat.order.includes(horse.id), false);
  const ride = D.previewRide(h.s, { actorId: "livia", point: { x: 650, y: 420 } }, "player");
  assert.equal(ride.available, true, JSON.stringify(ride.reasons));
  h.cmd("ride", (d) =>
    D.commitRide(d, { actorId: "livia", point: { x: 650, y: 420 } }, "player", op("rd")),
  );
  assert.equal(token(h.s, horse.id).x, 650);
  assert.equal(token(h.s, "livia").x, 650);
  assert.equal(h.s.actors.livia.movement, 4.5);
  h.cmd("dismount", (d) => D.commitDismount(d, { actorId: "livia" }, "player", op("dm")));
  assert.equal(D.mountOf(h.s, "livia"), null);
  assert.equal(h.s.combat.order[1], horse.id);
  assert.equal(h.s.actors.livia.movement, 0);
});

test("forms link: a creature in a Tiny cat form cannot carry a rider, and the size uses the form", () => {
  const h = harness();
  h.cmd(
    "cat",
    (d) => {
      const a = d.actors.mira;
      const choice = {
        profileId: "srd2024:cat",
        tempHpChoice: "replace",
        equipment: a.inventory.map((i) => ({ itemId: i.id, disposition: "merge" })),
      };
      const pv = forms.previewWildShape(d, "mira", choice, "player");
      forms.applyWildShape(d, "mira", choice, "player", {
        operationId: "cat",
        reviewKey: pv.reviewKey,
      });
      place(d, "mira", 250, 430);
    },
    "player",
  );
  const p = D.previewMount(h.s, { actorId: "livia", mountId: "mira" }, "player");
  assert.match(
    p.reasons.find((r) => r.code === "too-small").it,
    /Minuscola contro Media, nella forma attuale/,
  );
});

// ---------------------------------------------------------------- interface handlers

test("tray: every move is listed with its cost; unavailable ones say why (BG3)", () => {
  const h = harness();
  const html = UI.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.match(html, /data-sm-tray/);
  assert.doesNotMatch(html, /class="sm-tray"/);
  UI.viewState().tray = true;
  const open = UI.renderDock(h.ctx, { selectedActorId: "livia" });
  for (const kind of [
    "long-jump",
    "climb",
    "swim",
    "fly",
    "grapple",
    "shove",
    "throw",
    "help",
    "hide",
    "search",
    "study",
    "influence",
    "utilize",
  ])
    assert.match(open, new RegExp(`data-sm-move="${kind}"`), kind);
  assert.match(open, /data-sm-move="grapple" aria-disabled="true"/);
  assert.match(open, /Parte dell’azione di Attacco: prepara l’iniziativa/);
  assert.match(open, /Nessuna velocità di volo/);
  assert.equal(UI.renderDock(h.ctx, { selectedActorId: "goblin-1" }), "");
  h.ctx.lang = "en";
  assert.match(UI.renderDock(h.ctx, { selectedActorId: "livia" }), /Special moves/);
});

test("choosing a move arms a preview card; executing commits through the same domain; Undo is offered", () => {
  const h = harness();
  UI.chooseMove(h.ctx, "long-jump", "livia");
  assert.equal(UI.viewState().armed.kind, "long-jump");
  // BG3: the preview floats above the hotbar, where the move was chosen.
  const card = UI.renderDock(h.ctx, { selectedActorId: "livia", mode: "move" });
  assert.match(card, /data-sm-card="long-jump"/);
  assert.match(card, /Prendo la rincorsa/);
  UI.viewState().armed.runUp = true;
  UI.viewState().armed.aim = { x: 350, y: 380 };
  const record = UI.executeArmed(h.ctx);
  assert.equal(record.kind, "long-jump");
  assert.equal(UI.viewState().armed, null);
  const after = UI.renderInspector(h.ctx, { selectedActorId: "livia", mode: "move" });
  assert.match(after, /Salto in lungo di 3 m/);
  assert.match(after, /data-sm-undo/);
  h.ctx.undo();
  assert.equal(token(h.s, "livia").x, 250);
  // An unavailable move explains itself instead of arming.
  UI.chooseMove(h.ctx, "grapple", "livia");
  assert.equal(UI.viewState().armed, null);
  assert.match(h.toasts.at(-1).text, /prepara l’iniziativa/);
});

test("interception: with approval required a Move becomes a proposal; through water it swims", () => {
  const h = harness();
  h.cmd(
    "combat",
    (d) => {
      place(d, "livia", 400, 325);
      startCombat(d);
    },
    "dm",
  );
  assert.equal(UI.intercept(h.ctx, "livia", { x: 580, y: 325 }), true);
  assert.equal(token(h.s, "livia").x, 580);
  assert.equal(D.lastMove(h.s, "livia").kind, "swim");
  assert.equal(UI.intercept(h.ctx, "livia", { x: 580, y: 360 }), false);
  h.cmd("mode", (d) => D.commitApprovalMode(d, { mode: "all" }, "dm"), "dm");
  assert.equal(UI.intercept(h.ctx, "livia", { x: 600, y: 400 }), true);
  assert.equal(D.pendingProposals(h.s).length, 1);
  h.ctx.role = "dm";
  const dmPanel = UI.renderInspector(h.ctx, { selectedActorId: "livia", mode: "move" });
  assert.match(dmPanel, /propone un movimento/);
  assert.match(dmPanel, /data-sm-decide/);
  const note = h.registry.notifications(h.ctx);
  assert.ok(note.some((n) => String(n.id).startsWith("sm-proposal-")));
});

test("sheet section: D&D Beyond generic actions, jumps and Doran's Weapon Mastery with its slots", () => {
  const h = harness();
  h.cmd("sword", (d) => giveDoranSword(d), "dm");
  h.ctx.role = "dm";
  const html = UI.renderSheetSection(h.ctx, h.s.actors.doran);
  for (const word of [
    "Afferrare",
    "Spingere",
    "Aiutare",
    "Nascondersi",
    "Influenzare",
    "Cercare",
    "Studiare",
    "Usare",
  ])
    assert.match(html, new RegExp(word));
  assert.match(html, /Padronanza d’armi · 3\/3/);
  assert.match(html, /Fiaccare/);
  assert.match(html, /Vessazione/);
  assert.doesNotMatch(UI.renderSheetSection(h.ctx, h.s.actors.livia), /Padronanza d’armi/);
  assert.throws(
    () => h.cmd("4th", (d) => UI.toggleMastery(d, "doran", "shield", true, "dm")),
    (e) => /al massimo 3/.test(e.it),
  );
  h.cmd("swap", (d) => UI.toggleMastery(d, "doran", "longbow", false, "dm"), "dm");
  assert.deepEqual(D.sliceOf(h.s).masteries.doran, ["longsword", "handaxe"]);
});

test("map layers: hex grid, proposals ghost, labels for Alt and the armed jump arc", () => {
  const h = harness();
  const ground = h.registry.get("map-layer", "special-moves-ground");
  const top = h.registry.get("map-layer", "special-moves-top");
  h.cmd("hex", (d) => D.commitSceneRule(d, { rule: "hex" }, "dm"), "dm");
  const scene = h.s.scenes[0];
  assert.match(
    ground.svg(h.ctx, { scene, selectedActorId: "livia", mode: "move" }),
    /class="sm-hex"/,
  );
  h.cmd("mode", (d) => D.commitApprovalMode(d, { mode: "all" }, "dm"), "dm");
  h.cmd("propose", (d) =>
    D.commitPropose(d, { actorId: "livia", point: { x: 330, y: 380 } }, "player", op("p1")),
  );
  assert.match(
    ground.svg(h.ctx, { scene: h.s.scenes[0], selectedActorId: "livia", mode: "move" }),
    /data-sm-proposal/,
  );
  const labels = top.svg(h.ctx, { scene: h.s.scenes[0], selectedActorId: "livia", mode: "move" });
  assert.match(labels, /data-sm-labels-layer/);
  assert.match(labels, /Vasca della fontana/);
  assert.doesNotMatch(labels, /Leva di bronzo/);
  h.ctx.role = "dm";
  assert.match(
    top.svg(h.ctx, { scene: h.s.scenes[0], selectedActorId: "livia", mode: "move" }),
    /Leva di bronzo · segreto/,
  );
  h.ctx.role = "player";
  UI.chooseMove(h.ctx, "long-jump", "livia");
  UI.viewState().armed.aim = { x: 300, y: 380 };
  const armed = top.svg(h.ctx, { scene: h.s.scenes[0], selectedActorId: "livia", mode: "move" });
  assert.match(armed, /data-sm-capture/);
  assert.match(armed, /data-sm-arc/);
  const tools = h.registry.list("table-tool", h.ctx, {});
  assert.ok(tools.some((t) => t.id === "special-moves-ruler" && t.group === "measure"));
  // The DM's map rules and approvals: a DM-only tab of the right sidebar (B61 rule 2).
  const tabs = (ctx) =>
    h.registry
      .list("table-panel", ctx, {})
      .filter((c) => c.placement === "sidebar-tab")
      .map((c) => c.id);
  assert.equal(tabs(h.ctx).includes("special-moves-rules"), false);
  h.ctx.role = "dm";
  assert.ok(tabs(h.ctx).includes("special-moves-rules"));
  const panel = h.registry.get("table-panel", "special-moves-rules");
  assert.match(panel.render(h.ctx, {}), /data-sm-approval/);
  assert.equal(
    h.registry.list("table-panel", h.ctx, {}).find((c) => c.id === "special-moves").placement,
    "dock",
  );
});

test("reload keeps grapples, thrown weapons, proposals and the scene rule; Undo restores a shove", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      place(d, "doran", 570, 250);
      D.commitSceneRule(d, { rule: "grid-srd" }, "dm");
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const attempt = h.cmd(
    "shove",
    (d) =>
      D.commitShove(d, { actorId: "doran", targetId: "goblin-1", effect: "push" }, "dm", op("sh")),
    "dm",
  );
  h.ctx.role = "dm";
  h.cmd("save", (d) => answer(d, attempt, [1], "dm"), "dm");
  assert.equal(token(h.s, "goblin-1").x, 670);
  h.reload();
  assert.equal(h.s.scenes[0].distanceRule, "grid-srd");
  assert.equal(token(h.s, "goblin-1").x, 670);
  assert.equal(D.movementHistory(h.s, "goblin-1", { scope: "all" }).at(-1).kind, "pushed");
});

test("offline: a special move stays a preview and says why; the thrown axe is picked up after the fight", () => {
  const h = harness();
  h.ctx.offline = true;
  UI.chooseMove(h.ctx, "long-jump", "livia");
  Object.assign(UI.viewState().armed, { runUp: true, aim: { x: 350, y: 380 } });
  assert.equal(UI.executeArmed(h.ctx), null);
  assert.equal(token(h.s, "livia").x, 250);
  assert.equal(h.toasts.at(-1).error, true);
  h.ctx.offline = false;
  // Throw, resolve, then pick it up: 1.5 m away, the free object interaction.
  h.cmd(
    "setup",
    (d) => {
      place(d, "doran", 350, 250);
      place(d, "goblin-1", 500, 250);
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  const axe = "special-moves.throw.sm-doran-handaxe";
  h.cmd(
    "throw",
    (d) =>
      beginAttempt(
        d,
        {
          id: "t2",
          actorId: "doran",
          actionId: axe,
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  const attempt = h.s.combatAttempts.find((a) => a.id === "t2");
  h.cmd("miss", (d) => answer(d, attempt, [2], "dm"), "dm");
  const entry = D.sliceOf(h.s).thrown[0];
  assert.equal(
    D.previewRecover(h.s, { actorId: "doran", thrownId: entry.id }, "dm").reasons[0].code,
    "too-far",
  );
  h.cmd(
    "walk",
    (d) => beginMovement(d, { id: "w1", actorId: "doran", point: { x: 500, y: 300 } }, "dm"),
    "dm",
  );
  const ok = D.previewRecover(h.s, { actorId: "doran", thrownId: entry.id }, "dm");
  assert.deepEqual([ok.available, ok.cost], [true, "free"]);
  h.cmd("pick", (d) => D.commitRecover(d, { actorId: "doran", thrownId: entry.id }, "dm"), "dm");
  assert.equal(h.s.actors.doran.objectInteractionUsed, true);
  assert.equal(D.throwMenu(h.s, "doran").find((m) => m.itemId === "sm-doran-handaxe").inHand, 2);
});

test("preparation and notifications: DM-only DCs and scene rule; proposals and judgements reach the DM's bell", () => {
  const h = harness();
  assert.throws(() =>
    h.cmd("dc", (d) => UI.setFeatureDc(d, "old-watch", "sm-lever", 10, "player")),
  );
  h.cmd("dc", (d) => UI.setFeatureDc(d, "old-watch", "sm-lever", 10, "dm"), "dm");
  assert.equal(D.featureById(h.s, "sm-lever").dc, 10);
  assert.throws(() => h.cmd("lore", (d) => UI.setLoreDc(d, "lore-fountain", 40, "dm"), "dm"));
  h.cmd("lore", (d) => UI.setLoreDc(d, "lore-fountain", 12, "dm"), "dm");
  h.ctx.role = "dm";
  const html = UI.renderPreparationSection(h.ctx);
  assert.match(html, /data-sm-prep-rule="old-watch"/);
  assert.match(html, /Leva di bronzo/);
  h.ctx.role = "player";
  h.cmd("mode", (d) => D.commitApprovalMode(d, { mode: "all" }, "dm"), "dm");
  h.cmd("propose", (d) =>
    D.commitPropose(d, { actorId: "livia", point: { x: 300, y: 380 } }, "player", op("p9")),
  );
  h.cmd("influence", (d) =>
    D.commitInfluence(
      d,
      { actorId: "livia", targetId: "goblin-1", skill: "persuasion", urge: "Parliamo" },
      "player",
      op("i9"),
    ),
  );
  assert.equal(
    h.registry.notifications(h.ctx).filter((n) => String(n.id).startsWith("sm-")).length,
    0,
  );
  h.ctx.role = "dm";
  const ids = h.registry.notifications(h.ctx).map((n) => n.id);
  assert.ok(ids.includes("sm-proposal-p9") && ids.includes("sm-judgement-i9"));
});

test("mastery marks on the Table: Sap on the struck creature, Vex for the attacker", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      giveDoranSword(d);
      place(d, "doran", 570, 250);
      startCombat(d, ["doran", "goblin-1", "livia", "goblin-2"]);
    },
    "dm",
  );
  h.cmd(
    "hit",
    (d) =>
      beginAttempt(
        d,
        {
          id: "m1",
          actorId: "doran",
          actionId: "special-moves.weapon.doran-longsword",
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "dm",
      ),
    "dm",
  );
  const attempt = h.s.combatAttempts.find((a) => a.id === "m1");
  h.cmd("attack", (d) => answer(d, attempt, [19], "dm"), "dm");
  h.cmd("damage", (d) => answer(d, attempt, [3], "dm"), "dm");
  assert.deepEqual(
    D.masteryMarks(h.s, "goblin-1").map((m) => m.property),
    ["sap"],
  );
  h.ctx.role = "dm";
  assert.match(
    UI.renderInspector(h.ctx, { selectedActorId: "goblin-1", mode: "move" }),
    /data-sm-mastery-mark="sap"/,
  );
});

test("I-229: after Undo an identical save request brings back the accepted faces, never a free reroll", () => {
  const h = harness({ role: "player" });
  h.cmd(
    "setup",
    (d) => {
      place(d, "livia", 570, 250);
      startCombat(d);
    },
    "dm",
  );
  h.cmd("grapple", (d) =>
    D.commitGrapple(d, { actorId: "livia", targetId: "goblin-1" }, "player", op("g-retry")),
  );
  const first = h.s.combatAttempts.find((a) => a.id === "g-retry");
  h.ctx.role = "dm";
  h.ctx.commit("save", (d) => answer(d, first, [4], "dm"));
  assert.equal(hasCondition(h.s.actors["goblin-1"], "grappled"), true);
  h.ctx.undo(); // withdraws the save
  h.ctx.role = "player";
  h.ctx.undo(); // withdraws the grapple (and gives the action back)
  assert.equal(h.s.actors.livia.action, true);
  h.cmd("again", (d) =>
    D.commitGrapple(d, { actorId: "livia", targetId: "goblin-1" }, "player", op("g-retry-2")),
  );
  const request = h.s.combatAttempts.find((a) => a.id === "g-retry-2").requests[0];
  assert.deepEqual(request.acceptedValues, [4]);
});

// ---------------------------------------------------------------- independent review (B40-rf)

test("review: hiding ends right after the hidden creature's attack roll, not at the end of its turn (SRD Hide)", () => {
  const h = harness();
  const hide = h.cmd(
    "hide",
    (d) => D.commitHide(d, { actorId: "livia", confirmed: true }, "dm", op("rf-hide")),
    "dm",
  );
  h.cmd("roll", (d) => answer(d, hide, [16], "player"));
  assert.equal(hasCondition(h.s.actors.livia, "invisible"), true);
  h.cmd(
    "combat",
    (d) => {
      place(d, "livia", 570, 250);
      startCombat(d);
    },
    "dm",
  );
  // The attack is declared: while its roll waits for the dice, Livia is still hidden.
  h.cmd("quarterstaff", (d) =>
    beginAttempt(
      d,
      {
        id: "rf-staff",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
      },
      "player",
    ),
  );
  const attempt = h.s.combatAttempts.find((a) => a.id === "rf-staff");
  assert.equal(attempt.requests[0].rollMode, "advantage");
  assert.ok(D.sliceOf(h.s).hidden.livia, "hidden until the roll is made");
  // The roll is made: the Invisible condition from Hide ends immediately after it.
  h.cmd("attack roll", (d) => answer(d, attempt, [15, 4], "player"));
  assert.equal(D.sliceOf(h.s).hidden.livia, undefined);
  assert.equal(hasCondition(h.s.actors.livia, "invisible"), false);
  assert.equal(h.s.combat.order[h.s.combat.turn], "livia", "still Livia's turn");
  // Undo of the roll brings the hiding back with it (one correction).
  h.ctx.undo();
  assert.ok(D.sliceOf(h.s).hidden.livia);
  assert.equal(hasCondition(h.s.actors.livia, "invisible"), true);
  // Casting a spell with a Verbal component (Magic Missile: V, S) also ends it at once.
  const due = D.dueConsequences({
    ...h.s,
    combatAttempts: [
      ...h.s.combatAttempts,
      { id: "rf-mm", actorId: "livia", actionId: "magic-missile", requests: [], outcomes: [] },
    ],
  });
  assert.deepEqual(due, [{ kind: "hidden", actorId: "livia" }]);
});

test("review: a grappler that walks away with an ordinary Move ends the grapple at once (out of range)", () => {
  const h = harness();
  h.cmd(
    "setup",
    (d) => {
      place(d, "livia", 570, 250);
      startCombat(d);
    },
    "dm",
  );
  const grab = h.cmd("grapple", (d) =>
    D.commitGrapple(d, { actorId: "livia", targetId: "goblin-1" }, "player", op("rf-g")),
  );
  h.cmd("save", (d) => answer(d, grab, [3], "dm"), "dm");
  assert.equal(hasCondition(h.s.actors["goblin-1"], "grappled"), true);
  h.cmd("walk away", (d) =>
    beginMovement(
      d,
      {
        id: "rf-walk",
        actorId: "livia",
        point: { x: 420, y: 250 },
        waypoints: [],
        geometryKey: geometryKey(d.scenes[0]),
      },
      "player",
    ),
  );
  assert.equal(token(h.s, "livia").x, 420);
  assert.equal(D.grappleOf(h.s, "livia").length, 0);
  assert.equal(hasCondition(h.s.actors["goblin-1"], "grappled"), false);
});

test("review: players never read an NPC's attitude; the DM sets it and can allow a new Influence attempt", () => {
  const h = harness();
  UI.chooseMove(h.ctx, "influence", "livia");
  const player = UI.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.doesNotMatch(player, /Ostile|Indifferente|Amichevole/);
  // Influence urges a monster: the other player characters are not targets.
  assert.doesNotMatch(player, /data-sm-target="doran"|data-sm-target="mira"/);
  assert.match(player, /data-sm-target="goblin-2"/);
  assert.equal(
    D.previewInfluence(
      h.s,
      { actorId: "livia", targetId: "doran", skill: "persuasion", urge: "Aiutami" },
      "player",
    ).reasons.some((r) => r.code === "not-monster"),
    true,
  );
  UI.resetSpecialMovesView();
  h.ctx.role = "dm";
  UI.chooseMove(h.ctx, "influence", "livia");
  assert.match(UI.renderDock(h.ctx, { selectedActorId: "livia" }), /Ostile/);
  UI.resetSpecialMovesView();
  // The DM changes the attitude from the selected creature's inspector.
  const dmPanel = UI.renderInspector(h.ctx, { selectedActorId: "goblin-2" });
  assert.match(dmPanel, /data-sm-attitude="goblin-2"/);
  h.ctx.role = "player";
  assert.doesNotMatch(
    UI.renderInspector(h.ctx, { selectedActorId: "goblin-2" }),
    /data-sm-attitude/,
  );
  assert.throws(() =>
    h.cmd("x", (d) => D.commitAttitude(d, { actorId: "goblin-2", attitude: "friendly" }, "player")),
  );
  h.cmd(
    "attitude",
    (d) => D.commitAttitude(d, { actorId: "goblin-2", attitude: "indifferent" }, "dm"),
    "dm",
  );
  // A failed attempt locks that approach; the DM may allow a new attempt (SRD: DM's call).
  const j = h.cmd("influence", (d) =>
    D.commitInfluence(
      d,
      { actorId: "livia", targetId: "goblin-2", skill: "persuasion", urge: "Abbassa la lancia" },
      "player",
      op("rf-i1"),
    ),
  );
  assert.equal(j.attitude, "indifferent");
  h.cmd(
    "judge",
    (d) => D.commitJudge(d, { judgementId: j.id, decision: "hesitant" }, "dm", op("rf-i1-roll")),
    "dm",
  );
  const roll = h.s.combatAttempts.find((a) => a.id === "rf-i1-roll");
  assert.equal(roll.requests[0].rollMode, "normal");
  h.cmd("roll", (d) => answer(d, roll, [3], "player"));
  const again = { actorId: "livia", targetId: "goblin-2", skill: "persuasion", urge: "Ancora" };
  assert.ok(D.previewInfluence(h.s, again, "player").reasons.some((r) => r.code === "wait"));
  h.ctx.role = "dm";
  assert.match(UI.renderInspector(h.ctx, { selectedActorId: "livia" }), /data-sm-retry="rf-i1"/);
  h.ctx.role = "player";
  assert.doesNotMatch(UI.renderInspector(h.ctx, { selectedActorId: "livia" }), /data-sm-retry/);
  assert.throws(() => h.cmd("x", (d) => D.commitAllowRetry(d, { judgementId: "rf-i1" }, "player")));
  h.cmd("retry", (d) => D.commitAllowRetry(d, { judgementId: "rf-i1" }, "dm"), "dm");
  assert.equal(
    D.previewInfluence(h.s, again, "player").reasons.some((r) => r.code === "wait"),
    false,
  );
});

test("review: the sheet's “Open at the Table” selects that creature; mastery slots follow the class tables", () => {
  const h = harness();
  let fire = null;
  const button = { addEventListener: (type, fn) => (fire = fn) };
  const el = {
    querySelector: (selector) => (selector === "[data-sm-open-table]" ? button : null),
    querySelectorAll: () => [],
  };
  let went = null;
  h.ctx.navigate = (page, params) => (went = { page, params });
  UI.bindSheetSection(el, h.ctx, h.s.actors.doran);
  fire();
  assert.deepEqual(went, { page: "table", params: { id: "doran" } });
  assert.equal(UI.viewState().tray, true);
  // SRD 5.2.1 class tables: Fighter 3/4/5/6 at 1/4/10/16, Barbarian 2/3/4 at 1/4/10.
  const slots = (classId, level) =>
    UI.masterySlots({ buildSeed: { classes: [{ classId, level }] } });
  assert.deepEqual(
    [slots("fighter", 3), slots("fighter", 4), slots("fighter", 10), slots("fighter", 16)],
    [3, 4, 5, 6],
  );
  assert.deepEqual(
    [slots("barbarian", 1), slots("barbarian", 4), slots("barbarian", 10), slots("barbarian", 20)],
    [2, 3, 4, 4],
  );
  assert.deepEqual([slots("paladin", 20), slots("rogue", 11), slots("wizard", 5)], [2, 2, 0]);
});

test("review: a mount shoved away carries its rider along, who saves (DC 10 Dex) or falls off", () => {
  const h = harness();
  const horse = h.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  h.cmd("mount", (d) =>
    D.commitMount(d, { actorId: "livia", mountId: horse.id }, "player", op("rf-mt")),
  );
  const at = { ...token(h.s, horse.id) };
  const rider = { ...token(h.s, "livia") };
  h.cmd(
    "combat",
    (d) => {
      place(d, "doran", at.x + 50, at.y);
      startCombat(d, ["doran", "livia", "goblin-1", "goblin-2"]);
    },
    "dm",
  );
  const shove = h.cmd(
    "shove the horse",
    (d) =>
      D.commitShove(d, { actorId: "doran", targetId: horse.id, effect: "push" }, "dm", op("rf-sh")),
    "dm",
  );
  h.cmd("save", (d) => answer(d, shove, [1], "dm"), "dm");
  // The horse moved 1.5 m away from Doran, and Livia stays in the saddle, on it.
  assert.equal(token(h.s, horse.id).x, at.x - 50);
  assert.deepEqual([token(h.s, "livia").x, token(h.s, "livia").y], [rider.x - 50, rider.y]);
  // SRD Falling Off (EN 16 / IT 17): an effect moved the mount against its will.
  const save = h.s.combatAttempts.find((a) => a.id === "rf-sh:rider");
  assert.deepEqual(
    [save?.requests[0].actorId, save?.requests[0].kind, save?.requests[0].dc],
    ["livia", "save", 10],
  );
  h.cmd("dex save", (d) => answer(d, save, [2], "player"));
  assert.equal(D.mountOf(h.s, "livia"), null);
  assert.equal(hasCondition(h.s.actors.livia, "prone"), true);
});

test("review: the DM's Influence decision is named in the reader's language in the log", () => {
  const h = harness({ role: "dm" });
  const j = h.cmd(
    "influence",
    (d) =>
      D.commitInfluence(
        d,
        { actorId: "livia", targetId: "goblin-2", skill: "persuasion", urge: "Parla" },
        "player",
        op("rf-i3"),
      ),
    "player",
  );
  // The inspector's buttons, bound on a minimal element (no DOM in Node).
  const handlers = [];
  const node = {
    dataset: { smJudge: j.id, smDecision: "hesitant" },
    addEventListener: (type, fn) => handlers.push(fn),
  };
  const el = {
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === "[data-sm-judge]" ? [node] : []),
  };
  UI.bindInspector(el, h.ctx, null);
  handlers[0]();
  assert.equal(h.ctx.undoLabel(), "Il DM decide: esitante");
});

test("review: Help lists only the helper's proficient skills and shows no skill as chosen before a choice", () => {
  const h = harness();
  // No proficiencies recorded on the sample sheet: every skill stays offered (DM's call).
  assert.equal(D.helpSkills(h.s, "livia").length, 18);
  h.cmd("proficiencies", (d) => (d.actors.livia.skills = ["arcana", "history"]), "dm");
  const own = D.helpSkills(h.s, "livia");
  assert.deepEqual(own, ["arcana", "history"]);
  UI.chooseMove(h.ctx, "help", "livia");
  const card = UI.renderDock(h.ctx, { selectedActorId: "livia" });
  const select = card.match(/<select data-sm-skill>([\s\S]*?)<\/select>/)?.[1] ?? "";
  assert.match(select, /^<option value="" selected>/);
  const offered = [...select.matchAll(/value="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(offered, own);
  // Study: no area of knowledge looks chosen before the choice either.
  UI.resetSpecialMovesView();
  UI.chooseMove(h.ctx, "study", "livia");
  assert.match(
    UI.renderDock(h.ctx, { selectedActorId: "livia" }),
    /<select data-sm-skill><option value="" selected>/,
  );
});
