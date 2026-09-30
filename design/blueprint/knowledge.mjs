// B46 — Knowledge, examination, stealth and cover: the area's entry module (registry) and UI.
//
// Where it lives (B61 Table structure, registry plan §5): «Esamina», identity, «Nasconditi»,
// «Cerca» and «Borseggia» in the token menu (B12); the block «Conoscenza e furtività» in the
// Creature tab (inspector) of the right sidebar; «Linea di vista» in the Measure group of the
// left toolbar; sight areas, cover shields, Peekaboo lines and the modifiers under the target
// on map layers; cover and hit chance in the attack detail through the combat provider;
// pickpocket requests in the bell (B24); the disclosure policy in the campaign settings
// (Preferences, DM). No new sidebar tab, no header button.
// Patterns, rules and sources: knowledge-domain.mjs and cover.mjs (census IDs in headers).

import * as D from "./knowledge-domain.mjs";
import * as C from "./cover.mjs";
import { rollDie } from "./state.mjs";
import { addAttackModifierProvider } from "./combat.mjs";
import { hasCombatPreview, previewRollMode } from "./combat-ui.mjs";
import { setMenuReason } from "./token-menu.mjs";
import { CREATURES } from "./srd-sample.mjs";
import { model as fogModel } from "./fog-vision.mjs";
import * as TD from "./travel-domain.mjs";

// B62 — one Search action: B41's traps join it when the regions domain is present (optional
// neighbour, loaded like the W2b1 integration's: null when absent). B45's search points use
// travel-domain, which this area's domain already depends on.
let traps = null;
export const neighboursReady = import("./regions-domain.mjs").then(
  (module) => (traps = module),
  () => null,
);

const L = (it, en) => ({ it, en });
let area = null;
// View state only (never game data): toggles, the private line-of-sight check, pointer
// gestures, the last dice mode and the attack preview rows the combat provider produced.
const ui = {
  showSight: false,
  shiftSight: false,
  los: null,
  gesture: null,
  drag: null,
  diceMode: "digital",
  acting: {},
  previewRows: new Map(),
  liveEl: null,
  sightEl: null,
  table: null,
};
export function resetKnowledgeView() {
  Object.assign(ui, {
    showSight: false,
    shiftSight: false,
    los: null,
    gesture: null,
    drag: null,
    acting: {},
    liveEl: null,
    sightEl: null,
    table: null,
  });
  ui.previewRows.clear();
}

// ------------------------------------------------------------------ small helpers
const sliceOf = (state) => D.sliceOf(state);
const esc = (ctx, value) => ctx.esc(String(value ?? ""));
const say = (ctx, value) =>
  value && typeof value === "object" ? ctx.label(value) : String(value ?? "");
const nameOf = (ctx, id) => ctx.state.actors?.[id]?.name ?? "—";
const controls = (ctx, id) =>
  Boolean(ctx.state.actors?.[id]) && ctx.canControl(ctx.state.actors[id]);
const sceneOf = (ctx) => D.activeScene(ctx.state);
const localized = (ctx, error) =>
  error?.[ctx.lang] || error?.it || error?.message || String(error ?? "");
const button = (attrs, text, cls = "") =>
  `<button type="button" class="button${cls ? " " + cls : ""}" ${attrs}>${text}</button>`;
const signed = (n) => `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;
function sourceText(ctx, source) {
  if (!source) return "";
  if (source.kind === "srd") {
    const en = source.en?.pages ?? source.pages ?? [];
    const it = source.it?.pages ?? [];
    return `SRD ${source.revision} · EN ${en.join(", ")} / IT ${it.join(", ")}`;
  }
  return `${ctx.t("Regola dell'app", "App rule")} · ${say(ctx, source.title) || source.revision}`;
}
function sourceLink(ctx, source) {
  if (!source) return "";
  const loc = source.kind === "srd" ? (source[ctx.lang] ?? source.en) : null;
  const text = esc(ctx, sourceText(ctx, source));
  return loc?.url
    ? `<a class="knowledge-source" href="${esc(ctx, loc.url)}" target="_blank" rel="noopener noreferrer">${text}</a>`
    : `<span class="knowledge-source">${text}</span>`;
}
/** The creature the viewer acts with: the selected one when controlled, else the last one. */
function actingId(ctx, scene, selected) {
  if (selected && controls(ctx, selected) && D.tokenOf(scene, selected)) {
    ui.acting[ctx.role] = selected;
    return selected;
  }
  const last = ui.acting[ctx.role];
  if (last && controls(ctx, last) && D.tokenOf(scene, last)) return last;
  return (
    (scene?.tokens ?? [])
      .map((token) => token.actorId)
      .find((id) => controls(ctx, id) && ctx.state.actors[id]?.kind === "character") ?? null
  );
}
const controlledOnScene = (ctx, scene, filter = () => true) =>
  (scene?.tokens ?? [])
    .map((token) => token.actorId)
    .filter((id) => controls(ctx, id) && filter(ctx.state.actors[id]));

// ------------------------------------------------------------------ commits and rolls
let submitting = false;
/**
 * One area command: a commit on the knowledge slices (actors and conditions in the same
 * draft when the domain changes them). Accepted rolls join the commit's log entry and are
 * announced with "roll-accepted", like the other areas that keep their own dice.
 */
function act(ctx, label, fn, options = {}) {
  let result,
    rolls = [];
  try {
    ctx.commit(
      label,
      (draft) => {
        result = fn(draft, area.slice(draft), area.slice(draft, D.ROLLS));
        rolls = [result?.roll].filter(Boolean);
      },
      {
        ...options,
        afterCommit: (state) => {
          const entry = state.log?.at(-1);
          if (!entry || !rolls.length) return;
          entry.rolls = [...(entry.rolls ?? []), ...rolls.map((roll) => D.logRoll(state, roll))];
        },
      },
    );
  } catch (error) {
    if (submitting) {
      const it = error?.it || error?.message || String(error ?? "");
      throw Object.assign(new Error(localized(ctx, error)), { it, en: error?.en || it });
    }
    ctx.toast(localized(ctx, error), true);
    return null;
  }
  const logId = ctx.state.log?.at(-1)?.id ?? null;
  for (const roll of rolls)
    area?.emit?.("roll-accepted", { logId, roll: D.logRoll(ctx.state, roll) });
  return result ?? true;
}
function openDialog(ctx, title, body, options = {}) {
  const onSubmit = options.onSubmit;
  ctx.dialog(title, body, {
    ...options,
    ...(onSubmit
      ? {
          onSubmit: (...args) => {
            submitting = true;
            try {
              return onSubmit(...args);
            } finally {
              submitting = false;
            }
          },
        }
      : {}),
  });
}
const rng = (ctx) => (sides) => (ctx.rollDie || rollDie)(sides);
/** Dice fields of the app's roll dialog: digital or physical, faces typed as rolled. */
function diceFields(ctx, count, sides = 20) {
  const faces = Array.from(
    { length: count },
    (_, i) =>
      `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${sides}<input type="number" name="face${i}" min="1" max="${sides}" step="1" inputmode="numeric"></label>`,
  ).join("");
  return `<label class="field">${ctx.t("Dadi", "Dice")}<select name="diceMode" data-knowledge-dice><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical"${ui.diceMode === "physical" ? " selected" : ""}>${ctx.t("Fisici", "Physical")}</option></select></label><div class="knowledge-physical" data-knowledge-physical${ui.diceMode === "physical" ? "" : " hidden"}>${faces}</div><p class="muted">${ctx.t("Inserisci le facce naturali: il modificatore si aggiunge una volta. Esc chiude senza tirare.", "Enter the natural faces: the modifier is added once. Escape closes without rolling.")}</p>`;
}
function bindDice() {
  if (typeof document === "undefined") return;
  const select = document.querySelector("#dialog [data-knowledge-dice]");
  const physical = document.querySelector("#dialog [data-knowledge-physical]");
  if (!select || !physical) return;
  const sync = () => {
    physical.hidden = select.value !== "physical";
    physical.querySelectorAll("input").forEach((input) => (input.required = !physical.hidden));
  };
  select.addEventListener("change", () => {
    sync();
    if (!physical.hidden) physical.querySelector("input")?.focus();
  });
  sync();
}
function readDice(data, count) {
  const mode = data.get("diceMode") === "physical" ? "physical" : "digital";
  ui.diceMode = mode;
  return {
    mode,
    faces:
      mode === "physical"
        ? Array.from({ length: count }, (_, i) => Number(data.get(`face${i}`)))
        : null,
  };
}
const modeText = (ctx, mode) =>
  mode === "advantage"
    ? ` · ${ctx.t("vantaggio", "advantage")}`
    : mode === "disadvantage"
      ? ` · ${ctx.t("svantaggio", "disadvantage")}`
      : "";

// ------------------------------------------------------------------ examine (BG3 window)
function tierHTML(ctx, section, dm) {
  const rows = section.rows
    .map((row) =>
      row.list
        ? `<div class="knowledge-row"><dt>${esc(ctx, say(ctx, row.label))}</dt><dd>${row.list.length ? `<ul>${row.list.map((a) => `<li><strong>${esc(ctx, say(ctx, a.name))}</strong>${say(ctx, a.summary) ? ` — ${esc(ctx, say(ctx, a.summary))}` : ""}</li>`).join("")}</ul>` : esc(ctx, ctx.t("nessuna", "none"))}</dd></div>`
        : `<div class="knowledge-row"><dt>${esc(ctx, say(ctx, row.label))}</dt><dd>${esc(ctx, say(ctx, row.value))}</dd></div>`,
    )
    .join("");
  const badge = dm
    ? `<span class="badge ${section.players ? "knowledge-known" : "knowledge-secret"}">${section.players ? ctx.t("I giocatori lo sanno", "Players know it") : ctx.t("Solo il DM", "DM only")}</span>`
    : "";
  return `<section class="knowledge-tier" data-knowledge-tier="${section.level}"><h3>${section.level}/4 · ${esc(ctx, say(ctx, section.title))} ${badge}</h3><dl>${rows}</dl></section>`;
}
function meterHTML(ctx, level) {
  const pips = Array.from(
    { length: D.MAX_LEVEL },
    (_, i) => `<span class="knowledge-pip${i < level ? " is-on" : ""}"></span>`,
  ).join("");
  return `<span class="knowledge-meter" role="img" aria-label="${esc(ctx, ctx.t(`Conoscenza ${level} su 4`, `Knowledge ${level} of 4`))}">${pips}</span>`;
}
function examineHTML(ctx, view) {
  const dm = ctx.role === "dm";
  const head = `<div class="knowledge-exam-head"><p class="knowledge-exam-name"><strong data-knowledge-raw>${esc(ctx, view.name)}</strong>${view.trueName ? ` <span class="badge knowledge-secret" data-knowledge-raw>${ctx.t("Nome vero", "True name")}: ${esc(ctx, view.trueName)}</span>` : ""}</p><p class="muted">${esc(ctx, say(ctx, view.size))}${view.conditions.length ? ` · ${esc(ctx, view.conditions.map((c) => say(ctx, c)).join(", "))}` : ""}</p></div>`;
  if (view.identityHidden && !dm)
    return `${head}<p class="knowledge-note" data-knowledge-unknown>${ctx.t("Identità sconosciuta: il DM decide quando rivelarla. Finché resta nascosta non sai che creatura sia.", "Unknown identity: the DM decides when to reveal it. While it stays hidden you don't know what creature it is.")}</p>`;
  if (!view.linked)
    return `${head}<p class="knowledge-note">${dm ? ctx.t("Nessun profilo collegato: sceglilo qui sotto per dare ai giocatori un bestiario graduato.", "No profile linked: choose one below to give players a graded bestiary.") : ctx.t("Il DM non ha collegato un profilo a questa creatura: sai solo ciò che vedi.", "The DM has not linked a profile to this creature: you only know what you see.")}</p>`;
  const level = view.level ?? 0;
  const locked = view.locked
    .map(
      (tier) =>
        `<section class="knowledge-tier is-locked" data-knowledge-locked="${tier.level}"><h3>${tier.level}/4 · ${esc(ctx, say(ctx, tier.title))}</h3><p class="muted">${ctx.t("Da scoprire", "To discover")}: ${esc(ctx, say(ctx, tier.fields))}</p></section>`,
    )
    .join("");
  const history = view.history.length
    ? `<details class="knowledge-history"><summary>${ctx.t("Come l'ha scoperto il gruppo", "How the party learnt it")} (${view.history.length})</summary><ul>${view.history
        .slice(-8)
        .reverse()
        .map((h) => `<li>${esc(ctx, historyText(ctx, h))}</li>`)
        .join("")}</ul></details>`
    : "";
  return `${head}<p class="knowledge-level" data-knowledge-level="${level}">${meterHTML(ctx, level)} ${ctx.t("Conoscenza del gruppo", "Party knowledge")}: <strong>${level}/4</strong>${view.mode === "full" ? ` · ${ctx.t("tutto sbloccato dalla campagna", "all unlocked by the campaign")}` : ""}</p>${view.sections.map((s) => tierHTML(ctx, s, dm)).join("")}${locked}${history}<p class="knowledge-pattern">${sourceLink(ctx, view.source)} · ${sourceLink(ctx, D.SOURCES.tiers)}</p>`;
}
function historyText(ctx, h) {
  const who = h.actorId ? nameOf(ctx, h.actorId) : "DM";
  if (h.kind === "check")
    return ctx.t(
      `${who}: prova ${h.total}${h.dc ? ` contro CD ${h.dc}` : ""} · ${h.success ? `successo, ${h.from} → ${h.to}` : "fallita"}`,
      `${who}: check ${h.total}${h.dc ? ` vs DC ${h.dc}` : ""} · ${h.success ? `success, ${h.from} → ${h.to}` : "failed"}`,
    );
  if (h.kind === "grant")
    return (
      ctx.t(`Il DM concede ${h.from} → ${h.to}`, `The DM grants ${h.from} → ${h.to}`) +
      (h.reason ? ` · ${h.reason}` : "")
    );
  if (h.kind === "correction")
    return (
      ctx.t(`Correzione del DM ${h.from} → ${h.to}`, `DM correction ${h.from} → ${h.to}`) +
      (h.reason ? ` · ${h.reason}` : "")
    );
  if (h.kind === "retry")
    return ctx.t(`Il DM concede a ${who} un nuovo tentativo`, `The DM lets ${who} try again`);
  return "";
}
// A name hidden from the token menu (B12) is shown again from there: one toggle per name.
const menuHiddenNote = (ctx) =>
  ctx.t(
    "Nome nascosto dal menu della pedina: mostralo da lì.",
    "Name hidden from the token menu: show it from there.",
  );
