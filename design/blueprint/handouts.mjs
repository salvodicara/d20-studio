// B15 — Materials, handouts, pins and map-less scenes. Entry module of the "handouts" area
// (listed in extensions.mjs). Domain: handouts-domain.mjs; session prep sheet:
// session-prep.mjs; synthetic art: handouts-art.mjs. Evidence and adopted patterns:
// changes/interview-01/blueprint-handouts-evidence.md.
//
// Where it appears: Preparation › Materials and Session prep (DM); Campaign › Materials
// (everyone, to reopen what was shared); Table › Materials drawer, Pin tool, pins layer,
// map-less stage, Reveal panel for the selected token; a pop-up on the player's screen when
// the DM shows something (Foundry "Show Players", FVT-162).

import * as D from "./handouts-domain.mjs";
import { SOURCES as SOURCES_OF_MEDIA } from "./media-domain.mjs";
import { registerSessionPrep, renderSecretsTab, bindSecretsTab } from "./session-prep.mjs";
import { activateScene, renderSceneBase } from "./preparation.mjs";
import { filterHandoutMarkup } from "./safety-ui.mjs";
// R8 CA-88: «Copia in un’altra campagna…» in a material's own menu (contract C5).
import { canCopyToCampaign, copyToCampaign } from "./ui.mjs";

const ID = "handouts";
const L = (it, en) => ({ it, en });
const DIM_KEY = "handouts-view.dim-pins";
// B12 token menu command that hides a creature's name from players (read through the
// registry, so B12 keeps its own slice and log label).
const HIDE_NAME = "token-menu-hide-name";
const KIND = {
  handout: ["Dispensa", "Handout"],
  vignette: ["Vignetta", "Vignette"],
  art: ["Rivelazione", "Reveal"],
};
const PIN_KIND = {
  location: ["Luogo", "Location", "✦"],
  shop: ["Negozio", "Shop", "¤"],
  trap: ["Trappola", "Trap", "!"],
  oddity: ["Stranezza", "Oddity", "?"],
  treasure: ["Tesoro", "Treasure", "◈"],
};
const PIN_PATH = "M0 0C-9-12-17-21-17-31A17 17 0 1 1 17-31C17-21 9-12 0 0Z";
// Transient view state (never persisted): sub-tabs, a pin to focus after navigation.
const ui = {
  prepTab: "materials",
  drawerTab: "materials",
  materialQuery: "",
  focusPin: null,
  popupTimer: null,
  // The navigation (the shell's view object) whose #…&id= link already opened its material:
  // a re-render or a role change keeps it, a new navigation to a link opens it again.
  routeView: null,
};
let registryRef = null;

export function resetHandoutsView({ keepRoute = false } = {}) {
  ui.prepTab = "materials";
  ui.drawerTab = "materials";
  ui.materialQuery = "";
  ui.focusPin = null;
  if (!keepRoute) ui.routeView = null;
}

// ---------------------------------------------------------------------------------------
// Small helpers

const errorText = (ctx, error) =>
  ctx.label(error?.it ? { it: error.it, en: error.en } : String(error?.message ?? error));
/** Runs a private commit (DM material content must not leak through the shared log). */
function run(ctx, it, en, mutate, options = {}) {
  try {
    let result;
    ctx.commit(ctx.t(it, en), (draft) => (result = mutate(draft)), {
      visibility: "private",
      ...options,
    });
    return { ok: true, result };
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return { ok: false, error };
  }
}
/** Same, inside a dialog submit: the dialog shows the refusal and stays open. */
function submit(ctx, it, en, mutate) {
  let result;
  ctx.commit(ctx.t(it, en), (draft) => (result = mutate(draft)), { visibility: "private" });
  return result;
}
const dialogEl = () => (typeof document === "undefined" ? null : document.querySelector("#dialog"));
const when = (ctx, at) =>
  at
    ? new Date(at).toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
const number = (ctx, value) =>
  new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
function accessText(ctx, access) {
  if (!access || access.mode === "none") return ctx.t("Solo DM", "DM only");
  if (access.mode === "all") return ctx.t("Tutto il gruppo", "Whole party");
  return access.actorIds.map((id) => ctx.state.actors[id]?.name ?? id).join(", ");
}
const kindLabel = (ctx, kind) => ctx.t(...KIND[kind]);
// Residual (re-audit 3, CA-88): the DM's lists name who the material is for and whether it
// was shown, so a fresh copy reads «Per: Tutto il gruppo · mai mostrata» (Roll20 handout
// «In the players' journal» is a separate fact from «Can be viewed by»).
const dmAudience = (ctx, m) =>
  `${ctx.t("Per", "For")}: ${accessText(ctx, m.access)} · ${
    m.lastShown
      ? ctx.t("mostrata ", "shown ") + when(ctx, m.lastShown)
      : ctx.t("mai mostrata", "never shown")
  }`;
const controllerLabel = (ctx, controller) =>
  controller === "dm" ? ctx.t("gestito dal DM", "played by the DM") : ctx.t("giocatore", "player");
/** "Library · shared" / "Library · personal" for B28 images, nothing for built-in art. */
const artOrigin = (ctx, art) =>
  art.media
    ? `${ctx.t("Biblioteca", "Library")} · ${art.shared ? ctx.t("condivisa", "shared") : ctx.t("personale", "personal")}`
    : art.uploaded
      ? ctx.t("caricata", "uploaded")
      : "";
function thumb(ctx, image, size = "") {
  return image
    ? `<img class="handouts-thumb ${size}" src="${ctx.esc(image.src ?? image.image)}" alt="" loading="lazy">`
    : `<span class="handouts-thumb handouts-thumb-empty ${size}" aria-hidden="true">${ctx.icon("note")}</span>`;
}
function recipientsFields(ctx, { legend } = {}) {
  const party = D.partyCharacters(ctx.state);
  return `<fieldset class="handouts-recipients"><legend>${ctx.esc(legend ?? ctx.t("Destinatari", "Recipients"))}</legend><label class="handouts-check"><input type="radio" name="mode" value="all" checked> ${ctx.t("Tutto il gruppo", "The whole party")}</label><label class="handouts-check"><input type="radio" name="mode" value="some"> ${ctx.t("Solo alcuni personaggi", "Only some characters")}</label><div class="handouts-recipient-list">${party
    .map(
      (c) =>
        `<label class="handouts-check"><input type="checkbox" name="actor" value="${ctx.esc(c.id)}"> ${ctx.esc(c.name)} <small class="muted">· ${controllerLabel(ctx, c.controller)}</small></label>`,
    )
    .join("")}</div></fieldset>`;
}
/** Ticking a character selects "only some"; choosing "everyone" clears the ticks. */
function bindRecipients(form) {
  form?.querySelectorAll("input[name=actor]").forEach((box) =>
    box.addEventListener("change", () => {
      if (box.checked) form.querySelector("input[name=mode][value=some]").checked = true;
    }),
  );
  form
    ?.querySelector("input[name=mode][value=all]")
    ?.addEventListener("change", () =>
      form.querySelectorAll("input[name=actor]").forEach((box) => (box.checked = false)),
    );
}
const readRecipients = (data) =>
  data.get("mode") === "some"
    ? { mode: "some", actorIds: data.getAll("actor") }
    : { mode: "all", actorIds: [] };

// ---------------------------------------------------------------------------------------
// Full-screen image (Alchemy "open in full-screen": players pan and zoom, VTL-080/162)

export function openFullView(ctx, src, title, opener = null) {
  const host = dialogEl()?.open ? dialogEl() : document.body;
  host.querySelector(".handouts-fullview")?.remove();
  const view = document.createElement("div");
  view.className = "handouts-fullview";
  view.setAttribute("role", "group");
  view.setAttribute("aria-label", title);
  view.innerHTML = `<div class="handouts-fullview-stage" data-hs-full-stage tabindex="0" aria-label="${ctx.esc(title)} · ${ctx.t("trascina per spostare, rotella o pizzico per lo zoom, + e − da tastiera, Esc per uscire", "drag to pan, wheel or pinch to zoom, + and − on the keyboard, Escape to exit")}"><img src="${ctx.esc(src)}" alt="${ctx.esc(title)}" draggable="false"></div><div class="handouts-fullview-bar"><button type="button" class="button" data-hs-full="out" aria-label="${ctx.t("Riduci", "Zoom out")}">−</button><output data-hs-full-level aria-live="polite">100%</output><button type="button" class="button" data-hs-full="in" aria-label="${ctx.t("Ingrandisci", "Zoom in")}">+</button><button type="button" class="button" data-hs-full="fit">${ctx.t("Adatta", "Fit")}</button><button type="button" class="button primary" data-hs-full="close">${ctx.t("Esci da schermo intero", "Exit full screen")}</button></div>`;
  host.append(view);
  const stage = view.querySelector("[data-hs-full-stage]");
  const img = stage.querySelector("img");
  const level = view.querySelector("[data-hs-full-level]");
  const t = { scale: 1, x: 0, y: 0 };
  const apply = () => {
    img.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    level.textContent = Math.round(t.scale * 100) + "%";
  };
  const zoomAt = (factor, cx, cy) => {
    const box = stage.getBoundingClientRect();
    const px = (cx ?? box.left + box.width / 2) - box.left - box.width / 2;
    const py = (cy ?? box.top + box.height / 2) - box.top - box.height / 2;
    const next = Math.min(6, Math.max(1, t.scale * factor));
    const ratio = next / t.scale;
    t.x = px - (px - t.x) * ratio;
    t.y = py - (py - t.y) * ratio;
    t.scale = next;
    if (next === 1) t.x = t.y = 0;
    apply();
  };
  const close = () => {
    view.remove();
    opener?.focus?.();
  };
  view.querySelectorAll("[data-hs-full]").forEach((b) =>
    b.addEventListener("click", () => {
      const action = b.dataset.hsFull;
      if (action === "in") zoomAt(1.4);
      else if (action === "out") zoomAt(1 / 1.4);
      else if (action === "fit") zoomAt(1 / t.scale);
      else close();
    }),
  );
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    },
    { passive: false },
  );
  // One pointer pans, two pointers pinch.
  const pointers = new Map();
  let pinch = null;
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  stage.addEventListener("pointermove", (e) => {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(distance / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = distance;
    } else if (pointers.size === 1 && t.scale > 1) {
      t.x += e.clientX - last.x;
      t.y += e.clientY - last.y;
      apply();
    }
  });
  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  view.addEventListener("keydown", (e) => {
    const step = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    }[e.key];
    if (e.key === "Escape") close();
    else if (e.key === "+" || e.key === "=") zoomAt(1.4);
    else if (e.key === "-") zoomAt(1 / 1.4);
    else if (e.key === "0") zoomAt(1 / t.scale);
    else if (step && t.scale > 1) {
      t.x += step[0];
      t.y += step[1];
      apply();
    } else return;
    // Escape leaves full screen only: the dialog under it stays open.
    e.preventDefault();
    e.stopPropagation();
  });
  apply();
  stage.focus();
}

// ---------------------------------------------------------------------------------------
// Viewer (the same for the pop-up, the panel and Campaign › Materials)

function viewerBody(ctx, p, { preview = false } = {}) {
  const dm = ctx.role === "dm" && !preview;
  const figure = p.image
    ? `<figure class="handouts-figure"><div class="handouts-figure-frame"><img src="${ctx.esc(p.image.src)}" alt="${ctx.esc(p.title)}"></div><figcaption><button type="button" class="button quiet" data-hs-zoom>${ctx.icon("eye")} ${ctx.t("Ingrandisci", "Enlarge")}</button></figcaption></figure>`
    : "";
  const prose = p.playerText ? `<p class="handouts-prose">${ctx.esc(p.playerText)}</p>` : "";
  const sections = p.sections
    .map((s) => {
      const dmText = dm ? p.dmSections?.find((row) => row.id === s.id)?.dmText : "";
      return `<section class="handouts-section" id="handouts-sec-${ctx.esc(s.id)}" data-hs-section-view="${ctx.esc(s.id)}"><h3>${ctx.esc(s.heading)}</h3>${s.playerText ? `<blockquote>${ctx.esc(s.playerText)}</blockquote>` : ""}${dmText ? `<p class="handouts-dm-line"><strong>${ctx.t("Solo DM", "DM only")}:</strong> ${ctx.esc(dmText)}</p>` : ""}</section>`;
    })
    .join("");
  let vignette = "";
  if (p.kind === "vignette") {
    const chosen = (choiceId) => p.choices.find((c) => c.id === choiceId)?.text ?? "";
    const outcome = p.outcome
      ? `<p class="handouts-outcome" data-hs-outcome><strong>${ctx.t("Esito deciso dal DM", "Outcome decided by the DM")}:</strong> ${ctx.esc(chosen(p.outcome.choiceId))}${p.outcome.note ? ` — ${ctx.esc(p.outcome.note)}` : ""}${p.outcome.corrected ? ` <span class="badge">${ctx.t("Corretto", "Corrected")}</span>` : ""}</p>`
      : `<p class="muted">${ctx.t("I giocatori indicano una scelta; l’esito lo decide il DM.", "Players indicate a choice; the DM decides the outcome.")}</p>`;
    if (dm)
      vignette = `<section class="handouts-choices"><h3>${ctx.t("Scelte", "Choices")}</h3><ol>${p.tally
        .map(
          (c) =>
            `<li><span>${ctx.esc(c.text)}</span> <small class="muted">${c.actorIds.length ? c.actorIds.map((id) => ctx.esc(ctx.state.actors[id]?.name ?? id)).join(", ") : ctx.t("nessuna scelta", "no picks")}</small></li>`,
        )
        .join(
          "",
        )}</ol>${outcome}<button type="button" class="button" data-hs-decide>${p.outcome ? ctx.t("Correggi esito…", "Correct outcome…") : ctx.t("Decidi esito…", "Decide outcome…")}</button></section>`;
    else {
      const actors = p.myActors ?? [];
      vignette = `<section class="handouts-choices"><h3>${ctx.t("Scelte", "Choices")}</h3><ol>${p.choices.map((c) => `<li>${ctx.esc(c.text)}</li>`).join("")}</ol>${
        !preview && actors.length && !p.outcome
          ? actors
              .map(
                (actorId) =>
                  `<fieldset class="handouts-pick"><legend>${ctx.t("Scelta di", "Choice for")} ${ctx.esc(ctx.state.actors[actorId]?.name ?? actorId)}</legend>${p.choices
                    .map(
                      (c) =>
                        `<label class="handouts-check"><input type="radio" name="pick-${ctx.esc(actorId)}" value="${ctx.esc(c.id)}" data-hs-choose="${ctx.esc(actorId)}" ${p.myChoices?.[actorId] === c.id ? "checked" : ""}> ${ctx.esc(c.text)}</label>`,
                    )
                    .join("")}</fieldset>`,
              )
              .join("")
          : ""
      }${outcome}</section>`;
    }
  }
  const dmBlock = dm
    ? `<aside class="handouts-dm-note"><h3>${ctx.t("Nota del DM · mai mostrata ai giocatori", "DM note · never shown to players")}</h3><p>${p.dmNote ? ctx.esc(p.dmNote) : `<span class="muted">${ctx.t("Nessuna nota.", "No note.")}</span>`}</p>${p.kind !== "art" ? linkedBlock(ctx, p) : ""}<p class="muted">${ctx.t("Accesso", "Access")}: <strong data-hs-access>${ctx.esc(accessText(ctx, p.access))}</strong>${p.shows.length ? ` · ${ctx.t("mostrato", "shown")} ${p.shows.length}× · ${ctx.t("ultimo", "last")} ${when(ctx, p.shows.at(-1).at)}` : ""}</p>${
        p.corrections.length
          ? `<details><summary>${ctx.t("Correzioni", "Corrections")} (${p.corrections.length})</summary><ul>${p.corrections
              .map(
                (c) =>
                  `<li>${when(ctx, c.at)} · ${c.kind === "outcome" ? ctx.t("esito", "outcome") : ctx.t("accesso", "access")}${c.reason ? ` — ${ctx.esc(c.reason)}` : ""}</li>`,
              )
              .join("")}</ul></details>`
          : ""
      }</aside>`
    : "";
  const shown =
    !dm && p.lastShown
      ? `<p class="muted handouts-shown">${ctx.t("Mostrato dal DM", "Shown by the DM")} · ${when(ctx, p.lastShown)}</p>`
      : "";
  // P10 CA-68 (shared edit): the viewer's own content filter (safety-ui.mjs).
  return filterHandoutMarkup(
    ctx,
    p.id,
    `<article class="handouts-viewer" data-hs-viewer="${ctx.esc(p.id)}"><p class="handouts-kind"><span class="badge">${kindLabel(ctx, p.kind)}</span>${preview ? ` <span class="badge">${ctx.t("Anteprima: vista del giocatore", "Preview: player view")}</span>` : ""}</p>${figure}${prose}${sections}${vignette}${shown}${dmBlock}</article>`,
  );
}
const sceneName = (ctx, sceneId) => ctx.state.scenes.find((s) => s.id === sceneId)?.name ?? "";
/** DM viewer: the scenes the material is linked to (Alchemy scene notes, VTL-078; DDB Scene
 * Prep, DDB-099) and its pins with Roll20 "Go to Pin" (R20-099). */
