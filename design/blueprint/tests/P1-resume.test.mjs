// P1 IN-06: a draft resumes in the same builder and step (DDB draft resume, Roll20
// resumable Charactermancer).
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createCharacterDraft, saveCharacterDraft } from "../character-build.mjs";
import { startQuick, updateQuick, quickOf } from "../builder-plus-domain.mjs";
import { incompleteWork } from "../home-domain.mjs";

test("a quick-path draft left at step 2 resumes in the quick path, step 2, class kept", () => {
  const state = createInitialState();
  createCharacterDraft(state, { id: "q1", kind: "create" }, "player");
  startQuick(state, "q1", "player");
  updateQuick(state, "q1", "player", { classId: "fighter", step: "background" });
  const row = incompleteWork(state, "player").find((entry) => entry.id === "q1");
  assert.equal(row.builder, "quick");
  assert.equal(row.step, "background");
  assert.deepEqual(row.route, { page: "builder-plus", params: { id: "q1", tab: "quick" } });
  assert.match(row.section.it, /Percorso rapido · passo 2 di 5: Background/);
  assert.match(row.section.en, /Quick path · step 2 of 5: Background/);
  // The class chosen at step 1 is still there for the resumed page.
  assert.equal(quickOf(state, "q1", "player").classId, "fighter");
});

test("a step-by-step draft still resumes in the builder on its saved section", () => {
  const state = createInitialState();
  const d = createCharacterDraft(state, { id: "s1", kind: "create" }, "player");
  saveCharacterDraft(state, "s1", { section: "abilities", expectedRevision: d.revision }, "player");
  const row = incompleteWork(state, "player").find((entry) => entry.id === "s1");
  assert.equal(row.builder, undefined);
  assert.deepEqual(row.route, { page: "builder", params: { id: "s1", tab: "abilities" } });
});

test("a quick path moved to the step-by-step builder resumes in the builder", async () => {
  const { moveQuickToBuilder } = await import("../builder-plus-domain.mjs");
  const state = createInitialState();
  createCharacterDraft(state, { id: "q2", kind: "create" }, "player");
  startQuick(state, "q2", "player");
  updateQuick(state, "q2", "player", { classId: "wizard", step: "background" });
  moveQuickToBuilder(state, "q2", "player");
  const row = incompleteWork(state, "player").find((entry) => entry.id === "q2");
  assert.equal(row.route.page, "builder");
  assert.equal(row.route.params.tab, "origin");
});

test("PG-19: a draft shared with the DM is listed in the DM's «Da riprendere» and the bell", async () => {
  const D = await import("../builder-plus-domain.mjs");
  const { createRegistry } = await import("../registry.mjs");
  const BP = await import("../builder-plus.mjs");
  const state = createInitialState();
  const registry = createRegistry({ logger: null, document: null });
  registry.use("builder-plus", BP.register);
  registry.initState(state);
  const d = createCharacterDraft(state, { id: "k1", kind: "create" }, "player");
  d.data.identity.name = "Kael";
  D.startCobuild(state, "player", { id: "cb1", draftId: "k1" });
  const row = incompleteWork(state, "dm").find((entry) => entry.id === "cb1");
  assert.equal(row.kind, "cobuild");
  assert.equal(row.title, "Kael");
  assert.deepEqual(row.route, { page: "builder-plus", params: { tab: "cobuild", id: "cb1" } });
  assert.ok(!incompleteWork(state, "player").some((entry) => entry.id === "cb1"));
  const ctx = { role: "dm", lang: "it", state, view: { page: "home" } };
  const bell = registry.get("notifications", "builder-plus-cobuild", ctx).collect(ctx);
  assert.ok(bell.some((entry) => /Kael/.test(entry.title.it)));
  const command = registry.list("command", ctx).find((c) => c.id === "builder-plus.shared");
  assert.match(command.description.it, /costruisci con il DM/);
});
