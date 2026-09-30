// B47 — Advanced scenes: levels, variants, objects, prefabs, Universal VTT (entry module).
// Card: docs/interview/CAPABILITY_CENSUS.md #### B47 (PR-03, PR-06, PR-08…PR-15, TV-13).
//
// Where it lives (B61 placement rule, folded by PR-03/06/08…15 under I-236):
// - Preparation › Scene: the one scene list has this area's folders, breadcrumb, search
//   and archive (Roll20 Page Menu); «Nuova scena» offers an image and Universal VTT; the
//   one scene editor has the Oggetti, Livelli and Varianti tabs and the grid alignment
//   next to «Griglia e misure» (see preparation.mjs). There is no separate section.
// - Table: the "Scena" sidebar tab (floors, look, views, roofs, off-map, objects), map layers
//   (objects under the tokens, roofs above them, the DM's off-map area), token-menu entries
//   (stairs, move off the map), keys as commands (PageUp/PageDown floors, F2–F4 views).
// Domain: scene-assets-domain.mjs, scene-levels.mjs, uvtt-import.mjs (all pure).
import * as D from "./scene-assets-domain.mjs";
import { stackOf, partyElsewhere, floorName } from "./scene-levels.mjs";
import {
  resetPrepUI,
  ui as prepUI,
  openUVTT,
  sceneUndoLabel,
  isMenuRoute,
} from "./scene-assets-prep.mjs";
import { openNewSceneDialog, openCreateNPC, editorTab } from "./preparation.mjs";
import {
  mapLayerSvg,
  roofLayerSvg,
  offMapLayerSvg,
  bindOffMapLayer,
  bindMapLayer,
  renderPanel,
  bindPanel,
  actions,
  applyDefaultView,
  stairsMenuTargets,
  openClimb,
  tableUI,
  resetTableUI,
  L_MENU,
} from "./scene-assets-table.mjs";
import { addUsageProvider } from "./media-domain.mjs";

const L = (it, en) => ({ it, en });
const activeScene = (ctx) => ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);

// B28 "used in": variants and objects made from a library image.
addUsageProvider(
  D.ID,
  {
    uses(state, assetId, viewer) {
      const value = D.sliceOf(state);
      if (!value) return null;
      const rows = [];
      let hidden = 0;
      const dm = viewer === "dm";
      for (const [sceneId, record] of Object.entries(value.variants ?? {})) {
        const scene = state.scenes?.find((s) => s.id === sceneId);
        for (const variant of record.list ?? [])
          if (variant.look?.assetId === assetId) {
            if (!dm || !scene) {
              hidden += 1;
              continue;
            }
            rows.push({
              label: L(
                `Variante «${variant.name}» della scena «${scene.name}»`,
                `Variant “${variant.name}” of the scene “${scene.name}”`,
              ),
              route: { page: "preparation", params: { id: sceneId, tab: "variants" } },
            });
          }
      }
      for (const [sceneId, list] of Object.entries(value.props ?? {})) {
        const scene = state.scenes?.find((s) => s.id === sceneId);
        for (const row of list)
          if (row.assetId === assetId) {
            if (!dm || !scene) {
              hidden += 1;
              continue;
            }
            rows.push({
              label: L(
                `Oggetto «${row.name}» nella scena «${scene.name}»`,
                `Object “${row.name}” in the scene “${scene.name}”`,
              ),
              route: { page: "preparation", params: { id: sceneId, tab: "objects" } },
            });
          }
      }
      return { rows, hidden };
    },
  },
  { ifAbsent: true },
);

