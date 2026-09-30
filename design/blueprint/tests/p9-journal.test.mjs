// P9 — one journal engine for Journal, World, notes and the Archive (triage CA-12…CA-24,
// CA-82, SV-05): [[links]] and @ suggestions that respect permissions, secret sections
// revealed per block, backlinks and unlinked mentions, nested entries, templates, views,
// tabs over every entry, delete, and a history with diffs and a «Ripristinata da» marker.
// Real state, campaign-content domain and the Archive's seed; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { esc } from "../ui.mjs";
import * as content from "../campaign-content.mjs";
import * as jp from "../journal-plus.mjs";

function world() {
  const state = createInitialState();
  state.ext = { ...(state.ext ?? {}), quests: jp.seedQuests() };
  return state;
}
const ctxOf = (state, role = "dm", lang = "it") => ({
  state,
  role,
  lang,
  view: { page: "campaign", tab: "entry" },
  esc,
  t: (it, en) => (lang === "it" ? it : en),
  label: (v) => (typeof v === "object" && v ? v[lang] || v.it : String(v ?? "")),
  icon: () => "",
});
function entry(state, { id, kind = "world", worldType = "person", title, body = "", access = { mode: "campaign", grants: [] }, sections = [], parentId = null, who = "dm" }) {
  return content.createCampaignEntryNow(
    state,
    { id, kind, worldType, title, body, access, sections, parentId },
    who,
  ).entryId;
}

test("@ and [[ suggestions list readable titles of every kind and insert a [[link]] (CA-12)", () => {
  const state = world();
  entry(state, { id: "orvel", title: "Mastro Orvel", body: "Fabbro del porto." });
  // Typing after @ or [[ is recognised; an e-mail or @Embed is not a link.
  assert.deepEqual(jp.typedLink("Parla con @Ma", 13), { start: 10, query: "Ma", bracket: false });
  assert.deepEqual(jp.typedLink("Vedi [[Tes", 10), { start: 5, query: "Tes", bracket: true });
  assert.equal(jp.typedLink("scrivi a nome@posta", 19), null);
  assert.equal(jp.typedLink("@Embed[table:x", 14), null);
  // The DM sees an Archive page and a World entry among the suggestions.
  const dm = jp.linkSuggestions(state, "dm", "ma").map((row) => `${row.kind}:${row.title}`);
  assert.ok(dm.includes("page:Maestro Oben"), dm.join());
  assert.ok(dm.includes("entry:Mastro Orvel"), dm.join());
  // A DM-only Archive page never reaches the player (permissions, Roll20 [Name]).
  const hiddenId = jp.createPage(state, "dm", { type: "place", title: "Covo segreto", access: { mode: "none", actorIds: [] } });
  const hidden = jp.readPage(state, hiddenId, "dm");
  assert.equal(jp.readPage(state, hiddenId, "player"), null);
  const player = jp.linkSuggestions(state, "player", hidden.title.slice(0, 4)).map((row) => row.title);
  assert.ok(!player.includes(hidden.title));
  // Choosing replaces what was typed, closing brackets included.
  const typed = jp.typedLink("Vedi [[Tes]] ora", 10);
  const done = jp.completeLink("Vedi [[Tes]] ora", 10, typed, "Tessa Varro");
  assert.equal(done.value, "Vedi [[Tessa Varro]] ora");
  assert.equal(done.caret, 20);
});

test("one link syntax: [[Title]] opens pages, entries, sheets and SRD rules, never hidden ones", () => {
  const state = world();
  entry(state, { id: "orvel", title: "Mastro Orvel", access: { mode: "private", grants: [] } });
  const dm = ctxOf(state, "dm");
  assert.match(jp.linkedText(dm, "[[Maestro Oben]]"), /data-jp-open="page-oben"/);
  assert.match(jp.linkedText(dm, "[[Mastro Orvel]]"), /data-jp-route="[^"]*entry-orvel/);
  assert.match(jp.linkedText(dm, "[[Livia]]"), /characters/);
  assert.match(jp.linkedText(dm, "[[Palla di fuoco]]"), /compendium/);
  // The player cannot read the DM's private entry: plain text, no hint of a target.
  const player = ctxOf(state, "player");
  const html = jp.linkedText(player, "Chiedi a [[Mastro Orvel]].");
  assert.doesNotMatch(html, /data-jp-/);
  assert.match(html, /Chiedi a Mastro Orvel\./);
  // A roll enricher [[/…]] is left to the text embeds.
  assert.match(jp.linkedText(dm, "Tira [[/damage 2d6]]"), /\[\[\/damage 2d6\]\]/);
  // A missing title in an entry its editor may extend offers the nested entry (CA-16).
  assert.match(
    jp.linkedText(dm, "[[Cantina di Oben]]", { entryId: "e1", canCreate: true }),
    /data-jp-create-entry="Cantina di Oben"/,
  );
});

