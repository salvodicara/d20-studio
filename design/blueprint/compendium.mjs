// B16 — Library: compendium, reader, glossary and attribution.
//
// One Library collection ("Compendio SRD") holds the browser with faceted filters
// (D&D Beyond listings DDB-162, dnd5e Compendium Browser FVT-170), entry pages with
// source, edition and revision (DDB-165, R20-042, DDB-169), nested lockable glossary
// tooltips (DDB-166, dnd5e &Reference FVT-176, CK3/Rogue Trader CRP-172), a reader with
// table of contents, position, previous/next and bookmarks (DDB-159, DDB-208, R20-191),
// class summary and spell list pages (FVT-173/174), print views (DDB-160) and the
// EN/IT attribution page (SVC-128). The DM screen (CMP-181, FVT-106, VTL-193) opens
// as a Table drawer, and "@Embed[...]" puts stat blocks into journal text (FVT-175).
// Adding content elsewhere reuses existing flows: the sheet's inventory/spell rows and
// preparation's createSceneNPC/placeSceneToken (with the token menu's hidden name, and a
// Table tool to drop the creature where the DM clicks). Rolls use the core rollDie with a
// physical-die alternative; each accepted roll is a log roll (rolls[]) announced with
// "roll-accepted", with reasoned correction and withdrawal as in the dice area.

import * as srd from "./srd-sample.mjs";
import * as data from "./srd-compendium.mjs";
import { rollDie } from "./state.mjs";
import { saveInventoryItem } from "./characters.mjs";
import { skills as RULE_SKILLS } from "./character-rules.mjs";
import { createSceneNPC, placeSceneToken } from "./preparation.mjs";
import { setNameHidden } from "./token-menu.mjs";
import * as content from "./campaign-content.mjs";
import * as hb from "./homebrew.mjs";
import { registerTextEmbed, parseDamageRef, parseRewardRef } from "./text-embeds.mjs";
import * as HD from "./homebrew-editor-domain.mjs";
import { packCreatureNpc } from "./compat-packs.mjs";

const ID = "compendium";
const ROLLS = "compendium-rolls";
const PLACE_TOOL = "compendium-place";
const TOKEN_MENU = "token-menu";
const RANDOM_TABLES = "random-tables";
const localized = (it, en) => Object.assign(new Error(en), { it, en });
const L = (it, en) => ({ it, en });
const privateLocal = { local: true, visibility: "private" };
const uid = () => crypto.randomUUID();
const pick = (value, lang) =>
  value && typeof value === "object"
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");
let registryRef = null;
const slice = (state) => registryRef.slice(state, ID);
const rollSlice = (state) => registryRef.slice(state, ROLLS);

// ---------------------------------------------------------------- per-viewer UI state

// Filters, category, content language and open rows are per identity and per browser
// tab (sessionStorage), like the Library's own filters: "Back to results" restores them.
const uiCache = new Map();
const UI_KEY = (role) => `d20-compendium-ui:${role}`;
const READ_KEY = (role) => `d20-compendium-reading:${role}`;
function storage(kind) {
  try {
    return kind === "local" ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}
function readJSON(kind, key) {
  try {
    return JSON.parse(storage(kind)?.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function writeJSON(kind, key, value) {
  try {
    storage(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows or blocked storage: the state stays in memory for this visit.
  }
}
export function uiState(ctx) {
  if (!uiCache.has(ctx.role)) {
    const saved = readJSON("session", UI_KEY(ctx.role)) ?? {};
    const filters = {};
    for (const c of data.CATEGORIES)
      filters[c.id] =
        saved.filters?.[c.id] && typeof saved.filters[c.id] === "object"
          ? { q: String(saved.filters[c.id].q ?? ""), facets: saved.filters[c.id].facets ?? {} }
          : data.emptyFilter();
    uiCache.set(ctx.role, {
      category: data.CATEGORIES.some((c) => c.id === saved.category) ? saved.category : "spells",
      filters,
      contentLang: ["it", "en"].includes(saved.contentLang) ? saved.contentLang : null,
      expanded: typeof saved.expanded === "string" ? saved.expanded : null,
      spellGroup: ["level", "school", "alpha"].includes(saved.spellGroup)
        ? saved.spellGroup
        : "level",
      filtersOpen: saved.filtersOpen === true,
      dieMode: saved.dieMode === "physical" ? "physical" : "digital",
      openFacets:
        saved.openFacets && typeof saved.openFacets === "object" ? { ...saved.openFacets } : {},
      contextKey: typeof saved.contextKey === "string" ? saved.contextKey : null,
    });
  }
  return uiCache.get(ctx.role);
}
function saveUi(ctx) {
  writeJSON("session", UI_KEY(ctx.role), uiState(ctx));
}
export function resetUiState() {
  uiCache.clear();
  Object.assign(readerState, { chapter: null, role: null });
  status = null;
  pendingSection = null;
  placement = null;
  screenFocus = null;
}
// Content language (Babele, SVC-157): the UI language stays; the entry text, source and
// attribution switch to the chosen official SRD language.
function contentLang(ctx) {
  return uiState(ctx).contentLang ?? ctx.lang;
}
export function readingPosition(role) {
  const saved = readJSON("local", READ_KEY(role));
  return data.readerChapter(saved?.chapterId) &&
    data.readerChapter(saved.chapterId).entries.includes(saved.sectionId)
    ? saved
    : null;
}
function saveReadingPosition(role, chapterId, sectionId) {
  writeJSON("local", READ_KEY(role), { chapterId, sectionId });
}

// A short confirmation shown in the page after a command (with its follow-up actions).
let status = null;
let pendingSection = null;
// A creature waiting to be dropped on the active scene where the DM clicks (Foundry and
// Roll20 drop a compendium actor at the pointer; Owlbear drops from its panel): {entryId,
// name, team, hidden, hideName, activate}. DM identity only; cleared on role change.
let placement = null;
// DM screen: the tool of a panel to focus again after its commit re-renders the drawer.
let screenFocus = null;

// ---------------------------------------------------------------- views and navigation

// Sub-pages live inside the Library collection route (#library?tab=compendium), so the
// main navigation, the collection tabs and a sheet's return context stay in place. The
// `revision` route parameter carries the compendium view: an entry id, "reader[:id]",
// "legal", "class:<id>" or "print:<entry id>".
export function parseView(value = "") {
  const v = String(value || "");
  if (!v) return { page: "browse" };
  if (v.startsWith("srd2024:"))
    return data.getEntry(v) ? { page: "entry", id: v } : { page: "missing" };
  const cut = v.indexOf(":");
  const page = cut < 0 ? v : v.slice(0, cut),
    arg = cut < 0 ? "" : v.slice(cut + 1);
  if (page === "reader")
    return !arg || data.readerChapter(arg)
      ? { page: "reader", chapterId: arg || null }
      : { page: "missing" };
  if (page === "legal") return { page: "legal" };
  if (page === "class")
    return data.classSummary(arg) ? { page: "class", classId: arg } : { page: "missing" };
  if (page === "print")
    return data.getEntry(arg) ? { page: "print", id: arg } : { page: "missing" };
  return { page: "missing" };
}
function go(ctx, view = "", { keepReturn = true } = {}) {
  ctx.navigate("library", {
    tab: ID,
    ...(view ? { revision: view } : {}),
    ...(keepReturn && ctx.view.page === "library" && ctx.view.returnTo
      ? { returnTo: ctx.view.returnTo }
      : {}),
  });
}
// Sheet context from the Library's "Browse library" on a sheet tab.
export function sheetTarget(ctx) {
  if (ctx.view.page !== "library") return null;
  try {
    const target = JSON.parse(ctx.view.returnTo || "null");
    if (target?.page === "characters" && typeof target.actorId === "string") {
      const actor = ctx.state.actors[target.actorId];
      return actor && ctx.canControl(actor)
        ? { actor, tab: target.tab || "actions" }
        : { missing: true };
    }
    if (target?.page === "builder") return { builder: target };
  } catch {}
  return null;
}
const esc = (ctx, value) => ctx.esc(value);
const cssEscape = (value) =>
  globalThis.CSS?.escape ? globalThis.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
const attr = (ctx, value) => ctx.esc(value);

// ---------------------------------------------------------------- shared fragments

function termButton(ctx, segment) {
  return `<button type="button" class="compendium-term" data-compendium-term="${attr(ctx, segment.term)}" aria-expanded="false">${esc(ctx, segment.text)}</button>`;
}
// Text with glossary terms as buttons that open nested tooltips.
export function linked(ctx, value, lang, exclude = []) {
  return data
    .linkTerms(value, lang, { exclude })
    .map((segment) => (segment.term ? termButton(ctx, segment) : esc(ctx, segment.text)))
    .join("");
}
const plain = (ctx, value) => esc(ctx, value);
function badges(ctx, entry, lang) {
  const translated = srd.translationStatus(entry) === "official";
  return `<ul class="compendium-badges" aria-label="${attr(ctx, ctx.t("Edizione e fonte", "Edition and source"))}"><li class="compendium-badge edition">${ctx.t("Regole", "Rules")} ${data.EDITION}</li><li class="compendium-badge">SRD ${data.REVISION}</li><li class="compendium-badge ${translated ? "" : "warn"}">${esc(ctx, pick(data.translationLabel(entry, lang), ctx.lang))}</li></ul>`;
}
function pagesText(ctx, entry) {
  const en = entry.source?.en?.pages ?? [],
    it = entry.source?.it?.pages ?? [];
  return `${ctx.t("p.", "p.")} ${en.join(", ") || "—"} EN · ${it.length ? it.join(", ") : ctx.t("non registrata", "not recorded")} IT`;
}
// Source footer in the content language, with the matching attribution sentence (BI-02,
// BI-06, BI-07, BI-08, BI-13).
function sourceFooter(ctx, entry, lang, { print = false } = {}) {
  const s = data.sourceFor(entry, lang);
  const verifiedIt = lang !== "it" || (entry.source?.it?.pages ?? []).length > 0;
  return `<footer class="compendium-source" lang="${lang}"><h3>${ctx.t("Fonte", "Source")}</h3><p><strong>${esc(ctx, s.title)}</strong> · ${lang === "it" ? "Italiano" : "English"} · ${ctx.t("pagina", "page")} ${esc(ctx, s.pages.join(", ") || "—")}${verifiedIt ? "" : ` · ${ctx.t("pagina IT non registrata nel catalogo", "IT page not recorded in the catalogue")}`}</p><p>${ctx.t("Edizione", "Edition")} ${esc(ctx, s.edition)} · ${ctx.t("Revisione", "Revision")} ${esc(ctx, s.revision)} · SHA-256 <code>${esc(ctx, s.sha256.slice(0, 12))}…</code>${print ? "" : ` · <a href="${attr(ctx, s.url)}" target="_blank" rel="noopener noreferrer">${ctx.t("PDF ufficiale", "Official PDF")}</a>`}</p><p class="compendium-policy">${esc(ctx, pick(data.SUMMARY_POLICY, ctx.lang))}</p><blockquote class="compendium-attribution" lang="${lang}">${esc(ctx, data.SRD_ATTRIBUTION[lang])}</blockquote><p class="compendium-rules-footer">${ctx.t("Regole", "Rules")} ${data.EDITION} · SRD ${data.REVISION}${print ? "" : ` · <button type="button" class="text-button" data-compendium-go="legal">${ctx.t("Fonti e attribuzione", "Sources and attribution")}</button>`}</p></footer>`;
}
const AREA = {
  sphere: L("Sfera", "Sphere"),
  cone: L("Cono", "Cone"),
  cube: L("Cubo", "Cube"),
  square: L("Quadrato", "Square"),
  cylinder: L("Cilindro", "Cylinder"),
  emanation: L("Emanazione", "Emanation"),
  line: L("Linea", "Line"),
};
const UNIT = {
  minute: [L("minuto", "minute"), L("minuti", "minutes")],
  hour: [L("ora", "hour"), L("ore", "hours")],
  round: [L("round", "round"), L("round", "rounds")],
};
const SPEEDS = {
  walk: L("", ""),
  climb: L("Scalare", "Climb"),
  fly: L("Volare", "Fly"),
  swim: L("Nuotare", "Swim"),
  burrow: L("Scavare", "Burrow"),
};
const SENSES = {
  darkvision: L("Scurovisione", "Darkvision"),
  blindsight: L("Vista cieca", "Blindsight"),
};
const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
function rollButton(ctx, spec, text, extra = "") {
  return `<button type="button" class="compendium-roll" data-compendium-roll="${attr(ctx, JSON.stringify(spec))}" ${extra}>${ctx.icon("dice")}<span>${esc(ctx, text)}</span></button>`;
}
const signed = data.signed;
// Spell facts in the content language, as [label, text] pairs: the entry page renders
// them, a Library copy writes them into its editable description.
function spellFacts(entry, lang) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const range =
    entry.range.kind === "feet"
      ? srd.formatDistance(entry.range.feet, lang)
      : entry.range.kind === "touch"
        ? t("Contatto", "Touch")
        : t("Incantatore", "Self");
  const area = entry.area
    ? ` · ${l(AREA[entry.area.shape] ?? L(entry.area.shape, entry.area.shape))} ${srd.formatDistance(entry.area.feet, lang)}`
    : "";
  const c = entry.components;
  const components = [
    c.verbal && "V",
    c.somatic && "S",
    c.material &&
      `M${c.materialCostGp ? ` (${c.materialCostGp} ${t("mo", "GP")}${c.materialConsumed ? t(", consumata", ", consumed") : ""})` : ""}`,
  ]
    .filter(Boolean)
    .join(", ");
  const d = entry.duration;
  const duration =
    d.kind === "instantaneous"
      ? t("Istantanea", "Instantaneous")
      : `${entry.concentration ? t("Concentrazione, fino a ", "Concentration, up to ") : ""}${d.amount} ${l(UNIT[d.unit]?.[d.amount === 1 ? 0 : 1] ?? L(d.unit, d.unit))}`;
  const damage = (entry.damage ?? []).filter((term) => data.parseDice(term.dice));
  const casting = `${entry.castingTime.amount} ${l(
    {
      action: L("azione", "action"),
      "bonus-action": L("azione bonus", "bonus action"),
      reaction: L("reazione", "reaction"),
      hour: L("ora", "hour"),
    }[entry.castingTime.unit],
  )}${entry.ritual ? t(" o rituale", " or ritual") : ""}`;
  return {
    facts: [
      [t("Livello", "Level"), entry.level === 0 ? t("Trucchetto", "Cantrip") : String(entry.level)],
      [t("Scuola", "School"), l(srd.LABELS.school[entry.school])],
      [t("Tempo di lancio", "Casting time"), casting],
      [t("Gittata", "Range"), range + area],
      [t("Componenti", "Components"), components],
      [t("Durata", "Duration"), duration],
      entry.save && [t("Tiro salvezza", "Saving throw"), l(srd.LABELS.ability[entry.save.ability])],
      entry.attack && [
        t("Attacco", "Attack"),
        entry.attack.type === "melee" ? t("in mischia", "melee") : t("a distanza", "ranged"),
      ],
    ].filter(Boolean),
    damage: damage
      .map(
        (term) =>
          `${term.dice} ${(term.types ?? []).map((type) => l(srd.LABELS.damageType[type])).join("/")}`,
      )
      .join(" + "),
    classes: entry.classes.map((id) => [id, l(srd.LABELS.spellClass[id])]),
  };
}
function spellBody(ctx, entry, lang, interactive) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const s = spellFacts(entry, lang);
  return `<dl class="compendium-facts">${s.facts.map(([label, value]) => fact(label, plain(ctx, value))).join("")}${s.damage ? fact(t("Danni", "Damage"), `${plain(ctx, s.damage)}${interactive ? " " + rollButton(ctx, { entry: entry.id, kind: "damage", source: "spell" }, t("Tira i danni", "Roll damage")) : ""}`) : ""}${fact(t("Classi", "Classes"), s.classes.map(([id, name]) => (interactive ? `<button type="button" class="text-button" data-compendium-go="class:${attr(ctx, id)}">${esc(ctx, name)}</button>` : esc(ctx, name))).join(", "))}</dl><p class="compendium-summary">${interactive ? linked(ctx, l(entry.summary), lang, [entry.id]) : plain(ctx, l(entry.summary))}</p>`;
}
// Item facts as [label, text, roll?] triples (entry page and Library copies).
function itemFacts(entry, lang) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const w = entry.weapon,
    a = entry.armor,
    m = entry.magic;
  return [
    [t("Categoria", "Category"), l(srd.LABELS.itemCategory[entry.category])],
    entry.cost && [t("Costo", "Cost"), srd.formatCost(entry.cost, lang)],
    entry.weight != null && [t("Peso", "Weight"), srd.formatWeight(entry.weight, lang)],
    w && [
      t("Danni", "Damage"),
      `${w.damage.dice} ${l(srd.LABELS.damageType[w.damage.type])}${w.versatile ? ` (${t("versatile", "versatile")} ${w.versatile})` : ""}`,
      data.parseDice(w.damage.dice)
        ? {
            spec: { entry: entry.id, kind: "damage", source: "weapon" },
            text: t("Tira i danni", "Roll damage"),
          }
        : null,
    ],
    w?.properties?.length && [
      t("Proprietà", "Properties"),
      w.properties.map((p) => l(srd.LABELS.weaponProperty[p] ?? L(p, p))).join(", "),
    ],
    w?.range && [
      t("Gittata", "Range"),
      `${srd.formatDistance(w.range.normal, lang)}/${srd.formatDistance(w.range.long, lang)}`,
    ],
    w?.mastery && [
      t("Padronanza", "Mastery"),
      l(srd.LABELS.mastery[w.mastery] ?? L(w.mastery, w.mastery)),
    ],
    a && [
      t("Classe Armatura", "Armor Class"),
      a.baseAc != null
        ? `${a.baseAc}${a.addsDex ? t(" + mod. Des", " + Dex modifier") : ""}${a.dexCap ? ` (max ${a.dexCap})` : ""}`
        : `+${a.acBonus}`,
    ],
    a?.strength && [t("Forza", "Strength"), String(a.strength)],
    a?.stealthDisadvantage && [t("Furtività", "Stealth"), t("Svantaggio", "Disadvantage")],
    m && [t("Tipo", "Type"), l(srd.LABELS.magicItemType[m.type] ?? L(m.type, m.type))],
    m && [
      t("Rarità", "Rarity"),
      (m.variants
        ? m.variants.map((v) => `+${v.bonus} ${l(srd.LABELS.rarity[v.rarity])}`)
        : [l(srd.LABELS.rarity[m.rarity])]
      ).join(" · "),
    ],
    m && [t("Sintonia", "Attunement"), m.attunement ? t("Richiesta", "Required") : t("No", "No")],
    m?.charges && [
      t("Cariche", "Charges"),
      `${m.charges.max} · ${t("recupera", "regains")} ${m.charges.regain}`,
    ],
    m?.healing &&
      data.parseDice(m.healing) && [
        t("Cura", "Healing"),
        m.healing,
        { spec: { entry: entry.id, kind: "healing" }, text: t("Tira la cura", "Roll healing") },
      ],
  ].filter(Boolean);
}
function itemBody(ctx, entry, lang, interactive) {
  const l = (v) => pick(v, lang);
  const facts = itemFacts(entry, lang)
    .map(([label, value, roll]) =>
      fact(
        label,
        `${plain(ctx, value)}${interactive && roll ? " " + rollButton(ctx, roll.spec, roll.text) : ""}`,
      ),
    )
    .join("");
  return `<dl class="compendium-facts">${facts}</dl><p class="compendium-summary">${interactive ? linked(ctx, l(entry.summary), lang, [entry.id]) : plain(ctx, l(entry.summary))}</p>`;
}
function ruleBody(ctx, entry, lang, interactive) {
  const l = (v) => pick(v, lang);
  const related = (entry.related ?? []).map((id) => data.getEntry(id)).filter(Boolean);
  return `${entry.heading ? `<p class="compendium-heading-line">${esc(ctx, l(entry.heading))}</p>` : ""}<p class="compendium-summary">${interactive ? linked(ctx, l(entry.summary), lang, [entry.id]) : plain(ctx, l(entry.summary))}</p>${related.length ? `<p class="compendium-related">${lang === "it" ? "Vedi anche" : "See also"}: ${related.map((r) => (interactive ? `<button type="button" class="text-button" data-compendium-go="${attr(ctx, r.id)}">${esc(ctx, l(r.name))}</button>` : esc(ctx, l(r.name)))).join(", ")}</p>` : ""}`;
}
function actionLine(ctx, creature, action, lang, interactive) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const recharge = action.recharge
    ? ` (${t("Ricarica", "Recharge")} ${action.recharge.replace("-", "–")})`
    : "";
  const rolls = [];
  if (interactive && action.kind === "attack" && Number.isInteger(action.attack?.bonus))
    rolls.push(
      rollButton(
        ctx,
        { entry: creature.id, action: action.id, kind: "attack" },
        `${t("Colpire", "Hit")} ${signed(action.attack.bonus)}`,
      ),
    );
  const dice = (action.damage ?? []).filter((d) => data.parseDice(d.dice));
  if (interactive && dice.length)
    rolls.push(
      rollButton(
        ctx,
        { entry: creature.id, action: action.id, kind: "damage" },
        `${t("Danni", "Damage")} ${dice.map((d) => d.dice).join(" + ")}`,
      ),
    );
  const spells =
    action.spells && !Array.isArray(action.spells)
      ? [
          ...(action.spells.atWill ?? []).map((s) => [t("A volontà", "At will"), s.spellId]),
          ...Object.entries(action.spells.perDay ?? {}).flatMap(([n, list]) =>
            list.map((s) => [t(`${n}/giorno`, `${n}/day`), s.spellId]),
          ),
        ]
      : [];
  return `<p class="compendium-action"><strong>${esc(ctx, l(action.name))}${esc(ctx, recharge)}.</strong> ${interactive ? linked(ctx, l(action.summary), lang, [creature.id]) : plain(ctx, l(action.summary))}${action.saveDc ? ` <span class="muted">${t("CD", "DC")} ${esc(ctx, action.saveDc)}</span>` : ""}</p>${
    spells.length
      ? `<p class="compendium-spell-refs">${spells
          .map(([when, id]) => {
            const spell = data.getEntry(id);
            return spell
              ? `<span>${esc(ctx, when)}: ${interactive ? `<button type="button" class="text-button" data-compendium-go="${attr(ctx, id)}">${esc(ctx, l(spell.name))}</button>` : esc(ctx, l(spell.name))}</span>`
              : "";
          })
          .join(" · ")}</p>`
      : ""
  }${rolls.length ? `<div class="compendium-rolls">${rolls.join("")}</div>` : ""}`;
}
// 2024 stat block layout: AC/Initiative/HP/Speed, ability table with modifier and save,
// then traits, actions, bonus actions and reactions (DDB-160 layout; rolls as DDB).
// Stat block strings in the content language (stat block and Library copies).
function creatureParts(creature, lang) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const size = creature.size.map((s) => l(srd.LABELS.size[s])).join(t(" o ", " or "));
  const type = l(srd.LABELS.creatureType[creature.type]);
  const tags = (creature.typeTags ?? []).map((tag) =>
    l(srd.LABELS.creatureTag[tag] ?? L(tag, tag)),
  );
  const alignment = l(
    srd.LABELS.alignment[creature.alignment] ?? L(creature.alignment, creature.alignment),
  );
  const damageList = (list) => list.map((v) => l(srd.LABELS.damageType[v] ?? L(v, v))).join(", ");
  const conditionList = (list) =>
    list.map((v) => l(data.getEntry(`srd2024:condition:${v}`)?.name ?? L(v, v))).join(", ");
  return {
    subtitle:
      lang === "it"
        ? `${type} ${size}${tags.length ? ` (${tags.join(", ")})` : ""}, ${alignment}`
        : `${size} ${type}${tags.length ? ` (${tags.join(", ")})` : ""}, ${alignment}`,
    speed:
      Object.entries(creature.speed)
        .filter(([key]) => key !== "hover")
        .map(([key, feet]) =>
          `${l(SPEEDS[key] ?? L(key, key))} ${srd.formatDistance(feet, lang)}`.trim(),
        )
        .join(", ") + (creature.speed.hover ? t(" (fluttuare)", " (hover)") : ""),
    skills: Object.entries(creature.skills ?? {}).map(([id, bonus]) => {
      const skill = RULE_SKILLS.find((entry) => entry.id === id)?.name;
      return `${l(skill ?? L(id, id))} ${signed(bonus)}`;
    }),
    senses: [
      ...Object.entries(creature.senses)
        .filter(([key]) => key !== "passivePerception")
        .map(([key, feet]) => `${l(SENSES[key] ?? L(key, key))} ${srd.formatDistance(feet, lang)}`),
      `${t("Percezione passiva", "Passive Perception")} ${creature.senses.passivePerception}`,
    ],
    damageList,
    conditionList,
  };
}
export function statBlock(ctx, creature, lang, { interactive = true, heading = "h3" } = {}) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const { subtitle, speed, skills, senses, damageList, conditionList } = creatureParts(
    creature,
    lang,
  );
  const abilityRows = Object.entries(creature.abilities)
    .map(([key, score]) => {
      const mod = data.abilityModifier(score);
      const save = creature.saves?.[key] ?? mod;
      const name = l(srd.LABELS.ability[key]);
      return `<tr><th scope="row">${esc(ctx, name.slice(0, 3))}<span class="compendium-sr"> ${esc(ctx, name.slice(3))}</span></th><td>${score}</td><td>${interactive ? rollButton(ctx, { entry: creature.id, kind: "check", ability: key }, signed(mod), `aria-label="${attr(ctx, `${t("Prova di", "Check")} ${name} ${signed(mod)}`)}"`) : signed(mod)}</td><td>${interactive ? rollButton(ctx, { entry: creature.id, kind: "save", ability: key }, signed(save), `aria-label="${attr(ctx, `${t("Tiro salvezza su", "Saving throw")} ${name} ${signed(save)}`)}"`) : signed(save)}</td></tr>`;
    })
    .join("");
  const H = heading;
  const section = (title, list) =>
    list.length
      ? `<h4>${esc(ctx, title)}</h4>${list.map((a) => actionLine(ctx, creature, a, lang, interactive)).join("")}`
      : "";
  return `<div class="compendium-statblock" lang="${lang}"><header><${H} class="compendium-statblock-name">${esc(ctx, l(creature.name))}</${H}><p><em>${esc(ctx, subtitle)}</em></p></header><dl class="compendium-core">${fact(t("CA", "AC"), creature.ac)}${fact(t("Iniziativa", "Initiative"), `${interactive ? rollButton(ctx, { entry: creature.id, kind: "initiative" }, `${signed(creature.initiative.bonus)} (${creature.initiative.score})`) : `${signed(creature.initiative.bonus)} (${creature.initiative.score})`}`)}${fact(t("PF", "HP"), `${creature.hp.average} (${esc(ctx, creature.hp.formula)})`)}${fact(t("Velocità", "Speed"), esc(ctx, speed))}</dl><div class="table-wrap compendium-abilities-wrap"><table class="compendium-abilities"><thead><tr><th scope="col">${t("Car.", "Abl.")}</th><th scope="col">${t("Punt.", "Score")}</th><th scope="col">Mod</th><th scope="col">${t("TS", "Save")}</th></tr></thead><tbody>${abilityRows}</tbody></table></div><dl class="compendium-traits-meta">${skills.length ? fact(t("Abilità", "Skills"), esc(ctx, skills.join(", "))) : ""}${creature.vulnerabilities.length ? fact(t("Vulnerabilità", "Vulnerabilities"), esc(ctx, damageList(creature.vulnerabilities))) : ""}${creature.resistances.length ? fact(t("Resistenze", "Resistances"), esc(ctx, damageList(creature.resistances))) : ""}${creature.immunities.length || creature.conditionImmunities.length ? fact(t("Immunità", "Immunities"), esc(ctx, [damageList(creature.immunities), conditionList(creature.conditionImmunities)].filter(Boolean).join("; "))) : ""}${
    creature.gear?.length
      ? fact(
          t("Equipaggiamento", "Gear"),
          creature.gear
            .map((g) => {
              const item = data.getEntry(g.itemId);
              return item
                ? (interactive
                    ? `<button type="button" class="text-button" data-compendium-go="${attr(ctx, item.id)}">${esc(ctx, l(item.name))}</button>`
                    : esc(ctx, l(item.name))) + (g.quantity > 1 ? ` (${g.quantity})` : "")
                : "";
            })
            .join(", "),
        )
      : ""
  }${fact(t("Sensi", "Senses"), esc(ctx, senses.join(", ")))}${fact(t("Lingue", "Languages"), esc(ctx, l(creature.languages)))}${fact(t("GS", "CR"), esc(ctx, `${creature.cr} (${t("PE", "XP")} ${creature.xp}; ${t("BC", "PB")} ${signed(creature.proficiencyBonus)})`))}</dl>${section(t("Tratti", "Traits"), creature.traits ?? [])}${section(t("Azioni", "Actions"), creature.actions ?? [])}${section(t("Azioni bonus", "Bonus Actions"), creature.bonusActions ?? [])}${section(t("Reazioni", "Reactions"), creature.reactions ?? [])}${interactive ? lastRoll(ctx, creature.id) : ""}</div>`;
}
export function entryBody(ctx, entry, lang, { interactive = true, heading = "h3" } = {}) {
  if (entry.kind === "creature") return statBlock(ctx, entry, lang, { interactive, heading });
  const body =
    entry.kind === "spell"
      ? spellBody(ctx, entry, lang, interactive)
      : entry.kind === "item"
        ? itemBody(ctx, entry, lang, interactive)
        : ruleBody(ctx, entry, lang, interactive);
  return `${body}${interactive && ["spell", "item"].includes(entry.kind) ? lastRoll(ctx, entry.id) : ""}`;
}
// The entry's game data as editable plain text, in one content language: a Library copy
// carries it in its description (the Library schema has structured fields only for
// spell level/school and item weight/value), so the duplicate keeps AC, HP, abilities,
// actions, range, components, damage… (DDB/Foundry duplicate, FVT-204).
export function copyText(entry, lang) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const lines = (pairs) => pairs.map(([label, value]) => `${label}: ${value}`);
  if (entry.kind === "spell") {
    const s = spellFacts(entry, lang);
    return [
      ...lines(s.facts),
      ...(s.damage ? [`${t("Danni", "Damage")}: ${s.damage}`] : []),
      `${t("Classi", "Classes")}: ${s.classes.map(([, name]) => name).join(", ")}`,
      "",
      l(entry.summary),
    ].join("\n");
  }
  if (entry.kind === "item")
    return [...lines(itemFacts(entry, lang)), "", l(entry.summary)].join("\n");
  if (entry.kind !== "creature") return l(entry.summary);
  const c = entry;
  const p = creatureParts(c, lang);
  const abilities = Object.entries(c.abilities)
    .map(([key, score]) => {
      const mod = data.abilityModifier(score);
      const save = c.saves?.[key] ?? mod;
      return `${l(srd.LABELS.ability[key]).slice(0, 3).toUpperCase()} ${score} (${signed(mod)}, ${t("TS", "save")} ${signed(save)})`;
    })
    .join(" · ");
  const action = (a) => {
    const rolls = [
      Number.isInteger(a.attack?.bonus) && `${t("Colpire", "Hit")} ${signed(a.attack.bonus)}`,
      (a.damage ?? []).length &&
        `${t("Danni", "Damage")} ${a.damage.map((d) => `${d.dice} ${l(srd.LABELS.damageType[d.type] ?? L(d.type ?? "", d.type ?? ""))}`.trim()).join(" + ")}`,
      a.saveDc && `${t("CD", "DC")} ${a.saveDc}`,
    ].filter(Boolean);
    return `${l(a.name)}${a.recharge ? ` (${t("Ricarica", "Recharge")} ${a.recharge.replace("-", "–")})` : ""}. ${l(a.summary)}${rolls.length ? ` [${rolls.join(" · ")}]` : ""}`;
  };
  const section = (title, list = []) => (list.length ? ["", title, ...list.map(action)] : []);
  const immunities = [p.damageList(c.immunities), p.conditionList(c.conditionImmunities)]
    .filter(Boolean)
    .join("; ");
  return [
    p.subtitle,
    `${t("CA", "AC")} ${c.ac} · ${t("Iniziativa", "Initiative")} ${signed(c.initiative.bonus)} (${c.initiative.score}) · ${t("PF", "HP")} ${c.hp.average} (${c.hp.formula}) · ${t("Velocità", "Speed")} ${p.speed}`,
    abilities,
    ...(p.skills.length ? [`${t("Abilità", "Skills")}: ${p.skills.join(", ")}`] : []),
    ...(c.vulnerabilities.length
      ? [`${t("Vulnerabilità", "Vulnerabilities")}: ${p.damageList(c.vulnerabilities)}`]
      : []),
    ...(c.resistances.length
      ? [`${t("Resistenze", "Resistances")}: ${p.damageList(c.resistances)}`]
      : []),
    ...(immunities ? [`${t("Immunità", "Immunities")}: ${immunities}`] : []),
    `${t("Sensi", "Senses")}: ${p.senses.join(", ")}`,
    `${t("Lingue", "Languages")}: ${l(c.languages)}`,
    `${t("GS", "CR")} ${c.cr} (${t("PE", "XP")} ${c.xp}; ${t("BC", "PB")} ${signed(c.proficiencyBonus)})`,
    ...section(t("Tratti", "Traits"), c.traits),
    ...section(t("Azioni", "Actions"), c.actions),
    ...section(t("Azioni bonus", "Bonus Actions"), c.bonusActions),
    ...section(t("Reazioni", "Reactions"), c.reactions),
    "",
    l(c.summary),
  ].join("\n");
}

