// B30 — Home: domain (first steps, "Start here", sessions across campaigns, level-up
// queue, work to resume, news, reports, recents) and UI handlers (render + bind with an
// element double), on the real store and registry. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../home-domain.mjs";
import * as UI from "../home-ui.mjs";
import * as H from "../help.mjs";
import { listCampaignEntries, getCampaignEntry } from "../campaign-content.mjs";
import * as CC from "../campaign-content.mjs";
import * as HO from "../handouts-domain.mjs";
import { canViewActor } from "../character-access.mjs";
import { createCharacterDraft, saveCharacterDraft } from "../character-build.mjs";
import { resolveSessionTime } from "../campaign-sessions.mjs";
import { harness, mount, formData, slotHTML } from "./home-harness.mjs";

const PRIVATE = { local: true, visibility: "private", undoable: false };
const inDays = (days) => Date.now() + days * 864e5;
const localTime = (ms, zone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
function scheduleLanterns(h, when, zone = "Europe/Rome", title = "Sessione di prova") {
  const local = `${localTime(when, zone)}T21:00`;
  const { startsAt } = resolveSessionTime({ localTime: local, timeZone: zone });
  h.mutate((state) => {
    // Explicit fixture: one scheduled session as campaign-sessions stores it, in place of
    // the example's own «Il sigillo della torre» (sample-clock.mjs).
    state.campaign.sessions = [];
    state.campaign.sessions.push({
      id: "session-home-test",
      title,
      startsAt,
      timeZone: zone,
      localTime: local,
      status: "scheduled",
      played: false,
      revision: 1,
      organizerId: "dm",
      history: [],
    });
  });
  return startsAt;
}

test("slice v2: only the example record stays in the game state; the personal book is normalized apart", () => {
  assert.deepEqual(D.seedHome(), { identities: {} });
  const v1 = {
    identities: {
      player: {
        welcome: "hidden",
        newsRead: { "2026-09-24-home": "2026-09-24T10:00:00.000Z" },
        tips: { table: { archivedAt: "2026-09-24T10:00:00.000Z" } },
        tours: { home: { step: 2, status: "paused" } },
        starter: { createdAt: "2026-09-24T10:00:00.000Z", noteId: "n1", actorId: "a1" },
        reports: [{ id: "r1", createdAt: "2026-09-24T10:00:00.000Z", summary: "x" }],
      },
      "Not Valid!": {},
    },
  };
  const once = D.normalizeHome(v1, 1);
  assert.deepEqual(Object.keys(once.identities), ["player"]);
  assert.deepEqual(Object.keys(once.identities.player).sort(), ["removed", "starter"]);
  assert.equal(once.identities.player.starter.actorId, "a1");
  assert.equal(once.identities.player.starter.sceneId, null);
  assert.deepEqual(D.normalizeHome(once, 2), once);
  assert.throws(() => D.normalizeHome(v1, 3), /newer version/);
  const bad = D.normalizeHome({
    identities: {
      dm: { starter: { createdAt: "nope" }, removed: [{ kind: "scene", id: "s" }, { kind: "x" }] },
    },
  });
  assert.equal(bad.identities.dm.starter, null);
  assert.deepEqual(bad.identities.dm.removed, [{ kind: "scene", id: "s" }]);
  // Personal book: per identity, invalid rows dropped.
  const book = D.normalizeBook({
    identities: {
      player: {
        welcome: "hidden",
        newsRead: { "2026-09-24-home": "2026-09-24T10:00:00.000Z", "BAD KEY": "x" },
        tips: { table: { archivedAt: "2026-09-24T10:00:00.000Z" }, sheet: { archivedAt: 5 } },
        tours: { home: { step: 2, status: "paused" }, table: { step: -1, status: "paused" } },
        reports: [{ id: "r1", createdAt: "2026-09-24T10:00:00.000Z", summary: "x" }, { id: 3 }],
      },
    },
  });
  const player = D.bookOf(book, "player");
  assert.equal(player.welcome, "hidden");
  assert.deepEqual(Object.keys(player.newsRead), ["2026-09-24-home"]);
  assert.deepEqual(Object.keys(player.tips), ["table"]);
  assert.deepEqual(Object.keys(player.tours), ["home"]);
  assert.equal(player.reports.length, 1);
  assert.deepEqual(D.bookOf(book, "dm"), D.blankBook());
});

test("first steps: after the game blocks for a known identity, hidden on this device without a log entry; Undo does not touch it", async () => {
  const h = await harness();
  let html = slotHTML(h.registry, "route", "home", h.ctx);
  for (const path of ["character", "campaign", "sample"])
    assert.ok(html.includes(`data-home-path="${path}"`), path);
  assert.ok(html.includes("Da dove vuoi iniziare?"));
  // start.md: the player's game and character come first; the aids follow them.
  assert.ok(
    html.indexOf("resume-scene") < html.indexOf("data-home-start") &&
      html.indexOf("home-bottom") < html.indexOf("data-home-start"),
    "first steps after the resume and character blocks",
  );
  // Core blocks keep their markup; one "Entra al Tavolo" and one "Apri campagna" only.
  for (const cls of ["resume-scene", "home-bottom", "campaign-entry"])
    assert.ok(html.includes(`class="${cls}`), cls);
  assert.equal(html.split("Entra al Tavolo").length, 2);
  assert.equal(html.split(">Apri campagna<").length, 2);
  assert.ok(html.includes('data-open-sheet="livia"'));
  const log = h.ctx.state.log.length;
  const page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click('[data-home-start] [data-home-welcome="hide"]');
  assert.equal(h.book().identities.player.welcome, "hidden");
  assert.equal(h.book().identities.dm, undefined, "the DM's record is untouched");
  assert.equal(h.ctx.state.log.length, log, "personal bookkeeping never enters the game log");
  // A gameplay change then Undo: the personal choice is not game state.
  h.ctx.commit("Movimento di prova", (s) => {
    s.actors.livia.movement = 6;
  });
  h.ctx.undo();
  assert.equal(h.book().identities.player.welcome, "hidden");
  h.reload();
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.ok(!html.includes("data-home-start"), "hidden after reload");
  assert.ok(html.includes('data-home-welcome="show"'), "reopen control in Guides");
  h.ctx.role = "dm";
  assert.ok(
    slotHTML(h.registry, "route", "home", h.ctx).includes("data-home-start"),
    "each identity decides",
  );
});

test("new identity: nothing of its own → welcome with three paths and no close; the example is private", async () => {
  const h = await harness();
  h.mutate((state) => {
    // Explicit fixture: the player owns no sheet and is not in the campaign.
    for (const actor of Object.values(state.actors))
      if (actor.owner === "player") actor.owner = "dm";
    state.campaign.members = [{ id: "dm", name: "DM", role: "dm", canOrganize: true }];
  });
  h.reload();
  assert.equal(D.isNewIdentity(h.ctx.state, "player"), true);
  assert.equal(D.isNewIdentity(h.ctx.state, "dm"), false);
  const html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.ok(html.includes("Benvenuto in d20 Studio"));
  assert.ok(!html.includes('data-home-welcome="hide"'));
  assert.ok(
    html.indexOf("data-home-start") < html.indexOf("home-layout"),
    "a new identity starts from the three paths, at the top",
  );
  assert.ok(html.includes("Nessuna campagna accessibile"), "core empty state kept");
  const page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click('[data-home-path="sample"]');
  const starter = D.identityOf(h.ctx.state, "player").starter;
  assert.ok(starter.noteId && starter.actorId);
  assert.equal(D.isNewIdentity(h.ctx.state, "player"), false);
});

test("Start here (player): private note + private practice sheet, never shared; works offline; DM sees nothing", async () => {
  const h = await harness();
  h.ctx.offline = true;
  h.ctx.commit(
    "Esempio",
    (draft) => D.createStarter(draft, "player", { lang: "it", online: false, seed: "t1" }),
    PRIVATE,
  );
  const starter = D.identityOf(h.ctx.state, "player").starter;
  const actor = h.ctx.state.actors[starter.actorId];
  assert.equal(actor.name, "Tessa (esempio)");
  assert.equal(actor.visibility, "private");
  assert.deepEqual(actor.campaignIds, []);
  assert.equal(actor.hp, actor.maxHp);
  assert.equal(canViewActor(actor, "dm", h.ctx.state), false);
  const note = getCampaignEntry(h.ctx.state, starter.noteId, "player");
  assert.equal(note.data.title, "Inizia qui");
  assert.deepEqual(note.access, { mode: "private", grants: [] });
  assert.equal(note.campaignId, null);
  assert.deepEqual(
    note.data.sections.map((s) => s.id),
    ["quick", "template", "sample"],
  );
  assert.deepEqual(note.data.links, [{ kind: "actor", id: starter.actorId }]);
  assert.equal(
    listCampaignEntries(h.ctx.state, {}, "dm").some((e) => e.id === starter.noteId),
    false,
  );
  assert.throws(() => getCampaignEntry(h.ctx.state, starter.noteId, "dm"));
  assert.throws(
    () => h.ctx.commit("Di nuovo", (draft) => D.createStarter(draft, "player", {}), PRIVATE),
    (e) => /esiste già/.test(e.it),
  );
  // English content for an English visit.
  const en = await harness({ lang: "en" });
  en.ctx.commit(
    "Example",
    (draft) => D.createStarter(draft, "player", { lang: "en", seed: "t2" }),
    PRIVATE,
  );
  const enStarter = D.identityOf(en.ctx.state, "player").starter;
  assert.equal(getCampaignEntry(en.ctx.state, enStarter.noteId, "player").data.title, "Start here");
  assert.equal(en.ctx.state.actors[enStarter.actorId].name, "Tessa (sample)");
});

test("Start here (DM): hidden practice scene with a sample enemy on a token and a practice handout, never shown", async () => {
  const h = await harness({ role: "dm", handouts: true });
  h.ctx.offline = true;
  assert.throws(() =>
    h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "dm", { seed: "d1" }), {
      visibility: "private",
      undoable: false,
    }),
  );
  h.ctx.offline = false;
  h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "dm", { seed: "d1" }), {
    visibility: "private",
    undoable: false,
  });
  const starter = D.identityOf(h.ctx.state, "dm").starter;
  assert.equal(starter.actorId, null);
  const scene = h.ctx.state.scenes.find((row) => row.id === starter.sceneId);
  assert.equal(scene.revealed, false);
  assert.equal(scene.name, "Inizia qui · scena di prova");
  assert.equal(h.ctx.state.activeSceneId, "old-watch", "the active scene does not change");
  // Owlbear VTL-003: a sample enemy linked to a token on the practice scene.
  const npc = h.ctx.state.actors[starter.npcId];
  assert.equal(npc.kind, "npc");
  assert.equal(npc.name, "Goblin (esempio)");
  assert.equal(npc.hp, npc.maxHp);
  assert.deepEqual(
    scene.tokens.map((token) => token.actorId),
    [starter.npcId],
  );
  assert.ok(
    !h.ctx.state.scenes.some(
      (row) => row.id !== scene.id && row.tokens.some((t) => t.actorId === starter.npcId),
    ),
  );
  // ...and a sample handout, kept with the DM until shown.
  const material = h.ctx.state.ext.handouts.materials.find((m) => m.id === starter.handoutId);
  assert.equal(material.title, "Inizia qui · handout di prova");
  assert.deepEqual(material.access, { mode: "none", actorIds: [] });
  assert.deepEqual(material.shows, []);
  assert.ok(material.image?.artId, "an image to try full screen");
  assert.equal(HO.projectMaterial(h.ctx.state, material.id, "player"), null);
  const note = getCampaignEntry(h.ctx.state, starter.noteId, "dm");
  assert.deepEqual(note.data.links, [
    { kind: "scene", id: starter.sceneId },
    { kind: "actor", id: starter.npcId },
  ]);
  assert.match(note.data.sections.find((row) => row.id === "sample").body, /Goblin \(esempio\)/);
  const html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /Apri il nemico d’esempio: Goblin \(esempio\)/);
  assert.match(html, /data-home-starter="handout"/);
  const page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click('[data-home-starter="handout"]');
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "handouts", id: material.id });
  // Removed together while unchanged; the handout's pins would be unlinked.
  let result;
  h.ctx.commit("Rimuovi", (draft) => (result = D.removeStarter(draft, "dm")), {
    visibility: "private",
    undoable: false,
  });
  assert.deepEqual(result.removed.sort(), ["handout", "note", "npc", "scene"]);
  assert.equal(h.ctx.state.actors[starter.npcId], undefined);
  assert.ok(!h.ctx.state.ext.handouts.materials.some((m) => m.id === material.id));
});