function linkedBlock(ctx, p) {
  const scenes = p.sceneIds.filter((id) => sceneName(ctx, id));
  const pins = D.pinsForMaterial(ctx.state, p.id);
  const heading = (sectionId) => p.sections.find((s) => s.id === sectionId)?.heading;
  return `<p class="muted" data-hs-linked-scenes>${ctx.t("Scene collegate", "Linked scenes")}: ${
    scenes.length
      ? scenes
          .map(
            (id) =>
              `<strong>${ctx.esc(sceneName(ctx, id))}</strong>${id === ctx.state.activeSceneId ? ` <span class="badge">${ctx.t("Attiva al Tavolo", "Active at table")}</span>` : ""}`,
          )
          .join(", ")
      : ctx.t("nessuna (collegale da Modifica…)", "none (link them from Edit…)")
  }</p>${
    pins.length
      ? `<h4>${ctx.t("Spilli collegati", "Linked pins")}</h4><ul class="handouts-mini-list">${pins
          .map(
            (pin) =>
              `<li><span><strong>${ctx.esc(pin.label)}</strong> <small class="muted">${ctx.esc(sceneName(ctx, pin.sceneId))}${heading(pin.sectionId) ? " › " + ctx.esc(heading(pin.sectionId)) : ""} · ${pin.visible ? ctx.t("visibile ai giocatori", "visible to players") : ctx.t("nascosto", "hidden")}</small></span><button type="button" class="button quiet" data-hs-viewer-goto-pin="${ctx.esc(pin.id)}">${pin.sceneId === ctx.state.activeSceneId ? ctx.t("Vai allo spillo", "Go to pin") : ctx.t("Vedi sulla mappa…", "See on the map…")}</button></li>`,
          )
          .join("")}</ul>`
      : ""
  }`;
}
/** Binds one viewer article (a pop-up may hold several). */
function bindViewer(ctx, article) {
  if (!article) return;
  const id = article.dataset.hsViewer;
  article.querySelector("[data-hs-zoom]")?.addEventListener("click", (event) => {
    const img = article.querySelector(".handouts-figure img");
    openFullView(ctx, img.getAttribute("src"), img.getAttribute("alt"), event.currentTarget);
  });
  article.querySelectorAll("[data-hs-choose]").forEach((radio) =>
    radio.addEventListener("change", () => {
      const done = run(ctx, "Scelta indicata nella vignetta", "Vignette choice indicated", (d) =>
        D.chooseVignette(d, id, radio.dataset.hsChoose, radio.value, ctx.role),
      );
      refreshViewer(ctx, article);
      if (done.ok) ctx.toast(ctx.t("Scelta inviata al DM.", "Choice sent to the DM."));
    }),
  );
  article
    .querySelector("[data-hs-decide]")
    ?.addEventListener("click", () => openDecideDialog(ctx, id));
  article.querySelectorAll("[data-hs-viewer-goto-pin]").forEach((b) =>
    b.addEventListener("click", () => {
      const pin = ctx.state.ext[ID].pins.find((p) => p.id === b.dataset.hsViewerGotoPin);
      if (!pin) return;
      ctx.closeDialog();
      goToPin(ctx, pin);
    }),
  );
}
function refreshViewer(ctx, article) {
  const p = D.projectMaterial(ctx.state, article.dataset.hsViewer, ctx.role);
  if (!p || !article.isConnected) return;
  const holder = document.createElement("div");
  holder.innerHTML = viewerBody(ctx, p);
  const next = holder.firstElementChild;
  article.replaceWith(next);
  bindViewer(ctx, next);
}
export function openViewer(ctx, id, { sectionId = null } = {}) {
  const p = D.projectMaterial(ctx.state, id, ctx.role);
  if (!p) {
    ctx.toast(
      ctx.t("Questo materiale non è disponibile per te.", "This material is not available to you."),
      true,
    );
    return;
  }
  ctx.dialog(p.title, viewerBody(ctx, p), { cancelLabel: ctx.t("Chiudi", "Close") });
  const body = dialogEl()?.querySelector(".dialog-body");
  if (!body) return;
  bindViewer(ctx, body.querySelector("[data-hs-viewer]"));
  if (sectionId) {
    const target = body.querySelector(`[data-hs-section-view="${CSS.escape(sectionId)}"]`);
    target?.classList.add("is-target");
    target?.scrollIntoView({ block: "start" });
  }
}

