// B15 session preparation sheet (PR-52): the Lazy DM eight steps with the minimal
// three-step option (CMP-124/125), secrets not tied to a place and ticked during play
// (CMP-127), unrevealed secrets carried to the next session (CMP-126), one-click sheet from
// a template (CMP-128). Registered by handouts.mjs under the "handouts" area; state lives in
// state.ext["handouts-prep"]. DM-only content: every commit label is private.
//
// The sheet has no session count of its own: it is labelled with the number of the Table
// session it belongs to (B14 session-view slice, read only), so the two never disagree.
// When that session ends at the Table, the DM is offered to close the sheet (banner in
// Preparation and in the Table's Secrets tab, plus a notification).

import { fail, partyCharacters } from "./handouts-domain.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const PREP_SLICE = "handouts-prep";
export const PREP_VERSION = 1;
export const STEPS = Object.freeze([
  { id: "characters", it: "Rivedi i personaggi", en: "Review the characters", essential: false },
  { id: "strongStart", it: "Inizio forte", en: "Strong start", essential: true },
  { id: "scenes", it: "Scene possibili", en: "Potential scenes", essential: false },
  { id: "secrets", it: "Segreti e indizi", en: "Secrets and clues", essential: true },
  { id: "locations", it: "Luoghi fantastici", en: "Fantastic locations", essential: true },
  { id: "npcs", it: "PNG importanti", en: "Important NPCs", essential: false },
  { id: "monsters", it: "Mostri pertinenti", en: "Relevant monsters", essential: false },
  { id: "rewards", it: "Ricompense magiche", en: "Magic item rewards", essential: false },
]);
const LISTS = ["scenes", "secrets", "locations", "npcs", "monsters", "rewards"];
// A row's optional link, by list: prepared scene, creature, B15 material.
const LINK_KEY = { scenes: "sceneId", monsters: "actorId", locations: "materialId" };
// How a linked material opens (the handouts viewer), given by handouts.mjs at registration.
const hooks = { openMaterial: null };
const MAX_TEXT = 1000;
// B14 keeps the Table sessions in this slice: {id, number, status: live|ended, startedAt}.
const SESSION_SLICE = "session-view";
const HINTS = {
  characters: [
    "Una riga per personaggio: che cosa vuole, che cosa lo aggancia alla prossima scena.",
    "One line per character: what they want, what hooks them into the next scene.",
  ],
  strongStart: [
    "Qualcosa che succede subito, al primo minuto di gioco.",
    "Something that happens right away, in the first minute of play.",
  ],
  scenes: [
    "Scene che potrebbero accadere, non un copione.",
    "Scenes that might happen, not a script.",
  ],
  secrets: [
    "Brevi e non legati a un luogo: rivelali dove capita. Di solito ne emerge circa la metà.",
    "Short and not tied to a place: reveal them wherever they fit. Usually about half surface.",
  ],
  locations: [
    "Due o tre luoghi con un tratto memorabile.",
    "Two or three places with one memorable trait.",
  ],
  npcs: ["Nome e un tratto per ciascuno.", "A name and one trait each."],
  monsters: ["Creature che potrebbero servire.", "Creatures that might be needed."],
  rewards: ["Oggetti e ricompense da consegnare.", "Items and rewards to hand out."],
};

const now = () => new Date().toISOString();
const newId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const clean = (value, it, en) => {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > MAX_TEXT)
    fail(`${it}: massimo ${MAX_TEXT} caratteri.`, `${en}: at most ${MAX_TEXT} characters.`);
  return result;
};
const requireDM = (role) => {
  if (role !== "dm")
    fail(
      "La preparazione della sessione è riservata al DM.",
      "Session prep is reserved for the DM.",
    );
};

