// B47 — the Table side of advanced scenes: object layers (map and foreground roofs that fade
// under a controlled token), stairs, the DM's off-map area with waiting creatures, and the
// "Scene" sidebar tab (floor switch, variant switch, starting and saved views, roofs toggle,
// off-map creatures, object outliner). Placement follows B61: the tab joins the right
// sidebar, map drawing is registry layers, token actions are token-menu entries, keys are
// commands (registered in scene-assets.mjs).
import * as D from "./scene-assets-domain.mjs";
import {
  stackOf,
  floorName,
  stairsOn,
  tokensOnStairs,
  partyElsewhere,
  floorOfActor,
  climb,
  switchFloor,
  stepFloor,
} from "./scene-levels.mjs";
import {
  propSvg,
  stairsSvg,
  stagedSvg,
  offMapFrame,
  hatchDefs,
  metersText,
} from "./scene-assets-canvas.mjs";
import { stickerById } from "./scene-assets-art.mjs";

const L = (it, en) => ({ it, en });
/** Transient Table state for this browser (never persisted). */
export const tableUI = {
  table: null,
  pendingView: true,
  outlineQuery: "",
  flash: null,
  dragging: null,
};
export function resetTableUI() {
  tableUI.table = null;
  tableUI.pendingView = true;
  tableUI.outlineQuery = "";
  tableUI.flash = null;
  tableUI.dragging = null;
}

