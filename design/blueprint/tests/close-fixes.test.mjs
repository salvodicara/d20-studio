// Close review fixes (01/10/2026), one writer: the functional, privacy, exposure and
// findability findings of the closing reviews (completeness, privacy, findability). Each block
// names its finding and the market pattern copied. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./r8-harness.mjs";
import * as FV from "../fog-vision-domain.mjs";

const svgOf = (snapshot) => decodeURIComponent(snapshot.src.split(",")[1]);
const sceneOf = (state) => state.scenes.find((s) => s.id === state.activeSceneId);

/** The privacy review's fog state: the DM covers the scene and reveals only Livia's area. */
async function fogged() {
  const harness = await app({ role: "dm" });
  const { ctx } = harness;
  const livia = sceneOf(ctx.state).tokens.find((t) => t.actorId === "livia");
  ctx.commit("Nebbia", (s) => {
    FV.addFogOp(s, "dm", s.activeSceneId, { op: "cover", shape: "all" });
    FV.addFogOp(s, "dm", s.activeSceneId, {
      op: "reveal",
      shape: "rect",
      points: [
        { x: livia.x - 60, y: livia.y - 60 },
        { x: livia.x + 60, y: livia.y + 60 },
      ],
    });
  });
  return harness;
}

// ---------------------------------------------------------------- privacy P1-1: snapshot

test("privacy P1-1 (BG3 photo mode): the chat snapshot shows only what the viewer sees", async () => {
  const chat = await import("../chat.mjs");
  const { ctx } = await fogged();
  ctx.role = "player";
  const player = svgOf(chat.snapshotSource(ctx));
  assert.match(player, />Livia</);
  assert.match(player, />Mira</, "the player's own character stays in the picture");
  for (const name of ["Doran", "Sentinella", "Esploratore"])
    assert.doesNotMatch(player, new RegExp(`>${name}<`), `${name} is under the fog`);
  assert.match(player, /data-snapshot-sight="dark"/, "the fog is painted over the scene");
  // The DM's picture is the party's (Fog Preview): the watch under the fog stays out of it.
  ctx.role = "dm";
  const dm = svgOf(chat.snapshotSource(ctx));
  assert.doesNotMatch(dm, />Sentinella</);
  assert.doesNotMatch(dm, />Esploratore</);
  assert.match(dm, /data-snapshot-sight="dark"/);
});

test("privacy P1-1: without fog or vision the snapshot is the whole scene, unpainted", async () => {
  const chat = await import("../chat.mjs");
  const { ctx } = await app({ role: "player" });
  const svg = svgOf(chat.snapshotSource(ctx));
  assert.match(svg, />Sentinella</);
  assert.doesNotMatch(svg, /data-snapshot-sight/);
});

// ---------------------------------------------------------------- privacy P1-2: token list

test("privacy P1-2 (Foundry): a creature under the fog is neither listed, selected nor measured", async () => {
  const { observesToken } = await import("../token-menu.mjs");
  const AD = await import("../annotations-domain.mjs");
  const { ctx } = await fogged();
  const state = ctx.state;
  const scene = sceneOf(state);
  const token = (id) => scene.tokens.find((t) => t.actorId === id);
  assert.deepEqual([...FV.unseenTokens(state, scene.id, "player")].sort(), [
    "doran",
    "goblin-1",
    "goblin-2",
  ]);
  assert.equal(observesToken(state, token("goblin-1"), "player"), false);
  assert.equal(observesToken(state, token("livia"), "player"), true);
  assert.equal(observesToken(state, token("mira"), "player"), true, "own tokens stay listed");
  assert.equal(observesToken(state, token("goblin-1"), "dm"), true, "the DM sees everything");
  const rows = AD.distanceRows(state, scene.id, "livia", "player").map((r) => r.actorId);
  assert.ok(!rows.includes("goblin-1"), "no distance locates the hidden creature");
  assert.equal(FV.unseenTokens(state, scene.id, "dm").size, 0);
});

test("privacy P1-2: the player's Table draws neither the creature nor its turn-order entry", async () => {
  const { renderTable, resetTableView, setSelectedActor } = await import("../table.mjs");
  const { ctx } = await fogged();
  ctx.role = "player";
  ctx.state.combat = {
    active: true,
    round: 1,
    turn: 0,
    order: ["livia", "goblin-1", "mira", "doran"],
  };
  resetTableView();
  setSelectedActor("goblin-1");
  const html = renderTable(ctx);
  assert.doesNotMatch(html, /<g class="map-token[^"]*" data-actor="goblin-1"/);
  assert.doesNotMatch(html, /<button class="initiative-token[^"]*" data-select="goblin-1"/);
  assert.doesNotMatch(html, /class="hotbar-name"><strong>Sentinella/);
  // No area draws its name, label or portrait on the map either (map labels, portraits).
  assert.doesNotMatch(html, />Sentinella[ <·]/);
  assert.doesNotMatch(html, /id="media-art-goblin-1"/);
});

// ---------------------------------------------------------------- privacy P2-5: spectator

test("privacy P2-5: the spectator screen draws no badge or token of a creature under the fog", async () => {
  const AD = await import("../annotations-domain.mjs");
  const { visibleTokens } = await import("../session-view.mjs");
  const { ctx } = await fogged();
  const scene = sceneOf(ctx.state);
  assert.equal(AD.observable(ctx.state, scene, "goblin-1", "spectator"), false);
  const shown = visibleTokens(ctx.state, scene, "spectator").map((t) => t.actorId);
  assert.ok(!shown.includes("goblin-1"));
  assert.ok(shown.includes("livia"));
});

// ---------------------------------------------------------------- privacy P1-3: hidden creature

