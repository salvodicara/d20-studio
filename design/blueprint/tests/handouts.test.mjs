// B15: materials, handouts, pins, map-less scenes, token reveals and vignettes. Domain rules
// plus the area's contributions rendered through the real registry and the real store.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { activateScene } from "../preparation.mjs";
import * as D from "../handouts-domain.mjs";
import { register, openViewer, openPinEditor } from "../handouts.mjs";
import {
  createCampaignDraft,
  saveCampaignDraft,
  previewCampaignDraft,
  applyCampaignDraft,
} from "../campaign-content.mjs";
import { seedMedia, MEDIA_ID } from "../media-domain.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function makeRegistry() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("handouts", register);
  return registry;
}
/** A ctx backed by the real store: commits, private/local options, snapshot Undo. */
function harness({ role = "dm", lang = "it" } = {}) {
  const registry = makeRegistry();
  const storage = memory();
  const store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: (page, params) => (ctx.view = { page, id: params?.id ?? "", tab: params?.tab ?? "" }),
    dialog: () => {},
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, store, registry, storage };
}
const letterInput = {
  kind: "handout",
  title: "Lettera sigillata",
  image: { artId: "art-letter" },
  playerText: "«Chi riaccende la lanterna risponde ai Varro.»",
  dmNote: "SEGRETO-DM: la scrittura è di Tessa Varro.",
  sections: [],
};

test("seeded slices: materials, a DM-only pin, a seen notice and no pending pop-up", () => {
  const { ctx } = harness();
  const slice = ctx.state.ext.handouts;
  assert.deepEqual(
    slice.materials.map((m) => m.id),
    ["material-crypt", "material-notice", "material-wagon"],
  );
  assert.equal(slice.pins[0].visible, false);
  assert.deepEqual(ctx.state.ext["handouts-seen"].player, ["show-seed-notice"]);
  assert.deepEqual(D.unseenShows(ctx.state, "player"), []);
  // The player reads the notice shown last session, not the DM-only entries.
  assert.deepEqual(
    D.listMaterials(ctx.state, "player").map((m) => m.title),
    ["Avviso della gilda delle lanterne"],
  );
  assert.equal(ctx.state.ext["handouts-prep"].sheets.length, 2);
});

test("a handout shown only to Livia reaches her player without the DM note, then survives reload", () => {
  const { ctx, storage } = harness();
  ctx.commit("create", (d) => D.saveMaterial(d, letterInput, "dm"));
  const id = ctx.state.ext.handouts.materials.at(-1).id;
  assert.equal(
    D.canReadMaterial(ctx.state, ctx.state.ext.handouts.materials.at(-1), "player"),
    false,
  );
  ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "some", actorIds: ["livia"] }, "dm"), {
    visibility: "private",
  });
  const projection = D.projectMaterial(ctx.state, id, "player");
  assert.equal(projection.title, "Lettera sigillata");
  assert.match(projection.image.src, /^data:image\/svg\+xml/);
  assert.equal(projection.image.id, undefined, "players never receive art ids");
  assert.equal(D.projectMaterial(ctx.state, id, "dm").image.id, "art-letter");
  assert.equal(projection.dmNote, undefined);
  assert.ok(!JSON.stringify(projection).includes("SEGRETO-DM"));
  assert.deepEqual(projection.myActors, ["livia"]);
  assert.equal(D.unseenShows(ctx.state, "player").length, 1);
  // The DM log entry is private: the title never reaches the shared log label for players.
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  // Reload: a new store from the same storage keeps access; the player reopens it.
  const store2 = createStore({ storage });
  const registry2 = makeRegistry();
  registry2.initState(store2.state);
  assert.equal(D.projectMaterial(store2.state, id, "player").playerText, letterInput.playerText);
});

test("recipients are respected: a handout for Doran (played by the DM) never reaches the player", () => {
  const { ctx } = harness();
  let id;
  ctx.commit(
    "create",
    (d) => (id = D.saveMaterial(d, { ...letterInput, title: "Ordini di Doran" }, "dm")),
  );
  ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "some", actorIds: ["doran"] }, "dm"));
  assert.equal(D.projectMaterial(ctx.state, id, "player"), null);
  assert.deepEqual(D.unseenShows(ctx.state, "player"), []);
  assert.equal(D.previewForActor(ctx.state, id, "livia"), null);
  assert.equal(D.previewForActor(ctx.state, id, "doran").title, "Ordini di Doran");
  assert.throws(
    () => D.showMaterial(structuredClone(ctx.state), id, { mode: "some", actorIds: [] }, "dm"),
    /almeno un personaggio/,
  );
  assert.throws(
    () =>
      D.showMaterial(
        structuredClone(ctx.state),
        id,
        { mode: "some", actorIds: ["goblin-1"] },
        "dm",
      ),
    /non fa parte del gruppo/,
  );
});

test("players cannot author, show, pin or reveal; refusals carry Italian and English text", () => {
  const { ctx } = harness({ role: "player" });
  for (const attempt of [
    (d) => D.saveMaterial(d, letterInput, "player"),
    (d) => D.showMaterial(d, "material-crypt", { mode: "all" }, "player"),
    (d) => D.savePin(d, { sceneId: "old-watch", x: 10, y: 10, label: "x" }, "player"),
    (d) =>
      D.revealArt(d, { artId: "art-mimic", caption: "x", recipients: { mode: "all" } }, "player"),
    (d) => D.createMaplessScene(d, { name: "x", participantIds: ["livia"] }, "player"),
  ]) {
    assert.throws(
      () => ctx.commit("attempt", attempt),
      (error) => error.it === "Solo il DM può gestire materiali e spilli." && Boolean(error.en),
    );
  }
});