// Pop-up on the player's screen for new shows (Foundry Show Players). Dismissing it marks the
// shows as seen for this identity only: a private, local change (allowed offline) outside Undo.
function openPendingShows(ctx) {
  if (ctx.role === "dm") return;
  const el = dialogEl();
  if (!el || el.open) return;
  const pending = D.unseenShows(ctx.state, ctx.role);
  if (!pending.length) return;
  const ids = [...new Set(pending.map((row) => row.materialId))];
  const projections = ids.map((id) => D.projectMaterial(ctx.state, id, ctx.role)).filter(Boolean);
  if (!projections.length) return;
  const first = projections[0];
  const outcomeOnly = pending.every((row) => row.kind === "outcome");
  const title =
    projections.length === 1
      ? (outcomeOnly
          ? ctx.t("Il DM ha deciso l’esito: ", "The DM decided the outcome: ")
          : ctx.t("Il DM ti mostra: ", "The DM shows you: ")) + first.title
      : ctx.t(
          `Il DM ti mostra ${projections.length} materiali`,
          `The DM shows you ${projections.length} materials`,
        );
  ctx.dialog(
    title,
    `<div class="handouts-popup" data-hs-popup>${projections
      .map(
        (p) =>
          `${projections.length > 1 ? `<h3 class="handouts-popup-title">${ctx.esc(p.title)}</h3>` : ""}${viewerBody(ctx, p)}`,
      )
      .join(
        "",
      )}<p class="muted">${ctx.t("Puoi riaprirlo quando vuoi da Materiali, al Tavolo o nella campagna.", "Reopen it any time from Materials, at the Table or in the campaign.")}</p></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  el.querySelectorAll("[data-hs-viewer]").forEach((article) => bindViewer(ctx, article));
  // Seen only when the player dismisses it (close button or Escape): a pop-up closed by a
  // navigation is offered again on the next page.
  let marked = false;
  const markSeen = () => {
    if (marked) return;
    marked = true;
    try {
      ctx.commit(
        ctx.t("Materiale ricevuto dal DM", "Material received from the DM"),
        (draft) =>
          D.markSeen(
            draft,
            pending.map((row) => row.showId),
            ctx.role,
          ),
        { local: true, visibility: "private", undoable: false },
      );
    } catch {
      // Not recorded: it will be offered again next time.
    }
  };
  el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", markSeen));
  el.addEventListener("cancel", () => el.querySelector("[data-hs-popup]") && markSeen(), {
    once: true,
  });
}
function schedulePopup(ctx) {
  if (typeof window === "undefined" || !ctx) return;
  clearTimeout(ui.popupTimer);
  ui.popupTimer = setTimeout(() => openPendingShows(ctx), 80);
}

// ---------------------------------------------------------------------------------------
// DM dialogs: show, withdraw, preview, decide, delete, edit

function openShowDialog(ctx, id) {
  const p = D.projectMaterial(ctx.state, id, "dm");
  const refusal = D.shareRefusal(ctx.state, p.image?.id);
  ctx.dialog(
    ctx.t("Mostra ai giocatori: ", "Show players: ") + p.title,
    `${p.image ? thumb(ctx, p.image, "is-wide") : ""}${refusal ? `<p class="handouts-share-note" role="note">${ctx.esc(ctx.label(refusal))}</p>` : ""}${recipientsFields(ctx)}<p class="muted">${ctx.t("Si apre subito sullo schermo dei destinatari, che potranno riaprirlo da Materiali. La nota del DM e le note delle intestazioni non vengono mai mostrate.", "It opens right away on the recipients’ screens, and they can reopen it from Materials. The DM note and heading notes are never shown.")}</p><p class="muted">${ctx.t("Accesso attuale", "Current access")}: ${ctx.esc(accessText(ctx, p.access))}</p>`,
    {
      submitLabel: ctx.t("Mostra", "Show"),
      onSubmit: (data) => {
        const recipients = readRecipients(data);
        submit(ctx, "Materiale mostrato ai giocatori", "Material shown to players", (d) =>
          D.showMaterial(d, id, recipients, ctx.role),
        );
        ctx.toast(ctx.t("Mostrato a: ", "Shown to: ") + accessText(ctx, recipients));
      },
    },
  );
  bindRecipients(dialogEl()?.querySelector("form"));
}
// Same shape as "Show": everyone, or only some characters (ticking one selects it). A
// withdrawal is a correction, so its reason is required and kept with the material.
function openWithdrawDialog(ctx, id) {
  const p = D.projectMaterial(ctx.state, id, "dm");
  const party = D.partyCharacters(ctx.state).filter(
    (c) => p.access.mode === "all" || p.access.actorIds.includes(c.id),
  );
  ctx.dialog(
    ctx.t("Ritira accesso: ", "Withdraw access: ") + p.title,
    `<fieldset class="handouts-recipients"><legend>${ctx.t("Da chi", "From whom")}</legend><label class="handouts-check"><input type="radio" name="mode" value="all" checked> ${ctx.t("Da tutti", "From everyone")}</label><label class="handouts-check"><input type="radio" name="mode" value="some"> ${ctx.t("Solo da alcuni personaggi", "Only from some characters")}</label><div class="handouts-recipient-list">${party.map((c) => `<label class="handouts-check"><input type="checkbox" name="actor" value="${ctx.esc(c.id)}"> ${ctx.esc(c.name)}</label>`).join("")}</div></fieldset><label class="field">${ctx.t("Motivo (obbligatorio, resta nelle correzioni)", "Reason (required, kept with corrections)")}<input name="reason" required maxlength="${D.LIMITS.reason}"></label>`,
    {
      submitLabel: ctx.t("Ritira", "Withdraw"),
      onSubmit: (data) => {
        const recipients = readRecipients(data);
        submit(ctx, "Accesso al materiale ritirato", "Material access withdrawn", (d) =>
          D.withdrawMaterial(
            d,
            id,
            {
              actorIds: recipients.mode === "some" ? recipients.actorIds : null,
              reason: data.get("reason"),
            },
            ctx.role,
          ),
        );
        ctx.toast(
          ctx.t("Accesso ritirato. Ora: ", "Access withdrawn. Now: ") +
            accessText(ctx, D.projectMaterial(ctx.state, id, "dm").access),
        );
      },
    },
  );
  bindRecipients(dialogEl()?.querySelector("form"));
}
function openPreviewDialog(ctx, id) {
  const party = D.partyCharacters(ctx.state);
  const render = (actorId) => {
    const p = D.previewForActor(ctx.state, id, actorId);
    return p
      ? viewerBody(ctx, p, { preview: true })
      : `<p class="empty-state">${ctx.t("Questo personaggio non lo vede ancora: non è fra i destinatari.", "This character does not see it yet: not among the recipients.")}</p>`;
  };
  ctx.dialog(
    ctx.t("Come lo vede un giocatore", "How a player sees it"),
    `<label class="field">${ctx.t("Personaggio", "Character")}<select data-hs-preview-actor>${party.map((c) => `<option value="${ctx.esc(c.id)}">${ctx.esc(c.name)}</option>`).join("")}</select></label><div data-hs-preview>${render(party[0]?.id)}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const el = dialogEl();
  bindViewer(ctx, el?.querySelector("[data-hs-viewer]"));
  el?.querySelector("[data-hs-preview-actor]")?.addEventListener("change", (e) => {
    el.querySelector("[data-hs-preview]").innerHTML = render(e.target.value);
    bindViewer(ctx, el.querySelector("[data-hs-viewer]"));
  });
}
function openDecideDialog(ctx, id) {
  const p = D.projectMaterial(ctx.state, id, "dm");
  ctx.dialog(
    (p.outcome
      ? ctx.t("Correggi esito: ", "Correct outcome: ")
      : ctx.t("Decidi esito: ", "Decide outcome: ")) + p.title,
    `<fieldset class="handouts-recipients"><legend>${ctx.t("Esito", "Outcome")}</legend>${p.tally
      .map(
        (c) =>
          `<label class="handouts-check"><input type="radio" name="choice" value="${ctx.esc(c.id)}" ${p.outcome?.choiceId === c.id ? "checked" : ""} required> ${ctx.esc(c.text)} <small class="muted">${c.actorIds.map((a) => ctx.esc(ctx.state.actors[a]?.name ?? a)).join(", ")}</small></label>`,
      )
      .join(
        "",
      )}</fieldset><label class="field">${ctx.t("Racconto dell’esito per i giocatori", "Outcome narration for players")}<textarea name="note" maxlength="${D.LIMITS.text}">${ctx.esc(p.outcome?.note ?? "")}</textarea></label>${p.outcome ? `<label class="field">${ctx.t("Motivo della correzione (obbligatorio)", "Correction reason (required)")}<input name="reason" required maxlength="${D.LIMITS.reason}"></label>` : ""}`,
    {
      submitLabel: p.outcome
        ? ctx.t("Correggi esito", "Correct outcome")
        : ctx.t("Decidi esito", "Decide outcome"),
      onSubmit: (data) => {
        submit(
          ctx,
          p.outcome ? "Esito della vignetta corretto" : "Esito della vignetta deciso",
          p.outcome ? "Vignette outcome corrected" : "Vignette outcome decided",
          (d) =>
            D.decideVignette(
              d,
              id,
              {
                choiceId: data.get("choice"),
                note: data.get("note"),
                reason: data.get("reason") ?? "",
              },
              ctx.role,
            ),
        );
        ctx.toast(
          ctx.t(
            "Esito registrato e visibile ai destinatari.",
            "Outcome recorded and visible to recipients.",
          ),
        );
      },
    },
  );
}
function openDeleteDialog(ctx, id) {
  const p = D.projectMaterial(ctx.state, id, "dm");
  ctx.dialog(
    ctx.t("Elimina materiale", "Delete material"),
    `<p>${ctx.t("Elimini", "Delete")} <strong>${ctx.esc(p.title)}</strong>? ${ctx.t("Gli spilli collegati restano sulla mappa con il loro testo, senza collegamento; le voci della preparazione collegate perdono il collegamento. Puoi annullare subito con Annulla ultima modifica.", "Linked pins stay on the map with their text, without the link; linked prep-sheet rows lose the link. You can undo right away with Undo last change.")}</p>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit: () => {
        submit(ctx, "Materiale eliminato", "Material deleted", (d) =>
          D.deleteMaterial(d, id, ctx.role),
        );
      },
    },
  );
}
// Image choices: built-in art, then images uploaded here earlier, then the B28 library.
function artOptions(ctx, selected, { none = true } = {}) {
  const all = D.artList(ctx.state);
  const option = (art) =>
    `<option value="${ctx.esc(art.id)}" ${art.id === selected ? "selected" : ""}>${ctx.esc(ctx.label(art.title))}${art.media && !art.shared ? ` · ${ctx.t("personale", "personal")}` : ""}${art.uploaded ? ` · ${ctx.t("caricata", "uploaded")}` : ""}</option>`;
  const group = (label, rows) =>
    rows.length
      ? `<optgroup label="${ctx.esc(label)}">${rows.map(option).join("")}</optgroup>`
      : "";
  return `${none ? `<option value="">${ctx.t("Nessuna immagine", "No image")}</option>` : ""}${group(
    ctx.t("Illustrazioni del prototipo", "Prototype illustrations"),
    all.filter((art) => !art.media && !art.uploaded),
  )}${group(
    ctx.t("Caricate qui in precedenza", "Uploaded here earlier"),
    all.filter((art) => art.uploaded),
  )}${group(
    ctx.t("Biblioteca › Immagini e file", "Library › Images and files"),
    all.filter((art) => art.media),
  )}`;
}
const sectionRow = (ctx, s = {}) =>
  `<fieldset class="handouts-row" data-hs-section data-id="${ctx.esc(s.id ?? "")}"><legend>${ctx.t("Intestazione", "Heading")}</legend><label class="field">${ctx.t("Intestazione", "Heading")}<input data-k="heading" maxlength="${D.LIMITS.heading}" value="${ctx.esc(s.heading ?? "")}"></label><label class="field">${ctx.t("Estratto per i giocatori", "Player excerpt")}<textarea data-k="playerText" maxlength="${D.LIMITS.excerpt}">${ctx.esc(s.playerText ?? "")}</textarea></label><label class="field">${ctx.t("Nota del DM per questa intestazione", "DM note for this heading")}<textarea data-k="dmText" maxlength="${D.LIMITS.text}">${ctx.esc(s.dmText ?? "")}</textarea></label><button type="button" class="button quiet" data-hs-remove-row>${ctx.t("Rimuovi intestazione", "Remove heading")}</button></fieldset>`;
const choiceRow = (ctx, c = {}, i = 0) =>
  `<div class="handouts-row handouts-choice-row" data-hs-choice data-id="${ctx.esc(c.id ?? "")}"><label class="field">${ctx.t("Scelta", "Choice")} ${i + 1}<input data-k="text" maxlength="${D.LIMITS.choice}" value="${ctx.esc(c.text ?? "")}"></label><button type="button" class="button quiet" data-hs-remove-row aria-label="${ctx.t("Rimuovi scelta", "Remove choice")} ${i + 1}">${ctx.icon("close")}</button></div>`;
const shareNote = (ctx, artId) => {
  const refusal = D.shareRefusal(ctx.state, artId);
  return refusal ? ctx.esc(ctx.label(refusal)) : "";
};
function imageFields(ctx, artId) {
  const art = D.resolveArt(ctx.state, artId);
  const note = shareNote(ctx, artId);
  return `<div class="handouts-image-field"><label class="field">${ctx.t("Immagine", "Image")}<select name="artId" data-hs-art>${artOptions(ctx, artId)}</select></label><div class="handouts-image-preview" data-hs-art-preview>${art ? `<img src="${ctx.esc(art.image)}" alt="">` : ""}</div><p class="handouts-share-note" data-hs-art-share role="note" ${note ? "" : "hidden"}>${note}</p><p class="muted">${ctx.t("Le tue immagini si caricano in Biblioteca › Immagini e file (provenienza e licenza servono per mostrarle ai giocatori) e poi compaiono qui.", "Your own images are uploaded in Library › Images and files (source and licence are needed to show them to players), then they appear here.")}</p></div>`;
}
function bindImageFields(ctx, form) {
  const select = form.querySelector("[data-hs-art]");
  const preview = form.querySelector("[data-hs-art-preview]");
  const note = form.querySelector("[data-hs-art-share]");
  select?.addEventListener("change", () => {
    const src = D.resolveArt(ctx.state, select.value)?.image ?? "";
    preview.innerHTML = src ? `<img src="${ctx.esc(src)}" alt="">` : "";
    note.innerHTML = shareNote(ctx, select.value);
    note.hidden = !note.innerHTML;
  });
}
export function openEditor(ctx, { id = null, kind = "handout" } = {}) {
  const existing = id ? ctx.state.ext[ID].materials.find((m) => m.id === id) : null;
  const k = existing?.kind ?? kind;
  const m = existing ?? {
    title: "",
    playerText: "",
    dmNote: "",
    sections: [],
    choices: [{}, {}, {}],
    sceneIds: [],
    tags: [],
    image: null,
  };
  const scenes = ctx.state.scenes;
  ctx.dialog(
    existing
      ? ctx.t("Modifica: ", "Edit: ") + existing.title
      : k === "vignette"
        ? ctx.t("Nuova vignetta", "New vignette")
        : ctx.t("Nuovo handout", "New handout"),
    `<div class="handouts-editor"><label class="field">${ctx.t("Titolo", "Title")}<input name="title" required maxlength="${D.LIMITS.title}" value="${ctx.esc(m.title)}"></label>${imageFields(ctx, m.image?.artId)}<label class="field">${ctx.t("Testo per i giocatori", "Player text")}<textarea name="playerText" maxlength="${D.LIMITS.text}">${ctx.esc(m.playerText)}</textarea></label><label class="field handouts-dm-field">${ctx.t("Nota del DM — mai mostrata ai giocatori", "DM note — never shown to players")}<textarea name="dmNote" maxlength="${D.LIMITS.text}">${ctx.esc(m.dmNote)}</textarea></label>${
      k === "vignette"
        ? `<section class="handouts-editor-group"><h3>${ctx.t("Scelte (da 2 a 6)", "Choices (2 to 6)")}</h3><div data-hs-choices>${m.choices.map((c, i) => choiceRow(ctx, c, i)).join("")}</div><button type="button" class="button" data-hs-add-choice>${ctx.icon("plus")} ${ctx.t("Scelta", "Choice")}</button></section>`
        : ""
    }<section class="handouts-editor-group"><h3>${ctx.t("Intestazioni", "Headings")}</h3><p class="muted">${ctx.t("Ogni intestazione può essere collegata a uno spillo: ai giocatori arriva solo l’estratto.", "Each heading can be linked to a pin: players only receive the excerpt.")}</p><div data-hs-sections>${m.sections.map((s) => sectionRow(ctx, s)).join("")}</div><button type="button" class="button" data-hs-add-section>${ctx.icon("plus")} ${ctx.t("Intestazione", "Heading")}</button></section><fieldset class="handouts-recipients"><legend>${ctx.t("Scene collegate", "Linked scenes")}</legend><p class="muted">${ctx.t("Al Tavolo il materiale compare fra i «Materiali di questa scena» quando la scena è attiva.", "At the Table the material appears under “Materials for this scene” while that scene is active.")}</p>${scenes.map((s) => `<label class="handouts-check"><input type="checkbox" name="scene" value="${ctx.esc(s.id)}" ${m.sceneIds.includes(s.id) ? "checked" : ""}> ${ctx.esc(s.name)}</label>`).join("")}</fieldset><label class="field">${ctx.t("Etichette, separate da virgole (solo per il DM, per cercare)", "Tags, comma separated (DM only, for search)")}<input name="tags" maxlength="${D.LIMITS.tags * (D.LIMITS.tag + 2)}" value="${ctx.esc((m.tags ?? []).join(", "))}" placeholder="${ctx.t("cripta, indizio", "crypt, clue")}"></label></div>`,
    {
      submitLabel: existing ? ctx.t("Salva modifiche", "Save changes") : ctx.t("Crea", "Create"),
      onSubmit: (data, form) => {
        const rows = (selector) =>
          [...form.querySelectorAll(selector)].map((row) => ({
            id: row.dataset.id || undefined,
            ...Object.fromEntries(
              [...row.querySelectorAll("[data-k]")].map((input) => [input.dataset.k, input.value]),
            ),
          }));
        const artId = data.get("artId");
        submit(
          ctx,
          existing ? "Materiale modificato" : "Materiale creato",
          existing ? "Material edited" : "Material created",
          (d) =>
            D.saveMaterial(
              d,
              {
                id: existing?.id,
                kind: k,
                title: data.get("title"),
                image: artId ? { artId } : null,
                playerText: data.get("playerText"),
                dmNote: data.get("dmNote"),
                sections: rows("[data-hs-section]"),
                choices: rows("[data-hs-choice]"),
                sceneIds: data.getAll("scene"),
                tags: String(data.get("tags") ?? "").split(","),
              },
              ctx.role,
            ),
        );
        ctx.toast(
          existing
            ? ctx.t("Modifiche salvate.", "Changes saved.")
            : ctx.t(
                "Creato: visibile solo al DM finché non lo mostri.",
                "Created: DM only until you show it.",
              ),
        );
      },
    },
  );
  const form = dialogEl()?.querySelector("form");
  if (!form) return;
  bindImageFields(ctx, form);
  const rebindRemove = () =>
    form
      .querySelectorAll("[data-hs-remove-row]")
      .forEach((b) => (b.onclick = () => b.closest(".handouts-row").remove()));
  form.querySelector("[data-hs-add-section]")?.addEventListener("click", () => {
    form.querySelector("[data-hs-sections]").insertAdjacentHTML("beforeend", sectionRow(ctx));
    rebindRemove();
    form.querySelector("[data-hs-sections] .handouts-row:last-child input")?.focus();
  });
  form.querySelector("[data-hs-add-choice]")?.addEventListener("click", () => {
    const list = form.querySelector("[data-hs-choices]");
    if (list.children.length >= D.LIMITS.choices) return;
    list.insertAdjacentHTML("beforeend", choiceRow(ctx, {}, list.children.length));
    rebindRemove();
    list.lastElementChild.querySelector("input")?.focus();
  });
  rebindRemove();
}

// ---------------------------------------------------------------------------------------
// Reveal art (from a token: DDB-130; from the library: DDB-129)

/** Whether players currently see this creature's own name (B12 can hide it). */
function nameVisibleToPlayers(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  return (
    actor?.kind === "npc" &&
    ctx.state.ext?.["token-menu"]?.names?.[actorId]?.hidden !== true &&
    ctx.state.scenes.some((s) => s.tokens?.some((t) => t.actorId === actorId))
  );
}
function tokenTarget(ctx, actorId) {
  const scene =
    ctx.state.scenes.find(
      (s) => s.id === ctx.state.activeSceneId && s.tokens?.some((t) => t.actorId === actorId),
    ) ?? ctx.state.scenes.find((s) => s.tokens?.some((t) => t.actorId === actorId));
  const token = scene?.tokens.find((t) => t.actorId === actorId);
  return { actorId, tokenId: token?.id ?? null, sceneId: scene?.id ?? null };
}
// TV-109: sharing a personal image inline (provenance and licence, as the Library asks):
// shown only while the chosen image is still personal; one «Mostra ai giocatori» does both.
function inlineShareHTML(ctx, artId) {
  const asset = D.personalMedia(ctx.state, artId);
  const p = asset?.provenance ?? {};
  return `<fieldset class="handouts-inline-share" data-hs-inline-share${asset ? "" : " hidden"}><legend>${ctx.t("Condividi con la campagna", "Share with the campaign")}</legend><p class="handouts-share-note" role="note" data-hs-inline-share-name>${asset ? ctx.esc(ctx.t(`«${asset.name}» è nella tua libreria personale: mostrandola la condividi con la campagna, con questa provenienza.`, `“${asset.name}” is in your personal library: showing it shares it with the campaign, with this source.`)) : ""}</p><div class="form-grid"><label class="field">${ctx.t("Provenienza", "Source")}<select name="shareSource">${Object.entries(
    SOURCES_OF_MEDIA,
  )
    .map(
      ([id, text]) =>
        `<option value="${ctx.esc(id)}"${(p.source ?? "own") === id ? " selected" : ""}>${ctx.esc(ctx.label(text))}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">${ctx.t("Autore o credito", "Author or credit")}<input name="shareAuthor" maxlength="120" value="${ctx.esc(p.author ?? ctx.t("DM della campagna", "Campaign DM"))}"></label><label class="field">${ctx.t("Licenza", "Licence")}<input name="shareLicense" maxlength="120" value="${ctx.esc(p.license ?? ctx.t("Uso nella campagna", "Campaign use"))}"></label></div></fieldset>`;
}
export function openRevealDialog(ctx, { actorId = null, artId = null } = {}) {
  const actor = actorId ? ctx.state.actors[actorId] : null;
  const arts = actorId ? D.suggestArt(ctx.state, actorId) : D.artList(ctx.state);
  const shareable = (art) => !art.media || art.shared;
  const selected =
    artId ?? (actorId ? D.preferredArt(ctx.state, actorId)?.id : null) ?? arts.find(shareable)?.id;
  const grid = (list, chosen) =>
    list
      .map(
        (art) =>
          `<label class="handouts-art-option"><input type="radio" name="artId" value="${ctx.esc(art.id)}" ${art.id === chosen ? "checked" : ""} required><img src="${ctx.esc(art.image)}" alt=""><span>${ctx.esc(ctx.label(art.title))}</span>${artOrigin(ctx, art) ? `<small class="muted">${ctx.esc(artOrigin(ctx, art))}</small>` : ""}</label>`,
      )
      .join("") || `<p class="muted">${ctx.t("Nessuna immagine trovata.", "No image found.")}</p>`;
  const hideName = registryRef?.get("token-menu", HIDE_NAME, ctx, tokenTarget(ctx, actorId));
  const nameWarning =
    actor && hideName && nameVisibleToPlayers(ctx, actorId)
      ? `<p class="handouts-share-note" role="note">${ctx.t(`I giocatori vedono il nome «${ctx.esc(actor.name)}» sulla pedina.`, `Players see the name “${ctx.esc(actor.name)}” on the token.`)}</p><label class="handouts-check"><input type="checkbox" name="hideName"> ${ctx.t("Nascondi anche il nome ai giocatori (come dal menu della pedina)", "Also hide the name from players (as from the token menu)")}</label>`
      : "";
  ctx.dialog(
    actor
      ? ctx.t("Rivela aspetto: ", "Reveal art: ") + actor.name
      : ctx.t("Rivela un’immagine", "Reveal an image"),
    `<label class="field">${ctx.t("Cerca nelle immagini", "Search images")}<input type="search" data-hs-art-search placeholder="${ctx.t("forziere, taverna, lettera…", "chest, tavern, letter…")}"></label><div class="handouts-art-grid" role="radiogroup" aria-label="${ctx.t("Immagini", "Images")}" data-hs-art-grid>${grid(arts, selected)}</div>${inlineShareHTML(ctx, selected)}<label class="field">${ctx.t("Didascalia per i giocatori", "Caption for players")}<input name="caption" required maxlength="${D.LIMITS.title}" value="${ctx.esc(ctx.label(D.resolveArt(ctx.state, selected)?.title ?? ""))}" data-hs-caption></label>${recipientsFields(ctx)}${nameWarning}<p class="muted">${actor ? ctx.t("Si condivide solo l’immagine con la didascalia: la scheda della creatura resta al DM.", "Only the image and caption are shared: the creature’s sheet stays with the DM.") : ctx.t("L’immagine si apre subito sullo schermo dei destinatari.", "The image opens right away on the recipients’ screens.")}</p>`,
    {
      submitLabel: ctx.t("Mostra ai giocatori", "Show players"),
      onSubmit: (data) => {
        const recipients = readRecipients(data);
        const chosen = data.get("artId");
        const share = D.personalMedia(ctx.state, chosen)
          ? {
              source: data.get("shareSource"),
              author: data.get("shareAuthor"),
              license: data.get("shareLicense"),
            }
          : null;
        submit(ctx, "Immagine rivelata ai giocatori", "Image revealed to players", (d) =>
          D.revealArt(
            d,
            { actorId, artId: chosen, caption: data.get("caption"), recipients, share },
            ctx.role,
          ),
        );
        const hidden =
          data.get("hideName") === "on" &&
          registryRef.run(hideName, ctx, tokenTarget(ctx, actorId));
        ctx.toast(
          ctx.t("Rivelata a: ", "Revealed to: ") +
            accessText(ctx, recipients) +
            (hidden ? ctx.t(" · nome nascosto ai giocatori", " · name hidden from players") : ""),
        );
      },
    },
  );
  const form = dialogEl()?.querySelector("form");
  if (!form) return;
  bindRecipients(form);
  const caption = form.querySelector("[data-hs-caption]");
  const share = form.querySelector("[data-hs-inline-share]");
  let captionTouched = false;
  caption.addEventListener("input", () => (captionTouched = true));
  const syncCaption = () => {
    const chosen = form.querySelector("input[name=artId]:checked")?.value;
    if (!captionTouched && chosen)
      caption.value = ctx.label(D.resolveArt(ctx.state, chosen)?.title ?? "");
    const personal = D.personalMedia(ctx.state, chosen);
    if (share) {
      share.hidden = !personal;
      const line = share.querySelector("[data-hs-inline-share-name]");
      if (line)
        line.textContent = personal
          ? ctx.t(
              `«${personal.name}» è nella tua libreria personale: mostrandola la condividi con la campagna, con questa provenienza.`,
              `“${personal.name}” is in your personal library: showing it shares it with the campaign, with this source.`,
            )
          : "";
    }
  };
  form.querySelector("[data-hs-art-grid]").addEventListener("change", syncCaption);
  form.querySelector("[data-hs-art-search]").addEventListener("input", (event) => {
    const chosen = form.querySelector("input[name=artId]:checked")?.value;
    const found = D.searchArt(ctx.state, event.target.value, ctx.lang);
    const list = actorId && !event.target.value.trim() ? arts : found;
    form.querySelector("[data-hs-art-grid]").innerHTML = grid(
      list,
      list.some((a) => a.id === chosen) ? chosen : list[0]?.id,
    );
    syncCaption();
  });
}

// ---------------------------------------------------------------------------------------
// Pins

function pinLinkOptions(ctx, link) {
  const value = link?.entryId
    ? `entry:${link.entryId}|${link.sectionId ?? ""}`
    : link?.materialId
      ? `${link.materialId}|${link.sectionId ?? ""}`
      : "";
  const option = (v, text) =>
    `<option value="${ctx.esc(v)}" ${value === v ? "selected" : ""}>${ctx.esc(text)}</option>`;
  const materials = ctx.state.ext[ID].materials
    .filter((m) => m.kind !== "art")
    .map(
      (m) =>
        `<optgroup label="${ctx.esc(ctx.t("Materiale", "Material") + " · " + m.title)}">${option(`${m.id}|`, m.title)}${m.sections.map((s) => option(`${m.id}|${s.id}`, `${m.title} › ${s.heading}`)).join("")}</optgroup>`,
    )
    .join("");
  // Campaign › World entries, as the DM reads them (campaign-content projection).
  const entries = D.worldEntries(ctx.state)
    .map((e) => {
      const title = e.data.title || e.id;
      return `<optgroup label="${ctx.esc(ctx.t("Mondo", "World") + " · " + title)}">${option(`entry:${e.id}|`, title)}${e.data.sections.map((s) => option(`entry:${e.id}|${s.id}`, `${title} › ${s.title}`)).join("")}</optgroup>`;
    })
    .join("");
  return `<option value="">${ctx.t("Nessun collegamento (promemoria del DM)", "No link (DM reminder)")}</option>${materials}${entries}`;
}
const parseLink = (value) => {
  if (!value) return null;
  const [target, sectionId] = String(value).split("|");
  return target.startsWith("entry:")
    ? { entryId: target.slice("entry:".length), sectionId: sectionId || null }
    : { materialId: target, sectionId: sectionId || null };
};
function linkedHeading(ctx, link) {
  if (link?.entryId) {
    const entry = D.worldEntry(ctx.state, link.entryId, "dm");
    return entry?.data.sections.find((s) => s.id === link.sectionId)?.title ?? entry?.data.title;
  }
  const material = ctx.state.ext[ID].materials.find((m) => m.id === link?.materialId);
  return material?.sections.find((s) => s.id === link.sectionId)?.heading ?? material?.title;
}
function excerptHint(ctx, link, text) {
  if (link?.entryId && !text)
    return ctx.t(
      "Questa voce del Mondo non è leggibile da tutti i giocatori: scrivi tu l’estratto.",
      "This World entry is not readable by every player: write the excerpt yourself.",
    );
  if (link && !text)
    return ctx.t(
      "Il testo collegato non ha una parte per i giocatori: scrivi tu l’estratto.",
      "The linked text has no player part: write the excerpt yourself.",
    );
  // SV-37: without a link the tick is disabled; the hint says why and what to do.
  if (!link)
    return ctx.t(
      "Nessun collegamento: scegli una voce o un’intestazione qui sopra per usarne il testo, oppure scrivi tu l’estratto.",
      "No link: choose an entry or heading above to use its text, or write the excerpt yourself.",
    );
  return ctx.t(
    "Senza la spunta l’estratto resta quello che scrivi, anche se modifichi la voce.",
    "Without the tick the excerpt stays as you write it, even if you edit the entry.",
  );
}
/** A small read-only picture of a scene with its pins (DM only): used to place a pin
 * without activating the scene, and to preview pins of any scene (DDB Scene Prep). */
function miniMap(ctx, scene, { pins = [], focusId = null, marker = null, attrs = "" } = {}) {
  const w = Number(scene.width) || 1000,
    h = Number(scene.height) || 650;
  return `<svg class="handouts-minimap" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" ${attrs}>${renderSceneBase(scene, ctx)}${stageSvg(ctx, { scene }, "-mini")}${(
    scene.tokens ?? []
  )
    .map(
      (t) =>
        `<circle cx="${Number(t.x)}" cy="${Number(t.y)}" r="16" class="handouts-minimap-token"/>`,
    )
    .join("")}${pins
    .map(
      (p) =>
        `<g class="handouts-pin ${p.visible ? "" : "is-hidden"} ${p.id === focusId ? "is-focused" : ""}" data-hs-minimap-pin="${ctx.esc(p.id)}" transform="translate(${Number(p.x)},${Number(p.y)})"><path class="handouts-pin-shape" d="${PIN_PATH}"/><text class="handouts-pin-glyph" y="-25" text-anchor="middle">${(PIN_KIND[p.kind] ?? PIN_KIND.location)[2]}</text><text class="handouts-pin-label" y="20" text-anchor="middle">${ctx.esc(p.label)}</text></g>`,
    )
    .join(
      "",
    )}${marker ? `<g class="handouts-picker-marker" data-hs-picker-marker transform="translate(${Number(marker.x)},${Number(marker.y)})"><path class="handouts-pin-shape" d="${PIN_PATH}"/><circle r="5" class="handouts-picker-dot"/></g>` : ""}</svg>`;
}
export function openPinEditor(ctx, input) {
  const pin = input.id ? ctx.state.ext[ID].pins.find((p) => p.id === input.id) : null;
  const scene = ctx.state.scenes.find((s) => s.id === (pin?.sceneId ?? input.sceneId));
  const v = pin
    ? { ...pin, excerpt: D.pinExcerpt(ctx.state, pin) }
    : {
        label: "",
        kind: "location",
        link: null,
        excerpt: "",
        dmNote: "",
        visible: false,
        ...input,
      };
  const others = ctx.state.ext[ID].pins.filter((p) => p.sceneId === scene?.id && p.id !== pin?.id);
  // Roll20 "use blockquote as player flavour text" (R20-099): an explicit choice.
  const linkText = v.link ? D.linkExcerpt(ctx.state, v.link) : "";
  const linkedOn = Boolean(linkText) && v.excerptLinked === true;
  // Placing a new pin from Preparation starts from the map (Roll20 Place Pin); a pin placed
  // with a click on the Table keeps its position folded at the end.
  const placeLast = Boolean(pin) || !input.pick;
  const position = `<details class="handouts-position" ${input.pick ? "open" : ""}><summary>${ctx.t("Posizione sulla mappa", "Position on the map")} · ${ctx.esc(scene?.name ?? "")}</summary><p class="muted">${ctx.t("Clicca o tocca la mappa per posare lo spillo; da tastiera usa X e Y. La scena non cambia per i giocatori.", "Click or tap the map to place the pin; with the keyboard use X and Y. The players’ scene does not change.")}</p>${scene ? miniMap(ctx, scene, { pins: others, marker: { x: v.x, y: v.y }, attrs: `data-hs-pin-picker role="img" aria-label="${ctx.esc(ctx.t("Mappa per posare lo spillo", "Map to place the pin"))}"` }) : ""}<div class="handouts-xy"><label class="field">X<input name="x" type="number" min="0" max="${scene?.width ?? 1000}" value="${Math.round(v.x)}" required></label><label class="field">Y<input name="y" type="number" min="0" max="${scene?.height ?? 650}" value="${Math.round(v.y)}" required></label></div></details>`;
  ctx.dialog(
    pin ? ctx.t("Modifica spillo", "Edit pin") : ctx.t("Nuovo spillo", "New pin"),
    `${placeLast ? "" : position}<label class="field">${ctx.t("Etichetta", "Label")}<input name="label" required maxlength="${D.LIMITS.label}" value="${ctx.esc(v.label)}"></label><label class="field">${ctx.t("Tipo", "Kind")}<select name="kind">${D.PIN_KINDS.map((k) => `<option value="${k}" ${k === v.kind ? "selected" : ""}>${PIN_KIND[k][2]} ${ctx.t(PIN_KIND[k][0], PIN_KIND[k][1])}</option>`).join("")}</select></label><p class="muted">${ctx.t("L’icona del tipo è visibile ai giocatori quando riveli lo spillo; il nome del tipo e la nota restano al DM.", "The kind’s icon is visible to players once you reveal the pin; the kind’s name and the note stay with the DM.")}</p><label class="field">${ctx.t("Collega a una voce o a un’intestazione", "Link to an entry or heading")}<select name="link" data-hs-pin-link>${pinLinkOptions(ctx, v.link)}</select></label><label class="handouts-check"><input type="checkbox" name="excerptLinked" data-hs-excerpt-linked ${linkedOn ? "checked" : ""} ${linkText ? "" : "disabled"} aria-describedby="hs-excerpt-hint"> ${ctx.t("Usa il testo per i giocatori dell’intestazione collegata (si aggiorna quando la modifichi)", "Use the linked heading’s player text (it updates when you edit it)")}</label><label class="field">${ctx.t("Estratto per i giocatori — l’unico testo che vedono", "Player excerpt — the only text they see")}<textarea name="excerpt" maxlength="${D.LIMITS.excerpt}" data-hs-pin-excerpt ${linkedOn ? "readonly" : ""}>${ctx.esc(linkedOn ? linkText : v.excerpt)}</textarea></label><p class="muted" id="hs-excerpt-hint" data-hs-excerpt-hint>${excerptHint(ctx, v.link, linkText)}</p><label class="field handouts-dm-field">${ctx.t("Nota del DM", "DM note")}<textarea name="dmNote" maxlength="${D.LIMITS.text}">${ctx.esc(v.dmNote)}</textarea></label><label class="handouts-check"><input type="checkbox" name="visible" ${v.visible ? "checked" : ""}> ${ctx.t("Visibile ai giocatori (di solito lo riveli in gioco)", "Visible to players (usually revealed in play)")}</label>${placeLast ? position : ""}`,
    {
      submitLabel: pin ? ctx.t("Salva spillo", "Save pin") : ctx.t("Posa spillo", "Place pin"),
      onSubmit: (data) => {
        const link = parseLink(data.get("link"));
        const excerptLinked = Boolean(link) && data.get("excerptLinked") === "on";
        const excerpt = String(data.get("excerpt") ?? "");
        submit(
          ctx,
          pin ? "Spillo modificato" : "Spillo posato",
          pin ? "Pin edited" : "Pin placed",
          (d) =>
            D.savePin(
              d,
              {
                id: pin?.id,
                sceneId: scene?.id,
                x: Number(data.get("x")),
                y: Number(data.get("y")),
                label: data.get("label"),
                kind: data.get("kind"),
                link,
                excerpt: excerptLinked ? D.linkExcerpt(d, link) : excerpt,
                excerptLinked: excerptLinked && D.linkExcerpt(d, link).trim() !== "",
                dmNote: data.get("dmNote"),
                visible: data.get("visible") === "on",
              },
              ctx.role,
            ),
        );
        ctx.toast(
          data.get("visible") === "on"
            ? ctx.t("Spillo salvato e visibile ai giocatori.", "Pin saved and visible to players.")
            : ctx.t("Spillo salvato, nascosto ai giocatori.", "Pin saved, hidden from players."),
        );
      },
    },
  );
  const form = dialogEl()?.querySelector("form");
  if (!form) return;
  const excerpt = form.querySelector("[data-hs-pin-excerpt]");
  const hint = form.querySelector("[data-hs-excerpt-hint]");
  const follow = form.querySelector("[data-hs-excerpt-linked]");
  let text = linkText;
  // Following: the excerpt shows the linked text, read-only. Not following: the DM's own text
  // (the linked text is kept as a starting point when it is switched off).
  const syncFollow = () => {
    excerpt.readOnly = follow.checked;
    if (follow.checked) excerpt.value = text;
  };
  follow?.addEventListener("change", syncFollow);
  form.querySelector("[data-hs-pin-link]")?.addEventListener("change", (event) => {
    const link = parseLink(event.target.value);
    text = D.linkExcerpt(ctx.state, link);
    follow.disabled = !text;
    // A new link with player text starts by following it, unless the DM wrote an excerpt.
    if (!text) follow.checked = false;
    else if (!excerpt.value.trim() || follow.checked) follow.checked = true;
    syncFollow();
    hint.textContent = excerptHint(ctx, link, text);
    if (!form.elements.label.value.trim())
      form.elements.label.value = linkedHeading(ctx, link) ?? "";
  });
  // Click-to-place on the scene picture (the X/Y fields stay the keyboard path).
  const picker = form.querySelector("[data-hs-pin-picker]");
  const marker = picker?.querySelector("[data-hs-picker-marker]");
  const moveMarker = () =>
    marker?.setAttribute(
      "transform",
      `translate(${Number(form.elements.x.value) || 0},${Number(form.elements.y.value) || 0})`,
    );
  picker?.addEventListener("click", (event) => {
    const point = picker.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const at = point.matrixTransform(picker.getScreenCTM().inverse());
    form.elements.x.value = String(Math.round(Math.min(scene.width, Math.max(0, at.x))));
    form.elements.y.value = String(Math.round(Math.min(scene.height, Math.max(0, at.y))));
    moveMarker();
  });
  form.elements.x?.addEventListener("input", moveMarker);
  form.elements.y?.addEventListener("input", moveMarker);
}
/** DM-only picture of a scene's pins, active or not (DDB Scene Prep pins, DDB-099). */
export function openPinMap(ctx, sceneId, focusId = null) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const pins = ctx.state.ext[ID].pins.filter((p) => p.sceneId === sceneId);
  const focus = pins.find((p) => p.id === focusId);
  ctx.dialog(
    ctx.t("Spilli: ", "Pins: ") + scene.name,
    `<p class="muted"><span class="badge">${ctx.t("Solo DM", "DM only")}</span> ${scene.id === ctx.state.activeSceneId ? ctx.t("Scena attiva al Tavolo.", "Scene active at the Table.") : ctx.t("Anteprima: la scena dei giocatori non cambia.", "Preview: the players’ scene does not change.")}</p>${miniMap(ctx, scene, { pins, focusId, attrs: `data-hs-pin-map role="img" aria-label="${ctx.esc(ctx.t("Spilli sulla mappa di ", "Pins on the map of ") + scene.name)}"` })}${focus ? `<p data-hs-pin-focus><strong>${ctx.esc(focus.label)}</strong> · ${focus.visible ? ctx.t("visibile ai giocatori", "visible to players") : ctx.t("nascosto ai giocatori", "hidden from players")}${focus.link ? " · " + ctx.esc(D.linkLabel(ctx.state, focus.link)) : ""}</p>` : ""}<div class="toolbar"><button type="button" class="button" data-hs-map-new>${ctx.icon("plus")} ${ctx.t("Nuovo spillo…", "New pin…")}</button>${pins.map((p) => `<button type="button" class="button quiet" data-hs-map-edit="${ctx.esc(p.id)}">${ctx.t("Modifica", "Edit")} ${ctx.esc(p.label)}</button>`).join("")}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const el = dialogEl();
  el?.querySelector("[data-hs-map-new]")?.addEventListener("click", () =>
    openPinEditor(ctx, { sceneId, x: scene.width / 2, y: scene.height / 2, pick: true }),
  );
  el?.querySelectorAll("[data-hs-map-edit], [data-hs-minimap-pin]").forEach((b) =>
    b.addEventListener("click", () =>
      openPinEditor(ctx, { id: b.dataset.hsMapEdit ?? b.dataset.hsMinimapPin, pick: true }),
    ),
  );
}
function openLinkTarget(ctx, link) {
  if (link?.entryId) {
    ctx.closeDialog();
    ctx.navigate("campaign", { tab: "entry", id: link.entryId });
  } else openViewer(ctx, link.materialId, { sectionId: link.sectionId });
}
export function openPin(ctx, pinId) {
  const scene = ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  const pins = D.projectPins(ctx.state, scene?.id, ctx.role);
  const pin =
    pins.find((p) => p.id === pinId) ??
    ctx.state.ext[ID].pins.find((p) => p.id === pinId && ctx.role === "dm");
  if (!pin) return;
  if (ctx.role !== "dm") {
    ctx.dialog(
      pin.label,
      `<div class="handouts-pin-view" data-hs-pin-view>${pin.excerpt ? `<blockquote>${ctx.esc(pin.excerpt)}</blockquote>` : `<p class="muted">${ctx.t("Nessun dettaglio da mostrare.", "No detail to show.")}</p>`}${pin.materialId ? `<button type="button" class="button" data-hs-open-material="${ctx.esc(pin.materialId)}">${ctx.t("Apri materiale", "Open material")}</button>` : ""}${pin.entryId ? `<button type="button" class="button" data-hs-open-entry="${ctx.esc(pin.entryId)}">${ctx.t("Apri la voce del Mondo", "Open the World entry")}</button>` : ""}</div>`,
      { cancelLabel: ctx.t("Chiudi", "Close") },
    );
    const el = dialogEl();
    el?.querySelector("[data-hs-open-material]")?.addEventListener("click", (e) =>
      openViewer(ctx, e.currentTarget.dataset.hsOpenMaterial),
    );
    el?.querySelector("[data-hs-open-entry]")?.addEventListener("click", (e) =>
      openLinkTarget(ctx, { entryId: e.currentTarget.dataset.hsOpenEntry }),
    );
    return;
  }
  const link = pin.link ? D.linkLabel(ctx.state, pin.link) : "";
  const excerpt = D.pinExcerpt(ctx.state, pin);
  ctx.dialog(
    pin.label,
    `<div class="handouts-pin-view" data-hs-pin-view><p><span class="badge" data-hs-pin-state>${pin.visible ? ctx.t("Visibile ai giocatori", "Visible to players") : ctx.t("Nascosto ai giocatori", "Hidden from players")}</span> <span class="badge">${ctx.t(...PIN_KIND[pin.kind].slice(0, 2))}</span></p>${link ? `<p>${ctx.t("Collegato a", "Linked to")}: <button type="button" class="text-button" data-hs-open-link>${ctx.esc(link)}</button></p>` : pin.link ? `<p class="muted">${ctx.t("La voce collegata non è più disponibile.", "The linked entry is no longer available.")}</p>` : `<p class="muted">${ctx.t("Promemoria del DM senza collegamento.", "DM reminder without a link.")}</p>`}<h3>${ctx.t("Estratto per i giocatori", "Player excerpt")}${pin.excerptLinked ? ` <small class="muted">· ${ctx.t("segue la voce collegata", "follows the linked entry")}</small>` : ""}</h3>${excerpt ? `<blockquote>${ctx.esc(excerpt)}</blockquote>` : `<p class="muted">${ctx.t("Nessun estratto: i giocatori vedrebbero solo l’etichetta.", "No excerpt: players would only see the label.")}</p>`}${pin.dmNote ? `<h3>${ctx.t("Nota del DM", "DM note")}</h3><p class="handouts-dm-line">${ctx.esc(pin.dmNote)}</p>` : ""}<div class="toolbar"><button type="button" class="button primary" data-hs-pin-toggle>${pin.visible ? ctx.t("Nascondi ai giocatori", "Hide from players") : ctx.t("Rivela ai giocatori", "Reveal to players")}</button><button type="button" class="button" data-hs-pin-edit>${ctx.t("Modifica…", "Edit…")}</button><button type="button" class="button danger" data-hs-pin-delete>${ctx.t("Elimina", "Delete")}</button></div></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const el = dialogEl();
  el?.querySelector("[data-hs-open-link]")?.addEventListener("click", () =>
    openLinkTarget(ctx, pin.link),
  );
  el?.querySelector("[data-hs-pin-toggle]")?.addEventListener("click", () => {
    const done = run(
      ctx,
      pin.visible ? "Spillo nascosto ai giocatori" : "Spillo rivelato ai giocatori",
      pin.visible ? "Pin hidden from players" : "Pin revealed to players",
      (d) => D.setPinVisible(d, pin.id, !pin.visible, ctx.role),
    );
    if (done.ok) {
      ctx.closeDialog();
      ctx.toast(
        pin.visible
          ? ctx.t("Spillo nascosto.", "Pin hidden.")
          : ctx.t(
              "Spillo rivelato: i giocatori vedono solo etichetta ed estratto.",
              "Pin revealed: players see only label and excerpt.",
            ),
      );
    }
  });
  el?.querySelector("[data-hs-pin-edit]")?.addEventListener("click", () =>
    openPinEditor(ctx, { id: pin.id }),
  );
  el?.querySelector("[data-hs-pin-delete]")?.addEventListener("click", () => {
    if (run(ctx, "Spillo eliminato", "Pin deleted", (d) => D.deletePin(d, pin.id, ctx.role)).ok) {
      ctx.closeDialog();
      ctx.toast(
        ctx.t(
          "Spillo eliminato. Puoi annullare con Annulla ultima modifica.",
          "Pin deleted. You can undo with Undo last change.",
        ),
      );
    }
  });
}
function pinsSvg(ctx, tv) {
  const pins = D.projectPins(ctx.state, tv.scene.id, ctx.role);
  if (!pins.length) return "";
  const dim = ctx.role === "dm" && registryRef?.getSetting(ctx, DIM_KEY) === true;
  return pins
    .map((p) => {
      const kind = PIN_KIND[p.kind] ?? PIN_KIND.location;
      const hiddenText =
        ctx.role === "dm" && !p.visible
          ? ctx.t(", nascosto ai giocatori", ", hidden from players")
          : "";
      return `<g class="handouts-pin ${p.visible ? "" : "is-hidden"} ${dim ? "is-dim" : ""}" data-handouts-pin="${ctx.esc(p.id)}" transform="translate(${Number(p.x)},${Number(p.y)})" tabindex="0" role="button" aria-label="${ctx.t("Spillo", "Pin")}: ${ctx.esc(p.label)}${hiddenText}"><circle class="handouts-pin-hit" r="30" cy="-18"/><path class="handouts-pin-shape" d="${PIN_PATH}"/><text class="handouts-pin-glyph" y="-25" text-anchor="middle">${kind[2]}</text><text class="handouts-pin-label" y="20" text-anchor="middle">${ctx.esc(p.label)}</text></g>`;
    })
    .join("");
}
function bindPins(el, ctx, table) {
  // Keep a hit area of at least 44 screen pixels however far the map is scaled down.
  const scale = table.svg?.getScreenCTM?.()?.a || 1;
  el.querySelectorAll(".handouts-pin-hit").forEach((hit) =>
    hit.setAttribute("r", String(Math.max(30, 22 / scale))),
  );
  el.querySelectorAll("[data-handouts-pin]").forEach((g) => {
    const id = g.dataset.handoutsPin;
    let drag = null;
    g.addEventListener("click", (event) => {
      event.stopPropagation();
      if (drag?.moved) {
        drag = null;
        return;
      }
      openPin(ctx, id);
    });
    g.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openPin(ctx, id);
      }
    });
    if (ctx.role !== "dm") return;
    // DM drag to move (Roll20/DDB pins are draggable); one commit on release.
    g.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const start = table.point(event);
      const pin = ctx.state.ext[ID].pins.find((p) => p.id === id);
      drag = { start, origin: { x: pin.x, y: pin.y }, moved: false, pointerId: event.pointerId };
      g.setPointerCapture(event.pointerId);
    });
    g.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const p = table.point(event);
      const dx = p.x - drag.start.x,
        dy = p.y - drag.start.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      if (drag.moved) {
        // Kept inside the map, like the pin picker (a pin must stay on the scene).
        const clamp = (value, max) => Math.min(Number(max) || 0, Math.max(0, value));
        drag.to = {
          x: clamp(drag.origin.x + dx, table.scene.width),
          y: clamp(drag.origin.y + dy, table.scene.height),
        };
        g.setAttribute("transform", `translate(${drag.to.x},${drag.to.y})`);
      }
    });
    g.addEventListener("pointerup", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.stopPropagation();
      if (drag.moved && drag.to) {
        const { to, origin } = drag;
        setTimeout(() => {
          const done = run(ctx, "Spillo spostato", "Pin moved", (d) =>
            D.movePin(d, id, to.x, to.y, ctx.role),
          );
          // Refused (offline, for example): the pin goes back where it is stored.
          if (!done.ok) g.setAttribute("transform", `translate(${origin.x},${origin.y})`);
        }, 0);
      } else drag = null;
    });
  });
  if (ui.focusPin) {
    const target = el.querySelector(`[data-handouts-pin="${CSS.escape(ui.focusPin)}"]`);
    ui.focusPin = null;
    if (target) {
      target.classList.add("is-focused");
      requestAnimationFrame(() => target.focus());
      table.message(ctx.t("Spillo evidenziato sulla mappa.", "Pin highlighted on the map."));
    }
  }
}
/** Active scene: highlight the pin at the Table. Any other scene: the DM-only preview, so
 * the players' view never moves (DDB Scene Prep). */
