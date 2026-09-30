// P4 fix TV-109 — D&D Beyond «Reveal» from the token: the creature's own art is preselected,
// and a personal image is shared with the campaign right there (provenance inline, one
// confirm) instead of sending the DM to the Library. Real store and registry (media and
// handouts areas), the dialog the token menu opens.
import test from "node:test";
import assert from "node:assert/strict";
import * as mediaArea from "../media.mjs";
import * as media from "../media-domain.mjs";
import * as handouts from "../handouts.mjs";
import * as D from "../handouts-domain.mjs";
import { harness, form } from "./p4-harness.mjs";

const setup = (lang = "it") =>
  harness({
    role: "dm",
    lang,
    areas: [
      ["media", mediaArea.register],
      ["handouts", handouts.register],
    ],
    view: { page: "table", id: "", tab: "" },
  });
const asset = (h, id) => media.mediaOf(h.store.state).assets.find((a) => a.id === id);

test("TV-109: «Rivela aspetto» preselects the token's own art, even a personal image", () => {
  const h = setup();
  assert.equal(D.preferredArt(h.store.state, "goblin-1").id, "media:m-goblin");
  handouts.openRevealDialog(h.ctx, { actorId: "goblin-1" });
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /name="artId" value="media:m-goblin" checked/);
  // The personal image can be shared inline: provenance prefilled, visible at once.
  assert.match(dialog.body, /data-hs-inline-share(?![^>]*hidden)/);
  assert.match(dialog.body, /name="shareSource"/);
  assert.match(dialog.body, /name="shareAuthor"[^>]*value="[^"]+"/);
  assert.match(dialog.body, /name="shareLicense"[^>]*value="[^"]+"/);
});

test("TV-109: one «Mostra ai giocatori» shares the personal image and reveals it", () => {
  const h = setup();
  assert.equal(asset(h, "m-goblin").shared, false);
  handouts.openRevealDialog(h.ctx, { actorId: "goblin-1" });
  h.dialogs.at(-1).options.onSubmit(
    form({
      artId: "media:m-goblin",
      caption: "La sentinella",
      mode: "all",
      shareSource: "own",
      shareAuthor: "DM della campagna",
      shareLicense: "Uso nella campagna",
    }),
  );
  assert.deepEqual(h.errors(), []);
  assert.equal(asset(h, "m-goblin").shared, true, "shared with the campaign");
  assert.equal(asset(h, "m-goblin").provenance.license, "Uso nella campagna");
  const revealed = D.revealedArtFor(h.store.state, "goblin-1", "player");
  assert.equal(revealed.length, 1, "the players see it");
  // Without the provenance the share is refused (the rule of the Library, same message).
  const h2 = setup();
  handouts.openRevealDialog(h2.ctx, { actorId: "goblin-1" });
  assert.throws(
    () =>
      h2.dialogs
        .at(-1)
        .options.onSubmit(
          form({ artId: "media:m-goblin", caption: "x", mode: "all", shareSource: "own" }),
        ),
    /provenienza|source/i,
  );
  assert.equal(asset(h2, "m-goblin").shared, false, "nothing changed");
});

test("TV-109: the inline share speaks English", () => {
  const h = setup("en");
  handouts.openRevealDialog(h.ctx, { actorId: "goblin-1" });
  assert.match(h.dialogs.at(-1).body, /Share with the campaign/);
});