test("seen marks are private, local and survive gameplay Undo; Undo withdraws the show", () => {
  const { ctx } = harness();
  let id;
  ctx.commit("create", (d) => (id = D.saveMaterial(d, letterInput, "dm")));
  ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "all" }, "dm"));
  const showId = ctx.state.ext.handouts.materials.find((m) => m.id === id).shows[0].id;
  // The player's pop-up marks it as seen: a local private commit, allowed offline.
  ctx.role = "player";
  ctx.offline = true;
  ctx.commit("seen", (d) => D.markSeen(d, [showId], "player"), {
    local: true,
    visibility: "private",
    undoable: false,
  });
  assert.deepEqual(D.unseenShows(ctx.state, "player"), []);
  ctx.offline = false;
  // The DM undoes the show: access is withdrawn, the read mark is preserved (undo: preserve).
  ctx.role = "dm";
  ctx.undo();
  assert.equal(D.projectMaterial(ctx.state, id, "player"), null);
  assert.ok(ctx.state.ext["handouts-seen"].player.includes(showId));
  assert.equal(ctx.state.log.at(-1).kind, "correction");
});

test("withdrawing access is a recorded correction with its reason", () => {
  const { ctx } = harness();
  assert.throws(
    () => ctx.commit("withdraw", (d) => D.withdrawMaterial(d, "material-notice", {}, "dm")),
    (error) => error.it === "Motivo: campo obbligatorio." && error.en === "Reason: required field.",
  );
  assert.throws(
    () =>
      ctx.commit("withdraw", (d) =>
        D.withdrawMaterial(d, "material-notice", { actorIds: [], reason: "x" }, "dm"),
      ),
    /Scegli da quali personaggi/,
  );
  ctx.commit("withdraw", (d) =>
    D.withdrawMaterial(d, "material-notice", { reason: "Avviso sbagliato" }, "dm"),
  );
  const notice = ctx.state.ext.handouts.materials.find((m) => m.id === "material-notice");
  assert.equal(notice.access.mode, "none");
  assert.equal(notice.corrections[0].reason, "Avviso sbagliato");
  assert.equal(notice.corrections[0].from.mode, "all");
  assert.equal(D.projectMaterial(ctx.state, "material-notice", "player"), null);
  // Partial withdrawal from "all" keeps the other characters.
  ctx.commit("show", (d) => D.showMaterial(d, "material-notice", { mode: "all" }, "dm"));
  ctx.commit("withdraw-livia", (d) =>
    D.withdrawMaterial(
      d,
      "material-notice",
      { actorIds: ["livia", "mira"], reason: "Solo Doran l’ha letto" },
      "dm",
    ),
  );
  assert.deepEqual(notice && ctx.state.ext.handouts.materials[1].access, {
    mode: "some",
    actorIds: ["doran"],
  });
});

test("pins: linked to an entry heading, hidden by default, excerpt only once revealed", () => {
  const { ctx } = harness();
  const link = { materialId: "material-crypt", sectionId: "crypt-entrance" };
  const excerpt = D.linkExcerpt(ctx.state, link);
  assert.match(excerpt, /scala di pietra/);
  let id;
  ctx.commit(
    "pin",
    (d) =>
      (id = D.savePin(
        d,
        {
          sceneId: "old-watch",
          x: 180,
          y: 140,
          label: "Cripta",
          kind: "location",
          link,
          excerpt,
          dmNote: "Lastra DM",
        },
        "dm",
      )),
  );
  const pin = ctx.state.ext.handouts.pins.find((p) => p.id === id);
  assert.equal(pin.visible, false);
  assert.equal(D.linkLabel(ctx.state, pin.link), "Cripta sotto l’osservatorio › Ingresso");
  assert.ok(!D.projectPins(ctx.state, "old-watch", "player").some((p) => p.id === id));
  ctx.commit("reveal", (d) => D.setPinVisible(d, id, true, "dm"));
  const seen = D.projectPins(ctx.state, "old-watch", "player").find((p) => p.id === id);
  assert.deepEqual(Object.keys(seen).sort(), [
    "entryId",
    "excerpt",
    "id",
    "kind",
    "label",
    "materialId",
    "sceneId",
    "visible",
    "x",
    "y",
  ]);
  assert.equal(seen.materialId, null, "the crypt entry is not shared: the pin never opens it");
  assert.ok(!JSON.stringify(seen).includes("Lastra"));
  // Out-of-map positions and unknown headings are refused.
  assert.throws(
    () =>
      D.savePin(
        structuredClone(ctx.state),
        { sceneId: "old-watch", x: 5000, y: 1, label: "x" },
        "dm",
      ),
    /dentro la mappa/,
  );
  assert.throws(
    () =>
      D.savePin(
        structuredClone(ctx.state),
        {
          sceneId: "old-watch",
          x: 1,
          y: 1,
          label: "x",
          link: { materialId: "material-crypt", sectionId: "nope" },
        },
        "dm",
      ),
    /Intestazione non trovata/,
  );
  // Moving keeps it inside the map; deleting a heading unlinks the anchor.
  ctx.commit("move", (d) => D.movePin(d, id, 222, 333, "dm"));
  assert.deepEqual(
    [
      ctx.state.ext.handouts.pins.find((p) => p.id === id).x,
      ctx.state.ext.handouts.pins.find((p) => p.id === id).y,
    ],
    [222, 333],
  );
  const crypt = ctx.state.ext.handouts.materials[0];
  ctx.commit("edit", (d) =>
    D.saveMaterial(
      d,
      {
        id: crypt.id,
        title: crypt.title,
        image: crypt.image,
        sections: crypt.sections.slice(1),
        sceneIds: crypt.sceneIds,
      },
      "dm",
    ),
  );
  assert.deepEqual(ctx.state.ext.handouts.pins.find((p) => p.id === id).link, {
    materialId: "material-crypt",
    sectionId: null,
  });
});