function dmExamineFields(ctx, view) {
  const actor = ctx.state.actors[view.actorId];
  const fixed = Boolean(actor?.compendiumRef?.id || actor?.encounterBlock?.creatureId);
  const current = D.kindOf(ctx.state, view.actorId)?.id ?? "";
  const profile = fixed
    ? `<p class="muted">${ctx.t("Profilo dal compendio o dall'incontro.", "Profile from the compendium or the encounter.")}</p>`
    : `<label class="field">${ctx.t("Profilo della creatura (SRD)", "Creature profile (SRD)")}<select name="profile" data-knowledge-profile><option value="">${ctx.t("Nessun profilo", "No profile")}</option>${CREATURES.map((c) => `<option value="${esc(ctx, c.id)}"${c.id === current ? " selected" : ""}>${esc(ctx, say(ctx, c.name))}</option>`).join("")}</select></label>`;
  const blocked = Object.keys(view.blocked ?? {});
  const levels = view.linked
    ? `<fieldset class="knowledge-grant"><legend>${ctx.t("Livello che conoscono i giocatori", "Level the players know")}</legend><label class="field">${ctx.t("Livello", "Level")}<select name="level" data-knowledge-grant-level>${[1, 2, 3, 4].map((n) => `<option value="${n}"${n === view.level ? " selected" : ""}>${n}/4 · ${esc(ctx, say(ctx, D.TIERS[n - 1].title))}</option>`).join("")}</select></label><label class="field">${ctx.t("Motivo (obbligatorio per abbassarlo)", "Reason (required to lower it)")}<input name="reason" maxlength="${D.REASON_MAX}" data-knowledge-grant-reason></label>${blocked.length ? `<p class="muted">${ctx.t("Hanno fallito a questo livello", "Failed at this level")}: ${blocked.map((id) => `${esc(ctx, nameOf(ctx, id))} ${button(`data-knowledge-retry="${esc(ctx, id)}"`, ctx.t("Consenti di riprovare", "Allow another try"), "quiet")}`).join(" ")}</p>` : ""}<p class="muted">${ctx.t(`CD di Studio proposta: ${view.study?.dc ?? "—"} (${say(ctx, view.study?.skillName)})`, `Proposed Study DC: ${view.study?.dc ?? "—"} (${say(ctx, view.study?.skillName)})`)} · ${sourceLink(ctx, D.SOURCES.loreDc)}</p></fieldset>`
    : "";
  const identity =
    view.identitySource === "token-menu"
      ? `<span class="muted">${menuHiddenNote(ctx)}</span>`
      : view.identityHidden
        ? button(
            `data-knowledge-reveal="${esc(ctx, view.actorId)}"`,
            ctx.t("Rivela identità", "Reveal identity"),
          )
        : button(
            `data-knowledge-conceal="${esc(ctx, view.actorId)}"`,
            ctx.t("Nascondi identità…", "Hide identity…"),
          );
  return `<div class="knowledge-dm">${levels}${profile}<p class="knowledge-actions">${identity}</p></div>`;
}
export function openExamine(ctx, actorId) {
  const view = D.examineView(ctx.state, actorId, ctx.role);
  if (!view) return ctx.toast(ctx.t("Creatura non disponibile.", "Creature unavailable."), true);
  const dm = ctx.role === "dm";
  const scene = sceneOf(ctx);
  const studiers = controlledOnScene(ctx, scene, (a) => a.kind === "character");
  const studyButton =
    !dm && view.study && view.level < D.MAX_LEVEL
      ? `<p class="knowledge-actions">${button(`data-knowledge-exam-study="${esc(ctx, actorId)}"`, ctx.t(`Studia (${say(ctx, view.study.skillName)})…`, `Study (${say(ctx, view.study.skillName)})…`), "primary")}</p>`
      : "";
  const body = `<div class="knowledge-exam" data-knowledge-exam="${esc(ctx, actorId)}">${examineHTML(ctx, view)}${dm ? dmExamineFields(ctx, view) : studiers.length ? studyButton : ""}</div>`;
  openDialog(ctx, ctx.t(`Esamina · ${view.name}`, `Examine · ${view.name}`), body, {
    cancelLabel: ctx.t("Chiudi", "Close"),
    ...(dm
      ? {
          submitLabel: ctx.t("Salva conoscenza", "Save knowledge"),
          onSubmit: (data) => saveDmExamine(ctx, view, data),
        }
      : {}),
  });
  if (typeof document === "undefined") return;
  const root = document.querySelector("#dialog");
  root
    .querySelector("[data-knowledge-exam-study]")
    ?.addEventListener("click", () => openStudy(ctx, actorId));
  root.querySelector("[data-knowledge-reveal]")?.addEventListener("click", () => {
    ctx.closeDialog();
    revealIdentity(ctx, actorId);
  });
  root
    .querySelector("[data-knowledge-conceal]")
    ?.addEventListener("click", () => openIdentity(ctx, actorId));
  root.querySelectorAll("[data-knowledge-retry]").forEach((b) =>
    b.addEventListener("click", () => {
      const kindId = D.kindOf(ctx.state, actorId)?.id;
      const done = act(
        ctx,
        ctx.t(
          `Nuovo tentativo concesso a ${nameOf(ctx, b.dataset.knowledgeRetry)}`,
          `Another try allowed for ${nameOf(ctx, b.dataset.knowledgeRetry)}`,
        ),
        (s, slice) =>
          D.allowRetry(s, slice, { kindId, actorId: b.dataset.knowledgeRetry }, ctx.role),
      );
      if (done) openExamine(ctx, actorId);
    }),
  );
}
function saveDmExamine(ctx, view, data) {
  const actor = ctx.state.actors[view.actorId];
  const fixed = Boolean(actor?.compendiumRef?.id || actor?.encounterBlock?.creatureId);
  const profile = data.get("profile");
  const current = D.kindOf(ctx.state, view.actorId)?.id ?? "";
  if (!fixed && profile !== null && profile !== current) {
    act(
      ctx,
      ctx.t(`Profilo collegato: ${actor.name}`, `Profile linked: ${actor.name}`),
      (s, slice) =>
        D.linkProfile(s, slice, { actorId: view.actorId, creatureId: profile || null }, ctx.role),
    );
    // The level field showed the previous profile: the new one keeps what the party knows.
    ctx.toast(
      ctx.t(
        "Profilo collegato. Riapri l'esame per concedere un livello del nuovo profilo.",
        "Profile linked. Reopen the examination to grant a level of the new profile.",
      ),
    );
    return;
  }
  const level = Number(data.get("level"));
  if (view.linked && level && level !== view.level) {
    const kindId = D.kindOf(ctx.state, view.actorId).id;
    act(
      ctx,
      level < view.level
        ? ctx.t(`Conoscenza corretta: ${level}/4`, `Knowledge corrected: ${level}/4`)
        : ctx.t(`Conoscenza concessa: ${level}/4`, `Knowledge granted: ${level}/4`),
      (s, slice) =>
        D.grantLevel(
          s,
          slice,
          { kindId, level, reason: String(data.get("reason") ?? "") },
          ctx.role,
        ),
    );
  }
}

// ------------------------------------------------------------------ Study (SRD action)
export function openStudy(ctx, targetId, actorId = null) {
  const scene = sceneOf(ctx);
  const studiers = controlledOnScene(ctx, scene, (a) => a.kind === "character");
  const chosen =
    actorId && studiers.includes(actorId) ? actorId : (actingId(ctx, scene, null) ?? studiers[0]);
  if (!chosen)
    return ctx.toast(
      ctx.t("Non controlli personaggi sulla scena.", "You control no character on the scene."),
      true,
    );
  const preview = D.studyPreview(ctx.state, chosen, targetId, ctx.role);
  const count = preview.mode === "normal" ? 1 : 2;
  const options = studiers
    .map(
      (id) =>
        `<option value="${esc(ctx, id)}"${id === chosen ? " selected" : ""}>${esc(ctx, nameOf(ctx, id))}</option>`,
    )
    .join("");
  const reasons = preview.reasons.length
    ? `<ul class="knowledge-reasons">${preview.reasons.map((r) => `<li>${esc(ctx, say(ctx, r))}</li>`).join("")}</ul>`
    : "";
  openDialog(
    ctx,
    ctx.t(`Studio · ${nameOf(ctx, targetId)}`, `Study · ${nameOf(ctx, targetId)}`),
    `<div class="knowledge-roll" data-knowledge-study-dialog><label class="field">${ctx.t("Chi studia", "Who studies")}<select name="actor" data-knowledge-studier>${options}</select></label><p><strong>${ctx.t("Intelligenza", "Intelligence")} (${esc(ctx, say(ctx, preview.skillName))}) ${signed(preview.bonus)}</strong>${modeText(ctx, preview.mode)} · ${ctx.t("il DM conosce la CD", "the DM knows the DC")}</p><p class="muted">${ctx.t("Un successo alza di un livello la conoscenza di tutto il gruppo. In combattimento è la tua azione.", "A success raises the whole party's knowledge by one level. In combat it is your action.")} ${sourceLink(ctx, D.SOURCES.study)}</p>${reasons}${preview.available ? diceFields(ctx, count) : ""}</div>`,
    // Review B46-rf: when the rules forbid this character's Study (already failed at this
    // level, nothing left to learn…) the dialog shows why and offers no roll; «Chi studia»
    // still lets another character try.
    !preview.available
      ? { cancelLabel: ctx.t("Chiudi", "Close") }
      : {
          submitLabel: ctx.t("Tira e studia", "Roll and study"),
          onSubmit: (data) => {
            const who = String(data.get("actor") ?? chosen);
            if (who !== chosen) {
              openStudy(ctx, targetId, who);
              return false;
            }
            const { mode, faces } = readDice(data, count);
            const result = act(
              ctx,
              ctx.t(
                `Studio: ${nameOf(ctx, who)} su ${nameOf(ctx, targetId)}`,
                `Study: ${nameOf(ctx, who)} on ${nameOf(ctx, targetId)}`,
              ),
              (s, slice, rolls) =>
                D.study(
                  s,
                  slice,
                  rolls,
                  { actorId: who, targetId, mode, faces },
                  ctx.role,
                  rng(ctx),
                ),
            );
            if (result)
              ctx.toast(
                result.success
                  ? ctx.t(
                      `Studio riuscito (${result.total}): il gruppo sale a ${result.to}/4.`,
                      `Study succeeded (${result.total}): the party reaches ${result.to}/4.`,
                    )
                  : ctx.t(
                      `Studio fallito (${result.total}): niente di nuovo.`,
                      `Study failed (${result.total}): nothing new.`,
                    ),
              );
          },
        },
  );
  if (preview.available) bindDice();
  if (typeof document !== "undefined")
    document
      .querySelector("#dialog [data-knowledge-studier]")
      ?.addEventListener("change", (e) => openStudy(ctx, targetId, e.target.value));
}

// ------------------------------------------------------------------ identity (FG ID)
function openIdentity(ctx, actorId) {
  openDialog(
    ctx,
    ctx.t(`Nascondi identità · ${nameOf(ctx, actorId)}`, `Hide identity · ${nameOf(ctx, actorId)}`),
    `<div data-knowledge-raw><p>${ctx.t("I giocatori vedranno questo nome nell'ordine, nel registro, nella chat e sulla mappa finché non lo riveli. Tu continui a vedere quello vero accanto.", "Players will see this name in the order, the log, the chat and on the map until you reveal it. You keep seeing the true one beside it.")}</p><label class="field">${ctx.t("Nome non identificato", "Unidentified name")}<input name="alias" maxlength="${D.ALIAS_MAX}" required value="${esc(ctx, ctx.t("Figura incappucciata", "Hooded figure"))}" data-knowledge-alias></label></div>`,
    {
      submitLabel: ctx.t("Nascondi identità", "Hide identity"),
      onSubmit: (data) => {
        const alias = String(data.get("alias") ?? "");
        act(
          ctx,
          ctx.t(`Identità nascosta: ${alias.trim()}`, `Identity hidden: ${alias.trim()}`),
          (s, slice) => D.hideIdentity(s, slice, { actorId, alias }, ctx.role),
          // P3 TV-141 (shared edit; FG ID, Foundry Anonymous): no public trace of the disguise.
          { visibility: "private" },
        );
      },
    },
  );
}
function revealIdentity(ctx, actorId) {
  const record = D.identityOf(ctx.state, actorId);
  if (!record) return;
  act(
    ctx,
    ctx.t(
      `Identità rivelata: ${record.alias} è ${record.trueName}`,
      `Identity revealed: ${record.alias} is ${record.trueName}`,
    ),
    (s, slice) => D.revealIdentity(s, slice, { actorId }, ctx.role),
  );
}

