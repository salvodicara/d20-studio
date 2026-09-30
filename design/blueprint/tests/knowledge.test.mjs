// B46 — knowledge, examination, hidden identity, stealth, cover in combat, hit chance and
// pickpocket, with the real store, registry, conditions and combat, plus the UI handlers.
// Synthetic data only (the sample Livia, Doran, Mira, goblins and the lanterns campaign).
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { hasCondition } from "../conditions.mjs";
import { canControlActor } from "../character-access.mjs";
import { previewAction, beginAttempt } from "../combat.mjs";
import * as K from "../knowledge.mjs";
import * as D from "../knowledge-domain.mjs";
import * as FVUI from "../fog-vision.mjs";
import * as TM from "../token-menu.mjs";

afterEach(() => K.resetKnowledgeView());

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const plain = (html) =>
  decode(String(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

function harness({ role = "player", lang = "it", dice = [] } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("fog-vision", FVUI.register).status, "built");
  assert.equal(registry.use("knowledge", K.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [],
    dialogs = [],
    events = [];
  registry.on("roll-accepted", (payload) => events.push(payload));
  const faces = [...dice];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon: (name) => `<i data-icon="${name}"></i>`,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    rollDie: (sides) => {
      const face = faces.shift();
      assert.ok(face !== undefined, "test ran out of scripted dice");
      assert.ok(face >= 1 && face <= sides);
      return face;
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    canControl(actor) {
      return canControlActor(actor, this.role, store.state);
    },
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
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
    toasts,
    dialogs,
    events,
    dice: faces,
    store: () => store,
    k: () => store.state.ext.knowledge,
    rolls: () => store.state.ext["knowledge-rolls"],
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    run(fn, as = ctx.role) {
      let out;
      const saved = ctx.role;
      ctx.role = as;
      try {
        ctx.commit("test", (draft) => {
          out = fn(draft, draft.ext.knowledge, draft.ext["knowledge-rolls"]);
        });
      } finally {
        ctx.role = saved;
      }
      return out;
    },
    submit(fields = {}) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      const data = new FormData();
      for (const [key, value] of Object.entries(fields))
        for (const v of [].concat(value)) data.append(key, v);
      return dialog.options.onSubmit(data);
    },
    move(actorId, x, y) {
      this.run((s) => {
        const scene = s.scenes.find((sc) => sc.id === s.activeSceneId);
        Object.assign(
          scene.tokens.find((t) => t.actorId === actorId),
          { x, y },
        );
      }, "dm");
    },
    scene(id) {
      this.run((s) => {
        s.activeSceneId = id;
      }, "dm");
    },
  };
}
const GOBLIN = "srd2024:creature:goblin-warrior";

// Minimal element double: buttons/inputs/selects from markup with their own listeners.
function mount(html, bind, ...args) {
  const nodes = [...html.matchAll(/<(input|button|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g)].map(
    ([, tag, attrsText, inner]) => {
      const attrs = Object.fromEntries(
        [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
      );
      const node = {
        tagName: tag.toUpperCase(),
        attrs,
        listeners: {},
        value:
          attrs.value ??
          decode(/<option value="([^"]*)"[^>]*selected/.exec(inner ?? "")?.[1] ?? ""),
        dataset: Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k.startsWith("data-"))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
        ),
        addEventListener(type, fn) {
          (node.listeners[type] ??= []).push(fn);
        },
      };
      return node;
    },
  );
  const matches = (node, selector) =>
    [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
      ([, key, value]) => key in node.attrs && (value === undefined || node.attrs[key] === value),
    );
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
  };
  bind(root, ...args);
  return {
    has: (selector) => Boolean(root.querySelector(selector)),
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      for (const fn of node.listeners.click ?? []) fn({ target: node });
    },
    change(selector, value) {
      const node = root.querySelector(selector);
      node.value = value;
      for (const fn of node.listeners.change ?? []) fn({ target: node });
    },
  };
}
const panel = (h, selectedActorId) => {
  const c = h.registry.get("table-panel", "knowledge", h.ctx, {
    scene: D.activeScene(h.ctx.state),
  });
  const tv = { scene: D.activeScene(h.ctx.state), selectedActorId, mode: "move" };
  const html = c.render(h.ctx, tv);
  return {
    html,
    text: plain(html),
    mount: () => mount(html, (root) => c.bind(root, h.ctx, { scene: tv.scene, selectedActorId })),
  };
};

// ------------------------------------------------------------------ registration
test("registration: two slices (rolls preserved), Creature-tab block, layers, Measure tool, menu, policy, bell", () => {
  const h = harness();
  assert.deepEqual(h.k().links, { "goblin-1": GOBLIN, "goblin-2": GOBLIN });
  assert.deepEqual(h.rolls(), { rolls: [] });
  const panelDef = h.registry.get("table-panel", "knowledge");
  assert.equal(panelDef.placement, "inspector");
  const tool = h.registry.get("table-tool", "knowledge-los");
  assert.equal(tool.group, "measure");
  assert.deepEqual(
    h.registry
      .list("map-layer", h.ctx, { scene: D.activeScene(h.ctx.state) })
      .map((c) => c.id)
      .filter((id) => id.startsWith("knowledge")),
    // P6 TV-44: the line-of-sight result with its switch and «Togli» on the map.
    ["knowledge-sight", "knowledge-marks", "knowledge-los-hud"],
  );
  const settings = h.registry.get("settings", D.POLICY);
  assert.equal(settings.scope, "campaign");
  assert.deepEqual(
    settings.fields.map((f) => [f.id, f.default]),
    [
      ["mode", "graded"],
      ["hit-chance", "never"],
    ],
  );
  const target = { actorId: "goblin-1", tokenId: "token-goblin-1", sceneId: "old-watch" };
  const menu = h.registry
    .list("token-menu", h.ctx, target)
    .map((c) => c.id)
    .filter((id) => id.startsWith("knowledge"));
  // P6 TV-142: «Borseggia» stays in the menu out of reach (greyed with its reason, BG3).
  assert.deepEqual(menu, ["knowledge-examine", "knowledge-pickpocket"]);
  h.ctx.role = "dm";
  const dmMenu = h.registry
    .list("token-menu", h.ctx, target)
    .map((c) => c.id)
    .filter((id) => id.startsWith("knowledge"));
  assert.deepEqual(dmMenu, [
    "knowledge-examine",
    "knowledge-conceal",
    "knowledge-hide",
    "knowledge-search",
  ]);
  // No sidebar tab and no header service.
  assert.equal(
    h.registry
      .list("table-panel", h.ctx, {})
      .filter((c) => c.id.startsWith("knowledge") && c.placement !== "inspector").length,
    0,
  );
  assert.equal(
    h.registry.list("service", h.ctx).filter((c) => c.id.startsWith("knowledge")).length,
    0,
  );
  const normalized = D.normalizeSlice(structuredClone(h.k()), 1);
  assert.deepEqual(D.normalizeSlice(structuredClone(normalized), 1), normalized);
  assert.throws(() => D.normalizeSlice({}, 2), /newer version/);
});

