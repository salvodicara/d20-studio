// B45 — exploration and travel: formation and Place Party, journey with SRD pace and the
// shared clock, proposed events, weather, provisions with consent, torch light on the clock,
// Search with found containers, checks with physical/digital dice, and the UI handlers,
// with the real store and registry. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as T from "../travel.mjs";
import * as D from "../travel-domain.mjs";
import { harness, mount, plain, tableView, tableDouble } from "./travel-harness.mjs";

afterEach(() => T.resetTravelView());
const giveTorches = (h, actorId, quantity) =>
  h.run((draft) => {
    draft.actors[actorId].inventory.push({
      id: `torches-${actorId}`,
      srdId: "srd2024:item:torch",
      name: { it: "Torcia", en: "Torch" },
      quantity,
      kind: "gear",
      equipped: false,
    });
  });
const advance = (h, seconds) =>
  h.run((draft) => {
    draft.restTime ??= { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
    const clock = (draft.restTime.clocks.lanterns ??= { seconds: 0, revision: 0 });
    clock.seconds += seconds;
    clock.revision++;
  });

// ------------------------------------------------------------------ registration
test("registration: two slices (rolls preserved), sidebar tab, inspector, DM tools, layers, bell, sheet", () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.slice().campaigns), ["lanterns"]);
  assert.equal(h.camp().journey.to, "Porto Grigio");
  assert.equal(h.store().state.extVersions?.travel ?? 1, 1);
  const normalized = D.normalizeSlice(structuredClone(h.slice()), 1);
  assert.deepEqual(D.normalizeSlice(structuredClone(normalized), 1), normalized);
  assert.throws(() => D.normalizeSlice({}, 2), /newer version/);
  const view = tableView(h);
  const panels = h.registry.list("table-panel", h.ctx, view).map((c) => `${c.id}:${c.placement}`);
  assert.ok(panels.includes("travel:sidebar-tab") && panels.includes("travel-inspector:inspector"));
  const tools = (role) => {
    h.ctx.role = role;
    return h.registry.list("table-tool", h.ctx, view).map((c) => `${c.id}:${c.group}`);
  };
  assert.deepEqual(tools("dm"), ["travel-place:dm", "travel-point:dm"]);
  assert.deepEqual(tools("player"), [], "Place Party and search points are the DM’s");
  assert.ok(h.registry.get("sheet-section", "travel-supplies", h.ctx, h.ctx.state.actors.livia));
  assert.equal(
    h.registry.get("sheet-section", "travel-supplies", h.ctx, h.ctx.state.actors["goblin-1"]),
    null,
    "only party characters have the light and provisions section",
  );
  assert.ok(h.registry.get("command", "travel.open", h.ctx));
});

// ------------------------------------------------------------------ formation
test("formation: pick and swap, FG quick fill, BG3 group all, facing and marching order", () => {
  const h = harness({ role: "player" });
  assert.deepEqual(D.marchingOrder(h.camp().formation), [["doran"], ["livia", "mira"]]);
  h.run((d, s) => D.moveInFormation(d, s, { actorId: "livia", cell: 1 }, "player"));
  assert.equal(h.camp().formation.cells[1], "livia", "Livia takes the front");
  assert.equal(h.camp().formation.cells[3], "doran", "Doran swaps into her old cell");
  h.run((d, s) => D.moveInFormation(d, s, { actorId: "mira", cell: null }, "player"));
  assert.deepEqual(D.unplaced(h.ctx.state, h.camp().formation), ["mira"]);
  h.run((d, s) => D.groupAll(d, s, "player"));
  assert.deepEqual(D.unplaced(h.ctx.state, h.camp().formation), []);
  assert.throws(() => h.run((d, s) => D.groupAll(d, s, "player")), /già in formazione/);
  h.run((d, s) => D.quickFill(d, s, { columns: 1 }, "player"));
  assert.equal(D.marchingOrder(h.camp().formation).length, 3, "one per rank in a single file");
  h.run((d, s) => D.quickFill(d, s, { columns: 3 }, "player"));
  assert.equal(D.marchingOrder(h.camp().formation).length, 1, "three abreast");
  h.run((d, s) => D.rotateFormation(d, s, { turn: 1 }, "player"));
  assert.equal(h.camp().formation.facing, "east");
  assert.throws(
    () => h.run((d, s) => D.moveInFormation(d, s, { actorId: "goblin-1", cell: 0 }, "player")),
    /Solo i personaggi del gruppo/,
  );
});