test("a secret section is revealed per block to the group; earlier text stays private (CA-13)", () => {
  const state = world();
  const id = entry(state, {
    id: "recap",
    kind: "recap",
    title: "Sessione 3",
    body: "Il gruppo arriva al faro.",
    sections: [{ title: "Segreto", body: "Tessa ha pagato il guardiano.", access: { mode: "dms", grants: [] } }],
  });
  const sectionOf = (who) => content.getCampaignEntry(state, id, who).data.sections;
  assert.equal(sectionOf("player").length, 0, "hidden from the player");
  assert.equal(sectionOf("dm").length, 1);
  const sectionId = sectionOf("dm")[0].id;
  assert.throws(
    () => content.setCampaignSectionAccess(state, id, sectionId, { mode: "campaign", grants: [] }, "player"),
    /author/,
  );
  const first = content.getCampaignEntry(state, id, "dm").currentRevisionId;
  content.setCampaignSectionAccess(state, id, sectionId, { mode: "campaign", grants: [] }, "dm");
  assert.equal(sectionOf("player")[0].body, "Tessa ha pagato il guardiano.");
  const history = content.getCampaignEntry(state, id, "dm").history;
  assert.deepEqual(history.at(-1).change, { kind: "reveal", sectionId });
  // The earlier version never shows the section to the player.
  assert.equal(
    content.getCampaignEntry(state, id, "player", { revisionId: first }).data.sections.length,
    0,
  );
  // Hidden again.
  content.setCampaignSectionAccess(state, id, sectionId, { mode: "dms", grants: [] }, "dm");
  assert.equal(sectionOf("player").length, 0);
});

test("backlinks with context and unlinked mentions work on World entries and pages (CA-14, CA-15)", () => {
  const state = world();
  const orvel = entry(state, { id: "orvel", title: "Mastro Orvel", body: "Fabbro." });
  entry(state, { id: "porto", worldType: "place", title: "Porto Grigio", body: "Qui lavora [[Mastro Orvel]], il fabbro." });
  entry(state, { id: "diario", kind: "recap", title: "Sessione 4", body: "Abbiamo incontrato Mastro Orvel al molo." });
  const links = jp.allBacklinks(state, { kind: "entry", id: orvel }, "dm");
  assert.deepEqual(links.map((row) => row.title), ["Porto Grigio"]);
  assert.match(links[0].snippets[0], /Qui lavora \[\[Mastro Orvel\]\]/);
  // An entry that links an Archive page is a backlink of that page too.
  entry(state, { id: "lettera", title: "Lettera", body: "Firmata da [[Tessa Varro]]." });
  assert.ok(
    jp.allBacklinks(state, { kind: "page", id: "page-tessa" }, "dm").some((row) => row.kind === "entry" && row.title === "Lettera"),
  );
  // The recap names Orvel without a link: a suggestion; «Collega» writes the link.
  const [mention] = jp.allUnlinkedMentions(state, { kind: "entry", id: orvel }, "dm");
  assert.equal(mention.sourceTitle, "Sessione 4");
  content.editCampaignText(
    state,
    mention.sourceId,
    { sectionId: mention.sectionId, index: mention.index, from: mention.match, to: "[[Mastro Orvel]]", change: "link" },
    "dm",
  );
  assert.equal(jp.allUnlinkedMentions(state, { kind: "entry", id: orvel }, "dm").length, 0);
  assert.equal(jp.allBacklinks(state, { kind: "entry", id: orvel }, "dm").length, 2);
  // Only who may edit the source is offered the suggestion.
  assert.deepEqual(jp.allUnlinkedMentions(state, { kind: "entry", id: orvel }, "player"), []);
});