// ------------------------------------------------------------------ (1) graded knowledge
test("(1) Examine at level 1: players read name, size and type, never the locked values", () => {
  const h = harness();
  const view = D.examineView(h.ctx.state, "goblin-1", "player");
  assert.equal(view.level, 1);
  assert.equal(view.sections.length, 1);
  assert.equal(view.sections[0].rows[0].value.it, "Goblin guerriero");
  assert.equal(view.sections[0].rows[2].value.it, "Folletto (goblinoide)");
  assert.deepEqual(
    view.locked.map((t) => t.level),
    [2, 3, 4],
  );
  const json = JSON.stringify(view);
  for (const secret of ["3d6", "Scimitarra", "Fuga agile", "Classe Armatura", "GS 1/4", '"dc"'])
    assert.ok(!json.includes(secret), `player view leaks ${secret}`);
  assert.ok(!("dc" in view.study));
  const dm = D.examineView(h.ctx.state, "goblin-1", "dm");
  assert.equal(dm.sections.length, 4);
  assert.deepEqual(
    dm.sections.map((s) => s.players),
    [true, false, false, false],
  );
  assert.equal(dm.study.dc, 10);
  assert.equal(dm.study.skill, "arcana");
  assert.match(JSON.stringify(dm), /Fuga agile/);
  // The Examine window (BG3) opened from the token menu shows the same projection.
  h.registry.run(h.registry.get("token-menu", "knowledge-examine"), h.ctx, {
    actorId: "goblin-1",
    sceneId: "old-watch",
  });
  const body = plain(h.dialogs.at(-1).body);
  assert.match(body, /Goblin guerriero/);
  assert.match(body, /Conoscenza del gruppo: 1\/4/);
  assert.match(body, /Da scoprire: CA, punti ferita tipici/);
  assert.doesNotMatch(body, /Scimitarra/);
});

test("(1) a successful Study raises the party's shared level; failure blocks; DM grants and corrects", () => {
  const h = harness({ dice: [] });
  // Livia: Intelligence 16 (+3), Arcana for Fey; physical face 9 → 12 ≥ DC 10.
  const result = h.run((s, k, r) =>
    D.study(
      s,
      k,
      r,
      { actorId: "livia", targetId: "goblin-1", mode: "physical", faces: [9] },
      "player",
      () => 1,
    ),
  );
  assert.equal(result.total, 12);
  assert.equal(result.success, true);
  assert.equal(D.knowledgeLevel(h.ctx.state, GOBLIN), 2);
  // WotR pooled knowledge: the other goblin and the whole party share it.
  const other = D.examineView(h.ctx.state, "goblin-2", "player");
  assert.equal(other.level, 2);
  assert.ok(
    other.sections[1].rows.some((row) => row.value.it === "12"),
    "Esploratore's own AC 12 at level 2",
  );
  assert.ok(JSON.stringify(other).includes("10 (3d6)"));
  assert.ok(!JSON.stringify(other).includes("Scimitarra"));
  assert.equal(h.rolls().rolls.length, 1);
  // Failure: Livia is blocked at level 2 until new information or the DM.
  const fail = h.run((s, k, r) =>
    D.study(
      s,
      k,
      r,
      { actorId: "livia", targetId: "goblin-1", mode: "physical", faces: [2] },
      "player",
      () => 1,
    ),
  );
  assert.equal(fail.success, false);
  const blocked = D.studyPreview(h.ctx.state, "livia", "goblin-1", "player");
  assert.equal(blocked.available, false);
  assert.equal(blocked.reasons[0].code, "tried");
  assert.throws(
    () =>
      h.run((s, k, r) =>
        D.study(
          s,
          k,
          r,
          { actorId: "livia", targetId: "goblin-1", mode: "physical", faces: [20] },
          "player",
          () => 1,
        ),
      ),
    /already failed/,
  );
  assert.throws(
    () => h.run((s, k) => D.allowRetry(s, k, { kindId: GOBLIN, actorId: "livia" }, "player")),
    /Only the DM/,
  );
  h.run((s, k) => D.allowRetry(s, k, { kindId: GOBLIN, actorId: "livia" }, "dm"), "dm");
  assert.equal(D.studyPreview(h.ctx.state, "livia", "goblin-1", "player").available, true);
  // DM grants level 3; lowering needs a reason and is recorded as a correction.
  h.run((s, k) => D.grantLevel(s, k, { kindId: GOBLIN, level: 3 }, "dm"), "dm");
  assert.equal(D.examineView(h.ctx.state, "goblin-1", "player").sections.length, 3);
  assert.throws(
    () => h.run((s, k) => D.grantLevel(s, k, { kindId: GOBLIN, level: 2 }, "dm"), "dm"),
    /needs a reason/,
  );
  h.run(
    (s, k) =>
      D.grantLevel(s, k, { kindId: GOBLIN, level: 2, reason: "Confuso con un altro goblin" }, "dm"),
    "dm",
  );
  const history = D.examineView(h.ctx.state, "goblin-1", "player").history;
  assert.deepEqual(
    history.map((e) => e.kind),
    ["check", "check", "retry", "grant", "correction"],
  );
  assert.equal(history.at(-1).reason, "Confuso con un altro goblin");
  assert.equal(history[0].dc, undefined, "players never read the lore DC");
  assert.throws(
    () => h.run((s, k) => D.grantLevel(s, k, { kindId: GOBLIN, level: 4 }, "player")),
    /Only the DM/,
  );
});

test("(1) Undo removes the level but keeps the dice; a digital retry reuses the undone faces", () => {
  const h = harness({ dice: [15] });
  const face = () => h.ctx.rollDie(20);
  h.run((s, k, r) =>
    D.study(s, k, r, { actorId: "livia", targetId: "goblin-1", mode: "digital" }, "player", face),
  );
  assert.equal(D.knowledgeLevel(h.ctx.state, GOBLIN), 2);
  h.ctx.undo();
  assert.equal(D.knowledgeLevel(h.ctx.state, GOBLIN), 1);
  assert.equal(h.rolls().rolls.length, 1, "accepted dice stay as evidence");
  const again = h.run((s, k, r) =>
    D.study(s, k, r, { actorId: "livia", targetId: "goblin-1", mode: "digital" }, "player", face),
  );
  assert.equal(again.roll.values[0], 15);
  assert.equal(again.roll.reusedFrom, h.rolls().rolls[0].id);
  assert.equal(h.dice.length, 0, "no new face was drawn");
  // Reload keeps level and history.
  h.reload();
  assert.equal(D.knowledgeLevel(h.store().state, GOBLIN), 2);
});

test("(1) campaign policy 'everything unlocked' shows all four tiers (Solasta option)", () => {
  const h = harness();
  h.run((s) => {
    s.ext["core-settings"] ??= { personal: {}, campaign: {} };
    s.ext["core-settings"].campaign ??= {};
    s.ext["core-settings"].campaign[`${D.POLICY}.mode`] = "full";
  }, "dm");
  assert.equal(D.examineView(h.ctx.state, "goblin-1", "player").sections.length, 4);
});

