// Text embeds (B16): "@Embed[<ref>]" markers in authored text render a live block, as the
// dnd5e `@Embed` enricher does in Foundry journals (FVT-175). Core text renderers (the
// campaign entry prose) call renderTextWithEmbeds; areas register providers here from
// their register(registry), after their registry contributions validated. Everything
// else in the text stays escaped plain text; an unknown ref or a failing provider keeps
// the original marker as text, so nothing authored is ever lost or executed.

import { skills as SKILLS } from "./character-rules.mjs";
import { LABELS } from "./srd-sample.mjs";

// "+" joins a damage bonus to its dice (@Embed[damage:2d6+3:fire], CA-26).
const MARKER = /@Embed\[([A-Za-z0-9][A-Za-z0-9:._+-]{0,199})\]/g;
const providers = [];
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// provider: { id, accepts(ref) -> boolean, render(ctx, ref) -> HTML string,
// bind?(el, ctx, ref) }. One provider per id; registering the same id again replaces it
// (module reloads in tests), never duplicates it.
export function registerTextEmbed(provider) {
  if (
    !provider ||
    typeof provider.id !== "string" ||
    typeof provider.accepts !== "function" ||
    typeof provider.render !== "function"
  )
    throw new TypeError("A text embed provider needs id, accepts and render");
  const index = providers.findIndex((entry) => entry.id === provider.id);
  if (index >= 0) providers.splice(index, 1, provider);
  else providers.push(provider);
}
export function unregisterTextEmbed(id) {
  const index = providers.findIndex((entry) => entry.id === id);
  if (index >= 0) providers.splice(index, 1);
}
function providerFor(ref) {
  return providers.find((entry) => {
    try {
      return entry.accepts(ref);
    } catch {
      return false;
    }
  });
}
// The refs a text embeds, in order (for tests and previews).
export function embedRefs(text) {
  return [...String(text ?? "").matchAll(MARKER)].map((match) => match[1]);
}
export function renderTextWithEmbeds(ctx, text, plain = escape) {
  const value = String(text ?? "");
  let html = "",
    last = 0;
  for (const match of value.matchAll(MARKER)) {
    html += plain(value.slice(last, match.index));
    last = match.index + match[0].length;
    const ref = match[1],
      provider = providerFor(ref);
    let block = null;
    try {
      block = provider ? provider.render(ctx, ref) : null;
    } catch {
      block = null;
    }
    html +=
      typeof block === "string"
        ? `<div class="text-embed" data-text-embed="${escape(provider.id)}" data-text-embed-ref="${escape(ref)}">${block}</div>`
        : plain(match[0]);
  }
  // `plain` renders the text between markers (a page's own [[links]]); escaped by default.
  return html + plain(value.slice(last));
}
export function bindTextEmbeds(root, ctx) {
  for (const el of root?.querySelectorAll?.("[data-text-embed]:not([data-text-embed-bound])") ??
    []) {
    el.setAttribute("data-text-embed-bound", "");
    const provider = providers.find((entry) => entry.id === el.dataset.textEmbed);
    if (!provider?.bind) continue;
    try {
      provider.bind(el, ctx, el.dataset.textEmbedRef);
    } catch {
      el.setAttribute("data-text-embed-failed", "");
    }
  }
}

// ---------------------------------------------------------------- CA-26 roll and reward embeds

