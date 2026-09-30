// R4 (fix round 2) — H-07 part (re-audit observation 2): «bastione» typed in the palette from
// the DM's Home found nothing. «Apri un Bastione…» works with no character in context: the
// only character with a Bastion opens its tab, several give a picker, none open the party's
// «Basi e bastioni» (dnd5e Bastion tab, Roll20 Bastion tracker). Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as library from "../character-library.mjs";
import * as party from "../party.mjs";
import * as sheetPlus from "../sheet-plus.mjs";
import { searchPalette } from "../command-palette.mjs";
import { bastionTargets } from "../bastions.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (role) =>
  harness({
    role,
    areas: [
      ["character-library", library.register],
      ["party", party.register],
      ["sheet-plus", sheetPlus.register],
    ],
    view: { page: "home", id: "", tab: "" },
  });
const command = (h) => h.registry.get("command", "sheet-plus.bastion", h.ctx);

test("H-07: the palette finds «Apri un Bastione…» by bastione, basi and turno delle basi", () => {
  for (const role of ["dm", "player"]) {
    const h = setup(role);
    for (const word of ["bastione", "basi", "turno delle basi"]) {
      const found = searchPalette(h.ctx, ">" + word).items.map((item) => item.key ?? item.id);
      assert.ok(
        found.some((key) => String(key).includes("sheet-plus.bastion")),
        `${role} · «${word}»: ${found.join(", ")}`,
      );
    }
  }
});

test("H-07: from the DM's Home (no character with a Bastion) it opens the party's bases", () => {
  const h = setup("dm");
  const slice = h.store.state.ext.party.bastions;
  assert.deepEqual(bastionTargets(h.store.state, slice, "dm"), [], "Iria's sheet is private");
  h.registry.run(command(h), h.ctx);
  assert.deepEqual(h.ctx.navigated, { page: "campaign", params: { tab: "group", id: "bases" } });
});

test("H-07: the player's one character with a Bastion opens its tab; several give a picker", () => {
  const h = setup("player");
  const slice = () => h.store.state.ext.party.bastions;
  assert.deepEqual(
    bastionTargets(h.store.state, slice(), "player").map((a) => a.id),
    ["iria"],
  );
  h.registry.run(command(h), h.ctx);
  assert.deepEqual(h.ctx.navigated, {
    page: "characters",
    params: { id: "iria", tab: "party-bastion" },
  });
  h.ctx.commit("livello", (s) => (s.actors.livia.level = 5));
  h.registry.run(command(h), h.ctx);
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Apri un Bastione");
  assert.match(dialog.body, /data-bastion-open="livia"[^>]*>Livia · nessuna base ancora/);
  assert.match(dialog.body, /data-bastion-open="iria"[^>]*>Iria · Faro di Capo Sale/);
  assert.match(dialog.body, /data-bastion-open=""[^>]*>Basi del gruppo/);
  // On a sheet with a Bastion the command opens that one directly.
  h.ctx.view = { page: "characters", id: "livia", tab: "actions" };
  h.registry.run(command(h), h.ctx);
  assert.deepEqual(h.ctx.navigated.params, { id: "livia", tab: "party-bastion" });
});
