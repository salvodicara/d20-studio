// B45 — camp: watch plan (FG watch order, WotR night watch), Long Rest through the rest
// engine of increment 8, a watch event with Perception checks, Initiative interrupting the
// rest, resuming with 1 more hour and finishing; the camp UI handlers. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as T from "../travel.mjs";
import * as D from "../travel-domain.mjs";
import * as K from "../camp.mjs";
import { getRest } from "../rest-time.mjs";
import { hasCondition } from "../conditions.mjs";
import { harness, mount, plain, tableView, tableDouble } from "./travel-harness.mjs";

afterEach(() => T.resetTravelView());
const rest = (h) => getRest(h.ctx.state, h.camp().camp.restId, "dm");
const part = (h, id) => rest(h).participants.find((p) => p.actorId === id);

test("watch plan: warnings for more than 2 hours and uncovered shifts; players edit only their own", () => {
  const h = harness({ role: "player" });
  const shifts = () => h.camp().watch.shifts;
  assert.deepEqual(
    K.watchWarnings(h.ctx.state, shifts()).map((w) => w.kind + ":" + (w.actorId ?? w.shift)),
    ["uncovered:3"],
    "the seed leaves the fourth shift uncovered",
  );
  h.run((d, s) => K.setWatch(d, s, { shift: 3, actorId: "livia", on: true }, "player"));
  const warnings = K.watchWarnings(h.ctx.state, shifts());
  assert.equal(warnings[0].kind, "over");
  assert.match(warnings[0].text.it, /Livia: 4 ore di guardia.*al massimo 2 ore/);
  assert.equal(warnings[0].source.en.pages[0], 185);
  assert.throws(
    () => h.run((d, s) => K.setWatch(d, s, { shift: 0, actorId: "doran", on: false }, "player")),
    /solo i tuoi personaggi/,
  );
  assert.throws(() => h.run((d, s) => K.rotateWatch(d, s, "player")), /Solo il DM/);
  h.run((d, s) => K.rotateWatch(d, s, "dm"), "dm");
  assert.deepEqual(
    shifts(),
    [["doran"], ["livia"], ["mira"], []],
    "FG order: the marching order, 2 hours each",
  );
});

test("camp: Long Rest in the rest engine; watchers awake, sleepers Unconscious; shifts advance the clock", () => {
  const h = harness({ role: "dm" });
  assert.throws(
    () => h.run((d, s) => K.startCamp(d, s, { id: "c", actorIds: ["livia"] }, "player"), "player"),
    /Solo il DM/,
  );
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  assert.equal(rest(h).kind, "long");
  assert.equal(part(h, "doran").activity, "light", "shift 1 watcher");
  assert.equal(part(h, "livia").activity, "sleep");
  assert.ok(
    hasCondition(h.ctx.state.actors.livia, "unconscious"),
    "sleep is the Unconscious condition",
  );
  h.run((d, s) => K.nextShift(d, s, { id: "s1" }, "dm"));
  assert.equal(h.ctx.state.restTime.clocks.lanterns.seconds, 7200);
  assert.equal(part(h, "doran").activity, "sleep");
  assert.equal(part(h, "mira").activity, "light", "shift 2 watcher wakes");
  assert.throws(
    () => h.run((d, s) => K.setWatch(d, s, { shift: 1, actorId: "livia", on: true }, "dm")),
    /già iniziato/,
  );
  assert.throws(
    () => h.run((d, s) => D.travel(d, s, { id: "x", hours: 1 }, "dm")),
    /sta riposando/,
    "no travel while resting",
  );
});

