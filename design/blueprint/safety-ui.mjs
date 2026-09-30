// Table safety (B27): rendering and handlers for the campaign section, the personal
// profile page, the Table drawer, the map veil of filtered content, the global signal
// overlay and the pre-session reminder. Domain rules live in safety-domain.mjs.
//
// `api.slice(state)` returns this area's slice (registry.slice in the app). Every action
// goes through perform(), which commits with the right audience:
// - personal profile and filters: {local: true} (private, allowed offline);
// - anonymous signals and unsigned stars/wishes: shared data, audit label private to
//   the sender ({visibility: "private"}), so the log never names who sent them;
// - everything else: shared. All commits are {undoable: false}: gameplay Undo never
//   removes a safety signal or an agreement (slice declared undo: "preserve").

import * as D from "./safety-domain.mjs";
import { campaignMembers, listCampaignEntries } from "./campaign-content.mjs";
import { listPages } from "./journal-plus.mjs";
import { isCampaignActor } from "./character-access.mjs";

const SUBTABS = ["agreements", "play", "after"];

// ---------------------------------------------------------------------------------
// Per-device memory (not shared state): ids this device sent with their withdraw tokens
// (the only proof that allows withdrawing an anonymous signal or entry), banners it
// dismissed and the reminder it already showed. In the demo both identities share one
// browser, so everything is keyed by identity, as if each identity had its own device.

