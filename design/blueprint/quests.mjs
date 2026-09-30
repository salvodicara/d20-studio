// Area B43 — quests, factions, reputation and structured journal. Entry module loaded by
// extensions.mjs through the B11 registry. It registers one state slice (per campaign),
// two campaign sections (Missioni, Archivio), the quests tab of the Table sidebar, a box of
// the sheet's Story tab, an entry-page panel, search, palette commands, a personal
// setting and the archive editor's draft guard. Quest rules live here; typed pages,
// links and views in journal-plus.mjs; reputation and relations in factions.mjs.
//
// Adopted patterns (census IDs): Forien's Quest Log tabs In progress / Available /
// Completed / Failed and a GM-only Hidden tab, objectives and sub-objectives as
// checkboxes, quest giver, rewards, GM notes apart from player notes and a quest tracker
// at the Table (FVT-058); BG3 quest journal: list and detail, objectives, latest updates
// first, a completed category (CRP-062); Kanka quest Elements (CMP-32). Rewards are only
// delivered by an explicit DM command (F-015: no automatic reward); an item reaches the
// character's inventory and coins the purse through the B26 party-stash functions.

import {
  ARCHIVE,
  QUEST_STATUSES,
  SLICE,
  STATUS_LABELS,
  TYPE_LABELS,
  VERSION,
  attempt,
  bindArchive,
  bindCommon,
  bindViews,
  showActiveTab,
  change,
  clearTabs,
  createPage,
  dataOf,
  dateText,
  deviceStorage,
  discardArchiveDraft,
  fail,
  findPage,
  hasArchiveDraft,
  isDM,
  isMember,
  labelText,
  listPages,
  listViews,
  manageFocus,
  mutableData,
  newId,
  normalizeQuests,
  openPage,
  openViewDialog,
  partyCharacters,
  personalNotePanel,
  questProgress,
  readPage,
  refInfo,
  renderArchive,
  renderBlocks,
  renderViewResult,
  requireDM,
  seedQuests,
  undoButton,
} from "./journal-plus.mjs";
import {
  bindFactions,
  relationsPanel,
  relationsScreen,
  reputationScreen,
  sheetReputation,
  standingPanel,
} from "./factions.mjs";
import { listCampaignEntries } from "./campaign-content.mjs";
import { customItem, givePurse, giveItemToActor } from "./party-stash.mjs";

export { questProgress };
const L = (it, en) => ({ it, en });
const now = () => new Date().toISOString();
const str = (value) => (typeof value === "string" ? value : "");
export const LOG = "quests";

// ---------------------------------------------------------------------------------------
// Quest domain (DM authority; every command throws a {it, en} refusal)

function questIn(state, role, pageId) {
  requireDM(state, role);
  const page = mutableData(state).pages.find((row) => row.id === pageId && row.type === "quest");
  return page ?? fail("Missione non trovata.", "Quest not found.");
}
const touch = (page) => (page.updatedAt = now());
const STATUS_TEXT = {
  active: L("Missione in corso.", "Quest in progress."),
  available: L("Missione disponibile.", "Quest available."),
  completed: L("Missione completata.", "Quest completed."),
  failed: L("Missione fallita.", "Quest failed."),
  hidden: L("Missione nascosta ai giocatori.", "Quest hidden from the players."),
};
export function setQuestStatus(state, role, pageId, status, reason = "") {
  const page = questIn(state, role, pageId);
  if (!QUEST_STATUSES.includes(status)) fail("Stato non valido.", "Invalid status.");
  if (page.status === status)
    fail("La missione ha già questo stato.", "The quest already has this status.");
  const text = str(reason).trim();
  if (text.length > 300) fail("Motivo: massimo 300 caratteri.", "Reason: at most 300 characters.");
  const reopening =
    ["completed", "failed"].includes(page.status) && ["active", "available"].includes(status);
  if (reopening && !text)
    fail(
      "Per riaprire una missione conclusa scrivi il motivo della correzione.",
      "To reopen a closed quest, write the reason for the correction.",
    );
  page.status = status;
  touch(page);
  page.updates.push({
    id: newId("update"),
    at: now(),
    kind: "status",
    status,
    text: text || STATUS_TEXT[status],
    visibility: status === "hidden" ? "dm" : "all",
    ...(reopening ? { correction: true } : {}),
  });
}
function objectiveIn(page, id) {
  return (
    page.objectives.find((row) => row.id === id) ??
    fail("Obiettivo non trovato.", "Objective not found.")
  );
}
export function toggleObjective(state, role, pageId, objectiveId, done) {
  const page = questIn(state, role, pageId);
  objectiveIn(page, objectiveId).done = done === true;
  touch(page);
}
export function addObjective(state, role, pageId, { text, parentId = null, hidden = false } = {}) {
  const page = questIn(state, role, pageId);
  const value = str(text).trim();
  if (!value || value.length > 300)
    fail(
      "Scrivi l’obiettivo (massimo 300 caratteri).",
      "Write the objective (300 characters at most).",
    );
  if (page.objectives.length >= 40) fail("Massimo 40 obiettivi.", "At most 40 objectives.");
  if (parentId && objectiveIn(page, parentId).parentId)
    fail(
      "Gli obiettivi hanno un solo livello di sotto-obiettivi.",
      "Objectives have one level of sub-objectives only.",
    );
  const id = newId("obj");
  page.objectives.push({
    id,
    text: value,
    done: false,
    parentId: parentId || null,
    hidden: hidden === true,
  });
  touch(page);
  return id;
}
export function setObjectiveHidden(state, role, pageId, objectiveId, hidden) {
  const page = questIn(state, role, pageId);
  objectiveIn(page, objectiveId).hidden = hidden === true;
  touch(page);
}
export function removeObjective(state, role, pageId, objectiveId) {
  const page = questIn(state, role, pageId);
  objectiveIn(page, objectiveId);
  page.objectives = page.objectives.filter(
    (row) => row.id !== objectiveId && row.parentId !== objectiveId,
  );
  touch(page);
}
export function addReward(
  state,
  role,
  pageId,
  { kind, text, quantity = 1, gp = null, secret = false } = {},
) {
  const page = questIn(state, role, pageId);
  if (!["item", "coins", "other"].includes(kind))
    fail("Tipo di ricompensa non valido.", "Invalid reward type.");
  const value = str(text).trim();
  if (!value || value.length > 120)
    fail(
      "Descrivi la ricompensa (massimo 120 caratteri).",
      "Describe the reward (120 characters at most).",
    );
  const count = Number(quantity);
  if (kind === "item" && (!Number.isInteger(count) || count < 1 || count > 999))
    fail("La quantità va da 1 a 999.", "Quantity ranges from 1 to 999.");
  const gold = Number(gp);
  if (kind === "coins" && (!Number.isInteger(gold) || gold < 1 || gold > 100000))
    fail("Indica le monete d’oro, da 1 a 100000.", "Enter the gold pieces, from 1 to 100000.");
  if (page.rewards.length >= 20) fail("Massimo 20 ricompense.", "At most 20 rewards.");
  const id = newId("reward");
  page.rewards.push({
    id,
    kind,
    text: value,
    quantity: kind === "item" ? count : 1,
    gp: kind === "coins" ? gold : null,
    secret: secret === true,
    deliveries: [],
  });
  touch(page);
  return id;
}
function rewardIn(page, id) {
  return (
    page.rewards.find((row) => row.id === id) ??
    fail("Ricompensa non trovata.", "Reward not found.")
  );
}
export function setRewardSecret(state, role, pageId, rewardId, secret) {
  const page = questIn(state, role, pageId);
  rewardIn(page, rewardId).secret = secret === true;
  touch(page);
}
export function removeReward(state, role, pageId, rewardId) {
  const page = questIn(state, role, pageId);
  rewardIn(page, rewardId);
  page.rewards = page.rewards.filter((row) => row.id !== rewardId);
  touch(page);
}
/** Explicit delivery (F-015): an item to the inventory, coins to the purse (B26 functions). */
export function deliverReward(state, role, pageId, rewardId, actorId) {
  const page = questIn(state, role, pageId);
  const reward = rewardIn(page, rewardId);
  if (reward.kind === "other")
    fail(
      "Questa ricompensa è narrativa: non va in una scheda.",
      "This reward is narrative: it does not go on a sheet.",
    );
  if (reward.deliveries.length) fail("Ricompensa già consegnata.", "Reward already delivered.");
  const actor = partyCharacters(state).find((row) => row.id === actorId);
  if (!actor) fail("Scegli un personaggio del gruppo.", "Choose a party character.");
  if (reward.kind === "item")
    giveItemToActor(
      actor,
      customItem({ name: reward.text, quantity: reward.quantity }),
      reward.quantity,
    );
  else givePurse(actor, { gp: reward.gp }, state.ext?.loot ?? null, "dm");
  reward.deliveries.push({ actorId, at: now() });
  touch(page);
}
export function addQuestUpdate(state, role, pageId, { text, visibility = "all" } = {}) {
  const page = questIn(state, role, pageId);
  const value = str(text).trim();
  if (!value || value.length > 600)
    fail(
      "Scrivi l’aggiornamento (massimo 600 caratteri).",
      "Write the update (600 characters at most).",
    );
  if (page.updates.length >= 200) fail("Troppi aggiornamenti.", "Too many updates.");
  page.updates.push({
    id: newId("update"),
    at: now(),
    kind: "note",
    text: value,
    visibility: visibility === "dm" ? "dm" : "all",
  });
  touch(page);
}
export function setDmNotes(state, role, pageId, text) {
  const page = questIn(state, role, pageId);
  const value = str(text);
  if (value.length > 2000) fail("Note: massimo 2000 caratteri.", "Notes: at most 2000 characters.");
  page.dmNotes = value;
}
export function questsByStatus(state, role) {
  const groups = { active: [], available: [], completed: [], failed: [] };
  if (isDM(state, role)) groups.hidden = [];
  for (const page of listPages(state, role, { type: "quest" })) groups[page.status]?.push(page);
  for (const list of Object.values(groups))
    list.sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));
  return groups;
}
const CORE_STATUS = {
  open: "active",
  completed: "completed",
  failed: "failed",
  abandoned: "failed",
};
/** Objectives written in the core Journal (campaign-content 'quest' entries), read only. */
export function coreObjectives(state, role) {
  if (!isMember(state, role)) return [];
  return listCampaignEntries(state, { campaignId: state.campaign?.id, kind: "quest" }, role).map(
    (entry) => ({
      id: entry.id,
      title: entry.data.title || "",
      status: CORE_STATUS[entry.data.questStatus] ?? "active",
      abandoned: entry.data.questStatus === "abandoned",
    }),
  );
}

