// B20 — Campaign settings, permissions, table rules and "view as": domain rules, the real
// store and registry, the consumers in other modules (Table pointer, builder sources and
// multiclassing, combat automation) and the UI handlers with a minimal element double.
// Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import * as D from "../campaign-settings-domain.mjs";
import * as UI from "../campaign-settings.mjs";
import { register as registerTokenMenu, setNameHidden } from "../token-menu.mjs";
import {
  register as registerAnnotations,
  permissions as annotationPermissions,
} from "../annotations.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { beginAttempt, resolveRoll, applyReadyOutcome, projectAttempts } from "../combat.mjs";
import { renderCampaign } from "../campaign.mjs";
import { pageEntries } from "../command-palette.mjs";
import {
  createCampaignDraft,
  saveCampaignDraft,
  previewCampaignDraft,
  applyCampaignDraft,
} from "../campaign-content.mjs";
import {
  startCharacterBuilder,
  renderCharacterBuilder,
  resetCharacterBuilderView,
} from "../character-builder.mjs";
import { useSampleClock } from "../sample-clock.mjs";

// The example's real-time stamps as authored (the week of Thursday 17 September 2026,
// sample-clock.mjs): pinned, so these checks never read the real date.
useSampleClock(() => Date.parse("2026-09-21T12:00:00Z"));

afterEach(() => {
  UI.resetCampaignSettingsView();
  resetTableView();
  resetCharacterBuilderView();
});

const CID = "lanterns";
const memory = () => {
  const values = new Map();
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
};
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Real store + registry (token menu and this area), with a ctx shaped like app.mjs.
function harness({ role = "dm", lang = "it", view = null, annotations = true } = {}) {
  const storage = memory();
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  assert.equal(registry.use("token-menu", registerTokenMenu).status, "built");
  // The players' tool switches are B18's campaign settings (one source of truth).
  if (annotations) assert.equal(registry.use("annotations", registerAnnotations).status, "built");
  assert.equal(registry.use("campaign-settings", UI.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: view ?? { page: "campaign", id: "rules", tab: "settings" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      navigations.push({ page, ...params });
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
      registry.emit("navigate", { page, id: ctx.view.id, tab: ctx.view.tab, from: null });
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    openSheet: (id, tab) => navigations.push({ page: "characters", id, tab }),
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () =>
      store.history.at(-1)?.controller === ctx.role ? store.history.at(-1).label : "",
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline.",
        });
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    navigations,
    dialogs,
    slice: () => registry.slice(store.state, D.ID),
    policy: () => D.policyOf(registry.slice(store.state, D.ID), CID),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    store: () => store,
  };
}

// Minimal element double for bind(): parses form controls from rendered markup and
// answers attribute selectors ([a], [a="v"], chains of them) and #id.
function mount(html) {
  const nodes = [...html.matchAll(/<(input|button|select|textarea|form)\b([^>]*)>/g)].map(
    ([, tag, attrsText]) => {
      const attrs = Object.fromEntries(
        [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? "")]),
      );
      const events = {};
      const node = {
        tagName: tag.toUpperCase(),
        attrs,
        events,
        value: attrs.value ?? "",
        checked: "checked" in attrs,
        focused: false,
        dataset: Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k.startsWith("data-"))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
        ),
        addEventListener(type, fn) {
          events[type] = fn;
        },
        getAttribute: (name) => attrs[name] ?? null,
        focus() {
          node.focused = true;
        },
        querySelector: (selector) => root.querySelector(selector),
        fire(type = "click") {
          return events[type]?.({ preventDefault() {}, target: node });
        },
      };
      return node;
    },
  );
  const matches = (node, selector) =>
    selector.split(",").some((part) => {
      const s = part.trim();
      if (s.startsWith("#")) return node.attrs.id === s.slice(1);
      const tests = [...s.matchAll(/\[([\w-]+)(?:="?([^"\]]*)"?)?\]/g)];
      return (
        tests.length > 0 &&
        tests.every(([, k, v]) =>
          v === undefined ? k in node.attrs : (k === "value" ? node.value : node.attrs[k]) === v,
        )
      );
    });
  const root = {
    nodes,
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
  };
  return root;
}
const one = (root, selector) => {
  const node = root.querySelector(selector);
  assert.ok(node, "missing " + selector);
  return node;
};
function fullDraftData(title, body) {
  return {
    title,
    body,
    worldType: "other",
    questStatus: "open",
    sessionId: null,
    narratorActorId: null,
    links: [],
    sections: [],
  };
}
function addEntry(state, viewer, { id, kind = "note", title, body, access }) {
  createCampaignDraft(state, { id, kind, campaignId: CID }, viewer);
  saveCampaignDraft(state, id, { data: fullDraftData(title, body), access }, viewer);
  const { reviewKey } = previewCampaignDraft(state, id, viewer);
  return applyCampaignDraft(state, id, { reviewKey }, viewer);
}

// ---------------------------------------------------------------- domain

test("seed and normalization: Standard 2024 is assisted (C1); the sample chose automatic", () => {
  const slice = D.seedSlice();
  const record = D.recordOf(slice, CID);
  assert.equal(record.startedAt, "2026-05-03T20:10:00.000Z");
  assert.equal(D.STANDARD_2024.automation, "assisted", "census C1: assisted by default");
  assert.equal(D.presetOf(D.policyOf(slice, CID)), "custom");
  assert.equal(record.customizedAt, "2026-05-02T18:05:00.000Z");
  assert.deepEqual(
    record.history.map((row) => [row.kind, row.key, row.from, row.to]),
    [
      ["preset", "preset", null, "standard-2024"],
      ["rule", "automation", "assisted", "automatic"],
      ["start", "startedAt", null, "2026-05-03T20:10:00.000Z"],
    ],
  );
  assert.deepEqual(
    D.policyOf(slice, CID),
    structuredClone({
      ...D.DEFAULT_POLICY,
      automation: "automatic",
      hiddenSections: [],
      dmSheetEdit: {},
    }),
  );
  assert.equal(D.policyOf(slice, "unknown").automation, "assisted", "absent campaign → defaults");
  assert.ok(!("playersPointer" in D.DEFAULT_POLICY), "players' tools live in one place");
  // Junk and invalid values fall back; the legacy source stays as the DM switched it (C4,
  // R7: «Versioni legacy 2014 accanto alle 2024» in Fonti), anything else reads blocked.
  const normalized = D.normalizeSlice({
    campaigns: {
      [CID]: {
        policy: {
          automation: "chaos",
          enemyHp: "exact",
          playersPointer: "no",
          hiddenSections: ["world", "overview", 7, "Bad Id"],
          legacySources: "available",
          dmSheetEdit: { livia: false, doran: true },
        },
        houseRules: [{ id: "h1", title: "Ok", text: "x".repeat(900) }, { nope: true }],
      },
      "bad id!": {},
    },
  });
  const policy = D.policyOf(normalized, CID);
  assert.equal(policy.automation, "assisted");
  assert.equal(policy.enemyHp, "exact");
  assert.ok(!("playersPointer" in policy), "an old stored pointer flag is dropped");
  assert.deepEqual(policy.hiddenSections, ["world"]);
  assert.equal(policy.legacySources, "available");
  assert.equal(
    D.policyOf(
      D.normalizeSlice({ campaigns: { [CID]: { policy: { legacySources: "yes" } } } }),
      CID,
    ).legacySources,
    "blocked",
  );
  assert.deepEqual(policy.dmSheetEdit, { livia: false });
  assert.equal(normalized.campaigns[CID].houseRules.length, 1);
  assert.equal(normalized.campaigns[CID].houseRules[0].text.length, D.HOUSE_TEXT_MAX);
  assert.ok(!("bad id!" in normalized.campaigns));
  assert.throws(() => D.normalizeSlice({ campaigns: {} }, 2), /newer version/);
  assert.equal(D.recordOf(D.normalizeSlice(null), CID).startedAt, "2026-05-03T20:10:00.000Z");
});