// ------------------------------------------------------------------ Hide and Search
function lossText(ctx, event) {
  const reason = say(ctx, D.LOSS[event.reason]);
  const finder = event.detail?.finderId ? nameOf(ctx, event.detail.finderId) : null;
  return `${nameOf(ctx, event.actorId)} ${ctx.t("non è più nascosta", "is no longer hidden")}: ${reason}${finder ? ` (${finder}${event.detail.total ? `, ${ctx.t("Percezione", "Perception")} ${event.detail.total} ${ctx.t("contro", "vs")} ${event.record?.total}` : ""})` : ""}${event.note ? ` · ${event.note}` : ""}`;
}
export function openHide(ctx, actorId) {
  const assessment = D.stealthAssessment(ctx.state, actorId, ctx.role);
  if (!assessment)
    return ctx.toast(
      ctx.t("La creatura non è sulla scena.", "The creature is not on the scene."),
      true,
    );
  const dm = ctx.role === "dm";
  const mode = checkMode(ctx, actorId, "dex", "stealth");
  const count = mode.mode === "normal" ? 1 : 2;
  const reasons = assessment.reasons.length
    ? `<ul class="knowledge-reasons" data-knowledge-hide-reasons>${assessment.reasons.map((r) => `<li>${esc(ctx, say(ctx, r))}</li>`).join("")}</ul>`
    : `<p class="knowledge-ok">${ctx.t("Puoi provare a nasconderti: nessun nemico che vedi ti vede.", "You can try to hide: no enemy you can see sees you.")}</p>`;
  const override =
    dm && !assessment.eligible
      ? `<label class="field">${ctx.t("Consenti comunque · motivo del DM", "Allow anyway · DM's reason")}<input name="dmReason" maxlength="${D.REASON_MAX}" required placeholder="${esc(ctx, ctx.t("Es. fumo denso, pesantemente oscurato", "E.g. thick smoke, heavily obscured"))}"></label>`
      : "";
  const blocked = !assessment.eligible && !dm;
  openDialog(
    ctx,
    ctx.t(`Nascondersi · ${nameOf(ctx, actorId)}`, `Hide · ${nameOf(ctx, actorId)}`),
    `<div class="knowledge-roll" data-knowledge-hide-dialog><p>${esc(ctx, say(ctx, assessment.obscurityName))}</p>${reasons}<p><strong>${ctx.t("Destrezza (Furtività)", "Dexterity (Stealth)")} ${signed(mode.bonus)}</strong>${modeText(ctx, mode.mode)} · ${ctx.t("CD", "DC")} ${D.HIDE_DC}</p><p class="muted">${ctx.t("Se riesci hai la condizione Invisibile finché resti nascosta; il totale è la CD per trovarti. Smetti di esserlo se attacchi, lanci un incantesimo con componente verbale, parli più forte di un sussurro o un nemico ti trova.", "On a success you have the Invisible condition while hidden; the total is the DC to find you. You stop being hidden if you attack, cast a spell with a Verbal component, speak louder than a whisper or an enemy finds you.")} ${sourceLink(ctx, D.SOURCES.hide)}</p>${override}${blocked ? "" : diceFields(ctx, count)}</div>`,
    blocked
      ? { cancelLabel: ctx.t("Chiudi", "Close") }
      : {
          submitLabel: ctx.t("Tira Furtività", "Roll Stealth"),
          onSubmit: (data) => {
            const { mode: diceMode, faces } = readDice(data, count);
            const result = act(
              ctx,
              ctx.t(`Nascondersi: ${nameOf(ctx, actorId)}`, `Hide: ${nameOf(ctx, actorId)}`),
              (s, slice, rolls) =>
                D.hide(
                  s,
                  slice,
                  rolls,
                  { actorId, mode: diceMode, faces, dmReason: String(data.get("dmReason") ?? "") },
                  ctx.role,
                  rng(ctx),
                ),
              // A DM creature hides in secret: the log line stays the DM's.
              D.secretHider(ctx.state, actorId, ctx.role) ? { visibility: "private" } : {},
            );
            if (result)
              ctx.toast(
                result.success
                  ? ctx.t(
                      `${nameOf(ctx, actorId)} è nascosta (${result.total}).`,
                      `${nameOf(ctx, actorId)} is hidden (${result.total}).`,
                    )
                  : ctx.t(
                      `Non riesce a nascondersi (${result.total} contro ${D.HIDE_DC}).`,
                      `Fails to hide (${result.total} vs ${D.HIDE_DC}).`,
                    ),
              );
          },
        },
  );
  if (!blocked) bindDice();
}
// The profile the domain rolls with: bonus and Advantage/Disadvantage from conditions.
const checkMode = (ctx, actorId, ability, skill) =>
  D.checkModeOf(ctx.state, actorId, ability, skill);
/**
 * B62 — the Table's one Search action (SRD 5.2.1 "Search [Action]", EN 187 / IT 212): one
 * Wisdom (Perception) check, the Search table's skill for a concealed creature or object. The
 * same total finds hidden creatures (this area), hidden traps within 3 m (B41) and, while
 * exploring, the search points within 4.5 m (B45); one roll, one action, one log line. An
 * Intelligence (Investigation) countermeasure of a trap is a Study, not a Search (SRD traps).
 */
export function openSearch(ctx, finderId) {
  const mode = checkMode(ctx, finderId, "wis", "perception");
  const count = mode.mode === "normal" ? 1 : 2;
  const withTraps = Boolean(traps?.sliceOf(ctx.state));
  const withPoints = Boolean(ctx.state.ext?.[TD.ID]);
  const covers = [
    ctx.t(
      "le creature nascoste la cui prova di Furtività raggiungi",
      "hidden creatures whose Stealth total you meet",
    ),
    withTraps
      ? ctx.t(
          `le trappole nascoste entro ${traps.SEARCH_METERS} m la cui CD raggiungi`,
          `hidden traps within ${traps.SEARCH_METERS} m whose DC you meet`,
        )
      : "",
    withPoints
      ? ctx.t(
          "in esplorazione, contenitori e oggetti nascosti entro 4,5 m",
          "while exploring, containers and hidden objects within 15 ft",
        )
      : "",
  ].filter(Boolean);
  openDialog(
    ctx,
    ctx.t(`Cerca · ${nameOf(ctx, finderId)}`, `Search · ${nameOf(ctx, finderId)}`),
    `<div class="knowledge-roll" data-knowledge-search-dialog><p><strong>${ctx.t("Saggezza (Percezione)", "Wisdom (Perception)")} ${signed(mode.bonus)}</strong>${modeText(ctx, mode.mode)}</p><p class="muted" data-knowledge-search-covers>${ctx.t("Un solo tiro trova", "One roll finds")} ${covers.map((text) => esc(ctx, text)).join("; ")}. ${ctx.t("In combattimento è la tua azione.", "In combat it is your action.")} ${sourceLink(ctx, D.SOURCES.search)}</p><p class="muted">${ctx.t("Regola dell'app: chi è dietro copertura totale non si trova con Cercare; il DM può comunque segnarlo «Trovata da…».", "App rule: Search does not find a creature behind Total Cover; the DM can still mark it “Found by…”.")}</p>${diceFields(ctx, count)}</div>`,
    {
      submitLabel: ctx.t("Tira e cerca", "Roll and search"),
      onSubmit: (data) => {
        const { mode: diceMode, faces } = readDice(data, count);
        const result = act(
          ctx,
          // P6 TV-138: the log names the action and the skill.
          ctx.t(
            `Cerca · Percezione: ${nameOf(ctx, finderId)}`,
            `Search · Perception: ${nameOf(ctx, finderId)}`,
          ),
          (s, slice, rolls) => {
            const found = D.search(
              s,
              slice,
              rolls,
              { finderId, mode: diceMode, faces },
              ctx.role,
              rng(ctx),
            );
            const trapCheck = traps?.sliceOf(s)
              ? traps.searchForTrapsWithRoll(s, { actorId: finderId, roll: found.roll }, ctx.role)
              : null;
            // Only what this roll discovers is news: an open crate is in plain sight.
            const known = new Set(
              TD.pointsOf(s.ext?.[TD.ID], s.activeSceneId)
                .filter((p) => p.found)
                .map((p) => p.id),
            );
            const points = TD.searchPointsWithRoll(
              s,
              s.ext?.[TD.ID],
              { id: TD.newId("search"), actorId: finderId, roll: found.roll },
              ctx.role,
            );
            const newPoints = (points?.found ?? []).filter((id) => !known.has(id));
            // The scene's «Trovato» list keeps these finds with the search that made them.
            D.recordFinds(slice, finderId, { traps: trapCheck?.found ?? [], points: newPoints });
            return { ...found, trapCheck, points, newPoints };
          },
          ctx.role === "dm" ? { visibility: "private" } : {},
        );
        if (!result) return;
        const creatures = result.found.map((id) => nameOf(ctx, id));
        const trapNames = (result.trapCheck?.found ?? [])
          .map((id) => traps.regionOf(ctx.state, id)?.publicName)
          .filter(Boolean);
        const pointNames = (result.newPoints ?? [])
          .map((id) =>
            TD.pointsOf(ctx.state.ext?.[TD.ID], ctx.state.activeSceneId).find((p) => p.id === id),
          )
          .filter(Boolean)
          .map((p) => TD.pick(p.name, ctx.lang));
        const all = [...creatures, ...trapNames.map((n) => `«${n}»`), ...pointNames];
        // As B41 and B45: nothing found never says whether something was there.
        ctx.toast(
          all.length
            ? ctx.t(
                `Trovato: ${all.join(", ")} (${result.total}).`,
                `Found: ${all.join(", ")} (${result.total}).`,
              )
            : ctx.t(
                `Niente di sospetto (${result.total}).`,
                `Nothing suspicious (${result.total}).`,
              ),
        );
      },
    },
  );
  bindDice();
}
function openReason(ctx, title, label, run, submitLabel) {
  openDialog(
    ctx,
    title,
    `<label class="field">${label}<input name="reason" maxlength="${D.REASON_MAX}" required data-knowledge-reason></label>`,
    {
      submitLabel,
      onSubmit: (data) => run(String(data.get("reason") ?? "")),
    },
  );
}

