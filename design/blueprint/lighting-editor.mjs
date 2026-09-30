// B35 — Lighting editor: the Table's Lights tool (DM), the shared map HUD helpers of the fog
// and vision tools, and the lighting diagnostics of the Vision panel.
//
// Patterns: Foundry lighting layer (FVT-077: place a light, bright/dim radius, angle,
// colour, darkness source; right-click toggles it on or off), Roll20 place-light presets and
// the Dynamic Lighting panel footer that counts vision tokens and light sources and
// highlights them on hover (R20-093/094), Fantasy Grounds token lights that follow the actor
// (R20-121). Radii are the SRD 5.2.1 ones (Torch, Lamp, lanterns, Darkness).
import * as D from "./fog-vision-domain.mjs";

export const LIGHTS_TOOL = "fog-vision-lights";
const L = (it, en) => ({ it, en });
const f1 = (n) => Math.round(n * 10) / 10;

// ------------------------------------------------------------------------------ helpers

export function errorText(ctx, error) {
  if (error?.it || error?.en)
    return ctx.label({ it: error.it ?? error.en, en: error.en ?? error.it });
  return error?.message ?? String(error);
}
/** Commits one change; a refusal (permission, offline, invalid shape) becomes a toast. */
export function run(ctx, label, mutator, options = {}) {
  return runChange(ctx, label, mutator, options);
}
function runChange(ctx, label, mutator, options = {}) {
  try {
    ctx.commit(label, mutator, options);
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
/** A HUD button (40px target) with an accessible name and optional pressed state. */
// SV-37: a disabled button names the element that says why (`why`, an id beside it).
export function btn(
  ctx,
  { attrs, text, pressed, cls = "", icon = "", disabled = false, focus, why = "" },
) {
  return `<button type="button" class="fv-btn ${cls}" ${attrs}${pressed === undefined ? "" : ` aria-pressed="${pressed}"`}${disabled ? ` disabled${why ? ` aria-describedby="${why}"` : ""}` : ""}${focus ? ` data-fv-focus="${ctx.esc(focus)}"` : ""}>${icon ? ctx.icon(icon) : ""}<span>${ctx.esc(text)}</span></button>`;
}
export function group(label, html) {
  return `<div class="fv-group" role="group" aria-label="${label}">${html}</div>`;
}
/** Sizes the HUD foreignObject to the visible map in screen pixels (as the annotations HUD). */
export function layoutHud(el, table) {
  const fo = el.querySelector(".fv-hud-fo");
  const svg = table?.svg;
  if (!fo || !svg?.isConnected || !svg.getScreenCTM) return null;
  const m = svg.getScreenCTM();
  const r = svg.getBoundingClientRect();
  if (!m || !r.width) return null;
  const origin = new DOMPoint(r.left, r.top).matrixTransform(m.inverse());
  fo.setAttribute("x", "0");
  fo.setAttribute("y", "0");
  fo.setAttribute("width", String(r.width));
  fo.setAttribute("height", String(r.height));
  fo.setAttribute("transform", `translate(${origin.x} ${origin.y}) scale(${1 / m.a})`);
  const hud = fo.firstElementChild;
  if (hud) {
    hud.style.width = r.width + "px";
    hud.style.height = r.height + "px";
  }
  return { m, r };
}
/** Pointer capture keeps a drag on the map; a pointer the browser no longer tracks is fine. */
export function capture(table, e) {
  try {
    table.svg.setPointerCapture?.(e.pointerId);
  } catch {
    /* no active pointer with this id (synthetic or already released): the drag still works */
  }
}
/** Clicks, presses and typing in the HUD never reach the map tools underneath. */
export function stopMapEvents(el) {
  const inside = (e) =>
    e.target.closest?.(".fv-hud button, .fv-hud select, .fv-hud input, .fv-hud label, .fv-banner");
  for (const type of ["pointerdown", "pointerup", "click", "dblclick"])
    el.addEventListener(type, (e) => {
      if (inside(e)) e.stopPropagation();
    });
  el.addEventListener("keydown", (e) => {
    if (inside(e) && !["Escape", "Tab"].includes(e.key)) e.stopPropagation();
  });
}

/**
 * A tool key handled by the area often re-renders the Table, which replaces the map: the
 * keyboard user keeps the focus on the new map (arrows, then Enter), as the core does.
 */
export function keepMapFocus(handler) {
  return function (ctx, e, table) {
    const result = handler.call(this, ctx, e, table);
    const doc = globalThis.document;
    if (e?.defaultPrevented && doc?.querySelector) {
      const map = doc.querySelector("#battle-map");
      const active = doc.activeElement;
      if (map && active !== map && (!active || active === doc.body || !active.isConnected))
        map.focus({ preventScroll: true });
    }
    return result;
  };
}

// ------------------------------------------------------------------------------ tool state

export const lighting = {
  preset: "torch",
  selected: null,
  drag: null,
  nudge: null,
  focusKey: null,
};
export function resetLighting() {
  lighting.preset = "torch";
  lighting.selected = null;
  lighting.drag = null;
  lighting.nudge = null;
  lighting.focusKey = null;
}
const selectedLight = (ctx, sceneId) =>
  lighting.selected
    ? (D.sceneConfig(ctx.state, sceneId).lights.find((l) => l.id === lighting.selected) ?? null)
    : null;
const presetName = (ctx, preset) =>
  ctx.label(D.LIGHT_PRESETS[preset]?.name ?? D.LIGHT_PRESETS.custom.name);
export const lightLabel = (ctx, light) => light.name || presetName(ctx, light.preset);

function placeLight(ctx, table, p) {
  const previous = lighting.selected;
  const ok = run(
    ctx,
    `${ctx.t("Luce aggiunta", "Light added")}: ${presetName(ctx, lighting.preset)}`,
    (s) => {
      // Selected before the commit renders, so the bar opens on the new light.
      lighting.selected = D.addLight(s, ctx.role, table.scene.id, {
        preset: lighting.preset,
        x: p.x,
        y: p.y,
      }).id;
    },
  );
  if (!ok) lighting.selected = previous;
  if (ok) {
    table.message(
      ctx.t(
        "Luce posata. Trascinala per spostarla; clic destro la accende o la spegne.",
        "Light placed. Drag it to move it; right-click lights it or puts it out.",
      ),
    );
  }
  return ok;
}
export function updateSelected(ctx, sceneId, patch, label) {
  const light = selectedLight(ctx, sceneId);
  if (!light) return false;
  return run(ctx, label, (s) => D.updateLight(s, ctx.role, sceneId, light.id, patch));
}
export function toggleLightById(ctx, sceneId, lightId) {
  const light = D.sceneConfig(ctx.state, sceneId).lights.find((l) => l.id === lightId);
  if (!light) return false;
  return run(
    ctx,
    `${light.on === false ? ctx.t("Luce accesa", "Light lit") : ctx.t("Luce spenta", "Light put out")}: ${lightLabel(ctx, light)}`,
    (s) =>
      D.toggleLight(s, ctx.role, sceneId, lightId, (actorId) => ctx.canControl(s.actors[actorId])),
  );
}
function removeSelected(ctx, sceneId) {
  const light = selectedLight(ctx, sceneId);
  if (!light) return false;
  const ok = run(
    ctx,
    `${ctx.t("Luce eliminata", "Light deleted")}: ${lightLabel(ctx, light)}`,
    (s) => D.removeLight(s, ctx.role, sceneId, light.id),
  );
  if (ok) {
    lighting.selected = null;
    ctx.toast(
      ctx.t(
        "Luce eliminata. «Annulla ultima modifica» la ripristina.",
        "Light deleted. “Undo last change” restores it.",
      ),
    );
  }
  return ok;
}

/** The Lights tool: click to place the chosen preset, drag a light to move it. */
export const lightsTool = {
  id: LIGHTS_TOOL,
  label: L("Luci", "Lights"),
  icon: "light",
  group: "fog",
  roles: ["dm"],
  order: 20,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Luci: clic sulla mappa posa la luce scelta; trascina una luce per spostarla; clic destro la accende o la spegne. Tasti: frecce e Invio spostano, Canc elimina.",
        "Lights: click the map to place the chosen light; drag a light to move it; right-click lights it or puts it out. Keys: arrows and Enter move, Delete removes.",
      ),
    );
  },
  deactivate() {
    lighting.drag = null;
    lighting.nudge = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const handle = e.target.closest?.("[data-fv-light]");
    const p = table.point(e);
    if (handle) {
      lighting.selected = handle.dataset.fvLight;
      lighting.drag = { id: handle.dataset.fvLight, start: p, moved: false, handle };
      capture(table, e);
      return;
    }
    if (lighting.selected) {
      lighting.selected = null;
      ctx.render();
      return;
    }
    placeLight(ctx, table, p);
  },
  onPointerMove(ctx, e, table) {
    const drag = lighting.drag;
    if (!drag) return;
    const p = table.point(e);
    if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 4) drag.moved = true;
    if (!drag.moved) return;
    drag.to = p;
    drag.handle?.setAttribute?.("transform", `translate(${f1(p.x)} ${f1(p.y)})`);
  },
  onPointerUp(ctx, e, table) {
    const drag = lighting.drag;
    lighting.drag = null;
    if (!drag) return;
    if (drag.moved && drag.to) {
      const light = D.sceneConfig(ctx.state, table.scene.id).lights.find((l) => l.id === drag.id);
      if (light?.attachedTo) {
        table.message(
          ctx.t(
            "Questa luce segue una pedina: sposta la pedina.",
            "This light follows a token: move the token.",
          ),
        );
        ctx.render();
        return;
      }
      run(
        ctx,
        `${ctx.t("Luce spostata", "Light moved")}: ${light ? lightLabel(ctx, light) : ""}`,
        (s) => D.updateLight(s, ctx.role, table.scene.id, drag.id, { x: drag.to.x, y: drag.to.y }),
      );
    } else ctx.render();
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    const light = selectedLight(ctx, table.scene.id);
    const step = (table.scene.gridSize || 50) / 2;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key] && light && !light.attachedTo) {
      e.preventDefault();
      const base = lighting.nudge ?? { x: light.x, y: light.y };
      lighting.nudge = {
        x: Math.max(0, Math.min(table.scene.width, base.x + arrows[e.key][0] * step)),
        y: Math.max(0, Math.min(table.scene.height, base.y + arrows[e.key][1] * step)),
      };
      table.svg
        .querySelector?.(`[data-fv-light="${light.id}"]`)
        ?.setAttribute("transform", `translate(${lighting.nudge.x} ${lighting.nudge.y})`);
      table.message(
        ctx.t(
          "Invio conferma la nuova posizione, Esc annulla.",
          "Enter confirms the new position, Escape cancels.",
        ),
      );
      return;
    }
    if (e.key === "Enter" && e.target?.closest?.("[data-actor]")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (light && lighting.nudge) {
        const to = lighting.nudge;
        lighting.nudge = null;
        run(ctx, `${ctx.t("Luce spostata", "Light moved")}: ${lightLabel(ctx, light)}`, (s) =>
          D.updateLight(s, ctx.role, table.scene.id, light.id, to),
        );
        return;
      }
      // No light selected: place one on the selected token's square (keyboard path).
      const token = D.tokenOf(table.scene, table.selectedActorId);
      placeLight(
        ctx,
        table,
        token
          ? { x: token.x, y: token.y - (table.scene.gridSize || 50) }
          : { x: table.scene.width / 2, y: table.scene.height / 2 },
      );
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && light) {
      e.preventDefault();
      removeSelected(ctx, table.scene.id);
    }
  },
};