test("Remove the example keeps what became the person's own: an edited note, a played sheet, an edited scene", async () => {
  const h = await harness();
  h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "player", { seed: "k1" }), PRIVATE);
  const starter = D.identityOf(h.ctx.state, "player").starter;
  let status = D.starterStatus(h.ctx.state, "player");
  assert.equal(status.note.removable, true);
  assert.equal(status.actor.removable, true);
  // A reload keeps the sheet unchanged (no false "changed").
  h.reload();
  assert.equal(D.starterStatus(h.ctx.state, "player").actor.removable, true);
  // The person writes session notes in the template: revision 2.
  h.ctx.commit(
    "Appunti",
    (s) => {
      const id = "draft-edit-k1";
      CC.createCampaignDraft(s, { id, entryId: starter.noteId }, "player");
      const draft = s.campaignContent.drafts.find((row) => row.id === id);
      const data = structuredClone(draft.data);
      data.sections.find((row) => row.id === "template").body = "Data: 24/09\nChi c’era: tutti";
      CC.saveCampaignDraft(s, id, { data, access: draft.access }, "player");
      const preview = CC.previewCampaignDraft(s, id, "player");
      CC.applyCampaignDraft(s, id, { reviewKey: preview.reviewKey }, "player", { online: true });
    },
    PRIVATE,
  );
  assert.equal(
    h.ctx.state.campaignContent.entries.find((e) => e.id === starter.noteId).revisions.length,
    2,
  );
  // The practice sheet is played: hit points change.
  h.ctx.commit("Danni", (s) => (s.actors[starter.actorId].hp -= 3), PRIVATE);
  status = D.starterStatus(h.ctx.state, "player");
  assert.deepEqual([status.note.removable, status.note.reason], [false, "changed"]);
  assert.deepEqual([status.actor.removable, status.actor.reason], [false, "changed"]);
  // The dialog says so before anything happens.
  let page = mount(
    slotHTML(h.registry, "route", "home", h.ctx),
    (root, ctx) => UI.bindHome(root, ctx),
    h.ctx,
  );
  page.click('[data-home-starter="remove"]');
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /La nota «Inizia qui» — resta: l’hai modificata tu/);
  assert.match(dialog.body, /La scheda di prova Tessa \(esempio\) — resta: l’hai modificata tu/);
  dialog.options.onSubmit(formData([]));
  assert.ok(h.ctx.state.campaignContent.entries.some((e) => e.id === starter.noteId));
  assert.ok(h.ctx.state.actors[starter.actorId], "a played sheet is never deleted");
  assert.equal(D.identityOf(h.ctx.state, "player").starter, null);
  assert.match(h.toasts.at(-1).text, /ciò che è diventato tuo resta/);
  // DM: a scene edited after creation stays, and its enemy with it.
  const dm = await harness({ role: "dm", handouts: true });
  dm.ctx.commit("Esempio", (draft) => D.createStarter(draft, "dm", { seed: "k2" }), {
    visibility: "private",
    undoable: false,
  });
  const dmStarter = D.identityOf(dm.ctx.state, "dm").starter;
  dm.ctx.commit("Muro", (s) =>
    s.scenes
      .find((row) => row.id === dmStarter.sceneId)
      .walls.push({ id: "w-k2", x1: 50, y1: 50, x2: 150, y2: 50 }),
  );
  status = D.starterStatus(dm.ctx.state, "dm");
  assert.deepEqual([status.scene.removable, status.scene.reason], [false, "changed"]);
  assert.equal(status.npc.removable, false);
  assert.equal(status.handout.removable, true);
  let result;
  dm.ctx.commit("Rimuovi", (draft) => (result = D.removeStarter(draft, "dm")), {
    visibility: "private",
    undoable: false,
  });
  assert.deepEqual(result.kept.sort(), ["npc", "scene"]);
  assert.ok(dm.ctx.state.scenes.some((row) => row.id === dmStarter.sceneId));
  assert.ok(dm.ctx.state.actors[dmStarter.npcId]);
});