// dnd5e enrichers ([[/check]], [[/save]], [[/damage]]) and Quest Portal's roll and reward
// buttons, written as @Embed markers so every text renderer shows them: checks and saves
// (dice-tray provider), damage and rewards (compendium provider), random tables.
const DICE = /^(\d{1,2})d(4|6|8|10|12|20)([+-]\d{1,3})?$/;
export const REWARD_KINDS = Object.freeze(["xp", "cp", "sp", "ep", "gp", "pp"]);
export function parseDamageRef(ref) {
  const m = /^damage:([0-9d+-]{3,12})(?::([a-z]+))?$/.exec(String(ref ?? ""));
  if (!m || !DICE.test(m[1])) return null;
  const type = m[2] ?? null;
  if (type && !Object.hasOwn(LABELS.damageType, type)) return null;
  return { dice: m[1], type };
}
export function parseRewardRef(ref) {
  const m = /^reward:([a-z]{2}):(\d{1,7})$/.exec(String(ref ?? ""));
  if (!m || !REWARD_KINDS.includes(m[1]) || Number(m[2]) < 1) return null;
  return { kind: m[1], amount: Number(m[2]) };
}
// The marker for a picker choice, or null when a value is invalid.
export function embedMarker(choice = {}) {
  const dc = Number(choice.dc);
  const withDc = (ref) => (Number.isInteger(dc) && dc >= 1 && dc <= 40 ? `${ref}:${dc}` : ref);
  let ref = null;
  if (choice.kind === "skill" && SKILLS.some((s) => s.id === choice.skill))
    ref = withDc(`skill:${choice.skill}`);
  else if (["save", "check"].includes(choice.kind) && Object.hasOwn(LABELS.ability, choice.ability))
    ref = withDc(`${choice.kind}:${choice.ability}`);
  else if (choice.kind === "damage") {
    const dice = String(choice.dice ?? "").replace(/\s+/g, "").toLowerCase();
    ref = parseDamageRef(`damage:${dice}${choice.type ? `:${choice.type}` : ""}`)
      ? `damage:${dice}${choice.type ? `:${choice.type}` : ""}`
      : null;
  } else if (choice.kind === "reward")
    ref = parseRewardRef(`reward:${choice.reward}:${Number(choice.amount)}`)
      ? `reward:${choice.reward}:${Number(choice.amount)}`
      : null;
  else if (choice.kind === "table" && /^[A-Za-z0-9._-]{1,120}$/.test(String(choice.table ?? "")))
    ref = `table:${choice.table}`;
  return ref ? `@Embed[${ref}]` : null;
}
// Inserts a marker at the textarea's cursor and tells its editor (input event).
export function insertEmbed(textarea, marker) {
  if (!textarea || !marker) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const pad = before && !/\s$/.test(before) ? " " : "";
  textarea.value = before + pad + marker + textarea.value.slice(end);
  const at = start + pad.length + marker.length;
  textarea.setSelectionRange?.(at, at);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.focus?.();
}
// «Inserisci tiro» (Quest Portal's roll buttons): one dialog, then the marker is inserted.
// `tables` lists the random tables this viewer may embed ({id, name}).
export function openEmbedPicker(ctx, onInsert, { tables = null } = {}) {
  const t = ctx.t;
  // The campaign's random tables this viewer may roll (the DM: all; a player: shared ones).
  tables ??= (Array.isArray(ctx.state?.ext?.["random-tables"]?.tables)
    ? ctx.state.ext["random-tables"].tables
    : []
  ).filter((table) => ctx.role === "dm" || table.playersCanUse);
  const option = (value, label) => `<option value="${escape(value)}">${escape(label)}</option>`;
  const abilities = Object.entries(LABELS.ability)
    .map(([id, name]) => option(id, ctx.label(name)))
    .join("");
  const skills = SKILLS.map((s) => option(s.id, ctx.label(s.name))).join("");
  const types = `<option value="">${escape(t("Nessun tipo", "No type"))}</option>${Object.entries(LABELS.damageType).map(([id, name]) => option(id, ctx.label(name))).join("")}`;
  const rewards = [
    ["xp", t("Punti esperienza (PE)", "Experience points (XP)")],
    ["gp", t("Monete d’oro (mo)", "Gold pieces (gp)")],
    ["sp", t("Monete d’argento (ma)", "Silver pieces (sp)")],
    ["cp", t("Monete di rame (mr)", "Copper pieces (cp)")],
    ["ep", t("Monete di electrum (me)", "Electrum pieces (ep)")],
    ["pp", t("Monete di platino (mp)", "Platinum pieces (pp)")],
  ]
    .map(([id, label]) => option(id, label))
    .join("");
  const group = (kinds, html) =>
    `<div data-embed-group="${kinds}" ${kinds.split(" ").includes("skill") ? "" : "hidden"}>${html}</div>`;
  ctx.dialog(
    t("Inserisci un tiro nel testo", "Insert a roll into the text"),
    `<label class="field">${t("Che cosa", "What")}<select name="kind" data-embed-kind>${[
      ["skill", t("Prova di abilità (es. Atletica CD 12)", "Skill check (e.g. Athletics DC 12)")],
      ["save", t("Tiro salvezza (es. Destrezza CD 13)", "Saving throw (e.g. Dexterity DC 13)")],
      ["check", t("Prova di caratteristica", "Ability check")],
      ["damage", t("Danni (es. 2d6 fuoco)", "Damage (e.g. 2d6 fire)")],
      ["reward", t("Ricompensa (PE o monete)", "Reward (XP or coins)")],
      ...(tables.length ? [["table", t("Tabella casuale", "Random table")]] : []),
    ]
      .map(([id, label]) => option(id, label))
      .join("")}</select></label>${group("skill", `<label class="field">${t("Abilità", "Skill")}<select name="skill">${skills}</select></label>`)}${group("save check", `<label class="field">${t("Caratteristica", "Ability")}<select name="ability">${abilities}</select></label>`)}${group("skill save check", `<label class="field">${t("CD (facoltativa)", "DC (optional)")}<input type="number" name="dc" min="1" max="40" inputmode="numeric"></label>`)}${group("damage", `<label class="field">${t("Dadi", "Dice")}<input name="dice" value="2d6" placeholder="2d6+3" autocomplete="off"></label><label class="field">${t("Tipo di danno", "Damage type")}<select name="type">${types}</select></label>`)}${group("reward", `<label class="field">${t("Ricompensa", "Reward")}<select name="reward">${rewards}</select></label><label class="field">${t("Quantità", "Amount")}<input type="number" name="amount" min="1" value="100" inputmode="numeric"></label>`)}${tables.length ? group("table", `<label class="field">${t("Tabella", "Table")}<select name="table">${tables.map((x) => option(x.id, ctx.label(x.name))).join("")}</select></label>`) : ""}<p class="muted">${t("Nel testo compare un pulsante: chi legge tira (o assegna la ricompensa) senza uscire dalla nota.", "A button appears in the text: readers roll (or award the reward) without leaving the note.")}</p>`,
    {
      submitLabel: t("Inserisci", "Insert"),
      onSubmit: (form) => {
        const choice = Object.fromEntries(form.entries());
        const marker = embedMarker(choice);
        if (!marker)
          throw Object.assign(new Error("embed"), {
            it: "Controlla i valori: dadi come 2d6 o 2d6+3, CD da 1 a 40, quantità almeno 1.",
            en: "Check the values: dice like 2d6 or 2d6+3, DC from 1 to 40, amount at least 1.",
          });
        onInsert(marker);
      },
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog?.querySelector("[data-embed-kind]")?.addEventListener("change", (event) => {
    dialog.querySelectorAll("[data-embed-group]").forEach((el) => {
      el.hidden = !el.dataset.embedGroup.split(" ").includes(event.target.value);
    });
  });
}