// =======================================================================================
// UI: quest log (Missioni), quest sections shared with the archive, Table tracker.
// =======================================================================================

const statusLabel = (ctx, status) => ctx.label(STATUS_LABELS[status]);
// Forien's Quest Log names its lists in the plural (In progress, Available, Completed...).
const TAB_LABELS = {
  active: L("In corso", "In progress"),
  available: L("Disponibili", "Available"),
  completed: L("Completate", "Completed"),
  failed: L("Fallite", "Failed"),
  hidden: L("Nascoste", "Hidden"),
};
function logTarget(ctx) {
  const id = ctx.view.id ?? "";
  if (id.startsWith("q:")) return { questId: id.slice(2) };
  if (id.startsWith("status:")) return { status: id.slice(7) };
  if (id.startsWith("view:")) return { viewId: id.slice(5) };
  return {};
}
function giverText(ctx, page) {
  const info = page.giver ? refInfo(ctx.state, page.giver, ctx.role) : null;
  if (!info) return "";
  const label = ctx.esc(ctx.label(info.label));
  const control =
    info.kind === "page"
      ? `<button type="button" class="jp-link" data-jp-open="${ctx.esc(info.id)}">${label}</button>`
      : `<button type="button" class="jp-link" data-jp-route="${ctx.esc(JSON.stringify(info.route))}">${label}</button>`;
  return `<p class="campaign-meta">${ctx.t("Committente", "Quest giver")}: ${control}</p>`;
}
function statusActions(ctx, page) {
  if (!isDM(ctx.state, ctx.role)) return "";
  const button = (status, label, style = "") =>
    `<button type="button" class="button ${style}" data-q-status="${status}" data-q-page="${ctx.esc(page.id)}">${label}</button>`;
  const actions = {
    active: [
      button("completed", ctx.t("Segna completata", "Mark completed"), "primary"),
      button("failed", ctx.t("Segna fallita", "Mark failed")),
      button("hidden", ctx.t("Nascondi ai giocatori", "Hide from players"), "quiet"),
    ],
    available: [
      button("active", ctx.t("Avvia: in corso", "Start: in progress"), "primary"),
      button("hidden", ctx.t("Nascondi ai giocatori", "Hide from players"), "quiet"),
    ],
    hidden: [
      button("available", ctx.t("Mostra come disponibile", "Show as available"), "primary"),
      button("active", ctx.t("Mostra come in corso", "Show as in progress")),
    ],
    completed: [
      `<button type="button" class="button" data-q-reopen="${ctx.esc(page.id)}">${ctx.t("Riapri…", "Reopen…")}</button>`,
    ],
    failed: [
      `<button type="button" class="button" data-q-reopen="${ctx.esc(page.id)}">${ctx.t("Riapri…", "Reopen…")}</button>`,
    ],
  };
  return `<div class="campaign-toolbar jp-status-actions">${(actions[page.status] ?? []).join("")}</div>`;
}
function objectivesPanel(ctx, page) {
  const dm = isDM(ctx.state, ctx.role);
  const { done, total } = questProgress(page);
  const top = page.objectives.filter((row) => !row.parentId);
  const item = (row) => {
    const kids = page.objectives.filter((child) => child.parentId === row.id);
    const control = dm
      ? `<label class="campaign-check jp-objective-check"><input type="checkbox" data-q-toggle="${ctx.esc(row.id)}" data-q-page="${ctx.esc(page.id)}" ${row.done ? "checked" : ""}><span>${ctx.esc(row.text)}</span></label>`
      : `<p class="jp-objective-text"><span class="jp-mark" aria-hidden="true">${row.done ? ctx.icon("check") : ""}</span><span class="jp-sr">${row.done ? ctx.t("Completato: ", "Done: ") : ctx.t("Da fare: ", "To do: ")}</span>${ctx.esc(row.text)}</p>`;
    const tools = dm
      ? `<span class="jp-objective-tools">${row.hidden ? `<span class="badge">${ctx.t("Nascosto", "Hidden")}</span>` : ""}<button type="button" class="button quiet" data-q-objective-hidden="${ctx.esc(row.id)}" data-q-page="${ctx.esc(page.id)}" data-hidden="${row.hidden ? "false" : "true"}">${row.hidden ? ctx.t("Mostra", "Show") : ctx.t("Nascondi", "Hide")}</button><button type="button" class="button quiet" data-q-objective-remove="${ctx.esc(row.id)}" data-q-page="${ctx.esc(page.id)}" aria-label="${ctx.esc(ctx.t("Rimuovi l’obiettivo ", "Remove the objective ") + row.text)}">${ctx.icon("close")}</button></span>`
      : "";
    return `<li class="jp-objective ${row.done ? "is-done" : ""} ${row.hidden ? "is-hidden" : ""}"><div class="jp-objective-row">${control}${tools}</div>${kids.length ? `<ul class="jp-objective-list">${kids.map(item).join("")}</ul>` : ""}</li>`;
  };
  return `<section class="jp-panel jp-objectives"><h3>${ctx.t("Obiettivi", "Objectives")} <span class="campaign-meta">${done}/${total}</span></h3>${top.length ? `<ul class="jp-objective-list">${top.map(item).join("")}</ul>` : `<p class="campaign-meta">${ctx.t("Nessun obiettivo ancora.", "No objectives yet.")}</p>`}${
    dm
      ? `<form class="jp-inline-form" data-q-add-objective="${ctx.esc(page.id)}"><label class="field">${ctx.t("Nuovo obiettivo", "New objective")}<input name="text" maxlength="300" required></label><label class="field">${ctx.t("Sotto l’obiettivo", "Under the objective")}<select name="parentId"><option value="">${ctx.t("Nessuno (principale)", "None (main)")}</option>${top.map((row) => `<option value="${ctx.esc(row.id)}">${ctx.esc(row.text)}</option>`).join("")}</select></label><label class="campaign-check"><input type="checkbox" name="hidden">${ctx.t("Nascosto ai giocatori", "Hidden from players")}</label><button type="submit" class="button">${ctx.t("Aggiungi obiettivo", "Add objective")}</button></form>`
      : ""
  }</section>`;
}
const rewardKind = (ctx, kind) =>
  ({
    item: ctx.t("Oggetto", "Item"),
    coins: ctx.t("Monete", "Coins"),
    other: ctx.t("Altro", "Other"),
  })[kind];