test("map-less Taverna: no grid, participants on stage, stage layer at the Table", () => {
  const { ctx } = harness();
  let sceneId;
  ctx.commit(
    "stage",
    (d) =>
      (sceneId = D.createMaplessScene(
        d,
        {
          name: "Taverna",
          publicDescription: "Il fuoco scoppietta; un bardo accorda il liuto.",
          artId: "art-tavern",
          participantIds: ["livia", "doran", "mira"],
          materialIds: ["material-notice"],
        },
        "dm",
      )),
  );
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  assert.equal(scene.gridVisible, false);
  assert.equal(scene.template, "blank");
  assert.equal(scene.background, null);
  assert.deepEqual(
    scene.tokens.map((t) => t.actorId),
    ["livia", "doran", "mira"],
  );
  assert.ok(D.stageFor(ctx.state, sceneId));
  assert.deepEqual(
    D.sceneMaterials(ctx.state, sceneId, "player").map((m) => m.id),
    ["material-notice"],
  );
  assert.throws(
    () =>
      D.createMaplessScene(structuredClone(ctx.state), { name: "Vuota", participantIds: [] }, "dm"),
    /almeno un partecipante/,
  );
  ctx.commit("activate", (d) => activateScene(d, sceneId, "dm"));
  resetTableView();
  ctx.role = "player";
  const html = renderTable(ctx);
  assert.ok(html.includes('data-ext-slot="map-layer:handouts-stage-art"'));
  assert.ok(html.includes("Teatro della mente · nessuna griglia"));
  assert.ok(!html.includes('fill="url(#map-grid)"'), "no grid on a map-less scene");
  // The copy states what the Table really does: no grid; ruler and movement keep the scale.
  assert.ok(html.includes("Scena senza mappa: nessuna griglia."));
  assert.ok(html.includes("contano comunque 1,5 m per casella"));
  assert.ok(!html.includes("né misura") && !html.includes("In scena"));
  resetTableView();
});

test("reveal from a token: the mimic's art is suggested first and only the image reaches players", () => {
  const { ctx } = harness();
  ctx.commit("npc", (d) => {
    d.actors.mimic = { ...structuredClone(d.actors["goblin-1"]), id: "mimic", name: "Mimic" };
    d.scenes[0].tokens.push({ id: "token-mimic", actorId: "mimic", x: 700, y: 480 });
  });
  assert.equal(D.suggestArt(ctx.state, "mimic")[0].id, "art-mimic");
  assert.equal(D.suggestArt(ctx.state, "goblin-2")[0].id, "art-goblin");
  let id;
  ctx.commit(
    "reveal",
    (d) =>
      (id = D.revealArt(
        d,
        {
          actorId: "mimic",
          artId: "art-mimic",
          caption: "Il forziere si apre",
          recipients: { mode: "all" },
        },
        "dm",
      )),
  );
  const p = D.projectMaterial(ctx.state, id, "player");
  assert.equal(p.kind, "art");
  assert.equal(p.title, "Il forziere si apre");
  assert.ok(!JSON.stringify(p).includes("Mimic"), "the creature name stays with the DM");
  assert.ok(!JSON.stringify(p).includes("art-mimic"), "no art id names the picture either");
  assert.equal(D.revealedArtFor(ctx.state, "mimic", "player").length, 1);
  // Revealing the same art again reuses the material and adds a new show (a new pop-up).
  ctx.commit("again", (d) =>
    D.revealArt(
      d,
      { actorId: "mimic", artId: "art-mimic", caption: "Ancora", recipients: { mode: "all" } },
      "dm",
    ),
  );
  assert.equal(ctx.state.ext.handouts.materials.filter((m) => m.kind === "art").length, 1);
  assert.equal(D.unseenShows(ctx.state, "player").length, 2);
});

