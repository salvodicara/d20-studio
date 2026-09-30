// B41 — Regions, traps and behaviours: the area's entry module (registry integration).
//
// Where it lives (B61 placement rules): the region tool in the Table's left toolbar, DM group
// (Foundry Regions scene control, FVT-082); the DM's event preview and the player's
// consequences in the Creature tab (inspector) with a notification; the region editor, the
// reusable traps and the event history in Preparation → «Regioni e trappole». Players see
// consequences only: a stop, a saving throw request, a message, a passage to answer, the
// traps their party found. Domain and sources: regions-domain.mjs.
import * as D from "./regions-domain.mjs";
import { observeMovementStops, observeTurnPhases, resolveAttemptKind } from "./combat.mjs";
import { openRoll, openCombatRequests } from "./combat-ui.mjs";
import { rollDie } from "./state.mjs";
import { renderSceneBase, activateScene } from "./preparation.mjs";
import { renderSpatialOverlay } from "./spatial-editor.mjs";
import { canControlActor } from "./character-access.mjs";

const L = (it, en) => ({ it, en });
const TOOL = "regions";
const ui = {
  selected: null,
  draw: null,
  drag: null,
  prepScene: null,
  prepSelected: null,
  prepDraw: false,
  prepGesture: null,
  seen: null,
  diceMode: "digital",
};
export function resetRegionsView() {
  Object.assign(ui, {
    selected: null,
    draw: null,
    drag: null,
    prepScene: null,
    prepSelected: null,
    prepDraw: false,
    prepGesture: null,
    seen: null,
  });
}
const rng = (sides) => rollDie(sides);
const lbl = (ctx, value) => ctx.label(value ?? "");
const esc = (ctx, value) => ctx.esc(value ?? "");
const f1 = (n) => Math.round(n * 10) / 10;
const nameOf = (ctx, actorId) => ctx.state.actors?.[actorId]?.name ?? "?";
const sceneName = (ctx, id) => ctx.state.scenes.find((s) => s.id === id)?.name ?? id;
const showError = (ctx, error) =>
  ctx.toast(ctx.label(error?.it ? { it: error.it, en: error.en } : (error?.message ?? "")), true);
/** Runs a command through ctx.commit; a refusal becomes a readable message. */
function run(ctx, label, mutate, options = {}) {
  try {
    ctx.commit(label, mutate, options);
    return true;
  } catch (error) {
    showError(ctx, error);
    return false;
  }
}
// DM authoring is private in the Log: players never learn of a hidden trap from its label.
const PRIVATE = { visibility: "private" };
// The area object from register(): announces the rolls this area keeps in its own slice.
let area = null;
/**
 * Review (B41-rf, F1): a command whose mutator returns the Log rolls it accepted. They join
 * the commit's own Log entry (roll history, chat) and are announced with "roll-accepted"
 * (dice tray, 3D dice), as the registry plan §2.6 asks of an area that keeps its own dice.
 * A refusal throws before anything is announced.
 */
function commitRolls(ctx, label, mutate, options = {}) {
  let rolls = [];
  ctx.commit(
    label,
    (draft) => {
      rolls = mutate(draft) ?? [];
    },
    {
      ...options,
      afterCommit: (state) => {
        const entry = state.log?.at(-1);
        if (entry && rolls.length) entry.rolls = [...(entry.rolls ?? []), ...rolls];
      },
    },
  );
  const logId = ctx.state.log?.at(-1)?.id ?? null;
  for (const roll of rolls) area?.emit?.("roll-accepted", { logId, roll: structuredClone(roll) });
}
const rollOf = (state, id) => D.rollsOf(state)?.rolls.find((r) => r.id === id) ?? null;
// SV-37: an unavailable command keeps its click (a toast with the reason) and is described
// by a visible sentence «cause: remedy».
const whyId = (key) => `regions-why-${String(key).replace(/[^A-Za-z0-9_-]/g, "-")}`;
const whyAttrs = (ctx, key, why) =>
  why ? ` aria-disabled="true" data-why="${esc(ctx, why)}" aria-describedby="${whyId(key)}"` : "";
const whyNote = (ctx, key, why) =>
  why ? `<small class="muted regions-why" id="${whyId(key)}">${esc(ctx, why)}</small>` : "";
const button = (attrs, textHTML, kind = "") =>
  `<button type="button" class="button${kind ? " " + kind : ""}" ${attrs}>${textHTML}</button>`;
const eventTime = (ctx, iso) =>
  new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const CAUSES = {
  enter: L("entra", "enters"),
  exit: L("esce", "exits"),
  "turn-start": L("inizia il turno dentro", "starts its turn inside"),
  "turn-end": L("finisce il turno dentro", "ends its turn inside"),
  "disarm-failed": L("sbaglia il disinnesco", "fails to disarm it"),
};
const causeText = (ctx, cause) => lbl(ctx, CAUSES[cause] ?? cause);
const statusText = (ctx, status) =>
  ({
    "awaiting-dm": ctx.t("Da decidere (DM)", "To decide (DM)"),
    "awaiting-roll": ctx.t("Tiro salvezza in attesa", "Saving throw pending"),
    "awaiting-mover": ctx.t("Attende chi si muove", "Waiting for the mover"),
    applied: ctx.t("Applicato", "Applied"),
    cancelled: ctx.t("Annullato dal DM", "Cancelled by the DM"),
    fizzled: ctx.t("Non è scattato", "Did not go off"),
    declined: ctx.t("Passaggio rifiutato", "Passage declined"),
    expired: ctx.t("Scaduto", "Expired"),
  })[status] ?? status;
