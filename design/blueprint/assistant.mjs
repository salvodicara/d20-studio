// Area B60 — Simulated AI assistant for DMs and players (DECLARED SIMULATION: no model,
// no network, no cost; GAP-18 stays an owner decision for the real product). Entry
// module loaded by extensions.mjs through the B11 registry.
//
// Where it lives: campaign section "Assistente" (Ask / Write / Session recap for the DM /
// Consent and data), an entry-level panel on journal, world and note pages, a Table
// drawer for quick questions, notifications, a palette command and a personal setting
// for the answer engine. Domain rules and pattern sources: assistant-domain.mjs.

import * as D from "./assistant-domain.mjs";
import {
  applyCampaignDraft,
  createCampaignDraft,
  getCampaignDraft,
  getCampaignEntry,
  previewCampaignDraft,
  saveCampaignDraft,
  setCampaignEntryAccess,
} from "./campaign-content.mjs";
// B16's "Add to scene" flow (createSceneNPC + placeSceneToken with the SRD block values).
import { addCreatureToScene } from "./compendium.mjs";
import { getEntry } from "./srd-compendium.mjs";

const L = (it, en) => ({ it, en });
const uid = () => globalThis.crypto?.randomUUID?.() ?? `as-${Date.now()}-${Math.random()}`;
const cssId = (value) =>
  globalThis.CSS?.escape ? globalThis.CSS.escape(value) : String(value).replace(/[^\w-]/g, "\\$&");
const TABS = ["ask", "write", "review", "consent"];
const ENGINE = "assistant-engine.engine";
const PRIVATE = { local: true, visibility: "private", undoable: false };
const SHARED = { undoable: false };

let area = null;
// Transient view state: never shared, cleared on role change and example reset.
const ui = {
  focus: null,
  open: {},
  discarded: null,
  review: null,
  openReviewId: null,
  removedBeat: null,
  confirmClear: false,
  entry: null,
  editor: null,
  caret: null,
  slash: null,
  errors: {},
  localDraft: null,
};
export function resetAssistantView() {
  Object.assign(ui, {
    focus: null,
    open: {},
    discarded: null,
    review: null,
    openReviewId: null,
    removedBeat: null,
    confirmClear: false,
    entry: null,
    editor: null,
    caret: null,
    slash: null,
    errors: {},
    localDraft: null,
  });
}
export function hasAssistantDraft(ctx) {
  return Boolean(ui.review?.dirty && ui.review.owner === ctx?.role);
}

// ------------------------------------------------------------------------ helpers

const slice = (state) => area.slice(state);
const campaignId = (ctx) => ctx.state.campaign?.id ?? null;
const record = (ctx) => D.campaignRecord(slice(ctx.state), campaignId(ctx));
const member = (ctx) =>
  Boolean(campaignId(ctx)) &&
  D.consentList(ctx.state, slice(ctx.state)).some((m) => m.id === ctx.role);
const dm = (ctx) => D.isDm(ctx.state, ctx.role);
const pick = (ctx, value) =>
  value && typeof value === "object" ? ctx.label(value) : String(value ?? "");
function errorText(ctx, error) {
  return error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
}
function when(ctx, value) {
  if (!value) return ctx.t("data non indicata", "date not given");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return ctx.t("data non indicata", "date not given");
  return new Intl.DateTimeFormat(ctx.lang === "en" ? "en-GB" : "it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
function day(ctx, value) {
  return new Intl.DateTimeFormat(ctx.lang === "en" ? "en-GB" : "it-IT", {
    dateStyle: "medium",
  }).format(new Date(value));
}
function memberName(ctx, id) {
  const row = D.consentList(ctx.state, slice(ctx.state)).find((m) => m.id === id);
  if (!row) return ctx.t("Persona non più nel gruppo", "Person no longer in the group");
  if (["dm", "co-dm"].includes(row.role)) return "DM";
  const [it, en] = String(row.name).includes(" / ") ? row.name.split(" / ") : [row.name, row.name];
  const name = ctx.lang === "en" ? en : it;
  const hero = Object.values(ctx.state.actors ?? {}).find(
    (actor) =>
      actor?.kind === "character" &&
      actor.owner === id &&
      actor.visibility !== "private" &&
      (actor.campaignIds ?? [campaignId(ctx)]).includes(campaignId(ctx)),
  );
  return hero ? `${name} · ${hero.name}` : name;
}
/** Runs a user action; a refusal becomes an inline error for `form` and a toast. */
function attempt(ctx, form, fn) {
  try {
    ui.errors[form] = "";
    return fn() ?? true;
  } catch (error) {
    const text = errorText(ctx, error);
    ui.errors[form] = text;
    ui.focus = null;
    ctx.toast(text, true);
    ctx.render();
    return false;
  }
}
/** One atomic change on this area's slice (and, when needed, on campaign content). */
function change(ctx, it, en, fn, options = PRIVATE) {
  let result;
  ctx.commit(
    ctx.t(`Assistente · ${it}`, `Assistant · ${en}`),
    (draft) => {
      result = fn(draft, slice(draft));
    },
    options,
  );
  return result;
}
function engine(ctx) {
  try {
    return area.getSetting(ctx, ENGINE);
  } catch {
    return "demo";
  }
}
function focusLater(selector) {
  ui.focus = selector;
}
function applyFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus);
  if (target) {
    ui.focus = null;
    target.focus?.();
  }
}
/** "1 fonte" / "3 fonti": [itOne, itMany], [enOne, enMany]. */
function count(ctx, n, [itOne, itMany], [enOne, enMany]) {
  return `${n} ${n === 1 ? ctx.t(itOne, enOne) : ctx.t(itMany, enMany)}`;
}
/** The inline refusal of a form or card, announced to screen readers. */
const errorLine = (ctx, form) =>
  ui.errors[form] ? `<p class="error" role="alert">${ctx.esc(ui.errors[form])}</p>` : "";
const simBadge = (ctx) =>
  `<span class="badge assistant-sim-badge">${ctx.t("Simulazione", "Simulation")}</span>`;

// ------------------------------------------------------------------------ answers

function citeButton(ctx, row, n, citation, compact = false) {
  const name = citation?.gone
    ? ctx.t("fonte non più accessibile", "source no longer accessible")
    : D.sourceName(citation, ctx.lang);
  // Quest Portal Library Link (VTL-197): a citation opens the page it used. In the Table
  // drawer (compact) it points at the numbered source instead, so play is not left.
  const opens = !compact && !citation?.gone && citation?.route?.page;
  return `<button type="button" class="assistant-cite" data-assistant-cite="${n}" data-row="${ctx.esc(row.id)}"${opens ? ` data-assistant-source="${ctx.esc(JSON.stringify(citation.route))}"` : ""} aria-label="${ctx.esc(opens ? ctx.t(`Apri la fonte ${n}: ${name}`, `Open source ${n}: ${name}`) : ctx.t(`Fonte ${n}: ${name}`, `Source ${n}: ${name}`))}">[${n}]</button>`;
}
function answerText(ctx, row, compact = false) {
  const byN = new Map((row.citations ?? []).map((c) => [c.n, c]));
  const piece = (part) => {
    const cites = (part.cites ?? [])
      .map((n) => citeButton(ctx, row, n, byN.get(n), compact))
      .join("");
    if (part.t) return `<span class="assistant-said">${ctx.esc(ctx.label(part.t))}</span>`;
    if (part.q !== undefined)
      return `<span class="assistant-quote">${ctx.esc(part.q)}</span>${cites}`;
    return cites;
  };
  const parts = row.answer?.parts ?? [];
  // A written proposal reads as lines (each label opens one); an answer reads as prose.
  const lines = [];
  for (const part of parts)
    if (row.kind === "write" && part.t) lines.push([part]);
    else if (lines.length) lines.at(-1).push(part);
    else lines.push([part]);
  const html =
    row.kind === "write"
      ? lines
          .map(
            (line) => `<p class="assistant-text assistant-line">${line.map(piece).join(" ")}</p>`,
          )
          .join("")
      : `<p class="assistant-text">${parts.map(piece).join(" ")}</p>`;
  const hidden = row.answer?.hidden
    ? `<p class="assistant-hidden">${ctx.t(`${row.answer.hidden} ${row.answer.hidden === 1 ? "parte nascosta" : "parti nascoste"}: la fonte non è più accessibile o non dice più quel testo.`, `${row.answer.hidden} ${row.answer.hidden === 1 ? "part" : "parts"} hidden: the source is no longer accessible or no longer says that text.`)}</p>`
    : "";
  return `${html}${hidden}`;
}
const RESTRICTED = {
  dm: L("Riservato al DM", "DM only"),
  whisper: L("Sussurro", "Whisper"),
  some: L("Non tutto il gruppo lo legge", "Not the whole group reads it"),
};
function citationList(ctx, row, { compact = false } = {}) {
  if (!row.citations?.length) return "";
  return `<ol class="assistant-citations" aria-label="${ctx.esc(ctx.t("Fonti citate", "Cited sources"))}">${row.citations
    .map((c) => {
      if (c.gone)
        return `<li id="assistant-cite-${ctx.esc(row.id)}-${c.n}" tabindex="-1"><strong>[${c.n}]</strong> ${ctx.esc(ctx.label(c.title))}</li>`;
      const tag = c.restricted
        ? `<span class="badge assistant-restricted">${ctx.esc(ctx.label(RESTRICTED[c.restricted] ?? RESTRICTED.some))}</span>`
        : "";
      const changed = c.changed
        ? `<p class="assistant-hidden">${ctx.t("Il testo citato non è più in questa fonte.", "The quoted text is no longer in this source.")}</p>`
        : "";
      return `<li id="assistant-cite-${ctx.esc(row.id)}-${c.n}" tabindex="-1"><div class="assistant-cite-head"><strong>[${c.n}] ${ctx.esc(D.sourceName(c, ctx.lang))}</strong>${tag}${c.at ? `<small>${ctx.esc(when(ctx, c.at))}</small>` : ""}${c.location ? `<small>${ctx.esc(ctx.label(c.location))}</small>` : ""}</div>${c.excerpt?.length ? `<blockquote>${c.excerpt.map((line) => ctx.esc(line)).join(" ")}</blockquote>` : ""}${changed}${compact ? "" : `<button type="button" class="button quiet" data-assistant-source="${ctx.esc(JSON.stringify(c.route ?? {}))}">${ctx.t("Apri la fonte", "Open the source")}</button>`}</li>`;
    })
    .join("")}</ol>`;
}
function projected(ctx, row) {
  return D.projectHistoryRow(row, D.accessibleKeys(ctx.state, slice(ctx.state), ctx.role));
}
/**
 * Where a kept proposal is now, read from its note draft (a kept text is not a promise:
 * the draft may still be open, saved or discarded). [short, long] labels.
 */
function keptState(ctx, row) {
  let draft = null;
  try {
    draft = row.keptDraftId ? getCampaignDraft(ctx.state, row.keptDraftId, ctx.role) : null;
  } catch {}
  if (draft?.status === "applied")
    return [ctx.t("Salvata", "Saved"), ctx.t("Salvata nella nota", "Saved in the note")];
  if (draft?.status === "active")
    return row.keptHow === "inserted"
      ? [
          ctx.t("Inserita", "Inserted"),
          ctx.t("Inserita nella bozza della nota", "Inserted into the note draft"),
        ]
      : [ctx.t("In bozza", "In a draft"), ctx.t("In una bozza degli appunti", "In a notes draft")];
  return [
    ctx.t("Bozza scartata", "Draft discarded"),
    ctx.t("La bozza della nota è stata scartata", "The note draft was discarded"),
  ];
}
/** A projected answer whose cited parts are all hidden now: nothing readable to keep. */
function emptiedRow(row) {
  return Boolean(row.answer?.hidden) && !(row.answer.parts ?? []).some((p) => p.cites?.length);
}
const emptiedFail = () =>
  D.fail(
    "La proposta non contiene più testo che puoi leggere: riprova o scartala.",
    "The proposal no longer holds text you can read: try again or discard it.",
  );
