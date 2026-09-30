import { canViewActor, canControlActor, connectCharacterToCampaign } from "./character-access.mjs";
import { getCharacterDraft, saveCharacterDraft, getDraftCatalog } from "./character-build.mjs";
import {
  getHomebrewDraft,
  applyHomebrewDraft,
  materializeHomebrewCopy,
  homebrewAvailability,
  getHomebrewRevision,
} from "./homebrew.mjs";

const copy = (value) => structuredClone(value);
const sections = { features: "features", spells: "spells", inventory: "equipment" };
// PG-06: a class, species or background variant returns to its own builder choice
// (dnd5e Compendium Browser locked to the choice). `row` names the class row.
const originSections = { class: "class", species: "origin", background: "origin" };
function unavailable(it, en) {
  return Object.assign(new Error(en), { it, en });
}
export function parseLibraryReturn(value) {
  let parsed = value;
  if (typeof value === "string") {
    if (value.length > 16384) return null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (parsed.page === "builder") {
    const { draftId, section, targetKind, grantId, row } = parsed;
    if (typeof draftId !== "string" || !draftId) return null;
    if (originSections[targetKind]) {
      if (section !== originSections[targetKind]) return null;
      if (row !== undefined && (targetKind !== "class" || !Number.isInteger(row) || row < 0))
        return null;
      return {
        page: "builder",
        draftId,
        section,
        targetKind,
        ...(row !== undefined ? { row } : {}),
      };
    }
    if (!Object.values(sections).includes(section)) return null;
    if (targetKind && sections[targetKind] !== section) return null;
    if (grantId !== undefined && (typeof grantId !== "string" || !grantId || section !== "spells"))
      return null;
    return {
      page: "builder",
      draftId,
      section,
      ...(targetKind ? { targetKind } : {}),
      ...(grantId ? { grantId } : {}),
    };
  }
  if (parsed.page === "characters") {
    const { actorId, tab, instanceId } = parsed;
    if (
      typeof actorId !== "string" ||
      !actorId ||
      !["features", "spells", "inventory"].includes(tab)
    )
      return null;
    if (instanceId !== undefined && (typeof instanceId !== "string" || !instanceId)) return null;
    return { page: "characters", actorId, tab, ...(instanceId ? { instanceId } : {}) };
  }
  return null;
}

export function validateLibraryCharacterChoice(state, ref, returnTo, role) {
  const target = parseLibraryReturn(returnTo);
  if (!target || target.page !== "characters")
    throw unavailable("Destinazione della scelta non valida.", "Invalid choice destination.");
  const actor = state.actors[target.actorId];
  if (!canControlActor(actor, role))
    throw unavailable("Non puoi modificare questa scheda.", "You cannot edit this sheet.");
  const revision = getHomebrewRevision(state, ref, role);
  if (revision.permissions.targetKind !== target.tab)
    throw unavailable(
      "Questo contenuto appartiene a un'altra sezione.",
      "This content belongs in another section.",
    );
  return target;
}

export function addHomebrewToCharacterDraft(state, ref, returnTo, role) {
  const target = parseLibraryReturn(returnTo);
  if (!target || target.page !== "builder")
    throw unavailable("Destinazione della scelta non valida.", "Invalid choice destination.");
  const draft = getCharacterDraft(state, target.draftId, role);
  if (draft.status !== "active")
    throw unavailable("La bozza è già conclusa.", "This draft is already closed.");
  if (originSections[target.targetKind]) return chooseOrigin(state, ref, target, draft, role);
  const instanceId = [
    "homebrew",
    draft.id,
    ref.contentId,
    ref.revisionId,
    target.grantId || target.section,
  ].join(":");
  const materialized = materializeHomebrewCopy(state, ref, role, {
    id: instanceId,
    actorId: draft.actorId || undefined,
    grantId: target.grantId,
  });
  const { targetKind, row } = materialized;
  if (
    sections[targetKind] !== target.section ||
    (target.targetKind && target.targetKind !== targetKind)
  )
    throw unavailable(
      "Questo contenuto appartiene a un'altra sezione.",
      "This content belongs in another section.",
    );
  if (targetKind === "inventory" && draft.actorId)
    throw unavailable(
      "Aggiungi gli oggetti dall'inventario della scheda corrente.",
      "Add items through the current sheet inventory.",
    );
  const entries =
    targetKind === "inventory" ? draft.data.equipment.items : draft.data[targetKind].custom;
  if (entries.some((entry) => entry.id === instanceId))
    return { draftId: draft.id, instanceId, targetKind, ref: copy(ref), returnTo: target };
  entries.push(copy(row));
  if (targetKind === "spells" && target.grantId) {
    draft.data.spells.selected.push({ id: row.id, grantId: target.grantId });
    draft.data.spells.confirmed = false;
  } else if (targetKind === "features") draft.data.features.confirmed = false;
  else if (targetKind === "inventory") draft.data.equipment.confirmed = false;
  saveCharacterDraft(
    state,
    draft.id,
    { data: draft.data, section: target.section, expectedRevision: draft.revision },
    role,
  );
  return { draftId: draft.id, instanceId, targetKind, ref: copy(ref), returnTo: target };
}

// The builder keeps a class, species or background by its catalogue id (the latest usable
// revision of that content), so choosing it selects the catalogue entry itself.
function chooseOrigin(state, ref, target, draft, role) {
  const kind = target.targetKind;
  const revision = getHomebrewRevision(state, ref, role);
  if (revision.type !== kind)
    throw unavailable(
      "Questo contenuto appartiene a un'altra sezione.",
      "This content belongs in another section.",
    );
  const catalog = getDraftCatalog(state, draft.id, role);
  const list = {
    class: catalog.classes,
    species: catalog.species,
    background: catalog.backgrounds,
  }[kind];
  const entry = list.find((row) => row.homebrewRef?.contentId === ref.contentId);
  if (!entry)
    throw unavailable(
      kind === "class"
        ? "Questa classe non è utilizzabile in questa bozza: indica Dado Vita e tiri salvezza nell'editor, oppure abilitala nella campagna della scheda."
        : "Questo contenuto non è utilizzabile in questa bozza: abilitalo nella campagna della scheda.",
      kind === "class"
        ? "This class cannot be used in this draft: set its Hit Die and saving throws in the editor, or enable it in the sheet's campaign."
        : "This content cannot be used in this draft: enable it in the sheet's campaign.",
    );
  const data = copy(draft.data);
  let changed = false;
  if (kind === "class") {
    data.classes ??= [];
    const index = Math.min(target.row ?? data.classes.length, data.classes.length);
    const row = data.classes[index] ?? { level: 1 };
    if (row.classId !== entry.id) {
      data.classes[index] = { ...row, classId: entry.id, level: row.level ?? 1, subclassId: null };
      changed = true;
    }
  } else {
    data.origin ??= { backgroundId: null, speciesId: null, backgroundBonuses: {}, choices: {} };
    const key = kind === "species" ? "speciesId" : "backgroundId";
    if (data.origin[key] !== entry.id) {
      data.origin[key] = entry.id;
      if (kind === "background") data.origin.backgroundBonuses = {};
      else data.origin.choices = {};
      changed = true;
    }
  }
  if (changed)
    saveCharacterDraft(
      state,
      draft.id,
      {
        data: kind === "class" ? { classes: data.classes } : { origin: data.origin },
        section: target.section,
        expectedRevision: draft.revision,
      },
      role,
    );
  return {
    draftId: draft.id,
    targetKind: kind,
    choiceId: entry.id,
    ref: copy(ref),
    returnTo: target,
  };
}

function syncBuildSource(actor, result) {
  const data = actor.characterBuild?.data;
  const row = actor[result.targetKind]?.find((entry) => entry.id === result.instanceId);
  if (!data || !row?.buildManaged) return;
  if (result.targetKind === "features") {
    const index = data.features.custom.findIndex((entry) => entry.id === row.id);
    if (index !== -1) data.features.custom[index] = copy(row);
  }
  if (result.targetKind === "spells") {
    const oldCatalogId = row.catalogId;
    const shared = actor.spells.some(
      (entry) => entry.id !== row.id && entry.buildManaged && entry.catalogId === oldCatalogId,
    );
    const catalogId = shared
      ? oldCatalogId + ":revision:" + result.ref.revisionId + ":" + row.id
      : oldCatalogId;
    const definition = { ...copy(row), id: catalogId };
    for (const key of ["catalogId", "grantId", "prepared", "buildManaged", "spellcastingAbility"])
      delete definition[key];
    const index = data.spells.custom.findIndex((entry) => entry.id === oldCatalogId);
    if (!shared && index !== -1) data.spells.custom[index] = definition;
    else data.spells.custom.push(definition);
    for (const key of ["selected", "prepared"])
      data.spells[key] = data.spells[key].map((entry) =>
        entry.id === oldCatalogId && entry.grantId === row.grantId
          ? { ...entry, id: catalogId, ...(key === "selected" ? { instanceId: row.id } : {}) }
          : entry,
      );
    row.catalogId = catalogId;
  }
}

// BI-16: the structured homebrew area (homebrew-editor.mjs) registers how a sheet row's
// modifiers and activities follow a Library add or update, so «Rivedi aggiornamento» gives
// the same sheet as the editor's «Applica a una scheda». A hook instead of an import keeps
// this module out of that area's large import graph.
let structuredFollow = null;
export function setStructuredFollow(fn) {
  structuredFollow = typeof fn === "function" ? fn : null;
}

export function applyLibraryDraftToCharacter(state, draftId, reviewKey, role) {
  const draft = getHomebrewDraft(state, draftId, role);
  if (!["assign", "update"].includes(draft.kind))
    throw unavailable("Operazione della scheda non valida.", "Invalid sheet operation.");
  const result = applyHomebrewDraft(state, draftId, { reviewKey }, role);
  if (draft.status === "applied") return result;
  const actor = state.actors[result.actorId];
  syncBuildSource(actor, result);
  structuredFollow?.(state, result, role);
  return result;
}

export function connectCharacterWithContent(state, actorId, role) {
  const actor = state.actors[actorId];
  if (!canControlActor(actor, role, state) || (actor.kind !== "character" && !actor.companion))
    throw unavailable("Personaggio non disponibile.", "Character unavailable.");
  for (const key of ["features", "spells", "inventory"]) {
    for (const row of actor[key] || []) {
      if (!row.homebrewRef) continue;
      const audiences = ["player", "dm"].filter((viewer) =>
        canViewActor({ ...actor, visibility: "shared" }, viewer),
      );
      const availableToAudience = audiences.every(
        (viewer) =>
          homebrewAvailability(
            state,
            row.homebrewRef,
            { actorId, campaignId: state.campaign.id },
            viewer,
          ).canUse,
      );
      if (!availableToAudience)
        throw unavailable(
          "Prima di condividere la scheda, rendi accessibili e abilita in campagna le revisioni homebrew che usa.",
          "Before sharing this sheet, make its homebrew revisions accessible and enable them in the campaign.",
        );
    }
  }
  connectCharacterToCampaign(state, actorId, role);
}
