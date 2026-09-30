// B19 — Preparation: 2024 encounter builder. Entry module (register) and UI.
//
// Where it appears: Preparation → "Incontri" (DM), the Table drawer "Incontro" (DM:
// read-aloud, staged groups to activate, "Add all tokens"), a palette command. The domain
// (difficulty, rows, groups, hand-off, initiative, parser) is encounter-builder-domain.mjs.
// Pattern sources are listed there; this file copies their controls: DDB monster picker
// rows that expand to the stat block with "+ Add"/"Add again" (DDB-091/093), filter chips
// (DDB-092), the +/- counter, My Encounters with Duplicate/Restart/Resume (DDB-095/096),
// Kobold+ party panel and history (CMP-107/111), Battle Board "Staged" groups (VTL-085),
// Token Mold hand-off options (FVT-094, VTL-120), Roll20 2024 stat block with in-place
// edit (R20-102) and the FG/Shard parsed actions confirmed by the DM (R20-113, VTL-089).
// Rolls use the compendium's roll service (same plan/resolve functions, rollDie and the
// one roll log), with a physical-die alternative.

import * as srd from "./srd-sample.mjs";
import * as D from "./encounter-builder-domain.mjs";
import {
  rollPlan,
  resolvePlan,
  formulaText,
  validFace,
  abilityModifier,
  signed,
} from "./srd-compendium.mjs";
import { recordRoll } from "./compendium.mjs";
import { skills as RULE_SKILLS } from "./character-rules.mjs";
import { rollDie } from "./state.mjs";
import { getEntry } from "./srd-compendium.mjs";
import { initiativeConditionHint } from "./preparation.mjs";
// C3 (CA-57, Owlbear GM hand-off): the member running the session prepares encounters too.
import { runsSession } from "./session-view.mjs";

// The area id as a literal (the same value as D.ID): read at module evaluation, it must not
// depend on encounter-builder-domain having finished loading (the domain imports preparation,
// which imports this module: importing the domain first used to throw here).
const ID = "encounter-builder";
const L = (it, en) => ({ it, en });
const DRAFT = { local: true, visibility: "private" };
const SCENE = { visibility: "private" };
let registryRef = null;
const sliceOf = (state) => registryRef.slice(state, ID);
const runs = (ctx) => runsSession(ctx.state, ctx.role);
// C3: the collection's own edits (no state in the domain call) take the DM's authority for
// the session runner; commands that touch scenes and creatures pass the real role.
const authority = (ctx) => (runs(ctx) ? "dm" : ctx.role);
// Registry `when`: the builder's sections and commands are the session runner's.
const runsFor = (ctx) => runs(ctx);
const optionalSlice = (state, name) => (state?.ext?.[name] ? state.ext[name] : null);

// ---------------------------------------------------------------- per-viewer UI state

const uiByRole = new Map();
const UI_KEY = (role) => `d20-encounter-builder-ui:${role}`;
function session() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}
export function uiState(ctx) {
  if (!uiByRole.has(ctx.role)) {
    let saved = {};
    try {
      saved = JSON.parse(session()?.getItem(UI_KEY(ctx.role)) ?? "{}") ?? {};
    } catch {
      saved = {};
    }
    uiByRole.set(ctx.role, {
      openId: typeof saved.openId === "string" ? saved.openId : null,
      filters: { ...D.emptyFilters(), ...(saved.filters ?? {}) },
      expanded: null,
      editing: null,
      targetGroup: "main",
      search: "",
      sort: "saved",
      handoff: { numbering: "numbers", hideNames: true, hpMode: "average", sceneId: null },
      // PR-32: the encounter shown in each scene's editor (several may share a scene).
      sceneOpen: {},
    });
  }
  return uiByRole.get(ctx.role);
}
function saveUi(ctx) {
  const ui = uiState(ctx);
  try {
    session()?.setItem(
      UI_KEY(ctx.role),
      JSON.stringify({ openId: ui.openId, filters: ui.filters }),
    );
  } catch {
    // Storage blocked: the view state stays in memory for this visit.
  }
}
export function resetUi() {
  uiByRole.clear();
}

// ---------------------------------------------------------------- helpers

// Forms read through one seam so Node tests can pass a FormData without a DOM form.
const formDataOf = (form) => form.formData ?? new FormData(form);
const message = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
function act(ctx, label, mutator, options = DRAFT) {
  try {
    ctx.commit(label, (draft) => mutator(draft, sliceOf(draft)), options);
    return true;
  } catch (error) {
    ctx.toast(message(ctx, error), true);
    return false;
  }
}
// "14 / 7 → 14 + (2) = 16 · vantaggio · dado digitale" for the initiative toasts.
function initiativeToast(ctx, result) {
  const kept =
    result.faces?.length > 1 ? `${result.faces.join(" / ")} → ${result.natural}` : result.natural;
  const mode =
    {
      advantage: ` · ${ctx.t("vantaggio", "advantage")}`,
      disadvantage: ` · ${ctx.t("svantaggio", "disadvantage")}`,
    }[result.advantage] ?? "";
  return `${kept} + (${result.bonus}) = ${result.total}${mode} · ${result.mode === "digital" ? ctx.t("dado digitale", "digital die") : ctx.t("dado fisico", "physical die")}`;
}
const num = (ctx, value) =>
  // Grouped like the SRD tables ("1.200" / "1,200"), also for four digits in Italian.
  new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", { useGrouping: "always" }).format(
    Number(value) || 0,
  );