function emptyLists() {
  return Object.fromEntries(LISTS.map((list) => [list, []]));
}
export function seedPrep() {
  const row = (id, text, extra = {}) => ({ id, text, ...extra });
  const secret = (id, text, revealed = false, carriedFrom = null) => ({
    id,
    text,
    revealed,
    revealedAt: revealed ? sampleDate("2026-09-17T21:30:00.000Z") : null,
    carriedFrom,
  });
  return {
    sheets: [
      {
        // Played before the Table kept session records: no session number to show.
        id: "prep-2",
        title: "Il sentiero delle lanterne",
        status: "closed",
        minimal: false,
        createdAt: sampleDate("2026-09-15T18:00:00.000Z"),
        closedAt: sampleDate("2026-09-17T22:40:00.000Z"),
        sessionId: null,
        sessionNumber: null,
        carriedTo: "prep-3",
        characterNotes: {},
        strongStart: "Il carro del mercante si ribalta davanti al gruppo.",
        lists: {
          ...emptyLists(),
          secrets: [
            secret(
              "secret-2-oben",
              "Maestro Oben ha affisso l’avviso un mese fa, poi è sparito.",
              true,
            ),
            secret("secret-2-pay", "I goblin del cortile sono pagati da qualcuno in città."),
            secret("secret-2-oil", "Il mercante trasportava olio per la lanterna.", true),
            secret("secret-2-lamp", "La lanterna sulla torre è stata riaccesa dall’interno."),
          ],
        },
      },
      {
        id: "prep-3",
        title: "La cripta sotto l’osservatorio",
        status: "planning",
        minimal: false,
        createdAt: sampleDate("2026-09-18T18:00:00.000Z"),
        closedAt: null,
        characterNotes: {
          livia: "Il suo bastone viene dall’osservatorio: chi l’ha lasciato lì?",
          doran: "Vuole ritrovare Oben, il suo vecchio maestro d’armi.",
          mira: "In forma di gatto può scendere nel pozzo.",
        },
        strongStart:
          "Una campana suona dalla torre mentre il gruppo attraversa il cortile: qualcuno ha calpestato la lastra nella cripta.",
        lists: {
          scenes: [
            row("scene-3-yard", "Le sentinelle goblin nel cortile", { sceneId: "old-watch" }),
            row("scene-3-crypt", "La cripta e il forziere che morde", { sceneId: null }),
            row("scene-3-tavern", "Ritorno alla Taverna del Gufo Stanco", { sceneId: null }),
          ],
          secrets: [
            secret(
              "secret-3-pay",
              "I goblin del cortile sono pagati da qualcuno in città.",
              false,
              "prep-2",
            ),
            secret(
              "secret-3-lamp",
              "La lanterna sulla torre è stata riaccesa dall’interno.",
              false,
              "prep-2",
            ),
            secret(
              "secret-3-body",
              "Il sarcofago è vuoto: il corpo di Oben è stato portato nella torre.",
            ),
            secret(
              "secret-3-seal",
              "La lettera sigillata porta lo stemma dei Varro, mercanti d’olio di Bruma.",
            ),
            secret("secret-3-mimic", "Un mimic sorveglia la cripta, travestito da forziere."),
            secret("secret-3-key", "Il pozzo nasconde la chiave d’ottone della torre."),
          ],
          locations: [
            row("loc-3-crypt", "Cripta sotto l’osservatorio: odore di cera fredda", {
              materialId: "material-crypt",
            }),
            row("loc-3-tavern", "Taverna del Gufo Stanco: il fuoco non si spegne mai", {
              materialId: null,
            }),
          ],
          npcs: [
            row("npc-3-oben", "Maestro Oben, custode scomparso: parla per enigmi"),
            row("npc-3-tessa", "Tessa Varro, mercante d’olio: sorride troppo"),
          ],
          monsters: [
            row("mon-3-sentry", "Sentinella goblin", { actorId: "goblin-1" }),
            row("mon-3-scout", "Esploratore goblin", { actorId: "goblin-2" }),
            row("mon-3-mimic", "Mimic nella cripta", { actorId: null }),
          ],
          rewards: [
            row("rew-3-potion", "Pozione di guarigione nel forziere vero"),
            row("rew-3-key", "Chiave d’ottone della torre"),
          ],
        },
      },
    ],
  };
}
export function normalizePrep(slice, fromVersion) {
  if (fromVersion > PREP_VERSION) throw Error("Saved session prep comes from a newer version");
  const sheets = (Array.isArray(slice?.sheets) ? slice.sheets : []).filter(
    (sheet) => isObject(sheet) && typeof sheet.id === "string",
  );
  return {
    sheets: sheets.map((sheet) => ({
      ...sheet,
      characterNotes: isObject(sheet.characterNotes) ? sheet.characterNotes : {},
      strongStart: typeof sheet.strongStart === "string" ? sheet.strongStart : "",
      lists: Object.fromEntries(
        LISTS.map((list) => [
          list,
          Array.isArray(sheet.lists?.[list]) ? sheet.lists[list].filter(isObject) : [],
        ]),
      ),
    })),
  };
}

const prepOf = (state) =>
  state?.ext?.[PREP_SLICE] ?? fail("Preparazione non disponibile.", "Prep unavailable.");
const findSheet = (state, id) =>
  prepOf(state).sheets.find((sheet) => sheet.id === id) ??
  fail("Scheda non trovata.", "Sheet not found.");
const openSheet = (state, id) => {
  const sheet = findSheet(state, id);
  if (sheet.status !== "planning")
    fail("La scheda è chiusa: resta in sola lettura.", "The sheet is closed: it is read-only.");
  return sheet;
};
export function currentSheet(state) {
  return (
    (state?.ext?.[PREP_SLICE]?.sheets ?? []).filter((s) => s.status === "planning").at(-1) ?? null
  );
}
export function closedSheets(state) {
  return (state?.ext?.[PREP_SLICE]?.sheets ?? []).filter((s) => s.status === "closed").reverse();
}

// ---------------------------------------------------------------------------------------
// Table session record (B14, read only)

function tableSessions(state) {
  const rows = state?.ext?.[SESSION_SLICE]?.sessions;
  return Array.isArray(rows)
    ? rows.filter((s) => isObject(s) && typeof s.id === "string" && Number.isFinite(s.startedAt))
    : [];
}
/** The Table session a sheet belongs to: the one recorded when it was closed or, for an
 * open sheet, the first session started after the sheet was created. Null when none. */
export function sessionOf(state, sheet) {
  if (!sheet) return null;
  const sessions = tableSessions(state);
  if (sheet.sessionId)
    return (
      sessions.find((s) => s.id === sheet.sessionId) ?? {
        id: sheet.sessionId,
        number: sheet.sessionNumber,
        status: "ended",
      }
    );
  if (sheet.status !== "planning") return null;
  const created = Date.parse(sheet.createdAt);
  return sessions.find((s) => s.startedAt >= created) ?? null;
}
/** The number the Table will give to the next session it starts. */
export function nextSessionNumber(state) {
  return tableSessions(state).length + 1;
}
/** The open sheet whose Table session has ended: the DM should close it now. */
export function sheetToClose(state) {
  const sheet = currentSheet(state);
  const session = sessionOf(state, sheet);
  return session?.status === "ended" ? { sheet, session } : null;
}
/** Unrevealed secrets of the last closed sheet that a new sheet would bring back. */
export function pendingCarry(state) {
  const last = (state?.ext?.[PREP_SLICE]?.sheets ?? []).filter((s) => s.status === "closed").at(-1);
  if (!last || last.carriedTo || last.carryDeclined) return [];
  return last.lists.secrets.filter((s) => !s.revealed);
}

