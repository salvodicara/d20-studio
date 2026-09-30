// R3 PG-79 (mounts, delegated simulation I-233): SRD 5.2.1 Mounted Combat (EN 15–16 / IT 17).
// Controlled or independent mount (C10 mountControl for R1), rider and mount move together
// whichever token moves, forced dismount through a DC 10 Dexterity save request, palette
// commands and token-menu entries findable with the words a new user types.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { beginMovement } from "../combat.mjs";
import { applyConditionEvent, hasCondition } from "../conditions.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";
import { harness, op, token, place, startCombat, answer } from "./r3-harness.mjs";

afterEach(() => UI.resetSpecialMovesView());
const areas = [[D.ID, UI.register]];
function mounted(h, { controlled = true } = {}) {
  const horse = h.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  h.cmd(
    "mount",
    (d) => D.commitMount(d, { actorId: "livia", mountId: horse.id, controlled }, "player", op("m")),
    "player",
  );
  return horse;
}

test("R3 PG-79: C10 mountControl names the rider and the SRD choice; independent keeps its turn", () => {
  const h = harness({ areas });
  const horse = h.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  assert.equal(horse.mountTrained, true, "the SRD Riding Horse accepts a rider");
  assert.equal(D.mountControl(h.s, horse.id), null);
  h.cmd("combat", (d) => startCombat(d, ["livia", horse.id, "goblin-1", "doran"]), "dm");
  h.cmd(
    "mount independent",
    (d) =>
      D.commitMount(
        d,
        { actorId: "livia", mountId: horse.id, controlled: false },
        "player",
        op("i"),
      ),
    "player",
  );
  assert.deepEqual(D.mountControl(h.s, horse.id), { riderId: "livia", controlled: false });
  assert.equal(h.s.combat.order.includes(horse.id), true, "an independent mount keeps its place");
  const ride = D.previewRide(h.s, { actorId: "livia", point: { x: 400, y: 380 } }, "player");
  assert.equal(ride.available, false);
  assert.equal(ride.reasons.at(-1).code, "independent");
  assert.match(ride.reasons.at(-1).it, /si muove nel suo turno/);
});

test("R3 PG-79: a controlled mount joins the rider's turn; an untrained creature can only be ridden independent", () => {
  const h = harness({ areas });
  const horse = h.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  h.cmd("combat", (d) => startCombat(d, ["livia", horse.id, "goblin-1", "doran"]), "dm");
  h.cmd(
    "mount controlled",
    (d) =>
      D.commitMount(
        d,
        { actorId: "livia", mountId: horse.id, controlled: true },
        "player",
        op("c"),
      ),
    "player",
  );
  assert.deepEqual(D.mountControl(h.s, horse.id), { riderId: "livia", controlled: true });
  assert.equal(h.s.combat.order.includes(horse.id), false);
  // A creature without training (no mountTrained) refuses «Controllata» with the SRD reason.
  const h2 = harness({ areas });
  const pony = h2.cmd("horse", (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "dm"), "dm");
  h2.cmd("untrained", (d) => delete d.actors[pony.id].mountTrained, "dm");
  const p = D.previewMount(
    h2.s,
    { actorId: "livia", mountId: pony.id, controlled: true },
    "player",
  );
  assert.equal(p.available, false);
  assert.equal(p.reasons.find((r) => r.code === "untrained").it.includes("Indipendente"), true);
  const q = D.previewMount(
    h2.s,
    { actorId: "livia", mountId: pony.id, controlled: false },
    "player",
  );
  assert.equal(q.available, true, JSON.stringify(q.reasons));
});

test("R3 PG-79: rider and mount move together whichever token moves", () => {
  const h = harness({ areas, role: "dm" });
  const horse = mounted(h);
  const offset = (s) => ({
    dx: token(s, "livia").x - token(s, horse.id).x,
    dy: token(s, "livia").y - token(s, horse.id).y,
  });
  const start = offset(h.s);
  // The DM drags the horse (a core move): Livia is carried in the follow-up.
  h.cmd(
    "move horse",
    (d) => beginMovement(d, { id: "mv-h", actorId: horse.id, point: { x: 500, y: 300 } }, "dm"),
    "dm",
  );
  assert.deepEqual([token(h.s, horse.id).x, token(h.s, horse.id).y], [500, 300]);
  assert.deepEqual(offset(h.s), start, "the rider stays in the saddle");
  // Dragging the rider becomes a ride: the horse carries her there.
  h.ctx.role = "player";
  assert.equal(UI.intercept(h.ctx, "livia", { x: 600, y: 300 }), true);
  assert.deepEqual([token(h.s, horse.id).x, token(h.s, horse.id).y], [600, 300]);
  assert.deepEqual(offset(h.s), start);
  // A player may drag the horse she rides (controlled): it becomes her ride.
  assert.equal(UI.intercept(h.ctx, horse.id, { x: 700, y: 300 }), true);
  assert.deepEqual([token(h.s, horse.id).x, token(h.s, "livia").x], [700, 700]);
  // A rider relocated on her own (Misty Step, a DM teleport) leaves the saddle.
  h.cmd("teleport", (d) => place(d, "livia", 200, 200), "dm");
  assert.equal(D.mountOf(h.s, "livia"), null);
  assert.deepEqual([token(h.s, "livia").x, token(h.s, "livia").y], [200, 200]);
});

