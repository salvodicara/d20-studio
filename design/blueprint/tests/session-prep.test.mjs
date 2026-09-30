// B15 session prep sheet: Lazy DM steps, minimal mode, secrets ticked in play and carried
// forward, one-click sheet from the template, DM-only access, rendering.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { register } from "../handouts.mjs";
import * as P from "../session-prep.mjs";
import { deleteMaterial } from "../handouts-domain.mjs";
import { seedSession, startSession, endSession } from "../session-view.mjs";

function setup(role = "dm", lang = "it") {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: null });
  registry.use("handouts", register);
  const state = createInitialState();
  // Session numbers here count the evenings at the Table only: without the example's
  // «Il sigillo della torre» (sample-clock.mjs), on a Thursday of the real calendar.
  state.campaign.sessions = [];
  registry.initState(state);
  const ctx = {
    state,
    role,
    lang,
    view: { page: "preparation", id: "", tab: "handouts-session" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) => (value && typeof value === "object" ? value[ctx.lang] : String(value ?? "")),
    esc,
    icon,
    registry,
  };
  registry.attach(ctx);
  return { state, ctx, registry };
}

test("seeded sheet 3 carries the two unrevealed secrets of the closed session 2", () => {
  const { state } = setup();
  const current = P.currentSheet(state);
  assert.equal(current.id, "prep-3");
  assert.deepEqual(
    current.lists.secrets.filter((s) => s.carriedFrom === "prep-2").map((s) => s.text),
    P.closedSheets(state)[0]
      .lists.secrets.filter((s) => !s.revealed)
      .map((s) => s.text),
  );
  assert.equal(P.STEPS.length, 8);
  assert.deepEqual(
    P.STEPS.filter((s) => s.essential).map((s) => s.id),
    ["strongStart", "secrets", "locations"],
  );
});

test("secrets ticked in play; ending the session carries only the unrevealed ones", () => {
  const { state } = setup();
  P.setSecretRevealed(state, "prep-3", "secret-3-mimic", true, "dm");
  P.setSecretRevealed(state, "prep-3", "secret-3-seal", true, "dm");
  P.setSecretRevealed(state, "prep-3", "secret-3-seal", false, "dm"); // correction
  P.setSecretRevealed(state, "prep-3", "secret-3-seal", true, "dm");
  const nextId = P.closeSheet(state, "prep-3", "dm");
  const next = P.currentSheet(state);
  assert.equal(next.id, nextId);
  assert.equal(P.closedSheets(state)[0].carriedTo, nextId);
  const texts = next.lists.secrets.map((s) => s.text);
  assert.equal(texts.length, 4);
  assert.ok(!texts.some((t) => t.includes("mimic") || t.includes("Varro")));
  assert.ok(next.lists.secrets.every((s) => s.carriedFrom === "prep-3" && !s.revealed));
  // The closed sheet is read-only; a later "new sheet" does not carry the secrets twice.
  assert.throws(() => P.updateSheet(state, "prep-3", "strongStart", "x", "dm"), /sola lettura/);
  assert.deepEqual(P.pendingCarry(state), []);
  assert.throws(
    () => P.setSecretRevealed(state, "prep-3", "secret-3-key", true, "dm"),
    /sola lettura/,
  );
});

test("closing without carrying keeps that choice: the one-click sheet then starts without secrets", () => {
  const { state, ctx } = setup();
  assert.throws(() => P.createSheet(state, "dm"), /già una preparazione aperta/);
  assert.equal(P.closeSheet(state, "prep-3", "dm", { carry: false }), null);
  assert.equal(P.currentSheet(state), null);
  const closed = P.closedSheets(state)[0];
  assert.equal(closed.carryDeclined, true);
  assert.equal(closed.carriedTo, undefined);
  assert.deepEqual(P.pendingCarry(state), []);
  assert.ok(P.renderSessionPrep(ctx).includes("Nessun segreto da riportare"));
  const id = P.createSheet(state, "dm", { title: "Ritorno alla taverna" });
  const sheet = P.currentSheet(state);
  assert.equal(sheet.id, id);
  assert.equal(sheet.title, "Ritorno alla taverna");
  assert.deepEqual(sheet.lists.secrets, [], "declined secrets never come back by themselves");
  assert.ok(
    P.renderSessionPrep(ctx).includes("non riportati"),
    "history says they were not carried",
  );
});