/** A creature whose token is hidden from the players (the privacy review's canary). */
async function withHidden(options = {}) {
  const harness = await app({ role: "dm", ...options });
  const data = await import("../srd-compendium.mjs");
  const { createSceneNPC, placeSceneToken } = await import("../preparation.mjs");
  harness.ctx.commit("Aggiungi creatura", (s) => {
    const entry = data.getEntry("srd2024:creature:goblin-warrior");
    const { input, patch } = data.npcFromCreature(entry, {
      id: "cnry-shadow",
      name: "CNRYD4 Ombra",
      team: "watch",
    });
    const actor = createSceneNPC(s, input, "dm");
    Object.assign(actor, patch);
    placeSceneToken(
      s,
      s.activeSceneId,
      "cnry-shadow",
      { x: 500, y: 300 },
      "token-cnry-shadow",
      "dm",
    );
    sceneOf(s).tokens.find((t) => t.actorId === "cnry-shadow").hidden = true;
  });
  return harness;
}
/** Every player-facing projection of the log that the privacy review read. */
async function playerReads(state, word) {
  const chat = await import("../chat-domain.mjs");
  const I = await import("../integrations-domain.mjs");
  const d3 = await import("../dice-3d-domain.mjs");
  const TD = await import("../dice-tray-domain.mjs");
  const has = (value) => JSON.stringify(value ?? "").includes(word);
  return {
    log: has(chat.projectLog(state, "player")),
    relay: has(I.logItems(state, null, "it", "player")),
    dice3d: has(d3.recentRolls(state, "player", 50, { tray: TD })),
  };
}

test("privacy P1-3 (Fantasy Grounds, Roll20 NPC whisper): a DM roll for a hidden creature starts «Solo DM»", async () => {
  const TRAY = await import("../dice-tray.mjs");
  const { ctx } = await withHidden();
  TRAY.rollNumber(
    ctx,
    { kind: "skill", skill: "stealth", ability: "dex", actorId: "cnry-shadow" },
    { where: "sheet" },
  );
  assert.deepEqual(await playerReads(ctx.state, "CNRYD4"), {
    log: false,
    relay: false,
    dice3d: false,
  });
  // A visible creature still rolls for everyone by default.
  TRAY.rollNumber(ctx, { kind: "save", ability: "dex", actorId: "goblin-1" }, { where: "sheet" });
  assert.equal((await playerReads(ctx.state, "Sentinella")).log, true);
});

test("privacy P1-3: an item or spell from the Compendium on a hidden creature is the DM's line only", async () => {
  const C = await import("../compendium.mjs");
  const data = await import("../srd-compendium.mjs");
  const { ctx } = await withHidden();
  C.addToSheet(ctx, data.getEntry("srd2024:item:potion-of-healing"), "cnry-shadow", {
    quantity: 1,
  });
  C.addToSheet(ctx, data.getEntry("srd2024:spell:fire-bolt"), "cnry-shadow", {
    grantName: "Innato",
  });
  assert.equal((await playerReads(ctx.state, "CNRYD4")).log, false);
  assert.equal(ctx.state.log.at(-1).visibility, "private");
});

test("privacy P1-3 / P2-4: a DM request names only visible targets and the DC as players read it", async () => {
  const TRAY = await import("../dice-tray.mjs");
  const CS = await import("../campaign-settings-domain.mjs");
  const requests = await import("../roll-requests.mjs");
  const { ctx } = await withHidden();
  ctx.commit("DC nascosta", (s) =>
    CS.setDisclosure(s, s.ext["campaign-settings"], s.campaign.id, "dc", "hidden", "dm"),
  );
  // The journal embed's branch (P2-4) and the tray's share one rule.
  TRAY.commitRequest(
    ctx,
    { kind: "save", ability: "dex", dc: 13, actorIds: ["livia", "cnry-shadow"] },
    { kind: "journal", ref: "save:dex:13" },
  );
  const line = ctx.state.log.at(-1);
  assert.notEqual(line.visibility, "private", "Livia's request is shared");
  assert.match(line.label, /Livia/);
  assert.doesNotMatch(line.label, /CNRYD4/);
  assert.doesNotMatch(line.label, /CD 13/);
  assert.match(line.label, /CD nascosta/);
  const reads = await playerReads(ctx.state, "CNRYD4");
  assert.equal(reads.log, false);
  assert.equal(reads.relay, false);
  assert.equal((await playerReads(ctx.state, "CD 13")).log, false);
  // The line is the request's card in the chat (TV-92): the group carries it.
  const group = requests.requestGroups(ctx.state, ctx.state.ext["dice-tray"], "player")[0];
  assert.equal(group.logLabel, line.label);
  // A request for hidden creatures only stays the DM's.
  TRAY.commitRequest(
    ctx,
    { kind: "check", ability: "wis", actorIds: ["cnry-shadow"] },
    { kind: "tray" },
  );
  assert.equal(ctx.state.log.at(-1).visibility, "private");
});

// ---------------------------------------------------------------- P1: secret request