// ------------------------------------------------------------------ (2) hidden identity
test("(2) 'Figura incappucciata' replaces the name for players until the DM reveals it", () => {
  const h = harness();
  assert.throws(
    () =>
      h.run((s, k) =>
        D.hideIdentity(s, k, { actorId: "goblin-2", alias: "Figura incappucciata" }, "player"),
      ),
    /Only the DM/,
  );
  assert.throws(
    () =>
      h.run(
        (s, k) => D.hideIdentity(s, k, { actorId: "goblin-2", alias: "Sentinella" }, "dm"),
        "dm",
      ),
    /already has this name/,
  );
  h.run(
    (s, k) => D.hideIdentity(s, k, { actorId: "goblin-2", alias: "Figura incappucciata" }, "dm"),
    "dm",
  );
  const state = h.ctx.state;
  assert.equal(
    state.actors["goblin-2"].name,
    "Figura incappucciata",
    "order, log and chat read the shared name",
  );
  assert.equal(JSON.stringify(state.actors["goblin-2"]).includes("Esploratore"), false);
  const player = D.examineView(state, "goblin-2", "player");
  assert.equal(player.identityHidden, true);
  assert.equal(player.kindId, null);
  assert.equal(player.sections.length, 0);
  assert.ok(
    !JSON.stringify(player).includes("Esploratore") && !JSON.stringify(player).includes("Goblin"),
  );
  assert.equal(
    D.studyPreview(state, "livia", "goblin-2", "player").reasons[0].code,
    "identity-hidden",
  );
  assert.deepEqual(D.aliasProjections(state), [
    { actorId: "goblin-2", from: "Figura incappucciata", trueName: "Esploratore" },
  ]);
  const dm = D.examineView(state, "goblin-2", "dm");
  assert.equal(dm.trueName, "Esploratore");
  // The B12 hidden name and this identity never stack.
  h.run((s) => {
    s.ext["token-menu"] = {
      tokens: {},
      groups: {},
      names: { "goblin-1": { hidden: true, trueName: "Sentinella" } },
    };
  }, "dm");
  assert.throws(
    () =>
      h.run((s, k) => D.hideIdentity(s, k, { actorId: "goblin-1", alias: "Ombra" }, "dm"), "dm"),
    /token menu/,
  );
  h.run((s, k) => D.revealIdentity(s, k, { actorId: "goblin-2" }, "dm"), "dm");
  assert.equal(h.ctx.state.actors["goblin-2"].name, "Esploratore");
  assert.deepEqual(
    h.k().events.map((e) => e.kind),
    ["identity-hidden", "identity-revealed"],
  );
  h.ctx.role = "dm";
  h.ctx.undo();
  assert.equal(
    h.ctx.state.actors["goblin-2"].name,
    "Figura incappucciata",
    "Undo puts the alias back",
  );
});

// ------------------------------------------------------------------ (3) stealth
test("(3) Hide needs concealment and no enemy's sight; the DM may allow it with a reason", () => {
  const h = harness();
  const open = D.stealthAssessment(h.ctx.state, "livia", "player");
  assert.equal(open.eligible, false);
  assert.deepEqual(
    open.reasons.map((r) => r.code),
    ["exposed", "seen"],
  );
  assert.ok(
    open.rows.every((row) => !("passive" in row)),
    "players never read who notices",
  );
  assert.throws(
    () =>
      h.run((s, k, r) =>
        D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
      ),
    /Heavily Obscured/,
  );
  // The lantern tower at night: total cover from both goblins, nobody sees her.
  h.scene("lantern-tower");
  const tower = D.stealthAssessment(h.ctx.state, "livia", "player");
  assert.equal(tower.obscurity, "light");
  assert.equal(tower.eligible, true);
  assert.equal(tower.rows.length, 0, "the fog (B35) hides both goblins from the player");
  assert.ok(tower.rows.every((row) => row.cover === "total" && !row.sees));
  const hidden = h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
  );
  assert.equal(hidden.total, 17, "Dexterity 14 (+2) and a 15");
  assert.equal(hidden.success, true);
  assert.ok(hasCondition(h.ctx.state.actors.livia, "invisible"));
  assert.equal(h.k().hidden.livia.total, 17);
  // Who noticed her: only the DM reads passive Perception against 17.
  const dm = D.stealthAssessment(h.ctx.state, "livia", "dm");
  assert.deepEqual(
    dm.rows.map((r) => [r.name, r.passive, r.notices]),
    [
      ["Esploratore", 11, false],
      ["Sentinella", 11, false],
    ],
  );
  assert.ok(
    D.stealthAssessment(h.ctx.state, "livia", "player").rows.every(
      (row) => row.notices === undefined,
    ),
  );
  // DM override in the open courtyard for Doran, with a reason.
  h.scene("old-watch");
  assert.throws(
    () =>
      h.run(
        (s, k, r) =>
          D.hide(s, k, r, { actorId: "doran", mode: "physical", faces: [20] }, "dm", () => 1),
        "dm",
      ),
    /Heavily Obscured/,
  );
  const allowed = h.run(
    (s, k, r) =>
      D.hide(
        s,
        k,
        r,
        { actorId: "doran", mode: "physical", faces: [12], dmReason: "Fumo denso del braciere" },
        "dm",
        () => 1,
      ),
    "dm",
  );
  assert.equal(allowed.success, false, "12 + 0 is below DC 15");
  assert.equal(h.k().events.at(-1).kind, "hide-failed");
});