// ------------------------------------------------------------------ pickpocket (CRP-151)
function itemLabel(ctx, name) {
  return say(ctx, name);
}
export function openPickpocket(ctx, targetId, thiefId = null) {
  const thieves = D.pickpocketThieves(ctx.state, targetId, ctx.role);
  if (!thieves.length)
    return ctx.toast(
      ctx.t(
        "Avvicinati: serve un tuo personaggio adiacente.",
        "Move closer: one of your characters must be adjacent.",
      ),
      true,
    );
  // The item list is the chosen thief's own: changing the thief reopens the dialog (like
  // «Chi studia» in Study), so a plant never offers another character's items.
  const chosen = thieves.includes(thiefId) ? thiefId : thieves[0];
  const thiefOptions = thieves
    .map(
      (id) =>
        `<option value="${esc(ctx, id)}"${id === chosen ? " selected" : ""}>${esc(ctx, nameOf(ctx, id))}</option>`,
    )
    .join("");
  const items = (ctx.state.actors[chosen].inventory ?? []).filter(
    (row) => row.quantity > 0 && !row.equipped,
  );
  openDialog(
    ctx,
    ctx.t(`Borseggia · ${nameOf(ctx, targetId)}`, `Pickpocket · ${nameOf(ctx, targetId)}`),
    `<div class="knowledge-roll" data-knowledge-pick-dialog><label class="field">${ctx.t("Chi borseggia", "Who pickpockets")}<select name="thief">${thiefOptions}</select></label><fieldset class="knowledge-choice"><legend>${ctx.t("Che cosa fai", "What you do")}</legend><label><input type="radio" name="intent" value="take" checked> ${ctx.t("Prendo qualcosa", "I take something")}</label><label><input type="radio" name="intent" value="plant"${items.length ? "" : ' disabled aria-describedby="knowledge-plant-why"'}> ${ctx.t("Gli infilo un mio oggetto", "I slip in one of my items")}${items.length ? "" : ` <span id="knowledge-plant-why">(${ctx.t("nessun oggetto da infilare: mettine uno nell’inventario di chi borseggia", "no item to slip in: put one in the pickpocket's inventory")})</span>`}</label></fieldset><label class="field" data-knowledge-pick-take>${ctx.t("Che cosa cerchi", "What you are after")}<input name="wish" maxlength="80" placeholder="${esc(ctx, ctx.t("Es. una chiave, la borsa", "E.g. a key, the purse"))}"></label><label class="field" data-knowledge-pick-plant hidden>${ctx.t("Oggetto da infilare", "Item to slip in")}<select name="item">${items.map((row) => `<option value="${esc(ctx, row.id)}">${esc(ctx, itemLabel(ctx, row.name))} ×${row.quantity}</option>`).join("")}</select></label><p class="muted">${ctx.t("Il DM decide la CD e che cosa è a portata; poi tiri Destrezza (Rapidità di Mano).", "The DM decides the DC and what is in reach; then you roll Dexterity (Sleight of Hand).")} ${sourceLink(ctx, D.SOURCES.sleight)}</p></div>`,
    {
      submitLabel: ctx.t("Chiedi al DM", "Ask the DM"),
      onSubmit: (data) => {
        const thief = String(data.get("thief") ?? chosen);
        if (thief !== chosen) {
          openPickpocket(ctx, targetId, thief);
          return false;
        }
        const intent = data.get("intent") === "plant" ? "plant" : "take";
        act(
          ctx,
          ctx.t(
            `Richiesta di borseggio: ${nameOf(ctx, data.get("thief"))} → ${nameOf(ctx, targetId)}`,
            `Pickpocket request: ${nameOf(ctx, data.get("thief"))} → ${nameOf(ctx, targetId)}`,
          ),
          (s, slice) =>
            D.requestPickpocket(
              s,
              slice,
              {
                thiefId: String(data.get("thief")),
                targetId,
                intent,
                itemId: data.get("item"),
                wish: String(data.get("wish") ?? ""),
              },
              ctx.role,
            ),
        );
      },
    },
  );
  if (typeof document === "undefined") return;
  const root = document.querySelector("#dialog");
  const sync = () => {
    const plant = root.querySelector('[name="intent"]:checked')?.value === "plant";
    root.querySelector("[data-knowledge-pick-take]").hidden = plant;
    root.querySelector("[data-knowledge-pick-plant]").hidden = !plant;
    root.querySelector('[name="wish"]').required = !plant;
  };
  root
    .querySelectorAll('[name="intent"]')
    .forEach((input) => input.addEventListener("change", sync));
  root
    .querySelector('[name="thief"]')
    ?.addEventListener("change", (e) => openPickpocket(ctx, targetId, e.target.value));
  sync();
}
function openDecide(ctx, requestId) {
  const request = sliceOf(ctx.state).pickpocket.find((r) => r.id === requestId);
  if (!request) return;
  const target = ctx.state.actors[request.targetId];
  const passive = D.passiveOf(ctx.state, request.targetId);
  const items = (target?.inventory ?? []).filter((row) => row.quantity > 0 && !row.equipped);
  const take = request.intent === "take";
  const lootFields = take
    ? `<fieldset class="knowledge-choice"><legend>${ctx.t("Che cosa è a portata di mano", "What is within reach")}</legend>${items.length ? `<label><input type="radio" name="loot" value="item"> ${ctx.t("Un suo oggetto", "One of its items")}</label><label class="field">${ctx.t("Oggetto", "Item")}<select name="itemId">${items.map((row) => `<option value="${esc(ctx, row.id)}">${esc(ctx, itemLabel(ctx, row.name))} ×${row.quantity}</option>`).join("")}</select></label>` : ""}<label><input type="radio" name="loot" value="new" checked> ${ctx.t("Un oggetto che descrivo", "An item I describe")}</label><label class="field">${ctx.t("Nome dell'oggetto", "Item name")}<input name="lootName" maxlength="80" value="${esc(ctx, request.wish ?? "")}"></label><label><input type="radio" name="loot" value="nothing"> ${ctx.t("Non ha niente del genere (nessun tiro)", "It has nothing like that (no roll)")}</label></fieldset>`
    : `<p>${ctx.t("Vuole infilargli", "Wants to slip in")}: <strong>${esc(ctx, itemLabel(ctx, request.itemName))}</strong></p>`;
  openDialog(
    ctx,
    ctx.t(
      `Decidi il borseggio · ${nameOf(ctx, request.thiefId)}`,
      `Decide the pickpocket · ${nameOf(ctx, request.thiefId)}`,
    ),
    `<div class="knowledge-roll" data-knowledge-decide-dialog><p>${esc(ctx, nameOf(ctx, request.thiefId))} → ${esc(ctx, nameOf(ctx, request.targetId))}${take ? ` · ${ctx.t("cerca", "is after")}: «${esc(ctx, request.wish)}»` : ""}</p><fieldset class="knowledge-choice"><legend>${ctx.t("Decisione", "Decision")}</legend><label><input type="radio" name="allow" value="yes" checked> ${ctx.t("Consenti la prova", "Allow the check")}</label><label><input type="radio" name="allow" value="no"> ${ctx.t("Rifiuta", "Refuse")}</label></fieldset><label class="field">${ctx.t("CD (proposta: Percezione passiva del bersaglio)", "DC (proposed: the target's passive Perception)")}<input type="number" name="dc" min="5" max="30" value="${passive}" inputmode="numeric"></label>${lootFields}<label class="field">${ctx.t("Motivo (se rifiuti)", "Reason (if you refuse)")}<input name="reason" maxlength="${D.REASON_MAX}"></label><p class="muted">${sourceLink(ctx, D.SOURCES.pickpocket)}</p></div>`,
    {
      submitLabel: ctx.t("Conferma", "Confirm"),
      onSubmit: (data) => {
        const allow = data.get("allow") !== "no";
        const mode = data.get("loot");
        act(
          ctx,
          allow
            ? ctx.t("Borseggio: il DM decide", "Pickpocket: the DM decides")
            : ctx.t("Borseggio rifiutato dal DM", "Pickpocket refused by the DM"),
          (s, slice) =>
            D.decidePickpocket(
              s,
              slice,
              {
                requestId,
                allow,
                dc: Number(data.get("dc")),
                loot: take
                  ? { mode, itemId: data.get("itemId"), name: String(data.get("lootName") ?? "") }
                  : null,
                reason: String(data.get("reason") ?? ""),
              },
              ctx.role,
            ),
          { visibility: "private" },
        );
      },
    },
  );
}
function openPickRoll(ctx, requestId) {
  const request = sliceOf(ctx.state).pickpocket.find((r) => r.id === requestId);
  if (!request) return;
  const mode = checkMode(ctx, request.thiefId, "dex", "sleight-of-hand");
  const count = mode.mode === "normal" ? 1 : 2;
  openDialog(
    ctx,
    ctx.t(
      `Borseggio · ${nameOf(ctx, request.thiefId)}`,
      `Pickpocket · ${nameOf(ctx, request.thiefId)}`,
    ),
    `<div class="knowledge-roll" data-knowledge-pickroll-dialog><p><strong>${ctx.t("Destrezza (Rapidità di Mano)", "Dexterity (Sleight of Hand)")} ${signed(mode.bonus)}</strong>${modeText(ctx, mode.mode)} · ${ctx.t("il DM conosce la CD", "the DM knows the DC")}</p>${diceFields(ctx, count)}</div>`,
    {
      submitLabel: ctx.t("Tira", "Roll"),
      onSubmit: (data) => {
        const { mode: diceMode, faces } = readDice(data, count);
        const result = act(
          ctx,
          ctx.t(
            `Borseggio: ${nameOf(ctx, request.thiefId)} tenta`,
            `Pickpocket: ${nameOf(ctx, request.thiefId)} tries`,
          ),
          (s, slice, rolls) =>
            D.rollPickpocket(
              s,
              slice,
              rolls,
              { requestId, mode: diceMode, faces },
              ctx.role,
              rng(ctx),
            ),
        );
        if (result)
          ctx.toast(
            result.success
              ? ctx.t(
                  `Riuscito (${result.roll.total}): ${itemLabel(ctx, result.request.outcome.transfer.name)}.`,
                  `Success (${result.roll.total}): ${itemLabel(ctx, result.request.outcome.transfer.name)}.`,
                )
              : ctx.t(
                  `Fallito (${result.roll.total}): il DM decide se se ne accorge.`,
                  `Failed (${result.roll.total}): the DM decides whether it notices.`,
                ),
          );
      },
    },
  );
  bindDice();
}
function pickStatusText(ctx, r) {
  const who = `${nameOf(ctx, r.thiefId)} → ${nameOf(ctx, r.targetId)}`;
  const what =
    r.intent === "take"
      ? ctx.t(`prendere «${r.wish}»`, `take “${r.wish}”`)
      : ctx.t(`infilare ${itemLabel(ctx, r.itemName)}`, `slip in ${itemLabel(ctx, r.itemName)}`);
  const status = {
    asked: ctx.t("in attesa del DM", "waiting for the DM"),
    ready: ctx.t("il DM consente: tira", "the DM allows it: roll"),
    failed: ctx.t(
      "fallito: il DM decide se se ne accorge",
      "failed: the DM decides whether it notices",
    ),
    refused: ctx.t("rifiutato", "refused"),
    withdrawn: ctx.t("ritirato", "withdrawn"),
    reverted: ctx.t("annullato dal DM", "undone by the DM"),
    done: r.outcome?.nothing
      ? ctx.t("non aveva niente del genere", "it had nothing like that")
      : r.outcome?.success
        ? ctx.t(
            `riuscito: ${itemLabel(ctx, r.outcome.transfer?.name)}`,
            `success: ${itemLabel(ctx, r.outcome.transfer?.name)}`,
          )
        : r.outcome?.noticed
          ? ctx.t("fallito: se n'è accorto", "failed: it noticed")
          : ctx.t("fallito: non se n'è accorto", "failed: it did not notice"),
  }[r.status];
  const extra =
    ctx.role === "dm" && Number.isInteger(r.dc) ? ` · ${ctx.t("CD", "DC")} ${r.dc}` : "";
  const total = r.roll ? ` · ${r.roll.total}` : "";
  const reason =
    r.status === "refused" && r.outcome?.reason
      ? ` · ${r.outcome.reason}`
      : r.correction
        ? ` · ${r.correction.reason}`
        : "";
  return `${who} · ${what} · ${status}${total}${extra}${reason}`;
}
function pickRowHTML(ctx, r) {
  const dm = ctx.role === "dm";
  const mine = controls(ctx, r.thiefId);
  const buttons = [];
  if (dm && r.status === "asked")
    buttons.push(
      button(`data-knowledge-decide="${esc(ctx, r.id)}"`, ctx.t("Decidi…", "Decide…"), "primary"),
    );
  if (mine && r.status === "ready")
    buttons.push(
      button(
        `data-knowledge-pickroll="${esc(ctx, r.id)}"`,
        ctx.t("Tira Rapidità di Mano…", "Roll Sleight of Hand…"),
        "primary",
      ),
    );
  if (mine && ["asked", "ready"].includes(r.status))
    buttons.push(
      button(`data-knowledge-withdraw="${esc(ctx, r.id)}"`, ctx.t("Ritira", "Withdraw"), "quiet"),
    );
  if (dm && r.status === "failed") {
    buttons.push(
      button(
        `data-knowledge-noticed="${esc(ctx, r.id)}" data-value="yes"`,
        ctx.t("Se ne accorge", "It notices"),
      ),
    );
    buttons.push(
      button(
        `data-knowledge-noticed="${esc(ctx, r.id)}" data-value="no"`,
        ctx.t("Non se ne accorge", "It does not notice"),
      ),
    );
  }
  if (dm && r.status === "done" && r.outcome?.transfer)
    buttons.push(
      button(
        `data-knowledge-revert="${esc(ctx, r.id)}"`,
        ctx.t("Annulla con motivo…", "Undo with a reason…"),
        "quiet",
      ),
    );
  return `<li class="knowledge-pick" data-knowledge-pick="${esc(ctx, r.id)}" data-status="${esc(ctx, r.status)}"><span>${esc(ctx, pickStatusText(ctx, r))}</span>${buttons.length ? `<span class="knowledge-actions">${buttons.join("")}</span>` : ""}</li>`;
}
function pickListHTML(ctx, filter) {
  const rows = sliceOf(ctx.state)
    .pickpocket.map((r) => D.projectPickpocket(ctx.state, r, ctx.role))
    .filter(Boolean)
    .filter(filter)
    .slice(-6)
    .reverse();
  return rows.length
    ? `<ul class="knowledge-picks" data-knowledge-picks>${rows.map((r) => pickRowHTML(ctx, r)).join("")}</ul>`
    : "";
}

// ------------------------------------------------------------------ Creature tab block
function stealthBlock(ctx, actorId) {
  const dm = ctx.role === "dm";
  const assessment = D.stealthAssessment(ctx.state, actorId, ctx.role);
  if (!assessment) return "";
  const hidden = assessment.hidden;
  const status = hidden
    ? `<p class="knowledge-status is-hidden" data-knowledge-hidden="${esc(ctx, actorId)}"><strong>${ctx.t("Nascosta", "Hidden")}</strong> · ${ctx.t("CD per trovarla", "DC to find it")} ${hidden.total}${dm && hidden.dmReason ? ` · ${ctx.t("consentito dal DM", "allowed by the DM")}: ${esc(ctx, hidden.dmReason)}` : ""}</p>${dm && ctx.state.actors[actorId]?.kind === "npc" && !D.tokenOf(sceneOf(ctx), actorId)?.hidden ? `<p class="muted" data-knowledge-token-note>${ctx.t("La pedina resta sulla mappa dei giocatori: nascondila dal menu della pedina se non devono sapere dov'è.", "The token stays on the players' map: hide it from the token menu if they must not know where it is.")}</p>` : ""}`
    : `<p class="knowledge-status" data-knowledge-visible="${esc(ctx, actorId)}"><strong>${ctx.t("Visibile", "Visible")}</strong> · ${esc(ctx, say(ctx, assessment.obscurityName))}</p>`;
  const rows = assessment.rows.length
    ? `<ul class="knowledge-watchers" data-knowledge-watchers>${assessment.rows
        .map((row) => {
          const cover =
            row.cover === "none"
              ? ctx.t("scoperta", "exposed")
              : say(ctx, C.DEGREE[row.cover]?.name) || "—";
          const sees = row.sees
            ? ctx.t("ti vede", "sees you")
            : ctx.t("non ti vede", "can't see you");
          const aware =
            dm && hidden
              ? ` · ${ctx.t("Percezione passiva", "Passive Perception")} ${row.passive} · ${row.notices ? ctx.t("la nota", "notices it") : ctx.t("non la nota", "doesn't notice")} ${button(`data-knowledge-found="${esc(ctx, actorId)}" data-finder="${esc(ctx, row.id)}"`, ctx.t(`Trovata da ${row.name}`, `Found by ${row.name}`), "quiet")}`
              : "";
          return `<li class="${row.sees ? "is-seen" : ""}${dm && hidden && row.notices ? " is-aware" : ""}" data-watcher="${esc(ctx, row.id)}"><strong>${esc(ctx, row.name)}</strong> · ${sees} · ${esc(ctx, cover)}${aware}</li>`;
        })
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessun nemico che vedi sulla scena.", "No enemy you can see on the scene.")}</p>`;
  const lastLoss = [...sliceOf(ctx.state).events]
    .reverse()
    .find((e) => e.actorId === actorId && ["lost", "kept", "hidden"].includes(e.kind));
  const loss =
    lastLoss?.kind === "lost" && !hidden
      ? `<p class="knowledge-loss" data-knowledge-loss="${esc(ctx, lastLoss.id)}">${esc(ctx, lossText(ctx, lastLoss))} · ${sourceLink(ctx, D.SOURCES.hide)}${dm ? ` ${button(`data-knowledge-keep="${esc(ctx, lastLoss.id)}"`, ctx.t("Mantieni nascosta…", "Keep hidden…"), "quiet")}` : ""}</p>`
      : "";
  const buttons = hidden
    ? [
        button(
          `data-knowledge-unhide="${esc(ctx, actorId)}"`,
          ctx.t("Smetti di nasconderti", "Stop hiding"),
        ),
        button(
          `data-knowledge-noise="${esc(ctx, actorId)}"`,
          ctx.t("Ho fatto rumore", "I made a noise"),
          "quiet",
        ),
        ...(dm
          ? [
              button(
                `data-knowledge-dm-end="${esc(ctx, actorId)}"`,
                ctx.t("Termina (motivo)…", "End (reason)…"),
                "quiet",
              ),
            ]
          : []),
      ]
    : [
        // A player sees why the rules forbid hiding right above; the DM may still allow it.
        button(
          `data-knowledge-hide="${esc(ctx, actorId)}"${!assessment.eligible && !dm ? ` disabled aria-describedby="knowledge-why-${esc(ctx, actorId)}"` : ""}`,
          ctx.t("Nasconditi…", "Hide…"),
          assessment.eligible ? "primary" : "",
        ),
      ];
  buttons.push(button(`data-knowledge-search="${esc(ctx, actorId)}"`, ctx.t("Cerca", "Search")));
  buttons.push(
    `<button type="button" class="button quiet" data-knowledge-sight aria-pressed="${ui.showSight}" title="${esc(ctx, ctx.t("Oppure tieni premuto Maiusc sulla mappa", "Or hold Shift on the map"))}">${ctx.icon("eye")} ${ctx.t("Chi può vedere", "Who can see")}</button>`,
  );
  const why =
    !hidden && !assessment.eligible
      ? `<ul class="knowledge-reasons" id="knowledge-why-${esc(ctx, actorId)}">${assessment.reasons.map((r) => `<li>${esc(ctx, say(ctx, r))}</li>`).join("")}</ul>`
      : "";
  const picks = pickListHTML(ctx, (r) => r.thiefId === actorId && ctx.role !== "dm");
  return `<div class="knowledge-block" data-knowledge-stealth="${esc(ctx, actorId)}"><h4>${ctx.t("Furtività", "Stealth")}</h4>${status}${loss}${rows}${why}<p class="knowledge-actions">${buttons.join("")}</p>${picks}</div>`;
}
/**
 * CA-71 (BG3 shows the failed passive roll): with «Prove passive fallite: Mostrate ai
 * giocatori», the player's own character says it noticed nothing, never what or where.
 */