const DEVICE_KEY = "d20-studio-safety-device-v1";
let memoryDevice = {};
function deviceRead() {
  try {
    const storage = globalThis.localStorage;
    if (storage) {
      const value = JSON.parse(storage.getItem(DEVICE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    }
  } catch {
    /* unreadable device memory: start empty */
  }
  return memoryDevice;
}
function deviceWrite(value) {
  memoryDevice = value;
  try {
    globalThis.localStorage?.setItem(DEVICE_KEY, JSON.stringify(value));
  } catch {
    /* device memory is a convenience only */
  }
}
export function deviceIds(kind, role) {
  const list = deviceRead()[kind]?.[role];
  return Array.isArray(list) ? list : [];
}
export function deviceRemember(kind, role, id, token = null) {
  const value = deviceRead();
  value[kind] ??= {};
  value[kind][role] = [...new Set([...(value[kind][role] ?? []), id])].slice(-100);
  if (token) ((value.tokens ??= {})[role] ??= {})[id] = token;
  pruneTokens(value, role);
  deviceWrite(value);
}
export function deviceForget(kind, role, id) {
  const value = deviceRead();
  if (Array.isArray(value[kind]?.[role]))
    value[kind][role] = value[kind][role].filter((entry) => entry !== id);
  pruneTokens(value, role);
  deviceWrite(value);
}
/** Withdraw tokens survive only while their id is in the identity's "sent" or "stars". */
function pruneTokens(value, role) {
  const tokens = value.tokens?.[role];
  if (!tokens) return;
  const live = new Set([...(value.sent?.[role] ?? []), ...(value.stars?.[role] ?? [])]);
  for (const id of Object.keys(tokens)) if (!live.has(id)) delete tokens[id];
}
const deviceToken = (role, id) => deviceRead().tokens?.[role]?.[id] ?? null;
function deviceGet(kind, key) {
  return deviceRead()[kind]?.[key] ?? null;
}
function deviceSet(kind, key, entry) {
  const value = deviceRead();
  value[kind] ??= {};
  value[kind][key] = entry;
  deviceWrite(value);
}

// Map reveals are per visit (like a spoiler): a reload blurs the content again.
const revealed = new Set();
let pendingFocus = null;
let overlayHTML = null;
export function resetSafetyView() {
  clearTimeout(dockTimer);
  xcardSeen.clear();
  revealed.clear();
  pendingFocus = null;
  overlayHTML = null;
  revealDrawer = false;
}
/** "Reset example" also forgets what this device sent, saw or was reminded of. */
export function clearSafetyDevice() {
  deviceWrite({});
}

// ---------------------------------------------------------------------------------
// Small helpers.

const campaignIdOf = (ctx) => ctx.state.campaign?.id ?? null;
const sliceOf = (ctx, api) => api.slice(ctx.state);
const isMember = (ctx) => Boolean(D.memberOf(ctx.state, campaignIdOf(ctx), ctx.role));
const isDm = (ctx) => D.isSafetyDm(ctx.state, campaignIdOf(ctx), ctx.role);
const langTag = (ctx) => (ctx.lang === "it" ? "it-IT" : "en-GB");
function time(ctx, iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(langTag(ctx), { hour: "2-digit", minute: "2-digit" }).format(date);
}
function day(ctx, iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ctx.t("Data non indicata", "Date not specified")
    : new Intl.DateTimeFormat(langTag(ctx), { dateStyle: "medium" }).format(date);
}
export function topicLabel(ctx, entry) {
  return entry?.topic
    ? ctx.label(D.topicById(entry.topic)?.label ?? entry.topic)
    : String(entry?.custom ?? "");
}
function sortTopics(ctx, list) {
  return [...list].sort((a, b) => topicLabel(ctx, a).localeCompare(topicLabel(ctx, b), ctx.lang));
}
export function errorText(ctx, error) {
  return error?.it && error?.en ? ctx.t(error.it, error.en) : String(error?.message ?? error);
}
/** Runs a user action; a refusal becomes an error toast. Returns false on refusal. */
export function attempt(ctx, fn) {
  try {
    return fn() ?? true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
/** "Player · Livia" for a named hand or signed entry; "DM" for the DM. */
export function memberDisplay(ctx, memberId) {
  const member = campaignMembers(ctx.state).find((entry) => entry.id === memberId);
  if (!member) return ctx.t("Persona non più nel gruppo", "Person no longer in the group");
  if (["dm", "co-dm"].includes(member.role)) return "DM";
  const named =
    member.name && member.name !== "Giocatore / Player"
      ? ctx.label(member.name)
      : ctx.t("Giocatore", "Player");
  const character = Object.values(ctx.state.actors ?? {}).find(
    (actor) =>
      actor?.kind === "character" &&
      actor.owner === memberId &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, campaignIdOf(ctx)),
  );
  return character ? `${named} · ${character.name}` : named;
}
const chipList = (ctx, list, empty) =>
  list.length
    ? `<ul class="safety-chips">${sortTopics(ctx, list)
        .map((entry) => `<li class="safety-chip">${ctx.esc(topicLabel(ctx, entry))}</li>`)
        .join("")}</ul>`
    : `<p class="safety-empty">${ctx.esc(empty)}</p>`;
const toolNames = (ctx, ids) =>
  ids
    .map((id) => D.toolById(id))
    .filter(Boolean)
    .map((tool) => ctx.label(tool.label))
    .join(" · ");

// ---------------------------------------------------------------------------------
// Actions (every visible control ends here).

export function perform(ctx, api, action, data = {}) {
  const campaignId = campaignIdOf(ctx);
  const viewer = ctx.role;
  let result;
  const change = (it, en, fn, options = {}) => {
    ctx.commit(
      ctx.t(it, en),
      (draft) => {
        result = fn(draft, api.slice(draft));
      },
      { undoable: false, ...options },
    );
    return result;
  };
  // Offline, the group keeps the version it last received until this device is back
  // online (syncProfile): the edit saves here at once, the combined list waits.
  const personal = (fn) =>
    change(
      "Profilo di sicurezza aggiornato",
      "Safety profile updated",
      (draft, slice) => {
        if (ctx.offline) D.holdProfile(slice, viewer);
        return fn(draft, slice);
      },
      { local: true },
    );
  switch (action) {
    case "add-limit":
      return personal((draft, slice) => D.addLimit(slice, viewer, data.list, data.text));
    case "remove-limit":
      return personal((draft, slice) => D.removeLimit(slice, viewer, data.list, data.id));
    case "release-profile":
      return change(
        "Linee e veli inviati al gruppo",
        "Lines and veils sent to the group",
        (draft, slice) => D.releaseProfile(slice, viewer),
        { local: true },
      );
    case "filter":
      return change(
        "Filtri personali aggiornati",
        "Personal filters updated",
        (draft, slice) => D.setContentFilter(slice, viewer, data),
        { local: true },
      );
    // The sending device remembers the id inside the change, before the shell renders,
    // so its own view (withdraw row, no echo of its own signal) is right at once.
    case "signal":
      return change(
        "Hai inviato un segnale anonimo",
        "You sent an anonymous signal",
        (draft, slice) => {
          const { id, token } = D.sendSignal(draft, slice, campaignId, viewer, data.kind);
          deviceRemember("sent", viewer, id, token);
          return id;
        },
        { visibility: "private" },
      );
    case "withdraw-signal":
      change(
        "Hai ritirato il tuo segnale anonimo",
        "You withdrew your anonymous signal",
        (draft, slice) =>
          D.withdrawSignal(draft, slice, campaignId, viewer, data.id, deviceToken(viewer, data.id)),
        { visibility: "private" },
      );
      deviceForget("sent", viewer, data.id);
      return true;
    case "ack-signal":
      return change(
        "Segnale di sicurezza ricevuto dal DM",
        "Safety signal acknowledged by the DM",
        (draft, slice) => D.acknowledgeSignal(draft, slice, campaignId, viewer, data.id),
      );
    case "raise-hand": {
      const name = memberDisplay(ctx, viewer);
      return change(`${name} ha alzato la mano`, `${name} raised a hand`, (draft, slice) =>
        D.raiseHand(draft, slice, campaignId, viewer),
      );
    }
    case "lower-hand": {
      const name = memberDisplay(ctx, viewer);
      return change(`${name} ha abbassato la mano`, `${name} lowered a hand`, (draft, slice) =>
        D.lowerHand(draft, slice, campaignId, viewer),
      );
    }
    case "give-floor": {
      const hand = D.handQueue(ctx.state, api.slice(ctx.state), campaignId, viewer).find(
        (entry) => entry.id === data.id,
      );
      const name = hand ? memberDisplay(ctx, hand.memberId) : "";
      return change(`La parola a ${name}`, `${name} has the floor`, (draft, slice) =>
        D.giveFloor(draft, slice, campaignId, viewer, data.id),
      );
    }
    case "move-hand":
      return change("Coda per parlare riordinata", "Speaking queue reordered", (draft, slice) =>
        D.moveHand(draft, slice, campaignId, viewer, data.id, data.where),
      );
    case "open-round":
      return change(
        "Stelle e desideri: raccolta aperta",
        "Stars and wishes: collection opened",
        (draft, slice) => D.openRound(draft, slice, campaignId, viewer),
      );
    case "close-round":
      return change(
        "Stelle e desideri: raccolta chiusa",
        "Stars and wishes: collection closed",
        (draft, slice) => D.closeRound(draft, slice, campaignId, viewer, data.id),
      );
    case "star-wish":
      return change(
        data.signed ? "Stelle e desideri inviati" : "Hai inviato stelle e desideri anonimi",
        data.signed ? "Stars and wishes sent" : "You sent anonymous stars and wishes",
        (draft, slice) => {
          const { id, token } = D.addStarWish(draft, slice, campaignId, viewer, data.roundId, data);
          deviceRemember("stars", viewer, id, token);
          return id;
        },
        data.signed ? {} : { visibility: "private" },
      );
    case "withdraw-star":
      change(
        "Hai ritirato stelle e desideri",
        "You withdrew stars and wishes",
        (draft, slice) =>
          D.withdrawStarWish(
            draft,
            slice,
            campaignId,
            viewer,
            data.roundId,
            data.id,
            deviceToken(viewer, data.id),
          ),
        { visibility: "private" },
      );
      deviceForget("stars", viewer, data.id);
      return true;
    case "expectations":
      return change(
        "Aspettative della campagna aggiornate",
        "Campaign expectations updated",
        (draft, slice) => D.saveExpectations(draft, slice, campaignId, viewer, data),
      );
    case "checklist":
      return change(
        "Traccia della sessione zero aggiornata",
        "Session zero outline updated",
        (draft, slice) => D.saveChecklist(draft, slice, campaignId, viewer, data),
      );
    // Generic labels: a mark must not disclose an unrevealed scene through the log.
    case "mark":
      return change("Contenuti marcati aggiornati", "Marked content updated", (draft, slice) =>
        D.markScene(draft, slice, campaignId, viewer, data.sceneId, data.topics),
      );
    case "unmark":
      return change("Contenuti marcati aggiornati", "Marked content updated", (draft, slice) =>
        D.unmarkScene(draft, slice, campaignId, viewer, data.id),
      );
    case "mark-content":
      return change("Contenuti marcati aggiornati", "Marked content updated", (draft, slice) =>
        D.markContent(draft, slice, campaignId, viewer, data.kind, data.targetId, data.topics),
      );
    default:
      throw D.refusal("Azione sconosciuta.", "Unknown action.");
  }
}

// Confirmation copy after a successful action (Alchemy: the sender gets a confirmation).
function confirmSignal(ctx, kind) {
  const texts = {
    stop: [
      "Stop inviato in forma anonima. Il DM lo vede al centro dello schermo; il gruppo riceve l’avviso senza nomi.",
      "Stop sent anonymously. The DM sees it in the middle of the screen; the group is told without names.",
    ],
    pace: [
      "Richiesta di rallentare inviata in forma anonima.",
      "Slow-down request sent anonymously.",
    ],
    go: ["“Continua” inviato in forma anonima.", "“Keep going” sent anonymously."],
  };
  ctx.toast(ctx.t(...texts[kind]));
}

/** Back online and in use: this identity's held profile edits reach the group. */
export function syncProfile(ctx, api) {
  if (!ctx || ctx.offline || !D.profileHeld(sliceOf(ctx, api), ctx.role)) return false;
  if (attempt(ctx, () => perform(ctx, api, "release-profile")) === false) return false;
  ctx.toast(
    ctx.t(
      "Di nuovo in rete: le tue linee e i tuoi veli sono arrivati al gruppo.",
      "Back online: your lines and veils reached the group.",
    ),
  );
  return true;
}

// ---------------------------------------------------------------------------------
// In-play panel (campaign "During play" tab and Table drawer share it).

function signalButtons(ctx, api) {
  const tools = D.enabledTools(sliceOf(ctx, api), campaignIdOf(ctx));
  const card = (kind, cls, title, note) =>
    `<button type="button" class="safety-card ${cls}" data-safety-act="signal" data-kind="${kind}"><strong>${title}</strong><span>${note}</span></button>`;
  const queue = D.handQueue(ctx.state, sliceOf(ctx, api), campaignIdOf(ctx), ctx.role);
  const raised = queue.some((hand) => hand.memberId === ctx.role);
  const cards = [
    tools.includes("stop")
      ? card(
          "stop",
          "is-stop",
          ctx.t("Stop · carta X", "Stop · X-card"),
          ctx.t("Ferma la scena. Anonimo.", "Stops the scene. Anonymous."),
        )
      : "",
    tools.includes("pace")
      ? card(
          "pace",
          "is-pace",
          ctx.t("Rallenta", "Slow down"),
          ctx.t("Meno intensità. Anonimo.", "Less intensity. Anonymous."),
        )
      : "",
    tools.includes("pace")
      ? card(
          "go",
          "is-go",
          ctx.t("Continua", "Keep going"),
          ctx.t("Va tutto bene così. Anonimo.", "All good, go on. Anonymous."),
        )
      : "",
    tools.includes("hand") && !isDm(ctx)
      ? `<button type="button" class="safety-card is-hand ${raised ? "is-raised" : ""}" data-safety-act="${raised ? "lower-hand" : "raise-hand"}" aria-pressed="${raised}"><strong>${raised ? ctx.t("Abbassa la mano", "Lower hand") : ctx.t("Alza la mano", "Raise hand")}</strong><span>${raised ? ctx.t("Sei in coda con il tuo nome.", "You are queued by name.") : ctx.t("Chiedi la parola. Con il tuo nome.", "Ask to speak. With your name.")}</span></button>`
      : "",
  ].join("");
  // The group (not the Stop card) takes focus when the Table drawer opens, so a held or
  // repeated Enter never sends a Stop by accident; Tab reaches Stop next.
  return cards
    ? `<div class="safety-cards" role="group" tabindex="-1" aria-label="${ctx.esc(ctx.t("Segnali di sicurezza", "Safety signals"))}">${cards}</div>`
    : `<p class="safety-empty">${ctx.t("Nessun segnale fra gli strumenti concordati.", "No signals among the agreed tools.")}</p>`;
}
function signalName(ctx, kind) {
  return ctx.label(D.SIGNAL_KINDS[kind]?.label ?? kind);
}
export function renderPlayPanel(ctx, api) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const signals = D.activeSignals(ctx.state, slice, campaignId, ctx.role);
  const mine = new Set(deviceIds("sent", ctx.role));
  const sent = signals.filter((signal) => mine.has(signal.id));
  const queue = D.handQueue(ctx.state, slice, campaignId, ctx.role);
  const dm = isDm(ctx);
  return `<div class="safety-play">
  <p class="safety-lead">${ctx.t("Stop, Rallenta e Continua sono anonimi: nessuno, nemmeno il DM, vede chi li invia. Alza la mano mostra il tuo nome. Il gioco non si blocca.", "Stop, Slow down and Keep going are anonymous: nobody, not even the DM, sees who sends them. Raise hand shows your name. Play is never locked.")}</p>
  ${signalButtons(ctx, api)}
  ${
    sent.length
      ? `<div class="safety-sent" role="status"><h3>${ctx.t("Inviati da questo dispositivo", "Sent from this device")}</h3><p class="safety-note">${ctx.t("Solo tu vedi questa riga.", "Only you see this row.")}</p><ul class="safety-list">${sent
          .map(
            (signal) =>
              `<li><span>${ctx.esc(signalName(ctx, signal.kind))} · ${ctx.esc(time(ctx, signal.at))}</span><button type="button" class="button quiet" data-safety-act="withdraw-signal" data-id="${ctx.esc(signal.id)}">${ctx.t("Ritira", "Withdraw")}</button></li>`,
          )
          .join("")}</ul></div>`
      : ""
  }
  <div class="safety-columns">
    <section aria-labelledby="safety-active-title"><h3 id="safety-active-title">${ctx.t("Segnali attivi", "Active signals")}</h3>${
      signals.length
        ? `<ul class="safety-list">${signals
            .map(
              (signal) =>
                `<li class="safety-signal is-${ctx.esc(signal.kind)}"><span><strong>${ctx.esc(signalName(ctx, signal.kind))}</strong> · ${ctx.esc(time(ctx, signal.at))} · ${ctx.t("anonimo", "anonymous")}</span>${dm ? `<button type="button" class="button" data-safety-act="ack-signal" data-id="${ctx.esc(signal.id)}">${ctx.t("Ricevuto", "Acknowledge")}</button>` : ""}</li>`,
            )
            .join("")}</ul>`
        : `<p class="safety-empty">${ctx.t("Nessun segnale attivo.", "No active signals.")}</p>`
    }</section>
    <section aria-labelledby="safety-queue-title"><h3 id="safety-queue-title">${ctx.t("Coda per parlare", "Speaking queue")}</h3>${
      queue.length
        ? `<ol class="safety-list safety-queue">${queue
            .map(
              (hand, index) =>
                `<li><span><strong>${ctx.esc(memberDisplay(ctx, hand.memberId))}</strong> · ${ctx.esc(time(ctx, hand.at))}</span><span class="safety-row-actions">${
                  dm
                    ? `<button type="button" class="button" data-safety-act="give-floor" data-id="${ctx.esc(hand.id)}">${ctx.t("Dai la parola", "Give the floor")}</button>${index > 0 ? `<button type="button" class="button quiet" data-safety-act="move-hand" data-where="front" data-id="${ctx.esc(hand.id)}">${ctx.t("In testa", "To front")}</button>` : ""}${index < queue.length - 1 ? `<button type="button" class="button quiet" data-safety-act="move-hand" data-where="back" data-id="${ctx.esc(hand.id)}">${ctx.t("In fondo", "To back")}</button>` : ""}`
                    : hand.memberId === ctx.role
                      ? `<button type="button" class="button quiet" data-safety-act="lower-hand">${ctx.t("Abbassa la mano", "Lower hand")}</button>`
                      : ""
                }</span></li>`,
            )
            .join("")}</ol>`
        : `<p class="safety-empty">${ctx.t("Nessuno in coda.", "Nobody in the queue.")}</p>`
    }</section>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------------
// Campaign section: Agreements / During play / Stars and wishes.

function expectationsBlock(ctx, api) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const expectations = D.expectationsFor(ctx.state, slice, campaignId, ctx.role);
  const dm = isDm(ctx);
  const status = expectations
    ? `<p class="safety-status"><span class="badge">${expectations.shared ? ctx.t("Condivise con il gruppo", "Shared with the group") : ctx.t("Bozza visibile solo al DM", "Draft visible to the DM only")}</span>${expectations.shared ? `<span class="badge">${expectations.remind ? ctx.t("Ricordate prima di ogni sessione", "Reminded before each session") : ctx.t("Nessun promemoria", "No reminder")}</span>` : ""}</p>`
    : "";
  const body = expectations
    ? `<dl class="safety-sheet">
      <div><dt>${ctx.t("Tono e stile", "Tone and style")}</dt><dd>${ctx.esc(expectations.tone || ctx.t("Non indicato", "Not specified"))}</dd></div>
      <div><dt>${ctx.t("Si può parlare di", "Can be discussed")}</dt><dd>${ctx.esc(expectations.welcome || ctx.t("Non indicato", "Not specified"))}</dd></div>
      <div><dt>${ctx.t("Limiti rigidi della campagna", "Campaign hard limits")}</dt><dd>${chipList(ctx, expectations.lines, ctx.t("Nessuno", "None"))}</dd></div>
      <div><dt>${ctx.t("Limiti morbidi della campagna", "Campaign soft limits")}</dt><dd>${chipList(ctx, expectations.veils, ctx.t("Nessuno", "None"))}</dd></div>
      <div><dt>${ctx.t("Avvisi di contenuto", "Content warnings")}</dt><dd>${chipList(ctx, expectations.warnings, ctx.t("Nessuno", "None"))}</dd></div>
      <div><dt>${ctx.t("Avvisi per la prossima sessione", "Next session warnings")}</dt><dd>${ctx.esc(expectations.sessionWarnings || ctx.t("Nessuno", "None"))}</dd></div>
      <div><dt>${ctx.t("Strumenti in uso", "Tools in use")}</dt><dd>${ctx.esc(toolNames(ctx, expectations.tools) || ctx.t("Nessuno", "None"))}</dd></div>
    </dl>`
    : `<p class="safety-empty">${ctx.t("Il DM non ha ancora condiviso le aspettative della campagna.", "The DM has not shared the campaign expectations yet.")}</p>`;
  return `<section class="safety-block" aria-labelledby="safety-expectations-title"><div class="safety-block-heading"><h2 id="safety-expectations-title">${ctx.t("Aspettative della campagna", "Campaign expectations")}</h2>${dm ? `<button type="button" class="button" data-safety-dialog="expectations">${ctx.t("Modifica aspettative", "Edit expectations")}</button>` : ""}</div>${status}${body}</section>`;
}
function checklistBlock(ctx, api) {
  const checklist = D.checklistFor(ctx.state, sliceOf(ctx, api), campaignIdOf(ctx), ctx.role);
  if (!checklist) return "";
  const done = D.SESSION_ZERO_ITEMS.filter((item) => checklist[item.id]?.done).length;
  return `<section class="safety-block" aria-labelledby="safety-zero-title"><div class="safety-block-heading"><h2 id="safety-zero-title">${ctx.t("Sessione zero · traccia facoltativa", "Session zero · optional outline")}</h2>${isDm(ctx) ? `<button type="button" class="button" data-safety-dialog="checklist">${ctx.t("Aggiorna traccia", "Update outline")}</button>` : ""}</div><p class="safety-note">${ctx.t(`Si compila solo ciò che serve · ${done} di ${D.SESSION_ZERO_ITEMS.length} argomenti discussi`, `Fill in only what helps · ${done} of ${D.SESSION_ZERO_ITEMS.length} topics discussed`)}</p><ul class="safety-checklist">${D.SESSION_ZERO_ITEMS.map(
    (item) => {
      const row = checklist[item.id];
      return `<li class="${row?.done ? "is-done" : ""}"><span class="safety-check" aria-hidden="true">${row?.done ? "✓" : ""}</span><span><strong>${ctx.esc(ctx.label(item.label))}</strong><span class="safety-sr"> · ${row?.done ? ctx.t("discusso", "discussed") : ctx.t("da discutere", "not discussed")}</span>${row?.note ? `<br><span class="safety-note">${ctx.esc(row.note)}</span>` : ""}</span></li>`;
    },
  ).join("")}</ul></section>`;
}
function marksBlock(ctx, api) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const marks = D.marksFor(ctx.state, slice, campaignId, ctx.role);
  const profile = D.profileOf(slice, ctx.role);
  const dm = isDm(ctx);
  return `<section class="safety-block" aria-labelledby="safety-marks-title"><div class="safety-block-heading"><h2 id="safety-marks-title">${ctx.t("Contenuti marcati", "Marked content")}</h2>${dm ? `<span class="safety-row-actions"><button type="button" class="button" data-safety-dialog="mark">${ctx.t("Marca una mappa", "Mark a map")}</button>${handoutsOf(ctx).length ? `<button type="button" class="button" data-safety-dialog="mark-handout">${ctx.t("Marca una dispensa", "Mark a handout")}</button>` : ""}${entriesOf(ctx).length ? `<button type="button" class="button" data-safety-dialog="mark-entry">${ctx.t("Marca una voce", "Mark an entry")}</button>` : ""}</span>` : ""}</div><p class="safety-note">${ctx.t("Chi attiva il filtro personale vede sfumate le mappe, le dispense, le voci del Mondo e del Diario e le pagine dell’Archivio marcate con i propri argomenti, con il comando “Mostra”.", "Anyone who turns on the personal filter sees maps, handouts, World and Journal entries and Archive pages marked with their topics blurred, with a “Show” command.")} <strong>${profile.filter.enabled ? ctx.t("Il tuo filtro è attivo.", "Your filter is on.") : ctx.t("Il tuo filtro è spento.", "Your filter is off.")}</strong></p>${
    marks.length
      ? `<ul class="safety-list">${marks
          .map((mark) => {
            const filtered = D.filteredTopics(
              ctx.state,
              slice,
              campaignId,
              ctx.role,
              mark.sceneId,
            ).topics;
            return `<li><span><strong>${ctx.esc(mark.sceneName)}</strong>${chipList(ctx, mark.topics, "")}<span class="safety-note">${filtered.length ? ctx.t("Sfumata per te", "Blurred for you") : ctx.t("Non sfumata per te", "Not blurred for you")}</span></span>${dm ? `<span class="safety-row-actions"><button type="button" class="button quiet" data-safety-dialog="mark" data-scene="${ctx.esc(mark.sceneId)}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="button quiet" data-safety-act="unmark" data-id="${ctx.esc(mark.id)}">${ctx.t("Togli marcatura", "Remove mark")}</button></span>` : ""}</li>`;
          })
          .join("")}</ul>`
      : `<p class="safety-empty">${ctx.t("Nessuna mappa marcata.", "No marked maps.")}</p>`
  }${contentMarksList(ctx, api)}<button type="button" class="button quiet" data-safety-go="profile">${ctx.t("Filtri nel mio profilo", "Filters in my profile")}</button></section>`;
}
// R7 H-05: World and Journal entries of the campaign in play this viewer can read (the DM
// marks them; a player sees only the marks of entries they read). R8 hand-off: the Archive's
// pages too, marked with the same kind "entry" (journal-plus veils them; ids never collide).
const ENTRY_KINDS = ["world", "recap", "quest"];
function entriesOf(ctx) {
  let entries = [];
  try {
    entries = listCampaignEntries(ctx.state, { campaignId: campaignIdOf(ctx) }, ctx.role).filter(
      (entry) => ENTRY_KINDS.includes(entry.kind),
    );
  } catch {
    entries = [];
  }
  let pages = [];
  try {
    pages = listPages(ctx.state, ctx.role).map((page) => ({
      id: page.id,
      kind: "page",
      data: { title: page.title },
    }));
  } catch {
    pages = [];
  }
  return [...entries, ...pages];
}
const entryTitle = (ctx, entry) =>
  entry.kind === "page"
    ? `${ctx.t("Archivio", "Archive")} · ${entry.data?.title ?? ""}`
    : entry.data?.title ||
      (entry.kind === "recap"
        ? ctx.t("Resoconto senza titolo", "Untitled recap")
        : ctx.t("Voce senza titolo", "Untitled entry"));
// Handouts of the campaign in play (the handouts area's own data) the DM can mark.
function handoutsOf(ctx) {
  const list = ctx.state.ext?.handouts?.materials;
  return Array.isArray(list) ? list.filter((row) => row && typeof row.id === "string") : [];
}
function contentMarksList(ctx, api) {
  return handoutMarksList(ctx, api) + entryMarksList(ctx, api);
}
function entryMarksList(ctx, api) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const dm = isDm(ctx);
  const entries = entriesOf(ctx);
  const rows = (D.campaignData(slice, campaignId).contentMarks ?? [])
    .filter((mark) => mark.kind === "entry")
    .map((mark) => ({ mark, entry: entries.find((row) => row.id === mark.targetId) }))
    .filter(({ entry }) => entry);
  return rows.length
    ? `<h3>${ctx.t("Voci marcate", "Marked entries")}</h3><ul class="safety-list">${rows
        .map(({ mark, entry }) => {
          const veiled = D.filterFor(ctx.state, ctx.role).topicsFor("entry", mark.targetId).topics
            .length;
          return `<li><span><strong>${ctx.esc(entryTitle(ctx, entry))}</strong>${chipList(ctx, mark.topics, "")}<span class="safety-note">${veiled ? ctx.t("Sfumata per te", "Blurred for you") : ctx.t("Non sfumata per te", "Not blurred for you")}</span></span>${dm ? `<span class="safety-row-actions"><button type="button" class="button quiet" data-safety-dialog="mark-entry" data-target="${ctx.esc(mark.targetId)}">${ctx.t("Modifica", "Edit")}</button></span>` : ""}</li>`;
        })
        .join("")}</ul>`
    : "";
}
function handoutMarksList(ctx, api) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const dm = isDm(ctx);
  const rows = (D.campaignData(slice, campaignId).contentMarks ?? [])
    .filter((mark) => (mark.kind ?? "handout") === "handout")
    .map((mark) => ({ mark, material: handoutsOf(ctx).find((row) => row.id === mark.targetId) }))
    .filter(({ material }) => material && (dm || material.access?.mode !== "dm"));
  return rows.length
    ? `<h3>${ctx.t("Dispense marcate", "Marked handouts")}</h3><ul class="safety-list">${rows
        .map(({ mark, material }) => {
          const veiled = D.filterFor(ctx.state, ctx.role).topicsFor("handout", mark.targetId).topics
            .length;
          return `<li><span><strong>${ctx.esc(material.title ?? mark.targetId)}</strong>${chipList(ctx, mark.topics, "")}<span class="safety-note">${veiled ? ctx.t("Sfumata per te", "Blurred for you") : ctx.t("Non sfumata per te", "Not blurred for you")}</span></span>${dm ? `<span class="safety-row-actions"><button type="button" class="button quiet" data-safety-dialog="mark-handout" data-target="${ctx.esc(mark.targetId)}">${ctx.t("Modifica", "Edit")}</button></span>` : ""}</li>`;
        })
        .join("")}</ul>`
    : "";
}
function agreementsTab(ctx, api) {
  const combined = D.combinedLimits(ctx.state, sliceOf(ctx, api), campaignIdOf(ctx));
  return `<section class="safety-block" aria-labelledby="safety-group-title"><div class="safety-block-heading"><h2 id="safety-group-title">${ctx.t("Linee e veli del gruppo", "The group’s lines and veils")}</h2><button type="button" class="button" data-safety-go="profile">${ctx.t("Aggiungi o modifica le mie", "Add or edit mine")}</button></div><p class="safety-note">${ctx.t("Elenco combinato dei profili di tutti i membri, senza nomi. Ognuno modifica solo i propri, che valgono in ogni campagna.", "Combined list from every member’s profile, without names. Everyone edits only their own, which apply in every campaign.")}</p><div class="safety-columns" data-safety-combined><div><h3>${ctx.t("Linee · non entrano nel gioco", "Lines · never in the game")}</h3>${chipList(ctx, combined.lines, ctx.t("Nessuna linea.", "No lines."))}</div><div><h3>${ctx.t("Veli · restano fuori scena", "Veils · kept off-screen")}</h3>${chipList(ctx, combined.veils, ctx.t("Nessun velo.", "No veils."))}</div></div></section>${expectationsBlock(ctx, api)}${checklistBlock(ctx, api)}${marksBlock(ctx, api)}`;
}
function afterTab(ctx, api) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const rounds = D.roundsFor(ctx.state, slice, campaignId, ctx.role).reverse();
  const open = rounds.find((round) => !round.closedAt);
  const mine = new Set(deviceIds("stars", ctx.role));
  const dm = isDm(ctx);
  const tools = D.enabledTools(slice, campaignId);
  const commands = [
    dm && !open && tools.includes("stars")
      ? `<button type="button" class="button primary" data-safety-act="open-round">${ctx.t("Chiedi stelle e desideri", "Ask for stars and wishes")}</button>`
      : "",
    dm && open
      ? `<button type="button" class="button" data-safety-act="close-round" data-id="${ctx.esc(open.id)}">${ctx.t("Chiudi la raccolta", "Close the collection")}</button>`
      : "",
    open
      ? `<button type="button" class="button ${dm ? "" : "primary"}" data-safety-dialog="star-wish" data-round="${ctx.esc(open.id)}">${ctx.t("Scrivi stelle e desideri", "Write stars and wishes")}</button>`
      : "",
  ].join("");
  return `<section class="safety-block" aria-labelledby="safety-stars-title"><div class="safety-block-heading"><h2 id="safety-stars-title">${ctx.t("Stelle e desideri", "Stars and wishes")}</h2><div class="safety-row-actions">${commands}</div></div><p class="safety-note">${ctx.t("Facoltativi, a fine sessione: una stella per ciò che ti è piaciuto, un desiderio per la prossima volta. Anonimi, a meno che tu scelga di firmare.", "Optional, at the end of a session: a star for what you enjoyed, a wish for next time. Anonymous unless you choose to sign.")}</p>${
    rounds.length
      ? rounds
          .map(
            (round) =>
              `<article class="safety-round"><h3>${ctx.esc(day(ctx, round.openedAt))} · ${round.closedAt ? ctx.t("raccolta chiusa", "collection closed") : ctx.t("raccolta aperta", "collection open")}</h3>${
                round.entries.length
                  ? `<ul class="safety-list">${round.entries
                      .map(
                        (entry) =>
                          `<li class="safety-star-entry"><span>${entry.star ? `<span class="safety-star"><strong>${ctx.t("Stella", "Star")}:</strong> ${ctx.esc(entry.star)}</span>` : ""}${entry.wish ? `<span class="safety-wish"><strong>${ctx.t("Desiderio", "Wish")}:</strong> ${ctx.esc(entry.wish)}</span>` : ""}<span class="safety-note">${entry.signedBy ? ctx.esc(memberDisplay(ctx, entry.signedBy)) : ctx.t("Anonimo", "Anonymous")}${mine.has(entry.id) ? ` · ${ctx.t("inviato da questo dispositivo", "sent from this device")}` : ""}</span></span>${!round.closedAt && mine.has(entry.id) ? `<button type="button" class="button quiet" data-safety-act="withdraw-star" data-round="${ctx.esc(round.id)}" data-id="${ctx.esc(entry.id)}">${ctx.t("Ritira", "Withdraw")}</button>` : ""}</li>`,
                      )
                      .join("")}</ul>`
                  : `<p class="safety-empty">${ctx.t("Ancora nessuna risposta. Rispondere è facoltativo.", "No answers yet. Answering is optional.")}</p>`
              }</article>`,
          )
          .join("")
      : `<p class="safety-empty">${ctx.t("Nessuna raccolta finora.", "No collections so far.")}</p>`
  }</section>`;
}
export function renderCampaignSafety(ctx, api) {
  if (!isMember(ctx))
    return `<p class="safety-empty">${ctx.t("Sezione riservata ai membri della campagna.", "This section is for campaign members.")}</p>`;
  const tab = SUBTABS.includes(ctx.view.id) ? ctx.view.id : "agreements";
  const tabs = [
    ["agreements", ctx.t("Accordi", "Agreements")],
    ["play", ctx.t("Durante il gioco", "During play")],
    ["after", ctx.t("Stelle e desideri", "Stars and wishes")],
  ];
  return `<div class="safety-section">
  <header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.t("Sicurezza del tavolo", "Table safety")}</h1><p class="muted">${ctx.esc(ctx.label(ctx.state.campaign?.name))} · ${ctx.t("prima, durante e dopo la sessione", "before, during and after the session")}</p></div><button type="button" class="button" data-safety-go="profile">${ctx.t("Il mio profilo di sicurezza", "My safety profile")}</button></header>
  <nav class="tabs safety-tabs" aria-label="${ctx.esc(ctx.t("Parti della sicurezza", "Safety parts"))}">${tabs
    .map(
      ([id, name]) =>
        `<button type="button" class="${id === tab ? "active" : ""}" data-safety-tab="${id}" ${id === tab ? 'aria-current="page"' : ""}>${ctx.esc(name)}</button>`,
    )
    .join("")}</nav>
  ${tab === "play" ? `<section class="safety-block" aria-labelledby="safety-play-title"><h2 id="safety-play-title">${ctx.t("Durante il gioco", "During play")}</h2>${renderPlayPanel(ctx, api)}</section>` : tab === "after" ? afterTab(ctx, api) : agreementsTab(ctx, api)}
</div>`;
}

// ---------------------------------------------------------------------------------
// Personal profile page (Alchemy: Profile → Safety): lines, veils, content filters.

function limitList(ctx, api, list) {
  const profile = D.profileOf(sliceOf(ctx, api), ctx.role);
  const names =
    list === "lines"
      ? {
          title: ctx.t("Linee", "Lines"),
          help: ctx.t(
            "Argomenti che non devono entrare nel gioco.",
            "Topics that must never enter the game.",
          ),
          add: ctx.t("Aggiungi linea", "Add line"),
          field: ctx.t("Nuova linea", "New line"),
          empty: ctx.t("Nessuna linea.", "No lines."),
          remove: (name) => ctx.t(`Togli ${name} dalle linee`, `Remove ${name} from lines`),
        }
      : {
          title: ctx.t("Veli", "Veils"),
          help: ctx.t(
            "Argomenti che possono esistere, ma fuori scena.",
            "Topics that may exist, but off-screen.",
          ),
          add: ctx.t("Aggiungi velo", "Add veil"),
          field: ctx.t("Nuovo velo", "New veil"),
          empty: ctx.t("Nessun velo.", "No veils."),
          remove: (name) => ctx.t(`Togli ${name} dai veli`, `Remove ${name} from veils`),
        };
  const entries = sortTopics(ctx, profile[list]);
  return `<section class="panel safety-limit" aria-labelledby="safety-${list}-title"><h2 id="safety-${list}-title">${names.title}</h2><p class="safety-note">${names.help}</p>${
    entries.length
      ? `<ul class="safety-chips" data-safety-own="${list}">${entries
          .map(
            (entry) =>
              `<li class="safety-chip">${ctx.esc(topicLabel(ctx, entry))}<button type="button" class="safety-chip-remove" data-safety-act="remove-limit" data-list="${list}" data-id="${ctx.esc(entry.id)}" aria-label="${ctx.esc(names.remove(topicLabel(ctx, entry)))}">×</button></li>`,
          )
          .join("")}</ul>`
      : `<p class="safety-empty">${names.empty}</p>`
  }<form class="safety-add" data-safety-add="${list}"><label class="field">${names.field}<input name="topic" list="safety-topic-list" maxlength="${D.TOPIC_MAX}" autocomplete="off" data-safety-input="${list}" placeholder="${ctx.esc(ctx.t("Scegli o scrivi un argomento", "Choose or type a topic"))}"></label><button type="submit" class="button" data-safety-act="add-limit" data-list="${list}">${names.add}</button></form></section>`;
}
export function renderProfilePage(ctx, api) {
  const slice = sliceOf(ctx, api);
  const profile = D.profileOf(slice, ctx.role);
  const member = isMember(ctx);
  return `<section class="safety-page">
  <div class="page-heading"><div><p class="muted">${ctx.t("Il mio profilo", "My profile")}</p><h1 tabindex="-1" data-safety-heading>${ctx.t("Sicurezza", "Safety")}</h1><p>${ctx.t("Linee e veli valgono per ogni campagna a cui partecipi. Il gruppo vede un elenco combinato, senza il tuo nome. Solo tu vedi questa pagina.", "Lines and veils apply to every campaign you join. The group sees a combined list, without your name. Only you see this page.")}</p>${ctx.offline ? `<p class="safety-note" role="status">${D.profileHeld(slice, ctx.role) ? ctx.t("Senza rete: le modifiche sono salvate su questo dispositivo e arrivano al gruppo quando torni in rete. Fino ad allora il gruppo vede le tue linee e i tuoi veli di prima.", "Offline: your changes are saved on this device and reach the group when you are back online. Until then the group sees your previous lines and veils.") : ctx.t("Senza rete: le modifiche si salvano su questo dispositivo e arrivano al gruppo quando torni in rete.", "Offline: changes are saved on this device and reach the group when you are back online.")}</p>` : ""}</div><button type="button" class="button quiet" data-safety-back>${ctx.t("Torna indietro", "Go back")}</button></div>
  <div class="safety-profile-grid">${limitList(ctx, api, "lines")}${limitList(ctx, api, "veils")}</div>
  <datalist id="safety-topic-list">${D.SAFETY_TOPICS.map((topic) => `<option value="${ctx.esc(ctx.label(topic.label))}"></option>`).join("")}</datalist>
  <section class="panel safety-filter" aria-labelledby="safety-filter-title"><h2 id="safety-filter-title">${ctx.t("Filtri personali", "Personal filters")}</h2><p class="safety-note">${ctx.t("Mappe, dispense e voci che il DM marca con questi argomenti ti appaiono sfumate, con “Mostra”; le immagini in chat possono partire sfumate; le parolacce diventano asterischi. Vale solo per te.", "Maps, handouts and entries the DM marks with these topics appear blurred to you, with “Show”; pictures in chat can start blurred; swear words become asterisks. It applies to you only.")}</p>
    <label class="safety-switch"><input type="checkbox" data-safety-filter="enabled" ${profile.filter.enabled ? "checked" : ""}><span>${ctx.t("Attiva il mio filtro dei contenuti", "Turn on my content filter")}</span></label>${profile.filter.enabled ? "" : `<p class="safety-note" id="safety-filter-off-why">${ctx.t("Il filtro è spento. Accendi «Attiva il mio filtro dei contenuti» qui sopra per scegliere cosa sfumare.", "The filter is off. Turn on “Turn on my content filter” above to choose what to blur.")}</p>`}
    <fieldset class="safety-extra" ${profile.filter.enabled ? "" : 'disabled aria-describedby="safety-filter-off-why"'}><legend>${ctx.t("Sfuma", "Blur")}</legend>${D.SAFETY_TOPICS.map(
      (topic) => {
        // CA-68: the viewer's own lines and veils are always part of the filter.
        const own = [...profile.lines, ...profile.veils].some((entry) => entry.topic === topic.id);
        return `<label class="safety-check-option ${own ? "is-own" : ""}"><input type="checkbox" data-safety-filter="extra" value="${ctx.esc(topic.id)}" ${own || profile.filter.extra.includes(topic.id) ? "checked" : ""} ${own ? 'disabled data-safety-own-topic="" aria-describedby="safety-own-why"' : ""}><span>${ctx.esc(ctx.label(topic.label))}${own ? ` <small>${ctx.t("· dalla tua linea o velo", "· from your line or veil")}</small>` : ""}</span></label>`;
      },
    ).join("")}${[...profile.lines, ...profile.veils]
      .filter((entry) => entry.custom)
      .map(
        (entry) =>
          `<label class="safety-check-option is-own"><input type="checkbox" checked disabled aria-describedby="safety-own-why"><span>${ctx.esc(entry.custom)} <small>${ctx.t("· dalla tua linea o velo", "· from your line or veil")}</small></span></label>`,
      )
      .join(
        "",
      )}${[...profile.lines, ...profile.veils].length ? `<p class="safety-note" id="safety-own-why">${ctx.t("Gli argomenti delle tue linee e dei tuoi veli sono sempre nel filtro. Per toglierne uno modifica le linee o i veli qui sopra.", "The topics of your lines and veils are always in the filter. To remove one, edit the lines or veils above.")}</p>` : ""}</fieldset>
    <label class="safety-switch"><input type="checkbox" data-safety-filter="images" ${profile.filter.images ? "checked" : ""} ${profile.filter.enabled ? "" : 'disabled aria-describedby="safety-filter-off-why"'}><span>${ctx.t("Sfuma le immagini condivise in chat finché non tocco “Mostra”", "Blur pictures shared in chat until I tap “Show”")}</span></label>
    <label class="safety-switch"><input type="checkbox" data-safety-filter="profanity" ${profile.filter.profanity ? "checked" : ""} ${profile.filter.enabled ? "" : 'disabled aria-describedby="safety-filter-off-why"'}><span>${ctx.t("Filtro delle parolacce in chat e nelle dispense", "Swear-word filter in chat and handouts")}</span></label>
  </section>
  ${
    member
      ? `<section class="safety-where" aria-labelledby="safety-where-title"><h2 id="safety-where-title">${ctx.t("Dove si applica", "Where it applies")}</h2><p>${ctx.esc(ctx.label(ctx.state.campaign?.name))}</p><button type="button" class="button" data-safety-go="campaign">${ctx.t("Vedi l’elenco combinato della campagna", "See the campaign’s combined list")}</button></section>`
      : `<p class="safety-note">${ctx.t("Non partecipi ancora a una campagna: il profilo si applicherà alla prima a cui ti unirai.", "You are not in a campaign yet: the profile will apply to the first one you join.")}</p>`
  }
</section>`;
}

// ---------------------------------------------------------------------------------
// Table drawer: signals and queue within reach, plus the table's agreements.

export function renderTableDrawer(ctx, api, tableView) {
  if (!isMember(ctx))
    return `<p class="safety-empty">${ctx.t("Disponibile ai membri della campagna.", "Available to campaign members.")}</p>`;
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  const combined = D.combinedLimits(ctx.state, slice, campaignId);
  const expectations = D.expectationsFor(ctx.state, slice, campaignId, ctx.role);
  const open = D.openRoundOf(slice, campaignId);
  const dm = isDm(ctx);
  const tools = D.enabledTools(slice, campaignId);
  const scene = tableView?.scene;
  const mark = scene
    ? D.marksFor(ctx.state, slice, campaignId, ctx.role).find((m) => m.sceneId === scene.id)
    : null;
  return `<div class="safety-drawer">
  <div class="safety-drawer-main">${renderPlayPanel(ctx, api)}</div>
  <aside class="safety-drawer-side" aria-label="${ctx.esc(ctx.t("Accordi del tavolo", "Table agreements"))}">
    <h3>${ctx.t("Accordi del tavolo", "Table agreements")}</h3>
    <p class="safety-note">${ctx.t("Linee (mai in gioco)", "Lines (never in play)")}</p>${chipList(
      ctx,
      [...combined.lines, ...(expectations?.lines ?? [])].filter(
        (entry, index, all) =>
          all.findIndex((other) => D.topicKey(other) === D.topicKey(entry)) === index,
      ),
      ctx.t("Nessuna.", "None."),
    )}
    <p class="safety-note">${ctx.t("Veli (fuori scena)", "Veils (off-screen)")}</p>${chipList(
      ctx,
      [...combined.veils, ...(expectations?.veils ?? [])].filter(
        (entry, index, all) =>
          all.findIndex((other) => D.topicKey(other) === D.topicKey(entry)) === index,
      ),
      ctx.t("Nessuno.", "None."),
    )}
    ${
      mark
        ? `<p class="safety-note">${ctx.t("Questa mappa è marcata", "This map is marked")}: ${ctx.esc(
            sortTopics(ctx, mark.topics)
              .map((entry) => topicLabel(ctx, entry))
              .join(", "),
          )}</p>`
        : ""
    }
    <div class="safety-row-actions">
      <button type="button" class="button quiet" data-safety-go="profile">${ctx.t("Il mio profilo di sicurezza", "My safety profile")}</button>
      <button type="button" class="button quiet" data-safety-go="campaign">${ctx.t("Accordi della campagna", "Campaign agreements")}</button>
      ${dm && !open && tools.includes("stars") ? `<button type="button" class="button" data-safety-act="open-round">${ctx.t("Chiedi stelle e desideri", "Ask for stars and wishes")}</button>` : ""}
      ${dm && open ? `<button type="button" class="button" data-safety-act="close-round" data-id="${ctx.esc(open.id)}">${ctx.t("Chiudi la raccolta", "Close the collection")}</button>` : ""}
      ${open ? `<button type="button" class="button" data-safety-dialog="star-wish" data-round="${ctx.esc(open.id)}">${ctx.t("Scrivi stelle e desideri", "Write stars and wishes")}</button>` : ""}
    </div>
  </aside>
</div>`;
}

// ---------------------------------------------------------------------------------
// Map veil (map-layer above tokens): blurred base art via CSS :has(), card with "Show".

export function renderVeil(ctx, api, tableView) {
  const scene = tableView?.scene;
  if (!scene || !isMember(ctx)) return "";
  const campaignId = campaignIdOf(ctx);
  const result = D.filteredTopics(ctx.state, sliceOf(ctx, api), campaignId, ctx.role, scene.id);
  if (!result.topics.length) return "";
  const key = `${ctx.role}:${campaignId}:${scene.id}:${result.revision}`;
  const names = sortTopics(ctx, result.topics).map((entry) => topicLabel(ctx, entry));
  const shown = names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
  const width = Number(scene.width) || 1000;
  const x = (tableView.pan?.x ?? 0) + width / (tableView.zoom || 1) / 2;
  const y = tableView.pan?.y ?? 0;
  if (revealed.has(key))
    return `<g class="safety-veil-shown" data-safety-veil-shown transform="translate(${x} ${y})"><g data-safety-veil-card><rect x="-120" y="10" width="240" height="52" rx="10" class="safety-veil-bg"/><g role="button" tabindex="0" class="safety-veil-button" data-safety-veil-act="hide" data-key="${ctx.esc(key)}" aria-label="${ctx.esc(ctx.t("Sfuma di nuovo la mappa", "Blur the map again"))}"><rect x="-112" y="16" width="224" height="40" rx="8"/><text x="0" y="41" text-anchor="middle">${ctx.esc(ctx.t("Sfuma di nuovo", "Blur again"))}</text></g></g></g>`;
  return `<g class="safety-veil" data-safety-veil transform="translate(${x} ${y})"><g data-safety-veil-card><rect x="-150" y="10" width="300" height="122" rx="12" class="safety-veil-bg"/><text x="0" y="38" text-anchor="middle" class="safety-veil-title">${ctx.esc(ctx.t("Mappa sfumata dal tuo filtro", "Map blurred by your filter"))}</text><text x="0" y="62" text-anchor="middle" class="safety-veil-topics">${ctx.esc(shown)}</text><g role="button" tabindex="0" class="safety-veil-button" data-safety-veil-act="show" data-key="${ctx.esc(key)}" aria-label="${ctx.esc(ctx.t(`Mostra la mappa (${names.join(", ")})`, `Show the map (${names.join(", ")})`))}"><rect x="-60" y="78" width="120" height="44" rx="8"/><text x="0" y="106" text-anchor="middle">${ctx.esc(ctx.t("Mostra", "Show"))}</text></g></g></g>`;
}
export function bindVeil(el, ctx, table) {
  // Constant on-screen size: one card unit is one CSS pixel whatever the map zoom.
  const matrix = table?.svg?.getScreenCTM?.();
  const scale = matrix && matrix.a > 0 ? 1 / matrix.a : 1;
  el.querySelectorAll?.("[data-safety-veil-card]").forEach((card) =>
    card.setAttribute("transform", `scale(${scale})`),
  );
  el.querySelectorAll?.("[data-safety-veil-act]").forEach((button) => {
    const act = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = button.dataset.key;
      if (button.dataset.safetyVeilAct === "show") revealed.add(key);
      else revealed.delete(key);
      pendingFocus = "[data-safety-veil-act]";
      ctx.render();
    };
    button.addEventListener("click", act);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") act(event);
    });
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
  });
  if (pendingFocus === "[data-safety-veil-act]") {
    pendingFocus = null;
    el.querySelector?.("[data-safety-veil-act]")?.focus?.({ preventScroll: true });
  }
}

// ---------------------------------------------------------------------------------
// Dialogs (native form dialog of the shell).

const topicChecks = (ctx, name, selected) =>
  `<div class="safety-topic-grid">${D.SAFETY_TOPICS.map(
    (topic) =>
      `<label class="safety-check-option"><input type="checkbox" name="${name}" value="${ctx.esc(topic.id)}" ${selected.some((entry) => entry.topic === topic.id) ? "checked" : ""}><span>${ctx.esc(ctx.label(topic.label))}</span></label>`,
  ).join(
    "",
  )}</div><label class="field">${ctx.t("Altri (separati da virgola)", "Others (comma separated)")}<input name="${name}-custom" maxlength="400" value="${ctx.esc(
    selected
      .filter((entry) => entry.custom)
      .map((entry) => entry.custom)
      .join(", "),
  )}"></label>`;