// ---------------------------------------------------------------- rolls

function visibleRoll(ctx, roll) {
  return roll.visibility !== "private" || roll.by === ctx.role;
}
// Faces of a record: "values" since rolls became log rolls, "faces" in older records.
const rollValues = (record) => record?.values ?? record?.faces ?? [];
// The latest roll of an entry this viewer may see, with its correction or withdrawal and,
// for the roller, the same "Correggi"/"Ritira" commands as the dice area's own records.
function lastRoll(ctx, entryId) {
  const roll = (rollSlice(ctx.state).rolls ?? [])
    .filter((r) => r.entryId === entryId && visibleRoll(ctx, r))
    .at(-1);
  if (!roll) return "";
  const own = roll.by === ctx.role && roll.status !== "withdrawn";
  const last = roll.corrections?.at(-1);
  const notes = [
    roll.status === "withdrawn" &&
      `${ctx.t("Ritirato", "Withdrawn")}: ${roll.withdrawal?.reason ?? ""}`,
    roll.status === "corrected" &&
      last &&
      `${ctx.t("Corretto", "Corrected")}: ${last.reason} (${ctx.t("prima", "before")} ${last.values.join(", ")})`,
    roll.status === "reused" &&
      ctx.t("Facce riusate dopo il ritiro", "Faces reused after withdrawal"),
  ].filter(Boolean);
  return `<div class="compendium-last-roll ${roll.status === "withdrawn" ? "withdrawn" : ""}" data-compendium-last-roll data-roll-status="${attr(ctx, roll.status ?? "accepted")}"><p>${ctx.t("Ultimo tiro", "Last roll")}: <strong>${esc(ctx, pick(roll.label, ctx.lang))}</strong> · ${esc(ctx, roll.formula)} → [${esc(ctx, rollValues(roll).join(", "))}] = <strong>${roll.total}</strong> · ${roll.mode === "physical" ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}${roll.visibility === "private" ? ` · ${ctx.t("solo DM", "DM only")}` : ""}</p>${notes.map((note) => `<p class="compendium-roll-note">${esc(ctx, note)}</p>`).join("")}${own ? `<div class="compendium-roll-tools">${roll.mode === "physical" && roll.plan ? `<button type="button" class="button quiet" data-roll-correct="${attr(ctx, roll.id)}">${ctx.t("Correggi", "Correct")}</button>` : ""}<button type="button" class="button quiet" data-roll-withdraw="${attr(ctx, roll.id)}">${ctx.t("Ritira", "Withdraw")}</button></div>` : ""}</div>`;
}
// Turns a roll button spec into a roll request from catalogue data (never from DOM text).
export function rollRequest(spec, lang = "it") {
  // CA-26 (dnd5e [[/damage]]): a damage roll written in a note.
  if (spec?.embed) {
    const d = parseDamageRef(spec.embed);
    if (!d) throw new Error("Unknown roll");
    const type = d.type ? srd.LABELS.damageType[d.type] : null;
    return {
      entry: { id: `embed:${spec.embed}`, name: L("Danni", "Damage") },
      kind: "damage",
      terms: [{ dice: d.dice, type: d.type }],
      canCritical: true,
      label: L(
        `Danni ${d.dice}${type ? ` da ${type.it.toLowerCase()}` : ""}`,
        `${d.dice}${type ? ` ${type.en.toLowerCase()}` : ""} damage`,
      ),
    };
  }
  const entry = data.getEntry(spec?.entry);
  if (!entry) throw new Error("Unknown entry");
  if (entry.kind === "creature") {
    if (spec.kind === "check" || spec.kind === "save") {
      const score = entry.abilities[spec.ability];
      if (score == null) throw new Error("Unknown ability");
      const mod = data.abilityModifier(score);
      const bonus = spec.kind === "save" ? (entry.saves?.[spec.ability] ?? mod) : mod;
      const ability = srd.LABELS.ability[spec.ability];
      return {
        entry,
        kind: "d20",
        rollKind: spec.kind,
        bonus,
        label: L(
          `${entry.name.it} · ${spec.kind === "save" ? "tiro salvezza su" : "prova di"} ${ability.it}`,
          `${entry.name.en} · ${ability.en} ${spec.kind === "save" ? "saving throw" : "check"}`,
        ),
      };
    }
    if (spec.kind === "initiative")
      return {
        entry,
        kind: "d20",
        rollKind: "initiative",
        bonus: entry.initiative.bonus,
        label: L(`${entry.name.it} · iniziativa`, `${entry.name.en} · initiative`),
      };
    const action = [
      ...(entry.actions ?? []),
      ...(entry.bonusActions ?? []),
      ...(entry.reactions ?? []),
    ].find((a) => a.id === spec.action);
    if (!action) throw new Error("Unknown action");
    if (spec.kind === "attack" && Number.isInteger(action.attack?.bonus))
      return {
        entry,
        action,
        kind: "d20",
        rollKind: "attack",
        bonus: action.attack.bonus,
        label: L(
          `${entry.name.it} · ${action.name.it} · tiro per colpire`,
          `${entry.name.en} · ${action.name.en} · attack roll`,
        ),
      };
    if (spec.kind === "damage") {
      const terms = (action.damage ?? [])
        .filter((d) => data.parseDice(d.dice))
        .map((d) => ({ dice: d.dice, type: d.type }));
      if (!terms.length) throw new Error("No damage dice");
      return {
        entry,
        action,
        kind: "damage",
        terms,
        canCritical: action.kind === "attack",
        label: L(
          `${entry.name.it} · ${action.name.it} · danni`,
          `${entry.name.en} · ${action.name.en} · damage`,
        ),
      };
    }
    throw new Error("Unknown roll");
  }
  if (entry.kind === "spell" && spec.kind === "damage") {
    const terms = (entry.damage ?? [])
      .filter((d) => data.parseDice(d.dice))
      .map((d) => ({ dice: d.dice, type: d.types?.[0] ?? null }));
    if (!terms.length) throw new Error("No damage dice");
    return {
      entry,
      kind: "damage",
      terms,
      canCritical: Boolean(entry.attack),
      label: L(`${entry.name.it} · danni`, `${entry.name.en} · damage`),
    };
  }
  if (entry.kind === "item" && spec.kind === "damage" && entry.weapon) {
    return {
      entry,
      kind: "damage",
      terms: [{ dice: entry.weapon.damage.dice, type: entry.weapon.damage.type }],
      canCritical: true,
      label: L(`${entry.name.it} · danni`, `${entry.name.en} · damage`),
    };
  }
  if (entry.kind === "item" && spec.kind === "healing" && entry.magic?.healing) {
    return {
      entry,
      kind: "damage",
      healing: true,
      terms: [{ dice: entry.magic.healing, type: null }],
      canCritical: false,
      label: L(`${entry.name.it} · cura`, `${entry.name.en} · healing`),
    };
  }
  throw new Error("Unknown roll");
}
function planFor(request, options) {
  return request.kind === "d20"
    ? data.rollPlan({ kind: "d20", bonus: request.bonus, mode: options.mode })
    : data.rollPlan({
        kind: "damage",
        terms: request.terms,
        critical: request.canCritical && options.critical,
      });
}
// Kind of a roll as the log names it (chat and dice areas): attack, damage, save,
// check, initiative, healing. Requests built elsewhere (encounter builder) carry no
// rollKind: it follows from their action and label.
function rollKindOf(request) {
  if (request.rollKind) return request.rollKind;
  if (request.kind === "damage") return request.healing ? "healing" : "damage";
  if (request.action) return "attack";
  const en = pick(request.label, "en");
  return /saving throw$/.test(en) ? "save" : /initiative$/.test(en) ? "initiative" : "check";
}
// "Lupo · Morso · tiro per colpire" → who "Lupo", what "Morso · tiro per colpire".
function labelParts(label) {
  const split = (value) => {
    const text = String(value ?? "");
    const cut = text.indexOf(" · ");
    return cut < 0 ? [text, ""] : [text.slice(0, cut), text.slice(cut + 3)];
  };
  const [whoIt, whatIt] = split(label?.it);
  const [whoEn, whatEn] = split(label?.en);
  return { who: L(whoIt, whoEn), what: L(whatIt, whatEn) };
}
// Dice groups in face order ({count, sides}), as log rolls carry them.
function diceGroups(plan) {
  const groups = [];
  for (const die of plan.dice) {
    const last = groups.at(-1);
    if (last && last.sides === die.sides && last.group === die.group) last.count += 1;
    else groups.push({ count: 1, sides: die.sides, group: die.group });
  }
  return groups.map(({ count, sides }) => ({ count, sides }));
}
// The log roll of a record (the shape of state.log rolls[]: owner, controller, visibility,
// mode, dice, values, modifier, total), read by the chat, the dice and the archive.
export function logRollOf(record, lang = "it") {
  const values = rollValues(record);
  const d20 = record.kind === "d20";
  const parts = labelParts(record.label);
  const dice = record.plan
    ? diceGroups(record.plan)
    : d20
      ? [{ count: values.length, sides: 20 }]
      : null;
  return {
    id: record.id,
    source: "compendium",
    kind: record.rollKind ?? (d20 ? "check" : "damage"),
    compendiumRollId: record.id,
    entryId: record.entryId,
    actionId: record.actionId ?? null,
    // Who rolled is the stat block ("Lupo"); the label says what ("Morso · danni"), so the
    // chat card and the dice list read "Lupo · Morso · danni" without repeating the name.
    actorName: pick(parts.who, lang),
    actionName: parts.what,
    label: parts.what.it || parts.what.en ? { ...parts.what } : { ...record.label },
    formula: record.formula,
    controller: record.by,
    owner: record.by,
    visibility: record.visibility,
    mode: record.mode,
    dice,
    values: [...values],
    natural: d20 ? record.natural : null,
    modifier: record.plan
      ? record.plan.modifier
      : d20
        ? record.total - record.natural
        : record.total - values.reduce((a, b) => a + b, 0),
    total: record.total,
    rollMode: d20 ? (record.advantage ?? "normal") : "normal",
    ...(record.critical ? { critical: true } : {}),
    status: record.status === "reused" ? "reused" : "accepted",
  };
}
// Commits one compendium roll change: the slice mutation, then the log roll attached to the
// commit's own log entry (state.log rolls[], append-only evidence) and "roll-accepted"
// emitted by this area, as the registry contract asks of areas that keep their own rolls.
function commitRoll(ctx, label, mutate, { visibility, roll = null }) {
  let logId = null;
  ctx.commit(label, (draft) => mutate(rollSlice(draft)), {
    undoable: false,
    ...(visibility === "private" ? { visibility: "private" } : {}),
    afterCommit: (state) => {
      const entry = state.log?.at(-1);
      if (!entry || entry.label !== label) return;
      logId = entry.id;
      if (roll) entry.rolls = [structuredClone(roll)];
      const record = rollSlice(state).rolls.find((r) => r.id === (roll?.compendiumRollId ?? ""));
      if (record && !roll?.correctionReason) record.logId = entry.id;
    },
  });
  if (roll) registryRef?.emit?.("roll-accepted", { logId, roll: structuredClone(roll) });
  return logId;
}
// Retrying the same roll after a withdrawal reuses the withdrawn digital faces once (the
// dice area's rule, I-229): a withdrawal cannot be used to roll again for a better result.
const retryKeyOf = (by, request, plan, visibility) =>
  JSON.stringify([
    by,
    request.entry.id,
    request.action?.id ?? null,
    pick(request.label, "en"),
    plan,
    visibility,
  ]);
