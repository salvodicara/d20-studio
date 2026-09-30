// P8 fixes — modifiers on skills with Advantage/Disadvantage and values that scale with
// level (BI-18); timed modifiers with rounds, turn and rest anchors (BI-20). Real store and
// registry, turns advanced by the combat engine; synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { advanceTurn } from "../combat.mjs";
import * as hb from "../homebrew.mjs";
import * as D from "../homebrew-editor-domain.mjs";
import * as UI from "../homebrew-editor.mjs";
import { harness } from "./p8-harness.mjs";

function feat(h, structured) {
  const id = `draft-${Math.random().toString(36).slice(2)}`;
  let ref;
  h.store.commit(
    "fixture: feat",
    (state) => {
      hb.createHomebrewDraft(state, { id, kind: "create", type: "feat" }, "dm");
      const data = D.emptyDefinition("feat");
      data.name = { it: "Sguardo del falco", en: "Hawk gaze" };
      data.source.label = "Tavolo di Bruma";
      Object.assign(data.structured, structured);
      hb.saveHomebrewDraft(state, id, { data }, "dm");
      ref = D.saveContent(state, id, "dm").ref;
      hb.shareHomebrewRevision(state, ref, { readers: ["player"], editors: [] }, "dm");
      hb.enableHomebrewRevision(state, ref, { enabled: true }, "dm");
    },
    "dm",
  );
  return ref;
}

test("BI-18: a skill takes Advantage (applied by the roll engine, C11); a bonus scales with level", () => {
  const perception = { ...D.newModifier("skill:perception", "advantage", 1) };
  const s = { ...D.emptyStructured("feat"), modifiers: [perception] };
  assert.deepEqual(D.validateStructured("feat", s), []);
  assert.ok(
    D.MODIFIER_TARGETS.some(
      (t) => t.id === "skill:perception" && t.name.it === "Prove di Percezione",
    ),
  );
  const wrong = { ...s, modifiers: [D.newModifier("ac", "advantage", 1)] };
  assert.match(D.validateStructured("feat", wrong)[0].it, /Vantaggio e svantaggio/);
  const automation = D.automationOf("feat", s);
  // C11 (R1 BI-18): the roll engine applies it, so it is declared automated; a written
  // condition keeps it a choice made when rolling.
  assert.ok(
    automation.automated.some((m) => /Vantaggio o svantaggio applicato al tiro/.test(m.it)),
  );
  assert.ok(!automation.manual.some((m) => /Vantaggio o svantaggio/.test(m.it)));
  const conditional = {
    ...s,
    modifiers: [{ ...perception, condition: { it: "Al buio", en: "In darkness" } }],
  };
  assert.ok(D.automationOf("feat", conditional).manual.some((m) => /con condizione/.test(m.it)));
  // «+1 AC × Proficiency Bonus»: Doran (level 5 in the sample? read it) gets +PB.
  const h = harness();
  const ac = { ...D.newModifier("ac", "add", 1), scale: "proficiency" };
  const ref = feat(h, { modifiers: [ac, perception] });
  const doran = () => h.store.state.actors.doran;
  const before = doran().ac;
  const pb = D.sheetOf(doran()).proficiencyBonus;
  h.store.commit(
    "fixture: apply",
    (state) =>
      D.applyToSheet(
        state,
        state.ext["homebrew-editor"],
        { actorId: "doran", ref, rowId: "hawk" },
        "dm",
      ),
    "dm",
  );
  assert.equal(doran().ac, before + pb, "the bonus is multiplied by the Proficiency Bonus");
  const html = UI.renderSheetFeatures(h.ctx, doran());
  assert.match(html, /Prove di Percezione: Vantaggio/, "the Advantage is shown on the sheet");
  assert.match(html, /× bonus di competenza/);
});

test("BI-20: a timed modifier starts on «Attiva», ends at the start of the next turn, and a rest anchor ends with the rest", () => {
  const h = harness();
  const wis = { ...D.newModifier("wis", "add", 2), duration: { anchor: "start-next-self" } };
  const str = { ...D.newModifier("str", "add", 1), duration: { anchor: "rounds", rounds: 2 } };
  const dex = { ...D.newModifier("dex", "add", 1), duration: { anchor: "long-rest" } };
  assert.deepEqual(
    D.validateStructured("feat", { ...D.emptyStructured("feat"), modifiers: [wis, str, dex] }),
    [],
  );
  const ref = feat(h, { modifiers: [wis, str, dex] });
  assert.ok(
    D.automationOf(
      "feat",
      hb.getHomebrewRevision(h.store.state, ref, "dm").data.structured,
    ).automated.some((a) => /a tempo/.test(a.it)),
  );
  const doran = () => h.store.state.actors.doran;
  const base = { ...doran().abilities };
  h.store.commit(
    "fixture: apply",
    (state) =>
      D.applyToSheet(
        state,
        state.ext["homebrew-editor"],
        { actorId: "doran", ref, rowId: "hawk" },
        "dm",
      ),
    "dm",
  );
  assert.equal(doran().abilities.wis, base.wis, "timed modifiers wait to be activated");
  // Combat on Doran's turn (order livia, goblin-1, doran, goblin-2).
  h.store.commit(
    "fixture: combat",
    (st) => Object.assign(st.combat, { active: true, round: 1, turn: 2 }),
    "dm",
  );
  h.as("dm");
  h.run("activate-timed", { actor: "doran", row: "hawk" });
  assert.deepEqual(
    [doran().abilities.wis, doran().abilities.str, doran().abilities.dex],
    [base.wis + 2, base.str + 1, base.dex + 1],
  );
  const next = () => h.store.commit("End turn", (st) => advanceTurn(st), "dm");
  next(); // goblin-2
  next(); // round 2: livia
  next(); // goblin-1
  assert.equal(doran().abilities.wis, base.wis + 2, "still active before Doran's next turn");
  next(); // Doran's next turn starts: the Wisdom bonus ends, the 2-round Strength stays.
  assert.equal(h.store.state.combat.order[h.store.state.combat.turn], "doran");
  assert.equal(doran().abilities.wis, base.wis, "ended at the start of Doran's next turn");
  assert.equal(doran().abilities.str, base.str + 1, "round 2 of 2: still on");
  for (let i = 0; i < 4; i++) next(); // round 3 starts on Doran's turn: 2 rounds have passed
  assert.equal(doran().abilities.str, base.str, "ended after 2 rounds");
  assert.equal(doran().abilities.dex, base.dex + 1, "the rest anchor waits for the rest");
  const sl = h.slice;
  assert.equal(D.timedEndingOnRest(sl, { actorId: "doran", kind: "short" }), false);
  assert.equal(D.timedEndingOnRest(sl, { actorId: "doran", kind: "long" }), true);
  h.store.commit(
    "fixture: long rest ends",
    (st) => D.expireTimedOnRest(st, st.ext["homebrew-editor"], { actorId: "doran", kind: "long" }),
    "dm",
  );
  assert.equal(doran().abilities.dex, base.dex);
  assert.match(UI.renderSheetFeatures(h.ctx, doran()), /Attiva effetto/);
});