const carried = (from) => (s) => ({
  id: newId("secret"),
  text: s.text,
  revealed: false,
  revealedAt: null,
  carriedFrom: from.id,
});
function blankSheet({ title = "", minimal = false, at = now() } = {}) {
  return {
    id: newId("prep"),
    title: clean(title, "Titolo", "Title"),
    status: "planning",
    minimal,
    createdAt: at,
    closedAt: null,
    characterNotes: {},
    strongStart: "",
    lists: emptyLists(),
  };
}
/** One-click sheet from the eight-step template (CMP-128). */
export function createSheet(state, role, { title = "" } = {}) {
  requireDM(role);
  if (currentSheet(state))
    fail(
      "C’è già una preparazione aperta: chiudila prima.",
      "A prep sheet is already open: close it first.",
    );
  const sheets = prepOf(state).sheets;
  const last = sheets.filter((s) => s.status === "closed").at(-1);
  const sheet = blankSheet({ title });
  // Review last session's secrets (CMP-126): the unrevealed ones come back unless the DM
  // already carried them when closing, or chose not to carry them.
  const pending = pendingCarry(state);
  if (pending.length) {
    sheet.lists.secrets = pending.map(carried(last));
    last.carriedTo = sheet.id;
  }
  sheets.push(sheet);
  return sheet.id;
}
export function updateSheet(state, sheetId, field, value, role) {
  requireDM(role);
  const sheet = openSheet(state, sheetId);
  if (field === "title") sheet.title = clean(value, "Titolo", "Title");
  else if (field === "strongStart")
    sheet.strongStart = clean(value, "Inizio forte", "Strong start");
  else if (field === "minimal") sheet.minimal = Boolean(value);
  else if (field.startsWith("character:")) {
    const actorId = field.slice("character:".length);
    if (!partyCharacters(state).some((c) => c.id === actorId))
      fail("Personaggio non valido.", "Invalid character.");
    sheet.characterNotes[actorId] = clean(value, "Nota", "Note");
  } else fail("Campo non valido.", "Invalid field.");
}
/** Whether a row link still points at something (scenes and creatures can be deleted
 * elsewhere; materials by this area). */
function linkExists(state, key, id) {
  if (key === "sceneId") return (state.scenes ?? []).some((s) => s.id === id);
  if (key === "actorId") return Boolean(state.actors?.[id]);
  return (state.ext?.handouts?.materials ?? []).some((m) => m.id === id && m.kind !== "art");
}
/** The name of a row's link target, or "" when it no longer exists. */
function linkTargetName(state, key, id) {
  if (!id || !linkExists(state, key, id)) return "";
  if (key === "sceneId") return state.scenes.find((s) => s.id === id).name;
  if (key === "actorId") return state.actors[id].name;
  return state.ext.handouts.materials.find((m) => m.id === id).title;
}
/** Opens what a prep row links to: the prepared scene's preview (Preparation "Open for
 * me"), the creature's sheet, or the material viewer. */
export function openLinkedRow(ctx, list, id) {
  if (list === "scenes") ctx.navigate("preparation", { id, tab: "preview" });
  else if (list === "monsters") ctx.openSheet(id);
  else if (list === "locations") hooks.openMaterial?.(ctx, id);
}
const LINK_MISSING = {
  sceneId: ["Scena non trovata.", "Scene not found."],
  actorId: ["Creatura non trovata.", "Creature not found."],
  materialId: ["Materiale non trovato.", "Material not found."],
};
export function addRow(state, sheetId, list, input, role) {
  requireDM(role);
  if (!LISTS.includes(list)) fail("Elenco non valido.", "Invalid list.");
  const sheet = openSheet(state, sheetId);
  const text = clean(input?.text, "Testo", "Text");
  if (!text) fail("Scrivi il testo prima di aggiungere.", "Write the text before adding.");
  const row = { id: newId(list), text };
  if (list === "secrets")
    Object.assign(row, { revealed: false, revealedAt: null, carriedFrom: null });
  const key = LINK_KEY[list];
  if (key) {
    row[key] = input?.[key] || null;
    if (row[key] && !linkExists(state, key, row[key])) fail(...LINK_MISSING[key]);
  }
  sheet.lists[list].push(row);
  return row.id;
}
/** Edits a row. Only the link being changed is validated; a link whose target no longer
 * exists is dropped instead of blocking every later edit of the row. */