test("P1 (Monk's TokenBar, Foundry blind GM roll): the DM asks a secret check and only the DM reads it", async () => {
  const TRAY = await import("../dice-tray.mjs");
  const requests = await import("../roll-requests.mjs");
  const { ctx } = await app({ role: "dm" });
  TRAY.commitRequest(
    ctx,
    { kind: "skill", skill: "perception", actorIds: ["livia"], audience: "blind" },
    { kind: "tray" },
  );
  assert.match(ctx.state.log.at(-1).label, /risultato solo al DM/);
  ctx.role = "player";
  const row = requests.requestGroups(ctx.state, ctx.state.ext["dice-tray"], "player")[0].rows[0];
  assert.equal(row.canRoll, true, "the player still rolls");
  TRAY.rollRequestFromCard(ctx, row.requestId);
  const after = requests.requestGroups(ctx.state, ctx.state.ext["dice-tray"], "player")[0].rows[0];
  assert.equal(after.status, "resolved");
  assert.equal(after.readable, false);
  assert.equal(after.total, null);
  const dm = requests.requestGroups(ctx.state, ctx.state.ext["dice-tray"], "dm")[0].rows[0];
  assert.equal(dm.readable, true);
  assert.ok(Number.isInteger(dm.total));
  const chat = await import("../chat-domain.mjs");
  const d3 = await import("../dice-3d-domain.mjs");
  const TD = await import("../dice-tray-domain.mjs");
  const total = String(dm.total);
  const playerLog = JSON.stringify(chat.projectLog(ctx.state, "player"));
  assert.doesNotMatch(playerLog, new RegExp(`"total":${total}\\b`));
  assert.match(playerLog, /tiro segreto, risultato solo al DM/);
  const shown = d3.recentRolls(ctx.state, "player", 20, { tray: TD });
  assert.ok(shown.every((roll) => roll.total === undefined || roll.total === null));
  assert.throws(
    () =>
      requests.createRequest(
        ctx.state,
        { kind: "save", ability: "dex", actorIds: ["livia"], audience: "gm" },
        "dm",
      ),
    /who sees the result/,
  );
});

// ---------------------------------------------------------------- privacy P3-6: fail closed

test("privacy P3-6: a roll audience the role may not use is refused, never widened to everyone", async () => {
  const TD = await import("../dice-tray-domain.mjs");
  const { ctx } = await app({ role: "dm" });
  assert.throws(
    () =>
      TD.prepareRoll(
        ctx.state.ext["dice-tray"],
        ctx.state,
        { kind: "free", formula: "1d20", audience: "gm" },
        "dm",
      ),
    /not available to you/,
  );
  const ok = TD.prepareRoll(
    ctx.state.ext["dice-tray"],
    ctx.state,
    { kind: "free", formula: "1d20", audience: "self" },
    "dm",
  );
  assert.equal(ok.audience, "self");
});

// ---------------------------------------------------------------- P2: conditions on the sheet

test("P2 (D&D Beyond conditions pane, Foundry status icons): a condition leaves the sheet with two clicks", async () => {
  const UI = await import("../conditions-ui.mjs");
  const { toggleCondition } = await import("../token-menu.mjs");
  const { ctx } = await app({ role: "player" });
  toggleCondition(ctx, "livia", "poisoned");
  const html = UI.renderConditionsSummary(ctx, "livia", { embedded: true });
  assert.match(html, /data-conditions-chip-manage="livia"/, "the chip opens the list");
  UI.quickEnd(ctx, "livia", "poisoned");
  const after = UI.renderConditionsSummary(ctx, "livia", { embedded: true });
  assert.doesNotMatch(after, /data-conditions-chip="poisoned"/);
  assert.match(ctx.state.log.at(-1).label, /Condizione terminata: Avvelenato/);
  // A reader who does not control the sheet sees the chip as text only.
  toggleCondition(ctx, "livia", "prone");
  ctx.role = "dm";
  const { renderConditionsSummary } = UI;
  assert.ok(renderConditionsSummary(ctx, "livia", { embedded: true }).includes("conditions-chip"));
});

// ---------------------------------------------------------------- P2: pop-out windows (X-10)

test("P2 X-10 (Foundry V14 pop-out): map-bound controls of a detached panel are relayed by name only", async () => {
  const T = await import("../table.mjs");
  const target = (attrs) => ({
    closest: (selector) => {
      const [, name, value] = selector.match(/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/) ?? [];
      return name && name in attrs && (value === undefined || attrs[name] === value)
        ? { getAttribute: (key) => attrs[key.replace(/^data-/, "")] ?? null }
        : null;
    },
  });
  assert.deepEqual(T.relayedControl(target({ "chat-show-token": "livia" })), {
    control: "show-token",
    value: "livia",
  });
  assert.deepEqual(T.relayedControl(target({ "chat-request": "" })), {
    control: "chat-request",
    value: null,
  });
  assert.deepEqual(T.relayedControl(target({ sv: "home" })), { control: "sv-home", value: null });
  assert.equal(T.relayedControl(target({ "chat-send": "" })), null, "own controls stay local");
  assert.equal(T.relayedSelector("show-token", "livia"), '[data-chat-show-token="livia"]');
  assert.equal(T.relayedSelector("show-token", 'x"] , body'), null, "never a forged selector");
  assert.equal(T.relayedSelector("nope", null), null);
});

// ---------------------------------------------------------------- search: every visible label

const found = async (ctx, words) => {
  const P = await import("../command-palette.mjs");
  const out = {};
  for (const word of words) out[word] = P.searchPalette(ctx, word).items.length;
  return out;
};
const noneEmpty = (counts) =>
  Object.entries(counts)
    .filter(([, n]) => !n)
    .map(([word]) => word);

test("SV-02/SV-03 (Alchemy OmniSearch, Foundry/Obsidian palettes): the labels on screen are search words", async () => {
  const { ctx } = await app({ role: "dm" });
  ctx.view = { page: "table", id: "", tab: "" };
  const dm = await found(ctx, [
    "tempo narrativo",
    "riposi e tempo",
    "avanza tempo",
    "passa il tempo",
    "barriere",
    "avvia sessione",
    "fine sessione",
    "avvia combattimento",
    "linea di vista",
    "mercante",
    "mazzo di carte",
    "nome casuale",
  ]);
  assert.deepEqual(noneEmpty(dm), [], JSON.stringify(dm));
  ctx.state.combat.active = true;
  assert.deepEqual(noneEmpty(await found(ctx, ["fine combattimento"])), []);
});