test("gameplay Undo keeps the example as it is (P1): created or removed after the undone action", async () => {
  // Player: move Livia (undoable), try the example, Undo → the move is undone, Tessa stays.
  const h = await harness();
  const x = h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "livia").x;
  h.ctx.commit(
    "Muovi Livia",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "livia").x += 50),
  );
  h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "player", { seed: "u1" }), PRIVATE);
  const first = D.identityOf(h.ctx.state, "player").starter;
  h.ctx.undo();
  assert.equal(h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "livia").x, x);
  assert.ok(h.ctx.state.actors[first.actorId], "the practice sheet survives an unrelated Undo");
  assert.ok(h.ctx.state.campaignContent.entries.some((e) => e.id === first.noteId));
  assert.equal(D.identityOf(h.ctx.state, "player").starter.actorId, first.actorId);
  assert.equal(D.starterStatus(h.ctx.state, "player").actor.removable, true);
  // A change to Tessa herself is still undone normally.
  h.ctx.commit("Danni a Tessa", (s) => (s.actors[first.actorId].hp -= 4), {
    local: true,
    visibility: "private",
  });
  h.ctx.undo();
  assert.equal(h.ctx.state.actors[first.actorId].hp, h.ctx.state.actors[first.actorId].maxHp);
  // Reverse: move, remove the example, Undo → Tessa does not come back as an orphan.
  h.ctx.commit(
    "Muovi Livia",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "livia").x += 50),
  );
  h.ctx.commit("Rimuovi", (draft) => D.removeStarter(draft, "player"), PRIVATE);
  h.ctx.undo();
  assert.equal(h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "livia").x, x);
  assert.equal(h.ctx.state.actors[first.actorId], undefined, "no orphan practice sheet");
  assert.equal(D.identityOf(h.ctx.state, "player").starter, null);
  assert.deepEqual(D.identityOf(h.ctx.state, "player").removed, [
    { kind: "actor", id: first.actorId },
  ]);
  // Another example can be created, once.
  h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "player", { seed: "u2" }), PRIVATE);
  assert.equal(
    Object.values(h.ctx.state.actors).filter((a) => a.example?.kind === "home-start").length,
    1,
  );
  // DM: move a goblin, try the example (scene + enemy + handout), Undo → all stay.
  const dm = await harness({ role: "dm", handouts: true });
  dm.ctx.commit(
    "Muovi goblin",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "goblin-1").x += 50),
  );
  dm.ctx.commit("Esempio", (draft) => D.createStarter(draft, "dm", { seed: "u3" }), {
    visibility: "private",
    undoable: false,
  });
  const dmStarter = D.identityOf(dm.ctx.state, "dm").starter;
  dm.ctx.undo();
  const scene = dm.ctx.state.scenes.find((row) => row.id === dmStarter.sceneId);
  assert.ok(scene, "the practice scene survives an unrelated Undo");
  assert.deepEqual(
    scene.tokens.map((t) => t.actorId),
    [dmStarter.npcId],
  );
  assert.ok(dm.ctx.state.actors[dmStarter.npcId]);
  assert.ok(dm.ctx.state.ext.handouts.materials.some((m) => m.id === dmStarter.handoutId));
  assert.equal(D.starterStatus(dm.ctx.state, "dm").scene.removable, true);
  // DM reverse: move, remove, Undo → nothing comes back.
  dm.ctx.commit(
    "Muovi goblin",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "goblin-1").x += 50),
  );
  dm.ctx.commit("Rimuovi", (draft) => D.removeStarter(draft, "dm"), {
    visibility: "private",
    undoable: false,
  });
  dm.ctx.undo();
  assert.ok(!dm.ctx.state.scenes.some((row) => row.id === dmStarter.sceneId));
  assert.equal(dm.ctx.state.actors[dmStarter.npcId], undefined);
  assert.ok(!dm.ctx.state.ext.handouts.materials.some((m) => m.id === dmStarter.handoutId));
  assert.equal(dm.registry.warnings().length, 0);
});

