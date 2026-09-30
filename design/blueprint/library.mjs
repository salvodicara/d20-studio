import * as hb from "./homebrew.mjs";
import * as D from "./homebrew-editor-domain.mjs";
import * as compendium from "./compendium.mjs";
import * as srdData from "./srd-compendium.mjs";
import { searchPackEntries } from "./compat-packs.mjs";
import { scrollIntoStrip } from "./ui.mjs";

let session = null;
let importError = "";
let importGeneration = 0;
let contextualFilter = null;
const filterCache = new Map();
const privateCommit = { local: true, visibility: "private" };
const clone = (value) => structuredClone(value);
const uid = () => crypto.randomUUID();
const message = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message || error || "");
const draftKinds = {
  create: ["Crea contenuto", "Create content"],
  duplicate: ["Copia indipendente", "Independent copy"],
  revise: ["Nuova revisione", "New revision"],
  assign: ["Aggiungi alla scheda", "Add to sheet"],
  update: ["Confronta aggiornamento", "Compare update"],
  import: ["Importa contenuti", "Import content"],
};
function safely(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(message(ctx, error), true);
    return false;
  }
}
function returnContext(ctx, value = ctx.view.returnTo) {
  try {
    const target = typeof value === "string" ? JSON.parse(value) : value;
    if (
      target?.page === "builder" &&
      typeof target.draftId === "string" &&
      typeof target.section === "string"
    )
      return {
        page: "builder",
        draftId: target.draftId,
        section: target.section,
        ...(target.grantId ? { grantId: target.grantId } : {}),
        ...(target.targetKind ? { targetKind: target.targetKind } : {}),
        ...(Number.isInteger(target.row) ? { row: target.row } : {}),
      };
    if (target?.page === "characters" && typeof target.actorId === "string")
      return {
        page: "characters",
        actorId: target.actorId,
        tab: target.tab || "actions",
        ...(typeof target.instanceId === "string" ? { instanceId: target.instanceId } : {}),
      };
  } catch {}
  return null;
}
function routeContext(ctx, target = returnContext(ctx)) {
  return target ? { returnTo: JSON.stringify(target) } : {};
}
// PG-06: a builder class, species or background choice accepts content of that type.
const ORIGIN_TYPES = ["class", "species", "background"];
function targetKindFor(target) {
  if (target?.page === "builder" && ORIGIN_TYPES.includes(target.targetKind))
    return target.targetKind;
  const section = target?.page === "builder" ? target.section : target?.tab;
  return (
    { features: "features", spells: "spells", equipment: "inventory", inventory: "inventory" }[
      section
    ] ||
    (["features", "spells", "inventory"].includes(target?.targetKind) ? target.targetKind : null)
  );
}
function contentTargetKind(type) {
  return hb.getHomebrewTypes().find((entry) => entry.id === type)?.targetKind;
}
// The choice a content type fills: its sheet section, or its own type for builder origins.
const fitsChoice = (type, kind) =>
  ORIGIN_TYPES.includes(kind) ? type === kind : contentTargetKind(type) === kind;