test("rules: DM switches with history, custom mark, refusals for players, locks after start", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  assert.throws(
    () => D.setRule(state, slice, CID, "automation", "assisted", "player"),
    (e) => e.code === "dm-only" && /Solo il DM/.test(e.it),
  );
  const row = D.setRule(state, slice, CID, "automation", "assisted", "dm", {
    now: Date.parse("2026-09-24T10:00:00Z"),
  });
  assert.equal(row.kind, "rule");
  assert.equal(row.from, "automatic");
  assert.equal(row.to, "assisted");
  assert.equal(D.policyOf(slice, CID).automation, "assisted");
  assert.equal(D.presetOf(D.policyOf(slice, CID)), "standard-2024");
  assert.equal(
    D.recordOf(slice, CID).customizedAt,
    "2026-05-02T18:05:00.000Z",
    "the first custom mark stays (WotR CRP-050)",
  );
  // A campaign with no record yet follows Standard 2024; its first change marks it custom.
  const blank = D.normalizeSlice({ campaigns: { [CID]: {} } });
  assert.equal(D.policyOf(blank, CID).automation, "assisted");
  D.setRule(state, blank, CID, "automation", "automatic", "dm", {
    now: Date.parse("2026-09-24T10:00:00Z"),
  });
  assert.equal(D.presetOf(D.policyOf(blank, CID)), "custom");
  assert.equal(D.recordOf(blank, CID).customizedAt, "2026-09-24T10:00:00.000Z");
  assert.throws(() => D.setRule(state, slice, CID, "automation", "assisted", "dm"), /already/);
  assert.throws(() => D.setRule(state, slice, CID, "automation", "maybe", "dm"), /Invalid value/);
  assert.throws(() => D.setRule(state, slice, CID, "gravity", "on", "dm"), /Unknown rule/);
  assert.throws(() => D.setRule(state, slice, CID, "flanking", "on", "dm"), /Invalid value/);
  // Multiclassing locks once the campaign has started (BG3 CRP-040), with the reason.
  const lock = D.ruleLock(D.recordOf(slice, CID), "multiclass");
  assert.match(lock.it, /Bloccata dall’avvio/);
  assert.throws(
    () => D.setRule(state, slice, CID, "multiclass", "forbidden", "dm"),
    (e) => e.code === "locked",
  );
  // A campaign not started yet: editable, then locked by "Start the campaign".
  const fresh = D.seedSlice();
  D.recordOf(fresh, CID).startedAt = null;
  D.setRule(state, fresh, CID, "multiclass", "forbidden", "dm");
  assert.equal(D.policyOf(fresh, CID).multiclass, "forbidden");
  D.startCampaign(state, fresh, CID, "dm");
  assert.throws(() => D.startCampaign(state, fresh, CID, "dm"), /already started/);
  assert.throws(
    () => D.setRule(state, fresh, CID, "multiclass", "allowed", "dm"),
    (e) => e.code === "locked",
  );
  // Standard 2024 restores editable rules; locked ones stay (and are listed).
  D.setRule(state, fresh, CID, "enemyHp", "hidden", "dm");
  const preview = D.previewPreset(fresh, CID);
  assert.deepEqual(
    preview.changes.map((c) => c.key),
    ["automation", "enemyHp"],
  );
  assert.deepEqual(
    preview.kept.map((c) => c.key),
    ["multiclass"],
  );
  D.applyStandardPreset(state, fresh, CID, "dm");
  assert.equal(D.policyOf(fresh, CID).enemyHp, "words");
  assert.equal(D.policyOf(fresh, CID).automation, "assisted");
  assert.equal(D.policyOf(fresh, CID).multiclass, "forbidden");
  assert.throws(() => D.applyStandardPreset(state, fresh, CID, "dm"), /locked ones stay/);
  assert.ok(D.recordOf(fresh, CID).customizedAt, "the custom mark stays (WotR CRP-050)");
});

test("house rules cite their authored decision; retiring needs a reason", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  assert.throws(() => D.addHouseRule(state, slice, CID, { title: "", text: "x" }, "dm"), /title/);
  assert.throws(
    () => D.addHouseRule(state, slice, CID, { title: "T", text: "  " }, "dm"),
    /Describe/,
  );
  assert.throws(() => D.addHouseRule(state, slice, CID, { title: "T", text: "x" }, "player"), /DM/);
  const id = D.addHouseRule(
    state,
    slice,
    CID,
    { title: "Pozioni come azione bonus", text: "Bere una pozione da sé costa un’azione bonus." },
    "dm",
    { now: Date.parse("2026-09-24T11:00:00Z") },
  );
  const rule = D.recordOf(slice, CID).houseRules.find((r) => r.id === id);
  const source = D.houseRuleSource(rule);
  assert.equal(source.kind, "house-rule");
  assert.equal(source.authorId, "dm");
  assert.equal(source.decidedAt, "2026-09-24T11:00:00.000Z");
  assert.equal(
    D.recordOf(slice, CID).history.find((h) => h.id === source.decisionId).kind,
    "house-rule",
  );
  assert.ok(!("pages" in source), "a house rule never carries an SRD page");
  assert.throws(
    () =>
      D.addHouseRule(state, slice, CID, { title: "Pozioni come azione bonus", text: "y" }, "dm"),
    /already exists/,
  );
  assert.throws(() => D.retireHouseRule(state, slice, CID, id, " ", "dm"), /reason/);
  D.retireHouseRule(state, slice, CID, id, "Il gruppo preferisce il SRD", "dm");
  assert.ok(D.recordOf(slice, CID).houseRules[0].retiredAt);
  assert.throws(() => D.retireHouseRule(state, slice, CID, id, "again", "dm"), /not found/);
});

test("history corrections restore the previous value with a reason, never a stale one", () => {
  const state = createInitialState();
  state.ext = { ...(state.ext ?? {}), "core-settings": { personal: {}, campaign: {} } };
  const slice = D.seedSlice();
  const change = D.setPlayerTool(state, slice, CID, "players-pointer", false, "dm");
  // One value for every screen: the campaign setting B18 enforces.
  assert.equal(state.ext["core-settings"].campaign["annotations-table.players-pointer"], false);
  assert.equal(D.playerToolAllowed(state, "players-pointer"), false);
  assert.ok(D.canRestore(slice, CID, change, state));
  assert.equal(D.canRestore(slice, CID, change), false, "no settings bag, no correction");
  assert.throws(() => D.restoreHistoryEntry(state, slice, CID, change.id, "", "dm"), /reason/);
  const row = D.restoreHistoryEntry(
    state,
    slice,
    CID,
    change.id,
    "Serve per indicare le trappole",
    "dm",
  );
  assert.equal(D.playerToolAllowed(state, "players-pointer"), true);
  assert.equal(row.correction, true);
  assert.equal(row.revertsId, change.id);
  assert.equal(row.reason, "Serve per indicare le trappole");
  assert.ok(!D.canRestore(slice, CID, change, state));
  assert.equal(D.toolOf("playersPointer").key, "players-pointer", "older rows keep their tool");
  assert.throws(
    () => D.setPlayerTool(state, slice, CID, "players-pointer", false, "player"),
    (e) => e.code === "dm-only",
  );
  assert.throws(() => D.setPlayerTool(state, slice, CID, "fly", false, "dm"), /Unknown tool/);
  assert.throws(
    () => D.restoreHistoryEntry(state, slice, CID, change.id, "x", "dm"),
    /already corrected/,
  );
  // A later change makes an older entry stale.
  const first = D.setSectionHidden(state, slice, CID, "world", true, "dm");
  D.setSectionHidden(state, slice, CID, "world", false, "dm");
  assert.throws(
    () => D.restoreHistoryEntry(state, slice, CID, first.id, "x", "dm"),
    (e) => e.code === "stale",
  );
  assert.throws(
    () => D.setSectionHidden(state, slice, CID, "settings", true, "dm"),
    /always stays on/,
  );
  // Only the latest change of a value is offered for correction, even when an older one
  // happens to end on the current value (a preset counts as a change of each rule).
  const a = D.setRule(state, slice, CID, "enemyHp", "exact", "dm");
  D.applyStandardPreset(state, slice, CID, "dm");
  const c = D.setRule(state, slice, CID, "enemyHp", "exact", "dm");
  assert.equal(D.canRestore(slice, CID, a), false);
  assert.equal(D.canRestore(slice, CID, c), true);
  assert.throws(
    () => D.restoreHistoryEntry(state, slice, CID, a.id, "x", "dm"),
    (e) => e.code === "stale",
  );
});