test("(3) hiding ends with an explained reason: attack, speech, found, chosen; DM keeps it with a reason", () => {
  const h = harness();
  h.scene("lantern-tower");
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
  );
  // A whispered chat line keeps her hidden; speaking aloud does not.
  h.run((s) => {
    s.ext.chat ??= { messages: [] };
    s.ext.chat.messages ??= [];
    s.ext.chat.messages.push({
      id: "m1",
      seq: 900,
      kind: "ic",
      speaker: { type: "actor", actorId: "livia" },
      range: { id: "whisper" },
    });
  });
  assert.deepEqual(D.detectLosses(h.ctx.state), []);
  // A private message to the DM is not speech in the scene either.
  h.run((s) => {
    s.ext.chat.messages.push({
      id: "m1b",
      seq: 900,
      kind: "ic",
      speaker: { type: "actor", actorId: "livia" },
      to: { type: "dm" },
      range: null,
    });
  });
  assert.deepEqual(D.detectLosses(h.ctx.state), []);
  h.run((s) => {
    s.ext.chat.messages.push({
      id: "m2",
      seq: 901,
      kind: "ic",
      speaker: { type: "actor", actorId: "livia" },
      range: { id: "talk" },
    });
  });
  assert.deepEqual(
    D.detectLosses(h.ctx.state).map((l) => [l.reason, l.triggerId]),
    [["sound", "m2"]],
  );
  const ended = K.runLossCheck(h.ctx);
  assert.equal(ended[0].reason, "sound");
  assert.equal(h.k().hidden.livia, undefined);
  assert.ok(!hasCondition(h.ctx.state.actors.livia, "invisible"), "the Invisible from hiding ends");
  const loss = h.k().events.at(-1);
  assert.equal(loss.kind, "lost");
  assert.match(
    h.ctx.state.log.at(-1).label,
    /Non più nascosta: Livia \(ha parlato più forte di un sussurro\)/,
  );
  // DM correction: she stays hidden (a reason is required), the same line is ignored after.
  assert.throws(
    () => h.run((s, k) => D.keepHidden(s, k, { eventId: loss.id, reason: "" }, "dm"), "dm"),
    /reason/,
  );
  h.run(
    (s, k) => D.keepHidden(s, k, { eventId: loss.id, reason: "Il vento copre la voce" }, "dm"),
    "dm",
  );
  assert.ok(h.k().hidden.livia);
  assert.deepEqual(D.detectLosses(h.ctx.state), []);
  // An attack attempt is a loss (the attack itself is rolled while Invisible).
  h.run((s) => {
    s.combatAttempts ??= [];
    s.combatAttempts.push({
      id: "att-1",
      actorId: "livia",
      actionId: "fire-bolt",
      actionName: { it: "Dardo di fuoco", en: "Fire Bolt" },
      kind: "attack",
      requests: [{ kind: "attack" }],
      outcomes: [],
      targets: [],
    });
  });
  assert.deepEqual(
    D.detectLosses(h.ctx.state).map((l) => l.reason),
    ["attack"],
  );
  K.runLossCheck(h.ctx);
  assert.equal(h.k().events.at(-1).reason, "attack");
  // Found by an enemy (DM), and stopping by choice.
  h.run((s) => {
    s.combatAttempts = [];
  });
  h.run(
    (s, k) =>
      D.keepHidden(s, k, { eventId: h.k().events.at(-1).id, reason: "Nessuno l'ha vista" }, "dm"),
    "dm",
  );
  h.run((s, k) => D.dmEndHidden(s, k, { actorId: "livia", finderId: "goblin-1" }, "dm"), "dm");
  assert.deepEqual(
    [h.k().events.at(-1).reason, h.k().events.at(-1).detail.finderId],
    ["found", "goblin-1"],
  );
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [18] }, "player", () => 1),
  );
  assert.throws(
    () => h.run((s, k) => D.stopHiding(s, k, { actorId: "livia" }, "dm_not_controller")),
    /do not control/,
  );
  h.run((s, k) => D.stopHiding(s, k, { actorId: "livia", reason: "chosen" }, "player"));
  assert.equal(h.k().events.at(-1).reason, "chosen");
  // A removed Invisible condition (conditions panel) is reconciled as a loss too.
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [18] }, "player", () => 1),
  );
  h.run((s) => {
    s.actors.livia.conditions = [];
  });
  assert.deepEqual(
    D.detectLosses(h.ctx.state).map((l) => l.reason),
    ["condition"],
  );
});

test("(3) Search: a Perception total that meets the Stealth total finds the hidden creature", () => {
  const h = harness();
  h.scene("lantern-tower");
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
  );
  // Behind Total Cover the goblin finds nobody, whatever the roll.
  const blind = h.run(
    (s, k, r) =>
      D.search(s, k, r, { finderId: "goblin-1", mode: "physical", faces: [20] }, "dm", () => 1),
    "dm",
  );
  assert.deepEqual(blind.found, []);
  h.move("goblin-1", 330, 440);
  const miss = h.run(
    (s, k, r) =>
      D.search(s, k, r, { finderId: "goblin-1", mode: "physical", faces: [10] }, "dm", () => 1),
    "dm",
  );
  assert.deepEqual([miss.total, miss.found], [11, []]);
  const hit = h.run(
    (s, k, r) =>
      D.search(s, k, r, { finderId: "goblin-1", mode: "physical", faces: [16] }, "dm", () => 1),
    "dm",
  );
  assert.deepEqual(hit.found, ["livia"]);
  assert.equal(h.k().events.find((e) => e.kind === "lost").detail.total, 17);
  assert.equal(h.rolls().rolls.at(-1).visibility, "private", "the DM's search roll stays private");
});

// ------------------------------------------------------------------ (4) cover, (6) modifiers and %
test("(4) Half cover from a creature adds +2 AC in the attack detail and in the resolution", () => {
  const h = harness();
  h.move("goblin-1", 500, 360);
  h.run((s) => {
    s.combat.active = true;
    s.combat.turn = 0;
  }, "dm");
  const preview = previewAction(
    h.ctx.state,
    "livia",
    "fire-bolt",
    { targetIds: ["goblin-2"] },
    "player",
  );
  const row = preview.rollReasons.find((r) => r.mode === "target-ac");
  assert.deepEqual([row.code, row.acBonus, row.name.it], ["cover-half", 2, "Mezza copertura"]);
  assert.equal(
    preview.rollReasons.some((r) => r.code === "hit-chance"),
    false,
    "policy 'never' hides the %",
  );
  const draft = structuredClone(h.ctx.state);
  beginAttempt(
    draft,
    {
      id: "a1",
      actorId: "livia",
      actionId: "fire-bolt",
      selection: { targetIds: ["goblin-2"] },
      mode: "physical",
    },
    "player",
  );
  const attempt = draft.combatAttempts.at(-1);
  assert.equal(attempt.targets[0].targetAC, 14, "Esploratore AC 12 + 2");
  assert.equal(
    attempt.requests[0].modifier,
    D.attackBonusFor(draft.actors.livia, { id: "fire-bolt" }),
  );
  // Total cover: the target can't be targeted directly.
  h.move("goblin-1", 740, 400);
  h.run((s) => {
    const scene = s.scenes.find((sc) => sc.id === "old-watch");
    scene.walls.push({
      id: "k-test-wall",
      kind: "wall",
      a: { x: 700, y: 250 },
      b: { x: 700, y: 430 },
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      source: { kind: "authored-demo", revision: "test" },
    });
  }, "dm");
  const walled = previewAction(
    h.ctx.state,
    "livia",
    "fire-bolt",
    { targetIds: ["goblin-2"] },
    "player",
  );
  assert.ok(walled.reasons.some((r) => r.code === "total-cover"));
  assert.equal(walled.available, false);
});