test("vignette: players see the options and pick for their characters; the DM decides and corrects", () => {
  const { ctx } = harness();
  ctx.commit("show", (d) => D.showMaterial(d, "material-wagon", { mode: "all" }, "dm"));
  const p = D.projectMaterial(ctx.state, "material-wagon", "player");
  assert.deepEqual(
    p.choices.map((c) => c.id),
    ["wagon-help", "wagon-tracks", "wagon-tower"],
  );
  assert.deepEqual(p.myActors, ["livia", "mira"]);
  ctx.role = "player";
  ctx.commit("pick", (d) =>
    D.chooseVignette(d, "material-wagon", "livia", "wagon-tracks", "player"),
  );
  ctx.commit("pick", (d) => D.chooseVignette(d, "material-wagon", "mira", "wagon-help", "player"));
  assert.throws(
    () =>
      ctx.commit("pick", (d) =>
        D.chooseVignette(d, "material-wagon", "doran", "wagon-help", "player"),
      ),
    /tuoi personaggi/,
  );
  ctx.role = "dm";
  const tally = D.projectMaterial(ctx.state, "material-wagon", "dm").tally;
  assert.deepEqual(
    tally.map((c) => c.actorIds),
    [["mira"], ["livia"], []],
  );
  ctx.commit("decide", (d) =>
    D.decideVignette(
      d,
      "material-wagon",
      { choiceId: "wagon-tracks", note: "Le tracce portano al pozzo." },
      "dm",
    ),
  );
  ctx.role = "player";
  assert.throws(
    () =>
      ctx.commit("late", (d) =>
        D.chooseVignette(d, "material-wagon", "livia", "wagon-help", "player"),
      ),
    /già deciso/,
  );
  assert.equal(
    D.projectMaterial(ctx.state, "material-wagon", "player").outcome.note,
    "Le tracce portano al pozzo.",
  );
  ctx.role = "dm";
  assert.throws(
    () =>
      ctx.commit("fix", (d) =>
        D.decideVignette(d, "material-wagon", { choiceId: "wagon-help" }, "dm"),
      ),
    /Motivo della correzione/,
  );
  ctx.commit("fix", (d) =>
    D.decideVignette(
      d,
      "material-wagon",
      { choiceId: "wagon-help", reason: "Avevo letto male" },
      "dm",
    ),
  );
  const wagon = ctx.state.ext.handouts.materials.find((m) => m.id === "material-wagon");
  assert.equal(wagon.outcome.corrected, true);
  assert.equal(wagon.corrections.at(-1).reason, "Avevo letto male");
  // A choice already picked cannot be dropped from the vignette.
  assert.throws(
    () =>
      D.saveMaterial(
        structuredClone(ctx.state),
        {
          id: "material-wagon",
          title: "x",
          choices: [{ id: "wagon-tower", text: "a" }, { text: "b" }],
        },
        "dm",
      ),
    /già votata/,
  );
});

test("authoring validation: title, headings, choices and uploads", () => {
  const { ctx } = harness();
  const draft = structuredClone(ctx.state);
  assert.throws(
    () => D.saveMaterial(draft, { ...letterInput, title: " " }, "dm"),
    /Titolo: campo obbligatorio/,
  );
  assert.throws(
    () =>
      D.saveMaterial(draft, { ...letterInput, sections: [{ playerText: "senza titolo" }] }, "dm"),
    /intestazione/,
  );
  assert.throws(
    () =>
      D.saveMaterial(draft, { ...letterInput, kind: "vignette", choices: [{ text: "una" }] }, "dm"),
    /da 2 a 6/,
  );
  assert.throws(
    () => D.saveMaterial(draft, { ...letterInput, image: { artId: "nope" } }, "dm"),
    /Immagine non trovata/,
  );
  // An image uploaded here by an earlier version stays readable and searchable.
  draft.ext.handouts.uploads.push({
    id: "upload-old",
    title: "Mappa del pozzo",
    image: "data:image/png;base64,iVBORw0KGgo=",
  });
  assert.equal(D.resolveArt(draft, "upload-old").title.it, "Mappa del pozzo");
  assert.equal(D.searchArt(draft, "pozzo")[0].id, "upload-old");
  assert.equal(D.searchArt(draft, "taverna")[0].id, "art-tavern");
});

test("B28 library images: listed read-only; a personal file reaches players only once shared", () => {
  const { ctx } = harness();
  ctx.commit("media", (d) => {
    d.ext[MEDIA_ID] = seedMedia();
  });
  const ids = D.artList(ctx.state).map((art) => art.id);
  assert.ok(ids.includes("media:m-letter") && ids.includes("media:m-goblin"));
  assert.ok(!ids.includes("media:m-livia-portrait"), "the player's personal file is not the DM's");
  let id;
  ctx.commit(
    "create",
    (d) =>
      (id = D.saveMaterial(
        d,
        { ...letterInput, title: "Ordini della sentinella", image: { artId: "media:m-goblin" } },
        "dm",
      )),
  );
  assert.throws(
    () => ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "all" }, "dm")),
    (error) =>
      error.it.includes("condividila con la campagna da Biblioteca › Immagini e file") &&
      error.en.includes("with its source and licence"),
  );
  assert.equal(D.resolveArt(ctx.state, "media:m-goblin", "player"), null);
  assert.throws(
    () =>
      ctx.commit("reveal", (d) =>
        D.revealArt(
          d,
          {
            actorId: "goblin-1",
            artId: "media:m-goblin",
            caption: "x",
            recipients: { mode: "all" },
          },
          "dm",
        ),
      ),
    /libreria personale/,
  );
  assert.throws(
    () =>
      ctx.commit("stage", (d) =>
        D.createMaplessScene(
          d,
          { name: "Magazzino", artId: "media:m-goblin", participantIds: ["livia"] },
          "dm",
        ),
      ),
    /libreria personale/,
  );
  // The shared letter (provenance and licence recorded in B28) can be shown.
  ctx.commit("image", (d) =>
    D.saveMaterial(
      d,
      { ...letterInput, id, title: "Ordini della sentinella", image: { artId: "media:m-letter" } },
      "dm",
    ),
  );
  ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "all" }, "dm"));
  const seen = D.projectMaterial(ctx.state, id, "player");
  assert.equal(
    seen.image.src,
    ctx.state.ext[MEDIA_ID].assets.find((a) => a.id === "m-letter").dataUrl,
  );
  assert.equal(seen.image.id, undefined);
  // Token art (DDB-130): the creature's own library image comes first and is preselected
  // (P4 TV-109: a personal file is shared inline by the reveal dialog, provenance included).
  assert.equal(D.matchArt(ctx.state, "goblin-1")[0].id, "media:m-goblin");
  assert.equal(D.preferredArt(ctx.state, "goblin-1").id, "media:m-goblin");
  assert.ok(D.personalMedia(ctx.state, "media:m-goblin"), "still personal until shown");
  // Doran's portrait is the DM's personal file: suggested and preselected, shared on reveal.
  assert.deepEqual(
    D.matchArt(ctx.state, "doran").map((art) => art.id),
    ["media:m-doran-portrait"],
  );
  assert.equal(D.preferredArt(ctx.state, "doran").id, "media:m-doran-portrait");
});