// Records one accepted roll: the log line with its log roll (shared, or private for a
// DM-only roll) and a record in the preserved roll slice. A roll is evidence: it is never
// undone; the roller corrects physical faces or withdraws it with a reason.
export function recordRoll(ctx, request, { mode, faces, visibility = "shared", options = {} }) {
  const plan = planFor(request, options);
  const shared = visibility === "private" && ctx.role === "dm" ? "private" : "shared";
  const key = retryKeyOf(ctx.role, request, plan, shared);
  const withdrawn =
    mode === "digital"
      ? (rollSlice(ctx.state).rolls ?? []).find(
          (r) =>
            r.status === "withdrawn" && r.mode === "digital" && r.retryKey === key && !r.reusedBy,
        )
      : null;
  const result = data.resolvePlan(plan, withdrawn ? [...rollValues(withdrawn)] : faces);
  const record = {
    id: uid(),
    at: new Date().toISOString(),
    by: ctx.role,
    visibility: shared,
    entryId: request.entry.id,
    actionId: request.action?.id ?? null,
    kind: plan.kind,
    rollKind: rollKindOf(request),
    label: { ...request.label },
    formula: data.formulaText(plan, ctx.lang),
    plan: structuredClone(plan),
    mode,
    values: result.faces,
    total: result.total,
    status: withdrawn ? "reused" : "accepted",
    retryKey: key,
    ...(withdrawn ? { reusedFrom: withdrawn.id } : {}),
    corrections: [],
    ...(plan.kind === "d20"
      ? { advantage: plan.mode, natural: result.natural }
      : { critical: plan.critical, byGroup: result.byGroup }),
  };
  const labelFor = (lang) =>
    `${pick(request.label, lang)}: ${data.formulaText(plan, lang)} → [${result.faces.join(", ")}] = ${result.total}${request.healing ? (lang === "it" ? " PF" : " HP") : ""} · ${mode === "physical" ? (lang === "it" ? "dado fisico" : "physical die") : lang === "it" ? "dado digitale" : "digital die"}${withdrawn ? (lang === "it" ? " · facce riusate dopo il ritiro" : " · faces reused after withdrawal") : ""}`;
  const label = labelFor(ctx.lang);
  commitRoll(
    ctx,
    label,
    (slice) => {
      if (withdrawn) {
        const old = slice.rolls.find((r) => r.id === withdrawn.id);
        if (old) old.reusedBy = record.id;
      }
      slice.rolls.push(record);
      if (slice.rolls.length > 60) slice.rolls.splice(0, slice.rolls.length - 60);
    },
    { visibility: shared, roll: logRollOf(record, ctx.lang) },
  );
  // "faces" keeps the shape callers read (encounter builder); the stored record has values.
  return { record: { ...record, faces: record.values }, label };
}
function ownRoll(ctx, id) {
  const record = (rollSlice(ctx.state).rolls ?? []).find((r) => r.id === id);
  if (!record) throw localized("Il tiro non esiste più.", "The roll no longer exists.");
  if (record.by !== ctx.role)
    throw localized(
      "Solo chi ha tirato può correggere o ritirare questo tiro.",
      "Only the roller can correct or withdraw this roll.",
    );
  if (record.status === "withdrawn")
    throw localized("Il tiro è già ritirato.", "The roll is already withdrawn.");
  return record;
}
function reasonOf(reason) {
  const text = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!text)
    throw localized(
      "Scrivi il motivo: resta nella cronologia del tiro.",
      "Write the reason: it stays in the roll history.",
    );
  return text;
}
// Reasoned correction of a physical roll typed wrong (combat and dice areas: the earlier
// faces stay in the record and the log; the corrected faces are a new log roll with the
// reason). Digital faces are never edited: withdraw instead.
export function correctRoll(ctx, id, faces, reason) {
  const record = ownRoll(ctx, id);
  if (record.mode !== "physical")
    throw localized(
      "Le facce digitali non si modificano: ritira il tiro con un motivo.",
      "Digital faces cannot be edited: withdraw the roll with a reason.",
    );
  if (!record.plan)
    throw localized(
      "Questo tiro è stato registrato senza il suo piano di dadi: puoi solo ritirarlo.",
      "This roll was recorded without its dice plan: you can only withdraw it.",
    );
  const next = record.plan.dice.map((_, i) => Number(faces?.[i]));
  if (next.some((face, i) => !data.validFace(face, record.plan.dice[i].sides)))
    throw localized(
      "Inserisci ogni faccia del dado fisico: un numero intero tra 1 e il numero di facce.",
      "Enter every physical die face: a whole number from 1 to the number of sides.",
    );
  const previous = rollValues(record);
  if (JSON.stringify(next) === JSON.stringify(previous))
    throw localized(
      "Le facce sono uguali a quelle registrate.",
      "These faces match the recorded ones.",
    );
  const why = reasonOf(reason);
  const result = data.resolvePlan(record.plan, next);
  const corrected = {
    ...record,
    values: result.faces,
    total: result.total,
    status: "corrected",
    corrections: [
      ...(record.corrections ?? []),
      {
        values: [...previous],
        total: record.total,
        reason: why,
        at: new Date().toISOString(),
        by: ctx.role,
      },
    ],
    ...(record.kind === "d20" ? { natural: result.natural } : { byGroup: result.byGroup }),
  };
  const roll = {
    ...logRollOf(corrected, ctx.lang),
    id: `${record.id}:c${corrected.corrections.length}`,
    status: "corrected",
    correctionReason: why,
    previousValues: [...previous],
    corrects: record.id,
  };
  const label = `${ctx.t("Correzione del tiro", "Roll correction")}: ${pick(record.label, ctx.lang)}: [${previous.join(", ")}] → [${result.faces.join(", ")}] = ${result.total} · ${ctx.t("Motivo", "Reason")}: ${why}`;
  commitRoll(
    ctx,
    label,
    (slice) => {
      const index = slice.rolls.findIndex((r) => r.id === id);
      if (index < 0) throw localized("Il tiro non esiste più.", "The roll no longer exists.");
      slice.rolls[index] = corrected;
    },
    { visibility: record.visibility, roll },
  );
  return corrected;
}
// Withdrawal with a reason: the faces stay on record, marked withdrawn; an identical new
// digital roll reuses them once.
export function withdrawRoll(ctx, id, reason) {
  const record = ownRoll(ctx, id);
  const why = reasonOf(reason);
  const label = `${ctx.t("Tiro ritirato", "Roll withdrawn")}: ${pick(record.label, ctx.lang)} = ${record.total} · ${ctx.t("Motivo", "Reason")}: ${why}`;
  commitRoll(
    ctx,
    label,
    (slice) => {
      const row = slice.rolls.find((r) => r.id === id);
      if (!row) throw localized("Il tiro non esiste più.", "The roll no longer exists.");
      row.status = "withdrawn";
      row.withdrawal = { reason: why, at: new Date().toISOString(), by: ctx.role };
    },
    { visibility: record.visibility },
  );
}
function openCorrectRoll(ctx, id) {
  const record = (rollSlice(ctx.state).rolls ?? []).find((r) => r.id === id);
  if (!record?.plan) return;
  const values = rollValues(record);
  ctx.dialog(
    ctx.t("Correggi le facce del dado fisico", "Correct the physical die faces"),
    `<p>${esc(ctx, pick(record.label, ctx.lang))} · ${esc(ctx, record.formula)} → [${esc(ctx, values.join(", "))}] = ${record.total}</p><div class="compendium-faces">${record.plan.dice.map((die, i) => `<label class="field compendium-face">${ctx.t("Dado", "Die")} ${i + 1} · d${die.sides}<input type="number" name="face-${i}" min="1" max="${die.sides}" inputmode="numeric" value="${values[i] ?? ""}" required></label>`).join("")}</div><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required></textarea></label><p class="muted">${ctx.t("Le facce precedenti restano nella cronologia del tiro e nel registro.", "The earlier faces stay in the roll history and the log.")}</p>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (form) => {
        const corrected = correctRoll(
          ctx,
          id,
          record.plan.dice.map((_, i) => form.get(`face-${i}`)),
          form.get("reason"),
        );
        ctx.toast(
          ctx.t(
            `Tiro corretto: ${corrected.total}. Correzione registrata.`,
            `Roll corrected: ${corrected.total}. Correction recorded.`,
          ),
        );
      },
    },
  );
}
function openWithdrawRoll(ctx, id) {
  const record = (rollSlice(ctx.state).rolls ?? []).find((r) => r.id === id);
  if (!record) return;
  ctx.dialog(
    ctx.t("Ritira il tiro", "Withdraw the roll"),
    `<p>${esc(ctx, pick(record.label, ctx.lang))} · ${esc(ctx, record.formula)} → [${esc(ctx, rollValues(record).join(", "))}] = ${record.total}</p><p class="muted">${ctx.t("Le facce restano nella cronologia come ritirate. Un nuovo tiro identico riusa una volta le stesse facce digitali.", "The faces stay in the history as withdrawn. An identical new roll reuses the same digital faces once.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required></textarea></label>`,
    {
      submitLabel: ctx.t("Ritira", "Withdraw"),
      onSubmit: (form) => {
        withdrawRoll(ctx, id, form.get("reason"));
        ctx.toast(ctx.t("Tiro ritirato. Motivo registrato.", "Roll withdrawn. Reason recorded."));
      },
    },
  );
}
function facesInputs(ctx, plan) {
  return plan.dice
    .map(
      (die, i) =>
        `<label class="field compendium-face">${ctx.t("Dado", "Die")} ${i + 1} · d${die.sides}<input type="number" name="face-${i}" min="1" max="${die.sides}" inputmode="numeric" required></label>`,
    )
    .join("");
}
export function openRollDialog(ctx, spec) {
  let request;
  try {
    request = rollRequest(spec, ctx.lang);
  } catch {
    ctx.toast(ctx.t("Questo tiro non è disponibile.", "This roll is unavailable."), true);
    return;
  }
  const state = { mode: "normal", critical: false, dieMode: uiState(ctx).dieMode ?? "digital" };
  const plan = () => planFor(request, state);
  const body = `<p class="muted">${esc(ctx, pick(request.label, ctx.lang))}</p><p><strong>${ctx.t("Formula", "Formula")}:</strong> <span data-roll-formula>${esc(ctx, data.formulaText(plan(), ctx.lang))}</span></p>${request.kind === "d20" ? `<fieldset class="compendium-choice"><legend>${ctx.t("Tiro con d20", "D20 roll")}</legend><label><input type="radio" name="advantage" value="normal" checked> ${ctx.t("Normale", "Normal")}</label><label><input type="radio" name="advantage" value="advantage"> ${ctx.t("Vantaggio", "Advantage")}</label><label><input type="radio" name="advantage" value="disadvantage"> ${ctx.t("Svantaggio", "Disadvantage")}</label></fieldset>` : request.canCritical ? `<label class="compendium-check"><input type="checkbox" name="critical"> ${ctx.t("Colpo critico: tira due volte i dadi dei danni", "Critical hit: roll the damage dice twice")}</label>` : ""}<fieldset class="compendium-choice"><legend>${ctx.t("Dadi", "Dice")}</legend><label><input type="radio" name="dieMode" value="digital" ${state.dieMode === "digital" ? "checked" : ""}> ${ctx.t("Dado digitale", "Digital die")}</label><label><input type="radio" name="dieMode" value="physical" ${state.dieMode === "physical" ? "checked" : ""}> ${ctx.t("Dado fisico: inserisco le facce", "Physical die: I enter the faces")}</label></fieldset><div class="compendium-faces" data-roll-faces ${state.dieMode === "physical" ? "" : "hidden"}>${state.dieMode === "physical" ? facesInputs(ctx, plan()) : ""}</div>${ctx.role === "dm" ? `<label class="field">${ctx.t("Chi vede il risultato", "Who sees the result")}<select name="visibility"><option value="shared">${ctx.t("Tutto il tavolo", "The whole table")}</option><option value="private">${ctx.t("Solo il DM", "DM only")}</option></select></label>` : ""}<p class="muted">${ctx.t("Il tiro va nel registro della sessione; non applica danni né consuma azioni.", "The roll goes to the session log; it does not apply damage or spend actions.")}</p>`;
  ctx.dialog(ctx.t("Tira i dadi", "Roll dice"), body, {
    submitLabel: ctx.t("Registra tiro", "Record roll"),
    onSubmit: (form) => {
      const p = plan();
      const physical = form.get("dieMode") === "physical";
      const faces = physical
        ? p.dice.map((_, i) => Number(form.get(`face-${i}`)))
        : p.dice.map((die) => rollDie(die.sides));
      if (physical && faces.some((face, i) => !data.validFace(face, p.dice[i].sides)))
        throw Object.assign(new Error("face"), {
          it: "Inserisci ogni faccia del dado fisico: un numero intero tra 1 e il numero di facce.",
          en: "Enter every physical die face: a whole number from 1 to the number of sides.",
        });
      uiState(ctx).dieMode = physical ? "physical" : "digital";
      saveUi(ctx);
      const { label } = recordRoll(ctx, request, {
        mode: physical ? "physical" : "digital",
        faces,
        visibility: form.get("visibility") === "private" ? "private" : "shared",
        options: state,
      });
      ctx.toast(label);
    },
  });
  const dialog = globalThis.document?.querySelector("#dialog");
  if (!dialog) return;
  const refresh = () => {
    dialog.querySelector("[data-roll-formula]").textContent = data.formulaText(plan(), ctx.lang);
    const box = dialog.querySelector("[data-roll-faces]");
    box.hidden = state.dieMode !== "physical";
    box.innerHTML = state.dieMode === "physical" ? facesInputs(ctx, plan()) : "";
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

// ---------------------------------------------------------------- nested tooltips

// A stack of tooltips: level 0 opens from page text, level n+1 from a term inside level
// n. Hover opens after a short delay and auto-locks after 1.2 s (CK3/Rogue Trader lock
// timer, CRP-172); click, Enter, Space, touch or a middle click open it locked. Escape
// closes the topmost; an outside click or tap closes all (DDB touch behaviour, DDB-166).
const tips = { host: null, stack: [], openTimer: null, lockTimer: null, closeTimer: null };
const HOVER_OPEN = 250;
const AUTO_LOCK = 1200;
function closeTips(fromLevel = 0, { focusTerm = false } = {}) {
  const removed = tips.stack.splice(fromLevel);
  for (const tip of removed) {
    tip.el.remove();
    tip.term?.setAttribute?.("aria-expanded", "false");
  }
  if (focusTerm && removed[0]?.term?.isConnected) removed[0].term.focus();
}
function levelOf(term) {
  const tip = term.closest?.(".compendium-tip");
  return tip ? Number(tip.dataset.level) + 1 : 0;
}
function tipLang(term) {
  const holder = term.closest?.("[data-content-lang]");
  return holder ? (holder.dataset.contentLang === "en" ? "en" : "it") : null;
}
function tipHTML(ctx, entry, level, lang, locked, exclude) {
  const l = (v) => pick(v, lang);
  const isCondition = entry.kind === "condition";
  return `<div class="compendium-tip-head"><p class="compendium-tip-kind">${esc(ctx, pick(data.kindLabel(entry), ctx.lang))} · ${data.EDITION}</p><h4 id="compendium-tip-title-${level}">${esc(ctx, l(entry.name))}</h4></div><p class="compendium-tip-text" data-content-lang="${lang}">${linked(ctx, l(entry.summary), lang, exclude)}</p><p class="compendium-tip-source">SRD ${data.REVISION} · ${esc(ctx, pagesText(ctx, entry))}</p><div class="compendium-tip-actions"><button type="button" class="button quiet" data-tip-lock aria-pressed="${locked}">${locked ? ctx.t("Bloccato", "Locked") : ctx.t("Blocca", "Lock")}</button><button type="button" class="button quiet" data-tip-follow>${ctx.t("Apri voce", "Open entry")}</button>${isCondition ? `<button type="button" class="button" data-tip-apply>${ctx.t("Applica…", "Apply…")}</button>` : ""}<button type="button" class="icon-button" data-tip-close aria-label="${attr(ctx, ctx.t("Chiudi", "Close"))}">${ctx.icon("close")}</button></div><span class="compendium-tip-timer" aria-hidden="true"></span>`;
}
function placeTip(el, term, level) {
  const view = { w: globalThis.innerWidth || 1024, h: globalThis.innerHeight || 768 };
  const rect = term.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  const width = Math.min(box.width || 340, view.w - 16);
  let left, top;
  const parent = level > 0 ? tips.stack[level - 1]?.el.getBoundingClientRect() : null;
  if (parent && parent.right + 8 + width <= view.w) {
    left = parent.right + 8;
    top = Math.max(8, rect.top - 24);
  } else {
    left = Math.min(Math.max(8, rect.left), view.w - width - 8);
    top = rect.bottom + 6;
    if (top + box.height > view.h - 8 && rect.top - box.height - 6 > 8)
      top = rect.top - box.height - 6;
  }
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(Math.max(8, Math.min(top, view.h - Math.min(box.height, view.h - 16) - 8)))}px`;
}
function setLocked(ctx, tip, locked) {
  tip.locked = locked;
  tip.el.classList.toggle("locked", locked);
  tip.el.classList.remove("locking");
  const button = tip.el.querySelector("[data-tip-lock]");
  if (button) {
    button.setAttribute("aria-pressed", String(locked));
    button.textContent = locked ? ctx.t("Bloccato", "Locked") : ctx.t("Blocca", "Lock");
  }
}
export function openTip(ctx, term, { locked = false, focus = false, apply = null } = {}) {
  const id = term.dataset.compendiumTerm;
  const entry = data.getEntry(id);
  if (!entry || !tips.host?.isConnected) return null;
  const level = levelOf(term);
  const current = tips.stack[level];
  if (current && current.id === id && current.term === term) {
    if (locked && !current.locked) setLocked(ctx, current, true);
    if (focus) current.el.querySelector("[data-tip-lock]")?.focus();
    return current;
  }
  closeTips(level);
  const lang = tipLang(term) ?? contentLang(ctx);
  const exclude = [id, ...tips.stack.map((tip) => tip.id)];
  const el = document.createElement("div");
  el.className = "compendium-tip" + (locked ? " locked" : "");
  el.dataset.level = String(level);
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.setAttribute("aria-labelledby", `compendium-tip-title-${level}`);
  el.innerHTML = tipHTML(ctx, entry, level, lang, locked, exclude);
  tips.host.append(el);
  const tip = { id, term, el, level, locked, apply };
  tips.stack.push(tip);
  term.setAttribute("aria-expanded", "true");
  placeTip(el, term, level);
  bindTerms(el, ctx);
  el.addEventListener("pointerenter", (event) => {
    clearTimeout(tips.closeTimer);
    if (event.pointerType === "mouse" && !tip.locked) {
      el.classList.add("locking");
      clearTimeout(tips.lockTimer);
      tips.lockTimer = setTimeout(
        () => tips.stack.includes(tip) && setLocked(ctx, tip, true),
        AUTO_LOCK,
      );
    }
  });
  el.addEventListener("pointerleave", (event) => {
    el.classList.remove("locking");
    clearTimeout(tips.lockTimer);
    if (event.pointerType === "mouse") scheduleClose();
  });
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeTips(tip.level, { focusTerm: true });
    }
  });
  el.querySelector("[data-tip-lock]").onclick = () => setLocked(ctx, tip, !tip.locked);
  el.querySelector("[data-tip-close]").onclick = () => closeTips(tip.level, { focusTerm: true });
  el.querySelector("[data-tip-follow]").onclick = () => {
    closeTips(0);
    go(ctx, entry.id, { keepReturn: true });
  };
  el.querySelector("[data-tip-apply]")?.addEventListener("click", () => {
    closeTips(0);
    openApplyCondition(ctx, entry, tips.applyActorId?.() ?? null);
  });
  if (focus) el.querySelector("[data-tip-lock]").focus();
  return tip;
}
// Closes, from the deepest, every unlocked tooltip that neither it nor its term is under
// the pointer; a locked or hovered tooltip keeps its ancestors open.
function scheduleClose() {
  clearTimeout(tips.closeTimer);
  tips.closeTimer = setTimeout(() => {
    for (let i = tips.stack.length - 1; i >= 0; i--) {
      const t = tips.stack[i];
      if (t.locked || t.el.matches(":hover") || t.term.matches?.(":hover")) break;
      closeTips(i);
    }
  }, 300);
}
export function bindTerms(container, ctx) {
  container.querySelectorAll("[data-compendium-term]").forEach((term) => {
    if (term.dataset.compendiumTermBound) return;
    term.dataset.compendiumTermBound = "1";
    term.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(tips.openTimer);
      clearTimeout(tips.closeTimer);
      tips.openTimer = setTimeout(() => openTip(ctx, term), HOVER_OPEN);
    });
    term.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(tips.openTimer);
      const tip = tips.stack.find((t) => t.term === term);
      if (tip && !tip.locked) scheduleClose();
    });
    term.addEventListener("click", (event) => {
      event.preventDefault();
      clearTimeout(tips.openTimer);
      const open = tips.stack.find((t) => t.term === term);
      if (open?.locked) return closeTips(open.level, { focusTerm: true });
      // Keyboard activation (detail 0) moves focus into the tooltip.
      openTip(ctx, term, { locked: true, focus: event.detail === 0 });
    });
    term.addEventListener("auxclick", (event) => {
      if (event.button !== 1) return;
      event.preventDefault();
      openTip(ctx, term, { locked: true });
    });
    term.addEventListener("mousedown", (event) => {
      if (event.button === 1) event.preventDefault(); // no autoscroll on middle click
    });
    term.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && tips.stack.length) {
        event.preventDefault();
        closeTips(0);
      }
    });
  });
}
let globalListeners = false;
function swallowNextClick() {
  let timer = null;
  const done = () => {
    clearTimeout(timer);
    document.removeEventListener("click", stop, true);
  };
  const stop = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    done();
  };
  document.addEventListener("click", stop, true);
  // A tap that never turns into a click (a scroll) must not eat a later one.
  timer = setTimeout(done, 700);
}
function installGlobalListeners() {
  if (globalListeners || !globalThis.document) return;
  globalListeners = true;
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!tips.stack.length) return;
      if (event.target.closest?.(".compendium-tip, [data-compendium-term]")) return;
      closeTips(0);
      // DDB-166: on touch, a tap outside only dismisses the tooltips; the click that
      // follows the same tap does not also press the control under the finger.
      if (event.pointerType && event.pointerType !== "mouse") swallowNextClick();
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !tips.stack.length || document.querySelector("#dialog")?.open)
      return;
    closeTips(tips.stack.length - 1, { focusTerm: true });
  });
}
// Tooltips live under the latest bound root; a re-render drops the old ones.
function hostTips(el, ctx, { applyActorId = null } = {}) {
  tips.stack = tips.stack.filter((tip) => tip.el.isConnected);
  tips.host = el;
  tips.applyActorId = applyActorId;
  installGlobalListeners();
  bindTerms(el, ctx);
}

// ---------------------------------------------------------------- commands

function actorName(ctx, actor) {
  return pick(actor?.name, ctx.lang);
}
function sheetOptions(actor) {
  return actor.visibility === "private" ? privateLocal : {};
}
// dnd5e "Apply" on condition references (FVT-176): opens the existing Conditions panel for
// the chosen creature with the condition preselected; origin and end are set there.
export function openApplyCondition(ctx, entry, actorId = null) {
  const slug = entry.slug;
  const start = (id) => {
    ctx.openConditions(id, "add");
    const choice = globalThis.document?.querySelector(
      `#dialog [data-conditions-definition="${slug}"]`,
    );
    choice?.click();
  };
  const controlled = Object.values(ctx.state.actors).filter(
    (actor) => ctx.canControl(actor) && !actor.companion?.lifecycle?.startsWith?.("dismiss"),
  );
  if (actorId && ctx.canControl(ctx.state.actors[actorId])) return start(actorId);
  if (!controlled.length) {
    ctx.toast(
      ctx.t("Nessuna creatura sotto il tuo controllo.", "No creature under your control."),
      true,
    );
    return;
  }
  ctx.dialog(
    ctx.t(`Applica: ${entry.name.it}`, `Apply: ${entry.name.en}`),
    `<label class="field">${ctx.t("Creatura", "Creature")}<select name="actor" required>${controlled.map((actor) => `<option value="${attr(ctx, actor.id)}">${esc(ctx, actorName(ctx, actor))}</option>`).join("")}</select></label><p class="muted">${ctx.t("Si apre il pannello Condizioni con la condizione già scelta: indichi origine e termine e confermi lì.", "The Conditions panel opens with the condition already chosen: set its origin and end and confirm there.")}</p>`,
    {
      submitLabel: ctx.t("Continua", "Continue"),
      onSubmit: (form) => start(String(form.get("actor"))),
    },
  );
}
function spellGrantDefault(ctx, actor, entry) {
  const classId = actor.buildSeed?.classes?.find((c) => entry.classes.includes(c.classId))?.classId;
  return classId
    ? `${ctx.t("Classe", "Class")}: ${pick(srd.LABELS.spellClass[classId], ctx.lang)}`
    : "";
}
// Adds a spell or an item to a controlled sheet through the sheet's own row shapes and
// inventory function (a copy with its SRD source: later catalogue changes never alter it).
export function addToSheet(ctx, entry, actorId, { quantity = 1, grantName = "" } = {}) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor))
    throw Object.assign(new Error("actor"), {
      it: "Scheda non disponibile.",
      en: "Sheet unavailable.",
    });
  if (entry.kind === "spell") {
    if (!grantName.trim())
      throw Object.assign(new Error("grant"), {
        it: "Indica chi concede la magia (classe, talento, oggetto).",
        en: "Say what grants the spell (class, feat, item).",
      });
    if ((actor.spells ?? []).some((row) => row.compendiumRef?.id === entry.id))
      throw Object.assign(new Error("dup"), {
        it: `${entry.name.it} è già nelle magie di ${actorName(ctx, actor)}.`,
        en: `${entry.name.en} is already among ${actorName(ctx, actor)}’s spells.`,
      });
    ctx.commit(
      ctx.t(
        `Magia annotata dal Compendio: ${entry.name.it} · ${actorName(ctx, actor)}`,
        `Spell recorded from the Compendium: ${entry.name.en} · ${actorName(ctx, actor)}`,
      ),
      (draft) => {
        const target = draft.actors[actorId];
        target.spells ??= [];
        target.spells.push(data.sheetSpellRow(entry, { id: uid(), grantName: grantName.trim() }));
      },
      sheetOptions(actor),
    );
    return { tab: "spells" };
  }
  if (entry.kind === "item") {
    ctx.commit(
      ctx.t(
        `Oggetto aggiunto dal Compendio: ${entry.name.it} ×${quantity} · ${actorName(ctx, actor)}`,
        `Item added from the Compendium: ${entry.name.en} ×${quantity} · ${actorName(ctx, actor)}`,
      ),
      (draft) => {
        const target = draft.actors[actorId];
        target.inventory ??= [];
        const existing = target.inventory.find((row) => row.compendiumRef?.id === entry.id);
        const row = existing
          ? { ...existing, quantity: existing.quantity + quantity }
          : data.sheetItemRow(entry, { id: uid(), quantity });
        // The sheet's own inventory function validates name, quantity and weight.
        saveInventoryItem(target, { ...row, name: pick(row.name, ctx.lang) });
        Object.assign(
          target.inventory.find((item) => item.id === row.id),
          { name: row.name },
        );
      },
      sheetOptions(actor),
    );
    return { tab: "inventory" };
  }
  throw new Error("Only spells and items can be added to a sheet");
}
// Final review X-07 (Foundry and Fantasy Grounds: universal drag and drop from the compendium,
// the «Aggiungi…» buttons stay the keyboard way). A creature carries the bestiary type the
// Table map accepts (token-menu CREATURE_DRAG); every entry its id for a sheet and its name
// for a text field.
export const ENTRY_DRAG = "application/x-d20-entry";
export function dragPayload(entry) {
  return {
    [ENTRY_DRAG]: entry.id,
    ...(entry.kind === "creature" ? { "application/x-d20-creature": entry.id } : {}),
    "text/plain": pick(entry.name, "it"),
  };
}
/** A compendium entry dropped on `actorId`'s sheet: the add dialog for that sheet. */
export function dropOnSheet(ctx, entryId, actorId) {
  const entry = data.getEntry(entryId);
  const actor = ctx.state.actors?.[actorId];
  if (!entry || !["item", "spell"].includes(entry.kind) || !actor || !ctx.canControl(actor))
    return false;
  openAddToSheet(ctx, entry, actorId);
  return true;
}
function openAddToSheet(ctx, entry, preferredId = null) {
  const target = sheetTarget(ctx);
  const actors = Object.values(ctx.state.actors).filter(
    (actor) =>
      ctx.canControl(actor) &&
      (entry.kind === "item" || actor.kind === "character") &&
      !actor.companion,
  );
  if (!actors.length)
    return ctx.toast(
      ctx.t("Nessuna scheda sotto il tuo controllo.", "No sheet under your control."),
      true,
    );
  const preferred = preferredId ? ctx.state.actors[preferredId] : null;
  const selected =
    preferred && actors.includes(preferred)
      ? preferred
      : target?.actor && actors.includes(target.actor)
        ? target.actor
        : actors[0];
  ctx.dialog(
    entry.kind === "spell"
      ? ctx.t("Aggiungi alle magie", "Add to spells")
      : ctx.t("Aggiungi all’inventario", "Add to inventory"),
    `<label class="field">${ctx.t("Scheda", "Sheet")}<select name="actor">${actors.map((actor) => `<option value="${attr(ctx, actor.id)}" ${actor === selected ? "selected" : ""}>${esc(ctx, actorName(ctx, actor))}</option>`).join("")}</select></label>${entry.kind === "spell" ? `<label class="field">${ctx.t("Concessa da", "Granted by")}<input name="grant" maxlength="100" required value="${attr(ctx, spellGrantDefault(ctx, selected, entry))}"></label><p class="muted">${ctx.t("Registra la magia come annotata e non preparata, con la fonte SRD. Non la concede, non la prepara e non spende slot.", "Records the spell as noted and not prepared, with its SRD source. It does not grant, prepare or spend slots.")}</p>` : `<label class="field">${ctx.t("Quantità", "Quantity")}<input type="number" name="quantity" min="1" max="999" value="1" required></label><p class="muted">${ctx.t("Aggiunge l’oggetto riposto nello zaino, con peso e fonte SRD. Non lo equipaggia e non scala monete.", "Adds the item stowed in the pack, with weight and SRD source. It does not equip it or spend coins.")}</p>`}`,
    {
      submitLabel: ctx.t("Aggiungi alla scheda", "Add to sheet"),
      onSubmit: (form) => {
        const actorId = String(form.get("actor"));
        const result = addToSheet(ctx, entry, actorId, {
          quantity: Number(form.get("quantity") || 1),
          grantName: String(form.get("grant") ?? ""),
        });
        const actor = ctx.state.actors[actorId];
        if (target?.actor?.id === actorId) {
          status = null;
          ctx.navigate("characters", { id: actorId, tab: result.tab });
          ctx.toast(
            ctx.t(
              `Aggiunto a ${actorName(ctx, actor)}: ${entry.name.it}.`,
              `Added to ${actorName(ctx, actor)}: ${entry.name.en}.`,
            ),
          );
          return;
        }
        status = {
          text: L(
            `Aggiunto a ${pick(actor.name, "it")}: ${entry.name.it}.`,
            `Added to ${pick(actor.name, "en")}: ${entry.name.en}.`,
          ),
          sheet: { id: actorId, tab: result.tab },
        };
        ctx.render();
      },
    },
  );
}
function freePoint(scene) {
  const size = Number(scene.gridSize) || 50;
  const start = { x: scene.width * 0.62, y: scene.height * 0.45 };
  for (let ring = 0; ring < 12; ring++)
    for (let dx = -ring; dx <= ring; dx++)
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const point = { x: start.x + dx * size, y: start.y + dy * size };
        if (
          point.x < 30 ||
          point.y < 30 ||
          point.x > scene.width - 30 ||
          point.y > scene.height - 30
        )
          continue;
        if (
          scene.tokens.every(
            (token) => Math.hypot(token.x - point.x, token.y - point.y) >= size * 1.4,
          )
        )
          return point;
      }
  return start;
}
const tokenMenuSlice = (state) =>
  state?.ext?.[TOKEN_MENU] && typeof state.ext[TOKEN_MENU] === "object"
    ? state.ext[TOKEN_MENU]
    : null;
