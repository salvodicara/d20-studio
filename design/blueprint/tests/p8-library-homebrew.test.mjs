// P8 fixes — Library update equals the structured editor's apply (BI-16), automation of the
// revision actually in play and every sheet holding a copy (BI-28), campaign content with
// its revision number (CA-72), the one-save editor (BI-15). Real store and registry;
// synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as compendium from "../compendium.mjs";
import * as hb from "../homebrew.mjs";
import * as D from "../homebrew-editor-domain.mjs";
import * as UI from "../homebrew-editor.mjs";
import { applyLibraryDraftToCharacter } from "../homebrew-integration.mjs";

import { harness, memory } from "./p8-harness.mjs";

const refsOf = (h, contentId) =>
  hb
    .listHomebrew(h.store.state, h.ctx.role)
    .find((e) => e.id === contentId)
    .revisions.map((r) => ({ contentId, revisionId: r.id }));

// The audit's flow: a text-only DM feat (rev. 1) shared, enabled and added to Livia through
// the Library; then a structured rev. 2 (+1 Wisdom and a save activity).
function textFeat(h) {
  h.as("dm");
  const id = "draft-lynx";
  h.store.commit(
    "fixture: text feat rev. 1",
    (state) => {
      hb.createHomebrewDraft(state, { id, kind: "create", type: "feat" }, "dm");
      const data = hb.getHomebrewDraft(state, id, "dm").data;
      data.name = { it: "Occhio di lince", en: "Lynx eye" };
      data.description = { it: "Vedi lontano.", en: "You see far." };
      data.source.label = "Tavolo di Bruma";
      hb.saveHomebrewDraft(state, id, { data }, "dm");
      const preview = hb.previewHomebrewDraft(state, id, "dm");
      assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
      const result = hb.applyHomebrewDraft(state, id, { reviewKey: preview.reviewKey }, "dm");
      hb.shareHomebrewRevision(state, result.ref, { readers: ["player"], editors: [] }, "dm");
      hb.enableHomebrewRevision(state, result.ref, { enabled: true }, "dm");
    },
    "dm",
  );
  return `content-${id}`;
}
function libraryApply(h, kind, ref, extra) {
  const id = `lib-${kind}-${ref.revisionId}`;
  let preview, result;
  h.store.commit(
    `fixture: library ${kind}`,
    (state) => {
      hb.createHomebrewDraft(state, { id, kind, ref, ...extra }, h.ctx.role);
      preview = hb.previewHomebrewDraft(state, id, h.ctx.role);
      assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
      result = applyLibraryDraftToCharacter(state, id, preview.reviewKey, h.ctx.role);
    },
    h.ctx.role,
  );
  return { preview, result };
}
function structuredRevision(h, contentId) {
  h.as("dm");
  const [rev1] = refsOf(h, contentId);
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: rev1.revisionId });
  h.run("revise");
  const draftId = h.ctx.view.id;
  h.edit(draftId, "modifiers");
  h.run("add-modifier");
  UI.setField("structured.modifiers.0.target", "wis");
  UI.setField("structured.modifiers.0.value", 1);
  h.edit(draftId, "activities");
  h.run("add-activity", { type: "save" });
  const act = "structured.activities.0";
  UI.setField(`${act}.name.it`, "Sguardo intimidatorio");
  UI.setField(`${act}.name.en`, "Intimidating gaze");
  UI.setField(`${act}.effect.conditionId`, "frightened");
  UI.setField(`${act}.effect.duration`, "start-next-self");
  h.run("save-content");
  assert.deepEqual(h.errors(), []);
  const rev2 = refsOf(h, contentId).at(-1);
  h.store.commit(
    "fixture: share and enable rev. 2",
    (state) => {
      hb.shareHomebrewRevision(state, rev2, { readers: ["player"], editors: [] }, "dm");
      hb.enableHomebrewRevision(state, rev2, { enabled: true }, "dm");
    },
    "dm",
  );
  return rev2;
}

