// B29 — Account, profile and personal data (Services).
//
// One page reached from the header's account menu (DDB: avatar menu → sections, Sign
// out): display name and several avatars (DDB-189, Roll20 display name R20-195, Foundry
// avatar + colour FVT-049); sign-in methods listed as a demonstration and a linked Discord
// service that is not a login (DDB-186, SVC-147, VTL-214, CMP-219); last access shared
// only by consent (Kanka SVC-043); personal-data export (SVC-145, FVT-205) with the
// safety profile (Alchemy SVC-073) and account deletion with the consequences listed
// first, an identity check, a typed confirmation, a recovery window and B13's ownership
// offer for each campaign (DDB-188, SVC-143, SVC-144, R20-207, VTL-040). Signing out
// closes the app to that identity through the registry's access gate ("sign in to
// continue"): only this page, no other area's commands, results or notifications.
//
// Everything is simulated locally: no real authentication, provider window, e-mail or
// external service is contacted. Pure domain functions are exported for tests; other
// areas read the published avatar from account-avatar.mjs, not from this module.

import {
  COLORS,
  EMBLEMS,
  IMAGE_SRC,
  activeAvatar,
  avatarHTML,
  colorFor,
  initialsOf,
  publishedAvatar,
} from "./account-avatar.mjs";
import { campaignMembers, getCampaignEntry, getCampaignMembers } from "./campaign-content.mjs";
import {
  coreCampaign,
  listCampaigns,
  membersOf,
  metaOf,
  personName,
  proposeTransfer,
  revokeTransfer,
  roleOf,
} from "./campaign-members.mjs";
import { sheetData } from "./character-export.mjs";
import { startSandbox, promoteSandbox } from "./state.mjs";
import { getConditionOverview } from "./conditions.mjs";

// The avatar helpers live in account-avatar.mjs so that the member list and the chat do
// not depend on this area loading; they are re-exported here unchanged.
export { COLORS, EMBLEMS, activeAvatar, avatarHTML, initialsOf, publishedAvatar };

export const ACCOUNT_ID = "account";
export const SLICE_VERSION = 1;
export const RECOVERY_DAYS = 30;
export const MAX_AVATARS = 6;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const AVATAR_PIXELS = 96;
const DAY = 24 * 3600 * 1000;
const clone = (value) => structuredClone(value);
const iso = (now) => new Date(now).toISOString();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const refuse = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};

// Sign-in methods (DDB-186; passkey from LegendKeeper CMP-219). Discord is deliberately
// not here: linking it is a separate service, never a way in (SVC-147).
export const PROVIDERS = Object.freeze({
  email: { it: "Email e password", en: "Email and password" },
  google: { it: "Google", en: "Google" },
  apple: { it: "Apple", en: "Apple" },
  passkey: { it: "Passkey di questo dispositivo", en: "Passkey on this device" },
});
export const SERVICES = Object.freeze({
  discord: {
    name: "Discord",
    purpose: {
      it: "Permetterebbe a un bot Discord di leggere i tuoi personaggi e tirare per te.",
      en: "Would let a Discord bot read your characters and roll for you.",
    },
    scopes: { it: "solo nome utente e ID", en: "username and ID only" },
  },
});
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TYPED = { it: "ELIMINA ACCOUNT", en: "DELETE ACCOUNT" };
// B13 campaign statuses an identity can still belong to.
const STATUSES = ["active", "archived", "deleted"];

// ---------------------------------------------------------------- state slice

function seedProfile(id, now) {
  const player = id === "player";
  return {
    displayName: null,
    avatars: [{ id: "initials", kind: "initials", color: player ? "sage" : "gold" }],
    activeAvatarId: "initials",
    removedAvatar: null,
    nameHistory: [],
    session: "account",
    signIn: player
      ? [
          {
            id: "email",
            provider: "email",
            label: "giocatore@example.test",
            addedAt: iso(now - 90 * DAY),
          },
          { id: "google", provider: "google", label: "", addedAt: iso(now - 40 * DAY) },
        ]
      : [
          {
            id: "email",
            provider: "email",
            label: "dm@example.test",
            addedAt: iso(now - 120 * DAY),
          },
        ],
    linked: player
      ? []
      : [
          {
            id: "discord",
            service: "discord",
            handle: "custode_bruma",
            linkedAt: iso(now - 30 * DAY),
          },
        ],
    privacy: { showLastSeen: false },
    // Last sign-in to the account (seen only by its owner): the player earlier today,
    // the DM after last session. The access to each campaign is B13's.
    lastSeenAt: iso(now - (player ? 3 : 26) * 3600 * 1000),
    deletion: null,
  };
}
export function seedAccount(now = Date.now()) {
  return { profiles: { player: seedProfile("player", now), dm: seedProfile("dm", now) }, seq: 0 };
}
const text = (value, max) =>
  typeof value === "string" && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const date = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
function validAvatar(avatar) {
  if (!isObject(avatar) || !text(avatar.id, 40)) return false;
  if (avatar.kind === "initials" || avatar.kind === "emblem")
    return (
      Object.hasOwn(COLORS, avatar.color) &&
      (avatar.kind === "initials" || Object.hasOwn(EMBLEMS, avatar.glyph))
    );
  return avatar.kind === "image" && typeof avatar.src === "string" && IMAGE_SRC.test(avatar.src);
}
function normalizeProfile(raw, fallback) {
  if (!isObject(raw)) return fallback;
  const avatars = (Array.isArray(raw.avatars) ? raw.avatars : [])
    .filter(validAvatar)
    .slice(0, MAX_AVATARS);
  if (!avatars.some((a) => a.id === "initials")) avatars.unshift(fallback.avatars[0]);
  const deletion = isObject(raw.deletion) && date(raw.deletion.recoverUntil) ? raw.deletion : null;
  return {
    displayName: text(raw.displayName, 40) && raw.displayName.trim() ? raw.displayName : null,
    avatars,
    activeAvatarId: avatars.some((a) => a.id === raw.activeAvatarId)
      ? raw.activeAvatarId
      : "initials",
    removedAvatar:
      isObject(raw.removedAvatar) && validAvatar(raw.removedAvatar.avatar)
        ? raw.removedAvatar
        : null,
    nameHistory: (Array.isArray(raw.nameHistory) ? raw.nameHistory : [])
      .filter((h) => isObject(h) && text(h.id, 40) && date(h.changedAt))
      .slice(-10),
    // A trial visit saved by an earlier version of this area was not a real sandbox: it
    // reopens as signed out. IN-10's "sandbox" lives only in the separate trial copy.
    session:
      raw.session === "account" || raw.session === undefined
        ? "account"
        : raw.session === "sandbox"
          ? "sandbox"
          : "signed-out",
    signIn: (Array.isArray(raw.signIn) ? raw.signIn : []).filter(
      (m) => isObject(m) && Object.hasOwn(PROVIDERS, m.provider) && text(m.id, 40),
    ),
    linked: (Array.isArray(raw.linked) ? raw.linked : []).filter(
      (l) => isObject(l) && Object.hasOwn(SERVICES, l.service) && text(l.handle, 40),
    ),
    privacy: { showLastSeen: raw.privacy?.showLastSeen === true },
    lastSeenAt: date(raw.lastSeenAt) ? raw.lastSeenAt : fallback.lastSeenAt,
    deletion,
    ...normalizeSecurity(raw),
  };
}
// SV-56 and SV-28 (close review 01/10): kept only when present, so older saves are unchanged.
function normalizeSecurity(raw) {
  const out = {};
  const tf = raw.twoFactor;
  if (isObject(tf) && text(tf.secret, 64) && /^[A-Z2-7]{16,32}$/.test(tf.secret))
    out.twoFactor = {
      secret: tf.secret,
      enabled: tf.enabled === true,
      enabledAt: date(tf.enabledAt) ? tf.enabledAt : null,
      recovery: (Array.isArray(tf.recovery) ? tf.recovery : [])
        .filter((code) => isObject(code) && /^[a-z0-9]{4}-[a-z0-9]{4}$/.test(code.code))
        .slice(0, 10)
        .map((code) => ({ code: code.code, used: code.used === true })),
    };
  if (isObject(raw.pendingSecondStep) && Object.hasOwn(PROVIDERS, raw.pendingSecondStep.provider))
    out.pendingSecondStep = { provider: raw.pendingSecondStep.provider };
  const age = raw.age;
  if (isObject(age) && AGE_BANDS.includes(age.band))
    out.age = {
      band: age.band,
      birthYear: Number.isInteger(age.birthYear) ? age.birthYear : null,
      consent: ["none", "pending", "granted"].includes(age.consent) ? age.consent : "none",
      parent: text(age.parent, 120) ? age.parent : "",
      at: date(age.at) ? age.at : null,
    };
  return out;
}
export function normalizeAccount(slice, fromVersion = SLICE_VERSION, now = Date.now()) {
  if (fromVersion > SLICE_VERSION) throw Error("Account data comes from a newer version");
  const seed = seedAccount(now);
  const profiles = {};
  const raw = isObject(slice?.profiles) ? slice.profiles : {};
  for (const [id, value] of Object.entries(raw))
    if (/^[a-z0-9][a-z0-9-]{0,39}$/.test(id))
      profiles[id] = normalizeProfile(value, seed.profiles[id] ?? blankProfile(now));
  for (const id of Object.keys(seed.profiles)) profiles[id] ??= seed.profiles[id];
  return { profiles, seq: Number.isInteger(slice?.seq) && slice.seq >= 0 ? slice.seq : 0 };
}
// Identities added later by other areas (B13 invitations) get an empty account.
function blankProfile(now) {
  return {
    ...seedProfile("new", now),
    signIn: [{ id: "email", provider: "email", label: "", addedAt: iso(now) }],
    linked: [],
    avatars: [{ id: "initials", kind: "initials", color: "stone" }],
  };
}

// ---------------------------------------------------------------- projections

const sliceOf = (state) => state?.ext?.[ACCOUNT_ID] ?? null;
export function profileOf(state, identityId, now = Date.now()) {
  const stored = sliceOf(state)?.profiles?.[identityId];
  return clone(stored ?? seedAccount(now).profiles[identityId] ?? blankProfile(now));
}
function mutableProfile(draft, identityId, now) {
  const slice = draft.ext?.[ACCOUNT_ID];
  if (!slice) throw Error("Account state is not initialized");
  slice.profiles[identityId] ??= seedAccount(now).profiles[identityId] ?? blankProfile(now);
  return slice.profiles[identityId];
}
const nextId = (draft, prefix) => `${prefix}-${++draft.ext[ACCOUNT_ID].seq}`;
function memberRecord(state, identityId) {
  return state.campaign ? campaignMembers(state).find((m) => m.id === identityId) : null;
}
const textOf = (value, lang = "it") =>
  isObject(value) ? value[lang] || value.it || value.en || "" : String(value ?? "");
// The member-record name used when no display name is chosen (same default as the core
// campaign record and B13).
const defaultMemberName = (identityId) => (identityId === "dm" ? "DM" : "Giocatore / Player");
// Every campaign this identity belongs to, current or parked, in any B13 status (B13
// lists deleted campaigns to their owner only, inside its restore window).
export function membershipsOf(state, identityId) {
  return STATUSES.flatMap((status) => listCampaigns(state, identityId, { status })).map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status,
    current: row.current,
  }));
}
// The name others see: the chosen display name, otherwise the member name B13 shows
// (the bilingual demo default split by language).
export function displayNameOf(state, identityId, lang = "it") {
  const profile = profileOf(state, identityId);
  if (profile.displayName) return profile.displayName;
  return personName(state, identityId, lang === "en" ? "en" : "it");
}
// What another member (or the viewer) sees of one member of a campaign: the name and
// avatar every member list and chat draws, and the last access to that campaign (B13's
// record) only with that member's consent (Kanka SVC-043). Private account data
// (methods, services, deletion, last sign-in to the account) never appears.
export function memberDisplay(
  state,
  memberId,
  viewerId,
  lang = "it",
  campaignId = state.campaign?.id,
) {
  const member = membersOf(state, campaignId).find((m) => m.id === memberId);
  if (!member) return null;
  const profile = profileOf(state, memberId);
  const self = memberId === viewerId;
  const name = displayNameOf(state, memberId, lang);
  const lastAccess = metaOf(state, campaignId)?.lastAccess?.[memberId] ?? null;
  return {
    id: member.id,
    role: roleOf(state, campaignId, memberId) ?? member.role,
    self,
    name,
    avatar: publishedAvatar(state, memberId) ?? { kind: "initials", color: colorFor(name) },
    lastSeenAt: self || profile.privacy.showLastSeen ? lastAccess : null,
    sharesLastSeen: profile.privacy.showLastSeen,
  };
}
export function listMemberDisplays(state, viewerId, lang = "it") {
  const campaignId = state.campaign?.id;
  if (!campaignId) return [];
  return getCampaignMembers(state, campaignId, viewerId)
    .map((m) => memberDisplay(state, m.id, viewerId, lang, campaignId))
    .filter(Boolean);
}

// ---------------------------------------------------------------- profile commands