test("R3 PG-79: knocked Prone while mounted (rider or mount) asks a DC 10 Dexterity save; failure dismounts Prone", () => {
  const h = harness({ areas, role: "dm" });
  const horse = mounted(h);
  h.cmd(
    "prone",
    (d) =>
      applyConditionEvent(d, {
        eventId: "r3-prone-horse",
        actorId: horse.id,
        kind: "apply",
        conditionId: "prone",
        source: { kind: "authored", revision: "r3" },
        term: { kind: "manual" },
      }),
    "dm",
  );
  const pending = h.s.combatAttempts.filter(
    (a) => a.specialMove?.kind === "rider-fall" && a.status === "pending",
  );
  assert.equal(pending.length, 1, "one request, never a duplicate");
  const request = pending[0].requests[0];
  assert.deepEqual([request.actorId, request.kind, request.dc], ["livia", "save", 10]);
  // Another change does not ask again for the same fall.
  h.cmd("note", (d) => (d.notes = [...(d.notes ?? [])]), "dm");
  assert.equal(h.s.combatAttempts.filter((a) => a.specialMove?.kind === "rider-fall").length, 1);
  h.cmd("dex save", (d) => answer(d, pending[0].id, [2], "player"), "player");
  assert.equal(D.mountOf(h.s, "livia"), null);
  assert.equal(hasCondition(h.s.actors.livia, "prone"), true);
});

test("R3 PG-79: palette commands and token-menu entries answer «cavalcatura», «monta», «in sella»", () => {
  const h = harness({ areas, role: "dm" });
  const commands = h.registry.list("command", h.ctx);
  const words = (c) =>
    [c.label?.it, c.label?.en, c.description?.it, ...(c.keywords ?? []).map((k) => k.it ?? k)]
      .join(" ")
      .toLowerCase();
  for (const word of ["cavalcatura", "cavallo", "monta", "in sella", "smonta", "mount"])
    assert.ok(
      commands.some((c) => c.id.startsWith("special-moves") && words(c).includes(word)),
      word,
    );
  const bring = commands.find((c) => c.id === "special-moves.bring-mount");
  assert.equal(bring.label.it, "Porta una cavalcatura");
  // Bring it next to the selected creature (Livia by default on the Table).
  h.registry.run(bring, h.ctx);
  const horseId = Object.keys(h.s.actors).find((id) => id.startsWith("sm-horse-"));
  assert.ok(horseId);
  const near = Math.hypot(
    token(h.s, horseId).x - token(h.s, "livia").x,
    token(h.s, horseId).y - token(h.s, "livia").y,
  );
  assert.ok(near <= 72, "next to Livia");
  // Token menu: «Monta in sella…» on Livia for her player, then «Smonta» once mounted.
  const target = (actorId) => ({
    actorId,
    tokenId: token(h.s, actorId).id,
    sceneId: h.s.activeSceneId,
  });
  const items = (role, actorId) =>
    h.as(role, () => h.registry.list("token-menu", h.ctx, target(actorId)).map((i) => i.id));
  assert.ok(items("player", "livia").includes("special-moves-mount"));
  assert.ok(!items("player", "livia").includes("special-moves-dismount"));
  h.cmd(
    "mount",
    (d) =>
      D.commitMount(
        d,
        { actorId: "livia", mountId: horseId, controlled: true },
        "player",
        op("mm"),
      ),
    "player",
  );
  assert.ok(items("player", "livia").includes("special-moves-dismount"));
  assert.ok(items("player", "livia").includes("special-moves-ride"));
  assert.ok(items("dm", "doran").includes("special-moves-bring-mount"));
  assert.ok(!items("player", "livia").includes("special-moves-bring-mount"));
});