/** What saving does to the chosen map: a new mark, or a replacement of its current one. */
// `handout`: true for a handout, "entry" for a World or Journal entry, false for a map.
function markState(ctx, topics, handout = false) {
  const [it, en] =
    handout === "entry"
      ? ["Questa voce", "This entry"]
      : handout
        ? ["Questa dispensa", "This handout"]
        : ["Questa mappa", "This map"];
  return topics.length
    ? ctx.t(
        `${it} è già marcata: ${topics.map((entry) => topicLabel(ctx, entry)).join(", ")}. Salvando sostituisci la marcatura.`,
        `${en} is already marked: ${topics.map((entry) => topicLabel(ctx, entry)).join(", ")}. Saving replaces the mark.`,
      )
    : ctx.t(`${it} non è ancora marcata.`, `${en} is not marked yet.`);
}
/** Fills a topic fieldset (checkboxes and the "Others" field) from a stored topic list. */
export function fillTopicChecks(form, name, topics) {
  for (const input of form.querySelectorAll(`input[name="${name}"]`))
    input.checked = topics.some((entry) => entry.topic === input.value);
  const custom = form.querySelector(`input[name="${name}-custom"]`);
  if (custom)
    custom.value = topics
      .filter((entry) => entry.custom)
      .map((entry) => entry.custom)
      .join(", ");
}
export function bindMarkForm(form, ctx, topicsOf, handout = false) {
  const select = form.querySelector("[data-safety-mark-scene]");
  if (!select) return;
  select.addEventListener("change", () => {
    const topics = topicsOf(select.value);
    fillTopicChecks(form, "topics", topics);
    const status = form.querySelector("[data-safety-mark-state]");
    if (status) status.textContent = markState(ctx, topics, handout);
  });
}
const topicsFrom = (form, name) => [
  ...form.getAll(name).map((id) => ({ topic: String(id) })),
  ...String(form.get(`${name}-custom`) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
];
export function openSafetyDialog(ctx, api, kind, data = {}) {
  const campaignId = campaignIdOf(ctx);
  const slice = sliceOf(ctx, api);
  if (kind === "expectations") {
    const e = D.campaignData(slice, campaignId).expectations;
    ctx.dialog(
      ctx.t("Aspettative della campagna", "Campaign expectations"),
      `<p class="safety-note">${ctx.t("Il foglio delle aspettative si compila alla sessione zero e si aggiorna quando serve. Nessun campo è obbligatorio.", "The expectations sheet is filled at session zero and updated when needed. No field is required.")}</p>
      <label class="field">${ctx.t("Tono e stile", "Tone and style")}<textarea name="tone" maxlength="${D.TEXT_MAX}">${ctx.esc(e.tone)}</textarea></label>
      <label class="field">${ctx.t("Si può parlare di", "Can be discussed")}<textarea name="welcome" maxlength="${D.TEXT_MAX}">${ctx.esc(e.welcome)}</textarea></label>
      <fieldset class="safety-fieldset"><legend>${ctx.t("Limiti rigidi (linee della campagna)", "Hard limits (campaign lines)")}</legend>${topicChecks(ctx, "lines", e.lines)}</fieldset>
      <fieldset class="safety-fieldset"><legend>${ctx.t("Limiti morbidi (veli della campagna)", "Soft limits (campaign veils)")}</legend>${topicChecks(ctx, "veils", e.veils)}</fieldset>
      <fieldset class="safety-fieldset"><legend>${ctx.t("Avvisi di contenuto", "Content warnings")}</legend>${topicChecks(ctx, "warnings", e.warnings)}</fieldset>
      <label class="field">${ctx.t("Avvisi per la prossima sessione", "Next session warnings")}<textarea name="sessionWarnings" maxlength="${D.TEXT_MAX}">${ctx.esc(e.sessionWarnings)}</textarea></label>
      <fieldset class="safety-fieldset"><legend>${ctx.t("Strumenti in uso", "Tools in use")}</legend><div class="safety-topic-grid">${D.SAFETY_TOOLS.map(
        (tool) => {
          const always = D.ALWAYS_TOOLS.includes(tool.id);
          const note =
            tool.id === "stop"
              ? ctx.t("sempre disponibile", "always available")
              : ctx.t("sempre attivi", "always on");
          return `<label class="safety-check-option"><input type="checkbox" name="tools" value="${tool.id}" ${always || e.tools.includes(tool.id) ? "checked" : ""} ${always ? 'disabled aria-describedby="safety-tools-note"' : ""}><span>${ctx.esc(ctx.label(tool.label))}${always ? ` · ${note}` : ""}</span></label>`;
        },
      ).join(
        "",
      )}</div><p class="safety-note" id="safety-tools-note">${ctx.t("Stop resta sempre disponibile a tutti, anonimo. Le linee e i veli del gruppo valgono sempre: vengono dai profili di ciascuno e nessun foglio li nasconde al tavolo. Quando le aspettative sono condivise, uno strumento non spuntato sparisce dalle carte Sicurezza di tutto il gruppo.", "Stop always stays available to everyone, anonymously. The group’s lines and veils always apply: they come from each person’s profile and no sheet hides them from the table. Once the expectations are shared, an unticked tool disappears from the whole group’s Safety cards.")}</p></fieldset>
      <label class="safety-switch"><input type="checkbox" name="shared" ${e.shared ? "checked" : ""}><span>${ctx.t("Condividi con il gruppo", "Share with the group")}</span></label>
      <label class="safety-switch"><input type="checkbox" name="remind" ${e.remind ? "checked" : ""}><span>${ctx.t("Ricorda prima di ogni sessione (all’ingresso al Tavolo, senza registrare chi legge)", "Remind before each session (when joining the Table, without recording who reads)")}</span></label>`,
      {
        submitLabel: ctx.t("Salva aspettative", "Save expectations"),
        onSubmit(form) {
          perform(ctx, api, "expectations", {
            tone: form.get("tone"),
            welcome: form.get("welcome"),
            lines: topicsFrom(form, "lines"),
            veils: topicsFrom(form, "veils"),
            warnings: topicsFrom(form, "warnings"),
            sessionWarnings: form.get("sessionWarnings"),
            tools: form.getAll("tools").map(String),
            shared: form.get("shared") === "on",
            remind: form.get("remind") === "on",
          });
          ctx.toast(ctx.t("Aspettative salvate.", "Expectations saved."));
        },
      },
    );
    return;
  }
  if (kind === "checklist") {
    const checklist = D.campaignData(slice, campaignId).checklist;
    ctx.dialog(
      ctx.t("Sessione zero · traccia facoltativa", "Session zero · optional outline"),
      `<p class="safety-note">${ctx.t("Segna ciò che il gruppo ha già discusso. Le note sono visibili al gruppo quando le aspettative sono condivise.", "Tick what the group already discussed. Notes are visible to the group once the expectations are shared.")}</p>${D.SESSION_ZERO_ITEMS.map(
        (item) =>
          `<fieldset class="safety-fieldset safety-zero-item"><legend>${ctx.esc(ctx.label(item.label))}</legend><label class="safety-check-option"><input type="checkbox" name="${item.id}-done" ${checklist[item.id]?.done ? "checked" : ""}><span>${ctx.t("Discusso", "Discussed")}</span></label><label class="field">${ctx.t("Nota", "Note")}<input name="${item.id}-note" maxlength="${D.NOTE_MAX}" value="${ctx.esc(checklist[item.id]?.note ?? "")}"></label></fieldset>`,
      ).join("")}`,
      {
        submitLabel: ctx.t("Salva traccia", "Save outline"),
        onSubmit(form) {
          perform(
            ctx,
            api,
            "checklist",
            Object.fromEntries(
              D.SESSION_ZERO_ITEMS.map((item) => [
                item.id,
                {
                  done: form.get(`${item.id}-done`) === "on",
                  note: String(form.get(`${item.id}-note`) ?? ""),
                },
              ]),
            ),
          );
          ctx.toast(ctx.t("Traccia salvata.", "Outline saved."));
        },
      },
    );
    return;
  }
  if (kind === "mark") {
    const scenes = ctx.state.scenes ?? [];
    const sceneId = data.scene || ctx.state.activeSceneId || scenes[0]?.id;
    const marks = D.campaignData(slice, campaignId).marks;
    const topicsOf = (id) => marks.find((mark) => mark.sceneId === id)?.topics ?? [];
    ctx.dialog(
      ctx.t("Marca una mappa", "Mark a map"),
      `<p class="safety-note">${ctx.t("Indica cosa mostra la mappa. Chi ha attivato il filtro con questi argomenti la vedrà sfumata, con “Mostra”; gli altri la vedono com’è. Il gioco non cambia.", "Say what the map shows. Anyone whose filter includes these topics sees it blurred, with “Show”; everyone else sees it as it is. Play does not change.")}</p><label class="field">${ctx.t("Mappa", "Map")}<select name="scene" data-safety-mark-scene>${scenes.map((scene) => `<option value="${ctx.esc(scene.id)}" ${scene.id === sceneId ? "selected" : ""}>${ctx.esc(scene.name)}${scene.revealed ? "" : ` (${ctx.t("non rivelata", "not revealed")})`}</option>`).join("")}</select></label><p class="safety-note" role="status" data-safety-mark-state>${ctx.esc(markState(ctx, topicsOf(sceneId)))}</p><fieldset class="safety-fieldset"><legend>${ctx.t("Argomenti presenti", "Topics shown")}</legend>${topicChecks(ctx, "topics", topicsOf(sceneId))}</fieldset>`,
      {
        submitLabel: ctx.t("Salva marcatura", "Save mark"),
        onSubmit(form) {
          perform(ctx, api, "mark", {
            sceneId: String(form.get("scene")),
            topics: topicsFrom(form, "topics"),
          });
          ctx.toast(ctx.t("Mappa marcata.", "Map marked."));
        },
      },
    );
    // Choosing another map loads that map's own mark, so saving never overwrites it with
    // the topics of the map shown first.
    const form = globalThis.document?.querySelector?.("#dialog form");
    if (form) bindMarkForm(form, ctx, topicsOf);
    return;
  }
  // P10 CA-68: a handout is marked like a map; the viewer's filter veils it in its viewer.
  if (kind === "mark-handout") {
    const materials = handoutsOf(ctx);
    const targetId = data.target || materials[0]?.id;
    const topicsOf = (id) => D.contentMarkOf(slice, campaignId, "handout", id)?.topics ?? [];
    ctx.dialog(
      ctx.t("Marca una dispensa", "Mark a handout"),
      `<p class="safety-note">${ctx.t("Indica cosa mostra la dispensa (immagine e testo). Chi ha attivato il filtro con questi argomenti la vedrà sfumata, con “Mostra”. Nessun argomento: togli la marcatura.", "Say what the handout shows (picture and text). Anyone whose filter includes these topics sees it blurred, with “Show”. No topic: the mark is removed.")}</p><label class="field">${ctx.t("Dispensa", "Handout")}<select name="target" data-safety-mark-scene>${materials.map((row) => `<option value="${ctx.esc(row.id)}" ${row.id === targetId ? "selected" : ""}>${ctx.esc(row.title ?? row.id)}</option>`).join("")}</select></label><p class="safety-note" role="status" data-safety-mark-state>${ctx.esc(markState(ctx, topicsOf(targetId), true))}</p><fieldset class="safety-fieldset"><legend>${ctx.t("Argomenti presenti", "Topics shown")}</legend>${topicChecks(ctx, "topics", topicsOf(targetId))}</fieldset>`,
      {
        submitLabel: ctx.t("Salva marcatura", "Save mark"),
        onSubmit(form) {
          perform(ctx, api, "mark-content", {
            kind: "handout",
            targetId: String(form.get("target")),
            topics: topicsFrom(form, "topics"),
          });
          ctx.toast(ctx.t("Dispensa marcata.", "Handout marked."));
        },
      },
    );
    const form = globalThis.document?.querySelector?.("#dialog form");
    if (form) bindMarkForm(form, ctx, topicsOf, true);
    return;
  }
  // R7 H-05: an entry is marked like a handout (BG3 content switch).
  if (kind === "mark-entry") {
    const entries = entriesOf(ctx);
    const targetId = data.target || entries[0]?.id;
    const topicsOf = (id) => D.contentMarkOf(slice, campaignId, "entry", id)?.topics ?? [];
    ctx.dialog(
      ctx.t("Marca una voce", "Mark an entry"),
      `<p class="safety-note">${ctx.t("Indica cosa racconta la voce del Mondo o del Diario, o la pagina dell’Archivio. Chi ha attivato il filtro con questi argomenti la vedrà sfumata, con “Mostra”. Nessun argomento: togli la marcatura.", "Say what the World or Journal entry, or the Archive page, tells. Anyone whose filter includes these topics sees it blurred, with “Show”. No topic: the mark is removed.")}</p><label class="field">${ctx.t("Voce", "Entry")}<select name="target" data-safety-mark-scene>${entries.map((row) => `<option value="${ctx.esc(row.id)}" ${row.id === targetId ? "selected" : ""}>${ctx.esc(entryTitle(ctx, row))}</option>`).join("")}</select></label><p class="safety-note" role="status" data-safety-mark-state>${ctx.esc(markState(ctx, topicsOf(targetId), "entry"))}</p><fieldset class="safety-fieldset"><legend>${ctx.t("Argomenti presenti", "Topics shown")}</legend>${topicChecks(ctx, "topics", topicsOf(targetId))}</fieldset>`,
      {
        submitLabel: ctx.t("Salva marcatura", "Save mark"),
        onSubmit(form) {
          perform(ctx, api, "mark-content", {
            kind: "entry",
            targetId: String(form.get("target")),
            topics: topicsFrom(form, "topics"),
          });
          ctx.toast(ctx.t("Voce marcata.", "Entry marked."));
        },
      },
    );
    const form = globalThis.document?.querySelector?.("#dialog form");
    if (form) bindMarkForm(form, ctx, topicsOf, "entry");
    return;
  }
  if (kind === "star-wish") {
    ctx.dialog(
      ctx.t("Stelle e desideri", "Stars and wishes"),
      `<p class="safety-note">${ctx.t("Facoltativo. Scrivi una stella, un desiderio o entrambi. Senza firma nessuno sa che sei tu.", "Optional. Write a star, a wish or both. Unsigned, nobody knows it is you.")}</p><label class="field">${ctx.t("Stella · cosa ti è piaciuto", "Star · what you enjoyed")}<textarea name="star" maxlength="${D.STAR_MAX}"></textarea></label><label class="field">${ctx.t("Desiderio · cosa speri la prossima volta", "Wish · what you hope for next time")}<textarea name="wish" maxlength="${D.STAR_MAX}"></textarea></label><label class="safety-switch"><input type="checkbox" name="signed"><span>${ctx.t("Firma con il mio nome", "Sign with my name")}</span></label>`,
      {
        submitLabel: ctx.t("Invia", "Send"),
        cancelLabel: ctx.t("Non ora", "Not now"),
        onSubmit(form) {
          perform(ctx, api, "star-wish", {
            roundId: data.round,
            star: form.get("star"),
            wish: form.get("wish"),
            signed: form.get("signed") === "on",
          });
          ctx.toast(
            ctx.t("Grazie: stelle e desideri inviati.", "Thank you: stars and wishes sent."),
          );
        },
      },
    );
  }
}

// ---------------------------------------------------------------------------------
// Pre-session reminder (Let's Role, VTL-059): shown when joining the Table, once per
// device, day and sheet revision. Nothing is written to shared data.

export function reminderBody(ctx, reminder) {
  return `<div class="safety-reminder"><p>${ctx.t("Prima di iniziare, ecco gli accordi del tavolo. Nessuno registra chi li legge.", "Before starting, here are the table’s agreements. Nobody records who reads them.")}</p>
  ${reminder.tone ? `<p><strong>${ctx.t("Tono", "Tone")}:</strong> ${ctx.esc(reminder.tone)}</p>` : ""}
  ${reminder.welcome ? `<p><strong>${ctx.t("Si può parlare di", "Can be discussed")}:</strong> ${ctx.esc(reminder.welcome)}</p>` : ""}
  <p><strong>${ctx.t("Non ammessi (linee)", "Not allowed (lines)")}</strong></p>${chipList(ctx, reminder.lines, ctx.t("Nessuno.", "None."))}
  <p><strong>${ctx.t("Fuori scena (veli)", "Off-screen (veils)")}</strong></p>${chipList(ctx, reminder.veils, ctx.t("Nessuno.", "None."))}
  <p><strong>${ctx.t("Avvisi di contenuto", "Content warnings")}</strong></p>${chipList(ctx, reminder.warnings, ctx.t("Nessuno.", "None."))}
  ${reminder.sessionWarnings ? `<p><strong>${ctx.t("Per questa sessione", "For this session")}:</strong> ${ctx.esc(reminder.sessionWarnings)}</p>` : ""}
  <p><strong>${ctx.t("Strumenti", "Tools")}:</strong> ${ctx.esc(toolNames(ctx, reminder.tools))}. ${ctx.t("Stop, Rallenta e Alza la mano sono sempre in alto sulla mappa del Tavolo (Alza la mano: Ctrl+Maiusc+U); il resto è in Chat › Sicurezza.", "Stop, Slow down and Raise hand are always at the top of the Table map (Raise hand: Ctrl+Shift+U); the rest is in Chat › Safety.")}</p></div>`;
}
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export function maybeRemind(ctx, api) {
  if (ctx.view?.page !== "table" || !isMember(ctx)) return false;
  if (globalThis.document?.querySelector?.("#dialog")?.open) return false;
  // A pending X-card comes first: the reminder waits until the DM presses "Ricevuto".
  if (overlayItems(ctx, api).xcard.length) return false;
  const campaignId = campaignIdOf(ctx);
  const reminder = D.reminderFor(ctx.state, sliceOf(ctx, api), campaignId, ctx.role);
  if (!reminder) return false;
  const memory = `${ctx.role}:${campaignId}`;
  const seen = `${reminder.key}:${today()}`;
  if (deviceGet("reminded", memory) === seen) return false;
  ctx.dialog(ctx.t("Prima di giocare", "Before playing"), reminderBody(ctx, reminder), {
    submitLabel: ctx.t("Ho letto", "Got it"),
    cancelLabel: ctx.t("Più tardi", "Later"),
    onSubmit() {
      deviceSet("reminded", memory, seen);
    },
  });
  return true;
}

// ---------------------------------------------------------------------------------
// P10 CA-68: the viewer's own filter on content other areas render (chat.mjs and
// handouts.mjs wrap their markup here): swear words masked, a marked handout veiled with
// "Show", pictures in chat blurred until shown. Reveals last for the visit, like maps.

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
/** A handout viewer's markup through the viewer's filter (veiled when marked). */
export function filterHandoutMarkup(ctx, handoutId, markup) {
  const filter = D.filterFor(ctx.state, ctx.role);
  if (!filter.enabled) return markup;
  const html = filter.markup(markup);
  const { topics, revision } = filter.topicsFor("handout", handoutId);
  if (!topics.length) return html;
  const key = `${ctx.role}:handout:${handoutId}:${revision}`;
  // Once shown (for this visit) the handout renders as it is, so its own viewer keeps
  // replacing and binding its article.
  if (revealed.has(key)) return html;
  const names = sortTopics(ctx, topics).map((entry) => topicLabel(ctx, entry));
  return `<div class="safety-content is-veiled" data-safety-content="${esc(key)}"><div class="safety-content-cover"><p><strong>${ctx.t("Sfumata dal tuo filtro", "Blurred by your filter")}</strong> · ${esc(names.join(", "))}</p><button type="button" class="button" data-safety-content-show="${esc(key)}">${ctx.t("Mostra", "Show")}</button></div><div class="safety-content-body" aria-hidden="true" inert>${html}</div></div>`;
}
/** A chat item's markup through the viewer's filter (masked words, blurred pictures). */
export function filterChatMarkup(ctx, markup, item = {}) {
  const filter = D.filterFor(ctx.state, ctx.role);
  if (!filter.enabled) return markup;
  let html = filter.markup(markup);
  const key = `${ctx.role}:chat:${item?.id ?? ""}`;
  if (filter.images && /<img\b/.test(html) && !revealed.has(key))
    html = html
      .replace(/<img\b/g, "<img data-safety-blurred")
      .replace(
        /<\/li>\s*$/,
        `<button type="button" class="button quiet safety-show-image" data-safety-content-show="${esc(key)}">${ctx.t("Mostra l’immagine (sfumata dal tuo filtro)", "Show the picture (blurred by your filter)")}</button></li>`,
      );
  return html;
}
function revealContent(button) {
  const key = button.dataset.safetyContentShow;
  revealed.add(key);
  const box = button.closest("[data-safety-content]");
  if (box) {
    box.classList.remove("is-veiled");
    box.querySelector(".safety-content-cover")?.setAttribute("hidden", "");
    const body = box.querySelector(".safety-content-body");
    body?.removeAttribute("inert");
    body?.removeAttribute("aria-hidden");
    body?.querySelector("button, a, input, select, textarea")?.focus?.({ preventScroll: true });
    return;
  }
  const item = button.closest("li");
  item
    ?.querySelectorAll("img[data-safety-blurred]")
    .forEach((img) => img.removeAttribute("data-safety-blurred"));
  button.remove();
}

// ---------------------------------------------------------------------------------
// P10 CA-66 (Alchemy X-Card always on screen, Foundry Safety & Communication queue): the
// Table's map bar (session-view HUD) carries Stop, Slow down and Raise hand for everyone,
// one tap each, and for the DM a raised-hand counter that opens the queue.

let hudApi = null;
/** safety.mjs hands its registry api over, so the map bar can act without the drawer. */
export function setSafetyApi(api) {
  hudApi = api;
}
const HUD_ICONS = {
  stop: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  pace: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M7 15h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  hand: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12m0-6.5V4.5a1.5 1.5 0 0 1 3 0V12m0-6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7-2.6 0-4.3-1.3-5.6-3.4L4 14.2a1.4 1.4 0 0 1 2.3-1.6L8 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
/** Buttons for the map bar; "" outside a campaign or without this area's data. */
export function safetyHud(ctx) {
  if (!hudApi || !ctx?.state?.ext?.[D.SAFETY_SLICE] || !isMember(ctx)) return "";
  const slice = sliceOf(ctx, hudApi);
  const campaignId = campaignIdOf(ctx);
  const tools = D.enabledTools(slice, campaignId);
  const queue = D.handQueue(ctx.state, slice, campaignId, ctx.role);
  const button = (attrs, glyph, text, cls = "") =>
    `<button type="button" class="session-view-hud-button safety-hud ${cls}" ${attrs} aria-label="${esc(text)}" title="${esc(text)}">${glyph}<span>${esc(text)}</span></button>`;
  const parts = [];
  if (tools.includes("stop"))
    parts.push(
      button(
        'data-safety-hud="stop"',
        HUD_ICONS.stop,
        ctx.t("Stop · carta X (anonimo)", "Stop · X-card (anonymous)"),
        "is-stop",
      ),
    );
  if (tools.includes("pace"))
    parts.push(
      button(
        'data-safety-hud="pace"',
        HUD_ICONS.pace,
        ctx.t("Rallenta (anonimo)", "Slow down (anonymous)"),
        "is-pace",
      ),
    );
  if (isDm(ctx)) {
    if (queue.length)
      parts.push(
        button(
          'data-table-drawer="safety" aria-controls="table-drawer" data-safety-hud-queue',
          HUD_ICONS.hand,
          ctx.t(
            `Mani alzate: ${queue.length} · apri la coda`,
            `Raised hands: ${queue.length} · open the queue`,
          ),
          "is-queue",
        ).replace(
          "</button>",
          `<b class="safety-hud-count" aria-hidden="true">${queue.length}</b></button>`,
        ),
      );
  } else if (tools.includes("hand")) {
    const raised = queue.some((hand) => hand.memberId === ctx.role);
    parts.push(
      button(
        `data-safety-hud="${raised ? "lower-hand" : "raise-hand"}" aria-pressed="${raised}"`,
        HUD_ICONS.hand,
        raised
          ? ctx.t("Abbassa la mano (Ctrl+Maiusc+U)", "Lower hand (Ctrl+Shift+U)")
          : ctx.t("Alza la mano (Ctrl+Maiusc+U)", "Raise hand (Ctrl+Shift+U)"),
        raised ? "is-raised" : "",
      ),
    );
  }
  return parts.length
    ? `<span class="safety-hud-group" role="group" aria-label="${esc(ctx.t("Sicurezza del tavolo", "Table safety"))}">${parts.join("")}</span>`
    : "";
}
export function bindSafetyHud(el, ctx) {
  el.querySelectorAll?.("[data-safety-hud]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!hudApi) return;
      const kind = button.dataset.safetyHud;
      if (kind === "stop" || kind === "pace") {
        if (attempt(ctx, () => perform(ctx, hudApi, "signal", { kind })) !== false)
          confirmSignal(ctx, kind);
        return;
      }
      if (attempt(ctx, () => perform(ctx, hudApi, kind)) !== false)
        ctx.toast(
          kind === "raise-hand"
            ? ctx.t(
                "Mano alzata: sei in coda con il tuo nome.",
                "Hand raised: you are queued by name.",
              )
            : ctx.t("Mano abbassata.", "Hand lowered."),
        );
    };
  });
}