// Campaign default "creature names: DM only" (B20): new DM creatures get a hidden name.
const namesHiddenByDefault = (state) =>
  state?.ext?.["campaign-settings"]?.campaigns?.[state.campaign?.id]?.policy?.creatureName === "dm";
// Preparation's NPC flow (createSceneNPC + placeSceneToken) with the stat block values. The
// token lands where the DM clicked (point) or on a free spot; it can arrive hidden from the
// players (token.hidden, as the encounter builder's staged groups and the token menu's
// Hide) and with its name hidden (the token menu's alias). The log line is DM-only: it
// names the SRD creature and the scene, which players must not read.
export function addCreatureToScene(
  ctx,
  entry,
  { sceneId, name, team, hidden = false, hideName = false, point = null },
) {
  if (ctx.role !== "dm")
    throw Object.assign(new Error("dm"), {
      it: "Solo il DM aggiunge creature alle scene.",
      en: "Only the DM adds creatures to scenes.",
    });
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene)
    throw Object.assign(new Error("scene"), {
      it: "Scena non disponibile.",
      en: "Scene unavailable.",
    });
  if (hideName && !tokenMenuSlice(ctx.state))
    throw localized(
      "Il menu della pedina non è disponibile: il nome non si può nascondere ora.",
      "The token menu is unavailable: the name cannot be hidden now.",
    );
  const id = `npc-${uid()}`;
  const tokenId = `token-${id}`;
  ctx.commit(
    ctx.t(
      `Compendio: ${name} (${entry.name.it}) sulla scena «${scene.name}»${hidden ? " · nascosta ai giocatori" : ""}`,
      `Compendium: ${name} (${entry.name.en}) on the scene “${scene.name}”${hidden ? " · hidden from players" : ""}`,
    ),
    (draft) => {
      // BI-45: a compatibility pack's creature brings its own numbers and first attack.
      const built = entry.pack
        ? packCreatureNpc(entry, { id, name, team })
        : {
            ...data.npcFromCreature(entry, { id, name, team }),
            melee: data.srdMeleeProfile(entry),
          };
      const { input, patch } = built;
      const actor = createSceneNPC(draft, input, ctx.role);
      Object.assign(actor, patch);
      const melee = built.melee;
      if (melee) actor.combatProfile = { ...actor.combatProfile, meleeAttack: melee };
      const target = draft.scenes.find((s) => s.id === sceneId);
      placeSceneToken(draft, sceneId, id, point ?? freePoint(target), tokenId, ctx.role);
      if (hidden) target.tokens.find((t) => t.id === tokenId).hidden = true;
      if (hideName) setNameHidden(draft, tokenMenuSlice(draft), id, true, ctx.role, ctx.lang);
    },
    { visibility: "private" },
  );
  return { actorId: id, tokenId, scene };
}
// The scene dialog: scene, token name, disposition, arrival (hidden or visible), hidden
// name and position (the point the DM clicks at the Table, or a free spot).
function openAddToScene(ctx, entry, { table = null } = {}) {
  const scenes = ctx.state.scenes;
  const active = ctx.state.activeSceneId;
  const taken = Object.values(ctx.state.actors).filter(
    (a) => a.compendiumRef?.id === entry.id,
  ).length;
  const suggested = `${entry.name[ctx.lang] || entry.name.it}${taken ? ` ${taken + 1}` : ""}`;
  const selected = table ? table.scene?.id : active;
  const revealed = (id) => scenes.find((s) => s.id === id)?.revealed === true;
  const policyHides = namesHiddenByDefault(ctx.state);
  const canHideName = Boolean(tokenMenuSlice(ctx.state));
  const body = `${table ? `<input type="hidden" name="scene" value="${attr(ctx, selected)}"><p class="muted">${ctx.t("Scena attiva", "Active scene")}: <strong>${esc(ctx, table.scene?.name ?? "")}</strong></p>` : `<label class="field">${ctx.t("Scena", "Scene")}<select name="scene">${scenes.map((s) => `<option value="${attr(ctx, s.id)}" ${s.id === selected ? "selected" : ""}>${esc(ctx, s.name)}${s.id === active ? ctx.t(" · attiva al Tavolo", " · active at the Table") : ""}${s.revealed ? "" : ctx.t(" · non rivelata", " · not revealed")}</option>`).join("")}</select></label>`}<label class="field">${ctx.t("Nome della pedina", "Token name")}<input name="name" maxlength="100" required value="${attr(ctx, suggested)}"></label><label class="field">${ctx.t("Disposizione verso il gruppo", "Disposition toward the party")}<select name="team"><option value="neutral">${ctx.t("Neutrale", "Neutral")}</option><option value="watch">${ctx.t("Ostile al gruppo", "Hostile to the party")}</option><option value="party">${ctx.t("Alleato al gruppo", "Allied to the party")}</option></select></label><fieldset class="compendium-choice"><legend>${ctx.t("Chi la vede", "Who sees it")}</legend><label class="compendium-check"><input type="checkbox" name="hidden" data-scene-hidden ${revealed(selected) ? "" : "checked"}> ${ctx.t("Arriva nascosta ai giocatori (la riveli dal menu della pedina)", "Arrives hidden from players (reveal it from the token menu)")}</label>${policyHides ? `<p class="muted" data-scene-name-policy>${ctx.t("Il nome sarà nascosto ai giocatori: è il predefinito della campagna.", "The name will be hidden from players: it is the campaign default.")}</p>` : canHideName ? `<label class="compendium-check"><input type="checkbox" name="hideName"> ${ctx.t("Nascondi il nome ai giocatori (vedono «Creatura sconosciuta»)", "Hide the name from players (they see “Unknown creature”)")}</label>` : ""}</fieldset><fieldset class="compendium-choice" data-scene-where><legend>${ctx.t("Posizione", "Position")}</legend><label data-scene-where-map ${selected === active ? "" : "hidden"}><input type="radio" name="where" value="map" ${selected === active ? "checked" : ""}> ${ctx.t("Scelgo il punto sulla mappa del Tavolo", "I pick the spot on the Table map")}</label><label><input type="radio" name="where" value="free" ${selected === active ? "" : "checked"}> ${ctx.t("Un punto libero vicino al centro della scena", "A free spot near the scene’s centre")}</label></fieldset><p class="muted">${ctx.t("Crea un PNG con CA, PF medi, Velocità e caratteristiche del blocco SRD e, se strutturato, il primo attacco in mischia. Non entra in iniziativa; tratti ed effetti aggiuntivi restano nel blocco da gestire. Il registro dei giocatori non lo mostra.", "Creates an NPC with the SRD block’s AC, average HP, Speed and ability scores and, when structured, its first melee attack. It does not join initiative; traits and riders stay in the block to handle. The players’ log does not show it.")}</p>`;
  ctx.dialog(ctx.t("Aggiungi alla scena", "Add to scene"), body, {
    submitLabel: ctx.t("Continua", "Continue"),
    onSubmit: (form) => {
      const name = String(form.get("name")).trim();
      if (!name)
        throw Object.assign(new Error("name"), {
          it: "Dai un nome alla pedina.",
          en: "Name the token.",
        });
      const sceneId = String(form.get("scene"));
      const options = {
        name,
        team: String(form.get("team")),
        hidden: form.get("hidden") === "on",
        hideName: policyHides || form.get("hideName") === "on",
      };
      if (form.get("where") === "map" && sceneId === ctx.state.activeSceneId) {
        startPlacement(ctx, entry, options, table);
        return;
      }
      const { actorId, scene } = addCreatureToScene(ctx, entry, { sceneId, ...options });
      status = sceneStatus(ctx, name, scene, actorId, options);
      if (table) {
        ctx.toast(pick(status.text, ctx.lang));
        status = null;
      }
      ctx.render();
    },
  });
  // The map option exists only for the scene at the Table; hidden arrival follows the
  // scene's sharing until the DM changes it.
  const dialog = globalThis.document?.querySelector("#dialog");
  const select = dialog?.querySelector("select[name=scene]");
  if (!select) return;
  const hiddenBox = dialog.querySelector("[data-scene-hidden]");
  let touched = false;
  hiddenBox?.addEventListener("change", () => (touched = true));
  select.addEventListener("change", () => {
    const isActive = select.value === active;
    const mapOption = dialog.querySelector("[data-scene-where-map]");
    mapOption.hidden = !isActive;
    dialog.querySelector(`[name=where][value=${isActive ? "map" : "free"}]`).checked = true;
    if (!touched && hiddenBox) hiddenBox.checked = !revealed(select.value);
  });
}
function sceneStatus(ctx, name, scene, actorId, { hidden, hideName }) {
  const note = hidden
    ? L(
        " Arriva nascosta: la riveli dal menu della pedina (Maiusc+H).",
        " It arrives hidden: reveal it from the token menu (Shift+H).",
      )
    : L("", "");
  const alias = hideName
    ? L(" I giocatori non ne leggono il nome.", " Players do not read its name.")
    : L("", "");
  return {
    text: L(
      `${name} è sulla scena «${scene.name}».${note.it}${alias.it}`,
      `${name} is on the scene “${scene.name}”.${note.en}${alias.en}`,
    ),
    scene: { id: scene.id, active: scene.id === ctx.state.activeSceneId, actorId },
    undo: true,
  };
}
// Drop at the pointer (FVT, R20 drag from the compendium onto the canvas; Owlbear's panel):
// the creature waits in "placement" and the Table's "Posiziona creatura" tool puts it where
// the DM clicks (Enter on the map: the centre, as the handouts pin and multi-sided tokens).
function startPlacement(ctx, entry, options, table = null) {
  placement = { entryId: entry.id, ...options, activate: true };
  status = null;
  if (table?.setMode) {
    placement.activate = false;
    table.setMode(PLACE_TOOL);
  } else ctx.navigate("table");
}
function placeAt(ctx, table, point) {
  const pending = placement;
  const entry = pending && data.getEntry(pending.entryId);
  if (!entry || !table?.scene) return false;
  const result = attempt(ctx, () =>
    addCreatureToScene(ctx, entry, { ...pending, sceneId: table.scene.id, point }),
  );
  if (!result) return false;
  placement = null;
  ctx.toast(
    pick(sceneStatus(ctx, pending.name, result.scene, result.actorId, pending).text, ctx.lang),
  );
  table.setMode("move");
  table.select?.(result.actorId);
  return true;
}
function placementLine(ctx) {
  const entry = placement && data.getEntry(placement.entryId);
  if (!entry) return "";
  const team = {
    neutral: ctx.t("neutrale", "neutral"),
    watch: ctx.t("ostile", "hostile"),
    party: ctx.t("alleata", "allied"),
  }[placement.team];
  return `${esc(ctx, placement.name)} (${esc(ctx, pick(entry.name, ctx.lang))} · ${esc(ctx, team ?? "")}${placement.hidden ? ` · ${ctx.t("nascosta", "hidden")}` : ""})`;
}
const placeTool = {
  id: PLACE_TOOL,
  label: L("Posiziona creatura", "Place creature"),
  icon: "plus",
  group: "dm",
  roles: ["dm"],
  order: 57,
  when: () => Boolean(placement),
  activate(ctx, table) {
    table.message(
      ctx.t(
        `Clicca sulla mappa dove mettere ${placement ? placement.name : "la creatura"}, oppure Invio sulla mappa per il centro della scena.`,
        `Click the map where ${placement ? placement.name : "the creature"} goes, or press Enter on the map for the centre of the scene.`,
      ),
    );
  },
  onClick(ctx, event, table) {
    placeAt(ctx, table, table.point(event));
  },
  onKeyDown(ctx, event, table) {
    if (event.key !== "Enter" || event.target?.closest?.("[data-actor]")) return;
    event.preventDefault?.();
    const scene = table.scene;
    placeAt(ctx, table, { x: (scene?.width ?? 1000) / 2, y: (scene?.height ?? 650) / 2 });
  },
};
const placePanel = {
  id: PLACE_TOOL,
  label: L("Creatura da posizionare", "Creature to place"),
  roles: ["dm"],
  order: 5,
  when: () => Boolean(placement),
  render: (ctx, tableView) =>
    `<div class="compendium-place" data-compendium-place><p><strong>${placementLine(ctx)}</strong></p><p class="muted">${tableView?.mode === PLACE_TOOL ? ctx.t("Clicca sulla mappa nel punto scelto; Invio sulla mappa la mette al centro.", "Click the chosen spot on the map; Enter on the map puts it at the centre.") : ctx.t("Scegli lo strumento «Posiziona creatura» e clicca sulla mappa.", "Choose the “Place creature” tool and click the map.")}</p><div class="toolbar">${tableView?.mode === PLACE_TOOL ? "" : `<button type="button" class="button primary" data-place-pick>${ctx.t("Scegli il punto", "Pick the spot")}</button>`}<button type="button" class="button" data-place-free>${ctx.t("Metti in un punto libero", "Put it on a free spot")}</button><button type="button" class="button quiet" data-place-cancel>${ctx.t("Annulla", "Cancel")}</button></div></div>`,
  bind: (el, ctx, table) => {
    el.querySelector("[data-place-pick]")?.addEventListener("click", () =>
      table.setMode(PLACE_TOOL),
    );
    el.querySelector("[data-place-free]")?.addEventListener("click", () => {
      const scene = table.scene;
      if (scene) placeAt(ctx, table, freePoint(scene));
    });
    el.querySelector("[data-place-cancel]")?.addEventListener("click", () => {
      placement = null;
      table.setMode("move");
    });
    // Arriving from the Library: the tool is chosen once, so the DM only has to click.
    if (placement?.activate && table.mode !== PLACE_TOOL) {
      placement.activate = false;
      queueMicrotask(() => table.setMode(PLACE_TOOL));
    }
  },
};
// Library copy (FVT-204 independent copy, DDB homebrew from an official entry): a private
// Library draft prefilled from the entry, edited and saved in the Library's own editor;
// from there the Library's "Review adding to sheet" applies it. The SRD source stays
// named in the copy; later catalogue revisions never change it.
export function libraryCopyType(entry) {
  if (entry?.kind === "spell") return "spell";
  if (entry?.kind === "creature") return "creature";
  if (entry?.kind === "condition") return "condition";
  if (entry?.kind !== "item") return null;
  if (entry.magic?.consumable) return "consumable";
  return entry.category === "weapon" ? "weapon" : entry.category === "armor" ? "armor" : "item";
}
export function startLibraryCopy(ctx, entry) {
  const type = libraryCopyType(entry);
  if (!type) throw new Error("This entry cannot be copied to the Library");
  const id = uid();
  const pages = `EN p. ${entry.source.en.pages.join(", ")} / IT p. ${entry.source.it.pages.join(", ") || "—"}`;
  ctx.commit(
    ctx.t("Bozza privata della Biblioteca iniziata", "Private library draft started"),
    (draft) => {
      const created = hb.createHomebrewDraft(draft, { id, kind: "create", type }, ctx.role);
      const cost = entry.cost ? srd.costInCp(entry.cost) / 100 : null;
      hb.saveHomebrewDraft(
        draft,
        id,
        {
          // BI-26: the copy also carries the entry's structure and remembers its source,
          // so the structured editor offers «Ripristina alla fonte» (FG copy + Revert).
          data: HD.structuredFromSrd(type, entry.id, {
            ...created.data,
            name: { ...entry.name },
            // The game data travels with the copy as editable text (see copyText).
            description: { it: copyText(entry, "it"), en: copyText(entry, "en") },
            source: {
              kind: "reconstruction",
              edition: data.EDITION,
              label: `SRD ${data.REVISION} · ${entry.name.en} / ${entry.name.it} · ${pages}`,
              reference: `${entry.id} · CC BY 4.0 · Wizards of the Coast LLC`,
              rights: { modify: true, share: true, export: true },
            },
            fields: {
              ...created.data.fields,
              ...(entry.kind === "spell"
                ? { level: entry.level, school: pick(srd.LABELS.school[entry.school], ctx.lang) }
                : {}),
              ...(entry.kind === "item"
                ? { weight: entry.weight == null ? 0 : srd.poundsToKg(entry.weight), value: cost }
                : {}),
            },
          }),
        },
        ctx.role,
      );
    },
    privateLocal,
  );
  return id;
}
// The editor a new copy opens in: the structured one when that area is built (BI-26).
function openCopy(ctx, draftId) {
  if (ctx.registry?.get?.("route", "homebrew-editor", ctx))
    ctx.navigate("homebrew-editor", { id: draftId, tab: "identity" });
  else ctx.navigate("library", { id: draftId, tab: "edit" });
}
// Journal embed (dnd5e @Embed, FVT-175): a private draft of the chosen entry with the
// marker appended, reviewed and saved in the campaign's own editor. The subject is a
// compendium entry, an SRD reference table or a random table ({id, name}).
export function startEmbedDraft(
  ctx,
  entry,
  { entryId = null, kind = "recap", returnTo = null } = {},
) {
  const id = uid();
  const marker = `@Embed[${entry.id}]`;
  ctx.commit(
    ctx.t("Bozza privata iniziata", "Private draft started"),
    (draft) => {
      const created = content.createCampaignDraft(
        draft,
        {
          id,
          ...(entryId ? { entryId } : { kind }),
          campaignId: kind === "note" && !entryId ? null : draft.campaign?.id,
          returnTo: returnTo ?? { page: "library", tab: ID, revision: entry.id },
        },
        ctx.role,
      );
      const body = created.data.body
        ? `${created.data.body.replace(/\s+$/, "")}\n\n${marker}`
        : marker;
      content.saveCampaignDraft(
        draft,
        id,
        {
          data: {
            ...created.data,
            title: created.data.title || (entryId ? "" : pick(entry.name, ctx.lang)),
            body,
          },
        },
        ctx.role,
      );
    },
    { ...privateLocal, undoable: false },
  );
  return { draftId: id, page: kind === "note" && !entryId ? "notes" : "campaign" };
}
// Rollable and reference tables a viewer may embed: the SRD tables of the DM screen and
// the campaign's random tables this viewer can use (the DM: all; a player: the tables
// the DM opened to players), read from the random tables area's slice.
function randomTables(state) {
  const slice = state?.ext?.[RANDOM_TABLES];
  return Array.isArray(slice?.tables) ? slice.tables : [];
}
export function embeddableTables(ctx) {
  return [
    ...data.REFERENCE_TABLES.map((t) => ({ id: t.id, name: t.name, kind: "srd" })),
    ...randomTables(ctx.state)
      .filter((t) => t && typeof t.id === "string" && (ctx.role === "dm" || t.playersCanUse))
      .map((t) => ({
        id: `table:${t.id}`,
        name: typeof t.name === "object" ? { ...t.name } : L(String(t.name), String(t.name)),
        kind: "random",
      })),
  ];
}
function openEmbed(ctx, entry, { returnTo = null } = {}) {
  const editable = content
    .listCampaignEntries(ctx.state, { campaignId: ctx.state.campaign?.id }, ctx.role)
    .filter((e) => e.permissions.canEdit && e.kind !== "note");
  const kinds = {
    recap: L("Resoconto", "Recap"),
    quest: L("Obiettivo", "Objective"),
    world: L("Voce del mondo", "World entry"),
  };
  // Without an entry the dialog embeds a table, chosen here.
  const tables = entry ? [] : embeddableTables(ctx);
  const tablePicker = entry
    ? ""
    : `<label class="field">${ctx.t("Tabella", "Table")}<select name="subject" required>${[
        ["srd", ctx.t("Tabelle SRD", "SRD tables")],
        ["random", ctx.t("Tabelle casuali della campagna", "Campaign random tables")],
      ]
        .map(([group, label]) => {
          const list = tables.filter((t) => t.kind === group);
          return list.length
            ? `<optgroup label="${attr(ctx, label)}">${list.map((t) => `<option value="${attr(ctx, t.id)}">${esc(ctx, pick(t.name, ctx.lang))}</option>`).join("")}</optgroup>`
            : "";
        })
        .join("")}</select></label>`;
  const ref = entry ? entry.id : "…";
  ctx.dialog(
    entry
      ? ctx.t("Incorpora nel diario", "Embed in the journal")
      : ctx.t("Incorpora una tabella nel diario", "Embed a table in the journal"),
    `${tablePicker}<label class="field">${ctx.t("Voce", "Entry")}<select name="target"><option value="new:recap">${ctx.t("Nuovo resoconto", "New recap")}</option><option value="new:note">${ctx.t("Nuovo appunto personale", "New personal note")}</option>${editable.map((e) => `<option value="${attr(ctx, e.id)}">${esc(ctx, e.data.title || pick(kinds[e.kind] ?? kinds.recap, ctx.lang))}${e.data.title ? "" : ` · ${ctx.t("senza titolo", "untitled")}`}</option>`).join("")}</select></label><p class="muted">${ctx.t(`Si apre l’editor con il riferimento @Embed[${ref}] in fondo al testo. Scegli tu chi legge e salvi tu: i lettori vedono il blocco aggiornato con fonte e tiri.`, `The editor opens with the reference @Embed[${ref}] at the end of the text. You choose readers and save: readers see the live block with its source and rolls.`)}</p>`,
    {
      submitLabel: ctx.t("Apri l’editor", "Open the editor"),
      onSubmit: (form) => {
        const subject = entry ?? tables.find((t) => t.id === String(form.get("subject")));
        if (!subject) throw localized("Scegli una tabella.", "Choose a table.");
        const value = String(form.get("target"));
        const back = returnTo ?? { page: "library", tab: ID, revision: entry?.id };
        const result = value.startsWith("new:")
          ? startEmbedDraft(ctx, subject, { kind: value.slice(4), returnTo: back })
          : startEmbedDraft(ctx, subject, { entryId: value, returnTo: back });
        ctx.navigate(result.page, {
          tab: "edit",
          id: result.draftId,
          returnTo: JSON.stringify(back),
        });
      },
    },
  );
}
// BI-01 (DDB My Library favourites): the Library's «Disponibili» stars SRD entries and
// lists them among its favourites, with the same private bookmarks as the compendium.
export function entryBookmarked(ctx, entryId) {
  try {
    return bookmarked(ctx, { kind: "entry", entryId });
  } catch {
    return false;
  }
}
export function toggleEntryBookmark(ctx, entryId) {
  toggleBookmark(ctx, { kind: "entry", entryId });
}
export function bookmarkedEntries(ctx) {
  let list = [];
  try {
    list = slice(ctx.state).bookmarks[ctx.role] ?? [];
  } catch {
    return [];
  }
  const ids = [...new Set(list.map((b) => b.target?.entryId).filter(Boolean))];
  return ids.map((id) => data.getEntry(id)).filter(Boolean);
}
function toggleBookmark(ctx, target, name) {
  const list = slice(ctx.state).bookmarks[ctx.role] ?? [];
  const existing = list.find((b) => sameTarget(b.target, target));
  ctx.commit(
    existing
      ? ctx.t("Segnalibro rimosso", "Bookmark removed")
      : ctx.t("Segnalibro aggiunto", "Bookmark added"),
    (draft) => {
      const s = slice(draft);
      s.bookmarks[ctx.role] ??= [];
      if (existing)
        s.bookmarks[ctx.role] = s.bookmarks[ctx.role].filter((b) => b.id !== existing.id);
      else
        s.bookmarks[ctx.role].push({
          id: uid(),
          target,
          name: null,
          createdAt: new Date().toISOString(),
        });
    },
    privateLocal,
  );
  void name;
}
const sameTarget = (a, b) =>
  a?.kind === b?.kind &&
  a?.entryId === b?.entryId &&
  (a?.chapterId ?? null) === (b?.chapterId ?? null);