export function errorText(ctx, error) {
  if (error?.it || error?.en)
    return ctx.label({ it: error.it ?? error.en, en: error.en ?? error.it });
  return error?.message ?? String(error);
}
/** One commit; a refusal (permission, offline, invalid) becomes a toast. */
export function run(ctx, label, mutator, options = {}) {
  try {
    ctx.commit(label, mutator, options);
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
const numberText = (ctx, value, digits = 1) =>
  new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
const actorName = (ctx, id) => ctx.state.actors?.[id]?.name ?? "?";

// ------------------------------------------------------------------------------ layers

const stairLabels = (ctx, sceneId) => {
  const found = stackOf(ctx.state, sceneId);
  const labels = new Map();
  if (!found) return labels;
  for (const stair of stairsOn(ctx.state, sceneId)) {
    const ups = stair.floors
      .filter((id) => id !== sceneId)
      .map((id) => found.floors.find((floor) => floor.sceneId === id))
      .filter(Boolean);
    labels.set(
      stair.id,
      ups
        .map((floor) => (floor.elevation > found.floor.elevation ? "▲ " : "▼ ") + floorName(floor))
        .join(" · "),
    );
  }
  return labels;
};

/** Below the tokens: DM off-map frame, stairs, map-layer objects. */
export function mapLayerSvg(ctx, tv) {
  const scene = tv?.scene;
  if (!scene) return "";
  const dm = ctx.role === "dm";
  const rows = D.visibleProps(ctx.state, scene.id, ctx.role).filter((row) => row.layer === "map");
  const stairs = stairsOn(ctx.state, scene.id);
  return `${dm ? hatchDefs() + offMapFrame(ctx, scene, { table: true }) : ""}<g class="sa-layer-map">${rows.map((row) => propSvg(ctx, row, { dm })).join("")}</g>${stairs.length ? `<g class="sa-layer-stairs">${stairsSvg(ctx, stairs, { labels: stairLabels(ctx, scene.id) })}</g>` : ""}`;
}
/** Above the tokens: roofs and canopies, faded while a controlled token stands under them. */
export function roofLayerSvg(ctx, tv) {
  const scene = tv?.scene;
  if (!scene || D.foregroundHidden(ctx.state, ctx.role)) return "";
  const faded = D.fadedRoofs(ctx.state, scene.id, ctx.role);
  const rows = D.visibleProps(ctx.state, scene.id, ctx.role).filter(
    (row) => row.layer === "foreground",
  );
  if (!rows.length) return "";
  return `<g class="sa-layer-roofs" data-sa-faded="${[...faded].join(" ")}">${rows.map((row) => propSvg(ctx, row, { dm: ctx.role === "dm", faded: faded.has(row.id) })).join("")}</g>`;
}
/** DM, interactive: creatures waiting off the map, dragged in; the "find" highlight. */
export function offMapLayerSvg(ctx, tv) {
  const scene = tv?.scene;
  if (!scene || ctx.role !== "dm") return "";
  const staged = D.stagedOn(ctx.state, scene.id, "dm");
  const flash = tableUI.flash && Date.now() < tableUI.flash.until ? tableUI.flash : null;
  const target = flash
    ? (D.sliceOf(ctx.state)?.props?.[scene.id] ?? []).find((row) => row.id === flash.propId)
    : null;
  return `${stagedSvg(ctx, staged, { draggable: true })}${target ? `<circle class="sa-flash" cx="${target.x}" cy="${target.y}" r="${Math.max(target.width, target.height) / 2 + 14}" fill="none" stroke="#f1d797" stroke-width="4" pointer-events="none"/>` : ""}`;
}
export function bindOffMapLayer(el, ctx, table) {
  tableUI.table = table;
  const scene = table?.scene;
  if (!scene || ctx.role !== "dm") return;
  el.querySelectorAll("[data-sa-staged]").forEach((node) => {
    const id = node.dataset.saStaged;
    const drop = (point) =>
      run(
        ctx,
        ctx.t("Creatura entrata dalla zona fuori mappa", "Creature brought in from off the map"),
        (s) => D.dropStaged(s, ctx.role, scene.id, id, point),
      );
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      run(
        ctx,
        ctx.t("Creatura entrata dalla zona fuori mappa", "Creature brought in from off the map"),
        (s) => D.bringIn(s, ctx.role, scene.id, id),
      );
    });
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      node.setPointerCapture?.(event.pointerId);
      const start = table.point(event);
      tableUI.dragging = { id, start, last: start };
      node.classList.add("is-dragging");
    });
    node.addEventListener("pointermove", (event) => {
      if (tableUI.dragging?.id !== id) return;
      event.stopPropagation();
      const p = table.point(event);
      tableUI.dragging.last = p;
      const row = D.stagedOn(ctx.state, scene.id, "dm").find((r) => r.id === id);
      if (row) node.setAttribute("transform", `translate(${p.x} ${p.y})`);
    });
    const finish = (event, cancel = false) => {
      if (tableUI.dragging?.id !== id) return;
      event.stopPropagation();
      const { start, last } = tableUI.dragging;
      tableUI.dragging = null;
      node.classList.remove("is-dragging");
      if (cancel || Math.hypot(last.x - start.x, last.y - start.y) < 4) {
        ctx.render();
        return;
      }
      if (!drop(last)) ctx.render();
    };
    node.addEventListener("pointerup", (event) => finish(event));
    node.addEventListener("pointercancel", (event) => finish(event, true));
  });
  // Owlbear Default View: on arrival at a scene the camera starts where the DM set it.
  if (tableUI.pendingView) {
    tableUI.pendingView = false;
    applyDefaultView(ctx, table, { arrival: true });
  }
}
/** Players' binding point: every viewer gets the starting view on arrival. */
export function bindMapLayer(el, ctx, table) {
  tableUI.table = table;
  if (ctx.role !== "dm" && tableUI.pendingView) {
    tableUI.pendingView = false;
    applyDefaultView(ctx, table, { arrival: true });
  }
}
export function applyDefaultView(ctx, table = tableUI.table, { arrival = false } = {}) {
  const scene = table?.scene;
  const view = scene ? D.defaultView(ctx.state, scene.id) : null;
  if (!view || !table?.setView) {
    if (!arrival)
      ctx.toast(
        ctx.t("Questa scena non ha una vista iniziale.", "This scene has no starting view."),
        true,
      );
    return false;
  }
  // On arrival it runs after the other areas' arrival moves (B14 centres on the viewer's own
  // tokens in a microtask): a starting view the DM set for this scene wins the first frame;
  // Home still recentres on one's tokens afterwards.
  if (arrival) setTimeout(() => table.setView(view), 0);
  else table.setView(view);
  return true;
}
function currentView(table) {
  const view = table?.view;
  return view ? { zoom: view.zoom, pan: { ...view.pan } } : null;
}

// ------------------------------------------------------------------------------ actions

