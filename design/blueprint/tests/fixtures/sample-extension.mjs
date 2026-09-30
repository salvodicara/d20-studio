// Test extension for the B11 registry: one contribution for every extension point, a
// state slice, styles and event handlers. It is also the reference entry module for
// builders (see changes/interview-01/blueprint-registry-plan.md). Synthetic data only.

const ID = "sample-extension";
const L = (it, en) => ({ it, en });

export function register(registry) {
  const notes = (state) => registry.slice(state, ID).notes;
  const seen = { commits: 0, turns: [] };

  registry.registerStateSlice(ID, {
    version: 2,
    // Version 1 stored notes as plain strings; version 2 stores {id, text}.
    seed: () => ({ notes: [{ id: "n1", text: "Prima nota" }], pinned: null }),
    normalize(slice, fromVersion) {
      if (fromVersion > 2) throw Error("Saved data comes from a newer version");
      const list = Array.isArray(slice?.notes) ? slice.notes : [];
      return {
        notes: list.map((note, i) =>
          typeof note === "string" ? { id: "legacy-" + (i + 1), text: note } : note,
        ),
        pinned: typeof slice?.pinned === "string" ? slice.pinned : null,
      };
    },
  });
  registry.registerStateSlice(ID + "-log", {
    version: 1,
    undo: "preserve",
    seed: () => ({ entries: [] }),
    normalize: (slice) => ({ entries: Array.isArray(slice?.entries) ? slice.entries : [] }),
  });
  registry.registerStyles("data:text/css,.sample-extension-panel{outline:1px dashed}");

  const page = (ctx) =>
    `<section class="sample-extension-panel"><h1>${ctx.t("Pagina di prova", "Sample page")}</h1><ul>${notes(
      ctx.state,
    )
      .map((note) => `<li>${ctx.esc(note.text)}</li>`)
      .join(
        "",
      )}</ul><button class="button" data-sample-add>${ctx.t("Aggiungi nota", "Add note")}</button></section>`;
  // The note is gameplay data (Undo removes it); the log entry lives in a slice declared
  // undo: "preserve", so it survives Undo like narrative history does.
  const addNote = (ctx, text) =>
    ctx.commit(ctx.t("Nota di prova aggiunta", "Sample note added"), (draft) => {
      const list = registry.slice(draft, ID).notes;
      const id = "n" + (list.length + 1);
      list.push({ id, text });
      registry.slice(draft, ID + "-log").entries.push({ id: "log-" + id, noteId: id });
    });

  registry.add("route", {
    id: ID,
    label: L("Prova", "Sample"),
    icon: "flag",
    nav: true,
    order: 25,
    render: page,
    bind(el, ctx) {
      // Outside registry.run, a page handler shows a refusal from ctx.commit itself (for
      // example the simulated offline mode): {it, en} when present, else the message.
      el.querySelector("[data-sample-add]")?.addEventListener("click", () => {
        try {
          addNote(ctx, "Nota");
        } catch (error) {
          ctx.toast(ctx.label(error.it ? error : error.message), true);
        }
      });
    },
  });
  registry.add("service", {
    id: ID + "-info",
    label: L("Informazioni di prova", "Sample info"),
    icon: "flag",
    header: true,
    run: (ctx) => ctx.dialog(ctx.t("Prova", "Sample"), `<p>${ctx.t("Servizio", "Service")}</p>`),
  });
  registry.add("campaign-section", {
    id: ID + "-section",
    label: L("Sezione di prova", "Sample section"),
    // B62: the campaign rail group it joins (CAMPAIGN_SECTION_GROUPS); order 45 places it
    // between Journal (40) and World (50) of that group.
    group: "campaign",
    order: 45,
    render: (ctx) => `<p>${ctx.t("Sezione della campagna", "Campaign section")}</p>`,
  });
  registry.add("sheet-tab", {
    id: ID + "-tab",
    label: L("Scheda di prova", "Sample tab"),
    order: 65,
    when: (ctx, actor) => actor?.kind === "character",
    render: (ctx, actor) => `<p>${ctx.esc(actor.name)}</p>`,
  });
  registry.add("sheet-section", {
    id: ID + "-extras",
    tab: "extras",
    label: L("Riquadro di prova", "Sample box"),
    render: (ctx, actor) => `<p>${ctx.esc(actor.name)}</p>`,
  });
  registry.add("preparation-section", {
    id: ID + "-prep",
    label: L("Preparazione di prova", "Sample preparation"),
    roles: ["dm"],
    render: (ctx) => `<p>${ctx.t("Solo DM", "DM only")}</p>`,
  });
  registry.add("library-section", {
    id: ID + "-library",
    label: L("Raccolta di prova", "Sample collection"),
    render: (ctx) => `<p>${ctx.t("Biblioteca", "Library")}</p>`,
  });
  registry.add("home-widget", {
    id: ID + "-widget",
    label: L("Riquadro iniziale", "Home box"),
    order: 15,
    render: (ctx) => `<p>${notes(ctx.state).length}</p>`,
  });
  registry.add("table-tool", {
    id: ID + "-ping",
    label: L("Segnale di prova", "Sample ping"),
    icon: "flag",
    // B61: the map toolbar group it joins (see TABLE_TOOL_GROUPS in registry.mjs).
    group: "ping",
    order: 55,
    onClick(ctx, event, table) {
      table.message(ctx.t("Segnale", "Ping") + ` ${Math.round(table.point(event).x)}`);
    },
  });
  registry.add("table-panel", {
    id: ID + "-panel",
    label: L("Pannello del DM", "DM panel"),
    roles: ["dm"],
    // B61: its own tab of the Table's right sidebar (icon on the tab, label on hover).
    placement: "sidebar-tab",
    icon: "book",
    order: 200,
    render: (ctx, table) => `<p>${ctx.esc(table.scene.name)}</p>`,
  });
  registry.add("token-menu", {
    id: ID + "-mark",
    label: L("Segna", "Mark"),
    group: "sample",
    when: (ctx, target) => Boolean(ctx.state.actors[target.actorId]),
    run: (ctx, target) =>
      ctx.commit(ctx.t("Pedina segnata", "Token marked"), (draft) => {
        registry.slice(draft, ID).pinned = target.actorId;
      }),
  });
  registry.add("map-layer", {
    id: ID + "-marks",
    label: L("Segni di prova", "Sample marks"),
    order: 65,
    svg: (ctx, table) => {
      const pinned = registry.slice(ctx.state, ID).pinned;
      const token = table.scene.tokens.find((entry) => entry.actorId === pinned);
      return token ? `<circle cx="${token.x}" cy="${token.y}" r="34" fill="none"/>` : "";
    },
  });
  registry.add("search", {
    id: ID + "-notes",
    label: L("Note di prova", "Sample notes"),
    search: (ctx, query) =>
      notes(ctx.state)
        .filter((note) => note.text.toLowerCase().includes(query.toLowerCase()))
        .map((note) => ({ title: note.text, page: ID, params: { id: note.id } })),
  });
  registry.add("command", {
    id: ID + ".add-note",
    label: L("Aggiungi nota di prova", "Add sample note"),
    shortcut: "Mod+Shift+N",
    run: (ctx) => addNote(ctx, "Comando"),
  });
  registry.add("settings", {
    id: ID + "-display",
    label: L("Visualizzazione di prova", "Sample display"),
    scope: "device",
    fields: [
      { id: "compact", label: L("Compatta", "Compact"), type: "boolean", default: false },
      {
        id: "size",
        label: L("Dimensione", "Size"),
        type: "choice",
        default: "m",
        options: [
          { value: "s", label: L("Piccola", "Small") },
          { value: "m", label: L("Media", "Medium") },
        ],
      },
    ],
  });
  registry.add("settings", {
    id: ID + "-personal",
    label: L("Preferenze personali di prova", "Sample personal preferences"),
    scope: "personal",
    fields: [{ id: "nickname", label: L("Soprannome", "Nickname"), type: "text", default: "" }],
  });
  registry.add("settings", {
    id: ID + "-rules",
    label: L("Regole di prova", "Sample rules"),
    scope: "campaign",
    fields: [
      { id: "radius", label: L("Raggio", "Radius"), type: "number", default: 3, min: 1, max: 9 },
    ],
  });
  registry.add("notifications", {
    id: ID + "-alerts",
    label: L("Avvisi di prova", "Sample alerts"),
    collect: (ctx) =>
      registry.slice(ctx.state, ID + "-log").entries.map((entry) => ({
        id: entry.id,
        title: L("Nota aggiunta", "Note added"),
        target: { page: ID, params: { id: entry.noteId } },
      })),
  });
  registry.add("draft-guard", {
    id: ID + "-guard",
    label: L("Bozza di prova", "Sample draft"),
    hasDraft: () => seen.draft === true,
    confirm: (ctx, proceed) => {
      seen.draft = false;
      proceed();
    },
  });

  registry.on("commit", () => seen.commits++);
  registry.on("turn-start", (payload) => seen.turns.push(payload.actorId));
  registry.on("reset", () => {
    seen.commits = 0;
    seen.turns.length = 0;
  });
  registry.add("command", {
    id: ID + ".draft",
    label: L("Apri bozza di prova", "Open sample draft"),
    context: "table",
    run: () => {
      seen.draft = true;
      registry.emit(ID + ":draft-opened", { commits: seen.commits });
    },
  });
  registry.add("service", {
    id: ID + "-stats",
    label: L("Contatori di prova", "Sample counters"),
    run: (ctx) => ctx.toast(`${seen.commits}/${seen.turns.join(",")}`),
  });
}