/** The NPC created from a proposal, while it still exists (gameplay Undo may remove it). */
function createdNpc(ctx, row) {
  const actor = row.npcActorId ? ctx.state.actors?.[row.npcActorId] : null;
  return actor && actor.kind === "npc" ? actor : null;
}
function answerCard(ctx, raw, { compact = false, editor = null } = {}) {
  const row = projected(ctx, raw);
  const write = row.kind === "write";
  const heading = write
    ? `${ctx.label(D.themeLabel(row.request?.theme))}${row.request?.prompt ? ` · ${row.request.prompt}` : ""}`
    : row.question;
  const status =
    row.status === "kept"
      ? `<span class="badge assistant-kept">${ctx.esc(keptState(ctx, row)[1])}</span>`
      : `<span class="badge">${ctx.t("Proposta da rivedere", "Proposal to review")}</span>`;
  const attemptBadge = row.attempt
    ? `<span class="badge">${ctx.t(`Tentativo ${row.attempt + 1}`, `Attempt ${row.attempt + 1}`)}</span>`
    : "";
  let body;
  if (row.engine === "external" && !row.answer && row.promptWithheld) {
    body = `<p class="assistant-hidden">${ctx.t("Il prompt citava un testo che non puoi più leggere: fai di nuovo la domanda per averne uno aggiornato.", "The prompt quoted text you can no longer read: ask again for an updated one.")}</p>`;
  } else if (row.engine === "external" && !row.answer) {
    body = `<p class="muted">${ctx.t("Motore: il tuo modello. Copia il prompt, incollalo nel tuo strumento e riporta qui la risposta. Il prompt contiene solo le fonti che puoi leggere.", "Engine: your own model. Copy the prompt, paste it into your tool and bring the answer back here. The prompt holds only sources you can read.")}</p>
<label class="field">${ctx.t("Prompt da copiare", "Prompt to copy")}<textarea readonly rows="8" data-assistant-prompt="${ctx.esc(row.id)}">${ctx.esc(row.prompt)}</textarea></label>
<div class="toolbar"><button type="button" class="button" data-assistant-act="copy" data-row="${ctx.esc(row.id)}">${ctx.t("Copia il prompt", "Copy the prompt")}</button></div>
<form data-assistant-form="external" data-row="${ctx.esc(row.id)}"><label class="field">${ctx.t("Risposta del tuo modello", "Your model’s answer")}<textarea name="answer" rows="4" maxlength="${D.MAX_EXTERNAL}" data-assistant-external></textarea></label>${ui.errors.external ? `<p class="error" role="alert">${ctx.esc(ui.errors.external)}</p>` : ""}<button type="submit" class="button primary">${ctx.t("Registra la risposta", "Record the answer")}</button></form>`;
  } else {
    const issues = (row.answer?.issues ?? [])
      .map((issue) =>
        issue.code === "unknown"
          ? ctx.t(
              `Citazioni che non corrispondono a nessuna fonte: [${issue.numbers.join("], [")}]. Verificale.`,
              `Citations matching no source: [${issue.numbers.join("], [")}]. Check them.`,
            )
          : ctx.t(
              "La risposta non cita nessuna fonte: verificala.",
              "The answer cites no source: check it.",
            ),
      )
      .map((text) => `<p class="error">${ctx.esc(text)}</p>`)
      .join("");
    body = `${row.answer?.external ? `<p class="muted">${ctx.t("Risposta incollata dal tuo modello: l’app non l’ha scritta né controllata nel merito.", "Answer pasted from your own model: the app neither wrote nor checked its content.")}</p>` : ""}${row.engine === "local" ? `<p class="muted assistant-local-label" data-assistant-local-label>${ctx.esc(ctx.t(`Risposta simulata del modello locale «${row.local?.model ?? ""}»: nessuna richiesta è uscita dal browser.`, `Simulated answer of the local model “${row.local?.model ?? ""}”: no request left the browser.`))}</p>` : ""}${answerText(ctx, row, compact)}${issues}${citationList(ctx, row, { compact })}`;
  }
  const id = ctx.esc(row.id);
  // Every cited part hidden since (a source changed): nothing left to keep; Try again
  // answers from what the reader may read now.
  const emptied = emptiedRow(row);
  const found = Boolean(row.answer?.found) && !emptied;
  const discard = `<button type="button" class="button quiet" data-assistant-act="discard" data-row="${id}">${ctx.t("Scarta", "Discard")}</button>`;
  // Quest Portal AI notes (VTL-217): inside the note editor Keep inserts the text at the
  // cursor of that note; a separate private note stays available as the second choice.
  // SV-45 (VTL-218): the DM turns an NPC proposal into a campaign NPC with the proposed
  // SRD 5.2.1 stat block (changeable), through B16's "Add to scene" flow.
  const npcActor = write && row.request?.theme === "npc" ? createdNpc(ctx, row) : null;
  const npc =
    found && write && row.request?.theme === "npc" && dm(ctx) && !compact
      ? npcActor
        ? `<button type="button" class="button" data-assistant-act="open-npc" data-actor="${ctx.esc(npcActor.id)}">${ctx.t(`Apri la scheda di ${npcActor.name}`, `Open ${npcActor.name}’s sheet`)}</button>`
        : `<button type="button" class="button" data-assistant-act="npc" data-row="${id}">${ctx.t("Crea il PNG…", "Create the NPC…")}</button>`
      : "";
  const actions = !found
    ? `${emptied && ["demo", "local"].includes(row.engine) ? `<button type="button" class="button" data-assistant-act="retry" data-row="${id}">${ctx.t("Riprova", "Try again")}</button>` : ""}${discard}`
    : editor
      ? `<button type="button" class="button primary" data-assistant-act="insert" data-row="${id}">${ctx.t("Tieni: inserisci nel testo", "Keep: insert into the text")}</button><button type="button" class="button" data-assistant-act="retry" data-row="${id}">${ctx.t("Riprova", "Try again")}</button>${discard}<button type="button" class="button quiet" data-assistant-act="keep" data-row="${id}">${ctx.t("In una nuova nota", "In a new note")}</button>${npc}`
      : write
        ? `<button type="button" class="button primary" data-assistant-act="keep" data-row="${id}">${ctx.t("Tieni", "Keep")}</button>${npc}<button type="button" class="button" data-assistant-act="retry" data-row="${id}">${ctx.t("Riprova", "Try again")}</button>${discard}`
        : `${["demo", "local"].includes(row.engine) ? `<button type="button" class="button" data-assistant-act="retry" data-row="${id}">${ctx.t("Riprova", "Try again")}</button>` : ""}<button type="button" class="button" data-assistant-act="keep" data-row="${id}">${ctx.t("Salva negli appunti", "Save to notes")}</button>${discard}`;
  const npcBadge = npcActor
    ? `<span class="badge assistant-kept">${ctx.t("PNG creato", "NPC created")}</span>`
    : "";
  return `<article class="assistant-answer${compact ? " compact" : ""}" data-assistant-row="${ctx.esc(row.id)}" aria-labelledby="assistant-q-${ctx.esc(row.id)}">
<header><h3 id="assistant-q-${ctx.esc(row.id)}" tabindex="-1">${ctx.esc(heading)}</h3><div class="assistant-badges">${simBadge(ctx)}${status}${npcBadge}${attemptBadge}</div></header>
${body}
<div class="toolbar assistant-actions">${actions}</div>
</article>`;
}
function currentRow(ctx, kind) {
  const rows = (slice(ctx.state).history?.[ctx.role] ?? []).filter(
    (row) => row.kind === kind && row.campaignId === campaignId(ctx) && row.status !== "discarded",
  );
  return rows.find((row) => row.id === ui.open[ctx.role + kind]) ?? rows.at(-1) ?? null;
}
function discardedBar(ctx, kind) {
  const last = ui.discarded;
  if (!last || last.role !== ctx.role || last.kind !== kind) return "";
  const row = slice(ctx.state).history?.[ctx.role]?.find((r) => r.id === last.id);
  if (!row || row.status !== "discarded") return "";
  return `<p class="assistant-restore" role="status">${kind === "write" ? ctx.t("Proposta scartata.", "Proposal discarded.") : ctx.t("Risposta scartata.", "Answer discarded.")} <button type="button" class="button quiet" data-assistant-act="restore" data-row="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button></p>`;
}
function historyList(ctx, kind) {
  const rows = (slice(ctx.state).history?.[ctx.role] ?? [])
    .filter((row) => row.kind === kind && row.campaignId === campaignId(ctx))
    .slice()
    .reverse();
  if (!rows.length) return "";
  const current = currentRow(ctx, kind);
  return `<section class="assistant-history" aria-labelledby="assistant-history-${kind}"><h3 id="assistant-history-${kind}">${kind === "write" ? ctx.t("Le tue proposte", "Your proposals") : ctx.t("Le tue domande", "Your questions")}</h3><p class="muted">${ctx.t("Solo tu vedi questa cronologia: il DM e gli altri membri non la leggono.", "Only you see this history: the DM and other members do not read it.")}</p><ul class="item-list">${rows
    .map((row) => {
      const title =
        kind === "write"
          ? `${ctx.label(D.themeLabel(row.request?.theme))}${row.request?.prompt ? ` · ${row.request.prompt}` : ""}`
          : row.question;
      const state =
        row.status === "discarded"
          ? ctx.t("Scartata", "Discarded")
          : row.status === "kept"
            ? keptState(ctx, row)[0]
            : ctx.t("Proposta", "Proposal");
      const action =
        row.status === "discarded"
          ? `<button type="button" class="button quiet" data-assistant-act="restore" data-row="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button>`
          : row.id === current?.id
            ? `<span class="badge">${ctx.t("Mostrata sopra", "Shown above")}</span>`
            : `<button type="button" class="button quiet" data-assistant-act="show" data-row="${ctx.esc(row.id)}" data-kind="${kind}">${ctx.t("Mostra", "Show")}</button>`;
      return `<li class="item-row"><div><strong>${ctx.esc(title)}</strong><small>${ctx.esc(when(ctx, row.at))} · ${ctx.esc(state)}</small></div>${action}</li>`;
    })
    .join("")}</ul></section>`;
}
function scopeNote(ctx) {
  const { sources, excluded } = D.collectSources(ctx.state, slice(ctx.state), ctx.role);
  const counts = {};
  for (const source of sources)
    counts[pick(ctx, source.type)] = (counts[pick(ctx, source.type)] ?? 0) + 1;
  const waiting = Object.entries(excluded.consent)
    .map(([id, n]) => `${memberName(ctx, id)}: ${n}`)
    .join(", ");
  return `<details class="assistant-scope"><summary>${ctx.t(`Cerca in ${sources.length} fonti che puoi leggere`, `Searches ${sources.length} sources you can read`)}</summary><ul>${Object.entries(
    counts,
  )
    .map(([name, n]) => `<li>${ctx.esc(name)}: ${n}</li>`)
    .join(
      "",
    )}</ul><p class="muted">${ctx.t("Mai lette: note e sezioni «Solo io», messaggi «Solo io» in chat, schede private, eventi privati del registro.", "Never read: “Only me” notes and sections, “Only me” chat messages, private sheets, private log events.")}${excluded.personal ? " " + ctx.t(`Escluse ora: ${excluded.personal} tue voci private.`, `Excluded now: ${excluded.personal} of your private items.`) : ""}${waiting ? " " + ctx.t(`Senza consenso (in attesa, non dato o revocato): ${waiting}.`, `Without consent (pending, declined or withdrawn): ${waiting}.`) : ""}</p></details>`;
}

// ------------------------------------------------------------------------ tabs

function disabledNotice(ctx) {
  return `<div class="empty-state assistant-off"><h2>${ctx.t("L’assistente non è attivo in questa campagna", "The assistant is not active in this campaign")}</h2><p>${dm(ctx) ? ctx.t("Puoi attivarlo in Consenso e dati: vedrai cosa legge e cosa non legge mai prima di confermare.", "You can turn it on in Consent and data: you will see what it reads and never reads before confirming.") : ctx.t("Il DM può attivarlo per la campagna. Finché è spento non legge nulla.", "The DM can turn it on for the campaign. While off it reads nothing.")}</p><button type="button" class="button" data-assistant-tab="consent">${ctx.t("Apri Consenso e dati", "Open Consent and data")}</button></div>`;
}
// SV-46 (Foundry LLM modules, SillyTavern's API connection): address, model name and a
// connection test, all simulated; the panel says that no request leaves the browser.
function localEngineLine(ctx) {
  const local = D.localModelOf(slice(ctx.state), ctx.role);
  return local
    ? ctx.esc(
        ctx.t(
          `Motore: modello locale «${local.model}» (simulato: nessuna richiesta esce dal browser).`,
          `Engine: local model “${local.model}” (simulated: no request leaves the browser).`,
        ),
      )
    : ctx.t(
        "Motore: modello locale, non ancora collegato: indica indirizzo e nome.",
        "Engine: local model, not connected yet: give its address and name.",
      );
}
function localPanel(ctx) {
  const saved = D.localModelOf(slice(ctx.state), ctx.role);
  const draft = ui.localDraft ?? saved ?? { endpoint: D.LOCAL_EXAMPLE, model: "" };
  const test = saved?.test;
  const result = test
    ? `<p class="assistant-local-result" role="status" data-assistant-local-test>${ctx.esc(ctx.t(`Prova simulata riuscita (${when(ctx, test.at)}): nessuna richiesta è uscita dal browser. Con un modello vero, l’app chiederebbe a ${test.endpoint} il modello «${test.model}».`, `Simulated test passed (${when(ctx, test.at)}): no request left the browser. With a real model, the app would ask ${test.endpoint} for the model “${test.model}”.`))}</p>`
    : `<p class="muted assistant-local-result" role="status" data-assistant-local-test>${saved ? ctx.t("Non ancora provato.", "Not tested yet.") : ""}</p>`;
  const why = saved
    ? ""
    : `<p class="muted" id="assistant-local-why">${ctx.t("Serve un indirizzo salvato: scrivilo qui sopra e premi «Salva».", "A saved address is needed: write it above and press “Save”.")}</p>`;
  return `<div class="assistant-local" data-assistant-local><p class="muted">${ctx.t("Come i moduli LLM di Foundry e la connessione API di SillyTavern: l’indirizzo del tuo modello (Ollama, LM Studio) e il suo nome. Sono accettati solo indirizzi di questo computer o della rete di casa. Nel prototipo nessuna richiesta lascia il browser: le risposte vengono dal generatore dimostrativo e sono segnate «risposta simulata del modello locale».", "Like Foundry’s LLM modules and SillyTavern’s API connection: your model’s address (Ollama, LM Studio) and its name. Only addresses of this computer or the home network are accepted. In the prototype no request leaves the browser: answers come from the demonstration generator and are marked “simulated answer of the local model”.")}</p><form class="assistant-local-form" data-assistant-form="local"><label class="field">${ctx.t("Indirizzo (endpoint)", "Address (endpoint)")}<input name="endpoint" inputmode="url" autocomplete="off" spellcheck="false" maxlength="200" value="${ctx.esc(draft.endpoint ?? "")}" placeholder="${ctx.esc(D.LOCAL_EXAMPLE)}" data-assistant-local-endpoint></label><label class="field">${ctx.t("Nome del modello", "Model name")}<input name="model" autocomplete="off" spellcheck="false" maxlength="${D.MAX_MODEL}" value="${ctx.esc(draft.model ?? "")}" placeholder="llama3.1" data-assistant-local-model></label><div class="toolbar"><button type="submit" class="button primary">${ctx.t("Salva", "Save")}</button><button type="button" class="button" data-assistant-act="test-local" ${saved ? "" : 'disabled aria-describedby="assistant-local-why"'}>${ctx.t("Prova la connessione", "Test the connection")}</button></div>${why}</form>${errorLine(ctx, "local")}${result}</div>`;
}
function askTab(ctx) {
  if (!record(ctx).enabled) return disabledNotice(ctx);
  const current = currentRow(ctx, "ask");
  const external = engine(ctx) === "external";
  return `<section class="assistant-block" aria-labelledby="assistant-ask-title"><h2 id="assistant-ask-title">${ctx.t("Chiedi all’assistente", "Ask the assistant")}</h2>
<form class="assistant-ask" data-assistant-form="ask"><label class="field">${ctx.t("La tua domanda", "Your question")}<input name="question" maxlength="${D.MAX_QUESTION}" autocomplete="off" placeholder="${ctx.esc(ctx.t("Es. Chi ha riacceso la lanterna?", "E.g. Who is Oben?"))}" data-assistant-question></label><button type="submit" class="button primary">${ctx.t("Chiedi", "Ask")}</button></form>
${ui.errors.ask ? `<p class="error" role="alert">${ctx.esc(ui.errors.ask)}</p>` : ""}
<p class="muted assistant-engine-line">${external ? ctx.t("Motore: il tuo modello (prompt da copiare, nessuna chiave).", "Engine: your own model (prompt to copy, no key).") : engine(ctx) === "local" ? localEngineLine(ctx) : ctx.t("Motore: generatore dimostrativo in questo browser.", "Engine: demonstration generator in this browser.")} <button type="button" class="text-button" data-assistant-tab="consent">${ctx.t("Cambia", "Change")}</button></p>
${scopeNote(ctx)}
${discardedBar(ctx, "ask")}
${current ? answerCard(ctx, current) : (slice(ctx.state).history?.[ctx.role] ?? []).some((row) => row.kind === "ask" && row.campaignId === campaignId(ctx)) ? "" : `<p class="muted">${ctx.t("Nessuna domanda finora. Le risposte citano sempre le voci usate; se le fonti non bastano, lo dicono.", "No questions yet. Answers always cite the entries used; when sources are not enough, they say so.")}</p>`}
${historyList(ctx, "ask")}</section>`;
}
function contextPicker(ctx, chosen = []) {
  const { sources } = D.collectSources(ctx.state, slice(ctx.state), ctx.role);
  const pickable = sources.filter((s) => ["entry", "material"].includes(s.kind)).slice(0, 24);
  return `<fieldset class="assistant-context"><legend>${ctx.t("Contesto", "Context")}</legend><p class="muted">${ctx.t(`Nessuna scelta = tutte le fonti che puoi leggere (${sources.length}).`, `No choice = every source you can read (${sources.length}).`)}</p>${pickable
    .map(
      (s) =>
        `<label class="campaign-check"><input type="checkbox" name="keys" value="${ctx.esc(s.key)}" ${chosen.includes(s.key) ? "checked" : ""}>${ctx.esc(D.sourceName({ type: s.type, title: s.title }, ctx.lang))}${s.restricted === "dm" ? ` · ${ctx.t("riservato al DM", "DM only")}` : ""}</label>`,
    )
    .join("")}</fieldset>`;
}
function writeTab(ctx) {
  if (!record(ctx).enabled) return disabledNotice(ctx);
  const current = currentRow(ctx, "write");
  // The form keeps the request shown below, so Try again and small edits start from it.
  const request = current?.request ?? {};
  return `<section class="assistant-block" aria-labelledby="assistant-write-title"><h2 id="assistant-write-title">${ctx.t("Scrivi con l’assistente", "Write with the assistant")}</h2>
