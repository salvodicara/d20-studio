import * as formsUI from "./forms-ui.mjs";
import * as companionMap from "./companion-map.mjs";
import * as conditionsUI from "./conditions-ui.mjs";
import {
  beginVitalityRoll,
  vitalityCommit,
  projectVitalityRolls,
  applyConditionFollowUps,
  hasBlockingConsequences,
} from "./combat.mjs";
import { openCombatRequests, openRoll } from "./combat-ui.mjs";
import { openTableInitiative, refreshTableInitiative } from "./combat-tracker.mjs";
// C3 (CA-57, Owlbear GM hand-off): the member the DM handed the session to runs it.
import { runsSession } from "./session-view.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { createStore, readSandbox, sandboxStorage, endSandbox, promoteSandbox } from "./state.mjs";
import { esc, icon, logo, scrollIntoStrip, isNewPage, createScrollMemory } from "./ui.mjs";
import { installContextMenus } from "./context-menu.mjs";
import { renderCharacters, bindCharacters } from "./characters.mjs";
import * as preparation from "./preparation.mjs";
import * as characterBuilder from "./character-builder.mjs";
import * as library from "./library.mjs";
import * as campaign from "./campaign.mjs";
import * as restUI from "./rest-ui.mjs";
import { getCampaignHub, listCampaignEntries } from "./campaign-content.mjs";
import { getHomebrewDraft } from "./homebrew.mjs";
import {
  parseLibraryReturn,
  addHomebrewToCharacterDraft,
  applyLibraryDraftToCharacter,
  validateLibraryCharacterChoice,
} from "./homebrew-integration.mjs";
import { canViewActor, canControlActor } from "./character-access.mjs";
import { renderTable, bindTable, resetTableView, leaveTable, setSelectedActor } from "./table.mjs";
import { createRegistry, normalizeShortcut } from "./registry.mjs";
import {
  campaignGroups,
  rememberCampaignGroup,
  resetCampaignRail,
  CORE_CAMPAIGN_GROUPS,
} from "./rail-groups.mjs";
import { PLANNED_EXTENSIONS, loadExtensions } from "./extensions.mjs";

