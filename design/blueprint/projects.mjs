// B54 entry module — downtime projects, crafting and non-class progression tracks.
//
// Character sheet › "Tempo libero" (Downtime): Crash's Tracking & Training downtime tab with
// items, progression types (fixed value, check with DC and successes), progress bars,
// completion checkmark and a change log the GM can dismiss (FVT-042); steps shown as a
// LegendKeeper fraction meter, segmented, with a smooth bar for the current step (CMP-63)
// and Owlbear Count! checkboxes and tallies (VTL-179). Time comes from the campaign clock the
// DM advances (core Time dialog, OwlClock VTL-056) and is assigned explicitly to a project:
// nothing is consumed automatically. Crafting: Mastercrafted recipe books (FVT-043) and
// Solasta duration/tool/manual (CRP-030), domain in crafting.mjs. Character sheet › "Doni"
// (Boons): BG3 separate progression tree with prerequisites, unlocked by consuming a
// collected item, outer ring gated by the story (CRP-019). Campaign › "Tempo libero": the
// party's downtime and projects, with the DM's grant for everyone.
//
// Rules: SRD 5.2.1 crafting (EN 103 / IT 117) as in crafting.mjs; the 8-hour working day
// of the same rules is the campaign's working day for every project. Learning a language or
// a tool and the Lantern's Favour track are campaign rules written by the DM (not SRD).

import { rollDie } from "./state.mjs";
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { isCampaignMember } from "./campaign-content.mjs";
import { knownLanguages } from "./chat-domain.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { languages as RULE_LANGUAGES } from "./character-rules.mjs";
import { formatCp, giveItemToActor, newId, partyMembers } from "./party-stash.mjs";
import {
  L,
  fail,
  TOOL_IDS,
  WORKDAY_HOURS,
  allRecipes,
  checkRecipe,
  createCampaignRecipe,
  deliverCraft,
  recipeById,
  refundCraft,
  retireCampaignRecipe,
  startCrafting,
  toolName,
  toolProficiencies,
  toolRow,
} from "./crafting.mjs";
import { getById } from "./srd-sample.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "projects";
export const RECORDS = "projects-records";
export const TRACK_TAB = "projects-track";
const VERSION = 1;
const HOUR = 3600,
  DAY = 86400;
const MAX_LOG = 200;
const copy = (value) => structuredClone(value);
const plainText = (value, lang = "it") =>
  value && typeof value === "object"
    ? (value[lang] ?? value.it ?? value.en ?? "")
    : String(value ?? "");

// ---------------------------------------------------------------- authored campaign rules

const campaignRule = (revision, it, en) => ({
  kind: "campaign-rule",
  author: "dm",
  edition: "2024",
  revision,
  note: L(it, en),
});
const LANGUAGE_EN = {
  "common-sign": "Common Sign Language",
  draconic: "Draconic",
  dwarvish: "Dwarvish",
  elvish: "Elvish",
  giant: "Giant",
  gnomish: "Gnomish",
  goblin: "Goblin",
  halfling: "Halfling",
  orc: "Orc",
};
const LANGUAGE_ARTICLE = {
  "common-sign": "la ",
  draconic: "il ",
  dwarvish: "il ",
  elvish: "l'",
  giant: "il ",
  gnomish: "lo ",
  goblin: "il ",
  halfling: "l'",
  orc: "l'",
};
export const LEARNABLE_LANGUAGES = Object.freeze(
  RULE_LANGUAGES.filter((row) => row.id !== "common").map((row) => ({
    id: row.id,
    name: L(row.name.it, LANGUAGE_EN[row.id] ?? row.name.en),
  })),
);
const languageName = (id) => LEARNABLE_LANGUAGES.find((row) => row.id === id)?.name ?? L(id, id);
// The languages a character knows are the ones Chat (B17 Polyglot) and the Party sheet read:
// the recorded `languages`, otherwise the sample fixture. Never only `actor.languages`, or a
// fixture character would "learn" a language it already speaks and lose the others.
const knows = (state, actorId) => knownLanguages(state, actorId) ?? [];
const recordedLanguages = (state, actor) =>
  Array.isArray(actor.languages) && actor.languages.length
    ? [...actor.languages]
    : knows(state, actor.id);

export const ACTIVITIES = Object.freeze([
  {
    id: "learn-language",
    name: L("Imparare una lingua", "Learn a language"),
    param: "language",
    benefit: "language",
    steps: [
      {
        kind: "milestone",
        label: L("Trovare un insegnante che parli {x}", "Find a teacher who speaks {x}"),
      },
      { kind: "time", label: L("Studio", "Study"), targetHours: 80 },
      {
        kind: "check",
        label: L("Conversazione di prova", "Test conversation"),
        ability: "int",
        dc: 10,
        successes: 1,
      },
    ],
    source: campaignRule(
      "lanterns-downtime-1",
      "Regola della campagna scritta dal DM: l'SRD 5.2.1 non descrive come imparare una lingua nel tempo libero.",
      "Campaign rule written by the DM: SRD 5.2.1 does not describe learning a language in downtime.",
    ),
  },
  {
    id: "tool-training",
    name: L("Addestrarsi con uno strumento", "Train with a tool"),
    param: "tool",
    benefit: "tool",
    steps: [
      { kind: "milestone", label: L("Trovare un maestro: {x}", "Find a master: {x}") },
      { kind: "time", label: L("Pratica", "Practice"), targetHours: 80 },
      {
        kind: "check",
        label: L("Prova davanti al maestro", "Test before the master"),
        ability: "tool",
        dc: 10,
        successes: 1,
      },
    ],
    source: campaignRule(
      "lanterns-downtime-1",
      "Regola della campagna scritta dal DM: l'SRD 5.2.1 non descrive l'addestramento con gli strumenti.",
      "Campaign rule written by the DM: SRD 5.2.1 does not describe training with tools.",
    ),
  },
]);
export const TRACKS = Object.freeze([
  {
    id: "lantern-favor",
    name: L("Favore della Lanterna", "Lantern's Favour"),
    description: L(
      "La luce riaccesa sulla torre dell'osservatorio concede piccoli doni a chi ne raccoglie le scintille.",
      "The light rekindled on the observatory tower grants small gifts to whoever gathers its sparks.",
    ),
    currency: { key: "lantern-spark", name: L("Scintilla di lanterna", "Lantern spark") },
    rings: [
      L("Anello interno", "Inner ring"),
      L("Anello centrale", "Middle ring"),
      L("Anello esterno", "Outer ring"),
    ],
    nodes: [
      {
        id: "steady-flame",
        ring: 1,
        column: 1,
        name: L("Fiamma salda", "Steady flame"),
        text: L(
          "Una fiamma che porti non si spegne per il vento o la pioggia.",
          "A flame you carry is not put out by wind or rain.",
        ),
        cost: 1,
        requires: [],
      },
      {
        id: "warm-glow",
        ring: 1,
        column: 2,
        name: L("Tepore", "Warm glow"),
        text: L(
          "Durante un riposo lungo accanto a una lanterna accesa non senti il freddo della notte.",
          "During a Long Rest beside a lit lantern you do not feel the cold of the night.",
        ),
        cost: 1,
        requires: [],
      },
      {
        id: "guiding-beam",
        ring: 2,
        column: 1,
        name: L("Raggio guida", "Guiding beam"),
        text: L(
          "Una volta per riposo lungo la tua luce indica la via verso un luogo in cui sei già stato.",
          "Once per Long Rest your light points the way to a place you have already been.",
        ),
        cost: 1,
        requires: ["steady-flame"],
      },
      {
        id: "shared-warmth",
        ring: 2,
        column: 2,
        name: L("Calore condiviso", "Shared warmth"),
        text: L(
          "I compagni che riposano entro 3 m dalla tua lanterna godono anch'essi del Tepore.",
          "Companions resting within 10 feet of your lantern also enjoy the Warm glow.",
        ),
        cost: 1,
        requires: ["warm-glow"],
      },
      {
        id: "lantern-heart",
        ring: 3,
        column: 0,
        name: L("Cuore della lanterna", "Lantern heart"),
        text: L(
          "La lanterna della torre ti riconosce: il DM racconta che cosa ti rivela.",
          "The tower lantern recognises you: the DM tells what it reveals to you.",
        ),
        cost: 2,
        requires: ["guiding-beam", "shared-warmth"],
        minLevel: 5,
        story: true,
      },
    ],
    source: campaignRule(
      "lanterns-favour-1",
      "Traccia non di classe scritta dal DM per Le lanterne di Bruma: non fa parte dell'SRD 5.2.1. I testi non applicano effetti automatici.",
      "Non-class track written by the DM for The Lanterns of Bruma: not part of SRD 5.2.1. The texts apply no automatic effects.",
    ),
  },
]);
const DEMO = {
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b54",
  note: "Synthetic fixture for the downtime demonstration; not a real character.",
};
// Sample stamps follow the visit (sample-clock.mjs), computed at seed time.
const seedAt = () => sampleDate("2026-09-17T22:40:00.000Z");

// ---------------------------------------------------------------- slices

export const emptyProjects = () => ({
  recipes: [],
  projects: [],
  downtime: {},
  assignments: {},
  log: [],
});
export const emptyRecords = () => ({ rolls: [], notes: { player: {}, dm: {} } });
const missingRow = (actor, id) => !(actor.inventory ?? []).some((row) => row.id === id);

/**
 * Seed: the sample characters' downtime (Mira studies Elvish with the two downtime days of
 * session 12 and keeps her Druid Herbalism Kit and gathered herbs, Livia carries two
 * lantern sparks for the Lantern's Favour). Rows are added only when absent. Livia already
 * speaks Elvish in the Chat and Party (B17 fixture): the language project is Mira's.
 */
export function seedProjects(state) {
  const slice = emptyProjects();
  const actors = state?.actors ?? {};
  slice.recipes.push({
    id: "recipe-bruma-salve",
    name: "Unguento di Bruma",
    tool: "herbalism-kit",
    valueCp: 1000,
    weightKg: 0.25,
    manual: "Quaderno delle erbe di Syl",
    description:
      "Unguento lenitivo per le mani screpolate dal freddo della torre. Testo del DM, senza effetti automatici.",
    createdAt: seedAt(),
    source: {
      kind: "campaign-rule",
      author: "dm",
      edition: "2024",
      revision: "recipe-bruma-salve",
      note: "Ricetta scritta dal DM: strumento assegnato dal GM, materie e tempo con la formula SRD 5.2.1 EN 103 / IT 117.",
    },
  });
  for (const id of ["livia", "doran", "mira"])
    if (actors[id]) slice.downtime[id] = { anchor: 0, grants: [] };
  const livia = actors.livia;
  if (livia) {
    livia.inventory ??= [];
    if (missingRow(livia, "projects-livia-sparks"))
      livia.inventory.push({
        id: "projects-livia-sparks",
        name: L("Scintilla di lanterna", "Lantern spark"),
        quantity: 2,
        weight: 0,
        equipped: false,
        kind: "gear",
        trackCurrency: "lantern-spark",
        description: L(
          "Frammento di luce raccolto sulla torre dell'osservatorio: si consuma per sbloccare un dono del Favore della Lanterna.",
          "A shard of light gathered on the observatory tower: spent to unlock a gift of the Lantern's Favour.",
        ),
        source: DEMO,
      });
    slice.assignments.livia = { trackId: "lantern-favor", storyGate: false, unlocked: [] };
  }
  const mira = actors.mira;
  if (mira) {
    mira.inventory ??= [];
    if (missingRow(mira, "projects-mira-herbalism-kit")) {
      const kit = getById("srd2024:item:herbalism-kit");
      mira.inventory.push({
        id: "projects-mira-herbalism-kit",
        srdId: kit.id,
        name: { ...kit.name },
        quantity: 1,
        weight: 1.5,
        equipped: false,
        kind: "gear",
        category: kit.category,
        value: 500,
        description: { ...kit.summary },
        source: copy(kit.source),
      });
    }
    if (missingRow(mira, "projects-mira-herbs"))
      mira.inventory.push({
        id: "projects-mira-herbs",
        name: L("Erbe medicinali", "Medicinal herbs"),
        quantity: 6,
        weight: 0.1,
        equipped: false,
        kind: "gear",
        value: 500,
        material: { tools: ["herbalism-kit"] },
        description: L(
          "Raccolte nel bosco sotto l'osservatorio: materie prime da 5 mo l'una per la borsa da erborista.",
          "Gathered in the wood below the observatory: raw materials worth 5 GP each for the Herbalism Kit.",
        ),
        source: DEMO,
      });
    if (!knows(state, "mira").includes("elvish")) {
      slice.downtime.mira.grants.push({
        id: "grant-mira-s12",
        hours: 16,
        reason: "Sessione 12: 2 giorni di tempo libero a Bruma (registro dell'avventura)",
        by: "dm",
        at: seedAt(),
      });
      const project = projectFromActivity(ACTIVITIES[0], { actorId: "mira", param: "elvish" });
      Object.assign(project, {
        id: "project-mira-elvish",
        createdAt: seedAt(),
        createdBy: "player",
      });
      project.steps[0].done = true;
      project.steps[0].note = "Syl, archivista elfa dell'osservatorio";
      project.work.push({
        id: "work-mira-s12",
        stepId: project.steps[1].id,
        hours: 16,
        at: seedAt(),
        by: "player",
        clockAt: null,
        note: "Tempo libero della sessione 12",
      });
      slice.projects.push(project);
      addLog(slice, {
        actorId: "mira",
        projectId: project.id,
        kind: "time",
        by: "player",
        at: seedAt(),
        text: L(
          "Imparare l'Elfico: 16 h di studio (tempo libero della sessione 12, concesso dal DM)",
          "Learn Elvish: 16 h of study (session 12 downtime, granted by the DM)",
        ),
      });
    }
  }
  return slice;
}
export function normalizeProjects(saved, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved projects come from a newer version");
  const list = (value) => (Array.isArray(value) ? value : []);
  const object = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    recipes: list(saved?.recipes),
    projects: list(saved?.projects),
    downtime: object(saved?.downtime),
    assignments: object(saved?.assignments),
    log: list(saved?.log),
  };
}
export function normalizeRecords(saved, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved project records come from a newer version");
  const notes = saved?.notes && typeof saved.notes === "object" ? saved.notes : {};
  return {
    rolls: Array.isArray(saved?.rolls) ? saved.rolls : [],
    notes: {
      player: notes.player && typeof notes.player === "object" ? notes.player : {},
      dm: notes.dm && typeof notes.dm === "object" ? notes.dm : {},
    },
  };
}
export const projectsOf = (state) => state?.ext?.[ID] ?? null;
export const recordsOf = (state) => state?.ext?.[RECORDS] ?? null;

// ---------------------------------------------------------------- access and time

export const isPersonal = (actor) =>
  actor?.visibility === "private" ||
  (Array.isArray(actor?.campaignIds) && actor.campaignIds.length === 0);
function actorFor(state, role, actorId, control = false) {
  const actor = state.actors?.[actorId];
  if (!actor || !canViewActor(actor, role, state))
    throw fail("Personaggio non disponibile.", "Character unavailable.");
  if (control && !canControlActor(actor, role, state))
    throw fail("Non controlli questo personaggio.", "You do not control this character.");
  return actor;
}
export const clockSeconds = (state) => state.restTime?.clocks?.[state.campaign?.id]?.seconds ?? 0;
/** Working hours a stretch of game time allows: 8 per full day, up to 8 in the current day. */
export function workableHours(seconds) {
  const elapsed = Math.max(0, Math.floor(seconds));
  const days = Math.floor(elapsed / DAY);
  return days * WORKDAY_HOURS + Math.min(WORKDAY_HOURS, Math.floor((elapsed % DAY) / HOUR));
}
/** The actor's downtime: hours the campaign clock allows since tracking began, hours the
 * DM granted (or recorded personal time on a private sheet), hours already dedicated. */
export function timeBudget(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  const campaign = !!actor && !isPersonal(actor) && isCampaignActor(actor, state.campaign?.id);
  const record = slice?.downtime?.[actorId] ?? { anchor: null, grants: [] };
  const clock = campaign ? clockSeconds(state) : null;
  const anchor = campaign ? (record.anchor ?? clock) : null;
  const elapsed = campaign ? Math.max(0, clock - anchor) : 0;
  const fromClock = campaign ? workableHours(elapsed) : 0;
  const granted = (record.grants ?? []).reduce((sum, grant) => sum + grant.hours, 0);
  const used = (slice?.projects ?? [])
    .filter((project) => project.actorId === actorId)
    .reduce((sum, project) => sum + project.work.reduce((total, work) => total + work.hours, 0), 0);
  const balance = fromClock + granted - used;
  return {
    campaign,
    clock,
    anchor,
    elapsed,
    fromClock,
    granted,
    used,
    balance,
    available: Math.max(0, balance),
  };
}
function ensureDowntime(state, slice, actorId) {
  const actor = state.actors[actorId];
  const record = (slice.downtime[actorId] ??= { anchor: null, grants: [] });
  if (record.anchor == null && !isPersonal(actor) && isCampaignActor(actor, state.campaign?.id))
    record.anchor = clockSeconds(state);
  return record;
}

// ---------------------------------------------------------------- change log

export function addLog(slice, entry) {
  const record = {
    id: newId("plog"),
    at: entry.at ?? new Date().toISOString(),
    dismissed: false,
    ...copy(entry),
  };
  slice.log.push(record);
  if (slice.log.length > MAX_LOG) slice.log.splice(0, slice.log.length - MAX_LOG);
  return record;
}
export function dismissLog(slice, role, entryId) {
  if (role !== "dm")
    throw fail("Solo il DM nasconde le voci del registro.", "Only the DM hides log entries.");
  const entry = slice.log.find((row) => row.id === entryId);
  if (!entry) throw fail("Voce non trovata.", "Entry not found.");
  entry.dismissed = true;
  return entry;
}

// ---------------------------------------------------------------- projects