test("enemy health: SRD Bloodied at half HP or fewer, words, exact or nothing", () => {
  const goblin = { hp: 9, maxHp: 9 };
  assert.equal(D.healthWord(goblin), "unhurt");
  assert.equal(D.healthWord({ hp: 5, maxHp: 9 }), "wounded");
  assert.equal(D.healthWord({ hp: 4, maxHp: 9 }), "bloodied");
  assert.equal(D.healthWord({ hp: 3, maxHp: 6 }), "bloodied", "exactly half is Bloodied");
  assert.equal(D.healthWord({ hp: 0, maxHp: 9 }), "down");
  assert.equal(D.BLOODIED_SOURCE.en.pages[0], 177);
  assert.equal(D.BLOODIED_SOURCE.it.pages[0], 214);
  const policy = { ...D.DEFAULT_POLICY };
  assert.deepEqual(D.enemyHealthFor(policy, { hp: 4, maxHp: 9 }, "it"), {
    mode: "words",
    word: "bloodied",
    text: "Sanguinante",
  });
  assert.equal(
    D.enemyHealthFor({ ...policy, enemyHp: "exact" }, { hp: 4, maxHp: 9 }, "en").text,
    "4/9 HP",
  );
  assert.equal(D.enemyHealthFor({ ...policy, enemyHp: "hidden" }, { hp: 4, maxHp: 9 }), null);
  const state = createInitialState();
  assert.ok(D.isEnemyFor(state, state.actors["goblin-1"], "player"));
  assert.ok(!D.isEnemyFor(state, state.actors.livia, "player"));
  assert.ok(!D.isEnemyFor(state, state.actors["goblin-1"], "dm"), "the DM controls its creatures");
});

test("sheets: the owner withholds DM edits, the DM asks, the owner allows; outsiders refused", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  const livia = state.actors.livia;
  assert.ok(D.playerCharacters(state, CID).some((a) => a.id === "livia"));
  assert.ok(!D.playerCharacters(state, CID).some((a) => a.id === "doran"), "Doran is the DM's");
  assert.ok(
    D.dmMayEdit(D.policyOf(slice, CID), livia),
    "standing authorization by default (I-043)",
  );
  assert.throws(() => D.setDmSheetEdit(state, slice, CID, "livia", false, "dm"), /owner/);
  assert.throws(() => D.requestSheetEdit(state, slice, CID, "livia", "dm"), /already edit/);
  D.setDmSheetEdit(state, slice, CID, "livia", false, "player");
  assert.ok(D.sheetLockedFor(D.policyOf(slice, CID), livia, "dm"));
  assert.ok(!D.sheetLockedFor(D.policyOf(slice, CID), livia, "player"));
  assert.throws(() => D.requestSheetEdit(state, slice, CID, "livia", "player"), /DM/);
  const request = D.requestSheetEdit(state, slice, CID, "livia", "dm");
  assert.throws(() => D.requestSheetEdit(state, slice, CID, "livia", "dm"), /already sent/);
  assert.deepEqual(
    D.pendingSheetRequests(slice, CID, "player", state).map((r) => r.id),
    [request.id],
  );
  assert.equal(D.pendingSheetRequests(slice, CID, "dm", state).length, 0);
  assert.throws(() => D.answerSheetRequest(state, slice, CID, request.id, true, "dm"), /owner/);
  D.answerSheetRequest(state, slice, CID, request.id, true, "player");
  assert.ok(D.dmMayEdit(D.policyOf(slice, CID), livia));
  assert.equal(D.recordOf(slice, CID).sheetRequests[0].status, "granted");
  D.recordSheetTrace(state, slice, CID, {
    actorId: "livia",
    logId: "log-1",
    label: "Valori corretti",
  });
  assert.equal(D.sheetTraceOf(slice, CID, "livia")[0].label, "Valori corretti");
  // Declining keeps the sheet reserved.
  D.setDmSheetEdit(state, slice, CID, "livia", false, "player");
  const second = D.requestSheetEdit(state, slice, CID, "livia", "dm");
  D.answerSheetRequest(state, slice, CID, second.id, false, "player");
  assert.ok(!D.dmMayEdit(D.policyOf(slice, CID), livia));
  assert.equal(D.recordOf(slice, CID).history.at(-1).kind, "sheet-declined");
});

test("sources: SRD 5.2.1 available, campaign homebrew shared with a count, legacy blocked", () => {
  const state = createInitialState();
  state.campaign.enabledContent = [{ contentId: "a", revisionId: "r1" }];
  const rows = D.sourceStates(state, D.policyOf(D.seedSlice(), CID));
  assert.deepEqual(
    rows.map((r) => [r.id, r.status]),
    [
      ["srd-5.2.1", "available"],
      ["campaign-homebrew", "shared"],
      ["legacy-2014", "blocked"],
    ],
  );
  assert.equal(rows[1].count, 1);
  assert.match(rows[2].locked.it, /regole 2024/);
});

test("defaults: impact count, apply to existing through the token menu, new creatures later", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  const tokens = { tokens: {}, groups: {}, names: {} };
  const preview = D.previewCreatureDefaults(state, tokens, "dm");
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  const sample = ["goblin-1", "goblin-2", "goblin-warrior-a", "goblin-warrior-b"];
  assert.deepEqual(
    preview.changes.map((c) => c.actorId),
    sample,
  );
  assert.equal(preview.scenes, 2);
  D.setCreatureNameDefault(state, slice, CID, "dm", "dm");
  assert.deepEqual(D.recordOf(slice, CID).considered, sample);
  assert.equal(
    D.pendingNewCreatures(state, slice, tokens, CID).length,
    0,
    "existing ones wait for Apply",
  );
  const row = D.applyCreatureDefaults(state, slice, tokens, CID, "dm", setNameHidden, {
    lang: "it",
  });
  assert.equal(row.count, 4);
  assert.ok(tokens.names["goblin-1"].hidden);
  assert.equal(tokens.names["goblin-1"].trueName, "Sentinella");
  assert.match(state.actors["goblin-1"].name, /^Creatura sconosciuta/);
  assert.throws(
    () => D.applyCreatureDefaults(state, slice, tokens, CID, "dm", setNameHidden),
    /No creature to change/,
  );
  // A creature added afterwards follows the default.
  state.actors["goblin-3"] = {
    ...structuredClone(state.actors["goblin-2"]),
    id: "goblin-3",
    name: "Arciere",
  };
  state.scenes[0].tokens.push({ id: "token-goblin-3", actorId: "goblin-3", x: 500, y: 200 });
  assert.deepEqual(
    D.pendingNewCreatures(state, slice, tokens, CID).map((a) => a.id),
    ["goblin-3"],
  );
  assert.deepEqual(D.hideNewCreatures(state, slice, tokens, CID, setNameHidden), ["goblin-3"]);
  assert.equal(tokens.names["goblin-3"].trueName, "Arciere");
  // Back to "everyone": the preview shows the real names that will be shown again.
  assert.deepEqual(
    D.previewCreatureDefaults(state, tokens, "everyone").changes.map((c) => c.name),
    ["Sentinella", "Esploratore", "Goblin guerriero A", "Goblin guerriero B", "Arciere"],
  );
});