lightsTool.onKeyDown = keepMapFocus(lightsTool.onKeyDown);

// ------------------------------------------------------------------------------ map marks

/** Light handles while the Lights tool is on (DM only); hover rings for the diagnostics. */
export function lightMarks(ctx, tv, lit) {
  const cfg = D.sceneConfig(ctx.state, tv.scene.id);
  const editing = tv.mode === LIGHTS_TOOL && ctx.role === "dm";
  const scale = 1 / (tv.zoom || 1);
  return cfg.lights
    .map((light) => {
      const at = D.lightPoint(tv.scene, light);
      if (!at) return "";
      const entry =
        lit.lights.find((l) => l.id === light.id) ?? lit.darkness.find((l) => l.id === light.id);
      const off = light.on === false;
      const selected = editing && lighting.selected === light.id;
      const name = `${lightLabel(ctx, light)} · ${off ? ctx.t("spenta", "off") : entry?.suppressed ? ctx.t("soppressa dall’oscurità magica", "suppressed by magical darkness") : ctx.t("accesa", "on")}`;
      const ring = `<circle class="fv-mark-ring" data-fv-mark="${ctx.esc(light.id)}" cx="${f1(at.x)}" cy="${f1(at.y)}" r="${f1(34 * scale)}"/>`;
      if (!editing) return ring;
      const radius = D.metersToPx(tv.scene, light.bright + light.dim);
      return `${ring}${selected ? `<circle class="fv-light-reach" cx="${f1(at.x)}" cy="${f1(at.y)}" r="${f1(radius)}"/>` : ""}<g class="fv-light-handle${off ? " is-off" : ""}${light.magical ? " is-dark" : ""}${selected ? " is-selected" : ""}" data-fv-light="${ctx.esc(light.id)}" transform="translate(${f1(at.x)} ${f1(at.y)})" role="button" tabindex="-1" aria-label="${ctx.esc(name)}"><title>${ctx.esc(name)}</title><circle r="${f1(20 * scale)}" class="fv-light-hit"/><circle r="${f1(13 * scale)}" class="fv-light-dot" fill="${ctx.esc(light.color)}"/>${light.attachedTo ? `<circle r="${f1(17 * scale)}" class="fv-light-follow"/>` : ""}</g>`;
    })
    .join("");
}
/** Right-click on a light handle toggles it (Foundry lighting layer). */
export function bindLightMarks(el, ctx, table) {
  el.querySelectorAll("[data-fv-light]").forEach((handle) =>
    handle.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleLightById(ctx, table.scene.id, handle.dataset.fvLight);
    }),
  );
}