test("SV-02 findability: the player finds the open shop, printing, export, bonds and macros", async () => {
  const { ctx } = await app({ role: "player" });
  ctx.view = { page: "table", id: "", tab: "" };
  const P = await import("../command-palette.mjs");
  assert.equal(
    P.searchPalette(ctx, "bottega").items.filter((i) => /Carro di Tessa/.test(i.title?.it)).length,
    0,
    "a closed shop is not a result for the player",
  );
  ctx.state.ext.loot.merchants[0].open = true;
  const shop = P.searchPalette(ctx, "compra").items.find((i) => /Carro di Tessa/.test(i.title?.it));
  assert.ok(shop, "«compra» finds the open shop");
  assert.deepEqual(
    noneEmpty(await found(ctx, ["bottega", "stampa", "esporta personaggio", "legame", "macro"])),
    [],
  );
});

// ---------------------------------------------------------------- P2: sample creature attacks

test("P2 (Foundry SRD actors come with their actions): the Scout's action bar offers «Carica statistiche»", async () => {
  const EB = await import("../encounter-builder.mjs");
  const { listActions } = await import("../combat.mjs");
  const { ctx, registry } = await app({ role: "dm" });
  const noAttack = (id) => !listActions(ctx.state, id).some((a) => a.kind === "attack");
  assert.ok(noAttack("goblin-2"), "the sample Scout starts without attacks");
  assert.ok(EB.dockLoadOffer(ctx, "goblin-2"), "its name matches a stat block");
  const dock = registry
    .list("table-panel", ctx, { selectedActorId: "goblin-2" })
    .filter((c) => c.placement === "dock")
    .map((c) => c.id);
  assert.ok(dock.includes("encounter-builder-dock-load"));
  ctx.role = "player";
  assert.equal(EB.dockLoadOffer(ctx, "goblin-2"), null, "only whoever runs the session loads it");
});

// ---------------------------------------------------------------- P2: level-up spells

test("P2 (D&D Beyond level up: «Add 2 spells to your spellbook»): a wizard's level up asks its new spells", async () => {
  const { createInitialState } = await import("../state.mjs");
  const cb = await import("../character-build.mjs");
  const { levelChanges } = await import("../character-builder.mjs");
  const state = createInitialState();
  cb.createCharacterDraft(state, { id: "up", kind: "advance", actorId: "livia" }, "player");
  let d = cb.prepareLevelUp(state, "up", "player");
  let p = cb.previewCharacterDraft(state, "up", "player");
  const grant = p.choices.spellGrants.find((g) => g.id === "class:wizard");
  // SRD 5.2.1 Wizard table: level 3 → 4 adds one cantrip; the spellbook gains two spells.
  assert.deepEqual(
    {
      from: grant.levelUp.from,
      to: grant.levelUp.to,
      cantrips: grant.levelUp.cantrips,
      known: grant.levelUp.known,
    },
    { from: 3, to: 4, cantrips: 1, known: 2 },
  );
  assert.ok(grant.levelUp.onSheet > 0, "the sheet's own spells are counted");
  const ask = p.warnings.find((w) => w.code === "levelup-spells");
  assert.match(ask.it, /aggiungi 2 magie al libro \(0\/2\)/);
  const spells = p.sections.find((s) => s.id === "spells");
  assert.equal(spells.status, "review", "Magie is not «Completa» while the new spells are missing");
  assert.equal(spells.warnings[0].code, "levelup-spells", "and it says why");
  // Choosing them clears the request and the summary lists them.
  const rules = await import("../character-rules.mjs");
  const catalog = { spells: rules.spells };
  const pick = (level, n) =>
    (catalog?.spells ?? [])
      .filter((s) => s.level === level && s.classes?.includes("wizard"))
      .filter((s) => !(state.actors.livia.spells ?? []).some((own) => own.catalogId === s.id))
      .slice(0, n)
      .map((s) => ({ id: s.id, grantId: "class:wizard" }));
  if (catalog) {
    const features = structuredClone(d.data.features);
    features.selected = [{ id: "alert", grantId: "class:wizard:feat:4" }];
    const selected = [...pick(0, 1), ...pick(1, 2)];
    cb.saveCharacterDraft(
      state,
      "up",
      { data: { features, spells: { ...d.data.spells, selected } }, expectedRevision: d.revision },
      "player",
    );
    p = cb.previewCharacterDraft(state, "up", "player");
    assert.ok(!p.warnings.some((w) => w.code === "levelup-spells"), JSON.stringify(p.warnings));
    assert.equal(levelChanges(state.actors.livia, p.proposed).spellsGained.length, 3);
  }
});

// ---------------------------------------------------------------- TV-154 animated weather

test("TV-154 (Foundry scene «Weather Effect»): the DM sets an animated effect on a scene", async () => {
  const D = await import("../travel-domain.mjs");
  const { ctx, registry } = await app({ role: "dm" });
  const layer = registry.get("map-layer", "travel-weather", ctx);
  const scene = sceneOf(ctx.state);
  const draw = () => layer.svg(ctx, { scene });
  assert.equal(draw(), "", "no effect by default");
  ctx.commit("Meteo", (s) => D.setSceneWeather(s, s.ext.travel, scene.id, "snow", "dm"));
  assert.match(draw(), /data-travel-weather-layer="snow"[\s\S]*travel-weather-anim/);
  ctx.role = "player";
  assert.match(draw(), /data-travel-weather-layer="snow"/, "everyone at the Table sees it");
  assert.throws(() =>
    D.setSceneWeather(ctx.state, ctx.state.ext.travel, scene.id, "rain", "player"),
  );
  ctx.role = "dm";
  ctx.commit("Meteo", (s) => D.setSceneWeather(s, s.ext.travel, scene.id, "none", "dm"));
  assert.equal(draw(), "");
  assert.ok(registry.get("command", "travel.scene-weather", ctx), "found as a command");
});

