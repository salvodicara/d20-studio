// B29 — the published avatar, as a small pure helper shared with other areas.
//
// The campaign member list (B13) and the chat (B17) draw the avatar a person chose in the
// account (DDB-189). They import this file, not the account area itself: if the account
// area fails to load, their pages keep working and draw the stored avatar or their own
// monogram. It reads `state.ext.account` only and imports nothing but `ui.mjs`.

import { esc as escape, icon } from "./ui.mjs";

// Colour and emblem choices for generated avatars (FVT-049: avatar and colour).
export const COLORS = Object.freeze({
  gold: { hex: "#dfbd78", it: "Oro", en: "Gold" },
  sage: { hex: "#9cc295", it: "Salvia", en: "Sage" },
  sky: { hex: "#8fb6d8", it: "Cielo", en: "Sky" },
  rose: { hex: "#e19a92", it: "Rosa", en: "Rose" },
  violet: { hex: "#bba3dc", it: "Viola", en: "Violet" },
  stone: { hex: "#aab5bb", it: "Pietra", en: "Stone" },
});
export const EMBLEMS = Object.freeze({
  initials: { it: "Iniziali", en: "Initials" },
  dice: { it: "Dado", en: "Die" },
  sword: { it: "Spada", en: "Sword" },
  flag: { it: "Stendardo", en: "Banner" },
  book: { it: "Libro", en: "Book" },
  map: { it: "Mappa", en: "Map" },
  bag: { it: "Borsa", en: "Bag" },
});
export const IMAGE_SRC = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

export function activeAvatar(profile) {
  return profile.avatars.find((a) => a.id === profile.activeAvatarId) ?? profile.avatars[0];
}
// The avatar descriptor other people see (no local id).
export function publicAvatar(avatar) {
  if (!avatar) return null;
  const { kind, color, glyph, src } = avatar;
  return kind === "image"
    ? { kind, src }
    : kind === "emblem"
      ? { kind, color, glyph }
      : { kind, color };
}
// The avatar every member list and chat shows for an identity: its account's active
// avatar. The account data is the one source; null when there is none, so the reader
// keeps its own monogram.
export function publishedAvatar(state, identityId) {
  const profile = state?.ext?.account?.profiles?.[identityId];
  return Array.isArray(profile?.avatars) && profile.avatars.length
    ? publicAvatar(activeAvatar(profile))
    : null;
}
// Initials as the campaign member list (B13) draws them: first letters of the first two
// words, or the first two letters of a single word. Punctuation never becomes an initial.
export function initialsOf(name) {
  const words = String(name ?? "")
    .split(/[\s/._-]+/)
    .map((w) => [...w].filter((ch) => /[\p{L}\p{N}]/u.test(ch)))
    .filter((w) => w.length);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : [words[0][0], words[1][0]])
    .join("")
    .toLocaleUpperCase();
}
export function colorFor(seed) {
  const keys = Object.keys(COLORS);
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return keys[hash % keys.length];
}
// Avatar markup. `name` gives the initials and a stable colour for records without an
// avatar. Decorative: the name is always written next to it. With `className` the reader
// keeps its own box (size, border) and this fills it: B13 passes "cm-avatar", the chat
// "chat-avatar chat-avatar-user".
export function avatarHTML(avatar, name, { size = "md", esc = escape, className = "" } = {}) {
  const color = COLORS[avatar?.color] ? avatar.color : colorFor(name);
  const image = avatar?.kind === "image" && IMAGE_SRC.test(String(avatar.src));
  const emblem =
    avatar?.kind === "emblem" &&
    Object.hasOwn(EMBLEMS, avatar.glyph) &&
    avatar.glyph !== "initials";
  const content = image
    ? `<img src="${esc(avatar.src)}" alt="">`
    : emblem
      ? icon(avatar.glyph)
      : esc(initialsOf(name));
  if (className) {
    const cls = String(className).replace(/[^\w -]/g, "");
    const style = image ? "" : ` style="background:${COLORS[color].hex};color:#17232e"`;
    return `<span class="${cls} account-avatar-in${image ? " is-image" : ""}"${style} aria-hidden="true">${content}</span>`;
  }
  const cls = `account-avatar account-avatar-${size === "lg" || size === "sm" ? size : "md"}`;
  if (image) return `<span class="${cls} is-image" aria-hidden="true">${content}</span>`;
  return `<span class="${cls}" style="--account-avatar-bg:${COLORS[color].hex}" aria-hidden="true">${content}</span>`;
}
