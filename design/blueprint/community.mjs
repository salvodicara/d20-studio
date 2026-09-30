// Area B59 — Public tables, group finder and moderation. Entry module loaded by
// extensions.mjs through the B11 registry. Delegated inclusion as a SIMULATION (census
// card B59): synthetic listings and strangers, no network, nothing sent.
//
// Where it appears (Roll20 SVC-003: "Join A Game" on the home page, in the Games menu and
// on My Games; here the Home widget and a "Trova un tavolo" button on Campagne, B13's My
// Games. The header has no Games menu: Campagne is a single link to My Games):
// - route #community: Join a Game search and listing pages (R20-004, SVC-004), my
//   applications and "looking for a group" profile (Kanka SVC-041, Roll20 R20-006), my
//   listings (Roll20 "Looking for Players → Manage Listing", SVC-067), code of conduct,
//   reports and blocks (Roll20 SVC-148–150, DDB-157), and the read-only public page of a
//   campaign (Kanka SVC-042, Roll20 SVC-032, LegendKeeper CMP-58);
// - campaign section "Reclutamento" for the DM: the same management for the current
//   campaign, next to Members (Roll20 Game Details → Looking for Players);
// - a home widget, search results, palette commands and notifications (Kanka SVC-153).
// Domain rules live in community-domain.mjs.

import * as D from "./community-domain.mjs";
import { readLocalFile } from "./media-ui.mjs";
import { bindTextEmbeds, renderTextWithEmbeds } from "./text-embeds.mjs";

// SV-28, close review 01/10 (k-ID, Roll20 13/16): the account's age band and parent's
// consent, read through the account area when it is built (optional neighbour).
let account = null;
export const neighboursReady = import("./account.mjs").then(
  (module) => (account = module),
  () => null,
);
const policyFor = (ctx) =>
  account?.agePolicy?.(ctx.state, ctx.role) ?? {
    declared: false,
    publicTables: true,
    adultListings: true,
    reason: null,
  };

const L = (it, en) => ({ it, en });
const SUBTABS = ["status", "listing", "public", "players"];

// ---------------------------------------------------------------- view memory

// Search filters and the chosen campaign are this visit's view, not shared data.
const blankFilters = () => ({
  q: "",
  language: "any",
  format: "any",
  day: "any",
  band: "any",
  newcomers: false,
  mature: false,
});
const ui = {
  filters: blankFilters(),
  // Keywords typed but not searched yet: kept when another filter re-renders the form.
  typedQ: null,
  campaign: null,
  focus: null,
  zone: null,
  dirLanguage: "any",
  // An editor form with typed changes not saved yet: {form, page, tab, id, role}.
  draft: null,
};
export function resetCommunityView() {
  ui.filters = blankFilters();
  ui.typedQ = null;
  ui.campaign = null;
  ui.focus = null;
  ui.dirLanguage = "any";
  ui.draft = null;
}
const EDITORS =
  'form[data-community-form="listing"],form[data-community-form="public-page"],form[data-community-form="directory"]';
function markDraft(ctx, form) {
  ui.draft = {
    form: form.dataset.communityForm,
    page: ctx.view.page,
    tab: ctx.view.tab || "",
    id: ctx.view.id || "",
    role: ctx.role,
  };
}
/** True when leaving for `next` would drop typed changes (null: closing the page). */
export function hasCommunityDraft(ctx, next) {
  const draft = ui.draft;
  if (!draft || draft.role !== ctx.role) return false;
  return !(
    next &&
    !next.role &&
    next.page === draft.page &&
    (next.tab || "") === draft.tab &&
    (next.id || "") === draft.id
  );
}
// Focus after an action: the shell closes the dialog after onSubmit and the browser
// returns focus to the replaced opener, so move it once the current task has finished.
function focusSoon(selector) {
  const document = globalThis.document;
  if (!document || typeof setTimeout !== "function") return;
  setTimeout(() => document.querySelector(`#content ${selector}`)?.focus?.(), 0);
}
/** Tests pin the viewer's time zone; the app uses the browser's. */
export function setViewerZone(zone) {
  ui.zone = zone;
}
export const viewState = () => ui;
const zone = () => ui.zone ?? D.viewerZone();

// ---------------------------------------------------------------- small helpers

const langTag = (ctx) => (ctx.lang === "en" ? "en-GB" : "it-IT");
const sliceOf = (ctx, api) => api.slice(ctx.state);
export function errorText(ctx, error) {
  return error?.it && error?.en ? ctx.t(error.it, error.en) : String(error?.message ?? error);
}
function when(ctx, startsAt, timeZone) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(langTag(ctx), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
function clock(ctx, startsAt, timeZone) {
  return new Intl.DateTimeFormat(langTag(ctx), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(startsAt));
}
function day(ctx, value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()))
    return ctx.t("data non registrata", "date not recorded");
  return new Intl.DateTimeFormat(langTag(ctx), { dateStyle: "medium" }).format(date);
}
const FREQUENCY = {
  weekly: L("Ogni settimana", "Every week"),
  biweekly: L("Ogni due settimane", "Every two weeks"),
  monthly: L("Una volta al mese", "Once a month"),
  once: L("Sessione unica", "Single session"),
};
const FORMAT = { campaign: L("Campagna", "Campaign"), "one-shot": L("One-shot", "One-shot") };
const LANGUAGE = { it: L("Italiano", "Italiano"), en: L("English", "English") };
const DAYS = [
  [1, L("lunedì", "Monday")],
  [2, L("martedì", "Tuesday")],
  [3, L("mercoledì", "Wednesday")],
  [4, L("giovedì", "Thursday")],
  [5, L("venerdì", "Friday")],
  [6, L("sabato", "Saturday")],
  [0, L("domenica", "Sunday")],
];
const BANDS = [
  ["morning", L("Mattina (6–12)", "Morning (6–12)")],
  ["afternoon", L("Pomeriggio (12–18)", "Afternoon (12–18)")],
  ["evening", L("Sera (18–24)", "Evening (18–24)")],
  ["night", L("Notte (0–6)", "Night (0–6)")],
];
const ENTRY_KIND = {
  recap: L("Resoconto", "Recap"),
  journal: L("Diario", "Journal"),
  world: L("Mondo", "World"),
  quest: L("Missione", "Quest"),
  archive: L("Archivio", "Archive"),
};
const APPLICATION_STATUS = {
  pending: L("In attesa del DM", "Waiting for the DM"),
  waitlisted: L("In lista d’attesa", "On the waitlist"),
  approved: L("Accettata", "Accepted"),
  declined: L("Non accettata", "Declined"),
  withdrawn: L("Ritirata", "Withdrawn"),
  closed: L("Chiusa", "Closed"),
};
const name = (ctx, api, id) => D.personLabel(ctx.state, sliceOf(ctx, api), id, ctx.lang);
const option = (value, label, selected) =>
  `<option value="${value}"${selected ? " selected" : ""}>${label}</option>`;
const checked = (on) => (on ? " checked" : "");
function statusBadge(ctx, api, application) {
  const position = D.waitlistPosition(sliceOf(ctx, api), application);
  const label = ctx.label(APPLICATION_STATUS[application.status] ?? L("—", "—"));
  const suffix = position ? ctx.t(` · ${position}°`, ` · #${position}`) : "";
  return `<span class="badge community-state is-${ctx.esc(application.status)}">${ctx.esc(label + suffix)}</span>`;
}
function seatsText(ctx, seats, listing) {
  if (seats.full)
    return listing.waitlist
      ? ctx.t(
          `Completo · ${seats.waiting} in lista d’attesa`,
          `Full · ${seats.waiting} on the waitlist`,
        )
      : ctx.t("Completo", "Full");
  const free = ctx.t(
    `${seats.free} ${seats.free === 1 ? "posto libero" : "posti liberi"} su ${seats.seats}`,
    `${seats.free} of ${seats.seats} ${seats.seats === 1 ? "seat" : "seats"} free`,
  );
  return seats.waiting
    ? `${free} · ${ctx.t(`${seats.waiting} in lista d’attesa`, `${seats.waiting} on the waitlist`)}`
    : free;
}
function toolNames(ctx, ids) {
  return ids
    .map((id) => D.toolById(id))
    .filter(Boolean)
    .map((tool) => ctx.label(tool.label));
}
function warningChips(ctx, ids) {
  const names = ids.map((id) => D.topicById(id)).filter(Boolean);
  return names.length
    ? `<ul class="community-chips">${names.map((topic) => `<li>${ctx.esc(ctx.label(topic.label))}</li>`).join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessun avviso di contenuto dichiarato.", "No content warning declared.")}</p>`;
}
function sessionLine(ctx, next) {
  if (!next) return ctx.t("Prossima sessione non programmata", "Next session not scheduled");
  const mine = zone();
  const local = `${when(ctx, next.startsAt, mine)} ${ctx.t("ora tua", "your time")}`;
  return next.timeZone && next.timeZone !== mine
    ? `${local} · ${clock(ctx, next.startsAt, next.timeZone)} ${ctx.t("a", "in")} ${next.timeZone}`
    : local;
}

// ---------------------------------------------------------------- actions

