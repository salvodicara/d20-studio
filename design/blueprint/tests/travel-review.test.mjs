// B45 review (reviewer-fixer): regressions for the defects found in the independent review
// of exploration, travel and camp. Each test names the finding it pins. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as T from "../travel.mjs";
import * as D from "../travel-domain.mjs";
import * as K from "../camp.mjs";
import * as FV from "../fog-vision-domain.mjs";
import { getRest, observeRestEvent } from "../rest-time.mjs";
import { startCombat } from "../state.mjs";
import { harness, mount, plain, tableView, tableDouble } from "./travel-harness.mjs";

afterEach(() => T.resetTravelView());
const panelOf = (h) => {
  const panel = h.registry.get("table-panel", "travel", h.ctx, tableView(h));
  const render = () => h.registry.slot("table-panel", panel, h.ctx, tableView(h));
  const bind = () => mount(render(), (root) => panel.bind(root, h.ctx, tableDouble(h)));
  return { render, bind, open: (sub) => bind().click(`[data-travel-sub="${sub}"]`) };
};
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
const campRest = (h) => getRest(h.ctx.state, h.camp().camp.restId, "dm");

// F1 (P2): refusals of dialog commands were toasted behind the modal backdrop.
test("F1: a refused dialog command shows its reason inside the dialog (offline, invalid face)", () => {
  const h = harness({ role: "dm" });
  const p = panelOf(h);
  p.open("journey");
  h.ctx.offline = true;
  p.bind().click("[data-travel-event]");
  assert.throws(
    () => h.submit({ diceMode: "digital" }),
    (error) => /senza rete/.test(error.it) && Boolean(error.en),
    "the app dialog prints the thrown reason in its error line",
  );
  assert.equal(h.camp().events.length, 0);
  h.ctx.offline = false;
  assert.throws(
    () => h.submit({ diceMode: "physical", face0: "9" }),
    (error) => /d8 fisico/.test(error.it) && /physical d8/.test(error.en),
  );
  assert.equal(h.toasts.length, 0, "nothing is hidden behind the dialog");
  // Outside a dialog a refusal stays a toast.
  h.ctx.offline = true;
  p.bind().click("[data-travel-go]");
  assert.match(h.toasts.at(-1).text, /senza rete/);
});

// F2 (P2): each Search created a new check id, so Undo + Search rolled again (I-229).
test("F2: undoing a Search and searching again reuses the faces already rolled", () => {
  const h = harness({ role: "player", dice: [3, 18] });
  const search = (id) =>
    h.run((d, s, r) =>
      D.search(d, s, r, { id, actorId: "livia", mode: "digital" }, "player", h.ctx.rollDie),
    );
  search("s1");
  const first = h.camp().searches.at(-1).total;
  h.ctx.undo();
  assert.equal(h.camp().searches.length, 0);
  search("s2");
  assert.equal(h.camp().searches.at(-1).total, first, "the undone faces come back");
  assert.deepEqual(h.dice, [18], "no new die was rolled");
  search("s3");
  assert.notEqual(h.camp().searches.at(-1).total, first, "a second real Search rolls anew");
  assert.deepEqual(h.dice, []);
  const ids = h.camp().checks.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, "check ids stay unique");
});

// F3 (P2): Initiative rolled from the Table (or damage) interrupts the rest engine, but the
// camp stayed "active": no resume, finish refused, shifts advanced with nobody resting.
test("F3: Initiative from the Table interrupts the camp too; resume after combat and finish", () => {
  const h = harness({ role: "dm" });
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  h.run((d) => {
    d.combat.order = ["livia", "goblin-1", "doran", "mira"];
    startCombat(d);
  });
  assert.deepEqual(
    campRest(h).participants.map((x) => x.status),
    ["interrupted", "interrupted", "interrupted"],
  );
  assert.equal(K.campStatus(h.ctx.state, h.camp().camp), "interrupted");
  const p = panelOf(h);
  p.open("camp");
  let html = p.render();
  assert.match(plain(html), /Riposo interrotto: Livia, Doran, Mira/);
  assert.match(html, /data-travel-camp-combat/, "the night waits for the encounter");
  assert.doesNotMatch(html, /data-travel-camp-(next|event|resume)/);
  assert.throws(() => h.run((d, s) => K.nextShift(d, s, { id: "n1" }, "dm")), /combattimento/);
  assert.throws(() => h.run((d, s) => K.resumeCamp(d, s, "dm")), /combattimento/);
  h.run((d) => {
    d.combat.active = false;
  });
  html = p.render();
  assert.match(html, /data-travel-camp-resume/);
  assert.doesNotMatch(html, /data-travel-camp-next/, "no shift while nobody rests");
  assert.throws(
    () => h.run((d, s) => K.nextShift(d, s, { id: "n1" }, "dm")),
    /Nessuno sta riposando/,
    "no clock advance while nobody rests",
  );
  assert.throws(() => h.run((d, s) => K.finishCamp(d, s, { id: "f1" }, "dm")), /Nessuno/);
  p.bind().click("[data-travel-camp-resume]");
  assert.deepEqual(
    campRest(h).participants.map((x) => `${x.status}:${x.requiredSeconds / 3600}`),
    ["resting:9", "resting:9", "resting:9"],
    "SRD: resuming needs 1 more hour per interruption",
  );
  assert.equal(K.campStatus(h.ctx.state, h.camp().camp), "active");
  html = p.render();
  assert.match(html, /data-travel-camp-next/);
});