function passiveBlock(ctx, actorId) {
  const lines = D.failedPassives(ctx.state, ctx.role)
    .filter((line) => line.actorId === actorId)
    .slice(0, 3);
  if (!lines.length) return "";
  const time = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
  };
  return `<div class="knowledge-block knowledge-passive" data-knowledge-passive="${esc(ctx, actorId)}"><h4>${ctx.t("Prove passive", "Passive checks")}</h4><ul class="knowledge-passive-lines">${lines
    .map(
      (line) =>
        `<li data-knowledge-passive-line="${esc(ctx, line.id)}"><strong>${esc(ctx, say(ctx, line.text))}</strong>${time(line.at) ? ` <small class="muted">${esc(ctx, time(line.at))}</small>` : ""}</li>`,
    )
    .join(
      "",
    )}</ul><p class="muted">${ctx.t("Il DM ha scelto di mostrare le prove passive fallite: qualcosa è sfuggito, senza dire cosa.", "The DM chose to show failed passive checks: something went unnoticed, without saying what.")}</p></div>`;
}
function knowledgeBlock(ctx, targetId) {
  const view = D.examineView(ctx.state, targetId, ctx.role);
  if (!view) return "";
  const dm = ctx.role === "dm";
  const line =
    view.identityHidden && !dm
      ? `<p class="knowledge-status">${ctx.t("Identità sconosciuta", "Unknown identity")}</p>`
      : view.linked
        ? `<p class="knowledge-status" data-knowledge-summary="${view.level}">${meterHTML(ctx, view.level)} <strong>${view.level}/4</strong> · ${esc(ctx, say(ctx, view.sections[0]?.rows?.[0]?.value) || ctx.t("creatura", "creature"))}</p>`
        : `<p class="muted">${ctx.t("Nessun profilo collegato.", "No profile linked.")}</p>`;
  const identity = dm
    ? view.identityHidden
      ? `<p class="muted" data-knowledge-raw>${ctx.t("I giocatori la vedono come", "Players see it as")} «${esc(ctx, view.name)}» · ${ctx.t("nome vero", "true name")}: ${esc(ctx, view.trueName)}${view.identitySource === "token-menu" ? ` · ${menuHiddenNote(ctx)}` : ""}</p>`
      : ""
    : "";
  const scene = sceneOf(ctx);
  const studiers = controlledOnScene(ctx, scene, (a) => a.kind === "character");
  const buttons = [
    button(
      `data-knowledge-examine="${esc(ctx, targetId)}"`,
      ctx.t("Esamina", "Examine"),
      "primary",
    ),
  ];
  if (!dm && view.study && view.level < D.MAX_LEVEL && studiers.length)
    buttons.push(
      button(
        `data-knowledge-study="${esc(ctx, targetId)}"`,
        ctx.t(
          `Studia (${say(ctx, view.study.skillName)})…`,
          `Study (${say(ctx, view.study.skillName)})…`,
        ),
      ),
    );
  if (dm && view.identitySource !== "token-menu")
    buttons.push(
      view.identityHidden
        ? button(
            `data-knowledge-reveal="${esc(ctx, targetId)}"`,
            ctx.t("Rivela identità", "Reveal identity"),
          )
        : button(
            `data-knowledge-conceal="${esc(ctx, targetId)}"`,
            ctx.t("Nascondi identità…", "Hide identity…"),
          ),
    );
  return `<div class="knowledge-block" data-knowledge-know="${esc(ctx, targetId)}"><h4>${ctx.t("Conoscenza", "Knowledge")}</h4>${line}${identity}<p class="knowledge-actions">${buttons.join("")}</p></div>`;
}
function modifiersBlock(ctx, attackerId, targetId) {
  const rows = D.targetModifiers(ctx.state, attackerId, targetId, ctx.role);
  const scene = sceneOf(ctx);
  const choices = controlledOnScene(ctx, scene).filter((id) => id !== targetId);
  const select =
    choices.length > 1
      ? `<label class="field knowledge-from">${ctx.t("Da", "From")}<select data-knowledge-from>${choices.map((id) => `<option value="${esc(ctx, id)}"${id === attackerId ? " selected" : ""}>${esc(ctx, nameOf(ctx, id))}</option>`).join("")}</select></label>`
      : `<p class="muted">${ctx.t("Da", "From")} ${esc(ctx, nameOf(ctx, attackerId))}</p>`;
  const list = rows.length
    ? `<ul class="knowledge-mods" data-knowledge-mods>${rows.map((r) => `<li class="tone-${esc(ctx, r.tone)}">${esc(ctx, say(ctx, r.text))} <small>${esc(ctx, sourceText(ctx, r.source))}</small></li>`).join("")}</ul>`
    : `<p class="muted" data-knowledge-mods>${ctx.t("Nessun modificatore di copertura o visibilità.", "No cover or visibility modifier.")}</p>`;
  const pick = D.pickpocketThieves(ctx.state, targetId, ctx.role).length
    ? button(
        `data-knowledge-pickpocket="${esc(ctx, targetId)}"`,
        ctx.t("Borseggia…", "Pickpocket…"),
      )
    : "";
  return `<div class="knowledge-block" data-knowledge-modifiers="${esc(ctx, targetId)}"><h4>${ctx.t("Modificatori contro questo bersaglio", "Modifiers against this target")}</h4>${select}${list}<p class="knowledge-actions">${button(`data-knowledge-los-check="${esc(ctx, targetId)}" data-from="${esc(ctx, attackerId)}"`, `${ctx.icon("eye")} ${ctx.t("Verifica la linea di vista", "Check line of sight")}`)}${pick}</p></div>`;
}
function losResultHTML(ctx) {
  const los = ui.los;
  if (!los || los.sceneId !== ctx.state.activeSceneId) return "";
  const scene = sceneOf(ctx);
  const result = D.losCheck(ctx.state, scene, los.from, los.to, ctx.role);
  if (!result) return "";
  const colour = C.checkColour(result.degree);
  const text =
    result.degree === "none"
      ? ctx.t("Linea libera: nessuna copertura", "Clear line: no cover")
      : say(ctx, C.DEGREE[result.degree]?.name);
  const endpoint = (e) => (e.actorId ? nameOf(ctx, e.actorId) : ctx.t("punto", "point"));
  return `<div class="knowledge-block knowledge-los is-${colour}" data-knowledge-los="${esc(ctx, result.degree)}"><h4>${ctx.t("Linea di vista (privata)", "Line of sight (private)")}</h4><p>${esc(ctx, endpoint(los.from))} → ${esc(ctx, endpoint(los.to))}: <strong>${esc(ctx, text)}</strong></p><p class="muted" data-knowledge-rays-text>${ctx.t("9 linee", "9 lines")}: ${esc(ctx, raysText(ctx, result))}</p><p class="knowledge-actions">${button("data-knowledge-los-share", ctx.t("Mostra a tutti", "Show everyone"), "primary")}${button("data-knowledge-los-clear", ctx.t("Cancella", "Clear"), "quiet")}</p><p class="knowledge-pattern">${sourceLink(ctx, C.COVER_SOURCE)} · ${sourceLink(ctx, C.METHOD_SOURCE)}</p></div>`;
}
function sharedHTML(ctx) {
  const list = sliceOf(ctx.state).shared?.[ctx.state.activeSceneId] ?? [];
  const scene = sceneOf(ctx);
  const visible = list.filter(
    (e) => visibleEndpoint(ctx, scene, e.from) && visibleEndpoint(ctx, scene, e.to),
  );
  if (!visible.length) return "";
  return `<div class="knowledge-block" data-knowledge-shared><h4>${ctx.t("Linee di vista condivise", "Shared lines of sight")}</h4><ul>${visible
    .map((e) => {
      const result = D.losCheck(ctx.state, scene, e.from, e.to, ctx.role);
      const text = !result
        ? "—"
        : result.degree === "none"
          ? ctx.t("libera", "clear")
          : say(ctx, C.DEGREE[result.degree]?.name);
      const name = (p) => (p.actorId ? nameOf(ctx, p.actorId) : ctx.t("punto", "point"));
      const removable = e.by === ctx.role || ctx.role === "dm";
      return `<li data-knowledge-shared-row="${esc(ctx, e.id)}">${esc(ctx, name(e.from))} → ${esc(ctx, name(e.to))}: ${esc(ctx, text)}${removable ? ` ${button(`data-knowledge-unshare="${esc(ctx, e.id)}"`, ctx.t("Togli", "Remove"), "quiet")}` : ""}</li>`;
    })
    .join("")}</ul></div>`;
}
function visibleEndpoint(ctx, scene, e) {
  if (!e?.actorId) return true;
  return D.observes(ctx.state, D.tokenOf(scene, e.actorId), ctx.role);
}
function panelHTML(ctx, tableView) {
  const scene = tableView?.scene ?? sceneOf(ctx);
  if (!scene) return "";
  const selected = tableView?.selectedActorId;
  const dm = ctx.role === "dm";
  const parts = [];
  if (dm) {
    const pending = pickListHTML(
      ctx,
      (r) => ["asked", "failed"].includes(r.status) || (r.status === "done" && r.outcome?.transfer),
    );
    if (pending)
      parts.push(
        `<div class="knowledge-block" data-knowledge-dm-picks><h4>${ctx.t("Borseggi", "Pickpockets")}</h4>${pending}</div>`,
      );
  }
  const actor = selected ? ctx.state.actors[selected] : null;
  if (actor && D.tokenOf(scene, selected)) {
    const own = controls(ctx, selected);
    if (own) parts.push(stealthBlock(ctx, selected), passiveBlock(ctx, selected));
    if (actor.kind === "npc" && (dm || D.observes(ctx.state, D.tokenOf(scene, selected), ctx.role)))
      parts.push(knowledgeBlock(ctx, selected));
    if (!own) {
      const acting = actingId(ctx, scene, null);
      if (acting && acting !== selected) parts.push(modifiersBlock(ctx, acting, selected));
    }
  }
  parts.push(foundHTML(ctx, scene), losResultHTML(ctx), sharedHTML(ctx));
  return `<div class="knowledge-panel" data-knowledge-panel>${parts.filter(Boolean).join("")}</div>`;
}
/**
 * P6 TV-138 (BG3's search list): what the searches of this scene found, kept in view (not only
 * a passing message), with who found it and the total. Only what this viewer may see.
 */