test("reveal panel previews only art that belongs to the creature (never a random image)", () => {
  const { ctx, registry } = harness();
  const scene = ctx.state.scenes[0];
  assert.deepEqual(D.matchArt(ctx.state, "livia"), []);
  const livia = registry.slot("table-panel", "handouts-reveal", ctx, {
    scene,
    selectedActorId: "livia",
  });
  assert.ok(!livia.includes("<img"), "no unrelated preview for Livia");
  assert.ok(livia.includes("Rivela aspetto…"));
  const goblin = registry.slot("table-panel", "handouts-reveal", ctx, {
    scene,
    selectedActorId: "goblin-2",
  });
  assert.ok(goblin.includes('alt="Occhi nel buio"'));
});

function worldEntry(state, id, sections, access = { mode: "campaign", grants: [] }) {
  createCampaignDraft(state, { id, kind: "world", campaignId: "lanterns" }, "dm");
  saveCampaignDraft(
    state,
    id,
    {
      data: {
        title: "Torre della lanterna",
        body: "Una torre di pietra grigia sopra il cortile.",
        worldType: "place",
        questStatus: "open",
        sessionId: null,
        narratorActorId: null,
        links: [],
        sections,
      },
      access,
    },
    "dm",
  );
  const { reviewKey } = previewCampaignDraft(state, id, "dm");
  return applyCampaignDraft(state, id, { reviewKey }, "dm").entryId;
}
test("pins link to Campaign › World entries; players get only what their audience allows", () => {
  const { ctx } = harness();
  let entryId;
  ctx.commit(
    "world",
    (d) =>
      (entryId = worldEntry(d, "world-tower", [
        {
          id: "tower-door",
          title: "Porta",
          body: "Una porta d’ottone, chiusa da una serratura a forma di lanterna.",
          access: { mode: "campaign", grants: [] },
        },
        {
          id: "tower-trap",
          title: "Botola",
          body: "SEGRETO-DM: la botola cede sotto chi porta metallo.",
          access: { mode: "dms", grants: [] },
        },
      ])),
  );
  assert.deepEqual(
    D.worldEntries(ctx.state).map((e) => e.id),
    [entryId],
  );
  const door = { entryId, sectionId: "tower-door" };
  const trap = { entryId, sectionId: "tower-trap" };
  assert.equal(D.linkLabel(ctx.state, door), "Torre della lanterna › Porta");
  assert.match(D.linkExcerpt(ctx.state, door), /porta d’ottone/);
  assert.equal(D.linkExcerpt(ctx.state, trap), "", "a DM-only section never becomes an excerpt");
  let pinId;
  ctx.commit(
    "pin",
    (d) =>
      (pinId = D.savePin(
        d,
        {
          sceneId: "old-watch",
          x: 300,
          y: 200,
          label: "Porta della torre",
          link: door,
          excerpt: D.linkExcerpt(d, door),
          excerptLinked: true,
          visible: true,
        },
        "dm",
      )),
  );
  const seen = D.projectPins(ctx.state, "old-watch", "player").find((p) => p.id === pinId);
  assert.equal(seen.entryId, entryId, "the player can open the shared entry from the pin");
  assert.match(seen.excerpt, /porta d’ottone/);
  assert.throws(
    () =>
      D.savePin(
        structuredClone(ctx.state),
        { sceneId: "old-watch", x: 1, y: 1, label: "x", link: { entryId: "nope" } },
        "dm",
      ),
    /Voce del Mondo non trovata/,
  );
  // A private entry: the pin still shows its label and excerpt, never the entry.
  let secretId;
  ctx.commit(
    "world",
    (d) => (secretId = worldEntry(d, "world-cellar", [], { mode: "dms", grants: [] })),
  );
  ctx.commit("pin", (d) =>
    D.savePin(
      d,
      {
        sceneId: "old-watch",
        x: 400,
        y: 200,
        label: "Cantina",
        link: { entryId: secretId },
        excerpt: "Odore di muffa.",
        visible: true,
      },
      "dm",
    ),
  );
  const cellar = D.projectPins(ctx.state, "old-watch", "player").find((p) => p.label === "Cantina");
  assert.equal(cellar.entryId, null);
  assert.equal(cellar.excerpt, "Odore di muffa.");
  assert.ok(
    !JSON.stringify(D.projectPins(ctx.state, "old-watch", "player")).includes("SEGRETO-DM"),
  );
});