test("UI: Try the example, open the note, remove with the consequences listed first", async () => {
  const h = await harness();
  let html = slotHTML(h.registry, "route", "home", h.ctx);
  mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx).click('[data-home-path="sample"]');
  assert.match(h.toasts.at(-1).text, /Appunti personali/);
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.ok(html.includes('data-home-sample="ready"'));
  const starter = D.identityOf(h.ctx.state, "player").starter;
  assert.ok(html.includes(`data-open-sheet="${starter.actorId}"`));
  let page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click('[data-home-starter="note"]');
  assert.deepEqual(h.navigations.at(-1), { page: "notes", tab: "entry", id: starter.noteId });
  h.ctx.view = { page: "home", id: "", tab: "" };
  page.click('[data-home-starter="remove"]');
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.title, /Rimuovere l’esempio/);
  assert.match(dialog.body, /verrà rimossa/);
  dialog.options.onSubmit(formData([]));
  assert.equal(D.identityOf(h.ctx.state, "player").starter, null);
  assert.ok(slotHTML(h.registry, "route", "home", h.ctx).includes('data-home-sample="new"'));
});

test("next session across two campaigns: countdown in local time and the agreed time; membership respected", async () => {
  const h = await harness({ role: "dm", campaigns: true });
  const cm = await import("../campaign-members.mjs");
  const soon = scheduleLanterns(h, inDays(2));
  const later = inDays(5);
  h.ctx.commit("Crea", (draft) =>
    cm.createCampaign(
      draft,
      {
        name: "Rovine di Vetro",
        nextLocal: `${localTime(later, "America/New_York")}T19:00`,
        timeZone: "America/New_York",
      },
      "dm",
    ),
  );
  const rows = D.upcomingSessions(h.ctx.state, "dm");
  assert.deepEqual(
    rows.map((row) => [row.campaignName, row.current]),
    [
      ["Le lanterne di Bruma", true],
      ["Rovine di Vetro", false],
    ],
  );
  assert.equal(rows[0].session.startsAt, soon);
  // The player is not a member of the new campaign: only the shared one.
  assert.deepEqual(
    D.upcomingSessions(h.ctx.state, "player").map((row) => row.campaignName),
    ["Le lanterne di Bruma"],
  );
  const times = D.sessionTimes(rows[1].session, "it", "Europe/Rome");
  assert.equal(times.agreedZone, "America/New_York");
  assert.equal(times.sameZone, false);
  assert.match(times.agreed, /19:00/);
  const html = slotHTML(h.registry, "home-widget", "appointment", h.ctx);
  assert.match(html, /Prossimo appuntamento/);
  assert.match(html, /data-home-countdown/);
  assert.match(html, /tra (1|2) giorn/);
  assert.match(html, /Rovine di Vetro/);
  assert.match(html, /America\/New_York/);
  assert.match(html, /Apri sessioni/);
  // A past or cancelled session is never "next".
  h.mutate((state) => (state.campaign.sessions[0].status = "cancelled"));
  assert.equal(D.upcomingSessions(h.ctx.state, "dm")[0].campaignName, "Rovine di Vetro");
  const parked = slotHTML(h.registry, "home-widget", "appointment", h.ctx);
  const page = mount(parked, (root, ctx) => UI.bindAppointment(root, ctx), h.ctx);
  page.click("[data-home-campaign]");
  assert.equal(h.navigations.at(-1).page, "campaigns");
});

test("countdown text: two units at most, IT and EN, never negative", () => {
  const H = 3600e3;
  assert.equal(D.countdownText(2 * 24 * H + 5 * H + 30 * 60e3, "it"), "tra 2 giorni e 5 ore");
  assert.equal(D.countdownText(24 * H, "it"), "tra 1 giorno");
  assert.equal(D.countdownText(3 * H + 20 * 60e3, "en"), "in 3 hours and 20 minutes");
  assert.equal(D.countdownText(1 * H + 60e3, "en"), "in 1 hour and 1 minute");
  assert.equal(D.countdownText(45 * 60e3, "it"), "tra 45 minuti");
  assert.equal(D.countdownText(10e3, "it"), "sta per iniziare");
  assert.equal(D.countdownText(-5e3, "en"), "starting now");
});