const date = (ctx, iso) => {
  try {
    return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};
const lbl = (ctx, value) => ctx.label(value);
// SRD names for Low/Moderate/High; Trivial and Deadly are Kobold+'s bands (CMP-106).
export function bandLabel(ctx, band) {
  if (srd.LABELS.encounterDifficulty[band]) return lbl(ctx, srd.LABELS.encounterDifficulty[band]);
  return {
    trivial: ctx.t("Banale", "Trivial"),
    deadly: ctx.t("Mortale", "Deadly"),
    empty: ctx.t("Nessuna creatura", "No creatures"),
    "no-party": ctx.t("Nessun personaggio", "No characters"),
  }[band];
}
const statusLabel = (ctx, status) =>
  ({
    draft: ctx.t("Bozza", "Draft"),
    prepared: ctx.t("Preparato", "Prepared"),
    running: ctx.t("In corso", "Running"),
    defeated: ctx.t("Creature sconfitte", "Creatures defeated"),
  })[status];
const refAttr = (ctx, ref) => ctx.esc(JSON.stringify(ref));
const readRef = (value) => {
  try {
    const ref = JSON.parse(value);
    return ref && (ref.creatureId || ref.blockId) ? ref : null;
  } catch {
    return null;
  }
};
function openEncounter(ctx) {
  const ui = uiState(ctx);
  const slice = ctx.state.ext?.[ID];
  return ui.openId ? (slice?.encounters.find((e) => e.id === ui.openId) ?? null) : null;
}
const sceneName = (ctx, id) => ctx.state.scenes.find((s) => s.id === id)?.name ?? "—";
// PR-32 (Foundry lists each encounter with its scene): the scene opens its editor, where
// this same encounter is edited.
function sceneLink(ctx, encounter) {
  const sceneId = D.sceneOfEncounter(encounter);
  if (!sceneId || !ctx.state.scenes.some((s) => s.id === sceneId))
    return ctx.esc(ctx.t("Non ancora su una scena", "Not on a scene yet"));
  return `${ctx.t("Scena", "Scene")}: <button type="button" class="text-button" data-eb="open-scene-of" data-id="${ctx.esc(encounter.id)}">${ctx.esc(sceneName(ctx, sceneId))}</button>${encounter.handoff ? "" : ctx.esc(ctx.t(" (non ancora preparato)", " (not prepared yet)"))}`;
}
const typeLabel = (ctx, block) =>
  `${lbl(ctx, srd.LABELS.creatureType[block.type] ?? L(block.type, block.type))}${
    block.typeTags?.length
      ? ` (${block.typeTags.map((tag) => lbl(ctx, srd.LABELS.creatureTag[tag] ?? L(tag, tag))).join(", ")})`
      : ""
  }`;
const sizeLabel = (ctx, block) =>
  (block.size ?? []).map((s) => lbl(ctx, srd.LABELS.size[s] ?? L(s, s))).join(ctx.t(" o ", " or "));
const crText = (ctx, block) => `${ctx.t("GS", "CR")} ${block.cr}`;
const xpText = (ctx, xp) => `${num(ctx, xp)} ${ctx.t("PE", "XP")}`;

// ---------------------------------------------------------------- stat block

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
function rollButton(ctx, ref, spec, text, aria) {
  return `<button type="button" class="eb-roll" data-eb-roll="${ctx.esc(JSON.stringify(spec))}" data-eb-ref="${refAttr(ctx, ref)}" aria-label="${ctx.esc(aria)}">${ctx.icon("dice")}<span>${ctx.esc(text)}</span></button>`;
}
function actionLines(ctx, block, ref, title, actions, editable) {
  if (!actions?.length) return "";
  return `<h5>${ctx.esc(title)}</h5>${actions
    .map((action) => {
      const name = lbl(ctx, action.name);
      const trusted = !block.custom || action.confirmed || !action.textEdited;
      const rolls = [];
      if (trusted && Number.isInteger(action.attack?.bonus))
        rolls.push(
          rollButton(
            ctx,
            ref,
            { kind: "attack", action: action.id },
            `${ctx.t("Colpire", "Hit")} ${signed(action.attack.bonus)}`,
            `${name}: ${ctx.t("tiro per colpire", "attack roll")} ${signed(action.attack.bonus)}`,
          ),
        );
      // The label shows every term the roll includes (compendium stat block, DDB-146).
      const dice = (action.damage ?? []).filter((d) => d.dice).map((d) => d.dice);
      if (trusted && dice.length)
        rolls.push(
          rollButton(
            ctx,
            ref,
            { kind: "damage", action: action.id },
            `${ctx.t("Danni", "Damage")} ${dice.join(" + ")}`,
            `${name}: ${ctx.t("danni", "damage")} ${dice.join(" + ")}`,
          ),
        );
      const proposal = action.proposal
        ? `<div class="eb-proposal" role="status" data-eb-proposal="${ctx.esc(action.id)}"><p><strong>${ctx.t("Riconosciuto dal testo", "Recognised from the text")}:</strong> ${ctx.esc(proposalText(ctx, action.proposal))}${action.proposal.rest ? `<br><span class="muted">${ctx.t("Resta da gestire a mano", "Left for you to handle")}: ${ctx.esc(action.proposal.rest)}</span>` : ""}</p>${editable ? `<div class="toolbar"><button type="button" class="button primary" data-eb="action-confirm" data-block="${ctx.esc(block.id)}" data-action="${ctx.esc(action.id)}">${ctx.t("Conferma azione", "Confirm action")}</button><button type="button" class="button quiet" data-eb="action-dismiss" data-block="${ctx.esc(block.id)}" data-action="${ctx.esc(action.id)}">${ctx.t("Lascia come testo", "Keep as text")}</button></div>` : ""}</div>`
        : "";
      const note =
        block.custom && action.textEdited && !action.confirmed && !action.proposal
          ? `<span class="muted eb-text-only">${ctx.t("Solo testo: nessun tiro automatico.", "Text only: no automatic roll.")}</span>`
          : "";
      // A custom text keeps one wording: in the other language it says which one it is.
      const textLang =
        action.textLang && action.textLang !== ctx.lang
          ? ` <span class="badge eb-text-lang" data-eb-text-lang="${ctx.esc(action.textLang)}">${action.textLang === "it" ? ctx.t("testo in italiano", "text in Italian") : ctx.t("testo in inglese", "text in English")}</span>`
          : "";
      return `<div class="eb-action" data-eb-action="${ctx.esc(action.id)}"><p><strong>${ctx.esc(name)}${action.recharge ? ` (${ctx.t("Ricarica", "Recharge")} ${ctx.esc(String(action.recharge).replace("-", "–"))})` : ""}.</strong> ${ctx.esc(lbl(ctx, action.summary))}${action.saveDc ? ` <span class="muted">${ctx.t("CD", "DC")} ${ctx.esc(action.saveDc)}</span>` : ""}${textLang} ${note}</p>${rolls.length ? `<div class="eb-rolls">${rolls.join("")}</div>` : ""}${proposal}</div>`;
    })
    .join("")}`;
}
function proposalText(ctx, proposal) {
  const a = proposal.attack;
  const kind = {
    melee: ctx.t("Attacco in mischia", "Melee attack"),
    ranged: ctx.t("Attacco a distanza", "Ranged attack"),
    "melee-or-ranged": ctx.t("Attacco in mischia o a distanza", "Melee or ranged attack"),
  }[a.type];
  const where = [
    a.reach ? `${ctx.t("portata", "reach")} ${srd.formatDistance(a.reach, ctx.lang)}` : "",
    a.range
      ? `${ctx.t("gittata", "range")} ${srd.formatDistance(a.range.normal, ctx.lang)}${a.range.long ? `/${srd.formatDistance(a.range.long, ctx.lang)}` : ""}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  const d = proposal.damage[0];
  return `${kind} ${signed(a.bonus)} · ${where} · ${d.dice} ${lbl(ctx, srd.LABELS.damageType[d.type])}`;
}
function sourceBadge(ctx, block) {
  if (block.custom)
    return `<span class="badge eb-badge-custom">${ctx.t("Blocco personalizzato", "Custom block")} · ${ctx.t("rev.", "rev.")} ${block.revision}</span>`;
  const pages = block.source?.[ctx.lang === "it" ? "it" : "en"]?.pages ?? block.source?.pages ?? [];
  return `<span class="badge">SRD 5.2.1 · ${ctx.lang === "it" ? "IT" : "EN"} p. ${pages.join("–")}</span>`;
}
export function blockHTML(ctx, block, ref, { editable = true, rowId = null } = {}) {
  const speed = Object.entries(block.speed ?? {})
    .filter(([key]) => key !== "hover")
    .map(
      ([key, feet]) =>
        `${key === "walk" ? "" : lbl(ctx, { fly: L("volare", "Fly"), swim: L("nuotare", "Swim"), climb: L("scalare", "Climb"), burrow: L("scavare", "Burrow") }[key] ?? L(key, key)) + " "}${srd.formatDistance(feet, ctx.lang)}`,
    )
    .join(", ");
  const abilityRows = ABILITIES.map((key) => {
    const score = block.abilities?.[key] ?? 10;
    const mod = abilityModifier(score);
    const save = block.saves?.[key] ?? mod;
    const name = lbl(ctx, srd.LABELS.ability[key]);
    return `<tr><th scope="row">${ctx.esc(name.slice(0, 3))}</th><td>${score}</td><td>${rollButton(ctx, ref, { kind: "check", ability: key }, signed(mod), `${ctx.t("Prova di", "Check")} ${name} ${signed(mod)}`)}</td><td>${rollButton(ctx, ref, { kind: "save", ability: key }, signed(save), `${ctx.t("Tiro salvezza su", "Saving throw")} ${name} ${signed(save)}`)}</td></tr>`;
  }).join("");
  const skills = Object.entries(block.skills ?? {}).map(
    ([id, bonus]) =>
      `${lbl(ctx, RULE_SKILLS.find((skill) => skill.id === id)?.name ?? L(id, id))} ${signed(bonus)}`,
  );
  const senses = [
    ...Object.entries(block.senses ?? {})
      .filter(([key]) => key !== "passivePerception")
      .map(
        ([key, feet]) =>
          `${lbl(ctx, { darkvision: L("Scurovisione", "Darkvision"), blindsight: L("Vista cieca", "Blindsight"), truesight: L("Vista pura", "Truesight"), tremorsense: L("Percezione tellurica", "Tremorsense") }[key] ?? L(key, key))} ${srd.formatDistance(feet, ctx.lang)}`,
      ),
    `${ctx.t("Percezione passiva", "Passive Perception")} ${block.senses?.passivePerception ?? 10}`,
  ];
  const fact = (label, value) => `<div><dt>${ctx.esc(label)}</dt><dd>${value}</dd></div>`;
  // Defenses and Gear in the 2024 order and wording of the compendium's stat block.
  const damageList = (values) =>
    (values ?? []).map((v) => lbl(ctx, srd.LABELS.damageType[v] ?? L(v, v))).join(", ");
  const conditionList = (values) =>
    (values ?? [])
      .map((v) => lbl(ctx, getEntry(`srd2024:condition:${v}`)?.name ?? L(v, v)))
      .join(", ");
  const immunities = [damageList(block.immunities), conditionList(block.conditionImmunities)]
    .filter(Boolean)
    .join("; ");
  const gear = (block.gear ?? [])
    .map((g) => {
      const name = g.itemId ? getEntry(g.itemId)?.name : g.name;
      const text = name ? lbl(ctx, typeof name === "object" ? name : L(name, name)) : "";
      return text ? text + (g.quantity > 1 ? ` (${g.quantity})` : "") : "";
    })
    .filter(Boolean)
    .join(", ");
  const defenses = `${block.vulnerabilities?.length ? fact(ctx.t("Vulnerabilità", "Vulnerabilities"), ctx.esc(damageList(block.vulnerabilities))) : ""}${block.resistances?.length ? fact(ctx.t("Resistenze", "Resistances"), ctx.esc(damageList(block.resistances))) : ""}${immunities ? fact(ctx.t("Immunità", "Immunities"), ctx.esc(immunities)) : ""}${gear ? fact(ctx.t("Equipaggiamento", "Gear"), ctx.esc(gear)) : ""}`;
  return `<article class="eb-block" data-eb-block="${ctx.esc(D.blockKey(ref))}" lang="${ctx.lang}">
    <header class="eb-block-head"><div><h4>${ctx.esc(D.blockName(block, ctx.lang))}</h4><p><em>${ctx.esc(typeLabel(ctx, block))} · ${ctx.esc(sizeLabel(ctx, block))} · ${ctx.esc(lbl(ctx, srd.LABELS.alignment[block.alignment] ?? L(block.alignment, block.alignment)))}</em></p></div>
    <div class="toolbar">${sourceBadge(ctx, block)}${editable && runs(ctx) ? `<button type="button" class="button" data-eb="block-edit" data-ref="${refAttr(ctx, ref)}"${rowId ? ` data-row="${ctx.esc(rowId)}"` : ""}>${ctx.t("Modifica in linea", "Edit in place")}</button>` : ""}</div></header>
    <dl class="eb-core">${fact(ctx.t("CA", "AC"), block.ac)}${fact(ctx.t("Iniziativa", "Initiative"), rollButton(ctx, ref, { kind: "initiative" }, `${signed(block.initiative.bonus)} (${block.initiative.score})`, `${ctx.t("Iniziativa", "Initiative")} ${signed(block.initiative.bonus)}`))}${fact(ctx.t("PF", "HP"), `${block.hp.average} (${ctx.esc(block.hp.formula)})`)}${fact(ctx.t("Velocità", "Speed"), ctx.esc(speed))}</dl>
    <div class="table-wrap"><table class="eb-abilities"><thead><tr><th scope="col">${ctx.t("Car.", "Abl.")}</th><th scope="col">${ctx.t("Punt.", "Score")}</th><th scope="col">Mod</th><th scope="col">${ctx.t("TS", "Save")}</th></tr></thead><tbody>${abilityRows}</tbody></table></div>
    <dl class="eb-meta">${skills.length ? fact(ctx.t("Abilità", "Skills"), ctx.esc(skills.join(", "))) : ""}${defenses}${fact(ctx.t("Sensi", "Senses"), ctx.esc(senses.join(", ")))}${fact(ctx.t("Lingue", "Languages"), ctx.esc(lbl(ctx, block.languages ?? "—")))}${fact(ctx.t("GS", "CR"), ctx.esc(`${block.cr} (${ctx.t("PE", "XP")} ${num(ctx, block.xp)}; ${ctx.t("BC", "PB")} ${signed(block.proficiencyBonus)})`))}</dl>
    ${actionLines(ctx, block, ref, ctx.t("Tratti", "Traits"), block.traits, editable)}${actionLines(ctx, block, ref, ctx.t("Azioni", "Actions"), block.actions, editable)}${actionLines(ctx, block, ref, ctx.t("Azioni bonus", "Bonus Actions"), block.bonusActions, editable)}${actionLines(ctx, block, ref, ctx.t("Reazioni", "Reactions"), block.reactions, editable)}
  </article>`;
}
// Distances in the form: metres in Italian (1,5 m = 5 ft, as the IT SRD), feet in English.
const formDistance = (ctx, feet) =>
  ctx.lang === "it" ? String(srd.feetToMeters(feet)).replace(".", ",") : feet;
const SECTION_TITLES = {
  traits: L("Tratti", "Traits"),
  actions: L("Azioni", "Actions"),
  bonusActions: L("Azioni bonus", "Bonus Actions"),
  reactions: L("Reazioni", "Reactions"),
};
// Form field prefix per section ("action-" kept for Actions).
const sectionPrefix = (section) => (section === "actions" ? "action" : section);
function draftFromBlock(ctx, block) {
  const entries = (section) =>
    Object.fromEntries(
      (block[section] ?? []).map((a) => [
        a.id,
        { name: lbl(ctx, a.name), text: lbl(ctx, a.summary) },
      ]),
    );
  return {
    name: D.blockName(block, ctx.lang),
    ac: block.ac,
    initiative: block.initiative.bonus,
    hpAverage: block.hp.average,
    hpFormula: block.hp.formula,
    speed: formDistance(ctx, block.speed?.walk ?? 0),
    cr: block.cr,
    abilities: { ...block.abilities },
    saves: Object.fromEntries(ABILITIES.map((k) => [k, block.saves?.[k] ?? ""])),
    skillsText: Object.entries(block.skills ?? {})
      .map(
        ([id, bonus]) =>
          `${lbl(ctx, RULE_SKILLS.find((s) => s.id === id)?.name ?? L(id, id))} ${bonus < 0 ? "-" : "+"}${Math.abs(bonus)}`,
      )
      .join(", "),
    senses: {
      ...Object.fromEntries(
        D.SENSE_KEYS.map((k) => [k, block.senses?.[k] ? formDistance(ctx, block.senses[k]) : ""]),
      ),
      passivePerception: block.senses?.passivePerception ?? 10,
    },
    languages: lbl(ctx, block.languages ?? ""),
    vulnerabilities: [...(block.vulnerabilities ?? [])],
    resistances: [...(block.resistances ?? [])],
    immunities: [...(block.immunities ?? [])],
    conditionImmunities: [...(block.conditionImmunities ?? [])],
    gear: (block.gear ?? []).map(D.gearKey),
    ...Object.fromEntries(D.BLOCK_SECTIONS.map((s) => [s, entries(s)])),
    newActionText: "",
    newActionSection: "actions",
  };
}
// R20-102: every section of the 2024 block edits in place; defenses, senses, languages
// and gear sit in one collapsible group so the core numbers stay at hand.
function blockEditHTML(ctx, block, ref, draft) {
  const field = (name, label, value, extra = "") =>
    `<label class="field">${ctx.esc(label)}<input name="${ctx.esc(name)}" value="${ctx.esc(value ?? "")}" ${extra}></label>`;
  const checks = (name, legend, values, current, labelOf) =>
    `<fieldset class="eb-edit-checks"><legend>${ctx.esc(legend)}</legend>${values
      .map(
        (v) =>
          `<label class="eb-check"><input type="checkbox" name="${name}" value="${ctx.esc(v)}" ${current.includes(v) ? "checked" : ""}> ${ctx.esc(labelOf(v))}</label>`,
      )
      .join("")}</fieldset>`;
  const damageLabel = (v) => lbl(ctx, srd.LABELS.damageType[v] ?? L(v, v));
  const conditionLabel = (v) => lbl(ctx, getEntry(`srd2024:condition:${v}`)?.name ?? L(v, v));
  const unit = ctx.t("m", "ft");
  const senseLabels = {
    darkvision: L("Scurovisione", "Darkvision"),
    blindsight: L("Vista cieca", "Blindsight"),
    truesight: L("Vista pura", "Truesight"),
    tremorsense: L("Percezione tellurica", "Tremorsense"),
  };
  const gearName = (g) => {
    const name = g.itemId ? getEntry(g.itemId)?.name : g.name;
    return lbl(
      ctx,
      typeof name === "object" && name ? name : L(String(name ?? "?"), String(name ?? "?")),
    );
  };
  const sections = D.BLOCK_SECTIONS.map((section) =>
    (block[section] ?? [])
      .map((a) => {
        const prefix = sectionPrefix(section);
        const entry = draft[section]?.[a.id] ?? {};
        return `<fieldset class="eb-edit-action"><legend>${ctx.esc(lbl(ctx, SECTION_TITLES[section]))}: ${ctx.esc(lbl(ctx, a.name))}</legend>${field(`${prefix}-name-${a.id}`, ctx.t("Nome", "Name"), entry.name ?? "", 'maxlength="60"')}<label class="field">${ctx.t("Testo", "Text")}<textarea name="${ctx.esc(`${prefix}-text-${a.id}`)}" maxlength="600" rows="3">${ctx.esc(entry.text ?? "")}</textarea></label></fieldset>`;
      })
      .join(""),
  ).join("");
  return `<form class="eb-block eb-block-edit" data-eb-block-form="${ctx.esc(D.blockKey(ref))}" novalidate>
    <header class="eb-block-head"><div><h4>${ctx.t("Modifica in linea", "Edit in place")}: ${ctx.esc(D.blockName(block, ctx.lang))}</h4><p class="muted">${block.custom ? ctx.t("Stai modificando il blocco personalizzato: la revisione cresce di uno.", "You are editing the custom block: its revision goes up by one.") : ctx.t("Il blocco SRD resta intatto: salvi una copia personalizzata usata da questa riga.", "The SRD block stays intact: you save a custom copy used by this row.")} ${ctx.t("Un testo cambiato vale per entrambe le lingue: nell’altra lingua è segnato come tale.", "Changed text applies to both languages: the other language marks it as such.")}</p></div></header>
    ${field("name", ctx.t("Nome", "Name"), draft.name, 'maxlength="80" required')}
    <div class="eb-edit-grid">${field("ac", ctx.t("CA", "AC"), draft.ac, 'inputmode="numeric"')}${field("initiative", ctx.t("Bonus d’iniziativa", "Initiative bonus"), draft.initiative, 'inputmode="numeric"')}${field("hpAverage", ctx.t("PF medi", "Average HP"), draft.hpAverage, 'inputmode="numeric"')}${field("hpFormula", ctx.t("Formula PF", "HP formula"), draft.hpFormula)}${field("speed", ctx.t("Velocità (m)", "Speed (ft)"), draft.speed, 'inputmode="decimal"')}<label class="field">${ctx.t("GS", "CR")}<select name="cr">${D.CR_OPTIONS.map((cr) => `<option value="${cr}" ${cr === draft.cr ? "selected" : ""}>${cr} · ${num(ctx, srd.xpForCr(cr))} ${ctx.t("PE", "XP")}</option>`).join("")}</select></label></div>
    <fieldset class="eb-edit-abilities"><legend>${ctx.t("Caratteristiche", "Ability scores")}</legend>${ABILITIES.map((key) => field(`ability-${key}`, lbl(ctx, srd.LABELS.ability[key]).slice(0, 3), draft.abilities[key], 'inputmode="numeric"')).join("")}</fieldset>
    <fieldset class="eb-edit-abilities"><legend>${ctx.t("Tiri salvezza (vuoto = modificatore)", "Saving throws (blank = modifier)")}</legend>${ABILITIES.map((key) => field(`save-${key}`, lbl(ctx, srd.LABELS.ability[key]).slice(0, 3), draft.saves?.[key] ?? "", `inputmode="numeric" placeholder="${signed(abilityModifier(Number(draft.abilities[key]) || 10))}"`)).join("")}</fieldset>
    ${field("skills", ctx.t("Abilità (es. Furtività +6, Percezione +2)", "Skills (e.g. Stealth +6, Perception +2)"), draft.skillsText ?? "", 'maxlength="300"')}
    <details class="eb-edit-more" ${uiState(ctx).editing?.moreOpen ? "open" : ""}><summary data-eb-edit-more>${ctx.t("Difese, sensi, lingue ed equipaggiamento", "Defenses, senses, languages and gear")}</summary>
      <input type="hidden" name="defenses-present" value="1">
      ${checks("vulnerabilities", ctx.t("Vulnerabilità", "Vulnerabilities"), D.DAMAGE_TYPES, draft.vulnerabilities ?? [], damageLabel)}
      ${checks("resistances", ctx.t("Resistenze", "Resistances"), D.DAMAGE_TYPES, draft.resistances ?? [], damageLabel)}
      ${checks("immunities", ctx.t("Immunità ai danni", "Damage immunities"), D.DAMAGE_TYPES, draft.immunities ?? [], damageLabel)}
      ${checks("conditionImmunities", ctx.t("Immunità alle condizioni", "Condition immunities"), D.CONDITION_IDS, draft.conditionImmunities ?? [], conditionLabel)}
      <div class="eb-edit-grid">${D.SENSE_KEYS.map((k) => field(`sense-${k}`, `${lbl(ctx, senseLabels[k])} (${unit})`, draft.senses?.[k] ?? "", 'inputmode="decimal"')).join("")}${field("passivePerception", ctx.t("Percezione passiva", "Passive Perception"), draft.senses?.passivePerception ?? "", 'inputmode="numeric"')}</div>
      ${field("languages", ctx.t("Lingue", "Languages"), draft.languages ?? "", 'maxlength="200"')}
      ${(block.gear ?? []).length ? `<input type="hidden" name="gear-present" value="1">${checks("gear", ctx.t("Equipaggiamento (togli la spunta per rimuoverlo dal blocco e dal bottino)", "Gear (untick to remove it from the block and the loot)"), (block.gear ?? []).map(D.gearKey), draft.gear ?? [], (key) => gearName(block.gear.find((g, i) => D.gearKey(g, i) === key)))}` : ""}
    </details>
    ${sections}
    <div class="eb-edit-grid"><label class="field">${ctx.t("Sezione della nuova voce", "Section of the new entry")}<select name="newActionSection">${D.BLOCK_SECTIONS.map((s) => `<option value="${s}" ${s === (draft.newActionSection ?? "actions") ? "selected" : ""}>${ctx.esc(lbl(ctx, SECTION_TITLES[s]))}</option>`).join("")}</select></label></div>
    <label class="field">${ctx.t("Nuova voce dal testo (incolla la riga del blocco)", "New entry from text (paste the stat block line)")}<textarea name="newActionText" maxlength="600" rows="3" placeholder="${ctx.esc(ctx.t("Pugnale. Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 4 (1d4 + 2) danni perforanti.", "Dagger. Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Piercing damage."))}">${ctx.esc(draft.newActionText ?? "")}</textarea></label>
    <p class="muted">${ctx.t("Il testo cambiato diventa una proposta da confermare: nessun tiro nasce dal testo senza la tua conferma.", "Changed text becomes a proposal to confirm: no roll comes from text without your confirmation.")}</p>
    <p class="error" data-eb-block-error hidden></p>
    <div class="toolbar"><button type="submit" class="button primary">${ctx.t("Salva blocco", "Save block")}</button><button type="button" class="button quiet" data-eb="block-cancel">${ctx.t("Annulla modifiche", "Cancel changes")}</button></div>
  </form>`;
}
function readBlockForm(form, lang) {
  const data = formDataOf(form);
  const sections = Object.fromEntries(D.BLOCK_SECTIONS.map((s) => [s, {}]));
  for (const [key, value] of data.entries())
    for (const section of D.BLOCK_SECTIONS) {
      const match = new RegExp(`^${sectionPrefix(section)}-(name|text)-(.+)$`).exec(key);
      if (match) (sections[section][match[2]] ??= {})[match[1]] = String(value);
    }
  const text = (name) => (data.has(name) ? String(data.get(name) ?? "") : undefined);
  const defenses = data.has("defenses-present");
  return {
    name: String(data.get("name") ?? ""),
    ac: String(data.get("ac") ?? ""),
    initiative: String(data.get("initiative") ?? ""),
    hpAverage: String(data.get("hpAverage") ?? ""),
    hpFormula: String(data.get("hpFormula") ?? ""),
    speed: String(data.get("speed") ?? ""),
    cr: String(data.get("cr") ?? ""),
    abilities: Object.fromEntries(
      ABILITIES.map((k) => [k, String(data.get(`ability-${k}`) ?? "")]),
    ),
    ...(data.has("save-str")
      ? {
          saves: Object.fromEntries(ABILITIES.map((k) => [k, String(data.get(`save-${k}`) ?? "")])),
        }
      : {}),
    ...(text("skills") !== undefined ? { skillsText: text("skills") } : {}),
    ...(defenses
      ? {
          vulnerabilities: data.getAll("vulnerabilities").map(String),
          resistances: data.getAll("resistances").map(String),
          immunities: data.getAll("immunities").map(String),
          conditionImmunities: data.getAll("conditionImmunities").map(String),
          senses: {
            ...Object.fromEntries(
              D.SENSE_KEYS.map((k) => [k, String(data.get(`sense-${k}`) ?? "")]),
            ),
            passivePerception: String(data.get("passivePerception") ?? ""),
          },
          languages: String(data.get("languages") ?? ""),
        }
      : {}),
    ...(data.has("gear-present") ? { gear: data.getAll("gear").map(String) } : {}),
    ...sections,
    newActionText: String(data.get("newActionText") ?? ""),
    newActionSection: String(data.get("newActionSection") ?? "actions"),
    lang,
  };
}
// Form strings → domain values; Italian distances are in metres (1,5 m = 5 ft as in the IT SRD).
export function domainDraft(draft, lang) {
  const feet = (value) => {
    const n = Number(String(value).replace(",", "."));
    return lang === "it" ? Math.round((n / 1.5) * 5) : n;
  };
  return {
    ...draft,
    ac: Number(draft.ac),
    initiative: Number(String(draft.initiative).replace("+", "").replace(/−/g, "-")),
    hpAverage: Number(draft.hpAverage),
    speed: feet(draft.speed),
    abilities: Object.fromEntries(ABILITIES.map((k) => [k, Number(draft.abilities[k])])),
    ...(draft.senses
      ? {
          senses: {
            ...Object.fromEntries(
              D.SENSE_KEYS.map((k) => [
                k,
                String(draft.senses[k] ?? "").trim() === "" ? "" : feet(draft.senses[k]),
              ]),
            ),
            passivePerception: Number(draft.senses.passivePerception),
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------- rolls

// The compendium's roll dialog, fed with a request built from this block's structured
// data: normal/advantage/disadvantage, critical, digital or physical faces, audience.
export function openBlockRoll(ctx, block, spec) {
  let request;
  try {
    request = D.blockRollRequest(block, spec);
  } catch (error) {
    ctx.toast(message(ctx, error), true);
    return;
  }
  const state = { mode: "normal", critical: false, dieMode: "digital" };
  const plan = () =>
    request.kind === "d20"
      ? rollPlan({ kind: "d20", bonus: request.bonus, mode: state.mode })
      : rollPlan({
          kind: "damage",
          terms: request.terms,
          critical: request.canCritical && state.critical,
        });
  const faces = (p) =>
    p.dice
      .map(
        (die, i) =>
          `<label class="field eb-face">${ctx.t("Dado", "Die")} ${i + 1} · d${die.sides}<input type="number" name="face-${i}" min="1" max="${die.sides}" inputmode="numeric" required></label>`,
      )
      .join("");
  const body = `<p class="muted">${ctx.esc(lbl(ctx, request.label))}</p><p><strong>${ctx.t("Formula", "Formula")}:</strong> <span data-eb-formula>${ctx.esc(formulaText(plan(), ctx.lang))}</span></p>${
    request.kind === "d20"
      ? `<fieldset class="eb-choice"><legend>${ctx.t("Tiro con d20", "D20 roll")}</legend><label><input type="radio" name="advantage" value="normal" checked> ${ctx.t("Normale", "Normal")}</label><label><input type="radio" name="advantage" value="advantage"> ${ctx.t("Vantaggio", "Advantage")}</label><label><input type="radio" name="advantage" value="disadvantage"> ${ctx.t("Svantaggio", "Disadvantage")}</label></fieldset>`
      : request.canCritical
        ? `<label class="eb-check"><input type="checkbox" name="critical"> ${ctx.t("Colpo critico: tira due volte i dadi dei danni", "Critical hit: roll the damage dice twice")}</label>`
        : ""
  }<fieldset class="eb-choice"><legend>${ctx.t("Dadi", "Dice")}</legend><label><input type="radio" name="dieMode" value="digital" checked> ${ctx.t("Dado digitale", "Digital die")}</label><label><input type="radio" name="dieMode" value="physical"> ${ctx.t("Dado fisico: inserisco le facce", "Physical die: I enter the faces")}</label></fieldset><div class="eb-faces" data-eb-faces hidden></div><label class="field">${ctx.t("Chi vede il risultato", "Who sees the result")}<select name="visibility"><option value="private">${ctx.t("Solo il DM", "DM only")}</option><option value="shared">${ctx.t("Tutto il tavolo", "The whole table")}</option></select></label><p class="muted">${ctx.t("Il tiro va nel registro; non applica danni né consuma azioni. Al Tavolo l’attacco in mischia confermato è tra le Azioni della scheda.", "The roll goes to the log; it does not apply damage or spend actions. At the Table the confirmed melee attack is among the sheet actions.")}</p>`;
  ctx.dialog(ctx.t("Tira i dadi", "Roll dice"), body, {
    submitLabel: ctx.t("Registra tiro", "Record roll"),
    onSubmit: (form) => {
      const p = plan();
      const physical = form.get("dieMode") === "physical";
      const values = physical
        ? p.dice.map((_, i) => Number(form.get(`face-${i}`)))
        : p.dice.map((die) => rollDie(die.sides));
      if (physical && values.some((face, i) => !validFace(face, p.dice[i].sides)))
        throw Object.assign(new Error("face"), {
          it: "Inserisci ogni faccia del dado fisico: un numero intero tra 1 e il numero di facce.",
          en: "Enter every physical die face: a whole number from 1 to the number of sides.",
        });
      const { record } = recordRoll(ctx, request, {
        mode: physical ? "physical" : "digital",
        faces: values,
        visibility: form.get("visibility") === "shared" ? "shared" : "private",
        options: state,
      });
      uiState(ctx).lastRoll = {
        key: D.blockKey({ [block.custom ? "blockId" : "creatureId"]: block.id }),
        text: `${lbl(ctx, request.label)}: ${record.formula} → [${record.faces.join(", ")}] = ${record.total} · ${physical ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}`,
      };
      ctx.toast(uiState(ctx).lastRoll.text);
      ctx.render();
    },
  });
  const dialog = globalThis.document?.querySelector("#dialog");
  if (!dialog) return;
  const refresh = () => {
    dialog.querySelector("[data-eb-formula]").textContent = formulaText(plan(), ctx.lang);
    const box = dialog.querySelector("[data-eb-faces]");
    box.hidden = state.dieMode !== "physical";
    box.innerHTML = state.dieMode === "physical" ? faces(plan()) : "";
  };
  dialog
    .querySelectorAll("[name=advantage]")
    .forEach((input) => (input.onchange = () => ((state.mode = input.value), refresh())));
  dialog.querySelector("[name=critical]")?.addEventListener("change", (event) => {
    state.critical = event.target.checked;
    refresh();
  });
  dialog
    .querySelectorAll("[name=dieMode]")
    .forEach((input) => (input.onchange = () => ((state.dieMode = input.value), refresh())));
}

// ---------------------------------------------------------------- library view

function libraryRows(ctx, slice) {
  const ui = uiState(ctx);
  const needle = srd.normalizeSearchText(ui.search);
  const rows = slice.encounters
    .map((encounter) => ({
      encounter,
      rating: D.rateEncounter(ctx.state, slice, encounter),
      status: D.encounterStatus(ctx.state, encounter),
    }))
    .filter(({ encounter }) => !needle || srd.normalizeSearchText(encounter.name).includes(needle));
  const order = { "no-party": -1, empty: 0, trivial: 1, low: 2, moderate: 3, high: 4, deadly: 5 };
  rows.sort((a, b) =>
    ui.sort === "name"
      ? a.encounter.name.localeCompare(b.encounter.name, ctx.lang)
      : ui.sort === "difficulty"
        ? order[b.rating.band] - order[a.rating.band]
        : b.encounter.updatedAt.localeCompare(a.encounter.updatedAt),
  );
  return rows;
}
function renderLibrary(ctx, slice) {
  const ui = uiState(ctx);
  const rows = libraryRows(ctx, slice);
  const unlinked = D.unlinkedSceneEncounters(ctx.state, slice);
  return `<div class="eb eb-library" data-eb-view="library">
    <div class="eb-head"><div><h2>${ctx.t("I miei incontri", "My encounters")}</h2><p class="muted">${ctx.t("Difficoltà 2024 dal budget di PE del gruppo, gruppi in attesa e consegna alla scena preparata.", "2024 difficulty from the party’s XP budget, staged groups and hand-off to the prepared scene.")}</p></div><div class="toolbar"><button type="button" class="button primary" data-eb="new">${ctx.icon("plus")} ${ctx.t("Nuovo incontro", "New encounter")}</button><button type="button" class="button" data-eb="from-tokens">${ctx.t("Dalle pedine di una scena…", "From a scene’s tokens…")}</button>${undoButton(ctx)}</div></div>
    <div class="eb-lib-tools"><label class="field">${ctx.t("Cerca per nome", "Search by name")}<input type="search" data-eb-search value="${ctx.esc(ui.search)}" placeholder="${ctx.t("Nome dell’incontro", "Encounter name")}"></label><label class="field">${ctx.t("Ordina per", "Sort by")}<select data-eb-sort><option value="saved" ${ui.sort === "saved" ? "selected" : ""}>${ctx.t("Salvato di recente", "Recently saved")}</option><option value="name" ${ui.sort === "name" ? "selected" : ""}>${ctx.t("Nome", "Name")}</option><option value="difficulty" ${ui.sort === "difficulty" ? "selected" : ""}>${ctx.t("Difficoltà", "Difficulty")}</option></select></label></div>
    ${
      rows.length
        ? `<ul class="eb-lib-list">${rows
            .map(({ encounter, rating, status }) => {
              const levels = rating.party.members.map((m) => m.level);
              return `<li class="eb-lib-row" data-eb-encounter="${ctx.esc(encounter.id)}"><div class="eb-lib-main"><h3><button type="button" class="text-button" data-eb="open" data-id="${ctx.esc(encounter.id)}">${ctx.esc(encounter.name)}</button></h3><p class="muted">${sceneLink(ctx, encounter)} · ${ctx.t("livelli", "levels")} ${levels.length ? ctx.esc(levels.join(", ")) : "—"} · ${ctx.t("salvato", "saved")} ${ctx.esc(date(ctx, encounter.updatedAt))}</p><div class="toolbar"><span class="badge eb-band eb-band-${rating.band}">${ctx.esc(bandLabel(ctx, rating.band))} · ${ctx.esc(xpText(ctx, rating.xp))}</span><span class="badge eb-status eb-status-${status}">${ctx.esc(statusLabel(ctx, status))}</span></div></div><div class="eb-lib-actions toolbar"><button type="button" class="button" data-eb="open" data-id="${ctx.esc(encounter.id)}">${ctx.t("Modifica", "Edit")}</button>${status === "running" ? `<button type="button" class="button primary" data-eb="resume" data-id="${ctx.esc(encounter.id)}">${ctx.t("Riprendi", "Resume")}</button>` : encounter.handoff ? `<button type="button" class="button primary" data-eb="start" data-id="${ctx.esc(encounter.id)}">${ctx.t("Avvia…", "Run…")}</button>` : ""}<details class="eb-menu"><summary class="button quiet">${ctx.t("Altre azioni", "More actions")}</summary><div><button type="button" data-eb="duplicate" data-id="${ctx.esc(encounter.id)}">${ctx.t("Duplica", "Duplicate")}</button>${encounter.handoff && status !== "running" ? `<button type="button" data-eb="restart" data-id="${ctx.esc(encounter.id)}">${ctx.t("Riavvia…", "Restart…")}</button>` : ""}<button type="button" data-eb="delete" data-id="${ctx.esc(encounter.id)}">${ctx.t("Elimina…", "Delete…")}</button></div></details></div></li>`;
            })
            .join("")}</ul>`
        : `<div class="empty-state"><h3>${ui.search ? ctx.t("Nessun incontro con questo nome", "No encounter with this name") : ctx.t("Nessun incontro", "No encounters")}</h3><p>${ctx.t("Crea un incontro, oppure parti dalle pedine già sulla mappa.", "Create an encounter, or start from the tokens already on the map.")}</p></div>`
    }
    ${
      unlinked.length
        ? `<section class="eb-scene-encounters"><h3>${ctx.t("Incontri preparati nelle scene", "Encounters prepared on scenes")}</h3><p class="muted">${ctx.t("Preparati dall’editor della scena: riaprili qui senza perdere partecipanti e tiri registrati.", "Prepared in the scene editor: reopen them here without losing participants and recorded rolls.")}</p><ul class="eb-lib-list">${unlinked
            .map((scene) => {
              const rolled = scene.encounter.participants.filter((p) =>
                Number.isInteger(p.natural),
              ).length;
              return `<li class="eb-lib-row" data-eb-scene-encounter="${ctx.esc(scene.id)}"><div class="eb-lib-main"><h3>${ctx.esc(scene.encounter.name || scene.name)}</h3><p class="muted">${ctx.esc(scene.name)} · ${scene.encounter.participants.length} ${ctx.t("partecipanti", "participants")} · ${rolled} ${ctx.t("tiri registrati", "recorded rolls")}</p></div><div class="toolbar"><button type="button" class="button" data-eb="import" data-scene="${ctx.esc(scene.id)}">${ctx.t("Riprendi nel costruttore", "Resume in the builder")}</button></div></li>`;
            })
            .join("")}</ul></section>`
        : ""
    }
    ${
      slice.history.length
        ? `<details class="eb-history"><summary>${ctx.t("Cronologia", "History")} (${slice.history.length})</summary><p class="muted">${ctx.t("Gli incontri eliminati o riavviati restano qui: ripristinarne uno crea una copia non ancora su una scena.", "Deleted or restarted encounters stay here: restoring one creates a copy not yet on a scene.")}</p><ul class="eb-history-list">${slice.history
            .toReversed()
            .map(
              (entry) =>
                `<li><span><strong>${ctx.esc(entry.name)}</strong> · ${entry.reason === "deleted" ? ctx.t("eliminato", "deleted") : ctx.t("riavviato", "restarted")} ${ctx.esc(date(ctx, entry.at))}</span><button type="button" class="button quiet" data-eb="history-restore" data-id="${ctx.esc(entry.id)}">${ctx.t("Ripristina come copia", "Restore as a copy")}</button></li>`,
            )
            .join("")}</ul></details>`
        : ""
    }
  </div>`;
}
function undoButton(ctx) {
  const label = ctx.canUndo?.() ? ctx.undoLabel?.() : "";
  return label
    ? `<button type="button" class="button quiet" data-eb="undo" title="${ctx.esc(label)}">${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}<span class="eb-sr">: ${ctx.esc(label)}</span></button>`
    : "";
}

// ---------------------------------------------------------------- editor view

function pickerHTML(ctx, slice, encounter) {
  const ui = uiState(ctx);
  const f = ui.filters;
  const results = D.pickerResults(slice, f, ctx.lang);
  const shown = [...results];
  if (ui.expanded && !shown.some((r) => D.blockKey(r.ref) === ui.expanded)) {
    const ref = ui.expanded.startsWith("block:")
      ? { blockId: ui.expanded.slice(6) }
      : { creatureId: ui.expanded.slice(4) };
    const block = D.blockOf(slice, ref);
    if (block) shown.unshift({ ref, block, custom: Boolean(block.custom), pinned: true });
  }
  const chips = D.filterChips(f, ctx.lang);
  const option = (value, text, current) =>
    `<option value="${ctx.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${ctx.esc(text)}</option>`;
  const inEncounter = (ref) =>
    encounter.rows.some(
      (r) => r.kind === "creature" && D.blockKey(D.rowRef(r)) === D.blockKey(ref),
    );
  const groups = encounter.groups;
  return `<section class="eb-picker" aria-labelledby="eb-picker-title">
    <div class="section-heading"><h3 id="eb-picker-title">${ctx.t("Creature", "Monsters")}</h3><span class="muted" data-eb-count>${results.length} ${ctx.t("risultati", "results")}</span></div>
    <label class="field">${ctx.t("Cerca per nome", "Search by name")}<input type="search" data-eb-filter="q" value="${ctx.esc(f.q)}" placeholder="${ctx.t("es. goblin", "e.g. goblin")}"></label>
    <div class="eb-filter-grid">
      <label class="field">${ctx.t("GS minimo", "Minimum CR")}<select data-eb-filter="crMin">${option("", ctx.t("Qualsiasi", "Any"), f.crMin)}${D.CR_OPTIONS.map((cr) => option(cr, cr, f.crMin)).join("")}</select></label>
      <label class="field">${ctx.t("GS massimo", "Maximum CR")}<select data-eb-filter="crMax">${option("", ctx.t("Qualsiasi", "Any"), f.crMax)}${D.CR_OPTIONS.map((cr) => option(cr, cr, f.crMax)).join("")}</select></label>
      <label class="field">${ctx.t("Tipo", "Type")}<select data-eb-filter="type">${option("", ctx.t("Tutti", "All"), f.type)}${D.creatureTypesInCatalog()
        .map((type) => [type, lbl(ctx, srd.LABELS.creatureType[type])])
        .sort((a, b) => a[1].localeCompare(b[1], ctx.lang))
        .map(([type, text]) => option(type, text, f.type))
        .join("")}</select></label>
      <label class="field">${ctx.t("Taglia", "Size")}<select data-eb-filter="size">${option("", ctx.t("Tutte", "All"), f.size)}${Object.keys(
        srd.LABELS.size,
      )
        .filter((s) => D.sizesInCatalog().includes(s))
        .map((s) => option(s, lbl(ctx, srd.LABELS.size[s]), f.size))
        .join("")}</select></label>
    </div>
    ${chips.length ? `<div class="eb-chips" aria-label="${ctx.t("Filtri attivi", "Active filters")}">${chips.map((chip) => `<button type="button" class="eb-chip" data-eb="chip" data-key="${chip.key}" aria-label="${ctx.esc(ctx.t("Togli il filtro ", "Remove filter ") + chip.text)}">${ctx.esc(chip.text)} <span aria-hidden="true">×</span></button>`).join("")}<button type="button" class="button quiet" data-eb="filters-clear">${ctx.t("Azzera filtri", "Clear filters")}</button></div>` : ""}
    ${groups.length > 1 ? `<label class="field eb-target">${ctx.t("Aggiungi al gruppo", "Add to group")}<select data-eb-target>${groups.map((g) => option(g.id, g.name + (g.staged ? ctx.t(" · in attesa", " · staged") : ""), ui.targetGroup)).join("")}</select></label>` : ""}
    <ul class="eb-results">${
      shown.length
        ? shown
            .map(({ ref, block, custom, pinned }) => {
              const key = D.blockKey(ref);
              const open = ui.expanded === key;
              const alone = D.rateAlone(ctx.state, slice, encounter, block);
              const again = inEncounter(ref);
              const name = D.blockName(block, ctx.lang);
              return `<li class="eb-result ${open ? "open" : ""}" data-eb-result="${ctx.esc(key)}"><div class="eb-result-main"><button type="button" class="eb-result-name" data-eb="expand" data-key="${ctx.esc(key)}" aria-expanded="${open}">${ctx.esc(name)}${custom ? ` <span class="badge eb-badge-custom">${ctx.t("personalizzato", "custom")}</span>` : ""}${pinned ? ` <span class="badge">${ctx.t("aperto", "open")}</span>` : ""}</button><span class="eb-result-meta">${ctx.esc(crText(ctx, block))} · ${ctx.esc(xpText(ctx, block.xp))} · ${ctx.esc(typeLabel(ctx, block))} · ${ctx.esc(sizeLabel(ctx, block))}</span>${alone ? `<span class="badge eb-band eb-band-${alone}">${ctx.esc(bandLabel(ctx, alone))} ${ctx.t("da sola", "alone")}</span>` : ""}</div><button type="button" class="button ${again ? "" : "primary"} eb-add" data-eb="add" data-ref="${refAttr(ctx, ref)}" aria-label="${ctx.esc((again ? ctx.t("Aggiungi di nuovo ", "Add again ") : ctx.t("Aggiungi ", "Add ")) + name)}">${ctx.icon("plus")} ${again ? ctx.t("Aggiungi di nuovo", "Add again") : ctx.t("Aggiungi", "Add")}</button>${open ? `<div class="eb-result-block">${blockView(ctx, slice, ref, block, null)}</div>` : ""}</li>`;
            })
            .join("")
        : `<li class="empty-state">${ctx.t("Nessuna creatura con questi filtri.", "No monsters match these filters.")}</li>`
    }</ul>
  </section>`;
}
function blockView(ctx, slice, ref, block, rowId) {
  const ui = uiState(ctx);
  const key = D.blockKey(ref);
  const last =
    ui.lastRoll?.key === key
      ? `<p class="eb-last-roll" data-eb-last-roll>${ctx.t("Ultimo tiro", "Last roll")}: ${ctx.esc(ui.lastRoll.text)}</p>`
      : "";
  if (ui.editing?.key === key && (ui.editing.rowId ?? null) === (rowId ?? null))
    return blockEditHTML(ctx, block, ref, ui.editing.draft) + last;
  return blockHTML(ctx, block, ref, { rowId }) + last;
}
function partyHTML(ctx, encounter, rating) {
  const party = rating.party;
  const custom = encounter.party.mode === "custom";
  const levels = custom && encounter.party.levels.length ? encounter.party.levels : [3, 3, 3, 3];
  return `<section class="eb-party" aria-labelledby="eb-party-title"><h3 id="eb-party-title">${ctx.t("Gruppo", "Party")}</h3>${
    party.mode === "rows"
      ? `<p>${ctx.t("Dalle pedine della scena", "From the scene’s tokens")}: ${party.members.map((m) => `${ctx.esc(m.name)} ${m.level}`).join(" · ")}</p>`
      : `<fieldset class="eb-choice"><legend class="eb-sr">${ctx.t("Chi affronta l’incontro", "Who faces the encounter")}</legend><label><input type="radio" name="eb-party" value="campaign" data-eb-party ${custom ? "" : "checked"}> ${ctx.t("Gruppo della campagna", "Campaign party")}</label><label><input type="radio" name="eb-party" value="custom" data-eb-party ${custom ? "checked" : ""}> ${ctx.t("Gruppo tipo", "Typical party")}</label></fieldset>${
          custom
            ? `<ul class="eb-party-custom">${levels
                .map(
                  (level, i) =>
                    `<li><span>${ctx.t("Personaggio", "Character")} ${i + 1}</span><label class="field">${ctx.t("Livello", "Level")}<select data-eb-level="${i}">${Array.from({ length: 20 }, (_, n) => `<option value="${n + 1}" ${n + 1 === level ? "selected" : ""}>${n + 1}</option>`).join("")}</select></label>${levels.length > 1 ? `<button type="button" class="button quiet" data-eb="party-remove" data-index="${i}" aria-label="${ctx.t("Togli il personaggio ", "Remove character ")}${i + 1}">${ctx.icon("close")}</button>` : ""}</li>`,
                )
                .join(
                  "",
                )}</ul><button type="button" class="button quiet" data-eb="party-add" ${levels.length >= 12 ? 'disabled aria-describedby="eb-party-why"' : ""}>${ctx.icon("plus")} ${ctx.t("Personaggio", "Character")}</button>${levels.length >= 12 ? `<p class="muted eb-why" id="eb-party-why">${ctx.t("Al massimo 12 personaggi: togline uno per aggiungerne un altro.", "At most 12 characters: remove one to add another.")}</p>` : ""}`
            : `<p class="eb-party-members">${party.members.length ? party.members.map((m) => `${ctx.esc(m.name)} ${ctx.t("liv.", "lvl")} ${m.level}`).join(" · ") : ctx.t("Nessun personaggio nella campagna.", "No characters in the campaign.")}</p>`
        }`
  }</section>`;
}
function difficultyHTML(ctx, rating) {
  if (!rating.budget)
    return `<section class="eb-difficulty" aria-live="polite"><p class="eb-band-line"><span>${ctx.t("Difficoltà 2024", "2024 difficulty")}</span><strong>${ctx.esc(bandLabel(ctx, rating.band))}</strong></p></section>`;
  const b = rating.budget;
  const deadly = Math.round(b.high * 1.5);
  const max = Math.max(deadly, rating.xp) * 1.08;
  const pct = (value) => Math.min(100, (100 * value) / max).toFixed(1);
  const marks = { low: b.low, moderate: b.moderate, high: b.high, deadly };
  const gone = (rating.gone ?? []).map((id) => ctx.state.actors[id]?.name ?? id);
  return `<section class="eb-difficulty eb-band-${rating.band}" aria-live="polite" data-eb-difficulty="${rating.band}">
    <p class="eb-band-line"><span>${ctx.t("Difficoltà 2024", "2024 difficulty")}</span><strong data-eb-band>${ctx.esc(bandLabel(ctx, rating.band))}</strong></p>
    <div class="eb-meter" role="img" aria-label="${ctx.esc(
      `${num(ctx, rating.xp)} ${ctx.t("PE", "XP")}; ${Object.entries(marks)
        .map(([d, v]) => `${bandLabel(ctx, d)} ${num(ctx, v)}`)
        .join(", ")}`,
    )}"><span class="eb-meter-fill" style="width:${pct(rating.xp)}%"></span>${Object.values(marks)
      .map((v) => `<i class="eb-mark" style="left:${pct(v)}%" aria-hidden="true"></i>`)
      .join("")}</div>
    <dl class="eb-budget"><div><dt>${ctx.t("PE dell’incontro", "Encounter XP")}</dt><dd data-eb-xp>${num(ctx, rating.xp)}</dd></div>${Object.entries(
      marks,
    )
      .map(
        ([d, v]) =>
          `<div class="${rating.band === d ? "current" : ""}"><dt>${ctx.esc(bandLabel(ctx, d))}${d === "deadly" ? " ≥" : ""}</dt><dd data-eb-budget="${d}">${num(ctx, v)}</dd></div>`,
      )
      .join("")}</dl>
    <p class="muted eb-source">${ctx.t("Budget di PE per personaggio", "XP Budget per Character")} × ${rating.party.members.length} ${ctx.t("personaggi", "characters")} · SRD 5.2.1 ${ctx.esc(D.pagesText(D.RULES.budget, ctx.lang))}. ${ctx.t("PE per GS", "XP by CR")}: ${ctx.esc(D.pagesText(D.RULES.xpByCr, ctx.lang))}. ${ctx.t("Fasce: sotto Facile è Banale, ogni budget del SRD apre la sua fascia, da 1,5 × Difficile è Mortale. Il SRD dice solo di spendere il budget scelto senza superarlo.", "Bands: below Low is Trivial, each SRD budget starts its band, from 1.5 × High it is Deadly. The SRD only says to spend the chosen budget without going over.")}</p>
    ${rating.unknown.length ? `<p class="muted" data-eb-unknown>${ctx.t("Senza GS, esclusi dal calcolo", "Without CR, left out of the total")}: ${ctx.esc(rating.unknown.join(", "))}</p>` : ""}
    ${gone.length ? `<p class="muted" data-eb-gone>${ctx.t("Non più sulla scena, esclusi dal calcolo", "No longer on the scene, left out of the total")}: ${ctx.esc(gone.join(", "))}</p>` : ""}
  </section>`;
}
function rowHTML(ctx, slice, encounter, row) {
  const block = D.blockOf(slice, D.rowRef(row));
  const actor = row.kind === "actor" ? ctx.state.actors[row.actorId] : null;
  const name = actor ? actor.name : block ? D.blockName(block, ctx.lang) : "?";
  const sameCreature =
    row.kind === "creature" &&
    encounter.rows.filter(
      (r) => r.kind === "creature" && D.blockKey(D.rowRef(r)) === D.blockKey(D.rowRef(row)),
    ).length > 1;
  const count = row.unique ? 1 : row.count;
  const xp = block ? block.xp * (row.kind === "actor" ? 1 : count) : null;
  const sides = Object.entries(D.SIDES).filter(([id]) => row.kind === "actor" || id !== "party");
  const option = (value, text, current) =>
    `<option value="${ctx.esc(value)}" ${value === current ? "selected" : ""}>${ctx.esc(text)}</option>`;
  const initiativeBadge =
    row.kind === "creature" && !row.unique && count > 1
      ? `<label class="eb-check eb-share-switch" title="${ctx.esc(ctx.t("Acceso: un solo tiro per tutte le copie (regola SRD). Spento: ogni copia tira il suo d20.", "On: one roll for all copies (SRD rule). Off: each copy rolls its own d20."))}"><input type="checkbox" role="switch" data-eb-share="${ctx.esc(row.id)}" ${row.individualInitiative ? "" : "checked"}> ${row.individualInitiative ? ctx.t("Iniziativa individuale", "Individual initiative") : ctx.t("Iniziativa condivisa", "Shared initiative")}</label>`
      : sameCreature
        ? `<span class="badge eb-separate">${ctx.t("Iniziativa separata", "Separate initiative")}</span>`
        : "";
  const blockLink =
    row.kind === "actor" && row.side !== "party"
      ? block
        ? `<span class="muted eb-linked">${ctx.t("Blocco", "Block")}: ${ctx.esc(D.blockName(block, ctx.lang))}${row.autoLoaded ? ctx.t(" (caricato dal nome)", " (loaded from the name)") : ""} <button type="button" class="text-button" data-eb="unlink" data-row="${ctx.esc(row.id)}">${ctx.t("Scollega", "Unlink")}</button></span>`
        : `<label class="field eb-link">${ctx.t("Collega un blocco", "Link a stat block")}<select data-eb-link="${ctx.esc(row.id)}"><option value="">${ctx.t("— senza blocco —", "— no block —")}</option>${[...slice.blocks, ...srd.CREATURES].map((b) => `<option value="${refAttr(ctx, b.custom ? { blockId: b.id } : { creatureId: b.id })}">${ctx.esc(D.blockName(b, ctx.lang))} · ${ctx.esc(crText(ctx, b))}</option>`).join("")}</select></label>`
      : "";
  const gone = D.actorRowGone(ctx.state, encounter, row)
    ? `<span class="badge eb-gone" data-eb-row-gone>${ctx.t("Non più sulla scena: fuori dal totale", "No longer on the scene: left out of the total")}</span>`
    : "";
  const optionsOpen = uiState(ctx).openOptions === row.id;
  return `<li class="eb-row" data-eb-row="${ctx.esc(row.id)}">
    <div class="eb-row-main">${block ? `<button type="button" class="eb-row-name" data-eb="block" data-ref="${refAttr(ctx, D.rowRef(row))}" data-row="${ctx.esc(row.id)}">${ctx.esc(name)}</button>` : `<strong class="eb-row-name">${ctx.esc(name)}</strong>`}<span class="muted">${
      row.kind === "actor"
        ? `${ctx.esc(lbl(ctx, D.SIDES[row.side].label))}${actor?.level && row.side === "party" ? ` · ${ctx.t("liv.", "lvl")} ${actor.level}` : ""}${block ? ` · ${ctx.esc(crText(ctx, block))} · ${ctx.esc(xpText(ctx, block.xp))}` : ""}`
        : `${ctx.esc(crText(ctx, block))} · ${ctx.esc(xpText(ctx, block.xp))} × ${count} = ${ctx.esc(xpText(ctx, xp))}${row.unique ? ` · ${ctx.t("creatura unica collegata", "unique linked creature")}` : ""}`
    }</span>${initiativeBadge}${gone}${blockLink}</div>
    ${
      row.kind === "creature" && !row.unique
        ? `<div class="eb-stepper" role="group" aria-label="${ctx.esc(ctx.t("Quantità di ", "Quantity of ") + name)}"><button type="button" class="button" data-eb="count" data-row="${ctx.esc(row.id)}" data-delta="-1" aria-label="${ctx.esc(ctx.t("Uno in meno: ", "One fewer: ") + name)}" ${count <= 1 ? "disabled" : ""}>−</button><output aria-live="polite" data-eb-count-of="${ctx.esc(row.id)}">${count}</output><button type="button" class="button" data-eb="count" data-row="${ctx.esc(row.id)}" data-delta="1" aria-label="${ctx.esc(ctx.t("Uno in più: ", "One more: ") + name)}" ${count >= 20 ? "disabled" : ""}>+</button></div>`
        : ""
    }
    <details class="eb-row-more" ${optionsOpen ? "open" : ""}><summary class="button quiet" data-eb-options="${ctx.esc(row.id)}">${ctx.t("Opzioni", "Options")}<span class="eb-sr"> ${ctx.esc(name)}</span></summary><div class="eb-row-options">
      ${encounter.groups.length > 1 ? `<label class="field">${ctx.t("Gruppo", "Group")}<select data-eb-row-group="${ctx.esc(row.id)}">${encounter.groups.map((g) => option(g.id, g.name, row.groupId)).join("")}</select></label>` : ""}
      ${row.side !== "party" || row.kind === "creature" ? `<label class="field">${ctx.t("Lato", "Side")}<select data-eb-row-side="${ctx.esc(row.id)}">${sides.map(([id, s]) => option(id, lbl(ctx, s.label), row.side)).join("")}</select></label>` : ""}
      ${row.kind === "creature" ? `<label class="eb-check"><input type="checkbox" data-eb-unique="${ctx.esc(row.id)}" ${row.unique ? "checked" : ""}> ${ctx.t("Creatura unica collegata (riusa lo stesso PNG, come la pedina predefinita di Roll20)", "Unique linked creature (reuses the same NPC, like Roll20’s default token)")}</label>` : ""}
      <button type="button" class="button danger" data-eb="remove-row" data-row="${ctx.esc(row.id)}">${ctx.t("Rimuovi", "Remove")}</button>
    </div></details>
  </li>`;
}
function groupsHTML(ctx, slice, encounter) {
  const onScene = (groupId) => D.copiesOf(encounter).some((c) => c.groupId === groupId);
  return `<section class="eb-groups" aria-labelledby="eb-groups-title"><div class="section-heading"><h3 id="eb-groups-title">${ctx.t("Creature dell’incontro", "Encounter creatures")}</h3><button type="button" class="button quiet" data-eb="group-add">${ctx.icon("plus")} ${ctx.t("Gruppo", "Group")}</button></div>
    ${encounter.groups
      .map((group) => {
        const rows = encounter.rows.filter((r) => r.groupId === group.id);
        const xp = rows.reduce((sum, r) => {
          const b = D.blockOf(slice, D.rowRef(r));
          return (
            sum +
            (b && !(r.kind === "actor" && r.side === "party")
              ? b.xp * (r.kind === "actor" || r.unique ? 1 : r.count)
              : 0)
          );
        }, 0);
        return `<div class="eb-group ${group.staged ? "staged" : ""}" data-eb-group="${ctx.esc(group.id)}"><div class="eb-group-head"><h4>${ctx.esc(group.name)}</h4><span class="badge ${group.staged ? "eb-staged" : ""}">${group.staged ? ctx.t("In attesa", "Staged") : group.activatedAt ? ctx.t("Arrivato", "Arrived") : ctx.t("In scena subito", "On stage at once")}</span><span class="muted">${ctx.esc(xpText(ctx, xp))}</span>${
          group.id !== "main" && !onScene(group.id)
            ? `<button type="button" class="button quiet" data-eb="group-staged" data-group="${ctx.esc(group.id)}" aria-pressed="${group.staged}">${group.staged ? ctx.t("Fai entrare subito", "Bring in at once") : ctx.t("Metti in attesa", "Stage")}</button><button type="button" class="button quiet" data-eb="group-remove" data-group="${ctx.esc(group.id)}">${ctx.t("Elimina gruppo", "Delete group")}</button>`
            : ""
        }</div>${
          rows.length
            ? `<ul class="eb-rows">${rows.map((row) => rowHTML(ctx, slice, encounter, row)).join("")}</ul>`
            : `<p class="muted eb-group-empty">${group.staged ? ctx.t("Scegli questo gruppo in “Aggiungi al gruppo” per preparare i rinforzi.", "Pick this group in “Add to group” to prepare reinforcements.") : ctx.t("Aggiungi creature dall’elenco.", "Add monsters from the list.")}</p>`
        }</div>`;
      })
      .join("")}
  </section>`;
}
function notesHTML(ctx, encounter) {
  const area = (key, label, hint) =>
    `<label class="field">${ctx.esc(label)}<textarea data-eb-note="${key}" maxlength="2000" rows="3" placeholder="${ctx.esc(hint)}">${ctx.esc(encounter.notes[key])}</textarea></label>`;
  return `<details class="eb-notes" ${encounter.notes.summary || encounter.notes.readAloud || encounter.notes.treasure ? "open" : ""}><summary>${ctx.t("Note, lettura ad alta voce e tesoro", "Notes, read-aloud and treasure")}</summary>
    ${area("summary", ctx.t("Riassunto (solo DM)", "Summary (DM only)"), ctx.t("Chi sono, cosa vogliono, come reagiscono.", "Who they are, what they want, how they react."))}
    ${area("readAloud", ctx.t("Da leggere ad alta voce", "Read-aloud text"), ctx.t("Il testo che leggi quando il gruppo arriva.", "The text you read when the party arrives."))}
    ${area("treasure", ctx.t("Tesoro e ricompense", "Treasure and rewards"), ctx.t("Promemoria del bottino (monete, oggetti, indizi).", "Loot reminder (coins, items, clues)."))}
    <p class="muted">${ctx.t("Le note si salvano quando esci dal campo.", "Notes save when you leave the field.")}</p>
  </details>`;
}
// SV-37: a blocked hand-off names its cause and remedy next to the control.
function blockedAttrs(ctx, id, reason) {
  return reason ? ` disabled aria-describedby="${ctx.esc(id)}"` : "";
}
function blockedNote(ctx, id, reason) {
  return reason ? `<p class="muted eb-why" id="${ctx.esc(id)}">${ctx.esc(reason)}</p>` : "";
}
function handoffHTML(ctx, slice, encounter, host = null) {
  const ui = uiState(ctx);
  const ho = ui.handoff;
  const scenes = ctx.state.scenes;
  const creatures = encounter.rows.filter((r) => r.kind === "creature");
  const sample = creatures[0] ? D.blockOf(slice, D.rowRef(creatures[0])) : null;
  const sampleName = sample ? D.blockName(sample, ctx.lang) : ctx.t("Creatura", "Creature");
  const blocked = host?.blocked || "";
  if (!encounter.handoff) {
    const known = (id) => id && scenes.some((s) => s.id === id);
    const sceneId =
      host?.sceneId ??
      (known(encounter.sceneId)
        ? encounter.sceneId
        : known(ho.sceneId)
          ? ho.sceneId
          : ctx.state.activeSceneId);
    const reason = !creatures.length
      ? ctx.t(
          "Serve almeno una creatura: aggiungila dall’elenco Creature.",
          "At least one monster is needed: add it from the Monsters list.",
        )
      : blocked;
    return `<section class="eb-handoff" aria-labelledby="eb-handoff-title"><h3 id="eb-handoff-title">${ctx.t("Al tavolo", "To the table")}</h3><p class="muted">${ctx.t("Crea i PNG, le pedine e l’incontro preparato della scena con i comandi della Preparazione. I gruppi in attesa arrivano nascosti.", "Creates the NPCs, tokens and the scene’s prepared encounter with Preparation’s own commands. Staged groups arrive hidden.")}</p>
      ${host ? `<p class="eb-scene-fixed">${ctx.t("Scena", "Scene")}: <strong>${ctx.esc(sceneName(ctx, sceneId))}</strong></p>` : `<label class="field">${ctx.t("Scena", "Scene")}<select data-eb-ho="sceneId">${scenes.map((s) => `<option value="${ctx.esc(s.id)}" ${s.id === sceneId ? "selected" : ""}>${ctx.esc(s.name)}${s.id === ctx.state.activeSceneId ? ctx.t(" · attiva al Tavolo", " · active at the Table") : ""}</option>`).join("")}</select></label>`}
      <fieldset class="eb-choice"><legend>${ctx.t("Nomi delle pedine", "Token names")}</legend><label><input type="radio" name="eb-numbering" value="numbers" data-eb-ho="numbering" ${ho.numbering === "numbers" ? "checked" : ""}> ${ctx.t("Numeri", "Numbers")} · ${ctx.esc(sampleName)} 1, 2…</label><label><input type="radio" name="eb-numbering" value="adjectives" data-eb-ho="numbering" ${ho.numbering === "adjectives" ? "checked" : ""}> ${ctx.t("Aggettivi", "Adjectives")} · ${ctx.esc(ctx.lang === "it" ? `${sampleName} audace` : `Daring ${sampleName}`)}…</label></fieldset>
      <label class="eb-check"><input type="checkbox" data-eb-ho="hideNames" ${ho.hideNames ? "checked" : ""}> ${ctx.t("Nascondi i nomi ai giocatori (vedono “Creatura sconosciuta”)", "Hide names from players (they see “Unknown creature”)")}</label>
      <fieldset class="eb-choice"><legend>${ctx.t("Punti ferita", "Hit points")} <span class="muted">· SRD ${ctx.esc(D.pagesText(D.RULES.monsterHp, ctx.lang))}</span></legend><label><input type="radio" name="eb-hp" value="average" data-eb-ho="hpMode" ${ho.hpMode === "average" ? "checked" : ""}> ${ctx.t("Medi dal blocco", "Average from the block")}</label><label><input type="radio" name="eb-hp" value="digital" data-eb-ho="hpMode" ${ho.hpMode === "digital" ? "checked" : ""}> ${ctx.t("Tirati con dadi digitali", "Rolled with digital dice")}</label><label><input type="radio" name="eb-hp" value="physical" data-eb-ho="hpMode" ${ho.hpMode === "physical" ? "checked" : ""}> ${ctx.t("Tirati con dadi fisici", "Rolled with physical dice")}</label></fieldset>
      <button type="button" class="button primary" data-eb="handoff"${blockedAttrs(ctx, "eb-handoff-why", reason)}>${ctx.icon("map")} ${ctx.t("Prepara nella scena", "Prepare on the scene")}</button>${blockedNote(ctx, "eb-handoff-why", reason)}
    </section>`;
  }
  const status = D.encounterStatus(ctx.state, encounter);
  const scene = ctx.state.scenes.find((s) => s.id === encounter.handoff.sceneId);
  let pending = null;
  try {
    const plan = D.planHandOff(ctx.state, slice, encounter.id, encounter.handoff.sceneId);
    pending = plan.create.length || plan.remove.length ? plan : null;
  } catch {
    pending = null;
  }
  const copies = D.copiesOf(encounter);
  const tokenMenu = optionalSlice(ctx.state, D.TOKEN_MENU);
  const trueName = (id) =>
    tokenMenu?.names?.[id]?.hidden ? tokenMenu.names[id].trueName : ctx.state.actors[id]?.name;
  const staged = copies.filter(
    (c) => encounter.groups.find((g) => g.id === c.groupId)?.staged,
  ).length;
  return `<section class="eb-handoff" aria-labelledby="eb-handoff-title"><h3 id="eb-handoff-title">${ctx.t("Al tavolo", "To the table")}</h3>
    <p data-eb-prepared><strong>${ctx.esc(statusLabel(ctx, status))}</strong> · ${ctx.t("scena", "scene")} «${ctx.esc(scene?.name ?? "—")}» · ${copies.length} ${ctx.t("creature create", "creatures created")}${staged ? ` · ${staged} ${ctx.t("in attesa", "staged")}` : ""}</p>
    ${
      (pending || status === "draft") && status !== "running"
        ? `<p class="eb-warn" role="status">${
            pending
              ? `${ctx.t("Le creature sono cambiate dopo la preparazione", "The creatures changed after preparation")}: +${pending.create.length} / −${pending.remove.length}.`
              : ctx.t(
                  "Nessuna creatura dell’incontro è nell’ordine preparato della scena.",
                  "None of the encounter’s creatures is in the scene’s prepared order.",
                )
          } <button type="button" class="button" data-eb="handoff"${blockedAttrs(ctx, "eb-handoff-why", blocked)}>${ctx.t("Aggiorna la scena", "Update the scene")}</button></p>${blockedNote(ctx, "eb-handoff-why", blocked)}`
        : ""
    }
    ${copies.length ? `<details class="eb-copies"><summary>${ctx.t("Pedine create", "Created tokens")} (${copies.length})</summary><ul>${copies.map((c) => `<li data-eb-copy="${ctx.esc(c.actorId)}"><strong>${ctx.esc(trueName(c.actorId) ?? "?")}</strong>${tokenMenu?.names?.[c.actorId]?.hidden ? ` <span class="muted">(${ctx.t("i giocatori vedono", "players see")} «${ctx.esc(ctx.state.actors[c.actorId]?.name)}»)</span>` : ""} · ${ctx.t("PF", "HP")} ${ctx.state.actors[c.actorId]?.hp ?? "—"}/${c.hp}${c.hpRoll ? ` · ${ctx.esc(c.hpRoll.formula)} [${c.hpRoll.faces.join(", ")}] ${c.hpRoll.mode === "physical" ? ctx.t("dadi fisici", "physical dice") : ctx.t("dadi digitali", "digital dice")}` : ` · ${ctx.t("medi", "average")}`}</li>`).join("")}</ul></details>` : ""}
    ${initiativeHTML(ctx, slice, encounter, status)}
    <div class="toolbar eb-handoff-actions">${status === "running" ? `<button type="button" class="button primary" data-eb="resume" data-id="${ctx.esc(encounter.id)}">${ctx.t("Riprendi al Tavolo", "Resume at the Table")}</button>` : `<button type="button" class="button primary" data-eb="start" data-id="${ctx.esc(encounter.id)}">${ctx.icon("play")} ${ctx.t("Avvia combattimento…", "Start combat…")}</button>`}${host ? "" : `<button type="button" class="button" data-eb="open-scene">${ctx.t("Apri la scena in Preparazione", "Open the scene in Preparation")}</button>`}${optionalSlice(ctx.state, D.LOOT) && copies.length ? `<button type="button" class="button" data-eb="treasure">${ctx.icon("bag")} ${ctx.t("Prepara il bottino", "Prepare the loot")}</button>` : ""}${status !== "running" ? `<button type="button" class="button quiet" data-eb="restart" data-id="${ctx.esc(encounter.id)}"${blockedAttrs(ctx, "eb-restart-why", blocked)}>${ctx.t("Riavvia…", "Restart…")}</button>` : ""}</div>${status !== "running" ? blockedNote(ctx, "eb-restart-why", blocked) : ""}
  </section>`;
}
// The scene's prepared initiative as "Start combat…" will run it: one line per shared-roll
// group, in order by total (highest first, re-sorted after every roll), with totals,
// Preparation's condition hints, Normal/Advantage/Disadvantage for the digital d20 and
// Earlier/Later for a tie only (the GM decides ties, SRD EN 13 / IT 14).
function initiativeHTML(ctx, slice, encounter, status) {
  const groups = D.initiativeGroups(ctx.state, slice, encounter);
  if (!groups.length) return "";
  const scene = ctx.state.scenes.find((s) => s.id === encounter.handoff.sceneId);
  const sorted = D.orderIsSorted(ctx.state, scene?.encounter?.participants ?? []);
  const tokenMenu = optionalSlice(ctx.state, D.TOKEN_MENU);
  const nameOf = (id) =>
    tokenMenu?.names?.[id]?.hidden
      ? tokenMenu.names[id].trueName
      : (ctx.state.actors[id]?.name ?? id);
  const running = status === "running";
  const option = (value, text) => `<option value="${value}">${ctx.esc(text)}</option>`;
  return `<div class="eb-initiative"><h4>${ctx.t("Ordine d’iniziativa della scena", "The scene’s initiative order")}</h4><p class="muted">${ctx.t("Un solo tiro per un gruppo di creature identiche", "One roll for a group of identical creatures")} · SRD ${ctx.esc(D.pagesText(D.RULES.groupInitiative, ctx.lang))}. ${ctx.t("Dal totale più alto; a parità decide il DM con Anticipa/Posticipa. I tiri vanno nel registro dell’iniziativa della scena; «Avvia combattimento…» usa quest’ordine.", "Highest total first; the DM settles ties with Earlier/Later. Rolls go to the scene’s initiative ledger; “Start combat…” uses this order.")}</p>${
    !sorted && !running
      ? `<p class="eb-warn" role="status">${ctx.t("L’ordine non segue i totali (cambiato altrove).", "The order does not follow the totals (changed elsewhere).")} <button type="button" class="button" data-eb="init-sort">${ctx.t("Ordina per iniziativa", "Sort by initiative")}</button></p>`
      : ""
  }<ol class="eb-init-list">${groups
    .map((group, index) => {
      const first = group.rows[0];
      const rolled = group.total !== null;
      const title = group.block
        ? `${D.blockName(group.block, ctx.lang)} ×${group.actorIds.length}`
        : nameOf(first.actorId);
      const detail = group.block ? group.actorIds.map(nameOf).join(", ") : "";
      const hints = [
        ...new Set(group.actorIds.map((id) => initiativeConditionHint(ctx, ctx.state.actors[id]))),
      ]
        .filter(Boolean)
        .join("");
      const tie = (other) => rolled && other && other.total === group.total;
      const move = (delta, label, text) =>
        `<button type="button" class="button quiet" data-eb="init-move" data-key="${ctx.esc(group.key)}" data-delta="${delta}" aria-label="${ctx.esc(`${label}: ${title}`)}">${ctx.esc(text)}</button>`;
      const ties = running
        ? ""
        : `${tie(groups[index - 1]) ? move(-1, ctx.t("Anticipa a parità", "Earlier on a tie"), ctx.t("Anticipa", "Earlier")) : ""}${tie(groups[index + 1]) ? move(1, ctx.t("Posticipa a parità", "Later on a tie"), ctx.t("Posticipa", "Later")) : ""}`;
      return `<li class="eb-init ${group.mine ? "" : "eb-init-other"}" data-eb-init="${ctx.esc(group.key)}"><div class="eb-init-head"><strong>${ctx.esc(title)}</strong>${detail ? `<span class="muted">${ctx.esc(detail)}</span>` : ""}${group.mine ? "" : `<span class="badge">${ctx.t("altro incontro della scena", "another encounter on the scene")}</span>`}<output data-eb-init-total>${rolled ? `${first.natural} + (${first.bonus}) = ${group.total} · ${first.mode === "digital" ? ctx.t("digitale", "digital") : ctx.t("fisico", "physical")}` : ctx.t("Da tirare", "Awaiting roll")}</output></div>${hints}${
        running
          ? ""
          : `<form class="eb-init-form" data-eb-init-form="${ctx.esc(group.key)}"><label class="field">${ctx.t("Bonus", "Bonus")}<input type="number" name="bonus" min="-100" max="100" step="1" value="${first.bonus}" inputmode="numeric"></label><label class="field">${ctx.t("Tiro", "Roll")}<select name="advantage">${option("normal", ctx.t("Normale", "Normal"))}${option("advantage", ctx.t("Vantaggio", "Advantage"))}${option("disadvantage", ctx.t("Svantaggio", "Disadvantage"))}</select></label><button type="button" class="button" data-eb="init-roll" data-key="${ctx.esc(group.key)}">${ctx.icon("dice")} ${rolled ? ctx.t("Rilancia d20", "Reroll d20") : ctx.t("Tira d20", "Roll d20")}</button>${ties}${
              rolled
                ? `<details class="eb-init-fix"><summary class="button quiet">${ctx.t("Correggi con il dado fisico…", "Correct with the physical die…")}</summary><div><label class="field">${ctx.t("d20 fisico (quello tenuto)", "Physical d20 (the one kept)")}<input type="number" name="natural" min="1" max="20" step="1" inputmode="numeric"></label><label class="field">${ctx.t("Motivo della correzione", "Reason for the correction")}<input name="reason" maxlength="200"></label><button type="submit" class="button">${ctx.t("Correggi", "Correct")}</button></div></details>`
                : `<label class="field">${ctx.t("d20 fisico (quello tenuto)", "Physical d20 (the one kept)")}<input type="number" name="natural" min="1" max="20" step="1" inputmode="numeric"></label><button type="submit" class="button">${ctx.t("Registra", "Record")}</button>`
            }</form>`
      }</li>`;
    })
    .join("")}</ol></div>`;
}
function renderEditor(ctx, slice, encounter, host = null) {
  const rating = D.rateEncounter(ctx.state, slice, encounter);
  const status = D.encounterStatus(ctx.state, encounter);
  return `<div class="eb eb-editor" data-eb-view="editor" data-eb-open="${ctx.esc(encounter.id)}"${host ? ' data-eb-host="scene"' : ""}>
    <div class="eb-bar">${host ? "" : `<button type="button" class="button quiet" data-eb="back">${ctx.icon("arrow")} ${ctx.t("I miei incontri", "My encounters")}</button>`}<label class="field eb-name">${ctx.t("Nome dell’incontro", "Encounter name")}<input data-eb-name maxlength="100" value="${ctx.esc(encounter.name)}"></label><span class="badge eb-status eb-status-${status}">${ctx.esc(statusLabel(ctx, status))}</span>${undoButton(ctx)}</div>
    <div class="eb-layout">
      ${pickerHTML(ctx, slice, encounter)}
      <aside class="eb-encounter" aria-label="${ctx.t("Incontro", "Encounter")}">
        ${partyHTML(ctx, encounter, rating)}
        ${difficultyHTML(ctx, rating)}
        ${groupsHTML(ctx, slice, encounter)}
        ${editingRowBlock(ctx, slice, encounter)}
        ${notesHTML(ctx, encounter)}
        ${handoffHTML(ctx, slice, encounter, host)}
      </aside>
    </div>
  </div>`;
}
// A row's block opened from the encounter column (pinned there for in-place editing).
function editingRowBlock(ctx, slice, encounter) {
  const ui = uiState(ctx);
  if (!ui.rowBlock) return "";
  const row = encounter.rows.find((r) => r.id === ui.rowBlock);
  const ref = row ? D.rowRef(row) : null;
  const block = ref ? D.blockOf(slice, ref) : null;
  if (!block) return "";
  return `<section class="eb-row-block" aria-label="${ctx.esc(ctx.t("Blocco di ", "Stat block of ") + D.blockName(block, ctx.lang))}"><div class="section-heading"><h3>${ctx.t("Blocco statistiche", "Stat block")}</h3><button type="button" class="button quiet" data-eb="row-block-close">${ctx.t("Chiudi blocco", "Close block")}</button></div>${blockView(ctx, slice, ref, block, row.id)}</section>`;
}
// ---------------------------------------------------------------- the scene's encounter (PR-32)

// Foundry keeps a scene's encounters in its Combat Tracker and D&D Beyond runs an encounter
// on its map: the scene editor shows the builder's own editor for the encounter linked to
// that scene (same object, same controls), never a second editor. Several encounters on one
// scene are picked from a list; the builder's «Incontri» shows each encounter's scene.
export const sceneEncounterReady = (ctx) => Boolean(registryRef && ctx?.state?.ext?.[ID]);
function sceneEncounterOf(ctx, sceneId) {
  const list = D.sceneEncounters(sliceOf(ctx.state), sceneId);
  const chosen = uiState(ctx).sceneOpen?.[sceneId];
  return list.find((e) => e.id === chosen) ?? list[0] ?? null;
}
/**
 * The scene editor's encounter panel: `saved` is false for a scene not saved yet;
 * `blocked` is the reason why commands that change the scene wait (unsaved scene edits).
 */
export function renderSceneEncounter(ctx, sceneId, { saved = true, blocked = "" } = {}) {
  if (!sceneEncounterReady(ctx) || !runs(ctx)) return "";
  const title = `<h2 id="eb-scene-title">${ctx.t("Incontro della scena", "Scene encounter")}</h2>`;
  if (!saved)
    return `<section class="panel eb-scene" data-eb-scene="${ctx.esc(sceneId)}" aria-labelledby="eb-scene-title">${title}<p class="muted">${ctx.t("Salva la scena per preparare il suo incontro: creature, difficoltà e iniziativa.", "Save the scene to prepare its encounter: monsters, difficulty and initiative.")}</p></section>`;
  const slice = sliceOf(ctx.state);
  const list = D.sceneEncounters(slice, sceneId);
  const encounter = sceneEncounterOf(ctx, sceneId);
  const host = { sceneId, blocked };
  const pick =
    list.length > 1
      ? `<label class="field eb-scene-pick">${ctx.t("Incontro", "Encounter")}<select data-eb-scene-pick>${list.map((e) => `<option value="${ctx.esc(e.id)}" ${e.id === encounter?.id ? "selected" : ""}>${ctx.esc(e.name)}</option>`).join("")}</select></label>`
      : "";
  const head = `<div class="section-heading eb-scene-head">${title}<div class="toolbar">${pick}${encounter ? `<button type="button" class="button quiet" data-eb="open-in-builder" data-id="${ctx.esc(encounter.id)}">${ctx.t("Apri in «Incontri»", "Open in “Encounters”")}</button><button type="button" class="button quiet" data-eb="scene-new">${ctx.icon("plus")} ${ctx.t("Altro incontro", "Another encounter")}</button>` : ""}</div></div>`;
  if (encounter)
    return `<section class="panel eb-scene" data-eb-scene="${ctx.esc(sceneId)}" aria-labelledby="eb-scene-title">${head}<p class="muted">${ctx.t("È lo stesso incontro della sezione «Incontri»: ogni modifica vale in entrambi i posti.", "This is the same encounter as in the “Encounters” section: every change applies in both places.")}</p>${renderEditor(ctx, slice, encounter, host)}</section>`;
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  const legacy = scene?.encounter?.participants?.length
    ? `<button type="button" class="button" data-eb="import" data-scene="${ctx.esc(sceneId)}">${ctx.t("Riprendi l’incontro già preparato", "Resume the encounter already prepared")}</button>`
    : "";
  const drafts = slice.encounters.filter((e) => !D.sceneOfEncounter(e));
  const link = drafts.length
    ? `<div class="eb-scene-link"><label class="field">${ctx.t("Oppure collega uno dei tuoi incontri", "Or link one of your encounters")}<select data-eb-scene-link>${drafts.map((e) => `<option value="${ctx.esc(e.id)}">${ctx.esc(e.name)}</option>`).join("")}</select></label><button type="button" class="button" data-eb="scene-link">${ctx.t("Collega a questa scena", "Link to this scene")}</button></div>`
    : "";
  return `<section class="panel eb-scene" data-eb-scene="${ctx.esc(sceneId)}" aria-labelledby="eb-scene-title">${head}<p class="muted">${ctx.t("Nessun incontro è collegato a questa scena. Crealo qui: è lo stesso che trovi in «Incontri».", "No encounter is linked to this scene. Create it here: it is the same one you find in “Encounters”.")}</p><div class="toolbar"><button type="button" class="button primary" data-eb="scene-new">${ctx.icon("plus")} ${ctx.t("Nuovo incontro per questa scena", "New encounter for this scene")}</button><button type="button" class="button" data-eb="scene-tokens">${ctx.t("Dalle pedine della scena", "From the scene’s tokens")}</button>${legacy}</div>${link}</section>`;
}
export function bindSceneEncounter(el, ctx, sceneId, { blocked = "" } = {}) {
  if (!el || !sceneEncounterReady(ctx) || !runs(ctx)) return;
  bindBuilder(el, ctx, { sceneId, blocked });
}

export function renderBuilder(ctx) {
  if (!runs(ctx))
    return `<div class="empty-state"><h2>${ctx.t("Riservato ai DM", "DM only")}</h2></div>`;
  const slice = sliceOf(ctx.state);
  const encounter = openEncounter(ctx);
  return encounter ? renderEditor(ctx, slice, encounter) : renderLibrary(ctx, slice);
}

// ---------------------------------------------------------------- dialogs

// Physical HP dice for every creature a hand-off (or a restart) rolls: one fieldset each.
function physicalHpDialog(ctx, items, done, submitLabel = null) {
  const tokenCount = items.length;
  const body = `<p>${ctx.t("Inserisci le facce dei dadi dei punti ferita di ogni creatura (SRD: usa il valore medio oppure la formula, non entrambi).", "Enter the hit point dice faces for each creature (SRD: use the average or the formula, not both).")}</p>${items
    .map(
      (item, n) =>
        `<fieldset class="eb-hp-faces"><legend>${ctx.esc(item.label ?? D.blockName(item.block, ctx.lang))} ${n + 1}/${tokenCount} · ${ctx.esc(item.block.hp.formula)}</legend>${Array.from({ length: item.dice.count }, (_, i) => `<label class="field eb-face">d${item.dice.sides} ${i + 1}<input type="number" name="hp-${ctx.esc(item.key)}-${i}" min="1" max="${item.dice.sides}" inputmode="numeric" required></label>`).join("")}</fieldset>`,
    )
    .join("")}`;
  ctx.dialog(ctx.t("Punti ferita con dadi fisici", "Hit points with physical dice"), body, {
    submitLabel: submitLabel ?? ctx.t("Prepara nella scena", "Prepare on the scene"),
    onSubmit: (form) => {
      const faces = {};
      for (const item of items)
        faces[item.key] = Array.from({ length: item.dice.count }, (_, i) =>
          Number(form.get(`hp-${item.key}-${i}`)),
        );
      for (const item of items) D.hpFromFaces(item.block, faces[item.key]);
      return done(faces);
    },
  });
}
function runHandOff(ctx, encounter, options, restart = false) {
  let result;
  const ok = act(
    ctx,
    restart
      ? ctx.t(`Incontro riavviato: ${encounter.name}`, `Encounter restarted: ${encounter.name}`)
      : ctx.t(
          `Incontro preparato nella scena: ${encounter.name}`,
          `Encounter prepared on the scene: ${encounter.name}`,
        ),
    (draft, slice) => {
      const deps = { tokenMenuSlice: optionalSlice(draft, D.TOKEN_MENU) };
      result = restart
        ? D.restartEncounter(draft, slice, encounter.id, options, ctx.role, deps)
        : D.handOff(draft, slice, encounter.id, options, ctx.role, deps);
    },
    SCENE,
  );
  if (ok && result)
    ctx.toast(
      restart
        ? ctx.t(
            `${result.reset.length} creature di nuovo in forze e ${result.created.length} nuove su «${result.scene.name}». Tira di nuovo l’iniziativa delle creature.`,
            `${result.reset.length} creatures back to full and ${result.created.length} new on “${result.scene.name}”. Roll the creatures’ initiative again.`,
          )
        : ctx.t(
            `${result.created.length} creature sulla scena «${result.scene.name}»${result.removed.length ? `, ${result.removed.length} tolte` : ""}. Tira l’iniziativa qui o in Preparazione.`,
            `${result.created.length} creatures on “${result.scene.name}”${result.removed.length ? `, ${result.removed.length} removed` : ""}. Roll initiative here or in Preparation.`,
          ),
    );
  return ok;
}
function startHandOff(ctx, encounter, host = null) {
  const ui = uiState(ctx);
  const sceneId =
    encounter.handoff?.sceneId ??
    host?.sceneId ??
    encounter.sceneId ??
    ui.handoff.sceneId ??
    ctx.state.activeSceneId;
  const options = {
    sceneId,
    numbering: encounter.handoff?.options?.numbering ?? ui.handoff.numbering,
    hideNames: encounter.handoff?.options?.hideNames ?? ui.handoff.hideNames,
    hpMode: encounter.handoff?.options?.hpMode ?? ui.handoff.hpMode,
    lang: ctx.lang,
  };
  if (options.hpMode === "physical") {
    let plan;
    try {
      plan = D.planHandOff(ctx.state, sliceOf(ctx.state), encounter.id, sceneId);
    } catch (error) {
      ctx.toast(message(ctx, error), true);
      return;
    }
    if (plan.create.length) {
      physicalHpDialog(ctx, plan.create, (hpFaces) => {
        if (!runHandOff(ctx, encounter, { ...options, hpFaces })) return false;
      });
      return;
    }
  }
  runHandOff(ctx, encounter, options);
}
// DDB Restart with the hand-off's HP choice, physical dice included; characters keep
// their prepared initiative unless the DM clears it too.
function restartDialog(ctx, encounter) {
  ctx.dialog(
    ctx.t("Riavvia l’incontro", "Restart the encounter"),
    `<p>${ctx.t("Le creature di questo incontro tornano in forze dove sono, con PF e iniziativa da capo (una creatura unica collegata resta com’è); i gruppi arrivati tornano in attesa. I tiri già registrati restano nel registro dell’iniziativa; l’incontro attuale va nella cronologia.", "This encounter’s creatures come back to full where they stand, with HP and initiative from scratch (a unique linked creature stays as it is); arrived groups are staged again. Recorded rolls stay in the initiative ledger; the current encounter goes to the history.")}</p><fieldset class="eb-choice"><legend>${ctx.t("Punti ferita", "Hit points")}</legend><label><input type="radio" name="hpMode" value="average" checked> ${ctx.t("Medi", "Average")}</label><label><input type="radio" name="hpMode" value="digital"> ${ctx.t("Tirati con dadi digitali", "Rolled with digital dice")}</label><label><input type="radio" name="hpMode" value="physical"> ${ctx.t("Tirati con dadi fisici", "Rolled with physical dice")}</label></fieldset><label class="eb-check"><input type="checkbox" name="clearPartyRolls"> ${ctx.t("Azzera anche l’iniziativa dei personaggi", "Also clear the characters’ initiative")}</label>`,
    {
      submitLabel: ctx.t("Riavvia", "Restart"),
      onSubmit: (form) => {
        const options = {
          hpMode: String(form.get("hpMode") ?? "average"),
          clearPartyRolls: form.get("clearPartyRolls") === "on",
          lang: ctx.lang,
        };
        if (options.hpMode !== "physical") return runHandOff(ctx, encounter, options, true);
        let plan;
        try {
          plan = D.planRestart(ctx.state, sliceOf(ctx.state), encounter.id);
        } catch (error) {
          ctx.toast(message(ctx, error), true);
          return false;
        }
        const names = optionalSlice(ctx.state, D.TOKEN_MENU)?.names ?? {};
        const items = [
          ...plan.reset.map((item) => ({
            ...item,
            label: names[item.actorId]?.trueName ?? ctx.state.actors[item.actorId]?.name,
          })),
          ...plan.create,
        ];
        if (!items.length) return runHandOff(ctx, encounter, options, true);
        // The dice dialog takes this one's place (the app shows one dialog at a time).
        physicalHpDialog(
          ctx,
          items,
          (hpFaces) => {
            if (!runHandOff(ctx, encounter, { ...options, hpFaces }, true)) return false;
          },
          ctx.t("Riavvia", "Restart"),
        );
      },
    },
  );
}
function deleteDialog(ctx, encounter) {
  ctx.dialog(
    ctx.t("Elimina l’incontro", "Delete the encounter"),
    `<p>${ctx.t(`Eliminare «${ctx.esc(encounter.name)}»? Le pedine già sulla scena restano. Lo ritrovi nella cronologia.`, `Delete “${ctx.esc(encounter.name)}”? Tokens already on the scene stay. You will find it in the history.`)}</p>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit: () => {
        if (
          act(
            ctx,
            ctx.t(`Incontro eliminato: ${encounter.name}`, `Encounter deleted: ${encounter.name}`),
            (draft, slice) => D.deleteEncounter(slice, authority(ctx), encounter.id),
          )
        ) {
          const ui = uiState(ctx);
          if (ui.openId === encounter.id) ui.openId = null;
          saveUi(ctx);
          ctx.render();
        }
      },
    },
  );
}
function fromTokensDialog(ctx) {
  ctx.dialog(
    ctx.t("Incontro dalle pedine", "Encounter from tokens"),
    `<p>${ctx.t("Come “Add All Tokens” di D&D Beyond: le creature visibili della scena entrano nel suo incontro, divise in gruppo, nemici e PNG, e nell’ordine d’iniziativa preparato. I blocchi si caricano dal nome della pedina. Se la scena ha già un incontro dalle pedine, lo aggiorna.", "Like D&D Beyond’s “Add All Tokens”: the scene’s visible creatures join its encounter, sorted into party, enemies and NPCs, and its prepared initiative. Stat blocks load from the token name. If the scene already has an encounter from tokens, it is updated.")}</p><label class="field">${ctx.t("Scena", "Scene")}<select name="scene">${ctx.state.scenes.map((s) => `<option value="${ctx.esc(s.id)}" ${s.id === ctx.state.activeSceneId ? "selected" : ""}>${ctx.esc(s.name)}</option>`).join("")}</select></label>`,
    {
      submitLabel: ctx.t("Aggiungi tutte le pedine", "Add all tokens"),
      onSubmit: (form) => (createFromTokens(ctx, String(form.get("scene"))) ? undefined : false),
    },
  );
}
// DDB "Add All Tokens" (DDB-134): fills (or updates) the scene's one encounter from the
// board. From the Table drawer the DM stays on the map (`open: false`); the library opens
// the result in the builder.
export function createFromTokens(ctx, sceneId, { open = true } = {}) {
  let result;
  const ok = act(
    ctx,
    ctx.t("Pedine della scena nell’incontro", "Scene tokens added to the encounter"),
    (draft, slice) => {
      result = D.encounterFromTokens(draft, slice, sceneId, ctx.role, ctx.lang);
    },
    SCENE,
  );
  if (!ok) return false;
  const { encounter, created, added, hidden, joined, running } = result;
  const counts = Object.groupBy?.(added, (a) => D.actorSide(a)) ?? {};
  const summary = ctx.t(
    `${added.length} pedine: ${counts.party?.length ?? 0} del gruppo, ${counts.enemies?.length ?? 0} nemici, ${(counts.neutral?.length ?? 0) + (counts.allies?.length ?? 0)} PNG`,
    `${added.length} tokens: ${counts.party?.length ?? 0} party, ${counts.enemies?.length ?? 0} enemies, ${(counts.neutral?.length ?? 0) + (counts.allies?.length ?? 0)} NPCs`,
  );
  ctx.toast(
    [
      created
        ? ctx.t(
            `«${encounter.name}» creato da ${summary}.`,
            `“${encounter.name}” created from ${summary}.`,
          )
        : ctx.t(
            `«${encounter.name}» aggiornato: ${summary}.`,
            `“${encounter.name}” updated: ${summary}.`,
          ),
      running
        ? ctx.t(
            "Il combattimento in corso non cambia: fai entrare creature con un gruppo in attesa.",
            "The running combat does not change: bring creatures in with a staged group.",
          )
        : ctx.t(
            `${joined.length} nell’ordine d’iniziativa preparato.`,
            `${joined.length} in the prepared initiative.`,
          ),
      hidden.length
        ? ctx.t(
            `${hidden.length} pedine nascoste escluse: rivelale e ripeti.`,
            `${hidden.length} hidden tokens left out: reveal them and repeat.`,
          )
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
  if (!open) {
    ctx.render();
    return encounter;
  }
  const ui = uiState(ctx);
  ui.openId = encounter.id;
  saveUi(ctx);
  if (ctx.view.page === "preparation" && ctx.view.tab === ID) ctx.render();
  else ctx.navigate("preparation", { tab: ID });
  return encounter;
}
function groupDialog(ctx, encounter) {
  ctx.dialog(
    ctx.t("Nuovo gruppo", "New group"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="60" required value="${ctx.esc(ctx.t("Rinforzi", "Reinforcements"))}"></label><label class="eb-check"><input type="checkbox" name="staged" checked> ${ctx.t("In attesa: le pedine arrivano nascoste e le attivi al Tavolo (come i gruppi “Staged” di Battle Board)", "Staged: tokens arrive hidden and you activate them at the Table (like Battle Board’s “Staged” groups)")}</label>`,
    {
      submitLabel: ctx.t("Aggiungi gruppo", "Add group"),
      onSubmit: (form) => {
        let group;
        const name = String(form.get("name") ?? "");
        if (
          act(ctx, ctx.t(`Gruppo aggiunto: ${name}`, `Group added: ${name}`), (draft, slice) => {
            group = D.addGroup(slice, authority(ctx), encounter.id, {
              name,
              staged: form.get("staged") === "on",
            });
          })
        ) {
          uiState(ctx).targetGroup = group.id;
          ctx.render();
        } else return false;
      },
    },
  );
}
// Battle Board activation (VTL-085): the group's tokens appear; in a running combat each
// row rolls one initiative (digital or physical) and joins the order.
export function activateDialog(ctx, encounterId, groupId) {
  const slice = sliceOf(ctx.state);
  const encounter = slice.encounters.find((e) => e.id === encounterId);
  const group = encounter?.groups.find((g) => g.id === groupId);
  if (!group) return;
  const running =
    ctx.state.combat.active && ctx.state.combat.sceneId === encounter.handoff?.sceneId;
  const rows = encounter.rows.filter((r) => r.groupId === groupId && r.kind === "creature");
  const body = `<p>${running ? ctx.t("Il combattimento è in corso: ogni riga tira una sola iniziativa ed entra nell’ordine dei turni; il turno attuale non cambia.", "Combat is running: each row rolls one initiative and joins the turn order; the current turn does not change.") : ctx.t("Le pedine compaiono ai giocatori e il gruppo entra nell’incontro preparato con l’iniziativa tirata ora.", "The tokens appear to the players and the group joins the prepared encounter with the initiative rolled now.")}</p>${rows
    .map((row) => {
      const block = D.blockOf(slice, D.rowRef(row));
      const n = D.copiesOf(encounter).filter((c) => c.rowId === row.id).length;
      return `<fieldset class="eb-choice" data-eb-activate-row="${ctx.esc(row.id)}"><legend>${ctx.esc(D.blockName(block, ctx.lang))} ×${n} · ${ctx.t("iniziativa", "initiative")} ${signed(block.initiative.bonus)}</legend><label><input type="radio" name="mode-${ctx.esc(row.id)}" value="digital" checked> ${ctx.t("Dado digitale", "Digital die")}</label><label><input type="radio" name="mode-${ctx.esc(row.id)}" value="physical"> ${ctx.t("Dado fisico", "Physical die")}</label><label class="field">${ctx.t("d20 fisico", "Physical d20")}<input type="number" name="natural-${ctx.esc(row.id)}" min="1" max="20" inputmode="numeric"></label></fieldset>`;
    })
    .join("")}`;
  ctx.dialog(ctx.t(`Attiva «${group.name}»`, `Activate “${group.name}”`), body, {
    submitLabel: ctx.t("Attiva gruppo", "Activate group"),
    onSubmit: (form) => {
      const rolls = {};
      for (const row of rows) {
        const mode = form.get(`mode-${row.id}`) === "physical" ? "physical" : "digital";
        rolls[row.id] =
          mode === "physical" ? { mode, natural: Number(form.get(`natural-${row.id}`)) } : { mode };
      }
      let result;
      const ok = act(
        ctx,
        ctx.t(`Gruppo attivato: ${group.name}`, `Group activated: ${group.name}`),
        (draft, s) => {
          result = D.activateGroup(draft, s, encounterId, groupId, { rolls }, ctx.role);
        },
        SCENE,
      );
      if (!ok) return false;
      ctx.toast(
        result.running
          ? ctx.t(
              `«${group.name}» entra nell’ordine dei turni.`,
              `“${group.name}” joins the turn order.`,
            )
          : ctx.t(`«${group.name}» è sulla scena.`, `“${group.name}” is on the scene.`),
      );
    },
  });
}

// ---------------------------------------------------------------- binding

// Focus survives a re-render: after a command the same control is found again by its data
// attributes (scoped to its initiative or block form), else the command's stated
// replacement. Without this every re-render drops keyboard focus on <body>.
const FOCUS_KEYS = [
  "data-eb",
  "data-key",
  "data-row",
  "data-ref",
  "data-group",
  "data-delta",
  "data-id",
  "data-index",
  "data-eb-filter",
  "data-eb-note",
  "data-eb-row-group",
  "data-eb-row-side",
  "data-eb-unique",
  "data-eb-share",
  "data-eb-link",
  "data-eb-name",
  "data-eb-party",
  "data-eb-level",
  "data-eb-ho",
  "data-eb-search",
  "data-eb-sort",
  "data-eb-target",
  "data-eb-options",
  "name",
];
const attrValue = (value) => String(value).replace(/["\\]/g, "\\$&");
export function focusSelector(element) {
  if (!element?.getAttribute || element === globalThis.document?.body) return null;
  const parts = FOCUS_KEYS.filter((key) => element.hasAttribute(key)).map(
    (key) => `[${key}="${attrValue(element.getAttribute(key))}"]`,
  );
  if (["radio", "checkbox"].includes(element.type) && element.hasAttribute("value"))
    parts.push(`[value="${attrValue(element.getAttribute("value"))}"]`);
  if (!parts.length) return null;
  const scope = element.closest?.("[data-eb-init-form]");
  const own = parts.join("");
  return scope
    ? `[data-eb-init-form="${attrValue(scope.dataset.ebInitForm)}"] ${own}`
    : element.closest?.("[data-eb-block-form]")
      ? `[data-eb-block-form] ${own}`
      : own;
}
function refocus(selectors) {
  const doc = globalThis.document;
  if (!doc) return null;
  for (const selector of selectors) {
    if (!selector) continue;
    const target = doc.querySelector(selector);
    if (target) {
      target.focus();
      return target;
    }
  }
  return null;
}
// Search results re-render once typing pauses. Focus and caret return to the box only if
// the person is still in it; otherwise the control they moved to keeps the focus.
function searchRender(box, selector, render) {
  const doc = globalThis.document;
  const typing = doc?.activeElement === box;
  const caret = box.selectionStart;
  const elsewhere = typing ? null : focusSelector(doc?.activeElement);
  render();
  if (!typing) return refocus([elsewhere]);
  const again = doc?.querySelector(selector);
  again?.focus();
  again?.setSelectionRange?.(caret, caret);
}
function focusLost() {
  const doc = globalThis.document;
  return Boolean(doc) && (!doc.activeElement || doc.activeElement === doc.body);
}
/**
 * PR-38 (D&D Beyond Summary/Treasure: saving never eats what you type). Saving a text
 * field when leaving it re-renders the builder; every text field typed into but not yet
 * saved, and the one being typed into, gets its live text, caret and focus back.
 */
export function keepLiveText(run, doc = globalThis.document) {
  const live = doc
    ? [...doc.querySelectorAll("[data-eb-note], [data-eb-name]")]
        .filter((field) => field.value !== field.defaultValue || doc.activeElement === field)
        .map((field) => ({
          selector: focusSelector(field),
          value: field.value,
          start: field.selectionStart,
          end: field.selectionEnd,
          focused: doc.activeElement === field,
        }))
        .filter((item) => item.selector)
    : [];
  const result = run();
  for (const item of live) {
    const field = doc.querySelector(item.selector);
    if (!field) continue;
    const restored = field.value !== item.value;
    if (restored) field.value = item.value;
    if (!item.focused) continue;
    if (doc.activeElement !== field) field.focus();
    field.setSelectionRange?.(item.start ?? item.value.length, item.end ?? item.value.length);
    // A restored value is not a user edit for the browser: leaving the field still saves it.
    if (restored && field.addEventListener) {
      let changed = false;
      field.addEventListener("change", () => (changed = true), { once: true });
      field.addEventListener(
        "blur",
        () => {
          if (!changed && field.value !== field.defaultValue)
            field.dispatchEvent(new Event("change", { bubbles: true }));
        },
        { once: true },
      );
    }
  }
  return result;
}
function bindBuilder(el, ctx, host = null) {
  const ui = uiState(ctx);
  // PR-32: in the scene editor the open encounter is the scene's own.
  const current = () => (host ? sceneEncounterOf(ctx, host.sceneId) : openEncounter(ctx));
  // The scene editor's reason to wait, read at the click (its draft changes without a render).
  const blockedNow = () =>
    typeof host?.blocked === "function" ? host.blocked() : (host?.blocked ?? "");
  const rerender = () => {
    saveUi(ctx);
    ctx.render();
  };
  // Runs a command; when its re-render replaced the control and dropped focus, puts it
  // back (DDB/Kobold+ keep the keyboard on the control just used). A command that did not
  // re-render leaves focus wherever the person moved it.
  const keepFocus = (element, run, fallbacks = []) => {
    const before = focusSelector(globalThis.document?.activeElement) ?? focusSelector(element);
    const result = run();
    if (element?.isConnected === false && focusLost()) refocus([before, ...fallbacks]);
    return result;
  };
  el.addEventListener("click", (event) => {
    const options = event.target.closest?.("[data-eb-options]");
    // Options stay open across re-renders until the DM closes them (the click precedes
    // the native toggle, so an open panel is being closed).
    if (options && el.contains(options)) {
      const details = options.closest("details");
      ui.openOptions = details?.open ? null : options.dataset.ebOptions;
      return;
    }
    const more = event.target.closest?.("[data-eb-edit-more]");
    if (more && el.contains(more) && ui.editing) {
      ui.editing.moreOpen = !more.closest("details")?.open;
      return;
    }
    const button = event.target.closest("[data-eb]");
    if (!button || !el.contains(button) || button.disabled) return;
    const fallbacks = {
      chip: [".eb-chip", '[data-eb="filters-clear"]', '[data-eb-filter="q"]'],
      "filters-clear": ['[data-eb-filter="q"]'],
      "remove-row": ['[data-eb="group-add"]'],
      "group-remove": ['[data-eb="group-add"]'],
      "row-block-close": [`[data-eb="block"][data-row="${attrValue(button.dataset.row ?? "")}"]`],
      "block-cancel": ['[data-eb="block-edit"]'],
      "action-confirm": [`[data-eb-action="${attrValue(button.dataset.action ?? "")}"] .eb-roll`],
      "action-dismiss": [`[data-eb-action="${attrValue(button.dataset.action ?? "")}"]`],
      "init-move": [
        `[data-eb-init="${attrValue(button.dataset.key ?? "")}"] [data-eb="init-roll"]`,
      ],
      "init-sort": ['[data-eb="init-roll"]'],
    }[button.dataset.eb];
    keepFocus(button, () => onClick(event, button), fallbacks ?? []);
  });
  function onClick(event, button) {
    const encounter = current();
    const kind = button.dataset.eb;
    const id = button.dataset.id;
    const byId = (encounterId) => sliceOf(ctx.state).encounters.find((e) => e.id === encounterId);
    switch (kind) {
      case "new": {
        let created;
        if (
          act(ctx, ctx.t("Nuovo incontro", "New encounter"), (draft, slice) => {
            created = D.createEncounter(slice, authority(ctx), { lang: ctx.lang });
          })
        ) {
          ui.openId = created.id;
          ui.targetGroup = "main";
          ui.expanded = null;
          ui.rowBlock = null;
          rerender();
          globalThis.document?.querySelector("[data-eb-name]")?.focus();
        }
        return;
      }
      case "open":
        ui.openId = id;
        ui.targetGroup = "main";
        ui.expanded = null;
        ui.rowBlock = null;
        ui.editing = null;
        return rerender();
      case "back":
        ui.openId = null;
        ui.editing = null;
        ui.rowBlock = null;
        return rerender();
      case "undo":
        return ctx.undo();
      case "from-tokens":
        return fromTokensDialog(ctx);
      case "open-scene-of": {
        const sceneId = D.sceneOfEncounter(byId(id));
        return sceneId && ctx.navigate("preparation", { id: sceneId, tab: "edit" });
      }
      case "open-in-builder":
        ui.openId = id;
        ui.targetGroup = "main";
        ui.expanded = null;
        ui.rowBlock = null;
        saveUi(ctx);
        return ctx.navigate("preparation", { tab: ID });
      case "scene-new": {
        if (!host) return;
        let created;
        const scene = ctx.state.scenes.find((s) => s.id === host.sceneId);
        if (
          act(ctx, ctx.t("Nuovo incontro della scena", "New scene encounter"), (draft, slice) => {
            created = D.createEncounter(slice, authority(ctx), {
              lang: ctx.lang,
              sceneId: host.sceneId,
              name: ctx.t(`Incontro: ${scene?.name ?? ""}`, `Encounter: ${scene?.name ?? ""}`),
            });
          })
        ) {
          ui.sceneOpen[host.sceneId] = created.id;
          ui.targetGroup = "main";
          rerender();
          globalThis.document?.querySelector('[data-eb-filter="q"]')?.focus();
        }
        return;
      }
      case "scene-tokens": {
        if (!host) return;
        const made = createFromTokens(ctx, host.sceneId, { open: false });
        if (made) {
          ui.sceneOpen[host.sceneId] = made.id;
          rerender();
        }
        return;
      }
      case "scene-link": {
        const picked = el.querySelector("[data-eb-scene-link]")?.value;
        if (!host || !picked) return;
        if (
          act(
            ctx,
            ctx.t("Incontro collegato alla scena", "Encounter linked to the scene"),
            (draft, slice) => D.linkToScene(draft, slice, picked, host.sceneId, ctx.role),
          )
        ) {
          ui.sceneOpen[host.sceneId] = picked;
          rerender();
        }
        return;
      }
      case "import": {
        let created;
        if (
          act(
            ctx,
            ctx.t(
              "Incontro della scena riaperto nel costruttore",
              "Scene encounter reopened in the builder",
            ),
            (draft, slice) => {
              created = D.importSceneEncounter(draft, slice, button.dataset.scene, ctx.role);
            },
          )
        ) {
          if (host) ui.sceneOpen[host.sceneId] = created.id;
          else ui.openId = created.id;
          rerender();
        }
        return;
      }
      case "duplicate": {
        let created;
        const source = byId(id);
        if (
          act(
            ctx,
            ctx.t(`Incontro duplicato: ${source?.name}`, `Encounter duplicated: ${source?.name}`),
            (draft, slice) => {
              created = D.duplicateEncounter(slice, authority(ctx), id, ctx.lang);
            },
          )
        ) {
          ctx.toast(
            ctx.t(`Creata la copia «${created.name}».`, `Created the copy “${created.name}”.`),
          );
          rerender();
        }
        return;
      }
      case "delete":
        return byId(id) && deleteDialog(ctx, byId(id));
      case "restart":
        if (blockedNow()) return ctx.toast(blockedNow(), true);
        return byId(id) && restartDialog(ctx, byId(id));
      case "resume":
        return ctx.navigate("table");
      case "start": {
        const target = byId(id);
        if (!target?.handoff) return;
        return ctx.startEncounter?.(target.handoff.sceneId);
      }
      case "history-restore": {
        let created;
        if (
          act(
            ctx,
            ctx.t("Incontro ripristinato dalla cronologia", "Encounter restored from history"),
            (draft, slice) => {
              created = D.restoreFromHistory(slice, authority(ctx), id, ctx.lang);
            },
          )
        ) {
          ui.openId = created.id;
          rerender();
        }
        return;
      }
      case "expand": {
        const key = button.dataset.key;
        ui.expanded = ui.expanded === key ? null : key;
        if (ui.editing?.key === key && !ui.editing.rowId) ui.editing = null;
        return rerender();
      }
      case "chip":
        ui.filters[button.dataset.key] = "";
        return rerender();
      case "filters-clear":
        ui.filters = D.emptyFilters();
        return rerender();
      case "add": {
        const ref = readRef(button.dataset.ref);
        if (!ref || !encounter) return;
        const again = encounter.rows.some(
          (r) => r.kind === "creature" && D.blockKey(D.rowRef(r)) === D.blockKey(ref),
        );
        const block = D.blockOf(sliceOf(ctx.state), ref);
        const groupId = encounter.groups.some((g) => g.id === ui.targetGroup)
          ? ui.targetGroup
          : "main";
        if (
          act(
            ctx,
            ctx.t(
              `${again ? "Aggiunto di nuovo" : "Aggiunto"}: ${D.blockName(block, "it")}`,
              `${again ? "Added again" : "Added"}: ${D.blockName(block, "en")}`,
            ),
            (draft, slice) =>
              D.addCreature(slice, authority(ctx), encounter.id, ref, { groupId, again }),
          )
        )
          ctx.toast(
            again
              ? ctx.t("Nuova riga con la sua iniziativa.", "New row with its own initiative.")
              : ctx.t(
                  `${D.blockName(block, "it")} nell’incontro.`,
                  `${D.blockName(block, "en")} in the encounter.`,
                ),
          );
        return;
      }
      case "count": {
        const delta = Number(button.dataset.delta);
        act(
          ctx,
          ctx.t(
            delta > 0 ? "Una copia in più" : "Una copia in meno",
            delta > 0 ? "One more copy" : "One fewer copy",
          ),
          (draft, slice) =>
            D.changeCount(slice, authority(ctx), encounter.id, button.dataset.row, delta),
        );
        // At the limit the pressed button is disabled: the other one keeps the keyboard.
        if (
          globalThis.document?.querySelector(
            `[data-eb="count"][data-row="${attrValue(button.dataset.row)}"][data-delta="${delta}"]`,
          )?.disabled
        )
          refocus([
            `[data-eb="count"][data-row="${attrValue(button.dataset.row)}"][data-delta="${-delta}"]`,
          ]);
        return;
      }
      case "remove-row":
        act(
          ctx,
          ctx.t("Riga rimossa dall’incontro", "Row removed from the encounter"),
          (draft, slice) => D.removeRow(slice, authority(ctx), encounter.id, button.dataset.row),
        );
        if (ui.rowBlock === button.dataset.row) ui.rowBlock = null;
        return;
      case "unlink":
        act(ctx, ctx.t("Blocco scollegato", "Stat block unlinked"), (draft, slice) =>
          D.updateRow(slice, authority(ctx), encounter.id, button.dataset.row, { ref: null }),
        );
        return;
      case "group-add":
        return encounter && groupDialog(ctx, encounter);
      case "group-staged": {
        const group = encounter.groups.find((g) => g.id === button.dataset.group);
        act(
          ctx,
          ctx.t(
            `Gruppo ${group.staged ? "in scena subito" : "in attesa"}: ${group.name}`,
            `Group ${group.staged ? "on stage at once" : "staged"}: ${group.name}`,
          ),
          (draft, slice) =>
            D.setGroupStaged(slice, authority(ctx), encounter.id, group.id, !group.staged),
        );
        return;
      }
      case "group-remove":
        act(ctx, ctx.t("Gruppo eliminato", "Group deleted"), (draft, slice) =>
          D.removeGroup(slice, authority(ctx), encounter.id, button.dataset.group),
        );
        if (ui.targetGroup === button.dataset.group) ui.targetGroup = "main";
        return;
      case "party-add":
      case "party-remove": {
        const levels = [...(encounter.party.levels.length ? encounter.party.levels : [3, 3, 3, 3])];
        if (kind === "party-add") levels.push(levels.at(-1) ?? 3);
        else levels.splice(Number(button.dataset.index), 1);
        act(ctx, ctx.t("Gruppo tipo aggiornato", "Typical party updated"), (draft, slice) =>
          D.setParty(slice, authority(ctx), encounter.id, { mode: "custom", levels }),
        );
        return;
      }
      case "block": {
        ui.rowBlock = ui.rowBlock === button.dataset.row ? null : button.dataset.row;
        return rerender();
      }
      case "row-block-close":
        ui.rowBlock = null;
        if (ui.editing?.rowId) ui.editing = null;
        return rerender();
      case "block-edit": {
        const ref = readRef(button.dataset.ref);
        const block = D.blockOf(sliceOf(ctx.state), ref);
        if (!block) return;
        ui.editing = {
          key: D.blockKey(ref),
          ref,
          rowId: button.dataset.row ?? null,
          draft: draftFromBlock(ctx, block),
          dirty: false,
        };
        rerender();
        globalThis.document?.querySelector(`[data-eb-block-form] [name="name"]`)?.focus();
        return;
      }
      case "block-cancel":
        ui.editing = null;
        return rerender();
      case "action-confirm":
      case "action-dismiss":
        act(
          ctx,
          kind === "action-confirm"
            ? ctx.t(
                "Azione confermata dal testo del blocco",
                "Action confirmed from the block text",
              )
            : ctx.t("Azione lasciata come testo", "Action kept as text"),
          (draft, slice) =>
            D.confirmAction(
              slice,
              authority(ctx),
              button.dataset.block,
              button.dataset.action,
              kind === "action-confirm",
            ),
        );
        return;
      case "handoff":
        if (blockedNow()) return ctx.toast(blockedNow(), true);
        return encounter && startHandOff(ctx, encounter, host);
      case "init-roll": {
        const form = button.closest("form");
        const bonus = Number(form?.querySelector("[name=bonus]")?.value);
        const advantage = form?.querySelector("[name=advantage]")?.value;
        let result;
        if (
          act(
            ctx,
            ctx.t("Iniziativa del gruppo tirata", "Group initiative rolled"),
            (draft, slice) => {
              result = D.recordGroupInitiative(
                draft,
                slice,
                encounter.id,
                button.dataset.key,
                { mode: "digital", bonus, advantage },
                ctx.role,
              );
            },
            SCENE,
          )
        )
          ctx.toast(initiativeToast(ctx, result));
        return;
      }
      case "open-scene":
        return encounter?.handoff && ctx.navigate("preparation", { id: encounter.handoff.sceneId });
      case "treasure": {
        let parcels;
        if (
          act(
            ctx,
            ctx.t("Bottino dell’incontro preparato", "Encounter loot prepared"),
            (draft, slice) => {
              parcels = D.prepareTreasure(
                draft,
                slice,
                encounter.id,
                ctx.role,
                optionalSlice(draft, D.LOOT),
              );
            },
            SCENE,
          )
        )
          ctx.toast(
            ctx.t(
              `${parcels.length} pacchetti di bottino nascosti ai giocatori, uno per creatura, in Tesori.`,
              `${parcels.length} loot parcels hidden from players, one per creature, in Treasure.`,
            ),
          );
        return;
      }
      case "init-move":
        act(
          ctx,
          ctx.t("Ordine a parità deciso dal DM", "Tie order decided by the DM"),
          (draft, slice) =>
            D.moveTiedGroup(
              draft,
              slice,
              encounter.id,
              button.dataset.key,
              Number(button.dataset.delta),
              ctx.role,
            ),
          SCENE,
        );
        return;
      case "init-sort":
        act(
          ctx,
          ctx.t("Ordine d’iniziativa per totale", "Initiative order by total"),
          (draft, slice) => D.sortPreparedOrder(draft, slice, encounter.id, ctx.role),
          SCENE,
        );
        return;
    }
  }
  el.addEventListener("click", (event) => {
    const button = event.target.closest("[data-eb-roll]");
    if (!button || !el.contains(button)) return;
    const ref = readRef(button.dataset.ebRef);
    const block = D.blockOf(sliceOf(ctx.state), ref);
    try {
      openBlockRoll(ctx, block, JSON.parse(button.dataset.ebRoll));
    } catch (error) {
      ctx.toast(message(ctx, error), true);
    }
  });
  el.addEventListener("change", (event) => {
    const target = event.target;
    // Text fields commit on leaving them: the commit waits until focus has reached the
    // next control, which then keeps it across the re-render.
    if (target.matches("[data-eb-name], [data-eb-note]")) {
      // PR-38: the field the person moved to keeps its text and caret across the save.
      const run = () => keepLiveText(() => keepFocus(target, () => onChange(target)));
      return globalThis.document ? setTimeout(run) : run();
    }
    // A row option keeps its Options panel open (DDB row menu) and its focus.
    const rowId = target.dataset.ebRowGroup ?? target.dataset.ebRowSide ?? target.dataset.ebUnique;
    if (rowId) ui.openOptions = rowId;
    keepFocus(target, () => onChange(target));
  });
  function onChange(target) {
    const encounter = current();
    if (target.matches("[data-eb-filter]") && target.tagName === "SELECT") {
      ui.filters[target.dataset.ebFilter] = target.value;
      return rerender();
    }
    if (target.matches("[data-eb-sort]")) {
      ui.sort = target.value;
      return rerender();
    }
    if (target.matches("[data-eb-target]")) {
      ui.targetGroup = target.value;
      return;
    }
    if (target.matches("[data-eb-scene-pick]") && host) {
      ui.sceneOpen[host.sceneId] = target.value;
      return rerender();
    }
    if (!encounter) return;
    if (target.matches("[data-eb-name]")) {
      act(ctx, ctx.t("Incontro rinominato", "Encounter renamed"), (draft, slice) =>
        D.renameEncounter(slice, authority(ctx), encounter.id, target.value),
      );
      return;
    }
    if (target.matches("[data-eb-party]")) {
      const mode = target.value;
      act(ctx, ctx.t("Gruppo dell’incontro cambiato", "Encounter party changed"), (draft, slice) =>
        D.setParty(slice, authority(ctx), encounter.id, {
          mode,
          levels: encounter.party.levels.length ? encounter.party.levels : [3, 3, 3, 3],
        }),
      );
      return;
    }
    if (target.matches("[data-eb-level]")) {
      const levels = [...(encounter.party.levels.length ? encounter.party.levels : [3, 3, 3, 3])];
      levels[Number(target.dataset.ebLevel)] = Number(target.value);
      act(
        ctx,
        ctx.t("Livello del gruppo tipo cambiato", "Typical party level changed"),
        (draft, slice) =>
          D.setParty(slice, authority(ctx), encounter.id, { mode: "custom", levels }),
      );
      return;
    }
    if (target.matches("[data-eb-note]")) {
      act(ctx, ctx.t("Note dell’incontro salvate", "Encounter notes saved"), (draft, slice) =>
        D.setNotes(slice, authority(ctx), encounter.id, { [target.dataset.ebNote]: target.value }),
      );
      return;
    }
    if (target.matches("[data-eb-row-group]")) {
      act(
        ctx,
        ctx.t("Riga spostata in un altro gruppo", "Row moved to another group"),
        (draft, slice) =>
          D.updateRow(slice, authority(ctx), encounter.id, target.dataset.ebRowGroup, {
            groupId: target.value,
          }),
      );
      return;
    }
    if (target.matches("[data-eb-row-side]")) {
      act(ctx, ctx.t("Lato della riga cambiato", "Row side changed"), (draft, slice) =>
        D.updateRow(slice, authority(ctx), encounter.id, target.dataset.ebRowSide, {
          side: target.value,
        }),
      );
      return;
    }
    if (target.matches("[data-eb-unique]")) {
      act(ctx, ctx.t("Pedina della riga cambiata", "Row token mode changed"), (draft, slice) =>
        D.updateRow(slice, authority(ctx), encounter.id, target.dataset.ebUnique, {
          unique: target.checked,
        }),
      );
      return;
    }
    // PR-35 (DDB counter with a shared-initiative switch).
    if (target.matches("[data-eb-share]")) {
      act(
        ctx,
        target.checked
          ? ctx.t("Iniziativa condivisa dalle copie", "Copies share initiative")
          : ctx.t("Iniziativa individuale per ogni copia", "Individual initiative for each copy"),
        (draft, slice) =>
          D.updateRow(slice, authority(ctx), encounter.id, target.dataset.ebShare, {
            individualInitiative: !target.checked,
          }),
      );
      return;
    }
    if (target.matches("[data-eb-link]")) {
      const ref = readRef(target.value);
      if (!ref) return;
      act(
        ctx,
        ctx.t("Blocco collegato alla pedina", "Stat block linked to the token"),
        (draft, slice) =>
          D.updateRow(slice, authority(ctx), encounter.id, target.dataset.ebLink, { ref }),
      );
      return;
    }
    if (target.matches("[data-eb-ho]")) {
      const key = target.dataset.ebHo;
      ui.handoff[key] = target.type === "checkbox" ? target.checked : target.value;
      // PR-32: choosing the scene of a draft links it there (its scene editor shows it).
      if (key === "sceneId" && !encounter.handoff)
        act(
          ctx,
          ctx.t("Incontro collegato alla scena", "Encounter linked to the scene"),
          (draft, slice) => D.linkToScene(draft, slice, encounter.id, target.value, ctx.role),
        );
      return;
    }
  }
  let searchTimer = null;
  el.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches('[data-eb-filter="q"]')) {
      ui.filters.q = target.value;
      clearTimeout(searchTimer);
      // Re-render after typing pauses; focus and caret return to the search box.
      searchTimer = setTimeout(() => searchRender(target, '[data-eb-filter="q"]', rerender), 250);
      return;
    }
    if (target.matches("[data-eb-search]")) {
      ui.search = target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchRender(target, "[data-eb-search]", ctx.render), 250);
      return;
    }
    const form = target.closest("[data-eb-block-form]");
    if (form && ui.editing) {
      ui.editing.draft = { ...readBlockForm(form, ctx.lang) };
      ui.editing.dirty = true;
    }
  });
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && event.target.closest("[data-eb-block-form]") && ui.editing) {
      event.preventDefault();
      ui.editing = null;
      rerender();
      refocus(['[data-eb="block-edit"]']);
    }
  });
  el.addEventListener("submit", (event) => {
    const form = event.target;
    event.preventDefault();
    const encounter = current();
    if (form.matches("[data-eb-block-form]") && ui.editing) {
      const editing = ui.editing;
      const draft = domainDraft(readBlockForm(form, ctx.lang), ctx.lang);
      let block;
      const ok = (() => {
        try {
          ctx.commit(
            ctx.t(`Blocco salvato: ${draft.name}`, `Stat block saved: ${draft.name}`),
            (state) => {
              const slice = sliceOf(state);
              block = D.saveBlockEdit(slice, authority(ctx), editing.ref, draft, {
                lang: ctx.lang,
              });
              if (editing.rowId && encounter && !editing.ref.blockId)
                D.pointRowToBlock(slice, encounter.id, editing.rowId, block.id);
            },
            DRAFT,
          );
          return true;
        } catch (error) {
          const box = form.querySelector("[data-eb-block-error]");
          if (box) {
            box.textContent = message(ctx, error);
            box.hidden = false;
          }
          ctx.toast(message(ctx, error), true);
          return false;
        }
      })();
      if (!ok) return;
      const key = D.blockKey({ blockId: block.id });
      ui.editing = null;
      if (!editing.rowId) ui.expanded = key;
      rerender();
      refocus([
        `[data-eb-block="${attrValue(key)}"] [data-eb="block-edit"]`,
        '[data-eb="block-edit"]',
      ]);
      const proposals = block.actions.filter((a) => a.proposal).length;
      ctx.toast(
        proposals
          ? ctx.t(
              `Blocco salvato: ${proposals} azioni riconosciute dal testo da confermare.`,
              `Block saved: ${proposals} actions recognised from the text to confirm.`,
            )
          : ctx.t("Blocco salvato.", "Block saved."),
      );
      return;
    }
    if (form.matches("[data-eb-init-form]") && encounter) {
      const data = formDataOf(form);
      let result;
      if (
        act(
          ctx,
          ctx.t(
            "Iniziativa del gruppo registrata (dado fisico)",
            "Group initiative recorded (physical die)",
          ),
          (draft, slice) => {
            result = D.recordGroupInitiative(
              draft,
              slice,
              encounter.id,
              form.dataset.ebInitForm,
              {
                mode: "physical",
                natural: Number(data.get("natural")),
                bonus: Number(data.get("bonus")),
                advantage: data.get("advantage") ?? "normal",
                reason: data.get("reason") ?? "",
              },
              ctx.role,
            );
          },
          SCENE,
        )
      ) {
        ctx.toast(initiativeToast(ctx, result));
        refocus([
          `[data-eb-init-form="${attrValue(form.dataset.ebInitForm)}"] [data-eb="init-roll"]`,
        ]);
      }
    }
  });
}