test("Place Party (Roll20) keeps the FG formation, rotated by facing; DM only, never during combat; Undo", () => {
  const h = harness({ role: "dm" });
  assert.throws(
    () =>
      h.run(
        (d, s) => D.placeParty(d, s, { sceneId: "old-watch", point: { x: 500, y: 300 } }, "player"),
        "player",
      ),
    /Solo il DM/,
  );
  h.run((d, s) => D.placeParty(d, s, { sceneId: "old-watch", point: { x: 510, y: 310 } }, "dm"));
  const at = (id) => h.ctx.state.scenes[0].tokens.find((t) => t.actorId === id);
  // Doran leads (row 0, middle column); Livia and Mira behind him, one cell apart.
  assert.deepEqual([at("doran").x, at("doran").y], [525, 325]);
  assert.deepEqual([at("livia").x, at("livia").y], [475, 375]);
  assert.deepEqual([at("mira").x, at("mira").y], [575, 375]);
  assert.ok(
    [at("doran"), at("livia"), at("mira")].every((t) => t.x % 50 === 25 && t.y % 50 === 25),
  );
  h.run((d, s) => D.rotateFormation(d, s, { turn: 1 }, "dm"));
  h.run((d, s) => D.placeParty(d, s, { sceneId: "old-watch", point: { x: 510, y: 310 } }, "dm"));
  assert.ok(at("doran").x > at("livia").x, "facing east: the front rank is to the right");
  h.ctx.undo();
  assert.deepEqual(
    [at("doran").x, at("doran").y],
    [525, 325],
    "Undo restores the previous placement",
  );
  h.run((draft) => {
    draft.combat.active = true;
  });
  assert.throws(
    () =>
      h.run((d, s) =>
        D.placeParty(d, s, { sceneId: "old-watch", point: { x: 300, y: 300 } }, "dm"),
      ),
    /Durante il combattimento/,
  );
});

test("Place Party adds a token for a member without one; the tool places on click and on Enter", () => {
  const h = harness({ role: "dm" });
  h.run((draft) => {
    draft.scenes[0].tokens = draft.scenes[0].tokens.filter((t) => t.actorId !== "mira");
  });
  const table = tableDouble(h, "travel-place");
  const tool = h.registry.get("table-tool", "travel-place", h.ctx, table);
  tool.activate(h.ctx, table);
  assert.match(table.messages[0], /Clicca sulla mappa/);
  tool.onClick(h.ctx, { x: 200, y: 200 }, table);
  const mira = h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "mira");
  assert.ok(mira && mira.id === "token-mira", "Mira joins the scene in formation");
  assert.equal(table.mode, "move", "the tool returns to Move after placing");
  table.mode = "travel-place";
  tool.onKeyDown(h.ctx, { key: "Enter", target: {}, preventDefault() {} }, table);
  const doran = h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "doran");
  assert.deepEqual([doran.x, doran.y], [525, 325], "Enter places around the scene centre");
});

// ------------------------------------------------------------------ journey
test("journey: SRD pace options by terrain, road and slower travelers; travel advances the shared clock", () => {
  const h = harness({ role: "dm" });
  const j = h.camp().journey;
  const allowed = (journey) =>
    D.paceOptions(h.ctx.state, journey)
      .filter((o) => o.allowed)
      .map((o) => o.pace.id);
  assert.deepEqual(allowed(j), ["slow", "normal", "fast"], "hills with a good road allow Fast");
  assert.deepEqual(allowed({ ...j, road: false }), ["slow", "normal"], "hills allow Normal");
  assert.deepEqual(allowed({ ...j, terrain: "mountain", road: false }), ["slow"]);
  // Exhaustion 3 takes 4.5 m off Mira's 9 m: half Speed forces a Slow pace (SRD).
  h.run((draft) => {
    draft.actors.mira.exhaustion = 3;
  });
  assert.deepEqual(allowed(j), ["slow"]);
  assert.match(D.paceOptions(h.ctx.state, j)[1].reason.it, /Mira ha la Velocità dimezzata/);
  assert.throws(
    () => h.run((d, s) => D.setPace(d, s, { pace: "fast" }, "dm")),
    /deve andare lento/,
  );
  h.run((draft) => {
    draft.actors.mira.exhaustion = 0;
  });
  h.run((d, s) => D.setPace(d, s, { pace: "fast" }, "dm"));
  const out = h.run((d, s) => D.travel(d, s, { id: "leg-1", hours: 8 }, "dm"));
  assert.equal(out.plan.km, 45, "a full day at Fast pace: the SRD Day column (30 mi = 45 km)");
  assert.equal(h.ctx.state.restTime.clocks.lanterns.seconds, 8 * 3600, "the rest-time clock moved");
  assert.equal(h.camp().journey.travelledKm, 45);
  const slow = D.travelPlan(h.ctx.state, { ...h.camp().journey, pace: "slow", hoursByDay: {} }, 8);
  assert.equal(slow.km, 27, "a full day at Slow pace: 18 mi = 27 km, not 8 × 3 km");
  assert.equal(h.camp().checks.length, 0, "8 hours is not Extended Travel");
  assert.throws(
    () => h.run((d, s) => D.travel(d, s, { id: "leg-p", hours: 1 }, "player"), "player"),
    /Solo il DM/,
  );
});

