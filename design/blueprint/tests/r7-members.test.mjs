// R7 — joining, the DM hand-off and copying between campaigns:
// - CA-75 (BG3 mod verification): the join-by-link preview lists «Contenuti richiesti»: what
//   arrives with the campaign, what the campaign itself lacks and what the joiner's character
//   uses that the campaign has not enabled, each with its action («Chiedi al DM» for the
//   player, «Abilita» for the DM in the invitations and requests list).
// - CA-57 (Owlbear GM hand-off from the player list): «Cedi il ruolo di DM…» on a member row
//   of the Table's presence list; the dialog says the recipient runs the whole session and
//   what stays private.
// - CA-88 (Roll20 Transmogrifier, contract C5): a creature's «Copia in un’altra campagna…» is
//   offered with one campaign; openCopyTo explains and offers «Crea una campagna», then comes
//   back to the copy.
// Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as hb from "../homebrew.mjs";
import * as cm from "../campaign-members.mjs";
import * as data from "../campaign-data.mjs";
import * as SV from "../session-view.mjs";
import { register as registerLibrary } from "../character-library.mjs";

const NOW = Date.parse("2026-09-27T10:00:00.000Z");
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
const plain = (html) =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const form = (entries) => {
  const out = new FormData();
  for (const [key, value] of Object.entries(entries)) out.append(key, value);
  return out;
};

afterEach(() => {
  cm.resetCampaignMembersView();
  data.resetCampaignDataView();
  SV.resetUI();
});

/** A UI host with the real registry: members, data, library and session areas. */
function host({ role = "dm", lang = "it" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, reg] of [
    [cm.ID, cm.register],
    [data.ID, data.register],
    ["character-library", registerLibrary],
    [SV.ID, SV.register],
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
    view: { page: "campaigns", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value ?? ""),
    toast: (text, error = false) => toasts.push({ text, error }),
    render() {
      ctx.html = ctx.view.page === "campaigns" ? cm.renderCampaignsPage(ctx) : "";
    },
    navigate(page, params = {}) {
      ctx.view = { page, id: "", tab: "", ...params };
      ctx.render();
    },
    dialog(title, body, options = {}) {
      dialogs.push({ title, body, options });
    },
    closeDialog() {},
    openSheet() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    undoLabel: () => "",
    canUndo: () => false,
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete.", en: "You are offline." });
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      if (options.afterCommit) options.afterCommit(store.state);
      ctx.render();
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, registry, toasts, dialogs, store };
}

/** One homebrew item created, saved and applied in `who`'s Library. */
function homebrew(state, who, id, it, en, type = "feature") {
  hb.createHomebrewDraft(state, { id, kind: "create", type }, who);
  const draft = hb.getHomebrewDraft(state, id, who);
  hb.saveHomebrewDraft(
    state,
    id,
    {
      expectedRevision: draft.revision,
      data: {
        ...draft.data,
        name: { it, en },
        description: { it: "Contenuto originale", en: "Original content" },
        source: {
          kind: "authored",
          edition: "2024",
          label: "Synthetic original",
          reference: "",
          rights: { modify: true, share: true, export: true },
        },
      },
    },
    who,
  );
  const preview = hb.previewHomebrewDraft(state, id, who);
  return hb.applyHomebrewDraft(state, id, { reviewKey: preview.reviewKey }, who).ref;
}

/**
 * The DM's second campaign «Rovine di Vetro» with a join link; it enables the DM's «Raggio di
 * lanterna» and a revision nobody's Library holds. Iria (the player's personal sheet) uses
 * the player's own «Lama di brina».
 */
function joinScene(h) {
  let fixture = null;
  h.ctx.commit("setup", (draft) => {
    const beam = homebrew(draft, "dm", "beam", "Raggio di lanterna", "Lantern beam");
    const frost = homebrew(draft, "player", "frost", "Lama di brina", "Frost blade");
    const id = cm.createCampaign(draft, { name: "Rovine di Vetro" }, "dm", NOW);
    draft.ext[cm.ID].parked[id].campaign.enabledContent = [
      beam,
      { contentId: "ghost", revisionId: "g1" },
    ];
    draft.actors.iria.features = [
      ...(draft.actors.iria.features ?? []),
      { id: "iria-frost", name: { it: "Lama di brina", en: "Frost blade" }, homebrewRef: frost },
    ];
    const link = cm.createInviteLink(
      draft,
      id,
      { role: "player", hours: 48, uses: 5 },
      "dm",
      Date.now(),
    ); // UI renders read the real clock;
    fixture = { beam, frost, id, code: link.code };
  });
  return fixture;
}

