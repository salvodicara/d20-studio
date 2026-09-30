// B50 — Campaign data: copy, archive, snapshots, export and trash (Campaign area).
//
// One campaign section, "Dati della campagna", for the DM and co-DMs of the campaign in
// play (Kanka keeps Export and Recovery in the campaign's settings, CMP-210/CMP-212;
// Roll20 keeps Copy Game and Roll Back Game on the game's page, R20-066/R20-068):
// - Snapshots named by the DM, the last 14 kept (LegendKeeper CMP-216), with "Show
//   changes" and "Restore as copy" (Obsidian CMP-221, Fantasy Grounds R20-083).
// - Copy the campaign with a checklist of components (Roll20 Copy Game R20-066, SVC-077).
// - Export: prepare JSON or Markdown, "ready" notice, download for 120 minutes (Kanka
//   SVC-084, SVC-153); import a JSON file as a new campaign after a preview.
// - Copy a scene into another own campaign with an overwrite warning (Transmogrifier
//   R20-067).
// - Archive with the list of what stays blocked and Restore (Roll20 cold storage R20-206);
//   delete by typing the name (Foundry FVT-003) into a 30-day trash (Kanka CMP-212).
// Domain rules and sources: campaign-data-domain.mjs. Synthetic data, local only.

import * as D from "./campaign-data-domain.mjs";
import * as cm from "./campaign-members.mjs";

export const ID = D.ID;
const SECTION = "campaign-data";

// ---------------------------------------------------------------- helpers

const locale = (ctx) => (ctx.lang === "en" ? "en-GB" : "it-IT");
const when = (ctx, value) =>
  value
    ? new Date(value).toLocaleString(locale(ctx), { dateStyle: "medium", timeStyle: "short" })
    : "—";
const clock = (ctx, value) =>
  new Date(value).toLocaleTimeString(locale(ctx), { hour: "2-digit", minute: "2-digit" });