test("(6) modifiers under the target and the hit chance only as the disclosure policy allows", () => {
  const h = harness();
  h.move("goblin-1", 500, 360);
  const rows = D.targetModifiers(h.ctx.state, "livia", "goblin-2", "player");
  assert.deepEqual(
    rows.map((r) => r.code),
    ["cover"],
  );
  assert.equal(rows[0].text.it, "Mezza copertura · CA +2");
  const action = { id: "fire-bolt" };
  const ctxRows = (role) =>
    D.attackRows(h.ctx.state, "livia", "goblin-2", action, {
      role,
      rollMode: "normal",
      modifier: 0,
    });
  assert.equal(
    ctxRows("player").some((r) => r.code === "hit-chance"),
    false,
  );
  // DM always; a "known" policy needs knowledge level 2; "always" like BG3.
  const dmChance = ctxRows("dm").find((r) => r.code === "hit-chance");
  // +5 against AC 14: 12 faces of 20 hit (9..20 minus none) → 60%.
  assert.equal(dmChance.name.it, "Probabilità di colpire: 60%");
  const setPolicy = (value) =>
    h.run((s) => {
      s.ext["core-settings"] ??= { personal: {}, campaign: {} };
      s.ext["core-settings"].campaign ??= {};
      s.ext["core-settings"].campaign[`${D.POLICY}.hit-chance`] = value;
    }, "dm");
  setPolicy("known");
  assert.equal(
    ctxRows("player").some((r) => r.code === "hit-chance"),
    false,
  );
  h.run((s, k) => D.grantLevel(s, k, { kindId: GOBLIN, level: 2 }, "dm"), "dm");
  assert.equal(
    ctxRows("player").some((r) => r.code === "hit-chance"),
    true,
  );
  setPolicy("always");
  assert.equal(D.hitChance(5, 14, "advantage").toFixed(2), "0.84");
  assert.equal(D.hitChance(5, 14, "disadvantage").toFixed(2), "0.36");
  assert.equal(D.hitChance(-5, 30), 0.05, "a natural 20 always hits");
  assert.equal(D.hitChance(20, 5), 0.95, "a natural 1 always misses");
  // Hidden attacker: the goblin can't see her (advantage), per SRD Unseen Attackers.
  h.scene("lantern-tower");
  const unseen = D.targetModifiers(h.ctx.state, "livia", "goblin-1", "player").map((r) => r.code);
  assert.deepEqual(unseen, ["cover", "unseen-attacker", "unseen-target"]);
});

// ------------------------------------------------------------------ (5) line of sight
test("(5) line-of-sight check: private in the viewer's UI, public when shared, removable", () => {
  const h = harness();
  h.scene("lantern-tower");
  const scene = D.activeScene(h.ctx.state);
  const closed = D.losCheck(
    h.ctx.state,
    scene,
    { actorId: "livia" },
    { actorId: "goblin-2" },
    "player",
  );
  assert.equal(closed.degree, "total");
  h.run((s) => {
    s.scenes
      .find((sc) => sc.id === "lantern-tower")
      .walls.find((w) => w.id === "tower-store-door").doorState = "open";
  }, "dm");
  h.move("livia", 425, 325);
  const partial = D.losCheck(
    h.ctx.state,
    D.activeScene(h.ctx.state),
    { actorId: "livia" },
    { actorId: "goblin-2" },
    "player",
  );
  assert.equal(partial.degree, "three-quarters");
  // The DM reads the cover against every enemy; a player only against the enemies the fog
  // and vision (B35) let them see: from here Livia does not see the Scout in the store.
  assert.deepEqual(
    D.coverAtDestination(h.ctx.state, "livia", { x: 225, y: 475 }, "dm").find(
      (r) => r.id === "goblin-2",
    ).degree,
    "half",
  );
  assert.deepEqual(D.coverAtDestination(h.ctx.state, "livia", { x: 225, y: 475 }, "player"), []);
  const entry = h.run((s, k) =>
    D.shareCheck(
      s,
      k,
      { sceneId: "lantern-tower", from: { actorId: "livia" }, to: { actorId: "goblin-2" } },
      "player",
    ),
  );
  assert.equal(h.k().shared["lantern-tower"].length, 1);
  assert.throws(
    () =>
      h.run((s, k) =>
        D.removeCheck(s, k, { sceneId: "lantern-tower", id: entry.id }, "someone-else"),
      ),
    /author or the DM/,
  );
  h.run((s, k) => D.removeCheck(s, k, { sceneId: "lantern-tower", id: entry.id }, "dm"), "dm");
  assert.equal(h.k().shared["lantern-tower"].length, 0);
});

// ------------------------------------------------------------------ (7) pickpocket
test("(7) pickpocket: request, DM decision, Sleight of Hand, item in the inventory, correction", () => {
  const h = harness();
  assert.deepEqual(D.pickpocketThieves(h.ctx.state, "goblin-1", "player"), []);
  h.move("livia", 570, 250);
  assert.deepEqual(D.pickpocketThieves(h.ctx.state, "goblin-1", "player"), ["livia"]);
  const request = h.run((s, k) =>
    D.requestPickpocket(
      s,
      k,
      { thiefId: "livia", targetId: "goblin-1", intent: "take", wish: "la chiave" },
      "player",
    ),
  );
  assert.throws(
    () =>
      h.run((s, k) =>
        D.requestPickpocket(
          s,
          k,
          { thiefId: "livia", targetId: "goblin-1", intent: "take", wish: "altro" },
          "player",
        ),
      ),
    /already under way/,
  );
  assert.throws(
    () =>
      h.run((s, k) =>
        D.decidePickpocket(s, k, { requestId: request.id, allow: true, dc: 11 }, "player"),
      ),
    /Only the DM/,
  );
  assert.equal(D.passiveOf(h.ctx.state, "goblin-1"), 11);
  h.run(
    (s, k) =>
      D.decidePickpocket(
        s,
        k,
        {
          requestId: request.id,
          allow: true,
          dc: 11,
          loot: { mode: "new", name: "Chiave di ottone della torre" },
        },
        "dm",
      ),
    "dm",
  );
  const projected = D.projectPickpocket(h.ctx.state, h.k().pickpocket[0], "player");
  assert.equal(projected.dc, undefined, "the player never reads the DC");
  assert.equal(projected.loot, undefined, "nor what is in reach before succeeding");
  const rolled = h.run((s, k, r) =>
    D.rollPickpocket(
      s,
      k,
      r,
      { requestId: request.id, mode: "physical", faces: [10] },
      "player",
      () => 1,
    ),
  );
  assert.equal(rolled.roll.total, 12, "Dexterity 14 (+2) and a 10");
  assert.equal(rolled.success, true);
  const key = h.ctx.state.actors.livia.inventory.find(
    (row) => row.name === "Chiave di ottone della torre",
  );
  assert.ok(key, "the key appears in Livia's inventory");
  assert.throws(
    () =>
      h.run((s, k) => D.revertPickpocket(s, k, { requestId: request.id, reason: "" }, "dm"), "dm"),
    /reason/,
  );
  h.run(
    (s, k) =>
      D.revertPickpocket(
        s,
        k,
        { requestId: request.id, reason: "La chiave era un'illusione" },
        "dm",
      ),
    "dm",
  );
  assert.ok(
    !h.ctx.state.actors.livia.inventory.some((row) => row.name === "Chiave di ottone della torre"),
  );
  // Reverse pickpocket: a potion slipped into the goblin's pocket; failure, DM decides.
  const plant = h.run((s, k) =>
    D.requestPickpocket(
      s,
      k,
      { thiefId: "livia", targetId: "goblin-1", intent: "plant", itemId: "potion" },
      "player",
    ),
  );
  h.run(
    (s, k) => D.decidePickpocket(s, k, { requestId: plant.id, allow: true, dc: 15 }, "dm"),
    "dm",
  );
  const failed = h.run((s, k, r) =>
    D.rollPickpocket(
      s,
      k,
      r,
      { requestId: plant.id, mode: "physical", faces: [3] },
      "player",
      () => 1,
    ),
  );
  assert.equal(failed.success, false);
  assert.equal(h.ctx.state.actors.livia.inventory.find((row) => row.id === "potion").quantity, 3);
  h.run((s, k) => D.settlePickpocket(s, k, { requestId: plant.id, noticed: true }, "dm"), "dm");
  assert.deepEqual(h.k().pickpocket.at(-1).outcome, { success: false, noticed: true });
  const again = h.run((s, k) =>
    D.requestPickpocket(
      s,
      k,
      { thiefId: "livia", targetId: "goblin-1", intent: "plant", itemId: "potion" },
      "player",
    ),
  );
  h.run(
    (s, k) => D.decidePickpocket(s, k, { requestId: again.id, allow: true, dc: 10 }, "dm"),
    "dm",
  );
  h.run((s, k, r) =>
    D.rollPickpocket(
      s,
      k,
      r,
      { requestId: again.id, mode: "physical", faces: [15] },
      "player",
      () => 1,
    ),
  );
  assert.equal(h.ctx.state.actors.livia.inventory.find((row) => row.id === "potion").quantity, 2);
  assert.equal(h.ctx.state.actors["goblin-1"].inventory.at(-1).quantity, 1);
  // Refusal needs a reason; "nothing like that" ends without a roll.
  const third = h.run((s, k) =>
    D.requestPickpocket(
      s,
      k,
      { thiefId: "livia", targetId: "goblin-1", intent: "take", wish: "monete" },
      "player",
    ),
  );
  assert.throws(
    () =>
      h.run((s, k) => D.decidePickpocket(s, k, { requestId: third.id, allow: false }, "dm"), "dm"),
    /reason/,
  );
  h.run(
    (s, k) =>
      D.decidePickpocket(
        s,
        k,
        { requestId: third.id, allow: true, loot: { mode: "nothing" } },
        "dm",
      ),
    "dm",
  );
  assert.equal(h.k().pickpocket.at(-1).status, "done");
});

