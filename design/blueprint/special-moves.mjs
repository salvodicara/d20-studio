// B40 — Special movement and actions: entry module (registry area "special-moves").
//
// Where it lives (B61 placement): the "Mosse" button and tray at the end of the action bar,
// after Dash, Dodge and Disengage (BG3 hotbar with its common actions, CRP-098/107/108/109;
// moved there from the bottom dock by the W2b1 integration), the preview, results and
// requests in the Creature tab (inspector), previews and labels on the map (layers), the
// two-tier ruler and the DM's map rules in the left toolbar, the D&D Beyond list of 2024
// generic actions and Weapon Mastery in the sheet's Actions tab (DDB-039/041), the grid
// rule per scene in Preparation (Roll20 page settings R20-086). Rules and data: see
// special-moves-domain.mjs; evidence: changes/interview-01/blueprint-special-moves-evidence.md.

import * as D from "./special-moves-domain.mjs";
import {
  registerActionProvider,
  provideRollReasons,
  resolveAttemptKind,
  observeTurnPhases,
} from "./combat.mjs";
import { openRoll, hasCombatPreview, prepareCombatAction } from "./combat-ui.mjs";
import { pathDraft, clearPathDraft } from "./path-ui.mjs";
import { previewMovement } from "./state.mjs";
import { tracePath } from "./spatial.mjs";
import { plannedWaypoints, runsSession, sessionGated } from "./table-spatial.mjs";
import { formatNumber } from "./ui.mjs";
import { canControlActor } from "./character-access.mjs";
import { mapPlacementActive } from "./companion-map.mjs";
import { setSelectedActor } from "./table.mjs";

const ID = D.ID;
const L = (it, en) => ({ it, en });
const RULER = "special-moves-ruler";
const RULES = "special-moves-rules";
let area = null;

// ---------------------------------------------------------------- view state

const ui = {
  tray: false,
  armed: null,
  reveal: false,
  sticky: false,
  highlight: false,
  lastMove: false,
  result: null,
  ruler: null,
  kb: null,
  focusTray: false,
  expanded: false,
};
export function resetSpecialMovesView() {
  Object.assign(ui, {
    tray: false,
    armed: null,
    reveal: false,
    sticky: false,
    highlight: false,
    lastMove: false,
    result: null,
    ruler: null,
    kb: null,
    focusTray: false,
    expanded: false,
  });
}
export const viewState = () => ui;

// ---------------------------------------------------------------- small helpers

const esc = (ctx, value) => ctx.esc(value);
const lbl = (ctx, value) => ctx.label(value ?? "");
const num = (ctx, value, digits = 1) => formatNumber(ctx.lang, value, digits);
const pct = (ctx, value) => formatNumber(ctx.lang, Math.round((value ?? 0) * 100), 0) + "%";
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  "sm-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
const message = (ctx, error) =>
  error?.[ctx.lang] || error?.it || error?.en || error?.message || String(error ?? "");
const actorName = (ctx, id) => ctx.state.actors?.[id]?.name ?? "";
const signed = (value) => (value < 0 ? "−" : "+") + Math.abs(value);
const selected = (ctx, tableView) =>
  tableView?.selectedActorId ?? lastTable?.selectedActorId ?? null;
const sourceText = (ctx, source) => {
  if (!source) return "";
  if (source.kind === "srd") {
    const pages = (source[ctx.lang] ?? source.en)?.pages ?? source.pages ?? [];
    return `SRD 5.2.1 ${ctx.lang === "it" ? "IT" : "EN"} p. ${pages.join(", ")}`;
  }
  return ctx.t("Convenzione del prototipo", "Prototype convention") + " · " + source.revision;
};
const sourceLink = (ctx, source) => {
  if (!source) return "";
  const loc = source.kind === "srd" ? (source[ctx.lang] ?? source.en) : null;
  return loc?.url
    ? `<a class="sm-source" href="${esc(ctx, loc.url)}" target="_blank" rel="noopener noreferrer">${esc(ctx, sourceText(ctx, source))}</a>`
    : `<span class="sm-source">${esc(ctx, sourceText(ctx, source))}</span>`;
};
// Inline icons (24×24 strokes in the app's icon style) for moves the core set lacks.
const GLYPHS = {
  jump: "M3 19c2.5-9 8-12 11-12s5 2 7 6M17 9l4 4-5 1M3 21h6",
  "jump-high": "M12 20V5M7 10l5-5 5 5M4 21h16",
  climb: "M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10",
  swim: "M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0M14 6a2 2 0 1 0 0-.1M6 13l5-5 3 2 3-2",
  fly: "M2 14c5 0 9-4 11-10 1 5-1 10-6 13M13 4c3 3 6 4 9 4-2 4-6 7-11 8M2 14l5 3",
  fall: "M12 3v13M7 11l5 5 5-5M4 21h16",
  drag: "M4 12h9M9 8l4 4-4 4M17 6v12M20 8v8",
  mount: "M4 20l2-7 5-2 4-6 3 2-1 4v9M8 20v-5M15 20v-5M18 7h2",
  form: "M12 3a9 9 0 1 0 9 9M16 3l1.5 3 3 .5-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.5z",
  grapple:
    "M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.3-2L8 13",
  shove: "M3 12h11M10 7l5 5-5 5M19 4v16",
  throw: "M14 3l7 7-3 3-7-7zM11 6L3 21M16 18h5M18.5 15.5v5",
  escape: "M9 15l-2 2a3 3 0 0 1-4-4l2-2M15 9l2-2a3 3 0 0 1 4 4l-2 2M8 8L6 6M16 16l2 2M10 14l4-4",
  release: "M6 12h12M4 7l3 5-3 5M20 7l-3 5 3 5",
  recover: "M12 3v10M8 9l4 4 4-4M4 17h16v4H4z",
  help: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z",
  hide: "M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.2 6.2C4.1 7.6 2.6 9.7 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.5 4.8-1.3",
  reveal:
    "M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  utilize:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  labels: "M3 12V4h8l10 10-8 8zM7.5 8.5h.01",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  moves: "M3 19c2.5-9 8-12 11-12s5 2 7 6M17 9l4 4-5 1M3 21h6M9 3h6",
};
const glyph = (ctx, name) =>
  GLYPHS[name]
    ? `<svg class="icon sm-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${GLYPHS[name]}"/></svg>`
    : ctx.icon(name);

// ---------------------------------------------------------------- commits

/**
 * One area command. The domain mutates the draft (own slice plus the owners' domains it
 * calls); a refusal shows its reason in the panel and as a toast. Returns the result.
 */
export function act(ctx, label, fn, { result = null, options = {} } = {}) {
  let out;
  const title = lbl(ctx, label);
  try {
    ctx.commit(
      title,
      (draft) => {
        out = fn(draft);
      },
      options,
    );
  } catch (error) {
    const text = message(ctx, error);
    ui.result = { text, error: true };
    ctx.toast(text, true);
    ctx.render();
    return null;
  }
  ui.result = { text: result ? lbl(ctx, result(out)) || title : title, error: false, label: title };
  // The commit already drew the Table: draw again so the result line is on screen.
  ctx.toast(ui.result.text);
  ctx.render();
  return out ?? true;
}
const op = () => ({ operationId: uid() });
// After an attempt enters the queue: the viewer rolls its own request at once; others wait.
function followAttempt(ctx, attempt) {
  if (!attempt?.requests) return;
  const request = attempt.requests.find((r) => r.status === "pending");
  if (!request) return;
  const roller = ctx.state.actors[request.actorId];
  if (ctx.canControl(roller)) openRoll(ctx, attempt.id, request.id);
  else
    ctx.toast(
      ctx.t(
        `Richiesta inviata: tira ${roller?.name ?? ""} (${roller?.owner === "dm" ? "DM" : "giocatore"}).`,
        `Request sent: ${roller?.name ?? ""} rolls (${roller?.owner === "dm" ? "DM" : "player"}).`,
      ),
    );
}

// ---------------------------------------------------------------- move catalogue

const MOVES = [
  ["movement", "long-jump", "jump", L("Salto in lungo", "Long jump"), "point"],
  ["movement", "high-jump", "jump-high", L("Salto in alto", "High jump"), "none"],
  ["movement", "climb", "climb", L("Arrampicati", "Climb"), "height"],
  ["movement", "swim", "swim", L("Nuota", "Swim"), "point"],
  ["movement", "fly", "fly", L("Vola", "Fly"), "point"],
  // P6 TV-71 (dnd5e falling): always in the list; on the ground it asks the height.
  ["movement", "fall", "fall", L("Cadere", "Fall"), "none"],
  ["movement", "drag", "drag", L("Trascina", "Drag"), "point"],
  ["movement", "mount", "mount", L("Monta in sella", "Mount"), "target"],
  ["movement", "ride", "mount", L("Cavalca", "Ride"), "point"],
  ["movement", "dismount", "mount", L("Smonta", "Dismount"), "none"],
  [
    "movement",
    "form",
    "form",
    L("Forme e creature collegate", "Forms and linked creatures"),
    "open",
  ],
  ["combat", "grapple", "grapple", L("Afferra", "Grapple"), "target"],
  ["combat", "shove", "shove", L("Spingi", "Shove"), "target"],
  ["combat", "throw", "throw", L("Lancia", "Throw"), "menu"],
  ["combat", "escape", "escape", L("Sfuggi alla presa", "Escape a grapple"), "none"],
  ["combat", "release", "release", L("Lascia la presa", "Release the grapple"), "none"],
  ["combat", "recover", "recover", L("Raccogli l’arma", "Pick up the weapon"), "menu"],
  ["actions", "help", "help", L("Aiuta", "Help"), "target"],
  ["actions", "hide", "hide", L("Nasconditi", "Hide"), "none"],
  ["actions", "reveal", "reveal", L("Esci dal nascondiglio", "Stop hiding"), "none"],
  ["actions", "search", "search", L("Cerca", "Search"), "none"],
  ["actions", "study", "study", L("Studia", "Study"), "target"],
  ["actions", "influence", "influence", L("Influenza", "Influence"), "target"],
  ["actions", "utilize", "utilize", L("Usa un oggetto", "Utilize"), "target"],
  // P6 TV-142: the Table's pickpocket (the knowledge area's request to the DM), also here.
  ["actions", "pickpocket", "utilize", L("Borseggia", "Pickpocket"), "target"],
].map(([group, kind, icon, name, needs]) => ({ group, kind, icon, name, needs }));
export const moveDef = (kind) => MOVES.find((m) => m.kind === kind);
const GROUPS = [
  ["movement", L("Movimento", "Movement")],
  ["combat", L("Combattimento", "Combat")],
  ["actions", L("Azioni generiche 2024", "2024 generic actions")],
];
const COSTS = {
  "long-jump": L("Movimento", "Movement"),
  "high-jump": L("Movimento", "Movement"),
  climb: L("Movimento ×2", "Movement ×2"),
  swim: L("Movimento ×2 in acqua", "Movement ×2 in water"),
  fly: L("Velocità di volo", "Fly Speed"),
  fall: L("1d6 ogni 3 m, poi Prono", "1d6 per 3 m, then Prone"),
  drag: L("Movimento ×2", "Movement ×2"),
  mount: L("Metà velocità", "Half Speed"),
  ride: L("Velocità della cavalcatura", "Mount’s Speed"),
  dismount: L("Metà velocità", "Half Speed"),
  form: L("Scheda", "Sheet"),
  grapple: L("Attacco (Azione)", "Attack (Action)"),
  shove: L("Attacco (Azione)", "Attack (Action)"),
  throw: L("Attacco (Azione)", "Attack (Action)"),
  escape: L("Azione", "Action"),
  release: L("Gratuita", "Free"),
  recover: L("Interazione", "Interaction"),
  help: L("Azione", "Action"),
  hide: L("Azione", "Action"),
  reveal: L("Gratuita", "Free"),
  search: L("Azione", "Action"),
  study: L("Azione", "Action"),
  influence: L("Azione", "Action"),
  utilize: L("Azione", "Action"),
  pickpocket: L("Richiesta al DM", "Request to the DM"),
};
// Reason codes that only ask for a choice still to make (not "unavailable").
const CHOICE = new Set([
  "choose-target",
  "choose-landing",
  "choose-destination",
  "choose-height",
  "choose-subject",
  "choose-object",
  "choose-mount",
  "choose-ally",
  "choose-enemy",
  "no-surface",
  "skill",
  "urge",
  "no-change",
  "same-height",
]);
const blocking = (reasons) => (reasons ?? []).filter((r) => !CHOICE.has(r.code));
const STAND_FIRST = new Set(["prone"]);

/** The tray entry of a move: shown or not, available or not, and why (BG3, CRP-103). */
export function moveStatus(ctx, kind, actorId) {
  const s = ctx.state;
  const role = ctx.role;
  const grapples = D.grappleOf(s, actorId);
  const hold = grapples.filter((g) => g.grapplerId === actorId);
  const held = grapples.find((g) => g.targetId === actorId);
  const mounted = D.mountOf(s, actorId);
  const thrown = (D.sliceOf(s)?.thrown ?? []).filter((t) => t.actorId === actorId && !t.recovered);
  const hidden = D.sliceOf(s)?.hidden?.[actorId];
  const shown = {
    drag: hold.length > 0,
    release: hold.length > 0,
    escape: Boolean(held),
    mount: !mounted,
    ride: Boolean(mounted),
    dismount: Boolean(mounted),
    recover: thrown.length > 0,
    reveal: Boolean(hidden),
    hide: !hidden,
  };
  if (shown[kind] === false) return { shown: false };
  let preview;
  switch (kind) {
    case "long-jump":
      preview = D.previewJump(s, { actorId, kind: "long" }, role);
      break;
    case "high-jump":
      preview = D.previewJump(s, { actorId, kind: "high" }, role);
      break;
    case "climb": {
      preview = D.previewClimb(
        s,
        { actorId, featureId: D.climbableNear(s, actorId)[0]?.feature.id },
        role,
      );
      if (!D.climbableNear(s, actorId).length)
        preview.reasons.unshift({
          code: "no-wall",
          it: "Nessuna parete scalabile entro 1,5 m: avvicinati a un muro.",
          en: "No climbable wall within 1.5 m: move next to a wall.",
        });
      break;
    }
    case "swim":
      preview = D.previewSwim(s, { actorId }, role);
      break;
    case "fly":
      preview = D.previewFly(s, { actorId }, role);
      break;
    case "fall":
      // A creature on the ground falls from a height the player or DM gives (a pit, a
      // ledge): the tray offers it with the 3 m of the first die.
      preview = D.previewFall(
        s,
        { actorId, meters: D.altitudeOf(s, actorId) > 0 ? undefined : 3 },
        role,
      );
      break;
    case "drag":
      preview = D.previewDrag(s, { actorId }, role);
      break;
    case "mount": {
      preview = D.previewMount(s, { actorId }, role);
      if (!mountCandidates(ctx, actorId).length)
        preview.reasons.unshift({
          code: "no-mount",
          it: "Nessuna cavalcatura entro 1,5 m (il DM può portarne una).",
          en: "No mount within 1.5 m (the DM can bring one).",
        });
      break;
    }
    case "ride":
      preview = D.previewRide(s, { actorId }, role);
      break;
    case "dismount":
      preview = D.previewDismount(s, { actorId }, role);
      break;
    case "form": {
      const actor = s.actors[actorId];
      const can = Boolean(actor?.formsProfile || actor?.activeForm) && ctx.canControl(actor);
      preview = {
        reasons: can
          ? []
          : [
              {
                code: "no-form",
                it: "Nessun privilegio di trasformazione sulla scheda (Forma selvatica, Metamorfosi).",
                en: "No shape-shifting feature on the sheet (Wild Shape, Polymorph).",
              },
            ],
      };
      break;
    }
    case "pickpocket": {
      const reach = pickpocketTargets(ctx, actorId).filter((row) => row.inReach);
      preview = {
        reasons: !ctx.registry?.get("token-menu", "knowledge-pickpocket", ctx, {
          actorId: reach[0]?.actorId ?? null,
          sceneId: s.activeSceneId,
        })
          ? reach.length
            ? [
                {
                  code: "unavailable",
                  it: "Borseggio non disponibile.",
                  en: "Pickpocket unavailable.",
                },
              ]
            : [
                {
                  code: "none-in-reach",
                  it: "Avvicinati: nessuna creatura adiacente (1,5 m) da borseggiare.",
                  en: "Move closer: no adjacent creature (1.5 m) to pickpocket.",
                },
              ]
          : [],
      };
      break;
    }
    case "grapple": {
      preview = D.previewGrapple(s, { actorId }, role);
      if (!D.touchTargets(s, actorId, role).some((t) => t.inReach))
        preview.reasons.push({
          code: "none-in-reach",
          it: "Nessuna creatura entro 1,5 m.",
          en: "No creature within 1.5 m.",
        });
      break;
    }
    case "shove": {
      preview = D.previewShove(s, { actorId }, role);
      if (!D.touchTargets(s, actorId, role).some((t) => t.inReach))
        preview.reasons.push({
          code: "none-in-reach",
          it: "Nessuna creatura entro 1,5 m.",
          en: "No creature within 1.5 m.",
        });
      break;
    }
    case "throw": {
      const menu = D.throwMenu(s, actorId);
      const reasons = [];
      if (!s.combat?.active)
        reasons.push({
          code: "needs-initiative",
          it: "È un attacco: prepara l’iniziativa (Avvia combattimento).",
          en: "It is an attack: roll initiative first (Start combat).",
        });
      if (!menu.some((m) => m.available))
        reasons.push(
          menu.find((m) => m.thrown)?.why ?? {
            it: "Nessuna arma da lancio equipaggiata.",
            en: "No thrown weapon equipped.",
          },
        );
      preview = { reasons };
      break;
    }
    case "escape":
      preview = D.previewEscape(s, { actorId }, role);
      break;
    case "release":
      preview = {
        reasons: ctx.canControl(s.actors[actorId])
          ? []
          : [
              {
                code: "not-controller",
                it: "Non controlli questa creatura.",
                en: "You do not control this creature.",
              },
            ],
      };
      break;
    case "recover": {
      const first = thrown[0];
      preview = D.previewRecover(s, { actorId, thrownId: first?.id }, role);
      break;
    }
    case "help":
      preview = D.previewHelp(s, { actorId, mode: "check" }, role);
      break;
    case "hide":
      preview = D.previewHide(s, { actorId }, role);
      if (runsSession(s, role)) preview.reasons = preview.reasons.filter((r) => r.code !== "seen");
      break;
    case "reveal":
      preview = { reasons: [] };
      break;
    case "search":
      preview = D.previewSearch(s, { actorId }, role);
      break;
    case "study":
      preview = D.previewStudy(s, { actorId }, role);
      break;
    case "influence":
      preview = D.previewInfluence(s, { actorId }, role);
      break;
    case "utilize": {
      preview = D.previewUtilize(s, { actorId }, role);
      if (!objectsNear(ctx, actorId).length)
        preview.reasons.unshift({
          code: "no-object",
          it: "Nessun oggetto utilizzabile entro 1,5 m.",
          en: "No usable object within 1.5 m.",
        });
      break;
    }
    default:
      preview = { reasons: [] };
  }
  const reasons = blocking(preview.reasons);
  return { shown: true, available: reasons.length === 0, reason: reasons[0] ?? null, reasons };
}
function mountCandidates(ctx, actorId) {
  const s = ctx.state;
  const scene = D.sceneOf(s);
  const token = D.tokenOf(s, actorId);
  if (!token) return [];
  return (scene?.tokens ?? [])
    .filter((t) => t.actorId !== actorId && D.observes(s, t.actorId, ctx.role))
    .filter((t) => D.metersBetween(scene, token, t) <= 1.5 + 0.01)
    .map((t) => t.actorId);
}
function objectsNear(ctx, actorId) {
  const s = ctx.state;
  const token = D.tokenOf(s, actorId);
  if (!token) return [];
  return D.featuresOf(s)
    .filter((f) => f.kind === "object" && (!f.secret || f.revealed))
    .filter((f) => D.metersBetween(D.sceneOf(s), token, f) <= 1.5 + 0.01);
}

// ---------------------------------------------------------------- dock: button and tray

