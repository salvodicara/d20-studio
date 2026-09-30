import { rollDie } from "./state.mjs";
import { isCampaignActor } from "./character-access.mjs";
import { xpView } from "./sheet-plus-domain.mjs";
import { quickOf, personalitySuggestions, randomPersonality } from "./builder-plus-domain.mjs";
import {
  BUILD_SECTIONS,
  getCharacterCatalog,
  createCharacterDraft,
  getCharacterDraft,
  listCharacterDrafts,
  saveCharacterDraft,
  discardCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
  beginCharacterRoll,
  resolveCharacterRoll,
  prepareLevelUp,
  getDraftCatalog,
} from "./character-build.mjs";

let session = null;
// «Correggi sezione» target, kept across the save and render that follow the click.
let pendingFix = null;
const operations = new Map();
const uid = () => crypto.randomUUID();
const clone = (value) => structuredClone(value);
const statusNames = {
  complete: ["Completa", "Complete"],
  incomplete: ["Da completare", "To complete"],
  review: ["Da rivedere", "Review needed"],
  "not-applicable": ["Non pertinente", "Not applicable"],
};
const kindNames = {
  create: ["Crea personaggio", "Create character"],
  reconstruct: ["Ricostruisci scheda", "Reconstruct sheet"],
  advance: ["Avanza personaggio", "Advance character"],
  revise: ["Rivedi scelte", "Revise choices"],
};
const names = {
  str: ["Forza", "Strength"],
  dex: ["Destrezza", "Dexterity"],
  con: ["Costituzione", "Constitution"],
  int: ["Intelligenza", "Intelligence"],
  wis: ["Saggezza", "Wisdom"],
  cha: ["Carisma", "Charisma"],
};
const abilityIds = Object.keys(names);
const sectionIds = () => BUILD_SECTIONS.map((section) => section.id);
const msg = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : ctx.label(error?.message || error || "");
const localOptions = { local: true, visibility: "private" };
function readPath(value, path) {
  return path.split(".").reduce((object, key) => object?.[key], value);
}
function setPath(value, path, next) {
  const parts = path.split(".");
  if (parts.some((key) => ["__proto__", "constructor", "prototype"].includes(key))) return;
  let object = value;
  for (let index = 0; index < parts.length - 1; index++)
    object = object[parts[index]] ??= /^\d+$/.test(parts[index + 1]) ? [] : {};
  object[parts.at(-1)] = next;
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
      data: clone(draft.data),
      revision: draft.revision,
      dirty: false,
      section: draft.section || "identity",
      showOtherFeats: false,
      rollFaces:
        session?.id === draft.id && session.owner === ctx.role ? session.rollFaces || {} : {},
      renderedSection:
        session?.id === draft.id && session.owner === ctx.role ? session.renderedSection : null,
    };
  return session;
}
function draftFor(ctx) {
  return getCharacterDraft(ctx.state, ctx.view.id, ctx.role);
}
function currentPreview(ctx, draft) {
  const state = {
    ...ctx.state,
    characterDrafts: ctx.state.characterDrafts.map((value) =>
      value.id === draft.id ? { ...value, data: clone(session.data) } : value,
    ),
  };
  return previewCharacterDraft(state, draft.id, ctx.role);
}
function safe(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(msg(ctx, error), true);
    if (error.code === "stale-review") ctx.render();
    return false;
  }
}
function persist(ctx, section = session?.section) {
  if (!session) return false;
  const snapshot = clone(session),
    data = clone(session.data);
  session.dirty = false;
  try {
    ctx.commit(
      ctx.t("Bozza personaggio salvata", "Character draft saved"),
      (state) =>
        saveCharacterDraft(
          state,
          snapshot.id,
          { data, section, expectedRevision: snapshot.revision },
          ctx.role,
        ),
      localOptions,
    );
    return true;
  } catch (error) {
    session = snapshot;
    throw error;
  }
}
function updateStatus(root, ctx) {
  const node = root.querySelector("[data-builder-status]");
  if (node)
    node.textContent = session.dirty
      ? ctx.t("Modifiche non salvate · bozza privata", "Unsaved changes · private draft")
      : ctx.storageError
        ? ctx.t(
            "Conservata in questa scheda; memoria del browser non disponibile",
            "Kept in this tab; browser storage unavailable",
          )
        : ctx.t(
            "Bozza privata salvata su questo dispositivo",
            "Private draft saved on this device",
          );
}
function touch(root, ctx) {
  session.dirty = true;
  updateStatus(root, ctx);
}
export function hasCharacterBuilderDraft() {
  return Boolean(session?.dirty);
}
export function resetCharacterBuilderView() {
  session = null;
}
export function startCharacterBuilder(ctx, { kind = "create", actorId } = {}) {
  return safe(ctx, () => {
    const id = uid();
    ctx.commit(
      ctx.t("Bozza personaggio iniziata", "Character draft started"),
      (state) => {
        createCharacterDraft(state, { id, kind, actorId }, ctx.role);
        if (kind === "advance") prepareLevelUp(state, id, ctx.role);
      },
      localOptions,
    );
    session = null;
    // A level up lands on the first section that needs a choice for the new level, or
    // straight on the review with its before/after comparison (one click, new level only).
    let tab;
    if (kind === "advance") {
      const preview = previewCharacterDraft(ctx.state, id, ctx.role);
      tab =
        (preview.sections || []).find(
          (section) => section.id !== "review" && section.status === "incomplete",
        )?.id ?? "review";
    }
    ctx.navigate("builder", tab ? { id, tab } : { id });
    return id;
  });
}
export function confirmCharacterBuilderNavigation(ctx, callback) {
  if (!session?.dirty) {
    callback();
    return;
  }
  ctx.dialog(
    ctx.t("Conservare le modifiche alla bozza?", "Keep changes to the draft?"),
    `<p>${ctx.t("La scheda in gioco resta invariata. Puoi salvare i campi incompleti e riprenderli dopo.", "The sheet in play stays unchanged. Save incomplete fields and return to them later.")}</p><button class="button quiet" type="button" data-builder-discard-unsaved>${ctx.t("Scarta solo le modifiche non salvate", "Discard only unsaved changes")}</button>`,
    {
      submitLabel: ctx.t("Salva e continua", "Save and continue"),
      cancelLabel: ctx.t("Resta nella bozza", "Stay in draft"),
      onSubmit: () => {
        persist(ctx);
        callback();
      },
    },
  );
  document.querySelector("[data-builder-discard-unsaved]")?.addEventListener("click", () => {
    session = null;
    ctx.closeDialog();
    callback();
  });
}
function field(ctx, path, label, type = "text", extra = "") {
  const value = readPath(session.data, path);
  return `<label class="field">${ctx.esc(label)}<input data-builder-path="${path}" type="${type}" value="${ctx.esc(value ?? "")}" ${extra}></label>`;
}
function textarea(ctx, path, label) {
  return `<label class="field">${ctx.esc(label)}<textarea data-builder-path="${path}" rows="4">${ctx.esc(readPath(session.data, path) ?? "")}</textarea></label>`;
}
function checkbox(ctx, path, label) {
  return `<label class="builder-check"><input type="checkbox" data-builder-path="${path}" ${readPath(session.data, path) ? "checked" : ""}> ${label}</label>`;
}
function select(ctx, path, label, options, { empty = true } = {}) {
  const current = readPath(session.data, path);
  return `<label class="field">${ctx.esc(label)}<select data-builder-path="${path}">${empty ? `<option value="">${ctx.t("Scegli…", "Choose…")}</option>` : ""}${options
    .map((option) => {
      const value = typeof option === "string" ? option : option.id;
      return `<option value="${ctx.esc(value)}" ${String(current ?? "") === String(value) ? "selected" : ""} ${option.available === false ? "disabled" : ""}>${ctx.esc(ctx.label(option.name || option.label || option))}${option.available === false ? ctx.t(" · non disponibile", " · unavailable") : ""}</option>`;
    })
    .join("")}</select></label>`;
}
function sourceText(ctx, source) {
  if (!source) return ctx.t("Provenienza da completare", "Provenance to complete");
  // PG-06: an internal revision id («revision-6768…», a homebrew revision) is not for people.
  const revision =
    typeof source.revision === "string" &&
    !/^(revision-|content-|hb-|sheet-correction-)|[0-9a-f]{8}-[0-9a-f]{4}/i.test(source.revision)
      ? source.revision
      : null;
  return [
    // A homebrew entry says so, also when its author named an SRD structure as its source.
    source.kind === "homebrew" ? ctx.t("Homebrew", "Homebrew") : null,
    ctx.label(source.title || source.label || source.name || source.kind),
    source.edition,
    revision,
    source.pages?.length ? ctx.t("pagine ", "pages ") + source.pages.join(", ") : null,
  ]
    .filter(Boolean)
    .map((value) => ctx.esc(value))
    .join(" · ");
}
function detailsButton(ctx, type, id) {
  return `<button type="button" class="button quiet" data-builder-detail="${type}" data-id="${ctx.esc(id)}">${ctx.t("Dettagli e fonte", "Details and source")}</button>`;
}
// B20 campaign policy (campaign-settings.mjs): the current campaign's source states
// (Roll20 R20-183, the legacy 2014 source blocked) and its multiclassing rule (BG3 CRP-040).
const campaignPolicy = (ctx) =>
  ctx.state.ext?.["campaign-settings"]?.campaigns?.[ctx.state.campaign?.id]?.policy ?? null;