// Writes the display name into the member record of every campaign of the identity
// (current and parked), so readers of member records (chat, journal, sessions) and a
// campaign launched later show it. Avatars are read from the account itself.
function publish(draft, identityId, profile, fallbackName = null) {
  const name = profile.displayName ?? fallbackName ?? defaultMemberName(identityId);
  for (const { id } of membershipsOf(draft, identityId)) {
    const campaign = coreCampaign(draft, id);
    if (!campaign) continue;
    campaign.members ??= clone(membersOf(draft, id));
    const target = campaign.members.find((m) => m.id === identityId);
    if (!target) continue;
    target.name = name;
    // An earlier version copied the avatar here; the account is now the only source.
    delete target.avatar;
  }
}
function requireEditable(profile) {
  if (profile.session !== "account")
    refuse("Accedi prima di modificare il profilo.", "Sign in before editing the profile.");
  if (profile.deletion)
    refuse(
      "L’account è in eliminazione: annulla l’eliminazione per modificarlo.",
      "The account is being deleted: cancel the deletion to edit it.",
    );
}
export function validateDisplayName(value) {
  const name = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if ([...name].length < 2 || [...name].length > 32)
    refuse(
      "Il nome visualizzato deve avere da 2 a 32 caratteri.",
      "The display name must be 2 to 32 characters long.",
    );
  if (/[\u0000-\u001f\u007f]/.test(name) || !/[\p{L}\p{N}]/u.test(name))
    refuse(
      "Usa almeno una lettera o una cifra, senza caratteri di controllo.",
      "Use at least one letter or digit, and no control characters.",
    );
  // " / " joins the two languages of the example's default name ("Giocatore / Player"):
  // the chat would show only one half of a chosen name written that way.
  if (name.includes(" / "))
    refuse(
      "« / » separa i due nomi bilingui dell’esempio: usa un altro segno.",
      "“ / ” separates the two bilingual names of the example: use another sign.",
    );
  // A role word would make a player's message read as the DM's (the chat shows names only).
  if (RESERVED_NAMES.includes(nameKey(name)))
    refuse(
      `«${name}» indica un ruolo: scegli un nome personale.`,
      `“${name}” names a role: choose a personal name.`,
    );
  return name;
}
// Words that name a role, or the author shown for a deleted account.
const RESERVED_NAMES = [
  "dm",
  "gm",
  "master",
  "dungeonmaster",
  "gamemaster",
  "codm",
  "accounteliminato",
  "deletedaccount",
];
const nameKey = (name) =>
  String(name ?? "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
// The names others see for this identity now: the chosen one, or the default in both
// languages ("Giocatore" and "Player").
const currentNames = (state, identityId, profile) =>
  profile.displayName
    ? [profile.displayName]
    : [personName(state, identityId, "it"), personName(state, identityId, "en")];
// Another member of one of this identity's campaigns already shown with that name.
function nameTakenBy(state, identityId, name) {
  const key = nameKey(name);
  for (const { id } of membershipsOf(state, identityId))
    for (const member of membersOf(state, id)) {
      if (member.id === identityId) continue;
      const shown = ["it", "en"].map((lang) => displayNameOf(state, member.id, lang));
      if (shown.some((other) => nameKey(other) === key)) return shown[0];
    }
  return null;
}
function requireFreeName(state, identityId, name) {
  const taken = nameTakenBy(state, identityId, name);
  if (taken)
    refuse(
      `«${taken}» è già il nome di un altro membro delle tue campagne: scegline uno diverso.`,
      `“${taken}” is already the name of another member of your campaigns: choose a different one.`,
    );
}
export function setDisplayName(draft, identityId, value, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  // "Save" on the unchanged field (in either language of the default) changes nothing.
  const typed = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (currentNames(draft, identityId, profile).includes(typed))
    refuse("Il nome visualizzato è già questo.", "That is already your display name.");
  const name = validateDisplayName(typed);
  requireFreeName(draft, identityId, name);
  const member = memberRecord(draft, identityId);
  profile.nameHistory.push({
    id: nextId(draft, "name"),
    displayName: profile.displayName,
    memberName: member ? clone(member.name) : null,
    changedAt: iso(now),
  });
  profile.nameHistory = profile.nameHistory.slice(-10);
  profile.displayName = name;
  publish(draft, identityId, profile);
  return name;
}
// Correction: go back to an earlier name. The current name enters the history too, so a
// restore can itself be reversed.
export function restoreDisplayName(draft, identityId, historyId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  const entry = profile.nameHistory.find((h) => h.id === historyId);
  if (!entry) refuse("Questo nome non è più disponibile.", "That name is no longer available.");
  if ((entry.displayName ?? null) === (profile.displayName ?? null))
    refuse("Il nome visualizzato è già questo.", "That is already your display name.");
  if (entry.displayName) requireFreeName(draft, identityId, entry.displayName);
  const member = memberRecord(draft, identityId);
  profile.nameHistory = profile.nameHistory.filter((h) => h.id !== historyId);
  profile.nameHistory.push({
    id: nextId(draft, "name"),
    displayName: profile.displayName,
    memberName: member ? clone(member.name) : null,
    changedAt: iso(now),
  });
  profile.displayName = entry.displayName;
  publish(
    draft,
    identityId,
    profile,
    typeof entry.memberName === "string" ? entry.memberName : null,
  );
  return entry;
}
export function validateAvatarFile(file) {
  if (!file) refuse("Scegli un’immagine.", "Choose an image.");
  if (!IMAGE_TYPES.includes(file.type))
    refuse(
      "Formato non supportato: usa PNG, JPEG, WebP o GIF.",
      "Unsupported format: use PNG, JPEG, WebP or GIF.",
    );
  if (!(file.size > 0))
    refuse("Il file è vuoto o illeggibile.", "The file is empty or unreadable.");
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    refuse(
      `File troppo grande (${mb.replace(".", ",")} MB): massimo 2 MB.`,
      `File too large (${mb} MB): 2 MB at most.`,
    );
  }
  return true;
}
export function addAvatar(draft, identityId, input, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (profile.avatars.length >= MAX_AVATARS)
    refuse(
      `Hai già ${MAX_AVATARS} avatar: eliminane uno per aggiungerne un altro.`,
      `You already have ${MAX_AVATARS} avatars: delete one to add another.`,
    );
  const avatar =
    input?.kind === "image"
      ? { id: nextId(draft, "avatar"), kind: "image", src: input.src }
      : input?.glyph === "initials"
        ? { id: nextId(draft, "avatar"), kind: "initials", color: input.color }
        : { id: nextId(draft, "avatar"), kind: "emblem", color: input?.color, glyph: input?.glyph };
  if (!validAvatar(avatar)) refuse("Immagine o emblema non validi.", "Invalid image or emblem.");
  profile.avatars.push(avatar);
  profile.activeAvatarId = avatar.id;
  return avatar;
}
export function selectAvatar(draft, identityId, avatarId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (!profile.avatars.some((a) => a.id === avatarId))
    refuse("Avatar non disponibile.", "Avatar unavailable.");
  if (profile.activeAvatarId === avatarId)
    refuse("Stai già usando questo avatar.", "You are already using this avatar.");
  profile.activeAvatarId = avatarId;
}
export function removeAvatar(draft, identityId, avatarId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (avatarId === "initials")
    refuse("Le iniziali restano come avatar di riserva.", "Initials stay as the fallback avatar.");
  const avatar = profile.avatars.find((a) => a.id === avatarId);
  if (!avatar) refuse("Avatar non disponibile.", "Avatar unavailable.");
  const wasActive = profile.activeAvatarId === avatarId;
  profile.avatars = profile.avatars.filter((a) => a.id !== avatarId);
  if (wasActive) profile.activeAvatarId = "initials";
  profile.removedAvatar = { avatar, wasActive, removedAt: iso(now) };
}
export function restoreRemovedAvatar(draft, identityId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  const removed = profile.removedAvatar;
  if (!removed) refuse("Nessun avatar da ripristinare.", "No avatar to restore.");
  if (profile.avatars.length >= MAX_AVATARS)
    refuse(
      `Hai già ${MAX_AVATARS} avatar: eliminane uno prima di ripristinare.`,
      `You already have ${MAX_AVATARS} avatars: delete one before restoring.`,
    );
  profile.avatars.push(removed.avatar);
  if (removed.wasActive) profile.activeAvatarId = removed.avatar.id;
  profile.removedAvatar = null;
}

// ---------------------------------------------------------------- sign-in and services

export function maskedLabel(method) {
  const [name, domain] = String(method.label || "").split("@");
  return domain ? `${[...name][0] ?? ""}•••@${domain}` : "";
}
export function addSignInMethod(
  draft,
  identityId,
  provider,
  { label = "", now = Date.now() } = {},
) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (!Object.hasOwn(PROVIDERS, provider))
    refuse("Metodo d’accesso non disponibile.", "Sign-in method unavailable.");
  if (profile.signIn.some((m) => m.provider === provider))
    refuse("Questo metodo è già collegato.", "This method is already added.");
  const address = String(label).trim();
  if (provider === "email" && !/^[^\s@]{1,40}@[^\s@]{1,60}\.[a-z]{2,}$/i.test(address))
    refuse("Scrivi un indirizzo email di esempio valido.", "Enter a valid example e-mail address.");
  const method = {
    id: nextId(draft, provider),
    provider,
    label: provider === "email" ? address : "",
    addedAt: iso(now),
  };
  profile.signIn.push(method);
  return method;
}
export function removeSignInMethod(draft, identityId, methodId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (!profile.signIn.some((m) => m.id === methodId))
    refuse("Metodo d’accesso non disponibile.", "Sign-in method unavailable.");
  if (profile.signIn.length === 1)
    refuse(
      "È l’unico metodo d’accesso: aggiungine un altro prima di rimuoverlo.",
      "It is the only sign-in method: add another before removing it.",
    );
  profile.signIn = profile.signIn.filter((m) => m.id !== methodId);
}
export function linkService(draft, identityId, service, handle, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (!Object.hasOwn(SERVICES, service))
    refuse("Servizio non disponibile.", "Service unavailable.");
  if (profile.linked.some((l) => l.service === service))
    refuse("Il servizio è già collegato.", "The service is already linked.");
  const name = String(handle ?? "")
    .trim()
    .replace(/^@/, "");
  if (!/^[a-z0-9_.]{2,32}$/.test(name))
    refuse(
      "Nome utente di esempio non valido: 2–32 lettere minuscole, cifre, _ o punto.",
      "Invalid example username: 2–32 lowercase letters, digits, _ or dot.",
    );
  profile.linked.push({ id: service, service, handle: name, linkedAt: iso(now) });
}
export function unlinkService(draft, identityId, service, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (!profile.linked.some((l) => l.service === service))
    refuse("Il servizio non è collegato.", "The service is not linked.");
  profile.linked = profile.linked.filter((l) => l.service !== service);
}
// ---------------------------------------------------------------- two-step verification (SV-56)

// Close review 01/10 (Wizards account behind D&D Beyond and Roll20: an authenticator app code
// after the sign-in method, ten single-use recovery codes). Demonstration: the «app» is a
// simulation that shows the code of the moment; no secret leaves this browser and nothing is
// sent anywhere. A real product uses RFC 6238 TOTP on its server.
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const WINDOW_MS = 30000;
function fnv(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
/** The simulated authenticator's six digits for `secret` in the 30-second window of `at`. */
export function demoCode(secret, at = Date.now()) {
  return String(fnv(`${secret}:${Math.floor(at / WINDOW_MS)}`) % 1000000).padStart(6, "0");
}
const codeOk = (secret, code, at) => {
  const typed = String(code ?? "").replace(/\s+/g, "");
  return [0, -WINDOW_MS].some((shift) => demoCode(secret, at + shift) === typed);
};
function randomText(length, alphabet) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}
export function beginTwoFactor(draft, identityId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (profile.twoFactor?.enabled)
    refuse("La verifica in due passaggi è già attiva.", "Two-step verification is already on.");
  profile.twoFactor = {
    secret: randomText(16, BASE32),
    enabled: false,
    enabledAt: null,
    recovery: [],
  };
  return profile.twoFactor.secret;
}
export function confirmTwoFactor(draft, identityId, code, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  const tf = profile.twoFactor;
  if (!tf || tf.enabled) refuse("Avvia prima l’attivazione.", "Start the set-up first.");
  if (!codeOk(tf.secret, code, now))
    refuse(
      "Il codice non corrisponde: scrivi le sei cifre che l’app mostra ora.",
      "The code does not match: type the six digits the app shows now.",
    );
  tf.enabled = true;
  tf.enabledAt = iso(now);
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  tf.recovery = Array.from({ length: 10 }, () => ({
    code: `${randomText(4, alphabet)}-${randomText(4, alphabet)}`,
    used: false,
  }));
  return tf.recovery.map((row) => row.code);
}
export function disableTwoFactor(draft, identityId, code, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  const tf = profile.twoFactor;
  if (!tf?.enabled)
    refuse("La verifica in due passaggi non è attiva.", "Two-step verification is off.");
  if (!codeOk(tf.secret, code, now))
    refuse(
      "Serve il codice dell’app per disattivarla.",
      "The app’s code is needed to turn it off.",
    );
  delete profile.twoFactor;
}
/** Second step of a sign-in: the app's code, or one unused recovery code (spent). */
export function verifySecondStep(draft, identityId, code, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  const tf = profile.twoFactor;
  if (!profile.pendingSecondStep || !tf?.enabled)
    refuse("Nessun accesso in attesa del codice.", "No sign-in is waiting for a code.");
  const typed = String(code ?? "")
    .trim()
    .toLowerCase();
  const recovery = tf.recovery.find((row) => !row.used && row.code === typed);
  if (!recovery && !codeOk(tf.secret, typed, now))
    refuse(
      "Codice non valido: usa le sei cifre dell’app o un codice di recupero non usato.",
      "Invalid code: use the app’s six digits or an unused recovery code.",
    );
  if (recovery) recovery.used = true;
  delete profile.pendingSecondStep;
  profile.session = "account";
  profile.lastSeenAt = iso(now);
  return { recovery: Boolean(recovery), left: tf.recovery.filter((row) => !row.used).length };
}

// ---------------------------------------------------------------- age and consent (SV-28)

// Close review 01/10 (D&D Beyond through k-ID, Roll20's 13/16 limits, StartPlaying 18+): the
// account records an age band, never the birth date. Under the digital-consent age a parent
// must agree before public tables and adult listings; teens never see adult listings. The
// threshold is Italy's 14 years (GDPR art. 8, Codice privacy art. 2-quinquies); the product's
// final policy per country is a legal decision (I-233). Demonstration: no email is sent.
export const AGE_BANDS = Object.freeze(["child", "teen", "adult"]);
export const CONSENT_AGE = 14;
export function ageBand(birthYear, now = Date.now()) {
  const age = new Date(now).getUTCFullYear() - birthYear;
  return age < CONSENT_AGE ? "child" : age < 18 ? "teen" : "adult";
}
export function declareAge(draft, identityId, birthYear, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  const year = Number(birthYear);
  const current = new Date(now).getUTCFullYear();
  if (!Number.isInteger(year) || year < current - 120 || year > current - 3)
    refuse("Scrivi un anno di nascita valido.", "Type a valid birth year.");
  const band = ageBand(year, now);
  profile.age = {
    band,
    birthYear: null,
    consent: band === "child" ? "none" : "granted",
    parent: "",
    at: iso(now),
  };
  return band;
}
export function requestParentConsent(draft, identityId, email, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  if (profile.age?.band !== "child")
    refuse(
      "Il consenso del genitore serve solo sotto i 14 anni.",
      "Parental consent is needed only under 14.",
    );
  const clean = String(email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 120)
    refuse("Scrivi l’email di un genitore.", "Type a parent’s email.");
  profile.age.consent = "pending";
  profile.age.parent = clean.replace(/^(.).*(@.*)$/, "$1…$2");
  profile.age.at = iso(now);
}
/** Demonstration only: the parent's answer, which a real product receives by email. */
export function answerParentConsent(draft, identityId, granted, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  if (profile.age?.consent !== "pending")
    refuse("Nessuna richiesta di consenso in attesa.", "No consent request is pending.");
  profile.age.consent = granted ? "granted" : "none";
  profile.age.at = iso(now);
}
/**
 * What the age policy allows this identity: public tables (listings and joining) and adult
 * (18+) listings. Undeclared ages keep today's behaviour (declared per listing).
 */
export function agePolicy(state, identityId) {
  const age = profileOf(state, identityId).age;
  if (!age) return { declared: false, publicTables: true, adultListings: true, reason: null };
  if (age.band === "adult")
    return { declared: true, publicTables: true, adultListings: true, reason: null };
  if (age.band === "teen")
    return {
      declared: true,
      publicTables: true,
      adultListings: false,
      reason: L(
        "Sotto i 18 anni gli annunci per adulti restano nascosti.",
        "Under 18, adult listings stay hidden.",
      ),
    };
  return {
    declared: true,
    publicTables: age.consent === "granted",
    adultListings: false,
    reason:
      age.consent === "granted"
        ? L(
            "Sotto i 14 anni gli annunci per adulti restano nascosti.",
            "Under 14, adult listings stay hidden.",
          )
        : L(
            "Sotto i 14 anni i tavoli pubblici si aprono dopo il consenso di un genitore (Account › Profilo).",
            "Under 14, public tables open after a parent’s consent (Account › Profile).",
          ),
  };
}

// Signing out and back in (simulated). The last sign-in is the account's, not a
// campaign's.
export function signOut(draft, identityId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  if (profile.session === "signed-out") refuse("Sei già uscito.", "You are already signed out.");
  profile.session = "signed-out";
}
export function signIn(draft, identityId, provider, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  if (profile.session !== "signed-out")
    refuse("Hai già effettuato l’accesso.", "You are already signed in.");
  if (!profile.signIn.some((m) => m.provider === provider))
    refuse(
      `Nessun account con ${PROVIDERS[provider]?.it ?? "questo metodo"} in questa dimostrazione: usa un metodo collegato.`,
      `No account uses ${PROVIDERS[provider]?.en ?? "this method"} in this demonstration: use a linked method.`,
    );
  // SV-56: with two-step verification the sign-in waits for the second step.
  if (profile.twoFactor?.enabled) {
    profile.pendingSecondStep = { provider };
    return { secondStep: true };
  }
  profile.session = "account";
  profile.lastSeenAt = iso(now);
  return { secondStep: false };
}
// IN-10 «Crea un account per salvare»: the trial identity becomes an account with the
// chosen sign-in method; its trial data is kept (the shell then makes it the device data).
export function createAccountFromSandbox(draft, identityId, provider, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  if (profile.session !== "sandbox")
    refuse("Non stai provando senza account.", "You are not in a trial without an account.");
  if (!Object.hasOwn(PROVIDERS, provider))
    refuse("Metodo d’accesso sconosciuto.", "Unknown sign-in method.");
  if (!profile.signIn.some((m) => m.provider === provider))
    profile.signIn.push({ id: provider, provider, label: "", addedAt: iso(now) });
  profile.session = "account";
  profile.lastSeenAt = iso(now);
}
export function setLastSeenSharing(draft, identityId, enabled, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  requireEditable(profile);
  if (profile.privacy.showLastSeen === Boolean(enabled))
    refuse("La scelta è già questa.", "That is already your choice.");
  profile.privacy.showLastSeen = Boolean(enabled);
}