test("level-up queue (BG3 CRP-005): SRD thresholds, own sheets only, resume an existing draft", async () => {
  const h = await harness();
  assert.deepEqual(
    D.levelUpQueue(h.ctx.state, "player"),
    [],
    "unrecorded XP sits at the level threshold",
  );
  assert.deepEqual(D.xpStatus({ level: 3 }), {
    level: 3,
    xp: 900,
    recorded: false,
    floor: 900,
    next: 4,
    needed: 2700,
    ready: false,
  });
  assert.equal(D.xpStatus({ level: 20, xp: 999999 }).ready, false);
  h.ctx.commit("PE", (s) => {
    s.actors.mira.xp = 2700;
    s.actors.livia.xp = 2699;
    s.actors.doran.xp = 2700;
  });
  let queue = D.levelUpQueue(h.ctx.state, "player");
  assert.deepEqual(
    queue.map((row) => [row.name, row.next]),
    [["Mira", 4]],
  );
  assert.deepEqual(
    D.levelUpQueue(h.ctx.state, "dm").map((row) => row.name),
    ["Doran"],
    "the DM sees only its own sheets",
  );
  h.ctx.commit("PE", (s) => (s.actors.livia.xp = 2700));
  queue = D.levelUpQueue(h.ctx.state, "player");
  assert.deepEqual(
    queue.map((row) => row.name),
    ["Livia", "Mira"],
  );
  let html = slotHTML(h.registry, "home-widget", "home-levelup", h.ctx);
  assert.match(html, /Mira può salire al livello 4/);
  assert.match(html, /In coda: dopo Livia tocca a Mira/);
  let page = mount(html, (root, ctx) => UI.bindLevelUp(root, ctx), h.ctx);
  page.click('[data-home-advance="mira"]');
  assert.equal(h.navigations.at(-1).page, "builder");
  const draft = h.ctx.state.characterDrafts.find(
    (d) => d.actorId === "mira" && d.status === "active",
  );
  assert.equal(draft.kind, "advance");
  html = slotHTML(h.registry, "home-widget", "home-levelup", h.ctx);
  assert.match(html, /avanzamento già in bozza/);
  page = mount(html, (root, ctx) => UI.bindLevelUp(root, ctx), h.ctx);
  page.click('[data-home-advance="mira"]');
  assert.equal(
    h.navigations.at(-1).id,
    draft.id,
    "an existing advance draft is resumed, not duplicated",
  );
  assert.equal(h.ctx.state.characterDrafts.filter((d) => d.actorId === "mira").length, 1);
});

test("Level Up all (BG3 CRP-005): one entry walks the queue; after each apply the next is offered; the sheet tab persists", async () => {
  const h = await harness();
  h.ctx.commit("PE", (s) => {
    s.actors.livia.xp = 2700;
    s.actors.mira.xp = 2700;
  });
  let html = slotHTML(h.registry, "home-widget", "home-levelup", h.ctx);
  assert.match(html, /Avanza tutti \(2\)/);
  mount(html, (root, ctx) => UI.bindLevelUp(root, ctx), h.ctx).click("[data-home-advance-all]");
  assert.equal(h.navigations.at(-1).page, "builder");
  assert.equal(UI.levelWalk().current, "livia");
  // Explicit fixture for the builder's apply: Livia is now level 4 and the builder returns
  // to her sheet (character-builder.mjs navigates to characters?id=livia).
  h.ctx.commit("Avanzamento applicato", (s) => (s.actors.livia.level = 4));
  UI.walkNavigated(h.ctx, { page: "characters", id: "livia", tab: "actions" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(H.currentPop(), { kind: "levelup", id: "mira" });
  assert.equal(UI.levelWalk().current, "mira");
  // The sheet's signal is a tab while the XP is there, not an archivable tip.
  h.ctx.view = { page: "characters", id: "mira", tab: "actions" };
  assert.ok(h.registry.get("sheet-tab", "home-levelup", h.ctx, h.ctx.state.actors.mira));
  assert.equal(
    h.registry.get("sheet-tab", "home-levelup", h.ctx, h.ctx.state.actors.livia),
    null,
    "no tab once the level is applied",
  );
  assert.equal(
    h.registry.get("sheet-tab", "home-levelup", h.ctx, h.ctx.state.actors.doran),
    null,
    "not for another identity's sheet",
  );
  const tab = slotHTML(h.registry, "sheet-tab", "home-levelup", h.ctx, h.ctx.state.actors.mira);
  assert.match(tab, /Pronto per il livello 4/);
  assert.match(tab, /2700 \/ 2700 PE/);
  const sheet = mount(tab, (root, ctx) => UI.bindLevelUp(root, ctx), h.ctx);
  sheet.click('[data-home-advance="mira"]');
  assert.equal(h.navigations.at(-1).page, "builder");
  assert.equal(UI.levelWalk(), null, "a single advance ends the walk");
  // The last one: the walk ends with a message.
  UI.startLevelWalk(h.ctx);
  h.ctx.commit("Avanzamento applicato", (s) => (s.actors.mira.level = 4));
  UI.walkNavigated(h.ctx, { page: "characters", id: "mira", tab: "actions" });
  assert.match(h.toasts.at(-1).text, /Coda completata/);
  assert.equal(UI.levelWalk(), null);
  H.closePop();
});

test("work to resume: private drafts newest first, the builder section kept; never another identity's", async () => {
  const h = await harness();
  h.ctx.commit(
    "Bozza",
    (s) => {
      createCharacterDraft(s, { id: "draft-home-1", kind: "advance", actorId: "mira" }, "player");
      saveCharacterDraft(s, "draft-home-1", { section: "class", data: {} }, "player");
    },
    PRIVATE,
  );
  const rows = D.incompleteWork(h.ctx.state, "player");
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].route, {
    page: "builder",
    params: { id: "draft-home-1", tab: "class" },
  });
  assert.equal(rows[0].title, "Mira");
  assert.deepEqual(rows[0].section, { it: "Classi e punti ferita", en: "Classes and hit points" });
  assert.deepEqual(D.incompleteWork(h.ctx.state, "dm"), [], "drafts are private to their owner");
  const html = slotHTML(h.registry, "home-widget", "home-work", h.ctx);
  assert.match(html, /Avanzamento di livello · Mira/);
  assert.match(html, /Sezione: Classi e punti ferita/);
  const page = mount(html, (root, ctx) => UI.bindWork(root, ctx), h.ctx);
  page.click('[data-home-resume="character:draft-home-1"]');
  assert.deepEqual(h.navigations.at(-1), { page: "builder", id: "draft-home-1", tab: "class" });
  h.ctx.role = "dm";
  assert.equal(h.registry.get("home-widget", "home-work", h.ctx), null, "no empty box for the DM");
});

