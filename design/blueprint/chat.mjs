// Chat, messages and archive (B17): the area entry module.
//
// It replaces the Table's core log panel with a docked chat log (Foundry chat sidebar,
// D&D Beyond game log that can stay open beside the map), adds the campaign sections
// "Discussioni" (Roll20 forum) and "Archivio chat" (Roll20 chat archive), unread
// notifications with a badge on the Registro button (Owlbear Rumble!, DDB-153), map chat
// bubbles (Foundry), search results and palette commands. Rules and privacy live in
// chat-domain.mjs; this file only renders permitted projections and commits.

import * as chat from "./chat-domain.mjs";
import { renderSceneBase } from "./preparation.mjs";
import { canViewActor, isActorAvailable } from "./character-access.mjs";
import { isCampaignMember } from "./campaign-content.mjs";
import { SUMMARY_POLICY } from "./srd-sample.mjs";
import { avatarHTML, publishedAvatar } from "./account-avatar.mjs";
import { filterChatMarkup } from "./safety-ui.mjs";

const ID = chat.CHAT_ID;
const L = (it, en) => ({ it, en });
let area = null;

// Optional neighbours, loaded without making the chat depend on them: the handouts domain
// (revealed materials become cards in the log, Shard VTL-158) and the notification centre
// (its read state also clears the Registro badge). Each stays null if its area is absent.
let handouts = null;
let centre = null;
// W2b1 integration: the dice tray's domain (B34), whose rolls get their chat card back.
let tray = null;
// TV-92: the DM's roll requests (B34), whose log line becomes the request card.
let asks = null;
// CA-71: knowledge (B46), whose failed passive checks a player may read in the log.
let lore = null;
export const neighboursReady = Promise.all([
  import("./handouts-domain.mjs").then(
    (module) => (handouts = module),
    () => null,
  ),
  import("./notifications.mjs").then(
    (module) => (centre = module),
    () => null,
  ),
  import("./dice-tray-domain.mjs").then(
    (module) => (tray = module),
    () => null,
  ),
  import("./roll-requests.mjs").then(
    (module) => (asks = module),
    () => null,
  ),
  import("./knowledge-domain.mjs").then(
    (module) => (lore = module),
    () => null,
  ),
]);

// ---------------------------------------------------------------- per-viewer UI memory

// Composer drafts belong to one identity each and never cross a role switch.
const drafts = {};
const replyDrafts = {};
const ui = {
  filter: "all",
  window: 80,
  stick: true,
  scrollTop: 0,
  open: false,
  rendered: false,
  focus: null,
  focusLogButton: false,
  showHelp: false,
  archive: { query: "", kind: "all", hideWhispers: false },
  // The route view whose "open the log" request was already applied (once per navigation).
  routeView: null,
};
// Table route tab that opens the log (notifications and notices from outside the Table),
// like the random-tables and loot drawers open from their route tab.
export const LOG_ROUTE_TAB = "chat-log";
// The latest bound chat surface (Table panel, archive, forum): focus returns there after a
// dialog closes, since the commit replaced the control that opened it.
let focusRoot = null;
function focusLater(key) {
  setTimeout(() => {
    if (!focusRoot?.isConnected) return;
    focusRoot.querySelector(`[data-chat-focus="${cssEscape(key)}"]`)?.focus();
  }, 0);
}
// Read markers (Rumble keeps chat state per browser): when this identity last read the log,
// was last notified, and last read the forum. Device-local, never shared state.
const MARKERS_KEY = "d20-studio-chat-markers-v1";
let markerStorage = (() => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
})();
let markers = null;
/** Test seam: replaces the storage used for read markers (null keeps them in memory). */
export function setMarkerStorage(storage) {
  markerStorage = storage;
  markers = null;
}
function loadMarkers() {
  if (markers) return markers;
  let saved = {};
  try {
    saved = JSON.parse(markerStorage?.getItem(MARKERS_KEY) ?? "{}") ?? {};
  } catch {
    saved = {};
  }
  markers = {};
  for (const kind of ["read", "announced", "forum"])
    markers[kind] = saved && typeof saved[kind] === "object" && saved[kind] ? saved[kind] : {};
  return markers;
}
function saveMarkers() {
  try {
    markerStorage?.setItem(MARKERS_KEY, JSON.stringify(markers));
  } catch {
    // Storage off: markers stay in memory for this visit.
  }
}
// Every identity starts "caught up" at its first sight of the app, so the seeded history
// is not announced as new; later messages from others are.
function ensureMarkers(state, now = new Date().toISOString()) {
  const m = loadMarkers();
  let changed = false;
  for (const kind of ["read", "announced", "forum"])
    for (const id of chat.identities(state))
      if (typeof m[kind][id] !== "string") {
        m[kind][id] = now;
        changed = true;
      }
  if (changed) saveMarkers();
  return m;
}
export function markerOf(state, kind, role) {
  return ensureMarkers(state)[kind][role];
}
function advanceMarker(state, kind, role, at) {
  const m = ensureMarkers(state);
  if (m[kind][role] >= at) return false;
  m[kind][role] = at;
  saveMarkers();
  return true;
}
/**
 * One unread source for the Registro badge and the bell: log notices this identity marked
 * read in the notification centre (one by one or "mark all as read") move the chat's read
 * marker up to the newest read notice older than every notice still unread there.
 * Returns true when the marker moved.
 */
export function syncCentreReads(ctx) {
  if (!centre?.centreModel) return false;
  let items = [];
  try {
    items = centre.centreModel(ctx).items ?? [];
  } catch {
    return false;
  }
  const log = items.filter(
    (item) =>
      item.source === "chat-unread" &&
      typeof item.time === "string" &&
      !String(item.id).startsWith("chat-post-"),
  );
  const firstUnread = log
    .filter((item) => !item.read)
    .map((item) => item.time)
    .sort()[0];
  const upTo = log
    .filter((item) => item.read && (!firstUnread || item.time < firstUnread))
    .map((item) => item.time)
    .sort()
    .at(-1);
  return upTo ? advanceMarker(ctx.state, "read", ctx.role, upTo) : false;
}
function resetMarkers() {
  markers = { read: {}, announced: {}, forum: {} };
  saveMarkers();
}

// ---------------------------------------------------------------- helpers

const slice = (state) => area.slice(state);
const tag = (ctx) => (ctx.lang === "it" ? "it-IT" : "en-GB");
const clock = (ctx, at) =>
  new Date(at).toLocaleTimeString(tag(ctx), { hour: "2-digit", minute: "2-digit" });
