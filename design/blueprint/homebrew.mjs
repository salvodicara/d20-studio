import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { hasBlockingConsequences } from "./combat.mjs";
import { getById } from "./srd-sample.mjs";

const copy = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const label = (it, en) => ({ it, en });
const reason = (code, it, en, path) => ({ code, it, en, ...(path ? { path } : {}) });
// The message keeps both languages for older readers; `it`/`en` let the shell show one (X-A2).
const fail = (it, en) => {
  throw Object.assign(new Error(`${it} / ${en}`), { it, en });
};
const idValid = (id) => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(id);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const whole = (value, min = 0) => Number.isInteger(value) && value >= min;
const roles = ["player", "dm"];
const isRef = (ref) => object(ref) && idValid(ref.contentId) && idValid(ref.revisionId);
const refKey = (ref) => `${ref.contentId}/${ref.revisionId}`;
const sameRef = (a, b) =>
  !!a && !!b && a.contentId === b.contentId && a.revisionId === b.revisionId;
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : object(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function fingerprint(value) {
  let hash = 2166136261;
  for (const c of JSON.stringify(canonical(value)))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
const TYPES = [
  ["class", "Classe", "Class"],
  ["subclass", "Sottoclasse", "Subclass"],
  ["species", "Specie", "Species"],
  ["background", "Background", "Background"],
  ["feat", "Talento", "Feat", "features"],
  ["feature", "Capacità", "Feature", "features"],
  ["spell", "Incantesimo", "Spell", "spells"],
  ["item", "Oggetto", "Item", "inventory"],
  ["weapon", "Arma", "Weapon", "inventory"],
  ["armor", "Armatura", "Armor", "inventory"],
  ["consumable", "Consumabile", "Consumable", "inventory"],
  ["creature", "Creatura", "Creature"],
  ["condition", "Condizione", "Condition"],
  ["counter", "Contatore", "Counter", "features"],
  ["skill", "Competenza", "Skill"],
].map(([id, it, en, targetKind = null]) => ({ id, name: label(it, en), targetKind }));
export const getHomebrewTypes = () => copy(TYPES);
const typeInfo = (id) => TYPES.find((t) => t.id === id);
function lookup(state, ref) {
  if (!isRef(ref)) return {};
  const content = (state.library ?? []).find((entry) => entry.id === ref.contentId);
  return { content, revision: content?.revisions.find((entry) => entry.id === ref.revisionId) };
}
function readable(content, revision, role) {
  const access = content?.accessByRevision?.[revision?.id];
  return (
    !!revision &&
    (content.owner === role ||
      (access?.readers ?? []).includes(role) ||
      (access?.editors ?? []).includes(role))
  );
}
function campaignFor(state, context) {
  if (Object.hasOwn(context, "campaignId")) return context.campaignId;
  return context.actorId && isCampaignActor(state.actors?.[context.actorId], state.campaign?.id)
    ? state.campaign.id
    : null;
}
function dependenciesAvailable(state, ref, context, role, purpose, seen = new Set()) {
  const key = refKey(ref);
  if (seen.has(key)) return false;
  const { content, revision } = lookup(state, ref);
  if (!readable(content, revision, role)) return false;
  if (purpose === "export" && revision.data.source.rights.export !== true) return false;
  const campaignId = campaignFor(state, context);
  if (
    purpose === "use" &&
    campaignId &&
    (campaignId !== state.campaign?.id ||
      !(state.campaign.enabledContent ?? []).some((r) => sameRef(r, ref)))
  )
    return false;
  const next = new Set(seen).add(key);
  return (revision.data.dependencies ?? []).every((dep) =>
    dependenciesAvailable(state, dep, context, role, purpose, next),
  );
}
export function homebrewAvailability(state, ref, context = {}, role) {
  const { content, revision } = lookup(state, ref);
  const allowed = readable(content, revision, role);
  const reasons = [];
  if (!allowed)
    reasons.push(reason("unavailable", "Contenuto non disponibile.", "Content unavailable."));
  const actor = state.actors?.[context.actorId];
  const audience = actor ? roles.filter((viewer) => canViewActor(actor, viewer)) : [];
  const canUse =
    allowed &&
    dependenciesAvailable(state, ref, context, role, "use") &&
    audience.every((viewer) => dependenciesAvailable(state, ref, context, viewer, "use"));
  const canExport = allowed && dependenciesAvailable(state, ref, {}, role, "export");
  if (allowed && !canUse)
    reasons.push(
      reason(
        "context-unavailable",
        "Questa revisione o una dipendenza non è disponibile nel contesto scelto.",
        "This revision or a dependency is unavailable in the selected context.",
      ),
    );
  return {
    readable: allowed,
    canUse,
    canManageAccess: allowed && content.owner === role,
    canShare: allowed && content.owner === role && revision.data.source.rights.share === true,
    canExport,
    reasons,
  };
}
/**
 * X-A1 (D&D Beyond campaign homebrew): the steps still missing before `role` may use this
 * revision on `context.actorId`'s sheet, each named as the button that does it (or who does
 * it): the DM enables it in the campaign; everyone who sees the sheet must be able to read it
 * (its owner shares it). Empty when it can be used; `dependency` when only a dependency lacks.
 */
export function homebrewUseSteps(state, ref, context = {}, role) {
  const { content, revision } = lookup(state, ref);
  if (!readable(content, revision, role))
    return [reason("unavailable", "Contenuto non disponibile.", "Content unavailable.")];
  const steps = [];
  const campaignId = campaignFor(state, context);
  if (
    campaignId &&
    (campaignId !== state.campaign?.id ||
      !(state.campaign.enabledContent ?? []).some((r) => sameRef(r, ref)))
  )
    steps.push(
      role === "dm"
        ? reason("enable", "Abilita in campagna", "Enable in the campaign")
        : reason("enable", "il DM la abilita in campagna", "the DM enables it in the campaign"),
    );
  const actor = state.actors?.[context.actorId];
  const audience = actor ? roles.filter((viewer) => canViewActor(actor, viewer)) : [];
  for (const viewer of audience) {
    if (viewer === role || readable(content, revision, viewer)) continue;
    const players = viewer === "player";
    steps.push(
      content.owner === role
        ? players
          ? reason(
              "share",
              "Condividi in lettura con i giocatori",
              "Share read access with the players",
            )
          : reason("share", "Condividi in lettura con il DM", "Share read access with the DM")
        : players
          ? reason(
              "share",
              "chi l’ha creata la condivide con i giocatori",
              "its author shares it with the players",
            )
          : reason(
              "share",
              "chi l’ha creata la condivide con il DM",
              "its author shares it with the DM",
            ),
    );
  }
  if (!steps.length && !homebrewAvailability(state, ref, context, role).canUse)
    steps.push(
      reason(
        "dependency",
        "una sua dipendenza non è disponibile qui",
        "one of its dependencies is unavailable here",
      ),
    );
  return steps;
}
function permissions(state, ref, context, role) {
  const base = homebrewAvailability(state, ref, context, role);
  const { content, revision } = lookup(state, ref);
  const targetKind = base.readable ? (typeInfo(content.type)?.targetKind ?? null) : null;
  return {
    ...base,
    targetKind,
    canRevise:
      base.readable &&
      revision.data.source.rights.modify === true &&
      (content.owner === role ||
        (content.accessByRevision?.[revision.id]?.editors ?? []).includes(role)),
    canDuplicate: base.readable && revision.data.source.rights.modify === true,
    canEnable: role === "dm" && base.readable,
    canCollect: base.readable,
    canAssign:
      !!targetKind &&
      base.canUse &&
      (!context.actorId || canControlActor(state.actors?.[context.actorId], role)),
  };
}
function projectedRevision(state, ref, role) {
  const { content, revision } = lookup(state, ref);
  const p = permissions(state, ref, {}, role);
  if (!p.readable) fail("Contenuto non disponibile.", "Content unavailable.");
  const result = copy(revision);
  const deps = result.data.dependencies ?? [];
  result.data.dependencies = deps.filter((dep) => {
    const found = lookup(state, dep);
    return readable(found.content, found.revision, role);
  });
  result.unavailableDependencies = deps.length - result.data.dependencies.length;
  return {
    ...result,
    ref: copy(ref),
    type: content.type,
    owner: content.owner,
    permissions: p,
    collected: (state.libraryCollections?.[role] ?? []).some((r) => sameRef(r, ref)),
    ...(p.canManageAccess
      ? { access: copy(content.accessByRevision?.[revision.id] ?? { readers: [], editors: [] }) }
      : {}),
  };
}
export const getHomebrewRevision = projectedRevision;
export function listHomebrew(state, role) {
  return (state.library ?? []).flatMap((content) => {
    const revisions = content.revisions.filter((r) => readable(content, r, role));
    if (!revisions.length) return [];
    const latest = revisions.at(-1),
      ref = { contentId: content.id, revisionId: latest.id };
    return [
      {
        id: content.id,
        owner: content.owner,
        type: content.type,
        name: copy(latest.data.name),
        latestRef: ref,
        revisions: revisions.map((r) => ({
          id: r.id,
          name: copy(r.data.name),
          createdAt: r.createdAt,
        })),
        permissions: permissions(state, ref, {}, role),
        collected: revisions.some((r) =>
          (state.libraryCollections?.[role] ?? []).some((entry) =>
            sameRef(entry, { contentId: content.id, revisionId: r.id }),
          ),
        ),
      },
    ];
  });
}
export function collectHomebrewRevision(state, ref, { collected }, role) {
  if (
    !roles.includes(role) ||
    typeof collected !== "boolean" ||
    (collected && !homebrewAvailability(state, ref, {}, role).readable)
  )
    fail("Contenuto non disponibile.", "Content unavailable.");
  state.libraryCollections ??= {};
  const list = (state.libraryCollections[role] ?? []).filter((r) => !sameRef(r, ref));
  if (collected) list.push(copy(ref));
  state.libraryCollections[role] = list;
  return collected;
}
function defaultDefinition(type) {
  return {
    name: label("", ""),
    description: label("", ""),
    source: {
      kind: "authored",
      edition: "2024",
      label: "",
      reference: "",
      rights: { modify: true, share: true, export: true },
    },
    fields: {
      level: 0,
      school: "",
      kind: ["weapon", "armor", "consumable"].includes(type) ? type : "gear",
      weight: 0,
      value: null,
    },
    resource: null,
    activities: [],
    dependencies: [],
  };
}
function privateDraft(state, id, role) {
  const d = (state.libraryDrafts ?? []).find((entry) => entry.id === id && entry.owner === role);
  if (!d) fail("Bozza non disponibile.", "Draft unavailable.");
  return d;
}
export const getHomebrewDraft = (state, id, role) => copy(privateDraft(state, id, role));
export const listHomebrewDrafts = (state, role) =>
  copy((state.libraryDrafts ?? []).filter((d) => d.owner === role && d.status === "active"));
function validReturnTo(value) {
  return (
    value == null ||
    (object(value) &&
      (value.page === "builder"
        ? idValid(value.draftId) &&
          ["features", "spells", "equipment", "class", "origin"].includes(value.section)
        : value.page === "characters" &&
          idValid(value.actorId) &&
          ["features", "spells", "inventory"].includes(value.tab) &&
          (value.instanceId === undefined || idValid(value.instanceId))))
  );
}
export function createHomebrewDraft(
  state,
  { id, kind = "create", type, ref, actorId, instanceId, returnTo = null },
  role,
) {
  if (
    !roles.includes(role) ||
    !idValid(id) ||
    !["create", "duplicate", "revise", "assign", "update"].includes(kind) ||
    !validReturnTo(returnTo)
  )
    fail("Richiesta di bozza non valida.", "Invalid draft request.");
  if ((state.libraryDrafts ?? []).some((d) => d.id === id))
    fail("Identità bozza già usata.", "Draft identity already used.");
  let data,
    contentId = `content-${id}`,
    baseRef = null;
  if (kind === "create") {
    if (!typeInfo(type)) fail("Tipo non supportato.", "Unsupported type.");
    data = defaultDefinition(type);
  } else {
    const found = lookup(state, ref),
      p = permissions(state, ref, { actorId }, role);
    if (
      !p.readable ||
      (kind === "revise" && !p.canRevise) ||
      (kind === "duplicate" && !p.canDuplicate)
    )
      fail("Operazione non consentita.", "Operation unavailable.");
    type = found.content.type;
    baseRef = copy(ref);
    if (["assign", "update"].includes(kind)) {
      if (
        !p.targetKind ||
        (kind === "assign" && !p.canAssign) ||
        !actorId ||
        !canControlActor(state.actors?.[actorId], role)
      )
        fail("Scheda o contenuto non disponibili.", "Sheet or content unavailable.");
      if (
        kind === "update" &&
        !state.actors[actorId][p.targetKind]?.some(
          (row) => row.id === instanceId && row.homebrewRef?.contentId === ref.contentId,
        )
      )
        fail("Istanza non disponibile.", "Instance unavailable.");
      data = {
        instance: { quantity: 1, used: 0, equipped: false, prepared: false },
        resolutions: {},
      };
      contentId = ref.contentId;
    } else {
      data = copy(found.revision.data);
      if (kind === "revise") contentId = ref.contentId;
    }
  }
  const d = {
    id,
    owner: role,
    kind,
    type,
    status: "active",
    revision: 0,
    contentId,
    baseRef,
    actorId: actorId ?? null,
    instanceId: instanceId ?? null,
    createdAt: now(),
    updatedAt: now(),
    data,
    returnTo: copy(returnTo),
    result: null,
  };
  (state.libraryDrafts ??= []).push(d);
  return copy(d);
}
export function saveHomebrewDraft(state, id, { data, expectedRevision }, role) {
  const d = privateDraft(state, id, role);
  if (d.status !== "active") fail("Bozza già conclusa.", "Draft already completed.");
  if (expectedRevision !== undefined && expectedRevision !== d.revision)
    fail("La bozza è cambiata; ricaricala.", "Draft changed; reload it.");
  if (!object(data)) fail("Dati bozza non validi.", "Invalid draft data.");
  d.data = copy(data);
  d.revision++;
  d.updatedAt = now();
  return copy(d);
}
export function discardHomebrewDraft(state, id, role) {
  const d = privateDraft(state, id, role);
  if (d.status === "applied") fail("Bozza già applicata.", "Draft already applied.");
  d.status = "discarded";
  d.updatedAt = now();
  return copy(d);
}
function bilingual(value, required = false) {
  return (
    object(value) &&
    Object.keys(value).every((key) => ["it", "en"].includes(key)) &&
    ["it", "en"].every((key) => value[key] === undefined || typeof value[key] === "string") &&
    (!required || [value.it, value.en].some((text) => text?.trim()))
  );
}
function validateDefinition(data, type) {
  const errors = [],
    add = (code, path, it, en) => errors.push(reason(code, it, en, path));
  if (!object(data) || !typeInfo(type))
    return [reason("definition", "Definizione non valida.", "Invalid definition.")];
  if (
    Object.keys(data).some(
      (key) =>
        ![
          "name",
          "description",
          "source",
          "fields",
          "resource",
          "activities",
          "dependencies",
          // B48 additive schema: structured behaviour (prerequisites, options, modifiers,
          // activities, advancement, stat block), validated by homebrew-editor-domain.mjs.
          "structured",
        ].includes(key),
    )
  )
    add(
      "definition-field",
      "definition",
      "La definizione contiene campi sconosciuti.",
      "The definition contains unknown fields.",
    );
  if (data.structured !== undefined && !object(data.structured))
    add(
      "structured",
      "structured",
      "Comportamento strutturato non valido.",
      "Invalid structured behaviour.",
    );
  if (!bilingual(data.name, true))
    add("name", "name", "Inserisci almeno un nome IT o EN.", "Provide at least one IT or EN name.");
  if (!bilingual(data.description))
    add(
      "description",
      "description",
      "Descrizione IT/EN non valida.",
      "Invalid IT/EN description.",
    );
  const s = data.source;
  // BI-15 (DDB My Creations): the one missing field is named next to its input.
  if (object(s) && (typeof s.label !== "string" || !s.label.trim()))
    add(
      "source-label",
      "source.label",
      "Indica l’autore o la fonte: per esempio il tuo nome o il titolo del manuale.",
      "Enter the author or source: for example your name or the book title.",
    );
  if (
    !object(s) ||
    !["authored", "reconstruction"].includes(s.kind) ||
    !["2024", "unknown"].includes(s.edition) ||
    typeof s.label !== "string" ||
    typeof s.reference !== "string" ||
    !object(s.rights) ||
    ["modify", "share", "export"].some((key) => typeof s.rights[key] !== "boolean") ||
    Object.keys(s).some((key) => !["kind", "edition", "label", "reference", "rights"].includes(key))
  )
    add(
      "source",
      "source",
      "Registra una provenienza e le capacità dichiarate, senza attribuzione SRD implicita.",
      "Record provenance and declared capabilities, without implied SRD attribution.",
    );
  const fields = data.fields;
  if (
    !object(fields) ||
    Object.keys(fields).some(
      (key) => !["level", "school", "kind", "weight", "value"].includes(key),
    ) ||
    !whole(fields.level) ||
    fields.level > 9 ||
    typeof fields.school !== "string" ||
    typeof fields.kind !== "string" ||
    !Number.isFinite(fields.weight) ||
    fields.weight < 0 ||
    (fields.value !== null && (!Number.isFinite(fields.value) || fields.value < 0))
  )
    add(
      "fields",
      "fields",
      "Controlla livello, peso e valore: devono essere valori validi.",
      "Check level, weight and value: they must be valid values.",
    );
  const resource = data.resource;
  if (
    resource !== null &&
    (!object(resource) ||
      !idValid(resource.id) ||
      !whole(resource.max) ||
      !["manual", "short-rest", "long-rest"].includes(resource.recovery) ||
      Object.keys(resource).some((k) => !["id", "max", "recovery"].includes(k)))
  )
    add(
      "resource",
      "resource",
      "Risorsa non valida: identità, massimo e recupero sono necessari.",
      "Invalid resource: identity, maximum and recovery are required.",
    );
  if (
    !Array.isArray(data.activities) ||
    data.activities.some(
      (a) =>
        !object(a) ||
        !idValid(a.id) ||
        a.kind !== "manual" ||
        !bilingual(a.name, true) ||
        !bilingual(a.description) ||
        Object.keys(a).some((k) => !["id", "name", "description", "kind"].includes(k)),
    ) ||
    new Set((data.activities ?? []).map((a) => a?.id)).size !== data.activities?.length
  )
    add(
      "activities",
      "activities",
      "Le attività di questo incremento sono promemoria manuali con identità distinta.",
      "Activities in this increment are manual reminders with distinct identities.",
    );
  if (
    !Array.isArray(data.dependencies) ||
    data.dependencies.some((r) => !isRef(r)) ||
    new Set((data.dependencies ?? []).filter(isRef).map(refKey)).size !== data.dependencies?.length
  )
    add(
      "dependencies",
      "dependencies",
      "Dipendenze non valide o duplicate.",
      "Invalid or duplicate dependencies.",
    );
  return errors;
}
function automationFor(type, data) {
  // BI-16/BI-28: a structured revision declares its own automation (the homebrew editor
  // computes it when the revision is saved); the Library shows that instead of the
  // text-only notice.
  const declared = data?.structured?.automation;
  if (object(declared) && ["full", "partial", "text"].includes(declared.level))
    return {
      level: declared.level,
      supported: [
        label("Definizione versionata", "Versioned definition"),
        ...(typeInfo(type)?.targetKind
          ? [label("Copia esplicita nella scheda", "Explicit sheet copy")]
          : []),
        ...copy(Array.isArray(declared.automated) ? declared.automated : []),
      ],
      manual: copy(Array.isArray(declared.manual) ? declared.manual : []),
      reasons: [],
    };
  return {
    level: "text",
    supported: [
      label("Definizione versionata", "Versioned definition"),
      ...(typeInfo(type)?.targetKind
        ? [label("Copia esplicita nella scheda", "Explicit sheet copy")]
        : []),
      ...(data?.resource
        ? [
            label(
              "Contatore registrato; consumi e recuperi manuali",
              "Recorded counter; manual consumption and recovery",
            ),
          ]
        : []),
    ],
    manual: [
      label(
        "Il testo non esegue regole, bonus, attacchi o recuperi.",
        "Text does not execute rules, bonuses, attacks or recovery.",
      ),
      ...(!typeInfo(type)?.targetKind
        ? [
            label(
              "Il tipo è consultabile; il suo percorso di concessione non è ancora collegato.",
              "The type is readable; its granting flow is not yet connected.",
            ),
          ]
        : []),
    ],
    reasons: [],
  };
}
function rowDefinition(ref, type, data) {
  const result = {
    name: copy(data.name),
    description: copy(data.description),
    source: {
      ...copy(data.source),
      kind: "homebrew",
      contentId: ref.contentId,
      revision: ref.revisionId,
      originKind: data.source.kind,
    },
    activities: copy(data.activities),
    homebrewRef: copy(ref),
    ...(typeInfo(type).targetKind === "spells"
      ? { level: data.fields.level, school: data.fields.school }
      : {}),
    ...(typeInfo(type).targetKind === "inventory"
      ? { kind: data.fields.kind, weight: data.fields.weight, value: data.fields.value }
      : {}),
    // BI-24 (FG Forge, dnd5e Enchant): a forged armor's bonus is a structured item modifier,
    // which the sheet and the Table add to AC while the armor is worn (srd-sample
    // activeItemModifiers, the same path as the Cloak of Protection).
    ...(typeInfo(type).targetKind === "inventory" &&
    Number.isInteger(data.structured?.item?.armor?.acBonus) &&
    data.structured.item.armor.acBonus > 0
      ? { modifiers: [{ target: "ac", value: data.structured.item.armor.acBonus }] }
      : {}),
    ...(data.resource
      ? { resourceId: data.resource.id, max: data.resource.max, recovery: data.resource.recovery }
      : {}),
    ...(typeInfo(type).targetKind === "inventory" ? forgedWeaponRow(data.structured?.item) : {}),
  };
  return result;
}
/**
 * BI-24 (FG Forge, dnd5e Enchant): a forged weapon row carries its weapon as a catalogue row
 * does (party-stash itemFromCatalog: `weaponType` and `weapon`), so the Inventory (B36) lists
 * a forged bow with its ammunition and the Table (B40) throws a forged dagger. The base's
 * range, ammunition and category, the forge's damage, properties and mastery; its +N stays
 * with the revision (srd-sample activeItemModifiers). Never the base's `srdId`: a forged
 * copy does not stack with a plain one.
 */
function forgedWeaponRow(item) {
  const forged = item?.weapon;
  const base = item?.baseId ? getById(item.baseId) : null;
  if (!forged || typeof forged !== "object" || !base?.weapon) return {};
  return {
    weaponType: base.slug,
    weapon: {
      ...copy(base.weapon),
      damage: copy(forged.damage ?? base.weapon.damage),
      properties: [
        ...(Array.isArray(forged.properties) ? forged.properties : base.weapon.properties),
      ],
      versatile: forged.versatile || base.weapon.versatile || null,
      mastery: forged.mastery ?? base.weapon.mastery ?? null,
    },
  };
}
export function materializeHomebrewCopy(state, ref, role, { id, actorId, grantId } = {}) {
  const { content, revision } = lookup(state, ref),
    p = permissions(state, ref, { actorId }, role);
  if (!p.canUse || !p.targetKind || !idValid(id) || (actorId && !p.canAssign))
    fail("Contenuto non utilizzabile qui.", "Content cannot be used here.");
  const base = rowDefinition(ref, content.type, revision.data);
  const row = {
    id,
    ...copy(base),
    baseDefinition: copy(base),
    manualOverrides: {},
    ...(grantId ? { grantId } : {}),
    ...(revision.data.resource ? { used: 0 } : {}),
    ...(p.targetKind === "spells" ? { prepared: false } : {}),
    ...(p.targetKind === "inventory" ? { quantity: 1, equipped: false } : {}),
  };
  return {
    targetKind: p.targetKind,
    row,
    ref: copy(ref),
    automation: automationFor(content.type, revision.data),
  };
}
function blocking(state, actorId) {
  return hasBlockingConsequences(state, actorId) || !!state.actors?.[actorId]?.pendingHealing;
}
function mergeInstance(state, d, role) {
  const p = permissions(state, d.baseRef, { actorId: d.actorId }, role),
    errors = [],
    diff = [];
  const actor = state.actors?.[d.actorId];
  if (
    !p.readable ||
    !p.targetKind ||
    (d.kind === "assign" && !p.canAssign) ||
    !canControlActor(actor, role)
  )
    return {
      errors: [
        reason(
          "actor-unavailable",
          "Scheda o contenuto non disponibili.",
          "Sheet or content unavailable.",
        ),
      ],
      diff,
      proposed: null,
      permissions: p,
    };
  if (!p.canAssign)
    errors.push(
      reason(
        "context-unavailable",
        "Puoi confrontare questa revisione, ma per applicarla deve essere disponibile nel contesto della scheda.",
        "You can compare this revision, but it must be available in the sheet’s context before applying it.",
      ),
    );
  if (blocking(state, actor.id))
    errors.push(
      reason(
        "pending",
        "Concludi prima le conseguenze collegate a questa scheda.",
        "Finish consequences linked to this sheet first.",
      ),
    );
  const instanceId = d.kind === "assign" ? `instance-${d.id}` : d.instanceId;
  if (d.kind === "assign") {
    const built = materializeHomebrewCopy(state, d.baseRef, role, {
      id: instanceId,
      actorId: actor.id,
    });
    const values = d.data.instance;
    if (
      !object(values) ||
      !whole(values.quantity, 1) ||
      !(values.used === null || whole(values.used)) ||
      typeof values.equipped !== "boolean" ||
      typeof values.prepared !== "boolean"
    )
      errors.push(
        reason(
          "instance-values",
          "Controlla quantità e consumi iniziali.",
          "Check initial quantity and consumption.",
        ),
      );
    if (values && !errors.some((e) => e.code === "instance-values")) {
      if (p.targetKind === "inventory")
        Object.assign(built.row, { quantity: values.quantity, equipped: values.equipped });
      if (p.targetKind === "spells") built.row.prepared = values.prepared;
      if (Object.hasOwn(built.row, "used")) built.row.used = values.used;
    }
    if ((actor[p.targetKind] ?? []).some((r) => r.id === instanceId))
      errors.push(
        reason(
          "instance-exists",
          "Identità istanza già presente.",
          "Instance identity already exists.",
        ),
      );
    return { errors, diff, proposed: built.row, permissions: p };
  }
  const current = (actor[p.targetKind] ?? []).find(
    (r) => r.id === instanceId && r.homebrewRef?.contentId === d.baseRef.contentId,
  );
  if (!current?.baseDefinition)
    return {
      errors: [
        reason(
          "instance-unavailable",
          "Istanza o origine del confronto non disponibili.",
          "Instance or comparison baseline unavailable.",
        ),
      ],
      diff,
      proposed: null,
      permissions: p,
    };
  const proposed = copy(current),
    old = current.baseDefinition,
    candidate = rowDefinition(d.baseRef, d.type, lookup(state, d.baseRef).revision.data);
  const differentResource = old.resourceId !== candidate.resourceId;
  const retainedResource =
    differentResource && candidate.resourceId
      ? current.resourceHistory?.[candidate.resourceId]
      : null;
  const keys = new Set([...Object.keys(old), ...Object.keys(candidate)]);
  for (const path of keys) {
    if (["source", "homebrewRef", "resourceId"].includes(path)) continue;
    const resourceField =
      ["max", "recovery"].includes(path) && differentResource && candidate.resourceId;
    const base = resourceField ? retainedResource?.baseDefinition?.[path] : old[path],
      next = candidate[path],
      live = resourceField ? retainedResource?.[path] : current[path];
    const localChanged = !equal(base, live),
      sourceChanged = !equal(base, next);
    const conflict = localChanged && sourceChanged && !equal(next, live);
    const choice = d.data.resolutions?.[path] ?? null;
    if (!equal(base, next) || localChanged)
      diff.push({
        path,
        label: label(path, path),
        base: copy(base),
        candidate: copy(next),
        current: copy(live),
        conflict,
        choice,
      });
    if (conflict && !["keep-local", "use-new"].includes(choice))
      errors.push(
        reason(
          "conflict",
          `Risolvi il conflitto: ${path}.`,
          `Resolve the conflict: ${path}.`,
          path,
        ),
      );
    const keep = localChanged && (!conflict || choice !== "use-new");
    if (keep) {
      if (live === undefined) delete proposed[path];
      else proposed[path] = copy(live);
      proposed.manualOverrides ??= {};
      proposed.manualOverrides[path] = {
        value: copy(live),
        source: (resourceField
          ? retainedResource?.manualOverrides?.[path]?.source
          : current.manualOverrides?.[path]?.source) ?? {
          kind: "manual",
          revision: `correction-${d.id}-${path}`,
          label: "Preserved sheet correction",
        },
      };
    } else {
      if (next === undefined) delete proposed[path];
      else proposed[path] = copy(next);
      if (proposed.manualOverrides) delete proposed.manualOverrides[path];
    }
  }
  // BI-16 (DDB "Create New Version" diff): the structured behaviour the new revision
  // brings (modifiers, activities, choices, prerequisites) is part of the comparison, so
  // the reviewer sees what the update will change on the sheet.
  const before = lookup(state, current.homebrewRef).revision?.data?.structured ?? null;
  const after = lookup(state, d.baseRef).revision?.data?.structured ?? null;
  for (const key of ["modifiers", "activities", "options", "prerequisites"]) {
    const was = Array.isArray(before?.[key]) ? before[key] : [];
    const next = Array.isArray(after?.[key]) ? after[key] : [];
    if (!equal(was, next))
      diff.push({
        path: `structured.${key}`,
        label: label(key, key),
        base: copy(was),
        candidate: copy(next),
        current: copy(was),
        conflict: false,
        choice: null,
        structured: true,
      });
  }
  if (differentResource) {
    if (old.resourceId && d.data.resolutions?.resource !== "retain-history")
      errors.push(
        reason(
          "resource-change",
          "La risorsa cambia: conserva esplicitamente i consumi precedenti nello storico.",
          "The resource changes: explicitly retain previous consumption in history.",
          "resource",
        ),
      );
    proposed.resourceHistory ??= {};
    if (old.resourceId)
      proposed.resourceHistory[old.resourceId] = {
        used: current.used,
        max: current.max,
        recovery: current.recovery,
        source: copy(current.source),
        baseDefinition: { max: old.max, recovery: old.recovery },
        manualOverrides: Object.fromEntries(
          ["max", "recovery"]
            .filter((path) => current.manualOverrides?.[path])
            .map((path) => [path, copy(current.manualOverrides[path])]),
        ),
      };
    if (candidate.resourceId)
      proposed.used = Object.hasOwn(proposed.resourceHistory, candidate.resourceId)
        ? proposed.resourceHistory[candidate.resourceId].used
        : null;
    else {
      delete proposed.used;
      delete proposed.max;
      delete proposed.recovery;
    }
  }
  if (candidate.resourceId) proposed.resourceId = candidate.resourceId;
  else delete proposed.resourceId;
  proposed.homebrewRef = copy(d.baseRef);
  proposed.source = copy(candidate.source);
  proposed.baseDefinition = copy(candidate);
  return { errors, diff, proposed, permissions: p };
}
function importCheck(state, bundle, role) {
  const errors = [],
    inserts = [];
  const add = (code, it, en) => errors.push(reason(code, it, en));
  if (
    !object(bundle) ||
    bundle.format !== "d20-studio-library" ||
    bundle.version !== 1 ||
    !Array.isArray(bundle.contents) ||
    !bundle.contents.length ||
    bundle.contents.length > 500
  ) {
    add("format", "Formato di importazione non supportato.", "Unsupported import format.");
    return { errors, inserts };
  }
  const refs = new Map(),
    ids = new Set();
  for (const entry of bundle.contents) {
    if (
      !object(entry) ||
      !idValid(entry.id) ||
      !typeInfo(entry.type) ||
      ids.has(entry.id) ||
      !Array.isArray(entry.revisions) ||
      !entry.revisions.length ||
      entry.revisions.length > 500 ||
      Object.keys(entry).some((key) => !["id", "type", "originRef", "revisions"].includes(key)) ||
      (entry.originRef != null && !isRef(entry.originRef))
    ) {
      add(
        "content",
        "Contenuto importato non valido o duplicato.",
        "Invalid or duplicate imported content.",
      );
      continue;
    }
    ids.add(entry.id);
    const existing = (state.library ?? []).find((c) => c.id === entry.id);
    if (existing && (existing.owner !== role || existing.type !== entry.type))
      add(
        "identity-collision",
        "Un’identità importata è già occupata o non disponibile.",
        "An imported identity is already occupied or unavailable.",
      );
    for (const revision of entry.revisions) {
      if (
        !object(revision) ||
        !idValid(revision.id) ||
        revision.contentId !== entry.id ||
        !roles.includes(revision.author) ||
        typeof revision.createdAt !== "string" ||
        (revision.parentRevisionId != null && !idValid(revision.parentRevisionId)) ||
        Object.keys(revision).some(
          (key) =>
            !["id", "contentId", "parentRevisionId", "author", "createdAt", "data"].includes(key),
        )
      ) {
        add("revision", "Revisione importata non valida.", "Invalid imported revision.");
        continue;
      }
      errors.push(...validateDefinition(revision.data, entry.type));
      const ref = { contentId: entry.id, revisionId: revision.id },
        key = refKey(ref);
      if (refs.has(key))
        add("duplicate-revision", "Revisione ripetuta nel file.", "Repeated revision in file.");
      refs.set(key, revision);
      const prior = existing?.revisions.find((r) => r.id === revision.id);
      if (prior && !equal(prior, revision))
        add(
          "revision-collision",
          "Stessa identità di revisione con dati diversi: nessuna sovrascrittura.",
          "Same revision identity with different data: no overwrite.",
        );
      if (!prior) inserts.push({ content: entry, revision });
    }
  }
  const visiting = new Set(),
    visited = new Set();
  function visit(ref) {
    const key = refKey(ref);
    if (visiting.has(key)) return false;
    if (visited.has(key)) return true;
    const incoming = refs.get(key),
      found = lookup(state, ref);
    if (!incoming && !readable(found.content, found.revision, role)) return false;
    const revision = incoming ?? found.revision;
    if (
      !Array.isArray(revision.data?.dependencies) ||
      revision.data.dependencies.some((dep) => !isRef(dep))
    )
      return false;
    visiting.add(key);
    const okay = revision.data.dependencies.every(visit);
    visiting.delete(key);
    visited.add(key);
    return okay;
  }
  for (const key of refs.keys()) {
    const [contentId, revisionId] = key.split("/");
    if (!visit({ contentId, revisionId })) {
      add(
        "dependency",
        "Una dipendenza è mancante, non disponibile o circolare.",
        "A dependency is missing, unavailable or circular.",
      );
      break;
    }
  }
  return { errors, inserts };
}
export function createHomebrewImportDraft(state, { id, bundle, returnTo = null }, role) {
  if (
    !roles.includes(role) ||
    !idValid(id) ||
    !validReturnTo(returnTo) ||
    (state.libraryDrafts ?? []).some((d) => d.id === id)
  )
    fail("Identità bozza non valida o già usata.", "Invalid or reused draft identity.");
  const d = {
    id,
    owner: role,
    kind: "import",
    type: null,
    status: "active",
    revision: 0,
    contentId: null,
    baseRef: null,
    actorId: null,
    instanceId: null,
    createdAt: now(),
    updatedAt: now(),
    data: { bundle: copy(bundle) },
    returnTo: copy(returnTo),
    result: null,
  };
  (state.libraryDrafts ??= []).push(d);
  return copy(d);
}
export function previewHomebrewDraft(state, id, role) {
  const d = privateDraft(state, id, role),
    errors = [],
    warnings = [],
    diff = [];
  let proposed = null,
    p = {},
    automation = automationFor(d.type, d.data);
  if (d.status !== "active")
    errors.push(reason("closed", "La bozza è già conclusa.", "The draft is already completed."));
  if (d.kind === "import") {
    const checked = importCheck(state, d.data.bundle, role);
    errors.push(...checked.errors);
    proposed = {
      contents: Array.isArray(d.data.bundle?.contents) ? d.data.bundle.contents.length : 0,
      newRevisions: checked.inserts.length,
      existingRevisions: checked.errors.length
        ? null
        : d.data.bundle.contents.reduce((n, c) => n + c.revisions.length, 0) -
          checked.inserts.length,
    };
  } else if (["assign", "update"].includes(d.kind)) {
    const merged = mergeInstance(state, d, role);
    errors.push(...merged.errors);
    diff.push(...merged.diff);
    proposed = merged.proposed;
    p = merged.permissions;
    automation = automationFor(d.type, lookup(state, d.baseRef).revision?.data);
  } else {
    errors.push(...validateDefinition(d.data, d.type));
    if (d.baseRef) {
      p = permissions(state, d.baseRef, {}, role);
      if (!(d.kind === "revise" ? p.canRevise : p.canDuplicate))
        errors.push(
          reason(
            "permission",
            "L’accesso alla base è cambiato.",
            "Access to the base has changed.",
          ),
        );
      const base = lookup(state, d.baseRef).revision?.data;
      if (p.readable && base) {
        for (const right of ["modify", "share", "export"])
          if (!base.source.rights[right] && d.data.source?.rights?.[right])
            errors.push(
              reason(
                "rights",
                "La revisione non può ampliare le capacità dichiarate della base.",
                "The revision cannot broaden the base’s declared capabilities.",
                "source.rights." + right,
              ),
            );
        for (const path of [
          "name",
          "description",
          "fields",
          "resource",
          "activities",
          "dependencies",
          "structured",
        ])
          if (!equal(base[path], d.data[path]))
            diff.push({
              path,
              label: label(path, path),
              base: copy(base[path]),
              candidate: copy(d.data[path]),
              current: copy(base[path]),
              conflict: false,
              choice: null,
            });
      }
    }
    if (Array.isArray(d.data.dependencies))
      for (const dep of d.data.dependencies) {
        if (!isRef(dep) || !dependenciesAvailable(state, dep, {}, role, "read")) {
          errors.push(
            reason(
              "dependency",
              "Una dipendenza non è disponibile o è circolare.",
              "A dependency is unavailable or circular.",
            ),
          );
          break;
        }
      }
    if (d.kind !== "revise" && (state.library ?? []).some((c) => c.id === d.contentId))
      errors.push(
        reason(
          "identity-collision",
          "Identità contenuto già usata.",
          "Content identity already used.",
        ),
      );
    if (lookup(state, { contentId: d.contentId, revisionId: `revision-${d.id}` }).revision)
      errors.push(
        reason(
          "revision-collision",
          "Identità revisione già usata.",
          "Revision identity already used.",
        ),
      );
    proposed = copy(d.data);
    if (!d.data.name?.it || !d.data.name?.en)
      warnings.push(
        reason(
          "translation",
          "Una traduzione manca; verrà mostrata quella disponibile.",
          "A translation is missing; the available one will be displayed.",
        ),
      );
  }
  const reviewKey = fingerprint({ draft: d, proposed, errors, diff, permissions: p });
  return {
    draft: copy(d),
    canApply: errors.length === 0,
    reviewKey,
    errors,
    warnings,
    proposed,
    diff,
    conflicts: diff.filter((entry) => entry.conflict),
    permissions: p,
    automation,
    returnTo: copy(d.returnTo),
  };
}
export function applyHomebrewDraft(state, id, { reviewKey }, role) {
  const d = privateDraft(state, id, role);
  if (d.status === "applied" && d.result) return copy(d.result);
  const preview = previewHomebrewDraft(state, id, role);
  if (reviewKey !== preview.reviewKey)
    fail(
      "Il confronto è cambiato: rivedilo prima di applicare.",
      "Review changed: inspect it before applying.",
    );
  if (!preview.canApply)
    fail(preview.errors[0]?.it ?? "Bozza non valida.", preview.errors[0]?.en ?? "Invalid draft.");
  const result = { draftId: id, kind: d.kind, ref: null, returnTo: copy(d.returnTo) };
  if (d.kind === "import") {
    const checked = importCheck(state, d.data.bundle, role);
    for (const entry of checked.inserts) {
      let content = (state.library ??= []).find((c) => c.id === entry.content.id);
      if (!content) {
        content = {
          id: entry.content.id,
          owner: role,
          type: entry.content.type,
          createdAt: now(),
          originRef: copy(entry.content.originRef ?? null),
          revisions: [],
          accessByRevision: {},
        };
        state.library.push(content);
      }
      content.revisions.push(copy(entry.revision));
      content.accessByRevision[entry.revision.id] = { readers: [], editors: [] };
    }
    result.refs = d.data.bundle.contents.flatMap((c) =>
      c.revisions.map((r) => ({ contentId: c.id, revisionId: r.id })),
    );
  } else if (["assign", "update"].includes(d.kind)) {
    const actor = state.actors[d.actorId],
      targetKind = preview.permissions.targetKind;
    const rows = (actor[targetKind] ??= []);
    if (d.kind === "assign") rows.push(copy(preview.proposed));
    else rows[rows.findIndex((r) => r.id === d.instanceId)] = copy(preview.proposed);
    Object.assign(result, {
      actorId: d.actorId,
      instanceId: preview.proposed.id,
      targetKind,
      ref: copy(d.baseRef),
    });
  } else {
    let content = (state.library ??= []).find((c) => c.id === d.contentId);
    if (!content) {
      content = {
        id: d.contentId,
        owner: role,
        type: d.type,
        createdAt: now(),
        originRef: d.kind === "duplicate" ? copy(d.baseRef) : null,
        revisions: [],
        accessByRevision: {},
      };
      state.library.push(content);
    }
    const revision = {
      id: `revision-${d.id}`,
      contentId: content.id,
      parentRevisionId: d.kind === "revise" ? d.baseRef.revisionId : null,
      author: role,
      createdAt: now(),
      data: copy(d.data),
    };
    content.revisions.push(revision);
    content.accessByRevision[revision.id] = {
      readers: content.owner === role ? [] : [role],
      editors: content.owner === role ? [] : [role],
    };
    result.ref = { contentId: content.id, revisionId: revision.id };
  }
  d.status = "applied";
  d.updatedAt = now();
  d.result = copy(result);
  return copy(result);
}
export function shareHomebrewRevision(state, ref, { readers, editors }, role) {
  const p = permissions(state, ref, {}, role);
  if (
    !p.canManageAccess ||
    !Array.isArray(readers) ||
    !Array.isArray(editors) ||
    [...readers, ...editors].some((r) => !roles.includes(r))
  )
    fail("Condivisione non consentita.", "Sharing unavailable.");
  const { content } = lookup(state, ref);
  const previous = content.accessByRevision?.[ref.revisionId] ?? { readers: [], editors: [] };
  if (
    !p.canShare &&
    (editors.some((viewer) => !previous.editors.includes(viewer)) ||
      readers.some(
        (viewer) => !previous.readers.includes(viewer) && !previous.editors.includes(viewer),
      ))
  )
    fail(
      "Questa revisione consente solo di ridurre o revocare gli accessi esistenti.",
      "This revision only allows reducing or revoking existing access.",
    );
  content.accessByRevision ??= {};
  content.accessByRevision[ref.revisionId] = {
    readers: [...new Set(readers)],
    editors: [...new Set(editors)],
  };
  return copy(content.accessByRevision[ref.revisionId]);
}
export function enableHomebrewRevision(state, ref, { enabled }, role) {
  if (!permissions(state, ref, {}, role).canEnable || typeof enabled !== "boolean")
    fail(
      "Solo il DM può abilitare una revisione leggibile.",
      "Only the DM can enable a readable revision.",
    );
  const list = (state.campaign.enabledContent ?? []).filter((r) => !sameRef(r, ref));
  if (enabled) list.push(copy(ref));
  state.campaign.enabledContent = list;
  return enabled;
}
export function exportHomebrewBundle(state, refs, role) {
  if (
    !Array.isArray(refs) ||
    !refs.length ||
    refs.some((ref) => !isRef(ref) || !homebrewAvailability(state, ref, {}, role).canExport)
  )
    fail("Contenuto o dipendenze non esportabili.", "Content or dependencies cannot be exported.");
  const contents = new Map(),
    included = new Set();
  function append(ref) {
    if (included.has(refKey(ref))) return;
    included.add(refKey(ref));
    const { content, revision } = lookup(state, ref);
    if (!contents.has(content.id))
      contents.set(content.id, {
        id: content.id,
        type: content.type,
        originRef: copy(content.originRef),
        revisions: [],
      });
    contents.get(content.id).revisions.push(copy(revision));
    for (const dep of revision.data.dependencies) append(dep);
  }
  for (const ref of refs) append(ref);
  return { format: "d20-studio-library", version: 1, contents: [...contents.values()] };
}