// ------------------------------------------------------------------------------ HUD bar

export function lightsBar(ctx, tv) {
  const sceneId = tv.scene.id;
  const light = selectedLight(ctx, sceneId);
  // Roll20's place-light presets as one compact choice: the new light, or the selected one's type.
  const current = light ? light.preset : lighting.preset;
  const presets = `<label class="fv-field">${light ? ctx.t("Tipo", "Type") : ctx.t("Luce da posare", "Light to place")}<select data-fv-light-preset data-fv-focus="preset">${Object.keys(
    D.LIGHT_PRESETS,
  )
    .map(
      (preset) =>
        `<option value="${preset}"${preset === current ? " selected" : ""}>${ctx.esc(presetName(ctx, preset))} · ${ctx.esc(
          D.LIGHT_PRESETS[preset].magical
            ? `${D.LIGHT_PRESETS[preset].bright} m`
            : `${D.LIGHT_PRESETS[preset].bright} + ${D.LIGHT_PRESETS[preset].dim} m`,
        )}</option>`,
    )
    .join("")}</select></label>`;
  const head = `<div class="fv-row">${presets}${btn(ctx, { attrs: 'data-fv-act="undo"', text: ctx.t("Annulla", "Undo"), icon: "undo", focus: "undo" })}${light ? "" : `<span class="fv-hint">${ctx.t("Clic sulla mappa per posarla.", "Click the map to place it.")}</span>`}</div>`;
  if (!light) return head;
  const preset = D.LIGHT_PRESETS[light.preset];
  const number = (key, label) =>
    `<label class="fv-field">${label}<input type="number" inputmode="decimal" min="0" max="36" step="1.5" value="${light[key]}" data-fv-light-field="${key}"></label>`;
  const token = tv.selectedActorId && D.tokenOf(tv.scene, tv.selectedActorId);
  const follows = light.attachedTo ? ctx.state.actors[light.attachedTo]?.name : "";
  return `${head}<div class="fv-row fv-selection" role="group" aria-label="${ctx.t("Luce selezionata", "Selected light")}"><strong>${ctx.esc(lightLabel(ctx, light))}</strong><span class="fv-source">${ctx.esc(D.sourcePages(preset.source, ctx.lang))}</span>${btn(ctx, { attrs: 'data-fv-act="light-toggle"', text: light.on === false ? ctx.t("Accendi", "Light it") : ctx.t("Spegni", "Put it out"), pressed: light.on !== false, focus: "light-toggle" })}${number("bright", light.magical ? ctx.t("Raggio (m)", "Radius (m)") : ctx.t("Luce intensa (m)", "Bright (m)"))}${light.magical ? "" : number("dim", ctx.t("Luce fioca oltre (m)", "Dim beyond (m)"))}${light.cone ? `<label class="fv-field">${ctx.t("Direzione (°)", "Direction (°)")}<input type="number" min="0" max="359" step="15" value="${light.rotation ?? 0}" data-fv-light-field="rotation"></label>` : ""}${light.magical ? "" : `<label class="fv-field">${ctx.t("Colore", "Colour")}<select data-fv-light-field="color">${D.LIGHT_COLOURS.map(([hex, name]) => `<option value="${hex}"${hex === light.color ? " selected" : ""}>${ctx.esc(ctx.label(name))}</option>`).join("")}</select></label>`}${
    light.magical
      ? ""
      : light.attachedTo
        ? btn(ctx, {
            attrs: 'data-fv-act="light-detach"',
            text: `${ctx.t("Segue", "Follows")} ${follows} · ${ctx.t("stacca", "detach")}`,
            focus: "light-follow",
          })
        : token && ctx.state.actors[tv.selectedActorId]
          ? btn(ctx, {
              attrs: 'data-fv-act="light-attach"',
              text: `${ctx.t("Fai seguire", "Follow")} ${ctx.state.actors[tv.selectedActorId].name}`,
              focus: "light-follow",
            })
          : ""
  }${btn(ctx, { attrs: 'data-fv-act="light-delete"', text: ctx.t("Elimina", "Delete"), icon: "close", cls: "is-danger", focus: "light-delete" })}${btn(ctx, { attrs: 'data-fv-act="light-deselect"', text: ctx.t("Deseleziona", "Deselect"), focus: "light-deselect" })}</div>`;
}
export function bindLightsBar(bar, ctx, table) {
  const sceneId = table.scene.id;
  bar.querySelectorAll("[data-fv-light-preset]").forEach((b) =>
    b.addEventListener("change", () => {
      b.dataset.fvLightPreset = b.value;
      lighting.focusKey = "preset";
      const light = selectedLight(ctx, sceneId);
      if (light) {
        if (light.attachedTo && D.LIGHT_PRESETS[b.dataset.fvLightPreset]?.magical) {
          ctx.toast(
            ctx.t(
              "Una pedina porta una luce, non l’oscurità.",
              "A token carries a light, not darkness.",
            ),
            true,
          );
          return;
        }
        updateSelected(
          ctx,
          sceneId,
          { preset: b.dataset.fvLightPreset },
          `${ctx.t("Tipo di luce", "Light type")}: ${presetName(ctx, b.dataset.fvLightPreset)}`,
        );
      } else {
        lighting.preset = b.dataset.fvLightPreset;
        ctx.render();
      }
    }),
  );
  bar.querySelectorAll("[data-fv-light-field]").forEach((input) =>
    input.addEventListener("change", () => {
      const key = input.dataset.fvLightField;
      lighting.focusKey = null;
      const value = key === "color" ? input.value : Number(String(input.value).replace(",", "."));
      updateSelected(ctx, sceneId, { [key]: value }, ctx.t("Luce modificata", "Light changed"));
    }),
  );
  const acts = {
    "light-toggle": () => {
      lighting.focusKey = "light-toggle";
      toggleLightById(ctx, sceneId, lighting.selected);
    },
    "light-delete": () => removeSelected(ctx, sceneId),
    "light-deselect": () => {
      lighting.selected = null;
      ctx.render();
    },
    "light-attach": () =>
      updateSelected(
        ctx,
        sceneId,
        { attachedTo: table.selectedActorId },
        ctx.t("La luce segue la pedina", "The light follows the token"),
      ),
    "light-detach": () => {
      const light = selectedLight(ctx, sceneId);
      const at = light && D.lightPoint(table.scene, light);
      if (at)
        updateSelected(
          ctx,
          sceneId,
          { attachedTo: null, x: at.x, y: at.y },
          ctx.t("La luce resta sul posto", "The light stays in place"),
        );
    },
  };
  bar.querySelectorAll("[data-fv-act]").forEach((b) => {
    const act = acts[b.dataset.fvAct];
    if (act) b.addEventListener("click", act);
  });
}