test("watch event: Perception for the shift's watchers; calm keeps resting, Initiative interrupts (SRD)", () => {
  const h = harness({ role: "dm", dice: [9] });
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  h.run((d, s) => K.nextShift(d, s, { id: "s1" }, "dm"));
  h.run((d, s, r) =>
    K.campEvent(d, s, r, { id: "e1", text: "Rami spezzati", dc: 12 }, "dm", () => 1),
  );
  const event = h.camp().camp.events[0];
  assert.equal(event.checkIds.length, 1);
  const check = h.camp().checks.find((c) => c.id === event.checkIds[0]);
  assert.equal(check.actorId, "mira", "only the shift's watcher checks");
  assert.equal(check.kind, "watch");
  assert.throws(() => h.run((d, s) => K.nextShift(d, s, { id: "s2" }, "dm")), /Decidi prima/);
  // Mira's player rolls a physical 9: Perception +4 (Wis 12, proficient) = 13 ≥ 12.
  h.run(
    (d, s, r) =>
      D.rollCheck(d, s, r, { checkId: check.id, mode: "physical", faces: [9] }, "player", () => 1),
    "player",
  );
  assert.deepEqual(K.eventNotice(h.camp(), h.camp().camp.events[0]).noticed, ["mira"]);
  h.run((d, s) => K.decideCampEvent(d, s, { eventId: "e1", outcome: "calm" }, "dm"));
  assert.equal(part(h, "livia").status, "resting", "a false alarm does not interrupt");
  h.run((d, s) => K.nextShift(d, s, { id: "s2" }, "dm"));
  h.run((d, s, r) =>
    K.campEvent(
      d,
      s,
      r,
      { id: "e2", draw: { mode: "physical", faces: [5] }, lang: "it" },
      "dm",
      () => 1,
    ),
  );
  const e2 = h.camp().camp.events[1];
  assert.match(e2.text, /goblin/);
  assert.equal(e2.dc, 13);
  const livia = h.camp().checks.find((c) => c.id === e2.checkIds[0]);
  h.run((d, s) => D.usePassive(d, s, { checkId: livia.id }, "dm"));
  h.run((d, s) => K.decideCampEvent(d, s, { eventId: "e2", outcome: "initiative" }, "dm"));
  assert.equal(part(h, "livia").status, "interrupted");
  assert.equal(part(h, "livia").interruptions[0].cause, "initiative");
  assert.equal(
    part(h, "doran").benefits[0].kind,
    "short",
    "4 hours rested: Short Rest benefits (SRD)",
  );
  assert.equal(h.camp().camp.status, "interrupted");
  h.run((d, s) => K.resumeCamp(d, s, "dm"));
  assert.equal(part(h, "livia").requiredSeconds, 9 * 3600, "resuming needs 1 more hour");
  assert.equal(part(h, "livia").activity, "light", "Livia keeps shift 3");
});

test("finish: after four shifts and the extra hour the Long Rest completes; Undo restores the camp", () => {
  const h = harness({ role: "dm" });
  h.run((draft) => {
    draft.actors.doran.hp = 10;
  });
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  h.run((d, s, r) => K.campEvent(d, s, r, { id: "e1", text: "Lupi", dc: 12 }, "dm", () => 1));
  h.run((d, s) => D.usePassive(d, s, { checkId: h.camp().camp.events[0].checkIds[0] }, "dm"));
  h.run((d, s) => K.decideCampEvent(d, s, { eventId: "e1", outcome: "initiative" }, "dm"));
  h.run((d, s) => K.resumeCamp(d, s, "dm"));
  for (let i = 0; i < 4; i++) h.run((d, s) => K.nextShift(d, s, { id: "n" + i }, "dm"));
  assert.equal(K.remainingSeconds(h.ctx.state, h.camp().camp), 3600);
  assert.throws(() => h.run((d, s) => K.finishCamp(d, s, { id: "f0" }, "dm")), /.+/);
  h.run((d, s) => K.extraHour(d, s, { id: "h1" }, "dm"));
  h.run((d, s) => K.finishCamp(d, s, { id: "f1" }, "dm"));
  assert.equal(h.camp().camp.status, "done");
  assert.equal(
    h.ctx.state.actors.doran.hp,
    h.ctx.state.actors.doran.maxHp,
    "Long Rest: all HP back",
  );
  assert.ok(!hasCondition(h.ctx.state.actors.livia, "unconscious"), "everyone wakes");
  h.ctx.undo();
  assert.equal(h.camp().camp.status, "active", "Undo restores the camp and the rest together");
  assert.equal(h.ctx.state.actors.doran.hp, 10);
});