function goToPin(ctx, pin) {
  if (pin.sceneId !== ctx.state.activeSceneId) return openPinMap(ctx, pin.sceneId, pin.id);
  ui.focusPin = pin.id;
  if (ctx.view.page === "table") ctx.render();
  else ctx.navigate("table");
}

// ---------------------------------------------------------------------------------------
// Map-less scenes: a gridless scene whose picture fills the map (Foundry gridless scene,
// FVT-072; Owlbear image as the scene, VTL-068; DDB Theater of the Mind organizer, DDB-101).
// Tokens move freely on it; the Table keeps its usual scale for ruler and movement.

function stageSvg(ctx, tv, suffix = "") {
  const stage = D.stageFor(ctx.state, tv.scene.id);
  if (!stage) return "";
  const art = D.resolveArt(ctx.state, stage.artId, ctx.role);
  const w = Number(tv.scene.width) || 1000,
    h = Number(tv.scene.height) || 650;
  const fade = `handouts-stage-fade${suffix}`;
  return `<g class="handouts-stage" data-hs-stage><defs><linearGradient id="${fade}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1116" stop-opacity=".75"/><stop offset=".22" stop-color="#0b1116" stop-opacity="0"/><stop offset=".7" stop-color="#0b1116" stop-opacity="0"/><stop offset="1" stop-color="#0b1116" stop-opacity=".7"/></linearGradient></defs><rect width="${w}" height="${h}" fill="#10171d"/>${art ? `<image href="${ctx.esc(art.image)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>` : ""}<rect width="${w}" height="${h}" fill="url(#${fade})"/><text class="handouts-stage-title" x="32" y="60">${ctx.esc(tv.scene.name)}</text><text class="handouts-stage-sub" x="34" y="88">${ctx.t("Teatro della mente · nessuna griglia", "Theatre of the mind · no grid")}</text></g>`;
}
function stagePanel(ctx, tv) {
  const scene = tv.scene;
  const materials = D.sceneMaterials(ctx.state, scene.id, ctx.role);
  const scale = number(ctx, scene.metersPerCell ?? 1.5);
  return `<div class="handouts-stage-panel" data-hs-stage-panel><p class="handouts-stage-note">${ctx.t(`Scena senza mappa: nessuna griglia. Posizioni e distanze le descrive il DM; le pedine si spostano liberamente sull’immagine. Il righello e il movimento del Tavolo, se li usi, contano comunque ${scale} m per casella.`, `Map-less scene: no grid. The DM describes positions and distances; tokens move freely on the picture. The Table’s ruler and movement, if you use them, still count ${scale} m per cell.`)}</p>${scene.publicDescription ? `<p class="handouts-prose">${ctx.esc(scene.publicDescription)}</p>` : ""}${
    materials.length
      ? `<h4>${ctx.t("Materiali della scena", "Scene materials")}</h4><ul class="handouts-mini-list">${materials
          .map(
            (m) =>
              `<li><span>${ctx.esc(m.title)} <small class="muted">${kindLabel(ctx, m.kind)}${ctx.role === "dm" ? " · " + ctx.esc(dmAudience(ctx, m)) : ""}</small></span><span class="toolbar"><button type="button" class="button quiet" data-hs-open="${ctx.esc(m.id)}">${ctx.t("Apri", "Open")}</button>${ctx.role === "dm" ? `<button type="button" class="button" data-hs-show="${ctx.esc(m.id)}">${ctx.t("Mostra…", "Show…")}</button>` : ""}</span></li>`,
          )
          .join("")}</ul>`
      : ""
  }${ctx.role === "dm" ? `<button type="button" class="button quiet" data-hs-stage-edit="${ctx.esc(scene.id)}">${ctx.t("Immagine e descrizione…", "Image and description…")}</button>` : ""}</div>`;
}
function artGrid(ctx, selected, { none = true } = {}) {
  return `<div class="handouts-art-grid" role="radiogroup" aria-label="${ctx.t("Immagine di scena", "Scene image")}">${none ? `<label class="handouts-art-option"><input type="radio" name="artId" value="" ${!selected ? "checked" : ""}><span class="handouts-thumb handouts-thumb-empty" aria-hidden="true">${ctx.icon("close")}</span><span>${ctx.t("Nessuna", "None")}</span></label>` : ""}${D.artList(
    ctx.state,
  )
    .map(
      (art) =>
        `<label class="handouts-art-option"><input type="radio" name="artId" value="${ctx.esc(art.id)}" ${art.id === selected ? "checked" : ""}><img src="${ctx.esc(art.image)}" alt=""><span>${ctx.esc(ctx.label(art.title))}</span>${artOrigin(ctx, art) ? `<small class="muted">${ctx.esc(artOrigin(ctx, art))}</small>` : ""}</label>`,
    )
    .join("")}</div>`;
}
export function openStageDialog(ctx) {
  const party = D.partyCharacters(ctx.state);
  const materials = ctx.state.ext[ID].materials.filter((m) => m.kind !== "art");
  ctx.dialog(
    ctx.t("Nuova scena senza mappa", "New map-less scene"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="${D.LIMITS.scene}" placeholder="${ctx.t("Taverna", "Tavern")}"></label><label class="field">${ctx.t("Descrizione per i giocatori", "Description for players")}<textarea name="publicDescription" maxlength="${D.LIMITS.text}"></textarea></label><label class="field handouts-dm-field">${ctx.t("Note del DM", "DM notes")}<textarea name="description" maxlength="${D.LIMITS.text}"></textarea></label><fieldset class="handouts-recipients"><legend>${ctx.t("Immagine di scena", "Scene image")}</legend>${artGrid(ctx, "art-tavern")}</fieldset><fieldset class="handouts-recipients"><legend>${ctx.t("Partecipanti in scena", "Participants on stage")}</legend>${party.map((c) => `<label class="handouts-check"><input type="checkbox" name="participant" value="${ctx.esc(c.id)}" checked> ${ctx.esc(c.name)}</label>`).join("")}</fieldset>${materials.length ? `<fieldset class="handouts-recipients"><legend>${ctx.t("Materiali della scena", "Scene materials")}</legend>${materials.map((m) => `<label class="handouts-check"><input type="checkbox" name="material" value="${ctx.esc(m.id)}"> ${ctx.esc(m.title)}</label>`).join("")}</fieldset>` : ""}<p class="muted">${ctx.t("L’immagine riempie la scena, senza griglia; le pedine dei partecipanti partono in basso. La scena resta riservata al DM finché non la attivi al Tavolo.", "The picture fills the scene, without a grid; the participants’ tokens start at the bottom. The scene stays DM-only until you activate it at the Table.")}</p>`,
    {
      submitLabel: ctx.t("Crea scena senza mappa", "Create map-less scene"),
      onSubmit: (data) => {
        submit(ctx, "Scena senza mappa creata", "Map-less scene created", (d) =>
          D.createMaplessScene(
            d,
            {
              name: data.get("name"),
              publicDescription: data.get("publicDescription"),
              description: data.get("description"),
              artId: data.get("artId"),
              participantIds: data.getAll("participant"),
              materialIds: data.getAll("material"),
            },
            ctx.role,
          ),
        );
        ctx.toast(
          ctx.t(
            "Scena creata. Attivala al Tavolo quando serve.",
            "Scene created. Activate it at the Table when needed.",
          ),
        );
      },
    },
  );
}
function openStageEdit(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  const stage = D.stageFor(ctx.state, sceneId);
  ctx.dialog(
    ctx.t("Scena senza mappa: ", "Map-less scene: ") + scene.name,
    `<label class="field">${ctx.t("Descrizione per i giocatori", "Description for players")}<textarea name="publicDescription" maxlength="${D.LIMITS.text}">${ctx.esc(scene.publicDescription ?? "")}</textarea></label><fieldset class="handouts-recipients"><legend>${ctx.t("Immagine di scena", "Scene image")}</legend>${artGrid(ctx, stage?.artId)}</fieldset>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) =>
        void submit(ctx, "Scena senza mappa aggiornata", "Map-less scene updated", (d) =>
          D.updateStage(
            d,
            sceneId,
            { artId: data.get("artId"), publicDescription: data.get("publicDescription") },
            ctx.role,
          ),
        ),
    },
  );
}
function openActivateDialog(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  const active = ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  ctx.dialog(
    ctx.t("Attiva al Tavolo", "Activate at table"),
    `<p>${ctx.t("Scena di destinazione", "Destination scene")}: <strong>${ctx.esc(scene.name)}</strong></p><p>${ctx.t("La vista del gruppo passerà da", "The party view will move from")} <strong>${ctx.esc(active?.name ?? ctx.t("nessuna scena", "no scene"))}</strong> ${ctx.t("a questa scena senza mappa. Non avvia un combattimento.", "to this map-less scene. This does not start combat.")}</p>`,
    {
      submitLabel: ctx.t("Attiva per il gruppo", "Activate for the party"),
      onSubmit: () => {
        if (ctx.state.combat?.active)
          D.fail(
            "Concludi l’incontro in corso prima di cambiare scena.",
            "End the current encounter before changing scene.",
          );
        ctx.commit(ctx.t("Scena attivata al Tavolo", "Scene activated at table"), (d) =>
          activateScene(d, sceneId, ctx.role),
        );
        ctx.navigate("table");
      },
    },
  );
}