const substitute = (label, x) => L(label.it.replace("{x}", x.it), label.en.replace("{x}", x.en));
function stepFrom(template, index, x = L("", "")) {
  const step = { id: "s" + (index + 1), kind: template.kind, label: substitute(template.label, x) };
  if (template.kind === "milestone") step.done = false;
  if (template.kind === "time")
    Object.assign(step, { targetHours: template.targetHours, adjustHours: 0 });
  if (template.kind === "check")
    Object.assign(step, {
      ability: template.ability,
      dc: template.dc,
      successes: template.successes,
      results: [],
      adjustSuccesses: 0,
    });
  if (template.kind === "fixed")
    Object.assign(step, { value: 0, increase: template.increase, target: template.target });
  return step;
}
export function projectFromActivity(activity, { actorId, param }) {
  let x, title;
  if (activity.param === "language") {
    if (!LEARNABLE_LANGUAGES.some((row) => row.id === param))
      throw fail("Scegli la lingua da imparare.", "Choose the language to learn.");
    x = languageName(param);
    title = L(`Imparare ${LANGUAGE_ARTICLE[param] ?? ""}${x.it}`, `Learn ${x.en}`);
  } else {
    if (!TOOL_IDS.includes(param)) throw fail("Scegli lo strumento.", "Choose the tool.");
    x = toolName(param);
    title = L(`Addestramento: ${x.it}`, `Training: ${x.en}`);
  }
  return {
    id: newId("project"),
    actorId,
    kind: "study",
    activityId: activity.id,
    param,
    title,
    source: copy(activity.source),
    status: "active",
    steps: activity.steps.map((template, index) => {
      const step = stepFrom(template, index, x);
      if (step.ability === "tool")
        step.ability = getById("srd2024:item:" + param)?.tool?.ability ?? "int";
      return step;
    }),
    work: [],
    corrections: [],
  };
}
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
/** A custom step (Crash's progression types plus time and a milestone), validated. */
export function customStep(input, index) {
  const kind = input.kind;
  const label = String(input.label ?? "").trim();
  if (!label || label.length > 80)
    throw fail(
      "Scrivi il nome del passo (massimo 80 caratteri).",
      "Write the step name (80 characters at most).",
    );
  const whole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const step = { id: "s" + (index + 1), kind, label: L(label, label) };
  if (kind === "milestone") step.done = false;
  else if (kind === "time") {
    const hours = Number(input.hours);
    if (!whole(hours, 1, 2000))
      throw fail("Le ore del passo vanno da 1 a 2.000.", "The step hours range from 1 to 2,000.");
    Object.assign(step, { targetHours: hours, adjustHours: 0 });
  } else if (kind === "check") {
    const dc = Number(input.dc),
      successes = Number(input.successes);
    if (!ABILITIES.includes(input.ability))
      throw fail("Scegli la caratteristica della prova.", "Choose the check's ability.");
    if (!whole(dc, 1, 30)) throw fail("La CD va da 1 a 30.", "The DC ranges from 1 to 30.");
    if (!whole(successes, 1, 20))
      throw fail("I successi richiesti vanno da 1 a 20.", "Required successes range from 1 to 20.");
    Object.assign(step, { ability: input.ability, dc, successes, results: [], adjustSuccesses: 0 });
  } else if (kind === "fixed") {
    const increase = Number(input.increase),
      target = Number(input.target);
    if (!whole(target, 1, 1000))
      throw fail("Il traguardo va da 1 a 1.000.", "The completion target ranges from 1 to 1,000.");
    if (!whole(increase, 1, target))
      throw fail("L'aumento va da 1 al traguardo.", "The increase ranges from 1 to the target.");
    Object.assign(step, { value: 0, increase, target });
  } else throw fail("Scegli il tipo di passo.", "Choose the step type.");
  return step;
}
export function createProject(state, slice, role, input, { now = new Date().toISOString() } = {}) {
  const actor = actorFor(state, role, input.actorId, true);
  if (actor.kind !== "character")
    throw fail("I progetti sono dei personaggi.", "Projects belong to characters.");
  let project;
  if (input.activityId) {
    const activity = ACTIVITIES.find((row) => row.id === input.activityId);
    if (!activity) throw fail("Attività non trovata.", "Activity not found.");
    if (activity.param === "language" && knows(state, actor.id).includes(input.param))
      throw fail(
        "Il personaggio conosce già questa lingua.",
        "The character already knows this language.",
      );
    if (activity.param === "tool" && toolProficiencies(actor).has(input.param))
      throw fail(
        "Il personaggio ha già questa competenza.",
        "The character already has this proficiency.",
      );
    const open = slice.projects.find(
      (row) =>
        row.actorId === actor.id &&
        row.activityId === activity.id &&
        row.param === input.param &&
        ["active", "paused"].includes(row.status),
    );
    if (open) throw fail("Questo progetto è già in corso.", "This project is already under way.");
    project = projectFromActivity(activity, { actorId: actor.id, param: input.param });
  } else {
    const title = String(input.title ?? "").trim();
    if (!title || title.length > 80)
      throw fail(
        "Scrivi il titolo del progetto (massimo 80 caratteri).",
        "Write the project title (80 characters at most).",
      );
    project = {
      id: newId("project"),
      actorId: actor.id,
      kind: "custom",
      title: L(title, title),
      source: {
        kind: "custom",
        author: role,
        note: L("Progetto concordato al tavolo.", "Project agreed at the table."),
      },
      status: "active",
      steps: [customStep(input.step ?? {}, 0)],
      work: [],
      corrections: [],
    };
  }
  if (input.id) project.id = input.id;
  Object.assign(project, { createdAt: now, createdBy: role });
  ensureDowntime(state, slice, actor.id);
  slice.projects.push(project);
  addLog(slice, {
    actorId: actor.id,
    projectId: project.id,
    kind: "create",
    by: role,
    at: now,
    text: L(`Nuovo progetto: ${project.title.it}`, `New project: ${project.title.en}`),
  });
  return project;
}
export function projectById(slice, projectId) {
  const project = slice?.projects.find((row) => row.id === projectId);
  if (!project) throw fail("Progetto non trovato.", "Project not found.");
  return project;
}
function controlled(state, slice, role, projectId) {
  const project = projectById(slice, projectId);
  actorFor(state, role, project.actorId, true);
  return project;
}
const requireOpen = (project, allowPaused = false) => {
  if (project.status === "active" || (allowPaused && project.status === "paused")) return;
  throw project.status === "paused"
    ? fail("Il progetto è in pausa: riprendilo prima.", "The project is paused: resume it first.")
    : fail("Il progetto è concluso.", "The project is closed.");
};
export const workedHours = (project, stepId) =>
  project.work.filter((work) => work.stepId === stepId).reduce((sum, work) => sum + work.hours, 0);
export function stepProgress(project, step) {
  switch (step.kind) {
    case "milestone":
      return { value: step.done ? 1 : 0, max: 1 };
    case "time": {
      const hours = workedHours(project, step.id) + (step.adjustHours ?? 0);
      return {
        value: Math.min(Math.max(hours, 0), step.targetHours),
        max: step.targetHours,
        hours,
      };
    }
    case "check": {
      const successes =
        (step.results ?? []).filter((row) => row.success).length + (step.adjustSuccesses ?? 0);
      return { value: Math.min(Math.max(successes, 0), step.successes), max: step.successes };
    }
    default:
      return { value: Math.min(Math.max(step.value ?? 0, 0), step.target), max: step.target };
  }
}
export const stepDone = (project, step) => {
  const { value, max } = stepProgress(project, step);
  return value >= max;
};
export const currentStep = (project) =>
  project.steps.find((step) => !stepDone(project, step)) ?? null;
export const projectSpentHours = (project) =>
  project.work.reduce((sum, work) => sum + work.hours, 0);

function featureRow(project, name, description) {
  return {
    id: "projects-" + project.id,
    name,
    description,
    managedBy: "projects",
    projectId: project.id,
    source: copy(project.source),
  };
}
/** Completes the project when its last step is done: the benefit lands on the sheet. */
function settle(state, slice, project, role, now) {
  if (currentStep(project) || project.status === "completed") return null;
  project.status = "completed";
  project.completedAt = now;
  const actor = state.actors[project.actorId];
  const benefit = {};
  if (project.kind === "craft") {
    const row = deliverCraft(state, project);
    benefit.itemRowId = row.id;
  } else if (project.activityId === "learn-language") {
    const name = languageName(project.param);
    // The new language joins the ones Chat and Party already read: the recorded list as it
    // is (also ids outside the catalog), otherwise the fixture list, recorded now.
    const known = knows(state, actor.id);
    const recorded = recordedLanguages(state, actor);
    benefit.addedLanguage = !known.includes(project.param);
    actor.languages = benefit.addedLanguage ? [...recorded, project.param] : recorded;
    actor.features ??= [];
    const row = featureRow(
      project,
      L(`Lingua: ${name.it}`, `Language: ${name.en}`),
      L(
        `Appresa con il progetto «${project.title.it}» (regola della campagna).`,
        `Learned through the project “${project.title.en}” (campaign rule).`,
      ),
    );
    actor.features.push(row);
    Object.assign(benefit, { language: project.param, featureId: row.id });
  } else if (project.activityId === "tool-training") {
    const name = toolName(project.param);
    actor.toolProficiencies = [
      ...(actor.toolProficiencies ?? []),
      { tool: project.param, projectId: project.id },
    ];
    actor.features ??= [];
    const row = featureRow(
      project,
      L(`Competenza: ${name.it}`, `Proficiency: ${name.en}`),
      L(
        `Ottenuta con il progetto «${project.title.it}» (regola della campagna).`,
        `Gained through the project “${project.title.en}” (campaign rule).`,
      ),
    );
    actor.features.push(row);
    Object.assign(benefit, { tool: project.param, featureId: row.id });
  }
  project.benefit = benefit;
  addLog(slice, {
    actorId: project.actorId,
    projectId: project.id,
    kind: "complete",
    by: role,
    at: now,
    text:
      project.kind === "craft"
        ? L(
            `${project.title.it}: completato, oggetto aggiunto all'inventario di ${actor.name}`,
            `${project.title.en}: completed, item added to ${actor.name}'s inventory`,
          )
        : L(`${project.title.it}: completato`, `${project.title.en}: completed`),
  });
  return benefit;
}
/** SRD crafting: "You must use the required tool" while you work (EN 103 / IT 117). */
function requireTool(state, project) {
  if (project.kind !== "craft") return;
  const actor = state.actors[project.actorId];
  if (toolRow(actor, project.craft.tool)) return;
  const tool = toolName(project.craft.tool);
  throw fail(
    `Serve lo strumento: ${tool.it} non è nell'inventario di ${actor.name}.`,
    `The tool is needed: ${tool.en} is not in ${actor.name}'s inventory.`,
  );
}
/** Takes a study's benefit back off the sheet when a DM correction reopens it. */
function withdrawBenefit(state, project) {
  const actor = state.actors[project.actorId];
  const benefit = project.benefit ?? {};
  if (actor && benefit.featureId)
    actor.features = (actor.features ?? []).filter((row) => row.id !== benefit.featureId);
  if (actor && benefit.language && benefit.addedLanguage)
    actor.languages = recordedLanguages(state, actor).filter((id) => id !== benefit.language);
  if (actor && benefit.tool)
    actor.toolProficiencies = (actor.toolProficiencies ?? []).filter(
      (entry) => entry?.projectId !== project.id,
    );
  project.benefit = null;
  project.completedAt = null;
  project.status = "active";
}
export function dedicateTime(
  state,
  slice,
  role,
  { projectId, hours, id = newId("work"), now = new Date().toISOString(), note = "" },
) {
  const project = controlled(state, slice, role, projectId);
  requireOpen(project);
  const step = currentStep(project);
  if (!step || step.kind !== "time")
    throw fail("Il passo attuale non richiede tempo.", "The current step does not need time.");
  requireTool(state, project);
  if (!Number.isInteger(hours) || hours < 1)
    throw fail(
      "Inserisci un numero intero di ore, almeno 1.",
      "Enter a whole number of hours, at least 1.",
    );
  const budget = timeBudget(state, slice, project.actorId);
  if (hours > budget.available)
    throw fail(
      `Ore di lavoro disponibili: ${budget.available}. Il DM fa passare il tempo o concede tempo libero.`,
      `Working hours available: ${budget.available}. The DM advances time or grants downtime.`,
    );
  const progress = stepProgress(project, step);
  const remaining = step.targetHours - progress.value;
  if (hours > remaining)
    throw fail(`A questo passo mancano ${remaining} h.`, `This step needs ${remaining} more h.`);
  ensureDowntime(state, slice, project.actorId);
  project.work.push({
    id,
    stepId: step.id,
    hours,
    at: now,
    by: role,
    clockAt: budget.campaign ? budget.clock : null,
    note: String(note ?? "")
      .trim()
      .slice(0, 120),
  });
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "time",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: ${hours} h (${plainText(step.label, "it")} ${progress.value} → ${progress.value + hours} / ${step.targetHours} h)`,
      `${project.title.en}: ${hours} h (${plainText(step.label, "en")} ${progress.value} → ${progress.value + hours} / ${step.targetHours} h)`,
    ),
  });
  return { project, completed: settle(state, slice, project, role, now) };
}
export function markMilestone(
  state,
  slice,
  role,
  { projectId, note = "", now = new Date().toISOString() },
) {
  const project = controlled(state, slice, role, projectId);
  requireOpen(project);
  const step = currentStep(project);
  if (!step || step.kind !== "milestone")
    throw fail(
      "Il passo attuale non è un traguardo da segnare.",
      "The current step is not a milestone.",
    );
  step.done = true;
  if (note) step.note = String(note).trim().slice(0, 120);
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "milestone",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: fatto «${plainText(step.label, "it")}»`,
      `${project.title.en}: done “${plainText(step.label, "en")}”`,
    ),
  });
  return { project, completed: settle(state, slice, project, role, now) };
}
/** Crash's "Fixed Value": each press adds the increase amount, up to the target. */
export function advanceFixed(state, slice, role, { projectId, now = new Date().toISOString() }) {
  const project = controlled(state, slice, role, projectId);
  requireOpen(project);
  const step = currentStep(project);
  if (!step || step.kind !== "fixed")
    throw fail("Il passo attuale non ha un valore fisso.", "The current step has no fixed value.");
  const before = step.value;
  step.value = Math.min(step.target, before + step.increase);
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "fixed",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: ${plainText(step.label, "it")} ${before} → ${step.value} / ${step.target}`,
      `${project.title.en}: ${plainText(step.label, "en")} ${before} → ${step.value} / ${step.target}`,
    ),
  });
  return { project, completed: settle(state, slice, project, role, now) };
}
const modifierOf = (score) => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : null);
export function checkModifier(state, project, step) {
  const actor = getEffectiveActor(state.actors[project.actorId]);
  const modifier = modifierOf(actor?.abilities?.[step.ability]);
  if (modifier === null)
    throw fail(
      "Registra prima il punteggio della caratteristica.",
      "Record the ability score first.",
    );
  return modifier;
}
const isReferenced = (slice, rollId) =>
  slice.projects.some((project) =>
    project.steps.some((step) => (step.results ?? []).some((row) => row.rollId === rollId)),
  );
/** Rolls kept after an Undo removed their result: an identical retry reuses the faces once. */
export function withdrawnRoll(slice, records, key) {
  return records.rolls.find(
    (roll) =>
      roll.retryKey === key &&
      roll.mode === "digital" &&
      !roll.reusedBy &&
      !isReferenced(slice, roll.id),
  );
}
/**
 * Records one check of the current step with a physical face (entered) or a digital one
 * (the core dice service, state.mjs rollDie). The roll record goes to the preserved slice
 * and survives Undo; after an Undo the same attempt reuses the withdrawn digital faces once.
 */
export function recordCheck(
  state,
  slice,
  records,
  role,
  { projectId, mode, face, die = rollDie, id = newId("proll"), now = new Date().toISOString() },
) {
  const project = controlled(state, slice, role, projectId);
  requireOpen(project);
  const step = currentStep(project);
  if (!step || step.kind !== "check")
    throw fail("Il passo attuale non richiede una prova.", "The current step needs no check.");
  const modifier = checkModifier(state, project, step);
  const attempt = step.results.length;
  const retryKey = [role, projectId, step.id, attempt].join("|");
  let values,
    status = "accepted",
    reusedFrom = null;
  if (mode === "physical") {
    const value = Number(face);
    if (!Number.isInteger(value) || value < 1 || value > 20)
      throw fail(
        "Inserisci la faccia del d20 fisico, da 1 a 20.",
        "Enter the physical d20 face, from 1 to 20.",
      );
    values = [value];
  } else if (mode === "digital") {
    const withdrawn = withdrawnRoll(slice, records, retryKey);
    if (withdrawn) {
      values = [...withdrawn.values];
      status = "reused";
      reusedFrom = withdrawn.id;
      withdrawn.reusedBy = id;
    } else values = [die(20)];
    if (!Number.isInteger(values[0]) || values[0] < 1 || values[0] > 20)
      throw Error("The dice service returned an invalid face");
  } else throw fail("Scegli dado digitale o fisico.", "Choose a digital or physical die.");
  const actor = state.actors[project.actorId];
  const total = values[0] + modifier;
  const success = total >= step.dc;
  const record = {
    id,
    at: now,
    by: role,
    actorId: actor.id,
    projectId,
    stepId: step.id,
    attempt,
    mode,
    values,
    modifier,
    total,
    dc: step.dc,
    ability: step.ability,
    success,
    status,
    retryKey,
    visibility: isPersonal(actor) ? "private" : "shared",
    ...(reusedFrom ? { reusedFrom } : {}),
  };
  records.rolls.push(record);
  if (records.rolls.length > MAX_LOG) records.rolls.splice(0, records.rolls.length - MAX_LOG);
  step.results.push({ rollId: id, success, total, face: values[0], mode, at: now, by: role });
  const sign = modifier < 0 ? "−" : "+";
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "roll",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: prova ${values[0]} ${sign} ${Math.abs(modifier)} = ${total} contro CD ${step.dc} · ${success ? "successo" : "fallimento"} (${mode === "physical" ? "dado fisico" : "dado digitale"}${status === "reused" ? ", facce riusate" : ""})`,
      `${project.title.en}: check ${values[0]} ${sign} ${Math.abs(modifier)} = ${total} vs DC ${step.dc} · ${success ? "success" : "failure"} (${mode === "physical" ? "physical die" : "digital die"}${status === "reused" ? ", faces reused" : ""})`,
    ),
  });
  return { project, record, completed: settle(state, slice, project, role, now) };
}
export function addStep(
  state,
  slice,
  role,
  { projectId, step: input, now = new Date().toISOString() },
) {
  const project = controlled(state, slice, role, projectId);
  requireOpen(project, true);
  if (project.kind !== "custom" && role !== "dm")
    throw fail(
      "I passi di una regola della campagna o di una ricetta li cambia solo il DM.",
      "Only the DM changes the steps of a campaign rule or a recipe.",
    );
  if (project.kind === "craft")
    throw fail(
      "I passi di una fabbricazione seguono la ricetta.",
      "Crafting steps follow the recipe.",
    );
  if (project.steps.length >= 12)
    throw fail("Un progetto ha al massimo 12 passi.", "A project has 12 steps at most.");
  const step = customStep(input, project.steps.length);
  while (project.steps.some((row) => row.id === step.id)) step.id += "b";
  project.steps.push(step);
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "step",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: nuovo passo «${step.label.it}»`,
      `${project.title.en}: new step “${step.label.en}”`,
    ),
  });
  return step;
}
export function setPaused(
  state,
  slice,
  role,
  { projectId, paused, now = new Date().toISOString() },
) {
  const project = controlled(state, slice, role, projectId);
  if (paused) requireOpen(project);
  else if (project.status !== "paused")
    throw fail("Il progetto non è in pausa.", "The project is not paused.");
  project.status = paused ? "paused" : "active";
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: paused ? "pause" : "resume",
    by: role,
    at: now,
    text: paused
      ? L(`${project.title.it}: in pausa`, `${project.title.en}: paused`)
      : L(`${project.title.it}: ripreso`, `${project.title.en}: resumed`),
  });
  return project;
}
const reasonText = (reason) => {
  const text = String(reason ?? "").trim();
  if (!text || text.length > 200)
    throw fail(
      "Scrivi il motivo (massimo 200 caratteri): resta nel registro.",
      "Write the reason (200 characters at most): it stays in the log.",
    );
  return text;
};
/** Abandons a project with its reason; a craft may give its materials back (and takes back
 * a delivered item). The dedicated hours stay spent: they were used. */
export function abandonProject(
  state,
  slice,
  role,
  { projectId, reason, refund = true, now = new Date().toISOString() },
) {
  const project = controlled(state, slice, role, projectId);
  const why = reasonText(reason);
  const craftDone = project.kind === "craft" && project.status === "completed";
  if (!["active", "paused"].includes(project.status) && !craftDone)
    throw fail("Il progetto è già concluso.", "The project is already closed.");
  if (project.kind === "craft" && (refund || craftDone))
    refundCraft(state, role, project, { returnMaterials: refund });
  project.status = "abandoned";
  project.abandoned = {
    reason: why,
    by: role,
    at: now,
    refunded: project.kind === "craft" && refund,
  };
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "abandon",
    by: role,
    at: now,
    text:
      project.kind === "craft"
        ? L(
            `${project.title.it}: annullato${refund ? ", materie prime restituite" : ""}${craftDone ? ", oggetto ripreso" : ""} · motivo: ${why}`,
            `${project.title.en}: cancelled${refund ? ", raw materials returned" : ""}${craftDone ? ", item taken back" : ""} · reason: ${why}`,
          )
        : L(
            `${project.title.it}: abbandonato · motivo: ${why}`,
            `${project.title.en}: abandoned · reason: ${why}`,
          ),
  });
  return project;
}
/** A completed study or free project stays correctable by the DM (a completed craft is
 * corrected with "Cancel crafting", which also takes the item back). */
export const correctable = (project) =>
  ["active", "paused"].includes(project.status) ||
  (project.status === "completed" && project.kind !== "craft");
/** DM correction of a step's progress, with its reason (DM discretion). Correcting a
 * completed project so that a step is no longer done reopens it and takes its benefit back
 * off the sheet (Crash's: adjusting progress below the target removes the checkmark). */
export function correctStep(
  state,
  slice,
  role,
  { projectId, stepId, value, reason, now = new Date().toISOString() },
) {
  if (role !== "dm")
    throw fail("Solo il DM corregge l'avanzamento.", "Only the DM corrects progress.");
  const project = controlled(state, slice, role, projectId);
  if (!correctable(project)) requireOpen(project, true);
  const step = project.steps.find((row) => row.id === stepId);
  if (!step) throw fail("Passo non trovato.", "Step not found.");
  const why = reasonText(reason);
  const before = stepProgress(project, step);
  const next = Number(value);
  const max = step.kind === "time" ? step.targetHours : before.max;
  if (!Number.isInteger(next) || next < 0 || next > max)
    throw fail(`Il valore va da 0 a ${max}.`, `The value ranges from 0 to ${max}.`);
  if (step.kind === "milestone") step.done = next === 1;
  else if (step.kind === "time") step.adjustHours = next - workedHours(project, step.id);
  else if (step.kind === "check")
    step.adjustSuccesses = next - step.results.filter((row) => row.success).length;
  else step.value = next;
  const shown = step.kind === "time" ? before.hours : before.value;
  const reopened = project.status === "completed" && !!currentStep(project);
  if (reopened) withdrawBenefit(state, project);
  project.corrections.push({
    stepId,
    before: shown,
    after: next,
    reason: why,
    by: role,
    at: now,
    ...(reopened ? { reopened: true } : {}),
  });
  addLog(slice, {
    actorId: project.actorId,
    projectId,
    kind: "correction",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: correzione del DM su «${plainText(step.label, "it")}» ${shown} → ${next}${reopened ? " (riaperto, beneficio tolto dalla scheda)" : ""} · motivo: ${why}`,
      `${project.title.en}: DM correction on “${plainText(step.label, "en")}” ${shown} → ${next}${reopened ? " (reopened, benefit taken off the sheet)" : ""} · reason: ${why}`,
    ),
  });
  return { project, reopened, completed: settle(state, slice, project, role, now) };
}
/** The DM grants downtime hours (campaign sheets) or the owner records personal time on a
 * private sheet; the reason stays in the log. Negative hours withhold time the clock made
 * available (a forced march is not downtime: DM discretion), never more than is left. */