// Every change is shared (public data needs the network: the offline simulation refuses
// it) with an audit label kept private to the author, and never undone by gameplay Undo
// (slice declared undo: "preserve"): corrections are explicit commands (withdraw, leave
// the waitlist, disable, unblock, opt out).
function change(ctx, api, it, en, fn, options = {}) {
  let result;
  ctx.commit(
    ctx.t(it, en),
    (draft) => {
      result = fn(draft, api.slice(draft));
    },
    { undoable: false, visibility: "private", ...options },
  );
  return result;
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
const now = () => Date.now();

export function perform(ctx, api, action, data = {}) {
  const who = ctx.role;
  switch (action) {
    case "apply":
      return change(ctx, api, "Candidatura inviata", "Application sent", (draft, slice) =>
        D.applyToListing(draft, slice, data.listingId, data, who, now()),
      );
    case "edit-application":
      return change(ctx, api, "Candidatura modificata", "Application edited", (draft, slice) =>
        D.editApplication(draft, slice, data.applicationId, data, who, now()),
      );
    case "withdraw":
      return change(ctx, api, "Candidatura ritirata", "Application withdrawn", (draft, slice) =>
        D.withdrawApplication(draft, slice, data.applicationId, who, now()),
      );
    case "decide":
      return change(
        ctx,
        api,
        data.approve ? "Candidatura accettata" : "Candidatura non accettata",
        data.approve ? "Application accepted" : "Application declined",
        (draft, slice) => D.decideApplication(draft, slice, data.applicationId, data, who, now()),
      );
    case "create-listing":
      return change(
        ctx,
        api,
        "Annuncio creato come bozza",
        "Listing created as a draft",
        (draft, slice) => D.createListing(draft, slice, data.campaignId, who, now()),
        { visibility: "shared" },
      );
    case "save-listing":
      return change(
        ctx,
        api,
        "Annuncio aggiornato",
        "Listing updated",
        (draft, slice) => D.saveListing(draft, slice, data.listingId, data, who, now()),
        { visibility: "shared" },
      );
    case "publish":
      return change(
        ctx,
        api,
        "Annuncio pubblicato",
        "Listing published",
        (draft, slice) => {
          if (data.conduct) D.acceptConduct(draft, slice, who, now());
          return D.publishListing(draft, slice, data.listingId, data, who, now());
        },
        { visibility: "shared" },
      );
    case "disable":
      return change(
        ctx,
        api,
        "Annuncio disattivato",
        "Listing disabled",
        (draft, slice) => D.disableListing(draft, slice, data.listingId, who, now()),
        { visibility: "shared" },
      );
    case "block":
      return change(ctx, api, "Persona bloccata", "Person blocked", (draft, slice) =>
        D.blockPerson(draft, slice, who, data.personId, now()),
      );
    case "unblock":
      return change(ctx, api, "Persona sbloccata", "Person unblocked", (draft, slice) =>
        D.unblockPerson(draft, slice, who, data.personId, now()),
      );
    case "report":
      return change(ctx, api, "Segnalazione inviata", "Report sent", (draft, slice) =>
        D.reportContent(draft, slice, who, data, now()),
      );
    case "accept-conduct":
      return change(
        ctx,
        api,
        "Codice di condotta accettato",
        "Code of conduct accepted",
        (draft, slice) => D.acceptConduct(draft, slice, who, now()),
      );
    case "directory":
      return change(
        ctx,
        api,
        "Profilo di ricerca aggiornato",
        "Group search profile updated",
        (draft, slice) => D.setDirectoryEntry(draft, slice, who, data, now()),
      );
    case "leave-directory":
      return change(ctx, api, "Uscito dall’elenco", "Left the directory", (draft, slice) =>
        D.leaveDirectory(draft, slice, who, now()),
      );
    case "invite-apply":
      return change(
        ctx,
        api,
        "Invito a candidarsi inviato",
        "Invitation to apply sent",
        (draft, slice) => D.inviteToApply(draft, slice, data.listingId, data.personId, who, now()),
      );
    case "dismiss-invitation":
      return change(ctx, api, "Invito ignorato", "Invitation dismissed", (draft, slice) =>
        D.dismissInvitation(draft, slice, data.invitationId, who, now()),
      );
    case "public-page":
      return change(
        ctx,
        api,
        "Pagina pubblica aggiornata",
        "Public page updated",
        (draft, slice) => D.setPublicPage(draft, slice, data.campaignId, data, who, now()),
        { visibility: "shared" },
      );
    default:
      throw Error(`Unknown community action ${action}`);
  }
}

// ---------------------------------------------------------------- dialogs

function conductSummary(ctx) {
  return `<ul class="community-rules">${conductRules(ctx)
    .map((rule) => `<li>${ctx.esc(rule)}</li>`)
    .join("")}</ul>`;
}
function conductRules(ctx) {
  return [
    ctx.t(
      "Tratta tutti con rispetto: niente molestie, insulti o discriminazioni.",
      "Treat everyone with respect: no harassment, insults or discrimination.",
    ),
    ctx.t(
      "Annunci adatti a tutti (PG-13), salvo quelli segnalati come 18+.",
      "Listings suitable for everyone (PG-13), except those marked 18+.",
    ),
    ctx.t(
      "Nessun link a pagamenti o comunità esterne nel testo pubblico: condividili in privato dopo l’approvazione.",
      "No payment or off-site community links in public text: share them privately after approval.",
    ),
    ctx.t(
      "Nessun annuncio con la prossima sessione oltre 3 mesi.",
      "No listing with the next session more than 3 months ahead.",
    ),
    ctx.t(
      "Rendi pubblico solo ciò che scegli: schede, appunti e segreti restano privati.",
      "Make public only what you choose: sheets, notes and secrets stay private.",
    ),
  ];
}
function openApply(ctx, api, listingId) {
  const slice = sliceOf(ctx, api);
  const listing = slice.listings[listingId];
  if (!listing) return;
  const blocker = D.applyBlocker(ctx.state, slice, listing, ctx.role, now());
  if (blocker) {
    ctx.toast(ctx.label(blocker), true);
    return;
  }
  // SV-28: under the consent age a parent's consent opens public tables; 18+ listings stay
  // closed to anyone the account knows is a minor.
  const age = policyFor(ctx);
  if (!age.publicTables || (listing.mature && !age.adultListings)) {
    ctx.toast(ctx.label(age.reason), true);
    return;
  }
  const seats = D.seatInfo(ctx.state, slice, listing);
  const waiting = D.joinsWaitlist(ctx.state, slice, listing);
  const body = `<p class="muted">${
    waiting
      ? seats.full
        ? ctx.t(
            `Il tavolo è completo: entri in lista d’attesa al ${seats.waiting + 1}° posto. L’ordine d’arrivo non si cambia.`,
            `The table is full: you join the waitlist at position ${seats.waiting + 1}. Arrival order never changes.`,
          )
        : ctx.t(
            `C’è già chi aspetta: entri in lista d’attesa al ${seats.waiting + 1}° posto, dopo chi è arrivato prima. L’ordine d’arrivo non si cambia.`,
            `People are already waiting: you join the waitlist at position ${seats.waiting + 1}, after those who came first. Arrival order never changes.`,
          )
      : ctx.t(
          "Il DM legge il messaggio e risponde: accetta o non accetta.",
          "The DM reads the message and answers: accept or decline.",
        )
  }</p><label class="field">${ctx.t("Messaggio per il DM", "Message for the DM")}<textarea name="message" maxlength="${D.LIMITS.message}" required>${""}</textarea></label><p class="muted community-privacy">${ctx.t(
    "Il DM vede il tuo nome visualizzato e questo messaggio. Schede e appunti restano privati.",
    "The DM sees your display name and this message. Sheets and notes stay private.",
  )}</p><details class="community-details"><summary>${ctx.t("Codice di condotta", "Code of conduct")}</summary>${conductSummary(ctx)}</details><label class="check-field"><input type="checkbox" name="conduct" required${checked(D.conductAccepted(slice, ctx.role))}> ${ctx.t("Ho letto e accetto il codice di condotta", "I have read and accept the code of conduct")}</label>${
    listing.mature
      ? `<label class="check-field"><input type="checkbox" name="adult" required> ${ctx.t("Dichiaro di avere almeno 18 anni, come chiede l’annuncio", "I declare that I am at least 18, as the listing requires")}</label>`
      : ""
  }`;
  ctx.dialog(
    waiting
      ? ctx.t(`Lista d’attesa · ${listing.title}`, `Waitlist · ${listing.title}`)
      : ctx.t(`Candidati · ${listing.title}`, `Apply · ${listing.title}`),
    body,
    {
      submitLabel: waiting
        ? ctx.t("Mettimi in lista d’attesa", "Join the waitlist")
        : ctx.t("Invia candidatura", "Send application"),
      onSubmit(form) {
        const application = perform(ctx, api, "apply", {
          listingId,
          message: form.get("message"),
          conduct: form.get("conduct") === "on",
          adult: form.get("adult") === "on",
        });
        focusSoon("[data-community-application-state]");
        ctx.toast(
          application.status === "waitlisted"
            ? ctx.t(
                `Sei in lista d’attesa, ${D.waitlistPosition(sliceOf(ctx, api), application)}° posto.`,
                `You are on the waitlist, position ${D.waitlistPosition(sliceOf(ctx, api), application)}.`,
              )
            : ctx.t(
                "Candidatura inviata. Riceverai la risposta del DM tra le notifiche.",
                "Application sent. The DM’s answer arrives in your notifications.",
              ),
        );
      },
    },
  );
}
function openEdit(ctx, api, applicationId) {
  const application = sliceOf(ctx, api).applications.find((row) => row.id === applicationId);
  if (!application) return;
  ctx.dialog(
    ctx.t("Modifica la candidatura", "Edit the application"),
    `<label class="field">${ctx.t("Messaggio per il DM", "Message for the DM")}<textarea name="message" maxlength="${D.LIMITS.message}" required>${ctx.esc(application.message)}</textarea></label>`,
    {
      submitLabel: ctx.t("Salva messaggio", "Save message"),
      onSubmit(form) {
        perform(ctx, api, "edit-application", { applicationId, message: form.get("message") });
        focusSoon("[data-community-application-state]");
        ctx.toast(ctx.t("Messaggio aggiornato.", "Message updated."));
      },
    },
  );
}
function openWithdraw(ctx, api, applicationId) {
  const application = sliceOf(ctx, api).applications.find((row) => row.id === applicationId);
  if (!application) return;
  const waiting = application.status === "waitlisted";
  ctx.dialog(
    waiting
      ? ctx.t("Uscire dalla lista d’attesa?", "Leave the waitlist?")
      : ctx.t("Ritirare la candidatura?", "Withdraw the application?"),
    `<p>${
      waiting
        ? ctx.t(
            "Perdi il tuo posto in lista: se ti rimetti in coda, riparti dall’ultimo posto.",
            "You lose your place: if you join again, you start from the last place.",
          )
        : ctx.t(
            "Il DM non la vedrà più. Potrai candidarti di nuovo.",
            "The DM will no longer see it. You can apply again.",
          )
    }</p>`,
    {
      submitLabel: waiting
        ? ctx.t("Esci dalla lista", "Leave the waitlist")
        : ctx.t("Ritira", "Withdraw"),
      onSubmit() {
        perform(ctx, api, "withdraw", { applicationId });
        focusSoon("[data-community-application-state]");
        ctx.toast(
          waiting
            ? ctx.t("Sei uscito dalla lista d’attesa.", "You left the waitlist.")
            : ctx.t("Candidatura ritirata.", "Application withdrawn."),
        );
      },
    },
  );
}
function openDecision(ctx, api, applicationId, approve) {
  const slice = sliceOf(ctx, api);
  const application = slice.applications.find((row) => row.id === applicationId);
  if (!application) return;
  const person = name(ctx, api, application.who);
  const listing = slice.listings[application.listingId];
  const joinNote = D.isIdentity(application.who)
    ? ctx.t(
        `${person} riceve l’invito alla campagna ed entra scegliendo il personaggio.`,
        `${person} receives the campaign invitation and joins by choosing a character.`,
      )
    : ctx.t(
        `${person} diventa giocatore della campagna, senza personaggio assegnato (persona simulata).`,
        `${person} becomes a player of the campaign, with no assigned character (simulated person).`,
      );
  ctx.dialog(
    approve
      ? ctx.t(`Accetta ${person}`, `Accept ${person}`)
      : ctx.t(`Non accettare ${person}`, `Decline ${person}`),
    `<blockquote class="community-quote">${ctx.esc(application.message)}</blockquote>${
      approve ? `<p class="muted">${ctx.esc(joinNote)}</p>` : ""
    }<label class="field">${ctx.t("Risposta (facoltativa, arriva come notifica)", "Reply (optional, arrives as a notification)")}<textarea name="reply" maxlength="${D.LIMITS.reply}"></textarea></label><p class="muted">${ctx.esc(listing?.title ?? "")}</p>`,
    {
      submitLabel: approve ? ctx.t("Accetta", "Accept") : ctx.t("Non accettare", "Decline"),
      onSubmit(form) {
        perform(ctx, api, "decide", { applicationId, approve, reply: form.get("reply") });
        focusSoon("[data-community-queue]");
        ctx.toast(
          approve
            ? ctx.t(`${person} accettato. ${joinNote}`, `${person} accepted. ${joinNote}`)
            : ctx.t(`Risposta inviata a ${person}.`, `Answer sent to ${person}.`),
        );
      },
    },
  );
}
// DDB-157 "screenshot": an optional image chosen from this device, read and checked like
// a media upload (B28 readLocalFile: type, first bytes, size, dimensions) as soon as it is
// chosen; the dialog submits synchronously with what was read (B13 cover image pattern).
function watchScreenshot(ctx, holder) {
  const input = globalThis.document?.querySelector("#dialog [data-community-shot]");
  const status = globalThis.document?.querySelector("#dialog [data-community-shot-status]");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    holder.value = null;
    holder.error = "";
    if (status) status.textContent = "";
    if (!file) return;
    holder.loading = true;
    if (status) status.textContent = ctx.t("Lettura dell’immagine…", "Reading the image…");
    try {
      const read = await readLocalFile(file);
      if (read.kind !== "image")
        throw Object.assign(Error("pdf"), {
          it: `«${file.name}» non è un’immagine PNG, JPEG o WebP.`,
          en: `“${file.name}” is not a PNG, JPEG or WebP image.`,
        });
      holder.value = { src: read.dataUrl, name: read.fileName };
      if (status)
        status.textContent = ctx.t(`Immagine pronta: ${file.name}`, `Image ready: ${file.name}`);
    } catch (error) {
      holder.error = errorText(ctx, error);
      input.value = "";
      if (status) status.textContent = holder.error;
    } finally {
      holder.loading = false;
    }
  });
}
function screenshotFrom(ctx, holder) {
  if (holder.loading)
    throw Object.assign(Error("reading"), {
      it: "Attendi la lettura dell’immagine.",
      en: "Wait for the image to be read.",
    });
  if (holder.error)
    throw Object.assign(Error(holder.error), { it: holder.error, en: holder.error });
  return holder.value ?? null;
}
function openReport(ctx, api, data) {
  const reasons = D.REPORT_REASONS.map((reason) =>
    option(reason.id, ctx.esc(ctx.label(reason.label)), false),
  ).join("");
  const holder = { value: null, error: "", loading: false };
  ctx.dialog(
    ctx.t("Segnala", "Report"),
    `<p class="muted">${ctx.t(
      "Se riguarda il tuo tavolo, parlane prima con il DM. Chi modera non comunica l’esito della segnalazione.",
      "If it concerns your own table, talk to the DM first. Moderators do not disclose the outcome of a report.",
    )}</p><p><strong>${ctx.esc(data.label ?? "")}</strong></p><label class="field">${ctx.t("Motivo", "Reason")}<select name="reason" required><option value="">${ctx.t("Scegli…", "Choose…")}</option>${reasons}</select></label><label class="field">${ctx.t("Descrizione (obbligatoria per «Altro»)", "Description (required for “Other”)")}<textarea name="details" maxlength="${D.LIMITS.report}"></textarea></label><label class="field">${ctx.t("Screenshot (facoltativo · PNG, JPEG o WebP, massimo 500 KB)", "Screenshot (optional · PNG, JPEG or WebP, up to 500 KB)")}<input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp" data-community-shot></label><p class="muted" data-community-shot-status aria-live="polite"></p><p class="muted community-sim">${ctx.t(
      "Simulazione: la segnalazione e l’immagine restano in questo browser, visibili solo a te. Nessun invio reale.",
      "Simulation: the report and its image stay in this browser, visible only to you. Nothing is really sent.",
    )}</p>`,
    {
      submitLabel: ctx.t("Invia segnalazione", "Send report"),
      onSubmit(form) {
        perform(ctx, api, "report", {
          kind: data.kind,
          targetId: data.targetId,
          personId: data.personId,
          reason: form.get("reason"),
          details: form.get("details"),
          screenshot: screenshotFrom(ctx, holder),
        });
        ctx.toast(
          ctx.t(
            "Segnalazione ricevuta. La trovi in Condotta e segnalazioni.",
            "Report received. You find it under Conduct and reports.",
          ),
        );
      },
    },
  );
  watchScreenshot(ctx, holder);
}
function openBlock(ctx, api, personId) {
  const person = name(ctx, api, personId);
  ctx.dialog(
    ctx.t(`Bloccare ${person}?`, `Block ${person}?`),
    `<p>${ctx.t(
      `Tu e ${person} non potrete più contattarvi in privato: ${person} non potrà candidarsi ai tuoi tavoli né ricevere tuoi inviti a candidarsi, e tu non potrai candidarti ai suoi. Nessuno viene informato del blocco.`,
      `You and ${person} can no longer contact each other privately: ${person} cannot apply to your tables or receive your invitations to apply, and you cannot apply to theirs. Nobody is told about the block.`,
    )}</p><p class="muted">${ctx.t(
      "Gli annunci e l’elenco dei giocatori restano visibili; le candidature già arrivate restano da decidere.",
      "Listings and the player directory stay visible; applications already received stay for you to decide.",
    )}</p><p class="muted">${ctx.t("Puoi sbloccare in qualsiasi momento da qui o da Condotta e segnalazioni.", "You can unblock at any time from here or from Conduct and reports.")}</p>`,
    {
      submitLabel: ctx.t("Blocca", "Block"),
      onSubmit() {
        perform(ctx, api, "block", { personId });
        ctx.toast(ctx.t(`${person} bloccato.`, `${person} blocked.`));
      },
    },
  );
}
function openPublish(ctx, api, listingId) {
  const listing = sliceOf(ctx, api).listings[listingId];
  if (!listing) return;
  if (listing.conductRevision === D.CONDUCT_REVISION) {
    if (attempt(ctx, () => perform(ctx, api, "publish", { listingId }))) {
      focusSoon("[data-community-status]");
      ctx.toast(ctx.t("Annuncio pubblicato.", "Listing published."));
    }
    return;
  }
  ctx.dialog(
    ctx.t("Pubblica l’annuncio", "Publish the listing"),
    `<p>${ctx.t("Chi pubblica un annuncio accetta il codice di condotta:", "Whoever publishes a listing accepts the code of conduct:")}</p>${conductSummary(ctx)}<label class="check-field"><input type="checkbox" name="conduct" required> ${ctx.t("Accetto il codice di condotta", "I accept the code of conduct")}</label>`,
    {
      submitLabel: ctx.t("Pubblica", "Publish"),
      onSubmit(form) {
        perform(ctx, api, "publish", { listingId, conduct: form.get("conduct") === "on" });
        focusSoon("[data-community-status]");
        ctx.toast(ctx.t("Annuncio pubblicato.", "Listing published."));
      },
    },
  );
}

// ---------------------------------------------------------------- page: find (R20-004)