// ---------------------------------------------------------------------------------------
// Preparation › Materials (DM)

const PREP_TABS = [
  ["materials", "Materiali", "Materials"],
  ["pins", "Spilli", "Pins"],
  ["stages", "Scene senza mappa", "Map-less scenes"],
  ["images", "Immagini", "Images"],
];
function materialCard(ctx, m, hidden = false) {
  const tally =
    m.kind === "vignette"
      ? Object.keys(ctx.state.ext[ID].materials.find((x) => x.id === m.id).responses).length
      : 0;
  const detail = [
    kindLabel(ctx, m.kind),
    m.lastShown
      ? ctx.t("mostrata ", "shown ") + when(ctx, m.lastShown)
      : ctx.t("mai mostrata", "never shown"),
    m.sections.length
      ? ctx.t(`${m.sections.length} intestazioni`, `${m.sections.length} headings`)
      : "",
    m.kind === "vignette"
      ? m.outcome
        ? ctx.t("esito deciso", "outcome decided")
        : ctx.t(`${tally} scelte ricevute`, `${tally} picks received`)
      : "",
    m.actorId
      ? ctx.t("dalla pedina di ", "from the token of ") + (ctx.state.actors[m.actorId]?.name ?? "?")
      : "",
    ...m.sceneIds
      .map((id) => sceneName(ctx, id))
      .filter(Boolean)
      .map((name) => ctx.t("Scena: ", "Scene: ") + name),
  ].filter(Boolean);
  return `<article class="handouts-card" data-material="${ctx.esc(m.id)}" ${hidden ? "hidden" : ""}>${thumb(ctx, m.image)}<div class="handouts-card-main"><h3>${ctx.esc(m.title)}</h3><p class="muted">${detail.map(ctx.esc).join(" · ")}</p><p><span class="badge" data-hs-access-badge>${ctx.esc(accessText(ctx, m.access))}</span>${m.tags.map((tag) => ` <span class="badge handouts-tag">#${ctx.esc(tag)}</span>`).join("")}</p></div><div class="handouts-card-actions"><button type="button" class="button primary" data-hs-show="${ctx.esc(m.id)}">${ctx.t("Mostra…", "Show…")}</button><button type="button" class="button" data-hs-open="${ctx.esc(m.id)}">${ctx.t("Apri", "Open")}</button><details class="handouts-more"><summary class="button quiet">${ctx.t("Altro", "More")}</summary><div>${m.kind !== "art" ? `<button type="button" data-hs-edit="${ctx.esc(m.id)}">${ctx.t("Modifica…", "Edit…")}</button><button type="button" data-hs-duplicate="${ctx.esc(m.id)}">${ctx.t("Duplica", "Duplicate")}</button>` : ""}<button type="button" data-hs-preview="${ctx.esc(m.id)}">${ctx.t("Come lo vede un giocatore…", "How a player sees it…")}</button>${m.kind === "vignette" ? `<button type="button" data-hs-decide-id="${ctx.esc(m.id)}">${m.outcome ? ctx.t("Correggi esito…", "Correct outcome…") : ctx.t("Decidi esito…", "Decide outcome…")}</button>` : ""}${m.access.mode !== "none" ? `<button type="button" data-hs-withdraw="${ctx.esc(m.id)}">${ctx.t("Ritira accesso…", "Withdraw access…")}</button>` : ""}${canCopyToCampaign(ctx) ? `<button type="button" data-hs-copy-to="${ctx.esc(m.id)}">${ctx.t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>` : ""}<button type="button" data-hs-delete="${ctx.esc(m.id)}">${ctx.t("Elimina…", "Delete…")}</button></div></details></div></article>`;
}
function pinRows(ctx, pins) {
  if (!pins.length) return `<p class="muted">${ctx.t("Nessuno spillo.", "No pins.")}</p>`;
  return `<ul class="handouts-mini-list">${pins
    .map((p) => {
      const active = p.sceneId === ctx.state.activeSceneId;
      return `<li data-hs-pin-row="${ctx.esc(p.id)}"><span><strong>${ctx.esc(p.label)}</strong> <small class="muted">${ctx.t(...PIN_KIND[p.kind].slice(0, 2))}${p.link ? " · " + ctx.esc(D.linkLabel(ctx.state, p.link) || ctx.t("collegamento non disponibile", "link unavailable")) : ""}</small></span><span class="toolbar"><button type="button" class="button ${p.visible ? "active" : ""}" data-hs-pin-visible="${ctx.esc(p.id)}" aria-pressed="${p.visible}">${p.visible ? ctx.t("Visibile", "Visible") : ctx.t("Nascosto", "Hidden")}</button><button type="button" class="button quiet" data-hs-goto-pin="${ctx.esc(p.id)}">${active ? ctx.t("Vai allo spillo", "Go to pin") : ctx.t("Vedi sulla mappa…", "See on the map…")}</button><button type="button" class="button quiet" data-hs-pin-edit-id="${ctx.esc(p.id)}">${ctx.t("Modifica…", "Edit…")}</button></span></li>`;
    })
    .join("")}</ul>`;
}
function renderPrepMaterials(ctx) {
  const slice = ctx.state.ext[ID];
  const tabs = `<nav class="handouts-subtabs" aria-label="${ctx.t("Materiali", "Materials")}">${PREP_TABS.map(([id, it, en]) => `<button type="button" class="button ${ui.prepTab === id ? "active" : "quiet"}" data-hs-prep-tab="${id}" aria-pressed="${ui.prepTab === id}">${ctx.t(it, en)}</button>`).join("")}</nav>`;
  let body = "";
  if (ui.prepTab === "materials") {
    const list = D.listMaterials(ctx.state, "dm");
    const shown = matchingIds(ctx);
    body = `<div class="toolbar handouts-actions"><button type="button" class="button primary" data-hs-new="handout">${ctx.icon("plus")} ${ctx.t("Nuovo handout", "New handout")}</button><button type="button" class="button" data-hs-new="vignette">${ctx.icon("plus")} ${ctx.t("Nuova vignetta", "New vignette")}</button><label class="field handouts-search">${ctx.t("Cerca nei materiali", "Search materials")}<input type="search" data-hs-material-search value="${ctx.esc(ui.materialQuery)}" placeholder="${ctx.t("titolo, testo, intestazione, etichetta", "title, text, heading, tag")}"></label></div><p class="muted">${ctx.t("Un materiale resta al DM finché non lo mostri. I giocatori lo ricevono come finestra e lo riaprono da Materiali; la nota del DM non esce mai.", "Material stays with the DM until you show it. Players receive it as a window and reopen it from Materials; the DM note never leaves.")}</p><div class="handouts-cards">${list.map((m) => materialCard(ctx, m, !shown.has(m.id))).join("")}</div><p class="empty-state" data-hs-material-empty ${list.some((m) => shown.has(m.id)) ? "hidden" : ""}>${list.length ? ctx.t("Nessun materiale corrisponde alla ricerca.", "No material matches your search.") : ctx.t("Nessun materiale.", "No materials.")}</p>`;
  } else if (ui.prepTab === "pins") {
    // Every scene, active or not: pins are prepared without moving the players (DDB-099).
    body = `<p class="muted">${ctx.t("Posa gli spilli su qualunque scena, anche non attiva: nascono nascosti ai giocatori. Collegali a un materiale o a una voce del Mondo; rivelati, mostrano solo l’estratto. Al Tavolo c’è anche lo strumento Spillo.", "Place pins on any scene, active or not: they start hidden from players. Link them to a material or a World entry; once revealed they show only the excerpt. The Table also has the Pin tool.")}</p>${ctx.state.scenes
      .map((scene) => {
        const pins = slice.pins.filter((p) => p.sceneId === scene.id);
        return `<section class="handouts-group" data-hs-pin-scene="${ctx.esc(scene.id)}"><div class="handouts-group-head"><h3>${ctx.esc(scene.name)}${scene.id === ctx.state.activeSceneId ? ` <span class="badge">${ctx.t("Attiva al Tavolo", "Active at table")}</span>` : ""}</h3><span class="toolbar"><button type="button" class="button" data-hs-new-pin="${ctx.esc(scene.id)}">${ctx.icon("plus")} ${ctx.t("Nuovo spillo…", "New pin…")}</button><button type="button" class="button quiet" data-hs-pin-map="${ctx.esc(scene.id)}">${ctx.icon("map")} ${ctx.t("Vedi la mappa…", "See the map…")}</button></span></div>${pinRows(ctx, pins)}</section>`;
      })
      .join("")}`;
  } else if (ui.prepTab === "stages") {
    const stages = ctx.state.scenes.filter((s) => D.stageFor(ctx.state, s.id));
    body = `<div class="toolbar handouts-actions"><button type="button" class="button primary" data-hs-new-stage>${ctx.icon("plus")} ${ctx.t("Nuova scena senza mappa", "New map-less scene")}</button></div><p class="muted">${ctx.t("Per il teatro della mente o i tavoli in presenza: immagine, descrizione e materiali, senza griglia.", "For theatre of the mind or in-person tables: image, description and materials, no grid.")}</p>${
      stages.length
        ? `<ul class="handouts-mini-list">${stages
            .map((s) => {
              const art = D.resolveArt(ctx.state, D.stageFor(ctx.state, s.id).artId);
              return `<li data-hs-stage-row="${ctx.esc(s.id)}"><span class="handouts-stage-row">${thumb(ctx, art)}<span><strong>${ctx.esc(s.name)}</strong> ${s.id === ctx.state.activeSceneId ? `<span class="badge">${ctx.t("Attiva al Tavolo", "Active at table")}</span>` : ""}<br><small class="muted">${ctx.esc(s.publicDescription || ctx.t("Nessuna descrizione", "No description"))}</small></span></span><span class="toolbar">${s.id === ctx.state.activeSceneId ? `<button type="button" class="button" data-hs-open-table>${ctx.t("Vai al Tavolo", "Go to table")}</button>` : `<button type="button" class="button primary" data-hs-activate="${ctx.esc(s.id)}">${ctx.t("Attiva al Tavolo…", "Activate at table…")}</button>`}<button type="button" class="button quiet" data-hs-stage-edit="${ctx.esc(s.id)}">${ctx.t("Modifica…", "Edit…")}</button></span></li>`;
            })
            .join("")}</ul>`
        : `<p class="muted">${ctx.t("Nessuna scena senza mappa.", "No map-less scenes.")}</p>`
    }`;
  } else {
    // One image system: the prototype's art plus the B28 library (upload, provenance and
    // sharing live there).
    body = `<div class="toolbar handouts-actions"><button type="button" class="button" data-hs-open-media>${ctx.icon("plus")} ${ctx.t("Carica o condividi in Immagini e file", "Upload or share in Images and files")}</button></div><p class="muted">${ctx.t("Le immagini della Biblioteca «personali» si mostrano ai giocatori solo dopo averle condivise con la campagna, con provenienza e licenza.", "“Personal” Library images reach players only once shared with the campaign, with source and licence.")}</p><div class="handouts-library">${D.artList(
      ctx.state,
    )
      .map(
        (art) =>
          `<figure class="handouts-library-item" data-hs-library-item="${ctx.esc(art.id)}"><img src="${ctx.esc(art.image)}" alt=""><figcaption><span>${ctx.esc(ctx.label(art.title))}${artOrigin(ctx, art) ? ` <small class="muted">${ctx.esc(artOrigin(ctx, art))}</small>` : ""}</span><button type="button" class="button" data-hs-reveal-art="${ctx.esc(art.id)}">${ctx.t("Mostra…", "Show…")}</button></figcaption></figure>`,
      )
      .join(
        "",
      )}</div><p class="muted">${ctx.t("Le illustrazioni senza etichetta sono sintetiche, disegnate per il prototipo.", "Unlabelled illustrations are synthetic, drawn for the prototype.")}</p>`;
  }
  return `<section class="handouts-prep-materials" data-handouts-prep-materials>${tabs}${body}</section>`;
}
/** Ids of the DM's materials matching the Preparation search box. */
const matchingIds = (ctx) =>
  new Set(D.listMaterials(ctx.state, "dm", { query: ui.materialQuery }).map((m) => m.id));