// ---------------------------------------------------------------- deletion

const ownedCharacters = (state, identityId) =>
  Object.values(state.actors ?? {}).filter(
    (a) => a && a.owner === identityId && (a.kind === "character" || a.companion),
  );
// Campaign ids an actor belongs to; legacy sample actors belong to the current one.
const actorCampaigns = (state, actor) =>
  Array.isArray(actor.campaignIds)
    ? actor.campaignIds
    : state.campaign?.id
      ? [state.campaign.id]
      : [];
// The ownership offer this identity has waiting in B13 for a campaign, if any.
function pendingTransfer(state, campaignId, identityId) {
  const transfer = metaOf(state, campaignId)?.transfer;
  return transfer?.status === "pending" && transfer.from === identityId ? transfer : null;
}
// Exact consequences of deleting the account, computed from the actual state (R20-207:
// affected counts first; SVC-144: what is lost is explained before). Every campaign of
// the identity counts, current or parked: the owner hands each active one over through
// B13's transfer (I-177; B13 offers ownership to a co-DM or player of an active campaign)
// or, with nobody to receive it, loses it with the account.
export function deletionConsequences(state, identityId, lang = "it") {
  const profile = profileOf(state, identityId);
  const memberships = membershipsOf(state, identityId);
  const campaigns = memberships.map((row) => {
    const owner = row.role === "owner";
    const candidates = membersOf(state, row.id)
      .filter(
        (m) => m.id !== identityId && ["co-dm", "player"].includes(roleOf(state, row.id, m.id)),
      )
      .map((m) => ({ id: m.id, name: displayNameOf(state, m.id, lang) }));
    const transfer = owner && row.status === "active" && candidates.length > 0;
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status,
      transfer,
      deletedWithAccount: owner && !transfer,
      candidates,
      // An offer already waiting in B13 (made before, or by this deletion request).
      pendingTo: owner ? (pendingTransfer(state, row.id, identityId)?.to ?? null) : null,
    };
  });
  const handedOver = new Set(campaigns.filter((c) => c.transfer).map((c) => c.id));
  const lost = new Set(campaigns.filter((c) => c.deletedWithAccount).map((c) => c.id));
  // A sheet is classified by the campaigns it is still in (not by this identity's current
  // memberships): after the player leaves or is removed, its sheet stays in the campaign.
  const characters = ownedCharacters(state, identityId).map((a) => {
    const ids =
      a.visibility === "private"
        ? []
        : actorCampaigns(state, a).filter((id) => coreCampaign(state, id));
    const kept = ids.filter((id) => !lost.has(id));
    return {
      id: a.id,
      name: textOf(a.name, lang),
      inCampaign: kept.length > 0,
      // Its only campaigns are deleted with the account.
      withCampaign: ids.length > 0 && kept.length === 0,
      // Its campaign changes hands too: the new DM (not this one) can reassign it.
      newDm: kept.some((id) => handedOver.has(id)),
    };
  });
  const entries = (state.campaignContent?.entries ?? []).filter((e) => e.ownerId === identityId);
  const privateNotes = entries.filter((e) => e.access?.mode === "private").length;
  const drafts =
    (state.characterDrafts ?? []).filter((d) => d.owner === identityId && d.status === "active")
      .length +
    (state.campaignContent?.drafts ?? []).filter(
      (d) => d.ownerId === identityId && d.status === "active",
    ).length +
    (state.libraryDrafts ?? []).filter((d) => d.owner === identityId && d.status === "active")
      .length;
  return {
    campaigns,
    characters,
    privateNotes,
    sharedEntries: entries.length - privateNotes,
    drafts,
    homebrew: (state.library ?? []).filter((c) => c.owner === identityId).length,
    signIn: profile.signIn.length,
    methods: profile.signIn.map((m) => m.provider),
    linked: profile.linked.map((l) => SERVICES[l.service].name),
    recoveryDays: RECOVERY_DAYS,
  };
}
export const typedConfirmation = (lang) => TYPED[lang === "en" ? "en" : "it"];
export function requestDeletion(
  draft,
  identityId,
  { typed, acknowledged, transfers = {}, confirmWith, lang = "it", now = Date.now() } = {},
) {
  const profile = mutableProfile(draft, identityId, now);
  if (profile.session !== "account")
    refuse(
      "Solo un account con accesso può essere eliminato.",
      "Only a signed-in account can be deleted.",
    );
  if (profile.deletion)
    refuse("L’eliminazione è già programmata.", "Deletion is already scheduled.");
  const consequences = deletionConsequences(draft, identityId, lang);
  if (acknowledged !== true)
    refuse(
      "Conferma di aver letto le conseguenze.",
      "Confirm that you have read the consequences.",
    );
  const planned = {};
  for (const campaign of consequences.campaigns.filter((c) => c.transfer)) {
    const target = transfers[campaign.id];
    if (!campaign.candidates.some((c) => c.id === target))
      refuse(
        `Scegli a chi trasferire «${campaign.name}» prima di eliminare l’account.`,
        `Choose who receives “${campaign.name}” before deleting the account.`,
      );
    if (campaign.pendingTo && campaign.pendingTo !== target) {
      const waiting = displayNameOf(draft, campaign.pendingTo, lang);
      refuse(
        `«${campaign.name}» ha già una proposta di trasferimento a ${waiting}: scegli ${waiting} o revocala da Campagne.`,
        `“${campaign.name}” already has a transfer offer to ${waiting}: choose ${waiting} or revoke it from Campaigns.`,
      );
    }
    planned[campaign.id] = target;
  }
  // Identity check before an irreversible request (DDB-188): simulated by choosing one
  // of the account's own sign-in methods.
  if (!profile.signIn.some((m) => m.provider === confirmWith))
    refuse(
      "Conferma la tua identità con uno dei tuoi metodi d’accesso.",
      "Confirm your identity with one of your sign-in methods.",
    );
  if (String(typed ?? "").trim() !== typedConfirmation(lang))
    refuse(
      `Per confermare scrivi esattamente ${TYPED.it}.`,
      `To confirm, type exactly ${TYPED.en}.`,
    );
  // Each planned transfer is B13's own ownership offer (Quest Portal VTL-040): the new DM
  // is told in the bell and in Campaigns and accepts or declines it there. An offer that
  // was already waiting is kept as it is; cancelling the deletion revokes only new ones.
  const offers = {};
  for (const [campaignId, to] of Object.entries(planned)) {
    const existing = pendingTransfer(draft, campaignId, identityId);
    if (!existing) proposeTransfer(draft, campaignId, to, identityId, now);
    offers[campaignId] = {
      id: pendingTransfer(draft, campaignId, identityId).id,
      existing: Boolean(existing),
    };
  }
  profile.deletion = {
    requestedAt: iso(now),
    recoverUntil: iso(now + RECOVERY_DAYS * DAY),
    transfers: planned,
    offers,
    confirmedWith: confirmWith,
  };
  return profile.deletion;
}
// Correction within the recovery window. Returns how many ownership offers it revoked.
export function cancelDeletion(draft, identityId, { now = Date.now() } = {}) {
  const profile = mutableProfile(draft, identityId, now);
  if (!profile.deletion) refuse("Nessuna eliminazione da annullare.", "No deletion to cancel.");
  if (Date.parse(profile.deletion.recoverUntil) < now)
    refuse("La finestra di recupero è scaduta.", "The recovery window has ended.");
  let revoked = 0;
  for (const [campaignId, offer] of Object.entries(profile.deletion.offers ?? {})) {
    const pending = pendingTransfer(draft, campaignId, identityId);
    if (offer?.existing || !pending || pending.id !== offer?.id) continue;
    revokeTransfer(draft, campaignId, identityId, now);
    revoked++;
  }
  profile.deletion = null;
  return revoked;
}
// Where each planned transfer stands in B13 (pending, accepted, declined, revoked).
export function transferStatus(state, identityId, campaignId) {
  const offer = profileOf(state, identityId).deletion?.offers?.[campaignId];
  const transfer = metaOf(state, campaignId)?.transfer;
  return offer && transfer?.id === offer.id ? transfer.status : null;
}

// ---------------------------------------------------------------- personal export

// One own sheet as its owner sees it: B21's durable sheet fields (never the raw actor)
// plus the conditions projected for this identity by the conditions area, so an
// application or origin the DM keeps private never enters the file.
function ownSheet(state, actor, identityId) {
  let conditions = null;
  try {
    const overview = getConditionOverview(state, actor.id, identityId);
    conditions = {
      instances: overview.instances.map(({ permissions, droppedItemIds, ...rest }) => rest),
      exhaustion: overview.exhaustion,
      deathSaves: overview.deathSaves,
      vitality: overview.vitality,
    };
  } catch {
    conditions = null; // not readable by this identity now (e.g. it left the campaign)
  }
  return {
    id: actor.id,
    name: clone(actor.name),
    kind: actor.companion ? "companion" : actor.kind,
    visibility: actor.visibility ?? "shared",
    campaignIds: actorCampaigns(state, actor),
    sheet: sheetData(actor),
    conditions,
    personalPlans:
      actor.personalPlans?.[identityId] !== undefined
        ? clone(actor.personalPlans[identityId])
        : null,
  };
}
// Only this identity's own data, built by whitelisting (never by filtering others' data
// out of a copy): profile, own sheets as projected for it, own drafts, entries and notes
// it owns, own Library content, personal settings and own activity.
export function buildPersonalExport(state, identityId, { now = Date.now(), lang = "it" } = {}) {
  const profile = profileOf(state, identityId);
  const plansOnOtherSheets = Object.values(state.actors ?? {})
    .filter((a) => a?.owner !== identityId && a?.personalPlans?.[identityId] !== undefined)
    .map((a) => ({ actorId: a.id, plans: clone(a.personalPlans[identityId]) }));
  const entries = (state.campaignContent?.entries ?? [])
    .filter((e) => e.ownerId === identityId)
    .map((e) => {
      const readable = getCampaignEntry(state, e.id, identityId);
      return {
        id: readable.id,
        kind: readable.kind,
        campaignId: readable.campaignId,
        access: readable.access ?? null,
        createdAt: readable.createdAt,
        updatedAt: readable.updatedAt,
        data: readable.data,
        history: readable.history.filter((h) => h.authorId === identityId),
      };
    });
  return {
    format: "d20-studio-personal-data",
    version: 2,
    exportedAt: iso(now),
    notice:
      lang === "en"
        ? "Demonstration export: only your own data from this browser, as you can see it."
        : "Esportazione di dimostrazione: solo i tuoi dati presenti in questo browser, come li vedi tu.",
    identity: identityId,
    account: {
      displayName: displayNameOf(state, identityId, lang),
      session: profile.session,
      avatars: profile.avatars,
      activeAvatarId: profile.activeAvatarId,
      nameHistory: profile.nameHistory.map((h) => ({
        displayName: h.displayName ?? textOf(h.memberName, lang),
        changedAt: h.changedAt,
      })),
      signInMethods: profile.signIn.map((m) => ({
        provider: m.provider,
        label: m.label,
        addedAt: m.addedAt,
      })),
      linkedServices: profile.linked,
      privacy: profile.privacy,
      lastSeenAt: profile.lastSeenAt,
      deletion: profile.deletion,
    },
    memberships: membershipsOf(state, identityId).map(({ id, name, role, status }) => ({
      campaignId: id,
      name,
      role,
      status,
    })),
    characters: ownedCharacters(state, identityId).map((a) => ownSheet(state, a, identityId)),
    plansOnOtherSheets,
    characterDrafts: (state.characterDrafts ?? []).filter((d) => d.owner === identityId).map(clone),
    entries,
    entryDrafts: (state.campaignContent?.drafts ?? [])
      .filter((d) => d.ownerId === identityId && d.status === "active")
      .map(clone),
    library: (state.library ?? []).filter((c) => c.owner === identityId).map(clone),
    libraryDrafts: (state.libraryDrafts ?? [])
      .filter((d) => d.owner === identityId && d.status === "active")
      .map(clone),
    libraryCollection: clone(state.libraryCollections?.[identityId] ?? []),
    personalSettings: clone(state.ext?.["core-settings"]?.personal?.[identityId] ?? {}),
    // The personal safety profile of B27 (lines, veils, content filter): it is this
    // identity's own and is the same in every campaign.
    safety: safetyProfile(state, identityId),
    activity: (state.log ?? [])
      .filter((l) => l.controller === identityId)
      .map((l) => ({ time: l.time, label: l.label, kind: l.kind, visibility: l.visibility })),
    // Not yet included: data the identity wrote in other areas' own records (chat
    // messages, handouts, loot parcels, scenes and NPCs it prepared).
    notIncluded: ["chat", "handouts", "loot", "scenes", "npcs"],
  };
}
function safetyProfile(state, identityId) {
  const profile = state.ext?.safety?.profiles?.[identityId];
  if (!isObject(profile)) return null;
  return {
    lines: clone(Array.isArray(profile.lines) ? profile.lines : []),
    veils: clone(Array.isArray(profile.veils) ? profile.veils : []),
    filter: clone(isObject(profile.filter) ? profile.filter : { enabled: false, extra: [] }),
  };
}
export function exportSummary(state, identityId) {
  const data = buildPersonalExport(state, identityId);
  return {
    avatars: data.account.avatars.length,
    characters: data.characters.map((c) => textOf(c.name)),
    entries: data.entries.length,
    notes: data.entries.filter((e) => e.kind === "note").length,
    drafts: data.characterDrafts.length + data.entryDrafts.length + data.libraryDrafts.length,
    library: data.library.length,
    safety: data.safety ? data.safety.lines.length + data.safety.veils.length : 0,
    activity: data.activity.length,
  };
}
export const exportFileName = (identityId, now = Date.now(), lang = "it") =>
  `d20-studio-${lang === "en" ? "personal-data" : "dati-personali"}-${identityId}-${iso(now).slice(0, 10)}.json`;

// ---------------------------------------------------------------- UI

const TABS = [
  ["profile", "Profilo", "Profile"],
  ["access", "Accesso e servizi", "Sign-in and services"],
  ["privacy", "Privacy", "Privacy"],
  ["data", "I miei dati", "My data"],
];
// `signingIn` is true only while this area commits a sign-in: the access gate lets that
// one change through, every other one waits until the identity has signed in.
const ui = {
  pendingName: null,
  focus: null,
  uploadError: null,
  uploadBusy: false,
  signingIn: false,
};
export function resetAccountView() {
  ui.pendingName = null;
  ui.focus = null;
  ui.uploadError = null;
  ui.uploadBusy = false;
  ui.signingIn = false;
}
const when = (ctx, value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
};
const day = (ctx, value) => {
  try {
    return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
      dateStyle: "long",
    }).format(new Date(value));
  } catch {
    return "";
  }
};
// Core roles ("dm", "player") and B13 roles ("owner", "co-dm", "observer").
const roleName = (ctx, role) =>
  role === "dm" || role === "owner"
    ? "DM"
    : role === "co-dm"
      ? "Co-DM"
      : role === "observer"
        ? ctx.t("Osservatore", "Observer")
        : ctx.t("Giocatore", "Player");