test("Extended Travel: each hour past 8 asks every traveler a Constitution save (DC 10 + 1/hour)", () => {
  const h = harness({ role: "dm" });
  const plan = D.travelPlan(h.ctx.state, h.camp().journey, 10);
  assert.deepEqual(plan.saves, [
    { hour: 9, dc: 11 },
    { hour: 10, dc: 12 },
  ]);
  h.run((d, s) => D.travel(d, s, { id: "leg-long", hours: 10 }, "dm"));
  const saves = h.camp().checks.filter((c) => c.kind === "extended");
  assert.equal(saves.length, 6, "two saves for each of three travelers");
  assert.ok(saves.every((c) => c.save && c.ability === "con" && [11, 12].includes(c.dc)));
  // Same day, more hours: the count continues from the day's 10 hours.
  const next = D.travelPlan(h.ctx.state, h.camp().journey, 1);
  assert.deepEqual(next.saves, [{ hour: 11, dc: 13 }]);
});

test("arrival, summary by the DM (clock only by the stated days) and a new journey", () => {
  const h = harness({ role: "dm" });
  assert.throws(() => h.run((d, s) => D.cancelJourney(d, s, { reason: " " }, "dm")), /motivo/);
  h.run((d, s) => D.cancelJourney(d, s, { reason: "Prima si va a Bruma" }, "dm"));
  h.run((d, s) =>
    D.startJourney(
      d,
      s,
      { from: "Bruma", to: "Ponte di pietra", km: 9, terrain: "hill", road: true },
      "dm",
    ),
  );
  assert.equal(h.camp().journeyHistory.at(-1).status, "cancelled");
  // A second start while one is underway is refused.
  assert.throws(
    () =>
      h.run((d, s) => D.startJourney(d, s, { from: "a", to: "b", km: 5, terrain: "hill" }, "dm")),
    /già un viaggio in corso/,
  );
  const out = h.run((d, s) => D.travel(d, s, { id: "leg", hours: 4 }, "dm"));
  assert.equal(out.plan.arrives, true);
  assert.equal(out.plan.seconds, 2 * 3600, "9 km at 4.5 km/h: two hours, not four");
  assert.equal(h.camp().journey.status, "arrived");
  h.run((d, s) =>
    D.startJourney(
      d,
      s,
      { from: "Ponte di pietra", to: "Porto Grigio", km: 62, terrain: "coastal" },
      "dm",
    ),
  );
  assert.equal(h.camp().journeyHistory.at(-1).to, "Ponte di pietra");
  const before = h.ctx.state.restTime.clocks.lanterns.seconds;
  h.run((d, s) =>
    D.summarizeJourney(d, s, { id: "sum", days: 2, note: "Pioggia e strade vuote." }, "dm"),
  );
  assert.equal(h.ctx.state.restTime.clocks.lanterns.seconds - before, 2 * 86400);
  assert.equal(h.camp().journey.status, "arrived");
});

test("travel is refused while the party rests and offline (shared change)", () => {
  const h = harness({ role: "dm" });
  h.run((draft) => {
    draft.restTime = {
      version: 1,
      clocks: {},
      rests: [{ id: "r", participants: [{ actorId: "livia", status: "resting" }] }],
      rolls: [],
      events: [],
    };
  });
  assert.throws(
    () => h.run((d, s) => D.travel(d, s, { id: "x", hours: 1 }, "dm")),
    /sta riposando/,
  );
  h.run((draft) => {
    draft.restTime.rests = [];
  });
  h.ctx.offline = true;
  T.resetTravelView();
  const panel = h.registry.get("table-panel", "travel", h.ctx, tableView(h));
  const html = h.registry.slot("table-panel", panel, h.ctx, tableView(h));
  const ui = mount(html, (root) => panel.bind(root, h.ctx, tableDouble(h)));
  ui.click('[data-travel-sub="journey"]');
  const html2 = h.registry.slot("table-panel", panel, h.ctx, tableView(h));
  const ui2 = mount(html2, (root) => panel.bind(root, h.ctx, tableDouble(h)));
  ui2.click("[data-travel-go]");
  assert.match(h.toasts.at(-1).text, /senza rete/);
  assert.equal(h.camp().journey.travelledKm, 0);
});

