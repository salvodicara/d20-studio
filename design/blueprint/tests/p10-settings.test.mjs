// P10 — campaign governance: rule presets and the rule catalogue (CA-69), «Cosa vedono i
// giocatori» (CA-71, TV-76), permissions (CA-61), scene and token defaults (CA-74), sources
// per item and the dependency check (CA-73, CA-75). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import * as D from "../campaign-settings-domain.mjs";
import * as UI from "../campaign-settings.mjs";
import { register as registerTokenMenu, isLocked } from "../token-menu.mjs";
import { register as registerAnnotations } from "../annotations.mjs";
import { register as registerKnowledge } from "../knowledge.mjs";
import { register as registerFog } from "../fog-vision.mjs";
import { policyOf as knowledgePolicy } from "../knowledge-domain.mjs";
import * as hb from "../homebrew.mjs";

const CID = "lanterns";
const memory = () => {
  const values = new Map();
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
};

function harness({ role = "dm", view = null } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, reg] of [
    ["token-menu", registerTokenMenu],
    ["annotations", registerAnnotations],
    ["fog-vision", registerFog],
    ["knowledge", registerKnowledge],
    ["campaign-settings", UI.register],
  ])
    assert.equal(registry.use(id, reg).status, "built", id);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const ctx = {
    role,
    lang: "it",
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
      registry.emit("navigate", { page, id: ctx.view.id, tab: ctx.view.tab, from: null });
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
  };
}

test("CA-69 presets: Standard 2024, Narrativo, Tattico; locked rules keep their value", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  assert.deepEqual(
    D.PRESETS.map((p) => p.id),
    ["standard-2024", "narrative", "tactical"],
  );
  // Every preset names a value for every catalogue rule, and every value is an option.
  for (const preset of D.PRESETS)
    for (const key of D.PRESET_KEYS)
      assert.ok(D.ruleOf(key).options.some((o) => o.value === preset.values[key]), key);
  assert.equal(D.presetOf(D.policyOf(slice, CID)), "custom", "the sample chose automatic");
  // The sample campaign has started: multiclassing is locked and stays.
  assert.throws(
    () => D.setRule(state, slice, CID, "multiclass", "forbidden", "dm"),
    (e) => e.code === "locked",
  );
});

test("CA-69 applying a preset: one history row, locked rules kept, a single change reads custom", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  // A campaign not started: everything changes.
  const fresh = D.normalizeSlice({ campaigns: { [CID]: {} } });
  const row = D.applyPreset(state, fresh, CID, "tactical", "dm", {
    now: Date.parse("2026-09-26T10:00:00Z"),
  });
  assert.equal(row.kind, "preset");
  assert.equal(row.to, "tactical");
  assert.equal(D.presetOf(D.policyOf(fresh, CID)), "tactical");
  assert.equal(D.policyOf(fresh, CID).flanking, "advantage");
  assert.equal(D.policyOf(fresh, CID).enemyHp, "hidden");
  assert.throws(() => D.applyPreset(state, fresh, CID, "tactical", "dm"), /already match Tattico|already match Tactical/);
  D.setRule(state, fresh, CID, "criticals", "max", "dm");
  assert.equal(D.presetOf(D.policyOf(fresh, CID)), "custom", "one single change → custom");
  // A started campaign with multiclassing forbidden: the preset keeps the locked rule.
  const started = D.seedSlice();
  D.recordOf(started, CID).startedAt = null;
  D.setRule(state, started, CID, "multiclass", "forbidden", "dm");
  D.startCampaign(state, started, CID, "dm");
  const preview = D.previewPreset(started, CID, "narrative");
  assert.deepEqual(
    preview.kept.map((k) => k.key),
    ["multiclass"],
  );
  assert.ok(preview.changes.some((c) => c.key === "encumbrance" && c.to === "off"));
  D.applyPreset(state, started, CID, "narrative", "dm");
  assert.equal(D.policyOf(started, CID).multiclass, "forbidden", "locked after the start");
  assert.equal(D.policyOf(started, CID).encumbrance, "off");
  assert.throws(() => D.applyPreset(state, started, CID, "chaos", "dm"), /Unknown preset/);
  assert.throws(() => D.applyPreset(state, started, CID, "tactical", "player"), /DM/);
});