export function updateRow(state, sheetId, list, rowId, patch, role) {
  requireDM(role);
  const sheet = openSheet(state, sheetId);
  const row =
    sheet.lists[list]?.find((r) => r.id === rowId) ?? fail("Voce non trovata.", "Item not found.");
  const next = { ...row };
  if ("text" in patch) {
    next.text = clean(patch.text, "Testo", "Text");
    if (!next.text)
      fail(
        "Il testo non può essere vuoto: rimuovi la voce.",
        "Text cannot be empty: remove the item.",
      );
  }
  const key = LINK_KEY[list];
  if (key && key in patch) {
    next[key] = patch[key] || null;
    if (next[key] && !linkExists(state, key, next[key])) fail(...LINK_MISSING[key]);
  } else if (key && next[key] && !linkExists(state, key, next[key])) next[key] = null;
  Object.assign(row, next);
}
export function removeRow(state, sheetId, list, rowId, role) {
  requireDM(role);
  const sheet = openSheet(state, sheetId);
  if (!sheet.lists[list]?.some((r) => r.id === rowId)) fail("Voce non trovata.", "Item not found.");
  sheet.lists[list] = sheet.lists[list].filter((r) => r.id !== rowId);
}
/** Ticks a secret as revealed in play (or un-ticks it as a correction). */
export function setSecretRevealed(state, sheetId, secretId, revealed, role, at = now()) {
  requireDM(role);
  const sheet = openSheet(state, sheetId);
  const secret =
    sheet.lists.secrets.find((s) => s.id === secretId) ??
    fail("Segreto non trovato.", "Secret not found.");
  secret.revealed = Boolean(revealed);
  secret.revealedAt = revealed ? at : null;
}
/** Closes the sheet (read-only from now on) and records the Table session it belonged to.
 * With `carry`, a new sheet starts with every unrevealed secret (CMP-126); without it the
 * DM's choice is kept, so a later "new sheet" does not bring them back either. Returns the
 * new sheet id or null. */
export function closeSheet(state, sheetId, role, { carry = true, at = now() } = {}) {
  requireDM(role);
  const sheet = openSheet(state, sheetId);
  const session = sessionOf(state, sheet);
  sheet.status = "closed";
  sheet.closedAt = at;
  sheet.sessionId = session?.id ?? null;
  sheet.sessionNumber = session?.number ?? null;
  const unrevealed = sheet.lists.secrets.filter((s) => !s.revealed);
  if (!carry) {
    if (unrevealed.length) sheet.carryDeclined = true;
    return null;
  }
  const next = blankSheet({ minimal: sheet.minimal, at });
  next.lists.secrets = unrevealed.map(carried(sheet));
  sheet.carriedTo = next.id;
  prepOf(state).sheets.push(next);
  return next.id;
}

// ---------------------------------------------------------------------------------------
// UI