test("news: read and unread per identity, mark all, survives reload", async () => {
  const h = await harness();
  let html = slotHTML(h.registry, "route", "home", h.ctx);
  const total = Number(/data-home-unread="(\d+)"/.exec(html)[1]);
  assert.ok(total >= 5);
  let page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click('[data-home-news-read="2026-09-24-home"]');
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.equal(Number(/data-home-unread="(\d+)"/.exec(html)[1]), total - 1);
  assert.match(html, /Segna come non letta/);
  page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click('[data-home-news-read="2026-09-24-home"]');
  assert.equal(
    h.book().identities.player.newsRead["2026-09-24-home"],
    undefined,
    "correction: unread again",
  );
  const log = h.ctx.state.log.length;
  page.click("[data-home-news-all]");
  assert.equal(h.ctx.state.log.length, log, "reading is not a game event");
  h.reload();
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /Tutte lette/);
  h.ctx.role = "dm";
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.equal(
    Number(/data-home-unread="(\d+)"/.exec(html)[1]),
    total,
    "the DM's news stay unread",
  );
  // One read state with the notification centre: opening a news item from the bell
  // (target home?tab=news&id=…) reads it on Home too.
  h.registry.setSetting(h.ctx, "home-previews.news-bell", true);
  const bell = h.registry.notifications(h.ctx).find((n) => n.id === "news:2026-09-24-help");
  assert.deepEqual(bell.target, { page: "home", params: { tab: "news", id: "2026-09-24-help" } });
  h.ctx.navigate(bell.target.page, bell.target.params);
  h.registry.emit("navigate", { page: "home", tab: "news", id: "2026-09-24-help", from: "table" });
  assert.ok(h.book().identities.dm.newsRead["2026-09-24-help"]);
  assert.ok(!h.registry.notifications(h.ctx).some((n) => n.id === "news:2026-09-24-help"));
});

test("aside tabs: route tab selects the panel, arrows move between tabs", async () => {
  const h = await harness();
  h.ctx.view = { page: "home", id: "", tab: "support", returnTo: "" };
  UI.arrivedHome();
  const html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(
    html,
    /id="home-panel-support" aria-labelledby="home-tab-support" data-home-panel="support" tabindex="0">/,
  );
  assert.match(
    html,
    /id="home-panel-news" aria-labelledby="home-tab-news" data-home-panel="news" tabindex="0" hidden>/,
  );
  const page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.key('[data-home-tab="support"]', "ArrowRight");
  assert.equal(page.root.querySelector('[data-home-tab="news"]').attrs["aria-selected"], "true");
  assert.equal(page.root.querySelector('[data-home-panel="news"]').hidden, false);
  assert.equal(page.root.querySelector('[data-home-panel="support"]').hidden, true);
  UI.resetHomeView();
});

test("reports: personal data removed, diagnostics without identity, private list with delete", async () => {
  assert.equal(
    D.scrubPersonal("Scrivimi a giocatore@example.test o al +39 333 123 4567, sono Salvo", [
      "Salvo",
    ]),
    "Scrivimi a [email rimossa] o al [numero rimosso], sono [nome rimosso]",
  );
  // Dates, times and game numbers stay; placeholders follow the language.
  assert.equal(
    D.scrubPersonal(
      "Mail me at test.user@example.com or +39 333 123 4567 about 2026-09-24 session, HP 12 18 22 30",
      [],
      "en",
    ),
    "Mail me at [email removed] or [number removed] about 2026-09-24 session, HP 12 18 22 30",
  );
  assert.equal(
    D.scrubPersonal("chiamami 333 123 4567 2026-09-24 alle 21:00, tiri 3 14 15 9 26", []),
    "chiamami [numero rimosso] 2026-09-24 alle 21:00, tiri 3 14 15 9 26",
  );
  const summary = D.diagnosticsSummary({
    page: "characters",
    hasId: true,
    lang: "it",
    dataVersion: 1,
    offline: true,
    storage: "ok",
    bytes: 1200,
    built: 30,
    failed: 0,
    warnings: 1,
    warningList: ["x"],
  });
  assert.match(summary, /page: characters \(\+id\)/);
  assert.match(summary, /network \(simulated\): offline/);
  assert.doesNotMatch(summary, /livia|Livia|player|giocatore/);
  const h = await harness();
  h.mutate((s) => {
    s.ext.account = { profiles: { player: { displayName: "Salvo" } } };
  });
  h.reload();
  const support = await import("../home-support.mjs");
  h.ctx.offline = true;
  const log = h.ctx.state.log.length;
  support.openReport(h.ctx);
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /Pagina: Inizio\./, "the page by name, not its id");
  assert.throws(
    () => dialog.options.onSubmit(formData([["what", "   "]])),
    /Describe what happened/,
  );
  dialog.options.onSubmit(
    formData([
      ["what", "Sono Salvo, scrivimi a a@b.it: il tour non parte"],
      ["attach", "on"],
    ]),
  );
  const [report] = h.book().identities.player.reports;
  assert.equal(h.ctx.state.log.length, log, "a prepared report is not a game event");
  assert.match(report.summary, /\[nome rimosso\]/);
  assert.match(report.summary, /\[email rimossa\]/);
  assert.match(report.summary, /d20 Studio blueprint/);
  assert.doesNotMatch(report.summary, /Salvo|a@b\.it/);
  assert.equal(h.book().identities.dm, undefined, "reports are private");
  h.ctx.offline = false;
  const html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /Segnalazioni preparate/);
  const page = mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx);
  page.click(`[data-home-report-delete="${report.id}"]`);
  assert.deepEqual(h.book().identities.player.reports, []);
});

