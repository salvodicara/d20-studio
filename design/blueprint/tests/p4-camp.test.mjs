// P4 fix TV-133 — the camp's watch follows Pathfinder WotR camp roles and Fantasy Grounds'
// watch order: the rotation starts at the camp's hour (not the current time), and each
// watch runs a Perception check (passive or rolled) with an optional encounter roll on the
// camp table, all logged. Real store and registry (travel area), the handlers the camp's
// controls call. Synthetic demo data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as T from "../travel.mjs";
import * as D from "../travel-domain.mjs";
import * as K from "../camp.mjs";
import { harness, mount, plain } from "./travel-harness.mjs";

afterEach(() => T.resetTravelView());

test("TV-133: the watch plan starts at the camp's hour (20:00 by default), not at 08:00", () => {
  const h = harness({ role: "dm" });
  const clock = h.ctx.state.restTime?.clocks?.lanterns?.seconds ?? 0;
  const at = K.nextCampStart(h.ctx.state, "20:00");
  assert.equal(D.now(h.ctx.state, "lanterns", at).hour, 20);
  assert.ok(at > clock && at - clock <= 24 * 3600, "the next 20:00 on the shared clock");
  // Before the camp, the plan shows the shifts from the chosen hour.
  const html = T.campPlanHTML(h.ctx);
  assert.match(plain(html), /1 · 20:00–22:00/);
  assert.match(plain(html), /4 · 02:00–04:00/);
  assert.match(html, /name="campAt"[^>]*value="20:00"/);
  // Making camp at 20:00 advances the shared clock to 20:00 first.
  h.run((d, s) =>
    K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"], startAt: at }, "dm"),
  );
  assert.equal(h.ctx.state.restTime.clocks.lanterns.seconds, at);
  assert.equal(h.camp().camp.startedAt, at);
  // An hour already past today means tomorrow.
  const early = K.nextCampStart(h.ctx.state, "06:00");
  assert.equal(D.now(h.ctx.state, "lanterns", early).hour, 6);
  assert.ok(early > h.ctx.state.restTime.clocks.lanterns.seconds);
});

test("TV-133: each watch runs Perception and an optional encounter roll, logged", () => {
  const h = harness({ role: "dm", dice: [1, 5] });
  h.run((d, s) => K.rotateWatch(d, s, "dm"));
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  // Shift 1 (Doran on watch): the d6 says nothing happens; the watcher's passive
  // Perception is recorded all the same (WotR night watch).
  const quiet = h.run((d, s, r) =>
    K.checkWatch(
      d,
      s,
      r,
      { id: "w1", encounter: true, mode: "digital", passive: true },
      "dm",
      (sides) => h.ctx.rollDie(sides),
    ),
  );
  assert.equal(quiet.status, "closed");
  assert.equal(quiet.outcome, "calm");
  assert.equal(quiet.face, 1);
  assert.deepEqual(
    quiet.passives.map((p) => p.actorId),
    ["doran"],
  );
  assert.ok(Number.isInteger(quiet.passives[0].score));
  // Shift 2: goblin scouts (DC 13) against the watcher's passive Perception.
  h.run((d, s) => K.nextShift(d, s, { id: "s1" }, "dm"));
  const alarm = h.run((d, s, r) =>
    K.checkWatch(
      d,
      s,
      r,
      { id: "w2", encounter: true, mode: "digital", passive: true },
      "dm",
      (sides) => h.ctx.rollDie(sides),
    ),
  );
  assert.equal(alarm.status, "open", "the DM decides what follows");
  assert.equal(alarm.dc, 13);
  const notice = K.eventNotice(h.camp(), alarm);
  assert.equal(notice.pending, 0, "passive: no roll to wait for");
  assert.equal(notice.checks.length, 1);
  assert.equal(notice.checks[0].status, "passive");
  // The camp log names every watch, quiet or not, with the Perception used.
  h.run((d, s) => K.decideCampEvent(d, s, { eventId: "w2", outcome: "calm" }, "dm"));
  const log = plain(T.campPlanHTML(h.ctx));
  assert.match(log, /Turno 1[^.]*tranquillo[^.]*Percezione passiva/i);
  assert.match(log, /Turno 2/);
  // Without the encounter roll the check is the watchers' Perception alone.
  h.run((d, s) => K.nextShift(d, s, { id: "s2" }, "dm"));
  const plainWatch = h.run((d, s, r) =>
    K.checkWatch(d, s, r, { id: "w3", encounter: false, passive: true }, "dm", () => 1),
  );
  assert.equal(plainWatch.face, null);
  assert.equal(plainWatch.status, "closed");
});

test("TV-133: the camp's controls offer «Controlla la guardia» and the camp hour (IT/EN)", () => {
  const h = harness({ role: "dm", dice: [2] });
  let html = T.campPlanHTML(h.ctx);
  const m = mount(html, (root) => T.bindCampControls(root, h.ctx));
  m.change?.('[name="campAt"]', "21:30");
  html = T.campPlanHTML(h.ctx);
  assert.match(plain(html), /1 · 21:30–23:30/);
  h.run((d, s) => K.startCamp(d, s, { id: "c1", actorIds: ["livia", "doran", "mira"] }, "dm"));
  html = T.campPlanHTML(h.ctx);
  assert.match(html, /data-travel-camp-watch[^>]*>Controlla la guardia/);
  h.ctx.lang = "en";
  assert.match(T.campPlanHTML(h.ctx), />Check the watch</);
});
