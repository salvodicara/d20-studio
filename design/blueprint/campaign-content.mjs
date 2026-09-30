import { canViewActor } from "./character-access.mjs";
import { getHomebrewRevision } from "./homebrew.mjs";
import { parseLibraryReturn } from "./homebrew-integration.mjs";

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const idOkay = (id) => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(id);
const kinds = ["note", "world", "quest", "recap"];
// World entry types (P9 CA-19): Monk's Enhanced Journal typed pages — person, place,
// organization, shop, event, checklist — plus a free "other".
export const WORLD_TYPES = Object.freeze([
  "person",
  "place",
  "faction",
  "shop",
  "event",
  "list",
  "other",
]);
const issue = (code, it, en, path) => ({ code, it, en, ...(path ? { path } : {}) });
const fail = (it = "Contenuto non disponibile.", en = "Content unavailable.") => {
  throw Object.assign(new Error(`${it} / ${en}`), { it, en });
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const personal = () => ({ mode: "private", grants: [] });
const store = (state) => state.campaignContent ?? { version: 1, entries: [], drafts: [] };
function mutableStore(state) {
  return (state.campaignContent ??= { version: 1, entries: [], drafts: [] });
}
export function campaignReviewKey(value) {
  let hash = 2166136261;
  for (const ch of JSON.stringify(value)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
export function campaignMembers(state, campaignId = state.campaign?.id) {
  if (!campaignId || state.campaign?.id !== campaignId) return [];
  return (
    state.campaign.members ?? [
      { id: "player", name: "Giocatore / Player", role: "player" },
      { id: "dm", name: "DM", role: "dm", canOrganize: true },
    ]
  ).filter((member) => member.active !== false);
}
export function isCampaignMember(state, campaignId, viewer) {
  return campaignMembers(state, campaignId).some((member) => member.id === viewer);
}
export function canOrganizeSessions(state, campaignId, viewer) {
  const member = campaignMembers(state, campaignId).find((value) => value.id === viewer);
  return !!member && (["dm", "co-dm"].includes(member.role) || member.canOrganize === true);
}
export function getCampaignMembers(state, campaignId, viewer) {
  if (!isCampaignMember(state, campaignId, viewer)) return [];
  return clone(campaignMembers(state, campaignId));
}
export function validCampaignReturn(value) {
  return (
    value == null ||
    (object(value) &&
      [
        "campaign",
        "campaigns",
        "notes",
        "table",
        "characters",
        "builder",
        "home",
        "preparation",
        "library",
      ].includes(value.page) &&
      Object.keys(value).every((key) =>
        ["page", "id", "tab", "revision", "returnTo"].includes(key),
      ) &&
      ["id", "tab", "revision"].every(
        (key) =>
          value[key] === undefined ||
          (typeof value[key] === "string" &&
            value[key].length <= 200 &&
            !/[<>\n\r]/.test(value[key])),
      ) &&
      (value.returnTo === undefined ||
        (value.page === "library" && parseLibraryReturn(value.returnTo) !== null)))
  );
}
function accessRights(state, entry, viewer, access = entry.access) {
  if (entry.ownerId === viewer) return { read: true, edit: true, invite: true };
  if (!isCampaignMember(state, entry.campaignId, viewer))
    return { read: false, edit: false, invite: false };
  const member = campaignMembers(state, entry.campaignId).find((value) => value.id === viewer);
  const grant = (access?.grants ?? []).find((value) => value.id === viewer);
  const group =
    access?.mode === "campaign" ||
    (access?.mode === "dms" && ["dm", "co-dm"].includes(member?.role));
  const read =
    access?.mode !== "private" && (group || grant?.read === true || grant?.edit === true);
  return {
    read: !!read,
    edit: !!read && grant?.edit === true,
    invite: !!read && grant?.edit === true && grant?.invite === true,
  };
}
function permissions(state, entry, viewer) {
  const rights = accessRights(state, entry, viewer);
  return {
    canRead: rights.read,
    canEdit: rights.edit,
    canManageAccess: entry.ownerId === viewer,
    canInvite: rights.invite,
    canRestore: rights.edit,
  };
}
function audience(state, entry, access = entry.access) {
  const members = campaignMembers(state, entry.campaignId),
    ids = [...new Set([entry.ownerId, ...members.map((member) => member.id)])];
  return ids.flatMap((id) => {
    const rights = accessRights(state, entry, id, access);
    return rights.read
      ? [{ id, name: members.find((member) => member.id === id)?.name ?? id, ...rights }]
      : [];
  });
}
function validateAccess(state, campaignId, access) {
  if (
    !object(access) ||
    !["private", "dms", "selected", "campaign"].includes(access.mode) ||
    !Array.isArray(access.grants)
  )
    return [issue("access", "Accesso non valido.", "Invalid access.")];
  if (!campaignId && (access.mode !== "private" || access.grants.length))
    return [
      issue(
        "campaign-required",
        "Collega una campagna prima di condividere.",
        "Connect a campaign before sharing.",
      ),
    ];
  if (access.mode === "private" && access.grants.length)
    return [
      issue(
        "private-grants",
        "Solo io non può avere altri destinatari.",
        "Only me cannot include other recipients.",
      ),
    ];
  const members = campaignMembers(state, campaignId);
  if (
    access.grants.some(
      (g) =>
        !object(g) ||
        !idOkay(g.id) ||
        !members.some((m) => m.id === g.id) ||
        [g.read, g.edit, g.invite].some((v) => typeof v !== "boolean") ||
        (!g.read && (g.edit || g.invite)) ||
        (g.invite && !g.edit),
    ) ||
    new Set(access.grants.map((g) => g.id)).size !== access.grants.length
  )
    return [
      issue(
        "grants",
        "Controlla persone e permessi della campagna.",
        "Check campaign recipients and permissions.",
      ),
    ];
  return [];
}
function entryById(state, id) {
  return store(state).entries.find((entry) => entry.id === id);
}
function currentRevision(entry) {
  return entry?.revisions.find((revision) => revision.id === entry.currentRevisionId);
}
function revisionAllowed(state, entry, revision, viewer) {
  return (
    !!revision &&
    permissions(state, entry, viewer).canRead &&
    (entry.ownerId === viewer ||
      revision.id === entry.currentRevisionId ||
      revision.audience.includes(viewer) ||
      (entry.historyAccess?.[revision.id] ?? []).includes(viewer))
  );
}
const validLink = (link) =>
  object(link) &&
  (link.kind === "homebrew"
    ? object(link.ref) && idOkay(link.ref.contentId) && idOkay(link.ref.revisionId)
    : ["entry", "actor", "scene"].includes(link.kind) && idOkay(link.id));
export function resolveCampaignLinks(state, refs, viewer) {
  if (!Array.isArray(refs)) return [];
  return refs.flatMap((ref) => {
    if (!validLink(ref)) return [];
    if (ref.kind === "entry") {
      const entry = entryById(state, ref.id);
      if (!entry || !permissions(state, entry, viewer).canRead) return [];
      return [
        {
          ...clone(ref),
          label: currentRevision(entry)?.data.title || "Senza titolo / Untitled",
          route: { page: entry.kind === "note" ? "notes" : "campaign", tab: "entry", id: entry.id },
        },
      ];
    }
    if (ref.kind === "actor") {
      const actor = state.actors?.[ref.id];
      if (!canViewActor(actor, viewer)) return [];
      return [
        {
          ...clone(ref),
          label: actor.name || actor.id,
          route: { page: "characters", id: actor.id },
        },
      ];
    }
    if (ref.kind === "scene") {
      const scene = state.scenes?.find((value) => value.id === ref.id),
        member = campaignMembers(state).find((value) => value.id === viewer);
      if (!scene || !member) return [];
      const dm = ["dm", "co-dm"].includes(member.role);
      if (scene.id === state.activeSceneId && (scene.revealed || dm))
        return [{ ...clone(ref), label: scene.name, route: { page: "table" } }];
      if (dm)
        return [{ ...clone(ref), label: scene.name, route: { page: "preparation", id: scene.id } }];
      return [];
    }
    try {
      const revision = getHomebrewRevision(state, ref.ref, viewer);
      return [
        {
          ...clone(ref),
          label: revision.data.name.it || revision.data.name.en,
          route: { page: "library", id: ref.ref.contentId, revision: ref.ref.revisionId },
        },
      ];
    } catch {
      return [];
    }
  });
}
function sectionReadable(state, entry, section, viewer, revision) {
  if (!accessRights(state, entry, viewer, section.access).read) return false;
  if (revision && revision.id !== entry.currentRevisionId && entry.ownerId !== viewer) {
    const current = currentRevision(entry)?.data.sections.find((value) => value.id === section.id);
    if (!current || !accessRights(state, entry, viewer, current.access).read) return false;
  }
  return (
    !revision ||
    revision.id === entry.currentRevisionId ||
    entry.ownerId === viewer ||
    (revision.sectionAudience?.[section.id] ?? []).includes(viewer)
  );
}
function projectedData(state, entry, data, viewer, revision) {
  const result = clone(data);
  result.links = resolveCampaignLinks(state, data.links, viewer).map(
    ({ label, route, ...ref }) => ref,
  );
  result.sections = (data.sections ?? [])
    .filter((section) => sectionReadable(state, entry, section, viewer, revision))
    .map((section) => {
      const row = clone(section);
      if (entry.ownerId !== viewer) delete row.access;
      return row;
    });
  if (result.narratorActorId && !canViewActor(state.actors?.[result.narratorActorId], viewer))
    result.narratorActorId = null;
  if (result.parentId) {
    const parent = entryById(state, result.parentId);
    if (!parent || !permissions(state, parent, viewer).canRead) result.parentId = null;
  }
  return result;
}
export function getCampaignEntry(state, id, viewer, { revisionId } = {}) {
  const entry = entryById(state, id),
    revision = entry?.revisions.find(
      (value) => value.id === (revisionId ?? entry.currentRevisionId),
    );
  if (!entry || !revisionAllowed(state, entry, revision, viewer)) fail();
  return {
    id: entry.id,
    kind: entry.kind,
    campaignId: entry.campaignId,
    ownerId: entry.ownerId,
    currentRevisionId: entry.currentRevisionId,
    revisionId: revision.id,
    createdAt: entry.createdAt,
    updatedAt: currentRevision(entry).createdAt,
    data: projectedData(state, entry, revision.data, viewer, revision),
    permissions: permissions(state, entry, viewer),
    accessRevision: entry.accessRevision,
    ...(entry.ownerId === viewer ? { access: clone(entry.access) } : {}),
    history: entry.revisions
      .filter((value) => revisionAllowed(state, entry, value, viewer))
      .map(({ id, parentRevisionId, authorId, createdAt, restoredFrom, change }) => ({
        id,
        parentRevisionId,
        authorId,
        createdAt,
        // P9 CA-82: a restored text names its source version (Kanka «View changes»); a
        // one-click change (reveal, link) names what it did.
        ...(restoredFrom ? { restoredFrom } : {}),
        ...(change ? { change: clone(change) } : {}),
      })),
  };
}
export function listCampaignEntries(state, { campaignId, kind, worldType, query } = {}, viewer) {
  return store(state)
    .entries.filter(
      (entry) =>
        (campaignId === undefined || entry.campaignId === campaignId) &&
        (!kind || entry.kind === kind) &&
        permissions(state, entry, viewer).canRead,
    )
    .map((entry) => getCampaignEntry(state, entry.id, viewer))
    .filter(
      (entry) =>
        (!worldType || entry.data.worldType === worldType) &&
        (!query ||
          [
            entry.data.title,
            entry.data.body,
            ...entry.data.sections.flatMap((section) => [section.title, section.body]),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(String(query).toLocaleLowerCase())),
    )
    .sort(
      (a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") ||
        store(state).entries.findIndex((entry) => entry.id === b.id) -
          store(state).entries.findIndex((entry) => entry.id === a.id),
    );
}
export function getCampaignHub(state, campaignId, viewer, now = Date.now()) {
  const canRead = isCampaignMember(state, campaignId, viewer),
    canOrganize = canOrganizeSessions(state, campaignId, viewer);
  if (!canRead)
    return {
      campaign: null,
      latestRecap: null,
      upcomingSession: null,
      counts: { notes: 0, world: 0, quests: 0, recaps: 0 },
      canOrganize: false,
      permissions: { canRead: false, canOrganize: false },
    };
  const entries = listCampaignEntries(state, { campaignId }, viewer),
    sessions = (state.campaign.sessions ?? [])
      .filter(
        (value) =>
          value.status === "scheduled" && value.startsAt && Date.parse(value.startsAt) >= now,
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const upcomingSession = sessions[0]
    ? {
        ...clone(sessions[0]),
        permissions: { canRead: true, canManage: canOrganize, canConfirm: canOrganize },
      }
    : null;
  return {
    campaign: { id: campaignId, name: state.campaign.name },
    latestRecap: entries.find((entry) => entry.kind === "recap") ?? null,
    upcomingSession,
    canOrganize,
    counts: {
      notes: entries.filter((e) => e.kind === "note").length,
      world: entries.filter((e) => e.kind === "world").length,
      quests: entries.filter((e) => e.kind === "quest").length,
      recaps: entries.filter((e) => e.kind === "recap").length,
    },
    permissions: { canRead, canOrganize },
  };
}
function defaultData() {
  return {
    title: "",
    body: "",
    worldType: "other",
    questStatus: "open",
    sessionId: null,
    narratorActorId: null,
    links: [],
    sections: [],
  };
}
function privateDraft(state, id, viewer) {
  const d = store(state).drafts.find((value) => value.id === id && value.ownerId === viewer);
  if (!d) fail("Bozza non disponibile.", "Draft unavailable.");
  return d;
}
export const getCampaignDraft = (state, id, viewer) => clone(privateDraft(state, id, viewer));
export const listCampaignDrafts = (state, viewer) =>
  clone(store(state).drafts.filter((d) => d.ownerId === viewer && d.status === "active"));
export function createCampaignDraft(
  state,
  {
    id,
    kind = "note",
    entryId,
    campaignId = null,
    sessionId = null,
    restoreRevisionId,
    returnTo = null,
  },
  viewer,
) {
  if (
    !idOkay(id) ||
    !idOkay(viewer) ||
    !kinds.includes(kind) ||
    !validCampaignReturn(returnTo) ||
    store(state).drafts.some((d) => d.id === id)
  )
    fail("Richiesta bozza non valida.", "Invalid draft request.");
  let data = defaultData(),
    access = personal(),
    baseRevisionId = null,
    baseAccessRevision = null;
  if (entryId) {
    const entry = entryById(state, entryId);
    if (!entry || !permissions(state, entry, viewer).canEdit) fail();
    const projected = getCampaignEntry(state, entryId, viewer, { revisionId: restoreRevisionId });
    data = projected.data;
    kind = entry.kind;
    campaignId = entry.campaignId;
    if (restoreRevisionId) {
      const current = getCampaignEntry(state, entryId, viewer),
        past = new Map(data.sections.map((section) => [section.id, section]));
      data.sections = current.data.sections.map((section) => ({
        ...clone(section),
        title: past.get(section.id)?.title ?? section.title,
        body: past.get(section.id)?.body ?? section.body,
      }));
      if (entry.ownerId === viewer)
        for (const section of past.values())
          if (!data.sections.some((value) => value.id === section.id))
            data.sections.push({ ...clone(section), access: personal() });
    }
    access = entry.ownerId === viewer ? clone(entry.access) : null;
    baseRevisionId = entry.currentRevisionId;
    baseAccessRevision = entry.accessRevision;
  } else {
    if (campaignId && !isCampaignMember(state, campaignId, viewer)) fail();
    if (kind !== "note" && !campaignId) fail("Scegli una campagna.", "Choose a campaign.");
    data.sessionId = sessionId;
  }
  const d = {
    id,
    ownerId: viewer,
    kind,
    entryId: entryId ?? null,
    campaignId,
    baseRevisionId,
    baseAccessRevision,
    restoreRevisionId: restoreRevisionId ?? null,
    revision: 0,
    status: "active",
    data,
    access,
    returnTo: clone(returnTo),
    createdAt: now(),
    updatedAt: now(),
    result: null,
  };
  mutableStore(state).drafts.push(d);
  return clone(d);
}
export function saveCampaignDraft(
  state,
  id,
  { data, access, expectedDraftRevision, baseRevisionId, campaignId },
  viewer,
) {
  const d = privateDraft(state, id, viewer);
  if (
    d.status !== "active" ||
    (expectedDraftRevision !== undefined && expectedDraftRevision !== d.revision)
  )
    fail("La bozza è cambiata o conclusa.", "Draft changed or completed.");
  if (!object(data)) fail("Dati non validi.", "Invalid data.");
  const entry = d.entryId ? entryById(state, d.entryId) : null;
  if (baseRevisionId !== undefined) {
    if (
      !entry ||
      !permissions(state, entry, viewer).canEdit ||
      baseRevisionId !== entry.currentRevisionId
    )
      fail();
    d.baseRevisionId = baseRevisionId;
    d.baseAccessRevision = entry.accessRevision;
  }
  if (campaignId !== undefined) {
    if (entry && entry.ownerId !== viewer) fail();
    if (campaignId && !isCampaignMember(state, campaignId, viewer)) fail();
    d.campaignId = campaignId;
  }
  if (access !== undefined) {
    if (entry && entry.ownerId !== viewer && access !== null) fail();
    d.access = clone(access);
  }
  d.data = clone(data);
  d.revision++;
  d.updatedAt = now();
  return clone(d);
}
export function discardCampaignDraft(state, id, viewer) {
  const d = privateDraft(state, id, viewer);
  if (d.status === "applied") fail("Bozza già applicata.", "Draft already applied.");
  d.status = "discarded";
  return clone(d);
}
function validateData(state, data, entry, viewer) {
  const errors = [];
  if (
    !object(data) ||
    typeof data.title !== "string" ||
    typeof data.body !== "string" ||
    (!data.title.trim() && !data.body.trim())
  )
    errors.push(issue("text", "Inserisci un titolo o del testo.", "Enter a title or some text."));
  if (
    !WORLD_TYPES.includes(data.worldType) ||
    !["open", "completed", "failed", "abandoned"].includes(data.questStatus)
  )
    errors.push(issue("kind-fields", "Tipo o stato non valido.", "Invalid type or status."));
  if (
    data.sessionId !== null &&
    (!idOkay(data.sessionId) ||
      !isCampaignMember(state, entry.campaignId, viewer) ||
      !state.campaign?.sessions?.some((s) => s.id === data.sessionId))
  )
    errors.push(issue("session", "Sessione non disponibile.", "Session unavailable."));
  if (data.narratorActorId !== null && !canViewActor(state.actors?.[data.narratorActorId], viewer))
    errors.push(
      issue("narrator", "Personaggio narrante non disponibile.", "Narrator character unavailable."),
    );
  // P9 CA-16: an entry may sit inside another readable entry of the same campaign.
  if (data.parentId != null) {
    const parent = idOkay(data.parentId) ? entryById(state, data.parentId) : null;
    if (
      !parent ||
      parent.id === entry.id ||
      parent.campaignId !== entry.campaignId ||
      !permissions(state, parent, viewer).canRead
    )
      errors.push(
        issue(
          "parent",
          "La voce che dovrebbe contenerla non è disponibile: scegline un’altra o nessuna.",
          "The entry that should contain it is unavailable: choose another or none.",
        ),
      );
  }
  if (
    !Array.isArray(data.links) ||
    data.links.some((link) => !validLink(link)) ||
    resolveCampaignLinks(state, data.links, viewer).length !== data.links?.length
  )
    errors.push(issue("links", "Un collegamento non è disponibile.", "A link is unavailable."));
  if (
    !Array.isArray(data.sections) ||
    data.sections.some(
      (section) =>
        !object(section) ||
        !idOkay(section.id) ||
        typeof section.title !== "string" ||
        typeof section.body !== "string",
    ) ||
    new Set((data.sections ?? []).map((s) => s.id)).size !== data.sections?.length
  )
    errors.push(issue("sections", "Sezioni non valide.", "Invalid sections."));
  else
    for (const section of data.sections)
      if (entry.ownerId === viewer)
        errors.push(...validateAccess(state, entry.campaignId, section.access));
  return errors;
}
function buildPreview(state, id, viewer) {
  const d = privateDraft(state, id, viewer),
    existing = d.entryId ? entryById(state, d.entryId) : null;
  const errors = [],
    conflicts = [];
  let current = null,
    payload = null;
  if (d.status !== "active")
    errors.push(issue("closed", "Bozza già conclusa.", "Draft already completed."));
  if (d.entryId && (!existing || !permissions(state, existing, viewer).canEdit))
    errors.push(
      issue(
        "permission",
        "Non puoi più modificare questa voce.",
        "You can no longer edit this entry.",
      ),
    );
  else if (existing) {
    current = getCampaignEntry(state, existing.id, viewer);
    if (
      existing.currentRevisionId !== d.baseRevisionId ||
      existing.accessRevision !== d.baseAccessRevision
    ) {
      conflicts.push({
        code: "revision",
        baseRevisionId: d.baseRevisionId,
        currentRevisionId: existing.currentRevisionId,
      });
      errors.push(
        issue(
          "conflict",
          "La voce o gli accessi sono cambiati: confronta e riprendi.",
          "Entry or access changed: compare and resume.",
        ),
      );
    }
  }
  const proposedEntry = {
    ...(existing ?? {}),
    id: existing?.id ?? `entry-${d.id}`,
    kind: d.kind,
    ownerId: existing?.ownerId ?? viewer,
    campaignId: d.campaignId,
    access: clone(existing && existing.ownerId !== viewer ? existing.access : d.access),
  };
  errors.push(...validateAccess(state, d.campaignId, proposedEntry.access));
  if (d.campaignId && !isCampaignMember(state, d.campaignId, viewer))
    errors.push(issue("campaign", "Campagna non disponibile.", "Campaign unavailable."));
  if (!d.campaignId && d.kind !== "note")
    errors.push(issue("campaign-required", "Scegli una campagna.", "Choose a campaign."));
  errors.push(...validateData(state, d.data, proposedEntry, viewer));
  if (existing && existing.ownerId !== viewer && current) {
    const allowed = new Map(current.data.sections.map((section) => [section.id, section]));
    if (
      d.data.sections?.some(
        (section) => !allowed.has(section.id) || Object.hasOwn(section, "access"),
      ) ||
      d.data.sections?.length !== allowed.size
    )
      errors.push(
        issue(
          "section-authority",
          "Solo l’autore gestisce sezioni e destinatari.",
          "Only the owner manages sections and recipients.",
        ),
      );
  }
  if (!existing && store(state).entries.some((e) => e.id === proposedEntry.id))
    errors.push(issue("identity", "Identità già usata.", "Identity already used."));
  if (!errors.length) {
    payload = clone(d.data);
    if (existing && existing.ownerId !== viewer) {
      const raw = currentRevision(existing).data;
      payload.sections = raw.sections.map((section) => {
        const edit = d.data.sections.find((s) => s.id === section.id);
        return edit ? { ...clone(section), title: edit.title, body: edit.body } : clone(section);
      });
      const visibleKeys = new Set(current.data.links.map((link) => JSON.stringify(link)));
      payload.links = [
        ...clone(d.data.links),
        ...raw.links.filter((link) => !visibleKeys.has(JSON.stringify(link))).map(clone),
      ];
      if (
        payload.narratorActorId === null &&
        raw.narratorActorId &&
        !canViewActor(state.actors?.[raw.narratorActorId], viewer)
      )
        payload.narratorActorId = raw.narratorActorId;
    }
  }
  const local =
    proposedEntry.access?.mode === "private" &&
    (!existing || existing.access.mode === "private") &&
    (!existing || existing.campaignId === d.campaignId);
  const denied = errors.some((e) => e.code === "permission");
  const result = {
    draft: clone(d),
    proposed: denied ? null : clone(d.data),
    current,
    audience: denied ? [] : audience(state, proposedEntry),
    errors,
    conflicts,
    canApply: errors.length === 0,
    commit: { local, visibility: "private", undoable: false },
    returnTo: clone(d.returnTo),
  };
  result.reviewKey = campaignReviewKey({
    draft: d,
    payload,
    errors,
    currentRevisionId: existing?.currentRevisionId,
    accessRevision: existing?.accessRevision,
    audience: result.audience,
  });
  return { result, payload, proposedEntry };
}
export function previewCampaignDraft(state, id, viewer) {
  return buildPreview(state, id, viewer).result;
}
export function previewCampaignAudience(state, id, recipientId, viewer) {
  const { result, proposedEntry } = buildPreview(state, id, viewer),
    d = privateDraft(state, id, viewer);
  if (result.errors.some((error) => error.code === "permission")) fail();
  const recipient = result.audience.find((person) => person.id === recipientId);
  if (!recipient) fail();
  const existing = d.entryId ? entryById(state, d.entryId) : null,
    data = clone(d.data);
  if (existing && existing.ownerId !== viewer) {
    const raw = currentRevision(existing).data;
    data.sections = (d.data.sections ?? []).flatMap((section) => {
      const base = raw.sections.find((value) => value.id === section.id);
      return base && sectionReadable(state, existing, base, viewer)
        ? [{ ...clone(base), title: section.title, body: section.body }]
        : [];
    });
  }
  const caller = projectedData(state, proposedEntry, data, viewer);
  // Keep access metadata only internally for the second projection, never recover hidden sections.
  caller.sections = caller.sections.map((section) => ({
    ...section,
    access: data.sections.find((value) => value.id === section.id)?.access ?? personal(),
  }));
  return {
    recipient: { id: recipient.id, name: recipient.name },
    entryId: d.entryId,
    kind: d.kind,
    data: projectedData(state, proposedEntry, caller, recipientId),
  };
}
function appendRevision(state, entry, data, id, viewer) {
  const readers = audience(state, entry).map((value) => value.id);
  const revision = {
    id,
    parentRevisionId: entry.currentRevisionId ?? null,
    authorId: viewer,
    createdAt: now(),
    data: clone(data),
    audience: readers,
    sectionAudience: Object.fromEntries(
      data.sections.map((section) => [
        section.id,
        readers.filter((id) => accessRights(state, entry, id, section.access).read),
      ]),
    ),
  };
  entry.revisions.push(revision);
  entry.currentRevisionId = id;
  entry.updatedAt = revision.createdAt;
}
export function applyCampaignDraft(state, id, { reviewKey }, viewer, { online = true } = {}) {
  const d = privateDraft(state, id, viewer);
  if (d.status === "applied" && d.result) return clone(d.result);
  const { result: p, payload, proposedEntry } = buildPreview(state, id, viewer);
  if (p.reviewKey !== reviewKey)
    fail("Il riepilogo è cambiato: rivedilo.", "Review changed; inspect it again.");
  if (!p.canApply) fail(p.errors[0].it, p.errors[0].en);
  if (!p.commit.local && !online)
    fail("La modifica condivisa richiede connessione.", "Shared changes require a connection.");
  let entry = entryById(state, proposedEntry.id);
  if (!entry) {
    entry = {
      id: proposedEntry.id,
      kind: d.kind,
      campaignId: d.campaignId,
      ownerId: viewer,
      currentRevisionId: null,
      revisions: [],
      access: clone(proposedEntry.access),
      accessRevision: 0,
      historyAccess: {},
      createdAt: now(),
    };
    mutableStore(state).entries.push(entry);
  } else if (!same(entry.access, proposedEntry.access) || entry.campaignId !== d.campaignId) {
    entry.access = clone(proposedEntry.access);
    entry.campaignId = d.campaignId;
    entry.accessRevision++;
  }
  const revisionId = `revision-${d.id}`;
  appendRevision(state, entry, payload, revisionId, viewer);
  if (d.restoreRevisionId) entry.revisions.at(-1).restoredFrom = d.restoreRevisionId;
  d.status = "applied";
  d.result = { draftId: id, entryId: entry.id, revisionId, returnTo: clone(d.returnTo) };
  d.updatedAt = now();
  return clone(d.result);
}
export function setCampaignEntryAccess(
  state,
  id,
  { access, expectedAccessRevision },
  viewer,
  { online = true } = {},
) {
  const entry = entryById(state, id);
  if (!entry || entry.ownerId !== viewer) fail();
  if (!online) fail("La condivisione richiede connessione.", "Sharing requires a connection.");
  const errors = validateAccess(state, entry.campaignId, access);
  if (errors.length) fail(errors[0].it, errors[0].en);
  if (same(entry.access, access)) return getCampaignEntry(state, id, viewer);
  if (expectedAccessRevision !== entry.accessRevision)
    fail("Gli accessi sono cambiati.", "Access changed.");
  entry.access = clone(access);
  entry.accessRevision++;
  entry.historyAccess ??= {};
  entry.historyAccess[entry.currentRevisionId] = [
    ...new Set([
      ...(entry.historyAccess[entry.currentRevisionId] ?? []),
      ...audience(state, entry).map((value) => value.id),
    ]),
  ];
  return getCampaignEntry(state, id, viewer);
}
export function inviteCampaignReader(
  state,
  id,
  { memberId, expectedAccessRevision },
  viewer,
  { online = true } = {},
) {
  const entry = entryById(state, id);
  if (
    !entry ||
    !permissions(state, entry, viewer).canInvite ||
    !isCampaignMember(state, entry.campaignId, memberId)
  )
    fail();
  if (!online) fail("L’invito richiede connessione.", "Invitation requires a connection.");
  if (expectedAccessRevision !== entry.accessRevision)
    fail("Gli accessi sono cambiati.", "Access changed.");
  if (accessRights(state, entry, memberId).read) return getCampaignEntry(state, id, viewer);
  if (entry.access.mode === "private")
    fail("Condividi prima questa voce.", "Share this entry first.");
  entry.access.grants.push({ id: memberId, read: true, edit: false, invite: false });
  entry.accessRevision++;
  entry.historyAccess ??= {};
  entry.historyAccess[entry.currentRevisionId] = [
    ...new Set([...(entry.historyAccess[entry.currentRevisionId] ?? []), memberId]),
  ];
  return getCampaignEntry(state, id, viewer);
}
export function migrateCampaignContent(state) {
  if (
    (state.campaign &&
      Object.hasOwn(state.campaign, "sessions") &&
      (!Array.isArray(state.campaign.sessions) ||
        state.campaign.sessions.some(
          (session) =>
            !object(session) ||
            !idOkay(session.id) ||
            typeof session.title !== "string" ||
            !Number.isInteger(session.revision) ||
            session.revision < 1 ||
            !["scheduled", "cancelled", "unscheduled"].includes(session.status) ||
            !(
              session.startsAt === null ||
              (typeof session.startsAt === "string" &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(session.startsAt) &&
                Number.isFinite(Date.parse(session.startsAt)))
            ),
        ))) ||
    (Object.hasOwn(state, "notes") &&
      (!Array.isArray(state.notes) ||
        state.notes.some(
          (note) => !object(note) || !idOkay(note.owner) || typeof note.body !== "string",
        ))) ||
    (state.campaign &&
      Object.hasOwn(state.campaign, "journal") &&
      (!Array.isArray(state.campaign.journal) ||
        state.campaign.journal.some(
          (row) =>
            !object(row) ||
            typeof row.body !== "string" ||
            (row.title !== undefined && typeof row.title !== "string"),
        ))) ||
    (state.campaign &&
      Object.hasOwn(state.campaign, "summary") &&
      typeof state.campaign.summary !== "string") ||
    (state.campaignContent &&
      (!object(state.campaignContent) ||
        state.campaignContent.version !== 1 ||
        !Array.isArray(state.campaignContent.entries) ||
        !Array.isArray(state.campaignContent.drafts)))
  )
    fail(
      "Dati precedenti non riconosciuti: conserva il salvataggio originale.",
      "Unrecognized legacy data: preserve the original save.",
    );
  const target = mutableStore(state);
  if (target.migratedLegacy) return;
  if (state.campaign) {
    state.campaign.members ??= clone(campaignMembers(state));
    state.campaign.sessions ??= [];
    state.campaign.polls ??= [];
    state.campaign.sessionDrafts ??= [];
  }
  const add = (id, kind, ownerId, campaignId, title, body, access, metadata = {}) => {
    if (target.entries.some((entry) => entry.id === id)) return;
    const entry = {
      id,
      kind,
      ownerId,
      campaignId,
      access,
      accessRevision: 0,
      currentRevisionId: null,
      revisions: [],
      historyAccess: {},
      createdAt: now(),
    };
    appendRevision(state, entry, { ...defaultData(), title, body }, `revision-${id}`, ownerId);
    const revision = entry.revisions[0],
      date =
        typeof metadata.createdAt === "string" && Number.isFinite(Date.parse(metadata.createdAt))
          ? metadata.createdAt
          : null;
    revision.authorId = idOkay(metadata.authorId ?? metadata.author)
      ? (metadata.authorId ?? metadata.author)
      : null;
    revision.createdAt = date;
    revision.provenance = {
      kind: "legacy",
      importedAt: now(),
      ...(metadata.id ? { legacyId: metadata.id } : {}),
    };
    entry.createdAt = date;
    entry.updatedAt = date;
    target.entries.push(entry);
  };
  const notes = Array.isArray(state.notes) ? state.notes : [];
  notes.forEach((note, i) =>
    add(`legacy-note-${i}`, "note", note.owner, null, "", note.body, personal(), {
      ...note,
      authorId: note.authorId ?? note.author ?? note.owner,
    }),
  );
  delete state.notes;
  if (state.campaign) {
    const journal = Array.isArray(state.campaign.journal) ? state.campaign.journal : [];
    const administrativeOwner =
      campaignMembers(state).find((member) => member.role === "dm")?.id ?? "dm";
    if (typeof state.campaign.summary === "string") {
      if (state.campaign.summary.trim())
        add(
          "legacy-recap-summary",
          "recap",
          administrativeOwner,
          state.campaign.id,
          "",
          state.campaign.summary,
          { mode: "campaign", grants: [] },
        );
      delete state.campaign.summary;
    }
    journal.forEach((row, i) =>
      add(
        `legacy-recap-${i}`,
        "recap",
        idOkay(row.ownerId ?? row.owner) ? (row.ownerId ?? row.owner) : administrativeOwner,
        state.campaign.id,
        row.title ?? "",
        row.body,
        { mode: "campaign", grants: [] },
        row,
      ),
    );
    delete state.campaign.journal;
  }
  target.migratedLegacy = true;
}

// =======================================================================================
// P9 — one journal engine for every entry (triage CA-12…CA-24, CA-82, SV-05). Commands a
// reader performs in one click on a saved entry: delete, reveal or hide a section, link a
// mention or tick a checklist line. Each change is a new text revision (never a rewrite of
// history) and keeps sections the author hides from this viewer untouched.

const nextRevisionId = (entry) => {
  let n = entry.revisions.length + 1;
  while (entry.revisions.some((revision) => revision.id === `revision-${entry.id}-${n}`)) n++;
  return `revision-${entry.id}-${n}`;
};
/** Whether an entry was ever read by someone other than its owner (sharing needs the network). */
function everShared(entry) {
  return (
    entry.access.mode !== "private" ||
    entry.revisions.some((revision) => revision.audience.some((id) => id !== entry.ownerId))
  );
}
/** Deletes an entry (Kanka, D&D Beyond notes: «Elimina» with a confirmation). Owner only. */
export function deleteCampaignEntry(state, id, viewer, { online = true } = {}) {
  const entry = entryById(state, id);
  if (!entry || !permissions(state, entry, viewer).canRead) fail();
  if (entry.ownerId !== viewer)
    fail(
      "Solo chi ha scritto la voce può eliminarla: chiedi all’autore.",
      "Only the entry’s author can delete it: ask the author.",
    );
  const shared = everShared(entry);
  if (shared && !online)
    fail(
      "Eliminare una voce condivisa richiede la connessione: riprova quando torni in rete.",
      "Deleting a shared entry needs a connection: try again when you are back online.",
    );
  const target = mutableStore(state);
  target.entries = target.entries.filter((row) => row.id !== id);
  for (const d of target.drafts)
    if (d.entryId === id && d.status === "active") d.status = "discarded";
  return { id, title: currentRevision(entry)?.data.title ?? "", shared };
}
/**
 * Reveals (or hides again) one section of an entry to the audience given (LegendKeeper
 * /secret, Foundry secret blocks with «Reveal»). Owner only; a new revision, so readers
 * never see earlier hidden text through history.
 */
export function setCampaignSectionAccess(
  state,
  entryId,
  sectionId,
  access,
  viewer,
  { online = true } = {},
) {
  const entry = entryById(state, entryId);
  if (!entry || entry.ownerId !== viewer)
    fail(
      "Solo chi ha scritto la voce rivela o nasconde le sue sezioni.",
      "Only the entry’s author reveals or hides its sections.",
    );
  if (!online)
    fail(
      "Rivelare o nascondere richiede la connessione: riprova quando torni in rete.",
      "Revealing or hiding needs a connection: try again when you are back online.",
    );
  const errors = validateAccess(state, entry.campaignId, access);
  if (errors.length) fail(errors[0].it, errors[0].en);
  const data = clone(currentRevision(entry).data);
  const section =
    data.sections.find((row) => row.id === sectionId) ??
    fail("Sezione non trovata: riapri la voce.", "Section not found: reopen the entry.");
  if (same(section.access, access)) return getCampaignEntry(state, entryId, viewer);
  section.access = clone(access);
  appendRevision(state, entry, data, nextRevisionId(entry), viewer);
  entry.revisions.at(-1).change = {
    kind: access.mode === "private" ? "hide" : "reveal",
    sectionId,
  };
  return getCampaignEntry(state, entryId, viewer);
}
/**
 * Replaces one exact piece of text in the body or in a readable section (a confirmed link
 * suggestion, a ticked checklist line). Editors only; the text must still be there.
 */
export function editCampaignText(
  state,
  entryId,
  { sectionId = null, index, from, to, change = "edit" },
  viewer,
  { online = true } = {},
) {
  const entry = entryById(state, entryId);
  if (!entry || !permissions(state, entry, viewer).canEdit)
    fail(
      "Non puoi modificare questa voce: chiedi all’autore il permesso di modifica.",
      "You cannot edit this entry: ask the author for edit permission.",
    );
  if (typeof from !== "string" || typeof to !== "string" || !Number.isInteger(index) || index < 0)
    fail("Modifica non valida.", "Invalid change.");
  const data = clone(currentRevision(entry).data);
  let holder = data;
  if (sectionId) {
    holder = data.sections.find((row) => row.id === sectionId);
    if (!holder || !sectionReadable(state, entry, holder, viewer)) fail();
  }
  const text = holder.body ?? "";
  if (text.slice(index, index + from.length) !== from)
    fail(
      "Il testo è cambiato nel frattempo: riapri la voce e riprova.",
      "The text changed meanwhile: reopen the entry and try again.",
    );
  if (!online && everShared(entry))
    fail(
      "La modifica di una voce condivisa richiede la connessione.",
      "Changing a shared entry needs a connection.",
    );
  holder.body = text.slice(0, index) + to + text.slice(index + from.length);
  if (holder.body.length > 20000) fail("Il testo è troppo lungo.", "The text is too long.");
  appendRevision(state, entry, data, nextRevisionId(entry), viewer);
  entry.revisions.at(-1).change = { kind: change, ...(sectionId ? { sectionId } : {}) };
  return { entryId, revisionId: entry.currentRevisionId, local: !everShared(entry) };
}
/** Whether a change to this entry by its owner stays on this device (never shared). */
export function isLocalEntry(state, id) {
  const entry = entryById(state, id);
  return Boolean(entry) && !everShared(entry);
}

/**
 * Line diff between two texts (longest common subsequence), for «Cronologia»: Kanka's
 * «View changes» shows what each version removed and added.
 * Returns [{op: "same" | "add" | "del", text}].
 */
export function diffText(before = "", after = "") {
  const a = String(before ?? "").split("\n");
  const b = String(after ?? "").split("\n");
  const n = a.length,
    m = b.length;
  if (n * m > 250000)
    return [...a.map((text) => ({ op: "del", text })), ...b.map((text) => ({ op: "add", text }))];
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ op: "del", text: a[i++] });
    else out.push({ op: "add", text: b[j++] });
  }
  while (i < n) out.push({ op: "del", text: a[i++] });
  while (j < m) out.push({ op: "add", text: b[j++] });
  return out;
}
/** The readable text of one version as plain lines (title, body, readable sections). */
export function revisionText(state, entryId, revisionId, viewer) {
  const entry = getCampaignEntry(state, entryId, viewer, { revisionId });
  return [
    entry.data.title,
    entry.data.body,
    ...entry.data.sections.flatMap((section) => [`## ${section.title}`, section.body]),
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}

// ---- Templates and property kits (Kanka Property Kits, World Anvil templates; CA-17).
// A template is private to its author until shared with the campaign. Fields become lines
// "Label: " in the text (a Mondo/Diario entry) or properties (an Archive page).
const TEMPLATE_KINDS = ["note", "world", "quest", "recap", "page"];
const store2 = (state) => store(state).templates ?? [];
const text = (value, max, it, en, required = false) => {
  const out = typeof value === "string" ? value.trim() : "";
  if (required && !out) fail(`${it}: scrivilo.`, `${en}: write it.`);
  if (out.length > max)
    fail(`${it}: al massimo ${max} caratteri.`, `${en}: at most ${max} characters.`);
  return out;
};
export function listEntryTemplates(state, viewer, { kind } = {}) {
  const campaignId = state.campaign?.id ?? null;
  return clone(
    store2(state).filter(
      (row) =>
        (row.ownerId === viewer ||
          (row.shared &&
            row.campaignId === campaignId &&
            isCampaignMember(state, campaignId, viewer))) &&
        (!kind || row.kind === kind),
    ),
  );
}
export function saveEntryTemplate(state, input, viewer) {
  if (!idOkay(viewer)) fail();
  const kind = TEMPLATE_KINDS.includes(input?.kind) ? input.kind : "world";
  const fields = (Array.isArray(input?.fields) ? input.fields : []).slice(0, 30).map((field) => ({
    label: text(field?.label, 80, "Nome del campo", "Field name", true),
    secret: field?.secret === true,
  }));
  const sections = (Array.isArray(input?.sections) ? input.sections : [])
    .slice(0, 10)
    .map((section) => ({
      title: text(section?.title, 120, "Titolo della sezione", "Section title"),
      body: text(section?.body, 4000, "Testo della sezione", "Section text"),
      secret: section?.secret === true,
    }));
  const row = {
    id: idOkay(input?.id)
      ? input.id
      : `template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ownerId: viewer,
    campaignId: state.campaign?.id ?? null,
    shared: input?.shared === true && Boolean(state.campaign?.id),
    name: text(input?.name, 80, "Nome del modello", "Template name", true),
    kind,
    worldType: WORLD_TYPES.includes(input?.worldType) ? input.worldType : "other",
    pageType: typeof input?.pageType === "string" ? input.pageType.slice(0, 40) : null,
    title: text(input?.title, 200, "Titolo", "Title"),
    body: text(input?.body, 8000, "Testo", "Text"),
    fields,
    sections,
    createdAt: now(),
  };
  const target = mutableStore(state);
  target.templates ??= [];
  const existing = target.templates.findIndex((entry) => entry.id === row.id);
  if (existing >= 0 && target.templates[existing].ownerId !== viewer)
    fail("Solo chi l’ha creato modifica un modello.", "Only its author changes a template.");
  if (target.templates.length >= 100 && existing < 0)
    fail("Hai già 100 modelli: eliminane uno.", "You already have 100 templates: delete one.");
  if (existing >= 0) target.templates[existing] = row;
  else target.templates.push(row);
  return clone(row);
}
export function deleteEntryTemplate(state, id, viewer) {
  const target = mutableStore(state);
  const row = (target.templates ?? []).find((entry) => entry.id === id);
  if (!row) fail("Modello non trovato.", "Template not found.");
  if (row.ownerId !== viewer)
    fail("Solo chi l’ha creato elimina un modello.", "Only its author deletes a template.");
  target.templates = target.templates.filter((entry) => entry.id !== id);
  return id;
}

/**
 * Creates and saves an entry in one step (Kanka's quick creator, LegendKeeper's nested
 * page from a link): the same private draft, review and apply as the editor, inside one
 * mutation. Returns {draftId, entryId, revisionId, local}.
 */
export function createCampaignEntryNow(
  state,
  {
    id,
    kind = "world",
    worldType = "other",
    title = "",
    body = "",
    parentId = null,
    access,
    campaignId,
    sections = [],
    sessionId = null,
  },
  viewer,
  { online = true } = {},
) {
  const draftId = String(
    id ?? `now-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  );
  const inCampaign = campaignId === undefined ? (state.campaign?.id ?? null) : campaignId;
  const d = createCampaignDraft(
    state,
    { id: draftId, kind, campaignId: kind === "note" ? inCampaign : inCampaign, sessionId },
    viewer,
  );
  saveCampaignDraft(
    state,
    draftId,
    {
      data: {
        ...d.data,
        title: String(title).trim(),
        body: String(body),
        worldType: WORLD_TYPES.includes(worldType) ? worldType : "other",
        ...(parentId ? { parentId } : {}),
        sections: sections.map((section, index) => ({
          id: `${draftId}-s${index + 1}`,
          title: String(section.title ?? ""),
          body: String(section.body ?? ""),
          access: clone(section.access ?? personal()),
        })),
      },
      ...(access ? { access: clone(access) } : {}),
      expectedDraftRevision: d.revision,
    },
    viewer,
  );
  const p = previewCampaignDraft(state, draftId, viewer);
  if (!p.canApply) {
    const first = p.errors[0];
    discardCampaignDraft(state, draftId, viewer);
    fail(first.it, first.en);
  }
  const result = applyCampaignDraft(state, draftId, { reviewKey: p.reviewKey }, viewer, { online });
  return { ...result, local: p.commit.local };
}

/**
 * Restores the text of an earlier version in one step (Kanka «View changes» → restore):
 * a new revision marked «Ripristinata da …»; permissions and gameplay stay current.
 */
export function restoreCampaignVersion(state, entryId, revisionId, viewer, { online = true } = {}) {
  const entry = entryById(state, entryId);
  if (!entry || !permissions(state, entry, viewer).canRestore)
    fail(
      "Non puoi ripristinare questa voce: serve il permesso di modifica.",
      "You cannot restore this entry: edit permission is needed.",
    );
  if (revisionId === entry.currentRevisionId)
    fail("È già la versione corrente.", "It is already the current version.");
  const draftId = `restore-${entryId}-${entry.revisions.length + 1}-${Math.random().toString(36).slice(2, 6)}`;
  createCampaignDraft(
    state,
    { id: draftId, kind: entry.kind, entryId, restoreRevisionId: revisionId },
    viewer,
  );
  const p = previewCampaignDraft(state, draftId, viewer);
  if (!p.canApply) fail(p.errors[0].it, p.errors[0].en);
  return applyCampaignDraft(state, draftId, { reviewKey: p.reviewKey }, viewer, { online });
}