function resultText(ctx, event) {
  const r = event.result ?? {};
  const parts = [];
  if (r.saveSuccess !== undefined && r.saveSuccess !== null)
    parts.push(
      r.autoFail
        ? ctx.t("TS fallito automaticamente", "Save failed automatically")
        : `${ctx.t("TS", "Save")} ${r.saveTotal ?? ""} ${r.saveSuccess ? ctx.t("riuscito", "succeeded") : ctx.t("fallito", "failed")}`,
    );
  if (r.autoFail && r.saveSuccess === false && !parts.length)
    parts.push(ctx.t("TS fallito automaticamente", "Save failed automatically"));
  if (typeof r.damage === "number") parts.push(`${r.damage} ${ctx.t("danni", "damage")}`);
  for (const c of r.conditions ?? [])
    parts.push(
      `${lbl(ctx, D.conditionName(c.conditionId))}: ${c.applied ? ctx.t("applicata", "applied") : ctx.t("da verificare (immunità)", "to check (immunities)")}`,
    );
  for (const m of r.messages ?? []) parts.push(`“${m}”`);
  for (const d of r.doors ?? [])
    parts.push(
      ctx.t("Porta ", "Door ") +
        {
          open: ctx.t("aperta", "open"),
          closed: ctx.t("chiusa", "closed"),
          locked: ctx.t("chiusa a chiave", "locked"),
        }[d.doorState],
    );
  if (r.passage)
    parts.push(`${ctx.t("Arrivo", "Arrival")}: ${sceneName(ctx, r.passage.toSceneId)}`);
  // The chance is DM configuration and the d100 a DM roll (review F4).
  if (event.chance && ctx.role === "dm")
    parts.push(`d100 ${event.chance.value} / ${event.chance.chance}%`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------- announcements

// Remembers which events this viewer already saw, so a new trigger, request or answer is
// announced once (toast) after the commit that produced it.
function prime(ctx) {
  if (ui.seen) return;
  ui.seen = new Set((D.sliceOf(ctx.state)?.events ?? []).map((e) => e.id + ":" + e.status));
}
export function announce(ctx) {
  const events = D.sliceOf(ctx.state)?.events;
  if (!events) return;
  if (!ui.seen) return prime(ctx);
  let say = null;
  for (const event of events) {
    const key = event.id + ":" + event.status;
    if (ui.seen.has(key)) continue;
    ui.seen.add(key);
    // The DM hears of every trigger; a player of what happens to their own creatures.
    const mine =
      ctx.role !== "dm" && canControlActor(ctx.state.actors[event.actorId], ctx.role, ctx.state);
    const who = nameOf(ctx, event.actorId);
    const title = event.plan.publicName || event.plan.name;
    if (ctx.role === "dm" && event.status === "awaiting-dm")
      say = ctx.t(
        `«${event.plan.name}»: ${who} ${causeText(ctx, event.cause)}. Decidi nella scheda Creatura.`,
        `«${event.plan.name}»: ${who} ${causeText(ctx, event.cause)}. Decide in the Creature tab.`,
      );
    else if (ctx.role !== "dm" && mine && event.status === "awaiting-dm")
      say = ctx.t(
        `${who} si ferma: qualcosa accade qui. Decide il DM.`,
        `${who} stops: something happens here. The DM decides.`,
      );
    else if (mine && event.status === "awaiting-roll")
      say = ctx.t(
        `«${title}»: tiro salvezza richiesto a ${who}.`,
        `«${title}»: ${who} must make a saving throw.`,
      );
    else if (mine && event.status === "awaiting-mover")
      say = ctx.t(
        `«${title}»: scegli se prendere il passaggio.`,
        `«${title}»: choose whether to take the passage.`,
      );
    else if (mine && event.status === "applied" && event.result?.messages?.length)
      say = `«${title}»: ${event.result.messages.join(" ")}`;
  }
  if (say) ctx.toast(say);
}

// ---------------------------------------------------------------- map layers

const KIND_CLASS = { trap: "trap", hazard: "hazard", passage: "passage", area: "area" };
// Difficult Terrain inside a region: diagonal hatching (dnd5e region behaviour, FVT-117).
const HATCH = `<defs><pattern id="regions-hatch-pattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V12" stroke="#f0d9a0" stroke-opacity=".45" stroke-width="3"/></pattern></defs>`;
export function regionShapes(ctx, tv) {
  prime(ctx);
  const scene = tv?.scene;
  if (!scene || !D.sliceOf(ctx.state)) return "";
  const dm = ctx.role === "dm";
  const list = D.visibleRegions(ctx.state, ctx.role, scene.id);
  return `<g class="regions-layer" pointer-events="none" data-regions-layer="${dm ? "dm" : "player"}">${HATCH}${list
    .map((r) => {
      const s = r.shape;
      const state = [
        r.status.disarmed ? "is-disarmed" : "",
        r.status.spent ? "is-spent" : "",
        r.visibility === "hidden" ? "is-hidden" : "",
        dm && tv.mode === TOOL && ui.selected === r.id ? "is-selected" : "",
      ].join(" ");
      return `<g class="regions-shape regions-${KIND_CLASS[r.kind] ?? "area"} ${state}" data-region="${esc(ctx, r.id)}"><title>${esc(ctx, dm ? r.name : r.publicName)}</title><rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="4"/>${r.difficult ? `<rect class="regions-hatch" x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}"/>` : ""}</g>`;
    })
    .join("")}</g>`;
}
export function regionMarks(ctx, tv) {
  const scene = tv?.scene;
  if (!scene || !D.sliceOf(ctx.state)) return "";
  const dm = ctx.role === "dm";
  const pending = new Set(D.pendingEvents(ctx.state).map((e) => e.regionId));
  const labels = D.visibleRegions(ctx.state, ctx.role, scene.id)
    .map((r) => {
      const s = r.shape;
      const trap = r.kind === "trap";
      const glyph = r.status.disarmed
        ? "✓"
        : trap
          ? "!"
          : r.kind === "passage"
            ? "⇅"
            : r.kind === "hazard"
              ? "▲"
              : "◇";
      const name = dm ? r.name : r.publicName;
      const note = r.status.disarmed
        ? ctx.t("disinnescata", "disarmed")
        : r.status.spent
          ? ctx.t("scattata", "spent")
          : !dm && trap && r.status.discovered
            ? ctx.t("individuata", "found")
            : "";
      const showLabel = dm ? tv.mode === TOOL || pending.has(r.id) : true;
      // PR-29 (Foundry/Roll20 click-to-interact): a trap the party found is a button that
      // opens its menu (Esamina, Disinnesca); clicking it never moves a token.
      // The DM's region tool keeps its own clicks (select, configure, move).
      const hit =
        trap && (dm ? tv.mode !== TOOL : r.status.discovered)
          ? ` data-regions-hit="${esc(ctx, r.id)}" data-map-hit pointer-events="auto" tabindex="0" role="button" aria-haspopup="menu" aria-label="${esc(ctx, ctx.t(`Trappola: ${name}. Esamina o disinnesca`, `Trap: ${name}. Examine or disarm`))}"`
          : "";
      return `<g class="regions-mark regions-${KIND_CLASS[r.kind] ?? "area"}${pending.has(r.id) && dm ? " is-pending" : ""}${hit ? " is-hit" : ""}" transform="translate(${f1(s.x + 12)} ${f1(s.y + 12)})"${hit}>${hit ? `<circle class="regions-hit-area" r="22"/>` : ""}<circle r="11"/><text y="4" text-anchor="middle">${glyph}</text>${showLabel ? `<text class="regions-label" x="16" y="4">${esc(ctx, name)}${note ? " · " + note : ""}</text>` : ""}${pending.has(r.id) && dm ? `<circle class="regions-pulse" r="17"/>` : ""}</g>`;
    })
    .join("");
  return `<g class="regions-marks" pointer-events="none">${labels}${dm && tv.mode === TOOL ? `<g data-regions-live></g>` : ""}</g>`;
}

// PR-31 (Fantasy Grounds global effects): «Condizioni della scena» adds a hazard that
// covers the map and acts at the start of each turn; «Su misura» opens its configuration.
export function openSceneConditions(ctx, sceneId = ctx.state.activeSceneId) {
  if (ctx.role !== "dm") return;
  const scenes = ctx.state.scenes;
  const current = scenes.find((s) => s.id === sceneId) ?? scenes[0];
  if (!current) return;
  const existing = D.regionsIn(ctx.state, current.id).filter(
    (r) =>
      r.trigger?.event === "turn-start" &&
      r.shape.x === 0 &&
      r.shape.y === 0 &&
      r.shape.width === current.width &&
      r.shape.height === current.height,
  );
  ctx.dialog(
    ctx.t("Condizioni della scena", "Scene conditions"),
    `<p class="muted">${ctx.t("Un effetto su tutta la mappa (clima, fumi, magia): all’inizio del turno di ogni creatura nella scena propone al DM il suo effetto, come ogni regione.", "An effect over the whole map (weather, fumes, magic): at the start of each creature’s turn in the scene it offers its effect to the DM, like every region.")}</p><label class="field">${ctx.t("Scena", "Scene")}<select name="scene">${scenes.map((s) => `<option value="${esc(ctx, s.id)}"${s.id === current.id ? " selected" : ""}>${esc(ctx, s.name)}${s.id === ctx.state.activeSceneId ? " · " + ctx.t("al Tavolo", "at the Table") : ""}</option>`).join("")}</select></label><fieldset class="regions-conditions"><legend>${ctx.t("Effetto", "Effect")}</legend>${D.SCENE_CONDITIONS.map(([id, name, summary], i) => `<label class="regions-condition-choice"><input type="radio" name="preset" value="${id}" ${i === 0 ? "checked" : ""}><span><strong>${esc(ctx, lbl(ctx, name))}</strong><small class="muted">${esc(ctx, lbl(ctx, summary))}</small></span></label>`).join("")}</fieldset>${existing.length ? `<p class="muted">${ctx.t("Già attive in questa scena", "Already active in this scene")}: ${esc(ctx, existing.map((r) => r.name).join(", "))}</p>` : ""}<p class="muted">${ctx.t("Esempi scritti per questa app, non regole SRD. Si tolgono da Regioni e trappole › Elimina.", "Examples written for this app, not SRD rules. Remove them from Regions and traps › Delete.")}</p>`,
    {
      submitLabel: ctx.t("Aggiungi alla scena", "Add to the scene"),
      onSubmit: (data) => {
        const scene = scenes.find((s) => s.id === data.get("scene"));
        const preset = String(data.get("preset") || "blizzard");
        if (!scene) return false;
        let created = null;
        const ok = run(
          ctx,
          ctx.t("Condizione della scena aggiunta", "Scene condition added"),
          (s) => {
            created = D.createRegion(s, D.sceneConditionInput(scene, preset, ctx.lang), ctx.role);
          },
          PRIVATE,
        );
        if (!ok || !created) return false;
        ui.prepSelected = created.id;
        ui.selected = created.id;
        if (preset === "custom") openConfig(ctx, created.id);
        else
          ctx.toast(
            ctx.t(
              `«${created.name}» è attiva: agisce all’inizio di ogni turno nella scena.`,
              `“${created.name}” is active: it acts at the start of every turn in the scene.`,
            ),
          );
      },
    },
  );
}

// PR-29: the menu of a found trap, at the point clicked (Foundry's HUD, Roll20's radial
// menu). «Esamina» says what the party knows; «Disinnesca» opens the roll for a creature
// the viewer controls, or says why it cannot be done now.
function hitActor(ctx, table, region) {
  const scene = table?.scene;
  const mine = (scene?.tokens ?? [])
    .map((t) => ctx.state.actors[t.actorId])
    .filter((a) => a && ctx.canControl(a) && (ctx.role !== "dm" || a.owner !== "player"));
  const selected = table?.selectedActorId ?? table?.selected;
  const token = (id) => scene.tokens.find((t) => t.actorId === id);
  const byDistance = mine
    .map((a) => ({ a, d: D.metersTo(scene, region.shape, token(a.id)) }))
    .sort((x, y) => x.d - y.d);
  // Who acts: the selected creature when it is in reach, else the nearest one in reach,
  // else the selected one (the menu then says to bring it closer), else the nearest.
  const inReach = byDistance.filter((row) => row.d <= D.REACH_METERS);
  return (
    inReach.find((row) => row.a.id === selected)?.a ??
    inReach[0]?.a ??
    mine.find((a) => a.id === selected) ??
    byDistance[0]?.a ??
    null
  );
}
export function disarmBlock(ctx, actorId, regionId) {
  const actor = ctx.state.actors[actorId];
  if (!actor)
    return ctx.t("Seleziona prima un tuo personaggio.", "Select one of your characters first.");
  const event = D.pendingEvents(ctx.state).find((e) => e.regionId === regionId);
  if (event)
    return ctx.t(
      "La trappola è scattata e il DM sta decidendo cosa succede: si potrà disinnescare dopo (o se il DM annulla l’evento).",
      "The trap went off and the DM is deciding what happens: it can be disarmed afterwards (or if the DM cancels the event).",
    );
  const region = D.regionOf(ctx.state, regionId);
  if (region?.status.disarmed) return ctx.t("È già disinnescata.", "It is already disarmed.");
  if (region?.status.spent) return ctx.t("È già scattata.", "It has already gone off.");
  const combat = ctx.state.combat?.active;
  if (combat && ctx.state.combat.order?.[ctx.state.combat.turn] !== actorId)
    return ctx.t(`Nel turno di ${actor.name}.`, `On ${actor.name}’s turn.`);
  if (combat && !actor.action)
    return ctx.t("L’azione di questo turno è già spesa.", "This turn’s action is already spent.");
  if (!D.disarmable(ctx.state, actorId).some((r) => r.id === regionId))
    return ctx.t(
      `Avvicina ${actor.name} entro ${D.REACH_METERS.toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB")} m dalla trappola.`,
      `Bring ${actor.name} within ${D.REACH_METERS} m of the trap.`,
    );
  if (!D.hasThievesTools(actor))
    return ctx.t(
      `Servono gli Arnesi da scasso nell’inventario di ${actor.name}.`,
      `${actor.name} needs Thieves’ Tools in the inventory.`,
    );
  return "";
}
function closeHitMenu() {
  globalThis.document?.querySelectorAll?.("[data-regions-hit-menu]").forEach((m) => m.remove());
}
export function openHitMenu(ctx, table, regionId, at = null) {
  closeHitMenu();
  const region =
    D.visibleRegions(ctx.state, ctx.role, table?.scene?.id).find((r) => r.id === regionId) ?? null;
  if (!region) return;
  const dm = ctx.role === "dm";
  const actor = hitActor(ctx, table, region);
  const why = disarmBlock(ctx, actor?.id, regionId);
  const name = dm ? D.regionOf(ctx.state, regionId)?.name : region.publicName;
  const full = dm ? D.regionOf(ctx.state, regionId) : null;
  const examine = [
    region.status.disarmed
      ? ctx.t("Disinnescata.", "Disarmed.")
      : region.status.spent
        ? ctx.t("Già scattata.", "Already gone off.")
        : ctx.t(
            "Individuata e ancora armata: non calpestarla.",
            "Found and still armed: do not step on it.",
          ),
    ctx.t(
      `Si disinnesca con gli Arnesi da scasso (azione Utilizzare) entro ${String(D.REACH_METERS).replace(".", ",")} m.`,
      `It is disarmed with Thieves’ Tools (Utilize action) within ${D.REACH_METERS} m.`,
    ),
    full?.trap
      ? ctx.t(
          `CD: individuare ${full.trap.detectDC}, disinnescare ${full.trap.disarmDC} (solo DM).`,
          `DC: find ${full.trap.detectDC}, disarm ${full.trap.disarmDC} (DM only).`,
        )
      : "",
  ].filter(Boolean);
  const menu = globalThis.document.createElement("div");
  menu.className = "regions-hit-menu";
  menu.dataset.regionsHitMenu = regionId;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", ctx.t(`Trappola: ${name}`, `Trap: ${name}`));
  menu.innerHTML = `<p class="regions-hit-title"><strong>${esc(ctx, name)}</strong><small>${ctx.t("Trappola", "Trap")}${actor ? ` · ${esc(ctx, actor.name)}` : ""}</small></p><button type="button" role="menuitem" data-regions-hit-act="examine">${ctx.t("Esamina", "Examine")}</button><button type="button" role="menuitem" data-regions-hit-act="disarm" ${why ? 'aria-disabled="true"' : ""}>${ctx.t("Disinnesca…", "Disarm…")}</button>${dm ? `<button type="button" role="menuitem" data-regions-hit-act="config">${ctx.t("Configura…", "Configure…")}</button>` : ""}<p class="regions-hit-note" data-regions-hit-note role="status" ${why ? "" : "hidden"}>${esc(ctx, why)}</p><p class="regions-hit-note" data-regions-hit-examine hidden>${esc(ctx, examine.join(" "))}</p>`;
  const host =
    table?.svg?.closest?.(".map-wrap, .battle-map-wrap, .table-map") ?? table?.svg?.parentElement;
  (host ?? globalThis.document.body).append(menu);
  if (host && getComputedStyle(host).position === "static") host.style.position = "relative";
  const box = host?.getBoundingClientRect?.();
  const x = (at?.clientX ?? box?.left ?? 0) - (box?.left ?? 0);
  const y = (at?.clientY ?? box?.top ?? 0) - (box?.top ?? 0);
  menu.style.left = `${Math.max(8, Math.min(x + 8, (box?.width ?? 400) - 248))}px`;
  menu.style.top = `${Math.max(8, Math.min(y + 8, (box?.height ?? 400) - 190))}px`;
  menu.querySelector("[data-regions-hit-act='examine']").addEventListener("click", () => {
    menu.querySelector("[data-regions-hit-examine]").hidden = false;
  });
  menu.querySelector("[data-regions-hit-act='disarm']").addEventListener("click", () => {
    const block = disarmBlock(ctx, actor?.id, regionId);
    if (block) {
      const note = menu.querySelector("[data-regions-hit-note]");
      note.textContent = block;
      note.hidden = false;
      return;
    }
    closeHitMenu();
    openCheck(ctx, "disarm", actor.id, regionId);
  });
  menu.querySelector("[data-regions-hit-act='config']")?.addEventListener("click", () => {
    closeHitMenu();
    openConfig(ctx, regionId);
  });
  menu.querySelector("button")?.focus();
  const away = (event) => {
    if (menu.contains(event.target)) return;
    closeHitMenu();
    globalThis.document.removeEventListener("pointerdown", away, true);
  };
  globalThis.document.addEventListener("pointerdown", away, true);
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeHitMenu();
    }
  });
}
export function bindMarks(el, ctx, table) {
  el.querySelectorAll("[data-regions-hit]").forEach((node) => {
    // The press is the menu's, never the start of a token move or a pan.
    for (const type of ["pointerdown", "pointerup"])
      node.addEventListener(type, (event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
      });
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openHitMenu(ctx, table, node.dataset.regionsHit, event);
    });
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      const r = node.getBoundingClientRect();
      openHitMenu(ctx, table, node.dataset.regionsHit, { clientX: r.right, clientY: r.top });
    });
  });
}
const live = (table, html) => {
  const layer = table?.svg?.querySelector?.("[data-regions-live]");
  if (layer) layer.innerHTML = html;
};

// ---------------------------------------------------------------- table tool (DM)

const clampPoint = (scene, p) => ({
  x: Math.max(0, Math.min(scene.width, p.x)),
  y: Math.max(0, Math.min(scene.height, p.y)),
});
const rectOf = (a, b) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(b.x - a.x),
  height: Math.abs(b.y - a.y),
});
const draftRect = (r) =>
  `<rect class="regions-draft" x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.width)}" height="${f1(r.height)}"/>`;