const day = (ctx, value) =>
  new Date(value).toLocaleDateString(locale(ctx), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const size = (ctx, bytes) =>
  `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale(ctx))} KB`;
const say = (ctx, value) => ctx.label(value);
const errorText = (ctx, error) =>
  error?.it && error?.en
    ? ctx.label({ it: error.it, en: error.en })
    : String(error?.message ?? error);
const nameOf = (ctx, id) => cm.personName(ctx.state, id, ctx.lang);
// Loaded area slices; `normalize` checks area data read from an imported file.
const slicesOf = (ctx) =>
  (ctx.registry?.slices?.() ?? []).map(({ name, version, normalize }) => ({
    name,
    version,
    normalize,
  }));
const snapshotTitle = (ctx, row) => row.name || say(ctx, row.label ?? "") || "—";

// Per-visit presentation state; never shared data.
const ui = { highlight: null, focus: null, pick: null };
function perform(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return undefined;
  }
}
// Data commands are administration, like B13's membership commands: global Undo keeps
// them (the slice is "preserve", B13's parked campaigns too), their log line is private
// to whoever acted and each has an explicit correction (delete the copy, recover from the
// trash, restore the archive). Sheets they create or remove, and the area data they write
// for a copy's campaign, scenes and creatures (missions, world, lights, looks), are
// replayed on the snapshots still in the undo stack, so nobody's Undo of an earlier move
// reverts them. Campaigns whose 30 days in the trash are over leave at the next data
// command.
function shared(ctx, label, mutator, { quiet = false, focus = null } = {}) {
  let result;
  const options = { undoable: false, visibility: "private" };
  // The render inside the commit moves focus to `focus` (a selector in the section).
  ui.focus = focus;
  try {
    ctx.commit(
      label,
      (draft) => {
        const before = {
          actors: structuredClone(draft.actors ?? {}),
          scenes: structuredClone(draft.scenes ?? []),
        };
        const linkedBefore = D.linkedState(draft);
        result = mutator(draft);
        D.purgeExpired(draft, Date.now());
        const delta = cm.membershipDelta(before, draft);
        const linked = D.linkedDelta(linkedBefore, draft);
        if (delta || linked.length)
          options.rebaseHistory = (snapshot) => {
            cm.applyMembershipDelta(snapshot, delta);
            D.applyLinkedDelta(snapshot, linked);
          };
      },
      options,
    );
  } catch (error) {
    ui.focus = null;
    throw error;
  }
  if (!quiet) ctx.toast(label);
  return result;
}
export function resetCampaignDataView() {
  ui.highlight = null;
  ui.focus = null;
  ui.pick = null;
}
export function download(name, type, content) {
  const doc = globalThis.document;
  if (!doc?.createElement || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// ---------------------------------------------------------------- render

function heading(ctx) {
  return `<header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.t("Dati della campagna", "Campaign data")}</h1><p class="muted">${ctx.esc(ctx.state.campaign?.name ?? "")}</p></div></header>`;
}
function snapshotsBlock(ctx, campaignId) {
  const rows = D.listSnapshots(ctx.state, campaignId);
  const list = rows.length
    ? `<ol class="cd-list" aria-label="${ctx.t("Istantanee salvate", "Saved snapshots")}">${rows
        .map((row) => {
          const title = ctx.esc(snapshotTitle(ctx, row));
          return `<li class="cd-row" data-cd-snapshot="${ctx.esc(row.id)}"><div class="cd-row-main"><p class="cd-row-title"><strong>${title}</strong> <span class="badge ${row.kind === "auto" ? "cd-auto" : ""}">${row.kind === "auto" ? ctx.t("automatica", "automatic") : ctx.t("manuale", "manual")}</span></p><small class="muted">${ctx.esc(when(ctx, row.createdAt))} · ${ctx.esc(nameOf(ctx, row.by))} · ${ctx.esc(size(ctx, row.bytes ?? 0))}</small></div><div class="toolbar cd-row-actions"><button type="button" class="button" data-cd="diff" data-id="${ctx.esc(row.id)}">${ctx.t("Mostra differenze", "Show changes")}</button><button type="button" class="button" data-cd="restore-copy" data-id="${ctx.esc(row.id)}">${ctx.t("Ripristina come copia…", "Restore as copy…")}</button><button type="button" class="button quiet cd-danger-text" data-cd="delete-snapshot" data-id="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Elimina l’istantanea «${snapshotTitle(ctx, row)}»`, `Delete snapshot “${snapshotTitle(ctx, row)}”`))}">${ctx.t("Elimina", "Delete")}</button></div></li>`;
        })
        .join("")}</ol>`
    : `<p class="cd-empty">${ctx.t("Nessuna istantanea. Creane una prima di una scelta importante, per esempio prima della battaglia.", "No snapshots yet. Take one before an important choice, for example before the battle.")}</p>`;
  return `<section class="cd-block" aria-labelledby="cd-snapshots-title"><div class="cd-block-heading"><h2 id="cd-snapshots-title">${ctx.t("Istantanee", "Snapshots")}</h2><button type="button" class="button primary" data-cd="snapshot">${ctx.icon("plus")} ${ctx.t("Crea istantanea…", "Take snapshot…")}</button></div><p class="cd-lead muted">${ctx.t(`Una fotografia della campagna da riprendere come copia, senza toccare quella in corso. Restano le ultime ${D.SNAPSHOT_KEEP}.`, `A picture of the campaign you can bring back as a copy, without touching the one in play. The last ${D.SNAPSHOT_KEEP} are kept.`)}</p>${list}</section>`;
}
function copyBlock(ctx) {
  return `<section class="cd-block" aria-labelledby="cd-copy-title"><div class="cd-block-heading"><h2 id="cd-copy-title">${ctx.t("Copia la campagna", "Copy the campaign")}</h2></div><p class="cd-lead muted">${ctx.t("Una campagna nuova e indipendente: scegli cosa portare (scene, creature, diario, materiali…). Le schede dei giocatori e le note «Solo io» degli altri non si copiano.", "A new, independent campaign: choose what to bring (scenes, creatures, journal, materials…). Players’ sheets and other people’s “Only me” notes are never copied.")}</p><button type="button" class="button" data-cd="copy">${ctx.t("Copia la campagna…", "Copy the campaign…")}</button></section>`;
}
function exportBlock(ctx, campaignId) {
  const ownPrivate = D.ownPrivateCount(ctx.state, campaignId, ctx.role);
  const ready = D.readyExports(ctx.state, ctx.role);
  const readyList = ready.length
    ? `<ul class="cd-list" aria-label="${ctx.t("Esportazioni pronte", "Ready exports")}">${ready
        .map(
          (row) =>
            `<li class="cd-row" data-cd-export="${ctx.esc(row.id)}"><div class="cd-row-main"><p class="cd-row-title"><strong>${ctx.esc(row.fileName)}</strong></p><small class="muted">${row.format === "json" ? "JSON" : "Markdown"} · ${ctx.esc(row.campaignName)} · ${ctx.t("pronta alle", "ready at")} ${ctx.esc(clock(ctx, row.createdAt))} · ${ctx.t("scade alle", "expires at")} ${ctx.esc(clock(ctx, row.expiresAt))} · ${ctx.esc(size(ctx, row.bytes))}${row.includeOwnPrivate ? ` · ${ctx.t("con le tue note «Solo io»", "with your “Only me” notes")}` : ""}</small></div><button type="button" class="button primary" data-cd="download" data-id="${ctx.esc(row.id)}">${ctx.t("Scarica", "Download")}</button></li>`,
        )
        .join("")}</ul>`
    : `<p class="cd-empty">${ctx.t("Nessun file pronto.", "No file ready.")}</p>`;
  return `<section class="cd-block" aria-labelledby="cd-export-title" data-cd-export-block><div class="cd-block-heading"><h2 id="cd-export-title">${ctx.t("Esporta e importa", "Export and import")}</h2></div><form class="cd-export" data-cd-form="export"><fieldset class="cd-formats"><legend>${ctx.t("Formato", "Format")}</legend><label class="cd-choice"><input type="radio" name="format" value="json" checked><span><strong>JSON</strong><small>${ctx.t("Si reimporta come campagna nuova", "Re-imports as a new campaign")}</small></span></label><label class="cd-choice"><input type="radio" name="format" value="markdown"><span><strong>Markdown</strong><small>${ctx.t("Da leggere o archiviare", "To read or archive")}</small></span></label></fieldset><label class="cd-check"><input type="checkbox" name="includeOwnPrivate" ${ownPrivate ? "" : 'disabled aria-describedby="cd-export-private-why"'}><span>${ctx.t(`Includi le mie note «Solo io» (${ownPrivate})`, `Include my “Only me” notes (${ownPrivate})`)}${ownPrivate ? "" : `<small id="cd-export-private-why">${ctx.t("Non hai note «Solo io» in questa campagna. Scrivine una negli Appunti per includerla.", "You have no “Only me” notes in this campaign. Write one in Notes to include it.")}</small>`}</span></label><button type="submit" class="button primary">${ctx.t("Prepara l’esportazione", "Prepare export")}</button></form><h3>${ctx.t("Pronte da scaricare", "Ready to download")}</h3>${readyList}<p class="muted cd-note">${ctx.t(`I file restano scaricabili per ${D.EXPORT_MINUTES} minuti. Le note «Solo io» degli altri membri non entrano mai.`, `Files stay downloadable for ${D.EXPORT_MINUTES} minutes. Other members’ “Only me” notes never go in.`)}</p><h3>${ctx.t("Importa", "Import")}</h3><p class="muted cd-note">${ctx.t("Un file JSON di d20 Studio diventa una campagna nuova: prima vedi cosa contiene.", "A d20 Studio JSON file becomes a new campaign: you see what it holds first.")}</p><input type="file" accept=".json,application/json" data-cd-import-file hidden><button type="button" class="button" data-cd="import">${ctx.t("Importa da file…", "Import from file…")}</button></section>`;
}
function transferBlock(ctx) {
  const targets = D.copyTargets(ctx.state, ctx.role);
  const scenes = ctx.state.scenes ?? [];
  // P10 CA-88 (Roll20 Transmogrifier): any item, grouped by kind; scenes keep their check.
  const items = D.copyableItems(ctx.state, ctx.role);
  const groups = D.ITEM_KINDS.map((kind) => {
    const rows = items.filter((row) => row.kind === kind.kind);
    return rows.length
      ? `<optgroup label="${ctx.esc(say(ctx, kind.label))}">${rows.map((row) => `<option value="${ctx.esc(`${row.kind}:${row.id}`)}" ${ui.pick === `${row.kind}:${row.id}` ? "selected" : ""}>${ctx.esc(typeof row.name === "object" ? say(ctx, row.name) : row.name)}</option>`).join("")}</optgroup>`
      : "";
  }).join("");
  const body = targets.some((row) => row.status === "active")
    ? `<form class="cd-transfer" data-cd-form="scene-copy"><label class="field"><span>${ctx.t("Cosa copiare", "What to copy")}</span><select name="sceneId" required><optgroup label="${ctx.esc(ctx.t("Scene", "Scenes"))}">${scenes.map((scene) => `<option value="${ctx.esc(scene.id)}" ${ui.pick === scene.id || ui.pick === `scene:${scene.id}` ? "selected" : ""}>${ctx.esc(scene.name)}</option>`).join("")}</optgroup>${groups}</select></label><label class="field"><span>${ctx.t("Verso la campagna", "To campaign")}</span><select name="targetId" required>${targets
        .map(
          (row) =>
            `<option value="${ctx.esc(row.id)}" ${row.status === "active" ? "" : "disabled"}>${ctx.esc(row.name)}${row.status === "active" ? "" : ctx.t(" — archiviata", " — archived")}</option>`,
        )
        .join(
          "",
        )}</select></label><button type="submit" class="button">${ctx.t("Controlla e copia…", "Check and copy…")}</button></form>`
    : `<p class="cd-empty" id="cd-transfer-why">${ctx.t("Non hai altre campagne attive in cui copiare: creane una, poi torni qui a scegliere cosa copiare.", "You have no other active campaign to copy into: create one, then come back here to choose what to copy.")}</p><button type="button" class="button" data-cd="create-target" aria-describedby="cd-transfer-why">${ctx.t("Crea una campagna", "Create a campaign")}</button>`;
  return `<section class="cd-block" aria-labelledby="cd-transfer-title"><div class="cd-block-heading"><h2 id="cd-transfer-title">${ctx.t("Copia in un’altra campagna", "Copy to another campaign")}</h2></div><p class="cd-lead muted">${ctx.t("Porta una scena, una voce del Mondo o del Diario, una creatura, una dispensa, una tabella, un mazzo o un contenuto homebrew in un’altra tua campagna. Se c’è già una copia te lo diciamo prima.", "Bring a scene, a World or Journal entry, a creature, a handout, a table, a deck or homebrew content into another of your campaigns. If a copy is already there you are told first.")}</p>${body}</section>`;
}
function blockedList(ctx) {
  return `<ul>${D.ARCHIVE_BLOCKS.map((line) => `<li>${ctx.esc(say(ctx, line))}</li>`).join("")}</ul>`;
}
function campaignsBlock(ctx) {
  const current = ctx.state.campaign?.id;
  const owned = ["active", "archived"]
    .flatMap((status) => cm.listCampaigns(ctx.state, ctx.role, { status }))
    .filter((row) => row.role === "owner" || row.id === current);
  const rows = owned
    .map((row) => {
      const id = ctx.esc(row.id);
      const highlight = ui.highlight === row.id ? " is-new" : "";
      const details = `<button type="button" class="button quiet" data-cd="details" data-id="${id}">${ctx.t("Dettagli", "Details")}</button>`;
      // P10 CA-84/85 (Roll20 cold storage for any game): the campaign in play too.
      if (row.id === current && row.role !== "owner")
        return `<li class="cd-campaign" data-cd-campaign="${id}"><div class="cd-row-main"><p class="cd-row-title"><strong>${ctx.esc(row.name)}</strong> <span class="badge cd-live">${ctx.t("In corso", "Current")}</span></p><small class="muted">${ctx.t("Solo il proprietario può archiviarla o eliminarla.", "Only the owner can archive or delete it.")}</small></div></li>`;
      const live =
        row.id === current
          ? ` <span class="badge cd-live">${ctx.t("In corso", "Current")}</span>`
          : "";
      if (row.status === "archived") {
        const meta = cm.metaOf(ctx.state, row.id);
        return `<li class="cd-campaign is-archived${highlight}" data-cd-campaign="${id}"><div class="cd-row-main"><p class="cd-row-title"><strong>${ctx.esc(row.name)}</strong>${live} <span class="badge">${ctx.t("Archiviata", "Archived")}</span></p><small class="muted">${ctx.t("Archiviata il", "Archived on")} ${ctx.esc(when(ctx, meta?.archivedAt))}</small><details class="cd-blocked"><summary>${ctx.t(`Bloccato finché non la ripristini (${D.ARCHIVE_BLOCKS.length})`, `Blocked until you restore it (${D.ARCHIVE_BLOCKS.length})`)}</summary>${blockedList(ctx)}</details></div><div class="toolbar cd-row-actions">${details}<button type="button" class="button primary" data-cd="restore-archived" data-id="${id}">${ctx.t("Ripristina", "Restore")}</button><button type="button" class="button danger" data-cd="delete-campaign" data-id="${id}">${ctx.t("Elimina…", "Delete…")}</button></div></li>`;
      }
      return `<li class="cd-campaign${highlight}" data-cd-campaign="${id}"><div class="cd-row-main"><p class="cd-row-title"><strong>${ctx.esc(row.name)}</strong>${live} <span class="badge">${ctx.t("Attiva", "Active")}</span></p><small class="muted">${ctx.t("Creata il", "Created on")} ${ctx.esc(when(ctx, row.createdAt))}</small></div><div class="toolbar cd-row-actions">${details}<button type="button" class="button" data-cd="archive" data-id="${id}">${ctx.t("Archivia…", "Archive…")}</button><button type="button" class="button danger" data-cd="delete-campaign" data-id="${id}">${ctx.t("Elimina…", "Delete…")}</button></div></li>`;
    })
    .join("");
  const trash = D.listTrash(ctx.state, ctx.role);
  const trashRows = trash.length
    ? `<ul class="cd-campaigns" aria-label="${ctx.t("Cestino", "Trash")}">${trash
        .map((row) => {
          const id = ctx.esc(row.id);
          const info = row.trash;
          const window = info.expired
            ? ctx.t(
                "Periodo di recupero scaduto: sparirà al prossimo comando sui dati.",
                "Recovery period over: it leaves at the next data command.",
              )
            : ctx.t(
                `Eliminata il ${day(ctx, info.deletedAt)} · recuperabile fino al ${day(ctx, info.purgeAt)} (${info.daysLeft} ${info.daysLeft === 1 ? "giorno" : "giorni"})`,
                `Deleted on ${day(ctx, info.deletedAt)} · recoverable until ${day(ctx, info.purgeAt)} (${info.daysLeft} ${info.daysLeft === 1 ? "day" : "days"})`,
              );
          return `<li class="cd-campaign is-trashed" data-cd-trash="${id}"><div class="cd-row-main"><p class="cd-row-title"><strong>${ctx.esc(row.name)}</strong> <span class="badge cd-danger-badge">${ctx.t("Nel cestino", "In the trash")}</span></p><small class="muted" id="cd-trash-why-${id}">${ctx.esc(window)}</small></div><div class="toolbar cd-row-actions"><button type="button" class="button primary" data-cd="recover" data-id="${id}" ${info.expired ? `disabled aria-describedby="cd-trash-why-${id}"` : ""}>${ctx.t("Recupera", "Recover")}</button><button type="button" class="button danger" data-cd="purge" data-id="${id}">${ctx.t("Elimina definitivamente…", "Delete for good…")}</button></div></li>`;
        })
        .join("")}</ul>`
    : `<p class="cd-empty">${ctx.t("Il cestino è vuoto.", "The trash is empty.")}</p>`;
  return `<section class="cd-block cd-wide" aria-labelledby="cd-archive-title" data-cd-archive-block><div class="cd-block-heading"><h2 id="cd-archive-title">${ctx.t("Archivio e cestino", "Archive and trash")}</h2></div><p class="cd-lead muted">${ctx.t(`Archivia una campagna finita o ferma, anche quella in corso: resta com’è ma si blocca finché non la ripristini. Eliminata, resta nel cestino ${D.TRASH_DAYS} giorni.`, `Archive a finished or paused campaign, the one in play too: it stays as it is but is blocked until you restore it. Once deleted, it stays in the trash for ${D.TRASH_DAYS} days.`)}</p><ul class="cd-campaigns" aria-label="${ctx.t("Le tue campagne", "Your campaigns")}">${rows}</ul><h3 id="cd-trash-title" tabindex="-1">${ctx.t(`Cestino (${D.TRASH_DAYS} giorni)`, `Trash (${D.TRASH_DAYS} days)`)}</h3>${trashRows}</section>`;
}
const ACTIVITY = {
  snapshot: ["ha creato l’istantanea", "took the snapshot"],
  "snapshot-deleted": ["ha eliminato l’istantanea", "deleted the snapshot"],
  copy: ["ha copiato la campagna in", "copied the campaign into"],
  "restore-copy": ["ha ripristinato come copia l’istantanea", "restored as a copy the snapshot"],
  export: ["ha preparato un’esportazione", "prepared an export"],
  import: ["ha importato un file come", "imported a file as"],
  "scene-copy": ["ha copiato la scena", "copied the scene"],
  "item-copy": ["ha copiato", "copied"],
  archived: ["ha archiviato", "archived"],
  restored: ["ha ripristinato", "restored"],
  deleted: ["ha spostato nel cestino", "moved to the trash"],
  recovered: ["ha recuperato dal cestino", "recovered from the trash"],
  purged: ["ha eliminato definitivamente", "deleted for good"],
  "purged-expired": ["cestino scaduto: eliminata", "trash expired: deleted"],
};
function activityLine(ctx, row) {
  const verb = ctx.t(...(ACTIVITY[row.kind] ?? [row.kind, row.kind]));
  const snap = row.snapshotName ?? (row.snapshotLabel ? say(ctx, row.snapshotLabel) : "");
  let detail = "";
  if (["snapshot", "snapshot-deleted"].includes(row.kind)) detail = ` «${snap}»`;
  else if (row.kind === "restore-copy") detail = ` «${snap}» → «${row.targetName}»`;
  else if (row.kind === "copy") detail = ` «${row.targetName}»`;
  else if (row.kind === "export") detail = ` ${row.format === "json" ? "JSON" : "Markdown"}`;
  else if (row.kind === "import") detail = ` «${row.campaignName}»`;
  else if (row.kind === "item-copy") detail = ` «${row.itemName}» → «${row.targetName}»`;
  else if (row.kind === "scene-copy")
    detail = ` «${row.sceneName}» → «${row.targetName}»${row.replaced ? ctx.t(" (sostituita)", " (replaced)") : ""}`;
  else detail = ` «${row.campaignName}»`;
  const where = [
    "copy",
    "restore-copy",
    "export",
    "scene-copy",
    "snapshot",
    "snapshot-deleted",
  ].includes(row.kind)
    ? ` · ${row.campaignName}`
    : "";
  return `<li><span class="muted">${ctx.esc(when(ctx, row.at))}</span> <strong>${ctx.esc(nameOf(ctx, row.by))}</strong> ${ctx.esc(verb + detail + where)}</li>`;
}
function activityBlock(ctx) {
  const rows = D.activityFor(ctx.state, ctx.role).slice(0, 12);
  return `<section class="cd-block cd-wide" aria-labelledby="cd-activity-title"><div class="cd-block-heading"><h2 id="cd-activity-title">${ctx.t("Attività sui dati", "Data activity")}</h2></div>${rows.length ? `<ol class="cd-activity">${rows.map((row) => activityLine(ctx, row)).join("")}</ol>` : `<p class="cd-empty">${ctx.t("Nessuna attività registrata.", "No activity recorded.")}</p>`}</section>`;
}
export function renderSection(ctx) {
  const campaignId = ctx.state.campaign?.id;
  if (!D.canUse(ctx.state, ctx.role))
    return `<div class="empty-state"><h1>${ctx.t("Riservato al DM e ai co-DM", "For the DM and co-DMs")}</h1><p>${ctx.t("Copie, istantanee ed esportazioni della campagna sono gestite da chi la dirige.", "The campaign’s copies, snapshots and exports are managed by whoever runs it.")}</p></div>`;
  return `<div class="cd-page" data-cd-page>${heading(ctx)}<p class="cd-intro muted">${ctx.t("Copie, istantanee, esportazioni e cestino. Nessuno di questi comandi cambia la partita in corso: copie e ripristini diventano campagne nuove e indipendenti.", "Copies, snapshots, exports and trash. None of these commands changes the game in play: copies and restores become new, independent campaigns.")}</p><div class="cd-grid">${snapshotsBlock(ctx, campaignId)}${copyBlock(ctx)}${exportBlock(ctx, campaignId)}${transferBlock(ctx)}</div>${campaignsBlock(ctx)}${activityBlock(ctx)}</div>`;
}

// ---------------------------------------------------------------- dialogs

const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
function componentDetail(ctx, id, counts, bundle) {
  const names = (rows) => rows.map((row) => row.name).join(", ");
  switch (id) {
    case "members":
      return counts.members
        ? `${counts.members} · ${names(bundle.members.map((m) => ({ name: nameOf(ctx, m.id) })))}`
        : ctx.t("nessuno", "none");
    case "scenes": {
      const players = counts.tokens - counts.creatureTokens;
      return ctx.t(
        `${counts.scenes} ${counts.scenes === 1 ? "scena" : "scene"} · ${counts.creatureTokens} pedine di creature${players ? `; le ${players} dei giocatori restano fuori` : ""}`,
        `${counts.scenes} ${counts.scenes === 1 ? "scene" : "scenes"} · ${counts.creatureTokens} creature tokens${players ? `; the ${players} player tokens stay out` : ""}`,
      );
    }
    case "creatures":
      return counts.creatures
        ? ctx.t(
            `${counts.creatures} copie indipendenti: ${names(bundle.creatures)}`,
            `${counts.creatures} independent copies: ${names(bundle.creatures)}`,
          )
        : ctx.t("nessuna", "none");
    case "journal": {
      const parts = [
        ctx.t(n(counts.entries, "voce", "voci"), n(counts.entries, "entry", "entries")),
      ];
      if (counts.pages)
        parts.push(
          ctx.t(
            n(counts.pages, "pagina di missioni e archivio", "pagine di missioni e archivio"),
            n(counts.pages, "missions and archive page", "missions and archive pages"),
          ),
        );
      if (counts.places)
        parts.push(
          ctx.t(
            n(counts.places, "luogo sulla mappa del mondo", "luoghi sulla mappa del mondo"),
            n(counts.places, "place on the world map", "places on the world map"),
          ),
        );
      return parts.join(" · ");
    }
    case "handouts":
      return ctx.t(
        `${n(counts.handouts, "materiale", "materiali")} · ${n(counts.prep, "scheda di preparazione", "schede di preparazione")}`,
        `${n(counts.handouts, "material", "materials")} · ${n(counts.prep, "prep sheet", "prep sheets")}`,
      );
    case "tables":
      return ctx.t(n(counts.tables, "tabella", "tabelle"), n(counts.tables, "table", "tables"));
    case "loot":
      return ctx.t(
        n(counts.loot, "oggetto o pacco", "oggetti e pacchi"),
        n(counts.loot, "item or parcel", "items and parcels"),
      );
    case "encounters":
      return ctx.t(
        n(counts.encounters, "incontro", "incontri"),
        n(counts.encounters, "encounter", "encounters"),
      );
    default:
      return "";
  }
}
function componentsBody(ctx, bundle, { name, mode, ownPrivate = 0, warnings = [] }) {
  const counts = D.summarizeBundle(bundle);
  const checks = D.COMPONENTS.map((component) => {
    const present = D.componentPresent(bundle, component.id);
    const blocked = mode === "import" && component.importable === false;
    const detail = blocked
      ? ctx.t("Non si importano: invitali con un link.", "Not imported: invite them with a link.")
      : present
        ? componentDetail(ctx, component.id, counts, bundle)
        : ctx.t(
            "Niente da copiare: la campagna non ne ha. Aggiungili prima, se servono.",
            "Nothing to copy: the campaign has none. Add some first, if needed.",
          );
    const why = `cd-component-why-${component.id}`;
    return `<label class="cd-check cd-component"><input type="checkbox" name="component" value="${component.id}" ${present && !blocked ? "checked" : `disabled aria-describedby="${why}"`}><span><strong>${ctx.esc(say(ctx, component.label))}</strong><small id="${why}">${ctx.esc(detail)}</small></span></label>`;
  }).join("");
  const privateBox =
    mode === "copy"
      ? `<label class="cd-check"><input type="checkbox" name="includeOwnPrivate" ${ownPrivate ? "" : 'disabled aria-describedby="cd-copy-private-why"'}><span>${ctx.t(`Anche le mie note «Solo io» di questa campagna (${ownPrivate})`, `Also my “Only me” notes of this campaign (${ownPrivate})`)}${ownPrivate ? "" : `<small id="cd-copy-private-why">${ctx.t("Non hai note «Solo io» in questa campagna. Scrivine una negli Appunti per portarla.", "You have no “Only me” notes in this campaign. Write one in Notes to bring it.")}</small>`}</span></label>`
      : "";
  const warningList = warnings.length
    ? `<div class="cd-alert" role="status"><p><strong>${ctx.t("Da sapere prima di importare", "Good to know before importing")}</strong></p><ul>${warnings.map((w) => `<li>${ctx.esc(say(ctx, w))}</li>`).join("")}</ul></div>`
    : "";
  const rules = `<p class="cd-rules"><span class="badge">D&amp;D 2024 · SRD 5.2.1</span> <span class="muted">${ctx.t("regole fissate alla creazione", "rules fixed at creation")}</span></p>`;
  return `${warningList}<label class="field"><span>${mode === "import" ? ctx.t("Nome della nuova campagna", "New campaign name") : ctx.t("Nome della copia", "Name of the copy")}</span><input name="name" required maxlength="80" autocomplete="off" value="${ctx.esc(name)}"></label>${rules}<fieldset class="cd-components"><legend>${mode === "import" ? ctx.t("Cosa importare", "What to import") : ctx.t("Cosa copiare", "What to copy")}</legend>${checks}</fieldset>${privateBox}<details class="cd-omitted"><summary>${ctx.t("Cosa non si copia mai", "What is never copied")}</summary><ul>${D.NOT_CARRIED.map((line) => `<li>${ctx.esc(say(ctx, line))}</li>`).join("")}</ul></details>`;
}
function afterCreate(ctx, result, it, en) {
  ui.highlight = result?.campaignId ?? null;
  ui.focus = result?.campaignId ? `[data-cd-campaign="${result.campaignId}"]` : null;
  ctx.render();
  ctx.toast(ctx.t(it, en));
}
function openSnapshotDialog(ctx) {
  const campaignId = ctx.state.campaign?.id;
  ctx.dialog(
    ctx.t("Crea un’istantanea", "Take a snapshot"),
    `<label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" required maxlength="80" autocomplete="off" placeholder="${ctx.t("Prima della battaglia", "Before the battle")}"></label><p class="muted">${ctx.t("Contiene profilo, giocatori, scene con nebbia e luci, creature, diario condiviso, missioni, mappa del mondo, materiali, tabelle, tesoro e incontri come sono ora. Le note «Solo io» non entrano.", "It holds profile, players, scenes with fog and lights, creatures, shared journal, missions, world map, materials, tables, treasure and encounters as they are now. “Only me” notes do not go in.")}</p>`,
    {
      submitLabel: ctx.t("Crea istantanea", "Take snapshot"),
      onSubmit(data) {
        const name = String(data.get("name") ?? "").trim();
        shared(ctx, ctx.t(`Istantanea creata · ${name}`, `Snapshot taken · ${name}`), (draft) =>
          D.takeSnapshot(draft, campaignId, { name }, ctx.role, Date.now(), {
            slices: slicesOf(ctx),
          }),
        );
      },
    },
  );
}
function openCopyDialog(ctx) {
  const campaignId = ctx.state.campaign?.id;
  const slices = slicesOf(ctx);
  const bundle = D.captureBundle(ctx.state, campaignId, ctx.role, { slices });
  const name = ctx
    .t(`${bundle.profile.name} (copia)`, `${bundle.profile.name} (copy)`)
    .slice(0, 80);
  ctx.dialog(
    ctx.t("Copia la campagna", "Copy the campaign"),
    componentsBody(ctx, bundle, {
      name,
      mode: "copy",
      ownPrivate: D.ownPrivateCount(ctx.state, campaignId, ctx.role),
    }),
    {
      submitLabel: ctx.t("Copia la campagna", "Copy the campaign"),
      onSubmit(data) {
        const title = String(data.get("name") ?? "").trim();
        const result = shared(
          ctx,
          ctx.t(`Campagna copiata · ${title}`, `Campaign copied · ${title}`),
          (draft) =>
            D.copyCampaign(
              draft,
              campaignId,
              {
                name: title,
                components: data.getAll("component"),
                includeOwnPrivate: data.get("includeOwnPrivate") === "on",
              },
              ctx.role,
              Date.now(),
              { slices },
            ),
          { quiet: true },
        );
        afterCreate(
          ctx,
          result,
          `Copia creata: «${title}». È una campagna nuova e indipendente: la trovi qui sotto e in Campagne. Per annullarla, eliminala.`,
          `Copy created: “${title}”. It is a new, independent campaign: find it below and in Campaigns. To undo it, delete it.`,
        );
      },
    },
  );
}
function openRestoreDialog(ctx, snapshotId) {
  const bundle = D.snapshotBundle(ctx.state, snapshotId);
  const row = D.listSnapshots(ctx.state, ctx.state.campaign?.id).find((r) => r.id === snapshotId);
  const label = row ? snapshotTitle(ctx, row) : "";
  const name = `${bundle.profile.name} — ${label}`.slice(0, 80);
  ctx.dialog(
    ctx.t("Ripristina come copia", "Restore as copy"),
    `<p class="cd-alert" role="note">${ctx.t(`L’istantanea «${ctx.esc(label)}» del ${ctx.esc(when(ctx, row?.createdAt))} diventa una campagna nuova. «${ctx.esc(ctx.state.campaign?.name ?? "")}» resta com’è.`, `Snapshot “${ctx.esc(label)}” of ${ctx.esc(when(ctx, row?.createdAt))} becomes a new campaign. “${ctx.esc(ctx.state.campaign?.name ?? "")}” stays as it is.`)}</p>${componentsBody(ctx, bundle, { name, mode: "restore" })}`,
    {
      submitLabel: ctx.t("Ripristina come copia", "Restore as copy"),
      onSubmit(data) {
        const title = String(data.get("name") ?? "").trim();
        const result = shared(
          ctx,
          ctx.t(
            `Istantanea ripristinata come copia · ${title}`,
            `Snapshot restored as a copy · ${title}`,
          ),
          (draft) =>
            D.restoreSnapshotAsCopy(
              draft,
              snapshotId,
              { name: title, components: data.getAll("component") },
              ctx.role,
              Date.now(),
              { slices: slicesOf(ctx) },
            ),
          { quiet: true },
        );
        afterCreate(
          ctx,
          result,
          `Ripristinata come copia: «${title}». La campagna in corso non è cambiata.`,
          `Restored as a copy: “${title}”. The campaign in play did not change.`,
        );
      },
    },
  );
}
function openDiffDialog(ctx, snapshotId) {
  const campaignId = ctx.state.campaign?.id;
  const snapshot = D.snapshotBundle(ctx.state, snapshotId);
  const row = D.listSnapshots(ctx.state, campaignId).find((r) => r.id === snapshotId);
  const now = D.captureBundle(ctx.state, campaignId, ctx.role, {
    components: snapshot.components,
    slices: slicesOf(ctx),
  });
  const rows = D.diffBundles(snapshot, now);
  const label = row ? snapshotTitle(ctx, row) : "";
  const body = rows.length
    ? `<ul class="cd-diff">${rows.map((r) => `<li data-cd-diff="${ctx.esc(r.kind)}">${ctx.esc(ctx.label({ it: r.it, en: r.en }))}</li>`).join("")}</ul>`
    : `<p class="cd-empty">${ctx.t("Nessuna differenza: la campagna è come nell’istantanea.", "No differences: the campaign is as in the snapshot.")}</p>`;
  ctx.dialog(
    ctx.t(`Differenze da «${label}»`, `Changes since “${label}”`),
    `<p class="muted">${ctx.t(`Cosa è cambiato dal ${ctx.esc(when(ctx, row?.createdAt))} a ora. Ripristinare come copia riporta la campagna com’era, in una campagna nuova.`, `What changed from ${ctx.esc(when(ctx, row?.createdAt))} to now. Restoring as a copy brings the campaign back as it was, in a new campaign.`)}</p>${body}`,
    {
      submitLabel: ctx.t("Ripristina come copia…", "Restore as copy…"),
      cancelLabel: ctx.t("Chiudi", "Close"),
      onSubmit() {
        openRestoreDialog(ctx, snapshotId);
      },
    },
  );
}
function openDeleteSnapshot(ctx, snapshotId) {
  const row = D.listSnapshots(ctx.state, ctx.state.campaign?.id).find((r) => r.id === snapshotId);
  const label = row ? snapshotTitle(ctx, row) : "";
  ctx.dialog(
    ctx.t("Elimina l’istantanea", "Delete the snapshot"),
    `<p>${ctx.t(`«${ctx.esc(label)}» del ${ctx.esc(when(ctx, row?.createdAt))} sparisce per sempre. La campagna non cambia.`, `“${ctx.esc(label)}” of ${ctx.esc(when(ctx, row?.createdAt))} disappears for good. The campaign does not change.`)}</p>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit() {
        shared(
          ctx,
          ctx.t(`Istantanea eliminata · ${label}`, `Snapshot deleted · ${label}`),
          (draft) => D.deleteSnapshot(draft, snapshotId, ctx.role, Date.now()),
        );
      },
    },
  );
}
function openArchiveDialog(ctx, campaignId) {
  const name = cm.coreCampaign(ctx.state, campaignId)?.name ?? "";
  ctx.dialog(
    ctx.t("Archivia la campagna", "Archive the campaign"),
    `<p>${ctx.t(`«${ctx.esc(name)}» resta com’è, ma finché non la ripristini resta bloccato:`, `“${ctx.esc(name)}” stays as it is, but until you restore it these stay blocked:`)}</p>${blockedList(ctx)}${campaignId === ctx.state.campaign?.id ? `<p class="cd-alert" role="note" data-cd-archive-current>${ctx.t("È la campagna in corso: il Tavolo si chiude per tutti e diari e schede restano da leggere. «Ripristina» la riapre com’era.", "It is the campaign in play: the Table closes for everyone while journals and sheets stay readable. “Restore” reopens it as it was.")}</p>` : ""}<p class="muted">${D.ARCHIVE_KEEPS.map((line) => ctx.esc(say(ctx, line))).join(" ")}</p>`,
    {
      submitLabel: ctx.t("Archivia", "Archive"),
      onSubmit() {
        shared(
          ctx,
          ctx.t(`Campagna archiviata · ${name}`, `Campaign archived · ${name}`),
          (draft) => D.archiveCampaign(draft, campaignId, ctx.role, Date.now()),
        );
      },
    },
  );
}
function openDeleteCampaign(ctx, campaignId) {
  const name = cm.coreCampaign(ctx.state, campaignId)?.name ?? "";
  // P10 CA-85: the campaign in play needs one explicit step, closing it (archive).
  const inPlay =
    campaignId === ctx.state.campaign?.id && cm.metaOf(ctx.state, campaignId)?.status === "active";
  ctx.dialog(
    ctx.t("Elimina la campagna", "Delete the campaign"),
    `<p>${ctx.t(`Va nel cestino: la recuperi entro ${D.TRASH_DAYS} giorni, poi sparisce per sempre. Sparisce subito dall’elenco degli altri membri.`, `It goes to the trash: you can recover it within ${D.TRASH_DAYS} days, then it disappears for good. It leaves the other members’ lists at once.`)}</p>${inPlay ? `<label class="check-field cd-close-current"><input type="checkbox" name="closeCurrent" required> ${ctx.t("È la campagna in corso: chiudila (il Tavolo si chiude per tutti)", "It is the campaign in play: close it (the Table closes for everyone)")}</label>` : ""}<p>${ctx.t("Per confermare scrivi il nome della campagna:", "To confirm, type the campaign name:")} <strong>${ctx.esc(name)}</strong> <small class="muted">${ctx.t("(trattini, virgolette e maiuscole non contano)", "(dashes, quotes and capitals do not matter)")}</small></p><label class="field"><span>${ctx.t("Nome della campagna", "Campaign name")}</span><input name="confirmName" required autocomplete="off" autocapitalize="off" spellcheck="false"></label>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit(data) {
        shared(
          ctx,
          ctx.t(`Campagna nel cestino · ${name}`, `Campaign in the trash · ${name}`),
          (draft) =>
            D.deleteCampaign(draft, campaignId, data.get("confirmName"), ctx.role, Date.now(), {
              closeCurrent: data.get("closeCurrent") === "on",
            }),
          { focus: `[data-cd-trash="${campaignId}"]` },
        );
      },
    },
  );
}
function openPurgeDialog(ctx, campaignId) {
  const name = cm.coreCampaign(ctx.state, campaignId)?.name ?? "";
  ctx.dialog(
    ctx.t("Elimina definitivamente", "Delete for good"),
    `<p class="cd-alert" role="note">${ctx.t("Non si torna indietro: spariscono la campagna, le sue scene, il diario, le istantanee e le creature solo sue. Le schede dei giocatori e gli appunti personali restano ai loro autori.", "There is no way back: the campaign, its scenes, journal, snapshots and the creatures only it had disappear. Players’ sheets and personal notes stay with their authors.")}</p><p>${ctx.t("Per confermare scrivi il nome della campagna:", "To confirm, type the campaign name:")} <strong>${ctx.esc(name)}</strong></p><label class="field"><span>${ctx.t("Nome della campagna", "Campaign name")}</span><input name="confirmName" required autocomplete="off" autocapitalize="off" spellcheck="false"></label>`,
    {
      submitLabel: ctx.t("Elimina definitivamente", "Delete for good"),
      onSubmit(data) {
        shared(
          ctx,
          ctx.t(
            `Campagna eliminata definitivamente · ${name}`,
            `Campaign deleted for good · ${name}`,
          ),
          (draft) =>
            D.purgeCampaign(draft, campaignId, data.get("confirmName"), ctx.role, Date.now()),
        );
      },
    },
  );
}
function openItemCopyDialog(ctx, kind, id, targetId) {
  const preview = D.previewItemCopy(ctx.state, { kind, id, targetId }, ctx.role, {
    slices: slicesOf(ctx),
  });
  const kindName = say(ctx, D.ITEM_KINDS.find((row) => row.kind === kind).label);
  const itemName = typeof preview.name === "object" ? say(ctx, preview.name) : preview.name;
  const notes = {
    creature: ctx.t(
      "Chi la controlla non si copia: nella nuova campagna è tua.",
      "Who controls it is not copied: in the new campaign it is yours.",
    ),
    handout: ctx.t(
      "La copia parte non ancora mostrata ai giocatori.",
      "The copy starts not yet shown to players.",
    ),
    table: ctx.t(
      "Le tabelle collegate non si copiano da sole.",
      "Linked tables are not copied by themselves.",
    ),
    deck: ctx.t(
      "Il mazzo arriva rimescolato: nessuna carta in mano o sul tavolo.",
      "The deck arrives with every card back in the pile.",
    ),
    entry: ctx.t(
      "La copia è tua e ha gli stessi permessi di lettura.",
      "The copy is yours and keeps the same reading permissions.",
    ),
    homebrew: ctx.t(
      "La campagna di destinazione userà la stessa revisione.",
      "The destination campaign will use the same revision.",
    ),
  }[kind];
  ctx.dialog(
    ctx.t("Copia in un’altra campagna", "Copy to another campaign"),
    `<p><strong>${ctx.esc(kindName)} · ${ctx.esc(itemName)}</strong> → «${ctx.esc(preview.targetName)}»</p>${preview.exists ? `<p class="cd-alert" role="note" data-cd-item-exists>${kind === "homebrew" ? ctx.t("La campagna di destinazione usa già questo contenuto.", "The destination campaign already uses this content.") : ctx.t("C’è già una copia in quella campagna: questa si aggiunge come nuova, senza sovrascrivere nulla.", "There is already a copy in that campaign: this one is added as new, nothing is overwritten.")}</p>` : ""}<p class="muted">${ctx.esc(notes)}</p>`,
    {
      submitLabel: ctx.t("Copia", "Copy"),
      onSubmit() {
        shared(
          ctx,
          ctx.t(
            `Copiato in «${preview.targetName}»: ${itemName}`,
            `Copied to “${preview.targetName}”: ${itemName}`,
          ),
          (draft) =>
            D.copyItemTo(draft, { kind, id, targetId }, ctx.role, Date.now(), {
              slices: slicesOf(ctx),
            }),
        );
      },
    },
  );
}
// C5: `pick` is "<kind>:<id>" (kinds of D.ITEM_KINDS, or "scene"); a bare id is a scene.
function splitPick(pick) {
  const text = typeof pick === "string" ? pick : "";
  if (!text) return { kind: null, id: null };
  const at = text.indexOf(":");
  const kind = at > 0 ? text.slice(0, at) : "scene";
  const known = kind === "scene" || D.ITEM_KINDS.some((row) => row.kind === kind);
  return known ? { kind, id: at > 0 ? text.slice(at + 1) : text } : { kind: null, id: null };
}
function pickTitle(ctx, pick) {
  const { kind, id } = splitPick(pick);
  if (!kind) return "";
  if (kind === "scene") {
    const scene = (ctx.state.scenes ?? []).find((row) => row.id === id);
    return scene ? `${ctx.t("Scena", "Scene")} · ${scene.name}` : "";
  }
  const row = D.copyableItems(ctx.state, ctx.role).find(
    (item) => item.kind === kind && item.id === id,
  );
  if (!row) return "";
  const kindName = say(ctx, D.ITEM_KINDS.find((item) => item.kind === kind).label);
  return `${kindName} · ${typeof row.name === "object" ? say(ctx, row.name) : row.name}`;
}
/** Back from «Crea una campagna»: the copy of the same item into the new campaign. */
function resumeCopy(ctx, pick, targetId) {
  ui.pick = pick;
  ctx.navigate("campaign", { tab: SECTION });
  const { kind, id } = splitPick(pick);
  if (!kind || !targetId) return;
  perform(ctx, () =>
    kind === "scene"
      ? openSceneCopyDialog(ctx, id, targetId)
      : openItemCopyDialog(ctx, kind, id, targetId),
  );
}
/**
 * The one entry to copy an item to another campaign (contract C5; Roll20 Transmogrifier):
 * palette, token menu, Preparation and the Library call it with "<kind>:<id>". It opens the
 * Dati form with the item picked; with no other active campaign it also explains why and
 * offers «Crea una campagna», which comes back to this copy once the campaign exists.
 */
export function openCopyTo(ctx, pick = null) {
  ui.pick = pick;
  const ready = D.copyTargets(ctx.state, ctx.role).some((row) => row.status === "active");
  ui.focus = ready ? "[data-cd-form=scene-copy] select" : "[data-cd=create-target]";
  ctx.navigate("campaign", { tab: SECTION });
  if (ready) return;
  const title = pickTitle(ctx, pick);
  const current = ctx.state.campaign?.name ?? "";
  ctx.dialog(
    ctx.t("Copia in un’altra campagna", "Copy to another campaign"),
    `${title ? `<p><strong>${ctx.esc(title)}</strong></p>` : ""}<p>${ctx.t(`Serve un’altra campagna attiva in cui copiarla: ora guidi solo «${ctx.esc(current)}». Creane una: appena creata torni qui con la copia pronta da confermare.`, `You need another active campaign to copy it into: you only run “${ctx.esc(current)}” now. Create one: once it exists you come back here with the copy ready to confirm.`)}</p><p class="muted">${ctx.t("La campagna in corso non cambia; la nuova parte vuota, con una scena iniziale.", "The campaign in play does not change; the new one starts empty, with an opening scene.")}</p>`,
    {
      submitLabel: ctx.t("Crea una campagna", "Create a campaign"),
      cancelLabel: ctx.t("Chiudi", "Close"),
      onSubmit() {
        cm.handleAction(ctx, "create", { afterCreate: (id) => resumeCopy(ctx, pick, id) });
      },
    },
  );
}
function openSceneCopyDialog(ctx, sceneId, targetId) {
  const preview = D.previewSceneCopy(ctx.state, { sceneId, targetId }, ctx.role);
  const list = (rows) => (rows.length ? ctx.esc(rows.join(", ")) : ctx.t("nessuna", "none"));
  const conflict = preview.existing
    ? `<div class="cd-alert" role="alert"><p><strong>${ctx.t(`«${ctx.esc(preview.target.name)}» ha già questa scena`, `“${ctx.esc(preview.target.name)}” already has this scene`)}</strong> (${ctx.esc(preview.existing.name)}${preview.existing.copiedAt ? `, ${ctx.t("copiata il", "copied on")} ${ctx.esc(when(ctx, preview.existing.copiedAt))}` : ""}).</p><fieldset class="cd-formats"><legend>${ctx.t("Che cosa faccio?", "What should I do?")}</legend><label class="cd-choice"><input type="radio" name="mode" value="replace" required><span><strong>${ctx.t("Sostituiscila", "Replace it")}</strong><small>${ctx.t(`Prima salviamo un’istantanea di «${ctx.esc(preview.target.name)}», da ripristinare come copia.`, `A snapshot of “${ctx.esc(preview.target.name)}” is saved first, restorable as a copy.`)}</small></span></label><label class="cd-choice"><input type="radio" name="mode" value="new" required><span><strong>${ctx.t("Aggiungila come nuova scena", "Add it as a new scene")}</strong><small>${ctx.t("La scena che c’è resta com’è.", "The scene already there stays as it is.")}</small></span></label></fieldset></div>`
    : `<input type="hidden" name="mode" value="new">`;
  const creatures = preview.creatures.length
    ? preview.creatures
        .map(
          (c) =>
            `${ctx.esc(c.name)}${c.exists ? ctx.t(" (copia già presente)", " (copy already there)") : ""}`,
        )
        .join(", ")
    : ctx.t("nessuna", "none");
  ctx.dialog(
    ctx.t("Copia la scena in un’altra campagna", "Copy the scene to another campaign"),
    `<p>${ctx.t(`«${ctx.esc(preview.scene.name)}» → «${ctx.esc(preview.target.name)}»`, `“${ctx.esc(preview.scene.name)}” → “${ctx.esc(preview.target.name)}”`)}</p>${conflict}<dl class="cd-facts"><div><dt>${ctx.t("Pedine copiate", "Tokens copied")}</dt><dd>${list(preview.kept)}</dd></div><div><dt>${ctx.t("Pedine che restano fuori", "Tokens left out")}</dt><dd>${list(preview.dropped)}${preview.dropped.length ? ` · ${ctx.t("personaggi dei giocatori: ognuno aggiunge il proprio", "players’ characters: each player adds their own")}` : ""}</dd></div><div><dt>${ctx.t("Creature copiate come nuove", "Creatures copied as new")}</dt><dd>${creatures}</dd></div></dl>`,
    {
      submitLabel: ctx.t("Copia la scena", "Copy the scene"),
      onSubmit(data) {
        const mode = String(data.get("mode") ?? "new");
        const result = shared(
          ctx,
          ctx.t(
            `Scena copiata · ${preview.scene.name} → ${preview.target.name}`,
            `Scene copied · ${preview.scene.name} → ${preview.target.name}`,
          ),
          (draft) =>
            D.copySceneTo(draft, { sceneId, targetId, mode }, ctx.role, Date.now(), {
              slices: slicesOf(ctx),
            }),
          { quiet: true },
        );
        ctx.toast(
          result?.replaced
            ? ctx.t(
                `Scena sostituita in «${preview.target.name}». L’istantanea «Prima della copia» è nell’elenco di quella campagna.`,
                `Scene replaced in “${preview.target.name}”. The “Before copying” snapshot is in that campaign’s list.`,
              )
            : ctx.t(
                `Scena copiata in «${preview.target.name}»: la trovi in Preparazione quando avvii quella campagna.`,
                `Scene copied into “${preview.target.name}”: find it in Preparation when you launch that campaign.`,
              ),
        );
      },
    },
  );
}
function openImportPreview(ctx, parsed, fileName) {
  const preview = D.previewImport(parsed.bundle, { slices: slicesOf(ctx) });
  const warnings = [
    ...new Map([...parsed.warnings, ...preview.warnings].map((w) => [w.it, w])).values(),
  ];
  const source = preview.bundle;
  const intro = `<p>${ctx.t(`File «${ctx.esc(fileName)}»: «${ctx.esc(source.source.name)}»${source.createdAt ? `, esportata il ${ctx.esc(when(ctx, source.createdAt))}` : ""}${source.createdByName ? ` da ${ctx.esc(source.createdByName)}` : ""}.`, `File “${ctx.esc(fileName)}”: “${ctx.esc(source.source.name)}”${source.createdAt ? `, exported on ${ctx.esc(when(ctx, source.createdAt))}` : ""}${source.createdByName ? ` by ${ctx.esc(source.createdByName)}` : ""}.`)}</p>${dependenciesHTML(ctx, D.importDependencies(ctx.state, source.homebrew, ctx.role))}`;
  ctx.dialog(
    ctx.t("Importa come nuova campagna", "Import as a new campaign"),
    intro +
      componentsBody(ctx, source, {
        name: ctx
          .t(`${source.profile.name} (importata)`, `${source.profile.name} (imported)`)
          .slice(0, 80),
        mode: "import",
        warnings,
      }),
    {
      submitLabel: ctx.t("Importa come nuova campagna", "Import as a new campaign"),
      onSubmit(data) {
        const title = String(data.get("name") ?? "").trim();
        const result = shared(
          ctx,
          ctx.t(`Campagna importata · ${title}`, `Campaign imported · ${title}`),
          (draft) =>
            D.importCampaign(
              draft,
              source,
              { name: title, components: data.getAll("component") },
              ctx.role,
              Date.now(),
              { slices: slicesOf(ctx) },
            ),
          { quiet: true },
        );
        afterCreate(
          ctx,
          result,
          `Campagna importata: «${title}». La trovi qui sotto e in Campagne; nulla è cambiato in quella in corso.`,
          `Campaign imported: “${title}”. Find it below and in Campaigns; nothing changed in the one in play.`,
        );
      },
    },
  );
  globalThis.document?.querySelectorAll?.("#dialog [data-cd-dep-library]").forEach(
    (button) =>
      (button.onclick = () => {
        ctx.closeDialog?.();
        ctx.navigate("library", { tab: "available" });
      }),
  );
}
// P10 CA-75 (BG3 mod verification): each homebrew entry the file's campaign used, with its
// state in this Library and the one action that fixes it.
function dependenciesHTML(ctx, rows) {
  if (!rows.length) return "";
  const missing = rows.filter((row) => row.status !== "ready").length;
  const status = {
    ready: ctx.t("Pronto: si attiva nella nuova campagna", "Ready: enabled in the new campaign"),
    missing: ctx.t("Mancante nella tua Biblioteca", "Missing from your Library"),
    outdated: ctx.t(
      "Nella Biblioteca c’è un’altra revisione",
      "Your Library holds another revision",
    ),
  };
  return `<section class="cd-deps" data-cd-deps aria-labelledby="cd-deps-title"><h3 id="cd-deps-title">${ctx.t("Contenuti richiesti", "Required content")} · ${missing ? ctx.t(`${missing} da sistemare`, `${missing} to fix`) : ctx.t("tutti pronti", "all ready")}</h3><ul class="cd-list">${rows
    .map(
      (row) =>
        `<li class="cd-row is-${row.status}" data-cd-dep="${ctx.esc(row.ref.contentId)}"><div class="cd-row-main"><p class="cd-row-title"><strong>${ctx.esc(row.name ? say(ctx, row.name) : ctx.t(`Contenuto ${row.ref.contentId}`, `Content ${row.ref.contentId}`))}</strong> <span class="badge ${row.status === "ready" ? "" : "cd-danger-badge"}">${ctx.esc(status[row.status])}</span></p></div>${row.action === "library" ? `<button type="button" class="button quiet" data-cd-dep-library>${ctx.t("Aggiungilo dalla Biblioteca", "Add it from the Library")}</button>` : ""}</li>`,
    )
    .join(
      "",
    )}</ul><p class="muted">${ctx.t("Puoi importare comunque: i contenuti mancanti restano segnati «mancante» nelle Fonti della nuova campagna finché non li aggiungi.", "You can import anyway: missing content stays marked “missing” in the new campaign’s Sources until you add it.")}</p></section>`;
}
export async function importFile(ctx, file) {
  if (!file) return;
  if (file.size > D.MAX_IMPORT_BYTES)
    return ctx.toast(ctx.t("Il file supera 8 MB.", "The file is larger than 8 MB."), true);
  let textValue;
  try {
    textValue = await file.text();
  } catch {
    return ctx.toast(ctx.t("Il file non si può leggere.", "The file cannot be read."), true);
  }
  const parsed = perform(ctx, () => D.parseImportText(textValue));
  if (parsed) openImportPreview(ctx, parsed, file.name ?? "");
}

// ---------------------------------------------------------------- actions

export function handleAction(ctx, action, data = {}, control = null) {
  const id = data.id;
  switch (action) {
    case "create-target":
      return cm.handleAction(ctx, "create", {
        afterCreate: (created) => resumeCopy(ctx, null, created),
      });
    case "snapshot":
      return openSnapshotDialog(ctx);
    case "copy":
      return perform(ctx, () => openCopyDialog(ctx));
    case "diff":
      return perform(ctx, () => openDiffDialog(ctx, id));
    case "restore-copy":
      return perform(ctx, () => openRestoreDialog(ctx, id));
    case "delete-snapshot":
      return openDeleteSnapshot(ctx, id);
    case "download":
      return perform(ctx, () => {
        const file = D.exportFile(ctx.state, id, ctx.role);
        const saved = download(file.name, file.type, file.content);
        ctx.toast(
          saved
            ? ctx.t(`File scaricato: ${file.name}`, `File downloaded: ${file.name}`)
            : ctx.t("Il download non è disponibile qui.", "Downloads are not available here."),
          !saved,
        );
        return file;
      });
    case "import": {
      const input = control?.closest?.("[data-cd-page]")?.querySelector("[data-cd-import-file]");
      input?.click();
      return input ?? null;
    }
    case "details":
      return ctx.navigate("campaigns", { id });
    case "archive":
      return openArchiveDialog(ctx, id);
    case "restore-archived": {
      const name = cm.coreCampaign(ctx.state, id)?.name ?? "";
      return perform(ctx, () =>
        shared(
          ctx,
          ctx.t(`Campagna ripristinata · ${name}`, `Campaign restored · ${name}`),
          (draft) => D.restoreArchived(draft, id, ctx.role, Date.now()),
          { focus: `[data-cd-campaign="${id}"]` },
        ),
      );
    }
    case "delete-campaign":
      return openDeleteCampaign(ctx, id);
    case "recover": {
      const name = cm.coreCampaign(ctx.state, id)?.name ?? "";
      return perform(ctx, () =>
        shared(
          ctx,
          ctx.t(`Campagna recuperata · ${name}`, `Campaign recovered · ${name}`),
          (draft) => D.recoverCampaign(draft, id, ctx.role, Date.now()),
          { focus: `[data-cd-campaign="${id}"]` },
        ),
      );
    }
    case "purge":
      return openPurgeDialog(ctx, id);
    default:
      return undefined;
  }
}
export function handleForm(ctx, name, data) {
  const campaignId = ctx.state.campaign?.id;
  if (name === "export") {
    const format = String(data.get("format") ?? "json");
    return perform(ctx, () => {
      shared(
        ctx,
        ctx.t("Esportazione pronta", "Export ready"),
        (draft) =>
          D.prepareExport(
            draft,
            campaignId,
            { format, includeOwnPrivate: data.get("includeOwnPrivate") === "on", lang: ctx.lang },
            ctx.role,
            Date.now(),
            { slices: slicesOf(ctx) },
          ),
        { quiet: true, focus: "[data-cd-export] [data-cd=download]" },
      );
      ctx.toast(
        ctx.t(
          `Esportazione ${format === "json" ? "JSON" : "Markdown"} pronta: scaricala entro ${D.EXPORT_MINUTES} minuti.`,
          `${format === "json" ? "JSON" : "Markdown"} export ready: download it within ${D.EXPORT_MINUTES} minutes.`,
        ),
      );
    });
  }
  if (name === "scene-copy") {
    const picked = String(data.get("sceneId") ?? "");
    const targetId = String(data.get("targetId") ?? "");
    const at = picked.indexOf(":");
    return perform(ctx, () =>
      at > 0 && D.ITEM_KINDS.some((kind) => kind.kind === picked.slice(0, at))
        ? openItemCopyDialog(ctx, picked.slice(0, at), picked.slice(at + 1), targetId)
        : openSceneCopyDialog(ctx, picked, targetId),
    );
  }
  return undefined;
}
export function bindSection(el, ctx) {
  el.querySelectorAll("[data-cd]").forEach((control) => {
    control.onclick = (event) => {
      event.preventDefault();
      handleAction(ctx, control.dataset.cd, { id: control.dataset.id }, control);
    };
  });
  el.querySelectorAll("[data-cd-form]").forEach((form) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      handleForm(ctx, form.dataset.cdForm, new FormData(form));
    };
  });
  const input = el.querySelector("[data-cd-import-file]");
  if (input)
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = "";
      await importFile(ctx, file);
    };
  if (ui.focus) {
    const target = el.querySelector(ui.focus);
    ui.focus = null;
    if (target) {
      const control = target.matches("button,[tabindex]")
        ? target
        : (target.querySelector("button") ?? target);
      target.scrollIntoView?.({ block: "center" });
      control.focus?.({ preventScroll: true });
    }
  }
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    // Snapshots, exports and the data log are administration: gameplay Undo keeps them;
    // each command has its own correction.
    undo: "preserve",
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./campaign-data.css", import.meta.url));
  registry.add("campaign-section", {
    id: SECTION,
    group: "manage",
    label: { it: "Dati della campagna", en: "Campaign data" },
    // Next to Settings (70), like Kanka's Export and Recovery in the campaign settings.
    order: 72,
    when: (ctx) => D.canUse(ctx.state, ctx.role),
    render: renderSection,
    bind: bindSection,
  });
  // Kanka notifies the admin when an export is ready (SVC-084, SVC-153).
  registry.add("notifications", {
    id: `${ID}-ready`,
    label: { it: "Esportazioni", en: "Exports" },
    collect(ctx) {
      return D.readyExports(ctx.state, ctx.role).map((row) => {
        const format = row.format === "json" ? "JSON" : "Markdown";
        return {
          id: `export:${row.id}`,
          title: {
            it: `Esportazione pronta · ${row.campaignName}`,
            en: `Export ready · ${row.campaignName}`,
          },
          body: {
            it: `${format} · scaricabile per ${D.EXPORT_MINUTES} minuti`,
            en: `${format} · downloadable for ${D.EXPORT_MINUTES} minutes`,
          },
          time: row.createdAt,
          category: "other",
          target: { page: "campaign", params: { tab: SECTION } },
        };
      });
    },
  });
  const open = (ctx) => {
    if (!D.canUse(ctx.state, ctx.role))
      throw Object.assign(Error("Only the campaign's DM or a co-DM can do this."), {
        it: "Solo il DM o un co-DM della campagna può farlo.",
        en: "Only the campaign's DM or a co-DM can do this.",
      });
    ctx.navigate("campaign", { tab: SECTION });
  };
  // Listed in the palette only for the campaign's DM and co-DMs, like the section.
  const manager = (ctx) => D.canUse(ctx.state, ctx.role);
  registry.add("command", {
    id: `${ID}.snapshot`,
    label: { it: "Crea un’istantanea della campagna", en: "Take a campaign snapshot" },
    group: "campaign",
    when: manager,
    run(ctx) {
      open(ctx);
      openSnapshotDialog(ctx);
    },
  });
  registry.add("command", {
    id: `${ID}.export`,
    label: { it: "Esporta la campagna", en: "Export the campaign" },
    group: "campaign",
    when: manager,
    run(ctx) {
      ui.focus = "[data-cd-form=export] button[type=submit]";
      open(ctx);
    },
  });
  registry.add("command", {
    id: `${ID}.trash`,
    label: { it: "Apri il cestino delle campagne", en: "Open the campaign trash" },
    group: "campaign",
    when: manager,
    run(ctx) {
      ui.focus = "#cd-trash-title";
      open(ctx);
    },
  });
  // P10: the words DMs type (CA-84 «archivia campagna», CA-85 «elimina campagna», CA-88).
  registry.add("command", {
    id: `${ID}.archive`,
    label: { it: "Archivia la campagna", en: "Archive the campaign" },
    description: {
      it: "Campagna finita o ferma, anche quella in corso: si blocca finché non la ripristini",
      en: "A finished or paused campaign, the one in play too: blocked until you restore it",
    },
    group: "campaign",
    keywords: [
      { it: "archivia campagna", en: "archive campaign" },
      { it: "chiudi la campagna", en: "close the campaign" },
      { it: "campagna finita", en: "campaign over" },
      { it: "cold storage", en: "cold storage" },
    ],
    when: (ctx) => cm.roleOf(ctx.state, ctx.state.campaign?.id, ctx.role) === "owner",
    run(ctx) {
      open(ctx);
      const id = ctx.state.campaign.id;
      if (cm.metaOf(ctx.state, id)?.status === "active") openArchiveDialog(ctx, id);
    },
  });
  registry.add("command", {
    id: `${ID}.delete`,
    label: { it: "Elimina la campagna", en: "Delete the campaign" },
    description: {
      it: "Nel cestino per 30 giorni, poi sparisce; si conferma scrivendo il nome",
      en: "In the trash for 30 days, then gone; confirmed by typing the name",
    },
    group: "campaign",
    keywords: [
      { it: "elimina campagna", en: "delete campaign" },
      { it: "cancella campagna", en: "remove campaign" },
    ],
    when: (ctx) => cm.roleOf(ctx.state, ctx.state.campaign?.id, ctx.role) === "owner",
    run(ctx) {
      open(ctx);
      openDeleteCampaign(ctx, ctx.state.campaign.id);
    },
  });
  registry.add("command", {
    id: `${ID}.copy-to`,
    label: { it: "Copia in un’altra campagna", en: "Copy to another campaign" },
    description: {
      it: "Scena, voce del Mondo o del Diario, creatura, dispensa, tabella, mazzo o homebrew",
      en: "Scene, World or Journal entry, creature, handout, table, deck or homebrew",
    },
    group: "campaign",
    keywords: [
      { it: "trasferisci", en: "transfer" },
      { it: "porta in un’altra campagna", en: "move to another campaign" },
      { it: "transmogrifier", en: "transmogrifier" },
    ],
    when: manager,
    run: (ctx) => openCopyTo(ctx),
  });
  // CA-88: from the item itself, the DM creature's token menu.
  registry.add("token-menu", {
    id: `${ID}-copy-creature`,
    label: { it: "Copia in un’altra campagna…", en: "Copy to another campaign…" },
    // B62 placement: a DM data command lives in the token menu's DM submenu.
    submenu: "dm",
    roles: ["dm"],
    // R7 CA-88: offered with one campaign too; openCopyTo then offers to create the other.
    when: (ctx, target) =>
      manager(ctx) &&
      D.copyableItems(ctx.state, ctx.role).some(
        (row) => row.kind === "creature" && row.id === target?.actorId,
      ),
    run: (ctx, target) => openCopyTo(ctx, `creature:${target.actorId}`),
  });
  registry.on("role-changed", () => resetCampaignDataView());
  registry.on("reset", () => resetCampaignDataView());
}
