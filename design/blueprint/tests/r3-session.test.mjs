// R3 CA-57 part (Owlbear's GM hand-off, C3 runsSession): during a DM hand-off the member who
// runs the session gets the DM's Table powers in R3's files (hidden tokens, fog, adding a
// mount, transforming any creature, the DM's token-menu commands); a player who does not run
// it is still refused. Identity checks do not change.
import test from "node:test";
import assert from "node:assert/strict";
import { sessionAuthorityReady, runsSession } from "../table-spatial.mjs";
import { setVisibility, register as tokenMenu } from "../token-menu.mjs";
import * as FV from "../fog-vision-domain.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";
import * as forms from "../forms-companions.mjs";
import { register as fogVision } from "../fog-vision.mjs";
import { harness, token } from "./r3-harness.mjs";

const handOver = (state, to) => {
  const ext = (state.ext ??= {});
  const members = (ext["campaign-members"] ??= { campaigns: {} });
  members.campaigns ??= {};
  const record = (members.campaigns[state.campaign.id] ??= {});
  record.handover = { to, from: "dm", at: "2026-09-27T10:00:00Z" };
};

test("R3 CA-57: C3 runsSession loads from session-view and names the runner", async () => {
  await sessionAuthorityReady;
  const h = harness({ role: "player" });
  assert.equal(runsSession(h.s, "player"), false);
  h.cmd("hand over", (d) => handOver(d, "player"), "dm");
  assert.equal(runsSession(h.s, "player"), true);
  assert.equal(runsSession(h.s, "dm"), true, "the DM keeps the powers");
  assert.equal(runsSession(h.s, "observer"), false);
});

test("R3 CA-57: the runner hides tokens, edits fog, brings a mount and transforms any creature", async () => {
  await sessionAuthorityReady;
  const plain = harness({
    role: "player",
    areas: [
      ["token-menu", tokenMenu],
      [D.ID, UI.register],
      ["fog-vision", fogVision],
    ],
  });
  const s0 = structuredClone(plain.s);
  // Not running the session: refused.
  assert.throws(() =>
    setVisibility(s0, s0.ext["token-menu"], [token(s0, "goblin-1").id], "dm", [], "player"),
  );
  assert.throws(() =>
    FV.addFogOp(structuredClone(s0), "player", s0.activeSceneId, {
      op: "cover",
      shape: "rect",
      points: [
        { x: 10, y: 10 },
        { x: 100, y: 100 },
      ],
    }),
  );
  assert.throws(() => D.commitSummonMount(structuredClone(s0), { nearActorId: "livia" }, "player"));
  const refused = forms.previewTransform(
    s0,
    "goblin-1",
    { preset: "polymorph", profileId: "srd2024:cat" },
    "player",
  );
  assert.equal(refused.errors[0].code, "permission");

  // Running the session after the hand-off: allowed.
  const h = harness({
    role: "player",
    areas: [
      ["token-menu", tokenMenu],
      [D.ID, UI.register],
      ["fog-vision", fogVision],
    ],
  });
  h.cmd("hand over", (d) => handOver(d, "player"), "dm");
  h.cmd(
    "hide",
    (d) => setVisibility(d, d.ext["token-menu"], [token(d, "goblin-1").id], "dm", [], "player"),
    "player",
  );
  assert.equal(token(h.s, "goblin-1").hidden, true);
  h.cmd(
    "fog",
    (d) =>
      FV.addFogOp(d, "player", d.activeSceneId, {
        op: "cover",
        shape: "rect",
        points: [
          { x: 10, y: 10 },
          { x: 100, y: 100 },
        ],
      }),
    "player",
  );
  const horse = h.cmd(
    "horse",
    (d) => D.commitSummonMount(d, { nearActorId: "livia" }, "player"),
    "player",
  );
  assert.ok(horse?.id);
  const p = forms.previewTransform(
    h.s,
    "goblin-1",
    { preset: "polymorph", profileId: "srd2024:cat" },
    "player",
  );
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  // The DM's token-menu commands appear for the runner (the DM-only roles follow C3).
  const target = {
    actorId: "goblin-1",
    tokenId: token(h.s, "goblin-1").id,
    sceneId: h.s.activeSceneId,
  };
  const items = h.registry.list("token-menu", h.ctx, target).map((c) => c.id);
  assert.ok(
    items.includes("token-menu-hide") && items.includes("special-moves-bring-mount"),
    items.join(", "),
  );
  // Identity stays: the runner still cannot read the DM's private creature.
  h.cmd(
    "private",
    (d) => {
      d.actors["dm-secret"] = {
        ...structuredClone(d.actors["goblin-2"]),
        id: "dm-secret",
        name: "Segreto",
        visibility: "private",
        owner: "dm",
      };
    },
    "dm",
  );
  assert.equal(h.ctx.canControl(h.s.actors["dm-secret"]), false);
});