function newRegionInput(ctx, sceneId, shape) {
  const count = D.regionsIn(ctx.state, sceneId).length + 1;
  return {
    sceneId,
    name: ctx.t(`Regione ${count}`, `Region ${count}`),
    kind: "area",
    shape,
    visibility: "hidden",
    difficult: false,
    trigger: { event: "enter", who: "all", chance: 100, once: false, stopMovement: false },
    actions: [],
    trap: null,
  };
}
/** Creates a region (drawn or centred) and opens its configuration, as Foundry does. */
function createAndConfigure(ctx, sceneId, shape, select) {
  let created = null;
  const ok = run(
    ctx,
    ctx.t("Regione creata", "Region created"),
    (s) => {
      created = D.createRegion(s, newRegionInput(ctx, sceneId, shape), ctx.role);
    },
    PRIVATE,
  );
  if (ok && created) {
    select(created.id);
    openConfig(ctx, created.id);
  }
}
export const regionTool = {
  id: TOOL,
  label: L("Regioni e trappole", "Regions and traps"),
  icon: "shape",
  group: "dm",
  roles: ["dm"],
  order: 58,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Regioni: trascina per disegnarne una; clic per sceglierla, di nuovo per configurarla. Frecce la spostano, Invio la configura.",
        "Regions: drag to draw one; click to select it, again to configure it. Arrow keys move it, Enter configures it.",
      ),
    );
  },
  deactivate() {
    ui.draw = null;
    ui.drag = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const p = clampPoint(table.scene, table.point(e));
    const hit = D.regionAt(D.regionsIn(ctx.state, table.scene.id), p);
    try {
      table.svg.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic events have no capture */
    }
    if (hit) {
      ui.drag = { id: hit.id, from: p, shape: { ...hit.shape }, moved: false, was: ui.selected };
      ui.selected = hit.id;
      return;
    }
    ui.draw = { a: p, b: p };
  },
  onPointerMove(ctx, e, table) {
    const p = clampPoint(table.scene, table.point(e));
    if (ui.draw) {
      ui.draw.b = p;
      live(table, draftRect(rectOf(ui.draw.a, p)));
    } else if (ui.drag) {
      const dx = p.x - ui.drag.from.x,
        dy = p.y - ui.drag.from.y;
      if (Math.hypot(dx, dy) > 4) ui.drag.moved = true;
      if (ui.drag.moved) {
        const s = ui.drag.shape;
        ui.drag.to = {
          ...s,
          x: Math.max(0, Math.min(table.scene.width - s.width, s.x + dx)),
          y: Math.max(0, Math.min(table.scene.height - s.height, s.y + dy)),
        };
        live(table, draftRect(ui.drag.to));
      }
    }
  },
  onPointerUp(ctx, e, table) {
    const draw = ui.draw,
      drag = ui.drag;
    ui.draw = null;
    ui.drag = null;
    if (draw) {
      const rect = rectOf(draw.a, clampPoint(table.scene, table.point(e)));
      if (rect.width >= 10 && rect.height >= 10)
        createAndConfigure(ctx, table.scene.id, rect, (id) => (ui.selected = id));
      else {
        ui.selected = null;
        table.render();
      }
      return;
    }
    if (drag) {
      if (drag.moved && drag.to) {
        run(
          ctx,
          ctx.t("Regione spostata", "Region moved"),
          (s) => D.moveRegion(s, drag.id, drag.to, ctx.role),
          PRIVATE,
        );
        return;
      }
      if (drag.was === drag.id) openConfig(ctx, drag.id);
      else {
        table.render();
        // The fresh map keeps the keyboard: arrows nudge the chosen region, Enter configures.
        queueMicrotask(() =>
          globalThis.document?.querySelector("#battle-map")?.focus({ preventScroll: true }),
        );
      }
    }
  },
  onClick() {
    // The pointer handlers above act; a click never reaches the core move.
  },
  onKeyDown(ctx, e, table) {
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const region = ui.selected && D.regionOf(ctx.state, ui.selected);
    if (arrows[e.key]) {
      e.preventDefault();
      if (!region) {
        table.message(ctx.t("Scegli prima una regione.", "Choose a region first."));
        return;
      }
      const step = e.shiftKey ? 5 : table.scene.gridSize;
      const [dx, dy] = arrows[e.key];
      const s = region.shape;
      run(
        ctx,
        ctx.t("Regione spostata", "Region moved"),
        (draft) =>
          D.moveRegion(
            draft,
            region.id,
            {
              ...s,
              x: Math.max(0, Math.min(table.scene.width - s.width, s.x + dx * step)),
              y: Math.max(0, Math.min(table.scene.height - s.height, s.y + dy * step)),
            },
            ctx.role,
          ),
        PRIVATE,
      );
      queueMicrotask(() =>
        globalThis.document?.querySelector("#battle-map")?.focus({ preventScroll: true }),
      );
      return;
    }
    if (e.key === "Enter" && region) {
      e.preventDefault();
      openConfig(ctx, region.id);
    } else if ((e.key === "Delete" || e.key === "Backspace") && region) {
      e.preventDefault();
      openDelete(ctx, region.id);
    }
  },
};

// ---------------------------------------------------------------- configuration dialog

const options = (rows, value, ctx) =>
  rows
    .map(
      ([id, it, en]) =>
        `<option value="${id}"${id === value ? " selected" : ""}>${esc(ctx, ctx.t(it, en))}</option>`,
    )
    .join("");
const numberField = (ctx, name, label, value, extra = "") =>
  `<label class="field">${label}<input type="number" name="${name}" value="${esc(ctx, value)}" ${extra}></label>`;
const check = (name, label, on, extra = "") =>
  `<label class="regions-check"><input type="checkbox" name="${name}"${on ? " checked" : ""} ${extra}> ${label}</label>`;
function diceFields(ctx, prefix, dice) {
  return `<div class="regions-dice">${numberField(ctx, prefix + "-count", ctx.t("Dadi", "Dice"), dice?.count ?? 1, 'min="1" max="20" step="1"')}<label class="field">${ctx.t("Facce", "Sides")}<select name="${prefix}-sides">${D.DICE_SIDES.map((s) => `<option value="${s}"${s === (dice?.sides ?? 6) ? " selected" : ""}>d${s}</option>`).join("")}</select></label>${numberField(ctx, prefix + "-bonus", ctx.t("Bonus", "Bonus"), dice?.bonus ?? 0, 'min="-20" max="20" step="1"')}</div>`;
}
const damageTypeSelect = (ctx, name, value) =>
  `<label class="field">${ctx.t("Tipo di danno", "Damage type")}<select name="${name}">${options(D.DAMAGE_TYPES, value ?? "piercing", ctx)}</select></label>`;