// ------------------------------------------------------------------ UI handlers
test("UI: Creature tab blocks by role, Examine/Study/Hide dialogs, LOS check and share", () => {
  const h = harness({ dice: [] });
  // Player looking at a goblin: knowledge, modifiers, line of sight.
  let p = panel(h, "goblin-1");
  assert.match(p.text, /Conoscenza 1\/4 · Goblin guerriero/);
  assert.match(p.text, /Modificatori contro questo bersaglio/);
  let ui = p.mount();
  ui.click("[data-knowledge-examine]");
  assert.match(plain(h.dialogs.at(-1).body), /Riconoscimento/);
  ui.click("[data-knowledge-study]");
  assert.match(h.dialogs.at(-1).title, /Studio · Sentinella/);
  h.submit({ actor: "livia", diceMode: "physical", face0: "12" });
  assert.equal(D.knowledgeLevel(h.ctx.state, GOBLIN), 2);
  assert.equal(h.ctx.state.log.at(-1).rolls[0].source, "knowledge", "the roll joins the log entry");
  assert.equal(h.events.at(-1).roll.total, 15, "and is announced with roll-accepted");
  ui.click("[data-knowledge-los-check]");
  p = panel(h, "goblin-1");
  assert.match(p.text, /Linea di vista \(privata\)/);
  p.mount().click("[data-knowledge-los-share]");
  assert.equal(h.k().shared["old-watch"].length, 1);
  assert.match(panel(h, "goblin-1").text, /Linee di vista condivise/);
  // Player on Livia: stealth block with the reasons she cannot hide in the open.
  p = panel(h, "livia");
  assert.match(p.text, /Furtività Visibile · Luce intensa/);
  assert.match(p.text, /Sentinella · ti vede · scoperta/);
  assert.match(
    p.html,
    /data-knowledge-hide="livia" disabled aria-describedby="knowledge-why-livia"/,
  );
  // The token menu still opens the dialog with the reasons, without a roll.
  K.openHide(h.ctx, "livia");
  assert.equal(
    h.dialogs.at(-1).options.onSubmit,
    undefined,
    "no roll offered when the rules forbid it",
  );
  // DM: identity from the Creature tab and allow-anyway hiding with a reason.
  h.ctx.role = "dm";
  p = panel(h, "goblin-2");
  p.mount().click("[data-knowledge-conceal]");
  h.submit({ alias: "Figura incappucciata" });
  assert.equal(h.ctx.state.actors["goblin-2"].name, "Figura incappucciata");
  h.ctx.role = "player";
  assert.match(panel(h, "goblin-2").text, /Identità sconosciuta/);
  h.ctx.role = "dm";
  panel(h, "doran").mount().click("[data-knowledge-hide]");
  h.submit({ dmReason: "Nebbia fitta", diceMode: "physical", face0: "17" });
  assert.equal(h.k().hidden.doran.dmReason, "Nebbia fitta");
  assert.match(
    panel(h, "doran").text,
    /Nascosta · CD per trovarla 19 · consentito dal DM: Nebbia fitta/,
  );
});

test("UI: pickpocket through dialogs and the bell; notifications by role", () => {
  const h = harness();
  h.move("livia", 570, 250);
  const menu = h.registry
    .list("token-menu", h.ctx, { actorId: "goblin-1", sceneId: "old-watch" })
    .map((c) => c.id);
  assert.ok(menu.includes("knowledge-pickpocket"));
  K.openPickpocket(h.ctx, "goblin-1");
  h.submit({ thief: "livia", intent: "take", wish: "la chiave" });
  const notices = (role) => {
    h.ctx.role = role;
    return h.registry.notifications(h.ctx).filter((n) => String(n.id).startsWith("knowledge"));
  };
  assert.equal(notices("dm")[0].title.it, "Livia vuole borseggiare Sentinella");
  assert.equal(notices("player").length, 0);
  h.ctx.role = "dm";
  panel(h, "goblin-1").mount().click("[data-knowledge-decide]");
  h.submit({ allow: "yes", dc: "11", loot: "new", lootName: "Chiave di ottone della torre" });
  assert.equal(notices("player")[0].title.it, "Il DM consente il borseggio di Livia");
  h.ctx.role = "player";
  panel(h, "livia").mount().click("[data-knowledge-pickroll]");
  h.submit({ diceMode: "physical", face0: "14" });
  assert.ok(
    h.ctx.state.actors.livia.inventory.some((row) => row.name === "Chiave di ottone della torre"),
  );
  assert.match(panel(h, "livia").text, /riuscito: Chiave di ottone della torre · 16/);
});