function foundHTML(ctx, scene) {
  const rows = D.foundOn(sliceOf(ctx.state), scene.id)
    .map((row) => {
      let name = null;
      if (row.kind === "creature") {
        const token = D.tokenOf(scene, row.id);
        if (token && !D.observes(ctx.state, token, ctx.role)) return "";
        name = nameOf(ctx, row.id);
      } else if (row.kind === "trap") name = traps?.regionOf?.(ctx.state, row.id)?.publicName;
      else {
        const point = TD.pointsOf(ctx.state.ext?.[TD.ID], scene.id).find((p) => p.id === row.id);
        name = point ? TD.pick(point.name, ctx.lang) : null;
      }
      if (!name) return "";
      const what = {
        creature: ctx.t("creatura nascosta", "hidden creature"),
        trap: ctx.t("trappola", "trap"),
        point: ctx.t("oggetto o contenitore", "object or container"),
      }[row.kind];
      return `<li data-knowledge-found="${esc(ctx, row.kind + ":" + row.id)}"><strong>${esc(ctx, name)}</strong> <small class="muted">${esc(ctx, what)} · ${esc(ctx, nameOf(ctx, row.finderId))} (${row.total})</small></li>`;
    })
    .filter(Boolean);
  if (!rows.length) return "";
  return `<div class="knowledge-block" data-knowledge-found-list><h4>${ctx.t("Trovato in questa scena", "Found in this scene")}</h4><ul class="knowledge-found">${rows.join("")}</ul></div>`;
}
// A DM creature hiding in secret: every change to its hiding stays in the DM's log.
const secretly = (ctx, actorId) =>
  D.hiddenInSecret(ctx.state, actorId) ? { visibility: "private" } : {};
function guard(ctx, run) {
  try {
    run();
  } catch (error) {
    ctx.toast(localized(ctx, error), true);
  }
}
function bindPanel(el, ctx, table) {
  ui.table = table;
  const on = (selector, handler) =>
    el
      .querySelectorAll(selector)
      .forEach((node) =>
        node.addEventListener("click", (event) => guard(ctx, () => handler(node, event))),
      );
  on("[data-knowledge-examine]", (b) => openExamine(ctx, b.dataset.knowledgeExamine));
  on("[data-knowledge-study]", (b) => openStudy(ctx, b.dataset.knowledgeStudy));
  on("[data-knowledge-conceal]", (b) => openIdentity(ctx, b.dataset.knowledgeConceal));
  on("[data-knowledge-reveal]", (b) => revealIdentity(ctx, b.dataset.knowledgeReveal));
  on("[data-knowledge-hide]", (b) => openHide(ctx, b.dataset.knowledgeHide));
  on("[data-knowledge-search]", (b) => openSearch(ctx, b.dataset.knowledgeSearch));
  on("[data-knowledge-unhide]", (b) =>
    act(
      ctx,
      ctx.t(
        `${nameOf(ctx, b.dataset.knowledgeUnhide)} smette di nascondersi`,
        `${nameOf(ctx, b.dataset.knowledgeUnhide)} stops hiding`,
      ),
      (s, slice) =>
        D.stopHiding(s, slice, { actorId: b.dataset.knowledgeUnhide, reason: "chosen" }, ctx.role),
      secretly(ctx, b.dataset.knowledgeUnhide),
    ),
  );
  on("[data-knowledge-noise]", (b) =>
    act(
      ctx,
      ctx.t(
        `${nameOf(ctx, b.dataset.knowledgeNoise)} non è più nascosta: rumore`,
        `${nameOf(ctx, b.dataset.knowledgeNoise)} is no longer hidden: noise`,
      ),
      (s, slice) =>
        D.stopHiding(s, slice, { actorId: b.dataset.knowledgeNoise, reason: "sound" }, ctx.role),
      secretly(ctx, b.dataset.knowledgeNoise),
    ),
  );
  on("[data-knowledge-found]", (b) =>
    act(
      ctx,
      ctx.t(
        `${nameOf(ctx, b.dataset.knowledgeFound)} trovata da ${nameOf(ctx, b.dataset.finder)}`,
        `${nameOf(ctx, b.dataset.knowledgeFound)} found by ${nameOf(ctx, b.dataset.finder)}`,
      ),
      (s, slice) =>
        D.dmEndHidden(
          s,
          slice,
          { actorId: b.dataset.knowledgeFound, finderId: b.dataset.finder },
          ctx.role,
        ),
      // Found by a character: its players learn it (shared), like a successful Search.
    ),
  );
  on("[data-knowledge-dm-end]", (b) =>
    openReason(
      ctx,
      ctx.t("Termina il nascondersi", "End hiding"),
      ctx.t("Motivo del DM", "DM's reason"),
      (reason) =>
        act(
          ctx,
          ctx.t(
            `${nameOf(ctx, b.dataset.knowledgeDmEnd)} non è più nascosta`,
            `${nameOf(ctx, b.dataset.knowledgeDmEnd)} is no longer hidden`,
          ),
          (s, slice) =>
            D.dmEndHidden(s, slice, { actorId: b.dataset.knowledgeDmEnd, note: reason }, ctx.role),
          secretly(ctx, b.dataset.knowledgeDmEnd),
        ),
      ctx.t("Termina", "End"),
    ),
  );
  on("[data-knowledge-keep]", (b) =>
    openReason(
      ctx,
      ctx.t("Mantieni nascosta", "Keep hidden"),
      ctx.t("Motivo della correzione", "Reason for the correction"),
      (reason) =>
        act(
          ctx,
          ctx.t("Correzione del DM: resta nascosta", "DM correction: stays hidden"),
          (s, slice) =>
            D.keepHidden(s, slice, { eventId: b.dataset.knowledgeKeep, reason }, ctx.role),
          D.lossInSecret(ctx.state, b.dataset.knowledgeKeep) ? { visibility: "private" } : {},
        ),
      ctx.t("Mantieni", "Keep"),
    ),
  );
  on("[data-knowledge-sight]", () => {
    ui.showSight = !ui.showSight;
    ctx.render();
  });
  on("[data-knowledge-pickpocket]", (b) => openPickpocket(ctx, b.dataset.knowledgePickpocket));
  on("[data-knowledge-decide]", (b) => openDecide(ctx, b.dataset.knowledgeDecide));
  on("[data-knowledge-pickroll]", (b) => openPickRoll(ctx, b.dataset.knowledgePickroll));
  on("[data-knowledge-withdraw]", (b) =>
    act(ctx, ctx.t("Borseggio ritirato", "Pickpocket withdrawn"), (s, slice) =>
      D.withdrawPickpocket(s, slice, { requestId: b.dataset.knowledgeWithdraw }, ctx.role),
    ),
  );
  on("[data-knowledge-noticed]", (b) =>
    act(
      ctx,
      b.dataset.value === "yes"
        ? ctx.t("Borseggio fallito: se ne accorge", "Pickpocket failed: it notices")
        : ctx.t("Borseggio fallito: non se ne accorge", "Pickpocket failed: it doesn't notice"),
      (s, slice) =>
        D.settlePickpocket(
          s,
          slice,
          { requestId: b.dataset.knowledgeNoticed, noticed: b.dataset.value === "yes" },
          ctx.role,
        ),
    ),
  );
  on("[data-knowledge-revert]", (b) =>
    openReason(
      ctx,
      ctx.t("Annulla il borseggio", "Undo the pickpocket"),
      ctx.t("Motivo della correzione", "Reason for the correction"),
      (reason) =>
        act(ctx, ctx.t("Borseggio annullato dal DM", "Pickpocket undone by the DM"), (s, slice) =>
          D.revertPickpocket(s, slice, { requestId: b.dataset.knowledgeRevert, reason }, ctx.role),
        ),
      ctx.t("Rimetti a posto", "Put it back"),
    ),
  );
  on("[data-knowledge-los-check]", (b) => {
    ui.los = {
      sceneId: ctx.state.activeSceneId,
      from: { actorId: b.dataset.from },
      to: { actorId: b.dataset.knowledgeLosCheck },
    };
    ctx.render();
    focusLater("[data-knowledge-los] h4");
  });
  on("[data-knowledge-los-clear]", () => {
    ui.los = null;
    ctx.render();
  });
  on("[data-knowledge-los-share]", () => shareLos(ctx));
  on("[data-knowledge-unshare]", (b) =>
    act(ctx, ctx.t("Linea di vista tolta", "Line of sight removed"), (s, slice) =>
      D.removeCheck(
        s,
        slice,
        { sceneId: ctx.state.activeSceneId, id: b.dataset.knowledgeUnshare },
        ctx.role,
      ),
    ),
  );
  el.querySelector("[data-knowledge-from]")?.addEventListener("change", (e) => {
    ui.acting[ctx.role] = e.target.value;
    ctx.render();
  });
}
function focusLater(selector) {
  if (typeof document === "undefined") return;
  requestAnimationFrame?.(() => {
    const node = document.querySelector(selector);
    if (node) {
      node.tabIndex = -1;
      node.focus();
    }
  });
}
function shareLos(ctx) {
  const los = ui.los;
  if (!los) return;
  const done = act(
    ctx,
    ctx.t("Linea di vista mostrata a tutti", "Line of sight shown to everyone"),
    (s, slice) =>
      D.shareCheck(s, slice, { sceneId: los.sceneId, from: los.from, to: los.to }, ctx.role),
  );
  if (done) {
    ui.los = null;
    ctx.render();
  }
}