test("service status: sync, storage and areas, with the simulated offline mode", async () => {
  const h = await harness();
  const support = await import("../home-support.mjs");
  let status = support.serviceStatus(h.ctx);
  assert.equal(status.allOk, true);
  h.ctx.offline = true;
  status = support.serviceStatus(h.ctx);
  assert.equal(status.rows.find((row) => row.id === "sync").ok, false);
  support.openDiagnostics(h.ctx);
  const body = h.dialogs.at(-1).body;
  assert.match(body, /Archiviazione/);
  assert.match(body, /Senza rete/);
  assert.match(body, /Versione dei dati/);
});

test("recent characters (DDB widget): device list per identity, only sheets still visible", async () => {
  let list = [];
  for (const id of ["livia", "mira", "livia", "doran"])
    list = D.rememberRecent(list, id, Date.parse("2026-09-24T10:00:00Z"));
  assert.deepEqual(
    list.map((row) => row.id),
    ["doran", "livia", "mira"],
  );
  const h = await harness();
  h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "player", { seed: "rc" }), PRIVATE);
  const privateId = D.identityOf(h.ctx.state, "player").starter.actorId;
  const recents = [{ id: privateId }, { id: "mira" }, { id: "missing" }];
  assert.deepEqual(
    D.recentCharacters(h.ctx.state, "player", recents).map((row) => row.id),
    [privateId, "mira"],
  );
  assert.deepEqual(
    D.recentCharacters(h.ctx.state, "dm", recents).map((row) => row.id),
    ["mira"],
  );
  UI.clearRecents();
  UI.noteRecent("player", "mira");
  assert.deepEqual(
    UI.readRecents("player").map((row) => row.id),
    ["mira"],
  );
  assert.deepEqual(UI.readRecents("dm"), []);
  assert.match(slotHTML(h.registry, "home-widget", "home-recent", h.ctx), /Apri la scheda di Mira/);
  UI.clearRecents();
});

test("install steps say what the installable app does (IN-11: manifest and install prompt)", async () => {
  const h = await harness();
  const support = await import("../home-support.mjs");
  const html = support.renderSupport(h.ctx);
  assert.match(html, /data-home-install-note/);
  assert.match(html, /si installa come un’app/);
  assert.doesNotMatch(html, /non ha il manifest/);
});

test("install platform and browser family never expose the full user agent", () => {
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  assert.equal(D.installPlatform(iphone), "ios");
  assert.equal(D.installPlatform("Mozilla/5.0 (Linux; Android 14) Chrome/128.0 Mobile"), "android");
  assert.equal(D.installPlatform("Mozilla/5.0 (Macintosh) Chrome/128.0"), "desktop");
  assert.equal(D.browserFamily(iphone), "Safari 18 · iOS");
  assert.equal(
    D.browserFamily("Mozilla/5.0 (Windows NT 10.0) Chrome/128.0.1 Edg/128.0.2"),
    "Edge 128 · Windows",
  );
});

// ---------------------------------------------------------------- review fixes (round 2)

test("practice sheet is an authored premade (review P1): never a copy of another identity's sheet", async () => {
  const h = await harness({ library: true });
  // The DM makes Doran private and writes a secret on it (fixture for the DM's own edits).
  h.mutate((s) => {
    s.actors.doran.visibility = "private";
    s.actors.doran.campaignIds = [];
    s.actors.doran.className = { it: "Spia del Culto (segreto del DM)", en: "Cult spy (DM)" };
    s.actors.doran.notes = "Segreto del DM";
  });
  assert.equal(canViewActor(h.ctx.state.actors.doran, "player", h.ctx.state), false);
  const x = h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "livia").x;
  h.ctx.commit(
    "Muovi Livia",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "livia").x += 50),
  );
  h.ctx.commit("Esempio", (draft) => D.createStarter(draft, "player", { seed: "p1" }), PRIVATE);
  const id = D.identityOf(h.ctx.state, "player").starter.actorId;
  const tessa = h.ctx.state.actors[id];
  assert.doesNotMatch(JSON.stringify(tessa), /Spia|Cult spy|Segreto|doran|Doran/i);
  assert.equal(tessa.source.kind, "authored-demo");
  assert.equal(tessa.owner, "player");
  assert.deepEqual(tessa.className, { it: "Guerriera", en: "Fighter" });
  assert.equal(tessa.level, 1);
  assert.deepEqual(tessa.abilities, { str: 17, dex: 13, con: 15, int: 8, wis: 12, cha: 10 });
  // SRD 5.2.1: 10 + CON modifier at level 1; Chain Mail AC 16.
  assert.equal(tessa.maxHp, 12);
  assert.equal(tessa.ac, 16);
  assert.deepEqual(tessa.hitDice, { d10: { max: 1, used: 0 } });
  const sw = tessa.features.find((f) => f.definitionId === "fighter:second-wind");
  assert.deepEqual([sw.max, sw.used, sw.source.revision], [2, 0, "5.2.1"]);
  assert.ok(
    tessa.restProfile.recoveries.some((r) => r.target.id === sw.id && r.trigger === "short"),
  );
  assert.deepEqual(
    tessa.inventory.map((item) => [item.srdId, item.quantity, item.equipped]),
    [
      ["srd2024:item:chain-mail", 1, true],
      ["srd2024:item:greatsword", 1, true],
      ["srd2024:item:javelin", 8, false],
    ],
  );
  // B21 library privacy: Private, never the "Campaign only" default.
  const lib = await import("../character-library.mjs");
  assert.equal(lib.privacyOf(h.ctx.state, id), "private");
  // An unrelated gameplay Undo keeps the sheet and its privacy.
  h.ctx.undo();
  assert.equal(h.ctx.state.scenes[0].tokens.find((t) => t.actorId === "livia").x, x);
  assert.ok(h.ctx.state.actors[id]);
  assert.equal(lib.privacyOf(h.ctx.state, id), "private");
  // The same premade when the sample sheet no longer exists at all.
  const gone = await harness();
  gone.mutate((s) => delete s.actors.doran);
  gone.ctx.commit("Esempio", (draft) => D.createStarter(draft, "player", { seed: "p2" }), PRIVATE);
  const other = gone.ctx.state.actors[D.identityOf(gone.ctx.state, "player").starter.actorId];
  assert.deepEqual(other.abilities, tessa.abilities);
  assert.deepEqual(
    other.features.map((f) => f.definitionId),
    tessa.features.map((f) => f.definitionId),
  );
  // Removing the example leaves no library row behind.
  h.ctx.commit("Rimuovi", (draft) => D.removeStarter(draft, "player"), PRIVATE);
  assert.equal(h.ctx.state.actors[id], undefined);
  assert.equal(h.ctx.state.ext["character-library"].entries[id], undefined);
});

