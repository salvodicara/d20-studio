// R7 — campaign governance contracts other packages read: «Cosa vedono i giocatori» gains the
// DC and failed-passive switches (C1), the players' grouping permission (C2), the legacy 2014
// source switch (C4), the rules' consumer text naming their engines (H-01, C7) and the
// Discord row in the campaign settings (SV-38). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import * as D from "../campaign-settings-domain.mjs";
import * as UI from "../campaign-settings.mjs";
import { register as registerTokenMenu, playersMayGroup } from "../token-menu.mjs";
import { register as registerAnnotations } from "../annotations.mjs";
import { register as registerKnowledge } from "../knowledge.mjs";
import { register as registerFog } from "../fog-vision.mjs";
import { legacyAccess } from "../builder-plus-domain.mjs";
import { register as registerIntegrations } from "../integrations.mjs";

const CID = "lanterns";
const memory = () => {
  const values = new Map();
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
};
const plain = (html) =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

function settingsHarness({ role = "dm", view = null, lang = "it", extra = [] } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, reg] of [
    ["token-menu", registerTokenMenu],
    ["annotations", registerAnnotations],
    ["fog-vision", registerFog],
    ["knowledge", registerKnowledge],
    ["campaign-settings", UI.register],
    ...extra,
  ])
    assert.equal(registry.use(id, reg).status, "built", id);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: view ?? { page: "campaign", tab: "settings", id: "rules" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? v[ctx.lang] || v.it || "" : String(v ?? "")),
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => false,
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    dialogs,
    slice: () => registry.slice(store.state, D.ID),
    policy: () => D.policyOf(registry.slice(store.state, D.ID), CID),
    page: (id) => {
      ctx.view = { page: "campaign", tab: "settings", id };
      return UI.renderSettings(ctx);
    },
  };
}

test("C1: disclosureOf returns dc and passiveFailures, defaults kept until the DM changes them", () => {
  const h = settingsHarness();
  const read = () => D.disclosureOf(h.ctx.state);
  assert.equal(read().dc, "shown", "default: players read the DC");
  assert.equal(read().passiveFailures, "hidden", "default: failed passives stay hidden");
  // Older keys still there.
  assert.equal(read().enemyHp, "words");
  assert.equal(read().hitChance, "never");
  // «Cosa vedono i giocatori» shows both switches with their help line.
  const html = h.page("disclosure");
  assert.match(html, /data-cs-disclosure="dc"/);
  assert.match(html, /data-cs-disclosure="passiveFailures"/);
  const text = plain(html);
  assert.match(text, /CD dei tiri/);
  assert.match(text, /Visibili/);
  assert.match(text, /Nascoste \(si vede solo l’esito\)/);
  assert.match(text, /Prove passive fallite/);
  assert.match(text, /Mostrate ai giocatori/);
  // The DM hides the DCs: one history row, restorable with a reason.
  h.ctx.commit("dc", (draft) => D.setDisclosure(draft, draft.ext[D.ID], CID, "dc", "hidden", "dm"));
  assert.equal(read().dc, "hidden");
  const row = D.recordOf(h.slice(), CID).history.at(-1);
  assert.deepEqual([row.kind, row.key, row.from, row.to], ["disclosure", "dc", "shown", "hidden"]);
  assert.ok(D.canRestore(h.slice(), CID, row, h.ctx.state));
  h.ctx.commit("passive", (draft) =>
    D.setDisclosure(draft, draft.ext[D.ID], CID, "passiveFailures", "shown", "dm"),
  );
  assert.equal(read().passiveFailures, "shown");
  // History names them.
  const history = plain(h.page("history"));
  assert.match(history, /Cosa vedono i giocatori · CD dei tiri/);
  assert.match(history, /Visibili → Nascoste \(si vede solo l’esito\)/);
  assert.match(history, /Prove passive fallite/);
  // A correction puts the DC back.
  h.ctx.commit("restore", (draft) =>
    D.restoreHistoryEntry(draft, draft.ext[D.ID], CID, row.id, "Il gruppo le preferisce", "dm"),
  );
  assert.equal(read().dc, "shown");
  // Players cannot change them; junk values are refused and normalized away.
  assert.throws(
    () => D.setDisclosure(h.ctx.state, h.slice(), CID, "dc", "hidden", "player"),
    (e) => e.code === "dm-only",
  );
  assert.throws(
    () =>
      D.setDisclosure(
        structuredClone(h.ctx.state),
        structuredClone(h.slice()),
        CID,
        "dc",
        "maybe",
        "dm",
      ),
    (e) => e.code === "invalid-value",
  );
  const normalized = D.normalizeSlice({
    campaigns: { [CID]: { policy: { dc: "maybe", passiveFailures: "shown" } } },
  });
  assert.equal(D.policyOf(normalized, CID).dc, "shown");
  assert.equal(D.policyOf(normalized, CID).passiveFailures, "shown");
  // English.
  h.ctx.lang = "en";
  const en = plain(h.page("disclosure"));
  assert.match(en, /Roll DCs/);
  assert.match(en, /Hidden \(only the outcome shows\)/);
  assert.match(en, /Failed passive checks/);
});