function renderFilters(ctx) {
  const f = ui.filters;
  const days = DAYS.map(([value, label]) =>
    option(value, ctx.esc(ctx.label(label)), String(f.day) === String(value)),
  ).join("");
  const bands = BANDS.map(([value, label]) =>
    option(value, ctx.esc(ctx.label(label)), f.band === value),
  ).join("");
  return `<form class="community-filters panel" data-community-form="filters" role="search" aria-label="${ctx.t("Filtri di ricerca", "Search filters")}"><h2 class="community-filters-title">${ctx.t("Cerca un tavolo", "Find a table")}</h2><label class="field">${ctx.t("Parole chiave", "Keywords")}<input type="search" name="q" value="${ctx.esc(ui.typedQ ?? f.q)}" placeholder="${ctx.t("titolo, DM, tema…", "title, DM, theme…")}"></label><div class="community-filter-grid"><label class="field">${ctx.t("Lingua", "Language")}<select name="language">${option("any", ctx.t("Tutte", "All"), f.language === "any")}${option("it", "Italiano", f.language === "it")}${option("en", "English", f.language === "en")}</select></label><label class="field">${ctx.t("Formato", "Format")}<select name="format">${option("any", ctx.t("Tutti", "All"), f.format === "any")}${option("campaign", ctx.t("Campagna", "Campaign"), f.format === "campaign")}${option("one-shot", "One-shot", f.format === "one-shot")}</select></label><label class="field">${ctx.t("Giorno (ora tua)", "Day (your time)")}<select name="day">${option("any", ctx.t("Qualsiasi", "Any"), f.day === "any")}${days}</select></label><label class="field">${ctx.t("Inizio (ora tua)", "Start (your time)")}<select name="band">${option("any", ctx.t("Qualsiasi", "Any"), f.band === "any")}${bands}</select></label></div><label class="check-field"><input type="checkbox" name="newcomers"${checked(f.newcomers)}> ${ctx.t("Accoglie nuovi giocatori", "Welcomes new players")}</label>${(() => {
    const age = policyFor(ctx);
    return age.adultListings
      ? `<label class="check-field"><input type="checkbox" name="mature"${checked(f.mature)}> ${ctx.t("Mostra annunci per adulti (18+)", "Show adult listings (18+)")}</label>`
      : `<label class="check-field"><input type="checkbox" name="mature" disabled aria-describedby="community-age-why"> ${ctx.t("Mostra annunci per adulti (18+)", "Show adult listings (18+)")}</label><p class="muted" id="community-age-why">${ctx.esc(ctx.label(age.reason))}</p>`;
  })()}<p class="muted community-zone">${ctx.t(`Orari nel tuo fuso: ${ctx.esc(zone())}. Sistema: D&D 2024 (SRD 5.2.1).`, `Times in your time zone: ${ctx.esc(zone())}. System: D&D 2024 (SRD 5.2.1).`)}</p><div class="toolbar"><button class="button primary" type="submit">${ctx.t("Cerca", "Search")}</button><button class="button quiet" type="button" data-community-act="clear-filters">${ctx.t("Azzera filtri", "Clear filters")}</button></div></form>`;
}
function readFilters(form) {
  const data = new FormData(form);
  return {
    q: String(data.get("q") ?? ""),
    language: String(data.get("language") ?? "any"),
    format: String(data.get("format") ?? "any"),
    day: String(data.get("day") ?? "any"),
    band: String(data.get("band") ?? "any"),
    newcomers: data.get("newcomers") === "on",
    mature: data.get("mature") === "on",
  };
}
function myBadge(ctx, api, listing) {
  const slice = sliceOf(ctx, api);
  if (listing.kind === "campaign" && D.memberOf(ctx.state, listing.campaignId, ctx.role))
    return `<span class="badge community-state is-member">${ctx.t("Fai parte di questo tavolo", "You are at this table")}</span>`;
  const mine = D.myApplication(slice, listing.id, ctx.role);
  const invited = D.approvalStage(ctx.state, slice, mine) === "invited";
  return mine && (D.isOpen(mine) || invited) ? statusBadge(ctx, api, mine) : "";
}
function listingCard(ctx, api, row) {
  const { listing, next, seats } = row;
  const blocked = row.blocked
    ? `<span class="badge">${ctx.t("Hai bloccato chi l’ha pubblicato", "You blocked who published it")}</span>`
    : "";
  const owner = name(ctx, api, listing.ownerId);
  const pitch =
    listing.pitch.length > 190 ? listing.pitch.slice(0, 187).trimEnd() + "…" : listing.pitch;
  const badges = [
    `<span class="badge">D&amp;D 2024</span>`,
    `<span class="badge">${ctx.esc(ctx.label(LANGUAGE[listing.language]))}</span>`,
    `<span class="badge">${ctx.esc(ctx.label(FORMAT[listing.format]))}</span>`,
    listing.newcomers
      ? `<span class="badge is-positive">${ctx.t("Accoglie nuovi giocatori", "Welcomes new players")}</span>`
      : "",
    listing.mature ? `<span class="badge is-adult">18+</span>` : "",
  ].join(" ");
  return `<li class="community-card" data-community-listing="${ctx.esc(listing.id)}"><div class="community-card-main"><h3><button class="community-card-title" data-community-open="${ctx.esc(listing.id)}">${ctx.esc(listing.title)}</button></h3><p class="community-meta">${ctx.t("DM", "DM")} · ${ctx.esc(owner)} · ${ctx.esc(ctx.label(FREQUENCY[listing.frequency] ?? FREQUENCY.weekly))}</p><p class="community-when">${ctx.esc(sessionLine(ctx, next))}</p><p class="community-pitch">${ctx.esc(pitch)}</p><p class="community-badges">${badges}</p></div><div class="community-card-side"><p class="community-seats${seats.full ? " is-full" : ""}">${ctx.esc(seatsText(ctx, seats, listing))}</p>${myBadge(ctx, api, listing)}${blocked}<button class="button" data-community-open="${ctx.esc(listing.id)}" aria-label="${ctx.esc(ctx.t(`Apri l’annuncio ${listing.title}`, `Open the listing ${listing.title}`))}">${ctx.t("Apri annuncio", "Open listing")}</button></div></li>`;
}
function renderFind(ctx, api) {
  const slice = sliceOf(ctx, api);
  const result = D.searchListings(
    ctx.state,
    slice,
    ctx.role,
    { ...ui.filters, mature: ui.filters.mature && policyFor(ctx).adultListings },
    now(),
    zone(),
  );
  const notes = [
    result.hiddenMature
      ? `<p class="muted">${ctx.t(
          `${result.hiddenMature} ${result.hiddenMature === 1 ? "annuncio per adulti nascosto" : "annunci per adulti nascosti"}: spunta «Mostra annunci per adulti (18+)» per vederli.`,
          `${result.hiddenMature} adult ${result.hiddenMature === 1 ? "listing" : "listings"} hidden: tick “Show adult listings (18+)” to see them.`,
        )}</p>`
      : "",
  ].join("");
  const list = result.rows.length
    ? `<ul class="community-list">${result.rows.map((row) => listingCard(ctx, api, row)).join("")}</ul>`
    : `<div class="empty-state"><h3>${ctx.t("Nessun tavolo con questi filtri", "No table matches these filters")}</h3><p>${ctx.t("Prova un altro giorno o un’altra lingua, oppure azzera i filtri.", "Try another day or language, or clear the filters.")}</p><button class="button" data-community-act="clear-filters">${ctx.t("Azzera filtri", "Clear filters")}</button></div>`;
  return `<div class="community-find">${renderFilters(ctx)}<section class="community-results" aria-labelledby="community-results-title"><div class="section-heading"><h2 id="community-results-title" tabindex="-1">${ctx.t(
    `${result.rows.length} ${result.rows.length === 1 ? "tavolo cerca giocatori" : "tavoli cercano giocatori"}`,
    `${result.rows.length} ${result.rows.length === 1 ? "table is looking for players" : "tables are looking for players"}`,
  )}</h2></div><div aria-live="polite">${notes}</div>${list}</section></div>`;
}

// ---------------------------------------------------------------- page: listing detail

// What happened after an acceptance that is no longer current (B13 invitation states).
const AFTER_APPROVAL = {
  "invite-declined": L(
    "Hai rifiutato l’invito alla campagna.",
    "You declined the campaign invitation.",
  ),
  "invite-cancelled": L(
    "Il DM ha annullato l’invito alla campagna.",
    "The DM cancelled the campaign invitation.",
  ),
  "invite-accepted": L(
    "Eri entrato nella campagna e ora non ne fai più parte.",
    "You joined the campaign and are no longer part of it.",
  ),
};
// The visitor's line and Apply label (Warhorn SVC-009: "Join waitlist" when full or queued).
function applyIntro(ctx, seats, queued) {
  if (seats.full)
    return ctx.t(
      `Il tavolo è completo: puoi entrare in lista d’attesa (${seats.waiting} già in coda).`,
      `The table is full: you can join the waitlist (${seats.waiting} already in line).`,
    );
  if (queued)
    return ctx.t(
      `C’è già chi aspetta un posto: puoi entrare in lista d’attesa (${seats.waiting} già in coda).`,
      `People are already waiting for a seat: you can join the waitlist (${seats.waiting} already in line).`,
    );
  return ctx.t(
    "Il DM valuta ogni candidatura prima dell’ingresso.",
    "The DM reviews every application before anyone joins.",
  );
}
function applyLabel(ctx, queued, again) {
  if (queued) return ctx.t("Mettiti in lista d’attesa", "Join the waitlist");
  return again ? ctx.t("Candidati di nuovo", "Apply again") : ctx.t("Candidati", "Apply");
}
function applicationBox(ctx, api, listing, { preview = false } = {}) {
  const slice = sliceOf(ctx, api);
  const seats = D.seatInfo(ctx.state, slice, listing);
  const queued = D.joinsWaitlist(ctx.state, slice, listing);
  // Kanka "View as" (SVC-040): the box a visitor sees, its buttons inactive here.
  if (preview)
    return `<p class="muted" data-community-application-state tabindex="-1">${applyIntro(ctx, seats, queued)}</p><button class="button primary" type="button" disabled aria-describedby="community-preview-why">${applyLabel(ctx, queued, false)}</button><p class="muted" id="community-preview-why">${ctx.t("Anteprima di come la vede un visitatore: qui i pulsanti non agiscono. Torna al tuo annuncio per modificarlo.", "A preview of what a visitor sees: buttons do nothing here. Go back to your listing to edit it.")}</p>`;
  const mine = D.myApplication(slice, listing.id, ctx.role);
  const invitation = D.invitationsFor(slice, ctx.role).find((row) => row.listingId === listing.id);
  const parts = [];
  if (invitation)
    parts.push(
      `<div class="community-callout"><p><strong>${ctx.esc(ctx.t(`${name(ctx, api, invitation.by)} ti invita a candidarti`, `${name(ctx, api, invitation.by)} invites you to apply`))}</strong></p><button class="button quiet" data-community-act="dismiss-invitation" data-invitation="${ctx.esc(invitation.id)}">${ctx.t("Non mi interessa", "Not interested")}</button></div>`,
    );
  if (D.canManageListing(ctx.state, listing, ctx.role)) {
    parts.push(
      `<p data-community-application-state tabindex="-1">${ctx.t("È il tuo annuncio.", "This is your listing.")}</p><button class="button primary" data-community-manage="${ctx.esc(listing.campaignId)}">${ctx.t("Gestisci annuncio", "Manage listing")}</button>`,
    );
    return parts.join("");
  }
  if (mine && D.isOpen(mine)) {
    const waiting = mine.status === "waitlisted";
    parts.push(
      `<div class="community-mine" data-community-application-state tabindex="-1"><p>${statusBadge(ctx, api, mine)}</p><p class="muted">${ctx.t(`Inviata il ${day(ctx, mine.createdAt)}`, `Sent on ${day(ctx, mine.createdAt)}`)}</p><blockquote class="community-quote">${ctx.esc(mine.message)}</blockquote>${
        waiting
          ? `<p class="muted">${ctx.t("La lista segue l’ordine d’arrivo: quando si libera un posto il DM decide sulla prima persona in coda.", "The list keeps arrival order: when a seat frees, the DM decides on the first person in line.")}</p>`
          : ""
      }<div class="toolbar"><button class="button" data-community-act="edit-application" data-application="${ctx.esc(mine.id)}">${ctx.t("Modifica messaggio", "Edit message")}</button><button class="button danger" data-community-act="withdraw" data-application="${ctx.esc(mine.id)}">${waiting ? ctx.t("Esci dalla lista d’attesa", "Leave the waitlist") : ctx.t("Ritira candidatura", "Withdraw application")}</button></div></div>`,
    );
    return parts.join("");
  }
  const stage = D.approvalStage(ctx.state, slice, mine);
  if (stage === "invited" || stage === "joined") {
    parts.push(
      `<div class="community-mine" data-community-application-state tabindex="-1"><p>${statusBadge(ctx, api, mine)}</p>${mine.reply ? `<blockquote class="community-quote">${ctx.esc(mine.reply)}</blockquote>` : ""}${
        stage === "invited"
          ? `<p>${ctx.t("Il DM ti ha mandato l’invito alla campagna: entra scegliendo il personaggio.", "The DM sent you the campaign invitation: join by choosing a character.")}</p><button class="button primary" data-community-invite="${ctx.esc(mine.inviteCode ?? "")}">${ctx.t("Apri l’invito", "Open the invitation")}</button>`
          : `<p>${ctx.t("Sei entrato nella campagna.", "You joined the campaign.")}</p>`
      }</div>`,
    );
    return parts.join("");
  }
  // An older acceptance, a refusal or a withdrawal: its real outcome, then Apply again.
  const blocker = D.applyBlocker(ctx.state, slice, listing, ctx.role, now());
  if (mine && !D.isOpen(mine)) {
    const after = AFTER_APPROVAL[stage];
    parts.push(
      `<div class="community-mine"><p>${ctx.t("La tua ultima candidatura", "Your last application")}: ${statusBadge(ctx, api, mine)}</p>${mine.reply ? `<blockquote class="community-quote">${ctx.esc(mine.reply)}</blockquote>` : ""}${after ? `<p>${ctx.esc(ctx.label(after))}</p>` : ""}</div>`,
    );
  }
  if (blocker) {
    parts.push(
      `<p data-community-application-state tabindex="-1">${ctx.esc(ctx.label(blocker))}</p>`,
    );
    if (listing.kind === "campaign" && D.memberOf(ctx.state, listing.campaignId, ctx.role))
      parts.push(
        `<button class="button" data-nav="campaign">${ctx.t("Apri la campagna", "Open the campaign")}</button>`,
      );
    return parts.join("");
  }
  parts.push(
    `<p class="muted" data-community-application-state tabindex="-1">${applyIntro(ctx, seats, queued)}</p><button class="button primary" data-community-act="apply" data-listing="${ctx.esc(listing.id)}">${applyLabel(ctx, queued, Boolean(mine))}</button>`,
  );
  return parts.join("");
}
// Report and Block / Unblock of a person, in the same place (Roll20 SVC-148, SVC-149).
function personActions(ctx, api, personId, report) {
  const person = name(ctx, api, personId);
  const blocked = D.hasBlocked(sliceOf(ctx, api), ctx.role, personId);
  return `<button class="button quiet" data-community-act="report" data-kind="${ctx.esc(report.kind)}" data-target="${ctx.esc(report.targetId)}" data-person="${ctx.esc(personId)}" data-label="${ctx.esc(report.label)}">${ctx.icon("flag")} ${ctx.esc(report.text)}</button>${
    blocked
      ? `<button class="button quiet" data-community-act="unblock" data-person="${ctx.esc(personId)}">${ctx.esc(ctx.t(`Sblocca ${person}`, `Unblock ${person}`))}</button>`
      : `<button class="button quiet" data-community-act="block" data-person="${ctx.esc(personId)}">${ctx.esc(ctx.t(`Blocca ${person}`, `Block ${person}`))}</button>`
  }`;
}
function moderationBox(ctx, api, listing, { preview = false } = {}) {
  const owner = listing.ownerId;
  const ownerName = name(ctx, api, owner);
  if (preview)
    return `<div class="community-moderation"><button class="button quiet" type="button" disabled aria-describedby="community-preview-moderation-why">${ctx.icon("flag")} ${ctx.t("Segnala annuncio", "Report listing")}</button><button class="button quiet" type="button" disabled aria-describedby="community-preview-moderation-why">${ctx.esc(ctx.t(`Blocca ${ownerName}`, `Block ${ownerName}`))}</button><p class="muted" id="community-preview-moderation-why">${ctx.t("Nell’anteprima segnalare e bloccare non agiscono: un visitatore li usa dal tuo annuncio pubblicato.", "In the preview reporting and blocking do nothing: a visitor uses them from your published listing.")}</p></div>`;
  if (D.canManageListing(ctx.state, listing, ctx.role)) return "";
  return `<div class="community-moderation">${personActions(ctx, api, owner, {
    kind: "listing",
    targetId: listing.id,
    label: listing.title,
    text: ctx.t("Segnala annuncio", "Report listing"),
  })}</div>`;
}
function renderListing(ctx, api, listingId, { preview = false } = {}) {
  const slice = sliceOf(ctx, api);
  const listing = slice.listings[listingId];
  const manager = D.canManageListing(ctx.state, listing, ctx.role);
  // Kanka "View as" (SVC-040) with its way back; only a manager previews.
  const asVisitor = preview && manager;
  const back = asVisitor
    ? `<div class="community-preview" role="note"><p>${ctx.t("Anteprima come visitatore: vedi l’annuncio come chi non fa parte della campagna; i pulsanti qui non sono attivi.", "Preview as a visitor: you see the listing as someone outside the campaign; the buttons are inactive here.")}</p><button class="button" data-community-manage="${ctx.esc(listing.campaignId)}">${ctx.t("Torna alla gestione", "Back to managing")}</button></div>`
    : `<button class="button quiet community-back" data-community-tab="find">${ctx.icon("arrow")} ${ctx.t("Torna ai risultati", "Back to results")}</button>`;
  if (!listing)
    return `${back}<div class="empty-state"><h2>${ctx.t("Annuncio non trovato", "Listing not found")}</h2></div>`;
  const state = D.listingState(ctx.state, slice, listing, now());
  if (state !== "live" && !manager && !D.myApplication(slice, listing.id, ctx.role))
    return `${back}<div class="empty-state"><h2>${ctx.t("Annuncio non disponibile", "Listing not available")}</h2><p>${ctx.t("Chi l’ha pubblicato l’ha disattivato o non cerca più giocatori.", "Its author turned it off or is no longer looking for players.")}</p></div>`;
  const next = D.listingNextSession(ctx.state, listing, now());
  const seats = D.seatInfo(ctx.state, slice, listing);
  const tools = toolNames(ctx, listing.tools ?? []);
  const page =
    listing.kind === "campaign" ? D.publicPageView(ctx.state, slice, listing.campaignId) : null;
  const facts = [
    [ctx.t("Prossima sessione", "Next session"), sessionLine(ctx, next)],
    [ctx.t("Frequenza", "How often"), ctx.label(FREQUENCY[listing.frequency] ?? FREQUENCY.weekly)],
    [ctx.t("Formato", "Format"), ctx.label(FORMAT[listing.format])],
    [ctx.t("Lingua", "Language"), ctx.label(LANGUAGE[listing.language])],
    [ctx.t("Regole", "Rules"), "D&D 2024 · SRD 5.2.1"],
    [
      ctx.t("Esperienza", "Experience"),
      listing.newcomers
        ? ctx.t("Accoglie nuovi giocatori", "Welcomes new players")
        : ctx.t("Meglio con un po’ d’esperienza", "Some experience preferred"),
    ],
    [
      ctx.t("Età", "Age"),
      listing.mature
        ? ctx.t("Solo adulti (18+), dichiarato dal DM", "Adults only (18+), declared by the DM")
        : ctx.t("Nessun limite dichiarato dal DM", "No limit declared by the DM"),
    ],
  ];
  return `${back}<article class="community-detail"><div class="community-detail-main"><p class="community-kicker">${ctx.t("Annuncio pubblico", "Public listing")}${state !== "live" ? ` · <span class="badge">${ctx.t("non visibile nella ricerca", "not shown in search")}</span>` : ""}</p><h2 id="community-detail-title" tabindex="-1">${ctx.esc(listing.title)}</h2><p class="community-meta">${ctx.t("DM", "DM")} · ${ctx.esc(name(ctx, api, listing.ownerId))}${listing.mature ? ` · <span class="badge is-adult">18+</span>` : ""}</p><p class="community-pitch-full">${ctx.esc(listing.pitch)}</p><dl class="community-facts">${facts
    .map(([term, value]) => `<div><dt>${ctx.esc(term)}</dt><dd>${ctx.esc(value)}</dd></div>`)
    .join(
      "",
    )}</dl><h3>${ctx.t("Sicurezza del tavolo", "Table safety")}</h3><p>${ctx.t("Strumenti in uso", "Tools in use")}: ${ctx.esc(tools.length ? tools.join(" · ") : ctx.t("nessuno dichiarato", "none declared"))}</p><p class="muted">${ctx.t("Avvisi di contenuto", "Content warnings")}</p>${warningChips(ctx, listing.warnings ?? [])}${
    page?.enabled
      ? `<p><button class="button" data-community-public="${ctx.esc(listing.campaignId)}">${ctx.t("Leggi la pagina pubblica della campagna", "Read the campaign’s public page")}</button></p>`
      : ""
  }</div><aside class="community-detail-side panel" aria-label="${ctx.t("Posti e candidatura", "Seats and application")}"><p class="community-seats${seats.full ? " is-full" : ""}">${ctx.esc(seatsText(ctx, seats, listing))}</p>${applicationBox(ctx, api, listing, { preview: asVisitor })}${moderationBox(ctx, api, listing, { preview: asVisitor })}</aside></article>`;
}