// ---------------------------------------------------------------------------------
// Global overlay (own element under <body>): the DM's X-card, and nothing else. It
// flashes in the middle of the DM's view (Alchemy, SVC-110) for XCARD_FLASH_MS, then docks
// as a compact banner at the top of the map (away from the Table: under the header),
// still with "Ricevuto", so the centre of the map stays usable; a new Stop flashes in the
// middle again. It stays until acknowledged, whatever the notification preferences: a
// Stop is a safety interrupt, not a notice. While a modal dialog is open the rest of the
// page is inert, so a pending X-card moves inside that dialog and stays actionable.
// Every other safety event (the group told of a Stop without names, Slow down, Keep
// going, a raised hand, the stars-and-wishes invitation) reaches people through the
// app's one notification surface: the "safety-alerts" collector (safety.mjs) feeds B24's
// centre and pop-ups, category "Sicurezza del tavolo", with each person's own delivery,
// position and duration. One surface per event, as Owlbear's snackbar, Foundry's
// notifications and Roll20's raise-hand toast (R20-147) each use one.

export const XCARD_FLASH_MS = 6000;
const xcardSeen = new Map(); // "<identity>:<signal id>" -> first shown on this device (ms)
let dockTimer = null;
let overlayEl = null;
let hookedDocument = null;
let revealDrawer = false;