let pendingFocus = null;
function commit(ctx, it, en, mutate) {
  try {
    ctx.commit(ctx.t(it, en), mutate, { visibility: "private" });
    return true;
  } catch (error) {
    ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
    return false;
  }
}
// Autosave on change keeps the keyboard focus where the user moved it (the page re-renders).
function commitKeepingFocus(ctx, it, en, mutate) {
  setTimeout(() => {
    pendingFocus = document.activeElement?.dataset?.focusKey ?? null;
    commit(ctx, it, en, mutate);
    const key = pendingFocus;
    pendingFocus = null;
    if (key) document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus();
  }, 0);
}
const dateText = (ctx, at) =>
  at
    ? new Date(at).toLocaleDateString(ctx.lang === "it" ? "it-IT" : "en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";
/** "Session N · title" from the Table's record; "Next session" before it starts. HTML by
 * default; `{ html: false }` for plain text (dialog titles are escaped by the shell). */
export function sheetHeading(ctx, sheet, { html = true } = {}) {
  const session = sessionOf(ctx.state, sheet);
  const title = sheet.title ? " · " + (html ? ctx.esc(sheet.title) : sheet.title) : "";
  const number = session?.number ?? sheet.sessionNumber;
  if (number) return `${ctx.t("Sessione", "Session")} ${number}${title}`;
  if (sheet.status === "closed")
    return ctx.t("Scheda chiusa", "Closed sheet") + title + " · " + dateText(ctx, sheet.closedAt);
  return ctx.t("Prossima sessione", "Next session") + title;
}
function sessionLine(ctx, sheet) {
  const session = sessionOf(ctx.state, sheet);
  if (session?.status === "live") return ctx.t("In corso al Tavolo", "Running at the Table");
  if (session?.status === "ended") return ctx.t("Terminata al Tavolo", "Ended at the Table");
  const n = nextSessionNumber(ctx.state);
  return ctx.t(
    `Al Tavolo sarà la sessione ${n}, quando la avvii da Tavolo › Sessione`,
    `At the Table it will be session ${n}, when you start it from Table › Session`,
  );
}
function endedBanner(ctx) {
  const pending = sheetToClose(ctx.state);
  if (!pending) return "";
  const left = pending.sheet.lists.secrets.filter((s) => !s.revealed).length;
  return `<div class="handouts-prep-banner" role="status" data-hs-prep-ended><p>${ctx.t(`La sessione ${pending.session.number} è terminata al Tavolo. Chiudi la scheda per riportare i ${left} segreti non rivelati.`, `Session ${pending.session.number} has ended at the Table. Close the sheet to carry the ${left} unrevealed secrets.`)}</p><button class="button primary" type="button" data-hs-prep-close>${ctx.t("Chiudi la scheda…", "Close the sheet…")}</button></div>`;
}

// SV-37: `readOnly` is false or the id of the sentence saying why the sheet is read-only.
function linkSelect(ctx, list, row, readOnly) {
  const disabled = readOnly ? `disabled aria-describedby="${readOnly}"` : "";
  const key = `${list}-${row?.id ?? "new"}-link`;
  const label = {
    scenes: ["Scena preparata", "Prepared scene"],
    monsters: ["Creatura", "Creature"],
    locations: ["Materiale", "Material"],
  }[list];
  if (!label) return "";
  const options =
    list === "scenes"
      ? ctx.state.scenes.map((s) => [s.id, s.name])
      : list === "monsters"
        ? Object.values(ctx.state.actors)
            .filter((a) => a.kind === "npc")
            .map((a) => [a.id, a.name])
        : (ctx.state.ext?.handouts?.materials ?? [])
            .filter((m) => m.kind !== "art")
            .map((m) => [m.id, m.title]);
  const current = row?.[LINK_KEY[list]] ?? "";
  const target = row ? linkTargetName(ctx.state, LINK_KEY[list], current) : "";
  const open = target
    ? `<button type="button" class="button quiet" data-hs-prep-open="${list}" data-row="${ctx.esc(row.id)}" data-target="${ctx.esc(current)}" aria-label="${ctx.t("Apri", "Open")}: ${ctx.esc(target)}">${ctx.t("Apri", "Open")}</button>`
    : "";
  return `<label class="handouts-prep-link"><span class="handouts-sr">${ctx.t(...label)}</span><select data-hs-prep-link="${list}" ${row ? `data-row="${ctx.esc(row.id)}"` : ""} data-focus-key="${ctx.esc(key)}" aria-label="${ctx.t(...label)}" ${disabled}><option value="">${ctx.t("Nessun collegamento", "No link")}</option>${options.map(([id, name]) => `<option value="${ctx.esc(id)}" ${id === current ? "selected" : ""}>${ctx.esc(name)}</option>`).join("")}</select></label>${open}`;
}
function listStep(ctx, sheet, list, readOnly) {
  const rows = sheet.lists[list];
  const secrets = list === "secrets";
  const body = rows.length
    ? `<ul class="handouts-prep-rows">${rows
        .map(
          (row) =>
            `<li class="handouts-prep-row ${secrets && row.revealed ? "is-revealed" : ""}">${secrets ? `<label class="handouts-check"><input type="checkbox" data-hs-prep-secret="${ctx.esc(row.id)}" data-focus-key="secret-${ctx.esc(row.id)}" ${row.revealed ? "checked" : ""} ${readOnly ? `disabled aria-describedby="${readOnly}"` : ""}><span>${ctx.t("Rivelato", "Revealed")}</span></label>` : ""}<input class="handouts-prep-text" value="${ctx.esc(row.text)}" data-hs-prep-row="${list}" data-row="${ctx.esc(row.id)}" data-focus-key="${list}-${ctx.esc(row.id)}" aria-label="${ctx.t("Voce", "Item")}" maxlength="${MAX_TEXT}" ${readOnly ? "readonly" : ""}>${linkSelect(ctx, list, row, readOnly)}${secrets && row.carriedFrom ? `<span class="badge">${ctx.t("Riportato", "Carried over")}</span>` : ""}${readOnly ? "" : `<button type="button" class="button quiet" data-hs-prep-remove="${list}" data-row="${ctx.esc(row.id)}" aria-label="${ctx.t("Rimuovi", "Remove")}: ${ctx.esc(row.text)}">${ctx.icon("close")}</button>`}</li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna voce.", "No items.")}</p>`;
  const add = readOnly
    ? ""
    : `<form class="handouts-prep-add" data-hs-prep-add="${list}"><input name="text" maxlength="${MAX_TEXT}" data-focus-key="${list}-add" aria-label="${ctx.t("Nuova voce", "New item")}: ${ctx.t(...stepLabel(list))}" placeholder="${ctx.t("Nuova voce…", "New item…")}">${linkSelect(ctx, list, null, false)}<button class="button" type="submit">${ctx.icon("plus")} ${ctx.t("Aggiungi", "Add")}</button></form>`;
  const count = secrets
    ? `<p class="handouts-prep-count" data-secret-count>${ctx.t(`${rows.filter((r) => r.revealed).length} di ${rows.length} rivelati`, `${rows.filter((r) => r.revealed).length} of ${rows.length} revealed`)}</p>`
    : "";
  return count + body + add;
}
const stepLabel = (id) => {
  const step = STEPS.find((s) => s.id === id);
  return [step.it, step.en];
};
function stepBody(ctx, sheet, step, readOnly) {
  if (step.id === "characters")
    return `<div class="handouts-prep-characters">${partyCharacters(ctx.state)
      .map(
        (c) =>
          `<label class="field">${ctx.esc(c.name)}<input value="${ctx.esc(sheet.characterNotes[c.id] ?? "")}" data-hs-prep-field="character:${ctx.esc(c.id)}" data-focus-key="character-${ctx.esc(c.id)}" maxlength="${MAX_TEXT}" ${readOnly ? "readonly" : ""}></label>`,
      )
      .join("")}</div>`;
  if (step.id === "strongStart")
    return `<label class="field"><span class="handouts-sr">${ctx.t("Inizio forte", "Strong start")}</span><textarea data-hs-prep-field="strongStart" data-focus-key="strongStart" maxlength="${MAX_TEXT}" aria-label="${ctx.t("Inizio forte", "Strong start")}" ${readOnly ? "readonly" : ""}>${ctx.esc(sheet.strongStart)}</textarea></label>`;
  return listStep(ctx, sheet, step.id, readOnly);
}
export function renderSheet(ctx, sheet, { readOnly = false } = {}) {
  const steps = STEPS.filter((step) => !sheet.minimal || step.essential);
  const ro = readOnly ? `hs-prep-ro-${ctx.esc(sheet.id)}` : false;
  readOnly = ro;
  return `<div class="handouts-prep-steps">${ro ? `<p class="muted" id="${ro}">${ctx.t("Scheda di una sessione chiusa: resta com’era. Le modifiche vanno nella scheda della prossima sessione.", "The sheet of a closed session stays as it was. Changes go in the next session’s sheet.")}</p>` : ""}${steps
    .map(
      (step) =>
        `<section class="handouts-prep-step" aria-labelledby="prep-step-${step.id}-${ctx.esc(sheet.id)}"><h3 id="prep-step-${step.id}-${ctx.esc(sheet.id)}"><span class="handouts-step-number">${STEPS.indexOf(step) + 1}</span>${ctx.t(step.it, step.en)}</h3><p class="muted">${ctx.t(...HINTS[step.id])}</p>${stepBody(ctx, sheet, step, readOnly)}</section>`,
    )
    .join("")}</div>`;
}
export function renderSessionPrep(ctx) {
  if (ctx.role !== "dm")
    return `<div class="empty-state"><h2>${ctx.t("Riservato al DM", "DM only")}</h2></div>`;
  const sheet = currentSheet(ctx.state);
  const history = closedSheets(ctx.state);
  const pending = pendingCarry(ctx.state);
  // Once the Table session has ended the banner offers closing: one button, not two.
  const banner = sheet ? endedBanner(ctx) : "";
  const header = sheet
    ? `<div class="handouts-prep-head"><div><h2>${sheetHeading(ctx, sheet)}</h2><p class="muted" data-hs-prep-session>${sessionLine(ctx, sheet)} · ${ctx.t("salvataggio automatico quando lasci un campo", "saved automatically when you leave a field")}</p></div><div class="toolbar"><label class="handouts-switch"><input type="checkbox" data-hs-prep-minimal data-focus-key="minimal" ${sheet.minimal ? "checked" : ""}> ${ctx.t("Solo i passi essenziali", "Essential steps only")}</label>${banner ? "" : `<button class="button" type="button" data-hs-prep-close>${ctx.t("Chiudi la scheda…", "Close the sheet…")}</button>`}</div></div>${banner}<label class="field handouts-prep-title">${ctx.t("Titolo della sessione", "Session title")}<input value="${ctx.esc(sheet.title)}" data-hs-prep-field="title" data-focus-key="title" maxlength="${MAX_TEXT}"></label>`
    : `<div class="empty-state"><h2>${ctx.t("Nessuna preparazione aperta", "No prep sheet open")}</h2><p>${
        pending.length
          ? ctx.t(
              `Crea la scheda dal modello in otto passi: tornano i ${pending.length} segreti non rivelati dell’ultima scheda.`,
              `Create the sheet from the eight-step template: the last sheet’s ${pending.length} unrevealed secrets come back.`,
            )
          : ctx.t(
              "Crea la scheda dal modello in otto passi. Nessun segreto da riportare.",
              "Create the sheet from the eight-step template. No secrets to carry.",
            )
      }</p><button class="button primary" type="button" data-hs-prep-new>${ctx.icon("plus")} ${ctx.t("Nuova scheda dal modello", "New sheet from template")}</button></div>`;
  return `<section class="handouts-prep" data-handouts-prep>${header}${sheet ? renderSheet(ctx, sheet) : ""}${
    history.length
      ? `<section class="handouts-prep-history"><h2>${ctx.t("Schede chiuse", "Closed sheets")}</h2>${history
          .map(
            (old) =>
              `<details class="handouts-prep-old"><summary>${sheetHeading(ctx, old)} · ${ctx.t(`${old.lists.secrets.filter((s) => s.revealed).length} segreti rivelati su ${old.lists.secrets.length}`, `${old.lists.secrets.filter((s) => s.revealed).length} of ${old.lists.secrets.length} secrets revealed`)}${old.carryDeclined ? ` · ${ctx.t("non riportati", "not carried")}` : ""}</summary><ul>${old.lists.secrets.map((s) => `<li>${s.revealed ? ctx.t("Rivelato", "Revealed") : ctx.t("Non rivelato", "Unrevealed")} — ${ctx.esc(s.text)}</li>`).join("")}</ul></details>`,
          )
          .join("")}</section>`
      : ""
  }</section>`;
}
export function bindSessionPrep(root, ctx) {
  const sheet = currentSheet(ctx.state);
  root
    .querySelector("[data-hs-prep-new]")
    ?.addEventListener("click", () =>
      commit(ctx, "Scheda di preparazione creata", "Prep sheet created", (d) =>
        createSheet(d, ctx.role),
      ),
    );
  if (!sheet) return;
  bindSheetControls(root, ctx, sheet.id);
  root
    .querySelector("[data-hs-prep-minimal]")
    ?.addEventListener("change", (e) =>
      commitKeepingFocus(ctx, "Passi della preparazione aggiornati", "Prep steps updated", (d) =>
        updateSheet(d, sheet.id, "minimal", e.target.checked, ctx.role),
      ),
    );
  root
    .querySelectorAll("[data-hs-prep-close]")
    .forEach((b) => b.addEventListener("click", () => closeDialog(ctx, sheet)));
}
/** The stored value behind a sheet input, to skip no-op saves and detect drafts. */
function storedValue(sheet, input) {
  const field = input.dataset.hsPrepField;
  if (field === "title" || field === "strongStart") return sheet[field];
  if (field?.startsWith("character:"))
    return sheet.characterNotes[field.slice("character:".length)] ?? "";
  return sheet.lists[input.dataset.hsPrepRow]?.find((r) => r.id === input.dataset.row)?.text;
}
function saveInput(ctx, sheetId, input, { keepFocus = true } = {}) {
  const sheet = currentSheet(ctx.state);
  if (!sheet || sheet.id !== sheetId || input.value.trim() === storedValue(sheet, input))
    return true;
  const mutate = input.dataset.hsPrepField
    ? (d) => updateSheet(d, sheetId, input.dataset.hsPrepField, input.value, ctx.role)
    : (d) =>
        updateRow(
          d,
          sheetId,
          input.dataset.hsPrepRow,
          input.dataset.row,
          { text: input.value },
          ctx.role,
        );
  if (keepFocus) {
    commitKeepingFocus(ctx, "Preparazione aggiornata", "Prep updated", mutate);
    return true;
  }
  return commit(ctx, "Preparazione aggiornata", "Prep updated", mutate);
}
export function bindSheetControls(root, ctx, sheetId) {
  root
    .querySelectorAll("[data-hs-prep-field], [data-hs-prep-row]")
    .forEach((input) => input.addEventListener("change", () => saveInput(ctx, sheetId, input)));
  root.querySelectorAll("select[data-hs-prep-link][data-row]").forEach((select) =>
    select.addEventListener("change", () => {
      const key = LINK_KEY[select.dataset.hsPrepLink];
      commitKeepingFocus(ctx, "Preparazione aggiornata", "Prep updated", (d) =>
        updateRow(
          d,
          sheetId,
          select.dataset.hsPrepLink,
          select.dataset.row,
          { [key]: select.value },
          ctx.role,
        ),
      );
    }),
  );
  root
    .querySelectorAll("[data-hs-prep-secret]")
    .forEach((box) =>
      box.addEventListener("change", () =>
        commitKeepingFocus(
          ctx,
          box.checked ? "Segreto rivelato in gioco" : "Segreto segnato come non rivelato",
          box.checked ? "Secret revealed in play" : "Secret marked unrevealed",
          (d) => setSecretRevealed(d, sheetId, box.dataset.hsPrepSecret, box.checked, ctx.role),
        ),
      ),
    );
  root
    .querySelectorAll("[data-hs-prep-open]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openLinkedRow(ctx, button.dataset.hsPrepOpen, button.dataset.target),
      ),
    );
  root
    .querySelectorAll("[data-hs-prep-remove]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        commit(ctx, "Voce rimossa dalla preparazione", "Item removed from prep", (d) =>
          removeRow(d, sheetId, button.dataset.hsPrepRemove, button.dataset.row, ctx.role),
        ),
      ),
    );
  root.querySelectorAll("[data-hs-prep-add]").forEach((form) =>
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const list = form.dataset.hsPrepAdd;
      const link = form.querySelector("select")?.value || null;
      const key = LINK_KEY[list];
      const input = { text: form.elements.text.value, ...(key ? { [key]: link } : {}) };
      if (
        commit(ctx, "Voce aggiunta alla preparazione", "Item added to prep", (d) =>
          addRow(d, sheetId, list, input, ctx.role),
        )
      )
        document.querySelector(`[data-focus-key="${list}-add"]`)?.focus();
    }),
  );
}
export function closeDialog(ctx, sheet) {
  const total = sheet.lists.secrets.length;
  const unrevealed = sheet.lists.secrets.filter((s) => !s.revealed).length;
  const session = sessionOf(ctx.state, sheet);
  const carryField = unrevealed
    ? `<label class="handouts-check"><input type="checkbox" name="carry" checked> ${ctx.t(`Riporta i ${unrevealed} segreti non rivelati in una nuova scheda`, `Carry the ${unrevealed} unrevealed secrets into a new sheet`)}</label><p class="muted">${ctx.t("Se non li riporti, la scheda successiva parte senza segreti e li trovi solo nello storico.", "If you do not carry them, the next sheet starts without secrets; they stay in the history.")}</p>`
    : `<input type="hidden" name="carry" value="on"><p class="muted">${ctx.t("Tutti i segreti sono stati rivelati: si apre una nuova scheda vuota.", "Every secret was revealed: a new empty sheet opens.")}</p>`;
  ctx.dialog(
    ctx.t("Chiudi la scheda: ", "Close the sheet: ") + sheetHeading(ctx, sheet, { html: false }),
    `<p>${ctx.t(`Segreti rivelati: ${total - unrevealed} su ${total}.`, `Secrets revealed: ${total - unrevealed} of ${total}.`)}</p>${carryField}${session?.status === "live" ? `<p class="muted">${ctx.t(`La sessione ${session.number} è ancora in corso: la termini da Tavolo › Sessione.`, `Session ${session.number} is still running: end it from Table › Session.`)}</p>` : ""}<p class="muted">${ctx.t("La scheda chiusa resta consultabile in sola lettura.", "The closed sheet stays available read-only.")}</p>`,
    {
      submitLabel: ctx.t("Chiudi la scheda", "Close the sheet"),
      onSubmit: (data) => {
        const carry = data.get("carry") === "on";
        ctx.commit(
          carry && unrevealed
            ? ctx.t("Scheda chiusa e segreti riportati", "Sheet closed and secrets carried")
            : ctx.t("Scheda di preparazione chiusa", "Prep sheet closed"),
          (d) => closeSheet(d, sheet.id, ctx.role, { carry }),
          { visibility: "private" },
        );
        ctx.toast(
          !carry
            ? ctx.t(
                "Scheda chiusa. Nessun segreto riportato: crea la prossima scheda quando vuoi.",
                "Sheet closed. No secrets carried: create the next sheet whenever you like.",
              )
            : unrevealed
              ? ctx.t(
                  `Scheda chiusa. Nuova scheda pronta con ${unrevealed} segreti riportati.`,
                  `Sheet closed. New sheet ready with ${unrevealed} carried secrets.`,
                )
              : ctx.t(
                  "Scheda chiusa. Nuova scheda pronta dal modello.",
                  "Sheet closed. New sheet ready from the template.",
                ),
        );
      },
    },
  );
}