test("view as: only what both can read; DM private notes and Doran's plan stay out", () => {
  const state = createInitialState();
  const slice = D.seedSlice();
  addEntry(state, "dm", {
    id: "dm-secret",
    title: "Il faro è una trappola",
    body: "Solo per me.",
    access: { mode: "private", grants: [] },
  });
  addEntry(state, "dm", {
    id: "dm-shared",
    kind: "world",
    title: "Il vecchio osservatorio",
    body: "Tutti lo conoscono.",
    access: { mode: "campaign", grants: [] },
  });
  addEntry(state, "player", {
    id: "livia-own",
    title: "Sospetti di Livia",
    body: "Privato.",
    access: { mode: "private", grants: [] },
  });
  state.actors.doran.personalPlans = { dm: "Doran tradirà il gruppo al livello 5." };
  assert.throws(() => D.projectViewAs(state, slice, CID, "player", "player"), /Only the DM/);
  assert.throws(() => D.projectViewAs(state, slice, CID, "dm", "dm"), /unavailable/);
  const view = D.projectViewAs(state, slice, CID, "player", "dm");
  const titles = view.entries.map((e) => e.title);
  assert.ok(titles.includes("Il vecchio osservatorio"));
  assert.ok(!titles.includes("Il faro è una trappola"), "DM Only-me note invisible to Livia");
  assert.ok(
    !titles.includes("Sospetti di Livia"),
    "Livia's own private note is not shown to the DM",
  );
  assert.equal(view.hiddenFromMember.ownNotes, 1);
  assert.deepEqual(
    view.hiddenFromMember.privatePlans.map((p) => p.name),
    ["Doran"],
  );
  assert.ok(!JSON.stringify(view).includes("tradirà"), "the plan text never appears");
  assert.ok(view.characters.some((c) => c.id === "livia" && c.controlled));
  assert.ok(!view.characters.some((c) => c.id === "goblin-1"), "players do not read DM creatures");
  assert.deepEqual(
    view.enemies.map((e) => e.health.text),
    ["Illeso", "Illeso"],
  );
  // A member's private personal sheet is never revealed to the DM through "view as".
  state.actors.secret = {
    ...structuredClone(state.actors.livia),
    id: "secret",
    name: "Scheda privata",
    visibility: "private",
    campaignIds: [],
  };
  const again = D.projectViewAs(state, slice, CID, "player", "dm");
  assert.ok(!again.characters.some((c) => c.id === "secret"));
  // In the DM's language, with the name the member reads (the UI passes the alias).
  const en = D.projectViewAs(state, slice, CID, "player", "dm", {
    lang: "en",
    nameOf: (actor) => (actor.id === "goblin-1" ? "Unknown creature 1" : actor.name),
  });
  assert.ok(en.enemies.some((e) => e.name === "Unknown creature 1" && e.health.text === "Unhurt"));
  assert.ok(!JSON.stringify(en.enemies).includes("Sentinella"));
  assert.ok(Array.isArray(en.sessions));
  // One entry as the member reads it: only entries (and sections) both can read.
  const entry = D.viewAsEntry(state, CID, "player", "dm", "entry-dm-shared");
  assert.equal(entry.title, "Il vecchio osservatorio");
  assert.equal(entry.body, "Tutti lo conoscono.");
  for (const id of ["entry-dm-secret", "entry-livia-own", "nope"])
    assert.throws(
      () => D.viewAsEntry(state, CID, "player", "dm", id),
      (e) => e.code === "missing",
    );
  assert.throws(
    () => D.viewAsEntry(state, CID, "player", "player", "entry-dm-shared"),
    /Only the DM/,
  );
});

// ---------------------------------------------------------------- consumers

test("players' tools: one source of truth with B18; chip, rules page and history agree", () => {
  const h = harness({ role: "dm", view: { page: "campaign", tab: "settings", id: "permissions" } });
  let html = UI.renderSettings(h.ctx);
  // The D&D Beyond Game Settings panel: the three B18 switches plus the fixed rows.
  for (const key of ["players-pointer", "players-draw", "players-templates"])
    assert.match(html, new RegExp(`data-cs-tool="${key}" checked`));
  // P10 CA-61: moving the DM's creatures and locking tokens are switches, not fixed rows.
  assert.match(html, /data-cs-permission="dmCreatures"[\s\S]*data-cs-permission="playerLock"/);
  assert.doesNotMatch(html, /data-cs-fixed-tools/);
  assert.match(html, /bloccare e sbloccare le proprie pedine/);
  const root = mount(html);
  UI.bindCampaignSettings(root, h.ctx);
  const toggle = one(root, '[data-cs-tool="players-pointer"]');
  toggle.checked = false;
  toggle.fire("change");
  // The same value B18 enforces (registry campaign setting), not a second copy.
  assert.equal(h.registry.getSetting(h.ctx, "annotations-table.players-pointer"), false);
  assert.equal(annotationPermissions(h.ctx).playersPointer, false);
  const again = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(again, h.ctx);
  const moved = one(again, '[data-cs-tool="players-pointer"]');
  assert.ok(moved.focused, "focus returns to the switch after re-render");
  assert.ok(!moved.checked);
  h.ctx.view = { page: "table", id: "", tab: "" };
  h.ctx.role = "player";
  resetTableView();
  html = renderTable(h.ctx);
  assert.match(html, /data-tool="pointer" aria-disabled="true"[^>]*disattivato dal DM/);
  assert.match(UI.renderRulesPage(h.ctx), /data-cs-read-tool="players-pointer"[\s\S]*?Disattivato/);
  h.ctx.role = "dm";
  html = renderTable(h.ctx);
  assert.doesNotMatch(html, /data-tool="pointer" aria-disabled/, "the DM keeps the pointer");
  // The other way round: B18's own switch (its drawer or Preferences) changes the same
  // value; the Table chip, "Table rules" and this area's History follow it.
  h.registry.setSetting(h.ctx, "annotations-table.players-draw", false);
  assert.equal(D.playerToolAllowed(h.ctx.state, "players-draw"), false);
  assert.deepEqual(
    D.recordOf(h.slice(), CID)
      .history.filter((row) => row.kind === "permission")
      .map((row) => [row.key, row.from, row.to, row.by]),
    [
      ["players-pointer", true, false, "dm"],
      ["players-draw", true, false, "dm"],
    ],
  );
  h.ctx.role = "player";
  assert.match(
    UI.renderRulesPage(h.ctx),
    /data-cs-read-tool="players-draw"><dt>Disegni dei giocatori<\/dt><dd><strong>Disattivato dal DM/,
  );
  assert.match(renderTable(h.ctx), /data-tool="annotations-draw" aria-disabled="true"/);
  // Without the annotations area there is nothing to switch, and the page says so.
  const bare = harness({
    annotations: false,
    view: { page: "campaign", tab: "settings", id: "permissions" },
  });
  assert.match(UI.renderSettings(bare.ctx), /data-cs-tools-missing/);
  assert.doesNotMatch(UI.renderSettings(bare.ctx), /data-cs-tool=/);
});

test("Table consumer: enemy health under the token and in the inspector follows the rule", () => {
  const h = harness({ role: "player", view: { page: "table", id: "", tab: "" } });
  h.ctx.commit("damage", (s) => (s.actors["goblin-2"].hp = 4));
  const tableView = { scene: h.ctx.state.scenes[0], selectedActorId: "goblin-2" };
  assert.match(UI.healthLayer(h.ctx, tableView), /data-cs-health="goblin-2"[\s\S]*Sanguinante/);
  assert.match(UI.healthPanel(h.ctx, tableView), /Sanguinante/);
  h.ctx.role = "dm";
  h.ctx.commit("rule", (s) =>
    D.setRule(s, h.registry.slice(s, D.ID), CID, "enemyHp", "exact", "dm"),
  );
  assert.equal(UI.healthLayer(h.ctx, tableView), "", "no pills on the DM's map");
  assert.match(UI.healthPanel(h.ctx, tableView), /I giocatori vedono: <strong>4\/9 PF/);
  h.ctx.role = "player";
  assert.match(UI.healthLayer(h.ctx, tableView), /4\/9 PF/);
  h.ctx.role = "dm";
  h.ctx.commit("rule", (s) =>
    D.setRule(s, h.registry.slice(s, D.ID), CID, "enemyHp", "hidden", "dm"),
  );
  h.ctx.role = "player";
  assert.equal(UI.healthLayer(h.ctx, tableView), "");
  assert.match(UI.healthPanel(h.ctx, tableView), /tiene nascosta/);
  // A hidden token never gets a pill.
  h.ctx.role = "dm";
  h.ctx.commit("rule", (s) =>
    D.setRule(s, h.registry.slice(s, D.ID), CID, "enemyHp", "words", "dm"),
  );
  h.ctx.commit(
    "hide",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true),
  );
  h.ctx.role = "player";
  const fresh = { scene: h.ctx.state.scenes[0], selectedActorId: "goblin-1" };
  assert.doesNotMatch(UI.healthLayer(h.ctx, fresh), /goblin-2/);
  assert.match(UI.healthLayer(h.ctx, fresh), /goblin-1/);
});