// ---------------------------------------------------------------- TV-153 video backgrounds

test("TV-153 (Foundry WebM/MP4 scene backgrounds): a small video is a valid animated map", async () => {
  const P = await import("../preparation.mjs");
  const { esc } = await import("../ui.mjs");
  const video = "data:video/webm;base64," + "A".repeat(4000);
  assert.equal(P.backgroundKind(video), "video");
  assert.equal(P.backgroundKind("data:image/png;base64,AAAA"), "image");
  assert.equal(P.backgroundKind("data:text/html;base64,AAAA"), null, "only pictures and videos");
  assert.equal(
    P.backgroundKind(
      "data:video/mp4;base64," + "A".repeat(Math.ceil((P.MAX_VIDEO_BYTES * 4) / 3) + 200),
    ),
    null,
    "a video over the limit is refused",
  );
  const html = P.renderSceneBase({ width: 1000, height: 650, background: video }, { esc });
  assert.match(html, /<video [^>]*data-scene-video[^>]*muted/);
  assert.match(html, /autoplay loop/);
});

// ---------------------------------------------------------------- TV-151 inline chat rolls

test("TV-151 (Roll20 and Foundry inline rolls): «[[1d8+3]]» in a message is rolled once on sending", async () => {
  const chatUI = await import("../chat.mjs");
  const chatDomain = await import("../chat-domain.mjs");
  const { esc } = await import("../ui.mjs");
  await chatUI.neighboursReady;
  const rolls = chatUI.rollInline("Colpisco [[1d8+3]] e poi [[2d6]]", () => 4);
  assert.deepEqual(
    rolls.map((r) => [r.formula, r.total]),
    [
      ["1d8+3", 7],
      ["2d6", 8],
    ],
  );
  const { ctx } = await app({ role: "player" });
  const message = chatDomain.composeMessage(
    ctx.state,
    "player",
    { text: "Colpisco [[1d8+3]]", mode: "ooc", to: "all", inlineRolls: rolls.slice(0, 1) },
    { now: new Date().toISOString() },
  );
  assert.deepEqual(message.inlineRolls[0].total, 7);
  const html = chatUI.inlineTextHTML(
    { esc, t: (it) => it },
    { text: message.text, inlineRolls: message.inlineRolls },
  );
  assert.match(
    html,
    /Colpisco <span class="chat-inline-roll"[^>]*title="1d8\+3: 1d8 \[4\] \+ 3 = 7"[^>]*>7<\/span>/,
  );
  // A forged result that does not match the text's formula is not trusted.
  const forged = chatDomain.composeMessage(
    ctx.state,
    "player",
    {
      text: "[[1d20]]",
      mode: "ooc",
      to: "all",
      inlineRolls: [{ formula: "1d4", total: 20, detail: "" }],
    },
    { now: new Date().toISOString() },
  );
  assert.equal(forged.inlineRolls[0].error, true);
});

// ---------------------------------------------------------------- TV-150 persistent target

test("TV-150 (Foundry Target, T): a target stays, shows in the owner's colour and starts the attack", async () => {
  const TM = await import("../token-menu.mjs");
  const CU = await import("../combat-ui.mjs");
  const { ctx, registry } = await app({ role: "player" });
  assert.equal(TM.toggleTarget(ctx, "goblin-1"), true);
  assert.deepEqual(TM.targetsOf(ctx.state, "player"), ["goblin-1"]);
  assert.equal(ctx.state.log.at(-1).visibility, "private", "no line in everyone's log");
  // Fire Bolt (one target) starts on it; Magic Missile gives each target a dart.
  assert.deepEqual(CU.targetedSelection(ctx, "livia", "fire-bolt").targetIds, ["goblin-1"]);
  TM.toggleTarget(ctx, "goblin-2", { add: true });
  assert.deepEqual(CU.targetedSelection(ctx, "livia", "magic-missile").allocations, [
    { actorId: "goblin-1", count: 1 },
    { actorId: "goblin-2", count: 1 },
  ]);
  const layer = registry.get("map-layer", "token-menu-targets", ctx);
  const scene = sceneOf(ctx.state);
  assert.match(
    layer.svg(ctx, { scene }),
    /token-target is-own[^>]*data-token-target="goblin-1"[^>]*stroke="#6cb4ee"/,
  );
  ctx.role = "dm";
  assert.match(
    layer.svg(ctx, { scene }),
    /Bersaglio di un giocatore/,
    "the DM sees whose target it is",
  );
  ctx.role = "player";
  // T on the same token clears it; a hidden token cannot be targeted.
  assert.equal(TM.toggleTarget(ctx, "goblin-1"), false);
  ctx.state.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true;
  assert.throws(
    () => TM.toggleTarget(ctx, "goblin-2", { add: true }),
    /target only a token you see/,
  );
  assert.deepEqual(
    CU.targetedSelection(ctx, "livia", "fire-bolt").targetIds,
    [],
    "an unseen target is not used",
  );
  assert.ok(registry.get("command", "token-menu.target", ctx), "T is a command");
});

// ---------------------------------------------------------------- TV-152 token bars