// ---------------------------------------------------------------- page: my applications

function applicationRow(ctx, api, application) {
  const slice = sliceOf(ctx, api);
  const listing = slice.listings[application.listingId];
  const title = listing?.title ?? ctx.t("Annuncio rimosso", "Listing removed");
  const actions = [];
  if (listing)
    actions.push(
      `<button class="button" data-community-open="${ctx.esc(listing.id)}">${ctx.t("Apri annuncio", "Open listing")}</button>`,
    );
  if (D.isOpen(application)) {
    actions.push(
      `<button class="button" data-community-act="edit-application" data-application="${ctx.esc(application.id)}">${ctx.t("Modifica", "Edit")}</button>`,
    );
    actions.push(
      `<button class="button danger" data-community-act="withdraw" data-application="${ctx.esc(application.id)}">${application.status === "waitlisted" ? ctx.t("Esci dalla lista", "Leave the list") : ctx.t("Ritira", "Withdraw")}</button>`,
    );
  }
  const stage = D.approvalStage(ctx.state, slice, application);
  if (stage === "invited")
    actions.push(
      `<button class="button primary" data-community-invite="${ctx.esc(application.inviteCode ?? "")}">${ctx.t("Apri l’invito", "Open the invitation")}</button>`,
    );
  return `<li class="community-row" data-community-application="${ctx.esc(application.id)}"><div><p><strong>${ctx.esc(title)}</strong> ${statusBadge(ctx, api, application)}</p><p class="muted">${ctx.t(`Inviata il ${day(ctx, application.createdAt)}`, `Sent on ${day(ctx, application.createdAt)}`)}${application.decidedAt && !D.isOpen(application) ? ` · ${ctx.t(`aggiornata il ${day(ctx, application.decidedAt)}`, `updated on ${day(ctx, application.decidedAt)}`)}` : ""}</p><blockquote class="community-quote">${ctx.esc(application.message)}</blockquote>${
    application.reply
      ? `<p class="community-reply"><span class="muted">${ctx.esc(ctx.t(`Risposta di ${name(ctx, api, application.decidedBy)}`, `Reply from ${name(ctx, api, application.decidedBy)}`))}:</span> ${ctx.esc(application.reply)}</p>`
      : ""
  }${stage === "joined" ? `<p class="muted">${ctx.t("Sei entrato nella campagna.", "You joined the campaign.")}</p>` : ""}</div><div class="toolbar">${actions.join("")}</div></li>`;
}
function directoryForm(ctx, entry) {
  const e = entry ?? { format: "any", language: ctx.lang, availability: "", intro: "" };
  return `<form class="community-form" data-community-form="directory"><div class="form-grid"><label class="field">${ctx.t("Cerco", "Looking for")}<select name="format">${option("any", ctx.t("Campagna o one-shot", "Campaign or one-shot"), e.format === "any")}${option("campaign", ctx.t("Campagna", "Campaign"), e.format === "campaign")}${option("one-shot", "One-shot", e.format === "one-shot")}</select></label><label class="field">${ctx.t("Lingua", "Language")}<select name="language">${option("it", "Italiano", e.language === "it")}${option("en", "English", e.language === "en")}</select></label></div><label class="field">${ctx.t("Quando puoi giocare", "When you can play")}<input name="availability" maxlength="${D.LIMITS.availability}" value="${ctx.esc(e.availability)}" required></label><label class="field">${ctx.t("Presentazione (facoltativa)", "Introduction (optional)")}<textarea name="intro" maxlength="${D.LIMITS.intro}">${ctx.esc(e.intro)}</textarea></label><div class="toolbar"><button class="button primary" type="submit">${entry?.active ? ctx.t("Aggiorna profilo", "Update profile") : ctx.t("Mettimi nell’elenco", "List me")}</button>${
    entry?.active
      ? `<button class="button danger" type="button" data-community-act="leave-directory">${ctx.t("Ritirami dall’elenco", "Remove me from the list")}</button>`
      : ""
  }</div></form>`;
}
function renderMine(ctx, api) {
  const slice = sliceOf(ctx, api);
  const rows = D.applicationsFor(slice, ctx.role);
  const invitations = D.invitationsFor(slice, ctx.role);
  const entry = slice.directory?.[ctx.role];
  const invites = invitations.length
    ? `<section class="community-block"><h2>${ctx.t("Inviti a candidarti", "Invitations to apply")}</h2><ul class="community-rows">${invitations
        .map((row) => {
          const listing = slice.listings[row.listingId];
          return `<li class="community-row"><div><p><strong>${ctx.esc(listing?.title ?? "")}</strong></p><p class="muted">${ctx.esc(ctx.t(`Da ${name(ctx, api, row.by)} · ${day(ctx, row.at)}`, `From ${name(ctx, api, row.by)} · ${day(ctx, row.at)}`))}</p></div><div class="toolbar"><button class="button primary" data-community-open="${ctx.esc(row.listingId)}">${ctx.t("Apri annuncio", "Open listing")}</button><button class="button quiet" data-community-act="dismiss-invitation" data-invitation="${ctx.esc(row.id)}">${ctx.t("Non mi interessa", "Not interested")}</button></div></li>`;
        })
        .join("")}</ul></section>`
    : "";
  return `${invites}<section class="community-block" aria-labelledby="community-mine-title"><h2 id="community-mine-title" tabindex="-1">${ctx.t("Le mie candidature", "My applications")}</h2>${
    rows.length
      ? `<ul class="community-rows" data-community-application-state tabindex="-1">${rows.map((row) => applicationRow(ctx, api, row)).join("")}</ul>`
      : `<p class="muted" data-community-application-state tabindex="-1">${ctx.t("Nessuna candidatura. Cerca un tavolo e candidati con un messaggio al DM.", "No applications yet. Find a table and apply with a message to the DM.")}</p><button class="button" data-community-tab="find">${ctx.t("Trova un tavolo", "Find a table")}</button>`
  }</section><section class="community-block" aria-labelledby="community-directory-title"><h2 id="community-directory-title" tabindex="-1">${ctx.t("Cerco un gruppo", "Looking for a group")}</h2><p class="muted">${ctx.t(
    "Facoltativo: compari nell’elenco che i DM consultano e ricevi inviti a candidarti. Non è un profilo pubblico obbligatorio e puoi ritirarti quando vuoi.",
    "Optional: you appear in the list DMs browse and get invitations to apply. It is not a required public profile and you can leave at any time.",
  )}</p>${entry?.active ? `<p><span class="badge is-positive">${ctx.t("Sei nell’elenco", "You are listed")}</span> <span class="muted">${ctx.t(`dal ${day(ctx, entry.updatedAt)}`, `since ${day(ctx, entry.updatedAt)}`)}</span></p>` : ""}${directoryForm(ctx, entry?.active ? entry : null)}</section>`;
}

// ---------------------------------------------------------------- management (SVC-067)

