import { validateSceneGeometry } from "./spatial.mjs";
import { formatNumber } from "./ui.mjs";
import { BARRIER_TYPES, barrierType } from "./fog-vision-domain.mjs";

const clone = (value) => structuredClone(value);
const uid = () => crypto.randomUUID();
const source = () => ({
  kind: "authored-demo",
  revision: "spatial-" + uid(),
  title: "Explicit scene geometry",
});
const tools = [
  ["tokens", "Pedine", "Tokens"],
  ["select", "Seleziona", "Select"],
  ["wall", "Muro", "Wall"],
  ["door", "Porta", "Door"],
  ["difficult", "Terreno difficile", "Difficult terrain"],
  ["scale", "Calibra scala", "Calibrate scale"],
];
export const createSpatialDraft = () => ({
  tool: "tokens",
  wallType: "wall",
  selectedId: null,
  anchor: null,
  cursor: null,
  calibration: null,
  undo: [],
});
// PR-22 (Foundry's wall restrictions in the walls panel): the barrier kinds of the Table's
// vision tools, chosen where walls are drawn. Flags come from fog-vision-domain.
const barrierFlags = (type) => BARRIER_TYPES.find(([id]) => id === type)?.[2] ?? null;
export function wallTypeFlags(type) {
  const flags = barrierFlags(type) ?? barrierFlags("wall");
  return type === "one-way" ? { ...flags, blockSide: "right" } : { ...flags };
}
// PR-20 (BG3/DOS2 locks): a door's lock has a DC, the check that opens it, a key that opens
// it without a roll, and the action it costs (SRD 5.2.1: Thieves' Tools, Utilize action).
export const LOCK_CHECKS = Object.freeze([
  ["both", "Scasso o Forza", "Lockpicking or Strength"],
  ["lockpick", "Scasso (Arnesi da scasso, Destrezza)", "Lockpicking (Thieves’ Tools, Dexterity)"],
  ["force", "Forza (Atletica)", "Strength (Athletics)"],
]);
export const LOCK_COSTS = Object.freeze([
  ["action", "Un’azione (Utilizzare)", "An action (Utilize)"],
  ["bonus", "Un’azione bonus", "A bonus action"],
  ["free", "Nessuna azione", "No action"],
]);
/** A clean lock from the form, or null when the door has neither DC nor key. */
export function cleanLock(input = {}) {
  const dc = String(input.dc ?? "").trim() === "" ? null : Math.round(Number(input.dc));
  const key = String(input.key ?? "")
    .trim()
    .slice(0, 80);
  if (dc === null && !key) return null;
  if (dc !== null && !(dc >= 5 && dc <= 30))
    throw Object.assign(new Error("lock-dc"), {
      it: "La CD della serratura va da 5 a 30.",
      en: "The lock DC must be between 5 and 30.",
    });
  return {
    dc,
    check: LOCK_CHECKS.some(([id]) => id === input.check) ? input.check : "both",
    key,
    cost: LOCK_COSTS.some(([id]) => id === input.cost) ? input.cost : "action",
  };
}
/**
 * PR-21 (Foundry wall chaining): places one wall or door segment. A click-placed wall
 * continues from its end (the next click adds the next piece) until Escape, a double-click
 * or a click on the same point; a dragged segment stands alone unless Ctrl/Cmd is held,
 * which also chains doors. The tool stays selected, as in Foundry.
 */
