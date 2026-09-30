// Area B52 — Chosen offline content and reconnection (census SV-31, SV-32, SV-34).
// Entry module loaded by extensions.mjs through the B11 registry. It adds:
// - a header connection indicator (Solasta II CRP-188, D&D Beyond reconnect DDB-155) that
//   opens the "Offline e sincronizzazione" page: the settings page that lists what is
//   available offline (Notion "Settings → Offline" CMP-222, D&D Beyond downloads DDB-207);
// - a "Disponibile offline" switch on your own sheets (sheet section) and notes (entry
//   section), like Notion's per-page "Available offline";
// - the offline queue: while the simulated network is off, a change to content made
//   available offline is saved on this device with a status and waits for sync
//   (LegendKeeper CMP-218). Shared changes stay blocked with the reason. The capture runs
//   inside the same commit through the app.mjs "offline:write" host hook;
// - reconnection: when the network returns the app reconnects and syncs by itself
//   (DDB-155); a change another participant made to the same value is a conflict shown
//   side by side with an explicit choice, never an overwrite.
// Synthetic data only; each identity sees only its own items, queue and conflicts.

import { canViewActor } from "./character-access.mjs";
import { getCampaignEntry, listCampaignEntries } from "./campaign-content.mjs";

export const OFFLINE_SLICE = "offline";
export const OFFLINE_VERSION = 1;
export const RECONNECT_MS = 1500;
const ROLES = ["player", "dm"];
const KINDS = ["sheet", "note"];
const STATUSES = ["pending", "synced", "incoming", "conflict", "resolved", "lost"];
const MAX_SETTLED = 20;
const MAX_BLOCKED = 8;
const L = (it, en) => ({ it, en });

// ------------------------------------------------------------------ small helpers