<p class="muted">${ctx.t("Scegli un tema, una richiesta e il contesto. La proposta resta tua da rivedere: Tieni la apre come bozza privata negli appunti.", "Pick a theme, a request and the context. The proposal is yours to review: Keep opens it as a private draft in your notes.")}</p>
<form class="assistant-write" data-assistant-form="write"><div class="assistant-write-grid"><label class="field">${ctx.t("Tema", "Theme")}<select name="theme" data-assistant-theme>${D.THEMES.map((theme) => `<option value="${theme}" ${theme === request.theme ? "selected" : ""}>${ctx.esc(ctx.label(D.themeLabel(theme)))}</option>`).join("")}</select></label><label class="field">${ctx.t("Richiesta", "Request")}<input name="prompt" maxlength="${D.MAX_PROMPT}" autocomplete="off" value="${ctx.esc(request.prompt ?? "")}" placeholder="${ctx.esc(ctx.t("Es. Maestro Oben, custode della torre", "E.g. Maestro Oben, keeper of the tower"))}"></label></div>${contextPicker(ctx, request.keys ?? [])}${ui.errors.write ? `<p class="error" role="alert">${ctx.esc(ui.errors.write)}</p>` : ""}<button type="submit" class="button primary">${ctx.t("Genera la proposta", "Generate the proposal")}</button></form>
${discardedBar(ctx, "write")}
${current ? answerCard(ctx, current) : ""}
${historyList(ctx, "write")}</section>`;
}

// ------------------------------------------------------------------------ session review

function windowLabel(ctx, w) {
  // A window without sources is a disabled option: its label says why (SV-37).
  const count =
    w.count === 1
      ? ctx.t("1 fonte", "1 source")
      : w.count
        ? ctx.t(`${w.count} fonti`, `${w.count} sources`)
        : ctx.t("nessuna fonte: niente da riassumere", "no source: nothing to recap");
  if (w.kind === "session")
    return ctx.t(
      `Sessione ${w.number}${w.live ? " (in corso)" : ""}${w.recapped ? " (resoconto già nel Diario)" : ""} · ${day(ctx, w.from)} · ${count}`,
      `Session ${w.number}${w.live ? " (live)" : ""}${w.recapped ? " (recap already in the journal)" : ""} · ${day(ctx, w.from)} · ${count}`,
    );
  if (w.kind === "day")
    return ctx.t(`Giornata del ${day(ctx, w.from)} · ${count}`, `${day(ctx, w.from)} · ${count}`);
  return ctx.t(`Tutte le fonti condivise · ${count}`, `Every shared source · ${count}`);
}
function ensureWorking(ctx, review) {
  if (
    !ui.review ||
    ui.review.id !== review.id ||
    ui.review.owner !== ctx.role ||
    (!ui.review.dirty && ui.review.revision !== review.revision)
  )
    ui.review = {
      id: review.id,
      owner: ctx.role,
      revision: review.revision,
      title: review.title || D.reviewTitle(review, ctx.lang),
      format: review.format,
      summary: review.summary.text,
      beats: structuredClone(review.beats),
      entities: structuredClone(review.entities),
      excludedKeys: [...review.excludedKeys],
      dirty: false,
    };
  return ui.review;
}
function reviewStatus(ctx, review) {
  if (review.status === "published")
    return ctx.t(
      `Pubblicato nel Diario il ${when(ctx, review.publishedAt)}`,
      `Published to the journal on ${when(ctx, review.publishedAt)}`,
    );
  if (review.status === "withdrawn")
    return ctx.t(
      `Ritirato il ${when(ctx, review.withdrawn?.at)}: ${review.withdrawn?.reason}`,
      `Withdrawn on ${when(ctx, review.withdrawn?.at)}: ${review.withdrawn?.reason}`,
    );
  if (review.status === "discarded") return ctx.t("Scartata", "Discarded");
  return ctx.t("Bozza privata · solo tu la vedi", "Private draft · only you see it");
}
function levelName(ctx, level) {
  return [ctx.t("Principale", "Major"), ctx.t("Secondario", "Minor"), ctx.t("Passo", "Step")][
    level
  ];
}
/** A part of the draft the DM may no longer read to the group: shown as hidden, removable. */
function maskedRow(ctx, kind, index, cites, label) {
  const refs = cites.length ? ` ([${cites.join("], [")}])` : "";
  return `<li class="${kind === "beat" ? "assistant-beat" : "assistant-entity"} assistant-masked" data-${kind}="${index}"><p class="assistant-pending">${ctx.esc(label + refs)}</p><button type="button" class="icon-button" data-assistant-act="remove-${kind === "beat" ? "beat" : "entity"}" data-index="${index}" aria-label="${ctx.esc(kind === "beat" ? ctx.t(`Togli il momento nascosto ${index + 1}`, `Remove hidden beat ${index + 1}`) : ctx.t(`Togli il nome nascosto ${index + 1}`, `Remove hidden name ${index + 1}`))}">${ctx.icon("close")}</button></li>`;
}
function beatRow(ctx, beat, index, hidden = false) {
  if (hidden)
    return maskedRow(
      ctx,
      "beat",
      index,
      beat.cites,
      ctx.t(
        `Momento ${index + 1} nascosto: usa testo non più condiviso con tutto il gruppo`,
        `Beat ${index + 1} hidden: it uses text no longer shared with the whole group`,
      ),
    );
  return `<li class="assistant-beat level-${beat.level}" data-beat="${index}"><label class="assistant-beat-level"><span class="assistant-sr">${ctx.t(`Livello del momento ${index + 1}`, `Level of beat ${index + 1}`)}</span><select data-beat-level="${index}">${D.LEVELS.map((level) => `<option value="${level}" ${level === beat.level ? "selected" : ""}>${ctx.esc(levelName(ctx, level))}</option>`).join("")}</select></label><label class="assistant-beat-text"><span class="assistant-sr">${ctx.t(`Momento ${index + 1}`, `Beat ${index + 1}`)}</span><input data-beat-text="${index}" value="${ctx.esc(beat.text)}" maxlength="${D.MAX_BEAT}" aria-describedby="assistant-beats-help"></label><span class="assistant-beat-cites">${beat.cites.map((n) => `[${n}]`).join("")}</span><button type="button" class="icon-button" data-assistant-act="remove-beat" data-index="${index}" aria-label="${ctx.esc(ctx.t(`Togli il momento ${index + 1}`, `Remove beat ${index + 1}`))}">${ctx.icon("close")}</button></li>`;
}
function entityRow(ctx, entity, index, hidden = false) {
  if (hidden)
    return maskedRow(
      ctx,
      "entity",
      index,
      entity.cites,
      ctx.t(
        `Nome ${index + 1} nascosto: le sue fonti non lo nominano più per tutto il gruppo`,
        `Name ${index + 1} hidden: its sources no longer name it to the whole group`,
      ),
    );
  return `<li class="assistant-entity"><label class="field"><span class="assistant-sr">${ctx.t(`Nome ${index + 1}`, `Name ${index + 1}`)}</span><input data-entity-name="${index}" value="${ctx.esc(entity.name)}" maxlength="80"></label><label class="field"><span class="assistant-sr">${ctx.t(`Tipo di ${entity.name}`, `Kind of ${entity.name}`)}</span><select data-entity-kind="${index}">${D.ENTITY_KINDS.map((kind) => `<option value="${kind}" ${kind === entity.kind ? "selected" : ""}>${ctx.esc(ctx.label(D.entityKindLabel(kind)))}</option>`).join("")}</select></label><span class="assistant-beat-cites">${entity.cites.map((n) => `[${n}]`).join("")}</span><button type="button" class="icon-button" data-assistant-act="remove-entity" data-index="${index}" aria-label="${ctx.esc(ctx.t(`Togli ${entity.name}`, `Remove ${entity.name}`))}">${ctx.icon("close")}</button></li>`;
}
function sourcesPanel(ctx, review, work) {
  const shared = D.collectSources(ctx.state, slice(ctx.state), ctx.role, { audience: "campaign" });
  const eligible = shared.sources
    .filter(
      (s) =>
        s.recap &&
        (review.window.kind === "all" ||
          (s.at && s.at >= review.window.from && (!review.window.to || s.at < review.window.to))),
    )
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const ex = shared.excluded;
  const waiting = Object.entries(ex.consent).map(([id, n]) => `${memberName(ctx, id)}: ${n}`);
  const pending = D.excludedStillCited(
    { ...review, summary: work.summary, beats: work.beats, entities: work.entities },
    work.excludedKeys,
  );
  // Pending exclusions keep the panel open: its notice and "Rebuild" must stay in sight.
  return `<details class="assistant-sources" ${work.sourcesOpen || pending.length ? "open" : ""} data-assistant-sources><summary>${ctx.t(`Fonti del periodo (${eligible.length}) ed esclusioni`, `Sources of the period (${eligible.length}) and exclusions`)}</summary>
<p class="muted">${ctx.t("Il resoconto condiviso usa solo ciò che tutto il gruppo legge, in personaggio.", "The shared recap uses only what the whole group reads, in character.")}</p>
<ul class="assistant-excluded"><li>${ctx.t(`Riservate al DM o a parte del gruppo: ${ex.restricted}`, `DM-only or partial-audience: ${ex.restricted}`)}</li><li>${ctx.t(`Sussurri e messaggi nascosti: ${ex.whisper}`, `Whispers and hidden messages: ${ex.whisper}`)}</li><li>${ctx.t(`Fuori personaggio e discussioni: ${ex.offTable}`, `Out of character and discussions: ${ex.offTable}`)}</li>${waiting.length ? `<li>${ctx.t(`Senza consenso: ${waiting.join(", ")}`, `Without consent: ${waiting.join(", ")}`)}</li>` : ""}</ul>
<fieldset><legend>${ctx.t("Includi nel resoconto", "Include in the recap")}</legend>${eligible
    .map(
      (s) =>
        `<label class="campaign-check"><input type="checkbox" data-assistant-include value="${ctx.esc(s.key)}" ${work.excludedKeys.includes(s.key) ? "" : "checked"}>${ctx.esc(D.sourceName({ type: s.type, title: s.title }, ctx.lang))} · ${ctx.esc(String(s.text).slice(0, 90))}${String(s.text).length > 90 ? "…" : ""}</label>`,
    )
    .join("")}</fieldset>
${pending.length ? `<p class="assistant-pending" role="status">${ctx.t(`Escluse ma ancora nel testo: [${pending.map((c) => c.n).join("], [")}]. Ricrea la bozza dalle fonti o togli quelle parti: finché restano, il resoconto non si pubblica.`, `Excluded but still in the text: [${pending.map((c) => c.n).join("], [")}]. Rebuild the draft from the sources or remove those parts: while they stay, the recap cannot be published.`)}</p>` : ""}
<button type="button" class="button" data-assistant-act="rebuild">${ctx.t("Ricrea la bozza dalle fonti", "Rebuild the draft from the sources")}</button></details>`;
}
function reviewEditor(ctx, review) {
  const work = ensureWorking(ctx, review);
  // Re-checked on every render against what the whole group reads now: a part whose
  // text was withdrawn since the draft (a section made "Only me") is not shown.
  const stale = D.reviewStaleness(ctx.state, slice(ctx.state), ctx.role, {
    ...review,
    summary: { text: work.summary, cites: [] },
    beats: work.beats,
    entities: work.entities,
  });
  const staleNs = new Set(stale.rows.map((row) => row.n));
  const summaryHidden = D.staleIn(stale, work.summary);
  const sources = review.sources
    .map((c) =>
      stale.gone.has(c.n)
        ? `<li><strong>[${c.n}]</strong> ${ctx.t("Fonte non più condivisa con tutto il gruppo", "Source no longer shared with the whole group")}</li>`
        : `<li><strong>[${c.n}]</strong> ${ctx.esc(D.sourceName(c, ctx.lang))}${c.at ? ` · ${ctx.esc(when(ctx, c.at))}` : ""}${staleNs.has(c.n) ? ` · ${ctx.t("cambiata dopo la bozza", "changed after the draft")}` : ""}</li>`,
    )
    .join("");
  const staleNotice = stale.rows.length
    ? `<p class="assistant-pending" role="status" data-assistant-stale>${ctx.t(`Dopo la bozza, [${[...staleNs].join("], [")}] è cambiata o non è più condivisa con tutto il gruppo: le parti che la usano sono nascoste e il resoconto non si pubblica finché non le togli, rigeneri il riassunto o ricrei la bozza dalle fonti.`, `Since the draft, [${[...staleNs].join("], [")}] changed or is no longer shared with the whole group: the parts using it are hidden and the recap cannot be published until you remove them, re-run the summary or rebuild the draft from the sources.`)}</p>`
    : "";
  return `<form class="assistant-review" data-assistant-form="review" data-review="${ctx.esc(review.id)}" aria-labelledby="assistant-review-title">
<header class="assistant-review-head"><h3 id="assistant-review-title" tabindex="-1">${ctx.esc(work.title)}</h3><div class="assistant-badges">${simBadge(ctx)}<span class="badge">${ctx.esc(reviewStatus(ctx, review))}</span><span class="badge" data-assistant-dirty>${work.dirty ? ctx.t("Modifiche non salvate", "Unsaved changes") : ctx.t("Salvata", "Saved")}</span></div></header>
${staleNotice}
<label class="field">${ctx.t("Titolo", "Title")}<input name="title" maxlength="120" value="${ctx.esc(work.title)}" data-review-field="title"></label>
<fieldset class="assistant-format"><legend>${ctx.t("Formato", "Format")}</legend><label class="campaign-check"><input type="radio" name="format" value="narrative" data-review-field="format" ${work.format === "narrative" ? "checked" : ""}>${ctx.t("Narrativo", "Narrative")}</label><label class="campaign-check"><input type="radio" name="format" value="quick" data-review-field="format" ${work.format === "quick" ? "checked" : ""}>${ctx.t("Riferimento rapido", "Quick reference")}</label></fieldset>
${summaryHidden ? `<div class="field"><span>${ctx.t("Riassunto", "Summary")}</span><p class="assistant-pending" data-assistant-summary-hidden>${ctx.t("Riassunto nascosto: usa testo non più condiviso con tutto il gruppo. Rigeneralo qui sotto o ricrea la bozza dalle fonti.", "Summary hidden: it uses text no longer shared with the whole group. Re-run it below or rebuild the draft from the sources.")}</p></div>` : `<label class="field">${ctx.t("Riassunto", "Summary")}<textarea name="summary" rows="5" maxlength="${D.MAX_SUMMARY}" data-review-field="summary">${ctx.esc(work.summary)}</textarea></label>`}
<div class="assistant-regen"><label class="field">${ctx.t("Istruzioni per rigenerare solo il riassunto", "Instructions to re-run the summary only")}<input name="prompt" maxlength="${D.MAX_PROMPT}" value="${ctx.esc(review.prompt ?? "")}" placeholder="${ctx.esc(ctx.t("Es. concentrati sulla lanterna", "E.g. focus on the lantern"))}" data-review-prompt></label><button type="button" class="button" data-assistant-act="regen">${ctx.t("Rigenera il riassunto", "Re-run the summary")}</button></div>
<h4>${ctx.t("Momenti", "Beats")}</h4><p class="muted" id="assistant-beats-help">${ctx.t("Tre livelli: Principale, Secondario, Passo. Con il cursore all’inizio del testo di un momento, Tab e Maiusc+Tab cambiano il livello; altrimenti Tab passa al campo successivo.", "Three levels: Major, Minor, Step. With the cursor at the start of a beat’s text, Tab and Shift+Tab change the level; otherwise Tab moves to the next field.")}</p>
<ol class="assistant-beats">${work.beats.map((beat, index) => beatRow(ctx, beat, index, D.staleIn(stale, beat.text, beat.cites))).join("")}</ol>
<p class="assistant-sr" aria-live="polite" data-assistant-live></p>
${ui.removedBeat?.reviewId === review.id ? `<p class="assistant-restore" role="status">${ctx.t("Momento tolto.", "Beat removed.")} <button type="button" class="button quiet" data-assistant-act="restore-beat">${ctx.t("Ripristina", "Restore")}</button></p>` : ""}
<button type="button" class="button" data-assistant-act="add-beat">${ctx.icon("plus")} ${ctx.t("Aggiungi momento", "Add beat")}</button>
<h4>${ctx.t("Persone, luoghi e cose", "People, places and things")}</h4>
<ul class="assistant-entities">${work.entities.map((entity, index) => entityRow(ctx, entity, index, stale.entities.has(index))).join("") || `<li class="muted">${ctx.t("Nessuna entità.", "No entities.")}</li>`}</ul>
<details class="assistant-cited"><summary>${ctx.t(`Fonti citate (${review.sources.length})`, `Cited sources (${review.sources.length})`)}</summary><ol>${sources}</ol></details>
${sourcesPanel(ctx, review, work)}
${ui.errors.review ? `<p class="error" role="alert">${ctx.esc(ui.errors.review)}</p>` : ""}
<div class="toolbar assistant-actions"><button type="submit" class="button">${ctx.t("Salva la bozza", "Save the draft")}</button><button type="button" class="button primary" data-assistant-act="publish">${ctx.t("Rivedi e pubblica…", "Review and publish…")}</button><button type="button" class="button danger" data-assistant-act="discard-review">${ctx.t("Scarta la bozza", "Discard the draft")}</button></div>
</form>`;
}
function publishedView(ctx, review) {
  const blocked = D.republishBlockers(ctx.state, slice(ctx.state), ctx.role, review);
  const withdrawn = review.status === "withdrawn";
  let entry = null;
  try {
    entry = review.publishedEntryId
      ? getCampaignEntry(ctx.state, review.publishedEntryId, ctx.role)
      : null;
  } catch {}
  return `<article class="assistant-review published" aria-labelledby="assistant-review-title"><header class="assistant-review-head"><h3 id="assistant-review-title" tabindex="-1">${ctx.esc(D.reviewTitle(review, ctx.lang))}</h3><div class="assistant-badges">${simBadge(ctx)}<span class="badge">${ctx.esc(reviewStatus(ctx, review))}</span></div></header>
<pre class="assistant-preview">${ctx.esc(entry ? entry.data.body : D.recapBody(review, review.lang))}</pre>
${ui.errors.review ? `<p class="error" role="alert">${ctx.esc(ui.errors.review)}</p>` : ""}
${blocked.length && withdrawn ? `<p class="assistant-pending" role="status">${ctx.t(`Non si ripubblica: [${blocked.join("], [")}] è cambiata, non è più leggibile da tutto il gruppo o chi l’ha scritta ha revocato il consenso. Prepara una nuova bozza dalle fonti attuali.`, `It cannot be published again: [${blocked.join("], [")}] changed, is no longer readable by the whole group or its author withdrew consent. Prepare a new draft from the current sources.`)}</p>` : ""}
${blocked.length && !withdrawn ? `<p class="assistant-pending" role="status">${ctx.t(`Dopo la pubblicazione [${blocked.join("], [")}] è cambiata o non è più condivisa con tutto il gruppo: il resoconto nel Diario resta com’era. Valuta se ritirarlo.`, `Since publication [${blocked.join("], [")}] changed or is no longer shared with the whole group: the recap in the journal stays as it was. Consider withdrawing it.`)}</p>` : ""}
<div class="toolbar">${entry ? `<button type="button" class="button" data-assistant-source="${ctx.esc(JSON.stringify({ page: "campaign", tab: "entry", id: entry.id }))}">${ctx.t("Apri nel Diario", "Open in the journal")}</button>` : ""}${review.status === "published" ? `<button type="button" class="button danger" data-assistant-act="withdraw" data-review="${ctx.esc(review.id)}">${ctx.t("Ritira dal Diario…", "Withdraw from the journal…")}</button>` : blocked.length || !record(ctx).enabled ? "" : `<button type="button" class="button" data-assistant-act="republish" data-review="${ctx.esc(review.id)}">${ctx.t("Ripubblica", "Publish again")}</button>`}</div>
<p class="muted">${ctx.t("Per correggere il testo pubblicato usa la modifica della voce nel Diario: ogni correzione diventa una nuova versione.", "To correct the published text, edit the entry in the journal: every correction becomes a new version.")}</p></article>`;
}
/**
 * With the assistant off nothing new is drafted, but recaps already in the journal stay
 * listed so the DM can still withdraw them (as the consent text promises).
 */
function disabledReviews(ctx) {
  const done = D.listReviews(slice(ctx.state), ctx.role).filter(
    (row) => row.campaignId === campaignId(ctx) && ["published", "withdrawn"].includes(row.status),
  );
  if (!done.length) return disabledNotice(ctx);
  const open = done.find((row) => row.id === ui.openReviewId) ?? done.at(-1);
  return `${disabledNotice(ctx)}<section class="assistant-block" aria-labelledby="assistant-recap-title"><h2 id="assistant-recap-title">${ctx.t("Resoconti già nel Diario", "Recaps already in the journal")}</h2><p class="muted">${ctx.t("Anche con l’assistente spento puoi ritirarli dal Diario, con un motivo.", "Even with the assistant off you can withdraw them from the journal, with a reason.")}</p><ul class="item-list assistant-review-list">${done
    .slice()
    .reverse()
    .map(
      (row) =>
        `<li class="item-row"><div><strong>${ctx.esc(D.reviewTitle(row, ctx.lang))}</strong><small>${ctx.esc(reviewStatus(ctx, row))}</small></div>${row.id === open.id ? `<span class="badge">${ctx.t("Aperta sotto", "Open below")}</span>` : `<button type="button" class="button quiet" data-assistant-act="open-review" data-review="${ctx.esc(row.id)}">${ctx.t("Apri", "Open")}</button>`}</li>`,
    )
    .join("")}</ul>${publishedView(ctx, open)}</section>`;
}
function reviewTab(ctx) {
  if (!dm(ctx))
    return `<div class="empty-state"><h2>${ctx.t("Resoconto della sessione", "Session recap")}</h2><p>${ctx.t("Il DM prepara e rivede il resoconto prima di condividerlo; lo trovi nel Diario quando è pubblicato.", "The DM prepares and reviews the recap before sharing it; you find it in the journal once published.")}</p><button type="button" class="button" data-assistant-source="${ctx.esc(JSON.stringify({ page: "campaign", tab: "journal" }))}">${ctx.t("Apri il Diario", "Open the journal")}</button></div>`;
  if (!record(ctx).enabled) return disabledReviews(ctx);
  const s = slice(ctx.state);
  const windows = D.recapWindows(ctx.state, s, ctx.role);
  const reviews = D.listReviews(s, ctx.role).filter((row) => row.campaignId === campaignId(ctx));
  const visible = reviews.filter((row) => row.status !== "discarded");
  const open =
    reviews.find((row) => row.id === ui.openReviewId && row.status !== "discarded") ??
    visible.filter((row) => row.status === "draft").at(-1) ??
    visible.at(-1) ??
    null;
  const toReview = D.sessionsToReview(ctx.state, s, ctx.role);
  const firstWindow = toReview[0]?.id ?? windows.find((w) => w.count)?.id;
  return `<section class="assistant-block" aria-labelledby="assistant-recap-title"><h2 id="assistant-recap-title">${ctx.t("Resoconto della sessione", "Session recap")}</h2>