function bindMaterialActions(root, ctx) {
  const on = (selector, fn) =>
    root.querySelectorAll(selector).forEach((el) =>
      el.addEventListener("click", () => {
        el.closest("details")?.removeAttribute("open");
        fn(el);
      }),
    );
  on("[data-hs-show]", (el) => openShowDialog(ctx, el.dataset.hsShow));
  on("[data-hs-open]", (el) => openViewer(ctx, el.dataset.hsOpen));
  on("[data-hs-edit]", (el) => openEditor(ctx, { id: el.dataset.hsEdit }));
  on("[data-hs-preview]", (el) => openPreviewDialog(ctx, el.dataset.hsPreview));
  on("[data-hs-decide-id]", (el) => openDecideDialog(ctx, el.dataset.hsDecideId));
  on("[data-hs-withdraw]", (el) => openWithdrawDialog(ctx, el.dataset.hsWithdraw));
  on("[data-hs-delete]", (el) => openDeleteDialog(ctx, el.dataset.hsDelete));
  on("[data-hs-copy-to]", (el) => copyToCampaign(ctx, `handout:${el.dataset.hsCopyTo}`));
  on("[data-hs-new]", (el) => openEditor(ctx, { kind: el.dataset.hsNew }));
  on("[data-hs-duplicate]", (el) => {
    const done = run(ctx, "Materiale duplicato", "Material duplicated", (d) =>
      D.duplicateMaterial(d, el.dataset.hsDuplicate, ctx.role, {
        suffix: ctx.t("(copia)", "(copy)"),
      }),
    );
    if (done.ok)
      ctx.toast(
        ctx.t("Copia creata: ", "Copy created: ") +
          ctx.state.ext[ID].materials.find((m) => m.id === done.result).title +
          ctx.t(". Resta al DM finché non la mostri.", ". DM only until you show it."),
      );
  });
  on("[data-hs-new-stage]", () => openStageDialog(ctx));
  on("[data-hs-stage-edit]", (el) => openStageEdit(ctx, el.dataset.hsStageEdit));
  on("[data-hs-activate]", (el) => openActivateDialog(ctx, el.dataset.hsActivate));
  on("[data-hs-open-table]", () => ctx.navigate("table"));
  on("[data-hs-open-media]", () => ctx.navigate("library", { tab: "media" }));
  on("[data-hs-reveal-art]", (el) => openRevealDialog(ctx, { artId: el.dataset.hsRevealArt }));
  on("[data-hs-new-pin]", (el) => {
    const scene = ctx.state.scenes.find((s) => s.id === el.dataset.hsNewPin);
    openPinEditor(ctx, { sceneId: scene.id, x: scene.width / 2, y: scene.height / 2, pick: true });
  });
  on("[data-hs-pin-map]", (el) => openPinMap(ctx, el.dataset.hsPinMap));
  on("[data-hs-pin-visible]", (el) => {
    const pin = ctx.state.ext[ID].pins.find((p) => p.id === el.dataset.hsPinVisible);
    run(
      ctx,
      pin.visible ? "Spillo nascosto ai giocatori" : "Spillo rivelato ai giocatori",
      pin.visible ? "Pin hidden from players" : "Pin revealed to players",
      (d) => D.setPinVisible(d, pin.id, !pin.visible, ctx.role),
    );
  });
  on("[data-hs-goto-pin]", (el) =>
    goToPin(
      ctx,
      ctx.state.ext[ID].pins.find((p) => p.id === el.dataset.hsGotoPin),
    ),
  );
  on("[data-hs-pin-edit-id]", (el) =>
    openPinEditor(ctx, { id: el.dataset.hsPinEditId, pick: true }),
  );
}
function bindPrepMaterials(root, ctx) {
  root.querySelectorAll("[data-hs-prep-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.prepTab = b.dataset.hsPrepTab;
      ctx.render();
      document.querySelector(`[data-hs-prep-tab="${ui.prepTab}"]`)?.focus();
    }),
  );
  bindMaterialActions(root, ctx);
  // Filter in place, so the search box keeps focus while typing (CRP-072 searchable cards).
  root.querySelector("[data-hs-material-search]")?.addEventListener("input", (event) => {
    ui.materialQuery = event.target.value;
    const shown = matchingIds(ctx);
    root.querySelectorAll("[data-material]").forEach((card) => {
      card.hidden = !shown.has(card.dataset.material);
    });
    root.querySelector("[data-hs-material-empty]").hidden = shown.size > 0;
  });
}