/** Pending Stops the X-card shows: the DM's view only, never the DM's own Stop. */
export function overlayItems(ctx, api) {
  if (!ctx?.state?.ext?.[D.SAFETY_SLICE] || !isMember(ctx) || !isDm(ctx)) return { xcard: [] };
  const own = new Set(deviceIds("sent", ctx.role));
  return {
    xcard: D.activeSignals(ctx.state, sliceOf(ctx, api), campaignIdOf(ctx), ctx.role).filter(
      (signal) => signal.kind === "stop" && !own.has(signal.id),
    ),
  };
}
export function renderOverlay(ctx, api) {
  const { xcard } = overlayItems(ctx, api);
  return xcard.length
    ? `<section class="safety-xcard" role="alert" aria-labelledby="safety-xcard-title"><p class="safety-xcard-mark" aria-hidden="true">X</p><h2 id="safety-xcard-title">${ctx.t("Stop · carta X", "Stop · X-card")}${xcard.length > 1 ? ` ×${xcard.length}` : ""}</h2><p>${ctx.t("Qualcuno ha chiesto di fermare la scena. Il nome non viene mai mostrato.", "Someone asked to stop the scene. The name is never shown.")}</p><p class="safety-note">${ctx.t("Cambia direzione o salta il contenuto; se serve, proponi una pausa. Il gioco resta utilizzabile.", "Change direction or skip the content; offer a break if needed. The game stays usable.")}</p><button type="button" class="button primary" data-safety-overlay="ack" data-id="${ctx.esc(xcard[0].id)}">${ctx.t("Ricevuto", "Acknowledge")}</button></section>`
    : "";
}
function onOverlayClick(event, api) {
  const button = event.target.closest?.('[data-safety-overlay="ack"]');
  if (!button) return;
  const context = api.ctx();
  const ok = attempt(context, () => perform(context, api, "ack-signal", { id: button.dataset.id }));
  if (ok !== false) acknowledged(context, api);
}
/** After "Ricevuto": confirmation, then the pre-session reminder it may have held back. */
function acknowledged(ctx, api) {
  ctx.toast(
    ctx.t(
      "Segnale ricevuto: sparisce per tutti.",
      "Signal acknowledged: it disappears for everyone.",
    ),
  );
  if (ctx.view?.page === "table")
    setTimeout(() => {
      const current = api.ctx();
      if (current) maybeRemind(current, api);
    }, 0);
}
function floorGiven(ctx, memberId) {
  const name = memberDisplay(ctx, memberId);
  ctx.toast(ctx.t(`La parola a ${name}.`, `${name} has the floor.`));
}