<p class="muted">${ctx.t("La bozza nasce privata: la rivedi (riassunto, momenti, entità) e solo allora la pubblichi nel Diario.", "The draft starts private: you review it (summary, beats, entities) and only then publish it to the journal.")}</p>
<form class="assistant-new-review" data-assistant-form="review-new"><label class="field">${ctx.t("Periodo da riassumere", "Period to recap")}<select name="window">${windows.map((w) => `<option value="${ctx.esc(w.id)}" ${w.id === firstWindow ? "selected" : ""} ${w.count ? "" : "disabled"}>${ctx.esc(windowLabel(ctx, w))}</option>`).join("")}</select></label><fieldset class="assistant-format"><legend>${ctx.t("Formato", "Format")}</legend><label class="campaign-check"><input type="radio" name="format" value="narrative" checked>${ctx.t("Narrativo", "Narrative")}</label><label class="campaign-check"><input type="radio" name="format" value="quick">${ctx.t("Riferimento rapido", "Quick reference")}</label></fieldset>${ui.errors["review-new"] ? `<p class="error" role="alert">${ctx.esc(ui.errors["review-new"])}</p>` : ""}<button type="submit" class="button primary">${ctx.t("Prepara la bozza", "Prepare the draft")}</button></form>
${
  reviews.length
    ? `<ul class="item-list assistant-review-list">${reviews
        .slice()
        .reverse()
        .map(
          (row) =>
            `<li class="item-row"><div><strong>${ctx.esc(D.reviewTitle(row, ctx.lang))}</strong><small>${ctx.esc(reviewStatus(ctx, row))} · ${ctx.esc(when(ctx, row.updatedAt))}</small></div>${row.status === "discarded" ? `<button type="button" class="button quiet" data-assistant-act="restore-review" data-review="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button>` : row.id === open?.id ? `<span class="badge">${ctx.t("Aperta sotto", "Open below")}</span>` : `<button type="button" class="button quiet" data-assistant-act="open-review" data-review="${ctx.esc(row.id)}">${ctx.t("Apri", "Open")}</button>`}</li>`,
        )
        .join("")}</ul>`
    : ""
}
${open ? (open.status === "draft" ? reviewEditor(ctx, open) : publishedView(ctx, open)) : ""}</section>`;
}

// ------------------------------------------------------------------------ consent tab

const SOURCE_NAMES = {
  journal: L(
    "Diario, Mondo, obiettivi e appunti condivisi",
    "Journal, world, objectives and shared notes",
  ),
  materials: L(
    "Materiali mostrati (le note del DM solo al DM)",
    "Shown handouts (DM notes only to the DM)",
  ),
  chat: L("Chat e discussioni", "Chat and discussions"),
  log: L("Registro del Tavolo (eventi condivisi)", "Table log (shared events)"),
  rules: L(
    "Regole: compendio SRD 5.2.1 e homebrew abilitato nella campagna",
    "Rules: SRD 5.2.1 compendium and homebrew enabled in the campaign",
  ),
};
function eventText(ctx, event) {
  const who = memberName(ctx, event.by);
  const map = {
    enabled: ctx.t(`${who} ha attivato l’assistente`, `${who} turned the assistant on`),
    disabled: ctx.t(`${who} ha disattivato l’assistente`, `${who} turned the assistant off`),
    sources: ctx.t(`${who} ha cambiato le fonti consentite`, `${who} changed the allowed sources`),
    consent: ctx.t(`${who} ha dato il consenso`, `${who} gave consent`),
    declined: ctx.t(`${who} non ha dato il consenso`, `${who} declined consent`),
    revoked: ctx.t(`${who} ha revocato il consenso`, `${who} withdrew consent`),
    external: event.allowed
      ? ctx.t(
          `${who} permette i propri contenuti nei prompt per modelli esterni`,
          `${who} allows their content in prompts for external models`,
        )
      : ctx.t(
          `${who} esclude i propri contenuti dai prompt per modelli esterni`,
          `${who} keeps their content out of prompts for external models`,
        ),
    published: ctx.t(`${who} ha pubblicato un resoconto`, `${who} published a recap`),
    withdrawn: ctx.t(`${who} ha ritirato un resoconto`, `${who} withdrew a recap`),
    republished: ctx.t(`${who} ha ripubblicato un resoconto`, `${who} published a recap again`),
  };
  return `${map[event.kind] ?? event.kind}${event.reason ? ` · ${ctx.t("motivo", "reason")}: ${event.reason}` : ""}`;
}
function consentTab(ctx) {
  const rec = record(ctx);
  const people = D.consentList(ctx.state, slice(ctx.state));
  const statusName = (status) =>
    status === "given"
      ? ctx.t("Consenso dato", "Consent given")
      : status === "revoked"
        ? ctx.t("Consenso revocato", "Consent withdrawn")
        : status === "declined"
          ? ctx.t("Consenso non dato", "Consent declined")
          : ctx.t("In attesa", "Pending");
  // Which engine each member uses: an own model means excerpts are copied out by hand.
  const engineName = (person) =>
    person.engine === "external"
      ? person.id === ctx.role
        ? ctx.t(
            "motore: il tuo modello (estratti copiati fuori dall’app)",
            "engine: your own model (excerpts copied out of the app)",
          )
        : ctx.t(
            "motore: il suo modello (estratti copiati fuori dall’app)",
            "engine: their own model (excerpts copied out of the app)",
          )
      : person.engine === "local"
        ? ctx.t(
            "motore: modello locale (simulato, nessuna richiesta di rete)",
            "engine: local model (simulated, no network request)",
          )
        : ctx.t("motore: generatore dimostrativo", "engine: demonstration generator");
  const choice = (person) => {
    if (person.id !== ctx.role) return "";
    if (person.status === "given")
      return `<button type="button" class="button" data-assistant-act="revoke">${ctx.t("Revoca il consenso…", "Withdraw consent…")}</button>`;
    if (person.status === "pending")
      return `<div class="toolbar"><button type="button" class="button primary" data-assistant-act="consent">${ctx.t("Do il consenso", "Give consent")}</button><button type="button" class="button" data-assistant-act="decline">${ctx.t("Non do il consenso", "Decline consent")}</button></div>`;
    return `<button type="button" class="button" data-assistant-act="consent">${ctx.t("Do il consenso", "Give consent")}</button>`;
  };
  const me = people.find((person) => person.id === ctx.role);
  const mine = D.consentOf(slice(ctx.state), campaignId(ctx), ctx.role);
  const engineNow = engine(ctx);
  const count = slice(ctx.state).history?.[ctx.role]?.length ?? 0;
  return `<section class="assistant-block" aria-labelledby="assistant-consent-title"><h2 id="assistant-consent-title">${ctx.t("Consenso e dati", "Consent and data")}</h2>
<div class="assistant-card"><h3>${ctx.t("Stato nella campagna", "Status in the campaign")}</h3><p>${rec.enabled ? ctx.t(`Attivo dal ${when(ctx, rec.enabledAt)}, attivato da ${memberName(ctx, rec.enabledBy)}. Tutti i membri vedono questo stato.`, `On since ${when(ctx, rec.enabledAt)}, turned on by ${memberName(ctx, rec.enabledBy)}. Every member sees this status.`) : ctx.t("Spento: non legge nulla della campagna.", "Off: it reads nothing of the campaign.")}</p>${dm(ctx) ? `<div class="toolbar">${rec.enabled ? `<button type="button" class="button danger" data-assistant-act="disable">${ctx.t("Disattiva…", "Turn off…")}</button>` : `<button type="button" class="button primary" data-assistant-act="enable">${ctx.t("Attiva l’assistente…", "Turn the assistant on…")}</button>`}</div>` : ""}</div>
${
  dm(ctx)
    ? `<fieldset class="assistant-card assistant-source-kinds"><legend>${ctx.t("Fonti consentite nella campagna", "Allowed sources in the campaign")}</legend>${D.SOURCE_KINDS.map((kind) => `<label class="campaign-check"><input type="checkbox" data-assistant-source-kind="${kind}" ${rec.sources[kind] ? "checked" : ""}>${ctx.esc(ctx.label(SOURCE_NAMES[kind]))}</label>`).join("")}${ui.errors.sources ? `<p class="error" role="alert">${ctx.esc(ui.errors.sources)}</p>` : ""}</fieldset>`
    : `<div class="assistant-card"><h3>${ctx.t("Cosa legge", "What it reads")}</h3><ul>${D.SOURCE_KINDS.filter(
        (k) => rec.sources[k],
      )
        .map((kind) => `<li>${ctx.esc(ctx.label(SOURCE_NAMES[kind]))}</li>`)
        .join("")}</ul></div>`
}
<div class="assistant-card"><h3>${ctx.t("Consenso dei membri", "Members’ consent")}</h3><p class="muted">${ctx.t("Messaggi e voci di chi non ha dato il consenso non entrano in risposte, proposte o resoconti. Puoi dare o negare il consenso e cambiare idea in ogni momento. Revocare vale da subito per le nuove risposte; i resoconti già pubblicati restano finché il DM non li ritira.", "Messages and entries of anyone without consent never enter answers, proposals or recaps. You can give or decline consent and change your mind at any time. Withdrawing applies at once to new answers; recaps already published stay until the DM withdraws them.")}</p><p class="muted">${ctx.t("Chi usa «Il tuo modello» copia a mano, in uno strumento esterno, estratti delle fonti che legge, anche contenuti di altri membri con consenso: quello strumento è fuori dalle promesse di conservazione dell’app. L’elenco mostra il motore di ognuno e ciascuno può escludere i propri contenuti da quei prompt.", "Anyone using “Your own model” copies by hand, into an external tool, excerpts of the sources they read, including other members’ consented content: that tool is outside the app’s retention promises. The list shows everyone’s engine, and each member can keep their own content out of those prompts.")}</p><ul class="item-list">${people
    .map(
      (person) =>
        `<li class="item-row"><div><strong>${ctx.esc(memberName(ctx, person.id))}</strong><small>${ctx.esc(statusName(person.status))}${person.at ? ` · ${ctx.esc(when(ctx, person.at))}` : ""} · ${ctx.esc(engineName(person))}${person.status === "given" && !person.external ? ` · ${ctx.t("esclude i propri contenuti dai prompt esterni", "keeps their content out of external prompts")}` : ""}</small></div>${choice(person)}</li>`,
    )
    .join(
      "",
    )}</ul>${me?.status === "given" ? `<label class="campaign-check assistant-external-consent"><input type="checkbox" data-assistant-external-consent ${me.external ? "checked" : ""}>${ctx.t("I miei messaggi e le mie voci possono entrare anche nei prompt che gli altri membri copiano nel proprio modello", "My messages and entries may also enter the prompts other members copy into their own model")}</label>` : ""}${errorLine(ctx, "consent")}${mine !== "given" && rec.enabled ? `<p class="assistant-pending">${mine === "pending" ? ctx.t("I tuoi messaggi e le tue voci restano fuori finché non scegli.", "Your messages and entries stay out until you choose.") : ctx.t("I tuoi messaggi e le tue voci restano fuori.", "Your messages and entries stay out.")}</p>` : ""}</div>
<fieldset class="assistant-card"><legend>${ctx.t("Motore delle risposte (solo per te)", "Answer engine (just for you)")}</legend><label class="campaign-check"><input type="radio" name="assistant-engine" value="demo" data-assistant-engine ${engineNow === "demo" ? "checked" : ""}>${ctx.t("Generatore dimostrativo in questo browser", "Demonstration generator in this browser")}</label><label class="campaign-check"><input type="radio" name="assistant-engine" value="external" data-assistant-engine ${engineNow === "external" ? "checked" : ""}>${ctx.t("Il tuo modello: prompt da copiare e risposta da incollare, nessuna chiave", "Your own model: a prompt to copy and an answer to paste, no key")}</label><label class="campaign-check"><input type="radio" name="assistant-engine" value="local" data-assistant-engine ${engineNow === "local" ? "checked" : ""}>${ctx.t("Modello locale su questo computer o nella rete di casa (simulato)", "Local model on this computer or the home network (simulated)")}</label>${engineNow === "local" ? localPanel(ctx) : ""}<p class="muted">${ctx.t("Nel prototipo nessuna richiesta di rete: il prompt contiene solo le fonti che puoi leggere, tranne i contenuti dei membri che li hanno esclusi dai prompt esterni. Copiandolo in un altro strumento quegli estratti escono dall’app; gli altri membri vedono nell’elenco che usi il tuo modello.", "No network request in the prototype: the prompt holds only sources you can read, except content of members who kept it out of external prompts. Copied into another tool, those excerpts leave the app; other members see in the list that you use your own model.")}</p>${errorLine(ctx, "engine")}</fieldset>
<div class="assistant-card"><h3>${ctx.t("Conservazione dei dati", "Data retention")}</h3><p>${ctx.t("Il generatore dimostrativo non invia nulla fuori da questo browser e non c’è addestramento. Chi usa «Il tuo modello» copia estratti in uno strumento esterno scelto da lui: lì valgono le regole di quello strumento, non queste. Domande e proposte restano nella tua cronologia privata finché non la cancelli; le bozze di resoconto sono solo del DM finché non le pubblica.", "The demonstration generator sends nothing out of this browser and there is no training. Anyone using “Your own model” copies excerpts into an external tool of their choice: that tool’s rules apply there, not these. Questions and proposals stay in your private history until you delete it; recap drafts belong to the DM until published.")}</p>${ui.confirmClear ? `<p class="assistant-pending" role="alert">${ctx.t(`Eliminare definitivamente ${count} voci della tua cronologia? Gli appunti già tenuti restano.`, `Permanently delete ${count} items of your history? Notes already kept stay.`)}</p><div class="toolbar"><button type="button" class="button danger" data-assistant-act="clear-confirm">${ctx.t("Elimina definitivamente", "Delete permanently")}</button><button type="button" class="button" data-assistant-act="clear-cancel">${ctx.t("Annulla", "Cancel")}</button></div>` : `<button type="button" class="button" data-assistant-act="clear" ${count ? "" : 'disabled aria-describedby="assistant-clear-why"'}>${ctx.t(`Cancella la mia cronologia (${count})`, `Delete my history (${count})`)}</button>${count ? "" : `<p class="muted" id="assistant-clear-why">${ctx.t("La tua cronologia è già vuota: non c’è nulla da cancellare.", "Your history is already empty: there is nothing to delete.")}</p>`}`}${errorLine(ctx, "retention")}</div>
<details class="assistant-card"><summary>${ctx.t("Registro del consenso", "Consent log")}</summary><ul>${
    rec.events
      .slice()
      .reverse()
      .map(
        (event) => `<li>${ctx.esc(when(ctx, event.at))} · ${ctx.esc(eventText(ctx, event))}</li>`,
      )
      .join("") || `<li class="muted">${ctx.t("Nessun evento.", "No events.")}</li>`
  }</ul></details></section>`;
}

// ------------------------------------------------------------------------ section shell

export function renderAssistant(ctx) {
  if (!member(ctx))
    return `<p class="empty-state">${ctx.t("Sezione riservata ai membri della campagna.", "This section is for campaign members.")}</p>`;
  const tab = TABS.includes(ctx.view.id) ? ctx.view.id : "ask";
  const rec = record(ctx);
  const mine = D.consentOf(slice(ctx.state), campaignId(ctx), ctx.role);
  const tabs = [
    ["ask", ctx.t("Chiedi", "Ask")],
    ["write", ctx.t("Scrivi", "Write")],
    ...(dm(ctx) ? [["review", ctx.t("Resoconto", "Recap")]] : []),
    ["consent", ctx.t("Consenso e dati", "Consent and data")],
  ];
  const body =
    tab === "write"
      ? writeTab(ctx)
      : tab === "review"
        ? reviewTab(ctx)
        : tab === "consent"
          ? consentTab(ctx)
          : askTab(ctx);
  return `<div class="assistant">