function rewardsPanel(ctx, page) {
  const dm = isDM(ctx.state, ctx.role);
  if (!page.rewards.length && !dm) return "";
  const party = partyCharacters(ctx.state);
  const row = (reward) => {
    const delivered = reward.deliveries
      .map(
        (d) =>
          `${ctx.t("Consegnata a", "Delivered to")} ${ctx.esc(ctx.state.actors?.[d.actorId]?.name ?? d.actorId)} · ${ctx.esc(dateText(ctx, d.at))}`,
      )
      .join("; ");
    return `<li class="jp-reward ${reward.secret ? "is-secret" : ""}"><p><strong>${ctx.esc(reward.text)}</strong> <span class="badge">${rewardKind(ctx, reward.kind)}${reward.kind === "item" && reward.quantity > 1 ? ` ×${reward.quantity}` : ""}</span>${reward.secret ? ` <span class="badge jp-secret-tag">${ctx.t("Ricompensa segreta · Solo DM", "Secret reward · DM only")}</span>` : ""}</p>${delivered ? `<p class="campaign-meta">${delivered}</p>` : ""}${
      dm
        ? `<div class="campaign-toolbar">${
            reward.kind !== "other" && !reward.deliveries.length
              ? `<label class="field jp-inline-field">${ctx.t("Consegna a", "Deliver to")}<select data-q-deliver-target="${ctx.esc(reward.id)}">${party.map((actor) => `<option value="${ctx.esc(actor.id)}">${ctx.esc(actor.name)}</option>`).join("")}</select></label><button type="button" class="button" data-q-deliver="${ctx.esc(reward.id)}" data-q-page="${ctx.esc(page.id)}">${reward.kind === "coins" ? ctx.t("Consegna le monete", "Deliver the coins") : ctx.t("Consegna nell’inventario", "Deliver to the inventory")}</button>`
              : ""
          }<button type="button" class="button quiet" data-q-reward-secret="${ctx.esc(reward.id)}" data-q-page="${ctx.esc(page.id)}" data-secret="${reward.secret ? "false" : "true"}">${reward.secret ? ctx.t("Mostrala al gruppo", "Show it to the party") : ctx.t("Rendila segreta", "Make it secret")}</button><button type="button" class="button quiet" data-q-reward-remove="${ctx.esc(reward.id)}" data-q-page="${ctx.esc(page.id)}" aria-label="${ctx.esc(ctx.t("Rimuovi la ricompensa ", "Remove the reward ") + reward.text)}">${ctx.icon("close")}</button></div>`
        : ""
    }</li>`;
  };
  return `<section class="jp-panel jp-rewards"><h3>${ctx.t("Ricompense", "Rewards")}</h3>${page.rewards.length ? `<ul class="jp-reward-list">${page.rewards.map(row).join("")}</ul>` : `<p class="campaign-meta">${ctx.t("Nessuna ricompensa.", "No rewards.")}</p>`}${
    dm
      ? `<details class="jp-add"><summary>${ctx.t("Aggiungi una ricompensa", "Add a reward")}</summary><form class="jp-inline-form" data-q-add-reward="${ctx.esc(page.id)}"><label class="field">${ctx.t("Tipo", "Type")}<select name="kind"><option value="item">${rewardKind(ctx, "item")}</option><option value="coins">${rewardKind(ctx, "coins")}</option><option value="other">${ctx.t("Altro (favore, informazione)", "Other (favour, information)")}</option></select></label><label class="field">${ctx.t("Descrizione", "Description")}<input name="text" maxlength="120" required></label><label class="field">${ctx.t("Quantità (oggetto)", "Quantity (item)")}<input type="number" name="quantity" min="1" max="999" value="1"></label><label class="field">${ctx.t("Monete d’oro (monete)", "Gold pieces (coins)")}<input type="number" name="gp" min="1" max="100000"></label><label class="campaign-check"><input type="checkbox" name="secret">${ctx.t("Segreta: solo il DM la vede", "Secret: only the DM sees it")}</label><button type="submit" class="button">${ctx.t("Aggiungi ricompensa", "Add reward")}</button></form></details><p class="campaign-meta">${ctx.t("Consegnare è sempre una tua scelta: niente arriva nelle schede da solo.", "Delivering is always your choice: nothing reaches a sheet by itself.")}</p>`
      : ""
  }</section>`;
}
function updatesPanel(ctx, page) {
  const dm = isDM(ctx.state, ctx.role);
  return `<section class="jp-panel jp-updates"><h3>${ctx.t("Aggiornamenti", "Updates")} <span class="campaign-meta">${ctx.t("dal più recente", "latest first")}</span></h3>${page.updates.length ? `<ol class="jp-update-list">${page.updates.map((u) => `<li><p class="campaign-meta"><time datetime="${ctx.esc(u.at)}">${ctx.esc(dateText(ctx, u.at))}</time>${u.visibility === "dm" ? ` · <span class="badge">${ctx.t("Solo DM", "DM only")}</span>` : ""}${u.correction ? ` · <span class="badge">${ctx.t("Correzione", "Correction")}</span>` : ""}</p><p class="campaign-prose">${ctx.esc(labelText(ctx, u.text))}</p></li>`).join("")}</ol>` : `<p class="campaign-meta">${ctx.t("Nessun aggiornamento.", "No updates.")}</p>`}${
    dm
      ? `<form class="jp-inline-form" data-q-add-update="${ctx.esc(page.id)}"><label class="field">${ctx.t("Nuovo aggiornamento", "New update")}<textarea name="text" rows="2" maxlength="600" required></textarea></label><label class="field">${ctx.t("Chi lo legge", "Who reads it")}<select name="visibility"><option value="all">${ctx.t("Tutto il gruppo", "The whole party")}</option><option value="dm">${ctx.t("Solo DM", "DM only")}</option></select></label><button type="submit" class="button">${ctx.t("Aggiungi aggiornamento", "Add update")}</button></form>`
      : ""
  }</section>`;
}
function dmNotesPanel(ctx, page) {
  if (!isDM(ctx.state, ctx.role)) return "";
  return `<section class="jp-panel jp-dm-notes"><h3>${ctx.t("Note del DM", "DM notes")} <span class="badge">${ctx.t("Solo DM", "DM only")}</span></h3><label class="field"><span class="jp-sr">${ctx.t("Note del DM", "DM notes")}</span><textarea rows="3" maxlength="2000" data-q-dm-notes="${ctx.esc(page.id)}">${ctx.esc(page.dmNotes ?? "")}</textarea></label><button type="button" class="button" data-q-dm-notes-save="${ctx.esc(page.id)}">${ctx.t("Salva le note del DM", "Save the DM notes")}</button></section>`;
}
/** Status, objectives, rewards, updates and DM notes of a projected quest. */
export function questSections(ctx, page) {
  return `${statusActions(ctx, page)}${objectivesPanel(ctx, page)}${rewardsPanel(ctx, page)}${updatesPanel(ctx, page)}${dmNotesPanel(ctx, page)}`;
}
function questDetail(ctx, page) {
  const dm = isDM(ctx.state, ctx.role);
  const elements = page.elements.map((ref) => refInfo(ctx.state, ref, ctx.role)).filter(Boolean);
  return `<article class="jp-quest" aria-labelledby="q-title"><header class="jp-page-head"><div><p class="jp-kicker">${ctx.t("Missione", "Quest")} · <span class="badge jp-status jp-status-${page.status}">${ctx.esc(statusLabel(ctx, page.status))}</span></p><h2 id="q-title" tabindex="-1">${ctx.esc(page.title)}</h2>${giverText(ctx, page)}<p class="campaign-meta">${ctx.t("Aggiornata", "Updated")}: ${ctx.esc(dateText(ctx, page.updatedAt))}</p></div><div class="jp-page-actions">${dm ? `<button type="button" class="button" data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: ARCHIVE, id: "edit:" + page.id }))}">${ctx.icon("pen")}<span>${ctx.t("Modifica testo e dettagli", "Edit text and details")}</span></button>` : ""}<button type="button" class="button quiet" data-jp-open="${ctx.esc(page.id)}">${ctx.t("Apri nell’archivio", "Open in the archive")}</button></div></header>${renderBlocks(ctx, page)}${questSections(ctx, page)}${elements.length ? `<section class="jp-panel"><h3>${ctx.t("Elementi della missione", "Quest elements")}</h3><div class="jp-chips">${elements.map((info) => (info.kind === "page" ? `<button type="button" class="button quiet" data-jp-open="${ctx.esc(info.id)}">${ctx.esc(info.label)}</button>` : `<button type="button" class="button quiet" data-jp-route="${ctx.esc(JSON.stringify(info.route))}">${ctx.esc(ctx.label(info.label))}</button>`)).join("")}</div></section>` : ""}${personalNotePanel(ctx, page)}</article>`;
}
function newQuestDialog(ctx) {
  const givers = [
    ...listPages(ctx.state, ctx.role).filter((page) =>
      ["person", "organization", "shop", "place"].includes(page.type),
    ),
  ];
  ctx.dialog(
    ctx.t("Nuova missione", "New quest"),
    `<label class="field">${ctx.t("Titolo", "Title")}<input name="title" required maxlength="120" autocomplete="off"></label><label class="field">${ctx.t("Committente", "Quest giver")}<select name="giver"><option value="">${ctx.t("Nessuno", "None")}</option>${givers.map((page) => `<option value="${ctx.esc(page.id)}">${ctx.esc(page.title)} · ${ctx.esc(ctx.label(TYPE_LABELS[page.type]))}</option>`).join("")}</select></label><label class="field">${ctx.t("Stato iniziale", "Starting status")}<select name="status"><option value="hidden">${ctx.esc(statusLabel(ctx, "hidden"))} · ${ctx.t("solo DM", "DM only")}</option><option value="available">${ctx.esc(statusLabel(ctx, "available"))}</option><option value="active">${ctx.esc(statusLabel(ctx, "active"))}</option></select></label><label class="field">${ctx.t("Descrizione per il gruppo", "Description for the party")}<textarea name="text" rows="3" maxlength="4000"></textarea></label><label class="field">${ctx.t("Primo obiettivo (facoltativo)", "First objective (optional)")}<input name="objective" maxlength="300"></label>`,
    {
      submitLabel: ctx.t("Crea missione", "Create quest"),
      onSubmit: (formData) => {
        const id = change(ctx, ctx.t("Missione creata", "Quest created"), (draft) => {
          const created = createPage(draft, ctx.role, {
            type: "quest",
            title: String(formData.get("title") ?? ""),
            status: String(formData.get("status") ?? "hidden"),
            giver: formData.get("giver")
              ? { kind: "page", id: String(formData.get("giver")) }
              : null,
            access: { mode: "all", actorIds: [] },
            text: String(formData.get("text") ?? "").trim() || undefined,
          });
          const first = String(formData.get("objective") ?? "").trim();
          if (first) addObjective(draft, ctx.role, created, { text: first });
          return created;
        });
        ctx.navigate("campaign", { tab: LOG, id: "q:" + id });
      },
    },
  );
}
function reopenDialog(ctx, pageId, status = "active") {
  ctx.dialog(
    ctx.t("Riapri la missione", "Reopen the quest"),
    `<p>${ctx.t("La missione torna tra quelle in corso. Il motivo resta negli aggiornamenti come correzione.", "The quest goes back among those in progress. The reason stays in the updates as a correction.")}</p><label class="field">${ctx.t("Motivo della correzione", "Reason for the correction")}<textarea name="reason" rows="3" maxlength="300" required></textarea></label>`,
    {
      submitLabel: ctx.t("Riapri", "Reopen"),
      onSubmit: (formData) =>
        change(ctx, ctx.t("Missione riaperta", "Quest reopened"), (draft) =>
          setQuestStatus(draft, ctx.role, pageId, status, String(formData.get("reason") ?? "")),
        ),
    },
  );
}
function statusCommand(ctx, pageId, status) {
  const page = findPage(ctx.state, pageId);
  if (
    page &&
    ["completed", "failed"].includes(page.status) &&
    ["active", "available"].includes(status)
  ) {
    ctx.render();
    return reopenDialog(ctx, pageId, status);
  }
  change(ctx, ctx.t("Stato della missione cambiato", "Quest status changed"), (draft) =>
    setQuestStatus(draft, ctx.role, pageId, status),
  );
}
const formOf = (form) =>
  typeof FormData === "function" && form instanceof EventTarget ? new FormData(form) : null;