test("builder consumer: legacy source blocked in this campaign; multiclassing house rule", () => {
  const h = harness({ role: "player", view: { page: "builder", id: "", tab: "" } });
  const ctx = h.ctx;
  ctx.navigate = (page, params = {}) => {
    ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
  };
  startCharacterBuilder(ctx, { kind: "create" });
  ctx.view = { ...ctx.view, tab: "sources" };
  let html = renderCharacterBuilder(ctx);
  assert.match(html, /data-builder-source-blocked="legacy-2014"/);
  assert.match(
    html,
    /Contenuti legacy 2014 \(SRD 5\.1\)<\/label> <strong>bloccata in questa campagna/,
  );
  ctx.view = { ...ctx.view, tab: "class" };
  html = renderCharacterBuilder(ctx);
  assert.doesNotMatch(html, /data-builder-add-class disabled/);
  // A campaign that forbids multiclassing (set before its start) disables "Add class".
  const record = h.slice().campaigns[CID];
  ctx.role = "dm";
  ctx.commit("unstarted", (s) => (h.registry.slice(s, D.ID).campaigns[CID].startedAt = null));
  ctx.commit("rule", (s) =>
    D.setRule(s, h.registry.slice(s, D.ID), CID, "multiclass", "forbidden", "dm"),
  );
  assert.ok(record, "record exists");
  ctx.role = "player";
  html = renderCharacterBuilder(ctx);
  assert.match(html, /data-builder-add-class disabled aria-describedby="builder-multiclass-lock"/);
  assert.match(html, /Multiclasse non consentito in questa campagna/);
});

test("combat consumer: assisted keeps damage on the card until Apply; automatic applies at once", () => {
  const fixture = () => {
    const state = createInitialState();
    state.combat.active = true;
    const scene = state.scenes[0];
    Object.assign(
      scene.tokens.find((t) => t.actorId === "livia"),
      { x: 100, y: 100 },
    );
    Object.assign(
      scene.tokens.find((t) => t.actorId === "goblin-1"),
      { x: 140, y: 100 },
    );
    for (const actor of Object.values(state.actors)) {
      actor.hp = 40;
      actor.maxHp = 40;
    }
    return state;
  };
  const attack = (state, applyMode) => {
    const attempt = beginAttempt(
      state,
      {
        id: "a-" + (applyMode ?? "auto"),
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
        applyMode,
      },
      "player",
    );
    resolveRoll(
      state,
      attempt.id,
      attempt.requests.find((r) => r.kind === "attack").id,
      [20],
      "player",
    );
    resolveRoll(
      state,
      attempt.id,
      attempt.requests.find((r) => r.kind === "damage").id,
      [3, 4],
      "player",
    );
    return attempt;
  };
  const automatic = fixture();
  attack(automatic);
  assert.equal(automatic.actors["goblin-1"].hp, 33);
  assert.equal(automatic.combatAttempts[0].outcomes[0].status, "applied");

  const assisted = fixture();
  const attempt = attack(assisted, "assisted");
  const outcome = assisted.combatAttempts[0].outcomes[0];
  assert.equal(assisted.actors["goblin-1"].hp, 40, "nothing changes before Apply");
  assert.equal(outcome.status, "ready");
  assert.equal(outcome.damage, 7);
  assert.equal(outcome.critical, true);
  assert.equal(assisted.combatAttempts[0].status, "resolved");
  const seen = projectAttempts(assisted, "player")[0];
  assert.equal(seen.outcomes[0].status, "ready");
  assert.ok(!("pendingApplications" in seen), "the pending application is never projected");
  // Whoever controls the target applies it (dnd5e FVT-138): the DM for the goblin, never
  // the attacking player.
  assert.throws(
    () => applyReadyOutcome(assisted, attempt.id, "goblin-1", "player"),
    /Whoever controls the target/,
  );
  assert.deepEqual(
    D.readyApplications(assisted, "dm").map((row) => [row.actorId, row.damage]),
    [["goblin-1", 7]],
  );
  assert.deepEqual(D.readyApplications(assisted, "player"), [], "nothing for the attacker");
  applyReadyOutcome(assisted, attempt.id, "goblin-1", "dm");
  assert.equal(assisted.actors["goblin-1"].hp, 33);
  assert.equal(outcome.status, "applied");
  assert.throws(
    () => applyReadyOutcome(assisted, attempt.id, "goblin-1", "dm"),
    /nothing to apply/,
  );
  assert.deepEqual(D.readyApplications(assisted, "dm"), []);
});

// ---------------------------------------------------------------- registry, UI and handlers

test("registry: settings replace the core placeholder for the DM; rules page for everyone", () => {
  const h = harness();
  const ctx = h.ctx;
  assert.equal(h.registry.get("campaign-section", "settings", ctx).extension, "campaign-settings");
  assert.ok(h.registry.get("campaign-section", "campaign-settings-rules", ctx));
  assert.equal(
    h.registry.get("campaign-section", "campaign-settings-view", ctx),
    null,
    "only while viewing as",
  );
  ctx.role = "player";
  assert.equal(h.registry.get("campaign-section", "settings", ctx), null);
  assert.ok(h.registry.get("campaign-section", "campaign-settings-rules", ctx));
  const page = UI.renderRulesPage(ctx);
  assert.match(page, /Regole della tavola/);
  assert.match(page, /bloccata in questa campagna|Bloccata in questa campagna/);
  assert.doesNotMatch(page, /data-cs-rule-input/, "players only read");
  assert.match(UI.renderSettings(ctx), /riservate al DM/);
  ctx.lang = "en";
  ctx.role = "dm";
  assert.match(
    UI.renderSettings(ctx),
    /Campaign settings[\s\S]*Rules[\s\S]*Permissions[\s\S]*History/,
  );
});

test("rules tab handlers: a switch commits once and persists; locked options are disabled", () => {
  const h = harness();
  const root = mount(UI.renderSettings(h.ctx));
  const locked = root.querySelectorAll('[data-cs-rule-input="multiclass"]');
  assert.ok(locked.length === 2 && locked.every((node) => "disabled" in node.attrs));
  UI.bindCampaignSettings(root, h.ctx);
  const assisted = one(root, '[data-cs-rule-input="automation"][value="assisted"]');
  assisted.fire("change");
  assert.equal(h.policy().automation, "assisted");
  assert.equal(
    h.store().history.length,
    0,
    "settings are corrected from History, not by game Undo",
  );
  h.reload();
  assert.equal(h.policy().automation, "assisted", "reload keeps it");
  // House rule form: refusal keeps nothing; a valid rule shows source, author and date.
  const form = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(form, h.ctx);
  form.querySelector("[name=title]").value = "Pozioni come azione bonus";
  form.querySelector("[name=text]").value = "";
  one(form, "[data-cs-house-form]").fire("submit");
  assert.ok(h.toasts.at(-1).error);
  form.querySelector("[name=text]").value = "Bere una pozione da sé costa un’azione bonus.";
  one(form, "[data-cs-house-form]").fire("submit");
  const html = UI.renderRulesPage(h.ctx);
  assert.match(html, /Pozioni come azione bonus/);
  assert.match(html, /regola della casa · decisa da DM · \d+ \p{L}+ \d{4}/u);
  // Offline: the shared change is refused with a message, nothing changes. Enemy health
  // lives in «Cosa vedono i giocatori» (P10 CA-71).
  h.ctx.offline = true;
  h.ctx.view = { page: "campaign", tab: "settings", id: "disclosure" };
  const again = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(again, h.ctx);
  one(again, '[data-cs-rule-input="enemyHp"][value="hidden"]').fire("change");
  assert.equal(h.policy().enemyHp, "words");
  assert.match(h.toasts.at(-1).text, /senza rete/);
});