test("C2: «I giocatori possono raggruppare le proprie pedine» is a Player permission with history", () => {
  const h = settingsHarness();
  const row = D.permissionOf("playerGroup");
  assert.ok(row, "the permission exists");
  assert.equal(row.label.it, "I giocatori possono raggruppare le proprie pedine");
  assert.equal(D.permissionAllowed(h.policy(), "playerGroup"), false, "off by default");
  assert.equal(playersMayGroup(h.ctx.state), false);
  const html = h.page("permissions");
  assert.match(html, /data-cs-permission="playerGroup"/);
  assert.match(plain(html), /Ruolo: Giocatore.*I giocatori possono raggruppare le proprie pedine/);
  // The lock permission no longer says grouping stays with the DM.
  assert.doesNotMatch(plain(D.permissionOf("playerLock").help.it), /Raggruppare resta al DM/);
  h.ctx.commit("group", (draft) =>
    D.setPermission(draft, draft.ext[D.ID], CID, "playerGroup", true, "dm"),
  );
  assert.equal(D.permissionAllowed(h.policy(), "playerGroup"), true);
  assert.equal(playersMayGroup(h.ctx.state), true, "R3's token menu reads the same value");
  const entry = D.recordOf(h.slice(), CID).history.at(-1);
  assert.deepEqual(
    [entry.kind, entry.key, entry.from, entry.to],
    ["permission", "playerGroup", false, true],
  );
  assert.match(plain(h.page("history")), /Gruppi di pedine dei giocatori/);
  // The players' read-only rules page lists it.
  h.ctx.role = "player";
  h.ctx.view = { page: "campaign", tab: "campaign-settings-rules", id: "" };
  assert.match(plain(UI.renderRulesPage(h.ctx)), /Gruppi di pedine dei giocatori Consentito/);
  assert.throws(
    () => D.setPermission(h.ctx.state, h.slice(), CID, "playerGroup", false, "player"),
    (e) => e.code === "dm-only",
  );
  // Stored values survive normalization; junk does not.
  assert.equal(
    D.policyOf(D.normalizeSlice({ campaigns: { [CID]: { policy: { playerGroup: true } } } }), CID)
      .playerGroup,
    true,
  );
  assert.equal(
    D.policyOf(D.normalizeSlice({ campaigns: { [CID]: { policy: { playerGroup: "yes" } } } }), CID)
      .playerGroup,
    false,
  );
});

test("C4: Fonti switches on the legacy 2014 versions beside the 2024 ones; the edition stays locked", () => {
  const h = settingsHarness();
  const legacy = () =>
    D.sourceStates(h.ctx.state, h.policy()).find((row) => row.id === "legacy-2014");
  assert.equal(legacy().status, "blocked", "default off");
  const html = h.page("sources");
  assert.match(html, /data-cs-legacy/);
  assert.match(plain(html), /Versioni legacy 2014 \(SRD 5\.1\) accanto alle 2024/);
  // Builder: a campaign character cannot pick legacy options while it is off.
  assert.equal(legacyAccess(h.ctx.state, { actorId: "livia" }).allowed, false);
  h.ctx.commit("legacy", (draft) => D.setLegacySources(draft, draft.ext[D.ID], CID, true, "dm"));
  assert.equal(legacy().status, "available");
  assert.equal(h.policy().legacySources, "available");
  assert.equal(legacyAccess(h.ctx.state, { actorId: "livia" }).allowed, true);
  const entry = D.recordOf(h.slice(), CID).history.at(-1);
  assert.deepEqual(
    [entry.kind, entry.key, entry.from, entry.to],
    ["source", "legacy-2014", false, true],
  );
  assert.match(plain(h.page("history")), /Fonte · Versioni legacy 2014/);
  // The rules edition is still 2024 and locked.
  const rules = plain(h.page("rules"));
  assert.match(rules, /Edizione delle regole Bloccata D&D 2024 · SRD 5\.2\.1/);
  // Normalization keeps the switch; a correction turns it back off.
  assert.equal(
    D.policyOf(D.normalizeSlice(structuredClone(h.slice())), CID).legacySources,
    "available",
  );
  assert.ok(D.canRestore(h.slice(), CID, entry, h.ctx.state));
  h.ctx.commit("restore", (draft) =>
    D.restoreHistoryEntry(draft, draft.ext[D.ID], CID, entry.id, "Solo 2024", "dm"),
  );
  assert.equal(legacy().status, "blocked");
  assert.throws(
    () => D.setLegacySources(h.ctx.state, h.slice(), CID, true, "player"),
    (e) => e.code === "dm-only",
  );
  assert.throws(
    () =>
      D.setLegacySources(
        structuredClone(h.ctx.state),
        structuredClone(h.slice()),
        CID,
        false,
        "dm",
      ),
    (e) => e.code === "same",
  );
});

test("H-01 (C7): critical hits, flanking and potions name the engine that applies them", () => {
  for (const key of ["criticals", "flanking"]) {
    const consumer = D.ruleOf(key).consumer;
    assert.match(consumer.it, /Motore d’attacco del Tavolo/, key);
    assert.match(consumer.en, /attack engine/, key);
    assert.doesNotMatch(consumer.it, /Accordo del gruppo|correggendo il danno/, key);
  }
  const potions = D.ruleOf("potions").consumer;
  assert.match(potions.it, /Azione Bonus/);
  assert.doesNotMatch(potions.it, /Accordo del gruppo/);
});

test("SV-38: Impostazioni › Integrazioni has the Discord row that opens Integrazioni › Discord", () => {
  // Without the integrations area the tab says why there is nothing to open.
  assert.match(settingsHarness().page("integrations"), /data-cs-integrations-missing/);
  const h = settingsHarness({ extra: [["integrations", registerIntegrations]] });
  const landing = h.page("rules");
  assert.match(landing, /data-cs-tab="integrations"/, "the tab is in the strip");
  const html = h.page("integrations");
  assert.match(html, /data-cs-discord/);
  assert.match(plain(html), /Discord: inoltra tiri e avvisi a un canale/);
  UI.openDiscord(h.ctx);
  assert.deepEqual(h.ctx.view, { page: "campaign", tab: "integrations", id: "discord" });
  h.ctx.lang = "en";
  assert.match(plain(h.page("integrations")), /Discord: relay rolls and notices to a channel/);
});