// ------------------------------------------------------------------ actions in combat, secrecy
test("in initiative Study and Hide are actions on the creature's turn; a DM creature hides in secret", () => {
  const h = harness();
  h.run((s) => {
    s.combat.active = true;
    s.combat.order = ["goblin-1", "livia", "doran", "goblin-2"];
    s.combat.turn = 0;
  }, "dm");
  assert.throws(
    () =>
      h.run((s, k, r) =>
        D.study(
          s,
          k,
          r,
          { actorId: "livia", targetId: "goblin-1", mode: "physical", faces: [12] },
          "player",
          () => 1,
        ),
      ),
    /this creature's turn/,
  );
  h.run((s) => {
    s.combat.turn = 1;
  }, "dm");
  h.run((s, k, r) =>
    D.study(
      s,
      k,
      r,
      { actorId: "livia", targetId: "goblin-1", mode: "physical", faces: [12] },
      "player",
      () => 1,
    ),
  );
  assert.equal(h.ctx.state.actors.livia.action, false, "the Study action is spent");
  assert.throws(
    () =>
      h.run((s, k, r) =>
        D.search(s, k, r, { finderId: "livia", mode: "physical", faces: [5] }, "player", () => 1),
      ),
    /Action already spent/,
  );
  // The DM hides the Scout (DM override in the open courtyard, off-turn outside initiative).
  h.run((s) => {
    s.combat.active = false;
  }, "dm");
  h.run(
    (s, k, r) =>
      D.hide(
        s,
        k,
        r,
        { actorId: "goblin-2", mode: "physical", faces: [14], dmReason: "Dietro il carro" },
        "dm",
        () => 1,
      ),
    "dm",
  );
  const invisible = h.ctx.state.actors["goblin-2"].conditions.find((c) => c.id === "invisible");
  assert.equal(invisible.visibility, "private", "players do not learn that the Scout is hiding");
  assert.equal(h.rolls().rolls.at(-1).visibility, "private");
  // Only its controllers and the DM see the hidden mark on the map.
  const layer = h.registry.get("map-layer", "knowledge-marks");
  const tv = { scene: D.activeScene(h.ctx.state), selectedActorId: "livia" };
  assert.match(
    layer.svg(
      { ...h.ctx, role: "dm", canControl: (a) => canControlActor(a, "dm", h.ctx.state) },
      tv,
    ),
    /data-knowledge-hidden-mark="goblin-2"/,
  );
  assert.doesNotMatch(layer.svg(h.ctx, tv), /data-knowledge-hidden-mark="goblin-2"/);
  // The DM's stealth block reminds that the token itself is still on the players' map.
  h.ctx.role = "dm";
  assert.match(panel(h, "goblin-2").text, /La pedina resta sulla mappa dei giocatori/);
});

// ------------------------------------------------------------------ review (B46-rf) fixes
test("review: a player cannot hide from an enemy she cannot perceive; the refusal names nobody", () => {
  const h = harness();
  // As if the fog (B35) hid both goblins from the player while they still see her.
  const remove = D.addVisibilityFilter(
    (state, id, role) => role === "dm" || !String(id).startsWith("goblin"),
  );
  try {
    const mine = D.stealthAssessment(h.ctx.state, "livia", "player");
    assert.equal(mine.rows.length, 0, "the player knows of no enemy");
    assert.equal(mine.eligible, true, "so her own view cannot tell why she would fail");
    assert.equal(D.stealthAssessment(h.ctx.state, "livia", "dm").eligible, false);
    assert.throws(
      () =>
        h.run((s, k, r) =>
          D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [20] }, "player", () => 1),
        ),
      (error) => {
        assert.equal(error.code, "not-out-of-sight");
        assert.doesNotMatch(`${error.it} ${error.en}`, /Sentinella|Esploratore/);
        return true;
      },
    );
    assert.equal(h.k().hidden.livia, undefined);
    assert.equal(h.rolls().rolls.length, 0, "a refused Hide spends no die");
    assert.ok(!hasCondition(h.ctx.state.actors.livia, "invisible"));
    // The same refusal through the dialog; the DM may still allow it with a reason.
    K.openHide(h.ctx, "livia");
    assert.throws(
      () => h.submit({ diceMode: "physical", face0: "20" }),
      /fuori dalla vista di ogni nemico/,
    );
    const allowed = h.run(
      (s, k, r) =>
        D.hide(
          s,
          k,
          r,
          { actorId: "livia", mode: "physical", faces: [20], dmReason: "Nebbia fitta" },
          "dm",
          () => 1,
        ),
      "dm",
    );
    assert.equal(allowed.success, true);
  } finally {
    remove();
  }
});

test("review: Examine names conditions in the viewer's language and tier 3 lists saving throws", () => {
  const h = harness();
  h.run((s) => {
    s.actors["goblin-1"].conditions = ["prone"];
  }, "dm");
  K.openExamine(h.ctx, "goblin-1");
  const it = plain(h.dialogs.at(-1).body);
  assert.match(it, /Piccola · Prono/);
  assert.doesNotMatch(it, /\bprone\b/);
  h.ctx.lang = "en";
  K.openExamine(h.ctx, "goblin-1");
  assert.match(plain(h.dialogs.at(-1).body), /Small · Prone/);
  // Tier 3 promises "saving throws": the row is there, from the live sheet (Dex 14 → +2).
  const dm = D.examineView(h.ctx.state, "goblin-1", "dm");
  const saves = dm.sections[2].rows.find((row) => row.label.en === "Saving throws");
  assert.ok(saves, "tier 3 shows the saving throws it announces");
  assert.match(saves.value.it, /Des \+2/);
  assert.match(saves.value.en, /Dex \+2/);
  assert.ok(
    !JSON.stringify(D.examineView(h.ctx.state, "goblin-1", "player")).includes("Saving throws"),
    "players at 1/4 never read them",
  );
});

test("review: the pickpocket dialog lists the chosen thief's own items", () => {
  const h = harness();
  h.move("livia", 570, 250);
  h.move("mira", 670, 250);
  assert.deepEqual(D.pickpocketThieves(h.ctx.state, "goblin-1", "player").sort(), [
    "livia",
    "mira",
  ]);
  const own = (id) =>
    (h.ctx.state.actors[id].inventory ?? [])
      .filter((row) => row.quantity > 0 && !row.equipped)
      .map((row) => row.id);
  K.openPickpocket(h.ctx, "goblin-1", "mira");
  const body = h.dialogs.at(-1).body;
  assert.match(body, /<option value="mira" selected>/);
  for (const id of own("livia"))
    if (!own("mira").includes(id))
      assert.doesNotMatch(body, new RegExp(`<option value="${id}">`), `Livia's ${id} listed`);
  // Changing the thief in the dialog reopens it with that thief's items (like Study).
  const before = h.dialogs.length;
  assert.equal(h.submit({ thief: "livia", intent: "plant", item: own("mira")[0] ?? "" }), false);
  assert.equal(h.dialogs.length, before + 1);
  assert.match(h.dialogs.at(-1).body, /<option value="livia" selected>/);
  for (const id of own("livia"))
    assert.match(h.dialogs.at(-1).body, new RegExp(`<option value="${id}">`));
});

