// R2 TV-95 — connected dice, delegated simulation (I-233) of the Pixels pattern (Foundry's
// Pixels module, Roll20 and D&D Beyond integrations): scan, pair, state, battery warning,
// blink, disconnect, per-die-type fulfilment (Foundry's dice configuration), a connected face
// filling a pending physical prompt (tray, rollNumber, request cards, C6 for combat) and an
// unprompted roll as a free tray card. Real store and registry, fake DOM. Synthetic data.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import * as dice3d from "../dice-3d.mjs";
import * as requests from "../roll-requests.mjs";
import * as chatDomain from "../chat-domain.mjs";
import * as P from "../command-palette.mjs";
import { trayHarness, scripted, plain, click, change, node, fakeRoot } from "./r2-harness.mjs";

const refuses = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.match(error.it ?? error.message, pattern);
    return true;
  });

afterEach(() => {
  tray.resetTrayUI();
  dice3d.clearDice();
  dice3d.resetDiceUI();
});

function pair(h, pixelId) {
  if (tray.trayUI().section !== "look") h.section("look");
  if (!h.ctx.root.querySelector(`[data-dtray-connect="${pixelId}"]`))
    click(h.ctx.root, "[data-dtray-scan]");
  click(h.ctx.root, `[data-dtray-connect="${pixelId}"]`);
  return h.slice().devices[h.ctx.role].find((d) => d.pixelId === pixelId);
}

