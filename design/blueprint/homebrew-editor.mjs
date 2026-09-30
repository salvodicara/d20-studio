// B48 — Deep homebrew editor. Entry module (register) and UI; the rules are in
// homebrew-editor-domain.mjs and the Library's own homebrew.mjs.
//
// Where it appears (B61 placement rule: sections inside the pages they belong to):
// - Library → "Le mie creazioni" (D&D Beyond My Creations + Create links, DDB-171) with the
//   CSV/JSON monster importer (Kobold+ CMP-112), the Forge (Fantasy Grounds R20-118) and
//   the simulated public catalogue (DDB-175/176/177);
// - page #homebrew-editor: the editor with sub-forms after the base (DDB-173), the monster
//   creator (DDB-174, Tetra-cube CMP-152, rollable blocks DDB-110), dnd5e activities and
//   advancement (FVT-180/181), effects with duration anchors (R20-161, FVT-182), a test on a
//   fictitious sheet, and the content detail with revert to source (R20-114) and publishing;
// - Campaign → "Homebrew": automation level per entry (R20-185), safe mode and Find the
//   Culprit (FVT-198), DM only for changes;
// - character sheet: Features box (choices, stacking, subclass advancement) and Actions
//   box (activities); Table → Creature tab: activities, save requests, homebrew stat block;
// - the notification bell (save requests, new published versions), search and palette.

import * as hb from "./homebrew.mjs";
import * as D from "./homebrew-editor-domain.mjs";
import { recordRoll } from "./compendium.mjs";
import { rollDie } from "./state.mjs";
import { rollPlan, validFace, formulaText } from "./srd-compendium.mjs";
import { canViewActor, canControlActor, isCampaignActor } from "./character-access.mjs";
import { scrollIntoStrip } from "./ui.mjs";
import { setStructuredFollow } from "./homebrew-integration.mjs";
import { observeTurnPhases } from "./combat.mjs";

// The combat turn observer is module-wide: registered once, whatever the registrations.
let turnObserverSet = false;

const { L } = D;
let registryRef = null;
const slice = (state) => registryRef.slice(state, D.ID);
const rollSlice = (state) => registryRef.slice(state, D.ROLLS);
const privateCommit = { local: true, visibility: "private" };
const copy = (value) => structuredClone(value);
const list = (value) => (Array.isArray(value) ? value : []);
const esc = (ctx, value) => ctx.esc(value ?? "");
const lbl = (ctx, value) => ctx.esc(ctx.label(value ?? ""));
const msg = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error ?? "");
const pick = (value, lang) =>
  value && typeof value === "object"
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");
const signed = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

// ---------------------------------------------------------------- per-visit UI state

// The editor's unsaved working copy (like the Library editor), the test sheet, the
// importer's text and check result, the forge choice. Never shared, never persisted.
let session = null;
const ui = {
  test: null,
  testChoices: {},
  testRoll: null,
  activityTab: {},
  importText: "",
  importChecked: null,
  forge: { baseId: "srd2024:item:longsword", templateId: "weapon-plus-1" },
  // BI-15: after a refused «Salva», the reasons by field path (shown next to each field)
  // for that draft; and what the one «Salva» also does (share, enable) per draft.
  issues: null,
  issuesFor: null,
  publish: {},
};
export function resetView() {
  session = null;
  ui.test = null;
  ui.testChoices = {};
  ui.testRoll = null;
  ui.importText = "";
  ui.importChecked = null;
  ui.issues = null;
  ui.issuesFor = null;
  ui.publish = {};
}
export const hasDraft = () => Boolean(session?.dirty);
// The «Condividi» / «Abilita in campagna» choices beside «Salva» (the checkboxes write it).
export const saveOptionsFor = (draftId) =>
  (ui.publish[draftId] ??= { share: false, enable: false });

// ---------------------------------------------------------------- small helpers

function btn(ctx, action, label, attrs = "", kind = "quiet") {
  return `<button type="button" class="button ${kind}" data-hbe="${action}" ${attrs}>${label}</button>`;
}
const data = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `data-${k}="${String(v).replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`)
    .join(" ");
const getPath = (obj, path) => path.split(".").reduce((v, k) => v?.[k], obj);
function setPath(obj, path, value) {
  const keys = path.split(".");
  if (keys.some((k) => ["__proto__", "prototype", "constructor"].includes(k))) return;
  let parent = obj;
  for (let i = 0; i < keys.length - 1; i++)
    parent = parent[keys[i]] ??= /^\d+$/.test(keys[i + 1]) ? [] : {};
  parent[keys.at(-1)] = value;
}
// BI-15 (DDB My Creations): the reason «Salva» stopped sits next to its field.
const issueId = (path) => `hbe-issue-${path.replace(/[^A-Za-z0-9]/g, "-")}`;
function issueFor(ctx, path) {
  const issue = ui.issuesFor === session?.id ? ui.issues?.[path] : null;
  return issue
    ? `<span class="hbe-field-error" id="${issueId(path)}" role="alert">${esc(ctx, ctx.t(issue.it, issue.en))}</span>`
    : "";
}
const invalidAttrs = (path) =>
  ui.issuesFor === session?.id && ui.issues?.[path]
    ? ` aria-invalid="true" aria-describedby="${issueId(path)}"`
    : "";
function field(ctx, path, label, type = "text", extra = "") {
  const value = getPath(session.data, path);
  return `<label class="field">${label}<input type="${type}" data-hbe-path="${path}" ${type === "number" ? 'data-hbe-kind="number"' : ""} value="${esc(ctx, value ?? "")}" ${extra}${invalidAttrs(path)}>${issueFor(ctx, path)}</label>`;
}
function area(ctx, path, label, rows = 3) {
  return `<label class="field">${label}<textarea rows="${rows}" data-hbe-path="${path}"${invalidAttrs(path)}>${esc(ctx, getPath(session.data, path) ?? "")}</textarea>${issueFor(ctx, path)}</label>`;
}
function select(ctx, path, label, options, kind = "") {
  const value = getPath(session.data, path);
  return `<label class="field">${label}<select data-hbe-path="${path}" ${kind ? `data-hbe-kind="${kind}"` : ""}>${options.map(([id, name]) => `<option value="${esc(ctx, id)}" ${String(value) === String(id) ? "selected" : ""}>${name}</option>`).join("")}</select></label>`;
}
function check(ctx, path, label) {
  return `<label class="hbe-check"><input type="checkbox" data-hbe-path="${path}" data-hbe-kind="bool" ${getPath(session.data, path) ? "checked" : ""}> ${label}</label>`;
}
const bi = (ctx, path, label, kind = "input") =>
  `<div class="hbe-pair">${kind === "area" ? area(ctx, `${path}.it`, `${label} · ${ctx.t("italiano", "Italian")}`) + area(ctx, `${path}.en`, `${label} · ${ctx.t("inglese", "English")}`) : field(ctx, `${path}.it`, `${label} · ${ctx.t("italiano", "Italian")}`) + field(ctx, `${path}.en`, `${label} · ${ctx.t("inglese", "English")}`)}</div>${issueFor(ctx, path)}`;
const typeName = (ctx, type) =>
  ctx.label(hb.getHomebrewTypes().find((t) => t.id === type)?.name ?? type);
const nameOf = (ctx, value) => ctx.label(value) || ctx.t("Senza nome", "Unnamed");
function badge(ctx, level) {
  return `<span class="badge hbe-auto hbe-auto-${level}" data-hbe-automation="${level}">${lbl(ctx, D.AUTOMATION_LEVELS[level])}</span>`;
}
function readable(ctx, ref) {
  try {
    return hb.getHomebrewRevision(ctx.state, ref, ctx.role);
  } catch {
    return null;
  }
}
const commitOptionsFor = (actor) => (actor?.visibility === "private" ? privateCommit : {});
// Labels of this area's undoable changes: the sheet box offers Undo right after them.
const ownLabels = new Set();
function run(ctx, label, mutate, options = {}) {
  ownLabels.add(label);
  let out;
  ctx.commit(
    label,
    (draft) => {
      out = mutate(draft, slice(draft));
    },
    options,
  );
  return out;
}
function safely(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(msg(ctx, error), true);
    return false;
  }
}
const crumbs = (ctx, current) =>
  `<nav class="hbe-crumbs" aria-label="${ctx.t("Percorso", "Breadcrumb")}"><button type="button" class="button quiet" data-hbe="go-library">${ctx.t("Biblioteca", "Library")}</button><span aria-hidden="true">›</span><button type="button" class="button quiet" data-hbe="go-hub">${ctx.t("Le mie creazioni", "My creations")}</button>${current ? `<span aria-hidden="true">›</span><span>${current}</span>` : ""}</nav>`;

// ---------------------------------------------------------------- hub (Library section)

function myContents(ctx) {
  return hb.listHomebrew(ctx.state, ctx.role).map((e) => {
    const rev = readable(ctx, e.latestRef);
    return { ...e, data: rev?.data, access: rev?.access };
  });
}
function statusBadges(ctx, entry) {
  const out = [];
  const s = entry.data?.structured;
  const automation = s?.automation ?? D.automationOf(entry.type, s);
  out.push(badge(ctx, automation.level));
  const pub = D.publicationOf(slice(ctx.state), entry.id);
  const published = list(pub?.versions).filter((v) => v.status === "published");
  if (published.length)
    out.push(
      `<span class="badge">${ctx.t("Pubblicato", "Published")} v${published.at(-1).number}</span>`,
    );
  if (list(pub?.versions).some((v) => v.status === "queued"))
    out.push(`<span class="badge">${ctx.t("In moderazione", "In moderation")}</span>`);
  // CA-72 (FG module Allow with version): the badge names the enabled revision.
  const content = (ctx.state.library ?? []).find((c) => c.id === entry.id);
  const enabledNumbers = (ctx.state.campaign.enabledContent ?? [])
    .filter((r) => r.contentId === entry.id)
    .map((r) => (content?.revisions.findIndex((x) => x.id === r.revisionId) ?? -1) + 1)
    .filter((n) => n > 0);
  if (enabledNumbers.length)
    out.push(
      `<span class="badge" data-hbe-enabled-rev>${ctx.t("Abilitata", "Enabled")}: ${ctx.t("rev.", "rev.")} ${enabledNumbers.join(", ")}</span>`,
    );
  if (
    !D.contentActive(ctx.state, slice(ctx.state), entry.id, {
      campaignIds: [ctx.state.campaign.id],
    })
  )
    out.push(
      `<span class="badge hbe-off">${ctx.t("Disattivato nella campagna", "Disabled in the campaign")}</span>`,
    );
  if (D.modifiedFields(entry.data).length)
    out.push(
      `<span class="badge">${ctx.t("Modificato rispetto alla fonte", "Modified from source")}</span>`,
    );
  return out.join(" ");
}
export function renderHub(ctx) {
  const t = ctx.t;
  const entries = myContents(ctx);
  const mine = entries.filter((e) => e.owner === ctx.role);
  const shared = entries.filter((e) => e.owner !== ctx.role);
  const drafts = hb
    .listHomebrewDrafts(ctx.state, ctx.role)
    .filter((d) => d.data?.structured && ["create", "revise", "duplicate"].includes(d.kind));
  const followed = D.catalogEntries(ctx.state, slice(ctx.state), ctx.role).filter(
    (e) => e.followed,
  );
  const row = (e) =>
    `<article class="library-row hbe-row" data-hbe-row="${esc(ctx, e.id)}"><div><h3>${lbl(ctx, e.data?.name ?? e.name)}</h3><p>${esc(ctx, typeName(ctx, e.type))} · ${t("Revisioni", "Revisions")}: ${e.revisions.length} ${statusBadges(ctx, e)}</p></div>${btn(ctx, "open", t("Apri", "Open"), data({ content: e.id, revision: e.latestRef.revisionId }))}</article>`;
  return `<div class="hbe-hub">
  <section class="hbe-create" aria-labelledby="hbe-create-title"><h2 id="hbe-create-title">${t("Crea", "Create")}</h2><p class="muted">${t("Parti da zero, da un modello SRD o da un tuo contenuto. Dopo la base aggiungi prerequisiti, opzioni, modificatori, attività e avanzamento.", "Start from scratch, an SRD template or your own content. After the base, add prerequisites, options, modifiers, activities and advancement.")}</p><div class="hbe-create-grid">${D.CREATE_KINDS.map((k) => btn(ctx, "create", `${ctx.icon(k.id === "monster" ? "shield" : k.id === "magic-item" ? "sword" : k.id === "spell" ? "scroll" : "plus")}<span>${lbl(ctx, k.name)}</span>`, data({ kind: k.id }), "hbe-create-button")).join("")}</div><div class="toolbar">${btn(ctx, "import-page", `${ctx.icon("grid")} ${t("Importa mostri (CSV o JSON)", "Import monsters (CSV or JSON)")}`)}${btn(ctx, "catalog-page", `${ctx.icon("search")} ${t("Catalogo pubblico (simulato)", "Public catalogue (simulated)")}`)}</div></section>
  ${drafts.length ? `<section class="hbe-list"><h2>${t("Bozze private", "Private drafts")}</h2>${drafts.map((d) => `<article class="library-row"><div><h3>${lbl(ctx, d.data.name) || esc(ctx, typeName(ctx, d.type))}</h3><p>${esc(ctx, typeName(ctx, d.type))} · ${t("Non salvata come contenuto", "Not saved as content")}</p></div>${btn(ctx, "resume", t("Riprendi", "Resume"), data({ draft: d.id }))}</article>`).join("")}</section>` : ""}
  <section class="hbe-list"><h2>${t("Le mie creazioni", "My creations")} <span class="muted">(${mine.length})</span></h2>${mine.length ? mine.map(row).join("") : `<p class="empty-state">${t("Ancora nessuna creazione. Scegli cosa creare qui sopra.", "No creations yet. Choose what to create above.")}</p>`}</section>
  ${shared.length ? `<section class="hbe-list"><h2>${t("Condivise con te", "Shared with you")}</h2>${shared.map(row).join("")}</section>` : ""}
  ${followed.length ? `<section class="hbe-list"><h2>${t("Seguite dal catalogo", "Followed from the catalogue")}</h2>${followed.map((e) => `<article class="library-row"><div><h3>${lbl(ctx, e.name)}</h3><p>v${e.followed.number}${e.updateAvailable ? ` · <span class="badge hbe-new">${t(`Nuova versione v${e.latest.number}`, `New version v${e.latest.number}`)}</span>` : ""}</p></div>${btn(ctx, "catalog-page", t("Apri il catalogo", "Open catalogue"))}</article>`).join("")}</section>` : ""}
</div>`;
}

// ---------------------------------------------------------------- creating drafts

function templateDialog(ctx, kind) {
  const k = D.CREATE_KINDS.find((x) => x.id === kind);
  if (!k) return;
  if (k.forge) {
    ctx.navigate("homebrew-editor", { tab: "forge" });
    return;
  }
  const templates = D.templatesFor(k.type);
  const own = myContents(ctx).filter((e) => e.type === k.type && e.data?.structured);
  ctx.dialog(
    ctx.t(`Nuovo: ${pick(k.name, "it")}`, `New: ${pick(k.name, "en")}`),
    `<fieldset class="hbe-choice"><legend>${ctx.t("Da dove parti?", "Where do you start?")}</legend><label class="field">${ctx.t("Modello", "Template")}<select name="template">${templates.map((t) => `<option value="${esc(ctx, t.id)}">${lbl(ctx, t.name)}</option>`).join("")}${own.map((e) => `<option value="own:${esc(ctx, e.id)}:${esc(ctx, e.latestRef.revisionId)}">${lbl(ctx, e.data.name)} · ${ctx.t("copia di un tuo contenuto", "copy of your content")}</option>`).join("")}</select></label></fieldset><p class="muted">${ctx.t("Un modello SRD copia la struttura (prerequisiti, scelte, blocco): il testo lo scrivi tu e la fonte resta registrata. Condividere un contenuto non concede di usarlo come modello.", "An SRD template copies the structure (prerequisites, choices, stat block): you write the text and the source stays recorded. Sharing content does not grant using it as a template.")}</p>`,
    {
      submitLabel: ctx.t("Crea bozza privata", "Create private draft"),
      onSubmit: (form) => startDraft(ctx, k.type, String(form.get("template") ?? "scratch")),
    },
  );
}
// BI-15/BI-23/BI-24 (DDB "Create" links into one editor): every «Crea contenuto» — the
// Library's golden button, the palette, a sheet's context — opens this one dialog. The
// kind and its starting template are chosen together; a monster opens the stat block
// creator, a magic item the Forge. `returnTo` brings the saved revision back to the
// sheet or builder that asked for it.
export function createChoices() {
  const extra = hb
    .getHomebrewTypes()
    .filter((t) => !D.CREATE_KINDS.some((k) => k.type === t.id && !k.forge))
    .map((t) => ({ id: t.id, type: t.id, name: t.name }));
  return [...D.CREATE_KINDS.map((k) => ({ ...k })), ...extra];
}
export function createDialog(
  ctx,
  { kind = null, targetKind = null, returnTo = null, lock = false, template = null } = {},
) {
  const t = ctx.t;
  // PG-06 (dnd5e Compendium Browser locked to the choice): «Crea variante» from the
  // builder's class, species or background picker offers only that kind, starting from the
  // entry already chosen when it is an SRD one.
  const choices = createChoices().filter(
    (c) =>
      (!lock || c.id === kind) &&
      (!targetKind ||
        hb.getHomebrewTypes().find((x) => x.id === c.type)?.targetKind === targetKind),
  );
  if (!choices.length) return;
  const first = choices.find((c) => c.id === kind) ?? choices[0];
  const templatesOf = (c) => {
    if (c.forge) return "";
    const own = myContents(ctx).filter((e) => e.type === c.type && e.owner === ctx.role);
    return `<label class="field" data-hbe-create-template="${esc(ctx, c.id)}" ${c.id === first.id ? "" : "hidden"}>${t("Parti da", "Start from")}<select name="template-${esc(ctx, c.id)}">${D.templatesFor(
      c.type,
    )
      .map(
        (x) =>
          `<option value="${esc(ctx, x.id)}" ${c.id === first.id && x.id === template ? "selected" : ""}>${lbl(ctx, x.name)}</option>`,
      )
      .join(
        "",
      )}${own.map((e) => `<option value="own:${esc(ctx, e.id)}:${esc(ctx, e.latestRef.revisionId)}">${lbl(ctx, e.data?.name ?? e.name)} · ${t("copia di un tuo contenuto", "copy of your content")}</option>`).join("")}</select></label>`;
  };
  ctx.dialog(
    t("Crea contenuto", "Create content"),
    `<label class="field">${t("Cosa vuoi creare", "What do you want to create")}<select name="kind" data-hbe-create-kind>${choices.map((c) => `<option value="${esc(ctx, c.id)}" ${c.id === first.id ? "selected" : ""}>${lbl(ctx, c.name)}${c.forge ? ` · ${t("Forgia: oggetto di base + modello", "Forge: base item + template")}` : c.type === "creature" ? ` · ${t("blocco statistiche", "stat block")}` : ""}</option>`).join("")}</select></label>${choices.map(templatesOf).join("")}<p class="muted" data-hbe-create-forge ${first.forge ? "" : "hidden"}>${t("Nella Forgia scegli l’oggetto di base (per esempio Spada lunga) e il modello (+1, +2, +3).", "In the Forge you pick the base item (for example Longsword) and the template (+1, +2, +3).")}</p><p class="muted">${t("Un modello SRD copia la struttura e ricorda la fonte, così puoi sempre ripristinarla. Salvare non condivide e non assegna a una scheda, se non lo scegli tu.", "An SRD template copies the structure and remembers the source, so you can always revert to it. Saving does not share or assign to a sheet unless you choose so.")}</p>`,
    {
      submitLabel: t("Crea bozza privata", "Create private draft"),
      onSubmit: (form) => {
        const c = choices.find((x) => x.id === String(form.get("kind"))) ?? first;
        if (c.forge) {
          ui.forgeReturn = returnTo;
          return ctx.navigate("homebrew-editor", { tab: "forge" });
        }
        return startDraft(ctx, c.type, String(form.get(`template-${c.id}`) || "scratch"), {
          returnTo,
        });
      },
    },
  );
  // The template list follows the chosen kind (one step, as DDB's Create page).
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog?.querySelector("[data-hbe-create-kind]")?.addEventListener("change", (event) => {
    const id = event.target.value;
    dialog.querySelectorAll("[data-hbe-create-template]").forEach((el) => {
      el.hidden = el.dataset.hbeCreateTemplate !== id;
    });
    const forge = dialog.querySelector("[data-hbe-create-forge]");
    if (forge) forge.hidden = !choices.find((c) => c.id === id)?.forge;
  });
}
export function startDraft(ctx, type, templateId = "scratch", { returnTo = null } = {}) {
  const id = D.newId("draft");
  if (templateId.startsWith("own:")) {
    const [, contentId, revisionId] = templateId.split(":");
    run(
      ctx,
      ctx.t("Copia indipendente iniziata", "Independent copy started"),
      (s) =>
        hb.createHomebrewDraft(
          s,
          { id, kind: "duplicate", ref: { contentId, revisionId }, returnTo },
          ctx.role,
        ),
      privateCommit,
    );
  } else {
    const built = D.buildFromTemplate(type, templateId, ctx.lang);
    run(
      ctx,
      ctx.t("Bozza homebrew iniziata", "Homebrew draft started"),
      (s) => {
        hb.createHomebrewDraft(s, { id, kind: "create", type, returnTo }, ctx.role);
        hb.saveHomebrewDraft(s, id, { data: built }, ctx.role);
      },
      privateCommit,
    );
  }
  session = null;
  ui.test = null;
  ui.testChoices = {};
  ctx.navigate("homebrew-editor", { id, tab: "identity" });
  return id;
}

// ---------------------------------------------------------------- editor

function draftOf(ctx, id) {
  try {
    const d = hb.getHomebrewDraft(ctx.state, id, ctx.role);
    return d.status === "active" ? d : null;
  } catch {
    return null;
  }
}
function ensureSession(ctx, draft) {
  if (
    !session ||
    session.id !== draft.id ||
    session.owner !== ctx.role ||
    (!session.dirty && session.revision !== draft.revision)
  )
    session = {
      id: draft.id,
      owner: ctx.role,
      revision: draft.revision,
      type: draft.type,
      data: copy(draft.data),
      dirty: false,
    };
  session.data.structured ??= D.emptyStructured(draft.type);
  return session;
}
function persist(ctx) {
  if (!session) return false;
  const snapshot = copy(session);
  session.dirty = false;
  try {
    run(
      ctx,
      ctx.t("Bozza homebrew salvata", "Homebrew draft saved"),
      (s) =>
        hb.saveHomebrewDraft(
          s,
          snapshot.id,
          { data: snapshot.data, expectedRevision: snapshot.revision },
          ctx.role,
        ),
      privateCommit,
    );
    return true;
  } catch (error) {
    session = snapshot;
    throw error;
  }
}
const subformCount = (s, id) =>
  id === "prerequisites"
    ? list(s.prerequisites).length
    : id === "options"
      ? list(s.options).length
      : id === "modifiers"
        ? list(s.modifiers).length
        : id === "activities"
          ? list(s.activities).length
          : id === "advancement"
            ? list(s.advancement).length
            : id === "statblock"
              ? D.creatureBlocks(s.creature).length
              : null;