test("a linked excerpt follows the heading's player text; deleting the material freezes it", () => {
  const { ctx } = harness();
  const link = { materialId: "material-crypt", sectionId: "crypt-entrance" };
  let linked, custom;
  ctx.commit("pins", (d) => {
    linked = D.savePin(
      d,
      {
        sceneId: "old-watch",
        x: 100,
        y: 100,
        label: "Scala",
        link,
        excerpt: "x",
        excerptLinked: true,
      },
      "dm",
    );
    custom = D.savePin(
      d,
      { sceneId: "old-watch", x: 120, y: 100, label: "Scala 2", link, excerpt: "Testo mio" },
      "dm",
    );
    D.setPinVisible(d, linked, true, "dm");
    D.setPinVisible(d, custom, true, "dm");
  });
  const crypt = ctx.state.ext.handouts.materials[0];
  ctx.commit("edit", (d) =>
    D.saveMaterial(
      d,
      {
        id: crypt.id,
        title: crypt.title,
        image: crypt.image,
        sections: crypt.sections.map((s) =>
          s.id === "crypt-entrance"
            ? { ...s, playerText: "Gradini consumati scendono nel buio." }
            : s,
        ),
        sceneIds: crypt.sceneIds,
      },
      "dm",
    ),
  );
  const excerpt = (id) =>
    D.projectPins(ctx.state, "old-watch", "player").find((p) => p.id === id).excerpt;
  assert.equal(excerpt(linked), "Gradini consumati scendono nel buio.");
  assert.equal(excerpt(custom), "Testo mio");
  ctx.commit("delete", (d) => D.deleteMaterial(d, "material-crypt", "dm"));
  const pin = ctx.state.ext.handouts.pins.find((p) => p.id === linked);
  assert.deepEqual(
    [pin.link, pin.excerptLinked, pin.excerpt],
    [null, false, "Gradini consumati scendono nel buio."],
  );
  // The prep sheet row that pointed at the crypt lost its link; one Undo restores both.
  const row = () =>
    ctx.state.ext["handouts-prep"].sheets
      .find((s) => s.id === "prep-3")
      .lists.locations.find((r) => r.id === "loc-3-crypt");
  assert.equal(row().materialId, null);
  ctx.undo();
  assert.equal(row().materialId, "material-crypt");
  assert.ok(ctx.state.ext.handouts.pins.find((p) => p.id === linked).excerptLinked);
});

test("normalize keeps saved data, drops malformed rows and refuses a newer version", () => {
  const seeded = D.seedHandouts();
  assert.deepEqual(D.normalizeHandouts(structuredClone(seeded), 1).materials.length, 3);
  const messy = D.normalizeHandouts(
    {
      materials: [{ id: "x", kind: "bad" }, null],
      pins: [{}],
      uploads: [{ id: "u", image: "javascript:1" }],
    },
    1,
  );
  assert.deepEqual(messy, { materials: [], pins: [], stages: {}, uploads: [] });
  assert.throws(() => D.normalizeHandouts(seeded, 2), /newer version/);
  assert.deepEqual(D.normalizeSeen({ player: ["a", 3] }, 1), { player: ["a"], dm: [] });
});

test("contributions: DM Preparation, player Campaign list, drawer, search, notifications, L command", () => {
  const { ctx, registry } = harness();
  ctx.commit("create", (d) => D.saveMaterial(d, letterInput, "dm"));
  const id = ctx.state.ext.handouts.materials.at(-1).id;
  ctx.view = { page: "preparation", id: "", tab: "handouts" };
  const prep = registry.slot("preparation-section", "handouts", ctx);
  assert.ok(prep.includes("Lettera sigillata") && prep.includes("Nuovo handout"));
  assert.equal(registry.get("preparation-section", "handouts", { ...ctx, role: "player" }), null);
  // Player: Campaign › Materials lists only what was shared, never the DM note.
  ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "some", actorIds: ["livia"] }, "dm"));
  ctx.role = "player";
  ctx.view = { page: "campaign", id: "", tab: "handouts" };
  const campaign = registry.slot("campaign-section", "handouts", ctx);
  assert.ok(campaign.includes("Lettera sigillata") && campaign.includes("Nuovo"));
  assert.ok(!campaign.includes("Cripta") && !campaign.includes("SEGRETO-DM"));
  // Search and notifications respect access.
  assert.deepEqual(
    registry.search(ctx, "lettera").map((r) => r.params),
    [{ tab: "handouts", id }],
  );
  assert.deepEqual(registry.search(ctx, "cripta"), []);
  assert.ok(registry.notifications(ctx).some((n) => n.title.it.includes("Lettera sigillata")));
  // DM drawer and the semi-transparent pins command (device setting, DM only).
  ctx.role = "dm";
  const scene = ctx.state.scenes[0];
  const drawer = registry.slot("table-panel", "handouts-panel", ctx, {
    scene,
    selectedActorId: "livia",
  });
  assert.ok(drawer.includes("Rivela un’immagine"));
  const command = registry.commandForKey("L", { ...ctx, view: { page: "table" } });
  assert.equal(command?.id, "handouts.dim-pins");
  assert.equal(registry.run(command, ctx), true);
  assert.equal(registry.getSetting(ctx, "handouts-view.dim-pins"), true);
  assert.match(registry.slot("map-layer", "handouts-pins", ctx, { scene }), /is-dim/);
  assert.equal(
    registry.commandForKey("L", { ...ctx, role: "player", view: { page: "table" } }),
    null,
  );
  // Player pins layer: the hidden well pin is absent.
  ctx.role = "player";
  assert.ok(!registry.slot("map-layer", "handouts-pins", ctx, { scene }).includes("Pozzo"));
});