<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.t("Assistente", "Assistant")}</h1><p class="muted">${ctx.esc(ctx.label(ctx.state.campaign?.name))} · ${ctx.t("risposte con citazioni dalle voci accessibili", "answers with citations from accessible entries")}</p></div><p class="assistant-status ${rec.enabled ? "on" : "off"}" role="status"><span aria-hidden="true">●</span> ${rec.enabled ? ctx.t("Attivo in questa campagna", "Active in this campaign") : ctx.t("Non attivo", "Not active")}</p></header>
<p class="assistant-sim">${simBadge(ctx)} ${ctx.t("Nessun modello reale: il prototipo estrae frasi dalle voci che puoi leggere e le cita, senza rete e senza costi. Solo chi sceglie «Il tuo modello» copia a mano estratti fuori dall’app.", "No real model: the prototype extracts sentences from entries you can read and cites them, with no network and no cost. Only someone choosing “Your own model” copies excerpts out of the app by hand.")}</p>
${rec.enabled && mine === "pending" && tab !== "consent" ? `<div class="assistant-consent-banner" role="region" aria-label="${ctx.esc(ctx.t("Consenso", "Consent"))}"><p>${ctx.t("Il DM ha attivato l’assistente. I tuoi messaggi e le tue voci entrano nelle risposte e nei resoconti solo se dai il consenso; un membro che usa il proprio modello può copiarne estratti in uno strumento esterno. Puoi anche non darlo e cambiare idea dopo.", "The DM turned the assistant on. Your messages and entries enter answers and recaps only if you give consent; a member using their own model may copy excerpts into an external tool. You can also decline and change your mind later.")}</p><div class="toolbar"><button type="button" class="button primary" data-assistant-act="consent">${ctx.t("Do il consenso", "Give consent")}</button><button type="button" class="button" data-assistant-act="decline">${ctx.t("Non do il consenso", "Decline consent")}</button><button type="button" class="button quiet" data-assistant-tab="consent">${ctx.t("Dettagli", "Details")}</button></div>${errorLine(ctx, "consent")}</div>` : ""}
<nav class="tabs assistant-tabs" aria-label="${ctx.esc(ctx.t("Parti dell’assistente", "Assistant parts"))}">${tabs
    .map(
      ([id, name]) =>
        `<button type="button" class="${id === tab ? "active" : ""}" data-assistant-tab="${id}" ${id === tab ? 'aria-current="page"' : ""}>${ctx.esc(name)}</button>`,
    )
    .join("")}</nav>
${body}
</div>`;
}

// ------------------------------------------------------------------------ entry panel

/**
 * The sources of a recap published from the Session Review, as links that open them
 * (VTL-197): the journal text itself carries no raw [n] markers.
 */
function recapSourcesList(ctx, entry) {
  const rows = entry.kind === "recap" ? D.publishedSources(slice(ctx.state), entry.id) : [];
  if (!rows.length) return "";
  return `<div class="assistant-recap-sources"><h3>${ctx.t("Fonti del resoconto", "Recap sources")}</h3><ol>${rows
    .map(
      (c) =>
        `<li><button type="button" class="button quiet" data-assistant-source="${ctx.esc(JSON.stringify(c.route ?? {}))}">[${c.n}] ${ctx.esc(D.sourceName(c, ctx.lang))}${c.at ? ` · ${ctx.esc(when(ctx, c.at))}` : ""}</button></li>`,
    )
    .join("")}</ol></div>`;
}
function entryPanel(ctx, entry) {
  if (!entry?.id || !member(ctx)) return "";
  const rec = record(ctx);
  const key = `entry:${entry.id}`;
  let body;
  if (entry.access?.mode === "private")
    body = `<p class="muted">${ctx.t("Le note «Solo io» sono escluse dall’assistente: nessuna risposta o proposta le legge.", "“Only me” notes are excluded from the assistant: no answer or proposal reads them.")}</p>`;
  else if (!rec.enabled)
    body = `<p class="muted">${ctx.t("L’assistente non è attivo in questa campagna.", "The assistant is not active in this campaign.")}</p>`;
  else if (!D.accessibleKeys(ctx.state, slice(ctx.state), ctx.role).has(key))
    body = `<p class="muted">${ctx.t("Questa voce non è tra le fonti dell’assistente: manca il consenso di chi l’ha scritta o il DM ha escluso il Diario.", "This entry is not among the assistant’s sources: its author has not given consent or the DM excluded the journal.")}</p>`;
  else {
    const row =
      ui.entry?.entryId === entry.id && ui.entry.role === ctx.role
        ? (slice(ctx.state).history?.[ctx.role] ?? []).find(
            (r) => r.id === ui.entry.rowId && r.status !== "discarded",
          )
        : null;
    body = `<div class="toolbar"><button type="button" class="button" data-assistant-act="entry-write" data-theme="summary" data-entry="${ctx.esc(entry.id)}">${ctx.t("Riassumi questa voce", "Summarize this entry")}</button><button type="button" class="button" data-assistant-act="entry-write" data-theme="hook" data-entry="${ctx.esc(entry.id)}">${ctx.t("Gancio da questa voce", "Hook from this entry")}</button></div>${ui.errors.entry ? `<p class="error" role="alert">${ctx.esc(ui.errors.entry)}</p>` : ""}${discardedBar(ctx, "write")}${row ? answerCard(ctx, row) : ""}`;
  }
  return `<section class="assistant-entry" aria-labelledby="assistant-entry-title"><h2 id="assistant-entry-title">${ctx.t("Assistente", "Assistant")} ${simBadge(ctx)}</h2>${recapSourcesList(ctx, entry)}${body}</section>`;
}

// ------------------------------------------------------------------------ note editor

const EDITABLE = ["note", "world", "quest", "recap"];
/**
 * Context of a proposal written inside an editor (Quest Portal: current note and
 * @-mentioned notes): the saved version of the entry being edited and the entries it
 * links, when the reader may read them. The unsaved draft text is never read, so a
 * "Solo io" draft stays out. No readable context = every readable source.
 */
export function editorKeys(ctx, draft) {
  const allowed = D.accessibleKeys(ctx.state, slice(ctx.state), ctx.role);
  const keys = [
    ...(draft?.entryId ? [`entry:${draft.entryId}`] : []),
    ...(draft?.data?.links ?? [])
      .filter((link) => link?.kind === "entry" && link.id)
      .map((link) => `entry:${link.id}`),
  ];
  return [...new Set(keys)].filter((key) => allowed.has(key));
}
function editorPanel(ctx, draft) {
  if (!draft?.id || !member(ctx)) return "";
  const rec = record(ctx);
  const id = ctx.esc(draft.id);
  let body;
  if (!rec.enabled)
    body = `<p class="muted">${ctx.t("L’assistente non è attivo in questa campagna.", "The assistant is not active in this campaign.")}</p>`;
  else {
    const mine = ui.editor?.draftId === draft.id && ui.editor.role === ctx.role ? ui.editor : null;
    const theme = mine?.theme ?? "summary";
    const row = mine?.rowId
      ? (slice(ctx.state).history?.[ctx.role] ?? []).find(
          (r) => r.id === mine.rowId && r.status !== "discarded",
        )
      : null;
    const keys = editorKeys(ctx, draft);
    const { sources } = D.collectSources(ctx.state, slice(ctx.state), ctx.role);
    const names = keys.map((key) => sources.find((source) => source.key === key)).filter(Boolean);
    const context = names.length
      ? ctx.t(
          `Contesto: ${names.map((source) => D.sourceName(source, ctx.lang)).join("; ")} (versioni salvate).`,
          `Context: ${names.map((source) => D.sourceName(source, ctx.lang)).join("; ")} (saved versions).`,
        )
      : ctx.t(
          `Contesto: tutte le fonti che puoi leggere (${sources.length}). Collega delle voci per restringerlo.`,
          `Context: every source you can read (${sources.length}). Link entries to narrow it.`,
        );
    const story = dm(ctx) && draft.status === "active" ? D.storyOfDraft(ctx.state, draft.id) : null;
    body = `<p class="muted">${ctx.esc(context)} ${ctx.t("Il testo non salvato di questa bozza non viene letto.", "The unsaved text of this draft is not read.")} ${ctx.t("Nel testo, «/» su una riga vuota porta qui; la proposta tenuta prende il posto della «/».", "In the text, “/” on an empty line brings you here; a kept proposal takes the place of the “/”.")}</p><p class="assistant-sr" aria-live="polite" data-assistant-slash-live></p>