// ---------------------------------------------------------------------------------------
// Campaign › Materials (everyone) and the Table drawer

function playerList(ctx, materials) {
  const unseen = new Set(D.unseenShows(ctx.state, ctx.role).map((r) => r.materialId));
  if (!materials.length)
    return `<p class="muted" data-hs-empty>${ctx.t("Nessun materiale condiviso con te per ora.", "No material shared with you yet.")}</p>`;
  return `<ul class="handouts-mini-list" data-hs-player-list>${materials
    .map(
      (m) =>
        `<li data-hs-row="${ctx.esc(m.id)}"><span class="handouts-row-main">${thumb(ctx, m.image, "is-small")}<span><strong>${ctx.esc(m.title)}</strong>${unseen.has(m.id) ? ` <span class="badge">${ctx.t("Nuovo", "New")}</span>` : ""}<br><small class="muted">${kindLabel(ctx, m.kind)}${m.lastShown ? " · " + when(ctx, m.lastShown) : ""}${m.kind === "vignette" && !m.outcome && m.myActors?.length ? " · " + ctx.t("in attesa della tua scelta", "waiting for your choice") : ""}</small></span></span><button type="button" class="button" data-hs-open="${ctx.esc(m.id)}">${ctx.t("Apri", "Open")}</button></li>`,
    )
    .join("")}</ul>`;
}
function renderCampaignMaterials(ctx) {
  const list = D.listMaterials(ctx.state, ctx.role);
  if (ctx.role === "dm")
    return `<section class="handouts-campaign" data-handouts-campaign><div class="section-heading"><h2>${ctx.t("Materiali", "Materials")}</h2><button type="button" class="button" data-hs-to-prep>${ctx.t("Gestisci in Preparazione", "Manage in Preparation")}</button></div><p class="muted">${ctx.t("Handout, vignette e immagini della campagna, con chi li può riaprire.", "Campaign handouts, vignettes and images, with who can reopen them.")}</p><ul class="handouts-mini-list">${list
      .map(
        (m) =>
          `<li><span class="handouts-row-main">${thumb(ctx, m.image, "is-small")}<span><strong>${ctx.esc(m.title)}</strong><br><small class="muted">${kindLabel(ctx, m.kind)} · ${ctx.esc(dmAudience(ctx, m))}</small></span></span><span class="toolbar"><button type="button" class="button quiet" data-hs-open="${ctx.esc(m.id)}">${ctx.t("Apri", "Open")}</button><button type="button" class="button" data-hs-show="${ctx.esc(m.id)}">${ctx.t("Mostra…", "Show…")}</button></span></li>`,
      )
      .join("")}</ul></section>`;
  return `<section class="handouts-campaign" data-handouts-campaign><div class="section-heading"><h2>${ctx.t("Materiali", "Materials")}</h2></div><p class="muted">${ctx.t("Quello che il DM ti ha mostrato: puoi riaprirlo quando vuoi.", "What the DM has shown you: reopen it whenever you like.")}</p>${playerList(ctx, list)}</section>`;
}
function bindCampaignMaterials(el, ctx) {
  bindMaterialActions(el, ctx);
  el.querySelector("[data-hs-to-prep]")?.addEventListener("click", () =>
    ctx.navigate("preparation", { tab: ID }),
  );
  // #campaign?tab=handouts&id=<material> opens that material once per navigation (search,
  // notifications). Closing it drops the id from the address, so a reload does not reopen it.
  const target = ctx.view.id;
  if (!target || ui.routeView === ctx.view) return;
  ui.routeView = ctx.view;
  if (!D.projectMaterial(ctx.state, target, ctx.role)) return;
  setTimeout(() => {
    openViewer(ctx, target);
    const el = dialogEl();
    // Close buttons at once; Escape, a role switch or a navigation through the close event.
    el?.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", () => forgetRouteId(target)),
    );
    el?.addEventListener("close", () => forgetRouteId(target), { once: true });
  }, 0);
}
function forgetRouteId(target) {
  const [page, query = ""] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  if (page !== "campaign" || params.get("id") !== target) return;
  params.delete("id");
  history.replaceState(null, "", `#campaign?${params}`);
}
const DRAWER_TABS = [
  ["materials", "Materiali", "Materials"],
  ["pins", "Spilli", "Pins"],
  ["secrets", "Segreti", "Secrets"],
];
function renderDrawer(ctx, tv) {
  if (ctx.role !== "dm") {
    const pins = D.projectPins(ctx.state, tv.scene.id, ctx.role);
    return `<div class="handouts-drawer" data-handouts-drawer><h3>${ctx.t("Condivisi con te", "Shared with you")}</h3>${playerList(ctx, D.listMaterials(ctx.state, ctx.role))}${
      pins.length
        ? `<h3>${ctx.t("Spilli rivelati in questa scena", "Pins revealed in this scene")}</h3><ul class="handouts-mini-list">${pins.map((p) => `<li><span>${ctx.esc(p.label)}</span><button type="button" class="button quiet" data-hs-open-pin="${ctx.esc(p.id)}">${ctx.t("Apri", "Open")}</button></li>`).join("")}</ul>`
        : ""
    }</div>`;
  }
  const tabs = `<nav class="handouts-subtabs" aria-label="${ctx.t("Materiali del Tavolo", "Table materials")}">${DRAWER_TABS.map(([id, it, en]) => `<button type="button" class="button ${ui.drawerTab === id ? "active" : "quiet"}" data-hs-drawer-tab="${id}" aria-pressed="${ui.drawerTab === id}">${ctx.t(it, en)}</button>`).join("")}</nav>`;
  let body;
  if (ui.drawerTab === "pins") {
    const dim = registryRef?.getSetting(ctx, DIM_KEY) === true;
    body = `<div class="toolbar"><button type="button" class="button" data-hs-add-pin>${ctx.icon("plus")} ${ctx.t("Aggiungi spillo…", "Add pin…")}</button><button type="button" class="button ${dim ? "active" : ""}" data-hs-dim aria-pressed="${dim}" aria-keyshortcuts="L">${ctx.t("Spilli semitrasparenti · L", "Semi-transparent pins · L")}</button></div>${pinRows(
      ctx,
      ctx.state.ext[ID].pins.filter((p) => p.sceneId === tv.scene.id),
    )}`;
  } else if (ui.drawerTab === "secrets")
    body = `<div data-hs-secrets>${renderSecretsTab(ctx)}</div>`;
  else {
    // This scene's materials first (Alchemy scene notes in the Story panel, VTL-078; DDB
    // Scene Prep, DDB-099), then the rest.
    const all = D.listMaterials(ctx.state, "dm");
    const here = all.filter((m) => m.sceneIds.includes(tv.scene.id));
    const rest = all.filter((m) => !m.sceneIds.includes(tv.scene.id));
    const rows = (list) =>
      `<ul class="handouts-mini-list">${list
        .map(
          (m) =>
            `<li><span class="handouts-row-main">${thumb(ctx, m.image, "is-small")}<span><strong>${ctx.esc(m.title)}</strong><br><small class="muted">${kindLabel(ctx, m.kind)} · ${ctx.esc(dmAudience(ctx, m))}${m.kind === "vignette" ? " · " + (m.outcome ? ctx.t("esito deciso", "outcome decided") : ctx.t(`${m.tally.reduce((n, c) => n + c.actorIds.length, 0)} scelte`, `${m.tally.reduce((n, c) => n + c.actorIds.length, 0)} picks`)) : ""}</small></span></span><span class="toolbar"><button type="button" class="button quiet" data-hs-open="${ctx.esc(m.id)}">${ctx.t("Apri", "Open")}</button><button type="button" class="button" data-hs-show="${ctx.esc(m.id)}">${ctx.t("Mostra…", "Show…")}</button></span></li>`,
        )
        .join("")}</ul>`;
    body = `<div class="toolbar"><button type="button" class="button" data-hs-reveal-library>${ctx.icon("eye")} ${ctx.t("Rivela un’immagine…", "Reveal an image…")}</button></div><section class="handouts-drawer-group" data-hs-scene-materials><h3>${ctx.t("Materiali di questa scena", "Materials for this scene")} <small class="muted">· ${ctx.esc(tv.scene.name)}</small></h3>${here.length ? rows(here) : `<p class="muted">${ctx.t("Nessun materiale collegato: in Preparazione › Materiali, Modifica… › Scene collegate.", "No linked material: in Preparation › Materials, Edit… › Linked scenes.")}</p>`}</section><section class="handouts-drawer-group" data-hs-other-materials><h3>${ctx.t("Altri materiali", "Other materials")}</h3>${rows(rest)}</section>`;
  }
  return `<div class="handouts-drawer" data-handouts-drawer>${tabs}${body}</div>`;
}
function bindDrawer(el, ctx, table) {
  bindMaterialActions(el, ctx);
  el.querySelectorAll("[data-hs-drawer-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.drawerTab = b.dataset.hsDrawerTab;
      ctx.render();
      document.querySelector(`[data-hs-drawer-tab="${ui.drawerTab}"]`)?.focus();
    }),
  );
  el.querySelectorAll("[data-hs-open-pin]").forEach((b) =>
    b.addEventListener("click", () => openPin(ctx, b.dataset.hsOpenPin)),
  );
  el.querySelector("[data-hs-reveal-library]")?.addEventListener("click", () =>
    openRevealDialog(ctx),
  );
  el.querySelector("[data-hs-dim]")?.addEventListener("click", () => toggleDim(ctx));
  el.querySelector("[data-hs-add-pin]")?.addEventListener("click", () =>
    openPinEditor(ctx, {
      sceneId: table.scene.id,
      x: table.scene.width / 2,
      y: table.scene.height / 2,
      pick: true,
    }),
  );
  if (ui.drawerTab === "secrets") bindSecretsTab(el, ctx);
}
function toggleDim(ctx) {
  const next = registryRef.getSetting(ctx, DIM_KEY) !== true;
  registryRef.setSetting(ctx, DIM_KEY, next);
  ctx.toast(
    next
      ? ctx.t("Spilli semitrasparenti.", "Pins semi-transparent.")
      : ctx.t("Spilli pieni.", "Pins opaque."),
  );
}