test("BI-16: Library «Rivedi aggiornamento» gives the same sheet as the editor's «Applica a una scheda»", () => {
  const h = harness();
  const contentId = textFeat(h);
  const [rev1] = refsOf(h, contentId);
  h.as("player");
  libraryApply(h, "assign", rev1, { actorId: "livia" });
  const row = () => h.store.state.actors.livia.features.find((f) => f.homebrewRef?.contentId === contentId);
  assert.equal(row().homebrewRef.revisionId, rev1.revisionId);
  const rev2 = structuredRevision(h, contentId);
  // The DM applies rev. 2 to Doran with the structured editor.
  h.as("dm");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: rev2.revisionId });
  h.run("apply-sheet");
  h.submit({ actorId: "doran" });
  const doran = h.store.state.actors.doran;
  assert.equal(doran.abilities.wis, 13, "editor apply: Wisdom 12 → 13");
  // The sheet announces the update (DDB update notice).
  h.as("player");
  const updates = D.updatesFor(h.store.state, "livia", "player");
  assert.deepEqual(
    updates.map((u) => [u.from, u.to]),
    [[1, 2]],
  );
  const sheetHtml = UI.renderSheetFeatures(h.ctx, h.store.state.actors.livia);
  assert.match(sheetHtml, /Aggiornamento disponibile/);
  assert.match(sheetHtml, /Rivedi aggiornamento/);
  // The player reviews and applies the update through the Library.
  const { preview } = libraryApply(h, "update", rev2, {
    actorId: "livia",
    instanceId: row().id,
  });
  assert.deepEqual(
    preview.diff.filter((d) => d.structured).map((d) => d.path),
    ["structured.modifiers", "structured.activities"],
    "the diff shows the real structured changes",
  );
  assert.equal(preview.automation.level, "full", "the preview reads the revision's automation");
  const livia = h.store.state.actors.livia;
  assert.equal(row().homebrewRef.revisionId, rev2.revisionId);
  assert.equal(livia.abilities.wis, 13, "Library update: Wisdom 12 → 13, as the editor");
  const activities = (id) =>
    D.actorActivities(h.store.state, h.slice, id).map((x) => x.activity.name.it);
  assert.deepEqual(activities("livia"), ["Sguardo intimidatorio"]);
  assert.deepEqual(activities("livia"), activities("doran"));
  assert.deepEqual(D.updatesFor(h.store.state, "livia", "player"), []);
  const entry = (id) =>
    D.sheetRecord(h.slice, id).entries.find((e) => e.contentId === contentId);
  assert.deepEqual(
    entry("livia").modifiers.map((m) => [m.target, m.mode, m.value]),
    entry("doran").modifiers.map((m) => [m.target, m.mode, m.value]),
  );
});

test("BI-28 and CA-72: the automation comes from the revision in play; every sheet holding a copy is listed with its revision", () => {
  const h = harness();
  const contentId = textFeat(h);
  const [rev1] = refsOf(h, contentId);
  h.as("player");
  libraryApply(h, "assign", rev1, { actorId: "livia" });
  const rev2 = structuredRevision(h, contentId);
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: rev2.revisionId });
  h.run("apply-sheet");
  h.submit({ actorId: "doran" });
  const holders = D.sheetsHolding(h.store.state, contentId);
  assert.deepEqual(holders.map((x) => x.actorId).sort(), ["doran", "livia"]);
  const content = h.store.state.library.find((c) => c.id === contentId);
  assert.equal(D.revisionAutomation("feat", content.revisions[0]).level, "text");
  assert.equal(D.revisionAutomation("feat", content.revisions[1]).level, "full");
  h.as("dm");
  const html = UI.renderCampaignSection(h.ctx);
  const rowHtml = html.slice(html.indexOf(`data-hbe-campaign-row="${contentId}"`));
  assert.match(rowHtml, /rev\. 2 · <span class="badge hbe-auto hbe-auto-full"/);
  assert.match(rowHtml, /Livia \(rev\. 1\)/, "Livia's Library copy is listed");
  assert.match(rowHtml, /Doran \(rev\. 2\)/);
  assert.match(rowHtml, /Abilitata: rev\. 1, 2/);
  assert.match(html, /Aggiungi contenuto…/);
  // CA-72: «Aggiungi contenuto» enables an exact revision (and shares it).
  h.store.commit(
    "fixture: disable rev. 2",
    (state) => hb.enableHomebrewRevision(state, rev2, { enabled: false }, "dm"),
    "dm",
  );
  h.run("add-campaign-content");
  assert.match(h.dialogs.at(-1).body, /Occhio di lince · Talento · rev\. 2/);
  h.submit({ ref: JSON.stringify(rev2), share: "on" });
  assert.ok(
    h.store.state.campaign.enabledContent.some(
      (r) => r.contentId === contentId && r.revisionId === rev2.revisionId,
    ),
  );
});

test("BI-15: one editor and one «Salva»; the missing author is named next to its field; the same save shares and enables", () => {
  const h = harness();
  h.as("dm");
  // The Library's «Crea contenuto» runs this command: one dialog, kind and template together.
  const create = h.ctx.registry.get("command", "homebrew-editor.create", h.ctx);
  assert.ok(create, "the create command is registered");
  h.ctx.registry.run(create, h.ctx, {});
  const body = h.dialogs.at(-1).body;
  assert.match(body, /Cosa vuoi creare/);
  assert.match(body, /Mostro · blocco statistiche/);
  assert.match(body, /Oggetto magico · Forgia/);
  h.submit({ kind: "feat", "template-feat": "scratch" });
  const draftId = h.ctx.view.id;
  assert.equal(h.ctx.view.page, "homebrew-editor");
  h.edit(draftId);
  UI.setField("name.it", "Occhio di lince");
  // No author: «Salva» stops, opens Identity and names the field beside the input.
  const refused = h.run("save-content");
  assert.equal(refused, null);
  assert.match(h.errors().at(-1), /autore o la fonte/);
  const html = h.edit(draftId);
  const fieldHtml = html.slice(html.indexOf('data-hbe-path="source.label"'));
  assert.match(
    fieldHtml.slice(0, 600),
    /aria-invalid="true"[\s\S]*?class="hbe-field-error"[^>]*>Indica l’autore o la fonte/,
  );
  assert.equal(h.store.state.library.length, 0, "nothing saved");
  UI.setField("source.label", "Tavolo di Bruma");
  Object.assign(UI.saveOptionsFor(draftId), { share: true, enable: true });
  h.run("save-content");
  const contentId = h.ctx.view.id;
  const [ref] = refsOf(h, contentId);
  const rev = hb.getHomebrewRevision(h.store.state, ref, "dm");
  assert.deepEqual(rev.access.readers, ["player"], "shared by the same save");
  assert.ok(
    h.store.state.campaign.enabledContent.some((r) => r.revisionId === ref.revisionId),
    "enabled by the same save",
  );
  h.as("player");
  assert.ok(hb.getHomebrewRevision(h.store.state, ref, "player"), "the player can read it");
});