function campaignSources(ctx) {
  const policy = campaignPolicy(ctx);
  if (!policy) return "";
  return `<section class="builder-campaign-sources" aria-labelledby="builder-campaign-sources"><h3 id="builder-campaign-sources">${ctx.t("Fonti della campagna", "Campaign sources")} · ${ctx.esc(ctx.state.campaign?.name ?? "")}</h3><ul><li class="builder-breakdown">${ctx.t("SRD 5.2.1 · regole 2024: disponibile", "SRD 5.2.1 · 2024 rules: available")}</li>${policy.legacySources === "blocked" ? `<li class="builder-breakdown" data-builder-source-blocked="legacy-2014"><label class="builder-check"><input type="checkbox" disabled aria-describedby="builder-legacy-reason"> ${ctx.t("Contenuti legacy 2014 (SRD 5.1)", "Legacy 2014 content (SRD 5.1)")}</label> <strong>${ctx.t("bloccata in questa campagna", "blocked in this campaign")}</strong> <span id="builder-legacy-reason">· ${ctx.t("la campagna usa le regole 2024, fissate alla creazione", "the campaign uses the 2024 rules, fixed at creation")}</span></li>` : ""}</ul></section>`;
}
// Roll20 review slide / DDB «Sheet Ready»: each distinct problem once, and «Correggi» lands on
// the exact field (or the section's first empty one), even from inside that section.
function issueList(ctx, errors, title) {
  const seen = new Set(),
    unique = (errors || []).filter((error) => {
      const key = error.section + "|" + msg(ctx, error);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (!unique.length) return "";
  return `<section class="builder-errors"><h3>${title}</h3><ul>${unique.map((error) => `<li>${ctx.esc(msg(ctx, error))} <button type="button" class="text-button" data-builder-section="${ctx.esc(error.section || "review")}" data-builder-fix="${ctx.esc(typeof error.path === "string" && error.path.includes(".") ? error.path : "")}">${ctx.t("Correggi sezione", "Correct section")}</button></li>`).join("")}</ul></section>`;
}
// The field a «Correggi» jump should land on: the error's own path, else the first empty
// control of the section form.
function fixTarget(root, path) {
  const esc = (value) => (globalThis.CSS?.escape ? CSS.escape(value) : value);
  const exact = path
    ? root.querySelector(
        `[data-builder-path="${esc(path)}"], [data-builder-list="${esc(path)}"], [data-builder-lines="${esc(path)}"]`,
      )
    : null;
  if (exact) return exact;
  return (
    [...root.querySelectorAll(".builder-main [data-builder-path]")].find(
      (input) =>
        !input.disabled &&
        !input.readOnly &&
        (input.type === "checkbox" ? !input.checked : String(input.value ?? "").trim() === ""),
    ) ??
    root.querySelector(".builder-main select, .builder-main input, .builder-main textarea") ??
    null
  );
}
function summaryName(ctx, draft) {
  return (
    session?.data.identity?.name?.trim() || ctx.t("Personaggio senza nome", "Unnamed character")
  );
}
// Section panels contributed by an area (B39 builder-plus seam, additive). A panel is
// {id, sections: [section ids, or "drafts" for the drafts list], placement?: "start" |
// "end", render(ctx, api) → html, bind?(el, ctx, api)}. The api reads this identity's
// working draft (unsaved edits included) and changes it through the builder's own session,
// saving it as the builder does. Each call is isolated: a failing panel never breaks the
// builder. With no panel registered the markup is unchanged.
const builderPanels = [];
export function registerBuilderPanel(panel) {
  if (!panel?.id || typeof panel.render !== "function" || !Array.isArray(panel.sections))
    throw Error("Invalid builder panel");
  const index = builderPanels.findIndex((entry) => entry.id === panel.id);
  if (index >= 0) builderPanels.splice(index, 1, panel);
  else builderPanels.push(panel);
}
function panelApi(ctx, draft, section) {
  return {
    draft,
    section,
    data: () => clone(session && draft && session.id === draft.id ? session.data : draft?.data),
    dirty: () => Boolean(session?.dirty),
    preview: () =>
      session && draft && session.id === draft.id ? currentPreview(ctx, draft) : null,
    change(mutator) {
      if (!session || !draft || session.id !== draft.id) return false;
      mutator(session.data);
      session.dirty = true;
      return safe(ctx, () => persist(ctx));
    },
  };
}
function renderPanels(ctx, section, draft, placement = "end") {
  return builderPanels
    .filter((panel) => panel.sections.includes(section) && (panel.placement ?? "end") === placement)
    .map((panel) => {
      try {
        const html = panel.render(ctx, panelApi(ctx, draft, section));
        return html ? `<div data-builder-panel="${ctx.esc(panel.id)}">${html}</div>` : "";
      } catch (error) {
        console.warn(error);
        return `<p class="ext-error" role="status">${ctx.t("Un riquadro aggiuntivo non è disponibile.", "An additional panel is unavailable.")}</p>`;
      }
    })
    .join("");
}
function bindPanels(root, ctx) {
  if (!builderPanels.length || !root?.querySelectorAll) return;
  let draft = null;
  if (ctx.view.id && session?.id === ctx.view.id && session.owner === ctx.role)
    try {
      draft = draftFor(ctx);
    } catch {
      draft = null;
    }
  const section = draft?.status === "active" ? session.section : "drafts";
  for (const panel of builderPanels)
    for (const el of root.querySelectorAll(`[data-builder-panel="${panel.id}"]`))
      try {
        panel.bind?.(el, ctx, panelApi(ctx, draft?.status === "active" ? draft : null, section));
      } catch (error) {
        console.warn(error);
      }
}
function renderDrafts(ctx) {
  const drafts = listCharacterDrafts(ctx.state, ctx.role);
  return `<div class="page-heading"><div><h1>${ctx.t("Bozze dei personaggi", "Character drafts")}</h1><p class="muted">${ctx.t("Solo le tue proposte private. Riprendere non applica modifiche alla scheda.", "Your private proposals. Resuming does not apply changes to a sheet.")}</p></div><button class="button primary" data-builder-new>${ctx.t("Nuovo personaggio", "New character")}</button></div><div class="builder-drafts">${
    drafts
      .filter((draft) => draft.status === "active")
      .map(
        (draft) =>
          `<article class="builder-draft-row"><div><h2>${ctx.esc(draft.data?.identity?.name || ctx.t("Personaggio senza nome", "Unnamed character"))}</h2><p>${quickOf(ctx.state, draft.id, ctx.role)?.status === "active" ? ctx.t("Percorso rapido", "Quick path") : ctx.t(...(kindNames[draft.kind] || kindNames.create))}</p></div><button class="button" data-builder-resume="${ctx.esc(draft.id)}">${ctx.t("Riprendi bozza", "Resume draft")}</button></article>`,
      )
      .join("") ||
    `<p class="empty-state">${ctx.t("Nessuna bozza salvata.", "No saved drafts.")}</p>`
  }</div>${renderPanels(ctx, "drafts", null)}`;
}
export function renderCharacterBuilder(ctx) {
  if (!ctx.view.id) {
    session = null;
    return renderDrafts(ctx);
  }
  let draft;
  try {
    draft = draftFor(ctx);
  } catch {
    session = null;
    return `<p class="empty-state">${ctx.t("Questa bozza non è disponibile per la tua identità.", "This draft is unavailable to your identity.")}</p><button class="button" data-builder-home>${ctx.t("Torna a Personaggi", "Return to Characters")}</button>`;
  }
  if (!draft || draft.status !== "active") {
    session = null;
    return renderDrafts(ctx);
  }
  ensureSession(ctx, draft);
  // BI-22: the draft's catalogue includes the homebrew classes it may use.
  const catalog = getDraftCatalog(ctx.state, draft.id, ctx.role),
    preview = currentPreview(ctx, draft);
  const requested = ctx.view.tab || draft.section || "identity";
  const section = sectionIds().includes(requested) ? requested : "identity";
  session.section = section;
  if (session.renderedSection !== section) session.focusSection = true;
  session.renderedSection = section;
  const current = BUILD_SECTIONS.find((item) => item.id === section),
    index = sectionIds().indexOf(section);
  if (section === "review") session.reviewKey = preview.reviewKey;
  const sections = preview.sections || [];
  return `<div class="page-heading builder-heading"><div><h1>${ctx.t(...(kindNames[draft.kind] || kindNames.create))}</h1><p>${ctx.esc(summaryName(ctx, draft))} · ${ctx.t("Bozza privata", "Private draft")}</p></div><div class="toolbar"><button class="button quiet" data-builder-return>${draft.actorId ? ctx.t("Torna alla scheda", "Back to sheet") : ctx.t("Torna ai personaggi", "Back to characters")}</button><button class="button" data-builder-save>${ctx.t("Salva bozza", "Save draft")}</button><button class="button quiet" data-builder-discard>${ctx.t("Scarta bozza", "Discard draft")}</button></div></div><p class="builder-status" role="status" data-builder-status>${session.dirty ? ctx.t("Modifiche non salvate · bozza privata", "Unsaved changes · private draft") : ctx.storageError ? ctx.t("Solo in questa scheda: memoria del browser non disponibile", "Only in this tab: browser storage unavailable") : ctx.t("Bozza privata salvata su questo dispositivo", "Private draft saved on this device")}</p><div class="builder-layout"><nav class="builder-sections" aria-label="${ctx.t("Sezioni della costruzione", "Character building sections")}">${BUILD_SECTIONS.map(
    (item) => {
      const status = sections.find((value) => value.id === item.id) || { status: "incomplete" };
      return `<button type="button" class="builder-section-link" data-builder-section="${item.id}" ${section === item.id ? 'aria-current="step"' : ""}><span>${ctx.esc(ctx.label(item.name))}</span><small class="${status.status === "review" ? "builder-attention" : ""}">${ctx.t(...(statusNames[status.status] || statusNames.incomplete))}${status.errors?.[0] ? `<span class="builder-section-reason"> · ${ctx.esc(msg(ctx, status.errors[0]))}</span>` : ""}</small></button>`;
    },
  ).join(
    "",
  )}</nav><section class="builder-main"><h2 tabindex="-1" data-builder-section-title>${ctx.esc(ctx.label(current.name))}</h2>${renderPanels(ctx, section, draft, "start")}${renderSection(ctx, draft, catalog, preview, section)}${renderPanels(ctx, section, draft)}${
    section !== "review"
      ? issueList(
          ctx,
          (preview.errors || []).filter((error) => error.section === section),
          ctx.t("Da completare in questa sezione", "To complete in this section"),
        )
      : ""
  }<footer class="builder-footer">${index > 0 ? `<button class="button" data-builder-section="${sectionIds()[index - 1]}">${ctx.t("Indietro", "Back")}</button>` : "<span></span>"}${index < sectionIds().length - 1 ? `<button class="button primary" data-builder-section="${sectionIds()[index + 1]}">${ctx.t("Salva e avanti", "Save and continue")}</button>` : ""}</footer></section></div>`;
}

function renderSection(ctx, draft, catalog, preview, section) {
  const { t, esc } = ctx,
    d = session.data,
    classes = d.classes?.length ? d.classes : [{ classId: "", level: 1, subclassId: null }],
    total = classes.reduce((sum, row) => sum + (Number(row.level) || 0), 0);
  if (section === "identity")
    return `<p class="builder-intro">${t("Puoi iniziare senza nome e completare i dettagli in seguito. Creare la scheda non la inserisce in una scena o in iniziativa.", "Start without a name and complete details later. Creating a sheet does not place it in a scene or initiative.")}</p><form class="builder-form" data-builder-form>${field(ctx, "identity.name", t("Nome facoltativo", "Optional name"), "text", 'maxlength="100"')}<p class="builder-manual-note">${draft.actorId ? t("La proposta è privata. Visibilità e collegamenti della scheda attuale restano quelli già scelti.", "This proposal is private. The current sheet retains its existing visibility and links.") : t("La nuova scheda sarà privata. Dalla scheda potrai collegarla alla campagna con un passaggio esplicito che mostra chi potrà leggerla e controllarla.", "The new sheet will be private. From the sheet, you can explicitly link it to a campaign and see who will be able to read and control it.")}</p></form>`;
  if (section === "sources") {
    const sources = new Map();
    for (const entries of [
      catalog.classes,
      catalog.backgrounds,
      catalog.species,
      catalog.feats,
      catalog.spells,
    ])
      for (const entry of entries || [])
        if (entry.source)
          sources.set(
            [
              entry.source.kind,
              entry.source.edition,
              entry.source.revision,
              entry.source.url,
              entry.source.sha256,
            ].join(":"),
            { ...entry.source, pages: [] },
          );
    return `<p class="builder-intro">${t("Le scelte conservano fonte, edizione e revisione. Abilitare una fonte nella bozza non cambia gli accordi della campagna.", "Choices retain source, edition and revision. Enabling a draft source does not change campaign agreements.")}</p><form class="builder-form" data-builder-form><label class="builder-check"><input type="checkbox" data-builder-list="sources.enabled" value="srd-2024" ${(d.sources?.enabled || []).includes("srd-2024") ? "checked" : ""}> ${t("Regole SRD 2024 · revisione 5.2.1", "2024 SRD rules · revision 5.2.1")}</label>${textarea(ctx, "sources.manualReason", t("Origine dei dati manuali o accordi del gruppo", "Origin of manual data or group agreements"))}</form>${campaignSources(ctx)}<h3>${t("Provenienza del catalogo disponibile", "Available catalog provenance")}</h3><ul>${[...sources.values()].map((source) => `<li class="builder-breakdown">${sourceText(ctx, source)}${source.url ? ` · <a target="_blank" rel="noopener noreferrer" href="${esc(source.url)}">${t("Apri fonte", "Open source")}</a>` : ""}</li>`).join("")}</ul><details class="builder-help"><summary>${t("Copertura e dati manuali", "Coverage and manual data")}</summary>${(catalog.coverage || []).map((text) => `<p>${esc(ctx.label(text))}</p>`).join("")}<p>${t("I contenuti non disponibili non sono ricostruiti dal nome. Le voci manuali richiedono una provenienza e non ricevono regole automatiche inventate.", "Unavailable content is not reconstructed from its name. Manual entries need provenance and receive no invented automatic rules.")}</p></details>`;
  }
  if (section === "class")
    return `<p class="builder-intro">${t("Distingui i livelli di ciascuna classe dal totale. Cambiare qui prepara una proposta; la scheda attuale resta invariata.", "Keep each class level distinct from the total. Changes here prepare a proposal; the current sheet stays unchanged.")}</p><form class="builder-form" data-builder-form>${classes
      .map((row, index) => {
        const entry = (catalog.classes || []).find((item) => item.id === row.classId);
        return `<fieldset><legend>${t("Classe", "Class")} ${index + 1}</legend><div class="form-grid">${select(ctx, `classes.${index}.classId`, t("Classe", "Class"), catalog.classes || [])}${browseButton(ctx, "classes", `classes.${index}.classId`)}${field(ctx, `classes.${index}.level`, t("Livello nella classe", "Class level"), "number", 'min="1" max="20" step="1"')}</div>${
          entry
            ? `<p class="builder-source">${sourceText(ctx, entry.source)}</p>${detailsButton(ctx, "classes", entry.id)}${
                (entry.subclasses || []).length
                  ? select(
                      ctx,
                      `classes.${index}.subclassId`,
                      t("Sottoclasse, al livello previsto", "Subclass, at the required level"),
                      entry.subclasses.map((sub) =>
                        sub.homebrew
                          ? {
                              ...sub,
                              name: {
                                it: `${sub.name.it} · homebrew`,
                                en: `${sub.name.en} · homebrew`,
                              },
                            }
                          : sub.pack
                            ? {
                                ...sub,
                                name: {
                                  it: `${sub.name.it} · pacchetto, p. ${sub.source.pages[0]}`,
                                  en: `${sub.name.en} · pack, p. ${sub.source.pages[0]}`,
                                },
                              }
                            : sub,
                      ),
                    )
                  : ""
              }`
            : ""
        }<button class="button quiet" type="button" data-builder-remove-class="${index}">${t("Rimuovi dalla bozza", "Remove from draft")}</button></fieldset>`;
      })
      .join(
        "",
      )}${campaignPolicy(ctx)?.multiclass === "forbidden" ? `<button class="button" type="button" data-builder-add-class disabled aria-describedby="builder-multiclass-lock">${t("Aggiungi classe", "Add class")}</button><p id="builder-multiclass-lock" class="builder-manual-note">${t("Multiclasse non consentito in questa campagna: regola della casa del DM.", "Multiclassing is not allowed in this campaign: a DM house rule.")}</p>` : `<button class="button" type="button" data-builder-add-class>${t("Aggiungi classe", "Add class")}</button>`}<p><strong>${t("Livello totale: ", "Total level: ")}${total}</strong></p><button type="button" class="button" data-builder-refresh>${t("Aggiorna scelte e PF", "Update choices and HP")}</button>${classes.length > 1 && total <= 20 ? `<fieldset><legend>${t("Ordine dei livelli · prima classe distinta", "Level order · first class is distinct")}</legend><div class="form-grid">${Array.from({ length: Math.max(0, total) }, (_, index) => select(ctx, `levelOrder.${index}`, t("Livello totale ", "Total level ") + (index + 1), classes.map((row) => (catalog.classes || []).find((entry) => entry.id === row.classId)).filter(Boolean))).join("")}</div></fieldset>` : ""}${advancementLine(ctx, draft)}${renderHitPoints(ctx, draft, total, preview)}</form>`;
  if (section === "origin") {
    const bg = (catalog.backgrounds || []).find((item) => item.id === d.origin?.backgroundId),
      species = (catalog.species || []).find((item) => item.id === d.origin?.speciesId);
    // DDB 2024 origin: the background shows its origin feat and only the three abilities it
    // may raise; an increase not yet assigned is flagged on the fieldset itself.
    const feat = bg && (catalog.feats || []).find((item) => item.id === bg.featId),
      increasesMissing = (preview.errors || []).some(
        (error) => error.code === "background-increases",
      ),
      allowedNames = (bg?.abilities || []).map((id) => t(...names[id])).join(", ");
    const lineageCantrip =
      species?.id === "elf" && d.origin?.choices?.lineage === "high"
        ? select(
            ctx,
            "origin.choices.lineageCantrip",
            t(
              "Trucchetto dell’Elfo alto (Prestidigitazione o un altro del Mago)",
              "High Elf cantrip (Prestidigitation or another Wizard cantrip)",
            ),
            (catalog.spells || []).filter(
              (spell) => spell.level === 0 && (spell.classes || []).includes("wizard"),
            ),
            { empty: false },
          ).replace(
            'value="prestidigitation" ',
            `value="prestidigitation" ${d.origin?.choices?.lineageCantrip ? "" : "selected"} `,
          )
        : species?.id === "elf" && d.origin?.choices?.lineage === "wood"
          ? `<p class="builder-breakdown" data-builder-lineage-grant>${t("Retaggio elfico: conosci il trucchetto Artificio druidico.", "Elven Lineage: you know the Druidcraft cantrip.")}</p>`
          : "";
    return `<form class="builder-form" data-builder-form>${select(ctx, "origin.backgroundId", t("Background", "Background"), catalog.backgrounds || [])}${browseButton(ctx, "backgrounds", "origin.backgroundId")}${
      bg
        ? `<p class="builder-source">${sourceText(ctx, bg.source)}</p>${detailsButton(ctx, "backgrounds", bg.id)}${feat ? `<p class="builder-origin-feat" data-builder-origin-feat><strong>${t("Talento di origine", "Origin feat")}:</strong> ${esc(ctx.label(feat.name))} ${detailsButton(ctx, "feats", feat.id)}</p>` : ""}<fieldset class="${increasesMissing ? "builder-attention-box" : ""}" data-builder-increases><legend>${t("Aumenti del background", "Background increases")}${increasesMissing ? ` <span class="builder-attention">(!) ${t("da assegnare", "to assign")}</span>` : ""}</legend><p>${t("Distribuisci +2 e +1 su due caratteristiche oppure +1 su tutte e tre. Non è un aumento della specie.", "Assign +2 and +1 to two abilities, or +1 to all three. This is not a species increase.")}</p><div class="builder-ability-grid">${abilityIds
            .filter((id) => {
              const value = d.origin?.backgroundBonuses?.[id];
              return (bg.abilities || []).includes(id) || (value !== undefined && value !== 0);
            })
            .map((id) => {
              const allowed = (bg.abilities || []).includes(id);
              return field(
                ctx,
                `origin.backgroundBonuses.${id}`,
                t(...names[id]) +
                  (!allowed
                    ? t(" · azzera per questo background", " · clear for this background")
                    : ""),
                "number",
                `min="0" max="${allowed ? 2 : 0}" step="1"`,
              );
            })
            .join(
              "",
            )}</div><p class="muted">${esc(t(`${ctx.label(bg.name)} può aumentare solo ${allowedNames}; le altre caratteristiche non ricevono aumenti dal background.`, `${ctx.label(bg.name)} can raise only ${allowedNames}; other abilities get no background increase.`))}</p></fieldset>`
        : ""
    }${select(ctx, "origin.speciesId", t("Specie", "Species"), catalog.species || [])}${browseButton(ctx, "species", "origin.speciesId")}${species ? `<p class="builder-source">${sourceText(ctx, species.source)}</p>${detailsButton(ctx, "species", species.id)}${(species.choices || []).map((choice) => select(ctx, `origin.choices.${choice.id}`, ctx.label(choice.name), choice.options)).join("")}${lineageCantrip}` : ""}</form>`;
  }
  if (section === "abilities") return renderAbilities(ctx, draft, preview);
  if (section === "skills") {
    const grant = preview.choices?.classSkills,
      bg = catalog.backgrounds.find((entry) => entry.id === d.origin?.backgroundId),
      granted = bg?.skills || [],
      speciesEntry = catalog.species.find((entry) => entry.id === d.origin?.speciesId),
      speciesChoice = speciesEntry?.choices?.find((choice) => choice.id === "skill"),
      speciesSkill = speciesChoice ? d.origin?.choices?.skill : null;
    const options = [...(grant?.options || [])];
    for (const id of d.skills?.selected || [])
      if (!options.some((entry) => entry.id === id)) {
        const entry = catalog.skills.find((entry) => entry.id === id);
        if (entry) options.push(entry);
      }
    return `<p class="builder-intro">${t("Le competenze mantengono la propria origine. Scegli quelle della classe iniziale senza duplicare il background.", "Proficiencies keep their origin. Choose initial class skills without duplicating the background.")}</p><p>${t("Concesse dal background: ", "Granted by background: ")}${esc(granted.map((id) => ctx.label(catalog.skills.find((entry) => entry.id === id)?.name || id)).join(", ") || "—")}</p>${speciesSkill ? `<p data-builder-species-skill>${t("Concessa dalla specie: ", "Granted by species: ")}${esc(ctx.label(catalog.skills.find((entry) => entry.id === speciesSkill)?.name || speciesSkill))} · ${esc(ctx.label(speciesEntry.name))} (${esc(ctx.label(speciesChoice.name))})</p>` : ""}<form class="builder-form" data-builder-form><h3>${t("Scelte della classe iniziale", "Initial class choices")} · ${(d.skills?.selected || []).length}/${grant?.count ?? "—"}</h3><div class="builder-choices">${options.map((entry) => `<label class="builder-check"><input type="checkbox" data-builder-list="skills.selected" value="${esc(entry.id)}" ${(d.skills?.selected || []).includes(entry.id) ? "checked" : ""}>${esc(ctx.label(entry.name))}${granted.includes(entry.id) ? t(" · già dal background", " · already from background") : speciesSkill === entry.id ? t(" · già dalla specie", " · already from species") : ""}</label>`).join("")}</div><h3>${t("Due lingue oltre al Comune", "Two languages in addition to Common")} · ${(d.skills?.languages || []).length}/2</h3>${(
      catalog.languages || []
    )
      .filter((entry) => entry.id !== "common")
      .map(
        (entry) =>
          `<label class="builder-check"><input type="checkbox" data-builder-list="skills.languages" value="${esc(entry.id)}" ${(d.skills?.languages || []).includes(entry.id) ? "checked" : ""}>${esc(ctx.label(entry.name))}</label>`,
      )
      .join(
        "",
      )}<label class="field">${t("Strumenti noti (uno per riga)", "Known tools (one per line)")}<textarea data-builder-lines="skills.tools">${esc((d.skills?.tools || []).join("\n"))}</textarea></label>${checkbox(ctx, "skills.confirmed", t("Ho controllato quantità, origine e duplicati", "I checked counts, origins and duplicates"))}</form>`;
  }
  if (section === "features") return renderFeatures(ctx, draft, catalog, preview);
  if (section === "spells") return renderSpells(ctx, draft, catalog, preview);
  if (section === "equipment") return renderEquipment(ctx, draft, catalog, preview);
  if (section === "story")
    return `<p class="builder-intro">${t("Storia e nome non sono obbligatori. Questi testi appartengono alla scheda: gli Appunti Solo io rimangono separati.", "Story and name are optional. These texts belong to the sheet; Only me notes remain separate.")}</p><form class="builder-form" data-builder-form>${textarea(ctx, "story.description", t("Aspetto e descrizione", "Appearance and description"))}${textarea(ctx, "story.backstory", t("Storia e motivazioni", "Story and motivations"))}</form>${renderPersonality(ctx)}<button class="button quiet" data-builder-private-notes>${t("Apri Appunti Solo io", "Open Only me notes")}</button>`;
  return renderReview(ctx, draft, catalog, preview);
}

// ---------------------------------------------------------------- compendium picker (PG-06)

// dnd5e Compendium Browser locked to the choice: search, filters, a preview and «Scegli»
// for class, background and species, with «Crea variante» towards the homebrew editor.
function browseButton(ctx, kind, path) {
  const names = {
    classes: ["Sfoglia le classi…", "Browse classes…"],
    backgrounds: ["Sfoglia i background…", "Browse backgrounds…"],
    species: ["Sfoglia le specie…", "Browse species…"],
  };
  return `<button type="button" class="button quiet builder-browse" data-builder-browse="${kind}" data-path="${ctx.esc(path)}">${ctx.t(...names[kind])}</button>`;
}
const PICKER_FILTERS = {
  classes: [
    ["all", "Tutte", "All", () => true],
    ["caster", "Incantatori", "Spellcasters", (c) => c.caster && c.caster !== "none"],
    ["martial", "Senza incantesimi", "No spellcasting", (c) => !c.caster || c.caster === "none"],
    ["homebrew", "Homebrew", "Homebrew", (c) => Boolean(c.homebrew)],
  ],
  backgrounds: [
    ["all", "Tutti", "All", () => true],
    ...["str", "dex", "con", "int", "wis", "cha"].map((id) => [
      id,
      ...names[id],
      (bg) => (bg.abilities || []).includes(id),
    ]),
  ],
  species: [
    ["all", "Tutte", "All", () => true],
    ["medium", "Media", "Medium", (sp) => sp.size === "medium" || sp.size === "choice"],
    ["small", "Piccola", "Small", (sp) => sp.size === "small" || sp.size === "choice"],
  ],
};
function pickerPreview(ctx, catalog, kind, entry) {
  const { t, esc } = ctx;
  if (!entry)
    return `<p class="muted">${t("Scegli una voce per vederne i dettagli.", "Pick an entry to see its details.")}</p>`;
  const fact = (label, value) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : "");
  const skillNames = (ids) =>
    ids
      .map((id) => esc(ctx.label(catalog.skills.find((row) => row.id === id)?.name || id)))
      .join(", ");
  let facts = "";
  if (kind === "classes")
    facts =
      fact(t("Dado Vita", "Hit Die"), "d" + entry.hitDie) +
      fact(
        t("Caratteristica primaria", "Primary ability"),
        (entry.primaryAbilities || [])
          .map((id) => t(...names[id]))
          .join(entry.primaryMode === "any" ? t(" o ", " or ") : " + "),
      ) +
      fact(
        t("Tiri salvezza", "Saving throws"),
        (entry.savingThrows || []).map((id) => t(...names[id])).join(", "),
      ) +
      fact(
        t("Privilegi di 1° livello", "Level 1 features"),
        [
          ...(entry.features || []),
          ...(entry.advancement || [])
            .filter((row) => row.level === 1 && row.type === "grant")
            .flatMap((row) => row.features || []),
        ]
          .map((f) => esc(ctx.label(f.name)))
          .join(", "),
      );
  if (kind === "backgrounds") {
    const feat = catalog.feats.find((row) => row.id === entry.featId);
    facts =
      fact(
        t("Aumenti possibili", "Possible increases"),
        (entry.abilities || []).map((id) => t(...names[id])).join(", "),
      ) +
      fact(t("Abilità", "Skills"), skillNames(entry.skills || [])) +
      fact(t("Talento di origine", "Origin feat"), feat ? esc(ctx.label(feat.name)) : "");
  }
  if (kind === "species")
    facts =
      fact(
        t("Taglia", "Size"),
        esc(
          entry.size === "choice"
            ? t("Piccola o Media", "Small or Medium")
            : entry.size === "small"
              ? t("Piccola", "Small")
              : t("Media", "Medium"),
        ),
      ) +
      fact(t("Velocità", "Speed"), esc(entry.speed) + " m") +
      fact(
        t("Tratti", "Traits"),
        (entry.features || []).map((f) => esc(ctx.label(f.name))).join(", "),
      );
  return `<h3>${esc(ctx.label(entry.name))}</h3><dl class="builder-picker-facts">${facts}</dl><p class="builder-source">${sourceText(ctx, entry.source)}</p>`;
}
// PG-06 (dnd5e Compendium Browser locked to the choice, Roll20 inline custom content):
// «Crea variante…» saves the draft and opens the homebrew editor on that kind only,
// starting from the SRD entry already chosen; saving the variant comes straight back here
// with it selected (homebrew-editor → ctx.chooseLibraryContent → homebrew-integration).
const VARIANT_TARGETS = {
  classes: { kind: "class", section: "class", template: "class-levels:" },
  backgrounds: { kind: "background", section: "origin", template: "srd-background:" },
  species: { kind: "species", section: "origin", template: "srd-species:" },
};
export function createVariant(ctx, kind, path, chosenId = null) {
  const target = VARIANT_TARGETS[kind];
  if (!target || !session) return false;
  const command = ctx.registry?.get?.("command", "homebrew-editor.create", ctx);
  persist(ctx);
  const returnTo = {
    page: "builder",
    draftId: session.id,
    section: target.section,
    targetKind: target.kind,
    ...(kind === "classes" ? { row: Number(path.split(".")[1]) || 0 } : {}),
  };
  const catalog = getCharacterCatalog();
  const srd = (catalog[kind] || []).some((entry) => entry.id === chosenId);
  if (!command) {
    ctx.toast(
      ctx.t(
        "L’editor homebrew non è disponibile: crea la variante dalla Biblioteca.",
        "The homebrew editor is unavailable: create the variant from the Library.",
      ),
      true,
    );
    ctx.navigate("library", { returnTo: JSON.stringify(returnTo) });
    return false;
  }
  ctx.registry.run(command, ctx, {
    kind: target.kind,
    lock: true,
    template: srd ? target.template + chosenId : null,
    returnTo,
  });
  return true;
}
function openPicker(ctx, root, kind, path) {
  const { t, esc } = ctx;
  const catalog = getDraftCatalog(ctx.state, session.id, ctx.role);
  const list = catalog[kind] || [];
  const current = readPath(session.data, path);
  const titles = {
    classes: ["Scegli la classe", "Choose the class"],
    backgrounds: ["Scegli il background", "Choose the background"],
    species: ["Scegli la specie", "Choose the species"],
  };
  const filters = PICKER_FILTERS[kind];
  ctx.dialog(
    t(...titles[kind]),
    `<div class="builder-picker" data-builder-picker="${kind}"><label class="field">${t("Cerca", "Search")}<input type="search" data-picker-search autocomplete="off"></label><div class="builder-picker-filters" role="group" aria-label="${esc(t("Filtri", "Filters"))}">${filters.map(([id, it, en], index) => `<button type="button" class="bp-chip" data-picker-filter="${id}" aria-pressed="${index === 0}">${t(it, en)}</button>`).join("")}</div><div class="builder-picker-layout"><fieldset class="builder-picker-list"><legend class="visually-hidden">${t(...titles[kind])}</legend>${list.map((entry) => `<label class="builder-picker-option" data-picker-option="${esc(entry.id)}" data-picker-text="${esc(`${entry.name?.it ?? ""} ${entry.name?.en ?? ""}`.toLowerCase())}"><input type="radio" name="choice" value="${esc(entry.id)}" ${entry.id === current ? "checked" : ""}><span>${esc(ctx.label(entry.name))}${entry.homebrew ? ` <small class="badge">${t("Homebrew", "Homebrew")}</small>` : ""}</span></label>`).join("")}<p class="muted" data-picker-empty hidden>${t("Nessun risultato: cambia la ricerca o i filtri.", "No result: change the search or filters.")}</p></fieldset><section class="builder-picker-preview" data-picker-preview aria-live="polite">${pickerPreview(
      ctx,
      catalog,
      kind,
      list.find((entry) => entry.id === current),
    )}</section></div><p class="muted">${t("Non trovi ciò che cerchi?", "Can’t find it?")} <button type="button" class="text-button" data-picker-variant>${t("Crea variante nell’editor homebrew…", "Create a variant in the homebrew editor…")}</button></p></div>`,
    {
      submitLabel: t("Scegli", "Choose"),
      onSubmit: (form) => {
        const value = form.get("choice");
        if (!value) throw Error(t("Scegli una voce dall’elenco.", "Pick an entry from the list."));
        if (path.startsWith("classes.")) {
          session.data.classes ??= [];
          const row = (session.data.classes[Number(path.split(".")[1])] ??= {});
          row.level ??= 1;
          row.subclassId ??= null;
        }
        setPath(session.data, path, value);
        touch(root, ctx);
        ctx.render();
      },
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog [data-builder-picker]");
  if (!dialog) return;
  let filter = "all";
  const apply = () => {
    const query = dialog.querySelector("[data-picker-search]").value.trim().toLowerCase();
    const test = filters.find(([id]) => id === filter)?.[3] ?? (() => true);
    let shown = 0;
    for (const option of dialog.querySelectorAll("[data-picker-option]")) {
      const entry = list.find((row) => row.id === option.dataset.pickerOption);
      const visible = test(entry) && (!query || option.dataset.pickerText.includes(query));
      option.hidden = !visible;
      if (visible) shown++;
    }
    dialog.querySelector("[data-picker-empty]").hidden = shown > 0;
  };
  dialog.querySelector("[data-picker-search]").addEventListener("input", apply);
  dialog.querySelectorAll("[data-picker-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      filter = button.dataset.pickerFilter;
      dialog
        .querySelectorAll("[data-picker-filter]")
        .forEach((chip) => chip.setAttribute("aria-pressed", String(chip === button)));
      apply();
    }),
  );
  dialog.querySelectorAll("input[name=choice]").forEach((input) =>
    input.addEventListener("change", () => {
      dialog.querySelector("[data-picker-preview]").innerHTML = pickerPreview(
        ctx,
        catalog,
        kind,
        list.find((row) => row.id === input.value),
      );
    }),
  );
  dialog.querySelector("[data-picker-variant]")?.addEventListener("click", () => {
    const chosen = dialog.querySelector("input[name=choice]:checked")?.value ?? current;
    ctx.closeDialog();
    safe(ctx, () => createVariant(ctx, kind, path, chosen));
  });
  (
    dialog.querySelector("input[name=choice]:checked") ??
    dialog.querySelector("[data-picker-search]")
  )?.focus?.();
}
// The sheet owns how a character advances (PE or Traguardi, «Gestisci avanzamento»); the
// builder repeats the same word instead of keeping a second, different setting.
function advancementLine(ctx, draft) {
  const { t } = ctx;
  if (draft.actorId && ctx.state.actors[draft.actorId]) {
    const xp = xpView(ctx.state, draft.actorId);
    return `<p class="builder-breakdown" data-builder-advancement="${xp.mode}"><strong>${t("Come avanza", "How it advances")}:</strong> ${
      xp.mode === "milestone"
        ? t("Traguardi", "Milestones")
        : `${t("Punti esperienza", "Experience points")} · ${xp.xp}${xp.needed !== null ? " / " + xp.needed : ""} ${t("PE", "XP")}`
    } · <span class="muted">${t("si cambia dalla scheda, «Gestisci avanzamento»", "change it from the sheet, «Manage advancement»")}</span></p>`;
  }
  return `${select(
    ctx,
    "identity.advancement.method",
    t("Come avanza", "How it advances"),
    [
      { id: "xp", name: t("Punti esperienza", "Experience points") },
      { id: "milestone", name: t("Traguardi", "Milestones") },
    ],
    { empty: false },
  )}${session.data.identity?.advancement?.method === "milestone" ? field(ctx, "identity.advancement.milestone", t("Traguardo o accordo", "Milestone or agreement")) : field(ctx, "identity.advancement.xp", t("PE registrati", "Recorded XP"), "number", 'min="0" step="1"')}`;
}
// DDB traits / ideals / bonds / flaws with «+ Aggiungi» and «Casuale» (PG-10): the
// background's suggestions are one tap away; the player's own words are always allowed.
const PERSONALITY = [
  ["traits", "Tratti della personalità", "Personality traits", "Nuovo tratto", "New trait"],
  ["ideals", "Ideali", "Ideals", "Nuovo ideale", "New ideal"],
  ["bonds", "Legami", "Bonds", "Nuovo legame", "New bond"],
  ["flaws", "Difetti", "Flaws", "Nuovo difetto", "New flaw"],
];
function renderPersonality(ctx) {
  const { t, esc } = ctx,
    d = session.data,
    backgroundId = d.origin?.backgroundId,
    bg = getCharacterCatalog().backgrounds.find((entry) => entry.id === backgroundId);
  return `<section class="builder-personality" aria-labelledby="builder-personality-title"><h3 id="builder-personality-title">${t("Personalità", "Personality")}</h3><p class="muted">${bg ? esc(t(`Suggerimenti per ${ctx.label(bg.name)} e generali: tocca uno spunto, usa «Casuale» o scrivi il tuo.`, `Suggestions for ${ctx.label(bg.name)} and general ones: tap an idea, use «Random» or write your own.`)) : t("Spunti generali: tocca uno spunto, usa «Casuale» o scrivi il tuo.", "General ideas: tap one, use «Random» or write your own.")}</p>${PERSONALITY.map(
    ([key, it, en, newIt, newEn]) => {
      const list = d.story?.personality?.[key] ?? [];
      const ideas = personalitySuggestions(backgroundId, key)
        .map((entry) => entry[ctx.lang] ?? entry.it)
        .filter((entry) => !list.includes(entry))
        .slice(0, 4);
      return `<fieldset class="builder-personality-group" data-builder-personality="${key}"><legend>${t(it, en)}</legend>${list.length ? `<ul class="builder-personality-list">${list.map((entry, index) => `<li><span>${esc(entry)}</span><button type="button" class="button quiet" data-builder-personality-remove="${key}" data-index="${index}" aria-label="${esc(t(`Rimuovi: ${entry}`, `Remove: ${entry}`))}">${t("Rimuovi", "Remove")}</button></li>`).join("")}</ul>` : ""}<div class="builder-personality-add"><label class="field">${t(newIt, newEn)}<input maxlength="300" data-builder-personality-input="${key}"></label><button type="button" class="button" data-builder-personality-add="${key}">${t("+ Aggiungi", "+ Add")}</button><button type="button" class="button quiet" data-builder-personality-random="${key}">${t("Casuale", "Random")}</button></div>${ideas.length ? `<div class="builder-personality-ideas" role="group" aria-label="${esc(t(`Spunti: ${it}`, `Ideas: ${en}`))}">${ideas.map((idea) => `<button type="button" class="bp-chip" data-builder-personality-pick="${key}" data-value="${esc(idea)}">+ ${esc(idea)}</button>`).join("")}</div>` : ""}</fieldset>`;
    },
  ).join("")}</section>`;
}
function renderHitPoints(ctx, draft, total, preview) {
  const { t } = ctx,
    d = session.data,
    oldLevel = ctx.state.actors[draft.actorId]?.level || 1;
  const levels = Array.from(
    { length: Math.min(19, Math.max(0, total - 1)) },
    (_, index) => index + 2,
  ).filter((level) => draft.kind !== "advance" || level > oldLevel);
  return `<fieldset><legend>${t("Punti ferita", "Hit points")}</legend>${select(
    ctx,
    "hp.mode",
    t("Origine del massimo", "Maximum HP source"),
    [
      { id: "calculated", name: t("Calcolo dalle scelte note", "Calculate from known choices") },
      { id: "manual", name: t("Totale manuale dichiarato", "Declared manual total") },
      ...(draft.actorId
        ? [
            {
              id: "delta",
              name: t(
                "Dalla scheda attuale, più o meno i livelli cambiati",
                "From the current sheet, plus or minus the changed levels",
              ),
            },
          ]
        : []),
    ],
    { empty: false },
  )}${
    d.hp?.mode === "manual"
      ? field(
          ctx,
          "hp.maxHp",
          t("PF massimi noti", "Known maximum HP"),
          "number",
          'min="1" step="1"',
        )
      : levels
          .map(
            (level) =>
              `<div class="builder-roll"><strong>${t("Livello ", "Level ")}${level}</strong>${select(
                ctx,
                `hp.perLevel.${level}.method`,
                t("Metodo PF", "HP method"),
                [
                  { id: "fixed", name: t("Valore fisso", "Fixed value") },
                  { id: "roll", name: t("Tiro del Dado Vita", "Hit Die roll") },
                  { id: "manual", name: t("Valore noto", "Known value") },
                ],
              )}${d.hp?.perLevel?.[level]?.method === "roll" ? renderRoll(ctx, draft, "hp", level) : d.hp?.perLevel?.[level]?.method === "manual" ? field(ctx, `hp.perLevel.${level}.value`, t("Valore noto del dado (senza COS)", "Known die value (without CON)"), "number", 'min="1" max="12" step="1"') : ""}</div>`,
          )
          .join("")
  }${
    draft.kind === "reconstruct"
      ? `<div class="form-grid">${field(ctx, "hp.currentHp", t("PF attuali noti", "Known current HP"), "number", 'min="0" step="1"')}${field(ctx, "hp.tempHp", t("PF temporanei", "Temporary HP"), "number", 'min="0" step="1"')}</div>${checkbox(ctx, "hp.currentKnown", t("Conosco lo stato attuale dei PF", "I know the current HP state"))}<h3>${t("Dadi Vita già spesi", "Hit Dice already spent")}</h3><p>${t("Indica esplicitamente anche zero.", "Explicitly enter zero where appropriate.")}</p><div class="form-grid">${Object.entries(
          preview.proposed?.hitDice || {},
        )
          .map(([die, pool]) =>
            field(
              ctx,
              `hp.hitDiceUsed.${die}`,
              die + ` (0–${pool.max})`,
              "number",
              `min="0" max="${pool.max}" step="1"`,
            ),
          )
          .join("")}</div>`
      : ""
  }<p class="muted">${t("Avanzare o rivedere non cura il personaggio. Danni e risorse spese durante la bozza restano applicati.", "Advancement or revision does not heal. Damage and resources spent during the draft remain applied.")}</p></fieldset>`;
}
function activeRoll(draft, kind, index) {
  return (draft.rolls || [])
    .filter((roll) => roll.kind === kind && roll.index === index && roll.status !== "reversed")
    .at(-1);
}
function renderRoll(ctx, draft, kind, index) {
  const { t, esc } = ctx,
    roll = activeRoll(draft, kind, index);
  if (roll?.status === "pending")
    return `<div class="builder-roll"><p>${t("Tiro fisico in attesa", "Physical roll pending")}</p><div class="builder-roll-fields">${(
      roll.dice || []
    )
      .flatMap((group) => Array(group.count).fill(group.sides))
      .map(
        (sides, i) =>
          `<label class="field">d${sides}<input type="number" min="1" max="${sides}" step="1" inputmode="numeric" data-builder-face="${esc(roll.id)}" data-index="${i}" value="${esc(session.rollFaces[roll.id]?.[i] ?? "")}" aria-label="${t("Dado ", "Die ") + (i + 1)}"></label>`,
      )
      .join(
        "",
      )}</div><button class="button" type="button" data-builder-record-roll="${esc(roll.id)}">${t("Registra facce naturali", "Record natural faces")}</button></div>`;
  return `<div class="builder-roll">${roll ? `<p class="builder-breakdown">${esc((roll.values || []).join(" + "))}${kind === "abilities" ? " − " + esc(roll.discarded ?? Math.min(...roll.values)) : ""} = <strong>${roll.total}</strong> · ${t(roll.mode === "physical" ? "Fisico" : "Digitale", roll.mode === "physical" ? "Physical" : "Digital")}</p>` : ""}<div class="toolbar"><button class="button" type="button" data-builder-roll="${kind}" data-index="${index}" data-mode="digital">${roll ? t("Nuovo tiro digitale…", "New digital roll…") : t("Tira digitale", "Roll digitally")}</button><button class="button" type="button" data-builder-roll="${kind}" data-index="${index}" data-mode="physical">${roll ? t("Nuovo tiro fisico…", "New physical roll…") : t("Registra tiro fisico", "Record physical roll")}</button>${roll ? `<button class="button quiet" type="button" data-builder-roll="${kind}" data-index="${index}" data-mode="physical" data-correction="${esc(roll.id)}">${t("Correggi registrazione…", "Correct recorded roll…")}</button>` : ""}</div></div>`;
}
function renderAbilities(ctx, draft, preview) {
  const { t, esc } = ctx,
    d = session.data,
    a = d.abilities || {},
    method = a.method || "array";
  const totals = [15, 14, 13, 12, 10, 8];
  const assigned = (id) =>
    method === "array" || method === "roll"
      ? select(
          ctx,
          `abilities.assignment.${id}`,
          t(...names[id]),
          Array.from({ length: 6 }, (_, index) => ({
            id: String(index),
            name:
              method === "array"
                ? String(totals[index])
                : t("Gruppo ", "Group ") +
                  (index + 1) +
                  (activeRoll(draft, "abilities", index)?.status === "resolved"
                    ? " · " + activeRoll(draft, "abilities", index).total
                    : ""),
          })),
        )
      : field(
          ctx,
          `abilities.scores.${id}`,
          t(...names[id]),
          "number",
          method === "point-buy" ? 'min="8" max="15" step="1"' : 'min="1" max="30" step="1"',
        );
  const cost = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
    spent = abilityIds.reduce((sum, id) => sum + (cost[a.scores?.[id]] ?? 0), 0);
  return `<p class="builder-intro">${t("Assegna tu i punteggi; nessuna distribuzione automatica in base alla classe. I contributi del background restano separati.", "Assign scores yourself; the class does not automatically distribute them. Background contributions stay separate.")}</p><label class="field">${t("Metodo", "Method")}<select data-builder-method>${[
    ["array", "Serie standard", "Standard array"],
    ["point-buy", "27 punti", "27-point buy"],
    ["roll", "Sei gruppi di 4d6", "Six groups of 4d6"],
    ["manual", "Valori noti / manuali", "Known / manual values"],
  ]
    .map(
      ([id, it, en]) =>
        `<option value="${id}" ${method === id ? "selected" : ""}>${t(it, en)}</option>`,
    )
    .join(
      "",
    )}</select></label>${method === "point-buy" ? `<p class="builder-breakdown" data-builder-point-count>${t("Spesi ", "Spent ")}${spent}/27 · ${t("Rimasti ", "Remaining ")}${27 - spent}</p>` : ""}<form class="builder-form" data-builder-form><div class="builder-ability-grid">${abilityIds.map(assigned).join("")}</div>${method === "manual" ? textarea(ctx, "abilities.source", t("Origine dei valori noti", "Source of known values")) : ""}${method === "roll" ? `<div class="builder-rolls">${Array.from({ length: 6 }, (_, index) => `<section><h3>${t("Gruppo ", "Group ")}${index + 1} · 4d6</h3>${renderRoll(ctx, draft, "abilities", index)}</section>`).join("")}</div>` : ""}<details class="builder-help"><summary>${t("Totali manuali sostitutivi", "Manual total overrides")}</summary><p>${t("Un totale sostitutivo prevale sul calcolo: non si somma. Lascia vuoto per usare il risultato calcolato. Ogni sostituzione richiede un motivo.", "An override replaces the calculation; it is not added. Leave blank to use the calculated result. Each override requires a reason.")}</p><div class="builder-ability-grid">${abilityIds.map((id) => `<div>${field(ctx, `abilities.manualTotals.${id}.value`, t(...names[id]), "number", 'min="1" max="30" step="1"')}${field(ctx, `abilities.manualTotals.${id}.reason`, t("Motivo", "Reason"))}</div>`).join("")}</div></details></form><h3>${t("Valori proposti", "Proposed scores")}</h3><div class="builder-breakdown">${abilityIds.map((id) => `${t(...names[id])}: ${esc(preview.proposed?.abilities?.[id] ?? "—")}`).join(" · ")}</div>`;
}
function renderFeatures(ctx, draft, catalog, preview) {
  const { t, esc } = ctx,
    d = session.data,
    selected = d.features?.selected || [],
    eligibility = preview.choices?.feats || [];
  const granted = (preview.proposed?.features || []).filter(
    (feature) =>
      !selected.some((entry) => (typeof entry === "string" ? entry : entry.id) === feature.id),
  );
  const grants = preview.choices?.grants || [];
  // Final review F21 (D&D Beyond's tone: an action sentence, the technical note behind «Perché?»).
  return `<p class="builder-intro">${t("Scegli le opzioni che classe, specie e background ti concedono.", "Choose the options your class, species and background give you.")}</p><details class="builder-help"><summary>${t("Perché alcune capacità non agiscono da sole?", "Why do some features not act on their own?")}</summary><p>${t("Ogni scelta appartiene alla capacità che la concede. I privilegi automatici restano distinti dalle scelte; il nome di una capacità non inventa automazioni.", "Every choice belongs to its granting feature. Automatic features stay distinct from choices; a feature name does not invent automation.")}</p></details><details class="builder-help"><summary>${t("Privilegi registrati dalle fonti", "Features recorded from sources")} (${granted.length})</summary><ul>${granted.map((feature) => `<li><strong>${esc(ctx.label(feature.name))}</strong> · ${sourceText(ctx, feature.source)}</li>`).join("")}</ul></details><form class="builder-form" data-builder-form>${checkbox(ctx, "features.featOverride", t("Ignora i requisiti dei talenti (con il permesso del DM)", "Ignore feat prerequisites (with the DM's permission)"))}<p class="muted">${t("La deroga non concede talenti extra e non modifica i requisiti del multiclasse.", "The override does not grant extra feats or change multiclass prerequisites.")}</p><label class="builder-check"><input type="checkbox" data-builder-show-feats ${session.showOtherFeats ? "checked" : ""}>${t("Mostra anche requisiti mancanti o ignoti", "Also show unmet or unknown prerequisites")}</label>${grants
    .map((grant) => {
      const rows = selected.filter((entry) => entry.grantId === grant.id);
      const options = (grant.options || [])
        .map((option) =>
          typeof option === "string"
            ? catalog.feats.find((entry) => entry.id === option) || { id: option, name: option }
            : option,
        )
        .filter((option) => {
          const eligible = eligibility.find((entry) => entry.id === option.id);
          return (
            !eligible ||
            eligible.eligible === true ||
            session.showOtherFeats ||
            rows.some((entry) => entry.id === option.id)
          );
        });
      return `<fieldset><legend>${esc(ctx.label(grant.name || grant.id))} · ${rows.length}/${grant.count}</legend><div class="builder-choices">${options
        .map((option) => {
          const index = selected.findIndex(
              (entry) => entry.id === option.id && entry.grantId === grant.id,
            ),
            chosen = index >= 0,
            requirement = eligibility.find((entry) => entry.id === option.id);
          return `<div class="builder-choice"><input type="checkbox" aria-label="${esc(ctx.label(option.name))}" data-builder-feature="${esc(option.id)}" data-grant="${esc(grant.id)}" ${chosen ? "checked" : ""}><div><strong>${esc(ctx.label(option.name))}</strong>${option.source ? `<p>${sourceText(ctx, option.source)}</p>` : ""}${requirement?.reason ? `<p>${esc(ctx.label(requirement.reason))}</p>` : ""}${
            chosen && ["ability-score-improvement", "grappler"].includes(option.id)
              ? `<p>${t("Aumenti concessi da questa scelta", "Ability increases granted by this choice")}</p><div class="builder-ability-grid">${abilityIds
                  .filter((id) => option.id !== "grappler" || ["str", "dex"].includes(id))
                  .map((id) =>
                    field(
                      ctx,
                      `features.selected.${index}.bonuses.${id}`,
                      t(...names[id]),
                      "number",
                      'min="0" max="2" step="1"',
                    ),
                  )
                  .join("")}</div>`
              : ""
          }</div>${catalog.feats.some((feat) => feat.id === option.id) ? detailsButton(ctx, "feats", option.id) : ""}</div>`;
        })
        .join("")}</div></fieldset>`;
    })
    .join(
      "",
    )}${!grants.length ? `<p class="muted">${t("Nessuna scelta aggiuntiva verificata per le fonti attuali.", "No additional verified choice for the current sources.")}</p>` : ""}${selected
    .filter((entry) => !grants.some((grant) => grant.id === entry.grantId))
    .map(
      (entry) =>
        `<p class="builder-manual-note">${t("Scelta precedente da riconciliare: ", "Prior choice to reconcile: ")}${esc(ctx.label(catalog.feats.find((feat) => feat.id === (entry.id || entry))?.name || entry.id || entry))} <button type="button" class="button quiet" data-builder-remove-feature="${esc(entry.id || entry)}" data-grant="${esc(entry.grantId || "")}">${t("Rimuovi scelta", "Remove choice")}</button></p>`,
    )
    .join(
      "",
    )}${checkbox(ctx, "features.confirmed", t("Ho verificato le scelte e le capacità mancanti", "I checked choices and missing features"))}</form><h3>${t("Capacità manuali", "Manual features")}</h3>${renderCustom(ctx, "features", d.features?.custom || [])}<button class="button" data-builder-custom="features">${t("Aggiungi capacità manuale", "Add manual feature")}</button>${libraryButton(ctx, "features")}`;
}
function renderSpells(ctx, draft, catalog, preview) {
  const { t, esc } = ctx,
    d = session.data,
    selection = d.spells?.selected || [],
    prepared = d.spells?.prepared || [],
    grants = preview.choices?.spellGrants || [];
  const allSpells = [...(catalog.spells || []), ...(d.spells?.custom || [])];
  const unresolved = [
    ...new Map(
      [...selection, ...prepared].map((entry) => {
        const ref = { id: entry.id || entry, grantId: entry.grantId || "" };
        return [JSON.stringify(ref), ref];
      }),
    ).values(),
  ].filter(
    (ref) =>
      !allSpells.some((spell) => spell.id === ref.id) ||
      !(ref.grantId ? grants.some((grant) => grant.id === ref.grantId) : grants.length) ||
      !selection.some(
        (entry) => (entry.id || entry) === ref.id && (entry.grantId || "") === ref.grantId,
      ),
  );
  const uses =
    draft.kind === "reconstruct"
      ? `<fieldset><legend>${t("Consumi attuali noti", "Known current usage")}</legend><p>${t("Ricostruire non ripristina le risorse: indica esplicitamente anche zero.", "Reconstruction does not restore resources: explicitly enter zero where appropriate.")}</p><div class="form-grid">${Object.entries(
          preview.proposed?.spellSlots || {},
        )
          .filter(([, pool]) => pool.max > 0)
          .map(([level, pool]) =>
            field(
              ctx,
              `spells.slotUses.${level}`,
              t("Slot già usati, livello ", "Slots already spent, level ") +
                level +
                ` (0–${pool.max})`,
              "number",
              `min="0" max="${pool.max}" step="1"`,
            ),
          )
          .join(
            "",
          )}${preview.proposed?.pactSlots?.max ? field(ctx, "spells.pactUsed", t("Slot del Patto già usati", "Pact slots already spent"), "number", `min="0" max="${preview.proposed.pactSlots.max}" step="1"`) : ""}</div></fieldset>`
      : "";
  return `<p class="builder-intro">${t("Ogni magia conserva la capacità che la concede. Conoscere o preparare non lancia la magia e non usa slot.", "Every spell retains its granting feature. Knowing or preparing does not cast it or spend slots.")}</p>${unresolved.length ? `<section class="builder-errors"><h3>${t("Scelte da rivedere", "Choices to review")}</h3><p>${t("Queste scelte non hanno più una concessione o una magia selezionata compatibile. Rimuovile oppure correggi le scelte nelle altre sezioni.", "These choices no longer have a compatible grant or selected spell. Remove them or correct your choices in the other sections.")}</p>${unresolved.map((ref) => `<article class="builder-draft-row"><div><strong>${esc(ctx.label(allSpells.find((spell) => spell.id === ref.id)?.name || ref.id))}</strong><p>${esc(ref.grantId || t("Origine da verificare", "Grant to verify"))}</p></div><button type="button" class="button quiet" data-builder-remove-spell="${esc(ref.id)}" data-grant="${esc(ref.grantId)}">${t("Rimuovi scelta e preparazione", "Remove choice and preparation")}</button></article>`).join("")}</section>` : ""}${
    grants
      .map((grant) => {
        if (grant.origin) {
          const spell = allSpells.find((entry) => entry.id === grant.spellId);
          return `<fieldset data-builder-origin-grant="${esc(grant.id)}"><legend>${esc(ctx.label(grant.name))}</legend><p>${t("Trucchetto concesso dalla specie", "Cantrip granted by the species")}: <strong>${esc(spell ? ctx.label(spell.name) : "—")}</strong></p><button type="button" class="button quiet" data-builder-section="origin">${t("Cambia in Background e specie", "Change in Background and species")}</button></fieldset>`;
        }
        const id = grant.id,
          has = (list, spellId) =>
            list.some((value) =>
              typeof value === "string"
                ? value === spellId
                : value.id === spellId && value.grantId === id,
            );
        const chosen = allSpells.filter((spell) => has(selection, spell.id));
        return `<fieldset><legend>${esc(ctx.label(grant.name || id))}</legend><p class="builder-breakdown">${t("Trucchetti", "Cantrips")} ${chosen.filter((spell) => spell.level === 0).length}/${grant.cantripCount} · ${t("Magie conosciute", "Known spells")} ${chosen.filter((spell) => spell.level > 0).length}/${grant.knownCount} · ${t("Preparate", "Prepared")} ${prepared.filter((entry) => entry.grantId === id).length}/${grant.preparedCount} · ${t("Livello massimo", "Maximum level")} ${grant.maxLevel}</p>${
          id === "background:magic-initiate"
            ? select(
                ctx,
                "origin.choices.magicInitiateAbility",
                t("Caratteristica di lancio", "Spellcasting ability"),
                catalog.abilities.filter((entry) => ["int", "wis", "cha"].includes(entry.id)),
              )
            : ""
        }<div class="builder-choices">${allSpells
          .filter(
            (spell) =>
              has(selection, spell.id) ||
              ((!spell.classes || spell.classes.includes(grant.classId)) &&
                spell.level <= grant.maxLevel),
          )
          .map((spell) => {
            const selected = has(selection, spell.id);
            return `<div class="builder-choice"><input type="checkbox" aria-label="${esc(ctx.label(spell.name))}" data-builder-spell="${esc(spell.id)}" data-grant="${esc(id)}" ${selected ? "checked" : ""}><div><strong>${esc(ctx.label(spell.name))}</strong><p>${spell.level === 0 ? t("Trucchetto", "Cantrip") : t("Livello ", "Level ") + spell.level} · ${sourceText(ctx, spell.source)}</p>${selected && spell.level > 0 ? `<label class="builder-check"><input type="checkbox" data-builder-prepare="${esc(spell.id)}" data-grant="${esc(id)}" ${has(prepared, spell.id) ? "checked" : ""}>${t("Preparata", "Prepared")}</label>` : ""}</div>${catalog.spells.some((entry) => entry.id === spell.id) ? detailsButton(ctx, "spells", spell.id) : ""}</div>`;
          })
          .join("")}</div></fieldset>`;
      })
      .join("") ||
    `<p class="muted">${t("Nessuna concessione magica verificata dalle scelte attuali.", "No verified spell grant from current choices.")}</p>`
  }<h3>${t("Magie manuali", "Manual spells")}</h3><p>${t("Una voce manuale con livello e fonte compare negli elenchi delle concessioni: selezionala dalla fonte appropriata.", "A manual entry with level and source appears in granting lists: select it under the appropriate source.")}</p>${renderCustom(ctx, "spells", d.spells?.custom || [])}<button class="button" data-builder-custom="spells">${t("Aggiungi magia manuale", "Add manual spell")}</button>${libraryButton(ctx, "spells")}<form class="builder-form" data-builder-form>${uses}${checkbox(ctx, "spells.confirmed", t("Ho verificato origine, selezioni e preparazione", "I checked grants, selections and preparation"))}</form>`;
}
function libraryButton(ctx, targetKind) {
  return `<button type="button" class="button" data-builder-library="${targetKind}">${ctx.t("Cerca nella Biblioteca", "Browse library")}</button>`;
}
function renderCustom(ctx, kind, entries) {
  return `<div>${entries.map((entry) => `<article class="builder-draft-row"><div><strong>${ctx.esc(ctx.label(entry.name))}</strong><p>${sourceText(ctx, entry.source)}</p></div><button class="button quiet" data-builder-remove-custom="${kind}" data-id="${ctx.esc(entry.id)}">${ctx.t("Rimuovi dalla bozza", "Remove from draft")}</button></article>`).join("")}</div>`;
}
function removeSpellChoice(id, grantId) {
  for (const key of ["selected", "prepared"])
    session.data.spells[key] = (session.data.spells[key] || []).filter(
      (entry) =>
        !(
          (entry.id || entry) === id &&
          (grantId === undefined || typeof entry === "string" || entry.grantId === grantId)
        ),
    );
}
function renderEquipment(ctx, draft, catalog, preview) {
  const { t, esc } = ctx,
    d = session.data,
    e = d.equipment || {},
    existing = ["advance", "revise"].includes(draft.kind);
  return `<p class="builder-intro">${existing ? t("Gli oggetti e le monete già posseduti restano nella scheda. Avanzare non assegna una seconda dotazione iniziale.", "Existing items and currency remain on the sheet. Advancement does not grant starting equipment again.") : t("Scegli una dotazione alternativa oppure registra ciò che possiedi. Nessun oggetto viene equipaggiato automaticamente.", "Choose an equipment alternative or record what you own. No item is equipped automatically.")}</p>${
    !existing
      ? `<form class="builder-form" data-builder-form>${select(
          ctx,
          "equipment.mode",
          t("Metodo", "Method"),
          [
            {
              id: "manual",
              name: t("Oggetti reali / inserimento manuale", "Owned items / manual entry"),
            },
            ...(draft.kind === "reconstruct"
              ? []
              : [{ id: "starting-gold", name: t("Monete iniziali", "Starting gold") }]),
          ],
          { empty: false },
        )}${
          e.mode !== "manual"
            ? select(
                ctx,
                "equipment.classOptionId",
                t("Alternativa di classe", "Class alternative"),
                (catalog.equipmentOptions || []).filter(
                  (option) =>
                    option.classId ===
                    (d.classes?.length === 1 ? d.classes[0].classId : d.levelOrder?.[0]),
                ),
              ) +
              select(
                ctx,
                "equipment.backgroundOptionId",
                t("Alternativa del background", "Background alternative"),
                (catalog.equipmentOptions || []).filter(
                  (option) => option.backgroundId === d.origin?.backgroundId,
                ),
              )
            : ""
        }${field(ctx, "equipment.currency.gp", t("Monete d’oro già possedute (oltre all’alternativa scelta)", "Gold already owned (in addition to the selected alternative)"), "number", 'min="0" step="0.01"')}<p class="builder-breakdown">${t("Oro totale proposto: ", "Proposed total gold: ")}${esc(preview.proposed?.currency?.gp ?? "—")}</p></form>`
      : ""
  }<div class="table-wrap"><table class="builder-table"><thead><tr><th>${t("Oggetto", "Item")}</th><th>${t("Quantità", "Quantity")}</th><th>${t("Equipaggiato", "Equipped")}</th><th></th></tr></thead><tbody>${(e.items || []).map((item) => `<tr><td>${esc(ctx.label(item.name))}<br><small>${sourceText(ctx, item.source)}</small></td><td>${item.quantity}</td><td>${t(item.equipped ? "Sì" : "No", item.equipped ? "Yes" : "No")}</td><td>${!existing ? `<button class="button quiet" data-builder-remove-item="${esc(item.id)}">${t("Rimuovi", "Remove")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>${!existing ? `<button class="button" data-builder-custom="equipment">${t("Aggiungi oggetto manuale", "Add manual item")}</button>${libraryButton(ctx, "inventory")}` : ""}<form class="builder-form" data-builder-form>${checkbox(ctx, "equipment.confirmed", t("Ho controllato oggetti, quantità e metodo", "I checked items, quantities and method"))}</form>`;
}
// BG3 / DDB Level Up: what the sheet gains and loses, level by level, before applying —
// features, uses, Hit Dice, spell slots and proficiency bonus, not only hit points.
export function levelChanges(before, after) {
  if (!before || !after) return null;
  const managed = (before.features ?? []).filter((f) => f.buildManaged);
  const gained = (after.features ?? []).filter((f) => !managed.some((old) => old.id === f.id));
  const lost = managed.filter((old) => !(after.features ?? []).some((f) => f.id === old.id));
  const uses = (after.features ?? [])
    .filter((f) => Number.isInteger(f.max))
    .map((f) => ({
      name: f.name,
      from: managed.find((old) => old.id === f.id)?.max ?? 0,
      to: f.max,
    }))
    .filter((row) => row.from !== row.to);
  for (const old of lost)
    if (Number.isInteger(old.max) && old.max) uses.push({ name: old.name, from: old.max, to: 0 });
  const dice = [
    ...new Set([...Object.keys(before.hitDice ?? {}), ...Object.keys(after.hitDice ?? {})]),
  ]
    .map((die) => ({
      die,
      from: before.hitDice?.[die]?.max ?? 0,
      to: after.hitDice?.[die]?.max ?? 0,
    }))
    .filter((row) => row.from !== row.to);
  const slots = [
    ...new Set([...Object.keys(before.spellSlots ?? {}), ...Object.keys(after.spellSlots ?? {})]),
  ]
    .map((level) => ({
      level: Number(level),
      from: before.spellSlots?.[level]?.max ?? 0,
      to: after.spellSlots?.[level]?.max ?? 0,
    }))
    .filter((row) => row.from !== row.to)
    .sort((a, b) => a.level - b.level);
  return {
    level: { from: before.level, to: after.level },
    maxHp: { from: before.maxHp, to: after.maxHp },
    proficiencyBonus: {
      from: before.combatProfile?.proficiencyBonus ?? null,
      to: after.proficiencyBonus ?? null,
    },
    gained,
    lost,
    uses,
    dice,
    slots,
  };
}
function compareBlock(ctx, changes) {
  if (!changes) return "";
  const { t, esc } = ctx;
  const names = (list) => list.map((f) => esc(ctx.label(f.name))).join(", ");
  const rows = [
    [t("Livello", "Level"), `${changes.level.from} → ${esc(changes.level.to ?? "—")}`],
    [t("PF massimi", "Maximum HP"), `${changes.maxHp.from} → ${esc(changes.maxHp.to ?? "—")}`],
    changes.proficiencyBonus.from !== null &&
    changes.proficiencyBonus.to !== null &&
    changes.proficiencyBonus.from !== changes.proficiencyBonus.to
      ? [
          t("Bonus di competenza", "Proficiency bonus"),
          `+${changes.proficiencyBonus.from} → +${changes.proficiencyBonus.to}`,
        ]
      : null,
    changes.gained.length
      ? [
          t("Privilegi nuovi", "New features"),
          `<span class="is-gained">+ ${names(changes.gained)}</span>`,
        ]
      : null,
    changes.lost.length
      ? [
          t("Privilegi tolti", "Features removed"),
          `<span class="is-lost">− ${names(changes.lost)}</span>`,
        ]
      : null,
    ...changes.uses.map((row) => [
      esc(ctx.label(row.name)),
      `${row.from} → ${row.to} ${t("usi", "uses")}`,
    ]),
    ...changes.dice.map((row) => [
      t("Dadi Vita ", "Hit Dice ") + esc(row.die),
      `${row.from} → ${row.to}`,
    ]),
    ...changes.slots.map((row) => [
      t(`Slot di ${row.level}° livello`, `Level ${row.level} slots`),
      `${row.from} → ${row.to}`,
    ]),
  ].filter(Boolean);
  return `<section data-builder-compare aria-labelledby="builder-compare-title"><h3 id="builder-compare-title">${t("Cosa cambia sulla scheda", "What changes on the sheet")}</h3><dl class="builder-compare">${rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("")}</dl></section>`;
}
function renderReview(ctx, draft, catalog, preview) {
  const { t, esc } = ctx,
    d = session.data,
    p = preview.proposed || {},
    old = ctx.state.actors[draft.actorId];
  const classLabel = (d.classes || [])
    .map(
      (row) =>
        ctx.label(
          (catalog.classes || []).find((entry) => entry.id === row.classId)?.name || row.classId,
        ) +
        " " +
        row.level,
    )
    .join(" / ");
  return `<p class="builder-intro">${t("Controlla il risultato e correggi le sezioni indicate. Questa è l’unica conferma che crea o modifica la scheda; salvare la bozza non lo fa.", "Review the result and correct the indicated sections. This is the confirmation that creates or changes the sheet; saving the draft does not.")}</p>${old ? compareBlock(ctx, levelChanges(old, p)) : ""}<dl class="builder-summary-list"><dt>${t("Identità", "Identity")}</dt><dd>${esc(summaryName(ctx, draft))}</dd><dt>${t("Classi e livelli", "Classes and levels")}</dt><dd>${esc(classLabel || "—")}</dd><dt>${t("Caratteristiche proposte", "Proposed abilities")}</dt><dd>${abilityIds.map((id) => t(...names[id]) + ": " + esc(p.abilities?.[id] ?? "—")).join(" · ")}</dd>${old ? "" : `<dt>${t("PF massimi", "Maximum HP")}</dt><dd>${esc(p.maxHp ?? "—")}</dd>`}${old ? `<dt>${t("PF attuali da conservare", "Current HP to preserve")}</dt><dd>${old.hp} → ${esc(p.hp ?? "—")}</dd>` : ""}<dt>${t("Origine/manualità", "Provenance / manual data")}</dt><dd>${d.abilities?.method === "manual" || d.hp?.mode === "manual" ? t("Include valori manuali dichiarati", "Includes declared manual values") : t("Calcolo secondo le scelte e le fonti disponibili", "Calculation from selected available sources")}</dd></dl>${
    draft.rolls?.some((roll) => roll.status === "pending")
      ? `<section><h3>${t("Tiri da completare", "Rolls to complete")}</h3>${draft.rolls
          .filter((roll) => roll.status === "pending")
          .map(
            (roll) =>
              `<h4>${roll.kind === "abilities" ? t("Caratteristiche · gruppo ", "Abilities · group ") + (roll.index + 1) : t("PF · livello ", "HP · level ") + roll.index}</h4>${renderRoll(ctx, draft, roll.kind, roll.index)}`,
          )
          .join("")}</section>`
      : ""
  }${issueList(ctx, preview.errors, t("Correzioni necessarie", "Corrections required"))}${preview.warnings?.length ? `<section class="builder-manual-note"><h3>${t("Limiti e verifiche", "Limits and checks")}</h3><ul>${preview.warnings.map((warning) => `<li>${esc(msg(ctx, warning))}</li>`).join("")}</ul></section>` : ""}${draft.rolls?.length ? `<details class="builder-help"><summary>${t("Storico dei dadi della bozza", "Draft dice history")} (${draft.rolls.length})</summary><ul>${draft.rolls.map((roll) => `<li>${roll.kind === "abilities" ? t("Gruppo ", "Group ") + (roll.index + 1) : t("PF livello ", "HP level ") + roll.index}: ${roll.status === "pending" ? t("in attesa", "pending") : `${esc(roll.values.join(" + "))}${roll.discarded !== null ? " − " + roll.discarded : ""} = ${roll.total}`} · ${roll.status === "reversed" ? t("annullato · non usato nel calcolo", "reversed · excluded from calculation") : t(roll.mode === "physical" ? "fisico" : "digitale", roll.mode === "physical" ? "physical" : "digital")}${roll.reason ? " · " + esc(roll.reason) : ""}</li>`).join("")}</ul></details>` : ""}<p>${t("Non viene applicato un riposo: consumi, condizioni e concentrazione della scheda attuale restano acquisiti.", "This does not apply a rest: spent resources, conditions and concentration on the current sheet remain recorded.")}</p>${preview.incomplete ? `<label class="builder-check builder-manual-note"><input type="checkbox" data-builder-accept-incomplete ${session.allowIncomplete ? "checked" : ""}>${t("Confermo la scheda con gli aspetti da verificare elencati sopra.", "Confirm this sheet with the aspects to verify listed above.")}</label>` : ""}<button class="button primary" data-builder-apply ${preview.canApply ? "" : 'disabled aria-describedby="builder-apply-why"'}>${draft.actorId ? t("Applica alla scheda", "Apply to sheet") : t("Crea scheda", "Create sheet")}</button>${preview.canApply ? "" : `<p class="builder-apply-why" id="builder-apply-why">${t("Mancano delle correzioni: usa «Correggi sezione» nell’elenco qui sopra, poi torna al riepilogo.", "Corrections are missing: use “Correct section” in the list above, then come back to the review.")}</p>`}`;
}

function openDetail(ctx, type, id) {
  const catalog = session
      ? getDraftCatalog(ctx.state, session.id, ctx.role)
      : getCharacterCatalog(),
    entry = (catalog[type] || []).find((value) => value.id === id);
  if (!entry) return;
  ctx.dialog(
    ctx.label(entry.name),
    `<p>${sourceText(ctx, entry.source)}</p><p>${ctx.t("Disponibile nel catalogo locale; requisiti e concessioni dipendono dalla scheda.", "Available in the local catalog; prerequisites and grants depend on the sheet.")}</p>${entry.description ? `<p class="character-multiline">${ctx.esc(ctx.label(entry.description))}</p>` : ""}${entry.coverage ? `<p class="muted">${ctx.esc(ctx.label(entry.coverage))}</p>` : ""}${entry.source?.url ? `<a href="${ctx.esc(entry.source.url)}" target="_blank" rel="noopener noreferrer">${ctx.t("Apri fonte", "Open source")}</a>` : ""}`,
    {},
  );
}
function openCustom(ctx, kind) {
  const { t, esc } = ctx;
  ctx.dialog(
    kind === "equipment"
      ? t("Oggetto posseduto", "Owned item")
      : kind === "spells"
        ? t("Magia da altra fonte", "Spell from another source")
        : t("Capacità manuale", "Manual feature"),
    `<p>${t("Registra contenuti originali o dati che puoi usare. La registrazione non assegna automazioni dedotte dal nome.", "Record original content or data you can use. Recording does not infer automation from the name.")}</p><label class="field">${t("Nome", "Name")}<input name="name" required maxlength="100"></label>${kind === "equipment" ? `<div class="form-grid"><label class="field">${t("Quantità", "Quantity")}<input name="quantity" type="number" min="0" step="1" value="1" required></label><label class="field">${t("Peso unitario", "Unit weight")}<input name="weight" type="number" min="0" step="any" value="0" required></label></div><label class="builder-check"><input name="equipped" type="checkbox">${t("Già equipaggiato", "Already equipped")}</label>` : `<label class="field">${t("Descrizione", "Description")}<textarea name="description" rows="4"></textarea></label>${kind === "spells" ? `<label class="field">${t("Livello della magia", "Spell level")}<input name="level" type="number" min="0" max="9" step="1" value="0" required></label>` : ""}`}<label class="field">${t("Fonte o motivo della registrazione", "Source or recording reason")}<input name="source" required maxlength="200"></label>`,
    {
      submitLabel: t("Aggiungi alla bozza", "Add to draft"),
      onSubmit: (data) => {
        const name = String(data.get("name")).trim(),
          label = String(data.get("source")).trim();
        if (!name || !label) throw Error(t("Indica nome e fonte.", "Enter name and source."));
        const entry = { id: uid(), name, source: { kind: "manual", revision: uid(), label } };
        if (kind === "equipment") {
          Object.assign(entry, {
            quantity: Number(data.get("quantity")),
            weight: Number(data.get("weight")),
            kind: "gear",
            equipped: data.has("equipped"),
          });
          if (
            !Number.isInteger(entry.quantity) ||
            entry.quantity < 0 ||
            !Number.isFinite(entry.weight) ||
            entry.weight < 0
          )
            throw Error(t("Controlla quantità e peso.", "Check quantity and weight."));
          session.data.equipment.items.push(entry);
        } else {
          entry.description = String(data.get("description") || "");
          if (kind === "spells") entry.level = Number(data.get("level"));
          session.data[kind].custom.push(entry);
        }
        session.dirty = true;
        ctx.render();
      },
    },
  );
}
function rollCommand(ctx, kind, index, mode, correctionOf, reason) {
  persist(ctx);
  const draftId = session.id,
    id = uid();
  ctx.commit(
    ctx.t("Tiro della bozza registrato", "Draft roll recorded"),
    (state) => {
      const request = beginCharacterRoll(
        state,
        draftId,
        { id, kind, index, mode, correctionOf, reason },
        ctx.role,
      );
      if (mode === "digital") {
        const values = request.dice.flatMap((group) =>
          Array.from({ length: group.count }, () => (ctx.rollDie || rollDie)(group.sides)),
        );
        resolveCharacterRoll(state, draftId, id, values, ctx.role);
      }
    },
    localOptions,
  );
}
export function bindCharacterBuilder(root, ctx) {
  root
    .querySelector("[data-builder-new]")
    ?.addEventListener("click", () => startCharacterBuilder(ctx));
  root
    .querySelector("[data-builder-home]")
    ?.addEventListener("click", () => ctx.navigate("characters"));
  root.querySelectorAll("[data-builder-resume]").forEach(
    (button) =>
      (button.onclick = () => {
        session = null;
        const id = button.dataset.builderResume;
        if (quickOf(ctx.state, id, ctx.role)?.status === "active")
          ctx.navigate("builder-plus", { tab: "quick", id });
        else ctx.navigate("builder", { id });
      }),
  );
  bindPanels(root, ctx);
  if (!ctx.view.id || !session || session.id !== ctx.view.id || session.owner !== ctx.role) return;
  let draft;
  try {
    draft = draftFor(ctx);
  } catch {
    session = null;
    return;
  }
  if (!draft || draft.status !== "active") {
    session = null;
    return;
  }
  if (session.focusSection) {
    const heading = root.querySelector("[data-builder-section-title]");
    if (heading && heading.isConnected !== false) {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: "nearest" });
      const nav = root.querySelector(".builder-sections"),
        current = root.querySelector('[aria-current="step"]');
      if (nav && current && nav.scrollWidth > nav.clientWidth)
        nav.scrollLeft +=
          current.getBoundingClientRect().left -
          nav.getBoundingClientRect().left -
          (nav.clientWidth - current.clientWidth) / 2;
      session.focusSection = false;
    }
  }
  root.querySelectorAll("[data-builder-library]").forEach((button) => {
    button.onclick = () =>
      safe(ctx, () => {
        const targetKind = button.dataset.builderLibrary;
        const section = { features: "features", spells: "spells", inventory: "equipment" }[
          targetKind
        ];
        if (!section) return;
        persist(ctx, section);
        ctx.navigate("library", {
          returnTo: JSON.stringify({ page: "builder", draftId: draft.id, section, targetKind }),
        });
      });
  });
  root.querySelectorAll("[data-builder-form]").forEach(
    (form) =>
      (form.onsubmit = (event) => {
        event.preventDefault();
        safe(ctx, () => persist(ctx));
      }),
  );
  root.querySelectorAll("[data-builder-path]").forEach((input) =>
    input.addEventListener(
      input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input",
      () => {
        let value =
          input.type === "checkbox"
            ? input.checked
            : input.type === "number"
              ? input.value.trim() === ""
                ? null
                : Number(input.value)
              : input.value;
        if (input.dataset.builderPath.startsWith("abilities.assignment."))
          value = input.value === "" ? null : Number(input.value);
        if (input.dataset.builderPath.startsWith("origin.backgroundBonuses.") && value === null)
          value = 0;
        if (input.dataset.builderPath.startsWith("classes.")) {
          const index = Number(input.dataset.builderPath.split(".")[1]);
          session.data.classes[index] ??= { classId: "", level: 1, subclassId: null };
        }
        setPath(session.data, input.dataset.builderPath, value);
        if (
          input.dataset.builderPath.startsWith("abilities.manualTotals.") &&
          input.dataset.builderPath.endsWith(".value") &&
          value === null
        )
          delete session.data.abilities.manualTotals[input.dataset.builderPath.split(".")[2]];
        touch(root, ctx);
        if (input.tagName === "SELECT" || input.type === "checkbox") {
          ctx.render();
        } else if (
          input.dataset.builderPath.startsWith("abilities.scores.") &&
          session.data.abilities.method === "point-buy"
        ) {
          const cost = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
            spent = abilityIds.reduce(
              (sum, id) => sum + (cost[session.data.abilities.scores[id]] ?? 0),
              0,
            ),
            node = root.querySelector("[data-builder-point-count]");
          if (node)
            node.textContent =
              ctx.t("Spesi ", "Spent ") +
              spent +
              "/27 · " +
              ctx.t("Rimasti ", "Remaining ") +
              (27 - spent);
        }
      },
    ),
  );
  root.querySelectorAll("[data-builder-lines]").forEach(
    (input) =>
      (input.oninput = () => {
        setPath(
          session.data,
          input.dataset.builderLines,
          input.value
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        );
        touch(root, ctx);
      }),
  );
  root
    .querySelectorAll("[data-builder-browse]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openPicker(ctx, root, button.dataset.builderBrowse, button.dataset.path)),
    );
  const personality = (key, change) => {
    session.data.story ??= {};
    session.data.story.personality ??= { traits: [], ideals: [], bonds: [], flaws: [] };
    const list = [...(session.data.story.personality[key] ?? [])];
    change(list);
    session.data.story.personality[key] = list.slice(0, 12);
    touch(root, ctx);
    ctx.render();
    root.querySelector(`[data-builder-personality-input="${key}"]`)?.focus?.();
  };
  root.querySelectorAll("[data-builder-personality-add]").forEach((button) => {
    const key = button.dataset.builderPersonalityAdd,
      input = root.querySelector(`[data-builder-personality-input="${key}"]`);
    const add = () => {
      const value = input?.value.trim();
      if (!value) return input?.focus?.();
      personality(key, (list) => !list.includes(value) && list.push(value));
    };
    button.onclick = add;
    if (input)
      input.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          add();
        }
      };
  });
  root
    .querySelectorAll("[data-builder-personality-pick]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          personality(button.dataset.builderPersonalityPick, (list) =>
            list.push(button.dataset.value),
          )),
    );
  root.querySelectorAll("[data-builder-personality-random]").forEach(
    (button) =>
      (button.onclick = () => {
        const key = button.dataset.builderPersonalityRandom;
        const value = randomPersonality(
          session.data.origin?.backgroundId,
          key,
          session.data.story?.personality?.[key] ?? [],
          ctx.lang,
        );
        if (!value)
          return ctx.toast(
            ctx.t("Nessun altro spunto: scrivi il tuo.", "No more ideas: write your own."),
          );
        personality(key, (list) => list.push(value));
      }),
  );
  root
    .querySelectorAll("[data-builder-personality-remove]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          personality(button.dataset.builderPersonalityRemove, (list) =>
            list.splice(Number(button.dataset.index), 1),
          )),
    );
  root.querySelectorAll("[data-builder-list]").forEach(
    (input) =>
      (input.onchange = () => {
        const values = new Set(readPath(session.data, input.dataset.builderList) || []);
        if (input.checked) values.add(input.value);
        else values.delete(input.value);
        setPath(session.data, input.dataset.builderList, [...values]);
        touch(root, ctx);
        ctx.render();
      }),
  );
  root.querySelectorAll("[data-builder-section]").forEach(
    (button) =>
      (button.onclick = () =>
        safe(ctx, () => {
          const target = button.dataset.builderSection;
          const same = session.section === target;
          if (button.hasAttribute("data-builder-fix"))
            pendingFix = {
              draftId: draft.id,
              section: target,
              path: button.dataset.builderFix || "",
            };
          persist(ctx, target);
          if (!same) ctx.navigate("builder", { id: draft.id, tab: target });
        })),
  );
  if (pendingFix && pendingFix.draftId === draft.id && pendingFix.section === session.section) {
    const target = fixTarget(root, pendingFix.path);
    pendingFix = null;
    session.focusSection = false;
    if (target) {
      const box = target.closest("label, fieldset, .builder-choice") ?? target;
      box.classList?.add("builder-fix-target");
      box.scrollIntoView?.({ block: "center" });
      target.focus?.({ preventScroll: true });
      setTimeout(() => box.classList?.remove("builder-fix-target"), 2400);
    }
  }
  root
    .querySelector("[data-builder-save]")
    ?.addEventListener("click", () => safe(ctx, () => persist(ctx)));
  root.querySelector("[data-builder-refresh]")?.addEventListener("click", () => ctx.render());
  root
    .querySelector("[data-builder-return]")
    ?.addEventListener("click", () =>
      confirmCharacterBuilderNavigation(ctx, () =>
        ctx.navigate("characters", draft.actorId ? { id: draft.actorId, tab: "actions" } : {}),
      ),
    );
  root
    .querySelector("[data-builder-private-notes]")
    ?.addEventListener("click", () => ctx.openNotes());
  root.querySelector("[data-builder-discard]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Scartare questa bozza?", "Discard this draft?"),
      `<p>${ctx.esc(summaryName(ctx, draft))}. ${ctx.t("La scheda attuale e i suoi consumi restano invariati. Questa proposta privata verrà eliminata.", "The current sheet and its spent resources stay unchanged. This private proposal will be deleted.")}</p>`,
      {
        submitLabel: ctx.t("Scarta bozza", "Discard draft"),
        onSubmit: () => {
          ctx.commit(
            ctx.t("Bozza scartata", "Draft discarded"),
            (state) => discardCharacterDraft(state, draft.id, ctx.role),
            localOptions,
          );
          session = null;
          ctx.navigate("characters", draft.actorId ? { id: draft.actorId } : {});
        },
      },
    ),
  );
  root
    .querySelectorAll("[data-builder-detail]")
    .forEach(
      (button) =>
        (button.onclick = () => openDetail(ctx, button.dataset.builderDetail, button.dataset.id)),
    );
  root.querySelector("[data-builder-add-class]")?.addEventListener("click", () => {
    session.data.classes.push({ classId: "", level: 1, subclassId: null });
    session.dirty = true;
    ctx.render();
  });
  root.querySelectorAll("[data-builder-remove-class]").forEach(
    (button) =>
      (button.onclick = () => {
        session.data.classes.splice(Number(button.dataset.builderRemoveClass), 1);
        session.dirty = true;
        ctx.render();
      }),
  );
  root.querySelector("[data-builder-method]")?.addEventListener("change", (event) => {
    const next = event.target.value,
      previous = session.data.abilities.method;
    event.target.value = previous;
    if (next === previous) return;
    ctx.dialog(
      ctx.t("Cambiare metodo dei punteggi?", "Change the ability score method?"),
      `<p>${ctx.t("La nuova assegnazione sostituirà quella attuale. I dadi già registrati restano nello storico e non vengono riscritti come un altro metodo.", "The new assignment replaces the current one. Recorded dice stay in history and are not rewritten as another method.")}</p>`,
      {
        submitLabel: ctx.t("Cambia metodo", "Change method"),
        cancelLabel: ctx.t("Mantieni metodo", "Keep method"),
        onSubmit: () => {
          session.data.abilities.method = next;
          session.data.abilities.assignment = {};
          session.data.abilities.scores = Object.fromEntries(
            abilityIds.map((id) => [id, next === "point-buy" ? 8 : null]),
          );
          session.dirty = true;
          ctx.render();
        },
      },
    );
  });
  root.querySelectorAll("[data-builder-roll]").forEach(
    (button) =>
      (button.onclick = () =>
        safe(ctx, () => {
          const kind = button.dataset.builderRoll,
            index = Number(button.dataset.index),
            mode = button.dataset.mode,
            correction = button.dataset.correction;
          const existing = activeRoll(draft, kind, index);
          if (!existing) return rollCommand(ctx, kind, index, mode);
          ctx.dialog(
            correction
              ? ctx.t("Correggi registrazione", "Correct recorded roll")
              : ctx.t("Registra un nuovo tiro", "Record a new roll"),
            `<p>${ctx.t("Il risultato precedente resta conservato. Registra il motivo e usa il metodo concordato dal gruppo.", "The previous result stays recorded. Enter the reason and use the method agreed by the group.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" required></label>`,
            {
              submitLabel: ctx.t("Continua", "Continue"),
              onSubmit: (data) =>
                rollCommand(ctx, kind, index, mode, correction, String(data.get("reason")).trim()),
            },
          );
        })),
  );
  root.querySelectorAll("[data-builder-face]").forEach((input) => {
    input.addEventListener("input", () => {
      const values = (session.rollFaces[input.dataset.builderFace] ??= []);
      values[Number(input.dataset.index)] = input.value;
    });
  });
  root.querySelectorAll("[data-builder-record-roll]").forEach(
    (button) =>
      (button.onclick = () =>
        safe(ctx, () => {
          const id = button.dataset.builderRecordRoll,
            raw = [...root.querySelectorAll("[data-builder-face]")]
              .filter((input) => input.dataset.builderFace === id)
              .map((input) => input.value),
            values = raw.map((value) => (value.trim() === "" ? NaN : Number(value)));
          session.rollFaces[id] = raw;
          const snapshot = clone(session);
          session.dirty = false;
          try {
            ctx.commit(
              ctx.t("Dadi fisici della bozza registrati", "Draft physical dice recorded"),
              (state) => {
                saveCharacterDraft(
                  state,
                  draft.id,
                  {
                    data: snapshot.data,
                    section: snapshot.section,
                    expectedRevision: snapshot.revision,
                  },
                  ctx.role,
                );
                resolveCharacterRoll(state, draft.id, id, values, ctx.role);
              },
              localOptions,
            );
            delete session.rollFaces[id];
          } catch (error) {
            session = snapshot;
            throw error;
          }
        })),
  );
  root.querySelector("[data-builder-show-feats]")?.addEventListener("change", (event) => {
    session.showOtherFeats = event.target.checked;
    ctx.render();
  });
  root.querySelector("[data-builder-accept-incomplete]")?.addEventListener("change", (event) => {
    session.allowIncomplete = event.target.checked;
  });
  root.querySelectorAll("[data-builder-feature]").forEach((input) => {
    input.onchange = () => {
      const id = input.dataset.builderFeature,
        grantId = input.dataset.grant;
      session.data.features.selected = session.data.features.selected.filter(
        (entry) => !(entry.id === id && entry.grantId === grantId),
      );
      if (input.checked) session.data.features.selected.push({ id, grantId });
      session.dirty = true;
      ctx.render();
    };
  });
  root.querySelectorAll("[data-builder-remove-feature]").forEach((button) => {
    button.onclick = () => {
      session.data.features.selected = session.data.features.selected.filter(
        (entry) =>
          !(
            (entry.id || entry) === button.dataset.builderRemoveFeature &&
            (entry.grantId || "") === button.dataset.grant
          ),
      );
      session.dirty = true;
      ctx.render();
    };
  });
  for (const [selector, key] of [
    ["[data-builder-spell]", "selected"],
    ["[data-builder-prepare]", "prepared"],
  ])
    root.querySelectorAll(selector).forEach(
      (input) =>
        (input.onchange = () => {
          const id = input.dataset.builderSpell || input.dataset.builderPrepare,
            grantId = input.dataset.grant;
          session.data.spells[key] = (session.data.spells[key] || []).filter(
            (entry) =>
              !(typeof entry === "string"
                ? entry === id
                : entry.id === id && entry.grantId === grantId),
          );
          if (input.checked) session.data.spells[key].push({ id, grantId });
          else if (key === "selected") removeSpellChoice(id, grantId);
          session.dirty = true;
          ctx.render();
        }),
    );
  root.querySelectorAll("[data-builder-remove-spell]").forEach((button) => {
    button.onclick = () => {
      removeSpellChoice(button.dataset.builderRemoveSpell, button.dataset.grant);
      session.dirty = true;
      ctx.render();
    };
  });
  root
    .querySelectorAll("[data-builder-custom]")
    .forEach((button) => (button.onclick = () => openCustom(ctx, button.dataset.builderCustom)));
  root.querySelectorAll("[data-builder-remove-custom]").forEach(
    (button) =>
      (button.onclick = () => {
        const kind = button.dataset.builderRemoveCustom;
        session.data[kind].custom = session.data[kind].custom.filter(
          (item) => item.id !== button.dataset.id,
        );
        if (kind === "spells") removeSpellChoice(button.dataset.id);
        session.dirty = true;
        ctx.render();
      }),
  );
  root.querySelectorAll("[data-builder-remove-item]").forEach(
    (button) =>
      (button.onclick = () => {
        session.data.equipment.items = session.data.equipment.items.filter(
          (item) => item.id !== button.dataset.builderRemoveItem,
        );
        session.dirty = true;
        ctx.render();
      }),
  );
  root.querySelector("[data-builder-apply]")?.addEventListener("click", () =>
    safe(ctx, () => {
      if (session.dirty) {
        persist(ctx);
        ctx.toast(
          ctx.t(
            "Riepilogo aggiornato: controllalo prima di applicare.",
            "Review updated: check it before applying.",
          ),
        );
        return;
      }
      const reviewKey = session.reviewKey,
        key = draft.id + ":" + reviewKey,
        operationId = operations.get(key) || uid();
      operations.set(key, operationId);
      let result;
      ctx.commit(
        ctx.t("Costruzione del personaggio applicata", "Character build applied"),
        (state) => {
          result = applyCharacterDraft(
            state,
            draft.id,
            { operationId, reviewKey, allowIncomplete: session.allowIncomplete === true },
            ctx.role,
          );
        },
        !draft.actorId ||
          ctx.state.actors[draft.actorId]?.visibility === "private" ||
          !isCampaignActor(ctx.state.actors[draft.actorId], ctx.state.campaign.id)
          ? localOptions
          : {},
      );
      session = null;
      ctx.navigate("characters", { id: result.actorId, tab: "actions" });
    }),
  );
}
