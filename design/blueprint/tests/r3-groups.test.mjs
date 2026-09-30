// R3 CA-61 — token groups for players and who moves a group: with the campaign permission
// playerGroup on (C2, default off) players group and ungroup the tokens they control; the DM
// sets «Chi può muovere il gruppo…» per group (Foundry ownership on several tokens, Owlbear
// per-item permissions); drag, keyboard and followGroup refuse the others with the reason.
import test from "node:test";
import assert from "node:assert/strict";
import { permissionOf } from "../campaign-settings-domain.mjs";
import {
  register,
  resetTokenMenu,
  groupTokens,
  ungroupTokens,
  setGroupMovers,
  groupMoveRefusal,
  playersMayGroup,
  followGroup,
  groupOf,
} from "../token-menu.mjs";
import { harness, token } from "./r3-harness.mjs";

const areas = [["token-menu", register]];
const slice = (s) => s.ext["token-menu"];

test("R3 CA-61: grouping stays the DM's until the campaign lets players group their own tokens", () => {
  resetTokenMenu();
  const h = harness({ areas, role: "player" });
  // C2 absent or off: the player is refused with where the DM turns it on.
  assert.equal(playersMayGroup(h.s), false);
  assert.throws(
    () =>
      groupTokens(
        structuredClone(slice(h.s)),
        "old-watch",
        ["token-livia", "token-mira"],
        "player",
        "g1",
        {
          state: h.s,
        },
      ),
    (error) => error.code === "group-dm" && /Permessi/.test(error.it),
  );
  // With the permission (as C2 grants it), only tokens the player controls.
  const draft = structuredClone(slice(h.s));
  groupTokens(draft, "old-watch", ["token-livia", "token-mira"], "player", "g1", {
    state: h.s,
    allowPlayers: true,
  });
  assert.deepEqual(draft.groups.g1.tokenIds.sort(), ["token-livia", "token-mira"]);
  assert.throws(
    () =>
      groupTokens(draft, "old-watch", ["token-livia", "token-goblin-1"], "player", "g2", {
        state: h.s,
        allowPlayers: true,
      }),
    (error) => error.code === "group-own",
  );
  ungroupTokens(draft, ["token-livia"], "player", { state: h.s, allowPlayers: true });
  assert.equal(groupOf(draft, "token-livia"), null);
  // The C2 switch itself, once R7 registers it: stored on the campaign's policy.
  if (permissionOf("playerGroup")) {
    h.cmd(
      "allow",
      (d) => {
        d.ext["campaign-settings"] ??= { campaigns: {} };
        const record = (d.ext["campaign-settings"].campaigns[d.campaign.id] ??= {});
        record.policy = { ...(record.policy ?? {}), playerGroup: permissionOf("playerGroup").on };
      },
      "dm",
    );
    assert.equal(playersMayGroup(h.s), true);
  }
});

test("R3 CA-61: «Chi può muovere il gruppo…»: only the DM and the listed members' controllers move it", () => {
  resetTokenMenu();
  const h = harness({ areas, role: "dm" });
  h.cmd(
    "group",
    (d) =>
      groupTokens(slice(d), "old-watch", ["token-livia", "token-goblin-1"], "dm", "g1", {
        state: d,
      }),
    "dm",
  );
  // Default (no list): whoever controls a member drags it, as before.
  assert.equal(groupMoveRefusal(h.s, "token-livia", "player"), null);
  h.cmd("dm only", (d) => setGroupMovers(d, slice(d), "g1", [], "dm"), "dm");
  const dmOnly = groupMoveRefusal(h.s, "token-livia", "player");
  assert.equal(dmOnly.it, "Questo gruppo lo muove solo il DM.");
  assert.equal(groupMoveRefusal(h.s, "token-livia", "dm"), null);
  h.cmd(
    "goblin moves it",
    (d) => setGroupMovers(d, slice(d), "g1", ["token-goblin-1"], "dm"),
    "dm",
  );
  assert.match(
    groupMoveRefusal(h.s, "token-livia", "player").it,
    /solo il DM e chi controlla Sentinella/,
  );
  assert.throws(() => setGroupMovers(h.s, structuredClone(slice(h.s)), "g1", [], "player"));
  // followGroup refuses a viewer who may not move the group, with the reason.
  h.ctx.role = "player";
  const from = { ...token(h.s, "livia") };
  const out = followGroup(h.ctx, {
    actorId: "livia",
    tokenId: "token-livia",
    from,
    members: ["token-livia", "token-goblin-1"],
  });
  assert.equal(out.refused.it, groupMoveRefusal(h.s, "token-livia", "player").it);
});

test("R3 CA-61: a listed mover drags the whole group, members she does not control included", () => {
  resetTokenMenu();
  const h = harness({ areas, role: "dm" });
  h.cmd(
    "group",
    (d) =>
      groupTokens(slice(d), "old-watch", ["token-livia", "token-goblin-1"], "dm", "g1", {
        state: d,
      }),
    "dm",
  );
  h.cmd("livia moves it", (d) => setGroupMovers(d, slice(d), "g1", ["token-livia"], "dm"), "dm");
  h.ctx.role = "player";
  assert.equal(groupMoveRefusal(h.s, "token-livia", "player"), null);
  const from = { ...token(h.s, "livia") };
  const goblin = { ...token(h.s, "goblin-1") };
  h.cmd("lead", (d) => Object.assign(token(d, "livia"), { x: from.x + 50, y: from.y }), "player");
  const out = followGroup(h.ctx, {
    actorId: "livia",
    tokenId: "token-livia",
    from,
    members: ["token-livia", "token-goblin-1"],
  });
  assert.deepEqual(out.moved, ["goblin-1"]);
  assert.deepEqual([token(h.s, "goblin-1").x, token(h.s, "goblin-1").y], [goblin.x + 50, goblin.y]);
});