test("nested entries, typed World entries, templates and views over every entry (CA-16, CA-17, CA-19, CA-24)", () => {
  const state = world();
  const oben = entry(state, { id: "tav", worldType: "shop", title: "Bottega di Oben", body: "Proprietario: Oben\nMerce: lanterne\n\nUna bottega." });
  const child = entry(state, { id: "cantina", worldType: "place", title: "Cantina di Oben", parentId: oben });
  assert.equal(content.getCampaignEntry(state, child, "dm").data.parentId, oben);
  assert.throws(
    () => entry(state, { id: "bad", title: "X", parentId: "missing" }),
    /contenerla|contain/,
  );
  // Every World type is accepted (Monk's typed pages).
  for (const type of content.WORLD_TYPES) entry(state, { id: "t-" + type, worldType: type, title: "Tipo " + type });
  // A template keeps the fields without their values and a DM-only section.
  const saved = content.saveEntryTemplate(
    state,
    { name: "Negozio del porto", kind: "world", worldType: "shop", fields: [{ label: "Proprietario" }, { label: "Debiti", secret: true }] },
    "dm",
  );
  assert.equal(content.listEntryTemplates(state, "dm").length, 1);
  assert.equal(content.listEntryTemplates(state, "player").length, 0, "private until shared");
  const ctx = ctxOf(state, "dm");
  const choice = jp.templateChoices(ctx, "world").find((row) => row.id === "tpl:" + saved.id);
  const fill = jp.templateForEntry(ctx, choice);
  assert.equal(fill.body, "Proprietario: ");
  assert.deepEqual(fill.sections, [{ title: "Segreti", body: "Debiti: ", secret: true }]);
  assert.ok(jp.templateChoices(ctx, "world").some((row) => row.id === "kit:tavern"), "built-in kits too");
  // A view over the World lists entries with their "Label: value" lines as properties.
  const rows = jp.runView(state, "dm", { source: "shop", columns: ["title", "prop:Merce"], sort: "title" });
  const shop = rows.find((row) => row.title === "Bottega di Oben");
  assert.ok(shop?.entry);
  assert.equal(shop.properties.find((p) => p.label === "Merce").value, "lanterne");
  const worldRows = jp.runView(state, "dm", { source: "world", sort: "title" });
  assert.ok(worldRows.some((row) => row.entry) && worldRows.some((row) => !row.entry), "pages and entries");
  jp.saveView(state, "dm", { name: "Negozi", source: "world", layout: "cards" });
});

test("tabs, back and forward cross the Archive and World entries (CA-20)", () => {
  const state = world();
  const orvel = entry(state, { id: "orvel", title: "Mastro Orvel" });
  let tabs = jp.visitPage(jp.emptyTabs(), "page-oben");
  tabs = jp.visitPage(tabs, jp.entryKey(orvel));
  assert.equal(jp.tabItemTitle(state, jp.currentPageId(tabs), "dm"), "Mastro Orvel");
  assert.deepEqual(jp.tabItemRoute(jp.currentPageId(tabs)), { page: "campaign", tab: "entry", id: orvel });
  tabs = jp.stepTab(tabs, -1);
  assert.deepEqual(jp.tabItemRoute(jp.currentPageId(tabs)), { page: "campaign", tab: "quests-archive", id: "p:page-oben" });
  tabs = jp.toggleBookmark(tabs, jp.entryKey(orvel));
  assert.deepEqual(tabs.bookmarks, ["e:" + orvel]);
  assert.equal(jp.tabItemTitle(state, "e:" + orvel, "player"), "Mastro Orvel");
});

test("delete, history diff and one-step restore with a «Ripristinata da» marker (SV-05, CA-82)", () => {
  const state = world();
  const note = content.createCampaignEntryNow(
    state,
    { id: "idea", kind: "note", title: "Idea per il prossimo PG", body: "Un bardo nano.", campaignId: null, access: { mode: "private", grants: [] } },
    "player",
  );
  assert.equal(note.local, true, "a personal note is saved on this device");
  assert.throws(() => content.deleteCampaignEntry(state, note.entryId, "dm"), /unavailable/i);
  const shared = entry(state, { id: "orvel", title: "Mastro Orvel", body: "Uno\nDue" });
  assert.throws(
    () => content.deleteCampaignEntry(state, shared, "dm", { online: false }),
    /connessione|connection/,
  );
  const first = content.getCampaignEntry(state, shared, "dm").currentRevisionId;
  content.editCampaignText(state, shared, { index: 4, from: "Due", to: "Tre" }, "dm");
  const diff = content.diffText(
    content.revisionText(state, shared, first, "dm"),
    content.revisionText(state, shared, content.getCampaignEntry(state, shared, "dm").currentRevisionId, "dm"),
  );
  assert.deepEqual(
    diff.filter((row) => row.op !== "same"),
    [
      { op: "del", text: "Due" },
      { op: "add", text: "Tre" },
    ],
  );
  content.restoreCampaignVersion(state, shared, first, "dm");
  const restored = content.getCampaignEntry(state, shared, "dm");
  assert.equal(restored.data.body, "Uno\nDue");
  assert.equal(restored.history.at(-1).restoredFrom, first);
  // The personal note is deleted by its author, offline too.
  assert.equal(content.deleteCampaignEntry(state, note.entryId, "player", { online: false }).shared, false);
  assert.throws(() => content.getCampaignEntry(state, note.entryId, "player"), /unavailable/i);
});