function bookmarked(ctx, target) {
  return (slice(ctx.state).bookmarks[ctx.role] ?? []).some((b) => sameTarget(b.target, target));
}
function bookmarkLabel(ctx, bookmark) {
  if (bookmark.name) return bookmark.name;
  const entry = data.getEntry(bookmark.target.entryId);
  const chapter = bookmark.target.chapterId ? data.readerChapter(bookmark.target.chapterId) : null;
  return `${pick(entry?.name, ctx.lang)}${chapter ? ` · ${pick(chapter.title, ctx.lang)}` : ""}`;
}
function openBookmark(ctx, bookmark) {
  if (bookmark.target.kind === "reader") {
    pendingSection = bookmark.target.entryId;
    go(ctx, `reader:${bookmark.target.chapterId}`);
  } else go(ctx, bookmark.target.entryId);
}
function renameBookmark(ctx, bookmark) {
  ctx.dialog(
    ctx.t("Rinomina segnalibro", "Rename bookmark"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="80" value="${attr(ctx, bookmarkLabel(ctx, bookmark))}"></label><p class="muted">${ctx.t("Vuoto: torna al nome della voce. Visibile solo a te.", "Empty: back to the entry name. Visible only to you.")}</p>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (form) => {
        const name = String(form.get("name") ?? "")
          .trim()
          .slice(0, 80);
        ctx.commit(
          ctx.t("Segnalibro rinominato", "Bookmark renamed"),
          (draft) => {
            const row = slice(draft).bookmarks[ctx.role]?.find((b) => b.id === bookmark.id);
            if (!row) throw new Error("Bookmark unavailable");
            row.name = name || null;
          },
          privateLocal,
        );
      },
    },
  );
}
function bookmarksPanel(ctx) {
  const list = slice(ctx.state).bookmarks[ctx.role] ?? [];
  return `<section class="compendium-bookmarks" aria-labelledby="compendium-bookmarks-title"><h3 id="compendium-bookmarks-title">${ctx.t("Segnalibri", "Bookmarks")} <span class="muted">(${list.length})</span></h3>${list.length ? `<ul>${list.map((b) => `<li><button type="button" class="text-button" data-bookmark-open="${attr(ctx, b.id)}">${esc(ctx, bookmarkLabel(ctx, b))}</button><span class="compendium-bookmark-tools"><button type="button" class="button quiet" data-bookmark-rename="${attr(ctx, b.id)}" aria-label="${attr(ctx, ctx.t(`Rinomina ${bookmarkLabel(ctx, b)}`, `Rename ${bookmarkLabel(ctx, b)}`))}">${ctx.t("Rinomina", "Rename")}</button><button type="button" class="button quiet" data-bookmark-remove="${attr(ctx, b.id)}" aria-label="${attr(ctx, ctx.t(`Rimuovi ${bookmarkLabel(ctx, b)}`, `Remove ${bookmarkLabel(ctx, b)}`))}">${ctx.icon("close")}</button></span></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun segnalibro. Aggiungili dalle voci o dal lettore; sono visibili solo a te.", "No bookmarks yet. Add them from entries or the reader; only you can see them.")}</p>`}</section>`;
}
function speak(ctx, entry, lang) {
  const synth = globalThis.speechSynthesis;
  if (!synth || typeof globalThis.SpeechSynthesisUtterance !== "function") {
    ctx.toast(
      ctx.t("La voce del dispositivo non è disponibile.", "The device voice is unavailable."),
      true,
    );
    return false;
  }
  synth.cancel();
  const utterance = new globalThis.SpeechSynthesisUtterance(pick(entry.name, lang));
  utterance.lang = lang === "en" ? "en-US" : "it-IT";
  utterance.rate = 0.9;
  synth.speak(utterance);
  ctx.toast(
    ctx.t(
      `Pronuncia: ${pick(entry.name, lang)} (voce del dispositivo)`,
      `Pronunciation: ${pick(entry.name, lang)} (device voice)`,
    ),
  );
  return true;
}
function statusLine(ctx) {
  if (!status) return "";
  return `<div class="compendium-status" role="status"><p>${esc(ctx, pick(status.text, ctx.lang))}</p><div class="toolbar">${status.sheet ? `<button type="button" class="button" data-status-sheet>${ctx.t("Apri la scheda", "Open the sheet")}</button>` : ""}${status.scene?.active ? `<button type="button" class="button" data-status-table>${ctx.t("Vai al Tavolo", "Go to the Table")}</button>` : ""}${status.scene && !status.scene.active ? `<button type="button" class="button" data-status-prep>${ctx.t("Apri la preparazione", "Open preparation")}</button>` : ""}${status.screen ? `<button type="button" class="button" data-status-table>${ctx.t("Vai al Tavolo", "Go to the Table")}</button>` : ""}${status.undo && ctx.canUndo?.() ? `<button type="button" class="button quiet" data-status-undo>${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}</button>` : ""}<button type="button" class="icon-button" data-status-close aria-label="${attr(ctx, ctx.t("Chiudi avviso", "Dismiss"))}">${ctx.icon("close")}</button></div></div>`;
}

// ---------------------------------------------------------------- pages

function subnav(ctx, current) {
  const count = (slice(ctx.state).bookmarks[ctx.role] ?? []).length;
  const items = [
    ["", ctx.t("Sfoglia", "Browse")],
    ["reader", ctx.t("Regole: lettore", "Rules reader")],
    ["legal", ctx.t("Fonti e attribuzione", "Sources and attribution")],
  ];
  return `<nav class="compendium-subnav" aria-label="${attr(ctx, ctx.t("Compendio", "Compendium"))}">${items.map(([view, label]) => `<button type="button" class="button ${current === view ? "active" : "quiet"}" data-compendium-go="${view}" ${current === view ? 'aria-current="page"' : ""}>${label}</button>`).join("")}<button type="button" class="button quiet" data-embed-table>${ctx.t("Incorpora una tabella…", "Embed a table…")}</button><span class="compendium-subnav-note">${ctx.t("Segnalibri", "Bookmarks")}: ${count}</span></nav>`;
}
function contextBanner(ctx) {
  const target = sheetTarget(ctx);
  if (!target) return "";
  if (target.missing)
    return `<div class="compendium-context" role="status"><p>${ctx.t("La scheda di destinazione non è più disponibile.", "The destination sheet is no longer available.")}</p></div>`;
  if (target.builder)
    return `<div class="compendium-context"><p>${ctx.t("Consultazione durante la creazione: le scelte della bozza restano nel percorso guidato.", "Browsing during creation: draft choices stay in the guided path.")}</p><button type="button" class="button quiet" data-compendium-return>${ctx.t("Torna alla bozza", "Return to the draft")}</button></div>`;
  return `<div class="compendium-context"><p>${ctx.t("Scegli per", "Choosing for")} <strong>${esc(ctx, actorName(ctx, target.actor))}</strong> · ${esc(ctx, target.tab === "spells" ? ctx.t("Magie", "Spells") : target.tab === "inventory" ? ctx.t("Inventario", "Inventory") : ctx.t("Scheda", "Sheet"))}</p><button type="button" class="button quiet" data-compendium-return>${ctx.t("Torna alla scheda senza scegliere", "Return to sheet without choosing")}</button></div>`;
}
function langToggle(ctx) {
  const lang = contentLang(ctx);
  return `<div class="compendium-lang" role="group" aria-label="${attr(ctx, ctx.t("Lingua del contenuto", "Content language"))}"><span>${ctx.t("Lingua del contenuto", "Content language")}</span><button type="button" class="button ${lang === "it" ? "active" : "quiet"}" data-content-lang-set="it" aria-pressed="${lang === "it"}">Italiano</button><button type="button" class="button ${lang === "en" ? "active" : "quiet"}" data-content-lang-set="en" aria-pressed="${lang === "en"}">English</button></div>`;
}
// Collapsible filter groups, as in the dnd5e Compendium Browser sidebar (FVT-170): open
// when chosen by the viewer or when a value is selected.
function facetGroup(ctx, facet, active, inner) {
  const u = uiState(ctx);
  const key = `${u.category}:${facet.id}`;
  const open = active || (u.openFacets[key] ?? DEFAULT_OPEN.has(key));
  const selected = active
    ? ` <span class="compendium-count">${ctx.t("attivo", "active")}</span>`
    : "";
  return `<details class="compendium-facet" data-facet-group="${attr(ctx, key)}" ${open ? "open" : ""}><summary>${esc(ctx, pick(facet.label, ctx.lang))}${selected}</summary><fieldset><legend class="sr-only">${esc(ctx, pick(facet.label, ctx.lang))}</legend>${inner}</fieldset></details>`;
}
const DEFAULT_OPEN = new Set([
  "spells:level",
  "spells:class",
  "spells:concentration",
  "creatures:cr",
  "creatures:type",
  "items:category",
  "items:rarity",
  "rules:ruleType",
  "classes:caster",
]);
function renderBrowse(ctx) {
  const u = uiState(ctx);
  const target = sheetTarget(ctx);
  // A new sheet context opens the matching category once (Library "Browse library").
  if (target?.actor && u.contextKey !== ctx.view.returnTo) {
    u.contextKey = ctx.view.returnTo;
    const preferred =
      target.tab === "spells" ? "spells" : target.tab === "inventory" ? "items" : null;
    if (preferred) u.category = preferred;
    saveUi(ctx);
  }
  const category = u.category;
  const filter = u.filters[category];
  const results = data.filterEntries(category, filter, contentLang(ctx));
  const facets = data.facetOptions(category, filter);
  const chips = data.activeChips(category, filter);
  const lang = contentLang(ctx);
  const activeCount = chips.length + (filter.q ? 1 : 0);
  const facetHTML = facets
    .map((facet) =>
      facet.kind === "range"
        ? facetGroup(
            ctx,
            facet,
            Boolean(facet.min || facet.max),
            `<div class="compendium-range"><label class="field">${ctx.t("Minimo", "Minimum")}<select data-facet-range="min"><option value="">${ctx.t("Qualsiasi", "Any")}</option>${facet.values.map((v) => `<option value="${attr(ctx, v)}" ${facet.min === v ? "selected" : ""}>${esc(ctx, v)}</option>`).join("")}</select></label><label class="field">${ctx.t("Massimo", "Maximum")}<select data-facet-range="max"><option value="">${ctx.t("Qualsiasi", "Any")}</option>${facet.values.map((v) => `<option value="${attr(ctx, v)}" ${facet.max === v ? "selected" : ""}>${esc(ctx, v)}</option>`).join("")}</select></label></div>`,
          )
        : facetGroup(
            ctx,
            facet,
            facet.options.some((o) => o.selected),
            facet.options
              .map(
                (o) =>
                  `<label class="compendium-option ${o.count || o.selected ? "" : "empty"}"><input type="checkbox" data-facet="${attr(ctx, facet.id)}" value="${attr(ctx, o.value)}" ${o.selected ? "checked" : ""}><span>${esc(ctx, pick(o.label, ctx.lang))}</span><span class="compendium-count" aria-label="${attr(ctx, `${o.count} ${ctx.t("risultati", "results")}`)}">${o.count}</span></label>`,
              )
              .join(""),
          ),
    )
    .join("");
  const rows = results
    .map((entry) => {
      const open = u.expanded === entry.id;
      const other = lang === "it" ? "en" : "it";
      const drag = ["creature", "item", "spell"].includes(entry.kind)
        ? ` draggable="true" data-compendium-drag="${attr(ctx, entry.id)}" title="${attr(ctx, entry.kind === "creature" ? ctx.t("Trascina sulla mappa del Tavolo", "Drag onto the Table map") : ctx.t("Trascina su una scheda", "Drag onto a sheet"))}"`
        : "";
      return `<li class="compendium-row ${open ? "open" : ""}"${drag}><div class="compendium-row-head"><button type="button" class="compendium-row-toggle" data-row-toggle="${attr(ctx, entry.id)}" ${entry.kind === "class" ? `data-row-opens="class:${attr(ctx, entry.classId)}"` : `aria-expanded="${open}" aria-controls="row-${attr(ctx, entry.slug)}-${entry.kind}"`}><span class="compendium-row-name">${esc(ctx, pick(entry.name, lang))}</span><span class="compendium-row-alt" lang="${other}">${esc(ctx, pick(entry.name, other))}</span><span class="compendium-row-meta">${esc(ctx, data.entryMeta(entry, ctx.lang))}</span></button><span class="compendium-row-source">${data.EDITION} · SRD ${data.REVISION}</span>${target?.actor && ["item", "spell"].includes(entry.kind) ? `<button type="button" class="button" data-compendium-add="${attr(ctx, entry.id)}" aria-label="${attr(ctx, ctx.t(`Aggiungi ${pick(entry.name, "it")} a ${actorName(ctx, target.actor)}`, `Add ${pick(entry.name, "en")} to ${actorName(ctx, target.actor)}`))}">${ctx.t("Aggiungi", "Add")}</button>` : ""}<button type="button" class="button quiet" data-compendium-go="${attr(ctx, entry.kind === "class" ? `class:${entry.classId}` : entry.id)}">${ctx.t("Apri", "Open")}</button></div>${open ? `<div class="compendium-row-body" id="row-${attr(ctx, entry.slug)}-${entry.kind}" data-content-lang="${lang}">${entry.kind === "class" ? `<p>${esc(ctx, pick(entry.summary, lang))}</p>` : entryBody(ctx, entry, lang, { interactive: true, heading: "h4" })}<p class="compendium-row-foot"><span>${esc(ctx, pagesText(ctx, entry))}</span><button type="button" class="button" data-compendium-go="${attr(ctx, entry.kind === "class" ? `class:${entry.classId}` : entry.id)}">${ctx.t("Apri la pagina completa", "Open the full page")}</button></p></div>` : ""}</li>`;
    })
    .join("");
  return `${contextBanner(ctx)}${subnav(ctx, "")}${statusLine(ctx)}<div class="compendium-categories" role="tablist" aria-label="${attr(ctx, ctx.t("Categorie", "Categories"))}">${data.CATEGORIES.map((c) => `<button type="button" role="tab" id="compendium-tab-${c.id}" aria-controls="compendium-tabpanel" tabindex="${c.id === category ? 0 : -1}" class="compendium-category ${c.id === category ? "active" : ""}" aria-selected="${c.id === category}" data-category="${c.id}">${esc(ctx, pick(c.label, ctx.lang))} <span class="muted">${data.categoryEntries(c.id).length}</span></button>`).join("")}</div><div class="compendium-browser" role="tabpanel" id="compendium-tabpanel" aria-labelledby="compendium-tab-${category}"><aside class="compendium-filters" aria-label="${attr(ctx, ctx.t("Filtri", "Filters"))}"><form data-compendium-search role="search"><label class="field">${ctx.t("Cerca per nome (IT o EN)", "Search by name (IT or EN)")}<input type="search" name="q" data-compendium-query value="${attr(ctx, filter.q)}" autocomplete="off"></label></form><details class="compendium-filter-box" ${u.filtersOpen || globalThis.innerWidth > 720 || !globalThis.innerWidth ? "open" : ""} data-filter-box><summary>${ctx.t("Filtri", "Filters")}${activeCount ? ` (${activeCount})` : ""}</summary>${facetHTML || `<p class="muted">${ctx.t("Nessun filtro per questa categoria: usa la ricerca.", "No filters for this category: use search.")}</p>`}</details>${langToggle(ctx)}${bookmarksPanel(ctx)}</aside><section class="compendium-results" aria-labelledby="compendium-results-title"><div class="compendium-resultbar"><h2 id="compendium-results-title" aria-live="polite" tabindex="-1" data-result-count>${esc(ctx, data.countLabel(category, results.length, ctx.lang))}</h2>${chips.length || filter.q ? `<ul class="compendium-chips" aria-label="${attr(ctx, ctx.t("Filtri attivi", "Active filters"))}">${filter.q ? `<li><button type="button" class="compendium-chip" data-chip-query aria-label="${attr(ctx, ctx.t(`Rimuovi ricerca «${filter.q}»`, `Remove search “${filter.q}”`))}">“${esc(ctx, filter.q)}” <span aria-hidden="true">×</span></button></li>` : ""}${chips.map((chip) => `<li><button type="button" class="compendium-chip" data-chip-facet="${attr(ctx, chip.facet)}" data-chip-value="${attr(ctx, chip.value)}" aria-label="${attr(ctx, ctx.t(`Rimuovi filtro ${pick(chip.label, "it")}`, `Remove filter ${pick(chip.label, "en")}`))}">${esc(ctx, pick(chip.label, ctx.lang))} <span aria-hidden="true">×</span></button></li>`).join("")}<li><button type="button" class="button quiet" data-chips-clear>${ctx.t("Azzera filtri", "Clear filters")}</button></li></ul>` : ""}</div>${results.length ? `<ul class="compendium-list" data-content-lang="${lang}">${rows}</ul>` : `<div class="empty-state"><h3>${ctx.t("Nessuna voce corrisponde", "No entries match")}</h3><p>${ctx.t("Togli un filtro o cerca un altro nome. Il campione SRD contiene una selezione di voci, non l’intero documento.", "Remove a filter or search another name. The SRD sample holds a selection of entries, not the whole document.")}</p></div>`}</section></div>`;
}
function breadcrumb(ctx, entry) {
  const category = data.CATEGORIES.find((c) => c.kind === entry.kind);
  return `<nav class="compendium-breadcrumb" aria-label="${attr(ctx, ctx.t("Percorso", "Breadcrumb"))}"><button type="button" class="text-button" data-compendium-category="${attr(ctx, category?.id ?? "")}">${ctx.t("Compendio SRD", "SRD Compendium")}</button><span aria-hidden="true">›</span><button type="button" class="text-button" data-compendium-category="${attr(ctx, category?.id ?? "")}">${esc(ctx, pick(category?.label, ctx.lang))}</button><span aria-hidden="true">›</span><span aria-current="page">${esc(ctx, pick(entry.name, ctx.lang))}</span></nav>`;
}
function commandsPanel(ctx, entry) {
  const target = sheetTarget(ctx);
  const canSheet = ["spell", "item"].includes(entry.kind) && !target?.builder;
  const bm = bookmarked(ctx, { kind: "entry", entryId: entry.id });
  const primary =
    canSheet && target?.actor
      ? `<button type="button" class="button primary" data-cmd="sheet">${ctx.t(`Aggiungi a ${actorName(ctx, target.actor)}`, `Add to ${actorName(ctx, target.actor)}`)}</button>`
      : canSheet
        ? `<button type="button" class="button primary" data-cmd="sheet">${ctx.t("Aggiungi a una scheda…", "Add to a sheet…")}</button>`
        : "";
  return `<aside class="compendium-commands" aria-labelledby="compendium-commands-title"><h3 id="compendium-commands-title">${ctx.t("Usa questa voce", "Use this entry")}</h3>${primary}${entry.kind === "creature" && ctx.role === "dm" ? `<button type="button" class="button primary" data-cmd="scene">${ctx.t("Aggiungi a una scena…", "Add to a scene…")}</button>` : ""}${entry.kind === "condition" ? `<button type="button" class="button" data-cmd="apply">${ctx.t("Applica a una creatura…", "Apply to a creature…")}</button>` : ""}${libraryCopyType(entry) ? `<button type="button" class="button" data-cmd="copy" aria-describedby="compendium-copy-note">${ctx.t("Crea una copia modificabile", "Make an editable copy")}</button><p class="muted" id="compendium-copy-note">${entry.kind === "creature" ? ctx.t("La copia si apre nel creatore di mostri: CA, PF, caratteristiche e azioni sono campi. «Ripristina alla fonte» torna all’originale.", "The copy opens in the monster creator: AC, HP, abilities and actions are fields. “Revert to source” goes back to the original.") : entry.kind === "spell" ? ctx.t("La copia si apre nell’editor: livello, scuola e attività (TS, attacco, danni) sono campi, il testo resta modificabile. «Ripristina alla fonte» torna all’originale.", "The copy opens in the editor: level, school and activity (save, attack, damage) are fields, the text stays editable. “Revert to source” goes back to the original.") : entry.kind === "item" ? ctx.t("Peso, valore e dati d’arma o d’armatura sono campi. «Ripristina alla fonte» torna all’originale.", "Weight, value and weapon or armor data are fields. “Revert to source” goes back to the original.") : ctx.t("La copia porta nome e testo della voce, modificabili. «Ripristina alla fonte» torna all’originale.", "The copy carries the entry’s name and text, both editable. “Revert to source” goes back to the original.")}</p>` : ""}${entry.kind === "item" && ["weapon", "armor"].includes(entry.category) && ctx.registry?.get?.("command", "homebrew-editor.forge", ctx) ? `<button type="button" class="button" data-cmd="forge">${ctx.t("Forgia una versione magica (+1, +2, +3)…", "Forge a magic version (+1, +2, +3)…")}</button>` : ""}${["creature", "spell", "item", "rule", "condition"].includes(entry.kind) ? `<button type="button" class="button" data-cmd="embed">${ctx.t("Incorpora nel diario…", "Embed in the journal…")}</button>` : ""}${ctx.role === "dm" ? `<button type="button" class="button" data-cmd="pin">${ctx.t("Fissa nello schermo del DM", "Pin to the DM screen")}</button>` : ""}<button type="button" class="button" data-cmd="bookmark" aria-pressed="${bm}">${bm ? ctx.t("Nei segnalibri ✓", "Bookmarked ✓") : ctx.t("Aggiungi ai segnalibri", "Add bookmark")}</button><button type="button" class="button" data-cmd="print">${ctx.t("Vista stampabile", "Print view")}</button>${data.chapterOfEntry(entry.id) ? `<button type="button" class="button quiet" data-cmd="reader">${ctx.t("Leggi nel lettore delle regole", "Read in the rules reader")}</button>` : ""}<p class="muted">${ctx.t("Consultare non aggiunge nulla alla scheda né alla campagna.", "Reading adds nothing to the sheet or the campaign.")}</p></aside>`;
}
// BI-28 (Roll20's list of fully automated books): what the app runs for each kind of SRD
// entry, stated on the entry and in «Fonti e attribuzione». The spells the Table resolves
// on its own are the ones combat.mjs catalogues (Fire Bolt, Burning Hands, Magic Missile).
const TABLE_SPELLS = ["fire-bolt", "burning-hands", "magic-missile"];
const AUTOMATION_NAMES = {
  full: L("Automazione completa", "Fully automated"),
  partial: L("Automazione parziale", "Partly automated"),
  text: L("Solo testo", "Text only"),
};
function srdAutomation(entry) {
  if (entry.kind === "condition")
    return {
      level: "full",
      text: L(
        "Si applica a una creatura e i suoi effetti sui tiri e sul movimento valgono da soli.",
        "It applies to a creature and its effects on rolls and movement work on their own.",
      ),
    };
  if (entry.kind === "spell")
    return {
      level: "partial",
      text: TABLE_SPELLS.includes(entry.slug)
        ? L(
            "Si aggiunge alla scheda; al Tavolo bersagli, tiri, danni e TS si risolvono da soli.",
            "It is added to the sheet; at the Table targets, rolls, damage and saves resolve on their own.",
          )
        : L(
            "Si aggiunge alla scheda e i tiri della voce (attacco, danni, TS) sono cliccabili; l’effetto lo applichi tu.",
            "It is added to the sheet and the entry’s rolls (attack, damage, save) are clickable; you apply the effect.",
          ),
    };
  if (entry.kind === "creature")
    return {
      level: "partial",
      text: L(
        "Blocco tirabile; nella scena l’attacco in mischia è collegato al Tavolo, tratti e azioni leggendarie restano al DM.",
        "Rollable stat block; in a scene its melee attack is connected to the Table, traits and legendary actions stay with the DM.",
      ),
    };
  if (entry.kind === "item")
    return (entry.magic?.modifiers ?? []).length
      ? {
          level: "partial",
          text: L(
            "Si aggiunge all’inventario; i suoi bonus a CA e TS valgono da soli quando è indossato (e sintonizzato).",
            "It is added to the inventory; its AC and save bonuses work on their own while worn (and attuned).",
          ),
        }
      : {
          level: "partial",
          text: L(
            "Si aggiunge all’inventario con peso e valore; i tiri della voce sono cliccabili.",
            "It is added to the inventory with weight and value; the entry’s rolls are clickable.",
          ),
        };
  return {
    level: "text",
    text: L("Consultazione con collegamenti alle regole.", "Reading with links to the rules."),
  };
}
// BI-13 (DDB errata recorded per entry): each entry's own revision history.
function entryHistory(ctx, entry) {
  const pages = `EN p.${(entry.source?.en?.pages ?? []).join(", ") || "—"} / IT p.${(entry.source?.it?.pages ?? []).join(", ") || "—"}`;
  const auto = srdAutomation(entry);
  return `<section class="compendium-history" aria-labelledby="compendium-history-title"><h3 id="compendium-history-title">${ctx.t("Cosa è cambiato", "What changed")}</h3><ol class="compendium-history-list">${data.CATALOG_REVISIONS.map(
    (r) =>
      `<li><strong>SRD ${esc(ctx, r.revision)}</strong> · ${esc(ctx, new Date(r.date + "T12:00:00Z").toLocaleDateString(ctx.lang === "it" ? "it-IT" : "en-GB"))} · ${ctx.t(`voce importata (${pages})`, `entry imported (${pages})`)}</li>`,
  ).join(
    "",
  )}</ol><p class="muted">${ctx.t("Nessuna errata successiva registrata per questa voce: quando una revisione cambia la voce, qui compare la riga con la data e il cambiamento.", "No later errata recorded for this entry: when a revision changes it, the line with the date and the change appears here.")}</p><p><span class="badge" data-srd-automation="${auto.level}">${esc(ctx, pick(AUTOMATION_NAMES[auto.level], ctx.lang))}</span> ${esc(ctx, pick(auto.text, ctx.lang))}</p></section>`;
}
function renderEntry(ctx, entry) {
  const lang = contentLang(ctx);
  const other = lang === "it" ? "en" : "it";
  const canSpeak = typeof globalThis.speechSynthesis === "object" && !!globalThis.speechSynthesis;
  return `${contextBanner(ctx)}${subnav(ctx, "entry")}${statusLine(ctx)}${breadcrumb(ctx, entry)}<button type="button" class="button quiet compendium-back" data-compendium-back>${ctx.icon("arrow")} ${ctx.t("Torna ai risultati", "Back to results")}</button><div class="compendium-entry-layout"><article class="compendium-entry" lang="${lang}" data-content-lang="${lang}" data-entry="${attr(ctx, entry.id)}"><header class="compendium-entry-head"><p class="compendium-kind">${esc(ctx, pick(data.kindLabel(entry), ctx.lang))}</p><div class="compendium-title-row"><h2>${esc(ctx, pick(entry.name, lang))}</h2>${canSpeak ? `<button type="button" class="icon-button compendium-speak" data-cmd="speak" aria-label="${attr(ctx, ctx.t(`Ascolta la pronuncia di ${pick(entry.name, lang)} (voce del dispositivo)`, `Hear how to say ${pick(entry.name, lang)} (device voice)`))}" title="${attr(ctx, ctx.t("Pronuncia (voce del dispositivo)", "Pronunciation (device voice)"))}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11"/></svg></button>` : ""}</div><p class="compendium-alt-name" lang="${other}">${esc(ctx, pick(entry.name, other))}</p>${badges(ctx, entry, lang)}${langToggle(ctx)}</header>${entryBody(ctx, entry, lang, { interactive: true, heading: "h3" })}${entryHistory(ctx, entry)}${sourceFooter(ctx, entry, lang)}</article>${commandsPanel(ctx, entry)}</div>`;
}
function renderPrint(ctx, entry) {
  const lang = contentLang(ctx);
  return `<div class="compendium-print"><div class="compendium-noprint compendium-print-bar"><p>${ctx.t("Vista stampabile: solo la voce, la fonte e l’attribuzione, su sfondo chiaro.", "Print view: only the entry, its source and attribution, on a light background.")}</p><div class="toolbar"><button type="button" class="button primary" data-cmd="print-now">${ctx.t("Stampa", "Print")}</button><button type="button" class="button" data-compendium-go="${attr(ctx, entry.id)}">${ctx.t("Torna alla voce", "Back to the entry")}</button></div>${langToggle(ctx)}</div><article class="compendium-print-page" lang="${lang}"><p class="compendium-kind">${esc(ctx, pick(data.kindLabel(entry), lang))} · ${lang === "it" ? "Regole" : "Rules"} ${data.EDITION}</p>${entry.kind === "creature" ? "" : `<h2>${esc(ctx, pick(entry.name, lang))}</h2>`}${entryBody(ctx, entry, lang, { interactive: false, heading: "h2" })}${sourceFooter(ctx, entry, lang, { print: true })}</article></div>`;
}
function renderLegal(ctx) {
  const doc = (lang) => {
    const d = data.SRD_DOCUMENTS[lang];
    return `<section class="compendium-legal-doc" lang="${lang}"><h3>${lang === "it" ? "Italiano" : "English"} · ${esc(ctx, d.title)}</h3><blockquote class="compendium-attribution" data-attribution="${lang}">${esc(ctx, data.SRD_ATTRIBUTION[lang])}</blockquote><dl class="compendium-facts">${fact(ctx.t("File", "File"), `<a href="${attr(ctx, d.url)}" target="_blank" rel="noopener noreferrer">${esc(ctx, d.url.split("/").at(-1))}</a>`)}${fact("SHA-256", `<code class="compendium-hash">${esc(ctx, d.sha256)}</code>`)}${fact(ctx.t("Pagine", "Pages"), d.pageCount)}${fact(ctx.t("Licenza", "License"), `<a href="${attr(ctx, data.SRD_LICENSE.url)}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>`)}</dl></section>`;
  };
  return `${subnav(ctx, "legal")}<section class="compendium-legal" aria-labelledby="compendium-legal-title"><h2 id="compendium-legal-title">${ctx.t("Fonti, revisioni e attribuzione", "Sources, revisions and attribution")}</h2><p>${ctx.t("Il compendio usa il System Reference Document 5.2.1 nelle edizioni ufficiali inglese e italiana. Ogni voce indica la pagina di entrambe; le frasi di attribuzione richieste sono riportate qui sotto e in fondo a ogni voce e stampa.", "The compendium uses System Reference Document 5.2.1 in its official English and Italian editions. Every entry cites the page in both; the required attribution statements appear below and at the foot of every entry and print.")}</p><div class="compendium-legal-docs">${doc("en")}${doc("it")}</div><section><h3>${ctx.t("Come usiamo il SRD", "How we use the SRD")}</h3><p>${esc(ctx, pick(data.SUMMARY_POLICY, ctx.lang))}</p><p>${ctx.t("Tutte le voci seguono le regole 2024 (SRD 5.2.1). Il catalogo non contiene voci legacy 2014: se un contenuto di un’altra edizione entrerà nella Biblioteca, avrà la sua etichetta e non sostituirà una regola 2024.", "Every entry follows the 2024 rules (SRD 5.2.1). The catalogue holds no 2014 legacy entries: content from another edition would carry its own label and never replace a 2024 rule.")}</p></section><section><h3>${ctx.t("Livello di automazione della fonte", "Automation level of the source")}</h3><p>${ctx.t("Cosa esegue l’app per le voci di SRD 5.2.1, per tipo. L’homebrew dichiara il suo livello voce per voce (Campagna › Homebrew).", "What the app runs for SRD 5.2.1 entries, by kind. Homebrew states its own level entry by entry (Campaign › Homebrew).")}</p><ul class="compendium-automation-list" data-srd-automation-table>${[
    ["condition", L("Condizioni", "Conditions"), { kind: "condition" }],
    [
      "spell-table",
      L(
        "Incantesimi risolti al Tavolo (Dardo di fuoco, Mani brucianti, Dardo incantato)",
        "Spells resolved at the Table (Fire Bolt, Burning Hands, Magic Missile)",
      ),
      { kind: "spell", slug: "fire-bolt" },
    ],
    ["spell", L("Altri incantesimi", "Other spells"), { kind: "spell", slug: "" }],
    ["creature", L("Creature", "Creatures"), { kind: "creature" }],
    [
      "item-bonus",
      L("Oggetti con bonus strutturati", "Items with structured bonuses"),
      { kind: "item", magic: { modifiers: [1] } },
    ],
    ["item", L("Altri oggetti", "Other items"), { kind: "item" }],
    ["rule", L("Regole e classi", "Rules and classes"), { kind: "rule" }],
  ]
    .map(([id, name, probe]) => {
      const a = srdAutomation(probe);
      return `<li data-srd-automation-row="${id}"><strong>${esc(ctx, pick(name, ctx.lang))}</strong> <span class="badge">${esc(ctx, pick(AUTOMATION_NAMES[a.level], ctx.lang))}</span><br><span class="muted">${esc(ctx, pick(a.text, ctx.lang))}</span></li>`;
    })
    .join(
      "",
    )}</ul></section><section><h3>${ctx.t("Registro delle revisioni", "Revision log")}</h3><div class="table-wrap"><table><thead><tr><th scope="col">${ctx.t("Revisione", "Revision")}</th><th scope="col">${ctx.t("Edizione", "Edition")}</th><th scope="col">${ctx.t("Data", "Date")}</th><th scope="col">${ctx.t("Nota", "Note")}</th></tr></thead><tbody>${data.CATALOG_REVISIONS.map((r) => `<tr><td>${esc(ctx, r.revision)}</td><td>${esc(ctx, r.edition)}</td><td>${esc(ctx, new Date(r.date + "T12:00:00Z").toLocaleDateString(ctx.lang === "it" ? "it-IT" : "en-GB"))}</td><td>${esc(ctx, pick(r.note, ctx.lang))}</td></tr>`).join("")}</tbody></table></div></section></section>`;
}
function renderClass(ctx, classId) {
  const s = data.classSummary(classId);
  const lang = contentLang(ctx);
  const u = uiState(ctx);
  const l = (v) => pick(v, lang);
  const entry = data.getEntry(s.entryId);
  const casterCols = s.caster === "full" || s.caster === "half";
  const header = `<tr><th scope="col">${ctx.t("Livello", "Level")}</th><th scope="col">${ctx.t("Bonus competenza", "Proficiency Bonus")}</th><th scope="col">${ctx.t("Privilegi di classe", "Class features")}</th>${s.hasCantrips ? `<th scope="col">${ctx.t("Trucchetti", "Cantrips")}</th>` : ""}${s.hasPrepared ? `<th scope="col">${ctx.t("Incantesimi preparati", "Prepared spells")}</th>` : ""}${casterCols ? Array.from({ length: s.maxSlotLevel }, (_, i) => `<th scope="col">${i + 1}°</th>`).join("") : ""}${s.caster === "pact" ? `<th scope="col">${ctx.t("Slot del patto", "Pact slots")}</th><th scope="col">${ctx.t("Livello slot", "Slot level")}</th>` : ""}</tr>`;
  const rows = s.levels
    .map(
      (row) =>
        `<tr><th scope="row">${row.level}</th><td>+${row.proficiencyBonus}</td><td>${row.features.length ? row.features.map((f) => (lang === "it" && !f.itVerified ? `${esc(ctx, f.en)} <span class="muted">(${ctx.t("nome EN", "EN name")})</span>` : esc(ctx, l(f)))).join(", ") : `<span class="muted">—</span>`}</td>${s.hasCantrips ? `<td>${row.cantrips}</td>` : ""}${s.hasPrepared ? `<td>${row.prepared}</td>` : ""}${casterCols ? Array.from({ length: s.maxSlotLevel }, (_, i) => `<td>${row.spellSlots?.[i + 1] ?? "—"}</td>`).join("") : ""}${s.caster === "pact" ? `<td>${row.pactSlots?.max ?? "—"}</td><td>${row.pactSlots?.level ?? "—"}°</td>` : ""}</tr>`,
    )
    .join("");
  const groups = data.classSpellList(classId, u.spellGroup, lang);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  return `${contextBanner(ctx)}${subnav(ctx, "class")}<nav class="compendium-breadcrumb" aria-label="${attr(ctx, ctx.t("Percorso", "Breadcrumb"))}"><button type="button" class="text-button" data-compendium-category="classes">${ctx.t("Compendio SRD", "SRD Compendium")}</button><span aria-hidden="true">›</span><button type="button" class="text-button" data-compendium-category="classes">${ctx.t("Classi", "Classes")}</button><span aria-hidden="true">›</span><span aria-current="page">${esc(ctx, l(s.name))}</span></nav><article class="compendium-class" lang="${lang}" data-content-lang="${lang}"><header class="compendium-entry-head"><p class="compendium-kind">${ctx.t("Classe · riepilogo", "Class · summary")}</p><h2>${esc(ctx, l(s.name))}</h2>${badges(ctx, entry, lang)}${langToggle(ctx)}</header><dl class="compendium-facts">${fact(ctx.t("Dado Vita", "Hit Die"), `d${s.hitDie}`)}${fact(ctx.t("Caratteristica primaria", "Primary ability"), esc(ctx, s.primaryAbilities.map(l).join(", ")))}${fact(ctx.t("Tiri salvezza", "Saving throws"), esc(ctx, s.savingThrows.map(l).join(", ")))}${fact(ctx.t("Abilità", "Skills"), esc(ctx, `${ctx.t("scegline", "choose")} ${s.skillCount}: ${s.skills.map(l).join(", ")}`))}${s.spellcastingAbility ? fact(ctx.t("Caratteristica da incantatore", "Spellcasting ability"), esc(ctx, l(s.spellcastingAbility))) : ""}</dl><h3>${ctx.t("Progressione", "Progression")}</h3><div class="table-wrap compendium-class-table"><table><thead>${header}</thead><tbody>${rows}</tbody></table></div><p class="muted">${esc(ctx, l(s.coverage))} ${ctx.t("I privilegi di ogni livello sono quelli della tabella di classe dell’SRD 5.2.1, con i nomi italiani dell’SRD IT; «—» indica un livello senza privilegi nuovi.", "Each level’s features are those of the SRD 5.2.1 class table, with the Italian names of the IT SRD; “—” marks a level with no new feature.")}</p>${
    total
      ? `<section class="compendium-spell-list" aria-labelledby="class-spells-title"><div class="compendium-spell-list-head"><h3 id="class-spells-title">${ctx.t("Lista degli incantesimi", "Spell list")} <span class="muted">(${total})</span></h3><div class="compendium-lang" role="group" aria-label="${attr(ctx, ctx.t("Raggruppa", "Group by"))}"><span>${ctx.t("Raggruppa", "Group by")}</span>${[
          ["level", ctx.t("Livello", "Level")],
          ["school", ctx.t("Scuola", "School")],
          ["alpha", "A–Z"],
        ]
          .map(
            ([id, label]) =>
              `<button type="button" class="button ${u.spellGroup === id ? "active" : "quiet"}" data-spell-group="${id}" aria-pressed="${u.spellGroup === id}">${label}</button>`,
          )
          .join(
            "",
          )}</div></div>${groups.map((g) => `<section class="compendium-spell-group"><h4>${esc(ctx, l(g.label))}</h4><ul>${g.entries.map((spell) => `<li><button type="button" class="text-button" data-compendium-go="${attr(ctx, spell.id)}">${esc(ctx, l(spell.name))}</button><small class="muted">${esc(ctx, data.entryMeta(spell, ctx.lang))}</small></li>`).join("")}</ul></section>`).join("")}<p class="muted">${ctx.t("Elenco tratto dal campione SRD dell’app: non include ogni incantesimo del documento.", "List drawn from the app’s SRD sample: it does not include every spell in the document.")}</p></section>`
      : ""
  }${sourceFooter(ctx, entry, lang)}</article>`;
}
function renderReader(ctx, chapterId) {
  const lang = contentLang(ctx);
  const l = (v) => pick(v, lang);
  const position = readingPosition(ctx.role);
  const toc = `<nav class="compendium-toc" aria-label="${attr(ctx, ctx.t("Indice", "Table of contents"))}"><h3>${ctx.t("Indice", "Contents")}</h3><ol>${data.READER_CHAPTERS.map((chapter, index) => `<li><button type="button" class="compendium-toc-chapter ${chapter.id === chapterId ? "current" : ""}" data-reader-chapter="${chapter.id}" ${chapter.id === chapterId ? 'aria-current="page"' : ""}>${index + 1}. ${esc(ctx, l(chapter.title))}</button>${chapter.id === chapterId ? `<ol class="compendium-toc-sections">${chapter.entries.map((id) => `<li><button type="button" class="compendium-toc-section" data-reader-jump="${attr(ctx, id)}">${esc(ctx, l(data.getEntry(id).name))}</button></li>`).join("")}</ol>` : ""}</li>`).join("")}</ol></nav>`;
  if (!chapterId) {
    const resume = position ? data.readerChapter(position.chapterId) : null;
    return `${subnav(ctx, "reader")}<div class="compendium-reader"><aside class="compendium-reader-side">${toc}${bookmarksPanel(ctx)}</aside><section class="compendium-reader-main" data-content-lang="${lang}"><h2>${ctx.t("Regole: glossario 2024", "Rules: 2024 glossary")}</h2><p>${ctx.t("Il glossario delle regole SRD 5.2.1 in capitoli ordinati dall’app. Ogni sezione cita la sua pagina EN e IT.", "The SRD 5.2.1 rules glossary in chapters ordered by the app. Every section cites its EN and IT page.")}</p>${langToggle(ctx)}${resume ? `<div class="compendium-resume"><p>${ctx.t("Riprendi da", "Resume at")} <strong>${esc(ctx, l(data.getEntry(position.sectionId).name))}</strong> · ${esc(ctx, l(resume.title))}</p><button type="button" class="button primary" data-reader-resume>${ctx.t("Riprendi la lettura", "Resume reading")}</button></div>` : ""}<ol class="compendium-chapter-list">${data.READER_CHAPTERS.map((chapter, index) => `<li><button type="button" class="button" data-reader-chapter="${chapter.id}">${index + 1}. ${esc(ctx, l(chapter.title))}</button><span class="muted">${esc(ctx, l(chapter.intro))} · ${chapter.entries.length} ${ctx.t("sezioni", "sections")}</span></li>`).join("")}</ol></section></div>`;
  }
  const chapter = data.readerChapter(chapterId);
  const index = data.READER_CHAPTERS.indexOf(chapter);
  const { previous, next } = data.readerNeighbors(chapterId);
  const sections = chapter.entries
    .map((id) => {
      const entry = data.getEntry(id);
      const marked = bookmarked(ctx, { kind: "reader", chapterId, entryId: id });
      return `<section class="compendium-reader-section" id="reader-${attr(ctx, entry.slug)}" data-reader-section="${attr(ctx, id)}" tabindex="-1"><div class="compendium-reader-section-head"><h3>${esc(ctx, l(entry.heading ?? entry.name))}</h3><button type="button" class="button quiet compendium-mark" data-reader-bookmark="${attr(ctx, id)}" aria-pressed="${marked}" aria-label="${attr(ctx, marked ? ctx.t(`Togli il segnalibro da ${l(entry.name)}`, `Remove bookmark from ${l(entry.name)}`) : ctx.t(`Segnalibro su ${l(entry.name)}`, `Bookmark ${l(entry.name)}`))}">${marked ? ctx.t("Segnalibro ✓", "Bookmarked ✓") : ctx.t("Segnalibro", "Bookmark")}</button></div><p class="compendium-summary">${linked(ctx, l(entry.summary), lang, [entry.id])}</p><p class="compendium-reader-source">SRD ${data.REVISION} · ${esc(ctx, pagesText(ctx, entry))} · <button type="button" class="text-button" data-compendium-go="${attr(ctx, entry.id)}">${ctx.t("Apri voce", "Open entry")}</button></p></section>`;
    })
    .join("");
  // Phones: the contents fold into a disclosure above the text and a compact
  // "chapter · section" bar stays at the top while reading (DDB-159 follows the reading).
  const narrow = globalThis.innerWidth > 0 && globalThis.innerWidth <= 860;
  const tocBox = `<details class="compendium-toc-box" data-toc-box ${narrow ? "" : "open"}><summary>${ctx.t("Indice", "Contents")} · ${index + 1}. ${esc(ctx, l(chapter.title))}</summary>${toc}</details>`;
  return `${subnav(ctx, "reader")}<div class="compendium-reader"><aside class="compendium-reader-side">${tocBox}${bookmarksPanel(ctx)}</aside><article class="compendium-reader-main" lang="${lang}" data-content-lang="${lang}"><p class="compendium-kind">${ctx.t("Capitolo", "Chapter")} ${index + 1} ${ctx.t("di", "of")} ${data.READER_CHAPTERS.length}</p><h2 id="compendium-chapter-title" tabindex="-1">${esc(ctx, l(chapter.title))}</h2><p class="muted">${esc(ctx, l(chapter.intro))} ${ctx.t("(raggruppamento dell’app)", "(app grouping)")}</p><div class="compendium-position-bar"><p class="compendium-position" data-reader-position aria-live="polite"></p><button type="button" class="button quiet compendium-toc-jump" data-reader-toc>${ctx.t("Indice", "Contents")}</button></div>${sections}<nav class="compendium-pager" aria-label="${attr(ctx, ctx.t("Capitoli", "Chapters"))}">${previous ? `<button type="button" class="button" data-reader-chapter="${previous.id}">‹ ${esc(ctx, l(previous.title))}</button>` : "<span></span>"}<button type="button" class="button quiet" data-compendium-go="reader">${ctx.t("Torna all’indice", "Back to contents")}</button>${next ? `<button type="button" class="button" data-reader-chapter="${next.id}">${esc(ctx, l(next.title))} ›</button>` : "<span></span>"}</nav>${sourceFooterShort(ctx, lang)}</article></div><button type="button" class="button compendium-top" data-reader-top>${ctx.t("Torna su", "Back to top")}</button>`;
}
function sourceFooterShort(ctx, lang) {
  return `<footer class="compendium-source" lang="${lang}"><blockquote class="compendium-attribution">${esc(ctx, data.SRD_ATTRIBUTION[lang])}</blockquote><p class="compendium-rules-footer">${ctx.t("Regole", "Rules")} ${data.EDITION} · SRD ${data.REVISION} · <button type="button" class="text-button" data-compendium-go="legal">${ctx.t("Fonti e attribuzione", "Sources and attribution")}</button></p></footer>`;
}
export function renderCompendium(ctx) {
  const view = parseView(ctx.view.revision);
  let body;
  if (view.page === "entry") body = renderEntry(ctx, data.getEntry(view.id));
  else if (view.page === "print") body = renderPrint(ctx, data.getEntry(view.id));
  else if (view.page === "reader") body = renderReader(ctx, view.chapterId);
  else if (view.page === "legal") body = renderLegal(ctx);
  else if (view.page === "class") body = renderClass(ctx, view.classId);
  else if (view.page === "missing")
    body = `${subnav(ctx, "")}<div class="empty-state"><h2>${ctx.t("Voce non trovata", "Entry not found")}</h2><p>${ctx.t("Il collegamento non corrisponde a una voce del compendio.", "The link does not match a compendium entry.")}</p><button type="button" class="button" data-compendium-go="">${ctx.t("Torna al compendio", "Back to the compendium")}</button></div>`;
  else body = renderBrowse(ctx);
  return `<div class="compendium" data-compendium-view="${attr(ctx, view.page)}">${body}</div>`;
}

// ---------------------------------------------------------------- binding

function bindRolls(el, ctx) {
  el.querySelectorAll("[data-compendium-roll]").forEach((button) => {
    button.onclick = () => {
      try {
        openRollDialog(ctx, JSON.parse(button.dataset.compendiumRoll));
      } catch {
        ctx.toast(ctx.t("Questo tiro non è disponibile.", "This roll is unavailable."), true);
      }
    };
  });
  el.querySelectorAll("[data-roll-correct]").forEach(
    (button) =>
      (button.onclick = () => attempt(ctx, () => openCorrectRoll(ctx, button.dataset.rollCorrect))),
  );
  el.querySelectorAll("[data-roll-withdraw]").forEach(
    (button) =>
      (button.onclick = () =>
        attempt(ctx, () => openWithdrawRoll(ctx, button.dataset.rollWithdraw))),
  );
}
function refresh(el, ctx, focusSelector = null) {
  closeTips(0);
  el.innerHTML = renderCompendium(ctx);
  bindCompendium(el, ctx);
  if (focusSelector) {
    const target = el.querySelector(focusSelector);
    if (target) {
      target.focus({ preventScroll: true });
      if (["search", "text"].includes(target.type))
        target.setSelectionRange(target.value.length, target.value.length);
    }
  }
}
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error), true);
    return null;
  }
}
let observer = null;
function trackReading(el, ctx, chapterId) {
  observer?.disconnect?.();
  observer = null;
  const sections = [...el.querySelectorAll("[data-reader-section]")];
  if (!sections.length || typeof globalThis.IntersectionObserver !== "function") return;
  const mark = (id) => {
    el.querySelectorAll("[data-reader-jump]").forEach((b) => {
      const current = b.dataset.readerJump === id;
      b.classList.toggle("current", current);
      if (current) b.setAttribute("aria-current", "location");
      else b.removeAttribute("aria-current");
    });
    const entry = data.getEntry(id);
    const line = el.querySelector("[data-reader-position]");
    const chapter = data.readerChapter(chapterId);
    const where = `${data.READER_CHAPTERS.indexOf(chapter) + 1}. ${pick(chapter?.title, contentLang(ctx))}`;
    if (line && entry)
      line.textContent = ctx.t(
        `${where} · Stai leggendo: ${pick(entry.name, contentLang(ctx))}`,
        `${where} · Now reading: ${pick(entry.name, contentLang(ctx))}`,
      );
    saveReadingPosition(ctx.role, chapterId, id);
  };
  const visible = new Map();
  observer = new IntersectionObserver(
    (records) => {
      for (const r of records)
        visible.set(
          r.target.dataset.readerSection,
          r.isIntersecting ? r.boundingClientRect.top : null,
        );
      const first = sections
        .map((s) => s.dataset.readerSection)
        .find((id) => visible.get(id) != null);
      if (first) mark(first);
    },
    { rootMargin: "-15% 0px -55% 0px" },
  );
  sections.forEach((s) => observer.observe(s));
  // A bookmark or "Resume" jumps to its section; the chapter buttons and pager open a
  // chapter at its top; any other arrival (reload, Back, a link, returning from an entry)
  // restores the saved position of that chapter; a re-render of the same chapter (a
  // bookmark commit) keeps the reader where it was.
  const saved = readingPosition(ctx.role);
  const fresh = readerState.chapter !== chapterId || readerState.role !== ctx.role;
  let jump = pendingSection;
  pendingSection = null;
  if (!jump && fresh && saved?.chapterId === chapterId) jump = saved.sectionId;
  readerState.chapter = chapterId;
  readerState.role = ctx.role;
  const target =
    jump && jump !== TOP ? sections.find((s) => s.dataset.readerSection === jump) : null;
  if (target) {
    mark(jump);
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
      target.focus({ preventScroll: true });
    });
  } else if (fresh || jump === TOP) {
    mark(sections[0].dataset.readerSection);
    requestAnimationFrame(() => globalThis.scrollTo?.(0, 0));
  }
}
const TOP = Symbol("top");
const readerState = { chapter: null, role: null };
export function bindCompendium(el, ctx) {
  const view = parseView(ctx.view.revision);
  const u = uiState(ctx);
  hostTips(el, ctx);
  bindRolls(el, ctx);
  // X-07: a row dragged to the Table map (creatures) or onto a sheet (items and spells).
  el.querySelectorAll("[data-compendium-drag]").forEach((row) =>
    row.addEventListener("dragstart", (event) => {
      const entry = data.getEntry(row.dataset.compendiumDrag);
      if (!entry || !event.dataTransfer) return;
      for (const [type, value] of Object.entries(dragPayload(entry)))
        event.dataTransfer.setData(type, value);
      event.dataTransfer.effectAllowed = "copy";
    }),
  );
  const on = (selector, handler) =>
    el
      .querySelectorAll(selector)
      .forEach((node) => (node.onclick = (event) => handler(node, event)));
  on("[data-compendium-go]", (node) => {
    status = null;
    go(ctx, node.dataset.compendiumGo);
  });
  // DDB «Add» on a result card while choosing for a sheet: no detour through the entry page.
  on("[data-compendium-add]", (node) =>
    attempt(ctx, () => openAddToSheet(ctx, data.getEntry(node.dataset.compendiumAdd))),
  );
  on("[data-embed-table]", () =>
    attempt(ctx, () => openEmbed(ctx, null, { returnTo: { page: "library", tab: ID } })),
  );
  on("[data-compendium-category]", (node) => {
    if (node.dataset.compendiumCategory) {
      u.category = node.dataset.compendiumCategory;
      saveUi(ctx);
    }
    go(ctx, "");
  });
  on("[data-compendium-back]", () => {
    const entry = data.getEntry(view.id);
    if (entry && data.categoryOf(entry)) u.category = data.categoryOf(entry);
    saveUi(ctx);
    go(ctx, "");
  });
  on("[data-compendium-return]", () => {
    try {
      const target = JSON.parse(ctx.view.returnTo);
      if (target.page === "characters")
        ctx.navigate("characters", { id: target.actorId, tab: target.tab || "actions" });
      else if (target.page === "builder")
        ctx.navigate("builder", { id: target.draftId, tab: target.section });
    } catch {
      ctx.navigate("library", { tab: ID });
    }
  });
  on("[data-content-lang-set]", (node) => {
    u.contentLang = node.dataset.contentLangSet;
    saveUi(ctx);
    refresh(el, ctx, `[data-content-lang-set="${node.dataset.contentLangSet}"]`);
  });
  // Browser
  const chooseCategory = (id) => {
    u.category = id;
    u.expanded = null;
    saveUi(ctx);
    refresh(el, ctx, `[data-category="${id}"]`);
  };
  on("[data-category]", (node) => chooseCategory(node.dataset.category));
  // WAI-ARIA tabs with automatic activation: arrows, Home and End move and select.
  el.querySelectorAll("[data-category]").forEach((node) =>
    node.addEventListener("keydown", (event) => {
      const ids = data.CATEGORIES.map((c) => c.id);
      const i = ids.indexOf(node.dataset.category);
      const next =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? ids[(i + 1) % ids.length]
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? ids[(i - 1 + ids.length) % ids.length]
            : event.key === "Home"
              ? ids[0]
              : event.key === "End"
                ? ids.at(-1)
                : null;
      if (!next) return;
      event.preventDefault();
      chooseCategory(next);
    }),
  );
  el.querySelectorAll("[data-facet]").forEach((input) => {
    input.onchange = () => {
      u.filters[u.category] = data.toggleFacetValue(
        u.filters[u.category],
        input.dataset.facet,
        input.value,
      );
      saveUi(ctx);
      refresh(el, ctx, `[data-facet="${input.dataset.facet}"][value="${cssEscape(input.value)}"]`);
    };
  });
  el.querySelectorAll("[data-facet-range]").forEach((select) => {
    select.onchange = () => {
      u.filters[u.category] = data.setRange(
        u.filters[u.category],
        "cr",
        select.dataset.facetRange,
        select.value,
      );
      saveUi(ctx);
      refresh(el, ctx, `[data-facet-range="${select.dataset.facetRange}"]`);
    };
  });
  // After removing a chip, focus stays in the chip row (the chip now in that place), or
  // moves to the result count when no chip is left.
  const focusChipAt = (index) => {
    const chips = [...el.querySelectorAll(".compendium-chip")];
    (chips[Math.min(index, chips.length - 1)] ?? el.querySelector("[data-result-count]"))?.focus?.({
      preventScroll: true,
    });
  };
  on("[data-chip-facet]", (node) => {
    const index = [...el.querySelectorAll(".compendium-chip")].indexOf(node);
    u.filters[u.category] = data.removeChip(
      u.category,
      u.filters[u.category],
      node.dataset.chipFacet,
      node.dataset.chipValue,
    );
    saveUi(ctx);
    refresh(el, ctx, "[data-result-count]");
    focusChipAt(Math.max(0, index));
  });
  on("[data-chip-query]", () => {
    u.filters[u.category] = { ...u.filters[u.category], q: "" };
    saveUi(ctx);
    refresh(el, ctx, "[data-compendium-query]");
  });
  on("[data-chips-clear]", () => {
    u.filters[u.category] = data.emptyFilter();
    saveUi(ctx);
    refresh(el, ctx, "[data-compendium-query]");
  });
  const query = el.querySelector("[data-compendium-query]");
  if (query) {
    let timer = null;
    query.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        u.filters[u.category] = { ...u.filters[u.category], q: query.value };
        saveUi(ctx);
        refresh(el, ctx, "[data-compendium-query]");
      }, 180);
    };
    el.querySelector("[data-compendium-search]").onsubmit = (event) => {
      event.preventDefault();
      clearTimeout(timer);
      u.filters[u.category] = { ...u.filters[u.category], q: query.value };
      saveUi(ctx);
      refresh(el, ctx, "[data-result-count]");
    };
  }
  el.querySelectorAll("[data-facet-group]").forEach((group) =>
    group.addEventListener("toggle", () => {
      u.openFacets[group.dataset.facetGroup] = group.open;
      saveUi(ctx);
    }),
  );
  el.querySelector("[data-filter-box]")?.addEventListener("toggle", (event) => {
    u.filtersOpen = event.target.open;
    saveUi(ctx);
  });
  on("[data-row-toggle]", (node) => {
    // BI-09 (dnd5e Class Summary): a class row opens its full page in one click.
    if (node.dataset.rowOpens) {
      status = null;
      return go(ctx, node.dataset.rowOpens);
    }
    u.expanded = u.expanded === node.dataset.rowToggle ? null : node.dataset.rowToggle;
    saveUi(ctx);
    refresh(el, ctx, `[data-row-toggle="${cssEscape(node.dataset.rowToggle)}"]`);
  });
  // Bookmarks
  const findBookmark = (id) =>
    (slice(ctx.state).bookmarks[ctx.role] ?? []).find((b) => b.id === id);
  on("[data-bookmark-open]", (node) => {
    const b = findBookmark(node.dataset.bookmarkOpen);
    if (b) openBookmark(ctx, b);
  });
  on("[data-bookmark-rename]", (node) => {
    const b = findBookmark(node.dataset.bookmarkRename);
    if (b) renameBookmark(ctx, b);
  });
  on("[data-bookmark-remove]", (node) => {
    const b = findBookmark(node.dataset.bookmarkRemove);
    if (b)
      attempt(ctx, () => {
        toggleBookmark(ctx, b.target);
        status = { text: L("Segnalibro rimosso.", "Bookmark removed."), undo: true };
        ctx.render();
      });
  });
  // Status line
  on("[data-status-close]", () => {
    status = null;
    refresh(el, ctx);
  });
  on("[data-status-sheet]", () => {
    const s = status?.sheet;
    status = null;
    if (s) ctx.navigate("characters", { id: s.id, tab: s.tab });
  });
  on("[data-status-table]", () => {
    status = null;
    ctx.navigate("table");
  });
  on("[data-status-prep]", () => {
    const s = status?.scene;
    status = null;
    ctx.navigate("preparation", { id: s.id });
  });
  on("[data-status-undo]", () => {
    status = null;
    ctx.undo();
  });
  // Entry commands
  const entry = view.page === "entry" || view.page === "print" ? data.getEntry(view.id) : null;
  on("[data-cmd]", (node) => {
    if (!entry) return;
    const cmd = node.dataset.cmd;
    attempt(ctx, () => {
      if (cmd === "sheet") openAddToSheet(ctx, entry);
      else if (cmd === "scene") openAddToScene(ctx, entry);
      else if (cmd === "apply") openApplyCondition(ctx, entry);
      else if (cmd === "embed") openEmbed(ctx, entry);
      else if (cmd === "copy") openCopy(ctx, startLibraryCopy(ctx, entry));
      else if (cmd === "forge") {
        // BI-24: the Forge is one click from a weapon or armor page (FG Forge, dnd5e Enchant).
        const forge = ctx.registry?.get?.("command", "homebrew-editor.forge", ctx);
        if (forge) ctx.registry.run(forge, ctx, { baseId: entry.id });
      } else if (cmd === "pin") {
        pinToScreen(ctx, entry.id);
        status = {
          text: L(
            `${entry.name.it} è nello schermo del DM.`,
            `${entry.name.en} is on the DM screen.`,
          ),
          screen: true,
          undo: true,
        };
        ctx.render();
      } else if (cmd === "bookmark") toggleBookmark(ctx, { kind: "entry", entryId: entry.id });
      else if (cmd === "print") go(ctx, `print:${entry.id}`);
      else if (cmd === "print-now") globalThis.print?.();
      else if (cmd === "reader") {
        const chapter = data.chapterOfEntry(entry.id);
        pendingSection = entry.id;
        go(ctx, `reader:${chapter.id}`);
      } else if (cmd === "speak") speak(ctx, entry, contentLang(ctx));
    });
  });
  // Class page
  on("[data-spell-group]", (node) => {
    u.spellGroup = node.dataset.spellGroup;
    saveUi(ctx);
    refresh(el, ctx, `[data-spell-group="${node.dataset.spellGroup}"]`);
  });
  // Reader
  on("[data-reader-chapter]", (node) => {
    pendingSection = TOP;
    go(ctx, `reader:${node.dataset.readerChapter}`);
  });
  on("[data-reader-resume]", () => {
    const position = readingPosition(ctx.role);
    if (!position) return;
    pendingSection = position.sectionId;
    go(ctx, `reader:${position.chapterId}`);
  });
  on("[data-reader-jump]", (node) => {
    const target = el.querySelector(
      `[data-reader-section="${cssEscape(node.dataset.readerJump)}"]`,
    );
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  });
  on("[data-reader-bookmark]", (node) => {
    attempt(ctx, () => {
      pendingSection = node.dataset.readerBookmark;
      toggleBookmark(ctx, {
        kind: "reader",
        chapterId: view.chapterId,
        entryId: node.dataset.readerBookmark,
      });
    });
  });
  on("[data-reader-toc]", () => {
    const box = el.querySelector("[data-toc-box]");
    if (!box) return;
    box.open = true;
    box.scrollIntoView?.({ block: "start" });
    box.querySelector("summary")?.focus?.({ preventScroll: true });
  });
  on("[data-reader-top]", () => {
    globalThis.scrollTo?.({ top: 0, behavior: "smooth" });
    el.querySelector("#compendium-chapter-title, .compendium-subnav button")?.focus({
      preventScroll: true,
    });
  });
  if (view.page === "reader" && view.chapterId) trackReading(el, ctx, view.chapterId);
  else {
    readerState.chapter = null;
    observer?.disconnect?.();
    observer = null;
  }
}

// ---------------------------------------------------------------- DM screen (Table drawer)

const CELL_KINDS = {
  conditions: L("Condizioni", "Conditions"),
  actions: L("Azioni", "Actions"),
  combat: L("Regole di combattimento", "Combat rules"),
  xp: L("PE per grado di sfida", "XP by challenge rating"),
  coins: L("Monete", "Coins"),
  entry: L("Voce del compendio", "Compendium entry"),
};
const COMBAT_RULES = [
  "cover",
  "concentration",
  "opportunity-attacks",
  "critical-hit",
  "surprise",
  "difficult-terrain",
  "bonus-action",
  "reaction",
].map((s) => `srd2024:rule:${s}`);
const DEFAULT_CELLS = () => [
  { id: "cell-conditions", kind: "conditions", wide: false },
  { id: "cell-actions", kind: "actions", wide: false },
  { id: "cell-combat", kind: "combat", wide: false },
];
function validCell(cell) {
  return (
    cell &&
    typeof cell.id === "string" &&
    Object.hasOwn(CELL_KINDS, cell.kind) &&
    (cell.kind !== "entry" || !!data.getEntry(cell.entryId))
  );
}
export function pinToScreen(ctx, entryId, { focus = false } = {}) {
  if (ctx.role !== "dm")
    throw Object.assign(new Error("dm"), {
      it: "Lo schermo è del DM.",
      en: "The screen belongs to the DM.",
    });
  if (!data.getEntry(entryId)) throw new Error("Unknown entry");
  const cells = slice(ctx.state).screens?.dm?.cells ?? [];
  if (cells.some((c) => c.kind === "entry" && c.entryId === entryId))
    throw Object.assign(new Error("dup"), {
      it: "Questa voce è già nello schermo.",
      en: "This entry is already on the screen.",
    });
  const id = uid();
  screenCommit(
    ctx,
    ctx.t("Schermo del DM: voce fissata", "DM screen: entry pinned"),
    (cells) => cells.push({ id, kind: "entry", entryId, wide: false }),
    focus ? { cell: id, tool: "title" } : null,
  );
}
function cellTitle(ctx, cell) {
  return cell.kind === "entry"
    ? pick(data.getEntry(cell.entryId).name, ctx.lang)
    : pick(CELL_KINDS[cell.kind], ctx.lang);
}
// SRD reference tables: the DM screen panels and their journal embeds use the same markup.
function referenceTableHTML(ctx, id, lang = ctx.lang) {
  const l = (v) => pick(v, lang);
  const t = (it, en) => (lang === "it" ? it : en);
  const table = data.referenceTable(id);
  if (!table) return "";
  const source = `<p class="muted">SRD ${data.REVISION} · ${t("p.", "p.")} ${table.source.en.pages.join(", ")} EN / ${table.source.it.pages.join(", ")} IT</p>`;
  if (id === "srd2024:table:xp-by-cr")
    return `<div class="table-wrap compendium-scroll-table"><table class="screen-table"><caption class="compendium-sr">${esc(ctx, l(table.name))}</caption><thead><tr><th scope="col">${t("GS", "CR")}</th><th scope="col">${t("PE", "XP")}</th><th scope="col">${t("BC", "PB")}</th></tr></thead><tbody>${srd.XP_BY_CR.map(
      (r) =>
        `<tr><td>${r.cr}</td><td>${r.xp.toLocaleString(lang === "it" ? "it-IT" : "en-GB")}${r.xpAlternatives ? ` ${t("o", "or")} 0` : ""}</td><td>+${r.proficiencyBonus}</td></tr>`,
    ).join("")}</tbody></table></div>${source}`;
  return `<div class="table-wrap"><table class="screen-table"><caption class="compendium-sr">${esc(ctx, l(table.name))}</caption><thead><tr><th scope="col">${t("Moneta", "Coin")}</th><th scope="col">${t("Valore in mo", "Value in GP")}</th></tr></thead><tbody>${srd.COINS.map((c) => `<tr><td>${esc(ctx, l(c.name))} (${esc(ctx, l(c.abbreviation))})</td><td>${esc(ctx, c.gpValue)}</td></tr>`).join("")}</tbody></table></div>${source}`;
}
const REFERENCE_CELLS = { xp: "srd2024:table:xp-by-cr", coins: "srd2024:table:coins" };
function cellBody(ctx, cell) {
  const lang = ctx.lang;
  const l = (v) => pick(v, lang);
  if (cell.kind === "conditions")
    return `<ul class="screen-terms">${srd.CONDITION_INDEX.map((c) => `<li>${termButton(ctx, { term: c.id, text: l(c.name) })}</li>`).join("")}</ul><p class="muted">${ctx.t("Apri una condizione per leggerla o applicarla alla creatura selezionata.", "Open a condition to read it or apply it to the selected creature.")}</p>`;
  if (cell.kind === "actions" || cell.kind === "combat") {
    const ids = cell.kind === "actions" ? data.readerChapter("actions").entries : COMBAT_RULES;
    return `<dl class="screen-rules">${ids
      .map((id) => {
        const e = data.getEntry(id);
        return `<div><dt>${termButton(ctx, { term: id, text: l(e.name) })}</dt><dd>${linked(ctx, l(e.summary), lang, [id])}</dd></div>`;
      })
      .join("")}</dl>`;
  }
  if (REFERENCE_CELLS[cell.kind])
    return `${referenceTableHTML(ctx, REFERENCE_CELLS[cell.kind])}<button type="button" class="button quiet" data-cell-embed="${attr(ctx, REFERENCE_CELLS[cell.kind])}">${ctx.t("Incorpora nel diario…", "Embed in the journal…")}</button>`;
  const entry = data.getEntry(cell.entryId);
  const place =
    entry.kind === "creature" && ctx.role === "dm"
      ? `<button type="button" class="button" data-cell-place="${attr(ctx, entry.id)}">${ctx.icon("plus")} ${ctx.t("Posiziona sulla mappa…", "Place on the map…")}</button>`
      : "";
  return `<div data-content-lang="${lang}">${place}${entryBody(ctx, entry, lang, { interactive: true, heading: "h4" })}<p class="compendium-reader-source">SRD ${data.REVISION} · ${esc(ctx, pagesText(ctx, entry))}</p></div>`;
}
export function renderScreen(ctx) {
  const cells = (slice(ctx.state).screens?.dm?.cells ?? []).filter(validCell);
  const last = ctx.undoLabel?.() ?? "";
  const canUndoScreen = ctx.canUndo?.() && /Schermo del DM|DM screen/.test(last);
  return `<div class="compendium-screen" data-content-lang="${ctx.lang}"><div class="compendium-screen-bar"><p class="muted">${ctx.t("Visibile solo a te. La scena resta aperta sotto.", "Visible only to you. The scene stays open below.")}</p><div class="toolbar"><button type="button" class="button" data-screen-add>${ctx.icon("plus")} ${ctx.t("Aggiungi riquadro…", "Add panel…")}</button>${canUndoScreen ? `<button type="button" class="button quiet" data-screen-undo>${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}: ${esc(ctx, last)}</button>` : ""}</div></div>${cells.length ? `<div class="compendium-screen-grid">${cells.map((cell, index) => `<section class="compendium-screen-cell ${cell.wide ? "wide" : ""}" aria-labelledby="screen-cell-${attr(ctx, cell.id)}" data-screen-cell="${attr(ctx, cell.id)}"><header><h3 id="screen-cell-${attr(ctx, cell.id)}" tabindex="-1">${esc(ctx, cellTitle(ctx, cell))}</h3><div class="compendium-cell-tools"><button type="button" class="icon-button" data-cell-move="-1" data-cell="${attr(ctx, cell.id)}" ${index === 0 ? `disabled aria-describedby="screen-move-first-why" title="${attr(ctx, ctx.t("È già il primo riquadro", "It is already the first panel"))}"` : ""} aria-label="${attr(ctx, ctx.t(`Sposta prima: ${cellTitle(ctx, cell)}`, `Move earlier: ${cellTitle(ctx, cell)}`))}">‹</button><button type="button" class="icon-button" data-cell-move="1" data-cell="${attr(ctx, cell.id)}" ${index === cells.length - 1 ? `disabled aria-describedby="screen-move-last-why" title="${attr(ctx, ctx.t("È già l’ultimo riquadro", "It is already the last panel"))}"` : ""} aria-label="${attr(ctx, ctx.t(`Sposta dopo: ${cellTitle(ctx, cell)}`, `Move later: ${cellTitle(ctx, cell)}`))}">›</button><button type="button" class="icon-button" data-cell-wide data-cell="${attr(ctx, cell.id)}" aria-pressed="${!!cell.wide}" aria-label="${attr(ctx, ctx.t(`Larghezza doppia: ${cellTitle(ctx, cell)}`, `Double width: ${cellTitle(ctx, cell)}`))}">⤢</button><button type="button" class="icon-button" data-cell-remove data-cell="${attr(ctx, cell.id)}" aria-label="${attr(ctx, ctx.t(`Rimuovi: ${cellTitle(ctx, cell)}`, `Remove: ${cellTitle(ctx, cell)}`))}">${ctx.icon("close")}</button></div></header><div class="compendium-cell-body">${cellBody(ctx, cell)}</div></section>`).join("")}</div><span class="visually-hidden" id="screen-move-first-why">${ctx.t("È già il primo riquadro: sposta gli altri dopo di lui.", "It is already the first panel: move the others after it.")}</span><span class="visually-hidden" id="screen-move-last-why">${ctx.t("È già l’ultimo riquadro: sposta gli altri prima di lui.", "It is already the last panel: move the others before it.")}</span>` : `<div class="empty-state"><p>${ctx.t("Lo schermo è vuoto. Aggiungi un riquadro con condizioni, azioni, tabelle o un blocco statistiche.", "The screen is empty. Add a panel with conditions, actions, tables or a stat block.")}</p></div>`}</div>`;
}
// Entries a panel can hold, from every category (the 5e.tools / Foundry screen picker
// searches the whole compendium, CMP-181, FVT-106).
const PINNABLE = ["creatures", "spells", "items", "rules", "conditions"];
function openAddCell(ctx) {
  const groups = PINNABLE.map((id) => data.CATEGORIES.find((c) => c.id === id)).filter(Boolean);
  const options = groups
    .map((category) => {
      const entries = data
        .categoryEntries(category.id)
        .slice()
        .sort((a, b) => pick(a.name, ctx.lang).localeCompare(pick(b.name, ctx.lang), ctx.lang));
      return `<optgroup label="${attr(ctx, pick(category.label, ctx.lang))}">${entries.map((e) => `<option value="${attr(ctx, e.id)}" data-search="${attr(ctx, `${e.name.it} ${e.name.en}`.toLowerCase())}">${esc(ctx, pick(e.name, ctx.lang))}${e.kind === "creature" ? ` · ${ctx.t("GS", "CR")} ${esc(ctx, e.cr)}` : ""}</option>`).join("")}</optgroup>`;
    })
    .join("");
  ctx.dialog(
    ctx.t("Aggiungi riquadro", "Add panel"),
    `<label class="field">${ctx.t("Contenuto", "Content")}<select name="kind" data-cell-kind>${Object.entries(
      CELL_KINDS,
    )
      .map(([id, label]) => `<option value="${id}">${esc(ctx, pick(label, ctx.lang))}</option>`)
      .join(
        "",
      )}</select></label><div data-cell-entry hidden><label class="field">${ctx.t("Cerca una voce (IT o EN)", "Search an entry (IT or EN)")}<input type="search" data-cell-search autocomplete="off"></label><label class="field">${ctx.t("Voce", "Entry")}<select name="entry" data-cell-entry-select>${options}</select></label></div>`,
    {
      submitLabel: ctx.t("Aggiungi", "Add"),
      onSubmit: (form) => {
        const kind = String(form.get("kind"));
        if (kind === "entry") {
          pinToScreen(ctx, String(form.get("entry")), { focus: true });
          return;
        }
        const cells = slice(ctx.state).screens.dm.cells;
        if (cells.some((c) => c.kind === kind))
          throw Object.assign(new Error("dup"), {
            it: "Questo riquadro è già nello schermo.",
            en: "This panel is already on the screen.",
          });
        const id = uid();
        screenCommit(
          ctx,
          ctx.t("Schermo del DM: riquadro aggiunto", "DM screen: panel added"),
          (list) => list.push({ id, kind, wide: false }),
          { cell: id, tool: "title" },
        );
      },
    },
  );
  // The entry picker belongs to "Compendium entry" only; its search filters every category.
  const dialog = globalThis.document?.querySelector("#dialog");
  const kind = dialog?.querySelector("[data-cell-kind]");
  if (!kind) return;
  const box = dialog.querySelector("[data-cell-entry]");
  const select = dialog.querySelector("[data-cell-entry-select]");
  kind.addEventListener("change", () => (box.hidden = kind.value !== "entry"));
  dialog.querySelector("[data-cell-search]")?.addEventListener("input", (event) => {
    const needle = event.target.value.trim().toLowerCase();
    let first = null;
    for (const option of select.querySelectorAll("option")) {
      const match = !needle || option.dataset.search.includes(needle);
      option.hidden = !match;
      option.disabled = !match;
      if (match && !first) first = option;
    }
    if (first && select.selectedOptions[0]?.disabled) first.selected = true;
  });
}
// A screen command keeps keyboard focus on the same tool of the same panel after the drawer
// re-renders (or on the neighbour's title when the panel left).
function screenCommit(ctx, label, mutate, focus = null) {
  screenFocus = focus;
  try {
    ctx.commit(label, (draft) => mutate(slice(draft).screens.dm.cells), privateLocal);
  } catch (error) {
    screenFocus = null;
    throw error;
  }
}
function restoreScreenFocus(el) {
  const want = screenFocus;
  screenFocus = null;
  if (!want?.cell || !el?.querySelector) return;
  const cell = () => `[data-cell="${cssEscape(want.cell)}"]`;
  const selectors =
    {
      "move-1": [`[data-cell-move="-1"]${cell()}:not([disabled])`, `[data-cell-move="1"]${cell()}`],
      move1: [`[data-cell-move="1"]${cell()}:not([disabled])`, `[data-cell-move="-1"]${cell()}`],
      wide: [`[data-cell-wide]${cell()}`],
      title: [],
    }[want.tool] ?? [];
  for (const selector of [...selectors, `#screen-cell-${cssEscape(want.cell)}`]) {
    const target = el.querySelector(selector);
    if (target) return target.focus?.({ preventScroll: false });
  }
  el.querySelector("[data-screen-add]")?.focus?.();
}
function bindScreen(el, ctx, table) {
  hostTips(el, ctx, { applyActorId: () => table?.selectedActorId ?? null });
  bindRolls(el, ctx);
  const run = (fn) => attempt(ctx, fn);
  el.querySelector("[data-screen-add]")?.addEventListener("click", () =>
    run(() => openAddCell(ctx)),
  );
  el.querySelector("[data-screen-undo]")?.addEventListener("click", () => ctx.undo());
  el.querySelectorAll("[data-cell-move]").forEach(
    (b) =>
      (b.onclick = () =>
        run(() =>
          screenCommit(
            ctx,
            ctx.t("Schermo del DM: riquadro spostato", "DM screen: panel moved"),
            (list) => {
              const i = list.findIndex((c) => c.id === b.dataset.cell);
              const j = i + Number(b.dataset.cellMove);
              if (i < 0 || j < 0 || j >= list.length) throw new Error("Cannot move");
              [list[i], list[j]] = [list[j], list[i]];
            },
            { cell: b.dataset.cell, tool: `move${b.dataset.cellMove}` },
          ),
        )),
  );
  el.querySelectorAll("[data-cell-wide]").forEach(
    (b) =>
      (b.onclick = () =>
        run(() =>
          screenCommit(
            ctx,
            ctx.t("Schermo del DM: larghezza cambiata", "DM screen: width changed"),
            (list) => {
              const cell = list.find((c) => c.id === b.dataset.cell);
              cell.wide = !cell.wide;
            },
            { cell: b.dataset.cell, tool: "wide" },
          ),
        )),
  );
  el.querySelectorAll("[data-cell-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        const cells = slice(ctx.state).screens.dm.cells;
        const i = cells.findIndex((c) => c.id === b.dataset.cell);
        const neighbour = cells[i + 1] ?? cells[i - 1] ?? null;
        run(() =>
          screenCommit(
            ctx,
            ctx.t(
              `Schermo del DM: rimosso ${el.querySelector(`#screen-cell-${cssEscape(b.dataset.cell)}`)?.textContent ?? ""}`,
              `DM screen: removed ${el.querySelector(`#screen-cell-${cssEscape(b.dataset.cell)}`)?.textContent ?? ""}`,
            ),
            (list) => {
              const index = list.findIndex((c) => c.id === b.dataset.cell);
              if (index < 0) throw new Error("Panel unavailable");
              list.splice(index, 1);
            },
            neighbour ? { cell: neighbour.id, tool: "title" } : { cell: "none", tool: "title" },
          ),
        );
      }),
  );
  el.querySelectorAll("[data-cell-place]").forEach(
    (b) =>
      (b.onclick = () => {
        const entry = data.getEntry(b.dataset.cellPlace);
        if (entry) run(() => openAddToScene(ctx, entry, { table }));
      }),
  );
  el.querySelectorAll("[data-cell-embed]").forEach(
    (b) =>
      (b.onclick = () => {
        const reference = data.referenceTable(b.dataset.cellEmbed);
        if (reference) run(() => openEmbed(ctx, reference, { returnTo: { page: "table" } }));
      }),
  );
  el.querySelectorAll("[data-compendium-go]").forEach(
    (b) => (b.onclick = () => go(ctx, b.dataset.compendiumGo, { keepReturn: false })),
  );
  restoreScreenFocus(el);
}