test("CA-69 UI: preset picker with four cards, rules grouped, no census IDs, one place", () => {
  const h = harness();
  const html = UI.renderSettings(h.ctx);
  for (const id of ["standard-2024", "narrative", "tactical", "custom"])
    assert.match(html, new RegExp(`data-cs-preset-pick[^>]*value="${id}"|value="${id}"[^>]*data-cs-preset-pick`));
  assert.match(html, /Personaggi[\s\S]*Tavolo e automazione[\s\S]*Combattimento e avventura/);
  for (const key of ["criticals", "potions", "encumbrance", "flanking", "multiclass", "automation"])
    assert.match(html, new RegExp(`data-cs-rule="${key}"`));
  assert.doesNotMatch(html, /data-cs-rule="enemyHp"/, "enemy health lives in What players see");
  assert.doesNotMatch(html, /CRP-\d|FVT-\d|R20-\d|DDB-\d|SVC-\d|CMP-\d|VTL-\d|Modello:/);
  assert.match(html, /Anteprima della pagina giocatori/);
  assert.doesNotMatch(html, /Vedi come appaiono ai giocatori/);
  // Picking a preset opens a dialog listing the changes; confirming applies it.
  const root = mountLite(html);
  UI.bindCampaignSettings(root, h.ctx);
  const tactical = root.find('[data-cs-preset-pick]', "tactical");
  tactical.fire("change");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.title, /Tattico/);
  assert.match(dialog.body, /Fiancheggiamento/);
  dialog.options.onSubmit(new Map());
  assert.equal(D.presetOf(h.policy()), "tactical");
  // Players read the same rules, grouped, on the read-only page.
  h.ctx.role = "player";
  const page = UI.renderRulesPage(h.ctx);
  assert.match(page, /Colpi critici[\s\S]*Dadi raddoppiati/);
  assert.match(page, /Fiancheggiamento[\s\S]*Vantaggio a chi fiancheggia/);
  assert.doesNotMatch(page, /data-cs-rule-input/);
});

test("CA-71 / TV-76: one «Cosa vedono i giocatori» group, one value each (knowledge reads it)", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "disclosure" } });
  const html = UI.renderSettings(h.ctx);
  for (const needle of [
    'data-cs-rule-input="enemyHp"',
    "data-cs-default-input",
    'data-cs-disclosure-input="hitChance"',
    'data-cs-disclosure-input="bestiary"',
  ])
    assert.ok(html.includes(needle), needle);
  assert.match(html, /data-cs-view-as="player"/, "check from the player's view in one click");
  assert.equal(D.disclosureOf(h.ctx.state).hitChance, "never");
  const root = mountLite(html);
  UI.bindCampaignSettings(root, h.ctx);
  root.find("[data-cs-disclosure-input]", "always").fire("change");
  assert.equal(D.disclosureOf(h.ctx.state).hitChance, "always");
  assert.equal(knowledgePolicy(h.ctx.state).hitChance, "always", "the knowledge area reads it");
  const last = h.slice().campaigns[CID].history.at(-1);
  assert.equal(last.kind, "disclosure");
  assert.ok(D.canRestore(h.slice(), CID, last, h.ctx.state));
  h.ctx.commit(
    "x",
    (s) => D.restoreHistoryEntry(s, h.registry.slice(s, D.ID), CID, last.id, "Troppo facile", "dm"),
    { undoable: false },
  );
  assert.equal(D.disclosureOf(h.ctx.state).hitChance, "never");
  // Palette: «probabilità» and the group's own words find the settings.
  const labels = h.registry
    .list("command", h.ctx)
    .map((c) => [c.label.it, (c.keywords ?? []).map((k) => (typeof k === "string" ? k : k.it)).join(" ")].join(" "));
  assert.ok(labels.some((l) => /Probabilità di colpire/.test(l)));
  assert.ok(labels.some((l) => /Cosa vedono i giocatori/.test(l) && /salute dei nemici/.test(l)));
});