// BI-15 (DDB My Creations: one editor, one save): what «Salva» also does, chosen beside
// it. Nothing is shared or enabled unless ticked (saving alone stays private).
function publishFor(ctx, draft) {
  return (ui.publish[draft.id] ??= { share: false, enable: false });
}
// Every reason the draft cannot be saved yet, with the path of its field.
function saveIssues(ctx, draftId) {
  const draft = hb.getHomebrewDraft(ctx.state, draftId, ctx.role);
  const structured = draft.data.structured;
  return [
    ...hb.previewHomebrewDraft(ctx.state, draftId, ctx.role).errors,
    ...(structured && typeof structured === "object"
      ? D.validateStructured(draft.type, structured)
      : []),
  ];
}
// The sub-form holding a field path (the refused save opens it).
function tabForPath(type, path = "") {
  const head = String(path).split(".")[0];
  const tab =
    {
      prerequisites: "prerequisites",
      options: "options",
      modifiers: "modifiers",
      activities: "activities",
      advancement: "advancement",
      subclass: "advancement",
      class: "advancement",
      species: "advancement",
      background: "advancement",
      creature: "statblock",
      item: "item",
    }[head] ?? "identity";
  return D.subformsFor(type).includes(tab) ? tab : "identity";
}
function renderEditor(ctx, draft) {
  const t = ctx.t;
  ensureSession(ctx, draft);
  const s = session.data.structured;
  const type = draft.type;
  const forms = D.subformsFor(type);
  const current = forms.includes(ctx.view.tab) ? ctx.view.tab : "identity";
  // DDB-173: the base form is saved first; the sub-forms follow the first save.
  const baseSaved = !!(draft.data.name?.it?.trim() || draft.data.name?.en?.trim());
  const errors = D.validateStructured(type, s);
  const automation = D.automationOf(type, s);
  const title = nameOf(ctx, session.data.name);
  const status = session.dirty
    ? t("Modifiche non salvate · bozza privata", "Unsaved changes · private draft")
    : t("Bozza privata salvata su questo dispositivo", "Private draft saved on this device");
  const kindText =
    draft.kind === "revise"
      ? t("Nuova versione", "New version")
      : draft.kind === "duplicate"
        ? t("Copia indipendente", "Independent copy")
        : t("Nuova creazione", "New creation");
  const body =
    current === "identity" || !baseSaved
      ? (current !== "identity"
          ? `<p class="hbe-notice" role="status">${t("Dai un nome e salva la base: poi aggiungi il resto (come in D&D Beyond).", "Name it and save the base: then add the rest (as on D&D Beyond).")}</p>`
          : "") + renderIdentity(ctx, type)
      : {
          prerequisites: renderPrerequisites,
          options: renderOptions,
          modifiers: renderModifiers,
          activities: renderActivities,
          advancement: renderAdvancement,
          statblock: renderStatblockForm,
          item: renderItemForm,
        }[current](ctx, type);
  // BI-15: after a refused «Salva», the definition's own reasons join the list (each also
  // sits next to its field).
  const refused =
    ui.issuesFor === draft.id
      ? Object.values(ui.issues ?? {}).filter((e) => !errors.some((x) => x.it === e.it))
      : [];
  const allErrors = [...refused, ...errors];
  const pub = publishFor(ctx, draft);
  const canShare = session.data.source?.rights?.share !== false;
  const saveOptions = `<div class="hbe-save-options" role="group" aria-label="${t("Quando salvi", "When you save")}">${canShare ? `<label class="hbe-check"><input type="checkbox" data-hbe-publish="share" ${pub.share ? "checked" : ""}> ${ctx.role === "dm" ? t("Condividi con i giocatori", "Share with the players") : t("Condividi con il DM", "Share with the DM")}</label>` : ""}${ctx.role === "dm" ? `<label class="hbe-check"><input type="checkbox" data-hbe-publish="enable" ${pub.enable ? "checked" : ""}> ${t("Abilita in campagna", "Enable in the campaign")}</label>` : ""}</div>`;
  return `<section class="hbe-page" data-hbe-editor="${esc(ctx, draft.id)}">${crumbs(ctx, esc(ctx, title))}
  <header class="page-heading hbe-heading"><div><p class="muted">${esc(ctx, typeName(ctx, type))} · ${kindText}</p><h1>${esc(ctx, title)}</h1><p data-hbe-status role="status">${status}</p><p>${badge(ctx, automation.level)}</p></div><div class="toolbar hbe-save-bar">${saveOptions}${btn(ctx, "save-content", t("Salva", "Save"), allErrors.length ? `aria-describedby="hbe-errors"` : "", "primary")}</div></header>
  ${
    allErrors.length
      ? `<ul id="hbe-errors" class="library-issues hbe-errors">${allErrors
          .slice(0, 6)
          .map((e) => `<li>${esc(ctx, ctx.t(e.it, e.en))}</li>`)
          .join("")}</ul>`
      : ""
  }
  <div class="hbe-editor-layout"><nav class="hbe-subforms" aria-label="${t("Sezioni del contenuto", "Content sections")}">${forms
    .map((id) => {
      const n = subformCount(s, id);
      return `<button type="button" class="button ${id === current ? "active" : "quiet"}" data-hbe="subform" data-subform="${id}" ${id === current ? 'aria-current="page"' : ""}>${lbl(ctx, D.SUBFORMS[id])}${n ? ` <span class="badge">${n}</span>` : ""}</button>`;
    })
    .join(
      "",
    )}<p class="muted hbe-autosave">${t("La bozza si conserva quando cambi sezione.", "The draft is kept when you change section.")}</p>${btn(ctx, "save-draft", t("Salva bozza", "Save draft"))}${btn(ctx, "discard-draft", t("Scarta bozza", "Discard draft"), "", "danger hbe-discard")}</nav>
  <form class="hbe-form" data-hbe-form="editor" novalidate>${body}</form>
  <aside class="hbe-side">${renderPreview(ctx, type, session.data)}${renderTest(ctx, type, session.data)}</aside></div></section>`;
}
function renderIdentity(ctx, type) {
  const t = ctx.t;
  const d = session.data;
  return `<fieldset><legend>${t("Identità", "Identity")}</legend>${bi(ctx, "name", t("Nome", "Name"))}${bi(ctx, "description", t("Descrizione", "Description"), "area")}<p class="muted">${t("Basta una lingua: una traduzione mancante non viene inventata.", "One language is enough: a missing translation is not invented.")}</p></fieldset>
  ${type === "spell" ? `<fieldset><legend>${t("Incantesimo", "Spell")}</legend><div class="hbe-pair">${field(ctx, "fields.level", t("Livello (0 = trucchetto)", "Level (0 = cantrip)"), "number", 'min="0" max="9" step="1"')}${field(ctx, "fields.school", t("Scuola", "School"))}</div></fieldset>` : ""}
  ${["weapon", "armor", "item", "consumable"].includes(type) ? `<fieldset><legend>${t("Oggetto", "Item")}</legend><div class="hbe-pair">${field(ctx, "fields.weight", t("Peso per copia (kg)", "Weight per copy (kg)"), "number", 'min="0" step="any"')}${field(ctx, "fields.value", t("Valore (mo), se noto", "Value (gp), if known"), "number", 'min="0" step="any"')}</div></fieldset>` : ""}
  <fieldset><legend>${t("Fonte e diritti", "Source and rights")}</legend><div class="hbe-pair">${select(
    ctx,
    "source.kind",
    t("Origine", "Origin"),
    [
      ["authored", t("Creazione originale", "Original creation")],
      ["reconstruction", t("Ricostruzione da una fonte", "Reconstruction from a source")],
    ],
  )}${select(ctx, "source.edition", t("Edizione", "Edition"), [
    ["2024", "2024"],
    ["unknown", t("Non nota o altra", "Unknown or other")],
  ])}</div>${field(ctx, "source.label", t("Autore o fonte (obbligatorio)", "Author or source (required)"))}${field(ctx, "source.reference", t("Riferimento preciso", "Precise reference"))}${check(ctx, "source.rights.modify", t("Consente copie modificabili", "Allows editable copies"))}${check(ctx, "source.rights.share", t("Consente la condivisione", "Allows sharing"))}${check(ctx, "source.rights.export", t("Consente l’esportazione", "Allows export"))}${d.structured?.template ? `<p class="muted">${t("Modello", "Template")}: ${lbl(ctx, d.structured.template.name)}${d.structured.template.source ? ` · SRD 5.2.1 ${esc(ctx, D.sourcePages(d.structured.template.source))}` : ""}</p>` : ""}</fieldset>`;
}
function renderPrerequisites(ctx) {
  const t = ctx.t;
  const groups = session.data.structured.prerequisites;
  return `<fieldset><legend>${t("Prerequisiti", "Prerequisites")}</legend><p class="muted">${t("Tutti i gruppi devono essere soddisfatti; dentro un gruppo scegli «uno tra» (o) oppure «tutti» (e). Un requisito testuale resta un controllo manuale.", "Every group must be met; inside a group choose “any of” (or) or “all of” (and). A text requirement stays a manual check.")}</p>${groups
    .map(
      (g, gi) =>
        `<section class="hbe-card" data-hbe-group="${gi}"><div class="hbe-card-head"><strong>${t("Gruppo", "Group")} ${gi + 1}</strong>${select(
          ctx,
          `structured.prerequisites.${gi}.mode`,
          t("Regola", "Rule"),
          [
            ["any", t("Uno tra (o)", "Any of (or)")],
            ["all", t("Tutti (e)", "All of (and)")],
          ],
        )}${btn(ctx, "remove-group", t("Rimuovi gruppo", "Remove group"), data({ group: gi }))}</div>${g.rules
          .map((r, ri) => {
            const p = `structured.prerequisites.${gi}.rules.${ri}`;
            const inner =
              r.kind === "ability"
                ? select(
                    ctx,
                    `${p}.ability`,
                    t("Caratteristica", "Ability"),
                    D.ABILITIES.map((a) => [a, lbl(ctx, D.abilityName(a))]),
                  ) +
                  field(
                    ctx,
                    `${p}.min`,
                    t("Minimo", "Minimum"),
                    "number",
                    'min="1" max="30" step="1"',
                  )
                : r.kind === "level"
                  ? field(
                      ctx,
                      `${p}.min`,
                      t("Livello minimo", "Minimum level"),
                      "number",
                      'min="1" max="20" step="1"',
                    )
                  : r.kind === "class"
                    ? select(
                        ctx,
                        `${p}.classId`,
                        t("Classe", "Class"),
                        D.CLASS_OPTIONS.map((c) => [c.id, lbl(ctx, c.name)]),
                      )
                    : bi(ctx, `${p}.text`, t("Requisito testuale", "Text requirement"));
            return `<div class="hbe-rule">${ri ? `<span class="hbe-join">${g.mode === "any" ? t("o", "or") : t("e", "and")}</span>` : ""}${inner}${btn(ctx, "remove-rule", t("Rimuovi", "Remove"), data({ group: gi, rule: ri }))}</div>`;
          })
          .join(
            "",
          )}<div class="toolbar">${btn(ctx, "add-rule", t("+ Caratteristica", "+ Ability"), data({ group: gi, kind: "ability" }))}${btn(ctx, "add-rule", t("+ Livello", "+ Level"), data({ group: gi, kind: "level" }))}${btn(ctx, "add-rule", t("+ Classe", "+ Class"), data({ group: gi, kind: "class" }))}${btn(ctx, "add-rule", t("+ Testo", "+ Text"), data({ group: gi, kind: "text" }))}</div></section>`,
    )
    .join(
      "",
    )}${btn(ctx, "add-group", t("Aggiungi gruppo di prerequisiti", "Add prerequisite group"), "", "")}</fieldset>`;
}
function modifierRow(ctx, path, removeAttrs) {
  const t = ctx.t;
  const m = getPath(session.data, path);
  const info = D.MODIFIER_TARGETS.find((x) => x.id === m.target);
  return `<div class="hbe-modifier" data-hbe-modifier="${esc(ctx, m.id)}">${select(
    ctx,
    `${path}.target`,
    t("Valore", "Value"),
    D.MODIFIER_TARGETS.map((x) => [
      x.id,
      lbl(ctx, x.name) + (x.automated ? "" : t(" · manuale", " · manual")),
    ]),
  )}${select(
    ctx,
    `${path}.mode`,
    t("Operazione", "Operation"),
    D.MODIFIER_MODES.map((x) => [x.id, lbl(ctx, x.name)]),
  )}${
    D.ROLL_MODES.includes(m.mode)
      ? `<p class="muted">${t("Vantaggio e svantaggio valgono per prove, tiri salvezza, iniziativa e attacchi: la scheda lo indica e scegli la modalità quando tiri.", "Advantage and Disadvantage apply to checks, saving throws, initiative and attacks: the sheet shows it and you choose the mode when you roll.")}</p>`
      : `${field(ctx, `${path}.value`, t("Numero", "Number"), "number", 'step="any"')}${select(
          ctx,
          `${path}.scale`,
          t("Cresce con", "Scales with"),
          D.MODIFIER_SCALES.map((x) => [x.id, lbl(ctx, x.name)]),
        )}${m.mode === "add" ? field(ctx, `${path}.limit`, t("Fino a un massimo di (facoltativo)", "Up to a maximum of (optional)"), "number", 'min="1" max="30" step="1"') : ""}`
  }${select(
    ctx,
    `${path}.duration.anchor`,
    t("Durata", "Duration"),
    D.MODIFIER_DURATIONS.map((x) => [x.id, lbl(ctx, x.name)]),
  )}${m.duration?.anchor === "rounds" ? field(ctx, `${path}.duration.rounds`, t("Round", "Rounds"), "number", 'min="1" max="100" step="1"') : ""}${D.isTimed(m) ? `<p class="muted">${t("Si attiva quando usi un’attività di questa voce o con «Attiva» sulla scheda, e termina da solo.", "It starts when you use one of this entry’s activities or with “Activate” on the sheet, and ends on its own.")}</p>` : ""}${bi(ctx, `${path}.condition`, t("Condizione (la rende manuale)", "Condition (makes it manual)"))}${info && !info.automated && !D.ROLL_MODES.includes(m.mode) ? `<p class="muted">${t("Valore non collegato alla scheda: sarà mostrato come manuale.", "Value not connected to the sheet: it will show as manual.")}</p>` : ""}${btn(ctx, removeAttrs[0], t("Rimuovi modificatore", "Remove modifier"), removeAttrs[1])}</div>`;
}
function renderOptions(ctx) {
  const t = ctx.t;
  const options = session.data.structured.options;
  return `<fieldset><legend>${t("Opzioni «scegli N»", "“Choose N” options")}</legend><p class="muted">${t("Chi usa il contenuto sceglie N alternative; ogni alternativa può portare i suoi modificatori. «Concedi» e «permetti di scegliere» restano distinti.", "Whoever uses the content picks N alternatives; each alternative can bring its own modifiers. “Grant” and “allow to choose” stay distinct.")}</p>${options
    .map(
      (o, oi) =>
        `<section class="hbe-card" data-hbe-option="${oi}"><div class="hbe-card-head"><strong>${t("Opzione", "Option")} ${oi + 1}</strong>${btn(ctx, "remove-option", t("Rimuovi opzione", "Remove option"), data({ option: oi }))}</div>${bi(ctx, `structured.options.${oi}.name`, t("Titolo della scelta", "Choice title"))}${field(ctx, `structured.options.${oi}.choose`, t("Quante alternative scegliere", "How many alternatives to choose"), "number", `min="1" max="${Math.max(1, o.from.length - 1)}" step="1"`)}<ol class="hbe-alternatives">${o.from
          .map(
            (c, ci) =>
              `<li class="hbe-card-inner">${bi(ctx, `structured.options.${oi}.from.${ci}.name`, `${t("Alternativa", "Alternative")} ${ci + 1}`)}${c.modifiers.map((m, mi) => modifierRow(ctx, `structured.options.${oi}.from.${ci}.modifiers.${mi}`, ["remove-choice-mod", data({ option: oi, choice: ci, mod: mi })])).join("")}<div class="toolbar">${btn(ctx, "add-choice-mod", t("+ Modificatore dell’alternativa", "+ Alternative modifier"), data({ option: oi, choice: ci }))}${o.from.length > 2 ? btn(ctx, "remove-choice", t("Rimuovi alternativa", "Remove alternative"), data({ option: oi, choice: ci })) : ""}</div></li>`,
          )
          .join(
            "",
          )}</ol>${btn(ctx, "add-choice", t("+ Alternativa", "+ Alternative"), data({ option: oi }))}</section>`,
    )
    .join("")}${btn(ctx, "add-option", t("Aggiungi opzione", "Add option"), "", "")}</fieldset>`;
}
function renderModifiers(ctx) {
  const t = ctx.t;
  const mods = session.data.structured.modifiers;
  return `<fieldset><legend>${t("Modificatori", "Modifiers")}</legend><p class="muted">${t("Ordine di cumulo esplicito: imposta base → somma → minimo/massimo → moltiplica → sostituisci. Si applicano alla scheda finché la voce è attiva.", "Explicit stacking order: set base → add → minimum/maximum → multiply → override. They apply to the sheet while the entry is active.")}</p><ol class="hbe-order" aria-label="${t("Ordine di cumulo", "Stacking order")}">${D.MODIFIER_MODES.map((m) => `<li>${lbl(ctx, m.name)}</li>`).join("")}</ol>${mods.map((m, i) => modifierRow(ctx, `structured.modifiers.${i}`, ["remove-modifier", data({ mod: i })])).join("")}${btn(ctx, "add-modifier", t("Aggiungi modificatore", "Add modifier"), "", "")}</fieldset>`;
}
function renderActivities(ctx) {
  const t = ctx.t;
  const acts = session.data.structured.activities;
  return `<fieldset><legend>${t("Attività", "Activities")}</legend><p class="muted">${t("Come nelle attività di dnd5e: Identità, Attivazione, Effetto. Il costo si paga all’uso, mai all’apertura o all’anteprima.", "As in dnd5e activities: Identity, Activation, Effect. The cost is paid on use, never on opening or preview.")}</p>${acts
    .map((a, i) => {
      const p = `structured.activities.${i}`;
      const tab = ui.activityTab[a.id] ?? "identity";
      const type = D.ACTIVITY_TYPES.find((x) => x.id === a.type);
      const panes = {
        identity: `${select(
          ctx,
          `${p}.type`,
          t("Tipo", "Type"),
          D.ACTIVITY_TYPES.map((x) => [x.id, lbl(ctx, x.name)]),
        )}${bi(ctx, `${p}.name`, t("Nome", "Name"))}${bi(ctx, `${p}.description`, t("Descrizione", "Description"), "area")}`,
        activation: `${select(
          ctx,
          `${p}.activation.type`,
          t("Costo", "Cost"),
          D.ACTIVATIONS.map((x) => [x.id, lbl(ctx, x.name)]),
        )}<div class="hbe-pair">${field(ctx, `${p}.activation.rangeMeters`, t("Portata (m)", "Range (m)"), "number", 'min="0" step="0.5"')}${field(ctx, `${p}.activation.targets`, t("Bersagli", "Targets"), "number", 'min="0" max="10" step="1"')}</div>`,
        effect:
          a.type === "save"
            ? `<div class="hbe-pair">${select(
                ctx,
                `${p}.save.ability`,
                t("Tiro salvezza su", "Saving throw"),
                D.ABILITIES.map((x) => [x, lbl(ctx, D.abilityName(x))]),
              )}${select(ctx, `${p}.save.dc.mode`, t("CD", "DC"), [
                ["ability", t("8 + competenza + caratteristica", "8 + proficiency + ability")],
                ["fixed", t("Fissa", "Fixed")],
              ])}</div>${
                a.save.dc.mode === "fixed"
                  ? field(
                      ctx,
                      `${p}.save.dc.value`,
                      t("CD fissa", "Fixed DC"),
                      "number",
                      'min="1" max="30" step="1"',
                    )
                  : select(
                      ctx,
                      `${p}.save.dc.ability`,
                      t("Caratteristica della CD", "DC ability"),
                      D.ABILITIES.map((x) => [x, lbl(ctx, D.abilityName(x))]),
                    )
              }<div class="hbe-pair">${select(ctx, `${p}.effect.conditionId`, t("Se fallisce: condizione", "On a failed save: condition"), [["", t("Nessuna", "None")], ...D.CONDITIONS.map((c) => [c.id, lbl(ctx, c.name)])])}${select(
                ctx,
                `${p}.effect.duration`,
                t("Durata", "Duration"),
                D.DURATION_ANCHORS.map((x) => [x.id, lbl(ctx, x.name)]),
              )}</div><div class="hbe-pair">${field(ctx, `${p}.damage.dice`, t("Danni (facoltativi, es. 2d6)", "Damage (optional, e.g. 2d6)"))}${select(
                ctx,
                `${p}.damage.type`,
                t("Tipo di danno", "Damage type"),
                D.DAMAGE_TYPES.map((x) => [x, lbl(ctx, D.damageName(x))]),
              )}</div>`
            : a.type === "attack"
              ? `<div class="hbe-pair">${field(ctx, `${p}.attack.bonus`, t("Bonus al tiro per colpire", "Attack bonus"), "number", 'min="-5" max="20" step="1"')}${field(ctx, `${p}.damage.dice`, t("Danni (es. 1d8+3)", "Damage (e.g. 1d8+3)"))}</div>${select(
                  ctx,
                  `${p}.damage.type`,
                  t("Tipo di danno", "Damage type"),
                  D.DAMAGE_TYPES.map((x) => [x, lbl(ctx, D.damageName(x))]),
                )}`
              : a.type === "damage"
                ? `<div class="hbe-pair">${field(ctx, `${p}.damage.dice`, t("Danni (es. 2d6)", "Damage (e.g. 2d6)"))}${select(
                    ctx,
                    `${p}.damage.type`,
                    t("Tipo di danno", "Damage type"),
                    D.DAMAGE_TYPES.map((x) => [x, lbl(ctx, D.damageName(x))]),
                  )}</div>`
                : a.type === "heal"
                  ? field(ctx, `${p}.heal.dice`, t("Cura (es. 2d4+2)", "Healing (e.g. 2d4+2)"))
                  : `<p class="muted">${t("Evoca, trasforma e utilità sono promemoria: l’uso si registra e paga il costo, il resto lo gestisce il tavolo.", "Summon, transform and utility are reminders: using records the use and pays the cost, the table handles the rest.")}</p>`,
      };
      return `<section class="hbe-card" data-hbe-activity="${esc(ctx, a.id)}"><div class="hbe-card-head"><strong>${lbl(ctx, a.name) || t("Attività", "Activity") + " " + (i + 1)}</strong><span class="badge">${lbl(ctx, type?.name)}</span>${btn(ctx, "remove-activity", t("Rimuovi attività", "Remove activity"), data({ activity: i }))}</div><div class="tabs hbe-activity-tabs" role="tablist">${[
        ["identity", t("Identità", "Identity")],
        ["activation", t("Attivazione", "Activation")],
        ["effect", t("Effetto", "Effect")],
      ]
        .map(
          ([id, name]) =>
            `<button type="button" role="tab" class="${id === tab ? "active" : ""}" aria-selected="${id === tab}" data-hbe="activity-tab" data-activity-id="${esc(ctx, a.id)}" data-pane="${id}">${name}</button>`,
        )
        .join("")}</div><div class="hbe-pane">${panes[tab]}</div></section>`;
    })
    .join(
      "",
    )}<div class="toolbar hbe-add-activity"><label class="field">${t("Nuova attività", "New activity")}<select data-hbe-new-activity>${D.ACTIVITY_TYPES.map((x) => `<option value="${x.id}">${lbl(ctx, x.name)}</option>`).join("")}</select></label>${btn(ctx, "add-activity", t("Aggiungi attività", "Add activity"), "", "")}</div></fieldset>`;
}
// PG-06 (D&D Beyond homebrew species and backgrounds): the numbers the character builder
// reads. A species' level-1 «Privilegio» rows below are its traits.
function originFields(ctx, type, s) {
  const t = ctx.t;
  const checks = (path, options, chosen) =>
    options
      .map(
        ([id, name]) =>
          `<label class="hbe-check"><input type="checkbox" data-hbe-array="${path}" value="${esc(ctx, id)}" ${list(chosen).includes(id) ? "checked" : ""}> ${name}</label>`,
      )
      .join(" ");
  if (type === "species")
    return `<div class="hbe-pair" data-hbe-origin="species">${select(
      ctx,
      "structured.species.size",
      t("Taglia", "Size"),
      [
        ["medium", t("Media", "Medium")],
        ["small", t("Piccola", "Small")],
        ["choice", t("Piccola o Media, a scelta", "Small or Medium, chosen")],
      ],
    )}${field(ctx, "structured.species.speed", t("Velocità (m)", "Speed (m)"), "number", 'min="1.5" max="30" step="1.5"')}</div>${issueFor(ctx, "species")}<p class="muted">${t("I privilegi del 1° livello qui sotto sono i tratti della specie: il costruttore dei personaggi li aggiunge alla scheda.", "The level 1 features below are the species’ traits: the character builder adds them to the sheet.")}</p>`;
  const b = s.background ?? {};
  return `<div data-hbe-origin="background"><p class="muted">${t("Caratteristiche che il background può aumentare (tre)", "Abilities the background can increase (three)")}: ${checks(
    "structured.background.abilities",
    D.ABILITIES.map((a) => [a, lbl(ctx, D.ABILITY_SHORT[a])]),
    b.abilities,
  )}</p>${issueFor(ctx, "background.abilities")}<p class="muted">${t("Abilità (due)", "Skills (two)")}: ${checks(
    "structured.background.skills",
    D.SKILL_OPTIONS.map((k) => [k.id, lbl(ctx, k.name)]),
    b.skills,
  )}</p>${issueFor(ctx, "background.skills")}${select(ctx, "structured.background.featId", t("Talento di origine", "Origin feat"), [["", t("Scegli il talento…", "Choose the feat…")], ...D.ORIGIN_FEATS.map((f) => [f.id, lbl(ctx, f.name)])])}${issueFor(ctx, "background.featId")}</div>`;
}
function renderAdvancement(ctx, type) {
  const t = ctx.t;
  const s = session.data.structured;
  const advs = s.advancement;
  const levels = type === "subclass" ? (D.SUBCLASS_LEVELS[s.subclass?.classId] ?? []) : [];
  return `<fieldset><legend>${t("Avanzamento", "Advancement")}</legend>${
    type === "subclass"
      ? `${select(ctx, "structured.subclass.classId", t("Classe", "Class"), [["", t("Scegli la classe…", "Choose the class…")], ...D.CLASS_OPTIONS.map((c) => [c.id, lbl(ctx, c.name)])])}${levels.length ? `<p class="muted">${t("Livelli di sottoclasse della classe (tabella 2024)", "Class subclass levels (2024 table)")}: ${levels.join(", ")}. ${t("La tua homebrew privata può usarne altri; la pubblicazione li richiede.", "Your private homebrew may use others; publishing requires them.")}</p>` : ""}`
      : type === "class"
        ? `<div class="hbe-pair">${select(
            ctx,
            "structured.class.hitDie",
            t("Dado Vita", "Hit Die"),
            [6, 8, 10, 12].map((n) => [n, `d${n}`]),
            "number",
          )}${select(ctx, "structured.class.caster", t("Incantesimi", "Spellcasting"), [
            ["none", t("Nessuno", "None")],
            ["full", t("Completo", "Full")],
            ["half", t("Metà", "Half")],
          ])}</div><p class="muted">${t("Tiri salvezza competenti", "Saving throw proficiencies")}: ${D.ABILITIES.map((a) => `<label class="hbe-check"><input type="checkbox" data-hbe-array="structured.class.saves" value="${a}" ${list(s.class?.saves).includes(a) ? "checked" : ""}> ${lbl(ctx, D.ABILITY_SHORT[a])}</label>`).join(" ")}</p>`
        : type === "species" || type === "background"
          ? originFields(ctx, type, s)
          : ""
  }<p class="muted">${t("Come l’Avanzamento di dnd5e: ogni riga dice cosa ottiene o sceglie il personaggio a quel livello.", "Like dnd5e Advancement: each row says what the character gains or chooses at that level.")}</p>${[
    ...advs,
  ]
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a.level - y.a.level)
    .map(({ a, i }) => {
      const p = `structured.advancement.${i}`;
      const kind = D.ADVANCEMENT_TYPES.find((x) => x.id === a.type);
      const inner =
        a.type === "grant"
          ? a.features
              .map(
                (f, fi) =>
                  `<div class="hbe-card-inner">${bi(ctx, `${p}.features.${fi}.name`, t("Privilegio", "Feature"))}${bi(ctx, `${p}.features.${fi}.description`, t("Testo", "Text"), "area")}${a.features.length > 1 ? btn(ctx, "remove-feature", t("Rimuovi privilegio", "Remove feature"), data({ adv: i, feature: fi })) : ""}</div>`,
              )
              .join("") + btn(ctx, "add-feature", t("+ Privilegio", "+ Feature"), data({ adv: i }))
          : a.type === "scale"
            ? `${bi(ctx, `${p}.scale.name`, t("Nome del valore", "Value name"))}<div class="hbe-scale">${Object.keys(
                a.scale.values,
              )
                .map(Number)
                .sort((x, y) => x - y)
                .map(
                  (lv) =>
                    `<label class="field">${t("Dal livello", "From level")} ${lv}<input data-hbe-path="${p}.scale.values.${lv}" value="${esc(ctx, a.scale.values[lv])}"></label>`,
                )
                .join(
                  "",
                )}<label class="field">${t("Aggiungi livello", "Add level")}<input type="number" min="1" max="20" step="1" data-hbe-scale-level="${i}"></label>${btn(ctx, "add-scale-level", t("+ Livello", "+ Level"), data({ adv: i }))}</div>`
            : a.type === "asi"
              ? `<div class="hbe-pair">${field(ctx, `${p}.asi.points`, t("Punti da distribuire", "Points to assign"), "number", 'min="1" max="4" step="1"')}${field(ctx, `${p}.asi.limit`, t("Fino a un massimo di", "Up to a maximum of"), "number", 'min="10" max="30" step="1"')}</div>`
              : `${bi(ctx, `${p}.choice.name`, t("Titolo della scelta", "Choice title"))}${a.choice.from.map((f, fi) => bi(ctx, `${p}.choice.from.${fi}.name`, `${t("Alternativa", "Alternative")} ${fi + 1}`)).join("")}`;
      const offLevel = levels.length && !levels.includes(a.level);
      return `<section class="hbe-card" data-hbe-advancement="${a.level}"><div class="hbe-card-head">${field(ctx, `${p}.level`, t("Livello", "Level"), "number", 'min="1" max="20" step="1"')}<span class="badge">${lbl(ctx, kind?.name)}</span>${offLevel ? `<span class="badge hbe-off">${t("fuori dai livelli di sottoclasse", "off the subclass levels")}</span>` : ""}${btn(ctx, "remove-advancement", t("Rimuovi", "Remove"), data({ adv: i }))}</div>${inner}</section>`;
    })
    .join(
      "",
    )}<div class="toolbar"><label class="field">${t("Tipo", "Type")}<select data-hbe-new-advancement>${D.ADVANCEMENT_TYPES.map((x) => `<option value="${x.id}">${lbl(ctx, x.name)}</option>`).join("")}</select></label><label class="field">${t("Livello", "Level")}<input type="number" min="1" max="20" step="1" value="${levels[0] ?? 1}" data-hbe-new-advancement-level></label>${btn(ctx, "add-advancement", t("Aggiungi avanzamento", "Add advancement"), "", "")}</div></fieldset>`;
}
function renderItemForm(ctx, type) {
  const t = ctx.t;
  const item = session.data.structured.item ?? {};
  return `<fieldset><legend>${t("Oggetto", "Item")}</legend>${item.baseId ? `<p>${t("Oggetto di base", "Base item")}: <strong>${lbl(ctx, D.forgeBases().find((b) => b.id === item.baseId)?.name)}</strong> · ${t("modelli", "templates")}: ${esc(ctx, list(item.templates).join(", "))}</p>` : ""}${select(
    ctx,
    "structured.item.rarity",
    t("Rarità", "Rarity"),
    Object.entries({
      common: L("Comune", "Common"),
      uncommon: L("Non comune", "Uncommon"),
      rare: L("Raro", "Rare"),
      "very-rare": L("Molto raro", "Very rare"),
      legendary: L("Leggendario", "Legendary"),
    }).map(([id, n]) => [id, lbl(ctx, n)]),
  )}${check(ctx, "structured.item.magical", t("Magico", "Magical"))}${check(ctx, "structured.item.attunement", t("Richiede sintonia", "Requires attunement"))}${
    item.weapon
      ? `<div class="hbe-pair">${field(ctx, "structured.item.weapon.damage.dice", t("Dadi dei danni", "Damage dice"))}${field(ctx, "structured.item.weapon.versatile", t("A due mani (versatile)", "Two-handed (versatile)"))}</div><div class="hbe-pair">${field(ctx, "structured.item.weapon.attackBonus", t("Bonus per colpire", "Attack bonus"), "number", 'min="0" max="3" step="1"')}${field(ctx, "structured.item.weapon.damageBonus", t("Bonus ai danni", "Damage bonus"), "number", 'min="0" max="3" step="1"')}</div>`
      : ""
  }${item.armor ? `<div class="hbe-pair">${field(ctx, "structured.item.armor.ac", t("CA base", "Base AC"), "number", 'min="0" max="30" step="1"')}${field(ctx, "structured.item.armor.acBonus", t("Bonus alla CA", "AC bonus"), "number", 'min="0" max="3" step="1"')}</div>` : ""}</fieldset>`;
}
const SECTIONS = [
  ["traits", L("Tratti", "Traits")],
  ["actions", L("Azioni", "Actions")],
  ["bonusActions", L("Azioni bonus", "Bonus actions")],
  ["reactions", L("Reazioni", "Reactions")],
];
function blockEditor(ctx, path, section, bi_, removable = true) {
  const t = ctx.t;
  const b = getPath(session.data, path);
  const segs = [...D.parseRollables(b.text?.it), ...D.parseRollables(b.text?.en)].filter(
    (x) => x.rollable,
  );
  return `<div class="hbe-card-inner" data-hbe-block="${esc(ctx, b.id)}">${bi(ctx, `${path}.name`, t("Nome", "Name"))}${bi(ctx, `${path}.text`, t("Testo", "Text"), "area")}<p class="muted">${t("Blocchi tirabili", "Rollable blocks")}: ${segs.length ? segs.map((x) => `<code>${esc(ctx, x.rollable.display)}</code>${x.rollable.valid ? "" : " ⚠"}`).join(" ") : t("nessuno", "none")}</p><div class="toolbar">${btn(ctx, "auto-rollables", t("Rendi tirabili i dadi", "Make dice rollable"), data({ path }))}${removable ? btn(ctx, "remove-block", t("Rimuovi voce", "Remove entry"), data({ section, block: bi_ })) : ""}</div></div>`;
}
function renderStatblockForm(ctx) {
  const t = ctx.t;
  const c = session.data.structured.creature;
  const p = "structured.creature";
  return `<fieldset><legend>${t("Punto di partenza", "Starting point")}</legend><div class="toolbar"><label class="field">${t("Modello predefinito (SRD 5.2.1)", "Preset (SRD 5.2.1)")}<select data-hbe-preset><option value="">${t("Scegli un modello…", "Choose a preset…")}</option>${D.templatesFor(
    "creature",
  )
    .filter((x) => x.kind === "srd")
    .map((x) => `<option value="${esc(ctx, x.id)}">${lbl(ctx, x.name)}</option>`)
    .join(
      "",
    )}</select></label>${btn(ctx, "apply-preset", t("Applica il modello", "Apply preset"))}</div><p class="muted">${t("Come Tetra-cube: il modello sostituisce il blocco; il testo resta da scrivere e la fonte resta registrata.", "Like Tetra-cube: the preset replaces the block; the text is yours to write and the source stays recorded.")}</p></fieldset>
  <fieldset><legend>${t("Informazioni generali", "General info")}</legend><div class="hbe-grid3">${select(
    ctx,
    `${p}.size`,
    t("Taglia", "Size"),
    D.SIZES.map((x) => [x, lbl(ctx, srdLabel("size", x))]),
  )}${select(
    ctx,
    `${p}.type`,
    t("Tipo", "Type"),
    D.CREATURE_TYPES.map((x) => [x, lbl(ctx, srdLabel("creatureType", x))]),
  )}${select(
    ctx,
    `${p}.cr`,
    t("Grado di sfida", "Challenge rating"),
    D.CR_LIST.map((x) => [x, x]),
  )}</div>${bi(ctx, `${p}.alignment`, t("Allineamento", "Alignment"))}<div class="hbe-grid3">${field(ctx, `${p}.ac`, t("Classe Armatura", "Armor Class"), "number", 'min="1" max="30" step="1"')}${field(ctx, `${p}.hp.average`, t("Punti ferita", "Hit points"), "number", 'min="1" step="1"')}${field(ctx, `${p}.hp.dice`, t("Dadi Vita (es. 5d8+5)", "Hit dice (e.g. 5d8+5)"))}</div>${field(ctx, `${p}.speedMeters`, t("Velocità (m)", "Speed (m)"), "number", 'min="0" step="1.5"')}<div class="hbe-abilities">${D.ABILITIES.map((a) => field(ctx, `${p}.abilities.${a}`, lbl(ctx, D.ABILITY_SHORT[a]), "number", 'min="1" max="30" step="1"')).join("")}</div>${bi(ctx, `${p}.senses`, t("Sensi", "Senses"))}${bi(ctx, `${p}.languages`, t("Lingue", "Languages"))}</fieldset>
  ${SECTIONS.map(
    ([id, name]) =>
      `<fieldset data-hbe-section="${id}"><legend>${lbl(ctx, name)}</legend>${list(c.sections[id])
        .map((b, i) => blockEditor(ctx, `${p}.sections.${id}.${i}`, id, i))
        .join(
          "",
        )}${btn(ctx, "add-block", t("+ Voce", "+ Entry"), data({ section: id }))}</fieldset>`,
  ).join("")}
  ${["legendary", "lair"]
    .map((id) => {
      const sec = c.sections[id];
      return `<fieldset data-hbe-section="${id}"><legend>${id === "legendary" ? t("Azioni leggendarie", "Legendary actions") : t("Azioni di tana", "Lair actions")}</legend>${check(ctx, `${p}.sections.${id}.enabled`, id === "legendary" ? t("Questa creatura ha azioni leggendarie", "This creature has legendary actions") : t("Questa creatura ha una tana", "This creature has a lair"))}${
        sec.enabled
          ? `${id === "legendary" ? field(ctx, `${p}.sections.legendary.uses`, t("Usi per round", "Uses per round"), "number", 'min="1" max="5" step="1"') : ""}${bi(ctx, `${p}.sections.${id}.intro`, t("Introduzione", "Introduction"), "area")}${list(
              sec.actions,
            )
              .map((b, i) =>
                blockEditor(ctx, `${p}.sections.${id}.actions.${i}`, `${id}.actions`, i),
              )
              .join(
                "",
              )}${btn(ctx, "add-block", t("+ Voce", "+ Entry"), data({ section: `${id}.actions` }))}`
          : ""
      }</fieldset>`;
    })
    .join("")}`;
}
const srdLabel = (group, id) => D.labelFor(group, id);