function conditionSelect(ctx, name, value, none = false) {
  return `<label class="field">${ctx.t("Condizione", "Condition")}<select name="${name}">${none ? `<option value="">${ctx.t("— nessuna —", "— none —")}</option>` : ""}${D.conditionChoices()
    .map(
      (c) =>
        `<option value="${c.id}"${c.id === value ? " selected" : ""}>${esc(ctx, lbl(ctx, c.name))}</option>`,
    )
    .join("")}</select></label>`;
}
export function configBody(ctx, region) {
  const scene = ctx.state.scenes.find((s) => s.id === region.sceneId);
  const act = (type) => region.actions.find((a) => a.type === type);
  const save = act("save"),
    damage = act("damage"),
    condition = act("condition"),
    door = act("door"),
    message = act("message"),
    teleport = act("teleport");
  const doors = (scene?.walls ?? []).filter((w) => w.kind === "door");
  const others = (D.sliceOf(ctx.state)?.regions ?? []).filter((r) => r.id !== region.id);
  const action = (type, title, on, body) =>
    `<fieldset class="regions-action" data-regions-action="${type}"><legend>${check("act-" + type, `<strong>${title}</strong>`, on, `data-regions-toggle="${type}"`)}</legend><div class="regions-action-body" data-regions-body="${type}"${on ? "" : " hidden"}>${body}</div></fieldset>`;
  const t = region.trigger;
  return `<div class="regions-config" data-regions-config="${esc(ctx, region.id)}">
<p class="muted">${ctx.t("Scena", "Scene")}: ${esc(ctx, scene?.name ?? "")} · ${ctx.t("I giocatori vedono solo le conseguenze; una regione nascosta non compare sulla loro mappa finché non la trovano o non scatta.", "Players only see the consequences; a hidden region stays off their map until they find it or it goes off.")}</p>
<fieldset><legend>${ctx.t("Identità", "Identity")}</legend><div class="form-grid">
<label class="field">${ctx.t("Nome (DM)", "Name (DM)")}<input name="name" maxlength="80" required value="${esc(ctx, region.name)}"></label>
<label class="field">${ctx.t("Nome per il gruppo", "Name for the party")}<input name="publicName" maxlength="80" value="${esc(ctx, region.publicName)}"></label>
<label class="field">${ctx.t("Tipo", "Kind")}<select name="kind">${options(D.KINDS, region.kind, ctx)}</select></label>
<label class="field">${ctx.t("Visibilità", "Visibility")}<select name="visibility"><option value="hidden"${region.visibility === "hidden" ? " selected" : ""}>${ctx.t("Nascosta ai giocatori", "Hidden from players")}</option><option value="shared"${region.visibility === "shared" ? " selected" : ""}>${ctx.t("Visibile al gruppo", "Visible to the party")}</option></select></label>
</div></fieldset>
<fieldset><legend>${ctx.t("Forma (pixel della scena)", "Shape (scene pixels)")}</legend><div class="form-grid">${numberField(ctx, "x", "X", region.shape.x, 'step="any" min="0"')}${numberField(ctx, "y", "Y", region.shape.y, 'step="any" min="0"')}${numberField(ctx, "width", ctx.t("Larghezza", "Width"), region.shape.width, 'step="any" min="10"')}${numberField(ctx, "height", ctx.t("Altezza", "Height"), region.shape.height, 'step="any" min="10"')}</div>
${check("difficult", ctx.t("Terreno difficile: ogni metro dentro costa un metro in più (SRD 5.2.1)", "Difficult Terrain: every meter inside costs one extra meter (SRD 5.2.1)"), region.difficult)}</fieldset>
<fieldset><legend>${ctx.t("Innesco", "Trigger")}</legend><div class="form-grid">
<label class="field">${ctx.t("Quando", "When")}<select name="event" data-regions-event>${options(D.EVENTS, t.event, ctx)}</select></label>
<label class="field">${ctx.t("Chi la fa scattare", "Who sets it off")}<select name="who">${options(D.WHO, t.who, ctx)}</select></label>
${numberField(ctx, "chance", ctx.t("Probabilità (%)", "Chance (%)"), t.chance, 'min="1" max="100" step="1"')}
</div>${check("once", ctx.t("Una volta sola: dopo l’esecuzione resta scattata finché non la riarmi", "Once: after running it stays spent until you re-arm it"), t.once)}${check("stopMovement", ctx.t("Ferma il movimento sul bordo quando una creatura entra", "Stop movement at the edge when a creature enters"), t.stopMovement, `data-regions-stop${t.event === "enter" ? "" : ' disabled aria-describedby="regions-stop-why"'}`)}<small class="muted regions-why" id="regions-stop-why"${t.event === "enter" ? " hidden" : ""}>${ctx.t("Vale solo quando una creatura entra: in «Quando» scegli «Una creatura entra».", "It applies only when a creature enters: in “When” choose “A creature enters”.")}</small></fieldset>
<fieldset class="regions-actions"><legend>${ctx.t("Azioni (in quest’ordine)", "Actions (in this order)")}</legend>
${action("save", ctx.t("Tiro salvezza", "Saving throw"), !!save, `<div class="form-grid"><label class="field">${ctx.t("Caratteristica", "Ability")}<select name="save-ability">${options(D.ABILITIES, save?.ability ?? "dex", ctx)}</select></label>${numberField(ctx, "save-dc", ctx.t("CD", "DC"), save?.dc ?? 13, 'min="1" max="30" step="1"')}<label class="field">${ctx.t("Se riesce", "On a success")}<select name="save-success"><option value="none"${save?.onSuccess !== "half" ? " selected" : ""}>${ctx.t("Nessun danno", "No damage")}</option><option value="half"${save?.onSuccess === "half" ? " selected" : ""}>${ctx.t("Metà dei danni", "Half damage")}</option></select></label></div>${check("save-has-damage", ctx.t("Danni se fallisce", "Damage on a failure"), save ? !!save.dice : true)}${diceFields(ctx, "save", save?.dice ?? { count: 2, sides: 6, bonus: 0 })}${damageTypeSelect(ctx, "save-type", save?.damageType)}${conditionSelect(ctx, "save-condition", save?.conditionId ?? "", true)}`)}
${action("damage", ctx.t("Danni (senza tiro salvezza)", "Damage (no saving throw)"), !!damage, `${diceFields(ctx, "damage", damage?.dice ?? { count: 1, sides: 4, bonus: 0 })}${damageTypeSelect(ctx, "damage-type", damage?.damageType ?? "fire")}`)}
${action("condition", ctx.t("Condizione (senza tiro salvezza)", "Condition (no saving throw)"), !!condition, conditionSelect(ctx, "condition-id", condition?.conditionId ?? "prone"))}
${action(
  "door",
  ctx.t("Porta", "Door"),
  !!door,
  doors.length
    ? `<div class="form-grid"><label class="field">${ctx.t("Quale porta", "Which door")}<select name="door-id">${doors.map((d, i) => `<option value="${esc(ctx, d.id)}"${d.id === door?.doorId ? " selected" : ""}>${ctx.t("Porta", "Door")} ${i + 1}${d.secret ? " · " + ctx.t("segreta", "secret") : ""}</option>`).join("")}</select></label><label class="field">${ctx.t("Diventa", "Becomes")}<select name="door-state">${options(
        [
          ["closed", "Chiusa", "Closed"],
          ["open", "Aperta", "Open"],
          ["locked", "Chiusa a chiave", "Locked"],
        ],
        door?.doorState ?? "closed",
        ctx,
      )}</select></label></div>`
    : `<p class="muted">${ctx.t("Questa scena non ha porte: disegnale in Preparazione.", "This scene has no doors: draw them in Preparation.")}</p>`,
)}
${action("message", ctx.t("Messaggio a chi la fa scattare", "Message to whoever sets it off"), !!message, `<label class="field">${ctx.t("Testo", "Text")}<textarea name="message-text" rows="2" maxlength="500">${esc(ctx, message?.text ?? "")}</textarea></label>`)}
${action("teleport", ctx.t("Scale o passaggio", "Stairs or passage"), !!teleport, others.length ? `<label class="field">${ctx.t("Arrivo", "Arrival")}<select name="teleport-target">${others.map((r) => `<option value="${esc(ctx, r.id)}"${r.id === teleport?.targetRegionId ? " selected" : ""}>${esc(ctx, r.name)} · ${esc(ctx, sceneName(ctx, r.sceneId))}</option>`).join("")}</select></label><p class="muted">${ctx.t("Chi si muove conferma prima di spostarsi (Portals); verso un’altra scena la pedina arriva lì e il DM attiva la scena.", "The mover confirms before moving (Portals); to another scene the token arrives there and the DM activates the scene.")}</p>` : `<p class="muted">${ctx.t("Crea prima la regione d’arrivo.", "Create the arrival region first.")}</p>`)}
</fieldset>
<fieldset><legend>${check("is-trap", `<strong>${ctx.t("Trappola da individuare e disinnescare", "Trap to find and disarm")}</strong>`, !!region.trap, 'data-regions-toggle="trap"')}</legend><div data-regions-body="trap"${region.trap ? "" : " hidden"}><div class="form-grid">${numberField(ctx, "detect-dc", ctx.t("CD Saggezza (Percezione) per individuarla", "Wisdom (Perception) DC to find it"), region.trap?.detectDC ?? 15, 'min="1" max="30" step="1"')}${numberField(ctx, "disarm-dc", ctx.t("CD Arnesi da scasso per disinnescarla", "Thieves’ Tools DC to disarm it"), region.trap?.disarmDC ?? 15, 'min="1" max="30" step="1"')}</div>${check("fail-triggers", ctx.t("Se il disinnesco fallisce, la trappola scatta", "A failed disarm sets the trap off"), region.trap?.failTriggers)}${check("discovered", ctx.t("Già individuata dal gruppo (segnata sulla loro mappa)", "Already found by the party (marked on their map)"), region.status.discovered)}${check("disarmed", ctx.t("Disinnescata", "Disarmed"), region.status.disarmed)}</div></fieldset>
<p class="muted regions-source">${ctx.t("Fonti: SRD 5.2.1 Trappole (EN 199–200, IT 227–228), Cercare (EN 187, IT 212), Arnesi da scasso (EN 94, IT 106), In fiamme (EN 178, IT 208), Terreno difficile (EN 14, IT 15).", "Sources: SRD 5.2.1 Traps (EN 199–200, IT 227–228), Search (EN 187, IT 212), Thieves’ Tools (EN 94, IT 106), Burning (EN 178, IT 208), Difficult Terrain (EN 14, IT 15).")}</p>
</div>`;
}
const num = (data, name) => {
  const raw = String(data.get(name) ?? "").trim();
  return raw === "" ? NaN : Number(raw);
};
export function readConfig(data, region) {
  const actions = [];
  const dice = (prefix) => ({
    count: num(data, prefix + "-count"),
    sides: num(data, prefix + "-sides"),
    bonus: num(data, prefix + "-bonus") || 0,
  });
  if (data.has("act-save"))
    actions.push({
      id: "save",
      type: "save",
      ability: data.get("save-ability"),
      dc: num(data, "save-dc"),
      dice: data.has("save-has-damage") ? dice("save") : null,
      damageType: data.get("save-type"),
      onSuccess: data.get("save-success"),
      conditionId: data.get("save-condition") || null,
    });
  if (data.has("act-damage"))
    actions.push({
      id: "damage",
      type: "damage",
      dice: dice("damage"),
      damageType: data.get("damage-type"),
    });
  if (data.has("act-condition"))
    actions.push({ id: "condition", type: "condition", conditionId: data.get("condition-id") });
  if (data.has("act-door"))
    actions.push({
      id: "door",
      type: "door",
      doorId: data.get("door-id"),
      doorState: data.get("door-state"),
    });
  if (data.has("act-message"))
    actions.push({ id: "message", type: "message", text: data.get("message-text") });
  if (data.has("act-teleport"))
    actions.push({ id: "teleport", type: "teleport", targetRegionId: data.get("teleport-target") });
  return {
    name: data.get("name"),
    publicName: data.get("publicName"),
    kind: data.get("kind"),
    visibility: data.get("visibility"),
    shape: {
      x: num(data, "x"),
      y: num(data, "y"),
      width: num(data, "width"),
      height: num(data, "height"),
    },
    difficult: data.has("difficult"),
    trigger: {
      event: data.get("event"),
      who: data.get("who"),
      chance: num(data, "chance"),
      once: data.has("once"),
      stopMovement: data.has("stopMovement"),
    },
    actions,
    trap: data.has("is-trap")
      ? {
          detectDC: num(data, "detect-dc"),
          disarmDC: num(data, "disarm-dc"),
          failTriggers: data.has("fail-triggers"),
        }
      : null,
    status: data.has("is-trap")
      ? { discovered: data.has("discovered"), disarmed: data.has("disarmed") }
      : { discovered: region.status.discovered, disarmed: region.status.disarmed },
  };
}
export function openConfig(ctx, regionId) {
  const region = D.regionOf(ctx.state, regionId);
  if (!region) return;
  const revision = region.revision;
  ctx.dialog(ctx.t(`Regione: ${region.name}`, `Region: ${region.name}`), configBody(ctx, region), {
    submitLabel: ctx.t("Salva regione", "Save region"),
    cancelLabel: ctx.t("Chiudi senza salvare", "Close without saving"),
    onSubmit: (data) => {
      ctx.commit(
        ctx.t("Regione aggiornata", "Region updated"),
        (s) => D.updateRegion(s, regionId, readConfig(data, region), ctx.role, revision),
        PRIVATE,
      );
      ctx.toast(ctx.t("Regione salvata.", "Region saved."));
    },
  });
  const form = globalThis.document?.querySelector("#dialog form");
  if (!form) return;
  form.querySelectorAll("[data-regions-toggle]").forEach((box) => {
    box.addEventListener("change", () => {
      const body = form.querySelector(`[data-regions-body="${box.dataset.regionsToggle}"]`);
      if (body) body.hidden = !box.checked;
    });
  });
  const event = form.querySelector("[data-regions-event]");
  const stop = form.querySelector("[data-regions-stop]");
  event?.addEventListener("change", () => {
    stop.disabled = event.value !== "enter";
    if (stop.disabled) stop.checked = false;
    // SV-37: the reason shows, and stays linked, only while the box is off.
    const why = form.querySelector("#regions-stop-why");
    if (why) why.hidden = !stop.disabled;
    if (stop.disabled) stop.setAttribute("aria-describedby", "regions-stop-why");
    else stop.removeAttribute("aria-describedby");
  });
}
function openDelete(ctx, regionId) {
  const region = D.regionOf(ctx.state, regionId);
  if (!region) return;
  ctx.dialog(
    ctx.t("Elimina regione", "Delete region"),
    `<p>${ctx.t(`Eliminare «${esc(ctx, region.name)}» e i suoi comportamenti? Annulla ultima modifica la ripristina.`, `Delete «${esc(ctx, region.name)}» and its behaviours? Undo last change restores it.`)}</p>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit: () => {
        ctx.commit(
          ctx.t("Regione eliminata", "Region deleted"),
          (s) => D.deleteRegion(s, regionId, ctx.role),
          PRIVATE,
        );
        if (ui.selected === regionId) ui.selected = null;
        if (ui.prepSelected === regionId) ui.prepSelected = null;
      },
    },
  );
}

// ---------------------------------------------------------------- dice fields (dialogs)

function diceModeFields(ctx, prefix, count, sides, known = null) {
  if (known)
    return `<p class="regions-known" data-regions-known="${prefix}">${ctx.t("Facce già registrate", "Faces already recorded")}: <strong>${known.values.join(", ")}</strong> · ${ctx.t("restano valide dopo Annulla: nessun nuovo tiro", "they stay valid after Undo: no new roll")}</p>`;
  const faces = Array.from(
    { length: count },
    (_, i) =>
      `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${sides}<input type="number" name="${prefix}-face${i}" min="1" max="${sides}" step="1" inputmode="numeric"></label>`,
  ).join("");
  return `<label class="field">${ctx.t("Dadi", "Dice")}<select name="${prefix}-mode" data-regions-mode="${prefix}"><option value="digital"${ui.diceMode === "digital" ? " selected" : ""}>${ctx.t("Digitali", "Digital")}</option><option value="physical"${ui.diceMode === "physical" ? " selected" : ""}>${ctx.t("Fisici: inserisco le facce", "Physical: I enter the faces")}</option></select></label><div class="regions-faces" data-regions-faces="${prefix}"${ui.diceMode === "physical" ? "" : " hidden"}>${faces}</div>`;
}
function readDice(data, prefix, count) {
  const mode = data.get(prefix + "-mode") === "physical" ? "physical" : "digital";
  return {
    mode,
    faces:
      mode === "physical"
        ? Array.from({ length: count }, (_, i) => num(data, `${prefix}-face${i}`))
        : null,
  };
}
function bindDiceModes() {
  const form = globalThis.document?.querySelector("#dialog form");
  form?.querySelectorAll("[data-regions-mode]").forEach((select) => {
    const faces = form.querySelector(`[data-regions-faces="${select.dataset.regionsMode}"]`);
    const sync = () => {
      faces.hidden = select.value !== "physical";
      faces.querySelectorAll("input").forEach((input) => (input.required = !faces.hidden));
    };
    select.addEventListener("change", () => {
      ui.diceMode = select.value;
      sync();
      if (!faces.hidden) faces.querySelector("input")?.focus();
    });
    sync();
  });
}

// ---------------------------------------------------------------- DM: run and cancel

export function openExecute(ctx, eventId) {
  const event = D.sliceOf(ctx.state)?.events.find((e) => e.id === eventId);
  if (!event || event.status !== "awaiting-dm") return;
  const actor = ctx.state.actors[event.actorId];
  const plan = event.plan;
  const damageActions = plan.actions.filter(
    (a) => (a.type === "save" || a.type === "damage") && a.dice,
  );
  const conditions = plan.actions.filter((a) => a.conditionId);
  const immunitiesUnknown = conditions.length && !Array.isArray(actor?.conditionImmunities);
  const body = `<p><strong>${esc(ctx, actor?.name)}</strong> ${esc(ctx, causeText(ctx, event.cause))} · ${esc(ctx, plan.name)} · ${eventTime(ctx, event.at)}</p><p class="regions-plan">${esc(ctx, D.planSummary(plan, ctx.lang))}</p>${
    plan.trigger.chance < 100
      ? `<fieldset><legend>${ctx.t(`Probabilità: scatta con ${plan.trigger.chance} o meno su d100`, `Chance: it goes off on ${plan.trigger.chance} or less on d100`)}</legend>${diceModeFields(ctx, "chance", 1, 100)}</fieldset>`
      : ""
  }${damageActions
    .map((a) => {
      const known = D.knownDamageFaces(ctx.state, event.id, a.id);
      return `<fieldset><legend>${ctx.t("Danni", "Damage")} ${a.dice.count}d${a.dice.sides}${a.dice.bonus ? (a.dice.bonus > 0 ? " + " : " − ") + Math.abs(a.dice.bonus) : ""} ${esc(ctx, lbl(ctx, D.damageTypeName(a.damageType)))}${a.type === "save" ? " · " + ctx.t("si applicano dopo il tiro salvezza", "applied after the saving throw") : ""}</legend>${diceModeFields(ctx, "damage-" + a.id, a.dice.count, a.dice.sides, known)}</fieldset>`;
    })
    .join("")}${
    immunitiesUnknown
      ? check(
          "immunity",
          ctx.t(
            `Confermo che ${esc(ctx, actor.name)} non è immune (immunità alle condizioni non registrate sulla scheda)`,
            `I confirm ${esc(ctx, actor.name)} is not immune (condition immunities not recorded on the sheet)`,
          ),
          true,
        )
      : ""
  }<p class="muted">${plan.actions.some((a) => a.type === "save") ? ctx.t("Il tiro salvezza va a chi controlla la creatura, con dadi digitali o fisici; l’esito si applica dopo quel tiro.", "The saving throw goes to the creature’s controller, with digital or physical dice; the outcome applies after that roll.") : ctx.t("Le conseguenze si applicano subito e restano nel Registro.", "The consequences apply now and stay in the Log.")}</p>`;
  ctx.dialog(ctx.t(`Esegui «${plan.name}»`, `Run «${plan.name}»`), body, {
    submitLabel: ctx.t("Esegui", "Run"),
    cancelLabel: ctx.t("Decidi dopo", "Decide later"),
    onSubmit: (data) => {
      const input = {
        chance: plan.trigger.chance < 100 ? readDice(data, "chance", 1) : null,
        damage: Object.fromEntries(
          damageActions.map((a) => [a.id, readDice(data, "damage-" + a.id, a.dice.count)]),
        ),
        immunityConfirmed: immunitiesUnknown ? data.has("immunity") : true,
      };
      commitRolls(
        ctx,
        ctx.t(
          `Evento eseguito: ${plan.publicName || plan.name}`,
          `Event run: ${plan.publicName || plan.name}`,
        ),
        (s) => {
          const run = D.executeEvent(s, eventId, input, ctx.role, rng);
          const chance = run.chance && rollOf(s, run.chance.rollId);
          return chance ? [D.logRoll(s, chance)] : [];
        },
      );
      const after = D.sliceOf(ctx.state).events.find((e) => e.id === eventId);
      ctx.toast(
        after.status === "fizzled"
          ? ctx.t(
              `Non scatta (d100: ${after.chance.value}).`,
              `It does not go off (d100: ${after.chance.value}).`,
            )
          : after.status === "awaiting-roll" && after.attemptId && D.sliceOf(ctx.state)
            ? ctx.t("Eseguito: tiro salvezza richiesto.", "Run: saving throw requested.")
            : ctx.t("Eseguito.", "Run."),
      );
    },
  });
  bindDiceModes();
}
export function openCancel(ctx, eventId) {
  ctx.dialog(
    ctx.t("Annulla evento", "Cancel event"),
    `<p>${ctx.t("Nulla di questo evento si applica: le richieste di tiro ancora aperte scadono. La regione resta com’è; puoi riarmarla.", "Nothing of this event applies: open roll requests expire. The region stays as it is; you can re-arm it.")}</p><label class="field">${ctx.t("Motivo (facoltativo)", "Reason (optional)")}<input name="reason" maxlength="200"></label>`,
    {
      submitLabel: ctx.t("Annulla evento", "Cancel event"),
      cancelLabel: ctx.t("Torna indietro", "Go back"),
      onSubmit: (data) =>
        ctx.commit(
          ctx.t("Evento della scena annullato dal DM", "Scene event cancelled by the DM"),
          (s) => D.cancelEvent(s, eventId, data.get("reason"), ctx.role),
        ),
    },
  );
}

// ---------------------------------------------------------------- checks: search, disarm

export function openCheck(ctx, kind, actorId, regionId = null) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  let profile;
  try {
    profile = D.checkProfile(ctx.state, actorId, kind);
  } catch (error) {
    showError(ctx, error);
    return;
  }
  const count = profile.rollMode === "normal" ? 1 : 2;
  const region = regionId && D.regionOf(ctx.state, regionId);
  const sign = profile.bonus >= 0 ? "+" : "−";
  const title =
    kind === "search"
      ? ctx.t(`Cerca trappole · ${actor.name}`, `Search for traps · ${actor.name}`)
      : ctx.t(
          `Disinnesca «${region?.publicName}» · ${actor.name}`,
          `Disarm «${region?.publicName}» · ${actor.name}`,
        );
  const body = `<p>${kind === "search" ? ctx.t(`Azione Cercare: prova di Saggezza (Percezione) ${sign}${Math.abs(profile.bonus)}. Esamini ciò che si trova entro ${D.SEARCH_METERS} m.`, `Search action: Wisdom (Perception) check ${sign}${Math.abs(profile.bonus)}. You examine what lies within ${D.SEARCH_METERS} m.`) : ctx.t(`Arnesi da scasso (azione Utilizzo): prova di Destrezza ${sign}${Math.abs(profile.bonus)} contro la CD della trappola.`, `Thieves’ Tools (Utilize action): Dexterity check ${sign}${Math.abs(profile.bonus)} against the trap’s DC.`)}</p>${ctx.state.combat?.active ? `<p class="muted">${ctx.t("In combattimento spende l’azione del turno.", "In combat it takes this turn’s action.")}</p>` : ""}${count === 2 ? `<p class="muted">${ctx.t("Svantaggio", "Disadvantage")}: ${esc(ctx, profile.reasons.map((r) => lbl(ctx, r)).join(", "))} · ${ctx.t("due d20, si tiene il più basso", "two d20, keep the lower")}</p>` : ""}${diceModeFields(ctx, "check", count, 20)}<p class="muted">${ctx.t("Inserisci le facce naturali: il modificatore si aggiunge una volta. Esc lascia tutto com’è.", "Enter natural faces: the modifier is added once. Escape leaves everything as it is.")}</p>`;
  ctx.dialog(title, body, {
    submitLabel: ctx.t("Tira", "Roll"),
    onSubmit: (data) => {
      const dice = readDice(data, "check", count);
      let result = null;
      commitRolls(
        ctx,
        kind === "search"
          ? ctx.t(`Ricerca di trappole: ${actor.name}`, `Trap search: ${actor.name}`)
          : ctx.t(`Disinnesco: ${actor.name}`, `Disarm: ${actor.name}`),
        (s) => {
          result =
            kind === "search"
              ? D.searchForTraps(s, { actorId, ...dice, rng }, ctx.role)
              : D.disarmTrap(s, { actorId, regionId, ...dice, rng }, ctx.role);
          return [D.logRoll(s, rollOf(s, result.rollId))];
        },
      );
      ctx.toast(checkText(ctx, result));
    },
  });
  bindDiceModes();
}
function checkText(ctx, check) {
  if (!check) return "";
  const how =
    check.mode === "physical" ? ctx.t("fisico", "physical") : ctx.t("digitale", "digital");
  if (check.kind === "lock") {
    if (check.method === "key") return ctx.t("Aperta con la chiave.", "Unlocked with the key.");
    const what =
      check.method === "force" ? ctx.t("Forza", "Strength") : ctx.t("Scasso", "Lockpicking");
    return `${what} ${check.total} (${how}) ${ctx.t("contro CD", "vs DC")} ${check.dc}: ${check.success ? ctx.t("la serratura cede: la porta non è più chiusa a chiave", "the lock gives way: the door is no longer locked") : ctx.t("non cede; puoi riprovare", "it holds; you may try again")}`;
  }
  if (check.kind === "search") {
    const found = check.found.map((id) => D.regionOf(ctx.state, id)?.publicName).filter(Boolean);
    return `${ctx.t("Ricerca", "Search")} ${check.total} (${how}): ${found.length ? ctx.t("trovato", "found") + " «" + found.join("», «") + "»" : ctx.t("niente di sospetto", "nothing suspicious")}`;
  }
  return `${ctx.t("Disinnesco", "Disarm")} ${check.total} (${how}): ${check.success ? ctx.t("trappola disinnescata", "trap disarmed") : check.triggered ? ctx.t("fallito, la trappola scatta", "failed, the trap goes off") : ctx.t("non ci riesci; puoi riprovare", "you fail; you may try again")}`;
}
export function openCorrect(ctx, checkId) {
  const check = D.sliceOf(ctx.state)?.checks.find((c) => c.id === checkId);
  const roll = D.rollsOf(ctx.state)?.rolls.find((r) => r.id === check?.rollId);
  if (!check || !roll) return;
  ctx.dialog(
    ctx.t("Correggi le facce del dado fisico", "Correct the physical die faces"),
    `<p>${esc(ctx, nameOf(ctx, check.actorId))} · [${esc(ctx, roll.values.join(", "))}] = ${check.total}</p>${roll.values.map((v, i) => `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d20<input type="number" name="face${i}" min="1" max="20" value="${v}" required inputmode="numeric"></label>`).join("")}<label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label><p class="muted">${ctx.t("Le facce precedenti restano nella cronologia del tiro.", "The earlier faces stay in the roll history.")}</p>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (data) => {
        let result = null;
        commitRolls(ctx, ctx.t("Correzione del tiro", "Roll correction"), (s) => {
          result = D.correctCheck(
            s,
            {
              checkId,
              faces: roll.values.map((_, i) => num(data, "face" + i)),
              reason: data.get("reason"),
            },
            ctx.role,
          );
          return [
            D.logRoll(s, rollOf(s, result.rollId), {
              status: "corrected",
              correctionReason: result.corrected,
            }),
          ];
        });
        ctx.toast(checkText(ctx, result));
      },
    },
  );
}