// Inspector: reveal the selected token's art (DM) or reopen it (player). The preview shows
// only art that belongs to the creature (its library portrait or token, or matching art).
function revealPanel(ctx, tv) {
  const actor = ctx.state.actors[tv.selectedActorId];
  if (!actor) return "";
  const revealed = D.revealedArtFor(ctx.state, actor.id, ctx.role);
  if (ctx.role !== "dm")
    return `<div class="handouts-reveal-panel">${revealed
      .map((m) => {
        const art = D.resolveArt(ctx.state, m.image?.artId, ctx.role);
        return `<button type="button" class="handouts-reveal-thumb" data-hs-open="${ctx.esc(m.id)}">${art ? `<img src="${ctx.esc(art.image)}" alt="">` : ""}<span>${ctx.esc(m.title)}</span></button>`;
      })
      .join("")}</div>`;
  const suggestion = D.preferredArt(ctx.state, actor.id) ?? D.matchArt(ctx.state, actor.id)[0];
  const last = revealed.at(-1);
  return `<div class="handouts-reveal-panel" data-hs-reveal-panel>${last ? `<p class="muted">${ctx.t("Già rivelato", "Already revealed")}: <strong>${ctx.esc(last.title)}</strong> · ${ctx.esc(accessText(ctx, last.access))}</p>` : suggestion ? `<img class="handouts-reveal-preview" src="${ctx.esc(suggestion.image)}" alt="${ctx.esc(ctx.label(suggestion.title))}">` : ""}<button type="button" class="button" data-hs-reveal-token="${ctx.esc(actor.id)}">${ctx.icon("eye")} ${last ? ctx.t("Rivela di nuovo…", "Reveal again…") : ctx.t("Rivela aspetto…", "Reveal art…")}</button></div>`;
}

// ---------------------------------------------------------------------------------------
// Registration

export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(D.SLICE, {
    version: D.VERSION,
    seed: D.seedHandouts,
    normalize: D.normalizeHandouts,
  });
  registry.registerStateSlice(D.SEEN_SLICE, {
    version: D.VERSION,
    undo: "preserve",
    seed: D.seedSeen,
    normalize: D.normalizeSeen,
  });
  registerSessionPrep(registry, { openMaterial: (ctx, id) => openViewer(ctx, id) });
  registry.registerStyles(new URL("./handouts.css", import.meta.url));

  registry.add("preparation-section", {
    id: ID,
    group: "materials",
    label: L("Materiali", "Materials"),
    description: L(
      "Handout, vignette, spilli, scene senza mappa, immagini",
      "Handouts, vignettes, pins, map-less scenes, images",
    ),
    roles: ["dm"],
    order: 20,
    render: renderPrepMaterials,
    bind: bindPrepMaterials,
  });
  registry.add("campaign-section", {
    id: ID,
    group: "world",
    label: L("Materiali", "Materials"),
    order: 45,
    render: renderCampaignMaterials,
    bind: bindCampaignMaterials,
  });
  registry.add("table-panel", {
    id: "handouts-panel",
    section: "journal",
    label: L("Materiali", "Materials"),
    icon: "scroll",
    placement: "sidebar-tab",
    order: 30,
    render: renderDrawer,
    bind: bindDrawer,
  });
  registry.add("table-panel", {
    id: "handouts-stage",
    label: L("Scena senza mappa", "Map-less scene"),
    placement: "inspector",
    order: 20,
    when: (ctx, tv) => Boolean(tv?.scene && D.stageFor(ctx.state, tv.scene.id)),
    render: stagePanel,
    bind: (el, ctx) => bindMaterialActions(el, ctx),
  });
  registry.add("table-panel", {
    id: "handouts-reveal",
    label: L("Aspetto", "Appearance"),
    placement: "inspector",
    order: 30,
    when: (ctx, tv) =>
      Boolean(tv?.selectedActorId && ctx.state.actors[tv.selectedActorId]) &&
      (ctx.role === "dm" || D.revealedArtFor(ctx.state, tv.selectedActorId, ctx.role).length > 0),
    render: revealPanel,
    bind: (el, ctx) => {
      bindMaterialActions(el, ctx);
      el.querySelector("[data-hs-reveal-token]")?.addEventListener("click", (e) =>
        openRevealDialog(ctx, { actorId: e.currentTarget.dataset.hsRevealToken }),
      );
    },
  });
  registry.add("table-tool", {
    id: "handouts-pin",
    label: L("Spillo", "Pin"),
    // Foundry's Journal Notes layer (FVT-087) uses a book: pins open entries.
    icon: "book",
    group: "draw",
    roles: ["dm"],
    order: 60,
    activate: (ctx, table) =>
      table.message(
        ctx.t(
          "Spillo: clicca sulla mappa per posarlo, oppure Invio al centro.",
          "Pin: click the map to place it, or Enter for the centre.",
        ),
      ),
    onClick(ctx, event, table) {
      const existing = event.target.closest?.("[data-handouts-pin]");
      if (existing) return openPin(ctx, existing.dataset.handoutsPin);
      const p = table.point(event);
      openPinEditor(ctx, { sceneId: table.scene.id, x: p.x, y: p.y });
    },
    onKeyDown(ctx, event, table) {
      if (event.key !== "Enter" || event.target.closest?.("[data-actor],[data-handouts-pin]"))
        return;
      event.preventDefault();
      openPinEditor(ctx, {
        sceneId: table.scene.id,
        x: table.scene.width / 2,
        y: table.scene.height / 2,
        pick: true,
      });
    },
  });
  registry.add("map-layer", {
    id: "handouts-stage-art",
    label: L("Scena senza mappa", "Map-less stage"),
    order: 5,
    svg: (ctx, tv) => stageSvg(ctx, tv),
  });
  registry.add("map-layer", {
    id: "handouts-pins",
    label: L("Spilli", "Pins"),
    order: 64,
    interactive: true,
    svg: pinsSvg,
    bind: bindPins,
  });
  registry.add("token-menu", {
    id: "handouts-reveal-art",
    submenu: "look",
    label: L("Rivela aspetto…", "Reveal art…"),
    icon: "eye",
    roles: ["dm"],
    group: "handouts",
    when: (ctx, target) => Boolean(ctx.state.actors[target?.actorId]),
    run: (ctx, target) => openRevealDialog(ctx, { actorId: target.actorId }),
  });
  registry.add("settings", {
    id: "handouts-view",
    label: L("Spilli sulla mappa", "Map pins"),
    scope: "device",
    roles: ["dm"],
    fields: [
      {
        id: "dim-pins",
        label: L("Spilli semitrasparenti", "Semi-transparent pins"),
        type: "boolean",
        default: false,
      },
    ],
  });
  registry.add("command", {
    id: "handouts.dim-pins",
    label: L("Spilli semitrasparenti", "Semi-transparent pins"),
    shortcut: "L",
    context: "table",
    roles: ["dm"],
    group: "handouts",
    run: toggleDim,
  });
  registry.add("command", {
    id: "handouts.new-handout",
    label: L("Nuovo handout", "New handout"),
    roles: ["dm"],
    group: "handouts",
    run: (ctx) => openEditor(ctx, { kind: "handout" }),
  });
  registry.add("search", {
    id: "handouts-search",
    label: L("Materiali", "Materials"),
    search: (ctx, query) =>
      D.listMaterials(ctx.state, ctx.role, { query }).map((m) => ({
        title: m.title,
        excerpt: L(KIND[m.kind][0], KIND[m.kind][1]),
        page: "campaign",
        params: { tab: ID, id: m.id },
      })),
  });
  registry.add("notifications", {
    id: "handouts-notices",
    label: L("Materiali", "Materials"),
    collect: (ctx) => {
      const rows = [];
      const materials = ctx.state.ext?.[ID]?.materials ?? [];
      if (ctx.role === "dm") {
        for (const m of materials)
          if (m.kind === "vignette" && !m.outcome && Object.keys(m.responses).length)
            rows.push({
              id: `handouts-decide-${m.id}`,
              title: L(
                `Vignetta “${m.title}”: decidi l’esito`,
                `Vignette “${m.title}”: decide the outcome`,
              ),
              body: L(
                `${Object.keys(m.responses).length} scelte ricevute`,
                `${Object.keys(m.responses).length} picks received`,
              ),
              category: "handouts",
              target: { page: "preparation", params: { tab: ID } },
            });
        return rows;
      }
      for (const row of D.unseenShows(ctx.state, ctx.role)) {
        const m = materials.find((x) => x.id === row.materialId);
        rows.push({
          id: `handouts-show-${row.showId}`,
          title:
            row.kind === "outcome"
              ? L(
                  `“${m.title}”: il DM ha deciso l’esito`,
                  `“${m.title}”: the DM decided the outcome`,
                )
              : L(`Il DM ti mostra “${m.title}”`, `The DM shows you “${m.title}”`),
          time: row.at,
          category: "handouts",
          target: { page: "campaign", params: { tab: ID, id: m.id } },
        });
      }
      for (const m of materials) {
        const p =
          m.kind === "vignette" && !m.outcome ? D.projectMaterial(ctx.state, m.id, ctx.role) : null;
        if (p && p.myActors.some((a) => !p.myChoices[a]))
          rows.push({
            id: `handouts-choose-${m.id}`,
            title: L(`“${m.title}”: indica la tua scelta`, `“${m.title}”: indicate your choice`),
            category: "handouts",
            target: { page: "campaign", params: { tab: ID, id: m.id } },
          });
      }
      return rows;
    },
  });

  registry.on("navigate", (payload, { ctx }) => schedulePopup(ctx));
  // A link already opened in this navigation is not reopened for the other identity.
  registry.on("role-changed", (payload, { ctx }) => {
    resetHandoutsView({ keepRoute: true });
    schedulePopup(ctx);
  });
  registry.on("reset", () => resetHandoutsView());
}