test("a sheet closed before this rule (no carry flags) still brings its secrets back once", () => {
  const { state } = setup();
  P.closeSheet(state, "prep-3", "dm", { carry: false });
  delete P.closedSheets(state)[0].carryDeclined; // saved by an earlier version
  assert.equal(P.pendingCarry(state).length, 6);
  P.createSheet(state, "dm");
  assert.equal(P.currentSheet(state).lists.secrets.length, 6);
  assert.deepEqual(P.pendingCarry(state), [], "carried once, then marked");
});

test("the sheet takes its number from the Table session and offers closing when it ends", () => {
  const { state, ctx, registry } = setup();
  state.ext["session-view"] = seedSession();
  assert.equal(
    P.sheetHeading(ctx, P.currentSheet(state)),
    "Prossima sessione · La cripta sotto l’osservatorio",
  );
  assert.match(P.renderSessionPrep(ctx), /Al Tavolo sarà la sessione 1/);
  assert.equal(
    P.closedSheets(state)[0].sessionNumber,
    null,
    "seeded history predates the Table record",
  );
  assert.match(P.renderSessionPrep(ctx), /Scheda chiusa · Il sentiero delle lanterne/);
  // B14 starts session 1 at the Table: the open sheet belongs to it.
  const live = startSession(state, "dm", Date.now());
  assert.equal(live.number, 1);
  assert.equal(
    P.sheetHeading(ctx, P.currentSheet(state)),
    "Sessione 1 · La cripta sotto l’osservatorio",
  );
  assert.match(P.renderSessionPrep(ctx), /In corso al Tavolo/);
  assert.equal(P.sheetToClose(state), null);
  assert.deepEqual(
    registry.notifications(ctx).filter((n) => n.id.startsWith("handouts-prep")),
    [],
  );
  // It ends at the Table: banner, Table secrets tab and a notification offer to close.
  endSession(state, "dm", Date.now());
  assert.equal(P.sheetToClose(state).session.number, 1);
  assert.match(P.renderSessionPrep(ctx), /La sessione 1 è terminata al Tavolo/);
  assert.match(P.renderSecretsTab(ctx), /data-hs-prep-ended/);
  const notice = registry.notifications(ctx).find((n) => n.id.startsWith("handouts-prep-close"));
  assert.equal(notice.title.it, "Sessione 1 terminata: chiudi la scheda di preparazione");
  assert.deepEqual(notice.target, { page: "preparation", params: { tab: "handouts-session" } });
  assert.equal(registry.notifications({ ...ctx, role: "player" }).length, 0);
  // Closing records the session; the next sheet waits for session 2.
  P.closeSheet(state, "prep-3", "dm");
  const closed = P.closedSheets(state)[0];
  assert.deepEqual([closed.sessionId, closed.sessionNumber], [live.id, 1]);
  assert.match(
    P.renderSessionPrep(ctx),
    /Sessione 1 · La cripta sotto l’osservatorio · 0 segreti rivelati su 6/,
  );
  assert.equal(P.sheetHeading(ctx, P.currentSheet(state)), "Prossima sessione");
  assert.equal(P.nextSessionNumber(state), 2);
  const second = startSession(state, "dm", Date.now() + 1000);
  assert.equal(second.number, 2);
  assert.equal(P.sheetHeading(ctx, P.currentSheet(state)), "Sessione 2");
  ctx.lang = "en";
  assert.equal(
    P.sheetHeading(ctx, P.closedSheets(state)[0]),
    "Session 1 · La cripta sotto l’osservatorio",
  );
});