test("CA-61 permissions: players control the DM's creatures (and new ones); lock own tokens", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "permissions" } });
  const goblin = () => h.ctx.state.actors["goblin-1"];
  assert.equal(canControlActor(goblin(), "player", h.ctx.state), false);
  h.ctx.commit(
    "x",
    (s) => D.setPermission(s, h.registry.slice(s, D.ID), CID, "dmCreatures", true, "dm"),
    { undoable: false },
  );
  assert.equal(canControlActor(goblin(), "player", h.ctx.state), true);
  // A creature added later follows the permission (follow-up commit).
  h.ctx.commit("Nuova creatura", (s) => {
    s.actors["goblin-3"] = { ...structuredClone(s.actors["goblin-2"]), id: "goblin-3", name: "Arciere" };
    s.scenes[0].tokens.push({ id: "token-goblin-3", actorId: "goblin-3", x: 500, y: 200 });
  });
  assert.equal(canControlActor(h.ctx.state.actors["goblin-3"], "player", h.ctx.state), true);
  h.ctx.commit(
    "x",
    (s) => D.setPermission(s, h.registry.slice(s, D.ID), CID, "dmCreatures", false, "dm"),
    { undoable: false },
  );
  assert.equal(canControlActor(goblin(), "player", h.ctx.state), false, "withdrawn cleanly");
  assert.equal(goblin().controllers, undefined);
  assert.throws(
    () => D.setPermission(h.ctx.state, h.slice(), CID, "dmCreatures", true, "player"),
    /DM/,
  );
  // Token lock for players: off → no menu item; on → the player locks Livia's token.
  const menu = () =>
    h.registry
      .list("token-menu", { ...h.ctx, role: "player" }, { actorId: "livia", sceneId: "old-watch" })
      .map((c) => c.id);
  assert.ok(!menu().includes("campaign-settings-player-lock"));
  h.ctx.commit(
    "x",
    (s) => D.setPermission(s, h.registry.slice(s, D.ID), CID, "playerLock", true, "dm"),
    { undoable: false },
  );
  h.ctx.role = "player";
  assert.ok(menu().includes("campaign-settings-player-lock"));
  const item = h.registry.get("token-menu", "campaign-settings-player-lock", h.ctx, {
    actorId: "livia",
    sceneId: "old-watch",
  });
  h.registry.invoke(item, "run", h.ctx, { actorId: "livia", sceneId: "old-watch" });
  const token = h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "livia");
  assert.ok(isLocked(h.ctx.state.ext["token-menu"], token.id));
  // Never on a creature the player does not control.
  assert.equal(
    h.registry.get("token-menu", "campaign-settings-player-lock", h.ctx, {
      actorId: "goblin-1",
      sceneId: "old-watch",
    }),
    null,
  );
});

test("CA-74 scene and token defaults: impact count, apply to existing, new scenes follow", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "defaults" } });
  const html = UI.renderSettings(h.ctx);
  for (const key of ["gridVisible", "gridSnap", "metersPerCell", "vision", "phase"])
    assert.ok(html.includes(`data-cs-scene-default="${key}"`), key);
  assert.match(html, /data-cs-creature-vision/);
  h.ctx.commit(
    "x",
    (s) => {
      const sl = h.registry.slice(s, D.ID);
      D.setSceneDefault(s, sl, CID, "phase", "night", "dm");
      D.setSceneDefault(s, sl, CID, "gridVisible", false, "dm");
    },
    { undoable: false },
  );
  const preview = D.previewSceneDefaults(h.ctx.state, h.slice(), CID);
  assert.ok(preview.scenes.length >= 1);
  const watch = preview.scenes.find((row) => row.sceneId === "old-watch");
  assert.deepEqual(watch.fields.sort(), ["gridVisible", "phase"]);
  const root = mountLite(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  root.find("[data-cs-apply-scene-defaults]").fire();
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /scene? cambier/);
  dialog.options.onSubmit(new Map([["scenes", "on"]]));
  const scene = h.ctx.state.scenes.find((row) => row.id === "old-watch");
  assert.equal(scene.gridVisible, false);
  assert.equal(h.ctx.state.ext["fog-vision"].scenes[scene.id].phase, "night");
  assert.equal(h.ctx.state.ext["fog-vision"].scenes[scene.id].ambient, "dark");
  assert.equal(D.previewSceneDefaults(h.ctx.state, h.slice(), CID).scenes.length, 0);
  // A scene made afterwards starts with the defaults (follow-up commit, Roll20 new page).
  h.ctx.commit("Nuova scena", (s) => {
    s.scenes.push({ ...structuredClone(s.scenes[0]), id: "crypt-new", name: "Cripta", tokens: [] });
    delete s.scenes.at(-1).gridVisible;
  });
  const made = h.ctx.state.scenes.find((s) => s.id === "crypt-new");
  assert.equal(made.gridVisible, false);
  assert.equal(h.ctx.state.ext["fog-vision"].scenes["crypt-new"].phase, "night");
});

