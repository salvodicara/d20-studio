import * as content from "./campaign-content.mjs";
import * as appointments from "./campaign-sessions.mjs";
import { canViewActor, isCampaignActor } from "./character-access.mjs";
// B16: "@Embed[ref]" in entry text renders an area block (dnd5e @Embed); other text stays escaped.
import {
  bindTextEmbeds,
  renderTextWithEmbeds,
  openEmbedPicker,
  insertEmbed,
} from "./text-embeds.mjs";
// P9: Journal, World and notes share the Archive's page engine (links, secrets, backlinks,
// unlinked mentions, nested entries, tabs, templates and views; triage CA-12…CA-24).
import * as jp from "./journal-plus.mjs";
// P10 CA-49 (shared edit): the overview heading's «Invita giocatori».
import { inviteButton, openInvite } from "./campaign-members.mjs";
// R8 CA-88: «Copia in un’altra campagna…» from an entry's own menus (contract C5).
import { canCopyToCampaign, copyToCampaign } from "./ui.mjs";

let working = null;
let focusRoute = null;
const searches = new Map();
const clone = (value) => structuredClone(value);
const uid = () => crypto.randomUUID();
const privateCommit = { local: true, visibility: "private", undoable: false };
const entryLabels = {
  note: ["Appunto", "Note"],
  world: ["Voce del mondo", "World entry"],
  quest: ["Obiettivo", "Objective"],
  recap: ["Resoconto", "Recap"],
};
const sessionLabels = {
  direct: ["Data già concordata", "Agreed appointment"],
  poll: ["Raccogli disponibilità", "Collect availability"],
  change: ["Modifica appuntamento", "Change appointment"],
  cancel: ["Annulla appuntamento", "Cancel appointment"],
  confirm: ["Conferma appuntamento", "Confirm appointment"],
  played: ["Registra una partita giocata", "Record a played session"],
};
const modeLabels = {
  private: ["Solo io", "Only me"],
  dms: ["Io e i DM", "Me and the DMs"],
  selected: ["Persone scelte", "Selected people"],
  campaign: ["Gruppo della campagna", "Campaign group"],
};
function errorText(ctx, error) {
  return error?.it ? ctx.t(error.it, error.en) : String(error?.message || error || "");
}
function attempt(ctx, callback) {
  try {
    return callback();
  } catch (error) {
    const text = errorText(ctx, error);
    if (working && working.owner === ctx.role) working.error = text;
    ctx.toast(text, true);
    ctx.render();
    return false;
  }
}
function mutate(ctx, label, callback, options = {}) {
  let result;
  ctx.commit(
    label,
    (state) => {
      result = callback(state);
    },
    { ...options, undoable: false },
  );
  return result;
}
function online(ctx) {
  return { online: !ctx.offline };
}
function returnTarget(value) {
  try {
    const route = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !route ||
      ![
        "home",
        "campaign",
        "campaigns",
        "notes",
        "table",
        "characters",
        "builder",
        "library",
        "preparation",
      ].includes(route.page)
    )
      return null;
    const result = { page: route.page };
    for (const key of ["id", "tab", "revision"])
      if (typeof route[key] === "string" && route[key].length < 200) result[key] = route[key];
    if (route.page === "library" && route.returnTo !== undefined) result.returnTo = route.returnTo;
    return content.validCampaignReturn(result) ? result : null;
  } catch {
    return null;
  }
}
function currentReturn(ctx) {
  return returnTarget(ctx.view.returnTo);
}
function withReturn(ctx, target = currentReturn(ctx)) {
  return target ? { returnTo: JSON.stringify(target) } : {};
}
function go(ctx, route) {
  const entryReturn = ["campaign", "notes"].includes(route?.page)
    ? returnTarget(route.returnTo)
    : null;
  const safe = returnTarget(route);
  if (safe) {
    const { page, ...params } = safe;
    ctx.navigate(page, {
      ...params,
      ...(entryReturn ? { returnTo: JSON.stringify(entryReturn) } : {}),
    });
  }
}
function entryPage(kind) {
  return kind === "note" ? "notes" : "campaign";
}
function entryTab(kind) {
  return kind === "world" ? "world" : "journal";
}
function entryTitle(ctx, entry) {
  return entry.data?.title || ctx.t(...(entryLabels[entry.kind] || entryLabels.note));
}
function person(ctx, id) {
  if (!id) return ctx.t("Autore sconosciuto", "Unknown author");
  const member = members(ctx).find((member) => member.id === id);
  return member
    ? memberName(ctx, member)
    : id === ctx.role
      ? ctx.t("Tu", "You")
      : ctx.t("Autore non disponibile", "Author unavailable");
}
// A member by the names people know at the table (P9 CA-43): a bilingual seed name
// ("Giocatore / Player") in the interface's language, a player with their characters.
function memberName(ctx, member) {
  const raw = ctx.label(member.name) || member.id;
  const parts = String(raw).split(" / ");
  const base = parts.length === 2 ? (ctx.lang === "en" ? parts[1] : parts[0]) : raw;
  if (["dm", "co-dm"].includes(member.role)) return base;
  const names = Object.values(ctx.state.actors || {})
    .filter(
      (actor) =>
        actor.kind === "character" &&
        !actor.companion &&
        actor.owner === member.id &&
        isCampaignActor(actor, ctx.state.campaign?.id) &&
        canViewActor(actor, ctx.role, ctx.state),
    )
    .map((actor) => ctx.label(actor.name));
  return names.length ? `${names.join(", ")} (${base})` : base;
}
function dateText(ctx, value, timeZone) {
  if (!value || Number.isNaN(new Date(value).getTime()))
    return ctx.t("Data non indicata", "Date not specified");
  try {
    return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(value));
  } catch {
    return ctx.t("Data non disponibile", "Date unavailable");
  }
}
function localTimezoneLabel(ctx) {
  return `${ctx.t("Nel tuo fuso", "Your timezone")} (${Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"})`;
}
// `proposal`: a date offered in an availability poll is a «Proposta», not an agreed time.
function appointmentTimes(ctx, value, { proposal = false } = {}) {
  return `<p><time datetime="${ctx.esc(value.startsAt)}">${ctx.esc(dateText(ctx, value.startsAt))}</time> · ${ctx.esc(localTimezoneLabel(ctx))}</p><p class="campaign-meta">${proposal ? ctx.t("Proposta", "Proposal") : ctx.t("Ora concordata", "Agreed time")}: ${ctx.esc(dateText(ctx, value.startsAt, value.timeZone))} · ${ctx.esc(value.timeZone)}</p>`;
}
function routeButton(ctx, label, route, style = "") {
  return `<button type="button" class="button ${style}" data-campaign-route="${ctx.esc(JSON.stringify(route))}">${ctx.esc(label)}</button>`;
}
function openEntryButton(ctx, entry, label = ctx.t("Leggi", "Read")) {
  return `<button type="button" class="button" data-campaign-open="${ctx.esc(entry.id)}">${ctx.esc(label)}</button>`;
}
function backButton(ctx, label = ctx.t("Torna indietro", "Go back")) {
  return `<button class="button quiet" type="button" data-campaign-return>${ctx.esc(label)}</button>`;
}
function heading(ctx, title, subtitle = "", commands = "") {
  return `<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.esc(title)}</h1>${subtitle ? `<p class="muted">${ctx.esc(subtitle)}</p>` : ""}</div>${commands}</header>`;
}
function issues(ctx, values = []) {
  return values.length
    ? `<ul class="campaign-issues error" role="alert">${values.map((item) => `<li>${ctx.esc(errorText(ctx, item))}</li>`).join("")}</ul>`
    : "";
}
// Text with [[links]] and @Embed blocks; "- [ ] …" lines are a checklist that editors tick
// (Monk's checklist, Markdown task lists).
function richText(ctx, text, { entry = null, sectionId = null, secret = false } = {}) {
  const value = String(text ?? "");
  const canEdit = Boolean(entry?.permissions?.canEdit) && !ctx.view.revision;
  const options = {
    entryId: entry?.id ?? null,
    canCreate: canEdit,
    secret,
    embed: (chunk) => renderTextWithEmbeds(ctx, chunk),
  };
  if (!/^[ \t]*- \[[ xX]\] /m.test(value)) return jp.linkedText(ctx, value, options);
  let out = "",
    buffer = "",
    offset = 0;
  const flush = () => {
    if (buffer) out += jp.linkedText(ctx, buffer, options);
    buffer = "";
  };
  for (const line of value.split("\n")) {
    const match = /^([ \t]*- \[)([ xX])(\] )(.*)$/.exec(line);
    if (match) {
      flush();
      const done = match[2] !== " ";
      const at = offset + match[1].length;
      out += `<label class="campaign-check campaign-task${done ? " is-done" : ""}"><input type="checkbox" ${done ? "checked" : ""} ${canEdit ? `data-campaign-task="${at}" data-task-mark="${ctx.esc(match[2])}" data-task-section="${ctx.esc(sectionId ?? "")}"` : 'disabled aria-describedby="campaign-task-why"'}><span>${jp.linkedText(ctx, match[4], options)}</span></label>`;
    } else buffer += line + "\n";
    offset += line.length + 1;
  }
  flush();
  return out;
}
// A section the author keeps from the entry's readers is a secret block (LegendKeeper
// /secret, Foundry secret blocks): the author sees it marked, with «Rivela…» per block.
function secretOf(entry, section) {
  const mode = section.access?.mode;
  if (!entry || !mode || !entry.access || entry.access.mode === "private") return null;
  if (mode === "private") return "private";
  if (mode === "dms" && entry.access?.mode !== "dms") return "dms";
  if (mode === "selected" && ["campaign", "dms"].includes(entry.access?.mode)) return "selected";
  return null;
}
const wasRevealed = (entry, section) =>
  (entry?.history ?? []).some(
    (row) => row.change?.kind === "reveal" && row.change.sectionId === section.id,
  );
function sectionHTML(ctx, section, entry) {
  const secret = entry?.ownerId === ctx.role ? secretOf(entry, section) : null;
  const revealed = !secret && wasRevealed(entry, section);
  const owner = entry?.ownerId === ctx.role && !ctx.view.revision;
  const tag = secret
    ? `<p class="campaign-secret-tag">${ctx.icon?.("eye") ?? ""}${
        secret === "private"
          ? ctx.t("Segreto · visibile solo a te", "Secret · visible to you only")
          : secret === "dms"
            ? ctx.t("Segreto · visibile solo ai DM", "Secret · visible to the DMs only")
            : ctx.t("Segreto · solo alle persone scelte", "Secret · chosen people only")
      }</p>`
    : revealed
      ? `<p class="campaign-secret-tag is-revealed">${ctx.t("Rivelato", "Revealed")}</p>`
      : "";
  const actions =
    owner && entry.campaignId
      ? secret
        ? `<div class="campaign-toolbar"><button type="button" class="button" data-campaign-reveal="${ctx.esc(section.id)}">${ctx.t("Rivela…", "Reveal…")}</button></div>`
        : revealed
          ? `<div class="campaign-toolbar"><button type="button" class="button quiet" data-campaign-hide="${ctx.esc(section.id)}">${ctx.t("Nascondi di nuovo", "Hide again")}</button></div>`
          : ""
      : "";
  return `<section class="campaign-section-block${secret ? " is-secret" : ""}${revealed ? " is-revealed" : ""}">${tag}<h2>${ctx.esc(section.title || ctx.t("Sezione", "Section"))}</h2><div class="campaign-prose">${richText(ctx, section.body || "", { entry, sectionId: section.id, secret: Boolean(secret) })}</div>${actions}</section>`;
}
function prose(ctx, data, entry = null) {
  const html = `<div class="campaign-prose">${richText(ctx, data?.body || "", { entry })}</div>${(data?.sections || []).map((section) => sectionHTML(ctx, section, entry)).join("")}`;
  // SV-37: a checklist that cannot be ticked says why, once for the whole entry.
  const why = html.includes('aria-describedby="campaign-task-why"')
    ? `<p class="campaign-meta" id="campaign-task-why">${ctx.view.revision ? ctx.t("Stai leggendo una versione precedente: torna alla versione corrente per spuntare l’elenco.", "You are reading an earlier version: go back to the current version to tick the list.") : ctx.t("Solo chi può modificare questa voce spunta l’elenco: chiedi all’autore il permesso di modifica.", "Only people who can edit this entry tick the list: ask the author for edit permission.")}</p>`
    : "";
  return `<div class="campaign-readable">${html}${why}</div>`;
}
// H-05: a list row's excerpt through the viewer's content filter (masked words; a veiled
// entry shows only that it is blurred and why).
function excerptHTML(ctx, entry) {
  const shown = jp.filterExcerpt(
    ctx,
    "entry",
    entry.id,
    jp.plainText(entry.data.body || "").slice(0, 150),
  );
  return shown.veiled
    ? `<p class="campaign-meta campaign-veiled">${ctx.esc(shown.veiled)}</p>`
    : `<p class="campaign-prose">${ctx.esc(shown.text)}</p>`;
}
// CA-88: the item's own menu copies it to another campaign (World and Journal entries of
// their author; notes stay personal).
const copyable = (ctx, entry) =>
  entry.kind !== "note" && entry.ownerId === ctx.role && canCopyToCampaign(ctx);
function links(ctx, refs = []) {
  const resolved = content.resolveCampaignLinks(ctx.state, refs, ctx.role);
  return resolved.length
    ? `<section class="campaign-links"><h2>${ctx.t("Collegamenti", "Links")}</h2><div class="campaign-toolbar">${resolved.map((link) => routeButton(ctx, ctx.label(link.label), ctx.view.tab === "entry" && ["campaign", "notes"].includes(link.route.page) ? { ...link.route, returnTo: JSON.stringify(returnTarget({ page: ctx.view.page, id: ctx.view.id, tab: "entry", ...(ctx.view.revision ? { revision: ctx.view.revision } : {}) })) } : link.route, "quiet")).join("")}</div></section>`
    : "";
}
function searchKey(ctx) {
  return [ctx.role, ctx.view.page, ctx.view.tab || "overview"].join(":");
}
function filters(ctx) {
  return searches.get(searchKey(ctx)) || { query: "", type: "" };
}
const isDmViewer = (ctx) =>
  members(ctx).some((member) => member.id === ctx.role && ["dm", "co-dm"].includes(member.role));