test("history tab: restore opens a dialog that needs a reason and records a correction", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "history" } });
  h.ctx.commit(
    "x",
    (s) => D.setPlayerTool(s, h.registry.slice(s, D.ID), CID, "players-pointer", false, "dm"),
    { undoable: false },
  );
  const root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  one(root, "[data-cs-restore]").fire();
  const dialog = h.dialogs.at(-1);
  assert.throws(
    () => dialog.options.onSubmit(new Map([["reason", ""]])),
    (e) => /motivo/i.test(e.it),
  );
  dialog.options.onSubmit(new Map([["reason", "Serve per le trappole"]]));
  assert.equal(D.playerToolAllowed(h.ctx.state, "players-pointer"), true);
  const html = UI.renderSettings(h.ctx);
  assert.match(html, /correzione · motivo: Serve per le trappole/);
});

test("sections tab: a section turned off is hidden and an old link lands on the overview", async () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "sections" } });
  const root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  const world = one(root, '[data-cs-section="world"]');
  world.checked = false;
  world.fire("change");
  assert.deepEqual(h.policy().hiddenSections, ["world"]);
  h.ctx.role = "player";
  h.ctx.navigate("campaign", { tab: "world" });
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "overview" });
  assert.match(h.toasts.at(-1).text, /disattivata/);
});

test("review P2: sections turned off leave the overview and the palette, not only the sidebar", () => {
  const h = harness({ role: "dm" });
  for (const id of ["journal", "world", "sessions"])
    h.ctx.commit("off", (s) =>
      D.setSectionHidden(s, h.registry.slice(s, D.ID), CID, id, true, "dm"),
    );
  h.ctx.role = "player";
  h.ctx.view = { page: "campaign", id: "", tab: "overview" };
  const html = renderCampaign(h.ctx);
  assert.match(html, /Panoramica/);
  for (const gone of [
    "Dove eravamo rimasti",
    "Leggi il resoconto",
    "Apri Diario",
    "Apri Sessioni",
    "Il prossimo appuntamento",
    "Esplora il mondo",
  ])
    assert.ok(!html.includes(gone), "overview still shows " + gone);
  assert.match(html, /Personaggi del gruppo/, "sections still on stay");
  const keys = pageEntries(h.ctx).map((entry) => entry.key);
  assert.ok(keys.includes("campaign.group"));
  for (const id of ["journal", "world", "sessions"])
    assert.ok(!keys.includes("campaign." + id), "palette still offers " + id);
  // The players' safety tools are an owner decision: they cannot be switched off here.
  h.ctx.role = "dm";
  assert.throws(
    () =>
      h.ctx.commit("x", (s) =>
        D.setSectionHidden(s, h.registry.slice(s, D.ID), CID, "safety", true, "dm"),
      ),
    /always stays on/,
  );
});

test("review P2: an offline refusal draws the stored value again, focus kept on the control", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "disclosure" } });
  let renders = 0;
  h.ctx.render = () => renders++;
  h.ctx.offline = true;
  let root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  const exact = one(root, '[data-cs-rule-input="enemyHp"][value="exact"]');
  exact.checked = true;
  exact.fire("change");
  assert.equal(h.policy().enemyHp, "words", "nothing stored offline");
  assert.equal(renders, 1, "the page is drawn again from the stored policy");
  assert.equal(h.toasts.at(-1).error, true);
  assert.match(h.toasts.at(-1).text, /senza rete/);
  root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  assert.ok(one(root, '[data-cs-rule-input="enemyHp"][value="words"]').checked);
  assert.ok(!one(root, '[data-cs-rule-input="enemyHp"][value="exact"]').checked);
  assert.ok(one(root, '[data-cs-rule-input="enemyHp"][value="exact"]').focused, "focus kept");
  h.ctx.view = { page: "campaign", tab: "settings", id: "permissions" };
  root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  const tool = one(root, '[data-cs-tool="players-pointer"]');
  tool.checked = false;
  tool.fire("change");
  assert.equal(D.playerToolAllowed(h.ctx.state, "players-pointer"), true);
  assert.ok(one(mount(UI.renderSettings(h.ctx)), '[data-cs-tool="players-pointer"]').checked);
});

test("review P2: the sheet trace names the sheet a commit changed, never a roll or another actor", () => {
  const h = harness({ role: "dm", view: { page: "characters", id: "goblin-1", tab: "actions" } });
  const trace = (id) => D.sheetTraceOf(h.slice(), CID, id);
  // (a) Damage to the goblin on its own page, then Undo from Livia's page: no Livia trace.
  h.ctx.navigate("characters", { id: "goblin-1", tab: "actions" });
  h.ctx.commit("Danno registrato", (s) => (s.actors["goblin-1"].hp -= 1));
  h.ctx.navigate("characters", { id: "livia", tab: "actions" });
  UI.renderSheetAccess(h.ctx, h.ctx.state.actors.livia);
  h.ctx.undo();
  assert.equal(h.ctx.state.actors["goblin-1"].hp, 7);
  assert.deepEqual(trace("livia"), [], "undoing the goblin's damage is not a Livia edit");
  // (b) A roll-only commit on Livia's page (log and attempts, not her sheet): no trace.
  h.ctx.commit("Prova: Destrezza", (s) => {
    s.combatAttempts = [...(s.combatAttempts ?? []), { id: "roll-only", outcomes: [] }];
  });
  // The sheet's own check roll (characters.mjs stores its result as `lastCheck`).
  h.ctx.commit("Prova: Destrezza · 15 +2 = 17", (s) => {
    s.actors.livia.lastCheck = { face: 15, modifier: 2, total: 17, mode: "digital" };
  });
  assert.deepEqual(trace("livia"), []);
  // (c) A change of another player's sheet (Mira) made from Livia's page is traced on
  // Mira's sheet only; a DM character (Doran) is never a player sheet.
  h.ctx.commit("Mira ferita", (s) => (s.actors.mira.hp -= 1));
  h.ctx.commit("Doran ferito", (s) => (s.actors.doran.hp -= 1));
  assert.deepEqual(trace("livia"), []);
  assert.deepEqual(trace("doran"), []);
  assert.deepEqual(
    trace("mira").map((row) => row.label),
    ["Mira ferita"],
  );
  // (d) Livia's own sheet data: traced on hers, authorized.
  h.ctx.commit("Valori corretti", (s) => (s.actors.livia.ac = 13));
  assert.deepEqual(
    trace("livia").map((row) => [row.label, row.authorized]),
    [["Valori corretti", true]],
  );
  // A trace written without authorization (never through the guarded shell, but kept by
  // the data model) says so to the player.
  h.ctx.commit(
    "t",
    (s) =>
      D.recordSheetTrace(s, h.registry.slice(s, D.ID), CID, {
        actorId: "livia",
        label: "Danno registrato",
        authorized: false,
      }),
    { undoable: false },
  );
  h.ctx.role = "player";
  assert.match(
    UI.renderSheetAccess(h.ctx, h.ctx.state.actors.livia),
    /Danno registrato<\/strong><small>[^<]*· DM · <strong class="cs-unauthorized">senza autorizzazione/,
  );
});