<div class="assistant-write-grid"><label class="field">${ctx.t("Tema", "Theme")}<select data-assistant-editor-theme>${D.THEMES.map((value) => `<option value="${value}" ${value === theme ? "selected" : ""}>${ctx.esc(ctx.label(D.themeLabel(value)))}</option>`).join("")}</select></label><label class="field">${ctx.t("Richiesta", "Request")}<input maxlength="${D.MAX_PROMPT}" autocomplete="off" value="${ctx.esc(mine?.prompt ?? "")}" placeholder="${ctx.esc(ctx.t("Es. un gancio sulla torre", "E.g. a hook about the tower"))}" data-assistant-editor-prompt></label></div>
<div class="toolbar"><button type="button" class="button" data-assistant-act="editor-write" data-draft="${id}">${ctx.t("Genera la proposta", "Generate the proposal")}</button>${story ? `<button type="button" class="button" data-assistant-act="story-review" data-session="${ctx.esc(story.sessionId)}">${ctx.t(`Scrivi «Cosa è successo» con il resoconto dell’assistente (sessione ${story.number})`, `Write “What happened” with the assistant’s recap (session ${story.number})`)}</button>` : ""}</div>
${errorLine(ctx, "editor")}${discardedBar(ctx, "write")}${row ? answerCard(ctx, row, { editor: draft.id }) : ""}`;
  }
  return `<section class="assistant-entry assistant-editor" data-assistant-editor="${id}" aria-labelledby="assistant-editor-title"><h2 id="assistant-editor-title">${ctx.t("Assistente", "Assistant")} ${simBadge(ctx)}</h2>${body}</section>`;
}
/**
 * Position of a "/" just typed alone on an empty line (before the caret at `caret`), or
 * null: a "/" inside a sentence is just a character.
 */
export function slashAt(value, caret) {
  const text = String(value ?? "");
  const at = Number(caret) - 1;
  if (at < 0 || text[at] !== "/") return null;
  const start = text.lastIndexOf("\n", at - 1) + 1;
  const end = text.indexOf("\n", at);
  const rest = text.slice(at + 1, end === -1 ? text.length : end);
  return start === at && !rest.trim() ? at : null;
}
/** The body field of the note editor that hosts the panel (B12 campaign editor). */
function editorField(el) {
  return (
    el?.closest?.("[data-campaign-form]")?.querySelector?.('[data-campaign-path="data.body"]') ??
    null
  );
}

// ------------------------------------------------------------------------ table drawer

function tableDrawer(ctx) {
  const current = currentRow(ctx, "ask");
  return `<div class="assistant assistant-drawer"><p class="assistant-sim">${simBadge(ctx)} ${ctx.t("Risposte estratte dalle voci che puoi leggere, con citazioni.", "Answers extracted from entries you can read, with citations.")}</p><form class="assistant-ask" data-assistant-form="ask"><label class="field">${ctx.t("La tua domanda", "Your question")}<input name="question" maxlength="${D.MAX_QUESTION}" autocomplete="off" data-assistant-question></label><button type="submit" class="button primary">${ctx.t("Chiedi", "Ask")}</button></form>${ui.errors.ask ? `<p class="error" role="alert">${ctx.esc(ui.errors.ask)}</p>` : ""}${discardedBar(ctx, "ask")}${current ? answerCard(ctx, current, { compact: true }) : ""}<button type="button" class="button quiet" data-assistant-source="${ctx.esc(JSON.stringify({ page: "campaign", tab: "assistant" }))}">${ctx.t("Apri l’assistente della campagna", "Open the campaign assistant")}</button></div>`;
}

// ------------------------------------------------------------------------ actions

function readWorking(root) {
  const work = ui.review;
  if (!work) return null;
  const form = root?.querySelector?.('[data-assistant-form="review"]');
  if (!form) return work;
  work.title = form.querySelector('[data-review-field="title"]')?.value ?? work.title;
  work.summary = form.querySelector('[data-review-field="summary"]')?.value ?? work.summary;
  const format = form.querySelector('[data-review-field="format"]:checked');
  if (format) work.format = format.value;
  form.querySelectorAll("[data-beat-text]").forEach((input) => {
    const beat = work.beats[Number(input.dataset.beatText)];
    if (beat) beat.text = input.value;
  });
  form.querySelectorAll("[data-entity-name]").forEach((input) => {
    const entity = work.entities[Number(input.dataset.entityName)];
    if (entity) entity.name = input.value;
  });
  const sources = form.querySelector("[data-assistant-sources]");
  if (sources) work.sourcesOpen = sources.open;
  return work;
}
const armed = new WeakSet();
const CARET_KEYS = ["Home", "End", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
/**
 * Level a beat takes on Tab / Shift+Tab, or null when Tab should move focus: the caret
 * must sit at the start of a beat the user is working in (typed, clicked or moved the
 * caret since focusing it), and the outer levels never trap the keyboard.
 */
export function beatLevelOnTab(beat, shift, { armed: ready, start, end }) {
  if (!ready || start !== 0 || end !== 0) return null;
  const next = beat.level + (shift ? -1 : 1);
  return next < 0 || next > 2 ? null : next;
}
function markDirty(root, ctx) {
  if (!ui.review) return;
  ui.review.dirty = true;
  const badge = root?.querySelector?.("[data-assistant-dirty]");
  if (badge) badge.textContent = ctx.t("Modifiche non salvate", "Unsaved changes");
}
function saveWorking(ctx, draft, s) {
  const work = ui.review;
  return D.saveReview(
    s,
    ctx.role,
    work.id,
    {
      title: work.title,
      format: work.format,
      summary: work.summary,
      beats: work.beats,
      entities: work.entities,
      excludedKeys: work.excludedKeys,
    },
    { expectedRevision: work.revision },
  );
}
function backTarget(ctx) {
  if (["campaign", "notes"].includes(ctx.view.page) && ctx.view.tab === "edit" && ctx.view.id)
    return { page: ctx.view.page, tab: "edit", id: ctx.view.id };
  if (ctx.view.page === "campaign" && ctx.view.tab === "entry" && ctx.view.id)
    return { page: "campaign", tab: "entry", id: ctx.view.id };
  if (ctx.view.page === "notes" && ctx.view.id)
    return { page: "notes", tab: "entry", id: ctx.view.id };
  if (ctx.view.page === "table") return { page: "table" };
  return {
    page: "campaign",
    tab: "assistant",
    ...(TABS.includes(ctx.view.id) && ctx.view.id !== "ask" ? { id: ctx.view.id } : {}),
  };
}
function auditOn(draft, s, kind, by, extra = {}) {
  const cid = draft.campaign?.id;
  s.campaigns ??= {};
  s.campaigns[cid] = D.campaignRecord(s, cid);
  s.campaigns[cid].events.push({ id: uid(), kind, by, at: new Date().toISOString(), ...extra });
  s.campaigns[cid].events = s.campaigns[cid].events.slice(-50);
}
function kindOf(ctx, rowId) {
  return slice(ctx.state).history?.[ctx.role]?.find((r) => r.id === rowId)?.kind ?? "ask";
}
function currentOpenReview(ctx) {
  const reviews = D.listReviews(slice(ctx.state), ctx.role);
  return (
    reviews.find((row) => row.id === ui.openReviewId) ??
    reviews.filter((row) => row.status !== "discarded").at(-1)
  );
}
function setEntryAccess(ctx, draft, entryId, mode) {
  const entry = getCampaignEntry(draft, entryId, ctx.role);
  setCampaignEntryAccess(
    draft,
    entry.id,
    { access: { mode, grants: [] }, expectedAccessRevision: entry.accessRevision },
    ctx.role,
    { online: !ctx.offline },
  );
}

/**
 * Every command the assistant UI runs. Each one throws a refusal ({it, en}) instead of
 * changing anything; the UI shows it inline and as a toast. Exported for the tests.
 */
export const actions = {
  ask(ctx, question) {
    const id = uid();
    const external = engine(ctx) === "external";
    const local = engine(ctx) === "local";
    ui.open[ctx.role + "ask"] = id;
    ui.discarded = null;
    focusLater(`#assistant-q-${cssId(id)}`);
    change(ctx, "domanda registrata", "question recorded", (draft, s) =>
      external
        ? D.startExternal(draft, s, ctx.role, question, { lang: ctx.lang, id })
        : D.ask(draft, s, ctx.role, question, {
            lang: ctx.lang,
            id,
            engine: local ? "local" : "demo",
          }),
    );
    return id;
  },
  write(ctx, request) {
    const id = uid();
    ui.open[ctx.role + "write"] = id;
    ui.discarded = null;
    focusLater(`#assistant-q-${cssId(id)}`);
    change(ctx, "proposta generata", "proposal generated", (draft, s) =>
      D.write(draft, s, ctx.role, request, { lang: ctx.lang, id }),
    );
    return id;
  },
  entryWrite(ctx, entryId, theme) {
    const id = uid();
    ui.entry = { role: ctx.role, entryId, rowId: id };
    ui.discarded = null;
    focusLater(`#assistant-q-${cssId(id)}`);
    change(ctx, "proposta dalla voce", "proposal from the entry", (draft, s) =>
      D.write(
        draft,
        s,
        ctx.role,
        { theme, prompt: "", keys: [`entry:${entryId}`] },
        { lang: ctx.lang, id },
      ),
    );
    return id;
  },
  /** Assisted writing inside the note editor (VTL-217), on the editor's own context. */
  editorWrite(ctx, draft, { theme = "summary", prompt = "" } = {}) {
    const id = uid();
    ui.editor = { role: ctx.role, draftId: draft.id, rowId: id, theme, prompt };
    ui.discarded = null;
    focusLater(`#assistant-q-${cssId(id)}`);
    change(ctx, "proposta nell’editor", "proposal in the editor", (d, s) =>
      D.write(
        d,
        s,
        ctx.role,
        { theme, prompt, keys: editorKeys(ctx, draft) },
        { lang: ctx.lang, id },
      ),
    );
    return id;
  },
  /**
   * Keep (VTL-217): inserts the proposal at the cursor of the note being edited (at the
   * end when the cursor is unknown). The editor's own input handling records it as an
   * unsaved change of that draft; nothing is saved until the author saves.
   */
  insert(ctx, rowId, field, draftId, caret = ui.caret?.draftId === draftId ? ui.caret : null) {
    const raw = D.findHistory(slice(ctx.state), ctx.role, rowId);
    const row = D.projectHistoryRow(raw, D.accessibleKeys(ctx.state, slice(ctx.state), ctx.role));
    if (row.status === "discarded")
      D.fail("Ripristina prima la proposta.", "Restore the proposal first.");
    if (!row.answer?.found) D.fail("Non c’è nulla da inserire.", "There is nothing to insert.");
    if (emptiedRow(row)) emptiedFail();
    if (!field)
      D.fail(
        "Apri l’editor della nota per inserire il testo.",
        "Open the note editor to insert the text.",
      );
    const text = D.rowText(row, ctx.lang);
    let value = String(field.value ?? "");
    // Opened with "/" (Quest Portal, VTL-217): the proposal takes the place of the "/".
    const slash = ui.slash?.draftId === draftId ? ui.slash : null;
    ui.slash = null;
    if (slash && value[slash.at] === "/") {
      value = value.slice(0, slash.at) + value.slice(slash.at + 1);
      caret = { start: slash.at, end: slash.at };
    }
    const at = caret ? Math.min(caret.end, value.length) : value.length;
    const before = value.slice(0, at);
    const after = value.slice(at);
    const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const tail = !after || after.startsWith("\n") ? "" : "\n\n";
    field.value = before + lead + text + tail + after;
    const end = (before + lead + text).length;
    field.dispatchEvent?.(new Event("input", { bubbles: true }));
    ui.caret = { draftId, start: end, end };
    change(ctx, "proposta inserita nella nota", "proposal inserted into the note", (d, s) =>
      D.keep(s, ctx.role, rowId, { draftId, how: "inserted" }),
    );
    ctx.toast(
      ctx.t(
        "Testo inserito nella nota: salva la bozza per conservarlo.",
        "Text inserted into the note: save the draft to keep it.",
      ),
    );
    return { value: field.value, end };
  },
  /**
   * "/" typed alone on an empty line of the note text (VTL-217): remembers where, so a
   * kept proposal takes its place. Returns the position, or null for an ordinary "/".
   */
  slash(ctx, draftId, value, caret) {
    const at = slashAt(value, caret);
    ui.slash = at === null ? null : { draftId, at };
    return at;
  },
  /** From B14's story draft: open (or prepare) the Session Review of that session. */
  storyReview(ctx, sessionId) {
    const windowId = `session:${sessionId}`;
    const existing = D.listReviews(slice(ctx.state), ctx.role).find(
      (row) => row.windowId === windowId && row.status !== "discarded",
    );
    let id = existing?.id;
    if (!id) {
      if (hasAssistantDraft(ctx))
        D.fail("Salva o scarta prima la bozza aperta.", "Save or discard the open draft first.");
      id = uid();
      change(ctx, "bozza di resoconto preparata", "recap draft prepared", (d, s) =>
        D.createReview(d, s, ctx.role, { windowId, lang: ctx.lang, id }),
      );
    }
    ui.openReviewId = id;
    ui.review = null;
    focusLater("#assistant-review-title");
    ctx.navigate("campaign", { tab: "assistant", id: "review" });
    return id;
  },
  external(ctx, rowId, text) {
    focusLater(`#assistant-q-${cssId(rowId)}`);
    change(ctx, "risposta del tuo modello registrata", "your model’s answer recorded", (draft, s) =>
      D.recordExternal(s, ctx.role, rowId, text),
    );
  },
  retry(ctx, rowId) {
    focusLater(`#assistant-q-${cssId(rowId)}`);
    change(ctx, "nuovo tentativo", "new attempt", (draft, s) => D.retry(draft, s, ctx.role, rowId));
  },
  /** Keep (VTL-217): the proposal becomes a private note draft in the existing editor. */
  keep(ctx, rowId, back = backTarget(ctx)) {
    const draftId = change(
      ctx,
      "proposta tenuta negli appunti",
      "proposal kept in notes",
      (draft, s) => {
        const raw = D.findHistory(s, ctx.role, rowId);
        const row = D.projectHistoryRow(raw, D.accessibleKeys(draft, s, ctx.role));
        if (row.engine === "external" && !row.answer)
          D.fail("Incolla prima la risposta del tuo modello.", "Paste your model’s answer first.");
        if (emptiedRow(row)) emptiedFail();
        const id = uid();
        const created = createCampaignDraft(
          draft,
          { id, kind: "note", campaignId: draft.campaign?.id ?? null, returnTo: back },
          ctx.role,
        );
        const title =
          row.kind === "write"
            ? `${ctx.label(D.themeLabel(row.request?.theme))}${row.request?.prompt ? ` · ${row.request.prompt}` : ""}`
            : row.question;
        saveCampaignDraft(
          draft,
          id,
          { data: { ...created.data, title: title.slice(0, 120), body: D.rowText(row, ctx.lang) } },
          ctx.role,
        );
        D.keep(s, ctx.role, rowId, { draftId: id });
        return id;
      },
    );
    ctx.toast(
      ctx.t(
        "Bozza privata creata negli appunti: rivedila e salvala.",
        "Private draft created in your notes: review and save it.",
      ),
    );
    ctx.navigate("notes", { tab: "edit", id: draftId, returnTo: JSON.stringify(back) });
    return draftId;
  },
  discard(ctx, rowId) {
    ui.discarded = { role: ctx.role, id: rowId, kind: kindOf(ctx, rowId) };
    focusLater('[data-assistant-act="restore"]');
    change(ctx, "proposta scartata", "proposal discarded", (draft, s) =>
      D.discard(s, ctx.role, rowId),
    );
  },
  restore(ctx, rowId) {
    ui.discarded = null;
    ui.open[ctx.role + kindOf(ctx, rowId)] = rowId;
    if (ui.entry?.role === ctx.role) ui.entry.rowId = rowId;
    focusLater(`#assistant-q-${cssId(rowId)}`);
    change(ctx, "proposta ripristinata", "proposal restored", (draft, s) =>
      D.restore(s, ctx.role, rowId),
    );
  },
  consent(ctx) {
    change(
      ctx,
      "consenso dato",
      "consent given",
      (draft, s) => D.giveConsent(draft, s, ctx.role),
      SHARED,
    );
  },
  decline(ctx) {
    change(
      ctx,
      "consenso non dato",
      "consent declined",
      (draft, s) => D.declineConsent(draft, s, ctx.role),
      SHARED,
    );
  },
  setExternal(ctx, allowed) {
    change(
      ctx,
      allowed ? "contenuti ammessi nei prompt esterni" : "contenuti esclusi dai prompt esterni",
      allowed ? "content allowed in external prompts" : "content kept out of external prompts",
      (draft, s) => D.setExternalConsent(draft, s, ctx.role, Boolean(allowed)),
      SHARED,
    );
  },
  /**
   * SV-45 (Quest Portal VTL-218, SVC-023): the NPC proposal becomes a campaign NPC with
   * the chosen SRD 5.2.1 stat block, through B16's "Add to scene" flow (createSceneNPC +
   * placeSceneToken, the token menu's hidden name). One atomic change also keeps the cited
   * facts as the NPC's notes (read by whoever sees the NPC sheet: the DM) and links the
   * proposal to it. Undo removes the NPC like any other.
   */
  createNpc(
    ctx,
    rowId,
    { name, creatureId, team = "neutral", sceneId, hidden = true, hideName = false } = {},
  ) {
    if (!dm(ctx)) D.fail("Solo il DM crea i PNG.", "Only the DM creates NPCs.");
    const row = projected(ctx, D.findHistory(slice(ctx.state), ctx.role, rowId));
    if (row.kind !== "write" || row.request?.theme !== "npc")
      D.fail("Non è una proposta di PNG.", "This is not an NPC proposal.");
    if (row.status === "discarded")
      D.fail("Ripristina prima la proposta.", "Restore the proposal first.");
    const entry = getEntry(String(creatureId ?? ""));
    if (entry?.kind !== "creature")
      D.fail(
        "Scegli un profilo di gioco del compendio.",
        "Choose a game profile from the compendium.",
      );
    const clean = String(name ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) D.fail("Dai un nome al PNG.", "Name the NPC.");
    if (clean.length > 100) D.fail("Al massimo 100 caratteri.", "At most 100 characters.");
    const notes = D.rowText(row, ctx.lang);
    const before = new Set(Object.keys(ctx.state.actors ?? {}));
    const host = Object.create(ctx, {
      commit: {
        value: (label, mutator, options) =>
          ctx.commit(
            label,
            (draft) => {
              mutator(draft);
              const id = Object.keys(draft.actors).find((key) => !before.has(key));
              if (!id) return;
              draft.actors[id].notes = notes;
              const own = slice(draft).history?.[ctx.role]?.find((r) => r.id === rowId);
              if (own) own.npcActorId = id;
            },
            options,
          ),
      },
    });
    const result = addCreatureToScene(host, entry, {
      sceneId,
      name: clean,
      team,
      hidden: Boolean(hidden),
      hideName: Boolean(hideName),
    });
    ctx.toast(
      ctx.t(
        `PNG creato: ${clean} (${entry.name.it}) sulla scena «${result.scene.name}»${hidden ? ", nascosto ai giocatori" : ""}.`,
        `NPC created: ${clean} (${entry.name.en}) on the scene “${result.scene.name}”${hidden ? ", hidden from players" : ""}.`,
      ),
    );
    return result;
  },
  revoke(ctx, reason = "") {
    change(
      ctx,
      "consenso revocato",
      "consent withdrawn",
      (draft, s) => D.revokeConsent(draft, s, ctx.role, { reason }),
      SHARED,
    );
  },
  enable(ctx, sources) {
    if (sources && !Object.values(sources).some(Boolean))
      D.fail("Lascia almeno un tipo di fonte.", "Keep at least one kind of source.");
    change(
      ctx,
      "attivato nella campagna",
      "turned on in the campaign",
      (draft, s) => {
        D.enableAssistant(draft, s, ctx.role, { sources });
      },
      SHARED,
    );
  },
  disable(ctx, reason = "") {
    change(
      ctx,
      "disattivato nella campagna",
      "turned off in the campaign",
      (draft, s) => D.disableAssistant(draft, s, ctx.role, { reason }),
      SHARED,
    );
  },
  setSources(ctx, sources) {
    change(
      ctx,
      "fonti consentite cambiate",
      "allowed sources changed",
      (draft, s) => D.setSources(draft, s, ctx.role, sources),
      SHARED,
    );
  },
  setEngine(ctx, value) {
    area.setSetting(ctx, ENGINE, value);
  },
  /** SV-46: saves the local model's address and name (only local addresses). */
  setLocal(ctx, { endpoint, model }) {
    ui.localDraft = { endpoint, model };
    change(ctx, "modello locale salvato", "local model saved", (draft, s) =>
      D.setLocalModel(s, ctx.role, { endpoint, model }),
    );
    ui.localDraft = null;
    ctx.toast(
      ctx.t(
        "Indirizzo e modello salvati: ora puoi provare la connessione.",
        "Address and model saved: you can now test the connection.",
      ),
    );
  },
  /** «Prova la connessione», simulated: nothing is contacted, no request leaves the browser. */
  testLocal(ctx) {
    return change(
      ctx,
      "prova simulata del modello locale",
      "simulated local model test",
      (draft, s) => D.testLocalModel(s, ctx.role),
    );
  },
  clearHistory(ctx) {
    const count = change(ctx, "cronologia cancellata", "history deleted", (draft, s) =>
      D.clearHistory(s, ctx.role),
    );
    ui.confirmClear = false;
    ui.discarded = null;
    ui.open = {};
    ctx.toast(
      ctx.t(
        `Eliminate ${count} voci della tua cronologia.`,
        `Deleted ${count} items of your history.`,
      ),
    );
    return count;
  },
  createReview(ctx, windowId, format = "narrative") {
    if (hasAssistantDraft(ctx))
      D.fail("Salva o scarta prima la bozza aperta.", "Save or discard the open draft first.");
    const id = uid();
    ui.openReviewId = id;
    ui.review = null;
    focusLater("#assistant-review-title");
    change(ctx, "bozza di resoconto preparata", "recap draft prepared", (draft, s) =>
      D.createReview(draft, s, ctx.role, { windowId, format, lang: ctx.lang, id }),
    );
    return id;
  },
  /** Edits the working copy (what typing does); nothing is saved until saveReview. */
  editReview(ctx, patch = {}) {
    const review = currentOpenReview(ctx);
    if (!review || review.status !== "draft") D.fail("Nessuna bozza aperta.", "No open draft.");
    const work = ensureWorking(ctx, review);
    for (const key of ["title", "summary", "format", "beats", "entities", "excludedKeys"])
      if (patch[key] !== undefined) work[key] = structuredClone(patch[key]);
    work.dirty = true;
    return work;
  },
  saveReview(ctx) {
    if (!ui.review) D.fail("Nessuna modifica da salvare.", "No change to save.");
    change(ctx, "bozza di resoconto salvata", "recap draft saved", (draft, s) => {
      saveWorking(ctx, draft, s);
      ui.review = null;
    });
    ctx.toast(
      ctx.t(
        "Bozza salvata: resta privata finché non la pubblichi.",
        "Draft saved: it stays private until you publish it.",
      ),
    );
  },
  regen(ctx, prompt = "") {
    const review = currentOpenReview(ctx);
    const work = ensureWorking(ctx, review);
    focusLater('[data-review-field="summary"]');
    change(ctx, "riassunto rigenerato", "summary re-run", (draft, s) => {
      saveWorking(ctx, draft, s);
      D.regenerateSummary(draft, s, ctx.role, work.id, { prompt, format: work.format });
      ui.review = null;
    });
  },
  rebuild(ctx) {
    const work = ensureWorking(ctx, currentOpenReview(ctx));
    change(ctx, "bozza ricreata dalle fonti", "draft rebuilt from sources", (draft, s) => {
      saveWorking(ctx, draft, s);
      D.rebuildReview(draft, s, ctx.role, work.id, { excludedKeys: work.excludedKeys });
      ui.review = null;
    });
  },
  discardReview(ctx) {
    const id = ui.review?.id ?? currentOpenReview(ctx)?.id;
    change(ctx, "bozza di resoconto scartata", "recap draft discarded", (draft, s) =>
      D.discardReview(s, ctx.role, id),
    );
    ui.review = null;
    ui.openReviewId = null;
    ctx.toast(
      ctx.t(
        "Bozza scartata: puoi ripristinarla dall’elenco.",
        "Draft discarded: you can restore it from the list.",
      ),
    );
  },
  restoreReview(ctx, id) {
    ui.openReviewId = id;
    ui.review = null;
    change(ctx, "bozza di resoconto ripristinata", "recap draft restored", (draft, s) =>
      D.restoreReview(s, ctx.role, id),
    );
  },
  /** Shares the reviewed recap: a campaign journal entry every member reads. */
  publish(ctx, reviewId) {
    ui.review = null;
    ui.openReviewId = reviewId;
    focusLater("#assistant-review-title");
    change(
      ctx,
      "resoconto pubblicato nel Diario",
      "recap published to the journal",
      (draft, s) => {
        const { review, story } = D.publishCheck(draft, s, ctx.role, reviewId);
        const id = story?.draftId ?? uid();
        const created = story
          ? getCampaignDraft(draft, id, ctx.role)
          : createCampaignDraft(
              draft,
              { id, kind: "recap", campaignId: draft.campaign.id },
              ctx.role,
            );
        const body = D.recapBody(review, ctx.lang);
        saveCampaignDraft(
          draft,
          id,
          {
            data: {
              ...created.data,
              title: D.reviewTitle(review, ctx.lang),
              body: story ? D.storyBody(story, body) : body,
            },
            access: { mode: "campaign", grants: [] },
          },
          ctx.role,
        );
        const preview = previewCampaignDraft(draft, id, ctx.role);
        if (!preview.canApply) D.fail(preview.errors[0].it, preview.errors[0].en);
        const result = applyCampaignDraft(draft, id, { reviewKey: preview.reviewKey }, ctx.role, {
          online: !ctx.offline,
        });
        D.markPublished(s, reviewId, { entryId: result.entryId });
        auditOn(draft, s, "published", ctx.role);
      },
      SHARED,
    );
    ctx.toast(ctx.t("Resoconto pubblicato nel Diario.", "Recap published to the journal."));
  },
  /** Correction with a reason: players stop reading the entry; it can be published again. */
  withdraw(ctx, reviewId, reason) {
    ui.openReviewId = reviewId;
    focusLater("#assistant-review-title");
    change(
      ctx,
      "resoconto ritirato: " + String(reason ?? "").trim(),
      "recap withdrawn: " + String(reason ?? "").trim(),
      (draft, s) => {
        const review = s.reviews.find((row) => row.id === reviewId);
        D.markWithdrawn(s, reviewId, { reason });
        setEntryAccess(ctx, draft, review.publishedEntryId, "private");
        auditOn(draft, s, "withdrawn", ctx.role, { reason: String(reason).trim() });
      },
      SHARED,
    );
  },
  republish(ctx, reviewId) {
    ui.openReviewId = reviewId;
    focusLater("#assistant-review-title");
    change(
      ctx,
      "resoconto ripubblicato",
      "recap published again",
      (draft, s) => {
        const review = D.republishCheck(draft, s, ctx.role, reviewId);
        D.markRepublished(s, reviewId);
        setEntryAccess(ctx, draft, review.publishedEntryId, "campaign");
        auditOn(draft, s, "republished", ctx.role);
      },
      SHARED,
    );
  },
};