test("English labels and the reveal panel for the selected creature", () => {
  const { ctx, registry } = harness({ lang: "en" });
  const scene = ctx.state.scenes[0];
  const panel = registry.slot("table-panel", "handouts-reveal", ctx, {
    scene,
    selectedActorId: "goblin-2",
  });
  assert.ok(panel.includes("Reveal art…"));
  ctx.role = "player";
  assert.equal(
    registry.get("table-panel", "handouts-reveal", ctx, { scene, selectedActorId: "goblin-2" }),
    null,
  );
  ctx.role = "dm";
  ctx.commit("reveal", (d) =>
    D.revealArt(
      d,
      {
        actorId: "goblin-2",
        artId: "art-goblin",
        caption: "Eyes in the dark",
        recipients: { mode: "all" },
      },
      "dm",
    ),
  );
  ctx.role = "player";
  const playerPanel = registry.slot("table-panel", "handouts-reveal", ctx, {
    scene,
    selectedActorId: "goblin-2",
  });
  assert.ok(playerPanel.includes("Eyes in the dark"));
  const drawer = registry.slot("table-panel", "handouts-panel", ctx, {
    scene,
    selectedActorId: "livia",
  });
  assert.ok(drawer.includes("Shared with you") && drawer.includes("Eyes in the dark"));
});

// ---------------------------------------------------------------------------------------
// Review fixes (24/09): linked scenes on every scene, explicit linked excerpt, Go to pin,
// vignette outcome delivered as a show, duplicate, search and tags.

/** Captures the body of the dialogs a command opens (no DOM in node). */
function captureDialogs(ctx) {
  const opened = [];
  ctx.dialog = (title, body) => opened.push({ title, body });
  return opened;
}

test("linked scenes work on a map scene: DM drawer group, DM viewer and card", () => {
  const { ctx, registry } = harness();
  const scene = ctx.state.scenes.find((s) => s.id === "old-watch");
  const drawer = registry.slot("table-panel", "handouts-panel", ctx, {
    scene,
    selectedActorId: "livia",
  });
  // The crypt is linked to the courtyard: listed first, in its own group.
  assert.match(
    drawer,
    /data-hs-scene-materials[\s\S]*Materiali di questa scena[\s\S]*Cripta sotto l’osservatorio[\s\S]*data-hs-other-materials/,
  );
  const others = drawer.slice(drawer.indexOf("data-hs-other-materials"));
  assert.ok(!others.includes("Cripta sotto"), "a scene material is not listed twice");
  assert.ok(others.includes("Avviso della gilda"));
  // A pin linked to a crypt heading: the DM viewer names the linked scene and offers Go to pin.
  let pinId;
  ctx.commit("pin", (d) => {
    pinId = D.savePin(
      d,
      {
        sceneId: "old-watch",
        x: 200,
        y: 200,
        label: "Scala",
        link: { materialId: "material-crypt", sectionId: "crypt-entrance" },
        excerptLinked: true,
      },
      "dm",
    );
  });
  const opened = captureDialogs(ctx);
  openViewer(ctx, "material-crypt");
  const body = opened.at(-1).body;
  assert.match(body, /Scene collegate[\s\S]*Il cortile dell’osservatorio/);
  assert.match(body, new RegExp(`data-hs-viewer-goto-pin="${pinId}"`));
  assert.match(body, /Vai allo spillo/);
  // Players never get the DM block with scenes and pins.
  ctx.commit("show", (d) => D.showMaterial(d, "material-crypt", { mode: "all" }, "dm"));
  ctx.role = "player";
  openViewer(ctx, "material-crypt");
  assert.ok(!opened.at(-1).body.includes("Scene collegate"));
  assert.ok(!opened.at(-1).body.includes("data-hs-viewer-goto-pin"));
  // The Preparation card names the linked scene.
  ctx.role = "dm";
  ctx.view = { page: "preparation", id: "", tab: "handouts" };
  const prep = registry.slot("preparation-section", "handouts", ctx);
  assert.match(prep, /data-material="material-crypt"[\s\S]*?Il cortile dell’osservatorio/);
  // English drawer label.
  ctx.lang = "en";
  assert.ok(
    registry
      .slot("table-panel", "handouts-panel", ctx, { scene, selectedActorId: "livia" })
      .includes("Materials for this scene"),
  );
});

test("pin editor: explicit 'use the heading text' choice (R20-099) and kind visibility note", () => {
  const { ctx } = harness();
  let linked, custom;
  ctx.commit("pins", (d) => {
    const link = { materialId: "material-crypt", sectionId: "crypt-entrance" };
    linked = D.savePin(
      d,
      { sceneId: "old-watch", x: 10, y: 10, label: "A", link, excerptLinked: true },
      "dm",
    );
    // Same text as the heading, but the DM keeps it fixed: not live-linked.
    custom = D.savePin(
      d,
      {
        sceneId: "old-watch",
        x: 20,
        y: 20,
        label: "B",
        link,
        excerpt: D.linkExcerpt(d, link),
        excerptLinked: false,
      },
      "dm",
    );
  });
  assert.equal(ctx.state.ext.handouts.pins.find((p) => p.id === custom).excerptLinked, false);
  const opened = captureDialogs(ctx);
  openPinEditor(ctx, { id: linked });
  assert.match(opened.at(-1).body, /name="excerptLinked"[^>]*checked/);
  assert.match(opened.at(-1).body, /Usa il testo per i giocatori dell’intestazione/);
  assert.match(opened.at(-1).body, /visibile ai giocatori quando riveli lo spillo/);
  openPinEditor(ctx, { id: custom });
  assert.doesNotMatch(opened.at(-1).body, /name="excerptLinked"[^>]*checked/);
});