test("review: a DM creature's secret hiding ends in the DM's private log; a PC's loss is shared", () => {
  const h = harness({ role: "dm" });
  h.run(
    (s, k, r) =>
      D.hide(
        s,
        k,
        r,
        { actorId: "goblin-2", mode: "physical", faces: [14], dmReason: "Dietro il carro" },
        "dm",
        () => 1,
      ),
    "dm",
  );
  h.run((s) => {
    s.combatAttempts ??= [];
    s.combatAttempts.push({
      id: "att-g",
      actorId: "goblin-2",
      actionId: "scimitar",
      kind: "attack",
      requests: [{ kind: "attack" }],
      outcomes: [],
      targets: [],
    });
  }, "dm");
  K.runLossCheck(h.ctx);
  assert.equal(h.k().hidden["goblin-2"], undefined);
  assert.match(h.ctx.state.log.at(-1).label, /Esploratore/);
  assert.equal(h.ctx.state.log.at(-1).visibility, "private", "players never learn it hid");
  // The DM's own buttons on a secret hider stay private too.
  h.run(
    (s, k, r) =>
      D.hide(
        s,
        k,
        r,
        { actorId: "goblin-2", mode: "physical", faces: [14], dmReason: "Dietro il carro" },
        "dm",
        () => 1,
      ),
    "dm",
  );
  panel(h, "goblin-2").mount().click("[data-knowledge-dm-end]");
  h.submit({ reason: "Si allontana" });
  assert.equal(h.k().events.at(-1).kind, "lost");
  assert.equal(h.ctx.state.log.at(-1).visibility, "private");
  // Livia's loss (a player character) stays in the shared log.
  h.ctx.role = "player";
  h.scene("lantern-tower");
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
  );
  panel(h, "livia").mount().click("[data-knowledge-noise]");
  assert.equal(h.ctx.state.log.at(-1).visibility, "shared");
});

test("review: one Undo reverts an attack made from hiding together with the loss it caused", () => {
  const h = harness();
  h.scene("lantern-tower");
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
  );
  h.run((s) => {
    s.combatAttempts ??= [];
    s.combatAttempts.push({
      id: "att-1",
      actorId: "livia",
      actionId: "fire-bolt",
      actionName: { it: "Dardo di fuoco", en: "Fire Bolt" },
      kind: "attack",
      requests: [{ kind: "attack" }],
      outcomes: [],
      targets: [],
    });
  });
  K.runLossCheck(h.ctx);
  assert.equal(h.k().hidden.livia, undefined);
  assert.match(h.ctx.state.log.at(-1).label, /Non più nascosta: Livia/);
  h.ctx.undo();
  assert.ok(
    !(h.ctx.state.combatAttempts ?? []).some((a) => a.id === "att-1"),
    "the attack is what Undo reverts",
  );
  assert.ok(h.k().hidden.livia, "and she is hidden again, as before the attack");
  assert.ok(hasCondition(h.ctx.state.actors.livia, "invisible"));
  assert.deepEqual(D.detectLosses(h.ctx.state), [], "no stale loss waits for the next change");
  assert.ok(
    h.ctx.state.log.some((entry) => /Non più nascosta: Livia/.test(entry.label)),
    "the explained loss stays in the log's history",
  );
});

test("review: Study shows the reason and no roll when the rules forbid it; Search labels its app rule", () => {
  const h = harness();
  h.run((s, k, r) =>
    D.study(
      s,
      k,
      r,
      { actorId: "livia", targetId: "goblin-1", mode: "physical", faces: [1] },
      "player",
      () => 1,
    ),
  );
  K.openStudy(h.ctx, "goblin-1", "livia");
  const study = h.dialogs.at(-1);
  assert.match(plain(study.body), /ha già fallito a questo livello/);
  assert.doesNotMatch(study.body, /name="face0"/, "no dice to roll");
  assert.equal(study.options.submitLabel, undefined, "no «Tira e studia» that can only fail");
  assert.match(study.body, /data-knowledge-studier/, "another character can still be chosen");
  K.openSearch(h.ctx, "livia");
  assert.match(plain(h.dialogs.at(-1).body), /Regola dell'app: .*copertura totale/);
});

test("review: a name hidden from the token menu (B12) is an unknown identity: Examine never names the profile", () => {
  const h = harness();
  // B12 «Nascondi il nome ai giocatori»: the goblin becomes «Creatura sconosciuta 1».
  h.run((s) => {
    s.ext["token-menu"] ??= TM.seedSlice();
    TM.setNameHidden(s, s.ext["token-menu"], "goblin-1", true, "dm");
  }, "dm");
  assert.equal(h.ctx.state.actors["goblin-1"].name, "Creatura sconosciuta 1");
  const view = D.examineView(h.ctx.state, "goblin-1", "player");
  assert.equal(view.identityHidden, true);
  assert.equal(view.sections.length, 0);
  assert.ok(!JSON.stringify(view).includes("Goblin"), "the profile name would reveal it");
  assert.equal(view.study, null);
  K.openExamine(h.ctx, "goblin-1");
  const body = plain(h.dialogs.at(-1).body);
  assert.match(body, /Identità sconosciuta/);
  assert.doesNotMatch(body, /Goblin|Sentinella/);
  assert.equal(D.studyPreview(h.ctx.state, "livia", "goblin-1", "player").available, false);
  assert.equal(D.chanceAllowed({ ...h.ctx.state }, "player", "goblin-1"), false);
  // The DM reads the true name and is sent to the token menu to show it (no second toggle).
  h.ctx.role = "dm";
  const dm = D.examineView(h.ctx.state, "goblin-1", "dm");
  assert.equal(dm.trueName, "Sentinella");
  K.openExamine(h.ctx, "goblin-1");
  const dmBody = h.dialogs.at(-1).body;
  assert.doesNotMatch(dmBody, /data-knowledge-reveal|data-knowledge-conceal/);
  assert.match(plain(dmBody), /menu della pedina/);
  const menu = h.registry
    .list("token-menu", h.ctx, { actorId: "goblin-1", sceneId: "old-watch" })
    .map((c) => c.id);
  assert.ok(!menu.includes("knowledge-conceal"), "no «Nascondi identità…» over a hidden name");
  assert.ok(!menu.includes("knowledge-reveal"));
});

test("review: offline, shared knowledge commands are refused with a message and change nothing", () => {
  const h = harness();
  h.scene("lantern-tower");
  h.run((s, k, r) =>
    D.hide(s, k, r, { actorId: "livia", mode: "physical", faces: [15] }, "player", () => 1),
  );
  const before = JSON.stringify(h.ctx.state);
  h.ctx.offline = true;
  // A panel button: a toast, no change.
  panel(h, "livia").mount().click("[data-knowledge-unhide]");
  assert.deepEqual(h.toasts.at(-1), { text: "Sei senza rete", error: true });
  // A dialog: the error stays in the dialog (thrown to the shell), no change.
  K.openSearch(h.ctx, "livia");
  assert.throws(() => h.submit({ diceMode: "physical", face0: "12" }), /Sei senza rete/);
  // The automatic loss check waits for the network instead of failing loudly (a line said
  // aloud is due as a loss; the check refuses quietly and the next accepted change retries).
  h.ctx.state.ext.chat = {
    messages: [
      { id: "m9", seq: 999, kind: "ic", speaker: { actorId: "livia" }, range: { id: "talk" } },
    ],
  };
  assert.equal(D.detectLosses(h.ctx.state).length, 1, "a loss is due");
  assert.equal(K.runLossCheck(h.ctx), null, "but it waits for the network");
  assert.ok(h.k().hidden.livia);
  h.ctx.offline = false;
  delete h.ctx.state.ext.chat;
  assert.equal(JSON.stringify(h.ctx.state), before);
  assert.ok(h.k().hidden.livia);
});