// ------------------------------------------------------------------------------ diagnostics

const levelName = (ctx, level) => ctx.label(D.LEVEL_NAMES[level] ?? D.LEVEL_NAMES.dark);
/** Roll20 Dynamic Lighting footer (R20-093): counts, rows highlighted on the map on hover. */
export function diagnosticsSection(ctx, sceneId) {
  const d = D.diagnostics(ctx.state, sceneId);
  const scene = D.sceneOf(ctx.state, sceneId);
  const name = (id) => ctx.state.actors[id]?.name ?? "?";
  const senseText = (row) => {
    const s = row.senses;
    const parts = [];
    if (!s.enabled) parts.push(ctx.t("visione spenta", "vision off"));
    if (s.darkvision) parts.push(`${ctx.t("scurovisione", "darkvision")} ${s.darkvision} m`);
    if (s.blindsight) parts.push(`${ctx.t("vista cieca", "blindsight")} ${s.blindsight} m`);
    if (s.truesight) parts.push(`${ctx.t("vista pura", "truesight")} ${s.truesight} m`);
    if (s.blinded) parts.push(ctx.t("Accecato", "Blinded"));
    if (!parts.length) parts.push(ctx.t("vista normale", "normal sight"));
    return parts.join(" · ");
  };
  const tokenRows = d.tokens
    .map(
      (row) =>
        `<li class="fv-diag-row" tabindex="0" data-fv-diag="${ctx.esc(row.actorId)}"><strong>${ctx.esc(name(row.actorId))}</strong><span>${ctx.esc(senseText(row))}</span><span>${ctx.esc(row.magical ? ctx.t("Nell’oscurità magica", "In magical darkness") : levelName(ctx, row.level))}${d.vision ? ` · ${ctx.t("vede", "sees")} ${Math.round(row.share * 100)}%` : ""}</span></li>`,
    )
    .join("");
  const lightRows = d.lights
    .map(
      (light) =>
        `<li class="fv-diag-row" tabindex="0" data-fv-diag="${ctx.esc(light.id)}"><strong>${ctx.esc(lightLabel(ctx, light))}</strong><span>${light.magical ? `${ctx.t("raggio", "radius")} ${light.bright} m` : `${light.bright} m + ${light.dim} m`}${light.attachedTo ? ` · ${ctx.t("portata da", "carried by")} ${ctx.esc(name(light.attachedTo))}` : ""}</span><span class="fv-state ${light.on === false ? "is-off" : light.suppressed ? "is-suppressed" : "is-on"}">${light.on === false ? ctx.t("Spenta", "Off") : light.suppressed ? ctx.t("Soppressa", "Suppressed") : light.magical ? ctx.t("Attiva", "Active") : ctx.t("Accesa", "On")}</span>${ctx.role === "dm" ? `<button type="button" class="fv-btn fv-mini" data-fv-diag-light="${ctx.esc(light.id)}"${light.on === false ? "" : ' aria-pressed="true"'}>${light.on === false ? ctx.t("Accendi", "Light it") : ctx.t("Spegni", "Put out")}</button><button type="button" class="fv-btn fv-mini" data-fv-diag-edit="${ctx.esc(light.id)}" aria-label="${ctx.esc(`${ctx.t("Modifica", "Edit")} ${lightLabel(ctx, light)}`)}">${ctx.t("Modifica", "Edit")}</button>` : ""}</li>`,
    )
    .join("");
  const warnings = d.warnings
    .map((w) =>
      w.kind === "dark-token"
        ? ctx.t(
            `${name(w.actorId)} è al buio e non vede il proprio spazio: serve una luce o la scurovisione.`,
            `${name(w.actorId)} stands in darkness and cannot see its own space: it needs a light or darkvision.`,
          )
        : w.kind === "blinded"
          ? ctx.t(
              `${name(w.actorId)} è Accecato: non vede nulla.`,
              `${name(w.actorId)} is Blinded: it sees nothing.`,
            )
          : ctx.t(
              `${lightLabel(ctx, d.lights.find((l) => l.id === w.lightId) ?? {})}: soppressa dall’oscurità magica (la luce non magica non la illumina).`,
              `${lightLabel(ctx, d.lights.find((l) => l.id === w.lightId) ?? {})}: suppressed by magical darkness (nonmagical light cannot illuminate it).`,
            ),
    )
    .map((text) => `<li>${ctx.esc(text)}</li>`)
    .join("");
  // Hover or keyboard focus on a row lights its ring on the map (Roll20 highlights them).
  const highlight = [...d.tokens.map((row) => row.actorId), ...d.lights.map((light) => light.id)]
    .map((id) => {
      const safe = String(id).replace(/[^a-z0-9_-]/gi, "");
      return `#content:has([data-fv-diag="${safe}"]:is(:hover,:focus-visible)) [data-fv-mark="${safe}"]{opacity:1}`;
    })
    .join("");
  return `<section class="fv-section" data-fv-diagnostics aria-labelledby="fv-diag-title"><h3 id="fv-diag-title">${ctx.t("Diagnostica luci", "Lighting diagnostics")}</h3><p class="fv-counts" role="status">${ctx.t("Pedine con visione", "Vision tokens")}: <strong>${d.counts.vision}</strong> · ${ctx.t("Fonti di luce", "Light sources")}: <strong>${d.counts.lights}</strong> (${d.counts.on} ${ctx.t("accese", "on")}) · ${ctx.t("Oscurità magiche", "Magical darkness")}: <strong>${d.counts.darkness}</strong> · ${ctx.esc(ctx.label(D.PHASES.find(([id]) => id === d.phase)?.[2] ?? D.PHASES[0][2]))}</p>${warnings ? `<ul class="fv-warnings">${warnings}</ul>` : ""}<h4>${ctx.t("Pedine", "Tokens")}</h4><ul class="fv-diag">${tokenRows || `<li class="muted">${ctx.t("Nessuna pedina con visione.", "No token with vision.")}</li>`}</ul><h4>${ctx.t("Luci", "Lights")}</h4><ul class="fv-diag">${lightRows || `<li class="muted">${ctx.t("Nessuna luce in questa scena.", "No light in this scene.")}</li>`}</ul><style>${highlight}</style>${scene ? "" : ""}</section>`;
}
export function bindDiagnostics(el, ctx, table) {
  el.querySelectorAll("[data-fv-diag-light]").forEach((b) =>
    b.addEventListener("click", () =>
      toggleLightById(ctx, table?.scene?.id ?? ctx.state.activeSceneId, b.dataset.fvDiagLight),
    ),
  );
  // Keyboard path to a light: its row selects it in the Lights tool, whose bar edits it.
  el.querySelectorAll("[data-fv-diag-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      lighting.selected = b.dataset.fvDiagEdit;
      lighting.focusKey = "light-toggle";
      if (table?.mode === LIGHTS_TOOL) ctx.render();
      else table?.setMode?.(LIGHTS_TOOL);
    }),
  );
}