/** The overlay element, created once; document hooks installed once per document. */
function ensureOverlay(doc, api) {
  if (!overlayEl || overlayEl.ownerDocument !== doc) {
    doc.querySelector(".safety-overlay")?.remove();
    overlayEl = doc.createElement("div");
    overlayEl.className = "safety-overlay";
    overlayEl.setAttribute("data-safety-overlay-root", "");
    overlayEl.addEventListener("click", (event) => onOverlayClick(event, api));
  }
  if (hookedDocument !== doc) {
    hookedDocument = doc;
    const view = doc.defaultView;
    // Opening the Table's Safety drawer brings its signal cards into view (bindTableDrawer).
    // Only for a pointer or touch press: a tab opened from the keyboard (click detail 0)
    // keeps the focus on the tab, as the Table's WAI-ARIA tab list requires (B61); Tab
    // from there enters the panel (W2a1 integration).
    doc.addEventListener(
      "click",
      (event) => {
        const toggle = event.target?.closest?.('[data-table-drawer="safety"]');
        if (toggle?.getAttribute("aria-expanded") === "false" && event.detail !== 0)
          revealDrawer = true;
      },
      true,
    );
    // P10 CA-68: "Show" on a veiled handout or a blurred chat picture, wherever it renders.
    doc.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-safety-content-show]");
      if (!button) return;
      event.preventDefault();
      revealContent(button);
    });
    // A modal dialog opening or closing anywhere moves a pending X-card in or out of it;
    // a notification pop-up (B24) appearing or leaving moves the docked X-card clear of it.
    if (view?.MutationObserver)
      new view.MutationObserver((records) => {
        placeOverlay(doc);
        if (records.some((record) => record.target?.classList?.contains("notifications-toasts")))
          positionDock(doc);
      }).observe(doc.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["open"],
      });
    let frame = 0;
    const follow = () => {
      if (frame || !view?.requestAnimationFrame) return;
      frame = view.requestAnimationFrame(() => {
        frame = 0;
        positionDock(doc);
      });
    };
    view?.addEventListener?.("scroll", follow, { passive: true });
    view?.addEventListener?.("resize", follow, { passive: true });
  }
  return overlayEl;
}
function topModal(doc) {
  const open = [...doc.querySelectorAll("dialog[open]")].filter((dialog) => {
    try {
      return dialog.matches(":modal");
    } catch {
      return true;
    }
  });
  return open.at(-1) ?? null;
}
/** Under <body>, or inside the topmost modal dialog while an X-card is pending. */
function placeOverlay(doc) {
  const el = overlayEl;
  if (!el) return;
  const modal = el.querySelector(".safety-xcard") ? topModal(doc) : null;
  if (modal) {
    if (el.parentNode !== modal) modal.append(el);
  } else if (el.parentNode !== doc.body) doc.body.insertBefore(el, doc.querySelector("#app"));
  el.classList.toggle("is-in-dialog", Boolean(modal));
}
/** Dock anchor: the top of the visible map (below its status bar, right of the tool rail). */
function positionDock(doc) {
  const el = overlayEl;
  if (!el?.querySelector(".safety-xcard.is-docked")) return;
  const view = doc.defaultView;
  const map = doc.querySelector("#content .map-container")?.getBoundingClientRect();
  let top;
  let left;
  let width;
  if (map && map.bottom > 120 && map.top < view.innerHeight - 120) {
    top = Math.max(map.top, 0) + 56;
    width = Math.min(460, map.width - 82);
    left = map.left + 72;
  } else {
    const header = doc.querySelector(".app-header")?.getBoundingClientRect();
    top = header && header.bottom > 0 ? header.bottom + 8 : 10;
    width = Math.min(460, view.innerWidth - 32);
    left = (view.innerWidth - width) / 2;
  }
  // Clear of B24's pop-ups on screen (on a phone they sit at the top, where the X-card
  // docks); the overlay also stacks above them, so a pending Stop is never hidden.
  const card = el.querySelector(".safety-xcard").getBoundingClientRect();
  const height = card.height || 72;
  const toasts = doc.querySelector(".notifications-toasts");
  const pops = toasts?.querySelector(".notifications-toast")
    ? toasts.getBoundingClientRect()
    : null;
  if (
    pops?.height &&
    left < pops.right &&
    left + width > pops.left &&
    top < pops.bottom &&
    top + height > pops.top
  )
    top = pops.bottom + 8;
  el.style.setProperty("--safety-dock-top", `${Math.round(top)}px`);
  el.style.setProperty("--safety-dock-left", `${Math.round(left)}px`);
  el.style.setProperty("--safety-dock-width", `${Math.round(width)}px`);
}
/** Centre flash for XCARD_FLASH_MS after the newest pending Stop first shows, then dock. */
function applyDock(el, ctx, api, doc) {
  clearTimeout(dockTimer);
  const card = el.querySelector(".safety-xcard");
  if (!card) return;
  const now = Date.now();
  const keys = new Set();
  let newest = 0;
  for (const signal of overlayItems(ctx, api).xcard) {
    const key = `${ctx.role}:${signal.id}`;
    keys.add(key);
    if (!xcardSeen.has(key)) xcardSeen.set(key, now);
    newest = Math.max(newest, xcardSeen.get(key));
  }
  for (const key of xcardSeen.keys())
    if (key.startsWith(`${ctx.role}:`) && !keys.has(key)) xcardSeen.delete(key);
  const wait = newest + XCARD_FLASH_MS - now;
  card.classList.toggle("is-docked", wait <= 0);
  if (wait > 0)
    dockTimer = setTimeout(() => {
      const current = api.ctx();
      if (current) refreshOverlay(current, api);
    }, wait + 20);
  else {
    positionDock(doc);
    doc.defaultView?.requestAnimationFrame?.(() => positionDock(doc));
  }
}
export function refreshOverlay(ctx, api) {
  const doc = globalThis.document;
  if (!doc?.createElement || !doc.body) return;
  const el = ensureOverlay(doc, api);
  let html = "";
  try {
    html = renderOverlay(ctx, api);
  } catch {
    html = "";
  }
  // Only a different X-card (a new or acknowledged Stop, another language) replaces the
  // node: a role="alert" region is announced again whenever it is inserted anew.
  if (html !== overlayHTML) {
    // Keep keyboard focus on the same overlay command across a re-render.
    const active = doc.activeElement;
    const focused =
      active && el.contains(active)
        ? `${active.dataset?.safetyOverlay}:${active.dataset?.id}`
        : null;
    overlayHTML = html;
    el.innerHTML = html;
    el.hidden = !html;
    if (focused)
      [...el.querySelectorAll("[data-safety-overlay]")]
        .find((button) => `${button.dataset.safetyOverlay}:${button.dataset.id}` === focused)
        ?.focus({ preventScroll: true });
  }
  applyDock(el, ctx, api, doc);
  placeOverlay(doc);
}