// ------------------------------------------------------------------ events
test("travel events: the die result is a DM proposal; accepting asks the check with the pace effect", () => {
  const h = harness({ role: "dm" });
  h.run((d, s) => D.setPace(d, s, { pace: "fast" }, "dm"));
  const { event } = h.run((d, s, r) =>
    D.drawEvent(d, s, r, { id: "ev", mode: "physical", faces: [5] }, "dm", () => 1),
  );
  assert.equal(event.rowId, "tracks");
  assert.equal(event.status, "proposed");
  assert.equal(h.camp().checks.length, 0, "nothing applied by the draw");
  assert.deepEqual(
    D.visibleEvents(h.ctx.state, h.camp(), "player"),
    [],
    "players do not see proposals",
  );
  assert.throws(
    () =>
      h.run((d, s, r) =>
        D.drawEvent(d, s, r, { id: "ev2", mode: "physical", faces: [1] }, "dm", () => 1),
      ),
    /Decidi prima/,
  );
  h.run((d, s) =>
    D.decideEvent(d, s, { eventId: "ev", accept: true, actorIds: ["livia", "mira"] }, "dm"),
  );
  const checks = h.camp().checks;
  assert.equal(checks.length, 2);
  assert.equal(checks[0].dc, 15, "hill Search DC from the SRD Travel Terrain table");
  const profile = D.checkProfile(h.ctx.state, checks[1]);
  assert.equal(profile.mode, "disadvantage", "Fast pace: Disadvantage on Perception");
  assert.equal(D.visibleEvents(h.ctx.state, h.camp(), "player").length, 1);
  const roll = h.rolls().rolls.find((r) => r.id === event.rollId);
  assert.equal(roll.visibility, "private");
  assert.equal(roll.mode, "physical");
});

// ------------------------------------------------------------------ checks and dice
test("checks: physical faces, reasoned correction, Advantage with two d20, passive score, reuse after Undo", () => {
  const h = harness({ role: "player", dice: [7, 7] });
  h.run((d, s) => D.setPace(d, s, { pace: "slow" }, "dm"), "dm");
  h.run(
    (d, s, r) => D.drawEvent(d, s, r, { id: "ev", mode: "physical", faces: [4] }, "dm", () => 1),
    "dm",
  );
  h.run(
    (d, s) =>
      D.decideEvent(d, s, { eventId: "ev", accept: true, actorIds: ["livia", "mira"] }, "dm"),
    "dm",
  );
  const [livia, mira] = h.camp().checks;
  assert.equal(
    D.checkProfile(h.ctx.state, livia).mode,
    "advantage",
    "Slow pace: Advantage on Survival",
  );
  assert.throws(
    () =>
      h.run((d, s, r) =>
        D.rollCheck(
          d,
          s,
          r,
          { checkId: livia.id, mode: "physical", faces: [12] },
          "player",
          h.ctx.rollDie,
        ),
      ),
    /2 facce/,
  );
  h.run((d, s, r) =>
    D.rollCheck(
      d,
      s,
      r,
      { checkId: livia.id, mode: "physical", faces: [12, 5] },
      "player",
      h.ctx.rollDie,
    ),
  );
  const rolled = h.camp().checks[0];
  assert.equal(rolled.natural, 12, "Advantage keeps the higher d20");
  assert.equal(rolled.total, 13, "Wisdom 12: +1");
  h.run((d, s, r) =>
    D.correctCheck(d, s, r, { checkId: livia.id, faces: [16, 5], reason: "letto male" }, "player"),
  );
  assert.equal(h.camp().checks[0].total, 17);
  assert.equal(h.rolls().rolls.find((r) => r.id === rolled.rollId).corrections[0].values[0], 12);
  // Mira rolls digital; Undo reverts the check but the faces stay and are reused once.
  h.run((d, s, r) =>
    D.rollCheck(d, s, r, { checkId: mira.id, mode: "digital" }, "player", h.ctx.rollDie),
  );
  const first = h.camp().checks[1].rollId;
  h.ctx.undo();
  assert.equal(h.camp().checks[1].status, "pending");
  assert.equal(h.rolls().rolls.length, 3, "the undone roll stays as evidence");
  h.run((d, s, r) =>
    D.rollCheck(d, s, r, { checkId: mira.id, mode: "digital" }, "player", () => 20),
  );
  const second = h.rolls().rolls.at(-1);
  assert.equal(second.reusedFrom, first, "an Undo is not a new roll");
  assert.equal(h.camp().checks[1].natural, 7);
  // The DM may use a passive score for a pending check (not a save).
  h.run(
    (d, s, r) => D.drawEvent(d, s, r, { id: "ev3", mode: "physical", faces: [5] }, "dm", () => 1),
    "dm",
  );
  h.run(
    (d, s) => D.decideEvent(d, s, { eventId: "ev3", accept: true, actorIds: ["mira"] }, "dm"),
    "dm",
  );
  const pending = h.camp().checks.at(-1);
  h.run((d, s) => D.usePassive(d, s, { checkId: pending.id }, "dm"), "dm");
  // Mira: Perception proficient (+2 PB) with Wisdom from her sheet; Slow pace adds +5.
  const passive = h.camp().checks.at(-1);
  assert.equal(passive.status, "passive");
  assert.equal(passive.total, D.passiveScore(h.ctx.state.actors.mira, pending) + 5);
});