test("CA-73 / CA-75 sources per item with switches; a missing revision reads «mancante»", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "sources" } });
  // A homebrew spell in the DM's Library (the Library's own draft flow).
  h.ctx.commit("hb", (s) => {
    hb.createHomebrewDraft(s, { id: "beam", kind: "create", type: "feature" }, "dm");
    const draft = hb.getHomebrewDraft(s, "beam", "dm");
    hb.saveHomebrewDraft(
      s,
      "beam",
      {
        expectedRevision: draft.revision,
        data: {
          ...draft.data,
          name: { it: "Raggio di lanterna", en: "Lantern beam" },
          description: { it: "Capacità originale di esempio", en: "Original example feature" },
          source: {
            kind: "authored",
            edition: "2024",
            label: "Synthetic original",
            reference: "",
            rights: { modify: true, share: true, export: true },
          },
        },
      },
      "dm",
    );
    const preview = hb.previewHomebrewDraft(s, "beam", "dm");
    assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
    hb.applyHomebrewDraft(s, "beam", { reviewKey: preview.reviewKey }, "dm");
  });
  const rows = D.homebrewSources(h.ctx.state, "dm");
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.status, "off");
  let html = UI.renderSettings(h.ctx);
  assert.match(html, /Capacità/);
  assert.match(html, new RegExp(`data-cs-homebrew="${row.contentId}"`));
  const root = mountLite(html);
  UI.bindCampaignSettings(root, h.ctx);
  const toggle = root.find(`[data-cs-homebrew]`);
  toggle.checked = true;
  toggle.fire("change");
  assert.equal(D.homebrewSources(h.ctx.state, "dm")[0].status, "on");
  html = UI.renderSettings(h.ctx);
  assert.match(html, /Attivo · revisione 1 di 1/);
  // An enabled revision the Library does not hold: «mancante», with its action.
  h.ctx.commit("x", (s) => {
    s.campaign.enabledContent = [...s.campaign.enabledContent, { contentId: "ghost", revisionId: "r9" }];
  });
  html = UI.renderSettings(h.ctx);
  assert.match(html, /Mancant/);
  const check = D.dependencyCheck(h.ctx.state, h.ctx.state.campaign.enabledContent, CID, "dm");
  assert.deepEqual(
    check.map((r) => [r.ref.contentId, r.status, r.action]),
    [
      [row.contentId, "ready", null],
      ["ghost", "missing", "library"],
    ],
  );
});

// A tiny element double: form controls parsed from markup, click/change handlers stored.
function mountLite(html) {
  const decode = (v) =>
    String(v ?? "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  const nodes = [...html.matchAll(/<(input|button|select|textarea|form)\b([^>]*)>/g)].map(
    ([, tag, text]) => {
      const attrs = Object.fromEntries(
        [...text.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? "")]),
      );
      const events = {};
      const node = {
        tagName: tag.toUpperCase(),
        attrs,
        type: attrs.type,
        value: attrs.value ?? "",
        checked: "checked" in attrs,
        dataset: Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k.startsWith("data-"))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
        ),
        addEventListener: (type, fn) => (events[type] = fn),
        getAttribute: (name) => attrs[name] ?? null,
        focus() {},
        fire: (type = "click") => events[type]?.({ preventDefault() {}, target: node }),
      };
      return node;
    },
  );
  const matches = (node, selector) =>
    selector.split(",").some((part) => {
      const tests = [...part.trim().matchAll(/\[([\w-]+)(?:="?([^"\]]*)"?)?\]/g)];
      return (
        tests.length > 0 &&
        tests.every(([, k, v]) => (v === undefined ? k in node.attrs : node.attrs[k] === v))
      );
    });
  return {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
    find(selector, value) {
      const node = nodes.find((n) => matches(n, selector) && (value === undefined || n.value === value));
      assert.ok(node, `missing ${selector} ${value ?? ""}`);
      return node;
    },
  };
}