test("draft guard: a DM-only contribution that asks nothing when no prep field is being typed in", () => {
  const { ctx, registry } = setup();
  const guard = registry.get("draft-guard", "handouts-prep-draft", ctx);
  assert.ok(guard);
  assert.equal(registry.pendingDraft(ctx, { page: "home" }), null);
  assert.equal(
    registry.get("draft-guard", "handouts-prep-draft", { ...ctx, role: "player" }),
    null,
  );
  let proceeded = false;
  guard.confirm(ctx, () => (proceeded = true));
  assert.equal(proceeded, true);
});

test("rows: add, edit, link and remove with validation", () => {
  const { state } = setup();
  const rowId = P.addRow(
    state,
    "prep-3",
    "scenes",
    { text: "La taverna", sceneId: "old-watch" },
    "dm",
  );
  P.updateRow(
    state,
    "prep-3",
    "scenes",
    rowId,
    { text: "La taverna al tramonto", sceneId: "" },
    "dm",
  );
  const row = P.currentSheet(state).lists.scenes.find((r) => r.id === rowId);
  assert.deepEqual([row.text, row.sceneId], ["La taverna al tramonto", null]);
  assert.throws(
    () => P.addRow(state, "prep-3", "scenes", { text: "x", sceneId: "nope" }, "dm"),
    /Scena non trovata/,
  );
  assert.throws(() => P.addRow(state, "prep-3", "npcs", { text: "  " }, "dm"), /Scrivi il testo/);
  assert.throws(
    () => P.updateRow(state, "prep-3", "scenes", rowId, { text: "" }, "dm"),
    /non può essere vuoto/,
  );
  assert.throws(
    () => P.addRow(state, "prep-3", "monsters", { text: "x", actorId: "ghost" }, "dm"),
    /Creatura non trovata/,
  );
  // A link whose target disappears no longer blocks edits: it is dropped.
  const orphan = P.addRow(
    state,
    "prep-3",
    "scenes",
    { text: "Magazzino", sceneId: "old-watch" },
    "dm",
  );
  state.scenes = state.scenes.filter((scene) => scene.id !== "old-watch");
  P.updateRow(state, "prep-3", "scenes", orphan, { text: "Magazzino del porto" }, "dm");
  assert.deepEqual(
    (({ text, sceneId }) => ({ text, sceneId }))(
      P.currentSheet(state).lists.scenes.find((r) => r.id === orphan),
    ),
    { text: "Magazzino del porto", sceneId: null },
  );
  P.removeRow(state, "prep-3", "scenes", rowId, "dm");
  assert.ok(!P.currentSheet(state).lists.scenes.some((r) => r.id === rowId));
  P.updateSheet(state, "prep-3", "character:livia", "Nuovo aggancio", "dm");
  assert.equal(P.currentSheet(state).characterNotes.livia, "Nuovo aggancio");
  assert.throws(
    () => P.updateSheet(state, "prep-3", "character:goblin-1", "x", "dm"),
    /Personaggio non valido/,
  );
});

test("deleting a material clears prep links to it, so the row stays editable", () => {
  const { state } = setup();
  deleteMaterial(state, "material-crypt", "dm");
  const row = P.currentSheet(state).lists.locations.find((r) => r.id === "loc-3-crypt");
  assert.equal(row.materialId, null);
  P.updateRow(
    state,
    "prep-3",
    "locations",
    "loc-3-crypt",
    { text: "Cripta: odore di cera fredda e ferro" },
    "dm",
  );
  assert.equal(row.text, "Cripta: odore di cera fredda e ferro");
  assert.throws(
    () =>
      P.updateRow(
        state,
        "prep-3",
        "locations",
        "loc-3-crypt",
        { materialId: "material-crypt" },
        "dm",
      ),
    /Materiale non trovato/,
  );
});

test("players never read or change the prep sheet", () => {
  const { state, ctx, registry } = setup("player");
  assert.throws(
    () => P.setSecretRevealed(state, "prep-3", "secret-3-key", true, "player"),
    (e) => e.en === "Session prep is reserved for the DM.",
  );
  assert.throws(() => P.createSheet(state, "player"));
  assert.equal(registry.get("preparation-section", "handouts-session", ctx), null);
  assert.ok(!P.renderSessionPrep(ctx).includes("mimic"));
});