test("Exhaustion lowers the check by 2 per level and the bonus comes from the sheet", () => {
  const h = harness({ role: "dm" });
  const check = { actorId: "livia", ability: "con", save: true };
  const base = D.checkProfile(h.ctx.state, check).bonus;
  assert.equal(base, 2, "Livia: Constitution 14, a Wizard is not proficient in CON saves");
  const doran = D.checkBonus(h.ctx.state.actors.doran, { ability: "con", save: true });
  assert.equal(doran.bonus, 4, "Doran: Fighter, proficient in Constitution saves");
  h.run((draft) => {
    draft.actors.livia.exhaustion = 2;
  });
  assert.equal(D.checkProfile(h.ctx.state, check).bonus, base - 4);
});

// ------------------------------------------------------------------ weather
test("weather: climate and calendar season, DM-only until shared, change with reason, map overlay", () => {
  const h = harness({ role: "dm" });
  assert.equal(D.weatherSeason(h.ctx.state, h.camp()), "autumn");
  h.run((d, s, r) => D.generateWeather(d, s, r, { mode: "physical", faces: [17] }, "dm", () => 1));
  const day = D.todayWeather(h.ctx.state, h.camp(), "dm");
  assert.equal(day.conditionId, "heavy-rain", "temperate autumn, 16–18: heavy rain");
  assert.ok(D.WEATHER["heavy-rain"].effects[0].source.it.pages.includes(223));
  assert.deepEqual(D.todayWeather(h.ctx.state, h.camp(), "player"), { hidden: true });
  h.run((d, s) => D.shareWeather(d, s, { shared: true }, "dm"));
  assert.equal(D.todayWeather(h.ctx.state, h.camp(), "player").conditionId, "heavy-rain");
  assert.throws(() => h.run((d, s) => D.setWeather(d, s, { conditionId: "fog" }, "dm")), /motivo/);
  h.run((d, s) =>
    D.setWeather(d, s, { conditionId: "fog", reason: "La valle trattiene la nebbia" }, "dm"),
  );
  const edited = D.todayWeather(h.ctx.state, h.camp(), "player");
  assert.equal(edited.conditionId, "fog");
  assert.equal(edited.shared, true, "sharing survives the change");
  assert.equal(edited.changes[0].reason.it, "La valle trattiene la nebbia");
  h.run((d, s) => D.weatherOnMap(d, s, { onMap: true }, "dm"));
  const layer = h.registry.get("map-layer", "travel-weather", h.ctx, tableView(h));
  assert.match(layer.svg(h.ctx, tableView(h)), /travel-fog/);
  h.ctx.role = "player";
  assert.throws(
    () => h.run((d, s) => D.setClimate(d, s, { climate: "cold" }, "player"), "player"),
    /Solo il DM/,
  );
});

// ------------------------------------------------------------------ provisions
test("provisions: proposed by the DM, consent by the owner, rations from the inventory, warnings only", () => {
  const h = harness({ role: "dm" });
  h.run((draft) => {
    draft.actors.livia.inventory.push({
      id: "rations-livia",
      srdId: "srd2024:item:rations",
      name: { it: "Razioni", en: "Rations" },
      quantity: 3,
      kind: "gear",
    });
  });
  h.run((d, s) => D.proposeProvisions(d, s, { water: "scarce" }, "dm"));
  const day = D.now(h.ctx.state).day;
  assert.throws(
    () => h.run((d, s) => D.answerProvisions(d, s, { actorId: "livia", choice: "eat" }, "dm")),
    /consenso spetta/,
    "the DM does not eat for a player",
  );
  h.run(
    (d, s) => D.answerProvisions(d, s, { actorId: "livia", choice: "eat" }, "player"),
    "player",
  );
  assert.equal(D.rationCount(h.ctx.state.actors.livia), 2, "one Rations left the sheet inventory");
  assert.throws(
    () =>
      h.run(
        (d, s) => D.answerProvisions(d, s, { actorId: "mira", choice: "eat" }, "player"),
        "player",
      ),
    /Servono 1 razione/,
  );
  h.run(
    (d, s) => D.answerProvisions(d, s, { actorId: "mira", choice: "skip" }, "player"),
    "player",
  );
  h.run((d, s) => D.answerProvisions(d, s, { actorId: "doran", choice: "other" }, "dm"));
  const warnings = D.provisionWarnings(h.ctx.state, h.camp(), day);
  assert.deepEqual(
    warnings.map((w) => `${w.kind}:${w.actorId}`),
    ["food:mira", "water:null"],
  );
  assert.match(warnings[0].text.it, /nulla viene applicato da solo/);
  assert.equal(h.ctx.state.actors.mira.exhaustion ?? 0, 0, "no automatic Exhaustion");
  assert.throws(
    () => h.run((d, s) => D.proposeProvisions(d, s, { water: "available" }, "dm")),
    /già proposto/,
  );
});

