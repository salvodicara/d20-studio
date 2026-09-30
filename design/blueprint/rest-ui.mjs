import * as rest from "./rest-time.mjs";
import { rollDie } from "./state.mjs";
import { isCampaignActor, canControlActor } from "./character-access.mjs";
import { pendingReselect, resolveReselect } from "./sheet-plus-domain.mjs";
import { preparationWindow } from "./spells-plus-domain.mjs";
import { openPreparedSpells } from "./spells-plus.mjs";

// Only the open panel's inputs live here. Attempts, faces and consequences belong to restTime.
let panel = null;
const uid = () => crypto.randomUUID();
const copy = (value) => structuredClone(value);
const num = (value) => (String(value ?? "").trim() === "" ? null : Number(value));
const message = (ctx, value) => value?.[ctx.lang] || value?.message || String(value ?? "");
const name = (ctx, value) => ctx.label(value);
// SV-37 (Roll20's errors name the cause and the fix): `why` is the locale sentence
// «cause. remedy.» of a disabled command, shown beside it and linked by aria-describedby.
const whyId = (attr) => "rest-why-" + attr.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80);
const button = (ctx, attr, it, en, why = "") =>
  `<button type="button" class="button${/^(data-rest-start|data-rest-apply)$/.test(attr) ? " primary" : ""}" ${attr}${why ? ` disabled aria-describedby="${whyId(attr)}"` : ""}>${ctx.esc(ctx.t(it, en))}</button>${why ? `<small class="rest-why" id="${whyId(attr)}">${ctx.esc(why)}</small>` : ""}`;
const STALE = (ctx) =>
  ctx.t(
    "Hai cambiato le scelte: rivedi l’anteprima prima di confermare.",
    "You changed the choices: review the preview before confirming.",
  );
function markStale(ctx, node, id) {
  node.disabled = true;
  if (!node.ownerDocument?.getElementById(id))
    node.insertAdjacentHTML?.(
      "afterend",
      `<small class="rest-why" id="${id}">${ctx.esc(STALE(ctx))}</small>`,
    );
  node.setAttribute?.("aria-describedby", id);
}
const field = (ctx, label, content) =>
  `<label class="field"><span>${ctx.esc(label)}</span>${content}</label>`;
const input = (ctx, attr, value, extra = "") =>
  `<input ${attr} value="${ctx.esc(value ?? "")}" ${extra}>`;
const select = (ctx, attr, value, items) =>
  `<select ${attr}>${items.map(([id, label]) => `<option value="${ctx.esc(id)}"${String(value) === String(id) ? " selected" : ""}>${ctx.esc(label)}</option>`).join("")}</select>`;
const valueText = (ctx, value) =>
  value === null || value === undefined
    ? ctx.t("Non registrato", "Not recorded")
    : typeof value === "object"
      ? ctx.t("Effetto attivo", "Active effect")
      : String(value);