// ---------------------------------------------------------------- preview, stat block, test

function segmentsHtml(ctx, value, attrs) {
  return D.parseRollables(value)
    .map((seg, i) =>
      seg.text != null
        ? esc(ctx, seg.text)
        : seg.rollable.valid
          ? `<button type="button" class="hbe-roll" ${attrs(i, seg.rollable)} title="${esc(ctx, seg.rollable.dice)}">${ctx.icon("dice")}<span>${esc(ctx, seg.rollable.display)}</span></button>`
          : `<span class="hbe-invalid">${esc(ctx, seg.rollable.raw)}</span>`,
    )
    .join("");
}
// The stat block as players of D&D Beyond Encounters see it; rollable blocks become
// buttons (`mode` test: a local try in the editor; live: the shared roll service).
export function statblockHtml(ctx, name, c, { mode = "test", ref = null } = {}) {
  const t = ctx.t;
  if (!c) return "";
  const block = (b, section, index) =>
    `<p class="hbe-sb-entry"><strong>${lbl(ctx, b.name)}.</strong> ${segmentsHtml(ctx, ctx.label(b.text), (seg) => data({ hbe: mode === "test" ? "test-roll" : "roll-block", section, block: index, seg, lang: b.text?.[ctx.lang] ? ctx.lang : b.text?.it ? "it" : "en", content: ref?.contentId, revision: ref?.revisionId }))}</p>`;
  const sec = (id, name, blocks) =>
    blocks.length ? `<h4>${name}</h4>${blocks.map((b, i) => block(b, id, i)).join("")}` : "";
  const mod = (score) => signed(D.modOf(score));
  return `<article class="hbe-statblock" data-hbe-statblock="${mode}"><h3>${lbl(ctx, name)}</h3><p class="muted">${lbl(ctx, srdLabel("size", c.size))} · ${lbl(ctx, srdLabel("creatureType", c.type))}${ctx.label(c.alignment) ? ", " + lbl(ctx, c.alignment) : ""}</p><dl class="hbe-sb-stats"><dt>${t("CA", "AC")}</dt><dd>${c.ac}</dd><dt>${t("PF", "HP")}</dt><dd>${c.hp.average}${c.hp.dice ? ` (${esc(ctx, c.hp.dice)})` : ""}</dd><dt>${t("Velocità", "Speed")}</dt><dd>${esc(ctx, String(c.speedMeters).replace(".", ctx.lang === "it" ? "," : "."))} m</dd><dt>${t("GS", "CR")}</dt><dd>${esc(ctx, c.cr)}</dd></dl><table class="hbe-sb-abilities"><thead><tr>${D.ABILITIES.map((a) => `<th scope="col">${lbl(ctx, D.ABILITY_SHORT[a])}</th>`).join("")}</tr></thead><tbody><tr>${D.ABILITIES.map((a) => `<td>${c.abilities[a]} (${mod(c.abilities[a])})</td>`).join("")}</tr></tbody></table>${ctx.label(c.senses) ? `<p><strong>${t("Sensi", "Senses")}</strong> ${lbl(ctx, c.senses)}</p>` : ""}${ctx.label(c.languages) ? `<p><strong>${t("Lingue", "Languages")}</strong> ${lbl(ctx, c.languages)}</p>` : ""}${SECTIONS.map(([id, n]) => sec(id, lbl(ctx, n), list(c.sections[id]))).join("")}${
    c.sections.legendary.enabled
      ? `<h4>${t("Azioni leggendarie", "Legendary actions")} (${c.sections.legendary.uses})</h4><p class="muted">${lbl(ctx, c.sections.legendary.intro)}</p>${list(
          c.sections.legendary.actions,
        )
          .map((b, i) => block(b, "legendary.actions", i))
          .join("")}`
      : ""
  }${
    c.sections.lair.enabled
      ? `<h4>${t("Azioni di tana", "Lair actions")}</h4><p class="muted">${lbl(ctx, c.sections.lair.intro)}</p>${list(
          c.sections.lair.actions,
        )
          .map((b, i) => block(b, "lair.actions", i))
          .join("")}`
      : ""
  }${ui.testRoll && mode === "test" ? `<p class="hbe-test-roll" role="status">${esc(ctx, ui.testRoll)}</p>` : ""}</article>`;
}
function structuredSummary(ctx, type, dataValue) {
  const t = ctx.t;
  const s = dataValue.structured ?? {};
  const out = [];
  const prereq = D.describePrerequisites(s);
  if (prereq.length)
    out.push(
      `<h4>${t("Prerequisiti", "Prerequisites")}</h4><ul>${prereq.map((p) => `<li>${lbl(ctx, p)}</li>`).join("")}</ul>`,
    );
  if (list(s.options).length)
    out.push(
      `<h4>${t("Opzioni", "Options")}</h4><ul>${s.options.map((o) => `<li>${lbl(ctx, o.name)}: ${t("scegli", "choose")} ${o.choose} ${t("tra", "of")} ${o.from.map((c) => lbl(ctx, c.name)).join(" / ")}</li>`).join("")}</ul>`,
    );
  if (list(s.modifiers).length)
    out.push(
      `<h4>${t("Modificatori", "Modifiers")}</h4><ul>${s.modifiers.map((m) => `<li>${modText(ctx, m)}</li>`).join("")}</ul>`,
    );
  if (list(s.activities).length)
    out.push(
      `<h4>${t("Attività", "Activities")}</h4><ul>${s.activities.map((a) => `<li>${activityText(ctx, a)}</li>`).join("")}</ul>`,
    );
  if (list(s.advancement).length)
    out.push(
      `<h4>${t("Avanzamento", "Advancement")}</h4><table class="hbe-adv-table"><thead><tr><th scope="col">${t("Livello", "Level")}</th><th scope="col">${t("Ottiene", "Gains")}</th></tr></thead><tbody>${[
        ...s.advancement,
      ]
        .sort((a, b) => a.level - b.level)
        .map((a) => `<tr><td>${a.level}</td><td>${advText(ctx, a)}</td></tr>`)
        .join("")}</tbody></table>`,
    );
  if (s.subclass?.classId)
    out.push(
      `<p>${t("Sottoclasse di", "Subclass of")} ${lbl(ctx, D.className(s.subclass.classId))}</p>`,
    );
  if (s.item?.weapon)
    out.push(
      `<p>${t("Danni", "Damage")} ${esc(ctx, s.item.weapon.damage.dice)} ${lbl(ctx, D.damageName(s.item.weapon.damage.type)).toLocaleLowerCase()}${s.item.weapon.versatile ? ` (${esc(ctx, s.item.weapon.versatile)} ${t("a due mani", "two-handed")})` : ""} · ${t("per colpire", "to hit")} ${signed(s.item.weapon.attackBonus)} · ${t("danni", "damage")} ${signed(s.item.weapon.damageBonus)} · ${lbl(ctx, D.labelFor("rarity", s.item.rarity))}</p>`,
    );
  if (s.item?.armor)
    out.push(
      `<p>${t("CA", "AC")} ${esc(ctx, s.item.armor.ac ?? "—")} ${signed(s.item.armor.acBonus ?? 0)} · ${lbl(ctx, D.labelFor("rarity", s.item.rarity))}</p>`,
    );
  return out.join("");
}
const modeName = (ctx, id) => lbl(ctx, D.MODIFIER_MODES.find((m) => m.id === id)?.name ?? id);
function modText(ctx, m) {
  const target = D.MODIFIER_TARGETS.find((x) => x.id === m.target);
  const cond = ctx.label(m.condition);
  const scale =
    m.scale && m.scale !== "fixed"
      ? ` ${lbl(ctx, D.MODIFIER_SCALES.find((x) => x.id === m.scale)?.name)}`
      : "";
  const value = D.ROLL_MODES.includes(m.mode)
    ? ""
    : ` ${m.mode === "add" ? signed(m.value) : esc(ctx, m.value)}${scale}`;
  return `${lbl(ctx, target?.name ?? m.target)}: ${modeName(ctx, m.mode)}${value}${m.limit ? ` (${ctx.t("max", "max")} ${m.limit})` : ""}${D.isTimed(m) ? ` · ${lbl(ctx, D.durationText(m)).toLocaleLowerCase()}` : ""}${cond ? ` · ${esc(ctx, cond)} (${ctx.t("manuale", "manual")})` : !target?.automated && !D.ROLL_MODES.includes(m.mode) ? ` (${ctx.t("manuale", "manual")})` : ""}`;
}
function activityText(ctx, a, dcValue = null) {
  const t = ctx.t;
  const type = D.ACTIVITY_TYPES.find((x) => x.id === a.type);
  const act = D.ACTIVATIONS.find((x) => x.id === a.activation?.type);
  const parts = [
    `<strong>${lbl(ctx, a.name)}</strong> (${lbl(ctx, type?.name)}, ${lbl(ctx, act?.name)}, ${a.activation?.rangeMeters ?? 0} m)`,
  ];
  if (a.type === "save") {
    parts.push(
      `${t("TS", "save")} ${lbl(ctx, D.abilityName(a.save.ability))} ${a.save.dc.mode === "fixed" ? `${t("CD", "DC")} ${a.save.dc.value}` : dcValue != null ? `${t("CD", "DC")} ${dcValue} (8 + ${t("competenza", "proficiency")} + ${lbl(ctx, D.ABILITY_SHORT[a.save.dc.ability])})` : `${t("CD 8 + competenza +", "DC 8 + proficiency +")} ${lbl(ctx, D.ABILITY_SHORT[a.save.dc.ability])}`}`,
    );
    if (a.effect?.conditionId)
      parts.push(
        `${t("se fallisce", "on a failure")}: ${lbl(ctx, D.conditionName(a.effect.conditionId))}, ${lbl(ctx, D.anchorName(a.effect.duration)).toLocaleLowerCase()}`,
      );
    if (a.damage?.dice)
      parts.push(
        `${esc(ctx, a.damage.dice)} ${lbl(ctx, D.damageName(a.damage.type)).toLocaleLowerCase()}`,
      );
  }
  if (a.type === "attack")
    parts.push(
      `${signed(a.attack.bonus)} ${t("per colpire", "to hit")}${a.damage?.dice ? `, ${esc(ctx, a.damage.dice)} ${lbl(ctx, D.damageName(a.damage.type)).toLocaleLowerCase()}` : ""}`,
    );
  if (a.type === "damage")
    parts.push(
      `${esc(ctx, a.damage.dice)} ${lbl(ctx, D.damageName(a.damage.type)).toLocaleLowerCase()}`,
    );
  if (a.type === "heal") parts.push(`${esc(ctx, a.heal.dice)} ${t("PF", "HP")}`);
  return parts.join(" · ");
}
function advText(ctx, a) {
  if (a.type === "grant")
    return list(a.features)
      .map((f) => lbl(ctx, f.name))
      .join(", ");
  if (a.type === "scale")
    return `${lbl(ctx, a.scale.name)}: ${Object.entries(a.scale.values)
      .map(([k, v]) => `${k}→${esc(ctx, v)}`)
      .join(", ")}`;
  if (a.type === "asi")
    return ctx.t(
      `Aumento di ${a.asi.points} punti (max ${a.asi.limit})`,
      `Increase of ${a.asi.points} points (max ${a.asi.limit})`,
    );
  return `${lbl(ctx, a.choice.name)}: ${list(a.choice.from)
    .map((f) => lbl(ctx, f.name))
    .join(" / ")}`;
}
function automationPanel(ctx, automation) {
  const t = ctx.t;
  return `<section class="hbe-automation" aria-label="${t("Livello di automazione", "Automation level")}"><h3>${t("Cosa fa l’app", "What the app does")} ${badge(ctx, automation.level)}</h3>${automation.automated.length ? `<ul>${automation.automated.map((x) => `<li>${lbl(ctx, x)}</li>`).join("")}</ul>` : ""}${automation.manual.length ? `<p><strong>${t("Da gestire a mano", "Handled by hand")}</strong></p><ul>${automation.manual.map((x) => `<li>${lbl(ctx, x)}</li>`).join("")}</ul>` : ""}</section>`;
}
function modifiedPanel(ctx, dataValue, editable) {
  const t = ctx.t;
  const fields = D.modifiedFields(dataValue);
  const origin = dataValue.structured?.origin;
  if (!origin || origin.kind === "scratch") return "";
  return `<section class="hbe-origin"><h3>${t("Fonte della copia", "Copy source")}</h3><p class="muted">${origin.kind === "forge" ? t("Forgiato da oggetto di base e modello.", "Forged from base item and template.") : t("Copia modificabile di un modello SRD.", "Editable copy of an SRD template.")}</p>${fields.length ? `<p><span class="badge">${t("Modificato", "Modified")}</span></p><ul class="hbe-modified">${fields.map((f) => `<li><span>${lbl(ctx, D.FIELD_NAMES[f] ?? L(f, f))}</span>${editable ? btn(ctx, "revert-field", t("Ripristina", "Revert"), `${data({ path: f })} aria-label="${t("Ripristina", "Revert")}: ${lbl(ctx, D.FIELD_NAMES[f] ?? L(f, f))}"`) : ""}</li>`).join("")}</ul>${editable ? btn(ctx, "revert-all", t("Ripristina alla fonte", "Revert to source"), "", "danger") : ""}` : `<p>${t("Identico alla fonte.", "Identical to the source.")}</p>`}</section>`;
}
function renderPreview(ctx, type, dataValue) {
  const t = ctx.t;
  const s = dataValue.structured ?? {};
  return `<section class="hbe-preview"><h2>${t("Anteprima", "Preview")}</h2><article class="library-readable">${type === "creature" ? "" : `<h3>${lbl(ctx, dataValue.name) || t("Contenuto senza nome", "Unnamed content")}</h3><p class="muted">${esc(ctx, typeName(ctx, type))}</p>`}${type === "creature" ? statblockHtml(ctx, dataValue.name, s.creature, { mode: "test" }) : ""}<p class="library-prose">${lbl(ctx, dataValue.description)}</p>${type === "creature" ? "" : structuredSummary(ctx, type, dataValue)}</article>${automationPanel(ctx, D.automationOf(type, s))}${modifiedPanel(ctx, dataValue, true)}</section>`;
}
function testSheetValues(ctx) {
  if (!ui.test) {
    const sample = ctx.state.actors.livia ?? Object.values(ctx.state.actors)[0];
    ui.test = {
      ...D.sheetOf(sample),
      name: ctx.t("Scheda di prova", "Test sheet"),
      from: sample?.id ?? "",
    };
  }
  return ui.test;
}
function renderTest(ctx, type, dataValue) {
  const t = ctx.t;
  if (type === "creature") return "";
  const s = dataValue.structured ?? {};
  const sheet = testSheetValues(ctx);
  const result = D.testOnSheet(type, s, sheet, ui.testChoices, dataValue.name);
  const actors = Object.values(ctx.state.actors).filter(
    (a) => a.kind === "character" && canViewActor(a, ctx.role, ctx.state),
  );
  const tick = (ok) =>
    ok === null
      ? `<span class="hbe-manual">${t("manuale", "manual")}</span>`
      : ok
        ? `<span class="hbe-ok">✓</span>`
        : `<span class="hbe-no">✗</span>`;
  return `<section class="hbe-test" aria-labelledby="hbe-test-title"><h2 id="hbe-test-title">${t("Prova su una scheda di prova", "Try on a test sheet")}</h2><p class="muted">${t("Valori fittizi: nessun tiro, registro o modifica alla partita.", "Fictitious values: no roll, log or change to the game.")}</p><div class="hbe-test-grid"><label class="field">${t("Parti dai valori di", "Start from the values of")}<select data-hbe-test-from>${actors.map((a) => `<option value="${esc(ctx, a.id)}" ${sheet.from === a.id ? "selected" : ""}>${esc(ctx, a.name)}</option>`).join("")}</select></label><label class="field">${t("Livello", "Level")}<input type="number" min="1" max="20" data-hbe-test="level" value="${sheet.level}"></label><label class="field">${t("Classe", "Class")}<select data-hbe-test="classId">${D.CLASS_OPTIONS.map((c) => `<option value="${c.id}" ${sheet.classIds[0] === c.id ? "selected" : ""}>${lbl(ctx, c.name)}</option>`).join("")}</select></label><label class="field">${t("CA", "AC")}<input type="number" min="0" max="40" data-hbe-test="ac" value="${sheet.ac}"></label>${D.ABILITIES.map((a) => `<label class="field">${lbl(ctx, D.ABILITY_SHORT[a])}<input type="number" min="1" max="30" data-hbe-test="${a}" value="${sheet.abilities[a] ?? 10}"></label>`).join("")}</div>${list(
    s.options,
  )
    .map(
      (o) =>
        `<fieldset class="hbe-choice"><legend>${lbl(ctx, o.name)} · ${t("scegli", "choose")} ${o.choose}</legend>${o.from.map((c) => `<label class="hbe-check"><input type="${o.choose === 1 ? "radio" : "checkbox"}" name="test-${esc(ctx, o.id)}" data-hbe-test-choice="${esc(ctx, o.id)}" value="${esc(ctx, c.id)}" ${list(ui.testChoices[o.id]).includes(c.id) ? "checked" : ""}> ${lbl(ctx, c.name)}</label>`).join("")}</fieldset>`,
    )
    .join(
      "",
    )}<div class="hbe-test-result" data-hbe-test-result>${result.prerequisites.groups.length ? `<h3>${t("Prerequisiti", "Prerequisites")} ${tick(result.prerequisites.groups.some((g) => g.ok !== null) ? result.prerequisites.ok : null)}</h3><ul>${result.prerequisites.groups.map((g) => `<li>${g.rules.map((r) => `${lbl(ctx, r.label)} ${tick(r.manual ? null : r.ok)}`).join(g.mode === "any" ? ` <em>${t("o", "or")}</em> ` : ` <em>${t("e", "and")}</em> `)}</li>`).join("")}</ul>` : ""}${result.classOk !== null ? `<p>${t("Classe richiesta", "Required class")}: ${lbl(ctx, D.className(s.subclass.classId))} ${tick(result.classOk)}</p>` : ""}${result.choiceErrors.length ? `<p class="hbe-no">${esc(ctx, ctx.t(result.choiceErrors[0].it, result.choiceErrors[0].en))}</p>` : ""}${result.values.length ? `<h3>${t("Valori calcolati", "Computed values")}</h3>${result.values.map((v) => stackHtml(ctx, v)).join("")}` : ""}${result.manual.length ? `<p class="muted">${t("Manuali", "Manual")}: ${result.manual.map((m) => modText(ctx, m)).join("; ")}</p>` : ""}${result.activities.length ? `<h3>${t("Attività", "Activities")}</h3><ul>${result.activities.map((a) => `<li>${lbl(ctx, a.name)}${a.dc ? ` · ${lbl(ctx, a.dc.formula)}` : ""}${a.effect ? ` · ${lbl(ctx, a.effect.condition)}: ${lbl(ctx, a.effect.duration).toLocaleLowerCase()}` : ""}</li>`).join("")}</ul>` : ""}${result.advancement.length ? `<h3>${t("A questo livello", "At this level")}</h3><ul>${result.advancement.map((a) => `<li>${t("Livello", "Level")} ${a.level}: ${a.names.map((n) => lbl(ctx, n)).join(", ")}</li>`).join("")}</ul>` : ""}<p class="hbe-verdict" data-hbe-test-verdict="${result.eligible ? "yes" : "no"}">${result.eligible ? t("La scheda di prova può prendere questa voce.", "The test sheet can take this entry.") : t("La scheda di prova non può prenderla così.", "The test sheet cannot take it like this.")}</p></div></section>`;
}
function stackHtml(ctx, v) {
  const target = D.MODIFIER_TARGETS.find((x) => x.id === v.target);
  const steps = v.steps.slice(1);
  return `<p class="hbe-stack" data-hbe-stack="${v.target}"><strong>${lbl(ctx, target?.name ?? v.target)}</strong>: ${ctx.t("base", "base")} ${v.steps[0].value}${steps
    .map(
      (step, i) =>
        ` → ${modeName(ctx, step.mode)} ${step.entries.map((e) => `${step.mode === "add" ? signed(e.value) : step.mode === "multiply" ? "×" + e.value : e.value}${e.limit ? ` (max ${e.limit})` : ""} <span class="muted">(${lbl(ctx, e.source)})</span>`).join(", ")}${i < steps.length - 1 ? ` → ${step.value}` : ""}`,
    )
    .join("")} = <strong>${v.value}</strong></p>`;
}