function pendingForViewer(ctx) {
  const s = ctx.state;
  const requests = (s.combatAttempts ?? [])
    .filter((a) => a.kind === D.KIND && a.status === "pending")
    .flatMap((a) =>
      a.requests
        .filter(
          (r) =>
            r.status === "pending" &&
            ctx.canControl(s.actors[r.actorId]) &&
            (r.personal !== true || r.owner === ctx.role),
        )
        .map((r) => ({ attempt: a, request: r })),
    );
  const judgements = runsSession(ctx.state, ctx.role)
    ? (D.sliceOf(s)?.judgements ?? []).filter((j) => j.status === "awaiting-dm")
    : [];
  const proposals = runsSession(ctx.state, ctx.role) ? D.pendingProposals(s) : [];
  return {
    requests,
    judgements,
    proposals,
    count: requests.length + judgements.length + proposals.length,
  };
}
export function renderDock(ctx, tableView) {
  const actorId = selected(ctx, tableView);
  const actor = ctx.state.actors?.[actorId];
  if (!actor || !ctx.canControl(actor)) return "";
  const pending = pendingForViewer(ctx).count;
  const button = `<button type="button" class="button sm-dock-toggle${ui.tray ? " active" : ""}" data-sm-tray aria-expanded="${ui.tray}" aria-controls="sm-tray" aria-label="${ctx.t("Mosse speciali", "Special moves")}${pending ? ` · ${pending} ${ctx.t("in attesa", "pending")}` : ""}" title="${ctx.t("Mosse speciali: salti, prese, lanci, azioni generiche", "Special moves: jumps, grapples, throws, generic actions")}">${glyph(ctx, "moves")} <span class="dock-text">${ctx.t("Mosse", "Moves")}</span>${pending ? `<span class="sm-badge" aria-hidden="true">${pending}</span>` : ""}</button>`;
  // The armed move's preview floats above the hotbar, like BG3's action tooltip.
  if (ui.armed && ui.armed.actorId === actorId)
    return `${button}<div class="sm-tray sm-armed" id="sm-tray" role="region" aria-label="${ctx.t("Anteprima della mossa", "Move preview")}">${armedCard(ctx)}</div>`;
  if (!ui.tray) return button;
  const groups = GROUPS.map(([group, name]) => {
    const items = MOVES.filter((m) => m.group === group)
      .map((m) => ({ m, status: moveStatus(ctx, m.kind, actorId) }))
      .filter(({ status }) => status.shown);
    return `<section class="sm-group" aria-label="${esc(ctx, lbl(ctx, name))}"><h3>${esc(ctx, lbl(ctx, name))}</h3><div class="sm-grid">${items
      .map(({ m, status }) => {
        const why = status.reason ? lbl(ctx, status.reason) : "";
        const armed = ui.armed?.kind === m.kind && ui.armed.actorId === actorId;
        return `<button type="button" class="sm-move${armed ? " active" : ""}" data-sm-move="${m.kind}"${status.available ? "" : ` aria-disabled="true" aria-describedby="sm-why-${m.kind}"`} aria-pressed="${armed}"><span class="sm-move-icon">${glyph(ctx, m.icon)}</span><span class="sm-move-text"><strong>${esc(ctx, lbl(ctx, m.name))}</strong><small class="sm-cost">${esc(ctx, lbl(ctx, COSTS[m.kind]))}</small>${why ? `<small class="sm-why" id="sm-why-${m.kind}">${esc(ctx, why)}</small>` : ""}</span></button>`;
      })
      .join("")}</div></section>`;
  }).join("");
  const labels = `<div class="sm-tray-tools"><button type="button" class="button quiet" data-sm-labels aria-pressed="${ui.sticky}">${glyph(ctx, "labels")} ${ctx.t("Etichette (tieni premuto Alt)", "Labels (hold Alt)")}</button><button type="button" class="button quiet" data-sm-last aria-pressed="${ui.lastMove}">${glyph(ctx, "history")} ${ctx.t("Ultima mossa (Maiusc+X)", "Last move (Shift+X)")}</button></div>`;
  return `${button}<div class="sm-tray" id="sm-tray" role="region" aria-label="${ctx.t("Mosse speciali di", "Special moves of")} ${esc(ctx, actor.name)}"><div class="sm-tray-head"><strong>${ctx.t("Mosse speciali", "Special moves")} · ${esc(ctx, actor.name)}</strong><span class="muted">${ctx.state.combat?.active ? ctx.t("Combattimento: azioni e movimento si spendono", "Combat: actions and movement are spent") : ctx.t("Esplorazione: nessun costo di turno", "Exploration: no turn costs")}</span><button type="button" class="button quiet" data-sm-tray-close aria-label="${ctx.t("Chiudi le mosse speciali", "Close special moves")}">${ctx.icon("close")}</button></div>${pendingBlock(ctx)}${groups}${labels}</div>`;
}
export function bindDock(el, ctx, table) {
  el.querySelector("[data-sm-tray]")?.addEventListener("click", () => {
    if (ui.armed) {
      ui.armed = null;
      ui.tray = true;
    } else ui.tray = !ui.tray;
    ui.focusTray = ui.tray;
    ctx.render();
  });
  // What waits for this viewer (the badge's items) is answered right in the tray.
  const waiting = el.querySelector(".sm-tray .sm-pending");
  if (waiting) bindInspector(waiting, ctx, table);
  const card = el.querySelector("[data-sm-card]");
  if (card) bindInspector(card, ctx, table);
  el.querySelector("[data-sm-tray-close]")?.addEventListener("click", () => {
    ui.tray = false;
    ctx.render();
    document.querySelector("#content [data-sm-tray]")?.focus();
  });
  el.querySelectorAll("[data-sm-move]").forEach(
    (b) => (b.onclick = () => chooseMove(ctx, b.dataset.smMove, table?.selectedActorId)),
  );
  el.querySelector("[data-sm-labels]")?.addEventListener("click", () => {
    ui.sticky = !ui.sticky;
    ctx.render();
  });
  el.querySelector("[data-sm-last]")?.addEventListener("click", () => {
    ui.lastMove = !ui.lastMove;
    ctx.render();
  });
  const tray = el.querySelector(".sm-tray");
  tray?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    // BG3 (CRP-195): Esc cancels the chosen action, or closes the tray.
    ui.armed = null;
    ui.tray = false;
    ctx.render();
    document.querySelector("#content [data-sm-tray]")?.focus();
  });
  if (ui.focusTray && tray) {
    ui.focusTray = false;
    tray.querySelector("[data-sm-move]")?.focus({ preventScroll: true });
  }
}
/** A tray entry was chosen: arm it (preview first, BG3), or explain why it cannot. */
export function chooseMove(ctx, kind, actorId, options = {}) {
  const def = moveDef(kind);
  if (!def || !actorId) return;
  const status = moveStatus(ctx, kind, actorId);
  if (!status.available) {
    const why = status.reason ? lbl(ctx, status.reason) : "";
    ui.result = { text: `${lbl(ctx, def.name)}: ${why}`, error: true };
    ctx.toast(`${lbl(ctx, def.name)}: ${why}`, true);
    return;
  }
  if (kind === "form") {
    ui.tray = false;
    ctx.openForms?.(actorId);
    return;
  }
  ui.tray = false;
  ui.expanded = false;
  ui.armed = {
    kind,
    actorId,
    aim: null,
    targetId: null,
    effect: "push",
    mode: "check",
    skill: null,
    height: null,
    altitude: null,
    runUp: false,
    urge: "",
    featureId: null,
    subject: null,
  };
  if (kind === "climb") {
    const near = D.climbableNear(ctx.state, actorId)[0];
    ui.armed.featureId = near?.feature.id ?? null;
    ui.armed.height = near
      ? Math.min(near.feature.height, D.altitudeOf(ctx.state, actorId) + 1.5)
      : 0;
  }
  if (kind === "fly") ui.armed.altitude = Math.max(3, D.altitudeOf(ctx.state, actorId));
  if (kind === "search") ui.armed.skill = "perception";
  if (kind === "help") ui.armed.mode = ctx.state.combat?.active ? "attack" : "check";
  if (kind === "influence") ui.armed.skill = "persuasion";
  if (kind === "utilize") ui.armed.featureId = objectsNear(ctx, actorId)[0]?.id ?? null;
  if (kind === "mount") {
    ui.armed.targetId = options.mountId ?? mountCandidates(ctx, actorId)[0] ?? null;
    // SRD: only a trained mount can be controlled; any other willing one is independent.
    ui.armed.controlled = ctx.state.actors[ui.armed.targetId]?.mountTrained === true;
  }
  ui.result = null;
  ctx.render();
  // Focus: the card's first choice, or the map when the move is aimed there.
  const doc = globalThis.document;
  const first = doc?.querySelector(
    "#content [data-sm-card] [data-sm-focus], #content [data-sm-card] [data-sm-target], #content [data-sm-card] [data-sm-throw], #content [data-sm-card] [data-sm-execute]",
  );
  if (def.needs === "point") doc?.querySelector("#battle-map")?.focus({ preventScroll: true });
  else first?.focus({ preventScroll: true });
}
export function disarm(ctx) {
  if (!ui.armed) return;
  ui.armed = null;
  ctx.render();
}

// ---------------------------------------------------------------- previews of the armed move