export function grantTime(
  state,
  slice,
  role,
  { actorIds, hours, reason, id = newId("grant"), now = new Date().toISOString() },
) {
  if (!Array.isArray(actorIds) || !actorIds.length)
    throw fail("Scegli almeno un personaggio.", "Choose at least one character.");
  if (!Number.isInteger(hours) || hours === 0 || Math.abs(hours) > 720)
    throw fail("Le ore vanno da 1 a 720.", "Hours range from 1 to 720.");
  const why = reasonText(reason);
  const withhold = hours < 0;
  for (const actorId of actorIds) {
    const actor = actorFor(state, role, actorId);
    const personal = isPersonal(actor);
    if (personal ? actor.owner !== role : role !== "dm")
      throw personal
        ? fail(
            "Solo chi possiede la scheda registra il suo tempo personale.",
            "Only the sheet's owner records its personal time.",
          )
        : fail(
            "Solo il DM concede tempo libero nella campagna.",
            "Only the DM grants downtime in the campaign.",
          );
    const record = ensureDowntime(state, slice, actorId);
    const left = timeBudget(state, slice, actorId).available;
    if (withhold && -hours > left)
      throw fail(
        `${actor.name}: si possono togliere al massimo ${left} h, quelle ancora da dedicare.`,
        `${actor.name}: at most ${left} h can be withheld, the ones not yet dedicated.`,
      );
    record.grants.push({ id: id + "-" + actorId, hours, reason: why, by: role, at: now });
    const size = Math.abs(hours);
    addLog(slice, {
      actorId,
      kind: withhold ? "withhold" : "grant",
      by: role,
      at: now,
      text: personal
        ? withhold
          ? L(
              `Tempo personale corretto: −${size} h · ${why}`,
              `Personal time corrected: −${size} h · ${why}`,
            )
          : L(
              `Tempo personale registrato: ${size} h · ${why}`,
              `Personal time recorded: ${size} h · ${why}`,
            )
        : withhold
          ? L(
              `Tempo libero tolto dal DM: ${size} h · ${why}`,
              `Downtime withheld by the DM: ${size} h · ${why}`,
            )
          : L(
              `Tempo libero concesso dal DM: ${size} h · ${why}`,
              `Downtime granted by the DM: ${size} h · ${why}`,
            ),
    });
  }
}
export function setNote(records, role, projectId, text) {
  const value = String(text ?? "").slice(0, 2000);
  records.notes[role] ??= {};
  if (value.trim()) records.notes[role][projectId] = value;
  else delete records.notes[role][projectId];
}

// ---------------------------------------------------------------- crafting projects

export function beginCraft(
  state,
  slice,
  role,
  { actorId, recipeId, source, id, now = new Date().toISOString() },
) {
  const recipe = recipeById(slice, recipeId);
  const project = startCrafting(state, role, { actorId, recipe, source, id, now });
  ensureDowntime(state, slice, actorId);
  slice.projects.push(project);
  const m = project.craft.materials;
  const used = [
    ...m.items.map((row) => `${plainText(row.name, "it")} ×${row.quantity}`),
    ...(m.coinsCp ? [formatCp(m.coinsCp, "it") + " dalla borsa"] : []),
  ].join(", ");
  const usedEn = [
    ...m.items.map((row) => `${plainText(row.name, "en")} ×${row.quantity}`),
    ...(m.coinsCp ? [formatCp(m.coinsCp, "en") + " from the purse"] : []),
  ].join(", ");
  addLog(slice, {
    actorId,
    projectId: project.id,
    kind: "craft",
    by: role,
    at: now,
    text: L(
      `${project.title.it}: iniziato · materie prime: ${used}`,
      `${project.title.en}: started · raw materials: ${usedEn}`,
    ),
  });
  return project;
}

// ---------------------------------------------------------------- tracks (BG3 tree)

export const trackById = (id) => TRACKS.find((row) => row.id === id) ?? null;
// A collected item is recognised by its marker or by its name in either language (loot the
// DM writes in Italian carries the same text in both), as Mastercrafted matches ingredients.
const nameKeys = (value) =>
  (value && typeof value === "object" ? [value.it, value.en] : [value])
    .filter(Boolean)
    .map((text) => String(text).trim().toLowerCase());
const currencyRows = (actor, track) =>
  (actor.inventory ?? []).filter(
    (row) =>
      row.quantity > 0 &&
      row.location !== "ground" &&
      (row.trackCurrency === track.currency.key ||
        nameKeys(row.name).some((name) => nameKeys(track.currency.name).includes(name))),
  );
export const currencyCount = (actor, track) =>
  currencyRows(actor, track).reduce((sum, row) => sum + row.quantity, 0);
export function trackView(state, slice, actorId) {
  const assignment = slice?.assignments?.[actorId];
  const track = assignment ? trackById(assignment.trackId) : null;
  if (!track) return null;
  const actor = state.actors[actorId];
  const count = currencyCount(actor, track);
  const unlocked = new Set(assignment.unlocked.map((row) => row.nodeId));
  const nodes = track.nodes.map((node) => {
    const missing = [];
    for (const id of node.requires) {
      if (unlocked.has(id)) continue;
      const other = track.nodes.find((row) => row.id === id);
      missing.push(L(`Richiede «${other.name.it}»`, `Requires “${other.name.en}”`));
    }
    if (node.minLevel && (actor.level ?? 0) < node.minLevel)
      missing.push(
        L(
          `Livello ${node.minLevel} (ora ${actor.level})`,
          `Level ${node.minLevel} (now ${actor.level})`,
        ),
      );
    if (node.story && !assignment.storyGate)
      missing.push(
        L("Si apre con la storia: lo decide il DM", "Opens with the story: the DM decides"),
      );
    if (count < node.cost)
      missing.push(
        L(
          `Servono ${node.cost} × ${track.currency.name.it} (ne hai ${count})`,
          `Needs ${node.cost} × ${track.currency.name.en} (you have ${count})`,
        ),
      );
    const done = unlocked.has(node.id);
    return {
      ...node,
      unlocked: done,
      available: !done && !missing.length,
      missing: done ? [] : missing,
    };
  });
  return { track, assignment, count, nodes };
}
export function unlockNode(
  state,
  slice,
  role,
  { actorId, nodeId, now = new Date().toISOString() },
) {
  const actor = actorFor(state, role, actorId, true);
  const view = trackView(state, slice, actorId);
  if (!view) throw fail("Nessuna traccia assegnata.", "No track assigned.");
  const node = view.nodes.find((row) => row.id === nodeId);
  if (!node) throw fail("Dono non trovato.", "Boon not found.");
  if (node.unlocked) throw fail("Dono già sbloccato.", "Boon already unlocked.");
  if (node.missing.length)
    throw fail(
      "Prerequisiti mancanti: " + node.missing.map((row) => row.it).join("; ") + ".",
      "Missing prerequisites: " + node.missing.map((row) => row.en).join("; ") + ".",
    );
  let left = node.cost;
  const consumed = [];
  for (const row of currencyRows(actor, view.track)) {
    if (!left) break;
    const take = Math.min(row.quantity, left);
    consumed.push({ rowId: row.id, quantity: take, row: copy({ ...row, quantity: take }) });
    row.quantity -= take;
    left -= take;
    if (row.quantity === 0) actor.inventory = actor.inventory.filter((item) => item !== row);
  }
  actor.features ??= [];
  const featureId = `projects-track-${view.track.id}-${node.id}`;
  actor.features.push({
    id: featureId,
    name: L(`${view.track.name.it}: ${node.name.it}`, `${view.track.name.en}: ${node.name.en}`),
    description: L(
      `${node.text.it} (Testo del DM: nessun effetto automatico.)`,
      `${node.text.en} (DM text: no automatic effect.)`,
    ),
    managedBy: "projects",
    trackId: view.track.id,
    nodeId: node.id,
    source: copy(view.track.source),
  });
  slice.assignments[actorId].unlocked.push({ nodeId, at: now, by: role, consumed, featureId });
  addLog(slice, {
    actorId,
    kind: "track-unlock",
    by: role,
    at: now,
    text: L(
      `${view.track.name.it}: sbloccato «${node.name.it}» (${node.cost} × ${view.track.currency.name.it})`,
      `${view.track.name.en}: unlocked “${node.name.en}” (${node.cost} × ${view.track.currency.name.en})`,
    ),
  });
  return node;
}
/** DM refund of an unlocked boon (reason required): the items come back, the feature goes. */
export function refundNode(
  state,
  slice,
  role,
  { actorId, nodeId, reason, now = new Date().toISOString() },
) {
  if (role !== "dm") throw fail("Solo il DM restituisce un dono.", "Only the DM refunds a boon.");
  const actor = actorFor(state, role, actorId);
  const why = reasonText(reason);
  const assignment = slice.assignments[actorId];
  const track = assignment && trackById(assignment.trackId);
  const entry = assignment?.unlocked.find((row) => row.nodeId === nodeId);
  if (!track || !entry) throw fail("Il dono non è sbloccato.", "The boon is not unlocked.");
  const dependent = track.nodes.find(
    (node) =>
      node.requires.includes(nodeId) && assignment.unlocked.some((row) => row.nodeId === node.id),
  );
  if (dependent)
    throw fail(
      `Restituisci prima «${dependent.name.it}», che lo richiede.`,
      `Refund “${dependent.name.en}” first: it requires this one.`,
    );
  for (const item of entry.consumed) {
    const { id, ...rest } = item.row;
    giveItemToActor(
      actor,
      { ...rest, id: newId("item"), origin: { actorId, rowId: item.rowId } },
      item.quantity,
    );
  }
  actor.features = (actor.features ?? []).filter((row) => row.id !== entry.featureId);
  assignment.unlocked = assignment.unlocked.filter((row) => row !== entry);
  const node = track.nodes.find((row) => row.id === nodeId);
  addLog(slice, {
    actorId,
    kind: "track-refund",
    by: role,
    at: now,
    text: L(
      `${track.name.it}: restituito «${node.name.it}» · motivo: ${why}`,
      `${track.name.en}: refunded “${node.name.en}” · reason: ${why}`,
    ),
  });
}
export function setStoryGate(
  state,
  slice,
  role,
  { actorId, open, now = new Date().toISOString() },
) {
  if (role !== "dm")
    throw fail("Solo il DM apre l'anello della storia.", "Only the DM opens the story ring.");
  actorFor(state, role, actorId);
  const assignment = slice.assignments[actorId];
  const track = assignment && trackById(assignment.trackId);
  if (!track) throw fail("Nessuna traccia assegnata.", "No track assigned.");
  assignment.storyGate = !!open;
  addLog(slice, {
    actorId,
    kind: "track-gate",
    by: role,
    at: now,
    text: open
      ? L(
          `${track.name.it}: anello esterno aperto dalla storia`,
          `${track.name.en}: outer ring opened by the story`,
        )
      : L(`${track.name.it}: anello esterno richiuso`, `${track.name.en}: outer ring closed again`),
  });
}
export function assignTrack(
  state,
  slice,
  role,
  { actorId, trackId, now = new Date().toISOString() },
) {
  if (role !== "dm") throw fail("Solo il DM assegna una traccia.", "Only the DM assigns a track.");
  const actor = actorFor(state, role, actorId);
  if (actor.kind !== "character" || isPersonal(actor))
    throw fail(
      "Si assegna ai personaggi della campagna.",
      "It is assigned to campaign characters.",
    );
  const track = trackById(trackId);
  if (!track) throw fail("Traccia non trovata.", "Track not found.");
  if (slice.assignments[actorId])
    throw fail("Il personaggio ha già una traccia.", "The character already has a track.");
  slice.assignments[actorId] = { trackId, storyGate: false, unlocked: [] };
  addLog(slice, {
    actorId,
    kind: "track-assign",
    by: role,
    at: now,
    text: L(`Traccia assegnata: ${track.name.it}`, `Track assigned: ${track.name.en}`),
  });
}
export function unassignTrack(state, slice, role, { actorId, now = new Date().toISOString() }) {
  if (role !== "dm") throw fail("Solo il DM toglie una traccia.", "Only the DM removes a track.");
  const assignment = slice.assignments[actorId];
  const track = assignment && trackById(assignment.trackId);
  if (!track) throw fail("Nessuna traccia assegnata.", "No track assigned.");
  if (assignment.unlocked.length)
    throw fail("Restituisci prima i doni sbloccati.", "Refund the unlocked boons first.");
  delete slice.assignments[actorId];
  addLog(slice, {
    actorId,
    kind: "track-assign",
    by: role,
    at: now,
    text: L(`Traccia tolta: ${track.name.it}`, `Track removed: ${track.name.en}`),
  });
}