// The role next to a name, left out when it is the name itself ("DM", "Giocatore").
const roleBeside = (ctx, role, name) => {
  const text = roleName(ctx, role);
  return nameKey(text) === nameKey(name) ? "" : text;
};
const errorText = (ctx, error) =>
  error?.it && error?.en
    ? ctx.label({ it: error.it, en: error.en })
    : String(error?.message ?? error);
const ownsCampaign = (ctx) =>
  membershipsOf(ctx.state, ctx.role).some((c) => c.role === "owner" && c.status !== "deleted");
// A commit made from a dialog renders while the modal is still open (the page is inert),
// so the focus target is focused again once the dialog closes.
function refocusAfterDialog(selector) {
  if (!selector || typeof document === "undefined") return;
  const dialog = document.querySelector("#dialog");
  if (!dialog?.open) return;
  dialog.addEventListener("close", () => document.querySelector(`#content ${selector}`)?.focus(), {
    once: true,
  });
}
// Account commands: shared changes need the network (published name, sign-in methods,
// services, deletion); signing out is this browser's own change. Every audit label stays
// private to the owner: like Roll20 and Discord, a profile change is not announced in
// the session log or chat; others simply see the new name and avatar.
function run(
  ctx,
  title,
  mutate,
  { published = false, local = false, focus = null, signIn = false } = {},
) {
  ui.focus = focus;
  ui.signingIn = signIn;
  try {
    const result = ctx.commit(
      title,
      (draft) => mutate(draft),
      local
        ? { local: true, visibility: "private", undoable: false }
        : { visibility: "private", undoable: false },
    );
    // Member lists and chat of other areas can refresh the published name and avatar.
    if (published) ctx.registry?.emit?.("account:profile-changed", { identityId: ctx.role });
    refocusAfterDialog(focus);
    return result;
  } catch (error) {
    ui.focus = null;
    ctx.toast(errorText(ctx, error), true);
    return null;
  } finally {
    ui.signingIn = false;
  }
}
// Signing in or out needs the provider: offline, both are refused with the reason (a
// sign-out offline would leave no way back in until the network returns).
function refuseOffline(ctx, it, en) {
  if (!ctx.offline) return false;
  ctx.toast(ctx.t(it, en), true);
  return true;
}