// ------------------------------------------------------------------ map layers
const RAY = { clear: "#f4efe2", partial: "#f2da5a", blocked: "#e0625c" };
function raysSVG(result, cls) {
  if (!result?.rays?.length) return "";
  const colour = C.checkColour(result.degree);
  return `<g class="knowledge-rays ${cls} is-${colour}" data-knowledge-rays="${result.degree}">${result.rays
    .map(
      (r) =>
        `<line x1="${r.from.x}" y1="${r.from.y}" x2="${r.to.x}" y2="${r.to.y}" stroke="${RAY[r.status]}" data-ray="${r.status}"/>`,
    )
    .join(
      "",
    )}<circle cx="${result.origin.x}" cy="${result.origin.y}" r="5" fill="${RAY[colour]}"/></g>`;
}
function chipSVG(ctx, x, y, lines, tone = "partial", attrs = "") {
  const width = Math.max(90, ...lines.map((l) => l.length * 7.2 + 20));
  const height = 18 * lines.length + 10;
  return `<g class="knowledge-chip tone-${tone}" transform="translate(${Math.round(x - width / 2)},${Math.round(y)})" ${attrs}><rect width="${width}" height="${height}" rx="7"/>${lines.map((line, i) => `<text x="${width / 2}" y="${19 + i * 18}" text-anchor="middle">${esc(ctx, line)}</text>`).join("")}</g>`;
}
function hiddenMarksSVG(ctx, scene) {
  return (
    Object.keys(sliceOf(ctx.state).hidden ?? {})
      .map((id) => D.tokenOf(scene, id))
      // Only its controllers and the DM see the mark: a player never learns from it that a
      // DM creature is hiding there.
      .filter(
        (token) => token && D.observes(ctx.state, token, ctx.role) && controls(ctx, token.actorId),
      )
      .map(
        (token) =>
          `<g class="knowledge-hidden-mark" transform="translate(${token.x - 22},${token.y - 22})" data-knowledge-hidden-mark="${esc(ctx, token.actorId)}"><title>${esc(ctx, ctx.t("Nascosta", "Hidden"))}</title><circle r="10"/><path d="M-6 0q6-6 12 0q-6 6-12 0M-6 6 6-6" fill="none"/></g>`,
      )
      .join("")
  );
}
function marksSVG(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene) return "";
  const shared = (sliceOf(ctx.state).shared?.[scene.id] ?? [])
    .filter((e) => visibleEndpoint(ctx, scene, e.from) && visibleEndpoint(ctx, scene, e.to))
    .map((e) => raysSVG(D.losCheck(ctx.state, scene, e.from, e.to, ctx.role), "is-shared"))
    .join("");
  const own =
    ui.los && ui.los.sceneId === scene.id
      ? raysSVG(D.losCheck(ctx.state, scene, ui.los.from, ui.los.to, ctx.role), "is-private")
      : "";
  return `<g class="knowledge-marks">${shared}${own}${hiddenMarksSVG(ctx, scene)}<g data-knowledge-live></g></g>`;
}
// P6 TV-44 (Owlbear Peekaboo): the result written on the map by the target, with its privacy
// switch («Solo per me» / «Mostra a tutti») and a visible «Togli».
function hudButton(ctx, x, y, width, attrs, text) {
  return `<g class="knowledge-hud-button" role="button" tabindex="0" transform="translate(${Math.round(x)},${Math.round(y)})" ${attrs}><rect width="${width}" height="24" rx="6"/><text x="${width / 2}" y="16" text-anchor="middle">${esc(ctx, text)}</text></g>`;
}
function losHudSVG(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene) return "";
  const rows = [];
  if (ui.los && ui.los.sceneId === scene.id) rows.push({ los: ui.los, shared: null });
  for (const entry of sliceOf(ctx.state).shared?.[scene.id] ?? [])
    if (visibleEndpoint(ctx, scene, entry.from) && visibleEndpoint(ctx, scene, entry.to))
      rows.push({ los: entry, shared: entry });
  return rows
    .map(({ los, shared }) => {
      const result = D.losCheck(ctx.state, scene, los.from, los.to, ctx.role);
      const target = D.resolveEndpoint(ctx.state, scene, los.to);
      if (!result || !target) return "";
      const text = C.coverText(result.degree, ctx.lang);
      const width = Math.max(150, text.length * 7.2 + 24);
      const x = Math.min(scene.width - width - 4, Math.max(4, target.x - width / 2));
      const y = Math.min(scene.height - 80, target.y + 34);
      const mine = !shared || shared.by === ctx.role || ctx.role === "dm";
      const id = shared ? esc(ctx, shared.id) : "";
      // Under the two-line chip (18 per line + 10), the switch and «Togli».
      const row = y + 52;
      const privacy = shared
        ? mine
          ? hudButton(
              ctx,
              x,
              row,
              104,
              `data-knowledge-hud="private" data-id="${id}"`,
              ctx.t("Solo per me", "Only for me"),
            )
          : ""
        : hudButton(
            ctx,
            x,
            row,
            104,
            'data-knowledge-hud="share"',
            ctx.t("Mostra a tutti", "Show everyone"),
          );
      const remove = mine
        ? hudButton(
            ctx,
            x + 110,
            row,
            64,
            `data-knowledge-hud="remove" data-id="${id}"`,
            ctx.t("Togli", "Remove"),
          )
        : "";
      const who = shared
        ? ctx.t("visibile a tutti", "visible to everyone")
        : ctx.t("solo per te", "only for you");
      return `<g class="knowledge-hud is-${C.checkColour(result.degree)}" data-knowledge-hud-for="${shared ? id : "private"}">${chipSVG(ctx, x + width / 2, y, [text, who], C.checkColour(result.degree) === "clear" ? "good" : C.checkColour(result.degree) === "blocked" ? "bad" : "partial", "data-knowledge-hud-text")}${privacy}${remove}</g>`;
    })
    .join("");
}
function bindHud(el, ctx) {
  const run = (node) => {
    const kind = node.dataset.knowledgeHud;
    if (kind === "share") return shareLos(ctx);
    if (kind === "remove" && !node.dataset.id) {
      ui.los = null;
      ctx.render();
      return;
    }
    const sceneId = ctx.state.activeSceneId;
    const entry = (sliceOf(ctx.state).shared?.[sceneId] ?? []).find(
      (e) => e.id === node.dataset.id,
    );
    if (!entry) return;
    act(ctx, ctx.t("Linea di vista tolta", "Line of sight removed"), (s, slice) =>
      D.removeCheck(s, slice, { sceneId, id: entry.id }, ctx.role),
    );
    // «Solo per me»: the check comes back as this viewer's private one.
    if (kind === "private") {
      ui.los = { sceneId, from: entry.from, to: entry.to };
      ctx.render();
    }
  };
  el.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.("[data-knowledge-hud]")) event.stopPropagation();
  });
  el.addEventListener("click", (event) => {
    const node = event.target.closest?.("[data-knowledge-hud]");
    if (!node) return;
    event.stopPropagation();
    run(node);
  });
  el.addEventListener("keydown", (event) => {
    const node = event.target.closest?.("[data-knowledge-hud]");
    if (!node || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    run(node);
  });
}
/** BG3 sight areas (CRP-144): what each enemy of the acting creature could see, walls only. */
function sightSVG(ctx, tableView) {
  if (!(ui.showSight || ui.shiftSight)) return "";
  const scene = tableView?.scene;
  const acting = actingId(ctx, scene, tableView?.selectedActorId);
  if (!scene || !acting) return "";
  return `<g class="knowledge-sight" data-knowledge-sight-layer="${esc(ctx, acting)}">${D.opponentsOf(
    ctx.state,
    acting,
  )
    .map((id) => D.tokenOf(scene, id))
    .filter((token) => token && D.observes(ctx.state, token, ctx.role))
    .map((token) => {
      const points = C.sightArea(scene, token);
      return points.length
        ? `<polygon points="${points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ")}" data-sight-of="${esc(ctx, token.actorId)}"/>`
        : "";
    })
    .join("")}</g>`;
}
function redrawSight(ctx) {
  if (!ui.sightEl?.isConnected || !ui.table) return;
  ui.sightEl.innerHTML = sightSVG(ctx, {
    scene: ui.table.scene,
    selectedActorId: ui.table.selectedActorId,
  });
}
function live(html) {
  if (ui.liveEl?.isConnected) ui.liveEl.innerHTML = html;
}
const afterFrame = (fn) =>
  typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : fn();
function coverChip(ctx, actorId, point) {
  const rows = D.coverAtDestination(ctx.state, actorId, point, ctx.role);
  if (!rows.length) return "";
  const worst = rows.reduce((a, b) => (C.rankOf(b.degree) < C.rankOf(a.degree) ? b : a));
  const lines = rows
    .slice(0, 3)
    .map(
      (r) =>
        `${r.name}: ${r.degree === "none" ? ctx.t("scoperta", "exposed") : C.DEGREE[r.degree].short}`,
    );
  const tone = worst.degree === "none" ? "bad" : worst.degree === "total" ? "good" : "partial";
  return chipSVG(
    ctx,
    point.x,
    point.y + 30,
    [ctx.t("Copertura qui", "Cover here"), ...lines],
    tone,
    `data-knowledge-cover-chip="${esc(ctx, worst.degree)}"`,
  );
}
function targetChip(ctx, attackerId, targetId) {
  const scene = sceneOf(ctx);
  const token = D.tokenOf(scene, targetId);
  if (!token) return "";
  const rows = D.targetModifiers(ctx.state, attackerId, targetId, ctx.role);
  const lines = rows.map((r) => say(ctx, r.text));
  let rolled = null;
  if (hasCombatPreview(ctx, attackerId)) {
    // F15: the roll's own Advantage/Disadvantage (Prone attacker, a condition on either side)
    // reads here as in the attack panel.
    rolled = previewRollMode(ctx, attackerId, targetId);
    if (rolled && rolled.mode !== "normal")
      lines.unshift(
        `${rolled.mode === "advantage" ? ctx.t("Vantaggio", "Advantage") : ctx.t("Svantaggio", "Disadvantage")}: ${rolled.reasons.join(", ")}`,
      );
    const cached = ui.previewRows.get(`${ctx.role}:${attackerId}:${targetId}`);
    const chance = cached?.find((r) => r.code === "hit-chance");
    if (chance) lines.push(say(ctx, chance.name));
  }
  if (!lines.length) lines.push(ctx.t("Nessun modificatore", "No modifier"));
  const tone = rows.some((r) => r.tone === "blocked")
    ? "bad"
    : rows.length || rolled?.mode === "disadvantage"
      ? "partial"
      : "good";
  return chipSVG(
    ctx,
    token.x,
    token.y + 52,
    lines,
    tone,
    `data-knowledge-target-chip="${esc(ctx, targetId)}"`,
  );
}
function bindMarks(el, ctx, table) {
  ui.table = table;
  ui.liveEl = el.querySelector("[data-knowledge-live]");
  const svg = table?.svg;
  if (!svg) return;
  svg.addEventListener("pointerdown", (e) => {
    const id = e.target.closest?.("[data-actor]")?.dataset.actor;
    if (table.mode === "move" && id && controls(ctx, id))
      ui.drag = { actorId: id, pointerId: e.pointerId, moved: false };
  });
  svg.addEventListener("pointermove", (e) => {
    if (ui.gesture) return;
    const point = table.point(e);
    if (ui.drag && ui.drag.pointerId === e.pointerId) {
      ui.drag.moved = true;
      return live(coverChip(ctx, ui.drag.actorId, point));
    }
    if (table.mode === "plan" && table.selectedActorId && controls(ctx, table.selectedActorId))
      return live(coverChip(ctx, table.selectedActorId, point));
    const hovered = e.target.closest?.("[data-actor]")?.dataset.actor;
    const attacker = table.selectedActorId;
    if (
      hovered &&
      attacker &&
      hovered !== attacker &&
      controls(ctx, attacker) &&
      D.observes(ctx.state, D.tokenOf(table.scene, hovered), ctx.role)
    )
      // After the Table's own handler (registered after this layer's bind) has refreshed
      // the attack preview, so the chip reads the chance of the target under the pointer.
      return afterFrame(() => live(targetChip(ctx, attacker, hovered)));
    live("");
  });
  const end = () => {
    ui.drag = null;
    live("");
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("pointerleave", () => {
    if (!ui.drag) live("");
  });
}

// ------------------------------------------------------------------ Line of sight tool (VTL-138)
/**
 * The token under the pointer (by position: the tool captures the pointer, so the event
 * target is the map), or the point itself. Only tokens this viewer sees can be picked.
 */
function endpointAt(ctx, table, e) {
  const p = table.point(e);
  const reach = (table.scene.gridSize || 50) / 2;
  const hit = (table.scene.tokens ?? [])
    .filter((t) => Math.hypot(t.x - p.x, t.y - p.y) <= reach && D.observes(ctx.state, t, ctx.role))
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  return hit ? { actorId: hit.actorId } : { x: Math.round(p.x), y: Math.round(p.y) };
}
/** "9 lines: 5 clear · 4 through creatures · 0 blocked" (Peekaboo white/yellow/red). */
function raysText(ctx, result) {
  const n = { clear: 0, partial: 0, blocked: 0 };
  for (const ray of result.rays ?? []) n[ray.status]++;
  return [
    n.clear && `${n.clear} ${ctx.t("libere", "clear")}`,
    n.partial && `${n.partial} ${ctx.t("attraverso creature", "through creatures")}`,
    n.blocked && `${n.blocked} ${ctx.t("bloccate", "blocked")}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
const losTool = {
  id: "knowledge-los",
  label: L("Linea di vista", "Line of sight"),
  icon: "eye",
  group: "measure",
  order: 46,
  deactivate() {
    ui.gesture = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault?.();
    ui.gesture = { from: endpointAt(ctx, table, e), to: null };
    table.svg.setPointerCapture?.(e.pointerId);
  },
  onPointerMove(ctx, e, table) {
    if (!ui.gesture) return;
    const to = endpointAt(ctx, table, e);
    ui.gesture.to = to;
    const result = D.losCheck(ctx.state, table.scene, ui.gesture.from, to, ctx.role);
    live(raysSVG(result, "is-live"));
  },
  onPointerUp(ctx, e, table) {
    const g = ui.gesture;
    ui.gesture = null;
    if (!g) return;
    const to = g.to ?? endpointAt(ctx, table, e);
    const a = D.resolveEndpoint(ctx.state, table.scene, g.from);
    const b = D.resolveEndpoint(ctx.state, table.scene, to);
    if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) < 10) {
      live("");
      return table.message(
        ctx.t(
          "Trascina da una pedina o da un punto fino al bersaglio.",
          "Drag from a token or a point to the target.",
        ),
      );
    }
    ui.los = { sceneId: table.scene.id, from: g.from, to };
    const result = D.losCheck(ctx.state, table.scene, g.from, to, ctx.role);
    // The render rebuilds the status line: the result is written after it (TV-44).
    ctx.render();
    const line = `${C.coverText(result.degree, ctx.lang)} · ${raysText(ctx, result)}`;
    globalThis.document?.querySelector("#content #map-message")?.replaceChildren(line);
  },
  onClick() {},
  onKeyDown(ctx, e) {
    if (e.key === "Escape" && ui.los) {
      ui.los = null;
      e.preventDefault();
      ctx.render();
    }
  },
};

// ------------------------------------------------------------------ DM name projection
// Like B12's hidden names: the shared data keeps the unidentified name, so no player screen
// can print the true one; on the DM's screen (outside the map) the true name is appended.
let observer = null;
function projectText(node, list) {
  const parent = node.parentElement;
  if (!parent || parent.closest("script,style,textarea,#battle-map,[data-knowledge-raw],svg"))
    return;
  const block = (
    parent.closest("li,p,button,h1,h2,h3,h4,td,th,label,option,summary,strong,dd,dt,span") ?? parent
  ).textContent;
  let text = node.data;
  for (const p of list) {
    if (!text.includes(p.from) || block.includes(p.trueName)) continue;
    const to = `${p.from} · ${p.trueName}`;
    text = text.split(p.from).join(to);
  }
  if (text !== node.data) node.data = text;
}
export function projectAliases(root, state, role) {
  if (!root || role !== "dm") return;
  const list = D.aliasProjections(state);
  if (!list.length) return;
  if (root.nodeType === 3) return projectText(root, list);
  if (root.nodeType !== 1) return;
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (list.some((p) => n.data.includes(p.from))) texts.push(n);
  texts.forEach((n) => projectText(n, list));
}
function installProjection(registry) {
  if (observer || typeof MutationObserver === "undefined" || !globalThis.document?.body) return;
  const run = (records) => {
    const ctx = registry.ctx;
    if (!ctx?.state || ctx.role !== "dm" || !D.aliasProjections(ctx.state).length) return;
    const roots = records
      ? records.flatMap((r) => (r.type === "childList" ? [...r.addedNodes] : [r.target]))
      : [document.body];
    for (const root of roots) if (root.isConnected) projectAliases(root, ctx.state, ctx.role);
    observer.takeRecords();
  };
  observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  run(null);
}

// ------------------------------------------------------------------ Shift: sight areas
let keysInstalled = false;
function installKeys(registry) {
  if (keysInstalled || typeof document === "undefined") return;
  keysInstalled = true;
  const typing = (e) => e.target?.closest?.("input,textarea,select,[contenteditable=true]");
  document.addEventListener("keydown", (e) => {
    const ctx = registry.ctx;
    if (
      e.key !== "Shift" ||
      e.repeat ||
      typing(e) ||
      ctx?.view?.page !== "table" ||
      document.querySelector("#dialog[open]")
    )
      return;
    ui.shiftSight = true;
    redrawSight(ctx);
  });
  const release = () => {
    if (!ui.shiftSight) return;
    ui.shiftSight = false;
    if (registry.ctx) redrawSight(registry.ctx);
  };
  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") release();
  });
  globalThis.addEventListener?.("blur", release);
}

// ------------------------------------------------------------------ stealth loss watcher
let checkQueued = false;
/**
 * After any accepted change (never a preview or an Undo) the area checks whether a hidden
 * creature attacked, cast a Verbal spell, spoke aloud or lost its Invisible condition, and
 * records the explained loss in its own commit, once the triggering command has finished.
 */