export const actions = {
  climb(ctx, actorId, toSceneId, { follow = false, fromSceneId } = {}) {
    const name = actorName(ctx, actorId);
    const target = ctx.state.scenes.find((scene) => scene.id === toSceneId);
    const found = stackOf(ctx.state, toSceneId);
    const floor = found?.floors.find((row) => row.sceneId === toSceneId);
    const label = ctx.t(
      `${name} cambia piano: ${floorName(floor) || target?.name}`,
      `${name} changes floor: ${floorName(floor) || target?.name}`,
    );
    const done = run(ctx, label, (s) =>
      climb(s, ctx.role, { actorId, toSceneId, fromSceneId, follow: follow && ctx.role === "dm" }),
    );
    if (done && !(follow && ctx.role === "dm") && ctx.state.activeSceneId !== toSceneId)
      ctx.toast(
        ctx.role === "dm"
          ? ctx.t(
              `${name} è su «${floorName(floor)}». Il Tavolo mostra ancora questo piano.`,
              `${name} is on “${floorName(floor)}”. The Table still shows this floor.`,
            )
          : ctx.t(
              `${name} è su «${floorName(floor)}»: il DM mostra quel piano quando il gruppo ci arriva.`,
              `${name} is on “${floorName(floor)}”: the DM shows that floor when the party gets there.`,
            ),
      );
    return done;
  },
  showFloor(ctx, sceneId) {
    const found = stackOf(ctx.state, sceneId);
    const floor = found?.floors.find((row) => row.sceneId === sceneId);
    return run(
      ctx,
      ctx.t(`Al Tavolo: ${floorName(floor)}`, `At the Table: ${floorName(floor)}`),
      (s) => switchFloor(s, ctx.role, sceneId),
    );
  },
  step(ctx, delta) {
    return run(
      ctx,
      delta > 0
        ? ctx.t("Piano superiore al Tavolo", "Upper floor at the Table")
        : ctx.t("Piano inferiore al Tavolo", "Lower floor at the Table"),
      (s) => stepFloor(s, ctx.role, delta),
    );
  },
  variant(ctx, sceneId, variantId) {
    const variant = D.variantsOf(ctx.state, sceneId).list.find((row) => row.id === variantId);
    return run(
      ctx,
      ctx.t(`Aspetto della scena: ${variant?.name ?? ""}`, `Scene look: ${variant?.name ?? ""}`),
      (s) => D.switchVariant(s, ctx.role, sceneId, variantId),
    );
  },
  setDefault(ctx, table = tableUI.table) {
    const view = currentView(table);
    if (!view) return false;
    return run(ctx, ctx.t("Vista iniziale della scena impostata", "Scene starting view set"), (s) =>
      D.setDefaultView(s, ctx.role, table.scene.id, view),
    );
  },
  clearDefault(ctx, sceneId) {
    return run(ctx, ctx.t("Vista iniziale rimossa", "Starting view removed"), (s) =>
      D.clearDefaultView(s, ctx.role, sceneId),
    );
  },
  saveView(ctx, slot, table = tableUI.table) {
    const view = currentView(table);
    if (!view || !table?.scene) {
      ctx.toast(ctx.t("Apri il Tavolo.", "Open the Table."), true);
      return false;
    }
    const done = run(
      ctx,
      ctx.t(`Vista ${slot} salvata`, `View ${slot} saved`),
      (s) => D.saveView(s, ctx.role, table.scene.id, slot, view),
      { local: true, visibility: "private", undoable: false },
    );
    if (done) ctx.toast(ctx.t(`Vista ${slot} salvata per te.`, `View ${slot} saved for you.`));
    return done;
  },
  loadView(ctx, slot, table = tableUI.table) {
    if (!table?.scene || !table.setView) {
      ctx.toast(ctx.t("Apri il Tavolo.", "Open the Table."), true);
      return false;
    }
    const view = D.savedViews(ctx.state, ctx.role, table.scene.id)[slot - 1];
    if (!view) {
      ctx.toast(
        ctx.t(
          `La vista ${slot} è vuota: salvala con Maiusc+F${slot + 1}.`,
          `View ${slot} is empty: save it with Shift+F${slot + 1}.`,
        ),
        true,
      );
      return false;
    }
    table.setView(view);
    return true;
  },
  toggleRoofs(ctx) {
    const hidden = !D.foregroundHidden(ctx.state, ctx.role);
    return run(
      ctx,
      hidden
        ? ctx.t("Tetti nascosti per te", "Roofs hidden for you")
        : ctx.t("Tetti visibili per te", "Roofs shown for you"),
      (s) => D.setForegroundHidden(s, ctx.role, hidden),
      { local: true, visibility: "private", undoable: false },
    );
  },
  bringIn(ctx, sceneId, stageId) {
    return run(
      ctx,
      ctx.t("Creatura entrata dalla zona fuori mappa", "Creature brought in from off the map"),
      (s) => D.bringIn(s, ctx.role, sceneId, stageId),
    );
  },
  sendOff(ctx, sceneId, actorId) {
    return run(
      ctx,
      ctx.t(`${actorName(ctx, actorId)} fuori mappa`, `${actorName(ctx, actorId)} off the map`),
      (s) => D.sendOffMap(s, ctx.role, sceneId, actorId),
    );
  },
  showOffMap(ctx, table = tableUI.table) {
    if (!table?.setView) return false;
    table.setView({ zoom: 0.6, pan: { x: -D.OFF_MAP / 2, y: -D.OFF_MAP / 2 } });
    return true;
  },
  togglePropFlag(ctx, sceneId, propId, key) {
    const row = (D.sliceOf(ctx.state)?.props?.[sceneId] ?? []).find((r) => r.id === propId);
    if (!row) return false;
    const next = !row[key];
    const label =
      key === "hidden"
        ? next
          ? ctx.t(`${row.name}: nascosto ai giocatori`, `${row.name}: hidden from players`)
          : ctx.t(`${row.name}: visibile ai giocatori`, `${row.name}: visible to players`)
        : next
          ? ctx.t(`${row.name}: bloccato`, `${row.name}: locked`)
          : ctx.t(`${row.name}: sbloccato`, `${row.name}: unlocked`);
    return run(ctx, label, (s) => D.updateProps(s, ctx.role, sceneId, [propId], { [key]: next }));
  },
  find(ctx, sceneId, propId, table = tableUI.table) {
    const row = (D.sliceOf(ctx.state)?.props?.[sceneId] ?? []).find((r) => r.id === propId);
    if (!row || !table?.setView) return false;
    tableUI.flash = { propId, until: Date.now() + 2500 };
    const zoom = Math.max(1.5, table.view?.zoom ?? 1);
    table.setView({
      zoom,
      pan: {
        x: Math.round(row.x - table.scene.width / zoom / 2),
        y: Math.round(row.y - table.scene.height / zoom / 2),
      },
    });
    return true;
  },
};