function statusBanner(ctx, profile) {
  // On "I miei dati" the pending-deletion panel itself carries the details and the cancel.
  if (profile.deletion && ctx.view.tab !== "data")
    return `<section class="account-banner is-danger" role="status" data-account-banner="deletion"><h2>${ctx.t("Eliminazione programmata", "Deletion scheduled")}</h2><p>${ctx.t(`L’account sarà eliminato il ${day(ctx, profile.deletion.recoverUntil)}. Fino ad allora puoi annullare; dopo, l’eliminazione è definitiva.`, `The account will be deleted on ${day(ctx, profile.deletion.recoverUntil)}. Until then you can cancel; afterwards the deletion is permanent.`)} <span id="account-locked-why">${ctx.t("Finché è programmata il profilo non si modifica: premi «Annulla eliminazione» per cambiarlo.", "While it is scheduled the profile cannot change: press “Cancel deletion” to change it.")}</span></p><div class="toolbar"><button type="button" class="button primary" data-account-cancel-deletion>${ctx.t("Annulla eliminazione", "Cancel deletion")}</button><button type="button" class="button" data-account-go="data">${ctx.t("Vedi dettagli", "See details")}</button></div></section>`;
  return "";
}
function tabsHTML(ctx, current) {
  return `<nav class="tabs account-tabs" aria-label="${ctx.t("Sezioni dell’account", "Account sections")}">${TABS.map(
    ([id, it, en]) =>
      `<button type="button" data-account-tab="${id}" class="${id === current ? "active" : ""}"${id === current ? ' aria-current="page"' : ""}>${ctx.t(it, en)}</button>`,
  ).join("")}</nav>`;
}
// The same name, avatar and role the campaign member list (B13) and the chat (B17) draw
// for this identity: both read publishedAvatar and the published name.
function previewHTML(ctx) {
  const shown = memberDisplay(ctx.state, ctx.role, "__other__", ctx.lang);
  const name = shown?.name ?? displayNameOf(ctx.state, ctx.role, ctx.lang);
  const avatar = shown?.avatar ?? publishedAvatar(ctx.state, ctx.role);
  return `<section class="panel account-preview" aria-labelledby="account-preview-title"><h2 id="account-preview-title">${ctx.t("Come ti vedono gli altri", "How others see you")}</h2><p class="muted">${ctx.t("Lo stesso nome e avatar che gli altri vedono nell’elenco dei membri della campagna e in chat.", "The same name and avatar others see in the campaign member list and in chat.")}</p><div class="account-member-row">${avatarHTML(avatar, name, { esc: ctx.esc })}<span><strong data-account-preview-name>${ctx.esc(name)}</strong><small>${ctx.esc([roleBeside(ctx, shown?.role ?? ctx.role, name), ctx.state.campaign?.name].filter(Boolean).join(" · "))}</small></span></div><div class="account-chat-line">${avatarHTML(avatar, name, { size: "sm", esc: ctx.esc })}<p><strong>${ctx.esc(name)}</strong> ${ctx.t("Ci sono, arrivo al ponte.", "I’m here, heading to the bridge.")}</p></div></section>`;
}
// SV-37 (Roll20 errors that name cause and fix): a control locked by a scheduled deletion
// points at the banner's sentence that says why and how to undo it.
const LOCKED = ' disabled aria-describedby="account-locked-why"';
function profileTab(ctx, profile) {
  const shownName = displayNameOf(ctx.state, ctx.role, ctx.lang);
  const value = ui.pendingName?.identity === ctx.role ? ui.pendingName.value : shownName;
  const locked = profile.deletion ? LOCKED : "";
  const history = profile.nameHistory
    .slice()
    .reverse()
    .map(
      (h) =>
        `<li class="item-row"><span>${ctx.esc(h.displayName ?? textOf(h.memberName, ctx.lang) ?? "")}<small>${ctx.t("Fino al", "Until")} ${ctx.esc(when(ctx, h.changedAt))}</small></span><button type="button" class="button quiet" data-account-restore-name="${ctx.esc(h.id)}" aria-label="${ctx.esc(ctx.t("Ripristina il nome ", "Restore the name ") + (h.displayName ?? textOf(h.memberName, ctx.lang)))}"${locked}>${ctx.t("Ripristina", "Restore")}</button></li>`,
    )
    .join("");
  const avatars = profile.avatars
    .map((a) => {
      const active = a.id === profile.activeAvatarId;
      const kind =
        a.kind === "image"
          ? ctx.t("Immagine caricata", "Uploaded image")
          : a.kind === "initials"
            ? `${ctx.t("Iniziali", "Initials")} · ${ctx.label(COLORS[a.color])}`
            : `${ctx.label(EMBLEMS[a.glyph])} · ${ctx.label(COLORS[a.color])}`;
      return `<li class="account-avatar-item${active ? " is-active" : ""}" data-account-avatar="${ctx.esc(a.id)}">${avatarHTML(a, shownName, { size: "lg", esc: ctx.esc })}<span class="account-avatar-meta"><strong>${ctx.esc(kind)}</strong>${active ? `<span class="badge">${ctx.t("In uso", "In use")}</span>` : ""}${a.id === "initials" ? `<small>${ctx.t("Avatar di riserva", "Fallback avatar")}</small>` : ""}</span><span class="account-avatar-actions">${active ? "" : `<button type="button" class="button" data-account-use-avatar="${ctx.esc(a.id)}" aria-label="${ctx.esc(ctx.t("Usa avatar: ", "Use avatar: ") + kind)}"${locked}>${ctx.t("Usa", "Use")}</button>`}${a.id === "initials" ? "" : `<button type="button" class="button quiet danger-text" data-account-remove-avatar="${ctx.esc(a.id)}" aria-label="${ctx.esc(ctx.t("Elimina avatar: ", "Delete avatar: ") + kind)}"${locked}>${ctx.t("Elimina", "Delete")}</button>`}</span></li>`;
    })
    .join("");
  const full = profile.avatars.length >= MAX_AVATARS;
  const removed = profile.removedAvatar
    ? `<p class="account-undo" role="status">${ctx.t("Avatar eliminato.", "Avatar deleted.")} <button type="button" class="button quiet" data-account-restore-avatar${locked}>${ctx.t("Ripristina", "Restore")}</button></p>`
    : "";
  return `<div class="account-grid"><section class="panel" aria-labelledby="account-name-title"><h2 id="account-name-title">${ctx.t("Nome visualizzato", "Display name")}</h2><form data-account-name-form><label class="field">${ctx.t("Nome che vedono i membri", "Name members see")}<input name="displayName" data-account-name maxlength="32" autocomplete="nickname" value="${ctx.esc(value)}"${locked}></label><p class="muted">${ctx.t("Compare nell’elenco dei membri, nel diario, nelle sessioni e in chat di tutte le tue campagne. Il nome del personaggio non cambia.", "It appears in the member list, journal, sessions and chat of all your campaigns. Your character’s name does not change.")}</p><p class="muted">${ctx.t("Da 2 a 32 caratteri; non un ruolo (DM, GM, Master) né il nome di un altro membro delle tue campagne.", "2 to 32 characters; not a role (DM, GM, Master) nor the name of another member of your campaigns.")}</p><button type="submit" class="button primary"${locked}>${ctx.t("Salva nome", "Save name")}</button></form>${history ? `<h3>${ctx.t("Nomi precedenti", "Previous names")}</h3><ul class="item-list account-history">${history}</ul>` : ""}</section>
  <section class="panel" aria-labelledby="account-avatar-title"><h2 id="account-avatar-title">${ctx.t("Avatar", "Avatars")}</h2><p class="muted">${ctx.t(`Tieni fino a ${MAX_AVATARS} avatar e scegli quello da mostrare. Le iniziali restano come riserva.`, `Keep up to ${MAX_AVATARS} avatars and choose the one to show. Initials remain as the fallback.`)}</p><ul class="account-avatars">${avatars}</ul>${removed}<div class="toolbar"><label class="button account-upload${full || locked ? " is-disabled" : ""}">${ctx.t("Carica immagine", "Upload image")}<input type="file" data-account-upload accept="image/png,image/jpeg,image/webp,image/gif"${locked || (full ? ' disabled aria-describedby="account-avatars-why"' : "")}></label><button type="button" class="button" data-account-emblem${locked || (full ? ' disabled aria-describedby="account-avatars-why"' : "")}>${ctx.t("Crea emblema", "Create emblem")}</button></div><p class="muted" id="account-avatars-why">${full ? ctx.t(`Hai ${MAX_AVATARS} avatar: eliminane uno per aggiungerne altri.`, `You have ${MAX_AVATARS} avatars: delete one to add more.`) : ctx.t("PNG, JPEG, WebP o GIF fino a 2 MB, ritagliata al centro.", "PNG, JPEG, WebP or GIF up to 2 MB, cropped to the centre.")}</p>${ui.uploadBusy ? `<p role="status">${ctx.t("Preparazione dell’immagine…", "Preparing the image…")}</p>` : ""}${ui.uploadError ? `<p class="error" role="alert" data-account-upload-error>${ctx.esc(ui.uploadError)}</p>` : ""}</section>
  ${previewHTML(ctx)}${agePanel(ctx, profile)}</div>`;
}
/** SV-28: the age band and, under 14, the parent's consent (k-ID, Roll20). */
function agePanel(ctx, profile) {
  const age = profile.age;
  const locked = profile.deletion ? LOCKED : "";
  const bandName = {
    child: ctx.t("sotto i 14 anni", "under 14"),
    teen: ctx.t("tra 14 e 17 anni", "14 to 17"),
    adult: ctx.t("maggiorenne", "adult"),
  };
  let body;
  if (!age)
    body = `<form data-account-age-form><label class="field">${ctx.t("Anno di nascita", "Birth year")}<input name="year" type="number" inputmode="numeric" min="1900" max="2030" step="1" required${locked}></label><p class="muted">${ctx.t("Si conserva solo la fascia d’età, non l’anno. Sotto i 14 anni serve il consenso di un genitore per i tavoli pubblici; sotto i 18 gli annunci per adulti restano nascosti.", "Only the age band is kept, not the year. Under 14 a parent’s consent is needed for public tables; under 18 adult listings stay hidden.")}</p><button type="submit" class="button"${locked}>${ctx.t("Salva la fascia d’età", "Save the age band")}</button></form>`;
  else if (age.band !== "child")
    body = `<p>${ctx.t("Fascia d’età", "Age band")}: <strong data-account-age-band>${ctx.esc(bandName[age.band])}</strong>.</p>${age.band === "teen" ? `<p class="muted">${ctx.t("Gli annunci per adulti (18+) dei tavoli pubblici restano nascosti.", "Adult (18+) public table listings stay hidden.")}</p>` : ""}`;
  else
    body = `<p>${ctx.t("Fascia d’età", "Age band")}: <strong data-account-age-band>${ctx.esc(bandName.child)}</strong> · ${ctx.t("consenso del genitore", "parent’s consent")}: <strong data-account-consent>${age.consent === "granted" ? ctx.t("dato", "given") : age.consent === "pending" ? ctx.t("in attesa", "pending") : ctx.t("non ancora chiesto", "not asked yet")}</strong></p>${
      age.consent === "none"
        ? `<form data-account-consent-form><label class="field">${ctx.t("Email di un genitore o tutore", "A parent’s or guardian’s email")}<input name="email" type="email" autocomplete="off" required${locked}></label><button type="submit" class="button"${locked}>${ctx.t("Chiedi il consenso", "Ask for consent")}</button></form>`
        : age.consent === "pending"
          ? `<p class="muted">${ctx.t(`Richiesta inviata a ${age.parent} (simulazione: nessuna email parte).`, `Request sent to ${age.parent} (simulation: no email is sent).`)}</p><div class="toolbar"><button type="button" class="button" data-account-consent-answer="yes">${ctx.t("Simula: il genitore acconsente", "Simulate: the parent agrees")}</button><button type="button" class="button quiet" data-account-consent-answer="no">${ctx.t("Simula: il genitore rifiuta", "Simulate: the parent declines")}</button></div>`
          : `<p class="muted">${ctx.t("I tavoli pubblici sono aperti; gli annunci per adulti restano nascosti.", "Public tables are open; adult listings stay hidden.")}</p>`
    }`;
  return `<section class="panel" aria-labelledby="account-age-title" data-account-age><h2 id="account-age-title">${ctx.t("Età e consenso", "Age and consent")}</h2>${body}</section>`;
}
/** SV-56: the two-step verification panel of «Accesso e servizi». */
function twoFactorPanel(ctx, profile) {
  const tf = profile.twoFactor;
  const locked = profile.deletion ? LOCKED : "";
  const left = tf?.enabled ? tf.recovery.filter((row) => !row.used).length : 0;
  return `<section class="panel" aria-labelledby="account-2fa-title" data-account-2fa><h2 id="account-2fa-title">${ctx.t("Verifica in due passaggi", "Two-step verification")}</h2><p class="muted">${ctx.t("Dopo il metodo d’accesso, chiede il codice a sei cifre di un’app di autenticazione. Dimostrazione: l’app è simulata qui sotto.", "After the sign-in method, it asks for the six-digit code of an authenticator app. Demonstration: the app is simulated below.")}</p>${
    tf?.enabled
      ? `<p><span class="badge" data-account-2fa-state>${ctx.t("Attiva", "On")}</span> ${ctx.t("dal", "since")} ${ctx.esc(day(ctx, tf.enabledAt))} · ${ctx.t("codici di recupero rimasti", "recovery codes left")}: <strong>${left}</strong>/10</p><p class="muted" data-account-2fa-app>${ctx.t("App di autenticazione (simulata)", "Authenticator app (simulated)")}: <strong>${demoCode(tf.secret)}</strong></p><button type="button" class="button quiet" data-account-2fa-off${locked}>${ctx.t("Disattiva…", "Turn off…")}</button>`
      : `<p><span class="badge" data-account-2fa-state>${ctx.t("Non attiva", "Off")}</span></p><button type="button" class="button" data-account-2fa-on${locked}>${ctx.t("Attiva la verifica in due passaggi…", "Turn on two-step verification…")}</button>`
  }</section>`;
}
function accessTab(ctx, profile) {
  const locked = profile.deletion ? LOCKED : "";
  const only = profile.signIn.length === 1;
  const methods = profile.signIn
    .map(
      (m) =>
        `<li class="item-row" data-account-method="${ctx.esc(m.provider)}"><span><strong>${ctx.esc(ctx.label(PROVIDERS[m.provider]))}</strong><small>${m.label ? ctx.esc(maskedLabel(m)) + " · " : ""}${ctx.t("aggiunto il", "added on")} ${ctx.esc(day(ctx, m.addedAt))}</small></span><button type="button" class="button quiet" data-account-remove-method="${ctx.esc(m.id)}" aria-label="${ctx.esc(ctx.t("Rimuovi ", "Remove ") + ctx.label(PROVIDERS[m.provider]))}"${locked || (only ? ' disabled aria-describedby="account-only-why"' : "")}>${ctx.t("Rimuovi", "Remove")}</button></li>`,
    )
    .join("");
  const addable = Object.keys(PROVIDERS).filter(
    (p) => !profile.signIn.some((m) => m.provider === p),
  );
  const services = Object.entries(SERVICES)
    .map(([id, service]) => {
      const link = profile.linked.find((l) => l.service === id);
      return `<li class="item-row" data-account-service="${id}"><span><strong>${ctx.esc(service.name)}</strong><small>${link ? `${ctx.t("Collegato come", "Linked as")} @${ctx.esc(link.handle)} · ${ctx.esc(day(ctx, link.linkedAt))}` : ctx.t("Non collegato", "Not linked")}</small><small>${ctx.esc(ctx.label(service.purpose))} ${ctx.t("Non serve per accedere.", "It is not used to sign in.")}</small></span>${link ? `<button type="button" class="button quiet" data-account-unlink="${id}" aria-label="${ctx.t("Scollega", "Unlink")} ${ctx.esc(service.name)}"${locked}>${ctx.t("Scollega", "Unlink")}</button>` : `<button type="button" class="button" data-account-link="${id}" aria-label="${ctx.t("Collega", "Link")} ${ctx.esc(service.name)}"${locked}>${ctx.t("Collega", "Link")}</button>`}</li>`;
    })
    .join("");
  return `<div class="account-grid"><section class="panel" aria-labelledby="account-methods-title"><h2 id="account-methods-title">${ctx.t("Metodi d’accesso", "Sign-in methods")}</h2><p class="muted">${ctx.t("Servono per entrare nell’account. Dimostrazione: nessuna autenticazione reale e nessun fornitore contattato.", "They let you into the account. Demonstration: no real authentication and no provider is contacted.")}</p><ul class="item-list">${methods}</ul>${only ? `<p class="account-note" id="account-only-why">${ctx.t("È l’unico metodo d’accesso: aggiungine un altro prima di rimuoverlo.", "It is the only sign-in method: add another before removing it.")}</p>` : ""}${addable.length ? `<div class="toolbar account-add">${addable.map((p) => `<button type="button" class="button" data-account-add-method="${p}"${locked}>${ctx.t("Aggiungi", "Add")} ${ctx.esc(ctx.label(PROVIDERS[p]))}</button>`).join("")}</div>` : ""}</section>
  ${twoFactorPanel(ctx, profile)}
  <section class="panel" aria-labelledby="account-services-title"><h2 id="account-services-title">${ctx.t("Servizi collegati", "Linked services")}</h2><p class="muted">${ctx.t("Un servizio collegato non è un metodo d’accesso: non puoi entrare con Discord.", "A linked service is not a sign-in method: you cannot sign in with Discord.")}</p><ul class="item-list">${services}</ul></section>
  <section class="panel" aria-labelledby="account-session-title"><h2 id="account-session-title">${ctx.t("Questo browser", "This browser")}</h2><p>${ctx.t("Hai effettuato l’accesso come", "Signed in as")} <strong>${ctx.esc(displayNameOf(ctx.state, ctx.role, ctx.lang))}</strong>.</p><p>${ctx.t("Ultimo accesso all’account (lo vedi solo tu)", "Last sign-in to the account (only you see it)")}: <strong data-account-own-sign-in>${ctx.esc(when(ctx, profile.lastSeenAt))}</strong>.</p><p class="muted">${ctx.t("Per uscire usa «Esci» in cima alla pagina o nel menu dell’account. Finché non accedi di nuovo, questo browser mostra solo la schermata d’accesso: pagine, ricerca, notifiche e comandi restano chiusi; restano lingua e preferenze del dispositivo.", "To sign out use “Sign out” at the top of the page or in the account menu. Until you sign in again, this browser shows only the sign-in screen: pages, search, notifications and commands stay closed; language and device preferences remain.")}</p></section></div>`;
}
function privacyTab(ctx, profile) {
  const members = listMemberDisplays(ctx.state, ctx.role, ctx.lang);
  const rows = members
    .map(
      (m) =>
        `<li class="account-member-row" data-account-member="${ctx.esc(m.id)}">${avatarHTML(m.avatar, m.name, { esc: ctx.esc })}<span><strong>${ctx.esc(m.name)}</strong>${m.self ? ` <span class="badge">${ctx.t("Tu", "You")}</span>` : ""}<small>${[
          ctx.esc(roleBeside(ctx, m.role, m.name)),
          m.lastSeenAt
            ? `<span data-account-last-seen>${ctx.t("Ultimo accesso", "Last access")}: ${ctx.esc(when(ctx, m.lastSeenAt))}</span>`
            : m.self
              ? ""
              : ctx.t("Ultimo accesso non condiviso", "Last access not shared"),
          m.self
            ? m.sharesLastSeen
              ? ctx.t("gli altri lo vedono", "others see it")
              : ctx.t("solo tu lo vedi", "only you see it")
            : "",
        ]
          .filter(Boolean)
          .join(" · ")}</small></span></li>`,
    )
    .join("");
  const own = members.find((m) => m.self)?.lastSeenAt ?? null;
  return `<div class="account-grid"><section class="panel" aria-labelledby="account-lastseen-title"><h2 id="account-lastseen-title">${ctx.t("Ultimo accesso", "Last access")}</h2><label class="check-field"><input type="checkbox" data-account-lastseen ${profile.privacy.showLastSeen ? "checked" : ""}${profile.deletion ? LOCKED : ""}> ${ctx.t("Mostra il mio ultimo accesso ai membri delle mie campagne", "Show my last access to members of my campaigns")}</label><p class="muted">${ctx.t("Disattivato finché non lo scegli. Se lo attivi, i membri di ogni campagna vedono solo quando sei entrato l’ultima volta in quella campagna, come nell’elenco dei membri.", "Off until you choose it. When on, the members of each campaign see only when you last entered that campaign, as in the member list.")}</p>${own ? `<p>${ctx.t("Il tuo ultimo accesso a questa campagna", "Your last access to this campaign")}: <strong>${ctx.esc(when(ctx, own))}</strong></p>` : ""}</section>
  <section class="panel" aria-labelledby="account-members-title"><h2 id="account-members-title">${members.length ? ctx.t(`Cosa vedono i membri di «${ctx.state.campaign.name}»`, `What members of “${ctx.state.campaign.name}” see`) : ctx.t("Membri", "Members")}</h2>${members.length ? `<ul class="account-members">${rows}</ul>` : `<p class="muted">${ctx.t("Non sei membro della campagna in corso.", "You are not a member of the current campaign.")}</p>`}</section>
${safetyPanel(ctx)}
  <section class="panel" aria-labelledby="account-private-title"><h2 id="account-private-title">${ctx.t("Sempre privati", "Always private")}</h2><ul class="account-list"><li>${ctx.t("Appunti «Solo io» e bozze: nemmeno il DM li legge.", "“Only me” notes and drafts: not even the DM reads them.")}</li><li>${ctx.t("Schede personali non collegate a una campagna.", "Personal sheets not connected to a campaign.")}</li><li>${ctx.t("Metodi d’accesso, servizi collegati, ultimo accesso all’account ed eventuale eliminazione dell’account.", "Sign-in methods, linked services, your last sign-in to the account and any account deletion.")}</li></ul></section></div>`;
}
// Alchemy keeps table safety in the profile (Profile → Safety, SVC-073): a way to the
// personal safety profile of B27 when that area is loaded.
function safetyPanel(ctx) {
  if (!ctx.registry?.get?.("route", "safety-profile", ctx)) return "";
  return `<section class="panel" aria-labelledby="account-safety-title"><h2 id="account-safety-title">${ctx.t("Sicurezza al tavolo", "Table safety")}</h2><p class="muted">${ctx.t("Le tue linee e i tuoi veli valgono in tutte le tue campagne; «Esporta i miei dati» li include.", "Your lines and veils apply in all your campaigns; “Export my data” includes them.")}</p><button type="button" class="button" data-account-safety>${ctx.t("Apri il mio profilo di sicurezza", "Open my safety profile")}</button></section>`;
}
function consequencesHTML(ctx, c) {
  const list = [];
  for (const campaign of c.campaigns)
    list.push(
      campaign.transfer
        ? ctx.t(
            `«${campaign.name}»: la guidi come DM; la proprietà, con PNG, scene e preparazione, viene proposta al membro che scegli, che la accetta o la rifiuta da Campagne.`,
            `“${campaign.name}”: you run it as DM; ownership, with NPCs, scenes and preparation, is offered to the member you choose, who accepts or declines it from Campaigns.`,
          )
        : campaign.deletedWithAccount && campaign.status === "deleted"
          ? ctx.t(
              `«${campaign.name}» (già eliminata): non potrai più ripristinarla.`,
              `“${campaign.name}” (already deleted): you will no longer be able to restore it.`,
            )
          : campaign.deletedWithAccount && campaign.status === "archived"
            ? ctx.t(
                `«${campaign.name}» (archiviata): viene eliminata con l’account. Per affidarla a un altro membro ripristinala prima da Campagne.`,
                `“${campaign.name}” (archived): it is deleted with the account. To hand it to another member, restore it first from Campaigns.`,
              )
            : campaign.deletedWithAccount
              ? ctx.t(
                  `«${campaign.name}»: nessun altro membro a cui trasferirla, viene eliminata con l’account.`,
                  `“${campaign.name}”: no other member to receive it, it is deleted with the account.`,
                )
              : ctx.t(
                  `«${campaign.name}»: esci dalla campagna; il gruppo continua senza di te.`,
                  `“${campaign.name}”: you leave the campaign; the group continues without you.`,
                ),
    );
  for (const ch of c.characters)
    list.push(
      ch.withCampaign
        ? ctx.t(
            `${ch.name}: eliminata con la sua campagna.`,
            `${ch.name}: deleted with its campaign.`,
          )
        : !ch.inCampaign
          ? ctx.t(`${ch.name}: scheda personale eliminata.`, `${ch.name}: personal sheet deleted.`)
          : ch.newDm
            ? ctx.t(
                `${ch.name}: resta nella campagna senza proprietario; il nuovo DM può riassegnarla.`,
                `${ch.name}: stays in the campaign without an owner; the new DM can reassign it.`,
              )
            : ctx.t(
                `${ch.name}: resta nella campagna senza proprietario; il DM può riassegnarla.`,
                `${ch.name}: stays in the campaign without an owner; the DM can reassign it.`,
              ),
    );
  // Counts in the viewer's language; zero counts are not listed (R20-207: affected counts).
  const one = (n, itOne, itMany, enOne, enMany) =>
    n ? [ctx.t(n === 1 ? itOne : itMany, n === 1 ? enOne : enMany)] : [];
  list.push(
    ...one(
      c.privateNotes,
      "1 appunto «Solo io»: eliminato; nessuno potrà recuperarlo.",
      `${c.privateNotes} appunti «Solo io»: eliminati; nessuno potrà recuperarli.`,
      "1 “Only me” note: deleted; nobody can recover it.",
      `${c.privateNotes} “Only me” notes: deleted; nobody can recover them.`,
    ),
    ...one(
      c.sharedEntries,
      "1 voce condivisa scritta da te: resta alla campagna con autore «Account eliminato».",
      `${c.sharedEntries} voci condivise scritte da te: restano alla campagna con autore «Account eliminato».`,
      "1 shared entry you wrote: stays with the campaign, author “Deleted account”.",
      `${c.sharedEntries} shared entries you wrote: stay with the campaign, author “Deleted account”.`,
    ),
    ...one(
      c.drafts,
      "1 bozza: eliminata.",
      `${c.drafts} bozze: eliminate.`,
      "1 draft: deleted.",
      `${c.drafts} drafts: deleted.`,
    ),
    ...one(
      c.homebrew,
      "1 contenuto della Biblioteca creato da te: eliminato; le copie già aggiunte alle schede restano.",
      `${c.homebrew} contenuti della Biblioteca creati da te: eliminati; le copie già aggiunte alle schede restano.`,
      "1 Library item you created: deleted; copies already added to sheets remain.",
      `${c.homebrew} Library items you created: deleted; copies already added to sheets remain.`,
    ),
    ctx.t(
      `${c.signIn === 1 ? "1 metodo d’accesso rimosso" : `${c.signIn} metodi d’accesso rimossi`}${c.linked.length ? `; scollegato ${c.linked.join(", ")}` : ""}.`,
      `${c.signIn === 1 ? "1 sign-in method removed" : `${c.signIn} sign-in methods removed`}${c.linked.length ? `; ${c.linked.join(", ")} unlinked` : ""}.`,
    ),
    ctx.t(
      "Nessun contenuto acquistato in questa dimostrazione: in un servizio reale i contenuti legati all’account andrebbero persi.",
      "No purchased content in this demonstration: in a real service, content tied to the account would be lost.",
    ),
  );
  return `<ul class="account-list account-consequences">${list.map((item) => `<li>${ctx.esc(item)}</li>`).join("")}</ul>`;
}
// B13's own answer to the ownership offer made for the deletion.
const transferText = (ctx, status) =>
  status === "pending"
    ? ctx.t("proposta in attesa di risposta", "offer waiting for an answer")
    : status === "accepted"
      ? ctx.t("accettata: ora è il nuovo DM", "accepted: now the new DM")
      : status === "declined"
        ? ctx.t(
            "rifiutata: annulla l’eliminazione per sceglierne un altro",
            "declined: cancel the deletion to choose someone else",
          )
        : ctx.t("proposta non più in attesa", "offer no longer pending");