export function runLossCheck(ctx) {
  const losses = D.detectLosses(ctx.state);
  if (!losses.length) return null;
  // Review B46-rf: a DM creature that hid in secret loses it in the DM's private log (the
  // players never learnt it hid); a character's loss is shared. The loss is a consequence of
  // the change that caused it, not an Undo step of its own: one Undo reverts the attack (or
  // the words said aloud) together with the loss, never the loss alone.
  const secret = losses.filter((loss) => D.hiddenInSecret(ctx.state, loss.actorId));
  const shared = losses.filter((loss) => !secret.includes(loss));
  for (const group of [shared, secret]) {
    if (!group.length) continue;
    const ids = new Set(group.map((loss) => loss.actorId));
    const names = group
      .map((l) => `${nameOf(ctx, l.actorId)} (${say(ctx, D.LOSS[l.reason])})`)
      .join(", ");
    try {
      ctx.commit(
        ctx.t(`Non più nascosta: ${names}`, `No longer hidden: ${names}`),
        (draft) => {
          const slice = area.slice(draft);
          for (const loss of D.detectLosses(draft))
            if (ids.has(loss.actorId)) D.endHidden(draft, slice, loss, ctx.role);
        },
        { undoable: false, ...(group === secret ? { visibility: "private" } : {}) },
      );
    } catch {
      // Offline or refused: the next accepted change checks again.
      return null;
    }
  }
  return losses;
}
function queueLossCheck(ctx) {
  if (checkQueued) return;
  checkQueued = true;
  queueMicrotask(() => {
    checkQueued = false;
    if (ctx?.state) runLossCheck(ctx);
  });
}

// A creature someone in this viewer's party could rob: an NPC they see on the scene, while
// they have a character there (adjacent or not: the menu says when they must move closer).
function pickpocketCandidate(ctx, targetId) {
  const scene = D.activeScene(ctx.state);
  const target = ctx.state.actors?.[targetId];
  const token = D.tokenOf(scene, targetId);
  if (!target || target.kind !== "npc" || !token || controls(ctx, targetId)) return false;
  if (ctx.role !== "dm" && !D.observes(ctx.state, token, ctx.role)) return false;
  return (scene.tokens ?? []).some((t) => {
    const actor = ctx.state.actors?.[t.actorId];
    return actor?.kind === "character" && t.actorId !== targetId && controls(ctx, actor.id);
  });
}
// ------------------------------------------------------------------ notifications
function notices(ctx) {
  const out = [];
  const slice = sliceOf(ctx.state);
  for (const r of slice.pickpocket) {
    const p = D.projectPickpocket(ctx.state, r, ctx.role);
    if (!p) continue;
    if (ctx.role === "dm" && r.status === "asked")
      out.push({
        id: `knowledge-pick-${r.id}-asked`,
        category: "request",
        title: L(
          `${nameOf(ctx, r.thiefId)} vuole borseggiare ${nameOf(ctx, r.targetId)}`,
          `${nameOf(ctx, r.thiefId)} wants to pickpocket ${nameOf(ctx, r.targetId)}`,
        ),
        body: L(
          "Apri per decidere la CD e che cosa è a portata.",
          "Open to decide the DC and what is in reach.",
        ),
        time: r.at,
        target: { page: "table", params: { id: "pickpocket:" + r.id } },
        actions: [
          {
            id: "decide",
            label: L("Decidi…", "Decide…"),
            primary: true,
            run: (ctx) =>
              ctx.view?.page === "table"
                ? openDecide(ctx, r.id)
                : ctx.navigate("table", { id: "pickpocket:" + r.id }),
          },
        ],
      });
    if (ctx.role === "dm" && r.status === "failed")
      out.push({
        id: `knowledge-pick-${r.id}-failed`,
        category: "request",
        title: L(
          `Borseggio fallito: ${nameOf(ctx, r.targetId)} se ne accorge?`,
          `Pickpocket failed: does ${nameOf(ctx, r.targetId)} notice?`,
        ),
        time: r.rolledAt ?? r.at,
        target: { page: "table", params: {} },
      });
    if (ctx.role !== "dm" && r.status === "ready")
      out.push({
        id: `knowledge-pick-${r.id}-ready`,
        category: "request",
        title: L(
          `Il DM consente il borseggio di ${nameOf(ctx, r.thiefId)}`,
          `The DM allows ${nameOf(ctx, r.thiefId)}'s pickpocket`,
        ),
        body: L(
          "Tira Rapidità di Mano dal pannello Creatura.",
          "Roll Sleight of Hand from the Creature panel.",
        ),
        time: r.decidedAt ?? r.at,
        target: { page: "table", params: {} },
      });
  }
  for (const e of slice.events.slice(-10))
    if (e.kind === "lost" && (ctx.role === "dm" || controls(ctx, e.actorId)))
      out.push({
        id: `knowledge-lost-${e.id}`,
        category: "table",
        title: L(
          `${nameOf(ctx, e.actorId)} non è più nascosta`,
          `${nameOf(ctx, e.actorId)} is no longer hidden`,
        ),
        body: D.LOSS[e.reason],
        time: e.at,
        target: { page: "table", params: {} },
      });
  return out;
}

// ------------------------------------------------------------------ registration
const selectedTarget = (ctx) => {
  const table = ui.table;
  const id = table?.selectedActorId;
  if (!id)
    throw Object.assign(new Error("Select a creature first."), {
      it: "Seleziona prima una creatura.",
      en: "Select a creature first.",
    });
  return id;
};
let providerInstalled = false;
let filterInstalled = false;
export function register(registry) {
  area = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  // Accepted dice stay as evidence across gameplay Undo (like the log and the travel rolls).
  registry.registerStateSlice(D.ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: D.seedRolls,
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./knowledge.css", import.meta.url));
  registry.add("settings", {
    id: D.POLICY,
    label: L("Conoscenza e probabilità (divulgazione)", "Knowledge and chances (disclosure)"),
    scope: "campaign",
    roles: ["dm"],
    fields: [
      {
        id: "mode",
        label: L("Bestiario dei giocatori", "Players' bestiary"),
        type: "choice",
        default: "graded",
        options: [
          {
            value: "graded",
            label: L(
              "Graduato: si scopre con le prove (Solasta)",
              "Graded: learnt through checks (Solasta)",
            ),
          },
          { value: "full", label: L("Tutto sbloccato", "Everything unlocked") },
        ],
      },
      {
        id: "hit-chance",
        label: L("Probabilità di colpire mostrata ai giocatori", "Chance to hit shown to players"),
        type: "choice",
        default: "never",
        options: [
          { value: "never", label: L("Mai (rivelerebbe la CA)", "Never (it would reveal AC)") },
          {
            value: "known",
            label: L(
              "Solo se il gruppo conosce la CA (livello 2/4)",
              "Only when the party knows the AC (level 2/4)",
            ),
          },
          { value: "always", label: L("Sempre (come BG3)", "Always (like BG3)") },
        ],
      },
    ],
  });
  registry.add("table-panel", {
    id: "knowledge",
    label: L("Conoscenza e furtività", "Knowledge and stealth"),
    order: 40,
    when: (ctx, tv) => Boolean(tv?.scene),
    render: panelHTML,
    bind: bindPanel,
  });
  registry.add("map-layer", {
    id: "knowledge-sight",
    label: L("Chi può vedere", "Who can see"),
    order: 36,
    svg: sightSVG,
    bind: (el, ctx, table) => {
      ui.sightEl = el;
      ui.table = table;
    },
  });
  registry.add("map-layer", {
    id: "knowledge-marks",
    label: L("Copertura e linee di vista", "Cover and lines of sight"),
    order: 72,
    svg: marksSVG,
    bind: bindMarks,
  });
  registry.add("map-layer", {
    id: "knowledge-los-hud",
    label: L("Risultato della linea di vista", "Line of sight result"),
    order: 73,
    interactive: true,
    svg: losHudSVG,
    bind: bindHud,
  });
  registry.add("table-tool", losTool);
  const menu = (id, label, when, run, extra = {}) =>
    registry.add("token-menu", { id, label, group: "knowledge", when, run, ...extra });
  const onScene = (ctx, target) => target?.sceneId === ctx.state.activeSceneId;
  menu(
    "knowledge-examine",
    L("Esamina", "Examine"),
    (ctx, target) => {
      const actor = ctx.state.actors[target?.actorId];
      return Boolean(
        actor?.kind === "npc" &&
        (ctx.role === "dm" ||
          D.observes(ctx.state, D.tokenOf(D.activeScene(ctx.state), actor.id), ctx.role)),
      );
    },
    (ctx, target) => openExamine(ctx, target.actorId),
  );
  menu(
    "knowledge-conceal",
    L("Nascondi identità…", "Hide identity…"),
    (ctx, target) =>
      ctx.state.actors[target?.actorId]?.kind === "npc" &&
      !D.unknownIdentity(ctx.state, target.actorId),
    (ctx, target) => openIdentity(ctx, target.actorId),
    { roles: ["dm"], submenu: "visibility" },
  );
  menu(
    "knowledge-reveal",
    L("Rivela identità", "Reveal identity"),
    (ctx, target) => Boolean(D.identityOf(ctx.state, target?.actorId)),
    (ctx, target) => revealIdentity(ctx, target.actorId),
    { roles: ["dm"], submenu: "visibility" },
  );
  menu(
    "knowledge-hide",
    L("Nasconditi…", "Hide…"),
    (ctx, target) =>
      onScene(ctx, target) &&
      controls(ctx, target.actorId) &&
      !sliceOf(ctx.state).hidden[target.actorId],
    (ctx, target) => openHide(ctx, target.actorId),
    { submenu: "actions" },
  );
  menu(
    "knowledge-unhide",
    L("Smetti di nasconderti", "Stop hiding"),
    (ctx, target) =>
      controls(ctx, target?.actorId) && Boolean(sliceOf(ctx.state).hidden[target.actorId]),
    (ctx, target) =>
      act(
        ctx,
        ctx.t(
          `${nameOf(ctx, target.actorId)} smette di nascondersi`,
          `${nameOf(ctx, target.actorId)} stops hiding`,
        ),
        (s, slice) =>
          D.stopHiding(s, slice, { actorId: target.actorId, reason: "chosen" }, ctx.role),
        secretly(ctx, target.actorId),
      ),
    { submenu: "actions" },
  );
  menu(
    "knowledge-search",
    L("Cerca", "Search"),
    (ctx, target) => onScene(ctx, target) && controls(ctx, target?.actorId),
    (ctx, target) => openSearch(ctx, target.actorId),
  );
  // P6 TV-142 (BG3 keeps it visible): «Borseggia» is in the menu of every creature you could
  // rob; out of reach it is greyed with the reason instead of missing.
  menu(
    "knowledge-pickpocket",
    L("Borseggia…", "Pickpocket…"),
    (ctx, target) => onScene(ctx, target) && pickpocketCandidate(ctx, target.actorId),
    (ctx, target) => openPickpocket(ctx, target.actorId),
    { submenu: "actions" },
  );
  setMenuReason("knowledge-pickpocket", (ctx, target) =>
    D.pickpocketThieves(ctx.state, target?.actorId, ctx.role).length
      ? null
      : L(
          "Avvicinati: serve un tuo personaggio adiacente (1,5 m).",
          "Move closer: one of your characters must be adjacent (1.5 m).",
        ),
  );
  registry.add("command", {
    id: "knowledge.pickpocket",
    label: L("Borseggia la creatura selezionata", "Pickpocket the selected creature"),
    description: L(
      "borseggio, rubare, sottrarre, rapidità di mano, infilare un oggetto",
      "pickpocket, steal, sleight of hand, plant an item",
    ),
    context: "table",
    group: "knowledge",
    run: (ctx) => openPickpocket(ctx, selectedTarget(ctx)),
  });
  // TV-142: the DM's bell entry opens the decision itself (Table › Creature is one more way).
  registry.on("navigate", (payload, env) => {
    const id = String(payload?.id ?? "");
    if (payload?.page !== "table" || !id.startsWith("pickpocket:")) return;
    const ctx = env?.ctx ?? area?.ctx;
    if (ctx) setTimeout(() => openDecide(ctx, id.slice("pickpocket:".length)), 0);
  });
  registry.add("command", {
    id: "knowledge.examine",
    label: L("Esamina la creatura selezionata", "Examine the selected creature"),
    context: "table",
    group: "knowledge",
    run: (ctx) => openExamine(ctx, selectedTarget(ctx)),
  });
  registry.add("command", {
    id: "knowledge.sight",
    label: L("Mostra o nascondi chi può vedere", "Show or hide who can see"),
    context: "table",
    group: "knowledge",
    run: (ctx) => {
      ui.showSight = !ui.showSight;
      ctx.render();
    },
  });
  registry.add("notifications", {
    id: "knowledge-notices",
    label: L("Borseggi e furtività", "Pickpockets and stealth"),
    collect: notices,
  });
  registry.on("commit", (payload, { ctx }) => {
    if (payload?.correction) return;
    queueLossCheck(ctx ?? registry.ctx);
  });
  registry.on("role-changed", () => resetKnowledgeView());
  registry.on("reset", () => resetKnowledgeView());
  registry.on("scene-activated", () => {
    ui.los = null;
  });
  // One provider for the module's lifetime (combat keeps it in a module-level set).
  if (!providerInstalled) {
    providerInstalled = true;
    addAttackModifierProvider?.((state, attackerId, targetId, action, context = {}) => {
      const rows = D.attackRows(state, attackerId, targetId, action, context);
      // The Table's modifiers under the target reuse the rows of the live attack preview.
      if (context.role) ui.previewRows.set(`${context.role}:${attackerId}:${targetId}`, rows);
      return rows;
    });
  }
  if (!filterInstalled) {
    filterInstalled = true;
    // The fog and vision (B35) hide a creature from a player: then this area says nothing of
    // it either (who sees you, cover, sight areas, lines of sight, examination).
    D.addVisibilityFilter((state, actorId, role) => {
      const ctx = area?.ctx;
      if (role === "dm" || !ctx || ctx.role !== role) return true;
      const model = fogModel(ctx, D.activeScene(ctx.state));
      return !model?.hiddenTokens?.includes(actorId);
    });
  }
  installProjection(registry);
  installKeys(registry);
}