// ---------------------------------------------------------------- Table drawer

// The encounter's stat blocks at the Table (DDB combat tracker shows the monster block):
// defenses the combat engine does not apply stay in front of the DM, with the block's
// digital or physical rolls.
function drawerBlocks(ctx, slice, encounter) {
  const refs = new Map();
  for (const row of encounter.rows) {
    const ref = D.rowRef(row);
    const block = ref ? D.blockOf(slice, ref) : null;
    if (block && !(row.kind === "actor" && row.side === "party"))
      refs.set(D.blockKey(ref), { ref, block });
  }
  if (!refs.size) return "";
  return `<details class="eb-drawer-blocks"><summary>${ctx.t("Blocchi statistiche", "Stat blocks")} (${refs.size})</summary><p class="muted">${ctx.t("Resistenze, immunità e vulnerabilità ai danni si applicano a mano: il Tavolo non le calcola.", "Damage resistances, immunities and vulnerabilities are applied by hand: the Table does not compute them.")}</p>${[
    ...refs.values(),
  ]
    .map(({ ref, block }) => blockHTML(ctx, block, ref, { editable: false }))
    .join("")}</details>`;
}
function drawerHTML(ctx, tableView) {
  const slice = sliceOf(ctx.state);
  const sceneId = tableView?.scene?.id ?? ctx.state.activeSceneId;
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  const here = slice.encounters.filter((e) => e.handoff?.sceneId === sceneId);
  const board = scene ? D.boardActors(ctx.state, scene, ctx.role) : { visible: [], hidden: [] };
  const fromTokens = D.fromTokensEncounterOf(slice, sceneId);
  return `<div class="eb eb-drawer">${
    here.length
      ? here
          .map((encounter) => {
            const rating = D.rateEncounter(ctx.state, slice, encounter);
            const staged = D.stagedGroups(encounter);
            const arrived = encounter.groups.filter((g) => g.activatedAt);
            return `<article class="eb-drawer-encounter" data-eb-drawer-encounter="${ctx.esc(encounter.id)}"><h3>${ctx.esc(encounter.name)}</h3><p class="muted">${ctx.esc(statusLabel(ctx, D.encounterStatus(ctx.state, encounter)))} · ${ctx.esc(bandLabel(ctx, rating.band))} · ${ctx.esc(xpText(ctx, rating.xp))}</p>${
              encounter.notes.readAloud
                ? `<blockquote class="eb-read-aloud"><p class="muted">${ctx.t("Da leggere ad alta voce", "Read aloud")}</p><p>${ctx.esc(encounter.notes.readAloud)}</p></blockquote>`
                : ""
            }${
              staged.length
                ? `<ul class="eb-staged-list">${staged
                    .map((group) => {
                      const members = encounter.rows
                        .filter((r) => r.groupId === group.id && r.kind === "creature")
                        .map(
                          (r) =>
                            `${D.blockName(D.blockOf(slice, D.rowRef(r)), ctx.lang)} ×${D.copiesOf(encounter).filter((c) => c.rowId === r.id).length}`,
                        )
                        .join(", ");
                      return `<li data-eb-staged="${ctx.esc(group.id)}"><span><strong>${ctx.esc(group.name)}</strong> · ${ctx.t("in attesa", "staged")}<br><span class="muted">${ctx.esc(members)}</span></span><button type="button" class="button primary" data-eb-activate="${ctx.esc(group.id)}" data-encounter="${ctx.esc(encounter.id)}">${ctx.t("Attiva gruppo…", "Activate group…")}</button></li>`;
                    })
                    .join("")}</ul>`
                : ""
            }${arrived.map((g) => `<p class="muted" data-eb-arrived="${ctx.esc(g.id)}">${ctx.esc(g.name)}: ${ctx.t("arrivato", "arrived")} ${ctx.esc(date(ctx, g.activatedAt))}</p>`).join("")}${drawerBlocks(ctx, slice, encounter)}<button type="button" class="button quiet" data-eb-open-builder="${ctx.esc(encounter.id)}">${ctx.t("Apri nel costruttore", "Open in the builder")}</button></article>`;
          })
          .join("")
      : `<p class="muted">${ctx.t("Nessun incontro del costruttore su questa scena.", "No builder encounter on this scene.")}</p>`
  }<div class="eb-drawer-tokens"><p>${
    fromTokens
      ? ctx.t(
          `Aggiorna «${fromTokens.name}» con le pedine visibili nuove della scena.`,
          `Update “${fromTokens.name}” with the scene’s new visible tokens.`,
        )
      : ctx.t(
          "Crea l’incontro della scena con tutte le pedine visibili, divise in gruppo, nemici e PNG, e mettile nell’ordine d’iniziativa preparato.",
          "Create the scene’s encounter with every visible token, sorted into party, enemies and NPCs, and put them in the prepared initiative.",
        )
  }</p><button type="button" class="button" data-eb-all-tokens="${ctx.esc(sceneId)}" ${board.visible.length ? "" : 'disabled aria-describedby="eb-all-tokens-why"'}>${ctx.t("Aggiungi tutte le pedine", "Add all tokens")}</button>${
    board.visible.length
      ? board.hidden.length
        ? `<p class="muted">${ctx.t(`${board.hidden.length} pedine nascoste restano fuori finché non le riveli.`, `${board.hidden.length} hidden tokens stay out until you reveal them.`)}</p>`
        : ""
      : `<p class="muted" id="eb-all-tokens-why">${ctx.t("Nessuna pedina visibile sulla scena: posiziona o rivela una pedina, poi aggiungile.", "No visible tokens on the scene: place or reveal a token, then add them.")}</p>`
  }</div></div>`;
}
function bindDrawer(el, ctx) {
  el.addEventListener("click", (event) => {
    const activate = event.target.closest("[data-eb-activate]");
    if (activate)
      return activateDialog(ctx, activate.dataset.encounter, activate.dataset.ebActivate);
    const open = event.target.closest("[data-eb-open-builder]");
    if (open) {
      const ui = uiState(ctx);
      ui.openId = open.dataset.ebOpenBuilder;
      saveUi(ctx);
      return ctx.navigate("preparation", { tab: ID });
    }
    const roll = event.target.closest("[data-eb-roll]");
    if (roll) {
      const block = D.blockOf(sliceOf(ctx.state), readRef(roll.dataset.ebRef));
      try {
        return openBlockRoll(ctx, block, JSON.parse(roll.dataset.ebRoll));
      } catch (error) {
        return ctx.toast(message(ctx, error), true);
      }
    }
    const all = event.target.closest("[data-eb-all-tokens]");
    // DDB-134: the map stays open; the drawer shows the result.
    if (all && !all.disabled) {
      createFromTokens(ctx, all.dataset.ebAllTokens, { open: false });
      refocus(["[data-eb-all-tokens]"]);
    }
  });
}