// ------------------------------------------------------------------------------ panel

const card = (id, title, body) =>
  `<section class="sa-panel-card" aria-labelledby="${id}"><h3 id="${id}">${title}</h3>${body}</section>`;
const button = (ctx, attrs, text, cls = "") =>
  `<button type="button" class="button ${cls}" ${attrs}>${text}</button>`;

function floorsCard(ctx, scene) {
  const found = stackOf(ctx.state, scene.id);
  if (!found) return "";
  const dm = ctx.role === "dm";
  const floors = [...found.floors].reverse();
  const here = (sceneId) => tokensOnStairs(ctx.state, sceneId).map((row) => ({ ...row, sceneId }));
  // The shown floor's stairs; a player also sees their own creatures standing on a stair of
  // a floor out of view, so a token taken up can come back (the Table shows one floor).
  const onStairs = (
    dm ? here(scene.id) : found.floors.flatMap((floor) => here(floor.sceneId))
  ).filter((row) => dm || ctx.canControl(ctx.state.actors[row.actorId]));
  const stairsList = onStairs.length
    ? `<ul class="sa-list" data-sa-on-stairs>${onStairs
        .map((row) => {
          const where =
            row.sceneId === scene.id
              ? ""
              : ` (${ctx.esc(floorName(found.floors.find((f) => f.sceneId === row.sceneId)))})`;
          const attrs = (target) =>
            `data-sa-climb="${ctx.esc(row.actorId)}" data-sa-to="${ctx.esc(target.sceneId)}" data-sa-from="${ctx.esc(row.sceneId)}"`;
          return `<li><span><strong>${ctx.esc(actorName(ctx, row.actorId))}</strong> · ${ctx.esc(row.stair.name)}${where}</span><span class="sa-row-actions">${row.targets
            .map(
              (target) =>
                `${button(ctx, attrs(target), `${target.direction === "up" ? "▲ " + ctx.t("Sali a", "Go up to") : "▼ " + ctx.t("Scendi a", "Go down to")} ${ctx.esc(target.name)}`)}${dm ? button(ctx, `${attrs(target)} data-sa-follow`, ctx.t("… e mostra il piano", "… and show the floor"), "quiet") : ""}`,
            )
            .join("")}</span></li>`;
        })
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna pedina sulle scale. Porta una pedina sul cerchio della scala per salire o scendere.", "No token on the stairs. Move a token onto the stair circle to go up or down.")}</p>`;
  if (!dm) {
    const mine = Object.values(ctx.state.actors)
      .filter((actor) => actor.kind === "character" && ctx.canControl(actor))
      .map((actor) => ({ actor, floor: floorOfActor(ctx.state, actor.id) }))
      .filter((row) => row.floor);
    return card(
      "sa-floors-title",
      `${ctx.t("Piani", "Floors")} · ${ctx.esc(found.stack.name)}`,
      `<p data-sa-shown-floor>${ctx.t("Il Tavolo mostra", "The Table shows")}: <strong>${ctx.esc(floorName(found.floor))}</strong></p>${mine.length ? `<ul class="sa-list">${mine.map((row) => `<li><span>${ctx.esc(row.actor.name)}</span><span class="${row.floor.sceneId === scene.id ? "" : "sa-warn"}">${ctx.esc(floorName(row.floor))}${row.floor.sceneId === scene.id ? "" : " · " + ctx.t("non in vista", "not in view")}</span></li>`).join("")}</ul>` : ""}<h4>${ctx.t("Scale", "Stairs")}</h4>${stairsList}`,
    );
  }
  const away = partyElsewhere(ctx.state);
  return card(
    "sa-floors-title",
    `${ctx.t("Piani", "Floors")} · ${ctx.esc(found.stack.name)}`,
    `<div class="sa-floor-switch" role="group" aria-label="${ctx.t("Piano mostrato al Tavolo", "Floor shown at the Table")}">${floors
      .map((floor) => {
        const count = (floor.scene.tokens ?? []).length;
        const on = floor.sceneId === scene.id;
        return `<button type="button" class="sa-floor${on ? " active" : ""}" data-sa-floor="${ctx.esc(floor.sceneId)}" aria-pressed="${on}"><strong>${ctx.esc(floorName(floor))}</strong><span>${numberText(ctx, floor.elevation)} m · ${count} ${count === 1 ? ctx.t("pedina", "token") : ctx.t("pedine", "tokens")}</span></button>`;
      })
      .join(
        "",
      )}</div><div class="toolbar sa-floor-steps">${button(ctx, `data-sa-step="1" data-command="scene-assets.floor-up"${found.index >= found.floors.length - 1 ? ' disabled aria-describedby="sa-floor-top-why"' : ""}`, `▲ ${ctx.t("Piano sopra", "Floor above")} <kbd>${ctx.t("PagSu", "PgUp")}</kbd>`)}${button(ctx, `data-sa-step="-1" data-command="scene-assets.floor-down"${found.index <= 0 ? ' disabled aria-describedby="sa-floor-bottom-why"' : ""}`, `▼ ${ctx.t("Piano sotto", "Floor below")} <kbd>${ctx.t("PagGiù", "PgDn")}</kbd>`)}</div>${found.index >= found.floors.length - 1 ? `<small class="muted sa-why" id="sa-floor-top-why">${ctx.t("Sei già al piano più alto.", "You are already on the top floor.")}</small>` : ""}${found.index <= 0 ? `<small class="muted sa-why" id="sa-floor-bottom-why">${ctx.t("Sei già al piano più basso.", "You are already on the lowest floor.")}</small>` : ""}${away.length ? `<p class="sa-warn" role="status" data-sa-away>${ctx.t("Non in vista", "Not in view")}: ${away.map((row) => `${ctx.esc(row.name)} (${ctx.esc(floorName(row.floor))})`).join(", ")}</p>` : ""}<h4>${ctx.t("Scale", "Stairs")}</h4>${stairsList}`,
  );
}
function variantCard(ctx, scene) {
  if (ctx.role !== "dm") return "";
  const variants = D.variantsOf(ctx.state, scene.id);
  if (variants.list.length < 2) return "";
  return card(
    "sa-variant-title",
    ctx.t("Aspetto della scena", "Scene look"),
    `<div class="sa-variant-switch" role="group" aria-label="${ctx.t("Varianti della scena", "Scene variants")}">${variants.list
      .map(
        (variant) =>
          `<button type="button" class="button${variant.active ? " active" : ""}" data-sa-variant="${ctx.esc(variant.id)}" aria-pressed="${variant.active}">${ctx.esc(variant.name || ctx.t("Base", "Base"))}</button>`,
      )
      .join(
        "",
      )}</div><p class="muted">${ctx.t("Cambia solo l’immagine: muri, porte, pedine, spilli e luci restano dove sono.", "Only the image changes: walls, doors, tokens, pins and lights stay where they are.")}</p>`,
  );
}
function viewsCard(ctx, scene) {
  const dm = ctx.role === "dm";
  const def = D.defaultView(ctx.state, scene.id);
  const saved = D.savedViews(ctx.state, ctx.role, scene.id);
  const slots = saved
    .map(
      (view, i) =>
        `<li data-sa-view-slot="${i + 1}"><span>${ctx.t("Vista", "View")} ${i + 1}${view ? ` · ${numberText(ctx, view.zoom, 2)}×` : ` · <span class="muted">${ctx.t("vuota", "empty")}</span>`}</span><span class="sa-row-actions">${button(ctx, `data-sa-view-load="${i + 1}" data-command="scene-assets.view-${i + 1}" ${view ? "" : `disabled aria-describedby="sa-view-why-${i + 1}"`}`, `${ctx.t("Vai", "Go")} <kbd>F${i + 2}</kbd>`)}${button(ctx, `data-sa-view-save="${i + 1}" data-command="scene-assets.save-view-${i + 1}"`, `${ctx.t("Salva qui", "Save here")} <kbd>${ctx.t("Maiusc", "Shift")}+F${i + 2}</kbd>`, "quiet")}</span>${view ? "" : `<small class="muted sa-why" id="sa-view-why-${i + 1}">${ctx.t("Vista vuota: premi «Salva qui» per ricordare la vista attuale.", "Empty view: press “Save here” to remember the current view.")}</small>`}</li>`,
    )
    .join("");
  return card(
    "sa-views-title",
    ctx.t("Viste", "Views"),
    `<div class="toolbar">${def ? button(ctx, "data-sa-default-go", ctx.t("Vista iniziale", "Starting view")) : `<span class="muted">${ctx.t("Nessuna vista iniziale.", "No starting view.")}</span>`}${dm ? button(ctx, "data-sa-default-set", ctx.t("Imposta questa come vista iniziale", "Set this as the starting view"), "quiet") : ""}${dm && def ? button(ctx, "data-sa-default-clear", ctx.t("Rimuovi vista iniziale", "Remove starting view"), "quiet") : ""}</div><p class="muted">${ctx.t("Viste personali: le vedi solo tu.", "Personal views: only you see them.")}</p><ul class="sa-list sa-views">${slots}</ul>`,
  );
}
function roofsCard(ctx, scene) {
  const any = D.visibleProps(ctx.state, scene.id, ctx.role).some(
    (row) => row.layer === "foreground",
  );
  if (!any) return "";
  const hidden = D.foregroundHidden(ctx.state, ctx.role);
  return card(
    "sa-roofs-title",
    ctx.t("Tetti e chiome", "Roofs and canopies"),
    `<label class="sa-check"><input type="checkbox" data-sa-roofs ${hidden ? "" : "checked"}> ${ctx.t("Mostra i tetti (sfumano quando una tua pedina ci entra)", "Show roofs (they fade when your token goes under)")}</label>`,
  );
}
function offMapCard(ctx, scene) {
  if (ctx.role !== "dm") return "";
  const staged = D.stagedOn(ctx.state, scene.id, "dm");
  return card(
    "sa-offmap-title",
    `${ctx.t("Fuori mappa", "Off the map")} (${staged.length})`,
    `${staged.length ? `<ul class="sa-list">${staged.map((row) => `<li><span>${ctx.esc(actorName(ctx, row.actorId))}</span>${button(ctx, `data-sa-bring="${ctx.esc(row.id)}"`, ctx.t("Porta in mappa", "Bring onto the map"))}</li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna creatura in attesa. Dal menu di una pedina: «Metti fuori mappa».", "No creature waiting. From a token’s menu: “Move off the map”.")}</p>`}<div class="toolbar">${button(ctx, "data-sa-show-offmap", ctx.t("Mostra l’area fuori mappa", "Show the off-map area"), "quiet")}</div><p class="muted">${ctx.t("Solo tu vedi l’area fuori dai bordi: trascina una creatura sulla mappa per farla entrare.", "Only you see the area outside the edges: drag a creature onto the map to bring it in.")}</p>`,
  );
}
function outlinerCard(ctx, scene) {
  if (ctx.role !== "dm") return "";
  const groups = D.outline(ctx.state, scene.id, "dm", tableUI.outlineQuery);
  const all = D.visibleProps(ctx.state, scene.id, "dm");
  if (!all.length) return "";
  const rows = (list) =>
    list
      .map(
        (row) =>
          `<li data-sa-outline-row="${ctx.esc(row.id)}"><button type="button" class="sa-link" data-sa-find="${ctx.esc(row.id)}">${ctx.esc(row.name)}</button><span class="sa-row-actions"><button type="button" class="sa-icon-toggle" data-sa-flag="hidden" data-sa-prop-id="${ctx.esc(row.id)}" aria-pressed="${!row.hidden}" aria-label="${ctx.esc(ctx.t(`Visibile ai giocatori: ${row.name}`, `Visible to players: ${row.name}`))}" title="${ctx.t("Visibile ai giocatori", "Visible to players")}">${ctx.icon("eye")}</button><button type="button" class="sa-icon-toggle" data-sa-flag="locked" data-sa-prop-id="${ctx.esc(row.id)}" aria-pressed="${row.locked}" aria-label="${ctx.esc(ctx.t(`Bloccato: ${row.name}`, `Locked: ${row.name}`))}" title="${ctx.t("Bloccato", "Locked")}">${ctx.icon("shield")}</button></span></li>`,
      )
      .join("");
  const group = (title, list) =>
    list.length
      ? `<h4>${title} (${list.length})</h4><ul class="sa-list sa-outline">${rows(list)}</ul>`
      : "";
  return card(
    "sa-outline-title",
    ctx.t("Oggetti della scena", "Scene objects"),
    `<label class="field">${ctx.t("Trova", "Find")}<input type="search" data-sa-outline-search value="${ctx.esc(tableUI.outlineQuery)}" placeholder="${ctx.t("nome o etichetta, es. albero", "name or tag, e.g. tree")}"></label>${group(ctx.t("Primo piano", "Foreground"), groups.foreground)}${group(ctx.t("Mappa", "Map"), groups.map)}${group(ctx.t("Fuori mappa", "Off the map"), groups.offMap)}${groups.count ? "" : `<p class="muted">${ctx.t("Nessun oggetto corrisponde.", "No object matches.")}</p>`}${button(ctx, "data-sa-edit-prep", ctx.t("Modifica in Preparazione", "Edit in Preparation"), "quiet")}`,
  );
}
export function renderPanel(ctx, tv) {
  const scene = tv?.scene;
  if (!scene) return "";
  return `<div class="sa-panel" data-sa-panel>${floorsCard(ctx, scene)}${variantCard(ctx, scene)}${viewsCard(ctx, scene)}${roofsCard(ctx, scene)}${offMapCard(ctx, scene)}${outlinerCard(ctx, scene)}</div>`;
}
export function bindPanel(el, ctx, table) {
  tableUI.table = table ?? tableUI.table;
  const scene = table?.scene ?? ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  if (!scene) return;
  const on = (selector, handler) =>
    el
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener("click", (event) => handler(node.dataset, event)));
  on("[data-sa-climb]", (data) =>
    actions.climb(ctx, data.saClimb, data.saTo, {
      follow: "saFollow" in data,
      fromSceneId: data.saFrom || scene.id,
    }),
  );
  on("[data-sa-floor]", (data) => {
    if (data.saFloor !== ctx.state.activeSceneId) actions.showFloor(ctx, data.saFloor);
  });
  on("[data-sa-step]", (data) => actions.step(ctx, Number(data.saStep)));
  on("[data-sa-variant]", (data) => actions.variant(ctx, scene.id, data.saVariant));
  on("[data-sa-default-go]", () => applyDefaultView(ctx, tableUI.table));
  on("[data-sa-default-set]", () => actions.setDefault(ctx, tableUI.table));
  on("[data-sa-default-clear]", () => actions.clearDefault(ctx, scene.id));
  on("[data-sa-view-load]", (data) =>
    actions.loadView(ctx, Number(data.saViewLoad), tableUI.table),
  );
  on("[data-sa-view-save]", (data) =>
    actions.saveView(ctx, Number(data.saViewSave), tableUI.table),
  );
  on("[data-sa-bring]", (data) => actions.bringIn(ctx, scene.id, data.saBring));
  on("[data-sa-show-offmap]", () => actions.showOffMap(ctx, tableUI.table));
  on("[data-sa-flag]", (data) => actions.togglePropFlag(ctx, scene.id, data.saPropId, data.saFlag));
  on("[data-sa-find]", (data) => actions.find(ctx, scene.id, data.saFind, tableUI.table));
  on("[data-sa-edit-prep]", () => ctx.navigate("preparation", { id: scene.id, tab: "objects" }));
  el.querySelector("[data-sa-roofs]")?.addEventListener("change", () => actions.toggleRoofs(ctx));
  const search = el.querySelector("[data-sa-outline-search]");
  search?.addEventListener("input", () => {
    tableUI.outlineQuery = search.value;
    const at = search.selectionStart;
    ctx.render();
    const next = globalThis.document?.querySelector("[data-sa-outline-search]");
    next?.focus();
    next?.setSelectionRange?.(at, at);
  });
}

// ------------------------------------------------------------------------------ token menu

export function stairsMenuTargets(ctx, target) {
  const sceneId = target?.sceneId ?? ctx.state.activeSceneId;
  return tokensOnStairs(ctx.state, sceneId).filter(
    (row) =>
      row.actorId === target?.actorId &&
      (ctx.role === "dm" || ctx.canControl(ctx.state.actors[row.actorId])),
  );
}
/**
 * Token menu: "Go up / down the stairs…" — a dialog with the floors the stair reaches (the
 * DM also chooses whether the Table follows).
 */
export function openClimb(ctx, target) {
  const sceneId = target?.sceneId ?? ctx.state.activeSceneId;
  const rows = stairsMenuTargets(ctx, target);
  const targets = rows.flatMap((row) => row.targets);
  if (!targets.length) return;
  const name = actorName(ctx, target.actorId);
  const options = targets
    .map(
      (t, i) =>
        `<label class="sa-check"><input type="radio" name="to" value="${ctx.esc(t.sceneId)}" ${i ? "" : "checked"}> ${t.direction === "up" ? "▲" : "▼"} ${ctx.esc(t.name)}</label>`,
    )
    .join("");
  ctx.dialog(
    ctx.t(`${name}: scale`, `${name}: stairs`),
    `<fieldset class="sa-choices"><legend>${ctx.t("Verso quale piano?", "To which floor?")}</legend>${options}</fieldset>${ctx.role === "dm" ? `<label class="sa-check"><input type="checkbox" name="follow" checked> ${ctx.t("Mostra quel piano al Tavolo (anche al gruppo)", "Show that floor at the Table (to the party too)")}</label>` : `<p class="muted">${ctx.t("Il Tavolo mostra un piano alla volta: il DM sposta la vista del gruppo.", "The Table shows one floor at a time: the DM moves the party’s view.")}</p>`}`,
    {
      submitLabel: ctx.t("Cambia piano", "Change floor"),
      onSubmit: (data) => {
        const to = String(data.get("to") || "");
        const found = stackOf(ctx.state, to);
        const floor = found?.floors.find((row) => row.sceneId === to);
        ctx.commit(
          ctx.t(
            `${name} cambia piano: ${floorName(floor)}`,
            `${name} changes floor: ${floorName(floor)}`,
          ),
          (s) =>
            climb(s, ctx.role, {
              actorId: target.actorId,
              fromSceneId: sceneId,
              toSceneId: to,
              follow: ctx.role === "dm" && data.get("follow") === "on",
            }),
        );
      },
    },
  );
}
export const L_MENU = {
  climb: L("Scale: sali o scendi…", "Stairs: go up or down…"),
  offMap: L("Metti fuori mappa", "Move off the map"),
};
export const stickerLabel = (ctx, row) =>
  row.sticker ? ctx.label(stickerById(row.sticker)?.name ?? row.name) : row.name;
export { metersText };
