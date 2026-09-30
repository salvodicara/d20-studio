// Area B55 — Simulated external integrations (Services). Entry module loaded by
// extensions.mjs through the B11 registry. DECLARED SIMULATION: no network call, reserved
// `.example` addresses, every real connection subject to an owner decision (GAP-17).
//
// Where it lives (B61 placement rules):
// - Campaign › Integrations (sidebar section, both roles), with five parts:
//   Modules (Foundry Manage Modules FVT-197 / Owlbear per-room extensions VTL-206, SVC-135),
//   Discord (Foundry to Discord relay SVC-121, Clash!/Rumble! webhook VTL-225, Avrae
//   `!campaign` SVC-116), Calendar (Sesh iCal SVC-065 and opt-in reminders SVC-064, the
//   latter stored in B24's own settings), Import (Avrae `!import`/`!update` DDB-194 with a
//   documented example format) and API and webhooks (Kanka CMP-213, DiceCloud API CMP-09).
// - Table: token menu "External sheet…" / "Open external sheet" (Owlbear Sheet from Beyond,
//   VTL-034) and a line in the Creature inspector when a readable link exists.
// - Command palette: download the next session (.ics) and open the integrations.
// Domain rules: integrations-domain.mjs. Synthetic data only.

import * as D from "./integrations-domain.mjs";
import { importCharacter } from "./character-library.mjs";

// W2b1 integration: the dice tray's domain (B34), loaded without making the integrations
// depend on it (null when that area is absent), so that its rolls are relayed as rolls.
let tray = null;
export const neighboursReady = import("./dice-tray-domain.mjs").then(
  (module) => (tray = module),
  () => null,
);
/**
 * A dice-tray roll (B34) writes one label-only log line and keeps it as `logLabel`: the relay
 * reads that line as its roll, as it read the Table's old free roll (the chat's `rollFor`
 * pairing: the latest record with that label made before the line). Unlike the chat it does
 * not depend on the viewer: the channel posts what the roll's audience makes public.
 */
export function trayRollFor(ctx) {
  const records = (tray && ctx.state.ext?.["dice-tray"]?.rolls) || [];
  if (!records.some((r) => typeof r.logLabel === "string")) return null;
  const used = new Set();
  return (entry) => {
    let match = null;
    for (const r of records)
      if (r.logLabel === entry.label && !used.has(r.id) && String(r.at) <= entry.time) match = r;
    if (!match) return null;
    used.add(match.id);
    const roll = tray.rollEvent(match);
    return {
      ...roll,
      actorName: roll.actorName ?? (match.by === "dm" ? "DM" : ctx.t("Giocatore", "Player")),
      kind: roll.kind === "skill" ? "check" : roll.kind,
      actionName: match.title ?? null,
    };
  };
}

const L = (it, en) => ({ it, en });
const SECTION = "integrations";
const TABS = [
  { id: "modules", module: null, label: L("Moduli", "Modules") },
  { id: "discord", module: "relay", label: L("Discord", "Discord") },
  { id: "calendar", module: "calendar", label: L("Calendario", "Calendar") },
  { id: "import", module: "import", label: L("Importa", "Import") },
  // Always listed: the first token switches the module on after a confirmation (SV-41).
  { id: "api", module: null, label: L("API e webhook", "API and webhooks") },
];
const REMINDERS = [
  ["remind-24h", L("24 ore prima", "24 hours before")],
  ["remind-1h", L("1 ora prima", "1 hour before")],
  ["remind-start", L("All’inizio", "At the start")],
];
const REMINDER_SECTION = "notifications";

// Per-viewer UI memory (never shared, cleared on role change): unsaved module switches,
// preview destination, import text and preview, API tester, a token shown once in this
// visit, the last imported character and focus to restore after a render.
const ui = {
  pending: null,
  moduleQuery: "",
  destination: "webhook",
  importText: "",
  importFile: "",
  parsed: null,
  imported: null,
  apiToken: "",
  apiEndpoint: "characters",
  apiResult: null,
  focus: null,
};
export function resetIntegrationsView() {
  Object.assign(ui, {
    pending: null,
    moduleQuery: "",
    destination: "webhook",
    importText: "",
    importFile: "",
    parsed: null,
    imported: null,
    apiToken: "",
    apiEndpoint: "characters",
    apiResult: null,
    focus: null,
  });
}

let registryRef = null;
const sliceOf = (state) => registryRef.slice(state, D.ID);
const cidOf = (ctx) => ctx.state.campaign?.id ?? null;
const record = (ctx) => D.campaignOf(sliceOf(ctx.state), cidOf(ctx));
const on = (ctx, id) => D.moduleOn(sliceOf(ctx.state), cidOf(ctx), id);
const isDm = (ctx) => ctx.role === "dm";
const say = (ctx, value) => ctx.label(value);
const locale = (ctx) => (ctx.lang === "en" ? "en-GB" : "it-IT");
function when(ctx, value, style = "short") {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(locale(ctx), { dateStyle: style, timeStyle: "short" });
  } catch {
    return String(value);
  }
}
// The market pattern a block follows, in words; census and gap IDs stay in the code
// comments and evidence, never in the interface (P9 SV-38).
const withoutIds = (text) =>
  String(text)
    .replace(/\s*\((?:\s*(?:[A-Z]{2,4}-\d{2,3}|B\d{2})\s*,?)+\)/g, "")
    .replace(/\s*\b(?:[A-Z]{2,4}-\d{2,3})\b/g, "")
    .replace(/\s+([;.,])/g, "$1")
    .trim();
const meta = (ctx, it, en) =>
  `<p class="int-meta">${ctx.t("Modello", "Pattern")}: ${ctx.esc(withoutIds(ctx.t(it, en)))}</p>`;
const errorText = (ctx, error) =>
  error?.it && error?.en ? ctx.t(error.it, error.en) : String(error?.message ?? error);