// ---------------------------------------------------------------- NPC tools (PR-46, PR-43)

// Where a DM looks at a creature — the Table's creature panel and the NPC's sheet — the
// stat block comes along: «Carica statistiche» when the name matches a block (Clash!
// loads it from the name) and «Incolla riga del blocco» (Fantasy Grounds' parser, Shard)
// for an attack copied from a PDF. Both change nothing until the DM confirms.
function npcToolsHTML(ctx, actor) {
  if (!runs(ctx) || actor?.kind !== "npc" || actor.companion) return "";
  const slice = sliceOf(ctx.state);
  const offer = D.blockOffer(ctx.state, slice, actor.id);
  const melee = actor.combatProfile?.meleeAttack;
  const id = ctx.esc(actor.id);
  const blockName = offer ? ctx.esc(D.blockName(offer.block, ctx.lang)) : "";
  return `<div class="eb-npc-tools" data-eb-npc="${id}">${
    offer
      ? `<div class="eb-npc-offer"><p>${ctx.t(`Il nome corrisponde al blocco «${blockName}»`, `The name matches the “${blockName}” stat block`)} (${ctx.esc(crText(ctx, offer.block))}): ${ctx.t("PF", "HP")} ${offer.block.hp.average} · ${ctx.t("CA", "AC")} ${offer.block.ac}. ${ctx.t("Ora", "Now")}: ${ctx.t("PF", "HP")} ${actor.hp}/${actor.maxHp} · ${ctx.t("CA", "AC")} ${actor.ac}.</p><button type="button" class="button primary" data-eb-npc-load="${id}">${ctx.t("Carica statistiche", "Load statistics")}</button></div>`
      : ""
  }${melee ? `<p class="muted eb-npc-attack">${ctx.t("Attacco", "Attack")}: <strong>${ctx.esc(ctx.label(melee.name))}</strong> ${melee.attackBonus >= 0 ? "+" : ""}${melee.attackBonus} · ${melee.damageDice.map((d) => `${d.count}d${d.sides}`).join("+")}${melee.damageModifier ? (melee.damageModifier > 0 ? "+" : "") + melee.damageModifier : ""}</p>` : ""}<details class="eb-npc-paste"><summary>${ctx.t("Incolla riga del blocco", "Paste a stat block line")}</summary><label class="field">${ctx.t("Riga di un attacco (da PDF o manuale)", "An attack line (from a PDF or book)")}<textarea rows="2" maxlength="400" data-eb-npc-line="${id}" placeholder="${ctx.esc(ctx.t("Scimitarra. Attacco in mischia: +4, portata 1,5 m. 5 (1d6 + 2) danni taglienti.", "Scimitar. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage."))}"></textarea></label><output class="eb-npc-parsed" data-eb-npc-parsed role="status"></output><p class="muted eb-why" id="eb-npc-why-${id}" data-eb-npc-why>${ctx.t("Incolla una riga con tiro per colpire e danni: «Conferma» si attiva quando la riconosco.", "Paste a line with an attack bonus and damage: “Confirm” turns on once it is recognised.")}</p><button type="button" class="button" data-eb-npc-confirm="${id}" disabled aria-describedby="eb-npc-why-${id}">${ctx.t("Conferma l’attacco", "Confirm the attack")}</button></details></div>`;
}
function parsedText(ctx, result) {
  if (!result)
    return ctx.t(
      "Non riconosco ancora un attacco: servono tiro per colpire e danni.",
      "No attack recognised yet: it needs an attack bonus and damage.",
    );
  const { parsed, profile } = result;
  const damage = parsed.damage[0];
  const type = lbl(ctx, srd.LABELS.damageType[damage.type] ?? L(damage.type, damage.type));
  const kind =
    parsed.attack.type === "ranged"
      ? ctx.t("Attacco a distanza", "Ranged attack")
      : ctx.t("Attacco in mischia", "Melee attack");
  return `${ctx.t("Riconosciuto", "Recognised")}: ${profile ? ctx.label(profile.name) + " · " : ""}${kind} ${parsed.attack.bonus >= 0 ? "+" : ""}${parsed.attack.bonus} · ${damage.dice} ${type}${profile ? "" : " · " + ctx.t("al Tavolo le creature attaccano in mischia", "at the Table creatures attack in melee")}`;
}
function bindNpcTools(el, ctx) {
  el.querySelectorAll("[data-eb-npc-load]").forEach((button) =>
    button.addEventListener("click", () => {
      const actorId = button.dataset.ebNpcLoad;
      const offer = D.blockOffer(ctx.state, sliceOf(ctx.state), actorId);
      if (!offer) return;
      act(
        ctx,
        ctx.t("Statistiche caricate dal blocco: ", "Statistics loaded from the block: ") +
          ctx.state.actors[actorId].name,
        (draft, slice) => D.loadBlockStats(draft, slice, actorId, offer.ref, ctx.role),
        SCENE,
      );
    }),
  );
  el.querySelectorAll("[data-eb-npc-line]").forEach((area) => {
    const box = area.closest("[data-eb-npc]");
    const output = box.querySelector("[data-eb-npc-parsed]");
    const confirm = box.querySelector("[data-eb-npc-confirm]");
    area.addEventListener("input", () => {
      const result = area.value.trim() ? D.attackFromLine(area.value) : null;
      output.textContent = area.value.trim() ? parsedText(ctx, result) : "";
      confirm.disabled = !result?.profile;
      // SV-37: the reason stays linked only while the confirm is off.
      box.querySelector("[data-eb-npc-why]")?.toggleAttribute("hidden", !confirm.disabled);
      if (confirm.disabled)
        confirm.setAttribute("aria-describedby", `eb-npc-why-${area.dataset.ebNpcLine}`);
      else confirm.removeAttribute("aria-describedby");
    });
    confirm.addEventListener("click", () => {
      act(
        ctx,
        ctx.t("Attacco dal testo del blocco: ", "Attack from the stat block text: ") +
          ctx.state.actors[area.dataset.ebNpcLine].name,
        (draft) => D.setAttackFromLine(draft, area.dataset.ebNpcLine, area.value, ctx.role),
        SCENE,
      );
    });
  });
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./encounter-builder.css", import.meta.url));
  registry.add("preparation-section", {
    id: ID,
    group: "encounters",
    label: L("Incontri", "Encounters"),
    description: L("Costruttore d’incontri 2024", "2024 encounter builder"),
    when: runsFor,
    order: 12,
    render: renderBuilder,
    bind: bindBuilder,
  });
  registry.add("table-panel", {
    id: ID,
    section: "combat",
    label: L("Incontro", "Encounter"),
    placement: "sidebar-tab",
    icon: "sword",
    when: runsFor,
    order: 20,
    render: (ctx, tableView) => drawerHTML(ctx, tableView),
    bind: (el, ctx) => bindDrawer(el, ctx),
  });
  registry.add("table-panel", {
    id: `${ID}-npc`,
    label: L("Blocco statistiche", "Stat block"),
    placement: "inspector",
    order: 30,
    when: (ctx, tableView) =>
      runsFor(ctx) && Boolean(npcToolsHTML(ctx, ctx.state.actors?.[tableView?.selectedActorId])),
    render: (ctx, tableView) => npcToolsHTML(ctx, ctx.state.actors?.[tableView?.selectedActorId]),
    bind: (el, ctx) => bindNpcTools(el, ctx),
  });
  registry.add("sheet-section", {
    id: `${ID}-npc-sheet`,
    tab: "actions",
    label: L("Blocco statistiche", "Stat block"),
    order: 45,
    when: (ctx, actor) => runsFor(ctx) && Boolean(npcToolsHTML(ctx, actor)),
    render: (ctx, actor) =>
      `<section class="panel eb-npc-panel"><h3>${ctx.t("Blocco statistiche", "Stat block")}</h3>${npcToolsHTML(ctx, actor)}</section>`,
    bind: (el, ctx) => bindNpcTools(el, ctx),
  });
  registry.add("command", {
    id: `${ID}.paste-line`,
    label: L("Incolla riga del blocco", "Paste a stat block line"),
    description: L(
      "Attacco dal testo di un PDF per il PNG selezionato (parser, carica statistiche)",
      "Attack from a PDF's text for the selected NPC (parser, load statistics)",
    ),
    when: runsFor,
    group: "preparation",
    run: () => {
      const details = globalThis.document?.querySelector?.(".eb-npc-paste");
      if (!details)
        throw Object.assign(Error("No NPC"), {
          it: "Seleziona una creatura del DM sulla mappa o apri la sua scheda.",
          en: "Select a DM creature on the map or open its sheet.",
        });
      details.open = true;
      details.querySelector("textarea")?.focus();
    },
  });
  registry.add("command", {
    id: `${ID}.open`,
    label: L("Apri il costruttore d’incontri", "Open the encounter builder"),
    description: L(
      "Incontri della campagna: creature, difficoltà 2024, iniziativa e avvio",
      "The campaign's encounters: monsters, 2024 difficulty, initiative and start",
    ),
    // H-07 (re-audit obs. 2): the words a first-time DM types.
    keywords: [
      L("costruttore di incontri", "encounter builder"),
      L("incontri", "encounters"),
      L("incontro", "encounter"),
      L("mostri", "monsters"),
      L("difficoltà", "difficulty"),
    ],
    when: runsFor,
    group: "preparation",
    run: (ctx) => ctx.navigate("preparation", { tab: ID }),
  });
  registry.add("draft-guard", {
    id: `${ID}-block`,
    label: L("Blocco statistiche non salvato", "Unsaved stat block"),
    hasDraft: (ctx, next) =>
      Boolean(uiState(ctx).editing?.dirty) &&
      !(next?.page === "preparation" && next?.tab === ID && !next?.role),
    confirm: (ctx, proceed) =>
      ctx.dialog(
        ctx.t("Blocco non salvato", "Unsaved stat block"),
        `<p>${ctx.t("Hai modificato il blocco statistiche senza salvarlo.", "You changed the stat block without saving it.")}</p>`,
        {
          submitLabel: ctx.t("Scarta le modifiche", "Discard the changes"),
          cancelLabel: ctx.t("Continua a modificare", "Keep editing"),
          onSubmit: () => {
            uiState(ctx).editing = null;
            proceed();
          },
        },
      ),
  });
  registry.on("reset", () => resetUi());
  registry.on("role-changed", () => {
    for (const ui of uiByRole.values()) ui.editing = null;
  });
}
