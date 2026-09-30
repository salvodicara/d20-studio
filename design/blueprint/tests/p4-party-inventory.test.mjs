// P4 fixes PG-72 and PG-17 — the party stash is a campaign section «Inventario del gruppo»
// right under «Gruppo» (D&D Beyond campaign Party Inventory) with «equipaggiato da»
// portraits (BG3), and the DM's «Assegna PE e monete» is a first-class command found by
// «PE» (D&D Beyond Manage Experience, Foundry /award) and a button on that page.
import test from "node:test";
import assert from "node:assert/strict";
import * as loot from "../loot.mjs";
import * as stash from "../party-stash.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (role = "player", lang = "it") =>
  harness({ role, lang, areas: [["loot", loot.register]], view: { page: "campaign" } });
const section = (h) => h.registry.list("campaign-section", h.ctx).find((c) => c.id === "loot");

test("PG-72: the party's campaign section is «Inventario del gruppo» (D&D Beyond Party Inventory)", () => {
  const h = setup("player");
  const c = section(h);
  assert.ok(c, "the section is listed for a campaign member");
  // The campaign group keeps its seven most used sections (IA rule): the party inventory
  // stays in «Gioco», named as D&D Beyond names it and linked back to «Gruppo».
  assert.equal(c.group, "play");
  assert.equal(c.label.it, "Inventario del gruppo");
  assert.equal(c.label.en, "Party inventory");
  assert.match(c.description.it, /tesoro/);
  const html = c.render(h.ctx);
  assert.match(html, /data-campaign-heading[^>]*>Inventario del gruppo</);
  assert.match(html, /data-loot-party-crumb[^>]*>Gruppo</, "a way back to Gruppo");
  assert.match(html, /Torcia/, "the seed stash torches are listed");
  // The player acts as their own character: Prendi / Equipaggia are available here.
  assert.match(html, /data-loot="stash-equip"/);
  assert.match(html, /Agisci come/);
});

test("PG-72: equipping from the campaign page shows «equipaggiato da» with the portrait", () => {
  const h = setup("player");
  const torch = h.store.state.ext.loot.stash.items[0];
  stash.handleStashAction(h.ctx, "stash-equip", { id: torch.id }, "livia");
  // One torch of the stack is equipped (the rest stays available to the others).
  assert.ok(h.store.state.ext.loot.stash.items.some((row) => row.equippedBy === "livia"));
  // Mira's player view (same identity: the player controls both) and the DM view.
  let html = section(h).render(h.ctx);
  assert.match(html, /data-loot-equipped-by="livia"/);
  assert.match(html, /class="loot-holder[^"]*"[^>]*aria-hidden="true">L</, "portrait initial");
  h.ctx.role = "dm";
  html = section(h).render(h.ctx);
  assert.match(html, /Equipaggiato da Livia/);
  assert.match(html, /data-loot-equipped-by="livia"/);
  // The carriers strip: who holds shared items.
  assert.match(html, /data-loot-party-holders[\s\S]*Livia/);
});

test("PG-17: «Assegna PE e monete» is a DM command found by «PE» and a button on the page", () => {
  const h = setup("dm");
  const command = h.registry.list("command", h.ctx).find((c) => c.id === "loot-award");
  assert.ok(command, "DM command");
  assert.match(command.label.it, /\bPE\b/);
  assert.match(command.label.en, /\bXP\b/);
  for (const word of ["punti esperienza", "esperienza", "ricompense"])
    assert.ok(command.description.it.includes(word), word);
  for (const word of ["experience points", "rewards"])
    assert.ok(command.description.en.includes(word), word);
  command.run(h.ctx);
  assert.match(h.dialogs.at(-1).title, /Assegna PE e monete/);
  assert.match(section(h).render(h.ctx), /data-loot="award-open"[^>]*>Assegna PE e monete</);
  assert.match(section(h).render(h.ctx), /data-loot="currencies-open"/);
  const open = h.registry.list("command", h.ctx).find((c) => c.id === "loot-party-open");
  open.run(h.ctx);
  assert.deepEqual(h.ctx.navigated, { page: "campaign", params: { tab: "loot" } });
  // Players award nothing: no command, no button.
  h.ctx.role = "player";
  assert.ok(!h.registry.list("command", h.ctx).some((c) => c.id === "loot-award"));
  assert.doesNotMatch(section(h).render(h.ctx), /data-loot="award-open"/);
  // EN
  h.ctx.role = "dm";
  h.ctx.lang = "en";
  assert.match(section(h).render(h.ctx), />Award XP and coins</);
});

// FG «Award XP» from the combat tracker / Foundry dnd5e award after combat: when the
// encounter ends, the DM's bell offers the award with the defeated creatures named and the
// SRD XP of the known stat blocks added up; the award clears it.
test("PG-17: at the end of an encounter the DM's bell offers the award, prefilled", () => {
  const h = setup("dm");
  h.registry.attach(h.ctx);
  const notes = () =>
    h.registry.notifications(h.ctx).filter((n) => String(n.id).startsWith("loot-award-"));
  assert.equal(notes().length, 0);
  h.ctx.commit("start", (draft) => {
    draft.combat.active = true;
    draft.combat.round = 1;
    draft.combat.order = ["livia", "goblin-1"];
    draft.combat.turn = 0;
  });
  h.ctx.commit("down", (draft) => {
    draft.actors["goblin-1"].hp = 0;
    draft.actors["goblin-1"].compendiumRef = { id: "srd2024:creature:goblin-warrior" };
  });
  h.ctx.commit("end", (draft) => {
    draft.combat.active = false;
  });
  const [note] = notes();
  assert.ok(note, "the DM is offered the award");
  assert.match(note.title.it, /Incontro concluso: assegna PE e monete/);
  assert.match(note.body.it, /Sentinella/);
  assert.match(note.body.it, /50 PE/);
  assert.deepEqual(note.target, { page: "table", params: { tab: "loot-award" } });
  // The award dialog opens prefilled; awarding clears the notice.
  loot.openAward(h.ctx, loot.combatAwardPrefill(h.ctx));
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /name="xp"[^>]*value="50"/);
  assert.match(dialog.body, /name="reason"[^>]*value="[^"]*Sentinella/);
  h.submit({ xp: "50", mode: "split", recipient: ["livia", "doran", "mira"], reason: "x" });
  assert.equal(notes().length, 0, "cleared by the award");
  // Players never see it.
  const p = setup("player");
  p.registry.attach(p.ctx);
  assert.equal(
    p.registry.notifications(p.ctx).filter((n) => String(n.id).startsWith("loot-award-")).length,
    0,
  );
});