// ------------------------------------------------------------------ light
test("torch: lighting uses one from the inventory; 1 hour on the clock, warning at 10 minutes, then out", () => {
  const h = harness({ role: "player" });
  assert.throws(
    () => h.run((d, s) => D.lightTorch(d, s, { id: "l0", actorId: "livia" }, "player")),
    /non ha torce/,
  );
  giveTorches(h, "livia", 2);
  h.run((d, s) => D.lightTorch(d, s, { id: "l1", actorId: "livia" }, "player"));
  assert.equal(D.torchCount(h.ctx.state.actors.livia), 1);
  assert.throws(
    () => h.run((d, s) => D.lightTorch(d, s, { id: "l2", actorId: "livia" }, "player")),
    /già una torcia/,
  );
  assert.throws(
    () => h.run((d, s) => D.lightTorch(d, s, { id: "l3", actorId: "doran" }, "player")),
    /Non controlli/,
  );
  const light = () => h.camp().lights[0];
  const status = () => D.lightStatus(light(), D.clockSeconds(h.ctx.state)).state;
  assert.equal(status(), "lit");
  advance(h, 50 * 60);
  assert.equal(status(), "warning");
  const bell = h.registry.notifications?.(h.ctx) ?? [];
  assert.ok(
    bell.some((n) => /si spegne tra 10 min/.test(n.title?.it ?? n.title)),
    "the bell warns ten minutes before",
  );
  const layer = h.registry.get("map-layer", "travel-layer", h.ctx, tableView(h));
  assert.match(layer.svg(h.ctx, tableView(h)), /travel-light-glow is-warning/);
  advance(h, 10 * 60);
  assert.equal(status(), "burnt");
  assert.doesNotMatch(layer.svg(h.ctx, tableView(h)), /travel-light-glow/, "the light goes out");
  h.run((d, s) => D.lightTorch(d, s, { id: "l4", actorId: "livia" }, "player"));
  h.run((d, s) => D.extinguish(d, s, { lightId: "l4" }, "player"));
  assert.equal(D.lightStatus(h.camp().lights[1], D.clockSeconds(h.ctx.state)).state, "out");
  assert.equal(D.torchCount(h.ctx.state.actors.livia), 0);
});

// ------------------------------------------------------------------ search
test("Search (BG3): Perception finds nearby points by DC, lists empty containers, items go to the sheet", () => {
  const h = harness({ role: "player" });
  const { record } = h.run((d, s, r) =>
    D.search(
      d,
      s,
      r,
      { id: "s1", actorId: "livia", mode: "physical", faces: [12] },
      "player",
      () => 1,
    ),
  );
  // Livia at (250, 380): crate (obvious) and niche (DC 13) are within 4.5 m; 12 + 1 = 13.
  assert.deepEqual(record.found, ["crate", "niche"]);
  const points = D.pointsOf(h.slice(), "old-watch");
  assert.equal(D.pointEmpty(points.find((p) => p.id === "crate")), true);
  assert.equal(points.find((p) => p.id === "drag-marks").found, false, "far points stay hidden");
  assert.deepEqual(
    D.visiblePoints(h.ctx.state, h.slice(), "old-watch", "player")
      .map((p) => p.id)
      .sort(),
    ["barrel", "crate", "niche"],
  );
  h.run((d, s) =>
    D.takeFound(d, s, { sceneId: "old-watch", pointId: "niche", actorId: "livia" }, "player"),
  );
  assert.equal(D.rationCount(h.ctx.state.actors.livia), 2);
  assert.equal(D.torchCount(h.ctx.state.actors.livia), 1);
  assert.equal(
    D.pointEmpty(D.pointsOf(h.slice(), "old-watch").find((p) => p.id === "niche")),
    true,
  );
  assert.throws(
    () =>
      h.run((d, s) =>
        D.takeFound(d, s, { sceneId: "old-watch", pointId: "niche", actorId: "livia" }, "player"),
      ),
    /È vuoto/,
  );
  assert.throws(
    () =>
      h.run((d, s) =>
        D.takeFound(d, s, { sceneId: "old-watch", pointId: "barrel", actorId: "mira" }, "player"),
      ),
    /vuoto|vicino/,
  );
});

test("search points: the DM adds, edits and removes; players never see an unfound point", () => {
  const h = harness({ role: "dm" });
  h.run((d, s) =>
    D.savePoint(
      d,
      s,
      {
        sceneId: "old-watch",
        point: {
          id: "p1",
          kind: "hidden",
          name: "Pietra smossa",
          dc: 18,
          x: 240,
          y: 360,
          items: [{ srdId: "srd2024:item:torch", quantity: 2 }],
        },
      },
      "dm",
    ),
  );
  assert.ok(D.visiblePoints(h.ctx.state, h.slice(), "old-watch", "dm").some((p) => p.id === "p1"));
  assert.ok(
    !D.visiblePoints(h.ctx.state, h.slice(), "old-watch", "player").some((p) => p.id === "p1"),
  );
  assert.throws(
    () =>
      h.run((d, s) =>
        D.savePoint(
          d,
          s,
          { sceneId: "old-watch", point: { kind: "hidden", name: "x", dc: 40, x: 1, y: 1 } },
          "dm",
        ),
      ),
    /CD va da 1 a 30/,
  );
  h.run((d, s) => D.removePoint(d, s, { sceneId: "old-watch", pointId: "p1" }, "dm"));
  assert.ok(!D.pointsOf(h.slice(), "old-watch").some((p) => p.id === "p1"));
});