// ---------------------------------------------------------------- Creature tab panel

// What a player may call an event: its public name once run (or for a passage), otherwise
// a generic «scene event» that does not reveal a trap the DM chose not to run.
const playerTitle = (ctx, event) =>
  event.executedAt ||
  event.plan.visibility === "shared" ||
  event.status === "awaiting-mover" ||
  event.result?.passage
    ? event.plan.publicName || event.plan.name
    : ctx.t("Evento della scena", "Scene event");
function eventCard(ctx, event, dm) {
  const title = dm ? event.plan.name : playerTitle(ctx, event);
  const who = nameOf(ctx, event.actorId);
  const attempt = (ctx.state.combatAttempts ?? []).find((a) => a.id === event.attemptId);
  const save = attempt?.requests.find((r) => r.kind === "save" && r.status === "pending");
  let body = "";
  if (dm) {
    body = `<p class="regions-plan">${esc(ctx, D.planSummary(event.plan, ctx.lang))}</p>${event.status === "awaiting-roll" ? `<p class="muted">${ctx.t(`Aspetta il tiro salvezza di ${esc(ctx, who)}.`, `Waiting for ${esc(ctx, who)}’s saving throw.`)}</p>` : event.status === "awaiting-mover" ? `<p class="muted">${ctx.t(`Aspetta la scelta di ${esc(ctx, who)}.`, `Waiting for ${esc(ctx, who)}’s choice.`)}</p>` : ""}<div class="toolbar">${event.status === "awaiting-dm" ? button(`data-regions-run="${esc(ctx, event.id)}"`, ctx.t("Esegui…", "Run…"), "primary") : ""}${event.status === "awaiting-roll" && save && ctx.state.actors[save.actorId]?.owner === "dm" ? button(`data-regions-roll="${esc(ctx, event.id)}"`, ctx.t("Tira il tiro salvezza", "Roll the saving throw")) : ""}${event.status === "awaiting-mover" ? button(`data-regions-pass="${esc(ctx, event.id)}" data-accept="yes"`, ctx.t("Prendi il passaggio", "Take the passage")) : ""}${button(`data-regions-cancel="${esc(ctx, event.id)}"`, ctx.t("Annulla evento", "Cancel event"), "quiet")}</div>`;
  } else if (event.status === "awaiting-dm")
    body = `<p>${ctx.t(`${esc(ctx, who)} si ferma: qualcosa accade qui. Il DM sta decidendo.`, `${esc(ctx, who)} stops: something happens here. The DM is deciding.`)}</p>`;
  else if (event.status === "awaiting-roll")
    body = `<p>${ctx.t(`Tiro salvezza su ${esc(ctx, lbl(ctx, D.abilityName(save?.ability ?? event.plan.actions.find((a) => a.type === "save")?.ability)))} richiesto.`, `${esc(ctx, lbl(ctx, D.abilityName(save?.ability ?? event.plan.actions.find((a) => a.type === "save")?.ability)))} saving throw requested.`)}</p>${save ? `<div class="toolbar">${button(`data-regions-roll="${esc(ctx, event.id)}"`, ctx.t("Tira il tiro salvezza", "Roll the saving throw"), "primary")}</div>` : ""}`;
  else if (event.status === "awaiting-mover")
    body = `<p>${ctx.t(`Vuoi che ${esc(ctx, who)} prenda «${esc(ctx, title)}»?`, `Should ${esc(ctx, who)} take «${esc(ctx, title)}»?`)}</p><div class="toolbar">${button(`data-regions-pass="${esc(ctx, event.id)}" data-accept="yes"`, ctx.t("Prendi il passaggio", "Take the passage"), "primary")}${button(`data-regions-pass="${esc(ctx, event.id)}" data-accept="no"`, ctx.t("Resta qui", "Stay here"))}</div>`;
  return `<article class="regions-event" data-regions-event-card="${esc(ctx, event.id)}" data-status="${event.status}"><h4>«${esc(ctx, title)}» · ${esc(ctx, who)} <small>${esc(ctx, statusText(ctx, event.status))}</small></h4>${body}</article>`;
}
function recentCard(ctx, event, dm) {
  const title = dm ? event.plan.name : playerTitle(ctx, event);
  const quiet = !dm && !event.executedAt && ["cancelled", "fizzled"].includes(event.status);
  const outcome = quiet
    ? ctx.t("nulla accade", "nothing happens")
    : [statusText(ctx, event.status), resultText(ctx, event)].filter(Boolean).join(" · ");
  return `<li class="regions-recent" data-regions-recent="${esc(ctx, event.id)}"><span><strong>«${esc(ctx, title)}»</strong> · ${esc(ctx, nameOf(ctx, event.actorId))} · ${esc(ctx, outcome)}</span></li>`;
}
/**
 * Creatures that took a passage to a scene that is not the active one (Stairways across
 * scenes, FVT-086): the DM activates that scene from here; the player reads where they are.
 */