/** Compact secrets list for the Table drawer: tick what surfaced during play. */
export function renderSecretsTab(ctx) {
  const sheet = currentSheet(ctx.state);
  if (!sheet)
    return `<p class="muted">${ctx.t("Nessuna scheda di preparazione aperta.", "No prep sheet open.")}</p><button class="button" type="button" data-handouts-open-prep>${ctx.t("Apri la preparazione", "Open prep")}</button>`;
  const secrets = sheet.lists.secrets;
  return `${endedBanner(ctx)}<p class="muted">${sheetHeading(ctx, sheet)} · <span data-secret-count>${ctx.t(`${secrets.filter((s) => s.revealed).length} di ${secrets.length} rivelati`, `${secrets.filter((s) => s.revealed).length} of ${secrets.length} revealed`)}</span></p><ul class="handouts-secret-list">${secrets
    .map(
      (s) =>
        `<li><label class="handouts-check"><input type="checkbox" data-hs-prep-secret="${ctx.esc(s.id)}" data-focus-key="secret-${ctx.esc(s.id)}" ${s.revealed ? "checked" : ""}><span>${ctx.esc(s.text)}</span></label>${s.carriedFrom ? `<span class="badge">${ctx.t("Riportato", "Carried over")}</span>` : ""}</li>`,
    )
    .join(
      "",
    )}</ul><button class="button quiet" type="button" data-handouts-open-prep>${ctx.t("Apri la scheda completa", "Open the full sheet")}</button>`;
}
export function bindSecretsTab(el, ctx) {
  const sheet = currentSheet(ctx.state);
  el.querySelectorAll("[data-handouts-open-prep]").forEach((b) =>
    b.addEventListener("click", () => ctx.navigate("preparation", { tab: "handouts-session" })),
  );
  if (!sheet) return;
  bindSheetControls(el, ctx, sheet.id);
  el.querySelectorAll("[data-hs-prep-close]").forEach((b) =>
    b.addEventListener("click", () => closeDialog(ctx, sheet)),
  );
}