/** Handlers of quest sections, wherever they are rendered (log, archive, Table). */
export function bindQuest(root, ctx) {
  const run = (label, mutator) => attempt(ctx, () => change(ctx, label, mutator));
  root.querySelectorAll("[data-q-toggle]").forEach((input) => {
    input.onchange = () =>
      run(
        input.checked
          ? ctx.t("Obiettivo completato", "Objective completed")
          : ctx.t("Obiettivo riaperto", "Objective reopened"),
        (draft) =>
          toggleObjective(
            draft,
            ctx.role,
            input.dataset.qPage,
            input.dataset.qToggle,
            input.checked,
          ),
      );
  });
  root.querySelectorAll("[data-q-status]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () => statusCommand(ctx, button.dataset.qPage, button.dataset.qStatus));
  });
  root.querySelectorAll("[data-q-reopen]").forEach((button) => {
    button.onclick = () => reopenDialog(ctx, button.dataset.qReopen);
  });
  root.querySelectorAll("[data-q-objective-hidden]").forEach((button) => {
    button.onclick = () =>
      run(ctx.t("Visibilità dell’obiettivo cambiata", "Objective visibility changed"), (draft) =>
        setObjectiveHidden(
          draft,
          ctx.role,
          button.dataset.qPage,
          button.dataset.qObjectiveHidden,
          button.dataset.hidden === "true",
        ),
      );
  });
  root.querySelectorAll("[data-q-objective-remove]").forEach((button) => {
    button.onclick = () =>
      run(ctx.t("Obiettivo rimosso", "Objective removed"), (draft) =>
        removeObjective(draft, ctx.role, button.dataset.qPage, button.dataset.qObjectiveRemove),
      );
  });
  root.querySelectorAll("[data-q-deliver]").forEach((button) => {
    button.onclick = () => {
      const target = root.querySelector(`[data-q-deliver-target="${button.dataset.qDeliver}"]`);
      const actorId = target?.value;
      const name = ctx.state.actors?.[actorId]?.name ?? "";
      if (
        attempt(ctx, () =>
          ctx.commit(
            ctx.t(`Ricompensa consegnata a ${name}`, `Reward delivered to ${name}`),
            (draft) =>
              deliverReward(
                draft,
                ctx.role,
                button.dataset.qPage,
                button.dataset.qDeliver,
                actorId,
              ),
          ),
        )
      )
        ctx.toast(
          ctx.t(
            `Consegnata: la trovi nella scheda di ${name}.`,
            `Delivered: you find it on ${name}’s sheet.`,
          ),
        );
    };
  });
  root.querySelectorAll("[data-q-reward-secret]").forEach((button) => {
    button.onclick = () =>
      run(ctx.t("Visibilità della ricompensa cambiata", "Reward visibility changed"), (draft) =>
        setRewardSecret(
          draft,
          ctx.role,
          button.dataset.qPage,
          button.dataset.qRewardSecret,
          button.dataset.secret === "true",
        ),
      );
  });
  root.querySelectorAll("[data-q-reward-remove]").forEach((button) => {
    button.onclick = () =>
      run(ctx.t("Ricompensa rimossa", "Reward removed"), (draft) =>
        removeReward(draft, ctx.role, button.dataset.qPage, button.dataset.qRewardRemove),
      );
  });
  root.querySelectorAll("[data-q-dm-notes-save]").forEach((button) => {
    button.onclick = () => {
      const field = root.querySelector(`[data-q-dm-notes="${button.dataset.qDmNotesSave}"]`);
      if (
        run(ctx.t("Note del DM salvate", "DM notes saved"), (draft) =>
          setDmNotes(draft, ctx.role, button.dataset.qDmNotesSave, field?.value ?? ""),
        ) !== false
      )
        ctx.toast(ctx.t("Note del DM salvate.", "DM notes saved."));
    };
  });
  const onForm = (selector, handler) =>
    root.querySelectorAll(selector).forEach((form) => {
      form.onsubmit = (event) => {
        event.preventDefault();
        const data = formOf(form);
        if (data) handler(form, data);
      };
    });
  onForm("[data-q-add-objective]", (form, data) =>
    run(ctx.t("Obiettivo aggiunto", "Objective added"), (draft) =>
      addObjective(draft, ctx.role, form.dataset.qAddObjective, {
        text: String(data.get("text") ?? ""),
        parentId: data.get("parentId") ? String(data.get("parentId")) : null,
        hidden: data.get("hidden") === "on",
      }),
    ),
  );
  onForm("[data-q-add-reward]", (form, data) =>
    run(ctx.t("Ricompensa aggiunta", "Reward added"), (draft) =>
      addReward(draft, ctx.role, form.dataset.qAddReward, {
        kind: String(data.get("kind") ?? "item"),
        text: String(data.get("text") ?? ""),
        quantity: Number(data.get("quantity") || 1),
        gp: data.get("gp") ? Number(data.get("gp")) : null,
        secret: data.get("secret") === "on",
      }),
    ),
  );
  onForm("[data-q-add-update]", (form, data) =>
    run(ctx.t("Aggiornamento della missione", "Quest update"), (draft) =>
      addQuestUpdate(draft, ctx.role, form.dataset.qAddUpdate, {
        text: String(data.get("text") ?? ""),
        visibility: String(data.get("visibility") ?? "all"),
      }),
    ),
  );
  root.querySelectorAll("[data-q-open]").forEach((button) => {
    button.onclick = () => ctx.navigate("campaign", { tab: LOG, id: "q:" + button.dataset.qOpen });
  });
}