test("F3: damage to one sleeper interrupts only that rest; the camp offers to resume it", () => {
  const h = harness({ role: "dm" });
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  h.run((d) => observeRestEvent(d, { eventId: "hit-1", actorIds: ["livia"], cause: "damage" }));
  assert.equal(K.campStatus(h.ctx.state, h.camp().camp), "active", "the others still rest");
  const p = panelOf(h);
  p.open("camp");
  assert.match(p.render(), /data-travel-camp-resume/);
  assert.match(plain(p.render()), /Livia · interrotto/);
  h.run((d, s) => K.resumeCamp(d, s, "dm"));
  assert.equal(campRest(h).participants.find((x) => x.actorId === "livia").status, "resting");
  assert.throws(() => h.run((d, s) => K.resumeCamp(d, s, "dm")), /non è interrotto/);
});

// F4 (P2): the camp event text ("two goblin scouts creep…") was shown to players before
// their watchers rolled Perception, and stayed in their history after a false alarm.
test("F4: a camp event's description is the DM's; players see the requested check and outcome", () => {
  const h = harness({ role: "dm", dice: [4] });
  h.run((d, s) => K.setWatch(d, s, { shift: 0, actorId: "livia", on: true }, "dm"));
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  h.run((d, s, r) =>
    K.campEvent(d, s, r, { id: "e1", text: "Due goblin esploratori", dc: 13 }, "dm", () => 1),
  );
  const p = panelOf(h);
  p.open("camp");
  assert.match(plain(p.render()), /Due goblin esploratori/, "the DM reads it");
  h.ctx.role = "player";
  p.open("camp");
  assert.doesNotMatch(plain(p.render()), /Due goblin/, "the player does not");
  assert.match(plain(p.render()), /Il DM chiede una prova di Percezione/);
  h.ctx.role = "dm";
  const checkId = h
    .camp()
    .camp.events[0].checkIds.find(
      (id) => h.camp().checks.find((x) => x.id === id).actorId === "doran",
    );
  h.run((d, s) => D.usePassive(d, s, { checkId }, "dm"));
  const livia = h.camp().camp.events[0].checkIds.find((id) => id !== checkId);
  h.run((d, s) => D.usePassive(d, s, { checkId: livia }, "dm"));
  h.run((d, s) => K.decideCampEvent(d, s, { eventId: "e1", outcome: "calm" }, "dm"));
  h.ctx.role = "player";
  const text = plain(p.render());
  // P4 TV-133: the log names the shift's hours and the Perception used.
  assert.match(text, /Turno 1 \(\d\d:\d\d–\d\d:\d\d\): .*falso allarme/);
  assert.doesNotMatch(text, /Due goblin/);
});