const LISTING_STATE = {
  draft: L("Bozza · non pubblicato", "Draft · not published"),
  live: L("Pubblicato · visibile nella ricerca", "Published · shown in search"),
  hidden: L(
    "Pubblicato · non visibile: manca un requisito",
    "Published · not shown: a prerequisite is missing",
  ),
  disabled: L("Disattivato", "Disabled"),
  full: L("Disattivato da solo: tavolo completo", "Turned off by itself: table full"),
  // Turned off when full, then a seat freed (Espelli or leave in B13, more seats): Roll20
  // documents no automatic re-enable, so the DM enables it again.
  freed: L(
    "Disattivato da solo quando era completo · si è liberato un posto: riattivalo",
    "Turned off by itself when full · a seat is free again: enable it",
  ),
};
function subNav(ctx, current, base, campaignId) {
  const labels = {
    status: L("Stato e candidature", "Status and applications"),
    listing: L("Annuncio", "Listing"),
    public: L("Pagina pubblica", "Public page"),
    players: L("Giocatori in cerca", "Players looking"),
  };
  return `<nav class="tabs community-subtabs" aria-label="${ctx.t("Sezioni del reclutamento", "Recruiting sections")}">${SUBTABS.map(
    (id) =>
      `<button class="${id === current ? "active" : ""}" data-community-sub="${id}" data-community-base="${base}" data-community-campaign-id="${ctx.esc(campaignId)}"${id === current ? ' aria-current="page"' : ""}>${ctx.esc(ctx.label(labels[id]))}</button>`,
  ).join("")}</nav>`;
}
function problemList(ctx, problems) {
  const all = [
    [
      "campaign",
      L(
        "Campagna attiva (non archiviata né eliminata)",
        "Campaign active (not archived or deleted)",
      ),
    ],
    ["text", L("Titolo e presentazione pubblica", "Title and public presentation")],
    ["session", L("Prossima sessione in programma", "Next session scheduled")],
    ["horizon", L("Prossima sessione entro 3 mesi", "Next session within 3 months")],
    [
      "tools",
      L("Almeno uno strumento di sicurezza dichiarato", "At least one safety tool declared"),
    ],
    [
      "links",
      L(
        "Nessun link esterno o di pagamento nel testo pubblico",
        "No off-site or payment links in the public text",
      ),
    ],
    [
      "full",
      L(
        "Un posto libero, oppure la lista d’attesa attiva",
        "A free seat, or the waitlist turned on",
      ),
    ],
    [
      "conduct",
      L(
        "Codice di condotta accettato (alla pubblicazione)",
        "Code of conduct accepted (when publishing)",
      ),
    ],
  ];
  return `<ul class="community-checks">${all
    .map(([id, label]) => {
      const problem = problems.find((row) => row.id === id);
      const fix = problem?.fix
        ? ` <button class="text-button" data-community-fix-page="${ctx.esc(problem.fix.page)}" data-community-fix-tab="${ctx.esc(problem.fix.params?.tab ?? "")}" data-community-fix-id="${ctx.esc(problem.fix.params?.id ?? "")}" data-community-fix-field="${ctx.esc(problem.fix.field ?? "")}">${ctx.t("Risolvi", "Fix")}</button>`
        : "";
      return `<li class="${problem ? "is-missing" : "is-ok"}"><span class="community-check-mark" aria-hidden="true">${problem ? "✕" : "✓"}</span><span>${ctx.esc(ctx.label(label))}${problem ? `<span class="visually-hidden"> — ${ctx.t("manca", "missing")}</span>` : ""}</span>${fix}</li>`;
    })
    .join("")}</ul>`;
}
function queueRow(ctx, api, application, { canApprove, position = 0, reason = "" } = {}) {
  const person = name(ctx, api, application.who);
  // A blocked applicant stays in the queue: decline, or unblock to accept (SVC-149).
  const blockedNote = application.blocked
    ? ctx.t(
        "Hai bloccato questa persona: puoi non accettarla, oppure sbloccarla per accettarla.",
        "You blocked this person: you can decline, or unblock them to accept.",
      )
    : "";
  const approve =
    canApprove && !application.blocked
      ? `<button class="button primary" data-community-act="approve" data-application="${ctx.esc(application.id)}">${ctx.t("Accetta…", "Accept…")}</button>`
      : "";
  const notes = [reason, blockedNote]
    .filter(Boolean)
    .map((line) => `<p class="muted">${ctx.esc(line)}</p>`)
    .join("");
  return `<li class="community-row" data-community-queue-row="${ctx.esc(application.id)}"><div><p><strong>${ctx.esc(person)}</strong>${position ? ` <span class="badge">${ctx.t(`${position}° in lista`, `#${position} in line`)}</span>` : ""}${D.isIdentity(application.who) ? "" : ` <span class="badge community-sim-badge">${ctx.t("persona simulata", "simulated person")}</span>`}${application.blocked ? ` <span class="badge">${ctx.t("Bloccata da te", "Blocked by you")}</span>` : ""}</p><p class="muted">${ctx.t(`Arrivata il ${day(ctx, application.createdAt)}`, `Received on ${day(ctx, application.createdAt)}`)}${application.adult ? ` · ${ctx.t("ha dichiarato 18+", "declared 18+")}` : ""}</p><blockquote class="community-quote">${ctx.esc(application.message)}</blockquote>${notes}</div><div class="toolbar">${approve}<button class="button" data-community-act="decline" data-application="${ctx.esc(application.id)}">${ctx.t("Non accettare…", "Decline…")}</button>${personActions(
    ctx,
    api,
    application.who,
    {
      kind: "application",
      targetId: application.id,
      label: person,
      text: ctx.t("Segnala", "Report"),
    },
  )}</div></li>`;
}
function renderStatus(ctx, api, listing) {
  const slice = sliceOf(ctx, api);
  const state = D.listingState(ctx.state, slice, listing, now());
  const problems = D.listingProblems(ctx.state, slice, listing, now());
  const seats = D.seatInfo(ctx.state, slice, listing);
  // The "full" badge follows the seats, not only the reason stored when it turned off.
  const stateKey =
    state === "disabled" && ["full", "full-cleared"].includes(listing.disabledReason)
      ? seats.full
        ? "full"
        : "freed"
      : state;
  const inactive = problems.some((row) => row.id === "campaign");
  const restoreFirst = ctx.t(
    "Campagna archiviata o eliminata: ripristinala in Campagne per accettare. Puoi non accettare con una risposta.",
    "Campaign archived or deleted: restore it in Campaigns to accept. You can decline with a reply.",
  );
  const next = D.listingNextSession(ctx.state, listing, now());
  const buttons = [];
  if (["draft", "disabled"].includes(listing.status))
    buttons.push(
      `<button class="button primary" data-community-act="publish" data-listing="${ctx.esc(listing.id)}">${listing.status === "draft" ? ctx.t("Pubblica", "Publish") : ctx.t("Riattiva", "Enable")}</button>`,
    );
  if (listing.status === "live")
    buttons.push(
      `<button class="button" data-community-act="disable" data-listing="${ctx.esc(listing.id)}">${ctx.t("Disattiva", "Disable")}</button>`,
    );
  buttons.push(
    `<button class="button quiet" data-community-preview="${ctx.esc(listing.id)}">${ctx.t("Vedi come lo vedono gli altri", "See it as others do")}</button>`,
  );
  const queue = D.queueFor(ctx.state, slice, listing.id, ctx.role);
  const head = queue.waitlist[0];
  const pending = queue.pending.map((row) => {
    const ahead = D.waitingAhead(slice, row);
    return queueRow(ctx, api, row, {
      canApprove: !inactive && !seats.full && !ahead,
      reason: inactive
        ? restoreFirst
        : seats.full
          ? ctx.t(
              "Tavolo completo: aumenta i posti per accettare.",
              "Table full: add seats to accept.",
            )
          : ahead
            ? ctx.t(
                `${name(ctx, api, ahead.who)} aspetta in lista da prima: decidi prima sulla sua candidatura.`,
                `${name(ctx, api, ahead.who)} has been waiting longer: decide on them first.`,
              )
            : "",
    });
  });
  const waiting = queue.waitlist.map((row, index) =>
    queueRow(ctx, api, row, {
      canApprove: index === 0 && !inactive && !seats.full,
      position: index + 1,
      reason: inactive
        ? restoreFirst
        : index === 0 && seats.full
          ? ctx.t(
              "Prima in coda: potrà entrare quando si libera un posto.",
              "First in line: can join when a seat frees.",
            )
          : "",
    }),
  );
  const decided = queue.decided.length
    ? `<details class="community-details"><summary>${ctx.t(`Già decise (${queue.decided.length})`, `Already decided (${queue.decided.length})`)}</summary><ul class="community-rows">${queue.decided
        .map(
          (row) =>
            `<li class="community-row"><div><p><strong>${ctx.esc(name(ctx, api, row.who))}</strong> ${statusBadge(ctx, api, row)}</p>${row.reply ? `<p class="community-reply"><span class="muted">${ctx.t("Risposta", "Reply")}:</span> ${ctx.esc(row.reply)}</p>` : ""}${row.closedReason === "blocked" ? `<p class="muted">${ctx.t("Chiusa dal blocco.", "Closed by the block.")}</p>` : ""}</div></li>`,
        )
        .join("")}</ul></details>`
    : "";
  return `<section class="community-status panel" data-community-status tabindex="-1" aria-labelledby="community-status-title"><div class="section-heading"><h3 id="community-status-title">${ctx.t("Stato dell’annuncio", "Listing status")}</h3><span class="badge community-listing-state is-${ctx.esc(stateKey)}">${ctx.esc(ctx.label(LISTING_STATE[stateKey]))}</span></div><p><strong>${ctx.esc(listing.title)}</strong></p><p class="muted">${ctx.esc(sessionLine(ctx, next))} · ${ctx.esc(seatsText(ctx, seats, listing))}</p>${problemList(ctx, problems)}<div class="toolbar">${buttons.join("")}</div></section><section class="community-block" data-community-queue tabindex="-1" aria-labelledby="community-queue-title"><h3 id="community-queue-title">${ctx.t(`Candidature in attesa (${queue.pending.length})`, `Waiting applications (${queue.pending.length})`)}</h3>${
    pending.length
      ? `<ul class="community-rows">${pending.join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna candidatura in attesa.", "No application waiting.")}</p>`
  }<h3>${ctx.t(`Lista d’attesa (${queue.waitlist.length})`, `Waitlist (${queue.waitlist.length})`)}</h3><p class="muted">${ctx.t("In ordine d’arrivo: l’ordine non si cambia. Si accetta solo chi è primo, quando c’è un posto libero.", "In arrival order: the order never changes. Only the first person can be accepted, when a seat is free.")}${head && !inactive && !seats.full ? ` ${ctx.t("Un posto è libero: decidi sulla prima persona in coda.", "A seat is free: decide on the first person in line.")}` : ""}</p>${
    waiting.length
      ? `<ol class="community-rows">${waiting.join("")}</ol>`
      : `<p class="muted">${ctx.t("Nessuno in lista d’attesa.", "Nobody on the waitlist.")}</p>`
  }${decided}</section>`;
}
function renderListingForm(ctx, api, listing) {
  const safety = D.campaignSafety(ctx.state, listing.campaignId);
  const tools = D.SAFETY_TOOLS.map(
    (tool) =>
      `<label class="check-field"><input type="checkbox" name="tools" value="${tool.id}"${checked(listing.tools?.includes(tool.id))}> ${ctx.esc(ctx.label(tool.label))}</label>`,
  ).join("");
  const warnings = D.SAFETY_TOPICS.map(
    (topic) =>
      `<label class="check-field"><input type="checkbox" name="warnings" value="${topic.id}"${checked(listing.warnings?.includes(topic.id))}> ${ctx.esc(ctx.label(topic.label))}</label>`,
  ).join("");
  const frequencies = D.FREQUENCIES.map((id) =>
    option(id, ctx.esc(ctx.label(FREQUENCY[id])), listing.frequency === id),
  ).join("");
  return `<form class="community-form panel" data-community-form="listing" data-listing="${ctx.esc(listing.id)}" aria-labelledby="community-form-title"><h3 id="community-form-title" tabindex="-1">${ctx.t("Annuncio pubblico", "Public listing")}</h3><p class="muted">${ctx.t("Solo questa presentazione è pubblica: schede, appunti, diario e segreti della campagna restano privati.", "Only this presentation is public: the campaign’s sheets, notes, journal and secrets stay private.")}</p><label class="field">${ctx.t("Titolo", "Title")}<input name="title" maxlength="${D.LIMITS.title}" value="${ctx.esc(listing.title)}" required></label><label class="field">${ctx.t("Presentazione", "Presentation")}<textarea name="pitch" maxlength="${D.LIMITS.pitch}" required>${ctx.esc(listing.pitch)}</textarea></label><div class="form-grid"><label class="field">${ctx.t("Lingua del tavolo", "Table language")}<select name="language">${option("it", "Italiano", listing.language === "it")}${option("en", "English", listing.language === "en")}</select></label><label class="field">${ctx.t("Formato", "Format")}<select name="format">${option("campaign", ctx.t("Campagna", "Campaign"), listing.format === "campaign")}${option("one-shot", "One-shot", listing.format === "one-shot")}</select></label><label class="field">${ctx.t("Frequenza", "How often")}<select name="frequency">${frequencies}</select></label><label class="field">${ctx.t("Posti per giocatori (DM esclusi)", "Player seats (DMs excluded)")}<input type="number" name="seats" min="${D.LIMITS.seatsMin}" max="${D.LIMITS.seatsMax}" value="${ctx.esc(listing.seats)}" required></label></div><label class="check-field"><input type="checkbox" name="newcomers"${checked(listing.newcomers)}> ${ctx.t("Accoglie nuovi giocatori", "Welcomes new players")}</label><label class="check-field"><input type="checkbox" name="waitlist"${checked(listing.waitlist)}> ${ctx.t("Lista d’attesa quando è completo (altrimenti l’annuncio si disattiva)", "Waitlist when full (otherwise the listing turns off)")}</label><label class="check-field"><input type="checkbox" name="mature"${checked(listing.mature)}> ${ctx.t("Per adulti (18+): nascosto a chi non lo chiede", "Adults only (18+): hidden unless asked for")}</label><p class="muted">${ctx.t("La prossima sessione è quella programmata nella campagna (Sessioni).", "The next session is the one scheduled in the campaign (Sessions).")}</p><fieldset class="community-fieldset"><legend>${ctx.t("Strumenti di sicurezza in uso", "Safety tools in use")}</legend>${tools}</fieldset><fieldset class="community-fieldset"><legend>${ctx.t("Avvisi di contenuto", "Content warnings")}</legend><div class="community-grid-checks">${warnings}</div></fieldset>${
    safety
      ? `<p class="muted">${ctx.t(
          `Aspettative della campagna (Sicurezza): ${safety.shared ? "condivise" : "bozza non condivisa"}, aggiornate il ${day(ctx, safety.updatedAt)}.`,
          `Campaign expectations (Safety): ${safety.shared ? "shared" : "unshared draft"}, updated on ${day(ctx, safety.updatedAt)}.`,
        )} <button class="text-button" type="button" data-community-act="refresh-safety" data-listing="${ctx.esc(listing.id)}">${ctx.t("Copia dalle aspettative", "Copy from the expectations")}</button></p>`
      : ""
  }<div class="toolbar"><button class="button primary" type="submit">${ctx.t("Salva annuncio", "Save listing")}</button></div></form>`;
}
function readListingForm(form) {
  const data = new FormData(form);
  return {
    title: data.get("title"),
    pitch: data.get("pitch"),
    language: data.get("language"),
    format: data.get("format"),
    frequency: data.get("frequency"),
    seats: Number(data.get("seats")),
    newcomers: data.get("newcomers") === "on",
    waitlist: data.get("waitlist") === "on",
    mature: data.get("mature") === "on",
    tools: data.getAll("tools"),
    warnings: data.getAll("warnings"),
  };
}
export function publicLink(campaignId) {
  const base = globalThis.location ? `${location.origin}${location.pathname}` : "";
  return `${base}#community?tab=public&id=${encodeURIComponent(campaignId)}`;
}
function renderPublicSettings(ctx, api, campaignId) {
  const slice = sliceOf(ctx, api);
  const page = D.publicPageOf(slice, campaignId);
  const eligible = D.publicEligibleEntries(ctx.state, campaignId);
  const empty = D.publicPageEmpty(ctx.state, slice, campaignId);
  const entries = eligible.length
    ? eligible
        .map(
          (entry) =>
            `<label class="check-field"><input type="checkbox" name="entries" value="${ctx.esc(entry.id)}"${checked(page.entryIds.includes(entry.id))}> ${ctx.esc(entry.title || ctx.t("Resoconto senza titolo", "Untitled recap"))} <span class="muted">· ${ctx.esc(ctx.label(ENTRY_KIND[entry.kind] ?? entry.kind))} · ${entry.ownerId ? ctx.esc(ctx.t(`di ${name(ctx, api, entry.ownerId)}`, `by ${name(ctx, api, entry.ownerId)}`)) : ctx.t("del gruppo", "of the party")}</span></label>`,
        )
        .join("")
    : `<p class="muted">${ctx.t("Nessuna voce del Diario, del Mondo o dell’Archivio è condivisa con tutta la campagna.", "No Journal, World or Archive entry is shared with the whole campaign.")} <button class="text-button" type="button" data-nav="campaign">${ctx.t("Apri la campagna", "Open the campaign")}</button></p>`;
  return `<form class="community-form panel" data-community-form="public-page" data-campaign="${ctx.esc(campaignId)}" aria-labelledby="community-public-title"><h3 id="community-public-title" tabindex="-1">${ctx.t("Pagina pubblica in sola lettura", "Read-only public page")}</h3><p class="muted">${ctx.t(
    "Spenta di solito. Chi visita legge solo nome, descrizione della campagna e le voci scelte qui, fra quelle di un DM o co-DM condivise con tutta la campagna; delle voci compaiono solo le sezioni condivise con tutti. Le voci dei giocatori restano al pubblico scelto da chi le ha scritte.",
    "Off by default. Visitors read only the campaign name, its description and the entries chosen here, among a DM or co-DM’s entries shared with the whole campaign; only the sections shared with everyone appear. Players’ entries keep the audience their authors chose.",
  )}</p>${
    empty
      ? `<div class="community-warning" role="alert" data-community-public-warning><p><strong>${ctx.t("La pagina pubblica non mostrerebbe nulla.", "The public page would show nothing.")}</strong> ${ctx.t("È attiva, ma nessuna voce è scelta per i visitatori.", "It is on, but no entry is chosen for visitors.")}</p><button class="button" type="button" data-community-act="fix-public">${ctx.t("Correggi", "Fix this issue")}</button></div>`
      : ""
  }<label class="check-field"><input type="checkbox" name="enabled"${checked(page.enabled)}> ${ctx.t("Pagina pubblica attiva", "Public page on")}</label><fieldset class="community-fieldset" data-community-public-entries><legend>${ctx.t("Voci visibili ai visitatori", "Entries visitors can read")}</legend>${entries}</fieldset><div class="toolbar"><button class="button primary" type="submit">${ctx.t("Salva pagina pubblica", "Save public page")}</button><button class="button" type="button" data-community-public="${ctx.esc(campaignId)}">${ctx.t("Vedi come visitatore", "View as a visitor")}</button></div>${
    page.enabled
      ? `<label class="field community-link">${ctx.t("Link della pagina", "Page link")}<input readonly value="${ctx.esc(publicLink(campaignId))}" data-community-link></label><button class="button quiet" type="button" data-community-act="copy-link">${ctx.t("Copia link", "Copy link")}</button>`
      : ""
  }</form>`;
}
function renderPlayers(ctx, api, listing) {
  const slice = sliceOf(ctx, api);
  const rows = D.directoryFor(ctx.state, slice, ctx.role, { language: ui.dirLanguage });
  const live = D.listingState(ctx.state, slice, listing, now()) === "live";
  const formats = { any: L("Campagna o one-shot", "Campaign or one-shot"), ...FORMAT };
  const list = rows.length
    ? `<ul class="community-rows">${rows
        .map((row) => {
          const invited = slice.invitations.some(
            (i) => i.listingId === listing.id && i.to === row.id && i.status !== "dismissed",
          );
          const member = D.memberOf(ctx.state, listing.campaignId, row.id);
          const person = name(ctx, api, row.id);
          const application = D.myApplication(slice, listing.id, row.id);
          // Already applied, or accepted with the B13 invitation still open: nothing to
          // invite to (inviteToApply refuses both), so the row says where they stand.
          const standing = D.isOpen(application)
            ? ctx.t("Si è già candidato: decidi nella coda", "Already applied: decide in the queue")
            : D.approvalStage(ctx.state, slice, application) === "invited"
              ? ctx.t(
                  "Già accettato: invito alla campagna in attesa",
                  "Already accepted: campaign invitation pending",
                )
              : "";
          // A blocked person stays listed (SVC-149) but cannot be invited (private contact).
          const action = member
            ? `<span class="muted">${ctx.t("Fa già parte della campagna", "Already in the campaign")}</span>`
            : standing
              ? `<span class="muted">${ctx.esc(standing)}</span>`
              : row.blocked
                ? `<span class="muted">${ctx.t("Bloccata da te: sbloccala per invitarla", "Blocked by you: unblock to invite")}</span>`
                : invited
                  ? `<span class="badge">${ctx.t("Invitato a candidarsi", "Invited to apply")}</span>`
                  : `<button class="button" data-community-act="invite-apply" data-person="${ctx.esc(row.id)}" data-listing="${ctx.esc(listing.id)}"${live ? "" : ` disabled aria-describedby="community-invite-why-${ctx.esc(listing.id)}"`}>${ctx.t("Invita a candidarsi", "Invite to apply")}</button>`;
          return `<li class="community-row" data-community-directory-row="${ctx.esc(row.id)}"><div><p><strong>${ctx.esc(person)}</strong> <span class="badge">${ctx.esc(ctx.label(LANGUAGE[row.language]))}</span> <span class="badge">${ctx.esc(ctx.label(formats[row.format] ?? formats.any))}</span>${D.isIdentity(row.id) ? "" : ` <span class="badge community-sim-badge">${ctx.t("persona simulata", "simulated person")}</span>`}</p><p class="muted">${ctx.esc(row.availability)}</p>${row.intro ? `<p>${ctx.esc(row.intro)}</p>` : ""}</div><div class="toolbar">${action}${personActions(
            ctx,
            api,
            row.id,
            {
              kind: "person",
              targetId: row.id,
              label: person,
              text: ctx.t("Segnala", "Report"),
            },
          )}</div></li>`;
        })
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuno nell’elenco con questo filtro.", "Nobody listed with this filter.")}</p>`;
  return `<section class="community-block" aria-labelledby="community-players-title"><h3 id="community-players-title">${ctx.t("Giocatori in cerca di un gruppo", "Players looking for a group")}</h3><p class="muted">${ctx.t("Persone che si sono iscritte all’elenco di loro scelta. L’invito arriva come notifica e porta al tuo annuncio: niente messaggi privati.", "People who chose to join the list. The invitation arrives as a notification and leads to your listing: no private messages.")}</p>${live ? "" : `<p class="muted" id="community-invite-why-${ctx.esc(listing.id)}">${D.campaignActive(ctx.state, listing.campaignId) ? ctx.t("L’annuncio non è pubblicato. Pubblicalo per poter invitare.", "The listing is not published. Publish it to invite.") : ctx.t("La campagna non è attiva. Ripristinala in Campagne per poter invitare.", "The campaign is not active. Restore it in Campaigns to invite.")}</p>`}<label class="field community-inline">${ctx.t("Lingua", "Language")}<select data-community-dir-language>${option("any", ctx.t("Tutte", "All"), ui.dirLanguage === "any")}${option("it", "Italiano", ui.dirLanguage === "it")}${option("en", "English", ui.dirLanguage === "en")}</select></label>${list}</section>`;
}
// The management panel for one campaign: used by the page tab and the campaign section.
export function renderManage(ctx, api, campaignId, sub, base) {
  const slice = sliceOf(ctx, api);
  const listing = D.listingForCampaign(slice, campaignId);
  const campaign = D.campaignName(ctx.state, campaignId);
  if (!listing)
    return `<div class="empty-state community-empty"><h3>${ctx.esc(ctx.t(`${campaign} non ha un annuncio`, `${campaign} has no listing`))}</h3><p>${ctx.t(
      "Un annuncio fa trovare il tavolo a chi cerca un gruppo. Parte come bozza: niente è pubblico finché non pubblichi.",
      "A listing lets people looking for a group find the table. It starts as a draft: nothing is public until you publish.",
    )}</p><button class="button primary" data-community-act="create-listing" data-campaign="${ctx.esc(campaignId)}">${ctx.t("Crea annuncio", "Create listing")}</button></div>${
      sub === "public"
        ? renderPublicSettings(ctx, api, campaignId)
        : `<p><button class="text-button" data-community-sub="public" data-community-base="${base}" data-community-campaign-id="${ctx.esc(campaignId)}">${ctx.t("Pagina pubblica della campagna", "Campaign public page")}</button></p>`
    }`;
  const current = SUBTABS.includes(sub) ? sub : "status";
  const body = {
    status: () => renderStatus(ctx, api, listing),
    listing: () => renderListingForm(ctx, api, listing),
    public: () => renderPublicSettings(ctx, api, campaignId),
    players: () => renderPlayers(ctx, api, listing),
  }[current]();
  return `${subNav(ctx, current, base, campaignId)}${body}`;
}
const CAMPAIGN_STATUS = {
  archived: L("archiviata", "archived"),
  deleted: L("eliminata", "deleted"),
};
function renderManageTab(ctx, api, sub) {
  const campaigns = D.managedCampaigns(ctx.state, sliceOf(ctx, api), ctx.role, now());
  if (!campaigns.length)
    return `<div class="empty-state"><h2>${ctx.t("Nessuna campagna da gestire", "No campaign to manage")}</h2><p>${ctx.t("Gli annunci si pubblicano per le campagne di cui sei DM o co-DM.", "Listings are published for campaigns where you are DM or co-DM.")}</p><button class="button" data-nav="campaigns">${ctx.t("Apri Campagne", "Open Campaigns")}</button></div>`;
  // The campaign comes from the route (#community?tab=manage&id=<campaign>), then from
  // this visit's last choice, then the current campaign. A route to a campaign that is
  // not (or no longer) manageable says so instead of silently showing another one.
  const known = (id) => campaigns.some((row) => row.id === id);
  const missing = Boolean(ctx.view.id) && !known(ctx.view.id);
  ui.campaign = known(ctx.view.id)
    ? ctx.view.id
    : known(ui.campaign)
      ? ui.campaign
      : (campaigns.find((row) => row.current)?.id ?? campaigns[0].id);
  // Archived or deleted campaigns appear only while applications wait for an answer.
  const title = (row) =>
    CAMPAIGN_STATUS[row.status]
      ? `${row.name} (${ctx.label(CAMPAIGN_STATUS[row.status])})`
      : row.name;
  const select =
    campaigns.length > 1
      ? `<label class="field community-inline">${ctx.t("Campagna", "Campaign")}<select data-community-campaign>${campaigns
          .map((row) => option(ctx.esc(row.id), ctx.esc(title(row)), row.id === ui.campaign))
          .join("")}</select></label>`
      : `<p class="muted">${ctx.esc(ctx.t(`Campagna: ${title(campaigns[0])}`, `Campaign: ${title(campaigns[0])}`))}</p>`;
  const note = missing
    ? `<p class="community-warning" role="status">${ctx.t(
        "Quella campagna non ha più un reclutamento che puoi gestire: qui sotto trovi un’altra delle tue campagne.",
        "That campaign no longer has recruiting you can manage: below is another of your campaigns.",
      )}</p>`
    : "";
  return `<div class="community-manage">${note}${select}${renderManage(ctx, api, ui.campaign, sub, "page")}</div>`;
}