test("CA-75: the join preview lists what arrives, what the campaign lacks and what Iria needs", () => {
  const h = host({ role: "dm" });
  const f = joinScene(h);
  h.ctx.role = "player";
  const rows = cm.joinContentCheck(
    h.ctx.state,
    { code: f.code, path: "own", actorId: "iria" },
    "player",
  );
  const summary = rows.map((row) => [row.group, row.ref.contentId, row.action]);
  assert.deepEqual(summary, [
    ["arrives", f.beam.contentId, null],
    ["campaign-missing", "ghost", "ask"],
    ["character", f.frost.contentId, "ask"],
  ]);
  // The DM's content the player cannot read is not named to them.
  assert.equal(rows[0].name, null);
  assert.equal(rows[2].name.it, "Lama di brina");
  // The preview dialog shows «Contenuti richiesti» with one row each and its action.
  h.ctx.navigate("campaigns", { tab: "join", id: f.code });
  cm.handleForm(h.ctx, "join", form({ actorId: "iria" }), {
    dataset: { code: f.code, path: "own" },
  });
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Prima di entrare");
  const text = plain(dialog.body);
  assert.match(text, /Contenuti richiesti/);
  assert.match(text, /Arriva con la campagna/);
  assert.match(text, /Manca alla campagna/);
  assert.match(text, /Lama di brina/);
  assert.match(text, /La campagna non la usa ancora/);
  assert.equal((dialog.body.match(/data-cm-content-ask=/g) ?? []).length, 2, "two rows to ask");
  assert.match(text, /Chiedi al DM/);
  // Asking records the request and lets the DM read that revision to enable it.
  cm.handleAction(h.ctx, "content-ask", {
    id: f.id,
    code: f.code,
    content: f.frost.contentId,
    revision: f.frost.revisionId,
    actor: "iria",
  });
  assert.match(h.toasts.at(-1).text, /Richiesta inviata al DM/);
  const again = cm.joinContentCheck(
    h.ctx.state,
    { code: f.code, path: "own", actorId: "iria" },
    "player",
  );
  assert.equal(again.find((row) => row.ref.contentId === f.frost.contentId).asked, true);
  // The DM sees it with «Abilita»; enabling puts it in the parked campaign.
  h.ctx.role = "dm";
  const asks = cm.incomingFor(h.ctx.state, "dm").filter((item) => item.kind === "content-ask");
  h.ctx.navigate("campaigns", {});
  assert.match(h.ctx.html, /data-cm="content-enable"/);
  assert.match(plain(h.ctx.html), /Lama di brina/);
  assert.equal(asks.length, 1, "only Iria's blade was asked");
  const frostAsk = asks.find((item) => item.ref.contentId === f.frost.contentId);
  cm.handleAction(h.ctx, "content-enable", { id: f.id, ask: frostAsk.id });
  assert.ok(
    h.ctx.state.ext[cm.ID].parked[f.id].campaign.enabledContent.some(
      (ref) => ref.contentId === f.frost.contentId,
    ),
  );
  assert.equal(
    cm.incomingFor(h.ctx.state, "dm").filter((item) => item.kind === "content-ask").length,
    0,
    "the enabled one leaves the list",
  );
  // The missing revision: asked too; the DM cannot enable it (their Library lacks it) and
  // reads why, with the way to fix it.
  h.ctx.role = "player";
  cm.handleAction(h.ctx, "content-ask", {
    id: f.id,
    code: f.code,
    content: "ghost",
    revision: "g1",
    actor: "",
  });
  h.ctx.role = "dm";
  const ghost = cm.incomingFor(h.ctx.state, "dm").find((item) => item.kind === "content-ask");
  assert.equal(ghost.ref.contentId, "ghost");
  assert.equal(ghost.readable, false);
  h.ctx.navigate("campaigns", {});
  assert.match(h.ctx.html, /Aggiungila alla Biblioteca/);
  assert.throws(
    () => cm.enableAskedContent(structuredClone(h.ctx.state), f.id, ghost.id, "dm"),
    (e) => /Biblioteca/.test(e.it),
  );
  // English.
  h.ctx.role = "player";
  h.ctx.lang = "en";
  cm.handleForm(h.ctx, "join", form({ actorId: "iria" }), {
    dataset: { code: f.code, path: "own" },
  });
  const en = plain(h.dialogs.at(-1).body);
  assert.match(en, /Required content/);
  assert.match(en, /Comes with the campaign/);
  assert.match(en, /Ask the DM|Asked/);
});