test("TV-152 (Foundry bar 1/2, Roll20 three bars): a token shows a sheet resource as a bar", async () => {
  const TM = await import("../token-menu.mjs");
  const { ctx, registry } = await app({ role: "player" });
  const scene = sceneOf(ctx.state);
  const target = {
    actorId: "livia",
    tokenId: scene.tokens.find((t) => t.actorId === "livia").id,
    sceneId: scene.id,
  };
  const options = TM.barOptions(ctx.state.actors.livia, "it").map((row) => row.attr);
  assert.ok(
    options.includes("slots:1") && options.includes("temp-hp") && options.includes("hit-dice:d6"),
  );
  TM.setTokenBars(ctx, target, {
    bar2: { attr: "slots:1", show: "owner" },
    bar3: { attr: "hit-dice:d6", show: "all" },
  });
  const layer = registry.get("map-layer", "token-menu-bars", ctx);
  const own = layer.svg(ctx, { scene });
  assert.match(own, /data-token-bar="bar2"[\s\S]*Slot di 1° livello: 3\/4/);
  assert.match(own, /data-token-bar="bar3"[\s\S]*Dadi Vita d6: 2\/3/);
  // The DM reads both; another viewer only the one shown to everyone.
  ctx.role = "dm";
  assert.match(layer.svg(ctx, { scene }), /bar2/);
  const other = { ...ctx, role: "player", canControl: () => false };
  const shown = layer.svg(other, { scene });
  assert.doesNotMatch(shown, /bar2/);
  assert.match(shown, /bar3/);
  ctx.role = "player";
  assert.throws(() =>
    TM.setTokenBars(ctx, target, { bar2: { attr: "feature:nope", show: "all" } }),
  );
  // Spending a slot on the sheet moves the bar (read live).
  ctx.commit("Slot", (s) => (s.actors.livia.spellSlots[1].used = 3));
  assert.match(layer.svg(ctx, { scene }), /Slot di 1° livello: 1\/4/);
});

// ---------------------------------------------------------------- TV-155 one shared device

test("TV-155 (BG3 local co-op, hot seat): one device passes between players turn by turn", async () => {
  const SV = await import("../session-view.mjs");
  const { ctx, registry } = await app({ role: "player" });
  ctx.state.combat = { active: true, round: 1, turn: 1, order: ["livia", "goblin-1", "doran"] };
  assert.equal(SV.handoffTo(ctx), null, "off by default");
  registry.setSetting(ctx, SV.SHARED_DEVICE, true);
  assert.equal(SV.turnIdentity(ctx.state), "dm");
  assert.equal(SV.handoffTo(ctx), "dm", "the Sentinella's turn asks for the DM");
  const cover = registry.list("table-panel", ctx, {}).find((c) => c.placement === "cover");
  assert.equal(cover.id, "session-view-handoff", "the Table hides behind the hand-over");
  const html = registry.slot("table-panel", cover, ctx, {});
  assert.match(html, /Passa il dispositivo al DM \(Sentinella\)/);
  assert.doesNotMatch(html, /Livia \d+|punti ferita/, "nothing of the player's view is on it");
  ctx.role = "dm";
  assert.equal(SV.handoffTo(ctx), null, "the DM plays on");
  ctx.state.combat.turn = 0;
  assert.equal(SV.handoffTo(ctx), "player");
});

// ---------------------------------------------------------------- SV-56 two-step verification

test("SV-56 (Wizards/D&D Beyond and Roll20 2FA): the app's code is the second step, recovery codes work once", async () => {
  const A = await import("../account.mjs");
  const { ctx } = await app({ role: "player" });
  const s = ctx.state;
  const now = Date.parse("2026-10-01T10:00:05Z");
  const secret = A.beginTwoFactor(s, "player", { now });
  assert.match(secret, /^[A-Z2-7]{16}$/);
  assert.throws(() => A.confirmTwoFactor(s, "player", "000000x", { now }), /does not match/);
  const codes = A.confirmTwoFactor(s, "player", A.demoCode(secret, now), { now });
  assert.equal(codes.length, 10);
  A.signOut(s, "player", { now });
  assert.deepEqual(A.signIn(s, "player", "email", { now }), { secondStep: true });
  assert.equal(A.profileOf(s, "player").session, "signed-out", "still closed before the code");
  assert.throws(() => A.verifySecondStep(s, "player", "123", { now }), /Invalid code/);
  const used = A.verifySecondStep(s, "player", codes[0], { now });
  assert.deepEqual(used, { recovery: true, left: 9 });
  assert.equal(A.profileOf(s, "player").session, "account");
  A.signOut(s, "player", { now });
  A.signIn(s, "player", "email", { now });
  assert.throws(
    () => A.verifySecondStep(s, "player", codes[0], { now }),
    /Invalid code/,
    "a recovery code works once",
  );
  A.verifySecondStep(s, "player", A.demoCode(secret, now), { now });
  // Normalisation keeps the data across a reload.
  const again = A.normalizeAccount(JSON.parse(JSON.stringify(s.ext.account)));
  assert.equal(again.profiles.player.twoFactor.enabled, true);
  assert.equal(again.profiles.player.twoFactor.recovery.filter((r) => r.used).length, 1);
});

// ---------------------------------------------------------------- SV-28 age and consent

test("SV-28 (k-ID, Roll20 13/16): under 14 a parent's consent opens public tables; minors never see 18+", async () => {
  const A = await import("../account.mjs");
  const { ctx } = await app({ role: "player" });
  const s = ctx.state;
  const now = Date.parse("2026-10-01T10:00:00Z");
  assert.equal(A.agePolicy(s, "player").declared, false, "nothing asked until declared");
  assert.equal(A.declareAge(s, "player", 2015, { now }), "child");
  assert.equal(A.profileOf(s, "player").age.birthYear, null, "only the band is kept");
  assert.deepEqual(
    [A.agePolicy(s, "player").publicTables, A.agePolicy(s, "player").adultListings],
    [false, false],
  );
  A.requestParentConsent(s, "player", "genitore@example.test", { now });
  assert.equal(A.profileOf(s, "player").age.consent, "pending");
  A.answerParentConsent(s, "player", true, { now });
  assert.deepEqual(
    [A.agePolicy(s, "player").publicTables, A.agePolicy(s, "player").adultListings],
    [true, false],
  );
  assert.equal(A.declareAge(s, "dm", 2010, { now }), "teen");
  assert.equal(A.agePolicy(s, "dm").adultListings, false);
  assert.equal(A.ageBand(1990, now), "adult");
});