// ================================================================= UI

let area = null;
const ui = { owner: null, node: {}, focus: null, open: {} };
function uiFor(ctx) {
  if (ui.owner !== ctx.role)
    Object.assign(ui, { owner: ctx.role, node: {}, focus: null, open: {} });
  return ui;
}
export function resetProjectsUI() {
  Object.assign(ui, { owner: null, node: {}, focus: null, open: {} });
}
// A disclosure the viewer opened stays open across the shell's full re-render (the DM
// dismissing several change-log entries, a history read while rolling).
const openAttr = (ctx, key, fallback = false) =>
  (key in uiFor(ctx).open ? uiFor(ctx).open[key] : fallback) ? " open" : "";
const disclosure = (ctx, key, fallback = false) =>
  ` data-projects-details="${ctx.esc(key)}"${openAttr(ctx, key, fallback)}`;
const esc = (ctx, value) => ctx.esc(value);
const lbl = (ctx, value) => ctx.esc(plainText(value, ctx.lang));
const hoursText = (ctx, hours) => `${hours} h`;
const signedHours = (ctx, hours) =>
  hours < 0 ? "−" + hoursText(ctx, -hours) : hoursText(ctx, hours);
const roleName = (ctx, role) => (role === "dm" ? "DM" : ctx.t("Giocatore", "Player"));
function clockText(ctx, seconds) {
  const s = Math.max(0, Math.floor(seconds ?? 0));
  const day = Math.floor(s / DAY) + 1;
  const hh = String(Math.floor((s % DAY) / HOUR)).padStart(2, "0");
  const mm = String(Math.floor((s % HOUR) / 60)).padStart(2, "0");
  return `${ctx.t("giorno", "day")} ${day}, ${hh}:${mm}`;
}
function whenText(ctx, iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
const attr = (ctx, data) =>
  Object.entries(data)
    .filter(([, value]) => value != null && value !== false)
    .map(([key, value]) => ` data-${key}="${ctx.esc(String(value))}"`)
    .join("");
function button(
  ctx,
  action,
  text,
  { data = {}, kind = "quiet", disabled = false, icon = "", describedBy = "", label = "" } = {},
) {
  return `<button type="button" class="button ${kind}" data-projects-action="${action}"${attr(ctx, data)}${disabled ? " disabled" : ""}${describedBy ? ` aria-describedby="${esc(ctx, describedBy)}"` : ""}${label ? ` aria-label="${esc(ctx, label)}"` : ""}>${icon ? ctx.icon(icon) + " " : ""}${text}</button>`;
}
function sourceText(ctx, source) {
  if (!source) return "";
  if (source.kind === "srd")
    return `SRD 5.2.1 · EN ${source.pages.en.join(", ")} / IT ${source.pages.it.join(", ")}`;
  if (source.kind === "campaign-rule")
    return ctx.t("Regola della campagna (DM) · non SRD", "Campaign rule (DM) · not SRD");
  return ctx.t("Progetto concordato al tavolo", "Project agreed at the table");
}
function undoControl(ctx) {
  return ctx.canUndo?.()
    ? `<button type="button" class="button quiet" data-projects-action="undo">${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(ctx.undoLabel?.() ?? "")}</button>`
    : "";
}
const offlineNote = (ctx, personal) =>
  ctx.offline && !personal
    ? `<p class="projects-notice" role="status">${ctx.t("Sei senza rete: i progetti condivisi aspettano la connessione; gli appunti personali si salvano.", "You are offline: shared projects wait for the connection; personal notes still save.")}</p>`
    : "";

// ---------------------------------------------------------------- downtime tab

function timePanel(ctx, actor, slice) {
  const budget = timeBudget(ctx.state, slice, actor.id);
  const control = ctx.canControl(actor);
  const personal = !budget.campaign;
  const member = isCampaignMember(ctx.state, ctx.state.campaign?.id, ctx.role);
  const actions = [
    !personal && ctx.role === "dm" && member
      ? button(ctx, "advance-clock", ctx.t("Fai passare il tempo", "Advance time"), {
          icon: "clock",
        })
      : "",
    !personal && ctx.role === "dm"
      ? button(ctx, "grant", ctx.t("Concedi o togli tempo", "Grant or withhold time"), {
          data: { actor: actor.id },
        })
      : "",
    personal && actor.owner === ctx.role
      ? button(ctx, "grant", ctx.t("Registra tempo personale", "Record personal time"), {
          data: { actor: actor.id },
        })
      : "",
    undoControl(ctx),
  ].join("");
  const rows = budget.campaign
    ? [
        [
          ctx.t("Orologio della campagna", "Campaign clock"),
          `${Math.floor(budget.clock / HOUR)} h · ${clockText(ctx, budget.clock)}`,
        ],
        [
          ctx.t("Lavorabili dall'orologio", "Workable from the clock"),
          `${hoursText(ctx, budget.fromClock)} · ${ctx.t("dal", "since")} ${clockText(ctx, budget.anchor)}`,
        ],
        [
          ctx.t("Concesse o tolte dal DM", "Granted or withheld by the DM"),
          signedHours(ctx, budget.granted),
        ],
        [ctx.t("Già dedicate", "Already dedicated"), hoursText(ctx, budget.used)],
      ]
    : [
        [
          ctx.t("Tempo personale registrato", "Personal time recorded"),
          hoursText(ctx, budget.granted),
        ],
        [ctx.t("Già dedicate", "Already dedicated"), hoursText(ctx, budget.used)],
      ];
  const grants = (slice.downtime?.[actor.id]?.grants ?? []).slice(-4).reverse();
  return `<section class="panel projects-time" aria-labelledby="projects-time-${esc(ctx, actor.id)}"><div class="section-heading"><h2 id="projects-time-${esc(ctx, actor.id)}" tabindex="-1">${ctx.t("Tempo libero", "Downtime")}</h2><div class="toolbar projects-toolbar">${actions}</div></div>${offlineNote(ctx, personal)}<div class="projects-time-grid"><div class="stat projects-available"><span>${ctx.t("Ore di lavoro disponibili", "Working hours available")}</span><strong data-projects-available>${hoursText(ctx, budget.available)}</strong>${budget.balance < 0 ? `<small class="projects-warning">${ctx.t(`Dedicate ${-budget.balance} h oltre il tempo trascorso: il DM corregge o concede tempo.`, `${-budget.balance} h dedicated beyond the elapsed time: the DM corrects or grants time.`)}</small>` : ""}</div><dl class="projects-breakdown">${rows.map(([term, value]) => `<div><dt>${term}</dt><dd>${esc(ctx, value)}</dd></div>`).join("")}</dl></div><p class="muted projects-rule">${
    budget.campaign
      ? ctx.t(
          "Il tempo scorre solo quando il DM lo fa passare (Tempo narrativo). Qui lo assegni ai progetti: 8 ore di lavoro per ogni giorno trascorso, come la giornata di lavoro delle regole di fabbricazione (SRD 5.2.1 EN 103 / IT 117).",
          "Time passes only when the DM advances it (Game time). Here you assign it to projects: 8 working hours for each day that passes, like the working day of the crafting rules (SRD 5.2.1 EN 103 / IT 117).",
        )
      : ctx.t(
          "Scheda personale fuori dalla campagna: registri tu il tempo trascorso, solo per te.",
          "Personal sheet outside the campaign: you record the elapsed time, for yourself only.",
        )
  }${control ? "" : " " + ctx.t("Consultazione: solo chi controlla la scheda assegna il tempo.", "View only: the sheet's controllers assign time.")}</p>${
    grants.length
      ? `<details class="projects-grants"${disclosure(ctx, "grants-" + actor.id)}><summary>${ctx.t("Tempo concesso", "Time granted")} (${grants.length})</summary><ul>${grants.map((grant) => `<li>${signedHours(ctx, grant.hours)} · ${esc(ctx, grant.reason)} · ${roleName(ctx, grant.by)}</li>`).join("")}</ul></details>`
      : ""
  }</section>`;
}
const STATUS = {
  active: ["In corso", "Under way"],
  paused: ["In pausa", "Paused"],
  completed: ["Completato", "Completed"],
  abandoned: ["Abbandonato", "Abandoned"],
};
function stepLine(ctx, project, step) {
  const p = stepProgress(project, step);
  switch (step.kind) {
    case "milestone":
      return step.done
        ? ctx.t("Fatto", "Done") + (step.note ? " · " + esc(ctx, step.note) : "")
        : ctx.t("Da fare", "To do");
    case "time":
      return `${p.hours ?? p.value} / ${step.targetHours} h`;
    case "check":
      return `${ctx.t("Successi", "Successes")} ${p.value} / ${step.successes} · CD ${step.dc} · ${abilityName(ctx, step.ability)}`;
    default:
      return `${p.value} / ${step.target} (+${step.increase})`;
  }
}
const ABILITY_NAMES = {
  str: ["Forza", "Strength"],
  dex: ["Destrezza", "Dexterity"],
  con: ["Costituzione", "Constitution"],
  int: ["Intelligenza", "Intelligence"],
  wis: ["Saggezza", "Wisdom"],
  cha: ["Carisma", "Charisma"],
};
const abilityName = (ctx, id) => ctx.t(...(ABILITY_NAMES[id] ?? [id, id]));
const KIND_NAMES = {
  milestone: ["Traguardo", "Milestone"],
  time: ["Tempo", "Time"],
  check: ["Prova", "Check"],
  fixed: ["Valore fisso", "Fixed value"],
};
function meter(ctx, project) {
  const done = project.steps.filter((step) => stepDone(project, step)).length;
  const segments = project.steps
    .map((step) => {
      const p = stepProgress(project, step);
      const pct = Math.round((p.value / p.max) * 100);
      const state = pct >= 100 ? "done" : step === currentStep(project) ? "current" : "todo";
      return `<li class="projects-seg is-${state}" title="${lbl(ctx, step.label)}"><span class="projects-seg-fill" style="width:${pct}%"></span></li>`;
    })
    .join("");
  return `<div class="projects-meter"><ol class="projects-segs" role="img" aria-label="${esc(ctx, ctx.t(`Passi completati: ${done} di ${project.steps.length}`, `Steps completed: ${done} of ${project.steps.length}`))}">${segments}</ol><span class="projects-fraction">${done}/${project.steps.length}</span></div>`;
}
function currentBlock(ctx, project) {
  const step = currentStep(project);
  if (!step)
    return `<p class="projects-current is-done">${ctx.icon("check")} ${ctx.t("Tutti i passi completati", "All steps completed")}</p>`;
  const index = project.steps.indexOf(step) + 1;
  const p = stepProgress(project, step);
  return `<div class="projects-current"><p><strong>${ctx.t("Passo", "Step")} ${index} ${ctx.t("di", "of")} ${project.steps.length} · ${lbl(ctx, step.label)}</strong> <span class="badge">${ctx.t(...KIND_NAMES[step.kind])}</span></p><div class="projects-bar"><progress max="${p.max}" value="${p.value}" aria-label="${esc(ctx, plainText(step.label, ctx.lang))}"></progress><span data-projects-step-progress>${stepLine(ctx, project, step)}</span></div></div>`;
}
function projectActions(ctx, project, actor, budget) {
  if (!ctx.canControl(actor)) return "";
  const open = ["active", "paused"].includes(project.status);
  const data = { project: project.id };
  const step = currentStep(project);
  const out = [];
  const reasonId = `projects-reason-${project.id}`;
  if (project.status === "active" && step) {
    if (step.kind === "time")
      out.push(
        button(ctx, "time", ctx.t("Dedica tempo", "Dedicate time"), {
          data,
          kind: "primary",
          icon: "clock",
          disabled: budget.available < 1,
          describedBy: budget.available < 1 ? reasonId : "",
        }),
      );
    if (step.kind === "check")
      out.push(
        button(ctx, "check", ctx.t("Tira la prova", "Roll the check"), {
          data,
          kind: "primary",
          icon: "dice",
        }),
      );
    if (step.kind === "milestone")
      out.push(
        button(ctx, "milestone", ctx.t("Segna come fatto", "Mark as done"), {
          data,
          kind: "primary",
          icon: "check",
        }),
      );
    if (step.kind === "fixed")
      out.push(
        button(ctx, "fixed", ctx.t(`Avanza di ${step.increase}`, `Advance by ${step.increase}`), {
          data,
          kind: "primary",
          icon: "plus",
        }),
      );
  }
  if (project.status === "active")
    out.push(button(ctx, "pause", ctx.t("Metti in pausa", "Pause"), { data }));
  if (project.status === "paused")
    out.push(button(ctx, "resume", ctx.t("Riprendi", "Resume"), { data, kind: "primary" }));
  if (open && (project.kind === "custom" || ctx.role === "dm") && project.kind !== "craft")
    out.push(button(ctx, "add-step", ctx.t("Aggiungi passo", "Add step"), { data }));
  if (correctable(project) && ctx.role === "dm")
    out.push(button(ctx, "correct", ctx.t("Correggi", "Correct"), { data }));
  if (
    project.kind === "craft" &&
    (open || (project.status === "completed" && project.craft.delivered))
  )
    out.push(
      button(ctx, "abandon", ctx.t("Annulla fabbricazione", "Cancel crafting"), {
        data,
        kind: "danger",
      }),
    );
  else if (open)
    out.push(button(ctx, "abandon", ctx.t("Abbandona", "Abandon"), { data, kind: "danger" }));
  // PG-83: why «Dedica tempo» waits, and the button that gives the hours, next to it.
  const personal = !budget.campaign;
  const reason =
    project.status === "active" && step?.kind === "time" && budget.available < 1
      ? `<div class="projects-reason" id="${esc(ctx, reasonId)}"><p>${
          personal
            ? ctx.t(
                "Nessuna ora disponibile: prima registra il tempo che il personaggio ha passato (es. 8 h di studio), poi dedicalo al progetto.",
                "No hours available: first record the time the character spent (e.g. 8 h of study), then dedicate it to the project.",
              )
            : ctx.t(
                "Nessuna ora disponibile: il DM fa passare il tempo o concede tempo libero; poi le ore si dedicano qui.",
                "No hours available: the DM advances time or grants downtime; then the hours are dedicated here.",
              )
        }</p>${
          personal && actor.owner === ctx.role
            ? button(ctx, "grant", ctx.t("Registra tempo personale", "Record personal time"), {
                data: { actor: actor.id },
                icon: "clock",
              })
            : !personal && ctx.role === "dm"
              ? button(ctx, "grant", ctx.t("Concedi tempo", "Grant time"), {
                  data: { actor: actor.id },
                  icon: "clock",
                })
              : ""
        }</div>`
      : "";
  return out.length ? `<div class="toolbar projects-actions">${out.join("")}</div>${reason}` : "";
}
function historyBlock(ctx, project, records) {
  const steps = project.steps
    .map((step, index) => {
      const done = stepDone(project, step);
      return `<li class="${done ? "is-done" : ""}"><span class="projects-step-mark" aria-hidden="true">${done ? "✓" : index + 1}</span><span><strong>${lbl(ctx, step.label)}</strong> · ${ctx.t(...KIND_NAMES[step.kind])} · ${stepLine(ctx, project, step)}</span></li>`;
    })
    .join("");
  const work = project.work
    .map(
      (row) =>
        `<li>${hoursText(ctx, row.hours)} · ${lbl(ctx, project.steps.find((s) => s.id === row.stepId)?.label ?? "")} · ${row.clockAt == null ? esc(ctx, row.note || ctx.t("fuori dall'orologio", "outside the clock")) : ctx.t("orologio", "clock") + " " + clockText(ctx, row.clockAt)} · ${roleName(ctx, row.by)}</li>`,
    )
    .join("");
  const rolls = (records?.rolls ?? [])
    .filter(
      (roll) =>
        roll.projectId === project.id && (roll.visibility !== "private" || roll.by === ctx.role),
    )
    .map((roll) => {
      const live = project.steps.some((step) =>
        (step.results ?? []).some((row) => row.rollId === roll.id),
      );
      const sign = roll.modifier < 0 ? "−" : "+";
      return `<li class="${live ? "" : "is-withdrawn"}">d20 [${roll.values.join(", ")}] ${sign} ${Math.abs(roll.modifier)} = ${roll.total} · CD ${roll.dc} · ${roll.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")} · ${roll.mode === "physical" ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}${roll.status === "reused" ? " · " + ctx.t("facce riusate", "faces reused") : ""}${live ? "" : " · " + ctx.t("annullato: le facce restano e un nuovo tiro digitale uguale le riusa una volta", "undone: the faces stay and an identical new digital roll reuses them once")}</li>`;
    })
    .join("");
  const corrections = project.corrections
    .map(
      (row) =>
        `<li>${ctx.t("Correzione del DM", "DM correction")} · ${lbl(ctx, project.steps.find((s) => s.id === row.stepId)?.label ?? "")} ${row.before} → ${row.after} · ${esc(ctx, row.reason)}</li>`,
    )
    .join("");
  const craft = project.craft
    ? `<li>${ctx.t("Materie prime consumate", "Raw materials consumed")}: ${
        [
          ...project.craft.materials.items.map((row) => `${lbl(ctx, row.name)} ×${row.quantity}`),
          ...(project.craft.materials.coinsCp
            ? [formatCp(project.craft.materials.coinsCp, ctx.lang)]
            : []),
        ].join(", ") || "—"
      }${project.craft.refunded ? " · " + ctx.t("restituite", "returned") : ""}</li>${project.craft.delivered ? `<li>${ctx.t("Consegnato nell'inventario", "Delivered to the inventory")}: ${lbl(ctx, project.craft.output.name)} ×${project.craft.delivered.quantity}</li>` : ""}`
    : "";
  return `<details class="projects-history"${disclosure(ctx, "history-" + project.id)}><summary>${ctx.t("Passi e cronologia", "Steps and history")}</summary><ol class="projects-step-list">${steps}</ol>${craft ? `<ul class="projects-lines">${craft}</ul>` : ""}${work ? `<h4>${ctx.t("Tempo speso", "Time spent")}</h4><ul class="projects-lines">${work}</ul>` : ""}${rolls ? `<h4>${ctx.t("Tiri", "Rolls")}</h4><ul class="projects-lines">${rolls}</ul>` : ""}${corrections ? `<h4>${ctx.t("Correzioni", "Corrections")}</h4><ul class="projects-lines">${corrections}</ul>` : ""}${project.abandoned ? `<p class="muted">${ctx.t("Motivo", "Reason")}: ${esc(ctx, project.abandoned.reason)}</p>` : ""}</details>`;
}
function noteBlock(ctx, project, records) {
  const text = records?.notes?.[ctx.role]?.[project.id] ?? "";
  const id = `projects-note-${project.id}`;
  return `<details class="projects-note"${text ? " open" : ""}><summary>${ctx.t("Appunti (solo io)", "Notes (only me)")}</summary><form data-projects-form="note" data-project="${esc(ctx, project.id)}"><label class="field" for="${esc(ctx, id)}"><span>${ctx.t("Visibili solo a te: il DM e gli altri non li leggono.", "Visible to you only: the DM and others never read them.")}</span><textarea id="${esc(ctx, id)}" name="note" rows="2" maxlength="2000">${esc(ctx, text)}</textarea></label><button type="submit" class="button quiet">${ctx.t("Salva appunti", "Save notes")}</button></form></details>`;
}
function projectCard(ctx, project, actor, slice, records, budget) {
  const status = STATUS[project.status];
  const titleId = `projects-title-${project.id}`;
  const spent = projectSpentHours(project);
  const last = project.work.at(-1);
  return `<article class="projects-card is-${project.status}" data-project-card="${esc(ctx, project.id)}" aria-labelledby="${esc(ctx, titleId)}"><header class="projects-card-head"><span class="projects-emblem" aria-hidden="true">${project.status === "completed" ? ctx.icon("check") : ctx.icon(project.kind === "craft" ? "bag" : project.kind === "study" ? "book" : "flag")}</span><div><h3 id="${esc(ctx, titleId)}" tabindex="-1">${lbl(ctx, project.title)}</h3><p class="muted">${esc(ctx, sourceText(ctx, project.source))}</p></div><span class="badge projects-status">${ctx.t(...status)}</span></header>${meter(ctx, project)}${currentBlock(ctx, project)}<p class="muted projects-spent" data-projects-spent>${ctx.t("Tempo speso", "Time spent")}: ${hoursText(ctx, spent)}${last ? ` · ${ctx.t("ultimo lavoro", "last work")}: ${last.clockAt == null ? esc(ctx, last.note || ctx.t("fuori dall'orologio", "outside the clock")) : ctx.t("orologio", "clock") + " " + clockText(ctx, last.clockAt)}` : ""}</p>${project.craft ? `<p class="muted">${ctx.t("Strumento", "Tool")}: ${lbl(ctx, toolName(project.craft.tool))} · ${ctx.t("materie prime", "raw materials")}: ${formatCp(project.craft.materials.items.reduce((s, r) => s + r.quantity * r.unitCp, 0) + project.craft.materials.coinsCp, ctx.lang)}</p>` : ""}${projectActions(ctx, project, actor, budget)}${historyBlock(ctx, project, records)}${noteBlock(ctx, project, records)}</article>`;
}
function projectsPanel(ctx, actor, slice, records) {
  const budget = timeBudget(ctx.state, slice, actor.id);
  const mine = slice.projects.filter((project) => project.actorId === actor.id);
  const open = mine.filter((project) => ["active", "paused"].includes(project.status));
  const closed = mine.filter((project) => !["active", "paused"].includes(project.status));
  const control = ctx.canControl(actor);
  return `<section class="panel projects-list" aria-labelledby="projects-list-${esc(ctx, actor.id)}"><div class="section-heading"><h2 id="projects-list-${esc(ctx, actor.id)}" tabindex="-1">${ctx.t("Progetti", "Projects")}</h2>${control ? button(ctx, "new-project", ctx.t("Nuovo progetto", "New project"), { data: { actor: actor.id }, kind: "primary", icon: "plus" }) : ""}</div>${
    open.length
      ? `<div class="projects-cards">${open.map((project) => projectCard(ctx, project, actor, slice, records, budget)).join("")}</div>`
      : `<p class="empty-state">${ctx.t("Nessun progetto in corso. Un progetto tiene insieme obiettivo, passi, tempo speso e risultato.", "No project under way. A project keeps goal, steps, time spent and result together.")}</p>`
  }${closed.length ? `<details class="projects-closed"${disclosure(ctx, "closed-" + actor.id)}><summary>${ctx.t("Conclusi", "Closed")} (${closed.length})</summary><div class="projects-cards">${closed.map((project) => projectCard(ctx, project, actor, slice, records, budget)).join("")}</div></details>` : ""}</section>`;
}
function recipeCard(ctx, actor, recipe, control) {
  const result = checkRecipe(ctx.state.actors[actor.id], recipe);
  const id = `projects-recipe-${recipe.id.replace(/[^a-z0-9-]/gi, "-")}`;
  const blocked = !result.canStart;
  const valueText = recipe.output.valueCp ? formatCp(recipe.output.valueCp, ctx.lang) : "—";
  return `<li class="projects-recipe${blocked ? " is-blocked" : ""}" data-recipe-card="${esc(ctx, recipe.id)}"><div class="projects-recipe-head">${control ? button(ctx, "craft", ctx.t("Fabbrica", "Craft"), { data: { actor: actor.id, recipe: recipe.id }, kind: blocked ? "quiet" : "primary", icon: "bag", disabled: blocked, describedBy: id, label: ctx.t(`Fabbrica: ${plainText(recipe.output.name, "it")}`, `Craft: ${plainText(recipe.output.name, "en")}`) }) : ""}<div><strong>${lbl(ctx, recipe.output.name)}</strong><p class="muted">${ctx.t("Valore", "Value")} ${valueText} · ${ctx.t("tempo", "time")} ${hoursText(ctx, recipe.hours)} (${recipe.hours / WORKDAY_HOURS} ${recipe.hours === WORKDAY_HOURS ? ctx.t("giorno", "day") : ctx.t("giorni", "days")})</p></div></div><ul class="projects-checks" id="${esc(ctx, id)}">${result.checks.map((check) => `<li class="${check.ok ? "is-ok" : "is-missing"}"><span aria-hidden="true">${check.ok ? "✓" : "✗"}</span> <span class="projects-sr">${check.ok ? ctx.t("Soddisfatto:", "Met:") : ctx.t("Manca:", "Missing:")}</span> ${lbl(ctx, check.text)}</li>`).join("")}</ul><p class="muted projects-rule">${esc(ctx, sourceText(ctx, recipe.source))}${recipe.rule === "potion" ? " · " + ctx.t("Realizzare pozioni di guarigione", "Brewing Potions of Healing") : ""}${recipe.book === "campaign" && recipe.output.description ? " · " + lbl(ctx, recipe.output.description) : ""}</p>${recipe.book === "campaign" && ctx.role === "dm" ? button(ctx, "retire-recipe", ctx.t("Ritira ricetta", "Retire recipe"), { data: { recipe: recipe.id }, label: ctx.t(`Ritira la ricetta: ${plainText(recipe.output.name, "it")}`, `Retire the recipe: ${plainText(recipe.output.name, "en")}`) }) : ""}</li>`;
}
function recipesPanel(ctx, actor, slice, { page = false } = {}) {
  const control = ctx.canControl(actor);
  const recipes = allRecipes(slice);
  // PG-84 (Mastercrafted): the recipe book is a page of its own; the Downtime page shows a
  // button to it instead of a collapsed heading that did not look clickable.
  if (!page)
    return `<section class="panel projects-recipe-panel"><div class="section-heading"><h2>${ctx.t("Ricettario", "Recipe book")}</h2><button type="button" class="button primary" data-projects-open-recipes="${esc(ctx, actor.id)}">${ctx.t("Apri il Ricettario", "Open the recipe book")}</button></div><p class="muted">${ctx.t(`${recipes.length} ricette: pozioni con la borsa da erborista e quelle della campagna.`, `${recipes.length} recipes: potions with the Herbalism Kit and the campaign's own.`)}</p></section>`;
  const books = [
    ["srd:herbalism-kit", ctx.t("Borsa da erborista · SRD 2024", "Herbalism Kit · SRD 2024")],
    ["campaign", ctx.t("Ricette della campagna (DM)", "Campaign recipes (DM)")],
  ];
  const body = books
    .map(([book, title]) => {
      const rows = recipes.filter((recipe) => recipe.book === book);
      return rows.length
        ? `<h3 class="projects-book">${title}</h3><ul class="projects-recipes">${rows.map((recipe) => recipeCard(ctx, actor, recipe, control)).join("")}</ul>`
        : "";
    })
    .join("");
  return `<section class="panel projects-recipe-panel"><div class="section-heading projects-recipe-intro"><div><h2>${ctx.t("Ricettario", "Recipe book")}</h2><p class="muted">${ctx.t(`Fabbrica come: ${esc(ctx, actor.name)} · strumento, competenza e materie prime verificati su questa scheda; il tempo si dedica poi dal progetto.`, `Craft as: ${esc(ctx, actor.name)} · tool, proficiency and raw materials checked on this sheet; time is dedicated afterwards from the project.`)}</p></div><div class="toolbar">${ctx.role === "dm" ? button(ctx, "new-recipe", ctx.t("Nuova ricetta", "New recipe"), { icon: "plus" }) : ""}${undoControl(ctx)}</div></div>${body || `<p class="muted">${ctx.t("Nessuna ricetta.", "No recipes.")}</p>`}</section>`;
}
export const RECIPES_TAB = "projects-recipes";
export function renderRecipeBook(ctx, actor) {
  const slice = projectsOf(ctx.state);
  if (!slice) return "";
  const canonical = ctx.state.actors[actor.id] ?? actor;
  return `<div class="projects" data-projects-root data-actor="${esc(ctx, canonical.id)}">${recipesPanel(ctx, canonical, slice, { page: true })}</div>`;
}
/** PG-83 (Crash's Tracking, LegendKeeper): the active projects' progress on the main sheet. */
export function renderProjectMeters(ctx, actor) {
  const slice = projectsOf(ctx.state);
  if (!slice || !actor) return "";
  const open = slice.projects.filter(
    (project) => project.actorId === actor.id && project.status === "active",
  );
  if (!open.length) return "";
  return `<section class="projects-meters" aria-label="${esc(ctx, ctx.t("Progetti in corso", "Projects under way"))}"><span class="shp-row-label">${ctx.t("Progetti", "Projects")}</span>${open
    .slice(0, 3)
    .map((project) => {
      const step = currentStep(project);
      const p = step ? stepProgress(project, step) : { value: 1, max: 1 };
      return `<button type="button" class="projects-meter" data-projects-meter="${esc(ctx, actor.id)}"><span>${lbl(ctx, project.title)}</span><progress max="${p.max}" value="${p.value}" aria-label="${esc(ctx, plainText(project.title, ctx.lang))}"></progress><small>${step ? stepLine(ctx, project, step) : ""}</small></button>`;
    })
    .join("")}</section>`;
}
function changeLog(ctx, actor, slice) {
  const rows = slice.log.filter((row) => row.actorId === actor.id).reverse();
  const shown = rows.filter((row) => !row.dismissed).slice(0, 30);
  const hidden = rows.length - rows.filter((row) => !row.dismissed).length;
  return `<section class="panel projects-log"><details${disclosure(ctx, "log-" + actor.id)}><summary><h2>${ctx.t("Registro delle modifiche", "Change log")} (${shown.length})</h2></summary>${
    shown.length
      ? `<ul class="projects-log-list">${shown.map((row) => `<li><span class="projects-log-when">${esc(ctx, whenText(ctx, row.at))} · ${roleName(ctx, row.by)}</span><span>${lbl(ctx, row.text)}</span>${ctx.role === "dm" ? button(ctx, "dismiss", ctx.t("Nascondi", "Dismiss"), { data: { entry: row.id }, label: ctx.t("Nascondi voce del registro", "Dismiss log entry") }) : ""}</li>`).join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna modifica registrata.", "No change recorded.")}</p>`
  }${hidden ? `<p class="muted">${ctx.t(`${hidden} voci nascoste dal DM.`, `${hidden} entries dismissed by the DM.`)}</p>` : ""}</details></section>`;
}
export function renderDowntime(ctx, actor) {
  const slice = projectsOf(ctx.state);
  const records = recordsOf(ctx.state);
  if (!slice) return "";
  const canonical = ctx.state.actors[actor.id] ?? actor;
  return `<div class="projects" data-projects-root data-actor="${esc(ctx, canonical.id)}">${timePanel(ctx, canonical, slice)}${projectsPanel(ctx, canonical, slice, records)}${recipesPanel(ctx, canonical, slice)}${changeLog(ctx, canonical, slice)}</div>`;
}

// ---------------------------------------------------------------- track tab

function nodeButton(ctx, node, selected) {
  const state = node.unlocked ? "unlocked" : node.available ? "available" : "locked";
  const stateText = node.unlocked
    ? ctx.t("sbloccato", "unlocked")
    : node.available
      ? ctx.t("disponibile", "available")
      : ctx.t("bloccato", "locked");
  return `<button type="button" class="projects-node is-${state}${selected ? " is-selected" : ""}" data-projects-action="select-node" data-node="${esc(ctx, node.id)}" aria-pressed="${selected}" style="--col:${node.column || "1 / -1"}"><span class="projects-node-mark" aria-hidden="true">${node.unlocked ? "✓" : node.available ? "◇" : "·"}</span><span class="projects-node-name">${lbl(ctx, node.name)}</span><span class="projects-node-state">${stateText} · ${node.cost} ${ctx.t(node.cost === 1 ? "scintilla" : "scintille", node.cost === 1 ? "spark" : "sparks")}</span></button>`;
}
export function renderTrack(ctx, actor) {
  const slice = projectsOf(ctx.state);
  if (!slice) return "";
  const canonical = ctx.state.actors[actor.id] ?? actor;
  const view = trackView(ctx.state, slice, canonical.id);
  const control = ctx.canControl(canonical);
  if (!view) {
    const options = TRACKS.map(
      (track) => `<option value="${esc(ctx, track.id)}">${lbl(ctx, track.name)}</option>`,
    ).join("");
    return `<section class="panel projects-track" data-projects-root data-actor="${esc(ctx, canonical.id)}"><div class="section-heading"><h2 tabindex="-1">${ctx.t("Doni e tracce", "Boons and tracks")}</h2></div><p class="empty-state">${ctx.t("Nessuna traccia non di classe per questo personaggio. Il DM ne assegna una quando la storia lo decide.", "No non-class track for this character. The DM assigns one when the story decides.")}</p>${ctx.role === "dm" && !isPersonal(canonical) ? `<form class="projects-assign" data-projects-form="assign"><label class="field"><span>${ctx.t("Traccia", "Track")}</span><select name="track">${options}</select></label><button type="submit" class="button primary">${ctx.t("Assegna traccia", "Assign track")}</button></form>` : ""}</section>`;
  }
  const u = uiFor(ctx);
  const selectedId =
    u.node[canonical.id] ?? view.nodes.find((node) => node.available)?.id ?? view.nodes[0].id;
  const selected = view.nodes.find((node) => node.id === selectedId) ?? view.nodes[0];
  const rings = view.track.rings
    .map((name, index) => {
      const nodes = view.nodes.filter((node) => node.ring === index + 1);
      return `<div class="projects-ring" data-ring="${index + 1}"><h3 class="projects-ring-name">${lbl(ctx, name)}</h3><div class="projects-ring-nodes">${nodes.map((node) => nodeButton(ctx, node, node.id === selected.id)).join("")}</div></div>`;
    })
    .join("");
  const entry = view.assignment.unlocked.find((row) => row.nodeId === selected.id);
  const detail = `<aside class="projects-node-detail" aria-live="polite" aria-labelledby="projects-node-title"><h3 id="projects-node-title" tabindex="-1">${lbl(ctx, selected.name)}</h3><p>${lbl(ctx, selected.text)}</p><p class="muted">${ctx.t("Costo", "Cost")}: ${selected.cost} × ${lbl(ctx, view.track.currency.name)}${selected.minLevel ? ` · ${ctx.t("livello", "level")} ${selected.minLevel}` : ""}${selected.story ? ` · ${ctx.t("anello della storia", "story ring")}` : ""}</p>${
    selected.unlocked
      ? `<p class="projects-ok">${ctx.icon("check")} ${ctx.t("Sbloccato", "Unlocked")} · ${esc(ctx, whenText(ctx, entry?.at))} · ${ctx.t("compare in Capacità", "listed in Features")}</p>${ctx.role === "dm" ? button(ctx, "refund-node", ctx.t("Restituisci il dono", "Refund the boon"), { data: { actor: canonical.id, node: selected.id }, kind: "danger" }) : ""}`
      : `<ul class="projects-checks" id="projects-node-why">${selected.requires
          .map((id) => {
            const other = view.nodes.find((node) => node.id === id);
            return `<li class="${other.unlocked ? "is-ok" : "is-missing"}"><span aria-hidden="true">${other.unlocked ? "✓" : "✗"}</span> ${ctx.t("Richiede", "Requires")} ${lbl(ctx, other.name)}</li>`;
          })
          .join("")}${selected.missing
          .filter((row) => !row.it.startsWith("Richiede"))
          .map(
            (row) =>
              `<li class="is-missing"><span aria-hidden="true">✗</span> ${lbl(ctx, row)}</li>`,
          )
          .join(
            "",
          )}${selected.available ? `<li class="is-ok"><span aria-hidden="true">✓</span> ${ctx.t("Prerequisiti soddisfatti", "Prerequisites met")}</li>` : ""}</ul>${control ? button(ctx, "unlock", ctx.t(`Sblocca (usa ${selected.cost} × ${plainText(view.track.currency.name, "it")})`, `Unlock (spend ${selected.cost} × ${plainText(view.track.currency.name, "en")})`), { data: { actor: canonical.id, node: selected.id }, kind: "primary", disabled: !selected.available, describedBy: selected.available ? "projects-node-title" : "projects-node-title projects-node-why" }) : ""}`
  }</aside>`;
  const dm =
    ctx.role === "dm"
      ? `<div class="toolbar projects-dm">${button(ctx, "story-gate", view.assignment.storyGate ? ctx.t("Richiudi l'anello esterno", "Close the outer ring") : ctx.t("Apri l'anello esterno (storia)", "Open the outer ring (story)"), { data: { actor: canonical.id, open: view.assignment.storyGate ? "0" : "1" } })}${view.assignment.unlocked.length ? "" : button(ctx, "unassign-track", ctx.t("Togli la traccia", "Remove the track"), { data: { actor: canonical.id } })}</div>`
      : "";
  return `<section class="panel projects-track" data-projects-root data-actor="${esc(ctx, canonical.id)}" aria-labelledby="projects-track-title"><div class="section-heading"><div><h2 id="projects-track-title" tabindex="-1">${lbl(ctx, view.track.name)}</h2><p class="muted">${ctx.t("Traccia non di classe", "Non-class track")} · ${esc(ctx, sourceText(ctx, view.track.source))}</p></div><div class="toolbar"><span class="badge projects-currency" data-projects-currency>${lbl(ctx, view.track.currency.name)}: ${view.count}</span>${undoControl(ctx)}</div></div><p class="muted">${lbl(ctx, view.track.description)} ${ctx.t("Ogni dono consuma le scintille raccolte; l'anello esterno si apre con la storia.", "Each boon spends gathered sparks; the outer ring opens with the story.")}</p>${offlineNote(ctx, isPersonal(canonical))}<div class="projects-tree-layout"><div class="projects-tree" role="group" aria-label="${esc(ctx, ctx.t("Albero dei doni", "Boon tree"))}">${rings}</div>${detail}</div>${dm}</section>`;
}

// ---------------------------------------------------------------- campaign section

export function renderCampaignDowntime(ctx) {
  const slice = projectsOf(ctx.state);
  if (!slice) return "";
  const members = partyMembers(ctx.state).filter((actor) =>
    canViewActor(actor, ctx.role, ctx.state),
  );
  const clock = clockSeconds(ctx.state);
  const rows = members
    .map((actor) => {
      const budget = timeBudget(ctx.state, slice, actor.id);
      const open = slice.projects.filter(
        (project) => project.actorId === actor.id && ["active", "paused"].includes(project.status),
      );
      return `<li class="projects-party-row" data-party-actor="${esc(ctx, actor.id)}"><div class="projects-party-name"><strong>${esc(ctx, actor.name)}</strong><span class="muted">${ctx.t("Disponibili", "Available")}: ${hoursText(ctx, budget.available)}</span></div><ul class="projects-party-projects">${
        open
          .map((project) => {
            const step = currentStep(project);
            const p = step ? stepProgress(project, step) : { value: 1, max: 1 };
            return `<li><span>${lbl(ctx, project.title)}</span><progress max="${p.max}" value="${p.value}" aria-label="${esc(ctx, plainText(project.title, ctx.lang))}"></progress><span class="muted">${step ? stepLine(ctx, project, step) : ""}</span></li>`;
          })
          .join("") ||
        `<li class="muted">${ctx.t("Nessun progetto in corso", "No project under way")}</li>`
      }</ul>${button(ctx, "open-sheet", ctx.t("Apri i progetti", "Open projects"), { data: { actor: actor.id }, label: ctx.t(`Apri i progetti di ${actor.name}`, `Open ${actor.name}'s projects`) })}</li>`;
    })
    .join("");
  const dm = ctx.role === "dm";
  return `<section class="panel projects-party" data-projects-root aria-labelledby="projects-party-title"><div class="section-heading"><div><h2 id="projects-party-title" tabindex="-1">${ctx.t("Tempo libero del gruppo", "Party downtime")}</h2><p class="muted">${ctx.t("Orologio della campagna", "Campaign clock")}: ${Math.floor(clock / HOUR)} h · ${clockText(ctx, clock)}</p></div>${dm ? `<div class="toolbar">${button(ctx, "advance-clock", ctx.t("Fai passare il tempo", "Advance time"), { icon: "clock" })}${button(ctx, "grant-party", ctx.t("Concedi o togli tempo al gruppo", "Grant or withhold party time"), { kind: "primary" })}${undoControl(ctx)}</div>` : ""}</div>${offlineNote(ctx, false)}<ul class="projects-party-list">${rows || `<li class="muted">${ctx.t("Nessun personaggio nel gruppo.", "No character in the party.")}</li>`}</ul></section>`;
}

// ---------------------------------------------------------------- commands

function actorOf(ctx, id) {
  const actor = ctx.state.actors[id];
  if (!actor) throw fail("Personaggio non disponibile.", "Character unavailable.");
  return actor;
}
// Keyboard focus survives the shell's full re-render: after the command (and after a dialog
// closes, which returns focus to a replaced opener) the named control or heading gets it.
// A microtask runs once the submit or click handler has finished (the shell closes the
// dialog synchronously in it) and, unlike a timer, is never throttled in a background tab.
function focusAfter(selector) {
  ui.focus = selector;
  if (typeof document === "undefined") return;
  queueMicrotask(() => {
    if (ui.focus !== selector) return;
    ui.focus = null;
    document.querySelector("#content " + selector)?.focus({ preventScroll: false });
  });
}
/** Shared or local commit on the two slices; a private personal sheet changes locally. */
function commitProjects(ctx, text, mutate, { actor = null, afterCommit = null } = {}) {
  let result;
  ctx.commit(
    text,
    (draft) => {
      result = mutate(draft, draft.ext[ID], draft.ext[RECORDS]);
    },
    {
      ...(actor && isPersonal(actor) ? { local: true, visibility: "private" } : {}),
      ...(afterCommit ? { afterCommit } : {}),
    },
  );
  return result;
}
function attempt(ctx, run) {
  try {
    return run();
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError) throw error;
    ctx.toast(
      ctx.label(error?.it ? { it: error.it, en: error.en } : (error?.message ?? String(error))),
      true,
    );
    return false;
  }
}
const cardFocus = (projectId) => `[data-project-card="${projectId}"] h3`;
const numberField = (form, name) => {
  const raw = form.get(name);
  return raw === null || String(raw).trim() === "" ? NaN : Number(raw);
};
function stepFields(ctx) {
  const abilities = ABILITIES.map(
    (id) => `<option value="${id}">${abilityName(ctx, id)}</option>`,
  ).join("");
  return `<fieldset class="projects-fieldset"><legend>${ctx.t("Passo", "Step")}</legend><label class="field"><span>${ctx.t("Nome del passo", "Step name")}</span><input name="stepLabel" maxlength="80"></label><label class="field"><span>${ctx.t("Tipo di avanzamento", "Progression type")}</span><select name="stepKind"><option value="time">${ctx.t("Tempo (ore di lavoro)", "Time (working hours)")}</option><option value="fixed">${ctx.t("Valore fisso (aumento e traguardo)", "Fixed value (increase and target)")}</option><option value="check">${ctx.t("Prova (CD e successi)", "Check (DC and successes)")}</option><option value="milestone">${ctx.t("Traguardo da segnare", "Milestone to mark")}</option></select></label><div class="form-grid projects-step-grid"><label class="field"><span>${ctx.t("Ore (tempo)", "Hours (time)")}</span><input type="number" name="hours" min="1" max="2000" value="8"></label><label class="field"><span>${ctx.t("Aumento (valore fisso)", "Increase (fixed value)")}</span><input type="number" name="increase" min="1" value="1"></label><label class="field"><span>${ctx.t("Traguardo (valore fisso)", "Target (fixed value)")}</span><input type="number" name="target" min="1" value="5"></label><label class="field"><span>${ctx.t("Caratteristica (prova)", "Ability (check)")}</span><select name="ability">${abilities}</select></label><label class="field"><span>CD (${ctx.t("prova", "check")})</span><input type="number" name="dc" min="1" max="30" value="10"></label><label class="field"><span>${ctx.t("Successi richiesti (prova)", "Successes required (check)")}</span><input type="number" name="successes" min="1" max="20" value="1"></label></div><p class="muted">${ctx.t("Si usano solo i campi del tipo scelto.", "Only the fields of the chosen type are used.")}</p></fieldset>`;
}
const stepInput = (form) => ({
  kind: form.get("stepKind"),
  label: form.get("stepLabel"),
  hours: numberField(form, "hours"),
  increase: numberField(form, "increase"),
  target: numberField(form, "target"),
  ability: form.get("ability"),
  dc: numberField(form, "dc"),
  successes: numberField(form, "successes"),
});
function openNewProject(ctx, actorId) {
  const actor = actorOf(ctx, actorId);
  const known = knows(ctx.state, actor.id);
  const profs = toolProficiencies(actor);
  const langs = LEARNABLE_LANGUAGES.filter((row) => !known.includes(row.id))
    .map((row) => `<option value="${esc(ctx, row.id)}">${lbl(ctx, row.name)}</option>`)
    .join("");
  const tools = TOOL_IDS.filter((id) => !profs.has(id))
    .map((id) => `<option value="${esc(ctx, id)}">${lbl(ctx, toolName(id))}</option>`)
    .join("");
  const body = `<p class="muted">${ctx.t(`Per ${esc(ctx, actor.name)}. Scegli un'attività scritta dal DM o un progetto libero concordato al tavolo.`, `For ${esc(ctx, actor.name)}. Choose an activity written by the DM or a free project agreed at the table.`)}</p><fieldset class="projects-fieldset"><legend>${ctx.t("Tipo di progetto", "Project type")}</legend><label class="projects-radio projects-choice"><input type="radio" name="type" value="learn-language" checked><span><strong>${lbl(ctx, ACTIVITIES[0].name)}</strong><span class="muted">${ctx.t("trovare un insegnante, 80 h di studio, prova di Intelligenza CD 10", "find a teacher, 80 h of study, Intelligence check DC 10")}</span></span></label><label class="field"><span>${ctx.t("Lingua", "Language")}</span><select name="language">${langs}</select></label><label class="projects-radio projects-choice"><input type="radio" name="type" value="tool-training"><span><strong>${lbl(ctx, ACTIVITIES[1].name)}</strong><span class="muted">${ctx.t("trovare un maestro, 80 h di pratica, prova CD 10", "find a master, 80 h of practice, DC 10 check")}</span></span></label><label class="field"><span>${ctx.t("Strumento", "Tool")}</span><select name="tool">${tools}</select></label><label class="projects-radio projects-choice"><input type="radio" name="type" value="custom"><span><strong>${ctx.t("Progetto libero", "Free project")}</strong><span class="muted">${ctx.t("titolo e primo passo qui sotto; altri passi dopo", "title and first step below; more steps later")}</span></span></label><label class="field"><span>${ctx.t("Titolo (progetto libero)", "Title (free project)")}</span><input name="title" maxlength="80"></label></fieldset>${stepFields(ctx)}<p class="muted">${ctx.t("Le attività scritte dal DM sono regole della campagna, non SRD 5.2.1.", "Activities written by the DM are campaign rules, not SRD 5.2.1.")}</p>`;
  ctx.dialog(ctx.t("Nuovo progetto", "New project"), body, {
    submitLabel: ctx.t("Crea progetto", "Create project"),
    onSubmit: (form) => {
      const type = form.get("type");
      const input =
        type === "custom"
          ? { actorId, title: form.get("title"), step: stepInput(form) }
          : {
              actorId,
              activityId: type,
              param: form.get(type === "learn-language" ? "language" : "tool"),
            };
      const project = commitProjects(
        ctx,
        ctx.t("Nuovo progetto", "New project"),
        (draft, slice) => createProject(draft, slice, ctx.role, input),
        { actor },
      );
      focusAfter(cardFocus(project.id));
      ctx.toast(
        ctx.t(`Progetto creato: ${project.title.it}`, `Project created: ${project.title.en}`),
      );
    },
  });
}
function openDedicate(ctx, projectId) {
  const slice = projectsOf(ctx.state);
  const project = projectById(slice, projectId);
  const budget = timeBudget(ctx.state, slice, project.actorId);
  const step = currentStep(project);
  if (project.status !== "active" || step?.kind !== "time")
    throw fail("Il passo attuale non richiede tempo.", "The current step does not need time.");
  requireTool(ctx.state, project);
  if (budget.available < 1)
    throw fail(
      "Nessuna ora disponibile: il DM fa passare il tempo o concede tempo libero.",
      "No hours available: the DM advances time or grants downtime.",
    );
  const remaining = step.targetHours - stepProgress(project, step).value;
  const proposal = Math.max(1, Math.min(budget.available, remaining, WORKDAY_HOURS));
  const body = `<p><strong>${lbl(ctx, project.title)}</strong> · ${lbl(ctx, step.label)} · ${stepLine(ctx, project, step)}</p><dl class="projects-breakdown"><div><dt>${ctx.t("Ore disponibili", "Hours available")}</dt><dd data-projects-dialog-available>${hoursText(ctx, budget.available)}</dd></div><div><dt>${ctx.t("Mancano al passo", "Left in the step")}</dt><dd>${hoursText(ctx, remaining)}</dd></div>${budget.campaign ? `<div><dt>${ctx.t("Orologio", "Clock")}</dt><dd>${clockText(ctx, budget.clock)}</dd></div>` : ""}</dl><label class="field"><span>${ctx.t("Ore da dedicare", "Hours to dedicate")}</span><input type="number" name="hours" min="1" max="${Math.max(1, Math.min(budget.available, remaining))}" value="${proposal}" required></label><label class="field"><span>${ctx.t("Nota (facoltativa)", "Note (optional)")}</span><input name="note" maxlength="120"></label><p class="muted">${ctx.t("Il tempo dedicato resta speso anche se il progetto viene poi abbandonato.", "Dedicated time stays spent even if the project is later abandoned.")}</p>`;
  ctx.dialog(ctx.t("Dedica tempo", "Dedicate time"), body, {
    submitLabel: ctx.t("Dedica", "Dedicate"),
    onSubmit: (form) => {
      const hours = numberField(form, "hours");
      const actor = actorOf(ctx, project.actorId);
      const result = commitProjects(
        ctx,
        ctx.t(`${project.title.it}: ${hours} h`, `${project.title.en}: ${hours} h`),
        (draft, s) =>
          dedicateTime(draft, s, ctx.role, { projectId, hours, note: form.get("note") }),
        { actor },
      );
      focusAfter(cardFocus(projectId));
      ctx.toast(
        completionText(ctx, project, actor, result?.completed) ??
          ctx.t(`${hours} h dedicate.`, `${hours} h dedicated.`),
      );
    },
  });
}
function completionText(ctx, project, actor, completed) {
  if (!completed) return null;
  if (project.kind === "craft")
    return ctx.t(
      `${plainText(project.craft.output.name, "it")} aggiunta all'inventario di ${actor.name}.`,
      `${plainText(project.craft.output.name, "en")} added to ${actor.name}'s inventory.`,
    );
  if (completed.featureId)
    return ctx.t(
      `Progetto completato: ora compare in Capacità.`,
      `Project completed: now listed in Features.`,
    );
  return ctx.t("Progetto completato.", "Project completed.");
}
function logRollOf(record, actor, project, step) {
  return {
    id: record.id,
    source: ID,
    kind: "check",
    projectRollId: record.id,
    actorId: actor.id,
    actorName: actor.name,
    actionName: L(
      `${project.title.it} · ${plainText(step.label, "it")}`,
      `${project.title.en} · ${plainText(step.label, "en")}`,
    ),
    label: L(
      `${project.title.it} · ${plainText(step.label, "it")}`,
      `${project.title.en} · ${plainText(step.label, "en")}`,
    ),
    formula: `1d20${record.modifier < 0 ? "−" : "+"}${Math.abs(record.modifier)}`,
    controller: record.by,
    owner: record.by,
    visibility: record.visibility,
    mode: record.mode,
    dice: [{ count: 1, sides: 20 }],
    values: [...record.values],
    natural: record.values[0],
    modifier: record.modifier,
    total: record.total,
    dc: record.dc,
    success: record.success,
    ability: record.ability,
    rollMode: "normal",
    status: record.status === "reused" ? "reused" : "accepted",
  };
}
/** Records the check through the common commit; the log roll joins the commit's own log
 * entry (append-only evidence) and is announced with "roll-accepted" (dice, chat). */