test("rendering: eight steps, minimal three, secrets count, Table secrets tab, English", () => {
  const { state, ctx } = setup();
  const html = P.renderSessionPrep(ctx);
  for (const step of P.STEPS) assert.ok(html.includes(step.it), step.it);
  assert.ok(html.includes("0 di 6 rivelati"));
  assert.ok(html.includes("Schede chiuse"));
  P.updateSheet(state, "prep-3", "minimal", true, "dm");
  const minimal = P.renderSessionPrep(ctx);
  assert.ok(
    minimal.includes("Inizio forte") &&
      minimal.includes("Segreti e indizi") &&
      minimal.includes("Luoghi fantastici"),
  );
  assert.ok(!minimal.includes("PNG importanti") && !minimal.includes("Rivedi i personaggi"));
  const tab = P.renderSecretsTab(ctx);
  assert.equal((tab.match(/data-hs-prep-secret=/g) ?? []).length, 6);
  assert.ok(tab.includes("Riportato"));
  ctx.lang = "en";
  assert.ok(P.renderSessionPrep(ctx).includes("Essential steps only"));
  assert.ok(P.renderSessionPrep(ctx).includes("Close the sheet…"));
  P.closeSheet(state, "prep-3", "dm", { carry: false });
  assert.ok(P.renderSessionPrep(ctx).includes("New sheet from template"));
  assert.ok(P.renderSessionPrep(ctx).includes("No secrets to carry."));
  assert.ok(P.renderSecretsTab(ctx).includes("No prep sheet open."));
});

test("normalize keeps sheets and refuses a newer version", () => {
  const seed = P.seedPrep();
  assert.equal(P.normalizePrep(structuredClone(seed), 1).sheets.length, 2);
  assert.deepEqual(P.normalizePrep({ sheets: [null, { id: "s" }] }, 1).sheets[0].lists.secrets, []);
  assert.throws(() => P.normalizePrep(seed, 2), /newer version/);
});

// Review fixes (24/09).
test("an ended Table session shows one 'Close the sheet…' button, in the banner", () => {
  const { state, ctx } = setup();
  state.ext["session-view"] = seedSession();
  const closeButtons = () => (P.renderSessionPrep(ctx).match(/data-hs-prep-close/g) ?? []).length;
  assert.equal(closeButtons(), 1, "planning: the header button");
  startSession(state, "dm", Date.now());
  assert.equal(closeButtons(), 1, "live: the header button");
  endSession(state, "dm", Date.now());
  const html = P.renderSessionPrep(ctx);
  assert.equal(closeButtons(), 1, "ended: only the banner button");
  assert.match(html, /data-hs-prep-ended[\s\S]*data-hs-prep-close/);
});

test("linked prep rows can be opened: scene preview, creature sheet, material", () => {
  const { ctx } = setup();
  const html = P.renderSessionPrep(ctx);
  const open = (list, row) =>
    new RegExp(`data-hs-prep-open="${list}" data-row="${row}"`).test(html);
  assert.ok(open("scenes", "scene-3-yard"), "scene linked to old-watch");
  assert.ok(open("monsters", "mon-3-sentry"), "creature linked to goblin-1");
  assert.ok(open("locations", "loc-3-crypt"), "location linked to the crypt");
  assert.ok(!open("scenes", "scene-3-crypt") && !open("monsters", "mon-3-mimic"), "no link");
  assert.match(html, /aria-label="Apri: Sentinella"/);
  // Each target opens through the shell: preview route, sheet, material viewer.
  const calls = [];
  const target = {
    ...ctx,
    navigate: (page, params) => calls.push(["navigate", page, params]),
    openSheet: (id) => calls.push(["sheet", id]),
  };
  P.openLinkedRow(target, "scenes", "old-watch");
  P.openLinkedRow(target, "monsters", "goblin-1");
  assert.deepEqual(calls, [
    ["navigate", "preparation", { id: "old-watch", tab: "preview" }],
    ["sheet", "goblin-1"],
  ]);
  ctx.lang = "en";
  assert.match(P.renderSessionPrep(ctx), /aria-label="Open: Sentinella"/);
});