// ---------------------------------------------------------------- conduct, reports, blocks

function renderConduct(ctx, api) {
  const slice = sliceOf(ctx, api);
  const accepted = slice.conduct?.[ctx.role];
  const reports = D.reportsBy(slice, ctx.role);
  const blocks = (slice.blocks?.[ctx.role] ?? []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const reasonLabel = (id) => ctx.label(D.REPORT_REASONS.find((row) => row.id === id)?.label ?? id);
  const kindLabel = {
    listing: L("Annuncio", "Listing"),
    person: L("Persona", "Person"),
    application: L("Candidatura", "Application"),
    "public-page": L("Pagina pubblica", "Public page"),
  };
  return `<section class="community-block" aria-labelledby="community-conduct-title"><h2 id="community-conduct-title" tabindex="-1">${ctx.t("Codice di condotta", "Code of conduct")}</h2><p class="muted">${ctx.t(
    "Riferimento dichiarato: regole degli annunci e scala delle sanzioni di Roll20. Chi modera e con quali tempi resta da decidere per il prodotto reale.",
    "Declared reference: Roll20’s listing rules and moderation ladder. Who moderates, and how fast, is still to be decided for the real product.",
  )}</p>${conductSummary(ctx)}<h3>${ctx.t("Scala delle sanzioni", "Moderation ladder")}</h3><ol class="community-ladder">${D.MODERATION_LADDER.map((step) => `<li>${ctx.esc(ctx.label(step))}</li>`).join("")}</ol><p class="muted">${ctx.t("Anche dopo una sanzione restano l’accesso ai propri tavoli e ai propri contenuti.", "Even after a sanction, access to one’s own tables and content remains.")}</p>${
    accepted?.revision === D.CONDUCT_REVISION
      ? `<p><span class="badge is-positive">${ctx.t(`Accettato il ${day(ctx, accepted.at)}`, `Accepted on ${day(ctx, accepted.at)}`)}</span></p>`
      : `<button class="button primary" data-community-act="accept-conduct">${ctx.t("Accetto il codice di condotta", "I accept the code of conduct")}</button>`
  }</section><section class="community-block community-age" aria-labelledby="community-age-title"><h2 id="community-age-title">${ctx.t("Età e consenso", "Age and consent")}</h2><p>${ctx.t("La tua fascia d’età si dichiara in Account › Profilo › «Età e consenso»: sotto i 14 anni un genitore acconsente prima dei tavoli pubblici; sotto i 18 gli annunci per adulti restano nascosti. La regola per ogni paese del prodotto reale resta una decisione legale aperta.", "Your age band is declared in Account › Profile › “Age and consent”: under 14 a parent agrees before public tables; under 18 adult listings stay hidden. The rule for each country of the real product remains an open legal decision.")}</p><p><button type="button" class="button" data-community-age-open>${ctx.t("Apri Età e consenso", "Open Age and consent")}</button></p><ul><li>${ctx.t("Roll20: non utilizzabile sotto i 13 anni negli Stati Uniti e sotto i 16 nell’Unione Europea.", "Roll20: not usable under 13 in the United States and under 16 in the European Union.")}</li><li>${ctx.t("StartPlaying: solo maggiorenni.", "StartPlaying: adults only.")}</li><li>${ctx.t("D&D Beyond: data di nascita e paese all’accesso, consenso dei genitori per i minori.", "D&D Beyond: date of birth and country at sign-in, parental consent for minors.")}</li></ul><p class="muted">${ctx.t("La simulazione conserva solo la fascia d’età, mai la data di nascita. Un annuncio 18+ chiede anche una dichiarazione a chi si candida.", "The simulation keeps only the age band, never the date of birth. An 18+ listing also asks applicants for a declaration.")}</p></section><section class="community-block" aria-labelledby="community-reports-title"><h2 id="community-reports-title">${ctx.t("Le mie segnalazioni", "My reports")}</h2>${
    reports.length
      ? `<ul class="community-rows">${reports
          .map(
            (row) =>
              `<li class="community-row"><div><p><strong>${ctx.esc(ctx.label(kindLabel[row.kind] ?? kindLabel.listing))}</strong> · ${ctx.esc(reasonLabel(row.reason))} <span class="badge">${ctx.t("Ricevuta", "Received")}</span></p><p class="muted">${ctx.esc(day(ctx, row.at))}${row.personId ? ` · ${ctx.esc(name(ctx, api, row.personId))}` : ""}</p>${row.details ? `<p>${ctx.esc(row.details)}</p>` : ""}${row.screenshot?.src ? `<figure class="community-shot"><img src="${ctx.esc(row.screenshot.src)}" alt="${ctx.esc(ctx.t(`Screenshot allegato: ${row.screenshot.name || "immagine"}`, `Attached screenshot: ${row.screenshot.name || "image"}`))}" loading="lazy"><figcaption class="muted">${ctx.esc(row.screenshot.name || ctx.t("Screenshot allegato", "Attached screenshot"))}</figcaption></figure>` : ""}<p class="muted">${ctx.t("Simulazione: nessun invio reale. Chi modera non comunica l’esito.", "Simulation: nothing really sent. Moderators do not disclose the outcome.")}</p></div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna segnalazione inviata.", "No report sent.")}</p>`
  }</section><section class="community-block" aria-labelledby="community-blocks-title"><h2 id="community-blocks-title">${ctx.t("Persone bloccate", "Blocked people")}</h2>${
    blocks.length
      ? `<ul class="community-rows" data-community-blocks tabindex="-1">${blocks
          .map(
            (row) =>
              `<li class="community-row"><div><p><strong>${ctx.esc(name(ctx, api, row.personId))}</strong></p><p class="muted">${ctx.esc(ctx.t(`Bloccato il ${day(ctx, row.at)}`, `Blocked on ${day(ctx, row.at)}`))}</p></div><div class="toolbar"><button class="button" data-community-act="unblock" data-person="${ctx.esc(row.personId)}">${ctx.esc(ctx.t(`Sblocca ${name(ctx, api, row.personId)}`, `Unblock ${name(ctx, api, row.personId)}`))}</button></div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted" data-community-blocks tabindex="-1">${ctx.t("Nessuna persona bloccata.", "Nobody blocked.")}</p>`
  }</section>`;
}

// ---------------------------------------------------------------- public page view (CA-07)

// The same prose as the campaign page (campaign.mjs): line breaks kept and "@Embed[...]"
// markers rendered as blocks (B16, FVT-175). Embed providers show public SRD entries only.
function prose(ctx, value) {
  return String(value ?? "").trim()
    ? `<div class="campaign-prose">${renderTextWithEmbeds(ctx, value)}</div>`
    : "";
}
function renderPublic(ctx, api, campaignId) {
  const slice = sliceOf(ctx, api);
  const view = D.publicPageView(ctx.state, slice, campaignId);
  const manager = D.canManage(ctx.state, campaignId, ctx.role);
  const banner = manager
    ? `<div class="community-preview" role="note"><p>${ctx.t("Anteprima come visitatore: vedi solo ciò che vedrebbe chi non fa parte della campagna.", "Preview as a visitor: you see only what someone outside the campaign would see.")}</p><button class="button" data-community-manage="${ctx.esc(campaignId)}" data-community-manage-sub="public">${ctx.t("Torna alla gestione", "Back to managing")}</button></div>`
    : "";
  if (!view.enabled)
    return `${banner}<div class="empty-state"><h2>${ctx.t("Questa campagna non ha una pagina pubblica", "This campaign has no public page")}</h2><p>${ctx.t("Il DM non l’ha attivata.", "The DM has not turned it on.")}</p></div>`;
  const entries = view.entries.length
    ? view.entries
        .map(
          (entry) =>
            `<article class="community-public-entry"><h3>${ctx.esc(entry.title || ctx.t("Resoconto senza titolo", "Untitled recap"))}</h3>${prose(ctx, entry.body)}${entry.sections
              .map((section) => `<h4>${ctx.esc(section.title)}</h4>${prose(ctx, section.body)}`)
              .join("")}</article>`,
        )
        .join("")
    : `<p class="muted">${ctx.t("Nessun contenuto pubblico per ora.", "No public content yet.")}</p>`;
  return `${banner}<article class="community-public" aria-labelledby="community-public-name"><p class="community-kicker">${ctx.t("Pagina pubblica · sola lettura", "Public page · read only")}</p><h2 id="community-public-name" tabindex="-1">${ctx.esc(view.name)}</h2><p class="muted">D&amp;D 2024 · SRD ${ctx.esc(view.rules.srd)}</p>${view.description ? `<p class="community-pitch-full">${ctx.esc(view.description)}</p>` : ""}<div class="toolbar">${
    view.listingId
      ? `<button class="button primary" data-community-open="${ctx.esc(view.listingId)}">${ctx.t("Leggi l’annuncio e candidati", "Read the listing and apply")}</button>`
      : ""
  }${
    manager
      ? ""
      : `<button class="button quiet" data-community-act="report" data-kind="public-page" data-target="${ctx.esc(campaignId)}" data-label="${ctx.esc(view.name)}">${ctx.icon("flag")} ${ctx.t("Segnala pagina", "Report page")}</button>`
  }</div>${entries}</article>`;
}

// ---------------------------------------------------------------- page shell

export function renderCommunityPage(ctx, api) {
  const tab = ctx.view.tab || "find";
  const slice = sliceOf(ctx, api);
  const manages = D.managedCampaigns(ctx.state, slice, ctx.role, now()).length > 0;
  const open = D.applicationsFor(slice, ctx.role).filter(D.isOpen).length;
  const tabs = [
    ["find", ctx.t("Trova un tavolo", "Find a table")],
    [
      "mine",
      open
        ? ctx.t(`Le mie candidature (${open})`, `My applications (${open})`)
        : ctx.t("Le mie candidature", "My applications"),
    ],
    ...(manages ? [["manage", ctx.t("I miei annunci", "My listings")]] : []),
    ["conduct", ctx.t("Condotta e segnalazioni", "Conduct and reports")],
  ];
  const managing = tab === "manage" || tab.startsWith("manage-");
  const active = tab === "listing" ? "find" : managing || tab === "preview" ? "manage" : tab;
  let body;
  if (tab === "listing") body = renderListing(ctx, api, ctx.view.id);
  else if (tab === "preview") body = renderListing(ctx, api, ctx.view.id, { preview: true });
  else if (tab === "public") body = renderPublic(ctx, api, ctx.view.id);
  else if (tab === "mine") body = renderMine(ctx, api);
  else if (managing)
    body = manages
      ? renderManageTab(ctx, api, tab === "manage" ? "status" : tab.slice("manage-".length))
      : renderFind(ctx, api);
  else if (tab === "conduct") body = renderConduct(ctx, api);
  else body = renderFind(ctx, api);
  return `<section class="community" data-community-root><div class="page-heading"><div><h1>${ctx.t("Tavoli pubblici", "Public tables")}</h1><p>${ctx.t("Trova un tavolo D&D 2024, candidati con un messaggio, gestisci i tuoi annunci.", "Find a D&D 2024 table, apply with a message, manage your listings.")}</p></div></div><p class="community-sim" role="note">${ctx.t(
    "Simulazione: annunci e persone esterne sono dati d’esempio. Nessun annuncio, candidatura o segnalazione lascia questo browser.",
    "Simulation: external listings and people are sample data. No listing, application or report leaves this browser.",
  )}</p>${
    ctx.offline
      ? `<p class="community-offline" role="status">${ctx.t("Sei offline: puoi consultare gli annunci già caricati, ma candidature, pubblicazioni e segnalazioni richiedono la rete.", "You are offline: you can browse the listings already loaded, but applying, publishing and reporting need the network.")}</p>`
      : ""
  }${
    tab === "public"
      ? ""
      : `<nav class="tabs community-tabs" aria-label="${ctx.t("Sezioni dei tavoli pubblici", "Public tables sections")}">${tabs
          .map(
            ([id, label]) =>
              `<button class="${id === active ? "active" : ""}" data-community-tab="${id}"${id === active ? ' aria-current="page"' : ""}>${ctx.esc(label)}</button>`,
          )
          .join("")}</nav>`
  }${body}</section>`;
}

export function renderCampaignSection(ctx, api) {
  const campaignId = ctx.state.campaign?.id;
  return `<section class="community community-section" data-community-root><div class="page-heading"><div><h1>${ctx.t("Reclutamento", "Recruiting")}</h1><p>${ctx.esc(ctx.t(`${D.campaignName(ctx.state, campaignId)} · annuncio pubblico, candidature e pagina pubblica`, `${D.campaignName(ctx.state, campaignId)} · public listing, applications and public page`))}</p></div><button class="button" data-community-tab="find">${ctx.t("Tavoli pubblici", "Public tables")}</button></div><p class="community-sim" role="note">${ctx.t(
    "Simulazione: chi si candida da fuori è una persona d’esempio; nessun annuncio lascia questo browser.",
    "Simulation: outside applicants are sample people; no listing leaves this browser.",
  )}</p>${renderManage(ctx, api, campaignId, ctx.view.id, "campaign")}</section>`;
}

export function renderHomeWidget(ctx, api) {
  const slice = sliceOf(ctx, api);
  const result = D.searchListings(ctx.state, slice, ctx.role, {}, now(), zone());
  const inLanguage = result.rows.filter((row) => row.listing.language === ctx.lang).length;
  const open = D.applicationsFor(slice, ctx.role).filter(D.isOpen);
  // Queues the DM can open (active campaigns, or archived ones with answers still due).
  const queue = D.managedCampaigns(ctx.state, slice, ctx.role, now())
    .map((row) => D.listingForCampaign(slice, row.id))
    .filter(Boolean)
    .map((listing) => ({
      listing,
      count: D.queueFor(ctx.state, slice, listing.id, ctx.role).pending.length,
    }))
    .filter((row) => row.count);
  const rows = [
    ...queue.map(
      ({ listing, count }) =>
        `<li class="community-home-row"><div><strong>${ctx.esc(ctx.t(`${count} ${count === 1 ? "candidatura" : "candidature"} da decidere`, `${count} ${count === 1 ? "application" : "applications"} to decide`))}</strong><small>${ctx.esc(listing.title)}</small></div><button class="button" data-community-manage="${ctx.esc(listing.campaignId)}">${ctx.t("Decidi", "Decide")}</button></li>`,
    ),
    open.length
      ? `<li class="community-home-row"><div><strong>${ctx.esc(ctx.t(`${open.length} ${open.length === 1 ? "candidatura aperta" : "candidature aperte"}`, `${open.length} open ${open.length === 1 ? "application" : "applications"}`))}</strong><small>${ctx.t("In attesa del DM o in lista d’attesa.", "Waiting for the DM or on a waitlist.")}</small></div><button class="button" data-community-tab="mine">${ctx.t("Apri", "Open")}</button></li>`
      : "",
  ].join("");
  const count = result.rows.length;
  return `<section class="community-home" aria-labelledby="community-home-title"><div class="section-heading"><h2 id="community-home-title">${ctx.t("Trova un tavolo", "Join a game")}</h2><button class="text-button" data-community-tab="find">${ctx.t("Tutti gli annunci", "All listings")}</button></div><p class="muted">${ctx.esc(
    ctx.t(
      `${count} ${count === 1 ? "tavolo pubblico cerca" : "tavoli pubblici cercano"} giocatori · ${inLanguage} in italiano.`,
      `${count} public ${count === 1 ? "table is" : "tables are"} looking for players · ${inLanguage} in English.`,
    ),
  )}</p>${rows ? `<ul class="community-home-list">${rows}</ul>` : ""}<div class="toolbar"><button class="button primary" data-community-tab="find">${ctx.icon("search")} ${ctx.t("Cerca un tavolo", "Find a table")}</button></div></section>`;
}

// ---------------------------------------------------------------- binding

function go(ctx, tab, params = {}) {
  ctx.navigate("community", { ...(tab && tab !== "find" ? { tab } : {}), ...params });
}
function onClick(ctx, api, event, root) {
  const target = event.target?.closest?.(
    "[data-community-act],[data-community-tab],[data-community-open],[data-community-preview],[data-community-sub],[data-community-manage],[data-community-public],[data-community-invite],[data-community-fix-page]",
  );
  if (!target || !root.contains?.(target)) return;
  const d = target.dataset;
  if (d.communityTab !== undefined) return go(ctx, d.communityTab);
  if (d.communityOpen) return go(ctx, "listing", { id: d.communityOpen });
  if (d.communityPreview) return go(ctx, "preview", { id: d.communityPreview });
  if (d.communityPublic) return go(ctx, "public", { id: d.communityPublic });
  if (d.communityInvite !== undefined)
    return ctx.navigate(
      "campaigns",
      d.communityInvite ? { tab: "join", id: d.communityInvite } : {},
    );
  if (d.communityFixPage) {
    // The listing form opens with the missing field focused.
    if (d.communityFixField)
      ui.focus = `[data-community-form="listing"] [name="${d.communityFixField}"]`;
    return ctx.navigate(d.communityFixPage, {
      ...(d.communityFixTab ? { tab: d.communityFixTab } : {}),
      ...(d.communityFixId ? { id: d.communityFixId } : {}),
    });
  }
  if (d.communityManage !== undefined) {
    const sub = d.communityManageSub;
    if (ctx.state.campaign?.id === d.communityManage && ctx.role === "dm")
      return ctx.navigate("campaign", { tab: "community", ...(sub ? { id: sub } : {}) });
    return go(ctx, sub ? `manage-${sub}` : "manage", { id: d.communityManage });
  }
  if (d.communitySub) {
    const params = d.communitySub === "status" ? {} : { id: d.communitySub };
    return d.communityBase === "campaign"
      ? ctx.navigate("campaign", { tab: "community", ...params })
      : go(ctx, d.communitySub === "status" ? "manage" : `manage-${d.communitySub}`, {
          id: d.communityCampaignId,
        });
  }
  handleAct(ctx, api, target, root);
}
export function handleAct(ctx, api, target, root) {
  const d = target.dataset;
  switch (d.communityAct) {
    case "clear-filters":
      ui.filters = blankFilters();
      ui.typedQ = null;
      ui.focus = "#community-results-title";
      return ctx.render();
    case "apply":
      return openApply(ctx, api, d.listing);
    case "edit-application":
      return openEdit(ctx, api, d.application);
    case "withdraw":
      return openWithdraw(ctx, api, d.application);
    case "approve":
      return openDecision(ctx, api, d.application, true);
    case "decline":
      return openDecision(ctx, api, d.application, false);
    case "report":
      return openReport(ctx, api, {
        kind: d.kind,
        targetId: d.target,
        personId: d.person,
        label: d.label,
      });
    case "block":
      return openBlock(ctx, api, d.person);
    case "unblock": {
      const person = name(ctx, api, d.person);
      if (attempt(ctx, () => perform(ctx, api, "unblock", { personId: d.person }))) {
        focusSoon("[data-community-blocks]");
        ctx.toast(ctx.t(`${person} sbloccato.`, `${person} unblocked.`));
      }
      return;
    }
    case "create-listing":
      if (attempt(ctx, () => perform(ctx, api, "create-listing", { campaignId: d.campaign }))) {
        focusSoon("[data-community-status]");
        ctx.toast(
          ctx.t(
            "Bozza creata: completa i requisiti e pubblica.",
            "Draft created: complete the prerequisites and publish.",
          ),
        );
      }
      return;
    case "publish":
      return openPublish(ctx, api, d.listing);
    case "disable":
      if (attempt(ctx, () => perform(ctx, api, "disable", { listingId: d.listing }))) {
        focusSoon("[data-community-status]");
        ctx.toast(
          ctx.t(
            "Annuncio disattivato: non compare più nella ricerca.",
            "Listing disabled: it no longer appears in search.",
          ),
        );
      }
      return;
    case "refresh-safety": {
      // Copies the campaign's expectations sheet (B27) into the form: typed edits stay,
      // nothing is public until the listing is saved.
      const form = target.closest?.('form[data-community-form="listing"]');
      const listing = sliceOf(ctx, api).listings[d.listing];
      const safety = listing ? D.campaignSafety(ctx.state, listing.campaignId) : null;
      if (!form || !safety)
        return ctx.toast(
          ctx.t(
            "La campagna non ha ancora aspettative di sicurezza.",
            "The campaign has no safety expectations yet.",
          ),
          true,
        );
      form
        .querySelectorAll('[name="tools"]')
        .forEach((box) => (box.checked = safety.tools.includes(box.value)));
      form
        .querySelectorAll('[name="warnings"]')
        .forEach((box) => (box.checked = safety.warnings.includes(box.value)));
      markDraft(ctx, form);
      ctx.toast(
        ctx.t(
          "Strumenti e avvisi copiati dalle aspettative: salva l’annuncio per renderli pubblici.",
          "Tools and warnings copied from the expectations: save the listing to make them public.",
        ),
      );
      return;
    }
    case "accept-conduct":
      if (attempt(ctx, () => perform(ctx, api, "accept-conduct")))
        ctx.toast(ctx.t("Codice di condotta accettato.", "Code of conduct accepted."));
      return;
    case "leave-directory":
      if (attempt(ctx, () => perform(ctx, api, "leave-directory")))
        ctx.toast(
          ctx.t(
            "Non sei più nell’elenco: i DM non ti vedono.",
            "You are no longer listed: DMs do not see you.",
          ),
        );
      return;
    case "invite-apply":
      if (
        attempt(ctx, () =>
          perform(ctx, api, "invite-apply", { listingId: d.listing, personId: d.person }),
        )
      )
        ctx.toast(
          ctx.t(
            `Invito a candidarsi inviato a ${name(ctx, api, d.person)}.`,
            `Invitation to apply sent to ${name(ctx, api, d.person)}.`,
          ),
        );
      return;
    case "dismiss-invitation":
      if (
        attempt(ctx, () => perform(ctx, api, "dismiss-invitation", { invitationId: d.invitation }))
      )
        ctx.toast(ctx.t("Invito ignorato.", "Invitation dismissed."));
      return;
    case "fix-public": {
      const box =
        root.querySelector?.("[data-community-public-entries] input") ??
        root.querySelector?.("[data-community-public-entries]");
      box?.focus?.();
      box?.scrollIntoView?.({ block: "center" });
      return;
    }
    case "copy-link": {
      const input = root.querySelector?.("[data-community-link]");
      input?.select?.();
      const value = input?.value ?? "";
      const done = () => ctx.toast(ctx.t("Link copiato.", "Link copied."));
      const fallback = () =>
        ctx.toast(
          ctx.t(
            "Copia non disponibile: il link è selezionato, copialo a mano.",
            "Copy unavailable: the link is selected, copy it by hand.",
          ),
          true,
        );
      if (globalThis.navigator?.clipboard?.writeText)
        navigator.clipboard.writeText(value).then(done, fallback);
      else fallback();
      return;
    }
    default:
      return;
  }
}
function onSubmit(ctx, api, event) {
  const form = event.target?.closest?.("form[data-community-form]");
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.communityForm;
  if (kind === "filters") {
    ui.filters = readFilters(form);
    ui.typedQ = null;
    ui.focus = "#community-results-title";
    return ctx.render();
  }
  if (kind === "listing") {
    if (
      attempt(ctx, () =>
        perform(ctx, api, "save-listing", {
          listingId: form.dataset.listing,
          ...readListingForm(form),
        }),
      )
    ) {
      ui.draft = null;
      focusSoon("#community-form-title");
      ctx.toast(ctx.t("Annuncio salvato.", "Listing saved."));
    }
    return;
  }
  if (kind === "public-page") {
    const data = new FormData(form);
    if (
      attempt(ctx, () =>
        perform(ctx, api, "public-page", {
          campaignId: form.dataset.campaign,
          enabled: data.get("enabled") === "on",
          entryIds: data.getAll("entries"),
        }),
      )
    ) {
      ui.draft = null;
      focusSoon("#community-public-title");
      ctx.toast(ctx.t("Pagina pubblica salvata.", "Public page saved."));
    }
    return;
  }
  if (kind === "directory") {
    const data = new FormData(form);
    if (
      attempt(ctx, () =>
        perform(ctx, api, "directory", {
          format: data.get("format"),
          language: data.get("language"),
          availability: data.get("availability"),
          intro: data.get("intro"),
        }),
      )
    ) {
      ui.draft = null;
      focusSoon("#community-directory-title");
      ctx.toast(
        ctx.t("Sei nell’elenco di chi cerca un gruppo.", "You are listed as looking for a group."),
      );
    }
  }
}
function onChange(ctx, api, event) {
  const el = event.target;
  const editor = el?.closest?.(EDITORS);
  if (editor) return markDraft(ctx, editor);
  if (el?.matches?.("[data-community-campaign]")) {
    ui.campaign = el.value;
    return go(ctx, ctx.view.tab || "manage", { id: el.value });
  }
  if (el?.matches?.("[data-community-dir-language]")) {
    ui.dirLanguage = el.value;
    ui.focus = "[data-community-dir-language]";
    return ctx.render();
  }
  // Selects and boxes of the search apply at once; the keyword field waits for Search.
  const form = el?.closest?.('form[data-community-form="filters"]');
  if (form && el.name !== "q") {
    const typed = readFilters(form);
    ui.filters = { ...typed, q: ui.filters.q };
    // The typed keywords stay in the box until Search applies them.
    ui.typedQ = typed.q === ui.filters.q ? null : typed.q;
    ui.focus = `[data-community-form="filters"] [name="${el.name}"]`;
    ctx.render();
  }
}
export function bindCommunity(root, ctx, api) {
  root
    .querySelector("[data-community-age-open]")
    ?.addEventListener("click", () => ctx.navigate("account", { tab: "profile" }));
  root.addEventListener("click", (event) => onClick(ctx, api, event, root));
  root.addEventListener("submit", (event) => onSubmit(ctx, api, event));
  root.addEventListener("change", (event) => onChange(ctx, api, event));
  root.addEventListener("input", (event) => {
    const editor = event.target?.closest?.(EDITORS);
    if (editor) markDraft(ctx, editor);
    if (event.target?.name === "q" && event.target.closest?.('[data-community-form="filters"]'))
      ui.typedQ = event.target.value;
  });
  // Embedded blocks of the public page (tooltips, rolls, "Open in the compendium").
  bindTextEmbeds(root, ctx);
  if (ui.focus) {
    const target = root.querySelector?.(ui.focus);
    if (target) {
      ui.focus = null;
      target.focus?.();
    }
  }
}

// ---------------------------------------------------------------- registration

const KEYWORDS = [
  "tavol",
  "table",
  "grupp",
  "group",
  "lfg",
  "annunc",
  "listing",
  "candidat",
  "appl",
  "recluta",
  "recruit",
  "pubblic",
  "public",
  "segnal",
  "report",
  "blocc",
  "block",
  "condotta",
  "conduct",
];

// P10 CA-07: the public page form, also shown in Campaign › Settings › Sharing (Kanka keeps
// the public role in the campaign settings; LegendKeeper shares the public URL from there).
let sharedApi = null;
/** The current campaign's public page form for its DM or co-DM, or "" when unavailable. */
export function renderPublicSharing(ctx) {
  const campaignId = ctx.state.campaign?.id;
  if (!sharedApi || !campaignId || !D.canManage(ctx.state, campaignId, ctx.role)) return "";
  return renderPublicSettings(ctx, sharedApi, campaignId);
}
export function bindPublicSharing(root, ctx) {
  if (sharedApi) bindCommunity(root, ctx, sharedApi);
}

export function register(registry) {
  const api = { slice: (state) => registry.slice(state), ctx: () => registry.ctx };
  sharedApi = api;
  const managesCurrent = (ctx) => D.canManage(ctx.state, ctx.state.campaign?.id, ctx.role);

  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    // Public listings, applications, reports and blocks are communication and campaign
    // administration: gameplay Undo never touches them (like B13 membership and B27).
    undo: "preserve",
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./community.css", import.meta.url));

  registry.add("route", {
    id: "community",
    label: L("Tavoli pubblici", "Public tables"),
    icon: "search",
    render: (ctx) => renderCommunityPage(ctx, api),
    bind: (el, ctx) => bindCommunity(el, ctx, api),
  });
  registry.add("campaign-section", {
    id: "community",
    group: "manage",
    label: L("Reclutamento", "Recruiting"),
    order: 23,
    roles: ["dm"],
    when: managesCurrent,
    render: (ctx) => renderCampaignSection(ctx, api),
    bind: (el, ctx) => bindCommunity(el, ctx, api),
  });
  registry.add("home-widget", {
    id: "community-home",
    label: L("Trova un tavolo", "Join a game"),
    order: 38,
    render: (ctx) => renderHomeWidget(ctx, api),
    bind: (el, ctx) => bindCommunity(el, ctx, api),
  });

  registry.add("notifications", {
    id: "community-notices",
    label: L("Tavoli pubblici", "Public tables"),
    collect(ctx) {
      const slice = registry.slice(ctx.state);
      return D.noticesFor(ctx.state, slice, ctx.role, now()).map((item) => {
        const from = (lang) => D.personLabel(ctx.state, slice, item.from, lang);
        const titles = {
          approved: [
            `Candidatura accettata · ${item.title}`,
            `Application accepted · ${item.title}`,
          ],
          declined: [
            `Candidatura non accettata · ${item.title}`,
            `Application declined · ${item.title}`,
          ],
          ask: [`Invito a candidarti · ${item.title}`, `Invitation to apply · ${item.title}`],
          application: [`Nuova candidatura · ${item.title}`, `New application · ${item.title}`],
          waitlist: [
            `Posto libero: primo in lista · ${item.title}`,
            `Seat free: first on the waitlist · ${item.title}`,
          ],
        }[item.kind];
        const body = item.reply
          ? { it: `${from("it")}: ${item.reply}`, en: `${from("en")}: ${item.reply}` }
          : { it: `Da ${from("it")}`, en: `From ${from("en")}` };
        const manage = ["application", "waitlist"].includes(item.kind);
        const listing = slice.listings[item.listingId];
        return {
          id: `community-${item.key}`,
          title: { it: titles[0], en: titles[1] },
          body,
          time: item.at,
          category: "invites",
          by: item.from ?? null,
          target: manage
            ? ctx.state.campaign?.id === listing?.campaignId
              ? { page: "campaign", params: { tab: "community" } }
              : { page: "community", params: { tab: "manage", id: listing?.campaignId } }
            : item.kind === "ask"
              ? { page: "community", params: { tab: "listing", id: item.listingId } }
              : { page: "community", params: { tab: "mine" } },
        };
      });
    },
  });
  registry.add("search", {
    id: "community-search",
    label: L("Tavoli pubblici", "Public tables"),
    search(ctx, query) {
      const q = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (q.length < 3) return [];
      const slice = registry.slice(ctx.state);
      const results = D.searchListings(ctx.state, slice, ctx.role, { q }, now(), zone()).rows.map(
        ({ listing }) => ({
          title: listing.title,
          excerpt: L("Annuncio pubblico", "Public listing"),
          page: "community",
          params: { tab: "listing", id: listing.id },
        }),
      );
      if (KEYWORDS.some((word) => q.includes(word) || word.includes(q)))
        results.unshift({
          title: L("Tavoli pubblici · Trova un tavolo", "Public tables · Join a game"),
          page: "community",
        });
      return results;
    },
  });
  registry.add("command", {
    id: "community.find",
    label: L("Trova un tavolo pubblico", "Find a public table"),
    group: "community",
    run: (ctx) => ctx.navigate("community"),
  });
  registry.add("command", {
    id: "community.recruit",
    label: L("Gestisci il reclutamento della campagna", "Manage campaign recruiting"),
    group: "community",
    roles: ["dm"],
    when: managesCurrent,
    run: (ctx) => ctx.navigate("campaign", { tab: "community" }),
  });
  // Typed changes to the listing, the public page or the directory profile are kept
  // until saved: leaving asks first, like the other editors of the app (X-04).
  registry.add("draft-guard", {
    id: "community-editor",
    label: L("Modifiche non salvate", "Unsaved changes"),
    hasDraft: (ctx, next) => hasCommunityDraft(ctx, next),
    confirm: (ctx, proceed) =>
      ctx.dialog(
        ctx.t("Modifiche non salvate", "Unsaved changes"),
        `<p>${ctx.t(
          "Hai modificato questo modulo senza salvarlo. Se esci, le modifiche vanno perse.",
          "You changed this form without saving it. If you leave, the changes are lost.",
        )}</p>`,
        {
          submitLabel: ctx.t("Scarta le modifiche", "Discard the changes"),
          cancelLabel: ctx.t("Continua a modificare", "Keep editing"),
          onSubmit: () => {
            ui.draft = null;
            proceed();
          },
        },
      ),
  });
  registry.on("reset", () => resetCommunityView());
}
