import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  previewDoorInteraction,
  interactWithDoor,
  correctDoor,
  renderDoorControls,
} from "../table-spatial.mjs";
function fixture() {
  const s = createInitialState();
  s.combat.active = true;
  s.scenes[0].walls = [
    {
      id: "door",
      a: { x: 400, y: 200 },
      b: { x: 400, y: 250 },
      kind: "door",
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      doorState: "closed",
      playerOperable: true,
      interactionRangeMeters: 20,
      source: { kind: "authored-demo", revision: "test-v1" },
    },
  ];
  return s;
}
test("door interaction preview is pure; first interaction and subsequent Utilize consume their own resources once", () => {
  const s = fixture(),
    before = JSON.stringify(s);
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").cost, "interaction");
  assert.equal(JSON.stringify(s), before);
  interactWithDoor(s, "door", "livia", "player", { expectedState: "closed" });
  assert.equal(s.scenes[0].walls[0].doorState, "open");
  assert.equal(s.actors.livia.objectInteractionUsed, true);
  assert.equal(s.actors.livia.action, true);
  assert.throws(
    () => interactWithDoor(s, "door", "livia", "player", { expectedState: "closed" }),
    /changed/,
  );
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").cost, "action");
  interactWithDoor(s, "door", "livia", "player", { expectedState: "open" });
  assert.equal(s.actors.livia.action, false);
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, false);
});
test("locked/secret/unpermitted doors cannot be operated by a player and DM correction is explicit and costless", () => {
  const s = fixture();
  for (const patch of [{ doorState: "locked" }, { secret: true }, { playerOperable: false }]) {
    Object.assign(
      s.scenes[0].walls[0],
      { doorState: "closed", secret: false, playerOperable: true },
      patch,
    );
    const before = JSON.stringify(s);
    assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, false);
    assert.throws(() =>
      interactWithDoor(s, "door", "livia", "player", {
        expectedState: s.scenes[0].walls[0].doorState,
      }),
    );
    assert.equal(JSON.stringify(s), before);
  }
  assert.throws(() => correctDoor(s, "door", { doorState: "open", secret: false }, "player"), /DM/);
  correctDoor(s, "door", { doorState: "open", secret: false }, "dm");
  assert.equal(s.actors.livia.action, true);
  assert.equal(s.actors.livia.objectInteractionUsed, undefined);
});
test("door operations obey current actor and pending consequences but exploration has no invented turn resource", () => {
  const s = fixture();
  s.combat.turn = 1;
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, false);
  s.combat.turn = 0;
  s.actors.livia.incapacitated = true;
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, false);
  s.actors.livia.incapacitated = false;
  s.movements = [{ actorId: "livia", status: "pending" }];
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, false);
  s.movements = [];
  s.combat.active = false;
  interactWithDoor(s, "door", "livia", "player", { expectedState: "closed" });
  assert.equal(s.actors.livia.objectInteractionUsed, undefined);
});
test("a secret door has no player control, name or coordinate in the projected map controls", () => {
  const s = fixture();
  s.scenes[0].walls[0].secret = true;
  s.scenes[0].walls[0].id = "secret-door-identity";
  const ctx = { state: s, role: "player", t: (it, en) => en, esc: String };
  assert.equal(renderDoorControls(ctx), "");
  ctx.role = "dm";
  assert.match(renderDoorControls(ctx), /secret-door-identity/);
});
test("nearby doors cannot be operated through another wall; secret obstruction returns no private geometry", () => {
  const s = fixture(),
    scene = s.scenes[0],
    token = scene.tokens.find((t) => t.actorId === "livia");
  token.x = 250;
  token.y = 225;
  scene.walls[0].a.x = 290;
  scene.walls[0].b.x = 290;
  scene.walls[0].interactionRangeMeters = 1.5;
  scene.walls.push({
    ...structuredClone(scene.walls[0]),
    id: "private-barrier",
    kind: "wall",
    a: { x: 270, y: 180 },
    b: { x: 270, y: 260 },
    secret: true,
  });
  const before = JSON.stringify(s),
    preview = previewDoorInteraction(s, "door", "livia", "player");
  assert.equal(preview.available, false);
  assert.ok(!JSON.stringify(preview).includes("private-barrier"));
  assert.throws(() => interactWithDoor(s, "door", "livia", "player", { expectedState: "closed" }));
  assert.equal(JSON.stringify(s), before);
  scene.walls.pop();
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, true);
});