// ---------------------------------------------------------------------------------
// Binding of the campaign section, profile page and Table drawer.

function go(ctx, target) {
  if (target === "profile")
    ctx.navigate("safety-profile", {
      returnTo: ctx.view.page === "table" ? "table" : "campaign-safety",
    });
  else if (target === "campaign") ctx.navigate("campaign", { tab: "safety" });
}
const offlineTail = (ctx) =>
  ctx.offline
    ? ctx.t(
        " Arriva al gruppo quando torni in rete.",
        " It reaches the group when you are back online.",
      )
    : "";
function readFilter(root) {
  const inputs = [...(root.querySelectorAll?.("[data-safety-filter]") ?? [])];
  const flag = (name) => inputs.find((input) => input.dataset.safetyFilter === name);
  return {
    enabled: flag("enabled")?.checked === true,
    // The viewer's own lines and veils are always in; only the extra topics are stored.
    extra: inputs
      .filter(
        (input) =>
          input.dataset.safetyFilter === "extra" &&
          input.checked &&
          input.dataset.safetyOwnTopic === undefined,
      )
      .map((input) => input.value),
    ...(flag("profanity") ? { profanity: flag("profanity").checked === true } : {}),
    ...(flag("images") ? { images: flag("images").checked === true } : {}),
  };
}
export function handleAct(ctx, api, button, root) {
  const d = button.dataset;
  switch (d.safetyAct) {
    case "add-limit": {
      const input = root.querySelector?.(`[data-safety-input="${d.list}"]`);
      pendingFocus = `[data-safety-input="${d.list}"]`;
      const ok = attempt(ctx, () =>
        perform(ctx, api, "add-limit", { list: d.list, text: input?.value ?? "" }),
      );
      if (ok !== false)
        ctx.toast(
          (d.list === "lines"
            ? ctx.t("Linea aggiunta al tuo profilo.", "Line added to your profile.")
            : ctx.t("Velo aggiunto al tuo profilo.", "Veil added to your profile.")) +
            offlineTail(ctx),
        );
      return ok;
    }
    case "remove-limit": {
      pendingFocus = `[data-safety-input="${d.list}"]`;
      const ok = attempt(ctx, () => perform(ctx, api, "remove-limit", { list: d.list, id: d.id }));
      if (ok !== false)
        ctx.toast(
          (d.list === "lines"
            ? ctx.t("Linea tolta dal tuo profilo.", "Line removed from your profile.")
            : ctx.t("Velo tolto dal tuo profilo.", "Veil removed from your profile.")) +
            offlineTail(ctx),
        );
      return ok;
    }
    case "signal": {
      pendingFocus = `[data-safety-act="signal"][data-kind="${d.kind}"]`;
      const ok = attempt(ctx, () => perform(ctx, api, "signal", { kind: d.kind }));
      if (ok !== false) confirmSignal(ctx, d.kind);
      return ok;
    }
    case "withdraw-signal": {
      const ok = attempt(ctx, () => perform(ctx, api, "withdraw-signal", { id: d.id }));
      if (ok !== false) ctx.toast(ctx.t("Segnale ritirato.", "Signal withdrawn."));
      return ok;
    }
    case "raise-hand":
    case "lower-hand": {
      pendingFocus = '[data-safety-act="raise-hand"], [data-safety-act="lower-hand"]';
      const ok = attempt(ctx, () => perform(ctx, api, d.safetyAct));
      if (ok !== false)
        ctx.toast(
          d.safetyAct === "raise-hand"
            ? ctx.t(
                "Mano alzata: sei in coda con il tuo nome.",
                "Hand raised: you are queued by name.",
              )
            : ctx.t("Mano abbassata.", "Hand lowered."),
        );
      return ok;
    }
    case "ack-signal": {
      const ok = attempt(ctx, () => perform(ctx, api, "ack-signal", { id: d.id }));
      if (ok !== false) acknowledged(ctx, api);
      return ok;
    }
    case "give-floor": {
      const memberId = attempt(ctx, () => perform(ctx, api, "give-floor", { id: d.id }));
      if (memberId !== false) floorGiven(ctx, memberId);
      return memberId;
    }
    case "unmark": {
      const ok = attempt(ctx, () => perform(ctx, api, "unmark", { id: d.id }));
      if (ok !== false)
        ctx.toast(
          ctx.t(
            "Marcatura tolta: la mappa non è più sfumata per nessuno.",
            "Mark removed: the map is no longer blurred for anyone.",
          ),
        );
      return ok;
    }
    case "close-round":
      confirmCloseRound(ctx, api, d.id);
      return true;
    case "move-hand": {
      const hand = D.handQueue(ctx.state, sliceOf(ctx, api), campaignIdOf(ctx), ctx.role).find(
        (entry) => entry.id === d.id,
      );
      const ok = attempt(ctx, () => perform(ctx, api, "move-hand", { id: d.id, where: d.where }));
      if (ok !== false && hand) {
        const name = memberDisplay(ctx, hand.memberId);
        ctx.toast(
          d.where === "front"
            ? ctx.t(`${name} è ora in testa alla coda.`, `${name} is now first in the queue.`)
            : ctx.t(`${name} è ora in fondo alla coda.`, `${name} is now last in the queue.`),
        );
      }
      return ok;
    }
    case "open-round": {
      const ok = attempt(ctx, () => perform(ctx, api, "open-round"));
      if (ok !== false)
        ctx.toast(
          ctx.t(
            "Raccolta aperta: i giocatori ricevono l’invito, facoltativo.",
            "Collection opened: players get an optional invitation.",
          ),
        );
      return ok;
    }
    case "withdraw-star": {
      const ok = attempt(ctx, () =>
        perform(ctx, api, "withdraw-star", { roundId: d.round, id: d.id }),
      );
      if (ok !== false)
        ctx.toast(
          ctx.t(
            "Voce ritirata. Puoi scriverne un’altra finché la raccolta è aperta.",
            "Entry withdrawn. You can write another while the collection is open.",
          ),
        );
      return ok;
    }
    default:
      return false;
  }
}
/** Closing a collection cannot be undone: ask first (nobody can write or withdraw after). */
function confirmCloseRound(ctx, api, roundId) {
  ctx.dialog(
    ctx.t("Chiudere la raccolta?", "Close the collection?"),
    `<p>${ctx.t("Dopo la chiusura nessuno potrà più scrivere o ritirare stelle e desideri in questa raccolta. Le voci restano visibili.", "Once closed, nobody can write or withdraw stars and wishes in this collection. The entries stay visible.")}</p>`,
    {
      submitLabel: ctx.t("Chiudi la raccolta", "Close the collection"),
      cancelLabel: ctx.t("Lascia aperta", "Keep it open"),
      onSubmit() {
        perform(ctx, api, "close-round", { id: roundId });
        ctx.toast(
          ctx.t(
            "Raccolta chiusa. Le voci restano visibili.",
            "Collection closed. The entries stay visible.",
          ),
        );
      },
    },
  );
}
/**
 * The Table drawer: after it opens (toggle clicked), its signal cards are brought into
 * view and the group takes focus, so Stop is one Tab away without scrolling.
 */