// ------------------------------------------------------------------------------ Preparation
// PR-23 (Foundry's Lighting Layer while preparing a scene, Roll20's lights panel): the scene
// editor's «Luci» tab places and edits the scene's lights before the scene is at the Table.
// They are the same lights the Table uses; a scene not at the Table keeps them to the DM.
export const prepLights = { selected: null, preset: "torch", drag: null };
export function resetPrepLights() {
  prepLights.selected = null;
  prepLights.preset = "torch";
  prepLights.drag = null;
}
const prepSelected = (ctx, sceneId) =>
  prepLights.selected
    ? (D.sceneConfig(ctx.state, sceneId).lights.find((l) => l.id === prepLights.selected) ?? null)
    : null;
function prepLightSvg(ctx, scene, light) {
  const at = D.lightPoint(scene, light);
  if (!at) return "";
  const selected = prepLights.selected === light.id;
  const off = light.on === false;
  const bright = D.metersToPx(scene, light.bright);
  const dim = D.metersToPx(scene, light.bright + (light.magical ? 0 : light.dim));
  const name = `${lightLabel(ctx, light)} · ${off ? ctx.t("spenta", "off") : ctx.t("accesa", "on")}`;
  const reach = off
    ? ""
    : light.magical
      ? `<circle cx="${f1(at.x)}" cy="${f1(at.y)}" r="${f1(bright)}" class="pl-darkness"/>`
      : `<circle cx="${f1(at.x)}" cy="${f1(at.y)}" r="${f1(dim)}" fill="${ctx.esc(light.color)}" fill-opacity=".12"/><circle cx="${f1(at.x)}" cy="${f1(at.y)}" r="${f1(bright)}" fill="${ctx.esc(light.color)}" fill-opacity=".22"/>`;
  return `<g class="pl-light${selected ? " is-selected" : ""}${off ? " is-off" : ""}">${reach}<g data-pl-light="${ctx.esc(light.id)}" transform="translate(${f1(at.x)} ${f1(at.y)})" role="button" tabindex="0" aria-label="${ctx.esc(name)}"><title>${ctx.esc(name)}</title><circle r="22" class="pl-hit"/><circle r="13" class="pl-dot" fill="${ctx.esc(light.magical ? "#1b1b2a" : light.color)}"/>${light.attachedTo ? `<circle r="17" class="pl-follow"/>` : ""}</g></g>`;
}
/** The «Luci» tab: a map with the lights and a labelled side panel. */
export function renderPrepLights(ctx, scene, { base = "" } = {}) {
  const cfg = D.sceneConfig(ctx.state, scene.id);
  const light = prepSelected(ctx, scene.id);
  const live = scene.id === ctx.state.activeSceneId;
  const presets = Object.keys(D.LIGHT_PRESETS)
    .map(
      (preset) =>
        `<option value="${preset}"${preset === (light ? light.preset : prepLights.preset) ? " selected" : ""}>${ctx.esc(presetName(ctx, preset))} · ${ctx.esc(D.LIGHT_PRESETS[preset].magical ? `${D.LIGHT_PRESETS[preset].bright} m` : `${D.LIGHT_PRESETS[preset].bright} + ${D.LIGHT_PRESETS[preset].dim} m`)}</option>`,
    )
    .join("");
  const number = (key, label) =>
    `<label class="field">${label}<input type="number" inputmode="decimal" min="0" max="36" step="1.5" value="${light[key]}" data-pl-field="${key}"></label>`;
  const selectedCard = light
    ? `<section class="sa-side-card pl-selected" aria-labelledby="pl-sel-title"><h3 id="pl-sel-title">${ctx.esc(lightLabel(ctx, light))}</h3><p class="muted">${ctx.esc(D.sourcePages(D.LIGHT_PRESETS[light.preset]?.source ?? D.SOURCES.visionAndLight, ctx.lang))}</p><label class="field">${ctx.t("Tipo", "Type")}<select data-pl-field="preset">${presets}</select></label><div class="form-grid">${number("bright", light.magical ? ctx.t("Raggio (m)", "Radius (m)") : ctx.t("Luce intensa (m)", "Bright light (m)"))}${light.magical ? "" : number("dim", ctx.t("Luce fioca oltre (m)", "Dim light beyond (m)"))}</div>${light.cone ? `<label class="field">${ctx.t("Direzione (°)", "Direction (°)")}<input type="number" min="0" max="359" step="15" value="${light.rotation ?? 0}" data-pl-field="rotation"></label>` : ""}${light.magical ? "" : `<label class="field">${ctx.t("Colore", "Colour")}<select data-pl-field="color">${D.LIGHT_COLOURS.map(([hex, name]) => `<option value="${hex}"${hex === light.color ? " selected" : ""}>${ctx.esc(ctx.label(name))}</option>`).join("")}</select></label>`}<div class="toolbar"><button type="button" class="button" data-pl-act="toggle" aria-pressed="${light.on !== false}">${light.on === false ? ctx.t("Accendi", "Light it") : ctx.t("Spegni", "Put it out")}</button><button type="button" class="button danger" data-pl-act="delete">${ctx.t("Elimina", "Delete")}</button><button type="button" class="button quiet" data-pl-act="deselect">${ctx.t("Deseleziona", "Deselect")}</button></div></section>`
    : "";
  const list = cfg.lights.length
    ? `<ul class="sa-list pl-list">${cfg.lights.map((row) => `<li class="${row.id === prepLights.selected ? "is-selected" : ""}"><button type="button" class="sa-link" data-pl-select="${ctx.esc(row.id)}">${ctx.esc(lightLabel(ctx, row))}</button><span class="muted">${row.on === false ? ctx.t("spenta", "off") : ctx.t("accesa", "on")}${row.attachedTo ? ` · ${ctx.t("segue", "follows")} ${ctx.esc(ctx.state.actors[row.attachedTo]?.name ?? "")}` : ""}</span><button type="button" class="button quiet" data-pl-toggle="${ctx.esc(row.id)}">${row.on === false ? ctx.t("Accendi", "Light it") : ctx.t("Spegni", "Put it out")}</button></li>`).join("")}</ul>`
    : `<p class="muted">${ctx.t("Ancora nessuna luce: scegli il tipo e clicca sulla mappa.", "No light yet: choose the type and click the map.")}</p>`;
  return `<section class="sa-ws is-embedded pl-ws" data-pl-ws="${ctx.esc(scene.id)}"><div class="sa-ws-body"><div class="sa-stage"><div class="sa-canvas-wrap"><svg class="sa-canvas pl-canvas" data-pl-canvas viewBox="0 0 ${scene.width} ${scene.height}" tabindex="0" role="application" aria-label="${ctx.esc(ctx.t("Luci della scena: clic per posare la luce scelta, trascina una luce per spostarla, Invio posa al centro.", "Scene lights: click to place the chosen light, drag a light to move it, Enter places one in the centre."))}" preserveAspectRatio="xMidYMid meet">${base}<g class="pl-lights">${cfg.lights.map((row) => prepLightSvg(ctx, scene, row)).join("")}</g></svg></div><p class="sa-caption" role="status" data-pl-caption>${live ? ctx.t("Questa scena è al Tavolo: le luci che cambi qui si vedono subito.", "This scene is at the Table: the lights you change here show at once.") : ctx.t("Le luci restano tue finché non attivi la scena al Tavolo.", "The lights stay yours until you activate the scene at the Table.")}</p></div><div class="sa-side"><section class="sa-side-card" aria-labelledby="pl-title"><h3 id="pl-title">${ctx.t("Luci della scena", "Scene lights")} (${cfg.lights.length})</h3><label class="field">${ctx.t("Luce da posare", "Light to place")}<select data-pl-preset>${Object.keys(
    D.LIGHT_PRESETS,
  )
    .map(
      (preset) =>
        `<option value="${preset}"${preset === prepLights.preset ? " selected" : ""}>${ctx.esc(presetName(ctx, preset))}</option>`,
    )
    .join(
      "",
    )}</select></label><p class="muted">${ctx.t("Clic sulla mappa per posarla; trascina una luce per spostarla.", "Click the map to place it; drag a light to move it.")}</p><div class="toolbar"><button type="button" class="button" data-pl-act="center">${ctx.t("Posa al centro", "Place in the centre")}</button></div>${list}</section>${selectedCard}</div></div></section>`;
}
export function bindPrepLights(root, ctx, sceneId, { note = () => {} } = {}) {
  if (ctx.role !== "dm") return;
  // The editor offers «Annulla» for these changes: `note` records their labels.
  const run = (c, label, mutator) => {
    const ok = runChange(c, label, mutator);
    if (ok) note(label);
    return ok;
  };
  const toggleLightById = (c, id, lightId) => {
    const light = D.sceneConfig(c.state, id).lights.find((l) => l.id === lightId);
    if (!light) return false;
    return run(
      c,
      `${light.on === false ? c.t("Luce accesa", "Light lit") : c.t("Luce spenta", "Light put out")}: ${lightLabel(c, light)}`,
      (s) => D.toggleLight(s, c.role, id, lightId),
    );
  };
  const scene = () => ctx.state.scenes.find((s) => s.id === sceneId);
  const svg = root.querySelector("[data-pl-canvas]");
  const point = (event) => {
    const m = svg.getScreenCTM?.();
    if (!m) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    const s = scene();
    return { x: Math.max(0, Math.min(s.width, p.x)), y: Math.max(0, Math.min(s.height, p.y)) };
  };
  const place = (p) => {
    const ok = run(
      ctx,
      `${ctx.t("Luce aggiunta", "Light added")}: ${presetName(ctx, prepLights.preset)}`,
      (s) => {
        prepLights.selected = D.addLight(s, ctx.role, sceneId, {
          preset: prepLights.preset,
          x: p.x,
          y: p.y,
        }).id;
      },
    );
    if (!ok) prepLights.selected = null;
  };
  root.querySelector("[data-pl-preset]")?.addEventListener("change", (event) => {
    prepLights.preset = event.target.value;
    ctx.render();
  });
  root.querySelectorAll("[data-pl-select]").forEach((b) =>
    b.addEventListener("click", () => {
      prepLights.selected = b.dataset.plSelect;
      ctx.render();
    }),
  );
  root
    .querySelectorAll("[data-pl-toggle]")
    .forEach((b) =>
      b.addEventListener("click", () => toggleLightById(ctx, sceneId, b.dataset.plToggle)),
    );
  const acts = {
    center: () => {
      const s = scene();
      place({ x: s.width / 2, y: s.height / 2 });
    },
    toggle: () => toggleLightById(ctx, sceneId, prepLights.selected),
    delete: () => {
      const light = prepSelected(ctx, sceneId);
      if (!light) return;
      if (
        run(ctx, `${ctx.t("Luce eliminata", "Light deleted")}: ${lightLabel(ctx, light)}`, (s) =>
          D.removeLight(s, ctx.role, sceneId, light.id),
        )
      )
        prepLights.selected = null;
    },
    deselect: () => {
      prepLights.selected = null;
      ctx.render();
    },
  };
  root
    .querySelectorAll("[data-pl-act]")
    .forEach((b) => b.addEventListener("click", () => acts[b.dataset.plAct]?.()));
  root.querySelectorAll("[data-pl-field]").forEach((input) =>
    input.addEventListener("change", () => {
      const light = prepSelected(ctx, sceneId);
      if (!light) return;
      const key = input.dataset.plField;
      const value = ["color", "preset"].includes(key)
        ? input.value
        : Number(String(input.value).replace(",", "."));
      run(ctx, ctx.t("Luce modificata", "Light changed"), (s) =>
        D.updateLight(s, ctx.role, sceneId, light.id, { [key]: value }),
      );
    }),
  );
  if (!svg) return;
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const handle = event.target.closest?.("[data-pl-light]");
    const p = point(event);
    if (!p) return;
    event.preventDefault();
    if (handle) {
      prepLights.selected = handle.dataset.plLight;
      prepLights.drag = { id: handle.dataset.plLight, start: p, to: null, handle };
      svg.setPointerCapture?.(event.pointerId);
      return;
    }
    place(p);
  });
  svg.addEventListener("pointermove", (event) => {
    const drag = prepLights.drag;
    if (!drag) return;
    const p = point(event);
    if (!p) return;
    if (!drag.to && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4) return;
    drag.to = p;
    drag.handle.setAttribute("transform", `translate(${f1(p.x)} ${f1(p.y)})`);
  });
  svg.addEventListener("pointerup", () => {
    const drag = prepLights.drag;
    prepLights.drag = null;
    if (!drag) return;
    const light = D.sceneConfig(ctx.state, sceneId).lights.find((l) => l.id === drag.id);
    if (drag.to && light && !light.attachedTo)
      run(ctx, `${ctx.t("Luce spostata", "Light moved")}: ${lightLabel(ctx, light)}`, (s) =>
        D.updateLight(s, ctx.role, sceneId, drag.id, { x: drag.to.x, y: drag.to.y }),
      );
    else ctx.render();
  });
  svg.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.target.closest?.("[data-pl-light]")) {
      event.preventDefault();
      acts.center();
    } else if (event.key === "Enter" || event.key === " ") {
      const id = event.target.closest?.("[data-pl-light]")?.dataset.plLight;
      if (!id) return;
      event.preventDefault();
      prepLights.selected = id;
      ctx.render();
    } else if ((event.key === "Delete" || event.key === "Backspace") && prepLights.selected) {
      event.preventDefault();
      acts.delete();
    }
  });
}