export function rollCheck(ctx, projectId, { mode, face }) {
  const slice = projectsOf(ctx.state);
  const project = projectById(slice, projectId);
  const actor = actorOf(ctx, project.actorId);
  let roll = null,
    logId = null,
    result = null;
  const title = ctx.t(`${project.title.it}: prova`, `${project.title.en}: check`);
  commitProjects(
    ctx,
    title,
    (draft, s, records) => {
      result = recordCheck(draft, s, records, ctx.role, {
        projectId,
        mode,
        face,
        die: ctx.rollDie ?? rollDie,
      });
      const step = draft.ext[ID].projects
        .find((row) => row.id === projectId)
        .steps.find((row) => row.id === result.record.stepId);
      roll = logRollOf(result.record, draft.actors[project.actorId], result.project, step);
    },
    {
      actor,
      afterCommit: (state) => {
        const entry = state.log?.at(-1);
        if (!entry || entry.label !== title || !roll) return;
        entry.rolls = [copy(roll)];
        logId = entry.id;
        const record = state.ext[RECORDS].rolls.find((row) => row.id === roll.id);
        if (record) record.logId = entry.id;
      },
    },
  );
  if (roll) area?.emit?.("roll-accepted", { logId, roll: copy(roll) });
  return result;
}
function openCheck(ctx, projectId) {
  const slice = projectsOf(ctx.state);
  const project = projectById(slice, projectId);
  const step = currentStep(project);
  if (project.status !== "active" || step?.kind !== "check")
    throw fail("Il passo attuale non richiede una prova.", "The current step needs no check.");
  const modifier = checkModifier(ctx.state, project, step);
  const sign = modifier < 0 ? "−" : "+";
  const body = `<p><strong>${lbl(ctx, project.title)}</strong> · ${lbl(ctx, step.label)}</p><p class="projects-formula"><strong>d20 ${sign} ${Math.abs(modifier)}</strong> ${ctx.t("contro", "vs")} CD ${step.dc} · ${abilityName(ctx, step.ability)}</p><p class="muted">${ctx.t(`Successi: ${stepProgress(project, step).value} di ${step.successes}. Modificatore di caratteristica, senza competenza dedotta.`, `Successes: ${stepProgress(project, step).value} of ${step.successes}. Ability modifier, no proficiency assumed.`)}</p><fieldset class="projects-fieldset"><legend>${ctx.t("Dadi", "Dice")}</legend><label class="projects-radio"><input type="radio" name="mode" value="digital" checked> ${ctx.t("Dado digitale", "Digital die")}</label><label class="projects-radio"><input type="radio" name="mode" value="physical"> ${ctx.t("Dado fisico: inserisco la faccia", "Physical die: I enter the face")}</label><label class="field"><span>${ctx.t("Faccia del d20 fisico", "Physical d20 face")}</span><input type="number" name="face" min="1" max="20" inputmode="numeric"></label></fieldset><p class="muted">${ctx.t("Il tiro va nel registro della sessione. Un tiro accettato non si cambia: Annulla toglie l'esito e un nuovo tiro digitale uguale riusa le stesse facce una volta.", "The roll goes to the session log. An accepted roll never changes: Undo removes the result and an identical new digital roll reuses the same faces once.")}</p>`;
  ctx.dialog(ctx.t("Tira la prova", "Roll the check"), body, {
    submitLabel: ctx.t("Tira / registra", "Roll / record"),
    onSubmit: (form) => {
      const mode = form.get("mode");
      const result = rollCheck(ctx, projectId, { mode, face: numberField(form, "face") });
      focusAfter(cardFocus(projectId));
      const r = result.record;
      ctx.toast(
        ctx.t(
          `d20 ${r.values[0]} ${sign} ${Math.abs(r.modifier)} = ${r.total} contro CD ${r.dc}: ${r.success ? "successo" : "fallimento"}.`,
          `d20 ${r.values[0]} ${sign} ${Math.abs(r.modifier)} = ${r.total} vs DC ${r.dc}: ${r.success ? "success" : "failure"}.`,
        ) +
          (result.completed
            ? " " + completionText(ctx, project, actorOf(ctx, project.actorId), result.completed)
            : ""),
      );
    },
  });
}
function openReason(ctx, { title, intro, submitLabel, extra = "", onReason }) {
  ctx.dialog(
    title,
    `${intro}${extra}<label class="field"><span>${ctx.t("Motivo (resta nel registro)", "Reason (stays in the log)")}</span><textarea name="reason" maxlength="200" rows="2" required></textarea></label>`,
    { submitLabel, onSubmit: (form) => onReason(form) },
  );
}
function openAbandon(ctx, projectId) {
  const slice = projectsOf(ctx.state);
  const project = projectById(slice, projectId);
  const actor = actorOf(ctx, project.actorId);
  const craft = project.kind === "craft";
  const delivered = craft && project.status === "completed";
  openReason(ctx, {
    title: craft
      ? ctx.t("Annulla fabbricazione", "Cancel crafting")
      : ctx.t("Abbandona progetto", "Abandon project"),
    intro: `<p><strong>${lbl(ctx, project.title)}</strong></p><p class="muted">${
      craft
        ? delivered
          ? ctx.t(
              "L'oggetto fabbricato torna fuori dall'inventario e, se scegli, le materie prime tornano indietro.",
              "The crafted item leaves the inventory and, if you choose, the raw materials come back.",
            )
          : ctx.t(
              "Il lavoro si ferma; le ore dedicate restano spese.",
              "The work stops; the dedicated hours stay spent.",
            )
        : ctx.t(
            "Il progetto resta nei conclusi con il suo motivo; le ore dedicate restano spese.",
            "The project stays among the closed ones with its reason; dedicated hours stay spent.",
          )
    }</p>`,
    extra: craft
      ? `<label class="projects-radio"><input type="checkbox" name="refund" checked> ${ctx.t("Restituisci le materie prime", "Return the raw materials")}</label>`
      : "",
    submitLabel: craft
      ? ctx.t("Annulla fabbricazione", "Cancel crafting")
      : ctx.t("Abbandona", "Abandon"),
    onReason: (form) => {
      commitProjects(
        ctx,
        craft
          ? ctx.t(`${project.title.it}: annullato`, `${project.title.en}: cancelled`)
          : ctx.t(`${project.title.it}: abbandonato`, `${project.title.en}: abandoned`),
        (draft, s) =>
          abandonProject(draft, s, ctx.role, {
            projectId,
            reason: form.get("reason"),
            refund: craft ? form.get("refund") === "on" : false,
          }),
        { actor },
      );
      focusAfter(`#projects-list-${actor.id}`);
      ctx.toast(
        craft && form.get("refund") === "on"
          ? ctx.t(
              "Fabbricazione annullata: materie prime restituite.",
              "Crafting cancelled: raw materials returned.",
            )
          : ctx.t("Progetto chiuso con il suo motivo.", "Project closed with its reason."),
      );
    },
  });
}
function openCorrect(ctx, projectId) {
  const slice = projectsOf(ctx.state);
  const project = projectById(slice, projectId);
  const actor = actorOf(ctx, project.actorId);
  const step = currentStep(project) ?? project.steps.at(-1);
  const options = project.steps
    .map(
      (row) =>
        `<option value="${esc(ctx, row.id)}"${row === step ? " selected" : ""}>${lbl(ctx, row.label)} · ${ctx.t(...KIND_NAMES[row.kind])} · ${stepLine(ctx, project, row)}</option>`,
    )
    .join("");
  openReason(ctx, {
    title: ctx.t("Correzione del DM", "DM correction"),
    intro: `<p><strong>${lbl(ctx, project.title)}</strong></p><label class="field"><span>${ctx.t("Passo", "Step")}</span><select name="step">${options}</select></label><label class="field"><span>${ctx.t("Nuovo valore (ore, successi, valore; traguardo: 1 fatto, 0 da fare)", "New value (hours, successes, value; milestone: 1 done, 0 to do)")}</span><input type="number" name="value" min="0" required></label><p class="muted">${ctx.t("La correzione non consuma né restituisce ore di tempo libero.", "The correction neither spends nor returns downtime hours.")}${project.status === "completed" ? " " + ctx.t("Se un passo non risulta più fatto, il progetto si riapre e il suo beneficio esce dalla scheda.", "If a step is no longer done, the project reopens and its benefit leaves the sheet.") : ""}</p>`,
    submitLabel: ctx.t("Correggi", "Correct"),
    onReason: (form) => {
      const result = commitProjects(
        ctx,
        ctx.t(`${project.title.it}: correzione del DM`, `${project.title.en}: DM correction`),
        (draft, s) =>
          correctStep(draft, s, ctx.role, {
            projectId,
            stepId: form.get("step"),
            value: numberField(form, "value"),
            reason: form.get("reason"),
          }),
        { actor },
      );
      focusAfter(cardFocus(projectId));
      ctx.toast(
        result?.reopened
          ? ctx.t(
              "Correzione registrata: progetto riaperto, beneficio tolto dalla scheda.",
              "Correction recorded: project reopened, benefit taken off the sheet.",
            )
          : ctx.t("Correzione registrata con il motivo.", "Correction recorded with its reason."),
      );
    },
  });
}
function openAddStep(ctx, projectId) {
  const slice = projectsOf(ctx.state);
  const project = projectById(slice, projectId);
  const actor = actorOf(ctx, project.actorId);
  ctx.dialog(
    ctx.t("Aggiungi passo", "Add step"),
    `<p><strong>${lbl(ctx, project.title)}</strong></p>${stepFields(ctx)}`,
    {
      submitLabel: ctx.t("Aggiungi", "Add"),
      onSubmit: (form) => {
        commitProjects(
          ctx,
          ctx.t(`${project.title.it}: nuovo passo`, `${project.title.en}: new step`),
          (draft, s) => addStep(draft, s, ctx.role, { projectId, step: stepInput(form) }),
          { actor },
        );
        focusAfter(cardFocus(projectId));
        ctx.toast(ctx.t("Passo aggiunto.", "Step added."));
      },
    },
  );
}
function openGrant(ctx, actorIds, { party = false } = {}) {
  const actors = actorIds.map((id) => actorOf(ctx, id));
  const personal = !party && isPersonal(actors[0]);
  const who = party
    ? `<fieldset class="projects-fieldset"><legend>${ctx.t("A chi", "To whom")}</legend>${actors.map((actor) => `<label class="projects-radio"><input type="checkbox" name="actor" value="${esc(ctx, actor.id)}" checked> ${esc(ctx, actor.name)} <span class="muted">· ${ctx.t("disponibili", "available")} ${hoursText(ctx, timeBudget(ctx.state, projectsOf(ctx.state), actor.id).available)}</span></label>`).join("")}</fieldset>`
    : `<p><strong>${esc(ctx, actors[0].name)}</strong> · ${ctx.t("disponibili", "available")} ${hoursText(ctx, timeBudget(ctx.state, projectsOf(ctx.state), actors[0].id).available)}</p>`;
  // Grant or withhold in the same dialog (Crash's "Adjust Progress" is one control for both
  // directions): withholding is a correction of hours the clock made available.
  const mode = `<fieldset class="projects-fieldset"><legend>${ctx.t("Che cosa fai", "What you do")}</legend><label class="projects-radio"><input type="radio" name="mode" value="grant" checked> ${personal ? ctx.t("Aggiungi ore", "Add hours") : ctx.t("Concedi ore", "Grant hours")}</label><label class="projects-radio"><input type="radio" name="mode" value="withhold"> ${ctx.t("Togli ore (correzione)", "Withhold hours (correction)")}</label></fieldset>`;
  const body = `${who}${mode}<label class="field"><span>${ctx.t("Ore di lavoro", "Working hours")}</span><input type="number" name="hours" min="1" max="720" value="8" required></label><label class="field"><span>${personal ? ctx.t("Che cosa hai fatto (resta nel registro)", "What you did (stays in the log)") : ctx.t("Motivo (resta nel registro)", "Reason (stays in the log)")}</span><textarea name="reason" maxlength="200" rows="2" required>${personal ? "" : esc(ctx, ctx.t("Tempo libero fuori scena", "Off-screen downtime"))}</textarea></label><p class="muted">${
    personal
      ? ctx.t(
          "Tempo della tua scheda personale: non cambia l'orologio della campagna.",
          "Time of your personal sheet: it does not change the campaign clock.",
        )
      : ctx.t(
          "Ore concesse o tolte fuori dall'orologio (per esempio tra le sessioni): non cambiano il tempo della campagna. Si tolgono ore non ancora dedicate, per esempio giorni di viaggio che non sono stati tempo libero.",
          "Hours granted or withheld outside the clock (for example between sessions): they do not change the campaign time. Only hours not yet dedicated are withheld, for example days of travel that were not downtime.",
        )
  }</p>`;
  ctx.dialog(
    personal
      ? ctx.t("Registra tempo personale", "Record personal time")
      : party
        ? ctx.t("Tempo libero del gruppo: concedi o togli", "Party downtime: grant or withhold")
        : ctx.t("Concedi o togli tempo libero", "Grant or withhold downtime"),
    body,
    {
      submitLabel: ctx.t("Registra", "Record"),
      onSubmit: (form) => {
        const ids = party ? form.getAll("actor") : actorIds;
        const size = numberField(form, "hours");
        const withhold = form.get("mode") === "withhold";
        const hours = withhold ? -size : size;
        commitProjects(
          ctx,
          personal
            ? ctx.t(`Tempo personale: ${hours} h`, `Personal time: ${hours} h`)
            : withhold
              ? ctx.t(`Tempo libero tolto: ${size} h`, `Downtime withheld: ${size} h`)
              : ctx.t(`Tempo libero concesso: ${size} h`, `Downtime granted: ${size} h`),
          (draft, s) =>
            grantTime(draft, s, ctx.role, { actorIds: ids, hours, reason: form.get("reason") }),
          { actor: personal ? actors[0] : null },
        );
        focusAfter(party ? "#projects-party-title" : `#projects-time-${actorIds[0]}`);
        ctx.toast(
          withhold
            ? ctx.t(`${size} h tolte, con il motivo.`, `${size} h withheld, with the reason.`)
            : ctx.t(`${size} h registrate.`, `${size} h recorded.`),
        );
      },
    },
  );
}
function openCraft(ctx, actorId, recipeId) {
  const slice = projectsOf(ctx.state);
  const actor = actorOf(ctx, actorId);
  const recipe = recipeById(slice, recipeId);
  const result = checkRecipe(actor, recipe);
  const label = {
    inventory: ctx.t("Materie prime dall'inventario", "Raw materials from the inventory"),
    purse: ctx.t(
      "Monete dalla borsa (compri le materie prime)",
      "Coins from the purse (you buy the raw materials)",
    ),
    mixed: ctx.t("Materie prime e, per il resto, monete", "Raw materials and coins for the rest"),
  };
  const first = result.plans.find((plan) => plan.ok)?.source;
  // "Materials and coins" is shown only when the materials cover part of the cost.
  const plans = result.plans
    .filter((plan) => plan.source !== "mixed" || (plan.itemsCp > 0 && plan.itemsCp < plan.needCp))
    .map((plan) => {
      const detail =
        plan.source === "purse"
          ? `${formatCp(plan.needCp, ctx.lang)} · ${ctx.t("nella borsa", "in the purse")} ${formatCp(plan.haveCp, ctx.lang)}`
          : [
              ...plan.items.map(
                (row) =>
                  `${lbl(ctx, actor.inventory.find((item) => item.id === row.rowId)?.name)} ×${row.quantity}`,
              ),
              ...(plan.coinsCp ? [formatCp(plan.coinsCp, ctx.lang)] : []),
            ].join(" + ") || ctx.t("nessuna materia prima adatta", "no suitable raw material");
      return `<label class="projects-radio projects-choice${plan.ok ? "" : " is-missing"}"><input type="radio" name="source" value="${plan.source}"${plan.source === first ? " checked" : ""}${plan.ok ? "" : ` disabled aria-describedby="projects-source-${plan.source}"`}><span><strong>${label[plan.source]}</strong><span class="muted" id="projects-source-${plan.source}">${esc(ctx, detail)}${plan.overshootCp ? ` · ${ctx.t("eccedenza", "excess")} ${formatCp(plan.overshootCp, ctx.lang)}` : ""}${plan.ok ? "" : " · " + ctx.t("non basta: scegli un’altra fonte o procurati il resto.", "not enough: choose another source or get the rest.")}</span></span></label>`;
    })
    .join("");
  const budget = timeBudget(ctx.state, slice, actorId);
  const body = `<p class="muted">${ctx.t("Fabbrica come", "Craft as")}: <strong>${esc(ctx, actor.name)}</strong></p><ul class="projects-checks">${result.checks.map((check) => `<li class="${check.ok ? "is-ok" : "is-missing"}"><span aria-hidden="true">${check.ok ? "✓" : "✗"}</span> ${lbl(ctx, check.text)}</li>`).join("")}</ul><fieldset class="projects-fieldset"><legend>${ctx.t("Come paghi le materie prime", "How you pay the raw materials")} (${formatCp(recipe.materialsCp, ctx.lang)})</legend>${plans}</fieldset><p>${ctx.t("Tempo", "Time")}: ${hoursText(ctx, recipe.hours)} ${ctx.t("di lavoro, da dedicare dal progetto", "of work, dedicated from the project")} · ${ctx.t("disponibili ora", "available now")} ${hoursText(ctx, budget.available)}</p><p class="muted">${esc(ctx, sourceText(ctx, recipe.source))}${recipe.rule === "potion" ? " · " + ctx.t("Realizzare pozioni di guarigione: borsa da erborista e 25 mo di materie prime in 1 giorno (8 ore di lavoro).", "Brewing Potions of Healing: Herbalism Kit and 25 GP of raw material over 1 day (8 hours of work).") : " · " + ctx.t("Materie prime per metà del costo; un giorno di 8 ore ogni 10 mo.", "Raw materials worth half the cost; one 8-hour day per 10 GP.")} ${ctx.t("Le materie prime si consumano ora; Annulla o «Annulla fabbricazione» le restituiscono.", "Raw materials are consumed now; Undo or “Cancel crafting” returns them.")}</p>`;
  ctx.dialog(
    ctx.t(
      `Fabbrica: ${plainText(recipe.output.name, "it")}`,
      `Craft: ${plainText(recipe.output.name, "en")}`,
    ),
    body,
    {
      submitLabel: ctx.t("Inizia la fabbricazione", "Start crafting"),
      onSubmit: (form) => {
        const project = commitProjects(
          ctx,
          ctx.t(
            `Fabbricare: ${plainText(recipe.output.name, "it")}`,
            `Craft: ${plainText(recipe.output.name, "en")}`,
          ),
          (draft, s) =>
            beginCraft(draft, s, ctx.role, { actorId, recipeId, source: form.get("source") }),
          { actor },
        );
        focusAfter(cardFocus(project.id));
        // PG-84: from the recipe book the new craft opens where its time is dedicated.
        if (project && ctx.view?.tab === RECIPES_TAB)
          ctx.navigate("characters", { id: actorId, tab: ID });
        ctx.toast(
          ctx.t(
            "Fabbricazione iniziata: materie prime consumate.",
            "Crafting started: raw materials consumed.",
          ),
        );
      },
    },
  );
}
function openNewRecipe(ctx) {
  const tools = TOOL_IDS.map(
    (id) => `<option value="${esc(ctx, id)}">${lbl(ctx, toolName(id))}</option>`,
  ).join("");
  const body = `<p class="muted">${ctx.t("Oggetto non magico che l'SRD non elenca fra gli strumenti: il GM assegna lo strumento; materie prime (metà del valore) e tempo (un giorno di 8 ore ogni 10 mo) seguono la formula SRD 5.2.1 EN 103 / IT 117.", "A nonmagical item the SRD does not list under the tools: the GM assigns the tool; raw materials (half the value) and time (one 8-hour day per 10 GP) follow the SRD 5.2.1 formula EN 103 / IT 117.")}</p><label class="field"><span>${ctx.t("Oggetto", "Item")}</span><input name="name" maxlength="80" required></label><label class="field"><span>${ctx.t("Strumento richiesto", "Required tool")}</span><select name="tool">${tools}</select></label><div class="form-grid"><label class="field"><span>${ctx.t("Valore (mo)", "Value (GP)")}</span><input type="number" name="valueGp" min="1" max="10000" value="10" required></label><label class="field"><span>${ctx.t("Peso (kg)", "Weight (kg)")}</span><input type="number" name="weightKg" min="0" max="500" step="0.05"></label></div><label class="field"><span>${ctx.t("Manuale richiesto (nome dell'oggetto, facoltativo)", "Required manual (item name, optional)")}</span><input name="manual" maxlength="80"></label><label class="field"><span>${ctx.t("Descrizione", "Description")}</span><textarea name="description" maxlength="300" rows="2"></textarea></label>`;
  ctx.dialog(ctx.t("Nuova ricetta della campagna", "New campaign recipe"), body, {
    submitLabel: ctx.t("Salva ricetta", "Save recipe"),
    onSubmit: (form) => {
      const recipe = commitProjects(
        ctx,
        ctx.t("Nuova ricetta della campagna", "New campaign recipe"),
        (draft, s) =>
          createCampaignRecipe(s, ctx.role, {
            name: form.get("name"),
            tool: form.get("tool"),
            valueGp: numberField(form, "valueGp"),
            weightKg: form.get("weightKg"),
            manual: form.get("manual"),
            description: form.get("description"),
          }),
      );
      ctx.toast(
        ctx.t(
          `Ricetta salvata: materie prime ${formatCp(recipe.materialsCp, "it")}, ${recipe.hours} h.`,
          `Recipe saved: raw materials ${formatCp(recipe.materialsCp, "en")}, ${recipe.hours} h.`,
        ),
      );
    },
  });
}
function openRefundNode(ctx, actorId, nodeId) {
  const slice = projectsOf(ctx.state);
  const view = trackView(ctx.state, slice, actorId);
  const node = view.nodes.find((row) => row.id === nodeId);
  openReason(ctx, {
    title: ctx.t("Restituisci il dono", "Refund the boon"),
    intro: `<p><strong>${lbl(ctx, node.name)}</strong></p><p class="muted">${ctx.t(`Tornano ${node.cost} × ${plainText(view.track.currency.name, "it")} nell'inventario e il dono esce da Capacità.`, `${node.cost} × ${plainText(view.track.currency.name, "en")} return to the inventory and the boon leaves Features.`)}</p>`,
    submitLabel: ctx.t("Restituisci", "Refund"),
    onReason: (form) => {
      commitProjects(
        ctx,
        ctx.t(`Dono restituito: ${node.name.it}`, `Boon refunded: ${node.name.en}`),
        (draft, s) =>
          refundNode(draft, s, ctx.role, { actorId, nodeId, reason: form.get("reason") }),
        { actor: actorOf(ctx, actorId) },
      );
      focusAfter("#projects-node-title");
      ctx.toast(ctx.t("Dono restituito con il motivo.", "Boon refunded with its reason."));
    },
  });
}