export function bindTableDrawer(el, ctx, api) {
  bindSafety(el, ctx, api);
  if (!revealDrawer) return;
  revealDrawer = false;
  const section = el.closest?.("#table-drawer") ?? el;
  const cards = el.querySelector?.(".safety-cards") ?? section;
  // After the shell's own render and focus handling.
  setTimeout(() => {
    if (!section.isConnected) return;
    const doc = section.ownerDocument;
    const box = cards.getBoundingClientRect();
    const dock = doc.querySelector("#content .action-dock")?.getBoundingClientRect();
    // B61: the action bar hides the cards only where it lies across them (on a phone);
    // beside the map, the panel is a tab of the right sidebar and scrolls inside it.
    const across = dock && dock.left < box.right && dock.right > box.left;
    const bottom = Math.min(doc.defaultView.innerHeight, across ? dock.top : Infinity);
    if (box.top < 0 || box.bottom > bottom) {
      section.scrollIntoView({ block: "start" });
      if (section.scrollHeight > section.clientHeight) cards.scrollIntoView?.({ block: "nearest" });
    }
    cards.focus?.({ preventScroll: true });
  }, 0);
}
export function bindSafety(root, ctx, api) {
  root.querySelectorAll("[data-safety-act]").forEach((button) => {
    button.onclick = (event) => {
      event?.preventDefault?.();
      handleAct(ctx, api, button, root);
    };
  });
  root.querySelectorAll("[data-safety-go]").forEach((button) => {
    button.onclick = () => go(ctx, button.dataset.safetyGo);
  });
  root.querySelectorAll("[data-safety-tab]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("campaign", {
        tab: "safety",
        ...(button.dataset.safetyTab === "agreements" ? {} : { id: button.dataset.safetyTab }),
      });
  });
  root.querySelectorAll("[data-safety-dialog]").forEach((button) => {
    button.onclick = () =>
      openSafetyDialog(ctx, api, button.dataset.safetyDialog, {
        scene: button.dataset.scene,
        round: button.dataset.round,
        target: button.dataset.target,
      });
  });
  root.querySelectorAll("[data-safety-filter]").forEach((input) => {
    input.onchange = () => {
      pendingFocus =
        input.dataset.safetyFilter === "extra"
          ? `[data-safety-filter="extra"][value="${input.value}"]`
          : `[data-safety-filter="${input.dataset.safetyFilter}"]`;
      attempt(ctx, () => perform(ctx, api, "filter", readFilter(root)));
    };
  });
  root.querySelectorAll("[data-safety-back]").forEach((button) => {
    button.onclick = () =>
      ctx.view.returnTo === "table"
        ? ctx.navigate("table")
        : ctx.navigate("campaign", { tab: "safety" });
  });
  if (pendingFocus) {
    const target = root.querySelector(pendingFocus);
    if (target) {
      pendingFocus = null;
      target.focus?.();
    }
  }
}
// Test seams (Node): the entries and Archive pages «Marca una voce» offers, and their titles.
export const _test = { entriesOf, entryTitle };
