// R7 SV-37 — every disabled control of the R7 areas (campaign settings, campaign data,
// members, session view, safety, community, party) names its cause and remedy next to it,
// linked by aria-describedby (Roll20 errors that name cause and fix). Renders the disabled
// states and checks each one. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as cm from "../campaign-members.mjs";
import * as data from "../campaign-data.mjs";
import * as CS from "../campaign-settings.mjs";
import * as SV from "../session-view.mjs";
import * as P from "../party.mjs";
import * as SUI from "../safety-ui.mjs";
import { register as registerSafety } from "../safety.mjs";
import * as CD from "../community-domain.mjs";
import * as CUI from "../community.mjs";
import { register as registerTokenMenu } from "../token-menu.mjs";
import { register as registerFog } from "../fog-vision.mjs";

afterEach(() => {
  cm.resetCampaignMembersView();
  data.resetCampaignDataView();
  CS.resetCampaignSettingsView();
  SV.resetUI();
  P.resetPartyView();
  SUI.resetSafetyView();
});

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
/** Every disabled control in `html` points to an element that says why (non-empty text). */
function explained(html, where) {
  const controls = [...html.matchAll(/<(button|input|select|textarea|fieldset)\b([^>]*)>/g)].filter(
    ([, , attrs]) => /\sdisabled(\s|=|$)/.test(attrs),
  );
  for (const [whole, , attrs] of controls) {
    const id = /aria-describedby="([^"]+)"/.exec(attrs)?.[1];
    assert.ok(id, `${where}: disabled control without a reason: ${whole.slice(0, 180)}`);
    for (const one of id.split(/\s+/)) {
      const target = new RegExp(
        `id="${one.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</`,
      ).exec(html);
      assert.ok(target, `${where}: reason #${one} is not in the page`);
      assert.ok(
        decode(target[1].replace(/<[^>]+>/g, "")).trim().length > 5,
        `${where}: reason #${one} is empty`,
      );
    }
  }
  return controls.length;
}
const memory = () => {
  const values = new Map();
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
};
function host(areas, { role = "dm" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, reg] of areas) assert.equal(registry.use(id, reg).status, "built", id);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const dialogs = [];
  const ctx = {
    role,
    lang: "it",
    offline: false,
    view: { page: "campaign", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? v[ctx.lang] || v.it || "" : String(v ?? "")),
    toast() {},
    navigate(page, params = {}) {
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    openSheet() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => false,
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
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
  return { ctx, registry, dialogs, store };
}

test("campaign settings: locked rules, nothing to apply, defaults already followed", () => {
  const h = host([
    ["token-menu", registerTokenMenu],
    ["fog-vision", registerFog],
    ["campaign-settings", CS.register],
  ]);
  let count = 0;
  for (const tab of ["rules", "disclosure", "defaults", "sources", "permissions", "integrations"]) {
    h.ctx.view = { page: "campaign", tab: "settings", id: tab };
    count += explained(CS.renderSettings(h.ctx), `settings ${tab}`);
  }
  assert.ok(count >= 3, "multiclassing locked, creature and scene defaults already applied");
  h.ctx.view = { page: "campaign", tab: "settings", id: "rules" };
  assert.match(
    CS.renderSettings(h.ctx),
    /id="cs-lock-why-multiclass"[^>]*>[\s\S]*?Per un accordo diverso aggiungi una regola della casa/,
  );
});

test("campaign data and members: private notes, empty components, no candidate, archived links", () => {
  const h = host([
    [cm.ID, cm.register],
    [data.ID, data.register],
  ]);
  h.ctx.view = { page: "campaign", tab: "campaign-data", id: "" };
  const section = h.registry.get("campaign-section", "campaign-data", h.ctx);
  let count = explained(section.render(h.ctx), "data section");
  assert.ok(count >= 1, "«Includi le mie note Solo io» without notes");
  data.handleAction(h.ctx, "copy");
  count = explained(h.dialogs.at(-1).body, "copy dialog");
  assert.ok(count >= 1);
  // A new campaign with only its owner: transfer has nobody to go to.
  let id;
  h.ctx.commit("new", (draft) => {
    id = cm.createCampaign(draft, { name: "Rovine di Vetro" }, "dm", Date.now());
  });
  h.ctx.view = { page: "campaigns", id, tab: "manage" };
  assert.ok(explained(cm.renderCampaignsPage(h.ctx), "manage") >= 1);
  // Archived: the invite forms say why and how to restore.
  h.ctx.commit("archive", (draft) => cm.setCampaignStatus(draft, id, "archived", "dm", Date.now()));
  h.ctx.view = { page: "campaigns", id, tab: "invites" };
  const invites = cm.renderCampaignsPage(h.ctx);
  assert.ok(explained(invites, "invites") >= 1);
  assert.match(invites, /Ripristinala da «Gestione» per invitare/);
});

test("session view: the Session panel's countdown, split party and regroup say why", () => {
  const h = host([[SV.ID, SV.register]]);
  h.ctx.view = { page: "table", id: "", tab: "" };
  const panel = h.registry.get("table-panel", "session-view-controls", h.ctx);
  const html = panel.render(h.ctx);
  const count = explained(html, "session panel");
  assert.ok(count >= 2, "countdown at zero and regroup with the party together");
  assert.match(html, /id="sv-timer-why"[^>]*>Il conto alla rovescia è a zero/);
});

test("safety profile: the filter switches say to turn the filter on first", () => {
  const h = host([["safety", registerSafety]], { role: "player" });
  const api = { slice: (state) => state.ext.safety, ctx: () => h.ctx };
  const html = SUI.renderProfilePage(h.ctx, api);
  assert.ok(explained(html, "safety profile") >= 2);
  assert.match(html, /id="safety-filter-off-why"/);
});

test("community: a listing's preview and an unpublished listing's directory say why", () => {
  const h = host([
    [cm.ID, cm.register],
    ["safety", registerSafety],
    [CD.ID, CUI.register],
  ]);
  const api = { slice: (state) => h.registry.slice(state, CD.ID), ctx: () => h.ctx };
  // The sample campaign's listing is a draft: not published yet.
  const listingId = "listing-lanterns";
  h.ctx.view = { page: "community", tab: "manage-players", id: "lanterns" };
  explained(CUI.renderCommunityPage(h.ctx, api), "community directory");
  h.ctx.view = { page: "community", tab: "preview", id: listingId };
  assert.ok(explained(CUI.renderCommunityPage(h.ctx, api), "community preview") >= 1);
});

test("party dashboard setup: the first and last tiles say why they do not move further", () => {
  const h = host([["party", P.register]]);
  h.ctx.view = { page: "campaign", tab: "overview", id: "" };
  const overview = h.registry.get("campaign-section", "overview", h.ctx);
  // Kanka dashboard setup: the DM opens «Personalizza».
  P.openDashboardSetup(h.ctx, "dm");
  const html = overview.render(h.ctx);
  assert.ok(explained(html, "dashboard setup") >= 2);
});