let storage;
try {
  storage = localStorage;
} catch {}
// Every planned area registers itself before the first render. A missing entry module is
// one HEAD 404 ("not built"); a broken one is reported and isolated, never fatal. On a
// loopback host, ?fixture=<name>[,<name>] also loads test fixtures from tests/fixtures/.
// A contained area warning can happen outside a render (a command, service or tool):
// the demonstration strip notice follows it right away.
const registry = createRegistry({
  logger: {
    warn(text) {
      globalThis.console?.warn(text);
      queueMicrotask(refreshExtensionNotice);
    },
  },
});
const fixtures = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)
  ? (new URLSearchParams(location.search).get("fixture") ?? "")
      .split(",")
      .filter((name) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
      .slice(0, 4)
  : [];
await loadExtensions(registry, {
  entries: [
    ...PLANNED_EXTENSIONS,
    ...[...new Set(fixtures)].map((id) => ({
      id,
      backlog: "B11",
      title: { it: `Estensione di prova (${id})`, en: `Test extension (${id})` },
      file: `./tests/fixtures/${id}.mjs`,
    })),
  ],
});
// IN-10: a trial without an account runs on its own copy of the sample data.
const sandbox = storage ? readSandbox(storage) : null;
const store = createStore({ storage: sandbox ? sandboxStorage(storage) : storage });
// Seed or migrate the state slices of loaded areas; slices of absent areas stay untouched.
if (registry.initState(store.state).changed) store.persist();
if (sandbox) {
  const profile = store.state.ext?.account?.profiles?.[sandbox.role];
  if (profile && profile.session !== "sandbox") {
    profile.session = "sandbox";
    store.persist();
  }
}
const guardFailed = Symbol("guard");
// A navigation already confirmed by an area's draft guard is not asked again on hashchange.
let guardBypass = null;
let announcedView = null;
// X-10: a popped-out Table panel keeps the demo identity of the tab that opened it.
const windowRole = /^d20-panel-(dm|player)-/.exec(window.name)?.[1] ?? null;
let role = windowRole ?? sandbox?.role ?? "player",
  lang = "it",
  offline = false,
  // Who switched offline mode on: "demo" (Preferences) or "network" (the browser).
  offlineSource = null,
  visitedTable = false,
  toastTimer;
const routes = [
  "home",
  "characters",
  "builder",
  "campaigns",
  "campaign",
  "preparation",
  "table",
  "library",
  "notes",
];
function readRoute() {
  const parts = location.hash.slice(1).split("?");
  const p = new URLSearchParams(parts[1] || "");
  return {
    page: routes.includes(parts[0]) || registry.get("route", parts[0]) ? parts[0] : "home",
    id: p.get("id") || "",
    tab: p.get("tab") || "",
    revision: p.get("revision") || "",
    returnTo: p.get("returnTo") || "",
  };
}
function routeParams(route) {
  return Object.fromEntries(
    ["id", "tab", "revision", "returnTo"]
      .filter((key) => route[key])
      .map((key) => [key, route[key]]),
  );
}
let view = readRoute();
const t = (it, en) => (lang === "it" ? it : en);
const label = (value) =>
  typeof value === "object" && value
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");
function toast(text, error = false) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.className = error ? "shown error" : "shown";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ""), 5500);
}
// `confirmed`: false, "core" (a core draft was confirmed; an area draft is still asked)
// or true (everything confirmed).
function navigate(page, params = {}, confirmed = false) {
  if (
    !confirmed &&
    ["campaign", "notes"].includes(view.page) &&
    campaign.hasCampaignDraft() &&
    (page !== view.page ||
      params.id !== view.id ||
      params.tab !== view.tab ||
      (params.revision || "") !== view.revision)
  ) {
    campaign.confirmCampaignNavigation(ctx, () => navigate(page, params, "core"));
    return;
  }
  if (
    !confirmed &&
    view.page === "library" &&
    library.hasLibraryDraft() &&
    (page !== "library" ||
      params.id !== view.id ||
      params.tab !== view.tab ||
      (params.revision || "") !== view.revision)
  ) {
    library.confirmLibraryNavigation(ctx, () => navigate(page, params, "core"));
    return;
  }
  if (
    !confirmed &&
    view.page === "builder" &&
    characterBuilder.hasCharacterBuilderDraft() &&
    (page !== "builder" || params.id !== view.id)
  ) {
    characterBuilder.confirmCharacterBuilderNavigation(ctx, () => navigate(page, params, "core"));
    return;
  }
  if (
    !confirmed &&
    view.page === "preparation" &&
    view.id &&
    preparation.hasPreparationDraft?.() &&
    (page !== "preparation" || params.id !== view.id)
  ) {
    preparation.confirmPreparationNavigation(ctx, () => navigate(page, params, "core"));
    return;
  }
  // Areas protect their own unsaved drafts, also after a core draft was confirmed. A
  // confirm that throws never traps the user.
  const guard = confirmed !== true && registry.pendingDraft(ctx, { page, ...params });
  if (guard) {
    const proceed = () => navigate(page, params, true);
    if (registry.call(guard, "confirm", guardFailed, ctx, proceed) === guardFailed) proceed();
    return;
  }
  closeDialog();
  if (page === "table" && params.id) setSelectedActor(params.id);
  const query = new URLSearchParams(params).toString();
  const target = "#" + page + (query ? "?" + query : "");
  if (location.hash === target) {
    view = readRoute();
    render();
  } else {
    guardBypass = confirmed ? target : null;
    location.hash = target;
  }
}
// A closed dialog keeps no markup: the previous identity's panel (a private origin, a
// draft) must not stay in the DOM after closing or a role change.
function clearClosedDialog(dialog) {
  if (!dialog.open) dialog.innerHTML = "";
}
function closeDialog() {
  const dialog = document.querySelector("#dialog");
  if (dialog.open) dialog.close();
  clearClosedDialog(dialog);
}
// X-05 (Owlbear SDK: a modal returns to the surface it came from): `onCancel` runs once
// when the dialog closes without a submit (Cancel, ×, Escape), after it has closed.
function dialog(title, body, { submitLabel, onSubmit, cancelLabel, onCancel } = {}) {
  const el = document.querySelector("#dialog");
  closeDialog();
  let settled = false;
  const fireCancel = () => {
    if (settled || !onCancel) return;
    settled = true;
    setTimeout(() => onCancel(), 0);
  };
  el.setAttribute("aria-labelledby", "dialog-title");
  el.innerHTML = `<form><div class="dialog-heading"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-button" data-close aria-label="${t("Chiudi", "Close")}">${icon("close")}</button></div><div class="dialog-body">${body}</div><p class="dialog-error error" role="alert" hidden></p><footer><button type="button" class="button" data-close>${esc(cancelLabel || t("Annulla", "Cancel"))}</button>${submitLabel ? `<button class="button primary" type="submit">${esc(submitLabel)}</button>` : ""}</footer></form>`;
  el.querySelectorAll("[data-close]").forEach(
    (b) =>
      (b.onclick = () => {
        closeDialog();
        fireCancel();
      }),
  );
  el.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    try {
      const result = onSubmit?.(new FormData(event.currentTarget), event.currentTarget);
      if (result !== false) settled = true;
      if (result !== false && el.querySelector("form") === event.currentTarget) closeDialog();
    } catch (error) {
      const err = el.querySelector(".dialog-error");
      err.textContent = label(error.it ? { it: error.it, en: error.en } : error.message);
      err.hidden = false;
    }
  };
  // Escape and native cancel close without closeDialog: clear on the close event too,
  // only if no newer dialog has opened in the meantime.
  el.onclose = () => clearClosedDialog(el);
  el.oncancel = () => fireCancel();
  el.showModal();
}
function commit(title, mutator, options = {}) {
  // CA-10: a change made in another tab since this one last looked is loaded first, so
  // this change is checked against it (a stale draft routes to compare and resume).
  store.sync();
  // Access gate (additive, B29): an identity that signed out changes nothing until it
  // signs in again (the gate's own sign-in is let through by the gate itself).
  const gate = registry.accessGate(ctx);
  if (gate) throw Object.assign(Error(label(gate.message)), { ...gate.message });
  // B52 hook (offline.mjs; a host event like "preferences:dialog"): while offline an area
  // may wrap the mutation (to queue a personal change in the same commit) and may take a
  // shared change of content made available offline as a local change queued for sync.
  // Without a handler nothing changes: the shared change is refused below.
  if (offline) {
    const write = { title, local: Boolean(options.local), accept: false, wrap: null };
    registry.emit("offline:write", write);
    if (typeof write.wrap === "function") mutator = write.wrap(mutator);
    if (write.accept && !options.local)
      options = { ...options, local: true, visibility: "private" };
  }
  if (offline && !options.local) {
    const it = "Sei senza rete: questa modifica condivisa non può essere applicata.",
      en = "You are offline: this shared change cannot be applied.";
    // The message stays in the current language for callers that show it directly.
    throw Object.assign(Error(t(it, en)), { it, en });
  }
  const before = store.state;
  // B20 campaign policy (campaign-settings.mjs, PG-94): from a sheet page the DM changes
  // no player character whose owner withheld DM edits (values, HP, conditions, resources
  // and inventory alike); a turn change stays Table authority. Private notes are not edits.
  const reserved =
    role === "dm" && view.page === "characters" && !options.local
      ? Object.entries(
          before.ext?.["campaign-settings"]?.campaigns?.[before.campaign?.id]?.policy
            ?.dmSheetEdit ?? {},
        )
          .filter(([id, allowed]) => allowed === false && before.actors?.[id]?.owner !== "dm")
          .map(([id]) => id)
      : [];
  const sheet = (a) => JSON.stringify(a ?? null, (k, v) => (k === "personalPlans" ? undefined : v));
  const turn = (s) => JSON.stringify([s.combat?.active, s.combat?.round, s.combat?.turn]);
  const guarded = (draft) => {
    mutator(draft);
    const hit =
      turn(draft) === turn(before) &&
      reserved.find((id) => sheet(draft.actors?.[id]) !== sheet(before.actors?.[id]));
    if (!hit) return;
    const name = before.actors[hit].name;
    const it = `Modifica riservata a chi gioca ${name}: dalla scheda puoi solo consultarla. Chiedi l’autorizzazione nel riquadro «Modifiche del DM».`,
      en = `Editing reserved to ${name}’s player: from the sheet you can only read it. Ask for authorization in the “DM edits” box.`;
    throw Object.assign(Error(t(it, en)), { it, en });
  };
  try {
    store.commit(title, reserved.length ? guarded : mutator, role, {
      shared: !options.local,
      visibility: options.visibility,
      undoable: options.undoable,
    });
  } catch (error) {
    // A plain Error from a mutator is an expected refusal (an invalid operation), not a
    // malfunction: an area command shows its message. Programming errors keep their type.
    if (error?.constructor === Error) error.refusal = true;
    throw error;
  }
  // A command that replaces the campaign context (B13: switching campaign) starts a new
  // undo visit: no snapshot taken before it can be restored over the new context.
  if (options.newUndoVisit) store.history.length = 0;
  // A non-undoable command that rewrote sheets (B13 join, seats, removal) replays its
  // change on the snapshots still in the stack, so an earlier Undo never reverts it.
  if (options.rebaseHistory) for (const entry of store.history) options.rebaseHistory(entry.before);
  // Domain events are derived from the accepted transition only: never from previews
  // or rejected mutations (the store throws before replacing its state).
  registry.emitStateEvents(before, store.state);
  // A command may finish its accepted transition on the committed state, after its
  // events and before the render (B13: a launched campaign brings back its own log,
  // which the store keeps append-only inside a commit).
  if (options.afterCommit) {
    options.afterCommit(store.state);
    store.persist();
  }
  render();
  if (store.storageError)
    toast(
      t(
        "Modifica conservata solo in questa scheda: memoria locale non disponibile.",
        "Change kept in this tab only: local storage unavailable.",
      ),
      true,
    );
  return { applied: true, persisted: !store.storageError };
}
function undo() {
  if (offline && store.history.at(-1)?.shared) {
    toast(
      t(
        "Riconnettiti prima di correggere lo stato condiviso.",
        "Reconnect before correcting shared state.",
      ),
      true,
    );
    return;
  }
  try {
    const current = store.state;
    store.undo(role);
    // Area slices declared undo: "preserve" keep their current value, like narrative content.
    registry.afterUndo(current, store.state);
    store.persist();
    registry.emitStateEvents(current, store.state, { kind: "correction" });
    render();
    toast(
      t(
        "Modifica annullata: nel registro resta come correzione.",
        "Change undone: the log keeps it as a correction.",
      ),
    );
  } catch {
    toast(
      t(
        "Non c’è una tua modifica recente da annullare in questa visita.",
        "There is no recent change of yours to undo in this visit.",
      ),
      true,
    );
  }
}
function startEncounter(sceneId) {
  if (!runsSession(store.state, role)) return;
  // TV-45/PR-32 (P5 shared edit; Foundry Combat Tracker, D&D Beyond Maps): one Table
  // dialog, prepared encounter or not, chooses the participants, rolls the missing d20s,
  // sorts the order by total and starts, without leaving the Table.
  openTableInitiative(ctx, sceneId);
}
// Vitality rolls (death save, Medicine, stable recovery) enter the existing request
// queue in one commit; physical or digital dice are chosen in the common roll dialog.
function beginConditionRoll(input) {
  const scope = vitalityCommit(store.state, input, role);
  const titles = {
    "death-save": t("Tiro salvezza contro la morte richiesto", "Death saving throw requested"),
    medicine: t("Prova di Medicina avviata", "Medicine check started"),
    "stable-recovery": t("Recupero da stabile: 1d4 richiesto", "Stable recovery: 1d4 requested"),
  };
  let started;
  commit(
    titles[input?.kind] ?? t("Tiro richiesto", "Roll requested"),
    (s) => {
      started = beginVitalityRoll(s, input, role, { online: !offline });
    },
    scope.local ? { local: true, visibility: "private" } : { visibility: scope.visibility },
  );
  return started;
}
// A vital roll started from the conditions panel offers a way back to that panel.
function openConditionRoll(descriptorId, options = {}) {
  const attempt = store.state.combatAttempts?.find((a) => a.descriptor?.id === descriptorId);
  const request = attempt?.requests[0];
  if (!request) {
    toast(t("Richiesta di tiro non disponibile.", "Roll request unavailable."), true);
    return;
  }
  const canRoll =
    request.status === "pending" &&
    (request.personal !== true || request.owner === role) &&
    canControlActor(store.state.actors[request.actorId], role, store.state);
  if (canRoll) openRoll(ctx, attempt.id, request.id, options);
  else openCombatRequests(ctx, attempt.id, options);
}
function chooseLibraryContent(ref, returnTo) {
  const target = parseLibraryReturn(returnTo);
  if (!target)
    throw Error(
      t("La destinazione non è più disponibile.", "The destination is no longer available."),
    );
  if (target.page === "builder") {
    commit(
      t("Contenuto scelto nella bozza", "Content selected in draft"),
      (state) => addHomebrewToCharacterDraft(state, ref, target, role),
      { local: true, visibility: "private" },
    );
    characterBuilder.resetCharacterBuilderView();
    navigate("builder", { id: target.draftId, tab: target.section });
    return;
  }
  validateLibraryCharacterChoice(store.state, ref, target, role);
  library.startHomebrew(ctx, {
    kind: target.instanceId ? "update" : "assign",
    ref,
    actorId: target.actorId,
    instanceId: target.instanceId,
    returnTo: target,
  });
}
function applyLibraryDraft(draftId, reviewKey) {
  const draft = getHomebrewDraft(store.state, draftId, role);
  const actor = store.state.actors[draft.actorId];
  if (!canControlActor(actor, role, store.state))
    throw Error(t("Non puoi modificare questa scheda.", "You cannot edit this sheet."));
  let result;
  commit(
    t("Contenuto applicato alla scheda", "Content applied to sheet"),
    (state) => {
      result = applyLibraryDraftToCharacter(state, draftId, reviewKey, role);
    },
    actor.visibility === "private" ? { local: true, visibility: "private" } : {},
  );
  return result;
}
const ctx = {
  chooseLibraryContent,
  applyLibraryDraft,
  get state() {
    return store.state;
  },
  get view() {
    return view;
  },
  get role() {
    return role;
  },
  get lang() {
    return lang;
  },
  get storageError() {
    return store.storageError;
  },
  get offline() {
    return offline;
  },
  // SV-34 (DDB reconnect banner): the real network (offline.mjs listens to the browser's
  // online/offline events) drives the same state as the demonstration switch. A network
  // return never lifts an offline mode the person switched on by hand.
  setNetworkOffline(next) {
    const value = Boolean(next);
    if (value === offline || (!value && offlineSource !== "network")) return false;
    offline = value;
    offlineSource = value ? "network" : null;
    registry.emit("offline-changed", { offline, source: "network" });
    render();
    return true;
  },
  t,
  label,
  esc,
  icon,
  navigate,
  render,
  commit,
  undo,
  canUndo: () => {
    const last = store.history.at(-1);
    return !!last && last.controller === role && !(offline && last.shared);
  },
  // The label of the change Undo would reverse, for this identity only.
  undoLabel: () => {
    const last = store.history.at(-1);
    return last && last.controller === role ? last.label : "";
  },
  dialog,
  closeDialog,
  toast,
  // B20 campaign policy (campaign-settings.mjs, PG-94): on the sheet page the DM edits a
  // player's character only while its owner allows it; the Table keeps its own authority.
  canControl: (actor) =>
    canControlActor(actor, role, store.state) &&
    !(
      role === "dm" &&
      view.page === "characters" &&
      actor?.owner &&
      actor.owner !== "dm" &&
      store.state.ext?.["campaign-settings"]?.campaigns?.[store.state.campaign?.id]?.policy
        ?.dmSheetEdit?.[actor.id] === false
    ),
  openNotes: () => service("notes"),
  openRest: (actorId) => restUI.openRest(ctx, { actorId }),
  openGameTime: () => restUI.openGameTime(ctx),
  startEncounter,
  openForms: (actorId, tab) => formsUI.openForms(ctx, { actorId, tab }),
  openCompanion: (actorId) => formsUI.openCompanion(ctx, { actorId }),
  beginCompanionPlacement: (actorId) => companionMap.beginCompanionPlacement(ctx, actorId),
  confirmCompanionAppearance: (options, done) =>
    companionMap.confirmCompanionAppearance(ctx, options, done),
  openSheet: (id, tab) => navigate("characters", { id, tab: tab || "actions" }),
  openConditions: (actorId, tab) => conditionsUI.openConditions(ctx, { actorId, tab }),
  conditionActor: (actorId, state = store.state) => getEffectiveActor(state.actors[actorId]),
  conditionBlocking: (actorId, state = store.state) => hasBlockingConsequences(state, actorId),
  conditionRolls: (actorId) => projectVitalityRolls(store.state, actorId, role),
  beginConditionRoll,
  openConditionRoll,
  // Panel commands run the same follow-ups as combat, plus manual-damage consequences.
  applyConditionFollowUps: (state, result) =>
    applyConditionFollowUps(state, result, { manual: true }),
  // Extension registry (B11): contributions, commands for the palette, settings, events.
  registry,
};
registry.attach(ctx);
// CA-10: another tab saved: this one shows the same data at once (its drafts keep their
// base revision, so saving a stale one opens compare and resume instead of overwriting).
store.onExternalChange(() => {
  registry.initState(store.state);
  toast(
    t(
      "Aggiornato con le modifiche salvate in un’altra scheda.",
      "Updated with changes saved in another tab.",
    ),
  );
  queueMicrotask(render);
});
// IN-10 trial banner: the data stays on this device; «Crea un account per salvare» keeps it.
function sandboxBanner() {
  if (!sandbox) return "";
  return `<p class="sandbox-banner" role="status" data-sandbox-banner><span><strong>${t("Sandbox", "Sandbox")}</strong>: ${t("i dati restano su questo dispositivo.", "your data stays on this device.")}</span><span class="sandbox-actions"><button type="button" class="button primary" data-sandbox-keep>${t("Crea un account per salvare", "Create an account to save")}</button><button type="button" class="button quiet" data-sandbox-exit>${t("Chiudi la prova", "Close the trial")}</button></span></p>`;
}
function bindSandbox() {
  document
    .querySelector("[data-sandbox-keep]")
    ?.addEventListener("click", () => navigate("account"));
  document.querySelector("[data-sandbox-exit]")?.addEventListener("click", () =>
    dialog(
      t("Chiudere la prova?", "Close the trial?"),
      `<p>${t("Personaggi, campagne e appunti creati nella prova vengono eliminati da questo dispositivo. L’account che era uscito resta com’era.", "Characters, campaigns and notes created in the trial are deleted from this device. The account that had signed out stays as it was.")}</p>`,
      {
        submitLabel: t("Chiudi la prova", "Close the trial"),
        cancelLabel: t("Continua a provare", "Keep trying"),
        onSubmit: () => {
          endSandbox(storage);
          location.hash = "#home";
          location.reload();
        },
      },
    ),
  );
}
const navItems = [
  ["home", "home", "Inizio", "Home"],
  ["characters", "person", "Personaggi", "Characters"],
  ["campaigns", "campaign", "Campagne", "Campaigns"],
  ["library", "book", "Biblioteca", "Library"],
];
const campaignItems = [
  ["overview", "Panoramica", "Overview"],
  ["group", "Gruppo", "Party"],
  ["sessions", "Sessioni", "Sessions"],
  ["journal", "Diario", "Journal"],
  ["world", "Mondo", "World"],
  ["preparation", "Preparazione", "Preparation"],
  ["settings", "Impostazioni", "Settings"],
];
const navButton = (page, glyph, it, en) =>
  `<button class="nav-link ${view.page === page || (page === "campaigns" && ["campaign", "preparation"].includes(view.page)) || (page === "characters" && view.page === "builder") ? "active" : ""}" data-nav="${page}">${icon(glyph)}<span>${t(it, en)}</span></button>`;