function members(ctx, campaignId = ctx.state.campaign?.id) {
  return campaignId ? content.getCampaignMembers(ctx.state, campaignId, ctx.role) : [];
}
function actorRows(ctx) {
  if (!members(ctx).length) return [];
  return Object.values(ctx.state.actors || {}).filter(
    (actor) =>
      (actor.kind === "character" || actor.companion) &&
      isCampaignActor(actor, ctx.state.campaign?.id) &&
      canViewActor(actor, ctx.role, ctx.state),
  );
}
function group(ctx) {
  const actors = actorRows(ctx);
  // P1 PG-85 (DDB «Join with this character»): one of your own sheets joins this campaign
  // (character-library's service opens openLinkToCampaign for the campaign in play).
  const addOwn = `<div class="toolbar"><button type="button" class="button" data-service="character-library-add-own">${ctx.t("Aggiungi un mio personaggio", "Add one of my characters")}</button></div>`;
  return (
    addOwn +
    (actors.length
      ? actors
          .map(
            (actor) =>
              `<article class="campaign-row"><div><h3>${ctx.esc(ctx.label(actor.name))}</h3><p>${ctx.esc(ctx.label(actor.className))}</p><p class="campaign-meta">${actor.hp ?? "?"} / ${actor.maxHp ?? "?"} ${ctx.t("PF", "HP")}</p></div>${routeButton(ctx, ctx.t("Apri scheda", "Open sheet"), { page: "characters", id: actor.id, tab: "actions" })}</article>`,
          )
          .join("")
      : `<p class="campaign-empty">${ctx.t("Nessuna scheda del gruppo disponibile.", "No available party sheets.")}</p>`)
  );
}
function revealedScenes(ctx) {
  const scenes = (ctx.state.scenes || []).filter((scene) => scene.revealed === true);
  return scenes.length
    ? `<section><h2>${ctx.t("Materiale rivelato", "Revealed material")}</h2>${scenes.map((scene) => `<article class="campaign-row"><div><h3>${ctx.esc(scene.name)}</h3><p>${ctx.esc(scene.publicDescription || "")}</p></div><button type="button" class="button" data-public-scene="${ctx.esc(scene.id)}">${ctx.t("Consulta mappa", "View map")}</button></article>`).join("")}</section>`
    : "";
}
function overview(ctx) {
  const hub = content.getCampaignHub(ctx.state, ctx.state.campaign?.id, ctx.role);
  const recap = hub.latestRecap,
    next = hub.upcomingSession;
  // B20 campaign policy (campaign-settings.mjs, Kanka CMP-24): a section the DM turned off
  // leaves the overview too, with its cards and buttons.
  const hidden =
    ctx.state.ext?.["campaign-settings"]?.campaigns?.[ctx.state.campaign?.id]?.policy
      ?.hiddenSections ?? [];
  const on = (id, html) => (hidden.includes(id) ? "" : html);
  return (
    heading(
      ctx,
      ctx.t("Panoramica", "Overview"),
      ctx.label(hub.campaign?.name),
      // P10 CA-49 (shared edit): «Invita giocatori» in the overview heading.
      inviteButton(ctx) +
        routeButton(ctx, ctx.t("Entra al Tavolo", "Enter table"), { page: "table" }, "primary"),
    ) +
    `<div class="campaign-hub">${on("journal", `<section><h2>${ctx.t("Dove eravamo rimasti", "Previously")}</h2>${recap ? `<h3>${ctx.esc(entryTitle(ctx, recap))}</h3><p class="campaign-prose">${ctx.esc((recap.data.body || "").slice(0, 280))}</p>${openEntryButton(ctx, recap, ctx.t("Leggi il resoconto", "Read recap"))}` : `<p>${ctx.t("Non ci sono ancora resoconti accessibili. Puoi entrare al Tavolo anche senza scriverne uno.", "There are no accessible recaps yet. You can enter the table without writing one.")}</p>${routeButton(ctx, ctx.t("Apri Diario", "Open Journal"), { page: "campaign", tab: "journal" })}`}</section>`)}${on("sessions", `<section class="campaign-next"><h2>${ctx.t("Il prossimo appuntamento", "Next appointment")}</h2>${next ? `<h3>${ctx.esc(next.title || ctx.t("Sessione", "Session"))}</h3>${appointmentTimes(ctx, next)}` : `<p>${ctx.t("Nessuna data concordata.", "No agreed date.")}</p>`}${routeButton(ctx, ctx.t("Apri Sessioni", "Open Sessions"), { page: "campaign", tab: "sessions" })}</section>`)}</div>${on("group", `<section><h2>${ctx.t("Personaggi del gruppo", "Party characters")}</h2>${group(ctx)}</section>`)}${revealedScenes(ctx)}<div class="campaign-toolbar">${on("world", routeButton(ctx, ctx.t("Esplora il mondo", "Explore the world"), { page: "campaign", tab: "world" }))}${routeButton(ctx, ctx.t("I tuoi appunti", "Your notes"), { page: "notes" })}</div>`
  );
}
function drafts(ctx, kind) {
  const rows =
    kind === "session"
      ? appointments.listSessionDrafts(ctx.state, ctx.role)
      : content
          .listCampaignDrafts(ctx.state, ctx.role)
          .filter((draft) =>
            ctx.view.page === "notes"
              ? draft.kind === "note"
              : ctx.view.tab === "world"
                ? draft.kind === "world"
                : draft.kind !== "note" && draft.kind !== "world",
          );
  return rows.length
    ? `<section><h2>${ctx.t("Bozze private", "Private drafts")}</h2>${rows.map((draft) => `<article class="campaign-row"><div><h3>${ctx.esc(draft.data.title || ctx.t(...(kind === "session" ? sessionLabels[draft.kind] : entryLabels[draft.kind])))}</h3><p class="campaign-meta">${ctx.t("Salvata su questo dispositivo · non applicata", "Saved on this device · not applied")}</p></div><button type="button" class="button" data-campaign-resume="${ctx.esc(draft.id)}" data-draft-type="${kind}">${ctx.t("Riprendi", "Resume")}</button></article>`).join("")}</section>`
    : "";
}
// «Nuova voce» offers every typed entry in one place (Monk's Enhanced Journal: Person,
// Place, Organization, Shop, Event, Checklist…; CA-19), and a saved template (CA-17).
function newEntryMenu(ctx, kinds, world) {
  if (world)
    return `<button type="button" class="button primary" data-campaign-new="world">${ctx.t("Nuova voce del mondo", "New world entry")}</button><details class="campaign-new-menu" data-campaign-new-menu><summary class="button">${ctx.t("Scegli il tipo…", "Choose the type…")}</summary><div class="campaign-new-list" role="group" aria-label="${ctx.t("Tipo della nuova voce", "Type of the new entry")}">${content.WORLD_TYPES.map((type) => `<button type="button" class="button quiet" data-campaign-new-type="${type}">${ctx.esc(ctx.label(jp.WORLD_TYPE_LABELS[type]))}</button>`).join("")}<button type="button" class="button quiet" data-campaign-new-template="world">${ctx.t("Da un modello o kit…", "From a template or kit…")}</button></div></details>`;
  return `${kinds.map((kind) => `<button type="button" class="button ${kind === kinds[0] ? "primary" : ""}" data-campaign-new="${kind}">${ctx.esc(newLabel(ctx, kind))}</button>`).join("")}${kinds.includes("recap") ? `<button type="button" class="button quiet" data-campaign-new-template="recap">${ctx.t("Da un modello…", "From a template…")}</button>` : ""}`;
}
function newLabel(ctx, kind) {
  return {
    note: ctx.t("Nuovo appunto", "New note"),
    recap: ctx.t("Nuovo resoconto", "New recap"),
    quest: ctx.t("Nuovo obiettivo", "New objective"),
    world: ctx.t("Nuova voce del mondo", "New world entry"),
  }[kind];
}
// Saved views over every entry, the World's included (Obsidian Bases, Kanka lists; CA-24).
function viewsStrip(ctx, tab, current) {
  const views = jp.listViews(ctx.state, ctx.role);
  return `<nav class="campaign-views" aria-label="${ctx.t("Viste salvate", "Saved views")}"><button type="button" class="button quiet ${current ? "" : "active"}" ${current ? "" : 'aria-current="true"'} data-campaign-route="${ctx.esc(JSON.stringify({ page: "campaign", tab }))}">${ctx.t("Tutte le voci", "All entries")}</button>${views.map((row) => `<button type="button" class="button quiet ${row.id === current?.id ? "active" : ""}" ${row.id === current?.id ? 'aria-current="true"' : ""} data-jp-view="${ctx.esc(row.id)}">${ctx.icon?.("grid") ?? ""}<span>${ctx.esc(jp.labelText(ctx, row.name))}</span></button>`).join("")}<button type="button" class="button quiet" data-jp-new-view>${ctx.icon?.("plus") ?? ""}<span>${ctx.t("Nuova vista", "New view")}</span></button></nav>`;
}
function collection(ctx) {
  const notes = ctx.view.page === "notes",
    world = ctx.view.tab === "world",
    f = filters(ctx);
  const kinds = notes ? ["note"] : world ? ["world"] : ["recap", "quest"];
  const tab = world ? "world" : "journal";
  const viewId = !notes && (ctx.view.id ?? "").startsWith("view:") ? ctx.view.id.slice(5) : null;
  const view = viewId ? jp.listViews(ctx.state, ctx.role).find((row) => row.id === viewId) : null;
  const entries = content
    .listCampaignEntries(
      ctx.state,
      { ...(notes ? {} : { campaignId: ctx.state.campaign?.id }), query: f.query },
      ctx.role,
    )
    .filter(
      (entry) =>
        kinds.includes(entry.kind) &&
        (!f.type || (world ? entry.data.worldType : entry.kind) === f.type),
    );
  const types = world
    ? content.WORLD_TYPES.map((type) => [type, ctx.label(jp.WORLD_TYPE_LABELS[type])])
    : [
        ["recap", ctx.t("Resoconti", "Recaps")],
        ["quest", ctx.t("Obiettivi", "Objectives")],
      ];
  const row = (entry) => {
    const own = entry.ownerId === ctx.role;
    return `<article class="campaign-row" data-campaign-row="${ctx.esc(entry.id)}"><div><h3>${ctx.esc(entryTitle(ctx, entry))}</h3>${excerptHTML(ctx, entry)}<p class="campaign-meta">${ctx.esc(entryTypeLabel(ctx, entry))} · ${ctx.esc(person(ctx, entry.ownerId))}${entry.access?.mode ? ` · ${ctx.t(...modeLabels[entry.access.mode])}` : ""}</p></div><div class="campaign-row-actions">${openEntryButton(ctx, entry)}${own ? `<button type="button" class="button quiet danger" data-campaign-delete="${ctx.esc(entry.id)}" aria-label="${ctx.esc(ctx.t("Elimina ", "Delete ") + entryTitle(ctx, entry))}">${ctx.t("Elimina", "Delete")}</button>` : ""}</div></article>`;
  };
  const list = view
    ? `<section><h2>${ctx.esc(jp.labelText(ctx, view.name))}${view.shared ? "" : ` <span class="badge">${ctx.t("Solo io", "Only me")}</span>`}</h2>${jp.renderViewResult(ctx, view)}${view.owner === ctx.role ? `<button type="button" class="button quiet" data-jp-delete-view="${ctx.esc(view.id)}">${ctx.t("Elimina questa vista", "Delete this view")}</button>` : ""}</section>`
    : `<form class="campaign-search" data-campaign-search><label class="field">${ctx.t("Cerca nel testo accessibile", "Search accessible text")}<input type="search" data-campaign-query value="${ctx.esc(f.query)}"></label>${!notes ? `<label class="field">${ctx.t("Tipo", "Type")}<select data-campaign-filter><option value="">${ctx.t("Tutti", "All")}</option>${types.map(([value, label]) => `<option value="${value}" ${f.type === value ? "selected" : ""}>${ctx.esc(label)}</option>`).join("")}</select></label>` : ""}<button type="submit" class="button">${ctx.t("Cerca", "Search")}</button>${f.query || f.type ? `<button type="button" class="button quiet" data-campaign-clear>${ctx.t("Azzera filtri", "Clear filters")}</button>` : ""}<p class="campaign-meta" role="status" data-campaign-search-hint></p></form>${drafts(ctx, "content")}<section><h2>${ctx.t("Voci che puoi leggere", "Entries you can read")} (${entries.length})</h2>${entries.length ? `${entries.map(row).join("")}<p class="campaign-meta campaign-hint">${ctx.t("Clic destro (o pressione lunga) su una voce: apri, modifica, elimina.", "Right-click (or long-press) an entry: open, edit, delete.")}</p>` : `<p class="campaign-empty">${f.query || f.type ? ctx.t("Nessuna voce corrisponde. Prova un altro testo o azzera i filtri.", "No matching entries. Try other text or clear the filters.") : notes ? ctx.t("Nessun appunto ancora. «Nuovo appunto» o il tasto N ne crea uno in un passo.", "No notes yet. “New note” or the N key creates one in one step.") : ctx.t("Non ci sono ancora voci accessibili. Puoi iniziare anche con poche righe.", "No accessible entries yet. A few lines are enough to begin.")}</p>`}</section>`;
  return (
    (currentReturn(ctx)
      ? backButton(ctx, ctx.t("Torna al punto di partenza", "Return to where you started"))
      : "") +
    (notes ? "" : jp.journalTabsHTML(ctx)) +
    heading(
      ctx,
      notes
        ? ctx.t("Appunti", "Notes")
        : world
          ? ctx.t("Mondo", "World")
          : ctx.t("Diario", "Journal"),
      notes
        ? ctx.t(
            "Le tue note e quelle condivise con te. Controlli tu chi legge le tue.",
            "Your notes and those shared with you. You control who can read yours.",
          )
        : ctx.label(ctx.state.campaign?.name),
      `<div class="campaign-toolbar">${newEntryMenu(ctx, kinds, world)}</div>`,
    ) +
    (notes ? "" : viewsStrip(ctx, tab, view)) +
    list
  );
}
function entryContext(ctx, entry) {
  const session = entry.data.sessionId
    ? appointments
        .listCampaignSessions(ctx.state, entry.campaignId, ctx.role)
        .find((row) => row.id === entry.data.sessionId)
    : null;
  const narrator = entry.data.narratorActorId
    ? ctx.state.actors?.[entry.data.narratorActorId]
    : null;
  return `${session ? `<p class="campaign-meta">${ctx.t("Sessione", "Session")}: ${ctx.esc(session.title || ctx.t("Senza titolo", "Untitled"))}${session.startsAt ? ` · ${ctx.esc(dateText(ctx, session.startsAt))}` : ""}</p>${routeButton(ctx, ctx.t("Apri Sessioni", "Open Sessions"), { page: "campaign", tab: "sessions" }, "quiet")}` : ""}${narrator && canViewActor(narrator, ctx.role) ? `<p class="campaign-meta">${ctx.t("Punto di vista", "Point of view")}: ${ctx.esc(ctx.label(narrator.name))}</p>` : ""}`;
}
// Entries that sit inside this one (LegendKeeper nesting) and the path above it.
function childEntries(ctx, entry) {
  return jp.readableEntries(ctx.state, ctx.role).filter((row) => row.data?.parentId === entry.id);
}
function breadcrumb(ctx, entry) {
  const trail = [];
  const seen = new Set([entry.id]);
  let parentId = entry.data?.parentId;
  while (parentId && !seen.has(parentId) && trail.length < 8) {
    seen.add(parentId);
    const parent = jp.readableEntries(ctx.state, ctx.role).find((row) => row.id === parentId);
    if (!parent) break;
    trail.unshift(parent);
    parentId = parent.data?.parentId;
  }
  return trail.length
    ? `<nav class="jp-breadcrumb" aria-label="${ctx.t("Percorso", "Path")}">${trail.map((row) => `<button type="button" class="jp-link" data-campaign-open="${ctx.esc(row.id)}">${ctx.esc(entryTitle(ctx, row))}</button>`).join(" › ")} ›</nav>`
    : "";
}
// The Archive's personal setting (quests area) also governs suggestions on entries; without
// that area the suggestions stay on.
const suggestionsOn = (ctx) => {
  try {
    return ctx.registry?.getSetting?.(ctx, "quests-links.suggest") !== false;
  } catch {
    return true;
  }
};
function detail(ctx) {
  const entry = content.getCampaignEntry(ctx.state, ctx.view.id, ctx.role, {
    revisionId: ctx.view.revision || undefined,
  });
  const p = entry.permissions;
  const reading = ctx.view.revision && entry.revisionId !== entry.currentRevisionId;
  // The visit joins this identity's journal tabs (Monk's browser-like tabs, CA-20).
  if (!reading && entry.kind !== "note") jp.visitEntry(ctx, entry.id);
  const tabs =
    entry.kind !== "note"
      ? jp.readTabs(jp.deviceStorage(), ctx.state.campaign?.id, ctx.role)
      : null;
  const marked = tabs?.bookmarks.includes(jp.entryKey(entry.id));
  const owner = entry.ownerId === ctx.role;
  const kids = childEntries(ctx, entry);
  const more = [
    entry.kind !== "note"
      ? `<button type="button" class="button quiet" data-jp-open-entry-new="${ctx.esc(entry.id)}">${ctx.t("Apri in una nuova scheda", "Open in a new tab")}</button>`
      : "",
    `<button type="button" class="button quiet" data-campaign-template="${ctx.esc(entry.id)}">${ctx.t("Salva come modello", "Save as template")}</button>`,
    !reading && copyable(ctx, entry)
      ? `<button type="button" class="button quiet" data-campaign-copy-to="${ctx.esc(entry.id)}">${ctx.t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>`
      : "",
    owner
      ? `<button type="button" class="button quiet danger" data-campaign-delete="${ctx.esc(entry.id)}">${ctx.t("Elimina…", "Delete…")}</button>`
      : "",
  ].join("");
  const commands = `<div class="campaign-toolbar">${p.canEdit ? `<button type="button" class="button primary" data-campaign-edit="${ctx.esc(entry.id)}">${ctx.t("Modifica", "Edit")}</button>` : ""}<button type="button" class="button" data-campaign-timeline="${ctx.esc(entry.id)}">${ctx.icon?.("clock") ?? ""}<span>${ctx.t("Cronologia", "History")} (${entry.history.length})</span></button>${p.canManageAccess ? `<button type="button" class="button" data-campaign-access>${ctx.t("Gestisci condivisione", "Manage sharing")}</button>` : p.canInvite ? `<button type="button" class="button" data-campaign-invite>${ctx.t("Invita un lettore", "Invite a reader")}</button>` : ""}${tabs ? `<button type="button" class="button quiet" data-jp-bookmark="${ctx.esc(jp.entryKey(entry.id))}" aria-pressed="${marked}">${marked ? ctx.t("Togli segnalibro", "Remove bookmark") : ctx.t("Segnalibro", "Bookmark")}</button>` : ""}<details class="campaign-more"><summary class="button quiet">${ctx.t("Altro", "More")}</summary><div class="campaign-more-menu">${more}</div></details></div>`;
  return (
    backButton(ctx) +
    (entry.kind !== "note" ? jp.journalTabsHTML(ctx) : "") +
    breadcrumb(ctx, entry) +
    heading(ctx, entryTitle(ctx, entry), entryTypeLabel(ctx, entry), commands) +
    `<p class="campaign-meta">${ctx.t("Proprietario", "Owner")}: ${ctx.esc(person(ctx, entry.ownerId))}${entry.access ? ` · ${ctx.t(...modeLabels[entry.access.mode])}` : ""}</p>${reading ? `<p class="campaign-notice">${ctx.t("Stai leggendo una versione precedente.", "You are reading an earlier version.")}</p>${p.canRestore ? `<div class="campaign-toolbar"><button type="button" class="button" data-campaign-restore="${ctx.esc(entry.revisionId)}">${ctx.t("Ripristina questa versione…", "Restore this version…")}</button><button type="button" class="button quiet" data-campaign-open="${ctx.esc(entry.id)}">${ctx.t("Torna alla versione corrente", "Back to the current version")}</button></div>` : ""}` : ""}${entry.kind === "quest" ? `<p>${ctx.t("Stato dichiarato", "Recorded status")}: ${ctx.esc(questLabel(ctx, entry.data.questStatus))}</p>` : ""}${entryContext(ctx, entry)}${jp.filterContent(ctx, "entry", entry.id, prose(ctx, entry.data, entry))}${links(ctx, entry.data.links)}${
      ctx.registry
        ?.list("campaign-section", ctx, entry)
        .filter((c) => c.id.endsWith(".entry"))
        .map((c) => ctx.registry.slot("campaign-section", c, ctx, entry))
        .join("") ?? ""
    }${kids.length ? `<section class="jp-panel"><h3>${ctx.t("Voci annidate", "Nested entries")}</h3><div class="jp-chips">${kids.map((row) => `<button type="button" class="button quiet" data-campaign-open="${ctx.esc(row.id)}">${ctx.esc(entryTitle(ctx, row))} <span class="campaign-meta">· ${ctx.esc(entryTypeLabel(ctx, row))}</span></button>`).join("")}</div></section>` : ""}${reading ? "" : jp.journalLinksPanel(ctx, { kind: "entry", id: entry.id }, { suggest: suggestionsOn(ctx), canSuggest: true })}`
  );
}
// The entry's own kind, typed for World entries (Persona, Negozio, Elenco…).
function entryTypeLabel(ctx, entry) {
  if (entry.kind === "world")
    return `${ctx.t(...entryLabels.world)} · ${ctx.label(jp.WORLD_TYPE_LABELS[entry.data?.worldType] ?? jp.WORLD_TYPE_LABELS.other)}`;
  return ctx.t(...entryLabels[entry.kind]);
}
/** The versions of an entry with what changed in each (Kanka «View changes», CA-82). */
export function entryHistoryHTML(ctx, entry) {
  const rows = [...entry.history].reverse();
  const byId = new Map(entry.history.map((row) => [row.id, row]));
  const textOf = (revisionId) => {
    try {
      return content.revisionText(ctx.state, entry.id, revisionId, ctx.role);
    } catch {
      return "";
    }
  };
  const change = (row) => {
    if (row.restoredFrom)
      return ctx.t(
        `Ripristinata da ${dateText(ctx, byId.get(row.restoredFrom)?.createdAt)}`,
        `Restored from ${dateText(ctx, byId.get(row.restoredFrom)?.createdAt)}`,
      );
    const kind = row.change?.kind;
    if (kind === "reveal") return ctx.t("Sezione rivelata", "Section revealed");
    if (kind === "hide") return ctx.t("Sezione nascosta di nuovo", "Section hidden again");
    if (kind === "link") return ctx.t("Collegamento aggiunto", "Link added");
    if (kind === "task") return ctx.t("Elenco spuntato", "Checklist ticked");
    return row.parentRevisionId
      ? ctx.t("Testo modificato", "Text edited")
      : ctx.t("Prima versione", "First version");
  };
  return `<div class="campaign-history" data-campaign-history-list><p class="muted">${ctx.t("Ogni salvataggio è una versione. Ripristinarne una crea una versione nuova: nessun testo va perso; permessi e partita restano quelli di adesso.", "Every save is a version. Restoring one creates a new version: no text is lost; permissions and gameplay stay as they are now.")}</p><ol class="campaign-history-list">${rows
    .map((row, index) => {
      const previous = entry.history[entry.history.length - 2 - index];
      const diff = previous ? content.diffText(textOf(previous.id), textOf(row.id)) : [];
      const changed = diff.filter((line) => line.op !== "same");
      const current = row.id === entry.currentRevisionId;
      return `<li class="campaign-history-row${current ? " is-current" : ""}"><p><strong>${ctx.esc(dateText(ctx, row.createdAt))}</strong> · ${ctx.esc(person(ctx, row.authorId))}${current ? ` · <span class="badge">${ctx.t("Corrente", "Current")}</span>` : ""}</p><p class="campaign-meta">${ctx.esc(change(row))}</p>${
        changed.length
          ? `<details><summary>${ctx.t(`Mostra le differenze (${changed.length} righe)`, `Show the changes (${changed.length} lines)`)}</summary><pre class="campaign-diff">${diff
              .filter(
                (line, i) =>
                  line.op !== "same" || diff[i - 1]?.op !== "same" || diff[i + 1]?.op !== "same",
              )
              .map(
                (line) =>
                  `<span class="diff-${line.op}">${line.op === "add" ? "+ " : line.op === "del" ? "− " : "  "}${ctx.esc(line.text)}</span>`,
              )
              .join("\n")}</pre></details>`
          : ""
      }<div class="campaign-toolbar"><button type="button" class="button quiet" data-campaign-history="${ctx.esc(row.id)}">${current ? ctx.t("Leggi versione corrente", "Read current version") : ctx.t("Leggi questa versione", "Read this version")}</button>${!current && entry.permissions.canRestore ? `<button type="button" class="button" data-campaign-restore-now="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button>` : ""}</div></li>`;
    })
    .join("")}</ol></div>`;
}
function questLabel(ctx, value) {
  return ctx.t(
    ...({
      open: ["Aperto", "Open"],
      completed: ["Completato", "Completed"],
      failed: ["Fallito", "Failed"],
      abandoned: ["Abbandonato", "Abandoned"],
    }[value] || ["Non indicato", "Unspecified"]),
  );
}
function draftFor(ctx) {
  try {
    return { type: "content", draft: content.getCampaignDraft(ctx.state, ctx.view.id, ctx.role) };
  } catch {
    return {
      type: "session",
      draft: appointments.getSessionDraft(ctx.state, ctx.view.id, ctx.role),
    };
  }
}
function draftApi(type) {
  return type === "session"
    ? {
        get: appointments.getSessionDraft,
        save: appointments.saveSessionDraft,
        preview: appointments.previewSessionDraft,
        apply: appointments.applySessionDraft,
        discard: appointments.discardSessionDraft,
      }
    : {
        get: content.getCampaignDraft,
        save: content.saveCampaignDraft,
        preview: content.previewCampaignDraft,
        apply: content.applyCampaignDraft,
        discard: content.discardCampaignDraft,
      };
}
function ensureWorking(ctx, type, draft) {
  if (
    !working ||
    working.id !== draft.id ||
    working.owner !== ctx.role ||
    (!working.dirty && working.revision !== draft.revision)
  )
    working = {
      type,
      id: draft.id,
      owner: ctx.role,
      revision: draft.revision,
      campaignId: draft.campaignId,
      rebaseRevisionId: undefined,
      rebaseRevision: undefined,
      openDetails:
        working?.id === draft.id && working.owner === ctx.role ? working.openDetails || {} : {},
      previewRecipient: ctx.role,
      data: clone(draft.data),
      access: clone(draft.access),
      dirty: false,
      reviewKey: null,
      error: "",
    };
}
function dirty(root, ctx) {
  working.dirty = true;
  working.reviewKey = null;
  working.error = "";
  working.reason = "";
  // Close review 01/10 (Kanka and Notion: autosave and one «Pubblica»): as soon as something
  // changes the main button works again, since one press saves the draft and applies it.
  const apply = root.querySelector("[data-campaign-apply]");
  if (apply?.disabled) {
    apply.disabled = false;
    apply.removeAttribute?.("aria-describedby");
  }
  const status = root.querySelector("[data-campaign-status]");
  if (status)
    status.textContent = ctx.t(
      "Modifiche in corso · la bozza privata si salva da sola",
      "Editing · the private draft saves itself",
    );
  scheduleAutosave(ctx);
}
// Autosave of the private draft (Kanka, D&D Beyond notes: one save, a visible state;
// SV-05). It keeps the field, the cursor and the scroll where they were.
let autosaveTimer = null;
function scheduleAutosave(ctx) {
  clearTimeout(autosaveTimer);
  const doc = globalThis.document;
  if (!doc?.querySelector) return;
  const id = working?.id;
  autosaveTimer = setTimeout(() => {
    if (!working?.dirty || working.id !== id || ctx.view.tab !== "edit" || ctx.view.id !== id)
      return;
    const active = doc.activeElement;
    const path = active?.dataset?.campaignPath;
    if (path) {
      working.pendingFocus = path;
      working.pendingSelection = { start: active.selectionStart, end: active.selectionEnd };
    }
    working.pendingScroll = globalThis.scrollY ?? 0;
    const root = doc.querySelector("#content");
    if (root) rememberDetails(root);
    try {
      persist(ctx);
      if (working) working.autosavedAt = new Date().toISOString();
      ctx.render();
    } catch (error) {
      if (working) {
        working.error = ctx.t(
          `Salvataggio automatico non riuscito: ${errorText(ctx, error)} Il testo resta qui; riprova con «Salva».`,
          `Autosave failed: ${errorText(ctx, error)} The text stays here; try again with “Save”.`,
        );
        ctx.render();
      }
    }
  }, 1200);
}
// Why the save did not happen, and what to do (Roll20 errors name cause and fix; SV-37).
const REMEDIES = {
  text: [
    "Manca il testo: scrivi un titolo o almeno una riga, poi premi di nuovo «Salva».",
    "The text is missing: write a title or at least one line, then press “Save” again.",
  ],
  conflict: [
    "Qualcuno ha cambiato la voce mentre scrivevi: confronta nell’anteprima e scegli «Usa questa base».",
    "Someone changed the entry while you were writing: compare in the preview and choose “Use this base”.",
  ],
  "campaign-required": [
    "Per condividere serve una campagna: sceglila in «Contesto dell’appunto» oppure lascia «Solo io».",
    "Sharing needs a campaign: choose it in “Note context” or keep “Only me”.",
  ],
  links: [
    "Un collegamento non è più disponibile: toglilo da «Collegamenti a voci».",
    "A link is no longer available: remove it from “Links to entries”.",
  ],
  permission: [
    "Non puoi più modificare questa voce: l’autore ha tolto il permesso. Copia il testo se ti serve.",
    "You can no longer edit this entry: the author removed the permission. Copy the text if you need it.",
  ],
  grants: [
    "Una persona scelta non fa più parte della campagna: togli il suo permesso e salva.",
    "A chosen person is no longer in the campaign: remove their permission and save.",
  ],
  parent: [
    "La voce che la contiene non è più leggibile: scegline un’altra o nessuna.",
    "The containing entry is no longer readable: choose another one or none.",
  ],
};
function reasonText(ctx, errors = []) {
  return errors
    .map((error) =>
      REMEDIES[error.code]
        ? ctx.t(...REMEDIES[error.code])
        : `${errorText(ctx, error)} ${ctx.t("Correggi e premi di nuovo «Salva».", "Fix it and press “Save” again.")}`,
    )
    .join(" ");
}
/** One save: the private draft, then the entry for its readers (SV-05). */
function saveAndApply(ctx, draft) {
  if (working.dirty) persist(ctx);
  const api = draftApi(working.type),
    value = api.preview(ctx.state, draft.id, ctx.role);
  if (!value.canApply) {
    working.tried = true;
    working.reason = reasonText(ctx, value.errors);
    ctx.render();
    globalThis.document?.querySelector?.("[data-campaign-apply-reason]")?.focus?.();
    return false;
  }
  const result = mutate(
    ctx,
    ctx.t("Contenuto di campagna aggiornato", "Campaign content updated"),
    (state) => api.apply(state, draft.id, { reviewKey: value.reviewKey }, ctx.role, online(ctx)),
    value.commit,
  );
  working = null;
  clearTimeout(autosaveTimer);
  if (result.entryId) {
    if (draft.kind === "note") ctx.toast(ctx.t("Appunto salvato.", "Note saved."));
    ctx.navigate(entryPage(draft.kind), {
      tab: "entry",
      id: result.entryId,
      ...withReturn(ctx, result.returnTo),
    });
  } else ctx.navigate("campaign", { tab: "sessions" });
  return true;
}
function setPath(object, path, value) {
  const keys = path.split(".");
  if (keys.some((key) => ["__proto__", "constructor", "prototype"].includes(key))) return;
  let target = object;
  keys.slice(0, -1).forEach((key) => {
    target = target[key];
  });
  target[keys.at(-1)] = value;
}
function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}
function field(ctx, path, label, type = "text") {
  return `<label class="field">${ctx.esc(label)}<input type="${type}" data-campaign-path="${path}" value="${ctx.esc(getPath(working, path) ?? "")}"></label>`;
}
function textField(ctx, path, label, { suggest = false, rows = 9 } = {}) {
  // The hint is a description, so the field's name stays its label («Testo»).
  const hint = suggest ? `hint-${path.replace(/[^a-z0-9]+/gi, "-")}` : "";
  return `<label class="field">${ctx.esc(label)}<textarea data-campaign-path="${path}" rows="${rows}"${suggest ? ` data-link-suggest aria-describedby="${hint}"` : ""}>${ctx.esc(getPath(working, path) ?? "")}</textarea></label>${suggest ? `<p class="campaign-meta campaign-field-hint" id="${hint}">${ctx.t("Scrivi @ o [[ per collegare una voce, una pagina dell’archivio, una scheda o una regola.", "Type @ or [[ to link an entry, an archive page, a sheet or a rule.")}</p>` : ""}`;
}
// Tools under a text field: a link (⌘K Quick Insert) and a selection moved to a new entry.
function writingTools(ctx, path, { secret = false } = {}) {
  return `<div class="campaign-toolbar campaign-writing-tools"><button type="button" class="button quiet" data-campaign-insert-link="${path}">${ctx.t("Collega una voce… (⌘K)", "Link an entry… (⌘K)")}</button><button type="button" class="button quiet" data-campaign-insert-roll="${path}">${ctx.t("Inserisci tiro…", "Insert roll…")}</button><button type="button" class="button quiet" data-campaign-cut="${path}">${ctx.t("Sposta la selezione in una nuova voce", "Move the selection to a new entry")}</button>${secret ? `<button type="button" class="button quiet" data-campaign-add-secret>${ctx.t("Aggiungi blocco segreto", "Add secret block")}</button>` : ""}</div>`;
}
function select(ctx, path, label, options) {
  return `<label class="field">${ctx.esc(label)}<select data-campaign-path="${path}">${options.map(([value, text]) => `<option value="${ctx.esc(value)}" ${getPath(working, path) === value ? "selected" : ""}>${ctx.esc(text)}</option>`).join("")}</select></label>`;
}
function accessFields(
  ctx,
  access,
  prefix = "access",
  ownerId = ctx.role,
  campaignId = ctx.state.campaign?.id,
) {
  const people = members(ctx, campaignId).filter((member) => member.id !== ownerId);
  const sectionAudience = prefix.startsWith("data.sections.");
  return `<label class="field">${ctx.t("Chi può leggere", "Who can read")}<select data-campaign-access-mode="${ctx.esc(prefix)}">${Object.entries(
    modeLabels,
  )
    .filter(([mode]) => mode === "private" || people.length)
    .map(
      ([mode, names]) =>
        `<option value="${mode}" ${access.mode === mode ? "selected" : ""}>${ctx.t(...names)}</option>`,
    )
    .join(
      "",
    )}</select></label><p class="campaign-meta">${sectionAudience ? ctx.t("Chi può modificare la voce può modificare ogni sezione che legge. Questa scelta limita solo i lettori.", "Editors of the entry may edit every section they can read. This choice limits readers only.") : ctx.t("Gruppo significa membri autorizzati della campagna, non Internet. La modifica non concede inviti automaticamente.", "Group means authorized campaign members, not the Internet. Editing does not automatically allow invitations.")}</p>${
    access.mode !== "private"
      ? people
          .map((member) => {
            const grant = access.grants?.find((grant) => grant.id === member.id),
              value =
                grant?.edit && !sectionAudience
                  ? "edit"
                  : grant?.read || grant?.edit
                    ? "read"
                    : "none";
            return `<div class="campaign-access-person"><span>${ctx.esc(ctx.label(member.name))}</span><label class="field">${sectionAudience ? ctx.t("Lettura aggiuntiva", "Additional readership") : ctx.t("Permesso aggiuntivo", "Additional permission")}<select data-campaign-grant="${ctx.esc(member.id)}" data-access-path="${ctx.esc(prefix)}"><option value="none" ${value === "none" ? "selected" : ""}>${ctx.t("Nessuno", "None")}</option><option value="read" ${value === "read" ? "selected" : ""}>${ctx.t("Legge", "Read")}</option>${!sectionAudience ? `<option value="edit" ${!sectionAudience && value === "edit" ? "selected" : ""}>${ctx.t("Modifica", "Edit")}</option>` : ""}</select></label>${!sectionAudience && value === "edit" ? `<label class="campaign-check"><input type="checkbox" data-campaign-grant-invite="${ctx.esc(member.id)}" data-access-path="${ctx.esc(prefix)}" ${grant.invite ? "checked" : ""}>${ctx.t("Può invitare lettori della campagna", "May invite campaign readers")}</label>` : ""}</div>`;
          })
          .join("")
      : ""
  }`;
}
function noteContext(ctx) {
  const available = members(ctx).length > 0;
  return `<label class="field">${ctx.t("Contesto dell’appunto", "Note context")}<select data-campaign-context><option value="" ${!working.campaignId ? "selected" : ""}>${ctx.t("Personale · senza campagna", "Personal · no campaign")}</option>${available ? `<option value="${ctx.esc(ctx.state.campaign.id)}" ${working.campaignId === ctx.state.campaign.id ? "selected" : ""}>${ctx.esc(ctx.label(ctx.state.campaign.name))}</option>` : ""}</select></label><p class="muted">${ctx.t("Il contesto non condivide la nota. Scegli una campagna per poter indicare destinatari del gruppo.", "Context does not share the note. Choose a campaign to make group recipients available.")}</p>`;
}
function contentEditor(ctx, draft) {
  let canManage = true;
  if (draft.entryId) {
    try {
      canManage = content.getCampaignEntry(ctx.state, draft.entryId, ctx.role).permissions
        .canManageAccess;
    } catch {
      canManage = false;
    }
  }
  const rows = content
    .listCampaignEntries(ctx.state, { campaignId: working.campaignId || undefined }, ctx.role)
    .filter((entry) => entry.id !== draft.entryId);
  const currentLinks = content.resolveCampaignLinks(ctx.state, working.data.links || [], ctx.role);
  const sessionRows = draft.campaignId
    ? appointments.listCampaignSessions(ctx.state, draft.campaignId, ctx.role)
    : [];
  const templates =
    draft.kind === "world" || draft.kind === "recap"
      ? jp.templateChoices(ctx, draft.kind === "world" ? "world" : "recap")
      : [];
  // The type sits next to the title (Monk's typed pages): it decides kits and views.
  const typeField =
    draft.kind === "world"
      ? select(
          ctx,
          "data.worldType",
          ctx.t("Tipo di voce", "Entry type"),
          content.WORLD_TYPES.map((type) => [type, ctx.label(jp.WORLD_TYPE_LABELS[type])]),
        ) +
        (working.data.worldType === "list"
          ? `<p class="muted">${ctx.t("Elenco: ogni riga «- [ ] cosa fare» diventa una casella da spuntare nella voce.", "Checklist: each “- [ ] thing to do” line becomes a box to tick in the entry.")}</p>`
          : "")
      : "";
  return `${draft.kind === "note" && canManage ? noteContext(ctx) : ""}${field(ctx, "data.title", ctx.t("Titolo (facoltativo)", "Title (optional)"))}${typeField}${textField(ctx, "data.body", ctx.t("Testo", "Text"), { suggest: true })}${writingTools(ctx, "data.body", { secret: canManage && Boolean(working.campaignId) })}${
    templates.length
      ? `<div class="campaign-toolbar campaign-template-row"><label class="field">${ctx.t("Kit o modello", "Kit or template")}<select data-campaign-template-choice>${templates.map((choice) => `<option value="${ctx.esc(choice.id)}">${ctx.esc(choice.label)}</option>`).join("")}</select></label><button type="button" class="button" data-campaign-apply-template>${ctx.t("Aggiungi i suoi campi", "Add its fields")}</button></div>`
      : ""
  }${
    ctx.registry
      ?.list("campaign-section", ctx, draft)
      .filter((c) => c.id.endsWith(".editor"))
      .map((c) => ctx.registry.slot("campaign-section", c, ctx, draft))
      .join("") ?? ""
  }${""}${
    draft.kind === "quest"
      ? select(
          ctx,
          "data.questStatus",
          ctx.t("Stato dell’obiettivo", "Objective status"),
          ["open", "completed", "failed", "abandoned"].map((value) => [
            value,
            questLabel(ctx, value),
          ]),
        ) +
        `<p class="muted">${ctx.t("Registrare lo stato non assegna premi o conseguenze di gioco.", "Recording status does not award rewards or apply gameplay consequences.")}</p>`
      : ""
  }${draft.kind === "recap" ? `<div class="campaign-toolbar campaign-autodraft"><button type="button" class="button" data-campaign-autodraft>${ctx.t("Prepara bozza automatica", "Prepare an automatic draft")}</button><span class="campaign-meta">${ctx.t("Presenze, durata, scene ed eventi di gioco della sessione; impostazioni ed eventi di sistema esclusi.", "Attendance, duration, scenes and play events of the session; settings and system events left out.")}</span></div><fieldset><legend>${ctx.t("Sessione e punto di vista", "Session and point of view")}</legend>${select(ctx, "data.sessionId", ctx.t("Sessione collegata", "Linked session"), [["", ctx.t("Nessuna sessione indicata", "No specified session")], ...sessionRows.map((row) => [row.id, row.title || dateText(ctx, row.startsAt)])])}<p class="muted">${ctx.t("Puoi registrare anche una partita non programmata da Sessioni. Il resoconto non chiude il Tavolo.", "You can record an unplanned game in Sessions. A recap does not close the table.")}</p>${select(ctx, "data.narratorActorId", ctx.t("Personaggio narrante (facoltativo)", "Narrating character (optional)"), [["", ctx.t("Nessuno", "None")], ...actorRows(ctx).map((actor) => [actor.id, ctx.label(actor.name)])])}</fieldset>` : ""}${canManage ? `<fieldset><legend>${ctx.t("Destinatari del salvataggio", "Audience when saved")}</legend>${accessFields(ctx, working.access || { mode: "private", grants: [] }, "access", ctx.role, working.campaignId)}</fieldset>` : `<p class="campaign-notice">${ctx.t("Puoi modificare il testo consentito. I destinatari rimangono quelli scelti dall’autore.", "You can edit permitted text. The owner controls the audience.")}</p>`}<details data-campaign-details="links" ${working.openDetails.links ? "open" : ""}><summary>${ctx.t("Collegamenti a voci", "Links to entries")}</summary><label class="field">${ctx.t("Scegli una voce accessibile", "Choose an accessible entry")}<select data-campaign-link-choice><option value="">${ctx.t("Scegli…", "Choose…")}</option>${rows.map((entry) => `<option value="${ctx.esc(entry.id)}">${ctx.esc(entryTitle(ctx, entry))}</option>`).join("")}</select></label><button type="button" class="button" data-campaign-add-link>${ctx.t("Aggiungi collegamento", "Add link")}</button>${currentLinks.map((link) => `<div class="campaign-row"><span>${ctx.esc(ctx.label(link.label))}</span><button type="button" class="button quiet" data-campaign-remove-link="${ctx.esc(JSON.stringify(link.kind === "homebrew" ? { kind: link.kind, ref: link.ref } : { kind: link.kind, id: link.id }))}">${ctx.t("Rimuovi", "Remove")}</button></div>`).join("")}</details><details data-campaign-details="sections" ${working.openDetails.sections ? "open" : ""}><summary>${ctx.t("Sezioni con destinatari propri", "Sections with their own audience")}${(working.data.sections || []).length ? ` (${working.data.sections.length})` : ""}</summary>${(working.data.sections || []).map((section, index) => `<fieldset class="${["private", "dms"].includes(section.access?.mode) && working.access?.mode !== "private" ? "campaign-secret-edit" : ""}"><legend>${ctx.t("Sezione", "Section")} ${index + 1}${["private", "dms"].includes(section.access?.mode) && working.access?.mode !== "private" ? ` · ${ctx.t("segreta", "secret")}` : ""}</legend>${field(ctx, `data.sections.${index}.title`, ctx.t("Titolo", "Title"))}${textField(ctx, `data.sections.${index}.body`, ctx.t("Testo della sezione", "Section text"), { suggest: true, rows: 5 })}${writingTools(ctx, `data.sections.${index}.body`)}${canManage ? accessFields(ctx, section.access, `data.sections.${index}.access`, ctx.role, working.campaignId) + `<button type="button" class="button quiet" data-campaign-remove-section="${index}">${ctx.t("Rimuovi sezione", "Remove section")}</button>` : ""}</fieldset>`).join("")}${canManage ? `<button type="button" class="button" data-campaign-add-section>${ctx.t("Aggiungi sezione riservata", "Add private section")}</button>` : ""}</details>`;
}
function timeFields(ctx, path) {
  const value = getPath(working, path),
    result = appointments.resolveSessionTime(value);
  return `<div class="campaign-date-fields">${field(ctx, `${path}.localTime`, ctx.t("Data e ora", "Date and time"), "datetime-local")}${field(ctx, `${path}.timeZone`, ctx.t("Fuso orario (es. Europe/Rome)", "Timezone (e.g. Europe/Rome)"))}</div>${result.candidates?.length > 1 ? select(ctx, `${path}.selectedInstant`, ctx.t("L’ora si ripete: scegli l’istante", "This time occurs twice: choose the instant"), [["", ctx.t("Scegli esplicitamente…", "Choose explicitly…")], ...result.candidates.map((candidate) => [candidate.startsAt, candidate.offsetLabel])]) : ""}`;
}
function sessionEditor(ctx, draft) {
  if (draft.kind === "cancel")
    return `<p>${ctx.t("L’appuntamento resta nello storico come annullato. I resoconti e la partita non cambiano.", "The appointment remains in history as cancelled. Recaps and gameplay stay unchanged.")}</p>${textField(ctx, "data.reason", ctx.t("Motivo (facoltativo)", "Reason (optional)"))}`;
  if (draft.kind === "confirm")
    return `<p>${ctx.t("Conferma l’alternativa mostrata nell’anteprima. Le disponibilità da sole non fissano la data.", "Confirm the option shown in the preview. Availability alone does not schedule a session.")}</p>`;
  return `${field(ctx, "data.title", ctx.t("Titolo (facoltativo)", "Title (optional)"))}${
    draft.kind === "played"
      ? `<p>${ctx.t("Registra una partita già giocata senza inventare una data. Non termina la partita aperta al Tavolo.", "Record a played session without inventing a date. This does not end gameplay at the table.")}</p>`
      : draft.kind === "poll"
        ? `<fieldset><legend>${ctx.t("Partecipanti", "Participants")}</legend>${members(ctx)
            .map(
              (member) =>
                `<label class="campaign-check"><input type="checkbox" data-campaign-participant="${ctx.esc(member.id)}" ${(working.data.participants || []).includes(member.id) ? "checked" : ""}>${ctx.esc(ctx.label(member.name))}</label>`,
            )
            .join(
              "",
            )}</fieldset>${(working.data.slots || []).map((slot, index) => `<fieldset><legend>${ctx.t("Alternativa", "Option")} ${index + 1}</legend>${timeFields(ctx, `data.slots.${index}`)}<button type="button" class="button quiet" data-campaign-remove-slot="${index}">${ctx.t("Rimuovi alternativa", "Remove option")}</button></fieldset>`).join("")}<button type="button" class="button" data-campaign-add-slot>${ctx.t("Aggiungi alternativa", "Add option")}</button>`
        : timeFields(ctx, "data")
  }`;
}
function audience(ctx, values = []) {
  return `<h3>${ctx.t("Destinatari effettivi", "Actual audience")}</h3>${values.length ? `<ul>${values.map((member) => `<li>${ctx.esc(ctx.label(member.name))} · ${member.edit ? ctx.t("modifica", "edit") : ctx.t("lettura", "read")}${member.invite ? " · " + ctx.t("invita lettori", "invite readers") : ""}</li>`).join("")}</ul>` : `<p>${ctx.t("Nessun destinatario disponibile.", "No available audience.")}</p>`}`;
}
function sessionPreview(ctx, proposed) {
  if (!proposed) return "";
  const slots = proposed.slots || (proposed.startsAt ? [proposed] : []);
  return `<h3>${ctx.esc(proposed.title || ctx.t("Sessione", "Session"))}</h3>${slots.map((slot) => `<p><time datetime="${ctx.esc(slot.startsAt)}">${ctx.esc(dateText(ctx, slot.startsAt, slot.timeZone))}</time> · ${ctx.esc(slot.timeZone || "")}</p><p class="campaign-meta">${ctx.esc(localTimezoneLabel(ctx))}: ${ctx.esc(dateText(ctx, slot.startsAt))}</p>`).join("")}${proposed.status === "cancelled" ? `<p>${ctx.t("Appuntamento annullato", "Appointment cancelled")}</p>` : ""}<p class="muted">${ctx.t("Nessun invio esterno. Tempo narrativo e riposi rimangono invariati.", "No external delivery. Narrative time and rests remain unchanged.")}</p>`;
}
function recipientPreview(ctx, value, title) {
  if (!value.proposed || !value.audience.length)
    return `<p class="campaign-notice">${ctx.t("Anteprima non disponibile con gli accessi correnti. La tua bozza resta conservata.", "Preview unavailable with current access. Your draft is retained.")}</p>`;
  const recipientId = value.audience.some((person) => person.id === working.previewRecipient)
    ? working.previewRecipient
    : value.audience[0].id;
  working.previewRecipient = recipientId;
  const selected = content.previewCampaignAudience(ctx.state, working.id, recipientId, ctx.role);
  return `<label class="field">${ctx.t("Come lo vedrà…", "As seen by…")}<select data-campaign-preview-person>${value.audience.map((member) => `<option value="${ctx.esc(member.id)}" ${member.id === recipientId ? "selected" : ""}>${ctx.esc(member.id === ctx.role ? ctx.t("Tu", "You") : ctx.label(member.name))}</option>`).join("")}</select></label><p class="campaign-meta">${ctx.t("La vista include solo ciò che tu e il destinatario siete autorizzati a leggere.", "This view includes only content both you and the recipient may read.")}</p><div data-campaign-recipient-preview><h3>${ctx.esc(selected.data.title || title)}</h3>${prose(ctx, selected.data)}${links(ctx, selected.data.links)}</div><!-- recipient-preview -->`;
}
function editor(ctx) {
  const { type, draft } = draftFor(ctx);
  if (draft.status !== "active") {
    working = null;
    return unavailable(ctx);
  }
  ensureWorking(ctx, type, draft);
  const value = draftApi(type).preview(ctx.state, draft.id, ctx.role);
  working.reviewKey = working.dirty ? null : value.reviewKey;
  // A saved draft that cannot be applied keeps «Salva» disabled with the reason next to it
  // (SV-37); while typing it stays enabled: one press saves the draft and applies it.
  const blocked = !working.dirty && !value.canApply;
  const reason =
    working.reason ||
    (blocked
      ? reasonText(ctx, value.errors) ||
        ctx.t(
          "Questa bozza non si può salvare ora: controlla l’anteprima accanto e correggi il testo.",
          "This draft cannot be saved now: check the preview beside it and fix the text.",
        )
      : "");
  const title =
    type === "session" ? ctx.t(...sessionLabels[draft.kind]) : ctx.t(...entryLabels[draft.kind]);
  return (
    backButton(ctx) +
    heading(
      ctx,
      title,
      ctx.t(
        "Bozza privata prima di ogni salvataggio condiviso",
        "A private draft before any shared save",
      ),
    ) +
    `<p data-campaign-status role="status" class="campaign-status">${statusText(ctx)}</p>${working.error ? `<p class="error" role="alert">${ctx.esc(working.error)}</p>` : ""}<div class="campaign-editor-layout${type !== "session" && draft.kind === "note" ? " is-note" : ""}"><form class="campaign-form campaign-editor" data-campaign-form>${type === "session" ? sessionEditor(ctx, draft) : contentEditor(ctx, draft)}<div class="campaign-savebar"><button type="button" class="button primary" data-campaign-apply ${blocked ? "disabled" : ""} ${reason ? 'aria-describedby="campaign-apply-reason"' : ""}>${applyLabel(ctx, type, draft)}</button><button type="submit" class="button quiet" data-campaign-save>${ctx.t("Salva bozza e aggiorna anteprima", "Save draft and update preview")}</button><button type="button" class="button quiet" data-campaign-discard>${ctx.t("Scarta bozza", "Discard draft")}</button></div>${reason ? `<p class="campaign-apply-reason${working.reason ? " error" : ""}" id="campaign-apply-reason" ${working.reason ? 'role="alert"' : ""} tabindex="-1" data-campaign-apply-reason>${ctx.esc(reason)}</p>` : ""}</form>${previewPanel(ctx, type, draft, value, title)}</div>`
  );
}
function statusText(ctx) {
  if (working.dirty)
    return ctx.t(
      "Modifiche in corso · la bozza privata si salva da sola",
      "Editing · the private draft saves itself",
    );
  if (ctx.storageError)
    return ctx.t(
      "Conservata in questa scheda; memoria del browser non disponibile",
      "Kept in this tab; browser storage unavailable",
    );
  if (working.autosavedAt)
    return ctx.t(
      `Bozza privata salvata alle ${new Date(working.autosavedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · «Salva» la rende una voce`,
      `Private draft saved at ${new Date(working.autosavedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · “Save” makes it an entry`,
    );
  return ctx.t("Bozza privata salvata su questo dispositivo", "Private draft saved on this device");
}
function applyLabel(ctx, type, draft) {
  if (type === "session")
    return draft.kind === "poll"
      ? ctx.t("Apri raccolta disponibilità", "Open availability poll")
      : draft.kind === "cancel"
        ? ctx.t("Conferma annullamento", "Confirm cancellation")
        : ctx.t("Conferma", "Confirm");
  return ctx.t("Salva contenuto per questi destinatari", "Save content for this audience");
}
// Who will read it and how it will look; for a personal note it folds away (one save,
// SV-05). Errors show only after a save was tried, never for text not saved yet.
function previewPanel(ctx, type, draft, value, title) {
  const errors = working.tried && !working.dirty ? issues(ctx, value.errors) : "";
  const body = `${working.dirty ? `<p class="campaign-notice">${ctx.t("L’anteprima si aggiorna quando la bozza si salva.", "The preview updates when the draft saves.")}</p>` : ""}${errors}${value.conflicts?.length && value.current ? `<details open><summary>${ctx.t("Confronta con il testo corrente", "Compare with current text")}</summary>${type === "session" ? sessionPreview(ctx, value.current) : prose(ctx, value.current.data || value.current)}<button type="button" class="button" data-campaign-rebase>${ctx.t("Ho confrontato: usa questa base e conserva la mia bozza", "Compared: use this base and keep my draft")}</button></details>` : ""}${type === "session" ? `${value.current ? `<h3>${ctx.t("Prima della modifica", "Before the change")}</h3>${sessionPreview(ctx, value.current)}` : ""}${sessionPreview(ctx, value.proposed)}` : `${audience(ctx, value.audience)}${recipientPreview(ctx, value, title)}`}`;
  if (type !== "session" && draft.kind === "note" && working.access?.mode === "private")
    return `<aside class="campaign-preview"><details data-campaign-details="preview" ${working.openDetails.preview ? "open" : ""}><summary><h2 tabindex="-1" data-campaign-preview-heading>${ctx.t("Anteprima", "Preview")}</h2></summary>${body}</details></aside>`;
  return `<aside class="campaign-preview"><h2 tabindex="-1" data-campaign-preview-heading>${ctx.t("Anteprima", "Preview")}</h2>${body}</aside>`;
}
function sessionList(ctx) {
  const hub = content.getCampaignHub(ctx.state, ctx.state.campaign?.id, ctx.role),
    rows = appointments.listCampaignSessions(ctx.state, ctx.state.campaign?.id, ctx.role),
    polls = appointments.listSessionPolls(ctx.state, ctx.state.campaign?.id, ctx.role);
  // Area blocks inside Sessions (B51), like the ".entry"/".editor" blocks of entries:
  // ".sessions" contributions render once under the toolbar with {kind: "sessions", rows},
  // ".session" contributions inside each session with its projected row.
  const areaBlocks = (suffix, arg) =>
    ctx.registry
      ?.list("campaign-section", ctx, arg)
      .filter((c) => c.id.endsWith(suffix))
      .map((c) => ctx.registry.slot("campaign-section", c, ctx, arg))
      .join("") ?? "";
  return (
    heading(
      ctx,
      ctx.t("Sessioni", "Sessions"),
      ctx.t("Date reali e disponibilità del gruppo", "Real appointments and group availability"),
    ) +
    `<div class="campaign-toolbar">${hub.canOrganize ? `<button type="button" class="button primary" data-campaign-new-session="direct">${ctx.t("Data già concordata", "Agreed appointment")}</button><button type="button" class="button" data-campaign-new-session="poll">${ctx.t("Raccogli disponibilità", "Collect availability")}</button>` : ""}<button type="button" class="button quiet" data-campaign-new-session="played">${ctx.t("Registra partita giocata", "Record played session")}</button></div>${drafts(ctx, "session")}${areaBlocks(".sessions", { kind: "sessions", rows })}<section><h2>${ctx.t("Appuntamenti e partite", "Appointments and sessions")}</h2>${rows.length ? rows.map((row) => `<article class="campaign-session"><h3>${ctx.esc(row.title || ctx.t("Sessione", "Session"))}</h3>${row.startsAt ? appointmentTimes(ctx, row) : `<p>${ctx.t("Nessuna data indicata", "No specified date")}</p>`}<p class="campaign-meta">${row.status === "cancelled" ? ctx.t("Appuntamento annullato", "Appointment cancelled") : row.played ? ctx.t("Partita registrata come giocata", "Recorded as played") : ctx.t("Data concordata", "Agreed date")}</p>${areaBlocks(".session", row)}<div class="campaign-toolbar"><button type="button" class="button" data-campaign-session-recap="${ctx.esc(row.id)}">${ctx.t("Scrivi resoconto", "Write recap")}</button>${row.permissions.canManage && row.status === "scheduled" ? `<button type="button" class="button quiet" data-campaign-change-session="${ctx.esc(row.id)}">${ctx.t("Cambia data", "Change date")}</button><button type="button" class="button quiet" data-campaign-cancel-session="${ctx.esc(row.id)}">${ctx.t("Annulla appuntamento", "Cancel appointment")}</button>` : ""}</div></article>`).join("") : `<p class="campaign-empty">${ctx.t("Nessuna sessione registrata. Non serve una data per entrare al Tavolo.", "No recorded sessions. A date is not required to enter the table.")}</p>`}</section>${
      polls.length
        ? `<section><h2>${ctx.t("Disponibilità", "Availability")}</h2>${polls.map((poll) => pollHTML(ctx, poll)).join("")}</section>`
        : ""
    }`
  );
}
// Availability overlap (Rallly totals with the best date highlighted; when2meet heatmap):
// one row per person, one column per proposed date, totals and the best date first seen.
const MARKS = { yes: "✓", maybe: "~", no: "✗", none: "–" };
function pollGrid(ctx, poll, summary) {
  const names = new Map(members(ctx).map((member) => [member.id, memberName(ctx, member)]));
  const answer = (person, slot) => {
    const recorded = poll.responses?.[person]?.[slot.id];
    return recorded?.slotRevision === slot.revision ? recorded.response : null;
  };
  const short = (slot) => {
    try {
      return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(slot.startsAt));
    } catch {
      return slot.startsAt;
    }
  };
  const byId = new Map(summary.slots.map((row) => [row.id, row]));
  return `<div class="table-wrap campaign-poll-grid-wrap"><table class="campaign-poll-grid"><caption>${ctx.t("Chi può, data per data", "Who can make it, date by date")}</caption><thead><tr><th scope="col">${ctx.t("Partecipante", "Participant")}</th>${poll.slots.map((slot) => `<th scope="col" class="${byId.get(slot.id)?.best ? "is-best" : ""}"><time datetime="${ctx.esc(slot.startsAt)}">${ctx.esc(short(slot))}</time>${byId.get(slot.id)?.best ? `<span class="badge campaign-best">${ctx.t("Migliore", "Best")}</span>` : ""}</th>`).join("")}</tr></thead><tbody>${summary.participants
    .map(
      (person) =>
        `<tr><th scope="row">${ctx.esc(names.get(person) ?? person)}</th>${poll.slots
          .map((slot) => {
            const value = answer(person, slot) ?? "none";
            return `<td class="poll-cell is-${value}${byId.get(slot.id)?.best ? " is-best" : ""}"><span aria-hidden="true">${MARKS[value]}</span><span class="jp-sr">${ctx.esc(answerLabel(ctx, value === "none" ? null : value))}</span></td>`;
          })
          .join("")}</tr>`,
    )
    .join(
      "",
    )}</tbody><tfoot><tr><th scope="row">${ctx.t("Totale", "Total")}</th>${summary.slots.map((row) => `<td class="${row.best ? "is-best" : ""}"><strong>${row.yes}</strong> ✓${row.maybe ? ` · ${row.maybe} ~` : ""}</td>`).join("")}</tr></tfoot></table></div><p class="campaign-meta">${ctx.t("✓ Disponibile · ~ Se necessario · ✗ Non disponibile · – nessuna risposta. La migliore ha più «Disponibile»; a parità conta «Se necessario».", "✓ Available · ~ If need be · ✗ Unavailable · – no answer. The best has most “Available”; “If need be” breaks a tie.")}</p>`;
}
function pollHTML(ctx, poll) {
  const summary = appointments.pollSummary(poll);
  const byId = new Map(summary.slots.map((row) => [row.id, row]));
  return `<article class="campaign-session"><h3>${ctx.esc(poll.title || ctx.t("Disponibilità del gruppo", "Group availability"))}</h3><p>${poll.status === "confirmed" ? ctx.t("Appuntamento confermato. Le risposte rimangono nello storico.", "Appointment confirmed. Responses remain in history.") : ctx.t("Le risposte aiutano a scegliere; non confermano automaticamente una data.", "Responses help choose; they do not automatically confirm a date.")}</p>${poll.slots.length && summary.participants.length ? pollGrid(ctx, poll, summary) : ""}${poll.slots
    .map((slot) => {
      const response =
        poll.responses?.[ctx.role]?.[slot.id]?.slotRevision === slot.revision
          ? poll.responses[ctx.role][slot.id].response
          : null;
      const row = byId.get(slot.id);
      return `<div class="campaign-poll-slot${row?.best ? " is-best" : ""}"><div>${row?.best ? `<p class="campaign-best-line"><span class="badge campaign-best">${ctx.t("Data migliore", "Best date")}</span></p>` : ""}${appointmentTimes(ctx, slot, { proposal: true })}<p class="campaign-meta" data-campaign-poll-totals>${ctx.esc(
        ctx.t(
          `${row?.yes ?? 0} disponibili · ${row?.maybe ?? 0} se necessario · ${row?.no ?? 0} non disponibili · ${row?.none ?? 0} senza risposta`,
          `${row?.yes ?? 0} available · ${row?.maybe ?? 0} if need be · ${row?.no ?? 0} unavailable · ${row?.none ?? 0} no answer`,
        ),
      )}</p></div>${
        poll.permissions.canRespond && poll.status === "open"
          ? `<label class="field">${ctx.t("La tua risposta", "Your response")}<select data-campaign-response="${ctx.esc(poll.id)}" data-slot-id="${ctx.esc(slot.id)}" data-slot-revision="${slot.revision}">${[
              ["", answerLabel(ctx, null)],
              ["yes", answerLabel(ctx, "yes")],
              ["maybe", answerLabel(ctx, "maybe")],
              ["no", answerLabel(ctx, "no")],
            ]
              .map(
                ([value, text]) =>
                  `<option value="${value}" ${(response || "") === value ? "selected" : ""}>${text}</option>`,
              )
              .join(
                "",
              )}</select></label>${response ? `<button type="button" class="button quiet" data-campaign-withdraw="${ctx.esc(poll.id)}" data-slot-id="${ctx.esc(slot.id)}" data-slot-revision="${slot.revision}">${ctx.t("Ritira risposta", "Withdraw response")}</button>` : ""}`
          : ""
      }${poll.permissions.canConfirm && poll.status === "open" ? `<button type="button" class="button${row?.best ? " primary" : ""}" data-campaign-confirm-slot="${ctx.esc(poll.id)}" data-slot-id="${ctx.esc(slot.id)}">${ctx.t("Rivedi conferma", "Review confirmation")}</button>` : ""}</div>`;
    })
    .join("")}</article>`;
}
function answerLabel(ctx, value) {
  return ctx.t(
    ...({
      yes: ["Disponibile", "Available"],
      maybe: ["Se necessario", "If need be"],
      no: ["Non disponibile", "Unavailable"],
    }[value] || ["Nessuna risposta", "No response"]),
  );
}
function unavailable(ctx) {
  const destination =
    ctx.view.page === "notes" || !members(ctx).length
      ? { page: "notes" }
      : { page: "campaign", tab: "journal" };
  return (
    heading(ctx, ctx.t("Contenuto non disponibile", "Content unavailable")) +
    `<p>${ctx.t("La voce non è disponibile per questa identità. Torna alla raccolta per consultare i contenuti consentiti.", "This identity cannot access the entry. Return to the collection to browse available content.")}</p>${routeButton(ctx, ctx.t("Torna alla raccolta", "Return to collection"), destination)}`
  );
}