export function arrivals(ctx) {
  const latest = new Map();
  for (const event of D.eventsFor(ctx.state, ctx.role))
    if (event.result?.passage) latest.set(event.actorId, event);
  return [...latest.values()].filter((event) => {
    const to = event.result.passage.toSceneId;
    const scene = ctx.state.scenes.find((row) => row.id === to);
    return (
      to !== ctx.state.activeSceneId &&
      (scene?.tokens ?? []).some((t) => t.actorId === event.actorId)
    );
  });
}
function arrivalCard(ctx, event) {
  const to = event.result.passage.toSceneId;
  const where = esc(ctx, sceneName(ctx, to));
  const who = esc(ctx, nameOf(ctx, event.actorId));
  return `<article class="regions-event" data-regions-arrival="${esc(ctx, event.id)}" data-status="applied"><h4>${ctx.t(`${who} è in «${where}»`, `${who} is in «${where}»`)}</h4>${ctx.role === "dm" ? `<p class="muted">${ctx.t("Il Tavolo mostra ancora l’altra scena: attivala quando il gruppo la raggiunge.", "The Table still shows the other scene: activate it when the party gets there.")}</p><div class="toolbar">${button(`data-regions-activate="${esc(ctx, to)}"`, ctx.t(`Attiva «${where}» al Tavolo`, `Activate «${where}» at the Table`), "primary")}</div>` : `<p class="muted">${ctx.t("Il DM attiverà quella scena al Tavolo.", "The DM will activate that scene at the Table.")}</p>`}</article>`;
}
function checkLine(ctx, check) {
  const roll = D.rollsOf(ctx.state)?.rolls.find((r) => r.id === check.rollId);
  const correct =
    roll?.mode === "physical" && check.by === ctx.role
      ? button(
          `data-regions-correct="${esc(ctx, check.id)}"`,
          ctx.t("Correggi", "Correct"),
          "quiet",
        )
      : "";
  return `<li class="regions-check-result" data-regions-check="${esc(ctx, check.id)}"><span>${esc(ctx, checkText(ctx, check))}${check.corrected ? " · " + ctx.t("corretto", "corrected") + ": " + esc(ctx, check.corrected) : ""}</span>${correct}</li>`;
}
// B62: the one Search action of B46 (knowledge), when that area is built.
const unifiedSearch = (ctx) => Boolean(ctx.registry?.get("token-menu", "knowledge-search"));
function trapTools(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor)) return "";
  const scene = D.activeScene(ctx.state);
  if (!(scene?.tokens ?? []).some((t) => t.actorId === actorId)) return "";
  const combat = ctx.state.combat?.active;
  const turn = !combat || ctx.state.combat.order?.[ctx.state.combat.turn] === actorId;
  const why = !turn
    ? ctx.t("Nel turno di questa creatura.", "On this creature’s turn.")
    : combat && !actor.action
      ? ctx.t("L’azione di questo turno è già spesa.", "This turn’s action is already spent.")
      : "";
  const disarm = D.disarmable(ctx.state, actorId);
  const tools = D.hasThievesTools(actor);
  const last = (D.sliceOf(ctx.state)?.checks ?? [])
    .filter((c) => c.actorId === actorId)
    .slice(-2)
    .reverse();
  // B62: with B46 the Table has one Search action («Cerca», Creature tab and token menu) that
  // also checks these traps; this block keeps disarming and the latest checks.
  const search = unifiedSearch(ctx)
    ? ""
    : button(
        `data-regions-search="${esc(ctx, actorId)}"${why ? ` aria-disabled="true" data-why="${esc(ctx, why)}" aria-describedby="${whyId("tools-" + actorId)}"` : ""}`,
        ctx.t("Cerca trappole", "Search for traps"),
      );
  return `<div class="regions-tools" data-regions-tools="${esc(ctx, actorId)}"><div class="toolbar">${search}${disarm
    .map((r) => {
      // PR-29: an open scene event on this trap blocks the disarm, and the button says so.
      const block = why || disarmBlock(ctx, actorId, r.id);
      return (
        button(
          `data-regions-disarm="${esc(ctx, r.id)}" data-actor="${esc(ctx, actorId)}"${block === why ? (why ? ` aria-disabled="true" data-why="${esc(ctx, why)}" aria-describedby="${whyId("tools-" + actorId)}"` : "") : whyAttrs(ctx, "disarm-" + r.id, block)}`,
          ctx.t(`Disinnesca «${esc(ctx, r.publicName)}»`, `Disarm «${esc(ctx, r.publicName)}»`),
        ) + (block && block !== why ? whyNote(ctx, "disarm-" + r.id, block) : "")
      );
    })
    .join(
      "",
    )}</div>${why ? `<p class="muted" id="${whyId("tools-" + actorId)}">${esc(ctx, why)}</p>` : ""}${disarm.length && !tools ? `<p class="muted">${ctx.t("Per disinnescare servono gli Arnesi da scasso nell’inventario di questa creatura.", "Disarming needs Thieves’ Tools in this creature’s inventory.")}</p>` : ""}${lockTools(ctx, actorId, tools)}${last.length ? `<ul class="regions-list">${last.map((c) => checkLine(ctx, c)).join("")}</ul>` : ""}</div>`;
}
// PR-20 (BG3/DOS2 locks): a locked door within reach shows its DC and the ways to open it
// next to the other interactions of the creature (key, pick the lock, force it).
const COST_TEXT = {
  action: L("un’azione", "an action"),
  bonus: L("un’azione bonus", "a bonus action"),
  free: L("nessuna azione", "no action"),
};
function lockTools(ctx, actorId, tools) {
  const doors = D.lockedDoorsNear(ctx.state, actorId, ctx.role);
  if (!doors.length) return "";
  return `<section class="regions-locks" aria-label="${ctx.t("Porte chiuse a chiave vicine", "Nearby locked doors")}">${doors
    .map(({ door, lock, hasKey }) => {
      const dc = Number.isFinite(lock?.dc) ? lock.dc : null;
      const cost = lbl(ctx, COST_TEXT[lock?.cost ?? "action"]);
      const can = (method) => dc !== null && (lock.check === "both" || lock.check === method);
      const facts = [
        dc !== null
          ? `${ctx.t("CD", "DC")} ${dc}`
          : ctx.t("nessuna prova possibile", "no check possible"),
        lock?.key ? `${ctx.t("chiave", "key")}: ${lock.key}` : "",
        dc !== null ? `${ctx.t("costa", "costs")} ${cost}` : "",
      ].filter(Boolean);
      return `<article class="regions-lock" data-regions-lock="${esc(ctx, door.id)}"><h4>${ctx.t("Porta chiusa a chiave", "Locked door")}${door.secret ? ` · ${ctx.t("segreta", "secret")}` : ""}</h4><p class="muted">${esc(ctx, facts.join(" · "))}</p><div class="toolbar">${hasKey ? button(`data-regions-lock-open="key" data-door="${esc(ctx, door.id)}" data-actor="${esc(ctx, actorId)}"`, ctx.t(`Apri con «${esc(ctx, lock.key)}»`, `Open with «${esc(ctx, lock.key)}»`), "primary") : ""}${can("lockpick") ? button(`data-regions-lock-open="lockpick" data-door="${esc(ctx, door.id)}" data-actor="${esc(ctx, actorId)}"${tools ? "" : whyAttrs(ctx, "pick-" + door.id, ctx.t("Servono gli Arnesi da scasso: aggiungili all’inventario della creatura.", "Thieves’ Tools are needed: add them to the creature’s inventory."))}`, ctx.t(`Scassina (CD ${dc})`, `Pick the lock (DC ${dc})`)) + (tools ? "" : whyNote(ctx, "pick-" + door.id, ctx.t("Servono gli Arnesi da scasso: aggiungili all’inventario della creatura.", "Thieves’ Tools are needed: add them to the creature’s inventory."))) : ""}${can("force") ? button(`data-regions-lock-open="force" data-door="${esc(ctx, door.id)}" data-actor="${esc(ctx, actorId)}"`, ctx.t(`Sfonda (Forza, CD ${dc})`, `Force it (Strength, DC ${dc})`)) : ""}</div>${!hasKey && dc === null ? `<p class="muted">${ctx.t("Si apre solo con la chiave giusta o se il DM la apre.", "It opens only with the right key or if the DM opens it.")}</p>` : ""}</article>`;
    })
    .join("")}</section>`;
}
export function openLockCheck(ctx, method, actorId, doorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  if (method === "key") {
    let result = null;
    try {
      ctx.commit(
        ctx.t(
          `Porta aperta con la chiave: ${actor.name}`,
          `Door unlocked with the key: ${actor.name}`,
        ),
        (s) => {
          result = D.openLock(s, { actorId, doorId, method: "key" }, ctx.role);
        },
      );
      if (result)
        ctx.toast(
          ctx.t(
            "La serratura scatta: la porta ora si apre.",
            "The lock clicks: the door now opens.",
          ),
        );
    } catch (error) {
      showError(ctx, error);
    }
    return;
  }
  const near = D.lockedDoorsNear(ctx.state, actorId, ctx.role).find((r) => r.door.id === doorId);
  let profile;
  try {
    if (!near)
      throw Object.assign(new Error("far"), {
        it: "Avvicinati alla porta.",
        en: "Move next to the door.",
      });
    profile = D.checkProfile(ctx.state, actorId, method === "lockpick" ? "disarm" : "force");
  } catch (error) {
    showError(ctx, error);
    return;
  }
  const dc = near.lock?.dc;
  const count = profile.rollMode === "normal" ? 1 : 2;
  const sign = profile.bonus >= 0 ? "+" : "−";
  const body = `<p>${method === "lockpick" ? ctx.t(`Arnesi da scasso (azione Utilizzare): prova di Destrezza ${sign}${Math.abs(profile.bonus)} contro CD ${dc}.`, `Thieves’ Tools (Utilize action): Dexterity check ${sign}${Math.abs(profile.bonus)} against DC ${dc}.`) : ctx.t(`Forzare la porta: prova di Forza (Atletica) ${sign}${Math.abs(profile.bonus)} contro CD ${dc}.`, `Force the door: Strength (Athletics) check ${sign}${Math.abs(profile.bonus)} against DC ${dc}.`)}</p>${ctx.state.combat?.active ? `<p class="muted">${ctx.t("In combattimento costa", "In combat it costs")} ${esc(ctx, lbl(ctx, COST_TEXT[near.lock?.cost ?? "action"]))}.</p>` : ""}${count === 2 ? `<p class="muted">${ctx.t("Svantaggio", "Disadvantage")}: ${esc(ctx, profile.reasons.map((r) => lbl(ctx, r)).join(", "))}</p>` : ""}${diceModeFields(ctx, "check", count, 20)}`;
  ctx.dialog(
    method === "lockpick"
      ? ctx.t(`Scassina la porta · ${actor.name}`, `Pick the lock · ${actor.name}`)
      : ctx.t(`Sfonda la porta · ${actor.name}`, `Force the door · ${actor.name}`),
    body,
    {
      submitLabel: ctx.t("Tira", "Roll"),
      onSubmit: (data) => {
        const dice = readDice(data, "check", count);
        let result = null;
        commitRolls(
          ctx,
          method === "lockpick"
            ? ctx.t(`Scasso: ${actor.name}`, `Lockpicking: ${actor.name}`)
            : ctx.t(`Porta forzata: ${actor.name}`, `Door forced: ${actor.name}`),
          (s) => {
            result = D.openLock(s, { actorId, doorId, method, ...dice, rng }, ctx.role);
            return [D.logRoll(s, rollOf(s, result.rollId))];
          },
        );
        ctx.toast(checkText(ctx, result));
      },
    },
  );
  bindDiceModes();
}
/**
 * Review (B41-rf, F6): the scene's regions as a list, like Foundry's Region Legend next to
 * the Regions tool (FVT-082): a keyboard or screen-reader DM picks a region here, then
 * «Configura…» (or the arrows on the map) acts on it. Open while nothing is chosen.
 */