test("pairing: «Cerca dadi vicini» lists simulated dice with signal and battery; «Collega» pairs one", () => {
  const h = trayHarness();
  h.section("look");
  const text = plain(h.ctx.html);
  assert.match(text, /Dadi connessi simulazione/);
  assert.match(text, /Qui non c'è Bluetooth: dadi, batteria e lancio sono simulati/);
  assert.equal(
    h.ctx.root.querySelector("[data-dtray-connect]"),
    null,
    "nothing listed before a scan",
  );
  click(h.ctx.root, "[data-dtray-scan]");
  assert.deepEqual(
    h.ctx.root.querySelectorAll("[data-dtray-connect]").map((n) => n.dataset.dtrayConnect),
    ["px-d20-onyx", "px-d20-aurora", "px-d6-hellfire", "px-d8-galaxy", "px-d12-clear"],
  );
  assert.match(plain(h.ctx.html), /Pixels d20 Onice d20 · segnale forte · batteria 86%/);
  const onyx = pair(h, "px-d20-onyx");
  assert.deepEqual(
    [onyx.sides, onyx.state, onyx.battery, onyx.signal],
    [20, "connected", 86, "strong"],
  );
  assert.equal(h.slice().diceMethods.player[20], "connected", "the paired type uses its die");
  assert.equal(h.store.state.log.at(-1).visibility, "private", "pairing is this identity's own");
  assert.equal(h.ctx.root.querySelector('[data-dtray-connect="px-d20-onyx"]'), null);
  assert.match(plain(h.ctx.html), /Pixels d20 Onice Connesso d20 · segnale forte Batteria 86%/);
  // Each identity has its own dice.
  assert.deepEqual(h.slice().devices.dm, []);
  // A die found twice is refused; a die out of range too.
  assert.throws(
    () => domain.pairDevice(h.slice(), "player", { pixelId: "px-d20-onyx" }),
    /already paired/,
  );
  assert.throws(() => domain.pairDevice(h.slice(), "player", { pixelId: "nope" }), /nearby/);
});

test("battery: under 20 % the die carries a warning in the list, the scan and the waiting roll", () => {
  const h = trayHarness({ die: scripted(5) });
  h.section("look");
  click(h.ctx.root, "[data-dtray-scan]");
  assert.match(
    plain(h.ctx.html),
    /Pixels d20 Aurora .*batteria 14% Batteria scarica: ricaricalo presto\./,
  );
  const aurora = pair(h, "px-d20-aurora");
  assert.equal(domain.batteryLow(aurora), true);
  assert.equal(domain.batteryLow({ battery: 20 }), false, "20 % is not low");
  assert.ok(node(h.ctx.root, `[data-dtray-battery="${aurora.id}"]`).attrs.class.includes("is-low"));
  assert.match(plain(h.ctx.html), /Batteria 14% · scarica: ricaricalo presto \(sotto il 20 %\)\./);
  h.section("roll");
  assert.match(
    plain(h.ctx.html),
    /Questi dadi aspettano il dado connesso: d20 · Pixels d20 Aurora · Connesso · batteria 14% · scarica/,
  );
  // English.
  h.ctx.lang = "en";
  h.section("look");
  assert.match(plain(h.ctx.html), /Battery 14% · low: charge it soon \(under 20%\)\./);
});

test("a save rolled in the tray waits for the connected d20; «Simula il lancio» fills it as a physical die", () => {
  const h = trayHarness({ die: scripted(14) });
  pair(h, "px-d20-onyx");
  h.section("roll");
  const before = h.slice().rolls.length;
  click(h.ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.equal(h.slice().rolls.length, before, "nothing is recorded before the die reports");
  assert.equal(tray.waitingRolls(h.ctx).length, 1);
  const waiting = plain(h.ctx.html);
  assert.match(waiting, /In attesa del dado connesso… Livia · Tiro salvezza su Destrezza/);
  assert.match(waiting, /d20 · Pixels d20 Onice · batteria 86%/);
  assert.match(waiting, /in attesa del lancio/);
  click(h.ctx.root, "[data-dtray-connected-roll]");
  const r = h.slice().rolls.at(-1);
  const modifier = domain.testModifier(h.store.state, "livia", {
    kind: "save",
    ability: "dex",
  }).modifier;
  assert.deepEqual(
    [r.kind, r.ability, r.mode, r.values, r.faceModes, r.total],
    ["save", "dex", "physical", [14], ["connected"], 14 + modifier],
  );
  assert.equal(r.devices[0].it, "Pixels d20 Onice");
  assert.match(h.store.state.log.at(-1).label, /· fisico · Pixels d20 Onice$/);
  assert.deepEqual(h.emitted.at(-1).roll.mode, "physical", "the 3D dice never animate it");
  assert.equal(tray.waitingRolls(h.ctx).length, 0);
  // The chat's card names the die (the Pixels module's chat message).
  assert.match(plain(h.ctx.html), /fisico · Pixels d20 Onice/);
});

test("a throw with nothing waiting is an unprompted roll: a free card in the tray", () => {
  const h = trayHarness({ die: scripted(9) });
  const onyx = pair(h, "px-d20-onyx");
  click(h.ctx.root, `[data-dtray-device-roll="${onyx.id}"]`);
  const r = h.slice().rolls.at(-1);
  assert.deepEqual(
    [r.kind, r.formula, r.values, r.mode, r.faceModes, r.actorId],
    ["free", "1d20", [9], "physical", ["connected"], "livia"],
  );
  assert.equal(r.title.it, "Tiro senza richiesta · Pixels d20 Onice");
  assert.equal(tray.trayUI().section, "roll", "the card shows in the tray");
  assert.match(plain(h.ctx.html), /Livia · Tiro senza richiesta · Pixels d20 Onice 9/);
});

test("C6: awaitConnectedFaces waits in the resolver dialog; typed faces and cancel work", async () => {
  const h = trayHarness({ die: scripted(17, 3) });
  assert.equal(tray.hasConnectedDie(h.ctx, 20), false);
  assert.equal(await tray.awaitConnectedFaces(h.ctx, { sides: 20 }), null, "no die paired");
  pair(h, "px-d20-onyx");
  assert.equal(tray.hasConnectedDie(h.ctx, 20), true);
  assert.equal(tray.hasConnectedDie(h.ctx, 6), false);
  const attack = tray.awaitConnectedFaces(h.ctx, {
    actorId: "livia",
    sides: 20,
    count: 2,
    label: { it: "Attacco con vantaggio", en: "Attack with advantage" },
  });
  assert.equal(h.ctx.dialogState.title, "In attesa del dado connesso");
  assert.match(plain(h.ctx.dialogState.body), /Livia · Attacco con vantaggio/);
  tray.simulateConnectedRoll(h.ctx, 20);
  assert.ok(h.ctx.dialogState, "still waiting for the second d20");
  tray.simulateConnectedRoll(h.ctx, 20);
  const faces = await attack;
  assert.deepEqual([...faces], [17, 3]);
  assert.deepEqual(faces.faceModes, ["connected", "connected"]);
  assert.equal(faces.devices[0].it, "Pixels d20 Onice");
  assert.equal(h.ctx.dialogState, null, "the resolver closed");
  // A face typed by hand (the die misread) is a physical face.
  const typed = tray.awaitConnectedFaces(h.ctx, { sides: 20 });
  refuses(() => h.submitDialog({}), /Manca la faccia del d20/);
  h.submitDialog({ "wait-face-0": "12" });
  const byHand = await typed;
  assert.deepEqual([...byHand, ...byHand.faceModes], [12, "physical"]);
  // A role change cancels a waiting roll: nothing crosses to the other identity.
  const cancelled = tray.awaitConnectedFaces(h.ctx, { sides: 20 });
  h.registry.emit("role-changed", { role: "dm" });
  assert.equal(await cancelled, null);
  assert.deepEqual(tray.waitingRolls(h.ctx), []);
});

test("a DM request answered with the connected die: physical faces, named in the log and the chat", () => {
  const h = trayHarness({ die: scripted(16) });
  h.store.commit(
    "Richiesta del DM",
    (draft) =>
      requests.createRequest(
        draft,
        { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] },
        "dm",
        { id: "g1", now: new Date().toISOString() },
      ),
    "dm",
  );
  pair(h, "px-d20-onyx");
  h.section("requests");
  click(h.ctx.root, "[data-dtray-answer-connected]");
  assert.match(plain(h.ctx.dialogState.body), /Livia · Tiro salvezza su Destrezza · CD 13/);
  tray.simulateConnectedRoll(h.ctx, 20);
  const attempt = h.store.state.combatAttempts.find((a) => a.id === "roll-request:g1:livia");
  const request = attempt.requests[0];
  assert.deepEqual([request.status, request.mode, request.values], ["resolved", "physical", [16]]);
  assert.equal(request.devices[0].it, "Pixels d20 Onice");
  assert.match(h.store.state.log.at(-1).label, /successo · fisico · Pixels d20 Onice$/);
  const card = chatDomain
    .projectLog(h.store.state, "player", { lang: "it" })
    .filter((i) => i.type === "rolls")
    .at(-1).rolls[0];
  assert.deepEqual([card.mode, card.devices], ["physical", ["Pixels d20 Onice"]]);
});

test("the chat card «Tira» and a journal roll follow the per-type method: a connected d20 waits", () => {
  const h = trayHarness({ die: scripted(11, 7) });
  h.store.commit(
    "Richiesta del DM",
    (draft) =>
      requests.createRequest(
        draft,
        { kind: "skill", skill: "perception", actorIds: ["livia"] },
        "dm",
        { id: "g2", now: new Date().toISOString() },
      ),
    "dm",
  );
  pair(h, "px-d20-onyx");
  const row = requests
    .requestGroups(h.store.state, h.slice(), "player")
    .flatMap((g) => g.rows)
    .find((r) => r.attemptId === "roll-request:g2:livia");
  tray.rollRequestFromCard(h.ctx, row.requestId);
  assert.equal(h.ctx.dialogState.title, "In attesa del dado connesso");
  tray.simulateConnectedRoll(h.ctx, 20);
  const request = h.store.state.combatAttempts.find((a) => a.id === "roll-request:g2:livia")
    .requests[0];
  assert.deepEqual([request.mode, request.values], ["physical", [11]]);
  // A roll written in the journal (no request) waits in the resolver too, then lands in the
  // tray's rolls with the journal's DC, set by the DM.
  tray.rollFromEmbed(h.ctx, "save:wis:12", "livia");
  assert.match(plain(h.ctx.dialogState.body), /Livia · Tiro salvezza su Saggezza · CD 12/);
  tray.simulateConnectedRoll(h.ctx, 20);
  const r = h.slice().rolls.at(-1);
  assert.deepEqual(
    [r.kind, r.ability, r.values, r.dc, r.dcBy, r.mode],
    ["save", "wis", [7], 12, "dm", "physical"],
  );
});

test("per-type fulfilment: d20 connected, d6 by hand; the roll waits for both and records each origin", () => {
  const h = trayHarness({ die: scripted(19) });
  pair(h, "px-d20-onyx");
  change(h.ctx.root, '[data-dtray-method="6"]', "physical");
  assert.equal(h.slice().diceMethods.player[6], "physical");
  // «Dado connesso» is offered only for a type with a paired die (Foundry lists its methods).
  assert.ok(!node(h.ctx.root, '[data-dtray-method="8"]').inner.includes('value="connected"'));
  refuses(() => domain.setDieMethod(h.slice(), "player", 8, "connected"), /Nessun d8 collegato/);
  h.section("roll");
  change(h.ctx.root, "[data-dtray-formula]", "1d20+1d6+2");
  h.ctx.root.querySelector("[data-dtray-form]").onsubmit({ preventDefault() {} });
  assert.equal(tray.waitingRolls(h.ctx).length, 1);
  click(h.ctx.root, "[data-dtray-connected-roll]");
  assert.equal(tray.waitingRolls(h.ctx).length, 1, "the d6 is still to type");
  assert.match(plain(h.ctx.html), /arrivata dal dado connesso/);
  click(h.ctx.root, "[data-dtray-connected-record]");
  assert.match(plain(h.ctx.html), /Manca la faccia del d6/);
  const d6 = node(h.ctx.root, '[data-dtray-wait-face="1"]');
  d6.value = "4";
  d6.events.input({ target: d6 });
  click(h.ctx.root, "[data-dtray-connected-record]");
  const r = h.slice().rolls.at(-1);
  assert.deepEqual(
    [r.values, r.faceModes, r.total, r.mode],
    [[19, 4], ["connected", "physical"], 25, "physical"],
  );
  // Back to the default: the type follows «Dadi» again.
  h.section("look");
  change(h.ctx.root, '[data-dtray-method="6"]', "default");
  assert.equal(h.slice().diceMethods.player[6], undefined);
});

test("state: «Scollega», «Ricollega», charging and «Fai lampeggiare»; a blocked die says why", () => {
  const h = trayHarness({ die: scripted(8) });
  const onyx = pair(h, "px-d20-onyx");
  click(h.ctx.root, `[data-dtray-device-state="${onyx.id}"]`);
  assert.equal(h.slice().devices.player[0].state, "disconnected");
  const roll = node(h.ctx.root, `[data-dtray-device-roll="${onyx.id}"]`);
  assert.equal(roll.disabled, true);
  const why = roll.attrs["aria-describedby"];
  assert.match(
    plain(h.ctx.html),
    /non è connesso: ricollegalo in Dadi › Impostazioni › Dadi connessi/,
  );
  assert.ok(why && h.ctx.html.includes(`id="${why}"`), "the reason is linked to the control");
  assert.equal(tray.hasConnectedDie(h.ctx, 20), false, "C6 offers only a connected die");
  refuses(() => tray.simulateConnectedRoll(h.ctx, onyx.id), /non è connesso/);
  // Still the d20's method: a roll waits and says why, with the face by hand as remedy.
  h.section("roll");
  click(h.ctx.root, '[data-dtray-roll][data-kind="check"][data-ability="str"]');
  assert.match(plain(h.ctx.html), /non è connesso: ricollegalo .* oppure scrivi la faccia a mano/);
  assert.equal(node(h.ctx.root, "[data-dtray-connected-roll]").disabled, true);
  click(h.ctx.root, "[data-dtray-connected-cancel]");
  assert.equal(tray.waitingRolls(h.ctx).length, 0);
  h.section("look");
  click(h.ctx.root, `[data-dtray-device-state="${onyx.id}"]`);
  assert.equal(h.slice().devices.player[0].state, "connected");
  // A die found in its charger pairs as charging and cannot be thrown until taken off.
  const clear = pair(h, "px-d12-clear");
  assert.equal(clear.state, "charging");
  assert.match(plain(h.ctx.html), /In carica/);
  assert.equal(node(h.ctx.root, `[data-dtray-device-roll="${clear.id}"]`).disabled, true);
  click(h.ctx.root, `[data-dtray-device-state="${clear.id}"]`);
  assert.equal(h.slice().devices.player.find((d) => d.id === clear.id).state, "connected");
  // Blink (Pixels "Blink"): the row lights up and says so.
  click(h.ctx.root, `[data-dtray-device-blink="${onyx.id}"]`);
  assert.match(plain(h.ctx.html), /Lampeggia: cercalo sul tavolo\./);
  // Forget the last d20: the type goes back to the default method.
  click(h.ctx.root, `[data-dtray-device-forget="${onyx.id}"]`);
  assert.equal(h.slice().diceMethods.player[20], undefined);
});

test("saved devices from before gain battery, state and signal; methods keep only valid types", () => {
  const slice = domain.normalizeSlice(
    {
      devices: { player: [{ id: "d1", sides: 20, name: { it: "Vecchio", en: "Old" } }] },
      diceMethods: { player: { 20: "connected", 7: "digital", 6: "bogus" } },
    },
    1,
  );
  assert.deepEqual(
    [
      slice.devices.player[0].battery,
      slice.devices.player[0].state,
      slice.devices.player[0].signal,
    ],
    [100, "connected", "strong"],
  );
  assert.deepEqual(slice.diceMethods.player, { 20: "connected" });
  assert.deepEqual(slice.diceMethods.dm, {});
});

test("palette: «pixels», «bluetooth», «dadi connessi» and «smart dice» find the connected dice", () => {
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const registry = createRegistry({ document: null, logger: null, deviceStorage: storage });
  registry.use("dice-tray", tray.register);
  registry.use("command-palette", P.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  const make = (lang) => ({
    get state() {
      return store.state;
    },
    role: "player",
    lang,
    offline: false,
    view: { page: "home", id: "", tab: "" },
    registry,
    t: (it, en) => (lang === "it" ? it : en),
    esc: (v) => String(v),
    label: (v) => (typeof v === "object" ? v[lang] : v),
    icon: () => "",
    toast() {},
    navigate() {},
    dialog() {},
    closeDialog() {},
    canUndo: () => false,
  });
  registry.attach(make("it"));
  const first = (ctx, query) =>
    P.searchPalette(ctx, query).items.find((i) => i.type === "command")?.row?.id;
  for (const query of ["pixels", "bluetooth", "dadi connessi", "dadi smart"])
    assert.equal(first(make("it"), query), "dice-tray.connected", query);
  assert.equal(first(make("en"), "smart dice"), "dice-tray.connected");
});

test("the sheet's «Tiri» free formula waits for the connected d20 in the resolver", () => {
  const h = trayHarness({ die: scripted(12) });
  pair(h, "px-d20-onyx");
  const livia = h.store.state.actors.livia;
  const section = h.registry.get("sheet-section", "dice-tray-sheet", h.ctx, livia);
  const root = fakeRoot(section.render(h.ctx, livia));
  section.bind(root, h.ctx);
  node(root, "[data-dtray-sheet-formula]").value = "1d20+5";
  const before = h.slice().rolls.length;
  node(root, "[data-dtray-sheet-free]").onsubmit({ preventDefault() {} });
  assert.equal(h.slice().rolls.length, before, "it waits for the die");
  assert.equal(h.ctx.dialogState.title, "In attesa del dado connesso");
  tray.simulateConnectedRoll(h.ctx, 20);
  const r = h.slice().rolls.at(-1);
  assert.deepEqual([r.values, r.total, r.mode, r.faceModes], [[12], 17, "physical", ["connected"]]);
});