export function renderCampaign(ctx) {
  try {
    if (ctx.view.page === "campaign" && ctx.view.tab !== "edit" && !members(ctx).length)
      return `<section class="campaign-page">${unavailable(ctx)}</section>`;
    let body;
    // An area section (or an area replacing a core section) renders in its slot (B11).
    const sectionId =
      ctx.view.page === "campaign" && !["edit", "entry"].includes(ctx.view.tab)
        ? ctx.view.tab || "overview"
        : null;
    const section = sectionId ? ctx.registry?.get("campaign-section", sectionId, ctx) : null;
    // An area section this identity cannot see says so, like an area page does; a hidden
    // replacement of a core section leaves the core section in place.
    const hidden = !section && sectionId && ctx.registry?.get("campaign-section", sectionId);
    const locked = Boolean(hidden) && !hidden.replaces;
    if (section) body = ctx.registry.slot("campaign-section", section, ctx);
    else if (locked)
      body =
        heading(
          ctx,
          ctx.t("Sezione non disponibile per questo ruolo", "Section not available for this role"),
        ) +
        routeButton(ctx, ctx.t("Torna alla panoramica", "Back to Overview"), {
          page: "campaign",
          tab: "overview",
        });
    else if (ctx.view.tab === "edit") body = editor(ctx);
    else if (ctx.view.tab === "entry" && ctx.view.id) body = detail(ctx);
    else if (ctx.view.page === "notes" || ["journal", "world"].includes(ctx.view.tab))
      body = collection(ctx);
    else if (ctx.view.tab === "sessions") body = sessionList(ctx);
    else if (ctx.view.tab === "group")
      body =
        heading(ctx, ctx.t("Gruppo", "Group"), ctx.label(ctx.state.campaign?.name)) + group(ctx);
    else if (ctx.view.tab === "settings")
      body =
        heading(ctx, ctx.t("Impostazioni della campagna", "Campaign settings")) +
        `<p class="campaign-empty">${ctx.t("Amministrazione, inviti e trasferimento della campagna sono ancora da collegare. I permessi delle singole voci si gestiscono dal loro dettaglio.", "Campaign administration, invitations and transfer remain to be connected. Manage individual entry permissions from their detail view.")}</p>`;
    else body = overview(ctx);
    return `<section class="campaign-page">${body}</section>`;
  } catch (error) {
    if (globalThis.process?.env?.P9_DEBUG) globalThis.console?.error?.(error);
    if (working?.owner !== ctx.role) working = null;
    return `<section class="campaign-page">${unavailable(ctx)}</section>`;
  }
}
export function getCampaignSection(ctx) {
  if (ctx.view.page === "notes") return "notes";
  try {
    if (ctx.view.tab === "entry")
      return entryTab(content.getCampaignEntry(ctx.state, ctx.view.id, ctx.role).kind);
    if (ctx.view.tab === "edit") {
      const { type, draft } = draftFor(ctx);
      return type === "session" ? "sessions" : entryTab(draft.kind);
    }
  } catch {
    return "overview";
  }
  return ctx.view.tab || "overview";
}
export function hasCampaignDraft() {
  return Boolean(working?.dirty);
}
export function resetCampaignView() {
  working = null;
  focusRoute = null;
}
export function startCampaignEntry(ctx, options = {}) {
  return attempt(ctx, () => {
    const id = uid(),
      kind = options.kind || "note",
      target = returnTarget(options.returnTo) || currentReturn(ctx) || returnTarget(ctx.view);
    mutate(
      ctx,
      ctx.t("Bozza privata iniziata", "Private draft started"),
      (state) => {
        const draft = content.createCampaignDraft(
          state,
          {
            ...options,
            id,
            kind,
            campaignId:
              options.campaignId === undefined ? state.campaign?.id || null : options.campaignId,
            returnTo: target,
          },
          ctx.role,
        );
        // P9: a typed World entry (CA-19) or a template's fields and sections (CA-17).
        const prefill = options.prefill ?? {};
        if (options.worldType || options.prefill)
          content.saveCampaignDraft(
            state,
            id,
            {
              data: {
                ...draft.data,
                ...(options.worldType ? { worldType: options.worldType } : {}),
                ...(prefill.worldType ? { worldType: prefill.worldType } : {}),
                ...(prefill.title ? { title: prefill.title } : {}),
                ...(prefill.body ? { body: prefill.body } : {}),
                sections: (prefill.sections ?? []).map((section, index) => ({
                  id: `${id}-s${index + 1}`,
                  title: section.title ?? "",
                  body: section.body ?? "",
                  access: section.secret
                    ? isDmViewer(ctx)
                      ? { mode: "dms", grants: [] }
                      : { mode: "private", grants: [] }
                    : { mode: "campaign", grants: [] },
                })),
              },
              expectedDraftRevision: draft.revision,
            },
            ctx.role,
          );
        return draft;
      },
      privateCommit,
    );
    working = null;
    ctx.navigate(entryPage(kind), { tab: "edit", id, ...withReturn(ctx, target) });
    return id;
  });
}
// CA-10 (D&D Beyond's editing lock, Google Docs and Notion draft resume): «Modifica» on an
// entry that already has a private draft of this person offers «Riprendi la bozza» (the
// draft where it was) or «Nuova bozza» from the current text; the old draft stays under
// «Bozze private». The two-tab conflict path is unchanged: a resumed draft still checks its
// base revision when it saves (compare and resume).
export function pendingEntryDraft(state, entryId, viewer) {
  return (
    content
      .listCampaignDrafts(state, viewer)
      .filter((draft) => draft.entryId === entryId)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] ?? null
  );
}
export function editCampaignEntry(ctx, entry, { fresh = false } = {}) {
  const returnTo = { page: entryPage(entry.kind), tab: "entry", id: entry.id };
  const start = () => startCampaignEntry(ctx, { kind: entry.kind, entryId: entry.id, returnTo });
  const pending = fresh ? null : pendingEntryDraft(ctx.state, entry.id, ctx.role);
  if (!pending) return start();
  const changed = pending.baseRevisionId && pending.baseRevisionId !== entry.currentRevisionId;
  ctx.dialog(
    ctx.t("Hai già una bozza di questa voce", "You already have a draft of this entry"),
    `<p>${ctx.esc(ctx.t(`Bozza privata salvata il ${dateText(ctx, pending.updatedAt)}, non ancora applicata.`, `Private draft saved on ${dateText(ctx, pending.updatedAt)}, not applied yet.`))}</p>${changed ? `<p class="campaign-notice">${ctx.t("La voce è cambiata dopo la bozza: riprendendola potrai confrontare i due testi prima di salvare.", "The entry changed after the draft: resuming it lets you compare both texts before saving.")}</p>` : ""}<p class="campaign-meta">${ctx.t("«Nuova bozza» parte dal testo attuale; quella vecchia resta in «Bozze private».", "“New draft” starts from the current text; the old one stays in “Private drafts”.")}</p><button type="button" class="button" data-campaign-new-draft>${ctx.t("Nuova bozza", "New draft")}</button>`,
    {
      submitLabel: ctx.t("Riprendi la bozza", "Resume the draft"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: () =>
        attempt(ctx, () => {
          working = null;
          ctx.navigate(entryPage(pending.kind), {
            tab: "edit",
            id: pending.id,
            ...withReturn(ctx, returnTarget(pending.returnTo) || returnTo),
          });
        }),
    },
  );
  globalThis.document?.querySelector("[data-campaign-new-draft]")?.addEventListener("click", () => {
    ctx.closeDialog();
    start();
  });
  return pending.id;
}
function startSession(ctx, options) {
  return attempt(ctx, () => {
    const id = uid(),
      target = { page: "campaign", tab: "sessions" };
    mutate(
      ctx,
      ctx.t("Bozza di sessione iniziata", "Session draft started"),
      (state) =>
        appointments.createSessionDraft(state, { ...options, id, returnTo: target }, ctx.role),
      privateCommit,
    );
    working = null;
    ctx.navigate("campaign", { tab: "edit", id, ...withReturn(ctx, target) });
  });
}
function persist(ctx) {
  if (!working || working.owner !== ctx.role) return false;
  const snapshot = clone(working);
  working.dirty = false;
  working.error = "";
  try {
    mutate(
      ctx,
      ctx.t("Bozza privata salvata", "Private draft saved"),
      (state) =>
        draftApi(snapshot.type).save(
          state,
          snapshot.id,
          {
            data: snapshot.data,
            ...(snapshot.type === "content"
              ? {
                  ...(snapshot.access
                    ? { access: snapshot.access, campaignId: snapshot.campaignId }
                    : {}),
                  ...(snapshot.rebaseRevisionId
                    ? { baseRevisionId: snapshot.rebaseRevisionId }
                    : {}),
                }
              : snapshot.rebaseRevision !== undefined
                ? { baseRevision: snapshot.rebaseRevision }
                : {}),
            expectedDraftRevision: snapshot.revision,
          },
          ctx.role,
        ),
      privateCommit,
    );
    return true;
  } catch (error) {
    working = snapshot;
    throw error;
  }
}
export function confirmCampaignNavigation(ctx, callback) {
  if (!working?.dirty) return callback();
  ctx.dialog(
    ctx.t("Conservare la bozza?", "Keep the draft?"),
    `<p>${ctx.t("Salvare conserva una bozza privata. Non pubblica il testo e non conferma appuntamenti.", "Saving keeps a private draft. It does not publish text or confirm appointments.")}</p><button type="button" class="button quiet" data-campaign-discard-unsaved>${ctx.t("Scarta modifiche non salvate", "Discard unsaved changes")}</button>`,
    {
      submitLabel: ctx.t("Salva bozza e continua", "Save draft and continue"),
      cancelLabel: ctx.t("Resta", "Stay"),
      onSubmit: () =>
        attempt(ctx, () => {
          persist(ctx);
          callback();
        }),
    },
  );
  globalThis.document
    ?.querySelector("[data-campaign-discard-unsaved]")
    ?.addEventListener("click", () => {
      working = null;
      ctx.closeDialog();
      callback();
    });
}

// B44 hook (additive): the Overview's core blocks one at a time, so the party area can
// replace the Overview with a role dashboard (Kanka CMP-21/22) that keeps the same core
// content, markup and B20 hidden-section rule. bindCampaign binds their buttons as usual.
export function campaignOverviewBlocks(ctx) {
  const hub = content.getCampaignHub(ctx.state, ctx.state.campaign?.id, ctx.role);
  const recap = hub.latestRecap,
    next = hub.upcomingSession;
  const hidden =
    ctx.state.ext?.["campaign-settings"]?.campaigns?.[ctx.state.campaign?.id]?.policy
      ?.hiddenSections ?? [];
  const on = (id, html) => (hidden.includes(id) ? "" : html);
  return {
    hidden: [...hidden],
    // The party dashboard names the campaign in its own header (Kanka): no subtitle there.
    heading: (commands = "", { subtitle = true } = {}) =>
      heading(
        ctx,
        ctx.t("Panoramica", "Overview"),
        subtitle ? ctx.label(hub.campaign?.name) : "",
        commands,
      ),
    enterTable: routeButton(
      ctx,
      ctx.t("Entra al Tavolo", "Enter table"),
      { page: "table" },
      "primary",
    ),
    recap: on(
      "journal",
      `<section><h2>${ctx.t("Dove eravamo rimasti", "Previously")}</h2>${recap ? `<h3>${ctx.esc(entryTitle(ctx, recap))}</h3><p class="campaign-prose">${ctx.esc((recap.data.body || "").slice(0, 280))}</p>${openEntryButton(ctx, recap, ctx.t("Leggi il resoconto", "Read recap"))}` : `<p>${ctx.t("Non ci sono ancora resoconti accessibili. Puoi entrare al Tavolo anche senza scriverne uno.", "There are no accessible recaps yet. You can enter the table without writing one.")}</p>${routeButton(ctx, ctx.t("Apri Diario", "Open Journal"), { page: "campaign", tab: "journal" })}`}</section>`,
    ),
    next: on(
      "sessions",
      `<section class="campaign-next"><h2>${ctx.t("Il prossimo appuntamento", "Next appointment")}</h2>${next ? `<h3>${ctx.esc(next.title || ctx.t("Sessione", "Session"))}</h3>${appointmentTimes(ctx, next)}` : `<p>${ctx.t("Nessuna data concordata.", "No agreed date.")}</p>`}${routeButton(ctx, ctx.t("Apri Sessioni", "Open Sessions"), { page: "campaign", tab: "sessions" })}</section>`,
    ),
    group: on(
      "group",
      `<section><h2>${ctx.t("Personaggi del gruppo", "Party characters")}</h2>${group(ctx)}</section>`,
    ),
    revealed: revealedScenes(ctx),
    world: on(
      "world",
      routeButton(ctx, ctx.t("Esplora il mondo", "Explore the world"), {
        page: "campaign",
        tab: "world",
      }),
    ),
    notes: routeButton(ctx, ctx.t("I tuoi appunti", "Your notes"), { page: "notes" }),
  };
}
export function bindCampaign(root, ctx) {
  ctx.registry?.bindSlots(root, ctx, { points: ["campaign-section"] });
  bindTextEmbeds(root, ctx);
  jp.bindContentFilter(root, ctx);
  root.querySelectorAll("[data-campaign-route]").forEach((button) => {
    button.onclick = () => go(ctx, JSON.parse(button.dataset.campaignRoute));
  });
  // P10 CA-49 (shared edit): the invite button of the heading (campaign-members.mjs).
  root
    .querySelectorAll("[data-campaign-invite]")
    .forEach((b) => (b.onclick = () => openInvite(ctx)));
  root.querySelectorAll("[data-campaign-return]").forEach((button) => {
    button.onclick = () =>
      go(
        ctx,
        currentReturn(ctx) || {
          page: ctx.view.page === "notes" ? "notes" : "campaign",
          tab: ctx.view.page === "notes" ? "" : "journal",
        },
      );
  });
  root.querySelectorAll("[data-campaign-new]").forEach((button) => {
    button.onclick = () =>
      startCampaignEntry(ctx, {
        kind: button.dataset.campaignNew,
        ...(button.dataset.worldType ? { worldType: button.dataset.worldType } : {}),
      });
  });
  root.querySelectorAll("[data-campaign-new-type]").forEach((button) => {
    button.onclick = () =>
      startCampaignEntry(ctx, { kind: "world", worldType: button.dataset.campaignNewType });
  });
  root.querySelectorAll("[data-campaign-new-template]").forEach((button) => {
    button.onclick = () => chooseTemplate(ctx, button.dataset.campaignNewTemplate);
  });
  if (ctx.view.tab !== "entry" && ctx.view.tab !== "edit") {
    root.querySelectorAll("[data-campaign-delete]").forEach((button) => {
      button.onclick = () =>
        confirmDeleteEntry(ctx, button.dataset.campaignDelete, { after: () => ctx.render() });
    });
    bindRowMenu(root, ctx);
    if (ctx.view.page === "campaign" && ["journal", "world"].includes(ctx.view.tab)) {
      jp.bindCommon(root, ctx);
      jp.bindJournalTabs(root, ctx);
      jp.bindViews(
        root,
        ctx,
        {
          setStatus: (context) =>
            context.toast(
              context.t(
                "Cambia lo stato della missione dalla sua pagina nelle Missioni.",
                "Change the quest’s status from its page under Quests.",
              ),
              true,
            ),
        },
        { stay: ctx.view.tab },
      );
    }
  }
  root.querySelectorAll("[data-campaign-open]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () => {
        const entry = content.getCampaignEntry(ctx.state, button.dataset.campaignOpen, ctx.role);
        ctx.navigate(entryPage(entry.kind), {
          tab: "entry",
          id: entry.id,
          ...withReturn(ctx, currentReturn(ctx) || returnTarget(ctx.view)),
        });
      });
  });
  root.querySelectorAll("[data-campaign-resume]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () => {
        const type = button.dataset.draftType,
          draft = draftApi(type).get(ctx.state, button.dataset.campaignResume, ctx.role);
        working = null;
        ctx.navigate(type === "session" ? "campaign" : entryPage(draft.kind), {
          tab: "edit",
          id: draft.id,
          ...withReturn(ctx, draft.returnTo),
        });
      });
  });
  const search = root.querySelector("[data-campaign-search]");
  if (search)
    search.onsubmit = (event) => {
      event.preventDefault();
      // Close review 01/10 (D&D Beyond and Kanka: an empty search says what it needs).
      const typed = root.querySelector("[data-campaign-query]").value.trim();
      const kind = root.querySelector("[data-campaign-filter]")?.value || "";
      const current = searches.get(searchKey(ctx));
      if (!typed && !kind && !current?.query && !current?.type) {
        const hint = search.querySelector("[data-campaign-search-hint]");
        if (hint)
          hint.textContent = ctx.t(
            "Scrivi una parola da cercare o scegli un tipo.",
            "Type a word to search for or choose a type.",
          );
        root.querySelector("[data-campaign-query]")?.focus();
        return;
      }
      searches.set(searchKey(ctx), {
        query: root.querySelector("[data-campaign-query]").value.trim(),
        type: root.querySelector("[data-campaign-filter]")?.value || "",
      });
      ctx.render();
    };
  root.querySelector("[data-campaign-clear]")?.addEventListener("click", () => {
    searches.delete(searchKey(ctx));
    ctx.render();
  });
  for (const [selector, kind] of [
    ["[data-campaign-new-session]", null],
    ["[data-campaign-change-session]", "change"],
    ["[data-campaign-cancel-session]", "cancel"],
  ])
    root.querySelectorAll(selector).forEach((button) => {
      button.onclick = () =>
        startSession(ctx, {
          kind: kind || button.dataset.campaignNewSession,
          sessionId: button.dataset.campaignChangeSession || button.dataset.campaignCancelSession,
        });
    });
  root.querySelectorAll("[data-campaign-session-recap]").forEach((button) => {
    button.onclick = () => {
      let prefill;
      try {
        const auto = appointments.autoRecap(
          ctx.state,
          { sessionId: button.dataset.campaignSessionRecap },
          ctx.role,
          ctx.lang,
        );
        prefill = { title: auto.title, body: auto.body };
      } catch {
        prefill = undefined;
      }
      startCampaignEntry(ctx, {
        kind: "recap",
        sessionId: button.dataset.campaignSessionRecap,
        returnTo: { page: "campaign", tab: "sessions" },
        ...(prefill ? { prefill } : {}),
      });
    };
  });
  root.querySelectorAll("[data-campaign-confirm-slot]").forEach((button) => {
    button.onclick = () =>
      startSession(ctx, {
        kind: "confirm",
        pollId: button.dataset.campaignConfirmSlot,
        slotId: button.dataset.slotId,
      });
  });
  root.querySelectorAll("[data-campaign-response]").forEach((input) => {
    input.addEventListener("change", () =>
      attempt(ctx, () =>
        mutate(ctx, ctx.t("Disponibilità aggiornata", "Availability updated"), (state) =>
          appointments.setSessionAvailability(
            state,
            input.dataset.campaignResponse,
            {
              slotId: input.dataset.slotId,
              slotRevision: Number(input.dataset.slotRevision),
              response: input.value || null,
            },
            ctx.role,
            online(ctx),
          ),
        ),
      ),
    );
  });
  root.querySelectorAll("[data-campaign-withdraw]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () =>
        mutate(ctx, ctx.t("Disponibilità ritirata", "Availability withdrawn"), (state) =>
          appointments.setSessionAvailability(
            state,
            button.dataset.campaignWithdraw,
            {
              slotId: button.dataset.slotId,
              slotRevision: Number(button.dataset.slotRevision),
              response: null,
            },
            ctx.role,
            online(ctx),
          ),
        ),
      );
  });
  if (ctx.view.tab === "entry") bindDetail(root, ctx);
  if (ctx.view.tab === "edit") bindEditor(root, ctx);
  const key = JSON.stringify([
    ctx.role,
    ctx.view.page,
    ctx.view.id,
    ctx.view.tab,
    ctx.view.revision,
  ]);
  if (focusRoute !== key) {
    focusRoute = key;
    const title = root.querySelector("[data-campaign-heading]");
    title?.focus({ preventScroll: true });
    // «nearest»: a title already in view stays put, so the app header stays visible (F4).
    title?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
}
/** Start a Journal/World entry from a saved template or a built-in kit (CA-17). */
function chooseTemplate(ctx, kind) {
  const choices = jp.templateChoices(ctx, kind);
  ctx.dialog(
    ctx.t("Nuova voce da un modello", "New entry from a template"),
    `<label class="field">${ctx.t("Modello o kit", "Template or kit")}<select name="template">${choices.map((choice) => `<option value="${ctx.esc(choice.id)}">${ctx.esc(choice.label)}</option>`).join("")}</select></label><p class="campaign-meta">${ctx.t("I campi diventano righe «Nome: valore» da completare; quelli riservati al DM finiscono in una sezione segreta. Crei i tuoi modelli con «Salva come modello» da una voce.", "Fields become “Name: value” lines to fill in; DM-only ones go into a secret section. Make your own templates with “Save as template” on an entry.")}</p>`,
    {
      submitLabel: ctx.t("Usa il modello", "Use the template"),
      onSubmit: (data) => {
        const choice = choices.find((row) => row.id === String(data.get("template")));
        const prefill = jp.templateForEntry(ctx, choice);
        startCampaignEntry(ctx, { kind: kind === "world" ? "world" : "recap", prefill });
      },
    },
  );
}
// Right-click (or long press) on an entry of a list: Apri, Apri in una nuova scheda,
// Modifica, Elimina (the context menu Kanka and DDB notes offer; SV-05).
function bindRowMenu(root, ctx) {
  const doc = globalThis.document;
  root.querySelectorAll("[data-campaign-row]").forEach((row) => {
    row.addEventListener?.("contextmenu", (event) => {
      let entry;
      try {
        entry = content.getCampaignEntry(ctx.state, row.dataset.campaignRow, ctx.role);
      } catch {
        return;
      }
      if (!doc?.createElement) return;
      event.preventDefault();
      doc.querySelector(".campaign-context-menu")?.remove();
      const menu = doc.createElement("div");
      menu.className = "campaign-context-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", entryTitle(ctx, entry));
      const items = [
        ["open", ctx.t("Apri", "Open")],
        ...(entry.kind !== "note"
          ? [["tab", ctx.t("Apri in una nuova scheda", "Open in a new tab")]]
          : []),
        ...(entry.permissions.canEdit ? [["edit", ctx.t("Modifica", "Edit")]] : []),
        ["history", ctx.t("Cronologia", "History")],
        ...(copyable(ctx, entry)
          ? [["copy", ctx.t("Copia in un’altra campagna…", "Copy to another campaign…")]]
          : []),
        ...(entry.ownerId === ctx.role ? [["delete", ctx.t("Elimina…", "Delete…")]] : []),
      ];
      menu.innerHTML = items
        .map(
          ([id, label]) =>
            `<button type="button" role="menuitem" class="button quiet${id === "delete" ? " danger" : ""}" data-menu="${id}">${ctx.esc(label)}</button>`,
        )
        .join("");
      doc.body.append(menu);
      const x = Math.min(
        event.clientX ?? 0,
        (doc.documentElement.clientWidth || 400) - menu.offsetWidth - 8,
      );
      const y = Math.min(
        event.clientY ?? 0,
        (doc.documentElement.clientHeight || 600) - menu.offsetHeight - 8,
      );
      menu.style.left = `${Math.max(8, x)}px`;
      menu.style.top = `${Math.max(8, y)}px`;
      const close = () => {
        menu.remove();
        doc.removeEventListener("pointerdown", outside, true);
        doc.removeEventListener("keydown", keys, true);
      };
      const outside = (e) => !menu.contains(e.target) && close();
      const keys = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          row.querySelector("button")?.focus();
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const buttons = [...menu.querySelectorAll("button")];
          const at = buttons.indexOf(doc.activeElement);
          buttons[
            (at + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length
          ]?.focus();
        }
      };
      doc.addEventListener("pointerdown", outside, true);
      doc.addEventListener("keydown", keys, true);
      menu.addEventListener("click", (e) => {
        const id = e.target.closest?.("[data-menu]")?.dataset.menu;
        if (!id) return;
        close();
        if (id === "open")
          ctx.navigate(entryPage(entry.kind), {
            tab: "entry",
            id: entry.id,
            ...withReturn(ctx, currentReturn(ctx) || returnTarget(ctx.view)),
          });
        if (id === "tab") {
          jp.visitEntry(ctx, entry.id, { newTab: true });
          ctx.navigate("campaign", { tab: "entry", id: entry.id });
        }
        if (id === "edit") editCampaignEntry(ctx, entry);
        if (id === "copy") copyToCampaign(ctx, `entry:${entry.id}`);
        if (id === "history") attempt(ctx, () => openEntryHistory(ctx, entry.id));
        if (id === "delete") confirmDeleteEntry(ctx, entry.id, { after: () => ctx.render() });
      });
      menu.querySelector("button")?.focus();
    });
  });
}
function rememberDetails(root) {
  if (!working) return;
  root.querySelectorAll("[data-campaign-details]").forEach((details) => {
    working.openDetails[details.dataset.campaignDetails] = details.open;
  });
}
function repaintEditor(root, ctx, focusPath) {
  rememberDetails(root);
  if (focusPath) working.pendingFocus = focusPath;
  ctx.render();
}
function bindEditor(root, ctx) {
  if (!working || working.owner !== ctx.role || working.id !== ctx.view.id) return;
  let draft;
  try {
    draft = draftApi(working.type).get(ctx.state, working.id, ctx.role);
  } catch {
    return;
  }
  if (draft.status !== "active") return;
  root.querySelectorAll("[data-campaign-details]").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (working?.id === draft.id)
        working.openDetails[details.dataset.campaignDetails] = details.open;
    });
  });
  if (working.pendingFocus) {
    const field = root.querySelector(`[data-campaign-path="${working.pendingFocus}"]`);
    const selection = working.pendingSelection;
    const scroll = working.pendingScroll;
    delete working.pendingFocus;
    delete working.pendingSelection;
    delete working.pendingScroll;
    field?.focus({ preventScroll: true });
    if (selection && Number.isInteger(selection.start))
      field?.setSelectionRange?.(selection.start, selection.end ?? selection.start);
    if (typeof scroll === "number") globalThis.scrollTo?.({ top: scroll, behavior: "instant" });
    else field?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  root.querySelector("[data-campaign-preview-person]")?.addEventListener("change", (event) => {
    working.previewRecipient = event.target.value;
    repaintEditor(root, ctx);
  });
  root.querySelector("[data-campaign-context]")?.addEventListener("change", (event) => {
    working.campaignId = event.target.value || null;
    if (!working.campaignId) {
      working.access = { mode: "private", grants: [] };
      working.data.sections.forEach((section) => {
        section.access = { mode: "private", grants: [] };
      });
    }
    dirty(root, ctx);
    repaintEditor(root, ctx);
  });
  root.querySelectorAll("[data-campaign-path]").forEach((input) => {
    input.addEventListener(
      input.tagName === "SELECT" || input.type === "checkbox" ? "change" : "input",
      () => {
        const path = input.dataset.campaignPath;
        setPath(
          working,
          path,
          input.type === "checkbox"
            ? input.checked
            : ["data.sessionId", "data.narratorActorId"].includes(path)
              ? input.value || null
              : input.value,
        );
        if (path.endsWith("localTime") || path.endsWith("timeZone"))
          setPath(working, path.replace(/(localTime|timeZone)$/, "selectedInstant"), null);
        dirty(root, ctx);
      },
    );
  });
  root.querySelectorAll("[data-campaign-access-mode]").forEach((input) => {
    input.addEventListener("change", () => {
      const access = getPath(working, input.dataset.campaignAccessMode);
      access.mode = input.value;
      access.grants = [];
      dirty(root, ctx);
      repaintEditor(root, ctx);
    });
  });
  root.querySelectorAll("[data-campaign-grant]").forEach((input) => {
    input.addEventListener("change", () => {
      const access = getPath(working, input.dataset.accessPath),
        id = input.dataset.campaignGrant;
      access.grants = (access.grants || []).filter((grant) => grant.id !== id);
      if (input.value !== "none")
        access.grants.push({
          id,
          read: true,
          edit: input.dataset.accessPath === "access" && input.value === "edit",
          invite: false,
        });
      dirty(root, ctx);
      repaintEditor(root, ctx);
    });
  });
  root.querySelectorAll("[data-campaign-grant-invite]").forEach((input) => {
    input.addEventListener("change", () => {
      const grant = getPath(working, input.dataset.accessPath).grants.find(
        (grant) => grant.id === input.dataset.campaignGrantInvite,
      );
      if (grant?.edit) grant.invite = input.checked;
      dirty(root, ctx);
    });
  });
  const form = root.querySelector("[data-campaign-form]");
  const save = (event) => {
    event?.preventDefault();
    rememberDetails(root);
    return attempt(ctx, () => persist(ctx));
  };
  if (form) form.onsubmit = save;
  root.querySelector("[data-campaign-save]")?.addEventListener("click", save);
  root.querySelector("[data-campaign-add-section]")?.addEventListener("click", () => {
    (working.data.sections ??= []).push({
      id: uid(),
      title: "",
      body: "",
      access: { mode: "private", grants: [] },
    });
    dirty(root, ctx);
    repaintEditor(root, ctx, `data.sections.${working.data.sections.length - 1}.title`);
  });
  root.querySelectorAll("[data-campaign-remove-section]").forEach((button) => {
    button.onclick = () => {
      working.data.sections.splice(Number(button.dataset.campaignRemoveSection), 1);
      dirty(root, ctx);
      repaintEditor(root, ctx);
    };
  });
  root.querySelector("[data-campaign-add-link]")?.addEventListener("click", () => {
    const id = root.querySelector("[data-campaign-link-choice]").value;
    if (id && !(working.data.links || []).some((link) => link.kind === "entry" && link.id === id)) {
      (working.data.links ??= []).push({ kind: "entry", id });
      dirty(root, ctx);
      repaintEditor(root, ctx);
    }
  });
  root.querySelectorAll("[data-campaign-remove-link]").forEach((button) => {
    button.onclick = () => {
      const target = JSON.parse(button.dataset.campaignRemoveLink);
      working.data.links = working.data.links.filter(
        (link) => JSON.stringify(link) !== JSON.stringify(target),
      );
      dirty(root, ctx);
      repaintEditor(root, ctx);
    };
  });
  root.querySelectorAll("[data-campaign-participant]").forEach((input) => {
    input.addEventListener("change", () => {
      working.data.participants = (working.data.participants || []).filter(
        (id) => id !== input.dataset.campaignParticipant,
      );
      if (input.checked) working.data.participants.push(input.dataset.campaignParticipant);
      dirty(root, ctx);
    });
  });
  root.querySelector("[data-campaign-add-slot]")?.addEventListener("click", () => {
    (working.data.slots ??= []).push({
      id: uid(),
      localTime: "",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      selectedInstant: null,
    });
    dirty(root, ctx);
    repaintEditor(root, ctx);
  });
  root.querySelectorAll("[data-campaign-remove-slot]").forEach((button) => {
    button.onclick = () => {
      working.data.slots.splice(Number(button.dataset.campaignRemoveSlot), 1);
      dirty(root, ctx);
      repaintEditor(root, ctx);
    };
  });
  root.querySelector("[data-campaign-rebase]")?.addEventListener("click", () =>
    attempt(ctx, () => {
      const value = draftApi(working.type).preview(ctx.state, working.id, ctx.role);
      if (working.type === "session") working.rebaseRevision = value.current.revision;
      else working.rebaseRevisionId = value.current.currentRevisionId || value.current.revisionId;
      dirty(root, ctx);
      persist(ctx);
    }),
  );
  root.querySelector("[data-campaign-discard]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Scartare la bozza?", "Discard draft?"),
      `<p>${ctx.t("I contenuti salvati, gli accessi e la partita restano invariati.", "Saved content, access and gameplay stay unchanged.")}</p>`,
      {
        submitLabel: ctx.t("Scarta bozza", "Discard draft"),
        onSubmit: () =>
          attempt(ctx, () => {
            mutate(
              ctx,
              ctx.t("Bozza scartata", "Draft discarded"),
              (state) => draftApi(working.type).discard(state, draft.id, ctx.role),
              privateCommit,
            );
            working = null;
            go(
              ctx,
              draft.returnTo || {
                page: ctx.view.page === "notes" ? "notes" : "campaign",
                tab: "journal",
              },
            );
          }),
      },
    ),
  );
  root.querySelector("[data-campaign-apply]")?.addEventListener("click", () =>
    attempt(ctx, () => {
      rememberDetails(root);
      return saveAndApply(ctx, draft);
    }),
  );
  // Writing tools (P9): @ / [[ suggestions, a selection moved to a new entry, a secret
  // block, a kit or template's fields.
  jp.bindLinkSuggest(root, ctx);
  root.querySelectorAll("[data-campaign-cut]").forEach((button) => {
    button.onclick = () => {
      const path = button.dataset.campaignCut;
      const field = root.querySelector(`[data-campaign-path="${path}"]`);
      jp.cutSelectionToEntry(ctx, field, {
        parentId: draft.entryId ?? null,
        onLink: (link, start, end) => {
          if (!working || working.id !== draft.id) return;
          const text = String(getPath(working, path) ?? "");
          setPath(working, path, text.slice(0, start) + link + text.slice(end));
          working.dirty = true;
          working.reviewKey = null;
          working.pendingFocus = path;
          working.pendingSelection = { start: start + link.length, end: start + link.length };
          scheduleAutosave(ctx);
          ctx.render();
        },
      });
    };
  });
  // P8 CA-26 (dnd5e enrichers, Quest Portal roll buttons): a check, save, damage, reward or
  // table roll button inserted at the cursor as an @Embed marker.
  root.querySelectorAll("[data-campaign-insert-roll]").forEach((button) => {
    button.onclick = () => {
      const field = root.querySelector(
        `[data-campaign-path="${button.dataset.campaignInsertRoll}"]`,
      );
      if (field) openEmbedPicker(ctx, (marker) => insertEmbed(field, marker));
    };
  });
  root.querySelectorAll("[data-campaign-insert-link]").forEach((button) => {
    button.onclick = () => {
      const field = root.querySelector(
        `[data-campaign-path="${button.dataset.campaignInsertLink}"]`,
      );
      if (!field) return;
      field.focus?.();
      ctx.registry?.run?.(ctx.registry.get("command", "command-palette.open", ctx), ctx);
    };
  });
  // CA-21: Quest Portal Session Stories — the recap starts from what the evening recorded.
  root.querySelector("[data-campaign-autodraft]")?.addEventListener("click", () =>
    attempt(ctx, () => {
      const auto = appointments.autoRecap(
        ctx.state,
        { sessionId: working.data.sessionId },
        ctx.role,
        ctx.lang,
      );
      if (!working.data.title) working.data.title = auto.title;
      working.data.body = working.data.body?.trim()
        ? `${working.data.body.trim()}\n\n${auto.body}`
        : auto.body;
      if (!working.data.sessionId && auto.sessionId) working.data.sessionId = auto.sessionId;
      rememberDetails(root);
      dirty(root, ctx);
      working.pendingFocus = "data.body";
      ctx.render();
      ctx.toast(
        ctx.t(
          "Bozza preparata: correggila e completa «Cosa è successo».",
          "Draft prepared: correct it and complete “What happened”.",
        ),
      );
    }),
  );
  root.querySelector("[data-campaign-add-secret]")?.addEventListener("click", () => {
    (working.data.sections ??= []).push({
      id: uid(),
      title: ctx.t("Segreto", "Secret"),
      body: "",
      access: isDmViewer(ctx) ? { mode: "dms", grants: [] } : { mode: "private", grants: [] },
    });
    rememberDetails(root);
    working.openDetails.sections = true;
    dirty(root, ctx);
    working.pendingFocus = `data.sections.${working.data.sections.length - 1}.body`;
    ctx.render();
  });
  root.querySelector("[data-campaign-apply-template]")?.addEventListener("click", () => {
    const select = root.querySelector("[data-campaign-template-choice]");
    const choice = jp
      .templateChoices(ctx, draft.kind === "world" ? "world" : draft.kind)
      .find((row) => row.id === select?.value);
    const fill = jp.templateForEntry(ctx, choice);
    if (!fill) return;
    // Only the fields the text does not have yet ("Oste: " is added once).
    const have = new Set(
      jp.textProperties(working.data.body).map((row) => row.label.toLowerCase()),
    );
    const lines = fill.body
      .split("\n")
      .filter(
        (line) => !/^([^:]+):/.test(line) || !have.has(line.split(":")[0].trim().toLowerCase()),
      );
    working.data.body = [lines.join("\n").trim(), working.data.body].filter(Boolean).join("\n\n");
    if (draft.kind === "world" && fill.worldType && working.data.worldType === "other")
      working.data.worldType = fill.worldType;
    for (const section of fill.sections)
      (working.data.sections ??= []).push({
        id: uid(),
        title: section.title,
        body: section.body,
        access: section.secret
          ? isDmViewer(ctx)
            ? { mode: "dms", grants: [] }
            : { mode: "private", grants: [] }
          : { mode: working.access?.mode === "private" ? "private" : "campaign", grants: [] },
      });
    dirty(root, ctx);
    repaintEditor(root, ctx, "data.body");
  });
}
// A one-click change to a saved entry stays on this device while the entry was never shared.
const entryCommit = (ctx, id) => ({
  local: content.isLocalEntry(ctx.state, id),
  visibility: "private",
  undoable: false,
});
/** «Cronologia»: every version with its changes, read or restore (Kanka «View changes»). */
export function openEntryHistory(ctx, entryId) {
  const entry = content.getCampaignEntry(ctx.state, entryId, ctx.role);
  ctx.dialog(
    `${ctx.t("Cronologia", "History")} · ${entryTitle(ctx, entry)}`,
    entryHistoryHTML(ctx, entry),
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const box = globalThis.document?.querySelector?.("#dialog [data-campaign-history-list]");
  box?.querySelectorAll("[data-campaign-history]").forEach((button) => {
    button.onclick = () => {
      ctx.closeDialog();
      ctx.navigate(entryPage(entry.kind), {
        tab: "entry",
        id: entry.id,
        revision: button.dataset.campaignHistory,
        ...withReturn(ctx),
      });
    };
  });
  box?.querySelectorAll("[data-campaign-restore-now]").forEach((button) => {
    button.onclick = () => {
      ctx.closeDialog();
      confirmRestore(ctx, entry, button.dataset.campaignRestoreNow);
    };
  });
}
function confirmRestore(ctx, entry, revisionId) {
  ctx.dialog(
    ctx.t("Ripristinare questa versione?", "Restore this version?"),
    `<p>${ctx.t("Il testo torna a questa versione e diventa la versione corrente, segnata «Ripristinata da…». La versione di adesso resta nella cronologia; permessi e partita non cambiano.", "The text goes back to this version and becomes the current one, marked “Restored from…”. Today’s version stays in the history; permissions and gameplay do not change.")}</p>`,
    {
      submitLabel: ctx.t("Ripristina", "Restore"),
      onSubmit: () =>
        attempt(ctx, () => {
          mutate(
            ctx,
            ctx.t("Versione ripristinata", "Version restored"),
            (state) =>
              content.restoreCampaignVersion(state, entry.id, revisionId, ctx.role, online(ctx)),
            entryCommit(ctx, entry.id),
          );
          ctx.navigate(entryPage(entry.kind), { tab: "entry", id: entry.id, ...withReturn(ctx) });
          ctx.toast(
            ctx.t(
              "Versione ripristinata. La precedente resta nella cronologia.",
              "Version restored. The previous one stays in the history.",
            ),
          );
        }),
    },
  );
}
/** «Elimina» on the page, in the list and in the right-click menu (Kanka, DDB notes; SV-05). */
export function confirmDeleteEntry(ctx, entryId, { after } = {}) {
  let entry;
  try {
    entry = content.getCampaignEntry(ctx.state, entryId, ctx.role);
  } catch {
    return;
  }
  const kids = childEntries(ctx, entry).length;
  ctx.dialog(
    ctx.t("Eliminare la voce?", "Delete the entry?"),
    `<p>${ctx.t(`«${ctx.esc(entryTitle(ctx, entry))}» e la sua cronologia vengono eliminate per tutti quelli che la leggono. Non si può annullare.`, `“${ctx.esc(entryTitle(ctx, entry))}” and its history are deleted for everyone who reads it. This cannot be undone.`)}</p>${kids ? `<p class="campaign-meta">${ctx.t(`Le ${kids} voci annidate restano, al livello principale.`, `The ${kids} nested entries stay, at the top level.`)}</p>` : ""}`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit: () =>
        attempt(ctx, () => {
          mutate(
            ctx,
            ctx.t("Voce eliminata", "Entry deleted"),
            (state) => content.deleteCampaignEntry(state, entry.id, ctx.role, online(ctx)),
            entryCommit(ctx, entry.id),
          );
          working = null;
          ctx.toast(
            ctx.t(`«${entryTitle(ctx, entry)}» eliminata.`, `“${entryTitle(ctx, entry)}” deleted.`),
          );
          if (after) after();
          else
            go(ctx, {
              page: entry.kind === "note" ? "notes" : "campaign",
              ...(entry.kind === "note" ? {} : { tab: entryTab(entry.kind) }),
            });
        }),
    },
  );
}
function openRevealSection(ctx, entry, sectionId) {
  const section = entry.data.sections.find((row) => row.id === sectionId);
  if (!section) return;
  const people = members(ctx, entry.campaignId).filter((member) => member.id !== ctx.role);
  const readers = new Set(
    people
      .filter(
        (member) =>
          entry.access?.mode === "campaign" ||
          entry.access?.grants?.some((grant) => grant.id === member.id) ||
          (entry.access?.mode === "dms" && ["dm", "co-dm"].includes(member.role)),
      )
      .map((member) => member.id),
  );
  ctx.dialog(
    ctx.t("Rivela il blocco segreto", "Reveal the secret block"),
    `<p class="campaign-prose">${ctx.esc(section.title || "")}</p><fieldset class="jp-recipients"><legend>${ctx.t("A chi mostrarlo", "Show it to")}</legend><label class="campaign-check"><input type="radio" name="mode" value="campaign" checked>${ctx.t("Tutto il gruppo della campagna", "The whole campaign group")}</label><label class="campaign-check"><input type="radio" name="mode" value="selected">${ctx.t("Persone scelte", "Chosen people")}</label>${people.map((member) => `<label class="campaign-check"><input type="checkbox" name="member" value="${ctx.esc(member.id)}">${ctx.esc(ctx.label(member.name))}${readers.has(member.id) ? "" : ` <span class="campaign-meta">(${ctx.t("non legge ancora la voce", "does not read the entry yet")})</span>`}</label>`).join("")}</fieldset><p class="campaign-meta">${ctx.t("Chi lo riceve lo legge nella voce da adesso; le versioni precedenti restano private. Puoi nasconderlo di nuovo.", "Recipients read it in the entry from now on; earlier versions stay private. You can hide it again.")}</p>`,
    {
      submitLabel: ctx.t("Rivela", "Reveal"),
      onSubmit: (data) =>
        attempt(ctx, () => {
          const mode = data.get("mode") === "selected" ? "selected" : "campaign";
          const chosen = data.getAll("member").map(String);
          if (mode === "selected" && !chosen.length) {
            ctx.toast(
              ctx.t(
                "Scegli almeno una persona, o «Tutto il gruppo».",
                "Choose at least one person, or “The whole group”.",
              ),
              true,
            );
            return false;
          }
          const access =
            mode === "campaign"
              ? { mode: "campaign", grants: [] }
              : {
                  mode: "selected",
                  grants: chosen.map((id) => ({ id, read: true, edit: false, invite: false })),
                };
          mutate(
            ctx,
            ctx.t("Blocco segreto rivelato", "Secret block revealed"),
            (state) =>
              content.setCampaignSectionAccess(
                state,
                entry.id,
                sectionId,
                access,
                ctx.role,
                online(ctx),
              ),
            { visibility: "private" },
          );
          ctx.toast(
            ctx.t(
              "Rivelato: ora lo leggono nella voce.",
              "Revealed: they now read it in the entry.",
            ),
          );
        }),
    },
  );
}
function bindDetail(root, ctx) {
  let entry;
  try {
    entry = content.getCampaignEntry(ctx.state, ctx.view.id, ctx.role, {
      revisionId: ctx.view.revision || undefined,
    });
  } catch {
    return;
  }
  jp.bindCommon(root, ctx);
  jp.bindJournalTabs(root, ctx);
  root.querySelectorAll("[data-campaign-timeline]").forEach((button) => {
    button.onclick = () => attempt(ctx, () => openEntryHistory(ctx, entry.id));
  });
  root.querySelectorAll("[data-campaign-delete]").forEach((button) => {
    button.onclick = () => confirmDeleteEntry(ctx, entry.id);
  });
  root.querySelectorAll("[data-campaign-template]").forEach((button) => {
    button.onclick = () => jp.openSaveTemplate(ctx, { entryId: entry.id });
  });
  root.querySelectorAll("[data-campaign-reveal]").forEach((button) => {
    button.onclick = () => openRevealSection(ctx, entry, button.dataset.campaignReveal);
  });
  root.querySelectorAll("[data-campaign-hide]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () =>
        mutate(
          ctx,
          ctx.t("Blocco nascosto di nuovo", "Block hidden again"),
          (state) =>
            content.setCampaignSectionAccess(
              state,
              entry.id,
              button.dataset.campaignHide,
              isDmViewer(ctx) ? { mode: "dms", grants: [] } : { mode: "private", grants: [] },
              ctx.role,
              online(ctx),
            ),
          { visibility: "private" },
        ),
      );
  });
  root.querySelectorAll("[data-campaign-task]").forEach((input) => {
    input.addEventListener("change", () =>
      attempt(ctx, () =>
        mutate(
          ctx,
          ctx.t("Elenco aggiornato", "Checklist updated"),
          (state) =>
            content.editCampaignText(
              state,
              entry.id,
              {
                sectionId: input.dataset.taskSection || null,
                index: Number(input.dataset.campaignTask),
                from: input.dataset.taskMark,
                to: input.dataset.taskMark === " " ? "x" : " ",
                change: "task",
              },
              ctx.role,
              online(ctx),
            ),
          entryCommit(ctx, entry.id),
        ),
      ),
    );
  });
  root
    .querySelector("[data-campaign-edit]")
    ?.addEventListener("click", () => editCampaignEntry(ctx, entry));
  root.querySelector("[data-campaign-copy-to]")?.addEventListener("click", (event) => {
    event?.target?.closest?.("details")?.removeAttribute("open");
    copyToCampaign(ctx, `entry:${entry.id}`);
  });
  root
    .querySelector("[data-campaign-restore]")
    ?.addEventListener("click", () =>
      content.getCampaignEntry(ctx.state, entry.id, ctx.role).permissions.canRestore &&
      ctx.view.revision
        ? confirmRestore(ctx, entry, entry.revisionId)
        : undefined,
    );
  root.querySelectorAll("[data-campaign-history]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate(entryPage(entry.kind), {
        tab: "entry",
        id: entry.id,
        revision: button.dataset.campaignHistory,
        ...withReturn(ctx),
      });
  });
  root.querySelector("[data-campaign-invite]")?.addEventListener("click", () => {
    ctx.dialog(
      ctx.t("Invita un lettore", "Invite a reader"),
      `<p>${ctx.t("Il destinatario potrà leggere questa voce. Non riceve modifica o ulteriori inviti.", "The recipient can read this entry. Editing and onward invitations are not granted.")}</p><label class="field">${ctx.t("Persona", "Person")}<select name="member">${members(
        ctx,
        entry.campaignId,
      )
        .filter((member) => member.id !== ctx.role)
        .map(
          (member) =>
            `<option value="${ctx.esc(member.id)}">${ctx.esc(ctx.label(member.name))}</option>`,
        )
        .join("")}</select></label>`,
      {
        submitLabel: ctx.t("Concedi lettura", "Grant read access"),
        onSubmit: (data) =>
          attempt(ctx, () =>
            mutate(
              ctx,
              ctx.t("Accesso aggiornato", "Access updated"),
              (state) =>
                content.inviteCampaignReader(
                  state,
                  entry.id,
                  { memberId: data.get("member"), expectedAccessRevision: entry.accessRevision },
                  ctx.role,
                  online(ctx),
                ),
              { visibility: "private" },
            ),
          ),
      },
    );
  });
  root.querySelector("[data-campaign-access]")?.addEventListener("click", () => {
    const current = content.getCampaignEntry(ctx.state, entry.id, ctx.role),
      access = current.access;
    ctx.dialog(
      ctx.t("Gestisci condivisione", "Manage sharing"),
      `<label class="field">${ctx.t("Chi legge", "Who can read")}<select name="mode">${Object.entries(
        modeLabels,
      )
        .filter(([mode]) => mode === "private" || current.campaignId)
        .map(
          ([mode, labels]) =>
            `<option value="${mode}" ${access.mode === mode ? "selected" : ""}>${ctx.t(...labels)}</option>`,
        )
        .join(
          "",
        )}</select></label><p>${ctx.t("I contributi salvati restano dopo una revoca. I permessi individuali si aggiungono all’accesso del gruppo scelto.", "Saved contributions remain after revocation. Individual grants add to the selected group access.")}</p>${members(
        ctx,
        current.campaignId,
      )
        .filter((member) => member.id !== current.ownerId)
        .map((member) => {
          const grant = access.grants.find((value) => value.id === member.id);
          return `<fieldset><legend>${ctx.esc(ctx.label(member.name))}</legend><label class="field">${ctx.t("Permesso aggiuntivo", "Additional permission")}<select name="grant-${ctx.esc(member.id)}"><option value="none" ${!grant?.read && !grant?.edit ? "selected" : ""}>${ctx.t("Nessuno", "None")}</option><option value="read" ${grant?.read && !grant?.edit ? "selected" : ""}>${ctx.t("Legge", "Read")}</option><option value="edit" ${grant?.edit ? "selected" : ""}>${ctx.t("Modifica", "Edit")}</option></select></label><label class="campaign-check"><input type="checkbox" name="invite-${ctx.esc(member.id)}" ${grant?.invite ? "checked" : ""}>${ctx.t("Può invitare lettori (richiede modifica)", "May invite readers (requires editing)")}</label></fieldset>`;
        })
        .join("")}`,
      {
        submitLabel: ctx.t("Salva accessi", "Save access"),
        onSubmit: (data) =>
          attempt(ctx, () => {
            const mode = data.get("mode"),
              grants = members(ctx, current.campaignId)
                .filter((member) => member.id !== current.ownerId)
                .flatMap((member) => {
                  const permission = data.get(`grant-${member.id}`);
                  return ["read", "edit"].includes(permission) && mode !== "private"
                    ? [
                        {
                          id: member.id,
                          read: true,
                          edit: permission === "edit",
                          invite: permission === "edit" && data.has(`invite-${member.id}`),
                        },
                      ]
                    : [];
                });
            return mutate(
              ctx,
              ctx.t("Accesso aggiornato", "Access updated"),
              (state) =>
                content.setCampaignEntryAccess(
                  state,
                  current.id,
                  { access: { mode, grants }, expectedAccessRevision: current.accessRevision },
                  ctx.role,
                  online(ctx),
                ),
              { visibility: "private" },
            );
          }),
      },
    );
  });
}