/** Every control of the area runs through here (the same handlers the tests call). */
export function handleProjectsAction(ctx, action, data = {}, form = null) {
  return attempt(ctx, () => {
    switch (action) {
      case "undo":
        ctx.undo();
        return true;
      case "advance-clock":
        ctx.openGameTime?.();
        return true;
      case "new-project":
        return openNewProject(ctx, data.actor);
      case "time":
        return openDedicate(ctx, data.project);
      case "check":
        return openCheck(ctx, data.project);
      case "milestone": {
        const slice = projectsOf(ctx.state);
        const project = projectById(slice, data.project);
        const result = commitProjects(
          ctx,
          ctx.t(`${project.title.it}: traguardo`, `${project.title.en}: milestone`),
          (draft, s) => markMilestone(draft, s, ctx.role, { projectId: data.project }),
          { actor: actorOf(ctx, project.actorId) },
        );
        focusAfter(cardFocus(data.project));
        ctx.toast(
          completionText(ctx, project, actorOf(ctx, project.actorId), result?.completed) ??
            ctx.t("Traguardo segnato.", "Milestone marked."),
        );
        return true;
      }
      case "fixed": {
        const slice = projectsOf(ctx.state);
        const project = projectById(slice, data.project);
        const result = commitProjects(
          ctx,
          ctx.t(`${project.title.it}: avanzamento`, `${project.title.en}: progress`),
          (draft, s) => advanceFixed(draft, s, ctx.role, { projectId: data.project }),
          { actor: actorOf(ctx, project.actorId) },
        );
        focusAfter(cardFocus(data.project));
        ctx.toast(
          completionText(ctx, project, actorOf(ctx, project.actorId), result?.completed) ??
            ctx.t("Avanzamento registrato.", "Progress recorded."),
        );
        return true;
      }
      case "pause":
      case "resume": {
        const slice = projectsOf(ctx.state);
        const project = projectById(slice, data.project);
        commitProjects(
          ctx,
          action === "pause"
            ? ctx.t(`${project.title.it}: in pausa`, `${project.title.en}: paused`)
            : ctx.t(`${project.title.it}: ripreso`, `${project.title.en}: resumed`),
          (draft, s) =>
            setPaused(draft, s, ctx.role, { projectId: data.project, paused: action === "pause" }),
          { actor: actorOf(ctx, project.actorId) },
        );
        focusAfter(cardFocus(data.project));
        return true;
      }
      case "abandon":
        return openAbandon(ctx, data.project);
      case "correct":
        return openCorrect(ctx, data.project);
      case "add-step":
        return openAddStep(ctx, data.project);
      case "grant":
        return openGrant(ctx, [data.actor]);
      case "grant-party": {
        const ids = partyMembers(ctx.state).map((actor) => actor.id);
        if (!ids.length) throw fail("Nessun personaggio nel gruppo.", "No character in the party.");
        return openGrant(ctx, ids, { party: true });
      }
      case "note": {
        const project = projectById(projectsOf(ctx.state), data.project);
        ctx.commit(
          ctx.t("Appunti personali del progetto", "Personal project notes"),
          (draft) => setNote(draft.ext[RECORDS], ctx.role, project.id, form?.get("note")),
          { local: true, visibility: "private", undoable: false },
        );
        focusAfter(`#projects-note-${project.id}`);
        ctx.toast(ctx.t("Appunti salvati: solo tu li leggi.", "Notes saved: only you read them."));
        return true;
      }
      case "dismiss":
        commitProjects(
          ctx,
          ctx.t("Voce del registro nascosta", "Log entry dismissed"),
          (draft, s) => dismissLog(s, ctx.role, data.entry),
        );
        focusAfter(".projects-log summary");
        return true;
      case "craft":
        return openCraft(ctx, data.actor, data.recipe);
      case "new-recipe":
        return openNewRecipe(ctx);
      case "retire-recipe": {
        const recipe = commitProjects(
          ctx,
          ctx.t("Ricetta ritirata", "Recipe retired"),
          (draft, s) => {
            const now = new Date().toISOString();
            const row = retireCampaignRecipe(s, ctx.role, data.recipe, { now });
            addLog(s, {
              kind: "recipe-retire",
              by: ctx.role,
              at: now,
              text: L(
                `Ricetta ritirata: ${plainText(row.output.name, "it")}`,
                `Recipe retired: ${plainText(row.output.name, "en")}`,
              ),
            });
            return row;
          },
        );
        focusAfter(".projects-recipe-book > summary");
        ctx.toast(
          ctx.t(
            `Ricetta ritirata: ${plainText(recipe.output.name, "it")}. Le fabbricazioni già iniziate continuano; Annulla la rimette nel ricettario.`,
            `Recipe retired: ${plainText(recipe.output.name, "en")}. Crafts already started go on; Undo puts it back in the book.`,
          ),
        );
        return true;
      }
      case "select-node":
        uiFor(ctx).node[data.actor] = data.node;
        focusAfter(`.projects-node[data-node="${data.node}"]`);
        ctx.render();
        return true;
      case "unlock": {
        const node = commitProjects(
          ctx,
          ctx.t("Dono sbloccato", "Boon unlocked"),
          (draft, s) => unlockNode(draft, s, ctx.role, { actorId: data.actor, nodeId: data.node }),
          { actor: actorOf(ctx, data.actor) },
        );
        focusAfter(`.projects-node[data-node="${data.node}"]`);
        ctx.toast(
          ctx.t(
            `Sbloccato: ${node.name.it}. Ora compare in Capacità.`,
            `Unlocked: ${node.name.en}. Now listed in Features.`,
          ),
        );
        return true;
      }
      case "refund-node":
        return openRefundNode(ctx, data.actor, data.node);
      case "story-gate":
        commitProjects(
          ctx,
          data.open === "1"
            ? ctx.t("Anello esterno aperto", "Outer ring opened")
            : ctx.t("Anello esterno richiuso", "Outer ring closed"),
          (draft, s) =>
            setStoryGate(draft, s, ctx.role, { actorId: data.actor, open: data.open === "1" }),
        );
        focusAfter('[data-projects-action="story-gate"]');
        return true;
      case "assign-track":
        commitProjects(ctx, ctx.t("Traccia assegnata", "Track assigned"), (draft, s) =>
          assignTrack(draft, s, ctx.role, {
            actorId: data.actor,
            trackId: form?.get("track") ?? data.track,
          }),
        );
        focusAfter("#projects-track-title");
        return true;
      case "unassign-track":
        commitProjects(ctx, ctx.t("Traccia tolta", "Track removed"), (draft, s) =>
          unassignTrack(draft, s, ctx.role, { actorId: data.actor }),
        );
        focusAfter(".projects-track h2");
        return true;
      case "open-sheet":
        ctx.navigate("characters", { id: data.actor, tab: ID });
        return true;
      default:
        return false;
    }
  });
}
function restoreFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus);
  target?.focus({ preventScroll: false });
  if (target && target.ownerDocument.activeElement === target) ui.focus = null;
}
export function bindProjects(root, ctx) {
  if (!root) return;
  root.addEventListener("click", (event) => {
    const recipes = event.target.closest("[data-projects-open-recipes]");
    if (recipes && root.contains(recipes))
      return ctx.navigate("characters", {
        id: recipes.dataset.projectsOpenRecipes,
        tab: RECIPES_TAB,
      });
    const meter = event.target.closest("[data-projects-meter]");
    if (meter && root.contains(meter))
      return ctx.navigate("characters", { id: meter.dataset.projectsMeter, tab: ID });
    const control = event.target.closest("[data-projects-action]");
    if (!control || !root.contains(control) || control.disabled) return;
    const root2 = control.closest("[data-projects-root]");
    const data = { ...control.dataset };
    if (!data.actor && root2?.dataset.actor) data.actor = root2.dataset.actor;
    handleProjectsAction(ctx, control.dataset.projectsAction, data);
  });
  // "toggle" does not bubble: listen in the capture phase.
  root.addEventListener(
    "toggle",
    (event) => {
      const key = event.target?.dataset?.projectsDetails;
      if (key) uiFor(ctx).open[key] = event.target.open;
    },
    true,
  );
  root.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-projects-form]");
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    const data = { ...form.dataset };
    const holder = form.closest("[data-projects-root]");
    if (!data.actor && holder?.dataset.actor) data.actor = holder.dataset.actor;
    const action =
      form.dataset.projectsForm === "assign" ? "assign-track" : form.dataset.projectsForm;
    handleProjectsAction(ctx, action, data, new FormData(form));
  });
  restoreFocus(root);
}