test("Home → Home with a different tab (review P2): the route's tab wins over a clicked tab; an older news item opens", async () => {
  const h = await harness();
  const render = () => {
    const html = slotHTML(h.registry, "route", "home", h.ctx);
    return { html, page: mount(html, (root, ctx) => UI.bindHome(root, ctx), h.ctx) };
  };
  const shown = (page) =>
    page.root.querySelectorAll("[data-home-panel]").find((panel) => !panel.hidden).dataset
      .homePanel;
  h.ctx.view = { page: "home", id: "", tab: "", returnTo: "" };
  h.registry.emit("navigate", { page: "home", id: "", tab: "", from: "characters" });
  let { page } = render();
  page.click('[data-home-tab="support"]');
  assert.equal(shown(render().page), "support", "a click inside Home is kept on redraw");
  // Help › "Tour e suggerimenti" (or the palette) while already on Home.
  h.ctx.view = { page: "home", id: "", tab: "guides", returnTo: "" };
  h.registry.emit("navigate", { page: "home", id: "", tab: "guides", from: "home" });
  assert.equal(shown(render().page), "guides");
  // A bell row for an older item: the news tab, the collapsed section open, the item focused.
  page = render().page;
  page.click('[data-home-tab="support"]');
  const older = H.newsFor(h.ctx).at(-1);
  h.ctx.view = { page: "home", id: older.id, tab: "news", returnTo: "" };
  h.registry.emit("navigate", { page: "home", id: older.id, tab: "news", from: "home" });
  const again = render();
  assert.equal(shown(again.page), "news");
  assert.match(again.html, /<details class="home-details home-news-older" open>/);
  const item = again.page.root.querySelector(`[data-home-news="${older.id}"]`);
  assert.equal(item.attrs.tabindex, "-1");
  assert.equal(H.newsFor(h.ctx).at(-1).read, true, "opened from the bell = read");
  UI.resetHomeView();
});

test("Home small fixes (review P3): chip level once, the DM's own character, invite path, search wording", async () => {
  const h = await harness();
  // "Mago 4" already names the level: the chip does not add "Livello 4".
  h.mutate((s) => {
    s.actors.livia.className = "Mago 4";
    s.actors.livia.level = 4;
  });
  h.reload();
  UI.clearRecents();
  UI.noteRecent("player", "livia");
  const chip = slotHTML(h.registry, "home-widget", "home-recent", h.ctx);
  assert.match(chip, /Mago 4/);
  assert.doesNotMatch(chip, /Livello 4/);
  UI.clearRecents();
  // The DM's "Your character" is one of the DM's own sheets, never the player's Livia.
  h.ctx.role = "dm";
  let html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /data-open-sheet="doran"/);
  assert.doesNotMatch(html, /data-open-sheet="livia"/);
  h.ctx.role = "player";
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /class="character-resume" data-open-sheet="livia"/);
  // Without the campaigns area the campaign path has its own two buttons.
  assert.match(html, /data-home-campaign-path="here"/);
  assert.match(html, /data-home-path="campaign"/);
  assert.match(html, /data-home-path="join"/);
  // With B13's "Your campaigns" showing "Create campaign" on the same Home, the first steps
  // do not repeat it; IN-07: the path still ends in «Unisciti con un invito».
  const withCampaigns = await harness({ campaigns: true });
  const both = slotHTML(withCampaigns.registry, "route", "home", withCampaigns.ctx);
  assert.match(both, /data-cm="paste-link"/);
  assert.match(both, /data-home-campaign-path="above"/);
  assert.doesNotMatch(both, /data-home-path="campaign"/);
  assert.match(both, /data-home-path="join"[^>]*>Unisciti con un invito/);
  assert.equal((both.match(/>Crea (una )?campagna</g) ?? []).length, 1, "one create button");
  // Search: "aiuto" never offers a result whose words promise this page's help.
  const results = h.registry.search(h.ctx, "aiuto");
  assert.ok(results.length > 0);
  assert.ok(results.every((row) => !/questa pagina|this page/i.test(JSON.stringify(row.title))));
});

test("reports remove members' names and linked handles; offline periods enter the incident history", async () => {
  const h = await harness();
  h.mutate((s) => {
    s.ext.account = {
      profiles: {
        dm: {
          displayName: null,
          linked: [{ id: "discord", service: "discord", handle: "custode_bruma" }],
          signIn: [{ id: "email", provider: "email", label: "dm@example.test" }],
          nameHistory: [{ id: "n1", displayName: "Salvatore Di Cara", memberName: null }],
        },
      },
    };
  });
  h.reload();
  const support = await import("../home-support.mjs");
  const input = support.reportPreview(h.ctx, {
    what: "il mio discord è custode_bruma, prima mi chiamavo Salvatore Di Cara",
  });
  const row = D.addReport({ identities: {} }, "player", input);
  assert.doesNotMatch(row.summary, /custode_bruma|Salvatore Di Cara/);
  assert.match(row.summary, /\[nome rimosso\]/);
  // Role labels are not personal names: "DM" stays readable.
  assert.equal(
    D.scrubPersonal("il DM ha chiesto un tiro", support.reportPreview(h.ctx).names),
    "il DM ha chiesto un tiro",
  );
  // Going offline and back is recorded as an incident of this visit.
  support.clearIncidents();
  h.ctx.offline = true;
  support.noteConnectivity(h.ctx);
  h.ctx.offline = false;
  support.noteConnectivity(h.ctx);
  const status = support.serviceStatus(h.ctx);
  assert.equal(status.incidents.length, 1);
  assert.match(JSON.stringify(status.incidents[0]), /offline|rete/i);
  assert.ok(status.incidents[0].end, "the period is closed when the connection returns");
  // The shell's offline switch reaches the history through the "offline-changed" event.
  h.ctx.offline = true;
  h.registry.emit("offline-changed", { offline: true });
  assert.match(
    slotHTML(h.registry, "route", "home", h.ctx),
    /data-home-incident="offline"[^>]*><small>[^<]*in corso/,
  );
  support.clearIncidents();
});