test("a decided or corrected vignette outcome reaches its recipients as a new show", () => {
  const { ctx, registry } = harness();
  ctx.commit("show", (d) => D.showMaterial(d, "material-wagon", { mode: "all" }, "dm"));
  ctx.role = "player";
  ctx.commit("seen", (d) =>
    D.markSeen(
      d,
      D.unseenShows(d, "player").map((r) => r.showId),
      "player",
    ),
  );
  ctx.commit("pick", (d) =>
    D.chooseVignette(d, "material-wagon", "livia", "wagon-tracks", "player"),
  );
  assert.deepEqual(D.unseenShows(ctx.state, "player"), []);
  ctx.role = "dm";
  ctx.commit("decide", (d) =>
    D.decideVignette(d, "material-wagon", { choiceId: "wagon-tracks", note: "Trovate." }, "dm"),
  );
  ctx.role = "player";
  const pending = D.unseenShows(ctx.state, "player");
  assert.equal(pending.length, 1);
  assert.equal(pending[0].kind, "outcome");
  const notice = registry
    .notifications(ctx)
    .find((n) => n.id === `handouts-show-${pending[0].showId}`);
  assert.equal(notice.title.it, "“Il carro rovesciato”: il DM ha deciso l’esito");
  // A correction is announced again; a withdrawn vignette announces nothing.
  ctx.commit("seen", (d) => D.markSeen(d, [pending[0].showId], "player"));
  ctx.role = "dm";
  ctx.commit("correct", (d) =>
    D.decideVignette(
      d,
      "material-wagon",
      { choiceId: "wagon-help", note: "", reason: "Errore mio" },
      "dm",
    ),
  );
  assert.equal(D.unseenShows(ctx.state, "player").length, 1);
  ctx.commit("withdraw", (d) =>
    D.withdrawMaterial(d, "material-wagon", { reason: "Rinvio" }, "dm"),
  );
  const shows = ctx.state.ext.handouts.materials.find((m) => m.id === "material-wagon").shows;
  ctx.commit("correct again", (d) =>
    D.decideVignette(
      d,
      "material-wagon",
      { choiceId: "wagon-tower", note: "", reason: "Ancora" },
      "dm",
    ),
  );
  assert.equal(
    ctx.state.ext.handouts.materials.find((m) => m.id === "material-wagon").shows.length,
    shows.length,
  );
});

test("duplicate: a reusable copy starts DM-only with its choices and no picks (CRP-072)", () => {
  const { ctx } = harness();
  ctx.commit("show", (d) => D.showMaterial(d, "material-wagon", { mode: "all" }, "dm"));
  ctx.role = "player";
  ctx.commit("pick", (d) => D.chooseVignette(d, "material-wagon", "livia", "wagon-help", "player"));
  ctx.role = "dm";
  let copyId;
  ctx.commit("dup", (d) => (copyId = D.duplicateMaterial(d, "material-wagon", "dm")));
  const source = ctx.state.ext.handouts.materials.find((m) => m.id === "material-wagon");
  const copy = ctx.state.ext.handouts.materials.find((m) => m.id === copyId);
  assert.equal(copy.title, "Il carro rovesciato (copia)");
  assert.equal(copy.kind, "vignette");
  assert.deepEqual(
    copy.choices.map((c) => c.text),
    source.choices.map((c) => c.text),
  );
  assert.ok(copy.choices.every((c) => !source.choices.some((s) => s.id === c.id)));
  assert.deepEqual(
    [copy.access.mode, copy.shows.length, Object.keys(copy.responses).length, copy.outcome],
    ["none", 0, 0, null],
  );
  assert.equal(D.canReadMaterial(ctx.state, copy, "player"), false);
  assert.throws(() => D.duplicateMaterial(structuredClone(ctx.state), copyId, "player"), /DM/);
});

test("materials search: title, player text, headings and DM-only tags (VTL-080)", () => {
  const { ctx, registry } = harness();
  let id;
  ctx.commit(
    "create",
    (d) => (id = D.saveMaterial(d, { ...letterInput, tags: ["Varro", " sigillo ", ""] }, "dm")),
  );
  const material = ctx.state.ext.handouts.materials.find((m) => m.id === id);
  assert.deepEqual(material.tags, ["Varro", "sigillo"]);
  const titles = (role, query) => D.listMaterials(ctx.state, role, { query }).map((m) => m.title);
  assert.deepEqual(titles("dm", "sigillo"), ["Lettera sigillata"]);
  assert.deepEqual(titles("dm", "sarcofago"), ["Cripta sotto l’osservatorio"]);
  assert.deepEqual(titles("dm", "riaccende"), ["Lettera sigillata"]);
  // Tags are DM organisation: a player's search never matches them.
  ctx.commit("show", (d) => D.showMaterial(d, id, { mode: "all" }, "dm"));
  assert.deepEqual(titles("player", "varro"), ["Lettera sigillata"], "player text mentions it");
  assert.deepEqual(titles("player", "sigillo"), []);
  assert.ok(!("tags" in D.projectMaterial(ctx.state, id, "player")));
  ctx.view = { page: "preparation", id: "", tab: "handouts" };
  const prep = registry.slot("preparation-section", "handouts", ctx);
  assert.match(prep, /type="search"[^>]*data-hs-material-search/);
  assert.match(prep, /data-hs-duplicate="material-wagon"/);
  assert.throws(
    () =>
      D.saveMaterial(
        structuredClone(ctx.state),
        { ...letterInput, tags: Array.from({ length: 13 }, (_, i) => "t" + i) },
        "dm",
      ),
    /etichette/,
  );
});