/** Commits one change on this area's slice; a refusal becomes an error toast. */
const tagged = (ctx, label) => ctx.t(D.LABEL_PREFIXES.it, D.LABEL_PREFIXES.en) + label;
function act(ctx, label, mutate, options = {}) {
  try {
    ctx.commit(tagged(ctx, label), (draft) => mutate(draft, sliceOf(draft)), options);
    return true;
  } catch (error) {
    ui.focus = null;
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
/** The same commit for a dialog form: a refusal is thrown and shown inside the dialog. */
function commitIn(ctx, label, mutate, options = {}) {
  ctx.commit(tagged(ctx, label), (draft) => mutate(draft, sliceOf(draft)), options);
}
/** A page form: a refusal is written next to the form (and announced), values stay. */
function formAct(ctx, form, label, mutate, options = {}) {
  let box = form.querySelector("[data-int-form-error]");
  try {
    ctx.commit(tagged(ctx, label), (draft) => mutate(draft, sliceOf(draft)), options);
    return true;
  } catch (error) {
    ui.focus = null;
    if (!box) {
      box = globalThis.document.createElement("p");
      box.className = "error int-form-error";
      box.setAttribute("role", "alert");
      box.setAttribute("data-int-form-error", "");
      form.prepend(box);
    }
    box.textContent = errorText(ctx, error);
    return false;
  }
}
function download(name, type, content) {
  const doc = globalThis.document;
  if (!doc?.createElement || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}
async function copy(ctx, text, input) {
  try {
    await globalThis.navigator.clipboard.writeText(text);
    ctx.toast(ctx.t("Copiato negli appunti.", "Copied to the clipboard."));
  } catch {
    input?.focus?.();
    input?.select?.();
    ctx.toast(
      ctx.t(
        "Copia non consentita dal browser: il testo è selezionato, premi Ctrl+C.",
        "The browser refused to copy: the text is selected, press Ctrl+C.",
      ),
    );
  }
}

// ---------------------------------------------------------------- section shell

// Like the party page's undo bar: this identity's last change, when it is one of this
// area's, can be reversed from here (the shell records the correction).
function undoBar(ctx) {
  const last = ctx.canUndo?.() ? (ctx.undoLabel?.() ?? "") : "";
  const prefix = [D.LABEL_PREFIXES.it, D.LABEL_PREFIXES.en].find((p) => last.startsWith(p));
  if (!prefix) return "";
  return `<p class="int-undo"><button type="button" class="button quiet" data-int-undo>${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(last.slice(prefix.length))}</button></p>`;
}
function visibleTabs(ctx) {
  return TABS.filter((tab) => !tab.module || on(ctx, tab.module));
}
function currentTab(ctx) {
  const tabs = visibleTabs(ctx);
  return tabs.find((tab) => tab.id === ctx.view.id)?.id ?? "modules";
}
export function renderSection(ctx) {
  if (!cidOf(ctx))
    return `<div class="empty-state"><h1>${ctx.t("Nessuna campagna aperta", "No campaign open")}</h1></div>`;
  if (ui.pending && ui.pending.cid !== cidOf(ctx)) ui.pending = null;
  const tab = currentTab(ctx);
  const nav = `<nav class="tabs int-tabs" aria-label="${ctx.t("Parti delle integrazioni", "Integration parts")}">${visibleTabs(
    ctx,
  )
    .map(
      (t) =>
        `<button type="button" class="${t.id === tab ? "active" : ""}" data-int-tab="${t.id}" ${t.id === tab ? 'aria-current="page"' : ""}>${ctx.esc(say(ctx, t.label))}</button>`,
    )
    .join("")}</nav>`;
  const body = {
    modules: modulesTab,
    discord: discordTab,
    calendar: calendarTab,
    import: importTab,
    api: apiTab,
  }[tab](ctx);
  return `<div class="int-page" data-int-page="${tab}"><header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.t("Integrazioni", "Integrations")}</h1><p class="muted">${ctx.esc(ctx.state.campaign?.name ?? "")}</p></div><p class="int-sim" role="note"><strong>${ctx.t("Simulazione", "Simulation")}</strong> ${ctx.t("Nessun dato lascia questo browser: nessuna chiamata di rete, indirizzi d’esempio. Un collegamento reale richiede una decisione del proprietario.", "No data leaves this browser: no network call, example addresses. A real connection needs an owner decision.")}</p></header>${nav}${undoBar(ctx)}${ctx.offline ? `<p class="int-offline" role="status">${ctx.t("Senza rete: le modifiche condivise sono sospese; anteprime, download e dati personali funzionano.", "Offline: shared changes are on hold; previews, downloads and personal data work.")}</p>` : ""}${body}</div>`;
}

// ---------------------------------------------------------------- Modules (FVT-197, VTL-206)

function pendingModules(ctx) {
  const saved = record(ctx).modules;
  return ui.pending?.cid === cidOf(ctx) ? { ...saved, ...ui.pending.modules } : { ...saved };
}
// SV-42: the feature areas of this build (a planned area not built here is not listed).
function builtAreas(ctx) {
  const built = new Set(
    (ctx.registry?.extensions?.() ?? [])
      .filter((row) => row.status === "built")
      .map((row) => row.id),
  );
  return D.FEATURE_AREAS.filter((area) => built.has(area.id));
}
function savedAreas(ctx) {
  const areas = record(ctx).areas ?? {};
  return Object.fromEntries(D.FEATURE_AREA_IDS.map((id) => [id, areas[id] !== false]));
}
function pendingAreas(ctx) {
  const saved = savedAreas(ctx);
  return ui.pending?.cid === cidOf(ctx) ? { ...saved, ...(ui.pending.areas ?? {}) } : saved;
}
// Areas the game, the table's safety and the campaign's data need: listed, never switched.
function coreAreas(ctx) {
  const optional = new Set([...D.FEATURE_AREA_IDS, D.ID]);
  return (ctx.registry?.extensions?.() ?? [])
    .filter((row) => row.status === "built" && !optional.has(row.id))
    .map((row) => say(ctx, row.title ?? row.id))
    .sort((a, b) => a.localeCompare(b, ctx.lang));
}
const matchesQuery = (ctx, texts) => {
  const q = String(ui.moduleQuery ?? "")
    .trim()
    .toLocaleLowerCase();
  return !q || texts.some((text) => say(ctx, text).toLocaleLowerCase().includes(q));
};
function switchRow(ctx, { kind, id, label, description, needs, state, changed }) {
  const hidden = matchesQuery(ctx, [label, description, ...needs]) ? "" : " hidden";
  const needText = needs.map((n) => say(ctx, n)).join(", ");
  const detail = `<span class="int-module-text"><strong>${ctx.esc(say(ctx, label))}</strong><small>${ctx.esc(say(ctx, description))}</small>${needText ? `<small>${ctx.t("Richiede", "Requires")}: ${ctx.esc(needText)}</small>` : ""}</span>`;
  const attr = kind === "area" ? "data-int-area" : "data-int-module";
  return isDm(ctx)
    ? `<li class="int-module ${changed ? "is-changed" : ""}" data-int-module-item${hidden}><label class="int-switch"><input type="checkbox" role="switch" ${attr}="${id}" ${state ? "checked" : ""}>${detail}<span class="int-state" aria-hidden="true">${state ? ctx.t("Attivo", "On") : ctx.t("Spento", "Off")}${changed ? " *" : ""}</span></label></li>`
    : `<li class="int-module" data-int-module-row="${id}" data-int-module-item${hidden}><div class="int-switch is-static">${detail}<span class="badge ${state ? "int-on" : ""}">${state ? ctx.t("Attivo", "On") : ctx.t("Spento", "Off")}</span></div></li>`;
}
function modulesTab(ctx) {
  const saved = record(ctx).modules;
  const shown = pendingModules(ctx);
  const areasSaved = savedAreas(ctx);
  const areasShown = pendingAreas(ctx);
  const areas = builtAreas(ctx);
  const dirty =
    D.MODULES.filter((m) => shown[m.id] !== saved[m.id]).length +
    areas.filter((a) => areasShown[a.id] !== areasSaved[a.id]).length;
  const rows = D.MODULES.map((m) =>
    switchRow(ctx, {
      kind: "module",
      id: m.id,
      label: m.label,
      description: m.description,
      needs: m.requires.map((id) => D.moduleOf(id).label),
      state: shown[m.id],
      changed: shown[m.id] !== saved[m.id],
    }),
  ).join("");
  const areaRows = areas
    .map((a) =>
      switchRow(ctx, {
        kind: "area",
        id: a.id,
        label: a.label,
        description: a.description,
        needs: a.requires.map((id) => D.featureOf(id).label),
        state: areasShown[a.id],
        changed: areasShown[a.id] !== areasSaved[a.id],
      }),
    )
    .join("");
  const anyOn = D.MODULES.some((m) => shown[m.id]) || areas.some((a) => areasShown[a.id] !== false);
  const core = coreAreas(ctx);
  const history = record(ctx).history.slice().reverse();
  const reasons = isDm(ctx)
    ? `${anyOn ? "" : `<p class="muted int-why" id="int-why-off">${ctx.t("È già tutto spento: riaccendi quello che ti serve.", "Everything is already off: switch back on what you need.")}</p>`}`
    : "";
  const search = `<label class="field int-module-search">${ctx.t("Cerca un modulo", "Search a module")}<input type="search" data-int-module-search value="${ctx.esc(ui.moduleQuery ?? "")}" placeholder="${ctx.esc(ctx.t("Es. mazzi, Discord, grafo", "E.g. decks, Discord, graph"))}" autocomplete="off"></label>`;
  const group = (title, html) =>
    html
      ? `<div class="int-module-group" data-int-module-group ${/data-int-module-item(?! hidden)>/.test(html) ? "" : "hidden"}><h3 class="int-group-title">${title}</h3><ul class="int-modules">${html}</ul></div>`
      : "";
  const lists = `${group(ctx.t("Funzioni dell’app", "App features"), areaRows)}${group(ctx.t("Integrazioni", "Integrations"), rows)}<p class="muted int-empty" data-int-module-empty ${matchesQuery(ctx, [...D.MODULES.flatMap((m) => [m.label, m.description]), ...areas.flatMap((a) => [a.label, a.description])]) ? "hidden" : ""}>${ctx.t("Nessun modulo con queste parole.", "No module with these words.")}</p>${core.length ? `<details class="int-core"><summary>${ctx.t(`Sempre attive (${core.length})`, `Always on (${core.length})`)}</summary><p class="muted">${ctx.t("Servono al gioco, alla sicurezza del tavolo e ai dati della campagna: non si spengono.", "The game, the table’s safety and the campaign’s data need them: they are not switched off.")}</p><ul class="int-core-list">${core.map((name) => `<li>${ctx.esc(name)}</li>`).join("")}</ul></details>` : ""}`;
  return `<section class="int-block" aria-labelledby="int-modules-title"><h2 id="int-modules-title">${ctx.t("Moduli di questa campagna", "Modules of this campaign")}</h2><p class="int-lead">${
    isDm(ctx)
      ? ctx.t(
          "Scegli quali funzioni e integrazioni usa il gruppo, poi salva. Sono tutte funzioni dell’app: nessun codice di terze parti. Un modulo spento sparisce per tutti in questa campagna (sezioni, comandi, pannelli e voci del menu della pedina); i suoi dati restano salvati e tornano quando lo riaccendi.",
          "Choose which features and integrations the group uses, then save. They are all app functions: no third-party code. A module switched off disappears for everyone in this campaign (sections, commands, panels and token-menu entries); its data stays saved and returns when you switch it back on.",
        )
      : ctx.t(
          "Le funzioni e le integrazioni che il DM ha attivato per questa campagna.",
          "The features and integrations the DM enabled for this campaign.",
        )
  }</p>${search}${
    isDm(ctx)
      ? `<form data-int-modules-form>${lists}<p class="int-pending" data-int-pending role="status" id="int-why-save">${dirty ? ctx.esc(ctx.t(`${dirty} ${dirty === 1 ? "modifica non salvata" : "modifiche non salvate"}`, `${dirty} unsaved ${dirty === 1 ? "change" : "changes"}`)) : ctx.t("Nessuna modifica da salvare. Cambia un interruttore qui sopra.", "No change to save. Flip a switch above.")}</p><div class="toolbar"><button type="submit" class="button primary" data-int-modules-save ${dirty ? "" : 'disabled aria-describedby="int-why-save"'}>${ctx.t("Salva le impostazioni dei moduli", "Save module settings")}</button><button type="button" class="button quiet" data-int-modules-reset ${dirty ? "" : 'disabled aria-describedby="int-why-save"'}>${ctx.t("Annulla le modifiche", "Discard changes")}</button><button type="button" class="button quiet" data-int-modules-off ${anyOn ? "" : 'disabled aria-describedby="int-why-off"'}>${ctx.t("Disattiva tutti", "Deactivate all")}</button></div>${reasons}</form>`
      : lists
  }${
    isDm(ctx)
      ? `<p class="muted int-note">${ctx.t("Per nascondere solo una sezione della campagna (Diario, Missioni, Tesoro…) e lasciare il resto dell’area, usa Impostazioni › Sezioni.", "To hide only a campaign section (Journal, Quests, Treasure…) and keep the rest of the area, use Settings › Sections.")} <button type="button" class="text-button" data-int-open-sections>${ctx.t("Apri Sezioni", "Open Sections")}</button></p>`
      : ""
  }${meta(ctx, "Foundry «Manage Modules» per mondo (FVT-197); Owlbear estensioni per stanza (VTL-206, SVC-135)", "Foundry “Manage Modules” per world (FVT-197); Owlbear per-room extensions (VTL-206, SVC-135)")}</section>${
    isDm(ctx)
      ? `<section class="int-block" aria-labelledby="int-history-title"><h2 id="int-history-title">${ctx.t("Storico delle integrazioni", "Integration history")}</h2>${
          history.length
            ? `<ol class="int-history" data-int-history>${history
                .slice(0, 12)
                .map(
                  (h) =>
                    `<li><time>${ctx.esc(when(ctx, h.at))}</time> <span>${ctx.esc(ctx.t(h.it, h.en))}</span> <small>${h.by === "dm" ? "DM" : ctx.t("Giocatore", "Player")}</small></li>`,
                )
                .join("")}</ol>`
            : `<p class="muted">${ctx.t("Nessuna modifica finora.", "No change so far.")}</p>`
        }</section>`
      : ""
  }`;
}
function changeModule(ctx, input) {
  const area = "intArea" in input.dataset;
  const id = area ? input.dataset.intArea : input.dataset.intModule;
  const value = input.checked;
  const current = area ? pendingAreas(ctx) : pendingModules(ctx);
  const next = { ...current, [id]: value };
  const extra = area
    ? D.areaDependencyChanges(next, id, value)
    : D.dependencyChanges(next, id, value);
  const labelOf = (other) => say(ctx, (area ? D.featureOf(other) : D.moduleOf(other)).label);
  const apply = (ids) => {
    const changed = { ...current, [id]: value };
    for (const other of ids) changed[other] = value;
    ui.pending = {
      cid: cidOf(ctx),
      modules: area ? pendingModules(ctx) : changed,
      areas: area ? changed : pendingAreas(ctx),
    };
    ui.focus = `[${area ? "data-int-area" : "data-int-module"}="${id}"]`;
    ctx.render();
  };
  if (!extra.length) return apply([]);
  // Foundry's dependency prompt: nothing changes until the choice is confirmed.
  input.checked = !value;
  const names = extra.map((other) => `«${labelOf(other)}»`).join(", ");
  const name = `«${labelOf(id)}»`;
  ctx.dialog(
    value
      ? ctx.t("Serve un altro modulo", "Another module is needed")
      : ctx.t("Altri moduli dipendono da questo", "Other modules depend on this one"),
    `<p data-int-dependency>${ctx.esc(
      value
        ? ctx.t(
            `${name} richiede ${names}. Attivarlo insieme?`,
            `${name} requires ${names}. Enable it too?`,
          )
        : ctx.t(
            `${names} dipende da ${name}. Spegnerlo insieme?`,
            `${names} depends on ${name}. Switch it off too?`,
          ),
    )}</p>`,
    {
      submitLabel: value
        ? ctx.t("Attiva entrambi", "Enable both")
        : ctx.t("Spegni entrambi", "Switch both off"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: () => apply(extra),
    },
  );
}
/** Foundry's «Deactivate All Modules»: every switch off, still to be saved. */
function deactivateAll(ctx) {
  ui.pending = {
    cid: cidOf(ctx),
    modules: Object.fromEntries(D.MODULES.map((m) => [m.id, false])),
    areas: Object.fromEntries(D.FEATURE_AREA_IDS.map((id) => [id, false])),
  };
  ui.focus = "[data-int-modules-save]";
  ctx.render();
}
function saveModules(ctx) {
  const modules = pendingModules(ctx);
  const areas = pendingAreas(ctx);
  ui.focus = "[data-int-module]";
  const ok = act(
    ctx,
    ctx.t("Moduli delle integrazioni salvati", "Integration modules saved"),
    (draft, slice) => D.saveFeatures(slice, cidOf(ctx), { modules, areas }, ctx.role),
  );
  if (ok) {
    ui.pending = null;
    ctx.toast(
      ctx.t(
        "Moduli salvati: valgono per tutto il gruppo.",
        "Modules saved: they apply to the whole group.",
      ),
    );
  }
}

// ---------------------------------------------------------------- Discord (SVC-121, SVC-116)

function destinations(ctx) {
  const rec = record(ctx);
  const out = [];
  if (rec.relay.webhook) out.push({ id: "webhook", text: `#${rec.relay.channel} · webhook` });
  if (on(ctx, "avrae"))
    for (const link of rec.avrae.links)
      out.push({ id: link.id, text: `#${link.channel} · ${link.server} · Avrae` });
  return out;
}
function messageHTML(ctx, message) {
  const kinds = {
    roll: L("Tiro", "Roll"),
    event: L("Evento", "Event"),
    session: L("Sessione", "Session"),
    journal: L("Diario", "Journal"),
    note: L("Nota", "Note"),
  };
  const retract =
    message.kind === "note" && isDm(ctx)
      ? `<button type="button" class="button quiet int-retract" data-int-retract="${ctx.esc(message.noteId)}">${ctx.t("Ritira…", "Withdraw…")}</button>`
      : "";
  return `<li class="int-msg int-msg-${message.kind} ${message.reversed ? "is-reversed" : ""}" data-int-msg="${ctx.esc(message.id)}"><span class="int-avatar" aria-hidden="true">d20</span><div class="int-msg-body"><p class="int-msg-head"><strong>d20 Studio</strong><span class="int-app">APP</span><span class="int-kind">${ctx.esc(say(ctx, kinds[message.kind]))}</span><time>${ctx.esc(when(ctx, message.at))}</time></p><p class="int-msg-text">${ctx.esc(message.text)}${message.reversed ? ` <em>(${ctx.t("annullato con una correzione", "undone by a correction")})</em>` : ""}</p></div>${retract}</li>`;
}
function previewHTML(ctx) {
  const options = destinations(ctx);
  if (!options.length)
    return `<p class="muted" data-int-preview-empty>${ctx.t("Nessun canale configurato: niente verrebbe inviato.", "No channel set up: nothing would be sent.")}</p>`;
  if (!options.some((o) => o.id === ui.destination)) ui.destination = options[0].id;
  const preview = D.relayPreview(ctx.state, sliceOf(ctx.state), cidOf(ctx), {
    destination: ui.destination,
    lang: ctx.lang,
    viewer: ctx.role,
    rollFor: trayRollFor(ctx),
  });
  // Only the DM sees how many private items were held back: a player never learns that
  // hidden rolls happened (the channel members would not either).
  const withheld = [];
  if (isDm(ctx) && preview.privateRolls)
    withheld.push(
      ctx.t(
        `${preview.privateRolls} ${preview.privateRolls === 1 ? "tiro privato" : "tiri privati"}`,
        `${preview.privateRolls} private ${preview.privateRolls === 1 ? "roll" : "rolls"}`,
      ),
    );
  if (isDm(ctx) && preview.privateEvents)
    withheld.push(
      ctx.t(
        `${preview.privateEvents} ${preview.privateEvents === 1 ? "evento privato" : "eventi privati"}`,
        `${preview.privateEvents} private ${preview.privateEvents === 1 ? "event" : "events"}`,
      ),
    );
  return `<label class="field int-destination">${ctx.t("Canale", "Channel")}<select data-int-destination>${options
    .map(
      (o) =>
        `<option value="${ctx.esc(o.id)}" ${o.id === ui.destination ? "selected" : ""}>${ctx.esc(o.text)}</option>`,
    )
    .join(
      "",
    )}</select></label><div class="int-channel" role="log" aria-label="${ctx.t("Anteprima del canale", "Channel preview")}" data-int-preview>${
    preview.messages.length
      ? `<ol class="int-feed">${preview.messages.map((m) => messageHTML(ctx, m)).join("")}</ol>`
      : `<p class="muted int-feed-empty">${ctx.t("Ancora nessun messaggio: i tiri pubblici e gli avvisi compariranno qui.", "No message yet: public rolls and notices will appear here.")}</p>`
  }</div><p class="int-withheld" data-int-withheld>${
    withheld.length
      ? ctx.esc(
          ctx.t(
            `Non inoltrati: ${withheld.join(" e ")}. Il loro contenuto non lascia mai l’app.`,
            `Not relayed: ${withheld.join(" and ")}. Their content never leaves the app.`,
          ),
        )
      : ctx.t(
          "I tiri privati e gli eventi privati non vengono mai inoltrati.",
          "Private rolls and private events are never relayed.",
        )
  } ${ctx.t("Nessuna richiesta di rete: è un’anteprima locale.", "No network request: this is a local preview.")}</p>`;
}
function discordTab(ctx) {
  const rec = record(ctx);
  const relay = rec.relay;
  const events = D.RELAY_EVENTS.map(
    (e) =>
      `<label class="check-field"><input type="checkbox" name="event-${e.id}" ${relay.events[e.id] ? "checked" : ""}> ${ctx.esc(say(ctx, e.label))}</label>`,
  ).join("");
  const settings = isDm(ctx)
    ? `<form class="int-form" data-int-relay-form><label class="field">${ctx.t("Indirizzo del webhook Discord", "Discord webhook address")}<input name="webhook" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${relay.webhook ? ctx.esc(D.maskWebhook(relay.webhook)) : "https://discord.com/api/webhooks/…"}" aria-describedby="int-webhook-help"></label><p class="int-help" id="int-webhook-help">${relay.webhook ? ctx.esc(ctx.t(`Configurato: ${D.maskWebhook(relay.webhook)}. Lascia vuoto per mantenerlo; un indirizzo nuovo è un canale nuovo.`, `Set up: ${D.maskWebhook(relay.webhook)}. Leave empty to keep it; a new address is a new channel.`)) : ctx.t("Discord › Impostazioni del server › Integrazioni › Webhook › Copia URL. Resta visibile solo al DM.", "Discord › Server Settings › Integrations › Webhooks › Copy URL. Only the DM sees it.")}</p>${relay.webhook ? `<p class="int-remove"><button type="button" class="button quiet" data-int-relay-remove>${ctx.t("Rimuovi il webhook…", "Remove the webhook…")}</button></p>` : ""}<label class="field">${ctx.t("Nome del canale", "Channel name")}<input name="channel" required maxlength="100" value="${ctx.esc(relay.channel)}" placeholder="tavolo"></label><fieldset class="int-events"><legend>${ctx.t("Cosa inoltrare", "What to relay")}</legend>${events}</fieldset><div class="toolbar"><button type="submit" class="button primary">${ctx.t("Salva l’inoltro", "Save the relay")}</button></div></form>`
    : `<p class="int-lead" data-int-relay-status>${
        relay.webhook
          ? ctx.esc(
              ctx.t(
                `Il DM inoltra nel canale #${relay.channel}: ${
                  D.RELAY_EVENTS.filter((e) => relay.events[e.id])
                    .map((e) => e.label.it.toLowerCase())
                    .join(", ") || "niente"
                }.`,
                `The DM relays to #${relay.channel}: ${
                  D.RELAY_EVENTS.filter((e) => relay.events[e.id])
                    .map((e) => e.label.en.toLowerCase())
                    .join(", ") || "nothing"
                }.`,
              ),
            )
          : ctx.t(
              "Il DM non ha ancora configurato un canale.",
              "The DM has not set up a channel yet.",
            )
      } ${ctx.t("I tuoi tiri privati e le tue schede private non vengono mai inoltrati.", "Your private rolls and private sheets are never relayed.")}</p>`;
  const note = isDm(ctx)
    ? `<form class="int-form int-note-form" data-int-note-form><label class="field">${ctx.t("Nota con orario per il canale", "Timestamped note for the channel")}<textarea name="note" rows="2" maxlength="${D.MAX_NOTE}" placeholder="${ctx.t("Prossima sessione: portate le mappe della torre.", "Next session: bring the tower maps.")}"></textarea></label><div class="toolbar"><button type="submit" class="button">${ctx.t("Invia nota al canale", "Send note to the channel")}</button></div></form>`
    : "";
  return `<section class="int-block" aria-labelledby="int-relay-title"><h2 id="int-relay-title">${ctx.t("Inoltro a Discord", "Discord relay")}</h2>${settings}${meta(ctx, "Foundry to Discord e moduli di inoltro (SVC-121); webhook di Clash!/Rumble! su Owlbear (VTL-225)", "Foundry to Discord and relay modules (SVC-121); Clash!/Rumble! webhooks on Owlbear (VTL-225)")}</section><section class="int-block" aria-labelledby="int-preview-title"><h2 id="int-preview-title">${ctx.t("Anteprima del canale (simulata)", "Channel preview (simulated)")}</h2>${previewHTML(ctx)}${note}</section>${on(ctx, "avrae") ? avraeBlock(ctx) : ""}`;
}
function avraeBlock(ctx) {
  const rec = record(ctx);
  const command = D.avraeCommand(cidOf(ctx));
  const links = rec.avrae.links;
  return `<section class="int-block" aria-labelledby="int-avrae-title"><h2 id="int-avrae-title">${ctx.t("Collegamento Avrae", "Avrae link")}</h2><p class="int-lead">${ctx.t("Nel canale Discord il DM scrive il comando: da lì Avrae riporta i tiri pubblici della campagna.", "In the Discord channel the DM types the command: from then on Avrae posts the campaign’s public rolls.")}</p><div class="int-command"><input readonly value="${ctx.esc(command)}" aria-label="${ctx.t("Comando Avrae", "Avrae command")}" data-int-avrae-command><button type="button" class="button" data-int-copy-command>${ctx.t("Copia", "Copy")}</button></div>${
    isDm(ctx)
      ? `<form class="int-form int-inline" data-int-avrae-form><p class="int-help">${ctx.t("Simula la risposta di Avrae dopo il comando:", "Simulate Avrae’s answer after the command:")}</p><label class="field">${ctx.t("Server", "Server")}<input name="server" required maxlength="100" value="${ctx.esc(ctx.state.campaign?.name ?? "")}"></label><label class="field">${ctx.t("Canale", "Channel")}<input name="channel" required maxlength="100" placeholder="tiri"></label><div class="toolbar"><button type="submit" class="button">${ctx.t("Collega il canale (simulato)", "Link the channel (simulated)")}</button></div></form>`
      : ""
  }${
    links.length
      ? `<ul class="item-list int-links" data-int-links>${links
          .map(
            (l) =>
              `<li class="item-row" data-int-link="${ctx.esc(l.id)}"><div><strong>#${ctx.esc(l.channel)}</strong><small>${ctx.esc(l.server)} · ${ctx.t("collegato il", "linked on")} ${ctx.esc(when(ctx, l.linkedAt))}</small></div>${isDm(ctx) ? `<button type="button" class="button danger" data-int-unlink="${ctx.esc(l.id)}">${ctx.t("Scollega", "Unlink")}</button>` : ""}</li>`,
          )
          .join("")}</ul>`
      : `<p class="muted" data-int-links-empty>${ctx.t("Nessun canale collegato.", "No linked channel.")}</p>`
  }${meta(ctx, "Avrae «!campaign» con elenco e rimozione dei collegamenti (SVC-116, DDB-195)", "Avrae “!campaign” with listed and removable links (SVC-116, DDB-195)")}</section>`;
}
function retractNote(ctx, noteId) {
  ctx.dialog(
    ctx.t("Ritira la nota dal canale", "Withdraw the note from the channel"),
    `<p>${ctx.t("Il messaggio sparisce dal canale; il motivo resta nello storico delle integrazioni.", "The message leaves the channel; the reason stays in the integration history.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" required minlength="3" maxlength="${D.MAX_REASON}" rows="2"></textarea></label>`,
    {
      submitLabel: ctx.t("Ritira", "Withdraw"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: (data) => {
        commitIn(
          ctx,
          ctx.t("Nota ritirata dal canale Discord", "Note withdrawn from the Discord channel"),
          (draft, slice) =>
            D.retractRelayNote(slice, cidOf(ctx), noteId, data.get("reason"), ctx.role),
        );
      },
    },
  );
}

// ---------------------------------------------------------------- Calendar (SVC-065, SVC-064)

function sessionTime(ctx, session) {
  try {
    return new Intl.DateTimeFormat(locale(ctx), {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: session.timeZone || "UTC",
    }).format(new Date(session.startsAt));
  } catch {
    return session.startsAt;
  }
}
function reminderBlock(ctx) {
  if (!registryRef?.get("settings", REMINDER_SECTION)) return "";
  const value = (id) => {
    try {
      return registryRef.getSetting(ctx, `${REMINDER_SECTION}.${id}`) === true;
    } catch {
      return false;
    }
  };
  return `<section class="int-block" aria-labelledby="int-reminders-title"><h2 id="int-reminders-title">${ctx.t("Promemoria nell’app", "In-app reminders")}</h2><p class="int-lead">${ctx.t("Solo per te: arrivano nella campana delle notifiche e mai fuori dall’app. Nessun promemoria finché non lo scegli.", "Just for you: they arrive in the notification bell and never outside the app. No reminder until you choose one.")}</p><fieldset class="int-events"><legend>${ctx.t("Avvisami", "Remind me")}</legend>${REMINDERS.map(
    ([id, label]) =>
      `<label class="check-field"><input type="checkbox" data-int-reminder="${id}" ${value(id) ? "checked" : ""}> ${ctx.esc(say(ctx, label))}</label>`,
  ).join(
    "",
  )}</fieldset>${meta(ctx, "Sesh, promemoria scelti da chi li riceve (SVC-064); stesse scelte delle Notifiche (B24)", "Sesh, reminders chosen by who receives them (SVC-064); the same choices as Notifications (B24)")}</section>`;
}
function calendarTab(ctx) {
  const rec = record(ctx);
  const next = D.nextSession(ctx.state, ctx.role);
  const upcoming = D.upcomingSessions(ctx.state, ctx.role);
  const feed = D.feedOf(sliceOf(ctx.state), ctx.role);
  const duration = rec.calendar.durationHours;
  const nextBlock = next
    ? `<div class="int-next" data-int-next="${ctx.esc(next.id)}"><p class="int-next-title"><strong>${ctx.esc(next.title || ctx.t("Sessione", "Session"))}</strong></p><p data-int-next-time>${ctx.esc(sessionTime(ctx, next))} <small>(${ctx.esc(next.timeZone || "UTC")})</small></p><p class="muted">${ctx.esc(ctx.t(`Durata nel calendario: ${duration} h`, `Calendar duration: ${duration} h`))}</p><div class="toolbar"><button type="button" class="button primary" data-int-ics>${ctx.t("Scarica .ics", "Download .ics")}</button></div></div>`
    : `<div class="empty-state int-empty" data-int-no-session><p>${ctx.t("Nessuna sessione in programma.", "No session scheduled.")}</p><button type="button" class="button" data-int-open-sessions>${ctx.t("Apri Sessioni", "Open Sessions")}</button></div>`;
  const durationField = isDm(ctx)
    ? `<label class="field int-duration">${ctx.t("Durata indicata nel calendario", "Duration shown in calendars")}<select data-int-duration>${D.DURATIONS.map((h) => `<option value="${h}" ${h === duration ? "selected" : ""}>${h} h</option>`).join("")}</select></label>`
    : "";
  const feedBlock = feed
    ? `<div class="int-command"><input readonly value="${ctx.esc(D.feedUrl(cidOf(ctx), feed.token))}" aria-label="${ctx.t("Link del tuo calendario", "Your calendar link")}" data-int-feed-url><button type="button" class="button" data-int-feed-copy>${ctx.t("Copia", "Copy")}</button></div><p class="int-help">${ctx.esc(ctx.t(`Creato il ${when(ctx, feed.createdAt)}.`, `Created on ${when(ctx, feed.createdAt)}.`))}${feed.retired?.length ? ctx.esc(ctx.t(` Link ritirati: ${feed.retired.map((t) => "…" + t).join(", ")}.`, ` Retired links: ${feed.retired.map((t) => "…" + t).join(", ")}.`)) : ""}</p><div class="toolbar"><button type="button" class="button" data-int-feed-download ${upcoming.length ? "" : 'disabled aria-describedby="int-feed-empty"'}>${ctx.t("Scarica il feed (.ics)", "Download the feed (.ics)")}</button>${upcoming.length ? "" : `<span class="muted" id="int-feed-empty">${ctx.t("Nessuna sessione in programma: fissane una in Sessioni.", "No session scheduled: set one in Sessions.")}</span>`}<button type="button" class="button quiet" data-int-feed-rotate>${ctx.t("Rigenera il link…", "Regenerate the link…")}</button></div><details class="int-details"><summary>${ctx.esc(ctx.t(`Contenuto del feed (${upcoming.length} ${upcoming.length === 1 ? "sessione" : "sessioni"})`, `Feed content (${upcoming.length} ${upcoming.length === 1 ? "session" : "sessions"})`))}</summary><pre data-int-feed-content>${ctx.esc(D.buildIcs(ctx.state, upcoming, { durationHours: duration, lang: ctx.lang }))}</pre></details>`
    : `<div class="toolbar"><button type="button" class="button" data-int-feed-create>${ctx.t("Crea il mio link del calendario", "Create my calendar link")}</button></div>`;
  return `<section class="int-block" aria-labelledby="int-next-title"><h2 id="int-next-title">${ctx.t("Prossima sessione", "Next session")}</h2>${nextBlock}${durationField}${meta(ctx, "Sesh, file e feed iCal (SVC-065)", "Sesh, iCal file and feed (SVC-065)")}</section><section class="int-block" aria-labelledby="int-feed-title"><h2 id="int-feed-title">${ctx.t("Feed del calendario", "Calendar feed")}</h2><p class="int-lead">${ctx.t("Un link personale da aggiungere a Google Calendar, Apple Calendario o Outlook: si aggiornerebbe da solo con le sessioni. Qui è simulato: l’indirizzo non raggiunge nessun server.", "A personal link to add to Google Calendar, Apple Calendar or Outlook: it would update itself with the sessions. Simulated here: the address reaches no server.")}</p>${feedBlock}</section>${reminderBlock(ctx)}`;
}
function downloadNext(ctx) {
  const next = D.nextSession(ctx.state, ctx.role);
  if (!next) {
    ctx.toast(ctx.t("Nessuna sessione in programma.", "No session scheduled."), true);
    return false;
  }
  const text = D.buildIcs(ctx.state, [next], {
    durationHours: record(ctx).calendar.durationHours,
    lang: ctx.lang,
  });
  download(D.icsFileName(ctx.state, next), "text/calendar;charset=utf-8", text);
  ctx.toast(
    ctx.t(
      "File .ics scaricato: aprilo con il tuo calendario.",
      "The .ics file is downloaded: open it with your calendar.",
    ),
  );
  return true;
}

// ---------------------------------------------------------------- Add to calendar (CA-47, SV-39)
// On each session card and on Home's next appointment (Sesh `/link`, StartPlaying «Add to
// calendar», Roll20's «Next Game» card): the session's own .ics file or the personal link
// that updates itself, and the reminder bell with the same choices as Preferenze ›
// Notifiche (one setting, never a second copy).
function sessionOf(ctx, sessionId) {
  return (ctx.state.campaign?.sessions ?? []).find((row) => row.id === sessionId) ?? null;
}
function calendarReady(ctx) {
  return Boolean(cidOf(ctx)) && on(ctx, "calendar");
}
function reminderValue(ctx, id) {
  try {
    return registryRef.getSetting(ctx, `${REMINDER_SECTION}.${id}`) === true;
  } catch {
    return false;
  }
}
const remindersOn = (ctx) => REMINDERS.filter(([id]) => reminderValue(ctx, id));
export function sessionCalendarHTML(ctx, row) {
  if (!calendarReady(ctx) || row?.status !== "scheduled" || !row.startsAt) return "";
  if (Date.parse(row.startsAt) < Date.now()) return "";
  const active = remindersOn(ctx);
  const bell = registryRef?.get("settings", REMINDER_SECTION)
    ? `<button type="button" class="button quiet int-bell${active.length ? " is-on" : ""}" data-int-card-reminders="${ctx.esc(row.id)}" aria-pressed="${active.length > 0}">${ctx.icon("bell")}<span>${active.length ? ctx.esc(ctx.t("Promemoria: ", "Reminders: ") + active.map(([, label]) => say(ctx, label)).join(", ")) : ctx.t("Promemoria", "Reminders")}</span></button>`
    : "";
  return `<div class="int-card-calendar toolbar"><button type="button" class="button" data-int-card-calendar="${ctx.esc(row.id)}">${ctx.icon("clock")}<span>${ctx.t("Aggiungi al calendario", "Add to calendar")}</span></button>${bell}</div>`;
}
export function openAddToCalendar(ctx, sessionId = null) {
  const session = sessionId ? sessionOf(ctx, sessionId) : D.nextSession(ctx.state, ctx.role);
  if (!calendarReady(ctx)) {
    ctx.toast(
      ctx.t(
        "Il calendario è spento per questa campagna: il DM lo accende in Integrazioni › Moduli.",
        "The calendar is off for this campaign: the DM switches it on in Integrations › Modules.",
      ),
      true,
    );
    return false;
  }
  const feed = D.feedOf(sliceOf(ctx.state), ctx.role);
  ctx.dialog(
    ctx.t("Aggiungi al calendario", "Add to calendar"),
    `<div class="int-add-calendar" data-int-add-calendar>${
      session
        ? `<p><strong>${ctx.esc(session.title || ctx.t("Sessione", "Session"))}</strong> · ${ctx.esc(sessionTime(ctx, session))} <small>(${ctx.esc(session.timeZone || "UTC")})</small></p><h3>${ctx.t("Solo questa sessione", "This session only")}</h3><p class="muted">${ctx.t("Un file .ics da aprire con Apple Calendario, Outlook o Google Calendar.", "An .ics file to open with Apple Calendar, Outlook or Google Calendar.")}</p><button type="button" class="button primary" data-int-add-ics="${ctx.esc(session.id)}">${ctx.t("Scarica il file .ics", "Download the .ics file")}</button>`
        : `<p class="muted">${ctx.t("Nessuna sessione in programma: il link del calendario aggiungerà da solo quelle che fisserete.", "No session scheduled: the calendar link will add the ones you schedule by itself.")}</p>`
    }<h3>${ctx.t("Tutte le sessioni, sempre aggiornate", "All sessions, always up to date")}</h3><p class="muted">${ctx.t("Il tuo link personale (webcal): aggiungilo una volta e il calendario si aggiorna da solo. Qui è simulato.", "Your personal link (webcal): add it once and the calendar updates itself. Simulated here.")}</p>${
      feed
        ? `<div class="int-command"><input readonly value="${ctx.esc(D.feedUrl(cidOf(ctx), feed.token))}" aria-label="${ctx.t("Link del tuo calendario", "Your calendar link")}" data-int-add-feed-url><button type="button" class="button" data-int-add-feed-copy>${ctx.t("Copia il link", "Copy the link")}</button></div>`
        : `<button type="button" class="button" data-int-add-feed-create>${ctx.t("Crea il mio link del calendario", "Create my calendar link")}</button>`
    }</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const box = globalThis.document?.querySelector?.("#dialog [data-int-add-calendar]");
  box?.querySelector("[data-int-add-ics]")?.addEventListener("click", () => {
    if (!session) return;
    const text = D.buildIcs(ctx.state, [session], {
      durationHours: record(ctx).calendar.durationHours,
      lang: ctx.lang,
    });
    download(D.icsFileName(ctx.state, session), "text/calendar;charset=utf-8", text);
    ctx.closeDialog?.();
    ctx.toast(
      ctx.t(
        "File .ics scaricato: aprilo con il tuo calendario.",
        "The .ics file is downloaded: open it with your calendar.",
      ),
    );
  });
  box
    ?.querySelector("[data-int-add-feed-copy]")
    ?.addEventListener("click", () =>
      copy(
        ctx,
        box.querySelector("[data-int-add-feed-url]").value,
        box.querySelector("[data-int-add-feed-url]"),
      ),
    );
  box?.querySelector("[data-int-add-feed-create]")?.addEventListener("click", () => {
    const ok = act(
      ctx,
      ctx.t("Link del calendario creato", "Calendar link created"),
      (draft, slice) => D.rotateFeed(slice, ctx.role),
      { local: true, visibility: "private" },
    );
    if (ok) openAddToCalendar(ctx, session?.id ?? null);
  });
  return true;
}
export function openReminders(ctx) {
  if (!registryRef?.get("settings", REMINDER_SECTION)) {
    ctx.toast(
      ctx.t("I promemoria non sono disponibili qui.", "Reminders are not available here."),
      true,
    );
    return false;
  }
  ctx.dialog(
    ctx.t("Promemoria delle sessioni", "Session reminders"),
    `<div data-int-reminders-dialog><p class="muted">${ctx.t("Solo per te, nella campana delle notifiche; mai fuori dall’app. Sono le stesse scelte di Preferenze › Notifiche.", "Just for you, in the notification bell; never outside the app. They are the same choices as Preferences › Notifications.")}</p><fieldset class="int-events"><legend>${ctx.t("Avvisami", "Remind me")}</legend>${REMINDERS.map(([id, label]) => `<label class="check-field"><input type="checkbox" data-int-reminder="${id}" ${reminderValue(ctx, id) ? "checked" : ""}> ${ctx.esc(say(ctx, label))}</label>`).join("")}</fieldset></div>`,
    { cancelLabel: ctx.t("Fatto", "Done") },
  );
  globalThis.document
    ?.querySelectorAll?.("#dialog [data-int-reminders-dialog] [data-int-reminder]")
    .forEach((input) =>
      input.addEventListener("change", () => {
        try {
          registryRef.setSetting(
            ctx,
            `${REMINDER_SECTION}.${input.dataset.intReminder}`,
            input.checked,
          );
          ctx.toast(
            input.checked
              ? ctx.t("Promemoria attivo.", "Reminder on.")
              : ctx.t("Promemoria spento.", "Reminder off."),
          );
        } catch (error) {
          ctx.toast(errorText(ctx, error), true);
        }
      }),
    );
  return true;
}

// ---------------------------------------------------------------- Import (DDB-194)

function importTab(ctx) {
  const parsed = ui.parsed;
  const rows = D.SHEET_FIELDS.map(
    (f) =>
      `<tr><th scope="row"><code>${ctx.esc(f.key)}</code></th><td>${f.required ? ctx.t("sì", "yes") : ctx.t("no", "no")}</td><td>${ctx.esc(say(ctx, f.label))}</td><td><code>${ctx.esc(f.example)}</code></td><td>${ctx.esc(say(ctx, f.target))}</td></tr>`,
  ).join("");
  const docs = `<details class="int-details" data-int-docs><summary>${ctx.esc(ctx.t(`Formato documentato: ${D.FORMAT} v${D.FORMAT_VERSION}`, `Documented format: ${D.FORMAT} v${D.FORMAT_VERSION}`))}</summary><p>${ctx.t("Un foglio a due colonne (campo, valore) in CSV: lo si compila in qualsiasi foglio di calcolo. «item» si ripete; i campi sconosciuti vengono ignorati e segnalati, mai indovinati. Nessuna regola viene dedotta dal testo della classe.", "A two-column sheet (field, value) as CSV: fill it in any spreadsheet. “item” repeats; unknown fields are ignored and reported, never guessed. No rule is inferred from the class text.")}</p><div class="table-wrap"><table class="int-table"><thead><tr><th scope="col">${ctx.t("Campo", "Field")}</th><th scope="col">${ctx.t("Obbligatorio", "Required")}</th><th scope="col">${ctx.t("Significato", "Meaning")}</th><th scope="col">${ctx.t("Esempio", "Example")}</th><th scope="col">${ctx.t("Nella scheda", "On the sheet")}</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  const input = `<div class="int-form" data-int-import-form><div class="toolbar"><button type="button" class="button" data-int-template>${ctx.t("Scarica il modello", "Download the template")}</button><button type="button" class="button quiet" data-int-example>${ctx.t("Usa l’esempio", "Use the example")}</button><label class="button int-file"><input type="file" accept=".csv,text/csv,text/plain" data-int-file aria-label="${ctx.t("Scegli un file CSV", "Choose a CSV file")}">${ctx.t("Scegli un file…", "Choose a file…")}</label></div><label class="field">${ctx.t("Oppure incolla il foglio", "Or paste the sheet")}<textarea data-int-csv rows="8" spellcheck="false" placeholder="campo,valore">${ctx.esc(ui.importText)}</textarea></label><div class="toolbar"><button type="button" class="button primary" data-int-preview-import>${ctx.t("Anteprima", "Preview")}</button></div></div>`;
  return `<section class="int-block" aria-labelledby="int-import-title"><h2 id="int-import-title">${ctx.t("Importa un personaggio", "Import a character")}</h2><p class="int-lead">${ctx.t("Crea un personaggio privato da un foglio in formato pubblicato; con lo stesso source_id aggiorna quello già importato. Mai lettura di pagine altrui (scraping).", "Creates a private character from a sheet in a published format; with the same source_id it updates the one already imported. Never reading other sites’ pages (scraping).")}</p>${docs}${input}${parsed ? previewImport(ctx, parsed) : ""}${importedList(ctx)}${meta(ctx, "Avrae «!import» con anteprima e «!update» che conserva le impostazioni (DDB-194); import da file della libreria B21", "Avrae “!import” with preview and “!update” keeping settings (DDB-194); B21 library file import")}</section>`;
}
function previewImport(ctx, parsed) {
  const ignored = parsed.ignored.length
    ? `<p class="int-help" data-int-ignored>${ctx.esc(ctx.t(`Ignorati: ${parsed.ignored.map((i) => `${i.key} (riga ${i.line})`).join(", ")}.`, `Ignored: ${parsed.ignored.map((i) => `${i.key} (line ${i.line})`).join(", ")}.`))}</p>`
    : "";
  if (!parsed.ok)
    return `<div class="int-preview is-error" role="alert" data-int-import-errors><h3>${ctx.t("Il foglio non si può importare", "The sheet cannot be imported")}</h3><ul>${parsed.errors
      .map(
        (e) =>
          `<li>${e.line ? ctx.esc(ctx.t(`Riga ${e.line}: `, `Line ${e.line}: `)) : ""}${ctx.esc(ctx.t(e.it, e.en))}</li>`,
      )
      .join(
        "",
      )}</ul>${ignored}<p class="muted">${ctx.t("Nessuna modifica è stata fatta.", "Nothing was changed.")}</p></div>`;
  const s = parsed.sheet;
  const plan = D.importPlan(ctx.state, sliceOf(ctx.state), parsed, ctx.role);
  const stats = `<dl class="int-stats"><div><dt>${ctx.t("Nome", "Name")}</dt><dd>${ctx.esc(s.name)}</dd></div><div><dt>${ctx.t("Classe e livello", "Class and level")}</dt><dd>${ctx.esc(s.className || "—")} · ${s.level}</dd></div><div><dt>${ctx.t("PF", "HP")}</dt><dd>${s.hp}/${s.maxHp}</dd></div><div><dt>${ctx.t("CA", "AC")}</dt><dd>${s.ac}</dd></div><div><dt>${ctx.t("Velocità", "Speed")}</dt><dd>${s.speed} m</dd></div><div><dt>${ctx.t("Caratteristiche", "Abilities")}</dt><dd>${Object.entries(
    s.abilities,
  )
    .map(([k, v]) => `${k.toUpperCase()} ${v}`)
    .join(
      " · ",
    )}</dd></div><div><dt>${ctx.t("Oggetti", "Items")}</dt><dd>${s.items.length}</dd></div><div><dt>source_id</dt><dd><code>${ctx.esc(s.sourceId)}</code></dd></div></dl>`;
  if (plan.mode === "update") {
    const actor = ctx.state.actors[plan.actorId];
    const names = {
      className: L("Classe", "Class"),
      level: L("Livello", "Level"),
      maxHp: L("PF massimi", "Maximum HP"),
      ac: L("CA", "AC"),
      speed: L("Velocità", "Speed"),
    };
    const changes = plan.changes.length
      ? `<div class="table-wrap"><table class="int-table" data-int-changes><thead><tr><th scope="col">${ctx.t("Campo", "Field")}</th><th scope="col">${ctx.t("Ora", "Now")}</th><th scope="col">${ctx.t("Dopo", "After")}</th></tr></thead><tbody>${plan.changes
          .map((c) => {
            const name = c.path.startsWith("abilities.")
              ? c.path.slice(10).toUpperCase()
              : say(ctx, names[c.path]);
            return `<tr><th scope="row">${ctx.esc(name)}</th><td>${ctx.esc(c.from ?? "—")}</td><td><strong>${ctx.esc(c.to ?? "—")}</strong></td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : `<p data-int-up-to-date id="int-up-to-date">${ctx.t("La scheda è già aggiornata: nessuna differenza. Cambia il foglio d’origine, poi incollalo di nuovo.", "The sheet is already up to date: no difference. Change the source sheet, then paste it again.")}</p>`;
    return `<div class="int-preview" data-int-import-preview="update"><h3>${ctx.esc(ctx.t(`Aggiornamento di ${actor.name}`, `Update of ${actor.name}`))}</h3>${stats}${changes}<p class="muted">${ctx.t("Si aggiornano solo i numeri del foglio. Inventario, note, condizioni e collegamento alla campagna restano come nell’app; i PF attuali non superano i nuovi massimi.", "Only the sheet numbers are updated. Inventory, notes, conditions and campaign connection stay as in the app; current HP never exceeds the new maximum.")}</p>${ignored}<div class="toolbar"><button type="button" class="button primary" data-int-import-update ${plan.changes.length ? "" : 'disabled aria-describedby="int-up-to-date"'}>${ctx.t("Aggiorna la scheda", "Update the sheet")}</button><button type="button" class="button quiet" data-int-import-cancel>${ctx.t("Annulla", "Cancel")}</button></div></div>`;
  }
  return `<form class="int-preview" data-int-import-preview="new">${stats}${ignored}<label class="field">${ctx.t("Nome del nuovo personaggio", "Name of the new character")}<input name="name" required maxlength="${D.MAX_NAME}" value="${ctx.esc(s.name)}"></label><p class="muted">${ctx.t("Nasce privato nella tua libreria: solo tu lo vedi finché non lo colleghi a una campagna.", "It is created private in your library: only you see it until you connect it to a campaign.")}</p><div class="toolbar"><button type="submit" class="button primary">${ctx.t("Importa come nuovo personaggio", "Import as a new character")}</button><button type="button" class="button quiet" data-int-import-cancel>${ctx.t("Annulla", "Cancel")}</button></div></form>`;
}
function importedList(ctx) {
  const rows = Object.entries(sliceOf(ctx.state).imports)
    .filter(([id, row]) => row.by === ctx.role && ctx.state.actors[id]?.owner === ctx.role)
    .map(
      ([id, row]) =>
        `<li class="item-row" data-int-imported="${ctx.esc(id)}"><div><strong>${ctx.esc(ctx.state.actors[id].name)}</strong><small><code>${ctx.esc(row.sourceId)}</code> · ${ctx.t("importato il", "imported on")} ${ctx.esc(when(ctx, row.importedAt))}${row.updatedAt ? ` · ${ctx.t("aggiornato il", "updated on")} ${ctx.esc(when(ctx, row.updatedAt))}` : ""}</small></div><button type="button" class="button" data-int-open-sheet="${ctx.esc(id)}">${ctx.t("Apri la scheda", "Open the sheet")}</button></li>`,
    );
  return rows.length
    ? `<h3 class="int-sub">${ctx.t("Importati da te", "Imported by you")}</h3><ul class="item-list">${rows.join("")}</ul>`
    : "";
}
function runPreview(ctx, text, fileName = "") {
  ui.importText = text;
  ui.importFile = fileName;
  ui.parsed = D.parseSheetCsv(text);
  ui.focus = ui.parsed.ok
    ? "[data-int-import-preview] h3, [data-int-import-preview] input[name=name]"
    : "[data-int-import-errors]";
  ctx.render();
}
function importNew(ctx, name) {
  const parsed = ui.parsed;
  if (!parsed?.ok) return;
  let id = null;
  const ok = act(
    ctx,
    ctx.t(
      `Personaggio importato: ${parsed.sheet.name}`,
      `Character imported: ${parsed.sheet.name}`,
    ),
    (draft, slice) => {
      id = importCharacter(draft, D.libraryParsed(parsed.sheet), ctx.role, {
        name,
        fileName: ui.importFile,
      });
      D.recordImport(draft, slice, id, parsed.sheet, ctx.role, { fileName: ui.importFile });
    },
    { local: true, visibility: "private" },
  );
  if (!ok) return;
  ui.parsed = null;
  ui.importText = "";
  ui.imported = id;
  ui.focus = `[data-int-imported="${id}"] button`;
  ctx.render();
  ctx.toast(
    ctx.t(
      "Personaggio importato nella tua libreria (privato).",
      "Character imported into your library (private).",
    ),
  );
}
function importUpdate(ctx) {
  const parsed = ui.parsed;
  if (!parsed?.ok) return;
  const plan = D.importPlan(ctx.state, sliceOf(ctx.state), parsed, ctx.role);
  const actor = ctx.state.actors[plan.actorId];
  const ok = act(
    ctx,
    ctx.t(
      `Scheda aggiornata dal foglio: ${actor?.name}`,
      `Sheet updated from the file: ${actor?.name}`,
    ),
    (draft, slice) => D.applyUpdate(draft, slice, parsed, ctx.role),
    actor?.visibility === "private" ? { local: true, visibility: "private" } : {},
  );
  if (!ok) return;
  ui.parsed = null;
  ui.importText = "";
  ui.focus = `[data-int-imported="${plan.actorId}"] button`;
  ctx.render();
  ctx.toast(
    ctx.t(
      "Scheda aggiornata: inventario e note sono rimasti.",
      "Sheet updated: inventory and notes stayed.",
    ),
  );
}

// ---------------------------------------------------------------- API and webhooks (CMP-213)

function apiTab(ctx) {
  const slice = sliceOf(ctx.state);
  const tokens = D.tokensOf(slice, ctx.role).slice().reverse();
  const tokenRows = tokens.length
    ? `<ul class="item-list" data-int-tokens>${tokens
        .map(
          (t) =>
            `<li class="item-row ${t.revokedAt ? "is-revoked" : ""}" data-int-token="${ctx.esc(t.id)}"><div><strong>${ctx.esc(t.name)}</strong><small><code>d20_pat_…${ctx.esc(t.last4)}</code> · ${ctx.t("creato il", "created on")} ${ctx.esc(when(ctx, t.createdAt))}${t.revokedAt ? ` · <span class="error">${ctx.t("revocato il", "revoked on")} ${ctx.esc(when(ctx, t.revokedAt))}</span>` : ""}</small></div>${t.revokedAt ? "" : `<button type="button" class="button danger" data-int-token-revoke="${ctx.esc(t.id)}">${ctx.t("Revoca…", "Revoke…")}</button>`}</li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessun token.", "No tokens.")}</p>`;
  const result = ui.apiResult;
  const tester = `<form class="int-form" data-int-api-form><label class="field">${ctx.t("Token (Authorization: Bearer)", "Token (Authorization: Bearer)")}<input name="token" autocomplete="off" spellcheck="false" value="${ctx.esc(ui.apiToken)}" placeholder="d20_pat_…"></label><label class="field">${ctx.t("Richiesta", "Request")}<select name="endpoint">${D.ENDPOINTS.map((e) => `<option value="${e.id}" ${e.id === ui.apiEndpoint ? "selected" : ""}>GET ${ctx.esc(e.path(cidOf(ctx)))}</option>`).join("")}</select></label><div class="toolbar"><button type="submit" class="button">${ctx.t("Invia (simulata)", "Send (simulated)")}</button></div></form>${
    result
      ? `<div class="int-response" data-int-api-result="${result.status}" role="status"><p><strong>GET https://${D.HOST}${ctx.esc(result.path)} → ${result.status}</strong></p><pre>${ctx.esc(JSON.stringify(result.body, null, 2))}</pre></div>`
      : ""
  }`;
  const webhooks = isDm(ctx) && on(ctx, "api") ? webhookBlock(ctx) : "";
  return `<section class="int-block" aria-labelledby="int-tokens-title"><h2 id="int-tokens-title">${ctx.t("I tuoi token personali", "Your personal tokens")}</h2><p class="int-lead">${ctx.t("Solo tu li vedi. Un token dà accesso in sola lettura a ciò che puoi già vedere tu; lo si mostra una sola volta, alla creazione.", "Only you see them. A token gives read-only access to what you can already see; it is shown once, when created.")}</p>${tokenRows}${on(ctx, "api") ? "" : `<p class="int-lead" data-int-api-off>${isDm(ctx) ? ctx.t("Il modulo «API e webhook» è spento: «Crea token» lo accende per la campagna dopo una conferma.", "The “API and webhooks” module is off: “Create token” switches it on for the campaign after a confirmation.") : ctx.t("Il modulo «API e webhook» è spento: solo il DM può accenderlo.", "The “API and webhooks” module is off: only the DM can switch it on.")}</p>`}<form class="int-form int-inline" data-int-token-form><label class="field">${ctx.t("Nome del token (facoltativo)", "Token name (optional)")}<input name="name" maxlength="${D.MAX_NAME}" placeholder="${ctx.t("Bot del gruppo", "Group bot")}"></label><div class="toolbar"><button type="submit" class="button">${ctx.t("Crea token", "Create token")}</button></div></form>${meta(ctx, "Kanka, token di accesso personali dell’API (CMP-213); API pubblica di DiceCloud (CMP-09)", "Kanka personal API access tokens (CMP-213); DiceCloud public API (CMP-09)")}</section><section class="int-block" aria-labelledby="int-api-title"><h2 id="int-api-title">${ctx.t("Prova l’API (simulata)", "Try the API (simulated)")}</h2><p class="int-lead">${ctx.t("La risposta è calcolata in questo browser con le stesse regole di visibilità dell’app.", "The answer is computed in this browser with the app’s own visibility rules.")}</p>${tester}</section>${webhooks}`;
}
function webhookBlock(ctx) {
  const hooks = record(ctx).webhooks;
  const eventName = (id) => say(ctx, D.WEBHOOK_EVENTS.find((e) => e.id === id)?.label ?? L(id, id));
  const formatName = (id) =>
    say(ctx, D.WEBHOOK_FORMATS.find((f) => f.id === id)?.label ?? L(id, id));
  const rows = hooks
    .map((hook) => {
      const deliveries = D.webhookDeliveries(ctx.state, hook, ctx.lang);
      return `<li class="int-hook" data-int-webhook="${ctx.esc(hook.id)}"><div class="int-hook-head"><div><strong>${ctx.esc(hook.name)}</strong><small>${ctx.esc(eventName(hook.event))} · ${ctx.esc(formatName(hook.format))} · ${ctx.esc(D.hostOf(hook.url))}</small></div><label class="check-field int-hook-active"><input type="checkbox" role="switch" data-int-webhook-toggle="${ctx.esc(hook.id)}" ${hook.active ? "checked" : ""}> ${ctx.t("Attivo", "Active")}</label></div><div class="toolbar"><button type="button" class="button" data-int-webhook-test="${ctx.esc(hook.id)}">${ctx.t("Prova", "Test")}</button><button type="button" class="button quiet" data-int-webhook-edit="${ctx.esc(hook.id)}">${ctx.t("Modifica…", "Edit…")}</button><button type="button" class="button danger" data-int-webhook-delete="${ctx.esc(hook.id)}">${ctx.t("Elimina…", "Delete…")}</button></div><details class="int-details"><summary>${ctx.esc(ctx.t(`Consegne simulate (${deliveries.length})`, `Simulated deliveries (${deliveries.length})`))}</summary>${
        deliveries.length
          ? `<ol class="int-deliveries" data-int-deliveries>${deliveries
              .map(
                (d) =>
                  `<li><p><time>${ctx.esc(when(ctx, d.at))}</time> · ${ctx.esc(d.eventName)} · <span class="badge">${ctx.t("simulata, non inviata", "simulated, not sent")}</span></p><pre>${ctx.esc(JSON.stringify(d.payload, null, 2))}</pre></li>`,
              )
              .join("")}</ol>`
          : `<p class="muted">${ctx.t("Nessuna consegna ancora.", "No delivery yet.")}</p>`
      }</details></li>`;
    })
    .join("");
  return `<section class="int-block" aria-labelledby="int-webhooks-title"><div class="section-heading"><h2 id="int-webhooks-title">${ctx.t("Webhook della campagna", "Campaign webhooks")}</h2><button type="button" class="button primary" data-int-webhook-new>${ctx.t("Nuovo webhook…", "New webhook…")}</button></div><p class="int-lead">${ctx.t("Avvisano un altro servizio quando cambia qualcosa che tutto il gruppo può leggere. Le voci private non partono mai.", "They notify another service when something the whole group can read changes. Private entries never go out.")}</p>${hooks.length ? `<ul class="int-hooks">${rows}</ul>` : `<p class="muted" data-int-webhooks-empty>${ctx.t("Nessun webhook.", "No webhooks.")}</p>`}${meta(ctx, "Kanka, webhook della campagna con messaggio e stato (CMP-213)", "Kanka campaign webhooks with message and status (CMP-213)")}</section>`;
}
function webhookDialog(ctx, hook = null) {
  const value = hook ?? {
    name: "",
    url: "",
    event: "sessions",
    format: "discord",
    template: "{event}: {name} · {url}",
    active: true,
  };
  ctx.dialog(
    hook ? ctx.t("Modifica webhook", "Edit webhook") : ctx.t("Nuovo webhook", "New webhook"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="${D.MAX_NAME}" value="${ctx.esc(value.name)}"></label><label class="field">${ctx.t("Indirizzo (https)", "Address (https)")}<input name="url" required inputmode="url" value="${ctx.esc(value.url)}" placeholder="https://hooks.example/lanterne"></label><label class="field">${ctx.t("Quando", "When")}<select name="event">${D.WEBHOOK_EVENTS.map((e) => `<option value="${e.id}" ${e.id === value.event ? "selected" : ""}>${ctx.esc(say(ctx, e.label))}</option>`).join("")}</select></label><label class="field">${ctx.t("Tipo", "Type")}<select name="format">${D.WEBHOOK_FORMATS.map((f) => `<option value="${f.id}" ${f.id === value.format ? "selected" : ""}>${ctx.esc(say(ctx, f.label))}</option>`).join("")}</select></label><label class="field">${ctx.t("Messaggio", "Message")}<input name="template" maxlength="${D.MAX_TEMPLATE}" value="${ctx.esc(value.template)}"><small class="muted">${ctx.esc(D.TEMPLATE_KEYS.join(" "))}</small></label><label class="check-field"><input type="checkbox" name="active" ${value.active ? "checked" : ""}> ${ctx.t("Attivo", "Active")}</label>`,
    {
      submitLabel: hook ? ctx.t("Salva", "Save") : ctx.t("Crea webhook", "Create webhook"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: (data) => {
        commitIn(
          ctx,
          hook
            ? ctx.t("Webhook modificato", "Webhook edited")
            : ctx.t("Webhook creato", "Webhook created"),
          (draft, slice) =>
            D.saveWebhook(
              slice,
              cidOf(ctx),
              {
                id: hook?.id,
                name: data.get("name"),
                url: data.get("url"),
                event: data.get("event"),
                format: data.get("format"),
                template: data.get("template"),
                active: data.has("active"),
              },
              ctx.role,
            ),
        );
      },
    },
  );
}
/**
 * «Crea token» from Integrazioni › API in two steps (Kanka/Foundry token pages): with the
 * module off the DM confirms switching it on and gets the token in the same step; a player
 * is told who can switch it on.
 */
function createTokenStep(ctx, name) {
  if (on(ctx, "api")) return createToken(ctx, name);
  if (!isDm(ctx)) {
    ctx.toast(
      ctx.t(
        "Il modulo «API e webhook» è spento per questa campagna: chiedi al DM di accenderlo in Integrazioni › Moduli, poi crea il token.",
        "The “API and webhooks” module is off for this campaign: ask the DM to switch it on in Integrations › Modules, then create the token.",
      ),
      true,
    );
    return false;
  }
  ctx.dialog(
    ctx.t("Accendere il modulo API?", "Switch the API module on?"),
    `<p>${ctx.t("Per usare un token il modulo «API e webhook» deve essere acceso per la campagna. Accendendolo crei anche il token «" + ctx.esc(name) + "»; puoi spegnerlo quando vuoi in Moduli.", "A token needs the “API and webhooks” module on for the campaign. Switching it on also creates the token “" + ctx.esc(name) + "”; you can switch it off any time in Modules.")}</p>`,
    {
      submitLabel: ctx.t("Accendi e crea il token", "Switch on and create the token"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: () => {
        const modules = { ...record(ctx).modules, api: true };
        const ok = act(ctx, ctx.t("Modulo API acceso", "API module switched on"), (draft, slice) =>
          D.saveModules(slice, cidOf(ctx), modules, ctx.role),
        );
        if (ok) setTimeout(() => createToken(ctx, name), 0);
      },
    },
  );
  return true;
}
function createToken(ctx, name) {
  let created = null;
  const ok = act(
    ctx,
    ctx.t("Token personale creato", "Personal token created"),
    (draft, slice) => {
      created = D.createToken(slice, ctx.role, name);
    },
    { local: true, visibility: "private" },
  );
  if (!ok || !created) return;
  // The tester is filled with the token just created (this visit's memory only).
  ui.apiToken = created.value;
  ctx.render();
  ctx.dialog(
    ctx.t("Copia il token adesso", "Copy the token now"),
    `<p>${ctx.t("Per sicurezza non lo vedrai più: l’app ne conserva solo le ultime quattro cifre.", "For safety you will not see it again: the app keeps only its last four characters.")}</p><div class="int-command"><input readonly value="${ctx.esc(created.value)}" aria-label="${ctx.t("Il tuo nuovo token", "Your new token")}" data-int-secret><button type="button" class="button" data-int-secret-copy>${ctx.t("Copia", "Copy")}</button></div>`,
    { cancelLabel: ctx.t("Fatto", "Done") },
  );
  const dialog = globalThis.document?.querySelector?.("#dialog");
  dialog
    ?.querySelector("[data-int-secret-copy]")
    ?.addEventListener("click", () =>
      copy(ctx, created.value, dialog.querySelector("[data-int-secret]")),
    );
}
/**
 * A confirmation whose command throws on refusal: the shell writes the message inside the
 * open dialog (a toast would sit behind the modal backdrop) and keeps it open.
 */
function confirmDialog(ctx, title, body, submitLabel, run) {
  ctx.dialog(title, `<p>${body}</p>`, {
    submitLabel,
    cancelLabel: ctx.t("Annulla", "Cancel"),
    onSubmit: () => {
      run();
    },
  });
}
function confirmDeleteWebhook(ctx, webhookId) {
  confirmDialog(
    ctx,
    ctx.t("Eliminare il webhook?", "Delete the webhook?"),
    ctx.esc(
      ctx.t(
        "Il servizio non riceverà più avvisi. Puoi annullare con «Annulla» in cima alla pagina.",
        "The service will receive no more notices. You can reverse it with “Undo” at the top of the page.",
      ),
    ),
    ctx.t("Elimina", "Delete"),
    () =>
      commitIn(ctx, ctx.t("Webhook eliminato", "Webhook deleted"), (draft, slice) =>
        D.deleteWebhook(slice, cidOf(ctx), webhookId, ctx.role),
      ),
  );
}
function confirmRevokeToken(ctx, tokenId) {
  confirmDialog(
    ctx,
    ctx.t("Revocare il token?", "Revoke the token?"),
    ctx.esc(
      ctx.t(
        "Chi lo usa riceverà subito «401 non autenticato».",
        "Whoever uses it gets “401 unauthenticated” at once.",
      ),
    ),
    ctx.t("Revoca", "Revoke"),
    () =>
      commitIn(
        ctx,
        ctx.t("Token personale revocato", "Personal token revoked"),
        (draft, slice) => D.revokeToken(slice, ctx.role, tokenId),
        { local: true, visibility: "private" },
      ),
  );
}
function rotateFeed(ctx, run = commitIn) {
  return run(
    ctx,
    ctx.t("Link del calendario personale creato", "Personal calendar link created"),
    (draft, slice) => D.rotateFeed(slice, ctx.role),
    { local: true, visibility: "private" },
  );
}
function confirmRotateFeed(ctx) {
  confirmDialog(
    ctx,
    ctx.t("Rigenerare il link?", "Regenerate the link?"),
    ctx.esc(
      ctx.t(
        "Il link attuale smetterà di funzionare: dovrai aggiungere quello nuovo al tuo calendario.",
        "The current link will stop working: you will need to add the new one to your calendar.",
      ),
    ),
    ctx.t("Rigenera", "Regenerate"),
    () => rotateFeed(ctx),
  );
}
function confirmRemoveWebhook(ctx) {
  const masked = D.maskWebhook(record(ctx).relay.webhook);
  confirmDialog(
    ctx,
    ctx.t("Rimuovere il webhook Discord?", "Remove the Discord webhook?"),
    `${ctx.esc(
      ctx.t(
        `L’indirizzo ${masked} viene cancellato dall’app: niente verrà più inoltrato finché non ne incolli uno. Canale e categorie restano.`,
        `The address ${masked} is deleted from the app: nothing is relayed until you paste one again. Channel and categories stay.`,
      ),
    )}`,
    ctx.t("Rimuovi", "Remove"),
    () =>
      commitIn(ctx, ctx.t("Webhook Discord rimosso", "Discord webhook removed"), (draft, slice) =>
        D.removeRelayWebhook(slice, cidOf(ctx), ctx.role),
      ),
  );
}

// ---------------------------------------------------------------- bind

export function bindSection(el, ctx) {
  const onAll = (selector, event, handler) =>
    el
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener(event, (e) => handler(node, e)));
  onAll("[data-int-undo]", "click", () => ctx.undo());
  onAll("[data-int-tab]", "click", (node) =>
    ctx.navigate("campaign", { tab: SECTION, id: node.dataset.intTab }),
  );
  // Modules
  onAll("[data-int-module]", "change", (node) => changeModule(ctx, node));
  onAll("[data-int-area]", "change", (node) => changeModule(ctx, node));
  onAll("[data-int-modules-off]", "click", () => deactivateAll(ctx));
  // Foundry's module filter: the rows narrow while typing, nothing re-renders.
  onAll("[data-int-module-search]", "input", (node) => {
    ui.moduleQuery = node.value;
    const q = node.value.trim().toLocaleLowerCase();
    let shown = 0;
    el.querySelectorAll("[data-int-module-item]").forEach((row) => {
      const match = !q || row.textContent.toLocaleLowerCase().includes(q);
      row.hidden = !match;
      if (match) shown++;
    });
    el.querySelectorAll("[data-int-module-group]").forEach((box) => {
      box.hidden = !box.querySelector("[data-int-module-item]:not([hidden])");
    });
    const empty = el.querySelector("[data-int-module-empty]");
    if (empty) empty.hidden = shown > 0;
  });
  onAll("[data-int-modules-form]", "submit", (node, e) => {
    e.preventDefault();
    saveModules(ctx);
  });
  onAll("[data-int-modules-reset]", "click", () => {
    ui.pending = null;
    ctx.render();
  });
  onAll("[data-int-open-sections]", "click", () =>
    ctx.navigate("campaign", { tab: "settings", id: "sections" }),
  );
  // Discord
  onAll("[data-int-relay-form]", "submit", (form, e) => {
    e.preventDefault();
    ui.focus = "[data-int-relay-form] button[type=submit]";
    const data = new FormData(form);
    const webhook = String(data.get("webhook") ?? "").trim();
    const ok = formAct(
      ctx,
      form,
      ctx.t("Inoltro a Discord salvato", "Discord relay saved"),
      (draft, slice) =>
        D.saveRelay(
          slice,
          cidOf(ctx),
          {
            webhook,
            keepWebhook: !webhook,
            channel: data.get("channel"),
            events: Object.fromEntries(
              D.RELAY_EVENTS.map((ev) => [ev.id, data.has(`event-${ev.id}`)]),
            ),
          },
          ctx.role,
        ),
    );
    if (ok) ctx.toast(ctx.t("Inoltro salvato.", "Relay saved."));
  });
  onAll("[data-int-destination]", "change", (node) => {
    ui.destination = node.value;
    ui.focus = "[data-int-destination]";
    ctx.render();
  });
  onAll("[data-int-note-form]", "submit", (form, e) => {
    e.preventDefault();
    ui.focus = "[data-int-note-form] textarea";
    const text = new FormData(form).get("note");
    ui.destination = "webhook";
    if (
      formAct(
        ctx,
        form,
        ctx.t(
          "Nota inviata al canale Discord (simulato)",
          "Note sent to the Discord channel (simulated)",
        ),
        (draft, slice) => D.addRelayNote(slice, cidOf(ctx), text, ctx.role),
      )
    )
      ctx.toast(
        ctx.t(
          "Nota nell’anteprima del canale. Nessuna richiesta di rete.",
          "Note in the channel preview. No network request.",
        ),
      );
  });
  onAll("[data-int-retract]", "click", (node) => retractNote(ctx, node.dataset.intRetract));
  onAll("[data-int-copy-command]", "click", () =>
    copy(ctx, D.avraeCommand(cidOf(ctx)), el.querySelector("[data-int-avrae-command]")),
  );
  onAll("[data-int-avrae-form]", "submit", (form, e) => {
    e.preventDefault();
    ui.focus = "[data-int-avrae-form] [name=channel]";
    const data = new FormData(form);
    let id = null;
    if (
      formAct(
        ctx,
        form,
        ctx.t("Canale collegato con Avrae (simulato)", "Channel linked with Avrae (simulated)"),
        (draft, slice) => {
          id = D.linkAvrae(
            slice,
            cidOf(ctx),
            { server: data.get("server"), channel: data.get("channel") },
            ctx.role,
          );
        },
      )
    ) {
      ui.destination = id;
      ctx.render();
      ctx.toast(
        ctx.t(
          "Avrae: canale collegato. I tiri pubblici compariranno lì.",
          "Avrae: channel linked. Public rolls will appear there.",
        ),
      );
    }
  });
  onAll("[data-int-relay-remove]", "click", () => confirmRemoveWebhook(ctx));
  onAll("[data-int-unlink]", "click", (node) =>
    act(ctx, ctx.t("Canale scollegato da Avrae", "Channel unlinked from Avrae"), (draft, slice) =>
      D.unlinkAvrae(slice, cidOf(ctx), node.dataset.intUnlink, ctx.role),
    ),
  );
  // Calendar
  onAll("[data-int-ics]", "click", () => downloadNext(ctx));
  onAll("[data-int-open-sessions]", "click", () => ctx.navigate("campaign", { tab: "sessions" }));
  onAll("[data-int-duration]", "change", (node) => {
    ui.focus = "[data-int-duration]";
    act(
      ctx,
      ctx.t("Durata nel calendario aggiornata", "Calendar duration updated"),
      (draft, slice) => D.setDuration(slice, cidOf(ctx), Number(node.value), ctx.role),
    );
  });
  onAll("[data-int-feed-create]", "click", () => {
    ui.focus = "[data-int-feed-copy]";
    rotateFeed(ctx, act);
  });
  onAll("[data-int-feed-rotate]", "click", () => confirmRotateFeed(ctx));
  onAll("[data-int-feed-copy]", "click", () => {
    const input = el.querySelector("[data-int-feed-url]");
    copy(ctx, input?.value ?? "", input);
  });
  onAll("[data-int-feed-download]", "click", () => {
    const sessions = D.upcomingSessions(ctx.state, ctx.role);
    download(
      D.icsFileName(ctx.state, null),
      "text/calendar;charset=utf-8",
      D.buildIcs(ctx.state, sessions, {
        durationHours: record(ctx).calendar.durationHours,
        lang: ctx.lang,
      }),
    );
    ctx.toast(ctx.t("Feed scaricato (.ics).", "Feed downloaded (.ics)."));
  });
  onAll("[data-int-reminder]", "change", (node) => {
    try {
      registryRef.setSetting(ctx, `${REMINDER_SECTION}.${node.dataset.intReminder}`, node.checked);
      ctx.toast(
        node.checked
          ? ctx.t(
              "Promemoria attivato: arriverà nella campana.",
              "Reminder on: it will arrive in the bell.",
            )
          : ctx.t("Promemoria disattivato.", "Reminder off."),
      );
    } catch (error) {
      node.checked = !node.checked;
      ctx.toast(errorText(ctx, error), true);
    }
  });
  // Import
  onAll("[data-int-template]", "click", () => {
    download(
      `${D.FORMAT}-${ctx.t("esempio", "example")}.csv`,
      "text/csv;charset=utf-8",
      D.EXAMPLE_CSV,
    );
    ctx.toast(ctx.t("Modello scaricato.", "Template downloaded."));
  });
  onAll("[data-int-example]", "click", () => runPreview(ctx, D.EXAMPLE_CSV, "esempio.csv"));
  onAll("[data-int-csv]", "input", (node) => {
    ui.importText = node.value;
  });
  onAll("[data-int-preview-import]", "click", () =>
    runPreview(ctx, el.querySelector("[data-int-csv]")?.value ?? "", ui.importFile || ""),
  );
  onAll("[data-int-file]", "change", async (node) => {
    const file = node.files?.[0];
    node.value = "";
    if (!file) return;
    if (file.size > D.MAX_IMPORT_BYTES) {
      ui.parsed = D.parseSheetCsv("", { bytes: file.size });
      ctx.render();
      return;
    }
    runPreview(ctx, await file.text(), file.name);
  });
  onAll("[data-int-import-preview='new']", "submit", (form, e) => {
    e.preventDefault();
    importNew(ctx, new FormData(form).get("name"));
  });
  onAll("[data-int-import-update]", "click", () => importUpdate(ctx));
  onAll("[data-int-import-cancel]", "click", () => {
    ui.parsed = null;
    ctx.render();
  });
  onAll("[data-int-open-sheet]", "click", (node) =>
    ctx.openSheet
      ? ctx.openSheet(node.dataset.intOpenSheet)
      : ctx.navigate("characters", { id: node.dataset.intOpenSheet }),
  );
  // API and webhooks
  onAll("[data-int-token-form]", "submit", (form, e) => {
    e.preventDefault();
    const name = String(new FormData(form).get("name") ?? "").trim();
    createTokenStep(ctx, name || ctx.t("Token personale", "Personal token"));
  });
  onAll("[data-int-token-revoke]", "click", (node) =>
    confirmRevokeToken(ctx, node.dataset.intTokenRevoke),
  );
  onAll("[data-int-api-form]", "submit", (form, e) => {
    e.preventDefault();
    const data = new FormData(form);
    ui.apiToken = String(data.get("token") ?? "").trim();
    ui.apiEndpoint = String(data.get("endpoint") ?? "characters");
    ui.apiResult = D.apiRequest(ctx.state, sliceOf(ctx.state), ctx.role, {
      tokenValue: ui.apiToken,
      endpoint: ui.apiEndpoint,
    });
    ui.focus = "[data-int-api-result]";
    ctx.render();
  });
  onAll("[data-int-webhook-new]", "click", () => webhookDialog(ctx));
  onAll("[data-int-webhook-edit]", "click", (node) =>
    webhookDialog(
      ctx,
      record(ctx).webhooks.find((w) => w.id === node.dataset.intWebhookEdit),
    ),
  );
  onAll("[data-int-webhook-toggle]", "change", (node) => {
    ui.focus = `[data-int-webhook-toggle="${node.dataset.intWebhookToggle}"]`;
    act(ctx, ctx.t("Webhook aggiornato", "Webhook updated"), (draft, slice) =>
      D.setWebhookActive(slice, cidOf(ctx), node.dataset.intWebhookToggle, node.checked, ctx.role),
    );
  });
  onAll("[data-int-webhook-test]", "click", (node) => {
    ui.focus = `[data-int-webhook-test="${node.dataset.intWebhookTest}"]`;
    if (
      act(
        ctx,
        ctx.t("Consegna di prova del webhook (simulata)", "Webhook test delivery (simulated)"),
        (draft, slice) => D.testWebhook(slice, cidOf(ctx), node.dataset.intWebhookTest, ctx.role),
      )
    )
      ctx.toast(
        ctx.t(
          "Consegna di prova registrata: nessuna richiesta di rete.",
          "Test delivery recorded: no network request.",
        ),
      );
  });
  onAll("[data-int-webhook-delete]", "click", (node) =>
    confirmDeleteWebhook(ctx, node.dataset.intWebhookDelete),
  );
  if (ui.focus) {
    const target = el.querySelector(ui.focus);
    ui.focus = null;
    target?.focus?.();
  }
}

// ---------------------------------------------------------------- Table: external sheet (VTL-034)

function openExternal(ctx, actorId) {
  const link = D.sheetLinkFor(ctx.state, sliceOf(ctx.state), actorId, ctx.role);
  if (!link) return ctx.toast(ctx.t("Nessuna scheda esterna.", "No external sheet."), true);
  // A new tab, never an import: nothing from the other site enters the app.
  globalThis.open?.(link.url, "_blank", "noopener,noreferrer");
  ctx.toast(
    ctx.t(
      `Scheda aperta in una nuova scheda: ${D.hostOf(link.url)}.`,
      `Sheet opened in a new tab: ${D.hostOf(link.url)}.`,
    ),
  );
}
function sheetOptions(ctx, actor) {
  return actor.visibility === "private" ? { local: true, visibility: "private" } : {};
}
function sheetDialog(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const link = sliceOf(ctx.state).sheets[actorId];
  ctx.dialog(
    ctx.t(`Scheda esterna di ${actor.name}`, `${actor.name}’s external sheet`),
    `<p class="muted">${ctx.t("Un link a una scheda su un altro sito (per esempio D&D Beyond). Si apre in una nuova scheda del browser: nessun dato viene importato.", "A link to a sheet on another site (for example D&D Beyond). It opens in a new browser tab: no data is imported.")}</p><label class="field">${ctx.t("Indirizzo della scheda (https)", "Sheet address (https)")}<input name="url" required inputmode="url" autocomplete="off" spellcheck="false" maxlength="${D.MAX_URL}" value="${ctx.esc(link?.url ?? "")}" placeholder="https://www.dndbeyond.com/characters/…"></label><label class="check-field"><input type="checkbox" name="shared" ${link?.shared ? "checked" : ""} aria-describedby="int-sheet-audience"> ${ctx.t("Visibile a chi vede questa creatura", "Visible to whoever sees this creature")}</label><p class="int-help" id="int-sheet-audience">${
      actor.visibility === "private"
        ? ctx.t(
            "Il personaggio è privato: il link lo vedi solo tu.",
            "The character is private: only you see the link.",
          )
        : ctx.t(
            "Se non è spuntato, il link lo vede solo chi controlla la creatura: per un personaggio del gruppo, chi la gioca e il DM.",
            "If unticked, only whoever controls the creature sees the link: for a party character, its player and the DM.",
          )
    }</p>${link ? `<p><button type="button" class="button danger" data-int-sheet-remove>${ctx.t("Rimuovi il link", "Remove the link")}</button></p>` : ""}`,
    {
      submitLabel: ctx.t("Salva il link", "Save the link"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: (data) => {
        commitIn(
          ctx,
          ctx.t(`Scheda esterna collegata: ${actor.name}`, `External sheet linked: ${actor.name}`),
          (draft, slice) =>
            D.setSheetLink(
              draft,
              slice,
              actorId,
              { url: data.get("url"), shared: data.has("shared") },
              ctx.role,
            ),
          { ...sheetOptions(ctx, actor), ...(data.has("shared") ? {} : { visibility: "private" }) },
        );
        ctx.toast(
          ctx.t(
            "Link salvato: «Apri scheda esterna» nel menu della pedina.",
            "Link saved: “Open external sheet” in the token menu.",
          ),
        );
      },
    },
  );
  const dialog = globalThis.document?.querySelector?.("#dialog");
  dialog?.querySelector("[data-int-sheet-remove]")?.addEventListener("click", () => {
    try {
      removeSheet(ctx, actorId);
    } catch (error) {
      // Like the shell's own dialog errors: shown inside the open dialog, which stays.
      const box = dialog.querySelector(".dialog-error");
      if (box) {
        box.textContent = errorText(ctx, error);
        box.hidden = false;
      }
    }
  });
}
/** Removes the link; a refusal (offline, no control) is thrown for the dialog to show. */
function removeSheet(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const link = sliceOf(ctx.state).sheets[actorId];
  commitIn(
    ctx,
    ctx.t(`Scheda esterna rimossa: ${actor?.name}`, `External sheet removed: ${actor?.name}`),
    (draft, slice) => D.removeSheetLink(draft, slice, actorId, ctx.role),
    {
      ...(actor ? sheetOptions(ctx, actor) : {}),
      ...(link?.shared ? {} : { visibility: "private" }),
    },
  );
  ctx.closeDialog();
  ctx.toast(ctx.t("Link rimosso.", "Link removed."));
}
function inspectorPanel(ctx, tableView) {
  const actorId = tableView?.selectedActorId;
  const link = D.sheetLinkFor(ctx.state, sliceOf(ctx.state), actorId, ctx.role);
  if (!link) return "";
  const control = ctx.canControl(ctx.state.actors[actorId]);
  return `<p class="int-sheet-line" data-int-sheet-panel><span><strong>${ctx.esc(D.hostOf(link.url))}</strong>${link.shared ? "" : ` <small>(${ctx.t("solo chi la controlla", "controllers only")})</small>`}</span><span class="toolbar"><button type="button" class="button" data-int-sheet-open="${ctx.esc(actorId)}">${ctx.t("Apri", "Open")} ↗</button>${control ? `<button type="button" class="button quiet" data-int-sheet-edit="${ctx.esc(actorId)}">${ctx.t("Modifica…", "Edit…")}</button>` : ""}</span></p>`;
}
function bindInspector(el, ctx) {
  el.querySelectorAll("[data-int-sheet-open]").forEach((b) =>
    b.addEventListener("click", () => openExternal(ctx, b.dataset.intSheetOpen)),
  );
  el.querySelectorAll("[data-int-sheet-edit]").forEach((b) =>
    b.addEventListener("click", () => sheetDialog(ctx, b.dataset.intSheetEdit)),
  );
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./integrations.css", import.meta.url));
  // SV-42: the areas switched off in this campaign disappear for everyone (registry gate).
  registry.registerModuleGate({
    disabled: (ctx) =>
      ctx?.state?.campaign?.id ? D.disabledAreas(ctx.state.ext?.[D.ID], ctx.state.campaign.id) : [],
  });
  registry.add("command", {
    id: "integrations.modules",
    label: L("Moduli: attiva o spegni funzioni", "Modules: switch features on or off"),
    description: L(
      "moduli, estensioni, componenti aggiuntivi, add-on, funzioni, attiva, disattiva, spegni, tabelle, mazzi, archivio, grafo",
      "modules, extensions, add-ons, plugins, features, enable, disable, switch off, tables, decks, archive, graph",
    ),
    group: "services",
    when: (ctx) => Boolean(cidOf(ctx)),
    run: (ctx) => ctx.navigate("campaign", { tab: SECTION, id: "modules" }),
  });
  registry.add("campaign-section", {
    id: SECTION,
    group: "manage",
    label: L("Integrazioni", "Integrations"),
    order: 71,
    render: renderSection,
    bind: bindSection,
  });
  registry.add("token-menu", {
    id: "integrations-sheet-open",
    submenu: "dm",
    label: L("Apri scheda esterna", "Open external sheet"),
    icon: "book",
    group: "integrations",
    when: (ctx, target) =>
      on(ctx, "sheets") &&
      Boolean(D.sheetLinkFor(ctx.state, sliceOf(ctx.state), target?.actorId, ctx.role)),
    run: (ctx, target) => openExternal(ctx, target.actorId),
  });
  registry.add("token-menu", {
    id: "integrations-sheet-edit",
    submenu: "dm",
    label: L("Scheda esterna…", "External sheet…"),
    icon: "book",
    group: "integrations",
    when: (ctx, target) =>
      on(ctx, "sheets") &&
      Boolean(ctx.state.actors?.[target?.actorId]) &&
      ctx.canControl(ctx.state.actors[target.actorId]),
    run: (ctx, target) => sheetDialog(ctx, target.actorId),
  });
  registry.add("table-panel", {
    id: "integrations-sheet",
    label: L("Scheda esterna", "External sheet"),
    placement: "inspector",
    when: (ctx, tableView) =>
      on(ctx, "sheets") &&
      Boolean(D.sheetLinkFor(ctx.state, sliceOf(ctx.state), tableView?.selectedActorId, ctx.role)),
    render: inspectorPanel,
    bind: bindInspector,
  });
  registry.add("command", {
    id: "integrations.ics",
    label: L(
      "Aggiungi la prossima sessione al calendario",
      "Add the next session to your calendar",
    ),
    description: L(
      "calendario, Google Calendar, Apple Calendario, Outlook, iCal, ical, file .ics, webcal, link del calendario",
      "calendar, Google Calendar, Apple Calendar, Outlook, iCal, .ics file, webcal, calendar link",
    ),
    group: "services",
    when: (ctx) => Boolean(cidOf(ctx)) && on(ctx, "calendar"),
    run: (ctx) => openAddToCalendar(ctx),
  });
  registry.add("command", {
    id: "integrations.reminders",
    label: L("Promemoria delle sessioni", "Session reminders"),
    description: L(
      "promemoria, avvisami, ricordami, 24 ore prima, un’ora prima, all’inizio, campanella",
      "reminders, remind me, notify me, 24 hours before, one hour before, at the start, bell",
    ),
    group: "services",
    when: (ctx) => Boolean(cidOf(ctx)),
    run: (ctx) => openReminders(ctx),
  });
  // Foundry to Discord lives in the campaign's settings: here it is one search away too
  // (P9 SV-38; «Impostazioni» itself is the settings area's page).
  registry.add("command", {
    id: "integrations.discord",
    label: L(
      "Discord: inoltra tiri e avvisi a un canale",
      "Discord: relay rolls and notices to a channel",
    ),
    description: L(
      "discord, webhook, canale, inoltro dei tiri, tiri pubblici, avrae, bot",
      "discord, webhook, channel, roll relay, public rolls, avrae, bot",
    ),
    group: "services",
    roles: ["dm"],
    when: (ctx) => Boolean(cidOf(ctx)),
    run: (ctx) =>
      ctx.navigate("campaign", { tab: SECTION, id: on(ctx, "relay") ? "discord" : "modules" }),
  });
  registry.add("command", {
    id: "integrations.api-token",
    label: L("Crea un token API", "Create an API token"),
    description: L(
      "api, token, token personale, bot, webhook, accesso programmato",
      "api, token, personal token, bot, webhook, programmatic access",
    ),
    group: "services",
    when: (ctx) => Boolean(cidOf(ctx)),
    run: (ctx) => {
      ctx.navigate("campaign", { tab: SECTION, id: "api" });
      globalThis.document?.querySelector?.('#content [data-int-token-form] [name="name"]')?.focus();
    },
  });
  // Home's «Prossimo appuntamento» card (P1 home-ui) presses this service.
  registry.add("service", {
    id: "integrations-add-to-calendar",
    label: L("Aggiungi al calendario", "Add to calendar"),
    icon: "clock",
    when: (ctx) => calendarReady(ctx) && Boolean(D.nextSession(ctx.state, ctx.role)),
    run: (ctx) => openAddToCalendar(ctx),
  });
  registry.add("campaign-section", {
    id: "integrations.session",
    label: L("Aggiungi al calendario e promemoria", "Add to calendar and reminders"),
    when: (ctx, row) =>
      typeof row?.id === "string" && typeof row?.status === "string" && "startsAt" in row,
    render: (ctx, row) => sessionCalendarHTML(ctx, row),
    bind: (el, ctx) => {
      el.querySelectorAll("[data-int-card-calendar]").forEach((button) => {
        button.onclick = () => openAddToCalendar(ctx, button.dataset.intCardCalendar);
      });
      el.querySelectorAll("[data-int-card-reminders]").forEach((button) => {
        button.onclick = () => openReminders(ctx);
      });
    },
  });
  registry.add("command", {
    id: "integrations.open",
    label: L("Apri le integrazioni della campagna", "Open the campaign integrations"),
    group: "services",
    run: (ctx) => ctx.navigate("campaign", { tab: SECTION }),
  });
  registry.on("role-changed", () => resetIntegrationsView());
  registry.on("reset", () => resetIntegrationsView());
}

/** The handlers the bound controls call, for Node tests (same functions, no DOM). */
export const integrationsActions = Object.freeze({
  changeModule,
  saveModules,
  deactivateAll,
  retractNote,
  downloadNext,
  runPreview,
  importNew,
  importUpdate,
  createToken,
  webhookDialog,
  sheetDialog,
  openExternal,
  confirmDeleteWebhook,
  confirmRevokeToken,
  confirmRotateFeed,
  confirmRemoveWebhook,
  removeSheet,
});