function legend(ctx, scene, open) {
  const list = scene ? D.regionsIn(ctx.state, scene.id) : [];
  if (!list.length) return "";
  return `<details class="regions-history regions-legend"${open ? " open" : ""}><summary>${ctx.t("Regioni della scena", "Regions of the scene")} (${list.length})</summary><ul class="regions-list">${list
    .map((r) => {
      const on = r.id === ui.selected;
      const state = r.status.spent
        ? " · " + ctx.t("scattata", "spent")
        : r.status.disarmed
          ? " · " + ctx.t("disinnescata", "disarmed")
          : "";
      return `<li>${button(`data-regions-choose="${esc(ctx, r.id)}" aria-pressed="${on}"`, `${esc(ctx, r.name)} · ${esc(ctx, lbl(ctx, D.kindName(r.kind)))}${state}`, "quiet" + (on ? " active" : ""))}</li>`;
    })
    .join("")}</ul></details>`;
}
export function panel(ctx, tv) {
  const dm = ctx.role === "dm";
  const selected = tv?.selectedActorId;
  const pending = D.pendingEvents(ctx.state);
  const mine = pending.filter((e) =>
    canControlActor(ctx.state.actors[e.actorId], ctx.role, ctx.state),
  );
  const shown = dm ? pending : mine;
  const recent = D.eventsFor(ctx.state, ctx.role)
    .filter((e) => !["awaiting-dm", "awaiting-roll", "awaiting-mover"].includes(e.status))
    .slice(-3)
    .reverse();
  let regionCard = "";
  if (dm && tv?.mode === TOOL) {
    const region = ui.selected && D.regionOf(ctx.state, ui.selected);
    regionCard = region
      ? `<article class="regions-selected" data-regions-selected="${esc(ctx, region.id)}"><h4>${esc(ctx, region.name)} <small>${esc(ctx, lbl(ctx, D.kindName(region.kind)))} · ${esc(ctx, lbl(ctx, D.eventName(region.trigger.event)))}</small></h4><p class="regions-plan">${esc(ctx, D.planSummary(region, ctx.lang) || ctx.t("Nessuna azione", "No action"))}${region.difficult ? " · " + ctx.t("terreno difficile", "difficult terrain") : ""}</p><p class="muted">${[
          region.visibility === "hidden"
            ? ctx.t("Nascosta ai giocatori", "Hidden from players")
            : ctx.t("Visibile al gruppo", "Visible to the party"),
          region.status.spent
            ? ctx.t("Scattata", "Spent")
            : region.status.disarmed
              ? ctx.t("Disinnescata", "Disarmed")
              : ctx.t("Armata", "Armed"),
          region.status.discovered ? ctx.t("individuata dal gruppo", "found by the party") : "",
        ]
          .filter(Boolean)
          .join(
            " · ",
          )}</p><div class="toolbar">${button(`data-regions-config="${esc(ctx, region.id)}"`, ctx.t("Configura…", "Configure…"), "primary")}${region.status.spent || region.status.disarmed ? button(`data-regions-rearm="${esc(ctx, region.id)}"`, ctx.t("Riarma", "Re-arm")) : ""}${button(`data-regions-template="${esc(ctx, region.id)}"`, ctx.t("Salva come trappola riutilizzabile", "Save as reusable trap"), "quiet")}${button(`data-regions-delete="${esc(ctx, region.id)}"`, ctx.t("Elimina…", "Delete…"), "quiet")}</div></article>`
      : `<p class="muted">${ctx.t("Trascina sulla mappa per disegnare una regione, oppure:", "Drag on the map to draw a region, or:")}</p><div class="toolbar">${button("data-regions-new", ctx.t("Nuova regione al centro", "New region at the centre"))}${button("data-regions-conditions", ctx.t("Condizioni della scena…", "Scene conditions…"))}</div>`;
    regionCard += legend(ctx, tv.scene, !region);
  }
  // Players always find Search on their own creature; the DM with the region tool open.
  const tools = selected && (!dm || tv?.mode === TOOL) ? trapTools(ctx, selected) : "";
  const away = arrivals(ctx);
  if (!shown.length && !regionCard && !tools && !recent.length && !away.length) return "";
  return `<div class="regions-panel" data-regions-panel>${away.map((e) => arrivalCard(ctx, e)).join("")}${regionCard}${shown.length ? `<section aria-label="${ctx.t("Eventi in attesa", "Pending events")}">${shown.map((e) => eventCard(ctx, e, dm)).join("")}</section>` : ""}${tools}${recent.length ? `<details class="regions-history"${dm ? "" : " open"}><summary>${ctx.t("Ultimi eventi", "Latest events")}</summary><ul class="regions-list">${recent.map((e) => recentCard(ctx, e, dm)).join("")}</ul></details>` : ""}</div>`;
}
export function bindPanel(el, ctx, table) {
  const on = (selector, handler) =>
    el.querySelectorAll(selector).forEach((b) => b.addEventListener("click", () => handler(b)));
  on("[data-regions-run]", (b) => openExecute(ctx, b.dataset.regionsRun));
  on("[data-regions-cancel]", (b) => openCancel(ctx, b.dataset.regionsCancel));
  on("[data-regions-roll]", (b) => openSave(ctx, b.dataset.regionsRoll));
  on("[data-regions-pass]", (b) => answer(ctx, b.dataset.regionsPass, b.dataset.accept === "yes"));
  on("[data-regions-activate]", (b) =>
    run(ctx, ctx.t("Scena attivata al Tavolo", "Scene activated at the Table"), (s) => {
      if (s.combat?.active) D.fail("Concludi prima il combattimento.", "End the combat first.");
      activateScene(s, b.dataset.regionsActivate, ctx.role);
    }),
  );
  on("[data-regions-choose]", (b) => {
    ui.selected = b.dataset.regionsChoose;
    ctx.render();
    // The keyboard continues on the chosen region's card.
    queueMicrotask(() =>
      globalThis.document?.querySelector("[data-regions-selected] [data-regions-config]")?.focus(),
    );
  });
  on("[data-regions-config]", (b) => openConfig(ctx, b.dataset.regionsConfig));
  on("[data-regions-delete]", (b) => openDelete(ctx, b.dataset.regionsDelete));
  on("[data-regions-rearm]", (b) => rearm(ctx, b.dataset.regionsRearm));
  on("[data-regions-template]", (b) => saveTemplate(ctx, b.dataset.regionsTemplate));
  on("[data-regions-conditions]", () => openSceneConditions(ctx, table?.scene?.id));
  on("[data-regions-new]", () => {
    const scene = table?.scene ?? D.activeScene(ctx.state);
    const g = scene.gridSize * 2;
    createAndConfigure(
      ctx,
      scene.id,
      { x: scene.width / 2 - g / 2, y: scene.height / 2 - g / 2, width: g, height: g },
      (id) => (ui.selected = id),
    );
  });
  on("[data-regions-search]", (b) => {
    if (b.getAttribute("aria-disabled") === "true") return ctx.toast(b.dataset.why, true);
    openCheck(ctx, "search", b.dataset.regionsSearch);
  });
  on("[data-regions-disarm]", (b) => {
    if (b.getAttribute("aria-disabled") === "true") return ctx.toast(b.dataset.why, true);
    openCheck(ctx, "disarm", b.dataset.actor, b.dataset.regionsDisarm);
  });
  on("[data-regions-correct]", (b) => openCorrect(ctx, b.dataset.regionsCorrect));
  on("[data-regions-lock-open]", (b) => {
    if (b.getAttribute("aria-disabled") === "true") return ctx.toast(b.dataset.why, true);
    openLockCheck(ctx, b.dataset.regionsLockOpen, b.dataset.actor, b.dataset.door);
  });
}
function openSave(ctx, eventId) {
  const event = D.sliceOf(ctx.state)?.events.find((e) => e.id === eventId);
  const attempt = (ctx.state.combatAttempts ?? []).find((a) => a.id === event?.attemptId);
  const save = attempt?.requests.find((r) => r.kind === "save" && r.status === "pending");
  if (!save) return openCombatRequests(ctx, event?.attemptId ?? "");
  openRoll(ctx, attempt.id, save.id);
}
export function answer(ctx, eventId, accept) {
  run(
    ctx,
    accept
      ? ctx.t("Passaggio preso", "Passage taken")
      : ctx.t("Passaggio rifiutato", "Passage declined"),
    (s) => D.answerPassage(s, eventId, accept, ctx.role),
  );
}
function rearm(ctx, regionId) {
  run(
    ctx,
    ctx.t("Regione riarmata", "Region re-armed"),
    (s) => D.rearmRegion(s, regionId, ctx.role),
    PRIVATE,
  );
}
function saveTemplate(ctx, regionId) {
  if (
    run(
      ctx,
      ctx.t("Trappola salvata nella raccolta", "Trap saved to the collection"),
      (s) => D.saveAsTemplate(s, regionId, ctx.role),
      PRIVATE,
    )
  )
    ctx.toast(
      ctx.t(
        "Salvata in Preparazione → Regioni e trappole → Trappole riutilizzabili.",
        "Saved in Preparation → Regions and traps → Reusable traps.",
      ),
    );
}

// ---------------------------------------------------------------- Preparation section