// ---------------------------------------------------------------- embeds

function renderEmbed(ctx, entry) {
  const lang = ctx.lang;
  return `<figure class="compendium-embed" data-content-lang="${lang}"><figcaption><span class="compendium-kind">${esc(ctx, pick(data.kindLabel(entry), ctx.lang))} · ${ctx.t("Regole", "Rules")} ${data.EDITION}</span>${entry.kind === "creature" ? "" : `<strong>${esc(ctx, pick(entry.name, lang))}</strong>`}</figcaption>${entryBody(ctx, entry, lang, { interactive: true, heading: "h3" })}<p class="compendium-embed-cite">SRD ${data.REVISION} · ${esc(ctx, pagesText(ctx, entry))} · <button type="button" class="text-button" data-compendium-go="${attr(ctx, entry.id)}">${ctx.t("Apri nel compendio", "Open in the compendium")}</button></p></figure>`;
}

// Tables in authored text (FVT-175 embeds rollable tables): the SRD reference tables and
// the campaign's random tables, with the random tables area's own draw (its physical or
// digital dice and history) one click away. A table this viewer may not use shows only a
// neutral notice, never its rows.
const tableRef = (ref) => /^table:[A-Za-z0-9._-]{1,120}$/.test(String(ref ?? ""));
function randomTableRows(ctx, table, lang) {
  let next = 1;
  const variables = Array.isArray(table.variables) ? table.variables : [];
  return (Array.isArray(table.results) ? table.results : [])
    .map((result) => {
      const weight = Number.isInteger(result.weight) && result.weight > 0 ? result.weight : 1;
      const from = next;
      next += weight;
      const to = next - 1;
      const only = Object.entries(result.values ?? {})
        .map(([key, value]) =>
          pick(
            variables.find((v) => v.id === key)?.options?.find((o) => o.value === value)?.label ??
              value,
            lang,
          ),
        )
        .filter(Boolean);
      const sub = result.subtableId
        ? randomTables(ctx.state).find((t) => t.id === result.subtableId)
        : null;
      const cells = Object.values(result.cells ?? {})
        .map((cell) => pick(cell, lang))
        .filter(Boolean);
      return `<tr><td>${from === to ? from : `${from}–${to}`}</td><td>${esc(ctx, pick(result.text, lang))}${cells.length ? ` · ${esc(ctx, cells.join(" · "))}` : ""}${sub ? ` → ${esc(ctx, pick(sub.name, lang))}` : ""}${only.length ? ` <span class="muted">(${ctx.t("solo", "only")}: ${esc(ctx, only.join(", "))})</span>` : ""}</td></tr>`;
    })
    .join("");
}
function renderTableEmbed(ctx, ref) {
  const lang = ctx.lang;
  const reference = data.referenceTable(ref);
  if (reference)
    return `<figure class="compendium-embed" data-content-lang="${lang}"><figcaption><span class="compendium-kind">${ctx.t("Tabella SRD", "SRD table")} · ${ctx.t("Regole", "Rules")} ${data.EDITION}</span><strong>${esc(ctx, pick(reference.name, lang))}</strong></figcaption>${referenceTableHTML(ctx, ref, lang)}</figure>`;
  if (!tableRef(ref)) return null;
  const table = randomTables(ctx.state).find((t) => t.id === ref.slice(6));
  if (!table) return null;
  if (ctx.role !== "dm" && !table.playersCanUse)
    return `<p class="muted compendium-embed-hidden">${ctx.t("Tabella casuale riservata al DM.", "Random table reserved to the DM.")}</p>`;
  const canDraw = Boolean(ctx.registry?.get?.("table-panel", RANDOM_TABLES));
  return `<figure class="compendium-embed" data-content-lang="${lang}"><figcaption><span class="compendium-kind">${ctx.t("Tabella casuale", "Random table")} · d${esc(ctx, table.sides)}</span><strong>${esc(ctx, pick(table.name, lang))}</strong></figcaption><div class="table-wrap"><table class="screen-table"><thead><tr><th scope="col">d${esc(ctx, table.sides)}</th><th scope="col">${ctx.t("Risultato", "Result")}</th></tr></thead><tbody>${randomTableRows(ctx, table, lang)}</tbody></table></div>${canDraw || simpleTable(table) ? `<p><button type="button" class="compendium-roll" data-embed-draw="${attr(ctx, table.id)}">${ctx.icon("dice")}<span>${ctx.t("Tira sulla tabella", "Roll on the table")}</span></button></p>` : ""}${lastRoll(ctx, `table:${table.id}`)}<p class="compendium-embed-cite">${simpleTable(table) ? ctx.t("Tabella della campagna: il tiro avviene qui e va nel registro.", "Campaign table: the roll happens here and goes to the log.") : ctx.t("Tabella della campagna (Tabelle e mazzi): senza reinserimento o con variabili si estrae nel suo pannello, con la sua cronologia.", "Campaign table (Tables and decks): without replacement or with variables it is drawn in its own panel, with its history.")}</p></figure>`;
}
// BI-10 (dnd5e @Embed tables rolled in place): a simple table (rows put back, no
// variables) is drawn inside the note: the die, the row and any simple subtable land in the
// log and under the table. A table without replacement or with variables keeps the random
// tables area's own draw, which tracks drawn rows and variables.
const simpleTable = (table) =>
  Boolean(table) &&
  table.replacement !== false &&
  !(Array.isArray(table.variables) && table.variables.length) &&
  [4, 6, 8, 10, 12, 20, 100].includes(Number(table.sides));