// ---------------------------------------------------------------- X-12 macros with code

test("X-12 (Roll20 macros and Mod, Avrae Draconic): a sandboxed macro rolls, decides and writes in the chat", async () => {
  const chatUI = await import("../chat.mjs");
  const C = await import("../chat-domain.mjs");
  await chatUI.neighboursReady;
  const { ctx } = await app({ role: "player" });
  const source = [
    "# attacco con il bastone",
    "tira attacco = 1d20+@destrezza+@competenza",
    "tira danno = 1d6+@forza",
    'se attacco >= 13 allora di "Colpito: {danno} danni"',
    'se attacco < 13 allora di "Mancato"',
    'sussurra "Tiro reale {attacco}"',
  ].join("\n");
  ctx.commit("Macro", (s) => C.saveMacro(s.ext.chat, "player", { name: "Bastone", source }), {
    local: true,
  });
  const [macro] = C.macrosOf(ctx.state.ext.chat, "player");
  const before = ctx.state.ext.chat.messages.length;
  const result = chatUI.runMacroNow(ctx, macro.id, () => 10);
  assert.equal(result.rolls.length, 2, "every roll is recorded");
  const posted = ctx.state.ext.chat.messages.slice(before);
  assert.equal(posted.length, 2, "one line for the table, one whisper to the DM");
  assert.match(posted[0].text, /^«Bastone»: (Colpito|Mancato)/);
  assert.equal(posted[0].inlineRolls.length, 2, "the rolls travel with the message");
  assert.equal(posted[1].to?.type, "dm");
  // The language never reaches JavaScript: unknown words and code are refused by line.
  assert.throws(() => C.parseMacro("tira x = 1d6\nalert(1)"), /Line 2/);
  assert.throws(
    () => C.runMacro(C.parseMacro("imposta x = constructor"), { attrs: {}, roll: () => ({}) }),
    /no value yet/,
  );
  assert.throws(
    () => C.parseMacro(Array.from({ length: 31 }, () => 'di "x"').join("\n")),
    /30 lines/,
  );
  // Macros are private to their author and survive a reload.
  assert.deepEqual(C.macrosOf(ctx.state.ext.chat, "dm"), []);
  assert.equal(
    C.normalizeChat(JSON.parse(JSON.stringify(ctx.state.ext.chat))).macros.player.length,
    1,
  );
});

// ---------------------------------------------------------------- TV-156 karmic dice

test("TV-156 (BG3 «Karmic Dice», off by default): a third low d20 in a row is rethrown and said", async () => {
  const TD = await import("../dice-tray-domain.mjs");
  const TRAY = await import("../dice-tray.mjs");
  const faces = [3, 4, 2, 17, 20];
  const { next, report } = TD.karmicDraw(() => faces.shift(), 0);
  assert.deepEqual([next(20), next(20), next(20)], [3, 4, 17]);
  assert.deepEqual(report.rethrown, [{ from: 2, to: 17 }]);
  assert.equal(report.streak, 0);
  assert.equal(TD.karmicDraw(() => 6, 0).next(8), 6, "only d20s");
  const { ctx, registry } = await app({ role: "player" });
  assert.equal(TRAY.karmaOn(ctx), false, "off unless the DM chooses it");
  let low = [2, 3, 1, 15];
  ctx.rollDie = () => low.shift();
  const roll = () =>
    TRAY.rollFromTray(ctx, { kind: "free", formula: "1d20", audience: "public", mode: "digital" });
  roll();
  roll();
  assert.equal(roll().total, 1, "no karma while off");
  ctx.role = "dm";
  registry.setSetting(ctx, "dice-tray-campaign.karmic", true);
  ctx.role = "player";
  low = [2, 3, 1, 15];
  roll();
  roll();
  const third = roll();
  assert.equal(third.total, 15);
  assert.deepEqual(third.karmic, [{ from: 1, to: 15 }]);
  assert.match(ctx.state.log.at(-1).label, /dadi karmici: 1 → 15/);
  ctx.role = "dm";
  low = [1, 1, 1];
  const dmRolls = [roll(), roll(), roll()].map((r) => r.total);
  assert.deepEqual(dmRolls, [1, 1, 1], "the DM's dice are never touched");
});

test("privacy P1-3: the sheet's own click-to-roll (F10) on a hidden creature is the DM's", async () => {
  const SP = await import("../sheet-plus.mjs");
  const { ctx } = await withHidden();
  SP.quickRoll(ctx, "cnry-shadow", "skill", "stealth");
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  assert.equal((await playerReads(ctx.state, "CNRYD4")).log, false);
  // A visible creature's roll stays for everyone.
  SP.quickRoll(ctx, "goblin-1", "skill", "stealth");
  assert.notEqual(ctx.state.log.at(-1).visibility, "private");
});

// ---------------------------------------------------------------- exposure on screen