function dataTab(ctx, profile) {
  const s = exportSummary(ctx.state, ctx.role);
  const excluded = ownsCampaign(ctx)
    ? ctx.t(
        "Non include appunti privati o schede di altre persone. Non include ancora la preparazione delle tue campagne (scene, PNG, materiali, bottino) né i messaggi della chat: restano alla campagna.",
        "It does not include other people’s private notes or sheets. It does not yet include your campaigns’ preparation (scenes, NPCs, handouts, loot) or chat messages: they stay with the campaign.",
      )
    : ctx.t(
        "Non include appunti privati o schede di altre persone, ciò che il DM tiene nascosto né i dati della campagna. Non include ancora i tuoi messaggi della chat.",
        "It does not include other people’s private notes or sheets, what the DM keeps hidden or the campaign’s data. It does not yet include your chat messages.",
      );
  const exportPanel = `<section class="panel" aria-labelledby="account-export-title"><h2 id="account-export-title">${ctx.t("Esporta i miei dati", "Export my data")}</h2><p>${ctx.t("Un file JSON con solo i tuoi dati presenti in questo browser, come li vedi tu.", "A JSON file with only your own data from this browser, as you see it.")}</p><dl class="account-summary"><div><dt>${ctx.t("Profilo e avatar", "Profile and avatars")}</dt><dd>${s.avatars}</dd></div><div><dt>${ctx.t("Personaggi tuoi", "Your characters")}</dt><dd>${s.characters.length ? ctx.esc(s.characters.join(", ")) : "0"}</dd></div><div><dt>${ctx.t("Voci e appunti scritti da te", "Entries and notes you wrote")}</dt><dd>${s.entries}</dd></div><div><dt>${ctx.t("Bozze", "Drafts")}</dt><dd>${s.drafts}</dd></div><div><dt>${ctx.t("Contenuti della Biblioteca", "Library items")}</dt><dd>${s.library}</dd></div><div><dt>${ctx.t("Linee e veli (sicurezza)", "Lines and veils (safety)")}</dt><dd>${s.safety}</dd></div><div><dt>${ctx.t("Tue azioni registrate", "Your recorded actions")}</dt><dd>${s.activity}</dd></div></dl><p class="muted" data-account-export-scope>${excluded}</p><button type="button" class="button primary" data-account-export>${ctx.t("Esporta i miei dati", "Export my data")}</button></section>`;
  const c = deletionConsequences(ctx.state, ctx.role, ctx.lang);
  const deletion = profile.deletion
    ? `<section class="panel account-danger" aria-labelledby="account-delete-title" data-account-pending><h2 id="account-delete-title">${ctx.t("Eliminazione programmata", "Deletion scheduled")}</h2><p>${ctx.t(`Richiesta il ${when(ctx, profile.deletion.requestedAt)}. Puoi annullare fino al ${day(ctx, profile.deletion.recoverUntil)}.`, `Requested on ${when(ctx, profile.deletion.requestedAt)}. You can cancel until ${day(ctx, profile.deletion.recoverUntil)}.`)}</p>${Object.entries(
        profile.deletion.transfers,
      )
        .map(
          ([campaignId, to]) =>
            `<p data-account-transfer="${ctx.esc(campaignId)}">${ctx.t("Trasferimento previsto", "Planned transfer")}: «${ctx.esc(coreCampaign(ctx.state, campaignId)?.name ?? campaignId)}» → <strong>${ctx.esc(displayNameOf(ctx.state, to, ctx.lang))}</strong> · ${ctx.esc(transferText(ctx, transferStatus(ctx.state, ctx.role, campaignId)))}</p>`,
        )
        .join(
          "",
        )}${consequencesHTML(ctx, c)}<p class="account-note">${ctx.t("Finestra di recupero simulata: nessun timer scorre e l’eliminazione definitiva non viene eseguita in questa dimostrazione.", "Simulated recovery window: no timer runs and the permanent deletion is not carried out in this demonstration.")}</p><button type="button" class="button primary" data-account-cancel-deletion>${ctx.t("Annulla eliminazione", "Cancel deletion")}</button></section>`
    : `<section class="panel account-danger" aria-labelledby="account-delete-title"><h2 id="account-delete-title">${ctx.t("Elimina account", "Delete account")}</h2><p>${ctx.t(`Prima dell’eliminazione vedi l’elenco esatto di ciò che succede. Hai ${RECOVERY_DAYS} giorni per ripensarci.`, `Before deleting you see exactly what happens. You have ${RECOVERY_DAYS} days to change your mind.`)}</p><button type="button" class="button danger" data-account-delete>${ctx.t("Elimina account…", "Delete account…")}</button></section>`;
  return `<div class="account-grid">${exportPanel}${deletion}</div>`;
}
// IN-10 (DDB Quickbuilder without login, the Forge sandbox): one click opens the sample
// campaign in a separate trial copy on this device; nothing of the signed-out account shows.
function trialBox(ctx) {
  return `<div class="account-trial" data-account-trial><h3>${ctx.t("Non hai un account?", "No account?")}</h3><p class="muted">${ctx.t("Prova d20 Studio con la campagna d’esempio: personaggi, Tavolo e appunti, senza registrarti. I dati restano su questo dispositivo finché non crei un account.", "Try d20 Studio with the sample campaign: characters, the Table and notes, without signing up. Your data stays on this device until you create an account.")}</p><button type="button" class="button primary" data-account-trial-start>${ctx.t("Prova senza account", "Try without an account")}</button></div>`;
}
function sandboxScreen(ctx) {
  return `<section class="account-signin" aria-labelledby="account-sandbox-title"><div class="panel"><h2 id="account-sandbox-title">${ctx.t("Crea un account per salvare", "Create an account to save")}</h2><p>${ctx.t("Stai provando senza account: quello che hai fatto nella prova resta su questo dispositivo. Crea l’account e diventa tuo, anche su altri dispositivi.", "You are trying without an account: what you did in the trial stays on this device. Create the account and it becomes yours, on other devices too.")}</p><p class="muted">${ctx.t("Dimostrazione: nessuna password, nessuna finestra del fornitore, nessun dato inviato. In questa dimostrazione c’è un solo account per dispositivo: la prova sostituisce i dati dell’account uscito da questo browser.", "Demonstration: no password, no provider window, no data sent. This demonstration keeps one account per device: the trial replaces the data of the account that signed out of this browser.")}</p><div class="account-signin-methods">${Object.keys(
    PROVIDERS,
  )
    .map(
      (p) =>
        `<button type="button" class="button" data-account-create="${p}">${ctx.t("Crea con", "Create with")} ${ctx.esc(ctx.label(PROVIDERS[p]))}</button>`,
    )
    .join(
      "",
    )}</div><button type="button" class="button quiet" data-account-trial-continue>${ctx.t("Continua a provare", "Keep trying")}</button></div></section>`;
}
function signInScreen(ctx, profile) {
  // SV-56: after the method, the second step (the app's code or a recovery code).
  if (profile.pendingSecondStep && profile.twoFactor?.enabled)
    return `<section class="account-signin" aria-labelledby="account-signin-title"><div class="panel"><h2 id="account-signin-title">${ctx.t("Verifica in due passaggi", "Two-step verification")}</h2><p>${ctx.t("Scrivi il codice a sei cifre dell’app di autenticazione, oppure un codice di recupero non ancora usato.", "Type the six-digit code of your authenticator app, or an unused recovery code.")}</p><form data-account-second-step><label class="field">${ctx.t("Codice", "Code")}<input name="code" autocomplete="one-time-code" inputmode="text" maxlength="9" required data-account-second-code></label><button type="submit" class="button primary">${ctx.t("Verifica e accedi", "Verify and sign in")}</button></form><p class="muted" data-account-2fa-app>${ctx.t("App di autenticazione (simulata)", "Authenticator app (simulated)")}: <strong>${demoCode(profile.twoFactor.secret)}</strong> · ${ctx.t("cambia ogni 30 secondi", "changes every 30 seconds")}</p></div></section>`;
  return `<section class="account-signin" aria-labelledby="account-signin-title"><div class="panel"><h2 id="account-signin-title">${ctx.t("Accedi a d20 Studio", "Sign in to d20 Studio")}</h2><p>${ctx.t("Per usare personaggi, campagne, appunti e Tavolo accedi di nuovo.", "Sign in again to use characters, campaigns, notes and the Table.")}</p><p class="muted" data-account-closed>${ctx.t("Finché non accedi, le altre pagine, la ricerca, le notifiche e i comandi restano chiusi; dopo l’accesso torni alla pagina che avevi chiesto. Lingua e preferenze del dispositivo restano in «Preferenze».", "Until you sign in, other pages, search, notifications and commands stay closed; after signing in you return to the page you asked for. Language and device preferences remain in “Preferences”.")}</p><p class="muted">${ctx.t("Dimostrazione: scegli un metodo. Nessuna password, nessuna finestra del fornitore, nessun dato inviato.", "Demonstration: choose a method. No password, no provider window, no data sent.")}</p><div class="account-signin-methods">${Object.keys(
    PROVIDERS,
  )
    .map((p) => {
      const linked = profile.signIn.some((m) => m.provider === p);
      return `<button type="button" class="button" data-account-signin="${p}">${ctx.t("Continua con", "Continue with")} ${ctx.esc(ctx.label(PROVIDERS[p]))}${linked ? `<small>${ctx.t("collegato nella dimostrazione", "linked in the demonstration")}</small>` : ""}</button>`;
    })
    .join(
      "",
    )}</div><p class="muted">${ctx.t("Discord non è un metodo d’accesso: si collega dopo, da Accesso e servizi.", "Discord is not a sign-in method: link it later from Sign-in and services.")}</p>${trialBox(ctx)}</div></section>`;
}
export function renderAccount(ctx) {
  const profile = profileOf(ctx.state, ctx.role);
  const tab = TABS.some(([id]) => id === ctx.view.tab) ? ctx.view.tab : "profile";
  const demo = `<p class="account-demo-note">${ctx.t("Dimostrazione: nessuna autenticazione reale e nessun servizio esterno. Account e dati restano in questo browser.", "Demonstration: no real authentication and no external service. Account and data stay in this browser.")}</p>`;
  if (profile.session === "sandbox")
    return `<section class="account-page"><div class="page-heading account-heading"><div class="account-identity"><div><h1 tabindex="-1" data-account-heading>${ctx.t("Account e profilo", "Account and profile")}</h1><p><span class="badge" data-account-status>${ctx.t("Prova senza account", "Trial without an account")}</span></p></div></div></div>${sandboxScreen(ctx)}</section>`;
  // Signed out: the browser shows no account data, only the way back in.
  if (profile.session === "signed-out")
    return `<section class="account-page"><div class="page-heading account-heading"><div class="account-identity"><div><h1 tabindex="-1" data-account-heading>${ctx.t("Account e profilo", "Account and profile")}</h1><p><span class="badge" data-account-status>${ctx.t("Non hai effettuato l’accesso", "Signed out")}</span></p></div></div></div>${demo}${signInScreen(ctx, profile)}</section>`;
  const name = displayNameOf(ctx.state, ctx.role, ctx.lang);
  const status = profile.deletion
    ? ctx.t("In eliminazione", "Being deleted")
    : ctx.t("Account attivo", "Active account");
  // The role in the campaign in play (B13), left out when it is the name itself ("DM").
  const campaignRole = ctx.state.campaign?.id
    ? roleOf(ctx.state, ctx.state.campaign.id, ctx.role)
    : null;
  const roleText = campaignRole ? roleName(ctx, campaignRole) : "";
  const role =
    roleText && nameKey(roleText) !== nameKey(name)
      ? ` · <span data-account-heading-role>${ctx.esc(roleText)}</span>`
      : "";
  const heading = `<div class="page-heading account-heading"><div class="account-identity">${avatarHTML(activeAvatar(profile), name, { size: "lg", esc: ctx.esc })}<div><h1 tabindex="-1" data-account-heading>${ctx.t("Account e profilo", "Account and profile")}</h1><p><span data-account-heading-name>${ctx.esc(name)}</span>${role} · <span class="badge" data-account-status>${ctx.esc(status)}</span></p></div></div><button type="button" class="button" data-account-signout>${ctx.t("Esci", "Sign out")}</button></div>${demo}`;
  const body =
    tab === "access"
      ? accessTab(ctx, profile)
      : tab === "privacy"
        ? privacyTab(ctx, profile)
        : tab === "data"
          ? dataTab(ctx, profile)
          : profileTab(ctx, profile);
  return `<section class="account-page">${heading}${statusBanner(ctx, profile)}${tabsHTML(ctx, tab)}${body}</section>`;
}