function openDialog(ctx, kind, data = {}) {
  if (kind === "enable") {
    const rec = record(ctx);
    ctx.dialog(
      ctx.t("Attivare l’assistente nella campagna?", "Turn the assistant on in the campaign?"),
      `<div class="assistant-dialog"><p>${ctx.t("È una <strong>simulazione</strong>: nessun modello, nessuna rete, nessun costo. Le risposte sono frasi estratte e citate.", "It is a <strong>simulation</strong>: no model, no network, no cost. Answers are extracted, cited sentences.")}</p>
<fieldset><legend>${ctx.t("Cosa può leggere", "What it may read")}</legend>${D.SOURCE_KINDS.map((kind) => `<label class="campaign-check"><input type="checkbox" name="source-${kind}" ${rec.sources[kind] ? "checked" : ""}>${ctx.esc(ctx.label(SOURCE_NAMES[kind]))}</label>`).join("")}</fieldset>
<h3>${ctx.t("Cosa non legge mai", "What it never reads")}</h3><ul><li>${ctx.t("Note e sezioni «Solo io», anche le tue, e i messaggi «Solo io» in chat", "“Only me” notes and sections, yours too, and “Only me” chat messages")}</li><li>${ctx.t("Schede private ed eventi privati del registro", "Private sheets and private log events")}</li><li>${ctx.t("Messaggi e voci di chi non ha dato il consenso", "Messages and entries of anyone without consent")}</li></ul>
<h3>${ctx.t("Conservazione", "Retention")}</h3><p>${ctx.t("Il generatore dimostrativo lavora in questo browser. Chi sceglie «Il tuo modello» può copiare in uno strumento esterno estratti delle fonti che legge, anche contenuti di altri membri con consenso: quello strumento è fuori da queste promesse. Il consenso lo dice, l’elenco dei membri mostra chi usa il proprio modello e ognuno può escludere i propri contenuti da quei prompt. Ogni membro vede solo la propria cronologia; i resoconti diventano pubblici solo quando li pubblichi.", "The demonstration generator works in this browser. Anyone choosing “Your own model” may copy into an external tool excerpts of the sources they read, including other members’ consented content: that tool is outside these promises. The consent text says so, the member list shows who uses their own model and each member can keep their own content out of those prompts. Each member sees only their own history; recaps become public only when you publish them.")}</p>
<p>${ctx.t("Tutti i membri vedranno che è attivo e sceglieranno se dare il consenso.", "Every member will see it is on and choose whether to give consent.")}</p></div>`,
      {
        submitLabel: ctx.t("Attiva l’assistente", "Turn the assistant on"),
        onSubmit: (form) =>
          actions.enable(
            ctx,
            Object.fromEntries(D.SOURCE_KINDS.map((k) => [k, form.has(`source-${k}`)])),
          ),
      },
    );
  } else if (kind === "disable" || kind === "revoke") {
    const disable = kind === "disable";
    ctx.dialog(
      disable
        ? ctx.t("Disattivare l’assistente?", "Turn the assistant off?")
        : ctx.t("Revocare il consenso?", "Withdraw consent?"),
      `<div class="assistant-dialog"><p>${disable ? ctx.t("Nessuno potrà fare domande o preparare resoconti. Le cronologie personali restano finché ognuno non le cancella; i resoconti pubblicati restano nel Diario.", "Nobody can ask questions or prepare recaps. Personal histories stay until each person deletes them; published recaps stay in the journal.") : ctx.t("Da subito i tuoi messaggi e le tue voci escono da nuove risposte, proposte e resoconti. I resoconti già pubblicati restano finché il DM non li ritira.", "From now on your messages and entries leave new answers, proposals and recaps. Recaps already published stay until the DM withdraws them.")}</p><label class="field">${ctx.t("Motivo (facoltativo, visibile a tutti i membri nel registro del consenso)", "Reason (optional, visible to every member in the consent log)")}<input name="reason" maxlength="${D.MAX_REASON}"></label></div>`,
      {
        submitLabel: disable
          ? ctx.t("Disattiva", "Turn off")
          : ctx.t("Revoca il consenso", "Withdraw consent"),
        onSubmit: (form) =>
          disable
            ? actions.disable(ctx, String(form.get("reason") ?? ""))
            : actions.revoke(ctx, String(form.get("reason") ?? "")),
      },
    );
  } else if (kind === "publish") {
    const { review, audience, story } = D.publishCheck(
      ctx.state,
      slice(ctx.state),
      ctx.role,
      data.id,
    );
    const shared = D.collectSources(ctx.state, slice(ctx.state), ctx.role, {
      audience: "campaign",
    }).excluded;
    ctx.dialog(
      ctx.t("Rivedi prima di pubblicare", "Review before publishing"),
      `<div class="assistant-dialog"><p>${ctx.t("Chi lo leggerà nel Diario", "Who will read it in the journal")}: <strong>${ctx.esc(audience.map((p) => memberName(ctx, p.id)).join(", "))}</strong> (${ctx.t("tutto il gruppo della campagna", "the whole campaign group")}).</p><p class="muted">${ctx.t("Mai nei resoconti condivisi di questa campagna", "Never in this campaign’s shared recaps")}: ${ctx.esc(
        [
          count(
            ctx,
            shared.restricted,
            ["fonte riservata", "fonti riservate"],
            ["restricted source", "restricted sources"],
          ),
          count(
            ctx,
            shared.whisper,
            ["sussurro o messaggio nascosto", "sussurri o messaggi nascosti"],
            ["whisper or hidden message", "whispers or hidden messages"],
          ),
          count(
            ctx,
            shared.offTable,
            ["messaggio fuori personaggio", "messaggi fuori personaggio"],
            ["out-of-character message", "out-of-character messages"],
          ),
        ].join(", "),
      )}.</p>${story ? `<p class="assistant-pending">${ctx.esc(ctx.t(`Completa la bozza «${story.title}» preparata alla fine della sessione (presenze, durata, scene): un solo resoconto per la sessione.`, `Completes the draft “${story.title}” prepared when the session ended (attendance, duration, scenes): one recap per session.`))}</p>` : ""}<h3>${ctx.esc(D.reviewTitle(review, ctx.lang))}</h3><pre class="assistant-preview">${ctx.esc(story ? D.storyBody(story, D.recapBody(review, ctx.lang)) : D.recapBody(review, ctx.lang))}</pre></div>`,
      {
        submitLabel: ctx.t("Pubblica nel Diario", "Publish to the journal"),
        onSubmit: () => actions.publish(ctx, data.id),
      },
    );
  } else if (kind === "withdraw") {
    ctx.dialog(
      ctx.t("Ritirare il resoconto dal Diario?", "Withdraw the recap from the journal?"),
      `<div class="assistant-dialog"><p>${ctx.t("I giocatori non lo leggeranno più; resta tra le tue voci e puoi ripubblicarlo.", "Players will no longer read it; it stays among your entries and you can publish it again.")}</p><label class="field">${ctx.t("Motivo della correzione (visibile a tutti i membri nel registro del consenso)", "Reason for the correction (visible to every member in the consent log)")}<input name="reason" maxlength="${D.MAX_REASON}" required minlength="3"></label></div>`,
      {
        submitLabel: ctx.t("Ritira", "Withdraw"),
        onSubmit: (form) => actions.withdraw(ctx, data.id, String(form.get("reason") ?? "")),
      },
    );
  } else if (kind === "npc") {
    const row = projected(ctx, D.findHistory(slice(ctx.state), ctx.role, data.id));
    const scenes = ctx.state.scenes ?? [];
    const active = ctx.state.activeSceneId;
    const revealed = scenes.find((scene) => scene.id === active)?.revealed === true;
    const policyHides =
      ctx.state.ext?.["campaign-settings"]?.campaigns?.[campaignId(ctx)]?.policy?.creatureName ===
      "dm";
    const canHideName = Boolean(ctx.state.ext?.["token-menu"]);
    const proposed = row.npc?.creatureId ?? D.NPC_DEFAULT_BLOCK;
    const blocks = D.npcBlocks();
    ctx.dialog(
      ctx.t("Crea il PNG", "Create the NPC"),
      `<div class="assistant-dialog"><label class="field">${ctx.t("Nome del PNG", "NPC name")}<input name="name" maxlength="100" required value="${ctx.esc(row.npc?.name ?? "")}"></label>
<label class="field">${ctx.t("Profilo di gioco (SRD 5.2.1)", "Game profile (SRD 5.2.1)")}<select name="block">${blocks.map((block) => `<option value="${ctx.esc(block.id)}" ${block.id === proposed ? "selected" : ""}>${ctx.esc(D.blockLine(block, ctx.lang))}${block.id === proposed ? ctx.t(" · proposto", " · suggested") : ""}</option>`).join("")}</select></label>
<p class="muted">${ctx.esc(row.npc?.role ? ctx.t(`Proposto dal ruolo «${row.npc.role}»: cambialo se non è giusto.`, `Suggested from the role “${row.npc.role}”: change it if it is not right.`) : ctx.t("Nessun ruolo nella richiesta: proposto il Popolano. Cambialo se non è giusto.", "No role in the request: Commoner suggested. Change it if it is not right."))} ${ctx.t("Come «Aggiungi alla scena» del compendio: CA, PF medi, Velocità e caratteristiche del blocco e, se strutturato, il primo attacco in mischia. Non entra in iniziativa.", "As the compendium’s “Add to scene”: the block’s AC, average HP, Speed and ability scores and, when structured, its first melee attack. It does not join initiative.")}</p>
<label class="field">${ctx.t("Disposizione verso il gruppo", "Disposition toward the party")}<select name="team"><option value="neutral">${ctx.t("Neutrale", "Neutral")}</option><option value="watch">${ctx.t("Ostile al gruppo", "Hostile to the party")}</option><option value="party">${ctx.t("Alleato al gruppo", "Allied to the party")}</option></select></label>
<label class="field">${ctx.t("Scena", "Scene")}<select name="scene">${scenes.map((scene) => `<option value="${ctx.esc(scene.id)}" ${scene.id === active ? "selected" : ""}>${ctx.esc(scene.name)}${scene.id === active ? ctx.t(" · attiva al Tavolo", " · active at the Table") : ""}${scene.revealed ? "" : ctx.t(" · non rivelata", " · not revealed")}</option>`).join("")}</select></label>
<fieldset><legend>${ctx.t("Chi lo vede", "Who sees it")}</legend><label class="campaign-check"><input type="checkbox" name="hidden" ${revealed ? "" : "checked"}>${ctx.t("Arriva nascosto ai giocatori (lo riveli dal menu della pedina)", "Arrives hidden from players (reveal it from the token menu)")}</label>${policyHides ? `<p class="muted">${ctx.t("Il nome sarà nascosto ai giocatori: è il predefinito della campagna.", "The name will be hidden from players: it is the campaign default.")}</p>` : canHideName ? `<label class="campaign-check"><input type="checkbox" name="hideName">${ctx.t("Nascondi il nome ai giocatori", "Hide the name from players")}</label>` : ""}</fieldset>
<h3>${ctx.t("Annotazioni della scheda", "Sheet annotations")}</h3><p class="muted">${ctx.t("I fatti citati diventano le annotazioni del PNG: le legge chi vede la sua scheda (il DM).", "The cited facts become the NPC’s annotations: whoever sees its sheet (the DM) reads them.")}</p><pre class="assistant-preview">${ctx.esc(D.rowText(row, ctx.lang))}</pre></div>`,
      {
        submitLabel: ctx.t("Crea il PNG", "Create the NPC"),
        onSubmit: (form) => {
          actions.createNpc(ctx, data.id, {
            name: String(form.get("name") ?? ""),
            creatureId: String(form.get("block") ?? ""),
            team: String(form.get("team") ?? "neutral"),
            sceneId: String(form.get("scene") ?? ""),
            hidden: form.get("hidden") === "on",
            hideName: policyHides || form.get("hideName") === "on",
          });
          focusLater(`#assistant-q-${cssId(data.id)}`);
          ctx.render();
        },
      },
    );
  } else if (kind === "rebuild") {
    ctx.dialog(
      ctx.t("Ricreare la bozza dalle fonti?", "Rebuild the draft from the sources?"),
      `<p>${ctx.t("Momenti, entità e riassunto vengono ricreati dalle fonti incluse; le modifiche a momenti ed entità vanno perse. Il titolo resta.", "Beats, entities and summary are rebuilt from the included sources; edits to beats and entities are lost. The title stays.")}</p>`,
      {
        submitLabel: ctx.t("Ricrea", "Rebuild"),
        onSubmit: () => actions.rebuild(ctx),
      },
    );
  }
}

/** Where a card's refusal is shown: the editor panel, the entry panel or Ask. */
function placeOf(button) {
  if (button.closest?.("[data-assistant-editor]")) return "editor";
  if (button.closest?.(".assistant-entry")) return "entry";
  return "ask";
}
function handle(root, ctx, button) {
  const act = button.dataset.assistantAct;
  const rowId = button.dataset.row;
  const run = (form, fn) => attempt(ctx, form, fn);
  const place = placeOf(button);
  switch (act) {
    case "retry":
      return run(place, () => actions.retry(ctx, rowId));
    case "keep":
      return run(place, () => actions.keep(ctx, rowId));
    case "discard":
      return run(place, () => actions.discard(ctx, rowId));
    case "restore":
      return run(place, () => actions.restore(ctx, rowId));
    case "editor-write": {
      const panel = button.closest?.("[data-assistant-editor]") ?? root;
      const theme = panel.querySelector?.("[data-assistant-editor-theme]")?.value ?? "summary";
      const prompt = panel.querySelector?.("[data-assistant-editor-prompt]")?.value ?? "";
      return run("editor", () => {
        const draft = getCampaignDraft(ctx.state, button.dataset.draft, ctx.role);
        return actions.editorWrite(ctx, draft, { theme, prompt });
      });
    }
    case "insert": {
      const draftId = button.closest?.("[data-assistant-editor]")?.dataset.assistantEditor;
      return run("editor", () => {
        const { end } = actions.insert(ctx, rowId, editorField(button), draftId);
        // The editor was drawn again: put the cursor right after the inserted text.
        const panel = globalThis.document?.querySelector?.(
          `[data-assistant-editor="${cssId(draftId)}"]`,
        );
        const field = editorField(panel);
        field?.focus?.();
        field?.setSelectionRange?.(end, end);
      });
    }
    case "story-review":
      return run("editor", () => actions.storyReview(ctx, button.dataset.session));
    case "show":
      ui.open[ctx.role + button.dataset.kind] = rowId;
      focusLater(`#assistant-q-${cssId(rowId)}`);
      return ctx.render();
    case "copy": {
      const box = root.querySelector(`[data-assistant-prompt="${cssId(rowId)}"]`);
      const text = box?.value ?? "";
      const done = () => ctx.toast(ctx.t("Prompt copiato.", "Prompt copied."));
      const manual = () => {
        box?.focus?.();
        box?.select?.();
        ctx.toast(
          ctx.t(
            "Copia non disponibile: il testo è selezionato, usa Ctrl+C.",
            "Copy unavailable: the text is selected, use Ctrl+C.",
          ),
        );
      };
      try {
        const pending = globalThis.navigator?.clipboard?.writeText(text);
        if (pending?.then) pending.then(done, manual);
        else manual();
      } catch {
        manual();
      }
      return;
    }
    case "entry-write":
      return run("entry", () =>
        actions.entryWrite(ctx, button.dataset.entry, button.dataset.theme),
      );
    case "consent":
      return run("consent", () => actions.consent(ctx));
    case "decline":
      return run("consent", () => actions.decline(ctx));
    case "npc":
      return run(place, () => openDialog(ctx, "npc", { id: rowId }));
    case "open-npc":
      return ctx.openSheet
        ? ctx.openSheet(button.dataset.actor)
        : ctx.navigate("characters", { id: button.dataset.actor });
    case "revoke":
    case "enable":
    case "disable":
      return openDialog(ctx, act);
    case "clear":
      ui.confirmClear = true;
      focusLater('[data-assistant-act="clear-confirm"]');
      return ctx.render();
    case "clear-cancel":
      ui.confirmClear = false;
      focusLater('[data-assistant-act="clear"]');
      return ctx.render();
    case "clear-confirm":
      return run("retention", () => actions.clearHistory(ctx));
    case "open-review":
      if (hasAssistantDraft(ctx)) {
        ui.errors.review = ctx.t(
          "Salva o scarta prima la bozza aperta.",
          "Save or discard the open draft first.",
        );
        ctx.toast(ui.errors.review, true);
        return ctx.render();
      }
      ui.openReviewId = button.dataset.review;
      ui.review = null;
      focusLater("#assistant-review-title");
      return ctx.render();
    case "restore-review":
      return run("review-new", () => actions.restoreReview(ctx, button.dataset.review));
    case "test-local":
      return run("local", () => {
        focusLater("[data-assistant-local-test]");
        actions.testLocal(ctx);
      });
    case "discard-review":
      return run("review", () => actions.discardReview(ctx));
    case "regen":
      readWorking(root);
      return run("review", () =>
        actions.regen(ctx, root.querySelector("[data-review-prompt]")?.value ?? ""),
      );
    case "rebuild":
      readWorking(root);
      return openDialog(ctx, "rebuild");
    case "add-beat":
      readWorking(root);
      ui.review.beats.push({ id: `beat-new-${Date.now()}`, level: 1, text: "", cites: [] });
      markDirty(root, ctx);
      focusLater(`[data-beat-text="${ui.review.beats.length - 1}"]`);
      return ctx.render();
    case "remove-beat": {
      readWorking(root);
      const index = Number(button.dataset.index);
      const [removed] = ui.review.beats.splice(index, 1);
      ui.removedBeat = { reviewId: ui.review.id, index, beat: removed };
      markDirty(root, ctx);
      focusLater('[data-assistant-act="restore-beat"]');
      return ctx.render();
    }
    case "restore-beat": {
      readWorking(root);
      const removed = ui.removedBeat;
      if (removed && ui.review?.id === removed.reviewId)
        ui.review.beats.splice(Math.min(removed.index, ui.review.beats.length), 0, removed.beat);
      ui.removedBeat = null;
      markDirty(root, ctx);
      focusLater(`[data-beat-text="${removed?.index ?? 0}"]`);
      return ctx.render();
    }
    case "remove-entity":
      readWorking(root);
      ui.review.entities.splice(Number(button.dataset.index), 1);
      markDirty(root, ctx);
      return ctx.render();
    case "publish":
      return run("review", () => {
        const work = readWorking(root);
        if (work?.dirty) actions.saveReview(ctx);
        openDialog(ctx, "publish", { id: work?.id ?? currentOpenReview(ctx)?.id });
      });
    // The recap shown next to the button (with the assistant off the list may hold a newer
    // draft than the recap on screen).
    case "withdraw":
      return openDialog(ctx, "withdraw", {
        id: button.dataset.review ?? ui.openReviewId ?? currentOpenReview(ctx)?.id,
      });
    case "republish":
      return run("review", () =>
        actions.republish(
          ctx,
          button.dataset.review ?? ui.openReviewId ?? currentOpenReview(ctx)?.id,
        ),
      );
    default:
      return false;
  }
}
function submit(root, ctx, form) {
  const kind = form.dataset.assistantForm;
  const data = new FormData(form);
  if (kind === "ask")
    return attempt(ctx, "ask", () => actions.ask(ctx, String(data.get("question") ?? "")));
  if (kind === "write")
    return attempt(ctx, "write", () =>
      actions.write(ctx, {
        theme: String(data.get("theme")),
        prompt: String(data.get("prompt") ?? ""),
        keys: data.getAll("keys").map(String),
      }),
    );
  if (kind === "local")
    return attempt(ctx, "local", () => {
      focusLater('[data-assistant-act="test-local"]');
      actions.setLocal(ctx, {
        endpoint: String(data.get("endpoint") ?? ""),
        model: String(data.get("model") ?? ""),
      });
    });
  if (kind === "external")
    return attempt(ctx, "external", () =>
      actions.external(ctx, form.dataset.row, String(data.get("answer") ?? "")),
    );
  if (kind === "review-new")
    return attempt(ctx, "review-new", () =>
      actions.createReview(
        ctx,
        String(data.get("window")),
        String(data.get("format") ?? "narrative"),
      ),
    );
  if (kind === "review")
    return attempt(ctx, "review", () => {
      readWorking(root);
      actions.saveReview(ctx);
    });
  return false;
}