// ---------------------------------------------------------------- content detail

function renderDetail(ctx, ref) {
  const t = ctx.t;
  const rev = readable(ctx, ref);
  if (!rev) return unavailable(ctx);
  const s = rev.data.structured ?? {};
  const summary = hb.listHomebrew(ctx.state, ctx.role).find((e) => e.id === ref.contentId);
  const p = rev.permissions ?? {};
  const enabled = (ctx.state.campaign.enabledContent ?? []).some(
    (r) => r.contentId === ref.contentId && r.revisionId === ref.revisionId,
  );
  const other = ctx.role === "dm" ? "player" : "dm";
  const sharedWith =
    rev.access && (rev.access.readers.includes(other) || rev.access.editors.includes(other));
  const targetKind = hb.getHomebrewTypes().find((x) => x.id === rev.type)?.targetKind;
  const automation = s.automation ?? D.automationOf(rev.type, s);
  const sheetTypes = !!targetKind && rev.type !== "creature";
  const steps = `<ol class="hbe-steps"><li class="${rev.owner === ctx.role ? "done" : ""}">${t("Salvato come revisione", "Saved as a revision")}</li><li class="${sharedWith || rev.owner !== ctx.role ? "done" : ""}">${rev.owner === ctx.role ? (ctx.role === "player" ? t("Condiviso con il DM", "Shared with the DM") : t("Condiviso con i giocatori", "Shared with the players")) : t("Condiviso con te", "Shared with you")}</li><li class="${enabled ? "done" : ""}">${t("Abilitato in campagna dal DM", "Enabled in the campaign by the DM")}</li></ol>`;
  return `<section class="hbe-page" data-hbe-detail="${esc(ctx, ref.contentId)}">${crumbs(ctx, lbl(ctx, rev.data.name))}
  <header class="page-heading hbe-heading"><div><p class="muted">${esc(ctx, typeName(ctx, rev.type))} · ${t("Revisione salvata e immutabile", "Saved, immutable revision")}</p><h1>${lbl(ctx, rev.data.name)}</h1><p>${summary ? statusBadges(ctx, { ...summary, data: rev.data }) : ""}</p></div><div class="toolbar"><label class="field">${t("Revisione", "Revision")}<select data-hbe-revision>${(summary?.revisions ?? []).map((r, i) => `<option value="${esc(ctx, r.id)}" ${r.id === ref.revisionId ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>${p.canRevise ? btn(ctx, "revise", t("Nuova versione", "New version"), "", "primary") : ""}${p.canDuplicate ? btn(ctx, "duplicate", t("Copia indipendente", "Independent copy")) : ""}${btn(ctx, "open-library", t("Apri nella Biblioteca", "Open in the Library"))}</div></header>
  <div class="hbe-detail-layout"><div class="hbe-detail-main"><article class="library-readable"><p class="library-prose">${lbl(ctx, rev.data.description)}</p><p class="library-provenance">${[
    rev.data.source?.label,
    rev.data.source?.reference,
  ]
    .filter(Boolean)
    .map((x) => esc(ctx, x))
    .join(
      " · ",
    )}</p>${rev.type === "creature" ? statblockHtml(ctx, rev.data.name, s.creature, { mode: "live", ref }) : structuredSummary(ctx, rev.type, rev.data)}</article>${modifiedPanel(ctx, rev.data, false)}${D.modifiedFields(rev.data).length && p.canRevise ? btn(ctx, "revert-source", t("Ripristina alla fonte…", "Revert to source…"), "", "danger") : ""}${historyHtml(ctx, ref, summary)}</div>
  <aside class="hbe-detail-side"><section><h2>${t("Usa questa revisione", "Use this revision")}</h2>${steps}${rev.owner === ctx.role && p.canShare ? btn(ctx, "share", sharedWith ? t("Revoca la condivisione", "Revoke sharing") : ctx.role === "player" ? t("Condividi in lettura con il DM", "Share read access with the DM") : t("Condividi in lettura con i giocatori", "Share read access with the players"), data({ shared: sharedWith ? "false" : "true" })) : ""}${p.canEnable ? btn(ctx, "enable", enabled ? t("Disabilita in campagna", "Disable in the campaign") : t("Abilita in campagna", "Enable in the campaign"), data({ enabled: enabled ? "false" : "true" }), enabled ? "quiet" : "") : ""}${sheetTypes ? btn(ctx, "apply-sheet", t("Applica a una scheda…", "Apply to a sheet…"), "", "primary") : ""}${rev.type === "creature" && ctx.role === "dm" ? btn(ctx, "place", t("Aggiungi alla scena attiva…", "Add to the active scene…"), "", "primary") : ""}${rev.type === "subclass" ? `<p class="muted">${t("La sottoclasse si sceglie dalla scheda del personaggio della sua classe: Capacità → Homebrew.", "The subclass is chosen from a character sheet of its class: Features → Homebrew.")}</p>` : ""}</section>
  ${automationPanel(ctx, automation)}
  ${renderPublication(ctx, rev, ref)}</aside></div></section>`;
}
// BI-13 (DDB errata recorded per entry): each revision with what it changed.
function historyHtml(ctx, ref, summary) {
  const t = ctx.t;
  const revisions = (summary?.revisions ?? []).map((r, i) => ({
    number: i + 1,
    id: r.id,
    createdAt: r.createdAt,
    data: readable(ctx, { contentId: ref.contentId, revisionId: r.id })?.data,
  }));
  if (!revisions.length) return "";
  const when = (value) => {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime())
      ? t("data non disponibile", "date unavailable")
      : new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  };
  return `<section class="hbe-history" aria-labelledby="hbe-history-title"><h2 id="hbe-history-title">${t("Cosa è cambiato", "What changed")}</h2><ol class="hbe-history-list" reversed>${revisions
    .slice()
    .reverse()
    .map((r) => {
      const prev = revisions[r.number - 2];
      const fields = prev ? D.changedFields(prev.data, r.data) : [];
      return `<li data-hbe-history="${r.number}" ${r.id === ref.revisionId ? 'aria-current="true"' : ""}><strong>${t("rev.", "rev.")} ${r.number}</strong> · ${esc(ctx, when(r.createdAt))} · ${prev ? (fields.length ? `${t("cambiati", "changed")}: ${fields.map((f) => lbl(ctx, D.FIELD_NAMES[f] ?? L(f, f))).join(", ")}` : t("nessun campo cambiato", "no field changed")) : t("prima revisione", "first revision")}${r.id === ref.revisionId ? ` <span class="badge">${t("questa", "this one")}</span>` : ""}</li>`;
    })
    .join("")}</ol></section>`;
}
function renderPublication(ctx, rev, ref) {
  const t = ctx.t;
  const pub = D.publicationOf(slice(ctx.state), ref.contentId);
  const versions = list(pub?.versions);
  const mine = rev.owner === ctx.role;
  const thisVersion = versions.find((v) => v.revisionId === ref.revisionId);
  return `<section class="hbe-publication" aria-labelledby="hbe-pub-title"><h2 id="hbe-pub-title">${t("Pubblicazione", "Publishing")}</h2><p class="muted">${t("Simulazione: nessun catalogo reale. Una versione pubblicata non si modifica né si elimina; «Nuova versione» ne prepara un’altra e chi la segue sceglie se passarci.", "Simulation: no real catalogue. A published version cannot be edited or deleted; “New version” prepares another and followers choose whether to move to it.")}</p>${versions.length ? `<ol class="hbe-versions">${versions.map((v) => `<li data-hbe-version="${v.status}">${v.status === "published" || v.status === "withdrawn" ? `v${v.number}` : ""} ${esc(ctx, statusName(ctx, v.status))}${v.reason ? ` · ${esc(ctx, v.reason)}` : ""} · ${lbl(ctx, D.AI_METHODS.find((m) => m.id === v.aiMethod)?.name)}</li>`).join("")}</ol>` : ""}${mine && !thisVersion && !versions.some((v) => v.status === "queued") ? btn(ctx, "publish", t("Pubblica questa revisione…", "Publish this revision…")) : ""}${thisVersion?.status === "published" ? `<p>${t("Questa revisione è pubblicata e bloccata.", "This revision is published and locked.")}</p>` : ""}${versions.some((v) => v.status === "published") ? btn(ctx, "catalog-page", t("Vedi nel catalogo", "See it in the catalogue")) : ""}</section>`;
}
const statusName = (ctx, status) =>
  ({
    queued: ctx.t("In moderazione", "In moderation"),
    published: ctx.t("Pubblicata", "Published"),
    rejected: ctx.t("Respinta", "Rejected"),
    withdrawn: ctx.t("Ritirata dopo segnalazione", "Withdrawn after a report"),
  })[status] ?? status;
function unavailable(ctx) {
  return `<section class="hbe-page">${crumbs(ctx, "")}<h1>${ctx.t("Contenuto non disponibile", "Content unavailable")}</h1><p>${ctx.t("La revisione o la bozza non è accessibile con questa identità.", "This revision or draft is unavailable to this identity.")}</p></section>`;
}

// ---------------------------------------------------------------- forge, import, catalogue pages

function renderForge(ctx) {
  const t = ctx.t;
  const bases = D.forgeBases();
  const templates = D.forgeTemplatesFor(ui.forge.baseId);
  if (!templates.some((x) => x.id === ui.forge.templateId))
    ui.forge.templateId = templates[0]?.id ?? "";
  let preview = "";
  try {
    const forged = D.forgeItem(ui.forge.baseId, [ui.forge.templateId], ctx.lang);
    preview = `<article class="library-readable" data-hbe-forge-preview><h3>${lbl(ctx, forged.data.name)}</h3><p class="library-prose">${lbl(ctx, forged.data.description)}</p>${structuredSummary(ctx, forged.type, forged.data)}<p class="library-provenance">${esc(ctx, forged.data.source.reference)}</p></article>`;
  } catch (error) {
    preview = `<p class="error">${esc(ctx, msg(ctx, error))}</p>`;
  }
  return `<section class="hbe-page">${crumbs(ctx, t("Forgia", "Forge"))}<header class="page-heading"><div><h1>${t("Forgia un oggetto magico", "Forge a magic item")}</h1><p>${t("Oggetto di base + modello magico = nuovo oggetto modificabile, che ricorda la fonte e si può ripristinare.", "Base item + magic template = a new editable item that remembers its source and can be reverted.")}</p></div></header><div class="hbe-forge"><form data-hbe-form="forge"><label class="field">${t("Oggetto di base (SRD 5.2.1)", "Base item (SRD 5.2.1)")}<select name="baseId" data-hbe-forge="baseId">${bases.map((b) => `<option value="${esc(ctx, b.id)}" ${b.id === ui.forge.baseId ? "selected" : ""}>${lbl(ctx, b.name)}</option>`).join("")}</select></label><fieldset class="hbe-choice"><legend>${t("Modello compatibile", "Compatible template")}</legend>${templates.map((x) => `<label class="hbe-check"><input type="radio" name="templateId" data-hbe-forge="templateId" value="${x.id}" ${x.id === ui.forge.templateId ? "checked" : ""}> ${lbl(ctx, x.name)} · ${lbl(ctx, D.labelFor("rarity", x.rarity))} · SRD EN p.${x.source.en.pages.join("–")} / IT p.${x.source.it.pages.join("–")}</label>`).join("")}</fieldset>${btn(ctx, "forge", t("Crea la bozza forgiata", "Create the forged draft"), "", "primary")}</form><aside>${preview}</aside></div></section>`;
}
function renderImport(ctx) {
  const t = ctx.t;
  const checked = ui.importChecked;
  const valid = checked?.filter((r) => !r.errors.length) ?? [];
  return `<section class="hbe-page">${crumbs(ctx, t("Importa mostri", "Import monsters"))}<header class="page-heading"><div><h1>${t("Importa mostri da CSV o JSON", "Import monsters from CSV or JSON")}</h1><p>${t("Una riga per mostro. Le righe valide diventano mostri privati della tua Biblioteca; quelle con errori restano qui con il motivo.", "One row per monster. Valid rows become private monsters in your Library; rows with errors stay here with the reason.")}</p></div></header><form class="hbe-import" data-hbe-form="import"><p class="muted">${t("Colonne", "Columns")}: <code>${D.CSV_COLUMNS.join(", ")}</code>. ${t("Più voci in «traits» o «actions» si separano con |; «Nome: testo».", "Several entries in “traits” or “actions” are separated by |; “Name: text”.")}</p><div class="toolbar">${btn(ctx, "import-example", t("Inserisci l’esempio", "Insert the example"))}${btn(ctx, "import-download", t("Scarica l’esempio CSV", "Download the example CSV"))}<label class="field">${t("Oppure scegli un file", "Or choose a file")}<input type="file" accept=".csv,.json,text/csv,application/json" data-hbe-import-file></label></div><label class="field">${t("CSV o JSON", "CSV or JSON")}<textarea rows="8" name="text" data-hbe-import-text spellcheck="false">${esc(ctx, ui.importText)}</textarea></label>${btn(ctx, "import-check", t("Controlla le righe", "Check the rows"), "", "primary")}</form>${
    checked
      ? `<section class="hbe-import-result" aria-live="polite"><h2>${t("Risultato del controllo", "Check result")}</h2><div class="table-wrap"><table class="hbe-import-table"><thead><tr><th scope="col">${t("Riga", "Row")}</th><th scope="col">${t("Nome", "Name")}</th><th scope="col">${t("Esito", "Outcome")}</th></tr></thead><tbody>${checked.map((r) => `<tr data-hbe-import-row="${r.line}" class="${r.errors.length ? "hbe-row-error" : ""}"><td>${r.line}</td><td>${esc(ctx, r.name || "—")}</td><td>${r.errors.length ? `<ul>${r.errors.map((e) => `<li><code>${esc(ctx, e.column)}</code> ${esc(ctx, ctx.t(e.it, e.en))}</li>`).join("")}</ul>` : `<span class="hbe-ok">✓</span> ${t("pronta", "ready")}`}</td></tr>`).join("")}</tbody></table></div>${valid.length ? btn(ctx, "import-apply", t(`Importa ${valid.length} mostri validi`, `Import ${valid.length} valid monsters`), "", "primary") : `<p>${t("Nessuna riga valida.", "No valid row.")}</p>`}</section>`
      : ""
  }</section>`;
}
function renderCatalog(ctx) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const entries = D.catalogEntries(ctx.state, s, ctx.role);
  const queue = Object.entries(s.publications ?? {}).flatMap(([contentId, pub]) =>
    pub.versions.filter((v) => v.status === "queued").map((v) => ({ contentId, v, pub })),
  );
  const reports = Object.entries(s.publications ?? {}).flatMap(([contentId, pub]) =>
    list(pub.reports)
      .filter((r) => r.status === "open")
      .map((r) => ({ contentId, r })),
  );
  const nameFor = (contentId, revisionId) => {
    const content = (ctx.state.library ?? []).find((c) => c.id === contentId);
    const r = content?.revisions.find((x) => x.id === revisionId) ?? content?.revisions.at(-1);
    return r ? lbl(ctx, r.data.name) : esc(ctx, contentId);
  };
  return `<section class="hbe-page">${crumbs(ctx, t("Catalogo pubblico", "Public catalogue"))}<header class="page-heading"><div><h1>${t("Catalogo pubblico (simulato)", "Public catalogue (simulated)")}</h1><p>${t("Contenuti pubblicati dalle due identità di questa dimostrazione. Segui una versione; alla successiva scegli tu se passarci.", "Content published by this demonstration’s two identities. Follow a version; when a new one arrives you choose whether to move.")}</p></div></header>${
    entries.length
      ? entries
          .map((e) => {
            const own = e.owner === ctx.role;
            const stars = [1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="hbe-star ${e.myRating >= n ? "on" : ""}" data-hbe="rate" ${data({ content: e.contentId, stars: n })} aria-label="${t(`${n} stelle`, `${n} stars`)}" aria-pressed="${e.myRating === n}">★</button>`,
              )
              .join("");
            return `<article class="library-row hbe-catalog-row" data-hbe-catalog="${esc(ctx, e.contentId)}"><div><h3>${lbl(ctx, e.name)} <span class="badge">v${e.latest.number}</span></h3><p>${esc(ctx, typeName(ctx, e.type))} · ${t("autore", "author")}: ${e.owner === "dm" ? "DM" : t("Giocatore", "Player")} · ${badge(ctx, e.automation.level)} · ${lbl(ctx, D.AI_METHODS.find((m) => m.id === e.latest.aiMethod)?.name)} · ${e.rating ? `★ ${e.rating} (${e.ratings})` : t("nessuna valutazione", "no ratings")}</p>${e.updateAvailable ? `<p class="hbe-notice" role="status">${t(`Segui la v${e.followed.number}: è uscita la v${e.latest.number}. Le copie sulle schede restano sulla loro versione.`, `You follow v${e.followed.number}: v${e.latest.number} is out. Sheet copies stay on their version.`)}</p>` : ""}</div><div class="toolbar">${own ? `<span class="muted">${t("Tuo contenuto", "Your content")}</span>` : e.followed ? (e.updateAvailable ? btn(ctx, "follow", t(`Passa alla v${e.latest.number}`, `Move to v${e.latest.number}`), data({ content: e.contentId, revision: e.latest.revisionId }), "primary") + btn(ctx, "stay", t(`Resta sulla v${e.followed.number}`, `Stay on v${e.followed.number}`), data({ content: e.contentId })) : `<span class="badge">${t("Segui", "Following")} v${e.followed.number}</span>`) : btn(ctx, "follow", t(`Segui e aggiungi alla raccolta (v${e.latest.number})`, `Follow and add to collection (v${e.latest.number})`), data({ content: e.contentId, revision: e.latest.revisionId }), "primary")}${own ? "" : `<span class="hbe-stars" role="group" aria-label="${t("Valuta", "Rate")}">${stars}</span>${btn(ctx, "report", t("Segnala", "Report"), data({ content: e.contentId }))}`}${btn(ctx, "open", t("Apri", "Open"), data({ content: e.contentId, revision: (own ? e.latest : (e.followed ?? e.latest)).revisionId }))}</div></article>`;
          })
          .join("")
      : `<p class="empty-state">${t("Nessun contenuto pubblicato. Pubblica una revisione dal suo dettaglio.", "No published content. Publish a revision from its detail.")}</p>`
  }<section class="hbe-moderation" aria-labelledby="hbe-mod-title"><h2 id="hbe-mod-title">${t("Moderazione (simulazione)", "Moderation (simulation)")}</h2><p class="muted">${t("Nel servizio reale decide la moderazione della piattaforma. Qui scegli l’esito per provare il percorso.", "In the real service the platform’s moderators decide. Here you pick the outcome to try the flow.")}</p>${queue.length ? queue.map(({ contentId, v }) => `<article class="library-row" data-hbe-queue="${esc(ctx, contentId)}"><div><h3>${nameFor(contentId, v.revisionId)}</h3><p>${t("Inviata", "Submitted")} · ${lbl(ctx, D.AI_METHODS.find((m) => m.id === v.aiMethod)?.name)}</p></div><div class="toolbar">${btn(ctx, "moderate", t("Approva (simulazione)", "Approve (simulation)"), data({ content: contentId, decision: "approve" }), "primary")}${btn(ctx, "moderate", t("Respingi con motivo…", "Reject with a reason…"), data({ content: contentId, decision: "reject" }))}</div></article>`).join("") : `<p>${t("Nessuna versione in attesa.", "No version waiting.")}</p>`}${reports.length ? `<h3>${t("Segnalazioni aperte", "Open reports")}</h3>${reports.map(({ contentId, r }) => `<article class="library-row"><div><p>${nameFor(contentId)}: ${esc(ctx, r.reason)}</p></div><div class="toolbar">${btn(ctx, "resolve-report", t("Accogli: torna privato", "Uphold: back to private"), data({ content: contentId, report: r.id, upheld: "true" }))}${btn(ctx, "resolve-report", t("Respingi la segnalazione", "Dismiss the report"), data({ content: contentId, report: r.id, upheld: "false" }))}</div></article>`).join("")}` : ""}</section></section>`;
}

// ---------------------------------------------------------------- route

export function renderRoute(ctx) {
  const tab = ctx.view.tab;
  if (tab === "forge") return renderForge(ctx);
  if (tab === "import") return renderImport(ctx);
  if (tab === "catalog") return renderCatalog(ctx);
  if (!ctx.view.id)
    return `<section class="hbe-page">${crumbs(ctx, "")}${renderHub(ctx)}</section>`;
  const draft = draftOf(ctx, ctx.view.id);
  if (draft) return renderEditor(ctx, draft);
  const summary = hb.listHomebrew(ctx.state, ctx.role).find((e) => e.id === ctx.view.id);
  if (!summary) return unavailable(ctx);
  const revisionId = summary.revisions.some((r) => r.id === ctx.view.revision)
    ? ctx.view.revision
    : summary.latestRef.revisionId;
  return renderDetail(ctx, { contentId: ctx.view.id, revisionId });
}

// ---------------------------------------------------------------- campaign section

export function renderCampaignSection(ctx) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const rec = D.campaignRecord(s, ctx.state.campaign.id);
  const dm = ctx.role === "dm";
  const ids = D.campaignContentIds(ctx.state, s);
  const rows = ids.map((contentId) => {
    const content = ctx.state.library.find((c) => c.id === contentId);
    const enabledRef = [
      ...(ctx.state.campaign.enabledContent ?? []),
      ...list(rec.savedEnabled),
    ].find((r) => r.contentId === contentId);
    // BI-28: the automation shown is the one of the revision actually on the sheets (the
    // newest in play), not of an older enabled revision; every sheet holding a copy is
    // listed, whichever path added it, with its revision (CA-72: the enabled revision too).
    const revNumber = (id) => content.revisions.findIndex((r) => r.id === id) + 1;
    const holders = D.sheetsHolding(ctx.state, contentId);
    const inPlay = [...new Set(holders.map((h) => h.revisionId))].sort(
      (a, b) => revNumber(a) - revNumber(b),
    );
    const revision =
      content.revisions.find((r) => r.id === inPlay.at(-1)) ??
      content.revisions.find((r) => r.id === enabledRef?.revisionId) ??
      content.revisions.at(-1);
    const automation = D.revisionAutomation(content.type, revision);
    const users = holders.map(
      (h) =>
        `${ctx.state.actors[h.actorId]?.name ?? h.name} (${t("rev.", "rev.")} ${revNumber(h.revisionId)})`,
    );
    const off = list(rec.disabledContent).includes(contentId);
    const enabledNumbers = (ctx.state.campaign.enabledContent ?? [])
      .filter((r) => r.contentId === contentId)
      .map((r) => revNumber(r.revisionId))
      .filter((n) => n > 0);
    return `<tr data-hbe-campaign-row="${esc(ctx, contentId)}"><th scope="row">${lbl(ctx, revision.data.name)}<br><span class="muted">${esc(ctx, typeName(ctx, content.type))}</span>${enabledNumbers.length ? `<br><span class="badge" data-hbe-enabled-rev>${t("Abilitata", "Enabled")}: ${t("rev.", "rev.")} ${enabledNumbers.join(", ")}</span>` : `<br><span class="muted">${t("Non abilitata per nuove scelte", "Not enabled for new choices")}</span>`}</th><td>${t("rev.", "rev.")} ${revNumber(revision.id)} · ${badge(ctx, automation.level)}<details><summary>${t("Dettaglio", "Details")}</summary><ul>${[...automation.automated.map((x) => `<li>✓ ${lbl(ctx, x)}</li>`), ...automation.manual.map((x) => `<li>✎ ${lbl(ctx, x)}</li>`)].join("")}</ul></details></td><td>${esc(ctx, users.join(", ") || "—")}</td><td>${rec.disabled ? t("Sospeso (modalità sicura)", "Suspended (safe mode)") : off ? `<span class="hbe-off">${t("Disattivato", "Disabled")}</span>` : t("Attivo", "Active")}${dm && !rec.disabled && !rec.culprit ? ` ${btn(ctx, "toggle-content", off ? t("Riattiva", "Re-enable") : t("Disattiva", "Disable"), data({ content: contentId, disabled: off ? "false" : "true" }))}` : ""}</td></tr>`;
  });
  const c = rec.culprit;
  const culprit = c
    ? `<section class="hbe-culprit" aria-live="polite"><h3>${t("Trova il colpevole", "Find the culprit")} · ${t("passo", "step")} ${c.step}</h3>${
        c.found
          ? `<p>${t("Colpevole trovato", "Culprit found")}: <strong>${lbl(ctx, ctx.state.library.find((x) => x.id === c.found)?.revisions.at(-1).data.name)}</strong>. ${t("Resta disattivato; le altre voci sono di nuovo attive.", "It stays disabled; the other entries are active again.")}</p><div class="toolbar">${btn(ctx, "culprit-end", t("Tienilo disattivato e chiudi", "Keep it disabled and close"), data({ keep: "true" }), "primary")}${btn(ctx, "culprit-end", t("Riattiva tutto e chiudi", "Re-enable everything and close"), data({ keep: "false" }))}</div>`
          : `<p>${t("Disattivate ora", "Disabled now")}: ${c.testing.map((id) => lbl(ctx, ctx.state.library.find((x) => x.id === id)?.revisions.at(-1).data.name)).join(", ")}. ${t("Controlla la scheda o il Tavolo: il problema c’è ancora?", "Check the sheet or the Table: is the problem still there?")}</p><div class="toolbar">${btn(ctx, "culprit-answer", t("Sì, c’è ancora", "Yes, still there"), data({ persists: "true" }), "primary")}${btn(ctx, "culprit-answer", t("No, è sparito", "No, it is gone"), data({ persists: "false" }))}${btn(ctx, "culprit-end", t("Annulla la ricerca", "Cancel the search"), data({ keep: "false" }))}</div>`
      }</section>`
    : "";
  return `<section class="panel hbe-campaign" aria-labelledby="hbe-campaign-title"><div class="section-heading"><h2 id="hbe-campaign-title">${t("Homebrew della campagna", "Campaign homebrew")}</h2></div><p class="muted">${t("Quanto è automatizzata ogni voce in gioco, e i comandi per isolare un problema: modalità sicura e ricerca del colpevole per metà.", "How automated each entry in play is, and the tools to isolate a problem: safe mode and a halving search for the culprit.")}</p>${rec.disabled ? `<p class="hbe-notice" role="status">${t("Modalità sicura: l’homebrew è disattivato per la campagna. Effetti e attività sono sospesi sulle schede; le revisioni non sono scelte disponibili.", "Safe mode: homebrew is disabled for the campaign. Effects and activities are suspended on sheets; revisions are not available choices.")}</p>` : ""}${dm ? `<div class="toolbar">${!rec.disabled ? btn(ctx, "add-campaign-content", `${ctx.icon("plus")} ${t("Aggiungi contenuto…", "Add content…")}`, "", "primary") : ""}${btn(ctx, "safe-mode", rec.disabled ? t("Riattiva l’homebrew", "Re-enable homebrew") : t("Disattiva tutto l’homebrew", "Disable all homebrew"), data({ disabled: rec.disabled ? "false" : "true" }), rec.disabled ? "primary" : "danger")}${!rec.disabled && !c ? btn(ctx, "culprit-start", t("Trova il colpevole…", "Find the culprit…")) : ""}</div>` : `<p class="muted">${t("Solo il DM cambia queste impostazioni.", "Only the DM changes these settings.")}</p>`}${culprit}${rows.length ? `<div class="table-wrap"><table class="hbe-campaign-table"><thead><tr><th scope="col">${t("Voce", "Entry")}</th><th scope="col">${t("Automazione", "Automation")}</th><th scope="col">${t("Sulle schede", "On sheets")}</th><th scope="col">${t("Stato", "Status")}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>` : `<p class="empty-state">${t("Nessun homebrew abilitato o in uso nella campagna.", "No homebrew enabled or in use in the campaign.")}</p>`}</section>`;
}

// ---------------------------------------------------------------- sheet boxes

function entryHtml(ctx, actor, entry, editable) {
  const t = ctx.t;
  const active = D.contentActive(ctx.state, slice(ctx.state), entry.contentId, actor);
  const choices =
    entry.type !== "subclass" && Object.keys(entry.choices ?? {}).length
      ? ` · ${t("scelte", "choices")}: ${entry.modifiers
          .filter((m) => m.source && ctx.label(m.source).includes("·"))
          .map((m) => lbl(ctx, m.source).split(" · ").at(-1))
          .join(", ")}`
      : "";
  return `<li class="hbe-entry" data-hbe-entry="${esc(ctx, entry.contentId)}"><div><strong>${lbl(ctx, entry.name)}</strong> <span class="muted">${esc(ctx, typeName(ctx, entry.type))}${choices}</span>${active ? "" : ` <span class="badge hbe-off">${t("disattivato nella campagna", "disabled in the campaign")}</span>`}${entry.override ? `<p class="muted">${t("Prerequisiti derogati dal DM", "Prerequisites overridden by the DM")}: ${esc(ctx, entry.override.reason)}</p>` : ""}${entry.modifiers.length ? `<p class="muted">${entry.modifiers.map((m) => modText(ctx, m)).join(" · ")}</p>` : ""}${timedHtml(ctx, actor, entry, editable)}</div>${editable && entry.type !== "subclass" ? btn(ctx, "remove-entry", t("Rimuovi", "Remove"), data({ actor: actor.id, row: entry.rowId })) : ""}</li>`;
}
// BI-20 (Foundry Active Effects): a timed effect's state and its start / end control.
function timedHtml(ctx, actor, entry, editable) {
  const t = ctx.t;
  const timed = D.timedModifiers(entry);
  if (!timed.length) return "";
  const active = timed.filter((m) => entry.activeTimed?.[m.id]);
  return `<p class="hbe-timed" data-hbe-timed="${esc(ctx, entry.rowId)}">${active.length ? `<span class="badge hbe-timed-on">${t("Effetto attivo", "Effect active")}</span> ${active.map((m) => `${modText(ctx, m)}`).join(" · ")}` : `<span class="muted">${t("Effetto a tempo non attivo", "Timed effect not active")}</span>`}${editable ? ` ${active.length ? btn(ctx, "end-timed", t("Termina effetto", "End effect"), data({ actor: actor.id, row: entry.rowId })) : btn(ctx, "activate-timed", t("Attiva effetto", "Activate effect"), data({ actor: actor.id, row: entry.rowId }), "primary")}` : ""}</p>`;
}
export function renderSheetFeatures(ctx, actor) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const rec = D.sheetRecord(s, actor.id);
  const editable = ctx.canControl(actor);
  const entries = list(rec?.entries);
  const sub = D.subclassOf(s, actor.id);
  const candidates = sub ? [] : D.subclassCandidates(ctx.state, actor.id, ctx.role);
  const unconnected = D.unconnectedRows(ctx.state, s, actor.id, ctx.role);
  const orphans = D.orphanEntries(ctx.state, s, actor.id);
  const stale = D.staleEntries(ctx.state, s, actor.id);
  const updates = editable ? D.updatesFor(ctx.state, actor.id, ctx.role) : [];
  const stack = D.stackReport(ctx.state, s, actor.id);
  const pending = D.pendingAdvancement(ctx.state, s, actor.id);
  const future = D.futureAdvancement(ctx.state, s, actor.id);
  const campaignOff =
    isCampaignActor(actor, ctx.state.campaign.id) &&
    D.campaignRecord(s, ctx.state.campaign.id).disabled;
  if (
    !entries.length &&
    !candidates.length &&
    !unconnected.length &&
    !orphans.length &&
    !updates.length &&
    actor.kind !== "character"
  )
    return "";
  // DDB update notice with the diff one click away (the Library's «Rivedi aggiornamento»).
  const updateHtml = updates
    .map(
      (u) =>
        `<p class="hbe-notice hbe-update" role="status" data-hbe-update="${esc(ctx, u.rowId)}"><strong>${t("Aggiornamento disponibile", "Update available")}</strong><span>${lbl(ctx, u.name)} · ${t("rev.", "rev.")} ${u.from} → ${t("rev.", "rev.")} ${u.to}</span>${btn(ctx, "review-update", t("Rivedi aggiornamento", "Review update"), data({ actor: actor.id, row: u.rowId, kind: u.targetKind, content: u.ref.contentId, revision: u.ref.revisionId }), "primary")}</p>`,
    )
    .join("");
  const subHtml = sub
    ? `<section class="hbe-subclass" data-hbe-subclass="${esc(ctx, sub.contentId)}"><div class="section-heading"><h4>${t("Sottoclasse", "Subclass")}: ${lbl(ctx, sub.name)}</h4>${editable ? btn(ctx, "remove-entry", t("Rimuovi sottoclasse", "Remove subclass"), data({ actor: actor.id, row: "subclass" })) : ""}</div>${D.scaleValues(
        sub,
        actor.level,
      )
        .filter((x) => x.value)
        .map((x) => `<p>${lbl(ctx, x.name)}: <strong>${esc(ctx, x.value)}</strong></p>`)
        .join(
          "",
        )}${pending.length ? `<div class="hbe-notice" role="status"><p><strong>${t("Avanzamento da applicare", "Advancement to apply")}</strong></p><ul>${pending.map((a) => `<li>${t("Livello", "Level")} ${a.level}: ${advText(ctx, a)}</li>`).join("")}</ul>${editable ? btn(ctx, "apply-advancement", t("Applica avanzamento", "Apply advancement"), data({ actor: actor.id }), "primary") : ""}</div>` : ""}<ul class="hbe-granted">${list(
        sub.advancement,
      )
        .filter((a) => sub.granted.includes(a.id))
        .sort((a, b) => a.level - b.level)
        .map(
          (a) =>
            `<li data-hbe-granted="${a.level}">✓ ${t("Livello", "Level")} ${a.level}: ${advText(ctx, a)}</li>`,
        )
        .join(
          "",
        )}${future.map((a) => `<li class="muted" data-hbe-future="${a.level}">${t("Dal livello", "From level")} ${a.level}: ${advText(ctx, a)}</li>`).join("")}</ul></section>`
    : candidates.length && editable
      ? `<p>${btn(ctx, "choose-subclass", t("Scegli una sottoclasse homebrew…", "Choose a homebrew subclass…"), data({ actor: actor.id }))}</p>`
      : "";
  return `<section class="panel hbe-sheet" aria-labelledby="hbe-sheet-${esc(ctx, actor.id)}"><div class="section-heading"><h3 id="hbe-sheet-${esc(ctx, actor.id)}">${t("Homebrew strutturato", "Structured homebrew")}</h3>${editable ? btn(ctx, "add-structured", t("Aggiungi homebrew…", "Add homebrew…"), data({ actor: actor.id })) : ""}</div>${campaignOff ? `<p class="hbe-notice" role="status">${t("L’homebrew è disattivato per la campagna: effetti e attività sono sospesi.", "Homebrew is disabled for the campaign: effects and activities are suspended.")}</p>` : ""}${updateHtml}${orphans.map((o) => `<p class="hbe-notice" role="alert">${t(`«${pick(o.name, "it")}» non è più sulla scheda, ma i suoi effetti sono ancora applicati.`, `“${pick(o.name, "en")}” is no longer on the sheet, but its effects are still applied.`)} ${editable ? btn(ctx, "remove-entry", t("Rimuovi gli effetti", "Remove the effects"), data({ actor: actor.id, row: o.rowId })) : ""}</p>`).join("")}${stale.map((e) => `<p class="hbe-notice" role="status">${t(`«${pick(e.name, "it")}» è stata aggiornata dalla Biblioteca a un’altra revisione: i suoi effetti sono ancora quelli della precedente.`, `“${pick(e.name, "en")}” was updated from the Library to another revision: its effects are still the previous one’s.`)} ${editable ? btn(ctx, "refresh-entry", t("Aggiorna gli effetti", "Update the effects"), data({ actor: actor.id, row: e.rowId })) : ""}</p>`).join("")}${unconnected.map((u) => `<p class="hbe-notice">${t(`«${pick(u.name, "it")}» è stata aggiunta dalla Biblioteca: completa le scelte per attivarne gli effetti.`, `“${pick(u.name, "en")}” was added from the Library: complete its choices to turn on its effects.`)} ${editable ? btn(ctx, "complete-choices", t("Completa le scelte", "Complete the choices"), data({ actor: actor.id, row: u.rowId })) : ""}</p>`).join("")}${
    entries.some((e) => e.type !== "subclass")
      ? `<ul class="hbe-entries">${entries
          .filter((e) => e.type !== "subclass")
          .map((e) => entryHtml(ctx, actor, e, editable))
          .join("")}</ul>`
      : sub
        ? ""
        : `<p class="muted">${t("Nessun talento, oggetto o sottoclasse homebrew con effetti su questa scheda.", "No homebrew feat, item or subclass with effects on this sheet.")}</p>`
  }${ctx.canUndo?.() && ownLabels.has(ctx.undoLabel?.()) ? `<p class="hbe-undo">${btn(ctx, "undo", `${ctx.icon("undo")} ${t("Annulla", "Undo")}: ${esc(ctx, ctx.undoLabel())}`)}</p>` : ""}${stack.length ? `<div class="hbe-stacks"><h4>${t("Ordine di cumulo", "Stacking order")}</h4>${stack.map((v) => stackHtml(ctx, v)).join("")}</div>` : ""}${subHtml}</section>`;
}
function activityRows(ctx, actorId, compact = false) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const actor = ctx.state.actors[actorId];
  const can = canControlActor(actor, ctx.role, ctx.state);
  return D.actorActivities(ctx.state, s, actorId)
    .map((x) => {
      const dc = x.activity.type === "save" ? D.saveDcFor(x.activity, D.sheetOf(actor)) : null;
      // The latest use keeps its rolls, like the buttons of a dnd5e activity card (FVT-180).
      const use = can ? D.lastUseOf(s, actorId, x.contentId, x.activity.id) : null;
      const card = list(use?.rolls).length
        ? `<p class="hbe-use-card" data-hbe-use-card="${esc(ctx, use.id)}"><span class="muted">${t("Ultimo uso", "Last use")}${use.turnKey ? ` · ${t("round", "round")} ${esc(ctx, use.turnKey.split(":")[0])}` : ""}:</span> ${use.rolls.map((r, i) => btn(ctx, "roll-use", `${ctx.icon("dice")} ${rollName(ctx, r.kind)} ${esc(ctx, r.dice)}`, data({ use: use.id, roll: i }))).join("")}</p>`
        : "";
      return `<li class="hbe-activity" data-hbe-activity-row="${esc(ctx, x.activity.id)}"><div><strong>${lbl(ctx, x.activity.name)}</strong>${compact ? "" : ` <span class="muted">${lbl(ctx, x.entryName)}</span>`}<p class="muted">${activityText(ctx, x.activity, dc?.value).replace(/^<strong>.*?<\/strong>\s*/, "")}</p>${card}</div>${x.active ? (can ? btn(ctx, "use", t("Usa", "Use"), data({ actor: actorId, content: x.contentId, activity: x.activity.id }), "primary") : "") : `<span class="badge hbe-off">${t("disattivata", "disabled")}</span>`}</li>`;
    })
    .join("");
}
const rollName = (ctx, kind) =>
  kind === "attack"
    ? ctx.t("Tiro per colpire", "Attack roll")
    : kind === "heal"
      ? ctx.t("Cura", "Healing")
      : ctx.t("Danni", "Damage");
function pendingSaveRows(ctx, actorId = null) {
  const t = ctx.t;
  return D.pendingSavesFor(ctx.state, slice(ctx.state), ctx.role, actorId)
    .map(({ use, target, canRoll }) => {
      const who = ctx.state.actors[target.actorId];
      const reused = rollSlice(ctx.state).saves[`${use.id}:${target.actorId}`];
      return `<li class="hbe-save" data-hbe-save="${esc(ctx, use.id)}:${esc(ctx, target.actorId)}"><div><strong>${esc(ctx, who?.name)}</strong>: ${t("tiro salvezza su", "saving throw")} ${lbl(ctx, D.abilityName(use.ability))} ${t("CD", "DC")} ${use.dc}<p class="muted">${lbl(ctx, use.name)} · ${esc(ctx, ctx.state.actors[use.actorId]?.name)}${use.effect ? ` · ${t("se fallisce", "on a failure")}: ${lbl(ctx, D.conditionName(use.effect.conditionId))}, ${lbl(ctx, D.anchorWithNames(use.effect.duration, ctx.state.actors[use.actorId]?.name ?? "", who?.name ?? ""))}` : ""}</p></div>${canRoll ? btn(ctx, "roll-save", reused ? t(`Riapplica il tiro registrato (${reused.total ?? "fallito"})`, `Reapply the recorded roll (${reused.total ?? "failed"})`) : t("Tira il TS", "Roll the save"), data({ use: use.id, target: target.actorId }), "primary") : `<span class="muted">${t("Tira chi controlla il bersaglio", "The target’s controller rolls")}</span>`}</li>`;
    })
    .join("");
}
export function renderSheetActions(ctx, actor) {
  const t = ctx.t;
  const rows = activityRows(ctx, actor.id);
  const saves = pendingSaveRows(ctx, actor.id);
  if (!rows && !saves) return "";
  return `<section class="panel hbe-sheet" aria-labelledby="hbe-acts-${esc(ctx, actor.id)}"><div class="section-heading"><h3 id="hbe-acts-${esc(ctx, actor.id)}">${t("Attività homebrew", "Homebrew activities")}</h3></div>${rows ? `<ul class="hbe-activities">${rows}</ul>` : ""}${saves ? `<h4>${t("Tiri salvezza in attesa", "Pending saving throws")}</h4><ul class="hbe-saves">${saves}</ul>` : ""}</section>`;
}
export function renderTablePanel(ctx, tableView) {
  const t = ctx.t;
  const id = tableView?.selectedActorId;
  const actor = ctx.state.actors[id];
  if (!actor) return "";
  const rows = activityRows(ctx, id, true);
  const saves = pendingSaveRows(ctx, id);
  const ref = actor.homebrewCreature;
  let block = "";
  if (ref && ctx.role === "dm") {
    const rev = readable(ctx, ref);
    if (rev?.data.structured?.creature)
      block = statblockHtml(ctx, rev.data.name, rev.data.structured.creature, {
        mode: "live",
        ref,
      });
  }
  return `<div class="hbe-table" data-hbe-table="${esc(ctx, id)}">${rows ? `<ul class="hbe-activities">${rows}</ul>` : ""}${saves ? `<h4>${t("Tiri salvezza in attesa", "Pending saving throws")}</h4><ul class="hbe-saves">${saves}</ul>` : ""}${block}</div>`;
}
const tablePanelVisible = (ctx, tableView) => {
  const id = tableView?.selectedActorId;
  const actor = ctx.state.actors[id];
  if (!actor) return false;
  const s = slice(ctx.state);
  return (
    D.actorActivities(ctx.state, s, id).length > 0 ||
    D.pendingSavesFor(ctx.state, s, ctx.role, id).length > 0 ||
    (!!actor.homebrewCreature && ctx.role === "dm")
  );
};

// ---------------------------------------------------------------- roll dialog (shared roll service)

// Roll dialog modelled on the compendium's: normal/advantage/disadvantage, digital or
// physical faces, audience for the DM; records through the compendium roll service.
function openRoll(
  ctx,
  request,
  { title, reasons = [], presetMode = "normal", autoFail = false, onRecorded },
) {
  const t = ctx.t;
  const state = { mode: presetMode, dieMode: "digital" };
  const plan = () =>
    rollPlan(
      request.kind === "d20"
        ? { kind: "d20", bonus: request.bonus, mode: state.mode }
        : { kind: "damage", terms: request.terms },
    );
  const faces = (p) =>
    p.dice
      .map(
        (die, i) =>
          `<label class="field">${t("Dado", "Die")} ${i + 1} · d${die.sides}<input type="number" name="face-${i}" min="1" max="${die.sides}" inputmode="numeric" required></label>`,
      )
      .join("");
  const body = autoFail
    ? `<p class="hbe-notice">${t("Fallimento automatico", "Automatic failure")}: ${reasons.map((r) => lbl(ctx, r)).join(", ")}</p><input type="hidden" name="autoFail" value="1">`
    : `<p class="muted">${lbl(ctx, request.label)}</p><p><strong>${t("Formula", "Formula")}:</strong> <span data-hbe-formula>${esc(ctx, formulaText(plan(), ctx.lang))}</span></p>${reasons.length ? `<p class="muted">${t("Motivi", "Reasons")}: ${reasons.map((r) => lbl(ctx, r)).join(", ")}</p>` : ""}${request.kind === "d20" ? `<fieldset class="hbe-choice"><legend>${t("Tiro con d20", "D20 roll")}</legend>${["normal", "advantage", "disadvantage"].map((m) => `<label class="hbe-check"><input type="radio" name="advantage" value="${m}" ${m === state.mode ? "checked" : ""}> ${m === "normal" ? t("Normale", "Normal") : m === "advantage" ? t("Vantaggio", "Advantage") : t("Svantaggio", "Disadvantage")}</label>`).join("")}</fieldset>` : ""}<fieldset class="hbe-choice"><legend>${t("Dadi", "Dice")}</legend><label class="hbe-check"><input type="radio" name="dieMode" value="digital" checked> ${t("Dado digitale", "Digital die")}</label><label class="hbe-check"><input type="radio" name="dieMode" value="physical"> ${t("Dado fisico: inserisco le facce", "Physical die: I enter the faces")}</label></fieldset><div class="hbe-faces" data-hbe-faces hidden></div>${ctx.role === "dm" ? `<label class="field">${t("Chi vede il risultato", "Who sees the result")}<select name="visibility"><option value="shared">${t("Tutto il tavolo", "The whole table")}</option><option value="private">${t("Solo il DM", "DM only")}</option></select></label>` : ""}`;
  ctx.dialog(title, body, {
    submitLabel: autoFail
      ? t("Registra il fallimento", "Record the failure")
      : t("Registra tiro", "Record roll"),
    onSubmit: (form) => {
      if (autoFail)
        return onRecorded({ autoFail: true, total: null, natural: null, mode: null, rollId: null });
      state.mode = String(form.get("advantage") ?? state.mode);
      const p = plan();
      const physical = form.get("dieMode") === "physical";
      const values = physical
        ? p.dice.map((_, i) => Number(form.get(`face-${i}`)))
        : p.dice.map((die) => rollDie(die.sides));
      if (physical && values.some((f, i) => !validFace(f, p.dice[i].sides)))
        throw D.refusal(
          "Inserisci ogni faccia del dado fisico: un intero tra 1 e il numero di facce.",
          "Enter every physical die face: an integer from 1 to the number of sides.",
        );
      const { record } = recordRoll(ctx, request, {
        mode: physical ? "physical" : "digital",
        faces: values,
        visibility: form.get("visibility") === "private" ? "private" : "shared",
        options: { mode: state.mode },
      });
      return onRecorded({
        rollId: record.id,
        total: record.total,
        natural: record.natural ?? null,
        mode: record.mode,
        values: record.values,
      });
    },
  });
  const dialog = globalThis.document?.querySelector("#dialog");
  if (!dialog || autoFail) return;
  const refresh = () => {
    dialog.querySelector("[data-hbe-formula]").textContent = formulaText(plan(), ctx.lang);
    const box = dialog.querySelector("[data-hbe-faces]");
    box.hidden = state.dieMode !== "physical";
    box.innerHTML = state.dieMode === "physical" ? faces(plan()) : "";
  };
  dialog
    .querySelectorAll("[name=advantage]")
    .forEach((input) => (input.onchange = () => ((state.mode = input.value), refresh())));
  dialog
    .querySelectorAll("[name=dieMode]")
    .forEach((input) => (input.onchange = () => ((state.dieMode = input.value), refresh())));
}

// ---------------------------------------------------------------- actions

function editorMutate(ctx, fn) {
  if (!session) return;
  fn(session.data.structured, session.data);
  session.dirty = true;
  ctx.render();
}
function usableStructured(ctx, actor) {
  return hb
    .listHomebrew(ctx.state, ctx.role)
    .filter(
      (e) =>
        !["subclass", "class", "creature"].includes(e.type) &&
        hb.getHomebrewTypes().find((x) => x.id === e.type)?.targetKind,
    )
    .flatMap((e) => {
      const rev = readable(ctx, e.latestRef);
      if (!rev?.data.structured) return [];
      // Several revisions may be enabled: a new application takes the newest of them.
      const order = e.revisions.map((r) => r.id);
      const enabledRef = (ctx.state.campaign.enabledContent ?? [])
        .filter((r) => r.contentId === e.id)
        .sort((x, y) => order.indexOf(x.revisionId) - order.indexOf(y.revisionId))
        .at(-1);
      const ref =
        isCampaignActor(actor, ctx.state.campaign.id) && enabledRef ? enabledRef : e.latestRef;
      const available = hb.homebrewAvailability(ctx.state, ref, { actorId: actor.id }, ctx.role);
      return [{ ref, name: rev.data.name, type: e.type, canUse: available.canUse }];
    });
}
function choicesForm(ctx, s, prefix = "") {
  return list(s?.options)
    .map(
      (o) =>
        `<fieldset class="hbe-choice"><legend>${lbl(ctx, o.name)} · ${ctx.t("scegli", "choose")} ${o.choose}</legend>${o.from.map((c) => `<label class="hbe-check"><input type="${o.choose === 1 ? "radio" : "checkbox"}" name="${prefix}opt-${esc(ctx, o.id)}" value="${esc(ctx, c.id)}"> ${lbl(ctx, c.name)}</label>`).join("")}</fieldset>`,
    )
    .join("");
}
const choicesFrom = (s, form, prefix = "") =>
  Object.fromEntries(
    list(s?.options).map((o) => [o.id, form.getAll(`${prefix}opt-${o.id}`).map(String)]),
  );
function applySheetDialog(ctx, ref, fixedActorId = null) {
  const t = ctx.t;
  const rev = readable(ctx, ref);
  if (!rev) return;
  const s = rev.data.structured;
  const actors = Object.values(ctx.state.actors).filter(
    (a) => a.kind === "character" && ctx.canControl(a),
  );
  // X-A1 (D&D Beyond campaign homebrew): each sheet says what it still needs; ready sheets
  // come first, so the preselected one can take the revision.
  const prereq = actors
    .map((a) => [
      a,
      D.evaluatePrerequisites(s, D.sheetOf(a)),
      hb.homebrewUseSteps(ctx.state, ref, { actorId: a.id }, ctx.role),
    ])
    .sort((x, y) => Number(x[2].length > 0) - Number(y[2].length > 0));
  const quote = (text) => t(`«${text}»`, `“${text}”`);
  const optionText = ([a, p, steps]) =>
    `${a.name} · ${
      steps.length
        ? t("prima: ", "first: ") + steps.map((x) => quote(t(x.it, x.en))).join(" · ")
        : p.ok
          ? t("prerequisiti soddisfatti", "prerequisites met")
          : t("prerequisiti non soddisfatti", "prerequisites not met")
    }`;
  const blocked = prereq.some(([, , steps]) => steps.length);
  ctx.dialog(
    t(`Applica «${pick(rev.data.name, "it")}»`, `Apply “${pick(rev.data.name, "en")}”`),
    `${fixedActorId ? `<input type="hidden" name="actorId" value="${esc(ctx, fixedActorId)}">` : `<label class="field">${t("Scheda", "Sheet")}<select name="actorId">${prereq.map((row) => `<option value="${esc(ctx, row[0].id)}">${esc(ctx, optionText(row))}</option>`).join("")}</select></label>${blocked ? `<p class="muted" data-hbe-apply-steps>${t("Le schede della campagna usano solo contenuti abilitati dal DM e leggibili da chi vede la scheda: i pulsanti «Abilita in campagna» e «Condividi in lettura…» sono in «Usa questa revisione».", "Campaign sheets only use content the DM enabled and everyone who sees the sheet can read: the “Enable in the campaign” and “Share read access…” buttons are in “Use this revision”.")}</p>` : ""}`}${
      D.describePrerequisites(s).length
        ? `<p class="muted">${t("Prerequisiti", "Prerequisites")}: ${D.describePrerequisites(s)
            .map((x) => lbl(ctx, x))
            .join("; ")}</p>`
        : ""
    }${choicesForm(ctx, s)}${ctx.role === "dm" ? `<label class="field">${t("Deroga del DM ai prerequisiti (motivo, facoltativo)", "DM override of prerequisites (reason, optional)")}<input name="override" maxlength="200"></label>` : ""}<p class="muted">${t("Aggiunge la copia della revisione alla scheda e ne applica i modificatori con l’ordine di cumulo. L’Undo la toglie.", "Adds the revision copy to the sheet and applies its modifiers in stacking order. Undo removes it.")}</p>`,
    {
      submitLabel: t("Applica alla scheda", "Apply to the sheet"),
      onSubmit: (form) => {
        const actorId = String(form.get("actorId") ?? "");
        const actor = ctx.state.actors[actorId];
        const rowId = D.newId("hbrow");
        run(
          ctx,
          t(
            `Homebrew applicato a ${actor?.name}: ${pick(rev.data.name, "it")}`,
            `Homebrew applied to ${actor?.name}: ${pick(rev.data.name, "en")}`,
          ),
          (draft, sl) =>
            D.applyToSheet(
              draft,
              sl,
              {
                actorId,
                ref,
                choices: choicesFrom(s, form),
                rowId,
                override: String(form.get("override") ?? "") || null,
              },
              ctx.role,
            ),
          commitOptionsFor(actor),
        );
        ctx.toast(t("Applicato alla scheda.", "Applied to the sheet."));
        ctx.openSheet?.(actorId, "features");
      },
    },
  );
}
function useDialog(ctx, actorId, contentId, activityId) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const found = D.actorActivities(ctx.state, s, actorId).find(
    (x) => x.contentId === contentId && x.activity.id === activityId,
  );
  if (!found) return ctx.toast(t("Attività non trovata.", "Activity not found."), true);
  const a = found.activity;
  const actor = ctx.state.actors[actorId];
  if (a.type === "save") {
    const options = D.targetOptions(ctx.state, actorId, a, ctx.role);
    const dc = D.saveDcFor(a, D.sheetOf(actor));
    ctx.dialog(
      lbl(ctx, a.name),
      `<p>${activityText(ctx, a)}</p><p class="muted">${lbl(ctx, dc.formula)} · SRD 5.2.1: ${t("tiro salvezza", "saving throw")} ${esc(ctx, D.sourcePages(D.SRD.savingThrow))}; ${t("CD", "DC")} ${esc(ctx, D.sourcePages(D.SRD.saveDc))}</p><fieldset class="hbe-choice"><legend>${t(`Bersagli (fino a ${Math.max(1, a.activation.targets)})`, `Targets (up to ${Math.max(1, a.activation.targets)})`)}</legend>${options.length ? options.map((o) => `<label class="hbe-check"><input type="checkbox" name="target" value="${esc(ctx, o.actorId)}" ${o.inRange ? "" : `disabled aria-describedby="hbe-target-why-${esc(ctx, o.actorId)}"`}> ${esc(ctx, o.name)} · ${o.distance == null ? "—" : `${Math.round(o.distance * 10) / 10} m`}${o.inRange ? "" : ` (<span id="hbe-target-why-${esc(ctx, o.actorId)}">${t("fuori portata: avvicinati o scegli un altro bersaglio", "out of range: move closer or pick another target")}</span>)`}</label>`).join("") : `<p>${t("Nessuna creatura visibile sulla scena.", "No visible creature on the scene.")}</p>`}</fieldset><p class="muted">${t("Il costo si paga ora; ogni bersaglio tira il suo TS con dadi fisici o digitali.", "The cost is paid now; each target rolls its save with physical or digital dice.")}</p>`,
      {
        submitLabel: t("Usa e chiedi il TS", "Use and request the save"),
        onSubmit: (form) => {
          const targetIds = form.getAll("target").map(String);
          run(
            ctx,
            t(
              `${actor.name} usa ${pick(a.name, "it")}`,
              `${actor.name} uses ${pick(a.name, "en")}`,
            ),
            (draft, sl) =>
              D.startActivity(
                draft,
                sl,
                { id: D.newId("use"), actorId, contentId, activityId, targetIds },
                ctx.role,
              ),
          );
          ctx.toast(t("Tiro salvezza richiesto.", "Saving throw requested."));
        },
      },
    );
    return;
  }
  // Attack, damage and heal: the use pays the cost once and keeps its rolls on the
  // activity's row (dnd5e activity card, FVT-180); the first roll opens now. Applying the
  // result stays manual. The other types record the use and its cost.
  const rolls = D.activityRolls(a);
  ctx.dialog(
    lbl(ctx, a.name),
    `<p>${activityText(ctx, a)}</p><p class="muted">${rolls.length ? t("Il costo si paga ora, una volta. I tiri vanno nel registro e restano sulla riga dell’attività (per esempio i danni dopo il tiro per colpire); l’applicazione di danni o cure resta manuale (Condizioni e stato).", "The cost is paid now, once. Rolls go to the log and stay on the activity’s row (for example the damage after the attack roll); applying damage or healing stays manual (Conditions and status).") : t("Promemoria: si registra l’uso e il costo.", "Reminder: the use and its cost are recorded.")}</p>${rolls.length ? `<label class="field">${t("Primo tiro", "First roll")}<select name="roll">${rolls.map((r) => `<option value="${r.kind}">${rollName(ctx, r.kind)} · ${esc(ctx, r.dice)}</option>`).join("")}</select></label>` : ""}`,
    {
      submitLabel: rolls.length
        ? t("Usa e tira", "Use and roll")
        : t("Registra l’uso", "Record the use"),
      onSubmit: (form) => {
        const use = run(
          ctx,
          t(`${actor.name} usa ${pick(a.name, "it")}`, `${actor.name} uses ${pick(a.name, "en")}`),
          (draft, sl) =>
            D.recordActivityUse(
              draft,
              sl,
              { id: D.newId("use"), actorId, contentId, activityId },
              ctx.role,
            ),
        );
        if (rolls.length)
          rollUse(
            ctx,
            use.id,
            Math.max(
              0,
              rolls.findIndex((r) => r.kind === String(form.get("roll"))),
            ),
          );
      },
    },
  );
}
// One roll of a recorded use, through the shared roll service; never pays the cost again.
function rollUse(ctx, useId, index) {
  const { use, roll, actor } = D.useRoll(ctx.state, slice(ctx.state), useId, index, ctx.role);
  const request = D.rollRequestFor(
    `homebrew:${use.contentId}`,
    L(`${actor.name} · ${pick(use.name, "it")}`, `${actor.name} · ${pick(use.name, "en")}`),
    roll,
    ctx.lang,
  );
  openRoll(ctx, request, {
    title: `${lbl(ctx, use.name)} · ${rollName(ctx, roll.kind)}`,
    onRecorded: (r) => ctx.toast(`${lbl(ctx, request.label)}: ${r.total}`),
  });
}
function rollSave(ctx, useId, targetId) {
  const t = ctx.t;
  const s = slice(ctx.state);
  const profile = D.saveProfile(ctx.state, s, useId, targetId);
  const target = ctx.state.actors[targetId];
  const evidence = rollSlice(ctx.state).saves[`${useId}:${targetId}`];
  const finish = (roll) => {
    let out;
    run(
      ctx,
      t(`TS di ${target.name}: esito registrato`, `${target.name}’s save: outcome recorded`),
      (draft, sl) => {
        out = D.resolveSave(draft, sl, rollSlice(draft), { useId, targetId, roll }, ctx.role);
      },
    );
    const r = out.target;
    ctx.toast(
      out.success
        ? t(
            `${target.name}: ${r.total} contro CD ${profile.use.dc} → superato.`,
            `${target.name}: ${r.total} vs DC ${profile.use.dc} → success.`,
          )
        : (() => {
            const anchor = profile.use.effect
              ? D.anchorWithNames(
                  profile.use.effect.duration,
                  ctx.state.actors[profile.use.actorId]?.name ?? "",
                  target.name,
                )
              : null;
            return t(
              `${target.name}: ${r.autoFail ? "fallimento automatico" : r.total} contro CD ${profile.use.dc} → fallito${anchor ? `: ${pick(D.conditionName(profile.use.effect.conditionId), "it")}, ${anchor.it}` : ""}.`,
              `${target.name}: ${r.autoFail ? "automatic failure" : r.total} vs DC ${profile.use.dc} → failed${anchor ? `: ${pick(D.conditionName(profile.use.effect.conditionId), "en")}, ${anchor.en}` : ""}.`,
            );
          })(),
    );
    return out;
  };
  if (evidence) return finish(null);
  const request = {
    entry: { id: `homebrew:${profile.use.contentId}` },
    kind: "d20",
    rollKind: "save",
    bonus: profile.bonus,
    label: L(
      `${target.name} · tiro salvezza su ${pick(D.abilityName(profile.use.ability), "it")}`,
      `${target.name} · ${pick(D.abilityName(profile.use.ability), "en")} saving throw`,
    ),
  };
  openRoll(ctx, request, {
    title: t(
      `Tiro salvezza di ${target.name} (CD ${profile.use.dc})`,
      `${target.name}’s saving throw (DC ${profile.use.dc})`,
    ),
    reasons: profile.reasons,
    presetMode: profile.mode,
    autoFail: profile.autoFail,
    onRecorded: finish,
  });
}
function rollBlock(ctx, d) {
  const t = ctx.t;
  const ref = { contentId: d.content, revisionId: d.revision };
  const rev = readable(ctx, ref);
  const c = rev?.data.structured?.creature;
  if (!c) return;
  const blocks = d.section.includes(".") ? getPath(c.sections, d.section) : c.sections[d.section];
  const b = list(blocks)[Number(d.block)];
  const seg = D.parseRollables(b?.text?.[d.lang] ?? ctx.label(b?.text))[Number(d.seg)]?.rollable;
  if (!seg?.valid) return;
  const request = D.rollRequestFor(
    `homebrew:${ref.contentId}`,
    L(
      `${pick(rev.data.name, "it")} · ${pick(b.name, "it")}`,
      `${pick(rev.data.name, "en")} · ${pick(b.name, "en")}`,
    ),
    seg,
    ctx.lang,
  );
  openRoll(ctx, request, {
    title: t("Tira i dadi", "Roll dice"),
    onRecorded: (r) => ctx.toast(`${lbl(ctx, request.label)}: ${r.total}`),
  });
}
function testRoll(ctx, d) {
  const c = session?.data.structured?.creature;
  if (!c) return;
  const blocks = d.section.includes(".") ? getPath(c.sections, d.section) : c.sections[d.section];
  const b = list(blocks)[Number(d.block)];
  const seg = D.parseRollables(b?.text?.[d.lang] ?? ctx.label(b?.text))[Number(d.seg)]?.rollable;
  if (!seg?.valid) return;
  const p = rollPlan(
    ["attack", "check", "save"].includes(seg.kind)
      ? { kind: "d20", bonus: Number(seg.dice.split(/(?=[+-])/)[1] ?? 0), mode: "normal" }
      : { kind: "damage", terms: [{ dice: seg.dice, type: seg.type }] },
  );
  const faces = p.dice.map((die) => rollDie(die.sides));
  const total = faces.reduce((a, b) => a + b, 0) + p.modifier;
  ui.testRoll = ctx.t(
    `Prova (non registrata): ${pick(b.name, "it")} ${seg.dice} → [${faces.join(", ")}] = ${total}`,
    `Test (not recorded): ${pick(b.name, "en")} ${seg.dice} → [${faces.join(", ")}] = ${total}`,
  );
  ctx.render();
}

// One dispatcher for every control: the bound buttons call it, and so do the tests.
export function handleAction(ctx, action, d = {}, form = null) {
  const t = ctx.t;
  const s = session?.data.structured;
  switch (action) {
    case "go-library":
      return ctx.navigate("library", {});
    case "go-hub":
      return ctx.navigate("library", { tab: D.ID });
    case "create":
      return templateDialog(ctx, d.kind);
    case "resume":
      session = null;
      return ctx.navigate("homebrew-editor", { id: d.draft, tab: "identity" });
    case "open":
      return ctx.navigate("homebrew-editor", { id: d.content, revision: d.revision });
    case "import-page":
      return ctx.navigate("homebrew-editor", { tab: "import" });
    case "catalog-page":
      return ctx.navigate("homebrew-editor", { tab: "catalog" });
    case "subform":
      // BI-15: changing section keeps the draft (no separate «Salva bozza» step first).
      if (session?.dirty && session.id === ctx.view.id) persist(ctx);
      return ctx.navigate("homebrew-editor", { id: ctx.view.id, tab: d.subform });
    case "revert-all":
      // BI-26 (FG «Revert»): every modified field back to the copied source at once.
      return editorMutate(ctx, (x, all) => Object.assign(all, D.revertToSource(all)));
    case "save-draft":
      persist(ctx);
      return ctx.toast(t("Bozza salvata.", "Draft saved."));
    case "save-content": {
      persist(ctx);
      const draftId = session.id;
      const type = session.type;
      // BI-15: a refused save names the field and opens it, the reason beside the input.
      const issues = saveIssues(ctx, draftId);
      if (issues.length) {
        ui.issues = Object.fromEntries(issues.map((e) => [e.path ?? e.code, e]));
        ui.issuesFor = draftId;
        const first = issues[0];
        const tab = tabForPath(type, first.path);
        const target = `[data-hbe-path="${first.path === "name" || first.path === "description" ? `${first.path}.it` : first.path}"]`;
        pendingFocus = target;
        ctx.toast(t(`Non salvato: ${first.it}`, `Not saved: ${first.en}`), true);
        if (ctx.view.tab === tab) ctx.render();
        else ctx.navigate("homebrew-editor", { id: draftId, tab });
        // After the click handler restores its own focus: the field with the reason wins.
        setTimeout(() => {
          const el = globalThis.document?.querySelector(`#content ${target}`);
          el?.focus({ preventScroll: true });
          el?.scrollIntoView?.({ block: "center" });
        }, 60);
        return null;
      }
      const pub = ui.publish[draftId] ?? { share: false, enable: false };
      const other = ctx.role === "dm" ? "player" : "dm";
      let result;
      run(
        ctx,
        pub.enable
          ? t("Contenuto homebrew salvato e abilitato", "Homebrew content saved and enabled")
          : t("Contenuto homebrew salvato", "Homebrew content saved"),
        (draft) => {
          result = D.saveContent(draft, draftId, ctx.role);
          // One save also shares and enables the saved revision when chosen (DDB).
          const rev = hb.getHomebrewRevision(draft, result.ref, ctx.role);
          if (pub.share && rev.owner === ctx.role && rev.permissions.canShare) {
            const access = rev.access ?? { readers: [], editors: [] };
            hb.shareHomebrewRevision(
              draft,
              result.ref,
              { readers: [...new Set([...access.readers, other])], editors: access.editors },
              ctx.role,
            );
          }
          if (pub.enable && ctx.role === "dm")
            hb.enableHomebrewRevision(draft, result.ref, { enabled: true }, ctx.role);
        },
        pub.enable ? {} : pub.share ? { visibility: "private" } : privateCommit,
      );
      session = null;
      ui.issues = null;
      ui.issuesFor = null;
      delete ui.publish[draftId];
      ctx.toast(
        [
          t("Contenuto salvato come nuova revisione.", "Content saved as a new revision."),
          pub.share ? t("Condiviso.", "Shared.") : "",
          pub.enable ? t("Abilitato in campagna.", "Enabled in the campaign.") : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      // PG-06: a class, species or background variant goes straight back to the builder
      // choice that asked for it, already selected (no stop on the Library page).
      if (
        result.returnTo?.page === "builder" &&
        ["class", "species", "background"].includes(result.returnTo.targetKind) &&
        ctx.chooseLibraryContent
      ) {
        try {
          ctx.chooseLibraryContent(result.ref, result.returnTo);
          return result;
        } catch (error) {
          ctx.toast(
            error?.it && error?.en ? t(error.it, error.en) : String(error?.message ?? error),
            true,
          );
        }
      }
      // Back to the sheet or builder that asked for it, on the Library page that applies it.
      if (result.returnTo)
        ctx.navigate("library", {
          id: result.ref.contentId,
          revision: result.ref.revisionId,
          tab: "personal",
          returnTo: JSON.stringify(result.returnTo),
        });
      else
        ctx.navigate("homebrew-editor", {
          id: result.ref.contentId,
          revision: result.ref.revisionId,
        });
      return result;
    }
    case "discard-draft":
      return ctx.dialog(
        t("Scartare questa bozza?", "Discard this draft?"),
        `<p>${t("Le revisioni salvate e le copie sulle schede restano invariate.", "Saved revisions and sheet copies stay unchanged.")}</p>`,
        {
          submitLabel: t("Scarta bozza", "Discard draft"),
          onSubmit: () => {
            const id = session?.id ?? ctx.view.id;
            run(
              ctx,
              t("Bozza homebrew scartata", "Homebrew draft discarded"),
              (draft) => hb.discardHomebrewDraft(draft, id, ctx.role),
              privateCommit,
            );
            session = null;
            ctx.navigate("library", { tab: D.ID });
          },
        },
      );
    case "add-group":
      return editorMutate(ctx, (x) =>
        x.prerequisites.push({ id: D.newId("group"), mode: "any", rules: [D.newRule("ability")] }),
      );
    case "remove-group":
      return editorMutate(ctx, (x) => x.prerequisites.splice(Number(d.group), 1));
    case "add-rule":
      return editorMutate(ctx, (x) =>
        x.prerequisites[Number(d.group)].rules.push(D.newRule(d.kind)),
      );
    case "remove-rule":
      return editorMutate(ctx, (x) => {
        const g = x.prerequisites[Number(d.group)];
        g.rules.splice(Number(d.rule), 1);
        if (!g.rules.length) x.prerequisites.splice(Number(d.group), 1);
      });
    case "add-option":
      return editorMutate(ctx, (x) => x.options.push(D.newOption()));
    case "remove-option":
      return editorMutate(ctx, (x) => x.options.splice(Number(d.option), 1));
    case "add-choice":
      return editorMutate(ctx, (x) =>
        x.options[Number(d.option)].from.push({
          id: D.newId("choice"),
          name: L("", ""),
          modifiers: [],
        }),
      );
    case "remove-choice":
      return editorMutate(ctx, (x) => x.options[Number(d.option)].from.splice(Number(d.choice), 1));
    case "add-choice-mod":
      return editorMutate(ctx, (x) =>
        x.options[Number(d.option)].from[Number(d.choice)].modifiers.push(
          D.newModifier("str", "add", 1),
        ),
      );
    case "remove-choice-mod":
      return editorMutate(ctx, (x) =>
        x.options[Number(d.option)].from[Number(d.choice)].modifiers.splice(Number(d.mod), 1),
      );
    case "add-modifier":
      return editorMutate(ctx, (x) => x.modifiers.push(D.newModifier("ac", "add", 1)));
    case "remove-modifier":
      return editorMutate(ctx, (x) => x.modifiers.splice(Number(d.mod), 1));
    case "add-activity":
      return editorMutate(ctx, (x) => {
        const a = D.newActivity(d.type ?? "save");
        x.activities.push(a);
        ui.activityTab[a.id] = "identity";
      });
    case "remove-activity":
      return editorMutate(ctx, (x) => x.activities.splice(Number(d.activity), 1));
    case "activity-tab":
      ui.activityTab[d.activityId] = d.pane;
      return ctx.render();
    case "add-advancement":
      return editorMutate(ctx, (x) =>
        x.advancement.push(D.newAdvancement(d.type ?? "grant", Number(d.level) || 1)),
      );
    case "remove-advancement":
      return editorMutate(ctx, (x) => x.advancement.splice(Number(d.adv), 1));
    case "add-feature":
      return editorMutate(ctx, (x) => x.advancement[Number(d.adv)].features.push(D.newFeature()));
    case "remove-feature":
      return editorMutate(ctx, (x) =>
        x.advancement[Number(d.adv)].features.splice(Number(d.feature), 1),
      );
    case "add-scale-level":
      return editorMutate(ctx, (x) => {
        const level = Number(d.level);
        if (!Number.isInteger(level) || level < 1 || level > 20)
          throw D.refusal("Livello da 1 a 20.", "Level from 1 to 20.");
        const values = x.advancement[Number(d.adv)].scale.values;
        values[level] ??= "";
      });
    case "add-block":
      return editorMutate(ctx, (x) => {
        const target = d.section.includes(".")
          ? getPath(x.creature.sections, d.section)
          : (x.creature.sections[d.section] ??= []);
        target.push(D.newBlock());
      });
    case "remove-block":
      return editorMutate(ctx, (x) => {
        const target = d.section.includes(".")
          ? getPath(x.creature.sections, d.section)
          : x.creature.sections[d.section];
        target.splice(Number(d.block), 1);
      });
    case "auto-rollables":
      return editorMutate(ctx, (x, all) => {
        const b = getPath(all, d.path);
        b.text = { it: D.autoRollables(b.text?.it), en: D.autoRollables(b.text?.en) };
      });
    case "apply-preset":
      if (!d.preset) throw D.refusal("Scegli un preset.", "Choose a preset.");
      return editorMutate(ctx, (x) => {
        const built = D.buildFromTemplate("creature", d.preset, ctx.lang);
        x.creature = built.structured.creature;
        x.template = built.structured.template;
        x.origin = built.structured.origin;
      });
    case "revert-field":
      return editorMutate(ctx, (x, all) => {
        const reverted = D.revertToSource(all, [d.path]);
        Object.assign(all, reverted);
      });
    case "test-roll":
      return testRoll(ctx, d);
    case "revise":
    case "duplicate": {
      const ref = {
        contentId: ctx.view.id,
        revisionId:
          ctx.view.revision ||
          hb.listHomebrew(ctx.state, ctx.role).find((e) => e.id === ctx.view.id).latestRef
            .revisionId,
      };
      const id = D.newId("draft");
      run(
        ctx,
        action === "revise"
          ? t("Nuova versione iniziata", "New version started")
          : t("Copia indipendente iniziata", "Independent copy started"),
        (draft) => hb.createHomebrewDraft(draft, { id, kind: action, ref }, ctx.role),
        privateCommit,
      );
      session = null;
      return ctx.navigate("homebrew-editor", { id, tab: "identity" });
    }
    case "revert-source": {
      const ref = currentRef(ctx);
      const rev = readable(ctx, ref);
      const fields = D.modifiedFields(rev.data);
      return ctx.dialog(
        t("Ripristinare alla fonte?", "Revert to source?"),
        `<p>${t("I campi modificati tornano ai valori della fonte in una nuova revisione. La revisione attuale resta nella cronologia e le copie sulle schede non cambiano.", "Modified fields go back to the source values in a new revision. The current revision stays in the history and sheet copies do not change.")}</p><ul>${fields.map((f) => `<li>${lbl(ctx, D.FIELD_NAMES[f] ?? L(f, f))}</li>`).join("")}</ul>`,
        {
          submitLabel: t("Ripristina alla fonte", "Revert to source"),
          onSubmit: () => {
            const id = D.newId("draft");
            let result;
            run(
              ctx,
              t("Ripristino alla fonte", "Revert to source"),
              (draft) => {
                hb.createHomebrewDraft(draft, { id, kind: "revise", ref }, ctx.role);
                hb.saveHomebrewDraft(draft, id, { data: D.revertToSource(rev.data) }, ctx.role);
                result = D.saveContent(draft, id, ctx.role);
              },
              privateCommit,
            );
            ctx.toast(
              t(
                "Ripristinato alla fonte: nuova revisione salvata.",
                "Reverted to source: new revision saved.",
              ),
            );
            ctx.navigate("homebrew-editor", {
              id: result.ref.contentId,
              revision: result.ref.revisionId,
            });
          },
        },
      );
    }
    case "open-library":
      return ctx.navigate("library", {
        id: ctx.view.id,
        revision: currentRef(ctx).revisionId,
        tab: "personal",
      });
    case "share": {
      const ref = currentRef(ctx);
      const rev = readable(ctx, ref);
      const other = ctx.role === "dm" ? "player" : "dm";
      const access = rev.access ?? { readers: [], editors: [] };
      const on = d.shared === "true";
      const readers = on
        ? [...new Set([...access.readers, other])]
        : access.readers.filter((r) => r !== other);
      const editors = on ? access.editors : access.editors.filter((r) => r !== other);
      run(
        ctx,
        t("Accesso al contenuto aggiornato", "Content access updated"),
        (draft) => hb.shareHomebrewRevision(draft, ref, { readers, editors }, ctx.role),
        { visibility: "private" },
      );
      return ctx.toast(
        on
          ? t("Condiviso in lettura.", "Read access shared.")
          : t("Condivisione revocata.", "Sharing revoked."),
      );
    }
    case "enable": {
      const ref = currentRef(ctx);
      const enabled = d.enabled === "true";
      run(
        ctx,
        enabled
          ? t("Revisione abilitata in campagna", "Revision enabled in the campaign")
          : t("Revisione disabilitata in campagna", "Revision disabled in the campaign"),
        (draft) => hb.enableHomebrewRevision(draft, ref, { enabled }, ctx.role),
      );
      return ctx.toast(
        enabled
          ? t("Abilitata in campagna.", "Enabled in the campaign.")
          : t("Disabilitata in campagna.", "Disabled in the campaign."),
      );
    }
    case "apply-sheet":
      return applySheetDialog(ctx, currentRef(ctx));
    case "place": {
      const ref = currentRef(ctx);
      const rev = readable(ctx, ref);
      return ctx.dialog(
        t("Aggiungi alla scena attiva", "Add to the active scene"),
        `<label class="field">${t("Nome della pedina", "Token name")}<input name="name" maxlength="100" value="${lbl(ctx, rev.data.name)}"></label><p class="muted">${t("Crea un PNG con CA, PF, velocità e caratteristiche del blocco; il primo attacco in mischia strutturato diventa l’attacco al Tavolo.", "Creates an NPC with the block’s AC, HP, speed and abilities; the first structured melee attack becomes its Table attack.")}</p>`,
        {
          submitLabel: t("Aggiungi alla scena", "Add to the scene"),
          onSubmit: (form) => {
            const actorId = D.newId("hbnpc");
            run(
              ctx,
              t("Mostro homebrew aggiunto alla scena", "Homebrew monster added to the scene"),
              (draft) =>
                D.placeCreature(
                  draft,
                  {
                    ref,
                    actorId,
                    tokenId: `token-${actorId}`,
                    name: String(form.get("name") ?? ""),
                  },
                  ctx.role,
                ),
            );
            ctx.toast(t("Pedina sulla scena attiva.", "Token on the active scene."));
          },
        },
      );
    }
    case "roll-block":
      return rollBlock(ctx, d);
    case "publish": {
      const ref = currentRef(ctx);
      const preview = (m) => D.publicationChecks(ctx.state, ref, m, ctx.role);
      return ctx.dialog(
        t("Pubblica nel catalogo (simulato)", "Publish to the catalogue (simulated)"),
        `<fieldset class="hbe-choice"><legend>${t("Metodo di creazione (obbligatorio)", "Creation method (required)")}</legend>${D.AI_METHODS.map((m) => `<label class="hbe-check"><input type="radio" name="aiMethod" value="${m.id}"> ${lbl(ctx, m.name)}</label>`).join("")}</fieldset><h3>${t("Controlli automatici", "Automated checks")}</h3><ul class="hbe-checks">${preview(
          "human",
        )
          .filter((c) => c.id !== "ai")
          .map(
            (c) =>
              `<li class="${c.ok ? "hbe-ok" : "hbe-no"}">${c.ok ? "✓" : "✗"} ${esc(ctx, ctx.t(c.it, c.en))}</li>`,
          )
          .join(
            "",
          )}</ul><p class="muted">${t("Dopo i controlli la versione entra in moderazione. Pubblicata, non si modifica né si elimina.", "After the checks the version enters moderation. Once published, it cannot be edited or deleted.")}</p>`,
        {
          submitLabel: t("Invia alla moderazione", "Send to moderation"),
          onSubmit: (f) => {
            const aiMethod = String(f.get("aiMethod") ?? "");
            run(
              ctx,
              t("Versione inviata alla moderazione", "Version sent to moderation"),
              (draft, sl) => D.submitPublication(draft, sl, { ref, aiMethod }, ctx.role),
            );
            ctx.toast(t("In moderazione.", "In moderation."));
          },
        },
      );
    }
    case "moderate":
      if (d.decision === "reject" && !form)
        return ctx.dialog(
          t("Respingi (simulazione)", "Reject (simulation)"),
          `<label class="field">${t("Motivo", "Reason")}<textarea name="reason" maxlength="300" required></textarea></label>`,
          {
            submitLabel: t("Respingi", "Reject"),
            onSubmit: (f) => handleAction(ctx, "moderate", d, f),
          },
        );
      run(
        ctx,
        d.decision === "approve"
          ? t("Moderazione simulata: versione approvata", "Simulated moderation: version approved")
          : t("Moderazione simulata: versione respinta", "Simulated moderation: version rejected"),
        (draft, sl) =>
          D.moderate(
            draft,
            sl,
            {
              contentId: d.content,
              decision: d.decision,
              reason: String(form?.get("reason") ?? ""),
            },
            ctx.role,
          ),
      );
      return ctx.toast(
        d.decision === "approve"
          ? t("Versione pubblicata.", "Version published.")
          : t("Versione respinta.", "Version rejected."),
      );
    case "follow":
      run(ctx, t("Versione seguita", "Version followed"), (draft, sl) =>
        D.followVersion(draft, sl, { contentId: d.content, revisionId: d.revision }, ctx.role),
      );
      return ctx.toast(t("Nella tua raccolta.", "In your collection."));
    case "stay":
      run(ctx, t("Resti sulla versione seguita", "You stay on the followed version"), (draft, sl) =>
        D.stayOnVersion(draft, sl, { contentId: d.content }, ctx.role),
      );
      return;
    case "rate":
      run(ctx, t("Valutazione registrata", "Rating recorded"), (draft, sl) =>
        D.rateContent(draft, sl, { contentId: d.content, stars: Number(d.stars) }, ctx.role),
      );
      return;
    case "report":
      if (!form)
        return ctx.dialog(
          t("Segnala il contenuto", "Report the content"),
          `<label class="field">${t("Motivo", "Reason")}<textarea name="reason" maxlength="300" required></textarea></label>`,
          {
            submitLabel: t("Segnala", "Report"),
            onSubmit: (f) => handleAction(ctx, "report", d, f),
          },
        );
      run(ctx, t("Segnalazione inviata", "Report sent"), (draft, sl) =>
        D.reportContent(
          draft,
          sl,
          { contentId: d.content, reason: String(form.get("reason") ?? "") },
          ctx.role,
        ),
      );
      return ctx.toast(t("Segnalazione inviata alla moderazione.", "Report sent to moderation."));
    case "resolve-report":
      run(ctx, t("Segnalazione decisa (simulazione)", "Report decided (simulation)"), (draft, sl) =>
        D.resolveReport(
          draft,
          sl,
          { contentId: d.content, reportId: d.report, upheld: d.upheld === "true" },
          ctx.role,
        ),
      );
      return;
    case "forge": {
      const forged = D.forgeItem(ui.forge.baseId, [ui.forge.templateId], ctx.lang);
      const id = D.newId("draft");
      run(
        ctx,
        t("Oggetto forgiato: bozza iniziata", "Item forged: draft started"),
        (draft) => {
          hb.createHomebrewDraft(
            draft,
            { id, kind: "create", type: forged.type, returnTo: ui.forgeReturn ?? null },
            ctx.role,
          );
          hb.saveHomebrewDraft(draft, id, { data: forged.data }, ctx.role);
        },
        privateCommit,
      );
      ui.forgeReturn = null;
      session = null;
      return ctx.navigate("homebrew-editor", { id, tab: "identity" });
    }
    case "import-example":
      ui.importText = D.EXAMPLE_CSV;
      ui.importChecked = null;
      return ctx.render();
    case "import-download": {
      const url = URL.createObjectURL(new Blob([D.EXAMPLE_CSV + "\n"], { type: "text/csv" }));
      const anchor = globalThis.document.createElement("a");
      anchor.href = url;
      anchor.download = "d20-mostri-esempio.csv";
      anchor.click();
      return URL.revokeObjectURL(url);
    }
    case "import-check":
      ui.importText = form ? String(form.get("text") ?? "") : ui.importText;
      ui.importChecked = D.checkMonsterRows(D.monsterRowsFrom(ui.importText));
      return ctx.render();
    case "import-apply": {
      const checked = ui.importChecked ?? [];
      let refs;
      run(
        ctx,
        t("Mostri importati nella Biblioteca", "Monsters imported into the Library"),
        (draft) => (refs = D.importMonsters(draft, checked, ctx.role)),
        privateCommit,
      );
      const errors = checked.filter((r) => r.errors.length);
      ui.importChecked = errors.length ? errors : null;
      if (!errors.length) ui.importText = "";
      ctx.toast(
        t(
          `${refs.length === 1 ? "Importato 1 mostro" : `Importati ${refs.length} mostri`}${errors.length ? `; ${errors.length === 1 ? "1 riga resta" : `${errors.length} righe restano`} da correggere` : ""}.`,
          `Imported ${refs.length} monster${refs.length === 1 ? "" : "s"}${errors.length ? `; ${errors.length} row${errors.length === 1 ? "" : "s"} still to fix` : ""}.`,
        ),
      );
      return ctx.render();
    }
    case "safe-mode":
      run(
        ctx,
        d.disabled === "true"
          ? t("Homebrew disattivato per la campagna", "Homebrew disabled for the campaign")
          : t("Homebrew riattivato per la campagna", "Homebrew re-enabled for the campaign"),
        (draft, sl) => D.setHomebrewDisabled(draft, sl, d.disabled === "true", ctx.role),
      );
      return;
    case "toggle-content":
      run(
        ctx,
        d.disabled === "true"
          ? t("Voce homebrew disattivata", "Homebrew entry disabled")
          : t("Voce homebrew riattivata", "Homebrew entry re-enabled"),
        (draft, sl) => D.setContentDisabled(draft, sl, d.content, d.disabled === "true", ctx.role),
      );
      return;
    case "culprit-start":
      run(ctx, t("Ricerca del colpevole iniziata", "Culprit search started"), (draft, sl) =>
        D.startCulprit(draft, sl, ctx.role),
      );
      return;
    case "culprit-answer":
      run(
        ctx,
        t("Ricerca del colpevole: risposta registrata", "Culprit search: answer recorded"),
        (draft, sl) => D.answerCulprit(draft, sl, d.persists === "true", ctx.role),
      );
      return;
    case "culprit-end":
      run(ctx, t("Ricerca del colpevole conclusa", "Culprit search closed"), (draft, sl) =>
        D.endCulprit(draft, sl, { keepDisabled: d.keep === "true" }, ctx.role),
      );
      return;
    case "add-structured": {
      const actor = ctx.state.actors[d.actor];
      const options = usableStructured(ctx, actor);
      return ctx.dialog(
        t("Aggiungi homebrew alla scheda", "Add homebrew to the sheet"),
        options.length
          ? `<fieldset class="hbe-choice"><legend>${t("Contenuti leggibili con comportamento strutturato", "Readable content with structured behaviour")}</legend>${options.map((o, i) => `<label class="hbe-check"><input type="radio" name="pick" value="${i}" ${o.canUse ? "" : `disabled aria-describedby="hbe-pick-why-${i}"`}> ${lbl(ctx, o.name)} · ${esc(ctx, typeName(ctx, o.type))}${o.canUse ? "" : ` (<span id="hbe-pick-why-${i}">${t("non abilitato in campagna o non condiviso: condividilo e fallo abilitare dal DM", "not enabled in the campaign or not shared: share it and have the DM enable it")}</span>)`}</label>`).join("")}</fieldset>`
          : `<p>${t("Nessun contenuto disponibile: creane uno in Biblioteca → Le mie creazioni.", "No content available: create one in Library → My creations.")}</p>`,
        {
          submitLabel: t("Continua", "Continue"),
          onSubmit: (f) => {
            const o = options[Number(f.get("pick"))];
            if (!o) throw D.refusal("Scegli un contenuto.", "Choose content.");
            applySheetDialog(ctx, o.ref, actor.id);
          },
        },
      );
    }
    case "complete-choices": {
      const actor = ctx.state.actors[d.actor];
      const row = D.unconnectedRows(ctx.state, slice(ctx.state), d.actor, ctx.role).find(
        (r) => r.rowId === d.row,
      );
      if (!row) throw D.refusal("Riga non trovata.", "Row not found.");
      return ctx.dialog(
        t("Completa le scelte", "Complete the choices"),
        choicesForm(ctx, row.structured) ||
          `<p>${t("Nessuna scelta: attiva solo gli effetti.", "No choice: only turns on the effects.")}</p>`,
        {
          submitLabel: t("Attiva gli effetti", "Turn on the effects"),
          onSubmit: (f) =>
            run(
              ctx,
              t("Scelte homebrew completate", "Homebrew choices completed"),
              (draft, sl) =>
                D.adoptSheetRow(
                  draft,
                  sl,
                  { actorId: d.actor, rowId: d.row, choices: choicesFrom(row.structured, f) },
                  ctx.role,
                ),
              commitOptionsFor(actor),
            ),
        },
      );
    }
    case "remove-entry": {
      const actor = ctx.state.actors[d.actor];
      run(
        ctx,
        t(`Homebrew rimosso da ${actor.name}`, `Homebrew removed from ${actor.name}`),
        (draft, sl) => D.removeFromSheet(draft, sl, { actorId: d.actor, rowId: d.row }, ctx.role),
        commitOptionsFor(actor),
      );
      return;
    }
    case "choose-subclass": {
      const actor = ctx.state.actors[d.actor];
      const options = D.subclassCandidates(ctx.state, d.actor, ctx.role);
      if (form) {
        const o = options[Number(form.get("pick"))];
        if (!o) throw D.refusal("Scegli una sottoclasse.", "Choose a subclass.");
        run(
          ctx,
          t(
            `${actor.name} sceglie la sottoclasse ${pick(o.name, "it")}`,
            `${actor.name} chooses the ${pick(o.name, "en")} subclass`,
          ),
          (draft, sl) => D.chooseSubclass(draft, sl, { actorId: d.actor, ref: o.ref }, ctx.role),
          commitOptionsFor(actor),
        );
        return;
      }
      return ctx.dialog(
        t("Scegli la sottoclasse", "Choose the subclass"),
        `<fieldset class="hbe-choice"><legend>${t("Sottoclassi homebrew della classe", "Homebrew subclasses of the class")}</legend>${options.map((o, i) => `<label class="hbe-check"><input type="radio" name="pick" value="${i}" ${o.canUse ? "" : `disabled aria-describedby="hbe-sub-why-${i}"`}> ${lbl(ctx, o.name)}${o.canUse ? "" : ` (<span id="hbe-sub-why-${i}">${t("non utilizzabile qui: condividila e falla abilitare dal DM", "not usable here: share it and have the DM enable it")}</span>)`}</label>`).join("")}</fieldset>`,
        {
          submitLabel: t("Scegli", "Choose"),
          onSubmit: (f) => handleAction(ctx, "choose-subclass", d, f),
        },
      );
    }
    case "apply-advancement": {
      const actor = ctx.state.actors[d.actor];
      const due = D.pendingAdvancement(ctx.state, slice(ctx.state), d.actor);
      const needsInput = due.some((a) => a.type === "asi" || a.type === "choice");
      const collect = (f) => ({
        asi: Object.fromEntries(
          due
            .filter((a) => a.type === "asi")
            .map((a) => [
              a.id,
              Object.fromEntries(
                D.ABILITIES.map((k) => [k, Number(f?.get(`asi-${a.id}-${k}`) ?? 0)]).filter(
                  ([, v]) => v,
                ),
              ),
            ]),
        ),
        choices: Object.fromEntries(
          due
            .filter((a) => a.type === "choice")
            .map((a) => [a.id, String(f?.get(`choice-${a.id}`) ?? "")]),
        ),
      });
      const apply = (f) => {
        const input = collect(f);
        run(
          ctx,
          t(`Avanzamento applicato a ${actor.name}`, `Advancement applied to ${actor.name}`),
          (draft, sl) => D.applyAdvancement(draft, sl, { actorId: d.actor, ...input }, ctx.role),
          commitOptionsFor(actor),
        );
        ctx.toast(
          t(
            "Avanzamento applicato: privilegi aggiunti alle Capacità.",
            "Advancement applied: features added to Features.",
          ),
        );
      };
      if (!needsInput && !form) return apply(null);
      if (form) return apply(form);
      return ctx.dialog(
        t("Applica avanzamento", "Apply advancement"),
        due
          .map((a) =>
            a.type === "asi"
              ? `<fieldset class="hbe-choice"><legend>${t("Livello", "Level")} ${a.level}: ${t(`distribuisci ${a.asi.points} punti`, `assign ${a.asi.points} points`)}</legend>${D.ABILITIES.map((k) => `<label class="field">${lbl(ctx, D.ABILITY_SHORT[k])}<input type="number" min="0" max="2" value="0" name="asi-${esc(ctx, a.id)}-${k}"></label>`).join("")}</fieldset>`
              : a.type === "choice"
                ? `<fieldset class="hbe-choice"><legend>${t("Livello", "Level")} ${a.level}: ${lbl(ctx, a.choice.name)}</legend>${a.choice.from.map((f) => `<label class="hbe-check"><input type="radio" name="choice-${esc(ctx, a.id)}" value="${esc(ctx, f.id)}"> ${lbl(ctx, f.name)}</label>`).join("")}</fieldset>`
                : `<p>${t("Livello", "Level")} ${a.level}: ${advText(ctx, a)}</p>`,
          )
          .join(""),
        {
          submitLabel: t("Applica", "Apply"),
          onSubmit: (f) => handleAction(ctx, "apply-advancement", d, f),
        },
      );
    }
    case "undo":
      return ctx.undo();
    case "use":
      return useDialog(ctx, d.actor, d.content, d.activity);
    case "roll-save":
      return rollSave(ctx, d.use, d.target);
    case "roll-use":
      return rollUse(ctx, d.use, Number(d.roll));
    case "activate-timed":
    case "end-timed": {
      const actor = ctx.state.actors[d.actor];
      return run(
        ctx,
        action === "activate-timed"
          ? t(`Effetto attivato su ${actor?.name}`, `Effect started on ${actor?.name}`)
          : t(`Effetto terminato su ${actor?.name}`, `Effect ended on ${actor?.name}`),
        (draft, sl) =>
          (action === "activate-timed" ? D.activateTimed : D.endTimed)(
            draft,
            sl,
            { actorId: d.actor, rowId: d.row },
            ctx.role,
          ),
        commitOptionsFor(actor),
      );
    }
    case "add-campaign-content": {
      // CA-72 (DDB Content Management, FG module Allow with version): pick an exact
      // revision to enable; sharing it with the players is offered in the same step.
      const enabled = ctx.state.campaign.enabledContent ?? [];
      const options = hb.listHomebrew(ctx.state, ctx.role).flatMap((e) =>
        e.revisions.map((r, i) => ({
          value: JSON.stringify({ contentId: e.id, revisionId: r.id }),
          label: `${ctx.label(r.name ?? e.name) || t("Senza nome", "Unnamed")} · ${typeName(ctx, e.type)} · ${t("rev.", "rev.")} ${i + 1}`,
          on: enabled.some((x) => x.contentId === e.id && x.revisionId === r.id),
        })),
      );
      if (!options.some((o) => !o.on))
        throw D.refusal(
          "Nessun contenuto da aggiungere: crealo in Biblioteca › Crea contenuto.",
          "No content to add: create it in Library › Create content.",
        );
      return ctx.dialog(
        t("Aggiungi contenuto alla campagna", "Add content to the campaign"),
        `<label class="field">${t("Contenuto e revisione", "Content and revision")}<select name="ref">${options.map((o) => `<option value="${esc(ctx, o.value)}" ${o.on ? "disabled" : ""}>${esc(ctx, o.label)}${o.on ? ` (${t("già abilitata", "already enabled")})` : ""}</option>`).join("")}</select></label><label class="hbe-check"><input type="checkbox" name="share" checked> ${t("Condividi in lettura con i giocatori", "Share read access with the players")}</label><p class="muted">${t("La campagna usa esattamente questa revisione; una versione successiva va abilitata a parte.", "The campaign uses exactly this revision; a later version is enabled separately.")}</p>`,
        {
          submitLabel: t("Abilita in campagna", "Enable in the campaign"),
          onSubmit: (f) => {
            const ref = JSON.parse(String(f.get("ref") ?? "{}"));
            run(
              ctx,
              t("Contenuto abilitato in campagna", "Content enabled in the campaign"),
              (draft) => {
                const rev = hb.getHomebrewRevision(draft, ref, ctx.role);
                if (f.get("share") && rev.owner === ctx.role && rev.permissions.canShare) {
                  const access = rev.access ?? { readers: [], editors: [] };
                  hb.shareHomebrewRevision(
                    draft,
                    ref,
                    {
                      readers: [...new Set([...access.readers, "player"])],
                      editors: access.editors,
                    },
                    ctx.role,
                  );
                }
                hb.enableHomebrewRevision(draft, ref, { enabled: true }, ctx.role);
              },
            );
            ctx.toast(t("Abilitata in campagna.", "Enabled in the campaign."));
          },
        },
      );
    }
    case "review-update":
      // The Library's compare-and-apply page for this exact sheet copy.
      return ctx.navigate("library", {
        id: d.content,
        revision: d.revision,
        tab: "personal",
        returnTo: JSON.stringify({
          page: "characters",
          actorId: d.actor,
          tab: d.kind,
          instanceId: d.row,
        }),
      });
    case "refresh-entry": {
      const actor = ctx.state.actors[d.actor];
      const stale = D.staleEntries(ctx.state, slice(ctx.state), d.actor).find(
        (e) => e.rowId === d.row,
      );
      if (!stale)
        throw D.refusal("Voce non trovata sulla scheda.", "Entry not found on the sheet.");
      const next = readable(ctx, stale.toRef)?.data.structured;
      const follow = (choices) =>
        run(
          ctx,
          t(
            `Effetti di ${pick(stale.name, "it")} aggiornati su ${actor.name}`,
            `${pick(stale.name, "en")} effects updated on ${actor.name}`,
          ),
          (draft, sl) =>
            D.refreshEntry(draft, sl, { actorId: d.actor, rowId: d.row, choices }, ctx.role),
          commitOptionsFor(actor),
        );
      // Earlier choices still offered by the new revision are kept; otherwise ask again.
      if (!D.validateChoices(next, stale.choices ?? {}).length) return follow(null);
      return ctx.dialog(
        t("Scegli di nuovo", "Choose again"),
        `<p>${t("La nuova revisione ha scelte diverse.", "The new revision has different choices.")}</p>${choicesForm(ctx, next)}`,
        {
          submitLabel: t("Aggiorna gli effetti", "Update the effects"),
          onSubmit: (f) => follow(choicesFrom(next, f)),
        },
      );
    }
    default:
      return undefined;
  }
}
function currentRef(ctx) {
  const summary = hb.listHomebrew(ctx.state, ctx.role).find((e) => e.id === ctx.view.id);
  if (!summary) throw D.refusal("Contenuto non disponibile.", "Content unavailable.");
  return {
    contentId: ctx.view.id,
    revisionId: summary.revisions.some((r) => r.id === ctx.view.revision)
      ? ctx.view.revision
      : summary.latestRef.revisionId,
  };
}

// ---------------------------------------------------------------- binding

// One entry point for a field edit (bound inputs and tests): the unsaved working copy.
export function setField(path, value) {
  if (!session) return false;
  setPath(session.data, path, value);
  session.dirty = true;
  return true;
}
export const editorData = () => (session ? copy(session.data) : null);
function readInput(input) {
  const kind = input.dataset.hbeKind;
  if (kind === "bool") return input.checked;
  if (kind === "number" || input.type === "number")
    return input.value.trim() === "" ? null : Number(input.value);
  return input.value;
}
// Controls redraw the page; focus returns to the same control (or its successor after
// Tab), so keyboard users keep their place.
function focusKey(el) {
  if (!el?.dataset) return null;
  const esc_ = (v) => globalThis.CSS?.escape?.(v) ?? String(v).replace(/"/g, '\\"');
  const keys = Object.keys(el.dataset).filter(
    (k) =>
      k.startsWith("hbe") ||
      [
        "group",
        "rule",
        "option",
        "choice",
        "mod",
        "activity",
        "activityId",
        "pane",
        "adv",
        "feature",
        "section",
        "block",
        "subform",
        "kind",
        "actor",
        "content",
        "target",
        "use",
        "path",
        "persists",
        "keep",
        "decision",
        "stars",
        "roll",
        "row",
      ].includes(k),
  );
  if (!keys.length) return null;
  const value = ["radio", "checkbox"].includes(el.type) ? `[value="${esc_(el.value)}"]` : "";
  return (
    keys
      .map(
        (k) =>
          `[data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${esc_(el.dataset[k])}"]`,
      )
      .join("") + value
  );
}
function restoreFocus(key) {
  if (!key || globalThis.document?.querySelector("#dialog")?.open) return;
  const el = globalThis.document?.querySelector(`#content ${key}`);
  if (el && el !== globalThis.document.activeElement) {
    el.focus({ preventScroll: true });
    // Like a Tab focus: the value is selected, so typing replaces it.
    if (["text", "number", "search"].includes(el.type)) el.select?.();
  }
}
// Redraws only the preview and the test sheet (never the form being typed in).
function refreshSide(ctx) {
  setTimeout(() => {
    const side = globalThis.document?.querySelector("#content .hbe-side");
    if (!side || !session) return rerenderKeepingFocus(ctx);
    const key = focusKey(globalThis.document.activeElement);
    const inSide = side.contains(globalThis.document.activeElement);
    side.innerHTML =
      renderPreview(ctx, session.type, session.data) + renderTest(ctx, session.type, session.data);
    bindControls(side, ctx);
    if (inSide) restoreFocus(key);
  }, 0);
}
function rerenderKeepingFocus(ctx) {
  setTimeout(() => {
    const key = focusKey(globalThis.document?.activeElement);
    ctx.render();
    restoreFocus(key);
  }, 0);
}
let pendingFocus = null;
export function bindArea(root, ctx) {
  bindControls(root, ctx);
  // One try, on the first bind after the change (the whole page is drawn by then).
  if (pendingFocus && !globalThis.document?.querySelector("#dialog")?.open) {
    const key = pendingFocus;
    pendingFocus = null;
    restoreFocus(key);
  }
  root
    .querySelectorAll("[data-hbe-form]")
    .forEach((form) => (form.onsubmit = (event) => event.preventDefault()));
  root
    .querySelector("[data-hbe-import-text]")
    ?.addEventListener("input", (event) => (ui.importText = event.target.value));
  root.querySelector("[data-hbe-import-file]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024)
      return ctx.toast(ctx.t("Scegli un file sotto 1 MB.", "Choose a file under 1 MB."), true);
    ui.importText = await file.text();
    ui.importChecked = null;
    ctx.render();
  });
  root
    .querySelector("[data-hbe-revision]")
    ?.addEventListener("change", (event) =>
      ctx.navigate("homebrew-editor", { id: ctx.view.id, revision: event.target.value }),
    );
  // On a phone the sub-forms are a sideways strip: keep the open one in view.
  scrollIntoStrip(root.querySelector(".hbe-subforms"), root.querySelector(".hbe-subforms .active"));
}
function bindControls(root, ctx) {
  root.querySelectorAll("[data-hbe]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const d = { ...button.dataset };
      if (d.hbe === "add-activity") d.type = root.querySelector("[data-hbe-new-activity]")?.value;
      if (d.hbe === "add-advancement") {
        d.type = root.querySelector("[data-hbe-new-advancement]")?.value;
        d.level = root.querySelector("[data-hbe-new-advancement-level]")?.value;
      }
      if (d.hbe === "add-scale-level")
        d.level = root.querySelector(`[data-hbe-scale-level="${d.adv}"]`)?.value;
      if (d.hbe === "apply-preset") d.preset = root.querySelector("[data-hbe-preset]")?.value;
      const form = d.hbe === "import-check" ? new FormData(button.closest("form")) : null;
      const key = focusKey(button);
      // A sub-form or page change renders after the hash change: the next bind restores it.
      pendingFocus = key;
      safely(ctx, () => handleAction(ctx, d.hbe, d, form));
      restoreFocus(key);
    });
  });
  // Activity tabs follow the ARIA tabs keys (arrows, Home, End), as the compendium's do.
  root.querySelectorAll('[data-hbe="activity-tab"]').forEach((tab) =>
    tab.addEventListener("keydown", (event) => {
      const tabs = [...tab.parentElement.querySelectorAll('[data-hbe="activity-tab"]')];
      const i = tabs.indexOf(tab);
      const next = {
        ArrowRight: tabs[(i + 1) % tabs.length],
        ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
        Home: tabs[0],
        End: tabs.at(-1),
      }[event.key];
      if (!next) return;
      event.preventDefault();
      next.click();
    }),
  );
  // BI-15: what the one «Salva» also does (share, enable), kept per draft for this visit.
  root.querySelectorAll("[data-hbe-publish]").forEach((input) =>
    input.addEventListener("change", () => {
      if (!session) return;
      (ui.publish[session.id] ??= { share: false, enable: false })[input.dataset.hbePublish] =
        input.checked;
    }),
  );
  root.querySelectorAll("[data-hbe-path]").forEach((input) => {
    const update = () => {
      if (!setField(input.dataset.hbePath, readInput(input))) return;
      const status = root.querySelector("[data-hbe-status]");
      if (status)
        status.textContent = ctx.t(
          "Modifiche non salvate · bozza privata",
          "Unsaved changes · private draft",
        );
      // The heading follows the name as it is typed (the form itself is not redrawn).
      const heading = root.querySelector("[data-hbe-editor] .hbe-heading h1");
      if (heading && input.dataset.hbePath.startsWith("name."))
        heading.textContent = nameOf(ctx, session.data.name);
    };
    const structural = input.tagName === "SELECT" || input.type === "checkbox";
    if (!structural) input.addEventListener("input", update);
    // A choice reshapes the form (activity type, sections): redraw it; typed text only
    // refreshes the preview and the test sheet, never the field being typed in.
    input.addEventListener("change", () => {
      update();
      if (structural) rerenderKeepingFocus(ctx);
      else refreshSide(ctx);
    });
  });
  root.querySelectorAll("[data-hbe-array]").forEach((input) =>
    input.addEventListener("change", () => {
      if (!session) return;
      const current = new Set(getPath(session.data, input.dataset.hbeArray) ?? []);
      if (input.checked) current.add(input.value);
      else current.delete(input.value);
      setPath(session.data, input.dataset.hbeArray, [...current]);
      session.dirty = true;
      ctx.render();
    }),
  );
  // Test sheet: fictitious values, redrawn on change (never committed).
  root.querySelectorAll("[data-hbe-test-from]").forEach((el) =>
    el.addEventListener("change", (event) => {
      const actor = ctx.state.actors[event.target.value];
      if (actor)
        ui.test = {
          ...D.sheetOf(actor),
          name: ctx.t("Scheda di prova", "Test sheet"),
          from: actor.id,
        };
      refreshSide(ctx);
    }),
  );
  root.querySelectorAll("[data-hbe-test]").forEach((input) =>
    input.addEventListener("change", () => {
      const sheet = testSheetValues(ctx);
      const key = input.dataset.hbeTest;
      if (key === "classId") sheet.classIds = [input.value];
      else if (key === "level") {
        sheet.level = Number(input.value) || 1;
        sheet.proficiencyBonus = D.proficiencyFor(sheet.level);
      } else if (key === "ac") sheet.ac = Number(input.value) || 0;
      else sheet.abilities[key] = Number(input.value) || 0;
      refreshSide(ctx);
    }),
  );
  root.querySelectorAll("[data-hbe-test-choice]").forEach((input) =>
    input.addEventListener("change", () => {
      const id = input.dataset.hbeTestChoice;
      const picked = [
        ...root.querySelectorAll(`[data-hbe-test-choice="${CSS.escape(id)}"]:checked`),
      ].map((x) => x.value);
      ui.testChoices[id] = picked;
      refreshSide(ctx);
    }),
  );
  root.querySelectorAll("[data-hbe-forge]").forEach((input) =>
    input.addEventListener("change", () => {
      ui.forge[input.dataset.hbeForge] = input.value;
      rerenderKeepingFocus(ctx);
    }),
  );
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStateSlice(D.ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: D.seedRolls,
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./homebrew-editor.css", import.meta.url));
  registry.add("library-section", {
    id: D.ID,
    label: L("Le mie creazioni", "My creations"),
    description: L("Editor homebrew profondo", "Deep homebrew editor"),
    order: 20,
    render: renderHub,
    bind: bindArea,
  });
  registry.add("route", {
    id: D.ID,
    label: L("Editor homebrew", "Homebrew editor"),
    icon: "pen",
    render: renderRoute,
    bind: bindArea,
  });
  registry.add("campaign-section", {
    id: D.ID,
    group: "play",
    label: L("Homebrew", "Homebrew"),
    order: 68,
    render: renderCampaignSection,
    bind: bindArea,
  });
  registry.add("sheet-section", {
    id: `${D.ID}-features`,
    label: L("Homebrew strutturato", "Structured homebrew"),
    tab: "features",
    render: renderSheetFeatures,
    bind: bindArea,
  });
  registry.add("sheet-section", {
    id: `${D.ID}-actions`,
    label: L("Attività homebrew", "Homebrew activities"),
    tab: "actions",
    render: renderSheetActions,
    bind: bindArea,
  });
  registry.add("table-panel", {
    id: `${D.ID}-inspector`,
    label: L("Homebrew", "Homebrew"),
    placement: "inspector",
    order: 25,
    when: tablePanelVisible,
    render: renderTablePanel,
    bind: bindArea,
  });
  registry.add("notifications", {
    id: `${D.ID}-requests`,
    label: L("Richieste homebrew", "Homebrew requests"),
    collect: (ctx) => [
      ...Object.keys(slice(ctx.state).sheets ?? {})
        // The character's owner is reminded (as the bell routes requests), not every
        // identity that could control the sheet.
        .filter(
          (id) =>
            ctx.state.actors[id] &&
            (ctx.state.actors[id].owner ?? "dm") === ctx.role &&
            canControlActor(ctx.state.actors[id], ctx.role, ctx.state),
        )
        .flatMap((id) => {
          const due = D.pendingAdvancement(ctx.state, slice(ctx.state), id);
          if (!due.length) return [];
          const name = ctx.state.actors[id].name;
          const levels = [...new Set(due.map((a) => a.level))].join(", ");
          return [
            {
              id: `${D.ID}-advancement-${id}-${due.map((a) => a.id).join("-")}`.slice(0, 190),
              title: L(
                `Avanzamento da applicare: ${name} (livello ${levels})`,
                `Advancement to apply: ${name} (level ${levels})`,
              ),
              body: L(
                `${pick(D.subclassOf(slice(ctx.state), id).name, "it")}: Capacità → Homebrew strutturato.`,
                `${pick(D.subclassOf(slice(ctx.state), id).name, "en")}: Features → Structured homebrew.`,
              ),
              category: "reminders",
              target: { page: "characters", params: { id, tab: "features" } },
            },
          ];
        }),
      // BI-16 (DDB update notice): a newer revision of homebrew on the owner's sheet.
      ...Object.values(ctx.state.actors ?? {})
        .filter(
          (actor) =>
            (actor.owner ?? "dm") === ctx.role && canControlActor(actor, ctx.role, ctx.state),
        )
        .flatMap((actor) =>
          D.updatesFor(ctx.state, actor.id, ctx.role).map((u) => ({
            id: `${D.ID}-update-${actor.id}-${u.rowId}-${u.ref.revisionId}`.slice(0, 190),
            title: L(
              `Aggiornamento disponibile: ${pick(u.name, "it")} rev. ${u.to} (${actor.name})`,
              `Update available: ${pick(u.name, "en")} rev. ${u.to} (${actor.name})`,
            ),
            body: L(
              "Rivedi le differenze e applicale dalla scheda.",
              "Review the differences and apply them from the sheet.",
            ),
            category: "reminders",
            target: { page: "characters", params: { id: actor.id, tab: "features" } },
          })),
        ),
      ...D.pendingSavesFor(ctx.state, slice(ctx.state), ctx.role)
        .filter((x) => x.canRoll)
        .map(({ use, target }) => ({
          id: `${D.ID}-save-${use.id}-${target.actorId}`,
          title: L(
            `Tiro salvezza: ${ctx.state.actors[target.actorId]?.name} (${pick(D.abilityName(use.ability), "it")} CD ${use.dc})`,
            `Saving throw: ${ctx.state.actors[target.actorId]?.name} (${pick(D.abilityName(use.ability), "en")} DC ${use.dc})`,
          ),
          body: L(
            `${pick(use.name, "it")} di ${ctx.state.actors[use.actorId]?.name}`,
            `${pick(use.name, "en")} by ${ctx.state.actors[use.actorId]?.name}`,
          ),
          category: "requests",
          target: { page: "table", params: {} },
        })),
      ...D.catalogEntries(ctx.state, slice(ctx.state), ctx.role)
        .filter((e) => e.updateAvailable)
        .map((e) => ({
          id: `${D.ID}-version-${e.contentId}-${e.latest.revisionId}`,
          title: L(
            `Nuova versione v${e.latest.number}: ${pick(e.name, "it")}`,
            `New version v${e.latest.number}: ${pick(e.name, "en")}`,
          ),
          body: L(
            "Scegli se passarci dal catalogo.",
            "Choose whether to move to it from the catalogue.",
          ),
          target: { page: "homebrew-editor", params: { tab: "catalog" } },
        })),
    ],
  });
  registry.add("draft-guard", {
    id: `${D.ID}-draft`,
    label: L("Bozza homebrew", "Homebrew draft"),
    hasDraft: (ctx, next) =>
      Boolean(session?.dirty) &&
      !(
        next?.page === "homebrew-editor" &&
        next?.id === session.id &&
        (!next.role || next.role === session.owner)
      ),
    confirm: (ctx, proceed) => {
      ctx.dialog(
        ctx.t("Conservare la bozza?", "Keep this draft?"),
        `<p>${ctx.t("Hai modifiche non salvate nell’editor homebrew.", "You have unsaved changes in the homebrew editor.")}</p><button type="button" class="button quiet" data-hbe-discard-unsaved>${ctx.t("Scarta le modifiche", "Discard the changes")}</button>`,
        {
          submitLabel: ctx.t("Salva e continua", "Save and continue"),
          cancelLabel: ctx.t("Resta nella bozza", "Stay in the draft"),
          onSubmit: () => {
            persist(ctx);
            proceed();
          },
        },
      );
      globalThis.document
        ?.querySelector("[data-hbe-discard-unsaved]")
        ?.addEventListener("click", () => {
          session = null;
          ctx.closeDialog();
          proceed();
        });
    },
  });
  registry.add("command", {
    id: `${D.ID}.open`,
    label: L("Apri le mie creazioni homebrew", "Open my homebrew creations"),
    run: (ctx) => ctx.navigate("library", { tab: D.ID }),
  });
  // BI-15/BI-23/BI-24: the one «Crea contenuto» (the Library's button runs this command).
  registry.add("command", {
    id: `${D.ID}.create`,
    label: L("Crea contenuto homebrew…", "Create homebrew content…"),
    description: L(
      "Crea talento, incantesimo, mostro o creatura (blocco statistiche), oggetto magico con la Forgia (+1, +2, +3), sottoclasse, classe, specie, background, capacità, oggetto, condizione",
      "Create a feat, spell, monster or creature (stat block), magic item with the Forge (+1, +2, +3), subclass, class, species, background, feature, item, condition",
    ),
    group: "library",
    run: (ctx, options = {}) => createDialog(ctx, options ?? {}),
  });
  // CA-72 (DDB Content Management): the Library's «Campagna» tab and the palette enable an
  // exact revision in the campaign.
  registry.add("command", {
    id: `${D.ID}.add-campaign-content`,
    label: L("Aggiungi contenuto alla campagna…", "Add content to the campaign…"),
    description: L(
      "Abilita in campagna una revisione homebrew precisa (talento, incantesimo, oggetto, mostro) e condividila con i giocatori",
      "Enable an exact homebrew revision in the campaign (feat, spell, item, monster) and share it with the players",
    ),
    group: "library",
    roles: ["dm"],
    run: (ctx) => handleAction(ctx, "add-campaign-content"),
  });
  registry.add("command", {
    id: `${D.ID}.forge`,
    label: L("Forgia un oggetto magico…", "Forge a magic item…"),
    description: L(
      "Arma o armatura +1, +2, +3 da un oggetto di base SRD (spada lunga +1, cotta di maglia +1)",
      "Weapon or armor +1, +2, +3 from an SRD base item (longsword +1, chain mail +1)",
    ),
    group: "library",
    run: (ctx, options = {}) => {
      if (options?.baseId && D.forgeBases().some((b) => b.id === options.baseId)) {
        ui.forge.baseId = options.baseId;
        ui.forge.templateId = D.forgeTemplatesFor(options.baseId)[0]?.id ?? "";
      }
      ctx.navigate("homebrew-editor", { tab: "forge" });
    },
  });
  registry.add("search", {
    id: `${D.ID}-search`,
    label: L("Creazioni homebrew", "Homebrew creations"),
    search: (ctx, query) => {
      const q = String(query ?? "")
        .toLocaleLowerCase()
        .trim();
      if (!q) return [];
      return hb
        .listHomebrew(ctx.state, ctx.role)
        .filter((e) => `${e.name?.it ?? ""} ${e.name?.en ?? ""}`.toLocaleLowerCase().includes(q))
        .slice(0, 20)
        .map((e) => ({
          title: copy(e.name),
          excerpt: copy(
            hb.getHomebrewTypes().find((x) => x.id === e.type)?.name ?? L(e.type, e.type),
          ),
          page: "homebrew-editor",
          params: { id: e.id, revision: e.latestRef.revisionId },
        }));
    },
  });
  // A role change or Reset example drops the unsaved working copy of the other identity.
  registry.on("role-changed", () => resetView());
  registry.on("reset", () => resetView());
  // BI-20: timed modifiers end at their turn anchors inside the combat transaction, and at
  // their rest anchors right after the rest.
  if (!turnObserverSet) {
    observeTurnPhases((state, { actorId, phase, turnKey }) => {
      const sl = state.ext?.[D.ID];
      if (sl) D.expireTimedOnTurn(state, sl, { actorId, phase, turnKey });
    });
    turnObserverSet = true;
  }
  registry.on("rest-completed", (payload, { ctx } = {}) => {
    if (!ctx || !payload?.actorId) return;
    const kind =
      (ctx.state.restTime?.rests ?? []).find((r) => r.id === payload.restId)?.kind ?? payload.kind;
    const sl = ctx.state.ext?.[D.ID];
    if (!sl || !D.timedEndingOnRest(sl, { actorId: payload.actorId, kind })) return;
    setTimeout(() =>
      safely(ctx, () =>
        run(
          ctx,
          ctx.t("Effetti a tempo terminati con il riposo", "Timed effects ended with the rest"),
          (draft, s) => D.expireTimedOnRest(draft, s, { actorId: payload.actorId, kind }),
          commitOptionsFor(ctx.state.actors[payload.actorId]),
        ),
      ),
    );
  });
  // BI-16: a Library add or update carries the row's structured behaviour in the same change.
  setStructuredFollow((state, result, role) => {
    const sl = state.ext?.[D.ID];
    if (sl && result?.actorId && result.instanceId)
      D.followLibraryRow(state, sl, { actorId: result.actorId, rowId: result.instanceId }, role);
  });
}