// F5 (P2): a bell request opened the travel tab on whatever sub-tab was last used (often
// Marcia), where the requested roll is not listed; the torch warning lives in the
// Creature tab, not in the travel tab.
test("F5: a bell request opens the sub-tab that lists it; the torch opens the Creature tab", async () => {
  const h = harness({ role: "dm" });
  h.run((d, s) => K.setWatch(d, s, { shift: 0, actorId: "livia", on: true }, "dm"));
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran"] }, "dm"));
  h.run((d, s, r) => K.campEvent(d, s, r, { id: "e1", text: "Rami", dc: 12 }, "dm", () => 1));
  h.ctx.role = "player";
  const bell = h.registry.notifications(h.ctx);
  const watch = bell.find((n) => n.id.startsWith("travel-check-"));
  assert.deepEqual(watch.target, { page: "table", params: { tab: "travel-camp", id: "livia" } });
  // The route opens the travel tab on Campo and selects the character.
  const p = panelOf(h);
  assert.match(p.render(), /data-travel-sub="march" aria-selected="true"/);
  h.ctx.view = { page: "table", id: "livia", tab: "travel-camp" };
  let opened = 0;
  const table = {
    ...tableDouble(h),
    root: {
      querySelector: (selector) =>
        selector.includes('data-table-drawer="travel"')
          ? { getAttribute: () => "false", click: () => opened++ }
          : null,
    },
  };
  const layer = h.registry.get("map-layer", "travel-layer", h.ctx, tableView(h));
  layer.bind({ querySelectorAll: () => [] }, h.ctx, table);
  await Promise.resolve();
  assert.equal(opened, 1);
  assert.match(p.render(), /data-travel-sub="camp" aria-selected="true"/);
  assert.match(p.render(), /data-travel-roll=/, "the requested roll is on screen");
  // Torch warning: the Creature tab of the torch bearer.
  h.ctx.role = "player";
  giveTorches(h, "mira", 1);
  h.run((d, s) => D.lightTorch(d, s, { id: "l1", actorId: "mira" }, "player"), "player");
  advance(h, 50 * 60);
  const torch = h.registry.notifications(h.ctx).find((n) => n.id === "travel-torch-l1");
  assert.deepEqual(torch.target, { page: "table", params: { tab: "travel-creature", id: "mira" } });
});

// F6 (P2): the B45 torch and the B35 vision were two separate torches: a torch lit here
// did not light a dark scene for the Table's vision.
test("F6: a lit torch is a light source of the Table's vision (B35) until it burns out", () => {
  const h = harness({ role: "player" });
  const scene = () => h.ctx.state.scenes.find((s) => s.id === h.ctx.state.activeSceneId);
  giveTorches(h, "livia", 1);
  h.run((d, s) => D.lightTorch(d, s, { id: "l1", actorId: "livia" }, "player"));
  let lighting = FV.buildLighting(h.ctx.state, scene());
  const torch = lighting.lights.find((l) => l.attachedTo === "livia");
  assert.ok(torch, "the torch joins the scene's lighting");
  assert.deepEqual([torch.bright, torch.dim, torch.on], [6, 6, true]);
  const token = scene().tokens.find((t) => t.actorId === "livia");
  assert.deepEqual(torch.at, { x: token.x, y: token.y }, "it follows the token");
  assert.equal(FV.sceneConfig(h.ctx.state, scene().id).lights.length, 0, "B35 data untouched");
  advance(h, 60 * 60);
  lighting = FV.buildLighting(h.ctx.state, scene());
  assert.ok(!lighting.lights.some((l) => l.attachedTo === "livia"), "burnt out: no light");
});

// F7 (P3): Italian encounter distance in feet; two identical "Autunno" season options;
// the event check preselected the first party member instead of the marching front rank.
test("F7: IT distance in metres, the calendar season labelled, the check asks the front rank", () => {
  const h = harness({ role: "dm" });
  h.run((d, s, r) =>
    D.drawEvent(d, s, r, { id: "e1", mode: "physical", faces: [7] }, "dm", () => 1),
  );
  const p = panelOf(h);
  p.open("journey");
  assert.match(plain(p.render()), /2d10 × 3 metri/);
  h.ctx.lang = "en";
  assert.match(plain(p.render()), /2d10 × 10 feet/);
  h.ctx.lang = "it";
  assert.match(p.render(), /<option value="" selected>Dal calendario \(Autunno\)<\/option>/);
  h.run((d, s) => D.decideEvent(d, s, { eventId: "e1", accept: false }, "dm"));
  h.run((d, s, r) =>
    D.drawEvent(d, s, r, { id: "e2", mode: "physical", faces: [5] }, "dm", () => 1),
  );
  const html = p.render();
  assert.match(html, /data-travel-event-actor="doran" checked/, "Doran leads the march");
  assert.doesNotMatch(html, /data-travel-event-actor="livia" checked/);
});

// F8 (P3): a pending roll listed in another sub-tab was invisible from the current one.
test("F8: sub-tabs count the rolls waiting for this viewer", () => {
  const h = harness({ role: "dm" });
  h.run((d, s) => K.setWatch(d, s, { shift: 0, actorId: "livia", on: true }, "dm"));
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran"] }, "dm"));
  h.run((d, s, r) => K.campEvent(d, s, r, { id: "e1", text: "Rami", dc: 12 }, "dm", () => 1));
  h.ctx.role = "player";
  const html = panelOf(h).render();
  assert.match(
    html,
    /data-travel-sub="camp"[^>]*>Campo[^<]*<span class="travel-sub-count"[^>]*>1<\/span>/,
  );
  assert.doesNotMatch(html, /data-travel-sub="journey"[^>]*>Viaggio<span class="travel-sub-count"/);
});