test("CA-57: «Cedi il ruolo di DM…» on the player's row of the Table presence list", async () => {
  const h = host({ role: "dm" });
  h.ctx.view = { page: "table", id: "", tab: "" };
  SV.openPresence(h.ctx);
  const list = h.dialogs.at(-1);
  assert.equal(list.title, "Il gruppo");
  const playerRow = /data-sv-member="player"[\s\S]*?<\/li>/.exec(list.body)[0];
  assert.match(playerRow, /data-sv-handover="player"/);
  assert.match(plain(playerRow), /Cedi il ruolo di DM…/);
  const dmRow = /data-sv-member="dm"[\s\S]*?<\/li>/.exec(list.body)[0];
  assert.doesNotMatch(dmRow, /data-sv-handover=/, "not on the DM's own row");
  // A player never sees the command.
  h.ctx.role = "player";
  SV.openPresence(h.ctx);
  assert.doesNotMatch(h.dialogs.at(-1).body, /data-sv-handover=/);
  h.ctx.role = "dm";
  // The row opens the hand-off dialog with that member chosen and the privacy sentence.
  await SV.handOverFromTable(h.ctx, "player");
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Cedi il ruolo di DM per la sessione");
  assert.match(dialog.body, /<option value="player" selected>/);
  const text = plain(dialog.body);
  assert.doesNotMatch(text, /restano a te in questa versione/);
  assert.match(text, /guida tutta la sessione/);
  assert.match(text, /combattimento/);
  assert.match(text, /Preparazione/);
  assert.match(
    text,
    /mai i tuoi appunti privati, i piani personali, le schede personali o le bozze non salvate/,
  );
  assert.match(text, /Riprendi il ruolo di DM/);
  dialog.options.onSubmit(form({ to: "player" }));
  assert.equal(SV.sessionRunner(h.ctx.state), "player");
  // During the hand-off: the runner's row says so and the owner takes it back from there.
  SV.openPresence(h.ctx);
  const during = /data-sv-member="player"[\s\S]*?<\/li>/.exec(h.dialogs.at(-1).body)[0];
  assert.match(plain(during), /DM per la sessione/);
  assert.match(during, /data-sv-handover-end/);
  assert.match(plain(during), /Riprendi il ruolo di DM/);
  h.ctx.role = "player";
  SV.openPresence(h.ctx);
  const own = /data-sv-member="player"[\s\S]*?<\/li>/.exec(h.dialogs.at(-1).body)[0];
  assert.match(plain(own), /Restituisci il ruolo di DM/);
  h.ctx.role = "dm";
  await SV.endHandOverFromTable(h.ctx);
  assert.equal(SV.sessionRunner(h.ctx.state), null);
  // English.
  h.ctx.lang = "en";
  SV.openPresence(h.ctx);
  assert.match(plain(h.dialogs.at(-1).body), /Hand over the DM role…/);
});

test("CA-88: the creature copy is offered with one campaign; «Crea una campagna» comes back to it", async () => {
  const h = host({ role: "dm" });
  const target = { actorId: "goblin-1" };
  const entry = h.registry.get("token-menu", "campaign-data-copy-creature", h.ctx, target);
  assert.ok(entry, "offered even without a second campaign");
  data.openCopyTo(h.ctx, "creature:goblin-1");
  const why = h.dialogs.at(-1);
  assert.equal(why.title, "Copia in un’altra campagna");
  const text = plain(why.body);
  assert.match(text, /Sentinella/);
  assert.match(text, /Serve un’altra campagna attiva/);
  assert.equal(why.options.submitLabel, "Crea una campagna");
  why.options.onSubmit(form({}));
  const create = h.dialogs.at(-1);
  assert.equal(create.title, "Crea campagna");
  create.options.onSubmit(
    form({
      name: "Rovine di Vetro",
      description: "",
      tags: "",
      nextLocal: "",
      timeZone: "Europe/Rome",
    }),
  );
  // Back to the copy, with the new campaign as the destination.
  const copy = h.dialogs.at(-1);
  assert.equal(copy.title, "Copia in un’altra campagna");
  assert.match(plain(copy.body), /Creatura · Sentinella → «Rovine di Vetro»/);
  copy.options.onSubmit(form({}));
  const copied = Object.values(h.ctx.state.actors).find(
    (actor) => actor.dataCopy?.from === "goblin-1",
  );
  assert.ok(copied, "the creature was copied");
  // A scene picked as «scene:<id>» (Preparation's entry) is preselected in the form.
  data.openCopyTo(h.ctx, "scene:old-watch");
  assert.deepEqual(h.ctx.view, { page: "campaign", id: "", tab: "campaign-data" });
});
