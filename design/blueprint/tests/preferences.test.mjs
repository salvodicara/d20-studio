// B22 — Preferences, accessibility and units: domain rules, registry integration with the
// real store (three scopes, DM proposals, reset and undo, privacy between identities),
// Table sheet-only panel, map words, notifications and the B56 reduced-motion contract.
// Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as P from "../preferences-domain.mjs";
import * as B22 from "../preferences.mjs";

afterEach(() => B22.resetPreferencesView());

function memory() {
  const values = new Map();
  return {
    values,
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
  };
}

// Real store + registry + this area, with a ctx shaped like the shell's (app.mjs).
function harness({ lang = "it", extra = [] } = {}) {
  const storage = memory();
  const device = memory();
  const registry = createRegistry({ deviceStorage: device, logger: null });
  for (const [id, register] of extra) registry.use(id, register);
  assert.equal(registry.use("preferences", B22.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  let renders = 0;
  const ctx = {
    role: "player",
    lang,
    offline: false,
    view: { page: "home", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    canControl(actor) {
      return this.role === "dm" || actor?.owner === this.role;
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {
      renders++;
    },
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
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
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    device,
    toasts,
    dialogs,
    renders: () => renders,
    slice: () => registry.slice(store.state, "preferences"),
    get: (key) => registry.getSetting(ctx, key),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    storeRef: () => store,
  };
}
const as = (h, role) => {
  h.ctx.role = role;
  return h.ctx;
};

// ---------------------------------------------------------------- domain

test("every preference declares one of the three scopes and registers as a setting", () => {
  const h = harness();
  const sections = h.registry.list("settings", h.ctx).filter((s) => s.id.startsWith("preferences"));
  assert.deepEqual(Object.fromEntries(sections.map((s) => [s.id, s.scope])), {
    "preferences-look": "device",
    "preferences-device": "device",
    "preferences-sound": "device",
    "preferences-access": "personal",
    "preferences-motion": "personal",
    "preferences-units": "personal",
    "preferences-table": "campaign",
  });
  const scopes = new Set(sections.map((s) => s.scope));
  assert.deepEqual([...scopes].sort(), ["campaign", "device", "personal"]);
  for (const key of P.ALL_KEYS) assert.equal(h.get(key), P.defaultOf(key), key);
  assert.equal(P.SCOPE_LABELS.personal.it, "Il mio account");
  assert.equal(P.SCOPE_LABELS.campaign.en, "This campaign");
});

test("units: my choice, then the DM's table choice, then the language (IT metres, EN feet)", () => {
  assert.deepEqual(P.resolveUnits("table", "language", "it"), {
    unit: "metric",
    source: "language",
  });
  assert.deepEqual(P.resolveUnits("table", "language", "en"), {
    unit: "imperial",
    source: "language",
  });
  assert.deepEqual(P.resolveUnits("table", "metric", "en"), { unit: "metric", source: "campaign" });
  assert.deepEqual(P.resolveUnits("imperial", "metric", "it"), {
    unit: "imperial",
    source: "personal",
  });
  assert.deepEqual(P.resolveUnits("metric", "language", "en"), {
    unit: "metric",
    source: "personal",
  });
});

test("effective preferences: system theme and system reduced motion, photosensitive implies reduced", () => {
  const base = Object.fromEntries(P.ALL_KEYS.map((k) => [k, P.defaultOf(k)]));
  let eff = P.effectivePreferences(base, { lang: "it" });
  assert.equal(eff.theme, "dark");
  assert.equal(eff.motionReduced, false);
  eff = P.effectivePreferences({ ...base, [P.KEYS.theme]: "system" }, { systemLight: true });
  assert.equal(eff.theme, "light");
  assert.equal(eff.themeChoice, "system");
  eff = P.effectivePreferences(base, { systemReduced: true });
  assert.equal(eff.motionReduced, true, "the OS request is honoured with the default choice");
  assert.equal(eff.motionSource, "system");
  eff = P.effectivePreferences({ ...base, [P.KEYS.motion]: "reduced" });
  assert.equal(eff.motionReduced, true);
  eff = P.effectivePreferences({ ...base, [P.KEYS.photosensitive]: true });
  assert.deepEqual(
    [eff.motionReduced, eff.photosensitive, eff.motionSource],
    [true, true, "photosensitive"],
  );
  eff = P.effectivePreferences({ ...base, [P.KEYS.textSize]: 125, [P.KEYS.uiScale]: 110 });
  assert.deepEqual([eff.textScale, eff.uiScale], [1.25, 1.1]);
  // Invalid stored values fall back to defaults.
  eff = P.effectivePreferences({ ...base, [P.KEYS.textSize]: 300, [P.KEYS.theme]: "neon" });
  assert.deepEqual([eff.textScale, eff.theme], [1, "dark"]);
});

test("distances convert with the Italian SRD rule (5 ft = 1.5 m) and never twice", () => {
  const cases = [
    ["Velocità 9 m", "imperial", "it", "Velocità 30 ft"],
    ["Scala: 1,5 m / casella", "imperial", "it", "Scala: 5 ft / casella"],
    ["gittata 24/96 m", "imperial", "en", "gittata 80/320 ft"],
    ["Distance: 14.8 m", "imperial", "en", "Distance: 49.3 ft"],
    ["Movimento: 9 m → 6 m", "imperial", "it", "Movimento: 30 ft → 20 ft"],
    ["9 metri", "imperial", "it", "30 piedi"],
    ["Speed 30 ft", "metric", "en", "Speed 9 m"],
    ["range 80/320 ft", "metric", "it", "range 24/96 m"],
    ["a 20-foot-radius Sphere", "metric", "en", "a 6 m-radius Sphere"],
    ["60 feet", "metric", "en", "18 meters"],
    ["Dardo: 36 m", "metric", "it", "Dardo: 36 m"],
    ["Ticker +5m, 10 min, 3 m², d20", "imperial", "it", "Ticker +5m, 10 min, 3 m², d20"],
  ];
  for (const [text, unit, lang, expected] of cases) {
    const once = P.convertDistanceText(text, unit, lang);
    assert.equal(once, expected, text);
    assert.equal(P.convertDistanceText(once, unit, lang), once, "stable: " + text);
  }
  assert.equal(P.formatDistance(1.5, "imperial", "en"), "5 ft");
  assert.equal(P.formatDistance(4.5, "metric", "it"), "4,5 m");
  assert.equal(P.formatDistance(9, "metric", "en"), "9 m");
});

// Machado, Oliveira & Fernandes 2009 simulation matrices (severity 1), on linear sRGB.
const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (hex) => [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
const simulate = (v, m) =>
  m.map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
function lab([r, g, b]) {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const deltaE = (a, b, m) => {
  const [p, q] = [lab(simulate(rgb(a), m)), lab(simulate(rgb(b), m))];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

test("each colour-vision palette keeps ally, hostile, danger and positive apart for that vision", () => {
  for (const [mode, matrix] of Object.entries(CVD)) {
    const own = P.PALETTES[mode];
    const standard = P.PALETTES.standard;
    for (const [a, b] of [
      ["allyFill", "hostileFill"],
      ["allyStroke", "hostileStroke"],
      ["dangerDark", "positiveDark"],
    ]) {
      const improved = deltaE(own[a], own[b], matrix);
      assert.ok(improved >= 40, `${mode} ${a}/${b}: ΔE ${improved.toFixed(1)}`);
      assert.ok(
        improved > deltaE(standard[a], standard[b], matrix),
        `${mode} ${a}/${b} not better`,
      );
    }
    const vars = P.paletteVariables(mode, "light");
    assert.equal(vars["--danger"], own.dangerLight);
    assert.equal(vars["--pref-hostile-stroke"], own.hostileStroke);
  }
  assert.deepEqual(P.paletteVariables("standard", "dark"), {});
});

test("proposals: only the DM proposes, to a campaign player, with valid values", () => {
  const slice = P.seedSlice();
  const base = { from: "dm", fromRole: "dm", to: "player", players: ["player"], now: "t1" };
  assert.throws(
    () =>
      P.proposeSettings(slice, {
        ...base,
        fromRole: "player",
        id: "a",
        values: { [P.KEYS.font]: "legible" },
      }),
    /Only the DM/,
  );
  assert.throws(
    () =>
      P.proposeSettings(slice, {
        ...base,
        to: "stranger",
        id: "a",
        values: { [P.KEYS.font]: "legible" },
      }),
    /player of the campaign/,
  );
  assert.throws(() => P.proposeSettings(slice, { ...base, id: "a", values: {} }), /at least one/);
  assert.throws(
    () => P.proposeSettings(slice, { ...base, id: "a", values: { [P.KEYS.textSize]: 180 } }),
    /not valid/,
  );
  assert.throws(
    () =>
      P.proposeSettings(slice, {
        ...base,
        id: "a",
        values: { [P.KEYS.font]: "legible" },
        note: "x".repeat(281),
      }),
    /longer than 280/,
  );
  // Volumes and campaign settings are not proposable; unknown keys are ignored.
  assert.throws(
    () =>
      P.proposeSettings(slice, {
        ...base,
        id: "a",
        values: { [P.KEYS.diceVolume]: 10, [P.KEYS.tableUnits]: "metric" },
      }),
    /at least one/,
  );
  const proposal = P.proposeSettings(slice, {
    ...base,
    id: "p1",
    values: { [P.KEYS.textSize]: 125, [P.KEYS.vision]: "deuteranopia" },
    note: "  Per il telefono  ",
  });
  assert.equal(proposal.note, "Per il telefono");
  assert.equal(proposal.status, "pending");
  assert.throws(
    () => P.respondToProposal(slice, "p1", "dm", "accepted", "t2"),
    /not addressed to you/,
  );
  assert.throws(() => P.withdrawProposal(slice, "p1", "player", "t2"), /only your own/);
  assert.throws(() => P.revertProposal(slice, "p1", "player", "t2"), /cannot be undone/);
  P.respondToProposal(slice, "p1", "player", "accepted", "t2");
  assert.throws(
    () => P.respondToProposal(slice, "p1", "player", "declined", "t3"),
    /already answered/,
  );
  assert.throws(() => P.withdrawProposal(slice, "p1", "dm", "t3"), /already answered/);
  P.revertProposal(slice, "p1", "player", "t3");
  assert.equal(slice.proposals[0].status, "reverted");
  assert.deepEqual(P.pendingFor(slice, "player"), []);
  assert.equal(P.proposalsFor(slice, "stranger").length, 0);
});

test("normalize keeps valid proposals only and refuses a future version", () => {
  const normalized = P.normalizeSlice({
    proposals: [
      {
        id: "a",
        from: "dm",
        to: "player",
        values: { [P.KEYS.font]: "legible", evil: 1 },
        status: "odd",
      },
      { id: "b", from: "dm", to: "player", values: { [P.KEYS.textSize]: 999 } },
      { nonsense: true },
    ],
  });
  assert.equal(normalized.proposals.length, 1);
  assert.deepEqual(normalized.proposals[0].values, { [P.KEYS.font]: "legible" });
  assert.equal(normalized.proposals[0].status, "pending");
  assert.deepEqual(P.normalizeSlice(undefined), { proposals: [] });
  assert.throws(() => P.normalizeSlice({ proposals: [] }, 2), /newer/);
});

// ---------------------------------------------------------------- integration

test("scopes: device in this browser, personal per identity, campaign only by the DM", () => {
  const h = harness();
  as(h, "player");
  h.registry.setSetting(h.ctx, P.KEYS.theme, "light");
  assert.equal(h.device.values.get("d20-studio-setting:" + P.KEYS.theme), '"light"');
  h.registry.setSetting(h.ctx, P.KEYS.vision, "tritanopia");
  assert.throws(() => h.registry.setSetting(h.ctx, P.KEYS.tableUnits, "metric"), /Only the DM/);
  as(h, "dm");
  assert.equal(h.get(P.KEYS.vision), "standard", "personal values belong to one identity");
  assert.equal(h.get(P.KEYS.theme), "light", "device values are shared by this browser");
  h.registry.setSetting(h.ctx, P.KEYS.tableUnits, "metric");
  as(h, "player");
  h.ctx.lang = "en";
  assert.equal(
    B22.effectivePreferences(h.ctx).unit,
    "metric",
    "the DM's table unit beats the language",
  );
  h.registry.setSetting(h.ctx, P.KEYS.units, "imperial");
  assert.equal(B22.effectivePreferences(h.ctx).unit, "imperial", "my own choice beats the table");
  assert.equal(B22.formatDistance(h.ctx, 9), "30 ft");
  // Campaign changes are shared: refused offline; personal ones are local and allowed.
  as(h, "dm");
  h.ctx.offline = true;
  assert.throws(() => h.registry.setSetting(h.ctx, P.KEYS.tableUnits, "imperial"), /senza rete/);
  h.registry.setSetting(h.ctx, P.KEYS.font, "legible");
  h.ctx.offline = false;
  // Reload keeps all three.
  h.reload();
  assert.equal(h.get(P.KEYS.font), "legible");
  assert.equal(h.get(P.KEYS.tableUnits), "metric");
  assert.equal(h.get(P.KEYS.theme), "light");
});

test("the DM proposes, the player accepts, can undo; the DM never reads the player's values", () => {
  const h = harness();
  as(h, "player");
  h.registry.setSetting(h.ctx, P.KEYS.font, "legible");
  assert.throws(
    () => B22.sendProposal(h.ctx, { to: "player", values: { [P.KEYS.textSize]: 125 } }),
    /Only the DM/,
  );
  as(h, "dm");
  h.ctx.offline = true;
  assert.throws(
    () => B22.sendProposal(h.ctx, { to: "player", values: { [P.KEYS.textSize]: 125 } }),
    /senza rete/,
  );
  h.ctx.offline = false;
  const proposal = B22.sendProposal(h.ctx, {
    to: "player",
    values: { [P.KEYS.textSize]: 125, [P.KEYS.vision]: "deuteranopia", [P.KEYS.font]: "legible" },
    note: "Leggi meglio",
  });
  // The DM's block lists the proposal without the player's current values.
  const dmBlock = B22.proposalsHTML(h.ctx);
  assert.match(dmBlock, /Proponi preferenze a un giocatore/);
  assert.match(dmBlock, /In attesa/);
  assert.match(dmBlock, /data-pref-withdraw/);
  assert.doesNotMatch(dmBlock, /Standard/, "no current player value is shown");
  assert.equal(B22.collectNotifications(h.ctx).length, 0);
  // The player sees it in Preferences and in the notifications.
  as(h, "player");
  assert.match(
    B22.proposalsHTML(h.ctx),
    /Proposte del DM[\s\S]*125%[\s\S]*Deuteranopia[\s\S]*Leggi meglio/,
  );
  const notices = B22.collectNotifications(h.ctx);
  assert.equal(notices.length, 1);
  assert.match(notices[0].body.it, /^3 preferenze/);
  // Accepting offline changes nothing.
  h.ctx.offline = true;
  assert.throws(() => B22.answerProposal(h.ctx, proposal.id, "accepted"), /senza rete/);
  assert.equal(h.get(P.KEYS.textSize), 100);
  h.ctx.offline = false;
  // A game change made before accepting: its Undo must not bring the proposal back.
  h.ctx.commit("Livia ferita", (draft) => {
    draft.actors.livia.hp -= 1;
  });
  const changes = B22.answerProposal(h.ctx, proposal.id, "accepted");
  assert.deepEqual(
    changes.map((c) => [c.key, c.from, c.to]),
    [
      [P.KEYS.textSize, 100, 125],
      [P.KEYS.vision, "standard", "deuteranopia"],
    ],
    "an unchanged value (typeface already legible) is not listed",
  );
  assert.equal(h.get(P.KEYS.textSize), 125);
  assert.equal(h.get(P.KEYS.vision), "deuteranopia");
  assert.equal(h.slice().proposals[0].status, "accepted");
  // Game Undo never touches preferences or proposals.
  h.ctx.undo();
  assert.equal(h.ctx.state.actors.livia.hp, 18, "the game change was undone");
  assert.equal(h.slice().proposals[0].status, "accepted");
  assert.equal(h.get(P.KEYS.vision), "deuteranopia");
  // The DM is told the answer, and still cannot read the value.
  as(h, "dm");
  assert.equal(h.get(P.KEYS.vision), "standard");
  assert.match(B22.collectNotifications(h.ctx)[0].title.it, /ha accettato/);
  assert.throws(() => B22.undoAcceptedProposal(h.ctx), /no accepted proposal/);
  // The player goes back.
  as(h, "player");
  assert.equal(B22.undoAcceptedProposal(h.ctx), 2);
  assert.equal(h.get(P.KEYS.textSize), 100);
  assert.equal(h.get(P.KEYS.vision), "standard");
  assert.equal(h.slice().proposals[0].status, "reverted");
});

test("decline and withdraw change no preference; answered proposals cannot be withdrawn", () => {
  const h = harness();
  as(h, "dm");
  const first = B22.sendProposal(h.ctx, { to: "player", values: { [P.KEYS.theme]: "light" } });
  const second = B22.sendProposal(h.ctx, { to: "player", values: { [P.KEYS.sheetOnly]: true } });
  B22.withdrawProposal(h.ctx, second.id);
  as(h, "player");
  assert.equal(B22.collectNotifications(h.ctx).length, 1);
  assert.deepEqual(B22.answerProposal(h.ctx, first.id, "declined"), []);
  assert.equal(h.get(P.KEYS.theme), "dark");
  assert.equal(B22.proposalsHTML(h.ctx), "");
  as(h, "dm");
  assert.throws(() => B22.withdrawProposal(h.ctx, first.id), /already answered/);
  assert.match(B22.collectNotifications(h.ctx)[0].title.it, /rifiutato/);
});

test("reset to defaults covers my device and account values, with an undo for the same identity", () => {
  const h = harness();
  as(h, "player");
  assert.deepEqual(B22.pendingReset(h.ctx), []);
  h.registry.setSetting(h.ctx, P.KEYS.theme, "light");
  h.registry.setSetting(h.ctx, P.KEYS.diceVolume, 20);
  h.registry.setSetting(h.ctx, P.KEYS.units, "imperial");
  as(h, "dm");
  h.registry.setSetting(h.ctx, P.KEYS.tableUnits, "imperial");
  as(h, "player");
  const plan = B22.pendingReset(h.ctx).map((c) => c.key);
  assert.deepEqual(plan.sort(), [P.KEYS.diceVolume, P.KEYS.theme, P.KEYS.units].sort());
  const applied = B22.resetToDefaults(h.ctx);
  assert.equal(applied.length, 3);
  assert.equal(h.get(P.KEYS.theme), "dark");
  assert.equal(h.get(P.KEYS.diceVolume), 50);
  assert.equal(h.get(P.KEYS.units), "table");
  assert.equal(h.get(P.KEYS.tableUnits), "imperial", "campaign preferences are not reset");
  as(h, "dm");
  assert.throws(() => B22.undoReset(h.ctx), /no reset to undo/);
  as(h, "player");
  assert.equal(B22.undoReset(h.ctx), 3);
  assert.equal(h.get(P.KEYS.theme), "light");
  assert.equal(h.get(P.KEYS.diceVolume), 20);
  assert.throws(() => B22.undoReset(h.ctx), /no reset to undo/, "an undo is used once");
});

test("apply writes root attributes, text scale, palette and reduced motion", () => {
  const h = harness();
  const dataset = {};
  const props = new Map();
  const doc = {
    documentElement: {
      dataset,
      style: {
        setProperty: (k, v) => props.set(k, v),
        removeProperty: (k) => props.delete(k),
      },
    },
    styleSheets: [],
  };
  as(h, "player");
  h.registry.setSetting(h.ctx, P.KEYS.vision, "protanopia");
  h.registry.setSetting(h.ctx, P.KEYS.photosensitive, true);
  h.registry.setSetting(h.ctx, P.KEYS.textSize, 125);
  h.registry.setSetting(h.ctx, P.KEYS.sheetOnly, true);
  B22.applyPreferences(h.ctx, null, doc);
  assert.equal(dataset.motion, "reduced");
  assert.equal(dataset.prefPhotosensitive, "on");
  assert.equal(dataset.prefVision, "protanopia");
  assert.equal(dataset.prefCanvas, "off");
  assert.equal(dataset.prefUnits, "metric");
  assert.equal(props.get("--pref-text-scale"), "1.25");
  assert.equal(props.get("--pref-hostile-stroke"), P.PALETTES.protanopia.hostileStroke);
  // A preview (overrides) is applied without being saved; the saved values come back.
  B22.applyPreferences(h.ctx, { [P.KEYS.vision]: "standard", [P.KEYS.photosensitive]: false }, doc);
  assert.equal(dataset.prefVision, "standard");
  assert.equal(dataset.motion, undefined);
  assert.equal(props.has("--pref-hostile-stroke"), false);
  assert.equal(h.get(P.KEYS.vision), "protanopia");
  B22.applyPreferences(h.ctx, null, doc);
  assert.equal(dataset.prefVision, "protanopia");
  assert.equal(B22.isReducedMotion(h.ctx), true);
  assert.equal(B22.isPhotosensitive(h.ctx), true);
});

test("sounds: volume 0 is silence, digital dice and interface are separate categories", () => {
  assert.equal(B22.playSound("dice", 0), false);
  assert.equal(B22.playSound("ui", 0), false);
  // Node has no audio: a positive volume is requested but nothing is played.
  assert.equal(B22.playSound("dice", 60), false);
  assert.deepEqual(
    B22.soundLog.map((s) => [s.kind, s.volume]),
    [
      ["dice", 0],
      ["ui", 0],
      ["dice", 60],
    ],
  );
});

test("only digital rolls this identity can see make the dice sound", () => {
  const h = harness();
  as(h, "player");
  h.registry.setSetting(h.ctx, P.KEYS.diceVolume, 70);
  const roll = { mode: "physical", visibility: "shared", owner: "player", controller: "player" };
  h.registry.emit("roll-accepted", { roll });
  h.registry.emit("roll-accepted", {
    roll: { ...roll, mode: "digital", visibility: "private", owner: "dm", controller: "dm" },
  });
  assert.deepEqual(B22.soundLog, [], "physical and hidden rolls are silent");
  h.registry.emit("roll-accepted", { roll: { ...roll, mode: "digital" } });
  assert.deepEqual(B22.soundLog, [{ kind: "dice", volume: 70 }]);
});

test("sheet-only panel lists visible creatures, selects or targets, and hides what the player cannot see", () => {
  const h = harness();
  as(h, "player");
  h.storeRef().state.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true;
  const scene = h.ctx.state.scenes.find((s) => s.id === h.ctx.state.activeSceneId);
  const html = B22.sheetOnlyPanelHTML(h.ctx, { scene, selectedActorId: "livia" });
  assert.match(html, /Mostra la mappa/);
  assert.match(html, /data-pref-select="livia"[^>]*aria-pressed="true"/);
  assert.match(html, /Sentinella[\s\S]*Ostile/);
  assert.doesNotMatch(html, /Esploratore/, "a hidden token stays hidden in the list");
  assert.match(html, /Livia[\s\S]*PF 18\/22/);
  assert.doesNotMatch(html, /Sentinella<\/button><span class="muted">[^<]*PF/, "no HP for others");
  // Distances from the selected creature, as the Table's Distances list (one decimal,
  // elevation included), in this person's unit: the map ruler rows are hidden with the map.
  assert.match(html, /Distanze da Livia/);
  assert.match(html, /Sentinella<\/button><span class="muted">Ostile · 12,1 m \(↑ 3 m\)/);
  assert.match(html, /Doran<\/button><span class="muted">Alleato · 3,7 m</);
  h.ctx.lang = "en";
  assert.match(
    B22.sheetOnlyPanelHTML(h.ctx, { scene, selectedActorId: "livia" }),
    /Sentinella<\/button><span class="muted">Hostile · 40\.3 ft \(↑ 10 ft\)/,
  );
  h.ctx.lang = "it";
  as(h, "dm");
  assert.match(
    B22.sheetOnlyPanelHTML(h.ctx, { scene, selectedActorId: "goblin-1" }),
    /Esploratore/,
  );
  // Words on the map: disposition in words for each visible token.
  as(h, "player");
  const svg = B22.mapWordsSVG(h.ctx, { scene });
  assert.match(svg, /data-disposition="hostile"[^>]*>Ostile</);
  assert.match(svg, /data-disposition="ally"[^>]*>Alleato</);
  h.ctx.lang = "en";
  assert.match(B22.mapWordsSVG(h.ctx, { scene }), />Hostile</);
  // The panel only appears in sheet-only mode.
  const panel = h.registry.get("table-panel", "preferences-sheet-only");
  assert.equal(h.registry.list("table-panel", h.ctx, { scene }).includes(panel), false);
  h.registry.setSetting(h.ctx, P.KEYS.sheetOnly, true);
  assert.equal(
    h.registry.list("table-panel", h.ctx, { scene }).some((c) => c.id === panel.id),
    true,
  );
  // The palette command toggles it back.
  const command = h.registry.get("command", "preferences.sheet-only");
  h.registry.run(command, h.ctx);
  assert.equal(h.get(P.KEYS.sheetOnly), false);
  assert.match(h.toasts.at(-1).text, /map is visible again/);
});

test("the proposal form reads only the chosen values", () => {
  const data = new Map([
    ["to", "player"],
    [`propose:${P.KEYS.theme}`, "2"],
    [`propose:${P.KEYS.sheetOnly}`, "true"],
    [`propose:${P.KEYS.font}`, ""],
    ["note", "Ciao"],
  ]);
  assert.deepEqual(B22.readProposalForm({ get: (k) => data.get(k) ?? null }), {
    to: "player",
    values: { [P.KEYS.theme]: "light", [P.KEYS.sheetOnly]: true },
    note: "Ciao",
  });
});

test("B56 animated dice read the reduced-motion preference of this area", async () => {
  let dice;
  try {
    dice = await import("../dice-3d.mjs");
  } catch {
    return; // B56 not present in this checkout: nothing to check.
  }
  if (typeof dice.reducedMotion !== "function" || typeof dice.register !== "function") return;
  const h = harness({ extra: [["dice-3d", dice.register]] });
  as(h, "player");
  const before = dice.reducedMotion(h.ctx);
  h.registry.setSetting(h.ctx, P.KEYS.motion, "reduced");
  assert.equal(dice.reducedMotion(h.ctx), true);
  as(h, "dm");
  assert.equal(dice.reducedMotion(h.ctx), before, "another identity keeps its own choice");
});

// ---------------------------------------------------------------- review fixes

test("weights follow the unit system with the Italian SRD rule (1 lb = 0.5 kg), never twice", () => {
  const cases = [
    [
      "7 items · 5.25 kg · weight incomplete",
      "imperial",
      "en",
      "7 items · 10.5 lb · weight incomplete",
    ],
    ["× 1 · 2 kg / unit · Equipped", "imperial", "en", "× 1 · 4 lb / unit · Equipped"],
    [
      "Value: 0 GP · weight 0 kg (50 coins = 1 lb, SRD 5.2.1)",
      "imperial",
      "en",
      "Value: 0 GP · weight 0 lb (50 coins = 1 lb, SRD 5.2.1)",
    ],
    ["peso 0,5 kg (50 monete = 0,5 kg)", "imperial", "it", "peso 1 lb (50 monete = 1 lb)"],
    ["Weight 4 lb", "metric", "en", "Weight 2 kg"],
    ["fino a 5 kg in 1,8 m³", "imperial", "it", "fino a 10 lb in 1,8 m³"],
    ["Velocità 9 m, zaino 2 kg", "imperial", "it", "Velocità 30 ft, zaino 4 lb"],
  ];
  for (const [text, unit, lang, expected] of cases) {
    const once = P.convertUnitsText(text, unit, lang);
    assert.equal(once, expected, text);
    assert.equal(P.convertUnitsText(once, unit, lang), once, "stable: " + text);
  }
  assert.equal(P.formatWeight(2.5, "imperial", "it"), "5 lb");
  assert.equal(P.formatWeight(2.5, "metric", "en"), "2.5 kg");
  const h = harness({ lang: "en" });
  assert.equal(B22.formatWeight(h.ctx, 1), "2 lb", "EN defaults to pounds");
  h.ctx.lang = "it";
  assert.equal(B22.formatWeight(h.ctx, 1), "1 kg");
});

test("a number and its unit drawn in two nodes (`9 <small>m</small>`) convert together", () => {
  assert.deepEqual(P.convertSplitPair("9 ", "m", "imperial", "en"), { number: "30", unit: "ft" });
  assert.deepEqual(P.convertSplitPair("30", " ft ", "metric", "it"), { number: "9", unit: "m" });
  assert.deepEqual(P.convertSplitPair("2,5", "kg", "imperial", "it"), { number: "5", unit: "lb" });
  assert.equal(P.convertSplitPair("9", "m", "metric", "it"), null, "already in the unit");
  assert.equal(P.convertSplitPair("9", "PF", "imperial", "it"), null, "not a unit");
  assert.equal(P.convertSplitPair("Livello 9", "m", "imperial", "it"), null, "not a number");
});

test("interface and text size scale the stylesheets' px lengths, not the window units", () => {
  const ui = "var(--pref-ui-scale, 1)";
  const text = "var(--pref-text-scale, 1) * var(--pref-ui-scale, 1)";
  assert.equal(B22.scaledValue("padding-top", "14px"), `calc(14px * ${ui})`);
  assert.equal(
    B22.scaledValue("height", "calc(100vh - 125px)"),
    `calc(100vh - calc(125px * ${ui}))`,
    "the window height stays the window height",
  );
  assert.equal(B22.scaledValue("height", "min(58vh, 650px)"), `min(58vh, calc(650px * ${ui}))`);
  assert.equal(
    B22.scaledValue("box-shadow", "rgba(0, 0, 0, 0.5) 0px 8px 20px -4px"),
    `rgba(0, 0, 0, 0.5) 0px calc(8px * ${ui}) calc(20px * ${ui}) calc(-4px * ${ui})`,
  );
  assert.equal(
    B22.scaledValue("grid-template-columns", "minmax(0px, 1fr) 280px"),
    `minmax(0px, 1fr) calc(280px * ${ui})`,
  );
  // Text: the whole value, so that a clamp() heading grows too (h1, B56 figures).
  assert.equal(
    B22.scaledValue("font-size", "clamp(29px, 3vw, 42px)"),
    `calc(clamp(29px, 3vw, 42px) * ${text})`,
  );
  assert.equal(B22.scaledValue("font-size", "15px"), `calc(15px * ${text})`);
  assert.equal(B22.scaledValue("line-height", "22px"), `calc(22px * ${text})`);
  assert.equal(B22.scaledValue("font-size", "1.2em"), null, "relative to a scaled parent");
  assert.equal(B22.scaledValue("font-size", "calc(100% + 2px)"), null);
  assert.equal(B22.scaledValue("--radius", "12px"), `calc(12px * ${ui})`);
  assert.equal(B22.scaledValue("--label", "a 2px b"), null);
  assert.equal(B22.scaledValue("background-image", 'url("x-10px.png")'), null);
  assert.equal(B22.scaledValue("content", '"12px"'), null);
  assert.equal(B22.scaledValue("margin-top", "0px"), null);
  assert.equal(B22.scaledValue("width", "50%"), null);
});

test("panel fade opacity is a device preference applied to the root", () => {
  const h = harness();
  const dataset = {};
  const props = new Map();
  const doc = {
    documentElement: {
      dataset,
      style: { setProperty: (k, v) => props.set(k, v), removeProperty: (k) => props.delete(k) },
    },
    styleSheets: [],
  };
  B22.applyPreferences(h.ctx, null, doc);
  assert.equal(dataset.prefFade, undefined, "no fade by default");
  assert.equal(props.get("--pref-panel-opacity"), "1");
  h.registry.setSetting(h.ctx, P.KEYS.panelOpacity, 75);
  assert.equal(h.device.values.get("d20-studio-setting:" + P.KEYS.panelOpacity), "75");
  B22.applyPreferences(h.ctx, null, doc);
  assert.equal(dataset.prefFade, "on");
  assert.equal(props.get("--pref-panel-opacity"), "0.75");
  assert.equal(P.fieldOf(P.KEYS.panelOpacity).section.scope, "device");
});

test("proposal notifications open the proposals page, with singular or plural wording", () => {
  const h = harness();
  as(h, "dm");
  const one = B22.sendProposal(h.ctx, { to: "player", values: { [P.KEYS.contrast]: "high" } });
  as(h, "player");
  let [notice] = B22.collectNotifications(h.ctx);
  assert.deepEqual(notice.target, { page: B22.PROPOSALS_ROUTE, params: {} });
  assert.equal(notice.body.it, "1 preferenza proposta. Aprila per accettarla o rifiutarla.");
  assert.equal(notice.body.en, "1 preference proposed. Open it to accept or decline it.");
  // The page is a registered route with the same Accept / Decline as Preferences.
  const route = h.registry.get("route", B22.PROPOSALS_ROUTE, h.ctx);
  assert.ok(route, "route registered");
  let page = B22.renderProposalsPage(h.ctx);
  assert.match(page, /Proposte di preferenze del DM/);
  assert.match(page, new RegExp(`data-pref-accept="${one.id}"`));
  assert.match(page, /data-pref-decline=/);
  assert.match(page, /data-service="preferences"/, "the way to all preferences");
  B22.answerProposal(h.ctx, one.id, "accepted");
  page = B22.renderProposalsPage(h.ctx);
  assert.match(page, /Nessuna proposta del DM in attesa/);
  assert.match(page, /Proposte già decise[\s\S]*Accettata[\s\S]*Elevato/);
  assert.match(
    page,
    /data-pref-undo[^>]*>Torna ai valori precedenti/,
    "the way back stays in view",
  );
  // Plural, and the DM's answer notices lead to the same page.
  as(h, "dm");
  B22.sendProposal(h.ctx, {
    to: "player",
    values: { [P.KEYS.font]: "legible", [P.KEYS.theme]: "light" },
  });
  const [answer] = B22.collectNotifications(h.ctx);
  assert.equal(answer.target.page, B22.PROPOSALS_ROUTE);
  assert.match(B22.renderProposalsPage(h.ctx), /Preferenze proposte ai giocatori[\s\S]*Accettata/);
  as(h, "player");
  [notice] = B22.collectNotifications(h.ctx);
  assert.equal(notice.body.it, "2 preferenze proposte. Aprile per accettarle o rifiutarle.");
});

test("after a reset the way back stays available until reload, for the same identity", () => {
  const h = harness();
  as(h, "player");
  h.registry.setSetting(h.ctx, P.KEYS.theme, "light");
  B22.resetToDefaults(h.ctx);
  assert.match(B22.renderProposalsPage(h.ctx), /data-pref-undo[^>]*>Annulla ripristino/);
  as(h, "dm");
  assert.doesNotMatch(B22.renderProposalsPage(h.ctx), /data-pref-undo/, "not for another identity");
  as(h, "player");
  assert.equal(B22.undoLastPreferenceAction(h.ctx), 1);
  assert.equal(h.get(P.KEYS.theme), "light");
  assert.doesNotMatch(B22.renderProposalsPage(h.ctx), /data-pref-undo/);
});