const localDay = (at) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayTitle = (ctx, day) =>
  new Date(day + "T12:00:00").toLocaleDateString(tag(ctx), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const cssEscape = (value) =>
  globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
const errorText = (ctx, error) =>
  error?.it && error?.en
    ? ctx.label({ it: error.it, en: error.en })
    : String(error?.message ?? error);
const initial = (name) => escapeText([...String(name || "?")][0].toUpperCase());
// A person writing as themselves shows the avatar chosen in the account (B29, DDB-189);
// "" when that identity has no account data, so the initial stays.
const personAvatar = (ctx, id, name, className) => {
  const published = id ? publishedAvatar(ctx.state, id) : null;
  return published ? avatarHTML(published, name, { className, esc: ctx.esc }) : "";
};
function escapeText(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function draftFor(ctx) {
  const role = ctx.role;
  const speakers = chat.speakerOptions(ctx.state, role);
  const d = (drafts[role] ??= {
    mode: role === "dm" ? "desc" : "ic",
    speaker: "",
    to: "all",
    language: "common",
    npcName: "",
    range: "all",
    text: "",
    image: null,
    history: [],
    historyIndex: -1,
    error: "",
  });
  if (!speakers.some((s) => s.id === d.speaker))
    d.speaker = speakers.find((s) => s.type === "actor")?.id ?? (role === "dm" ? "npc" : "");
  if (!d.speaker && d.mode !== "ooc") d.mode = "ooc";
  if (d.mode === "desc" && role !== "dm") d.mode = "ic";
  const actorId = speakerActor(d);
  if (d.to !== "all" && !chat.whisperTargets(ctx.state, role, actorId).some((t) => t.id === d.to))
    d.to = "all";
  const known = actorId ? chat.knownLanguages(ctx.state, actorId) : null;
  if (d.language !== "common" && d.speaker !== "npc" && !known?.includes(d.language))
    d.language = "common";
  if (role !== "dm") d.range = "all";
  return d;
}
const speakerActor = (d) => (d.speaker?.startsWith("actor:") ? d.speaker.slice(6) : null);
// A player reads foreign languages through the character they play (Polyglot with a
// selected token); the DM reads everything.
const perspectiveOf = (ctx) => (ctx.role === "dm" ? null : speakerActor(draftFor(ctx)));
const projectOptions = (ctx) => ({ perspective: perspectiveOf(ctx), lang: ctx.lang });
// Materials the DM revealed, as this identity may read them (the handouts area decides).
function handoutItems(ctx) {
  if (!handouts?.projectMaterial) return [];
  const materials = ctx.state.ext?.[handouts.SLICE]?.materials ?? [];
  return materials.flatMap((material) => {
    let view = null;
    try {
      view = handouts.projectMaterial(ctx.state, material.id, ctx.role);
    } catch {
      view = null;
    }
    if (!view?.lastShown) return [];
    const text = [view.playerText, ...(view.sections ?? []).map((section) => section.playerText)]
      .map((value) => String(value ?? "").trim())
      .find(Boolean);
    const src = typeof view.image?.src === "string" ? view.image.src : "";
    return [
      {
        type: "handout",
        id: "handout:" + material.id,
        materialId: material.id,
        at: view.lastShown,
        title: String(view.title ?? ""),
        text: text ? (text.length > 140 ? text.slice(0, 139) + "…" : text) : "",
        image: /^data:image\//.test(src) ? src : null,
      },
    ];
  });
}
// W2b1 integration: a dice-tray roll (B34) writes one log line and keeps it as `logLabel`;
// that line shows as the roll's card to whoever may read the result (B34's own rule), as
// the Table's old free roll did (Roll20/Foundry chat cards). Others keep the line.
function trayRollFor(ctx) {
  const records = (tray && ctx.state.ext?.["dice-tray"]?.rolls) || [];
  if (!records.some((r) => typeof r.logLabel === "string")) return null;
  const used = new Set();
  return (entry, role) => {
    // The roll committed with this line: the latest one with this label recorded before it.
    let match = null;
    for (const r of records)
      if (r.logLabel === entry.label && !used.has(r.id) && String(r.at) <= entry.time) match = r;
    if (!match || !tray.canSeeResult(match, role, ctx.state)) return null;
    used.add(match.id);
    const roll = tray.rollEvent(match);
    return {
      ...roll,
      actorName: roll.actorName ?? (match.by === "dm" ? "DM" : ctx.t("Giocatore", "Player")),
      kind: roll.kind === "skill" ? "check" : roll.kind,
      actionName: match.title ?? null,
      status: { withdrawn: "reversed", reused: "reused" }[match.status] ?? "recorded",
    };
  };
}
// TV-92 (dnd5e request card with its roll button): the request line the DM wrote shows as
// the request, to whoever the request involves, with «Tira» on the rows they roll.
function requestFor(ctx) {
  if (!asks) return null;
  let groups;
  try {
    groups = asks
      .requestGroups(ctx.state, ctx.state.ext?.["dice-tray"] ?? null, ctx.role)
      .filter((g) => g.logLabel);
  } catch {
    return null;
  }
  if (!groups.length) return null;
  return (entry) => {
    const g = groups.find((group) => group.logLabel === entry.label);
    if (!g) return null;
    return {
      groupId: g.groupId,
      title: ctx.label(g.title),
      closed: g.closed,
      summary: { ...g.summary },
      contest: g.kind === "contest",
      rows: g.rows.map((r) => ({
        requestId: r.requestId,
        name: typeof r.name === "string" ? r.name : ctx.label(r.name),
        status: r.status,
        canRoll: r.canRoll && !g.closed,
        total: r.total,
        success: r.success,
        readable: r.readable,
      })),
    };
  };
}
/**
 * CA-71 (BG3 shows a failed passive roll in its log): «Livia non nota nulla (Percezione
 * passiva 12)» for the viewer's own characters, when the campaign shows failed passive
 * checks; never what was missed. Knowledge (B46) projects them; nothing without it.
 */
function passiveItems(ctx) {
  let lines = [];
  try {
    lines = lore?.failedPassives?.(ctx.state, ctx.role) ?? [];
  } catch {
    lines = [];
  }
  return lines.map((line) => ({
    type: "passive",
    id: "passive:" + line.id,
    at: line.at,
    actorId: line.actorId,
    label: ctx.label(line.text),
  }));
}
const streamOptions = (ctx) => ({
  ...projectOptions(ctx),
  extra: [...handoutItems(ctx), ...passiveItems(ctx)],
  rollFor: trayRollFor(ctx),
  requestFor: requestFor(ctx),
});
// W2b1 integration: the badge, the bell and the closed-log notices count a tray roll as a
// roll too (as the Table's old free roll), not as an event line.
const unreadOptions = (ctx) => ({ ...projectOptions(ctx), rollFor: trayRollFor(ctx) });

function rerender(ctx, focus = null) {
  ui.focus = focus;
  ctx.render();
}
function commitChat(ctx, label, mutate, { whisper = false } = {}) {
  return ctx.commit(chat.LABEL_PREFIX + label, (draft) => mutate(slice(draft), draft), {
    undoable: false,
    ...(whisper ? { visibility: "private" } : {}),
  });
}
// Posts a composed message; validation runs before the commit so a refusal changes nothing.
function post(ctx, input, label) {
  const now = new Date().toISOString();
  const preview = chat.composeMessage(ctx.state, ctx.role, input, { now });
  if (preview.help) return preview;
  // An attachment that does not fit is refused before the commit and again inside it, so
  // a message never pushes the saved state past what the browser keeps (lost on reload).
  chat.checkAttachmentRoom(ctx.state, slice(ctx.state), chat.attachmentSize(preview));
  commitChat(
    ctx,
    label,
    (s, draft) => {
      const message = chat.composeMessage(ctx.state, ctx.role, input, { now });
      chat.checkAttachmentRoom(draft, s, chat.attachmentSize(message));
      chat.postMessage(s, message);
    },
    { whisper: !!preview.readers },
  );
  return preview;
}
// Suggested tones (Fantasy Grounds /mood): any other word can be typed.
const MOODS = [
  ["preoccupata", "worried"],
  ["arrabbiato", "angry"],
  ["allegra", "cheerful"],
  ["sussurrando", "whispering"],
  ["ironico", "wry"],
  ["spaventata", "afraid"],
  ["triste", "sad"],
  ["solenne", "solemn"],
];
function inputOf(d, extra = {}) {
  return {
    ...(d.mood && ["ic", "emote"].includes(d.mode) ? { mood: d.mood } : {}),
    mode: d.mode,
    speaker: d.speaker,
    npcName: d.npcName,
    to: d.to,
    language: d.language,
    range: d.range,
    text: d.text,
    image: d.image,
    ...extra,
  };
}

// ---------------------------------------------------------------- stream rendering

function menuHTML(ctx, item) {
  if (!item.canHide && !item.canRemove) return "";
  const t = ctx.t;
  return `<details class="chat-menu"><summary aria-label="${t("Azioni del messaggio", "Message actions")}" title="${t("Azioni del messaggio", "Message actions")}" data-chat-focus="menu-${ctx.esc(item.id)}">⋯</summary><div class="chat-menu-list">${
    item.canHide
      ? `<button type="button" data-chat-hide="${ctx.esc(item.id)}" data-hidden="${item.hidden ? "0" : "1"}">${item.hidden ? t("Mostra ai giocatori", "Show to players") : t("Nascondi ai giocatori", "Hide from players")}</button>`
      : ""
  }${
    item.canRemove
      ? `<button type="button" class="chat-danger" data-chat-remove="${ctx.esc(item.id)}">${item.own && ctx.role !== "dm" ? t("Ritira il messaggio…", "Retract message…") : t("Elimina…", "Delete…")}</button>`
      : ""
  }</div></details>`;
}
function whisperLine(ctx, item) {
  const t = ctx.t;
  const parts = [];
  if (item.whisper)
    parts.push(
      `<div class="chat-line chat-whisper-line">${t("Sussurro a", "Whisper to")} <strong>${ctx.esc(item.toName)}</strong> · ${t("leggono", "readers")}: ${ctx.esc(item.readerNames.join("; "))}</div>`,
    );
  if (item.range)
    parts.push(
      `<div class="chat-line chat-range-line">${t("Udibile entro", "Audible within")} ${ctx.esc(String(item.range.meters).replace(".", ctx.lang === "it" ? "," : "."))} m · ${t("sentono", "heard by")}: ${ctx.esc(item.range.heard.join(", ") || t("nessun personaggio", "no character"))}</div>`,
    );
  if (item.hidden)
    parts.push(
      `<div class="chat-line chat-hidden-line">${ctx.role === "dm" ? t("Nascosto ai giocatori", "Hidden from players") : t("Il DM ha nascosto questo messaggio al gruppo.", "The DM hid this message from the group.")}</div>`,
    );
  return parts.join("");
}
function languageNote(ctx, item) {
  const t = ctx.t;
  if (item.scrambled)
    return `<div class="chat-note">${item.perspectiveName ? ctx.esc(item.perspectiveName) + " " + t("non conosce", "does not know") : t("Nessun tuo personaggio conosce", "None of your characters knows")} ${t("questa lingua", "this language")}: ${ctx.esc(item.languageName)}.</div>`;
  if (item.understoodBy)
    return `<div class="chat-note">${t("Capiscono", "Understood by")}: ${ctx.esc(item.understoodBy.join(", ") || t("nessun personaggio del gruppo", "no party character"))}</div>`;
  return "";
}
// Foundry shows the speaker from the chat (FVT-065): on the Table the name of a creature
// whose token this identity can see selects that token on the map.
function speakerOnMap(ctx, actorId) {
  if (ctx.view?.page !== "table" || !actorId) return false;
  const scene = ctx.state.scenes?.find((entry) => entry.id === ctx.state.activeSceneId);
  const token = scene?.tokens.find((entry) => entry.actorId === actorId);
  const actor = ctx.state.actors?.[actorId];
  if (!token || !actor || !isActorAvailable(actor) || !canViewActor(actor, ctx.role, ctx.state))
    return false;
  return ctx.canControl(actor) || (!actor.hidden && !token.hidden && token.visible !== false);
}
function speakerHTML(ctx, item) {
  if (!speakerOnMap(ctx, item.speakerActorId))
    return `<strong>${ctx.esc(item.speakerName)}</strong>`;
  return `<button type="button" class="chat-speaker" data-chat-show-token="${ctx.esc(item.speakerActorId)}" data-chat-focus="show-${ctx.esc(item.id)}" title="${ctx.t("Mostra sulla mappa", "Show on the map")}" aria-label="${ctx.esc(`${item.speakerName} · ${ctx.t("mostra sulla mappa", "show on the map")}`)}">${ctx.esc(item.speakerName)}</button>`;
}
function headHTML(ctx, item, label = "") {
  const t = ctx.t;
  return `<div class="chat-head">${(item.speakerType === "user" && personAvatar(ctx, item.author, item.speakerName, "chat-avatar chat-avatar-user")) || `<span class="chat-avatar chat-avatar-${ctx.esc(item.speakerKind === "npc" ? "npc" : item.speakerType)}" aria-hidden="true">${initial(item.speakerName)}</span>`}<span class="chat-who">${speakerHTML(ctx, item)}${item.mood ? ` <em>(${ctx.esc(item.mood)})</em>` : ""}${label ? ` <span class="chat-verb">${ctx.esc(label)}</span>` : ""}${item.languageName ? `<span class="chat-tag">${ctx.esc(item.languageName)}</span>` : ""}${item.kind === "ooc" ? `<span class="chat-tag">${t("fuori personaggio", "out of character")}</span>` : ""}${item.speakerType === "npc" || item.speakerKind === "npc" ? `<span class="chat-tag">${t("PNG", "NPC")}</span>` : ""}</span><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time>${menuHTML(ctx, item)}</div>`;
}
function imageHTML(ctx, item) {
  if (!item.image) return "";
  return `<button type="button" class="chat-image" data-chat-image="${ctx.esc(item.id)}" aria-label="${ctx.t("Ingrandisci l’immagine", "Enlarge image")} ${ctx.esc(item.image.name)}"><img src="${ctx.esc(item.image.src)}" alt="${ctx.esc(item.text || item.image.name || ctx.t("Immagine condivisa", "Shared image"))}"></button>`;
}
function cardHTML(ctx, item) {
  const lines = chat.cardLines(item.card, ctx.lang);
  return `<button type="button" class="chat-card chat-card-${ctx.esc(item.card.type)}" data-chat-card="${ctx.esc(item.id)}"><span class="chat-card-kind">${ctx.esc(lines.subtitle)}</span><strong>${ctx.esc(lines.title)}</strong><span class="chat-card-summary">${ctx.esc(lines.summary)}</span><span class="chat-card-open">${ctx.t("Apri il dettaglio", "Open details")}</span></button>`;
}
function voteHTML(ctx, item) {
  const t = ctx.t;
  const v = item.vote;
  const button = (choice, it, en, count) =>
    `<button type="button" class="button ${v.mine === choice ? "active" : ""}" data-chat-ballot="${ctx.esc(item.id)}" data-choice="${choice}" aria-pressed="${v.mine === choice}" data-chat-focus="ballot-${ctx.esc(item.id)}-${choice}" ${v.canVote ? "" : `disabled aria-describedby="chat-vote-why-${ctx.esc(item.id)}"`}>${t(it, en)} · ${count}</button>`;
  return `<div class="chat-vote"><div class="chat-vote-question">${ctx.esc(v.question)}</div><div class="chat-vote-actions" role="group" aria-label="${t("Il tuo voto", "Your vote")}">${button("yes", "Sì", "Yes", v.yes)}${button("no", "No", "No", v.no)}</div>${v.canVote ? "" : `<p class="chat-sr" id="chat-vote-why-${ctx.esc(item.id)}">${t("Il voto è chiuso: l’esito è qui sotto.", "The vote is closed: the outcome is below.")}</p>`}<div class="chat-line">${
    v.ballots.length
      ? t("Hanno votato", "Voted") +
        ": " +
        ctx.esc(
          v.ballots
            .map((b) => `${b.name} (${b.choice === "yes" ? t("sì", "yes") : "no"})`)
            .join(", "),
        )
      : t("Nessun voto ancora.", "No votes yet.")
  }</div>${
    v.closed
      ? `<div class="chat-vote-outcome" data-chat-outcome="${v.outcome}" tabindex="-1" data-chat-focus="outcome-${ctx.esc(item.id)}"><strong>${t("Esito", "Outcome")}:</strong> ${v.outcome === "yes" ? t("Sì", "Yes") : v.outcome === "no" ? "No" : t("Parità: decide il DM", "Tie: the DM decides")} (${v.yes}–${v.no})</div>`
      : v.canClose
        ? `<button type="button" class="button quiet" data-chat-close-vote="${ctx.esc(item.id)}">${t("Chiudi il voto e mostra l’esito", "Close the vote and show the outcome")}</button>`
        : ""
  }</div>`;
}
// The faces of a roll card: dropped dice struck through (Foundry chat log), a rider's die
// named (Bless), exploded dice marked (TV-87 / TV-97).
function facesHTML(ctx, roll) {
  const list = roll.faces?.length
    ? roll.faces
    : roll.values.map((value, i) => ({
        value,
        kept: roll.kept ? roll.kept[i] !== false : true,
        label: "",
      }));
  if (!list.length) return "";
  return `[${list
    .map((f) => {
      const text = `${f.value}${f.exploded ? "!" : ""}`;
      const label = f.label ? ` <small>(${ctx.esc(f.label)})</small>` : "";
      return f.kept
        ? `<span class="chat-die${f.rerolled ? " is-rerolled" : ""}">${ctx.esc(text)}</span>${label}`
        : `<s class="chat-die is-dropped" aria-label="${ctx.esc(ctx.t(`${f.value} scartato`, `${f.value} dropped`))}">${ctx.esc(text)}</s>${label}`;
    })
    .join(", ")}]`;
}
function sourcesText(roll) {
  return roll.sources
    .map((m) => `${m.value < 0 ? "−" : "+"}${Math.abs(m.value)} ${m.label}`)
    .join(" · ");
}
// The actions a card offers its roller (DDB game log card, BG3 roll detail): the dice tray's
// Correct, Reveal and Withdraw, run by the tray itself ("chat:roll-action").
function rollActions(ctx, roll) {
  // TV-68 (dnd5e damage tray on the card): the DM reaches the tray from any damage card.
  if (roll.kind === "damage" && roll.attemptId && ctx.role === "dm")
    return `<button type="button" class="button quiet" data-chat-roll-action="damage-tray" data-chat-roll="${ctx.esc(roll.attemptId)}">${ctx.t("Vassoio dei danni: moltiplicatori e difese…", "Damage tray: multipliers and defenses…")}</button>`;
  if (roll.source !== "dice-tray" || !roll.id || !tray) return "";
  const record = (ctx.state.ext?.["dice-tray"]?.rolls ?? []).find((r) => r.id === roll.id);
  if (!record || record.status === "withdrawn") return "";
  const own = record.by === ctx.role;
  const hidden = record.audience !== "public" && !record.reveal?.all;
  const canReveal = hidden && (ctx.role === "dm" || (own && record.audience !== "blind"));
  const button = (action, it, en) =>
    `<button type="button" class="button quiet" data-chat-roll-action="${action}" data-chat-roll="${ctx.esc(roll.id)}" data-chat-focus="roll-${action}-${ctx.esc(roll.id)}">${ctx.t(it, en)}</button>`;
  return [
    own && record.mode === "physical" ? button("correct", "Correggi…", "Correct…") : "",
    canReveal ? button("reveal", "Rivela…", "Reveal…") : "",
    own ? button("withdraw", "Ritira…", "Withdraw…") : "",
  ].join("");
}
// TV-89: what a blind roll's roller reads on the card (Foundry blind roll «???»).
function hiddenRollHTML(ctx, item, roll) {
  const t = ctx.t;
  const reason =
    roll.hiddenResult === "blind"
      ? t("Risultato riservato al DM", "Result reserved for the DM")
      : roll.hiddenResult === "self"
        ? t("Tiro privato di chi tira", "The roller's private roll")
        : t("Risultato riservato", "Private result");
  return `<article class="chat-roll-card chat-roll-hidden" data-chat-roll-hidden="${ctx.esc(roll.hiddenResult)}" aria-label="${ctx.esc(`${roll.actorName} · ${roll.kindName}: ${reason}`)}"><div class="chat-roll-head"><span class="chat-avatar" aria-hidden="true">${initial(roll.actorName)}</span><span><strong>${ctx.esc(roll.actorName)}</strong><small>${ctx.esc([roll.actionName, roll.kindName].filter(Boolean).join(" · "))}</small></span>${roll.privacy ? `<span class="chat-tag chat-privacy" data-chat-privacy>${ctx.esc(roll.privacy)}</span>` : ""}<time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time></div><div class="chat-roll-body"><span class="chat-roll-total" aria-hidden="true">?</span><span class="chat-roll-formula"><span class="chat-roll-line">${ctx.esc(roll.dice)}</span><small>${ctx.esc(reason)}</small></span></div></article>`;
}
function rollHTML(ctx, item) {
  const t = ctx.t;
  return item.rolls
    .map((roll) => {
      if (roll.hiddenResult) return hiddenRollHTML(ctx, item, roll);
      const mod =
        !roll.sources.length && roll.modifier
          ? (roll.modifier < 0 ? " − " : " + ") + Math.abs(roll.modifier)
          : "";
      // TV-95: a connected die lands as a physical die and is named (Pixels chat line).
      const mode =
        (roll.mode === "physical"
          ? t("Dado fisico", "Physical die")
          : roll.mode === "digital"
            ? t("Dado digitale", "Digital die")
            : t("Dadi fisici e digitali", "Physical and digital dice")) +
        (roll.devices?.length ? ` · ${roll.devices.join(", ")}` : "");
      const status =
        roll.status === "superseded"
          ? t("Sostituito", "Superseded")
          : roll.status === "reused"
            ? t("Riusato", "Reused")
            : roll.status === "reversed"
              ? roll.withdrawal
                ? t("Ritirato", "Withdrawn")
                : t("Annullato", "Undone")
              : "";
      const reversed = roll.status === "reversed";
      // The dice as before ("1d20 [14] + 5"); a formula with rules (4d6kh3, 10d6cs>=5, 2d20kl1)
      // is named beside them so the total adds up (Foundry chat log).
      const rules = /[a-z]{2}|[<>=]/i.test(String(roll.formula ?? "").replace(/\d+d\d+/g, ""))
        ? roll.formula
        : "";
      const successes =
        roll.successes !== null
          ? ` → ${roll.successes} ${roll.successes === 1 ? t("successo", "success") : t("successi", "successes")}`
          : "";
      // C1 (FG hidden DC): «CD nascosta» for a DC the DM set; the result still shows.
      const verdict =
        roll.success === true
          ? ` · ${t("successo", "success")}`
          : roll.success === false
            ? ` · ${t("fallimento", "failure")}`
            : "";
      const dc =
        roll.dc !== null
          ? ` · ${t("CD", "DC")} ${roll.dc}${verdict}`
          : roll.dcHidden
            ? ` · ${t("CD nascosta", "DC hidden")}${verdict}`
            : "";
      const breakdown = `${ctx.esc(roll.dice)} ${facesHTML(ctx, roll)}${ctx.esc(mod)}${ctx.esc(successes)}${rules ? ` <small class="chat-roll-rule" data-chat-roll-rule>${ctx.esc(rules)}</small>` : ""}`;
      const plain = `${rules || roll.dice} [${(roll.faces ?? roll.values.map((v) => ({ value: v, kept: true }))).map((f) => (f.kept === false ? `~${f.value}~` : f.value)).join(", ")}]${mod}${successes}${roll.sources.length ? " " + sourcesText(roll) : ""}`;
      const damage = roll.damage
        ? `<div class="chat-line chat-roll-damage">${t("Danni", "Damage")}: [${roll.damage.values.join(", ")}]${roll.damage.modifier ? ` ${roll.damage.modifier < 0 ? "−" : "+"} ${Math.abs(roll.damage.modifier)}` : ""} = <strong>${ctx.esc(String(roll.damage.total))}</strong>${roll.damage.critical ? ` · ${t("critico: dadi raddoppiati", "critical: dice doubled")}` : ""}</div>`
        : "";
      const corrected = roll.correctedFrom?.length
        ? `<div class="chat-line">${t("Corretto", "Corrected")}: ${ctx.esc(roll.correctionNote)} (${t("prima", "before")} ${ctx.esc(roll.correctedFrom.join(", "))})</div>`
        : "";
      const actions = rollActions(ctx, roll);
      const details = `<details class="chat-roll-more" data-chat-roll-details="${ctx.esc(roll.id ?? "")}"><summary>${t("Dettagli", "Details")}</summary><dl class="chat-roll-facts">${roll.formula ? `<div><dt>${t("Formula", "Formula")}</dt><dd>${ctx.esc(roll.formula)}</dd></div>` : ""}<div><dt>${t("Dadi", "Dice")}</dt><dd>${facesHTML(ctx, roll) || "—"}</dd></div>${roll.sources.length ? `<div><dt>${t("Bonus", "Bonuses")}</dt><dd>${ctx.esc(sourcesText(roll))}</dd></div>` : ""}${roll.notes.length ? `<div><dt>${t("Modalità", "Mode")}</dt><dd>${ctx.esc(roll.notes.join(" · "))}</dd></div>` : ""}<div><dt>${t("Chi lo vede", "Who sees it")}</dt><dd>${ctx.esc(roll.privacy || t("Tutti", "Everyone"))}</dd></div><div><dt>${t("Dado", "Dice kind")}</dt><dd>${ctx.esc(mode)}</dd></div></dl>${actions ? `<div class="chat-roll-actions">${actions}</div>` : ""}</details>`;
      return `<article class="chat-roll-card${reversed ? " chat-roll-reversed" : ""}" aria-label="${ctx.esc(`${roll.actorName} · ${roll.kindName}: ${roll.total ?? "?"}${reversed ? " · " + t("annullato", "undone") : ""}`)}"><div class="chat-roll-head"><span class="chat-avatar" aria-hidden="true">${initial(roll.actorName)}</span><span><strong>${ctx.esc(roll.actorName)}</strong><small>${ctx.esc([roll.actionName, roll.kindName].filter(Boolean).join(" · "))}${roll.rollMode === "advantage" ? " · " + t("Vantaggio", "Advantage") : roll.rollMode === "disadvantage" ? " · " + t("Svantaggio", "Disadvantage") : ""}</small></span>${roll.privacy ? `<span class="chat-tag chat-privacy" data-chat-privacy>${ctx.esc(roll.privacy)}</span>` : ""}<time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time></div><div class="chat-roll-body" title="${ctx.esc(plain)}"><span class="chat-roll-total">${ctx.esc(String(roll.total ?? "?"))}</span><span class="chat-roll-formula"><span class="chat-roll-line">${breakdown}</span>${roll.sources.length ? `<small class="chat-roll-sources">${ctx.esc(sourcesText(roll))}</small>` : ""}${roll.notes.length ? `<small class="chat-roll-notes">${ctx.esc(roll.notes.join(" · "))}</small>` : ""}<small>${ctx.esc(mode)}${ctx.esc(dc)}${status ? " · " + ctx.esc(status) : ""}${roll.withdrawal ? ": " + ctx.esc(roll.withdrawal) : ""}${roll.parsedFromLabel ? " · " + t("dal registro", "from the log") : ""}</small></span></div>${damage}${corrected}${roll.correctionReason ? `<div class="chat-line">${t("Correzione", "Correction")}: ${ctx.esc(roll.correctionReason)}</div>` : ""}${details}</article>`;
    })
    .join("");
}
function requestHTML(ctx, item) {
  const t = ctx.t;
  const r = item.request;
  const status = (row) =>
    row.status === "pending"
      ? t("In attesa", "Pending")
      : row.status === "resolved"
        ? row.readable
          ? `${row.total}${row.success === true ? ` · ${t("successo", "success")}` : row.success === false ? ` · ${t("fallimento", "failure")}` : ""}`
          : t("Ha tirato", "Rolled")
        : row.success === false
          ? t("Fallimento automatico", "Automatic failure")
          : t("Non più applicabile", "No longer applicable");
  const rows = r.rows
    .map(
      (row) =>
        `<li class="chat-request-row" data-status="${ctx.esc(row.status)}"><span><strong>${ctx.esc(row.name)}</strong> · ${ctx.esc(status(row))}</span>${row.canRoll ? `<button type="button" class="button primary" data-chat-roll-action="request" data-chat-roll="${ctx.esc(row.requestId)}" data-chat-focus="request-${ctx.esc(row.requestId)}">${t("Tira", "Roll")}</button>` : ""}</li>`,
    )
    .join("");
  const s = r.summary;
  return `<li class="chat-item chat-request" data-chat-item="${ctx.esc(item.id)}" data-chat-type="rolls" data-chat-search="${ctx.esc(`${r.title} ${r.rows.map((row) => row.name).join(" ")}`.toLowerCase())}"><article class="chat-request-card" aria-label="${ctx.esc(`${t("Richiesta del DM", "DM request")}: ${r.title}`)}"><div class="chat-roll-head"><span class="chat-avatar" aria-hidden="true">DM</span><span><strong>${t("Richiesta del DM", "DM request")}</strong><small>${ctx.esc(r.title)}</small></span><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time></div><ul class="chat-request-rows">${rows}</ul>${r.contest ? "" : `<p class="chat-line">${t("Successi", "Successes")} ${s.success} · ${t("Fallimenti", "Failures")} ${s.failure} · ${t("In attesa", "Pending")} ${s.pending}</p>`}${r.closed ? `<p class="chat-line">${t("Conclusa", "Closed")}</p>` : ""}</article></li>`;
}
/** One stream entry as a list item. Only projected (permitted) data reaches the markup. */
export function itemHTML(ctx, item) {
  const t = ctx.t;
  const search = (value) => ` data-chat-search="${ctx.esc(String(value).toLowerCase())}"`;
  if (item.type === "rolls")
    return `<li class="chat-item chat-rolls" data-chat-item="${ctx.esc(item.id)}" data-chat-type="rolls"${search(item.rolls.map((r) => `${r.actorName} ${r.actionName} ${r.kindName} ${r.total}`).join(" "))}>${rollHTML(ctx, item)}</li>`;
  if (item.type === "request") return requestHTML(ctx, item);
  if (item.type === "handout")
    return `<li class="chat-item chat-handout" data-chat-item="${ctx.esc(item.id)}" data-chat-type="events"${search(`${item.title} ${item.text}`)}><button type="button" class="chat-card chat-card-handout" data-chat-handout="${ctx.esc(item.materialId)}"><span class="chat-card-kind">${t("Materiale mostrato", "Material shown")} · <time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time></span><strong>${ctx.esc(item.title)}</strong>${item.image ? `<img class="chat-handout-thumb" src="${ctx.esc(item.image)}" alt="">` : ""}${item.text ? `<span class="chat-card-summary">${ctx.esc(item.text)}</span>` : ""}<span class="chat-card-open">${t("Apri il materiale", "Open the material")}</span></button></li>`;
  if (item.type === "passive")
    return `<li class="chat-item chat-event chat-passive" data-chat-item="${ctx.esc(item.id)}" data-chat-type="events"${search(item.label)}><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time> <span><span class="chat-tag">${t("Prova passiva", "Passive check")}</span> ${ctx.esc(item.label)}</span></li>`;
  if (item.type === "event")
    return `<li class="chat-item chat-event${item.reversed ? " chat-event-reversed" : ""}" data-chat-item="${ctx.esc(item.id)}" data-chat-type="events"${search(item.label)}><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time> <span>${item.correction ? `<span class="chat-tag">${t("Correzione", "Correction")}</span> ` : ""}${ctx.esc(item.controllerName)} · ${item.reverts ? `${t("Annullato", "Undone")}: ` : ""}${ctx.esc(item.label)}${item.reversed ? ` <span class="chat-tag">${t("annullato", "undone")}</span>` : ""}</span></li>`;
  const kindAttr = item.whisper ? "whispers" : "messages";
  const base = `data-chat-message="${ctx.esc(item.id)}" data-chat-type="${kindAttr}"`;
  if (item.removed)
    return `<li class="chat-item chat-removed" ${base}${search("")} tabindex="-1" data-chat-focus="item-${ctx.esc(item.id)}"><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time> ${item.removed.by === item.author && item.removed.by !== "dm" ? `${t("Messaggio ritirato da", "Message retracted by")} ${ctx.esc(item.removed.byName)}` : `${t("Messaggio eliminato da", "Message deleted by")} ${ctx.esc(item.removed.byName)}`}${clock(ctx, item.removed.at) !== clock(ctx, item.at) ? ` · ${clock(ctx, item.removed.at)}` : ""}${item.removed.reason ? ` · ${t("Motivo", "Reason")}: ${ctx.esc(item.removed.reason)}` : ""}${whisperLine(ctx, { ...item, hidden: false, range: null })}</li>`;
  if (item.kind === "system")
    return `<li class="chat-item chat-system" ${base}${search(item.text)}><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time> ${ctx.esc(item.text)}</li>`;
  const cls = `chat-item chat-msg chat-kind-${ctx.esc(item.kind)}${item.whisper ? " chat-whisper" : ""}${item.hidden ? " chat-is-hidden" : ""}`;
  const textHTML = item.text
    ? `<div class="chat-text${item.scrambled ? " chat-scrambled" : ""}">${ctx.esc(item.text)}</div>`
    : "";
  const searchable = search(
    `${item.speakerName} ${item.scrambled ? "" : item.text} ${item.card ? ctx.label(item.card.name) : ""}`,
  );
  if (item.kind === "desc")
    return `<li class="${cls}" ${base}${searchable}><div class="chat-desc"><div class="chat-head"><span class="chat-desc-label">${t("Narrazione", "Narration")}</span><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time>${menuHTML(ctx, item)}</div>${whisperLine(ctx, item)}${textHTML}${imageHTML(ctx, item)}</div></li>`;
  if (item.kind === "emote")
    return `<li class="${cls}" ${base}${searchable}><div class="chat-emote-row"><div class="chat-text chat-emote">${speakerHTML(ctx, item)} ${ctx.esc(item.text)}</div><time datetime="${ctx.esc(item.at)}">${clock(ctx, item.at)}</time>${menuHTML(ctx, item)}</div>${whisperLine(ctx, item)}${imageHTML(ctx, item)}</li>`;
  if (item.kind === "share")
    return `<li class="${cls}" ${base}${searchable}>${headHTML(ctx, item, t("condivide", "shares"))}${whisperLine(ctx, item)}${cardHTML(ctx, item)}${textHTML}</li>`;
  if (item.kind === "vote")
    return `<li class="${cls}" ${base}${searchable}>${headHTML(ctx, item, t("apre un voto", "opens a vote"))}${whisperLine(ctx, item)}${voteHTML(ctx, item)}</li>`;
  if (item.kind === "snapshot")
    return `<li class="${cls}" ${base}${searchable}>${headHTML(ctx, item, t("scatta un’istantanea", "takes a snapshot"))}${whisperLine(ctx, item)}<figure class="chat-photo"><button type="button" class="chat-image" data-chat-image="${ctx.esc(item.id)}" aria-label="${t("Ingrandisci l’istantanea", "Enlarge snapshot")}"><img src="${ctx.esc(item.snapshot.src)}" alt="${ctx.esc(t("Istantanea di", "Snapshot of") + " " + item.snapshot.sceneName)}"></button><figcaption>${ctx.esc(item.snapshot.sceneName)}${item.snapshot.round ? ` · ${t("round", "round")} ${ctx.esc(String(item.snapshot.round))}` : ""}${item.text ? ` — ${ctx.esc(item.text)}` : ""}</figcaption><button type="button" class="button quiet" data-chat-save-snapshot="${ctx.esc(item.id)}">${t("Salva immagine", "Save image")}</button></figure></li>`;
  return `<li class="${cls}" ${base}${searchable}>${headHTML(ctx, item)}${whisperLine(ctx, item)}${textHTML}${languageNote(ctx, item)}${imageHTML(ctx, item)}</li>`;
}
function withDays(ctx, items) {
  let last = null;
  return items
    .map((item) => {
      const day = localDay(item.at);
      const sep =
        day !== last
          ? `<li class="chat-day" role="presentation"><span>${ctx.esc(dayTitle(ctx, day))}</span></li>`
          : "";
      last = day;
      // P10 CA-68 (shared edit): the viewer's own content filter (safety-ui.mjs).
      return sep + filterChatMarkup(ctx, itemHTML(ctx, item), item);
    })
    .join("");
}
const FILTERS = [
  ["all", "Tutto", "Everything"],
  ["messages", "Messaggi", "Messages"],
  ["whispers", "Sussurri", "Whispers"],
  ["rolls", "Tiri", "Rolls"],
  ["events", "Eventi", "Events"],
];
const matchesFilter = (item, filter) =>
  filter === "all" ||
  (filter === "rolls" && item.type === "rolls") ||
  (filter === "events" && ["event", "handout", "passive"].includes(item.type)) ||
  (filter === "whispers" && item.type === "message" && item.whisper) ||
  (filter === "messages" && item.type === "message");

// ---------------------------------------------------------------- composer

function composerHTML(ctx, d) {
  const t = ctx.t;
  const esc = ctx.esc;
  const dm = ctx.role === "dm";
  const speakers = chat.speakerOptions(ctx.state, ctx.role);
  const actorId = speakerActor(d);
  const targets = chat.whisperTargets(ctx.state, ctx.role, actorId);
  const modes = [
    ["ic", "Dialogo", "Dialogue"],
    ["emote", "Azione", "Action"],
    ["ooc", "Fuori personaggio", "Out of character"],
    ...(dm ? [["desc", "Narrazione", "Narration"]] : []),
  ];
  const noCharacter = !speakers.length;
  const known = actorId ? chat.knownLanguages(ctx.state, actorId) : null;
  const languages = d.speaker === "npc" ? chat.LANGUAGES.map((l) => l.id) : (known ?? ["common"]);
  const showSpeaker = !dm || ["ic", "emote"].includes(d.mode);
  const hasToken = (() => {
    const scene = ctx.state.scenes?.find((s) => s.id === ctx.state.activeSceneId);
    return !!actorId && !!scene?.tokens.some((token) => token.actorId === actorId);
  })();
  const showRange = dm && ["ic", "emote"].includes(d.mode) && d.to === "all" && hasToken;
  const targetName = (target) => targetLabel(ctx, target);
  const speakerName = (s) => (s.type === "npc" ? t("PNG con nome…", "Named NPC…") : s.name);
  const placeholder =
    d.mode === "desc"
      ? t("Narra la scena…", "Narrate the scene…")
      : d.mode === "ooc"
        ? t("Scrivi fuori personaggio…", "Write out of character…")
        : d.mode === "emote"
          ? t("Descrivi un’azione…", "Describe an action…")
          : t(
              "Scrivi in personaggio… (Invio invia, Maiusc+Invio va a capo)",
              "Speak in character… (Enter sends, Shift+Enter adds a line)",
            );
  const shareable = canShareFrom(ctx, actorId);
  return `<form class="chat-composer" data-chat-composer novalidate>
  <fieldset class="chat-modes"><legend class="chat-sr">${t("Tipo di messaggio", "Message type")}</legend>${modes
    .map(
      ([id, it, en]) =>
        `<label class="chat-mode"><input type="radio" name="chat-mode" value="${id}" ${d.mode === id ? "checked" : ""} ${noCharacter && ["ic", "emote"].includes(id) ? 'disabled aria-describedby="chat-modes-why"' : ""} data-chat-focus="mode-${id}"><span>${t(it, en)}</span></label>`,
    )
    .join(
      "",
    )}${noCharacter ? `<p class="chat-hint" id="chat-modes-why">${t("In personaggio ed emote servono un tuo personaggio nella campagna: collega la scheda alla campagna, o scrivi fuori personaggio.", "In character and emote need one of your characters in the campaign: connect the sheet to the campaign, or write out of character.")}</p>` : ""}</fieldset>
  <div class="chat-row">${
    // TV-105 (Fantasy Grounds /mood with a visible selector): the tone of the next message,
    // beside its type; free text with suggestions, «/mood» still works.
    ["ic", "emote"].includes(d.mode) && !noCharacter
      ? `<label class="chat-field chat-mood"><span class="chat-field-name">${t("Tono", "Mood")}</span><input data-chat-mood list="chat-moods-${esc(ctx.lang)}" value="${esc(d.mood ?? "")}" maxlength="${chat.MAX_NAME}" autocomplete="off" placeholder="${t("nessuno", "none")}" data-chat-focus="mood"></label><datalist id="chat-moods-${esc(ctx.lang)}">${MOODS.map(([it, en]) => `<option value="${esc(t(it, en))}"></option>`).join("")}</datalist>`
      : ""
  }${
    showSpeaker && speakers.length
      ? `<label class="chat-field"><span class="chat-field-name">${dm ? t("Parla come", "Speak as") : t("Personaggio", "Character")}</span><select data-chat-speaker data-chat-focus="speaker">${speakers
          .map(
            (s) =>
              `<option value="${esc(s.id)}" ${s.id === d.speaker ? "selected" : ""}>${esc(speakerName(s))}</option>`,
          )
          .join("")}</select></label>`
      : ""
  }<label class="chat-field"><span class="chat-field-name">${t("A", "To")}</span><select data-chat-to data-chat-focus="to"><option value="all">${t("Tutti", "Everyone")}</option>${targets
    .map(
      (target) =>
        `<option value="${esc(target.id)}" ${target.id === d.to ? "selected" : ""}>${t("Sussurro a", "Whisper to")} ${esc(targetName(target))}</option>`,
    )
    .join("")}</select></label>${
    d.mode === "ic" && (d.speaker === "npc" || actorId)
      ? `<label class="chat-field"><span class="chat-field-name">${t("Lingua", "Language")}</span><select data-chat-language data-chat-focus="language" aria-describedby="chat-understands">${languages
          .map(
            (id) =>
              `<option value="${esc(id)}" ${id === d.language ? "selected" : ""}>${esc(chat.languageName(id, ctx.lang))}</option>`,
          )
          .join("")}</select></label>`
      : ""
  }${
    showRange
      ? `<label class="chat-field"><span class="chat-field-name">${t("Si sente", "Heard")}</span><select data-chat-range data-chat-focus="range">${chat.RANGES.map(
          (r) =>
            `<option value="${r.id}" ${r.id === d.range ? "selected" : ""}>${esc(ctx.label(r.name))}</option>`,
        ).join("")}</select></label>`
      : ""
  }</div>
  ${
    d.speaker === "npc" && showSpeaker && dm
      ? `<label class="chat-field chat-wide"><span class="chat-field-name">${t("Nome del PNG", "NPC name")}</span><input data-chat-npc value="${esc(d.npcName)}" maxlength="40" placeholder="${t("Per esempio: Guardia", "For example: Guard")}" data-chat-focus="npc" autocomplete="off"></label>`
      : ""
  }
  ${
    !dm && actorId
      ? `<div class="chat-hint" id="chat-understands" data-chat-understands>${esc(ctx.state.actors[actorId]?.name ?? "")} ${t("capisce", "understands")}: ${esc(
          (known ?? []).map((id) => chat.languageName(id, ctx.lang)).join(", ") ||
            t("lingue non registrate", "no recorded languages"),
        )}</div>`
      : ""
  }
  ${
    d.image
      ? `<div class="chat-attachment"><img src="${esc(d.image.src)}" alt=""><span>${esc(d.image.name || t("Immagine", "Image"))}</span><button type="button" class="button quiet" data-chat-drop-image data-chat-focus="drop-image">${t("Rimuovi immagine", "Remove image")}</button></div>`
      : ""
  }
  <div class="chat-input-row"><label class="chat-sr" for="chat-text">${t("Messaggio", "Message")}</label><textarea id="chat-text" rows="2" maxlength="${chat.MAX_TEXT}" data-chat-text data-chat-focus="text" placeholder="${esc(placeholder)}">${esc(d.text)}</textarea><button type="submit" class="button primary" data-chat-send data-chat-focus="send">${t("Invia", "Send")}</button></div>
  <div class="chat-error" role="alert" data-chat-error ${d.error ? "" : "hidden"}>${esc(d.error)}</div>
  ${shareable ? "" : `<p class="chat-hint" id="chat-share-why">${t("Condividi mostra una capacità di un tuo personaggio: scegli come chi parli un tuo personaggio.", "Share shows a feature of one of your characters: choose one of your characters as the speaker.")}</p>`}
  <div class="chat-actions">
    <label class="button quiet chat-attach" title="${t("Allega o incolla un’immagine (PNG, JPEG, GIF, WebP · max 500 KB)", "Attach or paste an image (PNG, JPEG, GIF, WebP · max 500 KB)")}"><input type="file" class="chat-sr" accept="${chat.IMAGE_TYPES.join(",")}" data-chat-file data-chat-focus="file">${t("Immagine", "Image")}</label>
    <button type="button" class="button quiet" data-chat-share data-chat-focus="share" ${shareable ? "" : 'disabled aria-describedby="chat-share-why"'} title="${shareable ? "" : t("Scegli un tuo personaggio", "Choose one of your characters")}">${t("Condividi", "Share")}</button>
    <button type="button" class="button quiet" data-chat-vote data-chat-focus="vote">${t("Voto", "Vote")}</button>
    <button type="button" class="button quiet" data-chat-snapshot data-chat-focus="snapshot">${t("Istantanea", "Snapshot")}</button>
    ${dm && ctx.registry?.get?.("command", "dice-tray.request", ctx) ? `<button type="button" class="button quiet" data-chat-request data-chat-focus="request" title="${t("Chiedi una prova o un tiro salvezza ai giocatori (Dadi › Richieste)", "Ask the players for a check or a save (Dice › Requests)")}">${t("Chiedi un tiro", "Request a roll")}</button>` : ""}
    <button type="button" class="button quiet chat-help-toggle" data-chat-help aria-expanded="${ui.showHelp}" aria-controls="chat-help" data-chat-focus="help" title="${t("Comandi della chat", "Chat commands")}" aria-label="${t("Comandi della chat", "Chat commands")}">/?</button>
  </div>
  <div class="chat-help" id="chat-help" ${ui.showHelp ? "" : "hidden"}><ul>
    <li><code>/ic</code> ${t("in personaggio", "in character")} · <code>/ooc</code> ${t("fuori personaggio", "out of character")} · <code>/em</code> ${t("azione", "action")}</li>
    <li><code>/w Doran ${t("testo", "text")}</code> ${t("sussurra a un personaggio", "whispers to a character")} · <code>/w dm</code> ${t("al DM", "to the DM")}</li>
    <li><code>/mood ${t("preoccupata testo", "worried text")}</code> ${t("tono", "mood")} · <code>/vote ${t("domanda", "question")}</code> ${t("voto sì/no", "yes/no vote")}</li>
    ${dm ? `<li><code>/desc</code> ${t("narrazione", "narration")} · <code>/as "${t("Guardia", "Guard")}" ${t("testo", "text")}</code> ${t("parla come PNG", "speaks as an NPC")} · <code>/emas</code> ${t("azione di un PNG", "NPC action")}</li>` : ""}
    <li><code>/r d20+5</code> ${t("apre «Tira i dadi» già compilato: scegli dado fisico o digitale", "opens “Roll dice” filled in: choose a physical or digital die")}</li>
    <li>${t("↑ richiama i messaggi inviati; Tab completa il nome dopo /w. Incolla o trascina un’immagine nel campo.", "↑ recalls sent messages; Tab completes the name after /w. Paste or drop an image into the field.")}</li>
  </ul></div>
</form>`;
}

// ---------------------------------------------------------------- Table log panel

// Below this width the log is a full-screen sheet (chat.css): then it is a modal dialog
// (WAI-ARIA modal pattern: role, aria-modal, focus kept inside); docked beside the map it
// stays a non-modal region, like D&D Beyond's game log locked open (DDB-153).
export const SHEET_QUERY = "(max-width: 900px)";
const sheetMode = () => !!globalThis.matchMedia?.(SHEET_QUERY)?.matches;
function panelHTML(ctx) {
  ui.rendered = true;
  const t = ctx.t;
  const d = draftFor(ctx);
  const items = chat.projectStream(ctx.state, slice(ctx.state), ctx.role, streamOptions(ctx));
  const filtered = items.filter((item) => matchesFilter(item, ui.filter));
  const shown = filtered.slice(-ui.window);
  return `<section class="chat-panel" data-chat-panel aria-labelledby="chat-panel-title"${sheetMode() ? ' role="dialog" aria-modal="true"' : ""}>
  <header class="chat-panel-head"><h2 id="chat-panel-title">${t("Registro e chat", "Log and chat")}</h2><label class="chat-field chat-filter"><span class="chat-sr">${t("Mostra", "Show")}</span><select data-chat-filter data-chat-focus="filter" aria-label="${t("Mostra", "Show")}">${FILTERS.map(
    ([id, it, en]) =>
      `<option value="${id}" ${ui.filter === id ? "selected" : ""}>${t(it, en)}</option>`,
  ).join(
    "",
  )}</select></label><button type="button" class="button quiet" data-chat-open-archive>${t("Archivio", "Archive")}</button><button type="button" class="button quiet chat-close" data-table="log" data-chat-close aria-label="${t("Chiudi il registro", "Close the log")}" title="${t("Chiudi il registro (Esc)", "Close the log (Esc)")}">✕</button></header>
  ${shown.length < filtered.length ? `<button type="button" class="button quiet chat-more" data-chat-more>${t("Mostra i precedenti", "Show earlier")} (${filtered.length - shown.length})</button>` : ""}
  <ol class="chat-stream" data-chat-stream tabindex="0" aria-label="${t("Messaggi, tiri ed eventi", "Messages, rolls and events")}">${shown.length ? withDays(ctx, shown) : `<li class="chat-empty">${t("Ancora nessun messaggio. Scrivi al gruppo o tira un dado: i tiri compaiono qui.", "No messages yet. Write to the group or roll a die: rolls appear here.")}</li>`}</ol>
  <div class="chat-sr" role="status" data-chat-announce></div>
  ${composerHTML(ctx, d)}
</section>`;
}

async function readImage(file) {
  if (typeof FileReader === "undefined") throw Error("FileReader unavailable");
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
async function attachImage(ctx, file) {
  const d = draftFor(ctx);
  const t = ctx.t;
  if (!file) return;
  if (!chat.IMAGE_TYPES.includes(file.type)) {
    d.error = t(
      "Formato non supportato: usa PNG, JPEG, GIF o WebP.",
      "Unsupported format: use PNG, JPEG, GIF or WebP.",
    );
    return rerender(ctx, "text");
  }
  if (file.size > chat.MAX_IMAGE_BYTES) {
    d.error = t("Immagine troppo grande (massimo 500 KB).", "Image too large (500 KB at most).");
    return rerender(ctx, "text");
  }
  let src;
  try {
    src = await readImage(file);
  } catch {
    d.error = t("Immagine illeggibile.", "Unreadable image.");
    return rerender(ctx, "text");
  }
  // Refused at once when it would not fit, with the space used (media quota pattern).
  try {
    chat.checkAttachmentRoom(ctx.state, slice(ctx.state), src.length);
    d.image = { src, name: String(file.name || "").slice(0, 120) };
    d.error = "";
  } catch (error) {
    d.error = errorText(ctx, error);
  }
  rerender(ctx, "text");
}

function send(ctx) {
  const d = draftFor(ctx);
  const t = ctx.t;
  const saved = { text: d.text, image: d.image };
  let preview;
  try {
    preview = chat.composeMessage(ctx.state, ctx.role, inputOf(d), {
      now: new Date().toISOString(),
    });
  } catch (error) {
    d.error = errorText(ctx, error);
    return rerender(ctx, "text");
  }
  if (preview.help) {
    ui.showHelp = true;
    d.text = "";
    d.error = "";
    return rerender(ctx, "text");
  }
  if (preview.roll) {
    try {
      openFreeRoll(ctx, preview.roll);
      // The command is consumed (↑ recalls it); the field under the dialog empties too.
      d.history = [...d.history, saved.text].slice(-20);
      d.historyIndex = -1;
      d.text = "";
      d.error = "";
      const field = focusRoot?.querySelector?.("[data-chat-text]");
      if (field) field.value = "";
    } catch (error) {
      d.error = errorText(ctx, error);
      rerender(ctx, "text");
    }
    return;
  }
  // Clear before the commit renders, restore if the commit is refused (offline, invalid).
  const input = { ...inputOf(d), text: saved.text, image: saved.image };
  saved.mood = d.mood;
  d.text = "";
  d.image = null;
  d.mood = "";
  d.error = "";
  ui.focus = "text";
  ui.stick = true;
  try {
    post(ctx, input, preview.readers ? t("sussurro", "whisper") : t("messaggio", "message"));
    if (saved.text.trim()) d.history.push(saved.text);
    d.history = d.history.slice(-20);
    d.historyIndex = -1;
  } catch (error) {
    d.text = saved.text;
    d.image = saved.image;
    d.mood = saved.mood;
    d.error = errorText(ctx, error);
    rerender(ctx, "text");
  }
}

// The Table bound last (the log panel's bind receives it): /r uses its own free roll.
let tableRef = null;
/**
 * /r opens the Table's "Tira i dadi" free roll with the die and modifier filled in; the
 * person then chooses a physical or digital die there, and the result reaches the log as
 * a card. The roll is for the selected token, so the speaker's own token is selected first.
 */
function openFreeRoll(ctx, roll) {
  const table = tableRef;
  const refuse = (it, en) => {
    throw Object.assign(Error(en), { it, en });
  };
  if (!table?.root?.isConnected || ctx.view?.page !== "table")
    refuse("Apri il Tavolo per tirare.", "Open the Table to roll.");
  const actorId = speakerActor(draftFor(ctx));
  const scene = ctx.state.scenes?.find((entry) => entry.id === ctx.state.activeSceneId);
  const actor = actorId ? ctx.state.actors[actorId] : null;
  if (
    actor &&
    actorId !== table.selectedActorId &&
    ctx.canControl(actor) &&
    scene?.tokens.some((token) => token.actorId === actorId)
  )
    table.select(actorId);
  const button = table.root.querySelector('[data-table="dice"]');
  if (!button)
    refuse(
      "Seleziona sulla mappa un personaggio che controlli, poi usa /r.",
      "Select a character you control on the map, then use /r.",
    );
  // B34: with the dice tray built the button opens the tray, which takes the formula.
  ctx.registry?.emit("dice-tray:prefill", {
    formula: `1d${roll.sides}${roll.modifier ? (roll.modifier < 0 ? "-" : "+") + Math.abs(roll.modifier) : ""}`,
    actorId,
  });
  button.click();
  const form = globalThis.document?.querySelector("#dialog form");
  const sides = form?.querySelector("[name=sides]");
  const modifier = form?.querySelector("[name=modifier]");
  if (!sides || !modifier) return;
  sides.value = String(roll.sides);
  sides.dispatchEvent(new Event("change", { bubbles: true }));
  modifier.value = String(roll.modifier);
  form.querySelector("[name=mode]")?.focus();
}
function openDialogSafely(ctx, run) {
  try {
    run();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
  }
}
// A whisper recipient as the composer names it ("Solo io (DM)" for the DM's own notes).
function targetLabel(ctx, target) {
  return target.type === "dm"
    ? ctx.t("DM", "DM")
    : target.type === "self"
      ? ctx.t("Solo io (DM)", "Only me (DM)")
      : target.name;
}
/** Whether this identity may share entries of the actor's sheet to the campaign chat. */
function canShareFrom(ctx, actorId) {
  const actor = actorId ? ctx.state.actors?.[actorId] : null;
  return (
    !!actor &&
    ctx.canControl(actor) &&
    chat.speakerOptions(ctx.state, ctx.role).some((option) => option.actorId === actorId)
  );
}
/**
 * Shard "share to chat" (VTL-158): a spell or item of a sheet becomes a card. From the
 * composer it uses the chosen character and recipient; from a sheet's details dialog
 * (`chat.share-entry` command) the entry comes preselected and the recipient is chosen here.
 */
function openShare(ctx, { actorId: requested = null, entryId = null } = {}) {
  const t = ctx.t;
  const esc = ctx.esc;
  const d = draftFor(ctx);
  const fromComposer = !requested;
  const actorId = requested ?? speakerActor(d);
  const actor = actorId ? ctx.state.actors[actorId] : null;
  if (!canShareFrom(ctx, actorId))
    return ctx.toast(
      t("Scegli un tuo personaggio della campagna.", "Choose one of your campaign characters."),
      true,
    );
  const entries = chat.shareableEntries(actor);
  const targets = chat.whisperTargets(ctx.state, ctx.role, actorId);
  const defaultTo = fromComposer && targets.some((x) => x.id === d.to) ? d.to : "all";
  const group = (type, it, en) => {
    const list = entries.filter((entry) => entry.type === type);
    return list.length
      ? `<fieldset class="chat-share-group"><legend>${t(it, en)}</legend>${list
          .map(
            (entry) =>
              `<label class="chat-share-option"><input type="radio" name="entry" value="${esc(entry.id)}" ${entry.id === entryId ? "checked" : ""}><span>${esc(ctx.label(entry.name))}${type === "spell" ? ` <small>${entry.level === 0 ? t("trucchetto", "cantrip") : t("livello", "level") + " " + entry.level}</small>` : entry.quantity > 1 ? ` <small>×${entry.quantity}</small>` : ""}</span></label>`,
          )
          .join("")}</fieldset>`
      : "";
  };
  ctx.dialog(
    t("Condividi nella chat", "Share to chat"),
    `<p>${t("Scegli una voce della scheda di", "Choose an entry from the sheet of")} ${esc(actor.name)}. ${t("I destinatari vedono una carta che apre il dettaglio.", "Recipients see a card that opens the details.")}</p>${group("spell", "Incantesimi", "Spells")}${group("item", "Oggetti", "Items")}${entries.length ? "" : `<p class="muted">${t("Nessuna voce da condividere.", "Nothing to share.")}</p>`}<label class="field">${t("Destinatari", "Recipients")}<select name="to"><option value="all">${t("Tutti", "Everyone")}</option>${targets
      .map(
        (target) =>
          `<option value="${esc(target.id)}" ${target.id === defaultTo ? "selected" : ""}>${t("Sussurro a", "Whisper to")} ${esc(targetLabel(ctx, target))}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="field">${t("Commento (facoltativo)", "Comment (optional)")}<input name="comment" maxlength="200" autocomplete="off"></label>`,
    {
      submitLabel: t("Condividi", "Share"),
      onSubmit: (data) => {
        const entry = String(data.get("entry") ?? "");
        if (!entry)
          throw Object.assign(Error("Choose an entry."), {
            it: "Scegli una voce.",
            en: "Choose an entry.",
          });
        const to = String(data.get("to") ?? defaultTo);
        const card = chat.buildCard(ctx.state, ctx.role, actorId, entry);
        ui.stick = true;
        post(
          ctx,
          {
            ...inputOf(d),
            speaker: "actor:" + actorId,
            to,
            text: String(data.get("comment") ?? ""),
            image: null,
            card,
            range: "all",
          },
          t("carta condivisa", "shared card"),
        );
        if (fromComposer) return void focusLater("text");
        // From a sheet the log is elsewhere: say where the card went.
        const target = targets.find((x) => x.id === to);
        ctx.toast(
          `${t("Condiviso nella chat", "Shared to chat")}: ${ctx.label(card.name)} · ${target ? `${t("sussurro a", "whisper to")} ${targetLabel(ctx, target)}` : t("tutti", "everyone")}.`,
        );
      },
    },
  );
}
function openVote(ctx) {
  const t = ctx.t;
  ctx.dialog(
    t("Nuovo voto sì/no", "New yes/no vote"),
    `<p>${t("Ogni partecipante vota una volta e può cambiare idea finché il voto è aperto. Chi lo apre o il DM lo chiude e mostra l’esito; in caso di parità decide il DM.", "Each participant votes once and may change their mind while the vote is open. Its author or the DM closes it and shows the outcome; on a tie the DM decides.")}</p><label class="field">${t("Domanda", "Question")}<input name="question" maxlength="${chat.MAX_QUESTION}" required autocomplete="off"></label>`,
    {
      submitLabel: t("Apri il voto", "Open the vote"),
      onSubmit: (data) => {
        ui.stick = true;
        post(
          ctx,
          { kind: "vote", text: String(data.get("question") ?? ""), to: "all", mode: "ooc" },
          t("voto", "vote"),
        );
        focusLater("text");
      },
    },
  );
}

// BG3 photo mode as a recap snapshot (CRP-165): the active scene as every player sees it,
// never the DM's view (no hidden tokens, no secret doors), as a self-contained SVG image.
export function snapshotSource(ctx) {
  const state = ctx.state;
  const scene = state.scenes?.find((s) => s.id === state.activeSceneId);
  if (!scene)
    throw Object.assign(Error("No active scene"), {
      it: "Nessuna scena attiva da fotografare.",
      en: "No active scene to capture.",
    });
  const esc = ctx.esc;
  const width = Math.min(4000, Math.max(300, Number(scene.width) || 1000));
  const height = Math.min(4000, Math.max(300, Number(scene.height) || 650));
  const grid = Math.min(300, Math.max(10, Number(scene.gridSize) || 50));
  const visible = (scene.tokens ?? []).filter((token) => {
    const actor = state.actors?.[token.actorId];
    return (
      actor &&
      isActorAvailable(actor) &&
      actor.visibility !== "private" &&
      (!actor.companion || canViewActor(actor, "player", state)) &&
      !actor.hidden &&
      !token.hidden &&
      token.visible !== false
    );
  });
  const walls = (scene.walls ?? [])
    .filter((wall) => !wall.secret)
    .map(
      (wall) =>
        `<line x1="${Number(wall.a?.x) || 0}" y1="${Number(wall.a?.y) || 0}" x2="${Number(wall.b?.x) || 0}" y2="${Number(wall.b?.y) || 0}" stroke="${wall.kind === "door" ? "#c99a52" : "#e5dcc0"}" stroke-width="6" stroke-linecap="round"/>`,
    )
    .join("");
  const tokens = visible
    .map((token) => {
      const actor = state.actors[token.actorId];
      const hostile =
        (actor.combatProfile?.team ?? (actor.kind === "npc" ? "watch" : "party")) === "watch";
      const x = Number(token.x) || 0;
      const y = Number(token.y) || 0;
      return `<g transform="translate(${x},${y})"><circle r="23" fill="${hostile ? "#724d47" : "#31586d"}" stroke="#e2c17b" stroke-width="3"/><text y="7" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#f4e4bf">${esc([...actor.name][0] ?? "?")}</text><text y="44" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#f4e4bf" stroke="#111b25" stroke-width="3" paint-order="stroke">${esc(actor.name)}</text></g>`;
    })
    .join("");
  const caption = `${scene.name}${state.combat?.active ? ` · round ${state.combat.round}` : ""}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + 44}" width="${width}" height="${height + 44}">${renderSceneBase(scene, ctx)}${scene.gridVisible === false ? "" : `<defs><pattern id="g" x="${Number(scene.gridOffsetX) || 0}" y="${Number(scene.gridOffsetY) || 0}" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M ${grid} 0 H0 V${grid}" fill="none" stroke="#d9c79c" stroke-opacity=".18" stroke-width="1"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#g)"/>`}${walls}${tokens}<rect y="${height}" width="${width}" height="44" fill="#111b25"/><text x="16" y="${height + 29}" font-family="Georgia, serif" font-size="20" fill="#f0e9d8">${esc(caption)}</text></svg>`;
  return {
    src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    sceneId: scene.id,
    sceneName: scene.name,
    round: state.combat?.active ? state.combat.round : null,
  };
}
function openSnapshot(ctx) {
  const t = ctx.t;
  const d = draftFor(ctx);
  const snapshot = snapshotSource(ctx);
  chat.checkAttachmentRoom(ctx.state, slice(ctx.state), snapshot.src.length);
  ctx.dialog(
    t("Istantanea della scena", "Scene snapshot"),
    `<p>${t("La scena come la vedono i giocatori: niente pedine nascoste né porte segrete. Resta nell’archivio della chat per il resoconto e si può salvare come immagine.", "The scene as players see it: no hidden tokens or secret doors. It stays in the chat archive for the recap and can be saved as an image.")}</p><img class="chat-snapshot-preview" src="${ctx.esc(snapshot.src)}" alt="${ctx.esc(t("Anteprima dell’istantanea di", "Snapshot preview of") + " " + snapshot.sceneName)}"><label class="field">${t("Didascalia (facoltativa)", "Caption (optional)")}<input name="caption" maxlength="200" autocomplete="off"></label>`,
    {
      submitLabel: t("Condividi l’istantanea", "Share the snapshot"),
      onSubmit: (data) => {
        ui.stick = true;
        post(
          ctx,
          {
            ...inputOf(d),
            text: String(data.get("caption") ?? ""),
            image: null,
            snapshot,
            range: "all",
          },
          t("istantanea", "snapshot"),
        );
        focusLater("text");
      },
    },
  );
}
function findItem(ctx, id) {
  const message = slice(ctx.state).messages.find((m) => m.id === id);
  return message ? chat.projectMessage(ctx.state, message, ctx.role, projectOptions(ctx)) : null;
}
function openCard(ctx, id) {
  const t = ctx.t;
  const esc = ctx.esc;
  const item = findItem(ctx, id);
  if (!item?.card) return;
  const lines = chat.cardLines(item.card, ctx.lang);
  const actor = ctx.state.actors[item.card.actorId];
  const canOpen = actor && canViewActor(actor, ctx.role, ctx.state);
  ctx.dialog(
    lines.title,
    `<p class="chat-detail-kind">${esc(lines.subtitle)}</p>${lines.facts.length ? `<dl class="chat-facts">${lines.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}<p>${esc(lines.summary)}</p><p class="muted">${t("Fonte", "Source")}: ${esc(lines.source)}${lines.sourceUrl ? ` · <a href="${esc(lines.sourceUrl)}" target="_blank" rel="noopener noreferrer">${t("Leggi la fonte", "Read the source")}</a>` : ""}</p>${item.card.source?.kind === "srd" ? `<p class="muted">${esc(ctx.label(SUMMARY_POLICY))}</p>` : ""}<p class="muted">${t("Condiviso da", "Shared by")} ${esc(item.speakerName)} · ${clock(ctx, item.at)}</p>${canOpen ? `<button type="button" class="button" data-chat-open-sheet="${esc(actor.id)}" data-tab="${item.card.type === "spell" ? "spells" : "inventory"}">${t("Apri la scheda di", "Open the sheet of")} ${esc(actor.name)}</button>` : ""}`,
    { cancelLabel: t("Chiudi", "Close") },
  );
  globalThis.document
    ?.querySelector("#dialog [data-chat-open-sheet]")
    ?.addEventListener("click", (e) => {
      const b = e.currentTarget;
      ctx.closeDialog();
      ctx.openSheet(b.dataset.chatOpenSheet, b.dataset.tab);
    });
}
function openImage(ctx, id) {
  const item = findItem(ctx, id);
  const src = item?.image?.src ?? item?.snapshot?.src;
  if (!src) return;
  const alt = item.snapshot ? item.snapshot.sceneName : item.image.name;
  ctx.dialog(
    item.snapshot ? ctx.t("Istantanea", "Snapshot") : ctx.t("Immagine", "Image"),
    `<img class="chat-image-full" src="${ctx.esc(src)}" alt="${ctx.esc(alt || "")}">`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
}
function download(name, type, content) {
  if (!globalThis.document || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saveSnapshot(ctx, id) {
  const item = findItem(ctx, id);
  if (!item?.snapshot) return;
  const svg = decodeURIComponent(item.snapshot.src.slice(item.snapshot.src.indexOf(",") + 1));
  download(
    `${ctx.t("istantanea", "snapshot")}-${item.snapshot.sceneId}-${item.at.slice(0, 10)}.svg`,
    "image/svg+xml",
    svg,
  );
}
function openRemove(ctx, id) {
  const t = ctx.t;
  const item = findItem(ctx, id);
  if (!item) return;
  ctx.dialog(
    item.own && ctx.role !== "dm"
      ? t("Ritira il messaggio", "Retract message")
      : t("Elimina il messaggio", "Delete message"),
    `<blockquote class="chat-quote">${ctx.esc(item.scrambled ? t("(testo in un’altra lingua)", "(text in another language)") : item.text || (item.card ? ctx.label(item.card.name) : (item.vote?.question ?? t("(allegato)", "(attachment)"))))}</blockquote><p>${t("Il contenuto viene cancellato in modo definitivo. Al suo posto resta una traccia con chi l’ha rimosso, quando e il motivo.", "The content is permanently deleted. A trace stays in its place with who removed it, when and why.")}${ctx.role === "dm" ? " " + t("Per toglierlo solo temporaneamente usa «Nascondi ai giocatori».", "To remove it only temporarily, use “Hide from players”.") : ""}</p><label class="field">${t("Motivo (facoltativo)", "Reason (optional)")}<input name="reason" maxlength="${chat.MAX_REASON}" autocomplete="off"></label>`,
    {
      submitLabel: t("Elimina", "Delete"),
      onSubmit: (data) => {
        const reason = String(data.get("reason") ?? "");
        const now = new Date().toISOString();
        const message = slice(ctx.state).messages.find((m) => m.id === id);
        // The trace in the stream is the feedback: no toast lingers after a role switch.
        commitChat(
          ctx,
          t("messaggio eliminato", "message deleted"),
          (s) => chat.removeMessage(s, id, ctx.role, reason, now),
          { whisper: !!message?.readers },
        );
        focusLater(`item-${id}`);
      },
    },
  );
}
function showSpeaker(ctx, actorId, focusKey) {
  if (!tableRef?.select || !speakerOnMap(ctx, actorId)) return;
  // The phone sheet covers the map: close it first, then select.
  if (sheetMode()) globalThis.document?.querySelector("[data-chat-close]")?.click();
  else ui.focus = focusKey ?? null;
  tableRef.select(actorId);
}
function runSafely(ctx, fn) {
  try {
    fn();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
  }
}

function bindStreamActions(el, ctx) {
  el.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (!b || !el.contains(b)) return;
    const d = b.dataset;
    const t = ctx.t;
    if (d.chatCard) return openCard(ctx, d.chatCard);
    // TV-87: the card's Correct, Reveal and Withdraw run the dice tray's own dialogs.
    if (d.chatRollAction)
      return runSafely(ctx, () =>
        area.emit("chat:roll-action", { id: d.chatRoll, action: d.chatRollAction }),
      );
    if (d.chatShowToken) return showSpeaker(ctx, d.chatShowToken, b.dataset.chatFocus);
    // The handouts area opens the material from its route (#campaign?tab=handouts&id=…).
    if (d.chatHandout) return ctx.navigate("campaign", { tab: "handouts", id: d.chatHandout });
    if (d.chatImage) return openImage(ctx, d.chatImage);
    if (d.chatSaveSnapshot) return saveSnapshot(ctx, d.chatSaveSnapshot);
    if (d.chatRemove) return openRemove(ctx, d.chatRemove);
    if (d.chatHide)
      return runSafely(ctx, () => {
        const message = slice(ctx.state).messages.find((m) => m.id === d.chatHide);
        // Focus stays on the same message's menu (its label now says the opposite).
        ui.focus = `menu-${d.chatHide}`;
        commitChat(
          ctx,
          d.hidden === "1"
            ? t("messaggio nascosto", "message hidden")
            : t("messaggio mostrato", "message shown"),
          (s) => chat.setHidden(s, d.chatHide, ctx.role, d.hidden === "1"),
          { whisper: !!message?.readers },
        );
      });
    if (d.chatBallot)
      return runSafely(ctx, () => {
        ui.focus = `ballot-${d.chatBallot}-${d.choice}`;
        commitChat(ctx, t("voto espresso", "vote cast"), (s) =>
          chat.castVote(s, d.chatBallot, ctx.role, d.choice),
        );
      });
    if (d.chatCloseVote)
      return runSafely(ctx, () => {
        const now = new Date().toISOString();
        ui.focus = `outcome-${d.chatCloseVote}`;
        commitChat(ctx, t("voto chiuso", "vote closed"), (s) =>
          chat.closeVote(s, d.chatCloseVote, ctx.role, now),
        );
      });
  });
  // One open action menu at a time.
  el.addEventListener(
    "toggle",
    (event) => {
      if (!event.target.matches?.("details.chat-menu") || !event.target.open) return;
      el.querySelectorAll("details.chat-menu[open]").forEach((menu) => {
        if (menu !== event.target) menu.open = false;
      });
    },
    true,
  );
}

function restoreFocus(el) {
  if (!ui.focus) return;
  const target = el.querySelector(`[data-chat-focus="${cssEscape(ui.focus)}"]`);
  ui.focus = null;
  if (!target) return;
  target.focus({ preventScroll: true });
  if (target.matches("textarea"))
    target.setSelectionRange(target.value.length, target.value.length);
}

// The sheet/docked choice follows the viewport: crossing the breakpoint redraws the panel.
let sheetWatch = null;
function watchSheet(ctx, panel) {
  const query = globalThis.matchMedia?.(SHEET_QUERY);
  if (sheetWatch) sheetWatch.query.removeEventListener?.("change", sheetWatch.listener);
  sheetWatch = null;
  if (!query?.addEventListener) return;
  const listener = () => {
    if (panel.isConnected) rerender(ctx, globalThis.document?.activeElement?.dataset?.chatFocus);
  };
  query.addEventListener("change", listener);
  sheetWatch = { query, listener };
}
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]';
// Modal sheet: Tab and Shift+Tab cycle inside it, never to the Table hidden behind it.
function trapFocus(panel, event) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  if (panel.getAttribute?.("aria-modal") !== "true") return;
  const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
    (node) =>
      node.getClientRects?.().length && !node.closest?.("[hidden], details:not([open]) > div"),
  );
  if (!items.length) return;
  const active = globalThis.document?.activeElement;
  const first = items[0];
  const last = items.at(-1);
  if (!panel.contains(active)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindPanel(el, ctx, table = null) {
  const t = ctx.t;
  const d = draftFor(ctx);
  const panel = el.querySelector("[data-chat-panel]");
  if (!panel) return;
  focusRoot = el;
  tableRef = table;
  watchSheet(ctx, panel);
  panel.addEventListener("keydown", (event) => trapFocus(panel, event));
  const stream = panel.querySelector("[data-chat-stream]");
  const text = panel.querySelector("[data-chat-text]");
  const form = panel.querySelector("[data-chat-composer]");
  const opened = !ui.open;
  ui.open = true;
  // The open log shows everything the notices announced.
  if (opened) clearToasts();
  // Newest at the bottom (Foundry); keep a reader's position when they scrolled back.
  if (stream) {
    stream.scrollTop = ui.stick ? stream.scrollHeight : ui.scrollTop;
    stream.addEventListener("scroll", () => {
      ui.stick = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 48;
      ui.scrollTop = stream.scrollTop;
    });
  }
  bindStreamActions(panel, ctx);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    send(ctx);
  });
  text.addEventListener("input", () => {
    d.text = text.value;
    if (d.error) {
      d.error = "";
      panel.querySelector("[data-chat-error]").hidden = true;
    }
  });
  text.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    // Roll20: Tab completes the name after /w; with nothing to complete it moves focus.
    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      const completed = chat.completeWhisper(ctx.state, ctx.role, speakerActor(d), text.value);
      if (completed) {
        event.preventDefault();
        text.value = d.text = completed;
        text.setSelectionRange(completed.length, completed.length);
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(ctx);
      return;
    }
    // Rumble!: up/down recall sent messages when the field is empty or at its start.
    if (
      event.key === "ArrowUp" &&
      d.history.length &&
      text.selectionStart === 0 &&
      text.selectionEnd === 0
    ) {
      event.preventDefault();
      d.historyIndex = d.historyIndex < 0 ? d.history.length - 1 : Math.max(0, d.historyIndex - 1);
      text.value = d.text = d.history[d.historyIndex];
    } else if (
      event.key === "ArrowDown" &&
      d.historyIndex >= 0 &&
      text.selectionStart === text.value.length
    ) {
      event.preventDefault();
      d.historyIndex = d.historyIndex + 1 < d.history.length ? d.historyIndex + 1 : -1;
      text.value = d.text = d.historyIndex < 0 ? "" : d.history[d.historyIndex];
    }
  });
  // Chat Images: paste or drop an image into the field.
  text.addEventListener("paste", (event) => {
    const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    attachImage(ctx, file);
  });
  form.addEventListener("dragover", (event) => {
    if ([...(event.dataTransfer?.types ?? [])].includes("Files")) event.preventDefault();
  });
  form.addEventListener("drop", (event) => {
    const file = [...(event.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    attachImage(ctx, file);
  });
  panel.querySelector("[data-chat-file]")?.addEventListener("change", (event) => {
    attachImage(ctx, event.target.files?.[0]);
  });
  panel.querySelectorAll('input[name="chat-mode"]').forEach((radio) =>
    radio.addEventListener("change", () => {
      d.mode = radio.value;
      d.error = "";
      rerender(ctx, "mode-" + radio.value);
    }),
  );
  const onSelect = (selector, key, focus) =>
    panel.querySelector(selector)?.addEventListener("change", (event) => {
      d[key] = event.target.value;
      d.error = "";
      rerender(ctx, focus);
    });
  onSelect("[data-chat-speaker]", "speaker", "speaker");
  onSelect("[data-chat-to]", "to", "to");
  onSelect("[data-chat-language]", "language", "language");
  panel.querySelector("[data-chat-mood]")?.addEventListener("input", (event) => {
    d.mood = event.target.value;
  });
  onSelect("[data-chat-range]", "range", "range");
  panel.querySelector("[data-chat-npc]")?.addEventListener("input", (event) => {
    d.npcName = event.target.value;
  });
  panel.querySelector("[data-chat-filter]")?.addEventListener("change", (event) => {
    ui.filter = event.target.value;
    ui.stick = true;
    rerender(ctx, "filter");
  });
  panel.querySelector("[data-chat-more]")?.addEventListener("click", () => {
    ui.window += 80;
    ui.stick = false;
    ui.scrollTop = 0;
    rerender(ctx);
  });
  panel.querySelector("[data-chat-drop-image]")?.addEventListener("click", () => {
    d.image = null;
    rerender(ctx, "text");
  });
  panel
    .querySelector("[data-chat-share]")
    ?.addEventListener("click", () => openDialogSafely(ctx, () => openShare(ctx)));
  panel
    .querySelector("[data-chat-vote]")
    ?.addEventListener("click", () => openDialogSafely(ctx, () => openVote(ctx)));
  panel
    .querySelector("[data-chat-snapshot]")
    ?.addEventListener("click", () => openDialogSafely(ctx, () => openSnapshot(ctx)));
  // F16: «Chiedi un tiro» beside the chat field runs the dice tray's request command.
  panel.querySelector("[data-chat-request]")?.addEventListener("click", () => {
    const command = ctx.registry?.get?.("command", "dice-tray.request", ctx);
    if (command) ctx.registry.run(command, ctx);
  });
  panel
    .querySelector("[data-chat-open-archive]")
    ?.addEventListener("click", () => ctx.navigate("campaign", { tab: "chat-archive" }));
  panel.querySelector("[data-chat-help]")?.addEventListener("click", () => {
    ui.showHelp = !ui.showHelp;
    rerender(ctx, "help");
  });
  // The close button carries the core's data-table="log" toggle; return focus to Registro.
  panel.querySelector("[data-chat-close]")?.addEventListener("click", () => {
    ui.focusLogButton = true;
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const menu = event.target.closest?.("details[open]");
    event.preventDefault();
    if (menu) {
      menu.open = false;
      menu.querySelector("summary")?.focus();
      return;
    }
    panel.querySelector("[data-chat-close]")?.click();
  });
  const requested = !!ui.focus;
  restoreFocus(panel);
  if (opened && !requested) text.focus({ preventScroll: true });
  // Reading the open log marks everything up to now as read for this identity; the header
  // bell refreshes once when that removed unread notifications.
  const now = new Date().toISOString();
  const hadUnread = chat.unreadItems(
    ctx.state,
    slice(ctx.state),
    ctx.role,
    markerOf(ctx.state, "read", ctx.role),
    unreadOptions(ctx),
  ).length;
  advanceMarker(ctx.state, "read", ctx.role, now);
  advanceMarker(ctx.state, "announced", ctx.role, now);
  if (hadUnread) {
    const focused = globalThis.document?.activeElement?.dataset?.chatFocus ?? null;
    setTimeout(() => {
      if (!panel.isConnected) return;
      ui.focus = focused;
      ctx.render();
    }, 0);
  }
  announceNewest(panel, ctx);
}
let newestAnnounced = null;
function announceNewest(panel, ctx) {
  const items = chat.projectStream(ctx.state, slice(ctx.state), ctx.role, streamOptions(ctx));
  const newest = items.at(-1);
  if (!newest || newest.id === newestAnnounced) return;
  const first = newestAnnounced === null;
  newestAnnounced = newest.id;
  if (first) return;
  const region = panel.querySelector("[data-chat-announce]");
  setTimeout(() => {
    if (region?.isConnected) region.textContent = summary(ctx, newest).join(": ");
  }, 60);
}

// ---------------------------------------------------------------- notices (DDB-153)

function summary(ctx, item) {
  const t = ctx.t;
  if (item.type === "rolls") {
    const roll = item.rolls[0];
    return [
      `${roll.actorName}${roll.actionName ? " · " + roll.actionName : ""}`,
      `${roll.kindName}: ${roll.total ?? "?"} (${roll.mode === "physical" ? t("dado fisico", "physical die") : roll.mode === "digital" ? t("dado digitale", "digital die") : t("misto", "mixed")})`,
    ];
  }
  if (item.type === "event") return [item.controllerName, item.label];
  if (item.type === "handout") return [t("Materiale mostrato", "Material shown"), item.title];
  const body = item.scrambled
    ? `[${item.languageName}]`
    : item.kind === "share" && item.card
      ? `${t("condivide", "shares")} ${ctx.label(item.card.name)}`
      : item.kind === "vote" && item.vote
        ? `${t("Voto", "Vote")}: ${item.vote.question}`
        : item.kind === "snapshot"
          ? t("Istantanea della scena", "Scene snapshot")
          : item.text || (item.image ? t("Immagine", "Image") : "");
  return [
    `${item.speakerName}${item.whisper ? " · " + t("sussurro", "whisper") : ""}`,
    body.length > 90 ? body.slice(0, 89) + "…" : body,
  ];
}
function toastHost(ctx) {
  let host = document.querySelector(".chat-toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "chat-toasts";
    host.setAttribute("role", "region");
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
  }
  host.setAttribute("aria-label", ctx.t("Novità nel registro", "New in the log"));
  return host;
}
export function clearToasts() {
  globalThis.document?.querySelectorAll?.(".chat-toast").forEach((toast) => toast.remove());
}
const PHONE_QUERY = "(max-width: 720px)";
function showToasts(ctx, items) {
  if (!items.length || typeof document === "undefined") return;
  const t = ctx.t;
  const host = toastHost(ctx);
  const phone = !!globalThis.matchMedia?.(PHONE_QUERY)?.matches;
  let cards;
  if (phone) {
    // One notice: the newest, with how many more are waiting in the log.
    const [title, body] = summary(ctx, items.at(-1));
    const more = items.length - 1;
    cards = [[title, more > 0 ? `${body} · +${more} ${t("novità", "more")}` : body]];
    host.replaceChildren();
    // Just above the action dock when it is at the bottom of the screen (B61: the Table's
    // tab bar may be pinned under it, so "at the bottom" allows for that bar).
    const dock = document.querySelector("#content .action-dock")?.getBoundingClientRect();
    const gap = dock && dock.top < innerHeight && dock.bottom >= innerHeight - 96;
    host.style.setProperty(
      "--chat-toast-bottom",
      gap ? `${Math.round(innerHeight - dock.top + 8)}px` : "",
    );
  } else {
    const shown = items.length > 3 ? items.slice(-2) : items;
    const extra = items.length - shown.length;
    cards = shown.map((item) => summary(ctx, item));
    if (extra > 0)
      cards.unshift([t("Registro", "Log"), `${extra} ${t("altre novità", "more updates")}`]);
  }
  for (const [title, body] of cards) {
    const toast = document.createElement("div");
    toast.className = "chat-toast";
    toast.innerHTML = `<p><strong>${ctx.esc(title)}</strong><span>${ctx.esc(body)}</span></p><div><button type="button" class="button quiet" data-chat-toast-open>${t("Apri il registro", "Open the log")}</button><button type="button" class="button quiet" data-chat-toast-close aria-label="${t("Chiudi l’avviso", "Dismiss notice")}">✕</button></div>`;
    toast.querySelector("[data-chat-toast-open]").addEventListener("click", () => {
      clearToasts();
      openLog(ctx);
    });
    toast.querySelector("[data-chat-toast-close]").addEventListener("click", () => toast.remove());
    host.append(toast);
    setTimeout(() => toast.remove(), 12000);
  }
  while (host.children.length > (phone ? 1 : 3)) host.firstElementChild.remove();
}
/**
 * Opens the Table log from anywhere: on the Table its own Registro toggle, elsewhere the
 * Table route with the log tab (the same target the notification centre uses).
 */
export function openLog(ctx) {
  const toggle =
    ctx.view?.page === "table"
      ? globalThis.document?.querySelector?.('#content [data-table="log"]')
      : null;
  if (toggle) {
    if (toggle.getAttribute("aria-expanded") !== "true") toggle.click();
    return;
  }
  ctx.navigate("table", { tab: LOG_ROUTE_TAB });
}
// The closed-log notices are a personal choice (on by default, like D&D Beyond). When the
// notification centre (B24) already pops chat notices, or its chat category is off, the
// Table does not add a second notice for the same message.
export function closedLogNotices(ctx) {
  let mine = true;
  try {
    mine = area.getSetting(ctx, "chat-notices.closed-log") !== false;
  } catch {
    mine = true;
  }
  let centre = null;
  try {
    centre = area.getSetting(ctx, "notifications.cat-chat");
  } catch {
    centre = null; // B24 not loaded
  }
  return mine && centre !== "toast" && centre !== "off";
}
// #table?tab=chat-log opens the log once per navigation (notification target, notices from
// another page); closing it afterwards keeps it closed on later renders of the same view.
function applyLogRoute(ctx, table) {
  const view = ctx.view;
  if (!view || view.page !== "table" || view.tab !== LOG_ROUTE_TAB || ui.routeView === view)
    return false;
  ui.routeView = view;
  if (ui.rendered) return false;
  const toggle = table?.root?.querySelector?.('[data-table="log"]');
  if (!toggle) return false;
  // After this bind completes (the random-tables drawer route does the same).
  queueMicrotask(() => {
    if (toggle.isConnected !== false && toggle.getAttribute?.("aria-expanded") !== "true")
      toggle.click();
  });
  return true;
}
function afterTableRender(ctx, table) {
  // The badge was drawn before this bind: redraw once if the centre read something; the
  // notices of what was just marked read go too.
  if (!ui.rendered && syncCentreReads(ctx)) {
    clearToasts();
    queueMicrotask(() => ctx.render());
  }
  if (ui.focusLogButton) {
    ui.focusLogButton = false;
    if (!ui.rendered) table.root?.querySelector('[data-table="log"]')?.focus();
  }
  if (applyLogRoute(ctx, table)) return;
  if (ui.rendered) return;
  ui.open = false;
  // Log closed: others' new messages and rolls pop once as notices (D&D Beyond).
  const since = [markerOf(ctx.state, "announced", ctx.role), markerOf(ctx.state, "read", ctx.role)]
    .sort()
    .at(-1);
  const items = chat.unreadItems(ctx.state, slice(ctx.state), ctx.role, since, unreadOptions(ctx));
  advanceMarker(ctx.state, "announced", ctx.role, new Date().toISOString());
  if (closedLogNotices(ctx)) showToasts(ctx, items);
}

// ---------------------------------------------------------------- map chat bubbles

// Foundry shows in-character lines as bubbles over the speaker's token. A bubble fades
// over ten seconds; a later render resumes the fade instead of restarting it.
function bubblesSVG(ctx, tableView) {
  ui.rendered = false;
  const scene = tableView.scene;
  const state = ctx.state;
  const now = Date.now();
  const latest = new Map();
  for (const message of slice(state).messages) {
    // Whispers never become bubbles on the shared map (Foundry shows public speech only).
    if (!["ic", "emote"].includes(message.kind) || message.removed || message.to) continue;
    const age = now - Date.parse(message.at);
    if (age > 10000 || age < -1000) continue;
    const item = chat.projectMessage(state, message, ctx.role, projectOptions(ctx));
    if (!item?.speakerActorId) continue;
    latest.set(item.speakerActorId, { item, age: Math.max(0, age) });
  }
  return [...latest.values()]
    .map(({ item, age }) => {
      const token = scene.tokens.find((entry) => entry.actorId === item.speakerActorId);
      const actor = state.actors[item.speakerActorId];
      if (!token || !actor || !isActorAvailable(actor)) return "";
      const observable =
        ctx.canControl(actor) || (!actor.hidden && !token.hidden && token.visible !== false);
      if (!observable) return "";
      const raw = item.kind === "emote" ? `${item.speakerName} ${item.text}` : item.text;
      const line = raw.length > 42 ? raw.slice(0, 41) + "…" : raw;
      const width = Math.max(60, Math.min(340, line.length * 7.6 + 22));
      return `<g class="chat-bubble${item.scrambled ? " chat-bubble-scrambled" : ""}" transform="translate(${Number(token.x) || 0},${(Number(token.y) || 0) - 42})" style="animation-delay:-${age}ms" data-chat-bubble="${ctx.esc(item.id)}"><rect x="${-width / 2}" y="-30" width="${width}" height="28" rx="8"/><path d="M -6 -3 L 0 7 L 6 -3 Z"/><text y="-11" text-anchor="middle">${ctx.esc(line)}</text></g>`;
    })
    .join("");
}

// ---------------------------------------------------------------- campaign: archive

function archiveHTML(ctx) {
  const t = ctx.t;
  const esc = ctx.esc;
  const s = slice(ctx.state);
  const items = chat.projectStream(ctx.state, s, ctx.role, streamOptions(ctx));
  const groups = [];
  for (const item of items) {
    const day = localDay(item.at);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1).items.push(item);
  }
  const a = ui.archive;
  const perspective = perspectiveOf(ctx);
  return `<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading data-chat-focus="archive-heading">${t("Archivio della chat", "Chat archive")}</h1><p class="muted">${t("Messaggi, tiri ed eventi di tutte le sessioni che puoi leggere", "Messages, rolls and events from every session you can read")} · <span data-chat-archive-count data-one="${esc(t("elemento", "item"))}" data-many="${esc(t("elementi", "items"))}">${items.length} ${items.length === 1 ? t("elemento", "item") : t("elementi", "items")}</span></p></div><div class="toolbar"><button type="button" class="button" data-chat-to-table>${t("Apri il Tavolo", "Open the Table")}</button><button type="button" class="button" data-chat-export>${t("Esporta (.txt)", "Export (.txt)")}</button>${ctx.role === "dm" ? `<button type="button" class="button danger" data-chat-clear>${t("Svuota l’archivio…", "Clear the archive…")}</button>` : ""}</div></header>
  <form class="chat-archive-tools" data-chat-archive-tools role="search"><label class="field">${t("Cerca nell’archivio", "Search the archive")}<input type="search" name="q" value="${esc(a.query)}" data-chat-archive-q autocomplete="off"></label><label class="field">${t("Mostra", "Show")}<select data-chat-archive-kind>${FILTERS.map(([id, it, en]) => `<option value="${id}" ${a.kind === id ? "selected" : ""}>${t(it, en)}</option>`).join("")}</select></label><button type="button" class="button ${a.hideWhispers ? "active" : ""}" aria-pressed="${a.hideWhispers}" data-chat-hide-whispers>${t("Nascondi sussurri", "Hide whispers")}</button></form>
  ${perspective ? `<p class="muted">${t("Le lingue straniere si leggono come", "Foreign languages are read as")} ${esc(ctx.state.actors[perspective]?.name ?? "")}${t(" (il personaggio scelto nella chat).", " (the character chosen in the chat).")}</p>` : ""}
  ${
    groups.length
      ? groups
          .map(
            (group) =>
              `<section class="chat-archive-day" data-chat-day><h2>${esc(dayTitle(ctx, group.day))}</h2><ol class="chat-stream chat-archive-list">${group.items.map((item) => itemHTML(ctx, item)).join("")}</ol></section>`,
          )
          .join("")
      : `<p class="campaign-empty">${t("L’archivio è vuoto.", "The archive is empty.")}</p>`
  }
  <p class="campaign-empty" data-chat-archive-none hidden>${t("Nessun elemento corrisponde ai filtri.", "No item matches the filters.")}</p>`;
}
function applyArchiveFilter(el) {
  const a = ui.archive;
  const q = a.query.trim().toLowerCase();
  let visible = 0;
  el.querySelectorAll("[data-chat-day]").forEach((day) => {
    let any = false;
    day.querySelectorAll(".chat-item").forEach((li) => {
      const type = li.dataset.chatType;
      const show =
        (a.kind === "all" ||
          a.kind === type ||
          (a.kind === "messages" && ["messages", "whispers"].includes(type))) &&
        !(a.hideWhispers && type === "whispers") &&
        (!q || (li.dataset.chatSearch ?? "").includes(q));
      li.hidden = !show;
      if (show) visible++;
      any ||= show;
    });
    day.hidden = !any;
  });
  const count = el.querySelector("[data-chat-archive-count]");
  if (count)
    count.textContent = `${visible} ${visible === 1 ? count.dataset.one : count.dataset.many}`;
  const none = el.querySelector("[data-chat-archive-none]");
  if (none) none.hidden = visible > 0 || !el.querySelector("[data-chat-day]");
}
function exportArchive(ctx) {
  const t = ctx.t;
  const now = new Date().toISOString();
  const { text, count } = chat.exportTranscript(ctx.state, slice(ctx.state), ctx.role, {
    ...streamOptions(ctx),
    includeWhispers: !ui.archive.hideWhispers,
    now,
  });
  download(
    `chat-${ctx.state.campaign?.id ?? "campagna"}-${now.slice(0, 10)}.txt`,
    "text/plain;charset=utf-8",
    text,
  );
  ctx.toast(
    `${t("Archivio esportato", "Archive exported")}: ${count} ${t("elementi", "items")}${ui.archive.hideWhispers ? " · " + t("sussurri esclusi", "whispers excluded") : ""}.`,
  );
}
function openClear(ctx) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const count = s.messages.filter((m) => m.kind !== "system").length;
  const phrase = ctx.lang === "en" ? chat.CLEAR_PHRASE.en : chat.CLEAR_PHRASE.it;
  ctx.dialog(
    t("Svuota l’archivio della chat", "Clear the chat archive"),
    `<p>${t("Elimini in modo definitivo", "You permanently delete")} <strong>${count}</strong> ${t("messaggi della chat per tutti, compresi sussurri e immagini. Non si può annullare. I tiri e le modifiche della partita restano nei registri di gioco ma non compaiono più nella chat; resta una traccia della pulizia.", "chat messages for everyone, including whispers and images. This cannot be undone. Game rolls and changes stay in the game records but no longer appear in the chat; a trace of the clearing stays.")}</p><p>${t("Prima di svuotare puoi esportare l’archivio.", "You can export the archive before clearing it.")}</p><label class="field">${t("Per confermare scrivi", "To confirm, type")} <strong>${ctx.esc(phrase)}</strong><input name="phrase" autocomplete="off" data-chat-clear-phrase></label>`,
    {
      submitLabel: t("Svuota definitivamente", "Clear permanently"),
      onSubmit: (data) => {
        const now = new Date().toISOString();
        let removed = 0;
        commitChat(ctx, t("archivio svuotato", "archive cleared"), (s) => {
          removed = chat.clearArchive(s, ctx.role, data.get("phrase"), now);
        });
        ctx.toast(
          `${t("Archivio svuotato", "Archive cleared")}: ${removed} ${t("messaggi", "messages")}.`,
        );
        focusLater("archive-heading");
      },
    },
  );
}
function bindArchive(el, ctx) {
  const now = new Date().toISOString();
  advanceMarker(ctx.state, "read", ctx.role, now);
  focusRoot = el;
  bindStreamActions(el, ctx);
  applyArchiveFilter(el);
  restoreFocus(el);
  const a = ui.archive;
  el.querySelector("[data-chat-archive-tools]")?.addEventListener("submit", (e) =>
    e.preventDefault(),
  );
  el.querySelector("[data-chat-archive-q]")?.addEventListener("input", (e) => {
    a.query = e.target.value;
    applyArchiveFilter(el);
  });
  el.querySelector("[data-chat-archive-kind]")?.addEventListener("change", (e) => {
    a.kind = e.target.value;
    applyArchiveFilter(el);
  });
  el.querySelector("[data-chat-hide-whispers]")?.addEventListener("click", (e) => {
    a.hideWhispers = !a.hideWhispers;
    e.currentTarget.setAttribute("aria-pressed", String(a.hideWhispers));
    e.currentTarget.classList.toggle("active", a.hideWhispers);
    applyArchiveFilter(el);
  });
  el.querySelector("[data-chat-export]")?.addEventListener("click", () =>
    runSafely(ctx, () => exportArchive(ctx)),
  );
  el.querySelector("[data-chat-clear]")?.addEventListener("click", () => openClear(ctx));
  el.querySelector("[data-chat-to-table]")?.addEventListener("click", () => ctx.navigate("table"));
  if (ctx.view.id) {
    const target = el.querySelector(`[data-chat-message="${cssEscape(ctx.view.id)}"]`);
    if (target) {
      target.classList.add("chat-highlight");
      target.hidden = false;
      target.closest("[data-chat-day]")?.removeAttribute("hidden");
      target.scrollIntoView({ block: "center" });
    }
  }
}

// ---------------------------------------------------------------- campaign: forum

function forumHTML(ctx) {
  const t = ctx.t;
  const esc = ctx.esc;
  const threads = chat.projectThreads(ctx.state, slice(ctx.state), ctx.role, ctx.lang);
  const open = ctx.view.id ? threads.find((entry) => entry.id === ctx.view.id) : null;
  const when = (at) =>
    new Date(at).toLocaleString(tag(ctx), {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (open) {
    const dm = ctx.role === "dm";
    const key = ctx.role + ":" + open.id;
    if (open.removed)
      return `<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading data-chat-focus="forum-heading">${t("Discussione rimossa", "Discussion removed")}</h1><p class="muted">${t("Rimossa da", "Removed by")} ${esc(open.removed.byName)} · ${esc(when(open.removed.at))}${open.removed.reason ? ` · ${t("Motivo", "Reason")}: ${esc(open.removed.reason)}` : ""}</p></div><div class="toolbar"><button type="button" class="button" data-chat-forum-back>${t("Tutte le discussioni", "All discussions")}</button></div></header>`;
    return `<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading data-chat-focus="forum-heading">${esc(open.title)}</h1><p class="muted">${t("Aperta da", "Started by")} ${esc(open.authorName)} · ${esc(when(open.at))}${open.pinned ? ` · <span class="badge">${t("In evidenza", "Pinned")}</span>` : ""}${open.sunk ? ` · <span class="badge">${t("In fondo", "Sunk")}</span>` : ""}</p></div><div class="toolbar"><button type="button" class="button" data-chat-forum-back>${t("Tutte le discussioni", "All discussions")}</button>${
      dm
        ? `<button type="button" class="button" data-chat-thread-flag="pinned" data-value="${open.pinned ? "0" : "1"}" aria-pressed="${open.pinned}">${open.pinned ? t("Togli dall’evidenza", "Unpin") : t("Metti in evidenza", "Pin to top")}</button><button type="button" class="button" data-chat-thread-flag="sunk" data-value="${open.sunk ? "0" : "1"}" aria-pressed="${open.sunk}">${open.sunk ? t("Riporta su", "Unsink") : t("Sposta in fondo", "Sink")}</button>`
        : ""
    }${dm || open.own ? `<button type="button" class="button danger" data-chat-thread-remove>${t("Rimuovi la discussione…", "Remove discussion…")}</button>` : ""}</div></header>
  <ol class="chat-forum-posts">${open.posts
    .map(
      (post) =>
        `<li class="chat-forum-post${post.removed ? " chat-removed" : ""}" data-chat-post="${esc(post.id)}"${post.removed ? ` tabindex="-1" data-chat-focus="post-${esc(post.id)}"` : ""}><div class="chat-head">${personAvatar(ctx, post.author, post.authorName, "chat-avatar") || `<span class="chat-avatar" aria-hidden="true">${initial(post.authorName)}</span>`}<span class="chat-who"><strong>${esc(post.authorName)}</strong></span><time datetime="${esc(post.at)}">${esc(when(post.at))}</time>${!post.removed && (dm || post.own) ? `<button type="button" class="button quiet" data-chat-post-remove="${esc(post.id)}">${t("Elimina", "Delete")}</button>` : ""}</div>${post.removed ? `<p class="chat-line">${t("Messaggio eliminato da", "Post deleted by")} ${esc(post.removed.byName)}${post.removed.reason ? ` · ${t("Motivo", "Reason")}: ${esc(post.removed.reason)}` : ""}</p>` : `<p class="chat-text">${esc(post.text)}</p>`}</li>`,
    )
    .join("")}</ol>
  <form class="chat-forum-reply" data-chat-reply><label class="field">${t("Rispondi", "Reply")}<textarea name="text" rows="3" maxlength="${chat.MAX_TEXT}" data-chat-reply-text>${esc(replyDrafts[key] ?? "")}</textarea></label><p class="chat-error" role="alert" data-chat-reply-error hidden></p><button type="submit" class="button primary">${t("Pubblica la risposta", "Post reply")}</button></form>`;
  }
  return `<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${t("Discussioni", "Discussions")}</h1><p class="muted">${t("Conversazioni della campagna fra una sessione e l’altra. Il DM mette in evidenza, sposta in fondo o rimuove.", "Campaign conversations between sessions. The DM pins, sinks or removes.")}</p></div><div class="toolbar"><button type="button" class="button primary" data-chat-thread-new>${t("Nuova discussione", "New discussion")}</button></div></header>
  <ul class="chat-forum-list">${
    threads.length
      ? threads
          .map((entry) =>
            entry.removed
              ? `<li class="chat-forum-row chat-removed">${t("Discussione rimossa da", "Discussion removed by")} ${esc(entry.removed.byName)} · ${esc(when(entry.removed.at))}</li>`
              : `<li class="chat-forum-row${entry.pinned ? " is-pinned" : ""}${entry.sunk ? " is-sunk" : ""}"><button type="button" class="chat-forum-open" data-chat-thread="${esc(entry.id)}"><strong>${esc(entry.title)}</strong><span class="muted">${esc(entry.authorName)} · ${entry.replies} ${entry.replies === 1 ? t("risposta", "reply") : t("risposte", "replies")} · ${t("ultima attività", "last activity")} ${esc(when(entry.lastAt))}</span></button>${entry.pinned ? `<span class="badge">${t("In evidenza", "Pinned")}</span>` : ""}${entry.sunk ? `<span class="badge">${t("In fondo", "Sunk")}</span>` : ""}</li>`,
          )
          .join("")
      : `<li class="campaign-empty">${t("Nessuna discussione. Aprine una per organizzare la prossima sessione.", "No discussions. Start one to organise the next session.")}</li>`
  }</ul>`;
}
function bindForum(el, ctx) {
  const t = ctx.t;
  focusRoot = el;
  advanceMarker(ctx.state, "forum", ctx.role, new Date().toISOString());
  const id = ctx.view.id;
  const key = ctx.role + ":" + id;
  el.querySelector("[data-chat-forum-back]")?.addEventListener("click", () =>
    ctx.navigate("campaign", { tab: "chat-forum" }),
  );
  el.querySelectorAll("[data-chat-thread]").forEach((b) =>
    b.addEventListener("click", () =>
      ctx.navigate("campaign", { tab: "chat-forum", id: b.dataset.chatThread }),
    ),
  );
  el.querySelector("[data-chat-thread-new]")?.addEventListener("click", () =>
    ctx.dialog(
      t("Nuova discussione", "New discussion"),
      `<label class="field">${t("Titolo", "Title")}<input name="title" maxlength="${chat.MAX_TITLE}" required autocomplete="off"></label><label class="field">${t("Messaggio", "Message")}<textarea name="text" rows="4" maxlength="${chat.MAX_TEXT}" required></textarea></label>`,
      {
        submitLabel: t("Pubblica", "Post"),
        onSubmit: (data) => {
          const now = new Date().toISOString();
          let created;
          commitChat(ctx, t("discussione aperta", "discussion started"), (s) => {
            created = chat.createThread(
              s,
              ctx.role,
              { title: data.get("title"), text: data.get("text") },
              now,
            );
          });
          setTimeout(() => ctx.navigate("campaign", { tab: "chat-forum", id: created.id }), 0);
        },
      },
    ),
  );
  const reply = el.querySelector("[data-chat-reply]");
  const replyText = el.querySelector("[data-chat-reply-text]");
  replyText?.addEventListener("input", () => (replyDrafts[key] = replyText.value));
  reply?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = replyText.value;
    const now = new Date().toISOString();
    try {
      delete replyDrafts[key];
      commitChat(ctx, t("risposta pubblicata", "reply posted"), (s) =>
        chat.replyThread(s, ctx.role, id, value, now),
      );
    } catch (error) {
      replyDrafts[key] = value;
      const box = el.querySelector("[data-chat-reply-error]");
      if (box) {
        box.textContent = errorText(ctx, error);
        box.hidden = false;
      }
    }
  });
  el.querySelectorAll("[data-chat-thread-flag]").forEach((b) =>
    b.addEventListener("click", () =>
      runSafely(ctx, () =>
        commitChat(ctx, t("discussione aggiornata", "discussion updated"), (s) =>
          chat.setThreadFlag(s, ctx.role, id, b.dataset.chatThreadFlag, b.dataset.value === "1"),
        ),
      ),
    ),
  );
  // After a removal dialog, focus goes to the trace left in place.
  const runThen = (run, focusKey) => {
    run();
    focusLater(focusKey);
  };
  const removal = (title, apply) =>
    ctx.dialog(
      title,
      `<p>${t("Il contenuto viene cancellato; resta una traccia con chi l’ha rimosso e il motivo.", "The content is deleted; a trace stays with who removed it and why.")}</p><label class="field">${t("Motivo (facoltativo)", "Reason (optional)")}<input name="reason" maxlength="${chat.MAX_REASON}" autocomplete="off"></label>`,
      {
        submitLabel: t("Elimina", "Delete"),
        onSubmit: (data) => apply(String(data.get("reason") ?? ""), new Date().toISOString()),
      },
    );
  el.querySelector("[data-chat-thread-remove]")?.addEventListener("click", () =>
    removal(t("Rimuovi la discussione", "Remove discussion"), (reason, now) =>
      runThen(
        () =>
          commitChat(ctx, t("discussione rimossa", "discussion removed"), (s) =>
            chat.removeThread(s, ctx.role, id, reason, now),
          ),
        "forum-heading",
      ),
    ),
  );
  el.querySelectorAll("[data-chat-post-remove]").forEach((b) =>
    b.addEventListener("click", () =>
      removal(t("Elimina il messaggio", "Delete post"), (reason, now) =>
        runThen(
          () =>
            commitChat(ctx, t("messaggio eliminato", "post deleted"), (s) =>
              chat.removePost(s, ctx.role, id, b.dataset.chatPostRemove, reason, now),
            ),
          `post-${b.dataset.chatPostRemove}`,
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- home: latest posts

// Roll20 shows the campaign forum's latest posts on the game's page (R20-062, SVC-083).
function forumHomeHTML(ctx) {
  const t = ctx.t;
  const esc = ctx.esc;
  const since = markerOf(ctx.state, "forum", ctx.role);
  const posts = chat.latestPosts(ctx.state, slice(ctx.state), ctx.role, { lang: ctx.lang });
  const when = (at) =>
    new Date(at).toLocaleString(tag(ctx), {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `<section class="chat-home" aria-labelledby="chat-home-title"><div class="section-heading"><h2 id="chat-home-title">${t("Ultime discussioni", "Latest discussions")}</h2><button type="button" class="button quiet" data-chat-home-forum>${t("Tutte le discussioni", "All discussions")}</button></div><ul class="chat-home-list">${posts
    .map(
      (post) =>
        `<li class="chat-home-row"><div><strong>${esc(post.title)}</strong>${!post.own && since && post.at > since ? ` <span class="badge">${t("Nuovo", "New")}</span>` : ""}<small>${esc(post.authorName)} · ${esc(when(post.at))} · ${esc(post.text)}</small></div><button type="button" class="button" data-chat-home-thread="${esc(post.threadId)}" aria-label="${esc(`${t("Apri", "Open")} ${post.title}`)}">${t("Apri", "Open")}</button></li>`,
    )
    .join("")}</ul></section>`;
}
function bindForumHome(el, ctx) {
  el.querySelector("[data-chat-home-forum]")?.addEventListener("click", () =>
    ctx.navigate("campaign", { tab: "chat-forum" }),
  );
  el.querySelectorAll("[data-chat-home-thread]").forEach((button) =>
    button.addEventListener("click", () =>
      ctx.navigate("campaign", { tab: "chat-forum", id: button.dataset.chatHomeThread }),
    ),
  );
}

// ---------------------------------------------------------------- notifications

function collect(ctx) {
  const role = ctx.role;
  const s = slice(ctx.state);
  const options = unreadOptions(ctx);
  const log = chat
    .unreadItems(ctx.state, s, role, markerOf(ctx.state, "read", role), options)
    .map((item) => {
      const [title, body] = summary(ctx, item);
      return {
        id: "chat-" + item.id,
        title: item.type === "rolls" ? `${ctx.t("Tiro", "Roll")} · ${title}` : title,
        body,
        time: item.at,
        category: "table-log",
        // Opens the Table with the log open (D&D Beyond opens the game log, DDB-153).
        target: { page: "table", params: { tab: LOG_ROUTE_TAB } },
      };
    });
  const posts = chat
    .unreadPosts(ctx.state, s, role, markerOf(ctx.state, "forum", role), ctx.lang)
    .map((post) => ({
      id: "chat-post-" + post.postId,
      title: `${ctx.t("Discussione", "Discussion")} · ${post.title}`,
      body: `${post.authorName}: ${post.text.length > 90 ? post.text.slice(0, 89) + "…" : post.text}`,
      time: post.at,
      category: "campaign-forum",
      target: { page: "campaign", params: { tab: "chat-forum", id: post.threadId } },
    }));
  return [...log, ...posts];
}

// ---------------------------------------------------------------- test seams

/** The composer draft of the current identity (tests and handlers). */
export const composerDraft = (ctx) => draftFor(ctx);
/** Sends the current identity's draft exactly as the Send button does. */
export const sendDraft = (ctx) => send(ctx);
/** Forgets per-viewer memory (drafts, filters, notices); markers are kept. */
export function resetChatView() {
  for (const key of Object.keys(drafts)) delete drafts[key];
  for (const key of Object.keys(replyDrafts)) delete replyDrafts[key];
  Object.assign(ui, {
    filter: "all",
    window: 80,
    stick: true,
    scrollTop: 0,
    open: false,
    rendered: false,
    focus: null,
    focusLogButton: false,
    showHelp: false,
    archive: { query: "", kind: "all", hideWhispers: false },
    routeView: null,
  });
  newestAnnounced = null;
  focusRoot = null;
}
export {
  collect as collectNotifications,
  exportArchive,
  openClear,
  openRemove,
  openShare,
  openVote,
  openSnapshot,
};

// ---------------------------------------------------------------- registration

export function register(registry) {
  area = registry;
  registry.registerStateSlice(ID, {
    version: chat.CHAT_VERSION,
    // Like narrative content, the chat survives gameplay Undo: corrections are explicit
    // (retract, delete with trace, hide) and chat commits are not undoable.
    undo: "preserve",
    seed: () => chat.normalizeChat(chat.seedChat()),
    normalize: (value, fromVersion) => chat.normalizeChat(value, fromVersion),
  });
  registry.registerStyles(new URL("./chat.css", import.meta.url));
  registry.add("table-panel", {
    id: "log",
    replaces: true,
    label: L("Registro", "Log"),
    icon: "chat",
    render: (ctx) => panelHTML(ctx),
    bind: (el, ctx, table) => bindPanel(el, ctx, table),
  });
  registry.add("map-layer", {
    id: "chat-bubbles",
    label: L("Fumetti della chat", "Chat bubbles"),
    order: 66,
    svg: (ctx, tableView) => bubblesSVG(ctx, tableView),
    bind: (el, ctx, table) => afterTableRender(ctx, table),
  });
  registry.add("campaign-section", {
    id: "chat-forum",
    group: "story",
    label: L("Discussioni", "Discussions"),
    order: 45,
    render: (ctx) => forumHTML(ctx),
    bind: (el, ctx) => bindForum(el, ctx),
  });
  registry.add("campaign-section", {
    id: "chat-archive",
    group: "story",
    label: L("Archivio chat", "Chat archive"),
    order: 47,
    render: (ctx) => archiveHTML(ctx),
    bind: (el, ctx) => bindArchive(el, ctx),
  });
  registry.add("home-widget", {
    id: "chat-forum-home",
    label: L("Ultime discussioni", "Latest discussions"),
    order: 36,
    when: (ctx) =>
      isCampaignMember(ctx.state, ctx.state.campaign?.id, ctx.role) &&
      chat.latestPosts(ctx.state, slice(ctx.state), ctx.role).length > 0,
    render: (ctx) => forumHomeHTML(ctx),
    bind: (el, ctx) => bindForumHome(el, ctx),
  });
  registry.add("notifications", {
    id: "chat-unread",
    label: L("Chat e discussioni", "Chat and discussions"),
    collect: (ctx) => collect(ctx),
  });
  registry.add("settings", {
    id: "chat-notices",
    label: L("Registro del Tavolo", "Table log"),
    scope: "personal",
    fields: [
      {
        id: "closed-log",
        label: L(
          "Avvisi di nuovi messaggi e tiri a registro chiuso",
          "Notices of new messages and rolls while the log is closed",
        ),
        type: "boolean",
        default: true,
      },
    ],
  });
  registry.add("search", {
    id: "chat-search",
    label: L("Chat e discussioni", "Chat and discussions"),
    search: (ctx, query) =>
      chat.searchChat(ctx.state, slice(ctx.state), ctx.role, query, projectOptions(ctx)),
  });
  // Final review SV-02: the scene snapshot is found by its name from the search.
  registry.add("command", {
    id: "chat.snapshot",
    label: L("Istantanea della scena nella chat", "Scene snapshot to the chat"),
    group: "chat",
    run: (ctx) => openDialogSafely(ctx, () => openSnapshot(ctx)),
  });
  registry.add("command", {
    id: "chat.archive",
    label: L("Apri l’archivio della chat", "Open the chat archive"),
    group: "chat",
    run: (ctx) => ctx.navigate("campaign", { tab: "chat-archive" }),
  });
  // Shard share-to-chat from a sheet (VTL-158): the spell and item details dialogs call it
  // with {actorId, entryId}; from the palette it opens the picker of the sheet in view.
  const sheetActor = (ctx, entry) =>
    entry?.actorId ?? (ctx.view?.page === "characters" ? ctx.view.id || null : null);
  registry.add("command", {
    id: "chat.share-entry",
    label: L("Condividi nella chat…", "Share to chat…"),
    group: "chat",
    when: (ctx, entry) => canShareFrom(ctx, sheetActor(ctx, entry)),
    run: (ctx, entry) =>
      openShare(ctx, { actorId: sheetActor(ctx, entry), entryId: entry?.entryId ?? null }),
  });
  registry.add("command", {
    id: "chat.forum",
    label: L("Apri le discussioni della campagna", "Open campaign discussions"),
    group: "chat",
    run: (ctx) => ctx.navigate("campaign", { tab: "chat-forum" }),
  });
  // Notices belong to the Table: leaving it takes them away (their button opens the log).
  registry.on("navigate", (payload, { ctx } = {}) => {
    if (payload?.page !== "table") clearToasts();
    // Entering the Table: the badge already reflects what the centre marked read.
    else if (ctx) syncCentreReads(ctx);
  });
  // Notices of one identity never stay on screen for the next one.
  registry.on("role-changed", () => {
    clearToasts();
    ui.open = false;
  });
  registry.on("reset", () => {
    clearToasts();
    resetChatView();
    resetMarkers();
  });
}