// A sheet field being typed in, not yet saved (autosave runs when the field is left).
function unsavedInput(ctx) {
  if (typeof document === "undefined" || ctx.role !== "dm") return null;
  const input = document.activeElement;
  if (!input?.matches?.("[data-hs-prep-field], [data-hs-prep-row]")) return null;
  const sheet = currentSheet(ctx.state);
  const stored = sheet ? storedValue(sheet, input) : undefined;
  return stored !== undefined && input.value.trim() !== stored ? { sheet, input } : null;
}

export function registerSessionPrep(registry, { openMaterial = null } = {}) {
  hooks.openMaterial = openMaterial;
  registry.registerStateSlice(PREP_SLICE, {
    version: PREP_VERSION,
    seed: seedPrep,
    normalize: normalizePrep,
  });
  registry.add("preparation-section", {
    id: "handouts-session",
    group: "sessions",
    label: { it: "Sessione", en: "Session prep" },
    description: {
      it: "Scheda in otto passi con segreti riportati",
      en: "Eight-step sheet with carried secrets",
    },
    roles: ["dm"],
    order: 30,
    render: (ctx) => renderSessionPrep(ctx),
    bind: (el, ctx) => bindSessionPrep(el, ctx),
  });
  // The session ended at the Table: offer to close the sheet and carry the secrets.
  registry.add("notifications", {
    id: "handouts-prep-notices",
    label: { it: "Preparazione della sessione", en: "Session prep" },
    roles: ["dm"],
    collect: (ctx) => {
      const pending = sheetToClose(ctx.state);
      if (!pending) return [];
      const left = pending.sheet.lists.secrets.filter((s) => !s.revealed).length;
      return [
        {
          id: `handouts-prep-close-${pending.sheet.id}-${pending.session.id}`,
          title: {
            it: `Sessione ${pending.session.number} terminata: chiudi la scheda di preparazione`,
            en: `Session ${pending.session.number} ended: close the prep sheet`,
          },
          body: {
            it: `${left} segreti non rivelati da riportare`,
            en: `${left} unrevealed secrets to carry`,
          },
          ...(Number.isFinite(pending.session.endedAt)
            ? { time: new Date(pending.session.endedAt).toISOString() }
            : {}),
          category: "handouts",
          target: { page: "preparation", params: { tab: "handouts-session" } },
        },
      ];
    },
  });
  // Typing in a sheet field and leaving the page: save it first (Registry draft guard);
  // on reload the browser asks before discarding it.
  registry.add("draft-guard", {
    id: "handouts-prep-draft",
    label: { it: "Scheda di preparazione", en: "Prep sheet" },
    roles: ["dm"],
    hasDraft: (ctx) => Boolean(unsavedInput(ctx)),
    confirm: (ctx, proceed) => {
      const pending = unsavedInput(ctx);
      if (pending && !saveInput(ctx, pending.sheet.id, pending.input, { keepFocus: false })) return;
      proceed();
    },
  });
}