export function bindAssistant(root, ctx) {
  if (!root) return;
  root.querySelectorAll("[data-assistant-tab]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("campaign", {
        tab: "assistant",
        ...(button.dataset.assistantTab === "ask" ? {} : { id: button.dataset.assistantTab }),
      });
  });
  root.querySelectorAll("[data-assistant-act]").forEach((button) => {
    button.onclick = (event) => {
      event?.preventDefault?.();
      handle(root, ctx, button);
    };
  });
  root.querySelectorAll("[data-assistant-form]").forEach((form) => {
    form.onsubmit = (event) => {
      event?.preventDefault?.();
      submit(root, ctx, form);
    };
  });
  root.querySelectorAll("[data-assistant-cite]").forEach((button) => {
    // A citation with a route opens its source (bound below with the other sources).
    if (button.dataset.assistantSource) return;
    button.onclick = () => {
      const target = root.querySelector(
        `#assistant-cite-${cssId(button.dataset.row)}-${button.dataset.assistantCite}`,
      );
      if (target) {
        target.scrollIntoView?.({ block: "nearest" });
        target.focus?.();
      } else ctx.navigate("campaign", { tab: "assistant" });
    };
  });
  root.querySelectorAll("[data-assistant-source]").forEach((button) => {
    button.onclick = () => {
      let route = {};
      try {
        route = JSON.parse(button.dataset.assistantSource);
      } catch {}
      if (!route.page) return;
      const { page, ...params } = route;
      if (["campaign", "notes"].includes(page) && params.tab === "entry")
        params.returnTo = JSON.stringify(backTarget(ctx));
      ctx.navigate(page, params);
    };
  });
  root.querySelectorAll("[data-assistant-source-kind]").forEach((input) => {
    input.onchange = () => {
      const sources = Object.fromEntries(
        [...root.querySelectorAll("[data-assistant-source-kind]")].map((box) => [
          box.dataset.assistantSourceKind,
          box.checked,
        ]),
      );
      focusLater(`[data-assistant-source-kind="${input.dataset.assistantSourceKind}"]`);
      attempt(ctx, "sources", () => actions.setSources(ctx, sources));
    };
  });
  // The member's own opt-out from external prompts (not the pasted-answer field).
  root.querySelectorAll("[data-assistant-external-consent]").forEach((input) => {
    input.onchange = () => {
      focusLater("[data-assistant-external-consent]");
      attempt(ctx, "consent", () => actions.setExternal(ctx, input.checked));
    };
  });
  root.querySelectorAll("[data-assistant-engine]").forEach((input) => {
    input.onchange = () =>
      attempt(ctx, "engine", () => {
        focusLater(`[data-assistant-engine][value="${input.value}"]`);
        actions.setEngine(ctx, input.value);
      });
  });
  // Note editor panel: request fields survive the editor's own redraws; Enter generates
  // (the panel lives inside the editor's form, so Enter must not save the note).
  const panel = root.querySelector("[data-assistant-editor]") ?? null;
  if (panel) {
    const draftId = panel.dataset.assistantEditor;
    const remember = () => {
      const keep = ui.editor?.draftId === draftId && ui.editor.role === ctx.role ? ui.editor : {};
      ui.editor = {
        ...keep,
        role: ctx.role,
        draftId,
        theme: panel.querySelector("[data-assistant-editor-theme]")?.value ?? "summary",
        prompt: panel.querySelector("[data-assistant-editor-prompt]")?.value ?? "",
      };
    };
    panel.querySelector("[data-assistant-editor-theme]")?.addEventListener("change", remember);
    const prompt = panel.querySelector("[data-assistant-editor-prompt]");
    prompt?.addEventListener("input", remember);
    prompt?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      panel.querySelector('[data-assistant-act="editor-write"]')?.click();
    });
    const field = editorField(panel);
    const track = () => {
      ui.caret = { draftId, start: field.selectionStart, end: field.selectionEnd };
    };
    for (const type of ["select", "keyup", "click", "input", "focus"])
      field?.addEventListener(type, track);
    // Quest Portal AI notes (VTL-217): "/" typed alone on an empty line of the text opens
    // the assistant (theme and request); Escape goes back to the text, keeping the "/".
    field?.addEventListener("input", (event) => {
      if (event.data !== "/") return;
      if (actions.slash(ctx, draftId, field.value, field.selectionStart) === null) return;
      const selector = `[data-assistant-editor="${cssId(draftId)}"]`;
      // The editor may redraw on input: look the panel up again once it settled.
      setTimeout(() => {
        const now = globalThis.document?.querySelector?.(selector) ?? panel;
        const live = now.querySelector?.("[data-assistant-slash-live]");
        if (live)
          live.textContent = ctx.t(
            "Comando «/»: scegli il tema, scrivi la richiesta e premi Invio. Esc torna al testo.",
            "“/” command: pick the theme, write the request and press Enter. Escape goes back to the text.",
          );
        now.querySelector?.("[data-assistant-editor-theme]")?.focus?.();
      }, 0);
    });
    const back = (event) => {
      if (event.key !== "Escape" || ui.slash?.draftId !== draftId) return;
      event.preventDefault();
      event.stopPropagation?.();
      const at = ui.slash.at + 1;
      ui.slash = null;
      field?.focus?.();
      field?.setSelectionRange?.(at, at);
    };
    panel.querySelector("[data-assistant-editor-theme]")?.addEventListener("keydown", back);
    prompt?.addEventListener("keydown", back);
  }
  // Session Review working copy: typing never re-renders; Tab/Shift+Tab change a beat's level.
  const review = root.querySelector('[data-assistant-form="review"]');
  if (review) {
    review
      .querySelectorAll("[data-review-field], [data-beat-text], [data-entity-name]")
      .forEach((input) => {
        input.addEventListener("input", () => {
          readWorking(root);
          markDirty(root, ctx);
        });
        input.addEventListener("change", () => {
          readWorking(root);
          markDirty(root, ctx);
        });
      });
    review.querySelectorAll("[data-beat-level]").forEach((select) => {
      select.onchange = () => {
        readWorking(root);
        const beat = ui.review.beats[Number(select.dataset.beatLevel)];
        beat.level = Number(select.value);
        select.closest(".assistant-beat").className = `assistant-beat level-${beat.level}`;
        markDirty(root, ctx);
      };
    });
    review.querySelectorAll("[data-entity-kind]").forEach((select) => {
      select.onchange = () => {
        readWorking(root);
        ui.review.entities[Number(select.dataset.entityKind)].kind = select.value;
        markDirty(root, ctx);
      };
    });
    review.querySelectorAll("[data-beat-text]").forEach((input) => {
      // Tabbing through the form never edits: a beat is "armed" only after the user types,
      // clicks or moves the caret in it (list editors indent from the start of an item).
      input.addEventListener("focus", () => armed.delete(input));
      input.addEventListener("input", () => armed.add(input));
      input.addEventListener("pointerup", () => armed.add(input));
      input.addEventListener("keyup", (event) => {
        if (CARET_KEYS.includes(event.key)) armed.add(input);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) return;
        const index = Number(input.dataset.beatText);
        const beat = ui.review?.beats[index];
        if (!beat) return;
        const next = beatLevelOnTab(beat, event.shiftKey, {
          armed: armed.has(input),
          start: input.selectionStart,
          end: input.selectionEnd,
        });
        if (next === null) return;
        event.preventDefault();
        readWorking(root);
        beat.level = next;
        const row = input.closest(".assistant-beat");
        row.className = `assistant-beat level-${next}`;
        const select = row.querySelector("[data-beat-level]");
        if (select) select.value = String(next);
        const live = root.querySelector("[data-assistant-live]");
        if (live)
          live.textContent = ctx.t(
            `Momento ${index + 1}: ${levelName(ctx, next)}`,
            `Beat ${index + 1}: ${levelName(ctx, next)}`,
          );
        markDirty(root, ctx);
      });
    });
    review.querySelectorAll("[data-assistant-include]").forEach((box) => {
      box.onchange = () => {
        readWorking(root);
        const keys = new Set(ui.review.excludedKeys);
        if (box.checked) keys.delete(box.value);
        else keys.add(box.value);
        ui.review.excludedKeys = [...keys];
        ui.review.sourcesOpen = true;
        markDirty(root, ctx);
        focusLater(`[data-assistant-include][value="${cssId(box.value)}"]`);
        ctx.render();
      };
    });
  }
  applyFocus(root);
}

// ------------------------------------------------------------------------ registration

export function register(registry) {
  area = registry;
  const isMember = (ctx) => Boolean(ctx?.state?.campaign?.id) && member(ctx);
  registry.registerStateSlice(D.SLICE, {
    version: D.VERSION,
    // Consent, histories and recap drafts are communication records, not gameplay:
    // gameplay Undo never rewrites them; corrections are explicit commands.
    undo: "preserve",
    seed: D.seedAssistant,
    normalize: D.normalizeAssistant,
  });
  registry.registerStyles(new URL("./assistant.css", import.meta.url));
  registry.add("campaign-section", {
    id: "assistant",
    group: "manage",
    label: L("Assistente", "Assistant"),
    order: 80,
    when: isMember,
    render: renderAssistant,
    bind: bindAssistant,
  });
  registry.add("campaign-section", {
    id: "assistant.entry",
    label: L("Assistente sulla voce", "Assistant on the entry"),
    when: (ctx, entry) => Boolean(entry?.id) && isMember(ctx),
    render: (ctx, entry) => entryPanel(ctx, entry),
    bind: bindAssistant,
  });
  // Inside the note/entry editor (B12 renders ".editor" contributions under the text).
  registry.add("campaign-section", {
    id: "assistant.editor",
    label: L("Assistente nell’editor", "Assistant in the editor"),
    when: (ctx, draft) => Boolean(draft?.id) && EDITABLE.includes(draft.kind) && isMember(ctx),
    render: (ctx, draft) => editorPanel(ctx, draft),
    bind: bindAssistant,
  });
  registry.add("table-panel", {
    id: "assistant",
    section: "reference",
    label: L("Assistente", "Assistant"),
    placement: "sidebar-tab",
    icon: "search",
    order: 120,
    when: (ctx) => isMember(ctx) && record(ctx).enabled,
    render: (ctx) => tableDrawer(ctx),
    bind: bindAssistant,
  });
  registry.add("settings", {
    id: "assistant-engine",
    label: L("Assistente (simulazione)", "Assistant (simulation)"),
    scope: "personal",
    fields: [
      {
        id: "engine",
        label: L("Motore delle risposte", "Answer engine"),
        type: "choice",
        default: "demo",
        options: [
          {
            value: "demo",
            label: L(
              "Generatore dimostrativo in questo browser",
              "Demonstration generator in this browser",
            ),
          },
          {
            value: "external",
            label: L("Il tuo modello (prompt da copiare)", "Your own model (prompt to copy)"),
          },
          {
            value: "local",
            label: L("Modello locale (simulato)", "Local model (simulated)"),
          },
        ],
      },
    ],
  });
  registry.add("notifications", {
    id: "assistant",
    label: L("Assistente", "Assistant"),
    when: isMember,
    collect(ctx) {
      const s = slice(ctx.state);
      const rec = record(ctx);
      if (!rec.enabled) return [];
      const rows = [];
      if (D.consentOf(s, campaignId(ctx), ctx.role) === "pending")
        rows.push({
          id: "assistant-consent",
          title: L(
            "L’assistente è attivo: dai o nega il consenso",
            "The assistant is on: give or decline consent",
          ),
          body: L(
            "Scegli in Consenso e dati; finché non scegli, i tuoi messaggi e le tue voci restano fuori.",
            "Choose in Consent and data; until you do, your messages and entries stay out.",
          ),
          time: rec.enabledAt,
          category: "assistant",
          target: { page: "campaign", params: { tab: "assistant", id: "consent" } },
        });
      for (const session of D.sessionsToReview(ctx.state, s, ctx.role).filter(
        // B14 already announces its open story draft; its editor offers the Session Review.
        (row) => row.story?.status !== "active",
      ))
        rows.push({
          id: `assistant-review-${session.id}`,
          title: L(
            `Sessione ${session.number} conclusa: prepara il resoconto`,
            `Session ${session.number} ended: prepare the recap`,
          ),
          time: session.endedAt,
          category: "assistant",
          target: { page: "campaign", params: { tab: "assistant", id: "review" } },
        });
      return rows;
    },
  });
  registry.add("command", {
    id: "assistant.ask",
    label: L("Chiedi all’assistente (simulazione)", "Ask the assistant (simulation)"),
    group: "assistant",
    when: isMember,
    run: (ctx) => ctx.navigate("campaign", { tab: "assistant" }),
  });
  registry.add("command", {
    id: "assistant.local-model",
    label: L("Collega un modello locale all’assistente", "Connect a local model to the assistant"),
    description: L(
      "modello locale, IA locale, LLM, Ollama, LM Studio, endpoint, localhost, rete di casa, prova la connessione",
      "local model, local AI, LLM, Ollama, LM Studio, endpoint, localhost, home network, test the connection",
    ),
    group: "campaign",
    when: (ctx) => isMember(ctx),
    run: (ctx) => ctx.navigate("campaign", { tab: "assistant", id: "consent" }),
  });
  registry.add("search", {
    id: "assistant-search",
    label: L("Assistente", "Assistant"),
    search(ctx, query) {
      const q = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (q.length < 3 || !isMember(ctx)) return [];
      const words = [
        "assistente",
        "assistant",
        "resoconto",
        "recap",
        "consenso",
        "consent",
        "domanda",
        "question",
      ];
      if (!words.some((word) => word.includes(q) || q.includes(word))) return [];
      return [
        {
          title: L(
            "Assistente (simulazione) · domande, scrittura, resoconti",
            "Assistant (simulation) · questions, writing, recaps",
          ),
          page: "campaign",
          params: { tab: "assistant" },
        },
      ];
    },
  });
  registry.add("draft-guard", {
    id: "assistant-review",
    label: L("Bozza del resoconto non salvata", "Unsaved recap draft"),
    hasDraft: (ctx, next) =>
      hasAssistantDraft(ctx) &&
      !(
        next &&
        next.page === "campaign" &&
        next.tab === "assistant" &&
        next.id === "review" &&
        !next.role
      ),
    confirm: (ctx, proceed) =>
      ctx.dialog(
        ctx.t("Bozza del resoconto non salvata", "Unsaved recap draft"),
        `<p>${ctx.t("Hai modificato il resoconto senza salvarlo.", "You changed the recap without saving it.")}</p>`,
        {
          submitLabel: ctx.t("Scarta le modifiche", "Discard the changes"),
          cancelLabel: ctx.t("Continua a modificare", "Keep editing"),
          onSubmit: () => {
            ui.review = null;
            proceed();
          },
        },
      ),
  });
  registry.on("role-changed", () => resetAssistantView());
  registry.on("navigate", () => {
    ui.errors = {};
    ui.confirmClear = false;
  });
  registry.on("reset", () => resetAssistantView());
}