function tableRow(table, face) {
  let next = 1;
  for (const result of Array.isArray(table.results) ? table.results : []) {
    const weight = Number.isInteger(result.weight) && result.weight > 0 ? result.weight : 1;
    if (face >= next && face < next + weight) return result;
    next += weight;
  }
  return null;
}
export function drawTableInPlace(ctx, tableId, { faces = null } = {}) {
  const tables = randomTables(ctx.state);
  const chain = [];
  let table = tables.find((t) => t.id === tableId);
  if (ctx.role !== "dm" && !table?.playersCanUse)
    throw Object.assign(new Error("table"), {
      it: "Tabella riservata al DM.",
      en: "Table reserved to the DM.",
    });
  for (let depth = 0; simpleTable(table) && depth < 4; depth++) {
    const face = faces?.[depth] ?? rollDie(Number(table.sides));
    const row = tableRow(table, face);
    chain.push({ table, face, row });
    const sub = row?.subtableId ? tables.find((t) => t.id === row.subtableId) : null;
    if (!sub || chain.some((c) => c.table.id === sub.id)) break;
    table = sub;
  }
  if (!chain.length)
    throw Object.assign(new Error("table"), {
      it: "Questa tabella si estrae dal suo pannello.",
      en: "This table is drawn from its own panel.",
    });
  const text = (lang) =>
    chain
      .map((c) =>
        c.row ? pick(c.row.text, lang) || "—" : lang === "it" ? "nessuna riga" : "no row",
      )
      .join(" → ");
  const first = chain[0];
  const request = {
    entry: { id: `table:${first.table.id}`, name: structuredClone(first.table.name) },
    kind: "damage",
    rollKind: "table-draw",
    terms: chain.map((c) => ({ dice: `1d${c.table.sides}`, type: null })),
    canCritical: false,
    label: L(
      `Tabella «${pick(first.table.name, "it")}» → ${text("it")}`,
      `Table “${pick(first.table.name, "en")}” → ${text("en")}`,
    ),
  };
  const shared = chain.some((c) => c.table.playersCanUse) || ctx.role !== "dm";
  return recordRoll(ctx, request, {
    mode: faces ? "physical" : "digital",
    faces: chain.map((c) => c.face),
    visibility: shared ? "shared" : "private",
  });
}
function bindTableEmbed(el, ctx) {
  el.querySelectorAll("[data-embed-draw]").forEach(
    (b) =>
      (b.onclick = () => {
        const table = randomTables(ctx.state).find((t) => t.id === b.dataset.embedDraw);
        if (simpleTable(table))
          return attempt(ctx, () => ctx.toast(drawTableInPlace(ctx, table.id).label));
        // The random tables area's own landing for a table (its search result routes):
        // the DM's draw panel in Preparation, the players' Tables tab at the Table.
        ctx.role === "dm"
          ? ctx.navigate("preparation", { tab: RANDOM_TABLES, id: `table:${b.dataset.embedDraw}` })
          : ctx.navigate("table", { tab: `${RANDOM_TABLES}-tables` });
      }),
  );
  bindRolls(el, ctx);
}
// CA-26 (dnd5e [[/damage]], Quest Portal reward buttons): damage and rewards in notes.
const REWARD_UNITS = {
  xp: L("PE", "XP"),
  cp: L("mr", "cp"),
  sp: L("ma", "sp"),
  ep: L("me", "ep"),
  gp: L("mo", "gp"),
  pp: L("mp", "pp"),
};
function renderDamageEmbed(ctx, ref) {
  const d = parseDamageRef(ref);
  const type = d.type ? pick(srd.LABELS.damageType[d.type], ctx.lang).toLowerCase() : "";
  return `<div class="compendium-embed compendium-embed-roll" data-embed-damage="${attr(ctx, ref)}">${rollButton(ctx, { embed: ref }, `${ctx.t("Danni", "Damage")} ${d.dice}${type ? ` ${type}` : ""}`)}${lastRoll(ctx, `embed:${ref}`)}</div>`;
}
function renderRewardEmbed(ctx, ref) {
  const r = parseRewardRef(ref);
  return `<div class="compendium-embed compendium-embed-roll" data-embed-reward-card="${attr(ctx, ref)}"><span>${ctx.t("Ricompensa", "Reward")}: <strong>${r.amount} ${esc(ctx, pick(REWARD_UNITS[r.kind], ctx.lang))}</strong></span>${ctx.role === "dm" ? `<button type="button" class="button" data-embed-reward="${attr(ctx, ref)}">${ctx.t("Assegna al gruppo", "Award to the party")}</button>` : ""}</div>`;
}
// H-06 (Foundry `/award`, C12): «Assegna al gruppo» opens the party award prefilled with
// the reward, so XP and coins reach the sheets. The loot area is optional: without it
// the reward is only recorded in the log, as before.
export function rewardPrefill(ctx, ref) {
  const r = parseRewardRef(ref);
  if (!r) return null;
  return {
    xp: r.kind === "xp" ? r.amount : 0,
    coins: r.kind === "xp" ? {} : { [r.kind]: r.amount },
    reason: ctx.t(
      `Ricompensa: ${r.amount} ${REWARD_UNITS[r.kind].it}`,
      `Reward: ${r.amount} ${REWARD_UNITS[r.kind].en}`,
    ),
  };
}
export async function awardReward(ctx, ref) {
  const r = parseRewardRef(ref);
  if (!r || ctx.role !== "dm") return null;
  const prefill = rewardPrefill(ctx, ref);
  const award = ctx.registry?.get?.("command", "loot-award", ctx);
  let loot = null;
  if (award)
    try {
      loot = await import("./loot.mjs");
    } catch {
      loot = null;
    }
  if (!loot?.openAward) {
    attempt(ctx, () => {
      ctx.commit(
        ctx.t(
          `Ricompensa al gruppo: ${r.amount} ${REWARD_UNITS[r.kind].it}`,
          `Reward to the party: ${r.amount} ${REWARD_UNITS[r.kind].en}`,
        ),
        () => {},
      );
      ctx.toast(
        ctx.t(
          "Ricompensa registrata nel registro: nessun gruppo a cui assegnarla.",
          "Reward recorded in the log: no party to award it to.",
        ),
      );
    });
    return null;
  }
  // C12: the award reads XP, coins and reason from the prefill (loot.openAward).
  loot.openAward(ctx, prefill);
  return prefill;
}
function bindRewardEmbed(el, ctx) {
  el.querySelectorAll("[data-embed-reward]").forEach(
    (b) => (b.onclick = () => awardReward(ctx, b.dataset.embedReward)),
  );
}