// ------------------------------------------------------------------ UI handlers
test("UI: the panel renders per role and language; formation, pace, travel and event handlers commit", () => {
  const h = harness({ role: "dm", dice: [2] });
  const panel = h.registry.get("table-panel", "travel", h.ctx, tableView(h));
  const render = () => h.registry.slot("table-panel", panel, h.ctx, tableView(h));
  const table = tableDouble(h);
  let ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  assert.match(plain(render()), /Ordine di marcia.*Testa.*Doran/);
  ui.click('[data-travel-fill="1"]');
  assert.equal(D.marchingOrder(h.camp().formation).length, 3);
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-place]");
  assert.equal(table.mode, "travel-place", "the panel button arms the map tool");
  // Pick Mira and drop her into the front-left cell with two clicks (keyboard/touch path).
  ui.click('[data-travel-cell="4"]');
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click('[data-travel-cell="0"]');
  assert.equal(h.camp().formation.cells[0], D.marchingOrder(h.camp().formation)[0][0]);
  ui.click('[data-travel-sub="journey"]');
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  assert.match(plain(render()), /Vecchio osservatorio → Porto Grigio/);
  ui.change('[data-travel-pace][value="slow"]', "slow");
  assert.equal(h.camp().journey.pace, "slow");
  ui.change("[data-travel-hours]", "6");
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-go]");
  assert.equal(h.camp().journey.travelledKm, 18, "6 h at 3 km/h");
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-event]");
  h.submit({ diceMode: "digital" });
  assert.equal(h.camp().events[0].status, "proposed");
  assert.equal(
    h.events.at(-1)?.roll?.source,
    "travel",
    "the draw is announced as an accepted roll",
  );
  assert.equal(h.ctx.state.log.at(-1).rolls[0].visibility, "private");
  assert.match(plain(render()), /Proposta, non applicata/);
  h.ctx.lang = "en";
  assert.match(plain(render()), /Proposal, not applied/);
  h.ctx.role = "player";
  assert.doesNotMatch(plain(render()), /Proposal/, "players do not see proposals");
  assert.doesNotMatch(render(), /data-travel-go/, "players do not move the journey");
});

test("UI: inspector light and Search with the dice dialog; sheet section and bell", () => {
  const h = harness({ role: "player", dice: [15] });
  giveTorches(h, "livia", 1);
  const inspector = h.registry.get("table-panel", "travel-inspector", h.ctx, tableView(h));
  const render = () => h.registry.slot("table-panel", inspector, h.ctx, tableView(h));
  let ui = mount(render(), (root) => inspector.bind(root, h.ctx));
  ui.click('[data-travel-light-on="livia"]');
  assert.match(plain(render()), /Torcia accesa · resta 1 h 0 min/);
  ui = mount(render(), (root) => inspector.bind(root, h.ctx));
  ui.click('[data-travel-search="livia"]');
  h.submit({ diceMode: "digital" });
  assert.match(plain(render()), /Cassa sfondata · vuoto/);
  assert.match(plain(render()), /Nicchia sotto il gradino · Razioni ×2, Torcia ×1/);
  ui = mount(render(), (root) => inspector.bind(root, h.ctx));
  ui.click('[data-travel-take="niche"]');
  assert.equal(D.rationCount(h.ctx.state.actors.livia), 2);
  const sheet = h.registry.get("sheet-section", "travel-supplies", h.ctx, h.ctx.state.actors.livia);
  assert.match(
    plain(sheet.render(h.ctx, h.ctx.state.actors.livia)),
    /Razioni: 2 \(2 giorni di cibo\)/,
  );
  // Physical dice: an invalid face keeps the dialog open.
  ui = mount(render(), (root) => inspector.bind(root, h.ctx));
  ui.click('[data-travel-search="livia"]');
  // The refusal is thrown to the app dialog, which prints it in its error line (review F1).
  assert.throws(() => h.submit({ diceMode: "physical", face0: "25" }), /faccia/);
});

