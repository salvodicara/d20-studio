// R7 — the campaign «Gruppo» page: one number everywhere (PG-25, contract C14: saves and
// passives through sheet-plus-domain.statValue, so an attuned Cloak of Protection shows as on
// the sheet), «Aggiungi un mio personaggio» (PG-85, C13, D&D Beyond «Join with this
// character») and the DM's «Assegna PE e monete» (PG-17, C12, D&D Beyond Manage Experience).
// Real store and registry; synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { statValue } from "../sheet-plus-domain.mjs";
import { register as registerLibrary } from "../character-library.mjs";
import { register as registerLoot } from "../loot.mjs";
import * as P from "../party.mjs";
import { cloakRow } from "./p2-harness.mjs";

afterEach(() => P.resetPartyView());

const plain = (html) =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function harness({ role = "player", lang = "it", loot = true } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null, document: null });
  assert.equal(registry.use("character-library", registerLibrary).status, "built");
  if (loot) assert.equal(registry.use("loot", registerLoot).status, "built");
  assert.equal(registry.use("party", P.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  const dialogs = [];
  const toasts = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "campaign", tab: "group", id: "overview" },
    get state() {
      return store.state;
    },
    esc,
    icon: () => "",
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate() {},
    openSheet() {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, dialogs, toasts, slice: () => P.sliceOf(store.state) };
}
const share = (h) =>
  h.ctx.commit("share", (draft) => {
    P.sliceOf(draft).overview.shareWithPlayers = true;
  });

test("PG-25: the Gruppo saves and passives are the sheet's own numbers (statValue, C14)", () => {
  const h = harness({ role: "dm" });
  // Livia wears and is attuned to a Cloak of Protection: +1 to every save, as on her sheet.
  h.ctx.commit("cloak", (draft) => draft.actors.livia.inventory.push(cloakRow()));
  const livia = P.partyRow(h.ctx.state, h.ctx.state.actors.livia);
  for (const ability of P.ABILITIES)
    assert.equal(
      livia.saves[ability].value,
      statValue(h.ctx.state, "livia", `save:${ability}`).total,
      ability,
    );
  assert.equal(livia.saves.int.value, 6, "INT +6 with the cloak");
  assert.equal(livia.saves.dex.value, 3, "DEX +3 with the cloak");
  assert.equal(livia.saves.int.proficient, true, "the Wizard's Int save is still highlighted");
  assert.equal(
    livia.passives.perception.value,
    statValue(h.ctx.state, "livia", "passive-perception").total,
  );
  assert.equal(
    livia.passives.investigation.value,
    10 + statValue(h.ctx.state, "livia", "skill:investigation").total,
  );
  // The rendered table shows the same numbers and the legend says where they come from.
  const html = P.renderPartySection(h.ctx);
  const row = /data-party-row="livia"[\s\S]*?<\/tr>/.exec(html)[0];
  assert.match(plain(row), /INT \+6/);
  assert.match(plain(row), /DES \+3/);
  assert.match(plain(html), /gli stessi numeri della scheda/);
  // Exhaustion lowers D20 Tests on the sheet: the Gruppo follows (SRD 5.2.1 Exhaustion).
  h.ctx.commit("tired", (draft) => {
    draft.actors.livia.exhaustion = 1;
  });
  const tired = P.partyRow(h.ctx.state, h.ctx.state.actors.livia);
  assert.equal(tired.saves.int.value, statValue(h.ctx.state, "livia", "save:int").total);
  assert.equal(tired.saves.int.value, 4, "INT +6 − 2 for one Exhaustion level");
  // Every party member keeps the sheet's numbers (a recorded save wins there too).
  for (const id of ["doran", "mira"]) {
    const other = P.partyRow(h.ctx.state, h.ctx.state.actors[id]);
    assert.equal(other.saves.wis.value, statValue(h.ctx.state, id, "save:wis").total, id);
  }
});

test("PG-85: a player adds one of their characters from the Gruppo page (C13)", async () => {
  const h = harness({ role: "player" });
  share(h);
  const html = P.renderPartySection(h.ctx);
  assert.match(html, /data-party-add-character/);
  assert.match(plain(html), /Aggiungi un mio personaggio/);
  await P.openAddCharacter(h.ctx);
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Aggiungi un mio personaggio a Le lanterne di Bruma");
  assert.match(dialog.body, /value="iria"/, "Iria, the player's personal sheet, is offered");
  const form = new FormData();
  form.set("actor", "iria");
  form.set("how", "link");
  dialog.options.onSubmit(form);
  assert.deepEqual(h.ctx.state.actors.iria.campaignIds, ["lanterns"]);
  assert.ok(P.partyMembers(h.ctx.state, "player").some((actor) => actor.id === "iria"));
  // An observer has no characters to bring: no button.
  h.ctx.lang = "en";
  assert.match(plain(P.renderPartySection(h.ctx)), /Add one of my characters/);
});

test("PG-17: the DM awards XP and coins from the Gruppo page (C12); players do not see it", async () => {
  const h = harness({ role: "dm" });
  const html = P.renderPartySection(h.ctx);
  assert.match(html, /data-party-award/);
  assert.match(plain(html), /Assegna PE e monete/);
  await P.openPartyAward(h.ctx);
  assert.equal(h.dialogs.at(-1).title, "Assegna PE e monete al gruppo");
  const player = harness({ role: "player" });
  share(player);
  assert.doesNotMatch(P.renderPartySection(player.ctx), /data-party-award/);
  // Without the loot area the button is not offered (nothing to open).
  const bare = harness({ role: "dm", loot: false });
  assert.doesNotMatch(P.renderPartySection(bare.ctx), /data-party-award/);
});