const arr = (value) => (Array.isArray(value) ? value : []);
const copy = (value) => (value === undefined ? null : JSON.parse(JSON.stringify(value)));
// Key-order independent JSON, so two equal objects never read as a change.
function stable(value) {
  if (value === undefined || value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (typeof value === "object")
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const same = (a, b) => stable(a) === stable(b);
let sequence = 0;
const uid = () =>
  `offline-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${++sequence}`}`;
const nowISO = () => new Date().toISOString();
const size = (value) => new TextEncoder().encode(JSON.stringify(value ?? null)).length;
function fail(it, en) {
  throw Object.assign(Error(it), { it, en });
}
const itemKey = (item) => `${item.kind}:${item.id}`;
export function parseItemKey(value) {
  const [kind, ...rest] = String(value ?? "").split(":");
  const id = rest.join(":");
  return KINDS.includes(kind) && id ? { kind, id } : null;
}

// ------------------------------------------------------------------ slice

export function seedOffline() {
  return { identities: {} };
}
const validItem = (item) =>
  item && KINDS.includes(item.kind) && typeof item.id === "string" && item.id;
const validEntry = (entry) =>
  entry &&
  typeof entry.id === "string" &&
  KINDS.includes(entry.kind) &&
  typeof entry.targetId === "string" &&
  typeof entry.field === "string" &&
  STATUSES.includes(entry.status);
export function normalizeOffline(value, fromVersion = OFFLINE_VERSION) {
  if (fromVersion > OFFLINE_VERSION) throw Error("Offline data from a newer version");
  const identities = {};
  for (const role of ROLES) {
    const raw = value?.identities?.[role];
    if (!raw || typeof raw !== "object") continue;
    const seen = new Set();
    identities[role] = {
      items: arr(raw.items)
        .filter(validItem)
        .filter((item) => !seen.has(itemKey(item)) && seen.add(itemKey(item)))
        .map((item) => ({
          kind: item.kind,
          id: item.id,
          savedAt: typeof item.savedAt === "string" ? item.savedAt : null,
          bytes: Number.isFinite(item.bytes) ? item.bytes : 0,
        })),
      queue: arr(raw.queue).filter(validEntry).map(copy),
      lastSyncAt: typeof raw.lastSyncAt === "string" ? raw.lastSyncAt : null,
    };
  }
  return { identities };
}
const EMPTY = Object.freeze({
  items: Object.freeze([]),
  queue: Object.freeze([]),
  lastSyncAt: null,
});
// Read: an identity's own offline data (never another identity's).
export function identityOf(slice, role) {
  return slice?.identities?.[role] ?? EMPTY;
}
function ensure(slice, role) {
  if (!ROLES.includes(role)) fail("Identità non valida.", "Invalid identity.");
  slice.identities ??= {};
  return (slice.identities[role] ??= { items: [], queue: [], lastSyncAt: null });
}
export const pendingEntries = (slice, role) =>
  identityOf(slice, role).queue.filter((entry) => entry.status === "pending");
export const conflictEntries = (slice, role) =>
  identityOf(slice, role).queue.filter((entry) => entry.status === "conflict");

// ------------------------------------------------------------------ what can be offline

// Your own sheets (you play them) and your own notes: personal work, as F-026 confirms.
export function ownSheets(state, role) {
  return Object.values(state?.actors ?? {}).filter(
    (actor) =>
      actor &&
      actor.kind === "character" &&
      !actor.companion &&
      actor.owner === role &&
      canViewActor(actor, role, state),
  );
}
export function ownNotes(state, role) {
  try {
    return listCampaignEntries(state, {}, role).filter(
      (entry) => entry.kind === "note" && entry.ownerId === role,
    );
  } catch {
    return [];
  }
}
function noteSnapshot(state, id, role) {
  try {
    const entry = getCampaignEntry(state, id, role);
    if (!entry || entry.kind !== "note" || entry.ownerId !== role) return null;
    return { title: String(entry.data?.title ?? ""), body: String(entry.data?.body ?? "") };
  } catch {
    return null;
  }
}
export function describeItem(state, role, kind, id) {
  if (kind === "sheet") {
    const actor = ownSheets(state, role).find((entry) => entry.id === id);
    return actor ? { kind, id, name: actor.name, bytes: size(actor) } : null;
  }
  const note = noteSnapshot(state, id, role);
  return note ? { kind, id, name: note.title, bytes: size(note) } : null;
}
export function eligibleItems(state, role) {
  return [
    ...ownSheets(state, role).map((actor) => describeItem(state, role, "sheet", actor.id)),
    ...ownNotes(state, role).map((entry) => describeItem(state, role, "note", entry.id)),
  ].filter(Boolean);
}
export function isAvailable(slice, role, kind, id) {
  return identityOf(slice, role).items.some((item) => item.kind === kind && item.id === id);
}
export function availableRows(state, slice, role) {
  const me = identityOf(slice, role);
  return me.items.map((item) => {
    const live = describeItem(state, role, item.kind, item.id);
    const entries = me.queue.filter(
      (entry) => entry.kind === item.kind && entry.targetId === item.id,
    );
    return {
      ...item,
      // The device copy follows every change (online, and your own offline): its size now.
      bytes: live?.bytes ?? item.bytes,
      name: live?.name ?? null,
      exists: Boolean(live),
      pending: entries.filter((entry) => entry.status === "pending").length,
      conflicts: entries.filter((entry) => entry.status === "conflict").length,
    };
  });
}

const NEEDS_NETWORK = L(
  "Per renderlo disponibile offline serve la rete: va scaricato su questo dispositivo.",
  "Making it available offline needs the network: it has to be downloaded to this device.",
);
export function makeAvailable(state, slice, role, { kind, id }, { online = true, now } = {}) {
  if (!online) fail(NEEDS_NETWORK.it, NEEDS_NETWORK.en);
  const item = describeItem(state, role, kind, id);
  if (!item)
    fail(
      "Puoi rendere disponibili offline solo le tue schede e i tuoi appunti.",
      "You can make only your own sheets and notes available offline.",
    );
  const me = ensure(slice, role);
  if (me.items.some((entry) => entry.kind === kind && entry.id === id)) return false;
  me.items.push({ kind, id, savedAt: now ?? nowISO(), bytes: item.bytes });
  return true;
}
export function removeAvailable(state, slice, role, { kind, id }) {
  const me = ensure(slice, role);
  const at = me.items.findIndex((entry) => entry.kind === kind && entry.id === id);
  if (at < 0) return false;
  const waiting = me.queue.some(
    (entry) => entry.status === "pending" && entry.kind === kind && entry.targetId === id,
  );
  if (waiting)
    fail(
      "Ci sono modifiche in coda: rimuoverlo ora dal dispositivo le perderebbe. Aspetta la sincronizzazione.",
      "Changes are queued: removing it from the device now would lose them. Wait for the sync.",
    );
  me.items.splice(at, 1);
  return true;
}
export function makeAllAvailable(state, slice, role, options = {}) {
  if (options.online === false) fail(NEEDS_NETWORK.it, NEEDS_NETWORK.en);
  let added = 0;
  for (const item of eligibleItems(state, role))
    if (makeAvailable(state, slice, role, item, options)) added++;
  return added;
}
export function removeAllAvailable(state, slice, role) {
  const me = ensure(slice, role);
  const kept = me.items.filter((item) =>
    me.queue.some(
      (entry) =>
        entry.status === "pending" && entry.kind === item.kind && entry.targetId === item.id,
    ),
  );
  const removed = me.items.length - kept.length;
  me.items = kept;
  return { removed, kept: kept.length };
}

// ------------------------------------------------------------------ changes and queue

// Table state stays at the Table: hit points, conditions and turn resources are never
// queued offline (they write shared ledgers and the turn order).
export const TABLE_FIELDS = new Set([
  "hp",
  "tempHp",
  "temporaryHp",
  "conditions",
  "exhaustion",
  "action",
  "bonus",
  "reaction",
  "movement",
  "movementSpent",
  "dashCount",
  "concentration",
  "combatEffects",
  "deathSaves",
  "vitality",
  "vitalState",
  "lastSlotTurn",
]);
// Dice results recorded on the sheet (ability checks, healing rolls): a roll belongs to the
// shared roll log with its digital or physical face, so it is never queued or synced later.
export const ROLL_FIELDS = new Set(["lastCheck", "lastHealing"]);
// State records that hold roll evidence (core ledgers and the areas' `*-rolls` slices).
const ROLL_RECORDS = new Set(["rollEvidence", "combatAttempts", "dice-tray", "dice-3d"]);
const isRollRecord = (name) => ROLL_RECORDS.has(name) || /-rolls$/.test(name);
// Private plans are already personal (local commits); they never sync to the campaign.
const IGNORED = new Set(["personalPlans"]);

export function getField(actor, field) {
  if (!actor) return null;
  if (field.startsWith("inventory:"))
    return copy(arr(actor.inventory).find((item) => item.id === field.slice(10)) ?? null);
  return copy(actor[field]);
}
export function setField(actor, field, value) {
  if (field.startsWith("inventory:")) {
    const id = field.slice(10);
    actor.inventory = arr(actor.inventory);
    const at = actor.inventory.findIndex((item) => item.id === id);
    if (value === null || value === undefined) {
      if (at >= 0) actor.inventory.splice(at, 1);
    } else if (at >= 0) actor.inventory[at] = copy(value);
    else actor.inventory.push(copy(value));
    return;
  }
  if (value === null || value === undefined) delete actor[field];
  else actor[field] = copy(value);
}
// One change per changed field; each inventory item is its own field (by item id).
export function diffActor(before = {}, after = {}) {
  const changes = [];
  for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
    if (IGNORED.has(key)) continue;
    if (key === "inventory") {
      const was = new Map(arr(before?.inventory).map((item) => [item.id, item]));
      const now = new Map(arr(after?.inventory).map((item) => [item.id, item]));
      for (const id of new Set([...was.keys(), ...now.keys()]))
        if (!same(was.get(id), now.get(id)))
          changes.push({
            field: `inventory:${id}`,
            base: copy(was.get(id)),
            mine: copy(now.get(id)),
          });
      continue;
    }
    // An absent text and an empty one are the same content (a form saves "" for a blank).
    const blank = (value) => (value === "" || value === undefined ? null : value);
    if (!same(blank(before?.[key]), blank(after?.[key])))
      changes.push({ field: key, base: copy(before?.[key]), mine: copy(after?.[key]) });
  }
  return changes;
}
function recordChange(me, change, { now, title }) {
  const at = me.queue.findIndex(
    (entry) =>
      entry.status === "pending" &&
      entry.kind === change.kind &&
      entry.targetId === change.targetId &&
      entry.field === change.field,
  );
  if (at >= 0) {
    const open = me.queue[at];
    open.mine = copy(change.mine);
    open.at = now;
    if (title) open.title = title;
    // Back to where it started and nobody else changed it: nothing left to send.
    if (same(open.base, open.mine) && !open.remote) me.queue.splice(at, 1);
    return;
  }
  if (same(change.base, change.mine)) return;
  me.queue.push({
    id: uid(),
    kind: change.kind,
    targetId: change.targetId,
    field: change.field,
    base: copy(change.base),
    mine: copy(change.mine),
    title: title || "",
    firstAt: now,
    at: now,
    status: "pending",
    remote: null,
  });
}
const SHARED_BLOCKED = L(
  "Sei senza rete: questa modifica condivisa non può essere applicata.",
  "You are offline: this shared change cannot be applied.",
);
function blocked(reasonIt, reasonEn) {
  const error = Object.assign(Error(`${SHARED_BLOCKED.it} ${reasonIt}`), {
    it: `${SHARED_BLOCKED.it} ${reasonIt}`,
    en: `${SHARED_BLOCKED.en} ${reasonEn}`,
  });
  return error;
}
// Runs inside the commit, after the mutation: `before` is the state before it, `draft`
// the mutated state. A shared change is accepted only when it stays inside your own
// sheets made available offline and outside the Table state; otherwise it is refused
// with the reason. Accepted and personal changes to offline content enter the queue.
export function captureOfflineWrite(before, draft, slice, role, { shared, now, title } = {}) {
  const me = ensure(slice, role);
  const stamp = now ?? nowISO();
  const sheets = new Set(me.items.filter((item) => item.kind === "sheet").map((i) => i.id));
  const changes = [];
  if (shared) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(draft)])) {
      if (key === "actors" || key === "log" || same(before[key], draft[key])) continue;
      let changed = [key];
      if (key === "ext") {
        const others = new Set([...Object.keys(before.ext ?? {}), ...Object.keys(draft.ext ?? {})]);
        others.delete(OFFLINE_SLICE);
        changed = [...others].filter((name) => !same(before.ext?.[name], draft.ext?.[name]));
        if (!changed.length) continue;
      }
      // One roll engine (P2/P3): a change that writes roll evidence is a roll; it keeps the
      // roll's own reason instead of the generic Table one.
      if (changed.some(isRollRecord))
        throw blocked(
          "I tiri di dado, digitali o fisici, vanno nel registro condiviso: tirali quando torni in rete.",
          "Dice rolls, digital or physical, go to the shared roll log: roll them when you are back online.",
        );
      throw blocked(
        "Senza rete si possono modificare solo le tue schede disponibili offline: questa modifica riguarda anche il tavolo o la campagna. Riprova quando torni in rete.",
        "Offline you can change only your own sheets made available offline: this change also touches the Table or the campaign. Try again when you are back online.",
      );
    }
    const ids = new Set([...Object.keys(before.actors ?? {}), ...Object.keys(draft.actors ?? {})]);
    for (const id of ids) {
      const was = before.actors?.[id];
      const now = draft.actors?.[id];
      if (same(was, now)) continue;
      if (!was || !now || now.owner !== role)
        throw blocked(
          "Senza rete non si creano, eliminano o modificano le schede degli altri.",
          "Offline you cannot create, delete or change other people’s sheets.",
        );
      if (!sheets.has(id))
        throw blocked(
          `«${now.name}» non è disponibile offline: rendila disponibile quando torni in rete per poterla modificare senza rete.`,
          `“${now.name}” is not available offline: make it available when you are back online to edit it without a network.`,
        );
      for (const change of diffActor(was, now)) {
        if (ROLL_FIELDS.has(change.field))
          throw blocked(
            "I tiri di dado, digitali o fisici, vanno nel registro condiviso: tirali quando torni in rete.",
            "Dice rolls, digital or physical, go to the shared roll log: roll them when you are back online.",
          );
        if (TABLE_FIELDS.has(change.field))
          throw blocked(
            "Punti ferita, condizioni e risorse del turno restano al tavolo: aggiornali quando torni in rete.",
            "Hit points, conditions and turn resources stay at the Table: update them when you are back online.",
          );
        changes.push({ kind: "sheet", targetId: id, ...change });
      }
    }
  } else {
    for (const item of me.items) {
      if (item.kind === "sheet") {
        const was = before.actors?.[item.id];
        const now = draft.actors?.[item.id];
        if (was && now && !same(was, now))
          for (const change of diffActor(was, now))
            changes.push({ kind: "sheet", targetId: item.id, ...change });
      } else {
        const was = noteSnapshot(before, item.id, role);
        const now = noteSnapshot(draft, item.id, role);
        if (was && now && !same(was, now))
          changes.push({ kind: "note", targetId: item.id, field: "text", base: was, mine: now });
      }
    }
  }
  for (const change of changes) recordChange(me, change, { now: stamp, title });
  return changes;
}

// Demonstration of another participant: the DM changes the same value at the Table while
// you are offline. It is kept on the queued change and reaches this device at the sync.
export function simulateRemoteChange(state, slice, role, entryId, raw, { now } = {}) {
  const me = ensure(slice, role);
  const entry = me.queue.find((row) => row.id === entryId);
  if (!entry || entry.status !== "pending" || entry.kind !== "sheet")
    fail("Questa modifica non è più in coda.", "This change is no longer queued.");
  const reference = entry.mine ?? entry.base;
  let value;
  if (entry.field.startsWith("inventory:")) {
    const quantity = Number(raw);
    if (!reference || !Number.isInteger(quantity) || quantity < 0 || quantity > 99999)
      fail("Indica una quantità intera, da 0 in su.", "Enter a whole quantity, 0 or more.");
    value = { ...copy(reference), quantity };
  } else if (typeof reference === "number") {
    value = Number(raw);
    if (!Number.isFinite(value) || String(raw).trim() === "")
      fail("Indica un numero.", "Enter a number.");
  } else if (typeof reference === "string" || reference === null) {
    value = String(raw ?? "");
  } else
    fail(
      "Per questa voce la simulazione non è disponibile.",
      "The simulation is not available for this value.",
    );
  entry.remote = { value, by: role === "dm" ? "player" : "dm", at: now ?? nowISO() };
  return entry;
}

// Two values of one field are equal when only an absent and an empty text differ.
const sameValue = (field, a, b) =>
  field.startsWith("inventory:") ? same(a, b) : same(a === "" ? null : a, b === "" ? null : b);

// Reconnection: every queued change of this identity is sent. A value another participant
// changed meanwhile is a conflict: the shared sheet keeps their version and yours stays
// in the conflict until you choose. Nothing is overwritten silently. "Meanwhile" is either
// a real change that reached the shared sheet after yours (another identity, back online)
// or the labelled simulation kept on the queued change.
export function syncIdentity(state, slice, role, { now } = {}) {
  const me = ensure(slice, role);
  const stamp = now ?? nowISO();
  const result = { synced: [], incoming: [], conflicts: [], lost: [] };
  for (const entry of me.queue) {
    if (entry.status !== "pending") continue;
    if (entry.kind === "sheet") {
      const actor = state.actors?.[entry.targetId];
      if (!actor) {
        Object.assign(entry, { status: "lost", settledAt: stamp });
        result.lost.push(entry.id);
        continue;
      }
      const current = getField(actor, entry.field);
      // A real change is already on the shared sheet: it wins over the simulation and is
      // never overwritten.
      const remote = sameValue(entry.field, current, entry.mine)
        ? entry.remote
        : { value: current, by: role === "dm" ? "player" : "dm", at: null };
      if (remote && sameValue(entry.field, entry.mine, entry.base)) {
        setField(actor, entry.field, remote.value);
        Object.assign(entry, { status: "incoming", theirs: copy(remote.value), settledAt: stamp });
        result.incoming.push(entry.id);
        continue;
      }
      if (remote && !sameValue(entry.field, remote.value, entry.mine)) {
        setField(actor, entry.field, remote.value);
        Object.assign(entry, {
          status: "conflict",
          theirs: copy(remote.value),
          theirsBy: remote.by,
          theirsAt: remote.at,
          conflictAt: stamp,
        });
        result.conflicts.push(entry.id);
        continue;
      }
    }
    Object.assign(entry, { status: "synced", settledAt: stamp });
    // A synced note keeps only its title in the history: the text lives in the note.
    if (entry.kind === "note") {
      entry.base = { title: entry.base?.title ?? "" };
      entry.mine = { title: entry.mine?.title ?? "" };
    }
    result.synced.push(entry.id);
  }
  const touched = new Set(
    me.queue.filter((entry) => entry.settledAt === stamp).map((e) => `${e.kind}:${e.targetId}`),
  );
  for (const item of me.items)
    if (touched.has(itemKey(item))) {
      const live = describeItem(state, role, item.kind, item.id);
      if (live) Object.assign(item, { savedAt: stamp, bytes: live.bytes });
    }
  me.lastSyncAt = stamp;
  // Settled history is bounded; open conflicts are never dropped.
  const settled = me.queue.filter((entry) => !["pending", "conflict"].includes(entry.status));
  if (settled.length > MAX_SETTLED) {
    const drop = new Set(settled.slice(0, settled.length - MAX_SETTLED).map((e) => e.id));
    me.queue = me.queue.filter((entry) => !drop.has(entry.id));
  }
  return result;
}

// Undo restores this slice with the gameplay snapshot, so a queued sheet change and the
// sheet change leave together. Notes are narrative: the store keeps their text across a
// gameplay Undo, so their queued changes are kept too (registry afterUndo, B30 seam).
export function keepNotesAfterUndo(current, restored) {
  const now = current?.ext?.[OFFLINE_SLICE];
  const back = restored?.ext?.[OFFLINE_SLICE];
  if (!now || !back) return;
  for (const role of ROLES) {
    const notes = arr(now.identities?.[role]?.queue).filter((entry) => entry.kind === "note");
    if (!notes.length) continue;
    const me = ensure(back, role);
    const ids = new Set(notes.map((entry) => entry.id));
    me.queue = [
      ...me.queue.filter((entry) => !(entry.kind === "note" || ids.has(entry.id))),
      ...copy(notes),
    ];
  }
}
export function mergeText(theirs, mine) {
  return `${String(theirs ?? "").trimEnd()}\n\n${String(mine ?? "").trimStart()}`.trim();
}
export function canKeepBoth(entry) {
  return (
    typeof entry?.mine === "string" && (typeof entry?.theirs === "string" || entry?.theirs === null)
  );
}
// An explicit choice on one conflict. "both" keeps the two texts one after the other.
export function resolveConflict(state, slice, role, entryId, choice, { now } = {}) {
  const me = ensure(slice, role);
  const entry = me.queue.find((row) => row.id === entryId);
  if (!entry || entry.status !== "conflict")
    fail("Questo conflitto non è più da rivedere.", "This conflict is no longer open.");
  const actor = state.actors?.[entry.targetId];
  if (!actor) fail("La scheda non esiste più.", "The sheet no longer exists.");
  const current = getField(actor, entry.field);
  let value;
  if (choice === "mine") value = copy(entry.mine);
  else if (choice === "theirs") value = current;
  else if (choice === "both" && canKeepBoth(entry)) value = mergeText(current, entry.mine);
  else fail("Scelta non valida.", "Invalid choice.");
  setField(actor, entry.field, value);
  Object.assign(entry, {
    status: "resolved",
    resolution: choice,
    result: copy(value),
    serverBefore: current,
    resolvedAt: now ?? nowISO(),
  });
  return entry;
}
// Correction of a choice: the conflict comes back with the server value it replaced.
export function reopenConflict(state, slice, role, entryId) {
  const me = ensure(slice, role);
  const entry = me.queue.find((row) => row.id === entryId);
  if (!entry || entry.status !== "resolved")
    fail("Questa scelta non si può riaprire.", "This choice cannot be reopened.");
  const actor = state.actors?.[entry.targetId];
  if (!actor || !same(getField(actor, entry.field), entry.result))
    fail(
      "La scheda è cambiata dopo la scelta: riaprire il confronto sovrascriverebbe quella modifica.",
      "The sheet changed after the choice: reopening the comparison would overwrite that change.",
    );
  setField(actor, entry.field, entry.serverBefore);
  entry.status = "conflict";
  for (const key of ["resolution", "result", "serverBefore", "resolvedAt"]) delete entry[key];
  return entry;
}

// ------------------------------------------------------------------ labels and values

const FIELD_LABELS = {
  notes: L("Annotazioni condivise", "Shared annotations"),
  backstory: L("Storia e legami", "Story and bonds"),
  description: L("Aspetto e descrizione", "Appearance and description"),
  ac: L("Classe armatura", "Armor class"),
  maxHp: L("Punti ferita massimi", "Maximum hit points"),
  speed: L("Velocità", "Speed"),
  abilities: L("Caratteristiche", "Abilities"),
  name: L("Nome", "Name"),
  level: L("Livello", "Level"),
  className: L("Classe", "Class"),
  spells: L("Incantesimi", "Spells"),
  spellSlots: L("Slot incantesimo", "Spell slots"),
  slots: L("Slot incantesimo", "Spell slots"),
  features: L("Capacità", "Features"),
  skills: L("Abilità", "Skills"),
  heldItemIds: L("Oggetti impugnati", "Held items"),
  hitDice: L("Dadi Vita", "Hit Point Dice"),
  size: L("Taglia", "Size"),
  conditionImmunities: L("Immunità alle condizioni", "Condition immunities"),
  text: L("Testo dell’appunto", "Note text"),
};
const said = (ctx, value) =>
  value && typeof value === "object" ? ctx.label(value) : String(value ?? "");
// Internal keys never reach the page: an unnamed value is "another sheet value".
export function fieldLabel(ctx, entry) {
  if (entry.field.startsWith("inventory:")) {
    const item = entry.mine ?? entry.base ?? entry.theirs;
    return said(ctx, item?.name) || ctx.t("Oggetto", "Item");
  }
  return FIELD_LABELS[entry.field]
    ? ctx.label(FIELD_LABELS[entry.field])
    : ctx.t("Altro valore della scheda", "Other sheet value");
}
export function targetName(ctx, entry) {
  if (entry.kind === "sheet") return ctx.state.actors?.[entry.targetId]?.name ?? entry.targetId;
  const note = noteSnapshot(ctx.state, entry.targetId, ctx.role);
  return note?.title || entry.mine?.title || entry.base?.title || ctx.t("Appunto", "Note");
}
export function formatValue(ctx, field, value) {
  if (value === null || value === undefined)
    return field.startsWith("inventory:") ? ctx.t("non presente", "not present") : "—";
  if (field.startsWith("inventory:"))
    return `×${value.quantity ?? 1}${value.equipped ? ctx.t(" · equipaggiato", " · equipped") : ""}`;
  if (field === "text") return [value.title, value.body].filter(Boolean).join(" — ");
  if (typeof value === "string") return value || ctx.t("(vuoto)", "(empty)");
  if (typeof value !== "object") return String(value);
  if (value.it || value.en) return ctx.label(value);
  const text = Array.isArray(value)
    ? value.map((item) => said(ctx, item?.name ?? item)).join(", ")
    : Object.entries(value)
        .map(([key, item]) => `${key} ${typeof item === "object" ? "…" : item}`)
        .join(" · ");
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}
// Who else changed a value: subject ("il DM"), capitalised and possessive ("del DM").
const OTHER = {
  dm: { it: ["il DM", "Il DM", "del DM"], en: ["the DM", "The DM", "the DM’s"] },
  player: {
    it: ["chi gioca", "Chi gioca", "di chi gioca"],
    en: ["the player", "The player", "the player’s"],
  },
};
const other = (ctx, by, form) => (OTHER[by] ?? OTHER.dm)[ctx.lang === "en" ? "en" : "it"][form];
export const otherName = (ctx, by) => other(ctx, by, 0);
// The same labels in a given language (notifications carry both languages).
export function inLang(ctx, lang) {
  return {
    state: ctx.state,
    role: ctx.role,
    lang,
    t: (it, en) => (lang === "en" ? en : it),
    label: (value) =>
      value && typeof value === "object"
        ? value[lang] || value.it || value.en || ""
        : String(value ?? ""),
  };
}

// ------------------------------------------------------------------ device memory

// Connection phase, retry attempts and refused attempts belong to this visit and device:
// they are not game data and never enter the shared state.
const memory = {
  phase: "online",
  since: null,
  attempts: 0,
  lastAttemptAt: null,
  timer: null,
  timerRole: null,
  blocked: { player: [], dm: [] },
  autoTimer: null,
};
export function resetOfflineMemory() {
  clearTimeout(memory.timer);
  clearTimeout(memory.autoTimer);
  Object.assign(memory, {
    phase: "online",
    since: null,
    attempts: 0,
    lastAttemptAt: null,
    timer: null,
    timerRole: null,
    blocked: { player: [], dm: [] },
    autoTimer: null,
  });
}
export function offlineMemory() {
  return memory;
}
export function connectionPhase(ctx) {
  if (ctx?.offline) return "offline";
  return memory.phase === "reconnecting" ? "reconnecting" : "online";
}
function noteBlocked(role, title, reason) {
  const list = (memory.blocked[role] ??= []);
  list.unshift({ title: String(title ?? ""), reason, at: nowISO() });
  list.length = Math.min(list.length, MAX_BLOCKED);
}

// ------------------------------------------------------------------ indicator

function status(ctx) {
  const slice = ctx?.state?.ext?.[OFFLINE_SLICE];
  return {
    phase: connectionPhase(ctx),
    pending: pendingEntries(slice, ctx?.role).length,
    conflicts: conflictEntries(slice, ctx?.role).length,
  };
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// The header label is the state (tooltip and accessible name); offline.css reads its first
// words to draw the matching cloud (synced, offline, reconnecting, to review).
export function indicatorText(ctx, lang = ctx?.lang ?? "it") {
  const t = (it, en) => (lang === "en" ? en : it);
  if (!ctx?.state) return t("Connessione e offline", "Connection and offline");
  const s = status(ctx);
  if (s.phase === "offline")
    return s.pending
      ? t(
          `Senza rete — ${plural(s.pending, "modifica", "modifiche")} in coda`,
          `Offline — ${plural(s.pending, "change", "changes")} queued`,
        )
      : t("Senza rete — nessuna modifica in coda", "Offline — no changes queued");
  if (s.phase === "reconnecting") return t("Riconnessione in corso", "Reconnecting");
  if (s.conflicts)
    return t(
      `Da rivedere — ${plural(s.conflicts, "conflitto", "conflitti")}`,
      `To review — ${plural(s.conflicts, "conflict", "conflicts")}`,
    );
  if (s.pending)
    return t(
      `In linea — ${plural(s.pending, "modifica", "modifiche")} da sincronizzare`,
      `Online — ${plural(s.pending, "change", "changes")} to sync`,
    );
  return t("In linea — tutto sincronizzato", "Online — all synced");
}

// ------------------------------------------------------------------ commands (UI)

const slice = (state) => state?.ext?.[OFFLINE_SLICE];
const own = (draft) => (draft.ext[OFFLINE_SLICE] ??= seedOffline());
function show(ctx, error) {
  ctx.toast(error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error), true);
}
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    show(ctx, error);
    ctx.render();
    return null;
  }
}
const PERSONAL = { local: true, visibility: "private" };
function itemName(ctx, kind, id) {
  return describeItem(ctx.state, ctx.role, kind, id)?.name || ctx.t("Appunto", "Note");
}
export function toggleAvailable(ctx, key, on) {
  const item = parseItemKey(key);
  if (!item) return null;
  return attempt(ctx, () => {
    const name = itemName(ctx, item.kind, item.id);
    ctx.commit(
      on
        ? ctx.t(`Resa disponibile offline: ${name}`, `Made available offline: ${name}`)
        : ctx.t(`Rimossa dal dispositivo: ${name}`, `Removed from the device: ${name}`),
      (draft) =>
        on
          ? makeAvailable(draft, own(draft), ctx.role, item, { online: !ctx.offline })
          : removeAvailable(draft, own(draft), ctx.role, item),
      PERSONAL,
    );
    const sheet = item.kind === "sheet";
    ctx.toast(
      on
        ? sheet
          ? ctx.t(
              `La scheda «${name}» è su questo dispositivo: senza rete puoi consultarla e modificarla.`,
              `The sheet “${name}” is on this device: without a network you can read and edit it.`,
            )
          : ctx.t(
              `L’appunto «${name}» è su questo dispositivo: senza rete puoi consultarlo e modificarlo.`,
              `The note “${name}” is on this device: without a network you can read and edit it.`,
            )
        : sheet
          ? ctx.t(
              `La scheda «${name}» non è più disponibile offline.`,
              `The sheet “${name}” is no longer available offline.`,
            )
          : ctx.t(
              `L’appunto «${name}» non è più disponibile offline.`,
              `The note “${name}” is no longer available offline.`,
            ),
    );
    return true;
  });
}
function allAvailable(ctx, on) {
  return attempt(ctx, () => {
    let result;
    ctx.commit(
      on
        ? ctx.t("Tutto reso disponibile offline", "Everything made available offline")
        : ctx.t(
            "Contenuti offline rimossi dal dispositivo",
            "Offline content removed from the device",
          ),
      (draft) => {
        result = on
          ? makeAllAvailable(draft, own(draft), ctx.role, { online: !ctx.offline })
          : removeAllAvailable(draft, own(draft), ctx.role);
      },
      PERSONAL,
    );
    if (on)
      ctx.toast(
        ctx.t(
          `${plural(result, "elemento aggiunto", "elementi aggiunti")} a questo dispositivo.`,
          `${plural(result, "item added", "items added")} to this device.`,
        ),
      );
    else
      ctx.toast(
        result.kept
          ? ctx.t(
              `${plural(result.removed, "elemento rimosso", "elementi rimossi")}; ${plural(result.kept, "resta", "restano")} finché le modifiche in coda non sono sincronizzate.`,
              `${plural(result.removed, "item removed", "items removed")}; ${result.kept} kept until the queued changes are synced.`,
            )
          : ctx.t(
              `${plural(result.removed, "elemento rimosso", "elementi rimossi")} da questo dispositivo.`,
              `${plural(result.removed, "item removed", "items removed")} from this device.`,
            ),
      );
    return result;
  });
}
// Sends this identity's queue now (reconnection, restart or "Sincronizza ora").
export function syncNow(ctx) {
  if (ctx.offline) return null;
  const role = ctx.role;
  const pending = pendingEntries(slice(ctx.state), role);
  if (!pending.length) return null;
  // The shared log names and counts only shared sheet changes: private notes and private
  // sheets never show up there, not even as a number.
  const sharedSheets = pending.filter(
    (entry) =>
      entry.kind === "sheet" && ctx.state.actors?.[entry.targetId]?.visibility !== "private",
  );
  const shared = sharedSheets.length > 0;
  const names = [...new Set(sharedSheets.map((entry) => ctx.state.actors?.[entry.targetId]?.name))]
    .filter(Boolean)
    .join(", ");
  const n = shared ? sharedSheets.length : pending.length;
  let result = null;
  const title = shared
    ? ctx.t(
        `Sincronizzazione dopo la riconnessione: ${plural(n, "modifica fatta", "modifiche fatte")} senza rete (${names})`,
        `Sync after reconnecting: ${plural(n, "change", "changes")} made offline (${names})`,
      )
    : ctx.t(
        `Sincronizzazione dopo la riconnessione: ${plural(n, "modifica personale", "modifiche personali")}`,
        `Sync after reconnecting: ${plural(n, "personal change", "personal changes")}`,
      );
  try {
    ctx.commit(
      title,
      (draft) => {
        result = syncIdentity(draft, own(draft), role);
      },
      // The queued steps of this visit are now shared: earlier Undo steps close, like a
      // change of campaign; conflicts and choices have their own correction.
      { undoable: false, newUndoVisit: true, ...(shared ? {} : PERSONAL) },
    );
  } catch (error) {
    show(ctx, error);
    return null;
  }
  const sent = result.synced.length + result.incoming.length;
  const conflicts = result.conflicts.length;
  const parts = [
    sent
      ? ctx.t(
          plural(sent, "modifica sincronizzata", "modifiche sincronizzate"),
          plural(sent, "change synced", "changes synced"),
        )
      : "",
    conflicts
      ? ctx.t(
          `${plural(conflicts, "conflitto", "conflitti")} da rivedere in Offline e sincronizzazione`,
          `${plural(conflicts, "conflict", "conflicts")} to review in Offline and sync`,
        )
      : "",
  ].filter(Boolean);
  ctx.toast(
    `${ctx.t("Di nuovo in linea", "Back online")}: ${parts.join(ctx.t(" e ", " and "))}.`,
    result.conflicts.length > 0,
  );
  return result;
}
// Automatic reconnection (DDB-155): a short "Riconnessione in corso" phase, then the sync.
export function scheduleSync(ctx, delay = RECONNECT_MS) {
  clearTimeout(memory.timer);
  if (ctx.offline || !pendingEntries(slice(ctx.state), ctx.role).length) {
    memory.phase = ctx.offline ? "offline" : "online";
    memory.timer = null;
    return false;
  }
  memory.phase = "reconnecting";
  memory.timerRole = ctx.role;
  memory.timer = setTimeout(() => {
    memory.timer = null;
    memory.phase = ctx.offline ? "offline" : "online";
    if (!ctx.offline && ctx.role === memory.timerRole) syncNow(ctx);
    ctx.render();
  }, delay);
  return true;
}
function retryNow(ctx) {
  memory.attempts++;
  memory.lastAttemptAt = nowISO();
  if (ctx.offline)
    ctx.toast(
      ctx.t(
        "Ancora senza rete. Le modifiche restano su questo dispositivo; ti ricolleghi da solo appena torna la rete.",
        "Still offline. Changes stay on this device; you reconnect by yourself as soon as the network returns.",
      ),
      true,
    );
  ctx.render();
}
function resolve(ctx, entryId, choice) {
  const entry = conflictEntries(slice(ctx.state), ctx.role).find((row) => row.id === entryId);
  if (!entry) return null;
  const who =
    choice === "mine"
      ? ctx.t("la versione offline", "the offline version")
      : choice === "theirs"
        ? ctx.t(
            `la versione ${other(ctx, entry.theirsBy, 2)}`,
            `${other(ctx, entry.theirsBy, 2)} version`,
          )
        : ctx.t("entrambe le versioni", "both versions");
  const what = `${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`;
  return attempt(ctx, () => {
    ctx.commit(
      ctx.t(`Conflitto risolto: ${what}, tenuta ${who}`, `Conflict resolved: ${what}, kept ${who}`),
      (draft) => resolveConflict(draft, own(draft), ctx.role, entryId, choice),
    );
    ctx.toast(ctx.t(`Scelta registrata: ${what}.`, `Choice recorded: ${what}.`));
    return true;
  });
}
// Correction of one queued sheet change while offline: the value goes back to where it
// started, and the hook sees it back at its start and drops the queued record in the same
// commit. Back online the shared sheet may already hold someone else's value, so the change
// goes through the sync and its comparison instead (never an overwrite from here).
export function discardQueued(ctx, entryId) {
  if (!ctx.offline) return null;
  const entry = pendingEntries(slice(ctx.state), ctx.role).find((row) => row.id === entryId);
  if (!entry || entry.kind !== "sheet") return null;
  const what = `${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`;
  return attempt(ctx, () => {
    ctx.commit(
      ctx.t(`Modifica offline annullata: ${what}`, `Offline change undone: ${what}`),
      (draft) => {
        const actor = draft.actors?.[entry.targetId];
        if (!actor) fail("La scheda non esiste più.", "The sheet no longer exists.");
        setField(actor, entry.field, entry.base);
      },
    );
    ctx.toast(ctx.t(`Annullata: ${what}.`, `Undone: ${what}.`));
    return true;
  });
}
function reopen(ctx, entryId) {
  const entry = identityOf(slice(ctx.state), ctx.role).queue.find((row) => row.id === entryId);
  if (!entry) return null;
  const what = `${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`;
  return attempt(ctx, () => {
    ctx.commit(
      ctx.t(`Scelta riaperta per correzione: ${what}`, `Choice reopened for correction: ${what}`),
      (draft) => reopenConflict(draft, own(draft), ctx.role, entryId),
    );
    return true;
  });
}
function simulate(ctx, entryId, raw) {
  return attempt(ctx, () => {
    if (!ctx.offline)
      fail(
        "La simulazione vale mentre sei senza rete.",
        "The simulation applies while you are offline.",
      );
    ctx.commit(
      ctx.t("Simulazione: modifica del DM al tavolo", "Simulation: the DM’s change at the Table"),
      (draft) => simulateRemoteChange(draft, own(draft), ctx.role, entryId, raw),
      PERSONAL,
    );
    ctx.toast(
      ctx.t(
        "Registrata: la vedrai arrivare quando torni in rete.",
        "Recorded: you will see it arrive when you are back online.",
      ),
    );
    return true;
  });
}

// ------------------------------------------------------------------ rendering

const locale = (ctx) => (ctx.lang === "en" ? "en-GB" : "it-IT");
export function when(ctx, iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date().toDateString() === date.toDateString();
  return new Intl.DateTimeFormat(
    locale(ctx),
    today ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" },
  ).format(date);
}
const kb = (ctx, bytes) =>
  `${new Intl.NumberFormat(locale(ctx), { maximumFractionDigits: 1 }).format(bytes > 0 ? Math.max(0.1, bytes / 1024) : 0)} kB`;
const KIND_LABEL = { sheet: L("Scheda", "Sheet"), note: L("Appunto", "Note") };
const STATUS_LABEL = {
  pending: L("In coda · su questo dispositivo", "Queued · on this device"),
  synced: L("Sincronizzata", "Synced"),
  incoming: L("Aggiornata da altri", "Updated by others"),
  conflict: L("Da rivedere", "To review"),
  resolved: L("Risolta", "Resolved"),
  lost: L("Non inviata: scheda assente", "Not sent: sheet missing"),
};
const RESOLUTION_LABEL = {
  mine: L("tenuta la tua", "kept yours"),
  theirs: L("tenuta quella di altri", "kept theirs"),
  both: L("tenute entrambe", "kept both"),
};
function badge(ctx, entry) {
  const extra =
    entry.status === "resolved" && entry.resolution
      ? `: ${ctx.label(RESOLUTION_LABEL[entry.resolution])}`
      : "";
  return `<span class="badge offline-badge" data-status="${entry.status}">${ctx.esc(ctx.label(STATUS_LABEL[entry.status]) + extra)}</span>`;
}
function change(ctx, entry) {
  return `${ctx.esc(formatValue(ctx, entry.field, entry.base))} → ${ctx.esc(formatValue(ctx, entry.field, entry.mine))}`;
}
function entryRow(ctx, entry) {
  const time =
    entry.status === "pending"
      ? entry.at
      : (entry.resolvedAt ?? entry.settledAt ?? entry.conflictAt ?? entry.at);
  const detail =
    entry.kind === "note"
      ? entry.status === "pending"
        ? ctx.t("Testo modificato su questo dispositivo", "Text changed on this device")
        : ctx.t("Testo dell’appunto", "Note text")
      : change(ctx, entry);
  const remote =
    entry.status === "pending" && entry.remote
      ? `<small class="offline-remote">${ctx.esc(ctx.t(`Simulazione: ${otherName(ctx, entry.remote.by)} ha cambiato questo valore in ${formatValue(ctx, entry.field, entry.remote.value)}`, `Simulation: ${otherName(ctx, entry.remote.by)} changed this value to ${formatValue(ctx, entry.field, entry.remote.value)}`))}</small>`
      : "";
  const reopenButton =
    entry.status === "resolved"
      ? `<button type="button" class="button quiet" data-offline-reopen="${ctx.esc(entry.id)}">${ctx.t("Riapri il confronto", "Reopen the comparison")}</button>`
      : entry.status === "pending" && entry.kind === "sheet" && ctx.offline
        ? `<button type="button" class="button quiet" data-offline-discard="${ctx.esc(entry.id)}" aria-label="${ctx.esc(ctx.t(`Annulla questa modifica: ${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`, `Undo this change: ${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`))}">${ctx.t("Annulla", "Undo")}</button>`
        : "";
  return `<li class="offline-row" data-offline-entry="${ctx.esc(entry.id)}" data-status="${entry.status}"><div class="offline-row-text"><strong>${ctx.esc(`${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`)}</strong><small>${detail}${time ? ` · ${ctx.esc(when(ctx, time))}` : ""}</small>${remote}</div><div class="offline-row-actions">${badge(ctx, entry)}${reopenButton}</div></li>`;
}
function statusCard(ctx) {
  const phase = connectionPhase(ctx);
  const me = identityOf(slice(ctx.state), ctx.role);
  const pending = me.queue.filter((entry) => entry.status === "pending").length;
  const conflicts = me.queue.filter((entry) => entry.status === "conflict").length;
  let title, body, actions;
  if (phase === "offline") {
    title = ctx.t("Senza rete", "Offline");
    body = ctx.t(
      `${memory.since ? `Dalle ${when(ctx, memory.since)}. ` : ""}Le modifiche alle schede e agli appunti disponibili offline restano su questo dispositivo (${plural(pending, "in coda", "in coda")}); le modifiche condivise con il gruppo sono bloccate finché non torni in rete.`,
      `${memory.since ? `Since ${when(ctx, memory.since)}. ` : ""}Changes to sheets and notes available offline stay on this device (${pending} queued); changes shared with the group are blocked until you are back online.`,
    );
    const tried = memory.lastAttemptAt
      ? `<p class="muted" data-offline-attempts>${ctx.esc(ctx.t(`Tentativi di riconnessione: ${memory.attempts} · ultimo alle ${when(ctx, memory.lastAttemptAt)}, ancora senza rete.`, `Reconnection attempts: ${memory.attempts} · last at ${when(ctx, memory.lastAttemptAt)}, still offline.`))}</p>`
      : `<p class="muted">${ctx.t("Ti ricolleghi da solo appena torna la rete.", "You reconnect by yourself as soon as the network returns.")}</p>`;
    body = `<p>${ctx.esc(body)}</p>${tried}`;
    actions = `<button type="button" class="button primary" data-offline-retry>${ctx.t("Riprova ora", "Retry now")}</button>`;
  } else if (phase === "reconnecting") {
    title = ctx.t("Riconnessione in corso", "Reconnecting");
    body = `<p>${ctx.t(`Invio di ${plural(pending, "modifica fatta", "modifiche fatte")} senza rete e controllo delle modifiche degli altri…`, `Sending ${plural(pending, "change", "changes")} made offline and checking the others’ changes…`)}</p>`;
    actions = "";
  } else {
    title = conflicts
      ? ctx.t("In linea · da rivedere", "Online · to review")
      : ctx.t("In linea", "Online");
    body = `<p>${ctx.esc(
      me.lastSyncAt
        ? ctx.t(
            `Ultima sincronizzazione alle ${when(ctx, me.lastSyncAt)}.`,
            `Last sync at ${when(ctx, me.lastSyncAt)}.`,
          )
        : ctx.t(
            "Le modifiche si salvano subito e le vede tutto il gruppo.",
            "Changes save right away and the whole group sees them.",
          ),
    )}${conflicts ? " " + ctx.esc(ctx.t(`${plural(conflicts, "conflitto aspetta", "conflitti aspettano")} una tua scelta.`, `${plural(conflicts, "conflict waits", "conflicts wait")} for your choice.`)) : ""}</p>`;
    actions = pending
      ? `<button type="button" class="button primary" data-offline-sync>${ctx.t("Sincronizza ora", "Sync now")}</button>`
      : "";
  }
  const demo = `<button type="button" class="button quiet" data-service="preferences">${ctx.icon("settings")}${phase === "offline" ? ctx.t("Simulazione: riattiva la rete in Preferenze", "Simulation: turn the network back on in Preferences") : ctx.t("Simulazione: togli la rete in Preferenze", "Simulation: turn the network off in Preferences")}</button>`;
  return `<section class="offline-status" data-offline-phase="${phase}" aria-labelledby="offline-status-title"><span class="offline-cloud" data-state="${phase === "online" && conflicts ? "review" : phase}" aria-hidden="true"></span><div class="offline-status-text" role="status" aria-live="polite"><h2 id="offline-status-title">${ctx.esc(title)}</h2>${body}</div><div class="toolbar offline-status-actions">${actions}${demo}</div></section>`;
}
function versionBox(ctx, heading, value, field, kind) {
  const text = formatValue(ctx, field, value);
  return `<div class="offline-version" data-version="${kind}"><h4>${ctx.esc(heading)}</h4><p class="offline-version-value">${ctx.esc(text)}</p></div>`;
}
function conflictCard(ctx, entry) {
  const actor = ctx.state.actors?.[entry.targetId];
  const current = getField(actor, entry.field);
  const who = other(ctx, entry.theirsBy, 1);
  const whose = other(ctx, entry.theirsBy, 2);
  const what = `${targetName(ctx, entry)} · ${fieldLabel(ctx, entry)}`;
  const id = ctx.esc(entry.id);
  const at = entry.theirsAt ? ` (${when(ctx, entry.theirsAt)})` : "";
  const button = (choice, text, kind = "") =>
    `<button type="button" class="button ${kind}" data-offline-resolve="${choice}" data-entry="${id}">${ctx.esc(text)}</button>`;
  return `<article class="offline-conflict" data-offline-conflict="${id}" aria-labelledby="offline-c-${id}"><h3 id="offline-c-${id}">${ctx.esc(what)}</h3><div class="offline-compare">${versionBox(ctx, ctx.t("Prima · valore di partenza", "Before · starting value"), entry.base, entry.field, "base")}${versionBox(ctx, ctx.t(`La tua · su questo dispositivo (${when(ctx, entry.at)})`, `Yours · on this device (${when(ctx, entry.at)})`), entry.mine, entry.field, "mine")}${versionBox(ctx, ctx.t(`${who} · al tavolo${at}`, `${who} · at the Table${at}`), current, entry.field, "theirs")}</div><p class="muted">${ctx.esc(ctx.t(`Ora la scheda condivisa mostra la versione ${whose}; la tua resta qui finché non scegli.`, `The shared sheet now shows ${whose} version; yours stays here until you choose.`))}</p><div class="toolbar">${button("mine", ctx.t("Tieni la tua", "Keep yours"), "primary")}${button("theirs", ctx.t(`Tieni quella ${whose}`, `Keep ${whose}`))}${canKeepBoth({ ...entry, theirs: current }) ? button("both", ctx.t("Tienile entrambe", "Keep both")) : ""}</div></article>`;
}
function simulationSection(ctx) {
  if (!ctx.offline || ctx.role !== "player") return "";
  const rows = pendingEntries(slice(ctx.state), ctx.role).filter(
    (entry) =>
      entry.kind === "sheet" && ctx.state.actors?.[entry.targetId]?.visibility !== "private",
  );
  if (!rows.length) return "";
  return `<section class="offline-simulation" aria-labelledby="offline-sim-title"><h2 id="offline-sim-title">${ctx.t("Nel frattempo al tavolo · simulazione", "Meanwhile at the Table · simulation")}</h2><p class="muted">${ctx.t("Dimostrazione: in questa prova c’è un solo browser. Registra una modifica che il DM fa alla stessa voce mentre sei senza rete, per vedere il conflitto quando torni in rete.", "Demonstration: this test has a single browser. Record a change the DM makes to the same value while you are offline, to see the conflict when you are back online.")}</p>${rows
    .map((entry) => {
      const inventory = entry.field.startsWith("inventory:");
      const reference = entry.mine ?? entry.base;
      const numeric = inventory || typeof reference === "number";
      const value = inventory ? (entry.remote?.value?.quantity ?? "") : (entry.remote?.value ?? "");
      const labelText = inventory
        ? ctx.t(
            `Quantità data dal DM · ${fieldLabel(ctx, entry)}`,
            `Quantity set by the DM · ${fieldLabel(ctx, entry)}`,
          )
        : ctx.t(
            `Valore del DM · ${fieldLabel(ctx, entry)}`,
            `The DM’s value · ${fieldLabel(ctx, entry)}`,
          );
      return `<form class="offline-sim-form" data-offline-simulate="${ctx.esc(entry.id)}"><label class="field"><span>${ctx.esc(`${targetName(ctx, entry)} · ${labelText}`)}</span><input name="value" ${numeric ? 'type="number" min="0" step="1" inputmode="numeric"' : 'type="text" maxlength="500"'} value="${ctx.esc(value)}" required></label><button type="submit" class="button">${ctx.t("Registra la modifica del DM", "Record the DM’s change")}</button></form>`;
    })
    .join("")}</section>`;
}
function blockedSection(ctx) {
  const list = memory.blocked[ctx.role] ?? [];
  if (!list.length) return "";
  return `<section class="offline-blocked" aria-labelledby="offline-blocked-title"><h2 id="offline-blocked-title">${ctx.t("Non salvate senza rete", "Not saved while offline")} (${list.length})</h2><p class="muted">${ctx.t("Modifiche condivise rifiutate in questa visita: non sono in coda. Rifalle quando torni in rete.", "Shared changes refused in this visit: they are not queued. Make them again when you are back online.")}</p><ul class="offline-list">${list
    .map(
      (row) =>
        `<li class="offline-row" data-status="blocked"><div class="offline-row-text"><strong>${ctx.esc(row.title || ctx.t("Modifica condivisa", "Shared change"))}</strong><small>${ctx.esc(ctx.label(row.reason))} · ${ctx.esc(when(ctx, row.at))}</small></div><span class="badge offline-badge" data-status="blocked">${ctx.t("Bloccata · serve la rete", "Blocked · needs the network")}</span></li>`,
    )
    .join("")}</ul></section>`;
}
function availableSection(ctx) {
  const rows = availableRows(ctx.state, slice(ctx.state), ctx.role);
  const total = rows.reduce((sum, row) => sum + (row.bytes || 0), 0);
  const eligible = eligibleItems(ctx.state, ctx.role).filter(
    (item) => !isAvailable(slice(ctx.state), ctx.role, item.kind, item.id),
  );
  const openButton = (row) =>
    row.exists
      ? `<button type="button" class="button quiet" data-offline-open="${ctx.esc(itemKey(row))}">${ctx.t("Apri", "Open")}</button>`
      : "";
  const list = rows.length
    ? `<ul class="offline-list">${rows
        .map((row) => {
          // Online the copy stays up to date (the badge says so): the time is the download.
          // Offline it is the copy of the last connection.
          const copied = when(ctx, ctx.offline ? (memory.since ?? row.savedAt) : row.savedAt);
          const facts = [
            !row.exists
              ? ctx.t("Non esiste più", "No longer exists")
              : ctx.offline
                ? ctx.t(`Copia delle ${copied}`, `Copy from ${copied}`)
                : ctx.t(`Sul dispositivo dalle ${copied}`, `On this device since ${copied}`),
            kb(ctx, row.bytes),
            row.pending ? ctx.t(`${row.pending} in coda`, `${row.pending} queued`) : "",
            row.conflicts
              ? ctx.t(
                  `${plural(row.conflicts, "conflitto", "conflitti")}`,
                  `${plural(row.conflicts, "conflict", "conflicts")}`,
                )
              : "",
          ].filter(Boolean);
          return `<li class="offline-row" data-offline-item="${ctx.esc(itemKey(row))}"><span class="offline-kind">${ctx.esc(ctx.label(KIND_LABEL[row.kind]))}</span><div class="offline-row-text"><strong>${ctx.esc(row.name ?? row.id)}</strong><small>${ctx.esc(facts.join(" · "))}</small></div><div class="offline-row-actions"><span class="badge offline-badge" data-status="${ctx.offline ? "offline-ready" : "ready"}">${ctx.offline ? ctx.t("Disponibile senza rete", "Available offline now") : ctx.t("Copia aggiornata", "Copy up to date")}</span>${openButton(row)}<button type="button" class="button quiet" data-offline-remove="${ctx.esc(itemKey(row))}" aria-label="${ctx.esc(ctx.t(`Rimuovi ${row.name ?? ""} dal dispositivo`, `Remove ${row.name ?? ""} from the device`))}">${ctx.t("Rimuovi", "Remove")}</button></div></li>`;
        })
        .join("")}</ul>`
    : `<p class="offline-empty">${ctx.t("Niente è ancora disponibile offline. Attivalo su una tua scheda o su un tuo appunto, oppure qui sotto.", "Nothing is available offline yet. Turn it on for one of your sheets or notes, or below.")}</p>`;
  const add = eligible.length
    ? `<h3>${ctx.t("Da rendere disponibili", "Not yet available")}</h3><ul class="offline-list">${eligible
        .map(
          (item) =>
            `<li class="offline-row" data-offline-candidate="${ctx.esc(itemKey(item))}"><span class="offline-kind">${ctx.esc(ctx.label(KIND_LABEL[item.kind]))}</span><div class="offline-row-text"><strong>${ctx.esc(item.name || ctx.t("Appunto senza titolo", "Untitled note"))}</strong><small>${ctx.esc(kb(ctx, item.bytes))} · ${ctx.t("solo online", "online only")}</small></div><div class="offline-row-actions"><button type="button" class="button" data-offline-add="${ctx.esc(itemKey(item))}">${ctx.t("Rendi disponibile", "Make available")}</button></div></li>`,
        )
        .join("")}</ul>`
    : "";
  return `<section class="offline-available" aria-labelledby="offline-available-title"><div class="offline-heading"><h2 id="offline-available-title">${ctx.t("Disponibili offline", "Available offline")}</h2><span class="muted" data-offline-total>${ctx.esc(ctx.t(`${plural(rows.length, "elemento", "elementi")} · ${kb(ctx, total)} su questo dispositivo`, `${plural(rows.length, "item", "items")} · ${kb(ctx, total)} on this device`))}</span></div><p class="muted">${ctx.t("Solo le tue schede e i tuoi appunti. Scaricarli richiede la rete; senza rete puoi consultarli e modificarli, e le modifiche aspettano in coda.", "Only your own sheets and notes. Downloading needs the network; offline you can read and edit them, and the changes wait in the queue.")}</p>${list}<div class="toolbar">${eligible.length ? `<button type="button" class="button" data-offline-add-all>${ctx.t("Rendi disponibile tutto", "Make everything available")}</button>` : ""}${rows.length ? `<button type="button" class="button quiet" data-offline-remove-all>${ctx.t("Rimuovi tutto dal dispositivo", "Remove everything from the device")}</button>` : ""}</div>${add}</section>`;
}
function queueSection(ctx) {
  const me = identityOf(slice(ctx.state), ctx.role);
  const pending = me.queue.filter((entry) => entry.status === "pending");
  const settled = me.queue.filter((entry) => !["pending", "conflict"].includes(entry.status));
  return `<section class="offline-queue" aria-labelledby="offline-queue-title"><h2 id="offline-queue-title">${ctx.t("Modifiche in coda", "Queued changes")} (${pending.length})</h2>${
    pending.length
      ? `<ol class="offline-list">${pending.map((entry) => entryRow(ctx, entry)).join("")}</ol>`
      : `<p class="offline-empty">${ctx.offline ? ctx.t("Nessuna modifica in coda. Le modifiche alle schede e agli appunti disponibili offline compaiono qui.", "No queued changes. Changes to sheets and notes available offline appear here.") : ctx.t("Nessuna modifica in attesa: tutto è sincronizzato.", "Nothing waiting: everything is synced.")}</p>`
  }${
    settled.length
      ? `<details class="offline-history"><summary>${ctx.t("Cronologia della sincronizzazione", "Sync history")} (${settled.length})</summary><ol class="offline-list">${[
          ...settled,
        ]
          .reverse()
          .map((entry) => entryRow(ctx, entry))
          .join("")}</ol></details>`
      : ""
  }</section>`;
}
export function renderOfflinePage(ctx) {
  const conflicts = conflictEntries(slice(ctx.state), ctx.role);
  return `<section class="offline-page" data-offline-page><div class="page-heading"><div><h1>${ctx.t("Offline e sincronizzazione", "Offline and sync")}</h1><p>${ctx.t("Scegli cosa resta su questo dispositivo senza rete, segui le modifiche in coda e rivedi i conflitti al ritorno.", "Choose what stays on this device without a network, follow the queued changes and review conflicts when you return.")}</p></div></div>${statusCard(ctx)}${
    conflicts.length
      ? `<section class="offline-conflicts" aria-labelledby="offline-conflicts-title"><h2 id="offline-conflicts-title">${ctx.t("Da rivedere", "To review")} (${conflicts.length})</h2><p class="muted">${ctx.t("Mentre eri senza rete qualcun altro ha cambiato le stesse voci. Nessuna versione è stata sovrascritta: confronta e scegli.", "While you were offline someone else changed the same values. No version was overwritten: compare and choose.")}</p>${conflicts.map((entry) => conflictCard(ctx, entry)).join("")}</section>`
      : ""
  }<div class="offline-columns"><div class="offline-main">${queueSection(ctx)}${blockedSection(ctx)}${simulationSection(ctx)}</div><div class="offline-side">${availableSection(ctx)}</div></div></section>`;
}

// A compact switch with the item's state, for the sheet and for a note.
function switchBlock(ctx, kind, id) {
  const s = slice(ctx.state);
  const on = isAvailable(s, ctx.role, kind, id);
  const me = identityOf(s, ctx.role);
  const entries = me.queue.filter((entry) => entry.kind === kind && entry.targetId === id);
  const pending = entries.filter((entry) => entry.status === "pending").length;
  const conflicts = entries.filter((entry) => entry.status === "conflict").length;
  const item = me.items.find((row) => row.kind === kind && row.id === id);
  const sheet = kind === "sheet";
  const queued = pending
    ? ctx.t(
        `${plural(pending, "modifica", "modifiche")} in coda su questo dispositivo, inviate al ritorno.`,
        `${plural(pending, "change", "changes")} queued on this device, sent when you return.`,
      )
    : sheet
      ? ctx.t(
          "puoi consultarla e modificarla: le modifiche aspettano in coda.",
          "you can read and edit it: changes wait in the queue.",
        )
      : ctx.t(
          "puoi consultarlo e modificarlo: le modifiche aspettano in coda.",
          "you can read and edit it: changes wait in the queue.",
        );
  const saved = ctx.t(
    `${sheet ? "Salvata" : "Salvato"} su questo dispositivo alle ${when(ctx, item?.savedAt)} (${kb(ctx, item?.bytes ?? 0)}). Senza rete ${sheet ? "potrai consultarla e modificarla" : "potrai consultarlo e modificarlo"}.`,
    `Saved on this device at ${when(ctx, item?.savedAt)} (${kb(ctx, item?.bytes ?? 0)}). Offline you can read and edit it.`,
  );
  const text = ctx.offline
    ? on
      ? `${ctx.t("Senza rete", "Offline")} · ${queued}`
      : sheet
        ? ctx.t(
            "Senza rete · non disponibile offline: le modifiche alla scheda sono bloccate finché non torni in rete.",
            "Offline · not available offline: changes to the sheet are blocked until you are back online.",
          )
        : ctx.t(
            "Senza rete · non è tra i contenuti offline: lo vedi perché era già aperto, e le sue modifiche non entrano in coda.",
            "Offline · not among the offline content: you see it because it was already open, and its changes are not queued.",
          )
    : on
      ? saved
      : sheet
        ? ctx.t(
            "Solo online: senza rete la consulti, ma le modifiche restano bloccate.",
            "Online only: without a network you can read it, but changes stay blocked.",
          )
        : ctx.t(
            "Solo online: rendilo disponibile per ritrovarlo e modificarlo senza rete.",
            "Online only: make it available to find and edit it without a network.",
          );
  const review = conflicts
    ? `<p class="offline-switch-alert" role="alert">${ctx.esc(ctx.t(`${plural(conflicts, "conflitto", "conflitti")} da rivedere dopo la riconnessione.`, `${plural(conflicts, "conflict", "conflicts")} to review after reconnecting.`))}</p>`
    : "";
  return `<div class="offline-switch-block" data-offline-switch="${ctx.esc(`${kind}:${id}`)}"><label class="offline-switch"><input type="checkbox" role="switch" data-offline-toggle="${ctx.esc(`${kind}:${id}`)}" ${on ? "checked" : ""} aria-describedby="offline-switch-text-${ctx.esc(id)}"><span class="offline-switch-track" aria-hidden="true"></span><span>${ctx.t("Disponibile offline", "Available offline")}</span></label><p class="muted" id="offline-switch-text-${ctx.esc(id)}">${ctx.esc(text)}</p>${review}<button type="button" class="button quiet" data-offline-page-link>${ctx.icon("settings")}${ctx.t("Offline e sincronizzazione", "Offline and sync")}</button></div>`;
}
export function renderSheetSection(ctx, actor) {
  return `<section class="panel offline-sheet" aria-label="${ctx.esc(ctx.t("Disponibilità offline", "Offline availability"))}">${switchBlock(ctx, "sheet", actor.id)}</section>`;
}
export function renderEntrySection(ctx, entry) {
  return `<section class="offline-entry" aria-label="${ctx.esc(ctx.t("Disponibilità offline", "Offline availability"))}">${switchBlock(ctx, "note", entry.id)}</section>`;
}

// ------------------------------------------------------------------ binding

export function bindOffline(el, ctx) {
  const on = (selector, type, handler) =>
    el.querySelectorAll(selector).forEach((node) => node.addEventListener(type, handler));
  on("[data-offline-toggle]", "change", (event) =>
    toggleAvailable(ctx, event.currentTarget.dataset.offlineToggle, event.currentTarget.checked),
  );
  on("[data-offline-add]", "click", (event) =>
    toggleAvailable(ctx, event.currentTarget.dataset.offlineAdd, true),
  );
  on("[data-offline-remove]", "click", (event) =>
    toggleAvailable(ctx, event.currentTarget.dataset.offlineRemove, false),
  );
  on("[data-offline-add-all]", "click", () => allAvailable(ctx, true));
  on("[data-offline-remove-all]", "click", () => allAvailable(ctx, false));
  on("[data-offline-open]", "click", (event) => {
    const item = parseItemKey(event.currentTarget.dataset.offlineOpen);
    if (item?.kind === "sheet") ctx.openSheet(item.id);
    else if (item) ctx.navigate("notes", { tab: "entry", id: item.id });
  });
  on("[data-offline-page-link]", "click", () => ctx.navigate(OFFLINE_SLICE));
  on("[data-offline-retry]", "click", () => retryNow(ctx));
  on("[data-offline-sync]", "click", () => {
    if (syncNow(ctx) === null) ctx.render();
  });
  on("[data-offline-resolve]", "click", (event) =>
    resolve(ctx, event.currentTarget.dataset.entry, event.currentTarget.dataset.offlineResolve),
  );
  on("[data-offline-discard]", "click", (event) =>
    discardQueued(ctx, event.currentTarget.dataset.offlineDiscard),
  );
  on("[data-offline-reopen]", "click", (event) =>
    reopen(ctx, event.currentTarget.dataset.offlineReopen),
  );
  on("[data-offline-simulate]", "submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    simulate(ctx, form.dataset.offlineSimulate, form.querySelector("[name=value]")?.value ?? "");
  });
}

// ------------------------------------------------------------------ registration

const SEARCH_WORDS = [
  "offline",
  "senza rete",
  "sincronizzazione",
  "sincronizza",
  "sync",
  "connessione",
  "connection",
  "riconnessione",
  "reconnect",
  "conflitti",
  "conflicts",
  "disponibile offline",
  "available offline",
  "coda",
  "queue",
  "download",
  "scarica",
];

// ------------------------------------------------------------------ real network (SV-34)

// DDB reconnect banner: the browser's own online/offline events and navigator.onLine drive
// the same header state, banner and automatic retry as the demonstration switch (through
// the shell's setNetworkOffline). Installed once per page.
let networkWired = false;
export function wireNetwork(win, getCtx) {
  if (networkWired || !win?.addEventListener) return false;
  networkWired = true;
  const set = (value) => getCtx()?.setNetworkOffline?.(value);
  win.addEventListener("offline", () => set(true));
  win.addEventListener("online", () => set(false));
  if (win.navigator?.onLine === false) setTimeout(() => set(true), 0);
  return true;
}

// ------------------------------------------------------------------ installable app (IN-11)

// Roll20 «Aggiungi a Home» / the PWA install prompt: the browser offers installation
// (beforeinstallprompt) once the manifest and this minimal service worker are in place;
// iOS Safari never fires it, so Home shows its «Condividi › Aggiungi a Home» steps instead.
const install = { prompt: null, installed: false };
export function installState(win = globalThis) {
  const nav = win?.navigator ?? {};
  const standalone =
    Boolean(win?.matchMedia?.("(display-mode: standalone)")?.matches) || nav.standalone === true;
  const ios =
    /iphone|ipad|ipod/i.test(nav.userAgent ?? "") ||
    (nav.platform === "MacIntel" && Number(nav.maxTouchPoints) > 1);
  return {
    canPrompt: Boolean(install.prompt),
    installed: install.installed || standalone,
    ios,
  };
}
export async function promptInstall() {
  const event = install.prompt;
  if (!event) return "unavailable";
  install.prompt = null;
  await event.prompt();
  const choice = await event.userChoice;
  if (choice?.outcome === "accepted") install.installed = true;
  return choice?.outcome ?? "dismissed";
}
let installWired = false;
export function wireInstall(win, getCtx) {
  if (installWired || !win?.addEventListener) return false;
  installWired = true;
  win.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    install.prompt = event;
    getCtx()?.render?.();
  });
  win.addEventListener("appinstalled", () => {
    install.installed = true;
    install.prompt = null;
    getCtx()?.render?.();
  });
  // The service-worker hook: pass-through only (sw.js caches nothing).
  win.navigator?.serviceWorker?.register?.("sw.js")?.catch?.(() => {});
  return true;
}

export function register(registry) {
  const ctxOf = () => registry.ctx;
  wireNetwork(globalThis.window, ctxOf);
  wireInstall(globalThis.window, ctxOf);
  registry.registerStateSlice(OFFLINE_SLICE, {
    version: OFFLINE_VERSION,
    // A queued change and its gameplay change are one commit: Undo removes both together.
    undo: "snapshot",
    seed: seedOffline,
    normalize: (value, fromVersion) => normalizeOffline(value, fromVersion),
    afterUndo: keepNotesAfterUndo,
  });
  registry.registerStyles(new URL("./offline.css", import.meta.url));

  registry.add("route", {
    id: OFFLINE_SLICE,
    label: L("Offline e sincronizzazione", "Offline and sync"),
    icon: "settings",
    render: (ctx) => renderOfflinePage(ctx),
    bind: (el, ctx) => bindOffline(el, ctx),
  });
  // Global and always visible, like a connection indicator: its label is the state.
  registry.add("service", {
    id: OFFLINE_SLICE,
    label: {
      get it() {
        return indicatorText(ctxOf(), "it");
      },
      get en() {
        return indicatorText(ctxOf(), "en");
      },
    },
    description: L(
      "Stato della connessione, contenuti offline, coda e conflitti",
      "Connection state, offline content, queue and conflicts",
    ),
    icon: "check",
    header: true,
    order: 45,
    run: (ctx) => ctx.navigate(OFFLINE_SLICE),
  });
  registry.add("sheet-section", {
    id: "offline-sheet",
    label: L("Disponibile offline", "Available offline"),
    tab: "actions",
    order: 5,
    when: (ctx, actor) =>
      Boolean(actor) && ownSheets(ctx.state, ctx.role).some((row) => row.id === actor.id),
    render: (ctx, actor) => renderSheetSection(ctx, actor),
    bind: (el, ctx) => bindOffline(el, ctx),
  });
  // Entry-level section (campaign.mjs renders ".entry" sections on an entry page).
  registry.add("campaign-section", {
    id: "offline.entry",
    label: L("Disponibile offline", "Available offline"),
    when: (ctx, entry) => Boolean(entry?.id) && entry.kind === "note" && entry.ownerId === ctx.role,
    render: (ctx, entry) => renderEntrySection(ctx, entry),
    bind: (el, ctx) => bindOffline(el, ctx),
  });
  registry.add("settings", {
    id: OFFLINE_SLICE,
    label: L("Offline", "Offline"),
    scope: "device",
    fields: [
      {
        id: "auto",
        label: L(
          "Rendi disponibili offline le tue schede quando le apri",
          "Make your sheets available offline when you open them",
        ),
        type: "boolean",
        default: false,
      },
    ],
  });
  registry.add("notifications", {
    id: "offline-conflicts",
    label: L("Offline e sincronizzazione", "Offline and sync"),
    collect: (ctx) =>
      conflictEntries(slice(ctx.state), ctx.role).map((entry) => ({
        id: `offline-conflict-${entry.id}`,
        title: L(
          `Conflitto da rivedere: ${targetName(inLang(ctx, "it"), entry)} · ${fieldLabel(inLang(ctx, "it"), entry)}`,
          `Conflict to review: ${targetName(inLang(ctx, "en"), entry)} · ${fieldLabel(inLang(ctx, "en"), entry)}`,
        ),
        body: L(
          "Mentre eri senza rete qualcun altro ha cambiato la stessa voce: confronta e scegli.",
          "While you were offline someone else changed the same value: compare and choose.",
        ),
        time: entry.conflictAt,
        target: { page: OFFLINE_SLICE, params: {} },
      })),
  });
  registry.add("search", {
    id: "offline-page",
    label: L("Offline e sincronizzazione", "Offline and sync"),
    search: (ctx, query) => {
      const q = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (q.length < 3 || !SEARCH_WORDS.some((word) => word.includes(q) || q.includes(word)))
        return [];
      return [
        {
          title: L("Offline e sincronizzazione", "Offline and sync"),
          excerpt: L(
            "Contenuti disponibili offline, modifiche in coda e conflitti",
            "Content available offline, queued changes and conflicts",
          ),
          page: OFFLINE_SLICE,
        },
      ];
    },
  });
  registry.add("command", {
    id: "offline.open",
    label: L("Apri Offline e sincronizzazione", "Open Offline and sync"),
    context: "global",
    group: "offline",
    run: (ctx) => ctx.navigate(OFFLINE_SLICE),
  });
  registry.add("command", {
    id: "offline.toggle-sheet",
    label: L(
      "Disponibile offline: attiva o disattiva per questa scheda",
      "Available offline: turn on or off for this sheet",
    ),
    context: "characters",
    group: "offline",
    when: (ctx) =>
      Boolean(ctx.view?.id) && ownSheets(ctx.state, ctx.role).some((a) => a.id === ctx.view.id),
    run: (ctx) =>
      toggleAvailable(
        ctx,
        `sheet:${ctx.view.id}`,
        !isAvailable(slice(ctx.state), ctx.role, "sheet", ctx.view.id),
      ),
  });

  // The "offline:write" host hook (app.mjs commit): only content this identity made
  // available offline changes behaviour; everything else keeps the core rule.
  registry.on("offline:write", (write, { ctx }) => {
    if (!ctx || !write) return;
    const role = ctx.role;
    const me = identityOf(slice(ctx.state), role);
    const sharedSheets = me.items.some(
      (item) => item.kind === "sheet" && ctx.state.actors?.[item.id]?.visibility !== "private",
    );
    if (me.items.length)
      write.wrap = (mutator) => (draft) => {
        const before = structuredClone(draft);
        mutator(draft);
        try {
          captureOfflineWrite(before, draft, own(draft), role, {
            shared: !write.local,
            title: write.title,
          });
        } catch (error) {
          if (error?.it) {
            noteBlocked(role, write.title, { it: error.it, en: error.en });
            throw Object.assign(Error(ctx.t(error.it, error.en)), { it: error.it, en: error.en });
          }
          throw error;
        }
      };
    if (!write.local && sharedSheets) write.accept = true;
    if (!write.local && !write.accept) noteBlocked(role, write.title, SHARED_BLOCKED);
  });
  registry.on("offline-changed", (payload, { ctx }) => {
    if (!ctx) return;
    if (payload?.offline) {
      clearTimeout(memory.timer);
      Object.assign(memory, {
        phase: "offline",
        since: nowISO(),
        attempts: 0,
        lastAttemptAt: null,
      });
    } else {
      memory.since = null;
      scheduleSync(ctx);
    }
  });
  // Another identity on this device: its own queue reconnects when it is back online.
  registry.on("role-changed", (payload, { ctx }) => {
    if (!ctx) return;
    clearTimeout(memory.timer);
    memory.phase = ctx.offline ? "offline" : "online";
    if (!ctx.offline) scheduleSync(ctx);
  });
  registry.on("navigate", (payload, { ctx }) => {
    if (!ctx) return;
    // Opening the app again with the network: whatever was queued syncs by itself.
    if (payload?.from === null && !ctx.offline) scheduleSync(ctx);
    // Device setting: sheets you open become available offline (Notion/DDB recents).
    if (
      payload?.page === "characters" &&
      payload.id &&
      !ctx.offline &&
      registry.getSetting(ctx, "offline.auto") === true &&
      ownSheets(ctx.state, ctx.role).some((actor) => actor.id === payload.id) &&
      !isAvailable(slice(ctx.state), ctx.role, "sheet", payload.id)
    ) {
      clearTimeout(memory.autoTimer);
      memory.autoTimer = setTimeout(() => toggleAvailable(ctx, `sheet:${payload.id}`, true), 0);
    }
  });
  registry.on("reset", () => resetOfflineMemory());
}