export function register(registry) {
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: (state) => D.seedSlice(state),
    normalize: D.normalizeSlice,
    // Saved views and the roofs choice are personal preferences: Undo keeps them.
    afterUndo: D.keepPersonal,
  });
  registry.registerStyles(new URL("./scene-assets.css", import.meta.url));

  // PR-05: Ctrl/Cmd+Z in the scene list and the editor's object tabs takes back the last
  // scene change (a text field keeps its own undo; the Edit tab has its geometry undo).
  registry.add("command", {
    id: "scene-assets.undo",
    label: L("Annulla l’ultima modifica alle scene", "Undo the last change to scenes"),
    description: L("annulla, ripristina scena eliminata, undo", "undo, restore deleted scene"),
    shortcut: "Mod+Z",
    context: "preparation",
    roles: ["dm"],
    group: "scene-assets",
    when: (ctx) =>
      ctx.view?.page === "preparation" &&
      (!ctx.view.id ||
        isMenuRoute(ctx.view.id) ||
        ["objects", "levels", "variants"].includes(editorTab(ctx.view))) &&
      Boolean(sceneUndoLabel(ctx)),
    run: (ctx) => ctx.undo(),
  });
  // PR-07 (D&D Beyond's Theater of the Mind as a scene type) and PR-15 (Roll20/Foundry
  // Universal VTT import from «New scene»): both are starting points of «Nuova scena».
  registry.add("command", {
    id: "scene-assets.new-scene",
    label: L("Nuova scena…", "New scene…"),
    description: L(
      "crea scena, mappa, carica mappa, immagine della mappa, griglia vuota",
      "create scene, map, upload map, map picture, empty grid",
    ),
    context: "global",
    roles: ["dm"],
    group: "scene-assets",
    run: (ctx) => {
      ctx.navigate("preparation", {});
      openNewSceneDialog(ctx, "blank");
    },
  });
  registry.add("command", {
    id: "scene-assets.theater",
    label: L(
      "Nuova scena di teatro della mente (senza mappa)…",
      "New theatre-of-the-mind scene (no map)…",
    ),
    description: L(
      "teatro, teatro della mente, senza mappa, narrativa, scena narrativa, niente griglia",
      "theater, theatre of the mind, no map, mapless, narrative, narrative scene, no grid",
    ),
    context: "global",
    roles: ["dm"],
    group: "scene-assets",
    when: (ctx) => Boolean(ctx.state.ext?.handouts),
    run: (ctx) => {
      ctx.navigate("preparation", {});
      openNewSceneDialog(ctx, "theater");
    },
  });
  // PR-41 (Foundry/Roll20 actors directory): «Crea PNG» from anywhere opens the NPC
  // creator of the scene being prepared (or of the scene at the Table).
  registry.add("command", {
    id: "scene-assets.create-npc",
    label: L("Crea PNG…", "Create NPC…"),
    description: L(
      "PNG, png, nuovo PNG, crea png, personaggio non giocante, nuova creatura, NPC",
      "NPC, npc, new NPC, create npc, non-player character, new creature, PNG",
    ),
    context: "global",
    roles: ["dm"],
    group: "scene-assets",
    run: (ctx) => openCreateNPC(ctx),
  });

  registry.add("table-panel", {
    id: "scene-assets-panel",
    section: "scene",
    // Short: it is also the tab's caption in the phone's bottom bar (B61).
    label: L("Scena", "Scene"),
    placement: "sidebar-tab",
    icon: "home",
    order: 25,
    when: (ctx, tv) => Boolean(tv?.scene),
    render: renderPanel,
    bind: bindPanel,
  });
  registry.add("map-layer", {
    id: "scene-assets-objects",
    label: L("Oggetti di scena e scale", "Scene objects and stairs"),
    order: 12,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: mapLayerSvg,
    bind: bindMapLayer,
  });
  registry.add("map-layer", {
    id: "scene-assets-roofs",
    label: L("Tetti e chiome", "Roofs and canopies"),
    // Above the tokens and their decorations, below pins (64) and fog (68).
    order: 61,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: roofLayerSvg,
  });
  registry.add("map-layer", {
    id: "scene-assets-offmap",
    label: L("Area fuori mappa (DM)", "Off-map area (DM)"),
    order: 63,
    interactive: true,
    roles: ["dm"],
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: offMapLayerSvg,
    bind: bindOffMapLayer,
  });

  registry.add("token-menu", {
    id: "scene-assets-stairs",
    submenu: "actions",
    label: L_MENU.climb,
    icon: "arrow",
    group: "scene-assets",
    when: (ctx, target) => stairsMenuTargets(ctx, target).length > 0,
    run: (ctx, target) => openClimb(ctx, target),
  });
  registry.add("token-menu", {
    id: "scene-assets-off-map",
    submenu: "dm",
    label: L_MENU.offMap,
    icon: "arrow",
    group: "scene-assets",
    roles: ["dm"],
    when: (ctx, target) =>
      ctx.state.actors?.[target?.actorId]?.kind === "npc" &&
      !(ctx.state.combat?.active && ctx.state.combat.order?.includes(target.actorId)),
    run: (ctx, target) =>
      actions.sendOff(ctx, target.sceneId ?? ctx.state.activeSceneId, target.actorId),
  });

  // XCOM 2 floor keys (CRP-118): the DM moves the Table one floor up or down.
  const inBuilding = (ctx) => Boolean(stackOf(ctx.state, ctx.state.activeSceneId));
  registry.add("command", {
    id: "scene-assets.floor-up",
    label: L("Piano superiore al Tavolo", "Upper floor at the Table"),
    shortcut: "PageUp",
    context: "table",
    roles: ["dm"],
    group: "scene-assets",
    when: inBuilding,
    run: (ctx) => actions.step(ctx, 1),
  });
  registry.add("command", {
    id: "scene-assets.floor-down",
    label: L("Piano inferiore al Tavolo", "Lower floor at the Table"),
    shortcut: "PageDown",
    context: "table",
    roles: ["dm"],
    group: "scene-assets",
    when: inBuilding,
    run: (ctx) => actions.step(ctx, -1),
  });
  // AboveVTT saved camera positions (VTL-165): F-keys load, Shift+F-keys save. F1 opens
  // Help in this app, so the three views use F2–F4.
  for (const slot of [1, 2, 3]) {
    registry.add("command", {
      id: `scene-assets.view-${slot}`,
      label: L(`Vai alla vista salvata ${slot}`, `Go to saved view ${slot}`),
      shortcut: `F${slot + 1}`,
      context: "table",
      group: "scene-assets",
      run: (ctx) => actions.loadView(ctx, slot, tableUI.table),
    });
    registry.add("command", {
      id: `scene-assets.save-view-${slot}`,
      label: L(`Salva la vista ${slot}`, `Save view ${slot}`),
      shortcut: `Shift+F${slot + 1}`,
      context: "table",
      group: "scene-assets",
      run: (ctx) => actions.saveView(ctx, slot, tableUI.table),
    });
  }
  registry.add("command", {
    id: "scene-assets.starting-view",
    label: L("Vai alla vista iniziale della scena", "Go to the scene’s starting view"),
    context: "table",
    group: "scene-assets",
    run: (ctx) => applyDefaultView(ctx, tableUI.table),
  });
  registry.add("command", {
    id: "scene-assets.roofs",
    label: L("Mostra o nascondi i tetti (per me)", "Show or hide roofs (for me)"),
    context: "table",
    group: "scene-assets",
    run: (ctx) => actions.toggleRoofs(ctx),
  });
  // H-07 (re-audit obs. 2; Owlbear's grid alignment next to the grid settings): the scene
  // editor's «Allinea la griglia alla mappa», for the scene being edited or else the
  // scene at the Table.
  registry.add("command", {
    id: "scene-assets.align-grid",
    label: L("Allinea la griglia alla mappa", "Align the grid to the map"),
    description: L(
      "Due clic su una casella disegnata della mappa, con la lente: la griglia combacia",
      "Two clicks on a cell drawn on the map, with a magnifier: the grid matches",
    ),
    keywords: [
      L("allinea", "align"),
      L("griglia", "grid"),
      L("calibra", "calibrate"),
      L("allinea griglia", "align grid"),
      L("dimensione della cella", "cell size"),
    ],
    context: "global",
    roles: ["dm"],
    group: "scene-assets",
    when: (ctx) => ctx.state.scenes.length > 0,
    run: (ctx) => {
      const editing =
        ctx.view?.page === "preparation" &&
        ctx.state.scenes.some((scene) => scene.id === ctx.view.id);
      const id = editing ? ctx.view.id : (ctx.state.activeSceneId ?? ctx.state.scenes[0].id);
      ctx.navigate("preparation", { id, tab: "grid" });
    },
  });
  registry.add("command", {
    id: "scene-assets.import-uvtt",
    label: L(
      "Importa una mappa Universal VTT (.dd2vtt, .uvtt)…",
      "Import a Universal VTT map (.dd2vtt, .uvtt)…",
    ),
    description: L(
      "dd2vtt, uvtt, df2vtt, Dungeondraft, DungeonFog, importa mappa, muri, porte e luci",
      "dd2vtt, uvtt, df2vtt, Dungeondraft, DungeonFog, import map, walls, doors and lights",
    ),
    context: "global",
    roles: ["dm"],
    group: "scene-assets",
    run: (ctx) => {
      ctx.navigate("preparation", {});
      openUVTT(ctx);
    },
  });

  registry.add("notifications", {
    id: "scene-assets-floors",
    label: L("Piani dell’edificio", "Building floors"),
    roles: ["dm"],
    collect: (ctx) =>
      partyElsewhere(ctx.state).map((row) => ({
        id: `scene-assets-away-${row.actorId}-${row.floor.sceneId}`,
        title: L(
          `${row.name} è su un altro piano: ${floorName(row.floor)}`,
          `${row.name} is on another floor: ${floorName(row.floor)}`,
        ),
        body: L(
          "Il Tavolo mostra un altro piano: scegli tu quando mostrarlo al gruppo.",
          "The Table shows another floor: you choose when to show it to the party.",
        ),
        category: "scene-assets",
        target: { page: "table", params: {} },
      })),
  });
  registry.add("search", {
    id: "scene-assets-search",
    label: L("Cartelle e prefabbricati delle scene", "Scene folders and prefabs"),
    roles: ["dm"],
    search: (ctx, query) => {
      const text = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (!text) return [];
      const value = D.sliceOf(ctx.state);
      const folders = (value?.folders ?? [])
        .filter((f) => f.name.toLocaleLowerCase().includes(text))
        .map((f) => ({
          title: L(`Cartella di scene: ${f.name}`, `Scene folder: ${f.name}`),
          page: "preparation",
          params: { id: "folder:" + f.id },
        }));
      const prefabs = (value?.prefabs ?? [])
        .filter((p) => p.name.toLocaleLowerCase().includes(text))
        .map((p) => ({
          title: L(`Prefabbricato: ${p.name}`, `Prefab: ${p.name}`),
          excerpt: L(`${p.props.length} oggetti`, `${p.props.length} objects`),
          page: "preparation",
          params: { id: "prefab:" + p.id },
        }));
      return [...folders, ...prefabs].slice(0, 20);
    },
  });

  registry.on("navigate", (payload) => {
    if (payload?.page === "table" && payload.from !== "table") tableUI.pendingView = true;
    if (payload?.page !== "table") tableUI.table = null;
  });
  registry.on("scene-activated", () => {
    tableUI.pendingView = true;
    tableUI.flash = null;
  });
  registry.on("role-changed", () => {
    resetPrepUI();
    resetTableUI();
  });
  registry.on("reset", () => {
    resetPrepUI();
    resetTableUI();
  });
}
export { activeScene, prepUI };