// ---------------------------------------------------------------- registration

function normalizeSlice(saved, fromVersion) {
  if (fromVersion > 1) throw new Error("Saved compendium data comes from a newer version");
  const list = (value) =>
    Array.isArray(value) ? value.filter((b) => b && typeof b.id === "string" && b.target) : [];
  const cells = saved?.screens?.dm?.cells;
  return {
    bookmarks: { player: list(saved?.bookmarks?.player), dm: list(saved?.bookmarks?.dm) },
    screens: { dm: { cells: Array.isArray(cells) ? cells.filter(validCell) : DEFAULT_CELLS() } },
  };
}
export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(ID, {
    version: 1,
    seed: () => ({
      bookmarks: { player: [], dm: [] },
      screens: { dm: { cells: DEFAULT_CELLS() } },
    }),
    normalize: normalizeSlice,
  });
  registry.registerStateSlice(ROLLS, {
    version: 1,
    undo: "preserve",
    seed: () => ({ rolls: [] }),
    normalize: (saved, fromVersion) => {
      if (fromVersion > 1) throw new Error("Saved compendium rolls come from a newer version");
      return {
        rolls: Array.isArray(saved?.rolls)
          ? saved.rolls.filter((r) => r && typeof r.id === "string")
          : [],
      };
    },
  });
  registry.registerStyles(new URL("./compendium.css", import.meta.url));
  registry.add("library-section", {
    id: ID,
    label: L("Compendio SRD", "SRD Compendium"),
    description: L(
      "Regole, incantesimi, creature e oggetti SRD 5.2.1 EN/IT",
      "SRD 5.2.1 EN/IT rules, spells, creatures and items",
    ),
    order: 40,
    render: (ctx) => renderCompendium(ctx),
    bind: (el, ctx) => bindCompendium(el, ctx),
  });
  // Final review X-07 (Foundry v13: the compendium browser in the sidebar, dragged onto the
  // canvas or a sheet): the same browser under «Consultazione» at the Table.
  registry.add("table-panel", {
    id: `${ID}-browse`,
    section: "reference",
    label: L("Compendio", "Compendium"),
    placement: "sidebar-tab",
    icon: "book",
    order: 50,
    render: (ctx) => renderCompendium(ctx),
    bind: (el, ctx) => bindCompendium(el, ctx),
  });
  registry.add("table-panel", {
    id: `${ID}-screen`,
    section: "reference",
    label: L("Schermo del DM", "DM screen"),
    roles: ["dm"],
    placement: "sidebar-tab",
    icon: "book",
    order: 60,
    render: (ctx) => renderScreen(ctx),
    bind: (el, ctx, table) => bindScreen(el, ctx, table),
  });
  registry.add("search", {
    id: ID,
    label: L("Compendio SRD", "SRD Compendium"),
    search: (ctx, query) =>
      data.searchEntries(query, ctx.lang).map((entry) => ({
        title: entry.name,
        page: "library",
        params: { tab: ID, revision: entry.kind === "class" ? `class:${entry.classId}` : entry.id },
        excerpt: L(
          `${data.kindLabel(entry).it} · SRD ${data.REVISION}`,
          `${data.kindLabel(entry).en} · SRD ${data.REVISION}`,
        ),
      })),
  });
  registry.add("command", {
    id: `${ID}.open`,
    label: L("Apri il compendio SRD", "Open the SRD compendium"),
    group: "library",
    run: (ctx) => ctx.navigate("library", { tab: ID }),
  });
  registry.add("command", {
    id: `${ID}.reader`,
    label: L("Apri il lettore delle regole", "Open the rules reader"),
    group: "library",
    run: (ctx) => ctx.navigate("library", { tab: ID, revision: "reader" }),
  });
  registry.add("table-tool", placeTool);
  registry.add("table-panel", placePanel);
  registry.add("command", {
    id: `${ID}.embed-table`,
    label: L("Incorpora una tabella nel diario", "Embed a table in the journal"),
    group: "library",
    run: (ctx) => openEmbed(ctx, null, { returnTo: { page: "library", tab: ID } }),
  });
  registry.on("role-changed", () => {
    closeTips(0);
    status = null;
    placement = null;
    screenFocus = null;
  });
  registry.on("reset", () => {
    closeTips(0);
    status = null;
    placement = null;
    screenFocus = null;
  });
  // Last: the journal embed providers, once every registry contribution validated.
  registerTextEmbed({
    id: `${ID}-tables`,
    accepts: (ref) => Boolean(data.referenceTable(ref)) || tableRef(ref),
    render: (ctx, ref) => renderTableEmbed(ctx, ref),
    bind: (el, ctx) => bindTableEmbed(el, ctx),
  });
  registerTextEmbed({
    id: `${ID}-damage`,
    accepts: (ref) => Boolean(parseDamageRef(ref)),
    render: (ctx, ref) => renderDamageEmbed(ctx, ref),
    bind: (el, ctx) => bindRolls(el, ctx),
  });
  registerTextEmbed({
    id: `${ID}-reward`,
    accepts: (ref) => Boolean(parseRewardRef(ref)),
    render: (ctx, ref) => renderRewardEmbed(ctx, ref),
    bind: (el, ctx) => bindRewardEmbed(el, ctx),
  });
  registerTextEmbed({
    id: ID,
    accepts: (ref) => !!data.embedEntry(ref),
    render: (ctx, ref) => renderEmbed(ctx, data.embedEntry(ref)),
    bind: (el, ctx) => {
      hostTips(el, ctx);
      bindRolls(el, ctx);
      el.querySelectorAll("[data-compendium-go]").forEach(
        (b) => (b.onclick = () => go(ctx, b.dataset.compendiumGo, { keepReturn: false })),
      );
    },
  });
}