test("strike camp with a reason stops the rest; a new camp keeps the old one in the history", () => {
  const h = harness({ role: "dm" });
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "mira"] }, "dm"));
  assert.throws(() => h.run((d, s) => K.breakCamp(d, s, { reason: "" }, "dm")), /motivo/);
  h.run((d, s) => K.breakCamp(d, s, { reason: "Arriva la pioggia" }, "dm"));
  assert.equal(part(h, "livia").status, "cancelled");
  h.run((d, s) => K.startCamp(d, s, { id: "c2", actorIds: ["doran"] }, "dm"));
  assert.equal(h.camp().campHistory[0].reason, "Arriva la pioggia");
});

test("UI: camp tab for DM and player; watch toggles, start, event dialog, decisions and finish", () => {
  const h = harness({ role: "dm", dice: [5] });
  const panel = h.registry.get("table-panel", "travel", h.ctx, tableView(h));
  const render = () => h.registry.slot("table-panel", panel, h.ctx, tableView(h));
  const table = tableDouble(h);
  let ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click('[data-travel-sub="camp"]');
  assert.match(plain(render()), /Turno 4 scoperto/);
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.change('[data-travel-watch="3"][data-actor="livia"]', true);
  assert.deepEqual(h.camp().watch.shifts[3], ["livia"]);
  assert.match(plain(render()), /Livia: 4 ore di guardia/);
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.change('[data-travel-watch="3"][data-actor="livia"]', false);
  assert.deepEqual(h.camp().watch.shifts[3], []);
  // Starting the camp: the form sends every checked participant.
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  const form = ui.root.querySelector("[data-travel-camp-start]");
  const data = new FormData();
  for (const id of ["livia", "doran", "mira"]) data.append("actor", id);
  const original = globalThis.FormData;
  globalThis.FormData = class extends original {
    constructor(node) {
      super();
      if (node === form) for (const [k, v] of data) this.append(k, v);
    }
  };
  try {
    for (const fn of form.listeners.submit) fn({ preventDefault() {} });
  } finally {
    globalThis.FormData = original;
  }
  assert.equal(h.camp().camp.status, "active");
  assert.match(plain(render()), /Turno 1 di 4: di guardia Doran/);
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-camp-event]");
  h.submit({ source: "table", diceMode: "digital", dc: "12" });
  const event = h.camp().camp.events[0];
  assert.match(event.text, /goblin/, "d6 = 5 on the camp table");
  // The player sees Doran's request only as the DM's; Doran is the DM's character.
  h.ctx.role = "player";
  mount(render(), (root) => panel.bind(root, h.ctx, table)).click('[data-travel-sub="camp"]');
  assert.doesNotMatch(render(), /data-travel-roll=/);
  assert.match(plain(render()), /riposo lungo in corso/);
  h.ctx.role = "dm";
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click(`[data-travel-passive="${event.checkIds[0]}"]`);
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  assert.ok(ui.has(`[data-travel-camp-fight="${event.id}"]`));
  ui.click(`[data-travel-camp-fight="${event.id}"]`);
  assert.match(plain(render()), /Riposo interrotto: Livia, Doran, Mira\./);
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-camp-resume]");
  for (let i = 0; i < 4; i++) {
    ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
    ui.click("[data-travel-camp-next]");
  }
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-camp-hour]");
  ui = mount(render(), (root) => panel.bind(root, h.ctx, table));
  ui.click("[data-travel-camp-finish]");
  assert.equal(h.camp().camp.status, "done");
  h.ctx.lang = "en";
  assert.match(plain(render()), /Long Rest finished at the camp/);
});
