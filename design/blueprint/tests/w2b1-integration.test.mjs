// W2b1 integration: seams between B40 (special movement) and the core Table found by the
// wave's regression journeys. B40 intercepts the core Move to swim across the courtyard
// fountain; the core's own map modes (an action preview being aimed, a companion placement)
// must keep their clicks, and a Move released beyond the movement left stops where the
// movement runs out (the core's rule), paying double in the water. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { readFileSync } from "node:fs";
import { esc, icon } from "../ui.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { expireTurnEffects } from "../combat.mjs";
import { prepareCombatAction, cancelCombatPreview } from "../combat-ui.mjs";
import {
  confirmCompanionAppearance,
  resetMapPlacement,
  mapPlacementActive,
} from "../companion-map.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";

afterEach(() => {
  UI.resetSpecialMovesView();
  resetMapPlacement();
});

function harness() {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  assert.equal(registry.use(D.ID, UI.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    role: "player",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    // Arrow functions: the Table destructures t, label and canControl from the context.
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value),
    canControl: (actor) => !!actor && (ctx.role === "dm" || actor.owner === ctx.role),
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog() {},
    closeDialog() {},
    render() {},
    navigate(page) {
      this.view = { page, id: "", tab: "" };
    },
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
  return { ctx, toasts, store };
}
const livia = (s) =>
  s.scenes.find((x) => x.id === s.activeSceneId).tokens.find((t) => t.actorId === "livia");
function combatAt(h, x, y) {
  h.store.commit(
    "setup",
    (s) => {
      Object.assign(livia(s), { x, y });
      const order = ["livia", "goblin-1", "doran", "goblin-2"];
      s.combat = { active: true, round: 1, turn: 0, order, encounterId: "enc-w2b1" };
      for (const id of order) {
        const a = s.actors[id];
        Object.assign(a, { movement: a.speed, movementSpent: 0, dashCount: 0 });
        Object.assign(a, { action: true, bonus: true, reaction: true });
      }
      expireTurnEffects(s, "livia", "start");
    },
    "dm",
  );
}

test("an action preview being aimed and a companion placement keep their map clicks", () => {
  const h = harness();
  const table = { selectedActorId: "livia", mode: "move" };
  assert.equal(UI.coreClaimsMapInput(h.ctx, table), false, "a plain Move is B40's to intercept");
  // Burning Hands chosen in the action bar (the core draft that table.mjs checks first).
  prepareCombatAction(h.ctx, "livia", "burning-hands");
  assert.equal(UI.coreClaimsMapInput(h.ctx, table), true);
  assert.equal(UI.coreClaimsMapInput(h.ctx, { ...table, selectedActorId: "doran" }), false);
  cancelCombatPreview(h.ctx, "livia");
  assert.equal(UI.coreClaimsMapInput(h.ctx, table), false);
  // Find Familiar / Wild Companion: "choose where it appears" owns the next map click.
  confirmCompanionAppearance(h.ctx, { parentActorId: "livia", rangeMeters: 3 }, () => {});
  assert.equal(mapPlacementActive(), true);
  assert.equal(UI.coreClaimsMapInput(h.ctx, table), true);
  resetMapPlacement();
  assert.equal(UI.coreClaimsMapInput(h.ctx, table), false);
});

test("a Move released beyond the movement left across the fountain swims as far as it can", () => {
  const h = harness();
  combatAt(h, 250, 380);
  // The gestures journey's drag: 500 px (15 m) right, across the fountain's rim, with 9 m.
  assert.equal(UI.intercept(h.ctx, "livia", { x: 750, y: 380 }), true);
  const s = h.store.state;
  const at = livia(s);
  assert.equal(D.lastMove(s, "livia").kind, "swim");
  assert.ok(Math.abs(s.actors.livia.movement) < 0.05, "all the movement is spent");
  assert.ok(Math.abs(at.y - 380) < 0.5, "the token stays on the dragged line");
  // Water costs double: she stops short of the 9 m (x 550) she would reach on dry ground.
  assert.ok(at.x > 476 && at.x < 549, `stopped at ${at.x}`);
  assert.ok(!h.toasts.some((t) => t.error), JSON.stringify(h.toasts));
});

test("when the movement runs out before the water the core Move keeps the release", () => {
  const h = harness();
  combatAt(h, 110, 380);
  // 9 m from x 110 ends at x 410, before the basin (x ≥ 476): no swim, the core stops there.
  assert.equal(UI.intercept(h.ctx, "livia", { x: 750, y: 380 }), false);
  assert.equal(livia(h.store.state).x, 110);
  // With no movement left the refusal stays explicit.
  combatAt(h, 440, 380);
  h.store.commit("spent", (s) => (s.actors.livia.movement = 0), "dm");
  assert.equal(UI.intercept(h.ctx, "livia", { x: 750, y: 380 }), true);
  assert.equal(livia(h.store.state).x, 440);
  assert.match(h.toasts.at(-1).text, /^Nuoto: /);
});

// ---------------------------------------------------------------- B40 × B61: action bar

// B61 keeps the bottom bar for the core commands (registry plan §5.1: areas add no buttons
// there) and its audit wants them on one row at 1440 in combat. B40's «Mosse» (jump,
// grapple, shove, hide, help…) are common actions: BG3 keeps them in the hotbar next to
// Dash, Dodge and Disengage, which here is the action bar above the dock (CRP-098).
test("B40's Moves stands in the action bar after the actions; the dock keeps the core commands", () => {
  const h = harness();
  combatAt(h, 250, 380);
  resetTableView();
  const html = renderTable(h.ctx);
  // B62: one BG3 hotbar — the actions page in its middle, the turn commands on its right.
  const hotbarAt = html.indexOf('<div class="action-dock table-hotbar');
  const barAt = html.indexOf('class="combat-actions"');
  const dockAt = html.indexOf('<div class="toolbar">', barAt);
  assert.ok(hotbarAt > 0 && barAt > hotbarAt && dockAt > barAt, "action bar, then commands");
  const bar = html.slice(barAt, dockAt);
  const dock = html.slice(dockAt);
  assert.match(bar, /data-sm-tray/, "Moves in the action bar");
  assert.ok(
    bar.indexOf("data-sm-tray") > bar.indexOf('data-combat-action="disengage"'),
    "after Dash, Dodge and Disengage",
  );
  assert.doesNotMatch(dock, /data-sm-tray/, "no area button in the dock");
  for (const core of ['data-tool="move"', 'data-table="actions"', 'data-table="dice"'])
    assert.ok(dock.includes(core), core);
  for (const core of ['data-table="cancel"', 'data-table="undo"', 'data-table="end-turn"'])
    assert.ok(dock.includes(core), core);
});

test("the Moves tray floats from the action bar, and on a phone Moves stays at the strip's end", () => {
  const css = readFileSync(new URL("../special-moves.css", import.meta.url), "utf8");
  assert.match(css, /\.combat-bar:has\(\.sm-tray\)\s*\{\s*position: relative;/);
  // B62 review: Moves stands in its own column after the scrolling strip (.combat-dock,
  // styles.css), no longer a sticky item inside it (tests/review-fixes-b62.test.mjs).
  const phone = css.slice(css.indexOf("@media (max-width: 720px)"));
  assert.match(phone, /\.combat-dock \.sm-dock-toggle\s*\{[^}]*flex: 0 0 auto;/);
});

// ---------------------------------------------------------------- B34 × B17: chat cards

// The chat (B17) showed the Table's free roll as a roll card; since the dice tray (B34)
// took over «Tira i dadi», its rolls must keep that card (Roll20/Foundry chat roll cards).
async function chatAndTray() {
  const Chat = await import("../chat.mjs");
  const Tray = await import("../dice-tray.mjs");
  const Dice3d = await import("../dice-3d.mjs");
  await Chat.neighboursReady;
  Chat.resetChatView();
  Tray.resetTrayUI();
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null, document: undefined, deviceStorage: storage });
  for (const [id, mod] of [
    ["chat", Chat],
    ["dice-tray", Tray],
    ["dice-3d", Dice3d],
  ])
    assert.equal(registry.use(id, mod.register).status, "built", id);
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = {
    role: "player",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    registry,
    esc,
    icon: () => "",
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    canControl: (actor) => !!actor && (ctx.role === "dm" || actor.owner === ctx.role),
    toast() {},
    dialog() {},
    closeDialog() {},
    navigate() {},
    render() {},
    commit(label, mutate, options = {}) {
      const before = store.state;
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
  };
  registry.attach(ctx);
  const panel = (role) => {
    ctx.role = role;
    const scene = store.state.scenes.find((s) => s.id === store.state.activeSceneId);
    return registry.slot("table-panel", "log", ctx, {
      scene,
      selectedActorId: "livia",
      mode: "move",
      zoom: 1,
      pan: { x: 0, y: 0 },
    });
  };
  const roll = (role, raw, faces) => {
    ctx.role = role;
    return Tray.rollFromTray(
      ctx,
      { kind: "free", rollMode: "normal", dc: null, ...raw },
      { faces },
    );
  };
  return { ctx, store, panel, roll, Chat, Tray };
}
const cards = (html) =>
  [...html.matchAll(/<article class="chat-roll-card[^"]*"[\s\S]*?<\/article>/g)].map((m) => m[0]);

test("a physical roll from the dice tray is a roll card in the chat for everyone, once", async () => {
  const h = await chatAndTray();
  const record = h.roll(
    "player",
    { formula: "1d20+5", actorId: "livia", audience: "public", mode: "physical" },
    [14],
  );
  assert.equal(record.total, 19);
  assert.equal(record.logLabel, h.store.state.log.at(-1).label, "the record keeps its log line");
  for (const role of ["player", "dm"]) {
    const html = h.panel(role);
    const found = cards(html).filter((c) => c.includes("Livia"));
    assert.equal(found.length, 1, role + ": one card, not a card and a line");
    assert.match(found[0], /1d20 \[14\] \+ 5/);
    assert.match(found[0], /Dado fisico/);
    assert.match(found[0], /chat-roll-total">19</);
    assert.doesNotMatch(found[0], /dal registro/, "a structured roll, not read from the label");
  }
  h.Chat.resetChatView();
  h.Tray.resetTrayUI();
});

test("hidden tray rolls follow B34's audience; identical rolls pair with their own lines", async () => {
  const h = await chatAndTray();
  // «Solo DM» (Roll20 /gmroll): the roller and the DM read it, so both get the card.
  h.roll("player", { formula: "1d20", actorId: "livia", audience: "gm", mode: "physical" }, [7]);
  assert.equal(cards(h.panel("dm")).length, 1);
  assert.equal(cards(h.panel("player")).length, 1, "the roller reads their own roll");
  // Blind (Roll20 /broll): only the DM reads it; the roller keeps the log line, no result.
  h.roll("player", { formula: "1d20", actorId: "livia", audience: "blind", mode: "physical" }, [9]);
  assert.equal(cards(h.panel("dm")).length, 2);
  const player = h.panel("player");
  assert.equal(cards(player).length, 1, "no card of the blind roll for the player");
  assert.match(player, /tiro solo per il DM/);
  // Two identical public rolls: each log line takes its own record (no double card).
  h.roll("player", { formula: "1d6", actorId: "livia", audience: "public", mode: "physical" }, [3]);
  h.roll("player", { formula: "1d6", actorId: "livia", audience: "public", mode: "physical" }, [3]);
  assert.equal(cards(h.panel("dm")).length, 4);
  h.Chat.resetChatView();
  h.Tray.resetTrayUI();
});

// ---------------------------------------------------------------- B34 × B56: recent rolls

// «Tiri recenti» of the 3D dice (B56, now in Dadi › Aspetto e prova) listed the Table's
// free roll; since the tray (B34) took over «Tira i dadi», its rolls must be listed and
// replayable there too, with the tray's own audience (DDB dice log, Roll20 /gmroll /broll).
test("tray rolls are listed in the 3D dice's recent rolls for whoever may read them", async () => {
  const h = await chatAndTray();
  const Dice3d = await import("../dice-3d.mjs");
  await Dice3d.neighboursReady;
  const pub = h.roll(
    "player",
    { formula: "1d20", actorId: "livia", audience: "public", mode: "physical" },
    [11],
  );
  // Recent rolls are ordered by their ISO instant: the next roll is strictly later.
  await new Promise((resolve) => setTimeout(resolve, 5));
  const blind = h.roll(
    "player",
    { formula: "1d20+2", actorId: "livia", audience: "blind", mode: "physical" },
    [4],
  );
  const rows = (role) => {
    h.ctx.role = role;
    return [
      ...Dice3d.renderDrawer(h.ctx, {}).matchAll(/data-dice3d-row="([^"]+)"[\s\S]*?<\/li>/g),
    ].map((m) => [m[1], m[0]]);
  };
  const player = rows("player");
  const dm = rows("dm");
  assert.equal(player[0][0], pub.id, "the newest readable roll first for the roller");
  assert.match(player[0][1], /1d20/);
  assert.ok(!player.some(([key]) => key === blind.id), "a blind roll stays hidden from the roller");
  assert.equal(dm[0][0], blind.id, "the DM reads the blind roll");
  assert.ok(dm.some(([key]) => key === pub.id));
  // The listed tray roll replays its recorded face (never a new roll).
  h.ctx.role = "player";
  assert.equal(Dice3d.replayRoll(h.ctx, pub.id), true);
  h.Chat.resetChatView();
  h.Tray.resetTrayUI();
});

// ---------------------------------------------------------------- B34 × B17: unread badge

// The Registro badge and the bell count others' new rolls (DDB-153): a player's tray roll
// is a roll for the DM, like the Table's old free roll, not an event line.
test("another identity's tray roll counts in the Registro badge and the bell as a roll", async () => {
  const h = await chatAndTray();
  h.Chat.setMarkerStorage(null);
  h.ctx.role = "dm";
  assert.deepEqual(h.Chat.collectNotifications(h.ctx), [], "the seeded history is caught up");
  await new Promise((resolve) => setTimeout(resolve, 5));
  h.roll(
    "player",
    { formula: "1d20+5", actorId: "livia", audience: "public", mode: "physical" },
    [14],
  );
  h.ctx.role = "dm";
  const notes = h.Chat.collectNotifications(h.ctx).filter((n) => n.category === "table-log");
  assert.equal(notes.length, 1, "one notice for the player's roll");
  assert.match(notes[0].title + " " + notes[0].body, /19/, "the notice reads as the roll");
  h.Chat.resetChatView();
  h.Tray.resetTrayUI();
});

// ---------------------------------------------------------------- B34 × B55: Discord and Avrae

// The relay (B55) posted the Table's free roll as a roll (Foundry to Discord, SVC-121) and a
// linked Avrae channel posts public rolls only (SVC-116). Since the tray (B34) took over «Tira
// i dadi», its rolls are label-only log lines: the relay posted them as game-log events, under
// the log switch, and never on Avrae (integrations journey, «Avrae channel content»). Like the
// chat (`rollFor`), the relay reads them as rolls again, with the tray's own audience.
async function relayAndTray() {
  const Int = await import("../integrations.mjs");
  const IntD = await import("../integrations-domain.mjs");
  const Tray = await import("../dice-tray.mjs");
  await Int.neighboursReady;
  Int.resetIntegrationsView();
  Tray.resetTrayUI();
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null, document: undefined, deviceStorage: storage });
  for (const [id, mod] of [
    ["dice-tray", Tray],
    ["integrations", Int],
  ])
    assert.equal(registry.use(id, mod.register).status, "built", id);
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = {
    role: "dm",
    lang: "it",
    offline: false,
    view: { page: "campaign", tab: "integrations", id: "discord" },
    get state() {
      return store.state;
    },
    registry,
    esc,
    icon: () => "",
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    canControl: (actor) => !!actor && (ctx.role === "dm" || actor.owner === ctx.role),
    toast() {},
    dialog() {},
    closeDialog() {},
    navigate() {},
    render() {},
    commit(label, mutate, options = {}) {
      const before = store.state;
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
  };
  registry.attach(ctx);
  let avrae = null;
  ctx.commit("link", (draft) => {
    avrae = IntD.linkAvrae(
      draft.ext.integrations,
      "lanterns",
      { server: "Le lanterne di Bruma", channel: "tiri" },
      "dm",
    );
  });
  const roll = (role, raw, faces) => {
    ctx.role = role;
    return Tray.rollFromTray(
      ctx,
      { kind: "free", rollMode: "normal", dc: null, ...raw },
      { faces },
    );
  };
  const preview = (destination, viewer = "dm") =>
    IntD.relayPreview(store.state, store.state.ext.integrations, "lanterns", {
      destination,
      viewer,
      rollFor: Int.trayRollFor(ctx),
    });
  return { ctx, store, roll, preview, avrae, Int, Tray };
}

test("a public tray roll reaches the Discord relay and the Avrae channel as a roll", async () => {
  const h = await relayAndTray();
  h.roll(
    "player",
    { formula: "1d20+3", actorId: "livia", audience: "public", mode: "physical" },
    [14],
  );
  const text = "Livia · Tiro libero: 1d20 [14] + 3 = 17 · dadi fisici";
  const webhook = h.preview("webhook").messages.filter((m) => m.text.includes("Livia"));
  assert.deepEqual(
    webhook.map((m) => [m.kind, m.text]),
    [["roll", text]],
    "a roll, not a game-log event",
  );
  assert.deepEqual(
    h.preview(h.avrae).messages.map((m) => m.text),
    [text],
    "Avrae posts rolls only, and this is one",
  );
  // Withdrawn from the tray («Ritira», B34): still in the channel, marked as reversed.
  const TrayD = await import("../dice-tray-domain.mjs");
  const record = h.store.state.ext["dice-tray"].rolls.at(-1);
  h.ctx.role = "player";
  h.ctx.commit("Tiro ritirato", (draft) =>
    TrayD.withdrawRoll(draft.ext["dice-tray"], record.id, "Faccia letta male", "player", "x"),
  );
  assert.deepEqual(
    h.preview(h.avrae).messages.map((m) => [m.text, m.reversed]),
    [[text, true]],
  );
  // The relay's «Public rolls» switch now governs it, not «Game log events».
  h.ctx.commit("rolls off", (draft) => {
    draft.ext.integrations.campaigns.lanterns.relay.events.rolls = false;
  });
  assert.ok(!h.preview("webhook").messages.some((m) => m.text.includes("Livia")));
  // The rendered channel preview (DM, Discord tab) shows the same roll message.
  h.ctx.commit("rolls on", (draft) => {
    draft.ext.integrations.campaigns.lanterns.relay.events.rolls = true;
  });
  h.ctx.role = "dm";
  const html = h.Int.renderSection(h.ctx);
  assert.match(
    html,
    /int-msg-roll[\s\S]*?Livia · Tiro libero: 1d20 \[14\] \+ 3 = 17 · dadi fisici/,
  );
  h.Int.resetIntegrationsView();
  h.Tray.resetTrayUI();
});

test("hidden tray rolls stay out of the channels and count for whoever made them", async () => {
  const h = await relayAndTray();
  // A player's «Solo DM» (Roll20 /gmroll) and blind (/broll) rolls, the DM's own «Solo DM»:
  // the log lines only announce them, and nothing of them reaches a channel.
  h.roll("player", { formula: "1d20", actorId: "livia", audience: "gm", mode: "physical" }, [7]);
  h.roll(
    "player",
    { formula: "1d20+2", actorId: "livia", audience: "blind", mode: "physical" },
    [9],
  );
  h.roll("dm", { formula: "1d20+1", actorId: "goblin-1", audience: "self", mode: "physical" }, [5]);
  for (const destination of ["webhook", h.avrae]) {
    const texts = h.preview(destination).messages.map((m) => m.text);
    assert.ok(
      !texts.some((t) => /Livia|Sentinella|tiro per sé|tiro solo per il DM|\[[579]\]/.test(t)),
      destination + ": " + texts.join(" | "),
    );
  }
  // Counted as rolls for whoever owns them (B34: a blind roll belongs to the DM).
  assert.equal(h.preview("webhook", "player").privateRolls, 1, "the player's gm roll");
  // Final review P3: «Io e il DM» is owned by the DM and controlled by the roller (the combat
  // convention of state.mjs acceptedRolls), so it counts for both.
  assert.equal(
    h.preview("webhook", "dm").privateRolls,
    3,
    "the player's gm roll, the blind roll and the DM's own",
  );
  h.Int.resetIntegrationsView();
  h.Tray.resetTrayUI();
});