export function placeSegment(scene, ui, a, b, { drag = false, ctrl = false } = {}) {
  if (Math.hypot(b.x - a.x, b.y - a.y) < 3) {
    // The same point again ends a chain; on a first point it only keeps that point.
    if (ui.chainTool) {
      ui.anchor = null;
      ui.cursor = null;
      ui.chainTool = null;
    }
    return null;
  }
  const flags = ui.tool === "wall" ? wallTypeFlags(ui.wallType) : {};
  const shape = addSpatialShape(scene, ui, ui.tool, a, b, uid(), flags);
  const chain = (ui.tool === "wall" && !drag) || (ctrl && ["wall", "door"].includes(ui.tool));
  ui.anchor = chain ? { x: b.x, y: b.y } : null;
  ui.cursor = ui.anchor;
  ui.chainTool = chain ? ui.tool : null;
  return shape;
}
/** A chain belongs to the tool that drew it: another tool starts from a fresh point. */
export function dropForeignChain(ui) {
  if (ui.chainTool && ui.chainTool !== ui.tool) {
    ui.anchor = null;
    ui.cursor = null;
    ui.chainTool = null;
  }
}
function checked(scene) {
  const errors = validateSceneGeometry(scene);
  if (errors.length) throw Object.assign(new Error(errors[0].en), errors[0]);
}
function remember(scene, ui, keys) {
  ui.undo.push(Object.fromEntries(keys.map((key) => [key, clone(scene[key] ?? [])])));
  if (ui.undo.length > 50) ui.undo.shift();
}
function commitShapes(scene, ui, key, next) {
  checked({ ...scene, [key]: next });
  remember(scene, ui, [key]);
  scene[key] = next;
}
export function addSpatialShape(scene, ui, kind, a, b, id = uid(), flags = {}) {
  const shape =
    kind === "difficult"
      ? {
          id,
          kind,
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
          source: source(),
        }
      : {
          id,
          a: { x: a.x, y: a.y },
          b: { x: b.x, y: b.y },
          kind,
          blocksMovement: true,
          blocksSight: true,
          blocksEffect: true,
          secret: false,
          ...(kind === "door"
            ? { doorState: "closed", playerOperable: true, interactionRangeMeters: 1.5 }
            : flags),
          source: source(),
        };
  const key = kind === "difficult" ? "terrain" : "walls";
  commitShapes(scene, ui, key, [...(scene[key] || []), shape]);
  ui.selectedId = id;
  return shape;
}
export function updateSpatialShape(scene, ui, id, patch) {
  const key = (scene.walls || []).some((item) => item.id === id) ? "walls" : "terrain";
  if (!(scene[key] || []).some((item) => item.id === id)) throw Error("Choose an existing shape");
  const next = (scene[key] || []).map((item) =>
    item.id === id ? { ...clone(patch), id, source: source() } : item,
  );
  commitShapes(scene, ui, key, next);
}
export function deleteSpatialShape(scene, ui, id) {
  const key = (scene.walls || []).some((item) => item.id === id) ? "walls" : "terrain";
  if (!(scene[key] || []).some((item) => item.id === id)) return;
  commitShapes(
    scene,
    ui,
    key,
    scene[key].filter((item) => item.id !== id),
  );
  ui.selectedId = null;
}
export function undoSpatialDraft(scene, ui) {
  const previous = ui.undo.at(-1);
  if (!previous) return;
  checked({ ...scene, ...previous });
  ui.undo.pop();
  Object.assign(scene, clone(previous));
  ui.selectedId = null;
  ui.anchor = null;
  ui.calibration = null;
}
export function calibrateSceneScale(scene, a, b, knownMeters, cellMeters) {
  if (
    !a ||
    !b ||
    ![a.x, a.y, b.x, b.y, knownMeters, cellMeters].every(Number.isFinite) ||
    knownMeters <= 0 ||
    cellMeters < 0.1 ||
    cellMeters > 100
  )
    throw Error("Enter a positive known distance and meters per cell");
  if ([a, b].some((p) => p.x < 0 || p.y < 0 || p.x > scene.width || p.y > scene.height))
    throw Error("Choose two points inside the map");
  const pixels = Math.hypot(b.x - a.x, b.y - a.y),
    gridSize = (pixels / knownMeters) * cellMeters;
  if (pixels < 1 || gridSize < 10 || gridSize > 300)
    throw Error(
      "The proposed cell must measure between 10 and 300 pixels; adjust the distance or cell size",
    );
  return { gridSize, metersPerCell: cellMeters, pixels, knownMeters, a: clone(a), b: clone(b) };
}
export function applyScaleCalibration(scene, ui, proposal) {
  const fresh = calibrateSceneScale(
    scene,
    proposal.a,
    proposal.b,
    proposal.knownMeters,
    proposal.metersPerCell,
  );
  remember(scene, ui, ["gridSize", "metersPerCell"]);
  scene.gridSize = fresh.gridSize;
  scene.metersPerCell = fresh.metersPerCell;
  ui.calibration = null;
  ui.anchor = null;
  ui.tool = "select";
}
export function spatialPreviewScene(scene, ui) {
  if (!ui?.calibration) return scene;
  try {
    const c = ui.calibration;
    return {
      ...scene,
      gridVisible: true,
      ...calibrateSceneScale(scene, c.a, c.b, Number(c.knownMeters), Number(c.cellMeters)),
    };
  } catch {
    return { ...scene, gridVisible: true };
  }
}
export function renderSpatialOverlay(
  scene,
  ctx,
  { players = false, editable = false, selectedId = null } = {},
) {
  const { esc, t } = ctx;
  const handle = (p, id, end) =>
    `<g class="spatial-endpoint" data-spatial-end="${end}" data-spatial-id="${esc(id)}"><circle class="spatial-endpoint-hit" cx="${p.x}" cy="${p.y}" r="8"/><circle class="spatial-endpoint-visible" cx="${p.x}" cy="${p.y}" r="8"/></g>`;
  return `<g class="spatial-overlay">${(scene.terrain || []).map((shape) => `<rect class="spatial-terrain ${selectedId === shape.id ? "selected" : ""}" ${editable ? `data-spatial-id="${esc(shape.id)}"` : ""} x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"><title>${t("Terreno difficile", "Difficult terrain")}</title></rect>`).join("")}${(
    scene.walls || []
  )
    .filter((w) => !players || !w.secret)
    // B35 (additive): data-spatial-wall names the wall, so a view projection can hide an
    // invisible barrier from players (fog-vision.mjs). It carries no behaviour.
    .map(
      (w) =>
        `<g data-spatial-wall="${esc(w.id)}" ${editable ? `data-spatial-id="${esc(w.id)}"` : ""} class="spatial-shape ${w.kind} ${w.doorState || ""} ${w.secret ? "secret" : ""} ${selectedId === w.id ? "selected" : ""}"><title>${w.kind === "door" ? t("Porta", "Door") : t("Muro", "Wall")}${w.secret ? " · " + t("Segreto", "Secret") : ""}</title><line class="spatial-hit" x1="${w.a.x}" y1="${w.a.y}" x2="${w.b.x}" y2="${w.b.y}"/><line x1="${w.a.x}" y1="${w.a.y}" x2="${w.b.x}" y2="${w.b.y}"/>${w.kind === "door" ? `<circle cx="${(w.a.x + w.b.x) / 2}" cy="${(w.a.y + w.b.y) / 2}" r="7"/>` : ""}${editable && selectedId === w.id ? handle(w.a, w.id, "a") + handle(w.b, w.id, "b") : ""}</g>`,
    )
    .join("")}</g>`;
}
export function renderSpatialGesture(ui, ctx) {
  const a = ui.calibration?.a || ui.anchor,
    b = ui.calibration?.b || ui.cursor;
  if (!a) return "";
  return `<g class="spatial-gesture" pointer-events="none"><circle cx="${a.x}" cy="${a.y}" r="6"/>${b ? (ui.tool === "difficult" ? `<rect x="${Math.min(a.x, b.x)}" y="${Math.min(a.y, b.y)}" width="${Math.abs(a.x - b.x)}" height="${Math.abs(a.y - b.y)}"/>` : `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><circle cx="${b.x}" cy="${b.y}" r="6"/>`) : ""}</g>`;
}
export function renderSpatialToolbar(ui, ctx) {
  const type = ui.wallType ?? "wall";
  const kinds =
    ui.tool === "wall"
      ? `<label class="field spatial-wall-type">${ctx.t("Tipo di muro", "Wall type")}<select data-spatial-wall-type>${BARRIER_TYPES.map(([id, label]) => `<option value="${id}" ${id === type ? "selected" : ""}>${ctx.esc(ctx.label(label))}</option>`).join("")}</select><small class="muted">${ctx.esc(ctx.label(BARRIER_TYPES.find(([id]) => id === type)?.[3] ?? ""))}</small></label>`
      : "";
  const hint =
    ui.tool === "tokens"
      ? ctx.t("Seleziona o sposta una pedina nella bozza.", "Select or move a token in the draft.")
      : ui.tool === "select"
        ? ctx.t(
            "Seleziona una geometria sulla mappa o nell’elenco. Trascina un estremo per modificarla.",
            "Select geometry on the map or in the list. Drag an endpoint to adjust it.",
          )
        : ui.tool === "wall" && ui.anchor && ui.chainTool
          ? ctx.t(
              "Muro a catena: ogni clic aggiunge un tratto dal punto precedente. Doppio clic, Esc o un clic sullo stesso punto per finire.",
              "Wall chain: each click adds a piece from the previous point. Double-click, Escape or a click on the same point to finish.",
            )
          : ui.anchor
            ? ctx.t(
                "Scegli il secondo punto. Esc annulla il gesto; Ctrl+clic continua dal punto.",
                "Choose the second point. Escape cancels the gesture; Ctrl+click continues from it.",
              )
            : ui.tool === "wall"
              ? ctx.t(
                  "Clic dopo clic per una catena di muri (trascina per un tratto solo). Frecce muovono il mirino, Invio fissa ogni punto.",
                  "Click after click for a chain of walls (drag for a single piece). Arrow keys move the cursor; Enter sets each point.",
                )
              : ctx.t(
                  "Indica due punti con clic o trascina. Frecce muovono il mirino, Invio fissa ogni punto.",
                  "Click two points or drag. Arrow keys move the cursor; Enter sets each point.",
                );
  return `<div class="spatial-toolbar" role="group" aria-label="${ctx.t("Strumenti della mappa", "Map tools")}">${tools.map(([id, it, en]) => `<button type="button" class="button ${ui.tool === id ? "active" : ""}" aria-pressed="${ui.tool === id}" data-spatial-tool="${id}">${ctx.t(it, en)}</button>`).join("")}</div>${kinds}<p class="spatial-hint" role="status">${hint}</p>`;
}
function input(ctx, name, label, value, extra = "") {
  return `<label class="field">${label}<input name="${name}" type="number" step="any" value="${ctx.esc(value)}" ${extra}></label>`;
}
function check(ctx, name, label, value) {
  return `<label class="prep-check"><input name="${name}" type="checkbox" ${value ? "checked" : ""}> ${label}</label>`;
}
function barrierFields(ctx, wall) {
  const { t, esc } = ctx;
  const type = barrierType(wall);
  const desc = BARRIER_TYPES.find(([id]) => id === type)?.[3];
  return `<label class="field">${t("Tipo di barriera", "Barrier type")}<select name="barrierType" data-spatial-barrier>${BARRIER_TYPES.map(([id, label]) => `<option value="${id}" ${id === type ? "selected" : ""}>${esc(ctx.label(label))}</option>`).join("")}<option value="custom" ${type === "custom" ? "selected" : ""}>${t("Su misura (caselle qui sotto)", "Custom (boxes below)")}</option></select></label>${desc ? `<p class="muted spatial-barrier-desc">${esc(ctx.label(desc))}</p>` : ""}${type === "one-way" ? `<label class="field">${t("Lato che blocca la vista", "Side that blocks sight")}<select name="blockSide"><option value="right" ${wall.blockSide !== "left" ? "selected" : ""}>${t("Destra (dall’inizio verso la fine)", "Right (from start to end)")}</option><option value="left" ${wall.blockSide === "left" ? "selected" : ""}>${t("Sinistra", "Left")}</option></select></label>` : ""}${type === "proximity" ? `<label class="field">${t("Vede attraverso chi è entro (m)", "Seen through from within (m)")}<input name="proximityMeters" type="number" min="0.5" max="120" step="0.5" inputmode="decimal" value="${esc(wall.proximityMeters ?? 3)}"></label>` : ""}`;
}
function lockFields(ctx, door) {
  const { t, esc } = ctx;
  const lock = door.lock ?? {};
  const option = (list, value) =>
    list
      .map(
        ([id, it, en]) =>
          `<option value="${id}" ${id === value ? "selected" : ""}>${t(it, en)}</option>`,
      )
      .join("");
  return `<fieldset class="spatial-lock"><legend>${t("Serratura", "Lock")}</legend><p class="muted">${t("Con lo stato «Bloccata», i giocatori vedono la CD e provano ad aprirla dal pannello Creatura; chi ha la chiave apre senza tiro.", "With the “Locked” state, players see the DC and try to open it from the Creature panel; whoever holds the key opens it without a roll.")}</p><div class="form-grid">${input(ctx, "lockDc", t("CD della serratura", "Lock DC"), lock.dc ?? "", 'min="5" max="30" step="1" placeholder="15"')}<label class="field">${t("Prova per aprirla", "Check to open it")}<select name="lockCheck">${option(LOCK_CHECKS, lock.check ?? "both")}</select></label><label class="field">${t("Chiave che la apre (oggetto)", "Key that opens it (item)")}<input name="lockKey" maxlength="80" value="${esc(lock.key ?? "")}" placeholder="${t("es. Chiave di ferro", "e.g. Iron key")}"></label><label class="field">${t("Costo del tentativo", "Cost of an attempt")}<select name="lockCost">${option(LOCK_COSTS, lock.cost ?? "action")}</select></label></div></fieldset>`;
}
export function renderSpatialProperties(scene, ui, ctx) {
  const { t, esc } = ctx,
    selected = [...(scene.walls || []), ...(scene.terrain || [])].find(
      (s) => s.id === ui.selectedId,
    );
  const c = ui.calibration;
  let calibration = "";
  if (c) {
    let proposal, error;
    try {
      proposal = calibrateSceneScale(scene, c.a, c.b, Number(c.knownMeters), Number(c.cellMeters));
    } catch (e) {
      error = true;
    }
    calibration = `<form class="spatial-calibration" data-spatial-calibration><h3>${t("Anteprima della scala", "Scale preview")}</h3><p>${t("Il segmento misura", "The segment measures")} ${formatNumber(ctx.lang, Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y))} px. ${t("Inserisci la distanza reale nota. La griglia mostra la proposta; la bozza resta invariata finché non applichi.", "Enter its known real distance. The grid previews the proposal; the draft stays unchanged until you apply it.")}</p><div class="form-grid">${input(ctx, "knownMeters", t("Distanza nota (m)", "Known distance (m)"), c.knownMeters, 'min="0.01" required')}${input(ctx, "cellMeters", t("Metri per cella", "Meters per cell"), c.cellMeters, 'min="0.1" max="100" required')}</div><p data-spatial-scale-output id="spatial-scale-output">${proposal ? t("Proposta: ", "Proposal: ") + formatNumber(ctx.lang, proposal.gridSize, 2) + t(" pixel per cella. Le pedine e i muri restano nella posizione attuale.", " pixels per cell. Tokens and walls keep their current positions.") : t("Indica misure positive che producano una cella fra 10 e 300 pixel.", "Enter positive measurements producing a cell between 10 and 300 pixels.")}</p><div class="toolbar"><button class="button primary" type="submit" aria-describedby="spatial-scale-output" ${error ? "disabled" : ""}>${t("Applica scala alla bozza", "Apply scale to draft")}</button><button class="button" type="button" data-spatial-cancel>${t("Annulla calibrazione", "Cancel calibration")}</button></div></form>`;
  }
  const name = (s) =>
    s.kind === "difficult"
      ? t("Terreno difficile", "Difficult terrain")
      : s.kind === "door"
        ? t("Porta", "Door")
        : barrierType(s) === "custom"
          ? t("Muro su misura", "Custom wall")
          : ctx.label(
              BARRIER_TYPES.find(([id]) => id === barrierType(s))?.[1] ?? t("Muro", "Wall"),
            );
  return `<section class="spatial-properties" aria-label="${t("Geometrie della scena", "Scene geometry")}">${calibration}${
    selected
      ? `<form data-spatial-properties><h3>${name(selected)}</h3><div class="form-grid">${selected.kind === "difficult" ? input(ctx, "x", "X", selected.x) + input(ctx, "y", "Y", selected.y) + input(ctx, "width", t("Larghezza (px)", "Width (px)"), selected.width) + input(ctx, "height", t("Altezza (px)", "Height (px)"), selected.height) : input(ctx, "ax", t("Inizio X", "Start X"), selected.a.x) + input(ctx, "ay", t("Inizio Y", "Start Y"), selected.a.y) + input(ctx, "bx", t("Fine X", "End X"), selected.b.x) + input(ctx, "by", t("Fine Y", "End Y"), selected.b.y)}</div>${selected.kind === "wall" ? barrierFields(ctx, selected) : ""}${selected.kind !== "difficult" ? `<details class="spatial-rules" ${selected.kind === "wall" && barrierType(selected) !== "custom" ? "" : "open"}><summary>${t("Regole su misura", "Custom rules")}</summary>${check(ctx, "blocksMovement", t("Blocca movimento", "Blocks movement"), selected.blocksMovement) + check(ctx, "blocksSight", t("Blocca vista", "Blocks sight"), selected.blocksSight) + check(ctx, "blocksEffect", t("Blocca linea d’effetto (attacchi e magie)", "Blocks line of effect (attacks and spells)"), selected.blocksEffect)}</details>${check(ctx, "secret", t("Geometria segreta · solo DM", "Secret geometry · DM only"), selected.secret)}` : `<p>${t("Costo di movimento doppio nell’area. Le sovrapposizioni non lo moltiplicano ancora.", "Double movement cost within this area. Overlaps do not multiply it again.")}</p>`}${
          selected.kind === "door"
            ? `<label class="field">${t("Stato della porta", "Door state")}<select name="doorState">${[
                ["closed", "Chiusa", "Closed"],
                ["open", "Aperta", "Open"],
                ["locked", "Bloccata", "Locked"],
              ]
                .map(
                  ([value, it, en]) =>
                    `<option value="${value}" ${selected.doorState === value ? "selected" : ""}>${t(it, en)}</option>`,
                )
                .join(
                  "",
                )}</select></label>${check(ctx, "playerOperable", t("Il giocatore può aprire o chiudere una porta non bloccata", "Player may open or close an unlocked door"), selected.playerOperable)}${input(ctx, "interactionRangeMeters", t("Distanza di interazione (m)", "Interaction distance (m)"), selected.interactionRangeMeters, 'min="0.01" required')}${lockFields(ctx, selected)}`
            : ""
        }<div class="toolbar"><button class="button" type="submit">${t("Applica proprietà", "Apply properties")}</button><button class="button danger" type="button" data-spatial-delete="${esc(selected.id)}">${t("Elimina geometria", "Delete geometry")}</button></div></form>`
      : ""
  }<div class="toolbar"><button class="button quiet" type="button" data-spatial-undo ${ui.undo.length ? "" : 'disabled aria-describedby="spatial-undo-why"'}>${t("Annulla ultima modifica geometrica", "Undo last geometry edit")}</button>${ui.undo.length ? "" : `<span class="visually-hidden" id="spatial-undo-why">${t("Nessuna modifica geometrica da annullare in questa bozza.", "No geometry edit to undo in this draft.")}</span>`}${ui.anchor ? `<button class="button quiet" data-spatial-cancel>${t("Annulla gesto", "Cancel gesture")}</button>` : ""}</div><details ${selected ? "" : ""}><summary>${t("Geometrie disegnate", "Drawn geometry")} (${(scene.walls || []).length + (scene.terrain || []).length})</summary><div class="spatial-list">${[...(scene.walls || []), ...(scene.terrain || [])].map((s, i) => `<button type="button" class="button ${s.id === ui.selectedId ? "active" : ""}" data-spatial-select="${esc(s.id)}">${name(s)} ${i + 1}${s.lock?.dc ? ` · ${t("CD", "DC")} ${s.lock.dc}` : ""}${s.secret ? " · " + t("segreto", "secret") : ""}</button>`).join("") || `<p class="muted">${t("Usa Muro, Porta o Terreno difficile sopra la mappa. Le linee dell’illustrazione non bloccano automaticamente.", "Use Wall, Door or Difficult terrain above the map. Artwork lines do not automatically block movement.")}</p>`}</div></details></section>`;
}

export function bindSpatialEditor(root, ctx, { scene, ui, capture, redraw, render, onTool }) {
  if (ctx.role !== "dm") return;
  const safe = (fn) => {
    try {
      fn();
    } catch (error) {
      ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
    }
  };
  const cancel = () => {
    ui.anchor = null;
    ui.cursor = null;
    ui.calibration = null;
  };
  root.querySelectorAll("[data-spatial-tool]").forEach(
    (button) =>
      (button.onclick = () => {
        capture();
        cancel();
        ui.tool = button.dataset.spatialTool;
        ui.selectedId = null;
        onTool(ui.tool);
        render();
        root.ownerDocument.querySelector("[data-prep-interactive]")?.focus();
      }),
  );
  root.querySelectorAll("[data-spatial-select]").forEach(
    (button) =>
      (button.onclick = () => {
        capture();
        cancel();
        ui.tool = "select";
        ui.selectedId = button.dataset.spatialSelect;
        onTool("select");
        render();
      }),
  );
  root.querySelectorAll("[data-spatial-cancel]").forEach(
    (button) =>
      (button.onclick = () => {
        cancel();
        render();
      }),
  );
  root.querySelector("[data-spatial-undo]")?.addEventListener("click", () =>
    safe(() => {
      capture();
      undoSpatialDraft(scene, ui);
      render();
    }),
  );
  root.querySelector("[data-spatial-delete]")?.addEventListener("click", (event) =>
    safe(() => {
      capture();
      deleteSpatialShape(scene, ui, event.currentTarget.dataset.spatialDelete);
      render();
    }),
  );
  root.querySelector("[data-spatial-properties]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    safe(() => {
      capture();
      const form = new FormData(event.currentTarget),
        n = (key) => (String(form.get(key) ?? "").trim() === "" ? NaN : Number(form.get(key)));
      const current = [...(scene.walls || []), ...(scene.terrain || [])].find(
        (s) => s.id === ui.selectedId,
      );
      if (!current) return;
      const patch =
        current.kind === "difficult"
          ? { ...current, x: n("x"), y: n("y"), width: n("width"), height: n("height") }
          : {
              ...current,
              a: { x: n("ax"), y: n("ay") },
              b: { x: n("bx"), y: n("by") },
              blocksMovement: form.has("blocksMovement"),
              blocksSight: form.has("blocksSight"),
              blocksEffect: form.has("blocksEffect"),
              secret: form.has("secret"),
              ...(current.kind === "door"
                ? {
                    doorState: form.get("doorState"),
                    playerOperable: form.has("playerOperable"),
                    interactionRangeMeters: n("interactionRangeMeters"),
                  }
                : {}),
            };
      // A named barrier type sets its own flags; «Su misura» keeps the boxes.
      const type = form.get("barrierType");
      if (current.kind === "wall" && type && type !== "custom") {
        Object.assign(patch, barrierFlags(type));
        if (type === "one-way")
          patch.blockSide = form.get("blockSide") === "left" ? "left" : "right";
        else delete patch.blockSide;
        // PR-22: a restricted type keeps its distance; the others drop the restriction.
        if (type === "proximity") {
          const meters = Number(form.get("proximityMeters"));
          patch.proximityMeters =
            Number.isFinite(meters) && meters >= 0.5 && meters <= 120
              ? meters
              : (current.proximityMeters ?? 3);
        } else delete patch.proximityMeters;
        if (!barrierFlags(type)?.sightMode) delete patch.sightMode;
      } else if (current.kind === "wall" && type === "custom") {
        delete patch.sightMode;
        delete patch.proximityMeters;
      }
      if (current.kind === "door") {
        const lock = cleanLock({
          dc: form.get("lockDc"),
          check: form.get("lockCheck"),
          key: form.get("lockKey"),
          cost: form.get("lockCost"),
        });
        if (lock) patch.lock = lock;
        else delete patch.lock;
      }
      updateSpatialShape(scene, ui, current.id, patch);
      render();
    });
  });
  root.querySelector("[data-spatial-wall-type]")?.addEventListener("change", (event) => {
    ui.wallType = event.target.value;
    render();
  });
  root.querySelector("[data-spatial-barrier]")?.addEventListener("change", (event) => {
    // Apply at once, like Foundry's wall config: the type is the wall's main property.
    event.currentTarget.form?.requestSubmit?.();
  });
  const calibration = root.querySelector("[data-spatial-calibration]");
  calibration?.addEventListener("input", (event) => {
    if (!ui.calibration) return;
    ui.calibration[event.target.name] = event.target.value;
    redraw();
    let proposal;
    try {
      const c = ui.calibration;
      proposal = calibrateSceneScale(scene, c.a, c.b, Number(c.knownMeters), Number(c.cellMeters));
    } catch {}
    calibration.querySelector('[type="submit"]').disabled = !proposal;
    calibration.querySelector("[data-spatial-scale-output]").textContent = proposal
      ? ctx.t("Anteprima: ", "Preview: ") +
        formatNumber(ctx.lang, proposal.gridSize, 2) +
        ctx.t(" px per cella; posizioni invariate.", " px per cell; positions unchanged.")
      : ctx.t(
          "Indica misure positive: cella fra 10 e 300 pixel.",
          "Enter positive measurements: cell between 10 and 300 pixels.",
        );
  });
  calibration?.addEventListener("submit", (event) => {
    event.preventDefault();
    safe(() => {
      capture();
      const c = ui.calibration;
      applyScaleCalibration(
        scene,
        ui,
        calibrateSceneScale(scene, c.a, c.b, Number(c.knownMeters), Number(c.cellMeters)),
      );
      render();
    });
  });
  const container = root.querySelector("[data-prep-map]");
  if (!container) return;
  // A redraw replaces the map: while a gesture is open the keys (Escape, arrows, Enter) stay
  // with the map instead of falling to the page.
  if ((ui.anchor || ui.calibration) && ["wall", "door", "difficult", "scale"].includes(ui.tool)) {
    const active = root.ownerDocument?.activeElement;
    if (!active || active === root.ownerDocument.body)
      container.querySelector("svg.prep-map")?.focus?.({ preventScroll: true });
  }
  let drag = null;
  const point = (event) => {
    const svg = container.querySelector("svg.prep-map"),
      p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const result = p.matrixTransform(svg.getScreenCTM().inverse());
    return {
      x: Math.max(0, Math.min(scene.width, result.x)),
      y: Math.max(0, Math.min(scene.height, result.y)),
    };
  };
  const draw = () => {
    const svg = container.querySelector("svg.prep-map");
    svg.querySelector("[data-spatial-drawing]")?.remove();
    svg.insertAdjacentHTML(
      "beforeend",
      `<g data-spatial-drawing>${renderSpatialGesture(ui, ctx)}</g>`,
    );
  };
  const finishShape = (a, b, how = {}) => {
    if (ui.tool === "scale") {
      ui.calibration = {
        a: clone(a),
        b: clone(b),
        knownMeters: "",
        cellMeters: scene.metersPerCell,
      };
      ui.anchor = null;
      ui.cursor = null;
    } else if (ui.tool === "difficult") {
      addSpatialShape(scene, ui, ui.tool, a, b);
      ui.anchor = null;
      ui.cursor = null;
    } else placeSegment(scene, ui, a, b, how);
    render();
  };
  const setPoint = (p) => {
    if (!ui.anchor) {
      ui.anchor = p;
      ui.cursor = p;
      render();
    } else finishShape(ui.anchor, p);
  };
  // A double-click ends a wall chain (Foundry). Its second click on the same point already
  // closed it; this only ends a chain still open, never a first point just chosen.
  container.addEventListener("dblclick", (event) => {
    if (!ui.chainTool || !["wall", "door"].includes(ui.tool)) return;
    event.preventDefault();
    drag = null;
    cancel();
    ui.chainTool = null;
    render();
  });
  container.addEventListener("pointerdown", (event) => {
    if (ui.tool === "tokens" || event.button !== 0) return;
    event.preventDefault();
    dropForeignChain(ui);
    capture();
    container.querySelector("svg.prep-map")?.focus({ preventScroll: true });
    const id = event.target.closest("[data-spatial-id]")?.dataset.spatialId,
      end = event.target.closest("[data-spatial-end]")?.dataset.spatialEnd;
    if (ui.tool === "select") {
      ui.selectedId = id || null;
      if (!end) {
        render();
        return;
      }
      const shape = (scene.walls || []).find((s) => s.id === id);
      if (!shape) return;
      drag = { endpoint: end, shape: clone(shape), a: point(event) };
    } else if (!ui.calibration)
      drag = { a: point(event), anchor: ui.anchor ? clone(ui.anchor) : null };
    else return;
    container.setPointerCapture(event.pointerId);
  });
  container.addEventListener("pointermove", (event) => {
    if (ui.tool === "tokens" || ui.calibration) return;
    ui.cursor = point(event);
    if (drag?.endpoint) {
      ui.anchor = drag.shape[drag.endpoint === "a" ? "b" : "a"];
      draw();
    } else if (drag) {
      ui.anchor = drag.anchor || drag.a;
      draw();
    } else if (ui.anchor) draw();
  });
  container.addEventListener("pointerup", (event) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    if (container.hasPointerCapture(event.pointerId))
      container.releasePointerCapture(event.pointerId);
    safe(() => {
      const b = point(event);
      if (current.endpoint) {
        const patch = { ...current.shape, [current.endpoint]: b };
        ui.anchor = null;
        ui.cursor = null;
        updateSpatialShape(scene, ui, patch.id, patch);
        render();
      } else if (current.anchor || Math.hypot(b.x - current.a.x, b.y - current.a.y) > 3)
        finishShape(current.anchor || current.a, b, {
          drag: !current.anchor,
          ctrl: event.ctrlKey || event.metaKey,
        });
      else {
        ui.anchor = current.a;
        ui.cursor = current.a;
        render();
      }
    });
  });
  container.addEventListener("pointercancel", () => {
    drag = null;
    cancel();
    redraw();
  });
  container.addEventListener("keydown", (event) => {
    if (ui.tool === "tokens") return;
    if (event.key === "Escape") {
      event.preventDefault();
      drag = null;
      cancel();
      render();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      safe(() => {
        undoSpatialDraft(scene, ui);
        render();
      });
      return;
    }
    if (event.key === "Delete" && ui.selectedId) {
      event.preventDefault();
      safe(() => {
        deleteSpatialShape(scene, ui, ui.selectedId);
        render();
      });
      return;
    }
    const direction = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    }[event.key];
    if (direction) {
      event.preventDefault();
      const p = ui.cursor || { x: scene.width / 2, y: scene.height / 2 },
        step = event.shiftKey ? 1 : 10;
      ui.cursor = {
        x: Math.max(0, Math.min(scene.width, p.x + direction[0] * step)),
        y: Math.max(0, Math.min(scene.height, p.y + direction[1] * step)),
      };
      if (!ui.anchor) {
        ui.anchor = null;
        container.querySelector("[data-spatial-drawing]")?.remove();
        container
          .querySelector("svg.prep-map")
          .insertAdjacentHTML(
            "beforeend",
            `<g data-spatial-drawing class="spatial-gesture"><circle cx="${ui.cursor.x}" cy="${ui.cursor.y}" r="7"/></g>`,
          );
      } else draw();
    }
    if (event.key === "Enter" && !["select", "tokens"].includes(ui.tool) && !ui.calibration) {
      event.preventDefault();
      dropForeignChain(ui);
      safe(() => {
        setPoint(ui.cursor || { x: scene.width / 2, y: scene.height / 2 });
        root.ownerDocument.querySelector("[data-prep-interactive]")?.focus();
      });
    }
  });
}