const opts = (ctx, preview) => ({
  online: !ctx.offline,
  ...(preview?.reviewKey !== undefined ? { reviewKey: preview.reviewKey } : {}),
});
function base(ctx, type = "rest") {
  return {
    owner: ctx.role,
    type,
    stage: "setup",
    actorIds: [],
    campaignId: ctx.state.campaign?.id ?? null,
    restId: null,
    kind: "short",
    activities: {},
    modes: {},
    dice: {},
    faces: {},
    elapsed: {},
    causes: {},
    arcane: {},
    quick: {},
    reselect: {},
    details: {},
    review: null,
    correction: null,
    error: "",
    timeValue: "10",
    timeUnit: "60",
    lastLongHours: "",
  };
}
function profile(ctx, id) {
  return rest.getRestRecoveryProfile(ctx.state, id, ctx.role);
}
function historicalRollProfile(ctx, id) {
  try {
    return profile(ctx, id);
  } catch {
    // getRestRolls has already authorized this evidence, independently of live sheet access.
    return { actorName: ctx.t("Personaggio", "Character"), permissions: { canControl: false } };
  }
}
function profiles(ctx) {
  return Object.values(ctx.state.actors).flatMap((actor) => {
    if (actor.kind !== "character" && !panel.actorIds.includes(actor.id)) return [];
    try {
      const p = profile(ctx, actor.id);
      return p.permissions.canControl ? [p] : [];
    } catch {
      return [];
    }
  });
}
function clock(ctx) {
  try {
    return rest.getGameTime(ctx.state, ctx.state.campaign.id, ctx.role);
  } catch {
    return null;
  }
}
function personal(ctx, id) {
  const a = ctx.state.actors[id];
  return a.visibility === "private" || (Array.isArray(a.campaignIds) && !a.campaignIds.length);
}
function duration(ctx, seconds) {
  if (!Number.isFinite(seconds)) return valueText(ctx, null);
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    remainder = seconds % 60;
  return [
    hours ? `${hours} h` : "",
    minutes ? `${minutes} min` : "",
    remainder || (!hours && !minutes) ? `${remainder} s` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
function sourceHTML(ctx, source) {
  if (!source)
    return `<small>${ctx.t("Profilo di recupero non registrato; nessuna regola dedotta dal nome.", "Recovery profile unrecorded; no rule is inferred from a name.")}</small>`;
  const localized = source[ctx.lang] || source.en || source.it;
  const label = [
    source.kind === "srd"
      ? `SRD ${source.edition || ""}`
      : name(ctx, source.title || source.label || ctx.t("Regola dichiarata", "Authored rule")),
    source.revision,
    localized?.pages?.length ? `${ctx.t("p.", "p.")} ${localized.pages.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<small>${/^https:\/\//.test(localized?.url || source.url || "") ? `<a href="${ctx.esc(localized?.url || source.url)}" target="_blank" rel="noopener noreferrer">${ctx.esc(label)}</a>` : ctx.esc(label)}</small>`;
}
function issueHTML(ctx, items = []) {
  return items.length
    ? `<ul class="rest-issues">${items.map((x) => `<li>${ctx.esc(message(ctx, x))}</li>`).join("")}</ul>`
    : "";
}
function pathLabel(ctx, path, actorId) {
  if (path === "concentration.active")
    return ctx.t("Concentrazione · il sonno la termina", "Concentration · sleep ends it");
  const labels = {
    hp: ctx.t("PF", "HP"),
    tempHp: ctx.t("PF temporanei", "Temporary HP"),
    exhaustion: ctx.t("Indebolimento", "Exhaustion"),
    conditions: ctx.t(
      "Condizioni · Sonno aggiunge Privo di sensi",
      "Conditions · Sleep adds Unconscious",
    ),
    concentration: ctx.t("Concentrazione · il sonno la termina", "Concentration · sleep ends it"),
    "conditions.prone": ctx.t(
      "Prono · incluso nel sonno, resta al risveglio",
      "Prone · part of sleep, remains on waking",
    ),
    elapsedSeconds: ctx.t("Tempo di riposo", "Rest time"),
    "restProfile.arcaneRecovery.used": ctx.t(
      "Recupero Arcano · usi spesi",
      "Arcane Recovery · spent uses",
    ),
    "pactSlots.used": ctx.t("Slot del Patto · spesi", "Pact slots · spent"),
  };
  if (labels[path]) return labels[path];
  if (path.startsWith("hitDice."))
    return ctx.t("Dadi Vita", "Hit Dice") + ` ${path.split(".")[1]} · ` + ctx.t("spesi", "spent");
  if (path.startsWith("spellSlots."))
    return (
      ctx.t("Slot livello", "Level") + ` ${path.split(".")[1]} · ` + ctx.t("spesi", "spent slots")
    );
  if (path.startsWith("combatEffects."))
    return ctx.t("Effetto a durata esplicita", "Effect with an explicit duration");
  if (/^(features|spells|inventory)\./.test(path)) {
    // The row has already been projected; profile access is still checked before a display lookup.
    try {
      profile(ctx, actorId);
      const [key, ...bits] = path.split(".");
      const id = bits.slice(0, -1).join(".");
      const item = ctx.state.actors[actorId]?.[key]?.find((x) => x.id === id);
      return `${name(ctx, item?.name) || ctx.t("Risorsa", "Resource")} · ${ctx.t("usi spesi", "spent uses")}`;
    } catch {
      return ctx.t("Risorsa", "Resource");
    }
  }
  return ctx.t("Risorsa", "Resource");
}
function rowsHTML(ctx, rows = []) {
  return rows
    .map((row) => {
      let who = "";
      try {
        who = name(ctx, profile(ctx, row.actorId).actorName);
      } catch {
        return "";
      }
      const display =
        row.path === "elapsedSeconds"
          ? (v) => duration(ctx, v)
          : row.path === "conditions"
            ? (v) =>
                (v || [])
                  .map((c) =>
                    c.id === "unconscious"
                      ? ctx.t("Privo di sensi", "Unconscious")
                      : name(ctx, c.name || c),
                  )
                  .join(", ") || ctx.t("Nessuna", "None")
            : row.path === "conditions.prone"
              ? (v) => (v ? ctx.t("Attiva", "Active") : ctx.t("Non attiva", "Not active"))
              : ["concentration", "concentration.active"].includes(row.path)
                ? (v) =>
                    (typeof v === "boolean" ? v : v?.active)
                      ? ctx.t("Attiva", "Active")
                      : ctx.t("Terminata", "Ended")
                : (v) => valueText(ctx, v);
      const why =
        row.reason === "dawn-recovery"
          ? ` <small class="rest-why">${ctx.t("all’alba", "at dawn")}</small>`
          : "";
      return `<div class="rest-result-row"><strong>${ctx.esc(who)} · ${ctx.esc(pathLabel(ctx, row.path, row.actorId))}</strong>${why}<span class="rest-value">${ctx.esc(display(row.before))} → ${ctx.esc(display(row.after))}</span><p>${sourceHTML(ctx, row.source)}</p></div>`;
    })
    .join("");
}
function activities(ctx, id) {
  const items = [
    ["light", ctx.t("Attività leggera", "Light activity")],
    ["sleep", ctx.t("Sonno", "Sleep")],
  ];
  const p = profile(ctx, id);
  if (p.permissions.canControl && p.trance === true)
    items.push(["trance", ctx.t("Trance del profilo", "Profile's Trance")]);
  return items;
}
// A Long Rest starts in sleep (or the profile's Trance): the ordinary Long Rest (SRD) and the
// default of dnd5e's rest dialog; a Short Rest in light activity.
function activityOf(ctx, id) {
  if (panel.activities[id]) return panel.activities[id];
  if (panel.kind !== "long") return "light";
  try {
    return profile(ctx, id).trance === true ? "trance" : "sleep";
  } catch {
    return "sleep";
  }
}
function redraw(ctx) {
  if (!refreshRestUI(ctx)) ctx.render();
}
function safe(ctx, callback) {
  try {
    return callback();
  } catch (error) {
    if (panel) panel.error = message(ctx, error);
    ctx.toast?.(message(ctx, error), true);
    redraw(ctx);
    return null;
  }
}
function commit(ctx, label, callback, commitOptions) {
  let result;
  const outcome = ctx.commit(
    label,
    (state) => {
      result = callback(state);
    },
    commitOptions,
  );
  if (outcome?.applied === false)
    throw Error(ctx.t("La modifica non è stata applicata.", "The change was not applied."));
  panel.error = "";
  return result;
}
function previewFor(ctx, request) {
  const args = request.input;
  if (request.type === "start") return rest.previewRest(ctx.state, args, ctx.role);
  if (request.type === "time") return rest.previewTimeAdvance(ctx.state, args, ctx.role);
  if (request.type === "complete")
    return rest.previewRestCompletion(ctx.state, panel.restId, args, ctx.role);
  if (request.type === "arcane")
    return rest.previewArcaneRecovery(ctx.state, panel.restId, args, ctx.role);
  return rest.previewRestCorrection(ctx.state, args, ctx.role);
}
function review(ctx, type, args) {
  panel.error = "";
  const request = { type, input: copy(args), commandId: uid(), dirty: false };
  request.preview = previewFor(ctx, request);
  panel.review = request;
  redraw(ctx);
}
function invalidate() {
  if (panel.review) panel.review.dirty = true;
}
function previewHTML(ctx) {
  const request = panel.review;
  if (!request)
    return `<aside class="rest-preview"><h3>${ctx.t("Prima di applicare", "Before applying")}</h3><p>${ctx.t("L’anteprima mostra partecipanti, risorse e fonte. Il tempo trascorso non applica automaticamente il completamento.", "The preview shows participants, resources and sources. Elapsed time does not automatically complete a rest.")}</p></aside>`;
  // Display a fresh projection even while a review is stale: cached audience data
  // must disappear on revocation. Applying still requires the explicitly reviewed key.
  const p = previewFor(ctx, request),
    changed = request.dirty || p.reviewKey !== request.preview.reviewKey;
  const title = {
    start: ctx.t("Inizio del riposo", "Start rest"),
    time: ctx.t("Avanzamento del tempo", "Advance time"),
    complete: ctx.t("Recuperi del riposo", "Rest recovery"),
    arcane: ctx.t("Recupero Arcano", "Arcane Recovery"),
    correction: ctx.t("Correzione dichiarata", "Declared correction"),
  }[request.type];
  const participants = (p.participants || [])
    .map(
      (x) =>
        `<p>${ctx.esc(name(ctx, x.actorName))} · ${duration(ctx, x.requiredSeconds)}${x.source ? `<br>${sourceHTML(ctx, x.source)}` : ""}</p>`,
    )
    .join("");
  return `<aside class="rest-preview" aria-live="polite"><h3>${title}</h3>${request.type === "start" ? `${participants}<p>${ctx.t("Avvia il conteggio. Nessuna cura o risorsa viene recuperata ora.", "Starts tracking. No healing or resources are recovered now.")}</p>` : ""}${request.type === "time" ? `<p>${duration(ctx, p.before)} → ${duration(ctx, p.after)}</p>` : ""}${request.type === "correction" ? `<p>${ctx.esc(request.input.reason)}</p>` : ""}${rowsHTML(ctx, p.rows)}${issueHTML(ctx, p.errors)}${issueHTML(ctx, p.warnings)}${changed ? `<p class="rest-notice">${ctx.t("Dati o scelte cambiati: rifai l’anteprima per rivedere il risultato.", "Data or choices changed. Use the preview control again to review the result.")}</p>` : ""}<div class="rest-toolbar">${button(ctx, request.type === "start" ? "data-rest-start" : "data-rest-apply", request.type === "start" ? "Avvia riposo" : "Applica", request.type === "start" ? "Start rest" : "Apply", changed ? STALE(ctx) : ctx.offline && !p.commit.local ? ctx.t("Sei senza rete: un riposo condiviso si applica quando torni in linea.", "You are offline: a shared rest applies once you are back online.") : !p.canApply ? ctx.t("Qualcosa impedisce di confermare: risolvi i punti segnalati qui sopra.", "Something blocks the confirmation: fix the points listed above.") : "")}${button(ctx, "data-rest-clear-preview", "Annulla anteprima", "Cancel preview")}</div></aside>`;
}
function applyReview(ctx) {
  const request = panel.review;
  if (!request || request.dirty || previewFor(ctx, request).reviewKey !== request.preview.reviewKey)
    throw Error(
      ctx.t("Rivedi l’anteprima prima di applicare.", "Review the preview before applying."),
    );
  const args = { ...request.input, id: request.commandId },
    opt = opts(ctx, request.preview);
  const result = commit(
    ctx,
    ctx.t("Riposo aggiornato", "Rest updated"),
    (state) => {
      if (request.type === "start") return rest.startRest(state, request.input, ctx.role, opt);
      if (request.type === "time") return rest.advanceGameTime(state, args, ctx.role, opt);
      if (request.type === "complete")
        return rest.completeRest(state, panel.restId, args, ctx.role, opt);
      if (request.type === "arcane")
        return rest.applyArcaneRecovery(state, panel.restId, args, ctx.role, opt);
      return rest.correctRestResult(state, args, ctx.role, opt);
    },
    request.preview.commit,
  );
  if (request.type === "start") {
    panel.restId = result.id;
    panel.stage = "detail";
  }
  panel.review = null;
  panel.correction = null;
  redraw(ctx);
}
function availableProfiles(ctx) {
  return profiles(ctx).filter((p) =>
    panel.campaignId
      ? !personal(ctx, p.actorId) && isCampaignActor(ctx.state.actors[p.actorId], panel.campaignId)
      : personal(ctx, p.actorId),
  );
}
// D&D Beyond / Solasta show the Hit Dice from the start of a Short Rest.
function hitDiceLine(ctx, p) {
  const dice = Object.entries(p.hitDice ?? {}).filter(([, pool]) => pool.max > 0);
  if (!dice.length) return "";
  return `<p class="rest-hd-line" data-rest-hit-dice-line="${ctx.esc(p.actorId)}">${ctx.t("Dadi Vita disponibili", "Hit Dice available")}: ${dice.map(([die, pool]) => `${ctx.esc(die)} ${Number.isInteger(pool.used) ? pool.max - pool.used : "?"}/${pool.max}`).join(" · ")}</p>`;
}
// Rests still under way stay in sight at the top, not only in «Riposi registrati».
function runningRests(ctx) {
  try {
    return rest
      .listRests(ctx.state, ctx.role)
      .filter((r) => r.participants.some((p) => p.status === "resting"));
  } catch {
    return [];
  }
}
function runningHTML(ctx) {
  const list = runningRests(ctx);
  if (!list.length) return "";
  return `<section class="rest-running" data-rest-running><h3>${ctx.t("Riposi in corso", "Rests under way")}</h3>${list
    .map(
      (r) =>
        `<div class="rest-running-row"><span>${r.kind === "short" ? ctx.t("Riposo breve", "Short Rest") : ctx.t("Riposo lungo", "Long Rest")} · ${ctx.esc(r.participants.map((p) => name(ctx, p.actorName)).join(", "))}</span>${button(ctx, `data-rest-open="${ctx.esc(r.id)}"`, "Apri", "Open")}</div>`,
    )
    .join("")}</section>`;
}
function setupHTML(ctx) {
  const available = availableProfiles(ctx);
  const all = available.length > 0 && available.every((p) => panel.actorIds.includes(p.actorId));
  const quickShort =
    panel.kind === "short" && !panel.campaignId && panel.actorIds.length
      ? `<div class="rest-quick-short"><p>${ctx.t("Scheda personale: nessun DM fa passare il tempo. Il riposo breve dura 1 ora; poi spendi i Dadi Vita uno alla volta.", "Personal sheet: no DM advances time. A Short Rest lasts 1 hour; then spend Hit Dice one at a time.")}</p>${`<button type="button" class="button primary" data-rest-quick-short>${ctx.esc(ctx.t("Riposa 1 ora e spendi i Dadi Vita", "Rest 1 hour and spend Hit Dice"))}</button>`}</div>`
      : "";
  const priorLong =
    panel.kind === "long"
      ? `${field(ctx, ctx.t("Ore dalla fine del lungo precedente", "Hours since the previous Long Rest ended"), input(ctx, "data-rest-last-long", panel.lastLongHours, 'type="number" min="0" step="any"'))}<small>${ctx.t("Compila solo se richiesto per un riposo personale o un cambio di contesto. Nella stessa campagna vale il tempo narrativo registrato; questo campo non lo sostituisce.", "Fill in only when requested for a personal rest or a context change. Within the same campaign, recorded game time applies; this field does not replace it.")}</small>`
      : "";
  return `${runningHTML(ctx)}<div class="rest-layout"><section class="rest-fields"><h3>${ctx.t("Prepara un riposo", "Set up a rest")}</h3>${field(ctx, ctx.t("Contesto", "Context"), select(ctx, "data-rest-context", panel.campaignId || "", [["", ctx.t("Schede personali", "Personal sheets")], ...(clock(ctx) ? [[ctx.state.campaign.id, name(ctx, ctx.state.campaign.name)]] : [])]))}${field(
    ctx,
    ctx.t("Tipo", "Type"),
    select(ctx, "data-rest-kind", panel.kind, [
      ["short", ctx.t("Riposo breve", "Short Rest")],
      ["long", ctx.t("Riposo lungo", "Long Rest")],
    ]),
  )}${priorLong}<fieldset><legend>${ctx.t("Partecipanti espliciti", "Choose participants")}</legend>${available.length > 1 ? `<button type="button" class="button quiet rest-all-party" data-rest-all-party aria-pressed="${all}">${ctx.esc(all ? ctx.t("Tutto il gruppo ✓", "Whole party ✓") : ctx.t("Tutto il gruppo", "Whole party"))}</button>` : ""}${available.map((p) => `<div class="rest-person"><label class="rest-check">${input(ctx, `data-rest-participant="${ctx.esc(p.actorId)}"`, p.actorId, `type="checkbox"${panel.actorIds.includes(p.actorId) ? " checked" : ""}`)}<strong>${ctx.esc(name(ctx, p.actorName))}</strong></label><p>${ctx.t("PF", "HP")} ${valueText(ctx, p.hp)} / ${valueText(ctx, p.maxHp)}</p>${hitDiceLine(ctx, p)}${panel.actorIds.includes(p.actorId) ? field(ctx, ctx.t("Attività iniziale", "Initial activity"), select(ctx, `data-rest-start-activity="${ctx.esc(p.actorId)}"`, activityOf(ctx, p.actorId), activities(ctx, p.actorId))) : ""}</div>`).join("") || `<p>${ctx.t("Nessuna scheda controllabile in questo contesto.", "No controllable sheets in this context.")}</p>`}${available.length && !panel.actorIds.length ? `<p class="rest-notice" data-rest-none>${ctx.t("Scegli almeno un partecipante per avviare il riposo.", "Choose at least one participant to start the rest.")}</p>` : ""}</fieldset><p>${ctx.t("Dormire termina la concentrazione; l’attività leggera non la termina. I requisiti del lungo dipendono dal profilo verificato.", "Sleeping ends concentration; light activity does not. Long Rest requirements follow the verified profile.")}</p>${quickShort}${button(ctx, "data-rest-preview-start", "Vedi inizio del riposo", "Preview rest start")}</section>${previewHTML(ctx)}</div>`;
}
function timeHTML(ctx) {
  const c = clock(ctx);
  if (!c)
    return `<p>${ctx.t("Tempo della campagna non disponibile.", "Campaign time is unavailable.")}</p>`;
  return `<div class="rest-layout"><section class="rest-fields"><h3>${ctx.t("Tempo narrativo", "Game time")}</h3><p class="rest-value">${duration(ctx, c.seconds)}</p><p>${ctx.t("È il tempo trascorso nel gioco: non cambia gli appuntamenti reali. Il passaggio del tempo chiude le finestre di recupero precedenti.", "This is elapsed time in the game; it does not change real appointments. Advancing time closes previous recovery windows.")}</p>${
    c.permissions.canAdvance
      ? `<div class="rest-duration-fields">${field(ctx, ctx.t("Avanza di", "Advance by"), input(ctx, "data-rest-time-value", panel.timeValue, 'type="number" min="1" step="any"'))}${field(
          ctx,
          ctx.t("Unità", "Unit"),
          select(ctx, "data-rest-time-unit", panel.timeUnit, [
            ["1", ctx.t("Secondi", "Seconds")],
            ["60", ctx.t("Minuti", "Minutes")],
            ["3600", ctx.t("Ore", "Hours")],
          ]),
        )}</div>${button(ctx, "data-rest-preview-time", "Vedi conseguenze del tempo", "Preview time consequences")}`
      : `<p>${ctx.t("Il DM della campagna avanza il tempo condiviso.", "The campaign DM advances shared time.")}</p>`
  }</section>${previewHTML(ctx)}</div>`;
}
function details(ctx, id, label, body) {
  return `<details data-rest-details="${ctx.esc(id)}"${panel.details[id] ? " open" : ""}><summary>${ctx.esc(label)}</summary>${body}</details>`;
}
function quickInput(actorId, benefitId) {
  const q = panel.quick[actorId];
  return {
    actorId,
    benefitId,
    diceOrder: q.order
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    maxDice: num(q.cap),
  };
}
function stopText(ctx, code) {
  return (
    {
      cap: ctx.t("Massimo totale raggiunto.", "Total maximum reached."),
      pending: ctx.t(
        "Completa il tiro o la conseguenza in attesa.",
        "Complete the pending roll or consequence.",
      ),
      unknown: ctx.t(
        "Dati mancanti: verifica PF, COS e contatori.",
        "Missing data: check HP, Constitution and counters.",
      ),
      full: ctx.t("PF già al massimo.", "HP is already full."),
      "no-dice": ctx.t(
        "Nessun dado disponibile nell’ordine scelto.",
        "No dice available in the selected order.",
      ),
      "below-average": ctx.t(
        "I PF mancanti sono inferiori alla media del prossimo dado.",
        "Missing HP is below the next die’s mean healing.",
      ),
      closed: ctx.t("Recupero concluso.", "Recovery closed."),
    }[code] || ""
  );
}
function recoveryHTML(ctx, participant, benefit, p) {
  const id = participant.actorId,
    attr = `data-benefit-id="${ctx.esc(benefit.id)}"`,
    dice = Object.keys(p.hitDice).filter((key) => p.hitDice[key].max > 0);
  panel.dice[id] ??= dice[0] || "d8";
  panel.quick[id] ??= { order: dice.join(", "), cap: "", reviewed: false };
  const q = panel.quick[id],
    quick = q.reviewed
      ? rest.previewQuickRecovery(ctx.state, panel.restId, quickInput(id, benefit.id), ctx.role)
      : null;
  return `<h4>${ctx.t("Recupero facoltativo", "Optional recovery")}</h4><div class="rest-choice-row">${field(
    ctx,
    ctx.t("Dado Vita", "Hit Die"),
    select(
      ctx,
      `data-rest-die="${ctx.esc(id)}"`,
      panel.dice[id],
      dice.map((die) => [
        die,
        `${die} · ${valueText(ctx, p.hitDice[die].used)}/${p.hitDice[die].max} ${ctx.t("spesi", "spent")}`,
      ]),
    ),
  )}${field(
    ctx,
    ctx.t("Modalità", "Mode"),
    select(ctx, `data-rest-dice-mode="${ctx.esc(id)}"`, panel.modes[id] || "digital", [
      ["digital", ctx.t("Digitale", "Digital")],
      ["physical", ctx.t("Fisica", "Physical")],
    ]),
  )}</div><div class="rest-toolbar">${button(ctx, `data-rest-hit-die="${ctx.esc(id)}" ${attr}`, "Spendi un Dado Vita", "Spend one Hit Die", dice.length ? "" : ctx.t("Nessun Dado Vita rimasto: si recuperano con un riposo lungo.", "No Hit Dice left: they come back with a Long Rest."))}${button(ctx, `data-rest-finish="${ctx.esc(id)}" ${attr}`, "Concludi recupero", "Finish recovery")}</div>${details(ctx, `quick-${id}`, ctx.t("Recupero rapido facoltativo", "Optional quick recovery"), `<p>${ctx.t("Scegli ordine e massimo totale di dadi in questo beneficio, inclusi quelli già spesi. Si ferma se i PF mancanti sono sotto la media del prossimo dado. In modalità fisica si attende ogni faccia.", "Choose the dice order and total maximum for this benefit, including dice already spent. Stops if missing HP is below the next die’s mean. Physical mode waits for each face.")}</p>${field(ctx, ctx.t("Ordine dei dadi, separati da virgola", "Dice order, separated by commas"), input(ctx, `data-rest-quick-order="${ctx.esc(id)}"`, q.order))}${field(ctx, ctx.t("Massimo totale in questo recupero", "Maximum total dice in this recovery"), input(ctx, `data-rest-quick-cap="${ctx.esc(id)}"`, q.cap, 'type="number" min="1" step="1"'))}${button(ctx, `data-rest-quick-preview="${ctx.esc(id)}" ${attr}`, "Vedi prossimo dado", "Preview next die")}${quick ? `${issueHTML(ctx, quick.errors)}<p>${quick.nextDie ? `${ctx.t("Prossimo", "Next")}: ${ctx.esc(quick.nextDie)} · ${ctx.t("media", "mean")} ${quick.average}` : ctx.esc(stopText(ctx, quick.stopReason))}</p>${button(ctx, `data-rest-quick-run="${ctx.esc(id)}" ${attr}`, "Procedi con il limite scelto", "Proceed with chosen limit", !quick.nextDie ? stopText(ctx, quick.stopReason) : !quick.canApply ? ctx.t("Qualcosa impedisce di procedere: risolvi i punti segnalati qui sopra.", "Something blocks it: fix the points listed above.") : "")}` : ""}`)}${
    p.arcaneRecovery
      ? details(
          ctx,
          `arcane-${id}`,
          ctx.t("Recupero Arcano", "Arcane Recovery"),
          `<p>${ctx.t("Scelta distinta dai Dadi Vita. Usi spesi", "A separate choice from Hit Dice. Spent uses")}: ${valueText(ctx, p.arcaneRecovery.used)}.</p>${sourceHTML(ctx, p.arcaneRecovery.source)}${Object.entries(
            p.spellSlots,
          )
            .filter(([level, pool]) => Number(level) < 6 && pool.max > 0)
            .map(([level, pool]) =>
              field(
                ctx,
                `${ctx.t("Slot da recuperare · livello", "Slots to recover · level")} ${level} (${valueText(ctx, pool.used)} ${ctx.t("spesi", "spent")})`,
                input(
                  ctx,
                  `data-rest-arcane="${ctx.esc(id)}" data-slot-level="${ctx.esc(level)}"`,
                  panel.arcane[id]?.[level] || "",
                  'type="number" min="0" step="1"',
                ),
              ),
            )
            .join(
              "",
            )}${button(ctx, `data-rest-preview-arcane="${ctx.esc(id)}" ${attr}`, "Vedi Recupero Arcano", "Preview Arcane Recovery")}`,
        )
      : ""
  }`;
}
function reversedBreakdown(ctx, roll) {
  const raw = roll.acceptedFace + roll.modifier;
  return `${roll.acceptedFace} ${roll.modifier < 0 ? "−" : "+"} ${Math.abs(roll.modifier)} = ${raw} · ${ctx.t("cura minima 1", "minimum healing 1")}: ${Math.max(1, raw)} · ${ctx.t("risultato annullato, non applicato", "result reversed, not applied")}`;
}
function rollsHTML(ctx, rolls = rest.getRestRolls(ctx.state, ctx.role, { restId: panel.restId })) {
  return rolls.length
    ? `<section><h3>${ctx.t("Dadi Vita registrati", "Recorded Hit Dice")}</h3>${rolls
        .map((r) => {
          const p = historicalRollProfile(ctx, r.actorId),
            known = r.acceptedFace !== null && r.acceptedFace !== undefined;
          const result = r.result;
          return `<div class="rest-roll"><strong>${ctx.esc(name(ctx, p.actorName))} · ${ctx.esc(r.die)} · ${r.mode === "physical" ? ctx.t("fisico", "physical") : ctx.t("digitale", "digital")}</strong>${r.status === "pending" ? `<p>${known ? ctx.t("Risultato già noto: Undo non rilancia il dado.", "Result already known: Undo does not reroll the die.") : ctx.t("Dado già speso; cura in attesa della faccia naturale.", "Die already spent; healing awaits the natural face.")}</p>${known ? `<p>${ctx.t("Faccia", "Face")}: ${r.acceptedFace}</p>` : p.permissions.canControl ? field(ctx, `${ctx.t("Faccia naturale", "Natural face")} · 1–${r.sides}`, input(ctx, `data-rest-face="${ctx.esc(r.id)}"`, panel.faces[r.id] ?? "", `class="rest-pending-face" type="number" min="1" max="${r.sides}" step="1"`)) : ""}${p.permissions.canControl ? button(ctx, `data-rest-resolve="${ctx.esc(r.id)}"`, known ? "Riapplica il risultato noto" : "Registra faccia e cura", known ? "Reapply known result" : "Record face and healing") : ""}` : r.status === "reversed" ? `<p>${ctx.t("Spesa annullata; risultato conservato nella registrazione.", "Expenditure reversed; result retained in the record.")} ${known ? reversedBreakdown(ctx, r) : ""}</p>` : result ? `<p>${result.face} ${result.modifier < 0 ? "−" : "+"} ${Math.abs(result.modifier)} = ${result.rawTotal} · ${ctx.t("cura minima 1", "minimum healing 1")}: ${result.healing}</p><p>${ctx.t("PF applicati", "Applied HP")}: ${result.applied} · ${ctx.t("eccedenza", "overflow")}: ${result.overflow} · ${result.before} → ${result.after}</p>` : ""}<p>${sourceHTML(ctx, r.source)}</p></div>`;
        })
        .join("")}</section>`
    : "";
}
// Foundry Rest Recovery's summary: the HP regained with the Hit Dice of this benefit.
function hitDiceSummary(ctx, r, part, benefit) {
  let rolls = [];
  try {
    rolls = rest
      .getRestRolls(ctx.state, ctx.role, { restId: r.id })
      .filter(
        (roll) =>
          roll.actorId === part.actorId &&
          (!roll.benefitId || roll.benefitId === benefit.id) &&
          roll.status !== "reversed" &&
          roll.result,
      );
  } catch {
    return "";
  }
  if (!rolls.length) return "";
  const healed = rolls.reduce((sum, roll) => sum + (roll.result.applied ?? 0), 0);
  const from = rolls[0].result.before;
  const to = rolls.at(-1).result.after;
  return `<p class="rest-hd-summary" data-rest-hd-summary="${ctx.esc(part.actorId)}">${ctx.t("PF dai Dadi Vita", "HP from Hit Dice")}: +${healed} (${from} → ${to}) · ${rolls.length} ${rolls.length === 1 ? ctx.t("dado", "die") : ctx.t("dadi", "dice")}</p>`;
}
// PG-80 (Shard's «scelte da rifare dopo il riposo», BG3 prepared spells after a Long Rest):
// the choices the rules let this character change now that the Long Rest is over.
function afterLongHTML(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !canControlActor(actor, ctx.role, ctx.state)) return "";
  const parts = [];
  let win = null;
  try {
    win = preparationWindow(ctx.state, actorId);
  } catch {
    win = null;
  }
  if (win?.open && win.kind === "long-rest")
    parts.push(
      `<div class="rest-choice"><p>${ctx.esc(ctx.label(win.message))}</p><button type="button" class="button primary" data-rest-prepare="${ctx.esc(actorId)}">${ctx.esc(ctx.t("Cambia le magie preparate", "Change prepared spells"))}</button></div>`,
    );
  let pending = [];
  try {
    pending = pendingReselect(ctx.state, actorId);
  } catch {
    pending = [];
  }
  for (const row of pending) {
    if (row.external) {
      if (row.external === "forms" && ctx.openForms)
        parts.push(
          `<div class="rest-choice"><p>${ctx.esc(ctx.label(row.name))}</p><button type="button" class="button" data-rest-forms="${ctx.esc(actorId)}">${ctx.esc(ctx.t("Apri le forme", "Open forms"))}</button></div>`,
        );
      continue;
    }
    const chosen = panel.reselect[row.id] ?? row.chosen;
    parts.push(
      `<fieldset class="rest-choice" data-rest-reselect="${ctx.esc(row.id)}"><legend>${ctx.esc(ctx.label(row.name))} · ${ctx.esc(ctx.t(`puoi cambiare ${row.changeLimit === 1 ? "una scelta" : row.changeLimit + " scelte"} su ${row.count}`, `you can change ${row.changeLimit === 1 ? "one choice" : row.changeLimit + " choices"} of ${row.count}`))}</legend><div class="rest-choice-options">${row.options.map((o) => `<label class="rest-check">${input(ctx, `data-rest-reselect-option="${ctx.esc(row.id)}" data-actor="${ctx.esc(actorId)}"`, o.id, `type="checkbox"${chosen.includes(o.id) ? " checked" : ""}`)}${ctx.esc(ctx.label(o.name))}</label>`).join("")}</div><div class="rest-toolbar"><button type="button" class="button primary" data-rest-reselect-save="${ctx.esc(row.id)}" data-actor="${ctx.esc(actorId)}">${ctx.esc(ctx.t("Conferma le scelte", "Confirm the choices"))}</button><button type="button" class="button" data-rest-reselect-keep="${ctx.esc(row.id)}" data-actor="${ctx.esc(actorId)}">${ctx.esc(ctx.t("Mantieni come sono", "Keep them as they are"))}</button></div></fieldset>`,
    );
  }
  if (!parts.length) return "";
  return `<section class="rest-after-long" data-rest-after-long="${ctx.esc(actorId)}"><h4>${ctx.t("Dopo il riposo lungo", "After the Long Rest")} · ${ctx.esc(actor.name)}</h4>${parts.join("")}</section>`;
}
function participantHTML(ctx, r, part) {
  const id = part.actorId,
    control = part.permissions.canControl;
  let p;
  try {
    p = profile(ctx, id);
  } catch {
    return `<section class="rest-person"><h3>${ctx.esc(name(ctx, part.actorName))}</h3><p>${ctx.t("Registrazione storica. Le risorse attuali della scheda non sono disponibili in questo contesto.", "Historical record. The sheet's current resources are unavailable in this context.")}</p></section>`;
  }
  const status = {
    resting: ctx.t("In corso", "Resting"),
    interrupted: ctx.t("Interrotto", "Interrupted"),
    completed: ctx.t("Completato", "Completed"),
    cancelled: ctx.t("Terminato senza completamento", "Stopped without completion"),
  }[part.status];
  const cause = [
    ["exertion", ctx.t("Sforzo", "Exertion")],
    ["initiative", ctx.t("Ingresso in iniziativa", "Initiative")],
    ["damage", ctx.t("Danno ricevuto", "Damage")],
    ["leveled-spell", ctx.t("Incantesimo di livello 1+", "Level 1+ spell")],
  ];
  const c = r.campaignId ? clock(ctx) : null;
  const waiting =
    part.status === "resting" && r.campaignId && part.elapsedSeconds < part.requiredSeconds
      ? `<p class="rest-notice" data-rest-waiting="${ctx.esc(id)}">${
          c?.permissions?.canAdvance
            ? ctx.t(
                `Mancano ${duration(ctx, part.requiredSeconds - part.elapsedSeconds)}: «Completa per tutti» fa passare il tempo e applica i recuperi.`,
                `${duration(ctx, part.requiredSeconds - part.elapsedSeconds)} to go: “Complete for all” advances time and applies recovery.`,
              )
            : ctx.t(
                `In attesa che il DM faccia passare il tempo: mancano ${duration(ctx, part.requiredSeconds - part.elapsedSeconds)}. Il DM ha ricevuto la richiesta.`,
                `Waiting for the DM to advance time: ${duration(ctx, part.requiredSeconds - part.elapsedSeconds)} to go. The DM has been asked.`,
              )
        }</p>`
      : "";
  return `<section class="rest-person"><div class="rest-person-top"><h3>${ctx.esc(name(ctx, part.actorName))}</h3><span>${status}</span></div>${waiting}<p class="rest-progress">${duration(ctx, part.elapsedSeconds)} / ${duration(ctx, part.requiredSeconds)}${r.kind === "long" ? ` · ${part.tranceRequiredSeconds > 0 ? "Trance" : ctx.t("sonno", "sleep")}: ${part.tranceRequiredSeconds > 0 ? duration(ctx, part.tranceSeconds) + " / " + duration(ctx, part.tranceRequiredSeconds) : duration(ctx, part.sleepSeconds)}` : ""}</p><p>${ctx.t("PF", "HP")}: ${valueText(ctx, p.hp)} / ${valueText(ctx, p.maxHp)} · ${ctx.t("temporanei", "temporary")}: ${valueText(ctx, p.tempHp)}</p>${control && ["resting", "interrupted"].includes(part.status) ? `<div class="rest-toolbar">${part.status === "resting" ? button(ctx, `data-rest-complete="${ctx.esc(id)}"`, "Vedi completamento", "Preview completion") : button(ctx, `data-rest-resume="${ctx.esc(id)}"`, "Riprendi lungo", "Resume Long Rest")}${button(ctx, `data-rest-cancel="${ctx.esc(id)}"`, "Termina senza completare", "Stop without completing")}</div>${part.status === "resting" ? `${field(ctx, ctx.t("Attività da ora", "Activity from now"), select(ctx, `data-rest-activity="${ctx.esc(id)}"`, panel.activities[id] || part.activity, activities(ctx, id)))}${button(ctx, `data-rest-save-activity="${ctx.esc(id)}"`, "Applica attività", "Apply activity")}<p>${ctx.t("Applicare Sonno termina la concentrazione.", "Applying Sleep ends concentration.")}</p>${!r.campaignId ? `${field(ctx, ctx.t("Minuti effettivamente trascorsi", "Minutes actually elapsed"), input(ctx, `data-rest-elapsed="${ctx.esc(id)}"`, panel.elapsed[id] ?? "60", 'type="number" min="1" step="any"'))}${button(ctx, `data-rest-record-time="${ctx.esc(id)}"`, "Registra tempo personale", "Record personal time")}` : ""}${details(ctx, `interrupt-${id}`, ctx.t("Registra un’interruzione", "Record an interruption"), `<p>${ctx.t("Registra un evento già accaduto; nessun danno o incantesimo viene eseguito qui.", "Record an event that already happened; this does not execute damage or a spell.")}</p>${field(ctx, ctx.t("Causa", "Cause"), select(ctx, `data-rest-cause="${ctx.esc(id)}"`, panel.causes[id] || "exertion", cause))}${button(ctx, `data-rest-interrupt="${ctx.esc(id)}"`, "Registra interruzione", "Record interruption")}`)}` : ""}` : ""}${part.benefits.map((b) => `<div><h4>${b.kind === "short" ? ctx.t("Beneficio del breve", "Short Rest benefit") : ctx.t("Beneficio del lungo", "Long Rest benefit")}</h4>${b.applied ? `<p>${ctx.t("Recuperi applicati", "Recovery applied")}${b.closed ? ` · ${ctx.t("finestra conclusa", "window closed")}` : ""}</p>${rowsHTML(ctx, b.results)}${b.kind === "short" ? hitDiceSummary(ctx, r, part, b) : ""}` : control ? button(ctx, `data-rest-complete="${ctx.esc(id)}" data-benefit-id="${ctx.esc(b.id)}"`, "Vedi beneficio disponibile", "Preview available benefit") : ""}${control && b.applied && !b.closed && b.kind === "short" ? recoveryHTML(ctx, part, b, p) : ""}</div>`).join("")}${control ? button(ctx, `data-rest-correct="${ctx.esc(id)}"`, "Correggi un risultato con motivo", "Correct a result with a reason") : ""}</section>`;
}
function correctionPaths(p) {
  // Exhaustion and 0 HP are corrected from Conditions and status, with their events.
  return [
    "hp",
    "tempHp",
    ...Object.keys(p.hitDice).map((d) => `hitDice.${d}.used`),
    ...Object.keys(p.spellSlots).map((d) => `spellSlots.${d}.used`),
    ...(p.pactSlots ? ["pactSlots.used"] : []),
  ];
}
function correctionHTML(ctx) {
  const c = panel.correction;
  if (!c) return "";
  return `<section class="rest-fields"><h3>${ctx.t("Correzione esplicita", "Explicit correction")}</h3>${field(
    ctx,
    ctx.t("Dato", "Value"),
    select(
      ctx,
      "data-rest-correction-path",
      c.path,
      correctionPaths(profile(ctx, c.actorId)).map((path) => [
        path,
        pathLabel(ctx, path, c.actorId),
      ]),
    ),
  )}${field(ctx, ctx.t("Nuovo valore", "New value"), input(ctx, "data-rest-correction-value", c.value, 'type="number" min="0" step="1"'))}${field(ctx, ctx.t("Motivo obbligatorio", "Required reason"), `<textarea data-rest-correction-reason>${ctx.esc(c.reason)}</textarea>`)}${button(ctx, "data-rest-preview-correction", "Vedi correzione", "Preview correction")}</section>`;
}
function historyHTML(ctx) {
  const filter = panel.actorIds.length === 1 ? { actorId: panel.actorIds[0] } : {};
  const list = rest.listRests(ctx.state, ctx.role, filter);
  const restIds = new Set(list.map((r) => r.id));
  const reversed = rest
    .getRestRolls(ctx.state, ctx.role, filter)
    .filter((r) => r.status === "reversed" && !restIds.has(r.restId));
  const evidence = rollsHTML(ctx, reversed);
  if (!list.length) return evidence;
  return (
    evidence +
    details(
      ctx,
      "history",
      ctx.t("Riposi registrati", "Recorded rests"),
      list
        .slice()
        .reverse()
        .map((r) =>
          button(
            ctx,
            `data-rest-open="${ctx.esc(r.id)}"`,
            `${r.cause === "knockout" ? "Breve dopo knockout" : r.kind === "short" ? "Breve" : "Lungo"} · ${r.participants.map((p) => name(ctx, p.actorName)).join(", ")}`,
            `${r.cause === "knockout" ? "Short after knockout" : r.kind === "short" ? "Short" : "Long"} · ${r.participants.map((p) => name(ctx, p.actorName)).join(", ")}`,
          ),
        )
        .join(" "),
    )
  );
}
// dnd5e group rest / Rest Recovery: the DM finishes the rest for every participant in one
// step: the missing game time passes, then each completion applies (its own recovery rows).
function completeAllTargets(ctx, r) {
  return r.participants.filter((p) => p.status === "resting" && p.permissions?.canControl);
}
function completeAllHTML(ctx, r) {
  const targets = completeAllTargets(ctx, r);
  if (!targets.length) return "";
  const c = r.campaignId ? clock(ctx) : null;
  if (r.campaignId && !c?.permissions?.canAdvance) return "";
  if (!r.campaignId) return "";
  const missing = Math.max(0, ...targets.map((p) => p.requiredSeconds - p.elapsedSeconds));
  return `<div class="rest-complete-all" data-rest-complete-all-box><p>${ctx.esc(
    ctx.t(
      `${r.kind === "short" ? "Riposo breve" : "Riposo lungo"} di ${targets.map((p) => name(ctx, p.actorName)).join(", ")}${missing ? `: fa passare ${duration(ctx, missing)} e applica i recuperi di tutti.` : ": applica i recuperi di tutti."}`,
      `${r.kind === "short" ? "Short Rest" : "Long Rest"} of ${targets.map((p) => name(ctx, p.actorName)).join(", ")}${missing ? `: advances ${duration(ctx, missing)} and applies everyone's recovery.` : ": applies everyone's recovery."}`,
    ),
  )}</p><button type="button" class="button primary" data-rest-complete-all>${ctx.esc(ctx.t("Completa per tutti", "Complete for all"))}</button></div>`;
}
function completeAll(ctx) {
  const r = rest.getRest(ctx.state, panel.restId, ctx.role);
  const targets = completeAllTargets(ctx, r);
  if (!targets.length) return;
  const missing = Math.max(0, ...targets.map((p) => p.requiredSeconds - p.elapsedSeconds));
  commit(
    ctx,
    r.kind === "short"
      ? ctx.t("Riposo breve completato per tutti", "Short Rest completed for all")
      : ctx.t("Riposo lungo completato per tutti", "Long Rest completed for all"),
    (state) => {
      if (missing > 0)
        rest.advanceGameTime(
          state,
          { id: uid(), campaignId: r.campaignId, seconds: missing },
          ctx.role,
          { online: !ctx.offline },
        );
      return rest.completeRest(
        state,
        r.id,
        { id: uid(), actorIds: targets.map((p) => p.actorId) },
        ctx.role,
        { online: !ctx.offline },
      );
    },
    { local: false, visibility: "shared" },
  );
  panel.review = null;
  redraw(ctx);
}
// D&D Beyond's Short Rest on a personal sheet: one command rests one hour (personal time,
// no DM clock) and completes; the Hit Dice are then spent one at a time.
function quickShort(ctx) {
  const ids = [...panel.actorIds];
  const input = {
    id: uid(),
    kind: "short",
    actorIds: ids,
    campaignId: null,
    activityByActor: Object.fromEntries(ids.map((id) => [id, "light"])),
  };
  const preview = rest.previewRest(ctx.state, input, ctx.role);
  if (!preview.canApply) throw Error(message(ctx, preview.errors[0]));
  const started = commit(
    ctx,
    ctx.t("Riposo breve di 1 ora", "One-hour Short Rest"),
    (state) => {
      const r = rest.startRest(state, input, ctx.role, opts(ctx));
      for (const actorId of ids)
        rest.recordPersonalRestTime(
          state,
          r.id,
          { id: uid(), actorId, seconds: 3600 },
          ctx.role,
          opts(ctx),
        );
      rest.completeRest(state, r.id, { id: uid(), actorIds: ids }, ctx.role, opts(ctx));
      return r;
    },
    preview.commit,
  );
  panel.restId = started.id;
  panel.stage = "detail";
  panel.review = null;
  redraw(ctx);
}
export function renderRestPanel(ctx) {
  if (!panel || panel.owner !== ctx.role) return "";
  if (panel.type === "unavailable")
    return `<p>${ctx.t("Riposo non disponibile per questa scheda.", "Rest is unavailable for this sheet.")}</p>${historyHTML(ctx)}`;
  let content;
  try {
    content =
      panel.type === "time"
        ? timeHTML(ctx)
        : panel.stage === "setup"
          ? setupHTML(ctx)
          : (() => {
              const r = rest.getRest(ctx.state, panel.restId, ctx.role);
              // PG-80: the choices to review after a Long Rest come first, like a post-rest
              // prompt (Shard, BG3), above each participant's recovery rows.
              const afterLong = r.participants
                .filter((part) => part.benefits.some((b) => b.kind === "long" && b.applied))
                .map((part) => afterLongHTML(ctx, part.actorId))
                .join("");
              return `${completeAllHTML(ctx, r)}${afterLong}${rollsHTML(ctx)}<div class="rest-layout"><div>${r.participants.map((p) => participantHTML(ctx, r, p)).join("")}${correctionHTML(ctx)}</div>${previewHTML(ctx)}</div>`;
            })();
  } catch (error) {
    content = `<p role="status">${ctx.esc(message(ctx, error))}</p>`;
  }
  return `<div class="rest-toolbar">${button(ctx, "data-rest-new", "Nuovo riposo", "New rest")}${clock(ctx) ? button(ctx, `data-rest-time aria-pressed="${panel.type === "time"}"`, "Tempo narrativo", "Game time") : ""}${button(ctx, "data-rest-undo", "Annulla ultima modifica", "Undo last change", ctx.canUndo?.() ? "" : ctx.t("Nessuna tua modifica da annullare qui.", "No change of yours to undo here."))}</div>${ctx.offline ? `<p class="rest-notice">${ctx.t("Sei senza rete: puoi aggiornare i riposi delle schede personali. Riconnettiti per modificare il gioco condiviso.", "You are offline: personal-sheet rests can be updated. Reconnect to change shared gameplay.")}</p>` : ""}${panel.error ? `<p class="rest-notice" role="alert">${ctx.esc(panel.error)}</p>` : ""}${content}${historyHTML(ctx)}<p class="rest-notice">${ctx.t("Chiudere o premere Esc lascia in attesa riposi e tiri già registrati. Nessun tempo scorre automaticamente.", "Closing or pressing Esc leaves recorded rests and rolls pending. Time never advances automatically.")}</p>`;
}
function beginDie(ctx, actorId, benefitId, die) {
  const mode = panel.modes[actorId] || "digital";
  return commit(
    ctx,
    ctx.t("Dado Vita registrato", "Hit Die recorded"),
    (state) => {
      const request = rest.beginHitDie(
        state,
        panel.restId,
        { id: uid(), actorId, benefitId, die, mode },
        ctx.role,
        opts(ctx),
      );
      if (mode === "digital")
        rest.resolveHitDie(
          state,
          request.id,
          { face: (ctx.rollDie || rollDie)(request.sides) },
          ctx.role,
          opts(ctx),
        );
      return request;
    },
    rest.getRest(ctx.state, panel.restId, ctx.role).commit,
  );
}
export function bindRestPanel(root, ctx) {
  if (!panel || panel.owner !== ctx.role || !root) return;
  const on = (attr, type, handler) =>
    root.querySelectorAll(`[${attr}]`).forEach((node) =>
      node.addEventListener(type, (event) => {
        if (panel?.owner !== ctx.role) return;
        if (type === "click") event.preventDefault();
        safe(ctx, () => handler(node, event));
      }),
    );
  const dirty = () => {
    invalidate();
    for (const attr of ["data-rest-start", "data-rest-apply"])
      root.querySelectorAll(`[${attr}]`).forEach((node) => {
        markStale(ctx, node, "rest-why-stale");
      });
  };
  on("data-rest-details", "toggle", (n) => {
    panel.details[n.dataset.restDetails] = n.open;
  });
  on("data-rest-kind", "change", (n) => {
    panel.kind = n.value;
    panel.activities = {};
    invalidate();
    redraw(ctx);
  });
  on("data-rest-context", "change", (n) => {
    panel.campaignId = n.value || null;
    panel.actorIds = [];
    invalidate();
    redraw(ctx);
  });
  on("data-rest-participant", "change", (n) => {
    panel.actorIds = panel.actorIds.filter((id) => id !== n.dataset.restParticipant);
    if (n.checked) panel.actorIds.push(n.dataset.restParticipant);
    invalidate();
    redraw(ctx);
  });
  on("data-rest-start-activity", "change", (n) => {
    panel.activities[n.dataset.restStartActivity] = n.value;
    invalidate();
    redraw(ctx);
  });
  on("data-rest-last-long", "input", (n) => {
    panel.lastLongHours = n.value;
    dirty();
  });
  on("data-rest-preview-start", "click", () => {
    panel.startId ??= uid();
    review(ctx, "start", {
      id: panel.startId,
      kind: panel.kind,
      actorIds: panel.actorIds,
      campaignId: panel.campaignId,
      activityByActor: Object.fromEntries(panel.actorIds.map((id) => [id, activityOf(ctx, id)])),
      ...(panel.kind === "long" && num(panel.lastLongHours) !== null
        ? { elapsedSinceLastLongSeconds: num(panel.lastLongHours) * 3600 }
        : {}),
    });
  });
  on("data-rest-start", "click", () => applyReview(ctx));
  on("data-rest-quick-short", "click", () => quickShort(ctx));
  on("data-rest-complete-all", "click", () => completeAll(ctx));
  on("data-rest-all-party", "click", () => {
    const ids = availableProfiles(ctx).map((p) => p.actorId);
    const all = ids.every((id) => panel.actorIds.includes(id));
    panel.actorIds = all ? [] : ids;
    invalidate();
    redraw(ctx);
  });
  on("data-rest-prepare", "click", (n) => {
    ctx.closeDialog?.();
    openPreparedSpells(ctx, n.dataset.restPrepare);
  });
  on("data-rest-forms", "click", (n) => {
    ctx.closeDialog?.();
    ctx.openForms?.(n.dataset.restForms, "forms");
  });
  on("data-rest-reselect-option", "change", (n) => {
    const id = n.dataset.restReselectOption;
    const row = pendingReselect(ctx.state, n.dataset.actor).find((r) => r.id === id);
    const current = new Set(panel.reselect[id] ?? row?.chosen ?? []);
    if (n.checked) current.add(n.value);
    else current.delete(n.value);
    panel.reselect[id] = [...current];
  });
  const reselect = (n, keep) => {
    const id = keep ? n.dataset.restReselectKeep : n.dataset.restReselectSave;
    const actorId = n.dataset.actor;
    commit(
      ctx,
      ctx.t("Scelte dopo il riposo", "Choices after the rest"),
      (state) =>
        resolveReselect(
          state,
          actorId,
          id,
          keep ? { keep: true } : { chosen: panel.reselect[id] ?? [] },
          ctx.role,
        ),
      ctx.state.actors[actorId]?.visibility === "private"
        ? { local: true, visibility: "private" }
        : {},
    );
    delete panel.reselect[id];
    redraw(ctx);
  };
  on("data-rest-reselect-save", "click", (n) => reselect(n, false));
  on("data-rest-reselect-keep", "click", (n) => reselect(n, true));
  on("data-rest-apply", "click", () => applyReview(ctx));
  on("data-rest-clear-preview", "click", () => {
    panel.review = null;
    redraw(ctx);
  });
  on("data-rest-new", "click", () => {
    const ids = panel.actorIds,
      campaignId = panel.campaignId;
    panel = { ...base(ctx), actorIds: ids, campaignId };
    redraw(ctx);
  });
  on("data-rest-time", "click", () => {
    panel.type = "time";
    panel.review = null;
    redraw(ctx);
  });
  on("data-rest-undo", "click", () => {
    panel.review = null;
    ctx.undo();
    redraw(ctx);
  });
  on("data-rest-open", "click", (n) => {
    const r = rest.getRest(ctx.state, n.dataset.restOpen, ctx.role);
    panel.restId = r.id;
    panel.campaignId = r.campaignId;
    panel.type = "rest";
    panel.stage = "detail";
    panel.review = null;
    panel.correction = null;
    redraw(ctx);
  });
  on("data-rest-time-value", "input", (n) => {
    panel.timeValue = n.value;
    dirty();
  });
  on("data-rest-time-unit", "change", (n) => {
    panel.timeUnit = n.value;
    invalidate();
    redraw(ctx);
  });
  on("data-rest-preview-time", "click", () =>
    review(ctx, "time", {
      campaignId: ctx.state.campaign.id,
      seconds: num(panel.timeValue) === null ? null : num(panel.timeValue) * Number(panel.timeUnit),
    }),
  );
  on("data-rest-complete", "click", (n) =>
    review(ctx, "complete", {
      actorIds: [n.dataset.restComplete],
      ...(n.dataset.benefitId ? { benefitId: n.dataset.benefitId } : {}),
    }),
  );
  const actorCommand = (attr, command, payload) =>
    on(attr, "click", (n) => {
      const actorId = n.dataset[attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
      commit(
        ctx,
        ctx.t("Riposo aggiornato", "Rest updated"),
        (state) => command(state, panel.restId, payload(actorId, n), ctx.role, opts(ctx)),
        rest.getRest(ctx.state, panel.restId, ctx.role).commit,
      );
      panel.review = null;
      redraw(ctx);
    });
  actorCommand("data-rest-resume", rest.resumeRest, (actorId) => ({ actorIds: [actorId] }));
  actorCommand("data-rest-cancel", rest.cancelRest, (actorId) => ({
    actorIds: [actorId],
    reason: ctx.t(
      "Terminato esplicitamente senza completamento",
      "Explicitly stopped without completion",
    ),
  }));
  actorCommand("data-rest-save-activity", rest.setRestActivity, (actorId) => ({
    actorId,
    activity:
      panel.activities[actorId] ||
      rest
        .getRest(ctx.state, panel.restId, ctx.role)
        .participants.find((p) => p.actorId === actorId).activity,
  }));
  actorCommand("data-rest-record-time", rest.recordPersonalRestTime, (actorId) => ({
    id: uid(),
    actorId,
    seconds:
      num(panel.elapsed[actorId] ?? "60") === null
        ? null
        : num(panel.elapsed[actorId] ?? "60") * 60,
  }));
  actorCommand("data-rest-interrupt", rest.interruptRest, (actorId) => ({
    eventId: uid(),
    actorIds: [actorId],
    cause: panel.causes[actorId] || "exertion",
  }));
  actorCommand("data-rest-finish", rest.finishRestRecovery, (actorId, n) => ({
    actorId,
    benefitId: n.dataset.benefitId,
  }));
  for (const [attr, bucket, event] of [
    ["data-rest-activity", "activities", "change"],
    ["data-rest-elapsed", "elapsed", "input"],
    ["data-rest-cause", "causes", "change"],
    ["data-rest-dice-mode", "modes", "change"],
    ["data-rest-die", "dice", "change"],
    ["data-rest-face", "faces", "input"],
  ])
    on(attr, event, (n) => {
      const key = n.dataset[attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
      panel[bucket][key] = n.value;
    });
  on("data-rest-hit-die", "click", (n) => {
    beginDie(ctx, n.dataset.restHitDie, n.dataset.benefitId, panel.dice[n.dataset.restHitDie]);
    redraw(ctx);
  });
  on("data-rest-resolve", "click", (n) => {
    const id = n.dataset.restResolve,
      r = rest.getRestRolls(ctx.state, ctx.role, { restId: panel.restId }).find((r) => r.id === id);
    if (!r) throw Error(ctx.t("Tiro non disponibile.", "Roll unavailable."));
    commit(
      ctx,
      ctx.t("Dado Vita registrato", "Hit Die recorded"),
      (state) =>
        rest.resolveHitDie(
          state,
          id,
          r.acceptedFace != null ? {} : { face: num(panel.faces[id]) },
          ctx.role,
          opts(ctx),
        ),
      rest.getRest(ctx.state, panel.restId, ctx.role).commit,
    );
    delete panel.faces[id];
    redraw(ctx);
  });
  for (const [attr, key] of [
    ["data-rest-quick-order", "order"],
    ["data-rest-quick-cap", "cap"],
  ])
    on(attr, "input", (n) => {
      const id = n.dataset[attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
      panel.quick[id][key] = n.value;
      panel.quick[id].reviewed = false;
      root.querySelectorAll(`[data-rest-quick-run="${id}"]`).forEach((button) => {
        markStale(ctx, button, whyId(`stale-${id}`));
      });
    });
  on("data-rest-quick-preview", "click", (n) => {
    panel.quick[n.dataset.restQuickPreview].reviewed = true;
    redraw(ctx);
  });
  on("data-rest-quick-run", "click", (n) => {
    const id = n.dataset.restQuickRun;
    if (!panel.quick[id].reviewed) return;
    const args = quickInput(id, n.dataset.benefitId);
    for (let i = 0; i < args.maxDice; i++) {
      const p = rest.previewQuickRecovery(ctx.state, panel.restId, args, ctx.role);
      if (!p.canApply || !p.nextDie) break;
      beginDie(ctx, id, n.dataset.benefitId, p.nextDie);
      if (panel.modes[id] === "physical") break;
    }
    redraw(ctx);
  });
  on("data-rest-arcane", "input", (n) => {
    (panel.arcane[n.dataset.restArcane] ??= {})[n.dataset.slotLevel] = n.value;
    dirty();
  });
  on("data-rest-preview-arcane", "click", (n) =>
    review(ctx, "arcane", {
      actorId: n.dataset.restPreviewArcane,
      benefitId: n.dataset.benefitId,
      slots: Object.fromEntries(
        Object.entries(panel.arcane[n.dataset.restPreviewArcane] || {})
          .filter(([, value]) => num(value) !== null && num(value) !== 0)
          .map(([level, value]) => [level, num(value)]),
      ),
    }),
  );
  on("data-rest-correct", "click", (n) => {
    panel.correction = { actorId: n.dataset.restCorrect, path: "hp", value: "", reason: "" };
    panel.review = null;
    redraw(ctx);
  });
  for (const [attr, key, event] of [
    ["data-rest-correction-path", "path", "change"],
    ["data-rest-correction-value", "value", "input"],
    ["data-rest-correction-reason", "reason", "input"],
  ])
    on(attr, event, (n) => {
      panel.correction[key] = n.value;
      dirty();
    });
  on("data-rest-preview-correction", "click", () => {
    const c = panel.correction;
    if (!correctionPaths(profile(ctx, c.actorId)).includes(c.path)) return;
    const bits = c.path.split("."),
      patch = {};
    let at = patch;
    for (const bit of bits.slice(0, -1)) at = at[bit] = {};
    at[bits.at(-1)] = num(c.value);
    review(ctx, "correction", {
      restId: panel.restId,
      actorId: c.actorId,
      reason: c.reason,
      patch,
    });
  });
}
function show(ctx) {
  ctx.dialog(
    ctx.t("Riposi e tempo", "Rests and time"),
    `<div class="rest-panel" data-rest-panel>${renderRestPanel(ctx)}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close"), onSubmit: () => false },
  );
  if (typeof document !== "undefined")
    bindRestPanel(document.querySelector("#dialog [data-rest-panel]"), ctx);
}
export function openRest(ctx, { actorId, restId } = {}) {
  panel = base(ctx);
  if (actorId) {
    panel.actorIds = [actorId];
    try {
      const p = profile(ctx, actorId);
      if (!p.permissions.canControl) {
        panel.type = "unavailable";
        show(ctx);
        return;
      }
      panel.campaignId = personal(ctx, actorId) ? null : ctx.state.campaign.id;
    } catch {
      panel.type = "unavailable";
      show(ctx);
      return;
    }
  }
  let current = null;
  try {
    current = restId
      ? rest.getRest(ctx.state, restId, ctx.role)
      : actorId
        ? rest.listRests(ctx.state, ctx.role, { actorId }).at(-1)
        : // The Table's «Riposi»: the rest still under way, else the whole party preselected.
          (runningRests(ctx).at(-1) ?? null);
  } catch {
    current = null;
  }
  if (current) {
    panel.restId = current.id;
    panel.campaignId = current.campaignId;
    panel.stage = "detail";
  } else if (!actorId) {
    panel.campaignId = clock(ctx) ? ctx.state.campaign.id : null;
    panel.actorIds = availableProfiles(ctx).map((p) => p.actorId);
  }
  show(ctx);
}
// The bell (dnd5e rest request): the DM sees rests waiting for game time; a player sees the
// Hit Dice step after a Short Rest and the choices to review after a Long Rest.
export function restNotifications(ctx) {
  let list = [];
  try {
    list = rest.listRests(ctx.state, ctx.role).filter((r) => r.campaignId);
  } catch {
    return [];
  }
  const out = [];
  const target = (r) => ({ page: "table", params: { tab: "rest:" + r.id } });
  const kind = (r, lang) =>
    r.kind === "short"
      ? lang === "it"
        ? "Riposo breve"
        : "Short Rest"
      : lang === "it"
        ? "Riposo lungo"
        : "Long Rest";
  let canAdvance = false;
  try {
    canAdvance = rest.getGameTime(ctx.state, ctx.state.campaign.id, ctx.role).permissions
      .canAdvance;
  } catch {
    canAdvance = false;
  }
  for (const r of list) {
    const waiting = r.participants.filter(
      (p) => p.status === "resting" && p.elapsedSeconds < p.requiredSeconds,
    );
    if (canAdvance && waiting.length) {
      const who = waiting.map((p) => name(ctx, p.actorName)).join(", ");
      out.push({
        id: `rest-wait-${r.id}-${r.revision}`,
        title: {
          it: `${kind(r, "it")} in attesa del tempo: ${who}`,
          en: `${kind(r, "en")} waiting for game time: ${who}`,
        },
        body: { it: "Completa per tutti", en: "Complete for all" },
        target: target(r),
      });
    }
    if (ctx.role === "dm") continue;
    for (const p of r.participants) {
      const actor = ctx.state.actors[p.actorId];
      if (!actor || !canControlActor(actor, ctx.role, ctx.state)) continue;
      const open = p.benefits.find((b) => b.kind === "short" && b.applied && !b.closed);
      const dice = Object.values(actor.hitDice ?? {}).some(
        (pool) => Number.isInteger(pool.used) && pool.used < pool.max,
      );
      if (open && dice && Number.isInteger(actor.hp) && actor.hp < actor.maxHp)
        out.push({
          id: `rest-hd-${open.id}`,
          title: {
            it: `${kind(r, "it")} concluso: ${actor.name} può spendere i Dadi Vita`,
            en: `${kind(r, "en")} finished: ${actor.name} can spend Hit Dice`,
          },
          target: target(r),
        });
      const long = p.benefits.find((b) => b.kind === "long" && b.applied);
      if (!long) continue;
      let choices = false;
      try {
        const win = preparationWindow(ctx.state, p.actorId);
        choices =
          (win?.open && win.kind === "long-rest") ||
          pendingReselect(ctx.state, p.actorId).some((row) => !row.external);
      } catch {
        choices = false;
      }
      if (choices)
        out.push({
          id: `rest-long-${long.id}`,
          title: {
            it: `Riposo lungo concluso: ${actor.name} può cambiare le sue scelte`,
            en: `Long Rest finished: ${actor.name} can change their choices`,
          },
          target: target(r),
        });
    }
  }
  return out;
}
export function openGameTime(ctx) {
  panel = base(ctx, "time");
  show(ctx);
}
export function refreshRestUI(ctx) {
  if (!panel || panel.owner !== ctx.role || typeof document === "undefined") return false;
  const root = document.querySelector("#dialog[open] [data-rest-panel]");
  if (!root) return false;
  root.querySelectorAll("[data-rest-details]").forEach((node) => {
    panel.details[node.dataset.restDetails] = node.open;
  });
  const active = document.activeElement,
    focused = root.contains(active),
    attrs = focused
      ? [...active.attributes]
          .filter((a) => a.name.startsWith("data-"))
          .map((a) => [a.name, a.value])
      : [];
  const selection =
    focused && typeof active.selectionStart === "number"
      ? [active.selectionStart, active.selectionEnd]
      : null;
  const dialog = root.closest("dialog"),
    body = root.closest(".dialog-body"),
    scroll = dialog?.scrollTop,
    bodyScroll = body?.scrollTop;
  root.innerHTML = renderRestPanel(ctx);
  bindRestPanel(root, ctx);
  if (attrs.length) {
    const first = attrs[0][0];
    const next = [...root.querySelectorAll(`[${first}]`)].find((node) =>
      attrs.every(([key, value]) => node.getAttribute(key) === value),
    );
    next?.focus({ preventScroll: true });
    if (selection && next?.setSelectionRange) next.setSelectionRange(...selection);
  }
  if (dialog) dialog.scrollTop = scroll;
  if (body) body.scrollTop = bodyScroll;
  return true;
}
export function resetRestUI() {
  panel = null;
}