test("BI-23 and BI-26: a creature opens the stat block creator; an SRD copy is structured and reverts to its source", async () => {
  const h = harness();
  h.as("dm");
  h.ctx.registry.run(h.ctx.registry.get("command", "homebrew-editor.create", h.ctx), h.ctx, {
    kind: "monster",
  });
  h.submit({ kind: "monster", "template-monster": "srd-creature:wolf" });
  assert.match(
    h.edit(h.ctx.view.id, "statblock"),
    /data-hbe-path="structured\.creature\.ac"/,
    "the monster creator, not the text editor",
  );
  // «Crea una copia modificabile» of Fire Bolt: structured activity, source remembered.
  const data = await import("../srd-compendium.mjs");
  const id = compendium.startLibraryCopy(h.ctx, data.getEntry("srd2024:spell:fire-bolt"));
  const draft = hb.getHomebrewDraft(h.store.state, id, "dm");
  assert.equal(draft.data.structured.activities[0].type, "attack");
  assert.equal(draft.data.structured.origin.kind, "srd");
  assert.deepEqual(D.modifiedFields(draft.data), [], "identical to the source at first");
  h.edit(id);
  UI.setField("name.it", "Dardo di fuoco blu");
  assert.deepEqual(D.modifiedFields(UI.editorData()), ["name"]);
  assert.match(h.edit(id), /data-hbe="revert-all"/, "«Ripristina alla fonte» in the editor");
  h.run("revert-all");
  assert.equal(UI.editorData().name.it, "Dardo di fuoco");
  assert.deepEqual(D.modifiedFields(UI.editorData()), []);
});

test("BI-24: a forged armor +1 adds its AC bonus on the sheet while worn", () => {
  const h = harness();
  h.as("dm");
  const forged = D.forgeItem("srd2024:item:chain-mail", ["armor-plus-1"]);
  const id = "draft-forged";
  let ref;
  h.store.commit(
    "fixture: forged armor",
    (state) => {
      hb.createHomebrewDraft(state, { id, kind: "create", type: forged.type }, "dm");
      hb.saveHomebrewDraft(state, id, { data: forged.data }, "dm");
      ref = D.saveContent(state, id, "dm").ref;
    },
    "dm",
  );
  assert.equal(D.automationOf("armor", hb.getHomebrewRevision(h.store.state, ref, "dm").data.structured).level, "full");
  const built = hb.materializeHomebrewCopy(h.store.state, ref, "dm", { id: "armor-row" });
  assert.deepEqual(built.row.modifiers, [{ target: "ac", value: 1 }]);
});

test("BI-01: «Disponibili» finds the SRD spell with one search, filters by origin and keeps each tab's own filter", async () => {
  const { renderLibrary, resetLibraryView } = await import("../library.mjs");
  const h = harness({ role: "player" });
  textFeat(h);
  h.as("player");
  globalThis.sessionStorage ??= memory();
  const view = (tab) => {
    resetLibraryView();
    h.ctx.view = { page: "library", tab, id: "", revision: "" };
    return renderLibrary(h.ctx);
  };
  // Set the «Disponibili» search as the search form does (per role and tab).
  sessionStorage.setItem(
    "d20-library-filters:player:available",
    JSON.stringify({ q: "Dardo", type: "", language: "", origin: "" }),
  );
  let html = view("available");
  assert.match(html, /data-library-srd="srd2024:spell:fire-bolt"/, "the SRD spell is found");
  assert.match(html, /Dardo di fuoco/);
  assert.match(html, /data-library-filter="origin"/);
  // The same words do not leak into «Campagna».
  html = view("campaign");
  assert.match(html, /data-library-query value=""/);
  assert.match(html, /Occhio di lince/, "the enabled feat is listed with its revision");
  assert.match(html, /Abilitata: rev\. 1/);
  // Origin «Mie creazioni» leaves the SRD out; «Manuale base» leaves the Library out.
  sessionStorage.setItem(
    "d20-library-filters:player:available",
    JSON.stringify({ q: "", type: "", language: "", origin: "shared" }),
  );
  html = view("available");
  assert.match(html, /Occhio di lince/);
  assert.doesNotMatch(html, /data-library-srd=/);
});