// Image upload: centre-cropped to a small square in the browser, so the saved data URL
// stays a few kilobytes. Unreadable files give a readable error, never a broken avatar.
async function imageToAvatarSrc(file) {
  validateAvatarFile(file);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    refuse("Immagine illeggibile o danneggiata.", "Unreadable or damaged image.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_PIXELS;
  canvas
    .getContext("2d")
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_PIXELS,
      AVATAR_PIXELS,
    );
  bitmap.close?.();
  let src = canvas.toDataURL("image/webp", 0.86);
  if (!src.startsWith("data:image/webp")) src = canvas.toDataURL("image/png");
  return src;
}
function download(root, filename, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  (root?.isConnected ? root : document.body).append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportMyData(ctx, root = null) {
  // A signed-out browser holds no account to export (the command palette can still ask).
  if (profileOf(ctx.state, ctx.role).session !== "account") {
    ctx.toast(ctx.t("Accedi per esportare i tuoi dati.", "Sign in to export your data."), true);
    return null;
  }
  const data = buildPersonalExport(ctx.state, ctx.role, { lang: ctx.lang });
  const filename = exportFileName(ctx.role, Date.now(), ctx.lang);
  download(root, filename, data);
  ctx.toast(ctx.t(`File scaricato: ${filename}`, `File downloaded: ${filename}`));
  return { filename, data };
}
function emblemDialog(ctx) {
  const name = displayNameOf(ctx.state, ctx.role, ctx.lang);
  const radios = (group, entries, checked) =>
    entries
      .map(
        ([value, label], i) =>
          `<label class="account-choice"><input type="radio" name="${group}" value="${value}" ${value === checked || (!checked && i === 0) ? "checked" : ""}> ${ctx.esc(ctx.label(label))}</label>`,
      )
      .join("");
  ctx.dialog(
    ctx.t("Crea un emblema", "Create an emblem"),
    `<div class="account-emblem-preview" data-account-emblem-preview>${avatarHTML({ kind: "emblem", color: "gold", glyph: "dice" }, name, { size: "lg", esc: ctx.esc })}</div><fieldset class="account-choices"><legend>${ctx.t("Simbolo", "Symbol")}</legend>${radios("glyph", Object.entries(EMBLEMS), "dice")}</fieldset><fieldset class="account-choices"><legend>${ctx.t("Colore", "Colour")}</legend>${radios("color", Object.entries(COLORS), "gold")}</fieldset>`,
    {
      submitLabel: ctx.t("Aggiungi e usa", "Add and use"),
      onSubmit: (data) => {
        const input = { kind: "emblem", glyph: data.get("glyph"), color: data.get("color") };
        const done = run(
          ctx,
          ctx.t("Avatar aggiornato", "Avatar updated"),
          (draft) => addAvatar(draft, ctx.role, input),
          { published: true, focus: "[data-account-emblem]" },
        );
        if (done) ctx.toast(ctx.t("Nuovo avatar in uso.", "New avatar in use."));
        return done ? undefined : false;
      },
    },
  );
  const form = typeof document === "undefined" ? null : document.querySelector("#dialog form");
  const preview = form?.querySelector("[data-account-emblem-preview]");
  form?.addEventListener("change", () => {
    const data = new FormData(form);
    const glyph = data.get("glyph");
    preview.innerHTML = avatarHTML(
      glyph === "initials"
        ? { kind: "initials", color: data.get("color") }
        : { kind: "emblem", glyph, color: data.get("color") },
      name,
      { size: "lg", esc: ctx.esc },
    );
  });
}
function methodDialog(ctx, provider) {
  const providerName = ctx.label(PROVIDERS[provider]);
  ctx.dialog(
    ctx.t(`Aggiungi ${providerName}`, `Add ${providerName}`),
    `<p>${ctx.t("Simulazione: in un’app reale si aprirebbe la pagina del fornitore. Qui non si apre nulla e nessuna credenziale viene chiesta o inviata.", "Simulation: a real app would open the provider’s page. Here nothing opens and no credential is asked for or sent.")}</p>${provider === "email" ? `<label class="field">${ctx.t("Indirizzo di esempio", "Example address")}<input name="label" type="email" value="giocatore.bis@example.test" required></label>` : ""}`,
    {
      submitLabel: ctx.t("Aggiungi metodo", "Add method"),
      onSubmit: (data) => {
        const done = run(
          ctx,
          ctx.t("Metodo d’accesso aggiunto", "Sign-in method added"),
          (draft) => addSignInMethod(draft, ctx.role, provider, { label: data.get("label") ?? "" }),
          { focus: `[data-account-method="${provider}"] button` },
        );
        return done ? undefined : false;
      },
    },
  );
}
function linkDialog(ctx, service) {
  const info = SERVICES[service];
  const suggestion =
    displayNameOf(ctx.state, ctx.role, ctx.lang)
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "avventuriero";
  ctx.dialog(
    ctx.t(`Collega ${info.name}`, `Link ${info.name}`),
    `<p>${ctx.t("Simulazione dell’autorizzazione: in un’app reale si aprirebbe Discord per confermare. Nessun servizio viene contattato.", "Authorization simulation: a real app would open Discord to confirm. No service is contacted.")}</p><p><strong>${ctx.t("Dati richiesti", "Requested data")}:</strong> ${ctx.esc(ctx.label(info.scopes))}.</p><p>${ctx.esc(ctx.label(info.purpose))} ${ctx.t("Collegarlo non ti permette di accedere con Discord.", "Linking it does not let you sign in with Discord.")}</p><label class="field">${ctx.t("Nome utente di esempio", "Example username")}<input name="handle" value="${ctx.esc(suggestion)}" required maxlength="32"></label>`,
    {
      submitLabel: ctx.t("Autorizza (simulato)", "Authorize (simulated)"),
      onSubmit: (data) => {
        const done = run(
          ctx,
          ctx.t(`${info.name} collegato`, `${info.name} linked`),
          (draft) => linkService(draft, ctx.role, service, data.get("handle")),
          { focus: `[data-account-unlink="${service}"]` },
        );
        return done ? undefined : false;
      },
    },
  );
}
function deleteDialog(ctx) {
  const c = deletionConsequences(ctx.state, ctx.role, ctx.lang);
  const transfers = c.campaigns
    .filter((campaign) => campaign.transfer)
    .map(
      (campaign) =>
        `<label class="field">${ctx.t(`Trasferisci «${campaign.name}» a`, `Transfer “${campaign.name}” to`)}<select name="transfer:${ctx.esc(campaign.id)}"><option value="">${ctx.t("Scegli un membro…", "Choose a member…")}</option>${campaign.candidates.map((m) => `<option value="${ctx.esc(m.id)}"${m.id === campaign.pendingTo ? " selected" : ""}>${ctx.esc(m.name)}</option>`).join("")}</select></label>`,
    )
    .join("");
  const identity = `<label class="field">${ctx.t("Conferma la tua identità con", "Confirm your identity with")}<select name="confirmWith" data-account-confirm-with><option value="">${ctx.t("Scegli un tuo metodo d’accesso…", "Choose one of your sign-in methods…")}</option>${c.methods.map((p) => `<option value="${p}">${ctx.esc(ctx.label(PROVIDERS[p]))}</option>`).join("")}</select></label><p class="muted">${ctx.t("Simulazione: in un’app reale accederesti di nuovo con questo metodo per dimostrare che sei tu.", "Simulation: a real app would have you sign in again with this method to prove it is you.")}</p>`;
  const phrase = typedConfirmation(ctx.lang);
  ctx.dialog(
    ctx.t("Eliminare l’account?", "Delete the account?"),
    `<h3>${ctx.t("Cosa succede", "What happens")}</h3>${consequencesHTML(ctx, c)}<p>${ctx.t(`Hai ${RECOVERY_DAYS} giorni per annullare. Poi l’eliminazione è definitiva.`, `You have ${RECOVERY_DAYS} days to cancel. Afterwards the deletion is permanent.`)}</p><p><button type="button" class="button" data-account-dialog-export>${ctx.t("Esporta prima i miei dati", "Export my data first")}</button></p>${transfers}<label class="check-field"><input type="checkbox" name="acknowledged"> ${ctx.t("Ho letto le conseguenze", "I have read the consequences")}</label>${identity}<label class="field">${ctx.t(`Per confermare scrivi ${phrase}`, `To confirm, type ${phrase}`)}<input name="typed" autocomplete="off" spellcheck="false" data-account-typed></label>`,
    {
      submitLabel: ctx.t("Elimina account", "Delete account"),
      onSubmit: (data) => {
        const input = {
          typed: data.get("typed"),
          acknowledged: data.has("acknowledged"),
          confirmWith: data.get("confirmWith"),
          transfers: Object.fromEntries(
            [...data.entries()]
              .filter(([key]) => key.startsWith("transfer:"))
              .map(([key, value]) => [key.slice(9), value]),
          ),
          lang: ctx.lang,
        };
        // Validation errors stay in the dialog; the commit runs only when valid.
        requestDeletion(structuredClone(ctx.state), ctx.role, input);
        const done = run(
          ctx,
          ctx.t("Eliminazione dell’account programmata", "Account deletion scheduled"),
          (draft) => requestDeletion(draft, ctx.role, input),
          { focus: "[data-account-cancel-deletion]" },
        );
        const offered = Object.keys(input.transfers).length;
        if (done)
          ctx.toast(
            ctx.t(
              `Eliminazione programmata: puoi annullarla entro ${RECOVERY_DAYS} giorni.${offered ? " La proposta di trasferimento è arrivata al nuovo DM." : ""}`,
              `Deletion scheduled: you can cancel it within ${RECOVERY_DAYS} days.${offered ? " The transfer offer has reached the new DM." : ""}`,
            ),
          );
        return done ? undefined : false;
      },
    },
  );
  if (typeof document === "undefined") return;
  const dialog = document.querySelector("#dialog");
  // The shell draws every submit button as primary: an irreversible request is drawn as
  // a danger action (R20-207), in this dialog only.
  dialog?.querySelector('footer button[type="submit"]')?.classList.replace("primary", "danger");
  dialog
    ?.querySelector("[data-account-dialog-export]")
    ?.addEventListener("click", () => exportMyData(ctx, dialog));
}
function confirmDialog(ctx, title, body, submitLabel, action) {
  ctx.dialog(title, `<p>${ctx.esc(body)}</p>`, {
    submitLabel,
    onSubmit: () => (action() ? undefined : false),
  });
}
function bindCommon(root, ctx) {
  root.querySelectorAll("[data-account-go]").forEach((b) => {
    b.onclick = () => ctx.navigate("account", { tab: b.dataset.accountGo });
  });
  root.querySelectorAll("[data-account-cancel-deletion]").forEach((b) => {
    b.onclick = () => {
      let revoked = 0;
      const done = run(
        ctx,
        ctx.t("Eliminazione dell’account annullata", "Account deletion cancelled"),
        (draft) => {
          revoked = cancelDeletion(draft, ctx.role);
        },
        { focus: "[data-account-delete]" },
      );
      if (done)
        ctx.toast(
          ctx.t(
            `Eliminazione annullata: l’account resta attivo.${revoked ? " La proposta di trasferimento è stata revocata." : ""}`,
            `Deletion cancelled: the account stays active.${revoked ? " The transfer offer was revoked." : ""}`,
          ),
        );
    };
  });
}
const routeParams = (view) =>
  Object.fromEntries(
    ["id", "tab", "revision", "returnTo"]
      .filter((key) => view?.[key])
      .map((key) => [key, view[key]]),
  );
// Signing out of this browser (page button and account menu). Offline it is refused:
// there would be no way back in until the network returns. The access gate then closes
// the app to this identity.
function signOutNow(ctx) {
  if (
    refuseOffline(
      ctx,
      "Sei senza rete: per rientrare serve la rete, quindi puoi uscire solo quando torni in linea.",
      "You are offline: signing back in needs the network, so you can sign out only once you are back online.",
    )
  )
    return null;
  const done = run(
    ctx,
    ctx.t("Uscita da questo browser", "Signed out of this browser"),
    (draft) => signOut(draft, ctx.role),
    { local: true, focus: "[data-account-signin]" },
  );
  if (done) ctx.toast(ctx.t("Sei uscito da questo browser.", "You signed out of this browser."));
  return done;
}
// SV-56 and SV-28 controls (two-step verification, age and consent).
function bindSecurity(root, ctx) {
  root.querySelector("[data-account-2fa-on]")?.addEventListener("click", () => {
    let secret = null;
    if (
      !run(
        ctx,
        ctx.t("Verifica in due passaggi: attivazione", "Two-step verification: set-up"),
        (draft) => (secret = beginTwoFactor(draft, ctx.role)),
      )
    )
      return;
    const key = secret.replace(/(.{4})/g, "$1 ").trim();
    ctx.dialog(
      ctx.t("Attiva la verifica in due passaggi", "Turn on two-step verification"),
      `<ol><li>${ctx.t("Aggiungi l’account all’app di autenticazione con questa chiave", "Add the account to your authenticator app with this key")}: <code data-account-2fa-key>${ctx.esc(key)}</code></li><li>${ctx.t("Scrivi il codice a sei cifre che l’app mostra ora.", "Type the six-digit code the app shows now.")}</li></ol><p class="muted" data-account-2fa-app>${ctx.t("App di autenticazione (simulata)", "Authenticator app (simulated)")}: <strong>${demoCode(secret)}</strong></p><label class="field">${ctx.t("Codice dell’app", "App code")}<input name="code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" required></label>`,
      {
        submitLabel: ctx.t("Attiva", "Turn on"),
        onSubmit: (data) => {
          let codes = null;
          const done = run(
            ctx,
            ctx.t("Verifica in due passaggi attivata", "Two-step verification turned on"),
            (draft) => (codes = confirmTwoFactor(draft, ctx.role, data.get("code"))),
          );
          if (!done) return false;
          const text = codes.join("\n");
          ctx.dialog(
            ctx.t("Codici di recupero", "Recovery codes"),
            `<p>${ctx.t("Ognuno vale una volta, se non hai l’app. Conservali in un posto sicuro: non li vedrai più.", "Each works once, if you do not have the app. Keep them somewhere safe: you will not see them again.")}</p><ul class="account-recovery" data-account-recovery>${codes.map((code) => `<li><code>${ctx.esc(code)}</code></li>`).join("")}</ul><a class="button" download="d20-studio-codici-di-recupero.txt" href="data:text/plain;charset=utf-8,${encodeURIComponent(text)}">${ctx.t("Scarica i codici", "Download the codes")}</a>`,
            { cancelLabel: ctx.t("Li ho conservati", "I kept them") },
          );
        },
      },
    );
  });
  root.querySelector("[data-account-2fa-off]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Disattivare la verifica in due passaggi?", "Turn off two-step verification?"),
      `<p>${ctx.t("L’accesso tornerà a chiedere solo il metodo d’accesso.", "Signing in will ask only for the sign-in method again.")}</p><label class="field">${ctx.t("Codice dell’app", "App code")}<input name="code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" required></label>`,
      {
        submitLabel: ctx.t("Disattiva", "Turn off"),
        onSubmit: (data) =>
          run(
            ctx,
            ctx.t("Verifica in due passaggi disattivata", "Two-step verification turned off"),
            (draft) => disableTwoFactor(draft, ctx.role, data.get("code")),
          )
            ? undefined
            : false,
      },
    ),
  );
  root.querySelector("[data-account-age-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const year = new FormData(event.currentTarget).get("year");
    run(
      ctx,
      ctx.t("Fascia d’età registrata", "Age band recorded"),
      (draft) => declareAge(draft, ctx.role, year),
      {
        focus: "[data-account-age] h2",
      },
    );
  });
  root.querySelector("[data-account-consent-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    run(ctx, ctx.t("Consenso del genitore richiesto", "Parent’s consent requested"), (draft) =>
      requestParentConsent(draft, ctx.role, email),
    );
  });
  root
    .querySelectorAll("[data-account-consent-answer]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        run(
          ctx,
          ctx.t("Risposta del genitore (simulata)", "Parent’s answer (simulated)"),
          (draft) =>
            answerParentConsent(draft, ctx.role, button.dataset.accountConsentAnswer === "yes"),
        ),
      ),
    );
}
export function bindAccount(root, ctx) {
  const profile = profileOf(ctx.state, ctx.role);
  bindCommon(root, ctx);
  root.querySelectorAll("[data-account-tab]").forEach((b) => {
    b.onclick = () => {
      ui.focus = `[data-account-tab="${b.dataset.accountTab}"]`;
      ctx.navigate(
        "account",
        b.dataset.accountTab === "profile" ? {} : { tab: b.dataset.accountTab },
      );
    };
  });
  root.querySelectorAll("[data-account-signout]").forEach((b) => {
    b.onclick = () => signOutNow(ctx);
  });
  root.querySelector("[data-account-trial-start]")?.addEventListener("click", () => {
    const storage = (() => {
      try {
        return globalThis.localStorage;
      } catch {
        return null;
      }
    })();
    if (!storage)
      return ctx.toast(
        ctx.t(
          "Questo browser non conserva dati: la prova non può partire.",
          "This browser keeps no data: the trial cannot start.",
        ),
        true,
      );
    startSandbox(storage, ctx.role);
    globalThis.location.hash = "#campaign";
    globalThis.location.reload();
  });
  root
    .querySelector("[data-account-trial-continue]")
    ?.addEventListener("click", () => ctx.navigate("campaign"));
  root.querySelectorAll("[data-account-create]").forEach((b) => {
    b.onclick = () => {
      if (
        refuseOffline(
          ctx,
          "Sei senza rete: per creare l’account serve la connessione. Riprova quando torni in linea.",
          "You are offline: creating the account needs a connection. Try again once you are back online.",
        )
      )
        return;
      const identity = ctx.role;
      const done = run(
        ctx,
        ctx.t("Account creato", "Account created"),
        (draft) => createAccountFromSandbox(draft, identity, b.dataset.accountCreate),
        { focus: "[data-account-heading]", signIn: true },
      );
      if (!done) return;
      try {
        promoteSandbox(globalThis.localStorage);
      } catch {
        return ctx.toast(
          ctx.t(
            "Non riesco a salvare la prova su questo dispositivo.",
            "Cannot keep the trial on this device.",
          ),
          true,
        );
      }
      globalThis.location.hash = "#account";
      globalThis.location.reload();
    };
  });
  // Sign-in screen; afterwards the page the identity asked for (the shell keeps it in
  // view.requested while the access gate shows this page instead).
  root.querySelectorAll("[data-account-signin]").forEach((b) => {
    b.onclick = () => {
      if (
        refuseOffline(
          ctx,
          "Sei senza rete: per accedere serve la connessione. Riprova quando torni in linea.",
          "You are offline: signing in needs a connection. Try again once you are back online.",
        )
      )
        return;
      const identity = ctx.role;
      const back = ctx.view?.requested;
      let step = null;
      const done = run(
        ctx,
        ctx.t("Accesso effettuato", "Signed in"),
        (draft) => (step = signIn(draft, identity, b.dataset.accountSignin)),
        { focus: "[data-account-second-code], [data-account-heading]", signIn: true },
      );
      if (!done) return;
      if (step?.secondStep) {
        ctx.toast(
          ctx.t(
            "Serve il secondo passaggio: il codice dell’app.",
            "The second step is needed: the app’s code.",
          ),
        );
        return;
      }
      ctx.toast(ctx.t("Accesso effettuato (simulato).", "Signed in (simulated)."));
      if (back?.page && back.page !== ACCOUNT_ID) ctx.navigate(back.page, routeParams(back));
    };
  });
  root.querySelector("[data-account-second-step]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    const back = ctx.view?.requested;
    let result = null;
    const done = run(
      ctx,
      ctx.t("Accesso effettuato", "Signed in"),
      (draft) => (result = verifySecondStep(draft, ctx.role, code)),
      { focus: "[data-account-heading]", signIn: true },
    );
    if (!done) return;
    ctx.toast(
      result?.recovery
        ? ctx.t(
            `Accesso con un codice di recupero: ne restano ${result.left}.`,
            `Signed in with a recovery code: ${result.left} left.`,
          )
        : ctx.t(
            "Accesso effettuato con la verifica in due passaggi.",
            "Signed in with two-step verification.",
          ),
    );
    if (back?.page && back.page !== ACCOUNT_ID) ctx.navigate(back.page, routeParams(back));
  });
  bindSecurity(root, ctx);
  // Profile: display name with an unsaved-draft guard.
  const nameInput = root.querySelector("[data-account-name]");
  nameInput?.addEventListener("input", () => {
    ui.pendingName = { identity: ctx.role, value: nameInput.value };
  });
  // The typed value is released before the commit renders, and kept if it is refused.
  const saveName = (title, mutate, message) => {
    const pending = ui.pendingName;
    ui.pendingName = null;
    const done = run(ctx, title, mutate, { published: true, focus: "[data-account-name]" });
    if (!done) ui.pendingName = pending;
    else ctx.toast(message);
  };
  root.querySelector("[data-account-name-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = nameInput.value;
    saveName(
      ctx.t("Nome visualizzato aggiornato", "Display name updated"),
      (draft) => setDisplayName(draft, ctx.role, value),
      ctx.t(
        "Nome salvato: i membri vedono il nuovo nome.",
        "Name saved: members see the new name.",
      ),
    );
  });
  root.querySelectorAll("[data-account-restore-name]").forEach((b) => {
    b.onclick = () =>
      saveName(
        ctx.t("Nome visualizzato ripristinato", "Display name restored"),
        (draft) => restoreDisplayName(draft, ctx.role, b.dataset.accountRestoreName),
        ctx.t("Nome precedente ripristinato.", "Previous name restored."),
      );
  });
  // Avatars.
  root.querySelectorAll("[data-account-use-avatar]").forEach((b) => {
    b.onclick = () =>
      run(
        ctx,
        ctx.t("Avatar aggiornato", "Avatar updated"),
        (draft) => selectAvatar(draft, ctx.role, b.dataset.accountUseAvatar),
        { published: true, focus: `[data-account-avatar="${b.dataset.accountUseAvatar}"]` },
      );
  });
  root.querySelectorAll("[data-account-remove-avatar]").forEach((b) => {
    b.onclick = () =>
      run(
        ctx,
        ctx.t("Avatar eliminato", "Avatar deleted"),
        (draft) => removeAvatar(draft, ctx.role, b.dataset.accountRemoveAvatar),
        { published: true, focus: "[data-account-restore-avatar]" },
      );
  });
  root
    .querySelector("[data-account-restore-avatar]")
    ?.addEventListener("click", () =>
      run(
        ctx,
        ctx.t("Avatar ripristinato", "Avatar restored"),
        (draft) => restoreRemovedAvatar(draft, ctx.role),
        { published: true, focus: "[data-account-emblem]" },
      ),
    );
  root.querySelector("[data-account-emblem]")?.addEventListener("click", () => emblemDialog(ctx));
  const upload = root.querySelector("[data-account-upload]");
  upload?.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    const identity = ctx.role;
    ui.uploadError = null;
    ui.uploadBusy = true;
    ctx.render();
    try {
      const src = await imageToAvatarSrc(file);
      ui.uploadBusy = false;
      // The identity may have changed while the image was being prepared.
      if (ctx.role !== identity) return ctx.render();
      const done = run(
        ctx,
        ctx.t("Avatar aggiornato", "Avatar updated"),
        (draft) => addAvatar(draft, identity, { kind: "image", src }),
        { published: true, focus: ".account-upload input" },
      );
      if (done) ctx.toast(ctx.t("Immagine caricata e in uso.", "Image uploaded and in use."));
      else ctx.render();
    } catch (error) {
      ui.uploadBusy = false;
      ui.uploadError = errorText(ctx, error);
      ctx.render();
    }
  });
  // Sign-in methods and services.
  root.querySelectorAll("[data-account-add-method]").forEach((b) => {
    b.onclick = () => methodDialog(ctx, b.dataset.accountAddMethod);
  });
  root.querySelectorAll("[data-account-remove-method]").forEach((b) => {
    b.onclick = () => {
      const method = profile.signIn.find((m) => m.id === b.dataset.accountRemoveMethod);
      const name = ctx.label(PROVIDERS[method?.provider] ?? { it: "", en: "" });
      confirmDialog(
        ctx,
        ctx.t(`Rimuovere ${name}?`, `Remove ${name}?`),
        ctx.t(
          `Non potrai più accedere con ${name}. Potrai aggiungerlo di nuovo.`,
          `You will no longer sign in with ${name}. You can add it again.`,
        ),
        ctx.t("Rimuovi", "Remove"),
        () =>
          run(
            ctx,
            ctx.t("Metodo d’accesso rimosso", "Sign-in method removed"),
            (draft) => removeSignInMethod(draft, ctx.role, b.dataset.accountRemoveMethod),
            {
              focus: `[data-account-add-method="${method?.provider}"]`,
            },
          ),
      );
    };
  });
  root.querySelectorAll("[data-account-link]").forEach((b) => {
    b.onclick = () => linkDialog(ctx, b.dataset.accountLink);
  });
  root.querySelectorAll("[data-account-unlink]").forEach((b) => {
    b.onclick = () => {
      const info = SERVICES[b.dataset.accountUnlink];
      confirmDialog(
        ctx,
        ctx.t(`Scollegare ${info.name}?`, `Unlink ${info.name}?`),
        ctx.t(
          "Il bot non potrà più leggere i tuoi personaggi. Il tuo accesso non cambia.",
          "The bot will no longer read your characters. Your sign-in does not change.",
        ),
        ctx.t("Scollega", "Unlink"),
        () =>
          run(
            ctx,
            ctx.t(`${info.name} scollegato`, `${info.name} unlinked`),
            (draft) => unlinkService(draft, ctx.role, b.dataset.accountUnlink),
            {
              focus: `[data-account-link="${b.dataset.accountUnlink}"]`,
            },
          ),
      );
    };
  });
  // Privacy.
  root.querySelector("[data-account-lastseen]")?.addEventListener("change", (event) => {
    const enabled = event.currentTarget.checked;
    const done = run(
      ctx,
      ctx.t("Preferenza sull’ultimo accesso aggiornata", "Last access preference updated"),
      (draft) => setLastSeenSharing(draft, ctx.role, enabled),
      { focus: "[data-account-lastseen]" },
    );
    if (done)
      ctx.toast(
        enabled
          ? ctx.t("I membri ora vedono il tuo ultimo accesso.", "Members now see your last access.")
          : ctx.t("Il tuo ultimo accesso ora è nascosto.", "Your last access is now hidden."),
      );
    else ctx.render();
  });
  // Data.
  root
    .querySelector("[data-account-export]")
    ?.addEventListener("click", () => exportMyData(ctx, root));
  root
    .querySelector("[data-account-safety]")
    ?.addEventListener("click", () => ctx.navigate("safety-profile"));
  root.querySelector("[data-account-delete]")?.addEventListener("click", () => deleteDialog(ctx));
  if (ui.focus) {
    const target = root.querySelector(ui.focus) ?? root.querySelector("[data-account-heading]");
    ui.focus = null;
    target?.focus();
  }
}