test("P2 exposure (Owlbear tool options; D&D Beyond mobile «Manage»): nothing sits out of view", async () => {
  const { readFileSync } = await import("node:fs");
  const css = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  // The fog and drawing option bars are not under the map caption.
  assert.match(
    css("styles.css"),
    /\.map-container:has\(#battle-map \.fv-bar, #battle-map \.annotations-bar\) > \.map-caption \{\s*opacity: 0;/,
  );
  // The sheet's header commands wrap on a phone instead of scrolling off the screen.
  const phone = css("characters.css");
  assert.match(phone, /\.character-heading \.toolbar \{\s*flex-wrap: wrap;\s*overflow-x: visible;/);
  // On a phone the Table opens on its scene header, never on a remembered panel's field.
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  assert.match(
    table,
    /root\.querySelector\("\.table-topline"\) \?\? root\.querySelector\("\.table-stage"\)/,
  );
  assert.match(table, /active\.blur\(\)/);
});

// ---------------------------------------------------------------- P3 loot of a defeated creature

test("P3 (Item Piles: the defeated creature becomes loot with its gear): Bottino on a creature starts filled", async () => {
  const { ctx, registry } = await app({ role: "dm" });
  const scene = sceneOf(ctx.state);
  const actor = ctx.state.actors["goblin-1"];
  const creatureId = actor.compendiumRef?.id ?? actor.encounterBlock?.creatureId;
  const entry = registry.get("token-menu", "loot-open", ctx, {
    actorId: "goblin-1",
    sceneId: scene.id,
    tokenId: scene.tokens.find((t) => t.actorId === "goblin-1").id,
  });
  assert.ok(entry, "the DM finds Bottino on the creature");
  try {
    registry.run(entry, ctx, { actorId: "goblin-1", sceneId: scene.id });
  } catch {
    /* the drawer needs the page; the parcel is committed first */
  }
  const parcel = ctx.state.ext.loot.parcels.find((p) => p.sourceActorId === "goblin-1");
  assert.ok(parcel, "a parcel is prepared");
  if (creatureId) assert.ok(parcel.items.length > 0, "with the stat block's gear");
});

test("P3 (D&D Beyond: one dice setting): the sheet shows and changes the dice its numbers roll with", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../sheet-plus.mjs", import.meta.url), "utf8");
  assert.match(source, /data-shp="dice" data-mode="physical"/);
  assert.match(source, /setSetting\(ctx, "dice-tray\.dice", control\.dataset\.mode\)/);
  const combat = readFileSync(new URL("../combat-ui.mjs", import.meta.url), "utf8");
  assert.match(combat, /diceMode = sharedDice\(ctx\) \?\? diceMode/, "the action bar follows it");
});

test("P2 TV-14 (Foundry reads the double click on the canvas): two presses on one token, one redraw apart", async () => {
  const { readFileSync } = await import("node:fs");
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  const press = table.slice(table.indexOf('if (token && mode === "move")'));
  assert.match(press.slice(0, 1400), /last\.actorId === token\.dataset\.actor/);
  assert.match(press.slice(0, 1400), /last\.role === ctx\.role/, "never across identities");
  assert.match(
    press.slice(0, 1400),
    /mapBinds - last\.bind <= 1/,
    "only the redraw of the first press",
  );
  assert.match(press.slice(0, 1400), /at - last\.at < DOUBLE_PRESS_MS/);
  assert.match(press.slice(0, 1400), /openFromToken\(token\.dataset\.actor\)/);
});

test("close regression (Foundry: a drag leaves the click sequence): a press that became a drag never starts a double press", async () => {
  // gestures-and-views: a drag cancelled with Esc and a new drag of the same token right after
  // opened the sheet instead of moving the token.
  const { readFileSync } = await import("node:fs");
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  const move = table.slice(table.indexOf("svg.onpointermove = (e) => {"));
  const drag = move.slice(move.indexOf("if (dragging) {"), move.indexOf("if (dragging) {") + 400);
  assert.match(
    drag,
    /dragging\.moved = true;\s*lastTokenPress = null;/,
    "the drag forgets the press it started from",
  );
});

test("close regression (Finder and VS Code reveal what a folder unfolds): an unfolded campaign group scrolls its sections into view", async () => {
  // w2a1-shell at 1440: with «Entra al Tavolo» above the rail, «Ambientazione» unfolded its
  // «Mappa del mondo» below the window, and «Tutte le sezioni» exists only on a phone.
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../app.mjs", import.meta.url), "utf8");
  const toggle = app.slice(app.indexOf('querySelectorAll("[data-campaign-group-toggle]")'));
  const handler = toggle.slice(0, toggle.indexOf("}),"));
  assert.match(handler, /if \(open\) items\?\.scrollIntoView\?\.\(\{ block: "nearest" \}\)/);
  assert.doesNotMatch(handler, /render\(\)/, "still folded in place");
});

test("close regression (D&D Beyond quick-jump, the Table's «Tutti i pannelli»): «Tutte le sezioni» leads the campaign rail on desktop too", async () => {
  // w2a1-shell at 1440 × 900: with «Racconto» open the «Ambientazione» heading sat at y 909,
  // below the window, and «Tutte le sezioni» was hidden outside the phone.
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const phone = css.indexOf(".campaign-sections {\n    display: flex;\n    align-items: stretch;");
  assert.ok(phone > 0, "the phone strip rule is still there");
  const desktop = css.slice(0, css.lastIndexOf("@media", phone));
  assert.doesNotMatch(desktop, /\.campaign-sidebar \.campaign-sections-all \{\s*display: none;/);
  assert.match(desktop, /\.campaign-sections \{\s*display: flex;\s*flex-direction: column;/);
  assert.match(desktop, /\.campaign-sidebar \.campaign-sections-all \{\s*order: -1;/, "first");
  // On the phone it stays pinned at the end of the sideways strip.
  const strip = css.slice(phone, phone + 700);
  assert.match(
    strip,
    /\.campaign-sections \{\s*display: flex;\s*align-items: stretch;\s*flex-direction: row;/,
  );
  assert.match(strip, /\.campaign-sidebar \.campaign-sections-all \{\s*display: flex;\s*order: 0;/);
});