function contextualChoices(ctx) {
  const target = returnContext(ctx),
    key = JSON.stringify([ctx.role, target]);
  if (contextualFilter?.key !== key) contextualFilter = { key, onlyCompatible: true };
  return { ...contextualFilter, target, kind: targetKindFor(target) };
}
function incompatibleReason(ctx, type, target) {
  const expected = targetKindFor(target);
  return (target && !contentTargetKind(type) && !ORIGIN_TYPES.includes(expected)) ||
    (expected && !fitsChoice(type, expected))
    ? ctx.t(
        "Questo contenuto non può essere usato in questa sezione. Scegli un contenuto compatibile o torna alla scheda.",
        "This content cannot be used in this section. Choose compatible content or return to the sheet.",
      )
    : null;
}
function checkedChoiceTarget(ctx, revision) {
  const target = returnContext(ctx);
  const reason = incompatibleReason(ctx, revision.type, target);
  if (!target || reason)
    throw new Error(
      reason ||
        ctx.t("La destinazione non è più disponibile.", "The destination is no longer available."),
    );
  return target;
}
function renderContext(ctx, collection = false) {
  const { target, kind, onlyCompatible } = contextualChoices(ctx);
  if (!target) return "";
  const label =
    {
      spells: ctx.t("magie", "spells"),
      inventory: ctx.t("oggetti", "items"),
      class: ctx.t("classi", "classes"),
      species: ctx.t("specie", "species"),
      background: ctx.t("background", "backgrounds"),
    }[kind] ?? ctx.t("capacità", "features");
  return `<div class="library-context">${collection && kind ? `<label class="library-check"><input type="checkbox" data-library-context-only ${onlyCompatible ? "checked" : ""}>${ctx.t("Mostra solo contenuti per ", "Show only content for ") + label}</label><p class="muted">${ctx.t("Disattiva il filtro per consultare anche gli altri tipi.", "Turn off this filter to browse other types too.")}</p>` : ""}<button type="button" class="button quiet" data-library-cancel-choice>${target.page === "builder" ? ctx.t("Torna alla bozza senza scegliere", "Return to draft without choosing") : ctx.t("Torna alla scheda senza scegliere", "Return to sheet without choosing")}</button></div>`;
}
// BI-01: each collection keeps its own search, so a search in «Disponibili» does not
// silently filter «Campagna» (DDB My Library keeps one filter per view).
const ORIGINS = ["", "srd", "mine", "shared", "campaign", "favorites"];
function filterKey(ctx) {
  return `${ctx.role}:${currentScope(ctx)}`;
}
function filters(ctx) {
  const key = filterKey(ctx);
  if (!filterCache.has(key)) {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(`d20-library-filters:${key}`));
    } catch {}
    filterCache.set(key, {
      q: typeof saved?.q === "string" ? saved.q : "",
      type: typeof saved?.type === "string" ? saved.type : "",
      language: ["it", "en"].includes(saved?.language) ? saved.language : "",
      origin: ORIGINS.includes(saved?.origin) ? saved.origin : "",
    });
  }
  return filterCache.get(key);
}
function saveFilters(ctx, value) {
  const key = filterKey(ctx);
  filterCache.set(key, value);
  try {
    sessionStorage.setItem(`d20-library-filters:${key}`, JSON.stringify(value));
  } catch {}
}
function currentScope(ctx) {
  return ["available", "personal", "campaign"].includes(ctx.view.tab) ? ctx.view.tab : "available";
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
      data: clone(draft.data),
      dirty: false,
      reviewKey: null,
    };
  return session;
}
function preview(ctx, draft) {
  return hb.previewHomebrewDraft(
    {
      ...ctx.state,
      libraryDrafts: (ctx.state.libraryDrafts || []).map((entry) =>
        entry.id === draft.id ? { ...entry, data: clone(session.data) } : entry,
      ),
    },
    draft.id,
    ctx.role,
  );
}
function persist(ctx) {
  if (!session) return false;
  const snapshot = clone(session);
  session.dirty = false;
  try {
    ctx.commit(
      ctx.t("Bozza della Biblioteca salvata", "Library draft saved"),
      (state) =>
        hb.saveHomebrewDraft(
          state,
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
function markDirty(root, ctx) {
  session.dirty = true;
  session.reviewKey = null;
  const status = root.querySelector("[data-library-status]");
  if (status)
    status.textContent = ctx.t(
      "Modifiche non salvate · bozza privata",
      "Unsaved changes · private draft",
    );
  const apply = root.querySelector("[data-library-apply]");
  if (apply) {
    apply.disabled = true;
    apply.setAttribute?.("aria-describedby", "library-apply-why");
  }
  const why = root.querySelector("#library-apply-why");
  if (why)
    why.textContent = ctx.t(
      "Modifiche non ancora nell’anteprima: premi «Salva bozza e aggiorna anteprima», poi applica.",
      "Changes are not in the preview yet: press “Save draft and update preview”, then apply.",
    );
}
function getPath(data, path) {
  return path.split(".").reduce((value, key) => value?.[key], data);
}
function setPath(data, path, value) {
  const keys = path.split(".");
  if (keys.some((key) => ["__proto__", "prototype", "constructor"].includes(key))) return;
  let parent = data;
  for (let i = 0; i < keys.length - 1; i++)
    parent = parent[keys[i]] ??= /^\d+$/.test(keys[i + 1]) ? [] : {};
  parent[keys.at(-1)] = value;
}
export function hasLibraryDraft() {
  return Boolean(session?.dirty);
}
export function resetLibraryView() {
  importGeneration++;
  session = null;
  importError = "";
  contextualFilter = null;
  // Filters are re-read from this tab's session storage (kept per role and collection).
  filterCache.clear();
}
export function startHomebrew(ctx, options = {}) {
  return safely(ctx, () => {
    const id = uid(),
      target = returnContext(ctx, options.returnTo || returnContext(ctx));
    ctx.commit(
      ctx.t("Bozza privata della Biblioteca iniziata", "Private library draft started"),
      (state) =>
        hb.createHomebrewDraft(
          state,
          {
            ...options,
            id,
            kind: options.kind || "create",
            type: options.type || "feature",
            returnTo: target,
          },
          ctx.role,
        ),
      privateCommit,
    );
    session = null;
    openDraft(ctx, id, options.kind || "create", target);
    return id;
  });
}
// BI-15 (DDB My Creations: one editor): authoring drafts open in the structured editor
// when that area is present; the page here keeps the sheet operations (add, update) and
// imports, and remains the editor when the structured area is not built.
const structuredEditor = (ctx) => Boolean(ctx.registry?.get?.("route", "homebrew-editor", ctx));
function openDraft(ctx, id, kind, target) {
  if (["create", "duplicate", "revise"].includes(kind) && structuredEditor(ctx))
    ctx.navigate("homebrew-editor", { id, tab: "identity" });
  else ctx.navigate("library", { id, tab: "edit", ...routeContext(ctx, target) });
}
export function confirmLibraryNavigation(ctx, callback) {
  if (!session?.dirty) return callback();
  ctx.dialog(
    ctx.t("Conservare la bozza?", "Keep this draft?"),
    `<p>${ctx.t("Puoi salvare anche campi incompleti. Salvare la bozza non concede il contenuto a una scheda.", "You can save incomplete fields. Saving the draft does not grant content to a sheet.")}</p><button type="button" class="button quiet" data-library-discard-unsaved>${ctx.t("Scarta le modifiche non salvate", "Discard unsaved changes")}</button>`,
    {
      submitLabel: ctx.t("Salva e continua", "Save and continue"),
      cancelLabel: ctx.t("Resta nella bozza", "Stay in draft"),
      onSubmit: () => {
        persist(ctx);
        callback();
      },
    },
  );
  globalThis.document
    ?.querySelector("[data-library-discard-unsaved]")
    ?.addEventListener("click", () => {
      session = null;
      ctx.closeDialog();
      callback();
    });
}
function field(ctx, path, label, type = "text", extra = "") {
  return `<label class="field">${ctx.esc(label)}<input type="${type}" data-library-path="${path}" value="${ctx.esc(getPath(session.data, path) ?? "")}" ${extra}></label>`;
}
function textarea(ctx, path, label) {
  return `<label class="field">${ctx.esc(label)}<textarea rows="4" data-library-path="${path}">${ctx.esc(getPath(session.data, path) ?? "")}</textarea></label>`;
}
function select(ctx, path, label, options) {
  const value = getPath(session.data, path);
  return `<label class="field">${ctx.esc(label)}<select data-library-path="${path}">${options.map(([id, name]) => `<option value="${id}" ${value === id ? "selected" : ""}>${ctx.esc(name)}</option>`).join("")}</select></label>`;
}
function checkbox(ctx, path, label) {
  return `<label class="library-check"><input type="checkbox" data-library-path="${path}" ${getPath(session.data, path) ? "checked" : ""}>${ctx.esc(label)}</label>`;
}
function typeName(ctx, type) {
  return ctx.label(hb.getHomebrewTypes().find((entry) => entry.id === type)?.name || type);
}
function revisionDate(ctx, value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime())
    ? ctx.t("Data non disponibile", "Date unavailable")
    : new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
function sourceText(ctx, data) {
  const source = data?.source || {};
  return [
    source.kind === "reconstruction"
      ? ctx.t("Ricostruzione", "Reconstruction")
      : ctx.t("Originale", "Original"),
    source.label,
    source.edition === "unknown" ? ctx.t("Edizione non nota", "Unknown edition") : source.edition,
    source.reference,
  ]
    .filter(Boolean)
    .map(ctx.esc)
    .join(" · ");
}
function issues(ctx, entries = []) {
  return entries.length
    ? `<ul class="library-issues">${entries.map((error) => `<li>${ctx.esc(message(ctx, error))}</li>`).join("")}</ul>`
    : "";
}
function automation(ctx, value) {
  const supported = value?.supported || [],
    manual = value?.manual || [];
  const level = value?.level && D.AUTOMATION_LEVELS[value.level];
  return `<section class="library-automation"><h3>${ctx.t("Cosa fa l’app", "What the app does")}${level ? ` <span class="badge" data-library-automation="${ctx.esc(value.level)}">${ctx.esc(ctx.label(level))}</span>` : ""}</h3>${supported.length ? `<ul>${supported.map((entry) => `<li>${ctx.esc(typeof entry === "string" ? entry : ctx.label(entry.name || entry.label || entry))}</li>`).join("")}</ul>` : `<p>${ctx.t("Consultazione del testo. La descrizione non esegue regole.", "Text reference. The description does not execute rules.")}</p>`}${manual.length ? `<p><strong>${ctx.t("Da gestire manualmente", "Handled manually")}</strong></p><ul>${manual.map((entry) => `<li>${ctx.esc(typeof entry === "string" ? entry : ctx.label(entry.name || entry.label || entry))}</li>`).join("")}</ul>` : ""}${issues(ctx, value?.reasons)}</section>`;
}
function readableDefinition(ctx, data, type) {
  if (!data) return "";
  const resource = data.resource;
  return `<article class="library-readable"><h2>${ctx.esc(ctx.label(data.name) || ctx.t("Contenuto senza nome", "Unnamed content"))}</h2><p class="muted">${ctx.esc(typeName(ctx, type))}</p><p class="library-prose">${ctx.esc(ctx.label(data.description) || ctx.t("Descrizione da completare", "Description to complete"))}</p><p class="library-provenance">${sourceText(ctx, data)}</p>${!(data.name?.it && data.name?.en) ? `<p class="muted">${ctx.t("Una traduzione del nome non è ancora disponibile; viene mostrato l’originale.", "One name translation is not yet available; the original is shown.")}</p>` : ""}${type === "spell" ? `<p>${ctx.t("Livello", "Level")}: ${ctx.esc(data.fields?.level ?? "?")} · ${ctx.esc(data.fields?.school || ctx.t("Scuola non indicata", "School not specified"))}</p>` : ""}${["item", "weapon", "armor", "consumable"].includes(type) ? `<p>${ctx.t("Peso", "Weight")}: ${ctx.esc(data.fields?.weight ?? "?")} · ${ctx.t("Valore", "Value")}: ${ctx.esc(data.fields?.value ?? "?")}</p>` : ""}${resource ? `<p><strong>${ctx.t("Riserva definita", "Defined pool")}</strong>: ${ctx.esc(resource.max)} · ${ctx.esc(resource.recovery === "short-rest" ? ctx.t("Riposo breve", "Short rest") : resource.recovery === "long-rest" ? ctx.t("Riposo lungo", "Long rest") : ctx.t("Recupero manuale", "Manual recovery"))}</p>` : ""}${(data.activities || []).map((activity) => `<section><h3>${ctx.esc(ctx.label(activity.name))}</h3><p class="library-prose">${ctx.esc(ctx.label(activity.description))}</p><p class="muted">${ctx.t("Attività descritta, da gestire manualmente", "Described activity, handled manually")}</p></section>`).join("")}</article>`;
}
// CA-88 (C5): the campaign-data area is optional, so it is loaded when asked for.
export function copyToCampaign(ctx, ref) {
  return import("./campaign-data.mjs")
    .then((module) => module.openCopyTo(ctx, `homebrew:${ref.contentId}`))
    .catch(() =>
      ctx.toast(
        ctx.t(
          "La copia tra campagne non è disponibile: apri Campagna › Dati.",
          "Copying between campaigns is unavailable: open Campaign › Data.",
        ),
        true,
      ),
    );
}
export function renderLibrary(ctx) {
  // An area collection (B11) renders beside Available / My Library / Campaign.
  const section = !ctx.view.id ? ctx.registry?.get("library-section", ctx.view.tab, ctx) : null;
  if (section)
    return `<section class="library-page"><header class="page-heading library-heading"><div><h1>${ctx.t("Biblioteca", "Library")}</h1><p>${ctx.esc(ctx.registry.label(section, ctx.lang))}</p></div></header>${libraryScopes(ctx, section.id)}${ctx.registry.slot("library-section", section, ctx)}</section>`;
  if (ctx.view.tab === "edit" && ctx.view.id) {
    try {
      const draft = hb.getHomebrewDraft(ctx.state, ctx.view.id, ctx.role);
      if (!draft || draft.status !== "active") {
        session = null;
        return unavailable(ctx);
      }
      ensureSession(ctx, draft);
      return renderEditor(ctx, draft);
    } catch {
      session = null;
      return unavailable(ctx);
    }
  }
  if (ctx.view.id) {
    try {
      return renderDetail(
        ctx,
        hb.getHomebrewRevision(
          ctx.state,
          { contentId: ctx.view.id, revisionId: ctx.view.revision },
          ctx.role,
        ),
      );
    } catch {
      return unavailable(ctx);
    }
  }
  return renderCollection(ctx);
}
function unavailable(ctx) {
  return `<section class="library-page"><h1>${ctx.t("Contenuto non disponibile", "Content unavailable")}</h1><p>${ctx.t("La revisione o la bozza non è accessibile con questa identità. Torna alla Biblioteca per scegliere un contenuto disponibile.", "This revision or draft is unavailable to this identity. Return to the Library to choose available content.")}</p><button class="button" data-library-back>${ctx.t("Torna alla Biblioteca", "Return to Library")}</button></section>`;
}
// Collection tabs: the three core scopes plus area collections (B11).
function libraryScopes(ctx, current) {
  const { t } = ctx;
  return `<nav class="library-tabs" aria-label="${t("Raccolte", "Collections")}">${[
    ["available", t("Disponibili", "Available")],
    ["personal", t("La mia Biblioteca", "My Library")],
    ["campaign", t("Campagna", "Campaign")],
    ...(ctx.registry?.list("library-section", ctx) ?? []).map((c) => [
      c.id,
      ctx.esc(ctx.registry.label(c, ctx.lang)),
    ]),
  ]
    .map(
      ([id, label]) =>
        `<button class="button ${current === id ? "active" : "quiet"}" data-library-scope="${id}" ${current === id ? 'aria-current="page"' : ""}>${label}</button>`,
    )
    .join("")}</nav>`;
}
function renderCollection(ctx) {
  const { t, esc } = ctx,
    choices = contextualChoices(ctx),
    savedFilters = filters(ctx),
    f =
      choices.kind &&
      choices.onlyCompatible &&
      savedFilters.type &&
      !fitsChoice(savedFilters.type, choices.kind)
        ? { ...savedFilters, type: "" }
        : savedFilters,
    scope = currentScope(ctx),
    target = returnContext(ctx);
  // BI-01 (DDB My Library «Owned & Shared»): «Disponibili» holds everything this identity
  // may use, the basic rules (SRD 5.2.1) included, with one search and an origin filter.
  const origin = scope === "available" && !target ? f.origin || "" : "";
  const all = hb.listHomebrew(ctx.state, ctx.role),
    drafts = hb.listHomebrewDrafts(ctx.state, ctx.role),
    enabledRefs = ctx.state.campaign.enabledContent || [];
  const entries = all.flatMap((entry) => {
    const refs =
      scope === "campaign"
        ? enabledRefs
        : scope === "personal" && entry.owner !== ctx.role
          ? ctx.state.libraryCollections?.[ctx.role] || []
          : null;
    const selected = refs
      ? entry.revisions
          .filter((revision) =>
            refs.some((ref) => ref.contentId === entry.id && ref.revisionId === revision.id),
          )
          .at(-1)
      : null;
    if (refs && !selected) return [];
    const ref = selected ? { contentId: entry.id, revisionId: selected.id } : entry.latestRef;
    const data = hb.getHomebrewRevision(ctx.state, ref, ctx.role).data;
    const enabled = enabledRefs.filter((r) => r.contentId === entry.id);
    const originMatch =
      !origin ||
      (origin === "mine" && entry.owner === ctx.role) ||
      (origin === "shared" && entry.owner !== ctx.role) ||
      (origin === "campaign" && enabled.length > 0) ||
      (origin === "favorites" && entry.collected);
    const matches =
      originMatch &&
      (!choices.kind || !choices.onlyCompatible || fitsChoice(entry.type, choices.kind)) &&
      (!f.type || entry.type === f.type) &&
      (!f.language || data.name?.[f.language]) &&
      (!f.q ||
        `${ctx.label(data.name)} ${ctx.label(data.description)}`
          .toLocaleLowerCase()
          .includes(f.q.toLocaleLowerCase()));
    return matches
      ? [
          {
            ...entry,
            latestRef: ref,
            name: data.name,
            enabledNumbers: enabled
              .map((r) => entry.revisions.findIndex((x) => x.id === r.revisionId) + 1)
              .filter((n) => n > 0),
          },
        ]
      : [];
  });
  const srdRows = scope === "available" && !target ? srdMatches(ctx, f, origin) : [];
  // BI-45 (Shard/Foundry compendium packs): entries of the packs this identity reads.
  const packRows = scope === "available" && !target ? packMatches(ctx, f, origin) : [];
  const total = entries.length + srdRows.length + packRows.length;
  const dm = ctx.role === "dm";
  const addCampaign =
    scope === "campaign" &&
    dm &&
    ctx.registry?.get?.("command", "homebrew-editor.add-campaign-content", ctx)
      ? `<button class="button primary" type="button" data-library-campaign-add>${t("Aggiungi contenuto alla campagna…", "Add content to the campaign…")}</button>`
      : "";
  const star = (on, attrs, name) =>
    `<button type="button" class="button quiet library-star" ${attrs} aria-pressed="${on}" aria-label="${esc(on ? t(`Togli ${name} dai preferiti`, `Remove ${name} from favourites`) : t(`Aggiungi ${name} ai preferiti`, `Add ${name} to favourites`))}" title="${esc(on ? t("Nei preferiti", "In favourites") : t("Aggiungi ai preferiti", "Add to favourites"))}">${on ? "★" : "☆"}</button>`;
  const entryRow = (entry) => {
    const name = ctx.label(entry.name);
    const tags = [
      esc(typeName(ctx, entry.type)),
      entry.owner === ctx.role ? t("Mio", "Mine") : t("Condiviso con me", "Shared with me"),
      `${t("Revisioni accessibili", "Accessible revisions")}: ${entry.revisions.length}`,
      ...(entry.enabledNumbers.length
        ? [
            `<span class="badge" data-library-enabled-rev>${t("Abilitata", "Enabled")}: ${t("rev.", "rev.")} ${entry.enabledNumbers.join(", ")}</span>`,
          ]
        : []),
      ...(entry.collected ? [t("Nella mia raccolta", "In my collection")] : []),
    ];
    return `<article class="library-row"><div><h3>${esc(name)}</h3><p>${tags.join(" · ")}</p></div><div class="library-row-actions">${scope === "available" && !target ? star(Boolean(entry.collected), `data-library-fav="${esc(entry.id)}" data-revision="${esc(entry.latestRef.revisionId)}"`, name) : ""}<button class="button" data-library-open="${esc(entry.id)}" data-revision="${esc(entry.latestRef.revisionId)}">${target && !incompatibleReason(ctx, entry.type, target) ? t("Apri e scegli", "Open and choose") : t("Apri", "Open")}</button></div></article>`;
  };
  const srdRow = (entry) => {
    const name = ctx.label(entry.name);
    return `<article class="library-row" data-library-srd="${esc(entry.id)}"><div><h3>${esc(name)}</h3><p>${esc(ctx.label(srdData.kindLabel(entry)))} · ${esc(srdData.entryMeta(entry, ctx.lang))} · <span class="badge">SRD ${srdData.REVISION}</span></p></div><div class="library-row-actions">${star(compendium.entryBookmarked(ctx, entry.id), `data-library-srd-fav="${esc(entry.id)}"`, name)}<button class="button" data-library-srd-open="${esc(entry.id)}">${t("Apri", "Open")}</button></div></article>`;
  };
  const packRow = (entry) =>
    `<article class="library-row" data-library-pack="${esc(entry.id)}"><div><h3>${esc(ctx.label(entry.name))}</h3><p>${esc(ctx.label(PACK_TYPES[entry.type] ?? PACK_TYPES.item))} · ${t(`Pacchetto «${esc(entry.packTitle.it)}» · p. ${entry.page}`, `Pack “${esc(entry.packTitle.en)}” · p. ${entry.page}`)} · <span class="badge">${t("Solo meccaniche", "Mechanics only")}</span></p></div><div class="library-row-actions"><button class="button" data-library-pack-open="${esc(entry.packId)}">${t("Apri", "Open")}</button></div></article>`;
  const filtered = f.q || f.type || f.language || origin;
  const empty =
    scope === "campaign"
      ? dm
        ? t(
            "Nessun contenuto abilitato nella campagna. Aggiungilo con «Aggiungi contenuto alla campagna»: scegli la revisione esatta.",
            "No content enabled in the campaign. Add it with “Add content to the campaign”: you choose the exact revision.",
          )
        : t(
            "Il DM non ha ancora abilitato contenuti per la campagna.",
            "The DM has not enabled content for the campaign yet.",
          )
      : filtered
        ? t(
            "Nessun contenuto corrisponde ai filtri. Prova un altro nome o azzera i filtri.",
            "No content matches these filters. Try another name or clear the filters.",
          )
        : t(
            "Questa raccolta non contiene ancora contenuti accessibili. Crea il primo oppure importa un file della Biblioteca.",
            "This collection has no accessible content yet. Create the first item or import a Library file.",
          );
  const originSelect =
    scope === "available" && !target
      ? `<label class="field">${t("Origine", "Origin")}<select data-library-filter="origin">${[
          ["", t("Tutte le origini", "All origins")],
          ["srd", t("Manuale base (SRD 5.2.1)", "Basic rules (SRD 5.2.1)")],
          ["mine", t("Mie creazioni", "My creations")],
          ["shared", t("Condivise con me", "Shared with me")],
          ["campaign", t("Della campagna", "Campaign")],
          ["favorites", t("Preferiti", "Favourites")],
        ]
          .map(
            ([id, label]) =>
              `<option value="${id}" ${origin === id ? "selected" : ""}>${label}</option>`,
          )
          .join("")}</select></label>`
      : "";
  const srdHint =
    scope === "available" && !target && !f.q && (origin === "" || origin === "srd")
      ? `<p class="muted library-srd-hint">${t("Scrivi almeno due lettere per cercare anche nel manuale base (incantesimi, mostri, oggetti, regole).", "Type at least two letters to also search the basic rules (spells, monsters, items, rules).")} <button type="button" class="text-button" data-library-srd-browse>${t("Sfoglia il Compendio SRD", "Browse the SRD Compendium")}</button></p>`
      : "";
  return `<section class="library-page"><header class="page-heading library-heading"><div><h1>${t("Biblioteca", "Library")}</h1><p>${t("Consulta contenuti e conserva le tue creazioni. Ogni uso fa riferimento a una revisione precisa.", "Read content and keep your creations. Every use points to a specific revision.")}</p>${renderContext(ctx, true)}</div><button class="button primary" data-library-new>${t("Crea contenuto", "Create content")}</button></header>${libraryScopes(ctx, scope)}<form class="library-filters" data-library-search><label class="field">${scope === "available" && !target ? t("Cerca in tutto ciò che puoi usare", "Search everything you can use") : t("Cerca nome o descrizione", "Search name or description")}<input type="search" data-library-query value="${esc(f.q)}"></label>${originSelect}<label class="field">${t("Tipo", "Type")}<select data-library-filter="type"><option value="">${t("Tutti i tipi", "All types")}</option>${hb
    .getHomebrewTypes()
    .filter(
      (entry) => !choices.kind || !choices.onlyCompatible || entry.targetKind === choices.kind,
    )
    .map(
      (entry) =>
        `<option value="${entry.id}" ${entry.id === f.type ? "selected" : ""}>${esc(ctx.label(entry.name))}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">${t("Lingua del contenuto", "Content language")}<select data-library-filter="language"><option value="">${t("Tutte", "All")}</option><option value="it" ${f.language === "it" ? "selected" : ""}>Italiano</option><option value="en" ${f.language === "en" ? "selected" : ""}>English</option></select></label><button class="button" type="submit">${t("Cerca", "Search")}</button>${filtered ? `<button class="button quiet" type="button" data-library-clear>${t("Azzera filtri", "Clear filters")}</button>` : ""}</form>${addCampaign ? `<div class="toolbar">${addCampaign}</div>` : ""}${drafts.length ? `<section class="library-drafts"><h2>${t("Bozze private", "Private drafts")}</h2>${drafts.map((draft) => `<article class="library-row"><div><h3>${esc(ctx.label(draft.data.name) || t(...(draftKinds[draft.kind] || draftKinds.create)))}</h3><p>${t(...(draftKinds[draft.kind] || draftKinds.create))} · ${t("Non applicata", "Not applied")}</p></div><button class="button" data-library-resume="${esc(draft.id)}">${t("Riprendi", "Resume")}</button></article>`).join("")}</section>` : ""}<div class="library-results"><h2>${t("Contenuti", "Content")} <span class="muted">(${total})</span></h2>${srdHint}${total ? entries.map(entryRow).join("") + srdRows.map(srdRow).join("") + packRows.map(packRow).join("") : `<div class="library-empty"><p>${empty}</p></div>`}</div><section class="library-transfer"><h2>${t("File locali", "Local files")}</h2><p>${t("Importa un file della Biblioteca di questa app: vedrai il riepilogo prima di aggiungerlo. Campagne e schede restano invariate.", "Import a Library file from this app: review it before adding it. Campaigns and sheets stay unchanged.")}</p><label class="field">${t("Importa file JSON", "Import JSON file")}<input type="file" accept=".json,application/json" data-library-import></label>${importError ? `<p role="alert" class="error">${esc(importError)}</p>` : ""}<p class="muted">${t("Il catalogo pubblico e la pubblicazione non sono ancora collegati.", "The public catalog and publishing are not connected yet.")}</p></section></section>`;
}
// BI-01: the SRD entries the search (or the favourites filter) brings into «Disponibili».
const PACK_TYPES = Object.freeze({
  creature: { it: "Creatura", en: "Creature" },
  item: { it: "Oggetto", en: "Item" },
  spell: { it: "Incantesimo", en: "Spell" },
  subclass: { it: "Sottoclasse", en: "Subclass" },
});
// The Library's type filter over a pack's four kinds.
const PACK_TYPE_OF = { creature: "creature", spell: "spell", subclass: "subclass" };
function packMatches(ctx, f, origin) {
  if (!["", "campaign"].includes(origin) || f.language) return [];
  return searchPackEntries(ctx.state, ctx.role, f.q ?? "").filter(
    (entry) =>
      !f.type ||
      PACK_TYPE_OF[entry.type] === f.type ||
      (entry.type === "item" && ["item", "weapon", "armor"].includes(f.type)),
  );
}
function srdMatches(ctx, f, origin) {
  if (!["", "srd", "favorites"].includes(origin)) return [];
  const typeOk = (entry) =>
    !f.type ||
    compendium.libraryCopyType(entry) === f.type ||
    (f.type === "item" && entry.kind === "item");
  if (origin === "favorites")
    return compendium
      .bookmarkedEntries(ctx)
      .filter(
        (entry) =>
          typeOk(entry) &&
          (!f.q || ctx.label(entry.name).toLocaleLowerCase().includes(f.q.toLocaleLowerCase())),
      );
  if ((f.q || "").trim().length < 2) return [];
  return srdData.searchEntries(f.q, ctx.lang, 40).filter(typeOk);
}
function renderDetail(ctx, revision) {
  const { t, esc } = ctx,
    p = revision.permissions || {},
    ref = revision.ref,
    target = returnContext(ctx);
  const summary = hb.listHomebrew(ctx.state, ctx.role).find((entry) => entry.id === ref.contentId);
  const enabled = (ctx.state.campaign.enabledContent || []).some(
    (value) => value.contentId === ref.contentId && value.revisionId === ref.revisionId,
  );
  const actors = Object.values(ctx.state.actors).filter((actor) => ctx.canControl?.(actor));
  const targetKind = hb.getHomebrewTypes().find((entry) => entry.id === revision.type)?.targetKind;
  // CA-88 (C5, Roll20 Transmogrifier): a content enabled in this campaign is copied to
  // another one through the one campaign-data entry; the command's `when` keeps it for
  // whoever manages the campaign.
  const copyTo =
    enabled && ctx.registry?.get?.("command", "campaign-data.copy-to", ctx)
      ? `<button class="button quiet" data-library-copy-to>${t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>`
      : "";
  return `<section class="library-page"><button class="button quiet" data-library-back>${t("Torna ai risultati", "Back to results")}</button>${renderContext(ctx)}<header class="library-heading"><div><h1>${esc(ctx.label(revision.data.name))}</h1><p>${esc(typeName(ctx, revision.type))} · ${t("Revisione salvata", "Saved revision")}</p></div><label class="field">${t("Revisione", "Revision")}<select data-library-revision>${(summary?.revisions || []).map((entry, index) => `<option value="${esc(entry.id)}" ${entry.id === ref.revisionId ? "selected" : ""}>${index + 1} · ${esc(revisionDate(ctx, entry.createdAt))}</option>`).join("")}</select></label></header><div class="library-detail-layout"><div>${readableDefinition(ctx, revision.data, revision.type)}${!targetKind ? `<p class="library-notice">${t("Questo tipo è consultabile come contenuto manuale. Il collegamento strutturato al suo editor non è ancora disponibile.", "This type can be read as manual content. Structured integration with its editor is not available yet.")}</p>` : ""}</div><aside class="library-commands"><h2>${t("Usa questa revisione", "Use this revision")}</h2>${target ? renderTargetUse(ctx, revision, target) : ""}${!target && targetKind && actors.length ? `<label class="field">${t("Scheda controllata", "Controlled sheet")}<select data-library-actor><option value="">${t("Scegli scheda…", "Choose sheet…")}</option>${actors.map((actor) => `<option value="${esc(actor.id)}">${esc(ctx.label(actor.name))}</option>`).join("")}</select></label><button class="button" data-library-assign>${t("Rivedi aggiunta alla scheda", "Review adding to sheet")}</button>` : ""}<p class="muted">${t("L’aggiunta non usa attività, non lancia magie e non equipaggia oggetti.", "Adding does not use activities, cast spells or equip items.")}</p>${p.canCollect ? `<button class="button quiet" data-library-collect="${revision.collected ? "false" : "true"}">${revision.collected ? t("Rimuovi dalla mia raccolta", "Remove from my collection") : t("Aggiungi alla mia raccolta", "Add to my collection")}</button>` : ""}<h3>${t("Creazione", "Authoring")}</h3>${p.canDuplicate ? `<button class="button" data-library-duplicate>${t("Usa come base · copia indipendente", "Use as base · independent copy")}</button>` : ""}${p.canRevise ? `<button class="button" data-library-revise>${t("Crea nuova revisione", "Create new revision")}</button>` : ""}<h3>${t("Accesso e campagna", "Access and campaign")}</h3><p>${enabled ? t("Questa revisione è abilitata nella campagna.", "This revision is enabled in the campaign.") : t("Questa revisione non è abilitata nella campagna.", "This revision is not enabled in the campaign.")}</p>${p.canManageAccess ? `<button class="button" data-library-share>${t("Gestisci accessi…", "Manage access…")}</button>` : ""}${copyTo}${p.canEnable ? `<button class="button" data-library-enable="${enabled ? "false" : "true"}">${enabled ? t("Disabilita per nuove scelte in campagna", "Disable for new campaign choices") : t("Abilita questa revisione in campagna", "Enable this revision in campaign")}</button>` : ""}${p.canExport ? `<button class="button quiet" data-library-export>${t("Esporta revisione e dipendenze", "Export revision and dependencies")}</button>` : ""}${issues(ctx, p.reasons)}</aside></div></section>`;
}
function renderTargetUse(ctx, revision, target) {
  if (!target) return "";
  const reason = incompatibleReason(ctx, revision.type, target);
  if (reason) return `<p class="library-notice" role="status">${ctx.esc(reason)}</p>`;
  if (target.page === "builder")
    return ctx.chooseLibraryContent
      ? `<button class="button primary" data-library-choose>${ctx.t("Torna alla scelta con questa revisione", "Return with this revision")}</button>`
      : "";
  const actor = ctx.state.actors[target.actorId];
  if (!actor || !ctx.canControl?.(actor))
    return `<p>${ctx.t("La scheda di destinazione non è disponibile.", "The destination sheet is unavailable.")}</p>`;
  if (!target.instanceId)
    return `<button class="button primary" data-library-assign-target>${ctx.t("Rivedi aggiunta alla scheda", "Review adding to sheet")}</button>`;
  const targetKind = hb.getHomebrewTypes().find((entry) => entry.id === revision.type)?.targetKind;
  const row = actor[targetKind]?.find(
    (entry) =>
      entry.id === target.instanceId && entry.homebrewRef?.contentId === revision.ref.contentId,
  );
  if (!row)
    return `<p>${ctx.t("La copia di destinazione non è disponibile.", "The destination copy is unavailable.")}</p>`;
  return row.homebrewRef.revisionId === revision.ref.revisionId
    ? `<p>${ctx.t("Questa è la revisione già usata dalla copia sulla scheda. Puoi confrontare un’altra revisione dal selettore.", "This is the revision already used by the sheet copy. Choose another revision to compare it.")}</p><button class="button" data-library-return>${ctx.t("Torna alla scheda", "Return to sheet")}</button>`
    : `<button class="button primary" data-library-update>${ctx.t("Rivedi aggiornamento di questa copia", "Review updating this copy")}</button>`;
}
function renderEditor(ctx, draft) {
  const { t, esc } = ctx,
    value = preview(ctx, draft),
    data = session.data;
  session.reviewKey = session.dirty ? null : value.reviewKey;
  const kind = draft.kind,
    type =
      draft.type ||
      value.proposed?.type ||
      (draft.baseRef ? hb.getHomebrewRevision(ctx.state, draft.baseRef, ctx.role).type : null) ||
      hb.listHomebrew(ctx.state, ctx.role).find((entry) => entry.id === draft.contentId)?.type ||
      "feature";
  const operation = ["assign", "update"].includes(kind);
  const applyLabel =
    kind === "import"
      ? t("Importa nella mia Biblioteca", "Import into my Library")
      : operation
        ? t("Applica a questa scheda", "Apply to this sheet")
        : t("Salva contenuto revisionato", "Save content revision");
  return `<section class="library-page"><button class="button quiet" data-library-back>${t("Torna alla Biblioteca", "Return to Library")}</button>${renderContext(ctx)}<header class="library-heading"><div><h1>${t(...(draftKinds[kind] || draftKinds.create))}</h1><p data-library-status role="status">${session.dirty ? t("Modifiche non salvate · bozza privata", "Unsaved changes · private draft") : ctx.storageError ? t("Conservata nella scheda; memoria del browser non disponibile", "Kept in this tab; browser storage unavailable") : t("Bozza privata salvata su questo dispositivo", "Private draft saved on this device")}</p><p>${operation ? t("Il confronto usa i consumi correnti della scheda. Nessuna modifica avviene prima di Applica.", "The comparison uses current sheet consumption. Nothing changes before Apply.") : t("Salvare non condivide, non abilita in campagna e non assegna alla scheda.", "Saving does not share, enable in a campaign or assign to a sheet.")}</p></div><button class="button" data-library-preview>${t("Salva bozza e aggiorna anteprima", "Save draft and update preview")}</button></header><div class="library-editor-layout"><div class="library-editor">${kind === "import" ? `<h2>${t("Riepilogo importazione", "Import summary")}</h2><p>${t("Il file aggiunge definizioni consentite, senza accessi o stato di partita. Gli stessi identificatori non creano doppioni.", "The file adds permitted definitions, without access grants or gameplay state. Identical IDs do not create duplicates.")}</p>${renderImportSummary(ctx, value)}` : operation ? renderInstanceEditor(ctx, draft, value) : renderDefinitionEditor(ctx, type)}<div class="library-draft-actions"><button class="button" data-library-save>${t("Salva bozza", "Save draft")}</button><button class="button quiet" data-library-discard>${t("Scarta bozza", "Discard draft")}</button></div></div><aside class="library-preview"><h2 tabindex="-1" data-library-preview-title>${t("Anteprima", "Preview")}</h2>${issues(ctx, value.errors)}${issues(ctx, value.warnings)}${kind === "import" ? "" : operation ? renderInstancePreview(ctx, value) + renderDiff(ctx, value) : readableDefinition(ctx, data, type) + (kind === "revise" ? renderDiff(ctx, value) : "")}${automation(ctx, value.automation)}<button class="button primary" data-library-apply ${!value.canApply || session.dirty ? 'disabled aria-describedby="library-apply-why"' : ""}>${applyLabel}</button><p class="library-apply-why" id="library-apply-why">${session.dirty ? t("Modifiche non ancora nell’anteprima: premi «Salva bozza e aggiorna anteprima», poi applica.", "Changes are not in the preview yet: press “Save draft and update preview”, then apply.") : value.canApply ? "" : t("L’anteprima segnala dei problemi: correggili nei campi indicati sopra, poi aggiorna l’anteprima.", "The preview reports problems: correct them in the fields above, then update the preview.")}</p></aside></div></section>`;
}
function renderDefinitionEditor(ctx, type) {
  const { t } = ctx,
    d = session.data,
    resource = d.resource;
  return `<form data-library-form class="library-form"><fieldset><legend>${t("Identità e testo", "Identity and text")}</legend><p class="muted">${ctx.esc(typeName(ctx, type))}. ${t("Basta una lingua; le traduzioni mancanti non vengono inventate.", "One language is enough; missing translations are not invented.")}</p><div class="library-field-grid">${field(ctx, "name.it", t("Nome italiano", "Italian name"))}${field(ctx, "name.en", t("Nome inglese", "English name"))}</div>${textarea(ctx, "description.it", t("Descrizione italiana", "Italian description"))}${textarea(ctx, "description.en", t("Descrizione inglese", "English description"))}</fieldset><fieldset><legend>${t("Provenienza e accesso consentito", "Provenance and permitted access")}</legend><div class="library-field-grid">${select(
    ctx,
    "source.kind",
    t("Origine", "Origin"),
    [
      ["authored", t("Creazione originale", "Original creation")],
      ["reconstruction", t("Ricostruzione da una fonte", "Reconstruction from a source")],
    ],
  )}${select(ctx, "source.edition", t("Edizione", "Edition"), [
    ["2024", "2024"],
    ["unknown", t("Non nota o altra edizione", "Unknown or other edition")],
  ])}</div>${field(ctx, "source.label", t("Autore o fonte", "Author or source"))}${field(ctx, "source.reference", t("Riferimento preciso, se noto", "Precise reference, if known"))}<p class="muted">${t("Indica le facoltà che il materiale permette; questa dichiarazione non certifica una licenza.", "Declare what the material permits; this declaration does not certify a license.")}</p>${checkbox(ctx, "source.rights.modify", t("Consente copie modificabili", "Allows editable copies"))}${checkbox(ctx, "source.rights.share", t("Consente la condivisione", "Allows sharing"))}${checkbox(ctx, "source.rights.export", t("Consente l’esportazione", "Allows export"))}</fieldset>${
    type === "spell"
      ? `<fieldset><legend>${t("Dati della magia", "Spell data")}</legend>${field(ctx, "fields.level", t("Livello della magia, 0 per trucchetto", "Spell level, 0 for cantrip"), "number", 'min="0" max="9" step="1"')}${field(ctx, "fields.school", t("Scuola", "School"))}<p>${t("Il testo e il livello non creano un’azione automatizzata al Tavolo.", "Text and level do not create an automated Table action.")}</p></fieldset>`
      : ["item", "weapon", "armor", "consumable"].includes(type)
        ? `<fieldset><legend>${t("Dati dell’oggetto", "Item data")}</legend>${select(
            ctx,
            "fields.kind",
            t("Categoria", "Category"),
            [
              ["gear", t("Equipaggiamento", "Gear")],
              ["weapon", t("Arma", "Weapon")],
              ["armor", t("Armatura", "Armor")],
              ["consumable", t("Consumabile", "Consumable")],
              ["other", t("Altro", "Other")],
            ],
          )}<div class="library-field-grid">${field(ctx, "fields.weight", t("Peso per copia", "Weight per copy"), "number", 'min="0" step="any"')}${field(ctx, "fields.value", t("Valore per copia, se noto", "Value per copy, if known"), "number", 'min="0" step="any"')}</div></fieldset>`
        : ""
  }<details ${resource ? "open" : ""}><summary>${t("Riserva e recupero", "Pool and recovery")}</summary><p>${t("Il massimo appartiene alla definizione; gli usi spesi appartengono a ciascuna copia sulla scheda.", "The maximum belongs to the definition; spent uses belong to each sheet copy.")}</p>${
    resource
      ? `<div class="library-field-grid">${field(ctx, "resource.max", t("Massimo", "Maximum"), "number", 'min="0" step="1"')}${select(
          ctx,
          "resource.recovery",
          t("Recupero dichiarato", "Declared recovery"),
          [
            ["manual", t("Manuale", "Manual")],
            ["short-rest", t("Riposo breve", "Short rest")],
            ["long-rest", t("Riposo lungo", "Long rest")],
          ],
        )}</div><button type="button" class="button quiet" data-library-resource="remove">${t("Rimuovi la riserva dalla definizione", "Remove pool from definition")}</button>`
      : `<button type="button" class="button" data-library-resource="add">${t("Aggiungi riserva", "Add pool")}</button>`
  }</details><details ${(d.activities || []).length ? "open" : ""}><summary>${t("Attività descritte", "Described activities")}</summary><p>${t("Queste attività sono promemoria manuali. Il testo non viene trasformato in tiri, costi o effetti.", "These activities are manual reminders. Text is not converted into rolls, costs or effects.")}</p>${(d.activities || []).map((entry, index) => `<fieldset><legend>${t("Attività", "Activity")} ${index + 1}</legend><div class="library-field-grid">${field(ctx, `activities.${index}.name.it`, t("Nome italiano", "Italian name"))}${field(ctx, `activities.${index}.name.en`, t("Nome inglese", "English name"))}</div>${textarea(ctx, `activities.${index}.description.it`, t("Descrizione italiana", "Italian description"))}${textarea(ctx, `activities.${index}.description.en`, t("Descrizione inglese", "English description"))}<button type="button" class="button quiet" data-library-remove-activity="${ctx.esc(entry.id)}">${t("Rimuovi attività", "Remove activity")}</button></fieldset>`).join("")}<button type="button" class="button" data-library-add-activity>${t("Aggiungi attività manuale", "Add manual activity")}</button></details>${renderDependencies(ctx)}</form>`;
}
function renderDependencies(ctx) {
  const { t, esc } = ctx,
    dependencies = session.data.dependencies || [];
  const options = hb.listHomebrew(ctx.state, ctx.role).flatMap((entry) =>
    entry.revisions.map((revision) => ({
      ref: { contentId: entry.id, revisionId: revision.id },
      name: ctx.label(revision.name || entry.name),
    })),
  );
  return `<details ${dependencies.length ? "open" : ""}><summary>${t("Dipendenze revisionate", "Versioned dependencies")}</summary><p>${t("Collega solo revisioni accessibili. Un riferimento non concede automaticamente capacità e conserva i permessi della fonte.", "Link accessible revisions only. A reference does not automatically grant features and retains its source permissions.")}</p>${dependencies
    .map((ref, index) => {
      let name;
      try {
        name = ctx.label(hb.getHomebrewRevision(ctx.state, ref, ctx.role).data.name);
      } catch {
        name = t("Dipendenza non accessibile", "Dependency unavailable");
      }
      return `<div class="library-row"><span>${esc(name)}</span><button type="button" class="button quiet" data-library-remove-dependency="${index}">${t("Rimuovi riferimento", "Remove reference")}</button></div>`;
    })
    .join(
      "",
    )}<label class="field">${t("Revisione da collegare", "Revision to link")}<select data-library-dependency><option value="">${t("Scegli revisione…", "Choose revision…")}</option>${options.map(({ ref, name }) => `<option value="${esc(JSON.stringify(ref))}">${esc(name)} · ${esc(ref.revisionId)}</option>`).join("")}</select></label><button type="button" class="button" data-library-add-dependency>${t("Aggiungi riferimento", "Add reference")}</button></details>`;
}
function renderInstanceEditor(ctx, draft, value) {
  const { t } = ctx;
  return `<form class="library-form" data-library-form><h2>${draft.kind === "assign" ? t("Stato della nuova copia", "New copy state") : t("Riconcilia le differenze", "Reconcile differences")}</h2>${draft.kind === "assign" ? `<p>${t("Indica i dati attuali: aggiungere una copia non è un riposo o un lancio.", "Enter current data: adding a copy is not a rest or a spell cast.")}</p>${value.permissions?.targetKind === "inventory" ? field(ctx, "instance.quantity", t("Quantità", "Quantity"), "number", 'min="1" step="1"') : ""}${Object.hasOwn(value.proposed || {}, "used") ? field(ctx, "instance.used", t("Usi già spesi; vuoto se non noti", "Uses already spent; leave blank if unknown"), "number", 'min="0" step="1"') : ""}` : `<p>${t("Le correzioni estranee e i consumi correnti vengono conservati. I campi in conflitto richiedono una scelta.", "Unrelated corrections and current consumption are preserved. Conflicting fields require a choice.")}</p>`}${renderDiff(ctx, value, true)}${renderResourceResolution(ctx, value)}</form>`;
}
function renderInstancePreview(ctx, value) {
  const row = value.proposed;
  if (!row) return "";
  const known = typeof row.used === "number" && Number.isFinite(row.used);
  return `<article class="library-readable"><h3>${ctx.esc(ctx.label(row.name))}</h3><p class="library-prose">${ctx.esc(ctx.label(row.description))}</p>${typeof row.max === "number" ? `<dl class="library-resource-summary"><dt>${ctx.t("Massimo proposto", "Proposed maximum")}</dt><dd>${row.max}</dd><dt>${ctx.t("Usi già spesi", "Uses already spent")}</dt><dd>${known ? row.used : ctx.t("Non noti", "Unknown")}</dd><dt>${ctx.t("Disponibili dopo l’aggiornamento", "Available after update")}</dt><dd data-library-resource-available>${known ? Math.max(0, row.max - row.used) : ctx.t("Non noti", "Unknown")}</dd>${known && row.used > row.max ? `<dt>${ctx.t("Usi eccedenti conservati", "Retained excess uses")}</dt><dd>${row.used - row.max}</dd>` : ""}</dl>` : ""}${Object.hasOwn(row, "quantity") ? `<p>${ctx.t("Quantità", "Quantity")}: ${ctx.esc(row.quantity)}</p>` : ""}</article>`;
}
function renderResourceResolution(ctx, value) {
  if (
    !value.errors?.some((error) => error.code === "resource-change") &&
    !session.data.resolutions?.resource
  )
    return "";
  return `<label class="field">${ctx.t("La riserva è stata rimossa o sostituita", "The pool was removed or replaced")}<select data-library-resolution="resource"><option value="">${ctx.t("Scegli come conservare i consumi…", "Choose how to retain consumption…")}</option><option value="retain-history" ${session.data.resolutions?.resource === "retain-history" ? "selected" : ""}>${ctx.t("Conserva lo storico dei consumi della riserva precedente", "Retain the previous pool consumption history")}</option></select></label>`;
}
function renderImportSummary(ctx, value) {
  const summary = value.proposed || {};
  const contents = value.canApply ? session.data.bundle?.contents || [] : [];
  return `<dl class="library-resource-summary"><dt>${ctx.t("Contenuti nel file", "Content in file")}</dt><dd>${ctx.esc(summary.contents ?? "?")}</dd><dt>${ctx.t("Nuove revisioni", "New revisions")}</dt><dd>${ctx.esc(summary.newRevisions ?? "?")}</dd><dt>${ctx.t("Revisioni già presenti", "Revisions already present")}</dt><dd>${ctx.esc(summary.existingRevisions ?? ctx.t("Da verificare", "To verify"))}</dd></dl>${contents.map((entry) => `<details class="library-import-entry"><summary>${ctx.esc(ctx.label(entry.revisions.at(-1)?.data.name))} · ${ctx.esc(typeName(ctx, entry.type))}</summary>${entry.revisions.map((revision) => readableDefinition(ctx, revision.data, entry.type)).join("")}</details>`).join("")}`;
}
function displayValue(ctx, value) {
  if (value === undefined || value === null) return ctx.t("Non indicato", "Not specified");
  if (Array.isArray(value))
    return value.length
      ? value.map((entry) => displayValue(ctx, entry)).join("<br>")
      : ctx.t("Nessuno", "None");
  if (typeof value === "object") {
    if (Object.hasOwn(value, "it") || Object.hasOwn(value, "en"))
      return Object.entries(value)
        .map(
          ([language, text]) => `${language === "it" ? "Italiano" : "English"}: ${ctx.esc(text)}`,
        )
        .join("<br>");
    return Object.entries(value)
      .map(([key, content]) => `${ctx.esc(diffLabel(ctx, key))}: ${displayValue(ctx, content)}`)
      .join("<br>");
  }
  if (typeof value === "boolean") return value ? ctx.t("Sì", "Yes") : ctx.t("No", "No");
  return ctx.esc(value);
}
function diffLabel(ctx, path) {
  const labels = {
    name: ["Nome", "Name"],
    description: ["Descrizione", "Description"],
    max: ["Massimo", "Maximum"],
    used: ["Usi spesi", "Spent uses"],
    recovery: ["Recupero", "Recovery"],
    fields: ["Dati specifici", "Type data"],
    activities: ["Attività", "Activities"],
    dependencies: ["Dipendenze", "Dependencies"],
    resource: ["Riserva", "Pool"],
    level: ["Livello", "Level"],
    school: ["Scuola", "School"],
    kind: ["Tipo", "Type"],
    weight: ["Peso", "Weight"],
    value: ["Valore", "Value"],
    id: ["Identità", "Identity"],
    contentId: ["Contenuto", "Content"],
    revisionId: ["Revisione", "Revision"],
  };
  return labels[path] ? ctx.t(...labels[path]) : path;
}
// BI-16: structured behaviour in the comparison, read as the sheet will apply it.
function structuredLine(ctx, key, item) {
  const name = (list, id) => ctx.label(list.find((x) => x.id === id)?.name ?? id);
  if (key === "modifiers")
    return `${name(D.MODIFIER_TARGETS, item.target)}: ${
      D.ROLL_MODES.includes(item.mode)
        ? name(D.MODIFIER_MODES, item.mode)
        : item.mode === "add"
          ? `${item.value < 0 ? "−" : "+"}${Math.abs(item.value)}`
          : `${name(D.MODIFIER_MODES, item.mode)} ${item.value}`
    }${D.isTimed(item) ? ` · ${ctx.label(D.durationText(item)).toLocaleLowerCase()}` : ""}`;
  if (key === "activities")
    return `${ctx.label(item.name) || ctx.t("Attività senza nome", "Unnamed activity")} (${name(D.ACTIVITY_TYPES, item.type)})`;
  if (key === "options")
    return `${ctx.label(item.name)} · ${ctx.t("scegli", "choose")} ${item.choose}`;
  return ctx.label(D.describePrerequisites({ prerequisites: [item] })[0]);
}
function structuredDiff(ctx, entry) {
  const { t, esc } = ctx,
    key = entry.path.split(".").at(-1);
  const title = {
    modifiers: t("Modificatori", "Modifiers"),
    activities: t("Attività", "Activities"),
    options: t("Scelte", "Choices"),
    prerequisites: t("Prerequisiti", "Prerequisites"),
  }[key];
  const lines = (items) =>
    items.length
      ? `<ul>${items.map((item) => `<li>${esc(structuredLine(ctx, key, item))}</li>`).join("")}</ul>`
      : t("Nessuno", "None");
  return `<section data-library-diff-structured="${esc(key)}"><h3>${esc(title)}</h3><dl><dt>${t("Ora sulla scheda", "On the sheet now")}</dt><dd>${lines(entry.current ?? [])}</dd><dt>${t("Con l’aggiornamento", "With the update")}</dt><dd>${lines(entry.candidate ?? [])}</dd></dl></section>`;
}
function renderDiff(ctx, value, editable = false) {
  const { t, esc } = ctx,
    diff = value.diff || [],
    conflicts = value.conflicts || [];
  // Structured changes have nothing to reconcile: they are listed once, in the preview.
  const entries = [
    ...diff,
    ...conflicts.filter((entry) => !diff.some((row) => row.path === entry.path)),
  ].filter((entry) => !(editable && entry.structured));
  return `<div class="library-diff">${entries
    .map((entry) =>
      entry.structured
        ? structuredDiff(ctx, entry)
        : `<section><h3>${esc(diffLabel(ctx, entry.path))}</h3><dl><dt>${t("Base applicata", "Applied base")}</dt><dd>${displayValue(ctx, entry.base)}</dd><dt>${t("Sulla scheda ora", "On the sheet now")}</dt><dd>${displayValue(ctx, entry.current)}</dd><dt>${t("Revisione proposta", "Proposed revision")}</dt><dd>${displayValue(ctx, entry.candidate)}</dd></dl>${
            editable && entry.conflict
              ? `<label class="field">${t("Come risolvere", "How to resolve")}<select data-library-resolution="${esc(entry.path)}"><option value="">${t("Scegli…", "Choose…")}</option>${
                  entry.path === "resource"
                    ? `<option value="retain-history" ${session.data.resolutions?.resource === "retain-history" ? "selected" : ""}>${t("Conserva lo storico della riserva rimossa", "Retain removed pool history")}</option>`
                    : [
                        ["keep-local", t("Mantieni la correzione locale", "Keep local correction")],
                        ["use-new", t("Usa la nuova definizione", "Use new definition")],
                      ]
                        .map(
                          ([choice, label]) =>
                            `<option value="${choice}" ${session.data.resolutions?.[entry.path] === choice ? "selected" : ""}>${label}</option>`,
                        )
                        .join("")
                }</select></label>`
              : ""
          }</section>`,
    )
    .join(
      "",
    )}${!entries.length ? `<p>${t("Nessun conflitto da risolvere.", "No conflict to resolve.")}</p>` : ""}</div>`;
}
function finishApply(ctx, result) {
  session = null;
  if (result.actorId)
    ctx.navigate("characters", {
      id: result.actorId,
      tab:
        result.targetKind === "inventory"
          ? "inventory"
          : result.targetKind === "spells"
            ? "spells"
            : "features",
    });
  else if (result.ref)
    ctx.navigate("library", {
      id: result.ref.contentId,
      revision: result.ref.revisionId,
      tab: "personal",
      ...routeContext(ctx, result.returnTo),
    });
  else ctx.navigate("library", { tab: "personal", ...routeContext(ctx, result.returnTo) });
}
export function bindLibrary(root, ctx) {
  // Any replacement view invalidates a file read started by its old controls.
  importGeneration++;
  root.querySelectorAll("[data-library-cancel-choice]").forEach((button) => {
    button.onclick = () => {
      const target = returnContext(ctx);
      if (target?.page === "builder")
        ctx.navigate("builder", { id: target.draftId, tab: target.section });
      else if (target?.page === "characters")
        ctx.navigate("characters", { id: target.actorId, tab: target.tab });
    };
  });
  root.querySelector("[data-library-context-only]")?.addEventListener("change", (event) => {
    contextualChoices(ctx);
    contextualFilter.onlyCompatible = event.target.checked;
    ctx.render();
  });
  root.querySelectorAll("[data-library-back]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("library", { tab: currentScope(ctx), ...routeContext(ctx) });
  });
  root.querySelector("[data-library-new]")?.addEventListener("click", () => {
    const choices = contextualChoices(ctx);
    // BI-15/BI-23: one «Crea contenuto» into the structured editor (monster → stat block,
    // magic item → Forge); the saved revision comes back to the sheet that asked for it.
    const create = ctx.registry?.get?.("command", "homebrew-editor.create", ctx);
    if (create) {
      const target = choices.target;
      const returnTo =
        target?.page === "builder" ||
        (target?.page === "characters" && ["features", "spells", "inventory"].includes(target.tab))
          ? target
          : null;
      ctx.registry.run(create, ctx, {
        targetKind: choices.onlyCompatible ? choices.kind : null,
        returnTo,
      });
      return;
    }
    ctx.dialog(
      ctx.t("Crea un contenuto", "Create content"),
      `<label class="field">${ctx.t("Tipo di contenuto", "Content type")}<select name="type">${hb
        .getHomebrewTypes()
        .filter(
          (type) => !choices.kind || !choices.onlyCompatible || type.targetKind === choices.kind,
        )
        .map((type) => `<option value="${type.id}">${ctx.esc(ctx.label(type.name))}</option>`)
        .join("")}</select></label>`,
      {
        submitLabel: ctx.t("Crea bozza privata", "Create private draft"),
        onSubmit: (data) => startHomebrew(ctx, { type: String(data.get("type")) }),
      },
    );
  });
  root.querySelectorAll("[data-library-scope]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("library", { tab: button.dataset.libraryScope, ...routeContext(ctx) });
  });
  // On a phone the collections scroll sideways like every other strip (D&D Beyond's sheet
  // tabs): the open one is brought into view, also when it is the last one.
  const strip = root.querySelector(".library-tabs");
  if (strip?.getBoundingClientRect) scrollIntoStrip(strip, strip.querySelector("[aria-current]"));
  ctx.registry?.bindSlots(root, ctx, { points: ["library-section"] });
  root.querySelectorAll("[data-library-open]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("library", {
        id: button.dataset.libraryOpen,
        revision: button.dataset.revision,
        tab: currentScope(ctx),
        ...routeContext(ctx),
      });
  });
  root.querySelectorAll("[data-library-resume]").forEach((button) => {
    button.onclick = () => {
      const draft = hb.getHomebrewDraft(ctx.state, button.dataset.libraryResume, ctx.role);
      session = null;
      openDraft(ctx, draft.id, draft.kind, draft.returnTo);
    };
  });
  const search = root.querySelector("[data-library-search]");
  if (search)
    search.onsubmit = (event) => {
      event.preventDefault();
      const next = { ...filters(ctx), q: root.querySelector("[data-library-query]").value.trim() };
      root.querySelectorAll("[data-library-filter]").forEach((input) => {
        next[input.dataset.libraryFilter] = input.value;
      });
      saveFilters(ctx, next);
      ctx.render();
    };
  root.querySelector("[data-library-clear]")?.addEventListener("click", () => {
    saveFilters(ctx, { q: "", type: "", language: "", origin: "" });
    ctx.render();
  });
  // BI-01: favourites from «Disponibili» (collection for Library content, the compendium's
  // private bookmarks for SRD entries) and SRD entries opened in the compendium.
  root.querySelectorAll("[data-library-fav]").forEach((button) => {
    button.onclick = () =>
      safely(ctx, () =>
        ctx.commit(
          ctx.t("Preferiti aggiornati", "Favourites updated"),
          (state) => {
            const contentId = button.dataset.libraryFav;
            const held = (state.libraryCollections?.[ctx.role] ?? []).filter(
              (ref) => ref.contentId === contentId,
            );
            if (held.length)
              for (const ref of held)
                hb.collectHomebrewRevision(state, ref, { collected: false }, ctx.role);
            else
              hb.collectHomebrewRevision(
                state,
                { contentId, revisionId: button.dataset.revision },
                { collected: true },
                ctx.role,
              );
          },
          privateCommit,
        ),
      );
  });
  root.querySelectorAll("[data-library-srd-fav]").forEach((button) => {
    button.onclick = () =>
      safely(ctx, () => compendium.toggleEntryBookmark(ctx, button.dataset.librarySrdFav));
  });
  root.querySelectorAll("[data-library-pack-open]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("library", {
        tab: "adventures-packs",
        revision: `pack:${button.dataset.libraryPackOpen}`,
      });
  });
  root.querySelectorAll("[data-library-srd-open]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("library", { tab: "compendium", revision: button.dataset.librarySrdOpen });
  });
  root
    .querySelector("[data-library-srd-browse]")
    ?.addEventListener("click", () => ctx.navigate("library", { tab: "compendium" }));
  root.querySelector("[data-library-campaign-add]")?.addEventListener("click", () => {
    const add = ctx.registry?.get?.("command", "homebrew-editor.add-campaign-content", ctx);
    if (add) ctx.registry.run(add, ctx);
  });
  root.querySelector("[data-library-import]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    const owner = ctx.role,
      request = ++importGeneration,
      origin = JSON.stringify(ctx.view),
      originSession = session,
      target = returnContext(ctx),
      isCurrent = () =>
        request === importGeneration &&
        owner === ctx.role &&
        origin === JSON.stringify(ctx.view) &&
        session === originSession;
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024)
        throw new Error(
          ctx.t("Scegli un file JSON inferiore a 8 MB.", "Choose a JSON file smaller than 8 MB."),
        );
      let bundle;
      try {
        bundle = JSON.parse(await file.text());
      } catch {
        throw new Error(
          ctx.t(
            "Il file non contiene JSON valido. Esporta un file della Biblioteca e riprova.",
            "The file is not valid JSON. Export a Library file and try again.",
          ),
        );
      }
      if (!isCurrent()) return;
      const id = uid();
      ctx.commit(
        ctx.t("Bozza di importazione creata", "Import draft created"),
        (state) => hb.createHomebrewImportDraft(state, { id, bundle, returnTo: target }, owner),
        privateCommit,
      );
      importError = "";
      session = null;
      ctx.navigate("library", { id, tab: "edit", ...routeContext(ctx, target) });
    } catch (error) {
      if (!isCurrent()) return;
      importError = message(ctx, error);
      ctx.toast(importError, true);
      ctx.render();
    }
  });
  if (ctx.view.tab !== "edit") {
    bindDetail(root, ctx);
    return;
  }
  if (!session || session.owner !== ctx.role || session.id !== ctx.view.id) return;
  let draft;
  try {
    draft = hb.getHomebrewDraft(ctx.state, session.id, ctx.role);
  } catch {
    session = null;
    return;
  }
  if (draft.status !== "active") {
    session = null;
    return;
  }
  root.querySelectorAll("[data-library-path]").forEach((input) => {
    input.addEventListener(
      input.tagName === "SELECT" || input.type === "checkbox" ? "change" : "input",
      () => {
        const value =
          input.type === "checkbox"
            ? input.checked
            : input.type === "number"
              ? input.value.trim() === ""
                ? null
                : Number(input.value)
              : input.value;
        setPath(session.data, input.dataset.libraryPath, value);
        markDirty(root, ctx);
      },
    );
  });
  root.querySelectorAll("[data-library-form]").forEach((form) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      safely(ctx, () => persist(ctx));
    };
  });
  for (const selector of ["[data-library-save]", "[data-library-preview]"])
    root.querySelector(selector)?.addEventListener("click", () =>
      safely(ctx, () => {
        persist(ctx);
        if (selector === "[data-library-preview]") {
          const title = globalThis.document?.querySelector("[data-library-preview-title]");
          title?.focus({ preventScroll: true });
          title?.scrollIntoView({ block: "start", behavior: "instant" });
        }
      }),
    );
  root.querySelectorAll("[data-library-resource]").forEach((button) => {
    button.onclick = () => {
      session.data.resource =
        button.dataset.libraryResource === "add" ? { id: uid(), max: 1, recovery: "manual" } : null;
      markDirty(root, ctx);
      ctx.render();
    };
  });
  root.querySelector("[data-library-add-activity]")?.addEventListener("click", () => {
    (session.data.activities ??= []).push({
      id: uid(),
      kind: "manual",
      name: { it: "", en: "" },
      description: { it: "", en: "" },
    });
    markDirty(root, ctx);
    ctx.render();
  });
  root.querySelectorAll("[data-library-remove-activity]").forEach((button) => {
    button.onclick = () => {
      session.data.activities = session.data.activities.filter(
        (entry) => entry.id !== button.dataset.libraryRemoveActivity,
      );
      markDirty(root, ctx);
      ctx.render();
    };
  });
  root.querySelectorAll("[data-library-resolution]").forEach((input) => {
    input.addEventListener("change", () => {
      (session.data.resolutions ??= {})[input.dataset.libraryResolution] = input.value || null;
      markDirty(root, ctx);
    });
  });
  root.querySelector("[data-library-add-dependency]")?.addEventListener("click", () =>
    safely(ctx, () => {
      const value = root.querySelector("[data-library-dependency]").value;
      if (!value) return;
      const ref = JSON.parse(value);
      const dependencies = (session.data.dependencies ??= []);
      if (
        !dependencies.some(
          (entry) => entry.contentId === ref.contentId && entry.revisionId === ref.revisionId,
        )
      )
        dependencies.push(ref);
      markDirty(root, ctx);
      ctx.render();
    }),
  );
  root.querySelectorAll("[data-library-remove-dependency]").forEach((button) => {
    button.onclick = () => {
      session.data.dependencies.splice(Number(button.dataset.libraryRemoveDependency), 1);
      markDirty(root, ctx);
      ctx.render();
    };
  });
  root.querySelector("[data-library-discard]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Scartare questa bozza?", "Discard this draft?"),
      `<p>${ctx.t("Le revisioni salvate e le copie sulle schede restano invariate.", "Saved revisions and sheet copies stay unchanged.")}</p>`,
      {
        submitLabel: ctx.t("Scarta bozza", "Discard draft"),
        onSubmit: () => {
          ctx.commit(
            ctx.t("Bozza della Biblioteca scartata", "Library draft discarded"),
            (state) => hb.discardHomebrewDraft(state, draft.id, ctx.role),
            privateCommit,
          );
          session = null;
          ctx.navigate("library", { tab: "personal", ...routeContext(ctx, draft.returnTo) });
        },
      },
    ),
  );
  root.querySelector("[data-library-apply]")?.addEventListener("click", () =>
    safely(ctx, () => {
      if (session.dirty || !session.reviewKey) {
        persist(ctx);
        ctx.toast(
          ctx.t(
            "Controlla l’anteprima aggiornata prima di applicare.",
            "Check the updated preview before applying.",
          ),
        );
        return;
      }
      const reviewKey = session.reviewKey;
      let result;
      if (["assign", "update"].includes(draft.kind)) {
        if (!ctx.applyLibraryDraft)
          throw new Error(
            ctx.t(
              "Il collegamento alla scheda non è disponibile.",
              "Sheet integration is unavailable.",
            ),
          );
        result = ctx.applyLibraryDraft(draft.id, reviewKey);
      } else
        ctx.commit(
          ctx.t("Contenuto della Biblioteca salvato", "Library content saved"),
          (state) => {
            result = hb.applyHomebrewDraft(state, draft.id, { reviewKey }, ctx.role);
          },
          privateCommit,
        );
      if (result) finishApply(ctx, result);
    }),
  );
}
function bindDetail(root, ctx) {
  if (!ctx.view.id || !ctx.view.revision) return;
  let revision;
  try {
    revision = hb.getHomebrewRevision(
      ctx.state,
      { contentId: ctx.view.id, revisionId: ctx.view.revision },
      ctx.role,
    );
  } catch {
    return;
  }
  const ref = revision.ref,
    target = returnContext(ctx);
  root.querySelector("[data-library-revision]")?.addEventListener("change", (event) =>
    ctx.navigate("library", {
      id: ref.contentId,
      revision: event.target.value,
      tab: currentScope(ctx),
      ...routeContext(ctx),
    }),
  );
  for (const [selector, kind] of [
    ["[data-library-duplicate]", "duplicate"],
    ["[data-library-revise]", "revise"],
  ])
    root
      .querySelector(selector)
      ?.addEventListener("click", () =>
        startHomebrew(ctx, { kind, type: revision.type, ref, returnTo: target }),
      );
  root
    .querySelector("[data-library-choose]")
    ?.addEventListener("click", () =>
      safely(ctx, () => ctx.chooseLibraryContent?.(ref, checkedChoiceTarget(ctx, revision))),
    );
  root
    .querySelector("[data-library-copy-to]")
    ?.addEventListener("click", () => copyToCampaign(ctx, ref));
  root
    .querySelector("[data-library-return]")
    ?.addEventListener("click", () =>
      ctx.navigate("characters", { id: target.actorId, tab: target.tab }),
    );
  for (const [selector, kind] of [
    ["[data-library-update]", "update"],
    ["[data-library-assign-target]", "assign"],
  ])
    root.querySelector(selector)?.addEventListener("click", () =>
      safely(ctx, () => {
        const current = checkedChoiceTarget(ctx, revision);
        return startHomebrew(ctx, {
          kind,
          ref,
          actorId: current.actorId,
          instanceId: current.instanceId,
          returnTo: current,
        });
      }),
    );
  root.querySelector("[data-library-assign]")?.addEventListener("click", () =>
    safely(ctx, () => {
      const actorId = root.querySelector("[data-library-actor]").value;
      if (!actorId)
        throw new Error(
          ctx.t("Scegli una scheda prima di continuare.", "Choose a sheet before continuing."),
        );
      startHomebrew(ctx, {
        kind: "assign",
        ref,
        type: revision.type,
        actorId,
        returnTo: { page: "characters", actorId, tab: contentTargetKind(revision.type) },
      });
    }),
  );
  root.querySelector("[data-library-collect]")?.addEventListener("click", (event) =>
    safely(ctx, () => {
      const collected =
        root.querySelector("[data-library-collect]").dataset.libraryCollect === "true";
      ctx.commit(
        ctx.t("Raccolta personale aggiornata", "Personal collection updated"),
        (state) => hb.collectHomebrewRevision(state, ref, { collected }, ctx.role),
        privateCommit,
      );
    }),
  );
  root.querySelector("[data-library-enable]")?.addEventListener("click", () =>
    safely(ctx, () => {
      const enabled = root.querySelector("[data-library-enable]").dataset.libraryEnable === "true";
      ctx.commit(
        ctx.t("Disponibilità in campagna aggiornata", "Campaign availability updated"),
        (state) => hb.enableHomebrewRevision(state, ref, { enabled }, ctx.role),
      );
    }),
  );
  root.querySelector("[data-library-share]")?.addEventListener("click", () => {
    const current = hb.getHomebrewRevision(ctx.state, ref, ctx.role),
      access = current.access || { readers: [], editors: [] },
      canExpand = current.permissions.canShare;
    ctx.dialog(
      ctx.t("Accesso a questa revisione", "Access to this revision"),
      `<p>${ctx.t("Condividere rende leggibile il contenuto all’identità scelta. Il DM deve abilitarlo separatamente nella campagna; nessuna scheda viene modificata.", "Sharing makes content readable to the selected identity. The DM enables it separately in the campaign; no sheet changes.")}</p>${!canExpand ? `<p class="library-notice">${ctx.t("Questa fonte non consente nuove condivisioni. Puoi soltanto ridurre o rimuovere gli accessi esistenti.", "This source does not allow new sharing. You can only reduce or remove existing access.")}</p>` : ""}${[
        "player",
        "dm",
      ]
        .filter((role) => role !== revision.owner)
        .map(
          (role) =>
            `<fieldset><legend>${role === "dm" ? "DM" : ctx.t("Giocatore", "Player")}</legend><label class="library-check"><input type="checkbox" name="read-${role}" ${access.readers.includes(role) || access.editors.includes(role) ? "checked" : ""} ${!canExpand && !access.readers.includes(role) && !access.editors.includes(role) ? 'disabled aria-describedby="library-share-why"' : ""}>${ctx.t("Può leggere", "Can read")}</label><label class="library-check"><input type="checkbox" name="edit-${role}" ${access.editors.includes(role) ? "checked" : ""} ${!canExpand && !access.editors.includes(role) ? 'disabled aria-describedby="library-share-why"' : ""}>${ctx.t("Può creare una nuova revisione", "Can create a new revision")}</label></fieldset>`,
        )
        .join(
          "",
        )}${canExpand ? "" : `<p class="muted" id="library-share-why">${ctx.t("I diritti di questa revisione non consentono di condividerla con altri: puoi solo togliere gli accessi già dati.", "This revision’s rights do not allow sharing it further: you can only remove access already given.")}</p>`}`,
      {
        submitLabel: ctx.t("Salva accessi", "Save access"),
        onSubmit: (data) => {
          const editors = ["player", "dm"].filter((role) => data.get(`edit-${role}`));
          const readers = ["player", "dm"].filter(
            (role) => data.get(`read-${role}`) || editors.includes(role),
          );
          ctx.commit(
            ctx.t("Accesso a contenuto aggiornato", "Content access updated"),
            (state) => hb.shareHomebrewRevision(state, ref, { readers, editors }, ctx.role),
            { visibility: "private" },
          );
        },
      },
    );
  });
  root.querySelector("[data-library-export]")?.addEventListener("click", () =>
    safely(ctx, () => {
      const bundle = hb.exportHomebrewBundle(ctx.state, [ref], ctx.role);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "d20-library.json";
      anchor.click();
      URL.revokeObjectURL(url);
    }),
  );
}