test("review P1: a reserved sheet is read-only for the DM on the sheet page, with the reason", () => {
  const h = harness({ role: "player", view: { page: "characters", id: "livia", tab: "actions" } });
  const livia = () => h.ctx.state.actors.livia;
  h.ctx.commit("off", (s) =>
    D.setDmSheetEdit(s, h.registry.slice(s, D.ID), CID, "livia", false, "player"),
  );
  h.ctx.role = "dm";
  const html = UI.renderSheetAccess(h.ctx, livia());
  assert.match(
    html,
    /da questa pagina puoi solo consultarla \(valori, danni, condizioni, risorse, inventario\)/,
  );
  assert.match(html, /Al Tavolo, durante il gioco, applichi comunque danni e condizioni/);
  assert.match(html, /data-cs-ask="livia"/);
  h.ctx.role = "player";
  assert.match(
    UI.renderSheetAccess(h.ctx, livia()),
    /al Tavolo applica comunque danni e condizioni/,
  );
});

test("review P2: assisted damage waits for the target's controller; the DM sees «Da applicare»", () => {
  const h = harness({ role: "player", view: { page: "table", id: "", tab: "" } });
  const ctx = h.ctx;
  ctx.commit("setup", (s) => {
    s.combat.active = true;
    const scene = s.scenes[0];
    Object.assign(
      scene.tokens.find((t) => t.actorId === "livia"),
      { x: 100, y: 100 },
    );
    Object.assign(
      scene.tokens.find((t) => t.actorId === "goblin-1"),
      { x: 140, y: 100 },
    );
    for (const actor of Object.values(s.actors)) {
      actor.hp = 40;
      actor.maxHp = 40;
    }
  });
  ctx.commit("attack", (s) => {
    const attempt = beginAttempt(
      s,
      {
        id: "assisted-1",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
        applyMode: "assisted",
      },
      "player",
    );
    resolveRoll(
      s,
      attempt.id,
      attempt.requests.find((r) => r.kind === "attack").id,
      [15],
      "player",
    );
    resolveRoll(s, attempt.id, attempt.requests.find((r) => r.kind === "damage").id, [4], "player");
  });
  assert.equal(ctx.state.actors["goblin-1"].hp, 40);
  const tableView = { scene: ctx.state.scenes[0], selectedActorId: "livia" };
  const ready = () =>
    h.registry.list("table-panel", ctx, tableView).some((c) => c.id === "campaign-settings-ready");
  assert.equal(ready(), false, "not the attacking player's to apply");
  assert.equal(
    h.registry.notifications(ctx).filter((n) => n.source === "campaign-settings-ready").length,
    0,
  );
  // The player ends the turn with damage still waiting: a reminder, not a block.
  h.registry.emit("turn-end", { actorId: "livia", round: 1, correction: false });
  assert.match(h.toasts.at(-1).text, /Danni ancora da applicare/);
  assert.equal(UI.readyLayer(ctx, tableView), "", "no pill for the attacker");
  ctx.role = "dm";
  assert.equal(ready(), true);
  assert.match(
    UI.readyLayer(ctx, tableView),
    /data-cs-ready-pill="goblin-1"[\s\S]*\d+ da applicare/,
  );
  const notices = h.registry
    .notifications(ctx)
    .filter((n) => n.source === "campaign-settings-ready");
  assert.equal(notices.length, 1);
  assert.match(notices[0].title.it, /Da applicare: \d+ danni a Sentinella/);
  assert.deepEqual(notices[0].target, { page: "table", params: {} });
  const root = mount(UI.readyPanel(ctx));
  UI.bindCampaignSettings(root, ctx);
  one(root, '[data-cs-apply-ready="goblin-1"]').fire();
  assert.ok(ctx.state.actors["goblin-1"].hp < 40, "the DM's Apply applies the damage");
  assert.equal(ctx.state.log.at(-1).label.startsWith("Danni applicati"), true);
  assert.equal(ready(), false);
  // The same Undo as the card: the identity's own last change.
  ctx.undo();
  assert.equal(ctx.state.actors["goblin-1"].hp, 40);
  assert.equal(ready(), true);
});

test("review P3: one new creature reads in the singular in the follow-up label", () => {
  const h = harness({ role: "dm", view: { page: "campaign", tab: "settings", id: "defaults" } });
  h.ctx.commit(
    "default",
    (s) => D.setCreatureNameDefault(s, h.registry.slice(s, D.ID), CID, "dm", "dm"),
    { undoable: false },
  );
  h.ctx.commit("Nuova creatura", (s) => {
    s.actors["goblin-3"] = {
      ...structuredClone(s.actors["goblin-1"]),
      id: "goblin-3",
      name: "Vedetta",
    };
    s.scenes[0].tokens.push({ id: "t-goblin-3", actorId: "goblin-3", x: 300, y: 300 });
  });
  assert.match(
    h.ctx.state.log.at(-1).label,
    /Predefinito della campagna: nome nascosto per 1 nuova creatura$/,
  );
});

test("defaults tab: impact count in the dialog, Apply hides the names, Undo restores them", () => {
  // P10 CA-71: the creature-name default sits in «Cosa vedono i giocatori».
  const h = harness({ view: { page: "campaign", tab: "settings", id: "disclosure" } });
  let root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  one(root, '[data-cs-default-input][value="dm"]').fire("change");
  assert.equal(h.policy().creatureName, "dm");
  root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  one(root, "[data-cs-apply-defaults]").fire();
  const dialog = h.dialogs.at(-1);
  // R4 sample data (27/09/2026): two goblin warriors on the ambush scene.
  assert.match(
    dialog.body,
    /4 creature cambieranno<\/strong> su 2 scene: Sentinella, Esploratore, Goblin guerriero A, Goblin guerriero B/,
  );
  dialog.options.onSubmit(new Map([["creature-name", "on"]]));
  assert.match(h.ctx.state.actors["goblin-1"].name, /Creatura sconosciuta/);
  root = mount(UI.renderSettings(h.ctx));
  UI.bindCampaignSettings(root, h.ctx);
  one(root, "[data-cs-undo-apply]").fire();
  assert.equal(h.ctx.state.actors["goblin-1"].name, "Sentinella");
  assert.equal(h.ctx.state.ext["token-menu"].names["goblin-1"], undefined);
  const last = h.slice().campaigns[CID].history.at(-1);
  assert.ok(
    last.kind === "apply-defaults"
      ? last.undoneAt
      : h.slice().campaigns[CID].history.find((r) => r.kind === "apply-defaults").undoneAt,
  );
  // A new DM creature added later follows the default through the follow-up commit.
  h.ctx.commit("Nuova creatura", (s) => {
    s.actors["goblin-3"] = {
      ...structuredClone(s.actors["goblin-2"]),
      id: "goblin-3",
      name: "Arciere",
    };
    s.scenes[0].tokens.push({ id: "token-goblin-3", actorId: "goblin-3", x: 500, y: 200 });
  });
  assert.match(h.ctx.state.actors["goblin-3"].name, /Creatura sconosciuta/);
  assert.equal(h.ctx.state.ext["token-menu"].names["goblin-3"].trueName, "Arciere");
});