// Main navigation: core pages plus area pages declared nav: true (or core replacements).
const mergedNav = () =>
  registry
    .merge(
      "route",
      navItems.map(([id, glyph, it, en]) => ({ id, glyph, it, en })),
      ctx,
    )
    .filter((item) => item.core || item.nav || item.replaces)
    .map((item) =>
      item.core
        ? [item.id, item.glyph, item.it, item.en]
        : [
            item.id,
            item.icon ?? navItems.find((n) => n[0] === item.id)?.[1] ?? "book",
            esc(item.label.it),
            esc(item.label.en),
          ],
    );
const coreServices = [
  { id: "search", glyph: "search", it: "Cerca", en: "Search" },
  { id: "notes", glyph: "note", it: "Appunti personali", en: "Personal notes" },
  { id: "requests", glyph: "bell", it: "Richieste", en: "Requests" },
  { id: "preferences", glyph: "settings", it: "Preferenze", en: "Preferences" },
];
function serviceButtons() {
  return registry
    .merge("service", coreServices, ctx)
    .filter((s) => s.core || s.header || s.replaces)
    .map((s) => {
      const name = s.core ? t(s.it, s.en) : registry.label(s, lang);
      const glyph = s.icon ?? coreServices.find((core) => core.id === s.id)?.glyph ?? "book";
      // An area service may count its own badge (B24: unread notifications); otherwise
      // the Requests bell counts the notifications areas collect.
      const notices = s.badge
        ? Math.max(0, Math.trunc(Number(registry.call(s, "badge", 0, ctx)) || 0))
        : s.id === "requests"
          ? registry.notifications(ctx).length
          : 0;
      const count = notices
        ? ` · ${notices} ${notices === 1 ? t("notifica", "notification") : t("notifiche", "notifications")}`
        : "";
      return `<button class="icon-button${count ? " has-ext-count" : ""}" data-service="${esc(s.id)}" aria-label="${esc(name + count)}" title="${esc(name)}">${icon(glyph)}${count ? `<span class="ext-count" aria-hidden="true">${notices > 9 ? "9+" : notices}</span>` : ""}</button>`;
    })
    .join("");
}
function campaignNav() {
  // B20 campaign policy (campaign-settings.mjs, Kanka CMP-24): a section the DM turned
  // off leaves everyone's navigation.
  const hidden =
    store.state.ext?.["campaign-settings"]?.campaigns?.[store.state.campaign?.id]?.policy
      ?.hiddenSections ?? [];
  const items = registry
    .merge(
      "campaign-section",
      campaignItems.map(([id, it, en]) => ({
        id,
        it,
        en,
        group: CORE_CAMPAIGN_GROUPS[id],
        // C3: Preparation also opens to the member running the session (CA-57).
        roles:
          id === "settings" || (id === "preparation" && !runsSession(store.state, role))
            ? ["dm"]
            : undefined,
      })),
      ctx,
    )
    .filter((item) => !hidden.includes(item.id));
  const activeId = view.page === "preparation" ? "preparation" : campaign.getCampaignSection(ctx);
  const link = (item) =>
    `<button class="nav-link ${item.id === activeId ? "active" : ""}" data-campaign-tab="${esc(item.id)}">${item.core ? t(item.it, item.en) : esc(registry.label(item, lang))}</button>`;
  // B62: Kanka/World Anvil groups (CMP-23), collapsible and remembered per identity; the
  // group of the open section is always open (rail-groups.mjs).
  return campaignGroups(items, { role, active: activeId })
    .map((group) => {
      const name = esc(t(group.label.it, group.label.en));
      return `<div class="campaign-group${group.open ? " is-open" : ""}" data-campaign-group="${group.id}"><button type="button" class="campaign-group-toggle" data-campaign-group-toggle="${group.id}" aria-expanded="${group.open}" aria-controls="campaign-group-${group.id}"${group.holdsActive ? ' aria-disabled="true" title="' + esc(t("Contiene la sezione aperta", "Holds the open section")) + '"' : ""}><span class="campaign-group-name">${name}</span><span class="campaign-group-count" aria-hidden="true">${group.items.length}</span><span class="campaign-group-chevron" aria-hidden="true">›</span></button><div class="campaign-group-items" id="campaign-group-${group.id}" role="group" aria-label="${name}"${group.open ? "" : " hidden"}>${group.items.map(link).join("")}</div></div>`;
    })
    .join("");
}
// Owner-facing notice in the demonstration strip when an area failed or was contained.
function extensionNotice() {
  const { failed, warnings } = registry.report();
  const areas = new Set([...failed.map((row) => row.id), ...warnings.map((w) => w.extension)]);
  if (!areas.size) return "";
  return `<button data-service="scope" class="ext-alert">${t(
    `Aree aggiuntive: ${areas.size} con avvisi`,
    `Additional areas: ${areas.size} with warnings`,
  )}</button>`;
}
function render() {
  // Access gate (additive, B29 "sign in to continue"): while an area closes the app to
  // this identity (signed out), any page gives way to that area's page; the address keeps
  // the requested page (view.requested), which the area reopens after signing in.
  const gate = registry.accessGate(ctx);
  if (gate && view.page !== gate.page)
    view = { page: gate.page, id: "", tab: "", revision: "", returnTo: "", requested: view };
  if (view !== announcedView) {
    const from = announcedView?.page ?? null;
    announcedView = view;
    registry.emit("navigate", { page: view.page, id: view.id, tab: view.tab, from });
  }
  const isTable = view.page === "table";
  if (isTable) visitedTable = true;
  // Leaving the Table deactivates an active area tool (its mode is kept for the return).
  else leaveTable();
  document.documentElement.lang = lang;
  document.title =
    "d20 Studio · " +
    (isTable ? t("Tavolo", "Table") : t("Blueprint navigabile", "Navigable blueprint"));
  const campaignAccess = getCampaignHub(store.state, store.state.campaign.id, role).permissions
    .canRead;
  const inCampaign = campaignAccess && ["campaign", "preparation"].includes(view.page);
  const nav = mergedNav()
    .map((n) => navButton(...n))
    .join("");
  // An area page (or a core page an area replaces) renders in its own slot. A registered
  // page this identity cannot see says so instead of falling back to another page.
  const extRoute = registry.get("route", view.page, ctx);
  const lockedRoute = !extRoute && !routes.includes(view.page) && registry.get("route", view.page);
  // The Table, Preparation and the spectator view of the campaign in play (B14) are for
  // its members only (Roll20 SVC-031: a removed player loses access; also a DM who left).
  const outsider =
    !campaignAccess && ["table", "preparation", "session-view-display"].includes(view.page);
  const routeSlot = outsider ? null : extRoute;
  const main = routeSlot
    ? registry.slot("route", extRoute, ctx)
    : lockedRoute
      ? `<div class="empty-state"><h1>${t("Pagina non disponibile per questo ruolo", "Page not available for this role")}</h1><button class="button" data-nav="home">${t("Torna all’inizio", "Back to home")}</button></div>`
      : outsider
        ? `<div class="empty-state"><h1>${t("Non fai parte di questa campagna", "You are not in this campaign")}</h1><p>${t("Il Tavolo e la preparazione sono riservati ai membri della campagna in corso. Le tue campagne e gli inviti sono nella pagina Campagne.", "The Table and preparation are for members of the campaign in play. Your campaigns and invitations are on the Campaigns page.")}</p><button class="button" data-nav="campaigns">${t("Le tue campagne", "Your campaigns")}</button></div>`
        : isTable
          ? renderTable(ctx)
          : view.page === "characters"
            ? renderCharacters(ctx)
            : view.page === "builder"
              ? characterBuilder.renderCharacterBuilder(ctx)
              : view.page === "preparation"
                ? preparation.renderPreparation(ctx)
                : view.page === "home"
                  ? renderHome()
                  : view.page === "campaigns"
                    ? renderCampaigns()
                    : ["campaign", "notes"].includes(view.page)
                      ? campaign.renderCampaign(ctx)
                      : library.renderLibrary(ctx);
  document.querySelector("#app").innerHTML =
    `<aside class="demo-strip" aria-label="${t("Controlli della dimostrazione", "Demonstration controls")}"><span><strong>Blueprint</strong> ${t("in costruzione · dati di esempio", "in progress · sample data")}</span><div class="demo-controls"><label>${t("Visita come", "Visit as")} <select id="demo-role"><option value="player" ${role === "player" ? "selected" : ""}>${t("Giocatore", "Player")}</option><option value="dm" ${role === "dm" ? "selected" : ""}>DM</option></select></label><span id="ext-notice"></span><button data-service="scope">${t("Cosa è pronto", "What is ready")}</button><button data-service="reset">${t("Ripristina esempio", "Reset example")}</button></div></aside>
  <header class="app-header ${isTable ? "table-header" : ""}"><button class="brand" data-nav="home" aria-label="d20 Studio">${logo()}<span>d20 <b>Studio</b></span></button>${isTable ? `<button class="button quiet" data-service="app-menu">${icon("menu")} App</button><button class="button quiet" data-nav="campaign" aria-label="${t("Torna alla campagna", "Back to campaign")}" title="${t("Torna alla campagna", "Back to campaign")}">${icon("arrow")}<span>${t("Torna alla campagna", "Back to campaign")}</span></button>` : `<nav aria-label="${t("Navigazione principale", "Main navigation")}">${nav}</nav>`}<div class="service-nav">${serviceButtons()}</div></header>
  ${sandboxBanner()}
  ${store.storageError ? `<p class="save-warning" role="alert">${t("Salvataggio locale non disponibile o dati precedenti illeggibili. Le modifiche restano in questa scheda; i dati precedenti non vengono sovrascritti.", "Local saving is unavailable or previous data is unreadable. Changes remain in this tab; previous data is not overwritten.")}</p>` : ""}
  ${!isTable && !gate && visitedTable && campaignAccess ? `<div class="table-return"><button data-nav="table">${icon("play")} ${t("Torna al Tavolo", "Return to table")} · ${esc(store.state.campaign.name)}</button><span>${t("La partita rimane aperta", "Your game remains open")}</span></div>` : ""}
  <div class="workspace ${isTable ? "is-table" : ""} ${inCampaign ? "with-sidebar" : ""}">${
    inCampaign
      ? `<aside class="campaign-sidebar"><p class="muted">${t("Campagna", "Campaign")}</p><h2>${esc(store.state.campaign.name)}</h2><span class="badge">${role === "dm" ? "Dungeon Master" : esc(playerBadge())}</span><button class="button primary" data-nav="table">${icon("play")} ${t("Entra al Tavolo", "Enter table")}</button><div class="campaign-sections"><nav aria-label="${t("Sezioni della campagna", "Campaign sections")}">${campaignNav()}</nav><button type="button" class="nav-link campaign-sections-all" data-campaign-sections aria-haspopup="dialog" aria-label="${t("Tutte le sezioni", "All sections")}" title="${t("Tutte le sezioni", "All sections")}">${icon("grid")}<span aria-hidden="true">${t("Tutte", "All")}</span></button></div></aside>`
      : ""
  }<main id="content" tabindex="-1">${main}</main></div>`;
  // Shell handlers also wire data-nav/data-service controls rendered by area markup.
  bindShell();
  bindSandbox();
  // B61 review: on a phone the campaign sections are a sideways strip; the open one stays
  // in view (a strip drawn again starts at its beginning).
  scrollIntoStrip(
    document.querySelector(".campaign-sidebar nav"),
    document.querySelector(".campaign-sidebar nav .nav-link.active"),
  );
  const content = document.querySelector("#content");
  if (extRoute) registry.bindSlots(content, ctx, { points: ["route"] });
  else {
    if (isTable) bindTable(content, ctx);
    if (view.page === "characters") bindCharacters(content, ctx);
    if (view.page === "builder") characterBuilder.bindCharacterBuilder(content, ctx);
    if (view.page === "library") library.bindLibrary(content, ctx);
    if (["campaign", "notes"].includes(view.page)) campaign.bindCampaign(content, ctx);
    if (view.page === "preparation") preparation.bindPreparation(content, ctx);
    if (view.page === "home") registry.bindSlots(content, ctx, { points: ["home-widget"] });
  }
  restUI.refreshRestUI(ctx);
  formsUI.refreshFormsUI(ctx);
  conditionsUI.refreshConditionsUI(ctx);
  // TV-46: an open start dialog takes in the players' rolls saved since it opened.
  refreshTableInitiative(ctx);
  companionMap.bindMapPlacement(ctx);
  // Rendering and binding may have contained a failing area: the notice reflects it now.
  refreshExtensionNotice();
}
// The strip notice follows contained area failures (also from a command, service or tool
// between renders, through the registry logger); it opens the report at its section.
function refreshExtensionNotice() {
  const notice = document.querySelector("#ext-notice");
  if (!notice) return;
  notice.innerHTML = extensionNotice();
  notice
    .querySelector("[data-service]")
    ?.addEventListener("click", () => service("scope", { report: true }));
}
// The sidebar badge names this identity's campaign role and the character it plays in
// the campaign in play (B13 seats decide through canControlActor): Livia in the sample
// campaign, none for an observer or an unassigned seat.
function playerBadge() {
  const { actors, campaign: current } = store.state;
  const member = (current.members ?? []).find((entry) => entry.id === role);
  if (member?.role === "observer") return t("Osservatore", "Observer");
  const played = Object.values(actors).find(
    (actor) =>
      actor?.kind === "character" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      (actor.campaignIds === undefined || actor.campaignIds.includes(current.id)) &&
      (actor.owner === role || actor.controllers?.includes(role)) &&
      canControlActor(actor, role, store.state),
  );
  const title =
    member?.role === "dm"
      ? "Dungeon Master"
      : member?.role === "co-dm"
        ? "Co-DM"
        : t("Giocatore", "Player");
  return played ? `${title} · ${played.name}` : title;
}
function renderHome() {
  const a = store.state.actors.livia;
  const hub = getCampaignHub(store.state, store.state.campaign.id, role);
  if (!hub.permissions.canRead)
    return `<div class="page-heading"><div><h1>${t("La prossima avventura", "Your next adventure")}</h1><p>${t("Nessuna campagna accessibile. Le tue schede e le note personali rimangono raggiungibili.", "No accessible campaign. Your sheets and personal notes remain available.")}</p></div></div><div class="toolbar"><button class="button" data-nav="characters">${t("Personaggi", "Characters")}</button><button class="button" data-service="notes">${t("Appunti personali", "Personal notes")}</button></div>`;
  const recap = hub.latestRecap;
  const appointment = hub.upcomingSession;
  const scene = store.state.scenes.find((entry) => entry.id === store.state.activeSceneId);
  const sceneName =
    scene && (role === "dm" || scene.revealed) ? scene.name : t("La partita", "Your game");
  const appointmentZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const appointmentText = appointment?.startsAt
    ? new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: appointmentZone,
      }).format(new Date(appointment.startsAt))
    : "";
  // Home blocks: resume (10), character + recap (20), appointment (30), plus area widgets.
  const blocks = [
    {
      id: "resume",
      html: `<section class="resume-scene"><div class="scene-emblem" aria-hidden="true">${icon("map")}</div><div><h2>${esc(store.state.campaign.name)}</h2><p>${esc(sceneName)}</p><p class="muted">${t("Puoi entrare anche senza avviare un combattimento.", "You can enter without starting combat.")}</p><div class="toolbar"><button class="button primary" data-nav="table">${icon("play")} ${t("Entra al Tavolo", "Enter table")}</button><button class="button" data-nav="campaign">${t("Apri campagna", "Open campaign")}</button></div></div></section>`,
    },
    {
      id: "summary",
      html: `<div class="home-bottom"><section><div class="section-heading"><h2>${t("Il tuo personaggio", "Your character")}</h2></div>${a && canViewActor(a, role, store.state) ? `<button class="character-resume" data-open-sheet="livia"><span class="portrait">L</span><span><strong>${esc(a.name)}</strong><small>${esc(label(a.className))} · ${t("Livello", "Level")} ${a.level}</small></span><span class="hp-small">${a.hp} / ${a.maxHp}<small>${t("Punti ferita", "Hit points")}</small></span>${icon("book")}</button>` : `<p>${t("Apri Personaggi per scegliere una scheda accessibile.", "Open Characters to choose an accessible sheet.")}</p>`}</section>
  <section><div class="section-heading"><h2>${t("Dove eravamo rimasti", "Previously")}</h2></div>${recap ? `<h3>${esc(recap.data.title || t("Resoconto senza titolo", "Untitled recap"))}</h3><p>${esc(recap.data.body.slice(0, 240))}</p><button class="text-button" data-home-recap="${esc(recap.id)}">${t("Leggi il resoconto", "Read recap")}</button>` : `<p>${t("Nessun resoconto disponibile. Puoi comunque giocare.", "No recap available. You can still play.")}</p><button class="text-button" data-campaign-tab="journal">${t("Apri il diario", "Open the journal")}</button>`}</section></div>`,
    },
    {
      id: "appointment",
      html: `<section class="campaign-entry"><div><h2>${t("Prossimo appuntamento", "Next appointment")}</h2><p>${appointment ? esc(appointmentText) + " · " + esc(appointmentZone) : t("Nessun incontro programmato", "No session scheduled")}</p></div><button class="button" data-campaign-tab="sessions">${t("Apri sessioni", "Open sessions")}</button></section>`,
    },
  ];
  return `<div class="page-heading"><div><h1>${t("La prossima avventura", "Your next adventure")}</h1><p>${t("Ritrova il tuo personaggio. Il resto può aspettare.", "Find your character. The rest can wait.")}</p></div><button class="button" data-nav="characters">${icon("person")} ${t("I tuoi personaggi", "Your characters")}</button></div>
  ${registry
    .merge("home-widget", blocks, ctx)
    .map((b) => (b.core ? b.html : registry.slot("home-widget", b, ctx)))
    .join("")}`;
}
function renderCampaigns() {
  if (!getCampaignHub(store.state, store.state.campaign.id, role).permissions.canRead)
    return `<div class="page-heading"><h1>${t("Campagne", "Campaigns")}</h1></div><p>${t("Nessuna campagna accessibile.", "No accessible campaign.")}</p>`;
  return `<div class="page-heading"><div><h1>${t("Campagne", "Campaigns")}</h1><p>${t("I tuoi gruppi, con personaggi e materiali nello stesso posto.", "Your groups, characters and material in one place.")}</p></div></div><section class="campaign-entry"><div>${icon("campaign")}<h2>${esc(store.state.campaign.name)}</h2><p>${t("Livia e Doran · Osservatorio", "Livia and Doran · Observatory")}</p></div><div class="toolbar"><button class="button" data-nav="campaign">${t("Apri campagna", "Open campaign")}</button><button class="button primary" data-nav="table">${t("Entra al Tavolo", "Enter table")}</button></div></section><p class="development-note">${t("Creazione di altri gruppi e inviti: percorso ancora da costruire nel blueprint.", "Creating more groups and invitations: blueprint journey still under construction.")}</p>`;
}
function bindShell() {
  document.querySelectorAll("[data-home-recap]").forEach((button) => {
    button.onclick = () => navigate("campaign", { tab: "entry", id: button.dataset.homeRecap });
  });
  document.querySelectorAll("[data-public-scene]").forEach(
    (b) =>
      (b.onclick = () => {
        const scene = store.state.scenes.find((s) => s.id === b.dataset.publicScene && s.revealed);
        if (!scene) return;
        dialog(
          scene.name,
          `<p>${esc(scene.publicDescription || "")}</p><svg viewBox="0 0 ${scene.width} ${scene.height}" width="100%" aria-label="${t("Mappa rivelata", "Revealed map")}" role="img">${preparation.renderSceneBase(scene, ctx)}</svg>`,
          { cancelLabel: t("Chiudi", "Close") },
        );
      }),
  );

  document
    .querySelectorAll("[data-nav]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.nav)));
  document
    .querySelectorAll("[data-open-sheet]")
    .forEach((b) => (b.onclick = () => ctx.openSheet(b.dataset.openSheet)));
  const openSection = (b) =>
    (b.onclick = () => {
      closeDialog();
      navigate(b.dataset.campaignTab === "preparation" ? "preparation" : "campaign", {
        tab: b.dataset.campaignTab,
      });
    });
  document.querySelectorAll("[data-campaign-tab]").forEach(openSection);
  // B61 review: on a phone "All sections" lists every campaign section, also those
  // beyond the strip (D&D Beyond's quick-jump beside its swipeable sections, DDB-060).
  const allSections = document.querySelector("[data-campaign-sections]");
  if (allSections)
    allSections.onclick = () => {
      // B62: grouped as the rail, collapsed groups included.
      const groups = [...document.querySelectorAll(".campaign-sidebar nav [data-campaign-group]")];
      const button = (b) => {
        const on = b.classList.contains("active");
        return `<button type="button" class="button${on ? " active" : ""}" data-campaign-tab="${esc(b.dataset.campaignTab)}"${on ? ' aria-current="true"' : ""}>${esc(b.textContent)}</button>`;
      };
      dialog(
        t("Sezioni della campagna", "Campaign sections"),
        `<div class="dialog-menu table-panels-menu is-grouped">${groups
          .map(
            (group) =>
              `<section class="table-panels-group"><div class="table-panels-group-head"><h3>${esc(group.querySelector(".campaign-group-name")?.textContent ?? "")}</h3></div>${[...group.querySelectorAll("[data-campaign-tab]")].map(button).join("")}</section>`,
          )
          .join("")}</div>`,
        { cancelLabel: t("Chiudi", "Close") },
      );
      document.querySelectorAll("#dialog [data-campaign-tab]").forEach(openSection);
    };
  // B62: a campaign rail group opens or folds; the group of the open section stays open.
  document.querySelectorAll("[data-campaign-group-toggle]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.getAttribute("aria-disabled") === "true") return;
        const id = b.dataset.campaignGroupToggle;
        const open = b.getAttribute("aria-expanded") !== "true";
        rememberCampaignGroup(role, id, open);
        // Folded in place, not re-rendered: an unsaved draft on the page stays as typed.
        b.setAttribute("aria-expanded", String(open));
        b.closest("[data-campaign-group]")?.classList.toggle("is-open", open);
        const items = document.getElementById(b.getAttribute("aria-controls"));
        if (items) items.hidden = !open;
        // Close regression 01/10 (Finder and VS Code reveal what a folder unfolds): the
        // sections of a group unfolded near the window's bottom scroll into view.
        if (open) items?.scrollIntoView?.({ block: "nearest" });
      }),
  );
  document
    .querySelectorAll("[data-service]")
    .forEach((b) => (b.onclick = () => service(b.dataset.service)));
  document.querySelector("#demo-role").onchange = (e) => {
    const nextRole = e.target.value;
    e.target.value = role;
    const changeRole = () => {
      closeDialog();
      role = nextRole;
      registry.emit("role-changed", { role });
      preparation.resetPreparationDraft();
      characterBuilder.resetCharacterBuilderView();
      library.resetLibraryView();
      campaign.resetCampaignView();
      restUI.resetRestUI();
      formsUI.resetFormsUI();
      conditionsUI.resetConditionsUI();
      companionMap.resetMapPlacement();
      resetTableView();
      if (view.page === "library") navigate("library", {}, true);
      else if (view.page === "builder") navigate("characters", {}, true);
      else if (!runsSession(store.state, role) && view.page === "preparation")
        navigate("campaign", {}, true);
      else render();
    };
    // An area draft is asked too, also after a core draft was confirmed.
    const areaThenChange = () => {
      const guard = registry.pendingDraft(ctx, { ...view, role: nextRole });
      if (!guard || registry.call(guard, "confirm", guardFailed, ctx, changeRole) === guardFailed)
        changeRole();
    };
    if (["campaign", "notes"].includes(view.page) && campaign.hasCampaignDraft())
      campaign.confirmCampaignNavigation(ctx, areaThenChange);
    else if (view.page === "library" && library.hasLibraryDraft())
      library.confirmLibraryNavigation(ctx, areaThenChange);
    else if (view.page === "builder" && characterBuilder.hasCharacterBuilderDraft())
      characterBuilder.confirmCharacterBuilderNavigation(ctx, areaThenChange);
    else if (view.page === "preparation" && preparation.hasPreparationDraft())
      preparation.confirmPreparationNavigation(ctx, areaThenChange);
    else areaThenChange();
  };
}
// Area settings merged into Preferences, grouped by Foundry-style scope.
const settingScopes = () => [
  [
    "device",
    t("Su questo dispositivo", "On this device"),
    t("Restano in questo browser.", "They stay in this browser."),
  ],
  ["personal", t("Personali", "Personal"), t("Valgono solo per te.", "They apply to you only.")],
  [
    "campaign",
    t("Campagna", "Campaign"),
    role === "dm"
      ? t("Valgono per tutto il gruppo.", "They apply to the whole group.")
      : t(
          "Valgono per tutto il gruppo e solo il DM può cambiarle: chiedi a lui.",
          "They apply to the whole group and only the DM can change them: ask the DM.",
        ),
  ],
];
const settingName = (section, field) => `setting:${section.id}.${field.id}`;
function settingsHTML(sections) {
  return settingScopes()
    .map(([scope, title, hint]) => {
      const group = sections.filter((section) => section.scope === scope);
      if (!group.length) return "";
      // SV-37: a locked campaign setting names its cause and who can change it (the hint).
      const locked =
        scope === "campaign" && role !== "dm"
          ? ` disabled aria-describedby="ext-settings-hint-${scope}"`
          : "";
      return `<fieldset class="ext-settings" data-setting-scope="${scope}"><legend>${title}</legend><p class="muted" id="ext-settings-hint-${scope}">${hint}</p>${group
        .map(
          (section) =>
            `<h3>${esc(registry.label(section, lang))}</h3>${section.fields
              .map((field) => {
                const name = esc(settingName(section, field));
                const value = registry.getSetting(ctx, `${section.id}.${field.id}`);
                const text = esc(registry.label(field, lang));
                if (field.type === "boolean")
                  return `<label class="check-field"><input type="checkbox" name="${name}" ${value ? "checked" : ""}${locked}> ${text}</label>`;
                if (field.type === "choice")
                  return `<label class="field">${text}<select name="${name}"${locked}>${field.options.map((option, i) => `<option value="${i}" ${option.value === value ? "selected" : ""}>${esc(registry.label(option, lang))}</option>`).join("")}</select></label>`;
                if (field.type === "number")
                  return `<label class="field">${text}<input type="number" step="any" name="${name}" value="${esc(value)}"${field.min !== undefined ? ` min="${field.min}"` : ""}${field.max !== undefined ? ` max="${field.max}"` : ""}${locked}></label>`;
                return `<label class="field">${text}<input name="${name}" maxlength="${field.maxLength ?? 500}" value="${esc(value)}"${locked}></label>`;
              })
              .join("")}`,
        )
        .join("")}</fieldset>`;
    })
    .join("");
}
const localizedError = (it, en) => Object.assign(Error(en), { it, en });
// Reads and validates every changed area setting; throws before anything is applied.
function settingChanges(sections, data, nextOffline) {
  const changes = [];
  for (const section of sections) {
    const editable = section.scope !== "campaign" || role === "dm";
    if (!editable) continue;
    for (const field of section.fields) {
      const key = `${section.id}.${field.id}`;
      const name = settingName(section, field);
      const title = registry.label(field, "it");
      const titleEn = registry.label(field, "en");
      let value;
      if (field.type === "boolean") value = data.has(name);
      else if (field.type === "choice") value = field.options[Number(data.get(name))]?.value;
      else if (field.type === "number") {
        const raw = String(data.get(name) ?? "").trim();
        value = raw === "" ? NaN : Number(raw);
        if (
          !Number.isFinite(value) ||
          (field.min !== undefined && value < field.min) ||
          (field.max !== undefined && value > field.max)
        )
          throw localizedError(
            `Inserisci un numero valido per «${title}».`,
            `Enter a valid number for “${titleEn}”.`,
          );
      } else {
        value = String(data.get(name) ?? "");
        if (value.length > (field.maxLength ?? 500))
          throw localizedError(`«${title}» è troppo lungo.`, `“${titleEn}” is too long.`);
      }
      if (value === undefined)
        throw localizedError(
          `Scegli un valore per «${title}».`,
          `Choose a value for “${titleEn}”.`,
        );
      if (JSON.stringify(value) === JSON.stringify(registry.getSetting(ctx, key))) continue;
      if (section.scope === "campaign" && nextOffline)
        throw localizedError(
          "Sei senza rete: le impostazioni della campagna non possono essere salvate.",
          "You are offline: campaign settings cannot be saved.",
        );
      changes.push([key, value, section.scope]);
    }
  }
  return changes;
}
// The Requests bell: combat requests plus the notifications areas collect.
function openRequests() {
  openCombatRequests(ctx);
  const entries = registry.notifications(ctx);
  const body = document.querySelector("#dialog .dialog-body");
  if (!entries.length || !body) return;
  body.insertAdjacentHTML(
    "afterbegin",
    `<section class="ext-notifications" aria-labelledby="ext-notifications-title"><h3 id="ext-notifications-title">${t("Notifiche", "Notifications")}</h3><ul>${entries
      .map(
        (entry, i) =>
          `<li><span><strong>${esc(label(entry.title))}</strong>${entry.body ? `<small>${esc(label(entry.body))}</small>` : ""}<small class="muted">${esc(label(entry.sourceLabel))}</small></span>${typeof entry.target?.page === "string" ? `<button type="button" class="button quiet" data-ext-notification="${i}">${t("Apri", "Open")}</button>` : ""}</li>`,
      )
      .join("")}</ul></section>`,
  );
  body.querySelectorAll("[data-ext-notification]").forEach((button) => {
    const target = entries[Number(button.dataset.extNotification)].target;
    button.onclick = () => navigate(target.page, { ...(target.params ?? {}) });
  });
}
function service(name, { report = false } = {}) {
  // An area service (or an area replacing a core service) runs isolated.
  const extension = registry.get("service", name, ctx);
  if (extension) return void registry.run(extension, ctx);
  if (name === "app-menu") {
    // B61: header services the screen has no room for (Help on a phone at the Table) are
    // listed here too, as an overflow menu, so every service stays reachable.
    const hidden = [...document.querySelectorAll(".app-header .service-nav [data-service]")]
      .filter((button) => !button.getClientRects().length)
      .map((button) => ({
        id: button.dataset.service,
        name: button.getAttribute("aria-label") || button.getAttribute("title") || "",
        glyph: button.querySelector("svg")?.outerHTML ?? "",
      }));
    dialog(
      t("Apri nell’app", "Open in app"),
      `<div class="dialog-menu">${mergedNav()
        .map(
          (n) =>
            `<button type="button" class="button" data-jump="${esc(n[0])}">${icon(n[1])}${t(n[2], n[3])}</button>`,
        )
        .join(
          "",
        )}${hidden.map((s) => `<button type="button" class="button" data-jump-service="${esc(s.id)}">${s.glyph}${esc(s.name)}</button>`).join("")}</div>`,
      { cancelLabel: t("Resta al Tavolo", "Stay at table") },
    );
    document
      .querySelectorAll("[data-jump]")
      .forEach((b) => (b.onclick = () => navigate(b.dataset.jump)));
    document.querySelectorAll("[data-jump-service]").forEach(
      (b) =>
        (b.onclick = () => {
          closeDialog();
          service(b.dataset.jumpService);
        }),
    );
  }
  if (name === "scope")
    dialog(
      t("Questa visita cresce con l’app", "This visit grows with the app"),
      `<p>${t("Anteprima funzionale dell’intera app: tutte le funzioni censite sono presenti, raggiungibili nel loro contesto e collegate agli stessi dati d’esempio fra scheda, campagna e Tavolo. Usa «Visita come» per passare da Giocatore a DM e «Cerca» (⌘K) per trovare una funzione per nome.", "Functional preview of the whole app: every catalogued feature is present, reachable in its context and connected to the same sample data across sheet, campaign and Table. Use «Visit as» to switch between Player and DM, and «Search» (⌘K) to find a feature by name.")}</p><p>${t("L’aspetto grafico è provvisorio e verrà rifatto in una fase dedicata. Sono simulati, non servizi reali: rete e multiplayer, account e accesso, integrazioni esterne, assistente IA, dadi Bluetooth, tavoli pubblici e moderazione. I dati restano solo in questo browser.", "The visual look is provisional and will be redone in a dedicated phase. These are simulations, not real services: network and multiplayer, accounts and sign-in, external integrations, the AI assistant, Bluetooth dice, public tables and moderation. Data stays in this browser only.")}</p>${registry.reportHTML(ctx)}`,
      { cancelLabel: t("Continua la visita", "Continue visiting") },
    );
  // Opened from the strip notice: the area report, not the introduction, is in view.
  if (name === "scope" && report)
    document.querySelector("#dialog .ext-report")?.scrollIntoView({ block: "start" });
  if (name === "reset")
    dialog(
      t("Ripristinare l’esempio?", "Reset the example?"),
      `<p>${t("Cancella modifiche, scene e appunti di questa dimostrazione in questo browser.", "Deletes changes, scenes and notes from this demonstration in this browser.")}</p>`,
      {
        submitLabel: t("Ripristina", "Reset"),
        onSubmit: () => {
          store.reset();
          // Area slices are reseeded with the example, then announced to the areas.
          registry.initState(store.state);
          store.persist();
          registry.emit("reset", {});
          characterBuilder.resetCharacterBuilderView();
          library.resetLibraryView();
          campaign.resetCampaignView();
          restUI.resetRestUI();
          formsUI.resetFormsUI();
          conditionsUI.resetConditionsUI();
          companionMap.resetMapPlacement();
          preparation.resetPreparationDraft();
          resetTableView({ forget: true });
          resetCampaignRail({ forget: true });
          render();
        },
      },
    );
  if (name === "preferences") {
    const sections = registry.list("settings", ctx);
    dialog(
      t("Preferenze", "Preferences"),
      `<label class="field">${t("Lingua", "Language")}<select name="lang"><option value="it" ${lang === "it" ? "selected" : ""}>Italiano</option><option value="en" ${lang === "en" ? "selected" : ""}>English</option></select></label><label class="check-field"><input type="checkbox" name="offline" ${offline ? "checked" : ""}> ${t("Simula assenza di rete (solo dimostrazione)", "Simulate offline mode (demonstration only)")}</label><p class="muted">${t("I dati di esempio rimangono in questo browser. Nessun altro partecipante riceve gli aggiornamenti.", "Sample data stays in this browser. No other participant receives updates.")}</p>${settingsHTML(sections)}`,
      {
        submitLabel: t("Salva preferenze", "Save preferences"),
        onSubmit: (data) => {
          const nextLang = data.get("lang");
          const nextOffline = data.has("offline");
          // Every area setting is validated before anything changes.
          const changes = settingChanges(sections, data, nextOffline);
          const langChanged = nextLang !== lang;
          const offlineChanged = nextOffline !== offline;
          // A device write can still fail (storage): it runs before language and offline
          // mode change. Campaign writes need the new online state, so they run after.
          for (const [key, value, scope] of changes)
            if (scope === "device") registry.setSetting(ctx, key, value);
          lang = nextLang;
          if (offlineChanged) offlineSource = nextOffline ? "demo" : null;
          offline = nextOffline;
          for (const [key, value, scope] of changes)
            if (scope !== "device") registry.setSetting(ctx, key, value);
          if (langChanged) registry.emit("language-changed", { lang });
          if (offlineChanged) registry.emit("offline-changed", { offline });
          render();
        },
      },
    );
    // B22 hook: the Preferences area enriches the open dialog (scopes, live preview,
    // reset, DM proposals) without changing its fields or how they are saved.
    registry.emit("preferences:dialog", { form: document.querySelector("#dialog form") });
  }
  if (name === "search") {
    dialog(
      t("Cerca nell’app", "Search the app"),
      `<label class="field">${t("Personaggi, pagine e testi accessibili", "Characters, pages and accessible text")}<input name="query" type="search" autofocus placeholder="${t("Prova Livia o Tavolo", "Try Livia or Table")}"></label><div id="search-results"></div>`,
      { cancelLabel: t("Chiudi", "Close") },
    );
    const input = document.querySelector("[name=query]");
    const results = document.querySelector("#search-results");
    const draw = () => {
      const query = input.value.trim().toLocaleLowerCase();
      const pages = [
        ...navItems.map((n) => ({ title: t(n[2], n[3]), page: n[0], params: {} })),
        { title: t("Tavolo", "Table"), page: "table", params: {} },
        { title: t("Appunti personali", "Personal notes"), page: "notes", params: {} },
        ...Object.values(store.state.actors)
          .filter(
            (a) =>
              (a.kind === "character" || a.companion) &&
              canViewActor(a, role, store.state) &&
              (getCampaignHub(store.state, store.state.campaign.id, role).permissions.canRead ||
                a.owner === role),
          )
          .map((a) => ({ title: a.name, page: "characters", params: { id: a.id } })),
        ...registry
          .list("route", ctx)
          .filter((r) => r.nav && !r.replaces)
          .map((r) => ({ title: registry.label(r, lang), page: r.id, params: {} })),
      ].filter((entry) => entry.title.toLocaleLowerCase().includes(query));
      const entries = listCampaignEntries(store.state, { query }, role).map((entry) => ({
        title: entry.data.title || t("Voce senza titolo", "Untitled entry"),
        excerpt: entry.data.body.slice(0, 100),
        page: entry.kind === "note" ? "notes" : "campaign",
        params: { id: entry.id, tab: "entry" },
      }));
      // Area providers search their own permitted data (at most 20 results each).
      const provided = registry.search(ctx, input.value.trim()).map((r) => ({
        title: label(r.title),
        excerpt: r.excerpt ? label(r.excerpt) : registry.label({ label: r.providerLabel }, lang),
        page: r.page,
        params: r.params ?? {},
      }));
      const filtered = [...pages, ...entries, ...provided];
      results.innerHTML =
        filtered
          .map(
            (entry, i) =>
              `<button type="button" class="search-result" data-result="${i}"><span>${esc(entry.title)}${entry.excerpt ? `<small> · ${esc(entry.excerpt)}</small>` : ""}</span></button>`,
          )
          .join("") || `<p>${t("Nessun risultato", "No results")}</p>`;
      results.querySelectorAll("button").forEach((button, i) => {
        button.onclick = () => navigate(filtered[i].page, filtered[i].params);
      });
    };
    input.oninput = draw;
    draw();
  }
  if (name === "requests") openRequests();
  if (name === "notes") {
    const returnTo =
      view.page === "notes"
        ? view.returnTo
        : JSON.stringify({ page: view.page, ...routeParams(view) });
    navigate("notes", returnTo ? { returnTo } : {});
  }
  if (name === "new-journal")
    campaign.startCampaignEntry(ctx, {
      kind: "recap",
      returnTo: { page: "campaign", tab: "journal" },
    });
}
document.querySelector(".skip-link").onclick = (e) => {
  e.preventDefault();
  document.querySelector("#content").focus();
};
// Area command shortcuts (B23 palette reads the same registry). Core keys are reserved,
// so Table keys, Escape and Tab never reach an area command.
// Plain Enter/Space on a focused control activate it, and a text field keeps its editing
// keys, whatever an area registered (the registry also reserves most of them).
const EDITING_KEYS = ["Mod+A", "Mod+C", "Mod+V", "Mod+X", "Mod+Z", "Mod+Y", "Mod+Shift+Z"];
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.isComposing || document.querySelector("#dialog")?.open)
    return;
  const typing = event.target.closest?.("input,textarea,select,[contenteditable=true]");
  if (typing && !(event.ctrlKey || event.metaKey || event.altKey)) return;
  const shortcut = normalizeShortcut(event);
  if (typing && EDITING_KEYS.includes(shortcut)) return;
  if (
    ["Enter", "Space"].includes(shortcut) &&
    event.target.closest?.("button,a[href],summary,[role=button],input,select,textarea")
  )
    return;
  const command = registry.commandForKey(event, ctx);
  if (!command) return;
  event.preventDefault();
  registry.run(command, ctx);
});
// Final review X-06: right-click, long press or Shift+F10 on a character, an inventory row
// or a spell opens the menu of that row's own commands (Owlbear, Fantasy Grounds).
installContextMenus(document, (it, en) => t(it, en));
// Final review P1 (F4): each history entry gets a key; leaving a page remembers its scroll,
// a new page starts at the top with the focus on its title, Back and Forward restore.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const scrollMemory = createScrollMemory();
let entryKey = historyEntryKey();
function historyEntryKey() {
  let key = history.state?.d20Entry;
  if (key == null) {
    key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    history.replaceState({ ...(history.state ?? {}), d20Entry: key }, "", location.href);
  }
  return key;
}
function showView(next) {
  const prev = view;
  const fresh = isNewPage(prev, next);
  if (fresh) scrollMemory.remember(entryKey, window.scrollY);
  const key = historyEntryKey();
  const saved = fresh ? scrollMemory.recall(key) : null;
  entryKey = key;
  if (fresh) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  view = next;
  render();
  if (!fresh) return;
  if (saved)
    requestAnimationFrame(() => window.scrollTo({ top: saved, left: 0, behavior: "instant" }));
  const active = document.activeElement;
  if (!active || active === document.body || !active.isConnected) {
    const title = document.querySelector("#content h1");
    if (title) {
      if (!title.hasAttribute("tabindex")) title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    }
  }
}
window.addEventListener("hashchange", () => {
  const next = readRoute();
  const confirmedTarget = guardBypass !== null && guardBypass === location.hash;
  guardBypass = null;
  if (
    ["campaign", "notes"].includes(view.page) &&
    campaign.hasCampaignDraft() &&
    (next.page !== view.page ||
      next.id !== view.id ||
      next.tab !== view.tab ||
      next.revision !== view.revision)
  ) {
    history.replaceState(null, "", "#" + view.page + "?" + new URLSearchParams(routeParams(view)));
    campaign.confirmCampaignNavigation(ctx, () => navigate(next.page, routeParams(next), "core"));
    return;
  }
  if (
    view.page === "library" &&
    library.hasLibraryDraft() &&
    (next.page !== view.page ||
      next.id !== view.id ||
      next.tab !== view.tab ||
      next.revision !== view.revision)
  ) {
    history.replaceState(null, "", "#library?" + new URLSearchParams(routeParams(view)));
    library.confirmLibraryNavigation(ctx, () => navigate(next.page, routeParams(next), "core"));
    return;
  }
  if (
    view.page === "builder" &&
    characterBuilder.hasCharacterBuilderDraft() &&
    (next.page !== view.page || next.id !== view.id)
  ) {
    const oldParams = new URLSearchParams(routeParams(view));
    history.replaceState(null, "", "#" + view.page + "?" + oldParams);
    characterBuilder.confirmCharacterBuilderNavigation(ctx, () =>
      navigate(next.page, routeParams(next), "core"),
    );
    return;
  }
  if (
    view.page === "preparation" &&
    view.id &&
    preparation.hasPreparationDraft() &&
    (next.page !== view.page || next.id !== view.id)
  ) {
    const oldParams = new URLSearchParams(routeParams(view));
    history.replaceState(null, "", "#" + view.page + "?" + oldParams);
    preparation.confirmPreparationNavigation(ctx, () =>
      navigate(next.page, routeParams(next), "core"),
    );
    return;
  }
  const guard = !confirmedTarget && registry.pendingDraft(ctx, { ...next });
  if (guard) {
    history.replaceState(null, "", "#" + view.page + "?" + new URLSearchParams(routeParams(view)));
    const proceed = () => navigate(next.page, routeParams(next), true);
    if (registry.call(guard, "confirm", guardFailed, ctx, proceed) === guardFailed) proceed();
    return;
  }
  showView(next);
});
window.addEventListener("beforeunload", (event) => {
  if (
    preparation.hasPreparationDraft() ||
    characterBuilder.hasCharacterBuilderDraft() ||
    library.hasLibraryDraft() ||
    campaign.hasCampaignDraft() ||
    registry.pendingDraft(ctx, null)
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("error", (e) => toast(e.message, true));
render();