// NPCs a pickpocket could target, nearest first (the knowledge area asks the DM).
function pickpocketTargets(ctx, actorId) {
  return D.touchTargets(ctx.state, actorId, ctx.role).filter(
    (row) =>
      ctx.state.actors[row.actorId]?.kind === "npc" &&
      !ctx.canControl(ctx.state.actors[row.actorId]),
  );
}
/** Metres of a fall: the altitude when airborne, else the chosen height (3 m by default). */
function fallMeters(state, armed) {
  if (D.altitudeOf(state, armed.actorId) > 0) return undefined;
  return Number.isFinite(armed.meters) ? armed.meters : 3;
}
/** The domain preview of the armed move with its current choices. */
export function armedPreview(ctx) {
  const a = ui.armed;
  if (!a) return null;
  const s = ctx.state;
  const role = ctx.role;
  const input = { actorId: a.actorId };
  switch (a.kind) {
    case "long-jump":
      return D.previewJump(s, { ...input, kind: "long", point: a.aim, runUp: a.runUp }, role);
    case "high-jump":
      return D.previewJump(s, { ...input, kind: "high", runUp: a.runUp }, role);
    case "climb":
      return D.previewClimb(s, { ...input, featureId: a.featureId, height: a.height }, role);
    case "swim":
      return D.previewSwim(s, { ...input, point: a.aim }, role);
    case "fly":
      return D.previewFly(s, { ...input, point: a.aim, altitude: a.altitude }, role);
    case "fall":
      return D.previewFall(s, { ...input, dive: a.dive, meters: fallMeters(s, a) }, role);
    case "drag":
      return D.previewDrag(s, { ...input, point: a.aim }, role);
    case "mount":
      return D.previewMount(
        s,
        { ...input, mountId: a.targetId, controlled: a.controlled !== false },
        role,
      );
    case "ride":
      return D.previewRide(s, { ...input, point: a.aim }, role);
    case "dismount":
      return D.previewDismount(s, input, role);
    case "pickpocket":
      return {
        available: Boolean(a.targetId),
        reasons: a.targetId
          ? []
          : [
              {
                code: "choose-target",
                it: "Scegli chi borseggiare.",
                en: "Choose whom to pickpocket.",
              },
            ],
      };
    case "grapple":
      return D.previewGrapple(s, { ...input, targetId: a.targetId }, role);
    case "shove":
      return D.previewShove(s, { ...input, targetId: a.targetId, effect: a.effect }, role);
    case "escape":
      return D.previewEscape(s, input, role);
    case "help":
      return D.previewHelp(
        s,
        { ...input, mode: a.mode, targetId: a.targetId, skill: a.skill },
        role,
      );
    case "hide":
      return D.previewHide(s, { ...input, confirmed: runsSession(s, role) }, role);
    case "search":
      return D.previewSearch(s, { ...input, skill: a.skill }, role);
    case "study":
      return D.previewStudy(s, { ...input, subject: a.subject, skill: a.skill }, role);
    case "influence":
      return D.previewInfluence(
        s,
        { ...input, targetId: a.targetId, skill: a.skill, urge: a.urge },
        role,
      );
    case "utilize":
      return D.previewUtilize(s, { ...input, featureId: a.featureId }, role);
    case "release":
    case "reveal":
    case "throw":
    case "recover":
      return { available: true, reasons: [] };
    default:
      return null;
  }
}
const RESULT = (fn) => ({ result: fn });
/** Execute the armed move with its current choices (click, Enter or the Execute button). */
export function executeArmed(ctx) {
  const a = ui.armed;
  if (!a) return null;
  const preview = armedPreview(ctx);
  if (!preview?.available) {
    const first = preview?.reasons?.[0];
    const text = first ? lbl(ctx, first) : ctx.t("Completa la scelta.", "Complete your choice.");
    ui.result = { text, error: true };
    ctx.toast(text, true);
    ctx.render();
    return null;
  }
  const s = () => ctx.state;
  const role = ctx.role;
  const name = lbl(ctx, moveDef(a.kind)?.name);
  const actor = actorName(ctx, a.actorId);
  let out = null;
  const done = () => {
    ui.armed = null;
  };
  switch (a.kind) {
    case "long-jump":
    case "high-jump":
      done();
      out = act(
        ctx,
        L(`${actor}: ${name}`, `${actor}: ${name}`),
        (d) =>
          D.commitJump(
            d,
            {
              actorId: a.actorId,
              kind: a.kind === "high-jump" ? "high" : "long",
              point: a.aim,
              runUp: a.runUp,
            },
            role,
            op(),
          ),
        RESULT((r) => r?.outcome),
      );
      break;
    case "climb":
      done();
      out = act(
        ctx,
        L(`${actor}: arrampicata`, `${actor}: climb`),
        (d) =>
          D.commitClimb(
            d,
            { actorId: a.actorId, featureId: a.featureId, height: a.height },
            role,
            op(),
          ),
        RESULT((r) => r?.outcome ?? L("Prova di Atletica richiesta", "Athletics check requested")),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "swim":
      done();
      out = act(
        ctx,
        L(`${actor}: nuoto`, `${actor}: swim`),
        (d) => D.commitSwim(d, { actorId: a.actorId, point: a.aim }, role, op()),
        RESULT((r) => r?.outcome),
      );
      break;
    case "fly":
      done();
      out = act(
        ctx,
        L(`${actor}: volo`, `${actor}: flight`),
        (d) =>
          D.commitFly(d, { actorId: a.actorId, point: a.aim, altitude: a.altitude }, role, op()),
        RESULT((r) => r?.outcome),
      );
      break;
    case "fall":
      done();
      out = act(
        ctx,
        L(`${actor}: caduta`, `${actor}: fall`),
        (d) =>
          D.commitFall(
            d,
            { actorId: a.actorId, dive: a.dive, meters: fallMeters(ctx.state, a) },
            role,
            op(),
          ),
        RESULT(() => L("Caduta: tira i danni", "Fall: roll the damage")),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "drag":
      done();
      out = act(
        ctx,
        L(`${actor}: trascina`, `${actor}: drag`),
        (d) => D.commitDrag(d, { actorId: a.actorId, point: a.aim }, role, op()),
        RESULT((r) => r?.outcome),
      );
      break;
    case "mount":
      done();
      out = act(
        ctx,
        L(`${actor}: in sella`, `${actor}: mounts`),
        (d) =>
          D.commitMount(
            d,
            { actorId: a.actorId, mountId: a.targetId, controlled: a.controlled !== false },
            role,
            op(),
          ),
        RESULT((r) => r?.outcome),
      );
      break;
    case "ride":
      done();
      out = act(
        ctx,
        L(`${actor}: cavalca`, `${actor}: rides`),
        (d) => D.commitRide(d, { actorId: a.actorId, point: a.aim }, role, op()),
        RESULT((r) => r?.outcome),
      );
      break;
    case "dismount":
      done();
      out = act(
        ctx,
        L(`${actor}: smonta`, `${actor}: dismounts`),
        (d) => D.commitDismount(d, { actorId: a.actorId }, role, op()),
        RESULT((r) => r?.outcome),
      );
      break;
    case "pickpocket": {
      done();
      const target = { actorId: a.targetId, sceneId: ctx.state.activeSceneId };
      const item = ctx.registry?.get("token-menu", "knowledge-pickpocket", ctx, target);
      if (item) item.run(ctx, target);
      ctx.render();
      break;
    }
    case "grapple":
    case "shove":
      done();
      out = act(
        ctx,
        a.kind === "grapple"
          ? L(
              `${actor} tenta di afferrare ${actorName(ctx, a.targetId)}`,
              `${actor} tries to grapple ${actorName(ctx, a.targetId)}`,
            )
          : L(
              `${actor} tenta di spingere ${actorName(ctx, a.targetId)}`,
              `${actor} tries to shove ${actorName(ctx, a.targetId)}`,
            ),
        (d) =>
          (a.kind === "grapple" ? D.commitGrapple : D.commitShove)(
            d,
            { actorId: a.actorId, targetId: a.targetId, effect: a.effect },
            role,
            op(),
          ),
        RESULT(() =>
          L(
            `In attesa del TS di ${actorName(ctx, a.targetId)}`,
            `Waiting for ${actorName(ctx, a.targetId)}’s save`,
          ),
        ),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "escape":
      done();
      out = act(
        ctx,
        L(`${actor}: sfuggire alla presa`, `${actor}: escape`),
        (d) => D.commitEscape(d, { actorId: a.actorId }, role, op()),
        RESULT(() => L("Prova per sfuggire richiesta", "Escape check requested")),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "release": {
      done();
      const grapple = D.grappleOf(s(), a.actorId).find((g) => g.grapplerId === a.actorId);
      out = act(ctx, L(`${actor} lascia la presa`, `${actor} releases the grapple`), (d) =>
        D.commitRelease(d, { grappleId: grapple?.id }, role, op()),
      );
      break;
    }
    case "help":
      done();
      out = act(
        ctx,
        L(`${actor}: Aiuto`, `${actor}: Help`),
        (d) =>
          D.commitHelp(
            d,
            { actorId: a.actorId, mode: a.mode, targetId: a.targetId, skill: a.skill },
            role,
            op(),
          ),
        RESULT((e) =>
          e?.kind === "help-attack"
            ? L(
                `${actorName(ctx, e.enemyId)} è distratto: vantaggio al prossimo attacco di un alleato`,
                `${actorName(ctx, e.enemyId)} is distracted: an ally’s next attack has Advantage`,
              )
            : L(
                `${actorName(ctx, e?.allyId)} ha vantaggio alla prossima prova di ${lbl(ctx, D.skillName(e?.skill))}`,
                `${actorName(ctx, e?.allyId)} has Advantage on the next ${lbl(ctx, D.skillName(e?.skill))} check`,
              ),
        ),
      );
      break;
    case "hide":
      done();
      out = act(
        ctx,
        L(`${actor}: Nascondersi`, `${actor}: Hide`),
        (d) => D.commitHide(d, { actorId: a.actorId, confirmed: runsSession(d, role) }, role, op()),
        RESULT(() => L("Prova di Furtività (CD 15) richiesta", "Stealth check (DC 15) requested")),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "reveal":
      done();
      out = act(ctx, L(`${actor} esce dal nascondiglio`, `${actor} stops hiding`), (d) =>
        D.commitReveal(d, { actorId: a.actorId }, role, op()),
      );
      break;
    case "search":
      done();
      out = act(
        ctx,
        L(`${actor}: Cercare`, `${actor}: Search`),
        (d) => D.commitSearch(d, { actorId: a.actorId, skill: a.skill }, role, op()),
        RESULT(() => L("Prova di Saggezza richiesta", "Wisdom check requested")),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "study":
      done();
      out = act(
        ctx,
        L(`${actor}: Studiare`, `${actor}: Study`),
        (d) =>
          D.commitStudy(d, { actorId: a.actorId, subject: a.subject, skill: a.skill }, role, op()),
        RESULT(() => L("Prova di Intelligenza richiesta", "Intelligence check requested")),
      );
      if (out?.requests) followAttempt(ctx, out);
      break;
    case "influence":
      done();
      out = act(
        ctx,
        L(
          `${actor}: Influenzare ${actorName(ctx, a.targetId)}`,
          `${actor}: Influence ${actorName(ctx, a.targetId)}`,
        ),
        (d) =>
          D.commitInfluence(
            d,
            { actorId: a.actorId, targetId: a.targetId, skill: a.skill, urge: a.urge },
            role,
            op(),
          ),
        RESULT(() =>
          L(
            "Il DM decide: disposta, contraria o esitante",
            "The DM decides: willing, unwilling or hesitant",
          ),
        ),
      );
      break;
    case "utilize":
      done();
      out = act(
        ctx,
        L(
          `${actor}: ${lbl(ctx, D.featureById(s(), a.featureId)?.action)}`,
          `${actor}: ${lbl(ctx, D.featureById(s(), a.featureId)?.action)}`,
        ),
        (d) => D.commitUtilize(d, { actorId: a.actorId, featureId: a.featureId }, role, op()),
        RESULT((r) => r?.outcome),
      );
      break;
    default:
      return null;
  }
  return out;
}
// Choosing a thrown weapon starts the core attack preview (range, reasons, target click).
export function throwWith(ctx, actorId, actionId) {
  if (!ctx.state.combat?.active) {
    ctx.toast(
      ctx.t("È un attacco: prepara l’iniziativa.", "It is an attack: roll initiative first."),
      true,
    );
    return;
  }
  ui.armed = null;
  prepareCombatAction(ctx, actorId, actionId);
  ctx.render();
  globalThis.document?.querySelector("#battle-map")?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- inspector (Creature tab)

function costChips(ctx, preview, kind) {
  const chips = [];
  const combat = ctx.state.combat?.active;
  if (
    [
      "grapple",
      "shove",
      "escape",
      "help",
      "hide",
      "search",
      "study",
      "influence",
      "utilize",
    ].includes(kind)
  )
    chips.push(
      combat
        ? ctx.t("Azione", "Action")
        : ctx.t("Azione (esplorazione: nessun costo)", "Action (exploration: no cost)"),
    );
  if (Number.isFinite(preview?.cost) && preview.cost > 0)
    chips.push(
      `${ctx.t("Movimento", "Movement")} ${num(ctx, preview.cost, 2)} m${combat ? "" : ctx.t(" (non speso fuori combattimento)", " (not spent outside combat)")}`,
    );
  return chips.map((c) => `<span class="badge sm-chip">${esc(ctx, c)}</span>`).join("");
}
// R3 PG-79: the SRD choice when mounting (Mounted Combat, EN 15 / IT 17), as two radio
// cards: controlled (acts on your turn: Dash, Disengage or Dodge) or independent (keeps
// its own turn). An untrained mount cannot be controlled: that card says why.
function mountChoice(ctx, a, p) {
  if (!a.targetId) return "";
  const trained = ctx.state.actors[a.targetId]?.mountTrained === true;
  const controlled = a.controlled !== false;
  const why = trained
    ? ""
    : `<small class="sm-why" id="sm-why-controlled">${ctx.t("Non è addestrata a portare un cavaliere: scegli Indipendente.", "Not trained to accept a rider: choose Independent.")}</small>`;
  return `<fieldset class="sm-choice sm-mount-choice"><legend>${ctx.t("Come la cavalchi", "How you ride it")}</legend><label><input type="radio" name="sm-controlled" value="controlled" data-sm-controlled ${controlled ? "checked" : ""}${trained ? "" : ' disabled aria-describedby="sm-why-controlled"'}> <strong>${ctx.t("Controllata", "Controlled")}</strong> <small>${ctx.t("Agisce nel tuo turno (solo Scatto, Disimpegno o Schivata); il suo posto nell’iniziativa diventa il tuo.", "It acts on your turn (Dash, Disengage or Dodge only); its initiative becomes yours.")}</small>${why}</label><label><input type="radio" name="sm-controlled" value="independent" data-sm-controlled ${controlled ? "" : "checked"}> <strong>${ctx.t("Indipendente", "Independent")}</strong> <small>${ctx.t("Tiene il suo posto nell’iniziativa e si muove e agisce come vuole.", "It keeps its place in the initiative and moves and acts as it likes.")}</small></label></fieldset>`;
}
function reasonsList(ctx, preview) {
  const reasons = blocking(preview?.reasons);
  if (!reasons.length) return "";
  return `<ul class="sm-reasons" id="sm-reasons" role="alert">${reasons.map((r) => `<li>${esc(ctx, lbl(ctx, r))}</li>`).join("")}</ul>`;
}
function targetButtons(ctx, rows, current, describe) {
  if (!rows.length)
    return `<p class="muted">${ctx.t("Nessuna creatura adatta in vista.", "No suitable creature in view.")}</p>`;
  return `<div class="sm-targets" role="group" aria-label="${ctx.t("Bersagli", "Targets")}">${rows
    .map(
      (row) =>
        `<button type="button" class="button${row.id === current ? " active" : ""}" data-sm-target="${esc(ctx, row.id)}" aria-pressed="${row.id === current}">${esc(ctx, row.name)}<small>${esc(ctx, describe(row))}</small></button>`,
    )
    .join("")}</div>`;
}
// A select shows no choice as made until the viewer makes it.
const placeholder = (value) => (value ? "" : '<option value="" selected>—</option>');
function armedDetails(ctx, a, p) {
  const s = ctx.state;
  const m = (value) => num(ctx, value, 2) + " m";
  switch (a.kind) {
    case "long-jump": {
      const prof = p.profile;
      return `<p>${ctx.t("Salto massimo", "Longest jump")}: <strong>${m(prof?.long ?? 0)}</strong> (${prof?.runUp ? ctx.t("con rincorsa", "with a run-up") : ctx.t("da fermo", "standing")}; ${ctx.t("con 3 m di rincorsa", "with a 3 m run-up")} ${m(prof?.longFull ?? 0)}) · ${ctx.t(prof?.ability === "dex" ? "Destrezza (Saltatore)" : "Forza", prof?.ability === "dex" ? "Dexterity (Jumper)" : "Strength")} ${prof?.score ?? "?"}</p>${s.combat?.active ? `<p class="muted">${prof?.runUp ? ctx.t("Rincorsa: ti sei appena mosso di almeno 3 m.", "Run-up: you just moved at least 3 m.") : ctx.t("Per la rincorsa muoviti prima di almeno 3 m in questo turno.", "For a run-up, first move at least 3 m this turn.")}</p>` : `<label class="prep-check"><input type="checkbox" data-sm-runup ${a.runUp ? "checked" : ""}> ${ctx.t("Prendo la rincorsa (almeno 3 m)", "I take a run-up (at least 3 m)")}</label>`}${p.distance !== undefined ? `<p>${ctx.t("Distanza", "Distance")}: <strong>${m(p.distance)}</strong> · ${ctx.t("costo", "cost")} ${m(p.cost)}</p>` : `<p class="sm-instructions">${ctx.t("Punta il punto d’atterraggio sulla mappa: clic per saltare. Frecce e Invio da tastiera.", "Point at the landing spot on the map: click to jump. Arrow keys and Enter from the keyboard.")}</p>`}${p.landingCheck ? `<p class="effect-note">${ctx.t("Atterri su terreno difficile: prova di Destrezza (Acrobazia) CD 10 o cadi Prono.", "You land in difficult terrain: Dexterity (Acrobatics) DC 10 or you fall Prone.")}</p>` : ""}<p class="muted">${ctx.t("Il salto usa il movimento: può provocare attacchi di opportunità.", "The jump uses movement: it can provoke opportunity attacks.")}</p>`;
    }
    case "high-jump":
      return `<p>${ctx.t("Altezza", "Height")}: <strong>${m(p.height ?? 0)}</strong> (${p.profile?.runUp ? ctx.t("con rincorsa", "with a run-up") : ctx.t("da fermo", "standing")}) · ${ctx.t("puoi raggiungere quell’altezza più una volta e mezza la tua statura", "you can reach that height plus one and a half times your height")}</p>${s.combat?.active ? "" : `<label class="prep-check"><input type="checkbox" data-sm-runup ${a.runUp ? "checked" : ""}> ${ctx.t("Prendo la rincorsa (almeno 3 m)", "I take a run-up (at least 3 m)")}</label>`}`;
    case "climb": {
      const near = D.climbableNear(s, a.actorId);
      const feature = p.feature;
      return `${near.length > 1 ? `<label class="field">${ctx.t("Parete", "Wall")}<select data-sm-feature>${near.map((row) => `<option value="${esc(ctx, row.feature.id)}" ${row.feature.id === a.featureId ? "selected" : ""}>${esc(ctx, lbl(ctx, row.feature.name))} · ${m(row.feature.height)}</option>`).join("")}</select></label>` : feature ? `<p><strong>${esc(ctx, lbl(ctx, feature.name))}</strong> · ${ctx.t("alta", "height")} ${m(feature.height)}. ${esc(ctx, lbl(ctx, feature.text))}</p>` : ""}${feature ? `<div class="sm-stepper"><label class="field">${ctx.t("Altezza da raggiungere (m)", "Height to reach (m)")}<input type="number" data-sm-height data-sm-focus min="0" max="${feature.height}" step="0.5" value="${a.height ?? 0}" inputmode="decimal"></label></div><p>${ctx.t("Da", "From")} ${m(p.from ?? 0)} ${ctx.t("a", "to")} ${m(p.height ?? 0)} · ${ctx.t("costo", "cost")} <strong>${m(p.cost ?? 0)}</strong> (${p.climbSpeed ? ctx.t("velocità di scalata: nessun extra", "Climb Speed: no extra") : ctx.t("ogni metro costa il doppio", "each metre costs double")}${p.difficult ? ctx.t(", +1 per terreno difficile", ", +1 for difficult terrain") : ""})</p>${p.check ? `<p class="effect-note">${ctx.t("Superficie scivolosa: prova di Forza (Atletica) CD", "Slippery surface: Strength (Athletics) DC")} ${p.check.dc}.</p>` : ""}` : ""}`;
    }
    case "swim":
      return p.to
        ? `<p>${ctx.t("Percorso", "Path")} ${m(p.meters)} · ${ctx.t("in acqua", "in water")} ${m(p.water)} · ${ctx.t("costo", "cost")} <strong>${m(p.cost)}</strong>${p.swimSpeed ? ctx.t(" (velocità di nuoto)", " (Swim Speed)") : ""}</p>`
        : `<p class="sm-instructions">${ctx.t("Punta la destinazione oltre l’acqua: clic per nuotare. Anche Muovi attraverso l’acqua nuota da sé.", "Point at a destination across the water: click to swim. Move through water also swims by itself.")}</p>`;
    case "fly":
      return `<p>${ctx.t("Velocità di volo", "Fly Speed")} ${m(p.flySpeed ?? 0)}${p.hover ? ctx.t(" · fluttuare", " · hover") : ""}${Number.isFinite(p.left) ? ` · ${ctx.t("rimasti", "left")} ${m(p.left)}` : ""}</p><label class="field">${ctx.t("Quota (m)", "Altitude (m)")}<input type="number" data-sm-altitude data-sm-focus min="0" max="300" step="0.5" value="${a.altitude ?? 0}" inputmode="decimal"></label>${p.to ? `<p>${ctx.t("Costo", "Cost")} <strong>${m(p.cost)}</strong> (${ctx.t("orizzontale", "horizontal")} ${m(p.horizontal)} + ${ctx.t("quota", "altitude")} ${m(Math.abs(p.to.altitude - p.from.altitude))})</p>` : ""}<p class="sm-instructions">${ctx.t("Punta la destinazione o premi Esegui per cambiare solo quota.", "Point at the destination or press Execute to change altitude only.")}</p>`;
    case "fall":
      return `${D.altitudeOf(s, a.actorId) > 0 ? "" : `<label class="field">${ctx.t("Da che altezza cade (m)", "Height of the fall (m)")}<input type="number" data-sm-fall-height data-sm-focus min="0" max="200" step="1.5" value="${fallMeters(s, a)}" inputmode="decimal"></label>`}<p>${ctx.t("Caduta da", "Fall of")} <strong>${m(p.meters ?? 0)}</strong>: ${p.dice ? `<strong>${p.formula}</strong> ${ctx.t("danni contundenti, poi Prono", "bludgeoning damage, then Prone")}` : ctx.t("meno di 3 m, nessun danno", "under 3 m, no damage")}.</p>${p.water ? `<label class="prep-check"><input type="checkbox" data-sm-dive ${a.dive ? "checked" : ""}> ${ctx.t("Tuffo (reazione): Atletica o Acrobazia CD 15 dimezza i danni", "Dive (Reaction): Athletics or Acrobatics DC 15 halves the damage")}</label>` : ""}`;
    case "drag":
      return p.grapple
        ? `<p>${ctx.t("Trascini", "You drag")} <strong>${esc(ctx, actorName(ctx, p.grapple.targetId))}</strong>${p.factor > 1 ? ctx.t(": ogni metro costa il doppio", ": each metre costs double") : ctx.t(": è molto più piccolo, costo normale", ": much smaller, normal cost")}.</p>${p.to ? `<p>${ctx.t("Costo", "Cost")} <strong>${m(p.cost)}</strong></p>` : `<p class="sm-instructions">${ctx.t("Punta la destinazione sulla mappa.", "Point at the destination on the map.")}</p>`}`
        : "";
    case "mount":
      return `${targetButtons(
        ctx,
        mountCandidates(ctx, a.actorId).map((id) => ({ id, name: actorName(ctx, id) })),
        a.targetId,
        (row) => lbl(ctx, D.SIZE_NAMES[D.sizeOf(s.actors[row.id])]),
      )}${p.mount ? `<p>${ctx.t("Cavalcatura", "Mount")}: <strong>${esc(ctx, p.mount.name)}</strong> · ${esc(ctx, lbl(ctx, D.SIZE_NAMES[p.mount.size]))} · ${ctx.t("velocità", "Speed")} ${m(p.mount.speed)} · ${ctx.t("costo", "cost")} ${m(p.cost)}</p>` : ""}${mountChoice(ctx, a, p)}`;
    case "ride":
      return `<p>${ctx.t("Velocità della cavalcatura", "Mount’s Speed")} ${m(p.speed ?? 0)}${Number.isFinite(p.left) ? ` · ${ctx.t("rimasti", "left")} ${m(p.left)}` : ""}${p.to ? ` · ${ctx.t("costo", "cost")} <strong>${m(p.cost)}</strong>` : ""}</p><p class="sm-instructions">${ctx.t("Punta dove cavalcare.", "Point at where to ride.")}</p>`;
    case "dismount":
      return `<p>${ctx.t("Costo", "Cost")} ${m(p.cost ?? 0)} · ${ctx.t("scendi accanto alla cavalcatura", "you step down next to the mount")}</p>`;
    case "pickpocket": {
      const rows = pickpocketTargets(ctx, a.actorId).filter((row) => row.inReach);
      return `${targetButtons(
        ctx,
        rows.map((r) => ({ id: r.actorId, name: r.name, r })),
        a.targetId,
        () => ctx.t("a portata", "in reach"),
      )}<p class="sm-instructions">${ctx.t("Il DM decide la CD e che cosa è a portata; poi tiri Rapidità di Mano.", "The DM decides the DC and what is in reach; then you roll Sleight of Hand.")}</p>`;
    }
    case "grapple":
    case "shove": {
      const rows = D.touchTargets(s, a.actorId, ctx.role).filter((t) => t.meters <= 6);
      const pick = targetButtons(
        ctx,
        rows.map((r) => ({ id: r.actorId, name: r.name, r })),
        a.targetId,
        (row) =>
          row.r.inReach ? ctx.t("a portata", "in reach") : num(ctx, row.r.meters, 1) + " m",
      );
      const shove =
        a.kind === "shove"
          ? `<fieldset class="sm-choice"><legend>${ctx.t("Se fallisce il TS", "If the save fails")}</legend><label><input type="radio" name="sm-effect" value="push" data-sm-effect ${a.effect !== "prone" ? "checked" : ""}> ${ctx.t("Spingilo di 1,5 m", "Push it 1.5 m away")}</label><label><input type="radio" name="sm-effect" value="prone" data-sm-effect ${a.effect === "prone" ? "checked" : ""}> ${ctx.t("Fallo cadere Prono", "Knock it Prone")}</label></fieldset>`
          : "";
      const odds = p.save
        ? `<p>${ctx.t("CD", "DC")} <strong>${p.dc}</strong> (8 + ${ctx.t("For", "Str")} + ${ctx.t("competenza", "proficiency")}) · ${ctx.t("TS del bersaglio", "Target’s save")}: ${lbl(ctx, D.abilityName(p.save.ability))} ${signed(p.save.bonus)}${p.save.mode !== "normal" ? " · " + esc(ctx, p.save.mode) : ""} · <strong>${pct(ctx, p.chance)}</strong> ${ctx.t("di riuscita per te", "chance for you")}</p>`
        : "";
      const push =
        a.kind === "shove" && p.push
          ? `<p class="${p.push.blocked ? "sm-bad" : ""}">${p.push.blocked ? ctx.t("Traiettoria bloccata", "Trajectory blocked") + ": " + esc(ctx, lbl(ctx, p.push.why)) : ctx.t("Traiettoria libera: atterra a 1,5 m", "Clear trajectory: lands 1.5 m away")}${p.push.fall ? ` · ${ctx.t("cadrà da", "it will fall")} ${m(p.push.fall.meters)} (${p.push.fall.dice ? p.push.fall.dice + "d6" : ctx.t("nessun danno", "no damage")})` : ""}</p>`
          : "";
      return `${pick}${shove}${odds}${push}${a.kind === "grapple" ? `<p class="muted">${ctx.t("Colpo senz’armi 2024: niente tiro per colpire, il bersaglio fa un TS su Forza o Destrezza (sceglie lui). Serve una mano libera.", "2024 Unarmed Strike: no attack roll, the target makes a Strength or Dexterity save (its choice). You need a free hand.")}</p>` : `<p class="muted">${ctx.t("Colpo senz’armi 2024: il bersaglio fa un TS su Forza o Destrezza (sceglie lui).", "2024 Unarmed Strike: the target makes a Strength or Dexterity save (its choice).")}</p>`}`;
    }
    case "escape":
      return p.grapple
        ? `<p>${ctx.t("CD per sfuggire", "Escape DC")} <strong>${p.dc}</strong> · ${lbl(ctx, D.skillName(p.skill))} ${signed(p.bonus)} · ${pct(ctx, p.chance)}</p>`
        : "";
    case "release": {
      const g = D.grappleOf(s, a.actorId).find((row) => row.grapplerId === a.actorId);
      return g
        ? `<p>${ctx.t("Lasci", "You release")} <strong>${esc(ctx, actorName(ctx, g.targetId))}</strong> ${ctx.t("(nessuna azione).", "(no action).")}</p>`
        : "";
    }
    case "help": {
      const rows =
        a.mode === "attack"
          ? D.touchTargets(s, a.actorId, ctx.role, { enemiesOnly: true }).map((r) => ({
              id: r.actorId,
              name: r.name,
              r,
            }))
          : D.touchTargets(s, a.actorId, ctx.role, { allies: true }).map((r) => ({
              id: r.actorId,
              name: r.name,
              r,
            }));
      // SRD Help: one of the helper's own skill proficiencies.
      const skills = D.helpSkills(s, a.actorId);
      return `<fieldset class="sm-choice"><legend>${ctx.t("Come aiuti", "How you help")}</legend><label><input type="radio" name="sm-help" value="attack" data-sm-help ${a.mode === "attack" ? "checked" : ""}> ${ctx.t("Distrai un nemico entro 1,5 m (vantaggio al prossimo attacco di un alleato)", "Distract an enemy within 1.5 m (an ally’s next attack has Advantage)")}</label><label><input type="radio" name="sm-help" value="check" data-sm-help ${a.mode === "check" ? "checked" : ""}> ${ctx.t("Assisti la prova di un alleato (vantaggio con l’abilità scelta)", "Assist an ally’s check (Advantage with the chosen skill)")}</label></fieldset>${targetButtons(ctx, rows, a.targetId, (row) => num(ctx, row.r.meters, 1) + " m")}${a.mode === "check" ? `<label class="field">${ctx.t("Abilità", "Skill")}<select data-sm-skill>${placeholder(a.skill)}${skills.map((k) => `<option value="${k}" ${a.skill === k ? "selected" : ""}>${esc(ctx, lbl(ctx, D.skillName(k)))}</option>`).join("")}</select></label>` : ""}<p class="muted">${ctx.t("Il vantaggio scade all’inizio del tuo prossimo turno.", "The Advantage expires at the start of your next turn.")}</p>`;
    }
    case "hide":
      return `<p>${ctx.t("Prova di Destrezza (Furtività) CD 15", "Dexterity (Stealth) check DC 15")}${p.bonus !== null ? ` · ${signed(p.bonus)} · ${pct(ctx, p.chance)}` : ""}. ${ctx.t("Se riesci sei Invisibile finché resti nascosto; il tuo totale è la CD per trovarti.", "On a success you are Invisible while hidden; your total is the DC to find you.")}</p>${p.watchers?.length ? `<p class="${runsSession(ctx.state, ctx.role) ? "effect-note" : "sm-bad"}">${ctx.t("In vista di", "Seen by")}: ${esc(ctx, p.watchers.map((w) => w.name).join(", "))}${runsSession(ctx.state, ctx.role) ? ctx.t(" · come DM confermi oscurità pesante o copertura", " · as DM you confirm heavy obscurement or cover") : ""}</p>` : ""}`;
    case "reveal":
      return `<p>${ctx.t("Smetti di nasconderti: la condizione Invisibile di Nascondersi termina.", "You stop hiding: the Invisible condition from Hide ends.")}</p>`;
    case "search":
      return `<label class="field">${ctx.t("Cosa cerchi (tabella Ricerca)", "What you look for (Search table)")}<select data-sm-skill data-sm-focus>${D.SEARCH_SKILLS.map((k) => `<option value="${k}" ${a.skill === k ? "selected" : ""}>${esc(ctx, lbl(ctx, D.skillName(k)))}</option>`).join("")}</select></label><p class="muted">${ctx.t("Percezione trova creature e oggetti nascosti entro 9 m; le altre abilità danno un totale che il DM racconta.", "Perception finds hidden creatures and objects within 9 m; the other skills give a total the DM narrates.")}</p>`;
    case "study": {
      const subjects = D.studySubjects(s, a.actorId, ctx.role);
      const current = a.subject
        ? subjects.find((row) => row.kind === a.subject.kind && row.id === a.subject.id)
        : null;
      return `<label class="field">${ctx.t("Cosa studi", "What you study")}<select data-sm-subject data-sm-focus><option value="">—</option>${subjects.map((row) => `<option value="${row.kind}:${esc(ctx, row.id)}" ${current === row ? "selected" : ""}>${esc(ctx, lbl(ctx, row.name))}</option>`).join("")}</select></label><label class="field">${ctx.t("Area di conoscenza", "Area of knowledge")}<select data-sm-skill>${placeholder(a.skill)}${D.STUDY_SKILLS.map((k) => `<option value="${k}" ${a.skill === k ? "selected" : ""}>${esc(ctx, lbl(ctx, D.skillName(k)))}${current?.suggested === k ? " · " + ctx.t("consigliata", "suggested") : ""}</option>`).join("")}</select></label>`;
    }
    case "influence": {
      // Monsters and NPCs only; their attitude is the DM's knowledge (players see distance).
      const rows = D.touchTargets(s, a.actorId, ctx.role)
        .filter((r) => r.meters <= 18 && s.actors[r.actorId]?.kind !== "character")
        .map((r) => ({ id: r.actorId, name: r.name, r }));
      return `${targetButtons(ctx, rows, a.targetId, (row) =>
        runsSession(ctx.state, ctx.role)
          ? lbl(ctx, D.ATTITUDE_NAMES[D.sliceOf(s)?.attitudes?.[row.id] ?? "indifferent"])
          : num(ctx, row.r.meters, 1) + " m",
      )}<label class="field">${ctx.t("Come interagisci", "How you interact")}<select data-sm-skill>${D.INFLUENCE_SKILLS.map((k) => `<option value="${k}" ${a.skill === k ? "selected" : ""}>${esc(ctx, lbl(ctx, D.skillName(k)))}</option>`).join("")}</select></label><label class="field">${ctx.t("Che cosa chiedi", "What you urge")}<textarea data-sm-urge maxlength="200" rows="2">${esc(ctx, a.urge ?? "")}</textarea></label><p class="muted">${ctx.t("Il DM decide se è disposta (riesce), contraria (fallisce) o esitante (prova contro CD 15 o la sua Intelligenza).", "The DM decides willing (succeeds), unwilling (fails) or hesitant (a check against DC 15 or its Intelligence).")}</p>`;
    }
    case "utilize": {
      const rows = objectsNear(ctx, a.actorId);
      return `${rows.length ? `<div class="sm-targets">${rows.map((f) => `<button type="button" class="button${f.id === a.featureId ? " active" : ""}" data-sm-object="${esc(ctx, f.id)}" aria-pressed="${f.id === a.featureId}">${esc(ctx, lbl(ctx, f.action))}<small>${esc(ctx, lbl(ctx, f.name))}</small></button>`).join("")}</div>` : ""}${p.feature ? `<p>${esc(ctx, lbl(ctx, p.feature.text))}</p>` : ""}`;
    }
    case "throw": {
      const menu = D.throwMenu(s, a.actorId);
      return `<ul class="sm-throw" aria-label="${ctx.t("Cosa puoi lanciare", "What you can throw")}">${menu
        .map(
          (row) =>
            `<li><button type="button" class="button${row.available ? "" : " quiet"}" data-sm-throw="${esc(ctx, row.actionId)}"${row.available && s.combat?.active ? "" : ` aria-disabled="true" aria-describedby="sm-why-throw-${esc(ctx, row.actionId)}"`}>${glyph(ctx, "throw")} ${esc(ctx, lbl(ctx, row.name))}${row.range ? ` · ${num(ctx, row.range.normal)}/${num(ctx, row.range.long)} m` : ""}${row.thrown ? ` · ${ctx.t("in mano", "in hand")} ${row.inHand}` : ""}</button>${row.why ? `<small class="sm-why" id="sm-why-throw-${esc(ctx, row.actionId)}">${esc(ctx, lbl(ctx, row.why))}</small>` : !s.combat?.active ? `<small class="sm-why" id="sm-why-throw-${esc(ctx, row.actionId)}">${ctx.t("Fuori combattimento: prepara l’iniziativa per attaccare.", "Out of combat: roll initiative to attack.")}</small>` : ""}</li>`,
        )
        .join(
          "",
        )}</ul><p class="muted">${ctx.t("Oltre la gittata normale il tiro ha svantaggio; oltre la lunga non puoi. L’arma resta a terra vicino al bersaglio.", "Beyond normal range the roll has Disadvantage; beyond long range you cannot. The weapon stays on the ground near the target.")}</p>`;
    }
    case "recover": {
      const rows = (D.sliceOf(s)?.thrown ?? []).filter(
        (t) => t.actorId === a.actorId && !t.recovered,
      );
      return `<ul class="sm-throw">${rows
        .map((t) => {
          const pv = D.previewRecover(s, { actorId: a.actorId, thrownId: t.id }, ctx.role);
          return `<li><button type="button" class="button" data-sm-recover="${esc(ctx, t.id)}"${pv.available ? "" : ` aria-disabled="true" aria-describedby="sm-why-recover-${esc(ctx, t.id)}"`}>${glyph(ctx, "recover")} ${esc(ctx, lbl(ctx, t.name))}${t.targetId ? ` · ${ctx.t("vicino a", "near")} ${esc(ctx, actorName(ctx, t.targetId))}` : ""}</button>${pv.available ? `<small class="muted">${pv.cost === "free" ? ctx.t("interazione gratuita", "free interaction") : ctx.t("azione Utilizzo", "Utilize action")}</small>` : `<small class="sm-why" id="sm-why-recover-${esc(ctx, t.id)}">${esc(ctx, lbl(ctx, pv.reasons[0]))}</small>`}</li>`;
        })
        .join("")}</ul>`;
    }
    default:
      return "";
  }
}
function armedCard(ctx) {
  const a = ui.armed;
  const def = moveDef(a.kind);
  const p = armedPreview(ctx) ?? { reasons: [] };
  const execute = !["throw", "recover"].includes(a.kind);
  const title = `${lbl(ctx, def.name)} · ${esc(ctx, actorName(ctx, a.actorId))}`;
  // Phone, aimed on the map: a short sheet (the map stays visible), details on demand.
  const phone = globalThis.matchMedia?.("(max-width: 720px)")?.matches === true;
  if (phone && ["point", "target"].includes(def.needs) && !ui.expanded) {
    const m = (value) => num(ctx, value, 2) + " m";
    const line =
      a.kind === "mount" && p.mount
        ? `${ctx.t("Cavalcatura", "Mount")}: ${p.mount.name} · ${ctx.t("costo", "cost")} ${m(p.cost ?? 0)}`
        : p.distance !== undefined && p.cost !== undefined
          ? `${ctx.t("Distanza", "Distance")} ${m(p.distance)} · ${ctx.t("costo", "cost")} ${m(p.cost)}`
          : Number.isFinite(p.cost) && p.to
            ? `${ctx.t("Costo", "Cost")} ${m(p.cost)}`
            : def.needs === "target"
              ? ctx.t(
                  "Tocca la creatura sulla mappa o scegli nei dettagli.",
                  "Tap the creature on the map or choose in the details.",
                )
              : ctx.t("Tocca la mappa dove vuoi arrivare.", "Tap the map where you want to go.");
    const runUp =
      a.kind === "long-jump" && !ctx.state.combat?.active
        ? `<label class="prep-check"><input type="checkbox" data-sm-runup ${a.runUp ? "checked" : ""}> ${ctx.t("Prendo la rincorsa (almeno 3 m)", "I take a run-up (at least 3 m)")}</label>`
        : "";
    return `<section class="sm-card sm-compact" data-sm-card="${a.kind}" aria-label="${ctx.t("Anteprima", "Preview")}: ${esc(ctx, lbl(ctx, def.name))}"><div class="sm-card-head"><span class="sm-move-icon">${glyph(ctx, def.icon)}</span><h3>${title}</h3><button type="button" class="icon-button" data-sm-cancel aria-label="${ctx.t("Annulla la mossa", "Cancel the move")}">${ctx.icon("close")}</button></div><p class="sm-instructions">${esc(ctx, line)}</p>${runUp}${a.kind === "mount" ? mountChoice(ctx, a, p) : ""}${reasonsList(ctx, p)}<div class="toolbar">${execute ? `<button type="button" class="button primary" data-sm-execute ${p.available ? "" : `aria-disabled="true"${blocking(p.reasons).length ? ' aria-describedby="sm-reasons"' : ""}`}>${ctx.t("Esegui", "Execute")}</button>` : ""}<button type="button" class="button quiet" data-sm-expand aria-expanded="false">${ctx.t("Dettagli", "Details")}</button><button type="button" class="button quiet" data-sm-cancel>${ctx.t("Annulla", "Cancel")}</button></div></section>`;
  }
  return `<section class="sm-card" data-sm-card="${a.kind}" aria-label="${ctx.t("Anteprima", "Preview")}: ${esc(ctx, lbl(ctx, def.name))}"><div class="sm-card-head"><span class="sm-move-icon">${glyph(ctx, def.icon)}</span><h3>${title}</h3><button type="button" class="icon-button" data-sm-cancel aria-label="${ctx.t("Annulla la mossa", "Cancel the move")}">${ctx.icon("close")}</button></div><span class="badge">${ctx.t("Anteprima · nessun costo finché non esegui", "Preview · nothing spent until you execute")}</span>${costChips(ctx, p, a.kind)}${armedDetails(ctx, a, p)}${reasonsList(ctx, p)}<div class="toolbar">${execute ? `<button type="button" class="button primary" data-sm-execute ${p.available ? "" : `aria-disabled="true"${blocking(p.reasons).length ? ' aria-describedby="sm-reasons"' : ""}`}>${ctx.t("Esegui", "Execute")}: ${esc(ctx, lbl(ctx, def.name))}</button>` : ""}<button type="button" class="button quiet" data-sm-cancel>${ctx.t("Annulla", "Cancel")}</button></div>${phone && ui.expanded ? `<button type="button" class="button quiet" data-sm-expand aria-expanded="true">${ctx.t("Meno dettagli", "Fewer details")}</button>` : ""}<p class="sm-rule">${ctx.t("Regola", "Rule")}: ${sourceLink(ctx, p.source ?? p.rule)}${p.flightCost ? " · " + sourceLink(ctx, p.flightCost) : ""}</p></section>`;
}
function pendingBlock(ctx) {
  const pending = pendingForViewer(ctx);
  const s = ctx.state;
  const parts = [];
  for (const { attempt, request } of pending.requests) {
    const saveChoice =
      request.step === "save" && ["grapple", "shove"].includes(attempt.specialMove?.kind);
    parts.push(
      `<li class="sm-request"><span><strong>${esc(ctx, actorName(ctx, request.actorId))}</strong> · ${esc(ctx, lbl(ctx, attempt.actionName))}${request.label ? ` · ${esc(ctx, lbl(ctx, request.label))}` : ""}${request.dc && (runsSession(ctx.state, ctx.role) || !["influence", "search", "study"].includes(attempt.specialMove?.kind)) ? ` · ${ctx.t("CD", "DC")} ${request.dc}` : ""}</span><span class="toolbar">${saveChoice ? `<button type="button" class="button quiet" data-sm-save="${esc(ctx, attempt.id)}" data-sm-ability="${attempt.specialMove.saveAbility === "str" ? "dex" : "str"}">${ctx.t("Usa", "Use")} ${esc(ctx, lbl(ctx, D.abilityName(attempt.specialMove.saveAbility === "str" ? "dex" : "str")))}</button>` : ""}<button type="button" class="button primary" data-sm-roll="${esc(ctx, attempt.id)}" data-sm-request="${esc(ctx, request.id)}">${ctx.t("Tira", "Roll")}</button></span></li>`,
    );
  }
  for (const j of pending.judgements)
    parts.push(
      `<li class="sm-request"><span><strong>${esc(ctx, actorName(ctx, j.actorId))}</strong> → ${esc(ctx, actorName(ctx, j.targetId))} · ${esc(ctx, lbl(ctx, D.skillName(j.skill)))} · «${esc(ctx, j.urge)}» · ${esc(ctx, lbl(ctx, D.ATTITUDE_NAMES[j.attitude]))}</span><span class="toolbar"><button type="button" class="button" data-sm-judge="${esc(ctx, j.id)}" data-sm-decision="willing">${ctx.t("Disposta", "Willing")}</button><button type="button" class="button" data-sm-judge="${esc(ctx, j.id)}" data-sm-decision="hesitant">${ctx.t("Esitante: prova CD", "Hesitant: check DC")} ${j.dc}</button><button type="button" class="button quiet" data-sm-judge="${esc(ctx, j.id)}" data-sm-decision="unwilling">${ctx.t("Contraria", "Unwilling")}</button></span></li>`,
    );
  for (const p of pending.proposals)
    parts.push(
      `<li class="sm-request"><span><strong>${esc(ctx, actorName(ctx, p.actorId))}</strong> ${ctx.t("propone un movimento", "proposes a move")} · ${num(ctx, p.meters, 1)} m</span><span class="toolbar"><button type="button" class="button primary" data-sm-decide="${esc(ctx, p.id)}" data-sm-decision="approve">${ctx.t("Approva", "Approve")}</button><button type="button" class="button quiet" data-sm-decide="${esc(ctx, p.id)}" data-sm-decision="cancel">${ctx.t("Annulla", "Cancel")}</button></span></li>`,
    );
  // The player's own proposals: waiting, with a way to withdraw them.
  if (ctx.role === "player")
    for (const p of D.pendingProposals(s).filter((row) => row.by === "player"))
      parts.push(
        `<li class="sm-request"><span><strong>${esc(ctx, actorName(ctx, p.actorId))}</strong> · ${ctx.t("proposta in attesa del DM", "proposal waiting for the DM")} · ${num(ctx, p.meters, 1)} m</span><span class="toolbar"><button type="button" class="button quiet" data-sm-decide="${esc(ctx, p.id)}" data-sm-decision="withdraw">${ctx.t("Ritira", "Withdraw")}</button></span></li>`,
      );
  const approveAll =
    pending.proposals.length > 1
      ? `<button type="button" class="button" data-sm-approve-all>${ctx.t("Approva tutte", "Approve all")}</button>`
      : "";
  return parts.length
    ? `<section class="sm-pending" aria-label="${ctx.t("In attesa", "Waiting")}"><h4>${ctx.t("In attesa di te", "Waiting for you")}</h4><ul class="sm-list">${parts.join("")}</ul>${approveAll}</section>`
    : "";
}
function statusBlock(ctx, actorId) {
  const s = ctx.state;
  const actor = s.actors[actorId];
  if (!actor) return "";
  const rows = [];
  const control = ctx.canControl(actor);
  for (const g of D.grappleOf(s, actorId)) {
    if (g.grapplerId === actorId)
      rows.push(
        `<li>${glyph(ctx, "grapple")} ${ctx.t("Afferra", "Grappling")} <strong>${esc(ctx, actorName(ctx, g.targetId))}</strong> · ${ctx.t("CD per sfuggire", "escape DC")} ${g.dc}${control ? ` <button type="button" class="button quiet" data-sm-release="${esc(ctx, g.id)}">${ctx.t("Lascia", "Release")}</button>` : ""}</li>`,
      );
    else
      rows.push(
        `<li>${glyph(ctx, "grapple")} ${ctx.t("Afferrato da", "Grappled by")} <strong>${esc(ctx, actorName(ctx, g.grapplerId))}</strong> · ${ctx.t("velocità 0", "Speed 0")}</li>`,
      );
  }
  const hidden = D.hiddenFor(s, actorId, ctx.role);
  if (hidden)
    rows.push(
      `<li>${glyph(ctx, "hide")} ${ctx.t("Nascosto", "Hidden")}${hidden.dc !== null ? ` · ${ctx.t("CD per trovarlo", "DC to find")} ${hidden.dc}` : ""}</li>`,
    );
  const altitude = D.altitudeOf(s, actorId);
  const speeds = D.speedsOf(s, actorId);
  if (altitude > 0)
    rows.push(
      `<li>${glyph(ctx, speeds.fly ? "fly" : "climb")} ${ctx.t("Quota", "Altitude")} <strong>${num(ctx, altitude, 2)} m</strong>${speeds.fly ? ` · ${ctx.t("volo", "flying")} ${num(ctx, speeds.fly)} m` : ""}</li>`,
    );
  else if (speeds.fly)
    rows.push(
      `<li>${glyph(ctx, "fly")} ${ctx.t("Velocità di volo", "Fly Speed")} ${num(ctx, speeds.fly)} m${speeds.flightSource?.label ? ` · ${esc(ctx, speeds.flightSource.label)}` : ""}</li>`,
    );
  const falling = D.fallingState(s, actorId);
  if (falling)
    rows.push(
      `<li class="sm-bad">${glyph(ctx, "fall")} ${ctx.t("Sta cadendo", "Falling")}: ${esc(ctx, lbl(ctx, falling.cause))}${runsSession(ctx.state, ctx.role) || control ? ` <button type="button" class="button" data-sm-drop="${esc(ctx, actorId)}">${ctx.t("Fai cadere", "Make it fall")} (${num(ctx, falling.altitude)} m)</button>` : ""}</li>`,
    );
  const mount = D.mountOf(s, actorId);
  if (mount)
    rows.push(
      `<li>${glyph(ctx, "mount")} ${ctx.t("In sella a", "Riding")} <strong>${esc(ctx, actorName(ctx, mount.mountId))}</strong></li>`,
    );
  const rider = D.riderOf(s, actorId);
  if (rider)
    rows.push(
      `<li>${glyph(ctx, "mount")} ${ctx.t("Cavalcata da", "Ridden by")} <strong>${esc(ctx, actorName(ctx, rider))}</strong></li>`,
    );
  for (const t of (D.sliceOf(s)?.thrown ?? []).filter(
    (row) => row.actorId === actorId && !row.recovered,
  ))
    rows.push(
      `<li>${glyph(ctx, "throw")} ${esc(ctx, lbl(ctx, t.name))} ${ctx.t("a terra", "on the ground")}${t.targetId ? ` · ${ctx.t("vicino a", "near")} ${esc(ctx, actorName(ctx, t.targetId))}` : ""}</li>`,
    );
  for (const e of (D.sliceOf(s)?.effects ?? []).filter(
    (row) => D.helpActive(s, row) && (row.enemyId === actorId || row.allyId === actorId),
  ))
    rows.push(
      `<li>${glyph(ctx, "help")} ${e.kind === "help-attack" ? ctx.t(`Distratto da ${actorName(ctx, e.helperId)}: il prossimo attacco di un alleato ha vantaggio`, `Distracted by ${actorName(ctx, e.helperId)}: an ally’s next attack has Advantage`) : ctx.t(`Aiuto di ${actorName(ctx, e.helperId)}: vantaggio alla prossima prova di ${lbl(ctx, D.skillName(e.skill))}`, `${actorName(ctx, e.helperId)}’s Help: Advantage on the next ${lbl(ctx, D.skillName(e.skill))} check`)}</li>`,
    );
  for (const mark of D.masteryMarks(s, actorId))
    rows.push(
      `<li data-sm-mastery-mark="${mark.property}">${ctx.icon("sword")} ${esc(ctx, lbl(ctx, mark.name))}${mark.by ? ` · ${esc(ctx, actorName(ctx, mark.by))}` : ""} ${sourceLink(ctx, D.SOURCES.mastery)}</li>`,
    );
  const learned = D.learnedFor(s, ctx.role).filter((row) => row.actorId === actorId);
  for (const row of learned)
    rows.push(`<li>${ctx.icon("book")} ${esc(ctx, lbl(ctx, row.lore.text))}</li>`);
  const judgements = (D.sliceOf(s)?.judgements ?? [])
    .filter(
      (j) => j.actorId === actorId && j.outcome && (control || runsSession(ctx.state, ctx.role)),
    )
    .slice(-2);
  for (const j of judgements)
    rows.push(
      `<li>${ctx.icon("chat")} ${esc(ctx, actorName(ctx, j.targetId))}: ${esc(ctx, lbl(ctx, j.outcome))}${runsSession(ctx.state, ctx.role) && j.status === "failed" && !j.cleared ? ` <button type="button" class="button quiet" data-sm-retry="${esc(ctx, j.id)}">${ctx.t("Consenti di riprovare", "Allow a new attempt")}</button>` : ""}</li>`,
    );
  // The attitude of a monster or NPC toward the party is the DM's (Influence, SRD).
  if (runsSession(ctx.state, ctx.role) && actor.kind !== "character") {
    const attitude = D.sliceOf(s)?.attitudes?.[actorId] ?? "indifferent";
    rows.push(
      `<li><label class="field sm-attitude">${ctx.t("Atteggiamento per Influenzare (solo DM)", "Attitude for Influence (DM only)")}<select data-sm-attitude="${esc(ctx, actorId)}">${D.ATTITUDES.map((id) => `<option value="${id}" ${id === attitude ? "selected" : ""}>${esc(ctx, lbl(ctx, D.ATTITUDE_NAMES[id]))}</option>`).join("")}</select></label></li>`,
    );
  }
  return rows.length
    ? `<ul class="sm-list sm-status" aria-label="${ctx.t("Stato speciale", "Special status")}">${rows.join("")}</ul>`
    : "";
}
function historyBlock(ctx, actorId) {
  const s = ctx.state;
  const scope = s.combat?.active ? "turn" : "all";
  const rows = D.movementHistory(s, actorId, { scope }).slice(-6);
  const last = D.lastMove(s, actorId);
  if (!rows.length && !last) return "";
  const line = (row) =>
    `<li>${esc(ctx, lbl(ctx, D.moveName(row.kind)))}${row.meters ? ` · ${num(ctx, row.meters, 1)} m` : ""}${row.cost ? ` · ${ctx.t("costo", "cost")} ${num(ctx, row.cost, 1)} m` : ""}${row.outcome ? ` · <span class="muted">${esc(ctx, lbl(ctx, row.outcome))}</span>` : ""}</li>`;
  return `<details class="sm-history"${rows.length ? " open" : ""}><summary>${s.combat?.active ? ctx.t("Movimenti di questo turno", "Moves this turn") : ctx.t("Movimenti recenti", "Recent moves")} (${rows.length})</summary><ol class="sm-list">${rows.map(line).join("")}</ol><div class="toolbar"><button type="button" class="button quiet" data-sm-last aria-pressed="${ui.lastMove}">${glyph(ctx, "history")} ${ctx.t("Mostra l’ultima mossa", "Show the last move")}</button>${runsSession(ctx.state, ctx.role) ? `<button type="button" class="button quiet" data-sm-clear-history>${ctx.t("Azzera storico dei movimenti", "Clear movement histories")}</button>` : ""}</div></details>`;
}
function rulerBlock(ctx, actorId) {
  const tiers = D.rangeTiers(ctx.state, actorId);
  return `<section class="sm-ruler-info" aria-label="${ctx.t("Righello a due livelli", "Two-tier ruler")}"><h4>${glyph(ctx, "jump")} ${ctx.t("Righello a due livelli", "Two-tier ruler")}</h4><p><span class="sm-swatch sm-tier-normal"></span> ${ctx.t("Blu: con il movimento rimasto", "Blue: with the movement left")} ${num(ctx, tiers.base, 1)} m</p><p><span class="sm-swatch sm-tier-dash"></span> ${ctx.t("Giallo: con lo Scatto", "Yellow: with a Dash")} ${num(ctx, tiers.dash, 1)} m${tiers.dashAvailable ? "" : ctx.t(" (azione già spesa)", " (action already spent)")}</p><p><span class="sm-swatch sm-tier-beyond"></span> ${ctx.t("Rosso: fuori portata in questo turno", "Red: out of reach this turn")}</p><p class="muted">${ctx.t("Clic fissa la misura, Esc la toglie. Regola della scena", "Click pins the measure, Escape clears it. Scene rule")}: ${esc(ctx, lbl(ctx, D.RULE_NAMES[D.ruleOf(D.sceneOf(ctx.state))]))}</p></section>`;
}
function rulesBlock(ctx) {
  const s = ctx.state;
  const slice = D.sliceOf(s);
  const scene = D.sceneOf(s);
  const mode = slice?.settings?.approval ?? "free";
  const option = (value, it, en) =>
    `<label><input type="radio" name="sm-approval" value="${value}" data-sm-approval ${mode === value ? "checked" : ""}> ${ctx.t(it, en)}</label>`;
  const rule = D.ruleOf(scene);
  const sel = selected(ctx, null);
  return `<section class="sm-rules" aria-label="${ctx.t("Regole di movimento della mappa", "Map movement rules")}"><h4>${ctx.t("Movimento sulla mappa", "Movement on the map")}</h4><fieldset class="sm-choice"><legend>${ctx.t("Movimento dei giocatori", "Players’ movement")}</legend>${option("free", "Libero", "Free")}${option("out-of-turn", "Fuori turno su approvazione (Not Your Turn)", "Out of turn needs approval (Not Your Turn)")}${option("all", "Sempre su approvazione (blocco pedine)", "Always needs approval (token locking)")}</fieldset><label class="field">${ctx.t("Distanze e griglia di questa scena", "Distances and grid of this scene")}<select data-sm-rule>${Object.keys(
    D.RULE_NAMES,
  )
    .map(
      (id) =>
        `<option value="${id}" ${rule === id ? "selected" : ""}>${esc(ctx, lbl(ctx, D.RULE_NAMES[id]))}</option>`,
    )
    .join(
      "",
    )}</select></label><p class="muted">${sourceLink(ctx, D.RULE_SOURCES[rule])}</p><p><button type="button" class="button quiet" data-sm-grid-settings="${esc(ctx, scene?.id ?? "")}">${ctx.t("Griglia e misure della scena…", "Scene grid and measurements…")}</button></p>${pendingBlock(ctx) ? "" : `<p class="muted">${ctx.t("Nessuna proposta in attesa.", "No pending proposal.")}</p>`}<div class="toolbar"><button type="button" class="button quiet" data-sm-clear-history>${ctx.t("Azzera storico dei movimenti", "Clear movement histories")}</button></div><details class="sm-dm-tools"><summary>${ctx.t("Volo concesso e cavalcature", "Granted flight and mounts")}</summary><form class="sm-flight" data-sm-flight><label class="field">${ctx.t("Creatura", "Creature")}<select name="actorId">${Object.values(
    s.actors,
  )
    .filter((a) => D.tokenOf(s, a.id))
    .map(
      (a) =>
        `<option value="${esc(ctx, a.id)}" ${a.id === sel ? "selected" : ""}>${esc(ctx, a.name)}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">${ctx.t("Velocità di volo (m)", "Fly Speed (m)")}<input name="speed" type="number" min="0.3" max="60" step="0.3" value="18" inputmode="decimal"></label><label class="field">${ctx.t("Da dove viene", "Where it comes from")}<input name="label" maxlength="80" value="${ctx.t("Incantesimo Volare", "Fly spell")}"></label><label class="prep-check"><input type="checkbox" name="hover"> ${ctx.t("Può fluttuare", "Can hover")}</label><div class="toolbar"><button type="submit" class="button">${ctx.t("Concedi il volo", "Grant flight")}</button><button type="button" class="button quiet" data-sm-revoke>${ctx.t("Togli il volo", "Remove flight")}</button></div></form><div class="toolbar"><button type="button" class="button" data-sm-summon>${glyph(ctx, "mount")} ${ctx.t("Porta un cavallo da galoppo (SRD) vicino alla selezione", "Bring a Riding Horse (SRD) next to the selection")}</button></div></details></section>`;
}
export function renderInspector(ctx, tableView) {
  const actorId = selected(ctx, tableView);
  const parts = [];
  if (tableView?.mode === RULER && actorId) parts.push(rulerBlock(ctx, actorId));
  if (ui.result)
    parts.push(
      `<p class="sm-result${ui.result.error ? " sm-bad" : ""}" role="status">${esc(ctx, ui.result.text)}${!ui.result.error && ui.result.label && ctx.undoLabel?.() === ui.result.label ? ` <button type="button" class="button quiet" data-sm-undo>${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}</button>` : ""}</p>`,
    );
  parts.push(pendingBlock(ctx));
  if (actorId) parts.push(statusBlock(ctx, actorId));
  if (actorId && (ctx.canControl(ctx.state.actors[actorId]) || runsSession(ctx.state, ctx.role)))
    parts.push(historyBlock(ctx, actorId));
  const html = parts.filter(Boolean).join("");
  return html
    ? `<div class="sm-panel">${html}</div>`
    : `<div class="sm-panel"><p class="muted">${ctx.t("Nessuna mossa speciale in corso. Apri «Mosse» nella barra delle azioni.", "No special move under way. Open “Moves” in the action bar.")}</p></div>`;
}
export function bindInspector(el, ctx, table) {
  const rerender = () => ctx.render();
  const on = (selector, fn, type = "click") =>
    el
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener(type, (event) => fn(node, event)));
  on("[data-sm-cancel]", () => disarm(ctx));
  on("[data-sm-expand]", () => {
    ui.expanded = !ui.expanded;
    rerender();
  });
  on("[data-sm-execute]", (node) => {
    if (node.getAttribute("aria-disabled") === "true") {
      const p = armedPreview(ctx);
      const text = lbl(ctx, blocking(p?.reasons)[0] ?? p?.reasons?.[0] ?? "");
      ctx.toast(text, true);
      return;
    }
    executeArmed(ctx);
  });
  on("[data-sm-target]", (node) => {
    ui.armed.targetId = node.dataset.smTarget;
    rerender();
  });
  on("[data-sm-object]", (node) => {
    ui.armed.featureId = node.dataset.smObject;
    rerender();
  });
  on(
    "[data-sm-effect]",
    (node) => {
      ui.armed.effect = node.value;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-controlled]",
    (node) => {
      ui.armed.controlled = node.value !== "independent";
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-help]",
    (node) => {
      ui.armed.mode = node.value;
      ui.armed.targetId = null;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-runup]",
    (node) => {
      ui.armed.runUp = node.checked;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-dive]",
    (node) => {
      ui.armed.dive = node.checked;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-skill]",
    (node) => {
      ui.armed.skill = node.value;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-feature]",
    (node) => {
      ui.armed.featureId = node.value;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-subject]",
    (node) => {
      const [kind, ...rest] = node.value.split(":");
      ui.armed.subject = node.value ? { kind, id: rest.join(":") } : null;
      const subject = D.studySubjects(ctx.state, ui.armed.actorId, ctx.role).find(
        (row) => row.kind === kind && row.id === rest.join(":"),
      );
      if (subject && !ui.armed.skill) ui.armed.skill = subject.suggested;
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-height]",
    (node) => {
      ui.armed.height = Number(node.value);
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-altitude]",
    (node) => {
      ui.armed.altitude = Number(node.value);
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-fall-height]",
    (node) => {
      ui.armed.meters = Math.max(0, Number(node.value) || 0);
      rerender();
    },
    "change",
  );
  on(
    "[data-sm-urge]",
    (node) => {
      ui.armed.urge = node.value;
    },
    "input",
  );
  on("[data-sm-urge]", () => rerender(), "change");
  on("[data-sm-throw]", (node) => {
    if (node.getAttribute("aria-disabled") === "true") {
      ctx.toast(
        node.parentElement?.querySelector(".sm-why")?.textContent ??
          ctx.t("Non disponibile.", "Unavailable."),
        true,
      );
      return;
    }
    throwWith(ctx, ui.armed.actorId, node.dataset.smThrow);
  });
  on("[data-sm-recover]", (node) => {
    const actorId = ui.armed.actorId;
    if (node.getAttribute("aria-disabled") === "true") {
      const p = D.previewRecover(
        ctx.state,
        { actorId, thrownId: node.dataset.smRecover },
        ctx.role,
      );
      ctx.toast(lbl(ctx, p.reasons[0]), true);
      return;
    }
    ui.armed = null;
    act(
      ctx,
      L(
        `${actorName(ctx, actorId)} raccoglie l’arma`,
        `${actorName(ctx, actorId)} picks up the weapon`,
      ),
      (d) => D.commitRecover(d, { actorId, thrownId: node.dataset.smRecover }, ctx.role),
    );
  });
  on("[data-sm-roll]", (node) => openRoll(ctx, node.dataset.smRoll, node.dataset.smRequest));
  on("[data-sm-save]", (node) =>
    act(ctx, L("Tiro salvezza scelto", "Saving throw chosen"), (d) =>
      D.chooseSaveAbility(
        d,
        { attemptId: node.dataset.smSave, ability: node.dataset.smAbility },
        ctx.role,
      ),
    ),
  );
  on("[data-sm-judge]", (node) => judge(ctx, node.dataset.smJudge, node.dataset.smDecision));
  on("[data-sm-retry]", (node) =>
    act(ctx, L("Il DM consente di riprovare", "The DM allows a new attempt"), (d) =>
      D.commitAllowRetry(d, { judgementId: node.dataset.smRetry }, ctx.role),
    ),
  );
  on(
    "[data-sm-attitude]",
    (node) =>
      act(
        ctx,
        L(
          `Atteggiamento di ${actorName(ctx, node.dataset.smAttitude)}`,
          `${actorName(ctx, node.dataset.smAttitude)}’s attitude`,
        ),
        (d) =>
          D.commitAttitude(d, { actorId: node.dataset.smAttitude, attitude: node.value }, ctx.role),
        // The DM's knowledge: the shared log does not show this label to players.
        { options: { visibility: "private" } },
      ),
    "change",
  );
  on("[data-sm-decide]", (node) => decide(ctx, node.dataset.smDecide, node.dataset.smDecision));
  on("[data-sm-approve-all]", () => {
    for (const p of D.pendingProposals(ctx.state)) decide(ctx, p.id, "approve");
  });
  on("[data-sm-release]", (node) =>
    act(ctx, L("Presa lasciata", "Grapple released"), (d) =>
      D.commitRelease(d, { grappleId: node.dataset.smRelease }, ctx.role, op()),
    ),
  );
  on("[data-sm-drop]", (node) => {
    const actorId = node.dataset.smDrop;
    const attempt = act(
      ctx,
      L(`${actorName(ctx, actorId)} cade`, `${actorName(ctx, actorId)} falls`),
      (d) => D.commitFall(d, { actorId }, ctx.role, op()),
      RESULT(() => L("Caduta: tira i danni", "Fall: roll the damage")),
    );
    if (attempt?.requests) followAttempt(ctx, attempt);
  });
  on("[data-sm-last]", () => {
    ui.lastMove = !ui.lastMove;
    rerender();
  });
  on("[data-sm-clear-history]", () =>
    act(ctx, L("Storico dei movimenti azzerato", "Movement histories cleared"), (d) =>
      D.clearHistories(d, ctx.role),
    ),
  );
  on("[data-sm-undo]", () => {
    ui.result = null;
    ctx.undo();
  });
  on(
    "[data-sm-approval]",
    (node) =>
      act(ctx, L("Modalità della mappa cambiata", "Map mode changed"), (d) =>
        D.commitApprovalMode(d, { mode: node.value }, ctx.role),
      ),
    "change",
  );
  on(
    "[data-sm-rule]",
    (node) =>
      act(ctx, L("Regola delle distanze cambiata", "Distance rule changed"), (d) =>
        D.commitSceneRule(d, { rule: node.value }, ctx.role),
      ),
    "change",
  );
  // P6 TV-10: pixels and metres per cell live in the scene editor («Griglia e misure»).
  on("[data-sm-grid-settings]", (node) =>
    ctx.navigate("preparation", { id: node.dataset.smGridSettings, tab: "edit" }),
  );
  on("[data-sm-summon]", () =>
    act(ctx, L("Cavallo da galoppo portato in scena", "Riding Horse brought on the scene"), (d) =>
      D.commitSummonMount(d, { nearActorId: table?.selectedActorId }, ctx.role),
    ),
  );
  el.querySelector("[data-sm-flight]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    act(ctx, L("Volo concesso", "Flight granted"), (d) =>
      D.commitGrantFlight(
        d,
        {
          actorId: data.get("actorId"),
          speed: Number(data.get("speed")),
          label: data.get("label"),
          hover: data.get("hover") === "on",
        },
        ctx.role,
      ),
    );
  });
  on("[data-sm-revoke]", (node) => {
    const form = node.closest("form");
    const actorId = form?.querySelector("[name=actorId]")?.value;
    act(ctx, L("Volo tolto", "Flight removed"), (d) =>
      D.commitGrantFlight(d, { actorId, revoke: true }, ctx.role),
    );
  });
}
const DECISIONS = {
  willing: L("disposta", "willing"),
  hesitant: L("esitante", "hesitant"),
  unwilling: L("contraria", "unwilling"),
};
function judge(ctx, judgementId, decision) {
  const word = DECISIONS[decision] ?? L(decision, decision);
  const attempt = act(
    ctx,
    L(`Il DM decide: ${word.it}`, `The DM decides: ${word.en}`),
    (d) => D.commitJudge(d, { judgementId, decision }, ctx.role, op()),
    RESULT(
      (j) =>
        j?.outcome ??
        L("Prova di Influenza richiesta al giocatore", "Influence check requested from the player"),
    ),
  );
  return attempt;
}
function decide(ctx, proposalId, decision) {
  return act(
    ctx,
    decision === "approve"
      ? L("Movimento approvato dal DM", "Move approved by the DM")
      : decision === "withdraw"
        ? L("Proposta ritirata", "Proposal withdrawn")
        : L("Movimento annullato dal DM", "Move cancelled by the DM"),
    (d) => D.commitDecide(d, { proposalId, decision }, ctx.role, op()),
  );
}

// ---------------------------------------------------------------- map layers

const f1 = (value) => Math.round(value * 10) / 10;
function groundLayer(ctx, tableView) {
  const s = ctx.state;
  const scene = tableView?.scene ?? D.sceneOf(s);
  if (!scene) return "";
  const parts = [];
  if (scene.gridShape === "hex")
    parts.push(
      `<path class="sm-hex" d="${D.hexGridPath(scene)}" fill="none" stroke="#d9c79c" stroke-opacity=".22" stroke-width="1"/>`,
    );
  const armed = ui.armed;
  const reveal = ui.reveal || ui.sticky;
  for (const f of D.featuresOf(s, scene.id)) {
    const secret = f.secret && !f.revealed;
    if (secret && !runsSession(ctx.state, ctx.role)) continue;
    if (f.kind === "water" && !f.drained && (reveal || armed?.kind === "swim"))
      parts.push(
        `<circle cx="${f.x}" cy="${f.y}" r="${f.r}" class="sm-water" fill="#5aa3c8" fill-opacity=".18" stroke="#8fd0f0" stroke-width="2" stroke-dasharray="6 5"/>`,
      );
    if (f.kind === "climb" && (reveal || armed?.kind === "climb"))
      parts.push(
        `<path d="M${f.a.x} ${f.a.y}L${f.b.x} ${f.b.y}" class="sm-climbable" stroke="#e2c17b" stroke-width="6" stroke-opacity=".75" stroke-dasharray="3 7" stroke-linecap="round"/>`,
      );
    if (f.kind === "object")
      parts.push(
        `<g class="sm-object${secret ? " is-secret" : ""}" data-sm-spot="${esc(ctx, f.id)}" transform="translate(${f.x} ${f.y})"><circle r="9" fill="${secret ? "none" : "#2a3c49"}" stroke="#e2c17b" stroke-width="2" ${secret ? 'stroke-dasharray="3 3"' : ""}/><path d="M-4 0h8M0 -4v8" stroke="#e2c17b" stroke-width="1.6"/><title>${esc(ctx, lbl(ctx, f.name))}${secret ? " · " + ctx.t("segreto (solo DM)", "secret (DM only)") : ""}</title></g>`,
      );
  }
  for (const t of (D.sliceOf(s)?.thrown ?? []).filter(
    (row) => !row.recovered && row.sceneId === scene.id,
  ))
    parts.push(
      `<g class="sm-thrown" transform="translate(${t.x} ${t.y})"><circle r="8" fill="#142733" stroke="#e2c17b" stroke-width="1.5"/><path d="M-3 3l6-6M1 -5l4 4" stroke="#f4e4bf" stroke-width="1.6"/><title>${esc(ctx, lbl(ctx, t.name))} · ${ctx.t("a terra", "on the ground")}</title></g>`,
    );
  // Foundry/Drag Ruler faded path of this turn's moves, for the selected creature.
  const actorId = tableView?.selectedActorId;
  if (actorId && ctx.state.combat?.active) {
    for (const row of D.movementHistory(s, actorId, { scope: "turn" }))
      parts.push(
        `<path d="M${row.path.map((p) => f1(p.x) + " " + f1(p.y)).join("L")}" class="sm-trail" fill="none" stroke="#e2c17b" stroke-opacity=".45" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>`,
      );
  }
  if (ui.lastMove && actorId) {
    const last = D.lastMove(s, actorId);
    if (last) {
      const end = last.path.at(-1);
      parts.push(
        `<g class="sm-last-move" data-sm-last-move><path d="M${last.path.map((p) => f1(p.x) + " " + f1(p.y)).join("L")}" fill="none" stroke="#9ecbff" stroke-width="4" stroke-linecap="round" marker-end="url(#sm-arrow)"/><text x="${f1(end.x)}" y="${f1(end.y - 30)}" text-anchor="middle" class="sm-map-text">${esc(ctx, lbl(ctx, D.moveName(last.kind)))}${last.meters ? " · " + num(ctx, last.meters, 1) + " m" : ""}</text></g>`,
      );
    }
  }
  // Proposals waiting for the DM (Fantasy Grounds planned paths): the DM sees all, a player
  // their own creatures'.
  for (const p of D.pendingProposals(s)) {
    if (!runsSession(ctx.state, ctx.role) && !ctx.canControl(s.actors[p.actorId])) continue;
    const pts = [p.from, ...p.points];
    const end = pts.at(-1);
    parts.push(
      `<g class="sm-proposal" data-sm-proposal="${esc(ctx, p.id)}"><path d="M${pts.map((q) => f1(q.x) + " " + f1(q.y)).join("L")}" fill="none" stroke="#c7a2ff" stroke-width="3" stroke-dasharray="8 6"/><circle cx="${f1(end.x)}" cy="${f1(end.y)}" r="22" fill="#c7a2ff" fill-opacity=".18" stroke="#c7a2ff" stroke-width="2" stroke-dasharray="4 4"/><text x="${f1(end.x)}" y="${f1(end.y - 30)}" text-anchor="middle" class="sm-map-text">${esc(ctx, actorName(ctx, p.actorId))} · ${ctx.t("in attesa del DM", "waiting for the DM")}</text></g>`,
    );
  }
  // XCOM two-tier outline while the ruler is active.
  if (tableView?.mode === RULER && actorId) {
    const token = D.tokenOf(s, actorId);
    if (token) {
      const tiers = D.rangeTiers(s, actorId);
      const crawling = false;
      const dash = D.reachPolygon(scene, token, tiers.dash, { crawling, role: ctx.role });
      const base = D.reachPolygon(scene, token, tiers.base, { crawling, role: ctx.role });
      const poly = (points) => points.map((q) => f1(q.x) + "," + f1(q.y)).join(" ");
      if (dash.length)
        parts.push(
          `<polygon class="sm-tier-dash" data-sm-tier="dash" points="${poly(dash)}" fill="#e8c65a" fill-opacity=".07" stroke="#e8c65a" stroke-width="2.5"/>`,
        );
      if (base.length)
        parts.push(
          `<polygon class="sm-tier-normal" data-sm-tier="normal" points="${poly(base)}" fill="#6fb6ff" fill-opacity=".1" stroke="#6fb6ff" stroke-width="2.5"/>`,
        );
    }
  }
  return `<defs><marker id="sm-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#9ecbff"/></marker></defs>${parts.join("")}`;
}
// Preview graphics of the armed move (BG3 arcs, trajectories and red when blocked).
function previewGraphics(ctx) {
  const a = ui.armed;
  if (!a) return "";
  const s = ctx.state;
  const token = D.tokenOf(s, a.actorId);
  if (!token) return "";
  const p = armedPreview(ctx);
  const ok = p?.available;
  const color = ok ? "#9fe0a0" : "#f29b99";
  const parts = [];
  if (a.kind === "long-jump") {
    const scene = D.sceneOf(s);
    const reach = (p?.profile?.long ?? 0) * (scene.gridSize / scene.metersPerCell);
    parts.push(
      `<circle cx="${token.x}" cy="${token.y}" r="${f1(reach)}" fill="none" stroke="#e2c17b" stroke-opacity=".6" stroke-width="2" stroke-dasharray="5 5"/>`,
    );
    if (a.aim) {
      const mx = (token.x + a.aim.x) / 2,
        my =
          (token.y + a.aim.y) / 2 -
          Math.max(30, Math.hypot(a.aim.x - token.x, a.aim.y - token.y) / 3);
      parts.push(
        `<path d="M${token.x} ${token.y}Q${f1(mx)} ${f1(my)} ${f1(a.aim.x)} ${f1(a.aim.y)}" data-sm-arc fill="none" stroke="${color}" stroke-width="3.5" stroke-dasharray="${ok ? "" : "7 5"}"/><circle cx="${f1(a.aim.x)}" cy="${f1(a.aim.y)}" r="22" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="2"/>`,
      );
      if (p?.distance !== undefined)
        parts.push(
          `<text x="${f1(a.aim.x)}" y="${f1(a.aim.y - 30)}" text-anchor="middle" class="sm-map-text">${num(ctx, p.distance, 1)} m${p.landingCheck ? " · " + ctx.t("CD 10", "DC 10") : ""}</text>`,
        );
    }
  }
  if (["swim", "drag", "ride"].includes(a.kind) && a.aim && p?.path) {
    for (const seg of p.path.segments ?? [])
      parts.push(
        `<path d="M${f1(seg.from.x)} ${f1(seg.from.y)}L${f1(seg.to.x)} ${f1(seg.to.y)}" stroke="${ok ? "#8fd0f0" : "#f29b99"}" stroke-width="4" fill="none"/>`,
      );
    parts.push(
      `<circle cx="${f1(a.aim.x)}" cy="${f1(a.aim.y)}" r="22" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-width="2"/><text x="${f1(a.aim.x)}" y="${f1(a.aim.y - 30)}" text-anchor="middle" class="sm-map-text">${num(ctx, p.cost ?? 0, 1)} m</text>`,
    );
    if (a.kind === "drag" && p.behind)
      parts.push(
        `<circle cx="${p.behind.x}" cy="${p.behind.y}" r="18" fill="none" stroke="${color}" stroke-dasharray="4 4"/>`,
      );
  }
  if (a.kind === "fly" && p?.to) {
    parts.push(
      `<path d="M${token.x} ${token.y}L${f1(p.to.x)} ${f1(p.to.y)}" stroke="${color}" stroke-width="3" stroke-dasharray="10 6" fill="none"/><text x="${f1(p.to.x)}" y="${f1(p.to.y - 30)}" text-anchor="middle" class="sm-map-text">↑ ${num(ctx, p.to.altitude, 1)} m · ${num(ctx, p.cost, 1)} m</text>`,
    );
  }
  if (["grapple", "shove", "help", "influence", "mount"].includes(a.kind) && a.targetId) {
    const t = D.tokenOf(s, a.targetId);
    if (t)
      parts.push(
        `<circle cx="${t.x}" cy="${t.y}" r="32" fill="none" stroke="${color}" stroke-width="4"/>`,
      );
    if (a.kind === "shove" && p?.push && a.effect !== "prone") {
      const c = p.push.blocked ? "#f29b99" : "#9fe0a0";
      parts.push(
        `<path d="M${p.push.from.x} ${p.push.from.y}L${p.push.landing.x} ${p.push.landing.y}" data-sm-push stroke="${c}" stroke-width="4" marker-end="url(#sm-arrow)" fill="none"/><circle cx="${p.push.landing.x}" cy="${p.push.landing.y}" r="22" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4 4"/>`,
      );
    }
  }
  if (a.kind === "climb" && p?.feature) {
    const f = p.feature;
    parts.push(
      `<path d="M${f.a.x} ${f.a.y}L${f.b.x} ${f.b.y}" stroke="${color}" stroke-width="7" stroke-opacity=".7" fill="none"/><text x="${token.x}" y="${token.y - 36}" text-anchor="middle" class="sm-map-text">↑ ${num(ctx, p.height ?? 0, 1)} m · ${num(ctx, p.cost ?? 0, 1)} m</text>`,
    );
  }
  return parts.join("");
}
// Thrown weapon range rings while the core attack preview of a throw is on (BG3 range).
function throwRings(ctx, actorId) {
  const s = ctx.state;
  const token = D.tokenOf(s, actorId);
  const chosen = globalThis.document?.querySelector(
    '#content .combat-action.active[data-combat-action^="special-moves.throw."]',
  );
  if (!token || !chosen || !hasCombatPreview(ctx, actorId)) return "";
  const itemId = chosen.dataset.combatAction.slice("special-moves.throw.".length);
  const row = D.throwMenu(s, actorId).find((m) => m.itemId === itemId);
  if (!row?.range) return "";
  const scene = D.sceneOf(s);
  const ppm = scene.gridSize / scene.metersPerCell;
  return `<g class="sm-throw-rings" data-sm-throw-rings><circle cx="${token.x}" cy="${token.y}" r="${f1(row.range.normal * ppm)}" fill="none" stroke="#9fe0a0" stroke-width="2.5"/><circle cx="${token.x}" cy="${token.y}" r="${f1(row.range.long * ppm)}" fill="none" stroke="#e8c65a" stroke-width="2.5" stroke-dasharray="10 7"/><text x="${token.x}" y="${f1(token.y - row.range.normal * ppm - 6)}" text-anchor="middle" class="sm-map-text">${num(ctx, row.range.normal)} m</text><text x="${token.x}" y="${f1(token.y - row.range.long * ppm - 6)}" text-anchor="middle" class="sm-map-text">${num(ctx, row.range.long)} m · ${ctx.t("svantaggio", "Disadvantage")}</text></g>`;
}
function labelsGroup(ctx, tableView) {
  const s = ctx.state;
  const scene = tableView?.scene ?? D.sceneOf(s);
  if (!scene) return "";
  const out = [];
  for (const t of scene.tokens ?? []) {
    if (!D.observes(s, t.actorId, ctx.role, scene)) continue;
    const a = s.actors[t.actorId];
    const own = ctx.canControl(a);
    const extra = own ? ` · ${a.hp}/${a.maxHp} ${ctx.t("PF", "HP")}` : "";
    const z = D.altitudeOf(s, t.actorId);
    out.push(
      `<text x="${t.x}" y="${f1(t.y - 34)}" text-anchor="middle" class="sm-map-text sm-label">${esc(ctx, a.name)}${extra}${z ? ` · ↑${num(ctx, z, 1)} m` : ""}</text>`,
    );
  }
  for (const f of D.featuresOf(s, scene.id)) {
    if (f.secret && !f.revealed && !runsSession(ctx.state, ctx.role)) continue;
    const x = f.kind === "climb" ? (f.a.x + f.b.x) / 2 : f.x;
    const y = f.kind === "climb" ? (f.a.y + f.b.y) / 2 : f.y + (f.r ?? 0) + 16;
    out.push(
      `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" class="sm-map-text sm-label sm-feature-label">${esc(ctx, lbl(ctx, f.name))}${f.kind === "climb" ? " · " + num(ctx, f.height) + " m" : ""}${f.kind === "water" && f.drained ? " · " + ctx.t("vuota", "drained") : ""}${f.secret && !f.revealed ? " · " + ctx.t("segreto", "secret") : ""}</text>`,
    );
  }
  for (const t of (D.sliceOf(s)?.thrown ?? []).filter(
    (row) => !row.recovered && row.sceneId === scene.id,
  ))
    out.push(
      `<text x="${t.x}" y="${f1(t.y + 22)}" text-anchor="middle" class="sm-map-text sm-label">${esc(ctx, lbl(ctx, t.name))}</text>`,
    );
  for (const w of scene.walls ?? [])
    if (w.kind === "door" && (!w.secret || runsSession(ctx.state, ctx.role)))
      out.push(
        `<text x="${f1((w.a.x + w.b.x) / 2)}" y="${f1((w.a.y + w.b.y) / 2 - 10)}" text-anchor="middle" class="sm-map-text sm-label">${ctx.t("Porta", "Door")} · ${esc(ctx, { open: ctx.t("aperta", "open"), closed: ctx.t("chiusa", "closed"), locked: ctx.t("chiusa a chiave", "locked") }[w.doorState] ?? "")}</text>`,
      );
  const rings = (scene.tokens ?? [])
    .filter(
      (t) => D.observes(s, t.actorId, ctx.role, scene) && s.actors[t.actorId]?.kind === "character",
    )
    .map(
      (t) =>
        `<circle cx="${t.x}" cy="${t.y}" r="31" fill="none" stroke="#9ecbff" stroke-width="4" stroke-opacity=".9"/>`,
    )
    .join("");
  const on = ui.reveal || ui.sticky;
  return `<g class="sm-labels" data-sm-labels-layer${on ? " data-on" : ""} aria-hidden="true">${out.join("")}</g><g class="sm-highlight" data-sm-highlight${ui.highlight ? " data-on" : ""} aria-hidden="true">${rings}</g>`;
}
function topLayer(ctx, tableView) {
  const s = ctx.state;
  const scene = tableView?.scene ?? D.sceneOf(s);
  if (!scene) return "";
  const armed = ui.armed && ["point", "target"].includes(moveDef(ui.armed.kind)?.needs);
  const capture = armed
    ? // Wider than the scene: the map's letterbox around it is covered too.
      `<rect data-sm-capture x="${-scene.width}" y="${-scene.height}" width="${scene.width * 3}" height="${scene.height * 3}" fill="transparent" style="cursor:crosshair" aria-hidden="true"/>`
    : "";
  const falling = (scene.tokens ?? [])
    .filter((t) => D.observes(s, t.actorId, ctx.role, scene) && D.fallingState(s, t.actorId))
    .map(
      (t) =>
        `<g class="sm-falling" transform="translate(${t.x} ${f1(t.y + 36)})"><rect x="-38" y="-10" width="76" height="18" rx="9" fill="#5b1f22" stroke="#e2c17b"/><text y="4" text-anchor="middle" class="sm-map-text">${ctx.t("In caduta", "Falling")}</text></g>`,
    )
    .join("");
  return `${capture}<g data-sm-preview pointer-events="none">${previewGraphics(ctx)}</g><g data-sm-live pointer-events="none"></g><g data-sm-rings pointer-events="none"></g>${falling}${labelsGroup(ctx, tableView)}`;
}
function tokenAt(ctx, scene, point) {
  let best = null;
  for (const t of scene.tokens ?? []) {
    if (!D.observes(ctx.state, t.actorId, ctx.role, scene)) continue;
    const d = Math.hypot(t.x - point.x, t.y - point.y);
    if (d <= 30 && (!best || d < best.d)) best = { d, id: t.actorId };
  }
  return best?.id ?? null;
}
function refreshPreview(el, ctx) {
  const g = el.querySelector("[data-sm-preview]");
  if (g) g.innerHTML = previewGraphics(ctx);
  const card = document.querySelector("#content [data-sm-card]");
  if (card && ui.armed) {
    const html = armedCard(ctx);
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const next = holder.firstElementChild;
    if (next) {
      card.replaceWith(next);
      bindInspector(next, ctx, lastTable);
    }
  }
}
let lastTable = null;
let rootListener = null;
/** Map layer bind: targeting of the armed move, and the approval/swimming interception. */
export function bindTop(el, ctx, table) {
  lastTable = table;
  const svg = table?.svg;
  if (!svg) return;
  const scene = table.scene;
  const rings = el.querySelector("[data-sm-rings]");
  if (rings) rings.innerHTML = throwRings(ctx, table.selectedActorId);
  const capture = el.querySelector("[data-sm-capture]");
  if (capture) {
    capture.addEventListener("pointermove", (event) => {
      if (!ui.armed) return;
      const p = table.point(event);
      if (moveDef(ui.armed.kind).needs === "point") ui.armed.aim = { x: p.x, y: p.y };
      refreshPreview(el, ctx);
    });
    capture.addEventListener("click", (event) => {
      if (!ui.armed) return;
      event.preventDefault();
      const p = table.point(event);
      const needs = moveDef(ui.armed.kind).needs;
      if (needs === "point") {
        ui.armed.aim = { x: p.x, y: p.y };
        executeArmed(ctx);
        return;
      }
      const id = tokenAt(ctx, scene, p);
      if (!id) return;
      if (ui.armed.targetId === id && armedPreview(ctx)?.available) executeArmed(ctx);
      else {
        ui.armed.targetId = id;
        const ready = armedPreview(ctx)?.available && ["grapple", "shove"].includes(ui.armed.kind);
        if (ready) executeArmed(ctx);
        else ctx.render();
      }
    });
  }
  // Keyboard: arrows move the aim one cell, Enter executes, Escape cancels.
  svg.addEventListener(
    "keydown",
    (event) => {
      if (!ui.armed) return interceptKey(event, ctx, table);
      const needs = moveDef(ui.armed.kind)?.needs;
      if (event.key === "Escape") {
        disarm(ctx);
        return;
      }
      const step = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[
        event.key
      ];
      if (step && needs === "point") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const token = D.tokenOf(ctx.state, ui.armed.actorId);
        const from = ui.armed.aim ?? { x: token.x, y: token.y };
        ui.armed.aim = {
          x: from.x + step[0] * scene.gridSize,
          y: from.y + step[1] * scene.gridSize,
        };
        refreshPreview(el, ctx);
      }
      if (event.key === "Enter" && ["point", "none", "height"].includes(needs)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        executeArmed(ctx);
      }
    },
    true,
  );
  // Interception of the core Move (drag release, click, Enter) and of Plan's Execute:
  // a proposal when the DM requires approval (FVT-114, R20-168); swimming across water.
  let drag = null;
  ui.kb = null;
  svg.addEventListener(
    "pointerdown",
    (event) => {
      drag = null;
      if (ui.armed || table.mode !== "move" || event.button !== 0) return;
      if (coreClaimsMapInput(ctx, table)) return;
      // P6: the core drags any token you control (it selects it on the press); R3: also
      // the controlled mount you ride.
      const actorId = event.target.closest?.("[data-actor]")?.getAttribute("data-actor");
      if (actorId && canDragToken(ctx, actorId))
        drag = { actorId, x: event.clientX, y: event.clientY };
    },
    true,
  );
  svg.addEventListener(
    "pointerup",
    (event) => {
      const start = drag;
      drag = null;
      if (!start || ui.armed || table.mode !== "move") return;
      if (coreClaimsMapInput(ctx, table)) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;
      const point = table.point(event);
      // P6 TV-01: the swim or the proposal follows the same route around walls as the core.
      const route = plannedWaypoints(ctx.state, start.actorId, point, { role: ctx.role });
      if (intercept(ctx, start.actorId, point, route.waypoints)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  // P6 TV-01: a click on the empty map never moves (it clears the selection), so only a drag,
  // Enter after the arrows, and Plan's «Esegui percorso» are intercepted.
  const root = table.root;
  if (root) {
    if (rootListener) rootListener.root.removeEventListener("click", rootListener.fn, true);
    const fn = (event) => {
      const button = event.target.closest?.("[data-path-execute]");
      if (!button || ui.armed) return;
      const actorId = lastTable?.selectedActorId;
      const points = pathDraft(ctx, actorId);
      if (!actorId || !points.length) return;
      if (intercept(ctx, actorId, points.at(-1), points.slice(0, -1))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearPathDraft(ctx, actorId);
      }
    };
    root.addEventListener("click", fn, true);
    rootListener = { root, fn };
  }
}
// W2b1 integration: the core's own map modes come first, in table.mjs's order: an action
// preview being aimed (Burning Hands, a Dash destination) and a companion or familiar
// placement own the map input; only a plain Move is intercepted.
export function coreClaimsMapInput(ctx, table) {
  return hasCombatPreview(ctx, table?.selectedActorId) || mapPlacementActive();
}
// W2b1 integration: a Move released beyond the movement left stops where the movement runs
// out, as the core Move does (tracePath's budget); the water on the way still costs double.
function reachableSwim(s, actorId, point, waypoints, role) {
  const token = D.tokenOf(s, actorId);
  if (!token) return null;
  const pts = [{ x: token.x, y: token.y }, ...waypoints, point];
  const ends = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++)
    ends.push((total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)));
  const along = (distance) => {
    let i = ends.findIndex((end) => end >= distance);
    if (i < 0) i = ends.length - 1;
    const start = i ? ends[i - 1] : 0;
    const f =
      ends[i] > start ? Math.min(1, Math.max(0, (distance - start) / (ends[i] - start))) : 1;
    const [a, b] = [pts[i], pts[i + 1]];
    return {
      waypoints: pts.slice(1, i + 1),
      point: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
    };
  };
  let lo = 0;
  let hi = total;
  let best = null;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    const leg = along(mid);
    const p = D.previewSwim(s, { actorId, ...leg }, role);
    if (p.reasons.every((r) => r.code === "no-water")) {
      lo = mid;
      best = { ...leg, water: p.water ?? 0 };
    } else hi = mid;
  }
  return lo > 1 ? best : null;
}
function interceptKey(event, ctx, table) {
  if (table.mode !== "move" || coreClaimsMapInput(ctx, table)) return;
  // P6 TV-27: the arrows move the focused token you control, else the map's selection.
  const focused = event.target.closest?.("[data-actor]")?.getAttribute("data-actor");
  const actorId =
    focused && canDragToken(ctx, focused) ? focused : (table.mapSelection ?? table.selectedActorId);
  const scene = table.scene;
  const step = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[
    event.key
  ];
  const token = D.tokenOf(ctx.state, actorId);
  if (!token) return;
  if (step) {
    const from = ui.kb?.actorId === actorId ? ui.kb.point : { x: token.x, y: token.y };
    ui.kb = {
      actorId,
      point: { x: from.x + step[0] * scene.gridSize, y: from.y + step[1] * scene.gridSize },
    };
    return;
  }
  if (
    event.key === "Enter" &&
    ui.kb?.actorId === actorId &&
    !event.target.closest?.("[data-door]")
  ) {
    const point = ui.kb.point;
    const route = plannedWaypoints(ctx.state, actorId, point, { role: ctx.role });
    if (intercept(ctx, actorId, point, route.waypoints)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else ui.kb = null;
  }
  if (event.key === "Escape") ui.kb = null;
}
/**
 * R3 PG-79 (Foundry and Roll20 attached tokens): which ride a drag of this token is. The
 * rider's token always rides (the mount carries her). The mount's token rides when it is
 * controlled and either it is combat (it moves on the rider's turn) or the viewer does not
 * control the mount itself (a player dragging the horse she rides). Otherwise the mount's own
 * move runs and the rider follows in the follow-up.
 */
export function rideFor(ctx, actorId) {
  const s = ctx.state;
  const entry = D.mountOf(s, actorId);
  if (entry)
    return ctx.canControl(s.actors[actorId]) ? { riderId: actorId, mountId: entry.mountId } : null;
  const info = D.mountControl(s, actorId);
  if (!info?.controlled || !ctx.canControl(s.actors[info.riderId])) return null;
  if (s.combat?.active || !ctx.canControl(s.actors[actorId]))
    return { riderId: info.riderId, mountId: actorId };
  return null;
}
/** The mount this creature rides, or null (the Table draws a rider above its mount). */
export const ridesOn = (state, actorId) => D.mountOf(state, actorId)?.mountId ?? null;
/** A token the viewer may drag: one she controls, or the controlled mount she rides. */
export const canDragToken = (ctx, actorId) =>
  Boolean(ctx.canControl(ctx.state.actors[actorId]) || rideFor(ctx, actorId));
function rideTo(ctx, ride, point, waypoints) {
  const s = ctx.state;
  const input = { actorId: ride.riderId, point, waypoints };
  const p = D.previewRide(s, input, ctx.role);
  const name = actorName(ctx, ride.riderId);
  if (!p.available) {
    const reason = blocking(p.reasons)[0] ?? p.reasons[0];
    ui.result = { text: `${ctx.t("Cavalcare", "Riding")}: ${lbl(ctx, reason)}`, error: true };
    ctx.toast(ui.result.text, true);
    ctx.render();
    return true;
  }
  act(
    ctx,
    L(`${name}: cavalca`, `${name}: rides`),
    (d) => D.commitRide(d, input, ctx.role, op()),
    RESULT((r) => r?.outcome),
  );
  return true;
}
/**
 * Decides whether a core move becomes a ride (a mounted rider or her controlled mount), a
 * proposal (approval required) or a swim (water on the path); performs it and returns true,
 * or false to let the core move run.
 */
export function intercept(ctx, actorId, point, waypoints = []) {
  const s = ctx.state;
  const ride = rideFor(ctx, actorId);
  if (!ctx.canControl(s.actors[actorId]) && !ride) return false;
  ui.kb = null;
  if (ride) return rideTo(ctx, ride, point, waypoints);
  if (D.approvalRequired(s, actorId, ctx.role)) {
    let target = null;
    try {
      target = previewMovement(s, actorId, point, { waypoints, role: ctx.role }).target;
    } catch {
      /* the proposal validates the point itself */
    }
    act(
      ctx,
      L(
        `${actorName(ctx, actorId)} propone un movimento`,
        `${actorName(ctx, actorId)} proposes a move`,
      ),
      (d) => D.commitPropose(d, { actorId, point: target ?? point, waypoints }, ctx.role, op()),
      RESULT(() =>
        L(
          "Proposta inviata al DM: la pedina resta ferma finché non approva",
          "Proposal sent to the DM: the token stays until it is approved",
        ),
      ),
    );
    return true;
  }
  const swim = D.previewSwim(s, { actorId, point, waypoints }, ctx.role);
  if (swim.water > 0.05 && !swim.swimSpeed) {
    if (!swim.available) {
      const reason = swim.reasons.find((r) => r.code === "budget") ?? blocking(swim.reasons)[0];
      const reach =
        reason?.code === "budget" ? reachableSwim(s, actorId, point, waypoints, ctx.role) : null;
      // The movement runs out before the water: the core Move stops at the same point.
      if (reach && reach.water <= 0.05) return false;
      if (reach) {
        act(
          ctx,
          L(`${actorName(ctx, actorId)}: nuoto`, `${actorName(ctx, actorId)}: swim`),
          (d) =>
            D.commitSwim(
              d,
              { actorId, point: reach.point, waypoints: reach.waypoints },
              ctx.role,
              op(),
            ),
          RESULT((r) => r?.outcome),
        );
        return true;
      }
      if (reason?.code === "budget" || reason?.code === "blocked") {
        ui.result = { text: `${ctx.t("Nuoto", "Swimming")}: ${lbl(ctx, reason)}`, error: true };
        ctx.toast(ui.result.text, true);
        ctx.render();
        return true;
      }
      return false;
    }
    act(
      ctx,
      L(`${actorName(ctx, actorId)}: nuoto`, `${actorName(ctx, actorId)}: swim`),
      (d) => D.commitSwim(d, { actorId, point, waypoints }, ctx.role, op()),
      RESULT((r) => r?.outcome),
    );
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- two-tier ruler tool

function drawRuler(ctx, table, point, event = null) {
  const layer =
    table.svg?.querySelector('[data-ext-slot="map-layer:special-moves-top"] [data-sm-live]') ??
    table.svg?.querySelector("[data-sm-live]");
  const actorId = table.selectedActorId;
  const token = D.tokenOf(ctx.state, actorId);
  if (!layer || !token) return;
  const tiers = D.rangeTiers(ctx.state, actorId);
  const path = tracePath(table.scene, token, [point], { role: ctx.role });
  const colors = { normal: "#6fb6ff", dash: "#e8c65a", beyond: "#f29b99" };
  let spent = 0;
  const segs = (path.segments ?? []).map((seg) => {
    const tier = D.tierOf(spent + seg.cost, tiers);
    spent += seg.cost;
    return `<path d="M${f1(seg.from.x)} ${f1(seg.from.y)}L${f1(seg.to.x)} ${f1(seg.to.y)}" data-sm-ruler="${tier}" stroke="${colors[tier]}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  });
  const tier = D.tierOf(path.totalCost, tiers);
  const word = {
    normal: ctx.t("con il movimento", "with your movement"),
    dash: ctx.t("serve lo Scatto", "needs a Dash"),
    beyond: ctx.t("fuori portata", "out of reach"),
  }[tier];
  // P6 TV-36 (Owlbear's ruler label): under a finger the label floats above it, readable.
  const scale = event?.pointerType === "touch" ? table.svg?.getScreenCTM?.()?.a || 1 : 0;
  const lift = scale ? 70 / scale : 0;
  const size = scale ? ` style="font-size:${f1(16 / scale)}px"` : "";
  layer.innerHTML = `${segs.join("")}<circle cx="${f1(point.x)}" cy="${f1(point.y)}" r="6" fill="${colors[tier]}"/><text x="${f1(point.x)}" y="${f1(point.y - 16 - lift)}" text-anchor="middle" class="sm-map-text" data-sm-ruler-text${size}>${num(ctx, path.totalCost, 1)} m · ${word}${path.blocked ? " · " + ctx.t("bloccato", "blocked") : ""}</text>`;
  table.message?.(
    `${ctx.t("Righello", "Ruler")}: ${num(ctx, path.distance, 1)} m · ${ctx.t("costo", "cost")} ${num(ctx, path.totalCost, 1)} m · ${word}`,
  );
}
const rulerTool = {
  id: RULER,
  label: L("Righello a due livelli", "Two-tier ruler"),
  icon: "ruler",
  group: "measure",
  order: 45,
  activate(ctx, table) {
    ui.ruler = ui.ruler?.pinned ? ui.ruler : null;
    table.message?.(
      ctx.t(
        "Righello: blu con il movimento, giallo con lo Scatto, rosso fuori portata.",
        "Ruler: blue with your movement, yellow with a Dash, red out of reach.",
      ),
    );
    if (ui.ruler?.point) drawRuler(ctx, table, ui.ruler.point);
  },
  deactivate() {
    ui.ruler = null;
  },
  onPointerMove(ctx, event, table) {
    if (ui.ruler?.pinned) return;
    const p = table.point(event);
    ui.ruler = { point: p, pinned: false };
    drawRuler(ctx, table, p, event);
  },
  onClick(ctx, event, table) {
    const p = table.point(event);
    ui.ruler = { point: p, pinned: !ui.ruler?.pinned };
    drawRuler(ctx, table, p, event);
  },
  onKeyDown(ctx, event, table) {
    const step = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[
      event.key
    ];
    const token = D.tokenOf(ctx.state, table.selectedActorId);
    if (step && token) {
      event.preventDefault();
      const from = ui.ruler?.point ?? { x: token.x, y: token.y };
      ui.ruler = {
        point: {
          x: from.x + step[0] * table.scene.gridSize,
          y: from.y + step[1] * table.scene.gridSize,
        },
        pinned: true,
      };
      drawRuler(ctx, table, ui.ruler.point);
    }
  },
};

// ---------------------------------------------------------------- sheet section (DDB)

const GENERIC = [
  [
    "grapple",
    L("Afferrare", "Grapple"),
    L("Parte dell’Attacco", "Part of the Attack"),
    L(
      "Colpo senz’armi: il bersaglio entro 1,5 m fa un TS su Forza o Destrezza (CD 8 + For + competenza) o è Afferrato. Serve una mano libera.",
      "Unarmed Strike: a target within 5 ft makes a Strength or Dexterity save (DC 8 + Str + proficiency) or is Grappled. Needs a free hand.",
    ),
    D.SOURCES.unarmedStrike,
  ],
  [
    "shove",
    L("Spingere", "Shove"),
    L("Parte dell’Attacco", "Part of the Attack"),
    L(
      "Colpo senz’armi: stesso TS; se fallisce lo spingi di 1,5 m o lo fai cadere Prono.",
      "Unarmed Strike: same save; on a failure you push it 5 ft or knock it Prone.",
    ),
    D.SOURCES.unarmedStrike,
  ],
  [
    "help",
    L("Aiutare", "Help"),
    L("Azione", "Action"),
    L(
      "Vantaggio a un alleato nella prossima prova con un’abilità, o al prossimo attacco di un alleato contro un nemico entro 1,5 m.",
      "Advantage to an ally’s next check with a skill, or to an ally’s next attack against an enemy within 5 ft.",
    ),
    D.SOURCES.help,
  ],
  [
    "hide",
    L("Nascondersi", "Hide"),
    L("Azione", "Action"),
    L(
      "Destrezza (Furtività) CD 15 fuori vista: sei Invisibile; il totale è la CD per trovarti.",
      "Dexterity (Stealth) DC 15 out of sight: you are Invisible; the total is the DC to find you.",
    ),
    D.SOURCES.hide,
  ],
  [
    "influence",
    L("Influenzare", "Influence"),
    L("Azione", "Action"),
    L(
      "Il DM giudica disposta, contraria o esitante; se esitante, prova contro CD 15 o l’Intelligenza della creatura.",
      "The DM judges willing, unwilling or hesitant; if hesitant, a check against DC 15 or the creature’s Intelligence.",
    ),
    D.SOURCES.influence,
  ],
  [
    "search",
    L("Cercare", "Search"),
    L("Azione", "Action"),
    L(
      "Prova di Saggezza: Intuizione, Medicina, Percezione o Sopravvivenza secondo cosa cerchi.",
      "Wisdom check: Insight, Medicine, Perception or Survival depending on what you look for.",
    ),
    D.SOURCES.search,
  ],
  [
    "study",
    L("Studiare", "Study"),
    L("Azione", "Action"),
    L(
      "Prova di Intelligenza su un ricordo, un libro o un indizio (Arcano, Storia, Indagare, Natura, Religione).",
      "Intelligence check on a memory, book or clue (Arcana, History, Investigation, Nature, Religion).",
    ),
    D.SOURCES.study,
  ],
  [
    "utilize",
    L("Usare", "Utilize"),
    L("Azione", "Action"),
    L("Usa un oggetto che richiede un’azione.", "Use an object that requires an action."),
    D.SOURCES.utilize,
  ],
];
// Weapon Mastery column of the SRD 5.2.1 class tables: [from level, weapons].
const MASTERY_SLOTS = {
  fighter: [
    [1, 3],
    [4, 4],
    [10, 5],
    [16, 6],
  ],
  barbarian: [
    [1, 2],
    [4, 3],
    [10, 4],
  ],
  paladin: [[1, 2]],
  ranger: [[1, 2]],
  rogue: [[1, 2]],
};
export function masterySlots(actor) {
  const cls = actor?.buildSeed?.classes?.find((c) => MASTERY_SLOTS[c.classId]);
  if (!cls) return 0;
  const level = cls.level ?? actor.level ?? 1;
  return MASTERY_SLOTS[cls.classId].filter(([from]) => level >= from).at(-1)?.[1] ?? 0;
}
export function renderSheetSection(ctx, actor) {
  if (!actor) return "";
  const s = ctx.state;
  const canonical = s.actors[actor.id] ?? actor;
  const prof = D.jumpProfile(s, actor.id, { runUp: true });
  const standing = D.jumpProfile(s, actor.id, { runUp: false });
  const speeds = D.speedsOf(s, actor.id);
  const m = (v) => num(ctx, v, 2) + " m";
  const rows = GENERIC.map(
    ([id, name, time, rule, source]) =>
      `<tr><th scope="row">${esc(ctx, lbl(ctx, name))}</th><td>${esc(ctx, lbl(ctx, time))}</td><td>${esc(ctx, lbl(ctx, rule))} ${sourceLink(ctx, source)}</td></tr>`,
  ).join("");
  const movement = `<ul class="sm-list"><li>${ctx.t("Velocità", "Speed")} ${m(speeds.walk)}${speeds.climb ? ` · ${ctx.t("scalata", "climb")} ${m(speeds.climb)}` : ""}${speeds.swim ? ` · ${ctx.t("nuoto", "swim")} ${m(speeds.swim)}` : ""}${speeds.fly ? ` · ${ctx.t("volo", "fly")} ${m(speeds.fly)}` : ""}</li><li>${ctx.t("Salto in lungo", "Long jump")} ${m(prof.long)} ${ctx.t("con rincorsa", "with a run-up")} · ${m(standing.long)} ${ctx.t("da fermo", "standing")}${prof.jumper ? " · " + ctx.t("Saltatore (Destrezza)", "Jumper (Dexterity)") : ""} ${sourceLink(ctx, D.SOURCES.longJump)}</li><li>${ctx.t("Salto in alto", "High jump")} ${m(prof.high)} · ${m(standing.high)} ${ctx.t("da fermo", "standing")}</li><li>${ctx.t("Arrampicarsi e nuotare costano il doppio senza la velocità apposita", "Climbing and swimming cost double without the matching Speed")} ${sourceLink(ctx, D.SOURCES.climbing)}</li><li>${ctx.t("CD di Afferrare e Spingere", "Grapple and Shove DC")} ${D.saveDC(canonical)}</li></ul>`;
  let mastery = "";
  if (D.hasWeaponMastery(canonical)) {
    const chosen = D.sliceOf(s)?.masteries?.[actor.id] ?? [];
    const slots = masterySlots(canonical);
    const weapons = (canonical.inventory ?? []).filter((row) => D.catalogWeapon(row)?.mastery);
    const control = ctx.canControl(canonical);
    mastery = `<h4>${ctx.t("Padronanza d’armi", "Weapon Mastery")} · ${chosen.length}/${slots}</h4><ul class="sm-list sm-mastery">${weapons
      .map((row) => {
        const info = D.masteryOf(s, canonical, row);
        const auto = D.AUTOMATED_MASTERIES.includes(info.property);
        return `<li><label class="prep-check"><input type="checkbox" data-sm-mastery="${esc(ctx, info.slug)}" ${info.chosen ? "checked" : ""} ${control ? "" : 'disabled aria-describedby="sm-mastery-why"'}> <strong>${esc(ctx, lbl(ctx, row.name))}</strong> · ${esc(ctx, lbl(ctx, info.name))}</label><small>${esc(ctx, lbl(ctx, info.rule))}${info.active ? (auto ? " · " + ctx.t("applicata al Tavolo in automatico", "applied at the Table automatically") : " · " + ctx.t("il DM la applica al Tavolo", "the DM applies it at the Table")) : ""}</small></li>`;
      })
      .join(
        "",
      )}</ul>${control ? "" : `<p class="muted" id="sm-mastery-why">${ctx.t("Le maestrie le sceglie chi controlla la scheda: chiedi a chi gioca il personaggio.", "Whoever controls the sheet chooses the masteries: ask the character's player.")}</p>`}<p class="muted">${sourceLink(ctx, D.SOURCES.mastery)}</p>`;
  }
  return `<div class="sm-sheet"><p class="muted">${ctx.t("Azioni generiche delle regole 2024: al Tavolo le trovi in «Mosse» nella barra delle azioni.", "2024 generic actions: at the Table they are under “Moves” in the action bar.")} <button type="button" class="button quiet" data-sm-open-table>${ctx.t("Apri al Tavolo", "Open at the Table")}</button></p><div class="table-wrap"><table class="sm-actions-table"><thead><tr><th>${ctx.t("Azione", "Action")}</th><th>${ctx.t("Tempo", "Time")}</th><th>${ctx.t("Regola", "Rule")}</th></tr></thead><tbody>${rows}</tbody></table></div><h4>${ctx.t("Movimento", "Movement")}</h4>${movement}${mastery}</div>`;
}
export function bindSheetSection(el, ctx, actor) {
  el.querySelector("[data-sm-open-table]")?.addEventListener("click", () => {
    ui.tray = true;
    // The Table selects this sheet's creature (like the sheet's own "Table" link).
    ctx.navigate("table", { id: actor.id });
  });
  el.querySelectorAll("[data-sm-mastery]").forEach(
    (box) =>
      (box.onchange = () =>
        act(ctx, L("Padronanza d’armi aggiornata", "Weapon Mastery updated"), (d) =>
          toggleMastery(d, actor.id, box.dataset.smMastery, box.checked, ctx.role),
        )),
  );
}
export function toggleMastery(state, actorId, slug, on, role) {
  const actor = state.actors[actorId];
  if (!actor) D.fail("unavailable", "Creatura non disponibile.", "Creature unavailable.");
  if (!canControlActor(actor, role, state))
    D.fail(
      "not-controller",
      "Sceglie chi controlla la scheda.",
      "Whoever controls the sheet chooses.",
    );
  const slice = D.sliceOf(state);
  const list = new Set(slice.masteries[actorId] ?? []);
  if (on) list.add(slug);
  else list.delete(slug);
  if (list.size > masterySlots(actor))
    D.fail(
      "slots",
      `Puoi scegliere al massimo ${masterySlots(actor)} armi.`,
      `You can choose at most ${masterySlots(actor)} weapons.`,
    );
  slice.masteries[actorId] = [...list];
}

// ---------------------------------------------------------------- preparation section

export function renderPreparationSection(ctx) {
  const s = ctx.state;
  const scenes = s.scenes ?? [];
  const lore = D.sliceOf(s)?.lore ?? [];
  return `<section class="panel sm-prep"><h2>${ctx.t("Movimento e griglia", "Movement and grid")}</h2><p class="muted">${ctx.t("Regola delle distanze per scena (come le impostazioni di pagina di Roll20) e i punti speciali della mappa: acqua, pareti scalabili, oggetti e segreti.", "Distance rule per scene (like Roll20 page settings) and the map’s special spots: water, climbable walls, objects and secrets.")}</p>${scenes
    .map((scene) => {
      const features = D.featuresOf(s, scene.id);
      return `<article class="sm-prep-scene"><h3>${esc(ctx, scene.name)}</h3><label class="field">${ctx.t("Distanze", "Distances")}<select data-sm-prep-rule="${esc(ctx, scene.id)}">${Object.keys(
        D.RULE_NAMES,
      )
        .map(
          (id) =>
            `<option value="${id}" ${D.ruleOf(scene) === id ? "selected" : ""}>${esc(ctx, lbl(ctx, D.RULE_NAMES[id]))}</option>`,
        )
        .join(
          "",
        )}</select></label>${features.length ? `<ul class="sm-list">${features.map((f) => `<li><strong>${esc(ctx, lbl(ctx, f.name))}</strong> · ${esc(ctx, { water: ctx.t("acqua", "water"), climb: ctx.t("parete", "wall"), object: ctx.t("oggetto", "object") }[f.kind] ?? f.kind)}${f.kind === "climb" ? ` · ${num(ctx, f.height)} m` : ""}${f.secret ? ` · ${f.revealed ? ctx.t("trovato", "found") : ctx.t("segreto", "secret")}` : ""}${Number.isInteger(f.dc) ? ` <label class="sm-inline">${ctx.t("CD", "DC")} <input type="number" min="1" max="30" value="${f.dc}" data-sm-prep-dc="${esc(ctx, f.id)}" data-scene="${esc(ctx, scene.id)}" inputmode="numeric"></label>` : ""}${f.kind === "water" ? ` · ${f.drained ? ctx.t("svuotata", "drained") : ctx.t("piena", "full")}` : ""}</li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun punto speciale.", "No special spots.")}</p>`}</article>`;
    })
    .join(
      "",
    )}<h3>${ctx.t("Conoscenze da Studiare", "Knowledge to Study")}</h3><ul class="sm-list">${lore.map((row) => `<li>${esc(ctx, lbl(ctx, row.text))} · ${esc(ctx, lbl(ctx, D.skillName(row.skill)))} <label class="sm-inline">${ctx.t("CD", "DC")} <input type="number" min="1" max="30" value="${row.dc}" data-sm-prep-lore="${esc(ctx, row.id)}" inputmode="numeric"></label></li>`).join("")}</ul></section>`;
}
export function bindPreparationSection(el, ctx) {
  el.querySelectorAll("[data-sm-prep-rule]").forEach(
    (select) =>
      (select.onchange = () =>
        act(ctx, L("Regola delle distanze della scena", "Scene distance rule"), (d) =>
          D.commitSceneRule(
            d,
            { sceneId: select.dataset.smPrepRule, rule: select.value },
            ctx.role,
          ),
        )),
  );
  el.querySelectorAll("[data-sm-prep-dc]").forEach(
    (input) =>
      (input.onchange = () =>
        act(ctx, L("CD aggiornata", "DC updated"), (d) =>
          setFeatureDc(
            d,
            input.dataset.scene,
            input.dataset.smPrepDc,
            Number(input.value),
            ctx.role,
          ),
        )),
  );
  el.querySelectorAll("[data-sm-prep-lore]").forEach(
    (input) =>
      (input.onchange = () =>
        act(ctx, L("CD della conoscenza aggiornata", "Knowledge DC updated"), (d) =>
          setLoreDc(d, input.dataset.smPrepLore, Number(input.value), ctx.role),
        )),
  );
}
export function setFeatureDc(state, sceneId, featureId, dc, role) {
  if (!runsSession(state, role)) D.fail("dm-only", "Solo il DM.", "DM only.");
  if (!Number.isInteger(dc) || dc < 1 || dc > 30)
    D.fail("dc", "CD tra 1 e 30.", "DC between 1 and 30.");
  const f = D.featureById(state, featureId, sceneId);
  if (!f) D.fail("feature", "Punto non trovato.", "Spot not found.");
  f.dc = dc;
}
export function setLoreDc(state, loreId, dc, role) {
  if (!runsSession(state, role)) D.fail("dm-only", "Solo il DM.", "DM only.");
  if (!Number.isInteger(dc) || dc < 1 || dc > 30)
    D.fail("dc", "CD tra 1 e 30.", "DC between 1 and 30.");
  const row = D.sliceOf(state)?.lore?.find((l) => l.id === loreId);
  if (!row) D.fail("lore", "Conoscenza non trovata.", "Knowledge not found.");
  row.dc = dc;
}

// ---------------------------------------------------------------- global keys (Alt, `, Shift+X)

let keysInstalled = false;
function onTable() {
  return Boolean(globalThis.document?.querySelector("#content #battle-map"));
}
function toggleLayer(selector, on) {
  globalThis.document
    ?.querySelectorAll(selector)
    .forEach((node) => node.toggleAttribute("data-on", on));
}
function installKeys() {
  if (keysInstalled || typeof document === "undefined") return;
  keysInstalled = true;
  document.addEventListener("keydown", (event) => {
    if (!onTable()) return;
    const typing = event.target.closest?.("input,textarea,select,[contenteditable=true]");
    // Not while typing: Option/AltGr also composes characters (the Italian "@", "#").
    if (event.key === "Alt" && !ui.reveal && !typing) {
      ui.reveal = true;
      toggleLayer("[data-sm-labels-layer]", true);
      event.preventDefault();
    }
    if (event.key === "`" && !typing) {
      ui.highlight = !ui.highlight;
      toggleLayer("[data-sm-highlight]", ui.highlight);
    }
    if (event.key === "Escape" && !document.querySelector("#dialog")?.open) {
      if (ui.ruler) {
        ui.ruler = null;
        document
          .querySelectorAll("#content [data-sm-live]")
          .forEach((node) => (node.innerHTML = ""));
      }
      if (ui.armed) {
        ui.armed = null;
        area?.ctx?.render();
      }
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.key !== "Alt" || !ui.reveal) return;
    ui.reveal = false;
    if (!ui.sticky) toggleLayer("[data-sm-labels-layer]", false);
    event.preventDefault();
  });
  globalThis.addEventListener?.("blur", () => {
    if (!ui.reveal) return;
    ui.reveal = false;
    if (!ui.sticky) toggleLayer("[data-sm-labels-layer]", false);
  });
}

// ---------------------------------------------------------------- follow-up consequences

let following = false;
function followUp(payload, ctx) {
  if (following || payload?.correction || !ctx?.state || ctx.offline) return;
  const due = D.dueConsequences(ctx.state);
  if (!due.length) return;
  const rider = (row) => actorName(ctx, row.riderId);
  const mount = (row) => actorName(ctx, row.mountId);
  const text =
    due
      .filter((row) => !row.quiet)
      .map((row) =>
        row.kind === "hidden"
          ? ctx.t(
              `${actorName(ctx, row.actorId)} non è più nascosto: ha attaccato`,
              `${actorName(ctx, row.actorId)} is no longer hidden: it attacked`,
            )
          : row.kind === "carry"
            ? ctx.t(
                `${rider(row)} resta in sella a ${mount(row)}`,
                `${rider(row)} stays on ${mount(row)}`,
              )
            : row.kind === "left-saddle" || row.kind === "unmount"
              ? ctx.t(
                  `${rider(row)} non è più in sella a ${mount(row)}`,
                  `${rider(row)} is no longer riding ${mount(row)}`,
                )
              : row.kind === "prone-fall"
                ? ctx.t(
                    `${rider(row)} rischia di cadere di sella: tiro salvezza su Destrezza CD 10`,
                    `${rider(row)} may fall off: DC 10 Dexterity saving throw`,
                  )
                : ctx.t(
                    `Presa finita: ${actorName(ctx, row.grapplerId)} e ${actorName(ctx, row.targetId)} non sono più a portata`,
                    `Grapple ended: ${actorName(ctx, row.grapplerId)} and ${actorName(ctx, row.targetId)} are no longer in reach`,
                  ),
      )
      .join("; ") || ctx.t("Cavalcatura aggiornata", "Mount updated");
  following = true;
  try {
    ctx.commit(text, (d) => D.applyConsequences(d, "b40-follow:" + (payload?.id ?? uid())), {
      undoable: false,
    });
  } catch (error) {
    ctx.toast?.(message(ctx, error), true);
  } finally {
    following = false;
  }
}

// ---------------------------------------------------------------- mounts (R3 PG-79)

// The creature a palette command acts on: the Table's selection when the viewer controls it,
// else the viewer's first party character on the scene (Livia for her player and the DM).
function commandActor(ctx, { control = true } = {}) {
  const s = ctx.state;
  const id = lastTable?.selectedActorId;
  const ok = (actorId) =>
    Boolean(D.tokenOf(s, actorId)) && (!control || ctx.canControl(s.actors[actorId]));
  if (id && ok(id)) return id;
  const scene = D.sceneOf(s);
  return (
    (scene?.tokens ?? [])
      .map((t) => t.actorId)
      .find((actorId) => s.actors[actorId]?.kind === "character" && ok(actorId)) ?? null
  );
}
const MOUNT_WORDS = [
  L("cavalcatura", "mount"),
  L("cavallo", "horse"),
  L("monta", "mount up"),
  L("in sella", "saddle"),
  L("cavalca", "ride"),
  L("smonta", "dismount"),
  L("cavallo da galoppo", "riding horse"),
];
/** DM: the SRD Riding Horse next to a creature (the selection, else a party character). */
export function bringMount(ctx, nearActorId = commandActor(ctx, { control: false })) {
  if (!nearActorId) {
    ctx.toast(
      ctx.t("Seleziona prima una creatura sulla scena.", "Select a creature on the scene first."),
      true,
    );
    return null;
  }
  const near = actorName(ctx, nearActorId);
  return act(
    ctx,
    L(`Cavalcatura accanto a ${near}`, `Mount next to ${near}`),
    (d) => D.commitSummonMount(d, { nearActorId }, ctx.role),
    RESULT((horse) =>
      L(
        `${horse?.name ?? ""} è accanto a ${near}: chi è a 1,5 m può salire con «Monta in sella».`,
        `${horse?.name ?? ""} is next to ${near}: anyone within 1.5 m can get on with “Mount”.`,
      ),
    ),
  );
}
function armMount(ctx, kind, actorId) {
  if (!actorId) {
    ctx.toast(
      ctx.t(
        "Seleziona prima la tua creatura sulla scena.",
        "Select your creature on the scene first.",
      ),
      true,
    );
    return;
  }
  setSelectedActor(actorId);
  chooseMove(ctx, kind, actorId);
}
function registerMounts(registry) {
  const controlled = (ctx, target) => ctx.canControl(ctx.state.actors[target?.actorId]);
  const riding = (ctx, target) => Boolean(D.mountOf(ctx.state, target?.actorId));
  // Token menu › Azioni (Foundry Token HUD, D&D Beyond token menu): the rider's commands.
  registry.add("token-menu", {
    id: "special-moves-mount",
    submenu: "actions",
    label: L("Monta in sella…", "Mount…"),
    group: "mounts",
    order: 60,
    when: (ctx, target) =>
      controlled(ctx, target) &&
      !riding(ctx, target) &&
      !D.riderOf(ctx.state, target.actorId) &&
      mountCandidates(ctx, target.actorId).some(
        (id) => !D.riderOf(ctx.state, id) && !D.mountOf(ctx.state, id),
      ),
    run: (ctx, target) => armMount(ctx, "mount", target.actorId),
  });
  registry.add("token-menu", {
    id: "special-moves-ride",
    submenu: "actions",
    label: L("Cavalca…", "Ride…"),
    group: "mounts",
    order: 61,
    when: (ctx, target) => controlled(ctx, target) && riding(ctx, target),
    run: (ctx, target) => armMount(ctx, "ride", target.actorId),
  });
  registry.add("token-menu", {
    id: "special-moves-dismount",
    submenu: "actions",
    label: L("Smonta", "Dismount"),
    group: "mounts",
    order: 62,
    when: (ctx, target) => controlled(ctx, target) && riding(ctx, target),
    run: (ctx, target) => armMount(ctx, "dismount", target.actorId),
  });
  registry.add("token-menu", {
    id: "special-moves-bring-mount",
    submenu: "dm",
    label: L("Porta una cavalcatura qui", "Bring a mount here"),
    group: "mounts",
    order: 70,
    roles: ["dm"],
    when: (ctx, target) => Boolean(D.tokenOf(ctx.state, target?.actorId)),
    run: (ctx, target) => bringMount(ctx, target.actorId),
  });
  // Palette (B23): the words a new user types, Italian and English.
  registry.add("command", {
    id: "special-moves.bring-mount",
    label: L("Porta una cavalcatura", "Bring a mount"),
    description: L(
      "Un cavallo da galoppo (SRD) accanto alla creatura selezionata: poi «Monta in sella».",
      "A Riding Horse (SRD) next to the selected creature: then “Mount”.",
    ),
    keywords: MOUNT_WORDS,
    context: "table",
    group: "special-moves",
    roles: ["dm"],
    run: (ctx) => bringMount(ctx),
  });
  registry.add("command", {
    id: "special-moves.mount",
    label: L("Monta in sella", "Mount"),
    description: L(
      "Sali su una cavalcatura entro 1,5 m: controllata o indipendente (metà velocità).",
      "Get on a mount within 1.5 m: controlled or independent (half your Speed).",
    ),
    keywords: MOUNT_WORDS,
    context: "table",
    group: "special-moves",
    run: (ctx) => armMount(ctx, "mount", commandActor(ctx)),
  });
  registry.add("command", {
    id: "special-moves.ride",
    label: L("Cavalca", "Ride"),
    description: L(
      "Muovi la cavalcatura su cui sei in sella (anche trascinando una delle due pedine).",
      "Move the mount you ride (also by dragging either token).",
    ),
    keywords: MOUNT_WORDS,
    context: "table",
    group: "special-moves",
    run: (ctx) => armMount(ctx, "ride", commandActor(ctx)),
  });
  registry.add("command", {
    id: "special-moves.dismount",
    label: L("Smonta", "Dismount"),
    description: L(
      "Scendi dalla cavalcatura accanto a lei (metà velocità).",
      "Get off the mount beside it (half your Speed).",
    ),
    keywords: MOUNT_WORDS,
    context: "table",
    group: "special-moves",
    run: (ctx) => armMount(ctx, "dismount", commandActor(ctx)),
  });
}

// ---------------------------------------------------------------- registration

let unhook = [];
export function register(registry) {
  // C3 (CA-57): DM contributions follow the session's authority (the hand-off's runner).
  const plainAdd = registry.add.bind(registry);
  registry = Object.create(registry, {
    add: { value: (point, def) => plainAdd(point, sessionGated(def)) },
  });
  area = registry;
  for (const fn of unhook) fn();
  unhook = [
    registerActionProvider({
      list: (state, actor) => D.weaponActions(state, actor),
      commit: (state, attempt, action) => D.onWeaponAttempt(state, attempt, action),
    }),
    provideRollReasons((state, attacker, action, selection, target) =>
      D.rollReasons(state, attacker, action, selection, target),
    ),
    resolveAttemptKind(D.KIND, (state, attempt, helpers) =>
      D.resolveAttempt(state, attempt, helpers),
    ),
    observeTurnPhases((state, info) => D.onTurnPhase(state, info)),
  ];
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./special-moves.css", import.meta.url));
  registry.add("table-panel", {
    id: "special-moves",
    label: L("Mosse speciali", "Special moves"),
    placement: "dock",
    order: 20,
    render: (ctx, tableView) => renderDock(ctx, tableView),
    bind: (el, ctx, table) => bindDock(el, ctx, table),
  });
  registry.add("table-panel", {
    id: "special-moves-panel",
    label: L("Mosse speciali", "Special moves"),
    placement: "inspector",
    order: 25,
    render: (ctx, tableView) => renderInspector(ctx, tableView),
    bind: (el, ctx, table) => bindInspector(el, ctx, table),
  });
  registry.add("map-layer", {
    id: "special-moves-ground",
    label: L("Acqua, pareti, tracce e proposte", "Water, walls, trails and proposals"),
    order: 22,
    svg: (ctx, tableView) => groundLayer(ctx, tableView),
  });
  registry.add("map-layer", {
    id: "special-moves-top",
    label: L("Anteprime delle mosse ed etichette", "Move previews and labels"),
    order: 72,
    interactive: true,
    svg: (ctx, tableView) => topLayer(ctx, tableView),
    bind: (el, ctx, table) => bindTop(el, ctx, table),
  });
  registry.add("table-tool", rulerTool);
  // The DM's approval panel and map rules (Fantasy Grounds token locking R20-168, Not Your
  // Turn FVT-114, Roll20 page settings R20-086): a DM tab of the right sidebar (B61 rule 2).
  registry.add("table-panel", {
    id: RULES,
    section: "combat",
    label: L("Regole di movimento", "Movement rules"),
    placement: "sidebar-tab",
    icon: "move",
    order: 22,
    roles: ["dm"],
    render: (ctx) => `<div class="sm-panel">${pendingBlock(ctx)}${rulesBlock(ctx)}</div>`,
    bind: (el, ctx, table) => bindInspector(el, ctx, table),
  });
  registry.add("sheet-section", {
    id: "special-moves-actions",
    tab: "actions",
    label: L("Azioni generiche, movimento e maestria", "Generic actions, movement and mastery"),
    order: 30,
    when: (ctx, actor) => Boolean(actor) && actor.kind === "character",
    render: (ctx, actor) => renderSheetSection(ctx, actor),
    bind: (el, ctx, actor) => bindSheetSection(el, ctx, actor),
  });
  registry.add("preparation-section", {
    id: "special-moves",
    group: "scenes",
    label: L("Movimento e griglia", "Movement and grid"),
    order: 45,
    roles: ["dm"],
    render: (ctx) => renderPreparationSection(ctx),
    bind: (el, ctx) => bindPreparationSection(el, ctx),
  });
  registry.add("notifications", {
    id: "special-moves",
    label: L("Mosse speciali", "Special moves"),
    collect: (ctx) => {
      const out = [];
      if (!runsSession(ctx.state, ctx.role)) return out;
      for (const p of D.pendingProposals(ctx.state))
        out.push({
          id: "sm-proposal-" + p.id,
          title: L(
            `${actorName(ctx, p.actorId)} propone un movimento`,
            `${actorName(ctx, p.actorId)} proposes a move`,
          ),
          category: "table",
          time: p.at,
          target: { page: "table" },
        });
      for (const j of (D.sliceOf(ctx.state)?.judgements ?? []).filter(
        (row) => row.status === "awaiting-dm",
      ))
        out.push({
          id: "sm-judgement-" + j.id,
          title: L(
            `${actorName(ctx, j.actorId)} vuole influenzare ${actorName(ctx, j.targetId)}`,
            `${actorName(ctx, j.actorId)} wants to influence ${actorName(ctx, j.targetId)}`,
          ),
          category: "table",
          time: j.at,
          target: { page: "table" },
        });
      return out;
    },
  });
  registry.add("command", {
    id: "special-moves.last-move",
    label: L("Mostra l’ultima mossa della pedina", "Show the token’s last move"),
    description: L(
      "Ultima mossa, storico dei movimenti, percorso fatto in questo turno (come la X di Roll20)",
      "Last move, movement history, path walked this turn (like Roll20’s X)",
    ),
    shortcut: "Shift+X",
    context: "table",
    run: (ctx) => {
      ui.lastMove = !ui.lastMove;
      ctx.render();
    },
  });
  // P6 TV-11 (BG3's highlight key): holding Alt shows every label on the map; the command
  // keeps them on (Alt+L) and puts the hold key in the «?» guide and the palette.
  registry.add("command", {
    id: "special-moves.labels",
    label: L(
      "Etichette sulla mappa: tieni premuto Alt per vederle (Alt+L le lascia accese)",
      "Map labels: hold Alt to see them (Alt+L keeps them on)",
    ),
    description: L(
      "etichette, nomi, mostra i nomi, evidenzia, Alt, oggetti e muri sulla mappa",
      "labels, names, show names, highlight, Alt, objects and walls on the map",
    ),
    shortcut: "Alt+L",
    context: "table",
    run: (ctx) => {
      ui.sticky = !ui.sticky;
      toggleLayer("[data-sm-labels-layer]", ui.sticky || ui.reveal);
      ctx.toast(
        ui.sticky
          ? ctx.t(
              "Etichette sempre visibili (Alt+L le nasconde)",
              "Labels always on (Alt+L hides them)",
            )
          : ctx.t("Etichette solo tenendo premuto Alt", "Labels only while Alt is held"),
      );
    },
  });
  registry.add("command", {
    id: "special-moves.tray",
    label: L("Apri le mosse speciali", "Open special moves"),
    context: "table",
    run: (ctx) => {
      ui.tray = true;
      ui.focusTray = true;
      ctx.render();
    },
  });
  registerMounts(registry);
  // Consequences of any change (an attack roll ends Hide at once; a grapple ends out of
  // reach), in a follow-up transaction that Undo removes with that change (like B32's
  // reaction policies).
  registry.on("commit", (payload, { ctx }) => followUp(payload, ctx));
  registry.on("role-changed", () => resetSpecialMovesView());
  registry.on("reset", () => resetSpecialMovesView());
  registry.on("scene-activated", () => {
    ui.armed = null;
    ui.ruler = null;
  });
  registry.on("navigate", (payload) => {
    if (payload?.page !== "table") {
      ui.armed = null;
      ui.ruler = null;
    }
  });
  installKeys();
}