function renderLog(ctx) {
  if (!isMember(ctx.state, ctx.role))
    return `<header class="campaign-heading"><h1>${ctx.t("Missioni non disponibili", "Quests unavailable")}</h1></header>`;
  const dm = isDM(ctx.state, ctx.role);
  const groups = questsByStatus(ctx.state, ctx.role);
  const core = coreObjectives(ctx.state, ctx.role);
  const views = listViews(ctx.state, ctx.role).filter((view) => view.source === "quest");
  const target = logTarget(ctx);
  const selected = target.questId ? readPage(ctx.state, target.questId, ctx.role) : null;
  const view = target.viewId ? views.find((row) => row.id === target.viewId) : null;
  const tab =
    selected?.status ??
    (QUEST_STATUSES.includes(target.status) && groups[target.status] ? target.status : "active");
  const statuses = Object.keys(groups);
  const count = (status) =>
    groups[status].length + core.filter((row) => row.status === status).length;
  const nav = `<nav class="tabs jp-subnav" data-jp-strip data-jp-keep aria-label="${ctx.t("Registro delle missioni", "Quest log")}">${statuses.map((status) => `<button type="button" class="${!view && status === tab ? "active" : ""}" ${!view && status === tab ? 'aria-current="page"' : ""} data-q-tab="${status}">${ctx.esc(ctx.label(TAB_LABELS[status]))} (${count(status)})</button>`).join("")}${views.map((row) => `<button type="button" class="${view?.id === row.id ? "active" : ""}" ${view?.id === row.id ? 'aria-current="page"' : ""} data-jp-view="${ctx.esc(row.id)}">${ctx.icon("grid")}<span>${ctx.esc(labelText(ctx, row.name))}</span></button>`).join("")}<button type="button" data-jp-new-view>${ctx.icon("plus")}<span>${ctx.t("Nuova vista", "New view")}</span></button></nav>`;
  const heading = `<header class="campaign-heading jp-heading"><div><h1 tabindex="-1">${ctx.t("Missioni", "Quests")}</h1><p class="muted">${ctx.t("Obiettivi, ricompense e aggiornamenti del gruppo, dal più recente.", "The party’s objectives, rewards and updates, latest first.")}</p></div><div class="campaign-toolbar">${dm ? `<button type="button" class="button primary" data-q-new>${ctx.icon("plus")}<span>${ctx.t("Nuova missione", "New quest")}</span></button>` : ""}${undoButton(ctx)}</div></header>`;
  if (view)
    return `<div class="jp-log-page">${heading}${nav}<h2>${ctx.esc(labelText(ctx, view.name))}${view.shared ? "" : ` <span class="badge">${ctx.t("Solo io", "Only me")}</span>`}</h2>${renderViewResult(ctx, view)}${view.owner === ctx.role ? `<button type="button" class="button quiet" data-jp-delete-view="${ctx.esc(view.id)}">${ctx.t("Elimina questa vista", "Delete this view")}</button>` : ""}</div>`;
  const list = groups[tab] ?? [];
  const current = selected ?? list[0] ?? null;
  const items = list
    .map((page) => {
      const { done, total } = questProgress(page);
      const giver = page.giver ? refInfo(ctx.state, page.giver, ctx.role) : null;
      const active = page.id === current?.id;
      return `<li><button type="button" class="jp-quest-item ${active ? "active" : ""}" data-q-open="${ctx.esc(page.id)}" ${active ? 'aria-current="true"' : ""}><span class="jp-dir-title">${ctx.esc(page.title)}</span><span class="jp-dir-meta">${giver ? ctx.esc(ctx.label(giver.label)) + " · " : ""}${ctx.t("obiettivi", "objectives")} ${done}/${total}</span></button></li>`;
    })
    .join("");
  const coreItems = core
    .filter((row) => row.status === tab)
    .map(
      (row) =>
        `<li><button type="button" class="jp-quest-item" data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: "entry", id: row.id }))}"><span class="jp-dir-title">${ctx.esc(row.title || ctx.t("Obiettivo senza titolo", "Untitled objective"))}</span><span class="jp-dir-meta">${ctx.t("dal Diario", "from the Journal")}${row.abandoned ? " · " + ctx.t("abbandonato", "abandoned") : ""}</span></button></li>`,
    )
    .join("");
  const empty = `<p class="campaign-empty">${
    tab === "active"
      ? ctx.t("Nessuna missione in corso.", "No quest in progress.")
      : ctx.t("Nessuna missione in questo elenco.", "No quest in this list.")
  }</p>`;
  return `<div class="jp-log-page">${heading}${nav}<div class="jp-log"><ul class="jp-quest-list" data-jp-keep aria-label="${ctx.esc(ctx.label(TAB_LABELS[tab]))}">${items}${coreItems}</ul>${!items && !coreItems ? empty : ""}<section class="jp-quest-detail" aria-live="polite">${current ? questDetail(ctx, current) : ""}</section></div></div>`;
}
function bindLog(root, ctx, env) {
  bindCommon(root, ctx);
  showActiveTab(root);
  bindQuest(root, ctx);
  bindViews(root, ctx, env, { stay: LOG });
  root.querySelectorAll("[data-q-tab]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("campaign", { tab: LOG, id: "status:" + button.dataset.qTab });
  });
  root.querySelectorAll("[data-q-new]").forEach((button) => {
    button.onclick = () => newQuestDialog(ctx);
  });
  manageFocus(root, ctx, {
    route: (ctx.view.id ?? "").startsWith("q:") ? "#q-title" : ".jp-log-page h1",
    fallbacks: ["#q-title", ".jp-log-page h1"],
  });
}
function trackerPanel(ctx) {
  const quests = questsByStatus(ctx.state, ctx.role).active;
  const dm = isDM(ctx.state, ctx.role);
  return `<div class="jp-tracker"><div class="jp-tracker-head"><h3>${ctx.t("Missioni in corso", "Quests in progress")}</h3><button type="button" class="button quiet" data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: LOG }))}">${ctx.t("Apri il registro", "Open the log")}</button></div>${
    quests.length
      ? quests
          .map((page) => {
            const { done, total } = questProgress(page);
            return `<section class="jp-tracker-quest"><button type="button" class="jp-link jp-tracker-title" data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: LOG, id: "q:" + page.id }))}">${ctx.esc(page.title)}</button><p class="campaign-meta">${ctx.t("Obiettivi", "Objectives")} ${done}/${total}</p><ul class="jp-objective-list">${page.objectives
              // Forien's tracker: every visible objective stays listed, done ones ticked,
              // so a misclick can be unticked at the Table; the DM sees which are hidden.
              .map((row) =>
                dm
                  ? `<li class="jp-objective ${row.parentId ? "is-sub" : ""} ${row.hidden ? "is-hidden" : ""}"><label class="campaign-check jp-objective-check"><input type="checkbox" data-q-toggle="${ctx.esc(row.id)}" data-q-page="${ctx.esc(page.id)}" ${row.done ? "checked" : ""}><span>${ctx.esc(row.text)}${row.hidden ? ` <span class="badge">${ctx.t("Nascosto", "Hidden")}</span>` : ""}</span></label></li>`
                  : `<li class="jp-objective ${row.parentId ? "is-sub" : ""} ${row.done ? "is-done" : ""}"><p class="jp-objective-text"><span class="jp-mark" aria-hidden="true">${row.done ? ctx.icon("check") : ""}</span><span class="jp-sr">${row.done ? ctx.t("Completato: ", "Done: ") : ctx.t("Da fare: ", "To do: ")}</span>${ctx.esc(row.text)}</p></li>`,
              )
              .join("")}</ul></section>`;
          })
          .join("")
      : `<p class="campaign-meta">${ctx.t("Nessuna missione in corso.", "No quest in progress.")}</p>`
  }</div>`;
}
function entryPanel(ctx, entry) {
  const pages = listPages(ctx.state, ctx.role).filter((page) =>
    page.elements.some((ref) => ref.kind === "entry" && ref.id === entry.id),
  );
  if (!pages.length) return "";
  return `<section class="campaign-links jp-entry-panel"><h2>${ctx.t("Nell’archivio e nelle missioni", "In the archive and quests")}</h2><div class="campaign-toolbar">${pages.map((page) => `<button type="button" class="button quiet" ${page.type === "quest" ? `data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: LOG, id: "q:" + page.id }))}"` : `data-jp-open="${ctx.esc(page.id)}"`}>${ctx.esc(page.title)} <span class="campaign-meta">· ${ctx.esc(ctx.label(TYPE_LABELS[page.type]))}</span></button>`).join("")}</div></section>`;
}