test("UI: summary, cancel and a new journey (form in km or miles); weather and provisions controls", () => {
  const h = harness({ role: "dm", dice: [] });
  const panel = h.registry.get("table-panel", "travel", h.ctx, tableView(h));
  const render = () => h.registry.slot("table-panel", panel, h.ctx, tableView(h));
  const table = tableDouble(h);
  const bind = () => mount(render(), (root) => panel.bind(root, h.ctx, table));
  const submitForm = (ui, selector, entries) => {
    const form = ui.root.querySelector(selector);
    const original = globalThis.FormData;
    globalThis.FormData = class extends original {
      constructor(node) {
        super();
        if (node === form) for (const [k, v] of entries) this.append(k, v);
      }
    };
    try {
      for (const fn of form.listeners.submit) fn({ preventDefault() {} });
    } finally {
      globalThis.FormData = original;
    }
  };
  bind().click('[data-travel-sub="journey"]');
  bind().click("[data-travel-summary]");
  h.submit({ days: "3", note: "Strada tranquilla" });
  assert.equal(h.camp().journey.status, "arrived");
  assert.equal(h.ctx.state.restTime.clocks.lanterns.seconds, 3 * 86400);
  assert.match(plain(render()), /Arrivati a Porto Grigio/);
  // New journey from the form, in miles when the interface is English.
  h.ctx.lang = "en";
  submitForm(bind(), "[data-travel-new-journey]", [
    ["from", "Porto Grigio"],
    ["to", "Bruma"],
    ["distance", "10"],
    ["terrain", "coastal"],
    ["road", "on"],
  ]);
  assert.equal(h.camp().journey.km, 15, "10 mi = 15 km (1.5 km per mile, as the Italian SRD)");
  assert.match(plain(render()), /0 mi of 10 mi/);
  bind().click("[data-travel-cancel]");
  assert.throws(() => h.submit({ reason: "" }), /reason/, "a reason is required");
  h.submit({ reason: "Tempesta sul porto" });
  assert.equal(h.camp().journey.status, "cancelled");
  assert.match(plain(render()), /Journey to Bruma cancelled: Tempesta sul porto/);
  // Weather: change without a previous day needs no reason; share and map overlay.
  h.ctx.lang = "it";
  bind().click("[data-travel-weather-set]");
  h.submit({ condition: "storm" });
  let ui = bind();
  ui.change("[data-travel-weather-share]", true);
  ui = bind();
  ui.change("[data-travel-weather-map]", true);
  const day = Object.values(h.camp().weather.days)[0];
  assert.equal(day.conditionId, "storm");
  assert.ok(day.shared && day.onMap);
  ui = bind();
  ui.change("[data-travel-climate]", "cold");
  assert.equal(h.camp().weather.climate, "cold");
  // Provisions proposed with water available: no water warning.
  submitForm(bind(), "[data-travel-propose]", [["water", "on"]]);
  const record = Object.values(h.camp().provisions.days)[0];
  assert.equal(record.water, "available");
  ui = bind();
  ui.click('[data-travel-other="doran"]');
  assert.equal(
    record && h.camp().provisions.days[Object.keys(h.camp().provisions.days)[0]].rows.doran.status,
    "other",
  );
});

test("UI: the DM search-point tool opens a dialog on the map; a point can be edited and removed", () => {
  const h = harness({ role: "dm" });
  const table = tableDouble(h, "travel-point");
  const tool = h.registry.get("table-tool", "travel-point", h.ctx, table);
  tool.activate(h.ctx, table);
  tool.onClick(h.ctx, { x: 420, y: 260 }, table);
  h.submit({
    name: "Pietra smossa",
    kind: "hidden",
    dc: "18",
    "srd2024:item:rations": "1",
    note: "",
  });
  const point = D.pointsOf(h.slice(), "old-watch").at(-1);
  assert.deepEqual([point.name.it, point.dc, point.x, point.y], ["Pietra smossa", 18, 420, 260]);
  assert.equal(point.items[0].quantity, 1);
  const layer = h.registry.get("map-layer", "travel-layer", h.ctx, tableView(h));
  assert.match(layer.svg(h.ctx, tableView(h)), new RegExp(`data-travel-point="${point.id}"`));
  h.ctx.role = "player";
  assert.doesNotMatch(layer.svg(h.ctx, tableView(h)), new RegExp(point.id), "hidden from players");
});

test("weather meets light: heavy rain or strong wind warns that open flames go out (the DM decides)", () => {
  const h = harness({ role: "dm" });
  giveTorches(h, "livia", 1);
  h.run((d, s) => D.lightTorch(d, s, { id: "l1", actorId: "livia" }, "dm"));
  h.run((d, s, r) => D.generateWeather(d, s, r, { mode: "physical", faces: [20] }, "dm", () => 1));
  assert.equal(D.todayWeather(h.ctx.state, h.camp(), "dm").conditionId, "strong-wind");
  const inspector = h.registry.get("table-panel", "travel-inspector", h.ctx, tableView(h));
  const html = plain(h.registry.slot("table-panel", inspector, h.ctx, tableView(h)));
  assert.match(html, /Vento forte: all’aperto spegne le fiamme scoperte \(decide il DM\)/);
  assert.equal(D.lightStatus(h.camp().lights[0], D.clockSeconds(h.ctx.state)).state, "lit");
});