function prepScene(ctx) {
  const scenes = ctx.state.scenes;
  if (!scenes.some((s) => s.id === ui.prepScene))
    ui.prepScene = ctx.state.activeSceneId ?? scenes[0]?.id;
  return scenes.find((s) => s.id === ui.prepScene) ?? null;
}
function prepMap(ctx, scene) {
  const grid = scene.gridSize;
  const regions = D.regionsIn(ctx.state, scene.id);
  return `<svg class="regions-prep-map" viewBox="0 0 ${scene.width} ${scene.height}" role="application" tabindex="0" data-regions-prep-map aria-label="${esc(ctx, ctx.t("Mappa delle regioni. Clic per scegliere una regione; con Disegna, trascina per crearne una. Frecce spostano la regione scelta, Invio la configura.", "Region map. Click to choose a region; with Draw, drag to create one. Arrow keys move the chosen region, Enter configures it."))}" preserveAspectRatio="xMidYMid meet">${renderSceneBase(scene, ctx)}<defs><pattern id="regions-prep-grid" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M ${grid} 0 H 0 V ${grid}" fill="none" stroke="#ece7d0" stroke-opacity=".18"/></pattern></defs><rect width="${scene.width}" height="${scene.height}" fill="url(#regions-prep-grid)"/>${HATCH}${renderSpatialOverlay(scene, ctx)}${(scene.tokens ?? []).map((t) => `<circle class="regions-prep-token" cx="${t.x}" cy="${t.y}" r="14"><title>${esc(ctx, nameOf(ctx, t.actorId))}</title></circle>`).join("")}${regions
    .map(
      (r) =>
        `<g class="regions-shape regions-${KIND_CLASS[r.kind] ?? "area"}${r.visibility === "hidden" ? " is-hidden" : ""}${r.status.spent ? " is-spent" : ""}${r.status.disarmed ? " is-disarmed" : ""}${ui.prepSelected === r.id ? " is-selected" : ""}" data-region="${esc(ctx, r.id)}"><title>${esc(ctx, r.name)}</title><rect x="${r.shape.x}" y="${r.shape.y}" width="${r.shape.width}" height="${r.shape.height}" rx="4"/>${r.difficult ? `<rect class="regions-hatch" x="${r.shape.x}" y="${r.shape.y}" width="${r.shape.width}" height="${r.shape.height}"/>` : ""}<text class="regions-label" x="${r.shape.x + 6}" y="${r.shape.y + 18}">${esc(ctx, r.name)}</text></g>`,
    )
    .join("")}<g data-regions-prep-live></g></svg>`;
}
export function renderPrep(ctx) {
  prime(ctx);
  const slice = D.sliceOf(ctx.state);
  if (!slice)
    return `<p class="error">${ctx.t("Dati delle regioni non disponibili.", "Region data unavailable.")}</p>`;
  const scene = prepScene(ctx);
  if (!scene) return `<p class="empty-state">${ctx.t("Nessuna scena.", "No scene.")}</p>`;
  const regions = D.regionsIn(ctx.state, scene.id);
  if (ui.prepSelected && !regions.some((r) => r.id === ui.prepSelected)) ui.prepSelected = null;
  const selected = ui.prepSelected && D.regionOf(ctx.state, ui.prepSelected);
  const events = slice.events.slice(-10).reverse();
  return `<div class="regions-prep" data-regions-prep>
<p class="muted">${ctx.t("Aree con comportamenti: quando una creatura entra, esce, inizia o finisce il turno, la regione propone al DM le sue azioni (tiro salvezza, danni, condizione, porta, messaggio, scale). Al Tavolo lo stesso strumento sta nella barra a sinistra, gruppo Strumenti del DM.", "Areas with behaviours: when a creature enters, exits, starts or ends its turn, the region proposes its actions to the DM (saving throw, damage, condition, door, message, stairs). At the Table the same tool is in the left toolbar, DM tools group.")}</p>
<div class="regions-prep-bar"><label class="field">${ctx.t("Scena", "Scene")}<select data-regions-scene>${ctx.state.scenes.map((s) => `<option value="${esc(ctx, s.id)}"${s.id === scene.id ? " selected" : ""}>${esc(ctx, s.name)}${s.id === ctx.state.activeSceneId ? " · " + ctx.t("attiva", "active") : ""}</option>`).join("")}</select></label><div class="toolbar">${button(`data-regions-draw aria-pressed="${ui.prepDraw}"`, ctx.t("Disegna regione", "Draw region"), ui.prepDraw ? "active" : "")}${button("data-regions-prep-new", ctx.t("Nuova regione al centro", "New region at the centre"))}${button("data-regions-prep-conditions", ctx.t("Condizioni della scena…", "Scene conditions…"))}</div></div>
<div class="regions-prep-layout"><div class="regions-prep-canvas">${prepMap(ctx, scene)}<p class="muted" data-regions-prep-hint role="status">${ui.prepDraw ? ctx.t("Trascina sulla mappa per disegnare la regione.", "Drag on the map to draw the region.") : ctx.t("Clic su una regione per sceglierla.", "Click a region to choose it.")}</p></div>
<div class="regions-prep-side"><section><h3>${ctx.t("Regioni della scena", "Regions of the scene")} <span class="badge">${regions.length}</span></h3>${regions.length ? `<ul class="regions-list">${regions.map((r) => `<li><button type="button" class="button quiet${r.id === ui.prepSelected ? " active" : ""}" data-regions-pick="${esc(ctx, r.id)}" aria-pressed="${r.id === ui.prepSelected}">${esc(ctx, r.name)} · ${esc(ctx, lbl(ctx, D.kindName(r.kind)))}${r.status.spent ? " · " + ctx.t("scattata", "spent") : r.status.disarmed ? " · " + ctx.t("disinnescata", "disarmed") : ""}</button></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna regione: disegnane una o piazza una trappola salvata.", "No region: draw one or place a saved trap.")}</p>`}</section>
${selected ? `<section class="regions-selected" data-regions-selected="${esc(ctx, selected.id)}"><h3>${esc(ctx, selected.name)}</h3><p class="regions-plan">${esc(ctx, lbl(ctx, D.eventName(selected.trigger.event)))} · ${esc(ctx, D.planSummary(selected, ctx.lang) || ctx.t("nessuna azione", "no action"))}${selected.difficult ? " · " + ctx.t("terreno difficile", "difficult terrain") : ""}</p><p class="muted">${selected.visibility === "hidden" ? ctx.t("Nascosta ai giocatori", "Hidden from players") : ctx.t("Visibile al gruppo", "Visible to the party")} · ${selected.status.spent ? ctx.t("Scattata", "Spent") : selected.status.disarmed ? ctx.t("Disinnescata", "Disarmed") : ctx.t("Armata", "Armed")}${selected.status.discovered ? " · " + ctx.t("individuata dal gruppo", "found by the party") : ""} · ${ctx.t("scattata", "triggered")} ${selected.status.triggers}×</p><div class="toolbar">${button(`data-regions-config="${esc(ctx, selected.id)}"`, ctx.t("Configura…", "Configure…"), "primary")}${selected.status.spent || selected.status.disarmed ? button(`data-regions-rearm="${esc(ctx, selected.id)}"`, ctx.t("Riarma", "Re-arm")) : ""}${button(`data-regions-template="${esc(ctx, selected.id)}"`, ctx.t("Salva come trappola riutilizzabile", "Save as reusable trap"), "quiet")}${button(`data-regions-delete="${esc(ctx, selected.id)}"`, ctx.t("Elimina…", "Delete…"), "quiet")}</div></section>` : ""}
<section><h3>${ctx.t("Trappole riutilizzabili", "Reusable traps")}</h3><ul class="regions-list">${slice.library.map((t) => `<li class="regions-template" data-regions-library="${esc(ctx, t.id)}"><span><strong>${esc(ctx, t.name)}</strong> · ${esc(ctx, D.planSummary(t, ctx.lang))}${t.trap ? ` · ${ctx.t("Percezione CD", "Perception DC")} ${t.trap.detectDC}, ${ctx.t("Arnesi da scasso CD", "Thieves’ Tools DC")} ${t.trap.disarmDC}` : ""}</span><span class="toolbar">${button(`data-regions-place="${esc(ctx, t.id)}"`, ctx.t("Piazza in questa scena", "Place in this scene"))}${button(`data-regions-unlibrary="${esc(ctx, t.id)}"`, ctx.t("Togli", "Remove"), "quiet")}</span></li>`).join("") || `<li class="muted">${ctx.t("Nessuna trappola salvata.", "No saved traps.")}</li>`}</ul></section>
<section><h3>${ctx.t("Eventi recenti", "Recent events")}</h3>${events.length ? `<ul class="regions-list">${events.map((e) => `<li>${eventTime(ctx, e.at)} · <strong>${esc(ctx, e.plan.name)}</strong> · ${esc(ctx, nameOf(ctx, e.actorId))} ${esc(ctx, causeText(ctx, e.cause))} · ${esc(ctx, statusText(ctx, e.status))}${resultText(ctx, e) ? " · " + esc(ctx, resultText(ctx, e)) : ""}</li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun evento finora.", "No events yet.")}</p>`}</section></div></div></div>`;
}
export function bindPrep(el, ctx) {
  const scene = prepScene(ctx);
  el.querySelector("[data-regions-scene]")?.addEventListener("change", (e) => {
    ui.prepScene = e.target.value;
    ui.prepSelected = null;
    ctx.render();
  });
  el.querySelector("[data-regions-draw]")?.addEventListener("click", () => {
    ui.prepDraw = !ui.prepDraw;
    ctx.render();
  });
  el.querySelector("[data-regions-prep-conditions]")?.addEventListener("click", () =>
    openSceneConditions(ctx, scene?.id),
  );
  el.querySelector("[data-regions-prep-new]")?.addEventListener("click", () => {
    const g = scene.gridSize * 2;
    createAndConfigure(
      ctx,
      scene.id,
      { x: scene.width / 2 - g / 2, y: scene.height / 2 - g / 2, width: g, height: g },
      (id) => (ui.prepSelected = id),
    );
  });
  el.querySelectorAll("[data-regions-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.prepSelected = b.dataset.regionsPick;
      ctx.render();
    }),
  );
  el.querySelectorAll("[data-regions-config]").forEach((b) =>
    b.addEventListener("click", () => openConfig(ctx, b.dataset.regionsConfig)),
  );
  el.querySelectorAll("[data-regions-delete]").forEach((b) =>
    b.addEventListener("click", () => openDelete(ctx, b.dataset.regionsDelete)),
  );
  el.querySelectorAll("[data-regions-rearm]").forEach((b) =>
    b.addEventListener("click", () => rearm(ctx, b.dataset.regionsRearm)),
  );
  el.querySelectorAll("[data-regions-template]").forEach((b) =>
    b.addEventListener("click", () => saveTemplate(ctx, b.dataset.regionsTemplate)),
  );
  el.querySelectorAll("[data-regions-place]").forEach((b) =>
    b.addEventListener("click", () => {
      let placed = null;
      if (
        run(
          ctx,
          ctx.t("Trappola piazzata", "Trap placed"),
          (s) => {
            placed = D.placeTemplate(
              s,
              b.dataset.regionsPlace,
              scene.id,
              { x: scene.width / 2, y: scene.height / 2 },
              ctx.role,
            );
          },
          PRIVATE,
        ) &&
        placed
      ) {
        ui.prepSelected = placed.id;
        ctx.render();
        openConfig(ctx, placed.id);
      }
    }),
  );
  el.querySelectorAll("[data-regions-unlibrary]").forEach((b) =>
    b.addEventListener("click", () =>
      run(
        ctx,
        ctx.t("Trappola tolta dalla raccolta", "Trap removed from the collection"),
        (s) => D.deleteTemplate(s, b.dataset.regionsUnlibrary, ctx.role),
        PRIVATE,
      ),
    ),
  );
  const svg = el.querySelector("[data-regions-prep-map]");
  if (!svg || !scene) return;
  const point = (e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return clampPoint(scene, p.matrixTransform(svg.getScreenCTM().inverse()));
  };
  const liveLayer = () => svg.querySelector("[data-regions-prep-live]");
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    svg.focus({ preventScroll: true });
    const p = point(e);
    if (ui.prepDraw) {
      ui.prepGesture = { a: p, b: p };
      svg.setPointerCapture?.(e.pointerId);
      return;
    }
    const hit = D.regionAt(D.regionsIn(ctx.state, scene.id), p);
    ui.prepSelected = hit?.id ?? null;
    ctx.render();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!ui.prepGesture) return;
    ui.prepGesture.b = point(e);
    liveLayer().innerHTML = draftRect(rectOf(ui.prepGesture.a, ui.prepGesture.b));
  });
  svg.addEventListener("pointerup", (e) => {
    const gesture = ui.prepGesture;
    ui.prepGesture = null;
    if (!gesture) return;
    const rect = rectOf(gesture.a, point(e));
    if (rect.width < 10 || rect.height < 10) {
      liveLayer().innerHTML = "";
      return;
    }
    ui.prepDraw = false;
    createAndConfigure(ctx, scene.id, rect, (id) => (ui.prepSelected = id));
  });
  svg.addEventListener("keydown", (e) => {
    const region = ui.prepSelected && D.regionOf(ctx.state, ui.prepSelected);
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!region) return;
    if (arrows[e.key]) {
      e.preventDefault();
      const step = e.shiftKey ? 5 : scene.gridSize;
      const s = region.shape;
      const [dx, dy] = arrows[e.key];
      run(
        ctx,
        ctx.t("Regione spostata", "Region moved"),
        (draft) =>
          D.moveRegion(
            draft,
            region.id,
            {
              ...s,
              x: Math.max(0, Math.min(scene.width - s.width, s.x + dx * step)),
              y: Math.max(0, Math.min(scene.height - s.height, s.y + dy * step)),
            },
            ctx.role,
          ),
        PRIVATE,
      );
      queueMicrotask(() =>
        globalThis.document
          ?.querySelector("[data-regions-prep-map]")
          ?.focus({ preventScroll: true }),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      openConfig(ctx, region.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      openDelete(ctx, region.id);
    }
  });
}

// ---------------------------------------------------------------- notifications

export function collect(ctx) {
  const pending = D.pendingEvents(ctx.state);
  if (ctx.role === "dm")
    return pending
      .filter((e) => e.status === "awaiting-dm")
      .map((e) => ({
        id: "regions-" + e.id,
        title: L(`Evento da decidere: «${e.plan.name}»`, `Event to decide: «${e.plan.name}»`),
        body: L(
          `${nameOf(ctx, e.actorId)} ${CAUSES[e.cause]?.it ?? e.cause}`,
          `${nameOf(ctx, e.actorId)} ${CAUSES[e.cause]?.en ?? e.cause}`,
        ),
        time: e.at,
        category: "requests",
        target: { page: "table", params: {} },
      }));
  return pending
    .filter(
      (e) =>
        e.status === "awaiting-mover" &&
        canControlActor(ctx.state.actors[e.actorId], ctx.role, ctx.state),
    )
    .map((e) => ({
      id: "regions-" + e.id,
      title: L(
        `«${e.plan.publicName}»: prendi il passaggio?`,
        `«${e.plan.publicName}»: take the passage?`,
      ),
      body: L(nameOf(ctx, e.actorId), nameOf(ctx, e.actorId)),
      time: e.at,
      category: "requests",
      target: { page: "table", params: {} },
    }));
}

// ---------------------------------------------------------------- register

let unhook = [];
export function register(registry) {
  area = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: (state) => D.seedSlice(state),
    normalize: D.normalizeSlice,
  });
  // Accepted dice survive gameplay Undo (I-229): a digital retry reuses them once.
  registry.registerStateSlice(D.ROLLS, {
    version: 1,
    undo: "preserve",
    seed: D.seedRolls,
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./regions.css", import.meta.url));
  registry.add("table-tool", regionTool);
  registry.add("map-layer", {
    id: "regions",
    label: L("Regioni", "Regions"),
    order: 22,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: regionShapes,
  });
  registry.add("map-layer", {
    id: "regions-marks",
    label: L("Segni delle regioni", "Region marks"),
    order: 61,
    interactive: true,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: regionMarks,
    bind: bindMarks,
  });
  registry.add("table-panel", {
    id: "regions-panel",
    label: L("Regioni e trappole", "Regions and traps"),
    placement: "inspector",
    // First among the area sections: an event waiting for a decision comes before details.
    order: 2,
    // The section appears only with something to show (no empty heading in the tab).
    when: (ctx, tv) => Boolean(tv?.scene && D.sliceOf(ctx.state)) && panel(ctx, tv) !== "",
    render: panel,
    bind: bindPanel,
  });
  registry.add("preparation-section", {
    id: "regions",
    group: "scenes",
    label: L("Regioni e trappole", "Regions and traps"),
    description: L(
      "Aree con comportamenti, trappole e scale",
      "Areas with behaviours, traps and stairs",
    ),
    roles: ["dm"],
    order: 14,
    render: renderPrep,
    bind: bindPrep,
  });
  registry.add("notifications", {
    id: "regions-events",
    label: L("Eventi delle regioni", "Region events"),
    collect,
  });
  registry.add("token-menu", {
    id: "regions-search",
    label: L("Cerca trappole", "Search for traps"),
    icon: "search",
    group: "regions",
    when: (ctx, target) =>
      !unifiedSearch(ctx) &&
      Boolean(ctx.state.actors?.[target?.actorId]) &&
      ctx.canControl(ctx.state.actors[target.actorId]) &&
      target.sceneId === ctx.state.activeSceneId,
    run: (ctx, target) => openCheck(ctx, "search", target.actorId),
  });
  registry.add("command", {
    id: "regions.scene-conditions",
    label: L("Condizioni della scena…", "Scene conditions…"),
    description: L(
      "ambientale, effetto ambientale, effetto globale, tempesta, bufera, clima, meteo, ogni turno, fumi",
      "environmental, environment effect, global effect, storm, blizzard, weather, every turn, fumes",
    ),
    context: "global",
    roles: ["dm"],
    group: "regions",
    when: (ctx) => Boolean(D.sliceOf(ctx.state)),
    run: (ctx) => openSceneConditions(ctx),
  });
  registry.add("command", {
    id: "regions.tool",
    label: L("Strumento Regioni e trappole", "Regions and traps tool"),
    context: "table",
    roles: ["dm"],
    group: "regions",
    run: (ctx) => {
      const map = globalThis.document?.querySelector(`#content [data-tool="${TOOL}"]`);
      if (!map)
        throw Object.assign(Error("Open the Table."), {
          it: "Apri il Tavolo.",
          en: "Open the Table.",
        });
      map.click();
    },
  });
  registry.on("commit", (payload, { ctx }) => announce(ctx));
  registry.on("role-changed", () => resetRegionsView());
  registry.on("reset", () => resetRegionsView());
  registry.on("scene-activated", () => {
    ui.selected = null;
    ui.draw = null;
    ui.drag = null;
  });
  for (const off of unhook) off();
  unhook = [
    observeMovementStops(D.movementStop),
    observeTurnPhases(D.onTurnPhase),
    resolveAttemptKind("region", D.resolveRegionAttempt),
  ];
}