/** Owners are told when hours are available and a project's current step needs time. */
export function collectDowntimeNotices(ctx) {
  const slice = projectsOf(ctx.state);
  if (!slice) return [];
  return Object.values(ctx.state.actors)
    .filter(
      (actor) =>
        actor?.kind === "character" &&
        !actor.companion &&
        actor.owner === ctx.role &&
        canControlActor(actor, ctx.role, ctx.state),
    )
    .flatMap((actor) => {
      const budget = timeBudget(ctx.state, slice, actor.id);
      if (budget.available < 1) return [];
      const waiting = slice.projects.find(
        (project) =>
          project.actorId === actor.id &&
          project.status === "active" &&
          currentStep(project)?.kind === "time",
      );
      if (!waiting) return [];
      return [
        {
          id: `projects-time-${actor.id}-${budget.fromClock + budget.granted}`,
          category: "downtime",
          title: L(
            `${actor.name}: ${budget.available} h di tempo libero`,
            `${actor.name}: ${budget.available} h of downtime`,
          ),
          body: L(`Da dedicare a «${waiting.title.it}»`, `To dedicate to “${waiting.title.en}”`),
          target: { kind: "sheet", actorId: actor.id, tab: ID },
        },
      ];
    });
}

// ================================================================= registration

export function register(registry) {
  area = registry;
  registry.registerStateSlice(ID, {
    version: VERSION,
    seed: (state) => seedProjects(state),
    normalize: normalizeProjects,
  });
  registry.registerStateSlice(RECORDS, {
    version: VERSION,
    undo: "preserve",
    seed: () => emptyRecords(),
    normalize: normalizeRecords,
  });
  registry.registerStyles(new URL("./projects.css", import.meta.url));
  registry.add("sheet-tab", {
    id: ID,
    category: "extras",
    // PG-83: a sub-page name that says what is inside.
    label: L("Progetti e tempo libero", "Projects and downtime"),
    order: 45,
    when: (ctx, actor) =>
      Boolean(projectsOf(ctx.state) && actor?.kind === "character" && !actor.companion),
    render: (ctx, actor) => renderDowntime(ctx, actor),
    bind: (el, ctx) => bindProjects(el, ctx),
  });
  registry.add("sheet-tab", {
    id: RECIPES_TAB,
    category: "extras",
    label: L("Ricettario", "Recipe book"),
    order: 46,
    when: (ctx, actor) =>
      Boolean(projectsOf(ctx.state) && actor?.kind === "character" && !actor.companion),
    render: (ctx, actor) => renderRecipeBook(ctx, actor),
    bind: (el, ctx) => bindProjects(el, ctx),
  });
  // PG-83: the active projects' progress under the vitals, on every tab of the sheet.
  registry.add("sheet-section", {
    id: `${ID}-meters`,
    tab: "summary",
    label: L("Progetti in corso", "Projects under way"),
    order: 40,
    when: (ctx, actor) =>
      Boolean(projectsOf(ctx.state) && actor?.kind === "character" && !actor.companion),
    render: (ctx, actor) => renderProjectMeters(ctx, actor),
    bind: (el, ctx) => bindProjects(el, ctx),
  });
  registry.add("sheet-tab", {
    id: TRACK_TAB,
    category: "features",
    label: L("Doni", "Boons"),
    order: 46,
    when: (ctx, actor) => {
      const slice = projectsOf(ctx.state);
      if (!slice || actor?.kind !== "character" || actor.companion) return false;
      if (slice.assignments?.[actor.id]) return true;
      return ctx.role === "dm" && !isPersonal(actor);
    },
    render: (ctx, actor) => renderTrack(ctx, actor),
    bind: (el, ctx) => bindProjects(el, ctx),
  });
  registry.add("campaign-section", {
    id: ID,
    group: "play",
    label: L("Tempo libero", "Downtime"),
    order: 25,
    when: (ctx) => Boolean(projectsOf(ctx.state)),
    render: (ctx) => renderCampaignDowntime(ctx),
    bind: (el, ctx) => bindProjects(el, ctx),
  });
  // A notice that asks for an action (registry plan §5.2 rule 8): hours the clock or the DM
  // made available and a project waiting for them, for the owner of each sheet.
  registry.add("notifications", {
    id: ID,
    label: L("Tempo libero", "Downtime"),
    collect: (ctx) => collectDowntimeNotices(ctx),
  });
  const craftingActor = (ctx) => {
    const current =
      ctx.view?.page === "characters" && ctx.state.actors[ctx.view.id]?.kind === "character"
        ? ctx.view.id
        : null;
    return (
      current ??
      Object.values(ctx.state.actors).find(
        (actor) =>
          actor.kind === "character" &&
          !actor.companion &&
          actor.owner === ctx.role &&
          ctx.canControl(actor),
      )?.id ??
      null
    );
  };
  // PG-84: the recipe book has its own command, found by what people type.
  registry.add("command", {
    id: "projects.recipes",
    label: L("Ricettario: fabbrica un oggetto", "Recipe book: craft an item"),
    description: L(
      "fabbrica, fabbricare, fabbricazione, crafting, ricetta, ricette, ricettario, pozione, erborista, creare oggetti",
      "craft, crafting, recipe, recipes, recipe book, brew, potion, herbalism, make items",
    ),
    when: (ctx) => Boolean(projectsOf(ctx.state) && craftingActor(ctx)),
    run: (ctx) => ctx.navigate("characters", { id: craftingActor(ctx), tab: RECIPES_TAB }),
  });
  registry.add("command", {
    id: "projects.open",
    label: L("Apri tempo libero e progetti", "Open downtime and projects"),
    description: L(
      "tempo libero, progetti, dedica tempo, ore, imparare una lingua, addestramento, attività",
      "downtime, projects, dedicate time, hours, learn a language, training, activity",
    ),
    run: (ctx) => {
      const current =
        ctx.view?.page === "characters" && ctx.state.actors[ctx.view.id]?.kind === "character"
          ? ctx.view.id
          : null;
      const id =
        current ??
        Object.values(ctx.state.actors).find(
          (actor) => actor.kind === "character" && !actor.companion && ctx.canControl(actor),
        )?.id;
      if (id) ctx.navigate("characters", { id, tab: ID });
      else ctx.navigate("campaign", { tab: ID });
    },
  });
  registry.on("role-changed", () => resetProjectsUI());
  registry.on("reset", () => resetProjectsUI());
}