// ---------------------------------------------------------------------------------------
// Registration

export function register(registry) {
  const member = (ctx) => Boolean(ctx?.state?.campaign?.id) && isMember(ctx.state, ctx.role);
  const env = {
    pageExtras: (ctx, page) => (page.type === "quest" ? questSections(ctx, page) : ""),
    pagePanels: (ctx, page) => `${standingPanel(ctx, page)}${relationsPanel(ctx, page)}`,
    bindPanels: (root, ctx) => {
      bindQuest(root, ctx);
      bindFactions(root, ctx);
    },
    reputationScreen,
    relationsScreen,
    suggestionsOn: (ctx) => registry.getSetting(ctx, "quests-links.suggest") !== false,
    setSuggestions: (ctx, value) =>
      registry.setSetting(ctx, "quests-links.suggest", value === true),
    setStatus: (ctx, pageId, status) => statusCommand(ctx, pageId, status),
  };
  registry.registerStateSlice(SLICE, {
    version: VERSION,
    // Gameplay-like snapshot: Undo restores the archive with the rest (a delivered reward
    // leaves the inventory with it); personal notes and private views are local commits.
    seed: seedQuests,
    normalize: normalizeQuests,
  });
  registry.registerStyles(new URL("./journal-plus.css", import.meta.url));
  registry.add("campaign-section", {
    id: LOG,
    group: "story",
    label: L("Missioni", "Quests"),
    order: 42,
    when: member,
    render: (ctx) => renderLog(ctx),
    bind: (el, ctx) => bindLog(el, ctx, env),
  });
  registry.add("campaign-section", {
    id: ARCHIVE,
    // B62: the campaign's wiki (Kanka entities, World Anvil articles) is an everyday entry,
    // first-visible with Journal and World; it keeps B58's graph three clicks away.
    group: "campaign",
    label: L("Archivio", "Archive"),
    order: 52,
    when: member,
    render: (ctx) => renderArchive(ctx, env),
    bind: (el, ctx) => bindArchive(el, ctx, env),
  });
  // Entry-level panel on a core Journal/World entry page (Kanka Elements, CMP-32): the
  // archive pages and quests that list this entry. Hidden from the sidebar (no entry).
  registry.add("campaign-section", {
    id: "quests.entry",
    label: L("Nell’archivio", "In the archive"),
    when: (ctx, entry) => Boolean(entry?.id) && member(ctx),
    render: (ctx, entry) => entryPanel(ctx, entry),
    bind: (el, ctx) => bindCommon(el, ctx),
  });
  registry.add("table-panel", {
    id: "quests-tracker",
    section: "journal",
    label: L("Missioni", "Quests"),
    placement: "sidebar-tab",
    icon: "check",
    order: 35,
    when: member,
    render: (ctx) => trackerPanel(ctx),
    bind: (el, ctx) => {
      bindCommon(el, ctx);
      bindQuest(el, ctx);
      manageFocus(el, ctx, { fallbacks: [".jp-tracker-head button"] });
    },
  });
  registry.add("sheet-section", {
    id: "quests-reputation",
    tab: "story",
    label: L("Reputazione e atteggiamenti", "Reputation and attitudes"),
    // Only a character of this campaign's party: a private or other-campaign character
    // (Iria) has no standing with the party's factions.
    when: (ctx, actor) =>
      member(ctx) && partyCharacters(ctx.state).some((row) => row.id === actor?.id),
    render: (ctx, actor) => sheetReputation(ctx, actor),
    bind: (el, ctx) => {
      bindCommon(el, ctx);
      bindFactions(el, ctx);
      manageFocus(el, ctx, { fallbacks: [".jp-sheet-box button"] });
    },
  });
  registry.add("search", {
    id: "quests-search",
    label: L("Missioni e archivio", "Quests and archive"),
    search: (ctx, query) =>
      member(ctx)
        ? listPages(ctx.state, ctx.role, { query })
            .slice(0, 20)
            .map((page) => ({
              title: page.title,
              excerpt:
                page.type === "quest"
                  ? L(
                      `Missione · ${STATUS_LABELS[page.status].it}`,
                      `Quest · ${STATUS_LABELS[page.status].en}`,
                    )
                  : TYPE_LABELS[page.type],
              page: "campaign",
              params:
                page.type === "quest"
                  ? { tab: LOG, id: "q:" + page.id }
                  : { tab: ARCHIVE, id: "p:" + page.id },
            }))
        : [],
  });
  registry.add("command", {
    id: "quests.open-log",
    label: L("Apri le missioni", "Open quests"),
    context: "global",
    when: member,
    run: (ctx) => ctx.navigate("campaign", { tab: LOG }),
  });
  registry.add("command", {
    id: "quests.open-archive",
    label: L("Apri l’archivio della campagna", "Open the campaign archive"),
    context: "global",
    when: member,
    run: (ctx) => ctx.navigate("campaign", { tab: ARCHIVE }),
  });
  // P9: the journal's commands, found by the words people use (CA-17, CA-19, CA-24, CA-82).
  const press = (selector) => globalThis.document?.querySelector?.(`#content ${selector}`)?.click();
  registry.add("command", {
    id: "quests.entry-history",
    label: L("Cronologia della voce", "Entry history"),
    description: L(
      "cronologia, versioni, modifiche, differenze, chi ha cambiato, ripristina una versione precedente",
      "history, versions, changes, differences, who changed it, restore an earlier version",
    ),
    context: "global",
    when: member,
    run: (ctx) => {
      if (ctx.view?.tab === "entry" && ctx.view.id) return void press("[data-campaign-timeline]");
      ctx.navigate("campaign", { tab: "journal" });
      ctx.toast(
        ctx.t(
          "Apri una voce del Diario o del Mondo: «Cronologia» è nella sua intestazione.",
          "Open a Journal or World entry: “History” is in its header.",
        ),
      );
    },
  });
  registry.add("command", {
    id: "quests.entry-sharing",
    label: L("Chi legge e chi modifica questa voce", "Who reads and edits this entry"),
    description: L(
      "permessi, condivisione, condividi, chi può leggere, chi può modificare, accesso, visibilità, solo io",
      "permissions, sharing, share, who can read, who can edit, access, visibility, only me",
    ),
    context: "global",
    when: member,
    run: (ctx) => {
      if (ctx.view?.tab === "entry" && ctx.view.id) {
        const button = globalThis.document?.querySelector?.(
          "#content [data-campaign-access], #content [data-campaign-invite]",
        );
        if (button) return void button.click();
        return void ctx.toast(
          ctx.t(
            "Solo l’autore della voce ne decide i lettori: chiediglielo.",
            "Only the entry’s author decides its readers: ask them.",
          ),
          true,
        );
      }
      ctx.navigate("campaign", { tab: "journal" });
      ctx.toast(
        ctx.t(
          "Apri una voce: «Gestisci condivisione» è nella sua intestazione.",
          "Open an entry: “Manage sharing” is in its header.",
        ),
      );
    },
  });
  registry.add("command", {
    id: "quests.new-world-entry",
    label: L("Nuova voce del mondo", "New world entry"),
    description: L(
      "nuova voce, persona, PNG, luogo, fazione, organizzazione, negozio, evento, elenco, checklist",
      "new entry, person, NPC, place, faction, organization, shop, event, checklist",
    ),
    context: "global",
    when: member,
    run: (ctx) => {
      ctx.navigate("campaign", { tab: "world" });
      press('[data-campaign-new="world"]');
    },
  });
  registry.add("command", {
    id: "quests.new-from-template",
    label: L("Nuova voce da un modello o kit", "New entry from a template or kit"),
    description: L(
      "modello, template, kit di proprietà, taverna, negozio, persona, usa un modello",
      "template, property kit, tavern, shop, person, use a template",
    ),
    context: "global",
    when: member,
    run: (ctx) => {
      ctx.navigate("campaign", { tab: "world" });
      press('[data-campaign-new-template="world"]');
    },
  });
  registry.add("command", {
    id: "quests.save-template",
    label: L("Salva questa voce come modello", "Save this entry as a template"),
    description: L("modello, template, salva come modello, riusa", "template, save as template, reuse"),
    context: "global",
    when: (ctx) =>
      member(ctx) &&
      ((ctx.view?.tab === "entry" && Boolean(ctx.view.id)) ||
        (ctx.view?.tab === ARCHIVE && String(ctx.view.id ?? "").startsWith("p:"))),
    run: () => press("[data-campaign-template], [data-jp-save-template]"),
  });
  registry.add("command", {
    id: "quests.new-view",
    label: L("Nuova vista salvata (tabella o schede)", "New saved view (table or cards)"),
    description: L(
      "vista, viste, tabella, schede, colonne, filtro, elenco filtrato, tutti i PNG",
      "view, views, table, cards, columns, filter, filtered list, all NPCs",
    ),
    context: "global",
    when: member,
    run: (ctx) => {
      ctx.navigate("campaign", { tab: "world" });
      press("[data-jp-new-view]");
    },
  });
  registry.add("command", {
    id: "quests.open-reputation",
    label: L("Apri reputazione e atteggiamenti", "Open reputation and attitudes"),
    context: "global",
    when: member,
    run: (ctx) => ctx.navigate("campaign", { tab: ARCHIVE, id: "reputation" }),
  });
  registry.add("settings", {
    id: "quests-links",
    label: L("Collegamenti dell’archivio", "Archive links"),
    scope: "personal",
    fields: [
      {
        id: "suggest",
        label: L(
          "Suggerisci collegamenti dai titoli riconosciuti (menzioni non collegate)",
          "Suggest links from recognised titles (unlinked mentions)",
        ),
        type: "boolean",
        default: true,
      },
    ],
  });
  registry.add("draft-guard", {
    id: "quests-editor",
    label: L("Pagina dell’archivio non salvata", "Unsaved archive page"),
    hasDraft: (ctx, next) => hasArchiveDraft(ctx, next),
    confirm: (ctx, proceed) =>
      ctx.dialog(
        ctx.t("Modifiche non salvate", "Unsaved changes"),
        `<p>${ctx.t("Hai modificato questa pagina dell’archivio senza salvarla. Se esci, le modifiche vanno perse.", "You changed this archive page without saving it. If you leave, the changes are lost.")}</p>`,
        {
          submitLabel: ctx.t("Scarta le modifiche", "Discard the changes"),
          cancelLabel: ctx.t("Continua a modificare", "Keep editing"),
          onSubmit: () => {
            discardArchiveDraft();
            proceed();
          },
        },
      ),
  });
  registry.on("reset", () => {
    clearTabs(deviceStorage());
    discardArchiveDraft();
  });
}
// Relations projection for B58 (graph) and other readers.
export { relationsGraph, listRelations, standingsFor } from "./factions.mjs";
export { dataOf, openPage };