test("sheet access: DM asks, player is notified and allows, DM edits are traced on the sheet", () => {
  const h = harness({ role: "player", view: { page: "characters", id: "livia", tab: "actions" } });
  const livia = () => h.ctx.state.actors.livia;
  assert.ok(
    h.registry
      .list("sheet-section", h.ctx, livia())
      .some((c) => c.id === "campaign-settings-access"),
  );
  assert.ok(
    !h.registry.list("sheet-section", h.ctx, h.ctx.state.actors.doran).length,
    "not on DM sheets",
  );
  let root = mount(UI.renderSheetAccess(h.ctx, livia()));
  UI.bindCampaignSettings(root, h.ctx);
  const allow = one(root, '[data-cs-sheet-allow="livia"]');
  allow.checked = false;
  allow.fire("change");
  assert.equal(h.policy().dmSheetEdit.livia, false);
  h.ctx.role = "dm";
  root = mount(UI.renderSheetAccess(h.ctx, livia()));
  assert.match(UI.renderSheetAccess(h.ctx, livia()), /Modifica riservata a chi gioca Livia/);
  UI.bindCampaignSettings(root, h.ctx);
  one(root, '[data-cs-ask="livia"]').fire();
  assert.match(UI.renderSheetAccess(h.ctx, livia()), /Richiesta inviata il/);
  h.ctx.role = "player";
  const notices = h.registry.notifications(h.ctx);
  assert.equal(notices.length, 1);
  assert.deepEqual(notices[0].target, {
    page: "characters",
    params: { id: "livia", tab: "actions" },
  });
  root = mount(UI.renderSheetAccess(h.ctx, livia()));
  UI.bindCampaignSettings(root, h.ctx);
  one(root, "[data-cs-grant]").fire();
  assert.equal(h.policy().dmSheetEdit.livia, undefined);
  assert.equal(h.registry.notifications(h.ctx).length, 0);
  // The DM edits on Livia's sheet page: the follow-up commit records the trace.
  h.ctx.role = "dm";
  h.ctx.commit("Valori corretti", (s) => (s.actors.livia.ac = 13));
  const trace = D.sheetTraceOf(h.slice(), CID, "livia");
  assert.equal(trace.length, 1);
  assert.equal(trace[0].label, "Valori corretti");
  assert.match(h.ctx.state.log.at(-1).label, /Traccia: modifica del DM sulla scheda di Livia/);
  h.ctx.role = "player";
  assert.match(UI.renderSheetAccess(h.ctx, livia()), /data-cs-trace[\s\S]*Valori corretti/);
  // A personal ("Only me") DM plan on the same page is not a sheet edit.
  h.ctx.role = "dm";
  h.ctx.commit("Piano", (s) => (s.actors.livia.personalPlans = { dm: "x" }), {
    local: true,
    visibility: "private",
  });
  assert.equal(D.sheetTraceOf(h.slice(), CID, "livia").length, 1);
});

test("view as: real member pages with the banner on each, entries open, private content out", () => {
  const h = harness({ view: { page: "campaign", tab: "settings", id: "permissions" } });
  const ctx = h.ctx;
  ctx.commit("secret", (s) =>
    addEntry(s, "dm", {
      id: "dm-secret",
      title: "Il faro è una trappola",
      body: "Solo io.",
      access: { mode: "private", grants: [] },
    }),
  );
  ctx.commit("shared recap", (s) =>
    addEntry(s, "dm", {
      id: "dm-recap",
      kind: "recap",
      title: "La notte al guado",
      body: "Il gruppo ha attraversato il guado.",
      access: { mode: "campaign", grants: [] },
    }),
  );
  ctx.commit("hide world", (s) =>
    D.setSectionHidden(s, h.registry.slice(s, D.ID), CID, "world", true, "dm"),
  );
  const root = mount(UI.renderSettings(ctx));
  UI.bindCampaignSettings(root, ctx);
  one(root, '[data-cs-view-as="player"]').fire();
  assert.equal(UI.viewAsMember(), "player");
  // The member travels in the route: every page of the view keeps it (and a reload too).
  assert.deepEqual(h.navigations.at(-1), {
    page: "campaign",
    tab: "campaign-settings-view",
    id: "player/overview",
  });
  assert.ok(h.registry.get("campaign-section", "campaign-settings-view", ctx));
  let html = UI.renderViewAs(ctx);
  assert.match(html, /Stai vedendo la campagna come Livia/);
  assert.match(html, /Torna al mio utente/);
  assert.match(html, /data-token-menu-raw/, "the DM's name projection never rewrites the view");
  assert.doesNotMatch(html, /Il faro è una trappola/);
  assert.match(html, /1 tuoi contenuti privati/);
  const sections = html.match(/data-cs-va-sections>[\s\S]*?<\/nav>/)[0];
  assert.match(sections, /data-cs-va-go="journal"/);
  assert.doesNotMatch(sections, /data-cs-va-go="world"|Impostazioni/, "hidden section left out");
  assert.doesNotMatch(html, /Esplora il mondo/);
  // Sections open as the member reads them; entries open too (Kanka SVC-040).
  let view = mount(html);
  UI.bindCampaignSettings(view, ctx);
  one(view, '[data-cs-va-go="journal"]').fire();
  assert.equal(ctx.view.id, "player/journal");
  html = UI.renderViewAs(ctx);
  assert.match(html, /Stai vedendo la campagna come Livia/, "banner on every page");
  assert.match(html, /La notte al guado/);
  view = mount(html);
  UI.bindCampaignSettings(view, ctx);
  one(view, '[data-cs-va-entry="entry-dm-recap"]').fire();
  assert.equal(ctx.view.id, "player/entry/entry-dm-recap");
  html = UI.renderViewAs(ctx);
  assert.match(
    html,
    /data-cs-va-entry-page="entry-dm-recap"[\s\S]*Il gruppo ha attraversato il guado/,
  );
  assert.match(html, /Torna a Diario/);
  ctx.view = {
    page: "campaign",
    tab: "campaign-settings-view",
    id: "player/entry/entry-dm-secret",
  };
  assert.match(UI.renderViewAs(ctx), /non è leggibile da entrambi/);
  ctx.view = { page: "campaign", tab: "campaign-settings-view", id: "player/sessions" };
  assert.match(UI.renderViewAs(ctx), /aria-current="page">Sessioni/);
  // At the Table: the name Livia reads (a hidden name stays its alias) and health words in
  // the DM's language.
  ctx.commit("hide", (s) => setNameHidden(s, s.ext["token-menu"], "goblin-1", true, "dm", "it"));
  ctx.lang = "en";
  ctx.view = { page: "campaign", tab: "campaign-settings-view", id: "player/table" };
  html = UI.renderViewAs(ctx);
  const table = html.match(/data-cs-va-table>[\s\S]*?<\/ul>/)[0];
  assert.match(table, /Unknown creature 1 · Unhurt/);
  assert.doesNotMatch(table, /Sentinella|Illeso/);
  assert.match(table, /Players’ pointer and pings: allowed/);
  ctx.lang = "it";
  view = mount(UI.renderViewAs(ctx));
  UI.bindCampaignSettings(view, ctx);
  one(view, "[data-cs-exit-view]").fire();
  assert.equal(UI.viewAsMember(), null);
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "settings", id: "permissions" });
  // Leaving the view page by any other route also ends it; a role change resets it.
  UI.bindCampaignSettings(mount(UI.renderSettings(ctx)), ctx);
  ctx.navigate("campaign", { tab: "campaign-settings-view", id: "player" });
  UI.renderViewAs(ctx);
  assert.equal(UI.viewAsMember(), "player");
  ctx.navigate("table");
  assert.equal(UI.viewAsMember(), null);
});

test("a player's settings link and a role switch land on pages that identity can read", async () => {
  const h = harness({ role: "player" });
  h.ctx.navigate("campaign", { tab: "settings" });
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "campaign-settings-rules" });
  h.ctx.role = "dm";
  h.ctx.view = { page: "campaign", tab: "settings", id: "rules" };
  h.ctx.role = "player";
  h.registry.emit("role-changed", { role: "player" });
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "campaign-settings-rules" });
});

test("search and palette: house rules are found; commands open the pages", () => {
  const h = harness();
  h.ctx.commit("h", (s) =>
    D.addHouseRule(
      s,
      h.registry.slice(s, D.ID),
      CID,
      { title: "Critici brutali", text: "Il massimo del dado più un tiro." },
      "dm",
    ),
  );
  const results = h.registry.search(h.ctx, "critici");
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].params, { tab: "campaign-settings-rules" });
  const command = h.registry.get("command", "campaign-settings.open", h.ctx);
  h.registry.run(command, h.ctx);
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "settings", id: "rules" });
  h.ctx.role = "player";
  assert.equal(h.registry.get("command", "campaign-settings.open", h.ctx), null);
});