// ---------------------------------------------------------------- registration

const L = (it, en) => ({ it, en });
const SEARCH_TERMS = [
  [
    "profile",
    ["account", "profilo", "profile", "avatar", "nome", "name"],
    L("Account e profilo", "Account and profile"),
  ],
  [
    "access",
    [
      "accesso",
      "sign",
      "login",
      "discord",
      "google",
      "apple",
      "passkey",
      "servizi",
      "services",
      "esci",
    ],
    L("Accesso e servizi collegati", "Sign-in and linked services"),
  ],
  [
    "privacy",
    ["privacy", "ultimo accesso", "last access", "last sign"],
    L("Privacy dell’account", "Account privacy"),
  ],
  [
    "data",
    ["dati", "data", "esporta", "export", "elimina", "delete", "cancella"],
    L("Esporta o elimina i miei dati", "Export or delete my data"),
  ],
];
function homeNotice(ctx) {
  const profile = profileOf(ctx.state, ctx.role);
  if (profile.session === "account" && profile.deletion)
    return `<section class="account-banner is-danger account-home" role="status" data-account-home="deletion"><h2>${ctx.t("Eliminazione dell’account programmata", "Account deletion scheduled")}</h2><p>${ctx.t(`Puoi annullarla fino al ${day(ctx, profile.deletion.recoverUntil)}.`, `You can cancel it until ${day(ctx, profile.deletion.recoverUntil)}.`)}</p><div class="toolbar"><button type="button" class="button primary" data-account-cancel-deletion>${ctx.t("Annulla eliminazione", "Cancel deletion")}</button><button type="button" class="button" data-account-go="data">${ctx.t("Vedi dettagli", "See details")}</button></div></section>`;
  return "";
}
// Signing out closes the app to that identity until it signs in again ("sign in to
// continue", as on D&D Beyond or Roll20). Through the registry's access gate the shell
// shows only this page (keeping the requested one for afterwards) and refuses changes;
// other areas' commands, search results and notifications are withheld. The demo's
// "Visita come" and this device's preferences stay available.
export function accessRefusal(ctx) {
  if (ui.signingIn) return null;
  return ctx?.state?.ext?.[ACCOUNT_ID]?.profiles?.[ctx?.role]?.session === "signed-out"
    ? L(
        "Accedi per continuare: sei uscito da questo browser.",
        "Sign in to continue: you signed out of this browser.",
      )
    : null;
}
// DDB: the avatar at the right of the header opens a menu with the account's sections
// and "Sign out". The shell's menus are dialogs (the Table's "App" menu): the same here.
export function openAccountMenu(ctx) {
  const profile = profileOf(ctx.state, ctx.role);
  if (profile.session !== "account") return ctx.navigate(ACCOUNT_ID);
  const name = displayNameOf(ctx.state, ctx.role, ctx.lang);
  ctx.dialog(
    ctx.t("Account e profilo", "Account and profile"),
    `<div class="account-menu-head">${avatarHTML(activeAvatar(profile), name, { esc: ctx.esc })}<strong>${ctx.esc(name)}</strong></div><div class="dialog-menu account-menu">${TABS.map(([id, it, en]) => `<button type="button" class="button" data-account-menu="${id}">${ctx.t(it, en)}</button>`).join("")}<button type="button" class="button" data-account-menu-signout>${ctx.t("Esci", "Sign out")}</button></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const dialog = typeof document === "undefined" ? null : document.querySelector("#dialog");
  dialog?.querySelectorAll("[data-account-menu]").forEach((b) => {
    b.onclick = () =>
      ctx.navigate(
        ACCOUNT_ID,
        b.dataset.accountMenu === "profile" ? {} : { tab: b.dataset.accountMenu },
      );
  });
  const signOutButton = dialog?.querySelector("[data-account-menu-signout]");
  if (signOutButton)
    signOutButton.onclick = () => {
      ctx.closeDialog();
      signOutNow(ctx);
    };
}
export function register(registry) {
  registry.registerStateSlice(ACCOUNT_ID, {
    version: SLICE_VERSION,
    // Account data is not gameplay: gameplay Undo leaves it; its own corrections exist.
    undo: "preserve",
    seed: () => seedAccount(),
    normalize: (slice, fromVersion) => normalizeAccount(slice, fromVersion),
  });
  registry.registerStyles(new URL("./account.css", import.meta.url));
  registry.add("route", {
    id: ACCOUNT_ID,
    label: L("Account e profilo", "Account and profile"),
    icon: "person",
    render: renderAccount,
    bind: bindAccount,
  });
  // DDB: the account lives behind the profile control at the right of the header.
  registry.add("service", {
    id: ACCOUNT_ID,
    label: L("Account e profilo", "Account and profile"),
    icon: "person",
    header: true,
    order: 50,
    run: (ctx) => openAccountMenu(ctx),
  });
  registry.add("home-widget", {
    id: "account-status",
    label: L("Stato dell’account", "Account status"),
    order: 5,
    when: (ctx) => Boolean(homeNotice(ctx)),
    render: homeNotice,
    bind: (el, ctx) => bindCommon(el, ctx),
  });
  registry.add("search", {
    id: "account-pages",
    label: L("Account", "Account"),
    search: (ctx, query) => {
      const q = String(query).trim().toLocaleLowerCase();
      if (q.length < 2) return [];
      return SEARCH_TERMS.filter(([, words, title]) =>
        [...words, title.it.toLocaleLowerCase(), title.en.toLocaleLowerCase()].some((w) =>
          w.includes(q),
        ),
      ).map(([tab, , title]) => ({
        title,
        page: ACCOUNT_ID,
        params: tab === "profile" ? {} : { tab },
      }));
    },
  });
  registry.add("command", {
    id: "account.open",
    label: L("Apri account e profilo", "Open account and profile"),
    group: "account",
    run: (ctx) => ctx.navigate("account"),
  });
  registry.add("command", {
    id: "account.export",
    label: L("Esporta i miei dati", "Export my data"),
    group: "account",
    run: (ctx) => exportMyData(ctx),
  });
  registry.add("notifications", {
    id: "account-deletion",
    label: L("Account", "Account"),
    collect: (ctx) => {
      const profile = profileOf(ctx.state, ctx.role);
      return profile.session === "account" && profile.deletion
        ? [
            {
              id: `account-deletion-${ctx.role}`,
              // A system notice (B24): never filtered out as the reader's own action,
              // although the reader's own request made it appear.
              by: null,
              category: "other",
              title: L("Eliminazione dell’account programmata", "Account deletion scheduled"),
              body: L(
                `Puoi annullarla fino al ${day({ lang: "it" }, profile.deletion.recoverUntil)}.`,
                `You can cancel it until ${day({ lang: "en" }, profile.deletion.recoverUntil)}.`,
              ),
              time: profile.deletion.requestedAt,
              target: { page: ACCOUNT_ID, params: { tab: "data" } },
            },
          ]
        : [];
    },
  });
  registry.add("draft-guard", {
    id: "account-name",
    label: L("Nome visualizzato non salvato", "Unsaved display name"),
    hasDraft: (ctx, next) => {
      const pending = ui.pendingName;
      if (!pending || pending.identity !== ctx.role) return false;
      if (pending.value.trim() === displayNameOf(ctx.state, ctx.role, ctx.lang)) return false;
      // Re-rendering the same profile tab keeps the typed value.
      return !(next && next.page === ACCOUNT_ID && !next.role && (next.tab ?? "") === "");
    },
    confirm: (ctx, proceed) =>
      ctx.dialog(
        ctx.t("Nome non salvato", "Unsaved name"),
        `<p>${ctx.t("Hai modificato il nome visualizzato senza salvarlo.", "You changed your display name without saving it.")}</p>`,
        {
          submitLabel: ctx.t("Scarta la modifica", "Discard the change"),
          cancelLabel: ctx.t("Continua a modificare", "Keep editing"),
          onSubmit: () => {
            ui.pendingName = null;
            proceed();
          },
        },
      ),
  });
  registry.registerAccessGate({ page: ACCOUNT_ID, refusal: accessRefusal });
  registry.on("navigate", (payload) => {
    // Entering the page (header, search, palette, the access gate) puts focus on its
    // heading, like the personal-notes service; moving between sections keeps it there.
    if (payload.page === ACCOUNT_ID && payload.from !== ACCOUNT_ID)
      ui.focus ??= "[data-account-heading]";
  });
  registry.on("role-changed", () => resetAccountView());
  registry.on("reset", () => resetAccountView());
}
